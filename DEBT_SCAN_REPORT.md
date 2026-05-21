# DEBT SCAN REPORT — KUDOS / AXÓN

**Fecha:** 2026-05-21
**Ejecutado por:** scheduled task `debt-scan` (re-run automático)
**Carpeta:** `kudos_project/` (raíz del monolito Django)
**Alcance:** archivos duplicados · JS repetido · rutas huérfanas · imports muertos · templates gigantes
**Reporte previo:** versión del 2026-05-19 (sobrescrita; git conserva el histórico)

---

## RESUMEN EJECUTIVO

| Indicador | 2026-05-19 | 2026-05-21 | Δ |
|---|---:|---:|---|
| `views.py` compila | ❌ truncado L2376 | ✅ OK | **P0 resuelto** |
| Snapshots / `.dormant` / `- copia` / `.bak` | 29 (1.2 MB) | **58 (2.3 MB)** | ❌ duplicados por mirror nested |
| Inits `L.map(...)` en templates | 17 | **17 vivos + 4 en snapshots** | sin cambio |
| URL names totales | 110 | **110** | sin cambio |
| URL names sin referencia (depurado) | 3 | **7** | ❌ +4 |
| Views no-wired en `views.py` | 4 | **6** | ❌ +2 (`personal_learning`, `bookmark_capsule`) |
| Imports muertos (código activo) | ~20 | **~75** | ❌ +55 (gran parte por mirror nested) |
| `map.html` LOC | 167 | 167 | ✅ refactor sostenido |
| Templates > 200 LOC | 9 | 9 | sin cambio |

**Conclusión:** el P0 que bloqueaba el deploy se ha resuelto (commit `67fe207 fix(prod 500): swap manifest static storage + harden home view`). **Aparece un nuevo P1 estructural grave:** un directorio espejo `kudos_project/kudos_project/` (125 MB · 780 archivos · congelado al 2026-05-15) que duplica todo el árbol y que es responsable de la mitad del ruido detectado en este scan.

---

## 🚨 HALLAZGO NUEVO P1 — DIRECTORIO ESPEJO `kudos_project/kudos_project/`

Existe un subdirectorio anidado `kudos_project/kudos_project/` que es una **copia stale del 2026-05-15 14:47** del repo completo (sin `venv`/`.git`/`.next`). Contiene `kudos_app/`, `static/`, `templates/`, `experience/`, `content_engine/`, etc., todos divergentes respecto a la raíz porque la raíz ha seguido evolucionando.

* **Volumen:** 125 MB · 780 archivos relevantes (sin contar `.next`/`venv`).
* **Divergencia:** todos los archivos clave difieren — por ejemplo:
  * `kudos_app/views.py` (raíz) 2 382 L vs nested 2 417 L · MD5 distintos
  * `kudos_app/urls.py` (raíz) 210 L vs nested 215 L · la copia nested aún incluye `personal/learning/`, `personal/health/`, `personal/crypto/`, `personal/habit/<id>/toggle/` que la raíz **ya retiró** (correctamente, según contrato: `personal_*` es feature congelada).
  * `kudos_app/models.py` (raíz) 1 131 L vs nested 1 210 L.
* **No es servida:** `manage.py` y `kudos_project/settings.py` (los activos) no la referencian. Cero menciones a `kudos_project/kudos_project` en config (`*.bat`, `*.sh`, `*.ps1`, `*.json`, `*.yml`, `Dockerfile_app`, `Procfile`, `render.yaml`, `railway.json`).
* **Por qué importa:**
  - Duplica TODA la deuda detectada: cada snapshot, cada Leaflet copy-paste, cada import muerto aparece dos veces en grep/IDE.
  - Inflama el repo (+125 MB) y los tiempos de `git status` / autocomplete.
  - El nombre `kudos_project/kudos_project/` confunde con el módulo Django real (`kudos_project/` que sí es el package de settings).
  - Si alguien edita un archivo de la copia stale por error, su cambio nunca llega a producción.

