/**
 * /c/[id] - ruta corta para compartir capsula.
 *
 * - Genera metadata Open Graph + Twitter dinamica con foto del POI.
 * - T3.2 Day 25: usa /api/og/[id]?text=...&author=... para OG dinamico con reflexion.
 * - Redirige al /core/[id] si es Humanity Core, /poi/[id] si no.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import fs from "node:fs";
import path from "node:path";


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
  if (n.includes("acropolis")) return "La piedra que enseno a Europa a pensar.";
  if (n.includes("eiffel")) return "El hierro que iba a derribarse despues de 20 anos.";
  if (n.includes("pompeya")) return "La ciudad que el tiempo congelo en una manana.";
  return "Un lugar que merece ser descubierto.";
}


export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { text?: string; author?: string };
}): Promise<Metadata> {
  const cap = loadCapsule(params.id);
  const poiName = cap?.name || params.id;
  const description = cap ? evocativeFor(cap.name) : "Descubre por que esto importa.";
  const title = `${poiName} - KUDOS`;

  const q = new URLSearchParams();
  if (searchParams?.text) q.set("text", searchParams.text);
  if (searchParams?.author) q.set("author", searchParams.author);
  q.set("poi", poiName);
  const ogImage = `/api/og/${encodeURIComponent(params.id)}?${q.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title, description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title, description,
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

  if (CORE_BY_DAY.includes(params.id)) {
    redirect(`/core/${params.id}?via=share${refParam}`);
  }

  if (!cap) {
    redirect(`/poi/${params.id}?via=share${refParam}`);
  }
  redirect(`/poi/${params.id}?play=1&via=share${refParam}`);
}
