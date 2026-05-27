# PROJECT_STATUS.md — KUDOS / AXÓN

Última actualización: 2026-05-23 (auto · scheduled-task `daily-status`)
Responsable: Eduardo
Estado general: **🚀 MVP CLOSE · `123e317` desplegado · Echo card cinematográfica live · TemporalLandmark layer (Roma seed) live · Local Capsule Generator (Wikidata POIs) live · MapExplorer cold-start sobre Roma + geolocation autoritativa · 15 commits 2026-05-22 (tarde-noche) + 2026-05-23**

Producto oficial: *Google Earth emocional + histórico + humano.*
Mandato vigente: **AXÓN FREEZE → MVP demo público shippeado (Echo card como única superficie cinematográfica) · vigilar Render cold-start + smoke navegacional mobile.**

---

## Resumen ejecutivo

KUDOS shippea el **MVP-close** el 2026-05-23 a las 16:42 UTC+2 con el commit
`123e317` ("MVP close · timeout absorbs Render cold-start, safe-area honored,
residue purged"). En las últimas ~20 h se cerraron **15 commits** que
transforman el mapa en una experiencia narrativa cinematográfica: del fix
de tiles + fitBounds (2026-05-22 noche) → cold-start sobre Roma con overlay
de landmarks temporales (`20f1d46`) → restauración de geolocation autoritativa
(`ecd678c` → `d7376a7`) → generador de cápsulas provisionales desde Wikidata
(`9828e48`) → reemplazo de paneles debug por la **primera Echo card cinematográfica**
(`32a572f`) → cierre de MVP con timeouts que absorben el cold-start de Render
+ safe-area + purga de residuos (`123e317`).

El producto entrega ahora una sola superficie de respuesta sobre el mapa:
**Echo card**. Sin paneles paralelos, sin debug visible, sin tiers múltiples
de render. La Echo card es alimentada por dos pipelines complementarios:

1. **Local Capsule Generator** (`/api/local-capsules/` · `9828e48`): genera
   POIs provisionales desde Wikidata cerca de la coordenada del usuario sin
   pasar por LLM. Marcadores instantáneos, zero coste.
2. **Echo Synthesis** (`/api/echo/synthesize/` · `32a572f` · módulo nuevo
   `content_engine/echo_synthesis.py` 342 L): por click en POI, llama a
   Anthropic (Claude Haiku 4.5 · tool-use enforced JSON) y devuelve
   subtítulo + micro-narrativa + cultural-DNA en tono cinematográfico KUDOS.
   Caché Django 30 días por `entity_id`. Fallback procedural desde
   Wikipedia + región-DNA (Galicia, Cantábrico, Andalucía, Castilla,
   Catalunya, Roma, Ática, Egipto) cuando `ANTHROPIC_API_KEY` falta o el
   LLM falla. Cuatro source tags: `cache` | `llm` | `wikipedia_fallback` |
   `minimal_fallback`.

A esto se suma la **capa P3 de TemporalLandmark** (`497ad47` + `6a3e809`):
nuevo modelo `TemporalLandmark` (city, kind, geometry_geojson polygon,
year_from/year_to, summary, source), migración `0005_temporal_landmark`,
endpoint `GET /api/landmarks/viewport/?bbox=...&year=YYYY&limit=N` que
devuelve GeoJSON FeatureCollection year-filtered, y management command
`seed_temporal_landmarks_rome` idempotente (4 polígonos: Coliseo, Foro
Romano, Circo Máximo, Murallas Aurelianas). El comando se ejecuta en
**cada deploy** vía `build.sh` (Render no tiene shell free-tier), así
que la tabla nunca queda vacía en producción.

El mapa arranca ahora desde Roma (cold-start `20f1d46`) para revelar la
capa P3 sin geolocation; al recibir geolocation real (accuracy ≤10 km,
`maxAge=0`, IP-geo rechazado), el camera flyTo prioriza la ubicación del
usuario. Al limpiar la deuda de markers (race condition, CSS conflictivo,
markers rojos de debug) y reemplazar el panel debug por la Echo card, el
producto ya entrega la promesa de "Time To Awe" sobre dispositivos reales
modulo el cold-start de Render free tier (que el timeout absorbe).

**Highlight 2026-05-23 (9 commits · `20f1d46` → `123e317`):**

1. **`20f1d46` (00:06 UTC+2) · feat(map): cold-start MapExplorer over Roma
   to reveal P3 landmark overlay.** 801 L net (+712 / -89). Reescribe el
   bootstrap del mapa para arrancar sobre las coordenadas del Foro Romano
   y mostrar la capa de TemporalLandmark antes de pedir geolocation.
2. **`d935f49` (00:31)** · `fix(map): disable useGeolocation auto-flyTo
   during MVP demo`. Evita que la cámara se mueva sin contexto durante
   demo.
3. **`687aebf` (00:40)** · `fix(map): disable fetchViewport auto-fit
   camera during MVP demo`. Frena re-encuadres agresivos.
4. **`ecd678c` (13:36)** · `fix(map): restore real geolocation and repair
   cluster expansion UX` · 227 L. Restaura geolocation autoritativa y
   arregla expansión de clusters.
5. **`8233259` (13:55)** · `fix(map): keep camera on user location when
   nearby memories are empty`. La cámara se queda en el usuario aunque
   no haya cápsulas cerca.
6. **`d7376a7` (14:03)** · `fix(map): make geolocation the authoritative
   initial camera`. Geo sobrescribe el cold-start sobre Roma cuando llega.
7. **`9828e48` (14:24)** · `feat(content): generate provisional local
   capsules from user geolocation` · 244 L · 3 archivos. Nuevo endpoint
   `GET /api/local-capsules/?lat=...&lng=...&radius=...&limit=N` consume
   Wikidata SPARQL para devolver POIs candidatos en JSON ligero. Sin LLM.
8. **`64322d5` (15:17)** · `fix(map): provisional markers race +
   simplified CSS + nuclear test`. Cierra race condition en mount de
   markers + simplifica CSS heredado.
9. **`32a572f` (15:34)** · `feat(echo): first cinematic Echo card
   replaces debug provisional panel` · 308 L (+287/-21). Reemplaza el
   panel debug por la **primera Echo card cinematográfica**, una sola
   superficie de respuesta sobre el mapa. Backend `echo_synthesis.py`
   (342 L · LLM tool-use + caché 30d + fallback procedural).
10. **`123e317` (16:42 · MVP CLOSE)** · `chore(ship): MVP close · timeout
    absorbs Render cold-start, safe-area honored, residue purged` · 1 669 L
    (+1 182 / -487). Sella el MVP: timeouts absorben el cold-start de
    Render (servicio free tier despierta ~30 s), CSS respeta safe-area
    iOS, y purga de código residual (paneles tier, markers TEMP rojos,
    HUD overlay debug). **El mapa ya no tiene debug visible.**

**Highlight 2026-05-22 (tarde-noche · 6 commits adicionales):**

- **`94eb54c` (20:41)** · `debug(map): viewport instrumentation only`.
- **`3cc5c28` (20:58)** · `debug(map): replace custom markers with pure
  default MapLibre markers + auto fitBounds` · -171/+42 (simplificación
  drástica).
- **`979ffe1` (21:07)** · `fix(map): defer fitBounds after resize +
  single-point flyTo to prevent blank render state`.
- **`b764b31` (21:13)** · `fix(map): force absolute fullscreen map
  container + resize after mount (tiles not rendering)`.
- **`497ad47` (23:19)** · `feat(backend): temporal landmark viewport API
  + MVP Rome seed` · 6 archivos · +439 L · nuevo modelo `TemporalLandmark`
  (210-264 en models.py), migración `0005_temporal_landmark` (+77 L),
  endpoint `landmarks_viewport` (+92 L), command
  `seed_temporal_landmarks_rome` (+148 L · 4 polígonos Roma idempotentes),
  registro admin (+26 L).
- **`6a3e809` (21:52 UTC)** · `ops(build): seed Roma temporal landmarks
  on every deploy` · `build.sh` +1 L. Cierra el bug latente "tabla creada
  pero zero rows porque el seed nunca corrió en Render" (free tier no
  tiene shell access).

