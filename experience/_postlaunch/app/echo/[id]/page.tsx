import { redirect } from "next/navigation";
import { echoBySlug } from "@/lib/mocks-v2/fixtures";

/**
 * /echo/[id] - legacy capsule route - now redirects to canonical /poi/[placeId].
 * Kept for backwards compatibility of any external shares pointing here.
 */
export const dynamic = "force-dynamic";

export default async function EchoLegacyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const echo = echoBySlug(id);
  if (echo) {
    redirect(`/poi/${encodeURIComponent(echo.placeId)}`);
  }
  redirect(`/inicio`);
}
