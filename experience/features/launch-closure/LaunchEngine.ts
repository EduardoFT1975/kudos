"use client";

/**
 * KUDOS Experience · launch-closure/LaunchEngine (Block 10 · final)
 *
 * Single source of truth for launch readiness. Pure local-first ·
 * NO backend, NO Sentry, NO vendor observability. Persists to
 * localStorage under kudos:launch:closure:state.
 *
 * Public API surface:
 *
 *   - Checklist:
 *       readChecklist · runChecklist (seed + repair)
 *       markChecklistItem · setChecklistNotes · resetChecklist
 *
 *   - Readiness:
 *       computeLaunchReadiness · getBlockingIssues
 *
 *   - Loading audit:
 *       startLoading · finishLoading · markLoadingStuck
 *       getLoadingAudit · clearLoadingAudit
 *
 *   - Empty state audit:
 *       recordEmptyState · getEmptyStateAudit · clearEmptyStates
 *
 *   - Fatal log:
 *       logFatal · getFatalLog · markFatalRecovered · clearFatals
 *
 *   - Kill switches:
 *       readKillSwitches · setKillSwitch · resetKillSwitches
 *
 *   - Onboarding closure:
 *       recordOnboarding · readOnboarding
 *
 *   - Reset:
 *       resetLaunchState (destructive)
 *
 *   - Bus:
 *       LAUNCH_EVENT · re-broadcast after every mutation
 */
import {
  CHECKLIST_SEED,
  DEFAULT_KILL_SWITCHES,
  DEFAULT_STATE,
  EMPTY_STATE_LOG_CAP,
  FATAL_LOG_CAP,
  LAUNCH_EVENT,
  LOADING_LOG_CAP,
  READINESS_THRESHOLDS,
  STORAGE_KEYS,
  STUCK_LOADING_MS,
  type ChecklistCategory,
  type ChecklistItem,
  type EmptyStateEntry,
  type FatalLogEntry,
  type KillSwitchFlags,
  type LaunchClosureState,
  type LoadingAuditEntry,
  type ReadinessLevel,
  type ReadinessScore,
} from "./launchTypes";

// ---------------------------------------------------------------------------
// State helpers (SSR-safe)
// ---------------------------------------------------------------------------
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function readState(): LaunchClosureState {
  if (typeof window === "undefined") return clone(DEFAULT_STATE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.state);
    if (!raw) return seedFromDefaults();
    const parsed = JSON.parse(raw);
    return {
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      loading: Array.isArray(parsed.loading) ? parsed.loading : [],
      emptyStates: Array.isArray(parsed.emptyStates) ? parsed.emptyStates : [],
      fatals: Array.isArray(parsed.fatals) ? parsed.fatals : [],
      killSwitches: { ...DEFAULT_KILL_SWITCHES, ...(parsed.killSwitches ?? {}) },
      onboarding: { ...DEFAULT_STATE.onboarding, ...(parsed.onboarding ?? {}) },
    };
  } catch {
    return seedFromDefaults();
  }
}

function seedFromDefaults(): LaunchClosureState {
  const state = clone(DEFAULT_STATE);
  state.checklist = CHECKLIST_SEED.map((s) => ({ ...s, notes: "", completed: false }));
  return state;
}

function writeState(state: LaunchClosureState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(LAUNCH_EVENT));
  } catch {
    /* quota · ignore */
  }
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------
export function readChecklist(): ChecklistItem[] {
  return readState().checklist;
}

/** Ensures every seed item is present (heals partial state). Returns the repaired list. */
export function runChecklist(): ChecklistItem[] {
  const state = readState();
  const byId = new Map(state.checklist.map((c) => [c.id, c]));
  for (const seed of CHECKLIST_SEED) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, { ...seed, notes: "", completed: false });
    } else {
      // Repair · merge seed-level fields (label/category/blocking) so prompt updates propagate
      const cur = byId.get(seed.id)!;
      byId.set(seed.id, { ...cur, label: seed.label, category: seed.category, blocking: seed.blocking, seed: true });
    }
  }
  const merged = Array.from(byId.values());
  writeState({ ...state, checklist: merged });
  return merged;
}

export function markChecklistItem(id: string, completed: boolean): ChecklistItem[] {
  const state = readState();
  const checklist = state.checklist.map((c) => (c.id === id ? { ...c, completed } : c));
  writeState({ ...state, checklist });
  return checklist;
}

