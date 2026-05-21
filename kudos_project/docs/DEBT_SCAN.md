# DEBT SCAN — KUDOS / AXÓN

Fecha: 2026-05-15
Ejecutor: tarea programada `debt-scan` (modo CTO operativo)
Alcance: `kudos_project/` (excluyendo `.git`, `staticfiles`, `__pycache__`, `node_modules`, `migrations` en escaneo de imports).

Resumen ejecutable: **el monolito tiene un núcleo MVP utilizable enterrado bajo capas duplicadas**. No hace falta reescribir; hace falta gatear, borrar muertos y consolidar. Esta es la lista priorizada según los principios del proyecto (mínima complejidad, no regresiones, time-to-awe).

---

## 0 · Veredicto rápido

- HTML totales: **134** · Plantillas en `kudos_app/templates`: **120** · No referenciadas: **35**.
- Python totales: **92** · Archivos > 1000 líneas: **4** (legacy_views, views, models, 0001_initial).
- `views.py` mide **2.125 líneas / 116 funciones** (avg 18 líneas/función). Tolerable, pero el monolito conceptual viene del mezcle de features MVP + congeladas.
- `legacy_views.py` (**2.160 líneas**) es un **fantasma**: misma cabecera que `views.py` pero ni `urls.py` ni nada lo importa. Es debt puro.
- `map.html` mide **881 líneas** (576 son JS+CSS inline). **Sin marker clustering todavía** — gap directo de la prioridad #4 del proyecto.
- 7 plantillas están **sombreadas** por copias casi-vacías en `templates/` (raíz) debido al orden de `TEMPLATES.DIRS`. Esto es un foco activo de regresiones silenciosas.

---

## 1 · Archivos duplicados

### 1.1 Plantillas sombreadas (`templates/` gana a `kudos_app/templates/`)
**Problema:** `settings.py` define `TEMPLATES.DIRS = [BASE_DIR/templates, BASE_DIR/kudos_app/templates]`. Django resuelve por el primer match. Existen 7 archivos con el mismo nombre en ambas carpetas; el de la raíz (versión vieja, mínima) gana.

| Archivo | `templates/` | `kudos_app/templates/` | Diff |
|---|---:|---:|---:|
| `403.html` | 11 líneas | 40 líneas | 44 |
| `assistant_interaction.html` | 15 | 17 | 3 |
| `capsule_created.html` | 19 | 29 | 43 |
| `capsule_museum.html` | 44 | 73 | 105 |
| `control_panel.html` | **42** | **473** | **521** |
| `error.html` | 11 | 10 | 10 |
| `personal_assistant.html` | 23 | 43 | 70 |

Caso más grave: **`control_panel.html`** — la versión real (473 líneas, con mapa + estadísticas) está sombreada por una versión de 42 líneas. Cuando una vista llama a `render(..., "control_panel.html")` el usuario ve la versión vieja.

- **Impacto:** UX/regresión silenciosa en el panel de control y en 6 plantillas adicionales. Probable origen de bugs reportados sin causa clara.
- **Solución mínima:** borrar los 7 archivos de `templates/` (excepto los que estén deliberadamente como fallback). Mantener solo `kudos_app/templates/`. Tiempo: 10 min.
- **Riesgo:** bajo (al borrar, Django carga la versión completa). Revisar antes que el `block` esperado exista.
- **Prioridad:** 🔴 **ALTA** (regresión activa).

### 1.2 `login.html` triplicado
Tres copias en distintas rutas, dos de ellas casi idénticas (47 líneas de diff entre sí):

- `kudos_app/templates/login.html` (52 líneas, no renderizado por ninguna vista)
- `kudos_project/templates/registration/login.html` (19 líneas) ← este sí lo usa Django auth por defecto
- `templates/registration/login.html` (24 líneas) ← duplicado redundante; el primero gana por orden de DIRS

- **Solución:** quedarse con `kudos_project/templates/registration/login.html` (o moverlo a `kudos_app/templates/registration/login.html`). Borrar los otros dos.
- **Prioridad:** 🟡 media.

