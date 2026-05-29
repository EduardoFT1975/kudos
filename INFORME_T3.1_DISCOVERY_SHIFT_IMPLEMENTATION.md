# INFORME T3.1 -- FIRST DISCOVERY SHIFT IMPLEMENTATION

**Programa**: KUDOS Oficial -- Prompt 15/16
**Fase**: T3 Product Transformation Layer
**Hito**: H3 Discovery Shift Implementation
**Tarea**: T3.1 -- Aterrizaje producto del DTL
**Fecha**: 29 mayo 2026
**Autor**: Claude Cowork (CTO) -- diseno producto puro -- 0 codigo
**Destinatarios**: Eduardo (CEO) -- GPT-5 (CPO/CSO)

> Este documento traduce la Discovery Transformation Layer (T2.8) a producto ejecutable.
> 15 bloques de diseno. Sin filosofia. Sin teoria. Sin codigo. Diseno UX + sistemas + comportamiento + metricas.

---

## 0. CORRECCIONES GPT-5 INTEGRADAS

Antes de los 15 bloques, las 3 correcciones obligatorias quedan oficializadas:

### 0.1 Nuevo nivel intermedio: PERSPECTIVE SHIFT

El modelo cognitivo se expande de 2 niveles (atencion -> transformacion) a 3:

```
       FASCINATION                PERSPECTIVE SHIFT              TRANSFORMATION
   "no puedo creer esto"      "esto me hace pensar distinto"    "esto cambia como vivo"
       (segundos)                    (dias/semanas)                  (meses/anos)
       senal: capsule_play          senal: revisita + reflexion     senal: accion + cambio identidad
       metrica: TTF + DRR           metrica: HDI                    metrica: DTI
```

Cada exposicion Core busca llevar al usuario por las 3 fases en ese orden. La gran mayoria se queda en Fascination. Algunos llegan a Perspective Shift. Muy pocos a Transformation real. **Esa proporcion es saludable.**

### 0.2 Cambio en lenguaje fundacional

| Antes | Despues |
|---|---|
| "KUDOS transforma personas" | **"KUDOS ofrece oportunidades de transformacion"** |
| voz tecnocratica + arrogante | voz humilde + honesta |

La transformacion no la decide la app. La decide el usuario. KUDOS solo abre la puerta. Esto cambia copy, marketing, pitch deck y propio funcionamiento interno.

### 0.3 Metrica nueva: HDI (Human Depth Index)

Complementa a DTI. Mientras DTI mide **cuantos** usuarios transforman, HDI mide **cuanto** explora cada usuario.

```
HDI(user) = profundidad acumulada de exploracion humana
            (cobertura pilares x densidad x calidad)
            -> rango 0-100
```

Detalle en Bloque 7.

---

## BLOQUE 1 -- DISCOVERY JOURNEY

### 1.1 El viaje completo (10 pasos, primera semana)

```
PASO 1 - LLEGADA SIN LOGIN
  Pantalla: /inicio
  Hero: "La capa narrativa de la humanidad"
  Subtitulo: "7 lugares explican que significa ser humano. Empezamos por uno."
  Boton primario: "Descubrir el primero" (no "Sign up", no "Login")
  Estado emocional esperado: curiosidad neutra. Sin presion.

PASO 2 - PRIMER CORE PROPUESTO
  Pantalla: /core/[id] -- aterrizaje directo en Olduvai Gorge
  Por que Olduvai primero: pilar Origen biologico es comun a toda humanidad.
  Componente: Discovery Shift Card cerrada (solo HOOK visible)
  Estado emocional: "espera, esto me concierne?"

PASO 3 - PRIMERA NARRATIVA (lectura)
  Click en card abre narrativa scrolleable (los 6 bloques).
  Sin barra de progreso visible. Sin tiempo restante. Sin "X minutos de lectura".
  Solo el texto y el cierre.
  Al llegar al cierre, aparece pregunta unica: "¿Te ha movido?"
  Estado emocional: introspeccion ligera.

PASO 4 - PRIMERA RESONANCIA
  Si responde si: 5 chips emocionales aparecen
  (asombro / aprendizaje / inspiracion / conexion / nostalgia)
  Si responde no: agradecimiento minimo + pregunta "¿que faltaba?"
  Datos capturados: resonance + opcional reflection_text.
  Estado emocional: dignidad de haber sido escuchado.

PASO 5 - PRIMERA INVITACION A GUARDAR
  Tras resonancia, microbanner discreto: "Guarda este lugar para volver."
  Si el usuario clica: requiere login (PRIMERA friccion de auth).
  Modal: "Para que tu Mi Mundo se sincronice entre dispositivos, necesitamos saber quien eres."
  Boton Google. Boton "Sigue explorando como invitado" (igual de visible).
  Estado emocional: decision genuina, no manipulacion.

PASO 6 - PRIMER SHIFT (post-login OPCIONAL)
  Aparece Discovery Shift Card EXPANDIDA con los 3 estados:
  BEFORE (creencia previa) -> DISCOVERY (lo revelado) -> AFTER (nueva perspectiva)
  Boton: "¿Esto me ha pasado a mi?" (si / no / no se aun)
  Estado emocional: reconocimiento intelectual.

PASO 7 - SUGERENCIA DE SEGUNDO CORE
  Tras shift, mensaje calmado: "¿Quieres ver otro? Lleva 24h dejar respirar al primero."
  Si insiste: rate limit visible "Solo 1 Core por dia. Vuelve manana."
  Si acepta esperar: "Te avisaremos manana." -> setea notificacion T+24h.
  Estado emocional: respeto + anticipacion saludable.

PASO 8 - SEGUNDO DIA, SEGUNDO CORE
  Notificacion: "Hoy puedes descubrir Gobekli Tepe. 12.000 anos antes de la rueda."
  Click -> /core/wd-Q1090052.
  Mismo flow: narrativa -> resonancia -> shift card.
  Tras 2 Cores: aparece por primera vez el Personal Graph (un solo nodo iluminado).

PASO 9 - QUINTO DIA, QUINTO CORE
  Notificacion: "Has tocado 5 de los 7 pilares humanos. Galapagos te espera."
  Tras consumir: Personal Graph muestra 5 nodos. Comparacion visual con los 7 totales.
  Mensaje en Mi Mundo: "Empiezas a tener Discovery DNA. Te faltan 2 pilares."

PASO 10 - SEPTIMO DIA, HUMANITY CORE COMPLETADO
  Notificacion: "Has completado el Humanity Core. 7/7 pilares humanos."
  Pantalla especial: tu Personal Graph completo en pantalla completa.
  Mensaje: "Has empezado tu Discovery DNA. Te abrimos los Tier Omega."
  No celebracion confeti. Solo el grafo + la frase + boton "Ver Omega".
  Estado emocional: madurez + apertura a profundidad.
```

