# kudos_app/utils/data_utils.py

"""
Módulo utilitario para gestionar operaciones de datos en Kudos.
Proporciona funciones para procesar, analizar y transformar datos multidimensionales.
"""

from kudos_app.models import SettingsConfig
from django.db.models import Count, Sum
from datetime import datetime, timedelta
import json
import pandas as pd
import numpy as np

def parse_json_field(data, default=None):
    """
    Parsea un campo JSON de un modelo de forma segura.

    Args:
        data (str or dict): Datos JSON a parsear (puede ser string o dict).
        default (any): Valor por defecto si el parsing falla. Default: None.

    Returns:
        dict: Datos parseados o default si falla.
    """
    if not data:
        return default
    try:
        return json.loads(data) if isinstance(data, str) else data
    except json.JSONDecodeError:
        return default

def aggregate_data(queryset, field, agg_type='count'):
    """
    Agrega datos de un queryset según un campo y tipo de agregación.

    Args:
        queryset (QuerySet): Conjunto de datos a agregar.
        field (str): Campo a agregar (e.g., 'price', 'timestamp__date').
        agg_type (str): Tipo de agregación ('count', 'sum', 'avg'). Default: 'count'.

    Returns:
        dict: Resultado de la agregación.
    """
    agg_functions = {
        'count': Count,
        'sum': Sum,
        'avg': lambda x: Sum(x) / Count(x)  # Simplificación para promedio
    }
    agg_func = agg_functions.get(agg_type, Count)
    return queryset.values(field).annotate(total=agg_func(field)).order_by(field)

def filter_by_time_range(queryset, days_back=None, start_date=None, end_date=None):
    """
    Filtra un queryset por rango de tiempo.

    Args:
        queryset (QuerySet): Conjunto de datos a filtrar.
        days_back (int, optional): Días atrás desde hoy.
        start_date (date, optional): Fecha de inicio.
        end_date (date, optional): Fecha de fin.

    Returns:
        QuerySet: Datos filtrados por tiempo.
    """
    if days_back:
        start_date = datetime.now().date() - timedelta(days=days_back)
        end_date = datetime.now().date()
    if start_date and end_date:
        return queryset.filter(timestamp__date__range=(start_date, end_date))
    return queryset

def generate_statistics(data, metric, stat_type='mean'):
    """
    Genera estadísticas básicas a partir de una lista o queryset.

    Args:
        data (list or QuerySet): Datos a analizar.
        metric (str): Nombre del campo o clave a analizar.
        stat_type (str): Tipo de estadística ('mean', 'sum', 'count', 'std'). Default: 'mean'.

    Returns:
        float: Resultado de la estadística.
    """
    if not data:
        return 0

    if hasattr(data, 'values'):  # Es un QuerySet
        values = [item[metric] for item in data.values(metric)]
    else:  # Es una lista
        values = [item.get(metric, 0) if isinstance(item, dict) else item for item in data]

    df = pd.Series(values)
    stat_functions = {
        'mean': df.mean,
        'sum': df.sum,
        'count': df.count,
        'std': df.std
    }
    return stat_functions.get(stat_type, df.mean)() or 0

def transform_to_dataframe(queryset, fields):
    """
    Transforma un queryset en un DataFrame de pandas para análisis.

    Args:
        queryset (QuerySet): Conjunto de datos a transformar.
        fields (list): Lista de campos a incluir.

    Returns:
        pd.DataFrame: DataFrame con los datos transformados.
    """
    data = list(queryset.values(*fields))
    for item in data:
        for field in fields:
            if field in ['parameters', 'variables']:
                item[field] = parse_json_field(item[field], {})
    return pd.DataFrame(data)

def fetch_and_store_external_data(source_name, url, category, params=None):
    """
    Obtiene datos externos de una URL y los almacena como ExternalData.

    Args:
        source_name (str): Nombre de la fuente (e.g., 'NASA').
        url (str): URL de la API externa.
        category (str): Categoría de los datos (e.g., 'Astronomía').
        params (dict, optional): Parámetros para la solicitud.

    Returns:
        list: Lista de IDs de los objetos ExternalData creados.
    """
    from kudos_app.models import ExternalData
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list):
            items = data
        elif isinstance(data, dict) and 'results' in data:
            items = data['results']
        else:
            items = [data]

        created_ids = []
        for item in items:
            external = ExternalData(
                uid=f"{source_name.lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{hash(str(item))}",
                source=source_name,
                category=category,
                content=item,
                timestamp=datetime.now(),
                relevance_score=0.8,  # Valor predeterminado
                parameters={'source_url': url}
            )
            external.save()
            created_ids.append(external.uid)
        return created_ids
    except Exception as e:
        return {"error": f"Error fetching external data: {e}"}