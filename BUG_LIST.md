# BUG_LIST.md — KUDOS / AXÓN

Última actualización: 2026-05-15 (auto · daily-status)
Criterio: solo bugs / bloqueos que impiden o ponen en riesgo el MVP. Se ordenan por severidad.
Mandato vigente: **CORE EXTRACTION + FEATURE GATING + MVP STABILIZATION** (ver `AXON_CORE.md`).

Leyenda severidad: 🟥 Crítico · 🟧 Alto · 🟨 Medio · 🟩 Bajo

---

## 🟥 Críticos (bloquean cirugía AXÓN y lanzamiento)

### BUG-001 · `SECRET_KEY` con fallback inseguro
- Archivo: `kudos_project/settings.py` (zona de configuración).
- Síntoma: si la variable de entorno no está definida, el proyecto arranca con una `SECRET_KEY` por defecto conocida.
- Impacto: seguridad — comprometería sesiones y firmas en producción.
- Acción: forzar lectura desde `.env`; fallar arranque si falta.

### BUG-002 · Sin tests automatizados
- Archivo: `kudos_app/tests.py` (10 líneas, prácticamente vacío).
- Síntoma: cualquier cambio puede romper el flujo principal sin aviso. Sin tests, la cirugía AXÓN no es verificable.
- Acción: añadir smoke tests para los 7 sistemas PUBLIC (`/`, `/map/`, `/capsules/`, `/search/`, `/timeline/`, `/mind/`, `/dashboard/`) + 1 ruta DORMANT (debe devolver 404).

### BUG-003 · Funciones duplicadas en `kudos_app/views.py` ⚠ NUEVO (AXÓN §0)
- Archivo: `kudos_app/views.py` (2 450 L · 127 funciones).
- Síntoma: **6 funciones definidas dos veces.** La segunda definición sobrescribe a la primera; el código de la primera nunca se ejecuta pero confunde imports, búsqueda de referencias y revisiones.
  - `ai_chat` (L1540 ⚠ + L1628)
  - `capsule_versions` (L1989 ⚠ + L2332)
  - `capsule_version_revert` (L2003 ⚠ + L2343)
  - `capsule_aport_create` (L2052 ⚠ + L2368)
  - `capsule_aport_validate` (L2108 ⚠ + L2403)
  - `capsule_dialog` (L2156 ⚠ + L2431)
- Impacto: bug activo — superficie de error triplicada; bloquea la auditoría D3 y la posterior modularización.
- Acción: eliminar las 6 primeras definiciones (las que tienen ⚠), mantener las oficiales. Documentado en `AXON_CORE.md §3.2.C`.

### BUG-004 · Mapa multidimensional incompleto
- Archivo: `kudos_app/templates/map.html` (881 L con CSS + JS inline).
- Síntoma: la cápsula tiene datos geo pero el mapa carece de clustering, viewport loading, slider temporal estable y geolocalización del usuario — todos “innegociables” del MVP.
- Acción (fases AXÓN D4–D9): `leaflet.markercluster` local, bbox + paginación en `api_capsules_5d`, viewport loading con debounce, slider temporal, `navigator.geolocation` con consentimiento.

### BUG-005 · Login social no implementado
- Síntoma: el MVP exige login social (Google, Facebook, Instagram, X, TikTok) y solo existe el flujo nativo Django.
- Acción: instalar y configurar `django-allauth`; empezar por Google. **No bloquea Fase 1 AXÓN**, pero sí el lanzamiento público.

---

## 🟧 Altos (rompen experiencia o estabilidad)

### BUG-006 · `map.html` monolítico (881 L) ⚠ NUEVO (AXÓN §0)
- Archivo: `kudos_app/templates/map.html`.
- Síntoma: CSS + JS inline en la plantilla; bloquea cualquier optimización de rendimiento móvil y dificulta el debug.
- Acción (D7–D8): extraer a `static/css/map5d.css` y a módulos `static/js/map5d/{core,markers,timeline,search,galaxy}.js`. Objetivo final: `map.html` ≤ 200 L.

