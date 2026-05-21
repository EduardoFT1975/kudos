/**
 * KUDOS Experience · <LayerContainer />
 *
 * Wrapper de capa con bleed ESTRUCTURAL · clarity-first.
 *
 * Evolución perceptiva:
 *   v1  · scroll-driven opacity [0.45 → 1 → 0.5] · washed UI · ghost layers
 *   v3  · opacity 1 sovereign · bleed solo vía negative margin
 *
 * Por qué v1 falló:
 *   - Bloques enteros translúcidos creaban ghost UI
 *   - La capa activa perdía gravedad (compite con A residual + C emergiendo)
 *   - Mobile especialmente: viewport pequeño + multiple ghost layers = wash
 *
 * Por qué v3 funciona:
 *   - Cada capa activa es PERCEPTUALMENTE SOBERANA al opacity 1
 *   - El bleed estructural cae en padding deadspace (negative margin top)
 *     · whispers tienen py-24/32 interno → ese padding bajo es vacío
 *     · capas tienen py-14/20 interno → ese padding alto es vacío
 *     · el margen negativo comprime SOLO esos vacíos, no contenido
 *   - La continuidad perceptiva ya viene de tres anchors persistentes:
 *       1. PageAtmosphere · motas + ghost arches + light trails + heartbeat
 *       2. Whispers/EchoNodes · anchors rítmicos crisp entre capas
 *       3. Compressed spacing · less void = less section feeling
 *
 * Futuro (Fragment Traces):
 *   Si en el futuro necesitamos que ELEMENTOS específicos persistan al
 *   exit de una capa (active dot del Timeline, accent bar del Context,
 *   horizon de Legacy...), se implementa con un <FragmentTrace> dedicado
 *   por sección. NO con whole-layer opacity. Persistencia selectiva =
 *   más elegancia.
 *
 * "Not whole layers. Only traces." — calibration directive
 */
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface LayerContainerProps {
  children: React.ReactNode;
  /**
   * Negative margin top en px · default 48.
   * Comprime el padding muerto entre capas. NO crea overlap de contenido
   * (cae en padding deadspace). Pasa 0 para deshabilitar.
   */
  bleed?: number;
  className?: string;
}

export function LayerContainer({
  children,
  bleed = 48,
  className,
}: LayerContainerProps) {
  const marginTop = bleed > 0 ? `-${bleed}px` : undefined;
  return (
    <div style={{ marginTop }} className={cn("relative", className)}>
      {children}
    </div>
  );
}
