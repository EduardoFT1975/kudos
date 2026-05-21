/**
 * KUDOS Experience · <SpatialAnchor />
 *
 * Floating contextual anchor. UN solo elemento persistente — hairline
 * vertical en el lateral izquierdo de la pantalla, fixed-positioned,
 * presente desde Hero hasta Footer.
 *
 * Filosofía:
 *   "Algo recorre toda la experiencia."
 *   "Single persistent spatial anchor."
 *
 * NO es:
 *   - navegación
 *   - progress indicator
 *   - scrollbar custom
 *   - chrome decorativo
 *
 * SÍ es:
 *   - una coordenada espacial atmosférica
 *   - prueba perceptiva de que el espacio es continuo
 *   - presencia silenciosa que el usuario apenas registra conscientemente
 *
 * Sin movimiento. Sin dots. Sin ticks. Solo el hairline.
 * Si parece progress bar, está mal. Si parece "el aire tiene coordenada",
 * está bien.
 */
export function SpatialAnchor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-3 z-[2] sm:left-5"
    >
      <div
        className="absolute inset-y-0 left-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(167,139,250,0.08) 15%, rgba(167,139,250,0.08) 85%, transparent 100%)",
        }}
      />
    </div>
  );
}
