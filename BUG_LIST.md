# BUG_LIST.md — KUDOS / AXÓN

Última actualización: 2026-05-21 (auto · scheduled-task `actualizar-md`)
Criterio: solo bugs / bloqueos que impactan la demo pública del MVP. Ordenados por severidad.
Mandato vigente: **FREEZE v0.9-axon-core · 17 hotfix 2026-05-21 desplegados · HOME 500 RESUELTO · validar primer deploy frontend.**

Leyenda severidad: 🟥 Crítico · 🟧 Alto · 🟨 Medio · 🟩 Bajo

---

## 🟥 Críticos (bloquean demo pública)

### BUG-048 · Primer deploy del frontend en Render sin ejecutar ⚠ NUEVO (2026-05-21)
- Archivo: `render.yaml` (servicio `kudos-frontend`).
- Síntoma: `render.yaml` v2 declara el servicio Next.js con
  `rootDir: experience`, `npm install && npm run build`,
  `NEXT_PUBLIC_API_BASE_URL=https://kudos-40cq.onrender.com`,
  `BETA_HIDE_DORMANT=1`. Aún no se ha disparado el primer Manual Deploy
  en el dashboard de Render. Hasta que ocurra, no hay frontend público
  servido.
- Riesgo lateral: `CORS_ALLOWED_ORIGINS` del backend está pre-poblado
  con `https://kudos-frontend.onrender.com` (asunción de URL limpia).
  Si Render asigna hash (nombre ocupado), el origen real diferirá y
  el frontend recibirá `Access-Control-Allow-Origin` mismatch en
  cualquier fetch al backend.
- Acción:
  1. Manual Deploy del servicio `kudos-frontend` desde el dashboard.
  2. Confirmar URL pública asignada por Render.
  3. Si difiere de `kudos-frontend.onrender.com`, editar
     `CORS_ALLOWED_ORIGINS` del backend `kudos` con la URL real.
  4. Validar fetch `/api/health/` desde la home del frontend (existe
     panel `experience/app/health/page.tsx` que ya hace esta sanity check).

### BUG-002 · Sin tests automatizados Django (mitigado parcial)
- Archivo: `kudos_app/tests.py` (10 L → 79 L tras commit `dd42db3`).
- Estado: 4 TestCase ahora (era 1):
  - `CapsuleTestCase` (heredado).
  - `HealthEndpointTestCase` (Phase 0) · `/api/health/` shape JSON.
  - `PlaceDetailEndpointTestCase` (Phase 0) · `/api/places/<slug>/`
    serialización + 404 limpio.
  - `CapsuleFoundationFieldsTestCase` (Phase 0) · campos `place`,
    `parent_capsule`, `root_capsule`, `context_layer`, `importance_score`,
    `verified` y árbol `children`/`descendants`.
- Acción residual: añadir smoke tests `TestCase` para los 7 sistemas
  PUBLIC + 1 ruta DORMANT (404 esperado). Post-FREEZE.

### BUG-005 · Login social no implementado
- Síntoma: sólo flujo nativo Django (`/accounts/login/`, `/register/`).
- Acción: post-FREEZE — instalar `django-allauth`, empezar por Google.
  **No bloquea demo técnica interna.**

---

## 🟧 Altos (rompen experiencia o estabilidad)

### BUG-038 · 2 archivos núcleo truncados en working tree (parcial)
- Archivos:
  - `kudos_app/urls.py` (210 L · 10 173 B) — `'[' was never closed` L11.
    HEAD íntegro a 215 L.
  - `kudos_app/models.py` (1 131 L · 46 756 B) — `unterminated string
    literal` L1132. HEAD íntegro a 1 210 L.
- Estado: **`views.py` reparado** (commit `dd42db3` restauró +61 L
  de Phase 0; ahora 2 382 L parsea OK). Quedan 2 archivos por restaurar.
- Síntoma: Django no arranca en local hasta el checkout. Render sirve
  HEAD íntegro, sin impacto productivo.
- Fix:
  ```bash
  git checkout HEAD -- kudos_app/urls.py kudos_app/models.py
  python -c "import ast; [ast.parse(open(f).read()) for f in
    ['kudos_app/urls.py','kudos_app/models.py']]"
  python manage.py check
  ```

### BUG-050 · Git index corrupto persistente ⚠ NUEVO (2026-05-21)
- Síntoma: `fatal: unknown index entry format 0x70680000` (hoy) ·
  variante del `0x74000000` del 2026-05-19. `git status`, `git diff`,
  `git add` fallan. `git log`, `git show <ref>:<path>`,
  `git checkout HEAD -- <path>` funcionan.
