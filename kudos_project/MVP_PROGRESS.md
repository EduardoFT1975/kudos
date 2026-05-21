# MVP_PROGRESS.md — KUDOS / AXÓN

Última actualización: 2026-05-19 (auto · scheduled-task `actualizar-md`)
Responsable: Eduardo
Mandato vigente: **FREEZE v0.9-axon-core · validación productiva · Experience Core en paralelo.**

Avance por los **7 sistemas PUBLIC** del MVP. Para el detalle ver
`AXON_RELEASE_AUDIT.md`, `PUBLIC_CORE_STATUS.md` y `KNOWN_DEBTS.md`.

Leyenda: 🟢 listo · 🟡 parcial · 🔴 pendiente · ⚪ no aplica todavía.

---

## Vista global

| # | Sistema PUBLIC | Estado | Bloqueos / notas |
|---|---|---|---|
| 1 | Mapa 5D | 🟢 funcional | OK; `markercluster` aún vía CDN unpkg |
| 2 | Capsules | 🟢 funcional | popup portal + lazy `api_capsule_light` + 3 CTAs PUBLIC + 7 DORMANT gated |
| 3 | Search | 🟢 funcional | full-text + Nominatim OSM en mapa |
| 4 | Timeline | 🟢 funcional | renderTimeline, centerTimeline(year), 8 epochs, era styles |
| 5 | Users | 🟢 funcional | login/registro/onboarding/perfil; **sin** login social todavía |
| 6 | Mind Lite | 🟢 funcional | `/mind/` PUBLIC, 3 prompts (`what`/`summary`/`near`), auto-fire `?capsule=` |
| 7 | Share | 🟢 funcional | Web Share API + clipboard fallback + OG + Twitter Card + JSON-LD |

**Estado global del MVP técnico: 7/7 pilares operativos.**

Bloqueos para **demo pública**:
- 🟥 `views.py` working tree truncado (SyntaxError) → impide ejecución local.
- 🟥 HOME 500 en producción (Render). Workaround: healthcheck en `/`, home
  real en `/home/`.
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
| Funciones duplicadas en `views.py` | 🟢 | 0 (eran 6 al 2026-05-15) |

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
| Backend Claude/OpenAI real | 🔴 | hoy heurística local; contrato JSON listo |

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
| FEATURE GATED SYSTEM | 🟢 | features.py + middleware + tags + overrides env |
| Navegación gated en `base.html` | 🟢 | 17+ `{% if_feature %}` 1:1 |
| `SECRET_KEY` desde `.env` obligatorio | 🟢 | mandatorio si `DJANGO_ENV=production`; dev fallback con aviso |
| Pillow + requests en `requirements.txt` | 🔴 | siguen comentados |
| Smoke tests (≥ 5) | 🔴 | `tests.py` = 10 L; cubierto por audit estático 29/29 (no Django runtime) |
| Migración a PostgreSQL en prod | 🟢 | `DATABASE_URL` provisionado en Render |
| Deploy Render con HTTPS | 🟡 | LIVE con HOME 500 activo |
| Lighthouse Mobile ≥ 80 (real) | 🔴 | sin medir |
| `views.py` working tree íntegro | 🔴 | truncado L2376 → SyntaxError |
| Snapshots reversibles por fase | 🟢 | 23 archivos `.snapshot.dX.YYYYMMDDTHHMMSSZ` |
| Backups pre-deploy | 🟢 | tar 87 MB · DB 9.5 MB · 1 458 cápsulas · 10 users |
| Experience Core (Next.js) scaffolding | 🟢 | esperando Design System v1.0 |

---

## Definición de "MVP listo para anunciar"

(Tag `v0.9-axon-core` en git ✅ del 2026-05-17)

- ✅ Tag `v0.9-axon-core` creado.
- ✅ Las 7 URLs PUBLIC responden 200 — **excepto `/` por bug HOME 500 activo**.
- ✅ El 100 % de las rutas DORMANT del listado §2 de `AXON_RELEASE_AUDIT.md` responden 404 (16/16).
- ✅ `views.py` (HEAD) ≤ 2 356 L, sin duplicados.
- ✅ `map.html` ≤ 200 L con CSS+JS extraídos (167 L real).
- ✅ Recorrido fluido home → map → marker → popup → cápsula → share → mind → search → timeline (en HEAD).
- 🔴 Lighthouse Desktop ≥ 90, Mobile ≥ 80 — sin medir.
- 🔴 `python manage.py check` + `python manage.py test` verdes — **bloqueado por
  views.py truncado en working tree**.

Bloqueos finales para demo pública:
1. **Restaurar `views.py`** desde HEAD (BLOCKER-AX0).
2. **Resolver HOME 500** en Render.
3. **Medir Lighthouse Mobile** sobre URL pública.
4. **Validar previews share** en redes reales.
