/**
 * KUDOS · mocks v2 · real Wikimedia Commons URLs.
 *
 * Each echo has:
 *   - heroFilename · Wikimedia file (resolved via wikimediaUrl helper)
 *   - gallery · array of {filename, caption}
 *
 * Components use wikimediaUrl(filename, width) to build the actual URL.
 * ContextualImage handles onError fallback to KUDOS silhouette.
 */
import { wikimediaUrl } from "./wikimedia";

import { PLACES_GLOBAL, ECHOES_GLOBAL } from "./places-global";

export type EraId = "roman" | "medieval" | "renaissance" | "modern" | "today";
export type LayerId = "real" | "historical" | "cultural" | "hidden";
export type EchoTone = "accent" | "warn" | "ok" | "default";
export type SilhouetteKind = "colosseum" | "mlk" | "mountain" | "cathedral" | "tower" | "temple" | "city";

export interface MockPlace {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  era: EraId;
}

export interface MockQuote {
  body: string;
  attribution: string;
  year?: string;
}

export interface MockGalleryImage {
  /** Wikimedia filename · resolves via wikimediaUrl(file, width) */
  filename: string;
  /** Computed Wikimedia URL · convenience */
  src: string;
  caption: string;
  attribution?: string;
}

export interface MockEcho {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  placeId: string;
  place: string;
  year: string;
  era: EraId;
  tag: string;
  tone: EchoTone;
  likes: string;
  saves: string;
  shares: string;
  silhouette: SilhouetteKind;
  gradientFrom: string;
  gradientTo: string;
  /** Wikimedia Commons filename · main hero image */
  heroFilename: string;
  /** Computed Wikimedia URL · resolved from heroFilename */
  heroImage: string;
  gallery: ReadonlyArray<MockGalleryImage>;
  narrative: ReadonlyArray<string>;
  layers: ReadonlyArray<{ id: LayerId; title: string; body: string }>;
  timeline: ReadonlyArray<{ year: string; title: string; body: string }>;
  related: ReadonlyArray<string>;
  culturalDna: ReadonlyArray<string>;
  quotes: ReadonlyArray<MockQuote>;
  sources: ReadonlyArray<{ title: string; author: string; year: string }>;
  audio?: { duration: string; description: string };
  /** Optional temporal epochs · drives CapsuleScreen mutation state */
  epochs?: ReadonlyArray<import("./epochs").MockEpoch>;
  /** Cinematic hook · used by Capsule hook frame */
  viralHook?: string;
}

export interface MockPerson {
  id: string;
  name: string;
  handle: string;
  bio: string;
  longBio?: string;
  location: string;
  avatarFrom: string;
  avatarTo: string;
  echoesCount: number;
  followersCount: number;
  following: boolean;
  reason?: string;
}

export interface MockMoment {
  id: string;
  type: "audio" | "image" | "text";
  title: string;
  body?: string;
  place: string;
  when: string;
  duration?: string;
  privacy: "public" | "circle" | "private";
  imageFilename?: string;
  /** Computed Wikimedia URL · convenience */
  image?: string;
}

export interface MockNotification {
  id: string;
  category: "nearby" | "creator" | "place" | "temporal" | "merit" | "social" | "system";
  title: string;
  body: string;
  when: string;
  read: boolean;
  href?: string;
}

export interface MockMindMessage {
  id: string;
  role: "user" | "mind";
  body: string;
  cards?: ReadonlyArray<{ title: string; subtitle: string; href: string }>;
  citations?: ReadonlyArray<{ title: string; year: string }>;
}


const PLACES_CORE: ReadonlyArray<MockPlace> = [
  { id: "ogrove",      name: "O Grove",                country: "España (Galicia)", lat: 42.4994, lng: -8.8665, era: "roman" },
  { id: "pontevedra",  name: "Pontevedra",             country: "España (Galicia)", lat: 42.4310, lng: -8.6444, era: "medieval" },
  { id: "santiago",    name: "Santiago de Compostela", country: "España (Galicia)", lat: 42.8782, lng: -8.5448, era: "medieval" },
  { id: "rome",        name: "Roma",                   country: "Italia",            lat: 41.89,   lng: 12.49,   era: "roman" },
  { id: "paris",       name: "París",                  country: "Francia",           lat: 48.85,   lng: 2.35,    era: "medieval" },
  { id: "salamanca",   name: "Salamanca",              country: "España",            lat: 40.96,   lng: -5.66,   era: "renaissance" },
  { id: "tokyo",       name: "Tokio",                  country: "Japón",             lat: 35.68,   lng: 139.69,  era: "modern" },
  { id: "machu",       name: "Machu Picchu",           country: "Perú",              lat: -13.16,  lng: -72.54,  era: "renaissance" },
  { id: "washington",  name: "Washington",             country: "EE.UU.",            lat: 38.90,   lng: -77.04,  era: "modern" },
  { id: "athens",      name: "Atenas",                 country: "Grecia",            lat: 37.98,   lng: 23.72,   era: "roman" },
  { id: "barcelona",   name: "Barcelona",              country: "España",            lat: 41.40,   lng: 2.17,    era: "modern" },
  { id: "granada",     name: "Granada",                country: "España",            lat: 37.18,   lng: -3.59,   era: "medieval" },
  { id: "petra",       name: "Petra",                  country: "Jordania",          lat: 30.32,   lng: 35.45,   era: "roman" },
  { id: "istanbul",    name: "Estambul",                country: "Turquía",           lat: 41.01,   lng: 28.98,   era: "medieval" },
  { id: "cusco",       name: "Cusco",                   country: "Perú",              lat: -13.53,  lng: -71.97,  era: "renaissance" },
];

