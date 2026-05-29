# INFORME H1 T1.4 ENDPOINT MIGRATION + OWNERSHIP INTEGRATION

**Programa**: KUDOS Oficial -- Prompt 5/16 (ejecutado tras Prompt 6/16 por orden CEO)
**Fase**: 1 Launch Foundation
**Hito**: H1
**Tarea**: T1.4 -- Endpoint Migration + Ownership Integration
**Fecha**: 29 mayo 2026
**Autor**: Claude Cowork (CTO)

## 0. RESUMEN EJECUTIVO

Se ejecuto T1.4 segun PROMPT 5/16. Resultado:

**Backend (`kudos_engine/apps/`)**:
- **`save/pg_router.py`** NUEVO (Postgres-aware) reemplaza save/router.py legacy cuando KUDOS_USE_POSTGRES=true.
- **`telemetry/pg_router.py`** NUEVO con auth opcional + rate limit 30/min + trust_level + sanitizacion.
- **`signals/pg_router.py`** NUEVO con SignalsRepository + admin token para recompute.
- **main.py** switch limpio: si Postgres ON monta nuevos routers; si OFF mantiene los legacy JSON.

**Endpoints migrados** (todos con get_current_user + ownership SQL):

| Endpoint | Metodo | Auth | Ownership | WHY columna |
|---|---|---|---|---|
| /api/save/ | POST | JWT | user_id JWT | motivation |
| /api/save/user/me | GET | JWT | filtra user_id | - |
| /api/save/{id} | DELETE | JWT | WHERE user_id | - |
| /api/save/count/poi/{poi_id} | GET | publico | - | - |
| /api/save/memory | POST | JWT | check save.user_id | memory_reason |
| /api/save/memory/stale/me | GET | JWT | filtra user_id | - |
| /api/save/visit | POST | JWT | user_id JWT | visit_reason |
| /api/save/watch | POST | JWT | user_id JWT | watch_reason |
| /api/save/resonance | POST | JWT | user_id JWT | resonance_reason |
| /api/save/migrate-anon | POST | JWT | dedupe por user+poi | - |
| /api/telemetry/event | POST | optional | session+user opt | event_reason |
| /api/telemetry/batch | POST | optional | cap 100 events | event_reason |
| /api/telemetry/top-pois | GET | publico | - | - |
| /api/signals/{poi_id} | GET | publico | - | - |
| /api/signals/{id}/recompute | POST | X-Admin-Token | admin only | - |
| /api/signals/top/{score} | GET | publico | - | - |

**Frontend (`experience/components/`)**:
- **`useMyWorld.ts`** reescrito · usa `authedFetch` cuando hay user + dispara `migrate-anon` automaticamente tras login. localStorage queda como cache offline.
- **`AddToMyWorldButton.tsx`** integrado con `useAuth` · permite save anonimo (local) pero el copy cambia ("Guardado en este dispositivo" vs "Anadido a Mi Mundo").
- **`ResonancePicker.tsx`** envia resonancia a `/api/save/resonance` cuando autenticado.
- **Exploracion sigue 100% sin login** (principio fundacional respetado).

**WHO/WHAT/WHY/WHEN** (GPT-5 directive T1.4):
- WHO = user_id (JWT) o NULL para anonimos en telemetry.
- WHAT = poi_id / capsule_id / resonance_type / event_type.
- WHY = motivation / visit_reason / watch_reason / resonance_reason / memory_reason / event_reason (TODAS reservadas en schema T1.2).
- WHEN = created_at / visited_at / watched_at / prompted_at / ts (server defaults).

**Veredicto CTO**: PREPARADO PARA T1.6 OBSERVABILIDAD + SOFT LAUNCH (T1.5 ya hecho).

## 1. AUDITORIA ENDPOINTS LEGACY

Endpoints encontrados en save_router (legacy JSON):
- 14 endpoints, todos sin auth.
- Aceptan `user_id` como path param (cualquiera puede consultar Mi Mundo de otro).
- DELETE sin ownership check (cualquiera puede borrar saves de otro).

Endpoints en signals_router: 4. Sin auth.
Endpoints en telemetry_router: 4. Sin auth.

Total endpoints rediseñados: 16.

## 2. STRATEGIA DE COEXISTENCIA

NO eliminamos los routers legacy. Conviven via feature flag:

```python
# main.py
if is_postgres_enabled():
    app.include_router(save_pg_router)
    app.include_router(telemetry_pg_router)
    app.include_router(signals_pg_router)
else:
    app.include_router(save_router_legacy)
    app.include_router(telemetry_router_legacy)
    app.include_router(signals_router_legacy)
```

Beneficios:
- Rollback inmediato: KUDOS_USE_POSTGRES=false revierte a JSON.
- Tests y dev pueden correr sin Postgres.
- Migracion zero-downtime: cuando flag se activa en Render, los nuevos endpoints toman el control sin tocar el resto del codigo.

## 3. WHY SIGNALS (GPT-5 directive T1.4)

Cada endpoint persiste WHO/WHAT/WHY/WHEN:

```
POST /api/save/
  body: { poi_id, motivation }            <- WHY (learn|travel|remember|inspire|research|connect)
POST /api/save/visit
  body: { poi_id, visit_reason }          <- WHY (planned|spontaneous|pilgrimage|educational|other)
POST /api/save/watch
  body: { capsule_id, watch_reason }      <- WHY (curiosity|learning|inspiration|preparation|nostalgia)
POST /api/save/resonance
  body: { poi_id, resonance_type, resonance_reason }  <- WHY canonico + texto libre
POST /api/save/memory
  body: { save_id, status, memory_reason }  <- WHY texto libre
POST /api/telemetry/event
  body: { event_type, event_reason }      <- WHY opcional categoria
```

