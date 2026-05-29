"use client";
/**
 * KUDOS HDG · Capa 2 · World Collection Engine.
 *
 * Botón canónico "🌍 Añadir a Mi Mundo" · ahora usa useMyWorld
 * (persiste en API v2 si NEXT_PUBLIC_KUDOS_API_URL · localStorage fallback).
 */
import * as React from "react";
import { Track } from "./kudosTelemetry";
import { useMyWorld } from "./useMyWorld";
import { MeaningPicker, type Motivation } from "./MeaningPicker";


interface Props {
  poiId: string;
  poiName?: string;
  variant?: "primary" | "ghost" | "compact";
  showMeaningPicker?: boolean;
  onAdded?: (motivation: Motivation | null) => void;
}

export function AddToMyWorldButton({
  poiId, poiName, variant = "primary",
  showMeaningPicker = true, onAdded,
}: Props) {
  const { isInMyWorld, add, remove } = useMyWorld();
  const added = isInMyWorld(poiId);
  const [meaningOpen, setMeaningOpen] = React.useState(false);

  const handle = async () => {
    if (added) {
      await remove(poiId);
      Track.removedFromMyWorld(poiId);
      dispatchToast("Quitado de Mi Mundo");
      return;
    }
    await add(poiId);
    Track.addedToMyWorld(poiId);
    if (showMeaningPicker) setMeaningOpen(true);
    else {
      dispatchToast("Añadido a Mi Mundo");
      onAdded?.(null);
    }
  };

  const baseStyle = (variant === "primary" ? STYLE_PRIMARY :
                    variant === "ghost"   ? STYLE_GHOST   :
                                            STYLE_COMPACT);

  return (
    <>
      <button style={{ ...baseStyle, ...(added ? STYLE_ACTIVE : {}) }} onClick={handle}>
        <span style={{ fontSize: variant === "compact" ? 14 : 15 }}>
          {added ? "✓" : "🌍"}
        </span>
        {variant !== "compact" && (
          <span>{added ? "En Mi Mundo" : "Añadir a Mi Mundo"}</span>
        )}
      </button>

      <MeaningPicker
        open={meaningOpen}
        poiId={poiId}
        poiName={poiName}
        onConfirm={async (m) => {
          setMeaningOpen(false);
          if (m) {
            // Re-add con motivation para persistir el motivo
            await add(poiId, m);
          }
          dispatchToast(m ? "Añadido a Mi Mundo con motivo" : "Añadido a Mi Mundo");
          onAdded?.(m);
        }}
        onClose={() => setMeaningOpen(false)}
      />
    </>
  );
}


function dispatchToast(msg: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kudos:toast", { detail: msg }));
}


const STYLE_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "11px 18px", borderRadius: 14,
  background: "linear-gradient(135deg, #8B6BFF, #6e4dd6)",
  border: "none", color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 10px rgba(139,107,255,0.35)",
};

const STYLE_GHOST: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "10px 16px", borderRadius: 12,
  background: "rgba(139,107,255,0.12)",
  border: "1px solid rgba(139,107,255,0.32)",
  color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontSize: 12, fontWeight: 600, cursor: "pointer",
  transition: "all 0.2s ease",
};

const STYLE_COMPACT: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 36, height: 36, borderRadius: "50%",
  background: "rgba(15,10,31,0.7)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", cursor: "pointer", fontFamily: "inherit",
  transition: "all 0.2s ease", backdropFilter: "blur(6px)",
};

const STYLE_ACTIVE: React.CSSProperties = {
  background: "linear-gradient(135deg, #C9A961, #a78848)",
  boxShadow: "0 2px 12px rgba(201,169,97,0.45)",
};
