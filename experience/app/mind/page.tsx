import type { Metadata } from "next";
import { MindScreen } from "@/components/screens/mind/MindScreen";
export const metadata: Metadata = { title: "KUDOS Mind", description: "IA contextual · pregunta cualquier eco." };
export default function MindPage() { return <MindScreen />; }