### BUG-007 · Leaflet servido por CDN ⚠ NUEVO (AXÓN §0)
- Archivo: `kudos_app/templates/map.html` líneas 4–5.
- Síntoma: el mapa carga `https://unpkg.com/leaflet@1.9.4/dist/leaflet.{css,js}` aunque hay 3 copias locales en `static/` (`leaflet.js`, `leaflet-src.js`, `leaflet-src.esm.js`) y 4 copias en `staticfiles/`.
- Impacto: dependencia externa innecesaria, peor caché, fragilidad offline, y desperdicio de espacio (~3 MB duplicados en estáticos).
- Acción (D2): servir Leaflet desde `static/leaflet.js`; eliminar las versiones `-src*` no usadas.

### BUG-008 · `kudos_app/views.py` monolítico (2 450 L)
- Síntoma: 99 vistas + 127 funciones (con duplicados) en un solo módulo. Imposible auditar sin trocearlo.
- Acción: tras BUG-003, extraer por sistema PUBLIC (`apps/{core,maps,capsules,users,search,timeline,mind}/views.py`) en D13. **No reescribir**, solo mover.

### BUG-009 · Utils duplicados ⚠ NUEVO (AXÓN §0)
- Archivos: `kudos_app/google_maps_utils.py` y `kudos_app/utils/google_maps_utils.py` (5 546 bytes idénticos cada uno).
- Síntoma: dos copias del mismo módulo conviven; cualquier cambio en uno deja al otro divergente sin aviso.
- Acción (D2): mantener `kudos_app/utils/google_maps_utils.py`; eliminar el de la raíz de la app. Verificar imports.

### BUG-010 · `kudos_app_urls.py` huérfano ⚠ NUEVO (AXÓN §0)
- Archivo: `kudos_app_urls.py` en la raíz del repo.
- Síntoma: el archivo existe pero no está enganchado a `ROOT_URLCONF` (que apunta a `kudos_project/urls.py`).
- Acción (D2): confirmar que no se importa en ningún sitio y eliminarlo.

### BUG-011 · `full_autopilot` no apto para producción
- Síntoma: lanza bucles infinitos sin rate-limit ni supervisión; saturará el dyno en Render/Railway.
- Acción: convertir a tareas programadas con APScheduler/cron; añadir circuit breakers y logs. Post-MVP si hace falta.

### BUG-012 · Dependencias críticas comentadas
- Archivo: `requirements.txt`.
- Síntoma: Pillow, requests, openai (opcional) están comentados. Cualquier flujo que dependa de imágenes o HTTP externo falla en limpio.
- Acción: activar Pillow y requests; mantener openai/celery/redis comentadas hasta que estén integradas.

### BUG-013 · Generación de clips inestable
- Síntoma: `multimedia_auto` depende de heurísticas locales y/o `OPENAI_API_KEY`; no hay pipeline reproducible.
- Acción: definir pipeline local mínimo: gTTS + imágenes Wikimedia + moviepy → clip 15s/60s. Post-MVP AXÓN.

### BUG-014 · Mind no reducido a 3 prompts ⚠ NUEVO (AXÓN §5 D12)
- Archivo: `kudos_app/templates/ai_panel.html` y `ai_chat` / `ai_chat_send` en `views.py`.
- Síntoma: el MVP exige una experiencia Mind Lite con 3 botones (*¿Qué es esto?*, *¿Qué pasó aquí?*, *¿Qué ver cerca?*). La UI actual sigue exponiendo insights/directives/ejecuciones.
- Acción (D12): rebajar UI, envolver el resto en `{% if_feature "mind_full" %}`, hacer que `ai_chat_send` acepte `mode in {"what", "when", "near"}`.

### BUG-015 · Share blindado pendiente ⚠ NUEVO (AXÓN §5 D11)
- Archivo: `kudos_app/templates/capsule_detail.html`.
- Síntoma: falta bloque OpenGraph + Twitter cards; botón compartir no usa `navigator.share` con fallback.
- Acción (D11): añadir `og:title`, `og:description`, `og:image`, `twitter:card`; botón con `navigator.share` + copia de link.

