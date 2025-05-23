const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

console.log('Starting Express server');

// Servir archivos estáticos (como A-Frame) desde node_modules
app.use('/aframe', express.static(path.join(__dirname, 'node_modules/aframe/dist'), {
  setHeaders: (res, filepath) => {
    console.log(`Serving static file: ${filepath}`);
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Ruta principal para servir una escena AR/VR
app.get('/', async (req, res) => {
  console.log('Request received for /');
  let skyColor = '#ECECEC'; // Color por defecto del cielo
  let temperature = 'Unknown'; // Temperatura por defecto

  try {
    // Obtener datos climáticos de OpenWeatherMap
    const apiKey = 'aea902bdeb7284a930fe603388316ca7';
    const city = 'Madrid';
    const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    console.log('Fetching weather data from:', weatherUrl);
    const weatherResponse = await fetch(weatherUrl);
    console.log('Weather API response status:', weatherResponse.status);
    const weatherData = await weatherResponse.json();
    console.log('Weather API response data:', weatherData);

    if (weatherData.main && weatherData.main.temp) {
      const temp = weatherData.main.temp;
      console.log(`Temperature in ${city}: ${temp}°C`);
      temperature = `${temp}°C`; // Guardar la temperatura para mostrarla

      // Ajustar el color del cielo según la temperatura
      if (temp > 30) {
        skyColor = '#FF6347'; // Rojizo para temperaturas altas
      } else if (temp >= 10 && temp <= 30) {
        skyColor = '#87CEEB'; // Azul claro para temperaturas moderadas
      } else {
        skyColor = '#4682B4'; // Gris oscuro para temperaturas bajas
      }
    } else {
      console.error('Error fetching weather data - Invalid response:', weatherData);
      console.log('Using default sky color:', skyColor);
    }
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    console.log('Using default sky color:', skyColor);
  }

  try {
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kudos AR/VR Scene</title>
          <!-- Cargar A-Frame desde el directorio local -->
          <script src="/aframe/aframe-v1.7.1.min.js"></script>
          <!-- Favicon simple para evitar el error 404 -->
          <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuNWWFMmZwAAABWUlEQVQ4T62TsUoDURSFvzOzY2NjJ1gKNrY2doKtYCNY2Am2go1gI1jYC7gIdoIFhYWNnYGIIre9Mzv3zCwczA+9n/n/zZwF5IAFeAK+0YBPNeDfADbgugLuJaQGvhGDbwC4gG/Afmodno/rUbYCa6m1eD6uR9kKrKXW4vm4HmUrsJZaS+fjetStwFpqLZ6P61G2AmuptXg+rkfZCu4l1uL5uB5lK7CWWovn43qUrcBaai2ej+tRtgLrqbV4Pq5H2QqsJdbi+bgmZSuwllqL5+N6lK3AWmotn4/rUbaCu9RaPx/Wo2wF1tJrcX9cjbIVWEutxX1xPcpWYC21FvXENShbgfXUWtwf16NsBdbSa3F/XI+yFVhLrcX9cjbIVWEutxX1xPcpWYC21FvXENShbgfXUWtwf16NsBdbSa3F/XI+yFVhLrcX9cjbIVWEutxX1xPcpWYC21FvXENShbgfXUWtwf16NsBdbSa3F/XI+yFVhLrcX9cjbIVWEutxX1xPcpWYAAA==">
        </head>
        <body>
          <h1>Kudos AR/VR Scene</h1>
          <p>Use WASD to move, mouse to look around. Click on objects to change their color (saved for your next visit). Press ESC to exit fullscreen.</p>
          <p>Current temperature in Madrid: ${temperature}</p>
          <a-scene embedded>
            <!-- Cámara con controles de movimiento -->
            <a-entity id="camera" position="0 1.6 0" camera look-controls wasd-controls>
              <a-cursor></a-cursor>
            </a-entity>
            <a-box id="box" position="0 1 -3" rotation="0 45 0" color="#4CC3D9" clickable rotate-forever>
              <a-animation attribute="rotation" from="0 45 0" to="0 405 0" dur="10000" repeat="indefinite" easing="linear"></a-animation>
            </a-box>
            <a-sphere id="sphere" position="0 1.25 -5" radius="1.25" color="#EF2D5E" clickable rotate-forever>
              <a-animation attribute="rotation" from="0 0 0" to="0 360 0" dur="8000" repeat="indefinite" easing="linear"></a-animation>
            </a-sphere>
            <a-cylinder id="cylinder" position="1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D" clickable rotate-forever>
              <a-animation attribute="rotation" from="0 0 0" to="0 360 0" dur="12000" repeat="indefinite" easing="linear"></a-animation>
            </a-cylinder>
            <a-plane position="0 0 -4" rotation="-90 0 0" width="4" height="4" color="#7BC8A4"></a-plane>
            <a-sky color="${skyColor}"></a-sky>
          </a-scene>

          <script>
            console.log('Starting script execution');
            window.onload = function() {
              console.log('A-Frame script loaded');
              if (typeof AFRAME === 'undefined') {
                console.error('A-Frame is not loaded');
              } else {
                console.log('A-Frame is loaded successfully');
                // Verificar si WebGL está soportado
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) {
                  console.error('WebGL is not supported in this browser');
                } else {
                  console.log('WebGL is supported');
                }
              }
            };

            // Componente para asegurar que las animaciones se inicien
            AFRAME.registerComponent('rotate-forever', {
              init: function () {
                console.log('Starting rotation for', this.el.id);
                const animation = this.el.querySelector('a-animation');
                if (animation) {
                  animation.setAttribute('begin', '0'); // Iniciar la animación inmediatamente
                }
              }
            });

            // Registrar un componente personalizado para manejar clics y guardar estado
            console.log('Registering clickable component');
            try {
              AFRAME.registerComponent('clickable', {
                init: function () {
                  console.log('Initializing clickable component for', this.el.id);
                  const COLORS = ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1'];
                  let currentIndex = 0;
                  const el = this.el;

                  // Cargar color guardado del almacenamiento local, si existe
                  console.log('Loading saved color for', el.id);
                  const savedColor = localStorage.getItem(el.id + '-color');
                  if (savedColor) {
                    el.setAttribute('color', savedColor);
                    currentIndex = COLORS.indexOf(savedColor);
                  }

                  // Cambiar color al hacer clic y guardar el estado
                  el.addEventListener('click', () => {
                    console.log('Click event triggered for', el.id);
                    currentIndex = (currentIndex + 1) % COLORS.length;
                    const newColor = COLORS[currentIndex];
                    el.setAttribute('color', newColor);
                    localStorage.setItem(el.id + '-color', newColor);
                    console.log('Object clicked, new color:', newColor);
                  });

                  // Efecto visual al pasar el ratón por encima
                  el.addEventListener('mouseenter', () => {
                    console.log('Mouseenter event for', el.id);
                    el.setAttribute('scale', '1.1 1.1 1.1');
                  });
                  el.addEventListener('mouseleave', () => {
                    console.log('Mouseleave event for', el.id);
                    el.setAttribute('scale', '1 1 1');
                  });
                }
              });
            } catch (error) {
              console.error('Error registering clickable component:', error);
            }
            console.log('Script execution completed');
          </script>
        </body>
      </html>
    `;
    res.status(200).send(htmlResponse);
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error sending response:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`AR/VR server running at http://localhost:${port}`);
});

app.on('error', (error) => {
  console.error('Express server error:', error);
});