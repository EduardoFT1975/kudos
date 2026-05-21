# PROJECT_STATUS.md — KUDOS / AXÓN

Última actualización: 2026-05-21 (auto · scheduled-task `actualizar-md`)
Responsable: Eduardo
Estado general: **FREEZE · v0.9-axon-core · 17 commits hotfix 2026-05-21 desplegados en Render · HOME 500 RESUELTO (manifest storage swap + view hardening) · ✨ Content Engine V0 commiteado a master · ✨ Experience Core (Next.js 15) commiteado a master · ⚠ working tree con `urls.py` y `models.py` aún truncados localmente (HEAD íntegro)**

Producto oficial: *Google Earth emocional + histórico + humano.*
Mandato vigente: **AXÓN FREEZE → validación productiva → Experience Core (Next.js) + Content Engine (Phase 11/12/13) coexistiendo en master.**

---

## Resumen ejecutivo

KUDOS atravesó la Fase 1 AXÓN completa entre el 2026-05-15 y el 2026-05-17:
de monolito Django con 80 rutas mezcladas y `map.html` de 1 039 líneas a un
**PUBLIC CORE de 7 pilares** sobre arquitectura feature-gated. Todo el código
heredado quedó preservado en DORMANT (40 prefijos bloqueados por
`DormantRouteMiddleware`, accesibles vía `KUDOS_FEATURE_<NAME>=1`).

El tag `v0.9-axon-core` se selló el 2026-05-17 (commit `42189bc`). Entre el
**2026-05-20 y el 2026-05-21 se cerraron 17 commits hotfix** que estabilizan
producción y consolidan los dos núcleos paralelos:

1. **Backend Django (`67fe207`)** · `STATICFILES_STORAGE` cambiado de
   `CompressedManifestStaticFilesStorage` → `CompressedStaticFilesStorage`
   + `home` view envuelta en try/except con fallback HttpResponse 200. Esto
   **cierra BUG-025 (HOME 500)** — la causa raíz fue
   `ValueError("Missing staticfiles manifest entry")` al servir assets sin
   entrada en el manifest post-`collectstatic`.
2. **Backend Django (`c42784a`)** · Ruta `/` restaurada a `views.home` real;
   healthcheck queda en `/healthcheck/` para infra pings; alias `/home/` se
   conserva como `home_full`.
3. **Backend Django (`dd42db3`)** · `content_engine/` commiteado a master
   (3 039 L Python · 13 módulos · 34 archivos). Endpoint canónico
   `POST /api/place-capsule`, `INSTALLED_APPS += ['content_engine',
   'corsheaders']`, CORS hardening de Phase 13, `CONTENT_ENGINE_GEOCACHE_ENABLED`
   env flag, modelo `Place` añadido a `kudos_app/models.py` (+96 L) +
   campos contextuales `place`, `parent_capsule`, `root_capsule`,
   `context_layer`, `importance_score`, `verified`.
4. **Backend Django (`dd42db3`)** · Phase 0 Foundation: endpoints
   `GET /api/health/` (JSON estable consumido por Experience) y
   `GET /api/places/<slug>/` (shape estable para `places/[slug]/page.tsx`).
   `kudos_app/tests.py` pasa de 10 L → 79 L con 3 TestCase
   (`HealthEndpointTestCase`, `PlaceDetailEndpointTestCase`,
   `CapsuleFoundationFieldsTestCase`).
5. **Frontend Next.js (`9b3fadf` + 7 hotfix TS)** · `experience/` commiteado
   a master por primera vez · 99 archivos · 11 443 L. Stack Next 15 + React 18
   (downgrade de 19 por compat) + TS 5.6 + Tailwind 3.4 + Plausible.
6. **Frontend Next.js (`a199e12`)** · Middleware `beta-route-gate` que
   redirige `/descubrir`, `/capsules`, `/places`, `/time` → `/aqui` con
   `307` cuando `BETA_HIDE_DORMANT=1`. **Cola de cápsulas capada**
   (`useCapsuleQueue.ts` 359 L). Restauración: una sola env flip.
7. **Infra (`97588fc` + `5e18e1f`)** · `requirements.txt` reconstruido para
   Render Linux (drop Anaconda + Windows junk) · 71 010 B → 1 268 B → 2 631 B.
8. **Infra (`a199e12`)** · `render.yaml` ampliado a 3 servicios:
   `kudos` (Django backend), `kudos-frontend` (Next.js, `rootDir: experience`,
   `BETA_HIDE_DORMANT=1`), `kudos-db` (Postgres compartida).

