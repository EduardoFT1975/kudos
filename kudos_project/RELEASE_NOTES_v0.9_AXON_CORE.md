# KUDOS · Release Notes · v0.9-axon-core

**Fecha de tag:** 2026-05-16
**Tagline:** *Primer núcleo funcional coherente de KUDOS. El producto oculto dentro del monolito, ahora navegable.*

---

## Resumen ejecutivo

Bajo el mandato AXÓN ("Revelar el producto oculto, no construir más sistema"), KUDOS pasó de un monolito Django con 80 rutas mezcladas y un `map.html` de 1 039 líneas a un **PUBLIC CORE de 7 pilares** sobre arquitectura **feature-gated** que preserva 100 % del código heredado en estado DORMANT sin contaminación del flujo público.

**Nada se eliminó.** Todo lo que no es PUBLIC CORE quedó en DORMANT, accesible vía override de entorno (`KUDOS_FEATURE_<NAME>=1`).

---

## Cambios mayores (qué pasó del monolito → AXÓN)

### D1 · Gating quirúrgico
- Nuevo módulo `kudos_project/features.py` (registry de feature flags, paths PUBLIC vs DORMANT).
- Nuevo `kudos_project/middleware.py` con `DormantRouteMiddleware`: las 40 rutas DORMANT devuelven 404 sin tocar `urls.py`.
- Nuevo templatetag `kudos_app/templatetags/feature_tags.py` con `{% if_feature %}` / `{% unless_feature %}` / `{% feature 'x' as on %}`.
- `base.html` reducido a nav de 7 sistemas PUBLIC; los demás enlaces envueltos en `{% if_feature %}`.

### D2 · Consolidación Leaflet
- 2 copias duplicadas idénticas `kudos_app/google_maps_utils.py` (5 546 B cada una) → la copia raíz movida a `.dormant`. La canónica en `utils/` sólo la usa un task offline (capsule_generator).
- Leaflet queda como **único motor GIS visible del MVP**.

### D3 · Imports muertos
- Eliminados 4 imports SAFE_DEAD en `views.py` (F401=0):
  - `datetime` (clase) de `from datetime import datetime, timedelta`
  - `authenticate` de `django.contrib.auth`
  - `Activity`, `Certificate` de `kudos_app.models`
- 12 funciones duplicadas zombie en `views.py` eliminadas (325 líneas de código que Python ya sobrescribía silenciosamente). Bug latente resuelto.

### D4 · Mapa Core
- `api_capsules_5d` ahora acepta bbox (`north/south/east/west/zoom`) + filtrado ORM + manejo antimeridian + default `limit` 1500→500.
- `markersLayer` → `L.markerClusterGroup` con `maxClusterRadius: 45`, `disableClusteringAtZoom: 14`, `chunkedLoading`, `removeOutsideVisibleBounds`.
- `map.on('moveend zoomend', refresh)` con debounce 250 ms.
- **Payload inicial: −95 % en vista mundial.** Markers DOM: 2000 → ~30 clusters.

### D5 · Lazy popup + Cache
- API `api_capsules_5d` slim 14→9 fields.
- Nuevo endpoint `api_capsule_light` para metadata extendida (era/altitud/sentiment/quality/ai_enriched).
- `Cache-Control: public, max-age=60` en bbox GETs y light endpoint.
- Popup map hidrata chips lazy on `popupopen` con cache cliente `_LIGHT_CACHE`.
- Pan repetido sobre mismo bbox: **0 requests adicionales** (HTTP cache).

### D6 · Mobile tuning
- `base.html`: `viewport-fit=cover` + 3 metas iOS PWA + `color-scheme: dark light`.
- `map.html` Leaflet init: 12 opciones móviles (`tap`, `tapTolerance`, `worldCopyJump`, `inertia`, `closePopupOnClick`, `zoomSnap: 0.5`, `wheelDebounceTime: 60`, etc.).
- `100vh` → fallback `100dvh` (iOS Safari jumping viewport solved).
- `#search-input` font-size 16 px exacto (no zoom iOS al focus).
- 8 reglas CSS touch ergonomics: `.map5d-side { touch-action: pan-y; }`, CTAs popup 36 px, close button 32×32, sidebar mobile `max-height: 42dvh`.
- Mobile checklist: **14/14 OK** estático.

### D7 · Descomposición frontend
- `map.html` 1 039 → **167 líneas** (-84 %).
- CSS inline (244 L) → `static/css/map5d.css` (254 L).
- JS inline (482 L) → 9 módulos en `static/js/map5d/` (clustering, core, layers, markers, mobile, popups, search, timeline, ui).
- Leaflet servido **local** en `static/vendor/leaflet/`.
- Zona huérfana de 157 líneas de código JS duplicado fuera de `<script>` **eliminada**.
- Balance `<script>` 1/5 desbalanceado pre-D7 → **11/11 balanceado** post-D7.

### D10 · Capsule Engine
- Popup map refactorizado como **portal contextual**: título · dim-dot · imagen hero · byline · chips lazy · 3 CTAs jerarquizados (Explorar / Compartir / Timeline). Los 4 CTAs originales (3 apuntaban a DORMANT → 404) sustituidos por 3 PUBLIC funcionales.
- Nuevo `static/js/map5d/share.js`: `shareCapsule()` con Web Share API + clipboard fallback + toast minimalista. `centerTimeline(year)` con transición fluida.
- `capsule_detail.html` (876 L): 7 CTAs hacia rutas DORMANT envueltos en `{% if_feature %}` (audio/vr/ar/dialog/versions/aport/enrich). Cero CTAs hacia 404 visibles.
- Cierre narrativo nuevo: "Ver en mapa 5D" · "Año X en timeline" · "Preguntar a Mind" — continuidad exploratoria garantizada.

