"""
KUDOS Content Engine · V0 Wikipedia client.

Three methods, all sync httpx, all NEVER raise (fail-open at this layer):

    get_summary(title, lang="es") -> dict | None
        Wikipedia REST page/summary. Returns small structured dict or
        None on any upstream issue. Used by Stage 5 enrichment.

    geosearch(lat, lng, radius_m, lang="es") -> GeosearchResult
        MediaWiki list=geosearch primary retrieval. Internally chains
        get_wikidata_ids to canonicalize results — only pages with a
        resolved Wikidata QID become candidates. The candidate pool is
        canonical by construction (no `entity_id=None` ever escapes).
        Used by Stage 2 retrieval.

    get_wikidata_ids(pageids, lang="es") -> PagepropsResult
        Batched MediaWiki pageprops to resolve wikibase_item per pageid.
        Internal helper for geosearch. Returns explicit success flag +
        mapping (avoids `dict | None` overload).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, NamedTuple
from urllib.parse import quote

import httpx

from content_engine.constants import USER_AGENT, WIKIPEDIA_TIMEOUT_S
from content_engine.schemas import GeosearchResult, WikidataCandidate

log = logging.getLogger(__name__)

_REST_SUMMARY_URL_TPL: str = (
    "https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}"
)
_MEDIAWIKI_API_URL_TPL: str = "https://{lang}.wikipedia.org/w/api.php"
_WIKIDATA_API_URL: str = "https://www.wikidata.org/w/api.php"
_ALLOWED_LANGS: frozenset[str] = frozenset({"es", "en"})

# MediaWiki list=geosearch caps:
#   gsradius: 10..10000 meters
#   gslimit:  1..500 (we use 10 for V0)
_GEOSEARCH_LIMIT: int = 10
# Pageprops batch cap (V0): matches geosearch limit so one batch suffices.
_PAGEPROPS_BATCH_LIMIT: int = 10
# wbgetentities batch cap (Wikidata API allows up to 50; we feed at most 10
# QIDs from geosearch so this is purely defensive).
_WBGETENTITIES_BATCH_LIMIT: int = 50


# ---------------------------------------------------------------------------
# Internal pageprops contract · explicit success/mapping pair
# ---------------------------------------------------------------------------
class PagepropsResult(NamedTuple):
    """Outcome of `get_wikidata_ids`. `success` is authoritative.

        success=True   · mapping populated · keys are the requested
                         pageids; values are QID string or None when the
                         page has no wikibase_item.
        success=False  · upstream failure · mapping is empty dict
                         (do NOT interpret missing keys as "no QID").
    """

    success: bool
    mapping: dict[int, str | None]


# ---------------------------------------------------------------------------
# Internal enrichment contract · classes + sitelinks per QID
# ---------------------------------------------------------------------------
class WikidataEnrichment(NamedTuple):
    """Per-QID enrichment payload from Wikidata wbgetentities."""

    classes: tuple[str, ...]   # P31 instance_of QIDs, deduped, preserving order
    sitelinks_count: int       # number of language editions linked


class EnrichmentResult(NamedTuple):
    """Outcome of `get_wikidata_enrichment`.

        success=True   · mapping populated with all QIDs we got data for.
                         Missing QIDs in mapping mean Wikidata returned no
                         entity entry (rare · treat as classes=(), count=1).
        success=False  · upstream failure · mapping is empty. Caller MUST
                         degrade gracefully (fall back to classes=(),
                         sitelinks_count=1) rather than failing geosearch.
    """

    success: bool
    mapping: dict[str, WikidataEnrichment]


class WikipediaClient:
    """Sync Wikipedia REST client. Never raises on upstream failure."""

    def __init__(
        self,
        timeout_s: float | None = None,
        user_agent: str | None = None,
    ) -> None:
        self._timeout_s = float(timeout_s) if timeout_s is not None else float(WIKIPEDIA_TIMEOUT_S)
        self._ua = user_agent or USER_AGENT

    def get_summary(self, title: str, lang: str = "es") -> dict[str, Any] | None:
        """Fetch the REST summary for `title` in `lang`. Returns None on any
        upstream issue (404, transport, malformed body, missing extract)."""
        if not title:
            return None
        lang = lang if lang in _ALLOWED_LANGS else "es"
        url = _REST_SUMMARY_URL_TPL.format(
            lang=lang, title=quote(title, safe="")
        )

        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                response = client.get(
                    url,
                    headers={
                        "User-Agent": self._ua,
                        "Accept": "application/json",
                    },
                )
        except httpx.TimeoutException as exc:
            log.info("Wikipedia summary timeout for %r [%s]: %s", title, lang, exc)
            return None
        except httpx.TransportError as exc:
            log.info("Wikipedia summary transport error for %r [%s]: %s", title, lang, exc)
            return None

        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            log.info(
                "Wikipedia summary HTTP %d for %r [%s]",
                response.status_code, title, lang,
            )
            return None

        try:
            payload = response.json()
        except ValueError as exc:
            log.info("Wikipedia summary JSON decode failed for %r [%s]: %s", title, lang, exc)
            return None

        if not isinstance(payload, dict):
            return None

        extract = payload.get("extract")
        if not isinstance(extract, str) or not extract.strip():
            return None

        canonical_title = payload.get("title") or title
        page_url = self._extract_page_url(payload, title=canonical_title, lang=lang)

        return {
            "title": canonical_title,
            "extract": extract.strip(),
            "page_url": page_url,
        }

    # ------------------------------------------------------------- helpers
    @staticmethod
    def _extract_page_url(
        payload: dict[str, Any], *, title: str, lang: str
    ) -> str:
        content_urls = payload.get("content_urls")
        if isinstance(content_urls, dict):
            desktop = content_urls.get("desktop")
            if isinstance(desktop, dict):
                page = desktop.get("page")
                if isinstance(page, str) and page.startswith("https://"):
                    return page
        # Fallback: synthesize a canonical desktop URL.
        return f"https://{lang}.wikipedia.org/wiki/{quote(title, safe='')}"

    # -----------------------------------------------------------------
    # geosearch · primary retrieval (canonical candidates only)
    # -----------------------------------------------------------------
    def geosearch(
        self,
        lat: float,
        lng: float,
        radius_m: int,
        lang: str = "es",
    ) -> GeosearchResult:
        """MediaWiki list=geosearch + pageprops QID resolution.

        Pipeline (never raises):
            1. HTTP/JSON failure       → success=False + failure_reason.
            2. 200 + empty page list   → success=True + candidates=().
            3. 200 + N pages → call get_wikidata_ids:
                 a. pageprops batch fails → success=False
                    + failure_reason="PAGEPROPS_FAILED: ...".
                 b. batch succeeds → filter pages by qid != None and
                    instantiate WikidataCandidate per surviving page.
                    success=True + candidates=tuple(canonical).
                    If filter empties the list → success=True + ().
        """
        lang = lang if lang in _ALLOWED_LANGS else "es"
        url = _MEDIAWIKI_API_URL_TPL.format(lang=lang)
        params = {
            "action": "query",
            "list": "geosearch",
            "gscoord": f"{lat}|{lng}",
            "gsradius": str(int(radius_m)),
            "gslimit": str(_GEOSEARCH_LIMIT),
            "format": "json",
        }
        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                response = client.get(
                    url,
                    params=params,
                    headers={"User-Agent": self._ua, "Accept": "application/json"},
                )
        except httpx.TimeoutException as exc:
            return GeosearchResult(
                success=False,
                failure_reason=_truncate(f"TIMEOUT: {exc}"),
            )
        except httpx.TransportError as exc:
            return GeosearchResult(
                success=False,
                failure_reason=_truncate(f"TRANSPORT: {exc}"),
            )

        if response.status_code >= 400:
            return GeosearchResult(
                success=False,
                failure_reason=_truncate(
                    f"HTTP {response.status_code}: {response.text[:150]}"
                ),
            )

        try:
            payload = response.json()
        except ValueError as exc:
            return GeosearchResult(
                success=False,
                failure_reason=_truncate(f"MALFORMED_JSON: {exc}"),
            )

        if not isinstance(payload, dict):
            return GeosearchResult(
                success=False,
                failure_reason="MALFORMED_JSON: payload not a dict",
            )

        query = payload.get("query")
        if not isinstance(query, dict) or "geosearch" not in query:
            return GeosearchResult(
                success=False,
                failure_reason="MISSING_GEOSEARCH_KEY",
            )

        raw_pages = query.get("geosearch")
        if not isinstance(raw_pages, list):
            return GeosearchResult(
                success=False,
                failure_reason="GEOSEARCH_NOT_LIST",
            )

        # Case: legitimate empty
        if not raw_pages:
            return GeosearchResult(success=True, candidates=())

        # Extract pageids for batched QID resolution
        pageids: list[int] = []
        for page in raw_pages:
            if not isinstance(page, dict):
                continue
            pid_raw = page.get("pageid")
            if isinstance(pid_raw, int) and pid_raw >= 1:
                pageids.append(pid_raw)

        if not pageids:
            return GeosearchResult(success=True, candidates=())

        pageprops = self.get_wikidata_ids(pageids, lang=lang)
        if not pageprops.success:
            return GeosearchResult(
                success=False,
                failure_reason="PAGEPROPS_FAILED",
            )

        # Enrich resolved QIDs with classes (P31) and sitelinks count from
        # Wikidata. Enrichment failure is NOT a geosearch failure · we
        # degrade per-candidate to classes=(), sitelinks_count=1 fallback.
        resolved_qids = [q for q in pageprops.mapping.values() if q]
        enrichment = self.get_wikidata_enrichment(resolved_qids)

        # Filter + instantiate canonical candidates
        candidates: list[WikidataCandidate] = []
        for page in raw_pages:
            if not isinstance(page, dict):
                continue
            pid_raw = page.get("pageid")
            if not isinstance(pid_raw, int):
                continue
            qid = pageprops.mapping.get(pid_raw)
            if not qid:
                continue  # discard non-canonical pages
            ent = enrichment.mapping.get(qid)
            classes = ent.classes if ent else ()
            sitelinks_count = ent.sitelinks_count if ent else 1
            try:
                candidates.append(
                    WikidataCandidate(
                        entity_id=qid,
                        label=str(page.get("title") or qid),
                        lat=float(page.get("lat") or 0.0),
                        lng=float(page.get("lon") or 0.0),
                        distance_m=max(float(page.get("dist") or 0.0), 0.0),
                        classes=classes,
                        sitelinks_count=sitelinks_count,
                        has_es_wiki=(lang == "es"),
                        has_en_wiki=(lang == "en"),
                    )
                )
            except Exception as exc:  # noqa: BLE001  · defensive
                log.debug(
                    "Dropping malformed GeoSearch page pid=%s: %s", pid_raw, exc,
                )
                continue

        return GeosearchResult(success=True, candidates=tuple(candidates))

    # -----------------------------------------------------------------
    # geosearch_with_fallback · sparse-zone EN fallback orchestrator
    # -----------------------------------------------------------------
    def geosearch_with_fallback(
        self,
        lat: float,
        lng: float,
        radius_m: int,
    ) -> GeosearchResult:
        """Stage 2 retrieval with sparse-zone EN fallback.

        Pipeline (NEVER raises):
            1. geosearch(lang="es"). If failure, propagate immediately
               (EN attempt would mask root cause).
            2. If post-enrichment ES pool has >= 2 candidates → return
               ES result (no fallback needed · zone is well covered).
            3. Else geosearch(lang="en"):
                 a. EN failure → return ES result alone (degraded but
                    still success=True).
                 b. EN success → merge by QID. ES wins ties; EN-only
                    QIDs are added.
            4. For EN-only candidates, attempt to resolve `eswiki`
               sitelink title via wbgetentities. If found, rebuild the
               candidate with label=es_title and has_es_wiki=True so
               Stage 5 summary fetch prefers Spanish. If no eswiki
               sitelink, keep the EN candidate as-is (Stage 5 will fetch
               EN summary as fallback).
        """
        es_result = self.geosearch(lat, lng, radius_m, lang="es")
        if not es_result.success:
            print(
                "LANG FALLBACK DEBUG es_count=FAIL en_count=skipped merged_count=0"
            )
            return es_result

        es_candidates = list(es_result.candidates)
        es_count = len(es_candidates)
        if es_count >= 2:
            print(
                f"LANG FALLBACK DEBUG es_count={es_count} "
                f"en_count=skipped merged_count={es_count}"
            )
            return es_result

        en_result = self.geosearch(lat, lng, radius_m, lang="en")
        if not en_result.success:
            print(
                f"LANG FALLBACK DEBUG es_count={es_count} "
                f"en_count=FAIL merged_count={es_count}"
            )
            return es_result

        en_candidates = list(en_result.candidates)
        en_count = len(en_candidates)

        es_qids = {c.entity_id for c in es_candidates}
        en_only = [c for c in en_candidates if c.entity_id not in es_qids]

        # Resolve eswiki sitelink title for EN-only QIDs so downstream
        # summary fetch can prefer Spanish when an ES Wikipedia page
        # exists (even if it lacks geo-coords and so missed geosearch).
        eswiki_titles: dict[str, str | None] = {}
        if en_only:
            eswiki_titles = self.get_sitelink_titles(
                [c.entity_id for c in en_only], target_lang="es",
            )

        merged: list[WikidataCandidate] = list(es_candidates)
        for c in en_only:
            es_title = eswiki_titles.get(c.entity_id)
            if es_title:
                try:
                    merged.append(
                        WikidataCandidate(
                            entity_id=c.entity_id,
                            label=es_title,
                            lat=c.lat,
                            lng=c.lng,
                            distance_m=c.distance_m,
                            classes=c.classes,
                            sitelinks_count=c.sitelinks_count,
                            has_es_wiki=True,
                            has_en_wiki=False,
                        )
                    )
                    continue
                except Exception as exc:  # noqa: BLE001  · defensive
                    log.debug(
                        "EN-only candidate ES re-label failed for %s: %s",
                        c.entity_id, exc,
                    )
            # No eswiki sitelink (or rebuild failed) · keep EN candidate
            merged.append(c)

        print(
            f"LANG FALLBACK DEBUG es_count={es_count} "
            f"en_count={en_count} merged_count={len(merged)}"
        )
        return GeosearchResult(success=True, candidates=tuple(merged))

    # -----------------------------------------------------------------
    # get_sitelink_titles · resolve target-lang Wikipedia title per QID
    # -----------------------------------------------------------------
    def get_sitelink_titles(
        self,
        qids: list[str],
        target_lang: str = "es",
    ) -> dict[str, str | None]:
        """Batched Wikidata wbgetentities · returns {qid: title|None}
        where title is the page title in target_lang.wikipedia. Used
        by geosearch_with_fallback to bridge EN-only candidates back
        to ES summary fetch when an ES sitelink exists.

        NEVER raises. Returns {qid: None for qid in qids} on upstream
        failure (graceful degradation · EN candidate stays as-is).
        """
        if not qids:
            return {}
        target_lang = target_lang if target_lang in _ALLOWED_LANGS else "es"
        site_key = f"{target_lang}wiki"
        batch = qids[:_WBGETENTITIES_BATCH_LIMIT]
        result: dict[str, str | None] = {q: None for q in batch}
        params = {
            "action": "wbgetentities",
            "ids": "|".join(batch),
            "props": "sitelinks",
            "format": "json",
        }
        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                response = client.get(
                    _WIKIDATA_API_URL,
                    params=params,
                    headers={"User-Agent": self._ua, "Accept": "application/json"},
                )
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            log.info("get_sitelink_titles transport failure: %s", exc)
            return result
        if response.status_code >= 400:
            log.info("get_sitelink_titles HTTP %d", response.status_code)
            return result
        try:
            payload = response.json()
        except ValueError as exc:
            log.info("get_sitelink_titles JSON decode failed: %s", exc)
            return result
        if not isinstance(payload, dict):
            return result
        entities = payload.get("entities") or {}
        if not isinstance(entities, dict):
            return result
        for qid, ent in entities.items():
            if not isinstance(ent, dict):
                continue
            sitelinks = ent.get("sitelinks") or {}
            sl = sitelinks.get(site_key) or {}
            if isinstance(sl, dict):
                title = sl.get("title")
                if isinstance(title, str) and title.strip():
                    result[qid] = title.strip()
        return result

    # -----------------------------------------------------------------
    # get_wikidata_ids · batched pageprops resolver
    # -----------------------------------------------------------------
    def get_wikidata_ids(
        self,
        pageids: list[int],
        lang: str = "es",
    ) -> PagepropsResult:
        """Batched MediaWiki pageprops · resolves wikibase_item per pageid.

        Returns PagepropsResult(success=True, mapping={pid: qid|None})
        on HTTP 200 + valid JSON. Returns PagepropsResult(success=False,
        mapping={}) on any upstream issue. NEVER raises.
        """
        if not pageids:
            return PagepropsResult(success=True, mapping={})
        lang = lang if lang in _ALLOWED_LANGS else "es"
        # Cap batch (defensive; geosearch already limits to _GEOSEARCH_LIMIT)
        batch = pageids[:_PAGEPROPS_BATCH_LIMIT]
        url = _MEDIAWIKI_API_URL_TPL.format(lang=lang)
        params = {
            "action": "query",
            "prop": "pageprops",
            "ppprop": "wikibase_item",
            "pageids": "|".join(str(p) for p in batch),
            "format": "json",
        }
        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                response = client.get(
                    url,
                    params=params,
                    headers={"User-Agent": self._ua, "Accept": "application/json"},
                )
        except httpx.TimeoutException as exc:
            log.info("Pageprops timeout (lang=%s): %s", lang, exc)
            return PagepropsResult(success=False, mapping={})
        except httpx.TransportError as exc:
            log.info("Pageprops transport error (lang=%s): %s", lang, exc)
            return PagepropsResult(success=False, mapping={})

        if response.status_code >= 400:
            log.info("Pageprops HTTP %d (lang=%s)", response.status_code, lang)
            return PagepropsResult(success=False, mapping={})

        try:
            payload = response.json()
        except ValueError as exc:
            log.info("Pageprops JSON decode failed (lang=%s): %s", lang, exc)
            return PagepropsResult(success=False, mapping={})

        if not isinstance(payload, dict):
            return PagepropsResult(success=False, mapping={})

        query = payload.get("query")
        if not isinstance(query, dict):
            return PagepropsResult(success=False, mapping={})

        pages = query.get("pages")
        if not isinstance(pages, dict):
            return PagepropsResult(success=False, mapping={})

        mapping: dict[int, str | None] = {pid: None for pid in batch}
        for key, page in pages.items():
            if not isinstance(page, dict):
                continue
            try:
                pid = int(page.get("pageid") or key)
            except (TypeError, ValueError):
                continue
            props = page.get("pageprops")
            if isinstance(props, dict):
                wb = props.get("wikibase_item")
                if isinstance(wb, str) and wb.startswith("Q") and wb[1:].isdigit():
                    mapping[pid] = wb
        return PagepropsResult(success=True, mapping=mapping)


    # -----------------------------------------------------------------
    # get_wikidata_enrichment · classes (P31) + sitelinks count per QID
    # -----------------------------------------------------------------
    def get_wikidata_enrichment(
        self,
        qids: list[str],
    ) -> EnrichmentResult:
        """Batched Wikidata wbgetentities · resolves P31 classes and
        sitelinks count per QID.

        Returns EnrichmentResult(success=True, mapping={qid: WikidataEnrichment})
        on HTTP 200 + valid JSON. Returns EnrichmentResult(success=False,
        mapping={}) on any upstream issue. NEVER raises.

        Geosearch caller is expected to treat success=False as soft-fail
        (per-candidate fallback to classes=(), sitelinks_count=1) rather
        than failing the whole geosearch. Wikidata downtime should not
        cascade into KUDOS retrieval failure when GeoSearch itself worked.
        """
        if not qids:
            return EnrichmentResult(success=True, mapping={})
        batch = qids[:_WBGETENTITIES_BATCH_LIMIT]
        params = {
            "action": "wbgetentities",
            "ids": "|".join(batch),
            "props": "claims|sitelinks",
            "format": "json",
        }
        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                response = client.get(
                    _WIKIDATA_API_URL,
                    params=params,
                    headers={"User-Agent": self._ua, "Accept": "application/json"},
                )
        except httpx.TimeoutException as exc:
            log.info("Wikidata enrichment timeout: %s", exc)
            return EnrichmentResult(success=False, mapping={})
        except httpx.TransportError as exc:
            log.info("Wikidata enrichment transport error: %s", exc)
            return EnrichmentResult(success=False, mapping={})

        if response.status_code >= 400:
            log.info("Wikidata enrichment HTTP %d", response.status_code)
            return EnrichmentResult(success=False, mapping={})

        try:
            payload = response.json()
        except ValueError as exc:
            log.info("Wikidata enrichment JSON decode failed: %s", exc)
            return EnrichmentResult(success=False, mapping={})

        if not isinstance(payload, dict):
            return EnrichmentResult(success=False, mapping={})

        entities = payload.get("entities")
        if not isinstance(entities, dict):
            return EnrichmentResult(success=False, mapping={})

        mapping: dict[str, WikidataEnrichment] = {}
        for qid, ent in entities.items():
            if not isinstance(ent, dict):
                continue
            # Extract P31 (instance_of) class QIDs, deduped, order preserved.
            classes_raw: list[str] = []
            claims = ent.get("claims") or {}
            p31 = claims.get("P31") or []
            if isinstance(p31, list):
                for c in p31:
                    if not isinstance(c, dict):
                        continue
                    try:
                        v = c["mainsnak"]["datavalue"]["value"]
                    except (KeyError, TypeError):
                        continue
                    cid = v.get("id") if isinstance(v, dict) else None
                    if (
                        isinstance(cid, str)
                        and cid.startswith("Q")
                        and cid[1:].isdigit()
                    ):
                        classes_raw.append(cid)
            seen: set[str] = set()
            classes: tuple[str, ...] = tuple(
                c for c in classes_raw if not (c in seen or seen.add(c))
            )
            # Sitelinks count · number of language editions linked.
            sitelinks = ent.get("sitelinks") or {}
            sitelinks_count = len(sitelinks) if isinstance(sitelinks, dict) else 0
            mapping[qid] = WikidataEnrichment(
                classes=classes,
                sitelinks_count=sitelinks_count,
            )
        return EnrichmentResult(success=True, mapping=mapping)


def _truncate(text: str, max_len: int = 200) -> str:
    s = text or ""
    return s if len(s) <= max_len else s[: max_len - 1] + "…"


def wikipedia_now() -> datetime:
    """Convenience timestamp for SourceRef.retrieved_at."""
    return datetime.now(timezone.utc)
