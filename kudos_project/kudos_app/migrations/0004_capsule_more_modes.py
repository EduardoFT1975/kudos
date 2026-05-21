"""Añade modos extra: negocio, museo, monumento, paisaje, eterno."""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('kudos_app', '0003_capsule_5d_and_ai'),
    ]

    operations = [
        migrations.AlterField(
            model_name='capsule',
            name='modo',
            field=models.CharField(
                default='historico', max_length=50,
                choices=[
                    ('historico', 'Histórico'),
                    ('ciudadano', 'Ciudadano'),
                    ('sabiduria', 'Sabiduría'),
                    ('arte', 'Arte'),
                    ('espiritual', 'Espiritual'),
                    ('personal', 'Personal'),
                    ('comercial', 'Comercial'),
                    ('negocio', '🏪 Negocio'),
                    ('museo', '🏛 Museo'),
                    ('monumento', '🗿 Monumento'),
                    ('paisaje', '🏞 Paisaje natural'),
                    ('eterno', '♾ Cápsula eterna'),
                ]),
        ),
    ]
