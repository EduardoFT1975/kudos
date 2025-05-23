# kudos_app/views/subscriptions.py

import streamlit as st
from django.contrib.auth.decorators import login_required

def manage_subscriptions(request):
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Gestionar Suscripción")
        user = request.user if request.user.is_authenticated else None

        if not user:
            st.error("Debes iniciar sesión para gestionar tu suscripción.")
            return

        st.write(f"Bienvenido, {user.alias}! Gestiona tu suscripción a Kudos Premium.")

        # Precio dinámico simulado (en una implementación real, usar IA para ajustar precios)
        base_price = 5.0  # $5 al mes
        dynamic_price = base_price + random.uniform(-1, 1)  # Variación simulada

        st.write(f"**Kudos Premium:** ${dynamic_price:.2f} al mes")
        st.write("Beneficios: Almacenamiento ilimitado, acceso a cápsulas exclusivas, sin anuncios.")

        if st.button("Suscribirse a Kudos Premium"):
            st.success(f"¡Suscripción simulada! Has activado Kudos Premium por ${dynamic_price:.2f} al mes.")
    else:
        return render(request, 'subscriptions.html')