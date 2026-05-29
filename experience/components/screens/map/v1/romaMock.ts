/**
 * KUDOS - Map MVP - Datos mock Roma cinematográfica.
 *
 * POIs hardcoded posicionados como % izq/top sobre la imagen aérea.
 * NO usar coords lat/lng. NO cartografía. Solo posicionamiento visual.
 *
 * Para MVP V1 solo cubrimos Roma. En v2 ampliamos a 5 ciudades, en v3
 * 50, etc. Pero la maqueta es Roma: enfoquemos.
 */
export type MapTier = "A" | "B" | "C";
export type MapCategory = "historia" | "cultura" | "arte" | "naturaleza";
export type MapEra = "hoy" | "ancient";  // 80 d.C.

export interface MapPOI {
  id: string;
  poi_id: string;        // wd-Q* o legacy id, usado al click
  name: string;
  category: MapCategory;
  tier: MapTier;
  /** posición en % sobre el fondo (0..100) */
  x_pct: number;
  y_pct: number;
  visible_in: MapEra[];  // si solo "hoy", no aparece en 80 d.C., etc.
  label_below?: string;  // subtítulo bajo el nombre (ej: "Historia · 2.000 años")
}


// Imágenes aéreas de Roma (CDN público, fallback gradient)
export const MAP_BG = {
  hoy:
    "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=2400&q=85",
  ancient:
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=2400&q=85",
};


export const ROMA_POIS: MapPOI[] = [
  // -------- TIER A (dorado, destacado) --------
  {
    id: "coliseo",
    poi_id: "wd-Q10285",
    name: "Coliseo",
    category: "historia",
    tier: "A",
    x_pct: 64,
    y_pct: 50,
    visible_in: ["hoy", "ancient"],
    label_below: "Historia · 2.000 años",
  },

  // -------- TIER B (morado, medio) --------
  {
    id: "vaticano",
    poi_id: "wd-Q237",
    name: "Vaticano",
    category: "historia",
    tier: "B",
    x_pct: 18,
    y_pct: 40,
    visible_in: ["hoy"],
    label_below: "Historia · Religión",
  },
  {
    id: "panteon",
    poi_id: "wd-Q1387",
    name: "Panteón",
    category: "historia",
    tier: "B",
    x_pct: 42,
    y_pct: 35,
    visible_in: ["hoy", "ancient"],
    label_below: "Historia · Arquitectura",
  },
  {
    id: "foro-romano",
    poi_id: "wd-Q180212",
    name: "Foro Romano",
    category: "historia",
    tier: "B",
    x_pct: 50,
    y_pct: 68,
    visible_in: ["hoy", "ancient"],
    label_below: "Historia · Imperio",
  },

  // -------- TIER C (tenue, pequeño) --------
  {
    id: "trastevere",
    poi_id: "wd-Q244640",
    name: "Trastevere",
    category: "cultura",
    tier: "C",
    x_pct: 28,
    y_pct: 62,
    visible_in: ["hoy"],
    label_below: "Cultura · Vida local",
  },
  {
    id: "villa-borghese",
    poi_id: "wd-Q666238",
    name: "Villa Borghese",
    category: "naturaleza",
    tier: "C",
    x_pct: 75,
    y_pct: 22,
    visible_in: ["hoy"],
    label_below: "Naturaleza · Arte",
  },
  {
    id: "circo-maximo",
    poi_id: "wd-Q198326",
    name: "Circo Máximo",
    category: "historia",
    tier: "C",
    x_pct: 78,
    y_pct: 72,
    visible_in: ["hoy", "ancient"],
    label_below: "Historia · Antigua Roma",
  },
  {
    id: "termas-caracalla",
    poi_id: "wd-Q165693",
    name: "Termas de Caracalla",
    category: "historia",
    tier: "C",
    x_pct: 60,
    y_pct: 80,
    visible_in: ["ancient"],
    label_below: "Historia · Imperio",
  },
];


/** Carousel inferior - 3 cards destacadas */
export interface MapBottomCard {
  poi_id: string;
  name: string;
  image_url: string;
  distance_label: string;
  duration_label: string;
  evocative: string;
  imperdible?: boolean;
}


export const ROMA_BOTTOM_CARDS: MapBottomCard[] = [
  {
    poi_id: "wd-Q1387",
    name: "Panteón",
    image_url:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80",
    distance_label: "2 min",
    duration_label: "2 min",
    evocative: "Ingeniería perfecta. La cúpula que aún hoy sorprende.",
  },
  {
    poi_id: "wd-Q10285",
    name: "Coliseo",
    image_url:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80",
    distance_label: "320 m",
    duration_label: "5 min",
    evocative:
      "El mayor anfiteatro del Imperio Romano. Aquí se vivieron épicas batallas que cambiaron la historia.",
    imperdible: true,
  },
  {
    poi_id: "wd-Q180212",
    name: "Foro Romano",
    image_url:
      "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=600&q=80",
    distance_label: "1,2 km",
    duration_label: "8 min",
    evocative:
      "El corazón político, religioso y comercial de la antigua Roma.",
  },
];


export const FILTERS: { id: MapCategory; label: string }[] = [
  { id: "historia",   label: "Historia" },
  { id: "cultura",    label: "Cultura" },
  { id: "arte",       label: "Arte" },
  { id: "naturaleza", label: "Naturaleza" },
];
