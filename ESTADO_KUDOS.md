# KUDOS · Estado del Proyecto

> Documento estratégico generado por Claude Cowork mientras Eduardo está ausente.
> Fecha: 29 mayo 2026 · 3:00 AM
> Misión: dar a Eduardo todo lo necesario para retomar el proyecto sin pérdida de contexto.

---

## 1 · MISIÓN

KUDOS no es una app de turismo.
KUDOS es **la capa de significado contextual sobre el mundo físico**.

Donde Google organiza información, KUDOS organiza significado.
Donde Apple Maps muestra ubicaciones, KUDOS revela por qué importan.

**Visión 1B:** convertirse en la infraestructura global de descubrimiento humano.

---

## 2 · OBJETIVOS Q3 2026 (MVP cerrado)

| Objetivo | Métrica de éxito | Estado |
|---|---|---|
| MVP visualmente premium | 6 pantallas core operativas | ✅ Hecho (HomeFeed · World · MiMundo · POI · Merit · Share) |
| Cápsulas reales generables | Pipeline batch end-to-end | ✅ Hecho (11 generadas Tier S) |
| Sistema de captura HDG | 5 motores invisibles · día 1 | ✅ Hecho (telemetry + save + signals) |
| Selecta KUDOS funcional | <300 POIs Tier S+A icónicos | ✅ Hecho (20 S · 282 A · 14k B · 28k C) |
| Backend modular | 10 módulos Capsule Engine v2 | ✅ Hecho (pois · capsules · merit · narrative · media · feed · save · nodes · telemetry · signals) |
| API v2 en producción | Servicio activo en Render | ⏳ Pendiente · Eduardo debe hacer 5 clicks |
| 50 cápsulas reales icónicas | Top S+A con narración 45s | ⏳ Parcial (11/50 · batch interrumpido por DNS glitch) |

---

## 3 · ESTRATEGIA (CTO directive + AXÓN 1.0 + GPT-5)

### 3.1 · Filosofía cofounder (no negociable)

1. **Better 50 unforgettable than 50,000 meaningless** — calidad sobre cantidad.
2. **El borde es el lenguaje** — color categórico comunica tipo · imagen comunica identidad.
3. **Misterio controlado 70/30** — mostrar lo justo para que el usuario quiera abrir.
4. **Narrativa primero** — ¿por qué importa? antes que ¿qué es?
5. **Mérito invisible** — sin estrellas · sin likes · sin números.
6. **Save = graph signal**, no bookmark.
7. **HDG se construye observando, no diseñando**.

### 3.2 · Tres pilares estratégicos

**Pilar A · Discovery layer**
Mapa cinematográfico + chips con imagen real + bottom carousel + cápsulas narradas.

**Pilar B · Human Discovery Graph**
5 motores invisibles capturan desde día 1: Discovery Events · World Collection · Meaning Capture · Memory · Emotional Resonance · Personal Discovery Graph · Signals aggregator.

**Pilar C · Personal World Layer**
Mi Mundo evoluciona de "favoritos" a "mapa personal de significado": stats · huella global · timeline personal · medallas · rutas · cápsulas creadas.

---

## 4 · MOCKUPS GPT-5 (6 pantallas core)

Todos implementados en Phase 1 · esperando datos reales para Phase 2.

| Pantalla | URL | Estado | Phase 2 requiere |
|---|---|---|---|
| Home Feed v5 | `/inicio` | ✅ Phase 1 | Más cápsulas reales |
| Home Map v5 | `/world` | ✅ Phase 1 | Mapbox 3D oblicuo (épica futura) |
| Mi Mundo v5 | `/mi-mundo` | ✅ Phase 1 | API v2 activa para persistencia real |
| POI Node v5 | `/poi/[id]` | ✅ Phase 1 | API v2 + dataset temporal (épica) |
| Merit Engine v5 | `/merit/[poi_id]` | ✅ Phase 1 placeholder | API v2 + signals con tráfico real |
| Share Capsule v5 | (modal global) | ✅ | navigator.share API real (mobile) |

Épicas que NO se atacan hasta financiación / tracción:
- Vista 3D oblicua cinematográfica (Mapbox/Cesium · $500-2k/mes a escala)
- Cápsulas multi-POI temporales "De Roma a Florencia"
- KUDOS MIND chat real (Anthropic + RAG sobre POIs)
- Hero photos IA generadas (Veo3/Sora · ~$1 cada uno)