**Estado working tree (2026-05-21):** `views.py` ya **parsea OK** localmente
(2 382 L) pero **sigue incompleto respecto a HEAD** (2 448 L): faltan ~66 L
finales que cortan `capsule_aport_create` mid-función y borran
`capsule_aport_validate` entera. Parsea por casualidad (la función cortada
sin `return` simplemente devuelve `None`). `urls.py` (210 L) y `models.py`
(1 131 L) **siguen truncados con `SyntaxError`** — HEAD íntegro a 215 L y
1 210 L respectivamente. `render.yaml` working también truncado (15 L vs
89 L en HEAD). Render sirve el HEAD íntegro, no hay impacto productivo,
pero **Django no puede arrancar en local** hasta hacer
`git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py render.yaml`.
El índice git también sigue corrupto (`fatal: unknown index entry format
0x3a710000` · variante del `0x74000000` del 2026-05-19 y del `0x02000000`
en otra invocación · el formato exacto fluctúa pero la corrupción es
reincidente): `git log`, `git show` y `git diff HEAD --name-only` funcionan;
`git status` y `git diff <path>` no.

El **Content Engine V0 (Phase 11/12/13)** sigue con el master smoke
2026-05-20 14:04 UTC como referencia: **19 tests · 16 PASS · 2 WARN · 1
FAIL · 15.27 s** (Barcelona · Plaça Catalunya UNGROUNDED · resto de
capitales europeas pasa con ≥ 0.96 confidence). El módulo ahora vive en
master y se despliega con el backend.

El **Experience Core (Next.js 15)** ya no es un side-quest: el
`render.yaml` lo despliega como servicio independiente con CORS configurado
contra el origen del backend. Estructura final: 10+ rutas (`/`, `/aqui`,
`/descubrir`, `/mapa`, `/capsules/[slug]`, `/places/[slug]`, `/time/rome`,
`/health`), 8 dominios de componentes (`analytics/`, `atmosphere/`,
`capsule/`, `feed/`, `shell/`, `sidebar/`, `timeline/`, `ui/`), 8 dominios
de features (`capsule/`, `explore/`, `library/`, `map/`, `mind/`, `saved/`,
`time-machine/`, `timeline/`). Middleware beta-gate activo.

---

## Qué funciona

- **Tag git `v0.9-axon-core`** sellado (commit `42189bc`, 2026-05-17). HEAD
  intacto en remoto.
- **HEAD `master` (2026-05-21 16:03 UTC+2)** apunta a `67fe207` con HOME 500
  resuelto y producción servida sin errores reportados desde el commit.
- **Smoke test integral AXÓN · 29/29 checks** (parse AST · balance HTML ·
  null bytes · sin duplicados · 109 refs `views.X` resueltas · gating
  consistency · 15 PUBLIC pass · 16 DORMANT bloqueadas · 7 pilares vivos
  · identidad 17/17) — validado contra HEAD del tag.
- **PUBLIC CORE · 7/7 pilares operativos:**
  1. **Mapa 5D** (`/map/`): clustering (`L.markerClusterGroup` r45,
     `disableClusteringAtZoom 14`, `chunkedLoading`), bbox querying con
     debounce 250 ms, viewport-fit cover, mobile tuning 14/14.
  2. **Capsules** (`/capsules/`, `/capsules/<uid>/`): popup como portal
     contextual, 3 CTAs PUBLIC (Explorar / Compartir / Timeline), lazy
     popup vía `api_capsule_light`.
  3. **Search** (`/search/`): full-text + Nominatim OSM en el mapa.
  4. **Timeline** (`/timeline/`): `renderTimeline`, `centerTimeline(year)`,
     8 epochs, era styles.
  5. **Users** (`/`, `/profile/`, `/accounts/login/`, `/register/`).
  6. **Mind Lite** (`/mind/`, `/mind/ask/`): 3 prompts oficiales
     (`what` / `summary` / `near`), auto-fire si `?capsule=X`.
  7. **Share**: Web Share API + clipboard fallback + toast + OG completos
     + Twitter Card + Schema.org JSON-LD.
- **AXÓN Phase 0 Foundation (nuevo 2026-05-21):**
  - `GET /api/health/` JSON estable (`status`, `service`, `version`,
    `uptime`) — consumido por `experience/lib/axon/endpoints/health.ts`.
  - `GET /api/places/<slug>/` shape estable (`slug`, `name`, `country`,
    `lat`, `lon`, `summary`, `description`, `image`, `era_range.from`,
    `era_range.to`, `capsule_count`) — consumido por `app/places/[slug]/
    page.tsx`.
  - Modelo `Place` canónico (FK desde `Capsule.place`).
  - 3 TestCase Django nuevos (`HealthEndpointTestCase`,
    `PlaceDetailEndpointTestCase`, `CapsuleFoundationFieldsTestCase`).
- **HOME 500 resuelto (2026-05-21 16:03):**
  - `kudos_project/settings.py` · `STATICFILES_STORAGE` =
    `whitenoise.storage.CompressedStaticFilesStorage` (sin Manifest).
    Comentario inline explica que la variante Manifest exigía que **todo**
    `{% static %}` referenciado existiera post-`collectstatic` y cualquier
    asset suelto disparaba `ValueError("Missing staticfiles manifest
    entry")` → 500.
  - `kudos_app/views.py` · `home()` envuelve queries DB y `render()` en
    try/except con fallback `HttpResponse 200 text/plain`. Si **algo**
    falla (schema drift, DB connection, missing static, template error),
    el usuario ve un mensaje de mantenimiento en vez de 500.
  - Healthcheck movido a `/healthcheck/` (no a `/`), home real en `/`.
