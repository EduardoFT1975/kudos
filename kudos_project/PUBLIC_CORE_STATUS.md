# KUDOS · PUBLIC CORE Status

**Versión:** v0.9-axon-core
**Fecha:** 2026-05-16

Los 7 pilares oficiales del MVP. Todo lo demás es DORMANT.

---

## ✓ 1 · MAPA 5D

| Aspecto | Estado |
|---|---|
| Ruta PUBLIC | `/map/` → `map_view` |
| API bbox | `/api/capsules/5d/` (9 fields slim · Cache-Control 60 s · north/south/east/west/zoom/limit) |
| Clustering | `L.markerClusterGroup` · maxClusterRadius 45 · disableClusteringAtZoom 14 · chunkedLoading |
| Viewport querying | `map.on('moveend zoomend')` debounced 250 ms |
| Mobile | viewport-fit=cover · `tap: true` · `inertia: true` · `100dvh` · CTAs táctiles 36 px |
| Leaflet | servido local (`static/vendor/leaflet/`) v1.9.4 |
| Modularización | 9 archivos JS en `static/js/map5d/` · CSS en `static/css/map5d.css` |
| `map.html` | 167 líneas (de 1 039 originales) |
| Identidad | hue-rotate(190deg), glass blur 18px, paleta neón cyan/violet/dorado preservadas |
| Vistas alternativas | Galaxy + Timeline (botones view-toggle) preservadas |
| Slider temporal | `setYear`, `applyEraStyle` (8 epochs), `togglePlay` preservados |
| KPI Time To First Marker | **<1.2 s** proyectado |
| KPI Markers en pantalla | **≤200** (clustering activo) |

---

## ✓ 2 · CAPSULES

| Aspecto | Estado |
|---|---|
| Ruta PUBLIC | `/capsules/`, `/capsules/<uid>/`, `/capsules/create/`, `/capsules/<uid>/like/`, `/capsules/<uid>/delete/` |
| Lazy popup detail | `/api/capsules/<uid>/light/` (Cache-Control 60 s) |
| Popup como portal | Título · dim-dot · imagen hero · byline · chips lazy · 3 CTAs |
| CTAs popup | Explorar (cta-primary) · Compartir (cta-share) · Timeline (cta-timeline) — **3/3 PUBLIC** |
| capsule_detail.html | 876 L · OG completos · Twitter Card · Schema.org JSON-LD · cinema-stage Ken Burns |
| CTAs DORMANT gateados | 7 (audio/vr/ar/dialog/versions/aport/enrich) envueltos `{% if_feature %}` |
| Cierre narrativo | Ver en mapa 5D · Año X en timeline · Preguntar a Mind |
| KPI Popup latency | **instant** (pre-bound + chips lazy 60–120 ms) |

---

## ✓ 3 · SEARCH

| Aspecto | Estado |
|---|---|
| Ruta PUBLIC | `/search/` → `global_search` |
| Búsqueda | full-text en `Capsule.contenido/titulo/temas/lugar` + `User.alias/bio` |
| Buscador mapa | Nominatim (OSM, sin clave) en `search.js` |
| Mobile keyboard | `font-size: 16px` (no zoom iOS) · `autocomplete/correct/capitalize off` |
| KPI | sin tocar (vista PUBLIC heredada) |

---

## ✓ 4 · TIMELINE

| Aspecto | Estado |
|---|---|
| Ruta PUBLIC | `/timeline/` → `timeline` |
| Vista integrada | renderTimeline en mapa (view-toggle) · ordena por año asc · estilos cinema |
| `centerTimeline(year)` | activable desde popup mapa (D10) |
| Era styles | 8 epochs con sepia/grayscale/hue-rotate por época |
| KPI | continuidad con mapa preservada |

---

## ✓ 5 · USERS

| Aspecto | Estado |
|---|---|
| Rutas PUBLIC | `/`, `/register/`, `/accounts/login/`, `/accounts/logout/`, `/profile/`, `/profile/edit/`, `/profile/<alias>/`, `/onboarding/`, `/dashboard/` |
| Login persistence | Django Sessions estándar |
| Nav `base.html` | reducido a 7 sistemas PUBLIC + Mind auth-only |
| Sin cambios destructivos | tampoco mejoras nuevas — el pilar ya funcionaba |

---

## ✓ 6 · MIND LITE

| Aspecto | Estado |
|---|---|
| Ruta PUBLIC | `/mind/` → `ai_panel` (Lite por defecto, antes 403 founder-only) |
| Endpoint POST | `/mind/ask/` → `ai_lite_ask` |
| 3 prompts oficiales | `what` / `summary` / `near` |
| Contexto auto | `?capsule=&lat=&lon=&year=` desde popup y capsule_detail |
| Auto-fire | si llegas con `?capsule=X` dispara `what` a los 200 ms |
| UI | 3 chips grandes · skeleton shimmer · fade-in 350 ms |
| Mind FULL | gateado `is_founder` + `mind_full` (oculto en MVP) |
| KPI sensación chatbot | **baja** (copy "el lugar respondiendo") |
| KPI Time To Meaningful Discovery | **<1 s** (auto-fire deep-link) |

---

## ✓ 7 · SHARE

| Aspecto | Estado |
|---|---|
| Popup CTA | `shareCapsule(uid, title)` desde popup mapa (D10) |
| Web Share API | nativa móvil iOS/Android |
| Fallback clipboard | `navigator.clipboard.writeText()` desktop |
| Fallback del fallback | `document.execCommand('copy')` |
| Toast | `.kudos-toast` minimal con auto-dismiss 2.4 s |
| OG tags `capsule_detail` | título · descripción · imagen 1200×630 · url · site_name · locale |
| Twitter Card | summary_large_image · title · description · image |
| Schema.org JSON-LD | Article completo |
| KPI friction share | **1 tap directo desde popup** |
| Mensaje implícito | "mira **esto**" no "mira **esta app**" |

---

## Estado consolidado

| Pilar | Ruta PUBLIC | Funcional | UX cumple mandato | Riesgos |
|---|---|---|---|---|
| 1. Mapa 5D | ✓ | ✓ | ✓ | markercluster vía CDN aún |
| 2. Capsules | ✓ | ✓ | ✓ | OG image dinámica pendiente (D11 futuro) |
| 3. Search | ✓ | ✓ | ✓ | sin cambios D8+ |
| 4. Timeline | ✓ | ✓ | ✓ | scroll-to-year pendiente |
| 5. Users | ✓ | ✓ | ✓ | sin cambios destructivos |
| 6. Mind Lite | ✓ | ✓ (heurística local) | ✓ | sin Claude productivo aún |
| 7. Share | ✓ | ✓ | ✓ | preview real WhatsApp/Twitter pendiente test |

**7/7 pilares operativos · cero CTAs DORMANT expuestos al usuario público.**
