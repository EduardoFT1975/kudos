FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install streamlit==1.44.1 huggingface_hub==0.24.5

RUN mkdir /app/matplotlib-cache && chmod 777 /app/matplotlib-cache
RUN mkdir /app/logs && chmod 777 /app/logs
RUN useradd -m -u 1000 celeryuser
RUN chown -R celeryuser:celeryuser /app

COPY . .