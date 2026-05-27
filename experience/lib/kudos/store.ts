/**
 * KUDOS · MVP store.
 *
 * Dual model · POI (place) + Capsule (audiovisual unit). One POI has
 * one featured capsule plus N secondary capsules.
 *
 *   Mi Mundo · Guardados  → saved POIs
 *   Mi Mundo · Mis cápsulas → saved capsules
 *
 * Persistence: localStorage namespaced `kudos:*` · client-only.
 * Seed: bootstrap from existing fixtures (mocks-v2/fixtures + epochs).
 * No backend yet.
 */
"use client";

import * as React from "react";
import { ECHOES, PLACES, type MockEcho, type EraId } from "@/lib/mocks-v2/fixtures";
import type { MockEpoch } from "@/lib/mocks-v2/epochs";
import { syncToBackend } from "./sync";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Poi {
  /** Stable id · matches MockEcho.placeId */
  id: string;
  /** Display name · "Coliseo Romano" */
  name: string;
  /** Country */
  country: string;
  /** Coords */
  lat: number;
  lng: number;
  /** Era classification */
  era: EraId;
  /** Hero image URL · for cards / map / detail */
  heroImage: string;
  /** Silhouette kind for fallback rendering */
  silhouette: MockEcho["silhouette"];
  /** Gradient pair used as background fallback */
  gradientFrom: string;
  gradientTo: string;
  /** Category tags · used by Mapa filters */
  categories: ReadonlyArray<PoiCategory>;
  /** One-line description · ~140c */
  short: string;
  /** Average rating · 0..10 · seed value */
  rating: number;
  /** Number of ratings · for display */
  ratingCount: number;
  /** Featured capsule id (1:1) */
  featuredCapsuleId: string;
  /** Other capsule ids attached to this POI */
  capsuleIds: ReadonlyArray<string>;
}

export type PoiCategory =
  | "monumento"
  | "museo"
  | "gastronomia"
  | "naturaleza"
  | "evento"
  | "cultura"
  | "historia"
  | "arquitectura"
  | "misterio";

export interface Capsule {
  /** Stable id */
  id: string;
  /** Owning POI id */
  poiId: string;
  /** Title · "Lo que casi nadie sabe del Coliseo Romano" */
  title: string;
  /** Short tagline · used on cards */
  tagline: string;
  /** Optional hook · cinematic opener · used on share */
  hook?: string;
  /** Optional clip src · 15s MP4/WebM · undefined → honest still-only */
  clipSrc?: string;
  /** Poster image · always present */
  poster: string;
  /** Duration string · "0:15" · only if clipSrc */
  duration?: string;
  /** Category tag · drives Pill colour */
  category: PoiCategory;
  /** Optional epoch reference · if the capsule is tied to a specific epoch */
  epochId?: string;
  /** Optional epoch year label · "70-80 d.C." */
  epochLabel?: string;
}

export interface SavedItem<T extends "poi" | "capsule" = "poi" | "capsule"> {
  kind: T;
  id: string;
  savedAt: number;
}

export type MeritPillar =
  | "creacion"
  | "inspiracion"
  | "descubrimiento"
  | "comunidad"
  | "integridad";

export interface MeritEvent {
  id: string;
  ts: number;
  pillar: MeritPillar;
  points: number;
  label: string;
  poiId?: string;
  capsuleId?: string;
}

// ─── Storage layer ────────────────────────────────────────────────────────

