# AXÓN · D3 · Limpieza de imports muertos

**Fecha:** 2026-05-16
**Objetivo:** ruff F401 ≈ 0 en `kudos_app/views.py` y `kudos_app/models.py`, sin alterar comportamiento runtime.

---

## 1. Protocolo aplicado

| Paso | Estado |
|---|---|
| Snapshot timestamped de `views.py` y `models.py` | ✓ |
| Análisis ruff (intentado) | ✗ no instalable (sandbox bloquea pip) |
| Análisis AST manual | ✓ |
| Cross-check con grep textual | ✓ |
| Cross-check de re-exports (importadores externos) | ✓ |
| Clasificación SAFE_DEAD / UNCERTAIN / SIDE_EFFECT_RISK | ✓ |
| Eliminación solo de SAFE_DEAD | ✓ |
| Parse AST post-edición | ✓ |
| `py_compile` post-edición | ✓ |
| Verificación urls → views | ✓ |
| Verificación modelos importados existen | ✓ |
| Reporte | ✓ |

> Nota técnica: la primera tanda de ediciones vía `Edit` produjo padding con null bytes al final del archivo (47 bytes nulos al final, archivo binarizado). Detectado de inmediato vía AST. Restaurado desde snapshot y reaplicado vía `str.replace` atómico — resultado: 0 null bytes, parse OK.

---

## 2. Clasificación de imports

### `kudos_app/views.py` (61 imports top-level)

| Categoría | Cantidad | Acción |
|---|---|---|
| USED | 57 | preservar |
| **SAFE_DEAD** | **4** | **eliminar** |
| UNCERTAIN | 0 | — |
| SIDE_EFFECT_RISK | 0 | — |

#### SAFE_DEAD eliminados

| Línea | Símbolo | Módulo origen | Confirmación cruzada |
|---|---|---|---|
| L14 | `datetime` (clase) | `datetime` | grep + AST: 0 usos como Name top-level. Las apariciones en L857/1080/1100 son re-imports dentro de funciones (de `timedelta` y `date as ddate`). `timedelta` sí se usa → preservado. |
| L17 | `authenticate` | `django.contrib.auth` | 0 usos. `login` sí se usa → preservado. |
| L26 | `Activity` | `kudos_app.models` | 0 usos en views; modelo sigue existiendo en `models.py` y queda disponible para otras vistas si lo necesitan. |
| L27 | `Certificate` | `kudos_app.models` | 0 usos en views; modelo intacto en `models.py`. |

#### Cross-check re-exports
Búsqueda global `from kudos_app.views import (datetime|authenticate|Activity|Certificate)`:

- `datetime` → no re-exportado ✓
- `authenticate` → no re-exportado ✓
- `Activity` → no re-exportado ✓
- `Certificate` → no re-exportado ✓

Ningún consumidor externo importa estos símbolos a través de `kudos_app.views`. Eliminación segura.

### `kudos_app/models.py` (6 imports top-level)

| Categoría | Cantidad | Acción |
|---|---|---|
| USED | 6 | preservar |
| SAFE_DEAD | 0 | — |

**Nada que limpiar.** El archivo ya está limpio en imports top-level.

---

## 3. Imports preservados explícitamente (criterio de no-tocar)

Aplicado heurístico conservador. NINGÚN import en los dos archivos clasificó como:

- **SIDE_EFFECT_RISK**: no hay `from X import signals/admin/apps`, no hay star-imports.
- **UNCERTAIN**: no hay decoradores `@receiver`/`@register` huérfanos, no hay imports condicionales (`if TYPE_CHECKING:`, `try: import X`).

> Si en futuras pasadas aparece un import a un módulo con efectos colaterales (p. ej. `from kudos_app import signals`), el clasificador lo marcará SIDE_EFFECT_RISK automáticamente y NO se eliminará.

---

## 4. Imports anidados (dentro de funciones) — out of scope D3

Detectados 18 `from ... import ...` o `import ...` dentro del cuerpo de funciones en `views.py`. Estos no entran en F401 a nivel módulo. Quedan como deuda visible para una pasada posterior (deduplicar re-imports de `datetime`/`timedelta`/`date` dentro de funciones — son inocuos pero ruidosos).

---

## 5. Validación post-D3

| Check | Resultado |
|---|---|
| Parse AST `views.py` | ✓ OK |
| Parse AST `models.py` | ✓ OK |
| `py_compile` `views.py` | ✓ OK |
| `py_compile` `models.py` | ✓ OK |
| F401 residuales `views.py` | **0** |
| F401 residuales `models.py` | **0** |
| urls.py → views.py refs (107) | ✓ 0 sin resolver |
| 38 modelos importados existen | ✓ 0 faltantes |
| Imports Django críticos preservados | ✓ shortcuts, contrib.auth, http, db, utils, views.decorators, contrib.messages, contrib.auth.decorators |
| Null bytes residuales | 0 |

---

## 6. Métricas

| Métrica | Antes | Después | Δ |
|---|---|---|---|
| `views.py` líneas | 2 125 | 2 125 | 0 |
| `views.py` bytes | 88 679 | 88 632 | -47 |
| `views.py` imports top-level | 61 | 57 | -4 |
| `models.py` líneas | 1 114 | 1 114 | 0 |
| `models.py` imports top-level | 6 | 6 | 0 |
| **F401 totales** | 4 | **0** | -4 ✓ |

Los cambios son únicamente sobre imports top-level: cero impacto en lógica runtime. El número de líneas se preserva porque eliminamos elementos de listas multi-import, no líneas enteras (las 4 ediciones reducen tokens dentro de líneas existentes).

---

## 7. Reversión

```bash
cp kudos_app/views.py.snapshot.d3.20260516T081829Z kudos_app/views.py
cp kudos_app/models.py.snapshot.d3.20260516T081829Z kudos_app/models.py
```

SHA256 pre-D3:
- `views.py`: `1346f1fb…`
- `models.py`: `cbab53a3…`

SHA256 post-D3:
- `views.py`: `65d5a7a3…`
- `models.py`: `cbab53a3…` (sin cambios)

---

## 8. Próximo paso del roadmap

D4 — Mapa core: clustering Leaflet + paginación de `api_capsules_5d` con bbox filter. Métrica objetivo: < 200 markers visibles en carga inicial.
