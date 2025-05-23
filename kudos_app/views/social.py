```python
# kudos_app/views/social.py

"""
Vista para el Módulo 4: Social de Kudos.
Implementa interacciones sociales, comunidades, y eventos virtuales AR/VR.
"""

import logging
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from kudos_app.models import Capsule, User, Notification, SettingsConfig, SocialInteraction, Community
from kudos_app.views.capsule_museum import prepare_map_data
from kudos_app.utils.ar_vr_utils import add_model_to_scene, add_text_to_scene
from django.contrib import messages

# Configurar logging
logging.basicConfig(filename='/app/social.log', level=logging.INFO)

@login_required
def social_view(request):
    """
    Vista principal para explorar interacciones sociales, comunidades, y eventos AR/VR.
    """
    try:
        user = request.user
    except Exception as e:
        logging.error(f"Error al autenticar usuario: {e}")
        return render(request, 'error.html', {'message': 'Error de autenticación'})

    # Configuración desde SettingsConfig
    social_config = SettingsConfig.objects.get_or_create(key="social_settings")[0]
    default_themes = social_config.parameters.get("default_themes", ["Colaboración", "Comunidad", "Intereses Comunes"])
    vr_sky = social_config.parameters.get("default_sky", "https://example.com/social_sky.jpg")

    # Obtener comunidades
    communities = Community.objects.filter(is_active=True).order_by('-member_count')[:10]

    # Obtener interacciones sociales del usuario
    interactions = SocialInteraction.objects.filter(user=user).order_by('-timestamp')[:20]
    followers = SocialInteraction.objects.filter(target_user=user, interaction_type='follow').count()
    following = SocialInteraction.objects.filter(user=user, interaction_type='follow').count()

    # Obtener cápsulas compartidas en comunidades
    community_capsules = Capsule.objects.filter(
        parameters__community_id__isnull=False,
        privacy='publico'
    ).order_by('-parameters__merits')[:10]

    # Mapa de cápsulas sociales
    map_data = prepare_map_data(community_capsules)

    # Generar evento virtual AR/VR
    social_scene = generate_social_event(community_capsules[:5], vr_sky)

    # Manejar acciones
    if request.method == 'POST':
        action = request.POST.get('action')

        try:
            if action == 'follow_user':
                target_user_id = request.POST.get('target_user_id')
                target_user = User.objects.get(id=target_user_id)
                SocialInteraction.objects.create(
                    user=user,
                    target_user=target_user,
                    interaction_type='follow',
                    status='approved',
                    timestamp=timezone.now()
                )
                Notification.objects.create(
                    user=target_user,
                    type='new_follower',
                    message=f"{user.alias} te ha seguido.",
                    priority='media'
                )
                messages.success(request, f"Ahora sigues a {target_user.alias}.")

            elif action == 'comment_capsule':
                capsule_uid = request.POST.get('capsule_uid')
                comment_text = request.POST.get('comment_text')
                capsule = Capsule.objects.get(uid=capsule_uid)
                SocialInteraction.objects.create(
                    user=user,
                    capsule=capsule,
                    interaction_type='comment',
                    content=comment_text,
                    status='pending',
                    timestamp=timezone.now()
                )
                Notification.objects.create(
                    user=capsule.usuario,
                    type='new_comment',
                    message=f"{user.alias} comentó en tu cápsula: {comment_text[:50]}...",
                    priority='media'
                )
                messages.success(request, "Comentario enviado, pendiente de moderación.")

            elif action == 'join_community':
                community_id = request.POST.get('community_id')
                community = Community.objects.get(id=community_id)
                community.members.add(user)
                community.member_count = community.members.count()
                community.save()
                Notification.objects.create(
                    user=user,
                    type='community_joined',
                    message=f"Te has unido a la comunidad '{community.name}'.",
                    priority='media'
                )
                messages.success(request, f"Te has unido a {community.name}.")

            elif action == 'create_community':
                name = request.POST.get('community_name')
                themes = request.POST.get('community_themes', '').split(',')
                description = request.POST.get('community_description')
                community = Community.objects.create(
                    name=name,
                    creator=user,
                    description=description,
                    themes=themes,
                    is_active=True,
                    member_count=1
                )
                community.members.add(user)
                Notification.objects.create(
                    user=user,
                    type='community_created',
                    message=f"Has creado la comunidad '{name}'.",
                    priority='alta'
                )
                messages.success(request, f"Comunidad '{name}' creada.")

        except (User.DoesNotExist, Capsule.DoesNotExist, Community.DoesNotExist) as e:
            logging.error(f"Error en acción social: {e}")
            messages.error(request, "Recurso no encontrado.")
        except Exception as e:
            logging.error(f"Error al procesar acción: {e}")
            messages.error(request, f"Error: {e}")

        return redirect('social')

    context = {
        'user': user,
        'communities': communities,
        'interactions': interactions,
        'followers': followers,
        'following': following,
        'community_capsules': community_capsules,
        'map_data': map_data,
        'social_scene': social_scene,
        'themes': default_themes
    }

    return render(request, 'social.html', context)

def generate_social_event(capsules, sky_url):
    """
    Genera un evento virtual AR/VR para interacciones sociales.
    """
    narrative = "Únete a la comunidad en este evento virtual colaborativo."

    # Generar posiciones para las cápsulas
    positions = []
    for i in range(len(capsules)):
        x = (i % 3) * 2 - 2
        z = (i // 3) * 2 - 2
        positions.append(f"{x} 1.5 {z}")

    # Construir la escena AR/VR con A-Frame
    capsule_entities = ""
    for capsule, position in zip(capsules, positions):
        capsule_entities += f"""
        <a-entity
            position="{position}"
            scale="0.3 0.3 0.3"
            class="clickable"
            data-info="{capsule.contenido}"
        >
            <a-text
                value="{capsule.contenido[:30]}..."
                position="0 0.5 0"
                align="center"
                color="white"
                width="2"
            ></a-text>
        </a-entity>
        """

    # Añadir modelo de espacio comunitario
    main_model = add_model_to_scene(
        "https://example.com/community_space.glb",
        position="0 0 -10",
        scale="1.5 1.5 1.5",
        rotation_animation=False
    )

    # Añadir luces, partículas y sonido
    ambient_light = '<a-light type="ambient" color="#FFF" intensity="0.5"></a-light>'
    directional_light = '<a-light type="directional" color="#FFD700" intensity="0.7" position="0 1 1"></a-light>'
    particles = '<a-entity particle-system="preset: dust; color: #FFD700; particleCount: 100; velocityValue: 0 0 -5"></a-entity>'
    ambient_sound = '<a-entity sound="src: https://example.com/community_ambient.mp3; autoplay: true; loop: true; volume: 0.3;"></a-entity>'

    # Escena completa
    social_scene = f"""
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <a-scene embedded vr-mode-ui="enabled: true">
        <a-sky src="{sky_url}"></a-sky>
        <a-text
            value="{narrative}"
            position="0 2.5 -5"
            align="center"
            color="white"
            width="4"
        ></a-text>
        {main_model}
        {capsule_entities}
        {ambient_light}
        {directional_light}
        {particles}
        {ambient_sound}
        <a-camera position="0 1.6 0"></a-camera>
    </a-scene>
    <script>
        document.querySelectorAll('.clickable').forEach(function(entity) {{
            entity.addEventListener('click', function() {{
                alert(this.getAttribute('data-info'));
            }});
        }});
    </script>
    """
    return social_scene
```