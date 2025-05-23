# kudos_app/views/virtual_operations.py

"""
Vista para gestionar operaciones virtuales transformadas con AR/VR en Kudos.
Permite a los prosumidores crear y participar en experiencias inmersivas.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, VirtualOperation, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime

def virtual_operations(request):
    """
    Vista para gestionar operaciones virtuales transformadas con AR/VR.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Operaciones Virtuales en Kudos")
        st.write("Crea y explora experiencias inmersivas con AR/VR.")

        # Configuración desde SettingsConfig
        vr_config = SettingsConfig.objects.get_or_create(key="virtual_operations_settings")[0]
        operation_types = vr_config.parameters.get("operation_types", ["Tour Virtual", "Clase", "Evento", "Simulación"])
        max_price = vr_config.variables.get("max_price", 1000.0)
        commission_rate = vr_config.variables.get("commission_rate", 5.0)

        # Sección: Crear Operación Virtual
        st.header("Crear Operación Virtual")
        st.write("Comparte una experiencia inmersiva con la comunidad.")
        operation_type = st.selectbox("Tipo de Operación", operation_types)
        title = st.text_input("Título", placeholder="Ejemplo: Tour Virtual por Roma")
        description = st.text_area("Descripción", placeholder="Describe tu operación virtual...")
        price = st.number_input("Precio ($)", min_value=0.0, max_value=max_price, step=0.1, value=0.0)
        city = st.text_input("Ciudad", value="Roma" if user.ubicacion else "")
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Crear Operación Virtual"):
            operation = VirtualOperation(
                uid=f"vr_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                user=user,
                operation_type=operation_type,
                title=title,
                description=description,
                price=price,
                location=location,
                city=city,
                timestamp=datetime.now(),
                parameters={'created_by': user.alias},
                variables={'visibility_range': user.notification_distance}
            )
            operation.save()
            Notification.objects.create(
                user=user,
                type='vr_created',
                message=f"Tu operación virtual '{title}' ha sido creada.",
                priority='media'
            )
            st.success("Operación virtual creada.")

        # Sección: Explorar Operaciones Virtuales
        st.header("Explorar Operaciones Virtuales")
        operations = VirtualOperation.objects.all().order_by('-timestamp')
        if operations.exists():
            selected_operation = st.selectbox("Selecciona una Operación", [f"{op.operation_type}: {op.title} (${op.price})" for op in operations])
            if selected_operation:
                operation = next(op for op in operations if f"{op.operation_type}: {op.title} (${op.price})" == selected_operation)
                st.write(f"**Usuario:** {operation.user.alias}")
                st.write(f"**Descripción:** {operation.description}")
                st.write(f"**Ciudad:** {operation.city}")
                st.write(f"**Ubicación:** ({operation.location.y}, {operation.location.x})")
                st.write(f"**Precio:** ${operation.price}")

                # Mapa
                map_data = [{'lat': operation.location.y, 'lon': operation.location.x}]
                st.map(map_data, zoom=10)

                # Visualización en AR/VR
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("Ver en AR"):
                        st.components.v1.html(f"""
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <a-scene embedded>
                            <a-text value="{operation.operation_type}: {operation.title}" position="0 1.5 -5" align="center"></a-text>
                            <a-camera position="0 1.6 0"></a-camera>
                        </a-scene>
                        """, height=500)
                with col2:
                    if st.button("Ver en VR"):
                        st.components.v1.html(f"""
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <a-scene embedded>
                            <a-sky src="https://example.com/vr_sky.jpg"></a-sky>
                            <a-text value="{operation.operation_type}: {operation.title}" position="0 1.5 -5" align="center"></a-text>
                            <a-camera position="0 1.6 0"></a-camera>
                        </a-scene>
                        """, height=500)

                # Comprar Operación
                if operation.price > 0 and st.button(f"Comprar - ${operation.price}"):
                    Transaction.objects.create(
                        user=user,
                        content_type='virtual_operation',
                        content_id=operation.uid,
                        amount=operation.price,
                        commission=operation.price * (commission_rate / 100)
                    )
                    Notification.objects.create(
                        user=operation.user,
                        type='purchase',
                        message=f"{user.alias} compró tu operación virtual: {operation.title}",
                        priority='media'
                    )
                    st.success("Operación comprada. Ahora puedes participar.")
        else:
            st.info("No hay operaciones virtuales disponibles en este momento.")

    return render(request, 'virtual_operations.html')