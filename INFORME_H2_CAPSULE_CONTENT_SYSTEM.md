# INFORME H2 · CAPSULE CONTENT SYSTEM

**Programa**: KUDOS Oficial · Prompt 7/16
**Fase**: 2 -- Content Foundation
**Hito**: H2 -- Capsule Content System
**Fecha**: 29 mayo 2026
**Autor**: Claude Cowork (CTO) · diseno puro · 0 codigo
**Destinatarios**: Eduardo (CEO) · GPT-5 (CPO/CSO)

---

## 0. RESUMEN EJECUTIVO

KUDOS ha terminado su fase de infraestructura (H0 + H1 completos). El riesgo deja de ser tecnico y se convierte en **fascinacion**. Este documento define el sistema operativo de contenido que evaluara, ranqueara y curara las capsulas para maximizar el indicador estrategico del producto:

# TIME TO FASCINATION
**el segundo exacto en el que un usuario que no conocia un POI piensa: "no puedo creer esto"**.

Si KUDOS no consigue ese momento en < 30 segundos sobre una capsula de 60-90s, no escala. Todo lo demas es ruido.

### Estado real del contenido (inventario verificado hoy)

| Recurso | Cantidad real |
|---|---|
| POIs Wikidata cargados (8 paises) | 43.185 |
| POIs Tier S (legendary IDs canonicos) | 20 |
| POIs Tier A (Selecta KUDOS) | 282 |
| POIs Tier B | 14.840 |
| Capsulas video reales generadas | 15 (`capsules/index.json`) |
| POIs con 6 narrativas escritas | 292 (`narratives/index.json`) |
| POIs con relaciones World Graph | 184 (404 edges) |
| Narrativas totales (estimacion) | ~1.752 (292 POIs x 6 tipos) |

### Veredicto rapido (detallado en seccion 10)

**¿Suficiente contenido para soft launch interno (10-20 invitados)?** SI.
**¿Suficiente para soft launch publico (100-1.000 usuarios)?** NO. Faltan capsulas Tier S/A completas y curacion de las 292 narrativas existentes.

---

## 1. AUDITORIA SISTEMA ACTUAL DE CAPSULAS

### 1.1 Lo que existe (verificado)

**Backend (`kudos_engine/apps/capsules/`)**:
- Modelos Pydantic `Capsule` + `SceneManifest`.
- Endpoints CRUD `/api/capsules/*`.
- Service `capsule_service` con storage JSON.
- En T1.2 ya esta lista la tabla SQL `capsules` (id, poi_id, title, duration_s, url, thumb_url, vtt_url, scene_manifest JSONB, status, tier).
- T1.4 anadio routers Postgres-aware aunque las capsulas siguen siendo de lectura publica.

**Backend (`kudos_engine/apps/narrative/`)**:
- Modelo `Narrative` con campos: id, poi_id, narrative_type, title, hook, duration_s, emotion, body_md, language, generated_by.
- Tabla SQL T1.2 con UNIQUE (poi_id, narrative_type, language).
- Endpoint `/api/narrative/by-poi/{poi_id}` operativo.

**Scripts pipeline (`kudos_engine/scripts/`)**:
- `generate_capsules_top.py` --tier --resume --no-anthropic.
- `generate_narratives_top.py` --tier (6 narrativas por POI).
- `recompute_tiers.py` con LEGENDARY_IDS + KEYWORDS_S/A/B exact-match.
- `curate_capsules.py` dedup canonical.
- Pipeline: Wikimedia (fotos) + Edge-TTS (voz) + ffmpeg Ken Burns + Anthropic Claude (guion).

**Frontend (`experience/components/`)**:
- `useNarratives.ts` lee manifest `/data/narratives/index.json`, devuelve hasta 6 narrativas por POI.
- `TYPE_ICON` map para los 6 tipos.
- `PoiNodeV5.tsx HistoriaTab` renderiza narrativas reales.
- `HomeFeedV5 TimelineStoryRail` curaduría manual de 6 hilos temporales hardcoded.
- `useRelatedPois.ts` lee `/data/relationships/index.json`.

