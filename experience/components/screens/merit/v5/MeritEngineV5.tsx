"use client";
/**
 * KUDOS Merit Engine v5 · pantalla /merit/[poi_id] (mockup GPT-5).
 *
 * Phase 1: placeholder con datos hardcoded del Coliseo.
 * Phase 2: conectar a /api/merit/{poi_id} y /api/signals/{poi_id} del Capsule Engine v2.
 *
 * Filosofía CTO directive: "El mérito no es popularidad. No contamos likes.
 * Contamos impacto, relevancia, profundidad y valor humano real."
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";


interface Props {
  poiId: string;
}


// Placeholder Phase 1
const PLACEHOLDER = {
  name: "Coliseo",
  location: "Roma, Italia",
  category: "Historia · Imperio Romano",
  score: 91,
  scoreLabel: "Excepcional",
  scoreDelta: 12,         // últimos 90 días
  factors: [
    { id: "impacto",        emoji: "★", name: "Impacto cultural",        sub: "Importancia histórica y cultural global", value: 20, max: 20 },
    { id: "conexion",       emoji: "♥", name: "Conexión emocional",      sub: "Capacidad de generar emoción y asombro", value: 18, max: 20 },
    { id: "relevancia",     emoji: "◍", name: "Relevancia colectiva",    sub: "Cuántas personas lo valoran positivamente", value: 17, max: 20 },
    { id: "calidad",        emoji: "◉", name: "Calidad del contenido",   sub: "Rigor, profundidad y claridad", value: 16, max: 20 },
    { id: "permanencia",    emoji: "⏱", name: "Permanencia temporal",    sub: "Valor a lo largo del tiempo y generaciones", value: 12, max: 15 },
    { id: "contexto",       emoji: "📍", name: "Contexto local",          sub: "Importancia para el lugar y su comunidad", value: 8, max: 10 },
  ],
  affinities: [
    { id: "tema", name: "Afinidad temática", value: 92 },
    { id: "interes", name: "Interés histórico", value: 88 },
    { id: "viajes", name: "Viajes futuros", value: 76 },
    { id: "conexion", name: "Conexión personal", value: 64 },
  ],
  tags: ["Historia antigua", "Arquitectura", "Viajes", "Civilizaciones"],
  comparativa: [
    { rank: 2, name: "Machu Picchu", score: 87 },
    { rank: 1, name: "Coliseo", score: 91 },
    { rank: 3, name: "Taj Mahal", score: 85 },
  ],
  community: {
    total: 1248,
    breakdown: [
      { name: "Inspirador",     pct: 72, color: "#4a9d5f" },
      { name: "Impresionante",  pct: 18, color: "#4080c8" },
      { name: "Interesante",    pct: 7,  color: "#d4a857" },
      { name: "Neutral",        pct: 2,  color: "#888" },
      { name: "Poco relevante", pct: 1,  color: "#c85858" },
    ],
  },
  countries: 132,
};


export function MeritEngineV5({ poiId }: Props) {
  const router = useRouter();
  const m = PLACEHOLDER;     // futuro: fetch /api/merit/{poiId}

  return (
    <div style={ROOT}>
      <Header onBack={() => router.back()} />

      {/* Hero · título grande + card POI a la derecha */}
      <section style={HERO}>
        <div style={HERO_TEXT}>
          <div style={CATEGORY_LBL}>MERIT ENGINE</div>
          <h1 style={H1}>El mérito de lo que importa</h1>
          <p style={LEAD}>Evaluamos el valor real de cada cápsula según múltiples factores humanos y contextuales.</p>
        </div>
        <div style={POI_CARD}>
          <div style={POI_HERO} />
          <div style={POI_INFO}>
            <h3 style={POI_NAME}>{m.name}</h3>
            <div style={POI_LOC}>{m.location}</div>
            <div style={POI_CAT}>{m.category}</div>
            <button style={POI_BTN}>▶ Ver cápsula</button>
          </div>
        </div>
      </section>

      {/* Grid principal · score circular | factores */}
      <div style={GRID_2}>
        <ScoreCard score={m.score} label={m.scoreLabel} delta={m.scoreDelta} />
        <FactorsCard factors={m.factors} />
      </div>

      {/* Relevancia para ti */}
      <RelevanciaParaTi affinities={m.affinities} tags={m.tags} />

      {/* Comparativa + Comunidad */}
      <div style={GRID_2}>
        <ComparativaCard rows={m.comparativa} />
        <ComunidadCard data={m.community} countries={m.countries} />
      </div>

      {/* Valores · footer */}
      <ValoresBanner />
    </div>
  );
}


