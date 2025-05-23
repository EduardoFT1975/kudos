// static/js/scripts.js

/**
 * Scripts personalizados para Kudos.
 * Maneja interacciones dinámicas y mejoras en la UI.
 * Incluye soporte para A-Frame para escenas AR/VR.
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Animaciones para los marcadores del mapa
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    markers.forEach(marker => {
        marker.addEventListener('mouseover', () => {
            marker.style.animation = 'pulse 1s infinite';
        });
        marker.addEventListener('mouseout', () => {
            marker.style.animation = 'pulse 2s infinite'; // Restaurar animación por defecto
        });
    });

    // Animaciones para las tarjetas de cápsulas
    const capsuleCards = document.querySelectorAll('.capsule-card');
    capsuleCards.forEach(card => {
        card.addEventListener('mouseover', () => {
            card.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseout', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Mejorar escenas AR/VR después de cargar el DOM
    enhanceARVRScenes();
});

// Función para mostrar notificaciones en la UI
function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.style.opacity = '0';
        setTimeout(() => notificationDiv.remove(), 500);
    }, 3000);

    // Estilo dinámico
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.top = '20px';
    notificationDiv.style.right = '20px';
    notificationDiv.style.zIndex = '1000';
    notificationDiv.style.transition = 'opacity 0.5s';
}

// Mejorar escenas AR/VR
function enhanceARVRScenes() {
    const scenes = document.querySelectorAll('a-scene');
    scenes.forEach(scene => {
        scene.addEventListener('loaded', () => {
            console.log('Escena AR/VR cargada');
            // Añadir efectos dinámicos, como luces y partículas
            const light = document.createElement('a-light');
            light.setAttribute('type', 'ambient');
            light.setAttribute('color', '#FFF');
            light.setAttribute('intensity', '0.5');
            scene.appendChild(light);

            const directionalLight = document.createElement('a-light');
            directionalLight.setAttribute('type', 'directional');
            directionalLight.setAttribute('color', '#FFD700');
            directionalLight.setAttribute('intensity', '0.7');
            directionalLight.setAttribute('position', '0 1 1');
            scene.appendChild(directionalLight);

            // Añadir partículas para un efecto inmersivo
            const particles = document.createElement('a-entity');
            particles.setAttribute('particle-system', 'preset: dust; color: #FFD700; particleCount: 200; velocityValue: 0 0 -5');
            scene.appendChild(particles);
        });
    });
}