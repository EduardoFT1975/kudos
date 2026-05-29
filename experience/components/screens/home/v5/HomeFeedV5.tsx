"use client";
/**
 * KUDOS Home V2 · HomeFeedV5 refactor T3.2 EJEC Day 2.
 *
 * Estructura nueva (jerarquia estricta):
 *
 *   1. Header KUDOS (logo + search + avatar)
 *   2. CORE DEL DIA          (hero rotativo 7 Cores)
 *   3. HUMAN QUESTION        (pregunta del dia)
 *   4. DISCOVERY CHAIN       (3 POIs vinculados al Core de hoy)
 *   5. MEMORY PROMPT         (HDG Capa 4 · si aplica)
 *
 * Eliminado del flow original:
 *   - HeroBlock global rotativo
 *   - DestacadoCard (capsula destacada)
 *   - StoryRail "Para ti, hoy"
 *   - TimelineStoryRail
 *   - ErasCard
 *
 * Disciplina T3.1: 1 idea, 1 imagen, 1 accion en hero. Sin carruseles infinitos.
 */
import * as React from "react";
import { CoreDelDia } from "./CoreDelDia";
import { HumanQuestionCard } from "./HumanQuestionCard";
import { DiscoveryChain } from "./DiscoveryChain";
import { MemoryPrompt, type StaleSave } from "@/components/discovery/MemoryPrompt";
import { useDiscoverySignals } from "@/components/discovery/useDiscoverySignals";
import { useScrollDepth } from "@/components/discovery/useScrollDepth";
import { useTimeOnScreen } from "@/components/discovery/useTimeOnScreen";


export function HomeFeedV5() {
  const [stalePrompt, setStalePrompt] = React.useState<StaleSave | null>(null);

  // HDG · captura automatica
  useTimeOnScreen("home_feed_time_on_screen");
  useScrollDepth();
  useDiscoverySignals([], null);

  // Memory Engine · cargar stale saves (defensivo · solo cliente)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const API = process.env.NEXT_PUBLIC_KUDOS_API_URL;
      if (!API) {
        const saves = JSON.parse(localStorage.getItem("kudos:my_world") || "[]");
        const lastPromptKey = "kudos:memory_prompt:last";
        const lastPrompt = localStorage.getItem(lastPromptKey);
        const todayKey = new Date().toISOString().slice(0, 10);
        if (lastPrompt === todayKey) return;
        if (Array.isArray(saves) && saves.length >= 2) {
          const firstSave = saves[0];
          setStalePrompt({
            saveId: "offline-" + firstSave,
            poiId: firstSave,
            poiName: String(firstSave).replace(/^wd-/, "").replace(/-/g, " "),
            monthsAgo: 3,
          });
          localStorage.setItem(lastPromptKey, todayKey);
        }
        return;
      }
      const userId = localStorage.getItem("kudos:anon_id") || "anon";
      fetch(`${API}/api/save/memory/stale/${userId}?older_than_days=90&limit=1`)
        .then((r) => r.ok ? r.json() : [])
        .then((items: any[]) => {
          if (Array.isArray(items) && items.length > 0) {
            const s = items[0];
            setStalePrompt({
              saveId: s.id,
              poiId: s.poi_id,
              poiName: s.poi_id,
              monthsAgo: Math.max(1, Math.floor(
                (Date.now() - new Date(s.saved_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
              )),
            });
          }
        })
        .catch(() => {});
    } catch { /* silent */ }
  }, []);

  return (
    <div style={ROOT}>
      <Header />

      <ErrorBoundary fallback={<div style={ERR_FALLBACK}>Core del dia no disponible</div>}>
        <CoreDelDia />
      </ErrorBoundary>

      <ErrorBoundary fallback={null}>
        <HumanQuestionCard />
      </ErrorBoundary>

      <ErrorBoundary fallback={null}>
        <DiscoveryChain />
      </ErrorBoundary>

      {/* MemoryPrompt · HDG Capa 4 (defensivo) */}
      <ErrorBoundary fallback={null}>
        <MemoryPrompt
          staleSave={stalePrompt}
          onResponse={(r) => {
            try {
              const API = process.env.NEXT_PUBLIC_KUDOS_API_URL;
              if (API && stalePrompt && !stalePrompt.saveId.startsWith("offline-")) {
                fetch(`${API}/api/save/memory`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ save_id: stalePrompt.saveId, status: r }),
                }).catch(() => {});
              }
            } catch {}
            setStalePrompt(null);
          }}
          onDismiss={() => setStalePrompt(null)}
        />
      </ErrorBoundary>

      <FooterCalm />
    </div>
  );
}


/* ===================== ErrorBoundary minimalista ===================== */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.warn("[HomeFeedV5] subtree error", error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}


function Header() {
  return (
    <div style={HDR}>
      <div style={HDR_LOGO}>KUDOS</div>
      <div style={HDR_SUB}>La capa narrativa de la humanidad</div>
    </div>
  );
}


function FooterCalm() {
  return (
    <footer style={FOOTER}>
      <p style={FOOTER_TXT}>
        Un Core por dia. Sin prisa. Sin urgencia. Volveremos manana.
      </p>
    </footer>
  );
}


const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  paddingTop: 12, paddingBottom: 110, color: "#fff",
};
const HDR: React.CSSProperties = {
  padding: "8px 18px 14px",
};
const HDR_LOGO: React.CSSProperties = {
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontWeight: 700, fontSize: 22, letterSpacing: "0.18em", color: "#fff",
};
const HDR_SUB: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.42)",
  letterSpacing: "0.06em", marginTop: 2,
};
const ERR_FALLBACK: React.CSSProperties = {
  padding: 20, textAlign: "center" as const, color: "rgba(255,255,255,0.4)",
  fontSize: 12,
};
const FOOTER: React.CSSProperties = {
  marginTop: 36, padding: "20px 24px",
  textAlign: "center" as const,
};
const FOOTER_TXT: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 13, fontStyle: "italic",
  color: "rgba(255,255,255,0.35)", margin: 0,
};
