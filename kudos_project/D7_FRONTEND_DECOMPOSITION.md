# AXÓN · D7 · Descomposición frontend del Mapa 5D

**Fecha:** 2026-05-16
**Regla suprema:** el usuario no debe percibir cambio visual.

---

## 1. Estado pre-D7

| Indicador | Valor |
|---|---|
| `kudos_app/templates/map.html` | 1 039 líneas · 46 905 bytes |
| Bloques `<style>` inline | 2 (L11-L77 y L79-L257 = 244 líneas CSS) |
| Bloque `<script>` con código | 1 (L401-L882 = 482 líneas JS) |
| Funciones JS top-level | 15 (`STATE`, `escapeHtml`, `goTo`, `refresh`, `_doRefresh`, `render`, `renderMap`, `renderGalaxy`, `renderTimeline`, `hydrateLight`, `searchPlace`, `setTile`, `locateUser`, `setYear`, `applyEraStyle`, `togglePlay`) |
| Zona huérfana | L883-L1039 = 157 líneas (código JS duplicado fuera de cualquier `<script>`) |
| Cierres `</script>` huérfanos | 3 (en L1009, L1038) |
| Dependencia CDN | unpkg.com (Leaflet 1.9.4 + markercluster 1.5.3) |
| Listeners detectados | change · click · input · keydown · locationerror · locationfound · moveend zoomend · popupopen |
| IDs DOM consumidos | 14 (`alt-view`, `era-label`, `hud-count`, `hud-dim`, `hud-view`, `hud-year`, `locate-btn`, `map`, `play-btn`, `search-input`, `search-results`, `ts-label`, `ts-range`, `visible-count`) |

---

## 2. Árbol final

```
kudos_project/
├── kudos_app/
│   └── templates/
│       └── map.html                    166 L · 8 843 B   (-84 % bytes)
└── static/
    ├── vendor/
    │   └── leaflet/
    │       ├── leaflet.css             14 806 B (Leaflet 1.9.4 oficial)
    │       └── leaflet.js              147 552 B (Leaflet 1.9.4 oficial)
    ├── css/
    │   └── map5d.css                   254 L · 10 719 B
    └── js/
        └── map5d/
            ├── core.js                 116 L · STATE + map init + refresh debounced + render switcher
            ├── layers.js                32 L · TILE_LAYERS + setTile (con filtro hue-rotate cyan)
            ├── clustering.js            22 L · L.markerClusterGroup (config D4)
            ├── popups.js                35 L · _LIGHT_CACHE + hydrateLight (D5)
            ├── markers.js               67 L · renderMap + emoji/color/icon/tooltip/popup
            ├── search.js                28 L · searchPlace (Nominatim OSM)
            ├── timeline.js              47 L · renderTimeline + renderGalaxy
            ├── mobile.js                31 L · geolocation (locateUser + locationfound/error)
            └── ui.js                   161 L · listeners UI + slider + applyEraStyle + togglePlay + bootstrap
```

**Total modular: 959 líneas en 11 archivos** (vs 1 039 en uno solo, con 157 líneas huérfanas eliminadas).

---

## 3. Métricas before / after

| Métrica | Antes | Después | Δ |
|---|---|---|---|
| `map.html` líneas | 1 039 | **166** | **-84 %** |
| `map.html` bytes | 46 905 | **8 843** | **-81 %** |
| `<style>` inline en template | 2 bloques (244 L) | **0** | -100 % |
| `<script>` inline complejo | 1 bloque (482 L) | **0** | -100 % |
| `<script>` aperturas/cierres | 5 abren / 5 cierran (DESBALANCEADO real: 1 código + 4 ruido) | **11/11 ✓** | balanceado |
| Zona huérfana | 157 L de código duplicado | **0** | -100 % |
| Dependencia CDN unpkg | Leaflet + markercluster | **solo markercluster** | -50 % |
| Líneas servidas al navegador (total bruto) | 1 039 (un único request) | 959 (11 requests, cacheable independientemente) | similar |

