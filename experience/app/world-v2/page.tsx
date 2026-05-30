/**
 * /world-v2 · DEPRECATED tras T6.4.A.
 * Redirige a /world (que ya sirve el mapa real con WorldUniversalLayer).
 * Mantengo la ruta solo para compatibilidad con bookmarks de la fase alpha.
 */
import { redirect } from "next/navigation";

export default function WorldV2Page(): never {
  redirect("/world");
}
