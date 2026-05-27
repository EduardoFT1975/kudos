/**
 * KUDOS · Temporal Engine fixtures.
 *
 * Every heroFilename is taken from an existing gallery in fixtures.ts ·
 * guaranteed to resolve through Wikimedia Commons Special:FilePath.
 *
 * Click an epoch pill in CapsuleScreen and these fields mutate the page:
 *   - heroImage
 *   - tagline
 *   - narrative
 *   - facts
 *   - whatChanged
 *   - tint (gradient over hero)
 *   - reconstructionImage
 */
import type { EraId } from "./fixtures";

export interface MockEpoch {
  id: string;
  era: EraId;
  pill: string;
  stage: string;
  /** Wikimedia filename · verified */
  heroFilename: string;
  /** Computed via post-process */
  heroImage: string;
  /** Cinematic single-line · used by hook frame */
  tagline: string;
  /** Editorial paragraphs · 2-3 entries · specific to this epoch */
  narrative: ReadonlyArray<string>;
  /** Key/value facts shown in the inline panel */
  facts: ReadonlyArray<{ label: string; value: string }>;
  /** What changed since previous epoch · empty for the first */
  whatChanged: string;
  /** Tint shift for the hero gradient overlay · hex with no #, used as RGBA · optional */
  tint?: string;
  /** Optional second image · used in reconstruction grid */
  reconstructionFilename?: string;
  reconstructionImage?: string;
}

const ep = (e: MockEpoch): MockEpoch => e;

