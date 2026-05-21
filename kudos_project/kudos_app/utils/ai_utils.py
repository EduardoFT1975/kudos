# kudos_app/utils/ai_utils.py

from openai import OpenAI
from django.conf import settings
from kudos_app.models import SettingsConfig, User, Capsule, Transaction
import json
from datetime import datetime, timedelta
from django.db.models import Sum

def get_ai_client():
    config = SettingsConfig.objects.get_or_create(key="ai_settings")[0]
    api_key = config.parameters.get("openai_api_key", settings.OPENAI_API_KEY)
    if not api_key:
        raise ValueError("La clave de API de OpenAI no está configurada en settings.py o SettingsConfig.")
    return OpenAI(api_key=api_key)

def generate_content(prompt, max_tokens=500, model="gpt-4", tone="neutral", focus="general"):
    client = get_ai_client()
    enhanced_prompt = f"Genera contenido con un tono {tone} y un enfoque {focus}: {prompt}"
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": enhanced_prompt}],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating content: {e}"

def generate_recommendations(context, num_items=3, model="gpt-4", user_preferences=None):
    prompt = f"Basado en este contexto: {context}, genera {num_items} recomendaciones."
    if user_preferences:
        prompt += f" Considera estas preferencias: {json.dumps(user_preferences)}."
    content = generate_content(prompt, max_tokens=1000, model=model)
    return [rec.strip() for rec in content.split('\n\n') if rec.strip()][:num_items]

def generate_reflection(context, theme="general", model="gpt-4", user_state=None):
    prompt = f"Proporciona una reflexión guiada sobre {context} con un enfoque {theme}."
    if user_state:
        prompt += f" El usuario se siente {user_state}."
    return generate_content(prompt, max_tokens=300, model=model)

def enrich_content(content, user_context, model="gpt-4", style="engaging"):
    prompt = f"Enriquece el siguiente texto con un estilo {style}: '{content}'. Contexto del usuario: {user_context}."
    return generate_content(prompt, max_tokens=500, model=model)

def generate_admin_suggestions(user, num_suggestions=3, model="gpt-4"):
    total_users = User.objects.count()
    total_capsules = Capsule.objects.count()
    recent_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - timedelta(days=7)).aggregate(total=Sum('amount'))['total'] or 0

    context = (
        f"Administrador: {user.alias}. "
        f"Usuarios totales: {total_users}. "
        f"Cápsulas totales: {total_capsules}. "
        f"Ingresos últimos 7 días: ${recent_transactions:.2f}."
    )
    prompt = f"Basado en el estado actual del sistema: {context}, genera {num_suggestions} sugerencias administrativas para mejorar Kudos."
    content = generate_content(prompt, max_tokens=1000, model=model)
    return [sug.strip() for sug in content.split('\n\n') if sug.strip()][:num_suggestions]

def generate_marketplace_description(capsule, model="gpt-4"):
    prompt = f"Genera una descripción atractiva para esta cápsula comercial: '{capsule.contenido}'. Categoría: {capsule.temas[0] if capsule.temas else 'General'}."
    return generate_content(prompt, max_tokens=200, model=model)

def suggest_capsule_price(capsule, model="gpt-4"):
    return 10.0  # Precio sugerido por defecto, implementar lógica real basada en datos de mercado

def handle_ai_error(e):
    return f"Error en la operación de IA: {str(e)}"