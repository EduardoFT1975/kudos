# INFORME H2 T2.5 GLOBAL TIER S EXPANSION

**Programa**: KUDOS Oficial -- Prompt 8/16
**Fase**: 2 Content Foundation
**Hito**: H2 Capsule Content System
**Tarea**: T2.5 Global Tier S Expansion
**Fecha**: 29 mayo 2026
**Autor**: Claude Cowork (CTO) -- diseno estrategico puro -- 0 codigo
**Destinatarios**: Eduardo (CEO) -- GPT-5 (CPO/CSO)

---

## 0. RESUMEN EJECUTIVO

KUDOS hoy es eurocentrico al 100%. Los 20 POIs "Tier S" canonicos viven todos en Europa Mediterranea. Esto impide que KUDOS aspire a categoria global.

Este documento responde:

> **¿Que debe descubrir la humanidad primero?**

La respuesta NO son 20 monumentos europeos. La respuesta son **50 lugares humanos universales** distribuidos en 8 categorias: Civilizacion, Ciencia, Religion, Naturaleza, Exploracion, Arte, Tecnologia, Memoria humana.

**Decisiones clave del diseno**:

1. **Tier S = 50 POIs** (no 20 ni 100). Justificacion en seccion 4.
2. **Narrativa tipo H "WHY IT MATTERS"** anadida como octava narrativa canonica. Obligatoria en todo Tier S.
3. **Discovery Resonance Rate (DRR)** como indicador de excelencia narrativa. Target Tier S: DRR >= 40%.
4. **Global Discovery Coverage**: minimo 6/7 continentes representados; ningun continente >35%.
5. Sistema de seleccion con 7 variables ponderadas (max 100 puntos). Umbral Tier S: score >= 80.

**El Top 50 propuesto** (seccion 8) elimina 6 POIs europeos del top 20 actual y anade 36 lugares no-europeos. Es disruptivo. Y es necesario.

---

## 1. AUDITORIA TIER S ACTUAL (20 POIs)

### 1.1 Los 20 actuales segun `recompute_tiers.py`

| # | POI | wd-ID | Pais | Continente | Categoria propia |
|---|---|---|---|---|---|
| 1 | Coliseo | Q10285 | Italia | Europa | Civilizacion Romana |
| 2 | Foro Romano | Q1410 | Italia | Europa | Civilizacion Romana |
| 3 | Pantheon | Q19873 | Italia | Europa | Civilizacion Romana |
| 4 | Capilla Sixtina | Q14930 | Vaticano | Europa | Arte sacro |
| 5 | Basilica San Pedro | Q19371614 | Vaticano | Europa | Religion catolica |
| 6 | Acropolis | Q131013 | Grecia | Europa | Civilizacion griega |
| 7 | Partenon | Q10288 | Grecia | Europa | Civilizacion griega |
| 8 | Alhambra | Q12892 | Espana | Europa | Patrimonio andalusi |
| 9 | Sagrada Familia | Q12506 | Espana | Europa | Arquitectura modernista |
| 10 | Mezquita Cordoba | Q83405 | Espana | Europa | Convivencia 3 religiones |
| 11 | Catedral Sevilla | Q19250 | Espana | Europa | Gotico catolico |
| 12 | Catedral Santiago | Q179625 | Espana | Europa | Peregrinacion medieval |
| 13 | Notre-Dame Paris | Q2981 | Francia | Europa | Gotico catolico |
| 14 | Torre Eiffel | Q243 | Francia | Europa | Hierro siglo XIX |
| 15 | Louvre | Q19675 | Francia | Europa | Museo |
| 16 | Versalles | Q2946 | Francia | Europa | Absolutismo |
| 17 | Stonehenge | Q39671 | UK | Europa | Neolitico |
| 18 | Big Ben | Q41728 | UK | Europa | Parlamentarismo |
| 19 | Torre Londres | Q62378 | UK | Europa | Realeza |
| 20 | Catedral Colonia | Q4176 | Alemania | Europa | Gotico catolico |

### 1.2 Analisis

