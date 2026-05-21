/**
 * KUDOS Experience · Time Machine · 5 eras curadas de Roma
 *
 * Datos reales, narrativa documental-grade. Cada era tiene su atmósfera
 * propia (gradient + haze + glow) — la transición entre ellas es lo
 * que materializa la sensación de "el tiempo existe físicamente".
 */
import type { Era } from "./types";

export const ROME_ERAS: Era[] = [
  {
    id: "founding",
    year: -1000,
    label: "1000 a.C.",
    name: "Septimontium",
    micro_context:
      "Aldeas latinas dispersas en siete colinas. Roma aún no es Roma — son tribus mirándose entre humos de fogata, antes del nombre.",
    mood: "fundacional",
    sky_gradient: "linear-gradient(180deg, #1a0d0a 0%, #3e1f12 35%, #08050a 100%)",
    haze: "rgba(180, 70, 25, 0.22)",
    glow_color: "rgba(251, 146, 60, 0.55)", // amber · fuego primitivo
  },
  {
    id: "republic",
    year: -44,
    label: "44 a.C.",
    name: "República tardía",
    micro_context:
      "El Foro late. Julio César acaba de ser asesinado en los Idus de Marzo. La República trastabilla hacia su última década.",
    mood: "republicana",
    sky_gradient: "linear-gradient(180deg, #1a1428 0%, #3a2649 40%, #050816 100%)",
    haze: "rgba(140, 80, 160, 0.20)",
    glow_color: "rgba(196, 181, 253, 0.55)", // lavender · poder dudoso
  },
  {
    id: "empire",
    year: 80,
    label: "80 d.C.",
    name: "Apogeo imperial",
    micro_context:
      "Tito inaugura el Coliseo con 100 días de juegos. Roma tiene un millón de habitantes — la ciudad más densa del mundo conocido.",
    mood: "imperial",
    sky_gradient: "linear-gradient(180deg, #1f1218 0%, #4a1d2f 40%, #060410 100%)",
    haze: "rgba(180, 50, 80, 0.22)",
    glow_color: "rgba(248, 113, 113, 0.55)", // rose-red · sangre y mármol
  },
  {
    id: "renaissance",
    year: 1500,
    label: "1500 d.C.",
    name: "Renacimiento",
    micro_context:
      "Bramante diseña la nueva San Pedro. El Vaticano se reescribe en mármol. Michelangelo entra en escena con 25 años.",
    mood: "renacentista",
    sky_gradient: "linear-gradient(180deg, #0d1638 0%, #2e3a78 40%, #050816 100%)",
    haze: "rgba(80, 120, 220, 0.20)",
    glow_color: "rgba(125, 211, 252, 0.55)", // sky-blue · cielo de fresco
  },
  {
    id: "modern",
    year: 2026,
    label: "2026 d.C.",
    name: "Roma viva",
    micro_context:
      "28 siglos coexistiendo en el mismo espacio físico. Cada cuadra contiene estratos romanos, paleocristianos, medievales, barrocos, modernos.",
    mood: "moderna",
    sky_gradient: "linear-gradient(180deg, #050816 0%, #1b1b40 40%, #040614 100%)",
    haze: "rgba(70, 80, 150, 0.16)",
    glow_color: "rgba(167, 139, 250, 0.55)", // brand purple · presente
  },
];

/** Era default al cargar la página. */
export const DEFAULT_ERA_ID: Era["id"] = "empire";

/** Acceso O(1) por id. */
export const ROME_ERA_INDEX = ROME_ERAS.reduce<Record<string, Era>>((acc, e) => {
  acc[e.id] = e;
  return acc;
}, {});