- Riesgo: ningún commit nuevo desde el host afectado hasta reset del
  índice.
- Fix (con backup previo):
  ```bash
  cp .git/index .git/index.backup-$(date +%s)
  rm .git/index
  git read-tree HEAD
  git status   # debería volver
  ```

### BUG-039 · Navegación contaminada · ~30 enlaces dormant en PUBLIC ⚠ ABIERTO (FEATURE_GATE_AUDIT 2026-05-19)
- Archivos templates: `home.html` (13), `capsule_detail.html` (7),
  `dashboard.html` (4), `ai_panel.html` (3).
- Síntoma: gating en URL/middleware es correcto, pero los templates
  muestran botones a rutas dormant que devuelven 404 al clicarse.
- Mitigado en Experience: `middleware.ts` redirige rutas frontend
  dormant a `/aqui` 307.
- Acción: envolver cada `{% url 'dormant_*' %}` en `{% if_feature %}`
  (~1-2 h, sin tocar views ni urls).

### BUG-040 · Duplicado URL pattern `mind/chat/` ⚠ ABIERTO
- Archivo: `kudos_app/urls.py:186` y `:193` declaran ambos
  `path('mind/chat/', views.ai_chat, name='ai_chat')`.
- Síntoma: Django usa el primero; ruido en `reverse()`.
- Acción: borrar la duplicada cuando se restaure `urls.py` desde HEAD.

### BUG-047 · Barcelona · Plaça Catalunya UNGROUNDED en Content Engine ⚠ ABIERTO
- Archivo: `content_engine/ranking.py` y/o `content_engine/landmarks.py`.
- Síntoma: master smoke 2026-05-20T14:04:31Z · `failure_class=UNGROUNDED`,
  candidatos 10, latencia 3 390 ms. Resto de capitales europeas (Madrid,
  Roma, París) pasa con confidence ≥ 0.96.
- Acción: aislar por qué los 10 candidatos no ganan grounding. Revisar
  scoring weights en `ranking.py` y umbral landmark_override en
  `landmarks.py`.

### BUG-049 · `package-lock.json` aún no commiteado ⚠ NUEVO (2026-05-21)
- Archivo: `experience/package-lock.json` (existe localmente, no en
  master).
- Síntoma: `render.yaml` v2 usa `npm install` (no `npm ci`). Trade-off
  documentado: ~30 s extra de build vs reproducibilidad estricta.
  Riesgo: minor-version drift en deps de Next/React/Tailwind entre
  builds.
- Acción: `git add experience/package-lock.json && commit` y cambiar
  `render.yaml` a `npm ci && npm run build`. Post-validación primer
  deploy.

### BUG-026 · `markercluster` aún vía CDN unpkg.com (KNOWN_DEBTS §1)
- Archivo: `kudos_app/templates/map.html` + `static/js/map5d/clustering.js`.
- Síntoma: si unpkg cae, el cluster falla y los markers se sobreponen.
  Leaflet base ya está local.
- Acción: descargar a `static/vendor/leaflet.markercluster/` y servir
  local. Pendiente máquina con outbound.

### BUG-027 · 3 copias legacy de Leaflet en `static/`
- Archivos: `static/leaflet.js`, `static/leaflet-src.js`,
  `static/leaflet-src.esm.js` (+ sus `.map`).
- Síntoma: ~1.7 MB de payload static muerto.
- Acción: `git rm` las 3 huérfanas + `collectstatic --clear`. Post-FREEZE.

### BUG-028 · `map_view` ignora `?lat=&lon=&year=` deep-link (D10 close)
- Archivos: `kudos_app/templates/map.html` + `static/js/map5d/core.js`.
- Síntoma: el CTA "Ver en mapa 5D" desde `capsule_detail` llega al
  mapa pero carga vista mundial.
- Acción: leer `URLSearchParams` en init y pasar a `setView(lat, lon,
  zoom)` + `setYear(year)`.

### BUG-029 · Sin rate limit en endpoints API públicos Django
- Archivos: `kudos_app/views.py` (`api_capsules_5d`, `api_capsule_light`,
  `ai_lite_ask`).
- Síntoma: un atacante puede martillar los endpoints. El endpoint nuevo
  `place-capsule` (Content Engine) sí tiene `django-ratelimit`.
