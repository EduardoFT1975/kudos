# kudos_app/views/admin_assistant.py

"""
Vista para un asistente personal basado en IA para administradores en Kudos.
Ayuda a gestionar tareas administrativas avanzadas con sugerencias proactivas.
Restringido a roles administrativos.
"""

import streamlit as st
from django.shortcuts import render
from django.http import HttpRequest
from django.conf import settings
from kudos_app.models import User, SettingsConfig, Notification, Capsule, Transaction, AdminAccess
from datetime import datetime, timedelta
from django.db.models import Sum

# Respuestas predefinidas como solución temporal
def query_assistant(prompt):
    predefined_responses = {
        "Revisar estadísticas": "Recomiendo analizar las estadísticas de uso de cápsulas y transacciones para identificar tendencias. Por ejemplo, revisa qué cápsulas tienen más interacciones y ajusta las estrategias de marketing en consecuencia.",
        "Gestionar usuarios": "Sugiero revisar la actividad de los usuarios para identificar patrones de inactividad. Podrías enviar notificaciones personalizadas para reactivar a los usuarios inactivos.",
        "Optimizar costos": "Para optimizar costos, considera reducir el uso de recursos en cápsulas poco populares y enfócate en las que generan más ingresos.",
        "Planificar referendos": "Planifica un referendo para decidir sobre nuevas funcionalidades. Usa notificaciones globales para informar a los usuarios y aumentar la participación.",
        "Analizar tendencias de mercado": "Analiza las tendencias actuales en AR/VR y blockchain. Podrías incorporar nuevas tecnologías populares para atraer a más usuarios.",
    }
    for key in predefined_responses:
        if key.lower() in prompt.lower():
            return predefined_responses[key]
    return "No tengo una respuesta predefinida para esta consulta. Por favor, reformula tu pregunta o selecciona una tarea de la lista."

def admin_assistant(request_or_mock):
    if isinstance(request_or_mock, HttpRequest):
        user = request_or_mock.user
        is_streamlit = False
    else:
        user = request_or_mock.user
        is_streamlit = True

    if not user.is_staff:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores pueden usar este asistente.")
        else:
            return render(request_or_mock, '403.html')
        return

    if hasattr(user, 'uid'):
        admin_access = AdminAccess.objects.filter(user__uid=user.uid).first()
    else:
        admin_access = None

    if not admin_access or admin_access.access_level < 2:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores autorizados pueden usar este asistente.")
        else:
            return render(request_or_mock, '403.html')
        return

    if is_streamlit:
        st.title("Asistente Administrativo de Kudos")
        st.write("Tu compañero IA para gestionar tareas administrativas avanzadas.")

        assistant_config = SettingsConfig.objects.get_or_create(key="admin_assistant_settings")[0]
        default_tasks = assistant_config.parameters.get("default_tasks", [
            "Revisar estadísticas", "Gestionar usuarios", "Optimizar costos", "Planificar referendos",
            "Analizar tendencias de mercado"
        ]) if assistant_config.parameters else [
            "Revisar estadísticas", "Gestionar usuarios", "Optimizar costos", "Planificar referendos",
            "Analizar tendencias de mercado"
        ]
        automation_level = assistant_config.variables.get("automation_level", 0.9) if assistant_config.variables else 0.9

        st.header("Tareas Administrativas")
        st.write("Selecciona una tarea o haz una consulta personalizada.")
        task = st.selectbox("Tarea", default_tasks + ["Consulta Personalizada"])
        custom_query = st.text_input("Consulta Personalizada", placeholder="Ejemplo: ¿Cómo aumento los ingresos?", disabled=task != "Consulta Personalizada")

        if st.button("Consultar Asistente"):
            if task == "Consulta Personalizada" and not custom_query:
                st.error("Por favor, escribe una consulta personalizada.")
            else:
                query = custom_query if task == "Consulta Personalizada" else task
                context = (
                    f"Usuario: {user.alias}, administrador de Kudos. "
                    f"Contexto: Proyecto multidimensional con IA, blockchain, AR/VR, y {Capsule.objects.count()} cápsulas creadas. "
                    f"Ingresos totales: ${Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0:.2f}. "
                    f"Usuarios activos: {User.objects.filter(is_active=True).count()}."
                )
                prompt = (
                    f"Actúa como un asistente personal para un administrador de Kudos. "
                    f"Proporciona una sugerencia proactiva basada en esta consulta: '{query}'. "
                    f"Contexto: {context}. Responde en un tono profesional y estratégico."
                )
                # Usar respuestas predefinidas
                suggestion = query_assistant(prompt)
                st.write(f"**Asistente:** {suggestion}")

                if st.button("Guardar Sugerencia", key="save_suggestion"):
                    Notification.objects.create(
                        user=user,
                        type='admin_suggestion',
                        message=f"Sugerencia: {suggestion[:50]}...",
                        priority='media'
                    )
                    st.success("Sugerencia guardada como notificación.")

                if "automatizar" in query.lower() and automation_level > 0.8:
                    st.write("**Asistente:** Esta tarea podría automatizarse. ¿Deseas proceder?")
                    if st.button("Automatizar Tarea"):
                        st.success("Tarea automatizada (simulada). Consulta el panel de control para ajustes.")

        st.header("Estadísticas Rápidas")
        st.write("Resumen de la actividad reciente.")
        time_delta = timedelta(days=7)
        recent_capsules = Capsule.objects.filter(timestamp__gte=datetime.now() - time_delta).count()
        recent_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - time_delta).aggregate(total=Sum('amount'))['total'] or 0
        active_users = User.objects.filter(is_active=True).count()
        st.write(f"**Cápsulas Creadas (Última Semana):** {recent_capsules}")
        st.write(f"**Ingresos (Última Semana):** ${recent_transactions:.2f}")
        st.write(f"**Usuarios Activos:** {active_users}")

        st.header("Acciones Rápidas")
        if st.button("Enviar Notificación Global"):
            message = st.text_input("Mensaje Global", placeholder="Ejemplo: Actualización del sistema disponible.")
            if st.button("Confirmar Envío"):
                for u in User.objects.filter(is_active=True):
                    Notification.objects.create(
                        user=u,
                        type='global',
                        message=message,
                        priority='alta'
                    )
                st.success("Notificación enviada a todos los usuarios activos.")

        st.header("Notificaciones Automáticas")
        st.write("Configura notificaciones automáticas basadas en eventos clave.")

        last_week_transactions = Transaction.objects.filter(timestamp__gte=datetime.now() - timedelta(days=14)).aggregate(total=Sum('amount'))['total'] or 0
        if recent_transactions < 0.9 * last_week_transactions:
            Notification.objects.create(
                user=user,
                type='alert',
                message="Alerta: Los ingresos han bajado más del 10% esta semana.",
                priority='alta'
            )
            st.warning("Se ha enviado una notificación automática: Ingresos bajos esta semana.")