# kudos_app/models.py
"""
Modelos de datos del proyecto Kudos.

Versión simplificada compatible con SQLite (sin PostGIS).
La geolocalización se almacena como latitud/longitud en FloatField.
Los arrays se almacenan como JSONField (compatible con SQLite >= 3.9).
"""

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid


# ===================== USUARIO =====================
class UserManager(BaseUserManager):
    def create_user(self, uid, alias, email=None, password=None, **extra):
        if not uid:
            raise ValueError('UID obligatorio')
        if not alias:
            raise ValueError('Alias obligatorio')
        email = self.normalize_email(email) if email else None
        user = self.model(uid=uid, alias=alias, email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, uid, alias, email=None, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('is_active', True)
        extra.setdefault('role', 'admin')
        return self.create_user(uid, alias, email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Usuario de Kudos. Usa 'uid' como identificador único de login."""
    ROLE_CHOICES = [
        ('founder', 'Fundador'),
        ('admin', 'Administrador'),
        ('user', 'Usuario'),
        ('guest', 'Invitado'),
    ]

    uid = models.CharField(max_length=255, unique=True, help_text='Identificador único')
    alias = models.CharField(max_length=255, unique=True)
    email = models.EmailField(blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    avatar = models.URLField(blank=True, default='')

    # Geolocalización simplificada
    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)

    notification_distance = models.IntegerField(default=500)
    privacy = models.CharField(max_length=50, default='publico')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='user')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Datos flexibles
    necesidades = models.JSONField(default=dict, blank=True)
    parameters = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=dict, blank=True)

    # Gamificación
    experience_points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    dark_mode = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'uid'
    REQUIRED_FIELDS = ['alias']

    objects = UserManager()

    groups = models.ManyToManyField(
        'auth.Group', related_name='kudos_user_groups', blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission', related_name='kudos_user_permissions', blank=True
    )

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return self.alias or self.uid

    def add_xp(self, points):
        """Suma XP y sube de nivel cada 100 puntos."""
        self.experience_points += points
        self.level = max(1, self.experience_points // 100 + 1)
        self.save(update_fields=['experience_points', 'level'])


# ===================== CÁPSULAS =====================
class Capsule(models.Model):
    """Cápsula multidimensional: contenido, ubicación, tiempo, temas."""
    MODO_CHOICES = [
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
    ]
    PRIVACY_CHOICES = [
        ('publico', 'Público'),
        ('privado', 'Privado'),
        ('amigos', 'Solo amigos'),
    ]

    uid = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='capsules', null=True, blank=True)
    titulo = models.CharField(max_length=200, blank=True, default='')
    contenido = models.TextField()

    # Geolocalización
    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)
    lugar = models.CharField(max_length=255, blank=True, default='')

    modo = models.CharField(max_length=50, choices=MODO_CHOICES, default='historico')
    fecha = models.DateField(default=timezone.now)
    privacy = models.CharField(max_length=50, choices=PRIVACY_CHOICES, default='publico')
    time_scale = models.CharField(max_length=50, default='dia')

    # Temas como JSON (lista de strings)
    temas = models.JSONField(default=list, blank=True)

    # Datos flexibles
    parameters = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=dict, blank=True)

    # Multimedia
    image = models.CharField(max_length=500, blank=True, null=True)
    audio = models.CharField(max_length=500, blank=True, null=True)
    video = models.CharField(max_length=500, blank=True, null=True)

    # Métricas
    likes = models.IntegerField(default=0)
    views = models.IntegerField(default=0)

    timestamp = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=100, blank=True, default='')

    # ========== DIMENSIONES EXTRA (5D) ==========
    # 3D: altitud (m sobre nivel del mar; útil para ciudades, montañas, océanos)
    altitud = models.FloatField(null=True, blank=True,
                                help_text='Metros sobre nivel del mar (3D)')
    # 4D: ya existe `fecha`. Aquí etiquetamos a qué era pertenece.
    ERA_CHOICES = [
        ('antigua', 'Edad Antigua (-3000 → 476)'),
        ('media', 'Edad Media (476 → 1492)'),
        ('moderna', 'Edad Moderna (1492 → 1789)'),
        ('contemporanea', 'Edad Contemporánea (1789 → 2000)'),
        ('actual', 'Era Actual (2000 → hoy)'),
        ('futura', 'Futuro proyectado'),
    ]
    era = models.CharField(max_length=20, choices=ERA_CHOICES, blank=True, default='actual',
                           help_text='Era histórica (4D)')
    # 5D: capa dimensional / nivel de realidad
    DIMENSION_CHOICES = [
        ('fisica', '🌍 Física - lo que ocurrió'),
        ('emocional', '💗 Emocional - lo que se sintió'),
        ('cognitiva', '🧠 Cognitiva - lo que se pensó'),
        ('social', '👥 Social - lo colectivo'),
        ('espiritual', '✨ Espiritual - lo trascendente'),
    ]
    dimension_layer = models.CharField(max_length=20, choices=DIMENSION_CHOICES,
                                       default='fisica', help_text='Capa de realidad (5D)')

    # ========== ENRIQUECIMIENTO POR IA ==========
    ai_enriched = models.BooleanField(default=False)
    ai_summary = models.TextField(blank=True, default='',
                                  help_text='Resumen generado por la IA interna')
    ai_themes = models.JSONField(default=list, blank=True,
                                 help_text='Temas inferidos por IA')
    ai_video_seed = models.CharField(max_length=200, blank=True, default='',
                                     help_text='Semilla determinista para el clip de vídeo')
    ai_audio_voice = models.CharField(max_length=40, blank=True, default='',
                                      help_text='Código del personaje narrador')
    ai_quality_score = models.FloatField(default=0,
                                         help_text='0–10 calidad estimada')
    ai_enriched_at = models.DateTimeField(null=True, blank=True)

    # ========== AXÓN · Phase 0 · FOUNDATION CONTEXTUAL ==========
    # Lugar canónico (FK al nuevo modelo Place). El campo legacy `lugar`
    # (CharField string) se mantiene para compat; un management command
    # (`seed_rome`) hace el linkage progresivo.
    place = models.ForeignKey(
        'Place', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='capsules',
        help_text='Lugar canónico (Phase 0). `lugar` legacy se mantiene.',
    )
    # Jerarquía contextual: árbol de cápsulas (Coliseo → Viaje 2026 → Cena …).
    parent_capsule = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children',
        help_text='Cápsula padre directa (jerarquía contextual).',
    )
    root_capsule = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='descendants',
        help_text='Raíz del árbol (denormalizado para queries O(1)).',
    )
    # Capa de contexto (ortogonal a dimension_layer y modo).
    CONTEXT_LAYER_CHOICES = [
        ('OFFICIAL',  'Oficial'),
        ('COMMUNITY', 'Comunidad'),
        ('PERSONAL',  'Personal'),
        ('TEMPORAL',  'Temporal'),
        ('EMOTIONAL', 'Emocional'),
    ]
    context_layer = models.CharField(
        max_length=20, choices=CONTEXT_LAYER_CHOICES, default='COMMUNITY',
        db_index=True,
        help_text='Capa de contexto (ortogonal a dimension_layer).',
    )
    # Semilla del CIE. En Phase 0 se backfilea desde ai_quality_score/10.
    importance_score = models.FloatField(
        default=0.0, db_index=True,
        help_text='0..1 · semilla del Capsule Intelligence Engine.',
    )
    # Verificación binaria mínima. Phase 2 → verification_state granular.
    verified = models.BooleanField(
        default=False, db_index=True,
        help_text='Phase 0 · binario. Phase 2 lo reemplaza por estado granular.',
    )

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Cápsula'
        verbose_name_plural = 'Cápsulas'

    def __str__(self):
        return self.titulo or self.contenido[:50]

    @property
    def display_title(self):
        return self.titulo or (self.contenido[:60] + '...' if len(self.contenido) > 60 else self.contenido)


# ===================== LUGARES (AXÓN · Phase 0) =====================
class Place(models.Model):
    """Lugar canónico que agrupa cápsulas por contexto geográfico.

    Phase 0 mínimo: slug · name · país · lat/lon · summary · rango temporal +
    `capsule_count` denormalizado. El campo legacy `Capsule.lugar` (string)
    convive; el linkage se hace progresivamente vía management command.
    """
    slug = models.SlugField(
        max_length=120, unique=True,
        help_text='Identificador URL-safe (p.ej. "rome", "kyoto", "lima").',
    )
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=80, blank=True, default='')
    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)
    summary = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    image = models.CharField(max_length=500, blank=True, default='')
    era_range_from = models.IntegerField(
        null=True, blank=True,
        help_text='Año mínimo cubierto (negativo = a.C.).',
    )
    era_range_to = models.IntegerField(
        null=True, blank=True,
        help_text='Año máximo cubierto.',
    )
    capsule_count = models.IntegerField(
        default=0,
        help_text='Denormalizado · actualizado por command/signal.',
    )
    created = models.DateTimeField(default=timezone.now, db_index=True)
    updated = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Lugar'
        verbose_name_plural = 'Lugares'
        ordering = ['name']

    def __str__(self):
        return self.name or self.slug

    def recount_capsules(self, save=True):
        """Recalcula `capsule_count` desde BD. Idempotente."""
        n = self.capsules.count()
        self.capsule_count = n
        if save:
            self.updated = timezone.now()
            self.save(update_fields=['capsule_count', 'updated'])
        return n


# ===================== INTERACCIONES =====================
class Review(models.Model):
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.rating}★ - {self.comment[:30]}"


class Like(models.Model):
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='liked_by')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('capsule', 'user')


class Activity(models.Model):
    """Registro genérico de actividad de usuarios."""
    uid = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    descripcion = models.TextField()
    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Actividades'

    def __str__(self):
        return self.descripcion[:50]


# ===================== MERCADO Y OPERACIONES VIRTUALES =====================
class VirtualOperation(models.Model):
    """Operaciones virtuales del mercado descentralizado."""
    OP_TYPES = [
        ('venta', 'Venta'),
        ('compra', 'Compra'),
        ('intercambio', 'Intercambio'),
        ('subasta', 'Subasta'),
    ]

    uid = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='operations')
    operation_type = models.CharField(max_length=20, choices=OP_TYPES, default='venta')
    title = models.CharField(max_length=150)
    description = models.TextField()
    price = models.FloatField(default=0.0)

    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, default='')

    is_active = models.BooleanField(default=True)
    timestamp = models.DateTimeField(default=timezone.now)
    parameters = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return self.title


# ===================== GAMIFICACIÓN =====================
class Badge(models.Model):
    """Insignias / logros de los usuarios."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    name = models.CharField(max_length=80)
    description = models.TextField()
    icon = models.CharField(max_length=10, default='🏆')
    date_awarded = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date_awarded']

    def __str__(self):
        return f"{self.icon} {self.name}"


class Certificate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    plan = models.ForeignKey(Capsule, on_delete=models.CASCADE)
    date_issued = models.DateTimeField(default=timezone.now)
    certificate_file = models.FileField(upload_to='certificates/', blank=True, null=True)

    def __str__(self):
        return f"Certificado: {self.user.alias} – {self.plan.display_title}"


# ===================== GOBERNANZA / CONGRESO =====================
class Proposal(models.Model):
    """Propuestas para el Congreso de la Conciencia Colectiva Global."""
    STATUS_CHOICES = [
        ('debate', 'En debate'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('ejecutada', 'Ejecutada'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposals')
    title = models.CharField(max_length=200)
    description = models.TextField()
    themes = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='debate')
    votes_for = models.IntegerField(default=0)
    votes_against = models.IntegerField(default=0)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return self.title

    @property
    def total_votes(self):
        return self.votes_for + self.votes_against

    @property
    def support_percentage(self):
        total = self.total_votes
        return (self.votes_for / total * 100) if total > 0 else 0


class Vote(models.Model):
    """Voto único por usuario y propuesta."""
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    in_favor = models.BooleanField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('proposal', 'user')


# ===================== NOTIFICACIONES =====================
class Notification(models.Model):
    PRIORITY = [('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, default='info')
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY, default='media')
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.priority}] {self.message[:50]}"


# ===================== ESPACIOS SOCIALES =====================
class SocialSpace(models.Model):
    """Comunidades temáticas dentro de Kudos."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_spaces')
    members = models.ManyToManyField(User, related_name='joined_spaces', blank=True)
    icon = models.CharField(max_length=10, default='🌐')
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return self.name


# ===================== DEPORTES Y COMPETICIONES =====================
class Competition(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField()
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='competitions')
    participants = models.ManyToManyField(User, related_name='joined_competitions', blank=True)
    sport = models.CharField(max_length=50, default='general')
    start_date = models.DateTimeField(default=timezone.now)
    is_virtual = models.BooleanField(default=True)
    entry_price = models.FloatField(default=0.0)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


# ===================== SALUD Y BIENESTAR =====================
class MoodEntry(models.Model):
    """Registro emocional para el módulo de salud mental."""
    MOOD_CHOICES = [
        ('feliz', '😊 Feliz'),
        ('neutro', '😐 Neutro'),
        ('triste', '😔 Triste'),
        ('ansioso', '😰 Ansioso'),
        ('motivado', '🚀 Motivado'),
        ('cansado', '😴 Cansado'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mood_entries')
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    notes = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.alias}: {self.get_mood_display()}"


# ===================== CONFIGURACIÓN GLOBAL =====================
class SettingsConfig(models.Model):
    """Configuración dinámica del sistema, key/value."""
    key = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    parameters = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=dict, blank=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key


# ============================================================
# ORGANIGRAMA Y GESTIÓN ORGANIZACIONAL
# ============================================================
class Department(models.Model):
    """Departamento o área funcional del ecosistema Kudos."""
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🏛')
    mission = models.TextField(default='')
    description = models.TextField(default='')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL,
                               related_name='subdepartments')
    head_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                  related_name='leading_departments')
    head_label = models.CharField(max_length=120, default='', blank=True,
                                  help_text='Cuando aún no hay persona asignada')
    color = models.CharField(max_length=10, default='#1E3A8A')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class Role(models.Model):
    """Puesto / rol dentro de un departamento."""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='roles')
    code = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=120)
    summary = models.CharField(max_length=255, blank=True, default='')
    responsibilities = models.JSONField(default=list, blank=True,
                                        help_text='Lista de responsabilidades clave')
    holder_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='held_roles')
    holder_label = models.CharField(max_length=120, default='Vacante', blank=True)
    is_executive = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['department__order', 'order', 'title']

    def __str__(self):
        return self.title


class KPI(models.Model):
    """Métrica clave de un departamento. El valor actual se calcula con código."""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='kpis')
    code = models.CharField(max_length=50, unique=True,
                            help_text='Identificador interno: ej. growth.dau, content.total_capsules')
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=20, default='', blank=True,
                            help_text='Ej: cápsulas, usuarios, %, €, K')
    target_value = models.FloatField(default=0)
    current_value = models.FloatField(default=0)
    last_updated = models.DateTimeField(default=timezone.now)
    is_higher_better = models.BooleanField(default=True)
    formula = models.CharField(max_length=200, blank=True, default='',
                               help_text='Cómo se calcula (informativo)')
    icon = models.CharField(max_length=10, default='📊')

    class Meta:
        ordering = ['department__order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"

    @property
    def progress_percent(self):
        if self.target_value == 0:
            return 0
        pct = (self.current_value / self.target_value) * 100
        return round(min(100, max(0, pct)), 1)


class Goal(models.Model):
    """Objetivo estratégico o táctico (OKR-style)."""
    LEVEL_CHOICES = [
        ('strategic', 'Estratégico (años)'),
        ('annual', 'Anual'),
        ('quarterly', 'Trimestral'),
        ('monthly', 'Mensual'),
    ]
    STATUS_CHOICES = [
        ('idea', 'Idea'),
        ('planned', 'Planificado'),
        ('in_progress', 'En curso'),
        ('done', 'Conseguido'),
        ('blocked', 'Bloqueado'),
        ('dropped', 'Descartado'),
    ]
    department = models.ForeignKey(Department, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='goals')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='quarterly')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    progress = models.IntegerField(default=0, help_text='0-100')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    phase = models.CharField(max_length=20, blank=True, default='',
                             help_text='vault, connect, mind')
    priority = models.IntegerField(default=2, help_text='1=alta, 2=media, 3=baja')
    parameters = models.JSONField(default=dict, blank=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['priority', 'end_date', '-created']

    def __str__(self):
        return self.title


class BudgetLine(models.Model):
    """Línea de presupuesto (ingreso o coste)."""
    TYPE_CHOICES = [
        ('income', 'Ingreso'),
        ('cost', 'Coste'),
        ('investment', 'Inversión'),
    ]
    department = models.ForeignKey(Department, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='budget_lines')
    year = models.IntegerField()
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='cost')
    category = models.CharField(max_length=80,
                                help_text='Ej: Hosting, Marketing, Salarios, Suscripciones')
    label = models.CharField(max_length=200)
    amount_eur = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_recurring = models.BooleanField(default=False, help_text='Mensual')
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['year', 'type', 'category']

    def __str__(self):
        return f"{self.year} · {self.label} · {self.amount_eur}€"


class HistoricalCharacter(models.Model):
    """Personaje histórico que actúa como guía/asistente del usuario."""
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    title = models.CharField(max_length=200, default='', blank=True,
                             help_text='Ej: Filósofo estoico romano')
    theme = models.CharField(max_length=80,
                             help_text='Tema en el que es experto')
    icon = models.CharField(max_length=10, default='🏛')
    color = models.CharField(max_length=10, default='#1E3A8A')
    intro = models.TextField(help_text='Cómo se presenta al usuario')
    voice_style = models.TextField(help_text='Tono y estilo de respuesta')
    typical_quotes = models.JSONField(default=list, blank=True,
                                      help_text='Frases típicas del personaje')
    suggested_for = models.JSONField(default=list, blank=True,
                                     help_text='Lista de departamentos/temas sugeridos')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class StrategicDocument(models.Model):
    """Documento estratégico (manifiesto, plan, política, narrativa)."""
    KIND_CHOICES = [
        ('manifest', 'Manifiesto'),
        ('strategic', 'Plan estratégico'),
        ('tactical', 'Plan táctico'),
        ('financial', 'Plan financiero'),
        ('legal', 'Documento legal'),
        ('communication', 'Comunicación / Marketing'),
        ('operational', 'Operativo'),
        ('personal', 'Personal del fundador'),
    ]
    department = models.ForeignKey(Department, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='documents')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='strategic')
    code = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True, default='')
    body = models.TextField(default='')
    version = models.CharField(max_length=10, default='1.0')
    parameters = models.JSONField(default=dict, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['department__order', 'kind', 'title']

    def __str__(self):
        return f"{self.title} (v{self.version})"


# ============================================================
# ASISTENTE PERSONAL DEL FUNDADOR
# ============================================================
class Habit(models.Model):
    """Hábito que el fundador quiere mantener (salud, aprendizaje, espiritual)."""
    CATEGORY_CHOICES = [
        ('salud', '💪 Salud'),
        ('aprendizaje', '📚 Aprendizaje'),
        ('espiritual', '🧘 Espiritual'),
        ('productividad', '⚡ Productividad'),
        ('finanzas', '💰 Finanzas'),
        ('relaciones', '❤ Relaciones'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='salud')
    icon = models.CharField(max_length=10, default='✓')
    target_per_week = models.IntegerField(default=7, help_text='Veces por semana')
    is_active = models.BooleanField(default=True)
    streak_days = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class HabitLog(models.Model):
    """Registro diario: ¿cumplí este hábito hoy?"""
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField(default=timezone.now)
    completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('habit', 'date')
        ordering = ['-date']


class JournalEntry(models.Model):
    """Diario estoico personal del fundador."""
    KIND_CHOICES = [
        ('morning', '🌅 Mañana - Intención'),
        ('evening', '🌙 Noche - Examen'),
        ('reflection', '🤔 Reflexión libre'),
        ('decision', '⚖ Decisión importante'),
        ('lesson', '📖 Lección aprendida'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='morning')
    date = models.DateField(default=timezone.now)
    content = models.TextField()
    mood = models.IntegerField(default=5, help_text='1-10')
    tags = models.JSONField(default=list, blank=True)
    is_private = models.BooleanField(default=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date', '-timestamp']

    def __str__(self):
        return f"{self.date} - {self.get_kind_display()}"


class LearningItem(models.Model):
    """Plan de aprendizaje: libros, cursos, vídeos, papers."""
    TYPE_CHOICES = [
        ('libro', '📚 Libro'),
        ('curso', '🎓 Curso'),
        ('video', '🎥 Vídeo / charla'),
        ('paper', '📄 Paper / artículo'),
        ('podcast', '🎙 Podcast'),
        ('practica', '💪 Práctica'),
    ]
    STATUS_CHOICES = [
        ('por_leer', 'Por leer'),
        ('en_curso', 'En curso'),
        ('completado', 'Completado'),
        ('abandonado', 'Abandonado'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_items')
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='libro')
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200, blank=True, default='')
    url = models.URLField(blank=True, default='')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='por_leer')
    progress_percent = models.IntegerField(default=0)
    notes = models.TextField(blank=True, default='', help_text='Notas y aprendizajes')
    rating = models.IntegerField(null=True, blank=True, help_text='1-5 estrellas')
    started = models.DateField(null=True, blank=True)
    finished = models.DateField(null=True, blank=True)
    priority = models.IntegerField(default=2, help_text='1=alta, 2=media, 3=baja')
    tags = models.JSONField(default=list, blank=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['priority', '-created']

    def __str__(self):
        return self.title


class HealthMetric(models.Model):
    """Métrica de salud diaria: sueño, ejercicio, peso, etc."""
    METRIC_CHOICES = [
        ('sueño_horas', '😴 Sueño (horas)'),
        ('ejercicio_min', '🏃 Ejercicio (min)'),
        ('peso_kg', '⚖ Peso (kg)'),
        ('agua_litros', '💧 Agua (L)'),
        ('lectura_min', '📖 Lectura (min)'),
        ('meditacion_min', '🧘 Meditación (min)'),
        ('pasos', '👣 Pasos'),
        ('animo', '😊 Ánimo (1-10)'),
        ('energia', '⚡ Energía (1-10)'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_metrics')
    metric = models.CharField(max_length=20, choices=METRIC_CHOICES)
    value = models.FloatField()
    date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date', 'metric']
        unique_together = ('user', 'metric', 'date')


class CryptoWatch(models.Model):
    """Lista de criptomonedas que el fundador quiere VIGILAR. Solo lectura/info, sin trading."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crypto_watches')
    symbol = models.CharField(max_length=20, help_text='BTC, ETH, SOL...')
    name = models.CharField(max_length=80)
    notes = models.TextField(blank=True, default='', help_text='Tu tesis sobre esta cripto')
    target_buy_eur = models.FloatField(null=True, blank=True, help_text='Precio objetivo de compra')
    target_sell_eur = models.FloatField(null=True, blank=True, help_text='Precio objetivo de venta')
    is_active = models.BooleanField(default=True)
    added = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'symbol')
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} - {self.name}"


class CryptoOperation(models.Model):
    """Log MANUAL de operaciones cripto. NO ejecuta nada — sólo registra lo que tú haces."""
    OP_CHOICES = [
        ('buy', 'Compra'),
        ('sell', 'Venta'),
        ('hold', 'Hold'),
        ('note', 'Nota'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crypto_operations')
    watch = models.ForeignKey(CryptoWatch, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=10, choices=OP_CHOICES, default='note')
    symbol = models.CharField(max_length=20, default='')
    amount = models.FloatField(default=0, help_text='Cantidad de unidades')
    price_eur = models.FloatField(default=0, help_text='Precio por unidad en EUR')
    total_eur = models.FloatField(default=0)
    date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, default='')
    rule_followed = models.TextField(blank=True, default='', help_text='Que regla personal seguiste o rompiste?')
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_type_display()} {self.symbol} {self.date}"


# ============================================================
# IA INTERNA / AUTOPILOTO 24/7 (KUDOS MIND)
# ============================================================
class AIAgent(models.Model):
    """Agente de IA interno. Cada agente cumple una mision especifica."""
    KIND_CHOICES = [
        ('importer', 'Importador de contenido'),
        ('curator', 'Curador de capsulas'),
        ('moderator', 'Moderador de contenido'),
        ('analyst', 'Analista de KPIs'),
        ('narrator', 'Narrador / Resumenes'),
        ('recommender', 'Recomendador personal'),
        ('scheduler', 'Planificador'),
        ('guardian', 'Guardian del fundador'),
    ]
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='analyst')
    description = models.TextField(default='', blank=True)
    icon = models.CharField(max_length=10, default='AI')
    is_active = models.BooleanField(default=True)
    interval_seconds = models.IntegerField(default=300)
    last_run = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, default='idle')
    runs_total = models.IntegerField(default=0)
    successes = models.IntegerField(default=0)
    failures = models.IntegerField(default=0)
    actions_total = models.IntegerField(default=0)
    config = models.JSONField(default=dict, blank=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['kind', 'name']
        verbose_name = 'Agente IA'
        verbose_name_plural = 'Agentes IA'

    def __str__(self):
        return f"{self.icon} {self.name}"

    @property
    def success_rate(self):
        if not self.runs_total:
            return 0
        return round(self.successes / self.runs_total * 100, 1)


class AIAction(models.Model):
    LEVEL_CHOICES = [('info','Info'),('success','Exito'),('warning','Aviso'),('error','Error')]
    agent = models.ForeignKey(AIAgent, on_delete=models.CASCADE, related_name='actions', null=True, blank=True)
    action = models.CharField(max_length=120)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='info')
    target_type = models.CharField(max_length=40, blank=True, default='')
    target_id = models.CharField(max_length=80, blank=True, default='')
    summary = models.TextField(blank=True, default='')
    parameters = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Accion de IA'
        verbose_name_plural = 'Acciones de IA'

    def __str__(self):
        return f"[{self.level}] {self.action}"


