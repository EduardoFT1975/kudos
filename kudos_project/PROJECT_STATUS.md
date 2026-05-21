# PROJECT_STATUS.md — KUDOS / AXÓN

Última actualización: 2026-05-20 (auto · scheduled-task `actualizar-md`)
Responsable: Eduardo
Estado general: **FREEZE · v0.9-axon-core · desplegado en Render · HOME 500 sin resolver · ⚠ working tree con 3 archivos núcleo truncados (`views.py`, `urls.py`, `models.py`) · ✨ Content Engine V0 operativo en paralelo**

Producto oficial: *Google Earth emocional + histórico + humano.*
Mandato vigente: **AXÓN FREEZE → validación productiva → Experience Core (Next.js) + Content Engine (Phase 11/12/13) en paralelo.**

---

## Resumen ejecutivo

KUDOS atravesó la Fase 1 AXÓN completa entre el 2026-05-15 y el 2026-05-17:
de monolito Django con 80 rutas mezcladas y `map.html` de 1 039 líneas a un
**PUBLIC CORE de 7 pilares** sobre arquitectura feature-gated. Todo el código
heredado quedó preservado en DORMANT (40 prefijos bloqueados por
`DormantRouteMiddleware`, accesibles vía `KUDOS_FEATURE_<NAME>=1`).

El tag `v0.9-axon-core` se selló el 2026-05-17 (commit `42189bc`). Render
desplegó el repo (commits `4c95267`, `c8437df`, `11c5da6`) y la infraestructura
responde, pero `/` devuelve 500 en producción con un traceback aún no aislado;
se aplicó una ruta `healthcheck` temporal y la `home` original se movió a
`/home/` (`name='home_full'`) para diagnosticar sin tocar `settings`,
`middleware`, `whitenoise` ni DB.

**Estado crítico working tree (2026-05-19 → 2026-05-20):** la auditoría
`CORE_HEALTH.md` ejecutada el 2026-05-19 confirma que el árbol de trabajo tiene
**tres archivos núcleo truncados** (no sólo `views.py`): `views.py` (2 375 L,
EOF en `if request.POS`), `urls.py` (209 L, EOF en `'personal_healt`) y
`models.py` (1 131 L, EOF en `verbose_name = '`). `ast.parse` confirma
`SyntaxError` en los tres. `git status` también está roto
(`fatal: unknown index entry format 0x74000000`), pero `git log` y
`git show HEAD:<path>` funcionan, así que la recuperación desde HEAD del tag
`v0.9-axon-core` es viable. Mientras esto no se resuelva, **Django no puede
importar `kudos_app`** y por tanto **todas las rutas devolverán 500** en local.

Tres reportes nuevos completan el panorama (2026-05-19):
`CORE_HEALTH.md`, `DEBT_SCAN_REPORT.md`, `FEATURE_GATE_AUDIT_20260519.md`. El
gating estructural está VERDE (middleware activo, registry único, 0 rutas
dormant fugadas), pero la **navegación está contaminada**: ~30 enlaces a rutas
dormant aparecen visibles en plantillas PUBLIC (home.html: 13, capsule_detail
.html: 7, dashboard.html: 4, ai_panel.html: 3).

En paralelo se materializó el **Content Engine V0** (Phase 11/12/13) — un
nuevo módulo Django `content_engine/` (3 039 L Python · 2026-05-19 → 2026-05-20)
con el pipeline place-capsule Wikidata + Wikipedia, endpoint canónico
`POST /api/place-capsule`, ranking ponderado, landmark override, truth-gate y
harness de smoke `run_master_smoke_map`. Última ejecución 2026-05-20 14:04
UTC: **19 tests · 16 PASS · 2 WARN · 1 FAIL** (Barcelona · Plaça Catalunya
UNGROUNDED). Registrado en `INSTALLED_APPS` y `kudos_project/urls.py`. Usa
`django-ratelimit` en el endpoint.

