/**
 * KUDOS Experience · /aqui (Live capsule entry)
 *
 * Mounts the Phase 13 geolocation → API → capsule state flow.
 * Opening this route triggers:
 *   1. Browser geolocation prompt (via useGeolocation hook)
 *   2. POST /api/place-capsule with resolved coords
 *   3. Render via CapsuleStateRouter:
 *        building_context | success | sparse_discovery | empty_zone
 *
 * Server component shell · CapsuleEntry is "use client" and brings the
 * full client lifecycle (hooks, fetch, state).
 *
 * Separate from `/` (DiscoveryFeed) so both flows coexist · the live
 * geolocation experience does NOT replace the curated discovery feed.
 */
import { CapsuleEntry } from "@/features/capsule/CapsuleEntry";

// Live geolocation flow must not be cached · each visit re-runs the
// permission prompt and the per-coord fetch.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "KUDOS · Aquí",
  description:
    "La memoria del lugar donde estás. KUDOS escucha tu ubicación y te cuenta lo que sabe sobre este punto del mundo.",
  openGraph: {
    title: "KUDOS · Aquí",
    description:
      "La memoria del lugar donde estás.",
    type: "website",
  },
};

export default function AquiPage() {
  return <CapsuleEntry />;
}
