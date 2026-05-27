# MVP_PROGRESS.md — KUDOS / AXÓN

Última actualización: 2026-05-23 (auto · scheduled-task `daily-status`)
Responsable: Eduardo
Mandato vigente: **🚀 MVP CLOSE shippeado · `123e317` desplegado · Echo card cinematográfica = única superficie de respuesta · TemporalLandmark Roma layer live · Local Capsule Generator (Wikidata POIs) live · Geolocation autoritativa · timeout absorbs Render cold-start · safe-area iOS honored · debug residue purged.**

Avance por los **7 sistemas PUBLIC** del MVP. Para el detalle ver
`PROJECT_STATUS.md`, `CURRENT_BLOCKERS.md`, `AXON_RELEASE_AUDIT.md`,
`KNOWN_DEBTS.md`.

Leyenda: 🟢 listo · 🟡 parcial · 🔴 pendiente · ⚪ no aplica todavía.

---

## Vista global

| # | Sistema PUBLIC | Estado | Bloqueos / notas |
|---|---|---|---|
| 1 | Mapa 5D | 🟢 funcional | Django legacy OK; **Experience MapExplorer = MVP-close cinematográfico** (cold-start Roma + landmarks + provisional Wikidata POIs + Echo card single-surface) |
| 2 | Capsules | 🟢 funcional | popup portal + lazy `api_capsule_light` + 3 CTAs PUBLIC + 7 DORMANT gated · Phase 0 fields en `kudos_app/models.py` · Echo card como surface narrativa |
| 3 | Search | 🟢 funcional | full-text + Nominatim OSM en mapa |
| 4 | Timeline | 🟢 funcional | renderTimeline, centerTimeline(year), 8 epochs, era styles · TemporalLandmark capa year-filtered nueva |
| 5 | Users | 🟢 funcional | login/registro/onboarding/perfil; **sin** login social todavía |
| 6 | Mind Lite | 🟢 funcional | `/mind/` PUBLIC, 3 prompts (`what`/`summary`/`near`), auto-fire `?capsule=` · Echo synthesis usa Anthropic Haiku 4.5 (LLM real cuando `ANTHROPIC_API_KEY` está en Render) |
| 7 | Share | 🟢 funcional | Web Share API + clipboard fallback + OG + Twitter Card + JSON-LD |

**Estado global del MVP técnico: 7/7 pilares operativos · MVP CLOSE shippeado el 2026-05-23 16:42 UTC+2 (`123e317`).**

Bloqueos para **demo pública anunciable** (orden actualizado tras MVP-close):

- 🟧 **Render cold-start latency 25-35 s** (mitigado vía timeout en
  `123e317`, monitorizar TTFM real).
- 🟧 **`ANTHROPIC_API_KEY` en Render** sin verificar (sin key, Echo card
  cae al fallback procedural · funcional pero no entrega "voz LLM").
- 🟧 **Smoke navegacional físico mobile** del flow MVP completo (cold-start
  Roma → geolocation → POI → Echo card) en iOS Safari + Android Chrome.
- 🟧 **HOME 200 verificación productiva** post toda la cadena de deploys
  (último cambio en `kudos_project/settings.py` fue `67fe207` 2026-05-21).
- 🟧 **Primer deploy del `kudos-frontend` service en Render** confirmado
  + URL real validada + `CORS_ALLOWED_ORIGINS` ajustado si difiere.
- 🟧 Re-ejecutar `run_master_smoke_map` post-MVP-close (baseline 2026-05-20
  pre-merge content_engine + pre-MVP-close).
- 🟧 Barcelona · Plaça Catalunya UNGROUNDED en Content Engine smoke
  2026-05-20 (no bloquea Echo card · Echo card camino vía Wikidata
  directo).
- 🟨 Navegación contaminada Django · ~30 enlaces dormant en plantillas
  PUBLIC (sin cambios desde 2026-05-19). Solo afecta backend Django.
