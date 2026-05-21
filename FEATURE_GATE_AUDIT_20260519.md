# FEATURE GATE AUDIT · 2026-05-19

Auditoría automatizada del FEATURE GATED SYSTEM de KUDOS / AXÓN.

**Alcance:**
- features ocultas (dormant) reales vs declaradas
- rutas públicas accidentales (no bloqueadas por middleware)
- navegación contaminada (links a dormant desde templates públicos)

**Fuente de verdad:** `kudos_project/features.py`
**Enforcement:** `kudos_project/middleware.py::DormantRouteMiddleware` (registrado en `settings.py`, línea 82)

---

## 1. ESTADO GENERAL — VERDE con sangrado

El gating estructural FUNCIONA:

- `DormantRouteMiddleware` está registrado en `MIDDLEWARE`.
- Todas las URL dormant tienen su path cubierto por `DORMANT_PATH_PREFIXES` o `DORMANT_PATH_REGEX` (revisado urls.py línea a línea).
- Las 7 features PUBLIC CORE están todas activas en `_PUBLIC_CORE`.
- El whitelist `ALWAYS_ALLOWED_PREFIXES` no contiene fugas (admin/auth/static/media/api públicas).

**Pero hay contaminación de navegación importante en templates PUBLIC.** El usuario no puede acceder a las dormant (middleware → 404), pero VE los enlaces, los clica y recibe 404. Esto rompe la experiencia "Time To Awe".

---

## 2. FEATURES OCULTAS (dormant) — declaración consistente

✓ 35 features dormant declaradas en `_DORMANT`.
✓ Todas con flag `False`.
✓ Override por entorno (`KUDOS_FEATURE_<NAME>=1`) implementado.
✓ `is_enabled()` consulta el override antes del flag estático.

**Sin hallazgos.** El registro de features está limpio.

---

## 3. RUTAS PÚBLICAS ACCIDENTALES — 2 hallazgos menores

### 3.1 · DUPLICADO de URL pattern (BAJO)

`kudos_app/urls.py` declara dos veces la misma ruta:

```
línea 186: path('mind/chat/', views.ai_chat, name='ai_chat'),
línea 193: path('mind/chat/', views.ai_chat, name='ai_chat'),
```

- **Problema:** ruido en `reverse()` y en `python manage.py show_urls`.
- **Impacto:** funcional, Django usa el primero. Confusión en debugging.
- **Solución:** eliminar la línea 193.
- **Riesgo:** ninguno.
- **Prioridad:** BAJA.

### 3.2 · `name='home'` apunta a `healthcheck`, no a `home` (MEDIO)

`kudos_app/urls.py` línea 16:

```
path('', views.healthcheck, name='home'),
path('home/', views.home, name='home_full'),
```

Es un parche de debug declarado (comentario "AXÓN · debug-home"). Consecuencias:

- Todos los `{% url 'home' %}` de `base.html` (header, footer, FAB) llevan a healthcheck.
- El home real solo es alcanzable navegando a `/home/` directamente.
- El healthcheck no extiende `base.html`, por lo que el usuario PUBLIC ve una página sin chrome al cargar `/`.

**Problema:** el landing público está roto a propósito por debug.
**Impacto:** experiencia primer-toque = 0. Bloquea Time To Awe.
**Solución:** revertir línea 15 ↔ 16 cuando se resuelva el bug 500 al que se hace referencia.
**Riesgo:** posible regresión del 500 original — verificar fix antes de revertir.
**Prioridad:** ALTA (es el primer pixel que ve un usuario).

### 3.3 · Rutas dormant cubiertas correctamente

He verificado urls.py línea a línea contra `DORMANT_PATH_PREFIXES`. No hay rutas dormant que escapen al middleware. Todas las 70+ rutas dormant caen bajo un prefijo bloqueado.

---

## 4. NAVEGACIÓN CONTAMINADA — 7 templates PUBLIC con fugas

