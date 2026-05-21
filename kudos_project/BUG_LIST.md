# BUG_LIST.md — KUDOS / AXÓN

Última actualización: 2026-05-19 (auto · scheduled-task `actualizar-md`)
Criterio: solo bugs / bloqueos que impactan la demo pública del MVP. Ordenados por severidad.
Mandato vigente: **FREEZE v0.9-axon-core · estabilizar productivo · resolver HOME 500.**

Leyenda severidad: 🟥 Crítico · 🟧 Alto · 🟨 Medio · 🟩 Bajo

---

## 🟥 Críticos (bloquean demo pública)

### BUG-025 · `/` devuelve 500 en producción ⚠ NUEVO (2026-05-17)
- Archivo: `kudos_app/views.py` (`home`, L64) y/o `home.html` y/o context
  processor `kudos_app.context_processors.global_context`.
- Síntoma: tras desplegar `v0.9-axon-core` en Render, la home pública
  responde 500 con DEBUG=True (custom page). El traceback exacto está
  pendiente de lectura en Render → Logs.
- Fix temporal aplicado: ruta `healthcheck` (`kudos_app/urls.py:16`) sustituye
  a `home` en `/`; la home original sigue disponible en `/home/`
  (`name='home_full'`). El `name='home'` se preserva en healthcheck para no
  romper `{% url 'home' %}` en templates.
- Snapshots de reversión:
  - `kudos_app/urls.py.snapshot.debug-home.20260517T140529Z`
  - `kudos_app/views.py.snapshot.debug-home.20260517T140529Z`
- Causa probable (árbol en `DEBUG_HOME_500.md §4-§5`):
  - BD productiva no migrada (`relation does not exist` para
    `kudos_app_capsule` o `kudos_app_notification`).
  - `home.html` referencia `{% static '…' %}` no resuelto por
    `ManifestStaticFilesStorage`.
  - `home.html` usa `{% url 'Y' %}` con nombre inexistente.
  - Context processor `global_context` falla por `Notification` no migrado.
  - `_site_stats()` lanza excepción.
- Acción: leer log Render, aplicar fix puntual, revertir healthcheck.

### BUG-002 · Sin tests automatizados Django
- Archivo: `kudos_app/tests.py` (10 líneas, prácticamente vacío).
- Síntoma: la cobertura real es la suite estática AXÓN (29 checks) — sólo
  parsea, balancea HTML y resuelve URLs en disco, no exige Django runtime.
- Acción: añadir smoke tests `TestCase` para los 7 sistemas PUBLIC + 1 ruta
  DORMANT (404 esperado). Post-FREEZE para no introducir cambios pre-tag.

### BUG-005 · Login social no implementado
- Síntoma: el lanzamiento exige login social (Google, Facebook, Instagram,
  X, TikTok). Sólo existe el flujo nativo Django.
- Acción: post-FREEZE — instalar `django-allauth`, empezar por Google.
  **No bloquea demo técnica interna.**

---

## 🟧 Altos (rompen experiencia o estabilidad)

### BUG-026 · `markercluster` aún vía CDN unpkg.com ⚠ NUEVO (KNOWN_DEBTS §1)
- Archivo: `kudos_app/templates/map.html` (referencia externa) y/o
  `static/js/map5d/clustering.js`.
- Síntoma: si unpkg cae o se ralentiza, el cluster falla y los markers se
  sobreponen visualmente. Leaflet base ya está local, pero
  `leaflet.markercluster.js` + `MarkerCluster.css` + `MarkerCluster.Default.css`
  siguen externos.
- Acción: descargar a `static/vendor/leaflet.markercluster/` y servir local.
  (Sandbox actual sin red; pendiente máquina con outbound.)
- Severidad: 🟧 — funcional pero frágil offline.

### BUG-027 · 3 copias legacy de Leaflet en `static/` ⚠ NUEVO
- Archivos: `static/leaflet.js`, `static/leaflet-src.js`,
  `static/leaflet-src.esm.js` (+ sus `.map`).
- Síntoma: ~1.7 MB de payload static muerto. Sólo se usa
  `static/vendor/leaflet/leaflet.js` (162 KB).
- Acción: `git rm` las 3 huérfanas + `collectstatic --clear`. Post-FREEZE.

