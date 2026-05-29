import type { Metadata } from "next";
import { MomentsScreen } from "@/components/screens/moments/MomentsScreen";
export const metadata: Metadata = { title: "Momentos", description: "Captura momentos." };
export default function Page() { return <MomentsScreen />; }
