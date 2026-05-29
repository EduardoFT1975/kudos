"use client";
/**
 * KUDOS - PoiMVP - PROMPT 4/6.
 *
 * Composer principal de la pantalla POI MVP. 7 bloques en orden:
 *   1. Hero
 *   2. Cápsula destacada
 *   3. Datos clave
 *   4. Historia
 *   5. Timeline
 *   6. Cápsulas relacionadas
 *   7. KUDOS Mind
 *
 * NO contiene (CONGELADOS):
 *   - Discovery Shift badges/cards
 *   - Humanity Core widgets
 *   - Transformation Layer
 *   - Merit Engine visible
 *   - NQS / DRR / Story Score visibles
 *   - Action Potential cards (T3.1)
 *   - Related Humanity Rail (Core-only)
 *
 * Reutiliza usePoiData + usePoiCapsuleMeta + useNarratives.
 */
import * as React from "react";
import { usePoiData } from "@/components/discovery/usePoiData";
import { useNarratives } from "@/components/discovery/useNarratives";

import { PoiHero } from "./PoiHero";
import { PoiTabs } from "./PoiTabs";
import { PoiCapsule } from "./PoiCapsule";
import { PoiDatosClave, type DataItem } from "./PoiDatosClave";
import { PoiHistoria } from "./PoiHistoria";
import { PoiTimeline } from "./PoiTimeline";
import { PoiRelacionados, type RelatedItem } from "./PoiRelacionados";
import { PoiKudosMind } from "./PoiKudosMind";
import { PoiActionBar } from "./PoiActionBar";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface CapsuleMeta {
  poi?: { id?: string; name?: string; image_url?: string; tier?: string; country_code?: string; category?: string; unesco?: boolean };
  classification?: { recipe?: { duration_seconds?: number } };
  scenes?: any[];
  narrative?: { title?: string; subtitle?: string; body?: string };
}


interface Props {
  poiId: string;
  autoPlayCapsule?: boolean;
}