### BUG-028 · `map_view` ignora `?lat=&lon=&year=` deep-link ⚠ NUEVO (D10 close)
- Archivos: `kudos_app/templates/map.html` + `static/js/map5d/core.js`.
- Síntoma: el CTA "Ver en mapa 5D" desde `capsule_detail` llega al mapa
  pero carga vista mundial en lugar de centrarlo en la cápsula. El cierre
  narrativo D10 queda cojo.
- Acción: leer `URLSearchParams` en init y pasar a `setView(lat, lon, zoom)`
  + `setYear(year)`.

### BUG-029 · Sin rate limit en endpoints API públicos ⚠ NUEVO
- Archivos: `kudos_app/views.py` (`api_capsules_5d`, `api_capsule_light`,
  `ai_lite_ask`).
- Síntoma: un atacante puede martillar los endpoints — `api_capsules_5d`
  hace queries ORM con filtros geo, `ai_lite_ask` consume heurística.
- Acción: `django-ratelimit` con `@ratelimit(key='user_or_ip', rate='60/m')`.

### BUG-030 · `ai_lite_ask` con heurística local ⚠ NUEVO
- Archivo: `kudos_app/views.py` (`ai_lite_ask`).
- Síntoma: las respuestas son evocadoras pero limitadas a 3 templates
  server-side. Sin Claude/OpenAI productivo aún.
- Acción: cuando haya `ANTHROPIC_API_KEY` productiva, sustituir el cuerpo
  manteniendo el mismo contrato JSON (`mode/context → reply/related`).

### BUG-008 · `kudos_app/views.py` monolítico (2 337 L · 2 356 con healthcheck)
- Síntoma: 0 duplicados y 0 F401 (cerrado en D3), pero el monolito sigue.
  Sin embargo, el coste de auditar bajó drásticamente.
- Acción: en Fase 6 (post-MVP), extraer por sistema PUBLIC a
  `apps/{core,maps,capsules,users,search,timeline,mind}/views.py`.
  **No reescribir, solo mover.** Mandato AXÓN: no hacerlo hasta validar tracción.

### BUG-011 · `full_autopilot` no apto para producción
- Síntoma: lanza bucles infinitos sin rate-limit ni supervisión; saturará el
  dyno en Render/Railway si se invoca.
- Estado: ruta gateada como DORMANT (no expuesta). Riesgo neutralizado a
  nivel de superficie, pero el código sigue siendo desordenado.
- Acción: post-MVP, convertir a tareas programadas con APScheduler/cron;
  añadir circuit breakers y logs.

### BUG-012 · Dependencias críticas comentadas
- Archivo: `requirements.txt`.
- Síntoma: Pillow, requests, openai siguen comentados. Cualquier flujo que
  dependa de imágenes o HTTP externo falla en limpio (no bloquea PUBLIC CORE
  actual porque los flujos se han mantenido fuera del MVP).
- Acción: activar Pillow y requests al integrar OG image dinámica o features
  que las requieran. Mantener openai/celery/redis comentadas hasta que estén
  integradas.

### BUG-013 · Generación de clips inestable
- Estado: ruta DORMANT (gateada). No expuesta al usuario público.
- Acción: post-MVP, pipeline local con gTTS + imágenes Wikimedia + moviepy.

---

## 🟨 Medios (deuda técnica relevante)

### BUG-031 · 18 imports anidados dentro de funciones en `views.py` ⚠ NUEVO
- Archivo: `kudos_app/views.py` (re-imports de `datetime/timedelta/date`
  dentro de cuerpos de función).
- Síntoma: ruidoso pero inocuo. Sugiere historial de fixes locales.
- Acción: limpieza en pasada de pulido post-FREEZE.

### BUG-032 · Scripts huérfanos rotos en raíz del repo ⚠ NUEVO
- Archivos: `art_culture.py:15`, `control.py:35`, `generate_capsules.py:11`,
  `social_impact.py:15` importan submódulos inexistentes de `kudos_app.views`.
- Síntoma: nunca funcionaron. No bloquean el flujo Django, pero confunden
  cualquier auditoría.
- Acción: mover a `dormant/scripts/` cuando llegue limpieza Fase 6.

### BUG-016 · DB SQLite en producción (mitigado)
- Estado: `settings.py` ahora exige `DATABASE_URL` en `DJANGO_ENV=production`
  y Render aprovisiona Postgres automáticamente (via `render.yaml`).
