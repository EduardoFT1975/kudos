import type { Metadata } from "next";
import { PoiScreen } from "@/components/screens/poi/PoiScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "POI · KUDOS",
  description: "Lugar canónico KUDOS · cápsulas, historia y rutas cercanas.",
};

export default async function PoiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PoiScreen slug={id} />;
}