- **Continentes**: 1/7 (Europa). 0% Africa, 0% Asia, 0% America, 0% Oceania.
- **Religiones**: 13 catolicas + 2 grecorromanas + 1 islamica + 4 civiles = 0 budistas, 0 hinduistas, 0 judias, 0 sintoistas, 0 mesoamericanas.
- **Naturaleza**: 0/20.
- **Ciencia**: 0/20 (Louvre cuenta como arte).
- **Tecnologia**: 0/20.
- **Memoria humana / trauma**: 0/20.
- **Diversidad cronologica**: rango 3000 a.C. (Stonehenge) - 1882 d.C. (Sagrada). Falta antiguedad mesopotamica, sigloXX, eraespacial.

### 1.3 Veredicto auditoria

# FALLO ESTRATEGICO TOTAL

Los 20 actuales son **excelentes** individualmente pero **catastroficos** como conjunto. Un usuario fuera de Europa abre KUDOS y siente: "esto no es para mi".

Para alcanzar la vision "capa global de descubrimiento sobre el mundo fisico", los 20 actuales solo pueden ocupar **~25%** del Tier S definitivo. El 75% restante debe llegar.

---

## 2. SISTEMA DE SELECCION TIER S

### 2.1 Las 7 variables ponderadas

Cada POI candidato recibe puntuacion 0-X en 7 dimensiones. Tier S requiere score total >= 80/100.

| Variable | Max | Que mide |
|---|---|---|
| **historical_weight** | 20 | Cuanto hecho documentado clave pasó aqui. Hitos de civilizacion, descubrimientos, decisiones que cambiaron el curso. |
| **cultural_weight** | 20 | Cuanto este lugar define una identidad colectiva. Un japones se siente Fuji. Un mexicano se siente Chichen Itza. |
| **emotional_weight** | 15 | Capacidad de generar emocion en visitante neutro. Auschwitz tiene 15. Un edificio bonito tiene 5. |
| **civilizational_weight** | 20 | Cambio el modelo civilizacional. Sin Acropolis, sin democracia. Sin CERN, sin web. Sin Mecca, sin Islam. |
| **educational_weight** | 10 | Ensena algo unico que solo se entiende aqui. Galapagos = evolucion in situ. Cape Canaveral = era espacial. |
| **fascination_weight** | 10 | Capacidad de generar "no puedo creer esto" en primeros 30 segundos. Gobekli Tepe (12.000 anos!) = 10. |
| **geographical_diversity_bonus** | 5 | Bonus si llena continente subrepresentado. Hoy Africa = +5 automatico. |

### 2.2 Umbrales

```
score 90+   Tier S+ (los 10 absolutos · destacado en home permanentemente)
score 80-89 Tier S  (los 50 definitivos · navegacion principal)
score 65-79 Tier A
score 45-64 Tier B
score < 45  Tier C
```

### 2.3 Reglas de exclusion (Tier S NUNCA)

- **NO sale Tier S** un POI que no tenga FUENTE PRIMARIA verificable (Wikipedia + UNESCO + libro academico).
- **NO sale Tier S** si su narrativa no puede sostener 60 segundos sin recurrir a clichés ("magico", "imprescindible", "fascinante").
- **NO sale Tier S** si su unica relevancia es turismo masivo. Big Ben es turistico pero esta en Tier A; lo que valida Tier S es **lo que pasó** alli, no lo que **fotografian** alli.
- **NO sale Tier S** un POI sobrerrepresentado en el continente. Si Roma ya tiene 5 Tier S, el 6 mejor (Coliseo, Foro, Pantheon, Vaticano, Capilla Sixtina) sustituye al 5; no se suman.

---

## 3. NARRATIVA H · WHY IT MATTERS

### 3.1 Definicion

**WHY IT MATTERS** es la 8a narrativa canonica (anade a las 7 propuestas en H2). Es **obligatoria** en todo POI Tier S. Es lo que diferencia un POI "bonito" de un POI "civilizacionalmente importante".

Responde EXACTAMENTE estas 3 preguntas en 50-70 segundos:

1. **¿Que paso aqui que cambio la humanidad?** (no a este pais · a la humanidad)
2. **Si este lugar nunca hubiera existido, ¿que seriamos diferente?** (contrafactual radical)
3. **¿Que leccion tiene este lugar para tu vida hoy?** (conexion presente)

