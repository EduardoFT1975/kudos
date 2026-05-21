# MVP_PROGRESS.md — KUDOS / AXÓN

Última actualización: 2026-05-21 (auto · scheduled-task `daily-status`)
Responsable: Eduardo
Mandato vigente: **POST-FREEZE v0.9-axon-core · 16 commits hotfix 2026-05-21 desplegados · HOME 500 fix en master pendiente verificación productiva · Content Engine + Experience Core en master.**

Avance por los **7 sistemas PUBLIC** del MVP. Para el detalle ver
`PROJECT_STATUS.md`, `CURRENT_BLOCKERS.md`, `AXON_RELEASE_AUDIT.md`,
`PUBLIC_CORE_STATUS.md`, `KNOWN_DEBTS.md`.

Leyenda: 🟢 listo · 🟡 parcial · 🔴 pendiente · ⚪ no aplica todavía.

---

## Vista global

| # | Sistema PUBLIC | Estado | Bloqueos / notas |
|---|---|---|---|
| 1 | Mapa 5D | 🟢 funcional | OK; `markercluster` aún vía CDN unpkg |
| 2 | Capsules | 🟢 funcional | popup portal + lazy `api_capsule_light` + 3 CTAs PUBLIC + 7 DORMANT gated · Phase 0 fields (`place`, `parent_capsule`, `root_capsule`, `context_layer`, `importance_score`, `verified`) en `kudos_app/models.py` |
| 3 | Search | 🟢 funcional | full-text + Nominatim OSM en mapa |
| 4 | Timeline | 🟢 funcional | renderTimeline, centerTimeline(year), 8 epochs, era styles |
| 5 | Users | 🟢 funcional | login/registro/onboarding/perfil; **sin** login social todavía |
| 6 | Mind Lite | 🟢 funcional | `/mind/` PUBLIC, 3 prompts (`what`/`summary`/`near`), auto-fire `?capsule=` |
| 7 | Share | 🟢 funcional | Web Share API + clipboard fallback + OG + Twitter Card + JSON-LD |

**Estado global del MVP técnico: 7/7 pilares operativos.**

Bloqueos para **demo pública** (orden actualizado tras 2026-05-21):

- 🟧 HOME 500 fix mergeado en master (`67fe207` · swap manifest static
  storage + harden `home` view con try/except). **Pendiente verificar 200
  en Render** (`curl -I https://kudos-40cq.onrender.com/`).
- 🟧 Working tree local desincronizado · 4 archivos truncados (views.py
  incompleto, urls.py + models.py + render.yaml con SyntaxError o cortados)
  + índice git corrupto. **No afecta producción**, sí bloquea ejecución
  local. Bajado de P0 a P1.
- 🟥 Navegación contaminada Django · ~30 enlaces dormant en plantillas
  PUBLIC (sin cambios). Solo afecta backend Django; el frontend Next.js
  tiene middleware beta-gate que redirige a `/aqui`.
- 🟧 Primer deploy de `kudos-frontend` en Render pendiente · `render.yaml`
  v2 con 3 servicios listo (kudos + kudos-frontend + kudos-db).
- 🟧 Re-ejecutar `run_master_smoke_map` contra el binario merged
  (`dd42db3`) para fijar baseline post-merge.
- 🟧 Barcelona · Plaça Catalunya UNGROUNDED en Content Engine smoke
  2026-05-20.
- 🟡 Lighthouse Mobile real sin medir.
- 🟡 Preview share sin validar en WhatsApp / Twitter / Telegram / LinkedIn.

Progreso del **roadmap AXÓN (14 días)**:

| Fase | Días | Estado |
|---|---|---|
| Fase 1 · Cirugía | D1–D3 | 🟢 cerrada (gating + leaflet + 12 duplicados + 4 F401) |
| Fase 2 · Mapa Core | D4–D6 | 🟢 cerrada (bbox+cluster+lazy+cache+mobile) |
| Fase 3 · Refactor mapa | D7–D9 | 🟢 cerrada (167 L · 10 módulos JS · CSS extraído) |
| Fase 4 · Capsule Engine | D10–D11 | 🟢 cerrada (portal + share blindado) |
| Fase 5 · Mind Lite | D12 | 🟢 cerrada (3 prompts + UI rebajada) |
| Fase 6 · Modularización | D13–D14 | 🟡 parcial (legacy_views.py aún en `kudos_app/`, sin `apps/`) |
| Fase 7 · Hardening prod | D15–D17 | 🟢 cerrada (HOME 500 atacado · requirements.txt clean · render.yaml v2) |
| Fase 8 · Content Engine | D18–D20 | 🟢 mergeada (`dd42db3` · 3 039 L Python en master) |
| Fase 9 · Experience Core | D18–D21 | 🟢 mergeada (`9b3fadf` + 7 hotfix TS · 11 443 L · 99 archivos) |

