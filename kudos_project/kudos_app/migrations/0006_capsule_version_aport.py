"""Versionado de cápsulas + capa Diálogo / Hecho (MEMENTO V2)."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ('kudos_app', '0005_userpreference'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CapsuleVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version_number', models.IntegerField(default=1)),
                ('titulo', models.CharField(blank=True, default='', max_length=200)),
                ('contenido', models.TextField(blank=True, default='')),
                ('image', models.CharField(blank=True, default='', max_length=500)),
                ('parameters_snapshot', models.JSONField(blank=True, default=dict)),
                ('change_summary', models.CharField(blank=True, default='', max_length=300)),
                ('created', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('capsule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                               related_name='versions', to='kudos_app.capsule')),
                ('created_by', models.ForeignKey(blank=True, null=True,
                                                  on_delete=django.db.models.deletion.SET_NULL,
                                                  related_name='capsule_edits',
                                                  to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-version_number'],
                     'unique_together': {('capsule', 'version_number')},
                     'verbose_name': 'Versión de cápsula',
                     'verbose_name_plural': 'Versiones de cápsulas'},
        ),
        migrations.CreateModel(
            name='CapsuleAport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('layer', models.CharField(choices=[('fact', '🔬 Hecho (verificable)'),
                                                     ('dialog', '💬 Diálogo (opinión)')],
                                            default='dialog', max_length=10)),
                ('status', models.CharField(choices=[('pending', 'Pendiente · capa IA'),
                                                      ('mission', 'En revisión · misioneros'),
                                                      ('cco', 'En auditoría · CCO'),
                                                      ('accepted', 'Aceptado'),
                                                      ('rejected', 'Rechazado'),
                                                      ('published', 'Publicado en diálogo')],
                                             default='pending', max_length=15)),
                ('body', models.TextField()),
                ('media_url', models.CharField(blank=True, default='', max_length=500)),
                ('proposed_field', models.CharField(blank=True, default='', max_length=50)),
                ('proposed_value', models.TextField(blank=True, default='')),
                ('sources', models.JSONField(blank=True, default=list)),
                ('ai_score', models.FloatField(default=0)),
                ('ai_notes', models.TextField(blank=True, default='')),
                ('cco_decision', models.CharField(blank=True, default='', max_length=20)),
                ('likes', models.IntegerField(default=0)),
                ('dislikes', models.IntegerField(default=0)),
                ('kudos_awarded', models.IntegerField(default=0)),
                ('created', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('resolved', models.DateTimeField(blank=True, null=True)),
                ('capsule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                               related_name='aports', to='kudos_app.capsule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                            related_name='capsule_aports',
                                            to=settings.AUTH_USER_MODEL)),
                ('validators', models.ManyToManyField(blank=True, related_name='aports_validated',
                                                       to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created'],
                     'verbose_name': 'Aporte a cápsula',
                     'verbose_name_plural': 'Aportes a cápsulas'},
        ),
    ]
