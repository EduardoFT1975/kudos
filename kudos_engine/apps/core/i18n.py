"""
KUDOS Capsule Engine v2 · helpers i18n.

Plant the multilingual seed sin migrar 43k POIs ya. Cualquier campo
"localizable" puede ser:
  - str:  "Coliseo"          → tratado como locale "es" por defecto
  - dict: {"es": "Coliseo", "en": "Colosseum", "it": "Colosseo"}

Funciones helpers:
  - to_localized(value)        → normaliza str → dict
  - get_localized(value, lang) → devuelve string en lang con fallback
"""
from __future__ import annotations

from typing import Dict, Optional, Union


# Tipo canónico
LocalizedString = Union[str, Dict[str, str]]


DEFAULT_LOCALE = "es"
FALLBACK_CHAIN = ["es", "en", "fr", "it", "pt", "de", "ja", "ar"]


def to_localized(value: LocalizedString, default_locale: str = DEFAULT_LOCALE) -> Dict[str, str]:
    """Normaliza cualquier valor a dict locale→string."""
    if isinstance(value, dict):
        return {k: str(v) for k, v in value.items()}
    if isinstance(value, str):
        return {default_locale: value}
    return {default_locale: str(value)}


def get_localized(value: LocalizedString, locale: str = DEFAULT_LOCALE,
                  fallback_chain: Optional[list] = None) -> str:
    """Devuelve string en `locale` con fallback chain."""
    if isinstance(value, str):
        return value
    if not isinstance(value, dict):
        return str(value)
    if locale in value:
        return value[locale]
    chain = fallback_chain or FALLBACK_CHAIN
    for loc in chain:
        if loc in value:
            return value[loc]
    # Como último recurso, devolver cualquier valor disponible
    return next(iter(value.values()), "")


def set_translation(value: LocalizedString, locale: str, text: str) -> Dict[str, str]:
    """Añade/actualiza una traducción y devuelve el dict resultante."""
    d = to_localized(value)
    d[locale] = text
    return d
