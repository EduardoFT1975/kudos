# CURRENT_BLOCKERS.md — KUDOS / AXÓN

Última actualización: 2026-05-23 (auto · scheduled-task `daily-status`)
Responsable: Eduardo
Criterio: bloqueos **activos** que impiden o frenan la demo pública del
MVP CLOSE (commit `123e317` · 2026-05-23 16:42 UTC+2 · sobre master con
33+ commits hotfix desde el tag `v0.9-axon-core`). Cada bloqueo incluye
problema, impacto, solución, riesgo y prioridad.

Leyenda prioridad: 🟥 P0 (bloquea hoy) · 🟧 P1 (bloquea esta semana) ·
🟨 P2 (bloquea anuncio público) · 🟩 P3 (deuda no urgente).

---

## Cola P0 — bloquean hoy

### BLOCKER-AX-ANTHROPIC-KEY · `ANTHROPIC_API_KEY` no verificada en Render 🟥

- **Problema:** el commit `32a572f` (2026-05-23 15:34) introduce
  `content_engine/echo_synthesis.py` (342 L) que llama a Anthropic
  (Claude Haiku 4.5 default, override vía `KUDOS_ECHO_MODEL`) para generar
  el subtítulo + micro-narrativa + cultural-DNA de cada Echo card. Si
  `ANTHROPIC_API_KEY` no está configurada en las env vars del servicio
  Render `kudos`, el endpoint `POST /api/echo/synthesize/` cae al
  fallback procedural (`source=wikipedia_fallback` o `minimal_fallback`).
- **Impacto:** la promesa narrativa cinematográfica del MVP es la voz LLM
  KUDOS. El fallback procedural es funcional pero no entrega la
  diferenciación. **Sin LLM, el Echo card pierde su filo.**
- **Solución:**
  1. Render dashboard → servicio `kudos` → Environment.
  2. Confirmar que `ANTHROPIC_API_KEY` está presente y vigente.
  3. Validar end-to-end:
     ```bash
     curl -X POST https://kudos-40cq.onrender.com/api/echo/synthesize/ \
       -H 'Content-Type: application/json' \
       -d '{"entity_id":"Q10285","title":"Coliseo","lat":41.8902,
            "lng":12.4924,
            "wikipedia_url":"https://es.wikipedia.org/wiki/Coliseo"}'
     ```
     Esperar `"source": "llm"` (o `"cache"` en hits repetidos). Si recibe
     `"wikipedia_fallback"` o `"minimal_fallback"`, la key no está activa.
  4. Si la key falta: añadirla en Render env vars y forzar redeploy.
- **Riesgo:** cuota Anthropic agotada → mismo síntoma (cae al fallback).
  Mitigación: caché Django 30 días por `entity_id` limita el flujo de
  llamadas reales; un usuario que repite POIs ya no genera coste.
- **Prioridad:** P0 — la voz LLM define el MVP cinematográfico.

### BLOCKER-AX-HOME-VERIFY · Validar HOME 200 en producción post-MVP-close 🟥

- **Problema:** desde el commit `67fe207` (2026-05-21 16:03) la home está
  saneada con `STATICFILES_STORAGE=CompressedStaticFilesStorage` y `home()`
  hardenizada con try/except. Pero **toda la cadena posterior** (Content
  Engine merges + Experience merges + P0/P2/P3 + temporal landmarks +
  Echo card + MVP close) **no se ha smokeado contra la home Django de
  producción**.
- **Impacto:** la landing pública es el primer touchpoint del backend
  Django (mientras `kudos-frontend` no esté validado como landing oficial).
  Sin home 200, no hay demo anunciable del backend.
- **Solución:**
  1. `curl -I https://kudos-40cq.onrender.com/` → esperar 200.
  2. `curl -I https://kudos-40cq.onrender.com/api/health/` → esperar 200
     + JSON `{status, service, version, uptime}`.
  3. `curl -I https://kudos-40cq.onrender.com/api/landmarks/viewport/?bbox=12.4,41.8,12.6,41.95&year=100` →
     esperar 200 + GeoJSON `FeatureCollection` con ≥4 features Roma.
  4. Si alguno devuelve 500: leer Render → Logs y aplicar fix puntual.
- **Riesgo:** que la causa real fuese un context processor que se ejecute
  en toda página → afectaría más allá de `/`. Mitigación: smoke audit AXÓN
  validó que el resto del site responde 200 sobre HEAD del tag.
