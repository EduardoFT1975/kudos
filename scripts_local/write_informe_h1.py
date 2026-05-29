"""Escribe INFORME_H1_T1.0_ARQUITECTURA_LAUNCH.md atomicamente."""
import os, tempfile

ROOT = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
if not os.path.exists(ROOT):
    ROOT = r"C:\Users\efert\kudos_project"

OUT = os.path.join(ROOT, "INFORME_H1_T1.0_ARQUITECTURA_LAUNCH.md")

CONTENT = r"""# INFORME H1 · T1.0 · ARQUITECTURA DEFINITIVA DE LANZAMIENTO

**Programa**: KUDOS Oficial — Prompt 1/16
**Fase**: 1 — Launch Foundation
**Hito**: H1 — Arquitectura de Lanzamiento
**Tarea**: T1.0 — Diseno tecnico definitivo
**Fecha**: 29 de mayo de 2026
**Autor**: Claude Cowork (CTO)
**Destinatarios**: Eduardo (CEO) · GPT-5 (CPO/CSO)

---

## NOTA PREVIA DEL CTO

Este documento es **arquitectonico, no operativo**. No contiene codigo, no se ejecuta nada. Su unico proposito es **bloquear las decisiones tecnicas de Fase 1 antes de empezar a construir**, porque un error aqui se paga durante anos.

Tres principios que aplico a todas las decisiones:

1. **MVP serio, no escala 1B todavia**. Disenamos para 10k usuarios concurrentes maximo. Cualquier cosa por encima requerira una segunda iteracion. Esto no es debilidad, es disciplina de no sobreingenieria.
2. **Compatibilidad futura con HDG / Merit / Narrative / World Graph**. Toda decision de schema y de API se valida contra "¿esto bloquea el HDG mas adelante?". Si bloquea, se descarta.
3. **Brutalmente honesto**. Si una decision aprobada por el CPO necesita revisarse, lo digo aqui.

**Una correccion al CPO antes de empezar** (regla 6 del prompt):
- La auditoria H0 dijo "Postgres provisionado pero NO conectado". **Eduardo debe verificar primero** si el servicio `kudos-db` sigue activo en Render dashboard. Si fue eliminado por inactividad del free tier, hay que reprovisionarlo. No cambia el plan, pero cambia el primer paso operativo.

---

## 1. ARQUITECTURA OBJETIVO

### 1.1 Diagrama logico

```
   [ Usuario navegador / movil ]
              |
              | HTTPS
              v
   +------------------------+
   |  kudos-frontend        |   Next.js 15 (SSR + edge runtime selectivo)
   |  Render Web Service    |   Auth.js v5 maneja sesion OAuth
   +------------------------+
              |
              | fetch(/api/*) con Bearer JWT
              v
   +------------------------+
   |  kudos-api-v2          |   FastAPI 0.110 (Python 3.11) Docker
   |  Render Web Service    |   Middleware: CORS estricto + slowapi rate limit + JWT verify
   +------------------------+
        |                |
        |                +---------> [ Sentry ] errores + traces
        |
        +---> SQLAlchemy 2.0 + asyncpg
        |
        v
   +------------------------+
   |  kudos-db (Postgres 16)|   Persistencia productiva
   |  Render Postgres       |   pgvector opcional fase 5 (HDG embeddings)
   +------------------------+

   +------------------------+      +------------------------+
   |  kudos-worker          |      |  kudos-redis           |
   |  Background Worker     |      |  Render Key Value      |
   |  - Cron signals recompute     |  - Rate limit token bucket
   |  - Pipeline capsulas batch    |  - Cache hot reads (signals top)
   |  - Stale memory scan          |  - Session blacklist refresh tokens
   +------------------------+      +------------------------+

   +------------------------+
   |  CDN externo (Cloudflare R2 o Bunny)
   |  - Videos .mp4 capsulas (24+ archivos, evita coste egress Render)
   |  - Imagenes POI mas pesadas
   +------------------------+
```

### 1.2 Estado actual vs estado objetivo

| Componente | Estado actual | Estado objetivo | Cambio |
|---|---|---|---|
| Frontend | Next.js 15 en Render (free tier) | Next.js 15 en Render Standard $7/mes | Upgrade tier (elimina cold start ~30s) |
| Auth | No existe. `anon_id` localStorage | NextAuth v5 + Google OAuth + JWT | Nuevo |
| Backend | FastAPI v2 Render free | FastAPI v2 Render Standard $7/mes + middleware completo | Upgrade tier + middleware |
| Persistencia | JSON files en disco efimero | Postgres 16 + SQLAlchemy 2.0 + Alembic | Reemplazo total |
| Cache | Ninguna | Redis (Render Key Value free) | Nuevo |
| Worker | Script local manual | Render Background Worker | Nuevo |
| CDN videos | Bundle Next.js estatico | Cloudflare R2 (gratis 10GB egress) | Nuevo |
| Observabilidad | console.log | Sentry frontend + backend | Nuevo |
| Tests | 0 | 30+ tests criticos (vitest + pytest) | Nuevo |
| CORS | `["*"]` | Lista blanca: kudos.world + onrender dominios | Restringir |
| Rate limit | Ninguno | slowapi (FastAPI) + Redis backend | Nuevo |
| Telemetria | POST sin auth | POST require JWT + sanitizacion | Anadir auth |
| Signals recompute | Manual local | Cron Render worker cada 30 min | Automatizar |

**Total servicios Render**: 4 actuales (frontend, api-v2, worker antiguo "kudos", db sin uso) -> 5 limpios (frontend, api-v2, worker, db, redis).

**Coste mensual estimado Render**: ~$28/mes ($7 frontend + $7 api + $7 db + $7 worker + $0 redis free tier). Hoy: $0 free tier con cold starts.

**Coste mensual Sentry/CDN**: $0 free tier para ambos en MVP.

### 1.3 Ventajas

- **Persistencia real**: usuarios pueden cerrar pestana, volver desde otro dispositivo, recuperan Mi Mundo.
- **Sin cold start**: Standard tier garantiza respuesta <500ms desde la primera peticion.
- **Auditoria de seguridad pasa**: CORS restrictivo, JWT, rate limit, sanitizacion.
- **HDG escalable**: signals se recomputan en worker dedicado sin bloquear API.
- **CDN externo**: cada capsula nueva no requiere redeploy de Next.js.

### 1.4 Riesgos de la arquitectura objetivo

- **Coste mensual ~$28**: por encima de free tier, pero asumible para soft launch.
- **Complejidad operativa aumenta**: 5 servicios vs 4, requiere monitorizar cada uno.
- **NextAuth v5 + FastAPI no es nativo**: hay que verificar JWT cross-stack manualmente (ver seccion 3).
- **Migracion JSON -> Postgres requiere downtime corto** (5-10 min) o estrategia dual-write.

---

## 2. SISTEMA DE AUTENTICACION

### 2.1 Comparativa de opciones

| Criterio | A) Google + Apple OAuth | B) Magic Link Email | C) Mixto (Magic Link + OAuth) |
|---|---|---|---|
| Friccion de signup | Baja (1 click) | Media (esperar email) | Variable |
| Conversion estimada | 75-85% | 45-60% | 70-80% |
| Confianza percibida | Alta (marca conocida) | Media (mas tecnico) | Alta |
| Implementacion frontend | Media (NextAuth lo automatiza) | Baja (NextAuth + Resend) | Alta (dos flujos) |
| Implementacion backend | Media (verificar id_token Google/Apple) | Baja (token Resend) | Alta |
| Apple OAuth coste | $99/ano Apple Developer | $0 | $99/ano |
| Apple OAuth requisito tecnico | Dominio verificado + clave .p8 | n/a | Dominio verificado |
| Sin cuenta Google | Bloqueado | OK | OK |
| Recuperacion cuenta | Recupera Google = recupera todo | Solo email | Mixto |
| Privacy posicionamiento | Apple "Hide my email" | Solo email | Mejor de ambos |
| GDPR | OAuth provider gestiona | KUDOS gestiona email | Mixto |
| Coste mantenimiento | Bajo (Google estable) | Bajo | Medio |
| Escalabilidad movil | Excelente (deep link nativo) | OK (universal link) | Excelente |

### 2.2 Recomendacion CTO

**Opcion seleccionada: A) Google + Apple OAuth**, pero con secuencia diferida:

1. **Fase 1A (T1.3)**: Solo Google OAuth — cubre ~80% del mercado, validacion rapida.
2. **Fase 1B (T1.5)**: Anadir Apple OAuth tras validar conversion — necesario para AppStore futuro.
3. **NO Magic Link en MVP** — coincide con decision GPT-5. Demasiada friccion para producto de descubrimiento que vive de impulso emocional.

**Razon estrategica**: KUDOS aspira a movil (AppStore + Play). Apple OAuth sera obligatorio para AppStore review. Mejor disenarlo desde dia 1 aunque se implemente en T1.5.

### 2.3 Flujo completo (usuario nuevo)

```
1. Usuario llega a kudos.world (no autenticado)
   - Banner CTA "Entra con Google" (no bloqueante)
   - Puede explorar /world y /inicio sin auth (modo anonimo, signals trackeados sin user_id)

2. Usuario decide guardar un POI (primera accion de valor)
   - Modal "Para guardar tu mundo, necesitamos saber quien eres" -> [Google] [Apple cuando este]
   - Click Google -> redirect a accounts.google.com
   - Usuario autoriza -> redirect a kudos.world/auth/callback/google?code=...

3. Frontend (Auth.js v5) intercambia code por id_token y profile
   - Llama POST /api/auth/oauth/google con id_token
   - Backend FastAPI:
     a) Verifica id_token contra Google JWKS (jose / authlib)
     b) Busca user por (oauth_provider, oauth_id)
     c) Si no existe -> CREATE user (email, locale, primary_interest si onboarding completado)
     d) Genera Access JWT (15 min) + Refresh JWT (7d)
     e) Refresh JWT: guarda hash en tabla refresh_tokens + cookie httpOnly SameSite=Lax

4. Frontend recibe { access_token, user }
   - access_token: React Query / Zustand en memoria (NUNCA localStorage)
   - refresh_token: cookie set por backend
   - Reanuda accion "guardar POI" -> POST /api/save con Authorization: Bearer

5. Cuando access_token caduca (15 min):
   - Frontend hace POST /api/auth/refresh sin body (cookie va sola)
   - Backend rota refresh_token (invalida el viejo, emite nuevo) + nuevo access_token
   - Frontend reintenta accion fallida
```

### 2.4 Casos edge

- **Usuario sin cuenta Google + sin cuenta Apple**: en T1.5 fase final podemos anadir Magic Link como tercera opcion. NO en MVP.
- **Usuario que pierde acceso a su Google**: politica "contacta soporte" en T1.5. NO se diseña recuperacion manual en MVP.
- **Usuario que cambia Google email**: oauth_id es estable, email cambia. Se respeta.
- **Usuario anonimo que decide registrarse**: migrar saves de localStorage al server tras login (un endpoint POST /api/save/migrate-anon recibe el array localStorage y lo persiste).

---

## 3. ARQUITECTURA JWT

### 3.1 Decisiones

| Token | Algoritmo | TTL | Almacenamiento | Revocacion |
|---|---|---|---|---|
| Access | HS256 (HMAC SHA-256) | 15 minutos | Memoria React (NUNCA localStorage) | Stateless, caduca rapido |
| Refresh | HS256 + jti unico | 7 dias | Cookie httpOnly SameSite=Lax Secure | Tabla `refresh_tokens` con hash; logout = DELETE row |

**Por que HS256 y no RS256**: solo el backend firma y verifica. No hay un tercer servicio que necesite verificar sin secret. HS256 es mas simple, igual de seguro en este contexto, y mas barato computacionalmente.

**Por que NO localStorage para access token**: vulnerable a XSS. Aunque Next.js mitiga XSS, asumimos defensa en profundidad. Memoria React + cookie httpOnly = doble defensa.

**Por que cookie SameSite=Lax (no Strict)**: permitimos redirect desde OAuth provider (Google) sin perder cookie. Strict romperia el flujo.

### 3.2 Estructura del Access Token

```json
{
  "iss": "kudos.world",
  "sub": "<user_id_uuid>",
  "iat": 1716969600,
  "exp": 1716970500,
  "scope": "user",
  "interest": "historia"   // opcional, optimizacion feed
}
```

Tamano objetivo: <800 bytes (para evitar problemas en headers HTTP).

### 3.3 Estructura del Refresh Token

```json
{
  "iss": "kudos.world",
  "sub": "<user_id_uuid>",
  "jti": "<token_uuid_uniq>",
  "iat": 1716969600,
  "exp": 1717574400
}
```

El `jti` es UNICO por refresh emitido. La tabla `refresh_tokens` guarda:

```
refresh_tokens:
  jti TEXT PRIMARY KEY
  user_id UUID FK -> users.id
  hash TEXT NOT NULL                  -- sha256 del JWT entero, para verificar
  user_agent TEXT
  ip_hash TEXT
  created_at TIMESTAMPTZ
  rotated_to TEXT REFERENCES refresh_tokens(jti) NULL
  revoked_at TIMESTAMPTZ NULL
```

### 3.4 Rotacion

En cada `POST /api/auth/refresh`:
1. Verificar JWT + buscar jti en tabla.
2. Si `revoked_at IS NOT NULL` -> rechazar (posible ataque replay).
3. Marcar viejo jti como `revoked_at = now()` + `rotated_to = nuevo_jti`.
4. Emitir nuevo refresh con nuevo jti.
5. Devolver access_token nuevo + setear cookie con nuevo refresh.

**Si se detecta uso de un refresh ya rotado** (`rotated_to IS NOT NULL` al intentar usarlo): revocar TODA la cadena del usuario (login forzado en todos los devices). Es defensa contra robo de refresh.

### 3.5 Logout

- Logout normal: `DELETE refresh_tokens WHERE jti = ?`. El access_token sigue valido hasta los 15 min pero al no poder refrescar, el usuario sale efectivamente.
- Logout en todos los dispositivos: `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ?`.

### 3.6 Secret management

- `JWT_SECRET` en Render env vars (mismo en backend y en Auth.js front si se valida cross-stack).
- Rotacion de secret: solo cuando hay sospecha de leak. Provoca logout masivo.
- NUNCA en repo, NUNCA en codigo.

### 3.7 Riesgos JWT y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| XSS roba access_token | Memoria React (no localStorage). CSP estricta. |
| CSRF roba refresh cookie | SameSite=Lax + verificar Origin header en /api/auth/refresh |
| Replay de refresh robado | Rotacion estricta + revocacion en cadena |
| Token tampering | HS256 firma. Cambio en payload -> verificacion falla. |
| Long-lived token | TTL 15 min access, 7d refresh. Logout invalida. |
| Secret leak | Variables Render solo accesibles por owner. |

---

## 4. POSTGRES — DISENO DEFINITIVO

### 4.1 Tablas principales

```
users
  id UUID PK
  email TEXT UNIQUE NOT NULL
  oauth_provider TEXT NOT NULL CHECK IN ('google','apple','anon')
  oauth_id TEXT NOT NULL                  -- sub del id_token
  display_name TEXT
  avatar_url TEXT
  locale TEXT DEFAULT 'es'
  primary_interest TEXT                   -- historia / arte / naturaleza / misterio / sociedad
  created_at TIMESTAMPTZ DEFAULT now()
  last_seen_at TIMESTAMPTZ
  deleted_at TIMESTAMPTZ NULL             -- soft delete GDPR
  UNIQUE (oauth_provider, oauth_id)

refresh_tokens                            -- (ver seccion 3.3)
  jti TEXT PK
  user_id UUID FK
  hash TEXT
  user_agent TEXT
  ip_hash TEXT
  created_at TIMESTAMPTZ
  rotated_to TEXT NULL
  revoked_at TIMESTAMPTZ NULL
  INDEX (user_id)

saves                                     -- Mi Mundo (World Collection Engine)
  id UUID PK
  user_id UUID FK
  poi_id TEXT NOT NULL                    -- wd-Qxxx (no FK porque POIs son manifest)
  capsule_id TEXT NULL
  collection_type TEXT DEFAULT 'personal' -- personal / want_to_visit / visited
  motivation TEXT NULL                    -- 5 valores: aprender, conectar, recordar, planear, inspirar
  themes JSONB DEFAULT '[]'               -- ["historia", "arte"]
  emotional_reason TEXT NULL
  memory_status TEXT DEFAULT 'fresh'      -- fresh / aging / stale
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ
  INDEX (user_id, created_at DESC)
  INDEX (poi_id)                          -- count por POI

visits                                    -- VisitedWorld
  id UUID PK
  user_id UUID FK
  poi_id TEXT NOT NULL
  visited_at TIMESTAMPTZ
  source TEXT                             -- gps / manual / capsule
  INDEX (user_id, visited_at DESC)

watched                                   -- WatchedCapsule
  id UUID PK
  user_id UUID FK
  capsule_id TEXT NOT NULL
  poi_id TEXT
  watched_at TIMESTAMPTZ
  completion_pct INT                      -- 0..100
  INDEX (user_id, watched_at DESC)

resonances                                -- EmotionalResonance
  id UUID PK
  user_id UUID FK
  poi_id TEXT NOT NULL
  capsule_id TEXT NULL
  resonance_type TEXT NOT NULL            -- asombro / aprendizaje / inspiracion / conexion / nostalgia
  intensity INT DEFAULT 1                 -- 1..5
  created_at TIMESTAMPTZ
  INDEX (poi_id, resonance_type)          -- aggregate breakdown

poi_signals                               -- HDG aggregate por POI
  poi_id TEXT PK
  discovery_score REAL DEFAULT 0
  importance_score REAL DEFAULT 0
  memory_score REAL DEFAULT 0
  emotion_score REAL DEFAULT 0
  future_value_score REAL DEFAULT 0
  emotion_profile JSONB DEFAULT '{}'      -- {asombro: 0.45, aprendizaje: 0.30, ...}
  total_views INT DEFAULT 0
  total_saves INT DEFAULT 0
  total_visits INT DEFAULT 0
  total_resonances INT DEFAULT 0
  last_signal_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  INDEX (discovery_score DESC)            -- top discovery
  INDEX (importance_score DESC)
  INDEX (memory_score DESC)
  INDEX (emotion_score DESC)
  INDEX (future_value_score DESC)

telemetry_events                          -- HDG capture raw
  id BIGSERIAL PK
  user_id UUID FK NULL                    -- nullable para anonimos
  session_id TEXT NOT NULL
  event_type TEXT NOT NULL
  poi_id TEXT NULL
  capsule_id TEXT NULL
  payload JSONB DEFAULT '{}'
  ts TIMESTAMPTZ DEFAULT now()
  INDEX (user_id, ts DESC)
  INDEX (event_type, ts DESC)
  INDEX (poi_id, ts DESC)
  -- PARTITION BY RANGE (ts) en fase escala (ver 4.4)

narratives                                -- (manifest estatico hoy; fase 3 entra a Postgres)
  id UUID PK
  poi_id TEXT NOT NULL
  narrative_type TEXT NOT NULL            -- Hidden Truth / Mystery / etc
  title TEXT
  hook TEXT
  duration_s INT
  emotion TEXT
  body_md TEXT                            -- markdown completo
  language TEXT DEFAULT 'es'
  generated_by TEXT                       -- 'anthropic-claude-sonnet' / 'manual'
  generated_at TIMESTAMPTZ
  INDEX (poi_id)
  UNIQUE (poi_id, narrative_type, language)

poi_relationships                         -- World Graph
  poi_id TEXT NOT NULL
  related_id TEXT NOT NULL
  relation_type TEXT NOT NULL             -- geographical / thematic / historical / temporal
  weight REAL DEFAULT 0.5
  distance_km REAL NULL
  PK (poi_id, related_id, relation_type)
  INDEX (poi_id)
  INDEX (related_id)

capsules                                  -- metadata, video va en CDN
  id TEXT PK                              -- 'wd-Q10285' o 'wd-Q10285-gladiadores'
  poi_id TEXT NOT NULL
  title TEXT
  duration_s INT
  url TEXT                                -- https://cdn.kudos.world/wd-Q10285.mp4
  thumb_url TEXT
  vtt_url TEXT                            -- subtitulos
  scene_manifest JSONB
  status TEXT DEFAULT 'published'         -- draft / published / archived
  created_at TIMESTAMPTZ
  INDEX (poi_id)
  INDEX (status, created_at DESC)
```

### 4.2 Tablas auxiliares

```
user_intents                              -- onboarding multi-intent (preparado futuro)
  user_id UUID FK
  intent TEXT
  added_at TIMESTAMPTZ
  PK (user_id, intent)

memory_prompts                            -- log de prompts disparados
  id UUID PK
  user_id UUID FK
  save_id UUID FK
  prompted_at TIMESTAMPTZ
  response TEXT                           -- still_relevant / aging / released / dismissed
  INDEX (user_id, prompted_at)
```

### 4.3 Indices criticos

Ya listados arriba. Resumen de los 10 mas importantes:
1. `users (oauth_provider, oauth_id)` — login lookup
2. `saves (user_id, created_at DESC)` — Mi Mundo timeline
3. `saves (poi_id)` — count por POI
4. `poi_signals (discovery_score DESC)` — top discovery feed
5. `telemetry_events (user_id, ts DESC)` — user activity
6. `telemetry_events (event_type, ts DESC)` — analytics queries
7. `resonances (poi_id, resonance_type)` — breakdown emocional
8. `refresh_tokens (user_id)` — logout all devices
9. `poi_relationships (poi_id)` — World Graph queries
10. `narratives (poi_id)` — multi-capsule visible

### 4.4 Escalabilidad

| Escala | Cambios necesarios |
|---|---|
| MVP (0-10k usuarios) | Schema tal cual. Render Postgres Standard 1GB. |
| 100k usuarios | Anadir read replica. Mover `telemetry_events` a Postgres TimescaleDB o BigQuery export. |
| 1M usuarios | Particionar `telemetry_events BY RANGE (ts)` semanal. Anadir Redis cache para `poi_signals top`. Considerar pgvector si HDG entra a embeddings. |
| 10M usuarios | Sharding por `user_id`. Mover `poi_signals` a cache + recompute eventual. Considerar migrar telemetria a sistema dedicado (Snowflake / ClickHouse). |

**Decision MVP**: NO sharding, NO replica, NO particionamiento. Solo schema limpio + indices. Anadiremos cosas cuando los signals reales lo justifiquen.

### 4.5 Tablas criticas para los motores

- **Mi Mundo**: `users`, `saves`, `visits`, `watched`, `resonances`.
- **Signals (HDG)**: `poi_signals`, `telemetry_events`, derivadas de saves/visits/watched/resonances.
- **Merit**: deriva 100% de `poi_signals` (no tiene tabla propia, solo ponderacion en cliente).
- **Narrative**: `narratives` + manifest estatico hibrido (fase 3).
- **World Graph**: `poi_relationships` + manifest estatico hibrido.
- **HDG complete**: usa todas las anteriores + `user_intents` + `memory_prompts` + futuras `friendships` y `routes` en fase 5.

---

## 5. MIGRACION JSON -> POSTGRES

### 5.1 Realidad importante

La auditoria H0 confirmo: **`kudos_engine/state/apps_v2/` esta VACIO en sandbox**. No hay datos de usuario reales que migrar (la APP en produccion guarda en localStorage, no en server). Lo unico que hay como "datos" son los manifests estaticos:
- `experience/public/capsules/index.json` (11 capsulas)
- `experience/public/data/narratives/index.json` (~273KB)
- `experience/public/data/relationships/index.json` (~32KB)
- `experience/public/data/wikidata/*.json` (8 paises, ~1.5MB cada)

**Conclusion**: no es una migracion, es una **carga inicial (seed)**.

### 5.2 Estrategia

```
Fase A: setup schema
  - Crear todas las tablas (Alembic migracion #001).
  - Indices.
  - Tablas vacias.

Fase B: seed estatico (poi_relationships, narratives, capsules)
  - Script Python `seed_initial.py` lee JSON manifests y popula Postgres.
  - Idempotente: UPSERT en lugar de INSERT.
  - Conservar manifests como fallback (frontend sigue leyendo de /data/* si API caida).

Fase C: dual-write transitorio (1 semana)
  - Frontend escribe en localStorage Y en API.
  - API escribe en Postgres.
  - localStorage queda como "buffer offline" + fallback si API caida.

Fase D: switch oficial
  - Frontend deja de leer localStorage para Mi Mundo (solo lo usa como cache temporal mientras API responde).
  - Anuncio "Tu Mi Mundo ahora se sincroniza entre dispositivos".

Fase E: anon -> user migracion (al login)
  - Endpoint POST /api/save/migrate-anon recibe array desde localStorage.
  - Bulk insert con user_id del JWT.
  - localStorage se limpia tras confirmacion del backend.
```

### 5.3 Cero perdida de datos

- **POIs/Narratives/Relationships/Capsules**: estaticos, viven en repo. Cero riesgo.
- **Saves/Resonancias/Telemetria locales**: dual-write fase C garantiza redundancia.
- **Tras switch**: localStorage queda como cache, no como source of truth.

### 5.4 Validacion

Tras seed:
```
SELECT COUNT(*) FROM narratives;             -- > 0
SELECT COUNT(*) FROM poi_relationships;      -- > 0
SELECT COUNT(*) FROM capsules;               -- 11 inicial
SELECT COUNT(DISTINCT poi_id) FROM narratives;
```

Comparar con conteos del manifest fuente. Si difieren, abort + investigate.

### 5.5 Rollback

Si algo falla tras switch:
1. **Feature flag** `KUDOS_USE_POSTGRES=false` en frontend env -> vuelve a localStorage-only.
2. **Cookie de override** `kudos_dbg=local-only` para testing.
3. **Datos Postgres NO se borran** — quedan ahi para retry.

### 5.6 Orden exacto

1. Crear schema (Alembic up).
2. Seed estatico (idempotente).
3. Endpoints API leen/escriben en Postgres (sin tocar frontend).
4. Frontend dual-write (localStorage + API).
5. Validar 1 semana de telemetria + saves consistentes.
6. Switch: frontend = API authoritative.
7. Anuncio publico.
8. Tras 30d, evaluar limpiar localStorage en clientes.

---

## 6. SEGURIDAD

### 6.1 Top 10 riesgos priorizados

| # | Riesgo | Probabilidad | Impacto | Mitigacion | Prioridad |
|---|---|---|---|---|---|
| 1 | Telemetria sin auth -> envenenamiento signals | Alta | Critico | Require JWT + sanitizacion server-side + rate limit por user_id | P0 |
| 2 | CORS abierto `*` permite request desde cualquier origen | Alta | Alto | Lista blanca: kudos.world, kudos-frontend.onrender.com, localhost | P0 |
| 3 | Bot scraping endpoints /api/pois sin limite | Alta | Medio | Cloudflare Turnstile en signup + slowapi 60 req/min per IP | P0 |
| 4 | Replay de refresh token robado | Media | Alto | Rotacion estricta + revocacion en cadena (seccion 3) | P0 |
| 5 | XSS roba access_token | Baja | Alto | CSP estricta + memoria React (no localStorage) | P1 |
| 6 | Saves de otros usuarios borrables (sin auth) | Alta hoy | Critico | JWT required en /api/save/{id} DELETE + check user_id ownership | P0 |
| 7 | Spam OAuth (cuentas Google falsas creadas masivamente) | Baja | Bajo | Email verificado por Google. Rate limit signup 5/h per IP. | P2 |
| 8 | Inyeccion SQL | Muy baja | Critico | SQLAlchemy parameterized queries (no string concat) + tests | P0 |
| 9 | Dependency vulnerability (next.js, fastapi outdated) | Media | Alto | Dependabot + `npm audit` + `pip-audit` semanal | P1 |
| 10 | Postgres backup ausente -> perdida total | Media | Critico | Render Postgres Standard incluye backups diarios 7d retention | P0 |

### 6.2 CORS

```python
# kudos_engine/apps/main.py
ALLOWED_ORIGINS = [
    "https://kudos.world",
    "https://www.kudos.world",
    "https://kudos-frontend.onrender.com",
    "https://kudos-frontend-rsi3.onrender.com",  # actual
]
if os.getenv("ENV") == "dev":
    ALLOWED_ORIGINS += ["http://localhost:3000", "http://localhost:3001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,           # necesario para cookies refresh
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### 6.3 Rate limiting

Stack: **slowapi** (Flask-Limiter port para FastAPI) + backend Redis.

Reglas por defecto:
- `60/minute` por IP en endpoints publicos
- `10/minute` por user_id autenticado en POST /api/save
- `30/minute` por user_id en POST /api/telemetry/event
- `5/minute` por IP en POST /api/auth/* (anti-bruteforce)

Responder `429 Too Many Requests` + header `Retry-After`.

### 6.4 Sanitizacion telemetria

```
POST /api/telemetry/event
{
  "event_type": "poi_view",          # whitelist 18 valores canonicos
  "poi_id": "wd-Q10285",             # regex ^wd-Q[0-9]+$
  "payload": { "duration_ms": 4200 } # JSONB, max 4KB
}
```

Server-side:
- Rechazar event_type fuera de whitelist.
- Rechazar poi_id fuera de regex.
- Truncar payload a 4KB.
- Cap absoluto 1000 eventos/usuario/hora (proteccion HDG).

### 6.5 Bot mitigation

- Cloudflare Turnstile (gratis) en `/api/auth/oauth/*`. Frontend genera token, backend verifica.
- Honeypot field invisible en formularios futuros.
- User-Agent inspection: rechazar UA vacios o conocidos de scrapers (Headless Chrome sin firma).

### 6.6 Telemetria falsa / abuso

- Cap absoluto eventos/usuario/dia (calculado en cliente + reverificado en server).
- Detect spikes: si un user_id genera 100x su media, throttle automatico.
- Signals recompute ignora eventos marcados `suspect=true`.

---

## 7. ARQUITECTURA RENDER

### 7.1 Estado actual (segun contexto previo)

| Servicio | Tipo | Plan | Estado | Observacion |
|---|---|---|---|---|
| kudos-frontend | Web Service Node | Free | Activo | Next.js. Cold start ~30s tras 15 min inactivo. |
| kudos-api-v2 | Web Service Docker | Free | Activo | FastAPI v2 (Capsule Engine). Mismo problema cold start. |
| kudos (legacy) | Web Service Python 3 | Free | Indeterminado | Backend antiguo, posiblemente Django. NO USADO en v2. |
| kudos-db | Postgres 18 | Free? | Indeterminado | Provisionado pero el codigo no lo usa. **Eduardo debe verificar si sigue activo**. |

### 7.2 Objetivo

| Servicio | Tipo | Plan | Razon |
|---|---|---|---|
| kudos-frontend | Web Service Node | Standard $7/mes | Eliminar cold start. Es la cara publica. |
| kudos-api-v2 | Web Service Docker | Standard $7/mes | Eliminar cold start API. |
| kudos-db | Postgres | Standard $7/mes (1GB) | Productivo, backup diario incluido. |
| kudos-worker | Background Worker | Starter $7/mes | Cron signals + capsulas. Sin endpoint publico. |
| kudos-redis | Key Value | Free (25MB) | Rate limit + cache. Si no llega, upgrade $7/mes. |
| ~~kudos (legacy)~~ | — | — | **ELIMINAR**. Pago innecesario si esta activo. |

**Coste total**: $28/mes (worst case $35 si Redis sube).

### 7.3 Cambios concretos en `render.yaml`

```yaml
services:
  - type: web
    name: kudos-frontend
    plan: standard               # CAMBIO: free -> standard
    autoDeploy: true
    envVars:
      - key: NEXT_PUBLIC_KUDOS_API_URL
        value: https://kudos-api-v2.onrender.com
      - key: GOOGLE_CLIENT_ID
        sync: false              # set manual en dashboard
      - key: NEXTAUTH_SECRET
        sync: false
      - key: NEXTAUTH_URL
        value: https://kudos.world

  - type: web
    name: kudos-api-v2
    plan: standard               # CAMBIO: free -> standard
    runtime: docker
    dockerfilePath: ./kudos_engine/Dockerfile
    disk:
      name: kudos-tmp
      mountPath: /tmp/kudos
      sizeGB: 1                  # solo temp files capsulas
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: kudos-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: kudos-redis
          type: keyvalue
          property: connectionString
      - key: JWT_SECRET
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: SENTRY_DSN
        sync: false

  - type: worker
    name: kudos-worker
    plan: starter                # NUEVO
    runtime: docker
    dockerfilePath: ./kudos_engine/Dockerfile.worker
    envVars: ...same as api-v2...
    # Comando arranca scheduler + ejecuta recompute cada 30 min

  - type: keyvalue
    name: kudos-redis
    plan: free
    ipAllowList: []              # accesible solo desde servicios Render del proyecto

databases:
  - name: kudos-db
    plan: standard               # NUEVO o upgrade
    postgresMajorVersion: 16
```

### 7.4 Disco persistente

- `kudos-api-v2`: 1GB disk para uploads temporales (avatars, capsule generation work). NO para datos productivos (van a Postgres).
- `kudos-worker`: sin disco (todo en memoria + Postgres).

### 7.5 Region

Mantener Oregon (us-west). Latencia razonable para Europa (~150ms) y America. Si el 80% del trafico fuera de Europa, mover a Frankfurt.

### 7.6 Dominio

`kudos.world` debe apuntar a `kudos-frontend.onrender.com` via CNAME. SSL automatico Render.

---

## 8. OBSERVABILIDAD

### 8.1 Stack minimo

| Componente | Herramienta | Plan | Coste |
|---|---|---|---|
| Error tracking frontend | Sentry React SDK | Free 5k errores/mes | $0 |
| Error tracking backend | Sentry FastAPI SDK | Mismo proyecto Sentry | $0 |
| Uptime monitoring | BetterStack o UptimeRobot | Free 50 monitors | $0 |
| Logs | Render built-in | Incluido | $0 |
| APM (traces) | Sentry Performance | Free 10k traces/mes | $0 |
| Dashboard custom | Endpoint `/admin/dashboard` + Recharts | Codigo propio | $0 |

**Coste total observabilidad MVP: $0/mes**. Upgrade a Sentry Team ($26/mes) si superamos 5k errores.

### 8.2 Eventos criticos a alertar

| Evento | Severidad | Accion |
|---|---|---|
| API 500 rate > 1% | Critica | Slack #alerts CEO + investigate |
| Postgres connection failure | Critica | Slack + verificar Render status |
| JWT signing failure | Critica | Posible secret leak, rotar |
| Memory > 80% sostenida | Alta | Investigar leak |
| Signals recompute job failure | Media | Reintentar 3x, luego alertar |
| Telemetria spike (>10x media) | Media | Posible bot, throttle |
| Rate limit triggered >100 veces/h | Baja | Log para review |
| Cold start detectado | Info | Confirmar que Standard tier esta activo |

### 8.3 Dashboard interno

`/admin/dashboard` (protegido con `email IN (admins)`):
- Usuarios totales / DAU / WAU / MAU
- Saves totales / saves/usuario media
- Top 10 POIs por discovery_score
- Top 10 POIs por save count ultimas 24h
- Eventos telemetria/hora
- Errores Sentry ultimas 24h
- Latencia P50/P95 API

Implementacion: pagina Next.js que llama a `/api/admin/stats` (auth: email whitelist). Render con Recharts.

---

## 9. PLAN DE EJECUCION (HITO H1)

### 9.1 Tareas en orden

| Tarea | Descripcion | Dependencias | Duracion estimada | Bloqueante para? |
|---|---|---|---|---|
| **T1.1** | Limpieza legacy: borrar `lib/capsule-engine/`, `lib/capsule-generation/`, `lib/cinematic-language/`, `MapScreen.tsx`, `PoiScreen.tsx`, `kudos` (servicio Render antiguo). Quitar `typescript.ignoreBuildErrors`. | Ninguna | 1 dia | T1.9 |
| **T1.2** | Postgres setup: provisionar `kudos-db` Standard. Crear schema Alembic. Migracion #001. Conectar SQLAlchemy desde FastAPI. Seed estatico. | T1.1 | 3-4 dias | T1.3, T1.4 |
| **T1.3** | Google OAuth + JWT: NextAuth v5 frontend. Endpoint `/api/auth/oauth/google` backend. Tabla `users` + `refresh_tokens` activa. Refresh rotation. | T1.2 | 3-4 dias | T1.4 |
| **T1.4** | Migracion endpoints: `save`, `visit`, `watched`, `resonance`, `telemetry`, `signals` leen/escriben Postgres en vez de JSON. Dual-write frontend. | T1.3 | 2-3 dias | T1.6 |
| **T1.5** | Apple OAuth: anadir provider. Requiere cuenta Apple Developer ($99). | T1.3 | 2 dias | NO bloqueante MVP (diferible) |
| **T1.6** | Security middleware: CORS estricto + slowapi rate limit + Redis backend + sanitizacion telemetria + JWT verify en endpoints protegidos. | T1.4 | 1-2 dias | T1.10 |
| **T1.7** | Observabilidad: Sentry frontend + backend + UptimeRobot + dashboard `/admin/stats`. | T1.4 | 1-2 dias | T1.10 |
| **T1.8** | Render upgrade: planes Standard + worker + disk + redis. Actualizar `render.yaml`. | T1.1 | 1 dia | T1.10 |
| **T1.9** | Tests criticos: vitest frontend (auth flow, hooks signals) + pytest backend (endpoints save/auth/signals). Minimo 30 tests. | T1.1 | 3-4 dias | RECOMENDADO antes T1.10 |
| **T1.10** | Soft launch interno: invitar 10-20 personas de confianza. Monitorear Sentry + dashboard. Iterar bugs. | T1.6, T1.7, T1.8 | 2 dias (+ 1 semana monitoreo) | Lanzamiento publico |

### 9.2 Duracion total H1

- Camino critico: T1.1 -> T1.2 -> T1.3 -> T1.4 -> T1.6 -> T1.10 = **15-20 dias laborables**.
- En paralelo: T1.5 (Apple OAuth), T1.7 (Observabilidad), T1.8 (Render upgrade), T1.9 (Tests).
- **3 a 4 semanas calendario** con 1 CTO dedicado + Eduardo disponible para validacion + decisiones OAuth.

### 9.3 Gantt resumido

```
Semana 1:  [T1.1][T1.2 inicio.................]
Semana 2:  [T1.2 fin][T1.3 inicio.............]
Semana 3:  [T1.3 fin][T1.4][T1.6][T1.7][T1.8 ]
Semana 4:  [T1.9 tests][T1.10 soft launch][T1.5 Apple OAuth diferible]
```

### 9.4 Bloqueadores externos a anticipar

1. **Google Cloud Console**: crear OAuth Client ID + Secret. Eduardo o CTO. 30 min.
2. **Apple Developer Program**: $99/ano + verificacion. Solo para T1.5. Eduardo.
3. **Render upgrade billing**: tarjeta credito Eduardo. ~5 min.
4. **Sentry signup**: 10 min.
5. **Cloudflare account** (si usamos Turnstile): 10 min.
6. **DNS kudos.world**: configurar CNAME a Render. Si esta en Namecheap/Cloudflare, 15 min.

---

## 10. VEREDICTO CTO

### 10.1 OBLIGATORIO antes del primer lanzamiento publico

| Tarea | Razon |
|---|---|
| T1.1 Limpieza legacy | Sin esto, cualquier deploy puede romperse por archivos truncados ocultos tras `ignoreBuildErrors`. |
| T1.2 Postgres | Sin esto, saves de usuarios pueden desaparecer en cada reinicio Render. Bloquea promesa "Mi Mundo se sincroniza". |
| T1.3 Google OAuth + JWT | Sin esto, no hay forma de saber quien es quien. Cualquiera puede borrar saves de otros. |
| T1.4 Migracion endpoints a Postgres | Sin esto, T1.2 y T1.3 no se usan. |
| T1.6 Security middleware | Sin esto, abierto a abuso desde dia 1. |
| T1.7 Observabilidad minima | Sin esto, los bugs en produccion son invisibles. |
| T1.8 Render upgrade | Sin esto, primer usuario espera 30s. Conversion se desploma. |

**Subtotal obligatorio**: ~15 dias laborables + 1 semana soft launch = **3-4 semanas**.

### 10.2 RECOMENDADO antes del lanzamiento

| Tarea | Razon |
|---|---|
| T1.9 Tests criticos | Reduce regresiones cuando empiece refactor Fase 2. Aceptable lanzar sin tests, mucho mas seguro con. |
| T1.5 Apple OAuth | Mejora conversion ~15-20% en usuarios iOS. Diferible 1-2 semanas tras launch. |

### 10.3 POSTERIOR (Fase 2+)

- Tier A capsulas (T3 en programa CPO) — ya tenemos contenido para soft launch.
- Cron worker signals — durante MVP basta con recompute manual via endpoint.
- CDN videos — el bundle estatico aguanta hasta ~50 capsulas.
- Friends graph, era temporal, narrativa expansion, A/B testing — Fases 2-5.
- Multi-i18n real — solo ES en launch.

### 10.4 Riesgo si saltamos algun OBLIGATORIO

| Si saltamos | Que pasa |
|---|---|
| T1.2 Postgres | Primer reinicio Render = datos perdidos. Tweet "KUDOS me borro mi mundo" = pesadilla. |
| T1.3 Auth | Cualquiera puede borrar saves. Trolls + scraping incontrolado. |
| T1.6 Rate limit | Un usuario malicioso satura API en 1 minuto = caida total. |
| T1.7 Observabilidad | Bug producto -> no nos enteramos -> usuarios se van silenciosamente. |
| T1.8 Render upgrade | Cold start 30s -> 60% de usuarios cierran antes de cargar. |

### 10.5 Pregunta clave al CEO antes de empezar

- **¿Confirmas presupuesto Render ~$28/mes (+$99 Apple Developer si T1.5)?**
- **¿Quien crea el Google OAuth Client en Google Cloud Console (CEO o CTO)?**
- **¿Dominio kudos.world esta ya registrado y en que registrar (Namecheap, Cloudflare, GoDaddy)?**
- **¿Tienes Sentry account ya o creas una nueva?**

Estas 4 respuestas desbloquean el primer dia de ejecucion.

---

## SINTESIS EJECUTIVA

KUDOS hoy es una **demo navegable de alta fidelidad sin fundamentos productivos**. La auditoria H0 lo confirmo (MVP visible 75%, MVP comercial 55%).

El siguiente paso correcto **no es construir mas features sino construir los fundamentos** sobre los que las features tendran sentido: autenticacion, persistencia, observabilidad.

Esta arquitectura propone hacerlo en **3-4 semanas, ~$28/mes de coste mensual, sin riesgo de retrabajo**, manteniendo total compatibilidad futura con el Human Discovery Graph.

**Veredicto CTO**: Esta arquitectura es ejecutable, robusta, y proporcional al nivel del producto. Recomiendo aprobacion y arranque de **T1.1 en cuanto el CEO conteste las 4 preguntas de la seccion 10.5**.

---

## FIRMA

**Claude Cowork · CTO**
Arquitectura disenada sobre el estado real auditado en H0 T0.1.
Sin codigo ejecutado · sin commits · solo decisiones.
Listo para revision GPT-5 + aprobacion CEO antes de pasar a PROMPT 2/16.
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