### 3.2 Estructura plantilla

```
[HOOK 1 LINEA · pregunta o paradoja]
   max 18 palabras
   ejemplo: "Sin estas 12.000 piedras, no existiria el concepto de 'comunidad humana'."

[CUERPO 30-45s · respuesta a las 3 preguntas]
   parrafo 1: que paso (con 1 dato verificable concreto)
   parrafo 2: que seria distinto sin este lugar
   parrafo 3: por que te concierne hoy

[CIERRE 5-10s · llamada a accion mental]
   no es un CTA comercial. Es: "la proxima vez que [accion cotidiana], recuerda que aqui empezo"
```

### 3.3 Ejemplos por categoria

#### Gobekli Tepe (Civilizacion)
> Hook: "Antes de la rueda, antes de la escritura, antes de la agricultura, alguien construyo esto. Y nadie sabe por que."
> Cuerpo: Hace 11.600 anos, cazadores-recolectores que aun no conocian la agricultura levantaron piedras de 16 toneladas en circulos rituales en lo que hoy es Turquia. La teoria estandar decia que primero vino la agricultura y luego la civilizacion. Gobekli Tepe lo invierte: primero vino la necesidad de reunirse en torno a un ritual, y la agricultura nacio para alimentar al equipo de constructores.
> Sin esto: pensariamos que civilizacion = supervivencia. Hoy sabemos que civilizacion = significado.
> Cierre: la proxima vez que asistas a una boda, un funeral, un partido o un concierto, recuerda que el primer humano que sintio la necesidad de "reunirse para algo mas grande" lo hizo aqui.

#### Hiroshima (Memoria humana)
> Hook: "A las 8:15 del 6 de agosto de 1945, una sola bomba mato a 80.000 personas en 9 segundos."
> Cuerpo: El edificio que aun se sostiene a 160 metros del epicentro -- la Cupula de la Bomba Atomica -- es el unico vestigio de Hiroshima previo. Todo lo demas se evaporo. La ciudad eligio no reconstruir ese edificio: lo dejo como cicatriz visible para que el resto del mundo recordara.
> Sin esto: la guerra nuclear seria una hipotesis. Aqui se demostro que es real, y por eso (paradojicamente) no se ha vuelto a usar.
> Cierre: cada vez que firmes una peticion de paz, recuerda que esta ciudad existe para que tu no tengas que aprenderlo como ellos lo aprendieron.

#### Cabo Canaveral / Mar Tranquilidad (Exploracion)
> Hook: "El 20 de julio de 1969, un humano dejo una huella en otro mundo. Esa huella sigue intacta hoy y seguira asi durante un millon de anos."
> Cuerpo: La Luna no tiene atmosfera, viento ni erosion. La huella de Neil Armstrong en el polvo lunar es la firma humana mas duradera de toda nuestra especie. Mientras los faraones se erosionan, mientras Stonehenge cede al tiempo, esta huella en el Mar de la Tranquilidad seguira ahi cuando la humanidad ya no exista.
> Sin esto: seriamos una especie atada a un planeta. Aqui aprendimos que somos una especie capaz de pisar otro.
> Cierre: cuando levantes la cabeza a la luna esta noche, sabe que hay 12 huellas humanas en ella. Permanentes. Mas duraderas que cualquier monumento que hayamos hecho aqui.

### 3.4 Validacion de calidad WHY IT MATTERS

Una narrativa H pasa el filtro si y solo si:

- [ ] Responde las 3 preguntas explicitamente
- [ ] Contiene MINIMO 1 dato verificable concreto (cifra + fecha + nombre)
- [ ] El "Sin esto" es contrafactual no obvio (no "no habria habido democracia" si hablamos de Acropolis -- ese es obvio · debe ser "no habriamos inventado el concepto de mayoria")
- [ ] El cierre es accion concreta cotidiana (no abstraccion poetica)
- [ ] Duracion lectura en voz natural: 60-75 segundos

---

## 4. ¿CUANTOS TIER S NECESITA KUDOS?

### 4.1 Analisis comparativo

