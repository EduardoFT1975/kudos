"use client";
/**
 * KUDOS Home V2 · CoreDelDia hero.
 *
 * Hero rotativo que muestra UNO de los 7 Humanity Core segun el dia de la semana.
 * Lunes = Olduvai, Martes = Gobekli Tepe, ..., Domingo = Hiroshima.
 *
 * 1 solo CTA: "Descubrir hoy" -> /core/[id]
 *
 * NO carruseles. NO autoplay video. NO multiple botones.
 * Disciplina maxima: 1 idea, 1 imagen, 1 accion.
 */
import * as React from "react";
import { useRouter } from "next/navigation";


interface CoreEntry {
  poi_id: string;
  name: string;
  country: string;
  pillar: string;
  hook: string;
  gradient: string;
  emoji: string;
}


// Orden semanal canonico Lun-Dom (alineado con seed_humanity_core)
const CORE_BY_DAY: CoreEntry[] = [
  {
    poi_id: "wd-Q174045",
    name: "Olduvai Gorge",
    country: "Tanzania",
    pillar: "ORIGEN",
    hook: "Aqui descubrimos que no eramos los unicos.",
    gradient: "linear-gradient(135deg, #6e4dd6 0%, #c95858 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q1090052",
    name: "Gobekli Tepe",
    country: "Turquia",
    pillar: "SIGNIFICADO",
    hook: "Antes de la rueda, antes de la escritura, antes de la agricultura, alguien construyo esto.",
    gradient: "linear-gradient(135deg, #C9A961 0%, #8B6BFF 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q189780",
    name: "Lascaux",
    country: "Francia",
    pillar: "BELLEZA",
    hook: "Antes de saber escribir, ya sabiamos pintar lo que amabamos.",
    gradient: "linear-gradient(135deg, #E0815A 0%, #6e4dd6 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q1218",
    name: "Jerusalen",
    country: "Israel / Palestina",
    pillar: "CREENCIA",
    hook: "En 0,9 kilometros cuadrados se concentra la mitad de la fe humana.",
    gradient: "linear-gradient(135deg, #4080c8 0%, #8B6BFF 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q42797",
    name: "Galapagos",
    country: "Ecuador",
    pillar: "CONOCIMIENTO",
    hook: "En cinco semanas, un joven de veintiseis anos entendio que la vida cambia.",
    gradient: "linear-gradient(135deg, #4a9d5f 0%, #C9A961 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q1737",
    name: "Apollo 11",
    country: "Mar de la Tranquilidad",
    pillar: "EXPLORACION",
    hook: "La huella de Armstrong sigue intacta. Durara un millon de anos mas que tu.",
    gradient: "linear-gradient(135deg, #1a1333 0%, #4080c8 100%)",
    emoji: "·",
  },
  {
    poi_id: "wd-Q176330",
    name: "Hiroshima Peace Memorial",
    country: "Japon",
    pillar: "MEMORIA",
    hook: "A las 8:15 del 6 de agosto de 1945, una sola bomba mato a ochenta mil personas en nueve segundos.",
    gradient: "linear-gradient(135deg, #2a1219 0%, #c95858 100%)",
    emoji: "·",
  },
];


function getCoreForToday(): CoreEntry {
  // Lunes = 1 en JS getDay, Domingo = 0. Mapeamos a array 0=Lun ... 6=Dom.
  const d = new Date().getDay();
  const idx = d === 0 ? 6 : d - 1;
  return CORE_BY_DAY[idx];
}


export function CoreDelDia() {
  const router = useRouter();
  const core = React.useMemo(getCoreForToday, []);

  return (
    <section style={WRAP}>
      <div style={{ ...HERO, background: core.gradient }}>
        <div style={LABEL_ROW}>
          <span style={LABEL_TAG}>HUMANITY CORE</span>
          <span style={LABEL_PILLAR}>{core.pillar}</span>
        </div>

        <h1 style={NAME}>{core.name}</h1>
        <div style={COUNTRY}>{core.country}</div>

        <p style={HOOK}>{core.hook}</p>

        <button
          style={CTA}
          onClick={() => router.push(`/core/${core.poi_id}`)}
          aria-label={`Descubrir ${core.name}`}
        >
          Descubrir hoy
        </button>
      </div>
    </section>
  );
}


const WRAP: React.CSSProperties = {
  padding: "16px 16px 8px",
};

const HERO: React.CSSProperties = {
  position: "relative",
  minHeight: 460,
  borderRadius: 18,
  padding: "32px 24px 28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  color: "#fff",
  overflow: "hidden",
  boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
};

const LABEL_ROW: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 24,
  right: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 10,
  letterSpacing: "0.18em",
  fontWeight: 600,
};

const LABEL_TAG: React.CSSProperties = {
  background: "rgba(0,0,0,0.32)",
  padding: "5px 10px",
  borderRadius: 999,
  color: "#C9A961",
  letterSpacing: "0.18em",
};

const LABEL_PILLAR: React.CSSProperties = {
  color: "rgba(255,255,255,0.85)",
  letterSpacing: "0.16em",
};

const NAME: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 38,
  fontWeight: 600,
  lineHeight: 1.05,
  margin: "0 0 6px",
  letterSpacing: "-0.01em",
};

const COUNTRY: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.70)",
  marginBottom: 18,
  letterSpacing: "0.06em",
};

const HOOK: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 18,
  fontWeight: 400,
  fontStyle: "italic",
  lineHeight: 1.4,
  margin: "0 0 22px",
  color: "rgba(255,255,255,0.92)",
  maxWidth: 460,
};

const CTA: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "12px 22px",
  background: "rgba(255,255,255,0.94)",
  color: "#1a1333",
  border: "none",
  borderRadius: 999,
  fontFamily: 'var(--kudos-font-body, "Inter", system-ui, sans-serif)',
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.01em",
};