### 1.2 Lo que falta o esta debil

| Gap | Impacto | Esfuerzo |
|---|---|---|
| Sin metrica de "calidad de capsula" | Critico · no sabemos cuales subir y cuales descartar | Medio (definicion + scoring backend) |
| Solo 7 narrativas tipos (segun prompt deberian ser 7 con Emotional Shock + Contextual Present) | Alto · falta una palanca emocional | Bajo (anadir 2 tipos al schema) |
| Cero medicion de Time To Fascination | Critico · es el indicador maestro | Medio (anadir 4 EventTypes y derivar) |
| Capsulas Tier A no generadas (~80 POIs faltan) | Critico para soft launch publico | Eduardo + Anthropic ~$15 + 1h |
| Narrativas Tier A/B no generadas | Alto para feed con profundidad | Eduardo + Anthropic ~$30-50 |
| Sin curacion humana de las 1.752 narrativas | Medio · calidad heterogenea sin revisar | Manual · 1 persona x dia |
| Sin clasificacion narrativa por hook strength | Critico para ranqueo del feed | Auto (heuristica) + manual |
| Sin Story Score por narrativa | Critico para Feed Readiness | Disenado en este doc |

### 1.3 Lo que el codigo ya hace bien

- 15 capsulas reales reproducibles (ya 4 mas que antes).
- 292 POIs cubiertos con 6 narrativas cada uno = **1.752 narrativas existentes**.
- 184 POIs con relaciones (World Graph operativo).
- Pipeline de generacion repetible.

---

## 2. INVENTARIO DETALLADO

### 2.1 Capsulas video (15)

```
Tier S (canonicas):
  wd-Q10285  Coliseo (Roma)
  wd-Q12892  Alhambra (Granada)
  wd-Q131013 Acropolis (Atenas)
  wd-Q2981   Notre-Dame (Paris)
  wd-Q243    Torre Eiffel (Paris)
  wd-Q61942244 Sagrada Familia (Barcelona)
  wd-Q180212 Foro Romano (Roma)

Tier A:
  wd-Q19371614 Basilica San Pedro (Vaticano)
  wd-Q62378    Torre de Londres
  wd-Q5933     Abadia de Westminster

Tier B (cobertura abadias menores):
  wd-Q314478, wd-Q2482838, wd-Q926846, wd-Q3405514, wd-Q3662761
```

### 2.2 Narrativas (292 POIs · 6 tipos cada uno = ~1.752 narrativas)

Tipos canonicos actuales (presentes en manifest):
- Hidden Truth
- Human Story
- Mystery
- Lost World
- Transformation
- Present Connection

**FALTA segun prompt 7/16**: Emotional Shock, Contextual Present (NOTA: "Contextual Present" = "Present Connection"). El nuevo tipo a anadir es **Emotional Shock**.

### 2.3 Relationships (184 POIs · 404 edges)

Tipos: geographical (proximidad <2km), thematic (misma categoria <50km), historical (eras coincidentes), temporal (epocas conectadas). En el manifest predominan geographical + thematic. Los otros dos estan reservados en schema pero poco poblados.

### 2.4 POIs base (43.185 Wikidata)

Distribuidos en 8 paises:
- Alemania: 6.824
- Italia: 5.925
- Francia: 6.065
- Espana: 5.930
- Reino Unido: 5.582
- Portugal: 4.320
- Japon: 4.286
- Grecia: 4.253

Esto es la "tierra fertil" sobre la que escogemos los **Top 100** de la seccion 9.

---

## 3. CAPSULE DATA MODEL V1

### 3.1 Capa estructural (extension del modelo T1.2)

