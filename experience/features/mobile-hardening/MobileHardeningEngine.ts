"use client";

/**
 * KUDOS Experience · mobile-hardening/MobileHardeningEngine
 *
 * Central read/audit + scroll-lock surface for mobile hardening.
 *
 * Responsibilities:
 *   - Read current viewport / keyboard / safe-area snapshots
 *   - Body scroll lock primitive (acquire/release with counter)
 *   - Audits · tap targets / horizontal overflow / sticky collisions
 *   - Simulation helpers · founder-only fake states
 *   - Bus event NOTIFY · broadcasts MOBILE_EVENT after every mutation
 */
import {
  BODY_ATTR,
  CSS_VARS,
  DEFAULT_MOBILE_STATE,
  KEYBOARD_OPEN_THRESHOLD_PX,
  MOBILE_EVENT,
  MOBILE_PANEL_OPEN_EVENT,
  OVERFLOW_TOLERANCE_PX,
  STORAGE_KEYS,
  TAP_TARGET_MIN,
  type CheckSeverity,
  type DeviceClass,
  type KeyboardState,
  type MobileCheck,
  type MobileHardeningState,
  type SafeAreaInsets,
  type ViewportState,
} from "./mobileHardeningTypes";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function readState(): MobileHardeningState {
  if (typeof window === "undefined") return clone(DEFAULT_MOBILE_STATE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.state);
    if (!raw) return clone(DEFAULT_MOBILE_STATE);
    const parsed = JSON.parse(raw);
    return {
      scrollLockEvents: {
        acquired: typeof parsed.scrollLockEvents?.acquired === "number" ? parsed.scrollLockEvents.acquired : 0,
        released: typeof parsed.scrollLockEvents?.released === "number" ? parsed.scrollLockEvents.released : 0,
      },
      overflowEvents: typeof parsed.overflowEvents === "number" ? parsed.overflowEvents : 0,
      lastOverflowCulprit: typeof parsed.lastOverflowCulprit === "string" ? parsed.lastOverflowCulprit : null,
      lastDeviceClass: typeof parsed.lastDeviceClass === "string" ? parsed.lastDeviceClass : "unknown",
      keyboardEvents: typeof parsed.keyboardEvents === "number" ? parsed.keyboardEvents : 0,
    };
  } catch {
    return clone(DEFAULT_MOBILE_STATE);
  }
}