- 🟨 Lighthouse Mobile real sin medir post-MVP-close.
- 🟨 Preview share sin validar en WhatsApp / Twitter / Telegram / LinkedIn.
- ✅ **Viewport empty payload causa raíz neutralizada** · migraciones
  `0003`/`0004`/`0005` aplicadas automáticamente vía `build.sh`. La capa
  visible para usuario ahora son `landmarks_viewport` +
  `local_capsules_generate` (no `capsules_viewport`).
- ✅ **Debug HUD overlay + markers TEMP rojos retirados** (`123e317`
  residue purged).
- ✅ **Tiles not rendering / blank render state** resuelto (`b764b31` +
  `979ffe1`).
- ✅ **Cluster expansion UX rota** resuelto (`ecd678c`).
- ✅ **Render free tier sin shell para seed** resuelto (`6a3e809` automatiza
  seed en cada deploy).
- ✅ **BLOCKER-LOCAL** resuelto 2026-05-22 · working tree íntegro.

Progreso del **roadmap AXÓN (extendido)**:

| Fase | Días | Estado |
|---|---|---|
| Fase 1 · Cirugía | D1–D3 | 🟢 cerrada |
| Fase 2 · Mapa Core | D4–D6 | 🟢 cerrada |
| Fase 3 · Refactor mapa | D7–D9 | 🟢 cerrada |
| Fase 4 · Capsule Engine | D10–D11 | 🟢 cerrada |
| Fase 5 · Mind Lite | D12 | 🟢 cerrada |
| Fase 6 · Modularización | D13–D14 | 🟡 parcial |
| Fase 7 · Hardening prod | D15–D17 | 🟢 cerrada |
| Fase 8 · Content Engine | D18–D20 | 🟢 mergeada |
| Fase 9 · Experience Core | D18–D21 | 🟢 mergeada |
| Fase 10 · P0 Map Layer | D22 | 🟢 desplegada |
| Fase 11 · P2 Media + P3 Hygiene | D22 | 🟢 commiteada · migraciones automáticas en deploy |
| Fase 12 · Viewport empty diagnosis | D22 | 🟢 cerrada (migraciones aplicadas · debug residue purged en `123e317`) |
| Fase 13 · TemporalLandmark layer | D22 | 🟢 cerrada (`497ad47`+`6a3e809` · Roma seed automático) |
| Fase 14 · Local Capsule Generator | D23 | 🟢 cerrada (`9828e48` · Wikidata POIs no-LLM) |
| Fase 15 · Echo card cinematográfica | D23 | 🟢 cerrada (`32a572f` · `echo_synthesis.py` 342 L + LLM tool-use + caché 30d + fallback) |
| Fase 16 · MVP CLOSE | D23 | 🟢 shippeada (`123e317` · timeout + safe-area + residue purged) |

---

## 1. Mapa 5D 🟢

URLs PUBLIC (Django): `/map/`, `/api/capsules/5d/`, `/api/capsules/<uid>/light/`,
`/api/capsules/nearby/`, `/near/`.
URLs PUBLIC (Experience Next.js): `/mapa`, `/aqui`.
Endpoints content_engine: `/api/capsules/viewport/`, `/api/landmarks/viewport/`,
`/api/local-capsules/`, `/api/echo/synthesize/`, `/api/debug/capsules-count/`.

