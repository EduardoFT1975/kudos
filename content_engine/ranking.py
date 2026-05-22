"""
KUDOS Content Engine · V0 ranking.

Selects ONE WinningEntity from a list of WikidataCandidate using a locked
weighted score:

    rank_score = 0.40 * distance_score
               + 0.35 * class_score
               + 0.25 * notability_score

Component scaling (all clipped to [0, 1]):
    distance_score   = 1 - (distance_m / input_radius_m)
    class_score      = max(CLASS_WEIGHTS[c]) over candidate.classes,
                       or DEFAULT_CLASS_WEIGHT if no class matches.
    notability_score = min(sitelinks_count / _NOTABILITY_SAT_SITELINKS, 1.0)

select_winner gates:
    - If top score < RANK_THRESHOLD (0.50)  → (None, "LOW_RANK")
    - If two top candidates within RANK_AMBIGUITY_DELTA (0.02)
      AND both class_score >= RANK_AMBIGUITY_CLASS_MIN (0.85)
                                            → (None, "AMBIGUOUS_WINNER")
    - Else                                  → (WinningEntity, None)
"""
from __future__ import annotations

from content_engine.constants import (
    CITY_DEMOTION_DELTA,
    CITY_DEMOTION_PROXIMITY_TOLERANCE,
    RANK_AMBIGUITY_CLASS_MIN,
    RANK_AMBIGUITY_DELTA,
    RANK_AMBIGUITY_NOTABILITY_RATIO,
    RANK_THRESHOLD,
)
from content_engine.schemas import WikidataCandidate, WinningEntity


# ---------------------------------------------------------------------------
# Phase 12 · Class sets for arbitration heuristics
# ---------------------------------------------------------------------------
# City / macro-admin entities · prone to beating local POIs by sheer
# notability (Wikipedia article has thousands of sitelinks).
_CITY_ADMIN_CLASSES: frozenset[str] = frozenset({
    "Q515",       # city
    "Q5119",      # capital city
    "Q1549591",   # big city
    "Q486972",    # human settlement
    "Q1549591",   # city (variant)
    "Q1490",      # metropolis
    "Q15284",     # municipality
    "Q484170",    # commune (FR/IT admin unit)
    "Q6256",      # country (extreme macro · should never win)
    "Q3024240",   # historical region
})

# Local POI / landmark classes · the candidates we want to prefer when
# they are competitively scored against macro-admin entities.
_LOCAL_POI_CLASSES: frozenset[str] = frozenset({
    # Squares / urban POIs
    "Q174782",    # square
    # Religious
    "Q16970", "Q44539", "Q44613", "Q24398318", "Q2074737",
    # Cultural
    "Q33506",     # museum
    "Q23413",     # castle
    "Q33837",     # archaeological site
    "Q839954",    # archaeological feature
    # Landmark designations
    "Q9259",      # UNESCO WHS
    "Q907116",    # BIC (Bien de Interés Cultural)
    "Q2319498",   # landmark
    "Q570116",    # tourist attraction
    # Monuments / buildings
    "Q179700",    # statue
    "Q41176",     # building
    "Q276173",    # pavilion / monument building
    "Q22996476",  # BIC subtype
    # Parks / natural focal points
    "Q22698",     # park
})

# Hostile water bodies · abstract maritime regions that should not
# resolve to meaningful place capsules when nothing else is nearby.
# Rivers (Q4022) and islands (Q23442) explicitly excluded · they can
# be valid POIs.
_HOSTILE_WATER_CLASSES: frozenset[str] = frozenset({
    "Q9430",      # ocean
    "Q39594",     # gulf
    "Q165",       # sea
    "Q4022270",   # body of water (generic abstract)
})


def _has_class(candidate: WikidataCandidate, class_set: frozenset[str]) -> bool:
    """True if any P31 class of the candidate is in the given set."""
    return any(c in class_set for c in candidate.classes)


def _is_city_admin(candidate: WikidataCandidate) -> bool:
    return _has_class(candidate, _CITY_ADMIN_CLASSES)