### 1.2 Lo que NO pasa en esta semana

- No notificaciones diarias agresivas.
- No XP visible.
- No racha (streak).
- No leaderboard.
- No comparacion social ("3 amigos vieron esto").
- No medallas.
- No upsell premium.
- No popups.

### 1.3 Estado emocional macro

```
Dia 1: curiosidad
Dia 2: anticipacion
Dia 3-4: rutina contemplativa
Dia 5: orgullo silencioso
Dia 7: pertenencia
Dia 7+: profundidad voluntaria
```

---

## BLOQUE 2 -- HOME FEED V2

### 2.1 Que ve el usuario al abrir KUDOS

**Jerarquia visual estricta** (de arriba a abajo):

1. **CORE DEL DIA** -- tarjeta grande, hero image, hook visible, 1 sola accion ("Descubrir hoy"). Ocupa primera mitad de pantalla.

2. **HUMAN QUESTION** -- pregunta del dia que conecta con el Core. Ejemplo (dia Olduvai): "¿Compartiste planeta con otra especie humana?" Tipografia serif grande, sin imagen, fondo plano.

3. **YOUR THREAD** -- continuacion del journey personal. Si el usuario ya completo 3 Cores, aqui aparece "Te falta Apollo 11 para completar exploracion".

4. **DISCOVERY CHAIN** -- 3 POIs vinculados al ultimo Core consumido. Subtitulo: "Donde lleva esto."

5. **EXPLORATION PROMPT** -- pregunta abierta opcional: "¿Que pilar humano quieres profundizar hoy?" 7 chips (Origen, Significado, Belleza, etc).

6. **CAPSULAS RECIENTES** -- abajo del fold. Para usuarios que quieren mas. No es lo primero que ven.

### 2.2 Lo que NO esta en Home

- Carrusel infinito tipo TikTok
- "Para ti" algoritmico sin transparencia
- Notificaciones de actividad social
- Anuncios
- Cualquier card que dijera "trending now"
- Cualquier card que dijera "popular"

### 2.3 Frecuencia de cambio

- CORE DEL DIA cambia cada 24h, alternando los 7 Core en orden semanal.
- HUMAN QUESTION cambia cada 24h, alineada con el Core.
- YOUR THREAD se actualiza tras cada exposicion del usuario.
- DISCOVERY CHAIN se actualiza tras cada exposicion.
- EXPLORATION PROMPT solo si el usuario lleva >7 dias sin abrir un pilar concreto.

### 2.4 Microcopy lider

En lugar de "Bienvenido de vuelta", el saludo cambia segun progreso DNA:
- Usuario nuevo: "Hola. Hoy empieza algo."
- Usuario con 1-2 Cores: "Continuamos."
- Usuario con 5+ Cores: "Tu mundo crece."
- Usuario con DNA completo: "Hoy hay nuevo Omega."

---

## BLOQUE 3 -- MAP V2

### 3.1 Visualizacion por niveles de zoom

```
ZOOM PLANETARIO  (mundo entero)
  Solo visible: 7 Humanity Core con badge dorado luminoso
  Texto: nombre del lugar + pilar humano (en serif)

ZOOM CONTINENTAL (un continente)
  Visible: Core + 12 Tier Omega (badge plata)
  Texto: nombre + categoria

ZOOM PAIS
  Visible: Core + Omega + 50 Tier S
  Texto: nombre + pais

ZOOM REGION
  Visible: anteriores + Tier A relevantes
  Texto: nombre

ZOOM CIUDAD
  Visible: todo lo anterior + Tier B/C cercanos
  Filtros activos: por pilar, por epoca, por categoria
```

### 3.2 Que aparece al tocar