- **Prioridad:** P0 hasta que `curl` confirme.

---

## Cola P1 — bloquean esta semana

### BLOCKER-AX-FRONT-DEPLOY · Primer deploy del frontend en Render + URL real 🟧

- **Problema:** `render.yaml` v2 declara el servicio `kudos-frontend`
  (Next.js 15, `rootDir: experience`, `npm install && npm run build`,
  `npm start -- -p $PORT`, `BETA_HIDE_DORMANT=1`,
  `NEXT_PUBLIC_API_BASE_URL=https://kudos-40cq.onrender.com`). El primer
  deploy del servicio en Render aún no está confirmado / smokeado con la
  MVP CLOSE de `123e317`.
- **Impacto:** Experience Core es la superficie cinematográfica oficial
  (Echo card, MapExplorer cold-start Roma, TemporalLandmark layer
  visible). Sin frontend desplegado, el MVP-close sólo es accesible a
  desarrolladores con build local.
- **Solución:**
  1. Render dashboard → New → Blueprint → seleccionar el repo →
     auto-detección leerá `render.yaml`.
  2. Confirmar URL real asignada a `kudos-frontend`.
  3. Si difiere de `https://kudos-frontend.onrender.com`, actualizar
     `CORS_ALLOWED_ORIGINS` en el servicio `kudos`.
  4. `curl -I https://<URL-real>/` → 200.
  5. Verificar flow MapExplorer: cold-start Roma → landmarks visibles →
     prompt geolocation → fly user → POIs Wikidata provisional → click
     POI → Echo card con narrativa LLM.
- **Riesgo:** `package-lock.json` aún sin commitear formalmente
  (`render.yaml` usa `npm install`); resoluciones de deps fluctúan entre
  builds. Mitigación post-deploy: generar lockfile local + commit + pasar
  a `npm ci`.
- **Prioridad:** P1.

### BLOCKER-AX-MOBILE-SMOKE · Smoke navegacional físico mobile del flow MVP 🟧

- **Problema:** la cadena MVP CLOSE introduce muchas capas nuevas en
  ~24 h (cold-start Roma, geolocation autoritativa, provisional Wikidata
  POIs, Echo card, safe-area iOS, timeout cold-start). Ningún flow ha
  sido validado en **dispositivo físico** iOS Safari + Android Chrome.
- **Impacto:** target "Time To Awe" del mandato AXÓN sigue siendo una
  promesa hasta que un usuario real toque el producto.
- **Solución:**
  1. Abrir `kudos-frontend.onrender.com/mapa` (o `/aqui`) en iOS Safari
     real (iPhone 12+) y Android Chrome (Pixel 5+).
  2. Verificar:
     - Cold-start sobre Roma renderiza tiles (no blank).
     - Polígonos TemporalLandmark visibles (Coliseo, Foro, Circo, Murallas).
     - Permiso geolocation se solicita; cuando se concede, cámara va al
       usuario.
     - Si geolocation rechazada, cámara permanece sobre Roma.
     - POIs provisionales aparecen como markers cerca del usuario.
     - Click en POI abre Echo card cinematográfica.
     - Safe-area iOS respetada (notch + bottom indicator no tapan UI).
     - Render cold-start (~25-35 s primera vez) absorbido sin spinner
       roto.
  3. Documentar bugs en `BUG_LIST.md`.
- **Riesgo:** descubrir un bug crítico en mobile que requiera revertir
  el MVP-close. Mitigación: snapshot pre-MVP-close existe.
- **Prioridad:** P1 — gate previo al anuncio público.

### BLOCKER-AX-COLD-START · Render free tier cold-start latency 25-35 s 🟧

- **Problema:** el servicio `kudos` (Django backend) en Render free tier
  duerme tras ~15 min de inactividad y tarda 25-35 s en despertar. El
  commit `123e317` añade timeout en el fetch del MapExplorer para
  absorber esta espera, pero el usuario sigue viendo un período largo
  antes de que los markers aparezcan.
- **Impacto:** "Time To Awe" degradado en visitas cold. Una compartición
  en redes puede toparse con esta espera si llega fuera de horas activas.