```
Capsule (T1.2 base)
  id              str PK
  poi_id          str FK manifest
  title           str
  hook            str         <-- NUEVO V1: frase de 1 linea que vende el video
  duration_s      int (target 45..90)
  url             str
  thumb_url       str
  vtt_url         str
  scene_manifest  jsonb
  status          str (draft|published|archived)
  tier            str (S|A|B|C)
  language        str (default 'es')
  generated_by    str         <-- NUEVO V1: 'anthropic+ffmpeg' | 'manual' | 'editorial'
  created_at      timestamp

Story Scoring (NUEVO V1 · derivado, ver seccion 5)
  hook_power           float 0..10
  emotional_intensity  float 0..10
  visual_potential     float 0..10
  retention_probability float 0..10  (estimacion antes de tener datos)
  shareability         float 0..10

Quality Score (NUEVO V1 · derivado, ver seccion 6)
  quality_score        float 0..100
  quality_tier         str (S|A|B|C)
  publishable          bool
  needs_human_review   bool

Time To Fascination (NUEVO V1 · medido, ver seccion 7)
  ttf_target_s         int (default 30)
  ttf_measured_p50_s   float (mediana usuarios reales)
  ttf_measured_p95_s   float
  fascination_rate     float (% usuarios que completan capsula tras los primeros 30s)

Feed Readiness (NUEVO V1 · score compuesto, ver seccion 8)
  feed_score           float 0..100
  feed_eligible        bool
  exclusion_reason     str | null

Narrative link
  narrative_id         FK narrative table (opcional · 1 capsula puede materializar 1 narrativa)
  derived_from_type    str (Hidden Truth | Emotional Shock | etc.)
```

### 3.2 Narrative model (extension del T1.2 + 1 tipo nuevo)

```
Narrative (T1.2 base + V1 anadidos)
  id, poi_id, narrative_type, title, hook, duration_s, emotion, body_md, language, generated_by

NUEVO V1:
  story_score         (ver seccion 5) · jsonb {hook_power, emotional_intensity, ...}
  quality_score       float 0..100
  publishable         bool
  has_capsule         bool (true si existe capsula que la materialice)
  needs_human_review  bool
  reviewed_by         str | null
  reviewed_at         timestamp | null
```

### 3.3 No requiere migracion Alembic todavia

Los campos derivados (`hook`, `language`, `generated_by`) ya existen en T1.2. Los nuevos (`story_score`, `quality_score`, etc.) se pueden anadir en **migracion Alembic 004** cuando se implemente. Hoy esto es **diseño**, no codigo.

---

## 4. NARRATIVE TYPES (7 canonicos · GPT-5)

Esta es la **gramatica narrativa de KUDOS**. Cada POI deberia tener AL MENOS 3 narrativas de tipos distintos para que la app no se sienta repetitiva. El target es 6-7 por POI Tier S/A.

### A · HIDDEN TRUTH
**Definicion**: revela un dato que el visitante NO encontraria en Wikipedia ni en una guia oficial. Algo verificado pero contraintuitivo.
**Ejemplo Coliseo**: "El Coliseo se llenaba de agua para representar batallas navales reales. Habia maquinaria hidraulica bajo la arena que hoy esta documentada."
**Hook target**: pregunta o paradoja en 1 linea.
**Tipo de capsula ideal**: 60-75s con plano antes/despues.

### B · EMOTIONAL SHOCK (NUEVO)
**Definicion**: momento humano extremo. Muerte, amor, sacrificio, alegria desbordante, decision irreversible. Verificado historicamente.
**Ejemplo Alhambra**: "Boabdil entregó las llaves de Granada y lloró al volverse. Su madre le dijo: 'Llora como mujer lo que no supiste defender como hombre'."
**Hook target**: imperativo emocional o cita directa.
**Tipo de capsula ideal**: 30-45s primer plano con voz humana.