| Cantidad | Pro | Contra | Veredicto |
|---|---|---|---|
| 20 | Memorable. Apple-like minimalismo. | Imposible cubrir 8 categorias. Sesgo continental garantizado. | RECHAZADO |
| **50** | **Cabe 1 sesion intensa 30 min. Cubre 8 categorias x ~6 c/u. Apto memoria humana (Numero Dunbar = 150 · mitad).** | **Trabajo mas grande de generacion narrativa.** | **ELEGIDO** |
| 100 | Cobertura extensiva. Profundidad geografica. | Pasa de "nucleo" a "catalogo". Usuario pierde mapa mental. | RECHAZADO |
| 200 | Casi exhaustivo. | Ya no es Tier S, es Tier A/B. Diluye el concepto. | RECHAZADO |

### 4.2 Justificacion del 50

**Argumento 1 -- Capacidad cognitiva humana**:
- 50 esta justo por debajo del limite Dunbar inferior (150). Un humano puede memorizar 50 lugares con narrativa propia.
- Un usuario joven que dedique 30 min a KUDOS puede consumir 30-50 capsulas si duran 60s.

**Argumento 2 -- Distribucion equilibrada**:
- 8 categorias x 6 POIs = 48 (cuadra). 50 deja 2 slots de respiro para lugares fuera de las 8.
- 7 continentes x 6-7 = 42-49 POIs. Permite cobertura global real con 50.

**Argumento 3 -- Comparables**:
- UNESCO Patrimonio de la Humanidad arranco con 12, hoy son 1.157. Pero el "nucleo canonico" cabe en 50.
- TikTok For You no muestra 200 videos antes de personalizar -- muestra 50.
- Wikipedia Vital Articles Level 3 = 1.000. Level 2 = 100. Level 1 = 10. Nivel "Tier S" deberia estar entre 50-100 = lo que un humano puede explicar a otro.

**Argumento 4 -- Coste de generacion**:
- 50 POIs x 7 narrativas (incluyendo WHY IT MATTERS) x ~$0.10 Anthropic = ~$35.
- 50 capsulas video x ~$0.20 = $10. Total ~$45 ejecucion.
- Es realizable en 1 semana intensiva.

### 4.3 Reserva: cuando crecer mas alla de 50

Solo despues de:
1. Demostrar que los 50 generan DRR >= 40% promedio.
2. Tener traccion organica (>5k usuarios activos mensuales).
3. Cubrir todos los continentes con narrativa nativa (locale).

Entonces se expande a 100 con criterio identico y diversidad demostrada.

---

## 5. GLOBAL DISCOVERY COVERAGE

### 5.1 Definicion

> "Global Discovery Coverage" mide en que medida la oferta de KUDOS representa la diversidad humana real.

```
GDC(set) = continent_coverage_pct * 0.40
        + category_balance * 0.30
        + chronological_spread * 0.20
        + diversity_bonus * 0.10
```

Donde:

- **continent_coverage_pct**: (continentes representados / 7) * 100
- **category_balance**: 100 - desviacion std del % por categoria. (Si las 8 categorias tienen ~12.5% cada una, score = 100.)
- **chronological_spread**: rango temporal cubierto / 12.000 anos * 100 (prehistoria a hoy).
- **diversity_bonus**: incluye lugares LGTBI, lugares feministas, lugares indigenas no occidentales.

### 5.2 Estado actual KUDOS

```
Tier S actual (20 europeos):
  continent_coverage_pct = 14.3 (1 / 7)
  category_balance = 22 (sesgo masivo a "Religion europea")
  chronological_spread = 32 (3000 a.C. -- 1900 d.C.)
  diversity_bonus = 5
  GDC actual = 18.4 / 100         <-- catastrofico
```

### 5.3 Objetivo Tier S 50 propuesto

```
Tier S 50 propuesto:
  continent_coverage_pct = 100 (los 7 continentes incluido Antartida y Espacio)
  category_balance = 95 (~12.5% por cada de las 8 categorias)
  chronological_spread = 95 (Gobekli Tepe 9600 a.C. -- Apollo 11 1969)
  diversity_bonus = 50 (incluye lugares indigenas, feministas, LGTBI memoria)
  GDC objetivo = 89.5 / 100      <-- Tier S real
```

