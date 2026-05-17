# CURRENT_BLOCKERS.md — KUDOS / AXÓN

Última actualización: 2026-05-15 (auto · daily-status)
Responsable: Eduardo
Criterio: bloqueos **activos** que impiden o frenan el siguiente paso del
roadmap AXÓN (`AXON_CORE.md §5`). Cada bloqueo incluye problema, impacto,
solución, riesgo y prioridad — tal y como pide la regla de proyecto.

Leyenda prioridad: 🟥 P0 (bloquea hoy) · 🟧 P1 (bloquea esta semana) ·
🟨 P2 (bloquea el MVP) · 🟩 P3 (deuda no urgente).

---

## Cola P0 — bloquean hoy

### BLOCKER-AX1 · 6 funciones duplicadas en `views.py` 🟥
- **Problema:** existen dos definiciones de `ai_chat`, `capsule_versions`,
  `capsule_version_revert`, `capsule_aport_create`, `capsule_aport_validate`
  y `capsule_dialog`. En Python la segunda gana, así que el código
  expuesto al enrutador es ambiguo y depende del orden de los imports.
  Localizaciones: `ai_chat` 1540/1628, `capsule_versions` 1989/2332,
  `capsule_version_revert` 2003/2343, `capsule_aport_create` 2052/2368,
  `capsule_aport_validate` 2108/2403, `capsule_dialog` 2156/2431.
- **Impacto:** confunde imports, triplica la superficie de bug y bloquea
  D2/D3 del roadmap AXÓN (no se puede limpiar imports muertos ni
  modularizar mientras existan).
- **Solución:** eliminar las 6 definiciones tempranas. Las "oficiales"
  son las indicadas en `AXON_CORE.md §3.2.C` (la versión inferior se
  conserva, la superior se elimina **para `ai_chat`**; para el resto, se
  elimina la primera y se conserva la segunda).
- **Riesgo:** ninguno funcional (la segunda ya tapa a la primera). Sí
  hay riesgo de diff ruidoso → hacerlo en un commit aislado.
- **Prioridad:** P0. Sin esto no avanza nada más.

### BLOCKER-AX2 · `SECRET_KEY` con fallback inseguro 🟥
- **Problema:** `kudos_project/settings.py` arranca con un valor por
  defecto si la variable de entorno no está definida.
- **Impacto:** comprometería sesiones y firmas si se sube tal cual a
  producción.
- **Solución:** forzar lectura desde `.env`; abortar arranque con error
  claro si falta. `DEBUG` también desde `.env` y default `False`.
- **Riesgo:** si alguien clona sin `.env`, el proyecto no arranca →
  documentar en `INSTRUCCIONES.md` y `.env.example`.
- **Prioridad:** P0 antes de cualquier deploy.

---

## Cola P1 — bloquean esta semana

### BLOCKER-AX3 · `views.py` monolítico (2 450 líneas) 🟧
- **Problema:** todo el comportamiento HTTP vive en un único archivo.
  Imposible auditar imports muertos sin antes purgar duplicados.
- **Impacto:** bloquea D3 (ruff F401), bloquea Fase 6 (estructura
  `apps/`), eleva el coste de cualquier cambio.
- **Solución:** secuencia AXÓN — primero eliminar duplicados
  (BLOCKER-AX1), luego pasar `ruff F401`, luego modularizar.
- **Riesgo:** mover funciones puede romper rutas si los imports no se
  ajustan. Mitigación: smoke test antes y después de cada paso.
- **Prioridad:** P1.

### BLOCKER-AX4 · `map.html` de 881 líneas con CSS+JS inline 🟧
- **Problema:** una plantilla gigante con styles y scripts inline. No se
  cachea, no se versiona, no se audita.
- **Impacto:** bloquea Fase 2 (clustering) y Fase 3 (refactor JS). Es
  el cuello de botella de rendimiento móvil del MVP.
- **Solución:** plan AXÓN D7–D8 — extraer a `static/css/map5d.css` y a
  `static/js/map5d/{core,markers,timeline,search,galaxy}.js`. Objetivo:
  `map.html` ≤ 200 líneas.
- **Riesgo:** romper el bootstrap del mapa. Mitigación: extraer por
  capas y validar con smoke manual entre capas.
- **Prioridad:** P1.

### BLOCKER-AX5 · Leaflet por CDN + 3 copias locales no usadas 🟧
- **Problema:** `map.html` carga Leaflet desde CDN; `static/` mantiene
  tres copias locales (`leaflet-src*.js`) que no se sirven.
- **Impacto:** dependencia de red para el sistema #1, peso muerto en
  `staticfiles`, ambigüedad sobre cuál es la versión "oficial".
- **Solución:** dejar **un solo** `static/leaflet/leaflet.js` local,
  enlazar desde `map.html` con `{% static %}`, borrar las otras dos
  copias. AXÓN D2.
- **Riesgo:** versión local distinta a la del CDN puede cambiar
  comportamiento. Mitigación: alinear versión con la del CDN antes de
  borrar.
- **Prioridad:** P1.