### C · LOST WORLD
**Definicion**: civilizacion, lengua, oficio o tecnologia desaparecida. Que ya no existe pero existio aqui.
**Ejemplo Acropolis**: "Los colores originales del Partenon eran rojos, azules y dorados intensos. Lo que ves hoy es la ruina blanqueada por el tiempo, no la realidad de la piedra."
**Hook target**: contraste pasado vs presente.
**Tipo capsula**: timelapse 60-90s.

### D · HUMAN STORY
**Definicion**: persona concreta (nombre + biografia) que vivio o transformo este lugar.
**Ejemplo Sagrada Familia**: "Antoni Gaudi vivio en una casita de obra los ultimos 8 anos de su vida, durmiendo entre los planos. Murio atropellado por un tranvia el dia 12 de junio de 1926. No le reconocieron y murio en el hospital de pobres."
**Hook target**: nombre propio + accion.
**Tipo capsula**: 60-90s con retrato historico.

### E · MYSTERY
**Definicion**: pregunta sin respuesta consensuada. Hipotesis academicas en disputa.
**Ejemplo Stonehenge**: "Aun no sabemos como movieron las piedras gigantes 250 km. Tres teorias compiten desde hace 200 anos. Ninguna ha sido demostrada definitivamente."
**Hook target**: enigma planteado.
**Tipo capsula**: 75-90s con animacion de hipotesis.

### F · TRANSFORMATION
**Definicion**: este lugar cambio por completo entre el momento de su origen y hoy. La transformacion fue noticia o trauma.
**Ejemplo Notre-Dame**: "La aguja que ardio en 2019 NO era original. Era una restauracion del siglo XIX que reemplazaba la medieval. Cuando reconstruyan, otra vez restauraran lo que ya era restauracion."
**Hook target**: capa sobre capa, ironia historica.
**Tipo capsula**: 60s con composite de fotos.

### G · CONTEXTUAL PRESENT / Present Connection
**Definicion**: lo que paso aqui en el pasado afecta tu vida hoy. Conexion directa.
**Ejemplo Foro Romano**: "El idioma con el que ahora consumes esta capsula nacio en este foro. Si KUDOS te habla en espanol, frances, italiano o portugues, es porque aqui se hablaba latin."
**Hook target**: "esto que ves -> esto que vives".
**Tipo capsula**: 45-60s con transicion ciudad antigua → moderna.

### Distribucion target por POI Tier S
```
A Hidden Truth          1 obligatoria
B Emotional Shock       1 muy recomendada
C Lost World            1 segun categoria (arqueologico SI · museo no siempre)
D Human Story           1 obligatoria si hay biografia documentable
E Mystery               1 si existen hipotesis competidoras
F Transformation        opcional · 0..1
G Contextual Present    1 obligatoria

Minimo viable Tier S: 4 narrativas (A, B, D, G).
Optimo Tier S: 6-7.
Minimo Tier A: 3.
Tier B: 1-2.
Tier C: 1 (Hidden Truth solo).
```

---

## 5. STORY SCORING SYSTEM

Cada narrativa recibe 5 scores 0..10. Se calculan **en momento de creacion** (heuristica + opcionalmente Claude) y se **re-evaluan** con datos reales de uso.

### 5.1 HOOK_POWER (0..10)
**Que mide**: capacidad de la primera linea del texto para retener al usuario los primeros 5 segundos.
**Heuristica inicial**:
- +2 si contiene pregunta directa al lector
- +2 si contiene cita literal entre comillas
- +2 si contiene cifra concreta y verificable
- +1 si contiene nombre propio
- +1 si <= 18 palabras
- +2 si genera curiosidad sin spoiler

### 5.2 EMOTIONAL_INTENSITY (0..10)
**Que mide**: carga emocional del nucleo de la historia (no del hook).
**Vector**: tristeza · asombro · rabia · esperanza · nostalgia · vergüenza historica · admiracion.
**Heuristica inicial**:
- +3 si involucra muerte humana documentada
- +3 si involucra decision irreversible
- +2 si involucra perdida cultural masiva
- +2 si involucra acto de creacion fuera de lo comun

