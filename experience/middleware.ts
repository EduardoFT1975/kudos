/**
 * KUDOS Experience · beta route gate (Phase P0.6)
 *
 * Hides non-`/aqui` routes during beta WITHOUT deleting them. Restoration
 * is a single env-var flip: set BETA_HIDE_DORMANT=0 (or remove it) in
 * the Render dashboard → Manual Deploy.
 *
 * Hidden routes 307-redirect to `/aqui`. Filesystem, code, and assets
 * remain intact for post-beta restoration. Temporary 307 (not 301) so
 * crawlers don't cache the redirect.
 *
 * Always-allowed: /aqui, /, /health, /_next/*, /favicon*, /api/* · these
 * are NOT in the matcher pattern so the middleware never runs for them.
 *
 * Hidden by matcher: /descubrir, /capsules, /places, /time.
 */
import { NextRequest, NextResponse } from "next/server";

// P0.9 · liberamos /descubrir, /capsules y /time del beta gate.
// Solo /places sigue oculto porque su backend (/api/places/<slug>/) no
// está implementado y la ruta renderiza un panel "endpoint pendiente"
// reputacionalmente malo para usuario final.
const HIDDEN_PREFIXES = ["/places"];

export function middleware(req: NextRequest) {
  if (process.env.BETA_HIDE_DORMANT !== "1") {
    return NextResponse.next();
  }
  const { pathname } = req.nextUrl;
  for (const prefix of HIDDEN_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/aqui";
      return NextResponse.redirect(url, 307);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/places/:path*",
  ],
};
