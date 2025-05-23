# kudos_app/views/report.py

"""
Vista para generar y mostrar reportes descargables (PDFs) de estadísticas y métricas en Kudos.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import (
    User, Capsule, Route, Notification, Alert, WisdomSpace, PromotionSpace, SocialSpace, Transaction, SettingsConfig
)
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from django.db.models import Sum, Count

def generate_pdf_report(user, stats, charts):
    """
    Genera un reporte en PDF con estadísticas y gráficos.
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Título
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, height - 50, f"Reporte de Kudos - {user.alias}")
    p.setFont("Helvetica", 12)
    p.drawString(100, height - 70, f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Estadísticas
    y_position = height - 100
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, y_position, "Estadísticas")
    y_position -= 20

    for key, value in stats.items():
        p.setFont("Helvetica", 12)
        p.drawString(120, y_position, f"{key}: {value}")
        y_position -= 15

    # Gráficos
    y_position -= 20
    p.setFont("Helvetica-Bold", 14)
    p.drawString(100, y_position, "Gráficos")
    y_position -= 20

    for chart_name, chart_data in charts.items():
        img = ImageReader(chart_data)
        p.drawImage(img, 100, y_position - 150, width=400, height=150)
        y_position -= 170
        if y_position < 100:
            p.showPage()
            y_position = height - 50

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer

def report(request):
    """
    Vista para generar y mostrar reportes descargables (PDFs) de estadísticas y métricas.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Reportes de Kudos")
        st.write("Genera reportes descargables con estadísticas y métricas de tu actividad en Kudos.")

        user = request.user if request.user.is_authenticated else User.objects.first()  # Simulación con autenticación

        # Selección de Rango de Tiempo
        st.header("Configurar Reporte")
        time_range = st.selectbox("Rango de Tiempo", ["Última Semana", "Último Mes", "Último Año", "Personalizado"])
        if time_range == "Personalizado":
            start_date = st.date_input("Fecha de Inicio", value=datetime.now().date() - timedelta(days=30))
            end_date = st.date_input("Fecha de Fin", value=datetime.now().date())
        else:
            end_date = datetime.now().date()
            if time_range == "Última Semana":
                start_date = end_date - timedelta(days=7)
            elif time_range == "Último Mes":
                start_date = end_date - timedelta(days=30)
            else:  # Último Año
                start_date = end_date - timedelta(days=365)

        # Estadísticas
        stats = {}

        # Cápsulas Creadas
        capsules = Capsule.objects.filter(
            usuario=user,
            fecha__range=(start_date, end_date)
        )
        stats["Cápsulas Creadas"] = capsules.count()

        # Rutas Completadas
        routes = Route.objects.filter(
            usuario=user,
            fecha__range=(start_date, end_date)
        )
        stats["Rutas Completadas"] = routes.count()
        total_distance = sum(route.distance for route in routes)
        total_altitude = sum(route.altitude_gain for route in routes)
        stats["Distancia Total (km)"] = f"{total_distance:.2f}"
        stats["Desnivel Acumulado (m)"] = f"{total_altitude:.2f}"

        # Interacciones Sociales
        notifications = Notification.objects.filter(
            user=user,
            timestamp__range=(start_date, end_date),
            type__in=['like', 'comment']
        )
        likes = notifications.filter(type='like').count()
        comments = notifications.filter(type='comment').count()
        stats["Likes Recibidos"] = likes
        stats["Comentarios Recibidos"] = comments

        # Alertas de Seguridad
        alerts = Alert.objects.filter(
            timestamp__range=(start_date, end_date),
            location__distance_lte=(user.ubicacion, D(m=user.notification_distance))
        )
        stats["Alertas de Seguridad Recibidas"] = alerts.count()

        # Espacios de Sabiduría Visitados
        wisdom_spaces = WisdomSpace.objects.filter(
            timestamp__range=(start_date, end_date)
        )
        stats["Espacios de Sabiduría Visitados"] = wisdom_spaces.count()

        # Espacios de Promoción Creados
        promotion_spaces = PromotionSpace.objects.filter(
            user=user,
            timestamp__range=(start_date, end_date)
        )
        stats["Espacios de Promoción Creados"] = promotion_spaces.count()

        # Espacios Sociales Participados
        social_spaces = SocialSpace.objects.filter(
            participants=user,
            timestamp__range=(start_date, end_date)
        )
        stats["Espacios Sociales Participados"] = social_spaces.count()

        # Transacciones Realizadas
        transactions = Transaction.objects.filter(
            user=user,
            timestamp__range=(start_date, end_date)
        )
        total_revenue = sum(t.amount for t in transactions)
        total_commission = sum(t.commission for t in transactions)
        stats["Transacciones Realizadas"] = transactions.count()
        stats["Ingresos Totales ($)"] = f"{total_revenue:.2f}"
        stats["Comisiones Generadas ($)"] = f"{total_commission:.2f}"

        # Configuración de Reporte desde SettingsConfig
        report_config = SettingsConfig.objects.get_or_create(key="report_settings")[0]
        st.header("Configuración de Reporte")
        metrics_to_include = st.multiselect(
            "Métricas a Incluir",
            list(stats.keys()),
            default=list(stats.keys()),
            help="Selecciona las métricas que deseas incluir en el reporte."
        )
        include_charts = st.checkbox("Incluir Gráficos", value=True)
        chart_types = st.multiselect(
            "Tipos de Gráficos",
            ["Interacciones Sociales", "Transacciones", "Alertas por Día"],
            default=["Interacciones Sociales", "Transacciones"],
            help="Selecciona los gráficos a incluir."
        )

        report_config.parameters.update({
            "metrics_to_include": metrics_to_include,
            "include_charts": include_charts,
            "chart_types": chart_types
        })
        report_config.save()

        # Mostrar Estadísticas
        st.header("Estadísticas")
        filtered_stats = {k: stats[k] for k in metrics_to_include}
        for key, value in filtered_stats.items():
            st.write(f"**{key}:** {value}")

        # Generar Gráficos
        charts = {}
        if include_charts:
            for chart_type in chart_types:
                plt.figure(figsize=(6, 4))
                if chart_type == "Interacciones Sociales":
                    sns.barplot(x=['Likes', 'Comentarios'], y=[likes, comments])
                    plt.title("Interacciones Sociales")
                elif chart_type == "Transacciones":
                    transactions_by_day = transactions.values('timestamp__date').annotate(total=Sum('amount'))
                    days = [t['timestamp__date'].strftime('%Y-%m-%d') for t in transactions_by_day]
                    amounts = [t['total'] for t in transactions_by_day]
                    sns.lineplot(x=days, y=amounts)
                    plt.title("Ingresos por Día")
                    plt.xticks(rotation=45)
                elif chart_type == "Alertas por Día":
                    alerts_by_day = alerts.values('timestamp__date').annotate(total=Count('id'))
                    days = [a['timestamp__date'].strftime('%Y-%m-%d') for a in alerts_by_day]
                    counts = [a['total'] for a in alerts_by_day]
                    sns.lineplot(x=days, y=counts)
                    plt.title("Alertas por Día")
                    plt.xticks(rotation=45)
                plt.tight_layout()

                # Convertir gráfico a imagen
                chart_buffer = io.BytesIO()
                plt.savefig(chart_buffer, format='png')
                chart_buffer.seek(0)
                charts[chart_type] = chart_buffer
                plt.close()

        # Generar y Descargar PDF
        if st.button("Generar Reporte PDF"):
            pdf_buffer = generate_pdf_report(user, filtered_stats, {k: v for k, v in charts.items() if k in chart_types})
            st.download_button(
                label="Descargar Reporte PDF",
                data=pdf_buffer,
                file_name=f"reporte_kudos_{user.alias}_{datetime.now().strftime('%Y%m%d')}.pdf",
                mime="application/pdf"
            )

    return render(request, 'report.html')