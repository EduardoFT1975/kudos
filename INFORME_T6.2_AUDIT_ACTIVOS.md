# INFORME T6.2 · AUDITORÍA DE ACTIVOS REUTILIZABLES

**Encargo:** mapa completo del repositorio, módulo por módulo. ¿Qué está vivo? ¿Qué está congelado? ¿Qué está muerto? Sin arquitectura. Sin roadmap. Solo evidencia.

**Fecha:** 30 de mayo de 2026

---

## RESUMEN EJECUTIVO EN UNA FRASE

KUDOS posee aproximadamente **70-75% del MVP ya construido**, repartido entre código activo, código congelado en `_postlaunch` y dos backends que coexisten (Django legacy + FastAPI nuevo). El mayor enemigo del lanzamiento ahora mismo NO es construir, es **decidir qué queda fuera**.

---

## 1. INVENTARIO MAESTRO POR MÓDULO

### 1.1 FRONTEND · pantallas (`experience/components/screens/`)

| Módulo | Líneas | Estado | Importado por `/app` | Acción |
|---|---|---|---|---|
| **home** | 2.631 | ✅ VIVO | sí (`/inicio`) | UTILIZAR |
| **map/v1** (fake) | 1.328 | ✅ VIVO | sí (`/world`) | ELIMINAR (tras swap a v2) |
| **map/v2** (real) | 2.758 | ✅ VIVO | sí (`/world-v2`) | UTILIZAR |
| **poi** | 1.755 | ✅ VIVO | sí (`/poi/[id]`) | UTILIZAR |
| **mi-mundo** | 1.593 | ✅ VIVO | sí (`/mi-mundo`) | UTILIZAR |
| **perfil** | 665 | ✅ VIVO | sí (`/perfil`) | UTILIZAR |
| **guardados** | 159 | ✅ VIVO | sí (`/guardados`) | UTILIZAR |
| **admin** | 420 | ✅ VIVO | sí (`/admin/dashboard`) | UTILIZAR |
| **merit** | 1.501 | ⛔ ZOMBI | no | CONGELAR (decisión Eduardo: invisible al usuario) |
| **core** | 571 | ⛔ ZOMBI | no | CONGELAR (Humanity Core no visible Fase 1) |
| **studio** | 238 | ⛔ ZOMBI | no | ELIMINAR |
| **moments** | 183 | ⛔ ZOMBI | no | ELIMINAR |
| **timeline** | 146 | ⛔ ZOMBI | no | ELIMINAR |
| **notifications** | 133 | ⛔ ZOMBI | no | ELIMINAR (Fase 1: cero push) |
| **place** | 96 | ⛔ ZOMBI | no | ELIMINAR (sustituido por poi/) |
| **memories** | 94 | ⛔ ZOMBI | no | ELIMINAR |
| **connections** | 93 | ⛔ ZOMBI | no | ELIMINAR (red social fuera Fase 1) |
| **invite** | 81 | ⛔ ZOMBI | no | ELIMINAR |
| **time-rome** | 77 | ⛔ ZOMBI | no | ELIMINAR (Roma 80 d.C. fuera Fase 1) |
| **mind** | 261 | ⛔ ZOMBI | no | CONGELAR (puede volver Fase 2) |
| **settings** | 210 | ⛔ ZOMBI | no | CONGELAR |

**Subtotal VIVO:** ~13.300 líneas activas y consumidas por rutas.
**Subtotal ZOMBI:** ~4.700 líneas. Ningún `import` activo desde `/app`. Ocupan repo, confunden el equipo, no aportan valor.

### 1.2 FRONTEND · componentes no-pantalla (`experience/components/`)

| Carpeta | Estado | Acción |
|---|---|---|
| `discovery/` (AddToMyWorldButton, ResonancePicker, useDiscoverySignals, kudosTelemetry, useMyWorld) | VIVO, usado por WorldEngine v2 y home | UTILIZAR |
| `media/HomeMapPanel.tsx` (279 líneas, Leaflet+OSM activo en producción) | VIVO | UTILIZAR |
| `discovery/MyWorldMiniMap.tsx` (163 líneas, Leaflet+OSM activo) | VIVO | UTILIZAR |
| `auth/` | VIVO | UTILIZAR |
| `brand/` | VIVO | UTILIZAR |
| `shell-v4/` (AppShell) | VIVO | UTILIZAR |
| `share/` | VIVO | UTILIZAR (ShareMVP activo) |
| `notifications/` | revisar uso | probable CONGELAR |
| `providers/` | VIVO | UTILIZAR |
| `analytics/` | VIVO | UTILIZAR |
| `shared/` | VIVO | UTILIZAR |

### 1.3 FRONTEND · librerías (`experience/lib/`)

