/**
 * KUDOS Experience · /capsules/[slug]
 *
 * Server Component. Resuelve la cápsula desde el registry curado
 * (`lib/capsules/`). Si no existe → 404 cinemático.
 *
 * Cuando AXÓN exponga /api/capsules/<uid>/ con shape completo, este
 * loader pasa de leer el registry a hacer fetch sin tocar el resto.
 */
import { notFound } from "next/navigation";
import { getCapsuleBySlug, getAllCapsuleSlugs } from "@/lib/capsules";
import { CapsuleExperience } from "@/features/capsule/CapsuleExperience";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Permite SSG para las cápsulas conocidas en el MVP.
export async function generateStaticParams() {
  return getAllCapsuleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const capsule = getCapsuleBySlug(slug);
  if (!capsule) {
    return {
      title: "Cápsula no encontrada · KUDOS",
      description: "Esta cápsula todavía no existe en el universo KUDOS.",
    };
  }
  return {
    title: `${capsule.hero.title} · ${capsule.hero.era_label} · KUDOS`,
    description: capsule.hero.micro_context,
    openGraph: {
      title: `${capsule.hero.title} · KUDOS`,
      description: capsule.hero.micro_context,
      type: "article",
    },
  };
}

export default async function CapsulePage({ params }: PageProps) {
  const { slug } = await params;
  const capsule = getCapsuleBySlug(slug);
  if (!capsule) notFound();
  return <CapsuleExperience capsule={capsule} />;
}
