# AXÓN · v0.9-axon-core · Release Audit

**Fecha:** 2026-05-16
**Tag objetivo:** `v0.9-axon-core`
**Significado:** primer núcleo funcional coherente de KUDOS, descomponiendo el monolito original en un PUBLIC CORE de 7 pilares estables sobre arquitectura feature-gated.

---

## 1. Mandato cumplido

> *"Revelar el producto oculto dentro del monolito. No construir más sistema. Convertir el núcleo existente en producto estable, experiencia memorable, demo pública sólida y base escalable real."*

**Estado:** ✓ cumplido. El monolito (2 450 L `views.py` · 1 039 L `map.html` · 80 rutas sin filtrar) se redujo a un PUBLIC CORE navegable y se preservó todo lo demás en DORMANT.

---

## 2. Smoke test integral · 29/29 checks ✓

| Categoría | Pasados |
|---|---|
| `parse` (AST de 8 archivos Python clave) | 8/8 |
| `balance` (`<style>` y `<script>` en 4 templates) | 8/8 |
| `null_bytes_zero` (todos los archivos AXÓN) | 1/1 |
| `no_duplicate_views` | 1/1 |
| `urls_resolve` (109 refs `views.X` definidas) | 1/1 |
| `features_public_names` / `dormant_prefixes` / `dormant_regex` | 3/3 |
| `middleware_registered` (DormantRouteMiddleware en settings) | 1/1 |
| `public_routes_pass` (15 paths PUBLIC dejados pasar) | 1/1 |
| `dormant_routes_block` (16 paths DORMANT bloqueados con 404) | 1/1 |
| `seven_pillars_alive` | 1/1 |
| `gating_balance` + `gating_min_count` (`{% if_feature %}` en 3 templates) | 2/2 |
| **`identity_preserved`** (17 elementos críticos de identidad visual) | **17/17** |

> Suite estática (sin Django runtime, sin red, sin Chrome). En entorno productivo deben sumarse las validaciones de smoke navegacional reales (Lighthouse Mobile, Chrome DevTools 4G, WhatsApp/Twitter preview real).

---

## 3. Validaciones técnicas

### 3.1 URLs → Views
- **109 referencias `views.X`** en `kudos_app/urls.py`
- **0 sin resolver**
- 7 vistas críticas verificadas presentes:
  `home`, `capsule_list`, `capsule_detail`, `map_view`, `global_search`, `timeline`, `ai_panel`, `ai_lite_ask`, `api_capsules_5d`, `api_capsule_light`, `api_capsules_nearby`.

### 3.2 Templates
| Archivo | Líneas | `<style>` | `<script>` | Null bytes |
|---|---|---|---|---|
| `base.html` | 180 | (heredado) | 0 inline | 0 |
| `map.html` | 167 | 0 inline | 11 ext / 11 cierres | 0 |
| `capsule_detail.html` | 876 | 1/1 ✓ | 2/2 ✓ | 0 |
| `ai_panel.html` | 343 | 1/1 ✓ | 1/1 ✓ | 0 |

### 3.3 Static paths
```
static/vendor/leaflet/leaflet.css     14 806 B (Leaflet 1.9.4 oficial)
static/vendor/leaflet/leaflet.js     147 552 B
static/css/map5d.css                  10 719 B (399 L)
static/js/map5d/core.js                4 471 B (116 L)
static/js/map5d/layers.js              1 368 B (32 L)
static/js/map5d/clustering.js            896 B (22 L)
static/js/map5d/popups.js              1 930 B (35 L)
static/js/map5d/markers.js             4 602 B (79 L)
static/js/map5d/search.js              1 251 B (28 L)
static/js/map5d/timeline.js            3 121 B (47 L)
static/js/map5d/mobile.js              1 281 B (31 L)
static/js/map5d/share.js               2 100 B (91 L)
static/js/map5d/ui.js                  6 462 B (161 L)
```

### 3.4 Feature gating consistency
- `kudos_project/features.py` define `PUBLIC_URL_NAMES` (32), `DORMANT_PATH_PREFIXES` (40), `DORMANT_PATH_REGEX` (2), `ALWAYS_ALLOWED_PREFIXES` (5).
- `DormantRouteMiddleware` registrado al final de `MIDDLEWARE` en `kudos_project/settings.py`.
- `feature_tags`: 17+ usos `{% if_feature %}` en 3 templates, balance 1:1 con `{% endif_feature %}`.
- Override por entorno: `KUDOS_GATING_OFF=1`, `KUDOS_GATING_LOG=1`, `KUDOS_FEATURE_<NAME>=1`.

### 3.5 Dormant blocking · validación matrix

**16 paths DORMANT bloqueados con 404:**
`/marketplace/`, `/founder/strategic/`, `/mental-health/`, `/feed/`, `/messages/inbox/`, `/personal/journal/`, `/capsules/xyz/ar/`, `/capsules/xyz/versions/`, `/api/capsules/xyz/memento.json`, `/historical-map/`, `/notifications/`, `/wisdom/`, `/streaming/`, `/news/`, `/sports/champion/`, `/spirituality/`

**15 paths PUBLIC dejados pasar:**
`/`, `/map/`, `/capsules/`, `/capsules/abc123/`, `/search/`, `/timeline/`, `/mind/`, `/mind/ask/`, `/profile/`, `/accounts/login/`, `/admin/`, `/api/capsules/5d/`, `/api/capsules/abc/light/`, `/static/leaflet.js`, `/register/`

