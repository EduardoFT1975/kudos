# AXÓN · D5 · Interacción del mapa — Lazy popups + Cache-Control

**Fecha:** 2026-05-16
**Reglas UX vigentes:** no convertir el mapa en frontend reactivo vacío · sin spinner feo · sin parpadeo · expansión suave · densidad emocional inmediata.

---

## 1. Baseline (post-D4, pre-D5)

### Backend · `api_capsules_5d`
- 14 campos por cápsula: `uid, titulo, lat, lon, altitud, modo, dimension, era, year, autor, image, ai_enriched, sentiment, quality`.
- Tamaño JSON por cápsula: ≈ 250 bytes.
- Sin Cache-Control: cada pan/zoom dispara una request idéntica si se repite el bbox.

### Frontend · `map.html`
- Popup HTML pre-bound al crear el marker. Contiene título, year, modo, dimension, autor, imagen, CTAs.
- Tooltip pre-bound al crear el marker. Contiene título, modo, year, imagen thumb.
- 0 requests adicionales al abrir el popup — todo el contenido viene del payload inicial.
- Resultado: el popup abre instant, pero el payload inicial carga 5 campos que no se renderizan en ningún punto del flujo visible (`altitud`, `era`, `sentiment`, `quality`, `ai_enriched`).

### Snapshots y SHA pre-D5

| Archivo | SHA256 | Líneas |
|---|---|---|
| `views.py` | `add5caf8…` | 2 151 |
| `urls.py`  | `2bd1a015…` | 202 |
| `map.html` | `23fd0020…` | 928 |

---

## 2. Implementación aplicada

### A) Backend — slim + light endpoint + Cache-Control

**A1.** `api_capsules_5d.capsules.append({...})` slim a **9 campos** (uid, titulo, lat, lon, modo, dimension, year, autor, image). Eliminados del payload inicial: `altitud, era, sentiment, quality, ai_enriched`.

**A2.** Nuevo `api_capsule_light(request, uid)` que devuelve la metadata extendida:

```python
{
  'uid': ..., 'era': ..., 'altitud': ...,
  'ai_enriched': bool, 'sentiment': float, 'quality': float
}
```

Privacy enforced: si la cápsula es privada y el usuario no es el dueño → 403.

**A3.** Cache-Control:

| Endpoint | Header | Condición |
|---|---|---|
| `api_capsules_5d` | `Cache-Control: public, max-age=60` | sólo si `bbox_active` (viewport querying) |
| `api_capsule_light` | `Cache-Control: public, max-age=60` | siempre |
| `capsule_detail`, mutations, profile, auth | — | **no** se modifica |

**A4.** URL nueva en `kudos_app/urls.py:41`:
```
path('api/capsules/<str:uid>/light/', views.api_capsule_light, name='api_capsule_light')
```
La URL queda en el bloque `api/capsules/*` que el middleware AXÓN considera PUBLIC (no DORMANT).

### B) Frontend — popup lazy hydratado

**B1.** CSS de chips lazy añadido en `<style>` (placeholder oculto con `opacity: 0` → `0.35s ease` a `1`):

```css
.lazy-meta { margin-top:6px; min-height:18px; opacity:0; transition:opacity .35s ease; ... }
.lazy-meta.lazy-loaded { opacity: 1; }
.lazy-meta .chip { font-size:.78em; padding:2px 6px; border-radius:4px; ... }
```

**B2.** En el popup HTML del marker, antes de los CTAs, se inserta:
```html
<div class="lazy-meta" data-uid="${c.uid}"></div>
```
El `min-height: 18px` reserva el espacio → **sin reflow** cuando llegan los chips.

**B3.** `marker.bindPopup(html); marker.on('popupopen', ev => hydrateLight(ev.popup, c.uid))`.

**B4.** Función `hydrateLight()` con cache cliente (`_LIGHT_CACHE = new Map()`):
- Si la cápsula ya fue consultada en la sesión → render instant desde cache (0 ms, 0 requests).
- Si no → fetch `/api/capsules/<uid>/light/`, parsear, generar chips:
  - `🏺 era` (cuando aplica)
  - `✨ IA` (si `ai_enriched`)
  - `⭐ quality*100` (si > 0)
  - `😊 / 😔 sentiment` (cuando `|sentiment| > 0.05`)
- Al inyectar chips: `meta.classList.add('lazy-loaded')` → fade-in 350 ms.
- En error/red lenta: no se muestra nada; el popup conserva su contenido base (sin spinner feo).

---

## 3. Métricas before / after

### Payload inicial del bbox (`api_capsules_5d`)

| Métrica | Antes (D4) | Después (D5) | Δ |
|---|---|---|---|
| Campos por cápsula | 14 | **9** | -35.7 % |
| Bytes JSON / cápsula | ≈ 250 | **≈ 160** | -36 % |
| Payload z=3 mundial (limit=250) | ≈ 62.5 KB | **≈ 40 KB** | -36 % |
| Payload z=7 país (limit=500) | ≈ 125 KB | **≈ 80 KB** | -36 % |
| Payload z=11 ciudad (limit=1200) | ≈ 300 KB | **≈ 192 KB** | -36 % |

> Aplicado encima del recorte de D4: el payload total respecto al baseline pre-D4 cae ahora **97 %** en z=3 mundial.

### Requests por interacción

