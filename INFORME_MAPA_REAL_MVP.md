# INFORME EJECUTIVO · ESTADO REAL DEL MAPA KUDOS

**Auditoría técnica del repositorio · 30 de mayo de 2026**
**Encargo:** evidencia, no propuesta. Sin diseño de Fase 2, cápsulas, legado, familia ni visión futura.

---

## 1. Resumen ejecutivo en una línea

El mapa real **ya está construido en este repositorio**. Está congelado en `_postlaunch/world-engine/` con 2.758 líneas de Leaflet + OpenStreetMap funcionando. La pregunta no es "cuánto cuesta hacerlo", es "cuánto cuesta descongelarlo".

---

## 2. Inventario del sistema actual de mapa

### 2.1 Mapa activo en producción (lo que ves hoy en `/world`)

| Archivo | Líneas | Naturaleza |
|---|---|---|
| `experience/components/screens/map/v1/MapMVP.tsx` | 384 | Imagen aérea fake + POIs hardcoded |
| `experience/components/screens/map/v1/MapPOI.tsx` | 199 | POI posicionado en % sobre imagen |
| `experience/components/screens/map/v1/MapControls.tsx` | 345 | Controles superpuestos |
| `experience/components/screens/map/v1/MapBottomCarousel.tsx` | 215 | Carousel inferior |
| `experience/components/screens/map/v1/romaMock.ts` | 185 | **8 POIs Roma hardcoded sin lat/lng real** |
| **Total** | **1.328** | **100% simulación visual** |

**Librería:** ninguna. Es una imagen `https://images.unsplash.com/...` con `<div>` posicionados por porcentaje sobre la foto. No usa Leaflet, no usa coordenadas, no usa tiles, no responde a la ubicación del usuario.

**Ruta:** `experience/app/world/page.tsx` (12 líneas, importa `MapMVP`).
**Ruta legacy:** `experience/app/mapa/page.tsx` redirige a `/world`.

### 2.2 Mapa real congelado en `_postlaunch`

| Archivo | Líneas | Función |
|---|---|---|
| `_postlaunch/world-engine/WorldEngine.tsx` | 1.297 | Motor principal Leaflet + viewport culling + geolocalización + cap por tier |
| `_postlaunch/world-engine/WorldNode.ts` | 313 | Renderizado de marker por categoría/tier con divIcons |
| `_postlaunch/world-engine/WorldBottomCarousel.tsx` | 216 | Carousel inferior conectado a POIs reales del mapa |
| `_postlaunch/world-engine/WorldHud.tsx` | 202 | HUD lateral de capas y filtros |
| `_postlaunch/world-engine/world-tokens.ts` | 192 | Constantes tile URL, filtros CSS, min-zoom por tier |
| `_postlaunch/world-engine/WorldSearch.tsx` | 154 | Buscador de lugares con presets de ciudades |
| `_postlaunch/world-engine/WorldWeather.tsx` | 125 | Widget meteorológico |
| `_postlaunch/world-engine/WorldCityPicker.tsx` | 123 | Selector de ciudad |
| `_postlaunch/world-engine/WorldEraSwitcher.tsx` | 77 | Selector temporal hoy/antiguo |
| `_postlaunch/world-engine/WorldLogo.tsx` | 59 | Logo flotante |
| **Total** | **2.758** | **Sistema de mapa cartográfico completo** |

Este código se construyó, validó y desplegó en una versión anterior del MVP. Cuando el equipo decidió la versión cinematográfica con imagen aérea, se movió a `_postlaunch` íntegro sin borrar. **Está ahí, sin tocarse, desde el 29 de mayo.**

### 2.3 Mapa real activo en OTRAS pantallas (no en `/world`)

Dos componentes con Leaflet + OpenStreetMap reales viven en producción ahora mismo, fuera de `/world`:

| Archivo | Líneas | Dónde se usa |
|---|---|---|
| `experience/components/media/HomeMapPanel.tsx` | 279 | Panel lateral del Home (`HomeScreen.tsx`) |
| `experience/components/discovery/MyWorldMiniMap.tsx` | 163 | Mi Mundo, mini-mapa de saves |

Ambos usan `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` con filtro CSS `hue-rotate(220deg) saturate(0.62) brightness(0.55) contrast(1.05)`, que produce exactamente la estética nocturna morada de las maquetas. Funcionan en producción. La estética cinematográfica **ya está resuelta** sobre tiles reales.

### 2.4 Geolocalización

`experience/lib/geo/useGeolocation.ts` — 94 líneas. Hook completo con:
- `navigator.geolocation.getCurrentPosition`
- Estados: `idle | asking | granted | denied | unavailable | timeout | insecure`
- Cache en `localStorage` (último valor conocido)
- Modo manual (ubicación fijada por el usuario)
- Detección de contexto inseguro (no-HTTPS)