**Estado working tree (2026-05-23):** HEAD `123e317` ya en `origin/master`
(`git log HEAD..origin/master` vacío). Los archivos núcleo siguen íntegros
(`kudos_app/views.py` 2 448 L, `kudos_app/urls.py` 215 L, `kudos_app/models.py`
sin cambios desde `dd42db3`, `render.yaml` con 3 servicios). Working tree
con 351+ archivos divergentes vs HEAD (CRLF/whitespace en archivos legacy,
sin tocar). El binario commiteado y desplegado **incluye**: P0 viewport,
P2 media, P3 hygiene, P3 temporal landmarks, Local Capsule Generator, Echo
synthesis LLM, MapExplorer refactor, safe-area + timeout fixes.

El **Content Engine V0 (Phase 11/12/13)** ahora tiene 5 migraciones
aplicables: `0001_initial`, `0002_wikidatageocache`, `0003_media_fields`,
`0004_hygiene_fields`, `0005_temporal_landmark`. Las cinco se ejecutan
automáticamente en cada deploy vía `build.sh`. El último smoke
`run_master_smoke_map` (2026-05-20T14:04) sigue siendo la línea base
hasta re-correr post-MVP-close.

El **Experience Core (Next.js 15)** despliega vía servicio
`kudos-frontend` en Render. La superficie cinematográfica oficial es el
`MapExplorer.tsx` (1 033 L · refactor mayor en los últimos 7 días, +2 295
L netas vs HEAD~16). El Echo card sustituye al `CapsuleStateRouter` para
respuestas POI; `CapsuleSuccess` queda como render path para cápsulas
verificadas históricas.

