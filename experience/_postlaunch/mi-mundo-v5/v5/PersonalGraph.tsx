"use client";
/**
 * KUDOS · PersonalGraph · T3.2 EJEC Day 15.
 *
 * Constelacion radial SVG con 7 nodos (pilares humanos).
 * Cada nodo tiene 4 estados visuales:
 *   - off       (sin exposicion)
 *   - tenue     (1 Core)
 *   - medio     (2 Cores)
 *   - brillante (3+ Cores con TS_real alto)
 *
 * Lee /api/personal/graph (auth o anon via session_id).
 * Frase contextual debajo segun progreso.
 *
 * SIN gamificacion. SIN XP. SIN niveles. Solo luminosidad.
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface PillarNode {
  pillar: string;
  core_completed_count: number;
  last_exposure_at: string | null;
  luminosity: "off" | "tenue" | "medio" | "brillante";
}

interface PersonalGraphData {
  user_authenticated: boolean;
  pillars: PillarNode[];
  total_cores_completed: number;
  discovery_dna_unlocked: boolean;
  discovery_dna_requirements_met: Record<string, boolean>;
  contextual_message: string;
}


// Mapeo pilar -> emoji + label corto
const PILLAR_META: Record<string, { label: string; symbol: string }> = {
  origen:        { label: "Origen",        symbol: "·" },
  significado:   { label: "Significado",   symbol: "·" },
  belleza:       { label: "Belleza",       symbol: "·" },
  creencia:      { label: "Creencia",      symbol: "·" },
  conocimiento:  { label: "Conocimiento",  symbol: "·" },
  exploracion:   { label: "Exploracion",   symbol: "·" },
  memoria:       { label: "Memoria",       symbol: "·" },
};


// 7 posiciones radiales (heptagono) · centro (0,0)
const HEPTAGON_ANGLES = [-90, -38.57, 12.86, 64.29, 115.72, 167.14, 218.57]; // grados
const RADIUS = 110;


function nodePosition(idx: number): { x: number; y: number } {
  const angle = HEPTAGON_ANGLES[idx] * Math.PI / 180;
  return {
    x: Math.cos(angle) * RADIUS,
    y: Math.sin(angle) * RADIUS,
  };
}


function nodeStyle(luminosity: PillarNode["luminosity"]): { fill: string; r: number; opacity: number } {
  switch (luminosity) {
    case "brillante": return { fill: "#C9A961", r: 14, opacity: 1.0 };
    case "medio":     return { fill: "#8B6BFF", r: 11, opacity: 0.85 };
    case "tenue":     return { fill: "#5A8BB8", r: 9,  opacity: 0.65 };
    default:          return { fill: "#3a3550", r: 7,  opacity: 0.4 };
  }
}


export function PersonalGraph() {
  const [data, setData] = React.useState<PersonalGraphData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined" || !API) {
      setLoading(false);
      return;
    }
    const sid = sessionStorage.getItem("kudos:session") || "";
    fetch(`${API}/api/personal/graph`, {
      headers: sid ? { "X-Session-Id": sid } : {},
      credentials: "include",
    })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (j) setData(j);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <section style={WRAP}><p style={EMPTY}>Cargando tu mapa cognitivo...</p></section>;
  }

  if (!data) {
    return (
      <section style={WRAP}>
        <p style={EMPTY}>Tu mapa cognitivo aparecera aqui cuando descubras tu primer Core.</p>
      </section>
    );
  }

  return (
    <section style={WRAP}>
      <header style={HEAD}>
        <span style={LABEL}>TU MAPA COGNITIVO</span>
        <h2 style={TITLE}>Quien estas explorando.</h2>
      </header>

      <div style={GRAPH_BOX}>
        <svg viewBox="-160 -160 320 320" style={SVG}>
          {/* Lineas suaves entre centro y cada nodo */}
          {data.pillars.map((p, i) => {
            const pos = nodePosition(i);
            const isActive = p.luminosity !== "off";
            return (
              <line
                key={`line-${p.pillar}`}
                x1={0} y1={0} x2={pos.x} y2={pos.y}
                stroke={isActive ? "rgba(201,169,97,0.25)" : "rgba(255,255,255,0.04)"}
                strokeWidth={isActive ? 0.5 : 0.3}
              />
            );
          })}

          {/* Centro · el usuario */}
          <circle cx={0} cy={0} r={5} fill="rgba(255,255,255,0.9)" />
          <text x={0} y={26} textAnchor="middle"
                fontSize="9" fill="rgba(255,255,255,0.5)"
                style={{ letterSpacing: "0.1em" }}>
            TU
          </text>

          {/* 7 nodos pilares */}
          {data.pillars.map((p, i) => {
            const pos = nodePosition(i);
            const s = nodeStyle(p.luminosity);
            const label = PILLAR_META[p.pillar]?.label || p.pillar;
            const labelOffset = (pos.y < -20) ? -24 : (pos.y > 20) ? 30 : 4;
            const labelAnchor = (pos.x < -20) ? "end" : (pos.x > 20) ? "start" : "middle";
            return (
              <g key={p.pillar}>
                {/* glow halo */}
                {p.luminosity !== "off" && (
                  <circle cx={pos.x} cy={pos.y} r={s.r + 6}
                          fill={s.fill} opacity={0.15} />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={s.r}
                  fill={s.fill}
                  opacity={s.opacity}
                />
                <text
                  x={pos.x + (labelAnchor === "end" ? -10 : labelAnchor === "start" ? 10 : 0)}
                  y={pos.y + labelOffset}
                  textAnchor={labelAnchor}
                  fontSize="10"
                  fill={p.luminosity === "off" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)"}
                  style={{ letterSpacing: "0.05em" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p style={CONTEXTUAL}>{data.contextual_message}</p>

      {data.discovery_dna_unlocked && (
        <div style={DNA_BOX}>
          <div style={DNA_LABEL}>DISCOVERY DNA</div>
          <p style={DNA_TXT}>
            Has empezado a construir tu Discovery DNA.<br />
            No es un logro. Es una constatacion.
          </p>
        </div>
      )}

      {!data.discovery_dna_unlocked && data.total_cores_completed > 0 && (
        <details style={DNA_PROGRESS}>
          <summary style={DNA_SUMMARY}>Discovery DNA · progreso</summary>
          <ul style={DNA_LIST}>
            {Object.entries(data.discovery_dna_requirements_met).map(([k, v]) => (
              <li key={k} style={{ ...DNA_ITEM, opacity: v ? 1 : 0.45 }}>
                {v ? "✓" : "·"} {k.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}


// =================== styles ===================

const WRAP: React.CSSProperties = {
  padding: "28px 16px 16px",
};
const HEAD: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: 18,
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
const GRAPH_BOX: React.CSSProperties = {
  display: "flex", justifyContent: "center",
  padding: "20px 0",
};
const SVG: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  height: "auto",
};
const CONTEXTUAL: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 15, fontStyle: "italic",
  color: "rgba(255,255,255,0.7)",
  textAlign: "center" as const,
  margin: "16px 0 0",
  lineHeight: 1.45,
};
const EMPTY: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, fontStyle: "italic",
  color: "rgba(255,255,255,0.4)",
  textAlign: "center" as const,
  padding: "40px 20px",
  margin: 0,
};
const DNA_BOX: React.CSSProperties = {
  margin: "20px auto 0",
  maxWidth: 480,
  padding: "16px 18px",
  background: "rgba(201,169,97,0.10)",
  border: "1px solid rgba(201,169,97,0.35)",
  borderRadius: 14,
  textAlign: "center" as const,
};
const DNA_LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em",
  color: "#C9A961", fontWeight: 700, marginBottom: 8,
};
const DNA_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, fontStyle: "italic",
  color: "rgba(255,255,255,0.85)",
  margin: 0, lineHeight: 1.55,
};
const DNA_PROGRESS: React.CSSProperties = {
  margin: "16px auto 0",
  maxWidth: 480,
  padding: "10px 16px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
};
const DNA_SUMMARY: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  letterSpacing: "0.06em",
};
const DNA_LIST: React.CSSProperties = {
  listStyle: "none", padding: 0, margin: "10px 0 0",
};
const DNA_ITEM: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.75)",
  padding: "4px 0",
};
