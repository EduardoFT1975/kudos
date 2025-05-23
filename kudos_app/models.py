# kudos_app/models.py

"""
Modelos de datos para kudos_app.
Define las entidades del sistema multidimensional 1D~5D de Kudos.
"""

from django.db import models
from django.utils import timezone
from django.contrib.gis.db import models as gis_models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.postgres.fields import ArrayField
import uuid

class UserManager(BaseUserManager):
    def create_user(self, uid, alias, email=None, password=None, **extra_fields):
        if not uid:
            raise ValueError('El campo UID es obligatorio.')
        if not alias:
            raise ValueError('El campo Alias es obligatorio.')
        email = self.normalize_email(email)
        user = self.model(uid=uid, alias=alias, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, uid, alias, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(uid, alias, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    uid = models.CharField(max_length=255, unique=True)
    alias = models.CharField(max_length=255, unique=True, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)  # Cambiado
    notification_distance = models.IntegerField(default=500)
    privacy = models.CharField(max_length=50, default='publico')
    role = models.CharField(max_length=50, default='user')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    necesidades = models.JSONField(default=dict)  # Cambiado a dict
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    ubicacion = gis_models.PointField(null=True, blank=True)

    USERNAME_FIELD = 'uid'
    REQUIRED_FIELDS = ['alias']

    objects = UserManager()  # Cambiado a UserManager

    def __str__(self):
        return self.uid

    class Meta:
        db_table = 'kudos_app_user'

class AdminAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_level = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.alias} - Nivel {self.access_level}"

class AutomationConfig(models.Model):
    automation_level = models.IntegerField(default=10)
    support_automation = models.BooleanField(default=True)
    support_threshold = models.FloatField(default=0.5)
    moderation_automation = models.BooleanField(default=True)
    moderation_threshold = models.FloatField(default=0.2)
    moderation_review_frequency = models.CharField(max_length=50, choices=[
        ('daily', 'Diaria'), ('weekly', 'Semanal')
    ], default='daily')
    content_creation_frequency = models.CharField(max_length=50, choices=[
        ('daily', 'Diaria'), ('weekly', 'Semanal')
    ], default='daily')
    content_creation_limit = models.IntegerField(default=100)
    storage_network = models.CharField(max_length=50, default='none')
    storage_limit_per_user = models.IntegerField(default=1000)
    processing_network = models.CharField(max_length=50, default='none')
    max_task_cost = models.FloatField(default=1.0)
    webgpu_enabled = models.BooleanField(default=True)
    compression_level = models.IntegerField(default=5)
    energy_renewable_percentage = models.IntegerField(default=50)
    energy_reduction_goal = models.IntegerField(default=10)

    def __str__(self):
        return "Configuración de Automatización"


class Capsule(models.Model):
    uid = models.CharField(max_length=100, unique=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    contenido = models.TextField()
    ubicacion = gis_models.PointField(null=True, blank=True)
    modo = models.CharField(max_length=50, default='publico')
    fecha = models.DateField(default=timezone.now)
    timestamp = models.DateTimeField(default=timezone.now)
    privacy = models.CharField(max_length=50, default='publico')
    time_scale = models.CharField(max_length=50, default='dia')
    price = models.FloatField(default=0.0)
    temas = models.JSONField(default=list)
    parameters = models.JSONField(default=dict)

    def __str__(self):
        return f"Capsule {self.uid} by {self.usuario.username}"


class Route(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    contenido = models.TextField()
    ubicacion = gis_models.PointField(null=True, blank=True)
    modo = models.CharField(max_length=20, default='publico')
    fecha = models.DateField(default=timezone.now)
    privacy = models.CharField(max_length=20, default='publico', choices=[
        ('solo_yo', 'Solo Yo'), ('familia', 'Familia'), ('amigos', 'Amigos'), ('publico', 'Público')
    ])
    time_scale = models.CharField(max_length=20, default='dia')
    distance = models.FloatField(default=0.0)
    altitude_gain = models.FloatField(default=0.0)
    sport_type = models.CharField(max_length=20, default='other')
    price = models.FloatField(default=0.0)
    temas = ArrayField(models.CharField(max_length=100), default=list)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    timestamp = models.DateTimeField(default=timezone.now)
    attribution = models.TextField(blank=True)

    def __str__(self):
        return f"{self.contenido[:50]}... ({self.uid})"

class POI(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=100)
    ubicacion = gis_models.PointField()
    description = models.TextField()
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    timestamp = models.DateTimeField(default=timezone.now)
    attribution = models.TextField(blank=True)

    def __str__(self):
        return self.nombre

class Alert(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20)
    message = models.TextField()
    severity = models.CharField(max_length=20, default='media', choices=[
        ('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')
    ])
    location = gis_models.PointField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    expiration = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='activa', choices=[
        ('activa', 'Activa'), ('expirada', 'Expirada')
    ])
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.type} - {self.message[:50]}..."

class WisdomSpace(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    subthemes = ArrayField(models.CharField(max_length=100), default=list)
    description = models.TextField()
    ubicacion = gis_models.PointField()
    theme = models.CharField(max_length=50)
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    attribution = models.TextField(blank=True)

    def __str__(self):
        return self.name

class PromotionSpace(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=50)
    subcategory = models.CharField(max_length=50)
    description = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    ubicacion = gis_models.PointField()
    price = models.FloatField(default=0.0)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    attribution = models.TextField(blank=True)

    def __str__(self):
        return f"{self.category} - {self.subcategory}"

class SocialSpace(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_spaces')
    theme = models.CharField(max_length=50)
    description = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    ubicacion = gis_models.PointField()
    price = models.FloatField(default=0.0)
    participants = models.ManyToManyField(User, related_name='social_spaces')
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    attribution = models.TextField(blank=True)

    def __str__(self):
        return self.theme

class Comment(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return f"Comment by {self.user.alias} on {self.capsule.contenido[:50]}..."

class Like(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='likes')
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Like by {self.user.alias} on {self.capsule.contenido[:50]}..."

class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=20)
    message = models.TextField()
    priority = models.CharField(max_length=20, default='media', choices=[
        ('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')
    ])
    location = gis_models.PointField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, default='No leída', choices=[
        ('No leída', 'No leída'), ('Leída', 'Leída'), ('Procesada', 'Procesada')
    ])
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    sent = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.type} - {self.message[:50]}..."

class SettingsConfig(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.IntegerField(null=True, blank=True)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)
    last_run = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.key

class Character(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=20)
    theme = models.CharField(max_length=50)
    culture = models.CharField(max_length=50)
    nationality = models.CharField(max_length=50)
    religion = models.CharField(max_length=50, null=True, blank=True)
    imagen_ninos = models.URLField()
    imagen_adultos = models.URLField()
    audio_guia = models.URLField(null=True, blank=True)
    modelo_ar = models.URLField(null=True, blank=True)

    def __str__(self):
        return self.nombre

class ExternalData(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    source = models.CharField(max_length=50)
    category = models.CharField(max_length=50)
    content = models.JSONField()
    timestamp = models.DateTimeField(default=timezone.now)
    relevance_score = models.FloatField(default=0.0)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.source} - {self.category}"

class ImprovementProposal(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50)
    description = models.TextField()
    priority = models.CharField(max_length=20, default='media', choices=[
        ('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')
    ])
    estimated_benefit = models.FloatField()
    estimated_cost = models.FloatField()
    status = models.CharField(max_length=20, default='pendiente', choices=[
        ('pendiente', 'Pendiente'), ('validada', 'Validada'), ('en_progreso', 'En Progreso'), ('completada', 'Completada')
    ])
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.category} - {self.description[:50]}..."

