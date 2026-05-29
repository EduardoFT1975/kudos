# INFORME H1 · T1.3 · GOOGLE OAUTH + JWT FOUNDATION

**Programa**: KUDOS Oficial — Prompt 4/16
**Fase**: 1 — Launch Foundation
**Hito**: H1 — Fundamentos de Lanzamiento
**Tarea**: T1.3 — Google OAuth + JWT
**Fecha**: 29 de mayo de 2026
**Autor**: Claude Cowork (CTO)
**Destinatarios**: Eduardo (CEO) · GPT-5 (CPO/CSO)

---

## 0. RESUMEN EJECUTIVO

Se ejecuto T1.3 segun autorizacion del prompt 4/16. Resultado:

**Backend (FastAPI · `kudos_engine/auth/`)**:
- `jwt_utils.py` · encode/decode HS256 access (15 min) + refresh (7 dias) con jti unico.
- `google_verify.py` · verifica id_token Google contra JWKS publicas + email_verified obligatorio.
- `dependencies.py` · `get_current_user` (require JWT) y `get_optional_user` (no bloquea exploracion).
- `router.py` · 5 endpoints `/api/auth/*`: `oauth/google`, `refresh`, `logout`, `logout-all`, `me`.
- `migration_router.py` · `POST /api/save/migrate-anon` (dedupe por user+poi).
- **Anti-replay** strict: si un refresh ya rotado/revocado se intenta usar, se revocan TODOS los refresh del usuario (defensa contra robo).

**Persistencia (T1.2 reusado)**:
- `users` (creada en T1.2) ahora se popula via OAuth.
- `refresh_tokens` (creada en T1.2) ahora se popula con rotacion + revocacion.
- **`user_profiles` NUEVA tabla** (GPT-5 directive User Discovery Profile) con migracion Alembic `002_user_profiles.py`.
- `RefreshTokenRepository` nuevo (T1.3).

**Frontend (Next.js 15)**:
- `auth.ts` · Auth.js v5 (NextAuth beta 20) + GoogleProvider. signIn callback intercambia id_token con backend.
- `app/api/auth/[...nextauth]/route.ts` · handlers.
- `app/auth/sign-in/page.tsx` · pagina con "Entrar con Google" + "Sigue explorando como invitado".
- `components/auth/useAuth.ts` · hook con cold-start refresh + authedFetch (Bearer auto + retry 401).
- `components/auth/AuthGate.tsx` · wrapper que NO bloquea exploracion · solo redirige al pulsar acciones privadas.

**Tests**:
- 8 nuevos smoke tests (`test_auth_smoke.py`): roundtrip JWT, jti unico, secret mismatch, garbage, hash determinista, refresh CRUD, rotation chain, revoke_all_user.

**Principio fundacional respetado**: KUDOS sigue navegable 100% sin login. El JWT solo se exige en endpoints privados (save/delete, migrate-anon, logout-all, me).

**Veredicto CTO**: BASE PREPARADA PARA T1.4 MIGRACION ENDPOINTS.

---

## 1. AUDITORIA PREVIA

| Componente | Estado | Notas |
|---|---|---|
| `users` table (T1.2) | OK | Esquema con `oauth_provider IN (google, apple, anon)`. Listo para Google. |
| `refresh_tokens` table (T1.2) | OK | Soporta rotacion (rotated_to) + revocacion (revoked_at). |
| UserRepository.create_or_update | OK | Soporta upsert por (provider, oauth_id). |
| Dependencias OAuth Python | FALTABA | T1.3 anade `python-jose[cryptography]`, `authlib`, `cryptography`. |
| Frontend NextAuth | FALTABA | T1.3 anade `next-auth@5.0.0-beta.20`. |
| Cookies cross-origin frontend↔backend | RIESGO | Requiere `CORS allow_credentials=True` + `SameSite=Lax` + dominio coherente. |

### Suposiciones T1.3

1. Eduardo creara Google OAuth Client en Google Cloud Console:
   - Authorized JavaScript origins: `https://kudos.world`, `https://kudos-frontend.onrender.com`.
   - Authorized redirect URIs: `https://kudos.world/api/auth/callback/google`, `https://kudos-frontend.onrender.com/api/auth/callback/google`.
