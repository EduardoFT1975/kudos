"""Migración para los nuevos campos de Cápsula:
  - Dimensiones extra (altitud, era, capa dimensional)
  - Enriquecimiento por IA (resumen, temas, vídeo, audio, calidad)
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kudos_app', '0002_ai_and_social'),
    ]

    operations = [
        migrations.AddField(
            model_name='capsule',
            name='altitud',
            field=models.FloatField(blank=True, null=True,
                                    help_text='Metros sobre nivel del mar (3D)'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='era',
            field=models.CharField(
                blank=True, default='actual', max_length=20,
                choices=[('antigua', 'Edad Antigua (-3000 → 476)'),
                         ('media', 'Edad Media (476 → 1492)'),
                         ('moderna', 'Edad Moderna (1492 → 1789)'),
                         ('contemporanea', 'Edad Contemporánea (1789 → 2000)'),
                         ('actual', 'Era Actual (2000 → hoy)'),
                         ('futura', 'Futuro proyectado')],
                help_text='Era histórica (4D)'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='dimension_layer',
            field=models.CharField(
                default='fisica', max_length=20,
                choices=[('fisica', '🌍 Física - lo que ocurrió'),
                         ('emocional', '💗 Emocional - lo que se sintió'),
                         ('cognitiva', '🧠 Cognitiva - lo que se pensó'),
                         ('social', '👥 Social - lo colectivo'),
                         ('espiritual', '✨ Espiritual - lo trascendente')],
                help_text='Capa de realidad (5D)'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_enriched',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_summary',
            field=models.TextField(blank=True, default='',
                                   help_text='Resumen generado por la IA interna'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_themes',
            field=models.JSONField(blank=True, default=list,
                                   help_text='Temas inferidos por IA'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_video_seed',
            field=models.CharField(blank=True, default='', max_length=200,
                                   help_text='Semilla determinista para el clip de vídeo'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_audio_voice',
            field=models.CharField(blank=True, default='', max_length=40,
                                   help_text='Código del personaje narrador'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_quality_score',
            field=models.FloatField(default=0, help_text='0–10 calidad estimada'),
        ),
        migrations.AddField(
            model_name='capsule',
            name='ai_enriched_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
