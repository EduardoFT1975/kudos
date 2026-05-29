"use client";
/**
 * KUDOS · /guardados v5 · mapa personal de saves.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMyWorld } from "@/components/discovery/useMyWorld";


export function GuardadosV5() {
  const router = useRouter();
  const { saves, remove, loading, count } = useMyWorld();

  return (
    <div style={ROOT}>
      <header style={HDR}>
        <button style={BACK} onClick={() => router.back()}>‹ Volver</button>
        <div style={HDR_TITLE}>Guardados</div>
        <div style={{ width: 60 }} />
      </header>

      <section style={HERO}>
        <h1 style={H1}>Tu colección</h1>
        <p style={LEAD}>
          {count === 0 ? "Cada cosa que guardes aparece aquí." : `${count} ${count === 1 ? "lugar guardado" : "lugares guardados"}.`}
        </p>
      </section>

      {loading && <div style={LOADING}>Cargando tu mundo...</div>}

      {!loading && count === 0 && <EmptyState />}

      {!loading && count > 0 && (
        <div style={GRID}>
          {saves.map((id) => (
            <SaveCard key={id} poiId={id} onRemove={() => remove(id)}
                      onOpen={() => router.push(`/poi/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}


function SaveCard({ poiId, onRemove, onOpen }: {
  poiId: string; onRemove: () => void; onOpen: () => void;
}) {
  // Nombre legible desde el id (placeholder · cuando tengamos cache POI real, mejor)
  const name = poiId.replace(/^wd-Q/, "").replace(/-/g, " ");
  return (
    <div style={CARD} onClick={onOpen}>
      <div style={CARD_HERO} />
      <div style={CARD_BODY}>
        <div style={CARD_NAME}>{name.length > 30 ? name.slice(0, 28) + "…" : name}</div>
        <button style={CARD_REMOVE} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          Quitar
        </button>
      </div>
    </div>
  );
}


function EmptyState() {
  return (
    <div style={EMPTY}>
      <div style={EMPTY_ICON}>🌍</div>
      <h3 style={EMPTY_TITLE}>Tu mundo empieza vacío</h3>
      <p style={EMPTY_DESC}>
        Cuando descubras un lugar que te resuene, pulsa <strong style={{ color: "#8B6BFF" }}>"Añadir a Mi Mundo"</strong>.
        Aparecerá aquí.
      </p>
    </div>
  );
}


const ROOT: React.CSSProperties = {
  background: "#0a0814", minHeight: "100vh",
  color: "#fff", paddingBottom: 100,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

const HDR: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 22px",
  position: "sticky", top: 0, zIndex: 10,
  background: "rgba(10,8,20,0.85)",
  backdropFilter: "blur(10px)",
};
const BACK: React.CSSProperties = {
  background: "transparent", border: "none", color: "#fff",
  fontSize: 14, cursor: "pointer", fontFamily: 'inherit',
};
const HDR_TITLE: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 17, fontWeight: 400, color: "#fff",
};

const HERO: React.CSSProperties = { padding: "24px 22px 18px" };
const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 40, fontWeight: 400, lineHeight: 1.1,
};
const LEAD: React.CSSProperties = {
  margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)",
};

const LOADING: React.CSSProperties = {
  textAlign: "center" as const, padding: "60px 20px",
  color: "rgba(255,255,255,0.5)", fontSize: 13,
};

const EMPTY: React.CSSProperties = {
  textAlign: "center" as const, padding: "80px 24px",
};
const EMPTY_ICON: React.CSSProperties = {
  fontSize: 56, marginBottom: 14, opacity: 0.7,
};
const EMPTY_TITLE: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 24, fontWeight: 400, color: "#fff",
};
const EMPTY_DESC: React.CSSProperties = {
  margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)",
  maxWidth: 320, marginInline: "auto" as const, lineHeight: 1.55,
};

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 12, padding: "0 22px",
};

const CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 14, overflow: "hidden" as const,
  cursor: "pointer",
};
const CARD_HERO: React.CSSProperties = {
  height: 100,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
};
const CARD_BODY: React.CSSProperties = { padding: "10px 12px" };
const CARD_NAME: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#fff",
  textTransform: "capitalize" as const,
};
const CARD_REMOVE: React.CSSProperties = {
  marginTop: 6, padding: "4px 10px", borderRadius: 999,
  background: "rgba(168,88,88,0.18)",
  border: "1px solid rgba(168,88,88,0.32)",
  color: "#C88080", fontSize: 10, cursor: "pointer",
  fontFamily: 'inherit',
};
