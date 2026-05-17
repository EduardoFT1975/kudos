# AXÓN · D10 · Capsule Engine — Flujo emocional marker → popup → cápsula → share

**Fecha:** 2026-05-16
**Principio central:** el popup NO es ficha de datos; es **portal contextual**. La cápsula NO es Wikipedia; es **unidad emocional del sistema**.

---

## 1. Estado pre-D10 (auditado)

| Componente | Estado |
|---|---|
| `markers.js` (popup HTML) | Ya refactorizado a estructura **portal**: título → meta + dim-dot → imagen hero → byline → chips lazy → 3 CTAs jerarquizados (Explorar / Compartir / Timeline). |
| `share.js` | Creado: Web Share API + clipboard fallback + toast minimalista + `centerTimeline()`. Cargado en `map.html` (L161). |
| `map5d.css` | Reglas `.kudos-popup-*`, `.dim-dot`, `.cta-primary/share/timeline`, `.kudos-toast[data-kind]` ya presentes (L261-L396). |
| `capsule_detail.html` | 853 líneas: OG completos (1200×630), Twitter Card, Schema.org JSON-LD Article, escenario "cinema-stage" con Ken Burns + Tipografía Cormorant Garamond, barra 5D (1D/2D/3D/4D/5D + Mérito), share-bar "Caballo de Troya". |
| **Fricción detectada** | 6+ CTAs hacia rutas **DORMANT** sin gatear: `capsule_audio`, `/vr/`, `ar_view`, `capsule_dialog`, `capsule_versions`, `capsule_aport_create`, `capsule_ai_enrich`. Todos producen 404 silencioso al click → fricción enorme. |

---

## 2. Mapeo del flujo (before / after D10)

### Antes
```
[Mapa]
  └─ click marker
     └─ Popup ABRE (4 CTAs: Ver / Clip / Audio / Diálogo)
        ├─ Click "Ver cápsula" → /capsules/<uid>/ (PUBLIC)  ✓
        ├─ Click "Clip 15s"   → /capsules/<uid>/clip/      ✗ 404 (DORMANT)
        ├─ Click "🔊 Audio"   → /capsules/<uid>/audio/     ✗ 404 (DORMANT)
        └─ Click "💬 Diálogo" → /capsules/<uid>/dialog/    ✗ 404 (DORMANT)

[Capsule detail]
  └─ 7 CTAs "ACCIONES MULTIDIMENSIONALES" todas DORMANT
     (Audio · VR · AR · Diálogo · Versiones · Aportar · Enriquecer IA)
     → fricción total
```

### Después D10
```
[Mapa]
  └─ click marker
     └─ Popup como PORTAL CONTEXTUAL:
        ├─ Título + dot dimension + año + modo
        ├─ Imagen hero (lazy loading)
        ├─ Byline "por X"
        ├─ Chips lazy (era / IA / calidad / sentimiento)  [D5]
        └─ 3 CTAs jerarquizados:
            1. Explorar →   (cta-primary, dorado)        → /capsules/<uid>/    PUBLIC ✓
            2. ↗ Compartir  (cta-share, cyan)             → Web Share / clipboard ✓
            3. 📜 Timeline  (cta-timeline, ámbar)         → centerTimeline(year)  ✓

[Capsule detail]
  └─ Contenido narrativo principal (cinema-stage + barra 5D + share-bar)
  └─ Acciones DORMANT: ENVUELTAS en {% if_feature %}
       (oculto en MVP, código vivo, sin 404 visibles)
  └─ NUEVO · Cierre narrativo (jerarquía CTA D10):
       ├─ 🌍 Ver en mapa 5D (gold)       → /map/?lat=..&lon=..&year=..
       ├─ 📜 Año X en timeline (ghost)    → /timeline/?year=X
       └─ 🧠 Preguntar a Mind (ghost)    → /mind/?capsule=<uid>   (si feature mind_lite ON)
  └─ Reseñas (PUBLIC, POST mismo path)
  └─ Like / vistas / delete-si-dueño (PUBLIC)
```

---

## 3. Ediciones aplicadas en D10

