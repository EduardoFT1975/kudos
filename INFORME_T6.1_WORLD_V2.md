# INFORME T6.1 · WORLD V2 · DESCONGELACIÓN MAPA REAL

**Fase:** MVP RECOVERY
**Hito:** MAPA REAL
**Tarea:** T6.1
**Estado final:** ✅ COMPLETADA · TSC VERDE
**Fecha:** 30 de mayo de 2026

---

## RESULTADO EN UNA LÍNEA

`_postlaunch/world-engine/` descongelado a `components/screens/map/v2/`, ruta `/world-v2` montada, TSC verde, **cero imports rotos, cero conflictos de tipos, cero refs cruzadas**.

---

## 1. CAMBIOS REALIZADOS

### 1.1 Creación del directorio v2

```
experience/components/screens/map/v2/
├── WorldBottomCarousel.tsx   (216 líneas)
├── WorldCityPicker.tsx       (123 líneas)
├── WorldEngine.tsx          (1.297 líneas)
├── WorldEraSwitcher.tsx       (77 líneas)
├── WorldHud.tsx              (202 líneas)
├── WorldLogo.tsx              (59 líneas)
├── WorldNode.ts              (313 líneas)
├── WorldSearch.tsx           (154 líneas)
├── WorldWeather.tsx          (125 líneas)
└── world-tokens.ts           (192 líneas)
```

**Total: 10 archivos, 2.758 líneas reactivadas.**

### 1.2 Creación de la ruta /world-v2

`experience/app/world-v2/page.tsx` (15 líneas):

```tsx
import { WorldEngine } from "@/components/screens/map/v2/WorldEngine";

export const metadata = {
  title: "KUDOS - Mapa Real",
  description: "El mundo, en sus coordenadas reales.",
};

export default function WorldV2Page() {
  return <WorldEngine />;
}
```

### 1.3 Corrección residual de PoiTimeline.tsx

Detectado durante el TSC inicial: el archivo `experience/components/screens/poi/mvp/PoiTimeline.tsx` estaba truncado en la línea 196 (Sprint Visual abortado en sesión anterior). Reparado con escritura atómica Python (`tempfile.mkstemp` + `os.replace`). Añadidos los estilos faltantes y la función `filterForEra()` que aplica filtros CSS cinematográficos por época histórica.

---

## 2. ARCHIVOS MODIFICADOS

| Archivo | Acción |
|---|---|
| `experience/components/screens/map/v2/*` (10 archivos) | CREADOS (copia de `_postlaunch/world-engine/`) |
| `experience/app/world-v2/page.tsx` | CREADO |
| `experience/components/screens/poi/mvp/PoiTimeline.tsx` | REPARADO truncamiento (línea 196 → 231) |

**Archivos NO tocados (preservados):**
- `experience/_postlaunch/world-engine/` se mantiene intacto como respaldo.
- `experience/app/world/page.tsx` se mantiene apuntando al `MapMVP` actual (mapa fake) hasta swap atómico final.
- `experience/components/screens/map/v1/` se mantiene activo en producción.

---

## 3. ERRORES ENCONTRADOS

### 3.1 Errores derivados del descongelamiento

**NINGUNO.**

El código congelado en `_postlaunch/world-engine/` se descongela limpio:
- Cero imports rotos
- Cero conflictos de tipos
- Cero APIs deprecadas
- Cero refs cruzadas a paths viejos

### 3.2 Errores externos detectados durante TSC inicial

| Archivo | Error | Causa | Resolución |
|---|---|---|---|
| `components/screens/poi/mvp/PoiTimeline.tsx:196` | `TS1002: Unterminated string literal` | Truncamiento residual de un Sprint Visual abortado en sesión anterior. NO relacionado con T6.1. | Reparado con Python atomic write. Reconstruidos estilos `GALLERY_HERO`, `GALLERY_ERA`, `GALLERY_LABEL`, `GALLERY_ICON_FALLBACK` + función `filterForEra()`. |

---

## 4. VERIFICACIONES EJECUTADAS

### 4.1 TSC compilación completa

```bash
npx tsc --noEmit --skipLibCheck
```

**Resultado:** ✅ verde absoluto, cero errores en todo el repositorio.

### 4.2 Imports externos de WorldEngine resueltos

