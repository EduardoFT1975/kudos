# KUDOS · v0.9-axon-core · Deploy Runbook productivo

**Fecha:** 2026-05-17
**Estado:** FREEZE operacional · listo para deploy productivo
**Objetivo:** publicar KUDOS en producción REAL sin alterar arquitectura.

---

## 1. Plataforma elegida · Render (recomendada)

### Decisión

| Criterio | Render | Railway | Fly.io |
|---|---|---|---|
| Config ya escrita en el repo | ✓ `render.yaml` + `build.sh` | (añadido ahora `railway.json`) | requiere `fly.toml` adicional |
| Free tier con Postgres | ✓ Web + DB free plan | ✓ $5 trial · luego pago | ✗ free limitado |
| Push-to-deploy desde GitHub | ✓ nativo | ✓ nativo | ✓ vía action |
| Static files vía whitenoise | ✓ funciona out-of-box | ✓ funciona out-of-box | ✓ funciona out-of-box |
| TLS automático en `*.onrender.com` | ✓ | ✓ en `*.railway.app` | ✓ |
| Logs en consola web | ✓ | ✓ | ✓ |
| Tiempo desde `git push` a URL pública | ~5–8 min primera vez | ~3–5 min | ~5–8 min |
| Pricing tras free | $7/mes web + $7/mes Postgres | metered (cents/h) | hobby $1.94/mes |

**Recomendación: Render.**
- `render.yaml` y `build.sh` ya están en el repo y funcionan tal cual.
- Postgres free para arrancar.
- Cero fricción para un fundador no-DevOps.

**Railway como Plan B** (si Render tiene downtime el día del lanzamiento) — `railway.json` añadido en este FREEZE para drop-in alternativo.

---

## 2. Estado de los artefactos · pre-deploy

| Archivo | Estado | Comentario |
|---|---|---|
| `Procfile` | ✓ presente | `web: gunicorn ... --log-file - --bind 0.0.0.0:$PORT` + `release: python manage.py migrate --noinput` |
| `requirements.txt` | ✓ presente (27 L) | Django ≥4.2 · gunicorn · whitenoise · dj-database-url · psycopg2-binary |
| `runtime.txt` | ✓ `python-3.11.9` | |
| `render.yaml` | ✓ presente | services + databases auto-aprovisionado · SECRET_KEY `generateValue: true` |
| `build.sh` | ✓ presente | `pip install` + `collectstatic` + `migrate` |
| `railway.json` | ✓ añadido en este FREEZE | Plan B drop-in |
| `Dockerfile_app` | ✓ presente | Si se necesita Docker en VPS propio |
| `docker-compose.yml` | ✓ presente | Para entorno local con Redis |
| `.env.example` | ✓ presente | Local |
| `.env.production.example` | ✓ añadido en este FREEZE | Producción |
| `kudos_project/sentry_init.py` | ✓ añadido en este FREEZE | Opt-in, no carga por defecto |
| `kudos_project/settings.py` | ✓ producción-ready | SECRET_KEY mandatory si `DJANGO_ENV=production`, CSRF_TRUSTED_ORIGINS auto-detecta `*.onrender.com`, `*.railway.app`, `*.fly.dev` |

---

## 3. Variables de entorno · obligatorias en producción

```
SECRET_KEY=                # OBLIGATORIA. Generar: python -c "import secrets; print(secrets.token_urlsafe(60))"
DJANGO_ENV=production
DEBUG=False
ALLOWED_HOSTS=kudos.tudominio.com   # CSV si tienes varios
DATABASE_URL=               # Render/Railway inyectan automáticamente
```

Opcionales recomendadas:
```
CSRF_TRUSTED_ORIGINS=https://kudos.tudominio.com
SENTRY_DSN=                 # Si se activa observabilidad
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v0.9-axon-core
```

Overrides AXÓN (debug):
```
KUDOS_GATING_OFF=1          # desactiva DormantRouteMiddleware
KUDOS_GATING_LOG=1          # loggea intentos a rutas DORMANT
KUDOS_FEATURE_<NAME>=1      # reactiva una feature DORMANT puntual
```

---

## 4. Procedimiento Render (recomendado)

### 4.1 Cuenta + repo conectado
1. Crear cuenta en https://dashboard.render.com (login con GitHub).
2. Botón **New +** → **Blueprint**.
3. Conectar GitHub → seleccionar repo `kudos_project`.
4. Render detecta `render.yaml` automáticamente.
5. Click **Apply** → aprovisiona web + Postgres free.

### 4.2 Variables de entorno · ajuste post-Apply
En el Dashboard → service `kudos` → **Environment**:
- `SECRET_KEY` está generada automáticamente por `generateValue: true`.
- Editar `ALLOWED_HOSTS` añadiendo tu dominio real (si tienes).
- Añadir `SENTRY_DSN` (si decides activar Sentry).

