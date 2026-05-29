"use client";
/**
 * KUDOS HomeFeed v5 · Eras Card (placeholder)
 *
 * Phase 3: cápsula multi-POI con timeline scrubber.
 * Phase 1: placeholder estético con "próximamente".
 */
import * as React from "react";


export function ErasCard() {
  return (
    <div style={SECTION}>
      <div style={HEADER}>
        <h3 style={H3}>Historias que conectan épocas</h3>
        <span style={SEE_ALL_DISABLED}>próximamente</span>
      </div>

      <div style={CARD}>
        <div style={HERO}>
          <div style={OVERLAY} />
          <div style={DUR}>
            <span>60"</span>
            <span style={{ marginLeft: 4 }}>▶</span>
          </div>
        </div>
        <div style={BODY}>
          <h4 style={TITLE}>De Roma a Florencia</h4>
          <p style={DESC}>Un viaje a través de 1500 años de historia</p>

          {/* Timeline scrubber placeholder */}
          <div style={TIMELINE}>
            <div style={TIMELINE_TRACK} />
            <div style={{ ...TIMELINE_FILL, width: "55%" }} />
            <div style={TIMELINE_PINS}>
              {["117 d.C.", "800 d.C.", "1453 d.C.", "1750 d.C.", "Hoy"].map((era, i) => (
                <div key={i} style={{
                  ...TIMELINE_PIN,
                  color: i === 2 ? "#8B6BFF" : "rgba(255,255,255,0.45)",
                  fontWeight: i === 2 ? 700 : 400,
                }}>
                  <div style={{
                    ...TIMELINE_DOT,
                    background: i === 2 ? "#8B6BFF" : "rgba(255,255,255,0.3)",
                    width: i === 2 ? 10 : 6, height: i === 2 ? 10 : 6,
                  }} />
                  <span style={{ fontSize: 10 }}>{era}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const SECTION: React.CSSProperties = { padding: "8px 0 100px" };
const HEADER: React.CSSProperties = {
  display: "flex", alignItems: "baseline", justifyContent: "space-between",
  padding: "16px 22px 10px",
};
const H3: React.CSSProperties = {
  margin: 0, fontSize: 17, fontWeight: 700, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  letterSpacing: "-0.005em",
};
const SEE_ALL_DISABLED: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.35)",
  fontFamily: '"Poppins", system-ui, sans-serif',
  fontStyle: "italic" as const,
};

const CARD: React.CSSProperties = {
  margin: "0 16px",
  background: "#0f0a1f",
  borderRadius: 22, overflow: "hidden",
  border: "1px solid rgba(139,107,255,0.12)",
};
const HERO: React.CSSProperties = {
  position: "relative", width: "100%", height: 170,
  background: 'linear-gradient(135deg, #1a0f2e 0%, #2a1542 100%)',
};
const OVERLAY: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,10,31,0.6) 100%)",
};
const DUR: React.CSSProperties = {
  position: "absolute", top: 14, right: 14,
  display: "flex", alignItems: "center",
  padding: "5px 11px", borderRadius: 999,
  background: "rgba(15,10,31,0.75)",
  fontSize: 12, fontWeight: 600, color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  backdropFilter: "blur(6px)",
};

const BODY: React.CSSProperties = {
  padding: "18px 20px 22px",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const TITLE: React.CSSProperties = {
  margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#fff",
  letterSpacing: "-0.01em",
};
const DESC: React.CSSProperties = {
  margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.55)",
};

const TIMELINE: React.CSSProperties = {
  position: "relative", marginTop: 8,
};
const TIMELINE_TRACK: React.CSSProperties = {
  height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 999,
};
const TIMELINE_FILL: React.CSSProperties = {
  position: "absolute", top: 0, left: 0,
  height: 2, background: "linear-gradient(90deg, rgba(139,107,255,0.2) 0%, #8B6BFF 100%)",
  borderRadius: 999,
};
const TIMELINE_PINS: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  marginTop: -5,
};
const TIMELINE_PIN: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
};
const TIMELINE_DOT: React.CSSProperties = {
  borderRadius: "50%",
  border: "2px solid #0f0a1f",
};
