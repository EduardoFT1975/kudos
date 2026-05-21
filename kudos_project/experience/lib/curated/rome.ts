/**
 * KUDOS Experience · curated Rome session (v0)
 *
 * 8 cápsulas curadas con datos reales del lugar (no mocks, no stock photos).
 * Estética cinematográfica garantizada vía gradient hero — cuando AXÓN
 * exponga `Capsule.image` para estas cápsulas, el Card las superpondrá.
 *
 * Cada entrada tiene:
 *   - id            slug interno (estable, para keys de React)
 *   - title         titular display
 *   - micro_context línea fina debajo del título (sensación documental)
 *   - era_label     pill superior izquierda
 *   - year          año canónico (negativo = a.C.)
 *   - place_slug    apunta a Place('rome') en AXÓN
 *   - gradient      hero fallback siempre presente
 *   - deep_link     destino del CTA "Explorar"
 *   - capsule_uid   (opcional) UID real de AXÓN si ya existe la cápsula
 *
 * Si en el futuro AXÓN tiene la cápsula con un UID conocido, añadirlo en
 * `capsule_uid` permite que el Discovery Feed la hidrate vía
 * /api/capsules/<uid>/light/.
 */

export interface CuratedCard {
  id: string;
  title: string;
  micro_context: string;
  era_label: string;
  year: number;
  place_slug: string;
  gradient: string;
  deep_link: string;
  capsule_uid?: string;
}

/** Gradientes de marca · cada uno transmite mood histórico distinto. */
const G = {
  imperial:   "linear-gradient(135deg, #1a0a2e 0%, #4b1d2f 45%, #050614 100%)",
  marble:     "linear-gradient(140deg, #1b1b40 0%, #3a2a55 50%, #060816 100%)",
  bronze:     "linear-gradient(150deg, #2a1a0a 0%, #5a341b 50%, #050614 100%)",
  sacred:     "linear-gradient(160deg, #0f1638 0%, #2c1a55 50%, #050816 100%)",
  fortress:   "linear-gradient(135deg, #1f1525 0%, #2e1b2e 55%, #040614 100%)",
  baroque:    "linear-gradient(140deg, #2a103a 0%, #4e1646 50%, #060816 100%)",
  aquatic:    "linear-gradient(135deg, #061633 0%, #163a55 50%, #040614 100%)",
  village:    "linear-gradient(145deg, #1b1430 0%, #44213a 50%, #050614 100%)",
} as const;

export const ROME_CURATED_CARDS: CuratedCard[] = [
  {
    id: "coliseum",
    title: "El Coliseo",
    micro_context:
      "50.000 espectadores. 100 días de juegos inaugurales. El estadio más letal del Imperio.",
    era_label: "80 d.C.",
    year: 80,
    place_slug: "rome",
    gradient: G.imperial,
    deep_link: "/capsules/colosseum",
  },
  {
    id: "forum",
    title: "Foro Romano",
    micro_context:
      "Aquí Roma decidía su destino. Hoy son escombros que hablan de mil quinientos años de poder.",
    era_label: "siglo VII a.C.",
    year: -600,
    place_slug: "rome",
    gradient: G.marble,
    deep_link: "/time/rome",
  },
  {
    id: "pantheon",
    title: "El Panteón",
    micro_context:
      "La cúpula de hormigón sin refuerzo más grande del mundo. Lleva 19 siglos en pie.",
    era_label: "126 d.C.",
    year: 126,
    place_slug: "rome",
    gradient: G.bronze,
    deep_link: "/time/rome",
  },
  {
    id: "saint-peter",
    title: "Basílica de San Pedro",
    micro_context:
      "120 años de obra. Michelangelo a los 71 firmando una cúpula que cambió la arquitectura.",
    era_label: "1626",
    year: 1626,
    place_slug: "rome",
    gradient: G.sacred,
    deep_link: "/time/rome",
  },
  {
    id: "castel-sant-angelo",
    title: "Castel Sant'Angelo",
    micro_context:
      "Mausoleo imperial, fortaleza papal, prisión, refugio en saqueos. Un edificio · cinco vidas.",
    era_label: "139 d.C.",
    year: 139,
    place_slug: "rome",
    gradient: G.fortress,
    deep_link: "/time/rome",
  },
  {
    id: "trevi",
    title: "Fontana di Trevi",
    micro_context:
      "Termina el Acueducto Virgo del año 19 a.C. La moneda lanzada al agua promete regreso.",
    era_label: "1762",
    year: 1762,
    place_slug: "rome",
    gradient: G.baroque,
    deep_link: "/time/rome",
  },
  {
    id: "caracalla",
    title: "Termas de Caracalla",
    micro_context:
      "1.600 personas a la vez. Mosaicos, bibliotecas, gimnasios. El bienestar como espectáculo.",
    era_label: "216 d.C.",
    year: 216,
    place_slug: "rome",
    gradient: G.aquatic,
    deep_link: "/time/rome",
  },
  {
    id: "trastevere",
    title: "Trastevere",
    micro_context:
      "Barrio nocturno donde Roma deja de ser monumento y empieza a ser ciudad viva.",
    era_label: "siglo XIV",
    year: 1350,
    place_slug: "rome",
    gradient: G.village,
    deep_link: "/time/rome",
  },
];

/**
 * UIDs de cápsulas AXÓN reales que correspondan a esta sesión.
 * Vacío hasta que AXÓN ejecute import_wikipedia + seed_rome.
 *
 * El Discovery Feed intentará hidratar cada UID; si 404, mantiene el
 * curated data como respaldo visual (sigue siendo contenido real, no mock).
 */
export const ROME_CURATED_UIDS: string[] = [];