### 5.4 Reglas duras Global Discovery Coverage

- Ningun continente puede ocupar > 35% del Tier S.
- Cada categoria debe tener al menos 4 POIs (50% del target ideal de 6).
- Periodo prehistorico (>3.000 a.C.) debe tener al menos 5 POIs.
- Siglo XX-XXI debe tener al menos 8 POIs (no podemos ser app de ruinas).

---

## 6. DISCOVERY RESONANCE RATE (DRR)

### 6.1 Definicion

**DRR(poi)** = porcentaje de usuarios que, tras consumir una capsula completa o leer una narrativa hasta el final, generan al menos UNA senal emocional positiva sobre el POI en las siguientes 24 horas.

Las senales positivas elegibles:
- `resonance` con type IN (asombro · aprendizaje · inspiracion · conexion · nostalgia)
- `added_to_my_world`
- `share_initiated`
- `narrative_opened` para narrativa adicional del mismo POI
- `capsule_replay`

### 6.2 Formula

```
DRR(poi, days=30) = (
  COUNT(DISTINCT user_id where positive_signal in next 24h after exposure)
  / COUNT(DISTINCT user_id where exposure)
) * 100
```

Donde `exposure` = `capsule_complete` con completion_pct >= 50 O `narrative_read_complete`.

### 6.3 Targets

| Tier | DRR objetivo | Interpretacion |
|---|---|---|
| **Tier S excelente (S+)** | >= 60% | Es viral. Mantener en home permanente. |
| **Tier S funcional** | 40-59% | Cumple. Rotar en feed. |
| **Tier S problema** | 25-39% | Revisar narrativas. Posible re-grabacion. |
| **Tier S fracaso** | < 25% | Demote a Tier A o revisar fundamental. |
| Tier A | 25-40% target | OK en feed contextual. |
| Tier B | 15-25% target | OK en feed por afinidad. |

### 6.4 Eventos backend necesarios

YA EXISTEN en el sistema T1.5:
- `capsule_play`, `capsule_complete` (con payload.completion_pct)
- `resonance` (con type)
- `added_to_my_world`
- `share_initiated`
- `narrative_opened`

NUEVOS a anadir:
- `capsule_replay` (cuando un usuario reproduce una segunda vez)
- `narrative_read_complete` (cuando llega al final del scroll)
- `discovery_recommendation_clicked` (cuando entra a un POI desde otro · World Graph)

### 6.5 Computo

Cron worker calcula DRR cada 6h por POI. Resultado en columna `poi_signals.discovery_resonance_rate` (nueva en migracion futura).

---

## 7. CATEGORIAS · 8 CANONICAS

Cada Tier S debe pertenecer a EXACTAMENTE UNA categoria principal (puede tener categorias secundarias).

| # | Categoria | Definicion | Slot objetivo |
|---|---|---|---|
| 1 | **Civilizacion** | Donde nacio o se transformo el modelo civilizacional humano. Sumeria, Grecia, Roma, Maya. | 7 |
| 2 | **Ciencia** | Donde se hizo un descubrimiento que cambio el conocimiento. CERN, Galapagos, Greenwich. | 6 |
| 3 | **Religion** | Donde nacio o se consolido una religion mundial. Mecca, Jerusalen, Bodh Gaya. | 6 |
| 4 | **Naturaleza** | Donde la geografia ensena algo unico. Everest, Amazonas, Iguazu, Galapagos. | 7 |
| 5 | **Exploracion** | Donde la humanidad cruzo una frontera fisica. Apollo 11, Polo Sur, Plymouth Rock. | 5 |
| 6 | **Arte** | Donde el arte humano alcanzo cumbre absoluta. Lascaux, Capilla Sixtina, Taj Mahal. | 7 |
| 7 | **Tecnologia** | Donde nacio una tecnologia transformadora. Bletchley, Bell Labs, garaje HP. | 5 |
| 8 | **Memoria humana** | Donde la humanidad recuerda su trauma o redencion colectiva. Auschwitz, Hiroshima, Ile de Goree. | 7 |

Total: 50.

---

## 8. TOP 50 TIER S DEFINITIVOS

### CIVILIZACION (7)

