/**
 * KUDOS Experience · capsule UX state types
 *
 * Strict separation between backend taxonomy and UX presentation.
 *
 * Backend produces many failure_class values (LOW_RANK, NO_CANDIDATES,
 * WIKIDATA_CLIENT_ERROR, LLM_JSON_FAIL, FORBIDDEN_CONTENT, UNGROUNDED,
 * STORAGE_RACE_LOST, ...). The UX layer collapses them to 4 states
 * with human language. Translation happens server-side in
 * `content_engine/api.py:_translate_to_ux_response`. No raw backend
 * errors cross this boundary.
 *
 * Mapping rules (implemented in Django API · Phase 11):
 *
 *   Backend outcome                                  → UX state
 *   ---------------------------------------------    → ----------------
 *   PlaceCapsule + confidence >= 0.75 + !override   → success
 *   PlaceCapsule + (confidence < 0.75 || override)  → sparse_discovery
 *   None + any failure_class                        → empty_zone
 *   Async fetch in flight (frontend-only)           → building_context
 *
 * NOTE: `building_context` is a FRONTEND lifecycle state. It is NEVER
 * sent by the API. The client renders building_context while the
 * request to /api/capsule/nearby is pending.
 */

export type CapsuleUXState =
  | "building_context"
  | "success"
  | "sparse_discovery"
  | "empty_zone"
  | "system_unavailable"; // Phase 14.10 · infra/network failure (NOT a real empty place).

export type CapsuleSource = "direct" | "landmark_override";

/**
 * Minimal capsule shape returned by /api/capsule/nearby.
 *
 * This is the V0 contract. Richer fields (timeline, media, relations,
 * hero block) may be added in future phases when the content engine
 * generates them. Visual components must tolerate missing optional
 * fields gracefully.
 */
export interface CapsuleSourceRef {
  index: number;
  source_type: "wikidata" | "wikipedia";
  source_id: string;
  url: string;
  retrieved_at: string;
  snippet: string;
  supports_sentence_indices: number[];
}

export interface CapsuleData {
  id: string;
  entity_id: string;
  title: string;
  factual_anchor: string;
  context_block: string;
  source_refs: CapsuleSourceRef[];
  image_url?: string;
  thumbnail_url?: string;
  media_source?: string;
  media_caption?: string;
  media_debug?: "REAL" | "NONE";
}

export interface CapsuleStateMeta {
  /** 0..1 · null only when state="empty_zone". */
  confidence: number | null;
  /** True when state="sparse_discovery". False otherwise. */
  partial: boolean;
  /** Retrieval provenance. Null when state="empty_zone". */
  source: CapsuleSource | null;
}

export interface CapsuleResponse {
  state: CapsuleUXState;
  capsule: CapsuleData | null;
  meta: CapsuleStateMeta;
}
