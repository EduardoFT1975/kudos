/* ============================================================
   KUDOS – Scripts globales
   ============================================================ */

// Modo oscuro: toggle con guardado en backend para usuarios autenticados,
// y en localStorage para invitados.
function toggleDarkMode() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('kudos-theme', next);

    // Si el usuario está autenticado, persistirlo en el servidor
    fetch('/toggle-dark-mode/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).catch(() => {});
}

// Aplicar tema guardado en localStorage para invitados
(function applyStoredTheme() {
    const stored = localStorage.getItem('kudos-theme');
    if (stored && document.documentElement.getAttribute('data-theme') !== stored) {
        document.documentElement.setAttribute('data-theme', stored);
    }
})();

// Helper para CSRF token
function getCookie(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? decodeURIComponent(match.pop()) : '';
}

// Auto-cerrar mensajes flash tras 4 segundos
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.message').forEach(msg => {
        setTimeout(() => {
            msg.style.transition = 'opacity 0.5s';
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 500);
        }, 4000);
    });
});

// Geolocalización fácil para crear cápsulas
window.fillGeoLocation = function () {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = document.querySelector('input[name="latitud"]');
            const lon = document.querySelector('input[name="longitud"]');
            if (lat) lat.value = pos.coords.latitude.toFixed(6);
            if (lon) lon.value = pos.coords.longitude.toFixed(6);
        },
        (err) => alert('No se pudo obtener tu ubicación: ' + err.message)
    );
};