### 4.3 Primer build · qué ejecuta Render
```bash
# build (build.sh)
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --noinput

# start (Procfile / startCommand)
gunicorn kudos_project.wsgi:application
```

Tiempo estimado primera vez: 5–8 min.

### 4.4 Postgres seeding (opcional)
Si quieres cargar el contenido inicial (~1 458 cápsulas del snapshot dev):

```bash
# desde tu máquina local (con DATABASE_URL apuntando al Postgres de Render)
export DATABASE_URL="postgres://kudos:...@..."
python manage.py loaddata initial_data.json     # si lo tienes
# o restaurar el backup SQLite a Postgres:
sqlite3 outputs/kudos_db.20260517T085412Z.sqlite3 .dump | \
    psql $DATABASE_URL
```

---

## 5. Procedimiento Railway (Plan B)

```bash
# instalar CLI
npm i -g @railway/cli

# login + init
railway login
railway init                # crea proyecto

# variables
railway variables set SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(60))')"
railway variables set DJANGO_ENV=production
railway variables set DEBUG=False
railway variables set ALLOWED_HOSTS="*.railway.app"

# add Postgres
railway add postgresql      # DATABASE_URL se inyecta automáticamente

# deploy
railway up

# obtener URL pública
railway domain
```

`railway.json` ya está en el repo (build.sh + gunicorn 2 workers / 4 threads / 60s timeout).

---

## 6. Smoke tests post-deploy

Ejecutar inmediatamente tras URL pública disponible:

### 6.1 PUBLIC routes (esperado: 200)

```
curl -sI https://kudos.tudominio.com/                              | head -1
curl -sI https://kudos.tudominio.com/map/                          | head -1
curl -sI https://kudos.tudominio.com/capsules/                     | head -1
curl -sI https://kudos.tudominio.com/search/                       | head -1
curl -sI https://kudos.tudominio.com/timeline/                     | head -1
curl -sI https://kudos.tudominio.com/mind/                         | head -1
curl -sI https://kudos.tudominio.com/accounts/login/               | head -1
curl -sI https://kudos.tudominio.com/api/capsules/5d/              | head -1
```
**Todas → `HTTP/2 200`.**

### 6.2 DORMANT routes (esperado: 404)

```
curl -sI https://kudos.tudominio.com/marketplace/                  | head -1
curl -sI https://kudos.tudominio.com/founder/strategic/            | head -1
curl -sI https://kudos.tudominio.com/mental-health/                | head -1
curl -sI https://kudos.tudominio.com/feed/                         | head -1
curl -sI https://kudos.tudominio.com/wisdom/                       | head -1
curl -sI https://kudos.tudominio.com/historical-map/               | head -1
```
**Todas → `HTTP/2 404`.**

### 6.3 Smoke navegacional (browser real)

```
[ ] Mapa carga (vista mundial Cyan + clusters visibles)
[ ] Click marker → popup abre instant
[ ] Popup muestra título, año, modo, dim-dot, imagen, autor
[ ] Chips lazy (era/IA/quality/sentiment) aparecen con fade-in suave
[ ] Click "Explorar →" → /capsules/<uid>/ carga
[ ] capsule_detail muestra cinema-stage + barra 5D + share-bar
[ ] CTAs DORMANT NO visibles (audio/vr/dialog/aport gateados)
[ ] Click "↗ Compartir" → Web Share API (móvil) o clipboard toast
[ ] Click "📜 Timeline" en popup → vista timeline
[ ] Click "🧠 Preguntar a Mind" → /mind/?capsule=X
[ ] Mind Lite muestra 3 chips · auto-fire del prompt "what"
[ ] Respuesta llega con fade-in 350 ms
[ ] Chips related cyan navegables a otras cápsulas
[ ] Cambio slider temporal → mapa cambia estilo (sepia/grayscale/dark)
[ ] Cambio botones dimensión → markers se filtran
[ ] Pan/zoom → markers se reagrupan (refetch debounced 250 ms)
```

### 6.4 OG share preview

Validar antes de promocionar el link:
- https://opengraph.xyz/url/<URL_ENCODED>
- https://cards-dev.twitter.com/validator
- Probar share manual en WhatsApp / Telegram / LinkedIn

---

## 7. Observabilidad

### 7.1 Sentry (opcional, opt-in)

1. Crear proyecto en https://sentry.io → seleccionar **Django**.
2. Copiar DSN.
3. Añadir a `requirements.txt`:
   ```
   sentry-sdk[django]>=2.0.0
   ```
4. Añadir al **final** de `kudos_project/settings.py` (1 línea — no rompe FREEZE):
   ```python
   if IS_PRODUCTION:
       from kudos_project.sentry_init import init_sentry
       init_sentry()
   ```
5. Configurar env vars en Render/Railway:
   ```
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   SENTRY_ENVIRONMENT=production
   SENTRY_RELEASE=v0.9-axon-core
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```
6. Hacer un commit + push → redeploy.