| Hito | Estado | Notas |
|---|---|---|
| Endpoints PUBLIC Django vivos | 🟢 | feature `map_5d=True` |
| Clustering Leaflet local | 🟡 | activo, CSS+JS vía `unpkg.com` (legacy Django) |
| Viewport loading (bbox + paginación) | 🟢 | activo en Django + Experience |
| Debounce moveend/zoomend | 🟢 | 250 ms |
| Lazy popups | 🟢 | `api_capsule_light` |
| Cache HTTP | 🟢 | `Cache-Control: public, max-age=60` |
| Refactor `map.html` | 🟢 | 167 L |
| Mobile tuning Django | 🟢 | 14/14 |
| **MapExplorer (Experience) cold-start sobre Roma** | 🟢 | `20f1d46` · revela capa P3 antes de geolocation |
| **MapExplorer geolocation autoritativa** | 🟢 | `d7376a7` · accuracy ≤10 km · `maxAge=0` |
| **MapExplorer cluster expansion UX reparada** | 🟢 | `ecd678c` |
| **MapExplorer tiles render fix** | 🟢 | `b764b31` + `979ffe1` |
| **MapExplorer single-surface Echo card** | 🟢 | `32a572f` · sin paneles paralelos · sin debug HUD |
| **MapExplorer timeout absorbs Render cold-start** | 🟢 | `123e317` |
| **MapExplorer safe-area iOS** | 🟢 | `123e317` |
| **Provisional Wikidata POIs** | 🟢 | `9828e48` · `/api/local-capsules/` |
| **TemporalLandmark layer (Roma 4 polígonos)** | 🟢 | `497ad47` · `/api/landmarks/viewport/?year=YYYY` |
| TTFM proyectado | 🟢 | < 1.2 s (modulo Render cold-start) |
| TTFM medido en 4G real | 🔴 | sin medir post-MVP-close |
| 60 fps en pan/zoom mobile real | 🔴 | sin smoke físico |
| Lighthouse Mobile Perf ≥ 80 | 🔴 | sin medir |

## 2. Capsules 🟢

URLs PUBLIC Django: `/capsules/`, `/capsules/create/`, `/capsules/<uid>/`,
`/capsules/<uid>/like/`, `/capsules/<uid>/delete/`.

| Hito | Estado | Notas |
|---|---|---|
| CRUD básico | 🟢 | |
| Endpoints AR/VR/audio/clip/versions/aport/dialog DORMANT | 🟢 | gated |
| Popup como portal contextual (3 CTAs PUBLIC) | 🟢 | |
| 7 CTAs DORMANT en `capsule_detail` gateados | 🟢 | |
| Flujo marker → popup → cápsula → share | 🟢 | |
| **Echo card como surface narrativa cinematográfica** | 🟢 | `32a572f` · sustituye paneles tier antiguos |
| **Echo synthesis con Anthropic Claude Haiku 4.5** | 🟢 | tool-use enforced JSON · caché Django 30d · fallback procedural |
| Phase 0 Foundation fields | 🟢 | `place`, `parent_capsule`, `root_capsule`, `context_layer`, `importance_score`, `verified` |
| Modelo `Place` canónico | 🟢 | FK desde `Capsule.place` |

## 3. Search 🟢

URLs PUBLIC: `/search/`.

| Hito | Estado | Notas |
|---|---|---|
| `global_search` operativa | 🟢 | full-text |
| Nominatim OSM en mapa | 🟢 | |
| Cobertura cápsulas + usuarios | 🟢 | |

## 4. Timeline 🟢

URLs PUBLIC Django: `/timeline/`.
Experience: `/time/rome`.

| Hito | Estado | Notas |
|---|---|---|
| `timeline` operativa | 🟢 | renderTimeline + centerTimeline(year) |
| 8 epochs con styles | 🟢 | |
| Integración slider ↔ mapa | 🟢 | |
| **TemporalLandmark year-filtered** | 🟢 | `497ad47` · year_from ≤ year ≤ year_to · 4 polígonos Roma seed |

## 5. Users 🟢

URLs PUBLIC: `/`, `/register/`, `/onboarding/`, `/accounts/login`,
`/accounts/logout`, `/profile/`, `/profile/edit/`, `/profile/<alias>/`,
`/dashboard/`.

| Hito | Estado | Notas |
|---|---|---|
| Login nativo Django + registro + onboarding | 🟢 | |
| `AUTH_USER_MODEL` y preferencias | 🟢 | |
| Login social (allauth · Google) | 🔴 | allauth no instalado |
| App `users` extraída del monolito | 🔴 | post-MVP |

## 6. Mind Lite 🟢