- **Feature gating en producción (FEATURE_GATE_AUDIT 2026-05-19):**
  - `DormantRouteMiddleware` activo en `MIDDLEWARE` (settings.py L82).
  - 35 features dormant declaradas con flag `False` en `_DORMANT`.
  - Override `KUDOS_FEATURE_<NAME>=1` implementado y testado.
  - 0 rutas dormant accidentales (verificación línea a línea de `urls.py`).
- **Content Engine V0 (Phase 11/12/13) commiteado a master (`dd42db3`):**
  - `content_engine/` (3 039 L Python · 34 archivos) registrado en
    `INSTALLED_APPS` y `kudos_project/urls.py`
    (`path('', include('content_engine.urls'))`).
  - Endpoint canónico `POST /api/place-capsule` (con back-compat
    `POST /api/capsule/nearby`).
  - Pipeline place-capsule sync: Wikidata SPARQL + Wikipedia REST, dedupe,
    grounding, ranking ponderado, landmark override sparse, truth-gate.
  - 3 modelos persistidos: `PlaceCapsule`, `GenerationAttempt`,
    `WikidataGeoCache` (migrations 0001 + 0002 aplicadas).
  - `django-ratelimit` en endpoint público (rate-limit ya activo aquí).
  - **CORS hardening Phase 13:** `corsheaders` instalado, `CorsMiddleware`
    pre-`CommonMiddleware`, `CORS_ALLOWED_ORIGINS` con detección de
    misconfig (`'*'` literal warning loud al boot).
  - **Master switch geocache:** `CONTENT_ENGINE_GEOCACHE_ENABLED` env flag
    (default ON) — flip a `0` revierte Stage 2 a SPARQL live-only sin
    borrar la tabla.
  - Harness `python manage.py run_master_smoke_map` con CSV + JSON en
    `reports/`. **Última ejecución 2026-05-20T14:04:31Z · 19 tests · 16
    PASS · 2 WARN · 1 FAIL · 15.27 s** (A 3/4 · B 2/2 +2 WARN · C 4/4 ·
    D 4/4 · E 3/3).
- **Experience Core commiteado a master (`9b3fadf` + 7 hotfix TS):**
  - 99 archivos · 11 443 L. Stack Next 15.x + React 18.x (pin tras
    `e52c81f`) + TS 5.6 + Tailwind 3.4 + Framer 11 + Radix + Lucide +
    Plausible.
  - Rutas (`experience/app/`): `(layout)`, `aqui`, `capsules/[slug]`,
    `descubrir`, `health`, `mapa`, `places/[slug]`, `time/rome` · más
    `error.tsx`, `loading.tsx`, `page.tsx` raíz.
  - Componentes (`experience/components/`): `analytics/`, `atmosphere/`,
    `capsule/` (PageAtmosphere, EchoNode, FragmentTrace, TemporalResonance,
    SpatialAnchor, Whisper, MediaVignette, LayerContainer,
    ColosseumSilhouette), `feed/` (DiscoveryFeed, CapsuleCard), `shell/`,
    `sidebar/`, `timeline/` (EraSlider), `ui/` (button, toast).
  - Features (`experience/features/`): `capsule/` (15 componentes incl.
    CapsuleSession, CapsuleStateRouter, ShareMoment, RecoveryPill,
    ManualLocationPicker, 7 sub-estados en `states/`), `explore/`,
    `library/`, `map/`, `mind/`, `saved/`, `time-machine/` (RomaMap,
    TimeMachine, HotspotMarker, EraAtmosphere, CapsuleOverlay), `timeline/`.
  - `lib/`: `axon/` (client, config, errors, types, endpoints capsules/
    feed/health/places), `api/` (capsules, django), `capsule/` (quality,
    useCapsuleQueue 359 L), `capsules/`, `curated/rome.ts`, `hooks/`
    (useIdleDwell, useSavedCapsules, useGeolocation), `mocks/`,
    `analytics/plausible.ts`, `utils/` (cn, format), `env/check.ts`,
    `timeline/` (eras, hotspots, types).
  - Motion: `motion/ambient.ts`, `motion/temporal.ts`, `motion/transitions.ts`.
  - Design system: `design-system/tokens.ts` (161 L).
  - **Middleware beta-gate** (`experience/middleware.ts`): redirige
    `/descubrir`, `/capsules`, `/places`, `/time` → `/aqui` con `307`
    cuando `BETA_HIDE_DORMANT=1`. Restauración 1-env-flip.
