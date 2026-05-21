/**
 * KUDOS Experience · Capsule curada · Coliseo
 *
 * Datos reales, narrativa documental-grade. Cada texto está pulido para
 * sentirse cinematográfico, no enciclopédico. Cero stock-photo, cero
 * fluff turístico.
 */
import type { Capsule } from "./types";

export const COLOSSEUM: Capsule = {
  slug: "colosseum",
  place_slug: "rome",
  primary_era_id: "empire",

  hero: {
    title: "El Coliseo",
    era_label: "80 d.C.",
    location: "Roma · Italia",
    micro_context:
      "50.000 espectadores. 100 días de juegos inaugurales. El estadio más letal del Imperio durante cuatro siglos.",
    badges: ["Anfiteatro Flavio", "Patrimonio UNESCO", "Roma imperial"],
  },

  timeline: [
    {
      id: "construction",
      year: 70,
      year_label: "70 d.C.",
      title: "Construcción",
      micro_context:
        "Vespasiano ordena levantarlo sobre el lago artificial de Nerón. Demanda 100.000 metros cúbicos de travertino.",
    },
    {
      id: "inauguration",
      year: 80,
      year_label: "80 d.C.",
      title: "Inauguración",
      micro_context:
        "Tito lo inaugura con 100 días de juegos. Mueren más de 9.000 animales. La ciudad no duerme durante meses.",
    },
    {
      id: "apogee",
      year: 150,
      year_label: "150 d.C.",
      title: "Apogeo",
      micro_context:
        "Bajo los Antoninos, alcanza su forma definitiva: cuatro órdenes arquitectónicos superpuestos en 50 metros de altura.",
    },
    {
      id: "decline",
      year: 440,
      year_label: "440 d.C.",
      title: "Último juego",
      micro_context:
        "Los últimos combates documentados. La cristianización del Imperio apaga la sed de espectáculo sangriento.",
    },
    {
      id: "present",
      year: 2026,
      year_label: "Hoy",
      title: "Presente vivo",
      micro_context:
        "7 millones de personas lo visitan cada año. Sigue siendo el monumento más reconocible del mundo occidental.",
    },
  ],

  context_blocks: [
    {
      id: "engineering",
      eyebrow: "Ingeniería a escala humana",
      body:
        "Ochenta accesos numerados y un sistema de pasillos radiales permitían evacuarlo en quince minutos. Un milagro logístico que Europa no volvería a igualar hasta el siglo XX.",
    },
    {
      id: "city-within",
      eyebrow: "Una ciudad bajo la arena",
      body:
        "Bajo el suelo de combate, el hipogeo: dos niveles subterráneos con jaulas, ascensores manuales y caminos para fieras. Toda una infraestructura invisible para mover el espectáculo.",
    },
    {
      id: "symbol",
      eyebrow: "Símbolo perpetuo",
      body:
        "Los papas medievales lo saquearon. Los bárbaros lo incendiaron. Los terremotos lo partieron. Diecinueve siglos después, sigue siendo el icono más fotografiado del planeta.",
    },
  ],

  media: [
    {
      id: "arch",
      kind: "arch",
      caption: "Arco modular · 80 repeticiones",
      gradient: "linear-gradient(150deg, #2a0e18 0%, #4a1a2a 55%, #08050a 100%)",
    },
    {
      id: "column",
      kind: "column",
      caption: "Cuatro órdenes superpuestos",
      gradient: "linear-gradient(160deg, #1a0d28 0%, #3e2055 55%, #05060f 100%)",
    },
    {
      id: "aerial",
      kind: "aerial",
      caption: "Planta elíptica · 188 × 156 m",
      gradient: "linear-gradient(135deg, #1f1018 0%, #5a2a3a 55%, #060410 100%)",
    },
    {
      id: "vomitoria",
      kind: "vomitoria",
      caption: "80 vomitoria · evacuación radial",
      gradient: "linear-gradient(145deg, #190f1e 0%, #3e1a3a 55%, #050614 100%)",
    },
  ],

  relations: [
    { id: "gladiators",    name: "Gladiadores",       kind: "Cultura" },
    { id: "forum",         name: "Foro Romano",       kind: "Lugar",      slug: "forum-romanum" },
    { id: "caesar",        name: "Julio César",       kind: "Personaje" },
    { id: "empire",        name: "Roma imperial",     kind: "Era" },
    { id: "engineering",   name: "Ingeniería romana", kind: "Tecnología" },
  ],
};