class AIInsight(models.Model):
    KIND_CHOICES = [
        ('trend','Tendencia'),('alert','Alerta'),('summary','Resumen'),
        ('recommendation','Recomendacion'),('forecast','Prevision'),('milestone','Hito'),
    ]
    agent = models.ForeignKey(AIAgent, on_delete=models.SET_NULL, related_name='insights', null=True, blank=True)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='summary')
    title = models.CharField(max_length=200)
    body = models.TextField(default='')
    impact = models.IntegerField(default=2)
    related_url = models.CharField(max_length=300, blank=True, default='')
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    parameters = models.JSONField(default=dict, blank=True)
    created = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['impact', '-created']
        verbose_name = 'Insight de IA'
        verbose_name_plural = 'Insights de IA'

    def __str__(self):
        return f"{self.get_kind_display()} - {self.title}"


class AIDirective(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_directives', null=True, blank=True)
    title = models.CharField(max_length=160)
    instruction = models.TextField()
    scope = models.CharField(max_length=40, default='global')
    priority = models.IntegerField(default=2)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['priority', '-created']
        verbose_name = 'Directiva IA'
        verbose_name_plural = 'Directivas IA'

    def __str__(self):
        return self.title


# ============================================================
# CAPA SOCIAL EXTRA: SEGUIMIENTO Y CONVERSACION
# ============================================================
class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_set')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_set')
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created']


class DirectMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.sender_id} -> {self.recipient_id}"


class Bookmark(models.Model):
    """Marcador del usuario · cápsula O lugar (exclusivo).

    KUDOS MVP · `useSaved` del frontend guarda tanto POIs como cápsulas.
    Hasta 2026-05 sólo cubría cápsulas. Ahora `capsule` es opcional y se
    añade `place` opcional con CHECK XOR para garantizar coherencia.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE,
                                related_name='bookmarked_by',
                                null=True, blank=True)
    place = models.ForeignKey('Place', on_delete=models.CASCADE,
                              related_name='bookmarked_by',
                              null=True, blank=True)
    note = models.CharField(max_length=200, blank=True, default='')
    created = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(capsule__isnull=False, place__isnull=True) |
                    models.Q(capsule__isnull=True, place__isnull=False)
                ),
                name='bookmark_xor_capsule_place',
            ),
            models.UniqueConstraint(
                fields=['user', 'capsule'],
                condition=models.Q(capsule__isnull=False),
                name='bookmark_unique_user_capsule',
            ),
            models.UniqueConstraint(
                fields=['user', 'place'],
                condition=models.Q(place__isnull=False),
                name='bookmark_unique_user_place',
            ),
        ]


class UserPreference(models.Model):
    """Preferencias del usuario para personalizar feed, mapa y notificaciones.

    Los intereses son una lista de tags de tema (filosofia, arte, ciencia,
    naturaleza, historia, espiritual, salud, tecnologia, comercio, sabiduria).
    """
    DIM_CHOICES = [
        ('', 'Todas'),
        ('fisica', 'Física'),
        ('emocional', 'Emocional'),
        ('cognitiva', 'Cognitiva'),
        ('social', 'Social'),
        ('espiritual', 'Espiritual'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preference')
    interests = models.JSONField(default=list, blank=True,
                                 help_text='Lista de tags de tema preferidos.')
    preferred_dimension = models.CharField(max_length=20, choices=DIM_CHOICES, blank=True, default='')
    preferred_era = models.CharField(max_length=20, blank=True, default='',
                                     help_text='antigua/media/moderna/contemporanea/actual/futura')
    preferred_voice = models.CharField(max_length=30, blank=True, default='',
                                       help_text='aristoteles/seneca/cleopatra/...')
    notif_radius_m = models.IntegerField(default=500, help_text='Radio de geofencing personal (m)')
    notif_zero = models.BooleanField(default=True, help_text='Notificar punto cero (5m)')
    notif_revelation = models.BooleanField(default=True, help_text='Notificar revelación (20m)')
    notif_alert = models.BooleanField(default=False, help_text='Notificar zona de alerta (100m)')
    intervention_level = models.CharField(max_length=10, default='guide',
                                           help_text='zen / guide / guardian')
    home_lat = models.FloatField(null=True, blank=True)
    home_lon = models.FloatField(null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Preferencia de usuario'
        verbose_name_plural = 'Preferencias de usuario'

    def __str__(self):
        return f'Preferencias de {self.user.alias}'


class CapsuleVersion(models.Model):
    """Snapshot inmutable de una cápsula en un momento del tiempo.

    Cada vez que el autor (o un misionero) edita una cápsula, se crea una
    versión nueva con el contenido anterior. Esto cumple el "Versionado de
    Cápsulas" del briefing MEMENTO V2: el usuario puede viajar entre la
    versión original y la actual sin perder ningún dato.
    """
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField(default=1)
    titulo = models.CharField(max_length=200, blank=True, default='')
    contenido = models.TextField(blank=True, default='')
    image = models.CharField(max_length=500, blank=True, default='')
    parameters_snapshot = models.JSONField(default=dict, blank=True,
                                           help_text='Snapshot completo de los parameters en el momento.')
    change_summary = models.CharField(max_length=300, blank=True, default='',
                                      help_text='Razón del cambio.')
    created_by = models.ForeignKey(User, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='capsule_edits')
    created = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('capsule', 'version_number')
        verbose_name = 'Versión de cápsula'
        verbose_name_plural = 'Versiones de cápsulas'

    def __str__(self):
        return f'{self.capsule.titulo} · v{self.version_number}'


class CapsuleAport(models.Model):
    """Aporte de un usuario a una cápsula.

    Implementa la doble capa MEMENTO V2:
      - LAYER='fact'   → dato verificable (foto, fecha, corrección histórica).
                          Pasa por consenso de 3 capas (IA → Misioneros → CCO).
      - LAYER='dialog' → opinión, interpretación, anécdota personal.
                          NO se valida, se publica directamente como conversación.

    Si un aporte de tipo 'fact' es validado, puede modificar la cápsula y
    crear una nueva CapsuleVersion. Los aportes 'dialog' viven en su propia
    sección y son visibles para todos.
    """
    LAYER_CHOICES = [
        ('fact', '🔬 Hecho (verificable)'),
        ('dialog', '💬 Diálogo (opinión)'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pendiente · capa IA'),
        ('mission', 'En revisión · misioneros'),
        ('cco', 'En auditoría · CCO'),
        ('accepted', 'Aceptado'),
        ('rejected', 'Rechazado'),
        ('published', 'Publicado en diálogo'),
    ]
    capsule = models.ForeignKey(Capsule, on_delete=models.CASCADE, related_name='aports')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='capsule_aports')
    layer = models.CharField(max_length=10, choices=LAYER_CHOICES, default='dialog')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    body = models.TextField(help_text='Texto del aporte / opinión.')
    media_url = models.CharField(max_length=500, blank=True, default='',
                                  help_text='URL opcional de imagen/vídeo aportado.')
    proposed_field = models.CharField(max_length=50, blank=True, default='',
                                       help_text='Si es fact: campo que se propone modificar (titulo/contenido/image).')
    proposed_value = models.TextField(blank=True, default='',
                                       help_text='Valor propuesto para ese campo.')
    sources = models.JSONField(default=list, blank=True,
                               help_text='Lista de URLs/citas que respaldan el aporte.')
    # Capas de validación
    ai_score = models.FloatField(default=0,
                                  help_text='Puntuación de IA (0-1) para autoridad/coherencia.')
    ai_notes = models.TextField(blank=True, default='')
    validators = models.ManyToManyField(User, blank=True,
                                         related_name='aports_validated',
                                         help_text='Misioneros que validaron este aporte.')
    cco_decision = models.CharField(max_length=20, blank=True, default='',
                                     help_text='Decisión final del CCO si hubo conflicto.')
    likes = models.IntegerField(default=0)
    dislikes = models.IntegerField(default=0)
    kudos_awarded = models.IntegerField(default=0,
                                         help_text='$KDS otorgados al autor del aporte.')
    created = models.DateTimeField(default=timezone.now, db_index=True)
    resolved = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created']
        verbose_name = 'Aporte a cápsula'
        verbose_name_plural = 'Aportes a cápsulas'

    def __str__(self):
        return f'{self.get_layer_display()} de {self.user.alias} a {self.capsule.titulo}'


class FeedItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feed_items')
    score = models.FloatField(default=0.5)
    reason = models.CharField(max_length=200, blank=True, default='')
    is_seen = models.BooleanField(default=False)
    created = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-score', '-created']


# ===================== MVP MAQUETAS · MÉRITO + MI MUNDO =====================
# Modelos nuevos añadidos en 2026-05-27 para que el frontend Next.js
# (lib/kudos/store.ts) deje localStorage y persista en backend Django.
#
# Cubre las pantallas /merito y /mi-mundo y los hooks useMerit, useSaved,
# useVisited, tickStreak. Sin esto, el MVP completo de maquetas no se
# puede shipear.
# ============================================================================


class MeritEvent(models.Model):
    """Evento individual de mérito.

    Es la fuente de verdad. Total / nivel / pilares se calculan al vuelo
    sobre estos eventos. No hay cache materializada · los eventos por
    usuario son pocos (decenas/día max).

    Pilares replican exactamente los del frontend (`MeritPillar` en
    `lib/kudos/store.ts`).
    """
    PILLAR_CHOICES = [
        ('creacion', 'Creación'),
        ('inspiracion', 'Inspiración'),
        ('descubrimiento', 'Descubrimiento'),
        ('comunidad', 'Comunidad'),
        ('integridad', 'Integridad'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             related_name='merit_events')
    pillar = models.CharField(max_length=20, choices=PILLAR_CHOICES, db_index=True)
    points = models.IntegerField(
        help_text='Puntos otorgados. Positivo = ganado, negativo = sancionado.',
    )
    label = models.CharField(max_length=200, blank=True, default='',
                              help_text='Etiqueta legible (ej. "Compartiste una cápsula").')
    capsule = models.ForeignKey(Capsule, on_delete=models.SET_NULL,
                                 null=True, blank=True,
                                 related_name='merit_events')
    place = models.ForeignKey(Place, on_delete=models.SET_NULL,
                               null=True, blank=True,
                               related_name='merit_events')
    ts = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-ts']
        indexes = [
            models.Index(fields=['user', '-ts'], name='meritevent_user_ts_idx'),
            models.Index(fields=['user', 'pillar'], name='meritevent_user_pillar_idx'),
        ]
        verbose_name = 'Evento de mérito'
        verbose_name_plural = 'Eventos de mérito'

    def __str__(self):
        sign = '+' if self.points >= 0 else ''
        return f'{sign}{self.points} {self.get_pillar_display()} · {self.user.alias}'


class Visit(models.Model):
    """Registro "Estuve aquí" · usuario visitó un lugar canónico.

    Un usuario puede registrar varias visitas al mismo lugar (timeline),
    pero `useVisited` del frontend trata la visita como bandera única.
    Para el MVP usamos `unique_together`; cuando llegue la pantalla
    `momentos` (post-MVP) se relajará.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             related_name='visits')
    place = models.ForeignKey(Place, on_delete=models.CASCADE,
                              related_name='visits')
    ts = models.DateTimeField(default=timezone.now, db_index=True)
    lat = models.FloatField(null=True, blank=True,
                            help_text='Lat donde se registró (puede diferir de Place.latitud).')
    lon = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'place')
        ordering = ['-ts']
        indexes = [
            models.Index(fields=['user', '-ts'], name='visit_user_ts_idx'),
        ]
        verbose_name = 'Visita'
        verbose_name_plural = 'Visitas'

    def __str__(self):
        return f'{self.user.alias} → {self.place.name}'


