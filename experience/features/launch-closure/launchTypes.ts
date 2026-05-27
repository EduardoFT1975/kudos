/**
 * KUDOS Experience · launch-closure/launchTypes (Block 10 · final)
 *
 * Pure data + constants for the launch closure subsystem. No React,
 * no localStorage access. Consumed by LaunchEngine and every closure
 * surface (banner / panel / recovery / loading audit).
 */

// ---------------------------------------------------------------------------
// Checklist taxonomy · 10 categories
// ---------------------------------------------------------------------------
export type ChecklistCategory =
  | "PRODUCT"
  | "UX"
  | "ERRORS"
  | "LOADING"
  | "CONTENT"
  | "MERIT"
  | "NOTIFICATIONS"
  | "SHARING"
  | "ONBOARDING"
  | "SAFETY";

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  /** When true, an unchecked item subtracts from readiness AND counts as blocker. */
  blocking: boolean;
  /** Founder notes · free text. */
  notes: string;
  completed: boolean;
  /** Default item provided by the seed · cannot be deleted (but can be uncheck/notes-edited). */
  seed: boolean;
}

// ---------------------------------------------------------------------------
// Readiness scoring
// ---------------------------------------------------------------------------
export type ReadinessLevel =
  | "NOT_READY"
  | "ALMOST_READY"
  | "READY_FOR_TEST"
  | "LAUNCH_READY";

export interface ReadinessScore {
  score: number;        // 0..100
  level: ReadinessLevel;
  blockingCount: number;
  warningCount: number;
  completedCount: number;
  totalCount: number;
  /** Breakdown by category (% complete). */
  byCategory: Record<ChecklistCategory, number>;
  loadingHealth: number;   // 0..100
  emptyStateHealth: number; // 0..100
  fatalCount24h: number;
}

// ---------------------------------------------------------------------------
// Loading audit
// ---------------------------------------------------------------------------
export interface LoadingAuditEntry {
  id: string;
  /** Logical name of the surface that started loading. */
  surface: string;
  /** Epoch ms when loading started. */
  startedAt: number;
  /** Epoch ms when loading finished, or null if still going. */
  finishedAt: number | null;
  /** When true, the surface has reported it's stuck (overshot threshold). */
  stuck: boolean;
  /** Retry count tracked by the consumer · informative. */
  retries: number;
}

// ---------------------------------------------------------------------------
// Empty state audit
// ---------------------------------------------------------------------------
export interface EmptyStateEntry {
  surface: string;
  hits: number;
  lastSeen: number;
}

// ---------------------------------------------------------------------------
// Fatal log
// ---------------------------------------------------------------------------
export interface FatalLogEntry {
  id: string;
  ts: number;
  message: string;
  stack?: string;
  /** Where the boundary caught it. */
  origin: string;
  /** True if a safe-reset was applied. */
  recovered: boolean;
}

// ---------------------------------------------------------------------------
// Kill switches · founder emergency controls
// ---------------------------------------------------------------------------
export interface KillSwitchFlags {
  notifications: boolean;
  merit: boolean;
  creatorLoop: boolean;
  temporalMap: boolean;
  shareEngine: boolean;
}

export const DEFAULT_KILL_SWITCHES: KillSwitchFlags = {
  notifications: false,
  merit: false,
  creatorLoop: false,
  temporalMap: false,
  shareEngine: false,
};

// ---------------------------------------------------------------------------
// Persisted state
// ---------------------------------------------------------------------------
export interface LaunchClosureState {
  checklist: ChecklistItem[];
  loading: LoadingAuditEntry[];
  emptyStates: EmptyStateEntry[];
  fatals: FatalLogEntry[];
  killSwitches: KillSwitchFlags;
  /** Onboarding closure tracker · simple counters. */
  onboarding: {
    completed: number;
    skipped: number;
    stuck: number;
    abandoned: number;
  };
}

export const DEFAULT_STATE: LaunchClosureState = {
  checklist: [],
  loading: [],
  emptyStates: [],
  fatals: [],
  killSwitches: { ...DEFAULT_KILL_SWITCHES },
  onboarding: { completed: 0, skipped: 0, stuck: 0, abandoned: 0 },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  state: "kudos:launch:closure:state",
} as const;

export const STUCK_LOADING_MS = 8_000;
export const FATAL_LOG_CAP = 50;
export const LOADING_LOG_CAP = 80;
export const EMPTY_STATE_LOG_CAP = 40;

export const READINESS_THRESHOLDS: Readonly<Record<ReadinessLevel, number>> = {
  NOT_READY: 0,
  ALMOST_READY: 45,
  READY_FOR_TEST: 70,
  LAUNCH_READY: 90,
};

export const READINESS_LABELS: Readonly<Record<ReadinessLevel, string>> = {
  NOT_READY: "No listo",
  ALMOST_READY: "Casi listo",
  READY_FOR_TEST: "Listo para testing",
  LAUNCH_READY: "Listo para lanzamiento",
};

