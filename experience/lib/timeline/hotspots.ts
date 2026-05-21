/**
 * KUDOS Experience · Time Machine · 5 hotspots Roma (MVP estricto)
 *
 * Cada hotspot aparece progresivamente según las eras en que ya existía.
 * Lo cinematográfico es eso: ves la ciudad formándose con el tiempo.
 *
 * Posiciones (x, y) en %, sobre un canvas cuadrado abstracto que
 * representa el centro histórico — NO un mapa geográfico preciso.
 */
import type { Hotspot } from "./types";

export const ROME_HOTSPOTS: Hotspot[] = [
  {
    id: "forum",
    name: "Foro Romano",
    primary_year: -600,
    cta_label: "Centro del poder republicano",
    position: { x: 52, y: 50 },
    appears_in: ["republic", "empire", "renaissance", "modern"],
    micro_context:
      "Aquí Roma decidió su destino. Curia, Rostra, Templo de Saturno. 1500 años de discursos y conspiraciones en este rectángulo.",
  },
  {
    id: "coliseum",
    name: "Coliseo",
    primary_year: 80,
    cta_label: "Anfiteatro Flavio",
    position: { x: 60, y: 53 },
    appears_in: ["empire", "renaissance", "modern"],
    micro_context:
      "50.000 espectadores. 100 días de juegos inaugurales. El estadio más letal del Imperio durante cuatro siglos.",
    capsule_slug: "colosseum",
  },
  {
    id: "pantheon",
    name: "Panteón",
    primary_year: 126,
    cta_label: "Templo de todos los dioses",
    position: { x: 44, y: 42 },
    appears_in: ["renaissance", "modern"],
    micro_context:
      "La cúpula de hormigón sin refuerzo más grande del mundo. Lleva 19 siglos en pie, intacta, con su óculo abierto al cielo.",
  },
  {
    id: "castel-sant-angelo",
    name: "Castel Sant'Angelo",
    primary_year: 139,
    cta_label: "Mausoleo · fortaleza · refugio",
    position: { x: 33, y: 35 },
    appears_in: ["renaissance", "modern"],
    micro_context:
      "Mausoleo imperial, fortaleza papal, prisión, refugio en los saqueos. Un edificio · cinco vidas en dos milenios.",
  },
  {
    id: "vatican",
    name: "Basílica de San Pedro",
    primary_year: 1626,
    cta_label: "Cúpula del mundo",
    position: { x: 24, y: 36 },
    appears_in: ["modern"],
    micro_context:
      "120 años de obra. Michelangelo a los 71 firmando una cúpula que cambió la arquitectura para siempre.",
  },
];

/** Búsqueda O(1) por id. */
export const ROME_HOTSPOT_INDEX = ROME_HOTSPOTS.reduce<Record<string, Hotspot>>(
  (acc, h) => {
    acc[h.id] = h;
    return acc;
  },
  {}
);