| Campo | Detalle |
|---|---|
| **Problema** | Mirror stale del 2026-05-15 dentro del propio repo, divergente del estado activo |
| **Impacto** | +125 MB · 780 ficheros · doble lectura en herramientas · riesgo de editar la copia equivocada |
| **Solución** | `git mv kudos_project/kudos_project ./.archive_20260515` (o `rm -rf` si confiamos en git) tras confirmar que ningún script CI/deploy/script local apunta ahí |
| **Riesgo** | Bajo. Cero referencias activas. Antes de borrar, verificar manualmente `kudos_project/kudos_project/kudos_app/urls.py` para rescatar las 4 rutas `personal_*` por si interesa archivarlas separadas (las funciones ya viven en `views.py` raíz) |
| **Prioridad** | **P1 — el cambio de mayor reducción de complejidad visible disponible hoy** |

---

## 1. ARCHIVOS DUPLICADOS

### 1a. Snapshots / `.dormant` / `- copia` / `.bak` — 58 archivos (~2.3 MB)

El conteo pasó de 29 → 58 porque cada snapshot existe también dentro del mirror `kudos_project/kudos_project/`. Si se ejecuta el P1 anterior, este número cae automáticamente a 29.

Patrón sin cambios respecto al reporte previo: `static/js/map5d/markers.js.snapshot.*`, `kudos_app/templates/map.html.snapshot.d{4..7}.*`, `kudos_app/views.py.snapshot.*` (8 versiones), `kudos_app/google_maps_utils.py.dormant`, `kudos_app/templates/space_exploration - copia.html`, `celerybeat-schedule.bak`.

**Acción recomendada (mantiene política "no eliminar funcionalidades"):**

```bash
# 1. archivar todo bajo .snapshots/ fuera del árbol fuente
mkdir -p .snapshots
git mv $(find . -path ./.git -prune -o -path ./venv -prune -o -type f \( \
  -name '*.snapshot.*' -o -name '*.dormant' -o -name '* - copia*' -o -name '*.bak' \
\) -print) .snapshots/

# 2. añadir al .gitignore
cat >> .gitignore <<'EOF'
*.snapshot.*
*.dormant
* - copia*
*.bak
celerybeat-schedule.*
.snapshots/
EOF
```

| Campo | Detalle |
|---|---|
| **Problema** | Snapshots manuales conservados en el árbol fuente, replicados por el mirror nested |
| **Impacto** | +2.3 MB, ruido en grep/IDE, falsos positivos en este propio scan |
| **Solución** | Mover a `.snapshots/` o `git rm`; añadir patrones a `.gitignore` |
| **Riesgo** | Nulo — git conserva la historia |
| **Prioridad** | P2 (cae sólo si se ejecuta P1 mirror) |

### 1b. Templates duplicados `templates/` (raíz) vs `kudos_app/templates/`

Sin cambios desde el 2026-05-19. Confirmadas 7 plantillas duplicadas y divergentes (`403.html`, `assistant_interaction.html`, `capsule_created.html`, `capsule_museum.html`, `control_panel.html`, `error.html`, `personal_assistant.html`). Django carga `kudos_app/templates/` vía `APP_DIRS`; la copia en `templates/` raíz probablemente no se sirve.

### 1c. Archivos sueltos huérfanos en raíz

Sin cambios:

* `vista_kudos_final.html` ≡ `vista_previa_kudos.html` (mismo MD5), `vista_previa_final.html` separado.
* `settings.py` raíz (0 B) vs `kudos_project/settings.py` real.
* `kudos_app_urls.py` (407 B) duplica `kudos_app/urls.py`.
* `dump.rdb`, `ipfs_daemon.log`, `resolv.conf`, `celerybeat-schedule.{dat,dir,bak}`, `deployment_log.txt` siguen committeados.

---

## 2. JS REPETIDO

### 2a. Inicialización Leaflet — 17 templates vivos (estable)

```
art_culture · capsule_museum · control_panel · education_plan · education_plan_success
· education_recommender · governance · historical_map · infrastructure · innovation
· market_transactions · research · seller_profile · social_impact
· space_badge_confirmation · tourism_badge_confirmation
+ templates/capsule_museum.html  (copia raíz)
+ 4 snapshots de map.html
```

Todas pertenecen a features **CONGELADAS** según contrato (crypto/governance/marketplace/health/art/social). El template MVP `map.html` ya NO inicializa Leaflet inline — lo delega a `static/js/map5d/core.js` (refactor cerrado).