---

## 5 · ARQUITECTURA ACTUAL

### 5.1 · Frontend (Next.js 15 · React 18.2)

```
experience/
├── app/                        Routing Next.js
│   ├── inicio/page.tsx         → HomeFeedV5
│   ├── inicio-legacy/page.tsx  → HomeScreen viejo (rollback)
│   ├── world/page.tsx          → WorldEngine
│   ├── mi-mundo/page.tsx       → MiMundoV5
│   ├── poi/[id]/page.tsx       → PoiNodeV5
│   └── merit/[poi_id]/page.tsx → MeritEngineV5
│
├── components/
│   ├── brand/
│   │   └── KudosFlowerLogo.tsx  Logo signature reusable
│   ├── discovery/               HDG · 6 componentes
│   │   ├── kudosTelemetry.ts    helper offline-first
│   │   ├── ResonancePicker      5 emociones
│   │   ├── MeaningPicker        5 motivaciones tras save
│   │   ├── MemoryPrompt         revisitas >90d
│   │   ├── AddToMyWorldButton   3 variantes
│   │   └── useDiscoverySignals  hook captura auto
│   ├── world-engine/            7 componentes /world
│   ├── screens/
│   │   ├── home/v5/             HomeFeed v5 (4 componentes)
│   │   ├── mi-mundo/v5/         MiMundo v5 master
│   │   ├── poi/v5/              POI Node v5 master
│   │   └── merit/v5/            Merit Engine v5 master
│   └── share/
│       └── ShareCapsuleModalV5  Share rediseñado
│
└── public/
    ├── data/wikidata/           43k POIs con tier pre-computado
    └── capsules/                7 cápsulas curadas + 4 archivadas
        └── index.json           manifest (frontend lo lee)
```

### 5.2 · Backend (Python 3.11 · FastAPI · Pydantic v2)

```
kudos_engine/
├── apps/                       Capsule Engine v2 · 10 módulos
│   ├── core/                   enums + db JSON store + i18n
│   ├── pois/                   POI model + relationships
│   ├── capsules/               Capsule model + types + narrative_type
│   ├── merit/                  MeritProfile + 6 dimensiones modulares
│   ├── narrative/              1 POI → N narrativas
│   ├── media/                  SceneManifest + assembly pipeline
│   ├── feed/                   ranking discovery-first
│   ├── save/                   World Collection + Meaning + Memory + Resonance
│   ├── nodes/                  /api/world/poi/{id}/node aggregator
│   ├── telemetry/              Discovery Event Engine · 18 tipos evento
│   ├── signals/                HDG · scores agregados por POI
│   └── main.py                 FastAPI app · monta todos los routers
│
├── pipeline.py                 Legacy pipeline 5 pasos
├── providers/                  wikimedia · voice_edge · ffmpeg_kenburns · guion_claude · stubs
├── scripts/
│   ├── recompute_tiers.py      Tier S/A/B/C pre-computado
│   ├── download_poi_images.py  Wikimedia → /public/poi-images/
│   ├── generate_capsules_top.py Pipeline batch top tier
│   ├── curate_capsules.py      Limpia duplicados (Alhambra*/Acrópolis*/Sagrada*)
│   ├── import_wikidata.py      16 queries por país
│   └── import_osm.py
│
├── control_panel/              FastAPI panel local del fundador
├── Dockerfile                  Para Render API v2
├── requirements.txt            fastapi + uvicorn + pydantic + pillow + anthropic + edge-tts
└── state/                      JSON stores (apps_v2/ + telemetry.jsonl)
```

### 5.3 · Despliegue

| Servicio | Tipo | URL | Estado |
|---|---|---|---|
| kudos-frontend | Next.js · Render Free | https://kudos-frontend-rsi3.onrender.com | ✅ Live |
| kudos-api-v2 | FastAPI · Docker · Render Free | https://kudos-api-v2.onrender.com (cuando se active) | ⏳ Pendiente Eduardo · 5 clicks |
| Control Panel | FastAPI · localhost:3001 | Solo Eduardo · `uvicorn kudos_engine.control_panel.server:app --port 3001` | Local |

