# MVP_PROGRESS.md — KUDOS / AXÓN

Última actualización: 2026-05-15 (auto · daily-status)
Responsable: Eduardo
Mandato vigente: **CORE EXTRACTION + FEATURE GATING + MVP STABILIZATION**.

Avance por los **7 sistemas PUBLIC** del MVP. Para el detalle del roadmap
quirúrgico ver `AXON_CORE.md §5 (D1–D14)`.

Leyenda: 🟢 listo · 🟡 parcial · 🔴 pendiente · ⚪ no aplica todavía.

---

## Vista global

| # | Sistema PUBLIC | Estado | Bloqueos críticos |
|---|---|---|---|
| 1 | Mapa 5D | 🟡 parcial | duplicados en views; `map.html` 881 L; sin clustering ni viewport loading |
| 2 | Capsules | 🟡 parcial | endpoints duplicados (`capsule_versions`, `capsule_aport_*`, `capsule_dialog`) sin podar |
| 3 | Search | 🟢 funcional básico | refactor cosmético post-MVP |
| 4 | Timeline | 🟢 funcional básico | refactor cosmético post-MVP |
| 5 | Users | 🟡 parcial | sin login social (allauth aún no instalado) |
| 6 | Mind Lite | 🔴 sin reducir | `ai_chat` duplicado; UI aún no rebajada a 3 prompts |
| 7 | Share | 🔴 pendiente | falta bloque OG + botón share en `capsule_detail` |

Progreso del **roadmap AXÓN (14 días)**:

| Fase | Días | Estado |
|---|---|---|
| Fase 1 · Cirugía | D1–D3 | 🟡 D1 a medias (faltan duplicados); D2–D3 no iniciados |
| Fase 2 · Mapa Core | D4–D6 | 🔴 no iniciado |
| Fase 3 · Refactor mapa | D7–D9 | 🔴 no iniciado |
| Fase 4 · Capsule Engine | D10–D11 | 🔴 no iniciado |
| Fase 5 · Mind Lite | D12 | 🔴 no iniciado |
| Fase 6 · Modularización | D13–D14 | 🔴 no iniciado |

---

## 1. Mapa 5D 🟡

URLs PUBLIC: `/map/`, `/api/capsules/5d/`, `/api/capsules/nearby/`, `/near/`.

| Hito | Estado | Notas |
|---|---|---|
| Endpoints visibles y servidos por feature gating | 🟢 | `map_5d` = True en `features.py` |
| Vistas correctas en `views.py` | 🟡 | `map_view` (L309), `api_capsules_5d` (L2187), `api_capsules_nearby` (L1815), `near` (L1961) |
| Clustering Leaflet | 🔴 | falta `leaflet.markercluster` local |
| Viewport loading (bbox + paginación) | 🔴 | API actual devuelve todo el conjunto |
| Lazy popups (`?light=1`) | 🔴 | sin diseñar |
| Refactor `map.html` (CSS + JS extraídos) | 🔴 | 881 L; CSS y JS inline; Leaflet por CDN |
| TTFM < 1.2 s en 4G | 🔴 | sin medir |
| 60 fps en pan/zoom mobile | 🔴 | sin probar |
| Lighthouse Mobile Perf ≥ 80 | 🔴 | sin medir |

## 2. Capsules 🟡

URLs PUBLIC: `/capsules/`, `/capsules/create/`, `/capsules/<uid>/`,
`/capsules/<uid>/like/`, `/capsules/<uid>/delete/`.

| Hito | Estado | Notas |
|---|---|---|
| CRUD básico operativo | 🟢 | `capsule_list` (L140), `capsule_detail` (L192), `create_capsule`, `toggle_like`, `delete_capsule` |
| Endpoints AR/VR/audio/clip congelados como DORMANT | 🟢 | bloqueados por middleware |
| Subrecursos `/versions`, `/aport`, `/dialog` saneados | 🔴 | duplicados en `views.py` 1989/2332, 2003/2343, 2052/2368, 2108/2403, 2156/2431 |
| Flujo marker → popup → cápsula | 🔴 | pendiente Fase 4 |
| Share OG (`og:*`, `twitter:card`) | 🔴 | sin meta tags todavía |

## 3. Search 🟢

URLs PUBLIC: `/search/`.

