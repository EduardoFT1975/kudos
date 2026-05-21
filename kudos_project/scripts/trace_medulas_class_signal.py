"""
KUDOS · trace dedicado al bug P1 Las Médulas.
Confirma empíricamente que `candidate.classes` llega vacío por construcción
y muestra qué señal de clase REALMENTE existe en Wikidata para los dos QIDs
en conflicto.

Stdlib only. Ejecutar local:
    python3 scripts/trace_medulas_class_signal.py
"""
from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request

UA = "KUDOS-ContentEngine/0.1 (https://kudos-40cq.onrender.com)"
WP_API = "https://es.wikipedia.org/w/api.php"
WD_API = "https://www.wikidata.org/w/api.php"

LAT = 42.4615
LNG = -6.7676
RADIUS_M = 1500
LANG = "es"

CANDIDATES_OF_INTEREST = {
    "Q696803": "Las Médulas (UNESCO Roman mining landscape)",
    "Q5970613": "Las Médulas (Carucedo) — village",
}


def http_get(url: str, timeout: float = 15.0) -> dict:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def haversine_m(la1: float, lo1: float, la2: float, lo2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(la1), math.radians(la2)
    dp = math.radians(la2 - la1)
    dl = math.radians(lo2 - lo1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# 1. Geosearch · raw response at exact user coords
# ---------------------------------------------------------------------------
print("=" * 78)
print(f"STEP 1 · GeoSearch RAW  ·  lat={LAT}  lng={LNG}  radius={RADIUS_M}m")
print("=" * 78)
qs = urllib.parse.urlencode({
    "action": "query",
    "list": "geosearch",
    "gscoord": f"{LAT}|{LNG}",
    "gsradius": str(RADIUS_M),
    "gslimit": "10",
    "format": "json",
})
gs = http_get(f"{WP_API}?{qs}")
pages = (gs.get("query") or {}).get("geosearch") or []
print(f"Returned: {len(pages)} pages\n")
for i, p in enumerate(pages):
    print(
        f"  [{i}] pageid={p.get('pageid')!s:>9}  "
        f"dist={float(p.get('dist') or 0):>7.1f}m  "
        f"lat={p.get('lat')}  lon={p.get('lon')}  "
        f"title={p.get('title')!r}"
    )

# ---------------------------------------------------------------------------
# 2. Pageprops batch · what the pipeline currently fetches (only wikibase_item)
# ---------------------------------------------------------------------------
print("\n" + "=" * 78)
print("STEP 2 · Pipeline pageprops batch (current code · ppprop=wikibase_item)")
print("=" * 78)
pids = [str(p["pageid"]) for p in pages]
qs = urllib.parse.urlencode({
    "action": "query",
    "prop": "pageprops",
    "ppprop": "wikibase_item",
    "pageids": "|".join(pids),
    "format": "json",
})
pp = http_get(f"{WP_API}?{qs}")
pp_pages = (pp.get("query") or {}).get("pages") or {}
qid_by_pid: dict[int, str | None] = {}
for pid_str, page in pp_pages.items():
    qid = (page.get("pageprops") or {}).get("wikibase_item")
    qid_by_pid[int(pid_str)] = qid
    marker = " <-- TARGET" if qid in CANDIDATES_OF_INTEREST else ""
    print(
        f"  pageid={pid_str:>9}  qid={qid:<10}  "
        f"title={page.get('title')!r}{marker}"
    )

# ---------------------------------------------------------------------------
# 3. What candidate.classes contains TODAY (always empty tuple)
# ---------------------------------------------------------------------------
print("\n" + "=" * 78)
print("STEP 3 · candidate.classes TODAY (from clients/wikipedia.py geosearch)")
print("=" * 78)
print(
    "  EVERY candidate is built with:\n"
    "      classes=()           # hardcoded\n"
    "      sitelinks_count=1    # hardcoded\n"
    "  No P31 fetch, no real sitelinks count. Signal flat by construction.\n"
)
for pid, qid in qid_by_pid.items():
    if qid:
        page_title = next(
            (p["title"] for p in pages if p["pageid"] == pid), "?"
        )
        print(
            f"  WikidataCandidate(entity_id={qid!r}, label={page_title!r}, "
            f"classes=(), sitelinks_count=1, ...)"
        )

# ---------------------------------------------------------------------------
# 4. Direct Wikidata lookup · what classes EXIST for the two contested QIDs
# ---------------------------------------------------------------------------
print("\n" + "=" * 78)
print("STEP 4 · Wikidata REAL classes for the two contested QIDs")
print("=" * 78)
qids_to_probe = list(CANDIDATES_OF_INTEREST.keys())
qs = urllib.parse.urlencode({
    "action": "wbgetentities",
    "ids": "|".join(qids_to_probe),
    "props": "claims|sitelinks/urls|labels",
    "languages": "es|en",
    "format": "json",
})
wd = http_get(f"{WD_API}?{qs}")
entities = (wd.get("entities") or {})
for qid in qids_to_probe:
    ent = entities.get(qid) or {}
    label = (((ent.get("labels") or {}).get("es") or {}).get("value")
             or ((ent.get("labels") or {}).get("en") or {}).get("value")
             or "?")
    claims = ent.get("claims") or {}
    p31_claims = claims.get("P31") or []
    p31_qids = []
    for c in p31_claims:
        try:
            p31_qids.append(c["mainsnak"]["datavalue"]["value"]["id"])
        except (KeyError, TypeError):
            continue
    sitelinks = ent.get("sitelinks") or {}
    sitelinks_count = len(sitelinks)

    # coordinates (P625)
    p625 = claims.get("P625") or []
    coords = None
    if p625:
        try:
            v = p625[0]["mainsnak"]["datavalue"]["value"]
            coords = (v.get("latitude"), v.get("longitude"))
        except (KeyError, TypeError):
            coords = None

    print(f"\n  QID = {qid}")
    print(f"    label             : {label!r}")
    print(f"    sitelinks_count   : {sitelinks_count}  (pipeline today uses: 1)")
    print(f"    P31 classes       : {p31_qids}  (pipeline today uses: ())")
    if coords:
        d = haversine_m(LAT, LNG, coords[0], coords[1])
        print(f"    P625 coordinates  : ({coords[0]}, {coords[1]})")
        print(f"    Distance to query : {d:.1f}m")
    else:
        print(f"    P625 coordinates  : (none)")

# ---------------------------------------------------------------------------
# 5. Class weight impact simulation
# ---------------------------------------------------------------------------
print("\n" + "=" * 78)
print("STEP 5 · Ranking impact · what class_score WOULD BE if signal worked")
print("=" * 78)
print(
    "  Pipeline today (broken):\n"
    "    Q696803  → class_score = 0.40 (DEFAULT)\n"
    "    Q5970613 → class_score = 0.40 (DEFAULT)\n"
    "    Identical · differentiation = 0\n"
)
print(
    "  Pipeline with real P31 fed in (per CLASS_WEIGHTS dict in ranking.py):\n"
)
# Mirror CLASS_WEIGHTS from ranking.py for offline simulation
CLASS_WEIGHTS = {
    "Q9259":     1.00,   # WHS UNESCO
    "Q23413":    0.95,   # castle
    "Q33506":    0.95,   # museum
    "Q2319498":  0.95,   # landmark
    "Q33837":    0.90,   # archaeological site
    "Q839954":   0.90,   # archaeological feature
    "Q570116":   0.90,   # tourist attraction
    "Q16970":    0.85,   # church
    "Q44539":    0.85,   # temple
    "Q24398318": 0.85,   # religious building
    "Q41176":    0.80,   # building
    "Q811979":   0.75,   # architectural structure
    "Q34442":    0.70,   # road
    "Q174782":   0.85,   # square
    "Q22698":    1.00,   # park
    "Q123705":   0.65,   # neighborhood
    "Q276173":   0.90,   # pavilion
    "Q4989906":  1.00,   # mountain
    "Q532":      0.95,   # village
    "Q515":      0.95,   # city
    "Q6256":     1.00,   # country
    "Q34763":    0.95,   # peninsula / landform
    "Q4022":     0.95,   # river
    "Q8502":     0.95,   # mountain range
    "Q23442":    0.95,   # island
}
DEFAULT_CLASS_WEIGHT = 0.40
for qid in qids_to_probe:
    ent = entities.get(qid) or {}
    p31_claims = (ent.get("claims") or {}).get("P31") or []
    p31_qids = []
    for c in p31_claims:
        try:
            p31_qids.append(c["mainsnak"]["datavalue"]["value"]["id"])
        except (KeyError, TypeError):
            continue
    matched = [(q, CLASS_WEIGHTS[q]) for q in p31_qids if q in CLASS_WEIGHTS]
    best = max((w for _, w in matched), default=DEFAULT_CLASS_WEIGHT)
    matched_str = ", ".join(f"{q}={w}" for q, w in matched) or "no match in CLASS_WEIGHTS"
    print(f"  {qid}:")
    print(f"    P31 → {p31_qids}")
    print(f"    matched in CLASS_WEIGHTS: {matched_str}")
    print(f"    class_score WOULD BE: {best}")
    print()

print("=" * 78)
print("CONCLUSION")
print("=" * 78)
print(
    "  Bug location:  content_engine/clients/wikipedia.py · geosearch()\n"
    "  Bug shape:     classes=() and sitelinks_count=1 hardcoded into\n"
    "                 every WikidataCandidate instantiation.\n"
    "  Bug effect:    CLASS_WEIGHTS dict in ranking.py is unused.\n"
    "                 _class_score returns DEFAULT_CLASS_WEIGHT (0.40)\n"
    "                 for every candidate.\n"
    "                 notability_score returns 1/50 = 0.02 for every\n"
    "                 candidate.\n"
    "  Net result:    Only distance + semantic_bonus + label-length\n"
    "                 tie-break differentiate candidates. UNESCO\n"
    "                 landscape loses to village if village happens to\n"
    "                 be marginally closer.\n"
)
