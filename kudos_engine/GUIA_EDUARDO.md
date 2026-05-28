# Guía Eduardo · Cómo usar el Motor KUDOS

Esto es lo único que necesitas leer.

---

## Lo que acabamos de construir

He dejado en tu PC un **motor completo** que genera cápsulas cinematográficas reales (vídeos 9:16 verticales con narración + música + color grading dorado KUDOS) **sin gastar un euro**.

El motor está en: `C:\Users\efert\kudos_project\kudos_engine\`

Sí, también he dejado los **enchufes** preparados para Sora, Veo y Kling cuando quieras dar el salto a IA premium.

---

## Lo PRIMERO que debes hacer (una sola vez)

Abre **PowerShell** y pega esto. Tarda 1-2 minutos:

```powershell
cd C:\Users\efert\kudos_project
python -m pip install -r kudos_engine\requirements.txt
```

Verifica que ffmpeg está instalado en tu PC:

```powershell
ffmpeg -version
```

Si te dice "no se reconoce", baja ffmpeg de https://www.gyan.dev/ffmpeg/builds/ → "release essentials" → descomprime → añade la carpeta `bin` al PATH de Windows. Si no sabes hacerlo dímelo y te lo explico paso a paso.

---

## Generar tu PRIMERA cápsula real del Coliseo

Un único comando:

```powershell
cd C:\Users\efert\kudos_project
python -m kudos_engine generate --poi rome
```

Espera 1-3 minutos (la primera vez descarga las fotos de Wikimedia). Cuando termine verás:

```
==============================================
CÁPSULA LISTA
==============================================
Tier:     S
Vídeo:    C:\Users\efert\kudos_project\kudos_engine\output\coliseo-de-roma\capsula.mp4
```

Abre ese MP4 y mira el resultado. **Esto es real, no es placeholder**. Lo subiremos a la app si te gusta.

---

## Si quieres que el GUION sea generado por Claude (recomendado)

El guion por defecto es una plantilla decente, pero Claude lo hace mil veces mejor. Tienes API key de Anthropic, sólo necesitas exportarla:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-tu-clave-aqui"
cd C:\Users\efert\kudos_project
python -m kudos_engine generate --poi rome
```

Cada cápsula consume ~$0.01 de Claude (apenas céntimos).

---

## Generar otros lugares

```powershell
python -m kudos_engine generate --poi machu        # Machu Picchu
python -m kudos_engine generate --poi taj          # Taj Mahal
python -m kudos_engine generate --poi alhambra     # Alhambra
python -m kudos_engine generate --poi sagrada      # Sagrada Familia
python -m kudos_engine generate --poi "Catedral de Burgos"   # cualquier nombre
```

---

## Saber qué tier merece un lugar

```powershell
python -m kudos_engine score --name "Catedral de Burgos" --unesco --visitors 500000 --wiki 30 --ai 0.85
```

Te dirá Tier S/A/B/C + receta exacta (duración, escenas, etc).

---

## Cuando quieras saltar a Sora / Veo / Kling

Los stubs están listos en `kudos_engine\providers\`. Cuando consigas una API key:

1. **Kling** (recomendado para empezar, FREE TIER de 166 créditos/día): crea cuenta en https://app.klingai.com
2. **Sora**: requiere OpenAI con créditos cargados (~$20)
3. **Veo**: requiere Google Cloud + allowlist

Cuando tengas la clave, **pídeme que complete la integración real**. Está diseñado para sustituir clips Ken Burns por clips IA sin tocar el resto del pipeline.

---

## Lo que falta de empujar a GitHub

Tengo en tu repo local el commit `0314f16` (favicon correcto) y todos los archivos nuevos del motor (`kudos_engine/`). Ejecuta:

```powershell
cd C:\Users\efert\kudos_project
git add kudos_engine/
git commit -m "Motor KUDOS Engine · tier algorithm + pipeline gratis (Wikimedia + Edge-TTS + ffmpeg) + stubs Sora/Veo/Kling"
git push origin master
```

Render desplegará el favicon nuevo en automático. El motor no necesita despliegue — vive en tu PC y genera vídeos que luego subes a `experience/public/capsules/`.

---

## Demo sandbox

He dejado una mini-demo de prueba en:

`kudos_engine\output\demo\coliseo_demo_sandbox.mp4`

Es solo 2.5 segundos (2 escenas + intro) generadas en mi entorno con imágenes sintéticas. **No es la cápsula real**, solo demuestra que el pipeline funciona técnicamente. La real la generas tú con el comando de arriba.

---

## Próximo paso que necesito de ti

1. Ejecuta el `pip install` y verifica ffmpeg
2. Ejecuta `python -m kudos_engine generate --poi rome`
3. Cuando tengas el `capsula.mp4`, ábrelo y dime qué tal
4. Si te gusta: lo subimos a producción reemplazando `experience/public/capsules/coliseo-final.mp4`
5. Si no te gusta: ajustamos (más escenas, voz distinta, otro grading, más cinematográfico…)

No tienes que decidir entre Sora/Veo/Kling ahora. Primero comprobamos qué calidad da la pipeline gratis. Si es suficiente para arrancar, lo dejamos así. Si quieres subir nivel, activamos un motor premium cuando toque.
