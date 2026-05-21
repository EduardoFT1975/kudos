"""
KUDOS Content Engine · Phase 12 master test map.

Canonical battery of geo-queries for product validation. Each entry
defines a coord + radius + expected UX mode. The runner
(`run_master_smoke_map` command) iterates this list, invokes the
pipeline, and classifies actual outcome vs expected.

Expected modes:

    direct_landmark   · pipeline should resolve a known famous landmark
                        directly via geosearch (no override needed).
                        Acceptable UX: success.
    sparse_override   · landmark injection should fire and the override
                        landmark should win.
                        Acceptable UX: sparse_discovery + source=
                        landmark_override.
    empty             · no candidates exist for this zone, suppression
                        is the correct outcome.
                        Acceptable UX: empty_zone.
    urban_generic     · dense urban area, some POI should win, content
                        quality matters less than presence.
                        Acceptable UX: success or sparse_discovery.
    rural_generic     · sparse rural area, may resolve a village or fail
                        gracefully; either is acceptable.
                        Acceptable UX: success | sparse_discovery |
                        empty_zone (degraded but honest).

Group taxonomy (per spec):
    A · Urban landmarks
    B · Rural villages
    C · Monuments
    D · Empty / hostile
    E · Foreign generic

Extend via plain list append. No code change required.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TestCase:
    label: str
    group: str
    lat: float
    lng: float
    radius_m: int
    expected_mode: str


MASTER_TEST_MAP: tuple[TestCase, ...] = (
    # ----------------------------------------------------------------------
    # GROUP A · Urban landmarks
    # ----------------------------------------------------------------------
    TestCase("Madrid · Puerta del Sol",      "A", 40.4168,  -3.7038, 500, "direct_landmark"),
    TestCase("Barcelona · Plaça Catalunya",  "A", 41.3870,   2.1700, 500, "direct_landmark"),
    TestCase("Roma · Coliseo",               "A", 41.8902,  12.4922, 300, "direct_landmark"),
    TestCase("Paris · Tour Eiffel",          "A", 48.8584,   2.2945, 300, "direct_landmark"),

    # ----------------------------------------------------------------------
    # GROUP B · Rural villages
    # ----------------------------------------------------------------------
    TestCase("Carracedelo (Bierzo)",         "B", 42.5689,  -6.6362, 500, "rural_generic"),
    TestCase("O Cebreiro (Lugo)",            "B", 42.7072,  -7.0436, 500, "rural_generic"),
    TestCase("Las Médulas sparse entry",     "B", 42.4213,  -7.0436, 1500, "sparse_override"),
    TestCase("Magaz de Abajo (Bierzo)",      "B", 42.5867,  -6.6700, 500, "rural_generic"),

    # ----------------------------------------------------------------------
    # GROUP C · Monuments
    # ----------------------------------------------------------------------
    TestCase("Castillo de Manzanares el Real", "C", 40.7268, -3.8628, 300, "direct_landmark"),
    TestCase("Ávila · Catedral del Salvador",  "C", 40.6563, -4.6963, 300, "direct_landmark"),
    TestCase("Alhambra (Granada)",             "C", 37.1761, -3.5881, 500, "direct_landmark"),
    TestCase("Catedral de Burgos",             "C", 42.3406, -3.7044, 300, "direct_landmark"),

    # ----------------------------------------------------------------------
    # GROUP D · Empty / hostile
    # ----------------------------------------------------------------------
    TestCase("Atlantic ocean (0,0)",         "D",   0.0000,   0.0000, 1000, "empty"),
    TestCase("Spanish interior mountains",   "D",  40.1500,  -1.0000,  500, "empty"),
    TestCase("Random road segment",          "D",  41.5000,  -4.0000,  300, "empty"),
    TestCase("Mediterranean offshore",       "D",  35.5000,   5.5000, 1000, "empty"),

    # ----------------------------------------------------------------------
    # GROUP E · Foreign generic
    # ----------------------------------------------------------------------
    TestCase("London · Trafalgar Square",    "E", 51.5080,  -0.1281, 300, "direct_landmark"),
    TestCase("New York · Times Square",      "E", 40.7580, -73.9855, 300, "direct_landmark"),
    TestCase("Tokyo · Imperial Palace",      "E", 35.6852, 139.7528, 500, "direct_landmark"),
)


GROUP_LABELS: dict[str, str] = {
    "A": "Urban landmarks",
    "B": "Rural villages",
    "C": "Monuments",
    "D": "Empty / hostile",
    "E": "Foreign generic",
}