export const ECHO_EPOCHS: Record<string, ReadonlyArray<MockEpoch>> = {
  // ─── COLISEO ──────────────────────────────────────────────────────────────
  coliseo: [
    ep({
      id: "domus-aurea", era: "roman",
      pill: "64 d.C.", stage: "Año 64 · Domus Aurea",
      heroFilename: "Inside_the_Colosseum_2.jpg",
      heroImage: "",
      tagline: "Antes del Coliseo · aquí ardía Roma y un emperador construía un lago privado.",
      narrative: [
        "Julio del 64 d.C. Roma arde durante seis días. Diez de los catorce distritos quedan reducidos a cenizas. Nerón regresa de Antium y organiza el rescate · ofrece su propio palacio como refugio · pero también culpa a los cristianos y empieza la primera persecución sistemática del imperio.",
        "Sobre las cenizas levanta la Domus Aurea · trescientas hectáreas de palacio con un lago artificial en el centro. La superficie es tan brutal que un siglo después · cuando Vespasiano quiera devolver el suelo al pueblo · ese lago será el sitio exacto donde se cave el anfiteatro Flavio. El Coliseo nace como respuesta política a este momento.",
        "Lo que la cámara del KUDOS te enseña: las trazas de la Domus Aurea siguen ahí · bajo las colinas Oppia y Esquilino · descubiertas por error en el Renacimiento cuando un joven cayó por un agujero del techo y encontró frescos de Fabullus. Rafael bajó a copiarlos. Sus motivos « grottescos» (de grotta) cambiaron la decoración europea.",
      ],
      facts: [
        { label: "Distritos quemados", value: "10 de 14" },
        { label: "Superficie Domus Aurea", value: "300 hectáreas" },
        { label: "Frescos redescubiertos", value: "1480 · por casualidad" },
        { label: "Influencia", value: "Rafael · Vaticano" },
      ],
      whatChanged: "",
      tint: "ef4444",
    }),
    ep({
      id: "inauguracion", era: "roman",
      pill: "80 d.C.", stage: "80 d.C. · Inauguración",
      heroFilename: "Roma_-_Colosseo_-_panoramio.jpg",
      heroImage: "",
      tagline: "Cien días de juegos · nueve mil bestias · cincuenta mil gargantas. Tito devuelve el suelo al pueblo.",
      narrative: [
        "Tito inaugura el anfiteatro Flavio el año 80 d.C. con cien días consecutivos de espectáculos. Cazas, ejecuciones públicas, gladiadores, una naumaquia con el ruedo inundado para reproducir batallas navales. Las crónicas hablan de nueve mil animales sacrificados solo durante la apertura · leones de Numidia, panteras de Hispania, jirafas, rinocerontes, elefantes.",
        "El velarium · toldo gigantesco operado por marineros traídos expresamente desde Miseno · protege a cincuenta mil personas del sol mediterráneo. Los hipogeos en dos niveles subterráneos esconden gladiadores, fieras, máquinas de elevación que sacan a los animales al ruedo sin que se vea la maquinaria. La ingeniería romana al servicio del espectáculo total.",
        "El gesto político es inequívoco. Donde Nerón tenía su lago privado, ahora hay un edificio público para cincuenta mil ciudadanos. Vespasiano y Tito construyen su legitimidad sobre esa devolución · y sobre la sangre que la legitima.",
      ],
      facts: [
        { label: "Capacidad", value: "50.000 espectadores" },
        { label: "Bestias sacrificadas", value: "9.000 · solo apertura" },
        { label: "Días de juegos", value: "100 consecutivos" },
        { label: "Operadores velarium", value: "Marineros de Miseno" },
        { label: "Hipogeos", value: "Dos niveles subterráneos" },
      ],
      whatChanged: "Donde había un lago privado, ahora hay un anfiteatro público. Roma recupera el suelo.",
      reconstructionFilename: "Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "fuego-217", era: "roman",
      pill: "217 d.C.", stage: "217 d.C. · El rayo",
      heroFilename: "Colosseo_di_Roma.jpg",
      heroImage: "",
      tagline: "Un rayo destruye la estructura superior. Cinco años sin juegos.",
      narrative: [
        "Un rayo prende fuego a la estructura superior de madera del Coliseo. La reparación coordinada por Macrino y completada por Heliogábalo durará casi cinco años. Durante ese tiempo, los juegos se trasladan al Circo Máximo · pero la marca del anfiteatro Flavio como centro del entretenimiento imperial se mantiene intacta.",
        "El siglo III es el momento de fractura. La crisis económica del imperio reduce los presupuestos. La piedra empieza a ser presupuesto, no orgullo. Los munera más cargados de animales · los que necesitaban capturas en Numidia o Persia · se vuelven menos frecuentes. La fantasía romana se contrae a Italia.",
        "El terremoto del 443 obligará a más restauraciones. Hacia el siglo V, las cazas y los combates de gladiadores empiezan a verse mal por el cristianismo dominante. El último combate documentado es del año 435. La institución del munus, que sobrevivió cinco siglos, termina sin un anuncio.",
      ],
      facts: [
        { label: "Causa del fuego", value: "Rayo · estructura de madera" },
        { label: "Reparación", value: "Macrino · Heliogábalo · 222 d.C." },
        { label: "Terremoto", value: "443 d.C." },
        { label: "Último combate", value: "435 d.C." },
      ],
      whatChanged: "El mantenimiento imperial flaquea. El imaginario contrae sus fronteras.",
    }),
    ep({
      id: "medieval", era: "medieval",
      pill: "1349", stage: "1349 · Terremoto",
      heroFilename: "Colosseum_in_Rome-April_2007-1-_copie_2B.jpg",
      heroImage: "",
      tagline: "El muro sur colapsa. Roma toma la piedra prestada para sus iglesias.",
      narrative: [
        "El gran terremoto del 9 de septiembre de 1349 derriba completamente el muro sur del anfiteatro. Durante los siglos siguientes el Coliseo funciona como cantera oficial · sus bloques de travertino terminan en la Basílica de San Pedro, en el Palazzo Venezia, en docenas de iglesias romanas. La piedra del espectáculo imperial se vuelve fachada cristiana.",
        "Lo que queda en pie se reocupa de manera doméstica. Viviendas medievales se construyen entre los arcos · una capilla cristiana se instala en el centro mismo del ruedo · diferentes gremios se reparten los anillos del monumento. El Coliseo se vuelve un barrio popular romano · habitado, no contemplado.",
        "En 1749 el papa Benedicto XIV lo consagra como sitio sagrado de los mártires cristianos · una historicidad dudosa que sin embargo paraliza la demolición y empieza a salvarlo. La leyenda de que aquí morían cristianos por la fe es del XVIII · romántica, no histórica.",
      ],
      facts: [
        { label: "Terremoto", value: "9 sep 1349" },
        { label: "Travertino reutilizado", value: "San Pedro · Palazzo Venezia" },
        { label: "Uso medieval", value: "Viviendas + capilla + gremios" },
        { label: "Consagración papal", value: "1749 · Benedicto XIV" },
      ],
      whatChanged: "El monumento deja de ser monumento. Se vuelve presupuesto · y luego mito católico.",
      reconstructionFilename: "Roma_-_Colosseo_-_panoramio.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "hoy", era: "today",
      pill: "Hoy", stage: "Hoy · 2026",
      heroFilename: "Colosseo_2020.jpg",
      heroImage: "",
      tagline: "7,6 millones de turistas al año. Travertino blanco recuperado. Hipogeos abiertos con casco.",
      narrative: [
        "Patrimonio UNESCO desde 1980. Restauración de Tod's entre 2013 y 2016 · veinticinco millones de euros financiados por la marca de cuero · devolvió al travertino su blanco original. Décadas de polución automovilística habían dejado la piedra negra como carbón. La revelación fue brutal · los romanos lo vieron como si nunca lo hubiesen mirado.",
        "En 2021 se abrieron los hipogeos al público con casco obligatorio · por primera vez desde la antigüedad, un ciudadano cualquiera puede caminar por el espacio donde se guardaban los gladiadores y se elevaban las fieras al ruedo. El acceso cuesta dieciocho euros · subir a la arena vale más. 7,6 millones de visitantes pasan cada año.",
        "KUDOS te lleva a las seis de la mañana, antes de que abran las puertas. Cuando la piedra todavía conserva su eco propio · y los turistas son sombras lejanas en el Foro Romano que despierta detrás.",
      ],
      facts: [
        { label: "Visitantes / año", value: "7,6 millones" },
        { label: "Restauración Tod's", value: "2013-2016 · €25M" },
        { label: "Hipogeos abiertos", value: "2021 · con casco" },
        { label: "Entrada base", value: "€18" },
        { label: "UNESCO", value: "Desde 1980" },
      ],
      whatChanged: "El monumento es global. La presión turística reemplaza a las cazas. La piedra vuelve a ser blanca.",
      reconstructionFilename: "Inside_the_Colosseum_2.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── MLK · I HAVE A DREAM ─────────────────────────────────────────────────
  mlk: [
    ep({
      id: "montgomery", era: "modern",
      pill: "1955", stage: "1955 · Montgomery",
      heroFilename: "MLK_and_Malcolm_X_USNWR_cropped.jpg",
      heroImage: "",
      tagline: "Una mujer en un autobús. King · 26 años · líder accidental.",
      narrative: [
        "Diciembre de 1955. Rosa Parks se niega a ceder su asiento. King · recién llegado a Montgomery como pastor bautista de 26 años · es elegido portavoz del boicot. Trescientos ochenta y un días sin afroamericanos en los autobuses de Alabama. Termina con la sentencia Browder v. Gayle del Tribunal Supremo declarando inconstitucional la segregación en el transporte público.",
        "King aprende ahí la lógica de la acción colectiva no violenta. Lee a Gandhi en profundidad · habla con Bayard Rustin, que ha estudiado en India · funda en 1957 la Southern Christian Leadership Conference. El liderazgo no era parte del plan · pero a partir de Montgomery, lo es. Recibe la primera bomba en su casa · su mujer Coretta y la hija recién nacida están dentro. Sobreviven por minutos.",
      ],
      facts: [
        { label: "Edad de King", value: "26 años" },
        { label: "Duración del boicot", value: "381 días" },
        { label: "Sentencia clave", value: "Browder v. Gayle · 1956" },
        { label: "Bomba en casa", value: "Enero 1956" },
      ],
      whatChanged: "",
      tint: "f59e0b",
    }),
    ep({
      id: "birmingham", era: "modern",
      pill: "1963", stage: "Abril 1963 · Birmingham",
      heroFilename: "Civil_Rights_March_on_Washington%2C_D.C._%28Dr._Martin_Luther_King%2C_Jr._and_Mathew_Ahmann_in_a_crowd.%29.jpg",
      heroImage: "",
      tagline: "Mangueras contra niños. Bull Connor en televisión. La carta más leída de los 60.",
      narrative: [
        "Bull Connor, jefe de policía de Birmingham, Alabama, ordena mangueras de bomberos a alta presión y perros policía contra manifestantes adolescentes negros. Las imágenes recorren el mundo en directo vía teletipos. Kennedy se ve forzado a actuar · el gabinete entiende que Birmingham es el punto en que la moralidad estadounidense ya no puede mantener la apariencia.",
        "King es arrestado el 12 de abril y escribe desde su celda, en los márgenes de un periódico que le pasa un guardia simpático, la « Carta desde la cárcel de Birmingham». Respuesta a ocho clérigos blancos moderados que le pedían paciencia. « La espera ha sido casi siempre eso · esperar». El texto se vuelve el documento fundacional moderno de la desobediencia civil estadounidense · y se lee en universidades de todo el mundo.",
      ],
      facts: [
        { label: "Encarcelamiento", value: "12 abr 1963" },
        { label: "Carta", value: "Escrita en márgenes de periódico" },
        { label: "Edad mínima de los manifestantes", value: "8 años" },
        { label: "Mangueras a presión", value: "75 PSI · arrastraba a la calle" },
      ],
      whatChanged: "La televisión convierte la lucha en imagen global. Kennedy ya no puede ignorarla.",
      reconstructionFilename: "March_on_Washington_1963_-_3.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "march", era: "modern",
      pill: "28 ago 1963", stage: "Lincoln Memorial · 17 minutos",
      heroFilename: "Martin_Luther_King_-_March_on_Washington.jpg",
      heroImage: "",
      tagline: "Mahalia Jackson grita « Tell them about the dream». King abandona el papel.",
      narrative: [
        "Doscientas cincuenta mil personas frente al Lincoln Memorial. Treinta y cinco grados centígrados a la sombra. Última intervención de la jornada. King lleva un discurso preparado donde la metáfora central es financiera · un cheque sin fondos que Estados Unidos firmó a los ciudadanos negros.",
        "Mahalia Jackson, sentada cerca, le grita en mitad del discurso: « Tell them about the dream, Martin». Y King abandona el guion. Lo que sigue está improvisado · repeticiones anafóricas que ya había usado en sermones de iglesias bautistas. El contexto · televisión nacional en directo, Lincoln Memorial, centenario aproximado de la Proclamación de Emancipación · multiplica todo por mil.",
        "Un año después se firma la Civil Rights Act. Cinco años después King es asesinado en Memphis. Pero el discurso ya está grabado · ya pertenece a la historia. Se cita, se parodia, se traduce, se instrumentaliza, se defiende y se ataca. La frase « I have a dream» se vuelve marca registrada de un sueño que sigue sin cumplirse del todo.",
      ],
      facts: [
        { label: "Asistentes", value: "250.000 personas" },
        { label: "Duración", value: "17 minutos" },
        { label: "Temperatura", value: "35°C a la sombra" },
        { label: "Audiencia TV", value: "Nacional · directo" },
        { label: "Improvisado", value: "Última mitad" },
      ],
      whatChanged: "Una metáfora financiera se vuelve visión. El movimiento gana una imagen para los siguientes 60 años.",
      reconstructionFilename: "March_on_Washington_1963_-_3.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "memphis", era: "modern",
      pill: "4 abr 1968", stage: "Lorraine Motel · Memphis",
      heroFilename: "Martin_Luther_King%2C_Jr..jpg",
      heroImage: "",
      tagline: "Apoyando a recolectores de basura. Un balazo en el balcón. Edad: 39.",
      narrative: [
        "King está en Memphis apoyando una huelga de mil trescientos recolectores de basura afroamericanos · piden reconocimiento sindical tras la muerte de dos compañeros aplastados por un camión defectuoso. La huelga lleva semanas. King ya no es solo símbolo civil · está dentro del movimiento obrero. Esa intersección incomoda a J. Edgar Hoover.",
        "El 3 de abril pronuncia el discurso « I've Been to the Mountaintop». Habla de « no temer a ningún hombre», de haber « visto la tierra prometida», de que « quizá no llegue allí contigo». Veinticuatro horas después, James Earl Ray le dispara desde el otro lado de la calle, desde una ventana del Bessie Brewer's rooming house. Muere en el St. Joseph's Hospital a las 19:05.",
        "El FBI llevaba años grabándolo · habitaciones de hotel, llamadas. La carta anónima de J. Edgar Hoover en 1964, sugiriendo el suicidio, fue desclasificada y publicada por la familia King en 2017. Deja claro que la lucha de King no era solo contra Alabama · era contra el aparato del Estado federal estadounidense.",
      ],
      facts: [
        { label: "Edad", value: "39 años" },
        { label: "Discurso previo", value: "I've Been to the Mountaintop · 3 abr" },
        { label: "Hora del disparo", value: "18:01" },
        { label: "Hora de muerte", value: "19:05 · St. Joseph's" },
        { label: "Carta del FBI", value: "1964 · desclasificada 2017" },
        { label: "Día festivo federal", value: "MLK Day · 1986" },
      ],
      whatChanged: "El símbolo se vuelve mártir. La carta del FBI revela décadas después que la lucha era contra el Estado, no solo contra el sur.",
      reconstructionFilename: "MLK_and_Malcolm_X_USNWR_cropped.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── MACHU PICCHU ────────────────────────────────────────────────────────
  machu: [
    ep({
      id: "pre-inca", era: "roman",
      pill: "Pre-Inca", stage: "Antes de 1450",
      heroFilename: "Machu_Picchu_-_overview.jpg",
      heroImage: "",
      tagline: "Antes de la ciudad · solo terrazas pre-Incas y senderos andinos.",
      narrative: [
        "La cresta entre el Huayna Picchu y el Machu Picchu ya era conocida por culturas preincaicas. Hay restos cerámicos del intermedio tardío · señales de uso ritual aislado, sin construcción monumental. Los caminos andinos · los Qhapaq Ñan · ya conectaban la región hace al menos dos mil años.",
        "Los Incas no encontraron un sitio virgen. Heredaron una geografía sagrada · las apus (montañas espíritu) ya tenían nombre y culto. La cresta de Machu Picchu mira directamente a tres apus mayores: Salkantay, Veronica y Huayna Picchu. Esto define la ubicación · no la accesibilidad, no la defensa.",
      ],
      facts: [
        { label: "Altitud", value: "2.430 metros" },
        { label: "Uso pre-Inca", value: "Ritual aislado" },
        { label: "Red de caminos", value: "Qhapaq Ñan · 30.000 km" },
        { label: "Apus visibles", value: "Salkantay · Veronica · Huayna" },
      ],
      whatChanged: "",
      tint: "fbbf24",
    }),
    ep({
      id: "construccion", era: "renaissance",
      pill: "1450", stage: "1450 · Pachacútec",
      heroFilename: "80_-_Machu_Picchu_-_Juin_2009_-_edit.2.jpg",
      heroImage: "",
      tagline: "Pachacútec ordena una ciudad real sobre la cresta. Piedras encajadas sin mortero.",
      narrative: [
        "Pachacútec · noveno Sapa Inca · ordena la construcción tras consolidar la expansión del Tahuantinsuyo. Machu Picchu no es la capital del imperio · la capital es Cuzco. Es residencia real y centro religioso, un retiro ritual a 2.430 metros entre dos picos. Élite, no ejército.",
        "Cantería poligonal de tolerancias milimétricas · las piedras se encajan sin mortero, soportando terremotos que han caído edificios coloniales construidos encima cuatro siglos después. Terrazas en cascada con drenajes de quince capas. Canales de agua que aún funcionan hoy, cinco siglos después.",
        "El Intihuatana · piedra ritual de orientación astronómica · marca con precisión los solsticios. El Templo del Sol tiene una ventana que ilumina exactamente el altar central el 21 de junio. La ingeniería ritual es indistinguible de la ingeniería civil.",
      ],
      facts: [
        { label: "Sapa Inca", value: "Pachacútec" },
        { label: "Función", value: "Residencia real · centro religioso" },
        { label: "Sistema constructivo", value: "Cantería poligonal sin mortero" },
        { label: "Drenajes", value: "15 capas · funcionando" },
        { label: "Intihuatana", value: "Reloj solsticial" },
      ],
      whatChanged: "Una cresta vacía se vuelve corte imperial. El paisaje sagrado pasa de ritual a residencial.",
      reconstructionFilename: "Intihuatana_-_Machu_Picchu.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "abandono", era: "renaissance",
      pill: "1530", stage: "1530 · Abandono pre-conquista",
      heroFilename: "Machu_Picchu%2C_Peru.jpg",
      heroImage: "",
      tagline: "Antes de que llegue Pizarro. La selva ya está reclamando la ciudad.",
      narrative: [
        "Machu Picchu se abandona hacia 1530 · antes incluso de la captura de Atahualpa en Cajamarca por Pizarro. La razón nunca se aclara del todo. Tres hipótesis · viruela traída desde Panamá por rumores y mercaderes (la enfermedad llegó antes que los soldados), conflicto sucesorio entre Huáscar y Atahualpa que sacudió la legitimidad ritual del sitio, o agotamiento simple de la élite que mantenía la ciudad.",
        "Cuando Pizarro llega en 1532, los conquistadores nunca encuentran Machu Picchu. La selva la cubre rápido. Los campesinos quechuas locales sí saben dónde está · siguen las terrazas, conocen el nombre · pero la información no sale del valle. Durante casi cuatro siglos, el sitio existe oficialmente en la memoria oral.",
      ],
      facts: [
        { label: "Año estimado del abandono", value: "c. 1530" },
        { label: "Hipótesis principal", value: "Viruela pre-conquista" },
        { label: "Tiempo en memoria oral", value: "~380 años" },
        { label: "Conocida por", value: "Campesinos quechuas locales" },
      ],
      whatChanged: "La élite desaparece. La selva crece. La ciudad sale del registro oficial · pero sigue viva en la memoria oral quechua.",
    }),
    ep({
      id: "bingham", era: "modern",
      pill: "1911", stage: "1911 · « Descubrimiento»",
      heroFilename: "Machu_Picchu_early_morning.jpg",
      heroImage: "",
      tagline: "Un explorador estadounidense « descubre» lo que los campesinos quechuas le señalan.",
      narrative: [
        "Hiram Bingham · profesor de Yale, financiado por National Geographic · llega en julio de 1911 a la zona de Mandor Pampa. Un campesino local llamado Melchor Arteaga le guía hasta el sitio. En la cima ya hay tres familias quechuas viviendo entre las ruinas · cultivando las terrazas, criando ganado.",
        "Bingham publica el descubrimiento internacionalmente. Yale se lleva treinta mil artefactos que no devuelve hasta 2012 · cien años exactos de litigio entre Perú y el museo estadounidense. El relato oficial convierte a Bingham en héroe y a los quechuas en figuras silenciosas. La estampa colonial perfecta · el blanco descubre lo que el local nunca ocultó.",
      ],
      facts: [
        { label: "Año del « descubrimiento»", value: "24 julio 1911" },
        { label: "Guía local", value: "Melchor Arteaga · pago: 1 sol" },
        { label: "Familias en el sitio", value: "Tres · viviendo allí" },
        { label: "Yale devuelve", value: "30.000 artefactos · 2012" },
      ],
      whatChanged: "La ciudad entra en la historia global. La autoría queda secuestrada por el museo del norte.",
      reconstructionFilename: "Machu_Picchu_-_overview.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "hoy", era: "today",
      pill: "Hoy", stage: "Hoy · 2026",
      heroFilename: "Intihuatana_-_Machu_Picchu.jpg",
      heroImage: "",
      tagline: "2.500 visitantes al día. Cuatro circuitos cerrados. Erosión visible · UNESCO ha advertido tres veces.",
      narrative: [
        "Desde 2017, el aforo está limitado a dos mil quinientos visitantes diarios · cuatro circuitos cerrados con horarios estrictos. La presión turística es enorme · UNESCO ha advertido tres veces de pérdida de integridad. Las terrazas inferiores muestran erosión por pisadas. El acceso al Intihuatana está vallado.",
        "El Intihuatana fue dañado en septiembre de 2000 por un anuncio de cerveza Cusqueña que se filmó allí · una grúa cayó sobre la piedra ritual y rompió la esquina superior. Juicio internacional · la empresa pagó multa simbólica. La esquina sigue rota.",
        "Los guías quechuas son la única continuidad real con quienes la construyeron · KUDOS los pone primero. Sus apellidos son Quispe, Mamani, Huamán · no Bingham. Si vas, exígelos.",
      ],
      facts: [
        { label: "Aforo / día", value: "2.500" },
        { label: "Circuitos", value: "Cuatro · cerrados" },
        { label: "Daño en Intihuatana", value: "Sep 2000 · Cusqueña" },
        { label: "UNESCO", value: "Desde 1983 · 3 advertencias" },
        { label: "Maravilla moderna", value: "2007 · votación global" },
      ],
      whatChanged: "El secreto se vuelve cuota. La continuidad quechua sigue ahí · pero hay que querer escucharla.",
      reconstructionFilename: "Machu_Picchu%2C_Peru.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── NOTRE-DAME ──────────────────────────────────────────────────────────
  notre: [
    ep({
      id: "construccion", era: "medieval",
      pill: "1163", stage: "1163 · Maurice de Sully",
      heroFilename: "Notre_Dame_Paris_interior_view.jpg",
      heroImage: "",
      tagline: "El obispo pone la primera piedra. La obra durará 182 años.",
      narrative: [
        "Maurice de Sully decide en 1163 sustituir la antigua basílica merovingia de Saint-Étienne por una catedral nueva. El estilo es el gótico recién emergente · arbotantes voladores que ningún edificio anterior había usado a esa escala, vidrieras gigantescas, una nave de treinta y tres metros de altura.",
        "La obra avanza por fases · el coro se termina hacia 1182, la nave hacia 1208, la fachada occidental hacia 1225, las dos torres antes de 1250. Pero las capillas laterales y los detalles siguen sumándose hasta 1345. Casi dos siglos de obra continua · varias generaciones de canteros · ningún plan único, sino acumulación de visiones góticas sucesivas.",
        "La crónica de la inauguración no existe · no hay un día concreto en que Notre-Dame « termine». Termina cuando deja de empezar.",
      ],
      facts: [
        { label: "Año de inicio", value: "1163" },
        { label: "Año de finalización", value: "1345 · primera versión" },
        { label: "Altura de bóveda", value: "33 metros" },
        { label: "Duración obra", value: "182 años" },
      ],
      whatChanged: "",
      tint: "a78bfa",
    }),
    ep({
      id: "revolucion", era: "modern",
      pill: "1789", stage: "1789 · Revolución",
      heroFilename: "North_rose_window_of_Notre-Dame_de_Paris.jpg",
      heroImage: "",
      tagline: "La Razón en el altar. Veintiocho estatuas decapitadas en la Galerie des Rois.",
      narrative: [
        "La Revolución Francesa convierte Notre-Dame en Templo de la Razón. Las estatuas de los reyes de Judá en la fachada · veintiocho figuras de tamaño natural · son decapitadas porque las masas las confunden con reyes de Francia. Las cabezas terminan enterradas en el patio de un hôtel particulier · redescubiertas por casualidad en 1977 durante obras del Hôtel Moreau, calle de la Chaussée-d'Antin.",
        "En diciembre de 1804 Napoleón se autocorona emperador frente al altar mayor · el papa Pío VII solo bendice. La catedral, abandonada durante décadas, está en ruina parcial. Víctor Hugo publica « Notre-Dame de París» en 1831 explícitamente para forzar su restauración · la novela vende y la opinión pública gana la batalla.",
        "Viollet-le-Duc dirige entre 1845 y 1864 una restauración masiva · veinticinco años. Inventa la aguja icónica · no era medieval, es del XIX, pero se vendió como restauración fiel y desde entonces es Notre-Dame.",
      ],
      facts: [
        { label: "Estatuas decapitadas", value: "28 reyes de Judá" },
        { label: "Cabezas redescubiertas", value: "1977 · Hôtel Moreau" },
        { label: "Coronación de Napoleón", value: "2 dic 1804" },
        { label: "Novela de Hugo", value: "1831 · forzó la restauración" },
        { label: "Viollet-le-Duc", value: "1845-1864 · inventó la aguja" },
      ],
      whatChanged: "La catedral pasa de espacio sagrado a símbolo político. La masa puede destruirla · y la novela puede salvarla.",
    }),
    ep({
      id: "incendio", era: "today",
      pill: "15 abr 2019", stage: "El incendio en directo",
      heroFilename: "Notre_Dame_de_Paris_DSC_0846w.jpg",
      heroImage: "",
      tagline: "La aguja cae a las 19:53. La televisión mundial mira en directo durante cinco horas.",
      narrative: [
        "El 15 de abril de 2019, durante obras de restauración en la aguja, un incendio se declara bajo el tejado a las 18:18. Cinco horas después la aguja de Viollet-le-Duc cae · transmisión en directo a todo el mundo. El tejado de roble del siglo XIII · la « forêt» de mil trescientos árboles centenarios talados un solo invierno · se consume completamente.",
        "Por milagro estructural, las bóvedas de piedra resisten · solo dos puntos colapsan. La fachada occidental, las dos torres y las tres rosetas sobreviven. Las reliquias · la corona de espinas, túnica de San Luis, fragmento de la cruz · se evacúan a tiempo por una cadena humana de bomberos y un capellán del cuerpo de bomberos llamado Jean-Marc Fournier.",
        "Macron promete reconstruir en cinco años · « plus belle qu'avant», más bonita que antes. La fecha límite · diciembre de 2024 · se cumple. Las donaciones privadas alcanzan los setecientos millones de euros en pocas semanas. Los muy ricos competían por aparecer en la lista.",
      ],
      facts: [
        { label: "Hora del fuego", value: "18:18" },
        { label: "Caída de la aguja", value: "19:53" },
        { label: "Duración del fuego", value: "5 horas" },
        { label: "Tejado destruido", value: "1.300 robles · siglo XIII" },
        { label: "Reliquias salvadas", value: "Cadena humana · capellán Fournier" },
        { label: "Donaciones", value: "€700M en semanas" },
      ],
      whatChanged: "Una obra de restauración rutinaria desencadena el evento mediático del siglo. La nación se mira frente al fuego.",
      reconstructionFilename: "Notre-Dame_de_Paris%2C_4_October_2017.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "reapertura", era: "today",
      pill: "Dic 2024", stage: "Diciembre 2024 · Reapertura",
      heroFilename: "Notre-Dame_de_Paris_2792x3060.jpg",
      heroImage: "",
      tagline: "Cinco años. Mil obreros. Setecientos millones. La aguja vuelve.",
      narrative: [
        "Cinco años de obra. Mil obreros activos en distintos momentos. Setenta artesanos especializados · canteros, vitralistas, ebanistas, fundidores · trabajando con técnicas medievales. El roble del nuevo tejado se talló como se talló el original · con hacha de mano, no con sierra. Mil árboles seleccionados uno a uno en bosques de toda Francia.",
        "Reapertura el 7 de diciembre de 2024. Misa pontifical el 8. Macron, Trump (en una semana de transición), Zelenski, el príncipe Guillermo · todos presentes. La catedral abre al público el 16 de diciembre. Treinta mil visitantes el primer día. Doce millones esperados el primer año.",
        "La aguja vuelve. Igual que la diseñó Viollet-le-Duc. Es la segunda vez que se construye este edificio con sentido del tiempo perdido.",
      ],
      facts: [
        { label: "Reapertura", value: "7 dic 2024" },
        { label: "Coste total", value: "€700M · donaciones privadas" },
        { label: "Obreros totales", value: "~1.000" },
        { label: "Visitantes primer día", value: "30.000" },
        { label: "Reliquias", value: "Reubicadas en cripta nueva" },
      ],
      whatChanged: "La pérdida desencadena la mayor obra de restauración patrimonial moderna. El símbolo gana una segunda vida.",
      reconstructionFilename: "Notre_Dame_Paris_interior_view.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── AREOSO ──────────────────────────────────────────────────────────────
  areoso: [
    ep({
      id: "neolitico", era: "roman",
      pill: "3500 a.C.", stage: "3500 a.C. · Megalitismo atlántico",
      heroFilename: "Castros_galegos.jpg",
      heroImage: "",
      tagline: "Cinco mil años antes de Roma. Mámoas funerarias en una isla de cunchas.",
      narrative: [
        "Comunidades neolíticas atlánticas construyen las primeras mámoas funerarias sobre el islote de Areoso · cista central de lajas de granito, cubierta por túmulo de arena y conchas marinas. Datación por carbono-14 las sitúa entre 3500 y 3000 antes de Cristo · contemporáneas a las primeras pirámides de Egipto, más antiguas que las piedras azules de Stonehenge.",
        "El cuarzo blanco utilizado en los ajuares procede de canteras a doscientos kilómetros tierra adentro · prueba de navegación de cabotaje en el cuarto milenio antes de Cristo. La isla forma parte de una red atlántica que conecta con Bretaña, Irlanda y Portugal. La fachada atlántica tenía cultura común antes de que existiera Roma.",
      ],
      facts: [
        { label: "Datación C14", value: "3500 - 3000 a.C." },
        { label: "Material ritual", value: "Cuarzo blanco · 200 km" },
        { label: "Red atlántica", value: "Bretaña · Irlanda · Portugal" },
        { label: "Construcción", value: "Cistas de granito + túmulo" },
      ],
      whatChanged: "",
      tint: "34d399",
    }),
    ep({
      id: "abandono", era: "roman",
      pill: "2200 a.C.", stage: "2200 a.C. · Abandono climático",
      heroFilename: "Praia_de_Areoso.jpg",
      heroImage: "",
      tagline: "Última inhumación. La duna empieza a cubrir el yacimiento.",
      narrative: [
        "Última inhumación documentada hacia 2200 antes de Cristo. Los cambios climáticos del Bronce Inicial transforman la ría · sube el nivel del mar, la isla pierde uso ritual. La duna empieza a cubrir las mámoas · paradójicamente, las preserva durante los cuatro mil años siguientes.",
        "Reocupación campaniforme entre 2800 y 2200 antes de Cristo · nuevas comunidades reutilizan las mámoas para enterramientos secundarios. Después, silencio arqueológico hasta el siglo XX. Lo único que queda es el conocimiento oral entre los pescadores y mariscadores locales.",
      ],
      facts: [
        { label: "Última inhumación", value: "c. 2200 a.C." },
        { label: "Reuso campaniforme", value: "2800 - 2200 a.C." },
        { label: "Cubierta por duna", value: "~4.000 años" },
        { label: "Cambio climático", value: "Subida del nivel del mar" },
      ],
      whatChanged: "El clima cambia. El sitio sale de la memoria activa. La duna lo conserva por accidente.",
    }),
    ep({
      id: "documentacion", era: "modern",
      pill: "1985", stage: "1985 · Primeras excavaciones",
      heroFilename: "Ria_de_Arousa.jpg",
      heroImage: "",
      tagline: "Antonio Rodríguez Casal documenta lo que los mariscadores conocían desde generaciones.",
      narrative: [
        "Las primeras menciones modernas son de 1932 · mariscadores describen a investigadores las « piedras del antiguo» que aparecen tras los temporales de invierno. Esa memoria oral no se documenta científicamente hasta 1985, cuando Antonio Rodríguez Casal de la Universidade de Santiago de Compostela inicia las primeras campañas arqueológicas.",
        "En 2003 Xosé Manuel Rey García publica « Areoso · arqueoloxía dunha illa de cunchas» · síntesis de las campañas. El sitio entra finalmente en el registro arqueológico oficial. La memoria oral llevaba dos generaciones sosteniendo lo que la ciencia tardó cincuenta años en escribir.",
      ],
      facts: [
        { label: "Primera mención", value: "1932 · mariscadores" },
        { label: "Primera excavación", value: "1985 · USC" },
        { label: "Síntesis publicada", value: "Rey García · 2003" },
        { label: "Mámoas identificadas", value: "8 originales" },
      ],
      whatChanged: "La ciencia llega tarde a una memoria que llevaba siglos despierta. La oralidad gana esa carrera.",
    }),
    ep({
      id: "hoy", era: "today",
      pill: "Hoy", stage: "Hoy · erosión activa",
      heroFilename: "Illa_de_Areoso_marea_baixa.jpg",
      heroImage: "",
      tagline: "Una mámoa entera desapareció entre 1985 y 2010. El sitio se borra cada temporada.",
      narrative: [
        "Espacio Natural Protegido desde 2008. Acceso restringido en marea baja, cinco minutos a pie desde el muelle de O Grove. En agosto hay cordones para proteger las mámoas durante la temporada turística · doscientas personas al día caminan sobre el yacimiento.",
        "La Mámoa 8, documentada por última vez en 1985, ya no existe · desapareció completamente por erosión entre 1985 y 2010. Cada temporal de invierno se lleva centímetros de duna · centímetros de yacimiento. El plan de gestión municipal lucha contra una pérdida que ya no es teórica · es contable.",
      ],
      facts: [
        { label: "Pérdida documentada", value: "Mámoa 8 · 1985-2010" },
        { label: "Acceso", value: "Marea baja · 5 min andando" },
        { label: "Visitantes / día verano", value: "~200" },
        { label: "Protección", value: "Espacio Natural · 2008" },
      ],
      whatChanged: "El sitio ahora compite con el turismo y con el océano. La conservación es carrera contra el tiempo.",
      reconstructionFilename: "O_Grove_panoramica.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── PONTEVEDRA MEDIEVAL ─────────────────────────────────────────────────
  "pontevedra-medieval": [
    ep({
      id: "siglo-xii", era: "medieval",
      pill: "Siglo XII", stage: "Siglo XII · A Boa Vila",
      heroFilename: "Basilica_de_Santa_Mar%C3%ADa_a_Maior_-_Pontevedra.jpg",
      heroImage: "",
      tagline: "El Camino Portugués pasa por aquí. La ciudad gremial empieza.",
      narrative: [
        "Pontevedra empieza a crecer como hito del Camino Portugués · peregrinos que vienen de Lisboa caminan hacia Compostela y la cruzan obligatoriamente. La actividad religiosa atrae oficios · canteros, ebanistas, herreros, taberneros. Aparece la estructura gremial.",
        "El gremio de mareantes · pescadores y armadores · construye su propia iglesia en el siglo XV · la basílica de Santa María a Maior, fachada plateresca con escenas de pesca esculpidas en piedra. Es uno de los pocos templos europeos donde la economía marítima de quien lo financió aparece literalmente tallada en la fachada.",
      ],
      facts: [
        { label: "Ruta", value: "Camino Portugués" },
        { label: "Gremios principales", value: "Mareantes · canteros" },
        { label: "Santa María a Maior", value: "Siglo XV · gremio de mar" },
      ],
      whatChanged: "",
      tint: "a78bfa",
    }),
    ep({
      id: "siglo-xx", era: "modern",
      pill: "Siglo XX", stage: "Siglo XX · El olvido",
      heroFilename: "Pontevedra_capital.JPG",
      heroImage: "",
      tagline: "Coche, asfalto, gris. El casco medieval se vuelve aparcamiento.",
      narrative: [
        "El siglo XX casi destruye el casco histórico. El boom del automóvil convierte la Praza da Leña en aparcamiento · las plazas medievales se asfaltan, los soportales se cierran con persianas metálicas, los edificios de granito se cubren con cemento gris. Pontevedra se vuelve una ciudad provincial cualquiera.",
        "En los años 80 y 90 la ciudad pierde población · se va a Vigo, a Madrid. El casco histórico queda con habitantes mayores, comercio cerrado, edificios cayéndose. Como tantos otros centros gallegos · Mondoñedo, Tui, Betanzos · la lenta agonía urbana parece definitiva.",
      ],
      facts: [
        { label: "Praza da Leña", value: "Aparcamiento" },
        { label: "Pérdida de población", value: "Continua hasta 1999" },
        { label: "Cierre comercio", value: "Décadas 80-90" },
      ],
      whatChanged: "El motor económico migra. El casco se vuelve almacén abandonado al aire libre.",
    }),
    ep({
      id: "peatonal", era: "today",
      pill: "1999", stage: "1999 · La peatonalización",
      heroFilename: "Praza_da_Ferrer%C3%ADa%2C_Pontevedra.jpg",
      heroImage: "",
      tagline: "El alcalde Lores prohíbe el coche en el centro. Pontevedra se reinventa.",
      narrative: [
        "Miguel Anxo Fernández Lores entra en la alcaldía en 1999 y toma la decisión que marca la ciudad · peatonalizar todo el centro histórico de un golpe. Sesenta y cinco hectáreas sin coches. El comercio protesta, la prensa pronostica catástrofe, los partidos opositores prometen revertirlo.",
        "Veinte años después · cero muertes por atropello, treinta por ciento más comercio local, premios europeos cada dos años. Pontevedra se vuelve caso de estudio internacional. Urbanistas de Tokio, Bogotá y Detroit vienen a aprender. El casco histórico se llena otra vez · niños jugando solos en la calle, ancianos sentados en bancos, mercado al aire libre cada miércoles y sábado.",
        "El Camino Portugués vuelve a tener peregrinos. La basílica de Santa María se restaura. La ciudad gremial del siglo XII, salvada por una decisión política del siglo XXI, vuelve a respirar.",
      ],
      facts: [
        { label: "Alcalde decisor", value: "Miguel A. Fernández Lores" },
        { label: "Año peatonalización", value: "1999" },
        { label: "Superficie", value: "65 ha · todo el casco" },
        { label: "Muertes por atropello", value: "0 desde 2011" },
        { label: "Premios", value: "ONU-Hábitat · 2014 entre otros" },
      ],
      whatChanged: "Una decisión política le devuelve la vida al casco. Pontevedra se vuelve caso de estudio mundial.",
      reconstructionFilename: "Pontevedra-Praza_da_Le%C3%B1a-2.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── SANTIAGO · PÓRTICO DA GLORIA ───────────────────────────────────────
  santiagomateo: [
    ep({
      id: "construccion", era: "medieval",
      pill: "1188", stage: "1188 · Mateo firma",
      heroFilename: "P%C3%B3rtico_da_Gloria%2C_Catedral_de_Santiago_de_Compostela.jpg",
      heroImage: "",
      tagline: "Catorce años para tallar doscientas figuras. Mateo firma · gesto inédito en el XII.",
      narrative: [
        "El maestro Mateo trabaja durante casi dos décadas en el Pórtico de la Gloria · doscientas figuras de granito policromado que decoran la entrada de la catedral de Santiago de Compostela. Lo termina en 1188 · firma en latín la base de la columna central. La firma del artesano es práctica casi inexistente en el siglo XII europeo · Mateo se reconoce a sí mismo como autor, no como instrumento.",
        "El Pórtico mezcla iconografía bíblica con realismo facial inédito · los músicos del Apocalipsis tienen rostros individuales, los profetas sonríen, Cristo en la mandorla central recibe en lugar de juzgar. El gótico europeo se inventa parcialmente aquí · tres décadas antes de Notre-Dame.",
      ],
      facts: [
        { label: "Año de finalización", value: "1188" },
        { label: "Duración obra", value: "~14 años" },
        { label: "Figuras esculpidas", value: "~200" },
        { label: "Material", value: "Granito policromado" },
        { label: "Firma del autor", value: "Único en su época" },
      ],
      whatChanged: "",
      tint: "fbbf24",
    }),
    ep({
      id: "barroco", era: "renaissance",
      pill: "1738", stage: "1738 · Fachada barroca",
      heroFilename: "Catedral_de_Santiago_de_Compostela_-_Pra%C3%A7a_do_Obradoiro.jpg",
      heroImage: "",
      tagline: "Casas y Novoa envuelve la fachada románica en barroco. Lo que se ve hoy no es lo que Mateo vio.",
      narrative: [
        "Fernando de Casas y Novoa construye entre 1738 y 1750 la fachada barroca del Obradoiro · setenta y cinco metros de altura, dos torres simétricas, escalinata monumental. Envuelve completamente la fachada románica original que el maestro Mateo había completado seis siglos antes. La fachada vieja sigue ahí · dentro · invisible desde la plaza.",
        "El gesto barroco gallego cubre el románico sin destruirlo · una capa sobre otra capa, lo que en otros sitios europeos se demolía. Compostela acumula tiempo en vez de borrarlo.",
      ],
      facts: [
        { label: "Arquitecto", value: "Fernando de Casas y Novoa" },
        { label: "Altura fachada", value: "75 metros" },
        { label: "Construcción", value: "1738 - 1750" },
        { label: "Capa anterior", value: "Conservada dentro" },
      ],
      whatChanged: "El románico desaparece de la vista pero no de la piedra. Compostela conserva sumando.",
    }),
    ep({
      id: "restauracion", era: "today",
      pill: "2018", stage: "2018 · Restauración integral",
      heroFilename: "Santiago_de_Compostela_Cathedral_-_Botafumeiro.jpg",
      heroImage: "",
      tagline: "Once años, dieciocho millones de euros. La policromía original vuelve a aparecer.",
      narrative: [
        "La restauración integral del Pórtico da Gloria entre 2007 y 2018 · once años, dieciocho millones de euros financiados por la Fundación Barrié · revela bajo capas de polvo y barniz que las figuras de Mateo tenían policromía original. Rastros de azul, rojo, dorado en la piedra. Lo que se interpretaba como granito sobrio era en realidad un retablo cromático del XII.",
        "La restauración no devuelve el color · sería irreversible y arriesgado · pero documenta digitalmente cada pigmento. Hoy se puede ver una reconstrucción virtual a escala real en el museo catedralicio. El Pórtico volvió a tener tiempo encima de la piedra.",
      ],
      facts: [
        { label: "Duración restauración", value: "2007 - 2018 · 11 años" },
        { label: "Coste", value: "€18M · Fundación Barrié" },
        { label: "Descubrimiento", value: "Policromía original del XII" },
        { label: "Reconstrucción virtual", value: "Museo catedralicio" },
      ],
      whatChanged: "Lo que parecía granito sobrio era color. La pieza tiene capas de tiempo que la conservación apenas empieza a leer.",
      reconstructionFilename: "Cathedral_of_Santiago_de_Compostela_03.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── ACROPOLIS · ATENAS ──────────────────────────────────────────────────
  athens: [
    ep({
      id: "pericles", era: "roman",
      pill: "447 a.C.", stage: "447 a.C. · Pericles",
      heroFilename: "Parthenon_from_west.jpg",
      heroImage: "",
      tagline: "Quince años. Mármol del Pentélico. Fidias dirige · y desvía fondos.",
      narrative: [
        "Pericles ordena en 447 antes de Cristo la construcción del Partenón en lo alto de la Acrópolis · templo dedicado a Atenea Parthenos. Fidias dirige el equipo · Ictino e Calícrates son los arquitectos. Quince años de obra. Mármol del monte Pentélico transportado desde dieciséis kilómetros · cada bloque cortado con tolerancias inferiores al milímetro.",
        "El templo tenía color · mármol blanco salvo donde llevaba azul, rojo, dorado · y dentro, una estatua crisoelefantina (oro y marfil) de Atenea de doce metros de altura. Fidias usa parte del oro del tesoro ateniense · es acusado de malversación, exiliado, muere en prisión. El templo le sobrevive.",
      ],
      facts: [
        { label: "Inicio", value: "447 a.C." },
        { label: "Duración obra", value: "15 años" },
        { label: "Material", value: "Mármol del Pentélico · 16 km" },
        { label: "Estatua Atenea", value: "Crisoelefantina · 12 m" },
        { label: "Fidias", value: "Exiliado · acusado de malversación" },
      ],
      whatChanged: "",
      tint: "60a5fa",
    }),
    ep({
      id: "iglesia", era: "medieval",
      pill: "Siglo VI", stage: "Siglo VI · Iglesia bizantina",
      heroFilename: "Erechtheum_Athens.jpg",
      heroImage: "",
      tagline: "El templo de Atenea se convierte en iglesia de la Virgen María. Mil años sin daños.",
      narrative: [
        "En el siglo VI, durante el emperador Justiniano, el Partenón se convierte en iglesia ortodoxa · primero dedicada a la Theotokos (Madre de Dios), luego a la Panagia Atheniotissa (Virgen de los Atenienses). El cambio salva el edificio · durante los mil años siguientes funciona como templo cristiano, lo que evita su demolición.",
        "Las metopas con escenas paganas se pican parcialmente · centauros y dioses olímpicos pierden cabezas o se cubren con yeso. Pero la estructura se conserva. Cuando los otomanos conquistan Atenas en 1456, lo convierten en mezquita y le añaden un minarete · pero tampoco lo destruyen.",
      ],
      facts: [
        { label: "Conversión a iglesia", value: "Siglo VI · Justiniano" },
        { label: "Función cristiana", value: "~900 años" },
        { label: "Conversión a mezquita", value: "1456 · otomanos" },
        { label: "Metopas paganas", value: "Picadas o cubiertas" },
      ],
      whatChanged: "El cambio de religión salva el edificio. La continuidad estructural depende de la utilidad simbólica.",
    }),
    ep({
      id: "explosion", era: "renaissance",
      pill: "1687", stage: "1687 · La explosión",
      heroFilename: "Acropolis_of_Athens_01.jpg",
      heroImage: "",
      tagline: "Los otomanos guardan pólvora dentro. Un disparo veneciano. El centro del templo · vacío.",
      narrative: [
        "En 1687, durante la Guerra de Morea, los otomanos usan el Partenón como polvorín · era considerado el lugar más seguro de la Acrópolis. El comandante veneciano Francesco Morosini, sabiéndolo o no, ordena disparar contra él. Un mortero alcanza el techo · la pólvora explota · el centro del templo desaparece. Doscientas muertes. Las columnas centrales caen.",
        "Lo que el tiempo no había logrado en dos mil años, la guerra lo logra en una tarde. Lord Elgin, entre 1801 y 1812, completa el desastre · se lleva las metopas restantes a Londres, donde siguen en el British Museum bajo el nombre « Elgin Marbles». Grecia las reclama desde 1832.",
      ],
      facts: [
        { label: "Año", value: "26 sep 1687" },
        { label: "Bando", value: "República de Venecia vs. Imperio Otomano" },
        { label: "Muertos", value: "~200" },
        { label: "Elgin Marbles", value: "Londres · British Museum · 1801-1812" },
      ],
      whatChanged: "Lo que el tiempo no logró, la guerra lo logra en una tarde. El templo entra en su forma actual · ruina.",
      reconstructionFilename: "The_Parthenon_in_Athens.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "hoy", era: "today",
      pill: "Hoy", stage: "Hoy · ruina canónica",
      heroFilename: "The_Parthenon_in_Athens.jpg",
      heroImage: "",
      tagline: "Reclamación constante de los mármoles a Londres. Restauración con anastilosis · sigue en obra.",
      narrative: [
        "La restauración del Partenón empieza en 1975 y sigue activa hoy · cincuenta años, sin terminar. Técnica de anastilosis · reconstruir solo con piezas originales, sin añadir mármol nuevo. Cada bloque numerado, devuelto a su posición exacta. El proceso es lentísimo · descubre constantemente errores de restauraciones anteriores del XIX que hay que deshacer.",
        "Grecia reclama oficialmente los Elgin Marbles desde 1832 · el British Museum se niega desde 1832. En 2023 el primer ministro griego Kyriakos Mitsotakis fue desconvocado de una reunión con Rishi Sunak por insistir en el tema. La diplomacia patrimonial sigue siendo combate.",
      ],
      facts: [
        { label: "Restauración activa", value: "Desde 1975" },
        { label: "Técnica", value: "Anastilosis · solo piezas originales" },
        { label: "Reclamación Elgin Marbles", value: "Desde 1832" },
        { label: "Visitantes / año", value: "~3 millones" },
      ],
      whatChanged: "La ruina se vuelve cuidado. La diplomacia patrimonial sigue siendo combate.",
      reconstructionFilename: "Acropolis_of_Athens_01.jpg",
      reconstructionImage: "",
    }),
  ],

  // ─── TOKIO SHOWA ─────────────────────────────────────────────────────────
  "tokyo-showa": [
    ep({
      id: "bombardeo", era: "modern",
      pill: "10 mar 1945", stage: "10 marzo 1945 · Bombardeo",
      heroFilename: "Ginza_Tokyo.jpg",
      heroImage: "",
      tagline: "Tres noches de bombas incendiarias. Cien mil muertos. Más que Hiroshima.",
      narrative: [
        "El 9 y 10 de marzo de 1945, trescientos bombarderos B-29 estadounidenses lanzan bombas incendiarias sobre Tokio durante tres horas. El plan, diseñado por Curtis LeMay, usa napalm específicamente porque sabe que las casas tokiotas son de madera. El fuego se autoalimenta · viento, calor, oxígeno. La ciudad arde sin posibilidad de extinguirla.",
        "Resultado: cien mil muertos en una sola noche · más que Hiroshima en su día más violento. Quince kilómetros cuadrados de Tokio reducidos a cenizas. Un millón de personas sin hogar. El centro civil de la era Showa desaparece en ocho horas.",
      ],
      facts: [
        { label: "Fecha", value: "9-10 mar 1945" },
        { label: "Aviones", value: "~300 B-29" },
        { label: "Muertos una noche", value: "~100.000" },
        { label: "Superficie destruida", value: "15 km²" },
        { label: "Sin hogar", value: "1 millón" },
      ],
      whatChanged: "",
      tint: "f87171",
    }),
    ep({
      id: "olimpiadas", era: "modern",
      pill: "1964", stage: "1964 · Juegos Olímpicos",
      heroFilename: "Tokyo_Tower_2011.jpg",
      heroImage: "",
      tagline: "Diecinueve años después del fuego. Shinkansen. Tokyo Tower. Japón vuelve.",
      narrative: [
        "Diecinueve años después del fuego, Tokio organiza los Juegos Olímpicos de 1964 · primera ciudad asiática anfitriona. El gobierno japonés lo entiende como gesto de reentrada al mundo, no como evento deportivo. Construye en cinco años · Tokyo Tower (1958, sobre los restos del bombardeo), Shinkansen (1964, primera línea de alta velocidad del mundo), autopistas urbanas elevadas.",
        "Hirohito asiste a la inauguración como espectador · era el mismo emperador que en 1945 anunció la rendición pidiendo a su pueblo « soportar lo insoportable». Ahora sostiene la bandera olímpica. El gesto político es enorme · Japón reaparece como nación moderna, no como derrotado.",
      ],
      facts: [
        { label: "Año", value: "1964 · Tokio" },
        { label: "Tokyo Tower", value: "1958 · 332 m" },
        { label: "Shinkansen", value: "1964 · primera línea de alta velocidad mundial" },
        { label: "Hirohito", value: "Inaugura como emperador" },
      ],
      whatChanged: "El país pasa de derrota a milagro económico. La reconstrucción funciona como cobertura simbólica.",
      reconstructionFilename: "Shinjuku_at_night.jpg",
      reconstructionImage: "",
    }),
    ep({
      id: "shibuya", era: "today",
      pill: "Hoy", stage: "Hoy · Shibuya como símbolo",
      heroFilename: "Shibuya_Crossing_-_Tokyo_-_2015_03.jpg",
      heroImage: "",
      tagline: "Tres mil personas cruzan cada cambio de luz. La era Reiwa se filma en TikTok.",
      narrative: [
        "El cruce diagonal de Shibuya · tres mil personas cada cambio de semáforo · es la imagen contemporánea de Tokio. Más visitado que la Torre Eiffel. Símbolo no de poder histórico sino de coreografía urbana · todos cruzan, nadie choca, nadie se detiene. La eficiencia japonesa hecha imagen exportable.",
        "Bajo Shibuya hay puertas selladas que datan de 1944 · refugios antiaéreos preservados, algunos todavía con marcas de quemado en las paredes. Los guías oficiales no las mencionan · están en los mapas no turísticos. KUDOS te lleva a esa otra Shibuya · la que sostiene el cruce desde la memoria que nadie nombra.",
      ],
      facts: [
        { label: "Personas / cruce", value: "~3.000 cada cambio" },
        { label: "Visitas anuales", value: "Mayor afluencia turística de Tokio" },
        { label: "Refugios bajo Shibuya", value: "Sellados · 1944" },
      ],
      whatChanged: "La ciudad bombardeada se vuelve imagen global de modernidad. La memoria queda sellada bajo el suelo.",
      reconstructionFilename: "Shinjuku_at_night.jpg",
      reconstructionImage: "",
    }),
  ],
};

// Re-export wikimediaUrl so consumers can compute on demand
export { wikimediaUrl } from "./wikimedia";