- Acción: `django-ratelimit` con `@ratelimit(key='user_or_ip',
  rate='60/m')`. Replicar el patrón de Content Engine.

### BUG-030 · `ai_lite_ask` con heurística local
- Archivo: `kudos_app/views.py` (`ai_lite_ask`).
- Síntoma: respuestas evocadoras pero limitadas a 3 templates
  server-side. Sin Claude/OpenAI productivo aún.
- Acción: cuando haya `ANTHROPIC_API_KEY` productiva, sustituir el
  cuerpo manteniendo el mismo contrato JSON.

### BUG-008 · `kudos_app/views.py` monolítico (2 382 L)
- Síntoma: 0 duplicados y 0 F401, pero el monolito sigue. Tras Phase 0
  añadió +61 L (`api_health`, `api_place_detail`).
- Acción: en Fase 6 (post-MVP), extraer por sistema PUBLIC a
  `apps/{core,maps,capsules,users,search,timeline,mind}/views.py`.
  **No reescribir, solo mover.**

### BUG-011 · `full_autopilot` no apto para producción
- Síntoma: bucles infinitos sin rate-limit ni supervisión.
- Estado: ruta gateada como DORMANT (no expuesta).
- Acción: post-MVP, convertir a tareas programadas con APScheduler/cron.

### BUG-012 · Dependencias críticas comentadas
- Archivo: `requirements.txt` (ahora 2 631 B clean tras `5e18e1f`).
- Síntoma: Pillow, requests, openai siguen comentados/ausentes.
- Acción: activar Pillow y requests al integrar OG image dinámica.

### BUG-013 · Generación de clips inestable
- Estado: ruta DORMANT (gateada). No expuesta al usuario público.
- Acción: post-MVP, pipeline local con gTTS + imágenes Wikimedia + moviepy.

---

## 🟨 Medios (deuda técnica relevante)

### BUG-031 · 18 imports anidados dentro de funciones en `views.py`
- Archivo: `kudos_app/views.py`.
- Síntoma: ruidoso pero inocuo.
- Acción: limpieza post-FREEZE.

### BUG-032 · Scripts huérfanos rotos en raíz del repo
- Archivos: `art_culture.py:15`, `control.py:35`,
  `generate_capsules.py:11`, `social_impact.py:15` importan submódulos
  inexistentes de `kudos_app.views`.
- Acción: mover a `dormant/scripts/` cuando llegue limpieza Fase 6.

### BUG-016 · DB SQLite en producción (mitigado)
- Estado: `settings.py` exige `DATABASE_URL` en `DJANGO_ENV=production`;
  `render.yaml` aprovisiona Postgres `kudos-db`.
- Acción residual: validar que `migrate --plan` no muestra divergencia
  tras el primer deploy.

### BUG-017 · Archivos `.md.txt` desordenados en raíz
- Archivos: `PROJECT_AUDIT.md.txt`, `MVP_DEFINITION.md.txt`,
  `DJANGO_APPS_STRUCTURE.md.txt`, `IMPORT_PLAN.md.txt`,
  `ROADMAP_FASE1.md.txt`, `TECHNICAL_DECISIONS.md.txt`.
- Acción: mover a `docs/` y normalizar a `.md`. Post-FREEZE.

### BUG-019 · `db.sqlite3` (~10 MB) en repo
- Síntoma: ya en `.gitignore`, pero histórico podría tenerlo.
- Acción: `git rm --cached db.sqlite3` y regenerar con
  `create_initial_data.py`.

### BUG-020 · `legacy_views.py` sin reubicar
- Archivo: `kudos_app/legacy_views.py` (2 160 L).
- Decisión consciente: pospuesto a post-D14 freeze.
- Acción: mover a `dormant/legacy_views.py` cuando se relajen reglas.

### BUG-033 · `_is_founder` vs `/mind/chat/`
- Archivo: `kudos_app/views.py` (`ai_panel`) + `kudos_app/urls.py`.
- Síntoma: `ai_panel` decide visibilidad por `is_founder`, pero la URL
  sigue accesible directa.
- Acción: añadir `/mind/chat/`, `/mind/chat/send/` a
  `DORMANT_PATH_PREFIXES`.

### BUG-034 · Variables globales en `static/js/map5d/*.js`
- Síntoma: `STATE`, `map`, `markersLayer`, `_LIGHT_CACHE` viven en
  `window`.
- Acción: envolver en `window.KUDOS = window.KUDOS || {}` namespace.
  Post-FREEZE.