`kudos_project/sentry_init.py` ya está en el repo (no se importa por defecto).

### 7.2 PostHog (opcional, client-side)

1. Cuenta en https://eu.posthog.com → proyecto nuevo.
2. Copiar Project API Key.
3. Añadir al `<head>` de `base.html` (1 bloque `<script>`):
   ```html
   {% if POSTHOG_API_KEY %}
   <script>
   !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
   posthog.init('{{ POSTHOG_API_KEY }}', {api_host: '{{ POSTHOG_HOST|default:"https://eu.posthog.com" }}'});
   </script>
   {% endif %}
   ```
4. Inyectar `POSTHOG_API_KEY` vía context processor o `kudos_project/settings.py`:
   ```python
   POSTHOG_API_KEY = os.getenv('POSTHOG_API_KEY', '')
   ```

> Decisión: PostHog NO se añadió en este FREEZE para no tocar `base.html`. Es trabajo de 1 commit post-deploy.

### 7.3 Logs críticos

Render/Railway exponen `stdout`/`stderr` en su dashboard. El middleware AXÓN ya loggea con `KUDOS_GATING_LOG=1`:

```
[INFO] axon.gating.block path=/marketplace/ ua=Mozilla/5.0...
```

Para activarlo: `KUDOS_GATING_LOG=1` en env vars.

---

## 8. Hardening pre-launch (deuda 🔴 documentada en KNOWN_DEBTS.md)

`settings.py` actual NO incluye estas líneas (decisión FREEZE: no modificar). Para añadirlas:

```python
# Añadir al final de settings.py SI se activa HTTPS productivo
if IS_PRODUCTION:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'same-origin'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'
```

Commit single-line. Ejecutar `python manage.py check --deploy` antes de subir; debería bajar de ~6 warnings a 0.

---

## 9. Rollback de deploy

### 9.1 Rollback automático en Render

Dashboard → service `kudos` → tab **Deploys** → click **Rollback** en el deploy verde previo.
Tiempo: ~30s sin redeployar build.

### 9.2 Rollback manual git (recomendado)

```bash
git tag -l                                      # ver tags previos
git reset --hard v0.8-pre-axon                  # o el commit estable previo
git push -f origin master                       # cuidado: rewrite history
```

### 9.3 Rollback DB (Postgres en Render)

Render hace backups diarios automáticos del Postgres (en planes pagos).
En free plan: hacer backup manual antes de migrate destructiva:

```bash
# Antes de redeploy
pg_dump $DATABASE_URL > backup_pre_$(date -u +%Y%m%d).sql

# Si algo falla
psql $DATABASE_URL < backup_pre_YYYYMMDD.sql
```

---

## 10. Checklist final pre-launch

```
[ ] git status limpio en master
[ ] git tag v0.9-axon-core creado y pusheado
[ ] render.yaml + build.sh + Procfile + requirements.txt + runtime.txt en repo
[ ] SECRET_KEY OBLIGATORIA configurada (no default)
[ ] DEBUG=False explícito en producción
[ ] ALLOWED_HOSTS contiene dominio real
[ ] DATABASE_URL apuntando a Postgres productivo (no SQLite)
[ ] python manage.py check --deploy → 0 errors críticos
[ ] python manage.py migrate --plan → revisar migraciones
[ ] Smoke PUBLIC routes (§6.1) → 8/8 = 200
[ ] Smoke DORMANT routes (§6.2) → 6/6 = 404
[ ] Smoke navegacional browser (§6.3) → 18/18 OK
[ ] OG share preview validado en WhatsApp/Twitter (§6.4)
[ ] Backup DB pre-deploy guardado fuera del servidor
[ ] Tag v0.9-axon-core anunciado a stakeholders
[ ] URL productiva documentada (PRODUCTION_URL.md o similar)
```

---

## 11. URLs y referencias

- **Render dashboard:** https://dashboard.render.com
- **Railway dashboard:** https://railway.com/dashboard
- **Postgres pgcli (local):** `pip install pgcli && pgcli $DATABASE_URL`
- **Sentry docs Django:** https://docs.sentry.io/platforms/python/integrations/django/
- **PostHog docs Django:** https://posthog.com/docs/libraries/python (django)
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse
- **OG validator:** https://opengraph.xyz · https://cards-dev.twitter.com/validator

---

## 12. Sello deploy

```
Plataforma:       Render (primary) · Railway (Plan B)
Tag base:         v0.9-axon-core
Build command:    ./build.sh
Start command:    gunicorn kudos_project.wsgi
DB:               PostgreSQL free plan
Static:           whitenoise (sin S3)
TLS:              automático (*.onrender.com)
Health endpoint:  /
Workers:          1 default · 2-4 recomendado en plan pago
```

**No tocar arquitectura. Sólo deploy. Sólo validar. Sólo medir.**

> *"KUDOS debe vivir estable fuera del entorno local."* — mandato cumplido.