- Acción residual: validar que `migrate --plan` no muestra divergencia tras
  el primer deploy. Documentar fallback explícito en README.

### BUG-017 · Archivos `.md.txt` desordenados en raíz
- Archivos: `PROJECT_AUDIT.md.txt`, `MVP_DEFINITION.md.txt`,
  `DJANGO_APPS_STRUCTURE.md.txt`, `IMPORT_PLAN.md.txt`,
  `ROADMAP_FASE1.md.txt`, `TECHNICAL_DECISIONS.md.txt`.
- Acción: mover a `docs/` y normalizar extensión a `.md`. Post-FREEZE.

### BUG-019 · `db.sqlite3` (~10 MB) en repo
- Síntoma: la base de datos se versiona junto al código (ya está en
  `.gitignore` actual, pero histórico podría tenerlo).
- Acción: `git rm --cached db.sqlite3` y regenerar con
  `create_initial_data.py` para entornos limpios.

### BUG-020 · `legacy_views.py` sin reubicar
- Archivo: `kudos_app/legacy_views.py` (2 160 L).
- Síntoma: cementerio confirmado conviviendo con `views.py` activo.
- Decisión consciente: pospuesto a post-D14 freeze para no introducir cambios
  pre-tag. Sigue siendo DORMANT natural (no importado por `urls.py`).
- Acción: mover a `dormant/legacy_views.py` cuando se relajen las reglas
  FREEZE.

### BUG-033 · `_is_founder` vs `/mind/chat/` ⚠ NUEVO
- Archivo: `kudos_app/views.py` (`ai_panel`) + `kudos_app/urls.py`.
- Síntoma: `ai_panel` decide visibilidad de sección Full por `is_founder`,
  pero la URL `/mind/chat/` sigue accesible directa si alguien la conoce.
- Acción: añadir `/mind/chat/`, `/mind/chat/send/` a `DORMANT_PATH_PREFIXES`
  si se quiere ocultar del todo.

### BUG-034 · Variables globales en `static/js/map5d/*.js` ⚠ NUEVO
- Síntoma: `STATE`, `map`, `markersLayer`, `_LIGHT_CACHE` viven en `window`.
  Posible colisión con scripts de terceros.
- Acción: envolver todo en `window.KUDOS = window.KUDOS || {}` namespace.
  Post-FREEZE.

### BUG-035 · CSRF via form invisible en `ai_panel.html` ⚠ NUEVO
- Síntoma: truco aceptable pero feo.
- Acción: mover token a `<meta name="csrf-token">` global + leer desde
  `header['X-CSRFToken']`. Post-FREEZE.

---

## 🟩 Bajos (mejoras incrementales)

### BUG-022 · Plantillas sin estilo unificado
- 120 templates sin sistema de diseño claro; muchas dormant.
- Resolución a largo plazo: **Experience Core** (Next.js 15) en `experience/`
  con Design System v1.0 sustituirá la capa visual. Las plantillas Django
  permanecen para flujos no-Experience.

### BUG-023 · `README.md` desactualizado
- Síntoma: la portada del repo (1 891 bytes) no refleja el estado actual ni
  enlaza a `AXON_RELEASE_AUDIT.md`, `PUBLIC_CORE_STATUS.md`, `KNOWN_DEBTS.md`,
  `FREEZE_v0.9_AXON_CORE.md`, `DEPLOY_v0.9_AXON_CORE.md`, `PROJECT_STATUS.md`.
- Acción: refrescar tras resolver HOME 500. Suficiente con un párrafo
  introductorio + índice de documentos AXÓN + sección Experience Core.

### BUG-024 · `if_feature` no cubre todos los enlaces DORMANT
- Síntoma: la mayoría de los enlaces de `base.html` y `capsule_detail.html`
  están envueltos, pero queda barrer plantillas internas (`profile.html`,
  `dashboard.html`, etc.) en busca de enlaces directos a rutas DORMANT.
- Acción: barrido sistemático con `grep '{% url' kudos_app/templates/`.
  Mitigado parcialmente: middleware bloquea cualquier `/marketplace/`,
  `/founder/`, etc. con 404 aunque el link siga visible.

