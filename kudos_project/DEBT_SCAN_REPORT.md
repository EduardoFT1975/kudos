# DEBT SCAN REPORT — KUDOS / AXÓN

**Fecha:** 2026-05-19  
**Ejecutado por:** scheduled task `debt-scan`  
**Carpeta:** `kudos_project/` (raíz del monolito Django)  
**Alcance:** archivos duplicados · JS repetido · rutas huérfanas · imports muertos · templates gigantes

---

## 🚨 HALLAZGO P0 — BLOQUEANTE DE PRODUCCIÓN

El archivo activo `kudos_app/views.py` está **truncado a mitad de declaración** en la línea 2376. El módulo no compila y la aplicación Django **no puede arrancar** en su estado actual.

```
2370: def capsule_aport_validate(request, uid, aport_id):
...
2374:     if ap.layer != 'fact' or ap.status not in ('mission','cco'):
2375:         return redirect('capsule_detail', uid=uid)
2376:     if request.POS        ← EOF, sin `:` ni cuerpo
```

* **Problema:** `SyntaxError: expected ':'` confirmado con `py_compile`.
* **Impacto:** ImportError en runtime → cualquier `manage.py runserver / migrate / collectstatic / gunicorn` se cae al primer touch de `kudos_app.urls`. MVP **no desplegable** ahora mismo.
* **Solución (mínima):** completar la línea (`if request.POST.get('action') == ...`) o, si no se recuerda la intención, restaurar la función desde `kudos_app/views.py.snapshot.debug-home.20260517T140529Z` (97 715 B, snapshot del mismo día, presumiblemente íntegro).
* **Riesgo:** ninguno mayor que la situación actual; el snapshot ya estuvo en producción.
* **Prioridad:** **P0 — antes que cualquier otra cosa del scan.**

---

## 1. ARCHIVOS DUPLICADOS

### 1a. Snapshots de trabajo dejados en el árbol (29 archivos, ~1.2 MB)

Hay sufijos `.snapshot.*`, `.dormant`, `.bak`, `- copia` repartidos por todo el repo. No están en `.gitignore` y ensucian grep / IDE / autocomplete / refactors. **Ninguno es referenciado por código vivo.**

Conteo y tamaño total: **29 archivos · 1 208 654 bytes**.

Notables (idénticos byte-a-byte al actual — *eliminar sin riesgo*):

| Snapshot | Tamaño |
|---|---|
| `static/js/map5d/markers.js.snapshot.d10.20260516T183045Z` | 4 602 B |
| `static/js/map5d/popups.js.snapshot.d10.20260516T135420Z` | 1 930 B |
| `static/js/map5d/ui.js.snapshot.d10.20260516T183045Z` | 6 462 B |
| `static/css/style.css.snapshot.d6.20260516T133558Z` | 45 997 B |
| `static/css/map5d.css.snapshot.d10.20260516T183045Z` | 15 258 B |

Resto (difieren, son históricos manuales): 8 snapshots de `views.py`, 4 de `map.html`, 3 de `capsule_detail.html`, 2 de `urls.py`, 1 de `models.py`, 1 de `base.html`, 1 de `ai_panel.html`, 1 `.dormant`, 1 `- copia`, etc.

Recomendación: mover todo a `.snapshots/` fuera del árbol fuente (o borrar; `git log` ya los conserva). Patrón a añadir al `.gitignore`:

```
*.snapshot.*
*.dormant
* - copia*
*.bak
celerybeat-schedule.*
```

### 1b. Templates duplicados entre `templates/` (raíz) y `kudos_app/templates/`

Django carga `kudos_app/templates/` por `APP_DIRS`. La carpeta raíz `templates/` contiene **7 copias divergentes** que probablemente nunca se usan, pero confunden:

