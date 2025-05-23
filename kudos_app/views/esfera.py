# kudos_app/views/esfera.py
def render_esfera_infinita(capsules_data):
    """
    Renderiza la Esfera Infinita con Three.js para múltiples cápsulas.

    Args:
        capsules_data (list): Lista de diccionarios con datos de las cápsulas.

    Returns:
        str: Código HTML/JavaScript para renderizar la Esfera Infinita.
    """
    # Si no hay cápsulas, devolver un contenedor vacío
    if not capsules_data:
        return '<div id="esfera-infinita"></div>'

    # Escapar el contenido para evitar problemas con comillas
    capsules_js = []
    for capsule in capsules_data:
        capsule_id = capsule.get('capsule_id', 'unknown')
        time_color = capsule.get('time_color', '#ADD8E6')
        merits = capsule.get('merits', 0)
        content = capsule.get('content', 'Sin contenido').replace("'", "\\'").replace('"', '\\"')
        images = capsule.get('images', [])
        clip_url = capsule.get('clip_url', '')
        capsules_js.append({
            'capsule_id': capsule_id,
            'time_color': time_color,
            'merits': merits,
            'content': content,
            'images': images,
            'clip_url': clip_url
        })

    # Convertir la lista de cápsulas a una cadena JSON para JavaScript
    import json
    capsules_json = json.dumps(capsules_js)

    esfera_html = f"""
    <style>
        #esfera-infinita {{
            position: relative;
            width: 100%;
            height: 300px;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
        }}
    </style>
    <div id="esfera-infinita"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    <script>
        function renderEsferaInfinita(capsules) {{
            var container = document.getElementById('esfera-infinita');
            container.innerHTML = '';

            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            var renderer = new THREE.WebGLRenderer({{ alpha: true }});
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            var sphere = new THREE.Mesh(
                new THREE.SphereGeometry(1, 32, 32),
                new THREE.MeshBasicMaterial({{color: '#ADD8E6'}})
            );
            scene.add(sphere);

            // Añadir nodos para cada cápsula
            capsules.forEach(function(capsule, index) {{
                var node = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1),
                    new THREE.MeshBasicMaterial({{color: 0xFF0000}})
                );
                var angle = (index / capsules.length) * Math.PI * 2;
                node.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0);
                if (capsule.merits > 10) node.material.color.set(0xFFD700);
                scene.add(node);

                // Añadir evento de clic para mostrar información
                node.userData = capsule;
            }});

            camera.position.z = 5;

            var isDragging = false;
            var previousMousePosition = {{ x: 0, y: 0 }};

            container.addEventListener('mousedown', function(e) {{
                isDragging = true;
                previousMousePosition = {{ x: e.clientX, y: e.clientY }};
            }});

            container.addEventListener('mousemove', function(e) {{
                if (isDragging) {{
                    var deltaMove = {{
                        x: e.clientX - previousMousePosition.x,
                        y: e.clientY - previousMousePosition.y
                    }};

                    sphere.rotation.y += deltaMove.x * 0.005;
                    sphere.rotation.x += deltaMove.y * 0.005;

                    previousMousePosition = {{ x: e.clientX, y: e.clientY }};
                }}
            }});

            container.addEventListener('mouseup', function() {{
                isDragging = false;
            }});

            container.addEventListener('touchstart', function(e) {{
                isDragging = true;
                previousMousePosition = {{ x: e.touches[0].clientX, y: e.touches[0].clientY }};
            }});

            container.addEventListener('touchmove', function(e) {{
                if (isDragging) {{
                    var deltaMove = {{
                        x: e.touches[0].clientX - previousMousePosition.x,
                        y: e.touches[0].clientY - previousMousePosition.y
                    }};

                    sphere.rotation.y += deltaMove.x * 0.005;
                    sphere.rotation.x += deltaMove.y * 0.005;

                    previousMousePosition = {{ x: e.touches[0].clientX, y: e.touches[0].clientY }};
                }}
            }});

            container.addEventListener('touchend', function() {{
                isDragging = false;
            }});

            function animate() {{
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }}
            animate();

            var infoDiv = document.createElement('div');
            infoDiv.style.position = 'absolute';
            infoDiv.style.top = '10px';
            infoDiv.style.left = '10px';
            infoDiv.style.color = 'white';
            infoDiv.style.background = 'rgba(0, 0, 0, 0.5)';
            infoDiv.style.padding = '10px';
            infoDiv.innerHTML = '<p>Esfera Infinita - Selecciona una cápsula</p>';
            container.appendChild(infoDiv);
        }}

        // Renderizar la esfera con las cápsulas
        var capsules = {capsules_json};
        renderEsferaInfinita(capsules);
    </script>
    """
    return esfera_html