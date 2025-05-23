# kudos_app/views/control.py

"""
Vista para el panel de control avanzado de administradores en Kudos.
Incluye un asistente personal basado en IA, piloto automático para gestionar el proyecto,
gestión de usuarios, microtransacciones, reglas automáticas y gestión de APIs.
Restringido a administradores autorizados.
"""

import os
import sys

# Define el directorio base (C:\Users\efert\kudos_project)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Agrega el directorio base a sys.path
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Configura Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kudos_project.settings')
import django
try:
    django.setup()
except Exception as e:
    print(f"Error al configurar Django: {e}")
    sys.exit(1)

# Importa modelos y dependencias después de configurar Django
from kudos_app.models import User, SettingsConfig, Notification, Capsule, AutomationConfig, AdminAccess, Transaction
import streamlit as st
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from kudos_app.views.admin_assistant import admin_assistant
from openai import OpenAI
import subprocess
from datetime import datetime
import uuid
from django.utils import timezone

# Wrapper para admin_assistant en Streamlit
def admin_assistant_wrapper(mock_request):
    try:
        response = admin_assistant(mock_request)
        if response and hasattr(response, 'content'):
            st.write(response.content.decode())
        elif response is None:
            pass
        elif isinstance(response, str):
            st.error(f"Respuesta del asistente: {response}")
            return response
        else:
            st.error("Respuesta inesperada del asistente.")
    except Exception as e:
        st.error(f"Error al cargar el asistente personal: {e}")
    return None