| Tipo | Tap = | Tap doble = |
|---|---|---|
| Humanity Core | DISCOVERY SHIFT CARD (full screen, narrativa abierta) | Personal Graph del usuario + estado del pilar |
| Tier Omega | Card breve + WHY IT MATTERS expandible | Lista narrativas del POI |
| Tier S | Card pequena con hook + thumb | Pagina POI completa |
| Tier A | Pin con info minima | Pagina POI breve |
| Tier B/C | Solo punto, sin card | Info basica |

### 3.3 Progreso humano sin destruir elegancia

**SOLUCION**: los nodos Core que el usuario ya consumio cambian de dorado solido a dorado con sutil aro interior verde. Sin numeros. Sin porcentajes. Sin texto explicito de progreso. El cambio visual es discreto: solo lo nota el usuario que lo busca.

Los Tier S/A que el usuario completo tienen un punto verde de 2 pixeles en el borde. Invisible salvo zoom maximo.

### 3.4 Modo "Ventana abierta"

Boton flotante "EXPLORAR FUERA": cuando el usuario lo toca, el mapa salta a un POI aleatorio fuera de su primary_interest. Frase: "Manana KUDOS te recomienda esto." Anti camara de eco.

---

## BLOQUE 4 -- POI NODE V2

### 4.1 Estructura del POI completo (vista scrolleable)

```
[HERO IMAGEN FULL WIDTH]
  + nombre POI serif gigante
  + pais + categoria pequenos
  + chip dorado si es Core / plata Omega / blanco S

[SECCION 1 - INFORMACION]
  3-4 datos clave en card compacta
  ejemplo Olduvai:
    "1.75 millones de anos"
    "Tanzania"
    "Patrimonio Unesco desde 1979"
    "Descubierto por Mary Leakey, 1959"

[SECCION 2 - HISTORIA]
  Narrativa breve (tipo Hidden Truth o Human Story)
  ~200 palabras
  formato texto sin imagenes
  sirve como "encuadre" antes del WHY IT MATTERS

[SECCION 3 - WHY IT MATTERS] (corazon)
  Narrativa completa con los 5 bloques (Hook, Escena, Magnitud, Contrafactual, Cierre)
  Tipografia serif elegante
  Sin imagenes en medio (no distrae)
  Solo texto + ritmo + silencios

[SECCION 4 - DISCOVERY SHIFT CARD]
  El componente nuevo (ver Bloque 5)
  BEFORE -> DISCOVERY -> AFTER
  Pregunta: "¿Esto me ha pasado a mi?"

[SECCION 5 - RELATED HUMANITY]
  3 POIs conectados (geografico, tematico, historico)
  Card horizontal scrollable
  Hint: "Donde te lleva esto"

[SECCION 6 - ACTION POTENTIAL]
  Caja al final con verbo concreto
  ejemplo Apollo: "Esta noche mira la luna. Hay 12 huellas alli arriba."
  Boton opcional: "Marcalo si lo haces" (registra accion declarada)
```

### 4.2 Comportamiento del scroll

- Scroll suave con triggers de analytics por seccion (mide hasta donde llega el usuario).
- No autoplay de capsula video (decision deliberada · video se invoca con click).
- Lectura time tracking (para HDI).
- Si el usuario llega al final: aparece pregunta "¿Te ha movido?" (start del Discovery Shift completo).

### 4.3 Densidad

Una sola idea por seccion. Cero distracciones visuales en SECCIONES 3 y 4 (las criticas). Todas las imagenes y CTAs estan antes (1, 2) o despues (5, 6).

---

## BLOQUE 5 -- DISCOVERY SHIFT CARD

### 5.1 El componente

Card central del producto. Aparece tras lectura completa de WHY IT MATTERS o al final del POI. Tambien standalone en Mi Mundo (historial de shifts vividos).

### 5.2 Estructura visual

```
+-------------------------------------------------+
|                                                 |
|  ANTES                                          |
|  ----                                           |
|  "Soy una creacion aparte. Los humanos somos    |
|  distintos esencialmente del resto de animales."|
|                                                 |
|         |                                       |
|         | (linea vertical sutil, no flecha)    |
|         v                                       |
|                                                 |
|  DESCUBRIMIENTO                                 |
|  -------------                                  |
|  En Olduvai coexistieron multiples especies     |
|  de homo. Una sobrevivio por suerte.            |
|                                                 |
|         |                                       |
|         v                                       |
|                                                 |
|  AHORA PUEDES PENSAR                            |
|  -------------------                            |
|  "Soy primate evolucionado. Uno de los muchos   |
|  que pudieron ser. La separacion humano/animal  |
|  es de grado, no de naturaleza."                |
|                                                 |
|  ---------------------------------------------- |
|                                                 |
|  PREGUNTA SUAVE: "¿Te ha pasado esto?"          |
|  [ Si ]  [ Aun no se ]  [ No realmente ]        |
|                                                 |
+-------------------------------------------------+
```

### 5.3 Microcopy critico

- NO dice "Tu antes" / "Tu despues" (impositivo).
- SI dice "Antes / Ahora puedes pensar" (sugerente).
- NO dice "Has crecido" (paternalista).
- SI dice "Eso es una posibilidad nueva para ti" (humilde).
- NO botones tipo "Suscribete a la transformacion".
- SI texto cierre tipo "Esto lleva tiempo. Volveremos a preguntarte en una semana."

### 5.4 Animaciones

