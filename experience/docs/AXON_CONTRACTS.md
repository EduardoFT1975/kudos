# AXÓN ↔ KUDOS Experience · Contratos y Plan de Evolución

> Documento vivo. Una sola fuente de verdad para qué expone AXÓN (Django) y qué consume
> KUDOS Experience (Next.js). Si algo cambia aquí, cambia en ambos lados.
>
> Autoridad: CTO + Chief Platform & Context Architect.

---

## 1 · Reparto canónico

| Capa | Dueño | Forma de consumo |
|---|---|---|
| Modelos `Capsule.*`, `Place`, `CapsuleScore`, `PresenceSignal` | AXÓN (Django) | Campos JSON en respuestas REST |
| Servicios CIE (`scoring`, `quality`, `promotion`) | AXÓN (Django) | `final_score` / `quality_level` precalculados en payload |
| Reputation scaffolding, Presence Layer | AXÓN (Django) | Flags y scores serializados |
| Discovery Feed UX (vertical, swipeable, cinematic) | KUDOS Experience | `GET /api/discovery/feed/` |
| Explorer Map (hotspots + capas) | KUDOS Experience | `GET /api/capsules/5d/` *(existe)* |
| Time Machine (Roma 80 d.C. + slider) | KUDOS Experience | `GET /api/places/:slug/timeline/` |
| Capsule Experience (full-bleed) | KUDOS Experience | `GET /api/capsules/:uid/` *(existe parcial)* |
| KUDOS Mind contextual (overlay) | KUDOS Experience | `POST /mind/ask/` *(existe)* |

**Regla absoluta:** el frontend Next.js NO consume templates Django. Solo `/api/*` y `/mind/*` con `Accept: application/json`.

---

## 2 · Endpoints AXÓN — estado actual

### Existentes (PUBLIC, gateados por whitelist en `kudos_project/features.py`)

| Método · Path | Vista | Notas |
|---|---|---|
| `GET /api/capsules/` | `api_capsules` | Devuelve las 20 últimas públicas. Payload mínimo (uid, titulo, modo, autor, fecha, likes). Sin paginación. |
| `GET /api/capsules/5d/` | `api_capsules_5d` | Bbox + filtros año/dim/modo. Payload slim 9 campos. `Cache-Control: max-age=60` cuando hay bbox. |
| `GET /api/capsules/<uid>/light/` | `api_capsule_light` | Hidrata popup lazy. era · altitud · ai_enriched · sentiment · quality. |
| `GET /api/capsules/nearby/` | `api_capsules_nearby` | Por bbox. |
| `GET /api/stats/` | `api_stats` | Site stats. |
| `POST /mind/ask/` | `ai_lite_ask` | Mind Lite (3 modos: what / summary / near). Requiere CSRF si auth. |
| `GET /` | `healthcheck` | **Temporal** · plaintext. Volver a `home` template tras DEBUG_HOME_500. NO consumir desde Next. |

### Faltantes (los que el MVP cinematográfico necesita)

| Método · Path | Propósito | Phase |
|---|---|---|
| `GET /api/discovery/feed/?cursor=` | Feed vertical rankeado por `final_score` (CIE). Cursor-based pagination. | 1 |
| `GET /api/places/<slug>/` | Lugar canónico: slug · name · country · lat · lon · summary · era_range · capsule_count · image. | 0 |
| `GET /api/places/<slug>/timeline/?from=&to=` | Cápsulas del lugar ordenadas por `fecha`, filtradas por rango. | 3 |
| `GET /api/capsules/<uid>/` | Detalle full-bleed: cápsula + parent · children · place · score. | 3 |
| `GET /api/health/` | Healthcheck JSON estable (no plaintext). `{status, version, service, uptime}`. | 0 |

---

## 3 · Modelos AXÓN — evolución por fases

### Phase 0 · Fundación contextual

**Objetivo:** habilitar Discovery Feed curado de Roma + Capsule Experience cinematográfica sin big bang.

**Migración `0007_axon_foundation`:**

- `Place` (modelo nuevo)
  - `slug` (slug único, indexed)
  - `name`
  - `country` (opcional)
  - `latitud` · `longitud`
  - `summary` (text)
  - `description` (text, opcional)
  - `image` (URL, opcional)
  - `era_range_from` · `era_range_to` (int, nullable)
  - `capsule_count` (int, default 0, denormalizado vía signal)
  - `created` · `updated`

- `Capsule` (campos añadidos, todos nullable / con default para no romper filas existentes):
  - `place` → ForeignKey(Place, null=True, on_delete=SET_NULL, related_name="capsules")
  - `parent_capsule` → ForeignKey('self', null=True, on_delete=SET_NULL, related_name="children")
  - `root_capsule` → ForeignKey('self', null=True, on_delete=SET_NULL, related_name="descendants") — denormalizado para queries árbol O(1)
  - `context_layer` → CharField(choices=OFFICIAL/COMMUNITY/PERSONAL/TEMPORAL/EMOTIONAL, default="COMMUNITY")
  - `importance_score` → FloatField(default=0, db_index=True) — semilla = `ai_quality_score / 10`
  - `verified` → BooleanField(default=False) — flag mínimo de Phase 0; el detalle de `verification_*` queda para Phase 2

- `lugar` (CharField string existente) **se mantiene**. No se rompe. Phase 0 incluye un management command `link_capsules_to_places` que mapea `lugar` ↔ `Place.slug` por matching simple.

**Endpoints nuevos (Phase 0):**
- `GET /api/places/<slug>/` → serializa Place + `capsule_count`.
- `GET /api/health/` → `{status: "ok", version: "v0.9-axon-core", service: "axon", uptime: int}`.