El Experience Core (Next.js 15) avanzó más allá del scaffolding inicial:
nuevas rutas `/aqui`, `/health`, `/capsules/[slug]`, `/places/[slug]`,
`/time/rome`; 10+ componentes (`capsule/PageAtmosphere`, `EchoNode`,
`FragmentTrace`, `TemporalResonance`, `SpatialAnchor`, `Whisper`,
`MediaVignette`, `LayerContainer`, `ColosseumSilhouette`, feed
`DiscoveryFeed`/`CapsuleCard`, timeline `EraSlider`, UI `button`/`toast`);
analytics `PlausibleProvider`; `lib/` con `capsule/`, `capsules/`, `curated/`,
`timeline/`, `axon/`, `hooks/`, `mocks/`, `analytics/`. Ya no está bloqueado a
la espera del Design System v1.0 — está construyendo identidad propia
mientras Django se estabiliza.

---

## Qué funciona

- **Tag git `v0.9-axon-core`** sellado (commit `42189bc`, 2026-05-17). HEAD
  intacto en remoto y recuperable con `git show HEAD:<path>`.
- **Smoke test integral AXÓN · 29/29 checks** (parse AST · balance HTML · null
  bytes · sin duplicados · 109 refs `views.X` resueltas · gating consistency ·
  15 PUBLIC pass · 16 DORMANT bloqueadas · 7 pilares vivos · identidad
  17/17) — todo validado contra HEAD del tag.
- **PUBLIC CORE · 7/7 pilares operativos (en HEAD del tag):**
  1. **Mapa 5D** (`/map/`): clustering (`L.markerClusterGroup` r45,
     `disableClusteringAtZoom 14`, `chunkedLoading`), bbox querying con
     debounce 250 ms, viewport-fit cover, mobile tuning 14/14.
  2. **Capsules** (`/capsules/`, `/capsules/<uid>/`): popup como portal
     contextual, 3 CTAs PUBLIC (Explorar / Compartir / Timeline), lazy popup
     vía `api_capsule_light`.
  3. **Search** (`/search/`): full-text + Nominatim OSM en el mapa.
  4. **Timeline** (`/timeline/`): `renderTimeline`, `centerTimeline(year)`,
     8 epochs, era styles.
  5. **Users** (`/`, `/profile/`, `/accounts/login/`, `/register/`).
  6. **Mind Lite** (`/mind/`, `/mind/ask/`): 3 prompts oficiales
     (`what` / `summary` / `near`), auto-fire si `?capsule=X`.
  7. **Share**: Web Share API + clipboard fallback + toast + OG completos +
     Twitter Card + Schema.org JSON-LD.
- **Feature gating en producción (verificado por FEATURE_GATE_AUDIT
  2026-05-19):**
  - `DormantRouteMiddleware` activo en `MIDDLEWARE` (settings.py L82).
  - 35 features dormant declaradas con flag `False` en `_DORMANT`.
  - Override `KUDOS_FEATURE_<NAME>=1` implementado y testado.
  - 0 rutas dormant accidentales (verificación línea a línea de `urls.py`).
- **Content Engine V0 (Phase 11/12/13) — NUEVO 2026-05-19 → 2026-05-20:**
  - `content_engine/` (3 039 L Python) registrado en `INSTALLED_APPS` y en
    `kudos_project/urls.py` (`path('', include('content_engine.urls'))`).
  - Endpoint canónico `POST /api/place-capsule` (con back-compat
    `POST /api/capsule/nearby`).
  - Pipeline place-capsule sync: Wikidata SPARQL + Wikipedia REST, dedupe,
    grounding, ranking ponderado, landmark override sparse, truth-gate.
  - 3 modelos persistidos: `PlaceCapsule`, `GenerationAttempt`,
    `WikidataGeoCache` (migrations 0001 + 0002 aplicadas).
  - `django-ratelimit` en endpoint público (rate-limit ya activo aquí).
  - Harness `python manage.py run_master_smoke_map` con CSV + JSON en
    `reports/`. **Última ejecución 2026-05-20T14:04:31Z · 19 tests · 16 PASS ·
    2 WARN · 1 FAIL · 15.27 s · 13/19 con confidence 0.75–1.00 ·
    landmark_override viable (Carracedelo Q2900203, Las Médulas Q1618272).**
  - Cobertura por grupo (último smoke): A direct_landmark 3/4 · B
    rural_generic 2/2 (+ 2 WARN) · C direct_landmark 4/4 · D empty 4/4 · E
    international 3/3.