| Hito | Estado | Notas |
|---|---|---|
| `global_search` operativa | 🟢 | `views.py` L333; plantilla `search.html` |
| Cobertura sobre cápsulas y usuarios | 🟢 | suficiente para el MVP |
| Pulido visual + paginación | 🟡 | post-MVP |

## 4. Timeline 🟢

URLs PUBLIC: `/timeline/`.

| Hito | Estado | Notas |
|---|---|---|
| `timeline` operativa | 🟢 | `views.py` L622; plantilla `timeline.html` |
| Integración con slider del mapa | 🔴 | depende de Fase 3 (extracción JS) |

## 5. Users 🟡

URLs PUBLIC: `/`, `/register/`, `/onboarding/`, `/accounts/login`,
`/accounts/logout`, `/profile/`, `/profile/edit/`, `/profile/<alias>/`,
`/dashboard/`.

| Hito | Estado | Notas |
|---|---|---|
| Login nativo Django + registro + onboarding | 🟢 | flujo funcional |
| `AUTH_USER_MODEL` y preferencias | 🟢 | migración `0005_userpreference` aplicada |
| Login social (allauth · Google primero) | 🔴 | allauth no instalado; depende de BLOCKER-S2 |
| App `users` extraída del monolito | 🔴 | post-Fase 6 |

## 6. Mind Lite 🔴

URLs PUBLIC: `/mind/`, `/mind/chat/`, `/mind/chat/send/`.

| Hito | Estado | Notas |
|---|---|---|
| Endpoint accesible | 🟡 | `ai_panel` (L1235), `ai_chat` ⚠ duplicado (L1540 + L1628), `ai_chat_send` (L1642) |
| Reducir UI a 3 prompts (*¿Qué es esto?* / *¿Qué pasó aquí?* / *¿Qué ver cerca?*) | 🔴 | Fase 5 / D12 |
| Modos delegados (`mode in {"what","when","near"}`) | 🔴 | sin implementar |
| Ocultar insights/directives bajo `{% if_feature "mind_full" %}` | 🟡 | `feature_tags` listos; falta envolver bloques |

## 7. Share 🔴

| Hito | Estado | Notas |
|---|---|---|
| Bloque OpenGraph en `capsule_detail` | 🔴 | sin tags `og:*` |
| `twitter:card` summary_large_image | 🔴 | sin tags |
| Botón "Compartir" (`navigator.share` + fallback copy) | 🔴 | sin diseñar |
| Página pública sin login con metadatos | 🔴 | pendiente verificación |
| Preview validado en WhatsApp / Twitter / Telegram | 🔴 | pendiente Fase 4 |

---

## Capa transversal — infraestructura

| Item | Estado | Notas |
|---|---|---|
| FEATURE GATED SYSTEM montado | 🟢 | `features.py` + middleware + tags |
| Navegación gated en `base.html` | 🟢 | DORMANT envuelto con `{% if_feature %}` |
| `SECRET_KEY` desde `.env` obligatorio | 🔴 | sigue habiendo fallback inseguro |
| Pillow + requests activos en `requirements.txt` | 🔴 | siguen comentados |
| `db.sqlite3` y `__pycache__` en `.gitignore` | 🟢 | confirmado |
| Smoke tests (≥ 5) | 🔴 | `tests.py` = 10 líneas |
| Migración a PostgreSQL | 🔴 | `dj-database-url` y `psycopg2-binary` ya en requirements |
| Deploy Render/Railway con HTTPS | 🔴 | post-AXÓN |
| Lighthouse Desktop ≥ 90 / Mobile ≥ 80 | 🔴 | post-Fase 3 |

---

## Definición de "MVP listo para anunciar"

(Tag `v0.9-axon-core` en git, según `AXON_CORE.md §5/D14`)

- ✅ Las 7 URLs PUBLIC responden 200.
- ✅ El 100 % de las rutas DORMANT del listado §2 de `AXON_CORE.md` responden 404.
- ✅ `views.py` ≤ 2 000 líneas, sin duplicados.
- ✅ `map.html` ≤ 200 líneas con CSS+JS extraídos.
- ✅ Recorrido fluido home → map → marker → popup → cápsula → share → mind → search → timeline.
- ✅ Lighthouse Desktop ≥ 90, Mobile ≥ 80.
- ✅ `python manage.py check` + `python manage.py test` verdes.

Faltan 6 de 7 sistemas con avance crítico. El cuello de botella es la
**purga de duplicados** y la **separación de `map.html`**.
