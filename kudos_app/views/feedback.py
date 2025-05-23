# kudos_app/views/feedback.py

"""
Vista para gestionar la retroalimentación de los usuarios en Kudos.
Permite enviar comentarios y calificaciones, notificando al equipo de Kudos.
Usa campos genéricos para configuraciones flexibles desde el panel de control.
"""

import streamlit as st
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib import messages
from kudos_app.models import User, Feedback, SettingsConfig, Notification
from django.core.mail import send_mail
from datetime import datetime

def feedback(request):
    """
    Vista para gestionar la retroalimentación de los usuarios.
    """
    user = request.user if request.user.is_authenticated else None

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Retroalimentación en Kudos")
        st.write("Tu opinión nos ayuda a mejorar. ¡Déjanos tus comentarios o sugerencias!")

        # Configuración genérica desde SettingsConfig
        feedback_config = SettingsConfig.objects.get_or_create(key="feedback_settings")[0]
        default_rating_options = feedback_config.parameters.get("rating_options", ["1 - Malo", "2 - Regular", "3 - Bueno", "4 - Muy Bueno", "5 - Excelente"])
        email_recipients = feedback_config.parameters.get("email_recipients", ["feedback@kudos.com"])
        max_comment_length = feedback_config.variables.get("max_comment_length", 500)

        # Formulario de Retroalimentación
        with st.form(key="feedback_form"):
            name = st.text_input("Nombre (opcional)", value=user.alias if user else "")
            email = st.text_input("Correo Electrónico (opcional)", value=user.email if user else "")
            rating = st.selectbox("Calificación", default_rating_options)
            comment = st.text_area("Comentarios", max_chars=max_comment_length, placeholder="Escribe tus comentarios aquí...")
            submit_button = st.form_submit_button("Enviar")

            if submit_button and comment.strip():
                feedback = Feedback.objects.create(
                    user=user,
                    name=name if name else "Anónimo",
                    email=email if email else None,
                    rating=rating.split(" - ")[0],  # Extrae el valor numérico
                    comment=comment,
                    timestamp=datetime.now()
                )
                # Notificación al usuario
                Notification.objects.create(
                    user=user,
                    type='feedback',
                    message=f"Gracias por tu retroalimentación. Tu comentario ha sido recibido (ID: {feedback.id}).",
                    priority='media'
                )
                # Notificación al equipo vía email
                subject = f"Retroalimentación de {name or 'Anónimo'}"
                message = f"Nombre: {name or 'Anónimo'}\nEmail: {email or 'No proporcionado'}\nCalificación: {rating}\nComentario: {comment}"
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    email_recipients,
                    fail_silently=True,
                )
                st.success("¡Gracias por tu retroalimentación! Hemos recibido tu comentario.")
            elif submit_button and not comment.strip():
                st.error("Por favor, escribe un comentario antes de enviar.")

    else:  # Renderizado en Django
        if request.method == "POST":
            name = request.POST.get("name", "Anónimo")
            email = request.POST.get("email", None)
            rating = request.POST.get("rating", "3")
            comment = request.POST.get("feedback", "").strip()

            feedback_config = SettingsConfig.objects.get_or_create(key="feedback_settings")[0]
            email_recipients = feedback_config.parameters.get("email_recipients", ["feedback@kudos.com"])

            if comment:
                feedback = Feedback.objects.create(
                    user=user,
                    name=name,
                    email=email,
                    rating=rating,
                    comment=comment,
                    timestamp=datetime.now()
                )
                messages.success(request, "¡Gracias por tu retroalimentación! Hemos recibido tu comentario.")
                Notification.objects.create(
                    user=user,
                    type='feedback',
                    message=f"Gracias por tu retroalimentación. Tu comentario ha sido recibido (ID: {feedback.id}).",
                    priority='media'
                )
                # Notificación al equipo vía email
                subject = f"Retroalimentación de {name}"
                message = f"Nombre: {name}\nEmail: {email or 'No proporcionado'}\nCalificación: {rating}\nComentario: {comment}"
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    email_recipients,
                    fail_silently=True,
                )
                return redirect('feedback')
            else:
                messages.error(request, "Por favor, escribe un comentario antes de enviar.")

        return render(request, 'feedback.html')