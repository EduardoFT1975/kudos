/**
 * KUDOS · Engine 0 · LEGEND REFERENCE SYSTEM.
 *
 *   This is the EDITORIAL ALLOWLIST.
 *   Civilizational POIs whose status is protected from any algorithm.
 *
 * RULES (in code, not just convention):
 *
 *   • A POI on this list is LEGEND, period.
 *     No structural score can demote it.
 *     No momentum collapse can archive it.
 *     No A/B test can downgrade its capsule tier.
 *
 *   • A POI NOT on this list goes through Engine 1.
 *     Engine 1 CAN promote a candidate to LEGEND structurally.
 *     But ONLY Engine 0 can mark a POI as `legend_reference: true`.
 *
 *   • Editorial curation is intentional. Adding to the list is a product
 *     decision, not a heuristic. It's a single-line change here.
 *
 * THIS IS THE LAYER THAT GUARANTEES THE BRAND PROMISE.
 */

export interface LegendReferenceEntry {
  poi_id:           string;
  poi_name:         string;
  /** Why it earned permanent legend status (one sentence, for audit trail) */
  rationale:        string;
  /** Date added to the legend list (ISO) · for catalog versioning */
  added:            string;
  /** Curator who approved (initials/handle) */
  curator:          string;
}

// ─── THE CATALOG ──────────────────────────────────────────────────────────
// Add a line. Open a PR. Have an editor sign off. That's the entire process.
// Order is meaningful · first 4 anchor the brand · the rest fill it out.
export const LEGEND_REFERENCE: ReadonlyArray<LegendReferenceEntry> = [
  // ─── Civilizational anchors (the "always on the home page" tier) ───
  { poi_id: "coliseo",         poi_name: "Coliseo Romano",        rationale: "Pivot of imperial Rome · 7M visitors/year · global iconicity",     added: "2025-01-01", curator: "EF" },
  { poi_id: "machu",           poi_name: "Machu Picchu",          rationale: "Andean civilization apex · UNESCO · symbol of pre-Columbian Americas", added: "2025-01-01", curator: "EF" },
  { poi_id: "petra",           poi_name: "Petra",                  rationale: "Nabatean civilization · rose-rock necropolis · 'lost city' archetype", added: "2025-01-01", curator: "EF" },
  { poi_id: "taj-mahal",       poi_name: "Taj Mahal",              rationale: "Mughal apex · monument to love · global recognition outside India",  added: "2025-01-01", curator: "EF" },
  { poi_id: "pyramids-giza",   poi_name: "Pirámides de Giza",      rationale: "Old Kingdom Egypt · only surviving Wonder · oldest in the catalog", added: "2025-01-01", curator: "EF" },
  { poi_id: "athens",          poi_name: "Acrópolis de Atenas",    rationale: "Birthplace of democracy · Parthenon · Western civilization root",   added: "2025-01-01", curator: "EF" },

  // ─── Sacred + civilizational sites ────────────────────────────────
  { poi_id: "jerusalem",       poi_name: "Jerusalén",              rationale: "Three Abrahamic religions in one square km · civilizational center", added: "2025-01-01", curator: "EF" },
  { poi_id: "vatican",         poi_name: "Vaticano",                rationale: "Center of Catholicism · St Peter's + Sistine Chapel · 1.3B faithful", added: "2025-01-01", curator: "EF" },
  { poi_id: "notre",           poi_name: "Notre-Dame de Paris",    rationale: "Gothic apex · French national symbol · 2019 fire + 2024 reopening",  added: "2025-01-01", curator: "EF" },
  { poi_id: "santiago",        poi_name: "Camino de Santiago",     rationale: "1100-year pilgrimage · European cultural backbone · UNESCO route",   added: "2025-01-01", curator: "EF" },
  { poi_id: "stonehenge",      poi_name: "Stonehenge",              rationale: "Neolithic astronomy · 5000-year continuous mystery · UK icon",       added: "2025-01-01", curator: "EF" },
  { poi_id: "angkor-wat",      poi_name: "Angkor Wat",              rationale: "Khmer empire apex · largest religious monument on Earth",          added: "2025-01-01", curator: "EF" },
  { poi_id: "auschwitz",       poi_name: "Auschwitz-Birkenau",     rationale: "Holocaust memorial · permanent moral reference · UNESCO conscience site", added: "2025-01-01", curator: "EF" },

  // ─── Architectural legends ─────────────────────────────────────────
  { poi_id: "alhambra",        poi_name: "La Alhambra",             rationale: "Last Andalusi palace · Nazarí art apex · UNESCO",                  added: "2025-01-01", curator: "EF" },
  { poi_id: "sagrada-familia", poi_name: "La Sagrada Familia",     rationale: "Gaudí's life work · still rising in 2026 · modernist apex",        added: "2025-01-01", curator: "EF" },
  { poi_id: "torre-eiffel",    poi_name: "Torre Eiffel",            rationale: "1889 World's Fair · most visited paid monument · French icon",     added: "2025-01-01", curator: "EF" },
  { poi_id: "hagia-sofia",     poi_name: "Hagia Sofía",             rationale: "Byzantine cathedral → Ottoman mosque · 1500 years of pivots",      added: "2025-01-01", curator: "EF" },
  { poi_id: "great-wall",      poi_name: "Gran Muralla China",     rationale: "21000 km · 2000 years · only human-made structure visible from low orbit", added: "2025-01-01", curator: "EF" },
];

// O(1) lookup
const LEGEND_REF_SET: Set<string> = new Set(LEGEND_REFERENCE.map(e => e.poi_id));

export function isLegendReference(poi_id: string): boolean {
  return LEGEND_REF_SET.has(poi_id);
}

export function getLegendReferenceEntry(poi_id: string): LegendReferenceEntry | undefined {
  return LEGEND_REFERENCE.find(e => e.poi_id === poi_id);
}

// ─── Engine 0 verdict shape ───────────────────────────────────────────────

export interface LegendReferenceVerdict {
  poi_id:                  string;
  legend_reference:        boolean;        // true → on the curated list
  /** Forced when legend_reference=true · LegendClass becomes "LEGEND" */
  legend_class:            "LEGEND" | "UNCLASSIFIED";
  premium_asset_required:  boolean;        // mirrors the rule for tier-router
  never_downgrade:         boolean;
  never_archive:           boolean;
  rationale?:              string;
}

/**
 * Engine 0 verdict. Run this BEFORE Engine 1.
 * If `legend_reference: true`, Engine 1 must respect the forced LEGEND class.
 */
export function engine0Verdict(poi_id: string): LegendReferenceVerdict {
  const entry = getLegendReferenceEntry(poi_id);
  if (!entry) {
    return {
      poi_id,
      legend_reference:       false,
      legend_class:           "UNCLASSIFIED",
      premium_asset_required: false,
      never_downgrade:        false,
      never_archive:          false,
    };
  }
  return {
    poi_id,
    legend_reference:       true,
    legend_class:           "LEGEND",
    premium_asset_required: true,
    never_downgrade:        true,
    never_archive:          true,
    rationale:              entry.rationale,
  };
}
