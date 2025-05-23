# kudos_app/views/chatbot.py

"""
Vista para un chatbot basado en IA generativa en Kudos.
Proporciona respuestas en tiempo real para soporte al cliente, consultas generales o interacciones personalizadas.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Notification, SettingsConfig
from openai import OpenAI
from datetime import datetime

def chatbot(request):
    """
    Vista para el chatbot de Kudos.
    Permite a los usuarios interactuar con un asistente de IA en tiempo real.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Chatbot de Kudos")
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        user = User.objects.first()  # Simulación, reemplazar con usuario autenticado en producción

        # Configuración del chatbot desde SettingsConfig
        chatbot_config = SettingsConfig.objects.get_or_create(key="chatbot_settings")[0]
        default_personality = chatbot_config.parameters.get("personality", "Amigable")
        automation_level = chatbot_config.variables.get("automation_level", 0.9)  # Umbral de confianza

        # Selección de personalidad del chatbot
        st.header("Habla con el Chatbot")
        personalities = {
            "Amigable": "Soy tu amigo confiable, aquí para ayudarte con una sonrisa.",
            "Profesional": "Soy un asistente formal, listo para resolver tus consultas con precisión.",
            "Científico": "Soy un pensador lógico, inspirado en la ciencia y el conocimiento.",
            "Explorador": "Soy un aventurero curioso, dispuesto a descubrir respuestas contigo."
        }
        selected_personality = st.selectbox(
            "Elige la Personalidad del Chatbot",
            list(personalities.keys()),
            index=list(personalities.keys()).index(default_personality)
        )
        st.write(personalities[selected_personality])

        # Guardar configuración de personalidad
        if st.button("Guardar Personalidad"):
            chatbot_config.parameters["personality"] = selected_personality
            chatbot_config.save()
            st.success("Personalidad del chatbot guardada.")

        # Historial de chat (almacenado en sesión de Streamlit)
        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        # Entrada del usuario
        user_input = st.text_input("Escribe tu mensaje", key="chat_input")
        if user_input:
            # Generar respuesta con IA
            prompt = (
                f"Actúa como un chatbot con una personalidad {selected_personality}. "
                f"Responde a la siguiente consulta de un usuario de Kudos: '{user_input}'. "
                f"Proporciona una respuesta útil, clara y adaptada a la personalidad seleccionada."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            chatbot_response = response.choices[0].message.content

            # Agregar al historial
            st.session_state.chat_history.append({"user": user_input, "chatbot": chatbot_response})

            # Mostrar respuesta
            st.write(f"**Chatbot ({selected_personality}):** {chatbot_response}")

            # Automatización de soporte (si aplica)
            if "ayuda" in user_input.lower() or "soporte" in user_input.lower():
                confidence = 0.95  # Simulación de confianza, podría calcularse con IA
                if confidence >= automation_level:
                    st.write("**Chatbot:** He resuelto tu consulta automáticamente.")
                    Notification.objects.create(
                        user=user,
                        type='support',
                        message=f"Soporte automático: {chatbot_response[:50]}...",
                        priority='baja'
                    )
                else:
                    st.write("**Chatbot:** Tu consulta requiere atención humana. Notificando al equipo...")
                    Notification.objects.create(
                        user=user,
                        type='support_escalation',
                        message=f"Consulta escalada: {user_input[:50]}...",
                        priority='media'
                    )

        # Mostrar historial de chat
        if st.session_state.chat_history:
            st.subheader("Historial de Conversación")
            for entry in st.session_state.chat_history:
                st.write(f"**Tú:** {entry['user']}")
                st.write(f"**Chatbot:** {entry['chatbot']}")
                st.write("---")

        # Opciones adicionales
        st.subheader("Opciones")
        if st.button("Limpiar Historial"):
            st.session_state.chat_history = []
            st.success("Historial limpiado.")
        if st.button("Enviar Notificación de Seguimiento"):
            last_response = st.session_state.chat_history[-1]["chatbot"] if st.session_state.chat_history else "Sin respuesta previa"
            Notification.objects.create(
                user=user,
                type='chat_followup',
                message=f"Seguimiento del chatbot: {last_response[:50]}...",
                priority='baja'
            )
            st.success("Notificación enviada.")

    return render(request, 'chatbot.html')