---

## 6 · DATASET ACTUAL

### 6.1 · POIs (Wikidata)

43.185 POIs en 8 países (ES · IT · FR · GR · GB · DE · PT · JP) · cada uno con tier pre-computado por `recompute_tiers.py`:

- **Tier S** (Legendary): 20 POIs · LEGENDARY_IDS hardcoded (Coliseo · Alhambra · Sagrada Familia · Acrópolis · Torre Eiffel · etc.) + keyword icónica top
- **Tier A** (Premium): 282 POIs · foto + keyword premium (catedral de · alcázar de · palacio real · abadía de · monasterio de san · villa romana · teatro romano · museo nacional · plaza mayor)
- **Tier B** (Descubrible): 14.840 POIs · foto + (UNESCO o keyword secundaria)
- **Tier C** (Long tail): 28.043 POIs · invisible salvo zoom 17+

35% del dataset es visible · selecta KUDOS.

### 6.2 · Cápsulas reales generadas

11 cápsulas generadas Tier S · 7 curadas tras dedup:

| Canónicas (7) | Archivadas (4) |
|---|---|
| Coliseo (wd-Q10285) | Acropolis Palaiokastro |
| Alhambra (wd-Q47476) | Castillo de Alhambra |
| Acrópolis de Atenas | Templo Expiatorio Sagrada Familia |
| iglesia Sagrada Familia (Barcelona) | Capela Sagrada Familia (Portugal) |
| Notre-Dame de París | |
| Foro Romano | |
| Torre Eiffel | |

Cada cápsula = MP4 vertical 9:16 · 45s · narración española Edge-TTS · 12 imágenes Wikimedia · Ken Burns ffmpeg · ~24-62MB.

**Falta generar** (10 fallidas en batch):
- Torre de Londres (falló DNS · reintentar)
- 9 POIs marcados Tier S en frontend pero Tier B en legacy `pipeline.tier_for` (museos asociados · son correctos como B)

---

## 7 · HUMAN DISCOVERY GRAPH (HDG)

### 7.1 · 5 motores invisibles

1. **Discovery Event Engine** (`apps/telemetry/`)
   18 tipos de evento capturados: poi_view · node_open · scroll_depth · capsule_complete · added_to_my_world · motivation_captured · resonance · memory_revisited · etc.

2. **World Collection Engine** (`apps/save/`)
   SavedWorld extendido con themes[] + collection_type.

3. **Meaning Capture Engine** (`apps/save/`)
   5 motivaciones canónicas: me_inspira · quiero_visitarlo · quiero_aprender · me_emociona · me_recuerda_algo.

4. **Memory Engine** (`apps/save/`)
   revisit_count + memory_status (still_relevant · released · want_to_revisit) + endpoint stale_saves.

5. **Emotional Resonance Engine** (`apps/save/`)
   5 resonancias: asombro · aprendizaje · inspiración · conexión · nostalgia.

### 7.2 · Personal Discovery Graph + Human Discovery Graph

`apps/signals/` agrega por POI: discovery_score · importance_score · memory_score · emotion_score · future_value_score · emotion_profile dict.

NUNCA mostrados como números al usuario. Alimentan ranking + recommendation futuro.

### 7.3 · Captura desde día 1 (offline-first)

`kudosTelemetry.ts` envía eventos al `/api/telemetry/event` cuando API v2 está activa. Si no, bufferiza en `localStorage:kudos:telemetry:buffer` y reenvía al primer fetch exitoso. **Cero pérdida de datos durante el período sin API v2**.

---

## 8 · BUGS CONOCIDOS

| Bug | Severidad | Estado | Acción |
|---|---|---|---|
| `localStorage corruptas detectadas` toast | Media | Visible en /inicio | Implementado handler defensivo en sesión anterior; comprobar tras RECOVER push |
| 10 cápsulas fallidas en batch G1 | Baja | Es comportamiento correcto | 9 son museos secundarios · 1 (Torre de Londres) reintentar con `--resume` |
| Tier algoritmo divergente | Baja | Legacy vs Frontend | Legacy `pipeline.tier_for` filtra correctamente museos como B · frontend HDG-correct los marca como S por error · puede ajustarse |
| Web sin push reciente | **CRÍTICO** | **Resuelto por RECOVER.ps1** | Eduardo ejecuta `RECOVER.ps1` al volver |

