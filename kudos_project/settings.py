# kudos_project/settings.py
"""
Configuración de Django para el proyecto Kudos.

MODO LOCAL (por defecto):  SQLite, DEBUG=True, sin requerir nada extra.
MODO PRODUCCIÓN:           Activar con la variable de entorno DJANGO_ENV=production
                           Soporta PostgreSQL vía DATABASE_URL si existe.
"""

import os
from pathlib import Path

# Cargar variables de entorno si existe python-dotenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# ====================== ENTORNO ======================
DJANGO_ENV = os.getenv('DJANGO_ENV', 'development').lower()
IS_PRODUCTION = DJANGO_ENV == 'production'

# ====================== SEGURIDAD ======================
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError(
            'SECRET_KEY no está definida en variables de entorno (.env). '
            'En producción es OBLIGATORIA. Genera una con: '
            'python -c "import secrets; print(secrets.token_urlsafe(60))"'
        )
    # En desarrollo: clave aleatoria por sesión (NO PERSISTENTE - mejor que un fallback fijo)
    import secrets as _s
    SECRET_KEY = _s.token_urlsafe(60)
DEBUG = os.getenv('DEBUG', 'False' if IS_PRODUCTION else 'True').lower() in ('true', '1', 'yes')

# ALLOWED_HOSTS: en local '*', en producción usar variable de entorno
_default_hosts = '*' if not IS_PRODUCTION else 'localhost,127.0.0.1'
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', _default_hosts).split(',')]

# CSRF para sites HTTPS desplegados (Render, etc.)
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
]
# Por defecto, confiar en cualquier subdominio render/onrender/pythonanywhere
if IS_PRODUCTION and not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        'https://*.onrender.com',
        'https://*.pythonanywhere.com',
        'https://*.railway.app',
        'https://*.fly.dev',
    ]

# ====================== APLICACIONES ======================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'kudos_app.apps.KudosAppConfig',
    'content_engine',
    'corsheaders',  # Phase 13 hardening · CORS for SPA cross-origin
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Phase 13 hardening · CorsMiddleware MUST sit before CommonMiddleware
    # so preflight OPTIONS responses include the right headers.
    'corsheaders.middleware.CorsMiddleware',
    # WhiteNoise sirve archivos estáticos en producción (justo después de Security)
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # ── AXÓN · Feature Gating ────────────────────────────────────────────────
    # Bloquea con 404 las rutas DORMANT definidas en kudos_project/features.py.
    # Desactivar temporalmente con KUDOS_GATING_OFF=1.
    'kudos_project.middleware.DormantRouteMiddleware',
]

# Si whitenoise no está instalado (modo local), lo quitamos
try:
    import whitenoise  # noqa
except ImportError:
    MIDDLEWARE = [m for m in MIDDLEWARE if 'whitenoise' not in m]

ROOT_URLCONF = 'kudos_project.urls'
WSGI_APPLICATION = 'kudos_project.wsgi.application'
ASGI_APPLICATION = 'kudos_project.asgi.application'

# ====================== TEMPLATES ======================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),
            os.path.join(BASE_DIR, 'kudos_app', 'templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'kudos_app.context_processors.global_context',
            ],
        },
    },
]

# ====================== BASE DE DATOS ======================
# Por defecto SQLite. Si existe DATABASE_URL (Render PostgreSQL, Heroku, etc.) la usa.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DATABASE_URL = os.getenv('DATABASE_URL', '')
if DATABASE_URL:
    try:
        import dj_database_url
        DATABASES['default'] = dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    except ImportError:
        pass  # diagnostic print removed (P0.8 · unicode-safe startup)

# ====================== AUTENTICACIÓN ======================
AUTH_USER_MODEL = 'kudos_app.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 6}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/'

# ====================== INTERNACIONALIZACIÓN ======================
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'Europe/Madrid'
USE_I18N = True
USE_TZ = True

# ====================== FICHEROS ESTÁTICOS Y MEDIA ======================
STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# WhiteNoise: comprime estáticos en producción.
# P0.8 fix · cambiado de CompressedManifestStaticFilesStorage a
# CompressedStaticFilesStorage. La variante "Manifest" requiere que TODO
# {% static %} referenciado exista en `staticfiles/` post-collectstatic;
# si falta uno (vídeo, imagen, fuente custom), Django lanza
# ValueError("Missing staticfiles manifest entry") → 500 en producción.
# La variante sin Manifest sirve los ficheros tal cual sin cache-busting
# hash, y devuelve 404 limpio en ficheros faltantes en lugar de tirar el
# render entero. Trade-off: pierdes cache-busting por hash. Aceptable beta.
if IS_PRODUCTION:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ====================== SEGURIDAD EN PRODUCCIÓN ======================
if IS_PRODUCTION:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    # SECURE_SSL_REDIRECT desactivado por defecto: que el proxy/Render fuerce HTTPS

# ====================== API KEYS (opcional) ======================
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# ====================== CONTENT ENGINE ======================
# Master switch for the WikidataGeoCache layer. Default ON.
# Flip to "0" to revert pipeline Stage 2 to live-only SPARQL behavior
# (no cache reads, no cache writes). Table stays · safe rollback.
CONTENT_ENGINE_GEOCACHE_ENABLED = os.getenv(
    'CONTENT_ENGINE_GEOCACHE_ENABLED', '1'
).lower() in ('1', 'true', 'yes')

