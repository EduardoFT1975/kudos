# PROJECT_STATUS.md — KUDOS / AXÓN

Última actualización: 2026-05-15 (auto · daily-status)
Responsable: Eduardo
Estado general: **Pre-MVP · AXÓN Fase 1 (Cirugía) en curso**

Producto oficial: *Google Earth emocional + histórico + humano.*
Mandato vigente: **CORE EXTRACTION + FEATURE GATING + MVP STABILIZATION**.

---

## Resumen ejecutivo

KUDOS sigue siendo un monolito Django funcional pero con código zombie y rutas
DORMANT mezcladas con las públicas. La arquitectura **FEATURE GATED** ya está
en pie (registry + middleware + template tags + nav gated) y bloqueando rutas
congeladas. Aún quedan 6 funciones duplicadas en `views.py` que confunden
imports y triplican la superficie de bug; eliminarlas es el siguiente paso
mecánico antes de tocar el mapa.

El roadmap pre-AXÓN (allauth → PostgreSQL → deploy) se mantiene en segundo
plano: el objetivo inmediato es revelar el CORE oculto, no añadir flujos
nuevos.

---

## Qué funciona

- Proyecto Django 4.2 arranca con `python manage.py runserver`.
- Base de datos SQLite operativa (6 migraciones aplicadas, incluida
  `0005_userpreference` y `0006_capsule_version_aport`).
- App principal `kudos_app` con 38 modelos, 99 vistas, 92 rutas, 114 plantillas.
- **FEATURE GATED SYSTEM en producción interna:**
  - `kudos_project/features.py` con registry PUBLIC vs DORMANT.
  - `kudos_project/middleware.py · DormantRouteMiddleware` montado en
    `settings.py` (línea 82, al final de la lista de middleware).
  - `kudos_app/templatetags/feature_tags.py` con `{% if_feature %}` /
    `{% unless_feature %}` operativos.
  - `base.html` con la navegación pública limpia y los enlaces DORMANT
    envueltos en `{% if_feature %}` (marketplace, feed_social, achievements,
    trending, notifications, founder_panel, personal_life, connect, etc.).
- Comandos de importación funcionales: `import_massive`, `import_world`,
  `import_wikipedia`, `setup_organization`, `setup_personal_assistant`.
- Carga inicial reproducible: 700+ cápsulas clásicas + 90 geolocalizadas.
- Configuración dev/prod preparada (Gunicorn + WhiteNoise + dj-database-url +
  psycopg2-binary).
- `db.sqlite3`, `__pycache__/` y `.env` ya están en `.gitignore`.
- Documentación AXÓN consolidada (`AXON_CORE.md` con roadmap de 14 días).

## Qué está roto / en riesgo

- **Código zombie en `views.py`**: 6 funciones duplicadas siguen vivas.
  La segunda definición sobrescribe a la primera en Python, por lo que el
  enrutado actual es ambiguo y depende del orden de import.
  - `ai_chat` (líneas 1540 y 1628)
  - `capsule_versions` (1989 y 2332)
  - `capsule_version_revert` (2003 y 2343)
  - `capsule_aport_create` (2052 y 2368)
  - `capsule_aport_validate` (2108 y 2403)
  - `capsule_dialog` (2156 y 2431)
- **`views.py` = 2 450 líneas · 127 funciones.** Inalcanzable de auditar sin
  romper en pedazos.
- **`map.html` = 881 líneas** con CSS+JS inline. Bloquea cualquier mejora de
  rendimiento móvil.
- **Leaflet servido por CDN** desde `map.html` (`unpkg.com/leaflet@1.9.4`)
  aunque ya existen 3 copias locales en `static/` (`leaflet.js`,
  `leaflet-src.js`, `leaflet-src.esm.js`) y 4 réplicas en `staticfiles/`.
- **Utils duplicados**: `kudos_app/google_maps_utils.py` y
  `kudos_app/utils/google_maps_utils.py` conviven (5 546 bytes cada uno,
  contenido idéntico).
- **`kudos_app_urls.py` huérfano** en la raíz del repo (no enganchado a
  `ROOT_URLCONF`; pendiente de eliminar).
- **`SECRET_KEY` con fallback inseguro** en `kudos_project/settings.py`.
- **Tests reales = 0** (`kudos_app/tests.py` tiene 10 líneas).
- **`requirements.txt` con dependencias críticas comentadas** (Pillow,
  requests, openai, celery, redis).
- **`full_autopilot`** no apto para producción (bucles, sin rate-limit).
- **Sin login social** (django-allauth no instalado).
- **`legacy_views.py`** (2 160 L) sigue dentro de `kudos_app/` — dormant
  natural, pero debe moverse a `dormant/legacy_views.py` en D13.

## Qué falta para MVP

Reordenado según mandato AXÓN (PUBLIC = 7 sistemas):