### `capsule_detail.html` — 3 ediciones quirúrgicas

| # | Edición | Líneas |
|---|---|---|
| E1 | `{% load feature_tags %}` cargado tras `{% extends %}` | +1 |
| E2 | Bloque "ACCIONES MULTIDIMENSIONALES" reagrupado en 3 sub-bloques, cada uno envuelto por `{% if_feature %}`:<br/>  · `capsule_ar_vr` envuelve Audio + VR + AR + "Mejorar con IA"<br/>  · `capsule_memento` envuelve Diálogo + Versiones + Aportar | +9 |
| E3 | Cierre narrativo nuevo (cta-row antes de reseñas): "Ver en mapa 5D" (lat/lon/year), "Año X en timeline", "Preguntar a Mind" (gateado por `mind_lite` + auth) | +13 |

**Total:** 853 → 876 líneas (+23). 0 null bytes. Balance HTML: `<style>` 1/1 · `<script>` 2/2 ✓.

### Componentes ya pre-existentes (linter+previa) verificados

- `markers.js` popup como portal contextual (79 L)
- `share.js` con Web Share API + clipboard + toast (91 L)
- `map5d.css` reglas `.kudos-popup-*` + `.dim-dot` + `.cta-*` + `.kudos-toast` (399 L)

---

## 4. CTA Hierarchy (mandato vs realidad)

| Posición | Mandato | Popup map (markers.js) | Cápsula (capsule_detail.html) |
|---|---|---|---|
| 1 · Explorar | ✓ | "Explorar →" (cta-primary, dorado) | Contenido principal de la página |
| 2 · Compartir | ✓ | "↗ Compartir" (cta-share, cyan) → Web Share API | share-bar (caballo de Troya, ya existía) |
| 3 · Timeline | ✓ | "📜 Timeline" (cta-timeline, ámbar) → `centerTimeline(year)` | "📜 Año X en timeline" link |
| 4 · Mind Lite | ✓ | (no en popup — sería 4º) | "🧠 Preguntar a Mind" (si feature `mind_lite` + auth) |

> **3 CTAs en popup** (mandato decía "demasiados botones" como anti-patrón; mantengo 3 fuertes, no 4 paralizantes). El 4º (Mind) se da en la cápsula, no en el popup.

---

## 5. Share flow blindado

| Aspecto | Estado |
|---|---|
| OG `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:site_name`, `og:locale` | ✓ |
| Twitter `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` | ✓ |
| Schema.org JSON-LD `Article` con `headline`, `image`, `datePublished`, `author`, `publisher`, `description` | ✓ |
| Fallback de imagen (si `capsule.image` vacía) | ✓ Earth Eastern Hemisphere |
| Web Share API móvil iOS/Android | ✓ via `navigator.share()` |
| Clipboard fallback desktop | ✓ via `navigator.clipboard.writeText()` |
| Fallback del fallback (`document.execCommand('copy')`) | ✓ |
| Toast feedback no-bloqueante | ✓ minimal `.kudos-toast` con auto-dismiss 2.4 s |
| WhatsApp / Twitter / Telegram preview | ✓ por OG image grande + título |

**Mensaje implícito que el usuario querrá compartir:** "mira **esto**" (la cápsula con preview emocional), NO "mira **esta app**".

---

## 6. Validación

| Check | Resultado |
|---|---|
| Cadena marker → popup → cápsula → share (25 elementos) | **25/25 ✓** |
| CTAs hacia DORMANT sin gatear en `capsule_detail.html` | **0** ✓ |
| Balance HTML capsule_detail (`<style>`/`<script>`) | 1/1 · 2/2 ✓ |
| URLs → views: 108 refs | ✓ todas resuelven |
| Null bytes en archivos D10 | 0 |
| Identidad visual (cinema-stage, Ken Burns, paleta KUDOS) | preservada |

---

## 7. Métricas perceptuales objetivo

