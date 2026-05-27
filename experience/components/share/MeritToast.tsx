"use client";

/**
 * KUDOS . MeritToast . Global lightweight merit feedback.
 *
 * Listens to window event "kudos:merit:change" (dispatched by store on
 * every addMeritEvent) and shows a small floating pill bottom-right with
 * the latest merit gain. Auto-dismisses after 2.6s. Queue-aware (chains
 * rapid events). Mounted globally by AppShellV4 alongside GlobalShareModal.
 *
 * Visual: small pill with gradient accent dot + "+N merito" + brief label.
 * Slides in from bottom-right, fades out.
 */
import * as React from "react";
import { Icon, type IconName } from "@/design-system/v2";
import { readMeritEvents, type MeritEvent, type MeritPillar } from "@/lib/kudos/store";

interface ToastEvent { id: string; points: number; label: string; pillar: MeritPillar; }

const PILLAR_META: Record<MeritPillar, { icon: IconName; color: string }> = {
  creacion:       { icon: "studio",  color: "#8B6BFF" },
  inspiracion:    { icon: "heart",   color: "#34D399" },
  descubrimiento: { icon: "search",  color: "#FF9A00" },
  comunidad:      { icon: "people",  color: "#38BDF8" },
  integridad:     { icon: "founder", color: "#FF3CAC" },
};

export function MeritToast() {
  const [active, setActive] = React.useState<ToastEvent | null>(null);
  const lastSeenIdRef = React.useRef<string | null>(null);
  const dismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Initialise lastSeen with most-recent existing event so we do not toast on mount
    const initial = readMeritEvents();
    if (initial.length > 0) {
      lastSeenIdRef.current = initial[initial.length - 1].id;
    }

    const onChange = () => {
      const events = readMeritEvents();
      if (events.length === 0) return;
      const latest = events[events.length - 1] as MeritEvent;
      if (latest.id === lastSeenIdRef.current) return;
      lastSeenIdRef.current = latest.id;
      setActive({
        id: latest.id,
        points: latest.points,
        label: latest.label,
        pillar: latest.pillar,
      });
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setActive(null), 2600);
    };

    window.addEventListener("kudos:merit:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kudos:merit:change", onChange);
      window.removeEventListener("storage", onChange);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!active) return null;
  const meta = PILLAR_META[active.pillar];

  return (
    <div role="status" aria-live="polite" style={WRAP}>
      <div style={TOAST} className="kudos-merit-toast">
        <span style={{ ...DOT, background: `${meta.color}` }}>
          <Icon name={meta.icon} size={14} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={POINTS_LINE}>
            <span style={{ ...POINTS_VALUE, color: meta.color }}>+{active.points}</span>
            <span style={POINTS_LABEL}>m&eacute;rito ganado</span>
          </span>
          <span style={EVENT_LABEL}>{truncate(active.label, 40)}</span>
        </div>
      </div>
      <style>{`
        @keyframes kudos-merit-toast-in {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        .kudos-merit-toast {
          animation: kudos-merit-toast-in 280ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }
      `}</style>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "..." : s;
}

const WRAP: React.CSSProperties = {
  position: "fixed",
  bottom: "calc(var(--app-bottomnav-h, 72px) + var(--kudos-safe-bottom, 0px) + 18px)",
  right: 18,
  zIndex: 90,
  pointerEvents: "none",
};

const TOAST: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px 10px 12px",
  borderRadius: 14,
  background: "rgba(13, 8, 32, 0.96)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 18px 36px -12px rgba(0,0,0,0.55), 0 0 24px -8px rgba(108,60,255,0.32)",
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)",
  pointerEvents: "auto",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  maxWidth: "min(360px, calc(100vw - 36px))",
};

const DOT: React.CSSProperties = {
  width: 30, height: 30,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0A0612",
  flexShrink: 0,
};

const POINTS_LINE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
};

const POINTS_VALUE: React.CSSProperties = {
  fontFamily: "var(--kudos-font-display)",
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const POINTS_LABEL: React.CSSProperties = {
  fontSize: 11.5,
  color: "rgba(242,242,247,0.78)",
  fontWeight: 500,
};

const EVENT_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  color: "rgba(242,242,247,0.55)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 260,
};
