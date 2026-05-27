import type { Metadata } from "next";
import { SettingsScreen } from "@/components/screens/settings/SettingsScreen";
export const metadata: Metadata = { title: "Ajustes", description: "Tu cuenta KUDOS." };
export default function Page() { return <SettingsScreen />; }