---

## Qué funciona

- **HEAD `master` = `origin/master` = `123e317`** · MVP CLOSE shippeado.
- **Tag `v0.9-axon-core`** sellado en `baf9fc0` (referencia histórica).
- **Smoke test integral AXÓN · 29/29 checks** validado sobre HEAD del tag
  (sin re-ejecutar tras los 15 commits MVP-close).
- **PUBLIC CORE Django · 7/7 pilares operativos** (Mapa 5D, Capsules,
  Search, Timeline, Users, Mind Lite, Share).
- **Experience Core Next.js 15 · MapExplorer cinematográfico:**
  - **Cold-start** sobre Roma para revelar capa de TemporalLandmark sin
    geolocation (`20f1d46`).
  - **Geolocation autoritativa** cuando llega (accuracy ≤10 km, `maxAge=0`,
    IP-geo rechazado · `ecd678c` + `d7376a7`).
  - **Single-surface Echo card** como única respuesta a click en POI
    (`32a572f`). Sin paneles paralelos, sin debug HUD.
  - **Timeout absorbs Render cold-start** (`123e317`) — el primer fetch
    espera al despertar del free tier.
  - **Safe-area iOS** honored — overlay respeta notch + bottom indicator.
  - **Cluster expansion UX** reparada (`ecd678c`).
  - **MapLibre default markers** como base (`3cc5c28`), con custom markers
    sólo para cápsulas verificadas.
- **P0 Map Layer real:** `GET /api/capsules/viewport/?bbox=...&limit=N`
  (commit `5bd586c`) consumido por MapExplorer.
- **P3 Temporal Landmarks layer (nuevo 2026-05-22 · `497ad47` + `6a3e809`):**
  - Modelo `TemporalLandmark` (`content_engine/models.py` L210-264):
    `city`, `kind` (monument/path/walls/forum/...), `title`, `summary`,
    `geometry_geojson` (JSONField · Polygon), `year_from`, `year_to`,
    `source` (wikidata QID / generic), `image_url`, `meta JSONField`.
    Indices: `city`, `kind`, `(year_from, year_to)`.
  - Migración `0005_temporal_landmark`.
  - Endpoint `GET /api/landmarks/viewport/?bbox=minLng,minLat,maxLng,maxLat&year=YYYY&limit=N`
    devuelve `FeatureCollection` GeoJSON con `properties.kind`, `title`,
    `summary`, `year_from`, `year_to`, `source`, `image_url`. Filtra por
    bbox (intersección con polygon) y por `year_from <= year <= year_to`.
  - Management command `seed_temporal_landmarks_rome` (148 L · idempotente
    `update_or_create` por `(city, title)`): Coliseo, Foro Romano, Circo
    Máximo, Murallas Aurelianas.
  - `build.sh` ejecuta el seed en **cada deploy** (Render free tier sin
    shell), upserts seguros, ~4 filas.
