# FEATURE GATE AUDIT · 2026-05-21

Auditoría automatizada del FEATURE GATED SYSTEM de KUDOS / AXÓN.
Ejecutada como **scheduled task `feature-gate-audit`** (modo autónomo).

**Alcance solicitado:**

- features ocultas
- rutas públicas accidentales
- navegación contaminada

**Fuente de verdad:** `kudos_project/features.py`
**Enforcement:** `kudos_project/middleware.py::DormantRouteMiddleware` (registrado en `settings.py:86`).
**Auditoría previa:** `FEATURE_GATE_AUDIT_20260519.md` (delta incluido en §6).

---

## 1. ESTADO GENERAL — VERDE con sangrado en home

El gating estructural sigue **funcionando**:

- `DormantRouteMiddleware` registrado (`settings.py:86`).
- 7 features PUBLIC CORE activas en `_PUBLIC_CORE` (mapa 5D, capsules, search, timeline_lite, users, mind_lite, share).
- 38 features `_DORMANT`, todas a `False`. Override por entorno `KUDOS_FEATURE_<NAME>=1` operativo.
- 76 rutas dormant cubiertas por `DORMANT_PATH_PREFIXES` (40 prefijos) o `DORMANT_PATH_REGEX` (cápsulas AR/VR/versions/memento). **Cero rutas dormant escapan al middleware** (verificación cruzada automatizada urls.py × features.py).
- `ALWAYS_ALLOWED_PREFIXES` sin fugas (admin, auth, static, media, API públicas del mapa, API place-capsule).

El problema real persiste como en el audit del 19-may: **navegación contaminada en templates PUBLIC**. El usuario no llega a las dormant (middleware → 404), pero las **ve** y las **clica**. 25 enlaces dormant todavía sin guard `{% if_feature %}` — concentrados en `home.html` (16) y `dashboard.html` (5).

---

## 2. FEATURES OCULTAS — registro consistente

Sin hallazgos.

- 38 features dormant declaradas en `_DORMANT` (vs. 35 en el audit anterior — crecimiento esperado: registro más exhaustivo).
- Todas con flag `False`.
- `is_enabled()` consulta env override antes del flag estático.
- No hay flags huérfanas referenciadas en código que no existan en `FEATURES` (no se detectaron `is_enabled("<nombre_inexistente>")`).

---

## 3. RUTAS PÚBLICAS ACCIDENTALES — 1 hallazgo

### 3.1 · DUPLICADO de URL pattern `mind/chat/` (BAJO · sin cambios desde audit anterior)

`kudos_app/urls.py`:

```
línea 188: path('mind/chat/', views.ai_chat, name='ai_chat'),
línea 195: path('mind/chat/', views.ai_chat, name='ai_chat'),
```

- **Problema:** el mismo `name='ai_chat'` registrado dos veces. Ruido en `reverse()` y en `manage.py show_urls`.
- **Impacto:** funcional. Django usa el primero. Sólo confunde debugging.
- **Solución:** eliminar la línea 195.
- **Riesgo:** ninguno.
- **Prioridad:** BAJA.

### 3.2 · Rutas dormant — cobertura íntegra

Verificación automatizada (`urls.py × DORMANT_PATH_PREFIXES + DORMANT_PATH_REGEX`):

- 76 rutas con prefijo dormant: **todas bloqueadas**.
- 4 sub-rutas regex de cápsula (`/capsules/<uid>/{ar,audio,vr,clip,enrich,versions,aport,dialog}` + `memento.json`): **todas bloqueadas**.
- 0 rutas dormant filtradas a producción.

### 3.3 · Regresión positiva desde 19-may

`path('', views.home, name='home')` (urls.py:17) ha sido **revertido** desde el parche debug que apuntaba a `healthcheck`. Buen estado. El comentario in-line (líneas 14-16) instruye explícitamente no volver a ocultarlo — recomendación cumplida.

---

## 4. NAVEGACIÓN CONTAMINADA — 25 enlaces dormant sin guard (7 templates PUBLIC)

Detección automatizada con scanner de profundidad (cuenta `{% if_feature %}` ↔ `{% endif_feature %}` por línea/tokens, soporta guards inline). Solo se reportan url-tags `{% url 'X' %}` con `X` ∈ feature dormant **y** profundidad de guard = 0 en ese punto.

### 4.1 · `kudos_app/templates/home.html` — CRÍTICO (16 leaks, +3 vs 19-may)

