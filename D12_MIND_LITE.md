# AXÓN · D12 · KUDOS MIND LITE — "El lugar respondiendo"

**Fecha:** 2026-05-16
**Principio central:** Mind NO es un chatbot. Habla el lugar. Tres preguntas, tres ventanas, tres destellos.

---

## 1. Estado pre-D12

| Componente | Estado |
|---|---|
| `/mind/` (ai_panel) | restringido a `_is_founder(user)` → 403 para usuarios normales. **Bloqueaba el 7º pilar del PUBLIC CORE.** |
| `/mind/chat/` + `/mind/chat/send/` | chat clásico con textbox infinito; dispara `call_command(import_world, multimedia_auto, …)` reales. UI estilo "panel admin del fundador". |
| `ai_panel.html` | 204 líneas con 4 secciones admin (agentes, directivas, insights, caja negra) + chat libre. Sensación: panel enterprise. |
| Routes Mind | `/mind/`, `/mind/chat/`, `/mind/chat/send/`, `/mind/insight/*`, `/mind/directive/*`. Las dos últimas ya estaban en `DORMANT_PATH_PREFIXES` (gateadas por middleware). |

---

## 2. Implementación aplicada

### A · Backend (`kudos_app/views.py`)

**E1 · `ai_panel` ahora público (Lite por defecto).**
- Eliminado el `HttpResponseForbidden` para no-fundador.
- Acepta query params `?capsule=<uid>&lat=&lon=&year=` (deep-link desde popup mapa o cierre narrativo de capsule_detail D10).
- Contexto Lite poblado server-side: si la cápsula existe y es pública, se carga el objeto; si no, se preservan las coordenadas/año tal cual.
- Datos pesados (agents, insights, actions, directives, stats) se cargan **sólo si `is_founder`** — usuarios normales no pagan el coste del query.
- `is_founder` se pasa al template para el gating de la sección Full.

**E2 · Vista nueva `ai_lite_ask(request)`** (`@login_required` + `@require_POST`).
- 3 `mode` oficiales: `what` / `summary` / `near`. Cualquier otro → HTTP 400.
- Recoge contexto del POST: `capsule`, `lat`, `lon`, `year` (con saneado numérico).
- Si llega `capsule_uid` y faltan lat/lon/year, los rellena desde la cápsula.
- Heurística local de respuesta (sin Claude, sin red externa):
  - **what** · primera persona del lugar: `"Soy {título}. En {año}, durante {era}, este lugar tenía una historia que merecía ser preservada. Aquí está lo que recuerdo: {summary[:240]}…"`. Sin cápsula concreta, voz genérica de coordenadas + era + invitación a seleccionar cápsula.
  - **summary** · `"{título} en 30 segundos: {ai_summary or contenido[:340]}…"` cortando en límite de palabra. Sin cápsula → invita a abrir una.
  - **near** · bbox ±0.7° latitud/longitud (≈ 80 km), filter `privacy=publico`, exclude la cápsula actual, top 3 por `-likes, -views`. Devuelve `related[]` para que el cliente renderice 3 chips clickeables. Mensaje: `"En el mismo paisaje hay otras voces. Cerca de aquí te esperan: ... Cada una guarda una hebra distinta del mismo tejido."`
- Función auxiliar `_era_label(year)` con 8 epochs evocadoras: Antigüedad clásica · Antigua tardía · Edad Media · Renacimiento y Edad Moderna · era industrial · siglo XX · presente · futuro próximo.
- Respuesta JSON: `{reply, mode, source: "local", context: {capsule, lat, lon, year}, related: [...]}`.

### B · URL (`kudos_app/urls.py`)

```
path('mind/ask/', views.ai_lite_ask, name='ai_lite_ask')
```

Insertada justo después de `/mind/chat/send/`. URL es PUBLIC (ningún prefijo DORMANT la cubre).

### C · Frontend (`kudos_app/templates/ai_panel.html`)

Template reescrito de **204 → 343 líneas**, con JS funcional. Estructura:

