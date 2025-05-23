import os
import sys
import django
import streamlit as st
import pandas as pd
from django.conf import settings

# Agregar el directorio raíz del proyecto a sys.path
sys.path.append(r"C:\Users\efert\kudos_project")

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
django.setup()

# Importar el modelo Capsule
from kudos_app.models import Capsule

def fetch_capsules():
    """Recupera las cápsulas de la base de datos y las procesa para eliminar duplicados y vacías."""
    capsules = Capsule.objects.all()[:12]  # Limita a 12 cápsulas
    data = []
    seen_uids = set()  # Conjunto para rastrear UIDs únicos
    for c in capsules:
        # Verificar que el UID no esté repetido y que el contenido no esté vacío
        if c.uid not in seen_uids and c.contenido.strip() != "" and c.contenido != "Sin contenido":
            data.append({
                "UID": c.uid,
                "Contenido": c.contenido,
                "Ubicación": f"({c.ubicacion.y}, {c.ubicacion.x})",
                "Fecha": c.fecha,
                "Tema": tuple(c.temas) if isinstance(c.temas, list) else c.temas,
                "Modo": c.modo,
                "Privacidad": c.privacy,
                "Precio": c.price,
                "Timestamp": c.timestamp
            })
            seen_uids.add(c.uid)  # Agregar UID al conjunto de vistos
    return pd.DataFrame(data)

def main():
    st.title("Explorador de Cápsulas en Kudos")
    st.write("Visualiza las cápsulas del proyecto, sin duplicados ni vacías.")

    # Recuperar y mostrar las cápsulas
    df = fetch_capsules()
    if df.empty:
        st.write("No hay cápsulas disponibles.")
    else:
        st.dataframe(df)

    # Filtrar por tema
    themes = df["Tema"].unique()
    selected_theme = st.selectbox("Filtrar por tema", ["Todos"] + list(themes))
    filtered_df = df if selected_theme == "Todos" else df[df["Tema"] == selected_theme]
    st.dataframe(filtered_df)

    # Detalles de una cápsula seleccionada
    if not filtered_df.empty:
        selected_capsule = st.selectbox("Seleccionar cápsula", filtered_df["UID"])
        capsule_details = filtered_df[filtered_df["UID"] == selected_capsule].iloc[0]
        st.write("**Detalles de la cápsula seleccionada:**")
        st.write(capsule_details)

if __name__ == "__main__":
    main()