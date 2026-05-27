"""
KUDOS / AXÓN · Feature Registry (Public Core vs Dormant Systems).

Fuente única de verdad para FEATURE GATING.

Regla:
    - PUBLIC = visible en navegación, accesible vía HTTP, sirve al MVP.
    - DORMANT = código preservado, sin navegación, ruta bloqueada por middleware.

NADA se elimina. Todo se OCULTA y DESACOPLA.

Uso:
    from kudos_project.features import is_enabled, FEATURES
    if is_enabled("map_5d"):
        ...

En templates:
    {% load feature_tags %}
    {% if_feature "map_5d" %}<a href="{% url 'map' %}">Mapa</a>{% endif_feature %}
"""
from __future__ import annotations
import os

# ----------------------------------------------------------------------------
# FEATURES — 7 sistemas del MVP público + flags internos.
# ----------------------------------------------------------------------------
# Para activar un sistema dormant temporalmente (debug interno):
#   export KUDOS_FEATURE_<NAME>=1
# ----------------------------------------------------------------------------

_PUBLIC_CORE = {
    # ── 7 sistemas oficiales del MVP ─────────────────────────────────────────
    "map_5d":         True,   # 1. Mapa 5D
    "capsules":       True,   # 2. Cápsulas (CRUD básico + detail + like)
    "search":         True,   # 3. Búsqueda global
    "timeline_lite":  True,   # 4. Timeline básico
    "users":          True,   # 5. Cuentas, login, perfil
    "mind_lite":      True,   # 6. KUDOS MIND Lite (3 preguntas)
    "share":          True,   # 7. Share (link + OG)
}

_DORMANT = {
    # ── Sistemas congelados; código vivo, navegación oculta, ruta 404. ────────
    "marketplace":           False,
    "congress":              False,
    "social_spaces":         False,
    "sports":                False,
    "mental_health":         False,
    "spirituality":          False,
    "chatbot":               False,
    "assistant_characters":  False,
    "future_simulator":      False,
    "space_exploration":     False,
    "art_festival":          False,
    "kudos_legacy":          False,
    "virtual_operations":    False,
    "citizen":               False,
    "news":                  False,
    "trending":              False,
    "streaming":             False,
    "health_monitor":        False,
    "connect":               False,
    "promotion":             False,
    "notifications":         False,
    "achievements":          False,
    "data_analysis":         False,
    "report_feedback":       False,
    "founder_panel":         False,
    "mind_full":             False,  # insights, directives, ejecuciones
    "feed_social":           False,  # feed, follow, messages, bookmarks
    "personal_life":         False,  # journal, learning, health, crypto, hábitos
    "capsule_ar_vr":         False,  # ar_view, vr, audio, clip
    "capsule_memento":       False,  # versions, aport, dialog
    "wisdom":                False,
    "geolocation":           False,  # endpoint específico (el mapa NO lo necesita)
    "historical_map":        False,  # subvista del mapa (Fase 2)
    "preferences":           False,
    "dark_mode_toggle":      False,
    "export":                False,
    "ar_view":               False,
    "founder_docs":          False,
    "spirit_extras":         False,
}

FEATURES = {**_PUBLIC_CORE, **_DORMANT}


def is_enabled(name: str) -> bool:
    """Devuelve True si la feature está activa.

    Override por entorno: KUDOS_FEATURE_<NAME_UPPER>=1 activa una dormant
    en sesiones de debug interno sin tocar el código.
    """
    env_override = os.getenv(f"KUDOS_FEATURE_{name.upper()}")
    if env_override is not None:
        return env_override.lower() in ("1", "true", "yes", "on")
    return bool(FEATURES.get(name, False))