- **`render.yaml` ampliado a 3 servicios (`a199e12`):**
  - `kudos` (Django backend) · runtime python · `./build.sh` ·
    `gunicorn` · DATABASE_URL desde `kudos-db` · `CORS_ALLOWED_ORIGINS=
    https://kudos-frontend.onrender.com` pre-poblado.
  - `kudos-frontend` (Next.js) · runtime node 20 · `rootDir: experience`
    · `npm install && npm run build` · `npm start -- -p $PORT` ·
    `NEXT_PUBLIC_API_BASE_URL=https://kudos-40cq.onrender.com` ·
    `BETA_HIDE_DORMANT=1`.
  - `kudos-db` (Postgres free).
- **`requirements.txt` saneado** (`97588fc` → `5e18e1f`): de 71 010 B con
  Anaconda + Windows junk a 2 631 B limpios para Render Linux.
- **Leaflet local** en `static/vendor/leaflet/` (162 KB · v1.9.4).
- **`map.html` modularizado**: 167 L (de 1 039). CSS a `static/css/map5d.css`
  (399 L), JS a 10 módulos en `static/js/map5d/` (~670 L).
- **`views.py` en HEAD**: 2 448 L · 121 funciones · parsea OK ·
  0 duplicados · 0 F401 · contiene `capsule_aport_validate` íntegra
  (que el working tree local sigue sin tener).
- **23 snapshots `.snapshot.dX.YYYYMMDDTHHMMSSZ`** reversibles por fase
  verificados con sha256.
- **Deploy artefactos listos:** `Procfile`, `render.yaml` (v2 con frontend),
  `build.sh`, `runtime.txt` (python-3.11.9), `.env.production.example`,
  `kudos_project/sentry_init.py` opt-in.
- **Backups generados:** `outputs/kudos_v0.9-axon-core.20260517T085217Z.tar.gz`
  (87 MB · 724 archivos) + `outputs/kudos_db.20260517T085412Z.sqlite3`
  (9.52 MB · 53 tablas · 1 458 cápsulas · 10 users).

## Qué está roto / en riesgo

- **🟧 BLOCKER-LOCAL · 3 archivos núcleo truncados + `render.yaml` truncado
  en working tree.** Confirmado por `ast.parse` + `wc -l` 2026-05-21:
  - `kudos_app/views.py` working: 2 382 L · parsea OK pero **incompleto**
    (HEAD 2 448 L · faltan ~66 L finales · `capsule_aport_validate` borrada).
  - `kudos_app/urls.py` working: 210 L · `SyntaxError: '[' was never
    closed` en L11. HEAD íntegro a 215 L.
  - `kudos_app/models.py` working: 1 131 L · `SyntaxError: unterminated
    string literal` L1132. HEAD íntegro a 1 210 L.
  - `render.yaml` working: 15 L · cortado en pleno comentario. HEAD íntegro
    a 89 L con blueprint dos-servicios completo.
  - Bono: el índice git sigue corrupto (`fatal: unknown index entry
    format 0x3a710000` · byte fluctúa entre invocaciones); `git status`
    no funciona, `git log`, `git show` y `git diff HEAD --name-only` sí.
    `git diff HEAD --name-only` reporta **378 archivos divergentes** entre
    working tree y HEAD.
  - **Producción no afectada** (Render sirve HEAD íntegro), pero Django no
    arranca en local hasta el checkout. Por qué pasa de P0 a P1: Eduardo
    ha podido commitear 16 veces hoy esquivando el índice roto.
  - Fix mínimo:
    ```bash
    git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py render.yaml
    python -c "import ast; [ast.parse(open(f).read()) for f in
      ['kudos_app/views.py','kudos_app/urls.py','kudos_app/models.py']]"
    python manage.py check
    # Si el índice sigue corrupto:
    # rm .git/index && git read-tree HEAD
    ```
- **🟧 NAVEGACIÓN CONTAMINADA · ~30 enlaces dormant en PUBLIC
  templates** (FEATURE_GATE_AUDIT 2026-05-19, sin tocar). El gating en
  URL/middleware es correcto, pero los templates muestran botones a rutas
  dormant que devuelven 404 al clicarse: `home.html` 13, `capsule_detail
  .html` 7, `dashboard.html` 4, `ai_panel.html` 3. Solución conocida:
  envolver cada `{% url 'dormant_*' %}` en `{% if_feature %}` (~1-2 h
  sin tocar views.py ni urls.py). Mitigado parcialmente en Experience:
  `middleware.ts` redirige rutas frontend dormant a `/aqui`.
- **🟥 DUPLICADO URL pattern** (FEATURE_GATE_AUDIT 2026-05-19):
  `kudos_app/urls.py:186` y `:193` declaran ambos
  `path('mind/chat/', views.ai_chat, name='ai_chat')`. Django usa el
  primero; ruido en `reverse()`. Sin cambios desde el audit.
- **🟧 BARCELONA · Plaça Catalunya FAIL en master smoke 2026-05-20.**
  `failure_class=UNGROUNDED`, candidatos 10, latencia 3 390 ms. El
  resto de capitales europeas (Madrid, Roma, París) pasa con confidence
  ≥ 0.96. Anomalía pendiente en `content_engine/ranking.py` o
  `content_engine/landmarks.py`. Sin cambios desde 2026-05-20.