const ECHOES_CORE: ReadonlyArray<MockEcho> = ([
  // ─── GALICIA ────────────────────────────────────────────────────────────
  {
    id: "areoso", slug: "areoso",
    title: "Os castros de Areoso",
    subtitle: "Una isla que enterraba a sus muertos cinco mil años antes que Roma.",
    placeId: "ogrove", place: "O Grove, Pontevedra",
    year: "c. 3000 a.C.", era: "roman",
    tag: "Histórica", tone: "accent",
    likes: "1.2K", saves: "420", shares: "180",
    silhouette: "mountain", gradientFrom: "#4338ca", gradientTo: "#0a0612",
    heroFilename: "Illa_de_Areoso_marea_baixa.jpg",
    gallery: [
      { filename: "Illa_de_Areoso_marea_baixa.jpg",   caption: "Vista del islote a marea baja · O Grove · ría de Arousa." },
      { filename: "Praia_de_Areoso.jpg",               caption: "Arena blanca · franja de cuatrocientos metros." },
      { filename: "Castros_galegos.jpg",               caption: "Castros gallegos · contexto megalítico atlántico." },
      { filename: "Ria_de_Arousa.jpg",                  caption: "Ría de Arousa · contexto marítimo del enterramiento." },
      { filename: "O_Grove_panoramica.jpg",            caption: "O Grove · península de A Toxa al fondo." },
    ],
    narrative: [
      "El islote de Areoso es una franja de arena de cuatrocientos metros frente a O Grove, en la ría de Arousa. Pasa por playa de bañistas en verano. Pasa también por uno de los yacimientos megalíticos mejor conservados de la fachada atlántica · siete mámoas funerarias del cuarto milenio antes de Cristo expuestas literalmente sobre la duna.",
      "Lo que hace a Areoso único es la combinación de visibilidad y vulnerabilidad. La mayoría de mámoas atlánticas están cubiertas por tierra y vegetación · aquí, el viento y la marea han ido erosionando la duna y dejando los túmulos al aire. Cada temporada el yacimiento pierde unos centímetros · una mámoa entera ha desaparecido por completo desde 1985.",
      "El enterramiento megalítico de Areoso es contemporáneo a las pirámides de Egipto · más antiguo que Stonehenge en su fase de piedras azules · contemporáneo de los neolíticos malteses de Ġgantija. Y sin embargo, casi nadie lo conoce fuera de Galicia. Es uno de esos lugares donde la prehistoria no se aprende en una vitrina · se camina sobre ella.",
      "El Museo do Pobo Galego documenta el sitio · pero el material original está repartido entre Pontevedra, Santiago de Compostela y bodegas universitarias. La ría de Arousa entera, desde la prehistoria hasta los romanos y los suevos, conservó una continuidad cultural que la historia oficial española tiende a saltarse.",
      "KUDOS te lleva a la mañana del solsticio de invierno · cuando la luz baja entra exactamente por la abertura central de la cista. A las marcas de los canteros del neolítico galaico · al sonido del Atlántico golpeando arena al amanecer.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Espacio Natural Protegido desde 2008 · acceso restringido en marea baja · cinco minutos a pie desde el muelle de O Grove. En agosto hay cordones para proteger las mámoas." },
      { id: "historical", title: "Historia",      body: "Datado por C14 entre el 3500 y el 2200 a.C. · uso continuado durante 1.300 años. Sucesión cultural: neolítico atlántico, calcolítico, campaniforme. Tras el 2000 a.C. el sitio se abandona · la duna empieza a cubrirlo." },
      { id: "cultural",   title: "Cultura",       body: "Tradición megalítica atlántica europea · paralelos en Bretaña, Irlanda, Portugal. La cantera del cuarzo en Areoso documenta intercambios marítimos a 200 km · prueba de navegación de cabotaje en el cuarto milenio a.C." },
      { id: "hidden",     title: "Oculto",         body: "En 1932, antes de las primeras excavaciones científicas, mariscadores locales sabían dónde aparecían \"piedras del antiguo\" tras tormentas. Esa memoria oral no se documentó hasta 2003. Una mámoa entera (\"a Mámoa 8\") desapareció entre 1985 y 2010 por erosión." },
    ],
    timeline: [
      { year: "c. 3500 a.C.", title: "Primer enterramiento", body: "Construcción de las primeras mámoas · cista central de lajas de granito." },
      { year: "c. 2800 a.C.", title: "Reuso campaniforme",    body: "Aparece cerámica campaniforme · señal de que las mámoas siguen usándose por nuevas comunidades." },
      { year: "c. 2200 a.C.", title: "Abandono",                body: "Última inhumación documentada · la duna comienza a cubrir el yacimiento." },
      { year: "1932",          title: "Documentación oral",      body: "Mariscadores describen las piedras a investigadores · primera mención escrita moderna." },
      { year: "1985",          title: "Primeras excavaciones",   body: "Campaña dirigida por Antonio Rodríguez Casal · Universidade de Santiago." },
      { year: "2008",          title: "Espacio Natural Protegido", body: "Protección legal · acceso regulado · plan de gestión municipal." },
      { year: "2010",          title: "Pérdida de la Mámoa 8",   body: "Documentada por última vez · desaparece tras un temporal de invierno." },
      { year: "Hoy",            title: "Erosión activa",          body: "El yacimiento pierde unos centímetros por temporada · presión turística estival creciente." },
    ],
    related: ["santiagomateo", "pontevedra-medieval", "coliseo"],
    culturalDna: ["Megalítico", "Atlántico", "Neolítico", "Cuarzo", "Ría de Arousa", "Mámoa"],
    quotes: [
      { body: "Lo que el viento descubre, el viento se lo lleva.", attribution: "Mariscadora de O Grove · entrevista 2014", year: "2014" },
    ],
    sources: [
      { title: "El megalitismo en Galicia",                        author: "Antonio Rodríguez Casal", year: "1990" },
      { title: "Areoso · arqueoloxía dunha illa de cunchas",       author: "X. M. Rey García",        year: "2003" },
    ],
    audio: { duration: "1:48", description: "Atlántico golpeando arena al amanecer · marea baja del 21 de junio." },
  },
  {
    id: "pontevedra-medieval", slug: "pontevedra-medieval",
    title: "A Boa Vila · Pontevedra medieval",
    subtitle: "Una ciudad gremial que el Camino salvó dos veces.",
    placeId: "pontevedra", place: "Pontevedra, Galicia",
    year: "Siglo XIV", era: "medieval",
    tag: "Cultural", tone: "ok",
    likes: "840", saves: "310", shares: "120",
    silhouette: "cathedral", gradientFrom: "#6d28d9", gradientTo: "#0a0612",
    heroFilename: "Pontevedra-Praza_da_Le%C3%B1a-2.jpg",
    gallery: [
      { filename: "Pontevedra-Praza_da_Le%C3%B1a-2.jpg", caption: "Praza da Leña · soportales medievales intactos." },
      { filename: "Pontevedra_capital.JPG",                caption: "Casco histórico peatonal desde 1999." },
      { filename: "Basilica_de_Santa_Mar%C3%ADa_a_Maior_-_Pontevedra.jpg", caption: "Igrexa de Santa María a Maior · gremio de mareantes." },
      { filename: "Praza_da_Ferrer%C3%ADa%2C_Pontevedra.jpg", caption: "Praza da Ferrería · espacio civil del concello medieval." },
      { filename: "Pontevedra_capital.JPG",                 caption: "Calle do Sarmiento · trazado intacto desde el medievo." },
    ],
    narrative: [
      "Pontevedra fue una de las cinco grandes ciudades del Reino de Galicia durante el bajo medievo. Su prosperidad venía del Camino Portugués hacia Santiago · cada peregrino dejaba ingreso · y del gremio de mareantes, los hombres del mar que controlaban la sardina, la sal y la pesca de ballena del Atlántico norte. La iglesia de Santa María a Maior es literalmente la iglesia de ese gremio · construida con dinero propio, sin obispo intermediario.",
      "La Praza da Leña conserva un trazado de soportales medievales tan compacto que las casas siguen apoyándose unas en otras como en 1450. Caminar la Boa Vila (\"la buena ciudad\", como se llamaba a sí misma) es atravesar una capa de piedra que ningún ensanche del XIX consiguió romper · porque Pontevedra entró en declive a partir del XVII y se ahorró las demoliciones urbanísticas que arrasaron tantos cascos.",
      "El segundo salvavidas vino tarde: en 1999 el alcalde Miguel Anxo Fernández Lores empezó la peatonalización masiva del centro histórico. Hoy Pontevedra es una de las ciudades europeas con menor índice de coches por residente. La piedra medieval respira otra vez · niños jugando en la Praza da Verdura donde antes había aparcamiento.",
      "KUDOS te lleva al taller de cantería del siglo XIV donde se talló el rosetón de Santa María · a las cuentas del gremio de mareantes guardadas en el archivo provincial · al sonido del concello reuniéndose en la Praza da Ferrería antes de la imprenta.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Casco histórico peatonal desde 1999 · uno de los más íntegros de España. Visitantes del Camino Portugués atravesando · Pontevedra figura como caso de estudio en urbanismo europeo." },
      { id: "historical", title: "Historia",      body: "Fundada como burgo medieval en el siglo XII · auge entre el XIV y el XVI · declive con la pérdida del comercio atlántico tras la conquista de América." },
      { id: "cultural",   title: "Cultura",       body: "Gremio de mareantes · estructura única en la fachada atlántica peninsular. Cervantes vivió aquí brevemente · referencias en El Quijote. Valle-Inclán nació cerca." },
      { id: "hidden",     title: "Oculto",         body: "Bajo la Praza da Ferrería hay restos de una basílica visigoda · descubiertos en obras de 2016 y vueltos a cubrir. La torre de Santa María tiene una marca de cantero que repite siete veces." },
    ],
    timeline: [
      { year: "1169", title: "Fundación",         body: "Fernando II concede privilegios de villa." },
      { year: "1300", title: "Auge del Camino",    body: "El Camino Portugués pasa por aquí · prosperidad gremial." },
      { year: "1450", title: "Praza da Leña",      body: "Conjunto soportalado completado · permanece intacto." },
      { year: "1500", title: "Santa María",        body: "Inicio de la iglesia del gremio de mareantes." },
      { year: "1719", title: "Quema inglesa",      body: "Incursión inglesa quema parte del puerto · inicio del declive." },
      { year: "1833", title: "Capital provincial", body: "Reforma administrativa la convierte en capital." },
      { year: "1999", title: "Peatonalización",    body: "Lores comienza la transformación." },
      { year: "2016", title: "Basílica visigoda",  body: "Descubierta bajo la Praza da Ferrería." },
    ],
    related: ["santiagomateo", "areoso", "notre"],
    culturalDna: ["Camino", "Gremio mareantes", "Boa Vila", "Praza", "Peatonal", "Atlántico"],
    quotes: [
      { body: "Pontevedra, Boa Vila, donde durmiu Don Quixote.", attribution: "Refrán popular gallego", year: "" },
    ],
    sources: [
      { title: "Pontevedra · A Boa Vila",          author: "Xosé Fortes Bouzán", year: "1993" },
      { title: "La transformación de Pontevedra",  author: "Salvador Rueda",      year: "2018" },
    ],
    audio: { duration: "1:12", description: "Pasos en la Praza da Leña a las 7 de la mañana · sin tráfico desde hace 25 años." },
  },
  {
    id: "santiagomateo", slug: "portico-da-gloria",
    title: "O Pórtico da Gloria",
    subtitle: "Mil ochocientas figuras que Maestro Mateo terminó en 1188 · y que aún sonríen.",
    placeId: "santiago", place: "Santiago de Compostela, Galicia",
    year: "1188", era: "medieval",
    tag: "Histórica", tone: "accent",
    likes: "3.1K", saves: "1.1K", shares: "560",
    silhouette: "cathedral", gradientFrom: "#581c87", gradientTo: "#0a0612",
    heroFilename: "P%C3%B3rtico_da_Gloria%2C_Catedral_de_Santiago_de_Compostela.jpg",
    gallery: [
      { filename: "Catedral_de_Santiago_de_Compostela_-_Pra%C3%A7a_do_Obradoiro.jpg", caption: "Catedral de Santiago · Praza do Obradoiro." },
      { filename: "P%C3%B3rtico_da_Gloria%2C_Catedral_de_Santiago_de_Compostela.jpg",  caption: "Pórtico da Gloria · vista general tras la restauración 2018." },
      { filename: "Santiago_de_Compostela_Cathedral_-_Botafumeiro.jpg",                caption: "Botafumeiro en plena oscilación · misa del peregrino." },
      { filename: "Santiago_de_Compostela_-_Plaza_del_Obradoiro.jpg",                  caption: "Praza do Obradoiro · acceso ceremonial del peregrino." },
      { filename: "Cathedral_of_Santiago_de_Compostela_03.jpg",                         caption: "Vista desde el Monte do Gozo · primera visión de los peregrinos medievales." },
    ],
    narrative: [
      "Maestro Mateo firmó el Pórtico da Gloria el 1 de abril de 1188 en una inscripción latina aún legible. Ciento ochenta y un personajes esculpidos · ángeles, profetas, apóstoles, condenados, salvados, músicos, demonios. Es el conjunto escultórico románico tardío más complejo de Europa · y durante seis siglos estuvo expuesto a la intemperie en el atrio de la catedral.",
      "El daño que sufrió fue casi total. Cuando en el siglo XVIII se construyó la fachada barroca del Obradoiro, el Pórtico quedó protegido al fin · pero ya había perdido el 80% de su policromía original. Solo en 2009-2018 una restauración masiva del Programa Catedral conseguía recuperar pigmentos enterrados bajo capas de hollín · descubrió que las figuras estaban pintadas en azules, rojos, dorados.",
      "El detalle que más conmueve es Daniel sonriendo. La única figura románica europea documentada con sonrisa explícita · una excepción técnica e ideológica · que durante siglos los peregrinos miraban tocándose con el dedo \"para llevarse la alegría\". El roce desgastó la piedra en una marca que sigue ahí.",
      "Tradicionalmente los peregrinos al llegar tocaban la columna central del parteluz con la mano derecha · el desgaste creó una huella humana en la piedra. En 2008 se prohibió tocarla. La huella sigue · pero ya nadie la profundiza · una especie de fósil del millón de manos que llegaron caminando desde Roncesvalles, Lisboa, Sevilla, Marsella, Le Puy, Vézelay, Canterbury.",
      "KUDOS te lleva al taller de Mateo durante los años de obra · 1168-1188 · veinte años de cantería bajo la lluvia atlántica. A la primera misa del peregrino documentada · 1189 · con el Pórtico recién terminado. A la mano del millón cero que tocó el parteluz.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Visitas guiadas con aforo · entrada por la Fundación Catedral · 14 euros. Tras la restauración 2018, color recuperado en gran parte del conjunto." },
      { id: "historical", title: "Historia",      body: "Encargo del rey Fernando II y el arzobispo Pedro Suárez de Deza · ejecutado por Maestro Mateo · escuela compostelana propia." },
      { id: "cultural",   title: "Cultura",       body: "Modelo iconográfico del Apocalipsis según San Juan · traducido al imaginario peregrino. Los músicos del arco interpretan instrumentos reales." },
      { id: "hidden",     title: "Oculto",         body: "Maestro Mateo se autorretrató en \"Santo dos Croques\" · espalda al Pórtico · mirando al altar. Tradición: golpear la cabeza tres veces contra la suya transmite la inteligencia del maestro. Prohibida desde 2008." },
    ],
    timeline: [
      { year: "1168", title: "Inicio de obra",      body: "Maestro Mateo es nombrado director del taller catedralicio." },
      { year: "1188", title: "Firma",                body: "Inscripción latina · 1 de abril · Pórtico terminado." },
      { year: "1211", title: "Consagración",         body: "La catedral entera se consagra · Pórtico ya integrado." },
      { year: "1738", title: "Fachada barroca",      body: "Casas Novoa construye el Obradoiro · cubre y protege al Pórtico." },
      { year: "2008", title: "Prohibición de tocar", body: "Cordón protege el parteluz · fin de mil años de roce humano." },
      { year: "2018", title: "Restauración",         body: "Recuperación de policromía original · obra del Programa Catedral 2009-2018." },
    ],
    related: ["pontevedra-medieval", "areoso", "notre", "coliseo"],
    culturalDna: ["Camino", "Románico", "Maestro Mateo", "Peregrinación", "Policromía", "Daniel"],
    quotes: [
      { body: "Magister Matheus, qui a fundamentis ipsius portalis gessit magisterium.", attribution: "Inscripción del Pórtico · 1188", year: "1188" },
    ],
    sources: [
      { title: "El Pórtico de la Gloria",                        author: "Manuel Castiñeiras", year: "2011" },
      { title: "Maestro Mateo y el Pórtico restaurado",          author: "Programa Catedral",  year: "2019" },
    ],
    audio: { duration: "2:14", description: "Botafumeiro en oscilación durante la misa del peregrino." },
  },
  // ─── GLOBAL ─────────────────────────────────────────────────────────────
  {
    id: "coliseo", slug: "coliseo",
    title: "El Coliseo Romano",
    subtitle: "Donde cincuenta mil voces se volvían una sola garganta.",
    placeId: "rome", place: "Roma, Italia",
    year: "80 d.C.", era: "roman",
    tag: "Histórica", tone: "accent",
    likes: "12.4K", saves: "3.8K", shares: "1.1K",
    silhouette: "colosseum", gradientFrom: "#6d28d9", gradientTo: "#0a0612",
    heroFilename: "Colosseo_2020.jpg",
    gallery: [
      { filename: "Colosseo_2020.jpg",                       caption: "Fachada exterior · arcos del orden compuesto · travertino restaurado en 2016." },
      { filename: "Colosseum_in_Rome%2C_Italy_-_April_2007.jpg", caption: "Vista frontal del Coliseo · estructura completa." },
      { filename: "Roma_-_Colosseo_-_panoramio.jpg",          caption: "Panorámica desde el Foro Romano." },
      { filename: "Colosseo_di_Roma.jpg",                      caption: "Detalle de los arcos · numeración romana visible." },
      { filename: "Inside_the_Colosseum_2.jpg",                 caption: "Interior · arena y hipogeos visibles." },
      { filename: "Colosseum_in_Rome-April_2007-1-_copie_2B.jpg", caption: "Vista nocturna iluminada." },
    ],
    narrative: [
      "El anfiteatro Flavio se inauguró bajo Tito en el año 80 d.C. con cien días de juegos. Lo construyeron sobre el suelo quemado donde Nerón había levantado su Domus Aurea, el palacio que ocupaba casi un tercio del centro de Roma tras el incendio del 64. Vespasiano, el padre de Tito, quería un gesto político inequívoco: el lago privado del emperador caído se convertía en espacio común. Devolver el suelo al pueblo.",
      "Cincuenta mil personas cabían en sus gradas. Diecisiete metros de altura, ochenta arcos de entrada numerados, un sistema de toldos llamado velarium que se desplegaba contra el sol con cuerdas tensadas por marineros traídos expresamente desde Miseno. Los hipogeos del subsuelo guardaban gladiadores, fieras y mecanismos de elevación que sacaban a los animales al ruedo sin que se viera la maquinaria.",
      "Los juegos no eran espectáculo casual sino institución. Munera para mantener al ciudadano enganchado al poder. Venationes para exhibir el alcance imperial · leones de Numidia, panteras de Hispania, jirafas, rinocerontes, elefantes. Las cuentas conservadas hablan de nueve mil bestias sacrificadas solo en la inauguración. El olor a sangre, el polvo, el rugido coordinado de la multitud. La piedra absorbió siglos de eso.",
      "Lo que ves hoy son los huesos. Falta el suelo de arena, falta el toldo, falta el revestimiento de mármol que tapizaba la fachada. El terremoto de 1349 derribó el muro sur. El papado luego sacó piedras para construir San Pedro. Y aún así sigue ahí, reconocible, símbolo de un imperio que aprendió a entretener mejor que ningún otro en la historia.",
      "KUDOS te lleva debajo. A los hipogeos, donde la luz no entraba. Al velarium que ya no existe. A las cuentas de quien escribía los nombres de los gladiadores el día anterior. Lo que el turismo no ve es lo que aquí se guarda.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Patrimonio UNESCO desde 1980 · 7.6M visitantes/año. Restauración Tod's (2013-2016) reveló blanco original del travertino. Entradas desde 18€ · grupo guiado a hipogeos cuesta extra." },
      { id: "historical", title: "Historia",      body: "Construcción iniciada por Vespasiano en 70-72 d.C. con botín del saqueo de Jerusalén. Inaugurado por Tito en 80. Último combate: 435 d.C." },
      { id: "cultural",   title: "Cultura",       body: "El \"morituri te salutant\" es leyenda popular reciente. El gesto del pulgar arriba/abajo también es romantización. El imaginario en cine construyó un Coliseo que nunca existió tal cual." },
      { id: "hidden",     title: "Oculto",         body: "Los hipogeos · dos niveles subterráneos. Tras excavarlos ya no se pudieron hacer naumaquias (batallas navales con ruedo inundado). En 2021 se restauró parcialmente para visitas con casco." },
    ],
    timeline: [
      { year: "64 d.C.",  title: "Gran incendio",      body: "Roma arde durante seis días." },
      { year: "70-72",    title: "Inicio de obra",     body: "Vespasiano comienza · botín de Jerusalén lo financia." },
      { year: "80",        title: "Inauguración",        body: "Tito abre los juegos · cien días, nueve mil animales sacrificados." },
      { year: "82",        title: "Domiciano completa", body: "Cuarto piso · hipogeos terminados." },
      { year: "217",       title: "Incendio",             body: "Rayo destruye estructura superior." },
      { year: "435",       title: "Último combate",       body: "Cesa el espectáculo gladiatorio." },
      { year: "1349",      title: "Terremoto",            body: "Colapsa muro sur." },
      { year: "1749",      title: "Consagración",         body: "Benedicto XIV lo declara sagrado." },
      { year: "1980",      title: "UNESCO",                body: "Patrimonio mundial." },
      { year: "2016",      title: "Restauración Tod's",   body: "Travertino vuelve a blanco." },
    ],
    related: ["mlk", "machu", "notre", "santiagomateo"],
    culturalDna: ["Imperio", "Espectáculo", "Ingeniería", "Sangre", "Travertino", "Hipogeos"],
    quotes: [
      { body: "Mientras esté el Coliseo, estará Roma; cuando caiga el Coliseo, caerá Roma; cuando caiga Roma, caerá el mundo.", attribution: "Beda el Venerable · siglo VIII", year: "c. 731" },
      { body: "Pan y circo · solo pan y circo es lo que el pueblo desea ansiosamente.", attribution: "Juvenal · Sátiras", year: "c. 100 d.C." },
    ],
    sources: [
      { title: "The Colosseum",                    author: "Keith Hopkins & Mary Beard", year: "2005" },
      { title: "SPQR · A History of Ancient Rome", author: "Mary Beard",                  year: "2015" },
      { title: "Bread and Circuses",                author: "Paul Veyne",                  year: "1976" },
    ],
    audio: { duration: "2:14", description: "Eco del óvalo a las 6 AM · sin turismo." },
  },
  {
    id: "mlk", slug: "i-have-a-dream",
    title: "I Have a Dream",
    subtitle: "Diecisiete minutos que reescribieron lo que Estados Unidos podía decirse a sí mismo.",
    placeId: "washington", place: "Washington, EE. UU.",
    year: "1963", era: "modern",
    tag: "Inspiradora", tone: "warn",
    likes: "8.7K", saves: "2.4K", shares: "5.2K",
    silhouette: "mlk", gradientFrom: "#6d28d9", gradientTo: "#0a0612",
    heroFilename: "Martin_Luther_King_-_March_on_Washington.jpg",
    gallery: [
      { filename: "Martin_Luther_King_-_March_on_Washington.jpg",                                                             caption: "Lincoln Memorial · 28 de agosto 1963 · vista de la multitud." },
      { filename: "March_on_Washington_1963_-_3.jpg",                                                                          caption: "Doscientas cincuenta mil personas frente al Lincoln Memorial." },
      { filename: "MLK_and_Malcolm_X_USNWR_cropped.jpg",                                                                       caption: "Martin Luther King Jr. · figura central del movimiento por los derechos civiles." },
      { filename: "Civil_Rights_March_on_Washington%2C_D.C._%28Dr._Martin_Luther_King%2C_Jr._and_Mathew_Ahmann_in_a_crowd.%29.jpg", caption: "MLK durante la marcha." },
      { filename: "Martin_Luther_King%2C_Jr..jpg",                                                                              caption: "Retrato oficial · 1964." },
    ],
    narrative: [
      "28 de agosto de 1963. La temperatura roza los treinta y cinco grados en el National Mall. Doscientas cincuenta mil personas se han movido en autobús, tren, pie y avión desde cuarenta y dos estados. La Marcha sobre Washington por el Trabajo y la Libertad está a punto de cerrar con el discurso del último orador de la jornada. Martin Luther King Jr. ha hablado tantas veces ese año que el guion ya está pulido. Pero Mahalia Jackson, sentada cerca, le grita en mitad del discurso: «Tell them about the dream, Martin». Y él abandona el papel.",
      "Lo que sigue está improvisado. Repeticiones anafóricas que King había usado en sermones · «I have a dream», una y otra vez, hilvanando con la cadencia de un predicador bautista del sur. La frase no era nueva en su repertorio. Lo nuevo fue el contexto · televisión nacional en directo, frente al Lincoln Memorial, en el centenario aproximado de la Proclamación de Emancipación.",
      "El discurso preparado iba más cargado de denuncia: la idea del cheque sin fondos que Estados Unidos había firmado a los ciudadanos negros · «un cheque devuelto por insuficiencia de fondos». Esa metáfora financiera abrió el discurso pero quedó eclipsada por el final improvisado. La denuncia se transformó en visión.",
      "Un año después se firma la Civil Rights Act. Cuatro años después King recibe el Premio Nobel de la Paz. Cinco años después es asesinado en Memphis. Pero el discurso queda · grabado, citado, parodiado, traducido, instrumentalizado, defendido, atacado.",
      "KUDOS te lleva al borrador. A las cuatro versiones previas que King había probado en iglesias de Detroit y Chicago. A las dieciséis intervenciones de Mahalia Jackson durante los meses anteriores. Al texto que King llevaba en el bolsillo · y que dejó de leer.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "El National Mall recibe 24M de visitantes/año. En la escalinata del Lincoln Memorial, una placa marca el lugar exacto donde King estuvo de pie. MLK Memorial (2011) a pocos metros." },
      { id: "historical", title: "Historia",     body: "Civil Rights formal desde 1954. Montgomery 1955-56. Selma 1965. Voting Rights Act 1965." },
      { id: "cultural",   title: "Cultura",      body: "El discurso se utiliza en publicidad, política y educación con una facilidad que escandalizaría a King." },
      { id: "hidden",     title: "Oculto",       body: "El FBI grababa a King obsesivamente. La carta anónima de J. Edgar Hoover (1964) sugiriendo que se suicidara · publicada por su familia en 2017." },
    ],
    timeline: [
      { year: "1955", title: "Montgomery",    body: "Rosa Parks · boicot de 381 días." },
      { year: "1957", title: "SCLC",            body: "Funda la Southern Christian Leadership Conference." },
      { year: "1963", title: "Birmingham",      body: "Carta desde la cárcel · April 1963." },
      { year: "1963", title: "Discurso",        body: "28 de agosto · Lincoln Memorial." },
      { year: "1964", title: "Civil Rights",    body: "LBJ firma la ley." },
      { year: "1964", title: "Nobel",            body: "Premio Nobel de la Paz." },
      { year: "1965", title: "Selma",            body: "Bloody Sunday · Voting Rights Act." },
      { year: "1968", title: "Memphis",          body: "Asesinado en el Lorraine Motel." },
      { year: "1986", title: "MLK Day",          body: "Día festivo federal." },
      { year: "2011", title: "MLK Memorial",     body: "Stone of Hope en el National Mall." },
    ],
    related: ["coliseo", "santiagomateo", "tokyo-showa"],
    culturalDna: ["Civil rights", "Oratoria", "Bautista", "No-violencia", "Comunidad"],
    quotes: [
      { body: "I have a dream that one day on the red hills of Georgia, the sons of former slaves and the sons of former slave owners will be able to sit down together at the table of brotherhood.", attribution: "Martin Luther King Jr.", year: "1963" },
      { body: "The arc of the moral universe is long, but it bends toward justice.", attribution: "Martin Luther King Jr.", year: "1968" },
    ],
    sources: [
      { title: "Parting the Waters · America in the King Years 1954-63", author: "Taylor Branch", year: "1988" },
      { title: "King · A Comprehensive Biography",                       author: "Jonathan Eig",   year: "2023" },
    ],
    audio: { duration: "1:48", description: "Fragmento original · escalada vocal." },
  },
  {
    id: "machu", slug: "machu-picchu",
    title: "Machu Picchu",
    subtitle: "Una ciudad que las nubes guardaron cuatro siglos.",
    placeId: "machu", place: "Perú",
    year: "1450", era: "renaissance",
    tag: "Misteriosa", tone: "accent",
    likes: "7.1K", saves: "2.9K", shares: "1.8K",
    silhouette: "mountain", gradientFrom: "#581c87", gradientTo: "#0a0612",
    heroFilename: "Machu_Picchu%2C_Peru.jpg",
    gallery: [
      { filename: "Machu_Picchu%2C_Peru.jpg",                              caption: "Vista panorámica clásica desde la Huayna Picchu." },
      { filename: "Machu_Picchu_early_morning.jpg",                         caption: "Niebla matinal · 5:40 AM · solsticio de junio." },
      { filename: "80_-_Machu_Picchu_-_Juin_2009_-_edit.2.jpg",             caption: "Terrazas agrícolas en cascada · sistema hidráulico funcional." },
      { filename: "Intihuatana_-_Machu_Picchu.jpg",                         caption: "Intihuatana · piedra ritual de orientación astronómica." },
      { filename: "Machu_Picchu_-_overview.jpg",                            caption: "Templo del Sol · ventana solsticial alineada." },
    ],
    narrative: [
      "Pachacútec, el noveno Sapa Inca, ordena en 1450 construir una ciudad sobre una cresta a 2.430 metros, entre dos picos andinos. No es la capital · la capital es Cuzco. Es algo más íntimo · una residencia real, un centro religioso, un observatorio solar, un refugio. Lo notable es que casi nadie la vería desde el valle del río Urubamba que serpentea ochocientos metros más abajo.",
      "Los ingenieros incas la levantaron con piedras encajadas sin mortero · cantería poligonal de tolerancias milimétricas. Lo que la convertía en imposible no era el tamaño de las piedras sino la ladera. Inca diseña terrazas en cascada, drenajes de quince capas, canales de agua que aún funcionan cinco siglos después.",
      "Cuando los españoles llegan en 1532, Machu Picchu lleva décadas abandonada. La razón nunca se aclaró del todo · viruela traída por la conquista, conflicto sucesorio entre Huáscar y Atahualpa, simple agotamiento de la élite que la mantenía.",
      "En 1911 el explorador estadounidense Hiram Bingham, financiado por Yale y National Geographic, llega guiado por campesinos quechuas que sabían perfectamente dónde estaba. Yale se lleva treinta mil artefactos que no devuelve hasta 2012.",
      "KUDOS te lleva al Intihuatana al amanecer del 21 de junio. A la mano del cantero que ajustó el bloque de seis toneladas que sigue ahí. A los nombres de los campesinos que sabían y que nadie escuchó.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Visitas limitadas a 2.500/día desde 2017 · entradas por horarios · cuatro circuitos cerrados." },
      { id: "historical", title: "Historia",     body: "Pachacútec (1438-1471) · expansión imperial · obras monumentales. Abandonada hacia 1530." },
      { id: "cultural",   title: "Cultura",      body: "Símbolo nacional peruano. UNESCO 1983. Los guías quechuas son la única continuidad real con quienes la construyeron." },
      { id: "hidden",     title: "Oculto",       body: "El Intihuatana fue dañado por anuncio de cerveza filmado allí en 2000 · juicio internacional." },
    ],
    timeline: [
      { year: "1438", title: "Pachacútec sube al trono", body: "Inicia la expansión del Tahuantinsuyo." },
      { year: "1450", title: "Construcción",              body: "Machu Picchu se levanta." },
      { year: "1471", title: "Muerte de Pachacútec",      body: "Le sucede Túpac Inca Yupanqui." },
      { year: "1530", title: "Abandono",                   body: "Posiblemente por viruela antes incluso de llegada española." },
      { year: "1532", title: "Conquista",                  body: "Pizarro captura a Atahualpa en Cajamarca." },
      { year: "1911", title: "Bingham",                     body: "Publica el descubrimiento internacionalmente." },
      { year: "1983", title: "UNESCO",                      body: "Patrimonio mundial." },
      { year: "2007", title: "Maravilla del mundo moderno", body: "Votación internacional." },
      { year: "2012", title: "Yale devuelve artefactos",    body: "35.000 objetos vuelven a Cuzco." },
      { year: "2017", title: "Aforo limitado",              body: "2.500 visitantes/día." },
    ],
    related: ["coliseo", "notre", "athens"],
    culturalDna: ["Inca", "Andes", "Astronomía", "Terrazas", "Pachacútec", "Cantería", "Quechua"],
    quotes: [
      { body: "Subí solo a la altura · y desde allí miré a la otra altura · y desde allí miré a la otra altura del Perú.", attribution: "Pablo Neruda · Las alturas de Machu Picchu", year: "1948" },
    ],
    sources: [
      { title: "Lost City of the Incas",     author: "Hiram Bingham", year: "1948" },
      { title: "Turn Right at Machu Picchu", author: "Mark Adams",     year: "2011" },
    ],
    audio: { duration: "1:32", description: "Viento en la terraza superior · 5:40 AM." },
  },
  {
    id: "notre", slug: "notre-dame",
    title: "Notre-Dame",
    subtitle: "Ocho siglos sosteniendo París · y dos hojas de la chimenea de la nación.",
    placeId: "paris", place: "París, Francia",
    year: "1163", era: "medieval",
    tag: "Cultural", tone: "ok",
    likes: "6.2K", saves: "2.1K", shares: "950",
    silhouette: "cathedral", gradientFrom: "#6d28d9", gradientTo: "#0a0612",
    heroFilename: "Notre-Dame_de_Paris%2C_4_October_2017.jpg",
    gallery: [
      { filename: "Notre-Dame_de_Paris%2C_4_October_2017.jpg",       caption: "Fachada oeste · vista clásica desde el parvis." },
      { filename: "Notre_Dame_de_Paris_DSC_0846w.jpg",                caption: "Aguja · diseño de Viollet-le-Duc." },
      { filename: "North_rose_window_of_Notre-Dame_de_Paris.jpg",     caption: "Rosetón norte · vidrieras del XIII." },
      { filename: "Notre_Dame_Paris_interior_view.jpg",                caption: "Bóveda interior · estructura nervada gótica." },
      { filename: "Notre-Dame_de_Paris_2792x3060.jpg",                 caption: "Vista frontal completa." },
    ],
    narrative: [
      "El obispo Maurice de Sully pone la primera piedra en 1163. La obra le sobrevive · sus sucesores la continúan durante ciento ochenta años hasta su finalización aproximada en 1345. Gótico clásico · arbotantes externos que ningún edificio anterior había usado a esa escala.",
      "Cada siglo dejó su capa. Coronaciones reales · Napoleón se corona a sí mismo en 1804 con Pío VII como espectador. Profanaciones revolucionarias · en 1793 los jacobinos derriban estatuas de reyes confundiéndolos con reyes franceses (eran bíblicos).",
      "Sin Victor Hugo no habría catedral. Cuando publica «Nuestra Señora de París» en 1831, el edificio está ruinoso · el gobierno consideraba demolerlo. La novela genera tal movimiento popular que el estado financia una restauración masiva.",
      "15 de abril de 2019. La aguja cae a las 19:50 hora local. París se reúne en los muelles del Sena · veinte mil personas cantando ave maría a media voz mientras los bomberos salvan la fachada.",
      "Cinco años de restauración. Reapertura el 7 de diciembre de 2024. KUDOS te lleva a las catorce piedras numeradas que los canteros encontraron caídas entre los escombros y devolvieron a sus huecos exactos.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Reabierta tras cinco años de restauración · diciembre 2024. La aguja reconstruida es fiel a Viollet-le-Duc." },
      { id: "historical", title: "Historia",     body: "1163-1345 construcción inicial. Revolución la convirtió en almacén · estatuas decapitadas. Viollet-le-Duc 1845-1864." },
      { id: "cultural",   title: "Cultura",      body: "Sin Victor Hugo (1831), demolida. La aguja era invención del XIX vendida como medieval." },
      { id: "hidden",     title: "Oculto",       body: "Bajo el coro hay cripta arqueológica con ruinas galo-romanas del siglo I · descubiertas en obras del metro de 1965." },
    ],
    timeline: [
      { year: "1163", title: "Primera piedra",   body: "Maurice de Sully · inicio del coro." },
      { year: "1345", title: "Finalización",      body: "Tras 182 años de construcción discontinua." },
      { year: "1804", title: "Napoleón",          body: "Se corona a sí mismo." },
      { year: "1831", title: "Victor Hugo",       body: "Publica \"Nuestra Señora de París\"." },
      { year: "1845", title: "Viollet-le-Duc",    body: "Restauración de 25 años · añade la aguja icónica." },
      { year: "1944", title: "Liberación",        body: "Misa de Te Deum · de Gaulle." },
      { year: "2019", title: "Incendio",          body: "15 de abril · aguja cae." },
      { year: "2024", title: "Reapertura",        body: "7 de diciembre." },
    ],
    related: ["coliseo", "athens", "tokyo-showa", "santiagomateo"],
    culturalDna: ["Gótico", "París", "Resiliencia", "Hugo", "Viollet-le-Duc"],
    quotes: [
      { body: "El libro matará al edificio.", attribution: "Victor Hugo · Nuestra Señora de París", year: "1831" },
      { body: "Notre-Dame n'est pas la pierre · c'est ce qu'elle porte.", attribution: "Macron · discurso post-incendio", year: "2019" },
    ],
    sources: [
      { title: "Notre-Dame de Paris",                     author: "Allan Temko",        year: "1955" },
      { title: "Restoring Notre-Dame after Fire",         author: "Caroline Bruzelius", year: "2023" },
    ],
    audio: { duration: "2:22", description: "Campanas a las 19:50 del 15 de abril de 2019." },
  },
  {
    id: "athens", slug: "acropolis",
    title: "Acrópolis",
    subtitle: "Donde la democracia abrió los ojos.",
    placeId: "athens", place: "Atenas, Grecia",
    year: "447 a.C.", era: "roman",
    tag: "Histórica", tone: "accent",
    likes: "5.4K", saves: "1.8K", shares: "720",
    silhouette: "temple", gradientFrom: "#581c87", gradientTo: "#0a0612",
    heroFilename: "The_Parthenon_in_Athens.jpg",
    gallery: [
      { filename: "The_Parthenon_in_Athens.jpg",            caption: "Partenón · fachada · vista frontal." },
      { filename: "Acropolis_of_Athens_01.jpg",              caption: "Vista panorámica de la Acrópolis." },
      { filename: "Erechtheum_Athens.jpg",                    caption: "Cariátides del Erecteion · réplicas in situ." },
      { filename: "Parthenon_from_west.jpg",                  caption: "Detalle del orden dórico." },
    ],
    narrative: [
      "Pericles ordena en 447 a.C. construir el Partenón sobre la colina sagrada que las invasiones persas habían dejado vacía. Atenas tiene treinta años en su sistema democrático · es nuevo, frágil, único en el mundo conocido.",
      "Ictino y Calícrates diseñan, Fidias esculpe. El Partenón no tiene una sola línea recta · todas las columnas se inclinan hacia adentro casi imperceptiblemente. La perfección del Partenón es contrafáctica.",
      "Durante novecientos años sirve como templo griego, luego basílica bizantina, mezquita otomana, y polvorín. En 1687 una bomba veneciana enviada contra los turcos golpea el polvorín · vuela el techo.",
      "En 1801 Lord Elgin con un firman otomano de validez muy discutida hace cortar y enviar a Inglaterra la mitad de los frisos. Hoy están en el British Museum.",
      "KUDOS te lleva al taller de Fidias bajo la roca · al momento exacto del impacto de la bomba veneciana · a la mañana de 1801 en que los obreros de Elgin trepan al frontón.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Restauración continua desde 1975 · Museo de la Acrópolis (2009) preparado para recibir los mármoles de Elgin." },
      { id: "historical", title: "Historia",     body: "Pericles · siglo de oro · cuna de la democracia ateniense." },
      { id: "cultural",   title: "Cultura",      body: "Modelo arquitectónico replicado 2500 años · de Washington a Múnich." },
      { id: "hidden",     title: "Oculto",       body: "Los mármoles de Elgin · la mitad sigue en Londres. La Atenea Parthenos de Fidias desapareció · probablemente fundida en Constantinopla siglo V." },
    ],
    timeline: [
      { year: "447 a.C.", title: "Construcción",    body: "Pericles · Ictino, Calícrates, Fidias." },
      { year: "432 a.C.", title: "Inauguración",    body: "Partenón completo." },
      { year: "590",       title: "Basílica",         body: "Convertido en iglesia bizantina." },
      { year: "1458",      title: "Mezquita",         body: "Otomanos añaden minarete." },
      { year: "1687",      title: "Explosión",        body: "Bomba veneciana destruye el techo." },
      { year: "1801",      title: "Elgin",            body: "Mármoles cortados y enviados a Londres." },
      { year: "1832",      title: "Independencia",    body: "Grecia se independiza." },
      { year: "1975",      title: "Restauración",     body: "Comienza proyecto continuo." },
      { year: "2009",      title: "Museo Acrópolis",  body: "Bernard Tschumi." },
    ],
    related: ["coliseo", "notre", "machu"],
    culturalDna: ["Democracia", "Mármol", "Pericles", "Fidias", "Filosofía", "Dórico"],
    quotes: [
      { body: "Amamos la belleza con economía · amamos la sabiduría sin afeminamiento.", attribution: "Pericles · Discurso fúnebre", year: "431 a.C." },
    ],
    sources: [
      { title: "The Acropolis · A Cultural and Architectural History", author: "Vincent Bruno", year: "1996" },
    ],
    audio: { duration: "1:10", description: "Cigarras sobre el peristilo a mediodía." },
  },
  {
    id: "tokyo-showa", slug: "tokio-showa",
    title: "Tokio · era Shōwa",
    subtitle: "La ciudad que se reconstruyó dos veces en treinta años.",
    placeId: "tokyo", place: "Tokio, Japón",
    year: "1945", era: "modern",
    tag: "Cultural", tone: "default",
    likes: "4.8K", saves: "1.5K", shares: "640",
    silhouette: "city", gradientFrom: "#1e1b4b", gradientTo: "#0a0612",
    heroFilename: "Shibuya_Crossing_-_Tokyo_-_2015_03.jpg",
    gallery: [
      { filename: "Shibuya_Crossing_-_Tokyo_-_2015_03.jpg", caption: "Cruce diagonal de Shibuya · símbolo de la era post-Shōwa." },
      { filename: "Shinjuku_at_night.jpg",                    caption: "Shinjuku de noche · neón sobre la era reconstruida." },
      { filename: "Ginza_Tokyo.jpg",                          caption: "Ginza · época de los Juegos Olímpicos 1964." },
      { filename: "Tokyo_Tower_2011.jpg",                     caption: "Tokyo Tower · construida en 1958 sobre los restos del bombardeo." },
    ],
    narrative: [
      "Era Shōwa · 25 de diciembre de 1926 al 7 de enero de 1989. Sesenta y dos años bajo el reinado del emperador Hirohito. La Shōwa empieza en el aún humeante Tokio del Gran Terremoto Kanto de 1923.",
      "La noche del 9 al 10 de marzo de 1945 es la más oscura. Trescientos treinta y cuatro bombarderos B-29 lanzan napalm sobre Tokio durante tres horas. El viento alimenta el incendio · cuarenta kilómetros cuadrados arden · cien mil muertos en una sola noche.",
      "Reconstrucción · Plan de Hirohito + Douglas MacArthur · constitución de 1947 que renuncia formalmente a la guerra (artículo 9). Tokio se prepara para los Juegos Olímpicos de 1964.",
      "Los años setenta y ochenta · burbuja inmobiliaria, ascenso del wabi-sabi como filosofía de exportación. Cuando Hirohito muere en enero de 1989 cierra Shōwa · el Nikkei en su pico de 38.957 puntos. Doce meses después la burbuja revienta.",
      "KUDOS te lleva a los refugios antiaéreos bajo Shibuya · sellados y olvidados · al sonido del primer Shinkansen saliendo de Tokio Central el 1 de octubre de 1964.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "13.9M habitantes en el área metropolitana. Era Reiwa desde 2019." },
      { id: "historical", title: "Historia",     body: "Meiji (1868-1912) · Taishō (1912-26) · Shōwa (1926-89) · Heisei (1989-2019) · Reiwa (2019-)." },
      { id: "cultural",   title: "Cultura",      body: "Wabi-sabi, ma, kintsugi, monozukuri, mottainai. Filosofías que se exportan post-Shōwa." },
      { id: "hidden",     title: "Oculto",       body: "Bajo Shibuya hay refugios antiaéreos sellados · 1945. Los archivos del bombardeo del 10 de marzo solo se abrieron parcialmente en 2003." },
    ],
    timeline: [
      { year: "1923", title: "Terremoto Kanto", body: "Devasta Tokio · 140.000 muertos." },
      { year: "1926", title: "Inicio era Shōwa", body: "Sube al trono Hirohito." },
      { year: "1931", title: "Manchuria",         body: "Japón invade." },
      { year: "1941", title: "Pearl Harbor",       body: "7 de diciembre." },
      { year: "1945", title: "Bombardeos Tokio",  body: "10 de marzo · 100.000 muertos en una noche." },
      { year: "1945", title: "Hiroshima/Nagasaki", body: "6 y 9 de agosto." },
      { year: "1947", title: "Constitución",        body: "Pacifista · artículo 9." },
      { year: "1964", title: "Juegos Olímpicos",    body: "Shinkansen · renace ante el mundo." },
      { year: "1989", title: "Fin de Shōwa",        body: "Muere Hirohito · 7 de enero." },
      { year: "1990", title: "Burbuja revienta",     body: "Empieza la década perdida." },
    ],
    related: ["coliseo", "machu", "notre"],
    culturalDna: ["Shōwa", "Wabi-sabi", "Reconstrucción", "Shinkansen", "Hirohito"],
    quotes: [
      { body: "Soporta lo insoportable.", attribution: "Hirohito · discurso de rendición", year: "1945" },
    ],
    sources: [
      { title: "Embracing Defeat · Japan in the Wake of World War II", author: "John W. Dower", year: "1999" },
    ],
    audio: { duration: "2:48", description: "Estación Shibuya · cruce diagonal a las 17:42." },
  },
] as unknown as ReadonlyArray<MockEcho>);