- **Leaflet local** en `static/vendor/leaflet/` (162 KB · v1.9.4).
- **`map.html` modularizado**: 167 L (de 1 039). CSS a `static/css/map5d.css`
  (399 L), JS a 10 módulos en `static/js/map5d/` (~670 L) — core, layers,
  clustering, popups, markers, search, timeline, mobile, ui, share.
- **`views.py` saneado en HEAD del tag**: 2 356 L · **0 funciones duplicadas** ·
  **0 F401** (working tree truncado a 2 375 L, ver blocker).
- **23 snapshots `.snapshot.dX.YYYYMMDDTHHMMSSZ`** reversibles por fase
  (d3/d4/d5/d6/d7/d10/d12/debug-home) verificados con sha256. Snapshot
  `views.py.snapshot.debug-home.20260517T140529Z` (97 715 B) candidato canónico
  para restaurar.
- **Deploy artefactos listos:** `Procfile`, `render.yaml`, `build.sh`,
  `runtime.txt` (python-3.11.9), `railway.json` (Plan B),
  `.env.production.example`, `kudos_project/sentry_init.py` opt-in.
- **Backups generados:** `outputs/kudos_v0.9-axon-core.20260517T085217Z.tar.gz`
  (87 MB · 724 archivos) + `outputs/kudos_db.20260517T085412Z.sqlite3`
  (9.52 MB · 53 tablas · 1 458 cápsulas · 10 users).
- **Experience Core en construcción activa (Next.js 15):**
  - Stack: Next 15 + React 19 + TS 5.6 + Tailwind 3.4 + Framer 11 + Radix +
    Lucide + Plausible.
  - Nuevas rutas: `/`, `/aqui`, `/health`, `/capsules/[slug]`,
    `/places/[slug]`, `/time/rome` (con loading.tsx + error.tsx + not-found
    .tsx donde aplica).
  - 10+ componentes: `capsule/` (PageAtmosphere, EchoNode, FragmentTrace,
    TemporalResonance, SpatialAnchor, Whisper, MediaVignette, LayerContainer,
    ColosseumSilhouette), `feed/` (DiscoveryFeed, CapsuleCard), `timeline/`
    (EraSlider), `ui/` (button, toast), `analytics/` (PlausibleProvider).
  - `lib/`: api (capsules, django), capsule/, capsules/, curated/, timeline/,
    axon/, hooks/, mocks/, analytics/, utils/.

## Qué está roto / en riesgo

- **🟥 BLOCKER-CORE · 3 archivos núcleo truncados en working tree
  (CORE_HEALTH 2026-05-19).** Confirmado por `ast.parse`:
  - `kudos_app/views.py` (98 493 B · 2 375 L) — EOF en
    `if request.POS` (función `capsule_aport_validate` L2370).
  - `kudos_app/urls.py` (10 173 B · 209 L) — EOF en `name='personal_healt`
    (string sin cerrar).
  - `kudos_app/models.py` (46 756 B · 1 131 L) — EOF en `verbose_name = '`
    (string sin cerrar).
  - Bono: el índice git está corrupto (`fatal: unknown index entry format
    0x74000000`); `git status` y `git status --short` fallan, pero `git log`,
    `git show HEAD:<path>` y `git checkout HEAD -- <path>` funcionan.
  - Sin esto resuelto, Django **no importa** `kudos_app` y todas las rutas
    devuelven 500 en local. Render sigue sirviendo el binario del commit
    `11c5da6` (que sí está íntegro), por eso producción no se ha caído por
    este motivo.
  - Fix mínimo:
    ```bash
    git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py
    python -c "import ast; [ast.parse(open(f).read()) for f in
      ['kudos_app/views.py','kudos_app/urls.py','kudos_app/models.py']]"
    python manage.py check
    ```