- Fade-in escalonado: ANTES aparece. Pausa 1.5s. DESCUBRIMIENTO. Pausa 1.5s. AHORA.
- La linea vertical entre bloques se dibuja despacio (1.2s).
- Cuando el usuario contesta la pregunta, no hay confeti, solo el card se cierra suave con mensaje "Anotado. Te preguntamos de nuevo en 7 dias."

### 5.5 Cuando aparece

- Al final de lectura WHY IT MATTERS Core (siempre).
- En Mi Mundo, los shifts vividos pueden revisitarse cualquier momento.
- A los 7 dias post-exposicion, notificacion privada "¿Sigue cambiando algo para ti?"

### 5.6 Cuando NO aparece

- Nunca pop-up sin contexto.
- Nunca durante navegacion exploratoria del mapa.
- Nunca en notificaciones push.
- Nunca en email marketing.

### 5.7 Frecuencia maxima

Maximo 1 Shift Card por dia por usuario, incluso si consume varios POIs. Forzar pausa cognitiva.

---

## BLOQUE 6 -- PERSONAL TRANSFORMATION GRAPH (Mi Mundo V2)

### 6.1 La pantalla principal de Mi Mundo cambia

Antes: lista de POIs guardados con metricas (count, fecha).
Despues: tu mapa cognitivo de 7 pilares humanos.

### 6.2 Visualizacion

```
                 ORIGEN
              (Olduvai · 1 Core)
                       *
                       |
            SIGNIFICADO  BELLEZA
            (0 Cores)     *
                          |
   CREENCIA      [usuario]      CONOCIMIENTO
   (0)                           (Galapagos · 1 Core)
                       |             *
                       |
              EXPLORACION   MEMORIA
                  *
              (Apollo · 1)
```

Visualizado como constelacion radial. Los pilares iluminan en distintos grados.

### 6.3 Como se representan los nodos

- **Apagado**: 0 exposiciones (color grafito tenue).
- **Encendido tenue**: 1 exposicion Core o Omega.
- **Encendido medio**: 2+ exposiciones con TS_real >= 50 promedio.
- **Encendido brillante**: 3+ exposiciones con TS_real >= 70 promedio + revisitas.

Sin numeros. Sin barras de progreso. Solo luminosidad.

### 6.4 Como crecen

- Una exposicion Core con TS_real alto suma mas que 5 exposiciones Tier B.
- El crecimiento no es lineal. Una segunda exposicion en el mismo pilar suma menos que la primera (rendimiento decreciente).

### 6.5 Como decaen

- 5% de luminosidad perdida por mes sin reactivacion.
- A los 6 meses sin tocar un pilar, vuelve a tenue.
- Esto NO se castiga al usuario. Se le sugiere: "Hace meses que no exploras Belleza. ¿Quieres volver?"

### 6.6 Microcopy

En la parte inferior aparece UNA frase contextual:
- Usuario equilibrado: "Estas explorando con amplitud."
- Usuario con un pilar dominante: "Profundizas en X. Quizas Y te invite."
- Usuario con DNA completo: "Has tocado los 7 pilares. Aqui empieza la profundidad."
- Usuario que decae: "Hace tiempo que no abres una historia nueva. Te esperan."

### 6.7 Lo que NO esta

- Total puntos.
- Ranking comparativo.
- Recommendation algoritmica obvia.
- Reels de actividad reciente social.

### 6.8 Privacidad

Personal Graph es **privado por defecto**. Solo el usuario lo ve.
Opcion futura: "Compartir mi mapa de descubrimiento" -> share image generada server-side, sin datos sensibles.

---

## BLOQUE 7 -- HDI (Human Depth Index)

### 7.1 Definicion

> **HDI(user)** mide la **profundidad acumulada de exploracion humana** del usuario.
> Es individual, no comparativo. No es competencia.

```
HDI = (
    pillar_coverage * 0.30        (de 0 a 7 pilares tocados / 7)
  + transformation_density * 0.30 (TS_real promedio de Cores consumidos)
  + revisit_loyalty * 0.20        (% revisitas voluntarias / exposiciones totales)
  + reflection_depth * 0.20       (% reflexiones escritas / shifts ofrecidos)
) * 100  ->  [0..100]
```

### 7.2 Variables

| Variable | Como se calcula |
|---|---|
| pillar_coverage | numero distintos pilares con al menos 1 Core/Omega consumido |
| transformation_density | media de TS_real de los Cores consumidos en 90 dias |
| revisit_loyalty | revisitas voluntarias (return_visit_to_poi) / total exposiciones Core+Omega |
| reflection_depth | reflexiones escritas / Shift Cards mostrados |

### 7.3 Escala humana (no videojuego)

NO usar:
- nivel 1-100 visible
- "Has subido a HDI 47"
- barras de progreso
- gauges circulares

SI usar:
- 5 etiquetas cualitativas que aparecen MUY discretamente en Mi Mundo:
  - **Visitante** (HDI 0-20): "Empiezas a mirar."
  - **Explorador** (HDI 21-40): "Empiezas a profundizar."
  - **Buscador** (HDI 41-60): "Empiezas a conectar."
  - **Cartografo** (HDI 61-80): "Empiezas a mapear tu mundo humano."
  - **Discipulo** (HDI 81+): "Has empezado a habitar la pregunta."

