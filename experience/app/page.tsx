/**
 * KUDOS Experience · / (root redirect)
 *
 * P0.9 surface assembly · root path is the atlas entry. KUDOS es producto
 * de exploración (atlas / discovery / time / mapa) · no una landing de
 * capsule. La primera impresión debe comunicar surface de navegación, no
 * un único place card.
 *
 * Decisión: `/` → `/mapa`. El Atlas multidimensional es la superficie que
 * mejor expone el producto: mapa global + tap-to-explore + capsule en
 * panel inferior. El usuario aterriza en algo navegable, no en un loop
 * de permisos.
 *
 * Las otras superficies siguen accesibles vía Header (Aquí · Descubrir ·
 * Mapa · Tiempo). El capsule live (/aqui) sigue siendo el surface de
 * "lo que tienes debajo de los pies" — pero deja de ser la primera
 * impresión del producto.
 *
 * Server-side redirect porque: zero flash, SEO predecible, no requiere JS.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RootPage(): never {
  redirect("/mapa");
}