URLs PUBLIC Django: `/mind/`, `/mind/ask/`.
Endpoint Echo LLM: `/api/echo/synthesize/` (content_engine).

| Hito | Estado | Notas |
|---|---|---|
| Endpoint accesible sin founder gate | 🟢 | |
| UI reducida a 3 prompts | 🟢 | what / summary / near |
| Modos delegados | 🟢 | |
| Auto-fire si `?capsule=X` | 🟢 | |
| `mind_full` gated | 🟢 | |
| **Backend Anthropic real (Echo card)** | 🟢 | `content_engine/echo_synthesis.py` 342 L · Claude Haiku 4.5 · tool-use JSON enforced · timeout 14s · max_tokens 600 |
| **Caché Django 30d** | 🟢 | key `echo:{entity_id}` |
| **Fallback procedural** | 🟢 | Wikipedia + región-DNA (8 regiones: Galicia, Cantábrico, Andalucía, Castilla, Catalunya, Roma, Ática, Egipto) |
| Backend Anthropic en `ai_lite_ask` legacy | 🟡 | sigue heurística local · contrato JSON listo |

## 7. Share 🟢

| Hito | Estado | Notas |
|---|---|---|
| OG completos en `capsule_detail` | 🟢 | |
| Twitter Card summary_large_image | 🟢 | |
| `navigator.share` con clipboard fallback | 🟢 | |
| Schema.org JSON-LD | 🟢 | |
| Página pública sin login con metadatos | 🟢 | |
| Preview validado en WhatsApp / Twitter / Telegram / LinkedIn | 🔴 | pendiente smoke real post-MVP-close |

---

## Capa transversal — infraestructura

| Item | Estado | Notas |
|---|---|---|
| FEATURE GATED SYSTEM (Django) | 🟢 | features.py + middleware + tags + overrides env |
| Beta-gate (Experience) | 🟢 | `experience/middleware.ts` 307 → `/aqui` |
| `SECRET_KEY` desde `.env` obligatorio | 🟢 | |
| `requirements.txt` reproducible Render Linux | 🟢 | 2 631 B |
| Migración a PostgreSQL en prod | 🟢 | |
| Deploy Render con HTTPS | 🟢 | backend LIVE en `kudos-40cq.onrender.com` con MVP CLOSE shippeado |
| Render blueprint multi-servicio | 🟢 | `render.yaml` 3 servicios |
| **`build.sh` aplica migraciones + seed cada deploy** | 🟢 | `6a3e809` · idempotente |
| CORS hardening | 🟢 | |
| `views.py` working tree íntegro | 🟢 | 2 448 L |
| `urls.py` working tree íntegro | 🟢 | 215 L |
| `models.py` working tree íntegro | 🟢 | 1 210 L |
| `render.yaml` working tree íntegro | 🟢 | 89 L · 3 servicios |
| Git index sano | 🟢 | |
| Snapshots reversibles | 🟢 | 23 archivos `.snapshot.dX.YYYYMMDDTHHMMSSZ` |
| Backups pre-deploy | 🟢 | tar 87 MB · DB 9.5 MB |
| Content Engine V0 en master | 🟢 | + 5 migraciones aplicables |
| Content Engine smoke baseline | 🟧 | 19 tests · 16 PASS · 2 WARN · 1 FAIL del 2026-05-20T14:04 · sin re-correr post-MVP-close |
| **P0 Map Layer endpoint** | 🟢 | `/api/capsules/viewport/` |
| **P3 Temporal Landmarks endpoint** | 🟢 | `/api/landmarks/viewport/` · Roma seed automático |
| **Local Capsule Generator endpoint** | 🟢 | `/api/local-capsules/` · Wikidata POIs no-LLM |
| **Echo Synthesis endpoint** | 🟢 | `/api/echo/synthesize/` · Anthropic Haiku 4.5 |
| **Echo card cinematográfica (frontend)** | 🟢 | `MapExplorer.tsx` single-surface |
| **Debug instrumentation TEMP** | 🟢 | retirada en `123e317` (residue purged) |
| P2 Media pipeline (procedural SVG hero) | 🟢 | 8 estilos · `media_generation.py` |
| P3 Hygiene infrastructure | 🟢 | `hygiene_status` + `winner_distance_m` + commands |
| Content engine management commands | 🟢 | 4 (`invalidate_bad_capsules`, `debug_ranking`, `regenerate_capsule`, `seed_temporal_landmarks_rome`) |
| **Migraciones content_engine aplicadas en Render** | 🟢 | automáticas vía `build.sh` (`migrate --noinput`) |
| **Seed TemporalLandmark Roma en Render** | 🟢 | automático en cada deploy (idempotente) |
| Geolocation accuracy gate (frontend) | 🟢 | accuracy ≤10 km · `maxAge=0` · IP-geo rechazado |
| **Capsule hero real-first media pipeline** | 🟢 | `experience/lib/capsule/media.ts` |
| **Render cold-start timeout absorbido** | 🟢 | `123e317` |
| **Safe-area iOS honored** | 🟢 | `123e317` |
| Experience Core en master | 🟢 | 99 archivos · 11 443+ L · Next 15 |
| Experience Core strict TS errors | 🟢 | 0 |
| AXÓN Phase 0 endpoints | 🟢 | `/api/health/` + `/api/places/<slug>/` |
| Tests Django nuevos Phase 0 | 🟢 | 3 TestCase |
| Lighthouse Mobile ≥ 80 (real) | 🔴 | sin medir post-MVP-close |
| Anthropic API key en Render | 🟧 | a verificar |
| Smoke navegacional físico mobile | 🔴 | pendiente post-MVP-close |
| Preview share validado en redes reales | 🔴 | pendiente |

