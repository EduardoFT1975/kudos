"""Migración para los modelos de IA interna (KUDOS MIND) y la capa social
extra (Follow / DirectMessage / Bookmark / FeedItem).

Generada manualmente para que el usuario no tenga que ejecutar
`makemigrations`. Se aplica con:

    python manage.py migrate
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('kudos_app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ---------------- IA INTERNA ----------------
        migrations.CreateModel(
            name='AIAgent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=40, unique=True)),
                ('name', models.CharField(max_length=120)),
                ('kind', models.CharField(choices=[('importer', '📥 Importador de contenido'), ('curator', '🧠 Curador de cápsulas'), ('moderator', '🛡 Moderador de contenido'), ('analyst', '📊 Analista de KPIs'), ('narrator', '📜 Narrador / Resúmenes'), ('recommender', '🎯 Recomendador personal'), ('scheduler', '⏰ Planificador'), ('guardian', '🌿 Guardián del fundador')], default='analyst', max_length=20)),
                ('description', models.TextField(blank=True, default='')),
                ('icon', models.CharField(default='🤖', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('interval_seconds', models.IntegerField(default=300, help_text='Frecuencia objetivo entre ejecuciones')),
                ('last_run', models.DateTimeField(blank=True, null=True)),
                ('last_status', models.CharField(default='idle', max_length=20)),
                ('runs_total', models.IntegerField(default=0)),
                ('successes', models.IntegerField(default=0)),
                ('failures', models.IntegerField(default=0)),
                ('actions_total', models.IntegerField(default=0)),
                ('config', models.JSONField(blank=True, default=dict)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'ordering': ['kind', 'name'],
                'verbose_name': 'Agente IA',
                'verbose_name_plural': 'Agentes IA',
            },
        ),
        migrations.CreateModel(
            name='AIAction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=120)),
                ('level', models.CharField(choices=[('info', 'Info'), ('success', 'Éxito'), ('warning', 'Aviso'), ('error', 'Error')], default='info', max_length=10)),
                ('target_type', models.CharField(blank=True, default='', max_length=40)),
                ('target_id', models.CharField(blank=True, default='', max_length=80)),
                ('summary', models.TextField(blank=True, default='')),
                ('parameters', models.JSONField(blank=True, default=dict)),
                ('timestamp', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='actions', to='kudos_app.aiagent')),
            ],
            options={
                'ordering': ['-timestamp'],
                'verbose_name': 'Acción de IA',
                'verbose_name_plural': 'Acciones de IA',
            },
        ),
        migrations.CreateModel(
            name='AIInsight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('trend', '📈 Tendencia'), ('alert', '🚨 Alerta'), ('summary', '📜 Resumen'), ('recommendation', '🎯 Recomendación'), ('forecast', '🔮 Previsión'), ('milestone', '🏅 Hito')], default='summary', max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('body', models.TextField(default='')),
                ('impact', models.IntegerField(default=2, help_text='1=alto, 2=medio, 3=bajo')),
                ('related_url', models.CharField(blank=True, default='', max_length=300)),
                ('is_read', models.BooleanField(default=False)),
                ('is_archived', models.BooleanField(default=False)),
                ('parameters', models.JSONField(blank=True, default=dict)),
                ('created', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='insights', to='kudos_app.aiagent')),
            ],
            options={
                'ordering': ['impact', '-created'],
                'verbose_name': 'Insight de IA',
                'verbose_name_plural': 'Insights de IA',
            },
        ),
        migrations.CreateModel(
            name='AIDirective',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=160)),
                ('instruction', models.TextField()),
                ('scope', models.CharField(default='global', help_text='global, importer, curator, moderator, ...', max_length=40)),
                ('priority', models.IntegerField(default=2)),
                ('is_active', models.BooleanField(default=True)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='ai_directives', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['priority', '-created'],
                'verbose_name': 'Directiva IA',
                'verbose_name_plural': 'Directivas IA',
            },
        ),

        # ---------------- CAPA SOCIAL ----------------
        migrations.CreateModel(
            name='Follow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('follower', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='following_set', to=settings.AUTH_USER_MODEL)),
                ('following', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='follower_set', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created'],
                'unique_together': {('follower', 'following')},
            },
        ),
        migrations.CreateModel(
            name='DirectMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('body', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('timestamp', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_messages', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='Bookmark',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('note', models.CharField(blank=True, default='', max_length=200)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('capsule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookmarked_by', to='kudos_app.capsule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookmarks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created'],
                'unique_together': {('user', 'capsule')},
            },
        ),
        migrations.CreateModel(
            name='FeedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('headline', models.CharField(max_length=200)),
                ('body', models.TextField(blank=True, default='')),
                ('score', models.FloatField(default=0.5, help_text='Cuánto puntúa la IA este ítem')),
                ('reason', models.CharField(blank=True, default='', max_length=200)),
                ('is_seen', models.BooleanField(default=False)),
                ('created', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('capsule', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='kudos_app.capsule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feed_items', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-score', '-created'],
            },
        ),
    ]
