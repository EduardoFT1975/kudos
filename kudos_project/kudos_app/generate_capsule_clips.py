# generate_capsule_clips.py
import os
import sys
import django
from gtts import gTTS
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from django.utils import timezone
import requests
import shutil

# Añadir el directorio raíz del proyecto al sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '.'))
sys.path.append(project_root)

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

# Importar modelos
from kudos_app.models import Capsule

# Directorio para almacenar clips e imágenes
CLIP_DIR = "/app/clips"
IMAGE_DIR = "/app/images"
if not os.path.exists(CLIP_DIR):
    os.makedirs(CLIP_DIR)
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

# Clave de API de Unsplash (reemplazada con la clave proporcionada)
UNSPLASH_ACCESS_KEY = "YAHbJ6kW-hXbjLYvE46U_zDriefatNHt1gfSTE_0I4"

# Función para descargar una imagen de Unsplash basada en un tema
def download_unsplash_image(theme, capsule_uid):
    try:
        url = f"https://api.unsplash.com/search/photos?query={theme}&per_page=1&client_id={UNSPLASH_ACCESS_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if data['results']:
            image_url = data['results'][0]['urls']['regular']
            image_path = os.path.join(IMAGE_DIR, f"{capsule_uid}_{theme}.jpg")
            with requests.get(image_url, stream=True) as r:
                with open(image_path, 'wb') as f:
                    shutil.copyfileobj(r.raw, f)
            return image_path
        else:
            print(f"No se encontró imagen para el tema {theme}.")
            return None
    except Exception as e:
        print(f"Error al descargar imagen de Unsplash para {theme}: {e}")
        return None

# Función para generar un clip para una cápsula
def generate_clip(capsule):
    try:
        # Extraer el contenido de la cápsula
        content = capsule.contenido[:200]  # Limitar a 200 caracteres para mantener el clip corto
        if not content:
            print(f"Cápsula {capsule.uid} no tiene contenido.")
            return

        # Generar audio con gTTS
        tts = gTTS(text=content, lang='en')
        audio_path = os.path.join(CLIP_DIR, f"{capsule.uid}_audio.mp3")
        tts.save(audio_path)

        # Descargar imagen de Unsplash basada en los temas
        image_path = None
        for theme in capsule.temas:
            image_path = download_unsplash_image(theme.lower(), capsule.uid)
            if image_path:
                break
        if not image_path:
            print(f"No se encontró imagen para los temas de la cápsula {capsule.uid}.")
            return

        # Crear un clip de video con la imagen y el audio
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration
        if duration > 60:  # Limitar a 60 segundos
            duration = 60
            audio_clip = audio_clip.subclip(0, 60)

        image_clip = ImageClip(image_path, duration=duration)
        video_clip = image_clip.set_audio(audio_clip)

        # Guardar el clip
        clip_path = os.path.join(CLIP_DIR, f"{capsule.uid}_clip.mp4")
        video_clip.write_videofile(clip_path, fps=24, codec='libx264')

        # Actualizar la cápsula con la ruta del clip
        capsule.clip_path = clip_path
        capsule.save()

        # Limpiar archivos temporales
        audio_clip.close()
        video_clip.close()
        os.remove(audio_path)
        os.remove(image_path)

        print(f"Clip generado para cápsula {capsule.uid}: {clip_path}")

    except Exception as e:
        print(f"Error al generar clip para cápsula {capsule.uid}: {e}")

# Generar clips para las primeras 10 cápsulas (para pruebas)
capsules = Capsule.objects.all()[:10]  # Limitar a 10 para pruebas
for capsule in capsules:
    if not capsule.clip_path:  # Solo generar si no tiene clip
        generate_clip(capsule)

print(f"Total cápsulas procesadas: {len(capsules)}")