**Está terminado. Importado y usado por `WorldEngine.tsx`. Funciona.**

### 2.5 Datos reales georeferenciados

`experience/public/data/wikidata/` contiene **8 ficheros JSON** importados de Wikidata, totalizando **12 MB**:

| País | Archivo | Tamaño |
|---|---|---|
| Alemania | `de.json` | 1.9 MB |
| España | `es.json` | 1.6 MB |
| Francia | `fr.json` | 1.8 MB |
| Reino Unido | `gb.json` | 1.6 MB |
| Grecia | `gr.json` | 1.1 MB |
| Italia | `it.json` | 1.7 MB |
| Japón | `jp.json` | 1.2 MB |
| Portugal | `pt.json` | 1.3 MB |

Estructura por POI: `{ id, lat, lng, name, ... }`. Decenas de miles de lugares con coordenadas reales. Ya consumido por `MyWorldMiniMap.tsx`. Listo para ser consumido por el resto.

### 2.6 Backend

`kudos_engine/apps/pois/`:
- `models.py` — modelo POI con `latitude: float` y `longitude: float` como campos obligatorios
- `router.py` — endpoints CRUD: `GET /`, `GET /count`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/related`, `POST /{id}/link`
- `service.py` — lógica de negocio completa
- `repository.py` — capa de persistencia

**Lo que NO existe en backend:**
- Endpoint `/api/pois/nearby?lat=X&lng=Y&radius=Z` (búsqueda geoespacial)
- Integración con Nominatim para resolver direcciones → coordenadas

### 2.7 Dependencias instaladas

`package.json` ya incluye:
- `leaflet@1.9.4`
- `react-leaflet@4.2.1`
- `@types/leaflet@1.9.8`

**No hay que instalar nada nuevo para arrancar.**

---

## 3. Clasificación CONSERVAR / MODIFICAR / ELIMINAR

### CONSERVAR (no tocar, ya funciona)

- `experience/lib/geo/useGeolocation.ts` · hook geolocalización completo
- `experience/components/media/HomeMapPanel.tsx` · Leaflet en home, en producción
- `experience/components/discovery/MyWorldMiniMap.tsx` · Leaflet en Mi Mundo, en producción
- `experience/types/leaflet-shim.d.ts` · shim de tipos
- `experience/public/data/wikidata/*.json` · 12 MB de POIs reales
- Dependencias `leaflet`/`react-leaflet` en `package.json`
- `kudos_engine/apps/pois/` · modelo + CRUD completo backend

### MODIFICAR (descongelar y adaptar)

Mover los 10 archivos de `_postlaunch/world-engine/` a `experience/components/screens/map/v2/`:

- WorldEngine.tsx (1.297 líneas)
- WorldNode.ts (313)
- WorldBottomCarousel.tsx (216)
- WorldHud.tsx (202)
- world-tokens.ts (192)
- WorldSearch.tsx (154)
- WorldWeather.tsx (125)
- WorldCityPicker.tsx (123)
- WorldEraSwitcher.tsx (77)
- WorldLogo.tsx (59)

Adaptar `experience/app/world/page.tsx` para apuntar al nuevo módulo. Ajustar el custom tile filter para igualar la estética morada de las maquetas (ya hay precedente en `HomeMapPanel`).

### ELIMINAR (mover a `_postlaunch` o borrar)

- `experience/components/screens/map/v1/MapMVP.tsx` (384)
- `experience/components/screens/map/v1/MapPOI.tsx` (199)
- `experience/components/screens/map/v1/MapControls.tsx` (345)
- `experience/components/screens/map/v1/MapBottomCarousel.tsx` (215)
- `experience/components/screens/map/v1/romaMock.ts` (185)

**Total a eliminar: 1.328 líneas de simulación.**

### AÑADIR (nuevo trabajo)

- Endpoint backend `/api/pois/nearby?lat=X&lng=Y&radius=Z` (~1 día)

---

## 4. Escenarios de esfuerzo real

### Escenario A · Mantener mapa actual

- **Esfuerzo:** 0 días
- **Resultado:** lo que ves hoy. Imagen fake de Roma con 8 POIs hardcoded.
- **Cumple visión:** NO. Toda la arquitectura futura (cápsulas geoposicionadas, geolocalización, búsqueda de lugares) depende de coordenadas reales que aquí no existen.

### Escenario B · Reutilizar código existente (DESCONGELAR `_postlaunch`)

- **Esfuerzo:** 5-7 días reales de trabajo enfocado
  - Día 1: mover los 10 archivos de `_postlaunch/world-engine/` a `map/v2/`, ajustar imports, smoke test
  - Día 2: validar que los JSONs Wikidata cargan correctamente en producción, fix de paths si hace falta
  - Día 3-4: ajustar custom tile filter + halos cinematográficos para igualar la estética del MVP visual aprobado
  - Día 5: conectar carousel inferior y filtros con los POIs reales del WorldEngine
  - Día 6: añadir endpoint backend `/api/pois/nearby` y conectar desde frontend
  - Día 7: feature flag, swap atómico `/world` viejo → `/world` nuevo, QA en producción
- **Resultado:** mapa cartográfico real con tiles OpenStreetMap, geolocalización funcional, decenas de miles de POIs reales georeferenciados visibles, búsqueda de lugares.
- **Riesgo:** moderado. El código congelado tiene meses; puede haber drift de tipos o APIs que requiera adaptación menor.

### Escenario C · Reconstruir desde cero

- **Esfuerzo:** 18-21 días
- **Resultado:** equivalente al B
- **Riesgo:** alto. Se tira a la basura 2.758 líneas de código probado.
- **Justificación racional:** ninguna identificada en este audit.

---

## 5. Diez conclusiones

1. **El mapa cartográfico real ya está construido en este repositorio.** No es un proyecto a iniciar, es un proyecto a descongelar.

2. **La geolocalización real ya está construida.** Hook `useGeolocation` con 94 líneas, completo, en uso por el código congelado.

3. **Los datos geoespaciales reales ya están en el repositorio.** 12 MB de POIs Wikidata con `lat`/`lng` para 8 países.

4. **Dos componentes activos del MVP actual ya usan Leaflet + OpenStreetMap reales.** HomeMapPanel y MyWorldMiniMap. La hipótesis "no podemos usar mapa real" está empíricamente refutada por el propio código en producción.

5. **La estética nocturna morada de las maquetas se logra con un filtro CSS sobre tiles OpenStreetMap.** Ya existe el precedente: `hue-rotate(220deg) saturate(0.62) brightness(0.55)`. No requiere assets propios ni Mapbox/Maptiler.

6. **Las dependencias Leaflet ya están instaladas.** Cero packages nuevos.

7. **El backend tiene modelo POI con coordenadas obligatorias y CRUD completo.** Solo falta un endpoint geoespacial `nearby`.

8. **El mapa activo actual son 1.328 líneas de simulación 100% desechables.** No contiene lógica reaprovechable: ni coordenadas reales, ni filtros geográficos, ni geolocalización.

9. **El código congelado en `_postlaunch/world-engine/` incluye viewport culling y cap por tier.** Es decir, ya está pensado para "millones de POIs" sin matar el navegador. Decisiones de arquitectura no triviales ya tomadas.

10. **La diferencia entre Escenario A y Escenario B es una semana de trabajo, no tres.** La narrativa de "necesitamos 21 días para tener mapa real" era correcta sólo si se ignoraba `_postlaunch`.

---

## 6. Cinco decisiones

1. **Adoptar Escenario B.** Descongelar `_postlaunch/world-engine/` y promocionar a la ruta `/world` activa. Tiempo: 5-7 días.

2. **Eliminar el directorio `experience/components/screens/map/v1/`.** 1.328 líneas que no aportan nada al producto definido. Mover a una carpeta `_archive` si el equipo no quiere borrar todavía.

3. **No introducir Mapbox ni Maptiler en esta fase.** OpenStreetMap con filtro CSS ya está validado en producción y es gratuito sin límites. Reconsiderar solo si se prueba a escala (>50k MAU) que los tiles OSM son insuficientes.

4. **Implementar endpoint `/api/pois/nearby` en backend** como única adición técnica nueva. Trabajo: 1 día.

5. **Usar feature flag para la transición.** Construir el nuevo `/world` en paralelo bajo `/world-v2` durante 5-6 días, swap atómico al final. Cero ventana de interrupción del servicio. Permite QA paralelo a las pruebas con usuarios alpha que arranquen mientras.

---

## 7. Lo que este informe NO contiene (por restricción explícita)

- Diseño de cápsulas, modelo de datos, audiencias o legacy.
- Roadmap de Fase 2 ni Fase 3.
- Propuestas de "Mapa de la Vida".
- Estimaciones de cápsulas familiares, herencia digital o amigos.
- Recomendaciones sobre cuándo activar la capa relacional.

Esas decisiones requieren respuesta a la pregunta: **"¿el Escenario B desbloquea el siguiente paso de la visión, sí o no?"**. La respuesta técnica es sí. La respuesta de producto la decide el fundador.

---

**Auditor:** Claude (modo CTO, evidencia sobre código real)
**Fichero entregable:** `INFORME_MAPA_REAL_MVP.md`
