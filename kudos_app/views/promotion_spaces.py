# kudos_app/views/promotion_spaces.py

"""
Vista para gestionar espacios de promoción virtuales en Kudos.
Permite a los usuarios prosumidores crear y explorar promociones con AR/VR.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, PromotionSpace, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime

def promotion_spaces(request):
    """
    Vista para gestionar espacios de promoción virtuales en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Espacios de Promoción en Kudos")
        st.write("Crea y explora promociones virtuales para conectar con otros usuarios.")

        # Configuración desde SettingsConfig
        promo_config = SettingsConfig.objects.get_or_create(key="promotion_spaces_settings")[0]
        default_categories = promo_config.parameters.get("categories", ["General", "Comercio", "Servicios", "Eventos"])
        max_price = promo_config.variables.get("max_price", 1000.0)
        commission_rate = promo_config.variables.get("commission_rate", 5.0)

        # Sección: Crear Espacio de Promoción
        st.header("Crear Espacio de Promoción")
        st.write("Publica una promoción para tu negocio o servicio.")
        category = st.selectbox("Categoría", default_categories)
        subcategory = st.text_input("Subcategoría", placeholder="Ejemplo: Ropa, Consultoría...")
        description = st.text_area("Descripción", placeholder="Describe tu promoción...")
        price = st.number_input("Precio ($)", min_value=0.0, max_value=max_price, step=0.1, value=0.0)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Promoción"):
            promotion = PromotionSpace(
                uid=f"promo_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                user=user,
                category=category,
                subcategory=subcategory,
                description=description,
                timestamp=datetime.now(),
                ubicacion=location,
                price=price,
                parameters={'created_by': user.alias},
                variables={'visibility_range': user.notification_distance}
            )
            promotion.save()
            Notification.objects.create(
                user=user,
                type='promotion_created',
                message=f"Tu promoción '{description[:50]}...' ha sido creada.",
                priority='media'
            )
            st.success("Promoción creada correctamente.")

        # Sección: Explorar Espacios de Promoción
        st.header("Explorar Espacios de Promoción")
        promotions = PromotionSpace.objects.all().order_by('-timestamp')
        if promotions.exists():
            selected_promotion = st.selectbox("Selecciona una Promoción", [f"{p.category} - {p.subcategory} (${p.price})" for p in promotions])
            if selected_promotion:
                promotion = next(p for p in promotions if f"{p.category} - {p.subcategory} (${p.price})" == selected_promotion)
                st.write(f"**Usuario:** {promotion.user.alias}")
                st.write(f"**Descripción:** {promotion.description}")
                st.write(f"**Ubicación:** ({promotion.ubicacion.y}, {promotion.ubicacion.x})")
                st.write(f"**Precio:** ${promotion.price}")

                # Mapa
                map_data = [{'lat': promotion.ubicacion.y, 'lon': promotion.ubicacion.x}]
                st.map(map_data, zoom=10)

                # Visualización en AR/VR
                if st.button("Ver en AR"):
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded>
                        <a-text value="Promoción: {promotion.category} - {promotion.subcategory}" position="0 1.5 -5" align="center"></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)

                if st.button("Ver en VR"):
                    st.components.v1.html(f"""
                    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                    <a-scene embedded>
                        <a-sky src="https://example.com/vr_sky.jpg"></a-sky>
                        <a-text value="Promoción: {promotion.category} - {promotion.subcategory}" position="0 1.5 -5" align="center"></a-text>
                        <a-camera position="0 1.6 0"></a-camera>
                    </a-scene>
                    """, height=500)

                # Comprar Promoción
                if promotion.price > 0 and st.button(f"Comprar - ${promotion.price}"):
                    Transaction.objects.create(
                        user=user,
                        content_type='promotion_space',
                        content_id=promotion.uid,
                        amount=promotion.price,
                        commission=promotion.price * (commission_rate / 100)
                    )
                    Notification.objects.create(
                        user=promotion.user,
                        type='purchase',
                        message=f"{user.alias} compró tu promoción: {promotion.description[:50]}...",
                        priority='media'
                    )
                    st.success("Promoción comprada exitosamente.")
        else:
            st.info("No hay espacios de promoción disponibles.")

    return render(request, 'promotion_spaces.html')