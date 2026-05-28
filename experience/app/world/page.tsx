/**
 * KUDOS · /world
 * Nueva pantalla del WORLD ENGINE.
 * Vive en paralelo a /mapa (que queda como demo legacy).
 */
import type { Metadata } from "next";
import { WorldEngine } from "@/components/world-engine/WorldEngine";

export const metadata: Metadata = {
  title: "KUDOS · World",
  description: "El primer mapa emocional, contextual y vivo del planeta.",
};

export default function WorldPage() {
  return <WorldEngine />;
}
