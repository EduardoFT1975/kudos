# AXÓN · CORE EXTRACTION MANDATE

> **Misión:** revelar el producto oculto dentro del monolito KUDOS.
> No reescribir. No microservicios. No nuevas features.
> Extraer, blindar y lanzar el núcleo.

**Producto oficial:** *Google Earth emocional + histórico + humano.*
**Experiencia:** *explorar memoria humana sobre un mapa temporal vivo.*

---

## 0. Estado real del repositorio (auditoría confirmada en código)

| Indicador | Medición | Severidad |
|---|---|---|
| `kudos_app/views.py` | **2 450 líneas · 127 funciones** | crítico |
| `kudos_app/legacy_views.py` | 2 160 líneas (ya marcado legacy) | dormant natural |
| `kudos_app/models.py` | 1 114 líneas | alto |
| `kudos_app/urls.py` | 202 líneas · ~80 rutas | crítico |
| `kudos_app/templates/map.html` | **881 líneas con CSS+JS inline** | crítico |
| Templates totales | 120 archivos `.html` | alto |
| Funciones duplicadas | `ai_chat` ×2, `capsule_versions` ×2, `capsule_version_revert` ×2, `capsule_aport_*` ×2, `capsule_dialog` ×2 | **bug activo** (la segunda sobrescribe a la primera) |
| Utils duplicados | `kudos_app/google_maps_utils.py` y `kudos_app/utils/google_maps_utils.py` | medio |
| Leaflet | servido por CDN dentro de `map.html` + 3 copias locales en `static/` | medio |
| Middleware custom | **ninguno** | oportunidad |

> El monolito está estructuralmente intacto pero tiene **rutas públicas que disparan código de funciones duplicadas** y un `base.html` que enlaza directamente a 12+ pantallas DORMANT.

---

## 1. PUBLIC CORE — 7 sistemas únicos visibles

| # | Sistema | URL(s) público(s) | View (`kudos_app/views.py`) | Template |
|---|---|---|---|---|
| 1 | **Mapa 5D** | `/map/`, `/api/capsules/5d/`, `/api/capsules/nearby/`, `/near/` | `map_view` (L309), `api_capsules_5d` (L2187), `api_capsules_nearby` (L1815), `near` (L1961) | `map.html` |
| 2 | **Capsules** | `/capsules/`, `/capsules/create/`, `/capsules/<uid>/`, `/capsules/<uid>/like/`, `/capsules/<uid>/delete/` | `capsule_list` (L140), `create_capsule`, `capsule_detail` (L192), `toggle_like`, `delete_capsule` | `capsule_*.html` |
| 3 | **Search** | `/search/` | `global_search` (L333) | `search.html` |
| 4 | **Timeline básico** | `/timeline/` | `timeline` (L622) | `timeline.html` |
| 5 | **Users** | `/`, `/register/`, `/onboarding/`, `/accounts/login`, `/accounts/logout`, `/profile/`, `/profile/edit/`, `/profile/<alias>/`, `/dashboard/` | `home`, `register`, `onboarding`, `profile`, `edit_profile`, `public_profile`, `dashboard` | varios |
| 6 | **Mind Lite** | `/mind/`, `/mind/chat/`, `/mind/chat/send/` (solo 3 prompts) | `ai_panel` (L1235), `ai_chat` (L1628 ⚠ duplicado), `ai_chat_send` (L1642) | `ai_panel.html` |
| 7 | **Share** | `/capsules/<uid>/` con bloque OG + botón share | `capsule_detail` (extender meta) | `capsule_detail.html` |

**Total PUBLIC:** ~25 endpoints (incluye institucionales: `/about/`, `/terms/`, `/privacy/`, `/manifiesto/`).

---

## 2. DORMANT SYSTEMS — congelados, sin navegación, código preservado

Bloqueados con 404 por `DormantRouteMiddleware`. Su código sigue vivo en disco.

**Bloques completos (prefijo de URL):**

```
/marketplace/      /congress/        /social/          /sports/
/mental-health/    /spirituality/    /chatbot/         /simulator/
/simulation-engine/ /space-exploration/ /art-festival/  /legacy/
/virtual-operations/ /citizen/       /news/            /trending/
/streaming/        /health-monitor/  /connect/         /promotion/
/notifications/    /achievements/    /data-analysis/   /report/
/feedback/         /safety/          /export/          /founder/
/assistant/        /mind/insight/    /mind/directive/  /feed/
/follow/           /messages/        /bookmarks/       /personal/
/wisdom/           /preferences/     /historical-map/  /geolocation/
/toggle-dark-mode/
```

