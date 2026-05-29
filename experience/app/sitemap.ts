/**
 * KUDOS · sitemap.xml dinámico (Next.js metadata).
 *
 * Lista todas las rutas públicas + las cápsulas reales generadas
 * para que Google las indexe.
 */
import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";


const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://kudos-frontend-rsi3.onrender.com";


function loadCapsuleIds(): string[] {
  try {
    const fp = path.join(process.cwd(), "public", "capsules", "index.json");
    const raw = fs.readFileSync(fp, "utf-8");
    const idx = JSON.parse(raw);
    return Object.keys(idx?.capsules || {});
  } catch {
    return [];
  }
}


export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE}/inicio`, lastModified: today, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/world`,  lastModified: today, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/mi-mundo`, lastModified: today, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/guardados`, lastModified: today, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/perfil`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
  ];

  const capsuleIds = loadCapsuleIds();
  const capsuleEntries: MetadataRoute.Sitemap = capsuleIds.map((id) => ({
    url: `${SITE}/c/${id}`,
    lastModified: today,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const poiEntries: MetadataRoute.Sitemap = capsuleIds.map((id) => ({
    url: `${SITE}/poi/${id}`,
    lastModified: today,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...base, ...capsuleEntries, ...poiEntries];
}