- **🟥 HOME 500 en producción (sin cambios desde 2026-05-17).** `/` devuelve
  500 con DEBUG=True en Render (custom page). Causa aún no aislada (a falta
  de leer Render → Logs). Fix temporal sigue vigente: ruta `healthcheck`
  antes de `home` en `kudos_app/urls.py:16`; la home original sigue en
  `/home/` (`name='home_full'`). Snapshots de reversión:
  `kudos_app/urls.py.snapshot.debug-home.20260517T140529Z` y
  `kudos_app/views.py.snapshot.debug-home.20260517T140529Z`. Ver
  `DEBUG_HOME_500.md` para el árbol de causa.
- **🟥 NAVEGACIÓN CONTAMINADA · ~30 enlaces dormant en PUBLIC**
  (FEATURE_GATE_AUDIT 2026-05-19). El gating en URL/middleware es correcto,
  pero los templates muestran botones a rutas dormant que devuelven 404 al
  clicarse: `home.html` 13 enlaces (feed/social/wisdom/marketplace/
  space_exploration/etc.), `capsule_detail.html` 7 enlaces "multidimensional"
  (audio/AR/dialog/versions/aport/enrich), `dashboard.html` 4 (proposal/
  mental_health/export/achievements), `ai_panel.html` 3 forms Mind Full
  (directive_toggle/insight_accept/insight_archive). Solución conocida:
  envolver cada `{% url 'dormant_*' %}` en `{% if_feature %}` (~1-2 h sin
  tocar views.py ni urls.py).
- **🟥 DUPLICADO URL pattern** (FEATURE_GATE_AUDIT 2026-05-19):
  `kudos_app/urls.py:186` y `:193` declaran ambos
  `path('mind/chat/', views.ai_chat, name='ai_chat')`. Django usa el primero;
  ruido en `reverse()`.
- **🟥 BARCELONA · Plaça Catalunya FAIL en master smoke 2026-05-20.**
  `failure_class=UNGROUNDED`, candidatos 10, latencia 3 390 ms. El
  pipeline trae candidatos pero no logra grounding/ranking suficiente. El
  resto de capitales europeas (Madrid, Roma, París) pasa con confidence
  ≥ 0.96. Anomalía a investigar en `content_engine/ranking.py` o
  `content_engine/landmarks.py`.
- **🟧 29 snapshots `.snapshot.*` + 7 templates duplicados + 5 huérfanos en
  raíz** (DEBT_SCAN 2026-05-19): `1 208 654 B` de snapshots no referenciados;
  carpeta raíz `templates/` con 7 copias divergentes vs `kudos_app/templates/`
  (control_panel.html: 1 707 B vs 21 474 B drástico); `settings.py` (0 B)
  huérfano en raíz; `kudos_app_urls.py` (407 B) duplicado; `vista_kudos_final
  .html` ≡ `vista_previa_kudos.html` (mismo MD5); `space_exploration -
  copia.html`; `dump.rdb`, `ipfs_daemon.log`, `celerybeat-schedule.*`,
  `resolv.conf`, `deployment_log.txt`.
- **🟧 17 inits de Leaflet copy-paste en templates feature** (DEBT_SCAN §2a):
  `art_culture`, `capsule_museum`, `control_panel`, `education_plan*`,
  `governance`, `historical_map`, `infrastructure`, `innovation`,
  `market_transactions`, `research`, `seller_profile`, `social_impact`,
  `space_badge_*`, `tourism_badge_confirmation` — todas dormant pero seguirán
  ejecutándose si se exponen. Bloquea prioridad #2 (mobile) y #4 (cluster
  central).
- **🟧 3 rutas huérfanas** (DEBT_SCAN §3a): `home_full` (esperable),
  `onboarding` y `near` (rutas reales del MVP sin link público — falta
  enlazar o congelar).
- **🟧 4 views definidas sin wire** (DEBT_SCAN §3b): `personal_habit_toggle`,
  `personal_crypto`, `ai_mind_chat`, `bookmark_capsule`. Cementerio. Mover a
  `legacy_views.py` (que ya existe, 2 160 L) tras FREEZE.
- **`markercluster` aún vía CDN unpkg.com**: si unpkg cae, el cluster falla y
  los markers se sobreponen. Vendoring pendiente (sandbox sin red).
- **3 copias legacy de Leaflet** en `static/` (`leaflet.js`, `leaflet-src.js`,
  `leaflet-src.esm.js`) + `.map` files conviven con la canónica
  `static/vendor/leaflet/leaflet.js`. ~1.7 MB de static dead-weight.
