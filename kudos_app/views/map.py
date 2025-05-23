# kudos_app/views/map.py
from datetime import datetime
import ipfshttpclient

def prepare_map_data(capsules, user, clip_generation_enabled, time_period):
    print("Preparando datos del mapa para la época:", time_period)

    # Conectar al nodo IPFS
    try:
        client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')
    except Exception as e:
        print(f"Error al conectar con IPFS: {str(e)}")
        client = None

    # Filtrar cápsulas según la época histórica
    capsules_data = []
    for capsule in capsules:
        capsule_year = capsule.fecha.year
        if time_period == "Prehistoria (hasta 3000 a.C.)" and capsule_year > -3000:
            continue
        elif time_period == "Antigüedad (3000 a.C.-500 d.C.)" and (capsule_year < -3000 or capsule_year > 500):
            continue
        elif time_period == "Edad Media (500-1500)" and (capsule_year < 500 or capsule_year > 1500):
            continue
        elif time_period == "Renacimiento (1300-1700)" and (capsule_year < 1300 or capsule_year > 1700):
            continue
        elif time_period == "Edad Moderna (1500-1800)" and (capsule_year < 1500 or capsule_year > 1800):
            continue
        elif time_period == "Era Industrial (1800-1900)" and (capsule_year < 1800 or capsule_year > 1900):
            continue
        elif time_period == "Contemporánea (1900-Presente)" and capsule_year < 1900:
            continue

        # Simular interacciones para méritos
        interactions = 10  # Simulación de "likes" o visualizaciones
        merits = capsule.parameters['merits'] + interactions

        # Preparar datos de la cápsula para subir a IPFS
        capsule_data = {
            'contenido': capsule.contenido,
            'autor': capsule.usuario.alias,
            'fecha': capsule.fecha.strftime('%Y-%m-%d'),
            'modo': capsule.modo,
            'clima': capsule.parameters['weather']['weather'],
            'meritos': merits,
            'ubicacion': {'lat': capsule.ubicacion.y, 'lon': capsule.ubicacion.x},
            'temas': capsule.parameters['themes']
        }

        # Subir datos a IPFS
        ipfs_hash = None
        if client:
            try:
                ipfs_hash = client.add_json(capsule_data)
                print(f"Cápsula {capsule.uid} subida a IPFS con hash: {ipfs_hash}")
            except Exception as e:
                print(f"Error al subir cápsula {capsule.uid} a IPFS: {str(e)}")

        capsules_data.append({
            'lat': capsule.ubicacion.y,
            'lon': capsule.ubicacion.x,
            'popup': (
                f"<b>{capsule.contenido}</b><br>"
                f"Autor: {capsule.usuario.alias}<br>"
                f"Fecha: {capsule.fecha.strftime('%Y-%m-%d')}<br>"
                f"Modo: {capsule.modo}<br>"
                f"Clima: {capsule.parameters['weather']['weather']}<br>"
                f"Méritos: {merits}" + (f"<br>IPFS Hash: {ipfs_hash}" if ipfs_hash else "")
            ),
            'type_icon': 'triangle',
            'time_color': '#00008B',
            'size': 40,
            'merits': merits,
            'capsule_id': capsule.uid,
            'price': capsule.price,
            'content': capsule.contenido,
            'usuario': {'alias': capsule.usuario.alias},  # Cambiado a un diccionario
            'fecha': capsule.fecha,  # Aseguramos que 'fecha' esté presente como objeto datetime
            'modo': capsule.modo,
            'parameters': capsule.parameters,
            'images': [],
            'clip_url': '',
            'eco_url': '',
            'share_urls': {
                'whatsapp': f"https://api.whatsapp.com/send?text=¡Mira esta cápsula en Kudos! https://kudos.example.com/capsule/{capsule.uid}",
                'facebook': f"https://www.facebook.com/sharer/sharer.php?u=https://kudos.example.com/capsule/{capsule.uid}",
                'instagram': f"https://www.instagram.com/?url=https://kudos.example.com/capsule/{capsule.uid}",
                'tiktok': f"https://www.tiktok.com/share?url=https://kudos.example.com/capsule/{capsule.uid}",
                'youtube': f"https://www.youtube.com/share?url=https://kudos.example.com/capsule/{capsule.uid}",
            },
            'classification': {
                '1D': capsule.parameters['type'],
                '2D': f"({capsule.ubicacion.y}, {capsule.ubicacion.x})",
                '3D': capsule.fecha.strftime('%d/%m/%Y'),
                '4D': f"{merits} M",
            },
            'interests': capsule.parameters['themes'],
            'ipfs_hash': ipfs_hash,
        })

    # Generar calles virtuales dinámicas
    streets = []
    if len(capsules_data) >= 2:
        for i in range(len(capsules_data) - 1):
            start = [capsules_data[i]['lat'], capsules_data[i]['lon']]
            end = [capsules_data[i + 1]['lat'], capsules_data[i + 1]['lon']]
            streets.append({
                'start': start,
                'end': end
            })
    else:
        start = [capsules_data[0]['lat'], capsules_data[0]['lon']]
        end = [capsules_data[0]['lat'] + 0.002, capsules_data[0]['lon'] + 0.002]
        streets.append({
            'start': start,
            'end': end
        })

    # Añadir datos históricos más ricos según la época
    historical_markers = []
    if time_period == "Edad Media (500-1500)":
        historical_markers.append({
            'lat': 40.4190,
            'lon': -3.6930,
            'popup': "<b>Castillo Medieval (1200)</b><br>Ejemplo de fortaleza medieval.<br><img src='https://via.placeholder.com/150' alt='Castillo Medieval' style='width:100px;'><br>Construido durante el reinado de Alfonso VIII, este castillo fue un punto estratégico clave.",
            'icon': "🏰",
        })
    elif time_period == "Renacimiento (1300-1700)":
        historical_markers.append({
            'lat': 40.4190,
            'lon': -3.6930,
            'popup': "<b>Palacio Renacentista (1500)</b><br>Arquitectura del Renacimiento.<br><img src='https://via.placeholder.com/150' alt='Palacio Renacentista' style='width:100px;'><br>Este palacio fue diseñado por un arquitecto italiano y refleja el esplendor del Renacimiento español.",
            'icon': "🏛️",
        })
    elif time_period == "Contemporánea (1900-Presente)":
        historical_markers.append({
            'lat': 40.4190,
            'lon': -3.6930,
            'popup': "<b>Gran Vía (1910)</b><br>Icono moderno de Madrid.<br><img src='https://via.placeholder.com/150' alt='Gran Vía' style='width:100px;'><br>Construida como parte de un proyecto de modernización de Madrid, la Gran Vía es conocida por sus teatros y tiendas.",
            'icon': "🏙️",
        })

    # Imprimir los datos generados para inspección
    print(f"Datos generados - Cápsulas: {len(capsules_data)} cápsulas")
    for idx, capsule in enumerate(capsules_data):
        print(f"Cápsula {idx}: {capsule['content']}, Lat: {capsule['lat']}, Lon: {capsule['lon']}")
    print(f"Calles virtuales: {len(streets)} calles")
    print(f"Marcadores históricos: {len(historical_markers)} marcadores")

    return capsules_data, streets, historical_markers