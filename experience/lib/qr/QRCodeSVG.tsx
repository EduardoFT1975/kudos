"use client";
/**
 * KUDOS QRCodeSVG - PROMPT 5/6.
 *
 * Renderiza un QR Code generado localmente como SVG vectorial.
 * Cero deps externas. Tamano y colores configurables.
 */
import * as React from "react";
import { encodeQR } from "./qrcode";


interface Props {
  value: string;
  size?: number;          // pixels del lado
  fg?: string;            // color modulos negros
  bg?: string;            // color fondo
  margin?: number;        // modulos de margen
}


export function QRCodeSVG({
  value,
  size = 160,
  fg = "#0a0814",
  bg = "#ffffff",
  margin = 2,
}: Props) {
  const qr = React.useMemo(() => {
    try {
      return encodeQR(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) {
    return (
      <div
        style={{
          width: size, height: size, background: bg, color: fg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, borderRadius: 4,
        }}
      >
        QR no disponible
      </div>
    );
  }

  const total = qr.size + margin * 2;
  const cellPx = size / total;

  // Construir path SVG con todas las celdas negras como rect concatenados
  let pathD = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) {
        const px = (x + margin) * cellPx;
        const py = (y + margin) * cellPx;
        pathD += `M${px.toFixed(2)} ${py.toFixed(2)}h${cellPx.toFixed(2)}v${cellPx.toFixed(2)}h-${cellPx.toFixed(2)}z`;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      style={{ background: bg, borderRadius: 4, display: "block" }}
    >
      <path d={pathD} fill={fg} />
    </svg>
  );
}