const NS = {
  saved:  "kudos:saved",
  merit:  "kudos:merit",
  visited:"kudos:visited",
  streak: "kudos:streak",
  seed:   "kudos:seed-v1",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ─── Demo video clips (P11.8) · local MP4 assets in /public/capsules/ ─────
// Strict 1:1 mapping · every echo plays its own MP4 (P13.5).
// All clips share an identical ffmpeg pipeline (ken-burns over a brand-gradient
// still · no baked text · React overlays carry POI metadata).
const CLIP_SRC_BY_ECHO: Record<string, string | undefined> = {
  coliseo:               "/capsules/coliseo.mp4",
  machu:                 "/capsules/machu.mp4",
  athens:                "/capsules/athens.mp4",
  notre:                 "/capsules/notre.mp4",
  mlk:                   "/capsules/mlk.mp4",
  areoso:                "/capsules/areoso.mp4",
  "pontevedra-medieval": "/capsules/pontevedra-medieval.mp4",
  santiagomateo:         "/capsules/santiagomateo.mp4",
  "tokyo-showa":         "/capsules/tokyo-showa.mp4",
  "sagrada-familia":     "/capsules/sagrada-familia.mp4",
  alhambra:              "/capsules/alhambra.mp4",
  petra:                 "/capsules/petra.mp4",
  "hagia-sofia":         "/capsules/hagia-sofia.mp4",
  "torre-eiffel":        "/capsules/torre-eiffel.mp4",
  sacsayhuaman:          "/capsules/sacsayhuaman.mp4",
};

// ─── Local poster assets (P12.6) · bundled JPGs in /public/pois/ ─────────
// When an echo id maps here, we prefer the local poster over the remote
// Wikimedia URL · guarantees instant paint + offline reliability.
const LOCAL_POSTER_BY_ECHO: Record<string, string> = {
  coliseo:               "/pois/coliseo.jpg",
  machu:                 "/pois/machu.jpg",
  athens:                "/pois/athens.jpg",
  notre:                 "/pois/notre.jpg",
  mlk:                   "/pois/mlk.jpg",
  areoso:                "/pois/areoso.jpg",
  "pontevedra-medieval": "/pois/pontevedra-medieval.jpg",
  santiagomateo:         "/pois/santiagomateo.jpg",
  "tokyo-showa":         "/pois/tokyo-showa.jpg",
  "sagrada-familia":     "/pois/sagrada-familia.jpg",
  alhambra:              "/pois/alhambra.jpg",
  petra:                 "/pois/petra.jpg",
  "hagia-sofia":         "/pois/hagia-sofia.jpg",
  "torre-eiffel":        "/pois/torre-eiffel.jpg",
  sacsayhuaman:          "/pois/sacsayhuaman.jpg",
};
const POSTER_FALLBACK = "/pois/_default.jpg";

function posterForEcho(echoId: string, remote: string): string {
  return LOCAL_POSTER_BY_ECHO[echoId] ?? remote ?? POSTER_FALLBACK;
}

// ─── Seed · derive POIs + Capsules from existing fixtures ─────────────────

function categoryFromTag(tag: string, era: EraId): PoiCategory {
  const t = tag.toLowerCase();
  if (t.includes("histó") || t.includes("histo")) return "historia";
  if (t.includes("cultur"))                       return "cultura";
  if (t.includes("inspira"))                      return "cultura";
  if (t.includes("misterio"))                     return "misterio";
  if (era === "today" || era === "modern")        return "monumento";
  return "monumento";
}

function buildSeed(): { pois: ReadonlyArray<Poi>; capsules: ReadonlyArray<Capsule> } {
  const pois: Poi[] = [];
  const capsules: Capsule[] = [];

  // Map placeId → echo · first echo wins as featured
  const byPlace: Record<string, MockEcho[]> = {};
  for (const e of ECHOES) {
    (byPlace[e.placeId] ??= []).push(e);
  }

  for (const place of PLACES) {
    const echoes = byPlace[place.id];
    if (!echoes || echoes.length === 0) continue;
    const featured = echoes[0];
    const featuredCapsuleId = `cap-${featured.id}`;

    pois.push({
      id: place.id,
      name: place.name,
      country: place.country,
      lat: place.lat,
      lng: place.lng,
      era: place.era,
      heroImage: posterForEcho(featured.id, featured.heroImage),
      silhouette: featured.silhouette,
      gradientFrom: featured.gradientFrom,
      gradientTo: featured.gradientTo,
      categories: [categoryFromTag(featured.tag, place.era)],
      short: featured.subtitle,
      rating: 9 + Math.round((featured.id.charCodeAt(0) % 10)) / 10,
      ratingCount: 1000 + (featured.id.charCodeAt(0) % 10) * 320,
      featuredCapsuleId,
      capsuleIds: echoes.map((e) => `cap-${e.id}`),
    });

    // Build capsules from echoes + epochs
    for (const e of echoes) {
      capsules.push({
        id: `cap-${e.id}`,
        poiId: place.id,
        title: e.title,
        tagline: e.subtitle,
        hook: e.viralHook,
        poster: posterForEcho(e.id, e.heroImage),
        clipSrc: CLIP_SRC_BY_ECHO[e.id],
        duration: CLIP_SRC_BY_ECHO[e.id] ? "0:15" : undefined,
        category: categoryFromTag(e.tag, place.era),
      });
      // One extra capsule per declared epoch · gives "Más cápsulas de este lugar"
      const epochs: ReadonlyArray<MockEpoch> | undefined = e.epochs;
      if (epochs && epochs.length > 0) {
        for (const ep of epochs) {
          capsules.push({
            id: `cap-${e.id}--${ep.id}`,
            poiId: place.id,
            title: `${e.title} · ${ep.pill}`,
            tagline: ep.tagline,
            hook: ep.tagline,
            poster: ep.heroImage || posterForEcho(e.id, e.heroImage),
            category: categoryFromTag(e.tag, ep.era),
            epochId: ep.id,
            epochLabel: ep.pill,
          });
        }
      }
    }
  }

  return { pois, capsules };
}

// Snapshot is computed once per module load · cheap
const SEED = buildSeed();

// ─── Pure read APIs ───────────────────────────────────────────────────────

export function getAllPois(): ReadonlyArray<Poi> { return SEED.pois; }
export function getAllCapsules(): ReadonlyArray<Capsule> { return SEED.capsules; }

export function getPoiById(id: string): Poi | undefined {
  return SEED.pois.find((p) => p.id === id);
}
export function getCapsuleById(id: string): Capsule | undefined {
  return SEED.capsules.find((c) => c.id === id);
}
export function getCapsulesByPoi(poiId: string): ReadonlyArray<Capsule> {
  return SEED.capsules.filter((c) => c.poiId === poiId);
}
export function getFeaturedCapsuleForPoi(poiId: string): Capsule | undefined {
  const poi = getPoiById(poiId);
  if (!poi) return undefined;
  return getCapsuleById(poi.featuredCapsuleId);
}

/** Sort POIs by Haversine distance from user. */
export function getNearbyPois(from: { lat: number; lng: number }, limit = 10): ReadonlyArray<Poi> {
  const list = [...SEED.pois].sort((a, b) => {
    const da = (a.lat - from.lat) ** 2 + (a.lng - from.lng) ** 2;
    const db = (b.lat - from.lat) ** 2 + (b.lng - from.lng) ** 2;
    return da - db;
  });
  return list.slice(0, limit);
}

// ─── Saved state hook ─────────────────────────────────────────────────────

const SAVED_EVENT = "kudos:saved:change";

export function readSaved(): ReadonlyArray<SavedItem> {
  return readJson<ReadonlyArray<SavedItem>>(NS.saved, []);
}
function writeSaved(items: ReadonlyArray<SavedItem>): void {
  writeJson(NS.saved, items);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_EVENT));
  }
}