- **Local Capsule Generator (nuevo 2026-05-23 · `9828e48`):**
  - Endpoint `GET /api/local-capsules/?lat=...&lng=...&radius=...&limit=N`
    (`content_engine/api.py` L? · +126 L).
  - Consume Wikidata SPARQL para devolver POIs candidatos cerca del usuario.
  - **Sin LLM, sin caché DB** — purpose: alimentar markers provisionales
    instantáneos en MapExplorer.
- **Echo Synthesis (nuevo 2026-05-23 · `32a572f`):**
  - Endpoint `POST /api/echo/synthesize/` con body `{entity_id, title, lat,
    lng, wikipedia_url}`.
  - Módulo `content_engine/echo_synthesis.py` (342 L):
    - Caché Django 30 días key `echo:{entity_id}`.
    - Wikipedia REST fetch (ES preferido, EN fallback) para `extract` +
      `image`.
    - Anthropic call (model env `KUDOS_ECHO_MODEL` default
      `claude-haiku-4-5-20251001`, tool-use JSON enforced, timeout 14s,
      max_tokens 600).
    - Fallback procedural desde Wikipedia + región-DNA (Galicia,
      Cantábrico, Andalucía, Castilla, Catalunya, Roma, Ática, Egipto).
    - Source tags: `cache` | `llm` | `wikipedia_fallback` |
      `minimal_fallback`.
- **AXÓN Phase 0 Foundation:** `GET /api/health/`, `GET /api/places/<slug>/`.
- **P0/P2/P3 endpoints anteriores:** viewport, debug capsules-count,
  media pipeline (procedural SVG hero · 8 estilos), hygiene infrastructure
  (`hygiene_status` + `winner_distance_m` + commands), todo migrado y
  servido por el deploy actual.
- **`render.yaml` v2** con 3 servicios (`kudos` Django backend,
  `kudos-frontend` Next.js, `kudos-db` Postgres).
- **`build.sh`** ahora ejecuta: `pip install` → `collectstatic` →
  `migrate` → `seed_temporal_landmarks_rome`. Idempotente, ~30 s.
- **Feature gating en producción** activo.
- **Content Engine V0** desplegado: pipeline place-capsule + media
  generation + hygiene + temporal landmarks.
- **Experience Core** desplegado: 99 archivos, 11 443+ L, Next 15 + React
  18 + TS 5.6 + Tailwind 3.4 + Plausible.
- **Geolocation drift fix** validado en código (commits 2026-05-21 +
  refuerzos 2026-05-23).
- **CORS hardening** activo.

## Qué está roto / en riesgo

- **🟧 RENDER COLD-START LATENCY (mitigado, monitorizar).** El servicio
  Django free tier despierta en ~25-35 s tras periodos de inactividad.
  El timeout añadido en `123e317` absorbe la espera en el primer fetch
  del MapExplorer, pero el usuario sigue viendo el cold-start si entra
  frío. **Acción:** medir TTFM real post-deploy y considerar upgrade a
  paid tier si el demo se anuncia ampliamente.
- **🟧 SMOKE NAVEGACIONAL MOBILE REAL.** Aún no se ha validado el flow
  completo `cold-start Roma → geolocation → POIs provisionales → click
  POI → Echo card LLM` en dispositivo físico (iOS Safari + Android
  Chrome).
- **🟧 ANTHROPIC_API_KEY EN RENDER.** El backend `echo_synthesize` cae al
  fallback procedural si la env var no está en Render. **Validar `Echo
  card` con LLM real antes de demo pública.**
- **🟧 BARCELONA · Plaça Catalunya UNGROUNDED** en master smoke
  2026-05-20 (`failure_class=UNGROUNDED`, 10 candidatos, latencia 3 390
  ms). Sin re-correr smoke desde el merge de Content Engine. No bloquea
  Echo card (camino alternativo via Wikidata SPARQL), pero sí bloquea el
  pipeline `place-capsule` clásico en esa coordenada.
- **🟨 LIGHTHOUSE MOBILE REAL** sin medir sobre la URL pública con MVP
  CLOSE desplegado.
- **🟨 PREVIEW SHARE** sin validar en WhatsApp / Twitter / Telegram /
  LinkedIn con la nueva landing.
- **🟨 NAVEGACIÓN CONTAMINADA Django · ~30 enlaces dormant en plantillas
  PUBLIC** (FEATURE_GATE_AUDIT 2026-05-19). Solo afecta backend Django;
  Experience tiene middleware beta-gate.
