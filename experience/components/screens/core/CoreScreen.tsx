"use client";
/**
 * KUDOS Core Screen · T3.2 EJEC Day 3.
 *
 * Pagina dedicada al consumo de un Humanity Core.
 *
 * Estructura:
 *   1. Header sutil "HUMANITY CORE · {pillar}"
 *   2. Titulo + hook
 *   3. Narrativa scrolleable (body_md)
 *   4. Pregunta "¿Te ha movido?" al final
 *   5. ResonancePicker si Si
 *   6. Discovery Shift Card al cerrar resonancia
 *
 * Tracking:
 *   - core_view_start al montar
 *   - core_scroll_depth al pasar 50%, 80%, 100%
 *   - core_completed al pulsar "Si me ha movido"
 *
 * Rate limit:
 *   - Se consulta /api/core/{id}/rate-limit-status al cargar
 *   - Si autenticado y consumido en <24h, muestra mensaje calmado
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { scheduleShiftRevisit } from "@/components/notifications/NotificationService";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface CorePayload {
  poi_id: string;
  pillar: string | null;
  is_today: boolean;
  narrative: {
    id: string;
    title: string | null;
    hook: string | null;
    body_md: string | null;
    duration_s: number | null;
    emotion: string | null;
    story_score: number | null;
  } | null;
  shift: {
    before: string;
    discovery: string;
    after: string;
    identity_from?: string | null;
    identity_to?: string | null;
    action_potential?: string | null;
    action_friction?: string;
  } | null;
  canonical_order: number;
}


interface RateLimitStatus {
  can_consume: boolean;
  next_available_at: string | null;
  seconds_until_next: number;
}


interface Props { poiId: string; }


export function CoreScreen({ poiId }: Props) {
  const router = useRouter();
  const [data, setData] = React.useState<CorePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rateLimit, setRateLimit] = React.useState<RateLimitStatus | null>(null);

  const [scrollPct, setScrollPct] = React.useState(0);
  const [resonanceOpen, setResonanceOpen] = React.useState(false);
  const [shiftVisible, setShiftVisible] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const sessionIdRef = React.useRef<string>("");
  const startTsRef = React.useRef<number>(0);

  // Inicializar session_id + cargar Core
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let sid = sessionStorage.getItem("kudos:session");
    if (!sid) {
      sid = "s-" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem("kudos:session", sid);
    }
    sessionIdRef.current = sid;
    startTsRef.current = Date.now();

    if (!API) {
      setError("API no configurada");
      setLoading(false);
      return;
    }

    // Cargar Core
    fetch(`${API}/api/core/${poiId}`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((j: CorePayload) => {
        setData(j);
        setLoading(false);
        // Disparar core_view_start
        void fetch(`${API}/api/core/${poiId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sid }),
          credentials: "include",
          keepalive: true,
        }).catch(() => {});
      })
      .catch((e) => {
        setError(String(e?.message || e));
        setLoading(false);
      });

    // Rate limit status (silencioso · solo si autenticado)
    fetch(`${API}/api/core/${poiId}/rate-limit-status`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((rl: RateLimitStatus | null) => { if (rl) setRateLimit(rl); })
      .catch(() => {});
  }, [poiId]);

  // Scroll depth tracking
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      const top = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const pct = Math.round((top / docH) * 100);
      setScrollPct((prev) => {
        if (pct > prev) return pct;
        return prev;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dispatch scroll milestones (50, 80, 100)
  const lastMilestoneRef = React.useRef(0);
  React.useEffect(() => {
    if (!API || !data) return;
    const milestones = [50, 80, 100];
    for (const m of milestones) {
      if (scrollPct >= m && lastMilestoneRef.current < m) {
        lastMilestoneRef.current = m;
        void fetch(`${API}/api/telemetry/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            event_type: "core_scroll_depth",
            poi_id: poiId,
            payload: { milestone: m, duration_s: Math.round((Date.now() - startTsRef.current) / 1000) },
          }),
          credentials: "include",
          keepalive: true,
        }).catch(() => {});
      }
    }
  }, [scrollPct, data, poiId]);

  const onYes = async () => {
    setResonanceOpen(true);
    setCompleted(true);
    // Dispatch core_completed
    if (API) {
      try {
        await fetch(`${API}/api/core/${poiId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            completion_pct: Math.max(scrollPct, 90),
            duration_s: Math.round((Date.now() - startTsRef.current) / 1000),
          }),
          credentials: "include",
        });
      } catch {}
    }
    // T3.2 Day 18 · Programar revisit T+7d (solo si notifs activadas)
    try {
      const title = data?.narrative?.title || poiId;
      scheduleShiftRevisit(poiId, title);
    } catch {}
  };

  const onNo = () => {
    // Dispatch core_partial · sin rate limit consumption
    if (API) {
      void fetch(`${API}/api/core/${poiId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          completion_pct: scrollPct,
          duration_s: Math.round((Date.now() - startTsRef.current) / 1000),
        }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
    router.push("/inicio");
  };

  if (loading) return <div style={LOADING}>Cargando...</div>;
  if (error || !data) return <div style={ERROR_BOX}>No pudimos cargar este Core. {error}</div>;

  // Rate limit calmo · si ya consumio uno hoy
  if (rateLimit && !rateLimit.can_consume) {
    const h = Math.floor(rateLimit.seconds_until_next / 3600);
    const m = Math.floor((rateLimit.seconds_until_next % 3600) / 60);
    return (
      <div style={ROOT}>
        <CoreHeader pillar={data.pillar} />
        <div style={RATE_LIMIT_BOX}>
          <h2 style={RATE_TXT}>Hoy ya has descubierto.</h2>
          <p style={RATE_TXT}>
            Un Core por dia. Sin prisa.<br />
            Vuelve en <strong>{h}h {m}m</strong>.
          </p>
          <button style={RATE_BACK} onClick={() => router.push("/inicio")}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div style={ROOT}>
      <CoreHeader pillar={data.pillar} />

      {/* Hero */}
      {data.narrative?.title && <h1 style={TITLE}>{data.narrative.title}</h1>}
      {data.narrative?.hook && <p style={HOOK}>{data.narrative.hook}</p>}

      {/* Narrativa */}
      {data.narrative?.body_md && (
        <article style={ARTICLE}>
          <NarrativeBody markdown={data.narrative.body_md} />
        </article>
      )}

      {/* Pregunta final */}
      {!resonanceOpen && (
        <section style={QUESTION_BOX}>
          <h3 style={QUESTION_TXT}>¿Te ha movido?</h3>
          <div style={QUESTION_ROW}>
            <button style={YES_BTN} onClick={onYes}>Si</button>
            <button style={NO_BTN} onClick={onNo}>Aun no se</button>
          </div>
        </section>
      )}

      {/* Resonance (mostrada tras yes) */}
      {resonanceOpen && !shiftVisible && (
        <ResonanceInline poiId={poiId} sessionId={sessionIdRef.current} onDone={() => setShiftVisible(true)} />
      )}

      {/* Discovery Shift Card */}
      {shiftVisible && data.shift && (
        <DiscoveryShiftCard
          shift={data.shift}
          poiId={poiId}
          poiTitle={data.narrative?.title || ""}
          onClose={() => router.push("/inicio")}
        />
      )}
    </div>
  );
}


