"""KUDOS · Phase MVP Maquetas · Mérito + Mi Mundo persistence.

Añade el backend necesario para que `lib/kudos/store.ts` (frontend Next.js)
deje localStorage y persista contra Django. Modelos cubiertos:

  · MeritEvent · Evento granular de mérito (5 pilares).
  · Visit      · Registro "Estuve aquí" (user × place).
  · Streak     · Racha diaria del usuario (OneToOne).
  · Collection · Colecciones de Mi Mundo (manual/saved/visited/affinity).

Modificaciones a modelos existentes:

  · Bookmark · ahora soporta también `Place` (no sólo Capsule).
              `capsule` pasa a opcional, se añade `place` opcional, y se
              impone CHECK XOR para garantizar que cada Bookmark apunta
              a UNO de los dos.
              Los unique_together antiguos se sustituyen por
              UniqueConstraint condicionales.

Apply manual:   python manage.py migrate kudos_app 0008
Rollback:       python manage.py migrate kudos_app 0007

Reversible: sí, sin pérdida de datos (los Bookmarks existentes apuntan
a Capsule no-null y siguen cumpliendo la CHECK constraint).
"""
from __future__ import annotations

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kudos_app', '0007_axon_foundation'),
    ]

    operations = [
        # ---------------------------------------------------------------
        # 1. Bookmark · extender para soportar Place además de Capsule.
        # ---------------------------------------------------------------
        # Quitar el unique_together antiguo antes de cambiar nullability
        # de `capsule` (constraint se reemplaza por UniqueConstraint
        # condicional al final).
        migrations.AlterUniqueTogether(
            name='bookmark',
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name='bookmark',
            name='capsule',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookmarked_by',
                to='kudos_app.capsule',
            ),
        ),
        migrations.AddField(
            model_name='bookmark',
            name='place',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookmarked_by',
                to='kudos_app.place',
            ),
        ),
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.CheckConstraint(
                check=(
                    models.Q(capsule__isnull=False, place__isnull=True)
                    | models.Q(capsule__isnull=True, place__isnull=False)
                ),
                name='bookmark_xor_capsule_place',
            ),
        ),
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.UniqueConstraint(
                condition=models.Q(capsule__isnull=False),
                fields=('user', 'capsule'),
                name='bookmark_unique_user_capsule',
            ),
        ),
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.UniqueConstraint(
                condition=models.Q(place__isnull=False),
                fields=('user', 'place'),
                name='bookmark_unique_user_place',
            ),
        ),

        # ---------------------------------------------------------------
        # 2. MeritEvent · evento granular de mérito.
        # ---------------------------------------------------------------
        migrations.CreateModel(
            name='MeritEvent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True,
                                         serialize=False, verbose_name='ID')),
                ('pillar', models.CharField(
                    choices=[
                        ('creacion', 'Creación'),
                        ('inspiracion', 'Inspiración'),
                        ('descubrimiento', 'Descubrimiento'),
                        ('comunidad', 'Comunidad'),
                        ('integridad', 'Integridad'),
                    ],
                    db_index=True, max_length=20,
                )),
                ('points', models.IntegerField(
                    help_text='Puntos otorgados. Positivo = ganado, negativo = sancionado.',
                )),
                ('label', models.CharField(
                    blank=True, default='', max_length=200,
                    help_text='Etiqueta legible (ej. "Compartiste una cápsula").',
                )),
                ('ts', models.DateTimeField(
                    db_index=True, default=django.utils.timezone.now,
                )),
                ('capsule', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='merit_events',
                    to='kudos_app.capsule',
                )),
                ('place', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='merit_events',
                    to='kudos_app.place',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='merit_events',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Evento de mérito',
                'verbose_name_plural': 'Eventos de mérito',
                'ordering': ['-ts'],
            },
        ),
        migrations.AddIndex(
            model_name='meritevent',
            index=models.Index(fields=['user', '-ts'],
                               name='meritevent_user_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='meritevent',
            index=models.Index(fields=['user', 'pillar'],
                               name='meritevent_user_pillar_idx'),
        ),

        # ---------------------------------------------------------------
        # 3. Visit · "Estuve aquí".
        # ---------------------------------------------------------------
        migrations.CreateModel(
            name='Visit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True,
                                         serialize=False, verbose_name='ID')),
                ('ts', models.DateTimeField(
                    db_index=True, default=django.utils.timezone.now,
                )),
                ('lat', models.FloatField(
                    blank=True, null=True,
                    help_text='Lat donde se registró (puede diferir de Place.latitud).',
                )),
                ('lon', models.FloatField(blank=True, null=True)),
                ('place', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='visits', to='kudos_app.place',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='visits', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Visita',
                'verbose_name_plural': 'Visitas',
                'ordering': ['-ts'],
                'unique_together': {('user', 'place')},
            },
        ),
        migrations.AddIndex(
            model_name='visit',
            index=models.Index(fields=['user', '-ts'],
                               name='visit_user_ts_idx'),
        ),

        # ---------------------------------------------------------------
        # 4. Streak · racha diaria.
        # ---------------------------------------------------------------
        migrations.CreateModel(
            name='Streak',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True,
                                         serialize=False, verbose_name='ID')),
                ('last_day', models.DateField(
                    blank=True, null=True,
                    help_text='Último día (UTC) en que se "tickeó" la racha.',
                )),
                ('days', models.IntegerField(
                    default=0,
                    help_text='Días consecutivos activos. 0 = sin racha.',
                )),
                ('best_days', models.IntegerField(
                    default=0,
                    help_text='Récord histórico de días consecutivos.',
                )),
                ('updated', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='streak', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Racha',
                'verbose_name_plural': 'Rachas',
            },
        ),

        # ---------------------------------------------------------------
        # 5. Collection · colecciones de Mi Mundo.
        # ---------------------------------------------------------------
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True,
                                         serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('slug', models.SlugField(max_length=140)),
                ('description', models.TextField(blank=True, default='')),
                ('kind', models.CharField(
                    choices=[
                        ('manual', 'Manual'),
                        ('saved', 'Guardados'),
                        ('visited', 'Visitados'),
                        ('affinity', 'Afinidad temática'),
                    ],
                    db_index=True, default='manual', max_length=20,
                )),
                ('cover_image', models.CharField(
                    blank=True, default='', max_length=500,
                    help_text='URL de portada opcional.',
                )),
                ('is_public', models.BooleanField(
                    default=False,
                    help_text='Si True, otros usuarios pueden verla (post-MVP).',
                )),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('capsules', models.ManyToManyField(
                    blank=True, related_name='collections',
                    to='kudos_app.capsule',
                )),
                ('places', models.ManyToManyField(
                    blank=True, related_name='collections',
                    to='kudos_app.place',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='collections', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Colección',
                'verbose_name_plural': 'Colecciones',
                'ordering': ['-updated'],
                'unique_together': {('user', 'slug')},
            },
        ),
    ]