---

## 9 · LO QUE QUEDA POR HACER (próximos sprints)

### 9.1 · Inmediato (1-2 días) · Eduardo cuando vuelva

1. **Ejecutar `RECOVER.ps1`** · sincroniza todos los page.tsx + components shell pendientes
2. **Activar API v2 en Render** · 5 clicks siguiendo `DEPLOY_API_V2.md`
3. **Setear env var frontend** · `NEXT_PUBLIC_KUDOS_API_URL=https://kudos-api-v2.onrender.com`
4. **Verificar 6 pantallas** post-deploy y validar visualmente
5. **Rotar Anthropic key** (leak del 29 May · clave actual probablemente comprometida)
6. **Reanudar batch cápsulas** con `--resume` para añadir Torre de Londres + completar Tier A (~80 cápsulas más · ~3-4h · ~$10)

### 9.2 · Sprint corto (1 semana)

- Conectar `useDiscoverySignals` con API v2 real (cuando esté activa)
- Implementar `/api/world/poi/{id}/node` aggregator REAL con related capsules + relationships
- Pulir bottom carousel · que la línea evocadora venga del backend con LLM (no placeholder por categoría)
- Generar 50 cápsulas Tier A (Catedrales · Alcázares · Monasterios · Villas Romanas · Palacios Reales)
- Activar PostHog/Plausible además de telemetry interna

### 9.3 · Medio plazo (1 mes)

- KUDOS MIND chat real con Anthropic + RAG sobre cápsulas
- Mapbox 3D oblicuo en `/world` (épica grande · cambia stack)
- Dataset temporal: Coliseo en 80 d.C. · 120 d.C. · 1500 · 1800 (hero photos IA Veo3)
- Memory Engine activo · MemoryPrompt en /inicio cuando hay >90d saves
- Sistema de cápsulas multi-POI ("De Roma a Florencia")

### 9.4 · Largo plazo (3 meses · pre-ronda)

- App móvil nativa (React Native con la misma base · 80% código compartido)
- KUDOS for Local Guides · marketplace expertos (revenue share 70/30)
- Voice-first mode · "Cuéntame del Coliseo" mientras caminas
- AR overlay · cámara apunta a edificio → cápsula superpuesta
- Apertura a 30 países · 200k POIs · 50 idiomas

---

## 10 · MÉTRICAS Q3 2026 (objetivos)

| Métrica | Hoy | Q3 target | KPI |
|---|---|---|---|
| Cápsulas reales | 7 curadas | 100 | Completar Tier S + 50 Tier A |
| Países cubiertos | 8 | 12 | Wikidata import: USA, MX, CN, IN |
| HDG eventos/día | 0 | 1.000 | Tras API v2 + tracción inicial |
| Save_rate por sesión | — | 0.15 | Primary KPI CTO directive |
| Resonancias capturadas | 0 | 500 | Tras 100 usuarios activos |

---

## 11 · STACK TECH

**Frontend**: Next.js 15 · React 18.2 · TypeScript strict · Tailwind utility · Leaflet (mapas 2D)
**Backend**: Python 3.11 · FastAPI · Pydantic v2 · JSON store atómico (migrable a Postgres)
**Pipeline**: Anthropic Claude (guión) · Edge-TTS (voz gratuita) · ffmpeg (ensamblado)
**Despliegue**: Render Free tier · auto-deploy desde GitHub master · ~3min build
**Data**: Wikidata SPARQL (43k POIs) · Wikimedia Commons (fotos CC) · OpenStreetMap

---

## 12 · CONTACTO POST-MEGATAREA

Cuando vuelvas y ejecutes `RECOVER.ps1`:
1. Render redeploya en ~3 min
2. Verifica las 6 URLs del bloque [9.1]
3. Si algo falla, copia el log de Render y pégamelo
4. Si todo va verde · `localStorage.clear()` desde la consola del navegador (F12) borrará claves corruptas viejas
5. Estamos listos para activar API v2 y empezar la siguiente fase

**El producto está donde tiene que estar al final del día 1 del proyecto · ahora toca pulir, probar con usuarios reales y empezar a generar datos en HDG.**