| Interacción | Antes (D4) | Después (D5) |
|---|---|---|
| Cargar mapa | 1 (bbox) | 1 (bbox slim) |
| Pan corto (mismo viewport) | 1 nuevo fetch | **0** (HTTP cache 60 s) |
| Pan largo (nuevo viewport) | 1 fetch | 1 fetch |
| Abrir popup primera vez | 0 | 1 (`/light/`) |
| Re-abrir el mismo popup | 0 | **0** (cache cliente `_LIGHT_CACHE`) |
| Pan después de abrir 10 popups | 1 | 1 (bbox); los `/light/` están cacheados |

### Tiempo perceived popup-open

| Fase | Antes | Después |
|---|---|---|
| Click → popup HTML visible (título, year, modo, autor, imagen, CTAs) | ~0 ms | ~0 ms (idéntico, popup pre-bound) |
| Chips meta visibles (era, IA, calidad, sentimiento) | ~0 ms (en payload) | **fade-in 350 ms desde fetch (60–120 ms LAN)** |
| **Time To First Content** | **instantáneo** | **instantáneo** (chips son enriquecimiento) |

> Mandato `<150 ms perceived popup-open`: ✓ logrado porque el popup abre INSTANT con el contenido principal. Los chips llegan como capa enriquecedora suave, no como contenido bloqueante.

---

## 4. Identidad visual preservada (auditada 17/17)

Leaflet motor · MarkerCluster · listener viewport · `hue-rotate(190deg)` · slider temporal · Timeline · Galaxy · CTAs (Ver cápsula / Clip 15s / Audio / Diálogo) · autor en payload · placeholder lazy · cache cliente · listener popup · paleta KUDOS conservada en chips (`#d4af37` ámbar / `#00f0ff` cyan / `#10b981` verde / `#ff00d4` magenta).

Sin parpadeos: `min-height:18px` reserva el espacio antes del fade-in.

---

## 5. Validación

| Check | Resultado |
|---|---|
| Parse AST `views.py` | ✓ |
| Parse AST `urls.py` | ✓ |
| Null bytes en los 3 archivos | 0 / 0 / 0 |
| URLs → views refs (108) | ✓ 0 sin resolver |
| `api_capsule_light` definida y enrutada | ✓ |
| Identidad visual (17 puntos) | ✓ 17/17 |
| Cache-Control aplicado solo en bbox / light | ✓ |
| Privacy en `api_capsule_light` (privada → 403) | ✓ |

### Incidente resuelto
La primera aplicación de la nueva ruta en `urls.py` vía `Edit` produjo **truncado del archivo** (200 líneas con la última cortada a mitad de string, perdiendo `personal_habit_toggle` y el cierre `]`). Detectado por `ast.parse` → `SyntaxError: unterminated string literal`. Restaurado desde snapshot y re-aplicado vía `str.replace` atómico. Resultado final: 203 líneas, parse OK, sin null bytes.

---

## 6. UX tradeoffs

| Tradeoff | Decisión |
|---|---|
| ¿Ocultar `autor` también para slim agresivo? | **No.** `renderTimeline` lo necesita y la regla prohíbe tocar Timeline visualmente. |
| ¿Mostrar spinner mientras llega `/light/`? | **No.** Mandato: "NO spinner feo". El popup ya está poblado con título/imagen/CTAs. Los chips son enriquecimiento. |
| ¿Cache `/light/` con `max-age=300`? | **60 s.** Compromiso entre eficacia y frescura (sentiment puede cambiar con ediciones). |
| ¿`max-age=60` también en `capsule_detail`? | **No.** Página HTML completa, podría incluir contenido user-specific (likes propios, etc.). Out of scope D5. |
| ¿Cargar `/light/` eager al hover del marker? | **No.** Mandato: lazy on-click. El hover usa el tooltip ya pre-bound. |

---

## 7. Riesgos pendientes

1. **`renderTimeline` y `renderGalaxy`** todavía esperan `c.autor` en el payload. Como `autor` se mantiene en la API, ambas vistas siguen 100 % funcionales. Si en futuras pasadas se aligera más el payload (drop `autor`), habrá que hidratar Timeline también.
2. **`Cache-Control` y filtros user-specific.** El endpoint `api_capsules_5d` no expone contenido privado (filtra por `privacy='publico'`), por lo que `public` es correcto. Cualquier filtro futuro que dependa de `request.user` necesitaría header `private` o `Vary: Authorization` para evitar contaminar caches intermedios.
3. **`_LIGHT_CACHE` cliente** sin TTL — vive lo que la sesión del navegador. Si se necesita refresh forzado, recargar la página o invalidar vía `_LIGHT_CACHE.delete(uid)`.
4. **`map.html` zona huérfana** (líneas posteriores al primer `</script>`) sigue presente y no afectada (deuda pre-existente documentada en D4). Sigue pendiente para D7.
5. **`popup._contentNode`** es API interna de Leaflet. Funciona desde 1.x, pero un upgrade mayor podría romperlo. Mitigación: hay fallback a `document.querySelector` global.

---

## 8. Reversión

```bash
cp kudos_app/views.py.snapshot.d5.20260516T083243Z              kudos_app/views.py
cp kudos_app/urls.py.snapshot.d5.20260516T083243Z               kudos_app/urls.py
cp kudos_app/templates/map.html.snapshot.d5.20260516T083243Z    kudos_app/templates/map.html
```

SHA256 post-D5:
- `views.py`: `345e37d0…`
- `urls.py`:  `5cca9427…`
- `map.html`: `45881537…`

---

## 9. Próximo paso del roadmap

D6 — Estabilidad móvil: viewport meta correcto, `tap: true` Leaflet, audit touch-pan, target Lighthouse Mobile Performance ≥ 80.
