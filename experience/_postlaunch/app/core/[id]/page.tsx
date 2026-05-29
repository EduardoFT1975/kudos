/**
 * KUDOS Core Engine page · T3.2 EJEC Day 3.
 *
 * /core/[id] -- pagina dedicada para los 7 Humanity Core.
 * Diferente de /poi/[id] (que es generico para cualquier POI).
 *
 * Estructura: CoreScreen renderiza narrativa Core + Discovery Shift Card + tracking.
 */
import { CoreScreen } from "@/components/screens/core/CoreScreen";


interface Params { params: Promise<{ id: string }>; }


// Metadata por Core (Open Graph para shares)
const CORE_META: Record<string, { title: string; description: string }> = {
  "wd-Q174045":  { title: "Olduvai Gorge · KUDOS",  description: "Aqui descubrimos que no eramos los unicos." },
  "wd-Q1090052": { title: "Gobekli Tepe · KUDOS",   description: "Antes de la rueda, antes de la escritura, antes de la agricultura, alguien construyo esto." },
  "wd-Q189780":  { title: "Lascaux · KUDOS",        description: "Antes de saber escribir, ya sabiamos pintar lo que amabamos." },
  "wd-Q1218":    { title: "Jerusalen · KUDOS",      description: "En 0,9 km cuadrados se concentra la mitad de la fe humana." },
  "wd-Q42797":   { title: "Galapagos · KUDOS",      description: "En cinco semanas, un joven de 26 anos entendio que la vida cambia." },
  "wd-Q1737":    { title: "Apollo 11 · KUDOS",      description: "La huella de Armstrong sigue intacta. Durara un millon de anos." },
  "wd-Q176330":  { title: "Hiroshima · KUDOS",      description: "Una sola bomba mato a 80.000 personas en 9 segundos." },
};


export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const meta = CORE_META[id];
  if (!meta) return { title: "KUDOS · La capa narrativa de la humanidad" };
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}


export default async function CorePage({ params }: Params) {
  const { id } = await params;
  return <CoreScreen poiId={id} />;
}