Sin numeros visibles. Sin "tu HDI es X". Solo etiqueta + frase.

### 7.4 Que desbloquea HDI

- HDI 21+: aparece la pestana "Tu mapa cognitivo" en Mi Mundo.
- HDI 41+: KUDOS sugiere reflexiones cruzadas entre pilares.
- HDI 61+: acceso anticipado a Tier Omega antes de su publicacion general.
- HDI 81+: invitacion editorial (escribir reflexiones que otros usuarios puedan leer, con curacion humana).

Sin tier mecanico de "premium". Solo profundizacion del contenido editorial disponible.

### 7.5 Privacidad HDI

HDI es **privado por defecto**, como Personal Graph. No comparable, no ranking, no leaderboard.

---

## BLOQUE 8 -- DTI (Discovery Transformation Index)

### 8.1 ¿DTI es metrica publica o interna?

**DTI es metrica EXCLUSIVAMENTE INTERNA.**

Razones:

1. **DTI es agregada, no individual**. Mide % de usuarios que transforman. No tiene sentido mostrarlo a un usuario individual.
2. **DTI invita a la gamificacion si se expone**. Si un usuario sabe que "DTI bajo" KUDOS lo presionara para transformarse, la metrica se contamina.
3. **DTI es metrica de producto, no de usuario**. La usa Eduardo, GPT-5, comite editorial. La consulta el equipo Director. No el publico.
4. **Honestidad metodologica**: mostrar al usuario "te has transformado X%" seria ridiculo y deshonesto. La transformacion no se cuantifica al individuo.

### 8.2 Donde vive DTI

- Dashboard interno /admin/dashboard (acceso restringido).
- Reporte mensual a Eduardo + GPT-5.
- Slack/email weekly de comite editorial.
- NUNCA en producto cara al usuario.

### 8.3 Como se calcula

(ya definido en T2.8 seccion 8)

```
DTI(period) = (users with >= 3 distinct transformation_signals within 30d)
              / (users with >= 1 Core exposure) * 100
```

### 8.4 Que NO hace DTI

- No determina precio.
- No determina tier de pago.
- No determina contenido visible.
- No genera notificacion al usuario.
- No aparece en UI.

DTI es brujula editorial. Y solo eso.

---

## BLOQUE 9 -- DISCOVERY DNA (experiencia visual)

### 9.1 Como aparece

Discovery DNA aparece la primera vez que el usuario cumple los 5 requisitos minimos (Bloque T2.8 seccion 6). NO antes. NO se anuncia como objetivo.

Aparicion: mensaje silencioso en Mi Mundo, una sola vez:

```
+-----------------------------------------------+
|                                               |
|  Algo ha cambiado en tu mapa.                 |
|                                               |
|  Has empezado a construir tu Discovery DNA.   |
|                                               |
|  Quiere decir que:                            |
|                                               |
|  - Has tocado 5 pilares humanos               |
|  - Has profundizado en al menos 2 Cores       |
|  - Has vuelto a un lugar una semana despues   |
|  - Has compartido con tus palabras            |
|  - Has seguido un hilo de POIs encadenados    |
|                                               |
|  No es un logro. Es una constatacion.         |
|                                               |
|  Cierra.                                      |
|                                               |
+-----------------------------------------------+
```

### 9.2 Que comunica

- No te hemos premiado. Has hecho algo.
- No has ganado nada material. Has construido algo cognitivo.
- No te invitamos a hacer mas. Te invitamos a profundizar lo que ya hiciste.

### 9.3 Que NO comunica

- "Has subido de nivel".
- "Eres especial".
- "Tu DNA es mejor que el de otros".
- "Comparte tu DNA en redes sociales".

### 9.4 Que desbloquea

- Acceso anticipado a Tier Omega.
- Pestana nueva en Mi Mundo: "Profundizar" (Cores + Omegas combinables por pilar).
- Email opcional mensual del comite editorial.

Sin tier premium. Sin paywall. Sin urgencia.

### 9.5 Que pasa si el usuario nunca llega a Discovery DNA

Nada negativo. KUDOS sigue siendo util y bonito. El Discovery DNA es **opcion**, no destino. La mayoria de usuarios no lo construyen. Eso es saludable.

---

## BLOQUE 10 -- SHARE CAPSULE V2

### 10.1 Que comparte realmente un usuario

**Opcion elegida: el usuario comparte UNA REFLEXION CONECTADA A UN POI.**

No comparte un POI (eso seria "te recomiendo Olduvai", marketing).
No comparte un capsule (eso seria "mira este video").
No comparte un shift (demasiado intimo).
Comparte una idea propia atribuida a un POI.

### 10.2 Estructura del compartido

```
+-----------------------------------------------+
|  [foto del POI]                               |
|                                               |
|  "Antes pensaba que la civilizacion           |
|  era hija del hambre. Olduvai me ha           |
|  hecho ver que es hija del rito."             |
|                                               |
|  -- Eduardo, descubriendo en KUDOS            |
|                                               |
|  https://kudos.world/c/olduvai                |
+-----------------------------------------------+
```

El share es **lenguaje del usuario** + **atribucion al POI**. NO marketing automatico. NO frase generica de la app.

### 10.3 Como se construye

