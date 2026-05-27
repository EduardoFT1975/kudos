import type { Metadata } from "next";
import { TimelineScreen } from "@/components/screens/timeline/TimelineScreen";
export const metadata: Metadata = { title: "Línea de Tiempo", description: "Viaja por las eras." };
export default function TimelinePage() { return <TimelineScreen />; }