- **🟧 29 snapshots `.snapshot.*` + 7 templates duplicados + 5
  huérfanos en raíz** (DEBT_SCAN 2026-05-19, sin tocar): `1 208 654 B`
  de snapshots no referenciados; carpeta raíz `templates/` con 7 copias
  divergentes vs `kudos_app/templates/`; `settings.py` (0 B) huérfano en
  raíz; `kudos_app_urls.py` (407 B) duplicado.
- **🟧 17 inits de Leaflet copy-paste en templates feature** (DEBT_SCAN
  §2a) — todas dormant pero seguirán ejecutándose si se exponen.
- **🟧 3 rutas huérfanas** (DEBT_SCAN §3a): `home_full`, `onboarding`,
  `near`. Ahora `home_full` está usado (alias `/home/`), pero
  `onboarding` y `near` siguen sin link público.
- **🟧 4 views definidas sin wire** (DEBT_SCAN §3b):
  `personal_habit_toggle`, `personal_crypto`, `ai_mind_chat`,
  `bookmark_capsule`. Mover a `legacy_views.py` tras FREEZE.
- **`markercluster` aún vía CDN unpkg.com**: si unpkg cae, el cluster
  falla. Vendoring pendiente.
- **3 copias legacy de Leaflet** en `static/` (~1.7 MB dead-weight).
- **`legacy_views.py`** (2 160 L) sigue en `kudos_app/` — pospuesto
  conscientemente.
- **`map_view` ignora `?lat=&lon=&year=`** del cierre narrativo D10.
- **Sin rate limit** en `api_capsules_5d`, `api_capsule_light`,
  `ai_lite_ask` — el endpoint nuevo `place-capsule` sí lo tiene.
- **`ai_lite_ask` con heurística local** (sin Claude/OpenAI). Contrato
  JSON listo para sustitución cuando haya `ANTHROPIC_API_KEY`.
- **Sin login social** (django-allauth no instalado).
- **18 imports anidados** dentro de funciones en `views.py`.
- **4 scripts huérfanos rotos** en raíz (`art_culture.py`, `control.py`,
  `generate_capsules.py`, `social_impact.py`).
- **CORS_ALLOWED_ORIGINS pre-poblado** apunta a
  `https://kudos-frontend.onrender.com`, pero el origen real lo asigna
  Render en el primer deploy del frontend — puede llevar hash si el
  nombre ya estaba ocupado. **Validar tras primer deploy del servicio
  kudos-frontend.**
- **`experience/package-lock.json`** ya existe (`a199e12` lo añadió
  implícitamente al `npm install`), pero el `render.yaml` aún usa
  `npm install` en lugar de `npm ci` — trade-off documentado:
  ~30 s extra de build vs reproducibilidad estricta.

## Qué falta para MVP demo público

Los 🔴 LAUNCH BLOCKERS productivos quedan reducidos a 5 (de 7):

1. ~~Restaurar `views.py`~~ ✅ resuelto (commit `dd42db3`).
2. ~~Resolver HOME 500~~ ✅ resuelto (commit `67fe207` · revertir
   healthcheck ya hecho en `c42784a`).
3. **Restaurar `urls.py` y `models.py` en working tree desde HEAD**
   (BLOCKER-LOCAL · sólo afecta dev local).
4. **Validar primer deploy del frontend en Render** — confirmar URL
   real del servicio `kudos-frontend` y actualizar `CORS_ALLOWED_ORIGINS`
   del backend si difiere de la pre-poblada.
5. **Gatear las ~30 fugas dormant en plantillas PUBLIC** (1-2 h, sin
   tocar views ni urls).
6. **Validación Lighthouse Mobile en entorno real**: target ≥ 80 en
   Performance / A11y / SEO / Best Practices.
7. **Smoke navegacional físico mobile** (iOS Safari + Android Chrome
   reales) — ahora con Experience desplegado, validar también el flow
   `/aqui` post-redirect.
8. **Preview de share** validado en WhatsApp / Twitter / Telegram /
   LinkedIn.
9. **Diagnosticar Barcelona UNGROUNDED** en Content Engine (Plaça
   Catalunya falla mientras el resto de capitales pasa con ≥ 0.96
   confidence).

Bloque Experience Core (paralelo, ya desplegable en Render):
- Stack en master + middleware beta-gate activo. Pendiente: validar
  primer build en Render y consolidar Design System v1.0 contra
  componentes ya escritos (PageAtmosphere/EchoNode/Whisper et al.).

## Próximo paso exacto

**1) Restaurar `kudos_app/{views,urls,models}.py` + `render.yaml` desde
HEAD (BLOCKER-LOCAL).**

```bash
git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py render.yaml
python -c "import ast; [ast.parse(open(f).read()) for f in \
  ['kudos_app/views.py','kudos_app/urls.py','kudos_app/models.py']]"
python manage.py check
python manage.py runserver
# Si el índice git sigue corrupto:
# rm .git/index && git read-tree HEAD
```

