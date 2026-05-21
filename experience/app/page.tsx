/**
 * KUDOS Experience · / (root redirect)
 *
 * Phase 14.10 beta unblock · root path is now the entry funnel into the
 * live geolocation experience. The previous curated DiscoveryFeed lives
 * at `/descubrir` for users who want the cinematic browse instead.
 *
 * Why a server-side redirect instead of a soft client-side router push:
 *   - Zero flash of unrelated content.
 *   - SEO + share previews still resolve `/` predictably.
 *   - No JS required for the redirect to fire.
 *
 * If product positioning shifts back to "curated home" later, flip this
 * file to render DiscoveryFeed again and add a CTA out to /aqui.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RootPage(): never {
  redirect("/aqui");
}