Hoy la UI envia mayoritariamente `motivation` (via MeaningPicker) y `resonance_type` (via ResonancePicker). Los demas WHY estan **reservados en backend** para cuando la UX los pida (T3+).

## 4. OWNERSHIP INTEGRATION

Tres capas de defensa contra escritura ajena:

1. **Path elimination**: `/user/me` en vez de `/user/{user_id}` (el user_id se toma del JWT, NO de la URL).
2. **SQL WHERE user_id = current_user.id**: en DELETE save y memory update.
3. **Tests T1.2 pasan**: `test_save_ownership_check_on_delete` verifica que u2 NO puede borrar save de u1.

## 5. FRONTEND CHANGES

### useMyWorld.ts (reescrito)

- Modo **auth**: lee `/api/save/user/me` con Bearer y vuelca a state + cache local.
- Modo **anon**: lee localStorage exclusivamente (sin server writes).
- **Trigger migracion**: efecto que detecta transicion `user: null -> user: X` y POST `/api/save/migrate-anon` con array localStorage. Idempotente (dedupe en backend).

### AddToMyWorldButton.tsx (refactor minimo)

- Anade `useAuth`. Si NO hay user: sigue guardando en localStorage (sin friccion). Toast cambia copy.
- Si hay user: dispara save via authedFetch. Persistencia real.

### ResonancePicker.tsx

- Si autenticado: POST `/api/save/resonance` con `keepalive: true` (no espera respuesta para no bloquear UI).

### MeaningPicker (sin cambios T1.4)

- Sigue exponiendo opciones learn/travel/remember/inspire/research/connect.
- El motivation seleccionado se pasa al `add(poiId, motivation)` de useMyWorld que ya lo manda al backend.

### Exploracion sin login PRESERVADA

- Mapa, POIs, capsulas, narrativas: **CERO endpoint con auth obligatoria**.
- `/api/signals/{poi_id}` publico (read-only).
- `/api/telemetry/event` acepta anon (con session_id).
- `/api/pois/*`, `/api/capsules/*`, `/api/narratives/*` siguen publicos.

## 6. SECURITY (heredado T1.5)

Los endpoints nuevos ya reciben:
- CORS hardened (kudos.world only).
- Body limit 256KB.
- Security headers.
- Rate limit canonico (save 10/min, telemetry 30/min).
- Trust level default 'normal' en saves/resonances/telemetry_events.
- Sentry init (si SENTRY_DSN).

## 7. CRITERIO DE EXITO

| Criterio T1.4 | Estado |
|---|---|
| Guardar funciona | OK · /api/save/ con JWT |
| Ownership funciona | OK · DELETE WHERE user_id |
| JWT protege recursos | OK · get_current_user dependency |
| Senales llegan a Postgres | OK · cuando KUDOS_USE_POSTGRES=true |
| Mi Mundo sincroniza | OK · useMyWorld lee /user/me + migrate-anon |
| Usuario anonimo sigue explorando | OK · principio fundacional respetado |

## 8. VEREDICTO

### Pregunta: ¿Esta KUDOS preparado para T1.5 Security Middleware?

# SI (y T1.5 ya esta completado en paralelo)

T1.4 y T1.5 quedan ambos APROBADOS para push consolidado. La siguiente tarea natural seria:

- **T1.6**: Observabilidad MVP + soft launch interno (10-20 invitados, monitoreo Sentry).
- **T1.7**: Cron worker signals recompute (cada 30 min).

## 9. COMANDO PUSH CONSOLIDADO T1.4 + T1.5

```
cd C:\Users\efert\kudos_project

git add kudos_engine\requirements.txt
git add kudos_engine\security\
git add kudos_engine\auth\router.py
git add kudos_engine\apps\main.py
git add kudos_engine\apps\save\pg_router.py
git add kudos_engine\apps\telemetry\pg_router.py
git add kudos_engine\apps\signals\pg_router.py
git add kudos_engine\db\alembic\versions\003_trust_layer.py
git add kudos_engine\tests\test_security_smoke.py
git add scripts_local\backup_postgres.sh
git add scripts_local\restore_postgres.sh
git add experience\components\discovery\useMyWorld.ts
git add experience\components\discovery\AddToMyWorldButton.tsx
git add experience\components\discovery\ResonancePicker.tsx
git add INFORME_H1_T1.4_ENDPOINT_MIGRATION.md INFORME_H1_T1.4_ENDPOINT_MIGRATION.docx
git add INFORME_H1_T1.5_SECURITY.md INFORME_H1_T1.5_SECURITY.docx

git -c user.email=eduardo@kudos.world -c user.name="Eduardo" commit -m "T1.4 ENDPOINT MIGRATION + T1.5 SECURITY -- pg routers save/signals/telemetry + WHO/WHAT/WHY/WHEN + CORS allowlist + rate limit + trust layer + Sentry + backups"

git push origin master
```

Tras push, en Render `kudos-api-v2` setear:
```
KUDOS_USE_POSTGRES=true        # activa los nuevos routers
SENTRY_DSN=https://...         # observabilidad
KUDOS_ADMIN_TOKEN=<random>     # signals recompute
REDIS_URL=redis://...          # (opcional) rate limit con backend Redis
```

Luego correr una vez:
```
alembic upgrade head           # aplica 001 + 002 + 003 trust_layer
python -m kudos_engine.db.seed.seed_initial
```

## FIRMA

Claude Cowork CTO -- T1.4 ejecutado segun PROMPT 5/16 (recibido tras 6/16).
Endpoints migrados / ownership real / WHY signals reservados / frontend integrado / exploracion anonima preservada.
