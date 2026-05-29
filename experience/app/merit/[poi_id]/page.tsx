/**
 * /merit/[poi_id] · KUDOS Merit Engine v5 (mockup GPT-5).
 * Phase 1: placeholder. Phase 2: conectado a /api/merit + /api/signals.
 */
import type { Metadata } from "next";
import { MeritEngineV5 } from "@/components/screens/merit/v5/MeritEngineV5";

export const metadata: Metadata = {
  title: "KUDOS · Mérito",
};

export default function MeritPage({ params }: { params: { poi_id: string } }) {
  return <MeritEngineV5 poiId={params.poi_id} />;
}