| Campo | Detalle |
|---|---|
| **Problema** | 17 inits Leaflet copy-pasted en features congeladas |
| **Impacto** | Choca con prio #2 (rendimiento móvil) y #4 (clustering centralizado) del contrato AXÓN |
| **Solución mínima** | Helper `static/js/map5d/feature_map.js` con firma `(elementId, lat, lng, zoom)`; las features congeladas lo adoptan o se ocultan tras gate |
| **Riesgo** | Bajo si se hace por gating (features no MVP) |
| **Prioridad** | P3 |

### 2b. Bloques `<script>` inline grandes — top 5 (vivos)

| Template | JS inline | Estado |
|---|---:|---|
| `control_panel.html` | 21 092 B | feature congelable |
| `capsule_detail.html` | 15 810 B | MVP — extraer a `static/js/capsule_detail.js` |
| `capsule_clip.html` | 10 301 B | extraer a `static/js/capsule_clip.js` |
| `research.html` | 8 169 B | congelable |
| `map.html` | **7 856 B** | MVP — vigilar; el reporte previo lo daba sin JS inline |

El bloque JS de `map.html` no estaba en el reporte anterior. **Investigar si la subida es por bootstrap del módulo `map5d` (legítimo) o por nueva lógica inline que debería estar en `static/js/map5d/`.**

### 2c. Patrón fetch + CSRF duplicado

4 templates con `csrfmiddlewaretoken` inline (`ai_chat`, `ai_panel`, `assistant_characters`, `personal_assistant`). Candidato a un único helper en `static/js/scripts.js`. Sin cambios.

---

## 3. RUTAS HUÉRFANAS

`kudos_app/urls.py`: **110 nombres**, **111 referencias `views.*`**, **116 funciones definidas** en `views.py`.

### 3a. URL names sin referencia tras filtrar `{% url %}`, `reverse()`, y substrings de path en `fetch`/`href`

**7 rutas verdaderamente huérfanas** (eran 3 en el scan anterior):

| Nombre | Path | Comentario |
|---|---|---|
| `ai_insight_execute` | `mind/insight/<int:insight_id>/execute/` | Mind Lite — endpoint POST; verificar si se llama desde JS ofuscado |
| `api_health` | `api/health/` | ¿sustituida por `healthcheck` en root? |
| `api_place_detail` | `api/places/<slug>/` | Endpoint MVP de Mapa 5D — esperado que se consuma desde frontend Next.js (`experience/`) |
| `api_stats` | `api/stats/` | Mismo caso que el anterior |
| `health_monitor` | `health-monitor/` | Feature congelada |
| `simulation_engine` | `simulation-engine/` | Feature congelada |
| `virtual_operations` | `virtual-operations/` | Feature congelada |

Las 4 APIs (`ai_insight_execute`, `api_health`, `api_place_detail`, `api_stats`) probablemente sí se consumen desde el frontend Next.js de `experience/`. **Antes de marcar como huérfanas, ejecutar:**

```bash
grep -rln "api/places\|api/stats\|api/health\|mind/insight" experience/ --include='*.ts' --include='*.tsx'
```

### 3b. Views definidas sin entrada en `urls.py` — 6 funciones (eran 4)

* `ai_mind_chat` — sustituida por `ai_chat` / `ai_lite_ask`
* `bookmark_capsule` — sustituida por flujo de bookmarks (🆕 vs 19-may)
* `personal_crypto` — crypto (congelada)
* `personal_habit_toggle` — health (congelada)
* `personal_health` — health (congelada)
* `personal_learning` — health/learning (congelada). **Regresión:** la ruta vivía en `kudos_project/kudos_project/kudos_app/urls.py` (copia stale) pero la raíz la retiró; la función sigue viva.

| Campo | Detalle |
|---|---|
| **Problema** | 6 views vivas sin URL — "cementerio" en `views.py` |
| **Impacto** | Hace más difícil la extracción por feature; bytes y autocomplete contaminados |
| **Solución** | Mover a `kudos_app/legacy_views.py` (ya existente, 2 160 L) o anotar `# FROZEN — feature-gated` para preservar la regla "no eliminar funcionalidades" |
| **Riesgo** | Bajo si se hace mover, no eliminar |
| **Prioridad** | P3 |