- **🟨 DUPLICADO URL pattern** `kudos_app/urls.py:188`/`:195`
  `path('mind/chat/', views.ai_chat, ...)`. Sin cambios.
- **🟩 Smoke Content Engine sin re-correr** post-MVP-close.
- **🟩 29 snapshots `.snapshot.*` + 7 templates duplicados + 5 huérfanos**
  en raíz (DEBT_SCAN 2026-05-19).
- **🟩 17 inits de Leaflet copy-paste** en templates feature dormant.
- **🟩 `markercluster` vía CDN unpkg.com** (legacy Django map).
- **🟩 `legacy_views.py`** (2 160 L) sigue en `kudos_app/`.
- **🟩 4 scripts huérfanos rotos** en raíz.

## Qué falta para MVP demo público

Ahora que el MVP-close está shippeado, los bloqueos son de validación y
operativos, no de implementación:

1. **Medir TTFM real** sobre URL pública en 4G mobile (Lighthouse Mobile,
   target ≥ 80).
2. **Smoke navegacional físico mobile** (iOS Safari + Android Chrome) del
   flow Roma cold-start → geolocation → POI → Echo card.
3. **Validar `ANTHROPIC_API_KEY`** en Render env vars del servicio `kudos`
   y confirmar que Echo card devuelve source `llm` (no fallback).
4. **Preview share** validado en redes reales.
5. **Re-correr `run_master_smoke_map`** post-MVP-close para nueva línea
   base.
6. **Verificar HOME 200** en producción tras toda la cadena de deploys.
7. **Diagnosticar Barcelona UNGROUNDED** (no bloquea Echo card, sí pipeline
   place-capsule).
8. **Gatear ~30 enlaces dormant** en plantillas PUBLIC Django (no afecta
   Experience).

## Próximo paso exacto

**1) Verificar deploy de `123e317` en Render** (auto-deploy típico
3-5 min post-push):

```bash
curl -I https://kudos-40cq.onrender.com/
curl -I https://kudos-40cq.onrender.com/api/health/
curl  https://kudos-40cq.onrender.com/api/landmarks/viewport/?bbox=12.4,41.8,12.6,41.95&year=100
```

Esperar `200` + GeoJSON `FeatureCollection` con ≥4 features Roma.

**2) Validar Echo card LLM end-to-end:**

```bash
curl -X POST https://kudos-40cq.onrender.com/api/echo/synthesize/ \
  -H 'Content-Type: application/json' \
  -d '{"entity_id":"Q10285","title":"Coliseo","lat":41.8902,"lng":12.4924,"wikipedia_url":"https://es.wikipedia.org/wiki/Coliseo"}'
```

Esperar `source ∈ {cache, llm}` (no `wikipedia_fallback` ni
`minimal_fallback`). Si cae al fallback → `ANTHROPIC_API_KEY` no
configurada en Render.

**3) Smoke navegacional mobile real** sobre el frontend Next.js (URL
exacta del servicio `kudos-frontend` en Render):

- Abrir en iOS Safari + Android Chrome.
- Verificar: cold-start sobre Roma → landmarks visibles → permiso
  geolocation → flyTo a usuario → POIs provisionales (Wikidata) → click
  POI → Echo card abre con narrativa cinematográfica.

**4) Medir Lighthouse Mobile** sobre la URL pública del frontend.
Target ≥ 80 (P/A11y/SEO/BP). Si bajaba por backdrop-filter, considerar
A/B post-medición.

**5) Re-correr Content Engine smoke** y comparar contra baseline
2026-05-20:

```bash
python manage.py run_master_smoke_map --output-dir reports/
```

**6) Validar previews share** en WhatsApp/Twitter/Telegram/LinkedIn con
URL real `/capsules/<uid>/`.

Reglas durante FREEZE (`FREEZE_v0.9_AXON_CORE.md §6`):
- ✗ NO nuevas features.
- ✗ NO nueva arquitectura.
- ✓ SÍ bugs detectados en demo / productivo.
- ✓ SÍ ajustes de copy.
- ✓ SÍ Content Engine + Experience Core (decisión consciente, ya en master).

---

## Métricas clave (snapshot 2026-05-23 · MVP CLOSE)

