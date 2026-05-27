"use client";

import * as React from "react";
import type { LatLng } from "./distance";

const STORAGE_KEY = "kudos:geo:last";

export type GeoStatus = "idle" | "asking" | "granted" | "denied" | "unavailable" | "timeout" | "insecure";

export interface GeoState {
  status: GeoStatus;
  coords: LatLng | null;
  accuracyM: number | null;
  errorMessage: string | null;
  source: "live" | "cache" | "manual" | null;
}

const INITIAL: GeoState = { status: "idle", coords: null, accuracyM: null, errorMessage: null, source: null };

function readCache(): GeoState {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.coords?.lat !== "number" || typeof parsed?.coords?.lng !== "number") return INITIAL;
    return {
      status: "granted",
      coords: parsed.coords,
      accuracyM: typeof parsed.accuracyM === "number" ? parsed.accuracyM : null,
      errorMessage: null,
      source: parsed.source === "manual" ? "manual" : "cache",
    };
  } catch {
    return INITIAL;
  }
}

function writeCache(coords: LatLng, accuracyM: number | null, source: "live" | "manual") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords, accuracyM, source, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function useGeolocation() {
  const [state, setState] = React.useState<GeoState>(INITIAL);

  // Restore previous granted location on mount
  React.useEffect(() => {
    setState(readCache());
  }, []);

  const request = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setState({ status: "unavailable", coords: null, accuracyM: null, errorMessage: "Tu navegador no soporta geolocalización.", source: null });
      return;
    }
    // Detect insecure context (geolocation only works on https or localhost)
    if (window.isSecureContext === false) {
      setState({ status: "insecure", coords: null, accuracyM: null, errorMessage: "Geolocalización solo funciona sobre HTTPS o localhost.", source: null });
      return;
    }
    setState({ status: "asking", coords: null, accuracyM: null, errorMessage: null, source: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        writeCache(coords, pos.coords.accuracy, "live");
        setState({ status: "granted", coords, accuracyM: pos.coords.accuracy, errorMessage: null, source: "live" });
      },
      (err) => {
        let status: GeoStatus = "denied";
        if (err.code === 3) status = "timeout";
        setState({ status, coords: null, accuracyM: null, errorMessage: err.message, source: null });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  const setManual = React.useCallback((coords: LatLng, label?: string) => {
    writeCache(coords, null, "manual");
    setState({ status: "granted", coords, accuracyM: null, errorMessage: label ?? null, source: "manual" });
  }, []);

  const clear = React.useCallback(() => {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    setState(INITIAL);
  }, []);

  return { ...state, request, setManual, clear };
}