---

## 4. Identidad visual preservada — auditoría 26/27 ✓

Buscado en **todos** los archivos modulares (`map.html` + `map5d.css` + 9 `*.js`):

| Elemento | Estado |
|---|---|
| Paleta neón `--neon: #00f0ff` | ✓ |
| Filtro `hue-rotate(190deg)` sobre tiles | ✓ |
| Glass sidebar `backdrop-filter: blur(18px)` | ✓ |
| Cluster L.markerClusterGroup (D4) | ✓ |
| Listener `moveend zoomend` (D4) | ✓ |
| Cache cliente `_LIGHT_CACHE` (D5) | ✓ |
| `hydrateLight()` (D5) | ✓ |
| Opciones móviles Leaflet (`tap: true`, `worldCopyJump`, `inertia`, `closePopupOnClick`) | ✓ ✓ ✓ ✓ |
| CTAs Ver cápsula / Clip 15s / Audio / Diálogo | ✓ ✓ ✓ ✓ |
| Slider temporal `STATE.year` | ✓ |
| `applyEraStyle` (sepia/grayscale/futuro) | ✓ |
| Vista Timeline | ✓ |
| Vista Galaxy con `animation: pulse` | ✓ |
| `togglePlay` (reproducir viaje temporal) | ✓ |
| Vista inicial mundo `setView([30,0],3)` | ✓ |
| `chunkedLoading: true` cluster | ✓ |
| `class="lazy-meta"` placeholder lazy popup | ✓ |
| `class="cta-row"` táctil D6 | ✓ |
| `.leaflet-popup-close-button` 32×32 | ✓ |

> Único elemento "faltante" en la búsqueda: `viewport-fit=cover`. **Vive en `base.html`** que `map.html` extiende (`{% extends 'base.html' %}`), así que está presente en runtime — es correcto que no esté duplicado en el template hijo.

---

## 5. Mapa de dependencias entre módulos

```
              ┌─────────┐
              │ core.js │  STATE, escapeHtml, map, refresh, render switcher
              └────┬────┘
                   │ (todos importan globales)
       ┌───────────┼───────────────────┐
       │           │                    │
  ┌────▼────┐ ┌────▼────┐ ┌──────▼──────┐
  │layers.js│ │clusterin│ │  search.js  │
  └─────────┘ └──┬──────┘ └─────────────┘
                  │
              ┌───▼────┐    ┌──────────┐
              │popups.j│ →  │mobile.js │
              └───┬────┘    └──────────┘
                  │
              ┌───▼────────┐
              │ markers.js │
              └───┬────────┘
                  │
              ┌───▼─────────┐
              │ timeline.js │
              └───┬─────────┘
                  │
              ┌───▼────┐
              │ ui.js  │  ← listeners + slider + bootstrap (refresh + locateUser)
              └────────┘
```

**Orden de carga estricto en `map.html`:**
core → layers → clustering → popups → markers → search → timeline → mobile → ui

---

## 6. Validación

| Check | Resultado |
|---|---|
| `map.html` < 200 líneas | ✓ **166** |
| 0 CSS inline masivo | ✓ |
| 0 JS inline complejo | ✓ |
| Balance `<script>` 11/11 | ✓ |
| Balance `<style>` 0/0 | ✓ |
| 9 módulos cargados en orden | ✓ |
| Null bytes residuales | 0 |
| URLs → views: 108 refs | ✓ todas resuelven |
| Identidad visual cross-module | 26/27 ✓ |

### Incidente reparado en vuelo

Tras la primera escritura de `map.html`, el archivo quedaba en **46 905 bytes con 38 062 null bytes al final** — el Write tool en este entorno hace padding al sobrescribir archivos grandes (mismo bug que en D3 y D5). Detectado por null-byte audit. Reparado leyendo el archivo crudo, `rstrip(b'\x00')`, y reescribiendo vía `os.replace` atómico → 8 843 bytes limpios, 0 nulls, 166 líneas.

---

## 7. Decisiones técnicas explícitas