// ===================== sub-componentes =====================

function CoreHeader({ pillar }: { pillar: string | null }) {
  return (
    <header style={HEADER}>
      <span style={CORE_TAG}>HUMANITY CORE</span>
      {pillar && <span style={PILLAR}>{pillar.toUpperCase()}</span>}
    </header>
  );
}


function NarrativeBody({ markdown }: { markdown: string }) {
  // Render minimal: split por blank lines · h titles en bold uppercase para los **BLOQUE**
  const blocks = markdown.split(/\n\n+/);
  return (
    <>
      {blocks.map((b, i) => {
        const trimmed = b.trim();
        if (/^\*\*[A-Z ]+\*\*$/.test(trimmed)) {
          const label = trimmed.replace(/\*\*/g, "");
          return <h4 key={i} style={BLOCK_LABEL}>{label}</h4>;
        }
        return <p key={i} style={BODY_P}>{trimmed.replace(/\*\*/g, "")}</p>;
      })}
    </>
  );
}


const RESONANCES = [
  { id: "asombro",     label: "Asombro",      color: "#C9A961" },
  { id: "aprendizaje", label: "Aprendizaje",  color: "#5A8BB8" },
  { id: "inspiracion", label: "Inspiracion",  color: "#A85858" },
  { id: "conexion",    label: "Conexion",     color: "#6BA888" },
  { id: "nostalgia",   label: "Nostalgia",    color: "#7A6BA8" },
];