### 1.3 `space_exploration - copia.html`
- **Problema:** literalmente `space_exploration - copia.html` (27 líneas) coexiste con `space_exploration.html` (17 líneas). 48 líneas de diff. Olor a "copy-paste-experiment-never-cleaned".
- **Solución:** borrar la copia.
- **Prioridad:** 🟢 baja (limpieza), pero **ya**.

### 1.4 Páginas “vista_” en la raíz del proyecto
Tres HTML sueltos en la raíz, dos idénticos por hash:

- `vista_previa_kudos.html` ≡ `vista_kudos_final.html` (sha1 idéntico) → un duplicado seguro.
- `vista_previa_final.html` — variante cercana.
- `vista_previa.py` — script asociado.

**Solución:** mover a `docs/borradores/` o eliminar. No son rutas servidas.
**Prioridad:** 🟢 baja.

### 1.5 `kudos_app/google_maps_utils.py` ≡ `kudos_app/utils/google_maps_utils.py`
- **Idénticos por sha1.** Dos copias exactas del mismo módulo. Cualquier cambio en uno deja al otro stale.
- **Solución:** mantener `kudos_app/utils/google_maps_utils.py` (canónico bajo `utils/`). Borrar el de fuera. Verificar imports.
- **Prioridad:** 🟡 media.

### 1.6 `generate_massive_capsules.py` (3 copias) y `kudos_app/tasks.py` vs `kudos_app/tasks/tasks.py`
- 3 versiones distintas (hashes diferentes) de `generate_massive_capsules.py` en `/`, `/scripts/`, y `/scripts/scripts/`. No idénticas — alguien editó una y olvidó las otras.
- `kudos_app/tasks.py` (56 líneas) y `kudos_app/tasks/tasks.py` (70 líneas) coexisten — colisión de namespace de Celery.
- **Solución:** elegir canónico (`scripts/generate_massive_capsules.py`, `kudos_app/tasks/tasks.py`) y borrar el resto.
- **Prioridad:** 🟡 media. Crypto/import están en features congeladas → no urgente, pero limpiarlo evita confusión.

### 1.7 `settings.py` huérfano en la raíz (0 bytes)
- Archivo vacío en `BASE_DIR/settings.py`. El real es `kudos_project/settings.py`.
- **Solución:** borrar.
- **Prioridad:** 🟢 baja.

### 1.8 `legacy_views.py` — el gran fantasma
- **Problema:** `kudos_app/legacy_views.py` mide **2.160 líneas** (más que `views.py`) y comienza con el mismo header `# kudos_app/views.py`. Ninguna URL ni import del proyecto lo referencia. Es código congelado preservado.
- **Impacto:** ruido para grep, confunde a cualquiera que abra el repo, infla el contexto de futuras refactors.
- **Solución alineada con KUDOS:** moverlo (no borrarlo, regla del proyecto: “NO eliminar funcionalidades existentes”) a `kudos_app/_frozen/legacy_views.py` y añadir un comentario apuntando a este informe. Sigue preservado, deja de estorbar.
- **Prioridad:** 🟡 media (limpieza visible → reduce complejidad percibida).

---

## 2 · JS repetido (templates)

- **2.119 líneas de JS inline** repartidas en 50+ plantillas. El offender único es **map.html con 397 líneas inline** (+179 de CSS inline).
- El bootstrap de Leaflet (`L.tileLayer('https://{s}.tile.openstreetmap.org/...')`, `L.geoJSON(...)`, popup HTML con `feature.properties.description / mode / themes`) aparece **copiado en 16 plantillas distintas**:

```
art_culture, capsule_museum, control_panel, education_plan,
education_plan_success, education_recommender, governance,
infrastructure, innovation, map, market_transactions, research,
seller_profile, social_impact, space_badge_confirmation,
tourism_badge_confirmation
```

Mismo bloque ~12 líneas (tileLayer + geoJSON + popup + fitBounds) replicado en cada una. Cualquier cambio (clustering, popup, estilo) hay que tocarlo en 16 sitios.