export function setChecklistNotes(id: string, notes: string): ChecklistItem[] {
  const state = readState();
  const checklist = state.checklist.map((c) => (c.id === id ? { ...c, notes } : c));
  writeState({ ...state, checklist });
  return checklist;
}

export function resetChecklist(): ChecklistItem[] {
  const state = readState();
  const checklist = CHECKLIST_SEED.map((s) => ({ ...s, notes: "", completed: false }));
  writeState({ ...state, checklist });
  return checklist;
}

// ---------------------------------------------------------------------------
// Readiness scoring
// ---------------------------------------------------------------------------
function levelFromScore(score: number): ReadinessLevel {
  if (score >= READINESS_THRESHOLDS.LAUNCH_READY) return "LAUNCH_READY";
  if (score >= READINESS_THRESHOLDS.READY_FOR_TEST) return "READY_FOR_TEST";
  if (score >= READINESS_THRESHOLDS.ALMOST_READY) return "ALMOST_READY";
  return "NOT_READY";
}

export function computeLaunchReadiness(): ReadinessScore {
  const state = readState();
  const list = state.checklist;
  const total = list.length || 1;
  const completed = list.filter((c) => c.completed).length;
  const blockingItems = list.filter((c) => c.blocking);
  const blockingCount = blockingItems.filter((c) => !c.completed).length;
  const warningCount = list.filter((c) => !c.completed && !c.blocking).length;

  // Loading health · 100 if no stuck loads in last 24h, drop fast if stuck
  const now = Date.now();
  const recentLoading = state.loading.filter((l) => now - l.startedAt < 24 * 60 * 60 * 1000);
  const stuckCount = recentLoading.filter((l) => l.stuck).length;
  const loadingHealth = Math.max(0, 100 - stuckCount * 15);

  // Empty state health · degrades with repeated empty surfaces
  const repeated = state.emptyStates.filter((e) => e.hits >= 3).length;
  const emptyStateHealth = Math.max(0, 100 - repeated * 10);

  // Fatal count (last 24h)
  const fatalCount24h = state.fatals.filter((f) => now - f.ts < 24 * 60 * 60 * 1000).length;

  // Composite score
  // 60% checklist · 10% blockers free · 10% loading · 10% empty · 10% fatals
  const checklistPct = (completed / total) * 100;
  const blockersFreePct = blockingItems.length === 0
    ? 100
    : ((blockingItems.length - blockingCount) / blockingItems.length) * 100;
  const fatalPenalty = Math.max(0, 100 - fatalCount24h * 25);
  const raw =
    checklistPct * 0.6 +
    blockersFreePct * 0.1 +
    loadingHealth * 0.1 +
    emptyStateHealth * 0.1 +
    fatalPenalty * 0.1;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  // Per-category completion
  const cats: ChecklistCategory[] = [
    "PRODUCT","UX","ERRORS","LOADING","CONTENT","MERIT","NOTIFICATIONS","SHARING","ONBOARDING","SAFETY",
  ];
  const byCategory = {} as Record<ChecklistCategory, number>;
  for (const c of cats) {
    const items = list.filter((i) => i.category === c);
    const done = items.filter((i) => i.completed).length;
    byCategory[c] = items.length === 0 ? 100 : Math.round((done / items.length) * 100);
  }

  return {
    score,
    level: levelFromScore(score),
    blockingCount,
    warningCount,
    completedCount: completed,
    totalCount: total,
    byCategory,
    loadingHealth,
    emptyStateHealth,
    fatalCount24h,
  };
}

export function getBlockingIssues(): ChecklistItem[] {
  return readChecklist().filter((c) => c.blocking && !c.completed);
}

// ---------------------------------------------------------------------------
// Loading audit
// ---------------------------------------------------------------------------
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function startLoading(surface: string): string {
  const state = readState();
  const id = genId("ld");
  const entry: LoadingAuditEntry = {
    id, surface, startedAt: Date.now(), finishedAt: null, stuck: false, retries: 0,
  };
  const loading = [entry, ...state.loading].slice(0, LOADING_LOG_CAP);
  writeState({ ...state, loading });
  return id;
}

export function finishLoading(id: string): void {
  const state = readState();
  const loading = state.loading.map((l) => (l.id === id ? { ...l, finishedAt: Date.now() } : l));
  writeState({ ...state, loading });
}

export function markLoadingStuck(id: string): void {
  const state = readState();
  const loading = state.loading.map((l) => (l.id === id ? { ...l, stuck: true } : l));
  writeState({ ...state, loading });
}

