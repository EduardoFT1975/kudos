import type { Metadata } from "next";
import { MemoriesScreen } from "@/components/screens/memories/MemoriesScreen";
export const metadata: Metadata = { title: "Mis Memorias", description: "Tu archivo personal." };
export default function Page() { return <MemoriesScreen />; }