export const PEOPLE: ReadonlyArray<MockPerson> = [
  { id: "maria-solano",  name: "María Solano",   handle: "@mariasolano",   bio: "Curadora · ecos romanos.",            longBio: "Doctora en historia antigua por la Sapienza. Diez años en el Parco Archeologico del Colosseo.", location: "Roma, Italia",       avatarFrom: "#a78bfa", avatarTo: "#6d28d9", echoesCount: 142, followersCount: 8420, following: true,  reason: "Comparte tu interés por Roma" },
  { id: "xose-romero",   name: "Xosé Romero",     handle: "@xose.romero",   bio: "Patrimonio gallego · O Grove a Compostela.", longBio: "Arqueólogo de campo. Áreas: megalitismo atlántico, ría de Arousa, Camino Portugués.", location: "Pontevedra, Galicia", avatarFrom: "#34d399", avatarTo: "#065f46", echoesCount: 96,  followersCount: 4210, following: true,  reason: "Cerca de tu ubicación" },
  { id: "lucia-mier",    name: "Lucía Mier",     handle: "@lucia",         bio: "Historiadora del XVI castellano.",      longBio: "Profesora de la USAL · libros sobre la universidad medieval.", location: "Salamanca, España",  avatarFrom: "#f472b6", avatarTo: "#9d174d", echoesCount: 56,  followersCount: 1820, following: true,  reason: "" },
  { id: "julien-bardo",  name: "Julien Bardo",   handle: "@julien.bardo",  bio: "Documentalista · París Belle Époque.", longBio: "Documental largo sobre el Sena.",                                location: "París, Francia",     avatarFrom: "#60a5fa", avatarTo: "#1e40af", echoesCount: 87,  followersCount: 3120, following: false, reason: "3 ecos en común" },
  { id: "kenji-tanaka",  name: "Kenji Tanaka",   handle: "@kenji.t",       bio: "Era Shōwa · audio testimonial.",        longBio: "Periodista. Entrevistas a sobrevivientes del bombardeo del 10 de marzo de 1945.", location: "Tokio, Japón",       avatarFrom: "#34d399", avatarTo: "#065f46", echoesCount: 198, followersCount: 12030, following: false, reason: "Sigue a 5 conexiones tuyas" },
  { id: "ines-castel",   name: "Inés Castel",    handle: "@inescastel",    bio: "Mapeando los Andes ocultos.",            longBio: "Antropóloga · doce años en comunidades quechuas.", location: "Cusco, Perú",        avatarFrom: "#fbbf24", avatarTo: "#92400e", echoesCount: 73,  followersCount: 2540, following: false, reason: "Cerca de Machu Picchu" },
  { id: "amir-haddad",   name: "Amir Haddad",    handle: "@amirhaddad",    bio: "Arquitecto · ecos góticos.",             longBio: "Trabajé en la restauración de Notre-Dame entre 2020 y 2024.", location: "París, Francia",     avatarFrom: "#c084fc", avatarTo: "#6b21a8", echoesCount: 41,  followersCount: 980,  following: true,  reason: "" },
  { id: "paolo-rinaldi", name: "Paolo Rinaldi",  handle: "@paolo",         bio: "Hipogeos del Coliseo.",                  longBio: "Guía especializado en los pasajes subterráneos.", location: "Roma, Italia",       avatarFrom: "#fb7185", avatarTo: "#9f1239", echoesCount: 34,  followersCount: 720,  following: true,  reason: "" },
];