1. **Estabilización quirúrgica** (D1–D3 del roadmap AXÓN):
   eliminar duplicados, unificar utils, podar imports muertos, dejar una sola
   copia de Leaflet.
2. **Mapa 5D estable** (D4–D6): clustering, viewport loading, móvil 60 fps.
3. **Refactor de `map.html`** (D7–D9): CSS/JS extraídos a `static/`,
   `map.html` ≤ 200 líneas.
4. **Capsule engine** (D10–D11): flujo marker → popup → detalle → share OG.
5. **Mind Lite** (D12): reducir a 3 prompts (*¿Qué es esto?*, *¿Qué pasó
   aquí?*, *¿Qué ver cerca?*).
6. **Modularización `apps/`** (D13–D14): mover `legacy_views.py` a `dormant/`
   y dejar la estructura preparada; el resto se hace post-MVP.

Bloque pre-AXÓN (mantener en segundo plano):
seguridad (`SECRET_KEY` desde `.env` obligatorio), activación de Pillow y
requests, smoke tests mínimos, login social (allauth), migración a
PostgreSQL antes del despliegue, deploy en Render/Railway.

## Próximo paso exacto

**Eliminar las 6 definiciones duplicadas de `views.py`.**

Es código zombie. La segunda copia gana, por lo que borrarlas no cambia el
comportamiento observable, pero deja la base auditable y permite seguir con
D2 (limpieza de monolito) y D3 (imports muertos) sin minas escondidas.

Antes de tocar cualquier otra cosa:

1. `git checkout -b axon/d1-purge-duplicates`
2. Eliminar las 6 funciones de la lista anterior (ver `AXON_CORE.md §3.2.C`).
3. `python manage.py check` verde.
4. Smoke manual: las 7 URLs PUBLIC responden 200 y al menos 6 rutas DORMANT
   devuelven 404.

Ver `MVP_PROGRESS.md` para el avance por sistema y `BUG_LIST.md` para el
inventario priorizado de bloqueos.

---

## Métricas clave (snapshot)

| Métrica | Objetivo MVP | Valor actual | Δ |
|---|---|---|---|
| Apps Django | 7 (`core`, `maps`, `capsules`, `users`, `search`, `timeline`, `mind`) | 1 (`kudos_app`) | -6 |
| `views.py` líneas | ≤ 2 000 | 2 450 | +450 |
| `models.py` líneas | ≤ 2 000 | 1 114 | OK |
| `urls.py` líneas / rutas | sin objetivo duro | 202 / ~80 | — |
| `map.html` líneas | ≤ 200 | 881 | +681 |
| `legacy_views.py` líneas | mover a `dormant/` | 2 160 (dormant natural) | — |
| Plantillas `.html` | sin objetivo duro | 120 | — |
| Funciones duplicadas | 0 | 6 | +6 |
| Rutas PUBLIC respondiendo 200 | 7 / 7 | pendiente smoke | — |
| Rutas DORMANT respondiendo 404 | 100 % del listado §2 AXON_CORE | pendiente smoke | — |
| Tests automatizados | ≥ 5 smoke | ~0 | — |
| Middleware AXÓN activo | sí | sí ✅ | 0 |
| Feature registry montado | sí | sí ✅ | 0 |
| Nav gated en `base.html` | sí | sí ✅ | 0 |
| Copias Leaflet en `static/` + `staticfiles/` | 1 + 1 | 3 + 4 | +5 |
| Utils `google_maps_utils.py` | 1 archivo | 2 archivos idénticos | +1 |
| Base de datos | PostgreSQL en prod | SQLite | — |

---

## Cambios desde la última actualización

- Confirmado en repo: `kudos_project/features.py`,
  `kudos_project/middleware.py` y `kudos_app/templatetags/feature_tags.py`
  están presentes y referenciados.
- Confirmado en `settings.py`: `DormantRouteMiddleware` montado al final de
  la lista de middleware (L82).
- Confirmado en `base.html`: navegación gated activa (`{% if_feature %}`
  envuelve los enlaces DORMANT; `main-nav` reducido a 7 sistemas PUBLIC).
- Confirmado por inspección: `views.py` mantiene las 6 duplicaciones
  (`ai_chat`, `capsule_versions`, `capsule_version_revert`,
  `capsule_aport_create`, `capsule_aport_validate`, `capsule_dialog`).
- Confirmado por inspección: `map.html` sigue cargando Leaflet desde
  `unpkg.com` en las líneas 4–5 a pesar de existir copias locales.
- Confirmado por inspección: `kudos_app/google_maps_utils.py` y
  `kudos_app/utils/google_maps_utils.py` son réplicas exactas.
- `MVP_PROGRESS.md` añadido al árbol de documentación AXÓN (avance por
  sistema PUBLIC).
- `AXON_C_PATCH.md` añadido como nota lateral del patch en curso.