class Transaction(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content_type = models.CharField(max_length=50)
    content_id = models.CharField(max_length=50)
    amount = models.FloatField()
    commission = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.content_type} - {self.amount}"

class Feedback(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100, default="Anónimo")
    email = models.EmailField(null=True, blank=True)
    rating = models.CharField(max_length=1, choices=[('1', '1'), ('2', '2'), ('3', '3'), ('4', '4'), ('5', '5')])
    comment = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.rating} - {self.comment[:50]}..."

class Activity(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    descripcion = models.TextField()
    ubicacion = gis_models.PointField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.descripcion[:50]}..."

class VirtualOperation(models.Model):
    uid = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=20)
    title = models.CharField(max_length=100)
    description = models.TextField()
    price = models.FloatField()
    location = gis_models.PointField()
    city = models.CharField(max_length=50)
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict)
    variables = models.JSONField(default=dict)

    def __str__(self):
        return self.title

class Badge(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    description = models.TextField()
    date_awarded = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} - {self.user.alias}"

class Certificate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(Capsule, on_delete=models.CASCADE)
    date_issued = models.DateTimeField(default=timezone.now)
    certificate_file = models.FileField(upload_to='certificates/')

    def __str__(self):
        return f"Certificate for {self.user.alias} - {self.plan.contenido}"