---

## Definición de "MVP listo para anunciar"

(Tag `v0.9-axon-core` en git ✅ del 2026-05-17 · MVP CLOSE shippeado
2026-05-23 16:42 UTC+2 con commit `123e317`)

- ✅ Tag `v0.9-axon-core` creado.
- ✅ MVP CLOSE commit shippeado en `origin/master`.
- ✅ Las 7 URLs PUBLIC Django operativas.
- ✅ 16/16 rutas DORMANT bloqueadas (audit AXÓN).
- ✅ `views.py` (HEAD) 2 448 L sin duplicados.
- ✅ `map.html` ≤ 200 L con CSS+JS extraídos.
- ✅ Recorrido fluido home → map → marker → popup → cápsula → share → mind.
- ✅ Echo card cinematográfica como surface narrativa única.
- ✅ TemporalLandmark Roma layer disponible.
- ✅ Geolocation autoritativa restaurada.
- ✅ Debug residue purged.
- ✅ Render cold-start absorbido por timeout.
- ✅ `requirements.txt` reproducible en Render Linux.
- ✅ `build.sh` aplica migraciones + seed cada deploy.
- 🟧 `kudos-frontend` desplegable en Render — primer deploy a confirmar.
- 🔴 Lighthouse Desktop ≥ 90, Mobile ≥ 80 — sin medir post-MVP-close.
- 🟡 `python manage.py check` + `python manage.py test` — verde sobre HEAD.

Bloqueos finales para anuncio público:
1. **Verificar HOME 200** en producción post-MVP-close.
2. **Validar `ANTHROPIC_API_KEY`** en env vars del servicio Render `kudos`.
3. **Smoke navegacional físico mobile** del flow MVP completo.
4. **Medir Lighthouse Mobile** sobre URL pública.
5. **Confirmar primer deploy del `kudos-frontend` service** + CORS real.
6. **Validar previews share** en redes reales.
7. **Re-ejecutar `run_master_smoke_map`** baseline post-MVP-close.
8. **Diagnosticar Barcelona UNGROUNDED** en Content Engine smoke.
9. **Gatear ~30 enlaces dormant** en plantillas PUBLIC Django.
10. **Vendoring local de `markercluster`** (legacy Django map).
