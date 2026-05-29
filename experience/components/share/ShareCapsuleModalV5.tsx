"use client";
/**
 * KUDOS Share Capsule v5 · diseño GPT-5.
 *
 * Listens to window event "kudos:share-capsule-v5:open" with detail {
 *   capsuleId, poiName, location, image, evocative, durationS
 * }.
 *
 * Estructura mockup:
 *   - Header X + título
 *   - Card preview: foto + KUDOS logo + pin location + nombre serif + frase evocadora
 *     + CTA "▶ CÁPSULA · 00:15" + "Descubierto por X" + QR
 *   - 4 estilos preview (Épico/Minimal/Mapa/Timeline) selección visual
 *   - Mensaje personal textarea
 *   - 7 destinos sociales (Instagram/WhatsApp/Facebook/TikTok/X/Copiar/Más)
 *   - Privacidad ▼ (Solo amigos / Público / Privado)
 *   - "Añadir a Mi Mundo"
 *   - "Compartir ahora" CTA principal
 */
import * as React from "react";
import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";
import { AddToMyWorldButton } from "@/components/discovery/AddToMyWorldButton";


interface SharePayload {
  capsuleId?: string;
  poiName?: string;
  location?: string;
  image?: string;
  evocative?: string;
  durationS?: number;
}

type PreviewStyle = "epico" | "minimal" | "mapa" | "timeline";