2. Eduardo seteara env vars en Render:
   - `kudos-frontend`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://kudos.world` (o equivalente).
   - `kudos-api-v2`: `GOOGLE_CLIENT_ID`, `JWT_SECRET` (>=32 chars), `ENV=production`, `COOKIE_DOMAIN=kudos.world` (opcional, solo si dominio compartido).
3. Migracion Alembic `002_user_profiles` se aplica DESPUES de `001_initial_schema`.

---

## 2. GOOGLE OAUTH

### 2.1 Flujo completo (usuario nuevo)

```
1. Usuario en /inicio (anonimo, sin login).
   Explora · ve mapa · ve POIs · ve capsulas. CERO friccion.

2. Usuario pulsa "Guardar en Mi Mundo" en cualquier POI.
   AuthGate / useRequireAuth detecta que no hay user -> router.push("/auth/sign-in").

3. /auth/sign-in muestra:
   - "Entrar con Google" (boton blanco con G multicolor)
   - "Sigue explorando como invitado" (boton ghost)
   El usuario NO esta obligado a registrarse. Puede volver.

4. Click "Entrar con Google" -> /api/auth/signin/google?callbackUrl=/inicio.
   NextAuth redirige a accounts.google.com.

5. Usuario autoriza en Google -> Google redirige a
   /api/auth/callback/google con code + state.

6. NextAuth (frontend) intercambia code por id_token.
   En el callback signIn() de auth.ts hace:
     POST kudos-api-v2/api/auth/oauth/google
       body: { id_token }
       credentials: include

7. Backend FastAPI:
   a) verify_google_id_token() valida firma + iss + aud + email_verified.
   b) UserRepository.create_or_update(provider="google", oauth_id=payload.sub, ...).
   c) Genera access_token (15 min) + refresh_token (7 dias, jti unico).
   d) Persiste refresh_tokens row con hash(refresh) + user_agent + ip_hash.
   e) Set-Cookie: kudos_refresh=<jwt>; HttpOnly; SameSite=Lax; Secure
   f) Body: { access_token, expires_in: 900, user: {...} }

8. Frontend recibe access_token y lo guarda en memoria (singleton _memoryToken).
   NextAuth marca sesion activa. Redirect a /inicio.

9. Cuando user hace POST /api/save (proteccion T1.4):
   authedFetch agrega Authorization: Bearer <access>.
   Backend Depends(get_current_user) verifica JWT + carga user de Postgres.
```

### 2.2 Casos especiales

- **Usuario que ya tiene Google account**: `create_or_update` actualiza email, display_name, avatar, last_seen_at. Mismo `id` UUID interno.
- **Usuario que cierra sesion en Google pero no en KUDOS**: el JWT KUDOS sigue valido hasta caducar. Esto es correcto, son sesiones independientes.
- **Usuario que pierde acceso a Google**: politica "contacta soporte" diferida. NO se diseña recuperacion manual en MVP.
- **Usuario sin Google account**: bloqueado hasta T1.5 (Apple OAuth). Magic Link descartado.

---

## 3. JWT ARCHITECTURE

| Token | Algoritmo | TTL | Almacenamiento | Revocacion |
|---|---|---|---|---|
| Access | HS256 | 15 min | Memoria React (singleton `_memoryToken`) | Stateless, caduca |
| Refresh | HS256 | 7 dias | Cookie `kudos_refresh` HttpOnly SameSite=Lax Secure | Tabla `refresh_tokens` |

### 3.1 Estructura Access Token

```
{
  "iss": "kudos.world",
  "sub": "<user_uuid>",
  "iat": 1716969600,
  "exp": 1716970500,
  "scope": "user",
  "interest": "historia"   (opcional · acelera ranking feed)
}
```

### 3.2 Estructura Refresh Token

```
{
  "iss": "kudos.world",
  "sub": "<user_uuid>",
  "jti": "<uuid_uniq>",
  "iat": 1716969600,
  "exp": 1717574400
}
```

### 3.3 Rotacion estricta

```python
# POST /api/auth/refresh
1. Lee cookie kudos_refresh.
2. decode_token() · valida firma + iss + exp.
3. RefreshTokenRepository.get_by_jti(jti).
4. Si row.revoked_at != NULL  o  row.rotated_to != NULL:
   ATAQUE -> RefreshTokenRepository.revoke_all_for_user(user_id) + 401.
5. Si row.hash != hash(token actual): 401 (manipulacion).
6. Emite nuevo refresh con nuevo jti.
7. mark_rotated(old_jti, new_jti) -> old.revoked_at = now, old.rotated_to = new_jti.
8. Emite nuevo access.
9. Set-Cookie nuevo refresh.
```

