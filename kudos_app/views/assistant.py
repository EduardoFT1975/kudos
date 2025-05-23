# kudos_app/views/assistant.py

"""
Vista para un asistente basado en IA avanzada generativa y personajes históricos.
Ayuda a los usuarios con tareas diarias en categorías como trabajo, salud, deportes, viajes,
ocio, estudios, nutrición, finanzas, relaciones, etc.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Character, SettingsConfig, Notification
from openai import OpenAI
from datetime import datetime
import json

def assistant(request):
    """
    Vista para el asistente basado en IA de Kudos.
    Integra personajes históricos como guías y opciones de personalización.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Asistente de Kudos")
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        user = User.objects.first()  # Simulación, reemplazar con usuario autenticado en producción

        # Configuración del asistente desde SettingsConfig
        assistant_config = SettingsConfig.objects.get_or_create(key="assistant_settings")[0]
        assistant_categories = assistant_config.parameters.get("categories", [
            "Trabajo", "Salud", "Deporte", "Viajes", "Ocio", "Estudios"
        ])
        assistant_personality = assistant_config.parameters.get("personality", "Aristóteles")

        # Selección de personaje histórico como guía
        st.header("Tu Asistente Personal")
        characters = {
            "Aristóteles": {"role": "guia", "theme": "Filosofía", "image": "https://example.com/aristoteles_adults.png"},
            "Isaac Newton": {"role": "guia", "theme": "Ciencia", "image": "https://example.com/newton_adults.png"},
            "Séneca": {"role": "guia", "theme": "Filosofía", "image": "https://example.com/seneca_adults.png"},
            "Michael Jackson": {"role": "guia", "theme": "Música", "image": "https://example.com/jackson_adults.png"},
            "Michael Jordan": {"role": "guia", "theme": "Deporte", "image": "https://example.com/jordan_adults.png"},
            "Cleopatra": {"role": "guia", "theme": "Historia", "image": "https://example.com/cleopatra_adults.png"},
            "Florence Nightingale": {"role": "guia", "theme": "Salud", "image": "https://example.com/nightingale_adults.png"}
        }
        selected_character = st.selectbox(
            "Elige tu Guía Histórico",
            list(characters.keys()),
            index=list(characters.keys()).index(assistant_personality)
        )
        character = characters[selected_character]
        st.write(f"Hola, soy {selected_character}, tu asistente personal. ¿En qué puedo ayudarte hoy?")
        st.image(character["image"])

        # Actualizar configuración del asistente
        if st.button("Guardar Configuración"):
            assistant_config.parameters.update({"personality": selected_character})
            assistant_config.save()
            st.success("Configuración del asistente guardada.")

        # Selección de categoría
        selected_category = st.selectbox(
            "Selecciona una Categoría",
            assistant_categories + ["Nutrición", "Finanzas", "Relaciones", "Gestión de Tiempo", "Meditación", "Aprendizaje Continuo"]
        )

        # Consulta del usuario
        user_query = st.text_input(
            "Escribe tu consulta",
            placeholder=f"Ejemplo: ¿Cómo organizo mi día de trabajo? (Categoría: {selected_category})"
        )
        if user_query:
            prompt = (
                f"Actúa como {selected_character}, un asistente histórico con experiencia en {character['theme']}, "
                f"y ayuda a un usuario con la siguiente consulta en la categoría {selected_category}: {user_query}. "
                f"Proporciona consejos prácticos, personalizados y adaptados al estilo de {selected_character}. "
                f"Responde en un tono educativo y autorizado."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            advice = response.choices[0].message.content
            st.write(f"**{selected_character} dice:**")
            st.write(advice)

            # Opciones adicionales
            st.subheader("Opciones Adicionales")
            if st.button("Crear Tarea"):
                st.write(f"Tarea creada en tu calendario: {advice[:50]}... (funcionalidad simulada)")
            if st.button("Enviar Recordatorio"):
                Notification.objects.create(
                    user=user,
                    type='reminder',
                    message=f"Recordatorio de {selected_character}: {advice[:50]}...",
                    priority='media'
                )
                st.success("Recordatorio enviado.")
            if st.button("Buscar Recursos"):
                st.write("Recursos relacionados (simulados):")
                st.write(f"- Artículo: {selected_category} - Consejos Prácticos")
                st.write(f"- Video: {selected_category} - Tutorial por {selected_character}")
            if st.button("Plan Personalizado"):
                st.write(f"Plan personalizado para {selected_category}: {advice[:100]}... (simulado)")
            if st.button("Meditación Guiada"):
                st.write(f"Guía de meditación por {selected_character}: Cierra los ojos y respira profundamente... (simulado)")
            if st.button("Lección Interactiva"):
                st.write(f"Lección de {selected_category} por {selected_character}: Explora los fundamentos... (simulado)")

    return render(request, 'assistant.html')