- **`legacy_views.py`** (2 160 L) sigue en `kudos_app/` — pospuesto
  conscientemente para no introducir cambios pre-tag (mandato D13).
- **`map_view` ignora `?lat=&lon=&year=`** del cierre narrativo D10: el CTA
  "Ver en mapa 5D" llega al mapa pero carga vista mundial.
- **Sin rate limit** en `api_capsules_5d`, `api_capsule_light`, `ai_lite_ask`
  — vulnerable a martilleo (el endpoint nuevo `place-capsule` sí lo tiene).
- **`ai_lite_ask` con heurística local** (sin Claude/OpenAI). Funcional pero
  limitada a 3 templates server-side. Contrato JSON ya listo para
  sustitución cuando haya `ANTHROPIC_API_KEY` productiva.
- **`tests.py` = 10 líneas** — la cobertura real es la suite estática
  AXÓN (29 checks), no Django tests. Para Content Engine, el harness
  `run_master_smoke_map` cubre 19 escenarios reales con verdict PASS/WARN
  /FAIL.
- **Sin login social** (django-allauth no instalado).
- **18 imports anidados** dentro de funciones en `views.py` — ruidoso pero
  inocuo. DEBT_SCAN baja la cifra de "imports muertos" a ~2 reales en
  `views.py` (uno es falso positivo causado por el truncamiento) y ~20 en
  el resto del core.
- **4 scripts huérfanos rotos** fuera del flujo Django (`art_culture.py`,
  `control.py`, `generate_capsules.py`, `social_impact.py`) importan
  submódulos inexistentes de `kudos_app.views`. Nunca funcionaron.

## Qué falta para MVP demo público

Los 🔴 LAUNCH BLOCKERS dependen de entorno productivo + working tree, no
del HEAD:

1. **Restaurar 3 archivos núcleo del working tree desde HEAD** (BLOCKER-CORE)
   antes de cualquier ejecución local.
2. **Resolver HOME 500** (revertir healthcheck cuando se conozca la causa).
3. **Gatear las ~30 fugas dormant en plantillas PUBLIC** (1-2 h, sin tocar
   views ni urls). Único trabajo que mejora visiblemente Time To Awe.
4. **Validación Lighthouse Mobile en entorno real**: target ≥ 80 en
   Performance / A11y / SEO / Best Practices con backdrop-filter blur.
5. **Smoke navegacional físico mobile** (iOS Safari + Android Chrome reales).
6. **Preview de share** validado en WhatsApp / Twitter / Telegram / LinkedIn.
7. **Diagnosticar Barcelona UNGROUNDED** en Content Engine (Plaça Catalunya
   falla mientras el resto de capitales pasa con ≥ 0.96 confidence).

Bloque Experience Core (paralelo, no bloquea demo Django) — actualizado:
- Ya tiene routes y components reales; las 8 sub-tareas P0 originales
  (tokens · theme · shell · sidebar · motion · primitives · responsive ·
  atmosphere) están parcialmente cubiertas por la atmosphere/echo/fragment/
  resonance que se vio aterrizar en `components/capsule/`. Falta consolidar
  Design System v1.0 y unificar tokens contra los componentes ya escritos.

## Próximo paso exacto

**1) Restaurar `kudos_app/{views,urls,models}.py` desde HEAD (BLOCKER-CORE).**

```bash
git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py
python -c "import ast; [ast.parse(open(f).read()) for f in \
  ['kudos_app/views.py','kudos_app/urls.py','kudos_app/models.py']]"
python manage.py check
python manage.py runserver
```

Hasta que el working tree vuelva a parsear, nada se puede ejecutar localmente.

**2) Diagnosticar HOME 500 con el log de Render.**

1. Abrir Render dashboard → service `kudos` → tab **Logs**.
2. Buscar el traceback del 500 en `/home/` (la ruta donde sigue viviendo la
   home original).
3. Aplicar fix puntual al `home` view, `home.html`, context processor o
   migración faltante según lo que indique el traceback (ver árbol de causas
   en `DEBUG_HOME_500.md §4` y `§5`).
