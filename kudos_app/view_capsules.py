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

# Ahora importar los modelos
from kudos_app.models import Capsule

def fetch_capsules():
    """Recupera las 12 cápsulas de la base de datos."""
    capsules = Capsule.objects.all()[:12]  # Limita a 12
    data = [
        {
            "UID": c.uid,
            "Contenido": c.contenido,
            "Ubicación": f"({c.ubicacion_y}, {c.ubicacion_x})",
            "Fecha": c.fecha,
            "Tema": c.temas or "Sin tema",
            "Modo": c.modo,
            "Privacidad": c.privacy,
            "Precio": c.price,
            "Timestamp": c.timestamp
        }
        for c in capsules
    ]
    return pd.DataFrame(data)

def main():
    st.title("Explorador de Cápsulas en Kudos")
    st.write("Visualiza las 12 cápsulas del proyecto.")

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