def _is_local_poi(candidate: WikidataCandidate) -> bool:
    return _has_class(candidate, _LOCAL_POI_CLASSES)


def _is_hostile_water(candidate: WikidataCandidate) -> bool:
    return _has_class(candidate, _HOSTILE_WATER_CLASSES)


# P2.4 · locality fallback · clases que identifican el LUGAR
# habitado/admin del usuario · pueblo, villa, ciudad, municipio,
# concejo, parroquia, lugar (hamlet GAL/AST/LEÓN). Usado por
# select_nearest_locality cuando no hay landmark notable cercano.
LOCALITY_CLASSES: frozenset[str] = frozenset({
    "Q532",      # village / settlement
    "Q515",      # city
    "Q5119",     # capital city
    "Q15284",    # municipality
    "Q3957",     # town
    "Q123705",   # neighborhood
    "Q3055118",  # lugar (Galician/Leonese hamlet)
    "Q840482",   # civil parish · parroquia
    "Q3257518",  # concejo Asturiano
    "Q2196917",  # admin subdivision
    "Q19860854", # admin subdivision
    "Q6126497",  # admin subdivision
    "Q213643",   # admin / civic class
    "Q1107656",  # locality
    "Q486972",   # human settlement (top-level)
})


def is_locality(candidate: WikidataCandidate) -> bool:
    """True if any class identifies an inhabited/admin place."""
    return _has_class(candidate, LOCALITY_CLASSES)


def select_nearest_locality(
    candidates: list[WikidataCandidate],
) -> WikidataCandidate | None:
    """Pick the geographically closest locality candidate.

    Used as fallback when select_winner returns None (sparse area · no
    notable landmark within radius) · ensures user in Magaz de Abajo
    gets Magaz de Abajo capsule instead of empty_zone.

    Returns None when no locality candidates exist.
    """
    localities = [c for c in candidates if is_locality(c)]
    if not localities:
        return None
    return min(localities, key=lambda c: c.distance_m)

# ---------------------------------------------------------------------------
# Class weight table (locked)
# ---------------------------------------------------------------------------
# Higher = more place-like / more notable as a destination.
CLASS_WEIGHTS: dict[str, float] = {
    "Q9259":     1.00,  # World Heritage Site (UNESCO)
    "Q23413":    0.95,  # castle
    "Q33506":    0.95,  # museum
    "Q2319498":  0.95,  # landmark
    "Q33837":    0.90,  # archaeological site
    "Q839954":   0.90,  # archaeological feature
    "Q570116":   0.90,  # tourist attraction
    "Q16970":    0.85,  # church building
    "Q44539":    0.85,  # temple
    "Q24398318": 0.85,  # religious building
    "Q41176":    0.80,  # building
    "Q811979":   0.75,  # architectural structure
    "Q34442":    0.70,  # road
    "Q174782":   0.85,  # square
    "Q22698":    1.00,  # park (bumped from 0.85 per live-smoke observation)
    "Q123705":   0.65,  # neighborhood
    # --- Added from live-smoke gap analysis (place-semantic classes) ---
    "Q276173":   0.90,  # pavilion / monument building
    "Q4989906":  1.00,  # mountain
    "Q532":      0.95,  # village / settlement
    "Q515":      0.95,  # city
    "Q6256":     1.00,  # country
    "Q34763":    0.95,  # peninsula / landform
    "Q4022":     0.95,  # river
    "Q8502":     0.95,  # mountain range
    "Q23442":    0.95,  # island
    # --- PHASE 7B · master smoke inventory (Spanish/Galician/Asturian/heritage) ---
    # Heritage / landmark designations · Spanish cultural protection law
    "Q907116":   0.95,  # Bien de Interés Cultural (BIC) · Spanish heritage
    "Q22996476": 0.90,  # BIC subtype / cultural monument variant · VERIFY label
    # Religious complexes
    "Q44613":    0.90,  # monastery
    "Q2074737":  0.80,  # ermita / hermitage (small chapel, often rural)
    "Q9134984":  0.80,  # religious / monastic subclass · VERIFY label
    # Civic buildings / town halls
    "Q209465":   0.75,  # civic / municipal building · VERIFY label
    "Q108325":   0.70,  # civic / urban structure · VERIFY label
    # Decorative / minor POIs
    "Q179700":   0.60,  # statue / decorative sculpture
    "Q3507268":  0.55,  # decorative / minor architectural element · VERIFY label
    # Administrative subdivisions · Galician / Asturian / Spanish hamlets
    "Q3055118":  0.65,  # lugar (Galician hamlet / small locality)
    "Q840482":   0.65,  # civil parish / parroquia · VERIFY label
    "Q3257518":  0.65,  # concejo (Asturian admin unit) / parish · VERIFY label
    "Q2196917":  0.65,  # admin subdivision · VERIFY label
    "Q19860854": 0.65,  # admin subdivision · VERIFY label
    "Q6126497":  0.65,  # admin subdivision · VERIFY label
    "Q213643":   0.65,  # admin / civic class · VERIFY label
    # Transport
    "Q55488":    0.40,  # railway station
    # --- PHASE 12 FIX A · religious / cathedral / basilica landmark classes ---
    # Catedral perdía contra museum because Q9135 (cathedral) was unmapped
    # and fell to DEFAULT 0.40 while Q33506 (museum) was at 0.95-1.00.
    # Tier alignment: cathedral ≥ basilica ≥ collegiate church ≥ parish.
    "Q9135":     1.00,  # cathedral · canonical religious landmark
    "Q1289664":  0.95,  # cathedral church of Spain · VERIFY label
    "Q317557":   0.95,  # basilica (architectural) · VERIFY label
    "Q1144991":  0.95,  # basilica (Catholic) · VERIFY label
    "Q120560":   0.90,  # collegiate church (colegiata)
    "Q1370598":  0.90,  # abbey church · VERIFY label
    "Q108983":   0.85,  # parish church (matches Q16970 church tier)
    # Q41176 (building) already in dict at 0.80 · NOT duplicated.
    # Q16970 (church building) already in dict at 0.85 · NOT duplicated.
}
DEFAULT_CLASS_WEIGHT: float = 0.40