export const MOMENTS: ReadonlyArray<MockMoment> = ([
  { id: "m1",  type: "audio", title: "Susurros en el foro",                                  place: "Roma, Italia",         when: "hace 2h",   duration: "0:42", privacy: "public"  },
  { id: "m2",  type: "image", title: "Atardecer en el Sena · pasarela Senghor",               place: "París, Francia",        when: "hace 5h",                     privacy: "circle", imageFilename: "Pont_des_Arts_Paris.jpg" },
  { id: "m3",  type: "text",  title: "Lo que escuché en el patio de las escuelas mayores",   body: "Las palmeras estaban quietas. El reloj de la universidad marcaba un siglo distinto al mío.", place: "Salamanca, España", when: "ayer", privacy: "public" },
  { id: "m4",  type: "audio", title: "Lluvia sobre el cruce diagonal de Shibuya",             place: "Tokio, Japón",         when: "hace 2d",   duration: "1:18", privacy: "public" },
  { id: "m5",  type: "image", title: "Niebla sobre el Huayna · 5:47 AM",                      place: "Machu Picchu, Perú",   when: "hace 4d",                     privacy: "private", imageFilename: "Machu_Picchu_early_morning.jpg" },
  { id: "m6",  type: "text",  title: "El mármol estaba frío incluso a las dos de la tarde",  body: "Cien personas, cien idiomas. Todos buscando lo mismo.", place: "Atenas, Grecia", when: "hace 1 sem", privacy: "circle" },
  { id: "m7",  type: "audio", title: "Eco del Coliseo a las 6 AM",                            place: "Roma, Italia",         when: "hace 2 sem", duration: "0:28", privacy: "public" },
  { id: "m8",  type: "image", title: "Areoso bajo niebla matinal",                            place: "O Grove, Galicia",     when: "hace 1 mes",                  privacy: "public", imageFilename: "Illa_de_Areoso_marea_baixa.jpg" },
  { id: "m9",  type: "text",  title: "Lo que el guía no contó sobre Shibuya",                 body: "Bajo Shibuya hay puertas selladas que datan de 1944. Lo sé porque pregunté y nadie respondió.", place: "Tokio, Japón", when: "hace 1 mes", privacy: "circle" },
  { id: "m10", type: "audio", title: "Las campanas de Notre-Dame al reabrir",                 place: "París, Francia",       when: "hace 2 meses", duration: "2:14", privacy: "public" },
  { id: "m11", type: "image", title: "Praza da Leña al amanecer · sin tráfico",               place: "Pontevedra, Galicia",  when: "hace 3 meses",                privacy: "public", imageFilename: "Pontevedra-Praza_da_Le%C3%B1a-2.jpg" },
  { id: "m12", type: "text",  title: "Lo que escribí en el suelo del foro y la lluvia borró", body: "Volví tres días después. La frase se había ido.", place: "Roma, Italia", when: "hace 4 meses", privacy: "public" },
] as unknown as ReadonlyArray<MockMoment>);

