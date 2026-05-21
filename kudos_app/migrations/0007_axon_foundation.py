"""AXÓN · Phase 0 · Foundation contextual.

Cambios atómicos y reversibles:

  1. CreateModel `Place` (slug · name · país · lat/lon · summary · description ·
     image · era_range · capsule_count denormalizado).
  2. Capsule += {place FK, parent_capsule FK self, root_capsule FK self,
     context_layer, importance_score (db_index), verified}.
  3. RunPython backfill ligero: importance_score := ai_quality_score / 10
     para cápsulas con ai_quality_score > 0. Reverso = no-op (NULL → 0 vuelve
     a 0; pierde el seed, sin daño estructural).

No toca: dimension_layer, modo, privacy, era, fecha — campos ortogonales que
ya viven en producción. `lugar` (CharField string) se mantiene; un management
command (`seed_rome`) hace el linkage progresivo.

Apply manual:   python manage.py migrate kudos_app 0007
Rollback:       python manage.py migrate kudos_app 0006
"""
from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


# ----------------------------------------------------------------------------
# Data migration · backfill importance_score desde ai_quality_score.
# ----------------------------------------------------------------------------
def _backfill_importance_score(apps, schema_editor):
    Capsule = apps.get_model('kudos_app', 'Capsule')
    # Iteramos en chunks para no cargar todo en memoria si la tabla crece.
    qs = Capsule.objects.filter(ai_quality_score__gt=0)
    batch = []
    BATCH_SIZE = 500
    for c in qs.iterator(chunk_size=BATCH_SIZE):
        # ai_quality_score es 0..10 → normalizamos a 0..1.
        c.importance_score = max(0.0, min(1.0, float(c.ai_quality_score) / 10.0))
        batch.append(c)
        if len(batch) >= BATCH_SIZE:
            Capsule.objects.bulk_update(batch, ['importance_score'])
            batch.clear()
    if batch:
        Capsule.objects.bulk_update(batch, ['importance_score'])


def _noop_reverse(apps, schema_editor):
    # No revertimos el seed: borrar el campo entero lo limpia al rollback.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('kudos_app', '0006_capsule_version_aport'),
    ]

    operations = [
        # ────────────────────────────────────────────────────────────────────
        # 1 · Place (modelo nuevo, autocontenido, sin dependencias externas)
        # ────────────────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Place',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True,
                                            serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=120, unique=True,
                                          help_text='Identificador URL-safe del lugar')),
                ('name', models.CharField(max_length=200)),
                ('country', models.CharField(blank=True, default='', max_length=80)),
                ('latitud', models.FloatField(blank=True, null=True)),
                ('longitud', models.FloatField(blank=True, null=True)),
                ('summary', models.TextField(blank=True, default='')),
                ('description', models.TextField(blank=True, default='')),
                ('image', models.CharField(blank=True, default='', max_length=500)),
                ('era_range_from', models.IntegerField(blank=True, null=True,
                                                       help_text='Año mínimo cubierto (negativo = a.C.)')),
                ('era_range_to', models.IntegerField(blank=True, null=True,
                                                     help_text='Año máximo cubierto')),
                ('capsule_count', models.IntegerField(default=0,
                                                      help_text='Denormalizado · actualizado por command')),
                ('created', models.DateTimeField(default=django.utils.timezone.now, db_index=True)),
                ('updated', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'verbose_name': 'Lugar',
                'verbose_name_plural': 'Lugares',
                'ordering': ['name'],
            },
        ),

        # ────────────────────────────────────────────────────────────────────
        # 2 · Capsule field deltas (todos nullable / con default)
        # ────────────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='capsule',
            name='place',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='capsules',
                to='kudos_app.place',
                help_text='Lugar canónico (Phase 0). El campo legacy `lugar` (string) se mantiene.',
            ),
        ),
        migrations.AddField(
            model_name='capsule',
            name='parent_capsule',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='children',
                to='kudos_app.capsule',
                help_text='Cápsula padre directa (jerarquía contextual).',
            ),
        ),
        migrations.AddField(
            model_name='capsule',
            name='root_capsule',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='descendants',
                to='kudos_app.capsule',
                help_text='Cápsula raíz del árbol (denormalizado para queries O(1)).',
            ),
        ),
        migrations.AddField(
            model_name='capsule',
            name='context_layer',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('OFFICIAL', 'Oficial'),
                    ('COMMUNITY', 'Comunidad'),
                    ('PERSONAL', 'Personal'),
                    ('TEMPORAL', 'Temporal'),
                    ('EMOTIONAL', 'Emocional'),
                ],
                default='COMMUNITY',
                db_index=True,
                help_text='Capa de contexto (ortogonal a dimension_layer).',
            ),
        ),
        migrations.AddField(
            model_name='capsule',
            name='importance_score',
            field=models.FloatField(
                default=0.0,
                db_index=True,
                help_text='0..1 · semilla del CIE. En Phase 0 backfill desde ai_quality_score / 10.',
            ),
        ),
        migrations.AddField(
            model_name='capsule',
            name='verified',
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text='Verificación binaria mínima (Phase 0). En Phase 2 se reemplaza por verification_state granular.',
            ),
        ),

        # ────────────────────────────────────────────────────────────────────
        # 3 · Backfill importance_score
        # ────────────────────────────────────────────────────────────────────
        migrations.RunPython(_backfill_importance_score, _noop_reverse),
    ]
