# kudos_app/views/data_analysis.py


"""
Vista para analizar datos externos y generar propuestas de mejora en Kudos.
Usa campos genéricos para parámetros, variables y datos.
Integra funciones de data_utils.py para procesamiento y análisis.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import ExternalData, ImprovementProposal, SettingsConfig
from kudos_app.utils.data_utils import fetch_and_store_external_data, aggregate_data, transform_to_dataframe
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64
from datetime import datetime, timedelta
import json

def fetch_updated_data():
    """
    Función para importar datos externos usando las configuraciones definidas en SettingsConfig.
    Utiliza fetch_and_store_external_data de data_utils.py.
    """
    data_config = SettingsConfig.objects.get_or_create(key="data_sources")[0]
    for source_name, source_config in data_config.data_sources.items():
        if source_config.get('enabled', False):
            url = source_config.get('url')
            category = source_config.get('category', 'General')
            params = source_config.get('params', {})
            ids = fetch_and_store_external_data(source_name, url, category, params)
            if isinstance(ids, dict) and "error" in ids:
                st.error(f"Error al importar datos desde {source_name}: {ids['error']}")
            else:
                st.success(f"Datos importados desde {source_name}.")

def analyze_data(data):
    """
    Analiza los datos externos y genera propuestas de mejora.
    """
    if not data:
        return []

    # Transformar datos a DataFrame para análisis
    df = transform_to_dataframe(data, ['category', 'relevance_score'])
    
    # Calcular relevancia promedio por categoría
    category_relevance = df.groupby('category')['relevance_score'].mean().to_dict()
    
    proposals = []
    for category, avg_relevance in category_relevance.items():
        if avg_relevance > 0.8:
            description = f"Expandir contenido en {category} debido a alta relevancia ({avg_relevance:.2f})."
            priority = 'alta'
            estimated_benefit = 1000 * avg_relevance
        elif avg_relevance > 0.5:
            description = f"Explorar oportunidades en {category} (relevancia: {avg_relevance:.2f})."
            priority = 'media'
            estimated_benefit = 500 * avg_relevance
        else:
            description = f"Revisar estrategia en {category} (relevancia baja: {avg_relevance:.2f})."
            priority = 'baja'
            estimated_benefit = 100 * avg_relevance

        proposal = ImprovementProposal.objects.create(
            uid=f"proposal_{category}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            category=category,
            description=description,
            priority=priority,
            estimated_benefit=estimated_benefit,
            estimated_cost=estimated_benefit * 0.2,  # Costo estimado como 20% del beneficio
            status='pendiente',
            parameters={'target_category': category},
            variables={'relevance_score': avg_relevance}
        )
        proposals.append({
            'category': category,
            'description': description,
            'priority': priority,
            'estimated_benefit': estimated_benefit
        })
    return proposals

def generate_action_plan(proposal):
    """
    Genera un plan de acción para una propuesta de mejora.
    """
    return {
        'steps': [
            f"Investigar tendencias en {proposal.category}",
            f"Crear contenido relacionado con {proposal.category}",
            f"Implementar campaña en {proposal.category} dentro de 30 días"
        ],
        'estimated_cost': proposal.estimated_cost,
        'timeline': "30 días"
    }

def data_analysis(request):
    """
    Vista para analizar datos externos y generar propuestas de mejora.
    Usa campos genéricos para parámetros, variables y datos.
    """
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Análisis de Datos Externos en Kudos")
        st.write("Explora tendencias, noticias y economía para generar propuestas de mejora.")

        # Obtener Configuración
        data_config = SettingsConfig.objects.get_or_create(key="data_sources")[0]
        analysis_config = SettingsConfig.objects.get_or_create(key="data_analysis_settings")[0]

        # Configuración de Análisis
        st.header("Configuración de Análisis")
        categories = analysis_config.parameters.get('categories', ['Cultura', 'Economía', 'Deporte'])
        selected_categories = st.multiselect("Categorías de Datos a Analizar", categories, default=categories)
        min_relevance_threshold = st.slider("Umbral de Relevancia Mínima", min_value=0.0, max_value=1.0, value=0.5)
        analysis_config.parameters['categories'] = selected_categories
        analysis_config.variables['min_relevance_threshold'] = min_relevance_threshold
        analysis_config.save()

        # Importar Datos
        if st.button("Importar Datos Actualizados"):
            fetch_updated_data()
            st.success("Datos actualizados correctamente.")

        # Filtrar Datos
        data = ExternalData.objects.filter(
            category__in=selected_categories,
            relevance_score__gte=min_relevance_threshold,
            timestamp__gte=datetime.now() - timedelta(days=7)  # Últimos 7 días
        )

        # Mostrar Datos Externos
        st.header("Datos Externos")
        if data.exists():
            for item in data:
                st.subheader(item.content.get('title', 'Sin Título'))
                st.write(f"**Fuente:** {item.source}")
                st.write(f"**Categoría:** {item.category}")
                st.write(f"**Relevancia:** {item.relevance_score:.2f}")
                st.write(f"**Descripción:** {item.content.get('description', 'Sin descripción')}")
                st.write(f"**Parámetros:** {item.parameters}")
                st.write(f"**Variables:** {item.variables}")
                if st.button(f"Generar Propuesta para {item.content.get('title', 'Item')}", key=f"gen_{item.uid}"):
                    ImprovementProposal.objects.create(
                        uid=f"proposal_{item.uid}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        category=item.category,
                        description=f"Propuesta basada en: {item.content.get('title', 'Sin título')}",
                        priority='media',
                        estimated_benefit=1000 * item.relevance_score,
                        estimated_cost=1000 * item.relevance_score * 0.2,
                        status='pendiente',
                        parameters={'source_data': item.uid},
                        variables={'relevance_score': item.relevance_score}
                    )
                    st.success("Propuesta generada.")
                st.write("---")
        else:
            st.info("No hay datos disponibles para las categorías seleccionadas.")

        # Analizar Datos y Generar Propuestas
        if st.button("Analizar Datos y Generar Propuestas"):
            proposals = analyze_data(data)
            st.success("Propuestas generadas correctamente.")

        # Mostrar Estadísticas usando data_utils.py
        st.header("Estadísticas")
        if data.exists():
            # Usar aggregate_data para calcular métricas
            category_counts = aggregate_data(data, 'category', agg_type='count')
            relevance_sum = aggregate_data(data, 'relevance_score', agg_type='sum')

            st.subheader("Conteo por Categoría")
            for item in category_counts:
                st.write(f"{item['category']}: {item['total']}")

            st.subheader("Suma de Relevancia por Categoría")
            for item in relevance_sum:
                st.write(f"{item['category']}: {item['total']:.2f}")

            # Gráfico de Relevancia
            df = transform_to_dataframe(data, ['category', 'relevance_score'])
            fig, ax = plt.subplots()
            df.groupby('category')['relevance_score'].mean().plot(kind='bar', ax=ax, color='#1a73e8')
            ax.set_title("Relevancia Promedio por Categoría")
            ax.set_xlabel("Categoría")
            ax.set_ylabel("Relevancia")
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            image_base64 = base64.b64encode(buf.read()).decode('utf-8')
            st.image(f"data:image/png;base64,{image_base64}")
            plt.close()

        # Mostrar Propuestas de Mejora
        st.header("Propuestas de Mejora")
        proposals = ImprovementProposal.objects.filter(status='pendiente').order_by('-estimated_benefit')
        for proposal in proposals:
            st.subheader(f"{proposal.category}: {proposal.description}")
            st.write(f"**Prioridad:** {proposal.priority}")
            st.write(f"**Beneficio Estimado:** ${proposal.estimated_benefit:.2f}")
            st.write(f"**Costo Estimado:** ${proposal.estimated_cost:.2f}")
            st.write(f"**Parámetros:** {proposal.parameters}")
            st.write(f"**Variables:** {proposal.variables}")
            if st.button(f"Generar Plan de Acción para {proposal.uid}", key=f"plan_{proposal.uid}"):
                action_plan = generate_action_plan(proposal)
                proposal.status = 'en_progreso'
                proposal.parameters['action_plan'] = action_plan
                proposal.save()
                st.success("Plan de acción generado.")
            if proposal.parameters.get('action_plan'):
                st.write("**Plan de Acción:**")
                for step in proposal.parameters['action_plan']['steps']:
                    st.write(f"- {step}")
                st.write(f"**Costo Estimado:** ${proposal.parameters['action_plan']['estimated_cost']:.2f}")
                st.write(f"**Cronograma:** {proposal.parameters['action_plan']['timeline']}")
            st.write("---")

    return render(request, 'data_analysis.html')