- **Solución (opciones):**
  1. **Upgrade a paid tier** (siempre-on): $7/mes Starter, elimina
     cold-start completamente.
  2. **Cron ping** desde GitHub Actions / cron-job.org cada 10 min para
     mantener despierto (frágil, gratis).
  3. **Skeleton UI más explícito** durante cold-start con copy "Despertando
     el servidor… 30 s" (UX honesto).
- **Riesgo:** si el anuncio público es masivo y el cold-start es la
  primera impresión, churn alto. Mitigación: opción 1 antes del anuncio.
- **Prioridad:** P1 (mitigado en código · decisión operativa).

### BLOCKER-AX-CE-SMOKE · Re-ejecutar Content Engine smoke post-MVP-close 🟧

- **Problema:** la última ejecución válida de `run_master_smoke_map`
  (16 PASS · 2 WARN · 1 FAIL · 15.27 s) es del 2026-05-20T14:04:31Z,
  **ANTES** de la cadena de merges Content Engine + P2/P3 + temporal
  landmarks + Echo synthesis. Aunque ningún cambio toca `ranking.py` /
  `landmarks.py` directamente, falta una baseline auditable sobre el
  binario desplegado actual.
- **Impacto:** sin baseline auditable post-MVP-close. Si Barcelona vuelve
  UNGROUNDED, sabemos que el bug es estable. Si otros casos cambian,
  necesitamos detectarlo antes de anunciar.
- **Solución:**
  ```bash
  python manage.py run_master_smoke_map --output-dir reports/
  # Comparar con reports/master_smoke_20260520_140431.{csv,json}
  ```
- **Riesgo:** SPARQL Wikidata puede estar fluctuante; usar
  `CONTENT_ENGINE_GEOCACHE_ENABLED=1` reduce variabilidad.
- **Prioridad:** P1.

### BLOCKER-AX-LH · Lighthouse Mobile real sin medir post-MVP-close 🟧

- **Problema:** no hay métrica de rendimiento real sobre la URL pública
  con MVP CLOSE desplegado. El MapExplorer ha cambiado masivamente
  (+2 295 L netas en las últimas 16 commits).
- **Impacto:** "Time To Awe" sin validar empíricamente.
- **Solución:** ejecutar Lighthouse Mobile (Chrome DevTools 4G + CPU 4×
  throttle) sobre las dos URLs:
  - Backend Django: `kudos-40cq.onrender.com/`.
  - Frontend Next.js: `kudos-frontend.onrender.com/mapa` (post primer
    deploy del frontend).
  Target ≥ 80 en Performance / A11y / SEO / Best Practices.
- **Riesgo:** backdrop-filter blur en Echo card puede bajar Performance
  Mobile. Mitigación: A/B con blur desactivado si el score cae < 80.
- **Prioridad:** P1.

### BLOCKER-AX-MC · MarkerCluster servido por CDN unpkg (legacy Django) 🟧

- **Problema:** `kudos_app/templates/map.html` líneas 9-11 cargan
  `unpkg.com/leaflet.markercluster@1.5.3` (CSS×2 + JS). Sin cambios.
  Solo afecta el mapa Django legacy; el MapExplorer Next.js usa MapLibre
  GL JS sin esta dependencia.
- **Impacto:** dependencia de red para el sistema #1 en backend Django.
- **Solución:** vendoring local en `static/vendor/leaflet/markercluster/`
  alineado con la misma versión (1.5.3) y reemplazar las 3 líneas por
  `{% static %}`.
- **Prioridad:** P1 (en backend legacy · P2 si Experience es la landing).

---

## Cola P2 — bloquean anuncio público, no la semana

### BLOCKER-AX-NAV · Navegación contaminada Django (~30 fugas dormant) 🟨

- **Problema:** sin cambios desde FEATURE_GATE_AUDIT 2026-05-19. Los
  templates Django muestran botones a rutas dormant que devuelven 404 al
  clicarse: `home.html` 13 enlaces, `capsule_detail.html` 7,
  `dashboard.html` 4, `ai_panel.html` 3. Solo afecta backend Django; el
  frontend Next.js tiene middleware beta-gate que redirige a `/aqui`.
- **Impacto:** Time To Awe contaminado en backend Django.
- **Solución:** envolver cada `{% url 'dormant_*' %}` listado en
  `FEATURE_GATE_AUDIT_20260519.md §6` con `{% if_feature %}`.
- **Prioridad:** P2.