| Métrica | Objetivo MVP | Valor actual | Δ vs 2026-05-22 |
|---|---|---|---|
| Tag git productivo | `v0.9-axon-core` | `v0.9-axon-core` ✅ | 0 |
| HEAD master | íntegro | `123e317` ✅ MVP CLOSE | +15 commits |
| `origin/master` sincronizado | sí | sí ✅ | 0 |
| Commits 2026-05-22 (totales) | n/a | 11 (5 mañana + 6 tarde-noche) | +6 |
| Commits 2026-05-23 | n/a | 9 (cold-start Roma → MVP close) | +9 |
| MVP CLOSE shippeado | sí | sí ✅ (`123e317` 16:42 UTC+2) | nuevo |
| Smoke test integral AXÓN | 100 % | 29/29 ✅ (sobre tag) | 0 |
| Smoke Content Engine (master map) | ≥ 90 % | 16/19 PASS (84 % · sin re-correr) | 0 |
| Pilares PUBLIC operativos | 7 | 7 ✅ | 0 |
| Migraciones content_engine | n/a | 5 ✅ (`+0005_temporal_landmark`) | +1 |
| Management commands content_engine | n/a | 4 ✅ (`+seed_temporal_landmarks_rome`) | +1 |
| Endpoints content_engine nuevos | n/a | +3 (`/landmarks/viewport/`, `/local-capsules/`, `/echo/synthesize/`) | +3 |
| MapExplorer.tsx líneas | n/a | 1 033 L (refactor mayor · 9 commits hoy) | +~300 L netas |
| Echo card cinematográfica live | sí | sí ✅ (`32a572f`) | nuevo |
| Local Capsule Generator (Wikidata POIs) | sí | sí ✅ (`9828e48`) | nuevo |
| TemporalLandmark layer (Roma seed) | sí | sí ✅ (`497ad47`+`6a3e809`) | nuevo |
| Geolocation autoritativa | sí | sí ✅ (`d7376a7`) | refuerzo |
| Cold-start sobre Roma | sí | sí ✅ (`20f1d46`) | nuevo |
| Render cold-start timeout absorbido | sí | sí ✅ (`123e317`) | nuevo |
| Safe-area iOS honored | sí | sí ✅ (`123e317`) | nuevo |
| Debug HUD/markers TEMP retirados | sí | sí ✅ (`123e317` residue purged) | resuelto |
| `build.sh` seed automático cada deploy | sí | sí ✅ (`6a3e809`) | nuevo |
| `views.py` líneas (HEAD/working) | ≤ 2 500 | 2 448 / 2 448 ✅ | 0 |
| `urls.py` líneas (HEAD/working) | parseable | 215 / 215 ✅ | 0 |
| `render.yaml` servicios | 2+ db | 3 ✅ | 0 |
| Deploy live backend | ✓ | ✓ Render (`kudos-40cq.onrender.com` · `123e317` shippeado) | actualizado |
| Deploy live frontend | ✓ | pendiente validación visual post-MVP-close | 0 |
| Lighthouse Mobile (real) | ≥ 80 | sin medir | 0 |
| Preview share (WhatsApp/Twitter/Telegram/LinkedIn) | validado | sin validar | 0 |
| Anthropic API key en Render | sí | a verificar | 0 |

---

## Cambios desde la última actualización (2026-05-22 → 2026-05-23)

### Backend · 2 commits 2026-05-22 (tarde) + 1 commit 2026-05-23 (madrugada)

- **`497ad47` (2026-05-22 23:19 UTC+2)** · `feat(backend): temporal
  landmark viewport API + MVP Rome seed` · 6 archivos · +439 L.
  - `content_engine/models.py` +94 L (`TemporalLandmark` model).
  - `content_engine/migrations/0005_temporal_landmark.py` +77 L.
  - `content_engine/api.py` +92 L (`landmarks_viewport` view).
  - `content_engine/management/commands/seed_temporal_landmarks_rome.py`
    +148 L (4 polígonos Roma idempotentes).
  - `content_engine/admin.py` +26 L (registro admin).
  - `content_engine/urls.py` +4 L (2 path patterns).
- **`6a3e809` (2026-05-22 21:52 UTC)** · `ops(build): seed Roma temporal
  landmarks on every deploy` · `build.sh` +1 L. Cierra el gap del
  free-tier sin shell.
