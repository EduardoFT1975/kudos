import type { Metadata } from "next";
import { PlaceScreen } from "@/components/screens/place/PlaceScreen";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lugar", description: "Vista profunda de un lugar KUDOS." };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlaceScreen slug={slug} />;
}
