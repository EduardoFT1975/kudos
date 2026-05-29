"use client";
/**
 * KUDOS Admin Dashboard · T3.2 EJEC Day 10.
 *
 * Las 5 metricas core del MVP en 3 ventanas (24h, 7d, 30d).
 * Token X-Admin-Token se pide al usuario y se guarda en localStorage.
 *
 * Lectura simple. Render minimal. Sin librerias de charting.
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface WindowMetrics {
  window_hours: number;
  since: string;
  core_plays: number;
  core_completes: number;
  completion_rate_pct: number;
  resonance_rate_pct: number;
  reflection_rate_pct: number;
  return_visit_rate_pct: number;
  dti_preliminary_pct: number;
}

interface Targets {
  minimum_viable: number;
  good: number;
  excellent: number;
}

interface MetricsResponse {
  now: string;
  windows: { "24h": WindowMetrics; "7d": WindowMetrics; "30d": WindowMetrics };
  targets: Record<string, Targets>;
}


interface TopCore {
  poi_id: string;
  plays: number;
  completes: number;
  completion_rate_pct: number;
  resonance_rate_pct: number;
}


const CORE_NAMES: Record<string, string> = {
  "wd-Q174045":  "Olduvai Gorge",
  "wd-Q1090052": "Gobekli Tepe",
  "wd-Q189780":  "Lascaux",
  "wd-Q1218":    "Jerusalen",
  "wd-Q42797":   "Galapagos",
  "wd-Q1737":    "Apollo 11",
  "wd-Q176330":  "Hiroshima",
};


function valueColor(value: number, targets: Targets): string {
  if (value >= targets.excellent) return "#6BA888";        // verde
  if (value >= targets.good)      return "#C9A961";        // dorado
  if (value >= targets.minimum_viable) return "rgba(255,255,255,0.7)"; // neutro
  return "#A85858";                                         // rojo claro
}


export function AdminDashboard() {
  const [token, setToken] = React.useState<string>("");
  const [tokenInput, setTokenInput] = React.useState<string>("");
  const [data, setData] = React.useState<MetricsResponse | null>(null);
  const [topCores, setTopCores] = React.useState<TopCore[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Cargar token guardado
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("kudos:admin_token") || "";
    if (saved) setToken(saved);
  }, []);

  // Fetch metricas cuando hay token
  React.useEffect(() => {
    if (!token || !API) return;
    let alive = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API}/api/admin/metrics`, { headers: { "X-Admin-Token": token } }),
      fetch(`${API}/api/admin/metrics/top-cores`, { headers: { "X-Admin-Token": token } }),
    ])
      .then(async ([r1, r2]) => {
        if (!r1.ok) throw new Error(`metrics: ${r1.status}`);
        if (!r2.ok) throw new Error(`top-cores: ${r2.status}`);
        const d = await r1.json();
        const t = await r2.json();
        if (!alive) return;
        setData(d);
        setTopCores(t.cores || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e?.message || e));
        setLoading(false);
      });

    return () => { alive = false; };
  }, [token]);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("kudos:admin_token", tokenInput.trim());
    }
    setToken(tokenInput.trim());
  };

  const handleClearToken = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kudos:admin_token");
    }
    setToken("");
    setData(null);
    setTopCores(null);
  };

  // Pantalla token
  if (!token) {
    return (
      <div style={ROOT}>
        <h1 style={H1}>KUDOS · Admin Dashboard</h1>
        <p style={SUB}>Solo equipo. Introduce X-Admin-Token para continuar.</p>
        <div style={TOKEN_BOX}>
          <input
            type="password"
            placeholder="X-Admin-Token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            style={INPUT}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveToken(); }}
          />
          <button onClick={handleSaveToken} style={BTN_SAVE}>Entrar</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={ROOT}><p style={LOADING_TXT}>Cargando metricas...</p></div>;
  if (error) {
    return (
      <div style={ROOT}>
        <h1 style={H1}>Error</h1>
        <pre style={ERR_PRE}>{error}</pre>
        <button onClick={handleClearToken} style={BTN_LOGOUT}>Reintroducir token</button>
      </div>
    );
  }
  if (!data) return <div style={ROOT}><p style={LOADING_TXT}>Sin datos.</p></div>;

  const renderRow = (
    label: string, key: keyof WindowMetrics,
  ) => {
    const t = data.targets[key as string];
    return (
      <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <td style={LABEL_TD}>{label}</td>
        {(["24h", "7d", "30d"] as const).map((w) => {
          const val = (data.windows[w] as any)[key] as number;
          const color = t ? valueColor(val, t) : "rgba(255,255,255,0.85)";
          return (
            <td key={w} style={{ ...VALUE_TD, color }}>{val}%</td>
          );
        })}
        {t && <td style={TARGET_TD}>{t.minimum_viable}/{t.good}/{t.excellent}</td>}
      </tr>
    );
  };

  return (
    <div style={ROOT}>
      <header style={HDR}>
        <h1 style={H1}>KUDOS · Admin Dashboard</h1>
        <button onClick={handleClearToken} style={BTN_LOGOUT_TOP}>Salir</button>
      </header>
      <p style={SUB}>
        Las 5 metricas core del MVP.<br/>
        Datos a {new Date(data.now).toLocaleString("es-ES")}.
      </p>

      <section style={CARD}>
        <h2 style={H2}>Metricas globales</h2>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>Metrica</th>
              <th style={TH}>24h</th>
              <th style={TH}>7 dias</th>
              <th style={TH}>30 dias</th>
              <th style={TH}>Target (min/good/exc)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
              <td style={LABEL_TD}>Core plays (usuarios)</td>
              <td style={VALUE_TD}>{data.windows["24h"].core_plays}</td>
              <td style={VALUE_TD}>{data.windows["7d"].core_plays}</td>
              <td style={VALUE_TD}>{data.windows["30d"].core_plays}</td>
              <td />
            </tr>
            {renderRow("Completion Rate Core", "completion_rate_pct")}
            {renderRow("Resonance Rate", "resonance_rate_pct")}
            {renderRow("Reflection Rate", "reflection_rate_pct")}
            {renderRow("Return Visit Rate", "return_visit_rate_pct")}
            {renderRow("DTI preliminary", "dti_preliminary_pct")}
          </tbody>
        </table>
      </section>

      {topCores && topCores.length > 0 && (
        <section style={CARD}>
          <h2 style={H2}>Top Cores · ultimos 7 dias</h2>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>POI</th>
                <th style={TH}>Plays</th>
                <th style={TH}>Completes</th>
                <th style={TH}>Completion %</th>
                <th style={TH}>Resonance %</th>
              </tr>
            </thead>
            <tbody>
              {topCores.map((c) => (
                <tr key={c.poi_id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={LABEL_TD}>{CORE_NAMES[c.poi_id] || c.poi_id}</td>
                  <td style={VALUE_TD}>{c.plays}</td>
                  <td style={VALUE_TD}>{c.completes}</td>
                  <td style={VALUE_TD}>{c.completion_rate_pct}%</td>
                  <td style={VALUE_TD}>{c.resonance_rate_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p style={FOOT}>
        DTI = usuarios con &gt;= 3 senales de transformacion distintas en la ventana.<br/>
        Verde: &gt;= excelente. Dorado: &gt;= bueno. Neutro: &gt;= minimo viable. Rojo: por debajo.
      </p>
    </div>
  );
}


// ============== styles ==============

const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  padding: "32px 28px 80px", color: "#fff",
  fontFamily: '"Inter", system-ui, sans-serif',
  maxWidth: 1100, margin: "0 auto",
};
const HDR: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 8,
};
const H1: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 28, fontWeight: 600, margin: 0,
};
const SUB: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.5)",
  marginBottom: 28, lineHeight: 1.5,
};
const H2: React.CSSProperties = {
  fontSize: 14, fontWeight: 600,
  color: "#C9A961", marginTop: 0, marginBottom: 16,
  letterSpacing: "0.10em", textTransform: "uppercase" as const,
};
const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14, padding: "20px 22px",
  marginBottom: 22,
};
const TABLE: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse" as const,
  fontSize: 13,
};
const TH: React.CSSProperties = {
  textAlign: "left" as const,
  padding: "8px 10px",
  fontSize: 11, letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.5)", fontWeight: 500,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
};
const LABEL_TD: React.CSSProperties = {
  padding: "10px 10px",
  color: "rgba(255,255,255,0.85)",
};
const VALUE_TD: React.CSSProperties = {
  padding: "10px 10px",
  color: "rgba(255,255,255,0.92)",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
};
const TARGET_TD: React.CSSProperties = {
  padding: "10px 10px",
  color: "rgba(255,255,255,0.4)",
  fontSize: 11,
};

const TOKEN_BOX: React.CSSProperties = {
  display: "flex", gap: 8, maxWidth: 420, marginTop: 12,
};
const INPUT: React.CSSProperties = {
  flex: 1, padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "#fff", fontSize: 13, outline: "none",
};
const BTN_SAVE: React.CSSProperties = {
  padding: "10px 18px",
  background: "#C9A961", color: "#1a1333",
  border: "none", borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const BTN_LOGOUT: React.CSSProperties = {
  marginTop: 14, padding: "8px 16px",
  background: "transparent", color: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8, fontSize: 12, cursor: "pointer",
};
const BTN_LOGOUT_TOP: React.CSSProperties = {
  padding: "6px 14px",
  background: "transparent", color: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 999, fontSize: 11, cursor: "pointer",
};
const LOADING_TXT: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)", fontSize: 14,
};
const ERR_PRE: React.CSSProperties = {
  background: "rgba(168,88,88,0.15)",
  border: "1px solid rgba(168,88,88,0.4)",
  borderRadius: 8, padding: 16,
  color: "rgba(255,255,255,0.85)",
  fontSize: 12, overflow: "auto" as const,
};
const FOOT: React.CSSProperties = {
  marginTop: 32, fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  fontStyle: "italic", lineHeight: 1.6,
};
