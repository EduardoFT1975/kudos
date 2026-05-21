# CORE_HEALTH · KUDOS / AXÓN

**Run:** 2026-05-19 (automated · scheduled task `core-health`)
**Scope:** mapa carga · search responde · API capsules responde · templates renderizan
**Result:** ❌ **FALLO CRÍTICO — núcleo no arranca**

---

## TL;DR

Tres archivos núcleo del módulo Django `kudos_app` están **truncados** en el árbol de trabajo respecto a `git HEAD`. Mientras estos archivos permanezcan en este estado, **Django no puede importar la app** y por tanto **todas las rutas devolverán 500** (incluido `/`, `/map/`, `/search/`, `/api/capsules/5d/`).

| Check | Estado | Causa raíz |
|---|---|---|
| mapa carga | ❌ | `kudos_app/views.py` truncado → `ImportError` antes de servir `map_view` |
| search responde | ❌ | mismo `ImportError` → `global_search` no se carga |
| API capsules responde | ❌ | mismo `ImportError` → `api_capsules_5d` no se carga |
| templates renderizan | ⚠️ Sintaxis OK · runtime ❌ | Templates clave bien formados, pero no llegan a renderizarse porque la vista upstream falla |

---

## 1 · Archivos truncados (working tree)

Verificado por inspección byte-a-byte y por `ast.parse()`.

| Archivo | Tamaño actual | Fin actual (repr) | HEAD termina en |
|---|---|---|---|
| `kudos_app/views.py` | 98 493 B · 2 375 líneas | `…    if request.POS` (sin `:` ni cuerpo) | `def privacy(request):\n    return render(request, 'privacy.html')\n` |
| `kudos_app/urls.py` | 10 173 B · 209 líneas | `…name='personal_healt` (string sin cerrar) | `…name='personal_habit_toggle'),\n]\n` |
| `kudos_app/models.py` | 46 756 B · 1 131 líneas | `…verbose_name = '` (string sin cerrar) | `…ordering = ['-score', '-created']` (con resto del archivo) |

`ast.parse` confirma los tres `SyntaxError`. `settings.py`, `manage.py`, `kudos_project/urls.py`, `kudos_project/settings.py`, `kudos_app/__init__.py` parsean correctamente.

> El índice de git también está dañado: `git status` devuelve `fatal: unknown index entry format 0x74000000`. `git log` y `git show HEAD:<path>` sí funcionan, así que el commit íntegro está disponible para recuperar.

## 2 · Endpoints comprobados (estáticamente)

Las rutas y las vistas existen y, en HEAD, están completas y razonables (no son stubs):

- `path('map/', views.map_view, name='map')` → `views.py:334` `def map_view(request)` renderiza `map.html` con `capsules_json`, `total_capsules`, `now_year`.
- `path('search/', views.global_search, name='search')` → `views.py:358` `def global_search(request)` filtra `Capsule`, `User`, `Proposal`, `SocialSpace` por `q` y renderiza `search.html`.
- `path('api/capsules/5d/', views.api_capsules_5d, name='api_capsules_5d')` → `views.py:2100` lógica D4 (BBOX, año, dimensión, modo, paginación). También presentes: `api_capsule_light`, `api_capsules_nearby`, `api_capsule_memento`.

Estas vistas **no se pueden importar** mientras `views.py` esté truncado.

## 3 · Templates

Smoke-check de balance de `{% %}` y `{{ }}` con cierre correcto de `if/for/block/with/...`:

| Template | Resultado |
|---|---|
| `kudos_app/templates/map.html` | OK · 21 bloques abiertos / 21 cerrados |
| `kudos_app/templates/search.html` | OK · 26/26 |
| `kudos_app/templates/capsule_list.html` | OK · 26/26 |
| `kudos_app/templates/base.html` | OK · 116/116 (define `title`, `extra_head`, `content`, `extra_js`) |
| `kudos_app/templates/capsule_detail.html` | OK · 131/131 |

`map.html` referencia estáticos locales (`static/vendor/leaflet/leaflet.{js,css}`, `static/css/map5d.css`) — todos existen en `static/`. `markercluster` se sirve aún desde unpkg.com CDN (deuda menor ya anotada en D7).

`staticfiles/` no contiene `vendor/leaflet/` (no se ha corrido `collectstatic` recientemente) — esto solo afecta a despliegues con whitenoise, no al runtime local.

## 4 · Recomendación (no ejecutada — tarea es solo verificación)

Para restaurar el núcleo a un estado arrancable, sin tocar otra cosa:

```
git checkout HEAD -- kudos_app/views.py kudos_app/urls.py kudos_app/models.py
```

Riesgo: pierde cualquier cambio local no commiteado en esos tres archivos. Dado que el final actual de cada uno está visiblemente cortado a mitad de palabra/string, no hay trabajo coherente que preservar — la causa parece haber sido una escritura interrumpida, no una edición en curso.

Tras restaurar, validar con:

```
python manage.py check
python manage.py runserver
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/map/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/search/?q=test
curl -s http://127.0.0.1:8000/api/capsules/5d/?limit=1 | head -c 200
```

Nota adicional: la ruta `path('', views.healthcheck, name='home')` sigue activa como mitigación temporal del bug 500 (snapshot `debug-home`). Revertir cuando el `home` real vuelva a estar verde.

## 5 · Entorno

Esta verificación se hizo de forma estática: PyPI está bloqueado en el sandbox y no fue posible instalar Django (`venv/` está vacío). Por eso no se pudo arrancar el servidor para hacer requests reales contra `/map/`, `/search/` y `/api/capsules/5d/`. Una vez restaurados los archivos, el chequeo HTTP del paso 4 cierra la verificación.