**Whitelist:** añadir `api_place_detail`, `api_health` a `PUBLIC_URL_NAMES` en `kudos_project/features.py`.

**Management command:** `seed_rome` → crea `Place(slug="rome", name="Roma", country="Italia", lat=41.9028, lon=12.4964, era_range_from=-753, era_range_to=2026, summary="…")` y linka cápsulas existentes cuyo `lugar` contenga "Roma" / "Roma, Italia" / etc.

**Sin tocar:** `dimension_layer`, `modo`, `privacy`, `era` — son ortogonales y ya viven en producción.

### Phase 1 · Capsule Intelligence Engine (base)

**Migración `0008_capsule_score`:**

- `CapsuleScore` (OneToOneField a Capsule)
  - `global_importance_score`
  - `historical_density_score`
  - `visual_potential_score`
  - `commercial_score`
  - `engagement_score`
  - `local_relevance_score`
  - `viral_score`
  - `final_score` (float, db_index)
  - `quality_level` (CharField choices: LEVEL_1_BASIC / LEVEL_2_ENRICHED / LEVEL_3_PREMIUM / LEVEL_4_LEGENDARY, default=LEVEL_1_BASIC)
  - `last_calculated_at`

- `Capsule.final_score` (denormalizado, FloatField default=0 db_index) actualizado por signal post-save de CapsuleScore. Permite ordenar feed sin JOIN.

**Servicios en `/kudos_app/services/`:**
- `scoring_service.py` — weighted scoring configurable por `settings.KUDOS_SCORING_WEIGHTS`. Sin hardcodear thresholds.
- `quality_service.py` — asignación de quality tier automática + upgrade/downgrade.
- `promotion_service.py` — viral boosting + relevancia contextual (preparado, no activo todavía).

**Endpoint nuevo:** `GET /api/discovery/feed/?cursor=` → ranked por `Capsule.final_score DESC, importance_score DESC, timestamp DESC`. Cursor base64 sobre `(final_score, id)`.

**Whitelist:** `api_discovery_feed` añadido.

### Phase 2 · Presence + Reputation scaffolding

**Migración `0009_presence_reputation`:**

- `PresenceSignal` (nuevo)
  - `capsule` → FK Capsule
  - `user` → FK User (null=True para señales sin auth)
  - `signal_type` (choices: gps_proximity / metadata / timestamp / contextual_coherence / ai_confidence)
  - `confidence` (float 0–1)
  - `source` (CharField)
  - `payload` (JSONField)
  - `created` (DateTime indexed)

- `Capsule.presence_confidence_score` (FloatField default=0)
- `User`:
  - `contextual_merit` (float)
  - `trust_level` (int, default 0)
  - `verified_presence_score` (float)

**Sin endpoints todavía** — solo modelos para que Phase 3 pueda exponerlos.

**Importante:** Presence Layer NO es tracking invasivo. NO se loggea geolocalización del usuario sin OPT-IN explícito. Solo se materializa cuando el usuario crea/verifica una cápsula.

### Phase 3 · Jerarquía + Timeline endpoints

- `GET /api/capsules/<uid>/` con `parent`, `children`, `score`, `place`.
- `GET /api/places/<slug>/timeline/?from=&to=` ordenado por `fecha`.
- Capsule `verification_state` + `verification_type` + `verified_at` (granularidad real).

---

## 4 · Curaduría inicial · Roma

Discovery Feed v0 = sesión cinematográfica curada de Roma sobre **UIDs reales de AXÓN**.

Lista canónica en `experience/lib/curated/rome.ts` — array de UIDs (no datos hardcodeados). El Feed hidrata cada UID vía `GET /api/capsules/<uid>/` (Phase 3) o `GET /api/capsules/<uid>/light/` (existente, fallback).

UIDs objetivo (a confirmar tras Phase 0 con management command `list_rome_capsules`):
- Coliseo
- Foro Romano
- Panteón
- Vaticano · San Pedro
- Castel Sant'Angelo
- Trastevere
- Fontana di Trevi
- Termas de Caracalla

Si AXÓN no tiene una de ellas, el comando `seed_rome_capsules` crea la cápsula OFICIAL mínima usando `import_wikipedia` ya existente.

---

## 5 · Tipos TypeScript en `experience/lib/axon/types.ts`

Ya están preparados con `[k: string]: unknown` para no romper cuando AXÓN añada campos. Cuando Phase 0 cierre, actualizar:

- `Capsule` — añadir `place?: string | null`, `parent_capsule?: string | null`, `context_layer?: string`, `importance_score?: number`.
- `Place` — campos exactos del serializer Phase 0.
- `HealthStatus` — shape concreto cuando `/api/health/` exista.

---

## 6 · Lo que NO se construye (recordatorio del master prompt)

PROHIBIDO en MVP, aunque exista código DORMANT en el repo:

- DAO / blockchain / governance
- Marketplace
- Social graph completo (`/feed/`, `/follow/`, `/messages/` están dormant — no activar)
- VR compleja
- Microservicios / event mesh
- Memorial AI total
- Imports masivos Google/Instagram
- Agentic Core completo

El gating del middleware ya bloquea estos paths. Mantenerlo intacto.

---

## 7 · Procedimiento de despliegue por fase

Cada fase:
1. Migración aislada (`0007_axon_foundation`, `0008_capsule_score`, etc.).
2. Tests mínimos en `kudos_app/tests.py` (al menos shape del endpoint nuevo).
3. Management command de seed si aplica.
4. Actualización de tipos en `experience/lib/axon/types.ts`.
5. Smoke test contra Render staging antes de prod.
6. OK explícito del fundador antes de pasar a la fase siguiente.

---

*Última revisión: phase plan inicial. Pendiente: OK Phase 0 para arrancar migración 0007.*