Tras consumir un Core, el usuario puede:
1. Escribir reflexion libre.
2. Pulsar "Compartir reflexion".
3. KUDOS genera tarjeta con foto POI + reflexion + atribucion + URL corta.
4. Comparte como image card en redes o como link.

### 10.4 Que NO se permite

- Compartir sin reflexion personal (no se puede compartir un POI vacio).
- Compartir capsules como recomendacion comercial.
- Compartir tu Personal Graph publicamente (privacidad).

### 10.5 Por que esta decision

Compartir reflexiones eleva la voz del usuario. Compartir POIs eleva la voz de KUDOS. El producto crece cuando los usuarios sienten que su pensamiento se amplifica, no cuando la app se amplifica.

---

## BLOQUE 11 -- NOTIFICACIONES

### 11.1 Notificaciones que existen (las unicas)

1. **CORE DEL DIA** -- 1 vez al dia, hora elegida por el usuario (default 09:00 local).
2. **SHIFT REVISIT** -- 7 dias despues de exposicion a Core, pregunta "¿Sigue cambiando algo para ti?"
3. **RECONNECTION** -- si el usuario lleva 14 dias sin abrir KUDOS: "Hay algo que descubrir hoy."
4. **DNA UNLOCKED** -- una sola vez, cuando completa Discovery DNA.
5. **NEW OMEGA AVAILABLE** -- mensual, si hay nuevo Tier Omega editorial.

Total maximo: 4-5 notificaciones por mes.

### 11.2 Notificaciones eliminadas

- "Nueva capsula disponible".
- "Tu amigo descubrio Olduvai".
- "Llevas 3 dias sin abrir KUDOS" (reemplazado por RECONNECTION suave).
- "Completa tu perfil".
- "Promocion premium".
- Cualquier dopamina engagement-driven.

### 11.3 Notificaciones que jamas existiran

- Streak (rachas).
- "Te perderas algo si no entras".
- Comparacion social ("X usuarios estan descubriendo Y ahora").
- Push agresivo a horarios de alta interrupcion (madrugada / horario laboral).
- Sound/badge spam.

### 11.4 Tono de las notificaciones

NO usar:
- "Imperdible!"
- "No te lo pierdas!"
- "ULTIMO DIA!"
- Emojis llamativos.

SI usar:
- "Hoy puedes descubrir [X]."
- "[POI] te espera cuando quieras."
- "Una pregunta para ti: [...]"

Voz: calma, respetuosa, sin urgencia artificial.

### 11.5 Off por defecto en moviles

Las notificaciones push estan **off por defecto**. KUDOS pregunta solo tras 7 dias de uso si el usuario quiere activarlas. Pregunta solo UNA vez. Si dice no, no vuelve a preguntar.

---

## BLOQUE 12 -- METRICAS

### 12.1 North Star Metric definitiva

# DTI -- DISCOVERY TRANSFORMATION INDEX

% usuarios con >= 3 senales transformacion en 30d post-Core.

Target: 40% sostenido a 12 meses.

### 12.2 Jerarquia completa

```
NIVEL 1 -- NORTH STAR
  DTI

NIVEL 2 -- METRICAS PRIMARIAS (revisadas semanalmente)
  HDI promedio usuarios activos
  MRP (Memory Retention Probability) promedio Core/Omega
  DRR (Discovery Resonance Rate) promedio Core/Omega
  DNA completion rate (% usuarios activos con Discovery DNA)
  Pillar balance index (% usuarios tocando >= 5 pilares)

NIVEL 3 -- METRICAS DE PRODUCTO (revisadas mensualmente)
  Daily Active Users (DAU)
  Weekly Active Users (WAU)
  Monthly Active Users (MAU)
  Average session duration (cuidado: ver seccion 12.4)
  Retention 7/30/90 dias
  Auth conversion rate (anon -> registered)
  Cores completados por usuario activo
  Share rate (reflexiones compartidas / Cores expuestos)

NIVEL 4 -- METRICAS DE CONTENIDO (revisadas por equipo editorial)
  NQS promedio por narrativa
  Cores con DRR debajo de threshold (a revisar)
  Revisit rate por POI (top 10, bottom 10)
  Reflection submission rate por POI
  Action declared rate por POI
```

### 12.3 Metricas que se eliminan

- **Likes** (no existen y no existiran).
- **Followers/Following** (KUDOS no es red social).
- **Time spent total** (no es metrica de exito, ver 12.4).
- **Capsules played** sola (sin transformacion derivada, vacia).
- **Pageviews** (vanidad).

### 12.4 Metricas peligrosas

| Metrica | Por que peligrosa | Cuando usar |
|---|---|---|
| **Session duration** | mas tiempo NO es mejor. Optimizar tiempo crea adiccion. | Usar como proxy de profundidad solo si DTI sube en paralelo. |
| **DAU** | inflar DAU con notificaciones agresivas destruye trust. | Usar como salud minima, NO como objetivo de crecimiento. |
| **Share count** | shares pueden ser compulsivos o reflexivos. Solo lo segundo vale. | Solo "reflective_shares" cuentan (con mensaje personal). |
| **MRR/Revenue** | si KUDOS se vuelve mercenario, pierde alma editorial. | Diferir monetizacion hasta DTI demostrado. |

### 12.5 Metricas vanidosas (a ignorar publicamente)

- Numero de POIs en el sistema.
- Numero de paises cubiertos.
- Numero de descargas.
- Numero de capsules video.