### 5.3 VISUAL_POTENTIAL (0..10)
**Que mide**: si la historia se puede convertir en imagen impactante. Importante para futuro pipeline video.
**Heuristica**:
- +3 si hay foto historica documentada
- +3 si hay arquitectura/objeto identificable
- +2 si hay contraste antes/despues posible
- +2 si hay paisaje natural amplio

### 5.4 RETENTION_PROBABILITY (0..10)
**Que mide**: probabilidad estimada de que un usuario complete la capsula 60-90s sin saltar.
**Pre-launch** (heuristica): media de Hook + Emotional + Visual / 3.
**Post-launch** (real): % completion medido en watched table x 10.

### 5.5 SHAREABILITY (0..10)
**Que mide**: probabilidad de que el usuario quiera compartir tras consumir.
**Heuristica**:
- +3 si contiene dato no conocido por casi nadie (Hidden Truth con efecto WTF)
- +2 si contiene cita citable
- +2 si conecta con cultura pop (peliculas, libros, canciones)
- +1 si tiene fotogenia (visual_potential >= 7)
- +2 si invoca identidad nacional o cultural

### 5.6 Story Score agregado
```
story_score = (HOOK_POWER * 1.5 + EMOTIONAL_INTENSITY * 1.5 + VISUAL_POTENTIAL * 1.0
               + RETENTION_PROBABILITY * 1.0 + SHAREABILITY * 1.0) / 6.0 * 10
              -> [0..100]
```

Pesos rationale: HOOK + EMOTIONAL son los unicos predictores fiables de fascinacion en pre-launch. VISUAL y SHAREABILITY ganan peso al madurar la app. RETENTION es la verdad ultima pero solo se mide con datos reales.

---

## 6. CAPSULE QUALITY SCORE

Score compuesto que decide si una capsula entra al feed publico.

```
quality_score = (
    story_score * 0.50          (1.5)
  + production_score * 0.20     (calidad video/audio · ffmpeg, TTS, sync)
  + accuracy_score * 0.20       (verificacion historica · manual o cross-check Wikipedia)
  + originality_score * 0.10    (anti-cliche · contrastado con top resultados Google)
) / 100   -> [0..100]
```

### Umbrales de calidad
| Tier | quality_score | Action |
|---|---|---|
| **S** | >= 85 | Feed home destacado |
| **A** | 70-84 | Feed home rotacion |
| **B** | 55-69 | Feed contextual (cuando el POI es relevante por geografia/intereses) |
| **C** | 40-54 | Solo si el POI no tiene alternativa mejor |
| **descartada** | < 40 | NO se publica · `publishable=false` · queda en draft |

### Quality flags
- `publishable`: bool. False si quality_score < 40 O `accuracy_score` < 60.
- `needs_human_review`: True si quality_score 55-70 (zona gris). Cola para revisor humano.

---

## 7. TIME TO FASCINATION

**Definicion operativa**: tiempo desde que el usuario abre la capsula (`capsule_play`) hasta el primer signal positivo (`resonance` con type asombro/aprendizaje/inspiracion, O `added_to_my_world`, O `share_initiated`, O `capsule_complete` con completion_pct >= 80).

```
ttf_for_user_capsule = ts(first_positive_signal) - ts(capsule_play)
```

### Targets
- **Target Tier S**: ttf_p50 <= 30s.
- **Target Tier A**: ttf_p50 <= 45s.
- **Excelencia (Tier S+)**: ttf_p50 <= 15s -> esto es lo que persiguio TikTok.

### EventTypes nuevos requeridos (anadir whitelist en T1.5 validation)
- `capsule_first_signal` (compuesto · derivado en backend)
- Ya existen: `capsule_play`, `capsule_complete`, `resonance`, `added_to_my_world`, `share_initiated`.