function writeState(s: MobileHardeningState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Device classification · iOS / Android / etc.
// ---------------------------------------------------------------------------
function detectDeviceClass(w: number, h: number, isIOS: boolean, isAndroid: boolean): DeviceClass {
  if (w === 0 || h === 0) return "unknown";
  const landscape = w > h && h < 500;
  if (landscape) return "landscape-phone";
  if (isIOS) {
    if (w < 376) return "iphone-narrow";
    if (w < 480) return "iphone-standard";
    return "tablet";
  }
  if (isAndroid) {
    if (w < 360) return "android-narrow";
    if (w < 480) return "android-medium";
    return "tablet";
  }
  if (w < 360) return "android-narrow";
  if (w < 480) return "android-medium";
  if (w < 900) return "tablet";
  return "desktop";
}

function isIOSish(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iOS 13+ reports MacIntel · check touchpoints
  return /iPhone|iPod|iPad/i.test(ua) || (ua.includes("Mac") && typeof (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints === "number" && ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1);
}

function isAndroidish(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function isStandaloneish(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const standaloneNav = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return !!standaloneNav || window.matchMedia?.("(display-mode: standalone)").matches === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public · read viewport
// ---------------------------------------------------------------------------
export function readViewportState(): ViewportState {
  if (typeof window === "undefined") {
    return {
      width: 0, height: 0,
      visualWidth: 0, visualHeight: 0,
      visualOffsetTop: 0, visualOffsetLeft: 0,
      orientation: "portrait",
      deviceClass: "unknown",
      devicePixelRatio: 1,
      isIOS: false, isAndroid: false, isStandalone: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const vv = window.visualViewport;
  const vw = vv?.width ?? w;
  const vh = vv?.height ?? h;
  const isIOS = isIOSish();
  const isAndroid = isAndroidish();
  return {
    width: w, height: h,
    visualWidth: vw, visualHeight: vh,
    visualOffsetTop: vv?.offsetTop ?? 0,
    visualOffsetLeft: vv?.offsetLeft ?? 0,
    orientation: w > h ? "landscape" : "portrait",
    deviceClass: detectDeviceClass(w, h, isIOS, isAndroid),
    devicePixelRatio: window.devicePixelRatio || 1,
    isIOS, isAndroid,
    isStandalone: isStandaloneish(),
  };
}

// ---------------------------------------------------------------------------
// Public · safe-area inset readback
// ---------------------------------------------------------------------------
export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.top = "0";
  probe.style.left = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingTop    = "env(safe-area-inset-top, 0px)";
  probe.style.paddingRight  = "env(safe-area-inset-right, 0px)";
  probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  probe.style.paddingLeft   = "env(safe-area-inset-left, 0px)";
  document.body.appendChild(probe);
  const cs = window.getComputedStyle(probe);
  const out: SafeAreaInsets = {
    top: parseFloat(cs.paddingTop || "0") || 0,
    right: parseFloat(cs.paddingRight || "0") || 0,
    bottom: parseFloat(cs.paddingBottom || "0") || 0,
    left: parseFloat(cs.paddingLeft || "0") || 0,
  };
  document.body.removeChild(probe);
  return out;
}

// ---------------------------------------------------------------------------
// Public · keyboard heuristic
// ---------------------------------------------------------------------------
export function readKeyboardState(viewport?: ViewportState): KeyboardState {
  if (typeof window === "undefined") return { open: false, height: 0, focusedInputTag: null };
  const v = viewport ?? readViewportState();
  // Heuristic: visualViewport is shorter than layout viewport by > threshold
  const delta = v.height - v.visualHeight;
  const open = delta > KEYBOARD_OPEN_THRESHOLD_PX;
  const focused = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;
  let tag: string | null = null;
  if (focused) {
    const t = focused.tagName?.toLowerCase();
    if (t === "input" || t === "textarea" || t === "select" || focused.isContentEditable) {
      tag = t || "contenteditable";
    }
  }
  return {
    open,
    height: open ? Math.max(0, Math.round(delta)) : 0,
    focusedInputTag: tag,
  };
}

// ---------------------------------------------------------------------------
// Scroll lock primitive · counter-based · resilient to nested users
// ---------------------------------------------------------------------------
let _scrollLockCount = 0;
let _scrollLockSavedY = 0;

export function acquireScrollLock(): void {
  // Kill-switch · KUDOS never globally locks scroll. No-op on purpose.
  if (typeof document === "undefined") return;
  _scrollLockCount += 1;
  try {
    const s = readState();
    s.scrollLockEvents.acquired += 1;
    writeState(s);
  } catch { /* ignore */ }
}

export function releaseScrollLock(): void {
  // Kill-switch · counterpart no-op. Counts maintained for telemetry only.
  if (typeof document === "undefined") return;
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  try {
    const s = readState();
    s.scrollLockEvents.released += 1;
    writeState(s);
  } catch { /* ignore */ }
}

export function readScrollLockCount(): number {
  return _scrollLockCount;
}

/** Force-release · used by founder safe-reset. Useful when a panel forgets
 *  to release on unmount. */
export function forceReleaseScrollLock(): void {
  _scrollLockCount = 0;
  if (typeof document !== "undefined") {
    const body = document.body;
    body.removeAttribute(BODY_ATTR.scrollLocked);
    delete body.dataset.kudosScrollLocked;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflow = "";
  }
}

// ---------------------------------------------------------------------------
// Audits
// ---------------------------------------------------------------------------
function mk(id: string, label: string, severity: CheckSeverity, detail: string, extras: Partial<MobileCheck> = {}): MobileCheck {
  return { id, label, severity, detail, ...extras };
}

export function auditTapTargets(): MobileCheck[] {
  if (typeof document === "undefined") return [];
  const interactive = Array.from(document.querySelectorAll<HTMLElement>("a, button, [role=button], input, textarea, select"));
  let small = 0;
  let invisible = 0;
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { invisible++; continue; }
    if ((r.width > 0 && r.width < TAP_TARGET_MIN) || (r.height > 0 && r.height < TAP_TARGET_MIN)) small++;
  }
  const ratio = interactive.length === 0 ? 0 : small / Math.max(1, interactive.length - invisible);
  const out: MobileCheck[] = [];
  if (small === 0) {
    out.push(mk("tap", `Tap targets ≥ ${TAP_TARGET_MIN}px`, "ok", `${interactive.length} elementos interactivos.`));
  } else {
    const sev: CheckSeverity = ratio > 0.30 ? "fail" : "warn";
    out.push(mk("tap", "Tap targets pequeños", sev, `${small} elementos < ${TAP_TARGET_MIN}px (${Math.round(ratio * 100)}%).`, { value: small, blocker: sev === "fail" }));
  }
  return out;
}

export function auditOverflow(): MobileCheck[] {
  if (typeof document === "undefined") return [];
  const docEl = document.documentElement;
  const overflow = docEl.scrollWidth - docEl.clientWidth;
  const out: MobileCheck[] = [];
  if (overflow <= OVERFLOW_TOLERANCE_PX) {
    out.push(mk("overflow-x", "Sin scroll horizontal", "ok", "El documento no excede el ancho del viewport."));
    return out;
  }
  // Find culprit · iterate children at depth ≤ 4 and find ones that exceed
  const limit = docEl.clientWidth + OVERFLOW_TOLERANCE_PX;
  let culprit: string | null = null;
  const queue: Array<{ el: Element; depth: number }> = [{ el: document.body, depth: 0 }];
  while (queue.length > 0) {
    const { el, depth } = queue.shift()!;
    if (depth > 4) continue;
    const r = el.getBoundingClientRect();
    if (r.right > limit) {
      culprit = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + (typeof (el as HTMLElement).className === "string" ? "." + (el as HTMLElement).className.split(" ").filter(Boolean).slice(0, 2).join(".") : "");
      // Try to find a deeper culprit
      for (const c of Array.from(el.children)) queue.push({ el: c, depth: depth + 1 });
    }
  }
  // Persist the culprit
  const state = readState();
  state.overflowEvents += 1;
  state.lastOverflowCulprit = culprit;
  writeState(state);
  out.push(mk("overflow-x", "Scroll horizontal detectado", "fail", `${overflow}px overflow · culprit ${culprit ?? "desconocido"}.`, { value: overflow, blocker: true }));
  return out;
}

export function auditStickyCollisions(): MobileCheck[] {
  if (typeof document === "undefined" || typeof window === "undefined") return [];
  // Find fixed/sticky elements that overlap the top 80px (header zone)
  const els = Array.from(document.querySelectorAll<HTMLElement>("*"));
  const sticky: HTMLElement[] = [];
  let scanned = 0;
  for (const el of els) {
    scanned++;
    if (scanned > 2000) break; // safety
    const cs = window.getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    const r = el.getBoundingClientRect();
    if (r.top < 80 && r.height > 0) sticky.push(el);
  }
  const out: MobileCheck[] = [];
  if (sticky.length <= 3) {
    out.push(mk("sticky", "Stack sticky en top", "ok", `${sticky.length} elementos sticky/fixed cerca del top.`));
  } else {
    const sev: CheckSeverity = sticky.length > 6 ? "fail" : "warn";
    out.push(mk("sticky", "Stack sticky alto", sev, `${sticky.length} elementos sticky/fixed compitiendo por el top.`, { value: sticky.length, blocker: sev === "fail" }));
  }
  return out;
}

export function runMobileAudit(): MobileCheck[] {
  return [
    ...auditTapTargets(),
    ...auditOverflow(),
    ...auditStickyCollisions(),
  ];
}

// ---------------------------------------------------------------------------
// Subscribe · debounced viewport / visualViewport / orientation listener
// ---------------------------------------------------------------------------
type Listener = () => void;

export function subscribeToViewport(listener: Listener): () => void {
  if (typeof window === "undefined") return () => undefined;
  let raf = 0;
  const cb = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => listener());
  };
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  window.visualViewport?.addEventListener("resize", cb);
  window.visualViewport?.addEventListener("scroll", cb);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
    window.visualViewport?.removeEventListener("resize", cb);
    window.visualViewport?.removeEventListener("scroll", cb);
  };
}

// ---------------------------------------------------------------------------
// Simulation · founder testing
// ---------------------------------------------------------------------------
let _simNotchActive = false;
let _simKeyboardActive = false;

export function simulateNotchDevice(active: boolean): void {
  if (typeof document === "undefined") return;
  _simNotchActive = active;
  const html = document.documentElement;
  if (active) {
    html.style.setProperty(CSS_VARS.safeTop, "44px");
    html.style.setProperty(CSS_VARS.safeBottom, "34px");
    html.dataset.kudosSimNotch = "1";
  } else {
    html.style.removeProperty(CSS_VARS.safeTop);
    html.style.removeProperty(CSS_VARS.safeBottom);
    delete html.dataset.kudosSimNotch;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
}

export function simulateKeyboardOpen(active: boolean, heightPx = 320): void {
  if (typeof document === "undefined") return;
  _simKeyboardActive = active;
  const html = document.documentElement;
  if (active) {
    html.style.setProperty(CSS_VARS.keyboard, `${heightPx}px`);
    html.dataset.kudosSimKeyboard = "1";
    document.body.setAttribute(BODY_ATTR.keyboardOpen, "1");
    const s = readState();
    s.keyboardEvents += 1;
    writeState(s);
  } else {
    html.style.setProperty(CSS_VARS.keyboard, "0px");
    delete html.dataset.kudosSimKeyboard;
    document.body.removeAttribute(BODY_ATTR.keyboardOpen);
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
}

export function isSimNotchActive(): boolean { return _simNotchActive; }
export function isSimKeyboardActive(): boolean { return _simKeyboardActive; }

export function simulateOverflow(active: boolean): void {
  if (typeof document === "undefined") return;
  const id = "kudos-sim-overflow";
  const existing = document.getElementById(id);
  if (active) {
    if (existing) return;
    const probe = document.createElement("div");
    probe.id = id;
    probe.style.position = "fixed";
    probe.style.top = "60px";
    probe.style.left = "20px";
    probe.style.width = "200vw";
    probe.style.height = "8px";
    probe.style.background = "rgba(248,113,113,0.4)";
    probe.style.zIndex = "8";
    probe.style.pointerEvents = "none";
    probe.title = "kudos simulated overflow";
    document.body.appendChild(probe);
  } else if (existing) {
    existing.remove();
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
}

export function simulateStickyCollision(active: boolean): void {
  if (typeof document === "undefined") return;
  const id = "kudos-sim-sticky";
  const existing = document.getElementById(id);
  if (active) {
    if (existing) return;
    const probe = document.createElement("div");
    probe.id = id;
    probe.style.position = "fixed";
    probe.style.top = "0";
    probe.style.left = "0";
    probe.style.right = "0";
    probe.style.height = "56px";
    probe.style.background = "rgba(251,191,36,0.25)";
    probe.style.border = "1px dashed rgba(251,191,36,0.55)";
    probe.style.zIndex = "39";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
  } else if (existing) {
    existing.remove();
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
}

// ---------------------------------------------------------------------------
// Safe reset · clears simulations + force-release scroll lock + clear LS
// ---------------------------------------------------------------------------
export function safeResetMobile(): void {
  simulateNotchDevice(false);
  simulateKeyboardOpen(false);
  simulateOverflow(false);
  simulateStickyCollision(false);
  forceReleaseScrollLock();
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(STORAGE_KEYS.state); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(MOBILE_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Read-only summary
// ---------------------------------------------------------------------------
export interface MobileHardeningSnapshot {
  viewport: ViewportState;
  safe: SafeAreaInsets;
  keyboard: KeyboardState;
  checks: MobileCheck[];
  state: MobileHardeningState;
}

export function readSnapshot(): MobileHardeningSnapshot {
  const viewport = readViewportState();
  return {
    viewport,
    safe: readSafeAreaInsets(),
    keyboard: readKeyboardState(viewport),
    checks: runMobileAudit(),
    state: readState(),
  };
}

export {
  MOBILE_EVENT,
  MOBILE_PANEL_OPEN_EVENT,
};