**2) Verificar primer deploy del servicio `kudos-frontend` en Render** y
confirmar `NEXT_PUBLIC_API_BASE_URL` + `CORS_ALLOWED_ORIGINS` reales.

**3) Validar que HOME ya no devuelve 500** en producción (commit `67fe207`
debería haberlo cerrado · monitorizar 24 h).

**4) Sesión única de hardening template-layer** (~1-2 h, sin tocar
views.py): envolver los ~30 `{% url 'dormant_*' %}` listados en
`FEATURE_GATE_AUDIT_20260519.md §6` con `{% if_feature %}`.

**5) Investigar Barcelona UNGROUNDED en Content Engine** (`content_engine/
ranking.py` o `content_engine/landmarks.py`) — los 10 candidatos llegan
pero ninguno gana grounding.

**6) Reparar índice git corrupto** (cuando Eduardo esté en la máquina
afectada). Workaround: trabajar con `git log`/`git show`; reset:
`rm .git/index && git read-tree HEAD` (con backup previo).

Reglas durante FREEZE (`FREEZE_v0.9_AXON_CORE.md §6`):
- ✗ NO nuevas features.
- ✗ NO nueva arquitectura.
- ✓ SÍ bugs detectados en demo / productivo.
- ✓ SÍ ajustes de copy.
- ✓ SÍ completar 🔴 LAUNCH BLOCKER de `KNOWN_DEBTS.md`.
- ✓ SÍ Content Engine + Experience Core (decisión consciente:
  pipelines paralelos, ya en master).

---

## Métricas clave (snapshot 2026-05-21)

| Métrica | Objetivo MVP | Valor actual | Δ vs 2026-05-20 |
|---|---|---|---|
| Tag git productivo | `v0.9-axon-core` | `v0.9-axon-core` ✅ | 0 |
| Commits hotfix 2026-05-21 | n/a | 16 ✅ | +16 |
| HEAD master | íntegro | `67fe207` ✅ | nuevo |
| Smoke test integral AXÓN | 100 % | 29/29 ✅ (sobre HEAD) | 0 |
| Smoke Content Engine (master map) | ≥ 90 % PASS | 16/19 PASS · 2 WARN · 1 FAIL (84 %) | 0 |
| Pilares PUBLIC operativos (HEAD) | 7 | 7 ✅ | 0 |
| Identidad visual preservada | sí | 17/17 ✅ | 0 |
| CTA DORMANT visibles al usuario (Django) | 0 | ~30 ⚠ | 0 |
| CTA DORMANT visibles al usuario (Experience) | 0 | 0 ✅ (middleware 307) | nuevo |
| `views.py` líneas (HEAD/working) | ≤ 2 500 | 2 448 / **2 382 ⚠ incompleto** (parsea pero falta `capsule_aport_validate`) | working aún -66 L vs HEAD |
| `urls.py` líneas (HEAD/working) | parseable | 215 / **210 ⚠ SyntaxError** | sin cambio (sigue truncado) |
| `models.py` líneas (HEAD/working) | parseable | 1 210 / **1 131 ⚠ SyntaxError** | sin cambio |
| `render.yaml` líneas (HEAD/working) | 2 servicios + DB | 89 / **15 ⚠ truncado** | regresión local nueva |
| Git index | sano | ⚠ corrupto (formato fluctuante · `0x3a710000`/`0x02000000`/`0x70680000`) | sigue corrupto |
| Archivos divergentes working vs HEAD | n/a | 378 (`git diff HEAD --name-only`) | nuevo dato |
| Funciones duplicadas en `views.py` (HEAD) | 0 | 0 ✅ | 0 |
| F401 imports muertos (HEAD) | 0 | 0 ✅ | 0 |
| `map.html` líneas | ≤ 200 | 167 ✅ | 0 |
| Módulos JS map5d | ≥ 8 | 10 ✅ | 0 |
| Payload inicial API z=3 | < 100 KB | ~40 KB ✅ | 0 |
| Markers DOM en pantalla (z=3) | ≤ 200 | ~30 clusters ✅ | 0 |
| Time To First Marker (proyectado) | < 1.2 s | < 1.2 s ✅ | 0 |
| Rutas PUBLIC respondiendo (prod) | 7 / 7 | **7 / 7 ✅ (HOME 500 cerrado)** | +1 |
| Rutas DORMANT respondiendo 404 | 16 / 16 smoke | 16 / 16 ✅ | 0 |
| Rutas dormant accidentales (audit) | 0 | 0 ✅ | 0 |
| Templates PUBLIC con links dormant | 0 | 7 templates ⚠ (~30 enlaces) | 0 |
| Duplicados URL en `urls.py` | 0 | 1 ⚠ (`mind/chat/` x2) | 0 |
| Snapshots `.snapshot.*` en árbol | gitignored | 29 archivos · 1.2 MB ⚠ | 0 |
| Templates duplicados raíz vs app | 0 | 7 ⚠ | 0 |
| Leaflet inits copy-paste (templates) | 1 helper | 17 ⚠ | 0 |
| Imports muertos core (DEBT_SCAN) | 0 | ~20 (volumen bajo) | 0 |
| Templates > 300 L | ≤ 2 | 5 ⚠ | 0 |
| Leaflet copias en `static/` | 1 (vendor) | 1 vendor + 3 legacy ⚠ | 0 |
| `markercluster` vía CDN | local | unpkg.com ⚠ | 0 |
| Content Engine líneas Python | n/a | 3 039 L · 13 módulos · **en master** | commiteado |
| Content Engine tests automatizados | ≥ 15 | 19 (master_test_map · PASS/WARN/FAIL) | 0 |
| Content Engine latencia media | < 3 s | 0.80 s p50 · 4.68 s p95 ⚠ | 0 |
| Content Engine rate-limit | sí | sí (`django-ratelimit`) ✅ | 0 |
| AXÓN Phase 0 endpoints | 2 (`/api/health/`, `/api/places/<slug>/`) | 2 ✅ | nuevo |
| Tests Django nuevos Phase 0 | ≥ 3 | 3 ✅ (Health/Place/CapsuleFoundation) | +3 |
| Snapshots reversibles | ≥ 1/fase | 23 ✅ | 0 |
| Backups pre-deploy | repo + DB | tar 87 MB + DB 9.5 MB ✅ | 0 |
| Tests automatizados Django (`kudos_app/tests.py`) | ≥ 5 smoke | 4 (CapsuleTestCase + 3 nuevos) | +3 |
| Lighthouse Mobile Perf (real) | ≥ 80 | sin medir | 0 |
| Base de datos productiva | PostgreSQL | DATABASE_URL en Render | 0 |
| Deploy live backend | ✓ | ✓ Render (kudos-40cq.onrender.com) | HOME OK |
| Deploy live frontend | ✓ | pendiente primer deploy (render.yaml listo) | nuevo |
| Servicios Render | ≥ 2 | 3 (kudos, kudos-frontend, kudos-db) | +2 |
| Experience Core rutas (en master) | ≥ 4 | 10+ (`/`, `/aqui`, `/descubrir`, `/mapa`, `/capsules/[slug]`, `/places/[slug]`, `/time/rome`, `/health`, layout, error) | +4 |
| Experience Core componentes (en master) | ≥ 5 | 8 dominios · 30+ componentes | +15+ |
| Experience Core features | n/a | 8 dominios · 30+ componentes | nuevo |
| Experience Core analytics | sí | Plausible montado | 0 |
| Experience Core líneas TS (commit) | n/a | 11 443 L (commit `9b3fadf`) | commiteado |
| Experience Core middleware beta-gate | sí | sí (`BETA_HIDE_DORMANT=1`) | nuevo |
| `requirements.txt` tamaño | minimal | 2 631 B ✅ (era 71 010 B con basura) | reducido |
| `render.yaml` servicios definidos | n/a | 3 (backend + frontend + db) | +2 |
| CORS hardening | sí | sí (corsheaders + warning de misconfig) | nuevo |

