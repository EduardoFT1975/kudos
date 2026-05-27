"use client";

/**
 * KUDOS · componente de hidratación inicial.
 *
 * Monta una sola vez al cargar la app. Llama a `hydrateFromBackend()`
 * en el primer render del cliente (evita ejecutar en SSR · localStorage
 * sólo existe en navegador).
 *
 * No renderiza nada visible. Es un punto de "side-effect on mount" puro.
 *
 * Integración: incluido en `app/layout.tsx` dentro del body.
 */

import * as React from "react";
import { hydrateFromBackend } from "@/lib/kudos/hydration";

export function BackendHydration(): null {
  // useRef para garantizar que sólo se ejecuta una vez incluso si
  // React invoca el effect dos veces en dev (StrictMode).
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const result = await hydrateFromBackend();
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[KUDOS] backend hydration:", result);
        }
      } catch {
        // hydrateFromBackend ya no lanza, pero por si acaso.
      }
    })();
  }, []);

  return null;
}
