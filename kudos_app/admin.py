# kudos_app/admin.py
"""Configuración del panel de administración de Django."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from kudos_app.models import (
    User, Capsule, Review, Like, Activity, VirtualOperation,
    Badge, Certificate, Proposal, Vote, Notification,
    SocialSpace, Competition, MoodEntry, SettingsConfig,
    Department, Role, KPI, Goal, BudgetLine, HistoricalCharacter, StrategicDocument,
    Habit, HabitLog, JournalEntry, LearningItem, HealthMetric,
    CryptoWatch, CryptoOperation,
    AIAgent, AIAction, AIInsight, AIDirective,
    Follow, DirectMessage, Bookmark, FeedItem,
    Place,
)


@admin.register(AIAgent)
class AIAgentAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'is_active', 'runs_total', 'successes', 'failures', 'last_run')
    list_filter = ('kind', 'is_active')


@admin.register(AIAction)
class AIActionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'agent', 'action', 'level', 'summary')
    list_filter = ('level', 'agent')
    search_fields = ('action', 'summary')


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'impact', 'created', 'is_archived')
    list_filter = ('kind', 'is_archived', 'impact')


@admin.register(AIDirective)
class AIDirectiveAdmin(admin.ModelAdmin):
    list_display = ('title', 'scope', 'priority', 'is_active', 'created')
    list_filter = ('scope', 'is_active')


admin.site.register(Follow)
admin.site.register(DirectMessage)
admin.site.register(Bookmark)
admin.site.register(FeedItem)


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    """AXÓN · Phase 0 · lugares canónicos."""
    list_display = ('slug', 'name', 'country', 'capsule_count', 'updated')
    search_fields = ('slug', 'name', 'country')
    list_filter = ('country',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('capsule_count', 'created', 'updated')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('uid', 'alias', 'email', 'role', 'level', 'experience_points', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('uid', 'alias', 'email')
    fieldsets = (
        (None, {'fields': ('uid', 'alias', 'email', 'password')}),
        ('Perfil', {'fields': ('bio', 'avatar', 'latitud', 'longitud', 'privacy', 'dark_mode')}),
        ('Gamificación', {'fields': ('experience_points', 'level')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'role',
                                 'groups', 'user_permissions')}),
        ('Datos avanzados', {'fields': ('necesidades', 'parameters', 'variables', 'notification_distance')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',),
                'fields': ('uid', 'alias', 'email', 'password1', 'password2',
                           'role', 'is_staff', 'is_active')}),
    )
    ordering = ('alias',)
    filter_horizontal = ('groups', 'user_permissions')


@admin.register(Capsule)
class CapsuleAdmin(admin.ModelAdmin):
    list_display = ('display_title', 'usuario', 'modo', 'fecha', 'privacy', 'likes', 'views')
    list_filter = ('modo', 'privacy', 'time_scale')
    search_fields = ('uid', 'titulo', 'contenido', 'lugar')
    readonly_fields = ('uid', 'timestamp', 'likes', 'views')
    fieldsets = (
        (None, {'fields': ('uid', 'usuario', 'titulo', 'contenido')}),
        ('Multidimensional', {'fields': ('modo', 'fecha', 'time_scale', 'temas',
                                         'lugar', 'latitud', 'longitud')}),
        ('Privacidad y métricas', {'fields': ('privacy', 'likes', 'views', 'timestamp')}),
        ('Multimedia', {'fields': ('image', 'audio', 'video')}),
        ('Avanzado', {'fields': ('parameters', 'variables', 'source')}),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'capsule', 'rating', 'timestamp')
    list_filter = ('rating',)


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'capsule', 'timestamp')


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('uid', 'usuario', 'descripcion', 'timestamp')
    search_fields = ('descripcion', 'usuario__alias')


@admin.register(VirtualOperation)
class VirtualOperationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'operation_type', 'price', 'is_active', 'timestamp')
    list_filter = ('operation_type', 'is_active')
    search_fields = ('title', 'description', 'city')


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'icon', 'date_awarded')
    search_fields = ('name', 'user__alias')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'date_issued')


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'status', 'votes_for', 'votes_against', 'timestamp')
    list_filter = ('status',)
    search_fields = ('title', 'description')


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('proposal', 'user', 'in_favor', 'timestamp')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'priority', 'read', 'timestamp')
    list_filter = ('priority', 'read', 'type')


@admin.register(SocialSpace)
class SocialSpaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'icon', 'timestamp')
    search_fields = ('name', 'description')


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'sport', 'start_date', 'is_virtual', 'entry_price')
    list_filter = ('sport', 'is_virtual')


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'mood', 'timestamp')
    list_filter = ('mood',)


@admin.register(SettingsConfig)
class SettingsConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'updated')
    search_fields = ('key',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'code', 'head_label', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    list_editable = ('order',)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('title', 'department', 'holder_label', 'is_executive')
    list_filter = ('department', 'is_executive')
    search_fields = ('title', 'code')


@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'department', 'current_value', 'target_value', 'unit', 'last_updated')
    list_filter = ('department',)
    search_fields = ('name', 'code')


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'level', 'status', 'progress', 'department', 'end_date')
    list_filter = ('level', 'status', 'phase', 'department')
    search_fields = ('title',)
    list_editable = ('progress', 'status')


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = ('year', 'type', 'category', 'label', 'amount_eur', 'is_recurring')
    list_filter = ('year', 'type', 'category', 'is_recurring')
    search_fields = ('label', 'category')


@admin.register(HistoricalCharacter)
class HistoricalCharacterAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'title', 'theme', 'is_active', 'order')
    list_filter = ('is_active',)
    list_editable = ('order',)


@admin.register(StrategicDocument)
class StrategicDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'department', 'version', 'last_updated')
    list_filter = ('kind', 'department')
    search_fields = ('title', 'code')


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'category', 'user', 'streak_days', 'is_active')
    list_filter = ('category', 'is_active')


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ('habit', 'date', 'completed')
    list_filter = ('completed', 'date')


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'kind', 'user', 'mood')
    list_filter = ('kind', 'mood')
    search_fields = ('content',)


@admin.register(LearningItem)
class LearningItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'status', 'progress_percent', 'rating', 'user')
    list_filter = ('type', 'status', 'priority')
    search_fields = ('title', 'author')


@admin.register(HealthMetric)
class HealthMetricAdmin(admin.ModelAdmin):
    list_display = ('date', 'metric', 'value', 'user')
    list_filter = ('metric', 'date')


@admin.register(CryptoWatch)
class CryptoWatchAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'name', 'user', 'target_buy_eur', 'target_sell_eur', 'is_active')


@admin.register(CryptoOperation)
class CryptoOperationAdmin(admin.ModelAdmin):
    list_display = ('date', 'type', 'symbol', 'amount', 'total_eur', 'user')
    list_filter = ('type', 'symbol')


# ─── MVP Maquetas · Mérito + Mi Mundo (P32.04) ───
from kudos_app.models import MeritEvent, Visit, Streak, Collection


@admin.register(MeritEvent)
class MeritEventAdmin(admin.ModelAdmin):
    list_display = ('ts', 'user', 'pillar', 'points', 'label', 'place', 'capsule')
    list_filter = ('pillar', 'ts')
    search_fields = ('user__alias', 'label')
    ordering = ('-ts',)


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ('ts', 'user', 'place', 'lat', 'lon')
    list_filter = ('ts',)
    search_fields = ('user__alias', 'place__name', 'place__slug')
    ordering = ('-ts',)


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    list_display = ('user', 'days', 'best_days', 'last_day', 'updated')
    ordering = ('-days',)


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'kind', 'is_public', 'created', 'updated')
    list_filter = ('kind', 'is_public')
    search_fields = ('name', 'slug', 'user__alias')
    filter_horizontal = ('capsules', 'places')


admin.site.site_header = "Kudos Administration"
admin.site.site_title = "Kudos Admin"
admin.site.index_title = "Panel de Administración Kudos"