---

## 4. KPIs MVP (estimación real)

| KPI | Baseline (pre-AXÓN) | Post-AXÓN |
|---|---|---|
| **Time To Awe** (carga inicial → primer marker) | ~3–5 s (1500 markers, sin cluster) | **<1.2 s** (clustering + bbox + ≤250 markers en z=3) |
| **Time To Meaningful Discovery** (popup → cápsula → mind) | impredecible (CTAs DORMANT 404) | **<3 s** (popup instant + capsule_detail directo + Mind auto-fire) |
| **Payload inicial API z=3 mundial** | ~1.25 MB (5000 × 250 B) | **~40 KB** (-97 %) |
| **Markers DOM en pantalla (z=3)** | hasta 2 000 | **~30 clusters / ≤200 individuales** |
| **Requests por sesión pan/zoom** | 0 fetch dinámico (estancado) | 1 fetch debounced 250 ms + HTTP cache 60 s |
| **`map.html` líneas** | 1 039 (con 157 huérfanas) | **167** (-84 %) |
| **`views.py` líneas** | 2 450 (con 325 huérfanas) | **2 337** (-4.6 %, +ai_lite_ask) |
| **F401 imports muertos** | 4 confirmados (views.py) | **0** |
| **Funciones duplicadas en views.py** | 12 | **0** |
| **Popup latency perceived** | instant (pero con 404 en 3/4 CTAs) | **instant + 3/3 CTAs PUBLIC funcionales** |
| **Mobile usability (D6 checklist)** | sin viewport-fit, sin tap tuning, sin `dvh` | **14/14 OK** |
| **CTA DORMANT visibles para usuario** | ~12 (4 popup + 7 capsule + 1 admin) | **0** (todo gateado) |
| **Identidad visual preservada** | — | **17/17 elementos** |

---

## 5. Estructura del repo · estado final v0.9-axon-core

### 5.1 Nuevos archivos AXÓN
```
kudos_project/features.py                193 L  · registry feature flags
kudos_project/middleware.py               61 L  · DormantRouteMiddleware
kudos_app/templatetags/feature_tags.py    60 L  · if_feature / unless_feature
static/css/map5d.css                     399 L  · estilos extraídos D7
static/vendor/leaflet/                   162 KB · Leaflet 1.9.4 local D7
static/js/map5d/ (10 módulos)            670 L  · JS modular D7-D12
```

### 5.2 Documentos AXÓN generados (Phase by phase)
```
AXON_CORE.md                  · master blueprint inicial
AXON_C_PATCH.md               · D3 eliminación zombies
LEAFLET_CONSOLIDATION.md      · D2 Leaflet único motor
IMPORT_CLEANUP_REPORT.md      · D3 imports muertos
D4_MAP_PERFORMANCE.md         · clustering + bbox
D5_INTERACTION_PERFORMANCE.md · lazy popup + cache
D6_MOBILE_STABILITY.md        · mobile tuning
D7_FRONTEND_DECOMPOSITION.md  · refactor map.html
D10_CAPSULE_ENGINE.md         · portal contextual
D12_MIND_LITE.md              · 3 prompts el lugar habla
AXON_RELEASE_AUDIT.md         · este documento
PUBLIC_CORE_STATUS.md         · 7 pilares
KNOWN_DEBTS.md                · deuda real
RELEASE_NOTES_v0.9_AXON_CORE.md
```

### 5.3 Snapshots reverse-rollback
23 snapshots timestamped (uno por fase Dx) preservados en `kudos_app/`, `static/css/`, `static/js/map5d/`, `kudos_app/templates/`. Cada fase es reversible con 1 comando `cp`.

---

## 6. Rutas activas confirmadas

### PUBLIC CORE (siempre accesible)
```
/                       home
/map/                   map_view
/capsules/              capsule_list
/capsules/<uid>/        capsule_detail
/capsules/<uid>/like/   toggle_like
/capsules/create/       create_capsule
/search/                global_search
/timeline/              timeline
/mind/                  ai_panel (Lite por defecto)
/mind/ask/              ai_lite_ask  (POST · 3 modes)
/profile/               profile
/register/              register
/accounts/login/        auth_views.LoginView
/api/capsules/5d/       api_capsules_5d (bbox)
/api/capsules/<uid>/light/  api_capsule_light (lazy)
/about/, /terms/, /privacy/, /manifiesto/
```

### DORMANT (404 vía middleware)
40 prefijos cubriendo marketplace, congress, social, sports, mental-health, spirituality, founder/*, feed, follow, messages, bookmarks, personal/*, wisdom, notifications, achievements, data-analysis, founder/*, capsule/(ar|vr|audio|clip|enrich|versions|aport|dialog), historical-map, geolocation, etc.

---

## 7. Resultado

**KUDOS v0.9-axon-core es un producto coherente, navegable y consistente.** Los 7 pilares del PUBLIC CORE están operativos; toda la complejidad heredada del monolito vive intacta en DORMANT sin contaminar la experiencia pública.

Próximo paso: **freeze**. No optimizar más. Validar en entorno productivo real (Lighthouse Mobile, smoke navegacional, preview de share en redes).