class Streak(models.Model):
    """Racha diaria del usuario · multiplicador de mérito.

    Equivalente a `tickStreak` / `readStreak` del store. Se actualiza
    en cada acción que cuente. Las maquetas muestran el contador en
    el bloque "Multiplicadores activos · Racha de N días".
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE,
                                related_name='streak')
    last_day = models.DateField(null=True, blank=True,
                                help_text='Último día (UTC) en que se "tickeó" la racha.')
    days = models.IntegerField(default=0,
                               help_text='Días consecutivos activos. 0 = sin racha.')
    best_days = models.IntegerField(default=0,
                                    help_text='Récord histórico de días consecutivos.')
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Racha'
        verbose_name_plural = 'Rachas'

    def __str__(self):
        return f'{self.user.alias} · {self.days}d (best {self.best_days}d)'


class Collection(models.Model):
    """Colección del usuario · agrupa cápsulas y/o lugares.

    Hay cuatro orígenes (`kind`):
      - `manual`   → la crea el usuario.
      - `saved`    → autogenerada: "Todo lo guardado".
      - `visited`  → autogenerada: "Lugares donde estuve".
      - `affinity` → autogenerada por temas afines (post-MVP).

    Las autogeneradas se reconstruyen al vuelo desde Bookmark/Visit,
    pero también pueden persistirse si el usuario las "fija".
    """
    KIND_CHOICES = [
        ('manual', 'Manual'),
        ('saved', 'Guardados'),
        ('visited', 'Visitados'),
        ('affinity', 'Afinidad temática'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             related_name='collections')
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140)
    description = models.TextField(blank=True, default='')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='manual',
                            db_index=True)
    capsules = models.ManyToManyField(Capsule, blank=True,
                                       related_name='collections')
    places = models.ManyToManyField(Place, blank=True,
                                     related_name='collections')
    cover_image = models.CharField(max_length=500, blank=True, default='',
                                    help_text='URL de portada opcional.')
    is_public = models.BooleanField(default=False,
                                     help_text='Si True, otros usuarios pueden verla (post-MVP).')
    created = models.DateTimeField(default=timezone.now)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'slug')
        ordering = ['-updated']
        verbose_name = 'Colección'
        verbose_name_plural = 'Colecciones'

    def __str__(self):
        return f'{self.name} · {self.user.alias}'