function Header({ onBack }: { onBack: () => void }) {
  return (
    <header style={HDR}>
      <button style={HDR_BACK} onClick={onBack}>‹ Volver</button>
      <div style={HDR_CENTER}>
        <KudosFlowerLogo size={24} variant="gold" glow />
        <span style={HDR_LOGO}>KUDOS</span>
      </div>
      <button style={HDR_HELP}>
        <span style={{ marginRight: 6 }}>ⓘ</span>
        ¿Cómo funciona?
      </button>
    </header>
  );
}


function ScoreCard({ score, label, delta }: { score: number; label: string; delta: number }) {
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={CARD}>
      <div style={SECTION_LBL}>PUNTUACIÓN DE MÉRITO</div>
      <div style={SCORE_WRAP}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="none"
                  stroke="rgba(139,107,255,0.16)" strokeWidth="12" />
          <circle cx="100" cy="100" r="80" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="12"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)" />
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B6BFF" />
              <stop offset="100%" stopColor="#6e4dd6" />
            </linearGradient>
          </defs>
        </svg>
        <div style={SCORE_TXT}>
          <div style={SCORE_NUM}>{score}</div>
          <div style={SCORE_OF}>/100</div>
        </div>
      </div>
      <div style={SCORE_LBL}>{label}</div>
      <p style={SCORE_DESC}>Este contenido tiene un impacto profundo, relevante y duradero en las personas.</p>

      <div style={EVOL_WRAP}>
        <div style={EVOL_HEAD}>
          <span style={EVOL_LBL}>Evolución del mérito</span>
          <span style={EVOL_RANGE}>Últimos 90 días</span>
        </div>
        <div style={EVOL_GRAPH}>
          <svg viewBox="0 0 200 50" style={{ width: "100%", height: 50 }}>
            <polyline
              fill="none" stroke="#8B6BFF" strokeWidth="2"
              points="0,38 20,32 40,35 60,28 80,30 100,25 120,28 140,22 160,15 180,12 200,8"
            />
          </svg>
          <div style={EVOL_DELTA}>+{delta} <span style={{ fontSize: 11 }}>↗</span></div>
        </div>
      </div>
    </div>
  );
}