### BUG-036 · `renderTimeline` sin scroll-to-year ⚠ NUEVO
- Archivo: `static/js/map5d/timeline.js`.
- Síntoma: `centerTimeline(year)` cambia la vista pero la timeline muestra
  todos los años ordenados.
- Acción: añadir `<a id="year-1789">` y `scrollIntoView()` tras render.

### BUG-037 · `backdrop-filter: blur(18px)` en GPUs móviles antiguas ⚠ NUEVO
- Síntoma: posible drop de FPS en hardware antiguo. Lighthouse Mobile
  Performance podría caer < 70 si los dispositivos de test son débiles.
- Acción: `@media (prefers-reduced-transparency)` opt-out preservando
  identidad en hardware moderno.

---

## Cerrados desde la última revisión (2026-05-15 → 2026-05-19)

### Cerrados por el ciclo AXÓN D1–D12
- **BUG-001 · `SECRET_KEY` con fallback inseguro** — cerrado. `settings.py`
  exige `SECRET_KEY` obligatoria en `DJANGO_ENV=production`. Render lo
  inyecta vía `generateValue: true` en `render.yaml`.
- **BUG-003 · 6 funciones duplicadas en `views.py`** — cerrado en D3.
  Eliminadas las 12 zombies (la cuenta real era 12, no 6). `views.py` ahora
  con 0 duplicados verificado por la suite AXÓN.
- **BUG-004 · Mapa multidimensional incompleto** — cerrado en D4–D6.
  Clustering, bbox + viewport loading con debounce, lazy popups vía
  `api_capsule_light`, mobile tuning 14/14, slider temporal estable,
  geolocalización (Nominatim).
- **BUG-006 · `map.html` monolítico (881 L)** — cerrado en D7.
  167 L con CSS y JS extraídos a `static/css/map5d.css` y 10 módulos en
  `static/js/map5d/`.
- **BUG-007 · Leaflet servido por CDN** — cerrado en D2.
  `static/vendor/leaflet/leaflet.{js,css}` v1.9.4 local servido.
- **BUG-009 · Utils duplicados (`google_maps_utils.py` x2)** — cerrado en D2.
  Copia raíz movida a `.dormant`; canónica en `utils/`.
- **BUG-010 · `kudos_app_urls.py` huérfano** — confirmado sin imports;
  pendiente de `git rm` definitivo (no bloquea nada).
- **BUG-014 · Mind no reducido a 3 prompts** — cerrado en D12.
  `/mind/` PUBLIC + `/mind/ask/` con 3 modes (`what`/`summary`/`near`) +
  auto-fire + UI 3 chips grandes.
- **BUG-015 · Share blindado pendiente** — cerrado en D11.
  OG + Twitter Card + Schema.org JSON-LD + Web Share API + clipboard
  fallback + toast.
- **BUG-021 · `staticfiles/` con duplicados de Leaflet** — mitigado.
  Tras `collectstatic --clear`, la única fuente canónica es
  `static/vendor/leaflet/`. Las 3 huérfanas en `static/` raíz quedan
  pendientes de borrar (ahora BUG-027).
- **BUG-018 · `.env` fuera del historial** — confirmado en `.gitignore`.

### Cerrados pre-AXÓN (verificación residual)
- **Feature Gating activado** (2026-05-15): `features.py`, `middleware.py`,
  `templatetags/feature_tags.py`, `base.html` nav PUBLIC reducida.
- **`db.sqlite3`, `__pycache__/`, `.env`** ya en `.gitignore`.
- **Migraciones 0005_userpreference y 0006_capsule_version_aport** aplicadas.

---

## Resumen ejecutivo

| Severidad | Items abiertos | Items cerrados desde 2026-05-15 |
|---|---|---|
| 🟥 Crítico | 3 (HOME-500, tests, login social) | 4 (SECRET_KEY, duplicados, mapa, …) |
| 🟧 Alto | 7 | 4 (map.html, Leaflet CDN, utils, Mind, Share) |
| 🟨 Medio | 8 | — |
| 🟩 Bajo | 5 | — |
| **Total** | **23 ítems** | **~11 cerrados** |

**Único bloqueante hoy: BUG-025 (HOME 500).** El resto es deuda gestionable
sin tocar arquitectura. El FREEZE se mantiene; sólo se permiten fixes para
bugs detectados en demo / productivo (`FREEZE_v0.9_AXON_CORE.md §6`).
