import type { Metadata } from "next";
import { DesignSystemScreen } from "@/components/screens/DesignSystemScreen";

export const metadata: Metadata = {
  title: "Design System",
  description: "Referencia visual KUDOS · tokens, componentes y motion.",
};

export default function DSPage() {
  return <DesignSystemScreen />;
}
