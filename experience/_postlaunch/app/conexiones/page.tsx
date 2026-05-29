import type { Metadata } from "next";
import { ConnectionsScreen } from "@/components/screens/connections/ConnectionsScreen";
export const metadata: Metadata = { title: "Conexiones", description: "Tu red KUDOS." };
export default function Page() { return <ConnectionsScreen />; }