### BLOCKER-AX6 · Tests reales = 0 🟧
- **Problema:** `kudos_app/tests.py` tiene 10 líneas. No hay forma de
  detectar regresiones al ejecutar la cirugía AXÓN.
- **Impacto:** cada commit del roadmap es ciego.
- **Solución:** suite smoke mínima — `/`, `/dashboard/`, `/map/`,
  `/search/`, `/timeline/`, `/capsules/`, `/accounts/login`. Más una
  prueba que verifique que 3 rutas DORMANT devuelven 404.
- **Riesgo:** test "verde" no garantiza calidad, pero garantiza que el
  servidor arranca y que el gating funciona.
- **Prioridad:** P1 (debería caer dentro de Fase 1).

---

## Cola P2 — bloquean el MVP, no la semana

### BLOCKER-AX7 · `requirements.txt` con dependencias críticas comentadas 🟨
- **Problema:** Pillow, requests, openai, celery, redis están
  comentados.
- **Impacto:** Pillow rompe cualquier flujo de imagen (incluido
  `capsule_detail`); requests rompe imports externos (Wikipedia,
  Wikimedia).
- **Solución:** descomentar `Pillow` y `requests`. Dejar `openai`,
  `celery`, `redis` comentadas hasta que estén realmente integradas.
- **Riesgo:** instalar Pillow en algunos hosts requiere libjpeg/zlib.
  Mitigación: documentar en `DESPLIEGUE.md`.
- **Prioridad:** P2.

### BLOCKER-AX8 · `full_autopilot` no apto para producción 🟨
- **Problema:** lanza bucles 24/7 sin rate-limit ni circuit breaker.
- **Impacto:** saturaría el dyno de Render/Railway en horas.
- **Solución:** convertir a tarea programada (APScheduler o cron) con
  límite de iteraciones, jitter y logs.
- **Riesgo:** quien lo lance sin saber convierte la cuenta gratis en
  bloqueada. Mitigación: deshabilitar por defecto en producción.
- **Prioridad:** P2.

### BLOCKER-AX9 · Utils duplicados `google_maps_utils.py` 🟨
- **Problema:** existen `kudos_app/google_maps_utils.py` y
  `kudos_app/utils/google_maps_utils.py`.
- **Impacto:** cualquier cambio puede ir al archivo equivocado.
- **Solución:** AXÓN D2 — mantener el de `utils/`, eliminar la copia
  hermana.
- **Riesgo:** alguien importa el archivo raíz. Mitigación: `grep -r`
  antes de borrar.
- **Prioridad:** P2.

### BLOCKER-AX10 · Login social no implementado 🟨
- **Problema:** ningún proveedor OAuth está conectado.
- **Impacto:** según project plan, MVP exige Google (y al menos uno
  más). Hoy solo hay login Django nativo.
- **Solución:** instalar `django-allauth`, configurar Google primero
  (más sencillo), añadir `SocialApp` con credenciales en `.env`.
- **Riesgo:** depende de credenciales de Google Cloud (cuota, consent
  screen). Mitigación: empezar con app "External · Testing" para no
  esperar verificación.
- **Prioridad:** P2 (no entra en la cirugía AXÓN; sí en el MVP).

---

## Cola P3 — deuda no urgente

### BLOCKER-AX11 · DB SQLite en producción 🟩
- **Problema:** sin `DATABASE_URL`, `db.sqlite3` se usaría en prod.
- **Solución:** forzar PostgreSQL antes del despliegue público
  (`dj-database-url` y `psycopg2-binary` ya están en `requirements`).
- **Prioridad:** P3 hasta que toque el deploy.

### BLOCKER-AX12 · `README.md` desactualizado 🟩
- **Problema:** la portada no refleja la arquitectura AXÓN ni los 7
  sistemas PUBLIC.
- **Solución:** refrescar tras taggear `v0.9-axon-core`.
- **Prioridad:** P3.

### BLOCKER-AX13 · Plantillas sin sistema de diseño 🟩
- **Problema:** 114 templates sin parciales base ni guía de estilo.
- **Solución:** posterior al MVP, no antes.
- **Prioridad:** P3.

---

## Cola desbloqueada hoy (cerrados / resueltos)

- **AXÓN gating en producción interna.** `DormantRouteMiddleware` ya está
  montado en `settings.py` (línea 82). `features.py` y `feature_tags.py`
  presentes. `base.html` con navegación gated. → desbloquea Fase 1 y abre
  el camino a las 7 PUBLIC URLs limpias.
- **`db.sqlite3` y `__pycache__` están en `.gitignore`.** Ya no se
  versionan accidentalmente.

---

## Decisiones pendientes de input

(Heredadas de `AXON_CORE.md §8`)

1. ¿Aplicar de forma automática la limpieza de duplicados (BLOCKER-AX1)
   o entregar como patch revisable?
2. ¿Esperar a tener smoke tests antes de tocar `views.py` o ejecutar
   cirugía + tests en el mismo PR?
3. ¿Integrar Lighthouse en CI o solo manual hasta `v0.9-axon-core`?

> Mientras no se decidan, la cola sigue: BLOCKER-AX1 → AX2 → AX6 → AX5 →
> AX4 → AX3 (modularización progresiva, post-Mapa Core).
