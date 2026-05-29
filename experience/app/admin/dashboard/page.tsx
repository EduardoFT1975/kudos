/**
 * KUDOS Admin Dashboard · T3.2 EJEC Day 10.
 *
 * Dashboard interno con las 5 metricas clave del MVP.
 * Acceso: solo equipo (Eduardo + GPT-5 + CTO).
 * Token X-Admin-Token se introduce manualmente en localStorage.
 *
 * NO publico. NO indexable.
 */
import { AdminDashboard } from "@/components/screens/admin/AdminDashboard";

export const metadata = {
  title: "KUDOS · Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