---

## 4. IMPORTS MUERTOS

Análisis AST sobre 214 `.py` activos (excluyendo `venv`, `.git`, `__pycache__`, `migrations`, snapshots).

**Total:** 149 imports muertos en 91 archivos. **~50 % del volumen procede del mirror nested.** Si se ejecuta el P1, baja automáticamente a **~75 en ~50 archivos**.

Top 8 archivos por imports muertos (excluyendo mirror):

| Archivo | Muertos | Comentario |
|---|---:|---|
| `kudos_app/management/commands/autonomous_ops.py` | 8 | Comando legacy, candidato a `legacy/` |
| `kudos_app/management/commands/ai_autopilot.py` | 6 | Comando legacy |
| `kudos_app/legacy_views.py` | 6 | Esperable — son legacy |
| `content_engine/pipeline.py` | 4 | Sí se usa; limpiar manualmente |
| `content_engine/management/commands/run_master_smoke_map.py` | 2 | — |
| `kudos_app/generate_capsule_clips.py` | 2 | `concatenate_videoclips`, `timezone` |
| `kudos_app/management/commands/daily_tasks.py` | 2 | — |
| `kudos_app/utils/data_utils.py` | 2 | `SettingsConfig`, `numpy as np` |

**En `kudos_app/views.py` (monolito MVP):** **1 import muerto** — `from django.db.models import F` en L1517 (local a función). Excelente.

**En `kudos_project/settings.py`:** `whitenoise` (L91) — middleware ya se carga por string, el import no se usa.

| Campo | Detalle |
|---|---|
| **Problema** | ~75 imports muertos repartidos por comandos legacy y utilidades |
| **Impacto** | Bajo — sin coste runtime, sólo ruido |
| **Solución** | `pyflakes` + `autoflake --remove-all-unused-imports` en CI |
| **Riesgo** | Nulo si se ejecuta antes de tests |
| **Prioridad** | P4 |

---

## 5. TEMPLATES GIGANTES

Threshold de refactor: > 300 LOC. Sin cambios estructurales desde el 2026-05-19.

| Template | Líneas | Bytes | Estado |
|---|---:|---:|---|
| `capsule_detail.html` | **876** | 43 979 | MVP — candidato #1 a trocear por `{% include %}` (AR / audio / clip / diálogo / versionado) |
| `capsule_clip.html` | 473 | 23 052 | extraer JS a `static/js/capsule_clip.js` |
| `control_panel.html` | 473 | 21 474 | feature congelable |
| `ai_panel.html` | 343 | 13 382 | Mind Lite — aceptable |
| `manifesto.html` | 323 | 11 138 | texto literario; aceptable |
| `capsule_video_clip.html` | 242 | 9 444 | extraer JS |
| `near.html` | 240 | 10 977 | duplica patrón map5d |
| `home.html` | 230 | 14 369 | MVP — vigilar; cubierto por D7 |
| `founder_panel.html` | 215 | 9 487 | congelable |

`map.html` **se mantiene en 167 L** (vs originales > 1 000) — refactor sostenido. ✅

---

## RESUMEN PRIORIZADO (acción CTO 2026-05-21)