# ----------------------------------------------------------------------------
# PUBLIC URL NAMES — whitelist de rutas que el middleware deja pasar.
# ----------------------------------------------------------------------------
# Importante: los nombres aquí DEBEN coincidir con `name=...` en urls.py.
PUBLIC_URL_NAMES = frozenset({
    # Home / auth · únicas surfaces server-rendered con tráfico real
    "home", "register", "login", "logout",
    "password_change", "password_change_done",
    # Map · solo el contrato kudos_app API usado por Next.js
    "map",
    "api_capsules_5d", "api_capsules_nearby", "near",
    # Capsules · solo lectura · CRUD se mueve al frontend Next.js
    "capsule_list", "capsule_detail", "toggle_like", "delete_capsule",
    "api_capsules", "api_stats",
    # AXÓN · Phase 0 fundación contextual
    "api_health", "api_place_detail",
    # F.3 quarantine · estos nombres MOVIDOS a DORMANT_PATH_PREFIXES:
    #   timeline, dashboard, control_panel, onboarding, manifesto,
    #   about, terms, privacy, profile, edit_profile, public_profile,
    #   search, create_capsule, ai_panel, ai_chat, ai_chat_send
    # Las defs viven en views.py; sus rutas devuelven 404 ya.
})


# ----------------------------------------------------------------------------
# DORMANT URL PREFIXES — el middleware devuelve 404 para estos paths.
# ----------------------------------------------------------------------------
# Se usan prefijos para no acoplar al diccionario de urls.py.
DORMANT_PATH_PREFIXES = (
    "/marketplace/",
    "/congress/",
    "/social/",
    "/sports/",
    "/mental-health/",
    "/spirituality/",
    "/chatbot/",
    "/simulator/",
    "/simulation-engine/",
    "/space-exploration/",
    "/art-festival/",
    "/legacy/",
    "/virtual-operations/",
    "/citizen/",
    "/news/",
    "/trending/",
    "/streaming/",
    "/health-monitor/",
    "/connect/",
    "/promotion/",
    "/notifications/",
    "/achievements/",
    "/data-analysis/",
    "/report/",
    "/feedback/",
    "/safety/",
    "/toggle-dark-mode/",
    "/export/",
    "/founder/",
    "/assistant/",      # incluye /assistant/characters/*
    "/mind/",           # F.3 · todo /mind/ (panel, chat, ask, insight, directive)
    "/feed/",
    "/follow/",
    "/messages/",
    "/bookmarks/",
    "/personal/",
    "/wisdom/",
    "/preferences/",
    "/historical-map/",
    "/geolocation/",
    # F.3 quarantine · server-rendered surfaces sin tráfico Next.js
    "/timeline/",
    "/dashboard/",
    "/control_panel/",
    "/onboarding/",
    "/manifiesto/",     # nota: la ruta en urls.py es /manifiesto/ (español)
    "/about/",
    "/terms/",
    "/privacy/",
    "/profile/",
    "/search/",
    "/capsules/create/",
    "/api/django/",     # namespace fantasma referenciado solo en docs
    # Cápsulas: subrecursos congelados (AR/VR/audio/versions/aport/dialog)
    # No bloqueamos /capsules/ entero porque /capsules/<uid>/ sigue PUBLIC.
    # Bloqueamos solo subrutas concretas vía DORMANT_PATH_REGEX.
)

# Regex para subrutas internas de /capsules/<uid>/ que están en DORMANT.
DORMANT_PATH_REGEX = (
    r"^/capsules/[^/]+/(ar|audio|vr|clip|enrich|versions|aport|dialog)(/|$)",
    r"^/api/capsules/[^/]+/memento\.json$",
)

# Rutas siempre permitidas (overrides infraestructurales).
# Contratos API que el frontend Next.js consume · explicit allowlist.
ALWAYS_ALLOWED_PREFIXES = (
    "/admin/",
    "/accounts/",
    "/static/",
    "/media/",
    "/api/capsules/5d/",
    "/api/capsules/nearby/",
    "/api/health/",
    "/api/places/",
    "/api/place-capsule",
    "/api/capsule/nearby",
    "/api/capsules/viewport",
    "/api/landmarks/viewport",
    "/api/local-capsules",
    "/api/echo/synthesize",
    "/api/echo/share",        # Phase 3 viral share tracking
    "/api/debug/",
)