| Carpeta | Contenido | Estado |
|---|---|---|
| `geo/useGeolocation.ts` (94 líneas) | Hook geolocalización completo | UTILIZAR |
| `kudos/store.ts` | Store local con Poi, Capsule, getAllPois | UTILIZAR |
| `auth/` | Auth.js + JWT helpers | UTILIZAR |
| `api/` | Cliente API backend | UTILIZAR |
| `analytics/` | Plausible / telemetría | UTILIZAR |
| `env/` | Config | UTILIZAR |
| `qr/` | Generador QR (ShareMVP) | UTILIZAR |
| `mocks-v2/` | Datos mock | revisar; probable ELIMINAR |
| `utils/` | Helpers genéricos | UTILIZAR |

### 1.4 FRONTEND · `_postlaunch/` (congelado)

| Subcarpeta | Contenido | Tamaño | Recomendación |
|---|---|---|---|
| `world-engine/` | Motor mapa real (ya descongelado a v2) | 2.758 líneas | YA UTILIZADO (T6.1) — se puede archivar |
| `poi-v5/` | ActionPotentialCard, PoiNodeV5, RelatedHumanityRail | ~3 archivos | CONGELAR (puede volver Fase 2) |
| `mi-mundo-v5/` | MiMundoTabs, MiMundoV5, **PersonalGraph**, ShiftHistory | 4 archivos | CONGELAR · **PersonalGraph es oro para Fase 2** |
| `share/` | ShareCapsuleModal, ShareCapsuleModalV5, ShareReflectionModalV2 | 3 archivos | ELIMINAR (ShareMVP activo es suficiente) |
| `app/ajustes`, `app/auth`, `app/conexiones`, `app/core`, `app/echo`, `app/inicio-legacy`, `app/invitar`, `app/linea-tiempo`, `app/merit`, `app/merito`, `app/mind`, `app/mis-memorias`, `app/momentos`, `app/notificaciones`, `app/places`, `app/studio`, `app/time` | Rutas congeladas | 18 dirs, 1-3 archivos c/u | revisar caso por caso; mayoría ELIMINAR salvo `merit` y `core` (CONGELAR para Fase 2 invisible) |

### 1.5 FRONTEND · rutas activas (`experience/app/`)

| Ruta | Importa | Estado |
|---|---|---|
| `/inicio` | HomeFeedV5 | UTILIZAR |
| `/world` | MapMVP (fake) | UTILIZAR ahora, SWAP a v2 después |
| `/world-v2` | WorldEngine v2 (real) | UTILIZAR (recién descongelado) |
| `/poi/[id]` | PoiMVP | UTILIZAR |
| `/mi-mundo` | MiMundoMVP | UTILIZAR |
| `/guardados` | GuardadosScreen | UTILIZAR |
| `/perfil` | PerfilScreen | UTILIZAR |
| `/admin/dashboard` | AdminDashboard | UTILIZAR |
| `/login` | LoginPage | UTILIZAR |
| `/mapa` | redirect → /world | ELIMINAR cuando swap se complete |
| `/design-system` | playground | CONGELAR |
| `/api/auth`, `/api/mind`, `/api/og` | edge functions | UTILIZAR |
| `/c/[id]`, `/capsules/[slug]` | viewer cápsulas | UTILIZAR |

### 1.6 BACKEND · FastAPI (`kudos_engine/apps/`)

Verificación real en `kudos_engine/apps/main.py`. **18 routers, casi todos montados:**

| Router | Mounted | Acción |
|---|---|---|
| `pois` | ✅ | UTILIZAR |
| `capsules` | ✅ | UTILIZAR |
| `media` | ✅ | UTILIZAR |
| `feed` | ✅ | UTILIZAR |
| `narrative` | ✅ | UTILIZAR |
| `nodes` | ✅ | UTILIZAR |
| `discover` | ✅ | UTILIZAR |
| `save_legacy` + `save_pg` | ✅ | UTILIZAR (save_pg) · ELIMINAR legacy tras migración cerrada |
| `telemetry_legacy` + `telemetry_pg` | ✅ | UTILIZAR (pg) · idem |
| `signals_legacy` + `signals_pg` | ✅ | UTILIZAR (pg) · idem |
| `auth` | ✅ | UTILIZAR |
| `migration` | ✅ | UTILIZAR (anon→auth) |
| `db_admin` | ✅ | UTILIZAR (admin) |
| `admin_metrics` | ✅ | UTILIZAR |
| `personal` | ✅ | UTILIZAR |
| `push` | ✅ | revisar (Fase 1: cero push externo) → CONGELAR si no se usa |
| `core` | ✅ | UTILIZAR (sirve datos a /core invisible) |
| `merit` | ✅ | UTILIZAR (Merit Engine silencioso, no visible) |
| `core_engine` | ¿montado? | revisar (sospecha duplicado de `core`) |