export function ShareCapsuleModalV5() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<SharePayload>({});
  const [style, setStyle] = React.useState<PreviewStyle>("epico");
  const [message, setMessage] = React.useState("");
  const [privacy, setPrivacy] = React.useState("Solo amigos");
  const [privacyOpen, setPrivacyOpen] = React.useState(false);

  React.useEffect(() => {
    function onOpen(ev: Event) {
      const ce = ev as CustomEvent<SharePayload>;
      setPayload(ce.detail || {});
      setOpen(true);
    }
    window.addEventListener("kudos:share-capsule-v5:open", onOpen as EventListener);
    window.addEventListener("kudos:share-capsule:open", onOpen as EventListener);
    return () => {
      window.removeEventListener("kudos:share-capsule-v5:open", onOpen as EventListener);
      window.removeEventListener("kudos:share-capsule:open", onOpen as EventListener);
    };
  }, []);

  if (!open) return null;

  const close = () => { setOpen(false); setMessage(""); };

  const handleShare = (dest: string) => {
    // MVP: window.share API o intent · placeholder por ahora
    const shareUrl = `https://kudos.world/c/${payload.capsuleId || ""}`;
    const text = message || `${payload.poiName || "KUDOS"} · ${payload.evocative || ""}`;

    if (dest === "copy") {
      navigator.clipboard?.writeText(shareUrl);
      dispatchToast("Enlace copiado");
      return;
    }
    if (dest === "native" && (navigator as any).share) {
      (navigator as any).share({ title: payload.poiName || "KUDOS", text, url: shareUrl })
        .catch(() => {});
      return;
    }
    dispatchToast(`Compartir en ${dest} · próximamente`);
  };

  const poiName = payload.poiName || "Coliseo";
  const location = payload.location || "ROMA, ITALIA";
  const evocative = payload.evocative || "Donde el Imperio se convirtió en leyenda.";
  const dur = payload.durationS || 15;
  const heroImg = payload.image;

  return (
    <div style={BACKDROP} onClick={close}>
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <button style={CLOSE} onClick={close} aria-label="Cerrar">✕</button>
        <h2 style={TITLE}>Compartir cápsula</h2>
        <p style={SUBTITLE}>Comparte descubrimientos que inspiran</p>

        {/* Card preview · estilo "Épico" */}
        <PreviewCard style={style} poiName={poiName} location={location}
                     evocative={evocative} dur={dur} image={heroImg} />

        {/* Selector estilos */}
        <h3 style={SECTION_TITLE}>Elige el estilo de la vista previa</h3>
        <div style={STYLES_GRID}>
          {(["epico", "minimal", "mapa", "timeline"] as PreviewStyle[]).map((s) => (
            <StyleTile key={s} type={s} active={style === s} onClick={() => setStyle(s)} />
          ))}
        </div>

        {/* Mensaje personal */}
        <h3 style={SECTION_TITLE}>Añade un mensaje personal</h3>
        <div style={MSG_WRAP}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 120))}
            placeholder="Imposible no quedarse sin palabras. Roma te transporta a otra época."
            style={MSG_INPUT}
          />
          <div style={MSG_COUNT}>{message.length}/120</div>
        </div>

        {/* Destinos sociales */}
        <h3 style={SECTION_TITLE}>Compartir en</h3>
        <div style={SOCIAL_GRID}>
          <SocialBtn label="Instagram" color="#E1306C" emoji="📷" onClick={() => handleShare("instagram")} />
          <SocialBtn label="WhatsApp"  color="#25D366" emoji="💬" onClick={() => handleShare("whatsapp")} />
          <SocialBtn label="Facebook"  color="#1877F2" emoji="ⓕ"  onClick={() => handleShare("facebook")} />
          <SocialBtn label="TikTok"    color="#000"    emoji="♪"  onClick={() => handleShare("tiktok")} />
          <SocialBtn label="X"         color="#000"    emoji="𝕏"  onClick={() => handleShare("x")} />
          <SocialBtn label="Copiar enlace" color="#444" emoji="🔗" onClick={() => handleShare("copy")} />
          <SocialBtn label="Más"       color="#666"    emoji="•••" onClick={() => handleShare("native")} />
        </div>

        {/* Bottom actions */}
        <div style={FOOTER}>
          <button style={PRIVACY_BTN} onClick={() => setPrivacyOpen(!privacyOpen)}>
            <span>🔒</span>
            <span>{privacy}</span>
            <span style={{ fontSize: 9 }}>{privacyOpen ? "▲" : "▼"}</span>
          </button>
          {privacyOpen && (
            <div style={PRIVACY_DROPDOWN}>
              {["Solo amigos", "Público", "Privado"].map((p) => (
                <div key={p} style={PRIVACY_ITEM} onClick={() => { setPrivacy(p); setPrivacyOpen(false); }}>
                  {p}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "inline-block" }}>
            <AddToMyWorldButton
              poiId={payload.capsuleId || "unknown"}
              poiName={poiName}
              variant="ghost"
            />
          </div>
          <button style={SHARE_BTN} onClick={() => handleShare("native")}>
            <span>➤</span>
            <span>Compartir ahora</span>
          </button>
        </div>

        <p style={FOOTNOTE}>
          <span style={{ color: "#C9A961" }}>✦</span> Cada compartición ayuda a que más personas descubran el mundo con significado.
        </p>
      </div>
    </div>
  );
}


function PreviewCard({ style, poiName, location, evocative, dur, image }: {
  style: PreviewStyle; poiName: string; location: string;
  evocative: string; dur: number; image?: string;
}) {
  return (
    <div style={{
      ...CARD_WRAP,
      background: image ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,10,31,0.85) 100%), url("${image}") center/cover` : "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)",
    }}>
      <div style={CARD_TOP}>
        <KudosFlowerLogo size={28} variant="white" />
        <span style={CARD_BRAND}>KUDOS</span>
      </div>

      <div style={CARD_PIN}>
        <span style={{ marginRight: 6 }}>📍</span>
        <span>{location}</span>
      </div>

      <div style={{ flex: 1 }} />

      <h3 style={CARD_TITLE}>{poiName}</h3>
      <p style={CARD_EVOCATIVE}>{evocative}</p>

      <div style={CARD_BOTTOM_ROW}>
        <div style={CARD_CTA}>
          <span style={{ marginRight: 8 }}>▶</span>
          <span style={{ marginRight: 6 }}>CÁPSULA</span>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>•</span>
          <span style={{ marginLeft: 6 }}>00:{String(dur).padStart(2, "0")}</span>
        </div>
        <div style={CARD_QR} aria-label="QR placeholder" />
      </div>
    </div>
  );
}


function StyleTile({ type, active, onClick }: { type: PreviewStyle; active: boolean; onClick: () => void }) {
  const labels = { epico: "Épico", minimal: "Minimal", mapa: "Mapa", timeline: "Timeline" };
  const bg = {
    epico:    "linear-gradient(135deg, #2a1542, #1a0f2e)",
    minimal:  "linear-gradient(135deg, #1a1428, #0a0814)",
    mapa:     "linear-gradient(135deg, #1f2942, #0f1622)",
    timeline: "linear-gradient(135deg, #3a2533, #1f1318)",
  }[type];
  return (
    <button style={{
      ...STYLE_TILE,
      border: active ? "2px solid #8B6BFF" : "2px solid transparent",
      background: bg,
    }} onClick={onClick}>
      {active && <span style={STYLE_CHECK}>✓</span>}
      <span style={STYLE_LABEL}>{labels[type]}</span>
    </button>
  );
}


function SocialBtn({ label, color, emoji, onClick }: {
  label: string; color: string; emoji: string; onClick: () => void;
}) {
  return (
    <button style={SOCIAL_BTN} onClick={onClick} aria-label={label}>
      <div style={{ ...SOCIAL_CIRCLE, background: color }}>{emoji}</div>
      <span style={SOCIAL_LABEL}>{label}</span>
    </button>
  );
}


function dispatchToast(msg: string) {
  window.dispatchEvent(new CustomEvent("kudos:toast", { detail: msg }));
}


// ─── Styles ─────────────────────────────────────────────────────────
const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 8000,
  background: "rgba(0,0,0,0.78)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 12, backdropFilter: "blur(6px)",
  animation: "kudos-sheet-fade 0.25s ease both",
};

const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 440,
  maxHeight: "92vh", overflow: "auto",
  background: "#0a0814",
  borderRadius: 22, border: "1px solid rgba(139,107,255,0.18)",
  padding: "44px 22px 22px",
  position: "relative",
  color: "#fff",
  fontFamily: '"Poppins", system-ui, sans-serif',
  animation: "kudos-sheet-slide-up 0.32s cubic-bezier(0.22,1,0.36,1) both",
};

const CLOSE: React.CSSProperties = {
  position: "absolute", top: 16, left: 16,
  width: 34, height: 34, borderRadius: "50%",
  background: "rgba(255,255,255,0.1)", color: "#fff",
  border: "none", fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 4px", fontSize: 19, fontWeight: 700,
  color: "#fff", textAlign: "center" as const,
};
const SUBTITLE: React.CSSProperties = {
  margin: "0 0 22px", fontSize: 12, color: "rgba(255,255,255,0.55)",
  textAlign: "center" as const,
};

const CARD_WRAP: React.CSSProperties = {
  borderRadius: 18, overflow: "hidden",
  padding: "16px 18px",
  minHeight: 380,
  display: "flex", flexDirection: "column",
  marginBottom: 22,
  position: "relative",
  border: "1px solid rgba(255,255,255,0.08)",
};
const CARD_TOP: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  marginBottom: 12,
};
const CARD_BRAND: React.CSSProperties = {
  fontWeight: 700, fontSize: 16, letterSpacing: "0.16em", color: "#fff",
};

const CARD_PIN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "4px 10px", borderRadius: 999,
  background: "rgba(0,0,0,0.5)",
  fontSize: 10, color: "#fff", fontWeight: 600,
  letterSpacing: "0.1em",
  alignSelf: "flex-start",
};

const CARD_TITLE: React.CSSProperties = {
  margin: "0 0 6px",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400, fontSize: 40, lineHeight: 1.05,
  color: "#fff",
};
const CARD_EVOCATIVE: React.CSSProperties = {
  margin: "4px 0 16px",
  fontSize: 14, color: "#8B6BFF", fontWeight: 500,
};

const CARD_BOTTOM_ROW: React.CSSProperties = {
  display: "flex", alignItems: "flex-end", justifyContent: "space-between",
  marginTop: 10,
};
const CARD_CTA: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.42)",
  padding: "8px 14px", borderRadius: 999,
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  color: "#fff",
};
const CARD_QR: React.CSSProperties = {
  width: 56, height: 56, borderRadius: 6,
  background: 'repeating-linear-gradient(45deg, #fff 0 3px, #000 3px 6px), repeating-linear-gradient(-45deg, #fff 0 3px, #000 3px 6px)',
  backgroundBlendMode: "multiply",
};

const SECTION_TITLE: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)",
};

const STYLES_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 8, marginBottom: 8,
};
const STYLE_TILE: React.CSSProperties = {
  position: "relative",
  height: 80, borderRadius: 10,
  padding: 0,
  cursor: "pointer",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  paddingBottom: 8,
};
const STYLE_CHECK: React.CSSProperties = {
  position: "absolute", top: 6, right: 6,
  width: 18, height: 18, borderRadius: "50%",
  background: "#8B6BFF", color: "#fff",
  fontSize: 11, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const STYLE_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)",
};

const MSG_WRAP: React.CSSProperties = {
  position: "relative",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "10px 12px",
  marginBottom: 8,
};
const MSG_INPUT: React.CSSProperties = {
  width: "100%", minHeight: 60,
  background: "transparent", border: "none", outline: "none",
  resize: "none" as const,
  color: "#fff", fontSize: 13, lineHeight: 1.4,
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const MSG_COUNT: React.CSSProperties = {
  position: "absolute", bottom: 6, right: 10,
  fontSize: 10, color: "rgba(255,255,255,0.4)",
};

const SOCIAL_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8, marginBottom: 18,
};
const SOCIAL_BTN: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
  padding: "4px 0",
};
const SOCIAL_CIRCLE: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 18, color: "#fff",
};
const SOCIAL_LABEL: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 500,
};

const FOOTER: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 10,
  paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)",
  position: "relative",
};
const PRIVACY_BTN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  alignSelf: "flex-start",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 999, padding: "7px 14px",
  color: "#fff", fontSize: 12, fontWeight: 500,
  cursor: "pointer", fontFamily: 'inherit',
};
const PRIVACY_DROPDOWN: React.CSSProperties = {
  position: "absolute", top: 56, left: 0,
  background: "#1a1428", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "6px 0",
  zIndex: 10,
};
const PRIVACY_ITEM: React.CSSProperties = {
  padding: "8px 16px", fontSize: 12, color: "#fff",
  cursor: "pointer",
};

const ADD_BTN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "12px 18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 14,
  color: "#fff", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: 'inherit',
};
const SHARE_BTN: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "14px 18px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  border: "none",
  borderRadius: 14,
  color: "#fff", fontSize: 14, fontWeight: 600,
  cursor: "pointer", fontFamily: 'inherit',
  boxShadow: "0 4px 16px rgba(139,107,255,0.45)",
};
const FOOTNOTE: React.CSSProperties = {
  margin: "16px 4px 0",
  fontSize: 11, lineHeight: 1.4,
  color: "rgba(255,255,255,0.5)",
  textAlign: "center" as const,
};
