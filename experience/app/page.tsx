/**
 * KUDOS · root redirect to /inicio
 *
 * /inicio es la nueva home oficial. La raíz redirige siempre.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RootPage(): never {
  redirect("/inicio");
}