---

## Cambios desde la última actualización (2026-05-20 → 2026-05-21)

### Backend Django · 4 commits que resuelven HOME 500 y consolidan Phase 0
- **`67fe207` (16:03 UTC+2)** · `fix(prod 500): swap manifest static
  storage + harden home view`. Causa raíz HOME 500 aislada:
  `ValueError("Missing staticfiles manifest entry")` al servir
  `home.html` con `CompressedManifestStaticFilesStorage`. Fix:
  - `STATICFILES_STORAGE` → `CompressedStaticFilesStorage` (sin
    Manifest, sin cache-busting, sirve los ficheros tal cual).
  - `home()` view envuelta en try/except triple: queries DB + render
    template + fallback `HttpResponse 200 text/plain`. **`raise` jamás
    propaga**; logs registran el traceback para diagnóstico.
- **`b0ef894`** · `fix: remove unsafe unicode prints from settings` ·
  prints con emojis (`⚠`) sustituidos por ASCII safe (no `UnicodeEncodeError`
  en Render Linux locale).
- **`dd42db3` (14:53 UTC+2)** · `fix: add backend content_engine and
  sync Django AXON routes` · **mega-commit fundacional Phase 0**:
  - `content_engine/` (3 039 L · 34 archivos) entra a master.
  - `kudos_app/models.py` +96 L · campos Phase 0 en `Capsule`
    (`place` FK, `parent_capsule`/`root_capsule` para árbol contextual,
    `context_layer` 5-choices, `importance_score`, `verified`) + modelo
    `Place` canónico.
  - `kudos_app/views.py` +61 L · endpoints `api_health` +
    `api_place_detail` + import `Place` + `_AXON_BOOT_TS`.
  - `kudos_app/urls.py` +4 L · rutas `/api/health/`, `/api/places/<slug>/`.
  - `kudos_app/admin.py` +11 L · admin del nuevo modelo `Place`.
  - `kudos_app/tests.py` 10 L → 79 L · 3 TestCase nuevos
    (Health/Place/CapsuleFoundation).
  - `kudos_project/settings.py` +112 L · `INSTALLED_APPS += ['content_engine',
    'corsheaders']`, `CorsMiddleware` pre-`CommonMiddleware`,
    `CORS_ALLOWED_ORIGINS` con detección de misconfig, master switch
    `CONTENT_ENGINE_GEOCACHE_ENABLED`.
  - `kudos_project/urls.py` +4 L · `include('content_engine.urls')`.