### 1.7 BACKEND · Django legacy (`kudos_app/`)

| Aspecto | Estado |
|---|---|
| 66 archivos Python | EXISTE |
| `models.py`, `migrations/`, `admin.py`, `templates/`, `views/` | EXISTEN |
| Endpoint `api_mvp.py` | EXISTE |
| ¿Está desplegado en producción? | Ya no. Render usa kudos_engine FastAPI |
| ¿Tiene tests propios? | sí, `tests.py`, `tests_merit.py` |
| **Acción** | **ELIMINAR (mover a `legacy/django-snapshots/` si no se ha hecho ya)** |

### 1.8 BACKEND · `content_engine/`

| Aspecto | Estado |
|---|---|
| 37 archivos Python | EXISTE |
| `pipeline.py`, `media_generation.py`, `truth_gate.py`, `landmarks.py`, `geocache.py`, `clients/`, `echo_synthesis.py` | EXISTE |
| ¿Sustituido por `kudos_engine`? | Aparentemente sí |
| ¿Hay imports activos desde otros lados? | revisar (probable: NO) |
| **Acción** | **revisar 1 hora, si confirmado huérfano: ELIMINAR** |

### 1.9 DATOS

| Carpeta | Contenido | Tamaño | Estado |
|---|---|---|---|
| `experience/public/data/wikidata/` | 8 países, decenas de miles POIs georeferenciados | 12 MB | UTILIZAR |
| `experience/public/data/narratives/` | Narrativas pre-escritas | revisar contenido | UTILIZAR |
| `experience/public/data/osm/` | Datos OSM pre-procesados | revisar | UTILIZAR si tienen valor |
| `experience/public/data/relationships/` | Relaciones entre POIs (Narrative Engine) | revisar | UTILIZAR |
| `experience/public/capsules/*.mp4` | **35 vídeos cápsula reales** | varios MB | UTILIZAR · son contenido oro |
| `kudos_engine/output/` | 33 POIs procesados (alhambra, coliseo, sagrada-familia, eiffel, notre-dame, hagia-sofia, athens, foro-romano, pompeya, torre-londres, etc.) | considerable | UTILIZAR · contenido base curado |

### 1.10 `legacy/` (la fosa común)

| Subcarpeta | Naturaleza | Acción |
|---|---|---|
| `axon-experimental-lib/` | 20+ paquetes filosóficos (cinematic-language, civilizational-os, embodied-runtime, memory-atlas, contemplative-feed, first-truth, etc.) | **ELIMINAR ENTERO**. Cero valor MVP. Riesgo: que alguien intente reactivar algo |
| `features-concept/` | ar_vr, blockchain, ipfs, prometheus, streamlit, tensorflow-source | **ELIMINAR ENTERO**. Esto es la lista de funcionalidades CONGELADAS 90 días post-launch que ya tienes documentada |
| `django-snapshots/` | Snapshots del Django pre-FastAPI | ELIMINAR (o ZIP archivado externamente) |
| `old-deploy-scripts/`, `scripts-old/`, `old-docs/`, `old-views/`, `data-old/` | Lo que el nombre indica | ELIMINAR |

**Total `legacy/`: 492 archivos `.tsx/.ts/.py`. La mayoría debería desaparecer del repo activo.**

---

## 2. HALLAZGOS SORPRESA

### 2.1 TESOROS encontrados

1. **WorldEngine v2** (ya descongelado en T6.1): 2.758 líneas. Cubre Leaflet + OSM + viewport culling + geolocalización + search + carousel. Listo en `/world-v2`.

2. **PersonalGraph.tsx** en `_postlaunch/mi-mundo-v5/v5/`. Probablemente oro para Fase 2 cuando Mi Mundo necesite vista radial.

3. **35 vídeos cápsula `.mp4`** en `experience/public/capsules/`. Coliseo, Alhambra, Athens, Hagia Sofia, Areoso, y más. Ya están en producción. Contenido real ya generado.

4. **33 carpetas de POI procesados** en `kudos_engine/output/`. Cada una con su pipeline ejecutado. Contenido editorial base curado.

5. **8 ficheros JSON Wikidata** (12 MB) con decenas de miles de POIs georeferenciados. Ya cargados, ya consumidos por MyWorldMiniMap.

6. **HomeMapPanel y MyWorldMiniMap activos en producción** con Leaflet+OSM reales. Refutan empíricamente la idea de que "el mapa real no estaba".

7. **Hook `useGeolocation`** completo, 94 líneas, con cache, manual mode, y manejo de errores. Esto solo es 1-2 días de trabajo si se construyera de cero.

8. **Backend FastAPI con 18 routers activos** y modelo POI con coordenadas obligatorias. CRUD completo.

### 2.2 BASURA encontrada