| # | Acción | Prio | Esfuerzo | Riesgo | Estado vs 2026-05-19 |
|---|---|---|---|---|---|
| ~~1~~ | ~~Reparar `views.py` línea 2376~~ | ~~P0~~ | — | — | ✅ **HECHO** (commit `67fe207`) |
| 2 | **Archivar `kudos_project/kudos_project/` mirror stale (125 MB · 780 ficheros)** | **P1** | 15 min | Bajo | 🆕 nuevo hallazgo |
| 3 | Mover 58 snapshots/dormant/copia/bak a `.snapshots/` + `.gitignore` | P2 | 15 min | Nulo | pendiente |
| 4 | Eliminar `templates/` raíz divergente + `kudos_project/templates/registration/login.html` | P2 | 10 min | Bajo | pendiente |
| 5 | Eliminar `settings.py` (0 B), `kudos_app_urls.py` (407 B), `vista_*.html` raíz | P2 | 5 min | Nulo | pendiente |
| 6 | Verificar que las 4 APIs huérfanas (`api_health`, `api_place_detail`, `api_stats`, `ai_insight_execute`) se consumen desde `experience/` Next.js | P2 | 20 min | Nulo | 🆕 |
| 7 | Congelar 3 rutas vivas no-MVP (`health_monitor`, `simulation_engine`, `virtual_operations`) tras feature gate | P3 | 20 min | Bajo | pendiente |
| 8 | Mover las 6 views no-wired a `legacy_views.py` | P3 | 15 min | Nulo | +2 nuevas |
| 9 | Extraer helper `feature_map.js` para 17 inits Leaflet en features congeladas | P3 | 1 h | Medio | pendiente |
| 10 | Auditar `map.html` (7.8 KB JS inline); mover a `static/js/map5d/bootstrap.js` si procede | P3 | 30 min | Bajo | 🆕 regresión menor |
| 11 | Trocear `capsule_detail.html` con `{% include %}` por sección | P4 | 2 h | Medio | pendiente |
| 12 | Pasar `<script>` inline > 3 KB a `static/js/*.js` | P4 | 2 h | Bajo | pendiente |
| 13 | Pasar `autoflake` sobre comandos legacy (75 imports muertos) | P4 | 30 min | Nulo | pendiente |

---

## NOTAS PARA EL CONTRATO AXÓN

* **Estabilidad del mapa (prio #1):** ✅ MVP desbloqueado. `views.py` compila, `home` endurecida con try/except.
* **Rendimiento móvil (prio #2):** 17 inits Leaflet siguen siendo la mayor amenaza pero todos están en features **congeladas**. Si se mantienen ocultas tras gate público, el impacto real es nulo. Acción real: gating.
* **Reducir complejidad visible (prio #3):** el mirror `kudos_project/kudos_project/` es el cambio de mayor impacto disponible hoy — 125 MB y 780 archivos de ruido eliminables en 15 min con riesgo cero. **Hacerlo antes que cualquier otra cosa.**
* **Marker clustering (prio #4):** `static/js/map5d/clustering.js` existe (896 B) — confirmar si está activado en el MVP. (Fuera del scope de este scan.)
* **Limpieza de rutas (prio #5):** `urls.py` está sano (110 rutas, 7 huérfanas reales de las cuales 4 son APIs probables consumidas por Next.js). El desorden está en views/templates.
* **Refactor `map.html` (prio #6):** ✅ sostenido (167 L). Vigilar 7.8 KB de JS inline nuevo.
* **Extracción `views.py` (prio #7):** sigue en 2 382 L. Próximo corte sugerido: por feature (`views_capsules.py`, `views_map.py`, `views_mind.py`, `views_founder.py`).

**Regla de oro respetada:** todas las acciones P1-P4 mantienen las features congeladas vivas en el repo. Ninguna eliminación de funcionalidad.

---

## ANEXO — CÓMO REPRODUCIR ESTE SCAN

```bash
# 1. P0 check
python3 -c "import py_compile; py_compile.compile('kudos_app/views.py', doraise=True)"

# 2. Snapshots/dormant/copia/bak
find . -type d \( -name venv -o -name .git -o -name __pycache__ -o -name node_modules \
    -o -name .next -o -name staticfiles -o -name matplotlib-cache -o -name tensorflow-source \) -prune \
  -o -type f \( -name '*.snapshot.*' -o -name '*.dormant' -o -name '* - copia*' -o -name '*.bak' \) -print

# 3. Mirror nested check
diff -rq kudos_app kudos_project/kudos_app | grep -v __pycache__

# 4. L.map inits
grep -rln "L\.map(" kudos_app/templates templates

# 5. Inline JS por template (bytes)
for f in $(find kudos_app/templates -name '*.html' -not -name '*.snapshot.*' -not -name '* - copia*'); do
  inline=$(awk '/<script[^>]*>/{flag=1; next} /<\/script>/{flag=0} flag' "$f" | wc -c)
  echo "$inline $f"
done | sort -rn | head -10

# 6. Templates > 200 LOC
find kudos_app/templates -name '*.html' -not -name '*snapshot*' -not -name '* - copia*' \
  | xargs wc -l | awk '$1 > 200'
```
