"use client";
/**
 * KUDOS HomeFeed v5 · master component
 *
 * Implementa el mockup de GPT-5 (AXÓN 1.0):
 *   - Hero block con frase evocadora rotativa
 *   - Card destacado (1ª cápsula del index)
 *   - Carrusel "Para ti, hoy"
 *   - Card "Historias que conectan épocas" (placeholder)
 *
 * Reemplaza el HomeScreen anterior. El viejo va a /inicio-legacy.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { HeroBlock } from "./HeroBlock";
import { DestacadoCard } from "./DestacadoCard";
import { StoryRail } from "./StoryRail";
import { ErasCard } from "./ErasCard";
import type { CapsulesIndex } from "./types";
import { MemoryPrompt, type StaleSave } from "@/components/discovery/MemoryPrompt";
import { useDiscoverySignals } from "@/components/discovery/useDiscoverySignals";


export function HomeFeedV5() {
  const router = useRouter();
  const [index, setIndex] = React.useState<CapsulesIndex | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = React.useState<string | null>(null);
  const [stalePrompt, setStalePrompt] = React.useState<StaleSave | null>(null);

  // Cargar manifest de cápsulas
  React.useEffect(() => {
    fetch("/capsules/index.json", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (j) setIndex(j); })
      .catch(() => { /* sin cápsulas · placeholder */ });
  }, []);

  // HDG · Capa 4 · Memory Engine · cargar stale saves al mount
  React.useEffect(() => {
    const API = process.env.NEXT_PUBLIC_KUDOS_API_URL;
    if (!API) {
      // Offline mode · simular desde localStorage
      try {
        const k = "kudos:my_world";
        const saves = JSON.parse(localStorage.getItem(k) || "[]");
        const lastPromptKey = "kudos:memory_prompt:last";
        const lastPrompt = localStorage.getItem(lastPromptKey);
        const todayKey = new Date().toISOString().slice(0, 10);
        if (lastPrompt === todayKey) return;       // ya mostrado hoy
        if (saves.length >= 2) {
          // Simular un MemoryPrompt offline para que el usuario vea el flujo
          const firstSave = saves[0];
          setStalePrompt({
            saveId: "offline-" + firstSave,
            poiId: firstSave,
            poiName: firstSave.replace(/^wd-/, "").replace(/-/g, " "),
            monthsAgo: 3,
          });
          localStorage.setItem(lastPromptKey, todayKey);
        }
      } catch {}
      return;
    }

    // Con API · fetch real
    const userId = localStorage.getItem("kudos:anon_id") || "anon";
    fetch(`${API}/api/save/memory/stale/${userId}?older_than_days=90&limit=1`)
      .then((r) => r.ok ? r.json() : [])
      .then((items: any[]) => {
        if (items.length > 0) {
          const s = items[0];
          setStalePrompt({
            saveId: s.id,
            poiId: s.poi_id,
            poiName: s.poi_id,    // backend devolverá nombre cuando esté join
            monthsAgo: Math.floor((Date.now() - new Date(s.saved_at).getTime()) / (1000 * 60 * 60 * 24 * 30)),
          });
        }
      })
      .catch(() => {});
  }, []);

  // HDG · Capa 1 · Discovery Event Engine · captura poi_view de cápsulas visibles
  const visibleCapsuleIds = React.useMemo(
    () => Object.keys(index?.capsules || {}).slice(0, 10),
    [index]
  );
  useDiscoverySignals(visibleCapsuleIds, activeVideoUrl);

  const capsules = index?.capsules || {};
  const ids = Object.keys(capsules);
  const destacadoId = ids[0] || null;
  const destacado = destacadoId ? capsules[destacadoId] : null;
  const railItems = ids.slice(1, 7).map((id) => ({ id, capsule: capsules[id] }));

  const playCapsule = (id: string) => {
    const cap = capsules[id];
    if (cap?.url) setActiveVideoUrl(cap.url);
  };

  const saveCapsule = (id: string) => {
    try {
      const k = "kudos:saves";
      const saves = JSON.parse(localStorage.getItem(k) || "[]");
      if (!saves.includes(id)) {
        saves.push(id);
        localStorage.setItem(k, JSON.stringify(saves));
      }
    } catch {}
  };

  return (
    <div style={ROOT}>
      <Header />
      <HeroBlock onNavigateToMap={() => router.push("/world")} />

      <DestacadoCard
        capsuleId={destacadoId}
        capsule={destacado}
        onPlay={() => destacadoId && playCapsule(destacadoId)}
        onSave={() => destacadoId && saveCapsule(destacadoId)}
      />

      <StoryRail
        title="Para ti, hoy"
        items={railItems}
        onPlay={playCapsule}
        onSeeAll={() => router.push("/world")}
      />

      <ErasCard />

      {/* MemoryPrompt · HDG Capa 4 */}
      <MemoryPrompt
        staleSave={stalePrompt}
        onResponse={(r) => {
          const API = process.env.NEXT_PUBLIC_KUDOS_API_URL;
          if (API && stalePrompt && !stalePrompt.saveId.startsWith("offline-")) {
            fetch(`${API}/api/save/memory`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ save_id: stalePrompt.saveId, status: r }),
            }).catch(() => {});
          }
          setStalePrompt(null);
        }}
        onDismiss={() => setStalePrompt(null)}
      />

      {/* Video Player Modal */}
      {activeVideoUrl && (
        <div style={VIDEO_BACKDROP} onClick={() => setActiveVideoUrl(null)}>
          <div style={VIDEO_FRAME} onClick={(e) => e.stopPropagation()}>
            <button style={VIDEO_CLOSE} onClick={() => setActiveVideoUrl(null)} aria-label="Cerrar">×</button>
            <video
              src={activeVideoUrl}
              controls autoPlay playsInline
              style={{ width: "100%", height: "auto", maxHeight: "85vh", display: "block", borderRadius: 16 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


function Header() {
  return (
    <div style={HDR}>
      <div style={HDR_LOGO}>KUDOS</div>
      <div style={HDR_RIGHT}>
        <button style={HDR_BTN} aria-label="Buscar">
          <span style={{ fontSize: 14 }}>⌕</span>
        </button>
        <div style={HDR_AVATAR} />
      </div>
    </div>
  );
}


const ROOT: React.CSSProperties = {
  background: "#0a0814",
  minHeight: "100vh",
  paddingBottom: 80,
  color: "#fff",
};

const HDR: React.CSSProperties = {
  position: "absolute",
  top: 0, left: 0, right: 0, zIndex: 5,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 18px",
  pointerEvents: "none",
};
const HDR_LOGO: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: "0.18em",
  color: "#fff",
  pointerEvents: "auto",
};
const HDR_RIGHT: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  pointerEvents: "auto",
};
const HDR_BTN: React.CSSProperties = {
  width: 38, height: 38, borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(8px)",
};
const HDR_AVATAR: React.CSSProperties = {
  width: 38, height: 38, borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #E0815A 100%)",
  border: "2px solid rgba(255,255,255,0.18)",
};


const VIDEO_BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.92)",
  zIndex: 9000,
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(8px)",
};
const VIDEO_FRAME: React.CSSProperties = {
  width: "100%", maxWidth: 420,
  background: "#000", borderRadius: 16, overflow: "hidden", position: "relative",
};
const VIDEO_CLOSE: React.CSSProperties = {
  position: "absolute", top: 10, right: 12, zIndex: 10,
  width: 32, height: 32, borderRadius: "50%",
  background: "rgba(255,255,255,0.18)", color: "#fff",
  border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