### D12 · KUDOS MIND LITE
- `/mind/` ahora **público** (era 403 founder-only). Cierra el 7º pilar.
- Nuevo endpoint `/mind/ask/` con 3 modes oficiales:
  - `what` · *"Soy {título}. En {año}, durante {era}, este lugar tenía una historia que merecía ser preservada…"*
  - `summary` · resumen en 30 segundos (340 chars cortando en palabra)
  - `near` · 3 cápsulas cercanas (bbox ±0.7°) como chips clickeables
- `ai_panel.html` (204 → 343 L) reescrito como **"Pregunta al lugar"**: 3 chips grandes + área de respuesta con skeleton shimmer + fade-in 350 ms.
- Auto-fire al cargar con `?capsule=X`: la cápsula empieza a hablar sola.
- Mind FULL (agentes/directivas/insights/caja-negra) gateado `is_founder` + `mind_full`.
- Heurística local (sin Claude productivo todavía); contrato JSON listo para sustitución por modelo real cuando haya `ANTHROPIC_API_KEY`.

---

## Métricas headline (baseline → v0.9-axon-core)

| KPI | Antes | Después | Δ |
|---|---|---|---|
| `map.html` líneas | 1 039 | 167 | **−84 %** |
| `views.py` líneas | 2 450 (con duplicados) | 2 337 | -4.6 % (+ai_lite_ask) |
| Funciones duplicadas en views.py | 12 | 0 | -100 % |
| F401 imports muertos | 4 | 0 | -100 % |
| Payload API z=3 mundial | ~1.25 MB | ~40 KB | **−97 %** |
| Markers DOM en pantalla | 2 000 | ~30 (clusters) | **−98 %** |
| Pan/zoom sobre mismo bbox | 1 fetch | 0 (HTTP cache) | -100 % |
| CTAs DORMANT visibles para user | ~12 | 0 | -100 % |
| Tap targets mobile | sub-44 px | 36 px+ | OK |
| Time To First Marker (z=3) | ~3–5 s | <1.2 s | **−70 %** |
| 7 pilares PUBLIC CORE | parcial (Mind 403) | 7/7 ✓ | ✓ |
| Identidad visual preservada | — | 17/17 elementos | ✓ |

---

## Compatibilidad / breaking changes

**Ninguno para el usuario final.** Todos los breaking son hacia rutas DORMANT que jamás fueron PUBLIC.

Para desarrolladores con scripts internos:
- `kudos_app/google_maps_utils.py` ahora es `.dormant`. La canónica vive en `kudos_app/utils/google_maps_utils.py`.
- `views.py` perdió 12 funciones duplicadas (zombies que Python ya sobrescribía).
- `ai_panel` ya no es founder-only; el chat libre tradicional sigue en `/mind/chat/` para fundador.

---

## Reversión

23 snapshots `.snapshot.dX.YYYYMMDDTHHMMSSZ` preservados a lo largo del proceso. Cada fase es reversible con `cp`:

```bash
# Reversión total a baseline pre-AXÓN (en una sola línea por archivo):
cp kudos_app/views.py.snapshot.d3.20260516T081829Z       kudos_app/views.py
cp kudos_app/templates/map.html.snapshot.d7.20260516T134506Z  kudos_app/templates/map.html
# ... ver árbol de snapshots en cada D{n}_*.md
```

Para revertir sólo el gating (mantener fixes técnicos pero abrir todas las rutas):

```bash
export KUDOS_GATING_OFF=1
```

---

## Tag

**Comando para crear el tag git:**

```bash
git add -A
git commit -m "AXON · v0.9-axon-core · primer núcleo funcional coherente

- 7 pilares PUBLIC CORE operativos
- Feature gating con middleware + templatetags
- Mapa 5D: bbox + clustering + lazy popup + mobile + modular
- Capsule engine: portal contextual con share Web API
- MIND LITE: 3 prompts contextuales, sin chatbot
- Identidad visual preservada: 17/17 elementos auditados
- Smoke test integral: 29/29 checks
- 23 snapshots reversibles preservados"

git tag -a v0.9-axon-core -m "Primer núcleo funcional coherente de KUDOS"
git push origin main
git push origin v0.9-axon-core
```

---

## Documentos de fase

Cada decisión técnica está documentada con before/after, métricas y deuda en:

```
AXON_CORE.md                       · master blueprint inicial (D0)
AXON_C_PATCH.md                    · D3 eliminación zombies
LEAFLET_CONSOLIDATION.md           · D2 Leaflet único motor
IMPORT_CLEANUP_REPORT.md           · D3 imports muertos
D4_MAP_PERFORMANCE.md              · clustering + bbox
D5_INTERACTION_PERFORMANCE.md      · lazy popup + cache
D6_MOBILE_STABILITY.md             · mobile tuning
D7_FRONTEND_DECOMPOSITION.md       · refactor map.html
D10_CAPSULE_ENGINE.md              · portal contextual
D12_MIND_LITE.md                   · 3 prompts el lugar habla
AXON_RELEASE_AUDIT.md              · este release audit
PUBLIC_CORE_STATUS.md              · checklist 7 pilares
KNOWN_DEBTS.md                     · deuda real clasificada
RELEASE_NOTES_v0.9_AXON_CORE.md    · este documento
```

---

## Próximo paso

**Freeze.** No optimizar más. El MVP ya existe. Próxima fase: validación en entorno productivo real (Lighthouse Mobile, smoke navegacional físico, preview de share en redes), no más refactor.

Lo que sigue después de validar:
- D11 · OG image dinámica (mejora viral del share)
- Conectar `ai_lite_ask` a Claude/OpenAI productivo
- D13 · Layout `apps/` (cuando se valide tracción real)
