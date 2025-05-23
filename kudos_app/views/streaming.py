# kudos_app/views/streaming.py

"""
Vista para gestionar transmisiones en vivo en Kudos.
Permite a los prosumidores transmitir contenido y a los usuarios verlo con AR/VR y monetización.
"""

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, Capsule, Transaction, SettingsConfig, Notification
from django.contrib.gis.geos import Point
from datetime import datetime
import json

def streaming(request):
    """
    Vista para gestionar transmisiones en vivo en Kudos.
    """
    if not request.user.is_authenticated:
        return render(request, 'login_required.html')  # Requiere autenticación

    user = request.user

    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Transmisiones en Vivo en Kudos")
        st.write("Transmite o mira contenido en tiempo real con opciones de monetización.")

        # Configuración desde SettingsConfig
        stream_config = SettingsConfig.objects.get_or_create(key="streaming_settings")[0]
        commission_rate = stream_config.variables.get("commission_rate", 5.0)
        ad_frequency = stream_config.variables.get("ad_frequency", 300)  # Segundos entre anuncios
        premium_subscription_cost = stream_config.variables.get("premium_subscription_cost", 5.0)

        # Sección: Crear Transmisión
        st.header("Crear Transmisión en Vivo")
        st.write("Comparte tu contenido en tiempo real.")
        stream_title = st.text_input("Título de la Transmisión", placeholder="Ejemplo: Competencia de Ciclismo")
        stream_description = st.text_area("Descripción", placeholder="Describe tu transmisión...")
        is_premium = st.checkbox("Transmisión Premium", value=False)
        location_enabled = st.checkbox("Incluir Ubicación", value=True)
        if location_enabled and user.ubicacion:
            location = user.ubicacion
            st.write(f"Ubicación: ({location.y}, {location.x})")
        else:
            latitude = st.number_input("Latitud", value=41.9028, step=0.0001)  # Roma por defecto
            longitude = st.number_input("Longitud", value=12.4964, step=0.0001)
            location = Point(longitude, latitude)

        if st.button("Iniciar Transmisión"):
            capsule = Capsule(
                uid=f"stream_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                usuario=user,
                contenido=f"Transmisión en Vivo: {stream_title}",
                ubicacion=location,
                modo='publico' if not is_premium else 'premium',
                fecha=datetime.now().date(),
                privacy='publico',
                time_scale='dia',
                price=premium_subscription_cost if is_premium else 0.0,
                temas=['Streaming'],
                parameters={'description': stream_description, 'is_live': True},
                variables={'ad_frequency': ad_frequency}
            )
            capsule.save()
            Notification.objects.create(
                user=user,
                type='stream_started',
                message=f"Tu transmisión '{stream_title}' ha comenzado.",
                priority='media'
            )
            st.success("Transmisión iniciada. (Simulación: usa una plataforma de streaming real en producción.)")

        # Sección: Ver Transmisiones
        st.header("Ver Transmisiones en Vivo")
        streams = Capsule.objects.filter(
            parameters__is_live=True,
            privacy='publico'
        ).order_by('-timestamp')
        premium_streams = Capsule.objects.filter(
            parameters__is_live=True,
            modo='premium'
        ).order_by('-timestamp')

        if streams.exists() or premium_streams.exists():
            tab1, tab2 = st.tabs(["Transmisiones Gratuitas", "Transmisiones Premium"])
            
            with tab1:
                st.subheader("Transmisiones Gratuitas")
                for stream in streams:
                    st.write(f"**{stream.contenido}**")
                    st.write(f"**Autor:** {stream.usuario.alias}")
                    st.write(f"**Descripción:** {stream.parameters.get('description', 'Sin descripción')}")
                    st.write(f"**Ubicación:** ({stream.ubicacion.y}, {stream.ubicacion.x})")

                    # Simulación de Video
                    st.video("https://example.com/sample_video.mp4")  # Reemplazar con streaming real

                    # Visualización en AR/VR
                    if st.button(f"Ver en AR - {stream.uid}", key=f"ar_{stream.uid}"):
                        st.components.v1.html(f"""
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <a-scene embedded>
                            <a-text value="{stream.contenido}" position="0 1.5 -5" align="center"></a-text>
                            <a-camera position="0 1.6 0"></a-camera>
                        </a-scene>
                        """, height=500)

                    # Anuncios (simulados)
                    if st.button(f"Ver Anuncio - {stream.uid}", key=f"ad_{stream.uid}"):
                        st.write("Anuncio: ¡Suscríbete a Kudos Premium para una experiencia sin interrupciones!")
                        Transaction.objects.create(
                            user=user,
                            content_type='ad_view',
                            content_id=stream.uid,
                            amount=0.01,  # Ganancia por vista de anuncio
                            commission=0.0
                        )

            with tab2:
                st.subheader("Transmisiones Premium")
                for stream in premium_streams:
                    st.write(f"**{stream.contenido}**")
                    st.write(f"**Autor:** {stream.usuario.alias}")
                    st.write(f"**Descripción:** {stream.parameters.get('description', 'Sin descripción')}")
                    st.write(f"**Ubicación:** ({stream.ubicacion.y}, {stream.ubicacion.x})")
                    st.write(f"**Precio:** ${stream.price}")

                    # Compra de Suscripción
                    if st.button(f"Comprar Suscripción - ${stream.price}", key=f"buy_{stream.uid}"):
                        Transaction.objects.create(
                            user=user,
                            content_type='stream_subscription',
                            content_id=stream.uid,
                            amount=stream.price,
                            commission=stream.price * (commission_rate / 100)
                        )
                        Notification.objects.create(
                            user=stream.usuario,
                            type='purchase',
                            message=f"{user.alias} compró acceso a tu transmisión: {stream.contenido[:50]}...",
                            priority='media'
                        )
                        st.success("Suscripción comprada. Ahora puedes ver la transmisión.")
                        st.video("https://example.com/premium_video.mp4")  # Simulación

        else:
            st.info("No hay transmisiones en vivo disponibles en este momento.")

    return render(request, 'streaming.html')