# kudos_app/views/personal_assistant.py

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from django.contrib.auth.decorators import login_required
from kudos_app.models import User, SettingsConfig, Notification, Capsule, Transaction
from openai import OpenAI
from datetime import datetime, timedelta
from django.db import models

@login_required
def personal_assistant(request):
    user = request.user

    if user.role != 'founder':
        return render(request, '403.html')

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title(f"Asistente Personal de {user.alias}")
        st.write("Tu compañero IA exclusivo, diseñado para ayudarte a vivir una vida estoica y gestionar Kudos.")
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        assistant_config = SettingsConfig.objects.get_or_create(key="personal_assistant_settings")[0]
        stoic_quotes = assistant_config.parameters.get("stoic_quotes", [
            "No controlas lo que sucede, pero sí cómo respondes. - Epicteto",
            "La felicidad depende de ti mismo. - Marco Aurelio",
            "Acepta lo que no puedes cambiar y cambia lo que puedas. - Séneca"
        ])
        tasks = assistant_config.parameters.get("tasks", ["Reflexión Diaria", "Planificación", "Gestión de Kudos"])

        st.header(f"Bienvenido, Fundador {user.alias}")
        if user.role != 'founder':
            st.error("Acceso denegado. Este asistente es exclusivo para el fundador.")
            return render(request, '403.html')

        st.header("Modo Estoico")
        st.write("Reflexiona y vive según los principios del estoicismo.")
        if st.button("Obtener Reflexión Estoica"):
            quote = st.session_state.get('current_quote', stoic_quotes[0])
            st.session_state.current_quote = quote
            prompt = (
                f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                f"Basado en esta cita de {quote.split(' - ')[1]}: '{quote.split(' - ')[0]}', "
                f"proporciona una reflexión personalizada para hoy, considerando el contexto de liderar un proyecto multidimensional."
            )
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )
            reflection = response.choices[0].message.content
            st.write(f"**Cita del Día:** {quote}")
            st.write(f"**Reflexión:** {reflection}")
            Notification.objects.create(
                user=user,
                type='stoic_reflection',
                message=f"Reflexión estoica: {reflection[:50]}...",
                priority='media'
            )

        st.header("Tareas del Fundador")
        task = st.selectbox("Selecciona una Tarea", tasks)
        custom_query = st.text_input("Consulta Personalizada", placeholder="Ejemplo: ¿Cómo priorizo mis tareas hoy?")
        
        if st.button("Consultar Asistente"):
            if task == "Consulta Personalizada" and not custom_query:
                st.error("Por favor, escribe una consulta personalizada.")
            else:
                if task == "Reflexión Diaria":
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Proporciona una reflexión diaria basada en los principios del estoicismo, "
                        f"considerando el liderazgo de un proyecto global multidimensional."
                    )
                elif task == "Planificación":
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Sugiere un plan diario basado en los principios del estoicismo, "
                        f"priorizando tareas para liderar un proyecto multidimensional."
                    )
                elif task == "Gestión de Kudos":
                    context = (
                        f"Cápsulas creadas: {Capsule.objects.count()}. "
                        f"Usuarios activos: {User.objects.filter(is_active=True).count()}."
                    )
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Proporciona una recomendación para gestionar Kudos hoy, basado en: {context}, "
                        f"usando principios del estoicismo."
                    )
                else:
                    prompt = (
                        f"Actúa como un asistente personal estoico para el fundador de Kudos. "
                        f"Responde a esta consulta: '{custom_query}', "
                        f"aplicando principios del estoicismo en el contexto de liderar un proyecto multidimensional."
                    )

                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}]
                )
                advice = response.choices[0].message.content
                st.write(f"**Asistente Estoico:** {advice}")
                Notification.objects.create(
                    user=user,
                    type='assistant_advice',
                    message=f"Consejo: {advice[:50]}...",
                    priority='media'
                )

        st.header("Estado de Kudos")
        st.write("Resumen rápido de tu proyecto.")
        total_capsules = Capsule.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        recent_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - timedelta(days=7)).aggregate(total=models.Sum('amount'))['total'] or 0
        st.write(f"**Cápsulas Totales:** {total_capsules}")
        st.write(f"**Usuarios Activos:** {active_users}")
        st.write(f"**Ingresos (Última Semana):** ${recent_transactions:.2f}")

    return render(request, 'personal_assistant.html')