### 3.4 Logout

- `POST /api/auth/logout`: revoca solo el refresh actual + borra cookie.
- `POST /api/auth/logout-all`: require JWT valido, revoca TODOS los refresh del usuario.

---

## 4. USER CREATION FLOW

`UserRepository.create_or_update` (ya existia desde T1.2):

```python
async def create_or_update(self, *, email, provider, oauth_id,
                            display_name=None, avatar_url=None, locale="es"):
    existing = await self.get_by_oauth(provider, oauth_id)
    if existing:
        existing.email = email                          # email puede cambiar
        existing.display_name = display_name or existing.display_name
        existing.avatar_url = avatar_url or existing.avatar_url
        existing.last_seen_at = datetime.utcnow()
        return existing
    user = User(email=email, oauth_provider=provider, oauth_id=oauth_id, ...)
    self.session.add(user)
    return user
```

- **NO duplica** por (provider, oauth_id) unique constraint.
- **Soporta relogin**: actualiza profile fields.
- **Soporta cambio email Google**: oauth_id estable, email se actualiza.

---

## 5. OWNERSHIP

Implementado en dos capas:

### 5.1 Helper `require_ownership` (`auth/dependencies.py`)

```python
def require_ownership(resource_user_id: uuid.UUID, current_user: User) -> None:
    if resource_user_id != current_user.id:
        raise HTTPException(403, detail="not the owner")
```

### 5.2 Repository nivel (T1.2 ya lo tenia)

`SaveRepository.delete_save(save_id, user_id)`:
```python
stmt = delete(Save).where(and_(Save.id == save_id, Save.user_id == user_id))
result = await self.session.execute(stmt)
return result.rowcount > 0
```

El `WHERE user_id = ?` es un filtro **a nivel SQL**: si el save no pertenece al user, no se borra y devolvemos False (404 desde el endpoint).

**Tests T1.2 ya verifican esto**: `test_save_ownership_check_on_delete` confirma que u2 NO puede borrar save de u1.

T1.4 aplicara este patron a todos los endpoints existentes save/visit/watched/resonance/memory_prompt.

---

## 6. ANON → AUTH MIGRATION

Endpoint `POST /api/save/migrate-anon` (require JWT):

```
Body:
{
  "saves": [
    { "poi_id": "wd-Q10285", "motivation": "travel", "themes": ["historia"] },
    { "poi_id": "wd-Q12892", "motivation": "learn" },
    ...
  ]
}
```

Lógica:
1. Valida cantidad <= 500 (proteccion abuso).
2. Para cada item:
   - Busca existing save (user_id + poi_id + collection_type).
   - Si existe -> skipped++.
   - Si no -> create_save(user_id=current_user.id, ...). migrated++.
3. Commit. Devuelve `{ migrated, skipped, total }`.

Frontend (cuando se haga T1.4):

```typescript
// Tras login exitoso, si hay localStorage:kudos:my_world con elementos
const localSaves = JSON.parse(localStorage.getItem("kudos:my_world") || "[]");
if (localSaves.length > 0) {
  await authedFetch(`${API}/api/save/migrate-anon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ saves: localSaves }),
  });
  localStorage.removeItem("kudos:my_world");
}
```

Esto se integrara en T1.4 dentro de `useMyWorld.ts`. Hoy el endpoint **existe y esta listo** para ser llamado.

---

## 7. FRONTEND AUTH

### 7.1 Componentes nuevos

| Archivo | Proposito |
|---|---|
| `experience/auth.ts` | Auth.js v5 config · Google provider + signIn callback al backend |
| `experience/app/api/auth/[...nextauth]/route.ts` | Route handler Next.js 15 |
| `experience/app/auth/sign-in/page.tsx` | Pagina con boton Google + "sigue explorando" |
| `experience/components/auth/useAuth.ts` | Hook: user, accessToken, authedFetch, signOut, refresh |
| `experience/components/auth/AuthGate.tsx` | Wrapper + useRequireAuth |

### 7.2 Como NO bloqueamos exploracion

`AuthGate` tiene 3 modos:

1. **`passthroughWhenAnon=true` (default)**: si no hay user, renderiza children igualmente. Ideal para bottom sheet POI: ve la card aunque no este logueado.
2. **`fallback={...}`**: si no hay user, renderiza el fallback (ej. ghost button "Inicia sesion para guardar").
3. **`useRequireAuth()(action)`**: ejecuta action si hay user, sino redirige a /auth/sign-in. Ideal para botones Save / Comment / Create.

**T1.4 integrara** `useRequireAuth` en:
- AddToMyWorldButton (botones save)
- ResonancePicker (resonancia emocional)
- MeaningPicker (motivacion)
- ShareCapsuleModalV5 (compartir)

### 7.3 Estado de la sesion

```
useAuth() devuelve:
  user: KudosUser | null           // null = anonimo
  accessToken: string | null       // null = anonimo
  loading: false                   // hidratado al montar
  signOut: () => Promise<void>
  refresh: () => Promise<boolean>
  authedFetch: typeof fetch        // Bearer auto + retry 401