| Pareja | Tamaños (raíz vs app) | Estado |
|---|---|---|
| `403.html` | 246 B vs 1 221 B | Difieren (44 líneas diff) |
| `assistant_interaction.html` | 369 B vs 428 B | Difieren |
| `capsule_created.html` | 800 B vs 1 079 B | Difieren |
| `capsule_museum.html` | 1 647 B vs 2 372 B | Difieren |
| `control_panel.html` | 1 707 B vs **21 474 B** | Difieren drásticamente |
| `error.html` | 226 B vs 224 B | Difieren |
| `personal_assistant.html` | 795 B vs 1 684 B | Difieren |
| `registration/login.html` | dos copias en raíz + `kudos_project/templates/` | 2 copias divergentes |

Recomendación: confirmar `TEMPLATES['DIRS']` en `settings.py` y eliminar la copia que no se sirve (probablemente la de raíz `templates/`).

### 1c. Archivos sueltos huérfanos en raíz

* `vista_kudos_final.html` ≡ `vista_previa_kudos.html` (**mismo MD5** `1aba…`), más `vista_previa_final.html` (1 KB difiere). Tres HTML estáticos de preview en raíz, sin servirse desde ninguna view.
* `kudos_app/templates/space_exploration - copia.html` (1 027 B) junto a `space_exploration.html` (580 B). El nombre con espacio es bandera roja de Windows copy/paste.
* `settings.py` en la raíz: **0 bytes** (existe `kudos_project/settings.py` real). Falso amigo que rompe importadores.
* `kudos_app_urls.py` en raíz: 407 B, duplica `kudos_app/urls.py`. Huérfano.
* `dump.rdb`, `ipfs_daemon.log`, `resolv.conf`, `celerybeat-schedule.{dat,dir,bak}`, `deployment_log.txt`: artefactos runtime/redis/ipfs que no deberían commitearse.

---

## 2. JS REPETIDO

### 2a. Inicialización Leaflet duplicada en 17 templates

`L.map(...).setView([...], N)` aparece **17 veces** copy-pasted en templates de feature, cada una con su propio `tileLayer`, controles y reglas mobile. Todas pertenecen a features marcadas como **CONGELADAS** en el contrato (`crypto`, `governance`, `marketplace`, `health`, `art`, `social`, etc.) pero siguen ejecutándose en cliente:

```
art_culture · capsule_museum · control_panel · education_plan · education_plan_success
· education_recommender · governance · historical_map · infrastructure · innovation
· market_transactions · research · seller_profile · social_impact · space_badge_*
· tourism_badge_confirmation
```

* **Problema:** cada vista que se renderiza inicializa Leaflet desde cero. Tiempos de carga móviles ↑, marker clustering imposible de hacer central, código pegado divergente.
* **Impacto:** choca con la prioridad #2 (rendimiento móvil) y #4 (marker clustering) del contrato.
* **Solución mínima:** extraer un único `static/js/map5d/feature_map.js` que reciba `(elementId, lat, lng, zoom)` y reutilizar. Las features congeladas pueden adoptarlo o quedarse fuera del path público.
* **Riesgo:** bajo si se hace por gating; las 17 plantillas no son MVP.
* **Prioridad:** P2 (después del P0 y de limpieza estructural).

### 2b. Bloques `<script>` inline grandes en templates

Top 5 templates por bytes inline de JS:

| Template | JS inline |
|---|---|
| `capsule_detail.html` | 15 747 B |
| `capsule_clip.html` | 10 250 B |
| `vr_view.html` | 5 678 B |
| `capsule_video_clip.html` | 5 574 B |
| `near.html` | 5 325 B |

Patrón duplicado en `ai_chat / ai_panel / assistant_characters / personal_assistant`: bloques idénticos de `fetch({% url … %}` + lectura de cookie CSRF (`csrfmiddlewaretoken`). Candidato a un único helper en `static/js/scripts.js` o a templatetag.

---

## 3. RUTAS HUÉRFANAS

`kudos_app/urls.py`: **110 nombres registrados**, **111 views referenciadas**, **117 funciones definidas** en `views.py`.