4. Una vez resuelto, revertir healthcheck con
   `kudos_app/{urls,views}.py.snapshot.debug-home.*` y volver a apuntar `/`
   a `home`.

**3) Sesión única de hardening template-layer** (~1-2 h, sin tocar views.py):
envolver los ~30 `{% url 'dormant_*' %}` listados en `FEATURE_GATE_AUDIT
_20260519.md §6` con `{% if_feature %}`. Único cambio que mueve la
percepción del producto sin tocar arquitectura.

**4) Investigar Barcelona UNGROUNDED en Content Engine** (`content_engine/
ranking.py` o `content_engine/landmarks.py`) — los 10 candidatos llegan pero
ninguno gana grounding.

Reglas durante FREEZE (`FREEZE_v0.9_AXON_CORE.md §6`):
- ✗ NO nuevas features.
- ✗ NO nueva arquitectura.
- ✓ SÍ bugs detectados en demo / productivo.
- ✓ SÍ ajustes de copy.
- ✓ SÍ completar 🔴 LAUNCH BLOCKER de `KNOWN_DEBTS.md`.
- ✓ SÍ Content Engine (decisión consciente: pipeline paralelo, no toca el
  PUBLIC CORE Django).

---

## Métricas clave (snapshot 2026-05-20)

| Métrica | Objetivo MVP | Valor actual | Δ vs 2026-05-19 |
|---|---|---|---|
| Tag git productivo | `v0.9-axon-core` | `v0.9-axon-core` ✅ | 0 |
| Smoke test integral AXÓN | 100 % | 29/29 ✅ (sobre HEAD) | 0 |
| Smoke Content Engine (master map) | ≥ 90 % PASS | 16/19 PASS · 2 WARN · 1 FAIL (84 %) | nuevo |
| Pilares PUBLIC operativos (HEAD) | 7 | 7 ✅ | 0 |
| Identidad visual preservada | sí | 17/17 ✅ | 0 |
| CTA DORMANT visibles al usuario | 0 | ~30 ⚠ (home/capsule/dashboard/ai_panel) | nuevo (auditado) |
| `views.py` líneas (HEAD) | ≤ 2 000 | 2 356 (con healthcheck) / 2 337 base | 0 |
| `views.py` líneas (working) | ≤ 2 000 | **2 375 ⚠ truncado** (SyntaxError) | 0 |
| `urls.py` líneas (working) | parseable | **209 ⚠ truncado** (SyntaxError) | +1 archivo afectado |
| `models.py` líneas (working) | parseable | **1 131 ⚠ truncado** (SyntaxError) | +1 archivo afectado |
| Git index | sano | ⚠ corrupto (`0x74000000`) — log y show funcionan | nuevo |
| Funciones duplicadas en `views.py` (HEAD) | 0 | 0 ✅ | 0 |
| F401 imports muertos (HEAD) | 0 | 0 ✅ | 0 |
| `map.html` líneas | ≤ 200 | 167 ✅ | 0 |
| Módulos JS map5d | ≥ 8 | 10 ✅ | 0 |
| Payload inicial API z=3 | < 100 KB | ~40 KB ✅ | 0 |
| Markers DOM en pantalla (z=3) | ≤ 200 | ~30 clusters ✅ | 0 |
| Time To First Marker (proyectado) | < 1.2 s | < 1.2 s ✅ | 0 |
| Rutas PUBLIC respondiendo (prod) | 7 / 7 | 6 / 7 (HOME 500 activo) | 0 |
| Rutas DORMANT respondiendo 404 | 16 / 16 smoke | 16 / 16 ✅ | 0 |
| Rutas dormant accidentales (audit) | 0 | 0 ✅ | nuevo (auditado) |
| Templates PUBLIC con links dormant | 0 | 7 templates ⚠ (~30 enlaces) | nuevo (auditado) |
| Duplicados URL en `urls.py` | 0 | 1 ⚠ (`mind/chat/` x2) | nuevo (auditado) |
| Snapshots `.snapshot.*` en árbol | gitignored | 29 archivos · 1.2 MB ⚠ | nuevo (auditado) |
| Templates duplicados raíz vs app | 0 | 7 ⚠ (control_panel.html 21 KB drástico) | nuevo (auditado) |
| Leaflet inits copy-paste (templates) | 1 helper | 17 ⚠ | nuevo (auditado) |
| Imports muertos core (DEBT_SCAN) | 0 | ~20 (volumen bajo) | nuevo (auditado) |
| Templates > 300 L | ≤ 2 | 5 ⚠ (`capsule_detail` 876, `capsule_clip` 473, `control_panel` 473, `ai_panel` 343, `manifesto` 323) | nuevo (auditado) |
| Leaflet copias en `static/` | 1 (vendor) | 1 vendor + 3 legacy ⚠ | 0 |
| `markercluster` vía CDN | local | unpkg.com ⚠ | 0 |
| Content Engine líneas Python | n/a | 3 039 L · 13 módulos | nuevo |
| Content Engine tests automatizados | ≥ 15 | 19 (master_test_map · PASS/WARN/FAIL) | nuevo |
| Content Engine latencia media (último run) | < 3 s | 0.80 s p50 · 4.68 s p95 ⚠ (Cebreiro/Médulas/Catalunya 3-5 s) | nuevo |
| Content Engine rate-limit | sí | sí (`django-ratelimit` en `place_capsule`) ✅ | nuevo |
| Snapshots reversibles | ≥ 1/fase | 23 ✅ | 0 |
| Backups pre-deploy | repo + DB | tar 87 MB + DB 9.5 MB ✅ | 0 |
| Tests automatizados Django (`kudos_app`) | ≥ 5 smoke | ~0 | 0 |
| Lighthouse Mobile Perf (real) | ≥ 80 | sin medir | 0 |
| Base de datos productiva | PostgreSQL | DATABASE_URL en Render (provisionado) | OK |
| Deploy live | ✓ | ✓ Render (con bug HOME 500) | 0 |
| Experience Core rutas | ≥ 4 | 6 (`/`, `/aqui`, `/health`, `/capsules/[slug]`, `/places/[slug]`, `/time/rome`) | +5 |
| Experience Core componentes | ≥ 5 | 15+ (`capsule/`, `feed/`, `timeline/`, `ui/`, `analytics/`) | +14 |
| Experience Core analytics | sí | Plausible montado | nuevo |

