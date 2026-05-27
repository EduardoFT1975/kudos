/**
 * KUDOS Experience · mobile-hardening/mobileHardeningTypes
 *
 * Pure data + constants. The mobile-hardening subsystem is responsible
 * for keeping KUDOS usable on real iPhones and Androids: safe-area,
 * dynamic viewport, keyboard avoidance, tap target hygiene, sticky
 * collision avoidance, body scroll-lock and Android-specific quirks.
 *
 * NO React, NO localStorage access here.
 */

// ---------------------------------------------------------------------------
// Viewport / device class
// ---------------------------------------------------------------------------
export type DeviceClass =
  | "iphone-narrow"     // 320–375 (SE / 12 mini / portrait)
  | "iphone-standard"   // 376–430 (12 / 13 / 14 / 15 pro)
  | "android-narrow"    // <360
  | "android-medium"    // 360–479
  | "tablet"            // 480–899
  | "desktop"           // ≥900
  | "landscape-phone"   // landscape and height < 500
  | "unknown";

export interface ViewportState {
  /** layout viewport (window.innerWidth/Height) */
  width: number;
  height: number;
  /** visual viewport · iOS Safari + Chrome */
  visualWidth: number;
  visualHeight: number;
  /** scroll offset of the visual viewport vs layout */
  visualOffsetTop: number;
  visualOffsetLeft: number;
  orientation: "portrait" | "landscape";
  deviceClass: DeviceClass;
  devicePixelRatio: number;
  /** quick browser flags · best-effort */
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface KeyboardState {
  open: boolean;
  /** Estimated keyboard height in CSS pixels (visualViewport delta). */
  height: number;
  /** Element currently focused, when it's an input/textarea/contenteditable. */
  focusedInputTag: string | null;
}

// ---------------------------------------------------------------------------
// Audit checks
// ---------------------------------------------------------------------------
export type CheckSeverity = "ok" | "warn" | "fail";

export interface MobileCheck {
  id: string;
  label: string;
  severity: CheckSeverity;
  detail: string;
  value?: number | string;
  blocker?: boolean;
}

// ---------------------------------------------------------------------------
// Persisted state (localStorage)
// ---------------------------------------------------------------------------
export interface MobileHardeningState {
  /** Number of times the body scroll lock was acquired / released. */
  scrollLockEvents: { acquired: number; released: number };
  /** Number of horizontal-overflow detections since boot. */
  overflowEvents: number;
  /** Most recent overflow culprit selector. */
  lastOverflowCulprit: string | null;
  /** Last detected viewport class · diagnostic. */
  lastDeviceClass: DeviceClass;
  /** Number of keyboard-open events. */
  keyboardEvents: number;
}

export const DEFAULT_MOBILE_STATE: MobileHardeningState = {
  scrollLockEvents: { acquired: 0, released: 0 },
  overflowEvents: 0,
  lastOverflowCulprit: null,
  lastDeviceClass: "unknown",
  keyboardEvents: 0,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  state: "kudos:mobile:hardening:state",
} as const;

/** CSS custom-property names · the provider/guard write these on the html
 *  element so any component can read them via var(--kudos-...) */
export const CSS_VARS = {
  vh:           "--kudos-vh",            // 1% of visual viewport height
  dvh:          "--kudos-dvh",           // 1% of dynamic visual viewport height (with kb)
  vh100:        "--kudos-vh-100",        // full visual viewport height
  safeTop:      "--kudos-safe-top",
  safeRight:    "--kudos-safe-right",
  safeBottom:   "--kudos-safe-bottom",
  safeLeft:     "--kudos-safe-left",
  keyboard:     "--kudos-keyboard-h",
  shellTop:     "--kudos-shell-top",     // header height + safe-top
  shellBottom:  "--kudos-shell-bottom",  // safe-bottom (footer pad)
} as const;

/** Tap target minimums · iPhone HIG = 44, Android = 48 · we converge at 44 */
export const TAP_TARGET_MIN_IOS = 44;
export const TAP_TARGET_MIN_ANDROID = 48;
export const TAP_TARGET_MIN = 44;

/** Keyboard open heuristic threshold · visualViewport delta. */
export const KEYBOARD_OPEN_THRESHOLD_PX = 120;

/** Horizontal overflow detection tolerance. */
export const OVERFLOW_TOLERANCE_PX = 2;

/** DOM events broadcast across the app. */
export const MOBILE_EVENT = "kudos:mobile:hardening:change";
export const MOBILE_PANEL_OPEN_EVENT = "kudos:mobile:hardening:open";

/** body data attributes used by MobileShellFixes + scroll-lock helpers */
export const BODY_ATTR = {
  scrollLocked:   "data-kudos-scroll-locked",
  keyboardOpen:   "data-kudos-keyboard-open",
  deviceClass:    "data-kudos-device-class",
  orientation:    "data-kudos-orientation",
} as const;

export const DEVICE_LABEL: Readonly<Record<DeviceClass, string>> = {
  "iphone-narrow":   "iPhone narrow",
  "iphone-standard": "iPhone standard",
  "android-narrow":  "Android narrow",
  "android-medium":  "Android medium",
  "tablet":          "Tablet",
  "desktop":         "Desktop",
  "landscape-phone": "Phone landscape",
  "unknown":         "Desconocido",
};