### BUG-035 · CSRF via form invisible en `ai_panel.html`
- Síntoma: aceptable pero feo.
- Acción: mover token a `<meta name="csrf-token">` global + leer desde
  `header['X-CSRFToken']`. Post-FREEZE.

### BUG-041 · 29 snapshots `.snapshot.*` en árbol fuente (DEBT_SCAN §2)
- Archivos: `*.snapshot.dX.YYYYMMDDTHHMMSSZ` · 1 208 654 B no
  referenciados.
- Acción: mover a `outputs/snapshots/` (fuera de git tracking) o
  `git rm`.

### BUG-042 · 7 templates duplicados raíz vs `kudos_app/templates/`
- Archivos: `templates/control_panel.html` (1 707 B) vs
  `kudos_app/templates/control_panel.html` (21 474 B drástico) + 6
  más con divergencia.
- Acción: confirmar fuente canónica (probablemente `kudos_app/`) y
  borrar duplicados raíz.

### BUG-043 · `settings.py` (0 B) y `kudos_app_urls.py` (407 B) huérfanos en raíz
- Acción: `git rm` ambos. Solo dejar `kudos_project/settings.py` y
  `kudos_app/urls.py`.

### BUG-044 · 17 inits Leaflet copy-paste en templates feature
- Archivos: `art_culture`, `capsule_museum`, `control_panel`,
  `education_plan*`, `governance`, `historical_map`, `infrastructure`,
  `innovation`, `market_transactions`, `research`, `seller_profile`,
  `social_impact`, `space_badge_*`, `tourism_badge_confirmation`.
- Síntoma: todos DORMANT pero seguirán ejecutándose si se exponen.
- Acción: extraer helper `static/js/map5d/init.js` y reutilizar.

### BUG-045 · 4 views sin wire (DEBT_SCAN §3b)
- Archivos: `personal_habit_toggle`, `personal_crypto`, `ai_mind_chat`,
  `bookmark_capsule`.
- Acción: mover a `legacy_views.py` tras FREEZE.

### BUG-046 · Git index corrupto (variante histórica)
- Síntoma: `fatal: unknown index entry format 0x74000000` (2026-05-19).
- Estado: hoy reaparece como `0x70680000` (ver BUG-050). Mismo síntoma,
  variante de bytes.
- Acción: ver BUG-050 (consolidación).

---

## 🟩 Bajos (mejoras incrementales)

### BUG-022 · Plantillas Django sin estilo unificado
- 120 templates sin sistema de diseño claro; muchas dormant.
- Resolución a largo plazo: **Experience Core (Next.js 15)** ahora en
  master con `experience/design-system/tokens.ts` (161 L) y middleware
  beta-gate. Las plantillas Django permanecen para flujos
  no-Experience.

### BUG-023 · `README.md` desactualizado
- Síntoma: portada del repo no refleja Phase 0 (Place, api_health),
  Content Engine en master, ni Experience desplegable.
- Acción: refrescar tras validar primer deploy frontend. Suficiente
  con un párrafo introductorio + índice de documentos AXÓN +
  sección Experience Core + sección Content Engine + sección
  servicios Render.

### BUG-024 · `if_feature` no cubre todos los enlaces DORMANT
- Síntoma: la mayoría en `base.html` y `capsule_detail.html` envueltos,
  pero falta barrer `profile.html`, `dashboard.html`, etc.
- Acción: barrido sistemático con `grep '{% url'
  kudos_app/templates/`. Ver BUG-039 (consolidado en plan ~1-2 h).

### BUG-036 · `renderTimeline` sin scroll-to-year
- Archivo: `static/js/map5d/timeline.js`.
- Síntoma: `centerTimeline(year)` cambia la vista pero la timeline
  muestra todos los años ordenados.
- Acción: añadir `<a id="year-1789">` y `scrollIntoView()` tras
  render.

### BUG-037 · `backdrop-filter: blur(18px)` en GPUs móviles antiguas
- Síntoma: posible drop de FPS en hardware antiguo.
- Acción: `@media (prefers-reduced-transparency)` opt-out preservando
  identidad en hardware moderno.

---

## Cerrados desde la última revisión (2026-05-19 → 2026-05-21)

