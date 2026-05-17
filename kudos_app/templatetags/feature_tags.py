"""
KUDOS / AXÓN · Template tags para feature gating.

Uso en templates:
    {% load feature_tags %}

    {% if_feature "marketplace" %}
      <a href="{% url 'marketplace' %}">Mercado</a>
    {% endif_feature %}

    {# Inverso #}
    {% unless_feature "marketplace" %}
      <!-- nav sin mercado -->
    {% endunless_feature %}
"""
from django import template

from kudos_project.features import is_enabled

register = template.Library()


@register.simple_tag
def feature(name: str) -> bool:
    """`{% feature 'map_5d' as on %}` → bool en variable."""
    return is_enabled(name)


class _IfFeatureNode(template.Node):
    def __init__(self, name, nodelist, invert=False):
        self.name = name
        self.nodelist = nodelist
        self.invert = invert

    def render(self, context):
        active = is_enabled(self.name)
        show = (not active) if self.invert else active
        return self.nodelist.render(context) if show else ""


def _parse_block(parser, token, end_tag, invert=False):
    bits = token.split_contents()
    if len(bits) != 2:
        raise template.TemplateSyntaxError(
            f"{bits[0]} requires exactly one argument: feature name (quoted)"
        )
    name = bits[1].strip("'\"")
    nodelist = parser.parse((end_tag,))
    parser.delete_first_token()
    return _IfFeatureNode(name, nodelist, invert=invert)


@register.tag(name="if_feature")
def do_if_feature(parser, token):
    return _parse_block(parser, token, "endif_feature", invert=False)


@register.tag(name="unless_feature")
def do_unless_feature(parser, token):
    return _parse_block(parser, token, "endunless_feature", invert=True)
