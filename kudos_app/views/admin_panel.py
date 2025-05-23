# kudos_app/views/admin_panel.py

import streamlit as st
from django.shortcuts import render
from django.conf import settings
from kudos_app.models import User, AdminAccess, Transaction, SettingsConfig, Capsule, Notification
import subprocess
import uuid
from .admin_assistant import admin_assistant

def admin_panel(request):
    if isinstance(request, HttpRequest):
        user = request.user
        is_streamlit = False
    else:
        user = request.user
        is_streamlit = True

    if not user.is_staff:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores pueden usar este panel.")
        else:
            return render(request, '403.html')
        return

    if hasattr(user, 'uid'):
        admin_access = AdminAccess.objects.filter(user__uid=user.uid).first()
    else:
        admin_access = None

    if not admin_access or admin_access.access_level < 1:
        if is_streamlit:
            st.error("Acceso denegado. Solo administradores autorizados pueden usar este panel.")
        else:
            return render(request, '403.html')
        return

    if is_streamlit:
        st.title("Panel de Control Avanzado - Kudos")

        try:
            from openai import OpenAI
            import httpx
            client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url="https://api.openai.com/v1",
                http_client=httpx.Client()
            )
        except AttributeError:
            st.error("La clave API de OpenAI no está configurada. Por favor, configura OPENAI_API_KEY en el archivo .env.")
            return
        except Exception as e:
            st.error(f"Error al inicializar el cliente de OpenAI: {e}")
            return

        try:
            control_config, created = SettingsConfig.objects.get_or_create(
                key="control_settings",
                defaults={'value': 0}
            )
        except Exception as e:
            st.error(f"Error al obtener configuraciones de control: {e}")
            return

        try:
            automation_config, created = SettingsConfig.objects.get_or_create(
                key="automation_settings",
                defaults={'value': 0}
            )
        except Exception as e:
            st.error(f"Error al obtener configuraciones de automatización: {e}")
            return

        st.header(f"Bienvenido, {user.alias}")

        st.header("Asistente Personal")
        st.write("Interactúa con el asistente para gestionar tareas administrativas.")
        admin_assistant(request)

        st.header("Gestión de Usuarios")
        st.write("Administra los usuarios del sistema.")

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

        if 'edit_user' in st.session_state:
            edit_user = User.objects.get(uid=st.session_state['edit_user'])
            st.subheader(f"Editar Usuario: {edit_user.alias}")
            alias = st.text_input("Alias", value=edit_user.alias, key="edit_alias")
            email = st.text_input("Email", value=edit_user.email or "", key="edit_email")
            role = st.selectbox("Rol", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'], index=['user', 'seller', 'teacher', 'prosumidor', 'founder'].index(edit_user.role), key="edit_role")
            is_active = st.checkbox("Activo", value=edit_user.is_active, key="edit_active")
            if st.button("Guardar Cambios", key="save_user_changes"):
                edit_user.alias = alias
                edit_user.email = email
                edit_user.role = role
                edit_user.is_active = is_active
                edit_user.save()
                st.success("Usuario actualizado correctamente.")
                del st.session_state['edit_user']
                st.rerun()

        st.subheader("Crear Nuevo Usuario")
        new_uid = st.text_input("UID del nuevo usuario", key="new_uid")
        new_alias = st.text_input("Alias del nuevo usuario", key="new_alias")
        new_email = st.text_input("Email del nuevo usuario", key="new_email")
        new_password = st.text_input("Contraseña del nuevo usuario", type="password", key="new_password")
        new_role = st.selectbox("Rol del nuevo usuario", options=['user', 'seller', 'teacher', 'prosumidor', 'founder'], key="new_role")
        new_is_active = st.checkbox("Activo (nuevo usuario)", value=True, key="new_active")
        if st.button("Crear Usuario", key="create_user"):
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

        st.header("Gestión de Microtransacciones")
        st.write("Simula transacciones de cápsulas de comercio y gestiona comisiones.")

        st.subheader("Cápsulas de Comercio")
        commerce_capsules = Capsule.objects.filter(modo='comercio')[:10]
        if not commerce_capsules:
            st.warning("No se encontraron cápsulas de comercio.")
        else:
            for capsule in commerce_capsules:
                st.write(f"UID: {capsule.uid}, Contenido: {capsule.contenido}, Precio: ${capsule.price}")
                if st.button(f"Simular Compra - {capsule.uid}", key=f"buy_{capsule.uid}"):
                    try:
                        buyer = User.objects.get(uid='test-user-3')
                        commission = capsule.price * 0.05
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

        st.header("Gestión de APIs")
        st.write("Configura conexiones con APIs externas para integrar datos.")

        st.subheader("Configuración de APIs")
        api_sources = ['Wikipedia', 'OpenStreetMap']
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

        st.header("Piloto Automático")
        st.write("Configura y monitorea las tareas automatizadas del sistema.")
        try:
            result = subprocess.run(["python", "manage.py", "scheduler", "--dry-run"], capture_output=True, text=True)
            st.write("Estado de las tareas programadas:")
            st.text(result.stdout)
        except Exception as e:
            st.error(f"Error al verificar el estado de las tareas: {e}")

        st.subheader("Configuración de Automatización")
        automation_level = st.slider("Nivel de Automatización (%)", min_value=0, max_value=100, value=automation_config.value, key="automation_level")
        support_automation = st.checkbox("Automatización de Soporte", value=True, key="support_automation")
        moderation_automation = st.checkbox("Automatización de Moderación", value=True, key="moderation_automation")
        frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_automation")

        st.subheader("Reglas Automáticas")
        auto_approve_commerce = st.checkbox("Aprobar automáticamente cápsulas de comercio", value=False, key="auto_approve_commerce")
        max_price = st.number_input("Precio máximo para aprobación automática ($)", min_value=0.0, value=500.0, step=10.0, key="max_price")

        if st.button("Guardar Configuración de Automatización", key="save_automation"):
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

        st.subheader("Control de Frecuencia de Procesamiento")
        frequency = st.slider("Frecuencia de Procesamiento (horas)", min_value=1, max_value=24, value=12, key="frequency_control")
        if st.button("Guardar", key="save_frequency"):
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
    else:
        return render(request, 'control.html')