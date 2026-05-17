# AXÓN · D2 · Consolidación Leaflet

**Fecha:** 2026-05-15
**Objetivo:** Leaflet = único motor GIS operativo visible del MVP.
**Reglas vigentes:** no introducir nuevos providers · no rehacer mapa · no eliminar permanentemente · preservar como `.dormant`.

---

## 1. Auditoría de dependencias Google Maps

### 1.1 Archivos detectados

| Archivo | Líneas | SHA256 | Estado pre-D2 |
|---|---|---|---|
| `kudos_app/google_maps_utils.py` | 141 | `9a6be7e7…` | **duplicado exacto** |
| `kudos_app/utils/google_maps_utils.py` | 141 | `9a6be7e7…` | canónico |
| `kudos_app/tasks/capsule_generator.py` | — | (task offline) | usa `settings.GOOGLE_MAPS_API_KEY` directo |
| `kudos_project/settings.py:180` | — | `GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')` | env var declarada |
| `.env.example:29` | — | `GOOGLE_MAPS_API_KEY=` | placeholder |
| `generate_massive_capsules.py` (raíz) | — | script batch offline | URL literal a Places API |
| `scripts/generate_massive_capsules.py` | — | script batch offline | URL literal a Places API |

### 1.2 Funciones expuestas (idénticas en ambas copias)

`geocode_address`, `get_elevation`, `get_place_details`, `get_directions`, `snap_to_roads`, `get_street_view`, `get_time_zone`.

### 1.3 Mapa de dependencias (consumidores reales detectados por AST)

```
kudos_app/google_maps_utils.py (RAÍZ, duplicada)
        └── importadores: NINGUNO

kudos_app/utils/google_maps_utils.py (UTILS, canónica)
        └── importadores:
            └── kudos_app/tasks/capsule_generator.py:43
                    │   from kudos_app.utils.google_maps_utils import (
                    │       get_elevation, get_street_view, get_time_zone
                    │   )
                    └── importadores: NINGUNO
                        (task offline; no se invoca desde views.py / PUBLIC CORE)
```

Referencia pre-existente rota detectada (no es regresión de D2):
- `kudos_app/legacy_views.py:2124` → `from kudos_app.utils.capsule_generator import generate_capsules` — el módulo vive en `tasks/`, no `utils/`. Este import jamás resolvió. Quedará dormant cuando `legacy_views.py` migre a `dormant/` en Fase 6.

### 1.4 Templates / JS del PUBLIC CORE

- `kudos_app/templates/map.html`: **100% Leaflet** (`unpkg.com/leaflet@1.9.4`). Sin scripts Google.
- `timeline.html`, `search.html`, `capsule_list.html`: sin referencias a Google Maps.
- `staticfiles/admin/...`, `staticfiles/rest_framework/...`: no contienen GIS.

### 1.5 Llamadas runtime activas en el PUBLIC CORE

**Ninguna.** Las únicas funciones server-side de Google Maps (`geocode`, `elevation`, `street_view`, `time_zone`) viven sólo en `capsule_generator.py`, que es un task offline de generación masiva — no se ejecuta desde rutas PUBLIC.

---

## 2. Decisión

| Archivo | Categoría | Acción |
|---|---|---|
| `kudos_app/google_maps_utils.py` (raíz) | duplicado exacto sin consumidores | **→ `.dormant`** |
| `kudos_app/utils/google_maps_utils.py` (utils) | canónica · único consumidor: task offline | mantener intacta |
| `kudos_app/tasks/capsule_generator.py` | task offline, no PUBLIC | mantener intacta (no se invoca desde MVP) |
| `settings.GOOGLE_MAPS_API_KEY` | env var | mantener (sin valor por defecto, no rompe nada vacía) |

**Por qué `utils/` se preserva:** sustituir las funciones server-side requeriría introducir un nuevo provider (Nominatim, Photon, etc.) — explícitamente vetado por D2. La task que las consume no es PUBLIC; queda apagada en MVP. Si en el futuro se quiere reactivar la generación masiva, decisión separada.

---

## 3. Acción aplicada

```bash
mv kudos_app/google_maps_utils.py kudos_app/google_maps_utils.py.dormant
```

**Antes:** dos archivos idénticos (sha256 `9a6be7e7…`), 5 546 bytes c/u.
**Después:** copia raíz preservada como `.dormant` (no se elimina), única copia activa en `utils/`.

---

## 4. Verificación post-acción

| Check | Resultado |
|---|---|
| Parse AST de los 8 archivos del PUBLIC CORE (views, urls, models, settings, middleware, features, feature_tags, project urls) | ✓ todos OK |
| `map.html` sigue 100% Leaflet (sin googleapis) | ✓ |
| Vistas críticas existen y son únicas en `views.py`: `map_view`, `api_capsules_5d`, `api_capsules_nearby`, `near`, `global_search`, `geolocation`, `timeline` | ✓ 7/7 |
| `views.py` importa `google_maps_utils`? | ✗ no (nunca lo importó) |
| `global_search` depende de Google Maps? | ✗ no (solo modelos Django ORM) |
| `/geolocation/` en `DORMANT_PATH_PREFIXES`? | ✓ sí (consistente con MVP) |
| Aliases / `setattr` / `__dict__` sobre `google_maps_utils`? | ✗ ninguno |
| Imports rotos por el rename a `.dormant`? | ✗ ninguno (importadores eran 0) |

---

## 5. Estado GIS post-D2

```
PUBLIC CORE GIS:
└── Leaflet 1.9.4 (CDN unpkg.com) ← único motor activo visible
    └── map.html (881 líneas, refactor pendiente en D7–D9)
    └── api_capsules_5d  / api_capsules_nearby / near

DORMANT GIS (preservado, no invocado):
├── kudos_app/google_maps_utils.py.dormant  (5 546 bytes, copia raíz)
├── kudos_app/utils/google_maps_utils.py    (5 546 bytes, canónica, consumida solo por task offline)
└── kudos_app/tasks/capsule_generator.py    (task batch — no se ejecuta desde MVP)
```

---

## 6. Reversión

```bash
mv kudos_app/google_maps_utils.py.dormant kudos_app/google_maps_utils.py
```

Restaura la duplicación exacta. Sin efectos colaterales (nadie la importaba).

---

## 7. Deuda técnica restante (para fases posteriores)

1. **Servir Leaflet local en lugar de CDN.** `map.html` carga desde `unpkg.com`. El repo ya contiene `static/leaflet.js` + `static/leaflet-src.js` + `static/leaflet-src.esm.js` (3 copias). Acción D7: mantener solo `static/leaflet.js`, eliminar las copias `-src*`, sustituir el `<script>` de CDN.
2. **`legacy_views.py:2124`** importa un módulo en ruta incorrecta (`utils/capsule_generator` cuando vive en `tasks/`). Quedará resuelto al mover `legacy_views.py` a `dormant/` en Fase 6.
3. **`capsule_generator.py`** está mal ubicado: su comentario inicial declara `# kudos_app/utils/capsules.generator.py` pero vive en `tasks/`. Reubicación opcional cuando se decida si reactivarlo.
4. **Funciones `get_unesco_sites`, `get_met_artworks`, etc.** dentro de `utils/` quedan inactivas en MVP. Decisión sobre su destino: separar en `dormant/external_apis/` cuando llegue Fase 6.

---

## 8. Próximo paso del roadmap

D3 — limpieza de imports muertos en `kudos_app/views.py` y `kudos_app/models.py` (objetivo `ruff F401` = 0).