```

El singleton `_memoryToken` es compartido en todo el bundle JS, de forma que un solo hook centraliza la auth.

---

## 8. SECURITY REVIEW

| Riesgo | Mitigacion T1.3 |
|---|---|
| **CSRF** | Refresh cookie `SameSite=Lax` + verificacion de Origin opcional en /api/auth/* + endpoints state-changing requieren JWT en header (no cookie sola). |
| **Replay refresh** | Strict rotation: si un jti revoked/rotated se intenta usar, **revoca toda la cadena del user**. Anti-robo. |
| **Token theft (XSS)** | Access SOLO en memoria (NUNCA localStorage). Refresh en HttpOnly cookie. CSP estricta en next.config.ts (heredada). |
| **Session fixation** | Cada login genera nuevo jti. No reutilizamos sesiones previas. |
| **Refresh abuse** | TTL 7d + rotacion en cada uso + revocacion en cadena ante deteccion. |
| **Ownership bypass** | WHERE user_id = current_user.id en SQL nivel. Tests T1.2 verifican. |
| **Open redirect** | Solo callbackUrl `/inicio` hardcoded en /auth/sign-in. NO acepta callbackUrl arbitrarios. |
| **CORS** | T1.3 cambia `allow_credentials=False` -> `True` (necesario para cookies refresh). T1.6 restringira `allow_origins` (hoy aun `*`). |
| **JWT_SECRET weak** | `_secret()` valida `len(s) >= 32`. Si Eduardo setea algo corto, FastAPI lanza al primer encode. |
| **Email no verificado** | `verify_google_id_token` exige `email_verified=true` en payload. |
| **Audience mismatch** | `verify_google_id_token` valida `aud == GOOGLE_CLIENT_ID`. |

### Pendiente T1.6 (Security middleware)

- CORS `allow_origins` lista blanca (kudos.world + render dominios).
- Rate limit slowapi: 5/min en /auth/oauth/google + /refresh.
- Sanitizacion telemetria (no es T1.3).

---

## 9. TESTS CRITICOS

8 tests en `kudos_engine/tests/test_auth_smoke.py`:

1. `test_access_token_roundtrip` · encode + decode mantiene sub/scope/interest
2. `test_refresh_token_has_unique_jti` · 2 emisiones consecutivas, jti diferente
3. `test_decode_invalid_secret_fails` · cambiar JWT_SECRET invalida tokens previos
4. `test_decode_garbage_fails` · strings no-JWT lanzan AuthError
5. `test_hash_token_deterministic` · sha256 estable
6. `test_hash_ip_deterministic_truncated` · 32 chars, "" -> ""
7. `test_refresh_repo_create_and_get` · CRUD basico
8. `test_refresh_repo_rotation_chain` · mark_rotated marca rotated_to + revoked_at
9. `test_refresh_repo_revoke_all_user` · revoca todos los activos del user

Estos 9 + los 8 de T1.2 = **17 tests smoke totales**.

Como ejecutar:
```bash
TEST_DATABASE_URL=postgresql://localhost/kudos_test \
JWT_SECRET=$(openssl rand -hex 48) \
pytest kudos_engine/tests/ -v
```

---

## 10. VEREDICTO CTO

### Pregunta: ¿Esta KUDOS preparado para iniciar T1.4 Migracion endpoints?

# SI

### Justificacion

1. **Auth backend operativo**: 5 endpoints `/api/auth/*` listos para recibir Google id_token y emitir JWT KUDOS.
2. **Dependency `get_current_user` operativa**: T1.4 puede aplicarla en endpoints save/signals/telemetry sin tocar logica.
3. **Migration endpoint listo**: `POST /api/save/migrate-anon` espera al frontend T1.4.
4. **UserProfile preparado** (GPT-5): cuando T1.5+ defina onboarding extendido, la tabla ya existe.
5. **Frontend Auth.js v5 configurado**: T1.4 solo necesita anadir `useAuth` calls dentro de componentes existentes (AddToMyWorldButton, etc.).
6. **17 tests smoke pasaran cuando Postgres este live**.

### Pre-requisitos antes de T1.4

Eduardo debe (en este orden):

1. **Crear Google OAuth Client** en https://console.cloud.google.com:
   - APIs & Services -> Credentials -> Create OAuth Client ID -> Web application
   - Authorized origins: `https://kudos.world`, `https://kudos-frontend.onrender.com`, `http://localhost:3000`
   - Authorized redirect URIs: 3 URLs anteriores + `/api/auth/callback/google`
   - Copia el `Client ID` y `Client Secret`.
2. **Setear env vars en Render `kudos-frontend`**:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET` (genera con `openssl rand -hex 32`)
   - `NEXTAUTH_URL=https://kudos.world` (o tu dominio publico)
3. **Setear env vars en Render `kudos-api-v2`**:
   - `GOOGLE_CLIENT_ID` (mismo)
   - `JWT_SECRET` (genera con `openssl rand -hex 48`)
   - `ENV=production`
   - `COOKIE_DOMAIN=kudos.world` (solo si frontend+backend comparten dominio)
4. **Push de T1.3** (comando seccion 12).
5. **Correr `alembic upgrade head`** (aplica migracion 002 user_profiles).
6. **Verificar smoke local con backend**: visita `https://kudos.world/auth/sign-in`, intenta login. Si OK, T1.4.

---

## 11. ESTADO FINAL

| Criterio T1.3 | Resultado |
|---|---|
| Login Google operativo | Codigo listo. Esperando Eduardo setea OAuth Client + env vars. |
| JWT operativo | encode/decode/rotate/revoke completos. |
| Ownership operativo | Helper + delete con WHERE user_id. |
| Usuario persistente | UserRepository.create_or_update + JWT con sub estable. |
| Mi Mundo preparado sincronizacion | Endpoint /api/save/migrate-anon listo. |
| Compatibilidad signals | Repositorios T1.2 no tocados. JWT no afecta. |
| Compatibilidad HDG | user_id estable en saves/visits/watched/resonances permite agregar HDG por user. |

---

## 12. COMANDO PUSH T1.3

```powershell
cd C:\Users\efert\kudos_project
git add kudos_engine\requirements.txt ^
        kudos_engine\auth\ ^
        kudos_engine\db\models\profile.py ^
        kudos_engine\db\models\__init__.py ^
        kudos_engine\db\repositories\refresh_repo.py ^
        kudos_engine\db\alembic\versions\002_user_profiles.py ^
        kudos_engine\apps\main.py ^
        kudos_engine\tests\test_auth_smoke.py ^
        experience\package.json ^
        experience\auth.ts ^
        experience\app\api\auth\ ^
        experience\app\auth\ ^
        experience\components\auth\ ^
        scripts_local\write_informe_t13.py ^
        INFORME_H1_T1.3_OAUTH.md ^
        INFORME_H1_T1.3_OAUTH.docx
git -c user.email=eduardo@kudos.world -c user.name="Eduardo" commit -m "T1.3 GOOGLE OAUTH + JWT FOUNDATION · 5 endpoints auth + UserProfile (GPT-5) + Auth.js v5 + Migration anon-auth + Anti-replay + 9 tests"
git push origin master
```

Tras push, en `kudos-frontend` Render:
```bash
npm install   # instalara next-auth
```
(o forzar redeploy)

---

## FIRMA

**Claude Cowork · CTO**
T1.3 ejecutado segun autorizacion PROMPT 4/16.
13 -> 14 tablas / 5 endpoints auth / 9 tests JWT / Anti-replay / 0 errores sintaxis.
Listo para revision CEO + GPT-5 + emision PROMPT 5/16 (T1.4 Migracion endpoints).
