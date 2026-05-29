"use client";
/**
 * useMigrateAnon · KUDOS T3.2 EJEC Day 18.
 *
 * Cuando un usuario anonimo (con session_id local) hace login Google por primera vez,
 * llamamos a /api/auth/migrate-anon para reasignar sus telemetry_events,
 * saves, signals, etc. al user_id recien autenticado.
 *
 * Se ejecuta UNA vez por sesion (flag en sessionStorage).
 * Es idempotente backend-side (T1.3.D).
 */
import * as React from "react";
import { useAuth } from "./useAuth";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


export function useMigrateAnon() {
  const { user, accessToken } = useAuth();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || !accessToken || !API) return;

    const sid = sessionStorage.getItem("kudos:session");
    if (!sid) return;

    const flag = `kudos:migrated:${user.id}`;
    if (sessionStorage.getItem(flag) === "1") return;

    // Marcamos optimistamente para evitar dobles llamadas
    sessionStorage.setItem(flag, "1");

    fetch(`${API}/api/auth/migrate-anon`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ session_id: sid }),
    })
      .then((r) => {
        if (!r.ok) {
          // Si fallo, deshacemos el flag para reintentar mas tarde
          sessionStorage.removeItem(flag);
          return;
        }
        // Guardamos nombre + userId para uso en Share V2 etc
        if (user.display_name) {
          try { sessionStorage.setItem("kudos:userName", user.display_name); } catch {}
        }
        try { sessionStorage.setItem("kudos:userId", user.id); } catch {}
      })
      .catch(() => {
        sessionStorage.removeItem(flag);
      });
  }, [user, accessToken]);
}
