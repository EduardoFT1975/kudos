/**
 * /poi/[id] - KUDOS POI MVP - PROMPT 4/6.
 *
 * Pantalla POI rediseñada al 100% segun maqueta:
 * Hero + Cápsula + Datos clave + Historia + Timeline + Relacionados + KUDOS Mind.
 *
 * El PoiNodeV5 anterior queda congelado en _postlaunch/poi-v5/
 * con sus dependencias (ActionPotentialCard, RelatedHumanityRail, etc).
 */
import type { Metadata } from "next";
import { PoiMVP } from "@/components/screens/poi/mvp/PoiMVP";

interface Props { params: { id: string }; searchParams?: { play?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `KUDOS - ${params.id}`,
  };
}

export default function PoiPage({ params, searchParams }: Props) {
  const autoPlay = searchParams?.play === "1";
  return <PoiMVP poiId={params.id} autoPlayCapsule={autoPlay} />;
}
