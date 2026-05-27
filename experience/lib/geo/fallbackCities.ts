import type { LatLng } from "./distance";

export interface FallbackCity extends LatLng {
  id: string;
  name: string;
  region: string;
  country: string;
}

export const FALLBACK_CITIES: ReadonlyArray<FallbackCity> = [
  { id: "ogrove",      name: "O Grove",                 region: "Pontevedra",         country: "España",  lat: 42.4994, lng: -8.8665 },
  { id: "atoxa",       name: "Illa da Toxa",            region: "O Grove · Pontevedra", country: "España", lat: 42.4783, lng: -8.8581 },
  { id: "pontevedra",  name: "Pontevedra",              region: "Galicia",             country: "España",  lat: 42.4310, lng: -8.6444 },
  { id: "santiago",    name: "Santiago de Compostela",  region: "Galicia",             country: "España",  lat: 42.8782, lng: -8.5448 },
  { id: "vigo",        name: "Vigo",                    region: "Galicia",             country: "España",  lat: 42.2406, lng: -8.7207 },
  { id: "ourense",     name: "Ourense",                 region: "Galicia",             country: "España",  lat: 42.3406, lng: -7.8642 },
  { id: "acoruna",     name: "A Coruña",                region: "Galicia",             country: "España",  lat: 43.3623, lng: -8.4115 },
  { id: "madrid",      name: "Madrid",                  region: "Comunidad de Madrid", country: "España",  lat: 40.4168, lng: -3.7038 },
  { id: "barcelona",   name: "Barcelona",               region: "Cataluña",            country: "España",  lat: 41.3851, lng: 2.1734 },
  { id: "sevilla",     name: "Sevilla",                 region: "Andalucía",           country: "España",  lat: 37.3891, lng: -5.9845 },
  { id: "rome",        name: "Roma",                    region: "Lazio",               country: "Italia",  lat: 41.89,   lng: 12.49 },
  { id: "paris",       name: "París",                   region: "Île-de-France",       country: "Francia", lat: 48.85,   lng: 2.35 },
  { id: "lisboa",      name: "Lisboa",                  region: "Lisboa",              country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { id: "london",      name: "Londres",                  region: "Inglaterra",           country: "Reino Unido", lat: 51.5074, lng: -0.1278 },
];

export function cityById(id: string): FallbackCity | undefined {
  return FALLBACK_CITIES.find((c) => c.id === id);
}