# Notability saturation
_NOTABILITY_SAT_SITELINKS: float = 50.0

# Component weights
_W_DIST: float = 0.25
_W_CLASS: float = 0.45
_W_NOTABILITY: float = 0.30

# Semantic adjustments · applied after the weighted base score.
# Bonus prefixes: first label word must match (case-insensitive) so
# "Torremolinos" does NOT match the "torre" prefix bonus.
_LABEL_PREFIX_BONUS: frozenset[str] = frozenset({
    "monte", "mount",
    "torre", "tower",
    "palacio",
    "museum", "museo",
    "parque", "park",
    "templo",
    "cathedral",
    "estatua", "statue",
})
# Penalty substrings: applied once (max one penalty hit per candidate)
# when any of these tokens appears anywhere in the lowercased label.
_LABEL_SUBSTR_PENALTY: tuple[str, ...] = (
    "desastre",
    "attack",
    "ataque",
    "station",
    "estación",
    "barrio",
    "district",
    "plaza",
    "cine",
    "library",
    "biblioteca",
    "pavillon",
    "gallery",
    "school",
)
_SEMANTIC_BONUS: float = 0.08
_SEMANTIC_PENALTY: float = -0.25

# Tie-break: scores rounded to 2 decimals are considered equal · prefer
# shorter label among them. Threshold ~0.01 (rounding granularity).
_TIE_BREAK_BUCKET_DECIMALS: int = 2


# ---------------------------------------------------------------------------
# Component scorers
# ---------------------------------------------------------------------------
def _distance_score(distance_m: float, input_radius_m: int) -> float:
    if input_radius_m <= 0:
        return 0.0
    raw = 1.0 - (float(distance_m) / float(input_radius_m))
    if raw < 0.0:
        return 0.0
    if raw > 1.0:
        return 1.0
    return raw


