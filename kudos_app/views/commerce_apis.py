# kudos_app/views/commerce_apis.py

"""
Vista para integrar APIs externas de comercio en Kudos.
Permite a los prosumidores conectar y gestionar transacciones comerciales.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime
import requests
import json

def commerce_apis(request):
    """
    Vista para integrar APIs externas de comercio en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Integración de Comercio en Kudos")
        st.write("Conecta APIs externas para gestionar transacciones comerciales directamente.")

        # Configuración desde SettingsConfig
        commerce_config = SettingsConfig.objects.get_or_create(key="commerce_apis_settings")[0]
        supported_apis = commerce_config.parameters.get("supported_apis", {
            "Stripe": {"endpoint": "https://api.stripe.com/v1", "key_field": "stripe_api_key"},
            "PayPal": {"endpoint": "https://api.paypal.com/v1", "key_field": "paypal_api_key"}
        })
        commission_rate = commerce_config.variables.get("commission_rate", 5.0)

        # Sección: Conectar API de Comercio
        st.header("Conectar API de Comercio")
        st.write("Vincula una plataforma de comercio para tus transacciones.")
        selected_api = st.selectbox("Plataforma de Comercio", list(supported_apis.keys()))
        api_key = st.text_input(f"Clave API de {selected_api}", type="password", value=commerce_config.parameters.get(supported_apis[selected_api]["key_field"], ""))

        if st.button("Conectar API"):
            commerce_config.parameters[supported_apis[selected_api]["key_field"]] = api_key
            commerce_config.save()
            Notification.objects.create(
                user=user,
                type='api_connected',
                message=f"API de {selected_api} conectada exitosamente.",
                priority='baja'
            )
            st.success(f"API de {selected_api} conectada.")

        # Sección: Crear Cápsula Comercial
        st.header("Crear Cápsula Comercial")
        st.write("Publica una cápsula vinculada a una transacción comercial.")
        content = st.text_area("Contenido", placeholder="Ejemplo: Venta de obra de arte...")
        price = st.number_input("Precio ($)", min_value=0.0, step=0.1, value=10.0)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Publicar Cápsula Comercial"):
            if api_key:
                capsule = Capsule(
                    uid=f"commerce_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    usuario=user,
                    contenido=content,
                    ubicacion=location,
                    modo='comercio',
                    fecha=datetime.now().date(),
                    privacy='publico',
                    time_scale='dia',
                    price=price,
                    temas=['Comercio'],
                    parameters={'api_platform': selected_api, 'api_key_field': supported_apis[selected_api]["key_field"]},
                    variables={'visibility_range': user.notification_distance}
                )
                capsule.save()
                Notification.objects.create(
                    user=user,
                    type='commerce_created',
                    message=f"Tu cápsula comercial '{content[:50]}...' ha sido publicada.",
                    priority='media'
                )
                st.success("Cápsula comercial publicada.")
            else:
                st.error(f"Primero conecta una API de {selected_api}.")

        # Sección: Explorar Cápsulas Comerciales
        st.header("Explorar Cápsulas Comerciales")
        commerce_capsules = Capsule.objects.filter(modo='comercio', privacy='publico').order_by('-timestamp')[:10]
        if commerce_capsules.exists():
            selected_capsule = st.selectbox("Selecciona una Cápsula", [f"{c.contenido[:50]}... (${c.price})" for c in commerce_capsules])
            capsule = commerce_capsules.get(contenido__startswith=selected_capsule[:50].rstrip('...'))
            st.write(f"**Autor:** {capsule.usuario.alias}")
            st.write(f"**Contenido:** {capsule.contenido}")
            st.write(f"**Ubicación:** ({capsule.ubicacion.y}, {capsule.ubicacion.x})")
            st.write(f"**Precio:** ${capsule.price}")

            # Mapa
            map_data = [{'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x}]
            st.map(map_data, zoom=10)

            # Comprar Cápsula
            if st.button(f"Comprar - ${capsule.price}"):
                api_platform = capsule.parameters.get('api_platform')
                api_key_field = capsule.parameters.get('api_key_field')
                api_key = commerce_config.parameters.get(api_key_field)

                if api_key:
                    # Simulación de transacción con API externa
                    transaction_data = {
                        "amount": int(capsule.price * 100),  # En centavos para Stripe
                        "currency": "usd",
                        "description": f"Compra de cápsula: {capsule.contenido[:50]}...",
                        "source": "tok_visa"  # Token simulado
                    }
                    headers = {"Authorization": f"Bearer {api_key}"}
                    endpoint = supported_apis[api_platform]["endpoint"]
                    # En producción: requests.post(f"{endpoint}/charges", data=transaction_data, headers=headers)

                    Transaction.objects.create(
                        user=user,
                        content_type='capsule',
                        content_id=capsule.uid,
                        amount=capsule.price,
                        commission=capsule.price * (commission_rate / 100)
                    )
                    Notification.objects.create(
                        user=capsule.usuario,
                        type='purchase',
                        message=f"{user.alias} compró tu cápsula: {capsule.contenido[:50]}...",
                        priority='media'
                    )
                    st.success("Compra realizada exitosamente (simulada).")
                else:
                    st.error(f"La API de {api_platform} no está configurada para este vendedor.")

        else:
            st.info("No hay cápsulas comerciales disponibles en este momento.")

    return render(request, 'commerce_apis.html')