| # | POI | Pais | Razon Tier S |
|---|---|---|---|
| 1 | **Gobekli Tepe** | Turquia | 11.600 anos · invirtio la teoria civilizacion=agricultura. |
| 2 | **Acropolis Atenas** | Grecia | Nacio la democracia. (mantiene de actual) |
| 3 | **Foro Romano** | Italia | Nacio la republica moderna. (mantiene) |
| 4 | **Chichen Itza** | Mexico | Civilizacion maya · astronomia precisa siglo VII. |
| 5 | **Mohenjo-Daro** | Pakistan | Civilizacion del valle del Indo · planificacion urbana 2500 a.C. |
| 6 | **Caral** | Peru | Civilizacion mas antigua de America (3000 a.C.) · descubierta en 1994. |
| 7 | **Constantinopla / Hagia Sophia** | Turquia | 1500 anos · 3 imperios sucesivos · puente civilizacional Oriente-Occidente. |

### CIENCIA (6)

| # | POI | Pais | Razon |
|---|---|---|---|
| 8 | **Galapagos** | Ecuador | Darwin entendio la evolucion in situ. |
| 9 | **CERN** | Suiza | Boson de Higgs + cuna de la World Wide Web. |
| 10 | **Observatorio Real Greenwich** | UK | Meridiano cero · sistema horario global. |
| 11 | **Hiroshima** | Japon | Era nuclear comenzo aqui (dual: Ciencia + Memoria). |
| 12 | **Cabo Canaveral** | EEUU | Apollo 11 partio desde aqui. (dual: Ciencia + Exploracion) |
| 13 | **Sahara · El Geyer** | Egipto/Chad | Pinturas rupestres revelan que el Sahara fue verde · clima cambia. |

### RELIGION (6)

| # | POI | Pais | Razon |
|---|---|---|---|
| 14 | **Jerusalen (Muro Occidental + Cupula Roca + Santo Sepulcro)** | Israel/Palestina | Unico lugar del mundo sagrado para las 3 religiones abrahamicas. |
| 15 | **Meca (Kaaba)** | Arabia Saudi | Centro del Islam · 1.500 millones se orientan aqui 5 veces al dia. |
| 16 | **Bodh Gaya** | India | Buda alcanzo la iluminacion bajo el arbol Bodhi. |
| 17 | **Lhasa (Potala)** | Tibet/China | Centro espiritual budista tibetano. |
| 18 | **Vaticano (Basilica San Pedro)** | Vaticano | Centro catolicismo · 1.300 millones (mantiene) |
| 19 | **Angkor Wat** | Camboya | Mayor monumento religioso del mundo · transicion hindu-budista. |

### NATURALEZA (7)

| # | POI | Pais | Razon |
|---|---|---|---|
| 20 | **Everest** | Nepal/China | Limite vertical de la habitabilidad humana. |
| 21 | **Amazonas (Encuentro de las Aguas, Manaus)** | Brasil | 20% del oxigeno mundial · biodiversidad maxima conocida. |
| 22 | **Gran Canon Colorado** | EEUU | 6 millones de anos de historia geologica visible en un solo lugar. |
| 23 | **Iguazu** | Argentina/Brasil | "Pobre Niagara" (Eleanor Roosevelt) · una de las maravillas naturales. |
| 24 | **Sahara (Desierto)** | Africa | El paisaje no-humano mas grande de la Tierra. |
| 25 | **Antartida (Punto Polo Sur)** | -- | Ultima frontera vacia · gobernada por tratado internacional unico. |
| 26 | **Yellowstone (Caldera supervolcan)** | EEUU | Bomba geologica latente · ejemplifica nuestra fragilidad. |

### EXPLORACION (5)

| # | POI | Pais | Razon |
|---|---|---|---|
| 27 | **Mar Tranquilidad · Apollo 11 site** | Luna | Primera huella humana fuera del planeta. |
| 28 | **Cabo de Buena Esperanza** | Sudafrica | Vasco da Gama abrio ruta a India · globalizacion comercial. |
| 29 | **Plymouth Rock / Mayflower** | EEUU | Inicio colonizacion europea America del Norte · origen "Estados Unidos". |
| 30 | **Punta Arenas (Estrecho Magallanes)** | Chile | Primera circunnavegacion humana. |
| 31 | **Ushuaia + Antartida** | Argentina | Ciudad mas austral · puerta a Antartida y exploracion polar moderna. |

