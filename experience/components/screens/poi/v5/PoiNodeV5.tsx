"use client";
/**
 * KUDOS POI Node v5 · vista detalle de POI (mockup GPT-5).
 *
 * Phase 1: placeholder con tabs · KUDOS MIND es UI sin chat real.
 * Phase 2: conectar a /api/world/poi/{id}/node del Capsule Engine v2.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";
import { ResonancePicker } from "@/components/discovery/ResonancePicker";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";
import { useScrollDepth } from "@/components/discovery/useScrollDepth";
import { useTimeOnScreen } from "@/components/discovery/useTimeOnScreen";
import { Track } from "@/components/discovery/kudosTelemetry";
import { useRelatedPois } from "@/components/discovery/useRelatedPois";


interface Props {
  poiId: string;
}


type Tab = "resumen" | "historia" | "tiempo" | "experiencias" | "info" | "mind";


export function PoiNodeV5({ poiId }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("resumen");
  const [era, setEra] = React.useState<"80" | "120" | "1500" | "1800" | "hoy">("80");

  // Phase 1 placeholder · hardcoded Coliseo
  const poi = {
    name: "Coliseo",
    category: "MONUMENTO HISTÓRICO",
    location: "Roma, Italia",
    flag: "🇮🇹",
    rating: 4.9,
    ratingCount: 1248,
    description: "Anfiteatro emblemático del Imperio Romano. Escenario de luchas de gladiadores y espectáculos que fascinaban al mundo.",
    tags: ["Historia", "Arquitectura", "Imperio Romano"],
    distance: "320 m",
    schedule: "Abierto ahora 8:30 – 19:00",
    keyData: [
      { icon: "🏛", label: "Construido", value: "70-80 d.C." },
      { icon: "👑", label: "Emperador", value: "Vespasiano" },
      { icon: "👥", label: "Capacidad", value: "50.000 - 80.000 espectadores" },
      { icon: "⚔", label: "Uso", value: "Juegos, combates y espectáculos públicos" },
    ],
  };

  // HDG · capa Discovery · disparar al mount + medir tiempo
  React.useEffect(() => { Track.nodeOpen(poiId); }, [poiId]);
  useTimeOnScreen("poi_time_on_screen", poiId);
  useScrollDepth(poiId);

  return (
    <div style={ROOT}>
      <Header onBack={() => router.back()} />

      <section style={HERO}>
        <div style={HERO_IMG} />
        <div style={HERO_GRAD} />

        <div style={HERO_TEXT}>
          <span style={CATEGORY_CHIP}>{poi.category}</span>
          <h1 style={POI_TITLE}>{poi.name}</h1>
          <div style={LOC_ROW}>
            <span>{poi.flag}</span>
            <span>{poi.location}</span>
          </div>
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <ResonancePicker poiId={poiId} variant="full" />
          </div>
          <p style={POI_DESC}>{poi.description}</p>
          <div style={TAGS}>
            {poi.tags.map((t) => <span key={t} style={TAG}>{t}</span>)}
          </div>
        </div>

        <div style={DIST_INFO}>
          <div style={DIST_ROW}>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Estás a</span>
            <strong>{poi.distance}</strong>
            <button style={NAV_BTN}>➤</button>
          </div>
          <div style={SCHEDULE_ROW}>
            <span style={{ color: "#8B6BFF" }}>●</span> {poi.schedule}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav style={TABS}>
        <TabBtn id="resumen"      label="Resumen"            icon="◇" active={tab} onClick={setTab} />
        <TabBtn id="historia"     label="Historia"           icon="🏛" active={tab} onClick={setTab} />
        <TabBtn id="tiempo"       label="Explorar en el tiempo" icon="⏱" active={tab} onClick={setTab} />
        <TabBtn id="experiencias" label="Experiencias"       icon="⚙" active={tab} onClick={setTab} />
        <TabBtn id="info"         label="Info práctica"      icon="ⓘ" active={tab} onClick={setTab} />
        <TabBtn id="mind"         label="Conversar con KUDOS" icon="💭" active={tab} onClick={setTab} />
      </nav>

      {tab === "resumen" && <ResumenTab keyData={poi.keyData} />}
      {tab === "historia" && <HistoriaTab />}
      {tab === "tiempo" && <TiempoTab era={era} setEra={setEra} />}
      {tab === "experiencias" && <ExperienciasTab poiId={poiId} />}
      {tab === "info" && <InfoTab />}
      {tab === "mind" && <MindTab />}

      <BottomToolbar />

      <div style={EXP_BANNER}>
        <div>
          <div style={EXP_TITLE}>Vive la experiencia completa</div>
          <div style={EXP_SUB}>Entradas, tours y experiencias cerca del {poi.name}.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={AVATARS}>
            <span style={AV}>👤</span>
            <span style={{ ...AV, marginLeft: -8 }}>👤</span>
            <span style={{ ...AV, marginLeft: -8 }}>👤</span>
            <span style={AV_COUNT}>+1.2k</span>
          </div>
          <button style={EXP_BTN}>Ver experiencias</button>
        </div>
      </div>
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
      <div style={HDR_ACTIONS}>
        <HdrAction icon="↗" label="Compartir" />
        <HdrAction icon="🔖" label="Guardar" />
        <HdrAction icon="⋮" label="Más" />
      </div>
    </header>
  );
}

function HdrAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button style={HDR_ACT}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 9, marginTop: 2 }}>{label}</span>
    </button>
  );
}


function TabBtn({ id, label, icon, active, onClick }: {
  id: Tab; label: string; icon: string; active: Tab; onClick: (t: Tab) => void;
}) {
  const isActive = active === id;
  return (
    <button style={{
      ...TAB,
      color: isActive ? "#8B6BFF" : "rgba(255,255,255,0.5)",
      borderBottom: isActive ? "2px solid #8B6BFF" : "2px solid transparent",
    }} onClick={() => onClick(id)}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 500 }}>{label}</span>
    </button>
  );
}


function ResumenTab({ keyData }: { keyData: { icon: string; label: string; value: string }[] }) {
  return (
    <div style={GRID3}>
      <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
        <div style={CAP_HERO}>
          <span style={CAP_BADGE}>Cápsula destacada</span>
          <span style={CAP_TIME}>00:15</span>
          <button style={CAP_PLAY}>▶</button>
        </div>
        <div style={{ padding: 16 }}>
          <h4 style={CAP_TITLE}>La grandeza del entretenimiento romano</h4>
        </div>
      </div>

      <div style={CARD}>
        <h4 style={CARD_TITLE}>Datos clave</h4>
        {keyData.map((d) => (
          <div key={d.label} style={KD_ROW}>
            <div style={KD_ICON}>{d.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={KD_LBL}>{d.label}</div>
              <div style={KD_VAL}>{d.value}</div>
            </div>
          </div>
        ))}
        <a style={SEE_ALL}>Ver más información ›</a>
      </div>

      <div style={CARD}>
        <h4 style={CARD_TITLE}>Ubicación</h4>
        <div style={MINI_MAP}>
          <span style={MAP_PIN}>📍</span>
        </div>
        <button style={HOW_BTN}>📍 Cómo llegar</button>
      </div>
    </div>
  );
}


function HistoriaTab() {
  // Multi-Capsule System · "Más historias del lugar" (P0 CTO)
  // Phase 1: placeholders · cuando narrative engine genere reales, conecta
  const narratives = [
    { icon: "⚔", title: "Gladiadores", hook: "Vidas que se decidían en arena.", type: "Human Story", dur: "0:45" },
    { icon: "🏛", title: "Roma Imperial", hook: "El símbolo del poder de un imperio.", type: "Hidden Truth", dur: "0:30" },
    { icon: "⚙", title: "Ingeniería", hook: "Cómo levantaron lo imposible.", type: "Transformation", dur: "0:30" },
    { icon: "🌧", title: "Violencia pública", hook: "Lo que pagaron los romanos por entretenerse.", type: "Mystery", dur: "0:30" },
    { icon: "🪨", title: "Construcción", hook: "Cada piedra contó una historia.", type: "Lost World", dur: "0:45" },
    { icon: "💭", title: "Legado", hook: "Por qué sigue importando hoy.", type: "Present Connection", dur: "0:30" },
  ];

  return (
    <>
      <div style={CARD}>
        <h3 style={CARD_TITLE}>Más historias de este lugar</h3>
        <p style={{ margin: "6px 0 14px", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          Un POI no es una historia. Es un universo narrativo.
        </p>
        <div style={NARRATIVES_GRID}>
          {narratives.map((n, i) => (
            <button key={i} style={NARRATIVE_CARD}>
              <div style={NARRATIVE_HEAD}>
                <div style={NARRATIVE_ICON}>{n.icon}</div>
                <div style={NARRATIVE_DUR}>{n.dur} ▶</div>
              </div>
              <div style={NARRATIVE_TITLE}>{n.title}</div>
              <div style={NARRATIVE_HOOK}>{n.hook}</div>
              <div style={NARRATIVE_TYPE}>{n.type}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}


function TiempoTab({ era, setEra }: { era: "80" | "120" | "1500" | "1800" | "hoy"; setEra: (e: any) => void }) {
  const eras = [
    { id: "80",  label: "80 d.C.",  sub: "En su máximo esplendor" },
    { id: "120", label: "120 d.C.", sub: "Tras las modificaciones" },
    { id: "1500", label: "1500",    sub: "Piedra para otras obras" },
    { id: "1800", label: "1800",    sub: "Descubrimiento romántico" },
    { id: "hoy",  label: "Hoy",     sub: "Patrimonio mundial" },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Explorar en el tiempo</h3>
        <a style={SEE_ALL}>Ver timeline completo ›</a>
      </div>
      <div style={ERA_PILLS}>
        {eras.map((e) => (
          <button key={e.id} style={{
            ...ERA_PILL,
            background: era === e.id ? "#8B6BFF" : "rgba(255,255,255,0.06)",
            color: era === e.id ? "#fff" : "rgba(255,255,255,0.7)",
          }} onClick={() => setEra(e.id as any)}>
            {e.label}
          </button>
        ))}
      </div>
      <div style={ERA_GALLERY}>
        {eras.map((e) => (
          <div key={e.id} style={{
            ...ERA_THUMB,
            border: era === e.id ? "2px solid #8B6BFF" : "2px solid transparent",
          }}>
            <div style={ERA_IMG} />
            <div style={ERA_INFO}>
              <div style={ERA_LBL}>{e.label}</div>
              <div style={ERA_SUB}>{e.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ExperienciasTab({ poiId }: { poiId: string }) {
  const { related, loading } = useRelatedPois(poiId, 8);
  return (
    <div style={CARD}>
      <h3 style={CARD_TITLE}>POIs relacionados</h3>
      <p style={{ margin: "6px 0 12px", fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
        Lugares conectados con este por cercanía o tema.
      </p>
      {loading && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Cargando relaciones...</div>}
      {!loading && related.length === 0 && (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          Aún sin relaciones generadas · ejecuta <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 4px" }}>python -m kudos_engine.scripts.generate_relationships</code>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        {related.map((r) => (
          <a key={r.id} href={`/poi/${r.id}`} style={REL_ROW_LINK}>
            <div style={REL_THUMB} />
            <div style={{ flex: 1 }}>
              <div style={REL_NAME}>{r.id.replace("wd-Q", "Q").replace(/-/g, " ")}</div>
              <div style={REL_DIST}>
                {r.distance_km !== undefined ? `A ${r.distance_km < 1 ? Math.round(r.distance_km * 1000) + " m" : r.distance_km + " km"} · ${r.type}` : r.type}
              </div>
            </div>
            <span style={{ color: "#8B6BFF", fontSize: 14 }}>›</span>
          </a>
        ))}
      </div>
    </div>
  );
}


function InfoTab() {
  return (
    <div style={CARD}>
      <h3 style={CARD_TITLE}>Info práctica</h3>
      <p style={{ marginTop: 12, color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
        Información práctica del lugar: horarios detallados, precios, accesibilidad, transporte público, recomendaciones y reglas de visita.
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 12 }}>
        Pendiente de conectar con API v2 (próximamente).
      </p>
    </div>
  );
}


function MindTab() {
  const prompts = [
    "¿Qué eventos ocurrieron aquí?",
    "Muéstrame el Coliseo en 80 d.C.",
    "¿Cómo era la vida de un gladiador?",
  ];
  return (
    <div style={{ ...CARD, background: "linear-gradient(135deg, rgba(139,107,255,0.18) 0%, rgba(15,10,31,0.6) 100%)" }}>
      <div style={MIND_HEAD}>
        <KudosFlowerLogo size={22} variant="gold" glow />
        <div>
          <div style={MIND_TITLE}>KUDOS MIND</div>
          <div style={MIND_SUB}>Pregúntame sobre este lugar</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        {prompts.map((p, i) => (
          <button key={i} style={MIND_PROMPT}>
            <span>{p}</span>
            <span style={{ color: "#8B6BFF", fontSize: 16 }}>➤</span>
          </button>
        ))}
      </div>
      <button style={MIND_SPEAK}>
        <span style={{ marginRight: 8 }}>🎙</span> Hablar ahora
      </button>
    </div>
  );
}


function BottomToolbar() {
  const actions = [
    { icon: "📍", label: "Estuve aquí",   sub: "Deja tu huella" },
    { icon: "🌍", label: "Añadir a Mi Mundo", sub: "Tu mapa de significado" },
    { icon: "⊕",  label: "Crear cápsula",  sub: "Comparte tu perspectiva", primary: true },
    { icon: "↗",  label: "Compartir",      sub: "Con amigos" },
    { icon: "📐", label: "Ruta",           sub: "Añadir a ruta" },
  ];
  return (
    <div style={TOOLBAR}>
      {actions.map((a) => (
        <button key={a.label} style={{
          ...TB_ACT,
          background: a.primary ? "radial-gradient(circle, rgba(139,107,255,0.6) 0%, transparent 70%)" : "transparent",
        }}>
          <div style={{
            ...TB_ICON,
            background: a.primary ? "linear-gradient(135deg, #8B6BFF, #6e4dd6)" : "transparent",
            border: a.primary ? "none" : "1px solid rgba(255,255,255,0.15)",
            width: a.primary ? 48 : 36, height: a.primary ? 48 : 36,
            color: a.primary ? "#fff" : "rgba(255,255,255,0.7)",
          }}>{a.icon}</div>
          <div style={TB_LBL}>{a.label}</div>
          <div style={TB_SUB}>{a.sub}</div>
        </button>
      ))}
    </div>
  );
}


// ─── Styles ─────────────────────────────────────────────────────────
const ROOT: React.CSSProperties = {
  background: "#0a0814", color: "#fff",
  minHeight: "100vh", paddingBottom: 80,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const HDR: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 22px",
  background: "rgba(10,8,20,0.7)",
  backdropFilter: "blur(10px)",
  position: "sticky", top: 0, zIndex: 10,
};
const HDR_BACK: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "#fff", fontSize: 14, cursor: "pointer", padding: "6px 0",
  fontFamily: 'inherit',
};
const HDR_CENTER: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
};
const HDR_LOGO: React.CSSProperties = {
  fontWeight: 700, fontSize: 17, letterSpacing: "0.18em", color: "#fff",
};
const HDR_ACTIONS: React.CSSProperties = { display: "flex", gap: 18 };
const HDR_ACT: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "#fff", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center",
  fontFamily: 'inherit',
};

const HERO: React.CSSProperties = {
  position: "relative", padding: "32px 22px 24px",
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22,
  minHeight: 320,
};
const HERO_IMG: React.CSSProperties = {
  position: "absolute", top: 0, right: 0, bottom: 0, left: "40%",
  background: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1200px-Colosseo_2020.jpg") center/cover',
};
const HERO_GRAD: React.CSSProperties = {
  position: "absolute", top: 0, right: 0, bottom: 0, left: "40%",
  background: "linear-gradient(90deg, #0a0814 0%, transparent 30%)",
};
const HERO_TEXT: React.CSSProperties = { position: "relative", zIndex: 2 };
const CATEGORY_CHIP: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10, fontWeight: 700, color: "#8B6BFF",
  letterSpacing: "0.18em",
  marginBottom: 14,
};
const POI_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400, fontSize: 48, lineHeight: 1.05,
};
const LOC_ROW: React.CSSProperties = {
  marginTop: 10, display: "flex", alignItems: "center", gap: 6,
  fontSize: 14, color: "rgba(255,255,255,0.75)",
};
const RATING_ROW: React.CSSProperties = {
  marginTop: 8, display: "flex", alignItems: "center", gap: 6,
  fontSize: 14, color: "#fff",
};
const STAR: React.CSSProperties = { color: "#C9A961", fontSize: 14 };
const RATING_COUNT: React.CSSProperties = { color: "rgba(255,255,255,0.5)", fontSize: 12, marginLeft: 4 };
const POI_DESC: React.CSSProperties = {
  margin: "16px 0", fontSize: 13.5, lineHeight: 1.5,
  color: "rgba(255,255,255,0.72)",
};
const TAGS: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const TAG: React.CSSProperties = {
  fontSize: 11, padding: "5px 12px", borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.85)",
};

const DIST_INFO: React.CSSProperties = {
  position: "absolute", bottom: 24, right: 22,
  textAlign: "right" as const,
  zIndex: 2,
};
const DIST_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
  fontSize: 14, color: "#fff",
};
const NAV_BTN: React.CSSProperties = {
  width: 30, height: 30, borderRadius: "50%",
  background: "#8B6BFF", border: "none", color: "#fff",
  cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const SCHEDULE_ROW: React.CSSProperties = {
  marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.7)",
};

const TABS: React.CSSProperties = {
  display: "flex", gap: 20, padding: "0 22px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  overflowX: "auto" as const,
  scrollbarWidth: "none" as const,
};
const TAB: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "12px 0",
  background: "transparent", border: "none", borderBottom: "2px solid transparent",
  cursor: "pointer", fontFamily: 'inherit',
  flexShrink: 0,
};

const GRID3: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr",
  gap: 14, padding: "18px 22px",
};

const CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.12)",
  borderRadius: 16, padding: 18,
  margin: "18px 22px",
};
const CARD_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 6,
};
const CARD_TITLE: React.CSSProperties = {
  margin: 0, fontSize: 16, fontWeight: 600, color: "#fff",
};
const SEE_ALL: React.CSSProperties = {
  fontSize: 11, color: "#8B6BFF", cursor: "pointer",
  display: "inline-block", marginTop: 8,
};

const CAP_HERO: React.CSSProperties = {
  position: "relative", height: 160,
  background: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/800px-Colosseo_2020.jpg") center/cover',
};
const CAP_BADGE: React.CSSProperties = {
  position: "absolute", top: 10, left: 10,
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(139,107,255,0.85)",
  fontSize: 10, color: "#fff",
};
const CAP_TIME: React.CSSProperties = {
  position: "absolute", top: 10, right: 10,
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(0,0,0,0.7)",
  fontSize: 11, color: "#fff", fontWeight: 600,
};
const CAP_PLAY: React.CSSProperties = {
  position: "absolute", top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 50, height: 50, borderRadius: "50%",
  background: "rgba(255,255,255,0.9)", color: "#1f1b18",
  border: "none", fontSize: 18, cursor: "pointer",
};
const CAP_TITLE: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, color: "#fff",
};

const KD_ROW: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 10,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};
const KD_ICON: React.CSSProperties = { fontSize: 14, color: "#8B6BFF", marginTop: 2 };
const KD_LBL: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 2 };
const KD_VAL: React.CSSProperties = { fontSize: 12, color: "#fff", fontWeight: 500 };

const MINI_MAP: React.CSSProperties = {
  position: "relative", height: 140,
  background: "linear-gradient(135deg, #1a1428, #0f0a1f)",
  borderRadius: 12, marginTop: 10,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const MAP_PIN: React.CSSProperties = { fontSize: 28, color: "#8B6BFF" };
const HOW_BTN: React.CSSProperties = {
  marginTop: 10, width: "100%",
  padding: "10px 14px", borderRadius: 999,
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.4)",
  color: "#fff", fontSize: 12, cursor: "pointer",
  fontFamily: 'inherit',
};

const NARRATIVES_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 12,
};
const NARRATIVE_CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.4)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 14,
  padding: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  transition: "all 0.2s ease",
};
const NARRATIVE_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 8,
};
const NARRATIVE_ICON: React.CSSProperties = {
  fontSize: 18, color: "#8B6BFF",
};
const NARRATIVE_DUR: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "#fff",
  padding: "3px 8px", borderRadius: 999,
  background: "rgba(139,107,255,0.18)",
};
const NARRATIVE_TITLE: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 18, fontWeight: 400, color: "#fff",
  marginBottom: 4,
};
const NARRATIVE_HOOK: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.7)",
  fontStyle: "italic" as const,
  lineHeight: 1.4, marginBottom: 6,
};
const NARRATIVE_TYPE: React.CSSProperties = {
  fontSize: 9, color: "#8B6BFF",
  letterSpacing: "0.12em", fontWeight: 700,
};

const HIGHLIGHT: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 12, padding: 14,
};
const HIGHLIGHT_ICON: React.CSSProperties = { fontSize: 22, color: "#8B6BFF" };
const HIGHLIGHT_TITLE: React.CSSProperties = {
  marginTop: 8, fontSize: 13, fontWeight: 600, color: "#fff",
};
const HIGHLIGHT_DESC: React.CSSProperties = {
  marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.55)",
};

const ERA_PILLS: React.CSSProperties = {
  display: "flex", gap: 8, marginTop: 14,
};
const ERA_PILL: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 999,
  border: "none", fontSize: 12, fontWeight: 500,
  cursor: "pointer", fontFamily: 'inherit',
};
const ERA_GALLERY: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
  gap: 10, marginTop: 16,
};
const ERA_THUMB: React.CSSProperties = {
  borderRadius: 10, overflow: "hidden",
  background: "rgba(255,255,255,0.04)",
};
const ERA_IMG: React.CSSProperties = {
  width: "100%", height: 100,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const ERA_INFO: React.CSSProperties = { padding: "8px 10px" };
const ERA_LBL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#fff" };
const ERA_SUB: React.CSSProperties = { fontSize: 9.5, color: "rgba(255,255,255,0.5)", marginTop: 2 };

const REL_ROW_LINK: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0", textDecoration: "none", color: "inherit",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const REL_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const REL_THUMB: React.CSSProperties = {
  width: 56, height: 50, borderRadius: 8,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const REL_NAME: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const REL_DIST: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.5)" };

const MIND_HEAD: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
};
const MIND_TITLE: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "#fff",
};
const MIND_SUB: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.55)",
};
const MIND_PROMPT: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  width: "100%", padding: "12px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#fff", fontSize: 12, fontWeight: 500,
  marginBottom: 8,
  cursor: "pointer", fontFamily: 'inherit',
};
const MIND_SPEAK: React.CSSProperties = {
  marginTop: 10, width: "100%",
  padding: "12px 20px", borderRadius: 12,
  background: "linear-gradient(135deg, #8B6BFF, #6e4dd6)",
  border: "none", color: "#fff",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: 'inherit',
};

const TOOLBAR: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
  gap: 8, padding: "20px 22px 12px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const TB_ACT: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  background: "transparent", border: "none",
  cursor: "pointer", fontFamily: 'inherit',
};
const TB_ICON: React.CSSProperties = {
  borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, marginBottom: 6,
};
const TB_LBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#fff" };
const TB_SUB: React.CSSProperties = { fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 };

const EXP_BANNER: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  margin: "0 22px 22px",
  padding: "16px 20px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 16,
};
const EXP_TITLE: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "#fff" };
const EXP_SUB: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 };
const AVATARS: React.CSSProperties = { display: "flex", alignItems: "center" };
const AV: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%",
  background: "#8B6BFF", color: "#fff",
  border: "2px solid #0a0814",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 12,
};
const AV_COUNT: React.CSSProperties = {
  marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.7)",
};
const EXP_BTN: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 12,
  background: "linear-gradient(135deg, #8B6BFF, #6e4dd6)",
  border: "none", color: "#fff",
  fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: 'inherit',
};