export const NOTIFICATIONS: ReadonlyArray<MockNotification> = [
  { id: "n1",  category: "merit",    title: "+25 mérito · compartiste el Coliseo",   body: "Tu cápsula \"Lo que casi nadie sabe del Coliseo Romano\" llegó a 12 personas.", when: "ahora",       read: false, href: "/merito" },
  { id: "n2",  category: "nearby",   title: "Eco cercano · Areoso",                  body: "Xosé Romero publicó una capa sobre las mámoas neolíticas a 4 km de ti.",         when: "hace 2m",    read: false, href: "/echo/areoso" },
  { id: "n3",  category: "creator",  title: "Tu cápsula está funcionando",           body: "Score 72/100 · alguien la está reproduciendo desde Lisboa ahora mismo.",          when: "hace 6m",    read: false, href: "/studio" },
  { id: "n4",  category: "social",   title: "Marta López guardó tu ruta",            body: "\"Roma en 1 día\" · ahora con 47 guardados totales.",                          when: "hace 14m",   read: false, href: "/mi-mundo" },
  { id: "n5",  category: "merit",    title: "Subiste a Nivel 4 · Explorador",        body: "Mérito desbloqueado · 75% al siguiente nivel.",                                   when: "hace 18m",   read: false, href: "/merito" },
  { id: "n6",  category: "place",    title: "Sagrada Familia · época V",             body: "Restauración del Pórtico de la Gloria publicada · 8 ecos nuevos en 1 h.",         when: "hace 42m",   read: false, href: "/echo/sagrada-familia" },
  { id: "n7",  category: "social",   title: "Tu share fue abierto",                  body: "Alguien abrió la cápsula que compartiste anoche desde París.",                    when: "hace 1h",    read: true,  href: "/studio" },
  { id: "n8",  category: "nearby",   title: "Machu Picchu · ventana abierta",        body: "Cupo disponible mañana 09:00 · entradas para circuito 2.",                        when: "hace 2h",    read: true,  href: "/echo/machu" },
  { id: "n9",  category: "temporal", title: "Atenas · Acrópolis siglo V a.C.",       body: "Nueva capa temporal recreando la policromía original del Partenón.",              when: "hace 3h",    read: true,  href: "/echo/athens" },
  { id: "n10", category: "place",    title: "Pontevedra despierta",                   body: "Una nueva capa medieval sobre la Praza da Leña acaba de abrir.",                  when: "hace 4h",    read: true,  href: "/echo/pontevedra-medieval" },
  { id: "n11", category: "creator",  title: "100 reproducciones · Notre-Dame",       body: "Tu cápsula cruzó el milestone · pillar Inspiración +18.",                          when: "hace 6h",    read: true,  href: "/merito" },
  { id: "n12", category: "social",   title: "Paolo te mencionó",                     body: "\"...mira este eco que encontró @efertrobo en los hipogeos\".",                  when: "hace 8h",    read: true,  href: "/conexiones" },
  { id: "n13", category: "temporal", title: "Santiago · siglo XII",                  body: "Una capa románica del Pórtico da Gloria abrió cerca de ti.",                       when: "ayer",        read: true,  href: "/echo/santiagomateo" },
  { id: "n14", category: "merit",    title: "Racha · 7 días seguidos",               body: "Multiplicador racha activo · 1.35x en cada acción durante 24h.",                   when: "ayer",        read: true,  href: "/merito" },
  { id: "n15", category: "place",    title: "Petra · Tesoro de Petra",               body: "Aniversario del descubrimiento (1812) · 4 ecos curados.",                          when: "hace 2d",    read: true,  href: "/echo/petra" },
  { id: "n16", category: "creator",  title: "50 saves en tu cápsula",                body: "Tu cápsula \"Coliseo · hipogeos\" cruzó el milestone de 50 saves.",              when: "hace 2d",    read: true,  href: "/studio" },
  { id: "n17", category: "social",   title: "Una persona se unió a tu ruta",          body: "\"París romántico\" tiene un nuevo viajero · 12 paradas, 2 días.",              when: "hace 3d",    read: true,  href: "/mi-mundo" },
  { id: "n18", category: "nearby",   title: "Alhambra · cuota agosto",                body: "Disponibilidad reducida el próximo mes · reserva con antelación.",                 when: "hace 4d",    read: true,  href: "/echo/alhambra" },
  { id: "n19", category: "system",   title: "KUDOS Mind v0.8 disponible",             body: "Mejoras en respuestas contextuales · citas verificadas con fuente.",                when: "hace 5d",    read: true,  href: "/mind" },
  { id: "n20", category: "nearby",   title: "Tokio Shibuya · Kenji T.",               body: "Kenji Tanaka publicó una entrevista grabada · 4:12 · era Shōwa.",                  when: "hace 6d",    read: true,  href: "/echo/tokyo-showa" },
  { id: "n21", category: "social",   title: "Paolo te empieza a seguir",              body: "Paolo Rinaldi te sigue desde Roma · curador de hipogeos.",                          when: "hace 1 sem", read: true,  href: "/conexiones" },
  { id: "n22", category: "place",    title: "Notre-Dame reabrió",                     body: "Hay 12 ecos nuevos publicados en las primeras 72 horas.",                           when: "hace 2 sem", read: true,  href: "/echo/notre" },
  { id: "n23", category: "merit",    title: "Logro · Curador (50 guardados)",         body: "Has guardado tu lugar 50 · medalla \"Curador\" desbloqueada.",                    when: "hace 2 sem", read: true,  href: "/merito" },
  { id: "n24", category: "temporal", title: "Estambul · Hagia Sophia 537 d.C.",       body: "Reconstrucción 3D de la consagración bizantina · capa inaugural.",                  when: "hace 3 sem", read: true,  href: "/echo/hagia-sofia" },
];