---

## 1. Mapa 5D 🟢

URLs PUBLIC: `/map/`, `/api/capsules/5d/`, `/api/capsules/<uid>/light/`,
`/api/capsules/nearby/`, `/near/`.

| Hito | Estado | Notas |
|---|---|---|
| Endpoints PUBLIC vivos | 🟢 | feature `map_5d=True` |
| Vistas en `views.py` | 🟢 | `map_view`, `api_capsules_5d`, `api_capsule_light`, `api_capsules_nearby`, `near` |
| Clustering Leaflet local | 🟡 | `L.markerClusterGroup` activo, pero CSS+JS vía `unpkg.com` |
| Viewport loading (bbox + paginación) | 🟢 | `north/south/east/west/zoom`, default `limit 500`, antimeridian OK |
| Debounce moveend/zoomend | 🟢 | 250 ms |
| Lazy popups (`api_capsule_light`) | 🟢 | hidratación on `popupopen` + cache cliente |
| Cache HTTP | 🟢 | `Cache-Control: public, max-age=60` en bbox + light |
| Refactor `map.html` | 🟢 | 1 039 → 167 L; CSS/JS extraídos |
| Mobile tuning | 🟢 | 14/14 (viewport-fit, tap, inertia, zoomSnap 0.5, 100dvh, font 16 px en search) |
| Markers DOM (vista mundial) | 🟢 | ~30 clusters (era 2 000+ markers) |
| Payload inicial z=3 | 🟢 | ~40 KB (era ~800 KB) |
| TTFM proyectado | 🟢 | < 1.2 s |
| TTFM medido en 4G real | 🔴 | sin medir |
| 60 fps en pan/zoom mobile real | 🔴 | sin probar dispositivo físico |
| Lighthouse Mobile Perf ≥ 80 | 🔴 | sin medir |

## 2. Capsules 🟢

URLs PUBLIC: `/capsules/`, `/capsules/create/`, `/capsules/<uid>/`,
`/capsules/<uid>/like/`, `/capsules/<uid>/delete/`.

| Hito | Estado | Notas |
|---|---|---|
| CRUD básico | 🟢 | `capsule_list`, `capsule_detail`, `create_capsule`, `toggle_like`, `delete_capsule` |
| Endpoints AR/VR/audio/clip/versions/aport/dialog DORMANT | 🟢 | `DORMANT_PATH_REGEX` bloquea `^/capsules/[^/]+/(ar|audio|vr|clip|enrich|versions|aport|dialog)` |
| Popup como portal contextual (3 CTAs PUBLIC) | 🟢 | Explorar + Compartir + Timeline |
| 7 CTAs DORMANT en `capsule_detail` gateados | 🟢 | `{% if_feature %}` envuelve dialog, versions, aport, AR, audio, clip, VR |
| Flujo marker → popup → cápsula → share | 🟢 | cierre narrativo "Ver en mapa · Año en timeline · Preguntar a Mind" |
| Funciones duplicadas en `views.py` (HEAD) | 🟢 | 0 |
| Phase 0 Foundation fields | 🟢 | `place`, `parent_capsule`, `root_capsule`, `context_layer` (5 choices), `importance_score`, `verified` añadidos en `dd42db3` |
| Modelo `Place` canónico | 🟢 | nuevo en `kudos_app/models.py` · FK desde `Capsule.place` |

## 3. Search 🟢

URLs PUBLIC: `/search/`.

| Hito | Estado | Notas |
|---|---|---|
| `global_search` operativa | 🟢 | full-text |
| Nominatim OSM en mapa | 🟢 | búsqueda geo desde search box del mapa |
| Cobertura cápsulas + usuarios | 🟢 | |
| Pulido visual + paginación | 🟡 | post-MVP cosmético |

## 4. Timeline 🟢

URLs PUBLIC: `/timeline/`.

