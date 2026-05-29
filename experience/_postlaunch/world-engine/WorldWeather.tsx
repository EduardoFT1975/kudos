"use client";
/**
 * KUDOS · Widget weather · Open-Meteo (gratis · sin API key).
 * Fetch al cambiar de zona >1km de la última actualización.
 */
import * as React from "react";


interface Props {
  lat?: number;
  lng?: number;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;       // emoji
}

// Mapeo WMO weather codes → icon + descripción ES
const WMO: Record<number, { icon: string; desc: string }> = {
  0:  { icon: "☀", desc: "Despejado" },
  1:  { icon: "🌤", desc: "Mayoría sol" },
  2:  { icon: "⛅", desc: "Parcialmente nublado" },
  3:  { icon: "☁", desc: "Nublado" },
  45: { icon: "🌫", desc: "Niebla" },
  48: { icon: "🌫", desc: "Niebla" },
  51: { icon: "🌦", desc: "Llovizna" },
  53: { icon: "🌦", desc: "Llovizna" },
  55: { icon: "🌧", desc: "Lluvia" },
  61: { icon: "🌦", desc: "Lluvia ligera" },
  63: { icon: "🌧", desc: "Lluvia" },
  65: { icon: "🌧", desc: "Lluvia fuerte" },
  71: { icon: "🌨", desc: "Nieve ligera" },
  73: { icon: "🌨", desc: "Nieve" },
  75: { icon: "❄", desc: "Nieve fuerte" },
  77: { icon: "❄", desc: "Granizo" },
  80: { icon: "🌦", desc: "Chubascos" },
  81: { icon: "🌧", desc: "Chubascos" },
  82: { icon: "⛈", desc: "Tormenta" },
  95: { icon: "⛈", desc: "Tormenta" },
  96: { icon: "⛈", desc: "Granizo+tormenta" },
  99: { icon: "⛈", desc: "Granizo+tormenta" },
};


export function WorldWeather({ lat, lng }: Props) {
  const [data, setData] = React.useState<WeatherData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const lastFetchRef = React.useRef<{ lat: number; lng: number; t: number } | null>(null);

  React.useEffect(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return;

    // Solo refetch si el centro se movió >50km o pasaron 5min
    const last = lastFetchRef.current;
    if (last) {
      const dlat = lat - last.lat;
      const dlng = lng - last.lng;
      const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;   // muy aprox
      const ageMin = (Date.now() - last.t) / 60000;
      if (distKm < 50 && ageMin < 5) return;
    }

    setLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((json) => {
        const c = json?.current;
        if (!c) return;
        const wmo = WMO[c.weather_code] || { icon: "·", desc: "—" };
        setData({
          temp: Math.round(c.temperature_2m),
          description: wmo.desc,
          icon: wmo.icon,
        });
        lastFetchRef.current = { lat, lng, t: Date.now() };
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (!data && !loading) return null;

  return (
    <div style={WRAP}>
      {loading && !data ? (
        <span style={LOADING}>…</span>
      ) : data && (
        <>
          <span style={ICON_S}>{data.icon}</span>
          <div style={STACK}>
            <span style={TEMP}>{data.temp}°</span>
            <span style={DESC}>{data.description}</span>
          </div>
        </>
      )}
    </div>
  );
}


const WRAP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 16,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 13px",
  background: "rgba(255,255,255,0.93)",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  backdropFilter: "blur(8px)",
};

const ICON_S: React.CSSProperties = { fontSize: 22, lineHeight: 1 };
const STACK: React.CSSProperties = { display: "flex", flexDirection: "column", lineHeight: 1.1 };
const TEMP: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#1f1b18" };
const DESC: React.CSSProperties = { fontSize: 9.5, color: "#777", letterSpacing: "0.02em" };
const LOADING: React.CSSProperties = { fontSize: 14, color: "#888" };
