# KUDOS Engine

Motor cinematográfico de cápsulas de POIs.

Convierte cualquier lugar del mundo en una cápsula de vídeo vertical 9:16 al estilo Apple Vision Pro + Netflix documental, **sin coste alguno** usando imágenes de Wikimedia Commons + Edge-TTS + ffmpeg.

Listo para enchufar Sora / Veo / Kling cuando decidas pasar a motores premium.

---

## Qué hace

1. **Clasifica** cualquier POI en 4 tiers (S / A / B / C) con un algoritmo objetivo.
2. **Genera un guion** cinematográfico de N escenas usando Claude (Anthropic).
3. **Descarga fotos** de alta calidad y licencia CC desde Wikimedia Commons.
4. **Sintetiza voz** de narrador en español usando Edge-TTS de Microsoft (gratis e infinita).
5. **Ensambla** la cápsula final con efecto Ken Burns + color grading dorado KUDOS + música de fondo.

Salida: MP4 1080×1920 (vertical 9:16) listo para PoiScreen / Share / redes sociales.

---

## Tiers automáticos

| Tier | Recibe | Criterio |
|------|--------|----------|
| **S** | Cápsula 45'' + ficha completa + galería | UNESCO + >100k visitantes + reconocimiento global |
| **A** | Cápsula 15'' + ficha completa | Importante a nivel nacional/regional |
| **B** | Ficha rica con fotos, sin vídeo | Wikipedia >5 idiomas, valor cultural local |
| **C** | Ficha mínima (nombre + foto + 2 líneas) | El resto |

Algoritmo: `kudos_engine/score.py`.

---

## Instalación (una sola vez)

Abre **PowerShell** y copia/pega:

```powershell
cd C:\Users\efert\kudos_project
python -m pip install -r kudos_engine\requirements.txt
```

Comprueba que **ffmpeg** está instalado:

```powershell
ffmpeg -version
```

Si dice "ffmpeg no se reconoce", instálalo desde https://www.gyan.dev/ffmpeg/builds/ (descarga *release essentials*, descomprime y añade la carpeta `bin` al PATH de Windows).

---

## Uso

### Generar la cápsula del Coliseo

```powershell
cd C:\Users\efert\kudos_project
python -m kudos_engine generate --poi rome
```

Crea el archivo en `kudos_engine\output\coliseo-de-roma\capsula.mp4`. Tarda 1-3 minutos según tu CPU. La primera vez descarga las fotos de Wikimedia; las siguientes usan caché y son más rápidas.

### POIs preconfigurados

```powershell
python -m kudos_engine generate --poi machu      # Machu Picchu
python -m kudos_engine generate --poi taj        # Taj Mahal
python -m kudos_engine generate --poi alhambra   # Alhambra
python -m kudos_engine generate --poi sagrada    # Sagrada Familia
```

### Cualquier otro POI

```powershell
python -m kudos_engine generate --poi "Catedral de Burgos"
python -m kudos_engine generate --poi "Mont Saint-Michel"
```

### Calcular tier de un POI sin generar nada

```powershell
python -m kudos_engine score --name "Catedral de Burgos" --unesco --visitors 500000 --wiki 30 --ai 0.85
```

### Listar voces en español disponibles

```powershell
python -m kudos_engine voices
```

---

## Opciones útiles

| Flag | Para qué |
|------|----------|
| `--no-intro` | Omite el intro KUDOS de 0.8s |
| `--no-voice` | Genera el vídeo sin narración |
| `--voice es-ES-ElviraNeural` | Cambia la voz (default `es-ES-AlvaroNeural`) |
| `--music kudos_engine\assets\music\epic.mp3` | Añade música de fondo |
| `--duration 15` | Fuerza duración objetivo |
| `--scenes 5` | Fuerza número de escenas |

---

## Música de fondo (opcional pero recomendable)

El motor mezcla cualquier MP3 que le pases. Sugerencias royalty-free **gratis**:

1. **YouTube Audio Library** — https://studio.youtube.com → Biblioteca de audio. Filtra por género "Cinematic" o "Epic". Descarga el MP3.
2. **Pixabay Music** — https://pixabay.com/music/search/genre/cinematic/
3. **Free Music Archive** — https://freemusicarchive.org/

Guarda el MP3 en `kudos_engine\assets\music\epic.mp3` y úsalo con `--music`.

---

## Subir nivel: motores premium (cuando quieras)

Los stubs ya están en `kudos_engine/providers/`:

- `kling_stub.py` — **Kling AI**. Free tier 166 créditos/día. Necesita `KLING_API_KEY`.
- `sora_stub.py` — **OpenAI Sora 2**. ~$8-12 por cápsula 15''. Necesita `OPENAI_API_KEY`.
- `veo_stub.py` — **Google Veo 3**. ~$10-15 por cápsula 15''. Necesita Google Cloud.

Cuando consigas una API key, pídeme que **complete la integración real**. La pipeline está diseñada para sustituir clips Ken Burns por clips IA escena a escena, manteniendo voz + música + ensamblaje.

---

## Guion con Claude

Si quieres que el guion sea generado por Claude (mucho mejor que el fallback offline), exporta tu API key:

```powershell
$env:ANTHROPIC_API_KEY = "tu-clave-aqui"
python -m kudos_engine generate --poi rome
```

Sin API key, usa una plantilla offline aceptable pero austera.

---

## Estructura del motor

```
kudos_engine/
├── __init__.py
├── __main__.py             ← CLI (python -m kudos_engine ...)
├── pipeline.py             ← Orchestrator 5 pasos
├── tier.py                 ← Clasificación S/A/B/C
├── score.py                ← Cálculo importance_score
├── requirements.txt
├── providers/
│   ├── guion_claude.py     ← Paso 1: guion (Anthropic Claude)
│   ├── wikimedia.py        ← Paso 2: fotos CC desde Commons
│   ├── voice_edge.py       ← Paso 3: voz narrador (Edge-TTS gratis)
│   ├── ffmpeg_kenburns.py  ← Paso 5: animación + grading + concat
│   ├── kling_stub.py       ← Enchufe Kling AI (premium)
│   ├── sora_stub.py        ← Enchufe OpenAI Sora (premium)
│   └── veo_stub.py         ← Enchufe Google Veo (premium)
├── assets/
│   └── music/              ← Pon aquí tus pistas de música
├── cache/
│   └── wikimedia/<slug>/   ← Caché de fotos descargadas
└── output/
    └── <slug>/
        ├── capsula.mp4     ← El resultado final
        ├── script.json     ← El guion generado
        ├── metadata.json   ← Tier + créditos + ficha técnica
        ├── intro.mp4
        ├── clips/          ← Clips por escena
        └── voice/          ← MP3 narrador por escena
```

---

## Visión

KUDOS Engine es la pieza que nos lleva a ser:

- **Plataforma cultural global** — cada lugar del mundo merece su cápsula
- **Mapa vivo del conocimiento** — el guion sale de Claude + Wikipedia + UNESCO
- **Sistema de exploración humana** — narración profesional, no IA "soulless"
- **Archivo emocional de lugares** — música, color, ritmo cinematográfico

Empezamos gratis (Wikimedia + Edge-TTS + ffmpeg) para demostrar el concepto. Subimos a Sora / Veo cuando haya inversión o ingresos. El esqueleto ya está montado para hacer ambas cosas sin reescribir nada.