| Línea | URL name | Dormant feature |
|-------|----------|-----------------|
| 39 | `feed` | feed_social |
| 91 | `social` | social_spaces |
| 97 | `wisdom_repository` | wisdom |
| 103 | `global_consciousness` | congress |
| 197 | `wisdom_repository` | wisdom |
| 198 | `marketplace` | marketplace |
| 199 | `global_consciousness` | congress |
| 200 | `space_exploration` | space_exploration |
| 201 | `sports_competitions` | sports |
| 202 | `mental_health` | mental_health |
| 203 | `spirituality` | spirituality |
| 204 | `art_festival` | art_festival |
| 205 | `future_simulator` | future_simulator |
| 206 | `kudos_legacy` | kudos_legacy |
| 207 | `social` | social_spaces |
| 208 | `assistant_characters` | assistant_characters |

- **Problema:** la página de aterrizaje muestra 16 destinos rotos en megacards/tiles. L197-208 es el bloque "Explora todos los módulos" — un escaparate completo de features dormant.
- **Impacto:** primer impacto post-login = 16 enlaces que 404ean. Esto es anti-MVP, destruye Time To Awe.
- **Solución (mínima):** envolver cada `<a>` en `{% if_feature "<flag>" %}…{% endif_feature %}`. Más limpio: eliminar el bloque "Explora todos los módulos" entero (L196-209) hasta que haya features que mostrar; del bloque megacard (L88-110) gatear individualmente.
- **Riesgo:** si el grid queda vacío en L196-209, colapsar el contenedor con CSS o quitar el `<section>`.
- **Prioridad:** **ALTA**. Es el primer pixel del MVP.

### 4.2 · `kudos_app/templates/dashboard.html` — ALTO (5 leaks, sin cambios)

| Línea | URL name | Dormant feature |
|-------|----------|-----------------|
| 19 | `create_proposal` | congress |
| 20 | `mental_health` | mental_health |
| 21 | `export_capsules` | export |
| 79 | `achievements` | achievements |
| 88 | `mental_health` | mental_health |

- **Problema:** los 3 atajos del header (L19-21) y dos referencias al final (L79, L88) llevan a 404.
- **Impacto:** destino tras login → `control_panel`. Mismo daño que home.
- **Solución:** envolver cada `<a>` o el bloque entero en `{% if_feature %}`.
- **Prioridad:** **ALTA**.

### 4.3 · `kudos_app/templates/onboarding.html` (BAJO, sin cambios)

L40: `<a href="{% url 'global_consciousness' %}">Ver propuestas</a>`

- **Solución:** guard `{% if_feature "congress" %}` o reemplazar CTA por `{% url 'map' %}`.
- **Prioridad:** BAJA (pre-login, baja frecuencia).

### 4.4 · `kudos_app/templates/manifesto.html` (BAJO, sin cambios)

L127: `<a href="{% url 'global_consciousness' %}">Vota una propuesta</a>`

- **Solución:** guard o sustituir.
- **Prioridad:** BAJA.

### 4.5 · `kudos_app/templates/search.html` (BAJO, sin cambios)

L29: `<a href="{% url 'social_space_detail' s.id %}">…</a>` — sólo se renderiza si la view inyecta `spaces` en el contexto.

- **Verificar:** que `views.global_search` no popule la lista `spaces` (en el código actual la búsqueda PUBLIC no debería hacerlo).
- **Solución defensiva:** guard `{% if_feature "social_spaces" %}` o eliminar el bloque del template.
- **Prioridad:** BAJA.

### 4.6 · `kudos_app/templates/profile.html` (BAJO, sin cambios)

L21: `<a href="{% url 'export_capsules' %}">📤 Exportar mis cápsulas (CSV)</a>`

- **Solución:** guard `{% if_feature "export" %}`.
- **Prioridad:** BAJA.

---

## 5. REGRESIONES POSITIVAS DESDE 19-may

Cosas que la auditoría anterior reportó como rotas y que ahora están **resueltas**:

1. **`capsule_detail.html` ya está gateado.** Las 6-7 fugas reportadas el 19-may (L730-744 · barra multidimensional con Audio/AR/Diálogo/Versiones/Aportar/Enrich) están envueltas correctamente en `{% if_feature "capsule_ar_vr" %}` (L728-734, L742-749) y `{% if_feature "capsule_memento" %}` (L735-741). **Cero leaks** en el template del corazón del producto. ✅
2. **`ai_panel.html` ya está gateado.** Los 3 forms POST a `ai_directive_toggle` / `ai_insight_accept` / `ai_insight_archive` (L221/L232/L235) están encapsulados en `{% if is_founder %}{% if_feature "mind_full" %}…{% endif_feature %}{% endif %}` (L184 ↔ L259). ✅
3. **`base.html` correcto.** Las 6 referencias a `trending`/`achievements`/`data_analysis`/`feedback`/`safety`/`report` (L139-154) están todas con guard inline (`{% if_feature "trending" %}…{% endif_feature %}` por enlace). El scanner inicial las marcó falsamente — la pasada con tokenizado de profundidad confirma que están bien. ✅
4. **`path('', views.home, …)` revertido.** El parche debug que apuntaba a `healthcheck` ya no está. Landing público restaurado. ✅

