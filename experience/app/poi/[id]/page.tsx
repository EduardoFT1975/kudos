/**
 * /poi/[id] · KUDOS POI Node v5 (mockup GPT-5 / AXÓN 1.0).
 * Phase 1: placeholder. Phase 2: conectado a /api/world/poi/{id}/node.
 */
import type { Metadata } from "next";
import { PoiNodeV5 } from "@/components/screens/poi/v5/PoiNodeV5";

export const metadata: Metadata = {
  title: "KUDOS · POI",
};

export default function PoiPage({ params }: { params: { id: string } }) {
  return <PoiNodeV5 poiId={params.id} />;
}