function ResonanceInline({ poiId, sessionId, onDone }: { poiId: string; sessionId: string; onDone: () => void }) {
  const [picked, setPicked] = React.useState<string | null>(null);

  const handlePick = (rId: string) => {
    setPicked(rId);
    if (API) {
      void fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: "resonance",
          poi_id: poiId,
          payload: { type: rId },
        }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
    setTimeout(onDone, 600);
  };

  return (
    <section style={RES_BOX}>
      <h4 style={RES_TXT}>¿Que resono?</h4>
      <div style={RES_ROW}>
        {RESONANCES.map((r) => (
          <button
            key={r.id}
            style={{
              ...CHIP,
              background: picked === r.id ? r.color : "rgba(255,255,255,0.06)",
              color: picked === r.id ? "#fff" : "rgba(255,255,255,0.85)",
              borderColor: picked === r.id ? r.color : "rgba(255,255,255,0.12)",
            }}
            onClick={() => handlePick(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
    </section>
  );
}


function DiscoveryShiftCard({ shift, poiId, poiTitle, onClose }: {
  shift: { before: string; discovery: string; after: string; action_potential?: string | null };
  poiId: string;
  poiTitle: string;
  onClose: () => void;
}) {
  const openShareReflection = () => {
    if (typeof window === "undefined") return;
    const userName = (() => {
      try { return sessionStorage.getItem("kudos:userName") || "Tu"; }
      catch { return "Tu"; }
    })();
    window.dispatchEvent(new CustomEvent("kudos:share-reflection-v2:open", {
      detail: { poiId, poiName: poiTitle || poiId, userName, capsuleId: poiId },
    }));
  };

  return (
    <section style={SHIFT_BOX}>
      <div style={SHIFT_BLOCK}>
        <div style={SHIFT_LABEL}>ANTES</div>
        <p style={SHIFT_TEXT}>{shift.before}</p>
      </div>
      <div style={SHIFT_LINE} />
      <div style={SHIFT_BLOCK}>
        <div style={SHIFT_LABEL}>DESCUBRIMIENTO</div>
        <p style={SHIFT_TEXT}>{shift.discovery}</p>
      </div>
      <div style={SHIFT_LINE} />
      <div style={SHIFT_BLOCK}>
        <div style={SHIFT_LABEL}>AHORA PUEDES PENSAR</div>
        <p style={SHIFT_TEXT}>{shift.after}</p>
      </div>
      {shift.action_potential && (
        <div style={ACTION_BOX}>
          <p style={ACTION_TXT}>{shift.action_potential}</p>
        </div>
      )}
      <p style={SHIFT_FOOT}>Anotado. Volvemos a preguntarte en una semana.</p>

      <button style={SHARE_REFLECTION_BTN} onClick={openShareReflection}>
        Compartir con tu reflexion →
      </button>
      <button style={CLOSE_BTN} onClick={onClose}>Cerrar</button>
    </section>
  );
}


// ===================== styles =====================

const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  paddingTop: 24, paddingBottom: 110, color: "#fff",
  maxWidth: 720, margin: "0 auto",
};

const HEADER: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "0 24px 12px",
  fontSize: 10, letterSpacing: "0.22em", fontWeight: 600,
};
const CORE_TAG: React.CSSProperties = { color: "#C9A961" };
const PILLAR: React.CSSProperties = { color: "rgba(255,255,255,0.55)" };

const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 38, fontWeight: 600, lineHeight: 1.1,
  margin: "16px 24px 12px", letterSpacing: "-0.01em",
};
const HOOK: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22, fontStyle: "italic", lineHeight: 1.35,
  color: "rgba(255,255,255,0.85)",
  margin: "0 24px 32px",
};

const ARTICLE: React.CSSProperties = {
  padding: "0 24px 32px",
};
const BLOCK_LABEL: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.20em", color: "#C9A961",
  fontWeight: 600, marginTop: 22, marginBottom: 10,
};
const BODY_P: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 17, lineHeight: 1.65, color: "rgba(255,255,255,0.88)",
  margin: "0 0 18px",
};

