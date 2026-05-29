"use client";
/**
 * KUDOS POI Node V2 · refactor T3.2 EJEC Day 4.
 *
 * 6 secciones canonicas (T3.1 Bloque 4):
 *   1. INFO        - hero foto + nombre + flag + tags + datos clave
 *   2. HISTORIA    - encuadre breve narrativo (~200 palabras)
 *   3. WHY MATTERS - WHY IT MATTERS si existe en backend para este POI
 *   4. SHIFT       - Discovery Shift Card (si POI Core/Omega)
 *   5. RELATED     - 3 POIs vinculados ("Donde te lleva esto")
 *   6. ACTION      - ActionPotentialCard
 *
 * Tracking automatico:
 *   - node_open al mount
 *   - poi_scroll_depth en 25%, 50%, 75%, 100%
 *   - capsule_complete si llega al final
 *
 * Defensive: si POI no tiene WHY MATTERS o shift, se ocultan esas secciones.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";
import { ResonancePicker } from "@/components/discovery/ResonancePicker";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";
import { useScrollDepth } from "@/components/discovery/useScrollDepth";
import { useTimeOnScreen } from "@/components/discovery/useTimeOnScreen";
import { Track } from "@/components/discovery/kudosTelemetry";
import { useNarratives, TYPE_ICON } from "@/components/discovery/useNarratives";
import { usePoiData } from "@/components/discovery/usePoiData";
import { useSignals } from "@/components/discovery/useSignals";
import { RelatedHumanityRail } from "./RelatedHumanityRail";
import { ActionPotentialCard } from "./ActionPotentialCard";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface Props { poiId: string; }


interface CoreData {
  pillar: string | null;
  narrative: { hook: string | null; body_md: string | null; title: string | null } | null;
  shift: { before: string; discovery: string; after: string; action_potential?: string | null } | null;
}


export function PoiNodeV5({ poiId }: Props) {
  const router = useRouter();
  const { poi: realPoi } = usePoiData(poiId);
  const { data: signals } = useSignals(poiId);
  const [coreData, setCoreData] = React.useState<CoreData | null>(null);

  // HDG capturas
  React.useEffect(() => { Track.nodeOpen(poiId); }, [poiId]);
  useTimeOnScreen("poi_time_on_screen", poiId);
  useScrollDepth(poiId);

  // Si el POI es Core, cargar narrative + shift del backend
  React.useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/core/${poiId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j) setCoreData(j); })
      .catch(() => {});
  }, [poiId]);

  const poi = {
    name: realPoi?.name || "POI",
    category: realPoi?.category || "Lugar de interes",
    location: realPoi?.country || "-",
    flag: realPoi?.flag || "X",
    description: realPoi?.short_description || coreData?.narrative?.hook || "Sin descripcion.",
    tags: deriveTagsForCategory(realPoi?.category),
    keyData: deriveKeyData(realPoi?.category, realPoi?.country),
  };

  return (
    <div style={ROOT}>
      <Header onBack={() => router.back()} />

      {/* SECCION 1 - INFO */}
      <section style={HERO}>
        <div style={HERO_IMG} />
        <div style={HERO_GRAD} />
        <div style={HERO_TEXT}>
          {coreData?.pillar && (
            <span style={CORE_TAG}>HUMANITY CORE · {coreData.pillar.toUpperCase()}</span>
          )}
          <span style={CATEGORY_CHIP}>{poi.category}</span>
          <h1 style={POI_TITLE}>{poi.name}</h1>
          <div style={LOC_ROW}>
            <span>{poi.flag}</span>
            <span>{poi.location}</span>
          </div>
          <p style={POI_DESC}>{poi.description}</p>
          <div style={TAGS_ROW}>
            {poi.tags.map((t) => <span key={t} style={TAG}>{t}</span>)}
          </div>
        </div>
      </section>

      <section style={DATA_CARD}>
        <h4 style={SECTION_TITLE}>Datos clave</h4>
        {poi.keyData.map((d) => (
          <div key={d.label} style={KD_ROW}>
            <div style={KD_LBL}>{d.label}</div>
            <div style={KD_VAL}>{d.value}</div>
          </div>
        ))}
      </section>

      {/* SECCION 2 - HISTORIA breve */}
      <section style={STORY_BOX}>
        <div style={LABEL}>HISTORIA</div>
        <p style={STORY_TXT}>{poi.description}</p>
      </section>

      {/* SECCION 3 - WHY IT MATTERS (si Core) */}
      {coreData?.narrative?.body_md && (
        <section style={WHY_BOX}>
          <div style={LABEL_GOLD}>WHY IT MATTERS</div>
          {coreData.narrative.title && <h2 style={WHY_TITLE}>{coreData.narrative.title}</h2>}
          <NarrativeBody markdown={coreData.narrative.body_md} />
        </section>
      )}

      {/* SECCION 4 - DISCOVERY SHIFT CARD (si Core/Omega) */}
      {coreData?.shift && (
        <section style={SHIFT_BOX}>
          <div style={SHIFT_BLOCK}>
            <div style={SHIFT_LABEL}>ANTES</div>
            <p style={SHIFT_TEXT}>{coreData.shift.before}</p>
          </div>
          <div style={SHIFT_LINE} />
          <div style={SHIFT_BLOCK}>
            <div style={SHIFT_LABEL}>DESCUBRIMIENTO</div>
            <p style={SHIFT_TEXT}>{coreData.shift.discovery}</p>
          </div>
          <div style={SHIFT_LINE} />
          <div style={SHIFT_BLOCK}>
            <div style={SHIFT_LABEL}>AHORA PUEDES PENSAR</div>
            <p style={SHIFT_TEXT}>{coreData.shift.after}</p>
          </div>
        </section>
      )}

      {/* SECCION 5 - RELATED HUMANITY */}
      <RelatedHumanityRail poiId={poiId} />

      {/* SECCION 6 - ACTION POTENTIAL */}
      {coreData?.shift?.action_potential && (
        <ActionPotentialCard
          poiId={poiId}
          action={coreData.shift.action_potential}
          pillar={coreData.pillar}
        />
      )}

      {/* Resonancia + Save */}
      <section style={ACTIONS_BAR}>
        <ResonancePicker poiId={poiId} variant="full" />
        <div style={{ marginTop: 16 }}>
          <AddToMyWorldButton poiId={poiId} poiName={poi.name} variant="primary" />
        </div>
      </section>

      <div style={FOOTER}>
        <p style={FOOTER_TXT}>Cada POI es una pregunta.<br />La proxima vez que pases por aqui, vuelve.</p>
      </div>
    </div>
  );
}


