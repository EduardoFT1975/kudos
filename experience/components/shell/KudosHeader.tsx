"use client";

/**
 * KUDOS Experience · <KudosHeader />
 *
 * Global navigation chrome. Fixed top bar, semi-transparent glass over
 * PageAtmosphere. Logo izquierda + nav links derecha. Mobile · solo logo
 * + drawer trigger (hamburger).
 *
 * Mount in app/layout.tsx envolviendo {children}. NO competir con z-index
 * de modales (picker overlay z-50) · este header z-40.
 *
 * Nav links están hardcoded a las 5 superficies del blueprint. Cada uno
 * highlight via usePathname() match. Active link: accent underline.
 *
 * Cuando BETA_HIDE_DORMANT=1, las rutas no-/aqui redirigen a /aqui. El
 * header sigue visible · los links no se ocultan, simplemente todos
 * llevan al mismo sitio durante la beta. Quitar el env var libera todas.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KudosLogo } from "./KudosLogo";

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
}

// P0.9 · /mind aún no existe como ruta (no hay app/mind/page.tsx). Lo
// quitamos del nav hasta que la surface esté implementada · evita un 404
// como primera interacción de un usuario nuevo.
// P0.9 Memory Graph · /mis-memorias añadido al final del nav · es el
// surface personal del usuario · diferenciado visualmente con etiqueta
// más corta "Memorias" para no inflar mobile pill carousel.
const _NAV: NavItem[] = [
  { href: "/mapa", label: "Mapa" },
  { href: "/aqui", label: "Aquí", shortLabel: "Aquí" },
  { href: "/descubrir", label: "Descubrir" },
  { href: "/time/rome", label: "Tiempo", shortLabel: "Tiempo" },
  { href: "/mis-memorias", label: "Memorias", shortLabel: "Mías" },
];

export function KudosHeader() {
  const pathname = usePathname() ?? "/";

  // /health no muestra header (página diagnóstica)
  if (pathname.startsWith("/health")) return null;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] backdrop-blur-md"
      style={{
        background: "rgba(5, 10, 31, 0.55)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        {/* Logo siempre vuelve a / (atlas entry). NO a /aqui · el brand mark
            es "volver al producto" no "volver al capsule". */}
        <Link href="/" aria-label="Inicio KUDOS" className="shrink-0">
          <KudosLogo size="sm" />
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/aqui" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "inline-flex items-center rounded-full px-3 py-1.5 " +
                      "text-[12px] font-medium uppercase tracking-[0.22em] " +
                      "transition-colors duration-300 ease-out " +
                      (active
                        ? "bg-[var(--kudos-accent)]/15 text-[var(--kudos-accent-bright)]"
                        : "text-white/55 hover:text-white/90")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile · compact pill carousel (5 items siguen cabiendo en
            iPhone SE 375px). Si crecen más, switch a drawer. */}
        <nav aria-label="Navegación principal" className="md:hidden">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/aqui" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "inline-flex items-center rounded-full px-2.5 py-1 " +
                      "text-[10px] font-medium uppercase tracking-[0.18em] " +
                      "transition-colors duration-300 " +
                      (active
                        ? "bg-[var(--kudos-accent)]/15 text-[var(--kudos-accent-bright)]"
                        : "text-white/55")
                    }
                  >
                    {item.shortLabel ?? item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