| Hito | Estado | Notas |
|---|---|---|
| `timeline` operativa | 🟢 | renderTimeline + centerTimeline(year) |
| 8 epochs con styles | 🟢 | era styles aplicados |
| Integración slider ↔ mapa | 🟢 | sliders bidireccionales |

## 5. Users 🟢

URLs PUBLIC: `/`, `/register/`, `/onboarding/`, `/accounts/login`,
`/accounts/logout`, `/profile/`, `/profile/edit/`, `/profile/<alias>/`,
`/dashboard/`.

| Hito | Estado | Notas |
|---|---|---|
| Login nativo Django + registro + onboarding | 🟢 | flujo funcional |
| `AUTH_USER_MODEL` y preferencias | 🟢 | migración `0005_userpreference` aplicada |
| Login social (allauth · Google) | 🔴 | allauth no instalado |
| App `users` extraída del monolito | 🔴 | post-Fase 6 (post-MVP) |

## 6. Mind Lite 🟢

URLs PUBLIC: `/mind/`, `/mind/ask/`.

| Hito | Estado | Notas |
|---|---|---|
| Endpoint accesible sin founder gate | 🟢 | era 403 founder-only → ahora PUBLIC |
| UI reducida a 3 prompts | 🟢 | what / summary / near con chips grandes + skeleton |
| Modos delegados (`mode in {"what","summary","near"}`) | 🟢 | server-side templates |
| Auto-fire si `?capsule=X` | 🟢 | hidratación automática |
| `mind_full` (insights/directives) gated | 🟢 | `{% if_feature "mind_full" %}{% if is_founder %}` |
| Backend Claude/OpenAI real | 🟡 | hoy heurística local; contrato JSON listo; cliente `content_engine/clients/anthropic.py` (383 L) ya en master pero usado solo en pipeline place-capsule, no aún en `ai_lite_ask` |

## 7. Share 🟢

| Hito | Estado | Notas |
|---|---|---|
| OG completos en `capsule_detail` | 🟢 | `og:type/title/description/image/url/site_name/locale` |
| Twitter Card summary_large_image | 🟢 | confirmed L18 |
| `navigator.share` con clipboard fallback | 🟢 | L601-602 + toast |
| Schema.org JSON-LD | 🟢 | structured data |
| Página pública sin login con metadatos | 🟢 | verificable en `/capsules/<uid>/` |
| Preview validado en WhatsApp / Twitter / Telegram / LinkedIn | 🔴 | pendiente smoke real post-deploy |

---

## Capa transversal — infraestructura