| Import | Path resuelto | Estado |
|---|---|---|
| `getAllPois` | `lib/kudos/store.ts:316` | ✅ exporta función esperada |
| `useGeolocation` | `lib/geo/useGeolocation.ts` | ✅ hook completo activo |
| `AddToMyWorldButton` | `components/discovery/AddToMyWorldButton.tsx` | ✅ existe |
| `ResonancePicker` | `components/discovery/ResonancePicker.tsx` | ✅ existe |
| `useDiscoverySignals` | `components/discovery/useDiscoverySignals.ts` | ✅ existe |
| `Track` (kudosTelemetry) | `components/discovery/kudosTelemetry.ts` | ✅ existe |

### 4.3 Refs cruzadas residuales

```bash
grep -rn "_postlaunch/world-engine" experience/components experience/app
```

**Resultado:** ✅ cero ocurrencias. Nadie en código activo hace referencia al directorio congelado.

### 4.4 Imports relativos internos v2

Todos los imports relativos (`./WorldNode`, `./WorldLogo`, `./WorldSearch`, etc.) resueltos contra los archivos copiados en `map/v2/`. Sin conflictos.

---

## 5. ESTADO FINAL

### 5.1 Inventario funcional

| Capa | Estado |
|---|---|
| `experience/app/world-v2/page.tsx` (ruta nueva) | ✅ creada |
| `experience/components/screens/map/v2/*` (10 archivos) | ✅ instalados |
| Leaflet + react-leaflet (deps) | ✅ ya instaladas en `package.json` |
| OpenStreetMap tile URL | ✅ embebida en `world-tokens.ts` |
| Custom dark filter CSS (estética nocturna KUDOS) | ✅ embebida en `world-tokens.ts` |
| Hook `useGeolocation` | ✅ importado por WorldEngine, funcional |
| Datos POIs reales (`public/data/wikidata/*.json`, 12 MB, 8 países) | ✅ disponibles, ya consumidos por MyWorldMiniMap |
| Búsqueda de lugares (`WorldSearch`) | ✅ presente con presets de ciudades |
| Carousel inferior (`WorldBottomCarousel`) | ✅ presente |
| TSC pass | ✅ verde absoluto |

### 5.2 Lo que NO se ha verificado (fuera del alcance de T6.1)

- `next build` end-to-end (timeout de sandbox no permite ejecución completa de build Next 15).
- Rendering visual real en navegador.
- Performance con decenas de miles de POIs cargados.
- Comportamiento de la geolocalización en navegador real (requiere HTTPS, no probable en sandbox).

Estas verificaciones requieren que tú levantes el servidor local. Ver sección 6.

### 5.3 Coexistencia con mapa actual

- `/world` → sigue apuntando a `MapMVP` (mapa fake actual). **Producción no afectada.**
- `/world-v2` → apunta a `WorldEngine` (mapa real descongelado). **Disponible para QA paralelo.**

---

## 6. SIGUIENTE PASO PARA EDUARDO

Levantar local y abrir `/world-v2`:

```bash
cd C:\Users\efert\kudos_project\experience
npm run dev
```

Luego abrir: `http://localhost:3000/world-v2/`

Lo que deberías ver:
1. Mapa cartográfico real con tiles OpenStreetMap y filtro morado nocturno KUDOS.
2. Logo flotante arriba.
3. Buscador y selector de ciudad.
4. POIs reales cargados desde los JSONs Wikidata.
5. Botón de geolocalización que pide permiso del navegador.
6. Carousel inferior y HUD lateral de capas.

Si algo falla en runtime (TSC pasó, pero runtime puede tener sorpresas), comunícalo y se ataja en T6.2.

---

## 7. PRÓXIMO HITO (NO EJECUTAR HASTA QUE VALIDES T6.1 EN LOCAL)

- **T6.2** · Adaptar estética y conectar bottom carousel con POI canónicos KUDOS curados (no Wikidata genéricos).
- **T6.3** · Endpoint backend `/api/pois/nearby` + integración frontend.
- **T6.4** · Feature flag y swap atómico `/world` viejo → `/world` nuevo. Eliminación de `map/v1`.

---

**Tarea T6.1: COMPLETADA.**
**Próxima decisión pendiente: validación manual de `/world-v2` en localhost por Eduardo.**