### Cerrados por los 17 hotfix del 2026-05-21
- **BUG-025 · `/` devuelve 500 en producción** — **CERRADO** por
  `67fe207` (2026-05-21 16:03 UTC+2). Causa raíz aislada:
  `ValueError("Missing staticfiles manifest entry")` con
  `CompressedManifestStaticFilesStorage`. Fix dual:
  1. `STATICFILES_STORAGE` → `CompressedStaticFilesStorage` (sin
     Manifest).
  2. `home()` view envuelta en try/except triple con fallback
     `HttpResponse 200 text/plain`. **Nunca propaga 500 al usuario**;
     loguea el traceback para diagnóstico.
- **Healthcheck temporal en `/`** — **CERRADO** por `c42784a`
  (2026-05-20). Home real restaurada en `/`, healthcheck movido a
  `/healthcheck/`, alias `home_full` en `/home/`.
- **BUG-038-views · `views.py` truncado (working tree)** — **CERRADO**
  por `dd42db3` (2026-05-21 14:53 UTC+2) · el commit fundacional Phase 0
  añadió +61 L con `api_health` + `api_place_detail`, restaurando además
  el archivo a estado parseable (2 382 L · ast.parse OK).
- **Content Engine V0 sin commit a master** — **CERRADO** por
  `dd42db3`. Los 3 039 L de `content_engine/` y los 34 archivos ahora
  viven en master, no en working tree suelto.
- **Experience Core (Next.js) sin commit a master** — **CERRADO** por
  `9b3fadf` (+ 7 hotfix TS). 99 archivos · 11 443 L en master, con
  `package.json` y `render.yaml` v2 para deployable independiente.
- **`requirements.txt` con basura Anaconda + Windows** — **CERRADO** por
  `97588fc` + `5e18e1f`. De 71 010 B a 2 631 B clean para Render Linux.
- **Frontend health probe consume mock en lugar de backend real** —
  **CERRADO** por `428070c`. `experience/lib/axon/endpoints/health.ts`
  ahora pega contra `/api/health/` real (+125 L de wiring).

### Cerrados por el ciclo AXÓN D1–D12
- **BUG-001 · `SECRET_KEY` con fallback inseguro** — cerrado.
- **BUG-003 · 6 funciones duplicadas en `views.py`** — cerrado en D3.
- **BUG-004 · Mapa multidimensional incompleto** — cerrado en D4–D6.
- **BUG-006 · `map.html` monolítico (881 L)** — cerrado en D7.
- **BUG-007 · Leaflet servido por CDN** — cerrado en D2.
- **BUG-009 · Utils duplicados (`google_maps_utils.py` x2)** — cerrado
  en D2.
- **BUG-010 · `kudos_app_urls.py` huérfano** — confirmado sin imports.
- **BUG-014 · Mind no reducido a 3 prompts** — cerrado en D12.
- **BUG-015 · Share blindado pendiente** — cerrado en D11.
- **BUG-021 · `staticfiles/` con duplicados de Leaflet** — mitigado.
- **BUG-018 · `.env` fuera del historial** — confirmado en `.gitignore`.

### Cerrados pre-AXÓN (verificación residual)
- **Feature Gating activado** (2026-05-15): `features.py`,
  `middleware.py`, `templatetags/feature_tags.py`, `base.html` nav
  PUBLIC reducida.
- **`db.sqlite3`, `__pycache__/`, `.env`** ya en `.gitignore`.
- **Migraciones 0005_userpreference y 0006_capsule_version_aport**
  aplicadas.

---

## Resumen ejecutivo

| Severidad | Items abiertos | Items cerrados desde 2026-05-15 |
|---|---|---|
| 🟥 Crítico | 3 (BUG-048 deploy frontend, BUG-002 tests, BUG-005 login social) | **5** (SECRET_KEY, duplicados, mapa, **HOME 500**, healthcheck) |
| 🟧 Alto | 12 (BUG-038 parcial, BUG-050 index, BUG-039/040/047/049/026/027/028/029/030/008/011/012/013) | 5 (map.html, Leaflet CDN, utils, Mind, Share, **content_engine commit**, **experience commit**, **requirements clean**, **health probe wiring**) |
| 🟨 Medio | 14 | — |
| 🟩 Bajo | 5 | — |
| **Total** | **~34 ítems** | **~16 cerrados** |

**Único bloqueante PROD hoy: BUG-048 (primer deploy frontend).** HOME 500
cerrado. El working tree local sigue con `urls.py`/`models.py` truncados
(BUG-038 parcial) pero **no afecta producción** porque Render sirve HEAD.
El FREEZE se mantiene; sólo se permiten fixes para bugs detectados en
demo / productivo (`FREEZE_v0.9_AXON_CORE.md §6`).