---

## Cambios desde la última actualización (2026-05-19 → 2026-05-20)

### Content Engine V0 (Phase 11/12/13) entró en producción de pruebas
- Nuevo módulo Django `content_engine/` (3 039 L Python) registrado en
  `INSTALLED_APPS` y `kudos_project/urls.py`. Sin tocar `kudos_app`.
- 13 módulos: `api`, `pipeline`, `ranking`, `confidence`, `truth_gate`,
  `landmarks`, `geocache`, `hashing`, `schemas`, `constants`, `models`,
  `urls`, `clients/` (anthropic, wikidata, wikipedia).
- Endpoint canónico `POST /api/place-capsule`; back-compat
  `POST /api/capsule/nearby` (alias Phase 11).
- Pipeline sync (no Celery): Wikidata SPARQL + Wikipedia REST → dedupe →
  grounding → ranking ponderado → landmark override sparse → truth-gate →
  CapsuleResponse UX-safe.
- Modelos `PlaceCapsule`, `GenerationAttempt`, `WikidataGeoCache` con
  migrations 0001 + 0002.
- `django-ratelimit` activado en endpoint público.
- Management command `python manage.py run_master_smoke_map [--group X]
  [--limit N] [--output-dir]` con harness de 19 tests (A direct_landmark,
  B rural_generic, C direct_landmark, D empty, E international).
