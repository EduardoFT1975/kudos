/**
 * KUDOS Experience · <KudosFooter />
 *
 * Global footer minimal. Logo + 3 links institucionales + versión.
 * Visible en todas las rutas excepto /health (diagnostic).
 *
 * Diseño: glass sutil, tipografía mono pequeña, sin gradient pesado ·
 * no compite con el contenido. Sits naturally al final del scroll.
 */
"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KudosLogo } from "./KudosLogo";

// P0.9 · /mind aún no existe (no hay app/mind/page.tsx). Lo quitamos
// hasta que la surface esté implementada · sustituido por /time/rome
// y /mis-memorias que son los otros pilares visibles del producto.
const _LINKS = [
  { href: "/mapa", label: "Mapa" },
  { href: "/descubrir", label: "Descubrir" },
  { href: "/time/rome", label: "Tiempo" },
  { href: "/mis-memorias", label: "Memorias" },
];

const _VERSION = "v0.9 · axon-core";

export function KudosFooter() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/health")) return null;

  return (
    <footer
      className="relative z-30 mt-auto border-t border-white/[0.06] backdrop-blur-md"
      style={{
        background: "rgba(5, 10, 31, 0.55)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:gap-2 sm:px-6">
        <div className="flex items-center gap-3">
          <KudosLogo size="sm" withDot={false} />
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
            {_VERSION}
          </span>
        </div>

        <nav aria-label="Pie de página">
          <ul className="flex items-center gap-4">
            {_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40 transition-colors hover:text-white/80"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