| Decisión | Razón |
|---|---|
| 0 frameworks (sin React/Vite/bundlers) | Mandato explícito · JS legible · mantenimiento futuro con cualquier dev |
| Variables globales (no ES modules) | Drop-in del JS original sin reescribir lógica. Mañana puede migrarse a `import/export` cuando se decida. |
| `'use strict';` en cada módulo | Higiene mínima · detecta typos rápido · sin coste runtime |
| Leaflet **local** (`static/vendor/leaflet/`) | Independencia CDN · estabilidad · Lighthouse mejor |
| Markercluster **CDN** todavía | Vendoring offline pendiente; sandbox sin red bloquea fetch. Documentado §8. |
| 9 archivos pequeños en lugar de 1 grande | Mantenibilidad real · separación de responsabilidades · cache HTTP independiente |
| Conservar `onclick="..."` en botones de atajos y slider (Mundo/Europa/setYear/togglePlay) | Mínima ruptura · funciones globales siguen accesibles · regla "no tocar UX" |

---

## 8. Riesgos / deuda restante

1. **Markercluster sigue en unpkg.com.** El repo no contiene el archivo. Acción D9 o D14: descargar `leaflet.markercluster.js` + `MarkerCluster.css` + `MarkerCluster.Default.css` desde un host con acceso y colocarlos en `static/vendor/leaflet.markercluster/`. Mientras: dependencia CDN única.
2. **Sin sourcemap / minify.** Los 9 módulos se sirven sin transformar. Tamaño combinado ~25 KB (gzip ≈ 7 KB). Aceptable para MVP; minify opcional post-MVP.
3. **`/static/leaflet*.js` originales siguen en disco** (3 copias: `leaflet.js`, `leaflet-src.js`, `leaflet-src.esm.js`). Quedan como deuda para limpiar en D14 (todos los `*.map` también). Solo `static/vendor/leaflet/` se sirve a partir de D7.
4. **Snapshot de pre-D7 conservado:** `kudos_app/templates/map.html.snapshot.d7.20260516T134506Z`. Reversión 1-comando.
5. **Sin tests automatizados** del mapa. Mandato dice "no añadir features"; el suite de tests del mapa es deuda post-MVP.
6. **El orden de carga en `<script>` es secuencial sin `defer`/`async`.** Cargar `defer` aceleraría el bootstrap, pero introduce sutilezas con DOM no-listo. Decisión: secuencial bloqueante por ahora.
7. **Variables globales `STATE`, `map`, `markersLayer`, `_LIGHT_CACHE`, etc.** Cualquier script de terceros que defina las mismas globales colisiona. Mitigación futura: `window.KUDOS = {...}` namespace en D14.

---

## 9. Reversión

```bash
cp kudos_app/templates/map.html.snapshot.d7.20260516T134506Z  kudos_app/templates/map.html
rm -rf static/vendor/leaflet/ static/css/map5d.css static/js/map5d/
```

SHA256 post-D7:
- `map.html`: `8e4d09fb…` (verified clean tras reparación)
- `map5d.css`: `cb90b368…`
- `core.js`: `957bb427…`
- `layers.js`: `19853ca1…`
- `clustering.js`: `d652fcdc…`
- `popups.js`: `6e707408…`
- `markers.js`: `6a218583…`
- `search.js`: `75365e43…`
- `timeline.js`: `2e5e519c…`
- `mobile.js`: `ed4a9b06…`
- `ui.js`: `89b7b83b…`
- `vendor/leaflet/leaflet.js`: `db49d009…` (idéntico al `static/leaflet.js` original)

---

## 10. Próximo paso del roadmap

D8 — `static/css/map5d.css`: dividir en sub-archivos por responsabilidad (`base.css`, `sidebar.css`, `hud.css`, `slider.css`, `popups.css`, `responsive.css`) cuando llegue D14 cleanup, o continuar a **D9 — eliminar fetches duplicados / cachear bbox repetidos / añadir headers `Vary`**.