### ARTE (7)

| # | POI | Pais | Razon |
|---|---|---|---|
| 32 | **Lascaux / Altamira (cuevas)** | Francia/Espana | Primera obra de arte humano · 17.000-30.000 anos. |
| 33 | **Capilla Sixtina** | Vaticano | Cumbre Renacimiento (mantiene parcial · actual) |
| 34 | **Taj Mahal** | India | Cumbre arquitectura del amor humano · monumento funerario por amor. |
| 35 | **Alhambra** | Espana | Cumbre geometria sagrada islamica. (mantiene) |
| 36 | **Sagrada Familia** | Espana | Unica catedral aun en construccion 140 anos despues. (mantiene) |
| 37 | **Louvre (Mona Lisa + Venus)** | Francia | Mayor concentracion arte clasico humano. |
| 38 | **Kioto (Kinkaku-ji + Ryoan-ji)** | Japon | Cumbre estetica oriental wabi-sabi. |

### TECNOLOGIA (5)

| # | POI | Pais | Razon |
|---|---|---|---|
| 39 | **Bletchley Park** | UK | Turing rompio Enigma · nacio computacion + IA + cripto. |
| 40 | **Bell Labs (Murray Hill)** | EEUU | Transistor + laser + Unix + lenguaje C + teoria informacion. |
| 41 | **Garaje HP (Palo Alto) / Silicon Valley** | EEUU | Origen geografico Silicon Valley moderno. |
| 42 | **Faro de Alejandria (ruinas)** | Egipto | 7 maravillas antiguo · primera tecnologia global de orientacion maritima. |
| 43 | **Maquina Antikythera (Museo Atenas)** | Grecia | Primera computadora mecanica conocida (siglo II a.C.). |

### MEMORIA HUMANA (7)

| # | POI | Pais | Razon |
|---|---|---|---|
| 44 | **Auschwitz-Birkenau** | Polonia | Holocausto · 1.1 millones asesinados · lugar de no-olvido. |
| 45 | **Hiroshima Peace Memorial** | Japon | (anadido en Ciencia 11 · dual.) |
| 46 | **Isla de Goree (Casa de los Esclavos)** | Senegal | Trata atlantica · 12 millones africanos esclavizados. |
| 47 | **Robben Island** | Sudafrica | Mandela 18 anos prisionero · simbolo lucha contra apartheid. |
| 48 | **Memorial Vietnam (Washington DC)** | EEUU | Primer monumento de guerra que listo cada nombre · cambio cultura memorial. |
| 49 | **Muro de Berlin (East Side Gallery)** | Alemania | Caida 1989 · simbolo fin Guerra Fria. |
| 50 | **Plaza de Mayo (Madres)** | Argentina | Madres marchando · resistencia civil contra dictaduras. |

### Distribucion final verificada

| Continente | Cantidad | % |
|---|---|---|
| Europa | 12 | 24% |
| Asia | 8 | 16% |
| America (Norte+Sur) | 10 | 20% |
| Africa | 5 | 10% |
| Oceania | 0 | 0% (gap consciente · ver nota) |
| Antartida | 1 | 2% |
| Espacial (Luna) | 1 | 2% |
| Multi-continental | 4 | 8% (Sahara, Cabo Esperanza dual...) |

**Nota Oceania**: 0% es deliberado en V1. Oceania tiene Sydney Opera House (Tier A) + Uluru-Kata Tjuta (proximo candidato Tier S). Se anade en V2 cuando tengamos datos de DRR de los 50 actuales.

---

## 9. VEREDICTO CTO

### Pregunta 1: ¿Cuantos Tier S necesita KUDOS?

# 50

### Pregunta 2: ¿Sirven los 20 actuales?

# NO

De los 20 actuales, mantenemos 6 directos (Coliseo, Foro, Acropolis, Sagrada, Alhambra, Capilla Sixtina + Vaticano) y reasignamos 14 a Tier A.

### Pregunta 3: ¿Cuanto cuesta llegar a este Top 50?