/**
 * Hidratación desde backend · sólo escribe si localStorage está
 * vacío para esa colección (estrategia conservadora: localStorage
 * wins). Llamado desde `hydration.ts` al montar la app.
 */
export interface HydrationPayload {
  saved?: ReadonlyArray<SavedItem>;
  meritEvents?: ReadonlyArray<MeritEvent>;
  visited?: ReadonlyArray<{ poiId: string; ts: number }>;
}

export function hydrateLocalStore(payload: HydrationPayload): {
  saved: boolean; merit: boolean; visited: boolean;
} {
  const applied = { saved: false, merit: false, visited: false };
  if (payload.saved && readSaved().length === 0) {
    writeSaved(payload.saved);
    applied.saved = true;
  }
  if (payload.meritEvents && readMeritEvents().length === 0) {
    writeMeritEvents(payload.meritEvents);
    applied.merit = true;
  }
  if (payload.visited && readVisited().length === 0) {
    writeVisited(payload.visited);
    applied.visited = true;
  }
  return applied;
}

export function useSaved() {
  // SSR-safe: arranca vacío. El useEffect hidrata desde localStorage tras mount.
  const [saved, setSaved] = React.useState<ReadonlyArray<SavedItem>>([]);
  React.useEffect(() => {
    const refresh = () => setSaved(readSaved());
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener(SAVED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SAVED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const has = React.useCallback((kind: SavedItem["kind"], id: string) => {
    return saved.some((s) => s.kind === kind && s.id === id);
  }, [saved]);

  const toggle = React.useCallback((kind: SavedItem["kind"], id: string) => {
    const wasSaved = saved.some((s) => s.kind === kind && s.id === id);
    const next = wasSaved
      ? saved.filter((s) => !(s.kind === kind && s.id === id))
      : [...saved, { kind, id, savedAt: Date.now() }];
    writeSaved(next);
    setSaved(next);
    syncToBackend({ kind: "savedToggle", itemKind: kind, id, nowSaved: !wasSaved });
    // Track merit event for discovery
    if (kind === "poi" && !saved.some((s) => s.kind === kind && s.id === id)) {
      addMeritEvent({
        pillar: "descubrimiento",
        points: 10,
        label: `Guardaste un POI`,
        poiId: id,
      });
    }
    if (kind === "capsule" && !saved.some((s) => s.kind === kind && s.id === id)) {
      addMeritEvent({
        pillar: "descubrimiento",
        points: 8,
        label: `Guardaste una cápsula`,
        capsuleId: id,
      });
    }
  }, [saved]);

  const savedPois = React.useMemo<ReadonlyArray<Poi>>(() => {
    return saved.filter((s) => s.kind === "poi").map((s) => getPoiById(s.id)).filter((p): p is Poi => !!p);
  }, [saved]);

  const savedCapsules = React.useMemo<ReadonlyArray<Capsule>>(() => {
    return saved.filter((s) => s.kind === "capsule").map((s) => getCapsuleById(s.id)).filter((c): c is Capsule => !!c);
  }, [saved]);

  return { saved, savedPois, savedCapsules, has, toggle };
}

// ─── Merit hook ───────────────────────────────────────────────────────────

const MERIT_EVENT = "kudos:merit:change";

export function readMeritEvents(): ReadonlyArray<MeritEvent> {
  return readJson<ReadonlyArray<MeritEvent>>(NS.merit, []);
}
function writeMeritEvents(events: ReadonlyArray<MeritEvent>): void {
  writeJson(NS.merit, events);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MERIT_EVENT));
  }
}

