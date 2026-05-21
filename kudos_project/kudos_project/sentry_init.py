"""
KUDOS · AXÓN · Sentry init (opcional).

NO se importa por defecto. Para activar, añadir al final de
``kudos_project/settings.py``:

    if IS_PRODUCTION:
        from kudos_project.sentry_init import init_sentry
        init_sentry()

Y declarar ``sentry-sdk`` en requirements.txt:

    sentry-sdk[django]>=2.0.0

Variables de entorno consumidas:
    SENTRY_DSN                  obligatoria (sin ella, no se inicializa)
    SENTRY_ENVIRONMENT          default 'production'
    SENTRY_TRACES_SAMPLE_RATE   default 0.1
    SENTRY_RELEASE              default 'v0.9-axon-core'
"""
import os


def init_sentry():
    dsn = os.getenv('SENTRY_DSN', '').strip()
    if not dsn:
        return  # silencioso: sin DSN, no-op
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
    except ImportError:
        print('⚠ SENTRY_DSN definida pero sentry-sdk no está instalado.')
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv('SENTRY_ENVIRONMENT', 'production'),
        release=os.getenv('SENTRY_RELEASE', 'v0.9-axon-core'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.0')),
        send_default_pii=False,  # no enviar PII por defecto
        attach_stacktrace=True,
    )