export const READINESS_TONE: Readonly<Record<ReadinessLevel, { accent: string; bg: string }>> = {
  NOT_READY:        { accent: "#f87171", bg: "rgba(248,113,113,0.10)" },
  ALMOST_READY:     { accent: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  READY_FOR_TEST:   { accent: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
  LAUNCH_READY:     { accent: "#4ade80", bg: "rgba(74,222,128,0.10)" },
};

// ---------------------------------------------------------------------------
// Checklist seed · what the engine initializes a brand-new install with.
// ---------------------------------------------------------------------------
export const CHECKLIST_SEED: ReadonlyArray<Omit<ChecklistItem, "notes" | "completed">> = [
  // PRODUCT
  { id: "p-1", category: "PRODUCT", label: "Echo Portal V2 ruta /echo/[id] funcional",        blocking: true,  seed: true },
  { id: "p-2", category: "PRODUCT", label: "Studio /studio funcional con 4 echoes",            blocking: true,  seed: true },
  { id: "p-3", category: "PRODUCT", label: "Mapa Temporal V2 renderiza eras",                  blocking: false, seed: true },
  { id: "p-4", category: "PRODUCT", label: "Journeys closed-loop (Echo ↔ Studio)",             blocking: true,  seed: true },
  // UX
  { id: "u-1", category: "UX", label: "Header global presente en todas las rutas",             blocking: true,  seed: true },
  { id: "u-2", category: "UX", label: "Section reveals + scroll choreography",                 blocking: false, seed: true },
  { id: "u-3", category: "UX", label: "Mobile-first probado en viewport 375px",                blocking: false, seed: true },
  // ERRORS
  { id: "e-1", category: "ERRORS", label: "FatalRecoveryLayer montado global",                 blocking: true,  seed: true },
  { id: "e-2", category: "ERRORS", label: "Error boundary captura render failures",            blocking: true,  seed: true },
  { id: "e-3", category: "ERRORS", label: "Safe reset borra estado local corrupto",            blocking: false, seed: true },
  // LOADING
  { id: "l-1", category: "LOADING", label: "Loading states presentes en todas las rutas",      blocking: false, seed: true },
  { id: "l-2", category: "LOADING", label: "Stuck loading detectable (>8s)",                   blocking: false, seed: true },
  { id: "l-3", category: "LOADING", label: "Retries y timeouts no rompen UI",                  blocking: true,  seed: true },
  // CONTENT
  { id: "c-1", category: "CONTENT", label: "4 echoes reales (Maria/Julien/Lucia/Kenji)",       blocking: true,  seed: true },
  { id: "c-2", category: "CONTENT", label: "Landmarks por place + DNA",                        blocking: false, seed: true },
  { id: "c-3", category: "CONTENT", label: "Empty states copy escrito",                        blocking: false, seed: true },
  // MERIT
  { id: "m-1", category: "MERIT", label: "Merit economy 5-layer activo",                       blocking: false, seed: true },
  { id: "m-2", category: "MERIT", label: "Level-up toast dispara correctamente",               blocking: false, seed: true },
  { id: "m-3", category: "MERIT", label: "Anti-spam + decay funcionando",                      blocking: false, seed: true },
  // NOTIFICATIONS
  { id: "n-1", category: "NOTIFICATIONS", label: "Bell global con badge unread",               blocking: false, seed: true },
  { id: "n-2", category: "NOTIFICATIONS", label: "Cooldown + burst + dedup funcionan",         blocking: false, seed: true },
  { id: "n-3", category: "NOTIFICATIONS", label: "Preferences persisten",                      blocking: false, seed: true },
  // SHARING
  { id: "s-1", category: "SHARING", label: "Share copy engine produce hook + cta",             blocking: false, seed: true },
  { id: "s-2", category: "SHARING", label: "WhatsApp/X share no popup-blocked",                blocking: true,  seed: true },
  { id: "s-3", category: "SHARING", label: "Shared URLs abren echo correcto",                  blocking: true,  seed: true },
  // ONBOARDING
  { id: "o-1", category: "ONBOARDING", label: "Primer ingreso muestra un echo en <5s",         blocking: true,  seed: true },
  { id: "o-2", category: "ONBOARDING", label: "Sin auth gate para explorar",                   blocking: true,  seed: true },
  { id: "o-3", category: "ONBOARDING", label: "Tooltip/coachmark inicial discreto",            blocking: false, seed: true },
  // SAFETY
  { id: "sf-1", category: "SAFETY", label: "Kill switches accesibles en founder mode",         blocking: true,  seed: true },
  { id: "sf-2", category: "SAFETY", label: "Safe reset no rompe app",                          blocking: true,  seed: true },
  { id: "sf-3", category: "SAFETY", label: "Sin PII en localStorage",                          blocking: false, seed: true },
];

// ---------------------------------------------------------------------------
// Events broadcast to keep React surfaces in sync
// ---------------------------------------------------------------------------
export const LAUNCH_EVENT = "kudos:launch:closure:change";
export const FOUNDER_PANEL_OPEN_EVENT = "kudos:launch:founder:open";