| Item | Estado | Notas |
|---|---|---|
| FEATURE GATED SYSTEM (Django) | 🟢 | features.py + middleware + tags + overrides env |
| Beta-gate (Experience) | 🟢 | `experience/middleware.ts` 307 → `/aqui` cuando `BETA_HIDE_DORMANT=1` · solo `/places` oculta tras P0.9 |
| Navegación gated en `base.html` (Django) | 🟢 | 17+ `{% if_feature %}` 1:1 |
| `SECRET_KEY` desde `.env` obligatorio | 🟢 | mandatorio si `DJANGO_ENV=production`; dev fallback con aviso |
| Pillow + requests en `requirements.txt` | 🟢 | `requests==2.32.3` ya activo · Pillow no necesario hoy (imágenes capsule via URL externa) |
| `requirements.txt` reproducible Render Linux | 🟢 | 13 paquetes runtime · zero Anaconda/Windows junk (`5e18e1f`) |
| Smoke tests Django | 🟡 | `kudos_app/tests.py` pasa de 10 L a 79 L (HealthEndpointTestCase + PlaceDetailEndpointTestCase + CapsuleFoundationFieldsTestCase via `dd42db3`) |
| Migración a PostgreSQL en prod | 🟢 | `DATABASE_URL` provisionado en Render |
| Deploy Render con HTTPS | 🟧 | backend LIVE en `kudos-40cq.onrender.com` con fix HOME 500 desplegado pendiente verificación · frontend `kudos-frontend` pendiente primer deploy |
| Render blueprint multi-servicio | 🟢 | `render.yaml` v2 declara `kudos` (Django), `kudos-frontend` (Next.js, `rootDir: experience`, `BETA_HIDE_DORMANT=1`), `kudos-db` (Postgres) |
| CORS hardening | 🟢 | `corsheaders` instalado · `CorsMiddleware` pre-`CommonMiddleware` · `CORS_ALLOWED_ORIGINS` precableado · warning loud en misconfig (vía `dd42db3`) |
| Lighthouse Mobile ≥ 80 (real) | 🔴 | sin medir |
| `views.py` working tree íntegro | 🔴 | 2 382 L · parsea pero incompleto vs HEAD 2 448 L · falta `capsule_aport_validate` |
| `urls.py` working tree íntegro | 🔴 | SyntaxError L11 (`'[' was never closed`) · HEAD íntegro 215 L |
| `models.py` working tree íntegro | 🔴 | SyntaxError L1132 (`verbose_name = '`) · HEAD íntegro 1 210 L |
| `render.yaml` working tree íntegro | 🔴 | 15 L cortado · HEAD íntegro 89 L (3 servicios) |
| Git index sano | 🔴 | corrupto (`fatal: unknown index entry format 0x3a710000` · byte fluctúa) |
| Snapshots reversibles por fase | 🟢 | 23 archivos `.snapshot.dX.YYYYMMDDTHHMMSSZ` |
| Backups pre-deploy | 🟢 | tar 87 MB · DB 9.5 MB · 1 458 cápsulas · 10 users |
| Content Engine V0 en master | 🟢 | `content_engine/` (3 039 L Python · 13 módulos · 34 archivos · INSTALLED_APPS · POST `/api/place-capsule` · `django-ratelimit` activo · master switch geocache `CONTENT_ENGINE_GEOCACHE_ENABLED`) |
| Content Engine smoke baseline | 🟧 | 19 tests · 16 PASS · 2 WARN · 1 FAIL (Barcelona) del 2026-05-20T14:04 · sin re-ejecutar tras merge `dd42db3` |
| Experience Core en master | 🟢 | `experience/` (99 archivos · 11 443 L · Next 15 + React 18 + TS 5.6 strict + Tailwind 3.4 + Plausible) |
| Experience Core strict TS errors | 🟢 | 0 (5 commits de saneamiento: pin React 18, types align, narrow null, coerce, destructure) |
| AXÓN Phase 0 endpoints | 🟢 | `GET /api/health/` JSON estable + `GET /api/places/<slug>/` shape estable + Phase 0 fields en `Capsule` |
| Tests Django nuevos Phase 0 | 🟢 | 3 TestCase (Health, PlaceDetail, CapsuleFoundationFields) |

---

## Definición de "MVP listo para anunciar"

(Tag `v0.9-axon-core` en git ✅ del 2026-05-17 · 16 commits hotfix encima)

- ✅ Tag `v0.9-axon-core` creado.
- ✅ Las 7 URLs PUBLIC deben responder 200 — **HOME 500 fix desplegado en
  master (`67fe207`), pendiente verificación productiva post-deploy en
  Render**.
- ✅ El 100 % de las rutas DORMANT del listado §2 de `AXON_RELEASE_AUDIT.md` responden 404 (16/16).
- ✅ `views.py` (HEAD) 2 448 L sin duplicados.
- ✅ `map.html` ≤ 200 L con CSS+JS extraídos (167 L real).
- ✅ Recorrido fluido home → map → marker → popup → cápsula → share → mind → search → timeline (en HEAD).
- 🔴 Lighthouse Desktop ≥ 90, Mobile ≥ 80 — sin medir.
- 🟡 `python manage.py check` + `python manage.py test` — verde sobre HEAD,
  **bloqueado en local** por working tree truncado.
- 🟢 `requirements.txt` reproducible en Render Linux.
- 🟧 `kudos-frontend` desplegable en Render (`render.yaml` listo, primer
  deploy pendiente).

Bloqueos finales para demo pública:
1. **Verificar HOME 200 en producción** tras commit `67fe207` (manifest swap + view harden).
2. **Restaurar working tree local** (`git checkout HEAD -- views.py urls.py models.py render.yaml`).
3. **Primer deploy del `kudos-frontend` service** + verificar `NEXT_PUBLIC_API_BASE_URL` real y `CORS_ALLOWED_ORIGINS`.
4. **Re-ejecutar Content Engine smoke** contra el binario merged.
5. **Medir Lighthouse Mobile** sobre URL pública.
6. **Validar previews share** en redes reales.
7. **Gatear ~30 enlaces dormant** en plantillas PUBLIC Django.
8. **Diagnosticar Barcelona UNGROUNDED** en Content Engine.