export function bumpLoadingRetry(id: string): void {
  const state = readState();
  const loading = state.loading.map((l) => (l.id === id ? { ...l, retries: l.retries + 1 } : l));
  writeState({ ...state, loading });
}

export function getLoadingAudit(): LoadingAuditEntry[] {
  return readState().loading;
}

export function clearLoadingAudit(): void {
  const state = readState();
  writeState({ ...state, loading: [] });
}

// ---------------------------------------------------------------------------
// Empty state audit
// ---------------------------------------------------------------------------
export function recordEmptyState(surface: string): EmptyStateEntry[] {
  const state = readState();
  const now = Date.now();
  const idx = state.emptyStates.findIndex((e) => e.surface === surface);
  let next: EmptyStateEntry[];
  if (idx >= 0) {
    next = state.emptyStates.map((e, i) => (i === idx ? { ...e, hits: e.hits + 1, lastSeen: now } : e));
  } else {
    next = [{ surface, hits: 1, lastSeen: now }, ...state.emptyStates].slice(0, EMPTY_STATE_LOG_CAP);
  }
  writeState({ ...state, emptyStates: next });
  return next;
}

export function getEmptyStateAudit(): EmptyStateEntry[] {
  return readState().emptyStates;
}

export function clearEmptyStates(): void {
  const state = readState();
  writeState({ ...state, emptyStates: [] });
}

// ---------------------------------------------------------------------------
// Fatal log
// ---------------------------------------------------------------------------
export function logFatal(payload: { message: string; stack?: string; origin: string }): FatalLogEntry {
  const state = readState();
  const entry: FatalLogEntry = {
    id: genId("ft"),
    ts: Date.now(),
    message: payload.message,
    stack: payload.stack,
    origin: payload.origin,
    recovered: false,
  };
  const fatals = [entry, ...state.fatals].slice(0, FATAL_LOG_CAP);
  writeState({ ...state, fatals });
  return entry;
}

export function markFatalRecovered(id: string): void {
  const state = readState();
  const fatals = state.fatals.map((f) => (f.id === id ? { ...f, recovered: true } : f));
  writeState({ ...state, fatals });
}

export function getFatalLog(): FatalLogEntry[] {
  return readState().fatals;
}

export function clearFatals(): void {
  const state = readState();
  writeState({ ...state, fatals: [] });
}

// ---------------------------------------------------------------------------
// Kill switches
// ---------------------------------------------------------------------------
export function readKillSwitches(): KillSwitchFlags {
  return readState().killSwitches;
}

export function setKillSwitch(key: keyof KillSwitchFlags, value: boolean): KillSwitchFlags {
  const state = readState();
  const killSwitches = { ...state.killSwitches, [key]: value };
  writeState({ ...state, killSwitches });
  return killSwitches;
}

export function resetKillSwitches(): KillSwitchFlags {
  const state = readState();
  writeState({ ...state, killSwitches: { ...DEFAULT_KILL_SWITCHES } });
  return { ...DEFAULT_KILL_SWITCHES };
}

// ---------------------------------------------------------------------------
// Onboarding closure
// ---------------------------------------------------------------------------
export type OnboardingEvent = "completed" | "skipped" | "stuck" | "abandoned";

export function recordOnboarding(event: OnboardingEvent): void {
  const state = readState();
  const onboarding = { ...state.onboarding, [event]: state.onboarding[event] + 1 };
  writeState({ ...state, onboarding });
}

export function readOnboarding() {
  return readState().onboarding;
}

// ---------------------------------------------------------------------------
// Safe reset · destructive
// ---------------------------------------------------------------------------
export function resetLaunchState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.state);
    window.dispatchEvent(new CustomEvent(LAUNCH_EVENT));
  } catch {
    /* ignore */
  }
}

/** Hard reset · removes the launch state AND every namespaced KUDOS key
 *  in localStorage. Used by FatalRecoveryLayer when a payload is corrupted. */
export function safeAppReset(): void {
  if (typeof window === "undefined") return;
  try {
    const ls = window.localStorage;
    const toRemove: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith("kudos:")) toRemove.push(k);
    }
    for (const k of toRemove) ls.removeItem(k);
    window.dispatchEvent(new CustomEvent(LAUNCH_EVENT));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Hook helper · React surfaces subscribe via this event
// ---------------------------------------------------------------------------
export { LAUNCH_EVENT, STUCK_LOADING_MS };
