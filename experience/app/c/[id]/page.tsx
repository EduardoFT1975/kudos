/**
 * /c/[id] · ruta corta para compartir cápsula.
 *
 * - Genera metadata Open Graph + Twitter dinámica con foto del POI.
 * - Sirve preview rico cuando se comparte en WhatsApp · Twitter · LinkedIn · etc.
 * - Redirige al /core/[id] si es Humanity Core, /poi/[id] si no.
 * - T3.2 EJEC Day 17: añade ?ref=<userId> + ?via=share tracking.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import fs from "node:fs";
import path from "node:path";


// Humanity Core poi_ids (rota Lun-Dom) · alineado con backend selector.py
const CORE_BY_DAY = [
  "wd-Q174045", "wd-Q1090052", "wd-Q189780", "wd-Q1218",
  "wd-Q42797",  "wd-Q1737",    "wd-Q176330",
];


interface CapsuleMeta {
  name: string;
  url: string;
  meta_url?: string;
  tier: string;
}

interface CapsulesIndex {
  capsules: Record<string, CapsuleMeta>;
}


function loadCapsule(id: string): CapsuleMeta | null {
  try {
    const fp = path.join(process.cwd(), "public", "capsules", "index.json");
    const raw = fs.readFileSync(fp, "utf-8");
    const idx: CapsulesIndex = JSON.parse(raw);
    return idx.capsules?.[id] ?? null;
  } catch {
    return null;
  }
}


function evocativeFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("coliseo")) return "Donde el Imperio se convirtio en leyenda.";
  if (n.includes("alhambra")) return "Donde Al-Andalus guardo su ultimo suspiro.";
  if (n.includes("sagrada familia")) return "Una catedral aun sin terminar despues de 140 anos.";
  if (n.includes("acropolis")) return "La piedra que enseno a Europa a pensar.";
  if (n.includes("foro romano")) return "El centro de un imperio que decidio el mundo.";
  if (n.includes("notre-dame") || n.includes("notre dame")) return "La piedra que sobrevivio a su propio incendio.";
  if (n.includes("eiffel")) return "El hierro que iba a derribarse despues de 20 anos.";
  if (n.includes("pompeya")) return "La ciudad que el tiempo congelo en una manana.";
  return "Un lugar que merece ser descubierto.";
}


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cap = loadCapsule(params.id);
  if (!cap) {
    return {
      title: "Capsula no encontrada KUDOS",
      description: "Esta capsula aun no esta disponible.",
    };
  }

  const title = `${cap.name} KUDOS`;
  const description = evocativeFor(cap.name);
  const ogImage = "/brand/kudos-logo-vertical.svg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "video.other",
      videos: cap.url ? [{ url: cap.url, width: 1080, height: 1920 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}


export default function CapsulePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { ref?: string };
}) {
  const cap = loadCapsule(params.id);
  const refParam = searchParams?.ref ? `&ref=${encodeURIComponent(searchParams.ref)}` : "";

  // Si es Humanity Core -> /core/[id]?via=share
  if (CORE_BY_DAY.includes(params.id)) {
    redirect(`/core/${params.id}?via=share${refParam}`);
  }

  if (!cap) {
    // POI desconocido -> intentamos poi/[id] de todas formas
    redirect(`/poi/${params.id}?via=share${refParam}`);
  }
  // Capsula video tradicional, el player se abrira automaticamente
  redirect(`/poi/${params.id}?play=1&via=share${refParam}`);
}
