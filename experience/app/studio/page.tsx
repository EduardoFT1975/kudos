import type { Metadata } from "next";
import { StudioScreen } from "@/components/screens/studio/StudioScreen";
export const metadata: Metadata = { title: "Studio", description: "Crea cápsulas virales." };
export default function StudioPage() { return <StudioScreen />; }