### 3a. Rutas sin referencias ni `{% url %}`, `reverse(...)`, ni paths hardcoded

Tras filtrar referencias en templates, `.py`, `.js` y substrings de URL en `fetch`/`href`, quedan **3 rutas verdaderamente huérfanas**:

| Nombre | Path | View |
|---|---|---|
| `home_full` | `home/` | `views.home` (renombre temporal, ver patch debug-home) |
| `onboarding` | `onboarding/` | `views.onboarding` |
| `near` | `near/` | `views.near` |

`home_full` es esperable (parche temporal mientras `/` apunta a `healthcheck`); puede mantenerse. `onboarding` y `near` son páginas reales del MVP — falta link público o están ocultas tras la limpieza. **Acción:** confirmar si pertenecen a las features públicas (MAPA/CAPSULES/SEARCH/TIMELINE/USERS/MIND LITE/SHARE) y, si sí, enlazarlas desde `base.html`; si no, congelar tras un feature flag.

### 3b. Views definidas pero no wired (cementerio)

4 funciones en `views.py` sin entrada en `urls.py`:

* `personal_habit_toggle` — feature `personal_health` (congelada)
* `personal_crypto` — crypto (congelada)
* `ai_mind_chat` — sustituida por `ai_chat` / `ai_lite_ask`
* `bookmark_capsule` — sustituida por algún flujo de bookmarks

Recomendación: marcar con `# FROZEN — do not delete` o mover a `kudos_app/legacy_views.py` (que ya existe, 2 160 líneas) para mantener la regla "no eliminar funcionalidades".

---

## 4. IMPORTS MUERTOS

Análisis AST sobre todos los `.py` activos (excluyendo `venv`, `migrations`, `__pycache__`, snapshots).

### En `kudos_app/views.py` (el monolito)

80 imports totales, **2 muertos** (sorprendentemente limpio):

* L26: `from kudos_app.models import CapsuleAport` — pero `CapsuleAport` sí se referencia en líneas que están más allá del truncamiento. Probable falso positivo *causado* por el P0.
* L1486: `from django.db.models import F` — local a una función, sin uso.

### En otros módulos activos (selección)

| Archivo | Imports muertos |
|---|---|
| `control.py` | `from datetime import datetime` |
| `fix_timestamps.py` | `from django.utils import timezone` |
| `vista_previa.py` | `import os` |
| `kudos_app/generate_capsule_clips.py` | `from moviepy.editor import concatenate_videoclips`, `django.utils.timezone` |
| `kudos_app/legacy_views.py` | `json`, `streamlit_folium.st_folium`, `folium`, `login_required`, `Count`, `AutomationConfig` (legacy, esperable) |
| `kudos_app/utils/data_utils.py` | `SettingsConfig`, `numpy as np` |
| `kudos_app/utils/notifications_utils.py` | `django.contrib.gis.geos.Point`, `json` |
| `kudos_project/settings.py` | `import whitenoise` (probablemente sobra; middleware ya está cargado por string) |
| `kudos_project/middleware.py` | `from __future__ import annotations` (inocuo) |

Total en código core (excluyendo tests y management): **~20 imports muertos**. Volumen bajo — no es la deuda principal.

---

## 5. TEMPLATES GIGANTES

Threshold sugerido para refactor: **> 300 líneas**. Resultado:

