/**
 * KUDOS · Top POIs del mundo (Wave 1 · 70 lugares).
 *
 * Se genera con kudos_engine/scripts/seed_world_pois.py.
 * Estos lugares se concatenan a los PLACES y ECHOES del fixtures.ts principal,
 * dando cobertura mundial al mapa sin tener que escribir narrativas densas
 * para cada uno (vienen con echo "lite" auto-generado).
 *
 * Para añadir más lugares: edita la lista en seed_world_pois.py y re-ejecuta.
 * Las cápsulas ricas se generan después con `python -m kudos_engine generate`.
 */

import type { EraId, MockPlace, MockEcho } from "./fixtures";


type GlobalSeed = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  era: EraId;
  tag: string;          // "monumento", "museo", "naturaleza", "ciudad"
  subtitle: string;     // 1 línea evocadora
  silhouette: MockEcho["silhouette"];
  gradientFrom: string;
  gradientTo: string;
  /** Wikimedia Commons filename · opcional. Si vacío, se usa silueta */
  heroFilename?: string;
};


// ─── Lista curada · 70 POIs top mundo ────────────────────────────────────
// Notas: se evitan duplicados con PLACES principales (rome, paris, athens,
// granada, barcelona, tokyo, machu, washington, petra, istanbul, cusco,
// salamanca, santiago, pontevedra, ogrove).
const GLOBAL_SEEDS: ReadonlyArray<GlobalSeed> = [
  // ─── Europa ────────────────────────────────────────────────────────────
  { id: "g-eiffel",       name: "Torre Eiffel",                  country: "Francia",        lat: 48.8584, lng:   2.2945, era: "modern",      tag: "monumento", subtitle: "El hierro que se hizo símbolo.",            silhouette: "tower",     gradientFrom: "#8B5CF6", gradientTo: "#EC4899" },
  { id: "g-sagrada",      name: "Sagrada Familia",               country: "España",         lat: 41.4036, lng:   2.1744, era: "modern",      tag: "monumento", subtitle: "Cien años para tocar el cielo.",            silhouette: "tower",     gradientFrom: "#F59E0B", gradientTo: "#EF4444" },
  { id: "g-bigben",       name: "Big Ben",                       country: "Reino Unido",    lat: 51.5007, lng:  -0.1246, era: "modern",      tag: "monumento", subtitle: "El reloj que marca al mundo.",              silhouette: "tower",     gradientFrom: "#3B82F6", gradientTo: "#1E40AF" },
  { id: "g-neuschwan",    name: "Neuschwanstein",                country: "Alemania",       lat: 47.5576, lng:  10.7498, era: "modern",      tag: "monumento", subtitle: "El castillo que soñó Disney.",              silhouette: "cathedral",    gradientFrom: "#06B6D4", gradientTo: "#3B82F6" },
  { id: "g-msm",          name: "Mont Saint-Michel",             country: "Francia",        lat: 48.6361, lng:  -1.5115, era: "medieval",    tag: "monumento", subtitle: "Una isla que reza al mar.",                 silhouette: "cathedral",     gradientFrom: "#A78BFA", gradientTo: "#6366F1" },
  { id: "g-notredame",    name: "Notre-Dame de París",           country: "Francia",        lat: 48.8530, lng:   2.3499, era: "medieval",    tag: "monumento", subtitle: "La catedral que sobrevive al fuego.",       silhouette: "cathedral", gradientFrom: "#F97316", gradientTo: "#DC2626" },
  { id: "g-louvre",       name: "Museo del Louvre",              country: "Francia",        lat: 48.8606, lng:   2.3376, era: "modern",      tag: "museo",     subtitle: "El museo más visitado del planeta.",        silhouette: "mountain",   gradientFrom: "#EAB308", gradientTo: "#F59E0B" },
  { id: "g-versailles",   name: "Versalles",                     country: "Francia",        lat: 48.8049, lng:   2.1204, era: "modern",      tag: "monumento", subtitle: "El palacio del Rey Sol.",                   silhouette: "cathedral",    gradientFrom: "#FBBF24", gradientTo: "#F59E0B" },
  { id: "g-stonehenge",   name: "Stonehenge",                    country: "Reino Unido",    lat: 51.1789, lng:  -1.8262, era: "roman",       tag: "monumento", subtitle: "Piedras que siguen guardando un secreto.",  silhouette: "mountain",    gradientFrom: "#6B7280", gradientTo: "#374151" },
  { id: "g-brandenburg",  name: "Puerta de Brandeburgo",         country: "Alemania",       lat: 52.5163, lng:  13.3777, era: "modern",      tag: "monumento", subtitle: "El umbral entre dos siglos.",               silhouette: "tower",      gradientFrom: "#475569", gradientTo: "#0F172A" },
  { id: "g-praga",        name: "Castillo de Praga",             country: "República Checa", lat: 50.0911, lng: 14.4001, era: "medieval",    tag: "monumento", subtitle: "Mil años sobre el Moldava.",                silhouette: "cathedral",    gradientFrom: "#FB923C", gradientTo: "#9A3412" },
  { id: "g-vatican",      name: "Capilla Sixtina",               country: "Ciudad del Vaticano", lat: 41.9029, lng: 12.4545, era: "renaissance", tag: "monumento", subtitle: "El techo donde Miguel Ángel tocó a Dios.", silhouette: "cathedral",      gradientFrom: "#FACC15", gradientTo: "#B45309" },
  { id: "g-venice",       name: "Plaza de San Marcos",           country: "Italia",         lat: 45.4341, lng:  12.3388, era: "medieval",    tag: "monumento", subtitle: "El salón de Europa, sobre agua.",           silhouette: "tower",     gradientFrom: "#22D3EE", gradientTo: "#0891B2" },
  { id: "g-pisa",         name: "Torre de Pisa",                 country: "Italia",         lat: 43.7230, lng:  10.3966, era: "medieval",    tag: "monumento", subtitle: "Cae despacio desde hace 800 años.",         silhouette: "tower",     gradientFrom: "#FCD34D", gradientTo: "#92400E" },
  { id: "g-florencia",    name: "Catedral de Florencia",         country: "Italia",         lat: 43.7731, lng:  11.2560, era: "renaissance", tag: "monumento", subtitle: "La cúpula que inventó el Renacimiento.",    silhouette: "cathedral",      gradientFrom: "#FB7185", gradientTo: "#BE123C" },
  { id: "g-pompeya",      name: "Pompeya",                       country: "Italia",         lat: 40.7497, lng:  14.4869, era: "roman",       tag: "monumento", subtitle: "La ciudad que el tiempo congeló.",          silhouette: "city",     gradientFrom: "#D97706", gradientTo: "#7C2D12" },
  { id: "g-cordoba",      name: "Mezquita de Córdoba",           country: "España",         lat: 37.8790, lng:  -4.7794, era: "medieval",    tag: "monumento", subtitle: "Donde dos religiones tejieron arcos.",      silhouette: "tower",      gradientFrom: "#F97316", gradientTo: "#9A3412" },
  { id: "g-sevilla",      name: "Catedral de Sevilla",           country: "España",         lat: 37.3858, lng:  -5.9930, era: "medieval",    tag: "monumento", subtitle: "La catedral gótica más grande del mundo.",  silhouette: "cathedral", gradientFrom: "#EAB308", gradientTo: "#854D0E" },
  { id: "g-burgos",       name: "Catedral de Burgos",            country: "España",         lat: 42.3406, lng:  -3.7044, era: "medieval",    tag: "monumento", subtitle: "Encaje de piedra en mitad de Castilla.",    silhouette: "cathedral", gradientFrom: "#F59E0B", gradientTo: "#92400E" },
  { id: "g-escorial",     name: "El Escorial",                   country: "España",         lat: 40.5887, lng:  -4.1466, era: "renaissance", tag: "monumento", subtitle: "El cuadrado que reordenó un imperio.",      silhouette: "cathedral",    gradientFrom: "#6B7280", gradientTo: "#1F2937" },
  { id: "g-toledo",       name: "Toledo",                        country: "España",         lat: 39.8628, lng:  -4.0273, era: "medieval",    tag: "monumento", subtitle: "Tres culturas, una ciudad eterna.",         silhouette: "cathedral",    gradientFrom: "#CA8A04", gradientTo: "#713F12" },
  { id: "g-bilbao",       name: "Guggenheim Bilbao",             country: "España",         lat: 43.2687, lng:  -2.9340, era: "today",       tag: "museo",     subtitle: "Titanio que cambió un puerto.",             silhouette: "city",    gradientFrom: "#A1A1AA", gradientTo: "#52525B" },
  { id: "g-prado",        name: "Museo del Prado",               country: "España",         lat: 40.4138, lng:  -3.6921, era: "modern",      tag: "museo",     subtitle: "Velázquez, Goya y el alma española.",       silhouette: "cathedral",    gradientFrom: "#DC2626", gradientTo: "#7F1D1D" },
  { id: "g-portoabey",    name: "Torre de Belém",                country: "Portugal",       lat: 38.6916, lng:  -9.2160, era: "renaissance", tag: "monumento", subtitle: "La puerta del Atlántico portugués.",        silhouette: "tower",     gradientFrom: "#FB923C", gradientTo: "#9A3412" },
  { id: "g-lisbon",       name: "Tranvía 28 · Lisboa",           country: "Portugal",       lat: 38.7138, lng:  -9.1340, era: "today",       tag: "ciudad",    subtitle: "Sube las colinas con campanilla.",          silhouette: "city",      gradientFrom: "#FBBF24", gradientTo: "#B45309" },
  { id: "g-redsq",        name: "Plaza Roja",                    country: "Rusia",          lat: 55.7539, lng:  37.6208, era: "modern",      tag: "monumento", subtitle: "El corazón ceremonial de Rusia.",           silhouette: "tower",     gradientFrom: "#F43F5E", gradientTo: "#881337" },
  { id: "g-amsterdam",    name: "Canales de Ámsterdam",          country: "Países Bajos",   lat: 52.3676, lng:   4.9041, era: "renaissance", tag: "ciudad",    subtitle: "La ciudad que negoció con el agua.",        silhouette: "city",      gradientFrom: "#10B981", gradientTo: "#065F46" },
  { id: "g-copenhagen",   name: "Nyhavn · Copenhague",           country: "Dinamarca",      lat: 55.6802, lng:  12.5916, era: "modern",      tag: "ciudad",    subtitle: "El puerto que pintó Andersen.",             silhouette: "city",      gradientFrom: "#F97316", gradientTo: "#9A3412" },
  { id: "g-edinburgh",    name: "Castillo de Edimburgo",         country: "Reino Unido",    lat: 55.9486, lng:  -3.1999, era: "medieval",    tag: "monumento", subtitle: "Roca, niebla y reyes.",                     silhouette: "cathedral",    gradientFrom: "#6B7280", gradientTo: "#111827" },
  { id: "g-dubrovnik",    name: "Dubrovnik",                     country: "Croacia",        lat: 42.6507, lng:  18.0944, era: "medieval",    tag: "ciudad",    subtitle: "La perla amurallada del Adriático.",        silhouette: "city",      gradientFrom: "#F97316", gradientTo: "#7C2D12" },

  // ─── Asia ──────────────────────────────────────────────────────────────
  { id: "g-taj",          name: "Taj Mahal",                     country: "India",          lat: 27.1751, lng:  78.0421, era: "renaissance", tag: "monumento", subtitle: "El mausoleo que el amor levantó.",          silhouette: "cathedral",      gradientFrom: "#FAFAFA", gradientTo: "#D4D4D8" },
  { id: "g-greatwall",    name: "Gran Muralla China",            country: "China",          lat: 40.4319, lng: 116.5704, era: "medieval",    tag: "monumento", subtitle: "21.000 km cosidos a la tierra.",            silhouette: "city",     gradientFrom: "#A16207", gradientTo: "#422006" },
  { id: "g-forbidden",    name: "Ciudad Prohibida",              country: "China",          lat: 39.9163, lng: 116.3972, era: "medieval",    tag: "monumento", subtitle: "El palacio que el pueblo no podía pisar.",  silhouette: "cathedral",    gradientFrom: "#DC2626", gradientTo: "#7F1D1D" },
  { id: "g-terracota",    name: "Guerreros de Xi'an",            country: "China",          lat: 34.3848, lng: 109.2734, era: "roman",       tag: "monumento", subtitle: "Un ejército de barro para la eternidad.",   silhouette: "city",     gradientFrom: "#A16207", gradientTo: "#451A03" },
  { id: "g-angkor",       name: "Angkor Wat",                    country: "Camboya",        lat: 13.4125, lng: 103.8670, era: "medieval",    tag: "monumento", subtitle: "El templo más grande jamás construido.",    silhouette: "temple",    gradientFrom: "#65A30D", gradientTo: "#365314" },
  { id: "g-bagan",        name: "Bagan",                         country: "Myanmar",        lat: 21.1717, lng:  94.8585, era: "medieval",    tag: "monumento", subtitle: "Mil templos amaneciendo en bruma.",         silhouette: "temple",    gradientFrom: "#F59E0B", gradientTo: "#7C2D12" },
  { id: "g-borobudur",    name: "Borobudur",                     country: "Indonesia",      lat: -7.6079, lng: 110.2038, era: "medieval",    tag: "monumento", subtitle: "Una montaña de Buda en piedra.",            silhouette: "cathedral",      gradientFrom: "#84CC16", gradientTo: "#3F6212" },
  { id: "g-petronas",     name: "Torres Petronas",               country: "Malasia",        lat:  3.1579, lng: 101.7116, era: "today",       tag: "monumento", subtitle: "Gemelas que tocaron el cielo.",             silhouette: "tower",     gradientFrom: "#06B6D4", gradientTo: "#155E75" },
  { id: "g-kyoto",        name: "Kinkaku-ji",                    country: "Japón",          lat: 35.0394, lng: 135.7292, era: "medieval",    tag: "monumento", subtitle: "El pabellón de oro entre estanques.",       silhouette: "temple",    gradientFrom: "#FACC15", gradientTo: "#854D0E" },
  { id: "g-mtfuji",       name: "Monte Fuji",                    country: "Japón",          lat: 35.3606, lng: 138.7274, era: "today",       tag: "naturaleza", subtitle: "La montaña sagrada de Hokusai.",            silhouette: "mountain",  gradientFrom: "#A5B4FC", gradientTo: "#4338CA" },
  { id: "g-fushimi",      name: "Fushimi Inari",                 country: "Japón",          lat: 34.9671, lng: 135.7727, era: "medieval",    tag: "monumento", subtitle: "Diez mil puertas naranjas hacia el dios.",  silhouette: "temple",     gradientFrom: "#F97316", gradientTo: "#9A3412" },
  { id: "g-burj",         name: "Burj Khalifa",                  country: "EAU",            lat: 25.1972, lng:  55.2744, era: "today",       tag: "monumento", subtitle: "828 metros del desierto al cielo.",         silhouette: "tower",     gradientFrom: "#FCD34D", gradientTo: "#B45309" },
  { id: "g-jerusalem",    name: "Muro de las Lamentaciones",     country: "Israel",         lat: 31.7767, lng:  35.2345, era: "roman",       tag: "monumento", subtitle: "Donde tres religiones susurran.",           silhouette: "city",     gradientFrom: "#FACC15", gradientTo: "#713F12" },
  { id: "g-bluemosque",   name: "Mezquita Azul",                 country: "Turquía",        lat: 41.0054, lng:  28.9768, era: "renaissance", tag: "monumento", subtitle: "Seis minaretes y un cielo turquesa.",       silhouette: "cathedral",      gradientFrom: "#06B6D4", gradientTo: "#155E75" },
  { id: "g-persepolis",   name: "Persépolis",                    country: "Irán",           lat: 29.9354, lng:  52.8916, era: "roman",       tag: "monumento", subtitle: "La capital persa que Alejandro quemó.",     silhouette: "city",     gradientFrom: "#D97706", gradientTo: "#7C2D12" },
  { id: "g-samarkand",    name: "Samarcanda",                    country: "Uzbekistán",     lat: 39.6542, lng:  66.9597, era: "medieval",    tag: "monumento", subtitle: "El cruce de caminos de la Ruta de la Seda.", silhouette: "cathedral",     gradientFrom: "#22D3EE", gradientTo: "#0E7490" },

  // ─── América ───────────────────────────────────────────────────────────
  { id: "g-libertad",     name: "Estatua de la Libertad",        country: "EE.UU.",         lat: 40.6892, lng: -74.0445, era: "modern",      tag: "monumento", subtitle: "Un regalo francés que se hizo americano.",  silhouette: "tower",    gradientFrom: "#34D399", gradientTo: "#065F46" },
  { id: "g-empire",       name: "Empire State Building",         country: "EE.UU.",         lat: 40.7484, lng: -73.9857, era: "modern",      tag: "monumento", subtitle: "El rascacielos que King Kong escaló.",      silhouette: "tower",     gradientFrom: "#94A3B8", gradientTo: "#1E293B" },
  { id: "g-goldengate",   name: "Golden Gate",                   country: "EE.UU.",         lat: 37.8199, lng: -122.4783, era: "modern",     tag: "monumento", subtitle: "Naranja sobre niebla del Pacífico.",        silhouette: "city",    gradientFrom: "#EF4444", gradientTo: "#7F1D1D" },
  { id: "g-grand",        name: "Gran Cañón",                    country: "EE.UU.",         lat: 36.1069, lng: -112.1129, era: "today",      tag: "naturaleza", subtitle: "Seis millones de años abriendo la tierra.", silhouette: "mountain",  gradientFrom: "#EA580C", gradientTo: "#7C2D12" },
  { id: "g-niagara",      name: "Cataratas del Niágara",         country: "Canadá",         lat: 43.0962, lng: -79.0377, era: "today",       tag: "naturaleza", subtitle: "168.000 m³ por segundo cayendo.",           silhouette: "mountain",     gradientFrom: "#22D3EE", gradientTo: "#0E7490" },
  { id: "g-cn",           name: "Torre CN",                      country: "Canadá",         lat: 43.6426, lng: -79.3871, era: "modern",      tag: "monumento", subtitle: "La aguja que define Toronto.",              silhouette: "tower",     gradientFrom: "#94A3B8", gradientTo: "#334155" },
  { id: "g-chichen",      name: "Chichén Itzá",                  country: "México",         lat: 20.6843, lng: -88.5678, era: "medieval",    tag: "monumento", subtitle: "La pirámide donde baja la serpiente.",      silhouette: "mountain",   gradientFrom: "#A3E635", gradientTo: "#365314" },
  { id: "g-teotihuacan",  name: "Teotihuacán",                   country: "México",         lat: 19.6925, lng: -98.8438, era: "roman",       tag: "monumento", subtitle: "La ciudad donde los dioses fueron hombres.", silhouette: "mountain",  gradientFrom: "#CA8A04", gradientTo: "#451A03" },
  { id: "g-cristored",    name: "Cristo Redentor",               country: "Brasil",         lat: -22.9519, lng: -43.2105, era: "modern",     tag: "monumento", subtitle: "Brazos abiertos sobre Río.",                silhouette: "tower",    gradientFrom: "#FAFAFA", gradientTo: "#A1A1AA" },
  { id: "g-iguazu",       name: "Cataratas del Iguazú",          country: "Argentina/Brasil", lat: -25.6953, lng: -54.4367, era: "today",   tag: "naturaleza", subtitle: "La Garganta del Diablo ruge sin parar.",    silhouette: "mountain",     gradientFrom: "#22D3EE", gradientTo: "#155E75" },
  { id: "g-perito",       name: "Perito Moreno",                 country: "Argentina",      lat: -50.4967, lng: -73.1377, era: "today",      tag: "naturaleza", subtitle: "El glaciar que avanza y se rompe.",         silhouette: "mountain",  gradientFrom: "#67E8F9", gradientTo: "#1E40AF" },
  { id: "g-rapa",         name: "Isla de Pascua",                country: "Chile",          lat: -27.1127, lng: -109.3497, era: "medieval",  tag: "monumento", subtitle: "Moais mirando al océano infinito.",         silhouette: "tower",    gradientFrom: "#6B7280", gradientTo: "#1F2937" },
  { id: "g-tikal",        name: "Tikal",                         country: "Guatemala",      lat: 17.2220, lng: -89.6237, era: "medieval",    tag: "monumento", subtitle: "Templos maya emergiendo de la selva.",      silhouette: "mountain",   gradientFrom: "#65A30D", gradientTo: "#365314" },
  { id: "g-galapagos",    name: "Islas Galápagos",               country: "Ecuador",        lat: -0.9538, lng: -90.9656, era: "today",       tag: "naturaleza", subtitle: "El laboratorio que cambió a Darwin.",       silhouette: "mountain",     gradientFrom: "#0EA5E9", gradientTo: "#0C4A6E" },

  // ─── África ────────────────────────────────────────────────────────────
  { id: "g-giza",         name: "Pirámides de Giza",             country: "Egipto",         lat: 29.9792, lng:  31.1342, era: "roman",       tag: "monumento", subtitle: "4.500 años desafiando el desierto.",        silhouette: "mountain",   gradientFrom: "#FCD34D", gradientTo: "#78350F" },
  { id: "g-sphinx",       name: "Esfinge de Giza",               country: "Egipto",         lat: 29.9753, lng:  31.1376, era: "roman",       tag: "monumento", subtitle: "El león con rostro de faraón.",             silhouette: "tower",    gradientFrom: "#F59E0B", gradientTo: "#7C2D12" },
  { id: "g-luxor",        name: "Karnak · Luxor",                country: "Egipto",         lat: 25.7188, lng:  32.6573, era: "roman",       tag: "monumento", subtitle: "El templo donde dormían los dioses.",       silhouette: "city",     gradientFrom: "#F97316", gradientTo: "#7C2D12" },
  { id: "g-marrakech",    name: "Plaza Jemaa el-Fna",            country: "Marruecos",      lat: 31.6258, lng:  -7.9892, era: "medieval",    tag: "ciudad",    subtitle: "El zoco que despierta cada tarde.",         silhouette: "city",      gradientFrom: "#EA580C", gradientTo: "#7C2D12" },
  { id: "g-lalibela",     name: "Lalibela",                      country: "Etiopía",        lat: 12.0317, lng:  39.0407, era: "medieval",    tag: "monumento", subtitle: "Iglesias talladas hacia abajo en la roca.", silhouette: "cathedral", gradientFrom: "#B45309", gradientTo: "#451A03" },
  { id: "g-kilimanjaro",  name: "Kilimanjaro",                   country: "Tanzania",       lat: -3.0674, lng:  37.3556, era: "today",       tag: "naturaleza", subtitle: "El techo de África sobre la sabana.",       silhouette: "mountain",  gradientFrom: "#A5B4FC", gradientTo: "#312E81" },
  { id: "g-victoria",     name: "Cataratas Victoria",            country: "Zambia/Zimbabue", lat: -17.9243, lng: 25.8572, era: "today",     tag: "naturaleza", subtitle: "El humo que truena.",                       silhouette: "mountain",     gradientFrom: "#22D3EE", gradientTo: "#0E7490" },
  { id: "g-table",        name: "Table Mountain",                country: "Sudáfrica",      lat: -33.9628, lng:  18.4098, era: "today",      tag: "naturaleza", subtitle: "La mesa de roca de Ciudad del Cabo.",       silhouette: "mountain",  gradientFrom: "#94A3B8", gradientTo: "#1F2937" },

  // ─── Oceanía ───────────────────────────────────────────────────────────
  { id: "g-opera",        name: "Ópera de Sídney",               country: "Australia",      lat: -33.8568, lng: 151.2153, era: "modern",     tag: "monumento", subtitle: "Velas blancas en la bahía.",                silhouette: "city",    gradientFrom: "#FAFAFA", gradientTo: "#94A3B8" },
  { id: "g-uluru",        name: "Uluru",                         country: "Australia",      lat: -25.3444, lng: 131.0369, era: "today",      tag: "naturaleza", subtitle: "El monolito sagrado del desierto rojo.",    silhouette: "mountain",  gradientFrom: "#EA580C", gradientTo: "#7C2D12" },
];


// ─── Conversión a tipos del fixtures ─────────────────────────────────────

const PLACEHOLDER_HERO = "/pois/_default.jpg";


export const PLACES_GLOBAL: ReadonlyArray<MockPlace> = GLOBAL_SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  country: s.country,
  lat: s.lat,
  lng: s.lng,
  era: s.era,
}));


export const ECHOES_GLOBAL: ReadonlyArray<MockEcho> = GLOBAL_SEEDS.map((s) => {
  const echoId = `${s.id}-main`;
  return {
    id: echoId,
    slug: echoId,
    title: s.name,
    subtitle: s.subtitle,
    placeId: s.id,
    place: s.name,
    year: "—",
    era: s.era,
    tag: s.tag,
    tone: "default" as const,
    likes: "0",
    saves: "0",
    shares: "0",
    silhouette: s.silhouette,
    gradientFrom: s.gradientFrom,
    gradientTo: s.gradientTo,
    heroFilename: s.heroFilename ?? "",
    heroImage: PLACEHOLDER_HERO,
    gallery: [],
    narrative: [s.subtitle],
    layers: [],
    timeline: [],
    related: [],
    culturalDna: [s.tag],
    quotes: [],
    sources: [],
    viralHook: s.subtitle,
  } as MockEcho;
});