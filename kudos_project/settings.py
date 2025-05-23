# kudos_project/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Cargar variables de entorno
load_dotenv()
print(f"Variables de entorno cargadas. OPENAI_API_KEY desde os.environ: {os.environ.get('OPENAI_API_KEY')}")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'w@pb+i*0cd)utd)lj6t^19@g=+x)3d5hcq^15@tyze+sr_&r-')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,app').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'kudos_app.apps.KudosAppConfig',
    'celery',
    'rest_framework',
    'rest_framework.authtoken',
    'django_celery_results',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'kudos_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'kudos_project.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.getenv('DATABASE_NAME', 'kudos_db'),
        'USER': os.getenv('DATABASE_USER', 'postgres'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD', 'Po003785'),
        'HOST': os.getenv('DATABASE_HOST', 'localhost'),
        'PORT': os.getenv('DATABASE_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'kudos_app.User'

# Redirect after login
LOGIN_REDIRECT_URL = '/'

# API Keys (usando solo APIs gratuitas)
OPENWEATHERMAP_API_KEY = os.getenv('OPENWEATHERMAP_API_KEY', 'aea902bdeb7284a930fe603388316ca7')
UNSPLASH_ACCESS_KEY = os.getenv('UNSPLASH_ACCESS_KEY', 'YAHbJ6kW-hXbjLYvE46U_zDriefatNHt1gfSTE_0I4')
WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php'
OPENSTREETMAP_API_URL = 'https://nominatim.openstreetmap.org'
PINATA_API_KEY = os.getenv('PINATA_API_KEY', 'your-pinata-api-key')
PINATA_API_SECRET = os.getenv('PINATA_API_SECRET', 'your-pinata-secret-api-key')
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY', 'hf_GESVrivfZM1xQtf5hCZKz0hIk1XS1lniqEH')
TRANSLATOR_API = os.getenv('TRANSLATOR_API', 'http://translator:5000')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Celery Beat Schedule
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'generate-capsules-every-hour': {
        'task': 'kudos_app.tasks.generate_capsules_task',
        'schedule': crontab(minute=0, hour='*'),
    },
    'generate-clips-every-2-hours': {
        'task': 'kudos_app.tasks.generate_capsule_clips_task',
        'schedule': crontab(minute=0, hour='*/2'),
    },
    'notify-art-capsules-every-hour': {
        'task': 'kudos_app.tasks.notify_new_art_capsule',
        'schedule': crontab(minute=0, hour='*'),
    },
    'notify-edu-progress-every-hour': {
        'task': 'kudos_app.tasks.notify_edu_progress',
        'schedule': crontab(minute=0, hour='*'),
    },
    'notify-health-alerts-every-hour': {
        'task': 'kudos_app.tasks.notify_health_alerts',
        'schedule': crontab(minute=0, hour='*'),
    },
    'notify-sos-alerts-every-hour': {
        'task': 'kudos_app.tasks.notify_sos_alerts',
        'schedule': crontab(minute=0, hour='*'),
    },
    'notify-simulated-capsules-every-hour': {
        'task': 'kudos_app.tasks.notify_simulated_capsules',
        'schedule': crontab(minute=0, hour='*'),
    },
    'notify-wisdom-capsules-every-hour': {
        'task': 'kudos_app.tasks.notify_wisdom_capsules',
        'schedule': crontab(minute=0, hour='*'),
    },
    'process-expired-capsules-every-day': {
        'task': 'kudos_app.tasks.process_expired_capsules',
        'schedule': crontab(minute=0, hour=0),
    },
    'send-user-notifications-every-hour': {
        'task': 'kudos_app.tasks.send_user_notifications',
        'schedule': crontab(minute=0, hour='*'),
    },
    'update-global-statistics-every-hour': {
        'task': 'kudos_app.tasks.update_global_statistics',
        'schedule': crontab(minute=0, hour='*'),
    },
}

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'your-email@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', 'your-email-password')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'feedback@kudos.com')

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/tmp/kudos.log',
            'formatter': 'verbose',
            'mode': 'a',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        '': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Configuración para GDAL
GDAL_LIBRARY_PATH = r"C:\Users\efert\anaconda3\envs\kudos\Library\bin\gdal.dll"

# Directories
LOG_DIR = os.path.join(BASE_DIR, 'logs')
CLIP_DIR = os.path.join(BASE_DIR, 'clips')
IMAGE_DIR = os.path.join(BASE_DIR, 'images')

for directory in [LOG_DIR, CLIP_DIR, IMAGE_DIR]:
    os.makedirs(directory, exist_ok=True)

# Depuración
print(f"OPENAI_API_KEY cargada: {OPENAI_API_KEY}")
print(f"GOOGLE_MAPS_API_KEY cargada: {GOOGLE_MAPS_API_KEY}")


# kudos_project/settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')