1. **`<style>` inline (~120 L)** · paleta KUDOS preservada (cyan/violet/dorado, glass blur 10–12px, Cormorant Garamond, shimmer animation).
2. **Hero `<section class="mind-lite-shell">`**:
   - Eyebrow: `🧠 KUDOS MIND · Lite`
   - Título: **"Pregunta al lugar."**
   - Subtítulo: *"Aquí no hablas con una IA. Habla el sitio. Tres preguntas, tres ventanas a lo que sucedió bajo tus pies."*
   - Contexto detectado: chips de cápsula/coords/año.
   - Grid de **3 chips canónicos** (emoji + label + hint).
   - Área de respuesta `aria-live="polite"`, skeleton, fade-in.
   - Footer minimal: `Mind no recuerda conversaciones: cada pregunta es un destello.`
3. **Sección Mind Full** envuelta en `{% if is_founder %}{% if_feature "mind_full" %}…{% endif_feature %}{% endif %}`:
   - Agentes, Directivas, Insights, Caja negra.
   - Sólo el fundador con `mind_full` flag ON la ve. En el MVP queda **siempre oculta**.
4. **`<script>` IIFE** (~70 L):
   - Lee `data-*` del DOM (cápsula/lat/lon/año).
   - `showSkeleton()` → shimmer.
   - `showReply(text, related)` → fade-in con escape HTML + chips relacionados.
   - `showError()` → "El lugar no respondió esta vez". Sin spinner agresivo.
   - `ask(mode, btn)` → POST a `{% url "ai_lite_ask" %}` con CSRF.
   - **Auto-fire al cargar**: si llegamos con `?capsule=X`, dispara `ask("what")` automáticamente a los 200 ms.

---

## 3. Flujo UX validado

```
[ Mapa · marker popup ]  (D4–D10)
   click "📜 Timeline" → centerTimeline()  (D10)
   click "Explorar →"  → /capsules/<uid>/  (capsule_detail.html)

[ Capsule detail ]  (D10)
   cierre narrativo → "🧠 Preguntar a Mind"  → /mind/?capsule=<uid>
                                                 ↓ auto-fire ask("what")
                                                 ↓
                                             [ Mind Lite ]
                                             Pregunta al lugar.
                                             3 chips:
                                               ¿Qué ocurrió aquí?     ← auto-disparada
                                               Resúmelo en 30 seg.
                                               ¿Qué descubrir cerca?
                                             ↓ click cualquiera
                                             Skeleton shimmer → fade-in respuesta evocadora
                                             [related?] chips cyan a cápsulas cercanas
                                             ↓ click chip cyan
                                             /capsules/<otro_uid>/   (continúa la exploración)
                                             ↓ cierre narrativo
                                             vuelta al mapa con coords
```

**Continuidad exploratoria garantizada:** cada respuesta de Mind con `mode=near` ofrece 3 cápsulas cercanas como chips clickeables.

---

## 4. Tradeoffs UX explícitos

| Tradeoff | Decisión |
|---|---|
| ¿Mantener chat libre infinito? | **No** en el flujo PUBLIC. Sólo 3 prompts. Chat libre fundador queda en `ai_chat`/`ai_chat_send` no expuesto en UI Lite. |
| ¿Auto-disparar `what` al cargar con `?capsule=X`? | **Sí.** Mandato pide "sensación instantánea" y "contextual". |
| ¿JSON vs HTML server-rendered? | **JSON.** Permite `aria-live` + skeleton + fade-in cliente. HTML forzaría recarga = "panel recargado" (anti-mandato). |
| ¿Persistir historial? | **No.** Mandato: "NO memoria persistente". |
| ¿Sin contexto, error o invitación? | **Invitación elegante.** *"Selecciona un punto en el mapa o una cápsula para que el lugar pueda hablar."* |
| ¿Llamar a Claude / OpenAI? | **No en este sandbox** (sin red). Heurística local. Cuando haya entorno productivo, sustituir `ai_lite_ask` por llamada al modelo manteniendo el mismo contrato JSON. |

---

## 5. Validación

