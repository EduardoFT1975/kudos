import streamlit as st
import requests

st.title("Mercado Global de Kudos")

# Token de autenticación
AUTH_TOKEN = "312a8ae2d66264daf3bc1f8bbe078682abd1e9e2"

# Conectar con el servidor Django para obtener las cápsulas
try:
    response = requests.get("http://localhost:8000/marketplace/")
    data = response.json()
    capsules = data.get('capsules', [])
except Exception as e:
    capsules = []
    st.error(f"No se pudo conectar con el servidor: {str(e)}. Asegúrate de que el contenedor app esté funcionando.")

# Mostrar las cápsulas en una tabla
if capsules:
    st.write("### Cápsulas Disponibles")
    for capsule in capsules:
        st.write(f"**{capsule['contenido']}** - Precio: ${capsule['price']}")
        if st.button(f"Comprar {capsule['contenido']}", key=capsule['uid']):
            # Enviar solicitud PUT para comprar la cápsula con el token de autenticación
            try:
                headers = {
                    'Authorization': f'Token {AUTH_TOKEN}',
                    'Content-Type': 'application/json'
                }
                buy_response = requests.put(
                    "http://localhost:8000/marketplace/",
                    json={"capsule_uid": capsule['uid']},
                    headers=headers
                )
                if buy_response.status_code == 200:
                    st.success(f"¡Has comprado '{capsule['contenido']}' exitosamente!")
                    # Recargar la página para actualizar la lista de cápsulas
                    st.experimental_rerun()
                else:
                    st.error(f"Error al comprar la cápsula: {buy_response.json().get('error', 'Desconocido')}")
            except Exception as e:
                st.error(f"Error al intentar comprar: {str(e)}")
else:
    st.write("No hay cápsulas disponibles en este momento.")