| Template | Líneas | Bytes | Comentario |
|---|---:|---:|---|
| `capsule_detail.html` | **876** | 43 979 | El mayor; mezcla detalle + AR + audio + clip + diálogo + versionado. Candidato #1 a `{% include %}` por sección. |
| `capsule_clip.html` | 473 | 23 052 | 10 KB de JS inline (player). Extraer a `static/js/capsule_clip.js`. |
| `control_panel.html` | 473 | 21 474 | Panel admin. Feature congelable. |
| `ai_panel.html` | 343 | 13 382 | Mind Lite UI. |
| `manifesto.html` | 323 | 11 138 | Texto largo — aceptable. |
| `capsule_video_clip.html` | 242 | 9 444 | 5.5 KB de JS inline. |
| `near.html` | 240 | 10 977 | 5.3 KB JS — duplica patrón map5d. |
| `home.html` | 230 | 14 369 | Home pública — vigilar (D7 frontend decomposition la cubre). |
| `founder_panel.html` | 215 | 9 487 | Founder = congelar. |
| `vr_view.html` | 194 | 8 003 | Feature congelable. |

`map.html` actual está en **167 líneas** (vs. snapshots históricos de 881→1 039). El trabajo de extracción a `static/js/map5d/*.js` ya está hecho — confirmar en `D7_FRONTEND_DECOMPOSITION.md` que la decisión sigue vigente.

---

## RESUMEN PRIORIZADO (acción para el CTO)

| # | Acción | Prio | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 1 | **Reparar `kudos_app/views.py` línea 2376** (restaurar desde snapshot del 17-may) | **P0** | 5 min | Nulo |
| 2 | Borrar/mover 29 snapshots + `.dormant` + `- copia` + añadir patrones al `.gitignore` | P1 | 15 min | Nulo |
| 3 | Eliminar carpeta `templates/` (raíz) y `kudos_project/templates/registration/login.html` tras confirmar que `APP_DIRS` resuelve a `kudos_app/templates/` | P1 | 10 min | Bajo |
| 4 | Eliminar `settings.py` (0 B) y `kudos_app_urls.py` (407 B) huérfanos en raíz | P1 | 2 min | Nulo |
| 5 | Mover `vista_*.html`, `*.rdb`, `*.log`, `celerybeat-schedule.*`, `resolv.conf`, `deployment_log.txt` fuera del repo | P1 | 10 min | Nulo |
| 6 | Enlazar o congelar las 3 rutas huérfanas (`onboarding`, `near`, `home_full`) | P2 | 30 min | Bajo |
| 7 | Mover las 4 views no-wired a `legacy_views.py` (no borrar) | P2 | 15 min | Nulo |
| 8 | Extraer helper `feature_map.js` para reducir los 17 inits de Leaflet | P2 | 1 h | Medio (regresión visual en features congeladas) |
| 9 | Trocear `capsule_detail.html` con `{% include %}` por sección (AR / audio / clip / diálogo) | P3 | 2 h | Medio |
| 10 | Pasar bloques `<script>` inline > 3 KB a `static/js/*.js` | P3 | 2 h | Bajo |

---

## NOTAS PARA EL CONTRATO AXÓN

* **Estabilidad del mapa (prio #1):** afectada — `views.py` roto impide cualquier deploy. P0.
* **Rendimiento móvil (prio #2):** 17 inits Leaflet copy-paste son la mayor amenaza.
* **Reducir complejidad visible (prio #3):** 29 snapshots + 7 templates duplicados + 5 archivos huérfanos en raíz son ruido directo en el árbol que ven los devs.
* **Marker clustering (prio #4):** imposible centralizar mientras los mapas se inicialicen template por template.
* **Limpieza de rutas (prio #5):** las URLs *en sí* están bastante sanas (sólo 3 huérfanas) — el desorden está en las views/templates, no en `urls.py`.
* **Refactor `map.html` (prio #6):** **ya hecho** (167 líneas vs. >1 000 originales). Confirmar y borrar snapshots históricos.
* **Extracción `views.py` (prio #7):** 2 375 líneas todavía. `legacy_views.py` (2 160 L) ya separa lo viejo. El siguiente corte podría ser por feature: `views_capsules.py`, `views_map.py`, `views_mind.py`, `views_founder.py`.

**Regla de oro respetada:** todas las acciones propuestas mantienen las features congeladas vivas en el repo (ninguna eliminación de funcionalidad).
