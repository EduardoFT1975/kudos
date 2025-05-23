# kudos_app/views/simulate_activity.py

import streamlit as st
from kudos_app.utils.capsule_generator import generate_capsules
from kudos_app.utils.notifications_utils import create_notification
import random
from kudos_app.models import User, Capsule

def simulate_activity(request):
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Simulación de Actividad para el Lanzamiento")
        st.write("Genera cápsulas simuladas e interacciones sociales para poblar la plataforma.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        st.header("Configurar Simulación")
        center_lat = st.number_input("Latitud del Centro", value=40.4168, step=0.0001, key="sim_lat")
        center_lon = st.number_input("Longitud del Centro", value=-3.7038, step=0.0001, key="sim_lon")
        place_type = st.selectbox("Tipo de Lugar", ["tourist_attraction", "museum", "park"], index=0, key="sim_place_type")
        max_places = st.number_input("Número Máximo de Cápsulas", min_value=1, max_value=1000, value=50, step=1, key="sim_max_places")

        if st.button("Generar Actividad Simulada", key="simulate_activity"):
            # Corregir la línea con el paréntesis faltante y eliminar el carácter extraño
            generate_capsules(center_lat=center_lat, center_lon=center_lon, place_type=place_type, max_places=max_places)

            capsules = Capsule.objects.filter(contenido__startswith="Evento Histórico")[:100]
            comments = ["¡Increíble experiencia!", "Me encanta esta cápsula.", "Gracias por compartir."]
            for capsule in capsules:
                for _ in range(random.randint(1, 5)):
                    capsule.likes.add(user)
                create_notification(
                    user=capsule.usuario,
                    notification_type='comment',
                    message=f"{user.alias} comentó: {random.choice(comments)}",
                    priority='baja'
                )
            st.success(f"Actividad simulada generada: {max_places} cápsulas y {len(capsules)} interacciones.")
    else:
        return render(request, 'simulate_activity.html', {})