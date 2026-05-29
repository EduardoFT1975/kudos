"use client";
/**
 * KUDOS Mi Mundo v5 · Personal World Layer (mockup GPT-5).
 * Phase 1: datos desde localStorage. Phase 2: API v2 desplegada.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";
import { ResonancePicker } from "@/components/discovery/ResonancePicker";
import { MyWorldMiniMap } from "@/components/discovery/MyWorldMiniMap";


export function MiMundoV5() {
  const router = useRouter();
  const [saves, setSaves] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("kudos:saves") || "[]");
      setSaves(Array.isArray(s) ? s : []);
    } catch {}
  }, []);

  return (
    <div style={ROOT}>
      {/* Hero · título */}
      <section style={HERO}>
        <h1 style={H1}>Mi Mundo</h1>
        <p style={LEAD}>Tu universo de lugares, historias y recuerdos.</p>
        <StatsBar saves={saves.length} />
      </section>

      <div style={GRID}>
        <div style={COL_LEFT}>
          <HuellaCard />
          <RutasCard />
          <CapsulasCreadasCard />
        </div>

        <div style={COL_RIGHT}>
          <FavoritosCard count={saves.length} />
          <TimelinePersonal />
          <LogrosCard />
          <QuieresVisitar />
        </div>
      </div>

      <div style={BOTTOM_GRID}>
        <ActividadReciente />
        <EstadisticasCard saves={saves.length} />
      </div>
    </div>
  );
}


function Tab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button style={{ ...TAB, color: active ? "#fff" : "rgba(255,255,255,0.5)" }} onClick={onClick}>
      <span style={{ fontSize: 18, display: "inline-flex" }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{label}</span>
      {active && <div style={TAB_UNDER} />}
    </button>
  );
}


