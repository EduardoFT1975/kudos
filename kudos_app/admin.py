# kudos_app/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Capsule, Route, POI, Alert, WisdomSpace, PromotionSpace, SocialSpace,
    SettingsConfig, Notification, Character, ExternalData, ImprovementProposal,
    Transaction, Feedback, Activity, VirtualOperation, Badge
)

# Configuración personalizada para el modelo User
class UserAdmin(BaseUserAdmin):
    list_display = ('uid', 'alias', 'email', 'role', 'ubicacion', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('uid', 'alias', 'email')
    fieldsets = (
        (None, {'fields': ('uid', 'alias', 'email', 'password')}),
        ('Personal Info', {'fields': ('ubicacion', 'notification_distance', 'notification_privacy', 'necesidades')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'role')}),
        ('Advanced', {'fields': ('parameters', 'variables')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('uid', 'alias', 'email', 'password1', 'password2', 'role', 'is_staff', 'is_active')}
        ),
    )
    ordering = ('alias',)

# Configuración personalizada para Capsule
class CapsuleAdmin(admin.ModelAdmin):
    list_display = ('uid', 'usuario', 'contenido_short', 'ubicacion', 'fecha', 'privacy', 'price')
    list_filter = ('privacy', 'modo', 'time_scale')
    search_fields = ('uid', 'contenido', 'usuario__alias')
    readonly_fields = ('uid',)
    fieldsets = (
        (None, {'fields': ('uid', 'usuario', 'contenido', 'ubicacion')}),
        ('Details', {'fields': ('modo', 'fecha', 'privacy', 'time_scale', 'price', 'temas')}),
        ('Advanced', {'fields': ('parameters', 'variables')}),
    )

    def contenido_short(self, obj):
        return obj.contenido[:50] + '...' if len(obj.contenido) > 50 else obj.contenido
    contenido_short.short_description = 'Contenido'

# Configuración personalizada para Notification
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'message_short', 'priority', 'timestamp', 'status')
    list_filter = ('type', 'priority', 'status')
    search_fields = ('user__alias', 'message')
    fieldsets = (
        (None, {'fields': ('user', 'type', 'message')}),
        ('Details', {'fields': ('priority', 'location', 'timestamp', 'status')}),
        ('Advanced', {'fields': ('parameters', 'variables')}),
    )

    def message_short(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_short.short_description = 'Mensaje'

# Registro de modelos en el admin
admin.site.register(User, UserAdmin)
admin.site.register(Capsule, CapsuleAdmin)
admin.site.register(Route)
admin.site.register(POI)
admin.site.register(Alert)
admin.site.register(WisdomSpace)
admin.site.register(PromotionSpace)
admin.site.register(SocialSpace)
admin.site.register(SettingsConfig)
admin.site.register(Notification, NotificationAdmin)
admin.site.register(Character)
admin.site.register(ExternalData)
admin.site.register(ImprovementProposal)
admin.site.register(Transaction)  # Corregido de Transactions a Transaction
admin.site.register(Feedback)
admin.site.register(Activity)
admin.site.register(VirtualOperation)
admin.site.register(Badge)

# Personalización del sitio de administración
admin.site.site_header = "Kudos Administration"
admin.site.site_title = "Kudos Admin"
admin.site.index_title = "Welcome to Kudos Management"