# ====================== CORS (Phase 13 hardening) ======================
# Production: set CORS_ALLOWED_ORIGINS env var with comma-separated origins.
# Dev: defaults to localhost:3000 + 127.0.0.1:3000 (Next.js standard ports).
# NEVER use CORS_ALLOW_ALL_ORIGINS=True in production.
#
# Sprint 3 · M2 safe guard:
# If operator misconfigures with CORS_ALLOWED_ORIGINS="*" thinking it
# means wildcard, django-cors-headers does NOT interpret "*" specially
# in this list · result is silent breakage of all cross-origin requests.
# Warn loudly at startup so the misconfig is caught immediately.
_raw_cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
# CORS wildcard misconfiguration warning previously printed here was
# removed (P0.8 · unicode-safe startup). The behavior is unchanged · if
# CORS_ALLOWED_ORIGINS="*" is set, django-cors-headers still treats it
# as a literal origin (which blocks everything); set CORS_ALLOW_ALL_ORIGINS=True
# explicitly for true wildcard.
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in _raw_cors_origins.split(',')
    if o.strip()
]
if not IS_PRODUCTION and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

# Restrict CORS to specific endpoints (defense in depth: even if
# misconfigured, only the API surface is exposed cross-origin, not
# admin / accounts / kudos_app routes).
CORS_URLS_REGEX = r'^/api/.*$'

# Do not expose cookies via CORS by default. If session-auth ever
# becomes needed cross-origin, flip explicitly and tighten origins.
CORS_ALLOW_CREDENTIALS = False

# Phase 13 hardening · C2: expose custom health header to cross-origin
# JS. Without this entry, `response.headers.get("X-Kudos-Pipeline-Health")`
# returns null in browsers when frontend lives at a different origin
# than Django. Server-side monitoring (nginx logs, Datadog) is unaffected
# either way · this only matters for client-side header introspection.
CORS_EXPOSE_HEADERS = [
    "X-Kudos-Pipeline-Health",
]

# Sprint 3 · M3: cache preflight OPTIONS responses for 24h.
# Without this, browsers re-send OPTIONS preflight every ~5s (browser
# default) before each cross-origin POST. With 24h cache, preflight
# happens once per day per origin · saves a network round-trip on
# every subsequent API call. Safe optimization · no security impact.
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours in seconds

# ====================== RATE LIMIT CACHE BACKEND NOTE (Sprint 2 · H4) ===
# django-ratelimit stores counters in Django's default cache backend.
# Without an explicit CACHES setting, Django falls back to LocMemCache
# which is PER-PROCESS · each gunicorn worker has its own counter.
#
# Effective production limit = declared_rate × number_of_workers.
# Example: 10/m declared × 4 workers = 40/m per identity in reality.
#
# For accurate cluster-wide rate limiting, configure a shared cache
# backend (Redis / Memcached) and add to settings:
#
#   CACHES = {
#       'default': {
#           'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#           'LOCATION': os.getenv('REDIS_URL'),
#       }
#   }
#
# Phase 13 leaves this as a deployment-time decision · not added to
# code to avoid mandating Redis dependency for dev/small deployments.

# ====================== REQUEST BODY SIZE (Phase 13 hardening · C1) =====
# Tighten Django default (2.5MB) to a conservative 1MB ceiling. Wider
# than `/api/place-capsule` needs (<1KB) but safe for other kudos_app
# views that may legitimately POST forms / images. Reverted from the
# initial 64KB which risked breaking unrelated routes (admin form
# submits, capsule editing flows, etc.).
# Per-endpoint tighter limits should be applied at the view layer if
# truly needed (django-defender / custom middleware).
DATA_UPLOAD_MAX_MEMORY_SIZE = 1 * 1024 * 1024  # 1MB
# FILE_UPLOAD_MAX_MEMORY_SIZE removed · it only controls the in-memory
# buffer before overflow-to-tempfile, not request body size. Was added
# in error during Phase 13 · not a body-size defense.

# ====================== LOGGING ======================
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module}: {message}', 'style': '{'},
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIR, 'kudos.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'kudos_app': {
            'handlers': ['console'] if IS_PRODUCTION else ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        # Phase 13 hardening · content_engine.* loggers must reach
        # configured handlers. Without this entry, log.info / log.error
        # calls from content_engine.api / .pipeline / .clients silently
        # fall to root logger which may have no file handler.
        'content_engine': {
            'handlers': ['console'] if IS_PRODUCTION else ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# ====================== CARPETAS NECESARIAS ======================
for directory in ['logs', 'media', 'staticfiles', 'static']:
    os.makedirs(os.path.join(BASE_DIR, directory), exist_ok=True)

# ====================== MENSAJES DE INICIO ======================
# Startup diagnostic prints removed (P0.8 · unicode-safe startup).
# Previously printed mode/db/DEBUG/ALLOWED_HOSTS using emojis and Unicode
# punctuation, which raised UnicodeEncodeError under Render's default
# charmap codec when stdout was non-UTF-8. Same information remains
# available via `python manage.py diffsettings` or the LOGGING config.
