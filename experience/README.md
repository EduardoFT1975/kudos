# KUDOS · Experience

Frontend Next.js 15 + React 18 · KUDOS · The Meaning Layer of Reality.

## Setup (primera vez)

```bash
cd experience
npm install
npm run dev
```

El `npm install` descarga las dependencias nuevas:
- `react-leaflet` + `leaflet` + `@types/leaflet` · mapa cartográfico real con OpenStreetMap.

## Acceso desde móvil (misma red WiFi)

```bash
# Encuentra tu IP en LAN
# macOS:   ipconfig getifaddr en0
# Linux:   hostname -I
# Windows: ipconfig | findstr IPv4

# Arranca Next.js escuchando 0.0.0.0
npx next dev -H 0.0.0.0 -p 3000

# En tu iPhone / Android abre:
# http://<TU_IP>:3000
```

### Geolocalización en móvil

`navigator.geolocation` solo funciona sobre HTTPS o `localhost`. Si accedes
por IP de LAN (`http://192.168.x.x:3000`) desde el móvil, el navegador
rechaza el permiso por contexto inseguro. KUDOS lo detecta y ofrece
selector manual con O Grove, Pontevedra, Santiago, Madrid, Roma, etc.

Para probar geolocalización real en móvil:
- usa `ngrok http 3000` y abre la URL HTTPS que genera, o
- usa el selector manual.

## Rutas

| Ruta | Contenido |
|---|---|
| `/inicio`         | Home cinematic · hero + featured + categorías + right rail timeline/impact |
| `/mapa`           | Mapa Leaflet real · OpenStreetMap · pan/zoom/markers/popups · geo · bottom sheet |
| `/aqui`           | Geolocalización real · reverse geocoding Nominatim · ecos cerca con distancia |
| `/descubrir`      | Feed por categoría · 9 ecos con imágenes reales |
| `/linea-tiempo`   | 5 eras · grid de ecos por época |
| `/momentos`       | 12 momentos (audio/imagen/texto) · filtros |
| `/studio`         | Editor de cápsula viral · score 0-100 · preview live |
| `/mis-memorias`   | Feed personal · 3 grupos temporales · stats |
| `/conexiones`     | 3 tabs · 8 personas con bios largas |
| `/guardados`      | 4 colecciones · grid de ecos |
| `/mind`           | Conversación · 3 turnos pre-cargados · citations · suggestions |
| `/notificaciones` | 12 notificaciones · 3 filtros · 7 categorías |
| `/ajustes`        | 5 secciones · toggles reales |
| `/invitar`        | Link personal · share targets · stats |
| `/capsules/[slug]` | Cápsula completa · hero + video + galería + tabs + quotes + sources + related |
| `/echo/[id]`       | Igual que cápsula |
| `/places/[slug]`   | Lugar con hero + ecos vinculados |
| `/design-system`   | Referencia visual del DS v2 |
| `/health`          | Diagnóstico backend |

## Stack visible

- Next.js 15 · React 18 · TypeScript estricto
- Tailwind CSS · inline styles (DS tokens-driven)
- Leaflet + react-leaflet · tiles de OpenStreetMap
- Imágenes: Picsum (CDN público sin key)
- Video: Google Cloud Storage sample videos
- Geocoding: Nominatim (OpenStreetMap, sin key)

## Dependencias clave

Producción:
- `next@15.0.0`, `react@18.2.0`, `react-dom@18.2.0`
- `react-leaflet@^4.2.1`, `leaflet@^1.9.4`
- `framer-motion@^11.11.0`, `lucide-react@^0.460.0`
- `@radix-ui/*` (varios primitives)

Dev:
- `typescript@^5.6.3`
- `@types/leaflet@^1.9.12`
- `tailwindcss@^3.4.14`

## TSC

```bash
npm run typecheck
```

Debe salir limpio · 0 errores.

## Estructura

```
app/                     · 17 rutas Next 15 App Router
components/
  shell-v2/              · Sidebar, TopBar, BottomNav, BrandMark, Shell
  dev/DevNavigator.tsx   · menu temporal con todas las rutas
  screens/               · 15 pantallas reales
  shared/                · atoms compartidos
design-system/v2/        · tokens + 8 componentes reutilizables
lib/
  geo/                   · useGeolocation, reverseGeocode, distance, fallbackCities
  mocks-v2/fixtures.ts   · single source de mock data
  axon/                  · cliente API Django (preservado)
types/leaflet-shim.d.ts  · type stubs (borrar tras npm install)
```

## Notas

El Dev Navigator (botón violeta circular abajo-derecha) lista todas las
rutas para inspección manual. Se elimina cuando el founder lo autorice.
