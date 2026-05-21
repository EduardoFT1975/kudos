/**
 * KUDOS Experience · /mis-memorias (Personal Memory Graph · P0.9)
 *
 * Surface de lectura del memory store local. Renderiza las cápsulas que
 * el usuario marcó con "Recordar" desde cualquier CapsuleSuccess. Datos
 * viven en localStorage · cero backend · cero login.
 *
 * Server component shell · todo el state vive en MemoryGraph (client).
 *
 * Diseño deliberado:
 *   - Slug en español ("/mis-memorias") · consistente con /aqui, /mapa,
 *     /descubrir. Evita anglicismos en surface principal.
 *   - dynamic=force-dynamic porque el contenido cambia por usuario y no
 *     queremos cachear · aunque el componente client hace toda la lectura.
 *   - metadata.robots:noindex porque es vista personal · no debe indexarse.
 */
import { MemoryGraph } from "@/features/memory/MemoryGraph";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mis memorias · KUDOS",
  description:
    "Los lugares que has recordado en KUDOS. Tu mapa personal de memoria · solo en este navegador.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Mis memorias · KUDOS",
    description: "Tu mapa personal de memoria en KUDOS.",
    type: "website",
  },
};

export default function MisMemoriasPage() {
  return <MemoryGraph />;
}