function Header({ onBack }: { onBack: () => void }) {
  return (
    <header style={HDR}>
      <button style={HDR_BACK} onClick={onBack}>‹ Volver</button>
      <div style={HDR_CENTER}>
        <KudosFlowerLogo size={20} variant="gold" glow />
        <span style={HDR_LOGO}>KUDOS</span>
      </div>
      <div style={{ width: 60 }} />
    </header>
  );
}


function NarrativeBody({ markdown }: { markdown: string }) {
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


function deriveTagsForCategory(cat?: string): string[] {
  const c = (cat || "").toLowerCase();
  if (c.includes("monumento") || c.includes("imperio")) return ["Historia", "Arquitectura", "Imperio"];
  if (c.includes("religioso") || c.includes("iglesia")) return ["Espiritualidad", "Arte sacro", "Patrimonio"];
  if (c.includes("arqueol")) return ["Historia antigua", "Descubrimiento", "Civilizaciones"];
  if (c.includes("museo")) return ["Arte", "Conocimiento", "Cultura"];
  if (c.includes("natural") || c.includes("parque")) return ["Naturaleza", "Paisaje", "Biosfera"];
  return ["Cultura", "Viajes", "Patrimonio"];
}


function deriveKeyData(cat?: string, country?: string): { label: string; value: string }[] {
  const co = country || "-";
  const c = (cat || "").toLowerCase();
  if (c.includes("monumento") || c.includes("imperio")) return [
    { label: "Tipo",   value: "Monumento historico" },
    { label: "Pais",   value: co },
    { label: "Epoca",  value: "Antiguedad / Medieval" },
  ];
  if (c.includes("religioso") || c.includes("iglesia")) return [
    { label: "Culto",  value: "Patrimonio religioso" },
    { label: "Pais",   value: co },
    { label: "Estilo", value: "Gotico / Barroco" },
  ];
  if (c.includes("arqueol")) return [
    { label: "Yacimiento", value: "Sitio arqueologico" },
    { label: "Pais",       value: co },
    { label: "Antiguedad", value: "Mas de 1.000 anos" },
  ];
  if (c.includes("museo")) return [
    { label: "Tipo",       value: "Museo" },
    { label: "Pais",       value: co },
    { label: "Coleccion",  value: "Permanente / temporal" },
  ];
  return [
    { label: "Tipo",      value: cat || "Lugar de interes" },
    { label: "Pais",      value: co },
    { label: "Patrimonio", value: "Cultural / historico" },
  ];
}


// ===================== STYLES =====================
const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  paddingBottom: 110, color: "#fff",
  maxWidth: 720, margin: "0 auto",
};
const HDR: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "16px 20px",
};
const HDR_BACK: React.CSSProperties = {
  background: "transparent", border: "none", color: "rgba(255,255,255,0.7)",
  fontSize: 14, cursor: "pointer",
};
const HDR_CENTER: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
};
const HDR_LOGO: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 14, fontWeight: 700, letterSpacing: "0.18em",
};