export const MIND_CONVERSATION: ReadonlyArray<MockMindMessage> = [
  { id: "u1", role: "user", body: "¿Qué pasó en Roma el año 64?" },
  { id: "m1", role: "mind",
    body: "El gran incendio. 18 de julio del 64 d.C. · ardió seis días · destruyó 10 de los 14 distritos de Roma. Nerón estaba en Antium · regresó al ver el humo y organizó el rescate · ofreció su propio palacio para los desplazados. Pero también culpó a los cristianos · empezó la primera persecución organizada · y luego construyó la Domus Aurea sobre las cenizas. La leyenda de que tocó la lira mientras Roma ardía viene de Suetonio y Dion Casio · escrita un siglo después. Tácito, más cercano, lo niega.",
    cards: [
      { title: "El Coliseo Romano",  subtitle: "Construido sobre el lago de la Domus Aurea · 80 d.C.", href: "/echo/coliseo" },
      { title: "Lugar · Roma",       subtitle: "Atlas vivo de la ciudad imperial",                      href: "/places/rome" },
    ],
    citations: [
      { title: "Tácito · Anales XV", year: "c. 116 d.C." },
      { title: "Suetonio · Vida de los doce césares", year: "c. 121 d.C." },
    ],
  },
  { id: "u2", role: "user", body: "Conéctame con el Coliseo." },
  { id: "m2", role: "mind",
    body: "Hay un puente directo. Tras el incendio del 64, Nerón se queda el suelo quemado · construye la Domus Aurea con su lago central. Cuando Vespasiano llega al poder en el 69 d.C., devuelve ese suelo al pueblo · sobre el lago de Nerón levanta el anfiteatro Flavio. El Coliseo es, literalmente, la respuesta política al incendio.",
    cards: [
      { title: "Cápsula · Coliseo", subtitle: "El monumento que reescribió la memoria romana", href: "/capsules/coliseo" },
    ],
    citations: [
      { title: "Mary Beard · SPQR", year: "2015" },
    ],
  },
  { id: "u3", role: "user", body: "¿Hay algo cerca de O Grove?" },
  { id: "m3", role: "mind",
    body: "Sí · el islote de Areoso. A 4 km de tu posición actual. Conjunto megalítico del neolítico atlántico · datado por C14 entre 3500 y 2200 a.C. · uno de los pocos yacimientos europeos donde la duna ha ido descubriendo las mámoas funerarias en vez de cubrirlas. Está en marea baja desde el muelle de O Grove en cinco minutos a pie.",
    cards: [
      { title: "Os castros de Areoso",     subtitle: "Megalitismo atlántico · 3000 a.C. · 4 km de ti",  href: "/echo/areoso" },
      { title: "Lugar · O Grove",          subtitle: "Galicia atlántica · ría de Arousa",                href: "/places/ogrove" },
    ],
    citations: [
      { title: "Antonio Rodríguez Casal · El megalitismo en Galicia", year: "1990" },
    ],
  },
];

export const ERAS: Readonly<Record<EraId, { label: string; year: string; tint: string; from: string; to: string }>> = {
  roman:       { label: "Romana / Antigüedad", year: "Antes de 500 d.C.",     tint: "#f59e0b", from: "#7c2d12", to: "#1c1917" },
  medieval:    { label: "Medieval",            year: "500 - 1400",            tint: "#a78bfa", from: "#581c87", to: "#0a0612" },
  renaissance: { label: "Renacimiento",        year: "1400 - 1700",           tint: "#fbbf24", from: "#92400e", to: "#1c1917" },
  modern:      { label: "Moderna",              year: "1700 - 2000",           tint: "#60a5fa", from: "#1e3a8a", to: "#0a0612" },
  today:       { label: "Hoy",                   year: "Presente",               tint: "#a78bfa", from: "#6d28d9", to: "#0a0612" },
};

export const LAYERS: Readonly<Record<LayerId, { label: string; tint: string; description: string }>> = {
  real:       { label: "Realidad",  tint: "#a78bfa", description: "Lo que ves hoy." },
  historical: { label: "Historia",  tint: "#fbbf24", description: "Lo que pasó." },
  cultural:   { label: "Cultura",   tint: "#60a5fa", description: "Lo que significa." },
  hidden:     { label: "Oculto",    tint: "#f87171", description: "Lo que nadie cuenta." },
};