**Subrecursos de cápsulas congelados:**
`/capsules/<uid>/ar`, `/audio`, `/vr`, `/clip`, `/enrich`, `/versions`, `/aport`, `/dialog`, `/api/capsules/<uid>/memento.json`.

**Templates DORMANT (no se eliminan; quedarán bajo `dormant/` en Fase 6):** 100+ archivos — entre ellos `marketplace.html`, `social_*.html`, `founder_*.html`, `wisdom_*.html`, `personal_*.html`, `ar_view.html`, `art_*.html`, `mental_health.html`, etc.

**legacy_views.py:** ya es un cementerio. Pasa íntegro a `dormant/legacy_views.py` sin tocar contenido.

---

## 3. Arquitectura FEATURE GATED

### 3.1 Componentes creados (ya en el repo)

| Archivo | Función |
|---|---|
| `kudos_project/features.py` | Registry: `FEATURES`, `is_enabled()`, `PUBLIC_URL_NAMES`, `DORMANT_PATH_PREFIXES`, `DORMANT_PATH_REGEX`, `ALWAYS_ALLOWED_PREFIXES` |
| `kudos_project/middleware.py` | `DormantRouteMiddleware` → `Http404` para rutas DORMANT |
| `kudos_app/templatetags/feature_tags.py` | `{% if_feature "x" %} … {% endif_feature %}`, `{% unless_feature %}`, `{% feature "x" as on %}` |

### 3.2 Activación (3 ediciones quirúrgicas — manuales)

**A) `kudos_project/settings.py`** — añadir el middleware **al final** de la lista:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'kudos_project.middleware.DormantRouteMiddleware',   # ← AXÓN GATING
]
```

**B) `kudos_app/templates/base.html`** — sustituir el `<nav class="main-nav">` por la versión gated:

```django
{% load feature_tags %}
<nav class="main-nav" aria-label="Navegación principal">
    <a href="{% url 'home' %}">🏠 Inicio</a>
    <a href="{% url 'capsule_list' %}">🌌 Cápsulas</a>
    <a href="{% url 'map' %}">🌍 Mapa</a>
    <a href="{% url 'search' %}">🔎 Buscar</a>
    <a href="{% url 'timeline' %}">📜 Timeline</a>
    {% if user.is_authenticated %}
        <a href="{% url 'ai_panel' %}">🧠 Mind</a>
    {% endif %}
</nav>
```

Y, en el mismo `base.html`, envolver cada link a feature DORMANT con `{% if_feature %}` antes de tocarlos (más limpio que borrar — preserva la magia). Por ejemplo:

```django
{% if_feature "marketplace" %}<a href="{% url 'marketplace' %}">🛍️ Mercado</a>{% endif_feature %}
{% if_feature "feed_social" %}<a href="{% url 'feed' %}">🎯 Feed</a>{% endif_feature %}
{% if_feature "achievements" %}<a href="{% url 'achievements' %}">🏆 Logros</a>{% endif_feature %}
{% if_feature "trending" %}<a href="{% url 'trending' %}">🔥 Tendencias</a>{% endif_feature %}
{% if_feature "data_analysis" %}<a href="{% url 'data_analysis' %}">📊 Análisis</a>{% endif_feature %}
{% if_feature "founder_panel" %}<a href="{% url 'founder_panel' %}">⭐</a>{% endif_feature %}
{% if_feature "personal_life" %}<a href="{% url 'personal_dashboard' %}">🌿</a>{% endif_feature %}
{% if_feature "feed_social" %}<a href="{% url 'messages_inbox' %}">📨</a>{% endif_feature %}
{% if_feature "notifications" %}<a href="{% url 'notifications' %}">🔔</a>{% endif_feature %}
```

**C) `kudos_app/views.py`** — eliminar las **6 definiciones duplicadas** (segunda copia gana en Python; estabilizar primero esto antes de cualquier otra cirugía):

- `ai_chat` línea 1540 → eliminar (la oficial vive en 1628).
- `capsule_versions` línea 1989 → eliminar (oficial 2332).
- `capsule_version_revert` línea 2003 → eliminar.
- `capsule_aport_create` línea 2052 → eliminar.
- `capsule_aport_validate` línea 2108 → eliminar.
- `capsule_dialog` línea 2156 → eliminar.

> Estas 6 funciones duplicadas son código zombie; su existencia confunde imports y triplica la superficie de bug.

### 3.3 Overrides por entorno

| Variable | Efecto |
|---|---|
| `KUDOS_GATING_OFF=1` | desactiva el gating (todo accesible — solo dev local). |
| `KUDOS_GATING_LOG=1` | loggea intentos a rutas DORMANT. |
| `KUDOS_FEATURE_<NAME>=1` | reactiva una feature concreta (ej. `KUDOS_FEATURE_MARKETPLACE=1`). |

---

## 4. Layout objetivo `apps/` (Fase 6 · NO ejecutar antes)

```
apps/
  core/        → home, dashboard, about, terms, privacy, manifesto
  maps/        → map_view, api_capsules_5d, api_capsules_nearby, near, geolocation
  capsules/    → CRUD + like + delete + create + share OG
  users/       → register, login, profile, edit_profile, public_profile, onboarding
  search/      → global_search
  timeline/    → timeline
  mind/        → ai_panel, ai_chat, ai_chat_send (LITE)
