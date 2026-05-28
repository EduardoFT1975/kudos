"""
KUDOS Engine — Provider de animación cinematográfica con ffmpeg.

Convierte fotos estáticas en clips de vídeo con efecto Ken Burns (zoom + paneo
lento) + color grading dorado/púrpura KUDOS + máscara 9:16 vertical.

Estilo objetivo: documental Apple Vision Pro / Netflix Ancient Apocalypse.

API pública:
  - kenburns_clip(image, out, duration, direction) → genera un MP4 por foto
  - concat_scenes(clips, voices, music, out) → ensambla la cápsula final

Resolución: 1080x1920 (9:16), 30fps, h264.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Literal, Optional


FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

WIDTH = 1080
HEIGHT = 1920
FPS = 30


# Filtros de color grading KUDOS — dorado cálido + sombras púrpuras
GRADING_KUDOS = (
    # Curves: realza highlights dorados, baja sombras a violeta
    "curves=r='0/0 0.3/0.32 0.7/0.78 1/1':"
    "g='0/0 0.3/0.28 0.7/0.7 1/0.96':"
    "b='0/0.04 0.3/0.22 0.7/0.55 1/0.86',"
    # Saturación ligeramente alta
    "eq=saturation=1.15:contrast=1.10:brightness=-0.02,"
    # Vignette sutil
    "vignette=PI/5"
)


def _run(cmd: list[str]) -> None:
    """Ejecuta ffmpeg/ffprobe con manejo de error claro."""
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"ffmpeg falló:\n  cmd: {' '.join(cmd)}\n  stderr: {e.stderr}"
        ) from e


def kenburns_clip(
    image: Path,
    out: Path,
    duration: float = 3.0,
    direction: Literal["in", "out", "left", "right", "up", "down"] = "in",
    grading: bool = True,
) -> Path:
    """
    Genera un clip MP4 9:16 con efecto Ken Burns sobre `image`.

    `direction`:
      - "in"    → zoom de 1.0 a 1.25 hacia el centro (gravitas, apertura)
      - "out"   → zoom de 1.25 a 1.0 (revelación, cierre)
      - "left"  → paneo izquierda con zoom suave
      - "right" → paneo derecha con zoom suave
      - "up"    → paneo arriba
      - "down"  → paneo abajo
    """
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)

    frames = int(duration * FPS)

    # Zoompan reúne el efecto Ken Burns.
    # Trabajamos en 8K virtual (s=8000x8000) para no pixelar al hacer zoom.
    src_w = 5400  # ancho de trabajo
    src_h = 9600  # alto de trabajo

    # zoompan necesita "z=" para zoom y "x=", "y=" para paneo. d=duración en frames.
    zoom_exprs = {
        "in":    f"zoompan=z='min(zoom+0.0008,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        "out":   f"zoompan=z='if(eq(on,0),1.25,max(1.0,zoom-0.0008))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        "left":  f"zoompan=z='min(zoom+0.0006,1.15)':x='iw-(iw/zoom)-on*4':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        "right": f"zoompan=z='min(zoom+0.0006,1.15)':x='on*4':y='ih/2-(ih/zoom/2)':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        "up":    f"zoompan=z='min(zoom+0.0006,1.15)':x='iw/2-(iw/zoom/2)':y='ih-(ih/zoom)-on*6':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        "down":  f"zoompan=z='min(zoom+0.0006,1.15)':x='iw/2-(iw/zoom/2)':y='on*6':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
    }
    zoom_expr = zoom_exprs.get(direction, zoom_exprs["in"])

    vf_parts = [
        # 1) Escalar al lienzo 9:16 cubriendo (crop si hace falta)
        f"scale={src_w}:{src_h}:force_original_aspect_ratio=increase",
        f"crop={src_w}:{src_h}",
        # 2) Ken Burns (zoompan)
        zoom_expr,
    ]
    if grading:
        vf_parts.append(GRADING_KUDOS)

    vf = ",".join(vf_parts)

    cmd = [
        FFMPEG, "-y",
        "-loop", "1",
        "-i", str(image),
        "-t", f"{duration:.2f}",
        "-vf", vf,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "20",
        "-r", str(FPS),
        str(out),
    ]
    _run(cmd)
    return out


def concat_scenes(
    clips: list[Path],
    out: Path,
    voice_files: Optional[list[Optional[Path]]] = None,
    music_file: Optional[Path] = None,
    music_volume: float = 0.18,
    voice_volume: float = 1.0,
    fade_seconds: float = 0.3,
) -> Path:
    """
    Concatena clips, añade voz por escena (alineada al inicio de cada clip),
    mezcla música de fondo a `music_volume`, y aplica fades.

    Retorna la ruta al MP4 final.
    """
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)

    if not clips:
        raise ValueError("concat_scenes: lista de clips vacía")

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)

        # 1) Concatenar vídeo (sin audio)
        list_file = td_path / "concat.txt"
        list_file.write_text(
            "\n".join(f"file '{c.resolve()}'" for c in clips),
            encoding="utf-8",
        )
        video_only = td_path / "video_only.mp4"
        _run([
            FFMPEG, "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            str(video_only),
        ])

        # 2) Construir pista de voz: cada voz arranca al segundo donde empieza su clip
        voice_track: Optional[Path] = None
        if voice_files:
            # Calcular tiempos de inicio de cada escena
            durations = [_probe_duration(c) for c in clips]
            offsets = []
            t = 0.0
            for d in durations:
                offsets.append(t)
                t += d

            inputs: list[str] = []
            filter_parts: list[str] = []
            mix_labels: list[str] = []
            valid_idx = 0
            for i, vf in enumerate(voice_files):
                if vf is None or not Path(vf).exists():
                    continue
                inputs += ["-i", str(vf)]
                delay_ms = int(offsets[i] * 1000)
                # adelay aplica delay en milisegundos al canal
                filter_parts.append(
                    f"[{valid_idx}:a]adelay={delay_ms}|{delay_ms},"
                    f"volume={voice_volume}[v{valid_idx}]"
                )
                mix_labels.append(f"[v{valid_idx}]")
                valid_idx += 1

            if valid_idx > 0:
                filter_parts.append("".join(mix_labels) + f"amix=inputs={valid_idx}:normalize=0[vout]")
                voice_track = td_path / "voice.m4a"
                _run([
                    FFMPEG, "-y",
                    *inputs,
                    "-filter_complex", ";".join(filter_parts),
                    "-map", "[vout]",
                    "-c:a", "aac", "-b:a", "192k",
                    str(voice_track),
                ])

        # 3) Mezclar voz + música
        total_duration = sum(_probe_duration(c) for c in clips)
        final_audio: Optional[Path] = None

        if music_file and Path(music_file).exists() and voice_track:
            final_audio = td_path / "final_audio.m4a"
            _run([
                FFMPEG, "-y",
                "-i", str(voice_track),
                "-i", str(music_file),
                "-filter_complex",
                f"[1:a]volume={music_volume},afade=t=in:st=0:d={fade_seconds},"
                f"afade=t=out:st={max(0, total_duration-fade_seconds):.2f}:d={fade_seconds}[bg];"
                f"[0:a][bg]amix=inputs=2:duration=first:normalize=0[a]",
                "-map", "[a]",
                "-t", f"{total_duration:.2f}",
                "-c:a", "aac", "-b:a", "192k",
                str(final_audio),
            ])
        elif voice_track:
            final_audio = voice_track
        elif music_file and Path(music_file).exists():
            final_audio = td_path / "final_audio.m4a"
            _run([
                FFMPEG, "-y",
                "-i", str(music_file),
                "-filter_complex",
                f"volume={music_volume},afade=t=in:st=0:d={fade_seconds},"
                f"afade=t=out:st={max(0, total_duration-fade_seconds):.2f}:d={fade_seconds}",
                "-t", f"{total_duration:.2f}",
                "-c:a", "aac", "-b:a", "192k",
                str(final_audio),
            ])

        # 4) Multiplexar vídeo + audio final
        if final_audio:
            _run([
                FFMPEG, "-y",
                "-i", str(video_only),
                "-i", str(final_audio),
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                str(out),
            ])
        else:
            # sin audio
            shutil.copyfile(video_only, out)

    return out


def _probe_duration(media: Path) -> float:
    """Devuelve la duración en segundos de un archivo de medios."""
    result = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(media)],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def build_intro(out: Path, duration: float = 0.8) -> Path:
    """
    Genera un intro KUDOS de `duration` segundos: fondo navy + logo blanco.
    El logo es texto 'KUDOS' centrado, con la tipografía por defecto de ffmpeg.
    Si quieres usar el SVG real, exporta a PNG y úsalo como overlay.
    """
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    _run([
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", f"color=c=0x1A1333:size={WIDTH}x{HEIGHT}:rate={FPS}:duration={duration:.2f}",
        "-vf",
        (
            "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
            "text='KUDOS':fontsize=180:fontcolor=white:"
            "x=(w-text_w)/2:y=(h-text_h)/2,"
            "fade=t=in:st=0:d=0.2,fade=t=out:st=0.5:d=0.3"
        ),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "20",
        str(out),
    ])
    return out
