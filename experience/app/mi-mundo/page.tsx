/**
 * /mi-mundo - KUDOS Mi Mundo MVP - PROMPT 5/6.
 *
 * Pantalla rediseñada al 100% según maqueta:
 * 6 bloques: Hero · Stats · Guardados · Actividad · Cápsulas · Huella.
 *
 * MiMundoTabs (PersonalGraph + ShiftHistory) congelado en _postlaunch/mi-mundo-v5.
 */
import type { Metadata } from "next";
import { MiMundoMVP } from "@/components/screens/mi-mundo/mvp/MiMundoMVP";

export const metadata: Metadata = {
  title: "KUDOS - Mi Mundo",
  description: "Tu mapa personal de descubrimientos.",
};

export default function MiMundoPage() {
  return <MiMundoMVP />;
}