### Computo backend (cron post-launch)
```sql
WITH plays AS (
  SELECT user_id, capsule_id, MIN(ts) AS play_ts
  FROM telemetry_events
  WHERE event_type = 'capsule_play'
  GROUP BY user_id, capsule_id
),
first_pos AS (
  SELECT user_id, capsule_id, MIN(ts) AS pos_ts
  FROM telemetry_events
  WHERE event_type IN ('resonance', 'added_to_my_world', 'share_initiated')
        OR (event_type = 'capsule_complete' AND (payload->>'completion_pct')::int >= 80)
  GROUP BY user_id, capsule_id
)
SELECT capsule_id,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (pos_ts - play_ts))) AS ttf_p50
FROM plays JOIN first_pos USING(user_id, capsule_id)
GROUP BY capsule_id;
```

### Fascination Rate
% de plays que generan un positive signal en cualquier momento (no solo los primeros 30s).
**Target Tier S**: fascination_rate >= 35%.
**Excelente**: >= 50%.

---

## 8. FEED READINESS SCORE

Decide si una capsula entra al feed home + en que slot.

```
feed_score = (
    quality_score * 0.40
  + freshness_factor * 0.10        (cuanto tiempo lleva en feed · evita repetir)
  + personal_relevance * 0.30      (intereses del user + saves previos)
  + contextual_relevance * 0.10    (ciudad actual del user, hora del dia, season)
  + diversity_bonus * 0.10         (penaliza repeticion del mismo tipo narrativo)
) -> [0..100]
```

### Eligibility gates (todos deben pasar)
1. `quality_score >= 55` (Tier B minimo)
2. `publishable = true`
3. `needs_human_review = false`
4. existe asset video o thumb minimal
5. duration_s entre 25 y 120

### Exclusion reasons (registradas en log para debug)
- `low_quality` · `unreviewed` · `no_asset` · `wrong_duration` · `repeated_in_session`.

### Slots feed home
```
slot 1: destacado del dia       <- max feed_score del dia
slot 2: rail "Para ti"          <- top 6 personal_relevance
slot 3: rail "Historias que conectan epocas"  <- TimelineStoryRail
slot 4: rail "Eras"             <- ErasCard
```

---

## 9. TOP 100 POIs INICIALES

**Criterio**: cobertura geografica + cultural + categorica con maxima Fascinacion garantizada. Estos son los 100 POIs sobre los que **debemos garantizar** 4-7 narrativas + 1 capsula video < 6 semanas para soft launch publico.

### TIER S (20 POIs · obligatorio para soft launch publico)

| # | POI | Pais | wd-ID | Estado capsula |
|---|---|---|---|---|
| 1 | Coliseo | Italia | Q10285 | LISTA |
| 2 | Alhambra | Espana | Q12892 | LISTA |
| 3 | Acropolis | Grecia | Q131013 | LISTA |
| 4 | Sagrada Familia | Espana | Q61942244 | LISTA |
| 5 | Notre-Dame Paris | Francia | Q2981 | LISTA |
| 6 | Torre Eiffel | Francia | Q243 | LISTA |
| 7 | Foro Romano | Italia | Q180212 | LISTA |
| 8 | Basilica San Pedro | Vaticano | Q19371614 | LISTA |
| 9 | Stonehenge | UK | Q39671 | FALTA |
| 10 | Machu Picchu | Peru | Q43332 | FALTA + sin pais cargado |
| 11 | Taj Mahal | India | Q9141 | FALTA + sin pais cargado |
| 12 | Piramides Giza | Egipto | Q37200 | FALTA + sin pais cargado |
| 13 | Petra | Jordania | Q5788 | FALTA + sin pais cargado |
| 14 | Angkor Wat | Camboya | Q43473 | FALTA + sin pais cargado |
| 15 | Coliseo Roma -> ver 1 | -- | -- | -- |
| 16 | Pisa Torre | Italia | Q39054 | FALTA |
| 17 | Sagrada Familia -> ver 4 | -- | -- | -- |
| 18 | Sant Pere Vaticano -> ver 8 | -- | -- | -- |
| 19 | Mont Saint Michel | Francia | Q39058 | FALTA |
| 20 | Versalles | Francia | Q2946 | FALTA |

