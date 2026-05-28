# KUDOS Capsule Engine v2 · backend FastAPI · production-ready
FROM python:3.11-slim

# Sin warnings de buffering · logs en tiempo real
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

# Working dir
WORKDIR /app

# Dependencias del sistema (curl para healthcheck, ffmpeg opcional para futuras pipelines)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Instalar requirements (cache layer)
COPY kudos_engine/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copiar todo el motor
COPY kudos_engine /app/kudos_engine

# Render asigna $PORT dinámicamente
ENV PORT=10000
EXPOSE 10000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Arranca uvicorn enlazado a 0.0.0.0:$PORT
CMD ["sh", "-c", "uvicorn kudos_engine.apps.main:app --host 0.0.0.0 --port $PORT --workers 1"]
