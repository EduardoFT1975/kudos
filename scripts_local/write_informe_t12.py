"""Escribe INFORME_H1_T1.2_POSTGRES.md atomicamente."""
import os, tempfile

ROOT = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
if not os.path.exists(ROOT):
    ROOT = r"C:\Users\efert\kudos_project"

OUT = os.path.join(ROOT, "INFORME_H1_T1.2_POSTGRES.md")

CONTENT = r"""# INFORME H1 · T1.2 · POSTGRES FOUNDATION

**Programa**: KUDOS Oficial — Prompt 3/16
**Fase**: 1 — Launch Foundation
**Hito**: H1 — Fundamentos de Lanzamiento
**Tarea**: T1.2 — Postgres Foundation
**Fecha**: 29 de mayo de 2026
**Autor**: Claude Cowork (CTO)
**Destinatarios**: Eduardo (CEO) · GPT-5 (CPO/CSO)

---

## 0. RESUMEN EJECUTIVO

Se ejecuto T1.2 segun autorizacion del prompt 3/16. Resultado:

- **13 tablas SQLAlchemy creadas** (las 12 obligatorias + `merit_overrides` por directive GPT-5).
- **Alembic configurado** con `alembic.ini` + `env.py` + migracion `001_initial_schema.py` lista para `alembic upgrade head`.
- **Repository layer completo** (UserRepository, SaveRepository, SignalsRepository, TelemetryRepository, ContentRepository).
- **Seed script** que carga capsulas + narrativas + relationships desde manifests estaticos.
- **Feature flag `KUDOS_USE_POSTGRES`** controla la activacion. Por defecto `false` (modo legacy JSON sigue funcionando).
- **8 tests pytest** smoke (conexion, CRUD users/saves, signals, capsules, telemetry, ownership check).
- **WHY signals** preparadas (`save.motivation`, `visit.visit_reason`, `watched.watch_reason`, `resonance.resonance_reason`, `memory_prompt.memory_reason`, `event.event_reason`) por requisito GPT-5.
- **Requirements actualizado**: sqlalchemy 2.0, alembic, asyncpg, psycopg2-binary, greenlet, pytest, httpx.

**Lo que NO se ejecuto en T1.2** (intencional, parte del plan H1·T1.0):

- **T1.4 Migracion endpoints**: los services existentes (save/signals/telemetry) siguen leyendo/escribiendo JSON. La migracion masiva de endpoints es T1.4 explicito en el plan, y se hara tras verificar Postgres en produccion.
- **Alembic `upgrade head` real**: requiere Postgres corriendo. Solo Eduardo puede ejecutarlo desde Render shell o local con DATABASE_URL configurada.

**Veredicto CTO**: BASE PREPARADA PARA T1.3 OAUTH.

---

## 1. AUDITORIA PREVIA

| Componente | Estado | Riesgo / Bloqueador |
|---|---|---|
| `kudos_engine/requirements.txt` | Solo fastapi/pydantic/anthropic. Sin SQLAlchemy. | Actualizado en T1.2. |
| `kudos_engine/apps/core/db.py` | JSON store legacy. | Mantener en paralelo durante T1.2 y T1.3. T1.4 lo deprecara. |
| `kudos_engine/apps/core/config.py` | Solo paths locales. Sin env vars de Postgres. | Solucion: `DATABASE_URL` se lee en runtime en `db/database.py`. |
| Servicio Render `kudos-db` | Provisionado pero indeterminado | **CEO debe verificar antes de `alembic upgrade head`**. |
| `kudos` (servicio legacy) | Indeterminado | **CEO debe eliminar si no se usa**. |

### Suposiciones T1.2

1. Eduardo creara/verificara `kudos-db` Postgres en Render dashboard. Plan recomendado: Standard 1GB ($7/mes).
2. Eduardo seteara `DATABASE_URL` y `KUDOS_USE_POSTGRES=true` como env vars en `kudos-api-v2`.
3. Eduardo correra `alembic upgrade head` desde Render shell o localmente para crear el schema inicial.
4. Tras la migracion, Eduardo puede correr `python -m kudos_engine.db.seed.seed_initial` (o POST a `/api/db/seed` con `X-Admin-Token`) para poblar contenido.

---

## 2. POSTGRES SETUP

### 2.1 Dependencias anadidas en `kudos_engine/requirements.txt`

```
sqlalchemy>=2.0.25
alembic>=1.13.0
psycopg2-binary>=2.9.9
asyncpg>=0.29.0
greenlet>=3.0.0

pytest>=7.4.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

### 2.2 Engines duales (`kudos_engine/db/database.py`)

- **`get_async_engine()`**: usa `asyncpg`. Usado por FastAPI runtime.
- **`get_sync_engine()`**: usa `psycopg2`. Usado por Alembic + scripts CLI.
- Ambos detectan `DATABASE_URL` con conversion automatica desde el formato Render (`postgres://...`).
- Pool: `pool_pre_ping=True`, `pool_recycle=1800s` (evita timeouts Render).

### 2.3 Feature flag

```python
def is_postgres_enabled() -> bool:
    return os.getenv("KUDOS_USE_POSTGRES", "false").lower() in ("true","1","yes")
```

- Por defecto **false**: el codigo sigue funcionando con JSON store legacy.
- Cuando `true`: se monta `db_admin_router` + endpoints empezaran a usar Postgres en T1.4.

### 2.4 Endpoints diagnostico `/api/db/*` (solo si Postgres activo)

| Endpoint | Metodo | Proposito |
|---|---|---|
| `/api/db/health` | GET | Verifica conexion + cuenta filas por tabla. |
| `/api/db/seed` | POST | Ejecuta seed_initial (require `X-Admin-Token` matching `KUDOS_ADMIN_TOKEN` env var). |

---

## 3. MODELO DE DATOS MVP · 13 TABLAS

### 3.1 Tablas creadas

| Tabla | Proposito | Campos clave |
|---|---|---|
| `users` | Identidad usuario | id (UUID), email, oauth_provider, oauth_id, primary_interest, last_seen_at |
| `refresh_tokens` | Sesiones JWT | jti, user_id, hash, rotated_to, revoked_at |
| `saves` | Mi Mundo | user_id, poi_id, motivation [WHY], themes [JSONB], memory_status |
| `visits` | VisitedWorld | user_id, poi_id, source, visit_reason [WHY] |
| `watched` | Capsulas vistas | user_id, capsule_id, completion_pct, watch_reason [WHY] |
| `resonances` | Reacciones emocionales | user_id, poi_id, resonance_type, intensity (1..5), resonance_reason [WHY] |
| `memory_prompts` | Log prompts revivit | user_id, save_id, response, memory_reason [WHY] |
| `poi_signals` | HDG aggregate | poi_id (PK), 5 scores (discovery/importance/memory/emotion/future_value), emotion_profile [JSONB] |
| `telemetry_events` | HDG raw | BIGSERIAL, user_id (nullable anon), event_type, payload [JSONB], event_reason [WHY] |
| `capsules` | Videos | id, poi_id, url, thumb_url, scene_manifest [JSONB], status, tier |
| `narratives` | 6 narrativas POI | id (UUID), poi_id, narrative_type, title, hook, body_md, language (uniq por trio) |
| `poi_relationships` | World Graph | (poi_id, related_id, relation_type) PK, weight, distance_km, relationship_origin [GPT-5] |
| `merit_overrides` | UNESCO etc. | poi_id (PK), override_score, source, applied_at, expires_at [GPT-5 ajuste 3] |

### 3.2 Decisiones de schema relevantes

- **UUID v4** para user_id, save_id, etc. -> no exponen orden de creacion.
- **BIGSERIAL** para `telemetry_events.id` -> esperamos volumen alto.
- **JSONB** para campos flexibles (themes, payload, emotion_profile, scene_manifest) -> consulta nativa Postgres con operador `->`.
- **CHECK constraints** en oauth_provider, collection_type, memory_status, intensity, status capsule, relation_type, relationship_origin.
- **UNIQUE** `(oauth_provider, oauth_id)` y `(poi_id, narrative_type, language)`.
- **Soft delete** `users.deleted_at` (GDPR) en lugar de hard delete.

### 3.3 WHY signals (GPT-5 requisito T1.2)

Los siguientes campos preparan el HDG futuro sin construir UX hoy:

```
saves.motivation         in (learn, travel, remember, inspire, research, connect)
visits.visit_reason      in (planned, spontaneous, pilgrimage, educational, other)
watched.watch_reason     in (curiosity, learning, inspiration, preparation, nostalgia)
resonances.resonance_reason (texto libre)
memory_prompts.memory_reason (texto libre)
telemetry_events.event_reason (categoria opcional)
```

Constantes Python en `kudos_engine/db/models/save.py` para validacion en T1.3+.

---

## 4. INDICES

20 indices creados, priorizados por queries del MVP:

| Tabla | Indice | Query optimizada |
|---|---|---|
| users | email (unique) | login lookup |
| users | last_seen_at | dashboard active users |
| refresh_tokens | user_id | logout all devices |
| saves | (user_id, created_at) | Mi Mundo timeline |
| saves | poi_id | count por POI |
| visits | (user_id, visited_at) | actividad reciente |
| visits | poi_id | total visits |
| watched | (user_id, watched_at) | feed actividad |
| watched | capsule_id | analytics por capsula |
| resonances | (poi_id, resonance_type) | breakdown emocional |
| resonances | user_id | timeline emociones |
| memory_prompts | (user_id, prompted_at) | log revisits |
| poi_signals | 5 scores (DESC c/u) | top discovery / top emotion / etc |
| telemetry_events | (user_id, ts) | actividad usuario |
| telemetry_events | (event_type, ts) | analytics |
| telemetry_events | (poi_id, ts) | top POIs |
| capsules | poi_id | capsulas por POI |
| capsules | (status, created_at) | publicadas recientes |
| narratives | poi_id | 6 narrativas |
| poi_relationships | poi_id / related_id | World Graph queries |

**No optimizacion prematura**: NO particionado, NO materialized views, NO pgvector. Esos son fase escala.

---

## 5. SEED INICIAL

`kudos_engine/db/seed/seed_initial.py` carga desde:

| Manifest | Destino | Estimado |
|---|---|---|
| `experience/public/capsules/index.json` | `capsules` | ~11 rows |
| `experience/public/data/narratives/index.json` | `narratives` | ~40-60 rows (Tier S) |
| `experience/public/data/relationships/index.json` | `poi_relationships` | ~80-100 rows (Tier S) |

**Idempotente**: usa `ON CONFLICT DO UPDATE`. Re-ejecutar no duplica.

**Que NO carga**:

- POIs maestros (siguen en `experience/public/data/wikidata/*.json`, lazy load frontend).
- Saves / visits / watched / resonances (datos de usuario que se generan con uso).
- Signals (se computan via `recompute_for_poi`).
- Users (se crean en T1.3 OAuth).

**Como ejecutar**:

```bash
# Localmente
DATABASE_URL=postgresql://... python -m kudos_engine.db.seed.seed_initial

# Desde Render shell
$ render shell kudos-api-v2
$ python -m kudos_engine.db.seed.seed_initial

# Desde HTTP (require KUDOS_ADMIN_TOKEN env var)
$ curl -X POST https://kudos-api-v2.onrender.com/api/db/seed \
       -H "X-Admin-Token: $KUDOS_ADMIN_TOKEN"
```

---

## 6. MIGRACION

### 6.1 Estrategia (segun H1·T1.0)

Fase actual (T1.2): **dual storage capacidad**. Codigo soporta ambos JSON y Postgres via `is_postgres_enabled()`.

Pasos para activar Postgres:

1. CEO confirma `kudos-db` activo en Render. Si no, provisionar Postgres Standard 1GB.
2. CEO setea env vars en `kudos-api-v2`:
   ```
   DATABASE_URL=<connection_string_render>
   KUDOS_USE_POSTGRES=true
   KUDOS_ADMIN_TOKEN=<random_64_chars>
   ```
3. Push de T1.2 dispara redeploy.
4. CEO ejecuta migracion via Render shell:
   ```bash
   alembic upgrade head
   ```
5. CEO ejecuta seed:
   ```bash
   python -m kudos_engine.db.seed.seed_initial
   ```
6. Verifica: `curl https://kudos-api-v2.onrender.com/api/db/health` -> debe responder con conteos.

### 6.2 Rollback

Si T1.2 introduce regresion:

- **Nivel 1** (rollback rapido): cambiar `KUDOS_USE_POSTGRES=false` en Render env -> codigo vuelve a JSON. El schema Postgres queda intacto sin uso.
- **Nivel 2** (rollback total): `alembic downgrade base` borra todas las tablas (`downgrade()` en migracion 001).
- **Nivel 3** (rollback git): `git revert <T1.2 commits>` revierte modelos + main.py.

### 6.3 Cero perdida de datos

En T1.2 NO se migran datos de usuario porque:

- El JSON store en `kudos_engine/state/apps_v2/` esta **vacio en sandbox** (confirmado en H0).
- Los datos productivos viven en localStorage del frontend (no en server).

Cuando T1.4 conecte los endpoints a Postgres, se anadira en frontend un POST `/api/save/migrate-anon` que sube los saves localStorage al server.

---

## 7. REPOSITORY LAYER

Cinco repositorios separan SQL de la logica de negocio:

| Repository | Metodos clave |
|---|---|
| `UserRepository` | `get_by_id`, `get_by_oauth`, `create_or_update` |
| `SaveRepository` | `create_save`, `list_by_user`, `count_by_poi`, `delete_save` (con ownership check), `list_stale_for_user`, `update_memory_status`, `add_visit`, `add_watched`, `add_resonance` |
| `SignalsRepository` | `get_for_poi`, `upsert`, `top_by_score`, `recompute_for_poi` |
| `TelemetryRepository` | `add_event`, `add_batch` (cap 1000), `top_pois` |
| `ContentRepository` | `get_capsule`, `upsert_capsule`, `list_capsules_by_poi`, `list_narratives_by_poi`, `upsert_narrative`, `list_related`, `upsert_relationship` |

**Beneficios**:
- Tests usan repos directamente sin levantar FastAPI.
- T1.4 reemplaza calls a JSON store por calls a repo en services existentes.
- Cambiar de SQLAlchemy a otro ORM en el futuro solo tocaria estos 5 archivos.

---

## 8. TESTS CRITICOS

8 smoke tests en `kudos_engine/tests/test_db_smoke.py`:

1. `test_user_create_and_lookup` — User create + get_by_oauth
2. `test_save_create_and_list` — Save + list timeline
3. `test_save_count_by_poi` — agregacion count
4. `test_signals_recompute_empty` — recompute con POI sin saves
5. `test_signals_top_by_score` — orden DESC por score
6. `test_capsule_upsert_idempotent` — upsert dos veces, conserva el ultimo
7. `test_telemetry_add_and_top` — add events + top POIs
8. `test_save_ownership_check_on_delete` — u2 NO puede borrar save de u1 (seguridad)

### Como ejecutar

```bash
# Requiere Postgres local o de tests
TEST_DATABASE_URL=postgresql://localhost:5432/kudos_test \
  pytest kudos_engine/tests/ -v
```

Si `TEST_DATABASE_URL` no esta seteada, los tests se **skippean automaticamente** (no fallan el CI).

---

## 9. RENDIMIENTO

NO se ejecutaron benchmarks en T1.2 (Postgres no corre en sandbox). Estimaciones esperadas en Render Standard tier:

| Operacion | Esperado |
|---|---|
| INSERT save | < 5 ms |
| SELECT saves user (con index) | < 10 ms para 100 filas |
| Upsert poi_signals | < 8 ms |
| recompute_for_poi (5 queries agregadas) | < 50 ms para POIs con <10k events |
| Top by score (10 rows) | < 5 ms con index |

Si en produccion vemos algo distinto, T1.4 anadira `pool_size` mayor y posiblemente Redis cache para signals top.

---

## 10. VEREDICTO CTO

### Pregunta: ¿Esta KUDOS preparado para iniciar T1.3 OAuth?

# SI

### Justificacion

1. **Schema completo creado**: tabla `users` + `refresh_tokens` listos para que T1.3 los pueble.
2. **UserRepository operativo**: `create_or_update(provider, oauth_id, email...)` esta listo para recibir las llamadas del callback OAuth de T1.3.
3. **Feature flag funciona**: el codigo nuevo no rompe el codigo legacy. Mientras `KUDOS_USE_POSTGRES=false`, todo sigue como antes.
4. **Tests smoke estan**: cuando Eduardo levante Postgres en cualquier entorno, puede correr `pytest` y verificar verde.
5. **Alembic configurado y testeado por sintaxis**: migracion `001_initial_schema.py` parsea Python correctamente.

### Pre-requisitos antes de T1.3

Eduardo necesita hacer (en este orden):

1. **Verificar `kudos-db` activo** en Render dashboard. Si no, provisionar Postgres Standard.
2. **Push de T1.2** (comando seccion 11).
3. **Setear env vars** en Render `kudos-api-v2`:
   - `DATABASE_URL` (copia del Connection String del dashboard kudos-db)
   - `KUDOS_USE_POSTGRES=true`
   - `KUDOS_ADMIN_TOKEN=<random 64 chars>` (genera con `openssl rand -hex 32` o cualquier random)
4. **Disparar redeploy** del `kudos-api-v2`.
5. **Correr migracion** desde Render shell:
   ```bash
   alembic upgrade head
   ```
6. **Correr seed**:
   ```bash
   python -m kudos_engine.db.seed.seed_initial
   ```
7. **Verificar**: `curl https://kudos-api-v2.onrender.com/api/db/health`

Si los 7 pasos pasan verdes, podemos arrancar **T1.3 OAuth** en el siguiente prompt.

---

## 11. COMANDO PUSH T1.2

```powershell
cd C:\Users\efert\kudos_project
git add kudos_engine\requirements.txt ^
        kudos_engine\db\ ^
        kudos_engine\apps\main.py ^
        kudos_engine\apps\db_admin\ ^
        kudos_engine\tests\ ^
        alembic.ini ^
        scripts_local\setup_t12_postgres.py ^
        scripts_local\write_informe_t12.py ^
        INFORME_H1_T1.2_POSTGRES.md ^
        INFORME_H1_T1.2_POSTGRES.docx
git -c user.email=eduardo@kudos.world -c user.name="Eduardo" commit -m "T1.2 POSTGRES FOUNDATION · 13 tablas SQLAlchemy + Alembic + Repository layer + Seed + WHY signals + tests + feature flag KUDOS_USE_POSTGRES"
git push origin master
```

---

## 12. ESTADO FINAL

| Criterio T1.2 | Resultado |
|---|---|
| Postgres operativo | Codigo listo. Esperando Eduardo active Render. |
| Migraciones operativas | Alembic 001_initial_schema.py listo para `upgrade head`. |
| Persistencia real | Esperando seed + `KUDOS_USE_POSTGRES=true` |
| Datos sobreviven reinicios | Garantizado tras activacion |
| Base preparada para OAuth | SI · `users` + `refresh_tokens` + UserRepository listos |
| Base preparada para Signals | SI · `poi_signals` + SignalsRepository con recompute |
| Base preparada para HDG | SI · WHY signals + telemetry_events + emotion_profile |

---

## FIRMA

**Claude Cowork · CTO**
T1.2 ejecutado segun autorizacion PROMPT 3/16.
13 tablas / 5 repositorios / 8 tests / 0 errores sintaxis Python.
Listo para revision CEO + GPT-5 + emision PROMPT 4/16 (T1.3 Google OAuth + JWT).
"""

# Atomic write
d = os.path.dirname(OUT)
fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
try:
    with os.fdopen(fd, "wb") as f:
        f.write(CONTENT.encode("utf-8"))
    os.replace(tmp, OUT)
except Exception:
    try: os.unlink(tmp)
    except: pass
    raise

print(f"WROTE: {OUT}")
print(f"SIZE: {os.path.getsize(OUT)} bytes")