const HERO: React.CSSProperties = {
  position: "relative",
  minHeight: 340, padding: "20px 24px 28px",
  background: "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)",
  overflow: "hidden" as const,
};
const HERO_IMG: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(10,8,20,0.95))",
  pointerEvents: "none",
};
const HERO_GRAD: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "radial-gradient(circle at top right, rgba(201,169,97,0.18), transparent 60%)",
  pointerEvents: "none",
};
const HERO_TEXT: React.CSSProperties = {
  position: "relative", zIndex: 1,
  display: "flex", flexDirection: "column",
  justifyContent: "flex-end", minHeight: 300,
};
const CORE_TAG: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(201,169,97,0.15)",
  border: "1px solid rgba(201,169,97,0.4)",
  fontSize: 9, letterSpacing: "0.22em", fontWeight: 600,
  color: "#C9A961", marginBottom: 12,
  width: "fit-content" as const,
};
const CATEGORY_CHIP: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10, letterSpacing: "0.16em", fontWeight: 600,
  color: "rgba(255,255,255,0.65)", marginBottom: 8,
  width: "fit-content" as const,
};
const POI_TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 36, fontWeight: 600, lineHeight: 1.05,
  margin: "0 0 8px", letterSpacing: "-0.01em",
};
const LOC_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 14,
};
const POI_DESC: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 14, lineHeight: 1.55,
  color: "rgba(255,255,255,0.85)", margin: "0 0 14px",
};
const TAGS_ROW: React.CSSProperties = {
  display: "flex", flexWrap: "wrap" as const, gap: 6,
};
const TAG: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  fontSize: 11, color: "rgba(255,255,255,0.75)",
};

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18, fontWeight: 500, color: "#fff",
  margin: "0 0 12px",
};

const DATA_CARD: React.CSSProperties = {
  margin: "20px 24px 8px",
  padding: "20px 18px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
};
const KD_ROW: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};
const KD_LBL: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.55)" };
const KD_VAL: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.92)", fontWeight: 500 };

const STORY_BOX: React.CSSProperties = {
  margin: "24px 24px 8px",
  padding: "20px 18px",
};
const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em", color: "rgba(201,169,97,0.85)",
  fontWeight: 600, marginBottom: 12,
};
const STORY_TXT: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.85)",
  margin: 0,
};

const WHY_BOX: React.CSSProperties = {
  margin: "32px 24px 8px",
  padding: "20px 18px",
  borderTop: "1px solid rgba(201,169,97,0.18)",
};
const LABEL_GOLD: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em", color: "#C9A961",
  fontWeight: 700, marginBottom: 14, marginTop: 6,
};
const WHY_TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 26, fontWeight: 600, lineHeight: 1.1,
  margin: "0 0 18px", letterSpacing: "-0.01em",
};
const BLOCK_LABEL: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.20em", color: "#C9A961",
  fontWeight: 600, marginTop: 20, marginBottom: 10,
};
const BODY_P: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 16, lineHeight: 1.65, color: "rgba(255,255,255,0.88)",
  margin: "0 0 16px",
};

const SHIFT_BOX: React.CSSProperties = {
  margin: "24px",
  padding: "26px 22px",
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
  fontSize: 16, lineHeight: 1.5,
  color: "rgba(255,255,255,0.92)", margin: 0,
};
const SHIFT_LINE: React.CSSProperties = {
  width: 1, height: 24, margin: "6px auto",
  background: "rgba(201,169,97,0.35)",
};

const ACTIONS_BAR: React.CSSProperties = {
  margin: "30px 24px 12px",
  padding: "18px 18px",
};

const FOOTER: React.CSSProperties = {
  marginTop: 40, padding: "20px 24px",
  textAlign: "center" as const,
};
const FOOTER_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 13, fontStyle: "italic",
  color: "rgba(255,255,255,0.4)", margin: 0,
  lineHeight: 1.6,
};
