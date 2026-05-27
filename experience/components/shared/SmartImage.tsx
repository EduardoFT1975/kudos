"use client";

import * as React from "react";
import { Silhouette, type SilhouetteKind } from "./Silhouette";

export interface SmartImageProps {
  src: string;
  alt: string;
  fallbackSilhouette: SilhouetteKind;
  gradientFrom: string;
  gradientTo: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  aspectRatio?: string;
}

type Status = "loading" | "ok" | "error";

export function SmartImage({
  src, alt, fallbackSilhouette, gradientFrom, gradientTo,
  className, style, loading = "lazy", aspectRatio,
}: SmartImageProps) {
  const [status, setStatus] = React.useState<Status>("loading");
  // Reset on src change
  React.useEffect(() => { setStatus("loading"); }, [src]);

  const wrapStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
    aspectRatio,
    ...style,
  };

  return (
    <div className={className} style={wrapStyle}>
      {status === "loading" ? (
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)",
            animation: "kudos-shimmer 1.8s linear infinite",
          }} />
        </div>
      ) : null}

      {status !== "error" ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: status === "ok" ? 0.95 : 0,
            transition: "opacity 320ms ease",
          }}
        />
      ) : (
        <Silhouette kind={fallbackSilhouette} opacity={0.6} />
      )}
    </div>
  );
}