dormant/
  marketplace/, congress/, social/, sports/, mental_health/, spirituality/,
  chatbot/, simulator/, space_exploration/, art_festival/, legacy/,
  virtual_operations/, citizen/, news/, trending/, streaming/, health_monitor/,
  connect/, promotion/, notifications/, achievements/, data_analysis/,
  report/, feedback/, safety/, founder/, assistant_characters/, mind_full/,
  feed_social/, personal_life/, capsule_ar_vr/, capsule_memento/, wisdom/
```

Migración progresiva: una app por día, con `python manage.py check` verde en cada paso.

---

## 5. Roadmap técnico ejecutable — 14 días

### Fase 1 · CIRUGÍA (D1–D3)

**D1 — Gating + estabilización inmediata**
- Aplicar las 3 ediciones quirúrgicas (settings, base.html nav, eliminar 6 duplicados).
- `python manage.py check` + `python manage.py test` verdes.
- Smoke manual: las 7 URLs del PUBLIC CORE responden 200; al menos 6 DORMANT devuelven 404.
- **Métrica:** rutas dormant retornan 404 (objetivo 100% del listado de §2).

**D2 — Limpieza de monolito (no destructiva)**
- Eliminar `kudos_app/google_maps_utils.py` duplicado (mantener el de `utils/`).
- Sustituir Leaflet vía CDN en `map.html` por `static/leaflet*.js` local (un solo archivo: `leaflet.js`, borrar copias `-src*` no usadas).
- Borrar `kudos_app_urls.py` huérfano en raíz si no está incluido en `ROOT_URLCONF`.
- **Métrica:** `staticfiles` baja de 9 a 1 archivo Leaflet; `/static/leaflet/` 200.

**D3 — Inventario de imports muertos**
- Pasar `pyflakes`/`ruff F401` sobre `kudos_app/views.py` y `models.py`.
- Eliminar imports sin uso (mecánico, sin lógica).
- **Métrica:** `ruff check kudos_app/` 0 F401.

### Fase 2 · MAPA CORE (D4–D6)

**D4 — Clustering de markers**
- Añadir `leaflet.markercluster` (local).
- En `api_capsules_5d`: paginación + bbox filter (`?bbox=west,south,east,north`).
- **Métrica:** carga inicial < 200 markers visibles; resto en clusters.

**D5 — Viewport loading + lazy popups**
- Frontend: refetch al hacer `moveend` / `zoomend`, debounce 300 ms.
- Popups: cargar `capsule_detail` parcial vía endpoint `?light=1` (solo título + año + thumb).
- **Métrica:** TTFM (Time To First Marker) < 1,2 s en 4G simulado.

**D6 — Estabilidad móvil**
- Viewport meta correcto; touch-pan habilitado; `tap: true` Leaflet.
- Lighthouse Mobile ≥ 80 en Performance.
- Test físico iOS Safari + Android Chrome.
- **Métrica:** 60 fps en pan/zoom Android mid-range.

### Fase 3 · REFRACTOR MAPA (D7–D9)

Romper `map.html` (881 L) sin reescribir lógica.

**D7 — Separar CSS**
- Mover `<style>` inline → `static/css/map5d.css`.
- `<link rel="stylesheet">` en `{% block extra_head %}`.
- **Métrica:** `map.html` < 500 L.

**D8 — Separar JS**
- Mover lógica inline a:
  - `static/js/map5d/core.js` (init, layers base)
  - `static/js/map5d/markers.js` (fetch + cluster)
  - `static/js/map5d/timeline.js` (slider temporal)
  - `static/js/map5d/search.js` (input dentro del mapa)
  - `static/js/map5d/galaxy.js` (efectos visuales)
- Cargar como módulos `<script type="module">`.
- **Métrica:** `map.html` < 200 L; cada módulo < 250 L.

**D9 — Eliminar fetches duplicados**
- Auditar llamadas: si `api_capsules_5d`, `api_capsules_nearby`, `api_capsules` devuelven solapado → unificar contrato detrás de `api_capsules_5d`.
- Cache de respuesta (Cache-Control: 60s) cuando bbox repetido.
- **Métrica:** -50% requests/sesión vs baseline D3.

### Fase 4 · CAPSULE ENGINE (D10–D11)

**D10 — Flujo marker → popup → cápsula**
- Marker click → popup ligero (título, año, thumb).
- Botón "Abrir cápsula" → ruta `/capsules/<uid>/`.
- **Métrica:** flujo entero < 3 clicks; sin recargas completas.

**D11 — Share blindado**
- En `capsule_detail`: añadir bloque OG (`og:title`, `og:description`, `og:image`, `twitter:card`).
- Botón "Compartir" usa `navigator.share` con fallback a copiar link.
- **Métrica:** preview correcto en WhatsApp / Twitter / Telegram.

### Fase 5 · MIND LITE (D12)

**D12 — Reducir Mind a 3 prompts**
- `ai_panel.html`: dejar solo 3 botones grandes: *¿Qué es esto?*, *¿Qué pasó aquí?*, *¿Qué ver cerca?*.
- Ocultar (`{% if_feature "mind_full" %}`) insights/directives/ejecuciones.
- `ai_chat_send` recibe `mode in {"what", "when", "near"}` y delega.
- **Métrica:** primer "wow" < 8 s desde click.

### Fase 6 · MODULARIZACIÓN (D13–D14)

**D13 — Estructura `apps/` (no-op funcional)**
- Crear directorios `apps/{core,maps,capsules,users,search,timeline,mind}/` con `__init__.py`.
- Crear `dormant/` con `__init__.py`.
- Mover **solo** `legacy_views.py` → `dormant/legacy_views.py` y arreglar imports si los hubiera.
- Resto de migración: pospuesta post-MVP.
- **Métrica:** `python manage.py check` verde; tests verdes.

**D14 — Verificación final + demo pública**
- Lighthouse Desktop ≥ 90 (Perf, A11y, SEO).
- Lighthouse Mobile ≥ 80.
- Las 7 PUBLIC URL responden 200.
- 100% de rutas DORMANT del listado §2 responden 404.
- Recorrer manualmente: home → map → marker → popup → capsule → share → mind → search → timeline.
- Tag `v0.9-axon-core` en git.

---

## 6. KPIs del MVP

| KPI | Objetivo | Cómo se mide |
|---|---|---|
| TTFM (Time To First Marker) | < 1,2 s | Chrome DevTools 4G + CPU 4× slowdown |
| Marker budget en pantalla | ≤ 200 | clustering Leaflet |
| FPS pan/zoom mobile | ≥ 60 | DevTools Performance, Android mid-range |
| Lighthouse Mobile Perf | ≥ 80 | CI |
| Rutas PUBLIC con 200 | 7 / 7 sistemas | smoke test D14 |
| Rutas DORMANT con 404 | 100 % del listado §2 | smoke test D14 |
| `views.py` líneas | ≤ 2 000 tras D3 | `wc -l` |
| `map.html` líneas | ≤ 200 tras D8 | `wc -l` |
| Funciones duplicadas | 0 | `grep -c "^def NAME"` |

---

## 7. Reglas absolutas (no negociables)

1. No reescribir desde cero.
2. No microservicios.
3. No añadir features nuevas.
4. Nada se elimina — todo lo dormant se preserva.
5. Cada commit deja `manage.py check` verde.
6. Cada commit deja la suite de tests verde.
7. Time To Awe (TTA) > superficie de features.

---

## 8. Próximas decisiones que requieren input

1. ¿Aplicar las 3 ediciones quirúrgicas de §3.2 ahora mismo (auto) o entregar como patch?
2. ¿Eliminar duplicados de `views.py` ahora o esperar suite de tests propia?
3. ¿Lighthouse en CI o solo manual hasta v0.9?

> Mandato vigente: **CORE EXTRACTION + FEATURE GATING + MVP STABILIZATION**.
> Próxima acción recomendada: aprobar §3.2 para que el repo arranque ya con gating activo.
