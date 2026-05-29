/**
 * /c/[id] · ruta corta para compartir cápsula.
 *
 * - Genera metadata Open Graph + Twitter dinámica con foto del POI.
 * - Sirve preview rico cuando se comparte en WhatsApp · Twitter · LinkedIn · etc.
 * - Redirige al /world?capsule=ID donde se reproduce.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import fs from "node:fs";
import path from "node:path";


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
  if (n.includes("coliseo")) return "Donde el Imperio se convirtió en leyenda.";
  if (n.includes("alhambra")) return "Donde Al-Ándalus guardó su último suspiro.";
  if (n.includes("sagrada familia")) return "Una catedral aún sin terminar después de 140 años.";
  if (n.includes("acrópolis")) return "La piedra que enseñó a Europa a pensar.";
  if (n.includes("foro romano")) return "El centro de un imperio que decidió el mundo.";
  if (n.includes("notre-dame") || n.includes("notre dame")) return "La piedra que sobrevivió a su propio incendio.";
  if (n.includes("eiffel")) return "El hierro que iba a derribarse después de 20 años.";
  if (n.includes("pompeya")) return "La ciudad que el tiempo congeló en una mañana.";
  return "Un lugar que merece ser descubierto.";
}


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cap = loadCapsule(params.id);
  if (!cap) {
    return {
      title: "Cápsula no encontrada · KUDOS",
      description: "Esta cápsula aún no está disponible.",
    };
  }

  const title = `${cap.name} · KUDOS`;
  const description = evocativeFor(cap.name);
  // OG image · cuando tengamos generador og:image dinámico, usar /api/og/[id]
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


export default function CapsulePage({ params }: { params: { id: string } }) {
  const cap = loadCapsule(params.id);
  if (!cap) {
    return (
      <div style={{ padding: 60, textAlign: "center" as const, background: "#0a0814", color: "#fff", minHeight: "100vh" }}>
        <h1>Cápsula no encontrada</h1>
        <p>Esta cápsula aún no está disponible.</p>
        <a href="/inicio" style={{ color: "#8B6BFF" }}>← Volver a KUDOS</a>
      </div>
    );
  }
  // Redirigir al POI · el video player se abrirá automáticamente
  redirect(`/poi/${params.id}?play=1`);
}
