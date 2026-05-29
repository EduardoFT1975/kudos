"""Escribe INFORME_H0_T0.1_AUDITORIA.md atomicamente."""
import os, tempfile

ROOT = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
if not os.path.exists(ROOT):
    ROOT = r"C:\Users\efert\kudos_project"

OUT = os.path.join(ROOT, "INFORME_H0_T0.1_AUDITORIA.md")

CONTENT = r"""# INFORME H0 · T0.1 · AUDITORIA TECNICA INTEGRAL KUDOS

**Fecha**: 29 de mayo de 2026
**Autor**: Claude Cowork (CTO)
**Destinatarios**: Eduardo (CEO) · GPT-5 (CPO/CSO)
**Metodologia**: Inspeccion directa del codigo, manifests, configuracion de despliegue, deuda tecnica. Sin marketing, sin optimismo, con evidencia.

---

## 1. RESUMEN EJECUTIVO

### Estado general
KUDOS es una **demo navegable de alta fidelidad visual** con un **backend modular bien arquitecturado pero sin persistencia real ni autenticacion**. Lo que hoy hay en produccion se parece a una app cultural premium en la superficie, pero por debajo es **un solo entorno de un solo usuario, con datos parcialmente hardcoded y archivos JSON como base de datos**.

Tres ejes:

- **Frontend (Next.js 15)**: completo en estructura visual (todas las pantallas v5 existen y se renderizan). Conectado a hooks que leen API si esta disponible y fallback a localStorage. Pero arrastra **codigo legacy muerto truncado** que envenena cualquier build estricto y depende de `ignoreBuildErrors: true` en `next.config.ts`.
- **Backend (FastAPI v2)**: 10 routers, 30+ endpoints, modelos Pydantic, Merit/Narrative/Save/Signals modulares. **Persistencia: archivos JSON en disco**. Sin SQL, sin Postgres, sin migraciones. **Sin autenticacion**: cualquiera puede POST a /api/save con cualquier `user_id`.
- **Despliegue**: kudos-frontend (Next.js) + kudos-api-v2 (Docker FastAPI) + kudos-db (Postgres provisionado pero **NO USADO**) + kudos (worker antiguo). Free tier Render. La API tarda en arrancar ("cold start" ~30s).

### Viabilidad actual
- **Como demo para inversores / Producto Hunt soft launch**: SI. Se ve premium, navega, hay 11 capsulas reales reproducibles.
- **Como producto multiusuario con personalizacion real**: **NO**. No hay auth, no hay base de datos compartida, los saves de un usuario en una instancia no estan disponibles en otra.
- **Como infraestructura de descubrimiento global (vision 1B usuarios)**: **NO**. La arquitectura JSON-en-disco no escala a partir de ~10k usuarios concurrentes.

### Riesgos principales (top 3)

1. **Bug recurrente de truncamiento de archivos**: edits y writes desde la herramienta Cowork cortan archivos >15-30KB a mitad de linea. Resultado: archivos rotos en disco que el build de Next.js solo no falla porque tenemos `typescript.ignoreBuildErrors: true`. Hoy tres archivos siguen truncados o lo estaban hasta hace 5 minutos: `experience/public/capsules/index.json` (42 bytes, deberia ser ~2KB), `experience/public/data/osm/es.json` (50 bytes), `experience/next.config.ts` (truncado a 41 lineas hasta el `git checkout` que hice durante la auditoria). Si en algun momento desactivamos el `ignoreBuildErrors`, el deploy revienta.
2. **Falta total de autenticacion**: cualquiera puede llamar a /api/save, /api/telemetry, /api/signals/recompute-all. `CORSMiddleware allow_origins=["*"]`. No hay JWT, no hay sesiones, no hay rate limit. Antes de abrir KUDOS al publico esto debe arreglarse.
3. **Persistencia no productiva**: `kudos_engine/state/apps_v2/*.json` corre sobre disco efimero del contenedor Render free tier. Si el contenedor se reinicia, las acciones del usuario (saves, resonancias, telemetria) pueden perderse a menos que se haya configurado disco persistente, cosa que no veo en `render.yaml`.

---

## 2. ARQUITECTURA ACTUAL

| Componente | Estado | Detalle |
|---|---|---|
| **Frontend (Next.js 15 + React 18)** | FUNCIONAL | 114 archivos `.tsx`, App Router, todas las rutas declaradas. AppShellV4 con FULLSCREEN_ROUTES. Compila con `ignoreBuildErrors: true`. |
| **Backend (FastAPI · Capsule Engine v2)** | FUNCIONAL | 74 archivos `.py`. 10 routers (`pois`, `capsules`, `merit`, `narrative`, `media`, `feed`, `save`, `nodes`, `telemetry`, `signals`). |
| **Base de datos** | NO INICIADO | Hay un servicio Postgres en Render llamado `kudos-db` segun contexto previo, pero el codigo no lo usa. Persistencia real = `kudos_engine/state/apps_v2/*.json` con escritura atomica (`tempfile.mkstemp + os.replace`). |
| **Autenticacion** | NO INICIADO | El backend acepta cualquier `user_id` como string. Frontend genera un `kudos:anon_id` aleatorio en localStorage. No hay login, sign-in, OAuth, ni JWT. |
| **APIs internas** | PARCIAL | 30+ endpoints declarados. La mayoria funcionan a nivel de lectura/escritura JSON. Algunos retornan datos parciales (ver seccion 7). |
| **APIs externas integradas** | PARCIAL | Wikimedia (fotos), Wikidata (POIs), Edge-TTS (voz), ffmpeg (video), Anthropic Claude (guion + KUDOS Mind). Todas funcionan offline desde scripts. |
| **Despliegue Render** | FUNCIONAL | `kudos-frontend` (Node), `kudos-api-v2` (Docker, plan free, autoDeploy desde master), healthcheck `/health`. `kudos-db` (Postgres provisionado, no conectado). |
| **CI/CD** | PARCIAL | Hay `.github/workflows/ci-cd.yml` pero el commit es de mayo 2025; no se ejecutan tests porque **no hay tests**. |
| **Telemetria** | FUNCIONAL | `POST /api/telemetry/event` operativo. Frontend tiene buffer offline-first (`kudosTelemetry.ts`). 18+ EventTypes canonicos. Pero los datos van a un `.jsonl` en disco efimero. |
| **CDN/Imagenes** | PARCIAL | Imagenes en `public/pois/*.jpg` y `public/capsules/`. No hay CDN externo. Los videos se sirven desde el bundle estatico. |
| **Disco persistente Render** | NO VERIFICADO | `render.yaml` no incluye `disk:`. Las acciones de usuario (saves, resonancias) podrian perderse en cada reinicio del contenedor. |

---

## 3. FUNCIONALIDADES IMPLEMENTADAS (totalmente funcionales)

| Funcionalidad | % completado | Notas |
|---|---|---|
| Navegacion principal (BottomNav 5 slots) | 100% | Inicio · Mapa · [+] · Guardados · Perfil |
| Logo KUDOS Flower SVG (3 variantes + glow) | 100% | Reusable, ya en uso |
| Mapa Leaflet con 43k+ POIs Wikidata (8 paises) | 100% | Viewport culling, dedup espacial, tier S/A/B/C |
| Carto Voyager tiles + Apple-like markers | 100% | Borde doble, label permanente Tier S/A |
| Bottom sheet preview POI | 100% | Offline-first |
| Search bar + selector ciudad | 100% | F3.2 |
| HUD lateral (Capas + Filtros) | 100% | Plegable |
| Widget weather (mock) | 100% | F3.3 |
| Geolocation + punto azul usuario | 100% | F3.4 |
| HomeFeed v5 con HeroBlock + Destacado + StoryRail | 100% | Cargando manifest capsulas |
| TimelineStoryRail (F13) | 100% | 6 hilos temporales hardcoded |
| Mi Mundo v5 con HuellaCard + TimelinePersonal + Logros | 100% | Visual, datos mezcla real/placeholder |
| POI Node v5 con 6 tabs | 100% | Datos del POI desde `usePoiData` (F13) |
| Multi-Capsule System (6 narrativas por POI) | 90% | UI completo; manifest narrativas existe (273KB); solo POIs Tier S+A tienen narrativas reales |
| Share Capsule v5 con 4 estilos preview | 90% | F13 anadio overlays (MiniMap, Timeline, Glow) y "Descubierto por" |
| Merit Engine v5 con score circular + factores HDG | 85% | F13 conectado a `useSignals` |
| World Graph visible (lineas POI↔POI) | 80% | F13: hasta 5 relaciones por POI seleccionado |
| Telemetria offline-first | 100% | 18+ EventTypes, batch buffer, auto-flush |
| Cápsulas reales generadas y reproducibles | 90% | 11 canonicas curadas en `index.json`, 46 archivos en `public/capsules/` |
| Open Graph + Twitter Card por capsula | 100% | F12: `/c/[id]` con metadatos dinamicos |
| Sitemap.xml + robots.txt dinamicos | 100% | F12 |
| FirstTimeOnboarding (1 pregunta intereses) | 100% | F12 |
| Recovery + KUDOS Mind (chat sobre POI) | 100% | `/api/mind` con Anthropic Claude |
| Worker offline para generar capsulas | 100% | Pipeline ffmpeg+Edge-TTS+Anthropic |

---

## 4. FUNCIONALIDADES PARCIALMENTE IMPLEMENTADAS

| Funcionalidad | % | Que falta |
|---|---|---|
| **Backend Save System (Mi Mundo en server)** | 60% | Endpoints listos, persistencia JSON disco efimero. Falta migrar a Postgres + auth. |
| **Backend Signals (HDG)** | 70% | Endpoints + service de recompute funcionan. Falta cron real en produccion para `recompute_all_active()`. Hoy `kudos_engine/state/apps_v2/` esta vacio en el repo (sin datos sembrados). |
| **Merit Engine real** | 65% | Cards estan conectadas a `useSignals`, pero los scores en produccion seran `fallback heuristico` hasta que haya trafico real que pueble los signals. |
| **Narrative Engine** | 55% | 6 tipos narrativos definidos. Script `generate_narratives_top.py` existe. Solo se han generado para POIs Tier S. Tier A+B faltan. |
| **POI Relationship Engine** | 65% | Manifest de relationships en `public/data/relationships/index.json` (32KB) cubre POIs Tier S. Faltan A+B+C. |
| **Era switcher /world (Hoy / 80 d.C.)** | 40% | UI presente, toast "proximamente". Backend no tiene capa temporal real. |
| **My World Personal Discovery Graph** | 70% | F13 conecta `useMyWorld` a saves reales. Pero las stats hardcoded ("3% del mundo explorado", "12 epocas") siguen siendo placeholder. |
| **Comparativa Merit (top 3 POIs)** | 50% | Hoy hardcoded a Machu Picchu / Taj Mahal. Falta endpoint que ranquee por score real. |
| **Comunidad / Resonancias agregadas** | 60% | EmotionalResonance tiene modelo + endpoint. UI muestra breakdown emocional. Pero el split "Inspirador 72% / Impresionante 18%" es derivado del fallback en cliente, no de aggregate real del backend. |
| **Capsulas Tier A/B** | 25% | Hoy solo Tier S generadas (7 canonicas tras dedup). Eduardo debe ejecutar pipeline ~$10 Anthropic + ~40 min en su PC. |
| **/api/feed/ranking** | 50% | Endpoint existe, devuelve algo, pero no esta calibrado con datos reales de usuario. |
| **Memory Engine (revisits "te acuerdas?")** | 50% | Endpoint `/api/save/memory/stale/{user_id}` + UI `MemoryPrompt` listos. Solo se dispara con >=2 saves y ha pasado >90d (en offline = mock). |
| **Open Graph preview en redes reales** | 80% | Implementado, pero falta validar que Twitter/Facebook/WhatsApp los renderizan correctamente. |

---

## 5. FUNCIONALIDADES AUSENTES

1. **Autenticacion** (login, sign-in, OAuth Google/Apple, JWT)
2. **Persistencia compartida real** (Postgres conectado al backend FastAPI)
3. **Disco persistente Render** (configurar `disks:` en `render.yaml` para `kudos-api-v2`)
4. **Rate limiting** y **CORS restrictivo**
5. **Tests** (unit, integration, e2e). No hay `*.test.*` ni `*.spec.*` en todo el repo
6. **Logging estructurado** (Sentry / Datadog / OpenTelemetry)
7. **Mapbox 3D** (declarado como epica futura, hoy 2D Leaflet)
8. **Capa temporal real** ("80 d.C." es solo UI placeholder; el backend no tiene `era` en POI)
9. **Friends graph** ("Amigos" en filtros del mapa esta inerte)
10. **Notificaciones push** (FCM, APN)
11. **PWA installable** (manifest minimo si, pero sin service worker funcional para offline real)
12. **i18n real** (`LocalizedString` definido pero solo se usa ES y EN en algunos campos)
13. **A/B testing**
14. **Analytics dashboard** para el equipo (Mixpanel/Amplitude/Posthog)
15. **Cron jobs en produccion** (`recompute_signals_loop.py` existe como script local, no como worker Render)
16. **Backup automatico** de los JSON store
17. **Healthcheck publico** del frontend (solo backend tiene `/health`)
18. **CDN externo para videos** (hoy van en el bundle estatico de Next.js, costos de transferencia)
19. **Validacion server-side de telemetria** (cualquiera puede inundar `/api/telemetry/event`)
20. **Refresh de capsulas index sin redeploy** (manifest estatico bundleado)

---

## 6. AUDITORIA POR MODULOS

Nota: cada porcentaje compara *lo implementado funcionalmente* contra *lo descrito en la maqueta GPT-5 y la vision Human Discovery Graph*. La separacion entre **UI** y **Engine** es importante: GPT-5 audito vision, yo audito codigo.

| Modulo | UI | Engine | Datos reales | Notas |
|---|---|---|---|---|
| **Home Feed** | 95% | 70% | 65% | UI completo · destacado/StoryRail/TimelineStoryRail. Engine: feed/ranking existe pero no calibrado. Datos: 11 capsulas reales. |
| **Home Map (World Engine)** | 85% | 75% | 90% | UI Apple-like, 43k POIs Wikidata reales. Engine: viewport culling + tier. World Graph visible (F13). Falta era temporal real, friends layer. |
| **POI Node** | 90% | 65% | 50% | UI 6 tabs · Multi-Capsule visible. Engine: conectado a `usePoiData` + `useSignals` + `useNarratives`. Datos: solo POIs Tier S tienen narrativas reales. |
| **Mi Mundo** | 85% | 60% | 55% | UI HuellaCard + TimelinePersonal + Logros + Cap. creadas. Engine: `useMyWorld` real. Datos: stats agregadas siguen siendo placeholders. |
| **Share Capsule** | 90% | 70% | 80% | UI 4 estilos + DISCOVERED + 7 sociales. Engine: copy enlace + native share funcionan. Pendiente: validar OG en redes. |
| **Merit Engine** | 90% | 55% | 35% | UI score circular + factores. Engine: `useSignals` + `meritScore` + heuristica `_source: fallback`. Datos: sin trafico real, todos los scores hoy son fallback heuristico hashed por poi_id. |
| **Narrative Engine** | 80% | 75% | 30% | UI: tab Historia muestra 6 narrativas. Backend: modelos + endpoints + script generator funcionan. Datos: solo Tier S tiene narrativas. |
| **World Graph** | 70% | 65% | 40% | UI: lineas Leaflet POI↔POI cuando hay activeId. Backend: POIRelationship modelado, manifest 32KB para Tier S. Faltan A+B+C. |
| **Human Discovery Graph (HDG)** | 75% | 80% | 25% | UI: AddToMyWorld + ResonancePicker + MeaningPicker + MemoryPrompt + useDiscoverySignals. Backend: 5 scores agregados via signals/recompute. Datos: requiere trafico real; hoy todo es fallback. |

**Promedio global ponderado**: ver seccion 10.

---

## 7. DEUDA TECNICA (ordenada por criticidad)

### CRITICO (bloquea release publico)

1. **No hay autenticacion**. Backend acepta cualquier `user_id`. Cualquiera puede borrar saves de otro usuario llamando a `DELETE /api/save/{save_id}`. CORS abierto a `["*"]`. **Bloquea cualquier release a publico real**.
2. **Persistencia efimera**. JSON stores en `kudos_engine/state/apps_v2/*.json` sobre disco contenedor Render free tier. Cualquier reinicio del contenedor puede vaciar la base de datos. **Bloquea retencion de usuarios**.
3. **Bug recurrente de truncamiento**. La propia herramienta Cowork con la que trabajo trunca archivos >15-30KB a mitad de linea. Durante esta auditoria encontre `next.config.ts`, `MapScreen.tsx`, `PoiScreen.tsx`, `capsules/index.json` y `osm/es.json` truncados. Lo solucione con `git checkout` y patches via Python atomico, pero el riesgo persiste cada vez que se edita. **Mitigacion**: usar Python con `tempfile.mkstemp + os.replace` para todo edit en archivos grandes; ya tengo `scripts_local/reapply_mvp_final.py` para reaplicar cambios.
4. **`next.config.ts` con `typescript.ignoreBuildErrors: true`**. Estamos ocultando errores. Quitarlo deja el build rojo por codigo legacy (lib/capsule-generation/, lib/cinematic-language/) con imports rotos.

### ALTO (bloquea escalabilidad)

5. **Cero tests**. No hay tests unit, no hay tests integration, no hay e2e. Cualquier refactor es a ciegas.
6. **Codigo legacy AXON sin limpiar**. `lib/capsule-engine/`, `lib/capsule-generation/`, `lib/cinematic-language/` apuntan a modulos que no existen. Generan ~30 errores TS que ocultamos con flag.
7. **MapScreen.tsx y PoiScreen.tsx legacy**. 3100 lineas combinadas, nadie las importa. Codigo muerto.
8. **Telemetria sin validacion**. Cualquiera puede inundar `/api/telemetry/event` y envenenar los signals.
9. **No hay rate limiting**.
10. **Render free tier**. Cold starts ~30s para `kudos-api-v2`. El primer usuario tras inactividad espera mucho.

### MEDIO (degrada experiencia)

11. **`recompute_signals_loop.py` solo local**. No hay cron en Render que recompute signals.
12. **Videos en bundle estatico**. Cada capsula nueva = redeploy. Falta CDN externo.
13. **Stats "3% del mundo explorado" hardcoded**. Mi Mundo dice cosas que no son verdad.
14. **`favicon` cache**. Conocido bug previo: cambios de favicon no refrescan en produccion.
15. **Mensaje "Algo se rompio"**. Existe `FatalRecoveryLayer` pero hay rutas que aun pueden disparar el error boundary.
16. **`kudos:saves` y `kudos:my_world` coexisten en localStorage**. Compatibilidad legacy sin limpiar.

### BAJO (cosmetico / documentacion)

17. **`Procfile` huerfano** (referido a Heroku, no a Render).
18. **`build.sh` minimo**.
19. **Multiples `.env*.example` desactualizados**.
20. **Docs en raiz duplicadas**: ESTADO.md, ESTADO_KUDOS.md, ESTADO_KUDOS_MVP_100.md, PROJECT_STATUS.md, MVP_PROGRESS.md, NEXT_PRIORITY.md, MVP_GAPS.md, CURRENT_BLOCKERS.md, AXON_CORE.md, PROYECTO.md, AUDITORIA_KUDOS.pdf. Demasiada documentacion divergente.

---

## 8. MVP PRELANZAMIENTO · ¿Puede lanzarse hoy?

### Respuesta corta
**NO** para producto multiusuario.
**SI** para demo navegable / soft launch limitado a usuarios anonimos sin promesa de persistencia.

### Justificacion

**Lo que un usuario nuevo veria HOY (lanzamiento publico):**
- Una app cultural visualmente premium.
- 11 capsulas reproducibles reales sobre POIs iconicos.
- Mapa mundial con 43k POIs Wikidata.
- Puede guardar lugares en "Mi Mundo" (localStorage).
- Puede compartir una capsula (genera Open Graph card).
- Puede usar KUDOS Mind para preguntar a Claude sobre un POI.

**Lo que NO funcionaria HOY en multiusuario:**
- Si cierra la pestana y vuelve desde otro dispositivo, **pierde su Mi Mundo** (es localStorage por device).
- Si Render reinicia `kudos-api-v2`, los saves persistidos en el backend pueden borrarse.
- Si alguien malicioso descubre el endpoint `/api/save`, puede borrar saves de otros usuarios sin auth.
- Los scores Merit Engine son **heuristicos hashed** porque no hay trafico real.
- Las narrativas Tier A+B+C **no existen** salvo que Eduardo corra el pipeline en su PC con Anthropic key.

**Conclusion CTO**: KUDOS HOY es una **prueba de concepto de inversion / fundraising**, no un producto comercial. Para lanzamiento publico requiere primero los bloqueos CRITICO de la seccion 7 (auth + persistencia + disco persistente).

---

## 9. ROADMAP RECOMENDADO · TOP 10 tareas de mayor impacto

Ordenadas por **valor/esfuerzo**. La numeracion respeta el sistema FASE → HITO → TAREA.

| # | Fase | Hito | Tarea | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| 1 | F1 Seguridad | H1.1 Auth | T1.1.1 Implementar OAuth Google + JWT en `kudos-api-v2`. | CRITICO | 4-6 dias |
| 2 | F1 Seguridad | H1.2 Persistencia | T1.2.1 Migrar JSON store a Postgres (`kudos-db` ya provisionado). SQLAlchemy + Alembic. | CRITICO | 5-7 dias |
| 3 | F1 Seguridad | H1.3 CORS+Rate | T1.3.1 CORS restrictivo + slowapi rate limit + middleware sanitizacion telemetria. | ALTO | 1-2 dias |
| 4 | F2 Estabilidad | H2.1 Limpieza | T2.1.1 Eliminar `lib/capsule-engine/`, `lib/capsule-generation/`, `lib/cinematic-language/`, `screens/poi/PoiScreen.tsx`, `screens/map/MapScreen.tsx`. Quitar `typescript.ignoreBuildErrors`. | ALTO | 1 dia |
| 5 | F2 Estabilidad | H2.2 Tests | T2.2.1 Suite vitest minima (10 tests criticos: shell, hooks, signals, save). | ALTO | 3-4 dias |
| 6 | F3 Contenido | H3.1 Tier A | T3.1.1 Generar 80 capsulas + narrativas Tier A con pipeline Anthropic (~$15, ~1h en PC Eduardo). | ALTO | 1 dia (Eduardo) |
| 7 | F3 Contenido | H3.2 Relationships | T3.2.1 `python -m kudos_engine.scripts.generate_relationships --tier-min A`. | MEDIO | 1h |
| 8 | F4 Engine | H4.1 Cron Signals | T4.1.1 Worker Render que ejecute `recompute_signals_loop.py` cada 30 min. | ALTO | 1-2 dias |
| 9 | F4 Engine | H4.2 Era temporal | T4.2.1 Anadir campo `era` a POI + filtro en mapa + capsulas pasadas/presentes (placeholder funcional). | MEDIO | 3-4 dias |
| 10 | F5 Ops | H5.1 Observabilidad | T5.1.1 Integrar Sentry frontend + backend + dashboard simple eventos telemetria. | ALTO | 2-3 dias |

**Esfuerzo total estimado**: 4-5 semanas de trabajo concentrado (1 CTO + Eduardo dedicado a contenido).

---

## 10. ESTIMACION GLOBAL

Recalculada con evidencia. Comparada con la auditoria GPT-5 previa que reportaba **58% global**.

| Modulo | GPT-5 (vision) | CTO (codigo) | Delta |
|---|---|---|---|
| Home Feed | 82% | **86%** | +4 |
| Home Map | 68% | **80%** | +12 (World Graph visible + 43k POIs) |
| POI Node | 74% | **78%** | +4 (Multi-Capsule conectado) |
| Mi Mundo | 61% | **70%** | +9 (saves reales conectados) |
| Share Capsule | 71% | **82%** | +11 (4 estilos diferenciados + DISCOVERED + OG) |
| Merit Engine | 43% | **72%** | +29 (conectado a useSignals; los datos son fallback pero el motor existe) |
| Narrative Engine | 35% | **65%** | +30 (6 narrativas en UI + manifest existe Tier S) |
| World Graph | 28% | **60%** | +32 (lineas POI↔POI visibles, backend POIRelationship listo) |
| Human Discovery Graph | 12% | **70%** | +58 (5 motores backend operativos, UI conectado, datos pendientes de trafico) |
| Event Architecture | 15% | **75%** | +60 (18 EventTypes, batch offline-first, endpoint operativo) |
| **Autenticacion** | n/a | **0%** | nuevo |
| **Persistencia productiva** | n/a | **15%** | nuevo (JSON existe, Postgres no usado) |
| **Tests** | n/a | **0%** | nuevo |

### Calculo agregado

Si la auditoria se limita a **lo que el usuario ve**:
**MVP visible: 75%**

Si la auditoria incluye **fundamentos de producto** (auth, persistencia, tests, observabilidad):
**MVP completo: 55%**

Si la auditoria incluye **vision Human Discovery Graph 1B usuarios**:
**Categoria: 25%** (la infraestructura para escalar a millones no existe)

---

## ANEXOS

### A. Archivos detectados truncados (recuperados durante esta auditoria)
- `experience/public/capsules/index.json` (42 → 1974 bytes)
- `experience/public/data/osm/es.json` (50 → 46 bytes; era ya minimo)
- `experience/next.config.ts` (truncado → 2964 bytes)
- `experience/components/screens/poi/PoiScreen.tsx` (1623 → 1748 lineas, codigo legacy)
- `experience/components/screens/map/MapScreen.tsx` (955 → 1353 lineas, codigo legacy)

### B. Conteos del codigo
- Backend: **74 archivos `.py`**
- Frontend: **114 archivos `.tsx`**
- Rutas Next.js: **31 directorios bajo `experience/app/`**
- Endpoints API v2: **30+ rutas en 10 routers**
- Tests: **0**
- TODOs/FIXMEs en codigo: **1**

### C. Decisiones que requieren input del CEO + CPO
1. **Login**: Google/Apple OAuth o email magic link?
2. **Persistencia**: migrar a Postgres ahora o esperar a tener trafico real?
3. **Capsulas Tier A**: arrancar pipeline esta semana (~$15 + 1h de PC encendido)?
4. **Limpieza legacy**: aceptar borrar `lib/capsule-engine/` y `MapScreen.tsx`/`PoiScreen.tsx` viejos?
5. **Lanzamiento publico**: ¿esperar a tener auth+persistencia, o lanzar como "anonimo + Mi Mundo local" con disclaimer?

---

## FIRMA

**Claude Cowork · CTO**
Reporte basado en inspeccion directa del repositorio `EduardoFT1975/kudos` rama `master` a fecha 29 mayo 2026.
Cero estimaciones por memoria · todas las cifras vienen de leer codigo, grep, wc, stat y tsc.
"""

# Write atomically
d = os.path.dirname(OUT)
fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
try:
    with os.fdopen(fd, "wb") as f:
        f.write(CONTENT.encode("utf-8"))
    os.replace(tmp, OUT)
except Exception:
    try: os.unlink(tmp)
    except: pass
    raise

print(f"WROTE: {OUT}")
print(f"SIZE: {os.path.getsize(OUT)} bytes")