### BLOCKER-AX-DUP · Duplicado URL `mind/chat/` en `kudos_app/urls.py` 🟨

- **Problema:** `urls.py:188` y `:195` declaran ambos
  `path('mind/chat/', views.ai_chat, name='ai_chat')`. Django usa el
  primero; ruido en `reverse()`.
- **Impacto:** bajo (no rompe nada en runtime).
- **Solución:** borrar la línea duplicada `:195`.
- **Prioridad:** P2.

### BLOCKER-AX-CE-BCN · Barcelona · Plaça Catalunya UNGROUNDED 🟨

- **Problema:** master smoke 2026-05-20T14:04Z reporta `Barcelona · Plaça
  Catalunya` con `failure_class=UNGROUNDED` (candidatos 10, latencia
  3 390 ms, ningún grounding gana). El resto de capitales europeas
  (Madrid, Roma, París) pasa con confidence ≥ 0.96.
- **Impacto:** un caso failure no rompe el pipeline (84 % PASS), pero
  Barcelona es showcase obvio. No bloquea Echo card (camino vía Wikidata
  directo en `echo_synthesis.py`).
- **Solución:** investigar `content_engine/ranking.py` y
  `content_engine/landmarks.py` con los 10 candidatos del último smoke.
- **Prioridad:** P2.

### BLOCKER-AX-DL · Deep-link `?lat=&lon=&year=` no honrado en `/map/` 🟨

- **Problema:** `map_view` ignora los query params del cierre narrativo
  D10. (Legacy Django; el MapExplorer Next.js sí los respeta.)
- **Impacto:** el CTA Django llega al mapa pero carga vista mundial.
- **Solución:** parsear `request.GET` en `map_view`, pasar centro + zoom
  + año a `map.html` como `data-*`.
- **Prioridad:** P2.

### BLOCKER-AX-RL · Sin rate-limit en APIs Django públicas heredadas 🟨

- **Problema:** `api_capsules_5d`, `api_capsule_light`, `ai_lite_ask` no
  tienen throttle. Los endpoints nuevos (`place-capsule`,
  `local-capsules`, `echo/synthesize`) sí lo tienen pendiente de revisar.
- **Impacto:** vulnerable a martilleo desde único IP.
- **Solución:** `django-ratelimit` ya en `requirements.txt`, decorar las
  3 views — 60 req/min para bbox y light, 12 req/min para mind. Verificar
  también rate-limit en `echo_synthesize` (LLM cost guard).
- **Prioridad:** P2.

### BLOCKER-AX-ALL · Login social no implementado 🟨

- **Problema:** ningún proveedor OAuth conectado.
- **Impacto:** MVP exige Google según project plan.
- **Solución:** `django-allauth` con Google primero.
- **Prioridad:** P2.

### BLOCKER-AX-SHARE · Preview share sin validar 🟨

- **Problema:** OG/Twitter/JSON-LD están pero sin verificar rendering
  real en redes.
- **Impacto:** el sistema #7 podría fallar el día del lanzamiento.
- **Solución:** abrir 3 URLs de cápsula en Twitter Card Validator,
  Facebook Sharing Debugger, WhatsApp Web, Telegram Web.
- **Prioridad:** P2.

### BLOCKER-AX-PLACES · `/api/places/<slug>/` con datos reales 🟨

- **Problema:** endpoint existe pero tabla `Place` arranca vacía.
- **Impacto:** Experience Core consume este endpoint en
  `app/places/[slug]/page.tsx`. Sin datos, ruta `/places` queda oculta
  por middleware beta-gate.
- **Solución:** seed management command (e.g. `seed_rome`) que cree al
  menos 3 Places + linkee cápsulas. Patrón ya establecido por
  `seed_temporal_landmarks_rome`.
- **Prioridad:** P2.

### BLOCKER-AX-ECHO-RL · Sin rate-limit explícito en `/api/echo/synthesize/` 🟨

- **Problema:** el endpoint LLM `echo_synthesize` no tiene
  `@ratelimit` decorator visible en `api.py`. Sin throttle, un script
  puede agotar cuota Anthropic rápidamente.
- **Impacto:** coste LLM no acotado.
- **Solución:**
  1. Añadir `@ratelimit(key='ip', rate='12/m', block=True)` al view.
  2. Confirmar caché Django 30d ya activo en `echo_synthesis.py`
     (`_CACHE_TTL_S = 60 * 60 * 24 * 30`).
  3. Verificar `max_tokens=600` cap.