function FactorsCard({ factors }: { factors: any[] }) {
  return (
    <div style={CARD}>
      <div style={SECTION_LBL}>FACTORES DE MÉRITO</div>
      <div style={{ marginTop: 16 }}>
        {factors.map((f) => (
          <div key={f.id} style={FACTOR_ROW}>
            <div style={FACTOR_ICON}>{f.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={FACTOR_HEAD}>
                <div>
                  <div style={FACTOR_NAME}>{f.name}</div>
                  <div style={FACTOR_SUB}>{f.sub}</div>
                </div>
                <div style={FACTOR_VAL}>{f.value}/{f.max}</div>
              </div>
              <div style={FACTOR_BAR}>
                <div style={{ ...FACTOR_FILL, width: `${(f.value / f.max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <a style={SEE_ALL}>Ver metodología completa ›</a>
    </div>
  );
}


function RelevanciaParaTi({ affinities, tags }: { affinities: any[]; tags: string[] }) {
  return (
    <div style={CARD}>
      <div style={SECTION_LBL}>RELEVANCIA PARA TI <span style={CARD_HELP}>?</span></div>
      <div style={REL_GRID}>
        <div>
          <div style={REL_RINGS}>
            <svg viewBox="0 0 120 120" width="120" height="120">
              {[1, 2, 3, 4].map((i) => (
                <circle key={i} cx="60" cy="60" r={20 + i * 12}
                        fill="none" stroke="#8B6BFF"
                        strokeOpacity={0.25 - i * 0.04} strokeWidth="1.5" />
              ))}
              <circle cx="60" cy="60" r="18" fill="rgba(139,107,255,0.25)" />
              <text x="60" y="68" textAnchor="middle" fill="#fff"
                    fontSize="22" fontWeight="600">◌</text>
            </svg>
          </div>
        </div>
        <div>
          <h3 style={REL_TITLE}>Muy relevante</h3>
          <p style={REL_DESC}>Este lugar conecta con tus intereses principales.</p>
          <div style={REL_TAGS}>
            {tags.map((t) => <span key={t} style={REL_TAG}>{t}</span>)}
          </div>
        </div>
        <div>
          {affinities.map((a) => (
            <div key={a.id} style={AFF_ROW}>
              <span style={AFF_ICON}>◇</span>
              <span style={AFF_LBL}>{a.name}</span>
              <div style={AFF_BAR}>
                <div style={{ ...AFF_FILL, width: `${a.value}%` }} />
              </div>
              <span style={AFF_PCT}>{a.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ComparativaCard({ rows }: { rows: any[] }) {
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <div style={SECTION_LBL}>COMPARATIVA</div>
        <a style={SEE_ALL}>Ver más</a>
      </div>
      <div style={COMP_GRID}>
        {rows.map((r) => (
          <div key={r.name} style={COMP_CELL}>
            <div style={COMP_RANK}>{r.rank}</div>
            <div style={{
              ...COMP_THUMB,
              transform: r.rank === 1 ? "scale(1.15)" : "scale(0.85)",
              border: r.rank === 1 ? "3px solid #8B6BFF" : "2px solid rgba(255,255,255,0.1)",
            }} />
            <div style={COMP_NAME}>{r.name}</div>
            <div style={COMP_SCORE}>{r.score}/100</div>
          </div>
        ))}
      </div>
      <p style={COMP_NOTE}>Entre los lugares que has explorado, este es el que tiene mayor mérito para ti y para el mundo.</p>
    </div>
  );
}


function ComunidadCard({ data, countries }: { data: any; countries: number }) {
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <div style={SECTION_LBL}>SEÑAL DE LA COMUNIDAD</div>
        <span style={COMU_QUESTION}>¿Qué opinan las personas?</span>
      </div>
      <div style={COMU_TOTAL}>{data.total.toLocaleString("es-ES")}</div>
      <div style={COMU_TOTAL_LBL}>Valoraciones significativas</div>
      <div style={COMU_BAR}>
        {data.breakdown.map((b: any, i: number) => (
          <div key={i} style={{ flex: b.pct, background: b.color }} />
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        {data.breakdown.map((b: any, i: number) => (
          <div key={i} style={COMU_ROW}>
            <span style={{ ...COMU_DOT, background: b.color }} />
            <span style={COMU_NAME}>{b.name}</span>
            <span style={COMU_PCT}>{b.pct}%</span>
          </div>
        ))}
      </div>
      <p style={COMU_FOOT}>Personas reales de {countries} países han interactuado con esta cápsula.</p>
    </div>
  );
}


function ValoresBanner() {
  const vals = [
    { icon: "✦", title: "El mérito no es popularidad", desc: "No contamos likes. Contamos impacto, relevancia, profundidad y valor humano real." },
    { icon: "🛡", title: "Transparente", desc: "Metodología abierta y verificable." },
    { icon: "⚖", title: "Ético", desc: "Sin manipulación, sin sesgos ocultos." },
    { icon: "🔒", title: "Privado", desc: "Tu perfil influye en tu relevancia, no se expone." },
  ];
  return (
    <div style={VAL_WRAP}>
      {vals.map((v, i) => (
        <div key={i} style={VAL_CELL}>
          <div style={VAL_ICON}>{v.icon}</div>
          <div>
            <div style={VAL_TITLE}>{v.title}</div>
            <div style={VAL_DESC}>{v.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── Styles ─────────────────────────────────────────────────────────
const ROOT: React.CSSProperties = {
  background: "#0a0814", color: "#fff",
  minHeight: "100vh", padding: "0 22px 110px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const HDR: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 0",
  position: "sticky", top: 0, zIndex: 10,
  background: "#0a0814",
};
const HDR_BACK: React.CSSProperties = {
  background: "transparent", border: "none", color: "#fff",
  fontSize: 14, cursor: "pointer", fontFamily: 'inherit',
};
const HDR_CENTER: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const HDR_LOGO: React.CSSProperties = {
  fontWeight: 700, fontSize: 17, letterSpacing: "0.18em", color: "#fff",
};
const HDR_HELP: React.CSSProperties = {
  background: "transparent", border: "none", color: "rgba(255,255,255,0.6)",
  fontSize: 12, cursor: "pointer", fontFamily: 'inherit',
};

const HERO: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "2fr 1fr",
  gap: 22, marginBottom: 28,
};
const HERO_TEXT: React.CSSProperties = {};
const CATEGORY_LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#8B6BFF",
  letterSpacing: "0.22em", marginBottom: 8,
};
const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 40, fontWeight: 400, lineHeight: 1.1,
};
const LEAD: React.CSSProperties = {
  margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)",
  maxWidth: 460,
};

const POI_CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 16, padding: 14,
  display: "flex", gap: 12,
  alignItems: "center",
};
const POI_HERO: React.CSSProperties = {
  width: 80, height: 80, borderRadius: 10,
  background: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/200px-Colosseo_2020.jpg") center/cover',
};
const POI_INFO: React.CSSProperties = { flex: 1 };
const POI_NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 22, fontWeight: 400, color: "#fff",
};
const POI_LOC: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.6)" };
const POI_CAT: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 };
const POI_BTN: React.CSSProperties = {
  marginTop: 8, padding: "6px 14px",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.4)",
  borderRadius: 999,
  color: "#fff", fontSize: 11, cursor: "pointer",
  fontFamily: 'inherit',
};

const GRID_2: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1.4fr",
  gap: 16, marginBottom: 18,
};

const CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.12)",
  borderRadius: 16, padding: 22,
};
const CARD_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
};
const SECTION_LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.55)",
  marginBottom: 12,
};
const CARD_HELP: React.CSSProperties = {
  marginLeft: 6,
  width: 14, height: 14, borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  fontSize: 9, color: "rgba(255,255,255,0.55)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const SEE_ALL: React.CSSProperties = {
  display: "inline-block", marginTop: 14,
  fontSize: 11.5, color: "#8B6BFF", cursor: "pointer",
};

const SCORE_WRAP: React.CSSProperties = {
  position: "relative", display: "flex", justifyContent: "center",
};
const SCORE_TXT: React.CSSProperties = {
  position: "absolute", top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center" as const,
};
const SCORE_NUM: React.CSSProperties = { fontSize: 56, fontWeight: 700, color: "#fff" };
const SCORE_OF: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.55)" };
const SCORE_LBL: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: 18, fontWeight: 600, color: "#8B6BFF", marginTop: 8,
};
const SCORE_DESC: React.CSSProperties = {
  textAlign: "center" as const,
  fontSize: 11.5, color: "rgba(255,255,255,0.6)",
  marginTop: 8, lineHeight: 1.5,
};

const EVOL_WRAP: React.CSSProperties = { marginTop: 22 };
const EVOL_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline",
  marginBottom: 8,
};
const EVOL_LBL: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.7)" };
const EVOL_RANGE: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.4)" };
const EVOL_GRAPH: React.CSSProperties = { position: "relative" };
const EVOL_DELTA: React.CSSProperties = {
  position: "absolute", bottom: -4, right: 0,
  fontSize: 14, fontWeight: 600, color: "#6BA888",
};

const FACTOR_ROW: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 12,
  padding: "10px 0",
};
const FACTOR_ICON: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  background: "rgba(139,107,255,0.18)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 13, color: "#8B6BFF", flexShrink: 0,
};
const FACTOR_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  marginBottom: 6,
};
const FACTOR_NAME: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const FACTOR_SUB: React.CSSProperties = { fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 };
const FACTOR_VAL: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#8B6BFF" };
const FACTOR_BAR: React.CSSProperties = {
  height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999,
};
const FACTOR_FILL: React.CSSProperties = {
  height: "100%", background: "linear-gradient(90deg, #8B6BFF, #6e4dd6)",
  borderRadius: 999,
};

const REL_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "auto 1fr 1.5fr",
  gap: 24, marginTop: 14, alignItems: "center",
};
const REL_RINGS: React.CSSProperties = {};
const REL_TITLE: React.CSSProperties = {
  margin: 0, fontSize: 18, fontWeight: 600, color: "#fff",
};
const REL_DESC: React.CSSProperties = {
  margin: "6px 0 10px",
  fontSize: 12, color: "rgba(255,255,255,0.6)",
};
const REL_TAGS: React.CSSProperties = {
  display: "flex", gap: 6, flexWrap: "wrap" as const,
};
const REL_TAG: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 999,
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.32)",
  fontSize: 10.5, color: "#8B6BFF",
};

const AFF_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 10,
};
const AFF_ICON: React.CSSProperties = { color: "#8B6BFF" };
const AFF_LBL: React.CSSProperties = { flex: 1, fontSize: 11, color: "rgba(255,255,255,0.75)" };
const AFF_BAR: React.CSSProperties = {
  width: 130, height: 5, background: "rgba(255,255,255,0.08)",
  borderRadius: 999,
};
const AFF_FILL: React.CSSProperties = {
  height: "100%", background: "linear-gradient(90deg, #8B6BFF, #6e4dd6)",
  borderRadius: 999,
};
const AFF_PCT: React.CSSProperties = { width: 32, fontSize: 11, color: "#8B6BFF", fontWeight: 600 };

const COMP_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12, marginTop: 14, alignItems: "end",
  textAlign: "center" as const,
};
const COMP_CELL: React.CSSProperties = {};
const COMP_RANK: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
};
const COMP_THUMB: React.CSSProperties = {
  width: 80, height: 80, borderRadius: "50%",
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
  margin: "0 auto 8px",
  transition: "all 0.3s ease",
};
const COMP_NAME: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#fff" };
const COMP_SCORE: React.CSSProperties = { fontSize: 11, color: "#8B6BFF", marginTop: 2 };
const COMP_NOTE: React.CSSProperties = {
  marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.5)",
  lineHeight: 1.5,
};

const COMU_QUESTION: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.5)", fontStyle: "italic" as const,
};
const COMU_TOTAL: React.CSSProperties = {
  fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 10,
};
const COMU_TOTAL_LBL: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 14,
};
const COMU_BAR: React.CSSProperties = {
  display: "flex", height: 8, borderRadius: 999, overflow: "hidden" as const,
};
const COMU_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  marginBottom: 6, fontSize: 11.5,
};
const COMU_DOT: React.CSSProperties = {
  width: 10, height: 10, borderRadius: "50%",
};
const COMU_NAME: React.CSSProperties = { flex: 1, color: "rgba(255,255,255,0.75)" };
const COMU_PCT: React.CSSProperties = { color: "#fff", fontWeight: 600 };
const COMU_FOOT: React.CSSProperties = {
  marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.45)",
};

const VAL_WRAP: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: 14, marginTop: 18,
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(139,107,255,0.1)",
  borderRadius: 16, padding: 22,
};
const VAL_CELL: React.CSSProperties = { display: "flex", gap: 10 };
const VAL_ICON: React.CSSProperties = {
  fontSize: 20, color: "#8B6BFF", flexShrink: 0,
  display: "flex", alignItems: "flex-start",
};
const VAL_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const VAL_DESC: React.CSSProperties = { fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 4, lineHeight: 1.5 };
