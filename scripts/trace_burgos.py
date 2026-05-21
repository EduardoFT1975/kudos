"""
KUDOS · standalone trace: Wikipedia GeoSearch + pageprops batch for a
single coord query. Mirrors content_engine.clients.wikipedia.WikipediaClient
behavior using stdlib only (no Django, no httpx, no pip install).

Usage (from any host with internet access):
    python3 scripts/trace_burgos.py

Or with custom coords:
    python3 scripts/trace_burgos.py --lat 42.3431 --lng -3.6969 --radius 300

The trace surfaces:
  1. Raw geosearch response (titles, distances, pageids).
  2. Pageprops batch (which pageid resolved to which Wikidata QID).
  3. Per-candidate drop/survive verdict (pipeline filters non-QID).
  4. Same trace at radius=1000m to see what would appear if expanded.
  5. Direct probe of "Catedral de Burgos" canonical page + its real
     attached coords + actual distance from query.

Goal: answer "does cathedral appear in raw geosearch and get lost
downstream, or does it never appear in raw at all?" with hard data.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request


UA = "KUDOS-ContentEngine/0.1 (https://kudos-40cq.onrender.com)"


def http_get(url: str, timeout: float = 15.0) -> dict:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_url(lang: str) -> str:
    return f"https://{lang}.wikipedia.org/w/api.php"


def haversine_m(la1: float, lo1: float, la2: float, lo2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(la1), math.radians(la2)
    dp = math.radians(la2 - la1)
    dl = math.radians(lo2 - lo1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def trace_radius(lat: float, lng: float, radius: int, lang: str) -> None:
    print(f"\n{'=' * 72}")
    print(f"RADIUS = {radius}m")
    print(f"{'=' * 72}")
    qs = urllib.parse.urlencode({
        "action": "query",
        "list": "geosearch",
        "gscoord": f"{lat}|{lng}",
        "gsradius": str(radius),
        "gslimit": "10",
        "format": "json",
    })
    url = f"{api_url(lang)}?{qs}"
    print(f"GeoSearch URL:\n  {url}\n")

    try:
        payload = http_get(url)
    except Exception as exc:
        print(f"  ERROR fetching geosearch: {exc}")
        return

    pages = (payload.get("query") or {}).get("geosearch") or []
    print(f"--- RAW GEOSEARCH · {len(pages)} pages returned ---")
    for i, p in enumerate(pages):
        print(
            f"  [{i}] pageid={p.get('pageid')!s:>9}  "
            f"dist={float(p.get('dist') or 0):>6.1f}m  "
            f"lat={p.get('lat')}  lon={p.get('lon')}  "
            f"title={p.get('title')!r}"
        )
    if not pages:
        print("  (empty list · either out-of-radius or upstream returned nothing)")
        return

    pids = [str(p["pageid"]) for p in pages]
    qs2 = urllib.parse.urlencode({
        "action": "query",
        "prop": "pageprops",
        "ppprop": "wikibase_item",
        "pageids": "|".join(pids),
        "format": "json",
    })
    try:
        pp = http_get(f"{api_url(lang)}?{qs2}")
    except Exception as exc:
        print(f"  ERROR fetching pageprops: {exc}")
        return

    pp_pages = (pp.get("query") or {}).get("pages") or {}
    print(f"\n--- PAGEPROPS · wikibase_item per pageid ---")
    qid_by_pid: dict[int, str | None] = {}
    for pid_str, page in pp_pages.items():
        props = page.get("pageprops") or {}
        qid = props.get("wikibase_item")
        qid_by_pid[int(pid_str)] = qid
        print(
            f"  pageid={pid_str:>9}  title={page.get('title')!r:<55}  qid={qid}"
        )

    print(f"\n--- POST-FILTER · pipeline survive/drop verdict ---")
    survivors = 0
    for p in pages:
        pid = p["pageid"]
        qid = qid_by_pid.get(pid)
        if qid:
            survivors += 1
            print(
                f"  [OK]   pageid={pid:>9}  qid={qid:<10}  "
                f"dist={float(p.get('dist') or 0):>6.1f}m  "
                f"title={p['title']!r}"
            )
        else:
            print(
                f"  [DROP] pageid={pid:>9}  qid=None       "
                f"dist={float(p.get('dist') or 0):>6.1f}m  "
                f"title={p['title']!r}  · no wikibase_item"
            )
    print(
        f"\n  → {survivors}/{len(pages)} candidates would reach Stage 3 ranking"
    )


def probe_catedral(lat: float, lng: float, lang: str) -> None:
    print(f"\n{'=' * 72}")
    print(f"CATEDRAL DE BURGOS · canonical probe")
    print(f"{'=' * 72}")
    qs = urllib.parse.urlencode({
        "action": "query",
        "prop": "coordinates|pageprops",
        "titles": "Catedral de Burgos",
        "format": "json",
    })
    try:
        wb = http_get(f"{api_url(lang)}?{qs}")
    except Exception as exc:
        print(f"  ERROR: {exc}")
        return

    pages = (wb.get("query") or {}).get("pages") or {}
    for pid, page in pages.items():
        coords = page.get("coordinates") or []
        qid = (page.get("pageprops") or {}).get("wikibase_item")
        print(
            f"  title={page.get('title')!r}  pageid={pid}  qid={qid}"
        )
        if coords:
            c = coords[0]
            clat, clon = c.get("lat"), c.get("lon")
            print(f"  Wikipedia-attached coords: ({clat}, {clon})")
            if clat is not None and clon is not None:
                d = haversine_m(lat, lng, clat, clon)
                print(f"  Real distance from query : {d:.1f}m")
                print(f"  Inside r=300m?  : {d <= 300}")
                print(f"  Inside r=1000m? : {d <= 1000}")
        else:
            print(f"  (no coordinates attached to this Wikipedia page)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, default=42.3431)
    parser.add_argument("--lng", type=float, default=-3.6969)
    parser.add_argument("--radius", type=int, default=300)
    parser.add_argument("--lang", type=str, default="es")
    args = parser.parse_args()

    print(f"INPUT")
    print(f"  lat={args.lat}  lng={args.lng}  radius_m={args.radius}  lang={args.lang}")

    trace_radius(args.lat, args.lng, args.radius, args.lang)
    trace_radius(args.lat, args.lng, 1000, args.lang)
    probe_catedral(args.lat, args.lng, args.lang)


if __name__ == "__main__":
    sys.exit(main())