def _class_score(classes: tuple[str, ...]) -> float:
    if not classes:
        return DEFAULT_CLASS_WEIGHT
    best = DEFAULT_CLASS_WEIGHT
    matched = False
    for cls in classes:
        w = CLASS_WEIGHTS.get(cls)
        if w is None:
            continue
        matched = True
        if w > best:
            best = w
    return best if matched else DEFAULT_CLASS_WEIGHT


def _notability_score(sitelinks_count: int) -> float:
    raw = float(sitelinks_count) / _NOTABILITY_SAT_SITELINKS
    if raw < 0.0:
        return 0.0
    if raw > 1.0:
        return 1.0
    return raw


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def compute_rank_score(
    candidate: WikidataCandidate, input_radius_m: int
) -> float:
    """Return the final 0..1 rank score for a single candidate."""
    dist = _distance_score(candidate.distance_m, input_radius_m)
    cls = _class_score(candidate.classes)
    # TEMP DEBUG · build inventory of CLASS_WEIGHTS gaps. Fires when at
    # least one of the candidate's classes is not mapped (full unmapped =
    # DEFAULT fallback; partial unmapped = mapped class wins but the
    # missing ones are still worth surfacing for future expansion).
    # `unmapped` carries only the truly-missing QIDs, not the whole tuple.
    _unmapped = tuple(c for c in candidate.classes if c not in CLASS_WEIGHTS)
    if _unmapped or not candidate.classes:
        print(
            f"UNKNOWN CLASS DEBUG :: label={candidate.label!r} :: "
            f"entity_id={candidate.entity_id} :: "
            f"classes={candidate.classes} :: "
            f"unmapped={_unmapped}"
        )
    notability = _notability_score(candidate.sitelinks_count)
    raw = _W_DIST * dist + _W_CLASS * cls + _W_NOTABILITY * notability

    # Semantic adjustments · label-driven bonus/penalty applied AFTER the
    # weighted base score, before final clamping.
    semantic_delta = 0.0
    label = candidate.label or ""
    label_lower = label.lower()
    first_word = label_lower.split(maxsplit=1)[0] if label_lower else ""
    label_words = set(label_lower.split())

    if first_word in _LABEL_PREFIX_BONUS:
        semantic_delta += _SEMANTIC_BONUS
    elif label_words & _LABEL_PREFIX_BONUS:
        semantic_delta += _SEMANTIC_BONUS
    for substr in _LABEL_SUBSTR_PENALTY:
        if substr in label_lower:
            semantic_delta += _SEMANTIC_PENALTY
            break  # max one penalty hit per candidate
    if semantic_delta != 0.0:
        # TEMP DEBUG · semantic_bonus applied
        print(f"semantic_bonus applied :: {label!r} :: delta={semantic_delta:+.2f}")
    raw += semantic_delta

    if raw < 0.0:
        return 0.0
    if raw > 1.0:
        return 1.0
    return raw