function StatsBar({ saves }: { saves: number }) {
  const stats = [
    { icon: "◉", label: "Lugares", value: saves || 24 },
    { icon: "◇", label: "Rutas", value: 8 },
    { icon: "▣", label: "Cápsulas", value: 56 },
    { icon: "✦", label: "Épocas", value: 12 },
  ];
  return (
    <div style={STATS_BAR}>
      {stats.map((s) => (
        <div key={s.label} style={STAT_CELL}>
          <div style={STAT_ROW}>
            <span style={STAT_ICON}>{s.icon}</span>
            <span style={STAT_VAL}>{s.value}</span>
          </div>
          <div style={STAT_LBL}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}


function HuellaCard() {
  const continents = [
    { name: "Europa", pct: 12 },
    { name: "Asia", pct: 4 },
    { name: "América", pct: 2 },
    { name: "África", pct: 1 },
    { name: "Oceanía", pct: 0.5 },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tu Huella</h3>
        <span style={CARD_HELP}>?</span>
      </div>
      <p style={CARD_SUBTITLE}>Has explorado <strong style={{ color: "#8B6BFF" }}>3% del mundo</strong></p>
      <div style={{ marginTop: 16 }}>
        {continents.map((c) => (
          <div key={c.name} style={BAR_ROW}>
            <span style={BAR_LBL}>{c.name}</span>
            <div style={BAR_TRACK}>
              <div style={{ ...BAR_FILL, width: `${Math.min(100, c.pct * 4)}%` }} />
            </div>
            <span style={BAR_PCT}>{c.pct}%</span>
          </div>
        ))}
      </div>
      {/* Mini-mapa real debajo · combinando huella estática + mapa personal */}
      <div style={{ marginTop: 18 }}>
        <MyWorldMiniMap height={150} />
      </div>
    </div>
  );
}


function RutasCard() {
  const rutas = [
    { name: "Roma Clásica", info: "7 lugares · 2h 15m" },
    { name: "Ruta de los Templarios", info: "12 lugares · 1 día" },
    { name: "Maravillas del Mundo Antiguo", info: "9 lugares · 3h 40m" },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Rutas guardadas</h3>
        <a style={SEE_ALL}>Ver todas</a>
      </div>
      {rutas.map((r) => (
        <div key={r.name} style={RUTA_ITEM}>
          <div style={RUTA_THUMB} />
          <div style={{ flex: 1 }}>
            <div style={RUTA_NAME}>{r.name}</div>
            <div style={RUTA_INFO}>{r.info}</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>⋮</span>
        </div>
      ))}
    </div>
  );
}


function CapsulasCreadasCard() {
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tus cápsulas creadas</h3>
        <a style={SEE_ALL}>Ver todas</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
        <button style={CREATE_NEW}>
          <span style={{ fontSize: 22 }}>⊕</span>
          <span style={{ fontSize: 12, marginTop: 6 }}>Crear nueva<br/>cápsula</span>
        </button>
        <div style={CAP_CARD}>
          <div style={CAP_THUMB} />
          <div style={CAP_BODY}>
            <div style={CAP_TITLE}>La biblioteca secreta de Alejandría</div>
            <div style={CAP_LOC}>Alejandría, Egipto</div>
            <div style={CAP_META}>
              <span>♡ 24</span>
              <span style={{ marginLeft: 8 }}>💬 8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function FavoritosCard({ count }: { count: number }) {
  const favoritos = [
    { name: "Coliseo", loc: "Roma, Italia", capsules: 8 },
    { name: "Machu Picchu", loc: "Cusco, Perú", capsules: 6 },
    { name: "Kyoto", loc: "Japón", capsules: 4 },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tus lugares de Mi Mundo</h3>
        <a style={SEE_ALL}>Ver todos ›</a>
      </div>
      <div style={FAV_GRID}>
        {favoritos.map((f) => (
          <div key={f.name} style={FAV_CARD}>
            <div style={FAV_HERO}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <AddToMyWorldButton poiId={f.name.toLowerCase().replace(/\s+/g, "-")} poiName={f.name} variant="compact" showMeaningPicker={false} />
              </div>
            </div>
            <div style={FAV_BODY}>
              <div style={FAV_NAME}>{f.name}</div>
              <div style={FAV_LOC}>{f.loc}</div>
              <div style={FAV_CHIP}>{f.capsules} cápsulas</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function TimelinePersonal() {
  const eras = [
    { era: "753 a.C.", label: "Fundación de Roma" },
    { era: "27 a.C.", label: "Imperio Romano" },
    { era: "1492", label: "Nuevo Mundo" },
    { era: "1969", label: "Llegada a la Luna" },
    { era: "Hoy", label: "Tu historia" },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tu línea de tiempo personal</h3>
        <a style={SEE_ALL}>Ver línea completa ›</a>
      </div>
      <p style={CARD_SUBTITLE}>Los momentos que te conectan con la historia.</p>
      <div style={{ position: "relative", marginTop: 20, padding: "0 6px" }}>
        <div style={TL_LINE} />
        <div style={TL_FILL} />
        <div style={TL_DOTS}>
          {eras.map((e, i) => (
            <div key={i} style={TL_NODE}>
              <div style={{ ...TL_DOT, background: i === 4 ? "#8B6BFF" : "rgba(255,255,255,0.18)" }} />
              <div style={TL_ERA}>{e.era}</div>
              <div style={TL_LABEL}>{e.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function LogrosCard() {
  const logros = [
    { icon: "🧭", name: "Explorador", desc: "10 lugares" },
    { icon: "⌛", name: "Cronista", desc: "25 cápsulas vistas" },
    { icon: "⏰", name: "Viajero del Tiempo", desc: "5 épocas exploradas" },
    { icon: "🔍", name: "Curioso", desc: "50 cápsulas vistas" },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tus logros</h3>
        <a style={SEE_ALL}>Ver todos ›</a>
      </div>
      <div style={LOGROS_GRID}>
        {logros.map((l) => (
          <div key={l.name} style={LOGRO}>
            <div style={LOGRO_MEDAL}>{l.icon}</div>
            <div style={LOGRO_NAME}>{l.name}</div>
            <div style={LOGRO_DESC}>{l.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function QuieresVisitar() {
  const lugares = [
    { name: "Petra", loc: "Jordania" },
    { name: "Isla de Pascua", loc: "Chile" },
    { name: "Angkor Wat", loc: "Camboya" },
    { name: "Taj Mahal", loc: "India" },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Lugares que quieres visitar</h3>
        <button style={ADD_PLUS}>+</button>
      </div>
      <div style={WANT_GRID}>
        {lugares.map((l) => (
          <div key={l.name} style={WANT_CARD}>
            <div style={WANT_HERO}>
              <span style={WANT_BOOKMARK}>🔖</span>
            </div>
            <div style={WANT_NAME}>{l.name}</div>
            <div style={WANT_LOC}>{l.loc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ActividadReciente() {
  const acts = [
    { what: "Visitaste", target: "Museo del Prado", loc: "Madrid, España", when: "Hoy" },
    { what: "Guardaste", target: "Coliseo", loc: "Roma, Italia", when: "Ayer" },
    { what: "Exploraste", target: "Imperio Romano en el año 80 d.C.", loc: "Roma, Italia", when: "Hace 2 días" },
    { what: "Viste", target: "La caída de Constantinopla", loc: "1453", when: "Hace 3 días" },
  ];
  return (
    <div style={CARD}>
      <h3 style={CARD_TITLE}>Tus actividad reciente</h3>
      <div style={{ marginTop: 14 }}>
        {acts.map((a, i) => (
          <div key={i} style={ACT_ROW}>
            <div style={ACT_DOT} />
            <div style={ACT_THUMB} />
            <div style={{ flex: 1 }}>
              <div style={ACT_TEXT}>
                {a.what} <strong>{a.target}</strong>
              </div>
              <div style={ACT_LOC}>{a.loc}</div>
            </div>
            <div style={ACT_WHEN}>{a.when}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function EstadisticasCard({ saves }: { saves: number }) {
  const total = saves + 127;
  const stats = [
    { icon: "◇", label: "Lugares", value: 24 },
    { icon: "▣", label: "Cápsulas vistas", value: 56 },
    { icon: "◇", label: "Rutas completadas", value: 8 },
    { icon: "🏛", label: "Épocas exploradas", value: 12 },
    { icon: "◉", label: "Cápsulas creadas", value: 6 },
    { icon: "◍", label: "Amigos conectados", value: 14 },
  ];
  return (
    <div style={CARD}>
      <h3 style={CARD_TITLE}>Estadísticas personales</h3>
      <div style={{ display: "flex", gap: 22, marginTop: 18, alignItems: "center" }}>
        <div style={DONUT_WRAP}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(139,107,255,0.16)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#8B6BFF" strokeWidth="10"
                    strokeDasharray={`${(total / 200) * 314} 314`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)" />
          </svg>
          <div style={DONUT_TXT}>
            <div style={DONUT_NUM}>{total}</div>
            <div style={DONUT_LBL}>experiencias</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {stats.map((s) => (
            <div key={s.label} style={ST_ROW}>
              <span style={ST_ICON}>{s.icon}</span>
              <span style={ST_LBL}>{s.label}</span>
              <span style={ST_VAL}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={MOTIVATOR}>¡Sigue explorando tu mundo!</p>
    </div>
  );
}


// ─── Styles ─────────────────────────────────────────────────────────
const ROOT: React.CSSProperties = {
  background: "#0a0814", color: "#fff",
  minHeight: "100vh", padding: "24px 22px 100px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const HDR: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  marginBottom: 32,
};
const HDR_LOGO: React.CSSProperties = {
  fontWeight: 700, fontSize: 22, letterSpacing: "0.18em", color: "#fff",
};
const HDR_TABS: React.CSSProperties = {
  display: "flex", gap: 28, alignItems: "center",
};
const TAB: React.CSSProperties = {
  position: "relative",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  background: "transparent", border: "none", cursor: "pointer",
  padding: "4px 6px",
};
const TAB_UNDER: React.CSSProperties = {
  position: "absolute", bottom: -8, left: 0, right: 0,
  height: 2, background: "#8B6BFF",
  borderRadius: 999,
};
const HDR_AVATAR: React.CSSProperties = {
  width: 40, height: 40, borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #E0815A 100%)",
  border: "2px solid rgba(255,255,255,0.15)",
  position: "relative",
};
const HDR_AVATAR_DOT: React.CSSProperties = {
  position: "absolute", top: -2, right: -2,
  width: 10, height: 10, borderRadius: "50%",
  background: "#8B6BFF",
  border: "2px solid #0a0814",
};

const HERO: React.CSSProperties = { marginBottom: 24 };
const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400, fontSize: 44, color: "#fff",
};
const LEAD: React.CSSProperties = {
  margin: "6px 0 18px",
  fontSize: 13, color: "rgba(255,255,255,0.55)",
};

const STATS_BAR: React.CSSProperties = {
  display: "flex", gap: 22, marginTop: 8,
};
const STAT_CELL: React.CSSProperties = {};
const STAT_ROW: React.CSSProperties = {
  display: "inline-flex", alignItems: "baseline", gap: 6,
};
const STAT_ICON: React.CSSProperties = { color: "#8B6BFF", fontSize: 13 };
const STAT_VAL: React.CSSProperties = { fontSize: 18, fontWeight: 700 };
const STAT_LBL: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.55)" };

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 2fr)",
  gap: 18, marginTop: 12,
};
const COL_LEFT: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const COL_RIGHT: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };

const CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.12)",
  borderRadius: 18, padding: 18,
};
const CARD_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 6,
};
const CARD_TITLE: React.CSSProperties = {
  margin: 0, fontSize: 15, fontWeight: 600, color: "#fff",
};
const CARD_SUBTITLE: React.CSSProperties = {
  margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.55)",
};
const CARD_HELP: React.CSSProperties = {
  width: 18, height: 18, borderRadius: "50%",
  background: "rgba(255,255,255,0.06)",
  fontSize: 10, color: "rgba(255,255,255,0.55)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const SEE_ALL: React.CSSProperties = {
  fontSize: 11, color: "#8B6BFF", cursor: "pointer",
};

// Bars Huella
const BAR_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
};
const BAR_LBL: React.CSSProperties = { width: 80, fontSize: 12, color: "rgba(255,255,255,0.7)" };
const BAR_TRACK: React.CSSProperties = {
  flex: 1, height: 5, background: "rgba(255,255,255,0.08)",
  borderRadius: 999,
};
const BAR_FILL: React.CSSProperties = {
  height: "100%", background: "linear-gradient(90deg, #8B6BFF, #6e4dd6)",
  borderRadius: 999,
};
const BAR_PCT: React.CSSProperties = { width: 38, fontSize: 11, color: "#8B6BFF", textAlign: "right" as const };

const MINIMAP_BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", width: "100%",
  marginTop: 14, padding: "10px 14px",
  background: "rgba(139,107,255,0.12)",
  border: "1px solid rgba(139,107,255,0.3)",
  borderRadius: 12,
  color: "#fff", fontSize: 12, cursor: "pointer",
  fontFamily: 'inherit',
};

const RUTA_ITEM: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const RUTA_THUMB: React.CSSProperties = {
  width: 48, height: 48, borderRadius: 8,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const RUTA_NAME: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const RUTA_INFO: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.5)" };

const CREATE_NEW: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: 20,
  background: "rgba(139,107,255,0.06)",
  border: "2px dashed rgba(139,107,255,0.35)",
  borderRadius: 14,
  color: "#8B6BFF", cursor: "pointer",
  fontFamily: 'inherit',
};
const CAP_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 14, overflow: "hidden",
};
const CAP_THUMB: React.CSSProperties = {
  width: "100%", height: 80,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const CAP_BODY: React.CSSProperties = { padding: 10 };
const CAP_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.3 };
const CAP_LOC: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 };
const CAP_META: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 6 };

const FAV_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10, marginTop: 10,
};
const FAV_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 14, overflow: "hidden",
};
const FAV_HERO: React.CSSProperties = {
  position: "relative", height: 130,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const FAV_HEART: React.CSSProperties = {
  position: "absolute", top: 8, right: 8,
  color: "#8B6BFF", fontSize: 16,
};
const FAV_BODY: React.CSSProperties = { padding: "10px 12px" };
const FAV_NAME: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const FAV_LOC: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 };
const FAV_CHIP: React.CSSProperties = {
  display: "inline-block", marginTop: 8,
  padding: "3px 8px", borderRadius: 999,
  background: "rgba(139,107,255,0.18)",
  fontSize: 9, color: "#8B6BFF", fontWeight: 500,
};

// Timeline personal
const TL_LINE: React.CSSProperties = {
  position: "absolute", top: 12, left: 8, right: 8,
  height: 2, background: "rgba(255,255,255,0.1)",
};
const TL_FILL: React.CSSProperties = {
  position: "absolute", top: 12, left: 8, width: "80%",
  height: 2, background: "linear-gradient(90deg, rgba(139,107,255,0.2), #8B6BFF)",
};
const TL_DOTS: React.CSSProperties = {
  position: "relative", display: "flex", justifyContent: "space-between",
};
const TL_NODE: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
};
const TL_DOT: React.CSSProperties = {
  width: 12, height: 12, borderRadius: "50%",
  border: "2px solid #0a0814",
};
const TL_ERA: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#fff", marginTop: 2,
};
const TL_LABEL: React.CSSProperties = { fontSize: 9, color: "rgba(255,255,255,0.5)" };

const LOGROS_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12, marginTop: 12,
};
const LOGRO: React.CSSProperties = { textAlign: "center" as const };
const LOGRO_MEDAL: React.CSSProperties = {
  width: 64, height: 64, borderRadius: "50%",
  background: "radial-gradient(circle, rgba(201,169,97,0.18) 0%, rgba(201,169,97,0.04) 100%)",
  border: "1.5px solid rgba(201,169,97,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 24, margin: "0 auto 8px",
  color: "#C9A961",
};
const LOGRO_NAME: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#fff" };
const LOGRO_DESC: React.CSSProperties = { fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 };

const ADD_PLUS: React.CSSProperties = {
  width: 30, height: 30, borderRadius: "50%",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.4)",
  color: "#8B6BFF", fontSize: 16, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const WANT_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10, marginTop: 10,
};
const WANT_CARD: React.CSSProperties = {};
const WANT_HERO: React.CSSProperties = {
  position: "relative", height: 110, borderRadius: 12,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
  marginBottom: 6,
};
const WANT_BOOKMARK: React.CSSProperties = {
  position: "absolute", top: 6, right: 6, fontSize: 14, color: "#fff",
};
const WANT_NAME: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#fff" };
const WANT_LOC: React.CSSProperties = { fontSize: 9, color: "rgba(255,255,255,0.5)" };

const BOTTOM_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: 18, marginTop: 18,
};

const ACT_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};
const ACT_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "#8B6BFF",
};
const ACT_THUMB: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 8,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const ACT_TEXT: React.CSSProperties = { fontSize: 12, color: "#fff" };
const ACT_LOC: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.5)" };
const ACT_WHEN: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.4)" };

const DONUT_WRAP: React.CSSProperties = { position: "relative" };
const DONUT_TXT: React.CSSProperties = {
  position: "absolute", top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center" as const,
};
const DONUT_NUM: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "#fff" };
const DONUT_LBL: React.CSSProperties = { fontSize: 9, color: "rgba(255,255,255,0.55)" };

const ST_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
  fontSize: 12,
};
const ST_ICON: React.CSSProperties = { color: "#8B6BFF" };
const ST_LBL: React.CSSProperties = { flex: 1, color: "rgba(255,255,255,0.7)" };
const ST_VAL: React.CSSProperties = { color: "#fff", fontWeight: 600 };

const MOTIVATOR: React.CSSProperties = {
  margin: "16px 0 0",
  textAlign: "center" as const,
  fontSize: 12, color: "#8B6BFF",
};