Templates **PUBLIC** que contienen `{% url '<dormant_name>' %}` SIN `{% if_feature %}` guard. Resultado en runtime: el usuario ve el botón → clica → 404 del middleware → confusión.

### 4.1 · `kudos_app/templates/home.html` — CRÍTICO

12 enlaces dormant sin guard (líneas aproximadas):

| Línea | URL name | Dormant feature |
|-------|----------|----------------|
| 39 | `feed` | feed_social |
| 91 | `social` | social_spaces |
| 97 | `wisdom_repository` | wisdom |
| 103, 199 | `global_consciousness` | congress |
| 198 | `marketplace` | marketplace |
| 200 | `space_exploration` | space_exploration |
| 201 | `sports_competitions` | sports |
| 202 | `mental_health` | mental_health |
| 203 | `spirituality` | spirituality |
| 204 | `art_festival` | art_festival |
| 205 | `future_simulator` | future_simulator |
| 206 | `kudos_legacy` | kudos_legacy |
| 208 | `assistant_characters` | assistant_characters |

- **Problema:** home.html es el escaparate del MVP y muestra 13 destinos rotos en megacards/tiles.
- **Impacto:** primer impacto post-login = paseo de 404. Anti-MVP.
- **Solución:** envolver cada `<a>` en `{% if_feature "<flag>" %}…{% endif_feature %}`, o eliminar el bloque "Explora todos los módulos" del PUBLIC CORE.
- **Riesgo:** si el bloque queda vacío, ajustar el grid CSS.
- **Prioridad:** ALTA.

### 4.2 · `kudos_app/templates/dashboard.html` — ALTO

4 enlaces dormant sin guard:

| Línea | URL name | Dormant feature |
|-------|----------|----------------|
| 19 | `create_proposal` | congress |
| 20, 88 | `mental_health` | mental_health |
| 21 | `export_capsules` | export |
| 79 | `achievements` | achievements |

- **Solución:** mismo patrón que 4.1.
- **Prioridad:** ALTA (es el destino tras login → control_panel).

### 4.3 · `kudos_app/templates/capsule_detail.html` — ALTO

7 enlaces dormant sin guard, todos en la "barra multidimensional":

| Línea | URL name | Dormant feature | Bloqueado por |
|-------|----------|----------------|---------------|
| 730 | `capsule_audio` | capsule_ar_vr | regex `/audio` |
| 732 | `ar_view` | ar_view | regex `/ar` |
| 737 | `capsule_dialog` | capsule_memento | regex `/dialog` |
| 738 | `capsule_versions` | capsule_memento | regex `/versions` |
| 739 | `capsule_aport_create` | capsule_memento | regex `/aport` |
| 744 | form action `capsule_ai_enrich` | capsule_ar_vr | regex `/enrich` |

- **Problema:** capsule_detail muestra 6 botones que parecen funcionales (Audio · AR · Diálogo · Versiones · Aportar · Enrich) y todos dan 404.
- **Impacto:** la cápsula es el corazón del producto. Esto destruye la confianza inmediatamente.
- **Solución:** envolver cada uno en `{% if_feature "capsule_ar_vr" %}` o `{% if_feature "capsule_memento" %}` según corresponda. Considerar también ocultar el bloque "🎭 Capa multidimensional" entero hasta que las features estén listas.
- **Prioridad:** ALTA.

### 4.4 · `kudos_app/templates/ai_panel.html` — MEDIO

3 forms POSTean a rutas dormant:

| Línea | URL name | Dormant feature |
|-------|----------|----------------|
| 221 | `ai_directive_toggle` | mind_full |
| 232 | `ai_insight_accept` | mind_full |
| 235 | `ai_insight_archive` | mind_full |