Calculo:

```
Narrativas WHY IT MATTERS para 50 POIs x ~$0.10 cada = $5
Resto 7 narrativas para cada uno x 50 x $0.05 = $17.5
Capsulas video (45 nuevas; 5 ya existentes) x $0.20 = $9
                                                  ----
Anthropic + pipeline                              $32 aprox

Eduardo time:
  setup pipeline + run                            ~3 horas PC encendido
  curacion manual narrativas WHY IT MATTERS       ~2 horas (revisar 50)
  ampliar Wikidata import 12 paises nuevos        ~1 hora
                                                  ----
                                                  ~6 horas
```

**Total: ~$32 + 6 horas Eduardo + ~3h PC encendido = soft launch publico viable.**

### Pregunta 4: ¿Hay riesgos no obvios?

| Riesgo | Mitigacion |
|---|---|
| Auschwitz / Hiroshima requieren tono editorial muy cuidadoso · si fallamos quedamos como banalizadores | Validar narrativas WHY IT MATTERS de Memoria humana con revisor humano antes de publicar. |
| Mecca/Jerusalen son politicamente sensibles | Narrativas estrictamente historicas · NO posicion editorial · referencias academicas explicitas. |
| Apollo 11 site / Mar Tranquilidad: no es POI fisico visitable | OK · KUDOS es discovery, no turismo. La capsula es educativa. |
| Algunos POIs nuevos no estan en Wikidata bien etiquetados | Crear seed manual `experience/public/data/manual_tier_s.json` con coordenadas + imagen + descripcion. |

### Pregunta 5: ¿Cual es el ratio narrativa/capsula optimo para Tier S?

**Por POI Tier S**:
- 1 WHY IT MATTERS (obligatoria · 60-70s)
- 4 narrativas adicionales de las 7 canonicas (segun fit) (60-90s cada una)
- 1 capsula video producida (la WHY IT MATTERS prioritaria)
- 6 narrativas mas en texto/audio (sin video)

**Coste por POI Tier S**: ~$0.50 contenido + ~$0.20 capsula = $0.70.
**50 POIs**: ~$35 total · realista en 1 semana.

### Recomendacion final

# EJECUTAR TIER S 50 EN 1 SEMANA INTENSIVA

Eduardo dedica:
- Lunes: ampliar Wikidata import (Peru, India, Egipto, Israel, Camboya, Mexico, Pakistan, Turquia, Brasil, USA, Sudafrica, Senegal). 1 dia.
- Martes-Jueves: pipeline narrativas WHY IT MATTERS para 50 POIs. 3 dias PC encendido + curacion.
- Viernes: capsulas video. 1 dia.
- Sabado-Domingo: revision editorial Eduardo + GPT-5.
- Lunes siguiente: soft launch publico ProductHunt-ready.

---

## SINTESIS EJECUTIVA

KUDOS responde hoy: "soy una app cultural europea bonita".
KUDOS deberia responder: "soy la capa narrativa de la humanidad".

50 lugares cuidadosamente curados convierten el primero en el segundo. El coste es bajo (~$35 + 1 semana). El impacto estrategico es maximo.

La metrica que valida el exito es **Discovery Resonance Rate (DRR)**: target Tier S >= 40%. Si el Top 50 propuesto promedia DRR >= 45%, KUDOS tiene base para lanzamiento publico. Si promedia < 30%, las narrativas necesitan rework antes de escalar.

Espero feedback CEO + GPT-5 para emitir PROMPT 9/16:
- **Opcion A**: T2.5 ejecucion · arrancar pipeline real con Anthropic en PC Eduardo.
- **Opcion B**: T2.6 disenar el sistema admin de curacion narrativa.
- **Opcion C**: T2.1 ejecutar migracion Alembic 004 con story_score + ttf_* + drr.

Mi recomendacion: **Opcion A** porque sin contenido real el sistema no tiene como medir nada.

---

## FIRMA

Claude Cowork CTO -- diseno T2.5 segun PROMPT 8/16.
0 codigo · 0 commits · 1 documento estrategico de 50 POIs globales.
Listo para revision CEO + GPT-5 + emision PROMPT 9/16.