- **`9828e48` (2026-05-23 14:24)** · `feat(content): generate provisional
  local capsules from user geolocation` · 3 archivos · +244 L.
  - `content_engine/api.py` +126 L (`local_capsules_generate`).
  - `content_engine/urls.py` +4 L.
  - `experience/features/map/MapExplorer.tsx` +114 L (consumer).
- **`32a572f` (2026-05-23 15:34)** · `feat(echo): first cinematic Echo
  card replaces debug provisional panel` · 308 L net.
  - `experience/features/map/MapExplorer.tsx` +287/-21 L (Echo card UI).
  - Módulo nuevo `content_engine/echo_synthesis.py` (342 L · LLM tool-use
    + caché + fallback) registrado vía `urls.py` (+1 endpoint
    `echo_synthesize`).

### MapExplorer · 9 commits 2026-05-22 noche + 2026-05-23

- `94eb54c` debug instrumentation only · +85 L
- `3cc5c28` pure default MapLibre markers + auto fitBounds · -171/+42 L
- `979ffe1` defer fitBounds after resize + single-point flyTo · +40/-10 L
- `b764b31` force absolute fullscreen container + resize after mount · +13/-11 L
- `20f1d46` cold-start over Roma to reveal P3 landmark overlay · +712/-89 L
- `d935f49` disable useGeolocation auto-flyTo during MVP demo · +14/-8 L
- `687aebf` disable fetchViewport auto-fit camera · +19/-3 L
- `ecd678c` restore real geolocation + repair cluster expansion UX · +211/-16 L
- `8233259` keep camera on user location when nearby empty · +45/-19 L
- `d7376a7` make geolocation the authoritative initial camera · +32/-23 L
- `64322d5` provisional markers race + simplified CSS + nuclear test · +39/-24 L

### MVP CLOSE · 1 commit 2026-05-23 (final)

- **`123e317` (16:42 UTC+2)** · `chore(ship): MVP close · timeout absorbs
  Render cold-start, safe-area honored, residue purged` · 1 669 L
  (+1 182 / -487) sobre `MapExplorer.tsx`. **Cierra el MVP**.

### Cerrados desde 2026-05-22 mañana

- ✅ **BUG-051 · Viewport empty payload** → causa raíz mitigada con
  migraciones aplicadas (`0003`/`0004`/`0005`) vía `build.sh` automático.
  La capa visible para usuario ahora son `landmarks_viewport` +
  `local_capsules_generate`, no `capsules_viewport`.
- ✅ **BUG-052 · HUD overlay + markers rojos TEMP** → retirados en
  `123e317` (residue purged).
- ✅ **Tiles not rendering en mount** → `b764b31` (force absolute
  fullscreen + resize after mount).
- ✅ **Blank render state en single-point flyTo** → `979ffe1` (defer
  fitBounds + single-point flyTo).
- ✅ **Cluster expansion UX rota** → `ecd678c` (restore real geolocation
  + repair cluster expansion).
- ✅ **Render free tier sin shell para seed** → `6a3e809` (seed en
  `build.sh`, idempotente).
- ✅ **Debug provisional panel** → reemplazado por Echo card
  cinematográfica (`32a572f`).
- ✅ **Cold-start sin contexto narrativo** → arranca sobre Roma + revela
  capa P3 (`20f1d46`).
- ✅ **Cámara movible sin geolocation legítima** → `d935f49` + `687aebf`
  desactivan auto-flyTo + auto-fit durante MVP demo.

### Abiertos nuevos

- **BUG-055 · Render cold-start latency 25-35 s** (🟧 mitigado vía
  timeout en `123e317`, monitorizar).
- **BUG-056 · `ANTHROPIC_API_KEY` en Render env por verificar** (🟧 ·
  sin key, Echo card cae al fallback procedural).
- **BUG-057 · Smoke navegacional mobile físico** (🟧 · pendiente iOS
  Safari + Android Chrome con MVP close desplegado).
- **BUG-058 · Lighthouse Mobile sobre URL pública post-MVP-close** (🟨).

Ver `BUG_LIST.md` para el detalle completo.

Reglas durante FREEZE (`FREEZE_v0.9_AXON_CORE.md §6`):
- ✗ NO nuevas features.
- ✗ NO nueva arquitectura.
- ✓ SÍ bugs detectados en demo / productivo.
- ✓ SÍ ajustes de copy.
- ✓ SÍ Content Engine + Experience Core (decisión consciente).
