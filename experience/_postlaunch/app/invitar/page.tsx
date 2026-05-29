import type { Metadata } from "next";
import { InviteScreen } from "@/components/screens/invite/InviteScreen";
export const metadata: Metadata = { title: "Invitar amigos", description: "Comparte KUDOS." };
export default function Page() { return <InviteScreen />; }