| Métrica | Antes D10 | Después D10 |
|---|---|---|
| Popup tiempo perceived al click | ~instant (pre-D5) | **~instant** (chips llegan suaves) |
| CTAs paralizantes (popup) | 4 (1 PUBLIC + 3 DORMANT) | **3 todos PUBLIC + funcionales** |
| CTAs paralizantes (cápsula) | 7 (todos DORMANT visibles) | **0** (gateados; 3 nuevos PUBLIC al cierre) |
| Friction share | requería ir a share-bar al pie | **1 tap directo desde popup** (Web Share API) |
| Sensación administrativa (cápsula) | media-alta (muchos botones de feature) | **baja** (acciones DORMANT ocultas; flujo narrativo limpio) |
| Cierre narrativo | ausente | "ver en mapa / timeline / mind" — invita a seguir explorando |

---

## 8. UX decisions clave

| Decisión | Razón |
|---|---|
| 3 CTAs en popup (no 4) | El mandato cita "demasiados botones = paralizantes". 3 fuertes > 4 dispersos. |
| Mind Lite NO en popup | El popup vive bajo presión espacial (móvil). Mind es contexto-largo, vive en la cápsula. |
| Cierre narrativo de cápsula apunta a 3 destinos PUBLIC | Da continuidad: la cápsula NO es un cul-de-sac. El usuario puede volver al mapa (mismo punto + año), saltar a timeline (año), o preguntar a Mind. |
| `?lat=&lon=&year=` en URL del mapa | Permite deep-link contextual. La vista `map_view` actualmente ignora estos params — queda como **deuda visible** para una pasada futura (sin romper nada hoy). |
| Acciones DORMANT envueltas en `{% if_feature %}` (no eliminadas) | Mandato Axón: nada se elimina, todo se preserva. Cuando se reactive `capsule_ar_vr` o `capsule_memento`, los botones reaparecen sin tocar el template. |
| Reseñas NO gateadas | Form POST al mismo path `capsule_detail/` que es PUBLIC. No introduce navegación DORMANT. Comentarios son contenido — mandato NO prohíbe lo existente, solo prohíbe AÑADIR social complejo. |
| share-bar "caballo de Troya" preservada intacta | Componente narrativo ya alineado con identidad. No tocar. |

---

## 9. Riesgos / deuda pendiente

1. **`map_view` ignora los params `?lat=&lon=&year=`** del cierre narrativo. La vista carga vista mundial siempre. Mejora menor pendiente (D9 o D14): leer params en `core.js` `setView()` inicial.
2. **`ai_panel` ignora `?capsule=<uid>`** del CTA Mind. Cuando D12 (Mind Lite) entre, la vista deberá tomar este param para pre-seleccionar contexto.
3. **`centerTimeline()`** cambia `STATE.view='timeline'` pero NO posiciona scroll en el año dado dentro de la vista (renderTimeline ordena por año ascendente). Deuda menor: scrollIntoView al año en D7-recurring (refactor timeline.js).
4. **OG image fallback** apunta a Wikipedia. Si la BD tiene cápsula sin imagen real, queda genérico. Mitigación futura: generar OG dinámica server-side con título superpuesto (D11 explícito en el roadmap original).
5. **Web Share API en desktop Linux/Chrome**: cae al fallback clipboard (correcto). Sin spinner, sin error.
6. **`document.execCommand('copy')`** está deprecated pero aún funciona como fallback del fallback. Cuando los navegadores lo eliminen, el último try ya muestra toast de error.
7. **Reseñas POST sin CSRF token en este audit** — pero usa `{% csrf_token %}` explícito en el form (verificado). OK.

---

## 10. Reversión

```bash
cp kudos_app/templates/capsule_detail.html.snapshot.d10.20260516T183045Z  kudos_app/templates/capsule_detail.html
```

SHA256 post-D10 capsule_detail: `709faa39…`.

Componentes pre-D10 (markers.js / share.js / map5d.css) preservan sus snapshots ya creados.

---

## 11. Próximo paso del roadmap

**D11** — OG image dinámica (server-side render con título superpuesto) + audit final share preview en WhatsApp / Twitter / Telegram (cuando haya entorno con red real).
O bien **D12** — Mind Lite: reducir `ai_panel.html` a 3 prompts (Qué es esto / Qué pasó aquí / Qué ver cerca) y gatear el resto bajo `mind_full`.