def select_winner(
    candidates: list[WikidataCandidate], input_radius_m: int
) -> tuple[WinningEntity | None, str | None]:
    """Pick the winning entity. Returns (winner, failure_class).

    failure_class values:
        "LOW_RANK"          · top score below RANK_THRESHOLD
        "AMBIGUOUS_WINNER"  · top two too close AND notability tie too
        "NO_CANDIDATES"     · empty input
        "HOSTILE_EMPTY"     · top is abstract water body, no local POIs

    Arbitration stages (Phase 12):
        1. Compute rank_score per candidate.
        2. Sort by score desc with label-length tie-break (~0.01 bucket).
        3. Anti-city dominance · swap city → local POI when POI is
           closer AND within CITY_DEMOTION_DELTA.
        4. Hostile water rejection · suppress if top is ocean/gulf/sea
           and no local POI fallback exists.
        5. LOW_RANK gate (unchanged).
        6. Ambiguity resolution · intelligent · resolves by notability
           tie-break instead of blocking suppression. Only blocks when
           even notability is tied.
    """
    if not candidates:
        return None, "NO_CANDIDATES"

    scored: list[tuple[float, WikidataCandidate]] = [
        (compute_rank_score(c, input_radius_m), c) for c in candidates
    ]
    # Primary sort by rank_score descending; tie-break (~0.01 bucket) by
    # shorter label · prevents long sub-entity titles from edging out the
    # primary landmark when scores are essentially tied.
    scored.sort(
        key=lambda pair: (
            -round(pair[0], _TIE_BREAK_BUCKET_DECIMALS),
            len(pair[1].label),
        )
    )

    top_score, top_cand = scored[0]

    # Phase 12 · Anti-city dominance arbitration -----------------------------
    # If the top is a macro-admin entity (city, municipality, country, ...)
    # and a competitively-scored local POI is geographically close enough,
    # swap winner to the local POI. Prevents Madrid from beating Puerta del Sol.
    #
    # FIX C · proximity tolerance · old logic required POI strictly closer.
    # Cities often share P625 coords with their central POIs (Madrid's
    # coord IS Sol). New logic allows POI distance up to
    # `top.distance_m * CITY_DEMOTION_PROXIMITY_TOLERANCE` for the swap.
    # Conservative · POI cannot be much further than the city, but ties
    # (coinciding coords) now resolve correctly toward the POI.
    if _is_city_admin(top_cand):
        for i in range(1, len(scored)):
            cand_score, cand = scored[i]
            if (top_score - cand_score) >= CITY_DEMOTION_DELTA:
                break  # remaining candidates too far behind to consider
            proximity_limit = (
                top_cand.distance_m * CITY_DEMOTION_PROXIMITY_TOLERANCE
            )
            if _is_local_poi(cand) and cand.distance_m <= proximity_limit:
                # Swap · the POI takes the top slot.
                scored.insert(0, scored.pop(i))
                top_score, top_cand = scored[0]
                break

    # Phase 12 · Hostile water rejection -------------------------------------
    # If the top candidate is an ocean / gulf / sea AND no local POI
    # exists in the rest of the pool, suppress. Don't hallucinate a
    # capsule for "Atlantic Ocean".
    if _is_hostile_water(top_cand):
        has_poi_fallback = any(
            _is_local_poi(c) for _, c in scored[1:]
        )
        if not has_poi_fallback:
            return None, "HOSTILE_EMPTY"

    if top_score < RANK_THRESHOLD:
        return None, "LOW_RANK"

    # Phase 12 · Ambiguity resolution via notability tie-break ---------------
    # Old behavior returned AMBIGUOUS_WINNER (suppress) on near-tie.
    # New behavior resolves intelligently: if second is significantly
    # more notable (sitelinks ratio above threshold), swap. Otherwise
    # keep the tie-break-by-length order. Suppress only when notability
    # itself is also indistinguishable.
    if len(scored) >= 2:
        second_score, second_cand = scored[1]
        if (top_score - second_score) < RANK_AMBIGUITY_DELTA:
            top_cls = _class_score(top_cand.classes)
            second_cls = _class_score(second_cand.classes)
            if (
                top_cls >= RANK_AMBIGUITY_CLASS_MIN
                and second_cls >= RANK_AMBIGUITY_CLASS_MIN
            ):
                top_notability = max(top_cand.sitelinks_count, 1)
                second_notability = second_cand.sitelinks_count
                if (
                    second_notability
                    >= top_notability * RANK_AMBIGUITY_NOTABILITY_RATIO
                ):
                    # Second is meaningfully more notable · swap.
                    scored.insert(0, scored.pop(1))
                    top_score, top_cand = scored[0]
                elif (
                    top_notability
                    >= second_notability * RANK_AMBIGUITY_NOTABILITY_RATIO
                ):
                    # First is meaningfully more notable · keep.
                    pass
                else:
                    # True ambiguity · score tied AND notability tied.
                    return None, "AMBIGUOUS_WINNER"

    winner = WinningEntity(
        entity_id=top_cand.entity_id,
        label=top_cand.label,
        distance_m=top_cand.distance_m,
        rank_score=top_score,
        classes=top_cand.classes,
        wikipedia_title_es=top_cand.label if top_cand.has_es_wiki else None,
        wikipedia_title_en=top_cand.label if top_cand.has_en_wiki else None,
    )
    return winner, None