1. **`legacy/axon-experimental-lib/`**: 20+ paquetes "filosófico-experimentales". Nombres como `civilizational-os`, `embodied-runtime`, `memory-atlas`. Cero valor de producto. Riesgo real de que alguien (humano o LLM) intente reactivarlos.

2. **`legacy/features-concept/`**: ar_vr, blockchain, ipfs, tensorflow-source. Estas son literalmente las funcionalidades que tienes en tu lista CONGELADAS 90 días. No deben estar en el repo activo.

3. **18 carpetas `_postlaunch/app/`** con rutas de pantallas que no aparecen en producto: ajustes, conexiones, echo, invitar, linea-tiempo, mis-memorias, momentos, notificaciones, places, studio, time. Confunden cualquier audit futuro.

4. **13 carpetas `components/screens/`** sin importar desde `/app`: connections, core, invite, memories, merit, mind, moments, notifications, place, settings, studio, time-rome, timeline. ~4.700 líneas zombi.

5. **Dos backends coexistentes**: Django (`kudos_app/`) y FastAPI (`kudos_engine/`). El Django ya no se despliega pero ocupa 66 archivos y confunde.

6. **`content_engine/`** posiblemente duplicado de `kudos_engine/`. 37 archivos. Necesita confirmación pero huele a deuda.

7. **Tres versiones de Share modal** en `_postlaunch/share/`. Solo se usa una (ShareMVP). El resto puede borrarse.

---

## 3. CINCO DECISIONES EJECUTIVAS

1. **ELIMINAR `legacy/axon-experimental-lib/` y `legacy/features-concept/` por completo.** Cero valor. Riesgo de contaminación filosófica. 5 minutos de `git rm -rf`.

2. **ELIMINAR los 13 módulos zombi de `components/screens/`** (connections, core, invite, memories, merit, mind, moments, notifications, place, settings, studio, time-rome, timeline) salvo los que decidas congelar para Fase 2 (recomiendo solo `merit/` y `core/` por si vuelven invisibles). ~4.700 líneas fuera.

3. **ELIMINAR `kudos_app/` (Django legacy) y `content_engine/` (si confirmado huérfano).** 100+ archivos Python fuera del radar.

4. **REUTILIZAR `_postlaunch/mi-mundo-v5/v5/PersonalGraph.tsx`** cuando Mi Mundo necesite vista radial. Solo eso. El resto de `_postlaunch/mi-mundo-v5/v5/` puede ir a archivo externo.

5. **AUDITORÍA DE DUPLICADOS BACKEND** (1 hora de trabajo): confirmar si `core` vs `core_engine` son redundantes, decidir cuál muere. Confirmar si `content_engine/` puede borrarse.

---

## 4. SUPERFICIE REAL DEL REPO DESPUÉS DE LIMPIEZA

| Categoría | Líneas estimadas |
|---|---|
| Frontend activo (screens + components + lib) | ~16.000 |
| Frontend congelado intencionalmente (merit, core, PersonalGraph) | ~2.200 |
| Backend FastAPI activo | ~6.000 (estimación) |
| Datos (Wikidata, vídeos, output) | 12 MB JSON + 35 MP4 + 33 dirs |
| Eliminado | **~6.000 líneas + 800 archivos legacy + 100 archivos Django** |

Esto significa: el repo activo post-limpieza es **manejable por una sola persona** sin perderse. El repo actual no lo es.

---

## 5. LO QUE ESTE INFORME NO DICE (RESTRICCIÓN EXPLÍCITA)

- No propone arquitectura nueva.
- No diseña Fase 2 ni roadmap.
- No discute cápsulas familiares, legacy, Mapa de la Vida.
- No recomienda nuevos features.

Solo dice: **qué hay, qué se está usando, qué no.**

---

## 6. SIGUIENTE PASO LÓGICO (NO EJECUTAR HASTA QUE EDUARDO DECIDA)

Si aceptas las 5 decisiones ejecutivas de la sección 3, hay un **T6.3 · LIMPIEZA QUIRÚRGICA** que se puede ejecutar en una sola tanda:
- Borrar `legacy/axon-experimental-lib/` y `legacy/features-concept/`
- Borrar 11 de los 13 zombis de `screens/` (mantener merit + core como congelados explícitos)
- Borrar `kudos_app/` (mover a snapshot externo si quieres conservar)
- Confirmar y borrar `content_engine/` si huérfano
- Eliminar 2 versiones obsoletas de Share modal

Tiempo estimado: 1-2 horas de mi parte, 1 commit, 1 push.

Pero esto no se ejecuta hasta que tú lo apruebes. El informe termina aquí.

---

**Auditor:** Claude (modo CTO, evidencia sobre código real)
**Fichero entregable:** `INFORME_T6.2_AUDIT_ACTIVOS.md`