export function addMeritEvent(partial: Omit<MeritEvent, "id" | "ts">): void {
  const ev: MeritEvent = {
    id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    ...partial,
  };
  const next = [...readMeritEvents(), ev];
  writeMeritEvents(next);
  syncToBackend({ kind: "meritEvent", event: ev });
}

export interface MeritSnapshot {
  total: number;
  level: number;
  nextLevelAt: number;
  perPillar: Record<MeritPillar, number>;
  recent: ReadonlyArray<MeritEvent>;
  last30: ReadonlyArray<{ day: string; points: number }>;
}

function computeMerit(events: ReadonlyArray<MeritEvent>): MeritSnapshot {
  const perPillar: Record<MeritPillar, number> = {
    creacion: 0, inspiracion: 0, descubrimiento: 0, comunidad: 0, integridad: 0,
  };
  for (const e of events) perPillar[e.pillar] += e.points;
  const total = Object.values(perPillar).reduce((a, b) => a + b, 0);
  // Level curve · 100 / 250 / 500 / 800 / 1200 / 1700 / 2300 / 3000 / ...
  const breakpoints = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10_000];
  let level = 1;
  for (let i = 1; i < breakpoints.length; i++) {
    if (total >= breakpoints[i]) level = i + 1;
  }
  const nextLevelAt = breakpoints[Math.min(level, breakpoints.length - 1)] ?? total;
  const recent = [...events].sort((a, b) => b.ts - a.ts).slice(0, 8);

  // Last 30 days bucketed
  const now = new Date();
  const buckets: { day: string; points: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ day: key, points: 0 });
  }
  for (const e of events) {
    const key = new Date(e.ts).toISOString().slice(0, 10);
    const b = buckets.find((x) => x.day === key);
    if (b) b.points += e.points;
  }

  return { total, level, nextLevelAt, perPillar, recent, last30: buckets };
}

export function useMerit() {
  // SSR-safe: arranca vacío. El useEffect hidrata desde localStorage tras mount.
  const [events, setEvents] = React.useState<ReadonlyArray<MeritEvent>>([]);
  React.useEffect(() => {
    const refresh = () => setEvents(readMeritEvents());
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener(MERIT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MERIT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const snapshot = React.useMemo(() => computeMerit(events), [events]);
  return { events, snapshot, add: addMeritEvent };
}

// ─── Visited / "Estuve aquí" ──────────────────────────────────────────────

const VISITED_EVENT = "kudos:visited:change";

export function readVisited(): ReadonlyArray<{ poiId: string; ts: number }> {
  return readJson<ReadonlyArray<{ poiId: string; ts: number }>>(NS.visited, []);
}
function writeVisited(items: ReadonlyArray<{ poiId: string; ts: number }>): void {
  writeJson(NS.visited, items);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VISITED_EVENT));
  }
}
export function markVisited(poiId: string): void {
  const current = readVisited();
  if (current.some((v) => v.poiId === poiId)) return;
  writeVisited([...current, { poiId, ts: Date.now() }]);
  syncToBackend({ kind: "visit", placeId: poiId });
  addMeritEvent({ pillar: "descubrimiento", points: 15, label: "Estuviste en un lugar", poiId });
}

export function useVisited() {
  // SSR-safe: arranca vacío. El useEffect hidrata desde localStorage tras mount.
  const [items, setItems] = React.useState<ReadonlyArray<{ poiId: string; ts: number }>>([]);
  React.useEffect(() => {
    const refresh = () => setItems(readVisited());
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener(VISITED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(VISITED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { items, mark: markVisited };
}

// ─── Streak (Mérito multiplier) ───────────────────────────────────────────

interface StreakState { lastDay: string; days: number; }

export function tickStreak(): StreakState {
  if (typeof window === "undefined") return { lastDay: "", days: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const prev = readJson<StreakState>(NS.streak, { lastDay: "", days: 0 });
  if (prev.lastDay === today) return prev;
  // Yesterday check
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  const next: StreakState = prev.lastDay === yesterday
    ? { lastDay: today, days: prev.days + 1 }
    : { lastDay: today, days: 1 };
  writeJson(NS.streak, next);
  return next;
}

export function readStreak(): StreakState {
  if (typeof window === "undefined") return { lastDay: "", days: 0 };
  return readJson<StreakState>(NS.streak, { lastDay: "", days: 0 });
}
