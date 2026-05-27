"use client";

/**
 * KUDOS Experience · launch-closure/FatalRecoveryLayer (Block 10 · final)
 *
 * Global error boundary + premium recovery surface.
 *
 * Catches:
 *   - React render failures (componentDidCatch)
 *   - Bad persisted payloads · validateLocalStorage() runs once on mount,
 *     trips into recovery mode if any kudos:* key has invalid JSON
 *   - Programmatic simulate-fatal (via simulateFatal())
 *
 * Recovery actions:
 *   - Retry · clears the error state and re-renders children
 *   - Safe reset · removes kudos:launch:* keys only (preserves data)
 *   - Clear all KUDOS state · safeAppReset() · wipes every kudos:* key
 *   - Founder diagnostics · opens FounderLaunchPanel via window event
 *
 * Logs every fatal via logFatal() so the founder panel surface can show it.
 */
import * as React from "react";
import { FOUNDER_PANEL_OPEN_EVENT } from "./launchTypes";
import {
  logFatal,
  markFatalRecovered,
  resetLaunchState,
  safeAppReset,
} from "./LaunchEngine";

interface FatalRecoveryLayerProps {
  children: React.ReactNode;
}

interface FatalRecoveryLayerState {
  error: { message: string; stack?: string; origin: string; id?: string } | null;
  payloadCorrupted: boolean;
  corruptedKeys: string[];
}

// ---------------------------------------------------------------------------
// Singleton sim handle · enables FounderLaunchPanel to trigger a fake fatal
// ---------------------------------------------------------------------------
type SimHandler = (origin: string) => void;
let _simHandler: SimHandler | null = null;