- **Problema:** Mind LITE está PUBLIC pero el panel muestra UI de Mind FULL (directives + insights con botones que 404ean al submit).
- **Solución:** envolver bloques en `{% if_feature "mind_full" %}` o servir un panel "lite" simplificado.
- **Prioridad:** MEDIA (afecta a usuarios autenticados en Mind).

### 4.5 · `kudos_app/templates/onboarding.html` — BAJO

Línea 40: `<a href="{% url 'global_consciousness' %}">Ver propuestas</a>`

- **Solución:** guard `{% if_feature "congress" %}` o sustituir por `{% url 'map' %}`.
- **Prioridad:** BAJA (el onboarding es pre-login, link probablemente tampoco se renderiza con frecuencia).

### 4.6 · `kudos_app/templates/manifesto.html` — BAJO

Línea 127: `<a href="{% url 'global_consciousness' %}">Vota una propuesta</a>`

- **Solución:** guard o sustituir CTA.
- **Prioridad:** BAJA.

### 4.7 · `kudos_app/templates/search.html` y `profile.html`

- `search.html` línea 29: `social_space_detail` (DORMANT, social_spaces). Solo se renderiza si `spaces` viene poblado en el contexto — la búsqueda no debería poblarlo. Verificar en views.py.
- `profile.html` línea 21: `export_capsules`. Botón "Exportar mis cápsulas (CSV)" → 404.
- **Prioridad:** BAJA-MEDIA.

---

## 5. RIESGOS NO BLOQUEANTES OBSERVADOS

- `kudos_app/templates/base.html.snapshot.d6.*` y otros `.snapshot.*` aparecen en el repo. No los carga Django (Django sólo lee `.html`), pero confunden al grep. Sugerencia: mover a `_snapshots/` fuera del directorio `templates/` o a `.gitignore`.
- `home.html` línea 109 usa lógica de rol para apuntar `ai_panel` o `about` — esto vivirá mientras Mind LITE sea sólo founder/admin. Si se decide abrirlo a todos, simplificar.

---

## 6. PUNCH LIST PRIORIZADA

| Prioridad | Acción | Archivo |
|-----------|--------|---------|
| ALTA | Revertir `path('', views.home, ...)` cuando se confirme fix del 500 | `kudos_app/urls.py:16` |
| ALTA | Gatear los 13 enlaces dormant del megamenú | `home.html` |
| ALTA | Gatear los 7 enlaces "multidimensionales" de la cápsula | `capsule_detail.html:730-744` |
| ALTA | Gatear los 4 atajos del dashboard | `dashboard.html:19-21,79,88` |
| MEDIA | Gatear los 3 forms de Mind FULL en el panel LITE | `ai_panel.html:221,232,235` |
| BAJA | Quitar duplicado de `mind/chat/` | `kudos_app/urls.py:193` |
| BAJA | Gatear `global_consciousness` en onboarding y manifesto | `onboarding.html:40`, `manifesto.html:127` |
| BAJA | Gatear `export_capsules` en profile | `profile.html:21` |
| BAJA | Mover snapshots fuera de `templates/` | varios `*.snapshot.*` |

---

## 7. CONCLUSIÓN

Estructuralmente el FEATURE GATED SYSTEM está bien diseñado: middleware activo, registry único, override por entorno, sin rutas dormant accesibles. **El gating en URL/middleware es correcto.**

El problema real es **navegación contaminada**: ~30 enlaces a rutas dormant aparecen visibles en templates PUBLIC. Para el MVP "Time To Awe" esto es crítico porque el camino home → dashboard → capsule_detail muestra al usuario 24+ botones rotos.

**Recomendación táctica:** una única sesión de hardening del template-layer envolviendo cada `{% url 'dormant_*' %}` en `{% if_feature %}`. Sin tocar views.py ni urls.py. ~1-2h.

**Recomendación estratégica:** añadir un test E2E que recorra el sitemap PUBLIC y falle si encuentra un href que devuelva 404 — esto detectaría regresiones futuras sin auditorías manuales.