---

## 6. DELTA vs FEATURE_GATE_AUDIT_20260519.md

| Hallazgo del 19-may | Estado 21-may |
|---|---|
| ALTA — Revertir `path('', views.home, …)` | ✅ HECHO |
| ALTA — Gatear 13 enlaces dormant en home.html | ❌ ABIERTO (ahora son 16) |
| ALTA — Gatear 7 enlaces multidimensionales en capsule_detail.html | ✅ HECHO |
| ALTA — Gatear 4 atajos del dashboard | ❌ ABIERTO (son 5) |
| MEDIA — Gatear forms de Mind FULL en ai_panel.html | ✅ HECHO |
| BAJA — Quitar duplicado `mind/chat/` en urls.py | ❌ ABIERTO |
| BAJA — Gatear `global_consciousness` en onboarding y manifesto | ❌ ABIERTO |
| BAJA — Gatear `export_capsules` en profile | ❌ ABIERTO |
| BAJA — Mover snapshots fuera de `templates/` | ❌ ABIERTO (10+ `.snapshot.*` siguen junto a `.html`) |

**Lectura:** los 3 bloques **TÉCNICOS HEAVY** (cápsula, mind, urls/home revert) ya están saneados. El trabajo restante es **template-layer** puro — 25 `{% if_feature %}` en 7 archivos.

---

## 7. RIESGOS NO BLOQUEANTES

- **Snapshots en `templates/`:** `ai_panel.html.snapshot.*`, `base.html.snapshot.*`, `capsule_detail.html.snapshot.*` (×3), `map.html.snapshot.*` (×4+). Django ignora extensiones no-`.html`, pero el grep para auditar produce falsos positivos. Sugerencia: mover a `_snapshots/` o añadir a `.gitignore`.
- **`home.html:109`** sigue con lógica de rol (`{% if user.is_authenticated and user.is_staff %}…ai_panel…{% else %}…about…{% endif %}`) — válido mientras Mind LITE sea founder-only; revisar cuando se abra a todos.
- **`search.html` L29:** el template referencia `social_space_detail` aunque hoy la view PUBLIC no debería inyectar `spaces`. Comprobar `views.global_search` para descartar acoplamiento futuro accidental.

---

## 8. PUNCH LIST PRIORIZADA

| Prioridad | Acción | Archivo | Líneas |
|-----------|--------|---------|--------|
| ALTA | Gatear 16 enlaces del megamenú + tiles | `kudos_app/templates/home.html` | 39, 91, 97, 103, 197-208 |
| ALTA | Gatear 5 atajos | `kudos_app/templates/dashboard.html` | 19, 20, 21, 79, 88 |
| BAJA | Quitar línea duplicada `path('mind/chat/', …)` | `kudos_app/urls.py` | 195 |
| BAJA | Gatear `global_consciousness` | `kudos_app/templates/onboarding.html` | 40 |
| BAJA | Gatear `global_consciousness` | `kudos_app/templates/manifesto.html` | 127 |
| BAJA | Gatear `social_space_detail` (defensivo) | `kudos_app/templates/search.html` | 29 |
| BAJA | Gatear `export_capsules` | `kudos_app/templates/profile.html` | 21 |
| BAJA | Mover `*.snapshot.*` fuera de `kudos_app/templates/` | varios | — |

---

## 9. CONCLUSIÓN

El **FEATURE GATED SYSTEM** está estructuralmente sano y mejorando:

- Middleware ON, registry coherente, override por entorno, cobertura completa de rutas dormant, landing público restaurado.
- 3 de los 4 puntos ALTOS del audit del 19-may resueltos (cápsula, mind, home revert).

El único frente abierto significativo es **navegación contaminada en `home.html` + `dashboard.html`** — 21 enlaces ALTA. Es una sesión de hardening de template-layer, sin tocar views ni urls. Estimación de esfuerzo: ~45-60 min para envolver, ~20 min para ajustes CSS si quedan grids vacíos.

**Recomendación táctica:** próximo PR aislado tipo *"feature-gate: harden home + dashboard nav"* — ALTA prioridad antes de cualquier release v0.9 visible al usuario.

**Recomendación estratégica (sin cambios desde 19-may):** añadir test E2E que recorra el sitemap PUBLIC y falle si encuentra un href que devuelva 404. Eso convertiría futuras regresiones de navegación contaminada en bug rojo automático, sin auditorías manuales.

---

*Audit ejecutada por scheduled task `feature-gate-audit` · 2026-05-21 · scanner con tokenización de profundidad para guards inline.*
