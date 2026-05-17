# kudos_app/templatetags/kudos_extras.py
"""Filtros y tags personalizados de Kudos."""
from django import template

register = template.Library()


@register.filter
def get_item(dictionary, key):
    """Permite acceder a un diccionario por clave en plantillas: {{ mydict|get_item:key }}"""
    if dictionary is None:
        return None
    if hasattr(dictionary, 'get'):
        return dictionary.get(key, '')
    return ''


@register.filter
def percentage(value, total):
    """Calcula el porcentaje: {{ value|percentage:total }}"""
    try:
        return round((float(value) / float(total)) * 100, 1) if float(total) > 0 else 0
    except (ValueError, ZeroDivisionError, TypeError):
        return 0


@register.filter
def euro(value):
    """Formatea un número como euros: {{ amount|euro }}"""
    try:
        return f"{float(value):,.2f} €".replace(',', '·').replace('.', ',').replace('·', '.')
    except (ValueError, TypeError):
        return value
