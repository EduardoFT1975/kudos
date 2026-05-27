/**
 * KUDOS API · contratos compartidos con backend Django (kudos_app/api_mvp.py).
 *
 * Estos tipos deben mantenerse sincronizados con los endpoints. Si el
 * backend cambia un campo, este archivo debe cambiar también. La
 * referencia canónica es `kudos_app/api_mvp.py`.
 */

import type { MeritPillar } from "@/lib/kudos/store";

// ─── Mérito ────────────────────────────────────────────────────────────

export interface ApiMeritEvent {
  id: number;
  pillar: MeritPillar;
  points: number;
  label: string;
  ts: string;                  // ISO 8601
  capsule_id: number | null;
  place_id: number | null;
}

export interface ApiMeritDayBucket {
  day: string;                 // YYYY-MM-DD
  points: number;
}

export interface ApiStreakState {
  days: number;
  best_days: number;
  last_day: string | null;     // YYYY-MM-DD
}

export interface ApiMeritSnapshot {
  total: number;
  level: number;
  next_level_at: number;
  per_pillar: Record<MeritPillar, number>;
  recent: ReadonlyArray<ApiMeritEvent>;
  last_30: ReadonlyArray<ApiMeritDayBucket>;
  streak: ApiStreakState;
}

export interface ApiMeritEventsList {
  events: ReadonlyArray<ApiMeritEvent>;
}

export interface ApiMeritAddEventInput {
  pillar: MeritPillar;
  points: number;
  label?: string;
  capsule_id?: string;
  place_id?: string;
}

export interface ApiMeritAddEventResult {
  id: number;
  ok: true;
}

// ─── Bookmarks (Saved) ─────────────────────────────────────────────────

export interface ApiBookmark {
  id: number;
  kind: "capsule" | "poi";
  target_id: string;
  note: string;
  created: string;             // ISO 8601
}

export interface ApiBookmarksList {
  bookmarks: ReadonlyArray<ApiBookmark>;
}

export interface ApiBookmarkInput {
  kind: "capsule" | "poi";
  target_id: string;
  note?: string;
}

export interface ApiBookmarkCreateResult {
  id: number;
  created: boolean;
}

export interface ApiBookmarkDeleteResult {
  ok: true;
  deleted: number;
}

// ─── Visits ────────────────────────────────────────────────────────────

export interface ApiVisit {
  place_id: string;
  place_name: string;
  ts: string;                  // ISO 8601
  lat: number | null;
  lon: number | null;
}

export interface ApiVisitsList {
  visits: ReadonlyArray<ApiVisit>;
}

export interface ApiVisitInput {
  place_id: string;
  lat?: number | null;
  lon?: number | null;
}

export interface ApiVisitResult {
  ok: true;
  created: boolean;
  place_id: string;
}

// ─── Collections ───────────────────────────────────────────────────────

export interface ApiCollection {
  id: number;
  name: string;
  slug: string;
  kind: "manual" | "saved" | "visited" | "affinity";
  description: string;
  cover_image: string;
  is_public: boolean;
  capsule_count: number;
  place_count: number;
  created: string;             // ISO 8601
  updated: string;             // ISO 8601
}

export interface ApiCollectionsList {
  collections: ReadonlyArray<ApiCollection>;
}