// ---------------------------------------------------------------------------
// Post-process · resolve Wikimedia URLs for each echo + gallery + video + moment
// Mutates objects in place at module load.
// ---------------------------------------------------------------------------
// ─── P12 · NEW ECHOES (content density expansion) ────────────────────────
(ECHOES_CORE as MockEcho[]).push(...([
  {
    id: "sagrada-familia", slug: "sagrada-familia",
    title: "La Sagrada Familia",
    subtitle: "Cien años para nacer · diez para terminar la torre central.",
    placeId: "barcelona", place: "Barcelona, España",
    year: "1882-presente", era: "modern",
    tag: "Arquitectura", tone: "ok",
    likes: "21.4k", saves: "9.8k", shares: "3.1k",
    silhouette: "cathedral", gradientFrom: "#0d9488", gradientTo: "#0a0612",
    heroFilename: "Sagrada_Familia_8-12-21_%282%29.jpg",
    heroImage: "",
    gallery: [
      { filename: "Sagrada_Familia_8-12-21_%282%29.jpg", caption: "Fachada del Nacimiento · ejecutada por Gaudí en vida." },
      { filename: "Sagrada_Familia_-_Sagrada_Familia%2C_Barcelona.jpg", caption: "Cubierta interior · bosque de columnas inclinadas." },
      { filename: "Passion_facade_of_Sagrada_Fam%C3%ADlia%2C_Barcelona%2C_April_2009.JPG", caption: "Fachada de la Pasión · Subirachs · trazo expresionista." },
      { filename: "Sagrada_Familia_Nave_Roof_Detail.jpg", caption: "Detalle del techo · paraboloides hiperbólicos." },
    ],
    narrative: [
      "Gaudí dedicó los últimos 43 años de su vida a un solo edificio · sabiendo que no lo vería terminado.",
      "Cuando muere atropellado por un tranvía en 1926, solo la fachada del Nacimiento estaba completa. La Guerra Civil quemó sus modelos en yeso · los planos hubo que reconstruirlos a partir de fotografías.",
      "La consagración papal de 2010 la convirtió en basílica menor antes de estar terminada · caso único en la historia de la Iglesia.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Visitas con horario · 26 € entrada general. Conclusión técnica prevista 2026, centenario de la muerte de Gaudí. Las escaleras de la nueva torre central rebasan los 172 metros." },
      { id: "historical", title: "Historia",      body: "Encargo del librero Bocabella en 1882 · Villar empezó · Gaudí toma la dirección en 1883 con 31 años. Bombardeada con Molotov por anarquistas en 1936." },
      { id: "cultural",   title: "Cultura",      body: "Cada una de las 18 torres tiene un significado teológico · 12 apóstoles, 4 evangelistas, Virgen María, Cristo. La torre central llegará a 172,5 metros · un metro por debajo de Montjuïc por respeto." },
      { id: "hidden",     title: "Oculto",       body: "El criptograma matemático de la fachada de la Pasión suma 33 en cualquier dirección · edad de Cristo. Hay una tortuga y un galápago en la base de dos columnas · símbolos de la cadencia oceánica vs. terrestre." },
    ],
    timeline: [
      { year: "1882",    title: "Inicio",         body: "Bocabella encarga · Villar comienza." },
      { year: "1883",    title: "Gaudí toma",     body: "Reorientación total del proyecto." },
      { year: "1926",    title: "Muerte de Gaudí", body: "Atropellado por tranvía · funeral multitudinario." },
      { year: "1936-39", title: "Guerra Civil",    body: "Talleres quemados · modelos destruidos." },
      { year: "2010",    title: "Consagración",    body: "Benedicto XVI · basílica menor." },
      { year: "2026",    title: "Finalización",    body: "Centenario · torre central completada." },
    ],
    related: ["coliseo", "notre", "santiagomateo"],
    culturalDna: ["modernismo catalán", "naturalismo arquitectónico"],
    quotes: [],
    sources: [
      { title: "Antoni Gaudí · La obra inacabada", author: "Daniel Giralt-Miracle", year: "2002" },
      { title: "Sagrada Família · official guidebook", author: "Junta Constructora", year: "2023" },
    ],
  },
  {
    id: "alhambra", slug: "alhambra",
    title: "La Alhambra",
    subtitle: "La luz roja de Granada · último palacio musulmán de Europa.",
    placeId: "granada", place: "Granada, España",
    year: "1238-1492", era: "medieval",
    tag: "Cultural", tone: "ok",
    likes: "18.2k", saves: "11.1k", shares: "2.8k",
    silhouette: "cathedral", gradientFrom: "#b45309", gradientTo: "#0a0612",
    heroFilename: "Spain_Andalusia_Granada_BW_2015-10-24_17-10-44.jpg",
    heroImage: "",
    gallery: [
      { filename: "Spain_Andalusia_Granada_BW_2015-10-24_17-10-44.jpg", caption: "Vista de la Alhambra desde el Albaicín al atardecer." },
      { filename: "Patio_de_los_Leones_-_Alhambra.jpg",                   caption: "Patio de los Leones · 124 columnas de mármol blanco." },
      { filename: "Sala_de_los_Reyes_-_Alhambra.jpg",                      caption: "Sala de los Reyes · pinturas únicas de figura humana islámica." },
      { filename: "Generalife_de_la_Alhambra.jpg",                          caption: "Jardines del Generalife · sistema hidráulico nazarí." },
    ],
    narrative: [
      "Cuando Boabdil entrega las llaves en 1492 · llora desde el último mirador. Su madre Aixa le dice la frase que la historia recordó: \"Llora como mujer lo que no supiste defender como hombre\".",
      "Los Reyes Católicos firman las capitulaciones en una sala que aún hoy se visita. Cristóbal Colón viene aquí a pedir la financiación del viaje · la recibe seis meses después.",
      "Washington Irving la rescata del olvido en 1832 con sus Cuentos de la Alhambra · los románticos europeos la convierten en mito turístico antes de que existiera el turismo.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "2,7M visitantes/año · cupo limitado a 6.600/día. Entrada 14 € · reserva imprescindible con semanas de antelación. Visitas nocturnas a los Palacios Nazaríes 5 noches por semana." },
      { id: "historical", title: "Historia",      body: "Mohamed I (1238) funda la dinastía nazarí · 250 años de florecimiento. Última frontera musulmana en Europa occidental." },
      { id: "cultural",   title: "Cultura",       body: "Caligrafía cúfica y nasjí en cada muro · poemas de Ibn Zamrak grabados en las paredes del Patio de los Leones funcionan como ornamento y literatura simultáneamente." },
      { id: "hidden",     title: "Oculto",       body: "Bajo el suelo del Palacio de Carlos V hay restos arqueológicos del barrio andalusí destruido para construirlo. La fuente del Patio de los Leones tiene marcas zodiacales · reloj de agua que funcionaba con el caudal del Darro." },
    ],
    timeline: [
      { year: "1238",     title: "Mohamed I",       body: "Funda la dinastía nazarí · primer recinto." },
      { year: "1333-91",  title: "Yusuf I y Mohamed V", body: "Palacios Nazaríes · cumbre del arte islámico." },
      { year: "1492",     title: "Capitulaciones",   body: "Boabdil entrega Granada a los Reyes Católicos." },
      { year: "1527",     title: "Palacio de Carlos V", body: "Pedro Machuca · renacimiento sobre lo islámico." },
      { year: "1832",     title: "Washington Irving", body: "Cuentos de la Alhambra · redescubrimiento romántico." },
      { year: "1984",     title: "UNESCO",          body: "Patrimonio Mundial." },
    ],
    related: ["santiagomateo", "athens", "petra"],
    culturalDna: ["arte nazarí", "al-Andalus"],
    quotes: [],
    sources: [
      { title: "La Alhambra · Atlas histórico", author: "Antonio Fernández-Puertas", year: "1997" },
      { title: "Cuentos de la Alhambra", author: "Washington Irving", year: "1832" },
    ],
  },
  {
    id: "petra", slug: "petra",
    title: "Petra · ciudad excavada",
    subtitle: "Una ciudad tallada en piedra rosa · perdida para Occidente diez siglos.",
    placeId: "petra", place: "Petra, Jordania",
    year: "Siglo IV a.C. - 663 d.C.", era: "roman",
    tag: "Misteriosa", tone: "accent",
    likes: "16.7k", saves: "8.4k", shares: "2.3k",
    silhouette: "temple", gradientFrom: "#9a3412", gradientTo: "#0a0612",
    heroFilename: "Treasury_petra.jpg",
    heroImage: "",
    gallery: [
      { filename: "Treasury_petra.jpg",            caption: "Al-Khazneh · el Tesoro · fachada nabatea al amanecer." },
      { filename: "Petra_Jordan_BW_2010-09-22_29.jpg", caption: "El Siq · garganta de 1,2 km de acceso al recinto." },
      { filename: "Petra_-_Al-Deir_-_panoramio.jpg",   caption: "Ad-Deir · el Monasterio · 50 metros de altura." },
      { filename: "Petra_-_Royal_Tombs.jpg",            caption: "Tumbas Reales · necrópolis nabatea." },
    ],
    narrative: [
      "Los nabateos eran nómadas convertidos en mercaderes · controlaron la ruta del incienso desde el siglo IV a.C. Petra era su tesorería y refugio.",
      "El emperador Trajano la anexiona a Roma en el 106 d.C. La ciudad sigue funcionando dos siglos más · luego un terremoto en el 363 colapsa el sistema de cisternas que la sostenía en pleno desierto.",
      "Tras la conquista árabe del siglo VII desaparece de los mapas europeos. La redescubre el explorador suizo Johann Ludwig Burckhardt en 1812 · disfrazado de peregrino árabe.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Patrimonio UNESCO · 800k visitantes/año pre-pandemia. Entrada 50 dinares · imprescindible amanecer para ver el Tesoro iluminado. Visita nocturna con velas los lunes, miércoles y jueves." },
      { id: "historical", title: "Historia",      body: "Capital del reino nabateo · ruta del incienso entre Arabia y el Mediterráneo. Anexionada a Roma · provincia de Arabia Pétrea." },
      { id: "cultural",   title: "Cultura",       body: "Sincretismo único · arte greco-romano sobre piedra arenisca rosa · iconografía egipcia, nabatea y helenística superpuesta." },
      { id: "hidden",     title: "Oculto",       body: "Solo se ha excavado el 15% del recinto · imagen satelital revela 4.000 estructuras más bajo la arena. El sistema hidráulico nabateo captaba el agua de inundaciones repentinas mediante represas escalonadas." },
    ],
    timeline: [
      { year: "S. IV a.C.", title: "Fundación nabatea", body: "Asentamiento estable en el cruce de rutas." },
      { year: "S. I a.C.",  title: "Apogeo",            body: "Tesoro · Monasterio · necrópolis." },
      { year: "106 d.C.",   title: "Anexión romana",     body: "Trajano · provincia Arabia Pétrea." },
      { year: "363",        title: "Terremoto",          body: "Colapso del sistema de cisternas." },
      { year: "1812",       title: "Redescubrimiento",   body: "Burckhardt · primer europeo en mil años." },
      { year: "1985",       title: "UNESCO",             body: "Patrimonio Mundial." },
    ],
    related: ["coliseo", "athens", "hagia-sofia"],
    culturalDna: ["arte nabateo", "ruta del incienso"],
    quotes: [],
    sources: [
      { title: "Petra · Lost City of Stone", author: "Glenn Markoe", year: "2003" },
      { title: "Travels in Syria and the Holy Land", author: "Johann Ludwig Burckhardt", year: "1822" },
    ],
  },
  {
    id: "hagia-sofia", slug: "hagia-sofia",
    title: "Hagia Sofía",
    subtitle: "Mil años el edificio más grande del mundo · hoy mezquita otra vez.",
    placeId: "istanbul", place: "Estambul, Turquía",
    year: "537 d.C.", era: "medieval",
    tag: "Cultural", tone: "ok",
    likes: "19.5k", saves: "10.2k", shares: "2.7k",
    silhouette: "cathedral", gradientFrom: "#7c2d12", gradientTo: "#0a0612",
    heroFilename: "Hagia_Sophia_Mars_2013.jpg",
    heroImage: "",
    gallery: [
      { filename: "Hagia_Sophia_Mars_2013.jpg",                          caption: "Hagia Sofía desde el Bósforo · cuatro minaretes otomanos." },
      { filename: "Interior_of_Hagia_Sophia_3.jpg",                       caption: "Interior · cúpula de 31m sin pechinas visibles." },
      { filename: "Mosaic_of_christ_pantocrator%2C_hagia_sophia.jpg",     caption: "Cristo Pantocrátor · mosaico bizantino del s. XII." },
      { filename: "Hagia_Sophia_Mihrab.jpg",                              caption: "Mihrab otomano · giro de orientación tras 1453." },
    ],
    narrative: [
      "Justiniano la encarga en el 532. Antemio de Tralles e Isidoro de Mileto · matemáticos antes que arquitectos · resuelven en cinco años una cúpula que no se podía construir.",
      "Cuando se inaugura en el 537, el emperador entra y dice la frase: \"Salomón, te he superado\". Durante mil años fue el edificio más grande del mundo conocido.",
      "Mehmed II la convierte en mezquita en 1453 · Atatürk en museo en 1934 · Erdogan en mezquita otra vez en 2020. Los mosaicos bizantinos se cubren con paneles desplazables en horas de oración.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Mezquita activa desde 2020 · entrada libre fuera de las cinco oraciones diarias. Los mosaicos se cubren temporalmente · siguen presentes. UNESCO mantiene su estatus de Patrimonio Mundial." },
      { id: "historical", title: "Historia",      body: "Tercer templo en el sitio · los dos anteriores incendiados en motines. Construida en 5 años con materiales traídos de toda la Antigüedad · columnas de Éfeso y Baalbek." },
      { id: "cultural",   title: "Cultura",       body: "Modelo de toda iglesia ortodoxa posterior · de Venecia a Kiev. La cúpula sin pechinas visibles fue copiada literalmente por Sinan al construir las mezquitas de Estambul · culminando con la Mezquita Azul a 100 m." },
      { id: "hidden",     title: "Oculto",       body: "Hay grafitis vikingos en el balcón sur · runas de guardias varegos en el siglo IX. El terremoto del 558 derribó la cúpula original · la actual es de Isidoro el Joven · sobrino del arquitecto." },
    ],
    timeline: [
      { year: "532",  title: "Encargo",     body: "Justiniano · arquitectos Antemio e Isidoro." },
      { year: "537",  title: "Consagración", body: "\"Salomón, te he superado\"." },
      { year: "558",  title: "Terremoto",    body: "Cúpula colapsa · reconstrucción · 562." },
      { year: "1054", title: "Cisma",        body: "Excomunión católico-ortodoxa firmada en su altar." },
      { year: "1453", title: "Mezquita",     body: "Mehmed II tras la caída de Constantinopla." },
      { year: "2020", title: "Mezquita 2",   body: "Reconversión bajo Erdogan." },
    ],
    related: ["coliseo", "notre", "athens"],
    culturalDna: ["arte bizantino", "arquitectura otomana"],
    quotes: [],
    sources: [
      { title: "Hagia Sophia · A Sourcebook", author: "Robert Mark", year: "1992" },
      { title: "Procopio · De Aedificiis", author: "Procopio de Cesarea", year: "c. 555" },
    ],
  },
  {
    id: "torre-eiffel", slug: "torre-eiffel",
    title: "La Torre Eiffel",
    subtitle: "Una protesta arquitectónica que se quedó · 300 metros de hierro provisional.",
    placeId: "paris", place: "París, Francia",
    year: "1889", era: "modern",
    tag: "Arquitectura", tone: "ok",
    likes: "32.1k", saves: "14.6k", shares: "5.2k",
    silhouette: "tower", gradientFrom: "#374151", gradientTo: "#0a0612",
    heroFilename: "Tour_Eiffel_Wikimedia_Commons.jpg",
    heroImage: "",
    gallery: [
      { filename: "Tour_Eiffel_Wikimedia_Commons.jpg",     caption: "Torre Eiffel desde el Campo de Marte · vista clásica." },
      { filename: "Eiffel_Tower_from_the_Trocadero.jpg",    caption: "Vista desde el Trocadero · simetría intencional." },
      { filename: "Eiffel_Tower_-_construction_animation.gif", caption: "Construcción 1887-1889 · 18.038 piezas, 2,5M remaches." },
      { filename: "Eiffel_Tower_-_view_from_above.jpg",     caption: "Vista cenital · cuatro pilares curvos por cálculo de viento." },
    ],
    narrative: [
      "Gustave Eiffel propone una torre de 300 metros para la Exposición Universal de 1889. 300 artistas firman un manifiesto contra ella · \"un cadáver de hierro\".",
      "Era provisional · concesión por 20 años. La salvan dos cosas: las antenas de radio del ejército francés en 1909, y el hecho de que ya nadie quería pagar para desmontarla.",
      "Hitler ordena dinamitarla en agosto de 1944. El general alemán Von Choltitz desobedece la orden directa. París sigue teniendo torre.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "7M visitantes/año · monumento más visitado del mundo de pago. Repintada cada 7 años · 60 toneladas de pintura. Ascensores Otis originales de 1899 todavía funcionando." },
      { id: "historical", title: "Historia",      body: "Símbolo de la Exposición Universal del centenario de la Revolución · más alta del mundo hasta el Chrysler Building en 1930. Estuvo a punto de demolerse cuatro veces." },
      { id: "cultural",   title: "Cultura",       body: "Pasó de odiada a icónica en una generación · Apollinaire la convierte en mito moderno en 1913. Sin ella, el siglo XX visual de París sería incomprensible." },
      { id: "hidden",     title: "Oculto",       body: "Eiffel tenía un apartamento privado en el tercer piso · invitó a Edison a tomar cócteles. Se mantiene cerrado al público y reconstruido como exhibición. La torre crece 15 cm en verano por dilatación térmica del hierro." },
    ],
    timeline: [
      { year: "1884",   title: "Boceto inicial", body: "Maurice Koechlin · ingeniero del taller Eiffel." },
      { year: "1887-89", title: "Construcción",  body: "26 meses · 121 obreros simultáneos." },
      { year: "1889",   title: "Inauguración",  body: "Exposición Universal · 31 de marzo." },
      { year: "1909",   title: "Salvada",       body: "Antenas militares · concesión renovada." },
      { year: "1944",   title: "Liberación",   body: "Von Choltitz desobedece la orden de Hitler." },
      { year: "1985",   title: "Iluminación",  body: "Pierre Bideau · 336 proyectores doradorados." },
    ],
    related: ["notre", "sagrada-familia", "coliseo"],
    culturalDna: ["arquitectura del hierro", "modernismo francés"],
    quotes: [],
    sources: [
      { title: "Eiffel · Le magicien du fer", author: "Bertrand Lemoine", year: "2008" },
      { title: "Mémoires en Sorbonne", author: "Gustave Eiffel", year: "1907" },
    ],
  },
  {
    id: "sacsayhuaman", slug: "sacsayhuaman",
    title: "Sacsayhuamán",
    subtitle: "Piedras de cien toneladas encajadas sin mortero · nadie sabe cómo.",
    placeId: "cusco", place: "Cusco, Perú",
    year: "1438-1532", era: "renaissance",
    tag: "Misteriosa", tone: "accent",
    likes: "12.8k", saves: "6.9k", shares: "1.8k",
    silhouette: "mountain", gradientFrom: "#3f6212", gradientTo: "#0a0612",
    heroFilename: "Sacsayhuam%C3%A1n_-_001.jpg",
    heroImage: "",
    gallery: [
      { filename: "Sacsayhuam%C3%A1n_-_001.jpg",                caption: "Muros ciclópeos · sillería poligonal inca." },
      { filename: "Sacsayhuaman_Cusco_Peru.jpg",                  caption: "Vista panorámica · forma de zigzag · cabeza del puma cusqueño." },
      { filename: "Inca_walls_Cuzco.jpg",                          caption: "Detalle del encaje · sin mortero, junta de cuchillo." },
      { filename: "Inti_Raymi_2014_-_Sacsayhuam%C3%A1n.jpg",         caption: "Inti Raymi · ceremonia solar reactivada cada 24 de junio." },
    ],
    narrative: [
      "Pachacútec ordena construirla en 1438 · 20.000 hombres trabajando durante medio siglo. Las piedras más grandes pesan 125 toneladas · vienen de canteras a 30 km.",
      "Los conquistadores españoles la usan como cantera durante el siglo XVI · construyen la mayoría de la Cusco colonial con sus piedras. Solo se conservan los muros bajos · imposibles de mover.",
      "Cusco entera tiene forma de puma · Sacsayhuamán es la cabeza. Los muros zigzagueantes son los dientes. Lo documenta el cronista mestizo Inca Garcilaso de la Vega en 1609.",
    ],
    layers: [
      { id: "real",       title: "Realidad hoy", body: "Parque Arqueológico · 1.5M visitantes/año. Entrada incluida con el boleto turístico de Cusco · 130 soles. Inti Raymi cada 24 de junio · 50.000 espectadores." },
      { id: "historical", title: "Historia",      body: "Construcción de medio siglo bajo Pachacútec · Túpac Yupanqui · Huayna Cápac. Sitio de la batalla de 1536 entre Manco Inca y Pizarro." },
      { id: "cultural",   title: "Cultura",       body: "Centro ceremonial andino · alineamientos astronómicos para solsticios y equinoccios. La técnica de sillería inca sin mortero es resistente a los terremotos andinos · supera a las construcciones coloniales españolas." },
      { id: "hidden",     title: "Oculto",       body: "Hay un sistema de túneles subterráneos · el chinkana · que conectaría Sacsayhuamán con el Coricancha. Cerrado al público desde una expedición que se perdió en 1923." },
    ],
    timeline: [
      { year: "1438",  title: "Pachacútec",       body: "Inicio · expansión del imperio." },
      { year: "1471",  title: "Túpac Yupanqui",   body: "Continuación." },
      { year: "1493",  title: "Huayna Cápac",     body: "Completa la fortaleza." },
      { year: "1536",  title: "Batalla",          body: "Manco Inca asedia Cusco desde aquí." },
      { year: "1559",  title: "Cantera",          body: "Españoles desmontan piedras altas." },
      { year: "1944",  title: "Inti Raymi",      body: "Reinvención ceremonial · revival andino." },
    ],
    related: ["machu", "athens", "petra"],
    culturalDna: ["arquitectura inca", "sillería poligonal"],
    quotes: [],
    sources: [
      { title: "Inca Land", author: "Hiram Bingham", year: "1922" },
      { title: "Comentarios Reales", author: "Inca Garcilaso de la Vega", year: "1609" },
    ],
  },
] as unknown as MockEcho[]));