export function simulateFatal(origin = "founder:simulate"): void {
  if (_simHandler) _simHandler(origin);
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------
export class FatalRecoveryLayer extends React.Component<
  FatalRecoveryLayerProps,
  FatalRecoveryLayerState
> {
  constructor(props: FatalRecoveryLayerProps) {
    super(props);
    this.state = { error: null, payloadCorrupted: false, corruptedKeys: [] };
  }

  static getDerivedStateFromError(error: Error): Partial<FatalRecoveryLayerState> {
    return {
      error: {
        message: error.message || "Error desconocido",
        stack: error.stack,
        origin: "render-boundary",
      },
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    try {
      const entry = logFatal({
        message: error.message || "Error desconocido",
        stack: (error.stack ?? "") + "\n--- componentStack ---" + (info.componentStack ?? ""),
        origin: "render-boundary",
      });
      this.setState((s) => ({
        error: s.error ? { ...s.error, id: entry.id } : s.error,
      }));
    } catch {
      /* logging itself must never throw */
    }
  }

  componentDidMount(): void {
    _simHandler = (origin: string) => {
      const entry = logFatal({
        message: "Simulated fatal (founder test)",
        origin,
      });
      this.setState({
        error: {
          message: "Simulated fatal (founder test)",
          origin,
          id: entry.id,
        },
      });
    };
    // Run a payload health pass · catches stale/corrupted local storage
    const corrupted = this.validateLocalStorage();
    if (corrupted.length > 0) {
      this.setState({ payloadCorrupted: true, corruptedKeys: corrupted });
    }
  }

  componentWillUnmount(): void {
    _simHandler = null;
  }

  validateLocalStorage(): string[] {
    if (typeof window === "undefined") return [];
    const bad: string[] = [];
    try {
      const ls = window.localStorage;
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (!k || !k.startsWith("kudos:")) continue;
        const raw = ls.getItem(k);
        if (raw == null) continue;
        try {
          JSON.parse(raw);
        } catch {
          bad.push(k);
        }
      }
    } catch {
      /* ignore */
    }
    return bad;
  }

  // -------------------------------------------------------------------------
  // Recovery actions
  // -------------------------------------------------------------------------
  retry = () => {
    const { error } = this.state;
    if (error?.id) markFatalRecovered(error.id);
    this.setState({ error: null, payloadCorrupted: false, corruptedKeys: [] });
  };

  safeResetLaunch = () => {
    resetLaunchState();
    this.retry();
  };

  hardResetAll = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("¿Borrar TODO el estado local de KUDOS? Esto es destructivo.");
    if (!ok) return;
    safeAppReset();
    // Force soft reload to reseed everything cleanly
    try {
      window.location.reload();
    } catch {
      this.retry();
    }
  };

  openFounderPanel = () => {
    if (typeof window === "undefined") return;
    try {
      window.dispatchEvent(new CustomEvent(FOUNDER_PANEL_OPEN_EVENT));
    } catch {
      /* ignore */
    }
  };

  clearCorruptedKeys = () => {
    if (typeof window === "undefined") return;
    try {
      for (const k of this.state.corruptedKeys) {
        window.localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
    this.setState({ payloadCorrupted: false, corruptedKeys: [] });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  render(): React.ReactNode {
    const { error, payloadCorrupted, corruptedKeys } = this.state;

    // Payload health warning · non-fatal · banner over children
    if (!error && payloadCorrupted) {
      return (
        <>
          <div
            role="alert"
            style={{
              position: "fixed",
              top: 64,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 70,
              maxWidth: 520,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.45)",
              color: "rgba(255,255,255,0.92)",
              boxShadow: "0 14px 28px rgba(0,0,0,0.4)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: "#f87171" }}>!</span>
            <span style={{ flex: 1 }}>
              {corruptedKeys.length} clave(s) localStorage corruptas detectadas.
            </span>
            <button
              type="button"
              onClick={this.clearCorruptedKeys}
              style={pillStyle()}
            >
              Limpiar
            </button>
          </div>
          {this.props.children}
        </>
      );
    }

    if (!error) return this.props.children;

    // Fatal recovery UI · full-screen overlay
    return (
      <div
        role="alertdialog"
        aria-label="Recuperación de error"
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(180deg, #050310, #0a0612)",
          color: "rgba(255,255,255,0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <section
          style={{
            maxWidth: 480,
            width: "100%",
            background: "rgba(8,6,16,0.94)",
            border: "1px solid rgba(167,139,250,0.32)",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 28px 56px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#f87171",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 12,
              fontFamily: "var(--kudos-font-mono, monospace)",
            }}
          >
            Error · recuperación segura
          </div>
          <h1
            style={{
              fontFamily: "var(--kudos-font-display, serif)",
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.25,
              margin: 0,
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }}
          >
            Algo se rompió. Está contenido.
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.55,
              margin: 0,
              marginBottom: 14,
            }}
          >
            Tu sesión sigue intacta. Puedes reintentar; si persiste, hacer un reset seguro
            del estado local o un wipe total. Nada se envía a ningún servidor.
          </p>
          <details
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.6)",
              padding: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontFamily: "var(--kudos-font-mono, monospace)",
                color: "rgba(255,255,255,0.78)",
              }}
            >
              Detalles técnicos
            </summary>
            <div style={{ marginTop: 8, fontFamily: "var(--kudos-font-mono, monospace)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              <div>origen: {error.origin}</div>
              <div>mensaje: {error.message}</div>
              {error.stack ? <div style={{ marginTop: 6, opacity: 0.7 }}>{error.stack.slice(0, 800)}</div> : null}
            </div>
          </details>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" onClick={this.retry} style={primaryBtn()}>Reintentar</button>
            <button type="button" onClick={this.safeResetLaunch} style={ghostBtn()}>Reset seguro</button>
            <button type="button" onClick={this.hardResetAll} style={dangerBtn()}>Borrar todo</button>
            <button type="button" onClick={this.openFounderPanel} style={ghostBtn()}>Founder diagnostics</button>
          </div>
        </section>
      </div>
    );
  }
}

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------
function basePill(): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
    letterSpacing: "0.04em",
  };
}
function primaryBtn(): React.CSSProperties {
  return {
    ...basePill(),
    background: "rgba(167,139,250,0.18)",
    border: "1px solid rgba(167,139,250,0.55)",
    color: "rgba(255,255,255,0.95)",
  };
}
function ghostBtn(): React.CSSProperties {
  return {
    ...basePill(),
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.85)",
  };
}
function dangerBtn(): React.CSSProperties {
  return {
    ...basePill(),
    background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.45)",
    color: "rgba(248,113,113,0.95)",
  };
}
function pillStyle(): React.CSSProperties {
  return {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: "inherit",
  };
}
