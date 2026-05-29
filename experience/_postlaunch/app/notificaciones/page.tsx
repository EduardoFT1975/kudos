import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/screens/notifications/NotificationsScreen";
export const metadata: Metadata = { title: "Notificaciones", description: "Inbox KUDOS." };
export default function Page() { return <NotificationsScreen />; }
