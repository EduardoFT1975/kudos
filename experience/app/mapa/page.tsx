/**
 * /mapa · DEPRECATED · redirige a /world (KUDOS World Engine).
 * Mantenemos la ruta solo por compatibilidad con enlaces externos antiguos.
 */
import { redirect } from "next/navigation";

export default function MapaPage(): never {
  redirect("/world");
}
