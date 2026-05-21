/**
 * KUDOS Experience · /time/rome (Time Machine · Roma)
 *
 * Entry point del slice del Time Machine. Server Component minimalista —
 * todo el state vive en `<TimeMachine>` (client).
 *
 * Métrica: el primer asombro debe llegar < 5s del aterrizaje.
 */
import { TimeMachine } from "@/features/time-machine/TimeMachine";

export const metadata = {
  title: "Roma · Time Machine · KUDOS",
  description:
    "Navega 3000 años de Roma. Cinco eras, cinco hotspots, una sola ciudad. La interfaz hace visible el tiempo sobre el mundo físico.",
  openGraph: {
    title: "Roma · Time Machine · KUDOS",
    description:
      "Navega 3000 años de Roma. Cinco eras, cinco hotspots, una sola ciudad.",
    type: "website",
  },
};

export default function RomaTimePage() {
  return <TimeMachine />;
}
