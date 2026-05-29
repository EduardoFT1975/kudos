"use client";
/**
 * KUDOS · ShiftHistory · T3.2 EJEC Day 16.
 *
 * Lista revisitable de Discovery Shifts vividos por el usuario.
 * Cada item muestra el shift completo (Before/Discovery/After), pilar,
 * cuantas veces ha revisitado y cuando fue la ultima vez.
 *
 * SIN gamificacion. SIN streaks. Solo un mapa de cambios cognitivos.
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface ShiftLived {
  poi_id: string;
  pillar: string;
  tier: string;
  before_statement: string;
  discovery_revealed: string;
  after_statement: string;
  identity_shift_to: string | null;
  first_lived_at: string;
  last_revisited_at: string;
  revisit_count: number;
}

interface ShiftHistoryData {
  user_authenticated: boolean;
  total_shifts_lived: number;
  shifts: ShiftLived[];
  contextual_message: string;
}


const PILLAR_COLOR: Record<string, string> = {
  origen:       "#C9A961",
  significado:  "#8B6BFF",
  belleza:      "#E0815A",
  creencia:     "#5A8BB8",
  conocimiento: "#7BB87B",
  exploracion:  "#B87B7B",
  memoria:      "#8B8B8B",
};


function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  const diffD = Math.floor(diffHr / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `hace ${diffW}sem`;
  const diffMo = Math.floor(diffD / 30);
  return `hace ${diffMo}m`;
}


export function ShiftHistory() {
  const [data, setData] = React.useState<ShiftHistoryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || !API) {
      setLoading(false);
      return;
    }
    const sid = sessionStorage.getItem("kudos:session") || "";
    fetch(`${API}/api/personal/shifts`, {
      headers: sid ? { "X-Session-Id": sid } : {},
      credentials: "include",
    })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j) setData(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <section style={WRAP}><p style={EMPTY}>Cargando tus shifts...</p></section>;
  }

  if (!data || data.total_shifts_lived === 0) {
    return (
      <section style={WRAP}>
        <header style={HEAD}>
          <span style={LABEL}>TUS DISCOVERY SHIFTS</span>
          <h2 style={TITLE}>Lo que cambio en ti.</h2>
        </header>
        <p style={EMPTY}>
          {data?.contextual_message || "Aun no has vivido ningun Discovery Shift."}
        </p>
      </section>
    );
  }

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={LABEL}>TUS DISCOVERY SHIFTS</span>
        <h2 style={TITLE}>Lo que cambio en ti.</h2>
        <p style={CONTEXTUAL}>{data.contextual_message}</p>
      </header>

      <div style={LIST}>
        {data.shifts.map((s) => {
          const isExpanded = expanded === s.poi_id;
          const color = PILLAR_COLOR[s.pillar] || "#8B6BFF";
          return (
            <article
              key={s.poi_id}
              style={{ ...ITEM, borderLeftColor: color }}
              onClick={() => setExpanded(isExpanded ? null : s.poi_id)}
            >
              <header style={ITEM_HEAD}>
                <span style={{ ...PILLAR_TAG, color }}>{s.pillar.toUpperCase()}</span>
                <span style={TIER_TAG}>{s.tier === "core" ? "HUMANITY CORE" : s.tier.toUpperCase()}</span>
                <span style={WHEN}>{timeAgo(s.last_revisited_at)}</span>
              </header>

              <p style={SHIFT_LINE}>
                <strong style={BEFORE}>{s.before_statement}</strong>
              </p>
              <p style={ARROW}>↓</p>
              <p style={SHIFT_LINE}>
                <em style={AFTER}>{s.after_statement}</em>
              </p>

              {isExpanded && (
                <div style={EXPANDED}>
                  <p style={DISCOVERY}>{s.discovery_revealed}</p>
                  {s.identity_shift_to && (
                    <p style={IDENTITY}>
                      <span style={IDENTITY_LABEL}>QUIEN ERES AHORA</span>
                      <br />
                      {s.identity_shift_to}
                    </p>
                  )}
                  <footer style={FOOTER}>
                    <span style={REVISIT}>
                      {s.revisit_count > 1
                        ? `Has vuelto a este shift ${s.revisit_count} veces`
                        : "Primera vez"}
                    </span>
                    <a href={`/core/${s.poi_id}`} style={REVISIT_LINK}>Revisitar →</a>
                  </footer>
                </div>
              )}

              {!isExpanded && (
                <div style={COLLAPSED_HINT}>
                  <span>Toca para ver lo que descubriste · {s.revisit_count > 1 ? `${s.revisit_count}x` : "1x"}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}


// =================== styles ===================

const WRAP: React.CSSProperties = {
  padding: "28px 16px 16px",
};
const HEAD: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: 22,
};
const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em",
  color: "rgba(201,169,97,0.85)", fontWeight: 600,
  display: "block", marginBottom: 6,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22, fontWeight: 500,
  color: "rgba(255,255,255,0.92)", margin: 0,
  letterSpacing: "-0.005em",
};
const CONTEXTUAL: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, fontStyle: "italic",
  color: "rgba(255,255,255,0.6)",
  margin: "8px 0 0",
};
const EMPTY: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, fontStyle: "italic",
  color: "rgba(255,255,255,0.5)",
  textAlign: "center" as const,
  padding: "40px 20px",
  margin: 0,
};
const LIST: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 14,
  maxWidth: 640, margin: "0 auto",
};
const ITEM: React.CSSProperties = {
  padding: "16px 18px",
  background: "rgba(15,10,31,0.55)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderLeftWidth: 3, borderLeftStyle: "solid",
  borderRadius: 12,
  cursor: "pointer",
  transition: "background 200ms ease",
};
const ITEM_HEAD: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  marginBottom: 10,
};
const PILLAR_TAG: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.18em", fontWeight: 700,
};
const TIER_TAG: React.CSSProperties = {
  fontSize: 8, letterSpacing: "0.15em",
  color: "rgba(255,255,255,0.4)",
  padding: "2px 6px",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 4,
};
const WHEN: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 10, color: "rgba(255,255,255,0.4)",
};
const SHIFT_LINE: React.CSSProperties = {
  margin: "4px 0",
  fontSize: 14, lineHeight: 1.5,
  color: "rgba(255,255,255,0.88)",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
};
const BEFORE: React.CSSProperties = {
  fontWeight: 500,
  color: "rgba(255,255,255,0.65)",
};
const AFTER: React.CSSProperties = {
  fontStyle: "italic",
  color: "rgba(255,255,255,0.95)",
};
const ARROW: React.CSSProperties = {
  margin: "6px 0",
  fontSize: 14,
  color: "rgba(201,169,97,0.7)",
  textAlign: "center" as const,
};
const COLLAPSED_HINT: React.CSSProperties = {
  marginTop: 10,
  fontSize: 10, color: "rgba(255,255,255,0.35)",
  letterSpacing: "0.04em",
};
const EXPANDED: React.CSSProperties = {
  marginTop: 16,
  paddingTop: 14,
  borderTop: "1px solid rgba(255,255,255,0.07)",
};
const DISCOVERY: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, lineHeight: 1.55,
  color: "rgba(255,255,255,0.78)",
  margin: 0,
};
const IDENTITY: React.CSSProperties = {
  margin: "14px 0 0",
  padding: "10px 12px",
  background: "rgba(201,169,97,0.08)",
  borderLeft: "2px solid rgba(201,169,97,0.5)",
  borderRadius: 4,
  fontSize: 13, lineHeight: 1.5,
  color: "rgba(255,255,255,0.85)",
};
const IDENTITY_LABEL: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.18em",
  color: "rgba(201,169,97,0.85)", fontWeight: 700,
};
const FOOTER: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginTop: 14,
  fontSize: 11,
};
const REVISIT: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
};
const REVISIT_LINK: React.CSSProperties = {
  color: "#C9A961",
  textDecoration: "none",
  fontWeight: 500,
};