- **Solución mínima (compatible con “no sobreingeniería”):**
  1. Crear `static/js/kudos_map_init.js` con una función `initKudosMap(elementId, geojsonData, opts)`.
  2. Cada plantilla que tenga mapa: incluir el script y pasar el geojson. Borrar las 12 líneas de bootstrap repetido.
  3. Cuando se añada `leaflet.markercluster`, basta tocar **un** archivo (cumple prioridad #4 del proyecto).
- **Riesgo:** bajo si se mantiene la misma API de Leaflet. Las plantillas de features congeladas (governance, innovation, market_transactions…) ni siquiera están rutadas (ver §3), así que tampoco regresionan.
- **Prioridad:** 🔴 **ALTA** — bloquea el ítem #4 “marker clustering” del roadmap.

### 2.1 Cargas de Leaflet duplicadas y mixtas
- `map.html` carga Leaflet **desde unpkg** (CDN), mientras que 12 plantillas cargan `static/js/leaflet-src.js` local (450 KB). Inconsistente.
- En `static/` y `kudos_project/static/js/` hay **leaflet duplicado** (`leaflet.js` 147 KB, `leaflet-src.js` 450 KB, `.map` 866 KB ×2). ~2.5 MB de assets locales no usados por la página real (`map.html` usa CDN).
- **Solución:** unificar a una sola fuente. Recomendado: local (`leaflet.js` minified, no `-src`), eliminar los `.map` de producción.
- **Prioridad:** 🟡 media (rendimiento móvil, prioridad #2).

### 2.2 Badge-confirmation: 11 plantillas casi idénticas
9 templates `*_badge_confirmation.html` de ~26-28 líneas (15 líneas de diff entre cualquier par) + 2 outliers (`space_badge_confirmation` 127 líneas, `tourism_badge_confirmation` 134 líneas) que incluyen mapa-bootstrap heredado.
- **Ninguna está referenciada por una vista actual** (sección §3.2).
- **Solución:** consolidar a un único `templates/_partials/badge_confirmation.html` parametrizado por contexto, o (más alineado con “no añadir features”) congelar y mover bajo `kudos_app/templates/_frozen/`.
- **Prioridad:** 🟢 baja.

---

## 3 · Rutas huérfanas

### 3.1 Rutas en `urls.py` (sin roto)
- 109 patterns. Cada `views.X` referenciado **existe** en `views.py`. 0 rutas rotas. ✅
- Pero hay **duplicación dentro de `urls.py`**:
  - `path('mind/chat/', views.ai_chat, name='ai_chat')` aparece dos veces (líneas distintas; misma `name`). Django ignora la segunda pero es señal de re-merge mal cerrado.
  - **Solución:** borrar la línea duplicada.
  - **Prioridad:** 🟢 baja.

### 3.2 Vistas en `views.py` no enlazadas a ninguna URL
Tras descartar helpers (prefijo `_`), quedan **2 vistas huérfanas reales**:

- `ai_mind_chat` (vista, 64 líneas) — probablemente sustituida por `ai_chat_send`.
- `bookmark_capsule` (vista) — la URL existente es `bookmarks_list`; la acción de “toggle bookmark” no parece ruteada.

- **Solución:** verificar si `bookmark_capsule` debería estar enlazada (UX deseable); si no, borrarlas o moverlas a `_frozen/`.
- **Prioridad:** 🟡 media para `bookmark_capsule` (posible feature MVP incompleta), 🟢 baja para `ai_mind_chat`.

### 3.3 Plantillas sin ninguna referencia (render / include / extends / template_name)
**35 plantillas existen en disco pero nadie las invoca:**

```
art_badge_confirmation, art_culture, assistant_interaction,
badge_confirmation, capsule_created, capsule_video_clip,
certificate_issued, control_panel*, education_certification,
education_plan_success, error*, governance, governance_badge_confirmation,
infrastructure, infrastructure_badge_confirmation, innovation,
innovation_badge_confirmation, login*, market_reputation,
market_transactions, mental_badge_confirmation, purchase_confirmation,
research, research_badge_confirmation, review_confirmation,
seller_profile, social_badge_confirmation, social_impact,
social_impact_badge_confirmation, social_spaces, space_badge_confirmation,
space_exploration - copia, tourism_badge_confirmation,
transaction_confirmation, wisdom_spaces
```

`*` = existen también en `templates/` raíz; Django las podría servir si la vista referenciara el nombre.

- **Distribución por feature (siguiendo `features.py`):**
  - **Congeladas** (governance, marketplace, social avanzado, crypto, education badges): ~28 plantillas. → mover a `kudos_app/templates/_frozen/`.
  - **Posiblemente MVP** (`error.html`, `control_panel.html`, `capsule_created.html`, `capsule_video_clip.html`): revisar — ya hay versiones renderizadas; estos son sombras.
- **Solución:** crear `kudos_app/templates/_frozen/` y mover. No borrar (regla del proyecto). Esto reduce ruido visual en VSCode/grep en ~30% sin perder nada.
- **Prioridad:** 🟡 media.

---

## 4 · Imports muertos

Escaneo AST sobre 92 archivos `.py` (saltando migraciones y caches):

- **Total findings: 32 imports no usados en 18 archivos.**
- Top offenders (por número de imports muertos):

| Archivo | Unused |
|---|---:|
| `kudos_app/management/commands/ai_autopilot.py` | 6 (`random`, `Avg`, `Count`, `Badge`, `Department`, `Goal`) |
| `kudos_app/management/commands/autonomous_ops.py` | 5 (`Department`, `Goal`, `Like`, `Notification`, `Review`) |
| `kudos_app/generate_capsule_clips.py` | 2 (`concatenate_videoclips`, `timezone`) |
| `kudos_app/legacy_views.py` | 2 (`st_folium`, `AutomationConfig`) |
| `kudos_app/views.py` | 2 (`Activity`, `Certificate` — L25) |
| `kudos_app/management/commands/seed_data.py` | 2 |
| `kudos_app/utils/data_utils.py` | 2 (`SettingsConfig`, `np`) |
| 11 archivos más con 1 import muerto cada uno | 11 |

- **Solución:** una pasada de `pyflakes` o `ruff --select F401 --fix` borra todos en <1 min. Sin red disponible aquí, así que se documenta y se aplica en el dev box.
- **Impacto:** mínimo en runtime; alto en señal — `Activity` y `Certificate` muertos en `views.py` insinúan que features congeladas dejan huellas en imports MVP.
- **Prioridad:** 🟢 baja (cosmético) **pero altamente recomendado** antes del próximo refactor de `views.py`.

---

## 5 · Plantillas y archivos gigantes

| Archivo | Líneas | Diagnóstico |
|---|---:|---|
| `kudos_app/templates/map.html` | **881** (397 JS + 179 CSS + 305 HTML) | **REFACTOR P1**. Extraer JS y CSS a estáticos. Plataforma para clustering. |
| `kudos_app/templates/capsule_detail.html` | 853 (314 JS) | P2. Vista MVP densa, candidata a partials (header / media / dialog / share). |
| `kudos_app/templates/capsule_clip.html` | 473 (210 JS) | P3. Feature 5D — mantener como módulo. |
| `kudos_app/templates/control_panel.html` | 473 | Ver §1.1. |
| `kudos_app/legacy_views.py` | 2.160 | Ver §1.8. Mover a `_frozen/`. |
| `kudos_app/views.py` | 2.125 (116 funciones) | Tolerable, pero candidato a extracción progresiva (prioridad #7 del proyecto). |
| `kudos_app/models.py` | 1.114 | Aceptable; muchas tablas pertenecen a features congeladas → considerar `models_frozen.py`. |

### Plan mínimo para `map.html` (alineado con prioridades 1-4 del proyecto)
- **Problema:** 881 líneas, JS+CSS inline, sin clustering. Bloquea rendimiento móvil y bloquea el siguiente milestone (clustering).
- **Impacto:** UX del producto público #1; cualquier regresión aquí es regresión del MVP.
- **Solución mínima por pasos:**
  1. Mover `<style>` a `static/css/map5d.css`. (1 commit, riesgo casi nulo.)
  2. Mover `<script>` a `static/js/map5d.js` + función `initKudosMap`. (Reutilizable por §2.)
  3. Añadir `leaflet.markercluster` (CDN o local). Hook único en `initKudosMap`.
  4. `map.html` queda ≤ 250 líneas (sólo markup + partials).
- **Riesgo:** bajo si cada paso es un commit independiente y se testea visualmente. CSP/cache busting con `{% static %}`.
- **Prioridad:** 🔴 **ALTA** (P1 + P2 + P4 del proyecto).

---

## 6 · Bonus: archivos sueltos que ensucian la raíz

Estos archivos en `BASE_DIR/` no deberían estar a la vista del MVP:

- `control.py`, `art_culture.py`, `social_impact.py`, `vista_previa.py`, `generate_capsules.py`, `generate_massive_capsules.py`, `fix_timestamps.py`, `create_initial_data.py`, `create_users.py`, `set_admin_access.py`, `decompress_wiki.py`, `decompress_wiki_with_progress.py`, `run_streamlit.py`, `kudos_app_urls.py`, `settings.py` (vacío).
- 4+ CSVs en raíz (`capsule_params.csv`, `capsules_data.csv`, `celery.csv`, etc.).
- `celerybeat-schedule.{bak,dat,dir}` — runtime artifact (debería estar en `.gitignore`).
- `deployment_log.txt`, `ipfs_daemon.log` — logs.
- `db.sqlite3` (9.5 MB) en repo — riesgo.

**Solución:** crear `scripts/`, `scripts/dev/`, `data/seeds/` y mover. Ajustar `.gitignore` para SQLite, logs y celerybeat. **Prioridad:** 🟡 media — reduce drásticamente la complejidad percibida del proyecto.

---

## 7 · Plan recomendado (orden de impacto)

| # | Acción | Esfuerzo | Riesgo | Beneficio |
|--:|---|---|---|---|
| 1 | Borrar las 7 plantillas sombreadas en `templates/` (§1.1) | 10 min | bajo | Corrige regresiones silenciosas |
| 2 | Extraer JS+CSS de `map.html` a `static/` (§5) | 1-2 h | bajo (commit por commit) | Desbloquea clustering, P1 del proyecto |
| 3 | Crear `initKudosMap()` y consolidar las 16 plantillas con bootstrap repetido (§2) | 2-3 h | bajo | Cualquier cambio futuro de mapa toca 1 archivo |
| 4 | Añadir `leaflet.markercluster` sobre el nuevo init (§5) | 1 h | bajo | Cumple P4 |
| 5 | Mover `legacy_views.py` + 28 plantillas congeladas a `_frozen/` (§1.8, §3.3) | 30 min | bajo | -30% ruido en grep / VSCode |
| 6 | Borrar duplicados exactos: `google_maps_utils.py`, `vista_kudos_final.html`, `settings.py` vacío (§1.5, §1.4, §1.7) | 10 min | nulo | Limpieza visible |
| 7 | `ruff --select F401 --fix` sobre todo el repo (§4) | 5 min | bajo | -32 imports muertos |
| 8 | Mover scripts sueltos de la raíz a `scripts/` y CSVs a `data/seeds/` (§6) | 30 min | medio (verificar `manage.py` paths) | Raíz legible |
| 9 | Revisar `bookmark_capsule` y `ai_mind_chat` (§3.2) | 15 min | bajo | Decidir si son MVP gaps o ruido |
| 10 | Borrar `path('mind/chat/...)` duplicado (§3.1) | 1 min | nulo | Limpieza |

**Tiempo total estimado para 1-10:** medio día de trabajo. Resultado: el MVP queda visible, `map.html` listo para clustering, `views.py` enfocable.

---

_Generado por la tarea programada `debt-scan`. No se ha modificado código — solo escaneo._