(function resolveWikimediaUrls() {
  for (const echo of ECHOES_CORE) {
    (echo as { heroImage: string }).heroImage = wikimediaUrl(echo.heroFilename, 1600);
    for (const g of echo.gallery) {
      (g as { src: string }).src = wikimediaUrl(g.filename, 1200);
    }
  }
  for (const m of MOMENTS) {
    if (m.imageFilename) {
      (m as { image?: string }).image = wikimediaUrl(m.imageFilename, 800);
    }
  }
})();

// ---------------------------------------------------------------------------
// Post-process · attach temporal epochs to echoes + resolve epoch URLs.
// Lives in a sidecar module so the giant ECHOES literal stays readable.
// ---------------------------------------------------------------------------
import { ECHO_EPOCHS } from "./epochs";

(function attachEpochs() {
  for (const echo of ECHOES_CORE) {
    const epochs = ECHO_EPOCHS[echo.id];
    if (epochs && epochs.length > 0) {
      for (const ep of epochs) {
        (ep as { heroImage: string }).heroImage = wikimediaUrl(ep.heroFilename, 1600);
        if (ep.reconstructionFilename) {
          (ep as { reconstructionImage?: string }).reconstructionImage = wikimediaUrl(ep.reconstructionFilename, 1200);
        }
      }
      (echo as { epochs?: ReadonlyArray<typeof epochs[number]> }).epochs = epochs;
    }
  }
})();

// ---------------------------------------------------------------------------
// Viral hooks · cinematic opening line per capsule. Used by the hook frame.
// ---------------------------------------------------------------------------
const VIRAL_HOOKS: Record<string, string> = {
  coliseo:               "Un emperador construyó un lago privado. Un siglo después, su sobrino lo convirtió en circo para cincuenta mil personas.",
  mlk:                   "Diecisiete minutos. Una mujer grita. Un pastor abandona el papel. Estados Unidos no vuelve a hablar igual.",
  machu:                 "Una ciudad real desaparece de los mapas. Cuatro siglos en silencio. La selva la guarda mejor que la historia.",
  notre:                 "Cinco horas de fuego en directo. La nación se mira frente al humo. Cinco años después · la aguja vuelve.",
  areoso:                "Cinco mil años antes de Roma. Mámoas neolíticas en una isla de cunchas. El viento se las lleva centímetro a centímetro.",
  "pontevedra-medieval": "Una ciudad gremial que el Camino salvó dos veces · una en el siglo XIII, otra en el siglo XXI.",
  santiagomateo:         "Catorce años para tallar 200 figuras de granito. Mateo firmó · gesto inédito · en el siglo XII.",
  athens:                "La piedra blanca del partenón llevaba color. Hubo un terremoto. Y un explosivo veneciano.",
  "tokyo-showa":         "Una ciudad arde tres noches. El emperador acepta lo « insoportable». 22 años después · el Shinkansen.",
  "sagrada-familia":     "Gaudí pasa 43 años en un edificio que sabe que no verá terminado. Lo atropella un tranvía un martes cualquiera.",
  "alhambra":            "Boabdil entrega las llaves y llora desde un mirador. Su madre le dice la frase que la historia recordó.",
  "petra":               "Una ciudad rosa desaparece de los mapas diez siglos. Un suizo disfrazado de peregrino la encuentra en 1812.",
  "hagia-sofia":         "Cinco años para una cúpula imposible. Justiniano entra el día de la consagración y dice: « Salomón, te he superado».",
  "torre-eiffel":        "300 artistas firmaron contra ella. 1944 · Hitler ordena dinamitarla. El general alemán desobedece. París sigue teniendo torre.",
  "sacsayhuaman":        "Piedras de 125 toneladas encajadas sin mortero. Nadie sabe exactamente cómo. Los españoles las usaron como cantera.",
};

(function attachHooks() {
  for (const echo of ECHOES_CORE) {
    const h = VIRAL_HOOKS[echo.id];
    if (h) (echo as { viralHook?: string }).viralHook = h;
  }
})();

export function echoBySlug(slug: string): MockEcho | undefined {
  return ECHOES.find((e) => e.slug === slug || e.id === slug);
}
export function placeById(id: string): MockPlace | undefined {
  return PLACES.find((p) => p.id === id);
}
export function relatedEchoes(echo: MockEcho): ReadonlyArray<MockEcho> {
  return echo.related.map((id) => ECHOES.find((e) => e.id === id)).filter((e): e is MockEcho => !!e);
}

// (kept) Re-export helper for components
export { wikimediaUrl } from "./wikimedia";


// ─── Concatenación con POIs globales · Wave 1 ────────────────────────────
export const PLACES: ReadonlyArray<MockPlace> = [...PLACES_CORE, ...PLACES_GLOBAL];
export const ECHOES: ReadonlyArray<MockEcho> = [...ECHOES_CORE, ...ECHOES_GLOBAL];