- **Prioridad:** P2.

---

## Cola P3 — deuda no urgente

### Snapshots y duplicados en raíz 🟩

- 29 snapshots `.snapshot.*` (~1.2 MB) + 7 templates duplicados + 5
  huérfanos (`settings.py` 0 B, `kudos_app_urls.py` 407 B).
- Solución: una jornada post-MVP para limpiar.

### 17 inits de Leaflet copy-paste en templates feature 🟩

- Todas DORMANT pero ejecutarán si se exponen.

### `legacy_views.py` (2 160 L) en `kudos_app/` 🟩

- Pospuesto conscientemente. Mover post-FREEZE.

### 18 imports anidados en `views.py` 🟩

- Limpieza no urgente.

### 4 scripts huérfanos rotos en raíz 🟩

- `art_culture.py`, `control.py`, `generate_capsules.py`,
  `social_impact.py`. Sin uso; borrar o mover a `legacy/`.

### `kudos_app/views.py` 2 448 L (extracción pendiente) 🟩

- Fase 6 del roadmap AXÓN cerrada como 🟡 parcial.

---

## Resueltos desde el último update (2026-05-22 → 2026-05-23)

- ✅ **BLOCKER-AX-VIEWPORT-EMPTY** · viewport empty payload neutralizado.
  Migraciones `0003`/`0004` aplicadas automáticamente vía `build.sh`. La
  capa visible para usuario es ahora `landmarks_viewport` +
  `local_capsules_generate` (no `capsules_viewport`).
- ✅ **BLOCKER-AX-MIGRATIONS-RENDER** · `build.sh` ejecuta `migrate
  --noinput` + `seed_temporal_landmarks_rome` en cada deploy (`6a3e809`).
  Las 5 migraciones de content_engine (`0001`-`0005`) se aplican
  automáticamente.
- ✅ **BUG-051 Viewport empty payload** · causa raíz neutralizada por
  migraciones automáticas + nuevos pipelines (landmarks + provisional).
- ✅ **BUG-052 HUD overlay + markers TEMP rojos** · retirados en
  `123e317` (residue purged).
- ✅ **BUG · Tiles not rendering en mount** · `b764b31` (force absolute
  fullscreen + resize after mount).
- ✅ **BUG · Blank render state en single-point flyTo** · `979ffe1`.
- ✅ **BUG · Cluster expansion UX rota** · `ecd678c`.
- ✅ **BUG · Render free tier sin shell para seed** · `6a3e809` (seed
  automatizado en `build.sh`, idempotente).
- ✅ **BUG · Debug provisional panel** · reemplazado por Echo card
  cinematográfica (`32a572f`).
- ✅ **BUG · Cold-start sin contexto narrativo** · arranca sobre Roma +
  revela capa P3 (`20f1d46`).
- ✅ **BUG · Cámara movible sin geolocation legítima** · `d935f49` +
  `687aebf` desactivan auto-flyTo + auto-fit durante MVP demo.
- ✅ **BUG · Cold-start latency expone error frontend** · `123e317`
  añade timeout que absorbe la espera.
- ✅ **BUG · Safe-area iOS no respetada** · `123e317`.
- ✅ **BUG · Multiple tier renderers conflict** · `ab2259c` (2026-05-21)
  + reforzado por Echo card single-surface (`32a572f`).

---

## Bloqueos abiertos · resumen ejecutivo

- **P0 (2):** BLOCKER-AX-ANTHROPIC-KEY · BLOCKER-AX-HOME-VERIFY.
- **P1 (6):** FRONT-DEPLOY · MOBILE-SMOKE · COLD-START · CE-SMOKE · LH
  Mobile · MARKERCLUSTER.
- **P2 (8):** NAV Django · DUP urls · CE-BCN · DEEP-LINK · RATE-LIMIT ·
  ALLAUTH · SHARE preview · PLACES seed · ECHO-RL.
- **P3 (6):** snapshots · 17 Leaflet inits dormant · legacy_views ·
  imports anidados · 4 scripts huérfanos · views.py extracción.

**Total bloqueos abiertos: 22** (de los cuales 2 son P0, 6 son P1).
**Bloqueos cerrados desde 2026-05-22:** 13.
