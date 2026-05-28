"""
KUDOS Engine — Motor cinematográfico para generar cápsulas de POIs.

Pipeline en 5 pasos:
  1. GUION    — Claude (Anthropic) genera estructura de 8 escenas + narración + beats
  2. VÍDEO    — Capa visual: fotos Wikimedia + Ken Burns ffmpeg (gratis)
                o bien clip IA de Kling/Sora/Veo (premium, opcional)
  3. VOZ      — Edge-TTS (gratis, Microsoft) o ElevenLabs (premium)
  4. MÚSICA   — Pista local de assets/music/ (royalty-free)
  5. MEZCLA   — ffmpeg ensamblaje final 9:16 vertical 1080x1920 con grading dorado KUDOS

Uso rápido:
  python -m kudos_engine generate --poi rome
  python -m kudos_engine score --csv lugares.csv
"""

__version__ = "0.1.0"