function loadCapsuleMeta(poiId: string): Promise<CapsuleMeta | null> {
  return fetch(`/capsules/${poiId}/metadata.json`, { cache: "force-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}


/** Datos clave hardcoded por POI (fallback general). */
const KEY_DATA_BY_POI: Record<string, DataItem[]> = {
  "wd-Q10285": [
    { icon: "🏛", label: "Construido",  value: "70-80 d.C." },
    { icon: "🏛", label: "Emperador",   value: "Vespasiano" },
    { icon: "👥", label: "Capacidad",   value: "50.000-80.000 espectadores" },
    { icon: "🏛", label: "Uso",          value: "Juegos, combates y espectáculos públicos" },
  ],
  "wd-Q12892": [
    { icon: "🏛", label: "Construido",  value: "Siglo XIII" },
    { icon: "👑", label: "Dinastía",    value: "Nazarí" },
    { icon: "🌍", label: "Patrimonio",  value: "UNESCO desde 1984" },
  ],
  "wd-Q131013": [
    { icon: "🏛", label: "Construido",  value: "Siglo V a.C." },
    { icon: "👤", label: "Arquitecto",  value: "Iktinos y Calícrates" },
    { icon: "🌍", label: "Patrimonio",  value: "UNESCO desde 1987" },
  ],
};


export function PoiMVP({ poiId, autoPlayCapsule }: Props) {
  const { poi } = usePoiData(poiId);
  const { narratives } = useNarratives(poiId);
  const [capMeta, setCapMeta] = React.useState<CapsuleMeta | null>(null);
  const [related, setRelated] = React.useState<RelatedItem[]>([]);
  const [isSaved, setIsSaved] = React.useState(false);

  // Cargar metadata cápsula
  React.useEffect(() => {
    loadCapsuleMeta(poiId).then(setCapMeta);
  }, [poiId]);

  // Cargar relacionados desde /api/discover/ (mismo país o categoría)
  React.useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/discover/?limit_for_you=12`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.for_you) return;
        const items: RelatedItem[] = j.for_you
          .filter((c: any) => c.poi_id !== poiId)
          .slice(0, 8)
          .map((c: any) => ({
            poi_id: c.poi_id,
            name: c.title,
            image_url: c.image_url,
            distance_label: c.location,
            category: c.category,
          }));
        setRelated(items);
      })
      .catch(() => {});
  }, [poiId]);

  // Save state (lectura local; el backend hace el resto via AddToMyWorldButton dispatch)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("kudos:saves:anon") || "[]";
      const arr: string[] = JSON.parse(raw);
      setIsSaved(arr.includes(poiId));
    } catch {}
  }, [poiId]);

  const handleSave = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("kudos:saves:anon") || "[]";
      const arr: string[] = JSON.parse(raw);
      const next = arr.includes(poiId) ? arr.filter((x) => x !== poiId) : [...arr, poiId];
      localStorage.setItem("kudos:saves:anon", JSON.stringify(next));
      setIsSaved(next.includes(poiId));
    } catch {}
  }, [poiId]);

  const handleShare = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("kudos:share-capsule:open", {
      detail: {
        capsuleId: poiId,
        poiName: poi?.name,
        location: poi?.country,
        image: poi?.image_url,
        evocative: poi?.short_description,
        durationS: capMeta?.classification?.recipe?.duration_seconds || 15,
      },
    }));
  }, [poiId, poi, capMeta]);

  // Narrativa fallback
  const firstNarr = narratives && narratives.length > 0 ? narratives[0] : null;
  const historyTitle =
    capMeta?.narrative?.title || firstNarr?.title || `${poi?.name || ""}: lo que pocas veces se cuenta`;
  const historySubtitle =
    capMeta?.narrative?.subtitle || firstNarr?.hook || "";
  const historyBody =
    capMeta?.narrative?.body || poi?.short_description || "";

  const keyData = KEY_DATA_BY_POI[poiId] || [
    ...(poi?.country ? [{ icon: "🌍", label: "Ubicación", value: poi.country }] : []),
    ...(poi?.category ? [{ icon: "🏛", label: "Categoría", value: poi.category }] : []),
  ];

  return (
    <div style={ROOT}>
      <PoiHero
        poiId={poiId}
        name={poi?.name || poiId}
        category={poi?.category || ""}
        country={poi?.country || ""}
        flag={poi?.flag}
        shortDescription={poi?.short_description}
        imageUrl={poi?.image_url}
        tags={inferTags(poi)}
        onShare={handleShare}
        onSave={handleSave}
        isSaved={isSaved}
      />

      <PoiTabs />

      <div id="poi-capsule">
        <PoiCapsule
          poiId={poiId}
          imageUrl={poi?.image_url}
          durationS={capMeta?.classification?.recipe?.duration_seconds || 15}
          shortTitle={firstNarr?.title || "Lo que esta cápsula te cuenta"}
          autoPlay={autoPlayCapsule}
        />
      </div>

      {keyData.length > 0 && <PoiDatosClave items={keyData} />}

      {historyBody && (
        <div id="poi-historia">
          <PoiHistoria
            title={historyTitle}
            subtitle={historySubtitle}
            body={historyBody}
          />
        </div>
      )}

      <div id="poi-timeline">
        <PoiTimeline poiId={poiId} poiImageUrl={poi?.image_url} />
      </div>

      {related.length > 0 && <PoiRelacionados items={related} />}

      <div id="poi-mind">
        <PoiKudosMind
          poiId={poiId}
          poiName={poi?.name || poiId}
          shortDescription={poi?.short_description}
          historyTitle={historyTitle}
          historyBody={historyBody}
        />
      </div>

      <PoiActionBar
        poiId={poiId}
        poiName={poi?.name || poiId}
        isSaved={isSaved}
        onSave={handleSave}
        onShare={handleShare}  />
    </div>
  );
}


function inferTags(poi: any): string[] {
  if (!poi) return [];
  const tags: string[] = [];
  if (poi.category) tags.push(String(poi.category).split(" ")[0]);
  if (poi.country) tags.push(poi.country);
  if (poi.tier === "S") tags.push("Imprescindible");
  return tags.slice(0, 3);
}


const ROOT: React.CSSProperties = {
  background: "#0a0814",
  color: "#fff",
  minHeight: "100vh",
  paddingBottom: 110,
  fontFamily: '"Poppins", system-ui, sans-serif',
};
