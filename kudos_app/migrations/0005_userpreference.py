"""UserPreference para feed personalizado y geofencing."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('kudos_app', '0004_capsule_more_modes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('interests', models.JSONField(blank=True, default=list, help_text='Lista de tags de tema preferidos.')),
                ('preferred_dimension', models.CharField(blank=True, choices=[('', 'Todas'), ('fisica', 'Física'), ('emocional', 'Emocional'), ('cognitiva', 'Cognitiva'), ('social', 'Social'), ('espiritual', 'Espiritual')], default='', max_length=20)),
                ('preferred_era', models.CharField(blank=True, default='', max_length=20)),
                ('preferred_voice', models.CharField(blank=True, default='', max_length=30)),
                ('notif_radius_m', models.IntegerField(default=500)),
                ('notif_zero', models.BooleanField(default=True)),
                ('notif_revelation', models.BooleanField(default=True)),
                ('notif_alert', models.BooleanField(default=False)),
                ('intervention_level', models.CharField(default='guide', max_length=10)),
                ('home_lat', models.FloatField(blank=True, null=True)),
                ('home_lon', models.FloatField(blank=True, null=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,
                                               related_name='preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Preferencia de usuario',
                     'verbose_name_plural': 'Preferencias de usuario'},
        ),
    ]