**Estado real Tier S**: 8 generadas / 20 objetivo = 40%. Faltan 12. Especialmente criticas las que estan **fuera de los 8 paises cargados** (Peru, India, Egipto, Jordania, Camboya) -- requiere ampliar Wikidata import a 5 paises mas.

### TIER A (80 POIs · objetivo soft launch publico)

Distribuidos por pais (10 por pais x 8 paises = 80):

#### Italia (10)
Pantheon · Foros Imperiales · Catedral Florencia · Plaza San Marcos Venecia · Pompeya · Catedral Milan · Catania Etna · Capilla Sixtina · Castel del Monte · Cinque Terre

#### Espana (10)
Mezquita Cordoba · Alcazar Sevilla · Catedral Santiago · Monasterio El Escorial · Acueducto Segovia · Park Guell · Casa Batllo · La Pedrera · Catedral Burgos · Mezquita-Catedral Cordoba

#### Francia (10)
Mont Saint Michel · Versalles · Catedral Reims · Carcassonne · Pont du Gard · Avignon Palacio Papas · Catedral Chartres · Louvre exterior · Sacré-Coeur · Lascaux

#### UK (10)
Stonehenge · Torre Londres · Westminster · Hadrian Wall · Catedral Canterbury · Big Ben · British Museum exterior · Edinburgh Castle · York Minster · Catedral Salisbury

#### Alemania (10)
Brandenburger Tor · Reichstag · Catedral Colonia · Neuschwanstein · Catedral Aachen · Wartburg · Heidelberg Castle · Dresden Frauenkirche · Wurzburg Residence · Catedral Ulm

#### Grecia (10)
Delfos · Olimpia · Knossos · Meteora · Templo Poseidon · Mistras · Epidauro · Vergina · Cnosos · Santorini caldera

#### Portugal (10)
Torre Belem · Monasterio Jeronimos · Palacio Pena · Capilla Huesos Evora · Catedral Porto · Convento Cristo Tomar · Bom Jesus Braga · Sintra Quinta · Catedral Lisboa · Universidad Coimbra

#### Japon (10)
Kinkaku-ji · Fushimi Inari · Castillo Himeji · Itsukushima · Todai-ji · Catedral Nagasaki · Castillo Osaka · Meiji Shrine · Hiroshima Peace · Mount Fuji 5th station

**Estado real Tier A**: 3 generadas (Basilica San Pedro, Torre Londres, Westminster). Faltan 77.

### Coste estimado para completar Tier S+A

```
Capsulas:     ~89 a generar x ~$0.20 Anthropic + 1-2 min Eduardo PC = ~$18 + 3h
Narrativas:   ~89 POIs x 6 narrativas x ~$0.05 Anthropic = ~$27 + 2h Eduardo
Relationships: auto-gen post · gratis
TOTAL:        ~$45 + 5h ejecucion Eduardo + ~50 min PC encendido
```

---

## 10. VEREDICTO CTO

### Pregunta: ¿Tiene KUDOS suficiente contenido para un soft launch?

| Escenario | Veredicto | Justificacion |
|---|---|---|
| **Soft launch interno** (10-20 invitados conocidos del CEO) | # SI | 15 capsulas + 292 POIs con 6 narrativas + 184 con relaciones. Es mucho mas de lo que vera un beta tester en 1 semana. Permite recoger primeros TTF reales. |
| **Soft launch publico ProductHunt-like** (100-1.000 usuarios) | # NO | Faltan 12 capsulas Tier S (incluyendo lugares no-europeos canonicos: Machu Picchu, Taj Mahal, Piramides). Sin esos, KUDOS parece "app cultural europea" en lugar de "capa global de descubrimiento". |
| **Launch publico generalista** (10k+ usuarios) | # NO | Solo 184/43.185 POIs tienen relationships. 99.6% del mapa no es navegable narrativamente. Falta automatizar narrativas en bulk + curacion humana. |