# Función principal para Streamlit
def render_streamlit_control():
    st.title("Panel de Control Avanzado - Kudos")

    from openai import OpenAI
    import httpx
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url="https://api.openai.com/v1",
        http_client=httpx.Client()
    )

    # Usa un usuario real en lugar de simular uno
    try:
        user = User.objects.get(uid='admin-test-uid-2')
    except User.DoesNotExist:
        st.error("Usuario de prueba no encontrado. Por favor crea un usuario con UID 'admin-test-uid-2'.")
        return

    user_alias = user.alias
    user_role = user.role

    # Configuración general
    try:
        # Configuración de control
        control_config, created = SettingsConfig.objects.get_or_create(
            key="control_settings",
            defaults={'value': 0}
        )
    except Exception as e:
        st.error(f"Error al obtener configuraciones de control: {e}")
        return

    try:
        # Configuración de automatización
        automation_config, created = SettingsConfig.objects.get_or_create(
            key="automation_settings",
            defaults={'value': 0}
        )
    except Exception as e:
        st.error(f"Error al obtener configuraciones de automatización: {e}")
        return

    # Verificar permisos
    st.header(f"Bienvenido, {user_alias}")
    if user_role not in ['founder', 'admin']:
        st.error("Acceso denegado. Solo administradores autorizados pueden usar este panel.")
        return

    # Sección: Asistente Personal
    st.header("Asistente Personal")
    st.write("Interactúa con el asistente para gestionar tareas administrativas.")
    
    class MockRequest:
        def __init__(self):
            self.user = user  # Usa el usuario real
            self.META = {}
    
    mock_request = MockRequest()
    admin_assistant_wrapper(mock_request)

    # Sección: Gestión de Usuarios
    st.header("Gestión de Usuarios")
    st.write("Administra los usuarios del sistema.")

    # Listar usuarios
    st.subheader("Lista de Usuarios")
    users = User.objects.all()
    for u in users:
        st.write(f"UID: {u.uid}, Alias: {u.alias}, Email: {u.email}, Rol: {u.role}, Activo: {u.is_active}")
        col1, col2 = st.columns(2)
        with col1:
            if st.button(f"Editar {u.alias}", key=f"edit_{u.uid}"):
                st.session_state['edit_user'] = u.uid
        with col2:
            if st.button(f"Eliminar {u.alias}", key=f"delete_{u.uid}"):
                u.delete()
                st.success(f"Usuario {u.alias} eliminado correctamente.")
                st.rerun()

    # Editar usuario
    if 'edit_user' in st.session_state:
        edit_user = User.objects.get(uid=st.session_state['edit_user'])
        st.subheader(f"Editar Usuario: {edit_user.alias}")
        alias = st.text_input("Alias", value=edit_user.alias)
        email = st.text_input("Email", value=edit_user.email or "")
        role = st.selectbox("Rol", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'], index=['user', 'seller', 'teacher', 'prosumidor', 'founder'].index(edit_user.role))
        is_active = st.checkbox("Activo", value=edit_user.is_active)
        if st.button("Guardar Cambios"):
            edit_user.alias = alias
            edit_user.email = email
            edit_user.role = role
            edit_user.is_active = is_active
            edit_user.save()
            st.success("Usuario actualizado correctamente.")
            del st.session_state['edit_user']
            st.rerun()

    # Crear nuevo usuario
    st.subheader("Crear Nuevo Usuario")
    new_uid = st.text_input("UID del nuevo usuario")
    new_alias = st.text_input("Alias del nuevo usuario")
    new_email = st.text_input("Email del nuevo usuario")
    new_password = st.text_input("Contraseña del nuevo usuario", type="password")
    new_role = st.selectbox("Rol del nuevo usuario", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'])
    new_is_active = st.checkbox("Activo (nuevo usuario)", value=True)
    if st.button("Crear Usuario"):
        try:
            User.objects.create_user(
                uid=new_uid,
                alias=new_alias,
                email=new_email,
                password=new_password,
                role=new_role,
                is_active=new_is_active
            )
            st.success(f"Usuario {new_alias} creado correctamente.")
            st.rerun()
        except Exception as e:
            st.error(f"Error al crear usuario: {e}")

    # Sección: Gestión de Microtransacciones
    st.header("Gestión de Microtransacciones")
    st.write("Simula transacciones de cápsulas de comercio y gestiona comisiones.")

    # Listar cápsulas de comercio
    st.subheader("Cápsulas de Comercio")
    commerce_capsules = Capsule.objects.filter(modo='comercio')[:10]  # Mostrar solo las primeras 10
    if not commerce_capsules:
        st.warning("No se encontraron cápsulas de comercio.")
    else:
        for capsule in commerce_capsules:
            st.write(f"UID: {capsule.uid}, Contenido: {capsule.contenido}, Precio: ${capsule.price}")
            if st.button(f"Simular Compra - {capsule.uid}", key=f"buy_{capsule.uid}"):
                try:
                    buyer = User.objects.get(uid='test-user-3')  # Comprador simulado
                    commission = capsule.price * 0.05  # Comisión del 5%
                    Transaction.objects.create(
                        uid=f"trans_{uuid.uuid4()}",
                        user=buyer,
                        content_type="capsule",
                        content_id=capsule.uid,
                        amount=capsule.price,
                        commission=commission,
                        timestamp=timezone.now()
                    )
                    st.success(f"Transacción simulada: Compra de '{capsule.contenido}' por ${capsule.price}. Comisión: ${commission}.")
                except User.DoesNotExist:
                    st.error("Usuario 'test-user-3' no encontrado. Por favor crea este usuario para simular transacciones.")

    # Sección: Gestión de APIs
    st.header("Gestión de APIs")
    st.write("Configura conexiones con APIs externas para integrar datos.")

    # Lista de APIs simuladas
    st.subheader("Configuración de APIs")
    api_sources = ['Wikipedia', 'OpenStreetMap']  # Ejemplo de APIs
    for api in api_sources:
        st.write(f"API: {api}")
        col1, col2, col3 = st.columns(3)
        with col1:
            active = st.checkbox(f"Activo - {api}", value=False, key=f"active_{api}")
        with col2:
            update_frequency = st.selectbox(f"Frecuencia de Actualización - {api}", options=['Diaria', 'Semanal'], key=f"freq_{api}")
        with col3:
            if st.button(f"Guardar - {api}", key=f"save_{api}"):
                SettingsConfig.objects.update_or_create(
                    key=f"api_{api.lower()}",
                    defaults={
                        'parameters': {
                            'active': active,
                            'update_frequency': update_frequency
                        }
                    }
                )
                st.success(f"Configuración de API '{api}' guardada.")

    # Sección: Piloto Automático
    st.header("Piloto Automático")
    st.write("Configura y monitorea las tareas automatizadas del sistema.")
    try:
        result = subprocess.run(["python", "manage.py", "scheduler", "--dry-run"], capture_output=True, text=True)
        st.write("Estado de las tareas programadas:")
        st.text(result.stdout)
    except Exception as e:
        st.error(f"Error al verificar el estado de las tareas: {e}")

    # Configuración de automatización
    st.subheader("Configuración de Automatización")
    automation_level = st.slider("Nivel de Automatización (%)", min_value=0, max_value=100, value=automation_config.value)
    support_automation = st.checkbox("Automatización de Soporte", value=True)
    moderation_automation = st.checkbox("Automatización de Moderación", value=True)
    frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_automation")
    
    # Reglas automáticas
    st.subheader("Reglas Automáticas")
    auto_approve_commerce = st.checkbox("Aprobar automáticamente cápsulas de comercio", value=False)
    max_price = st.number_input("Precio máximo para aprobación automática ($)", min_value=0.0, value=500.0, step=10.0)
    
    if st.button("Guardar Configuración de Automatización"):
        try:
            automation_config.value = automation_level
            automation_config.parameters = {
                'auto_approve_commerce': auto_approve_commerce,
                'max_price': max_price
            }
            automation_config.save()
            st.success("Configuración de automatización guardada con éxito.")
        except Exception as e:
            st.error(f"Error al guardar configuración de automatización: {e}")

    # Aplicar reglas automáticas
    if auto_approve_commerce:
        commerce_capsules = Capsule.objects.filter(modo='comercio')
        approved_count = 0
        for capsule in commerce_capsules:
            if capsule.price <= max_price:
                capsule_parameters = capsule.parameters or {}
                capsule_parameters['auto_approved'] = True
                capsule.parameters = capsule_parameters
                capsule.save()
                approved_count += 1
        st.info(f"Se aplicaron reglas automáticas a {approved_count} cápsulas de comercio.")
    else:
        st.info("Reglas automáticas no activadas.")

    # Sección: Control de Frecuencia de Procesamiento
    st.subheader("Control de Frecuencia de Procesamiento")
    frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_control")
    if st.button("Guardar"):
        try:
            config, created = SettingsConfig.objects.get_or_create(
                key="processing_frequency",
                defaults={'value': 0}
            )
            config.value = frequency
            config.save()
            st.success("Frecuencia actualizada!")
        except Exception as e:
            st.error(f"Error al guardar frecuencia: {e}")

    # Sección: Estadísticas
    st.subheader("Estadísticas")
    try:
        total_users = User.objects.count()
        total_notifications = Notification.objects.count()
        total_capsules = Capsule.objects.count()
        st.write(f"Total de Usuarios: {total_users}")
        st.write(f"Total de Notificaciones: {total_notifications}")
        st.write(f"Total de Cápsulas: {total_capsules}")
    except Exception as e:
        st.error(f"Error al obtener estadísticas: {e}")

@login_required
def control_django(request):
    """
    Vista para el panel de control avanzado de Kudos en modo Django.
    Gestiona automatización, descentralización, infraestructura e innovación tecnológica.
    """
    if not request.user.is_staff:
        return render(request, '403.html')

    try:
        admin_access = AdminAccess.objects.filter(user=request.user).first()
        if not admin_access or admin_access.access_level < 1:
            return render(request, "control.html", {"error": "Acceso denegado"})
    except Exception as e:
        return render(request, "control.html", {"error": f"Error al verificar acceso: {e}"})

    try:
        config, created = AutomationConfig.objects.get_or_create(id=1)
        if request.method == "POST":
            config.automation_level = int(request.POST.get("automation_level", 10))
            config.support_automation = "support_automation" in request.POST
            config.support_threshold = float(request.POST.get("support_threshold", 0.5))
            config.moderation_automation = "moderation_automation" in request.POST
            config.moderation_threshold = float(request.POST.get("moderation_threshold", 0.2))
            config.moderation_review_frequency = request.POST.get("moderation_review_frequency", "daily")
            config.content_creation_frequency = request.POST.get("content_creation_frequency", "daily")
            config.content_creation_limit = int(request.POST.get("content_creation_limit", 100))
            config.storage_network = request.POST.get("storage_network", "ipfs")
            config.storage_limit_per_user = int(request.POST.get("storage_limit_per_user", 1000))
            config.processing_network = request.POST.get("processing_network", "golem")
            config.max_task_cost = float(request.POST.get("max_task_cost", 1.0))
            config.webgpu_enabled = "webgpu_enabled" in request.POST
            config.compression_level = int(request.POST.get("compression_level", 5))
            config.energy_renewable_percentage = int(request.POST.get("energy_renewable_percentage", 50))
            config.energy_reduction_goal = int(request.POST.get("energy_reduction_goal", 10))
            config.save()
            messages.success(request, "Configuración guardada con éxito.")
            return redirect("control")

        context = {
            "total_capsules": Capsule.objects.count(),
            "total_users": User.objects.count(),
            "simulated_capsules": Capsule.objects.filter(is_simulated=True).count(),
            "total_notifications": Notification.objects.count(),
            "access_level": admin_access.access_level,
            "config": config
        }
        return render(request, "control.html", context)
    except Exception as e:
        return render(request, "control.html", {"error": f"Error: {e}"})

if __name__ == "__main__":
    render_streamlit_control()