- 3 runs ejecutados hoy (2026-05-20):
  - 13:52 (smoke #1) — primera pasada del día.
  - 13:54 (smoke #2) — segunda pasada (refinamiento `constants.py`).
  - 14:04 (smoke #3) — **última válida · 16 PASS · 2 WARN · 1 FAIL ·
    15.27 s · 13/19 confidence ≥ 0.75 · 1 caso UNGROUNDED (Barcelona)**.
- Reportes en `reports/master_smoke_20260520_*.{csv,json}`.

### Tres auditorías nuevas ejecutadas el 2026-05-19
- **`CORE_HEALTH.md`** — scheduled task `core-health`. Veredicto: ❌ núcleo
  no arranca. 3 archivos truncados (`views.py`, `urls.py`, `models.py`).
  Templates clave parsean OK pero no se renderizan por `ImportError`
  upstream. Recomendación: `git checkout HEAD -- ...`.
- **`DEBT_SCAN_REPORT.md`** — scheduled task `debt-scan`. Hallazgo P0
  bloqueante de producción (= mismo truncamiento). 29 snapshots · 7
  templates duplicados · 17 inits de Leaflet · 3 rutas huérfanas · 4 views
  no wired · ~20 imports muertos · 5 templates > 300 L. Punch list
  priorizada de 10 acciones.
- **`FEATURE_GATE_AUDIT_20260519.md`** — scheduled task `feature-gate-audit`.
  Estructura gating VERDE. Navegación contaminada: 7 templates PUBLIC con
  ~30 enlaces dormant sin guard. Duplicado URL `mind/chat/`. Bloque
  `name='home'` apuntando a healthcheck (parche debug-home aún vivo).

### Experience Core (Next.js 15) avanzó significativamente
- 5 nuevas rutas: `/aqui`, `/health`, `/capsules/[slug]`, `/places/[slug]`,
  `/time/rome` (con loading.tsx, error.tsx y not-found.tsx donde aplica).
- 10 nuevos componentes capsule: `PageAtmosphere`, `EchoNode`,
  `FragmentTrace`, `TemporalResonance`, `SpatialAnchor`, `Whisper`,
  `MediaVignette`, `LayerContainer`, `ColosseumSilhouette`.
- Componentes feed: `DiscoveryFeed`, `CapsuleCard`.
- Timeline: `EraSlider`.
- UI: `button`, `toast` (shadcn-style).
- Analytics: `PlausibleProvider` montado.
- `lib/` ampliado: `capsule/`, `capsules/`, `curated/`, `timeline/`,
  `axon/`, `hooks/`, `mocks/`, `analytics/`.

### Sin cambios sobre HEAD del tag `v0.9-axon-core`
- No hay commits nuevos sobre `master` desde `11c5da6` (2026-05-17). Toda
  la actividad reciente es:
  - Working tree de `kudos_app/{views,urls,models}.py` truncado (regresión
    local — no llegó a commitearse).
  - `content_engine/` nuevo (sin commit aún).
  - `experience/` ampliado (sin commit aún).
  - 3 reportes `.md` de auditoría generados por scheduled tasks.

### Cerrado vs `BUG_LIST.md` (2026-05-19)
- Ningún bug cerrado entre 2026-05-19 y 2026-05-20 (FREEZE estricto + bug
  CORE-001 sin atender).

### Abierto nuevo vs `BUG_LIST.md` (2026-05-19)
- **BUG-038 · 3 archivos núcleo truncados** (working tree) — promueve y
  expande BUG-AX0.
- **BUG-039 · Navegación contaminada PUBLIC** (~30 enlaces dormant).
- **BUG-040 · Duplicado URL `mind/chat/`** (urls.py:186 vs :193).
- **BUG-041 · 29 snapshots `.snapshot.*` en árbol fuente** (1.2 MB).
- **BUG-042 · 7 templates duplicados raíz vs `kudos_app/`**.
- **BUG-043 · `settings.py` (0 B) y `kudos_app_urls.py` (407 B) huérfanos
  en raíz**.
- **BUG-044 · 17 inits Leaflet copy-paste en templates feature** (todos
  dormant pero ejecutándose en cliente).
- **BUG-045 · 4 views sin wire** (`personal_habit_toggle`, `personal_crypto`,
  `ai_mind_chat`, `bookmark_capsule`).
- **BUG-046 · Git index corrupto** (`fatal: unknown index entry format
  0x74000000`) — `git status` no funciona; `log`/`show` sí.
- **BUG-047 · Barcelona · Plaça Catalunya UNGROUNDED** en Content Engine
  master smoke (10 candidatos, sin ganador).

Ver `BUG_LIST.md` para el detalle actualizado y los bugs heredados.
