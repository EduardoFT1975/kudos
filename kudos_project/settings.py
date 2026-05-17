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
    print('⚠ DEV: SECRET_KEY generada al vuelo. Define una en .env para sesiones persistentes.')
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
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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
        print("⚠ DATABASE_URL detectada pero dj-database-url no está instalado")

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

# WhiteNoise: comprime y cachea estáticos en producción
if IS_PRODUCTION:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

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
    },
}

# ====================== CARPETAS NECESARIAS ======================
for directory in ['logs', 'media', 'staticfiles', 'static']:
    os.makedirs(os.path.join(BASE_DIR, directory), exist_ok=True)

# ====================== MENSAJES DE INICIO ======================
if DEBUG:
    print("=" * 60)
    mode = "PRODUCCIÓN" if IS_PRODUCTION else "DESARROLLO"
    db = "PostgreSQL (DATABASE_URL)" if DATABASE_URL else "SQLite local"
    print(f"✅ Kudos – modo {mode} · BD: {db}")
    print(f"   DEBUG: {DEBUG}")
    print(f"   ALLOWED_HOSTS: {ALLOWED_HOSTS}")
    print("=" * 60)