---

## 🟨 Medios (deuda técnica relevante)

### BUG-016 · DB SQLite en producción
- Síntoma: `db.sqlite3` se desplegará por defecto si no se configura `DATABASE_URL`.
- Acción: forzar PostgreSQL en producción y documentar fallback.

### BUG-017 · Archivos `.md.txt` desordenados en raíz
- Síntoma: `PROJECT_AUDIT.md.txt`, `MVP_DEFINITION.md.txt`, `DJANGO_APPS_STRUCTURE.md.txt`, `IMPORT_PLAN.md.txt`, `ROADMAP_FASE1.md.txt`, `TECHNICAL_DECISIONS.md.txt` con doble extensión.
- Acción: mover a `docs/` y normalizar extensión a `.md`. Post-cirugía.

### BUG-018 · Confirmar `.env` fuera del historial
- Síntoma: `.env` aparece junto a `.env.example`; verificar `.gitignore` y rotar claves si han estado expuestas.
- Acción: `git log --all -- .env` y confirmar; ya añadido a `.gitignore`.

### BUG-019 · `db.sqlite3` (~10 MB) en repo
- Síntoma: la base de datos se versiona con el código (aunque ya está en `.gitignore` actual).
- Acción: `git rm --cached db.sqlite3` y regenerar con `create_initial_data.py`/`seed_data.py` para entornos limpios.

### BUG-020 · `legacy_views.py` sin reubicar
- Archivo: `kudos_app/legacy_views.py` (2 160 L).
- Síntoma: cementerio confirmado pero todavía conviviendo con `views.py` activo dentro de `kudos_app/`. Riesgo de re-importación accidental.
- Acción (D13): mover a `dormant/legacy_views.py` con `__init__.py`, sin tocar contenido.

### BUG-021 · `staticfiles/` con duplicados de Leaflet
- Síntoma: `staticfiles/leaflet*.js{,.map}` (4 archivos) además de las copias en `static/`.
- Acción (D2): `collectstatic --clear` tras dejar una sola fuente en `static/`.

---

## 🟩 Bajos (mejoras incrementales)

### BUG-022 · Plantillas sin estilo unificado
- 120 templates sin sistema de diseño claro; muchas dormant (`marketplace.html`, `social_*.html`, `founder_*.html`, `wisdom_*.html`, `personal_*.html`, `ar_view.html`, `art_*.html`, `mental_health.html`, etc.).
- Acción post-MVP: tras la cirugía AXÓN, extraer parciales base + sistema de tokens visuales.

### BUG-023 · `README.md` desactualizado
- Síntoma: la portada del repo (1 891 bytes) no refleja el estado actual ni enlaza a `AXON_CORE.md`, `MVP_GAPS.md`, `MVP_PROGRESS.md`, `PROJECT_STATUS.md`, `NEXT_PRIORITY.md`.
- Acción: refrescar tras estabilizar el MVP. Suficiente con un párrafo introductorio + índice de documentos AXÓN.

### BUG-024 · `if_feature` no cubre todos los enlaces DORMANT
- Síntoma: la mayoría de los enlaces de `base.html` están envueltos, pero queda barrer plantillas internas (`profile.html`, `dashboard.html`, etc.) en busca de enlaces directos a rutas DORMANT.
- Acción: barrido sistemático con `grep '{% url' kudos_app/templates/`. Post-cirugía.

---

## Cerrados recientemente

- **Feature Gating activado**: `kudos_project/features.py`, `middleware.py`, `templatetags/feature_tags.py` y `base.html` con nav PUBLIC reducida a 7 sistemas — bloque inicial cerrado el 2026-05-15.
- **`db.sqlite3`, `__pycache__/`, `.env`** ya en `.gitignore` (verificado).
- **Migraciones 0005_userpreference y 0006_capsule_version_aport** aplicadas y validadas en SQLite local.
