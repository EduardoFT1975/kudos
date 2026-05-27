// KUDOS · type stubs for Leaflet packages.
//
// Cuando hagas `npm install`, @types/leaflet sustituye estos stubs en
// la resolución de TypeScript. Mientras no instales, TS trata todos
// los símbolos como `any` · tu build sigue compilando.

declare module "leaflet" {
  const L: any;
  export = L;
  export default L;
}

declare module "react-leaflet" {
  export const MapContainer: any;
  export const TileLayer: any;
  export const Marker: any;
  export const Popup: any;
  export const Circle: any;
  export const CircleMarker: any;
  export const ZoomControl: any;
  export function useMap(): any;
  export function useMapEvents(handlers: any): any;
}