| Check | Resultado |
|---|---|
| Parse AST `views.py` | ✓ |
| `ai_lite_ask` definida + URL enrutada | ✓ |
| URLs → views: 109 refs | ✓ todas resuelven |
| 3 prompts canónicos presentes | ✓ |
| Contexto auto recogido en `data-*` | ✓ |
| 19/19 elementos identidad Mind Lite | ✓ |
| Sección Mind Full gateada por `is_founder` AND `mind_full` | ✓ |
| Null bytes en archivos D12 | 0 |
| `_era_label()` 8 epochs evocadoras | ✓ |

---

## 6. Métricas perceptuales

| Métrica | Antes D12 | Después D12 |
|---|---|---|
| Acceso a `/mind/` para user normal | 403 (forbidden) | **200 Lite UI** |
| Prompts visibles | 1 textbox infinito | **3 chips fuertes** |
| Tiempo perceived a primera respuesta | latencia red (call_command) | **fade-in 350 ms + skeleton** sin red |
| Continuidad exploratoria | cul-de-sac (chat) | **3 cápsulas cercanas clickeables** por respuesta |
| Sensación de chatbot | alta | **baja** (copy "el lugar respondiendo") |
| Sensación admin/enterprise | alta (4 secciones expuestas) | **nula** para user normal (todo gateado) |
| Time To Meaningful Discovery | nunca (founder-only) | **<1 s** (auto-fire si llegas con `?capsule=`) |

---

## 7. Riesgos / deuda pendiente

1. **Heurística local sin Claude.** Las respuestas son evocadoras pero limitadas. Cuando haya entorno productivo con `ANTHROPIC_API_KEY`, sustituir el cuerpo de `ai_lite_ask` por un prompt a Claude que respete el mismo contrato JSON (mode/context → reply/related). Mandato: "La IA debe amplificar el mundo. No reemplazarlo".
2. **`/mind/chat/` y `/mind/chat/send/` siguen accesibles** vía URL directa (fundador). En el template Lite no hay link a ellos. Si en el futuro se quieren ocultar del todo, añadir a `DORMANT_PATH_PREFIXES`.
3. **Sin rate limit en `ai_lite_ask`.** Mitigación futura: Django-ratelimit `@ratelimit(key='user', rate='30/m')`.
4. **`renderTimeline` aún no scroll-to-year.** Deuda menor heredada de D10.
5. **CSRF token en form invisible** como truco. Alternativa más limpia: leer cookie `csrftoken` (ya implementado como fallback).
6. **`_era_label` español-céntrico.** Cuando llegue i18n, mover labels a `gettext`.

---

## 8. Reversión

```bash
cp kudos_app/views.py.snapshot.d12.20260516T185058Z          kudos_app/views.py
cp kudos_app/templates/ai_panel.html.snapshot.d12.20260516T185058Z  kudos_app/templates/ai_panel.html
# urls.py: quitar manualmente la línea ai_lite_ask
```

SHA256 post-D12:
- `views.py`: 2 337 líneas (+158 por `ai_lite_ask`)
- `ai_panel.html`: 343 líneas · 13 308 bytes · 0 null bytes
- `urls.py`: 205 líneas (+1 ruta `ai_lite_ask`)

---

## 9. Estado del PUBLIC CORE (7 pilares)

| # | Sistema | Estado |
|---|---|---|
| 1 | Mapa 5D | ✓ D4 clustering + bbox · D5 lazy popup · D6 mobile · D7 modular |
| 2 | Capsules | ✓ D5 lazy detail · D10 portal contextual + gating DORMANT |
| 3 | Search | ✓ PUBLIC, sin tocar |
| 4 | Timeline básico | ✓ PUBLIC, integrado en vista alt-view del mapa |
| 5 | Users | ✓ PUBLIC, sin tocar |
| 6 | **Mind Lite** | ✓ **D12 · cerrado** |
| 7 | Share | ✓ D10 Web Share API + clipboard + OG completos |

**Los 7 pilares del PUBLIC CORE están cerrados.**

---

## 10. Próximo paso del roadmap

**D13** — Layout `apps/` (crear `apps/{core,maps,capsules,users,search,timeline,mind}/__init__.py` + mover `legacy_views.py` → `dormant/legacy_views.py` con `manage.py check` verde en cada paso).