Importan solo si correlacionan con DTI. Si no, son ruido para inversor pero no para producto.

---

## BLOQUE 13 -- RIESGOS

### 13.1 Falsa profundidad

**Riesgo**: usuario consume rapido y se siente "transformado" sin estarlo.
**Mitigacion**: rate limit 1 Core/dia + Shift Card aparece solo tras 24h + verificacion DTI requiere senales en 30d (no inmediatas).

### 13.2 Elitismo cultural

**Riesgo**: KUDOS se vuelve para "personas cultas", excluyendo audiencia masiva.
**Mitigacion**: lenguaje claro siempre (no academico) + traducciones futuras + Core elegidos por universalidad (Olduvai, Apollo, Hiroshima son comprensibles globalmente sin contexto cultural previo).

### 13.3 Fatiga cognitiva

**Riesgo**: 7 Cores en 7 dias agotan al usuario.
**Mitigacion**: ritmo opcional (puede pausar) + duracion lectura limitada (no >75s) + no obligatoriedad (sin rachas).

### 13.4 Complejidad excesiva

**Riesgo**: muchas capas (Core/Omega/S/A + DNA + Graph + HDI + DTI) confunden al usuario.
**Mitigacion**: usuario solo VE Core inicialmente. Omega/S/A solo aparecen tras DNA desbloqueado. HDI y DTI nunca aparecen.

### 13.5 Religion implicita

**Riesgo**: el lenguaje "transformacion" + "Humanity Core" + "Discovery DNA" puede sonar a culto.
**Mitigacion**: tono SIEMPRE laico, academico cuando aplica, humilde cuando no. Eliminar cualquier copy mistico. Revisar editorial mensual.

### 13.6 Manipulacion emocional

**Riesgo**: narrativas Hiroshima/Auschwitz pueden manipular emocionalmente.
**Mitigacion**: revision humana doble en narrativas sensibles + fuentes academicas visibles + opcion "saltar narrativas dolorosas" en preferencias usuario.

### 13.7 Metricas imposibles

**Riesgo**: DTI requiere medir "transformacion humana", lo cual nunca sera 100% medible.
**Mitigacion**: aceptacion explicita de que medimos PROXY conductual, no transformacion real interna. Honestidad metodologica en comunicacion publica.

### 13.8 Mas riesgo no explicito en prompt: extraccion editorial

**Riesgo**: contenido KUDOS replicado por LLM externos sin permiso, diluyendo defensibilidad.
**Mitigacion**: copyright editorial + watermark en narrativas Tier Omega/Core + estrategia legal anti-scraping (T4 futuro).

---

## BLOQUE 14 -- MVP REAL

Roadmap brutal y honesto.

### MVP -- TO LAUNCH NOW (3-4 semanas)

| Componente | Cobertura |
|---|---|
| 7 Cores narrativos publicados (de T2.7) | Si |
| 7 Discovery Shift Cards (datos de T2.8 seccion 3) | Si |
| 7 Cores con WHY IT MATTERS visible en POI Node | Si |
| Map V2 con badge dorado en Cores | Si |
| Home Feed V2 con CORE DEL DIA + HUMAN QUESTION | Si |
| Mi Mundo V2 con Personal Graph 7 pilares (basico) | Si |
| Auth Google OAuth (ya implementado T1.3) | Si |
| Backend DTI tracking (signals 1-3 de los 10) | Si |
| Notificaciones: solo CORE DEL DIA + SHIFT REVISIT | Si |
| Share V2 con reflexion personal | Si |

**Esfuerzo**: 4 semanas backend + frontend + contenido + revision editorial.
**Coste contenido**: ya hecho (T2.7).
**Coste tecnico**: bajo (mayoria de piezas existen, solo orquestar).

### V1 -- POST-LAUNCH 3 MESES

| Componente |
|---|
| Discovery DNA visible en Mi Mundo (despues de 5 Cores) |
| HDI calculo + etiqueta cualitativa |
| DTI dashboard interno funcional |
| Notificaciones: anadir RECONNECTION + DNA UNLOCKED |
| Reflection submission feature (escribir reflexion en POI) |
| Tier Omega narrativas (12) escritas + publicadas |

### V2 -- POST-LAUNCH 6 MESES

| Componente |
|---|
| Tier S narrativas completas (50) con NQS >= 80 |
| Conversation_reported feature (registrar conversacion derivada) |
| Editorial governance charter publico |
| Modo "Ventana abierta" anti camara de eco |
| HDI desbloquea Tier Omega anticipado |

### V3 -- POST-LAUNCH 12 MESES

| Componente |
|---|
| Tier A 250 POIs cubiertos |
| Comunidad editorial: usuarios HDI >80 pueden escribir reflexiones curadas |
| API publica (Tier S/A) bajo terminos editoriales |
| Multi-idioma (EN + FR + JA + AR + PT minimo) |
| Education partnerships (escuelas/universidades) |

### Lo que se difiere mas alla de V3

- Generacion video capsules pipeline avanzado.
- IA conversacional KUDOS Mind avanzada.
- Monetizacion premium tier.
- Mobile native apps (iOS + Android).
- AR / VR experiencias.

Sin idealismo. Sin "todo en MVP". Solo lo que produce DTI medible YA.

---

