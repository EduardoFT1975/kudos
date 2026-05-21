"""
KUDOS Content Engine · Phase 9 · curated landmark override registry.

When Stage 2 retrieval (Wikipedia GeoSearch + EN fallback) yields a sparse
pool, OR Stage 3 ranking returns LOW_RANK / AMBIGUOUS_WINNER, this module
supplies hand-curated landmark candidates whose Wikipedia geo-coord
attachment is unreliable or whose surrounding zone fails to expose them
via standard geosearch.

Architecture:
- Read-only registry · zero persistence, zero fetch on import.
- find_nearby_landmarks(lat, lng) filters by per-entry capture radius.
- build_landmark_candidates(...) enriches selected landmarks via
  WikipediaClient.get_wikidata_enrichment (P31 + sitelinks_count) and
  returns WikidataCandidate objects ready to merge into the Stage 2 pool.

Trust model:
- Registry is authoritative for QID + canonical Spanish label + curated
  coordinates + capture radius.
- Classes and sitelinks_count are fetched live from Wikidata at
  injection time. If enrichment fails, fallback to () and 1 (matches
  pre-enrichment V0 behavior · degraded but candidate still injected).

V0 scope: 10 hero landmarks from the MASTER TEST MAP. Extend via plain
tuple addition · no code change required outside this file.
"""
from __future__ import annotations

import logging
import math
from typing import Any, NamedTuple

from content_engine.schemas import WikidataCandidate

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Landmark · registry entry shape
# ---------------------------------------------------------------------------
class Landmark(NamedTuple):
    qid: str                 # canonical Wikidata QID
    label: str               # canonical Spanish label (display + summary)
    lat: float               # curated coordinates (more reliable than Wikipedia)
    lng: float
    capture_radius_m: int    # injected only when query is within this radius


# ---------------------------------------------------------------------------
# V0 hero registry · MASTER TEST MAP landmarks
# Capture radii calibrated per landmark (large for spread-out heritage
# landscapes like Las Médulas, tight for compact urban monuments).
# ---------------------------------------------------------------------------
LANDMARKS_REGISTRY: tuple[Landmark, ...] = (
    # BIERZO
    Landmark("Q696803",   "Las Médulas",                                42.4615,  -6.7676,  5000),
    Landmark("Q1067902",  "Iglesia de Santiago de Peñalba",             42.4308,  -6.5642,   800),
    Landmark("Q5800960",  "Herrería de Compludo",                       42.4933,  -6.4661,   600),
    Landmark("Q1979342",  "Castillo de los Templarios de Ponferrada",   42.5462,  -6.5994,   500),
    Landmark("Q2900203",  "Monasterio de Santa María de Carracedo",     42.5667,  -6.6390,   500),
    Landmark("Q5928395",  "Iglesia de Santiago (Villafranca del Bierzo)",42.6094, -6.8128,   400),
    # GALICIA · O GROVE / SALNÉS
    Landmark("Q6071837",  "Capela de San Caralampio (A Toxa)",          42.4880,  -8.8590,   400),
    Landmark("Q2725100",  "Combarro",                                   42.4308,  -8.7081,   500),
    Landmark("Q1486671",  "Pazo de Fefiñáns",                           42.5144,  -8.8137,   400),
    # ÁVILA
    Landmark("Q14516",    "Murallas de Ávila",                          40.6566,  -4.6995,   800),
    Landmark("Q1188344",  "Catedral del Salvador de Ávila",             40.6563,  -4.6963,   500),
    Landmark("Q593065",   "Basílica de San Vicente (Ávila)",            40.6594,  -4.6963,   500),
    # MADRID / SIERRA
    Landmark("Q748383",   "Castillo de los Mendoza (Manzanares el Real)",40.7268, -3.8628,   500),
    # ZARAGOZA
    Landmark("Q176251",   "Basílica del Pilar",                         41.6566,  -0.8783,   400),
    Landmark("Q47953",    "Aljafería",                                  41.6580,  -0.8987,   400),
    Landmark("Q1138430",  "La Seo del Salvador",                        41.6562,  -0.8770,   400),
    # CASTILLA (BURGOS)
    Landmark("Q179653",   "Catedral de Burgos",                         42.3406,  -3.7044,   800),
    # ROMA · demo internacional incluida
    Landmark("Q10285",    "Coliseo",                                    41.8902,  12.4922,   500),
)


# ---------------------------------------------------------------------------
# Geo helper · haversine distance in meters
# ---------------------------------------------------------------------------
def haversine_m(la1: float, lo1: float, la2: float, lo2: float) -> float:
    R = 6_371_000.0
    p1 = math.radians(la1)
    p2 = math.radians(la2)
    dp = math.radians(la2 - la1)
    dl = math.radians(lo2 - lo1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def find_nearby_landmarks(lat: float, lng: float) -> list[Landmark]:
    """Return all registry landmarks whose distance from (lat, lng) is
    within their per-entry capture_radius_m. Empty list if none match."""
    out: list[Landmark] = []
    for lm in LANDMARKS_REGISTRY:
        if haversine_m(lat, lng, lm.lat, lm.lng) <= lm.capture_radius_m:
            out.append(lm)
    return out


def build_landmark_candidates(
    landmarks: list[Landmark],
    query_lat: float,
    query_lng: float,
    wp_client: Any,  # duck-typed WikipediaClient (avoids circular import)
    exclude_qids: set[str] | None = None,
) -> list[WikidataCandidate]:
    """Enrich curated landmarks via Wikidata and construct candidates ready
    to be merged into the Stage 2 pool.

    - Landmarks whose QID is already in `exclude_qids` are skipped (the
      standard geosearch path already surfaced them).
    - Enrichment fetches P31 classes + sitelinks_count per QID via the
      existing `wp_client.get_wikidata_enrichment` batch endpoint.
    - On enrichment failure for a given QID, fallback to classes=() and
      sitelinks_count=1 (degraded but still injectable).
    - has_es_wiki=True and has_en_wiki=True since the registry is curated
      for hero landmarks which all have parallel ES/EN articles.
    """
    exclude = exclude_qids or set()
    selected = [lm for lm in landmarks if lm.qid not in exclude]
    if not selected:
        return []

    qids = [lm.qid for lm in selected]
    enrichment = wp_client.get_wikidata_enrichment(qids)
    enrichment_mapping = enrichment.mapping if enrichment.success else {}

    out: list[WikidataCandidate] = []
    for lm in selected:
        ent = enrichment_mapping.get(lm.qid)
        classes = ent.classes if ent else ()
        sitelinks_count = ent.sitelinks_count if ent else 1
        distance = haversine_m(query_lat, query_lng, lm.lat, lm.lng)
        try:
            out.append(
                WikidataCandidate(
                    entity_id=lm.qid,
                    label=lm.label,
                    lat=lm.lat,
                    lng=lm.lng,
                    distance_m=distance,
                    classes=classes,
                    sitelinks_count=sitelinks_count,
                    has_es_wiki=True,
                    has_en_wiki=True,
                )
            )
        except Exception as exc:  # noqa: BLE001  · defensive
            log.debug(
                "Landmark override build failed for %s (%s): %s",
                lm.qid, lm.label, exc,
            )
            continue
    return out