- **`428070c`** · `fix: rewire health probe to real AXON endpoint` ·
  Experience health page consume `/api/health/` real del backend
  (`experience/lib/axon/endpoints/health.ts` +125 L) en vez del mock.
- **`c42784a` (2026-05-20)** · `fix: restore real home route` · home
  vuelve a `/`, healthcheck movido a `/healthcheck/`, alias `/home/`
  como `home_full`.

### Infra · 4 commits de saneamiento despliegue Render
- **`97588fc`** · `fix: rebuild clean requirements for Render Linux` ·
  71 010 B (Anaconda + Windows junk) → 1 268 B clean.
- **`5e18e1f`** · `fix: rebuild requirements.txt clean (drop Anaconda+
  Windows junk)` · ajuste fino → 2 631 B.
- **`09b7b8c`** · `fix: force add ignored env check` ·
  `experience/lib/env/check.ts` (+121 L) commiteado tras override de
  `.gitignore`.
- **`a199e12` (11:45 UTC+2)** · `beta: hide dormant routes, cap queue`:
  - `experience/middleware.ts` (+43 L) · redirige `/descubrir`,
    `/capsules`, `/places`, `/time` → `/aqui` 307 si
    `BETA_HIDE_DORMANT=1`.
  - `experience/lib/capsule/useCapsuleQueue.ts` (+359 L) · cola con
    cap (límite duro, sin growth unbounded).
  - `render.yaml` +65 L → ahora 3 servicios (backend `kudos`,
    frontend `kudos-frontend` con `rootDir: experience` +
    `BETA_HIDE_DORMANT=1`, db `kudos-db`).

### Frontend Next.js · 8 commits que llevan Experience a master
- **`7d92623`** · `fix: add frontend package.json` (+42 L).
- **`9b3fadf`** · `fix: add frontend files` · **99 archivos · 11 443 L**
  · todo `experience/` (rutas, componentes, features, lib, motion,
  design-system, hooks, types, configs).
- **`e52c81f`** · `fix: pin react 18 for next 15` · React 19 →
  React 18 por compat con Next 15.
- **`c063ad6`** · `fix: align react type deps` · `@types/react` matching.
- **`aa4df68`** · `fix: narrow null + undefined on place.lat/lon for
  strict TS` · `experience/app/places/[slug]/page.tsx`.
- **`fe70316`** · `fix: coerce null last_capsule_id for Plausible
  EventProps` · `experience/features/capsule/CapsuleSession.tsx`.
- **`1665e6e`** · `fix: destructure signal+csrfToken in askMind for
  strict TS` · `experience/lib/api/django.ts`.

### Cerrados vs `BUG_LIST.md` (2026-05-19/20)
- **BUG-025 · HOME 500 en producción** → **CERRADO** por `67fe207`.
  Causa raíz aislada (manifest storage). Fallback hardening evita
  futuros 500 por cualquier excepción no controlada en `home()`.
- **BUG-038 · 3 archivos núcleo truncados (working tree)** → **PARCIAL**
  · `views.py` parsea (2 382 L) pero sigue **incompleto** (HEAD 2 448 L ·
  faltan ~66 L finales). `urls.py` y `models.py` siguen con `SyntaxError`.
  `render.yaml` se suma como cuarto archivo truncado en working tree
  (BUG-038b).
- **Healthcheck temporal en `/`** → **CERRADO** por `c42784a`. Home real
  restaurada el 2026-05-20.

### Abierto nuevo vs `BUG_LIST.md` (2026-05-19/20)
- **BUG-048 · Primer deploy frontend en Render pendiente** · `render.yaml`
  v2 con `kudos-frontend` listo, sin ejecutar. Validar
  `NEXT_PUBLIC_API_BASE_URL` real + `CORS_ALLOWED_ORIGINS`.
- **BUG-049 · `package-lock.json` aún no commiteado** · `render.yaml`
  usa `npm install` (no `npm ci`), trade-off documentado.
- **BUG-050 · Git index corrupto persistente** · `fatal: unknown index
  entry format 0x70680000` (hoy) · variante del `0x74000000` del
  2026-05-19. Necesita `rm .git/index && git read-tree HEAD`.

Ver `BUG_LIST.md` para el detalle actualizado y los bugs heredados.