## BLOQUE 15 -- VEREDICTO FINAL

Pregunta: si implementamos exactamente este diseno, ¿KUDOS se acerca realmente a una plataforma capaz de aspirar a 1B usuarios?

### Como FUNDADOR
Si. Pero no por escala viral. Por **defensibilidad editorial unica**. 1B no llega por TikTok-style growth. Llega por convertirse en infraestructura cultural global durante 10-15 anos. Es marathon, no sprint.

### Como CTO
Si, **tecnicamente factible**. La arquitectura T1.x soporta escala 10M usuarios sin rediseno mayor. De 10M a 1B requerira pgvector, sharding, CDN, locale infrastructure -- pero son problemas estandar de escala, no de diseno fundamental.

### Como INVERSOR
Si, pero **horizon largo** (5-10 anos a ROI). Modelo de negocio aun no claro (subscription? educational license? sin ads?). Riesgo principal: monetizar destruye alma editorial. Pero si KUDOS demuestra DTI >= 40% en primer ano, multiples vias monetizacion legitimas se abren.

### Como USUARIO
Si, si KUDOS cumple la promesa narrativa. **El usuario no busca 1B usuarios**, busca sentirse menos solo en su pregunta sobre que significa ser humano. Si KUDOS le da eso, vuelve. Si vuelve, comparte. Si comparte, KUDOS crece.

### Como HISTORIADOR
**Posiblemente si**. Si dentro de 50 anos un investigador estudia "¿como aprendio la generacion 2030 a entender la humanidad?", KUDOS puede aparecer en esa respuesta. No como app cultural. Como sistema editorial canonico de su epoca. Eso es escala historica, no comercial.

### Como SER HUMANO
Si. Porque el mundo necesita herramientas para entender lo que somos. Hoy esas herramientas son escasas, dispersas, academicas o decadentes (redes sociales). Un sistema que conecte a un usuario en Buenos Aires con la misma claridad que a uno en Tokyo o Lagos sobre por que Olduvai importa, no existe. Si KUDOS lo construye con rigor y humildad, **es servicio civilizacional**. Y los servicios civilizacionales escalan a 1B.

### Sintesis brutal honesta

**KUDOS PUEDE aspirar a 1B usuarios si:**
1. Mantiene el rigor editorial sin compromisos (no diluir Core por viralidad).
2. Mide DTI honestamente (no optimizar metricas de vanidad).
3. Resiste la tentacion de gamificar (no convertirse en Duolingo cultural).
4. Acepta el horizon de 10-15 anos (no buscar exit rapido).
5. Construye gobernanza editorial transparente (no replicar errores Wikipedia y Facebook).

**KUDOS NO llegara a 1B usuarios si:**
1. Se vuelve agresivo en growth (notifications, FOMO, gamificacion).
2. Cede contenido editorial a AI sin curacion humana.
3. Monetiza con ads (destruye trust).
4. Comparte datos usuario sin consentimiento.
5. Pierde el lenguaje "ofrecemos oportunidades de transformacion" y lo reemplaza por "te transformamos".

### Mi posicion como CTO

Aspirar a 1B usuarios es legitimo. **Llegar a 100M ya seria victoria civilizacional**. Llegar a 10M seria producto exitoso. Llegar a 1M demuestra concept-product fit.

Optimicemos para 1M en 24 meses. Si lo logramos honestamente, los 10M-100M llegan despues. Y 1B es horizon, no objetivo.

---

## SINTESIS EJECUTIVA

**El producto KUDOS ejecutable que sale de este documento es**:

- **Home V2** con CORE DEL DIA + HUMAN QUESTION + DISCOVERY CHAIN
- **Map V2** con 4 tiers visualmente jerarquizados (Core dorado, Omega plata, S blanco, A pin)
- **POI Node V2** con 6 secciones (Info, Historia, WHY, Shift Card, Related, Action)
- **Discovery Shift Card** como componente central (BEFORE -> DISCOVERY -> AHORA PUEDES)
- **Mi Mundo V2** con Personal Graph radial de 7 pilares
- **Discovery DNA** como constatacion silenciosa (no logro)
- **HDI** privado con 5 etiquetas cualitativas (Visitante -> Discipulo)
- **DTI** exclusivamente interno (no expuesto al usuario)
- **Share V2** centrado en reflexion personal (no en capsula)
- **Notificaciones** maximo 4-5 al mes, voz calmada
- **Metricas**: DTI como North Star, sin ads, sin gamificacion

**Esfuerzo MVP**: 3-4 semanas.
**Coste contenido**: ya hecho (T2.7).
**Bloqueador real**: ejecucion editorial impecable + disciplina anti-engagement-bait.

### Status oficial

# T3.1 DISCOVERY SHIFT IMPLEMENTATION DESIGN COMPLETED

Listo para revision CEO + GPT-5 + emision PROMPT 16/16 (probablemente: plan de ejecucion definitivo).

---

## FIRMA

Claude Cowork CTO -- T3.1 diseno producto segun PROMPT 15/16.
0 codigo · 0 commits · 1 sistema de producto completo + 3 correcciones GPT-5 oficializadas.
15 bloques de diseno: journey, home, map, POI, shift card, graph, HDI, DTI, DNA, share, notifs, metricas, riesgos, MVP, veredicto.
Listo para emision PROMPT 16/16 final.