### Bloqueadores reales para soft launch publico

1. **Generar 12 capsulas Tier S faltantes** (5 fuera de los 8 paises cargados -> ampliar import).
2. **Curacion humana de las 1.752 narrativas existentes** (anadir story_score + quality_score · puede automatizarse con Claude + revision rapida humana 50 POIs Tier S+A).
3. **Implementar Story Scoring + Quality Score backend** (1-2 dias backend + migracion Alembic 004).
4. **Implementar Time To Fascination tracking** (1 dia · anadir EventType `capsule_first_signal` + cron de computo).

### Roadmap propuesto H2 (despues de este diseno)

**T2.1** · Migracion Alembic 004: anadir `story_score`, `quality_score`, `publishable`, `needs_review`, `ttf_*`, `feed_score` a `narratives` y `capsules` (3 dias).

**T2.2** · Generar narrativas Tier A (~80 POIs x 6 = 480 narrativas) con Anthropic (Eduardo · 2h + ~$30).

**T2.3** · Generar capsulas Tier A (~80 capsulas) con pipeline ffmpeg (Eduardo · 3h + ~$18).

**T2.4** · Ampliar Wikidata import: Peru, India, Egipto, Jordania, Camboya (1 dia).

**T2.5** · Capsulas Tier S faltantes (Stonehenge, Machu Picchu, Taj Mahal, Piramides Giza, Petra, Angkor Wat, Pisa, Mont Saint Michel, Versalles) (Eduardo · 2h + ~$3).

**T2.6** · Implementar Story Scoring backend (heuristica + opcional Claude) + dashboard /admin/content (3 dias backend + 2 dias frontend admin).

**T2.7** · Time To Fascination tracking + dashboard (1 dia backend + 1 dia frontend dashboard).

**T2.8** · Curacion humana 50 POIs Tier S+A (Eduardo + GPT-5 · 1 semana revision 7 narrativas/dia).

**Esfuerzo total H2**: 2-3 semanas calendario + ~$50 Anthropic + ~6h Eduardo PC encendido.

### Mi recomendacion CTO

**Lanzar soft launch INTERNO ya con lo que tenemos**. Eduardo invita 10-20 personas de confianza. Cada visita genera signals reales que populan `poi_signals` y validan los heuristicos.

**En paralelo arrancar T2.1 + T2.2 + T2.5** que son los que escalan contenido sin esperar a tener metricas.

**Soft launch publico NO antes de T2.5 completo** (capsulas Tier S no-europeas).

---

## SINTESIS EJECUTIVA

KUDOS tiene la infraestructura mas seria que un MVP cultural-tech tipico tiene. Lo que distingue a KUDOS de "una app bonita" es:
1. La capacidad de **generar 6 narrativas por POI a coste marginal cero** (Anthropic Claude + pipeline auto).
2. La capacidad de **medir TTF en tiempo real** (telemetry_events ya esta).
3. La capacidad de **rankear** con Merit + Signals heuristicos que se vuelven reales con trafico.

El bottleneck restante es **excelencia narrativa**, no infraestructura. Por eso este documento define metricas y procesos, no codigo. T2.1 a T2.8 ejecutaran el codigo.

---

## FIRMA

Claude Cowork · CTO. Diseno H2 segun PROMPT 7/16.
Cero codigo · cero commits · cero generacion de video.
Listo para revision CEO + GPT-5 + emision PROMPT 8/16 (T2.1 Story Scoring backend o T2.5 Capsulas Tier S faltantes).