const QUESTION_BOX: React.CSSProperties = {
  padding: "40px 24px 32px", textAlign: "center" as const,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const QUESTION_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22, fontStyle: "italic", margin: "0 0 22px",
  color: "rgba(255,255,255,0.92)",
};
const QUESTION_ROW: React.CSSProperties = {
  display: "flex", justifyContent: "center", gap: 14,
};
const YES_BTN: React.CSSProperties = {
  padding: "12px 32px", border: "none", borderRadius: 999,
  background: "#fff", color: "#1a1333",
  fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const NO_BTN: React.CSSProperties = {
  padding: "12px 22px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999,
  background: "transparent", color: "rgba(255,255,255,0.78)",
  fontSize: 13, cursor: "pointer",
};

const RES_BOX: React.CSSProperties = {
  padding: "24px", textAlign: "center" as const,
};
const RES_TXT: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.7)",
  marginBottom: 14,
};
const RES_ROW: React.CSSProperties = {
  display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center",
};
const CHIP: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 999,
  fontSize: 13, cursor: "pointer",
  borderWidth: 1, borderStyle: "solid",
  transition: "all 160ms",
};

const SHIFT_BOX: React.CSSProperties = {
  margin: "24px",
  padding: "28px 24px 24px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(201,169,97,0.18)",
  borderRadius: 16,
};
const SHIFT_BLOCK: React.CSSProperties = { padding: "8px 0" };
const SHIFT_LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em", color: "#C9A961",
  fontWeight: 600, marginBottom: 8,
};
const SHIFT_TEXT: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 17, lineHeight: 1.5,
  color: "rgba(255,255,255,0.92)", margin: 0,
};
const SHIFT_LINE: React.CSSProperties = {
  width: 1, height: 28, margin: "8px auto",
  background: "rgba(201,169,97,0.35)",
};
const ACTION_BOX: React.CSSProperties = {
  marginTop: 22, padding: "14px 16px",
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 12,
};
const ACTION_TXT: React.CSSProperties = {
  fontStyle: "italic", fontSize: 14, lineHeight: 1.5,
  color: "rgba(255,255,255,0.85)", margin: 0,
};
const SHIFT_FOOT: React.CSSProperties = {
  marginTop: 18, fontSize: 11, fontStyle: "italic",
  color: "rgba(255,255,255,0.42)", textAlign: "center" as const,
};
const CLOSE_BTN: React.CSSProperties = {
  display: "block", margin: "12px auto 0",
  padding: "8px 20px", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 999, background: "transparent",
  color: "rgba(255,255,255,0.75)", fontSize: 12, cursor: "pointer",
};
const SHARE_REFLECTION_BTN: React.CSSProperties = {
  display: "block", margin: "20px auto 0",
  padding: "11px 22px",
  background: "linear-gradient(135deg, #C9A961 0%, #b08d4b 100%)",
  color: "#0a0814", border: "none",
  borderRadius: 999, fontSize: 13, fontWeight: 700,
  letterSpacing: "0.04em", cursor: "pointer",
};

const LOADING: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)", padding: 60, textAlign: "center" as const,
};
const ERROR_BOX: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)", padding: 40, textAlign: "center" as const,
  fontSize: 14,
};
const RATE_LIMIT_BOX: React.CSSProperties = {
  margin: "40px 24px",
  padding: "28px 22px",
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.22)",
  borderRadius: 14,
  textAlign: "center" as const,
};
const RATE_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 16, fontStyle: "italic",
  color: "rgba(255,255,255,0.85)",
  margin: "0 0 18px",
};
const RATE_BACK: React.CSSProperties = {
  padding: "10px 22px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 999,
  color: "#fff", fontSize: 13,
  cursor: "pointer",
};
