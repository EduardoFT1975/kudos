"use client";
/**
 * KUDOS - ShareMVP - PROMPT 5/6.
 *
 * MODAL UNICO de compartir.
 * Listener: window.dispatchEvent(new CustomEvent("kudos:share-capsule:open", {
 *   detail: { capsuleId, poiName, location, image, evocative, durationS }
 * }))
 *
 * 4 bloques (segun maqueta MVP):
 *   1. Preview (imagen + titulo + ubicacion + duracion)
 *   2. Mensaje editable (no IA, no auto-generado)
 *   3. QR real local (generado con lib/qr/qrcode.ts)
 *   4. Destinos: WhatsApp + X + Facebook + Copiar enlace
 *
 * Reemplaza a ShareCapsuleModalV5 + ShareReflectionModalV2 + cualquier otro share.
 */
import * as React from "react";
import { QRCodeSVG } from "@/lib/qr/QRCodeSVG";


interface SharePayload {
  capsuleId?: string;
  poiName?: string;
  location?: string;
  image?: string;
  evocative?: string;
  durationS?: number;
}


const PUBLIC_BASE =
  (typeof window !== "undefined" ? window.location.origin : "https://kudos.world");


export function ShareMVP() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<SharePayload>({});
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    function onOpen(ev: Event) {
      const ce = ev as CustomEvent<SharePayload>;
      setPayload(ce.detail || {});
      setMessage("");
      setOpen(true);
    }
    window.addEventListener("kudos:share-capsule:open", onOpen as EventListener);
    window.addEventListener("kudos:share-capsule-v5:open", onOpen as EventListener);
    return () => {
      window.removeEventListener("kudos:share-capsule:open", onOpen as EventListener);
      window.removeEventListener("kudos:share-capsule-v5:open", onOpen as EventListener);
    };
  }, []);

  if (!open) return null;

  const close = () => { setOpen(false); setMessage(""); };

  const poiName = payload.poiName || "Coliseo";
  const location = (payload.location || "ROMA, ITALIA").toUpperCase();
  const image = payload.image;
  const durationS = payload.durationS || 15;
  const shareUrl = `${PUBLIC_BASE}/c/${encodeURIComponent(payload.capsuleId || "")}`;
  const fullText = (message.trim() ? message + " " : "") + shareUrl;

  const doShare = (dest: "whatsapp" | "x" | "facebook" | "copy" | "native") => {
    if (dest === "copy") {
      navigator.clipboard?.writeText(shareUrl);
      toast("Enlace copiado");
      return;
    }
    if (dest === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, "_blank");
      return;
    }
    if (dest === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, "_blank");
      return;
    }
    if (dest === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
      return;
    }
    if (dest === "native" && (navigator as any).share) {
      (navigator as any).share({ title: poiName, text: message, url: shareUrl }).catch(() => {});
    }
  };

  return (
    <div style={BACKDROP} onClick={close} role="dialog" aria-modal="true">
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <button onClick={close} style={CLOSE} aria-label="Cerrar">✕</button>

        <header style={HEAD}>
          <h2 style={TITLE}>Compartir cápsula</h2>
          <p style={SUB}>Comparte descubrimientos que inspiran</p>
        </header>

        {/* === Preview === */}
        <article style={PREVIEW}>
          <div
            style={{
              ...PREVIEW_HERO,
              backgroundImage: image
                ? `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(10,8,20,0.78) 100%), url(${image})`
                : "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)",
            }}
          >
            <span style={LOC_PILL}><span style={LOC_PIN}>◉</span> {location}</span>
            <div style={LOGO_TOP}>KUDOS</div>
            <h3 style={POI_TITLE}>{poiName}</h3>
            {payload.evocative && (
              <p style={POI_EVOCATIVE}>{payload.evocative}</p>
            )}
            <div style={CAPSULE_FOOT}>
              <span style={PLAY_BADGE}>▶</span>
              <span style={CAPSULE_LBL}>CÁPSULA</span>
              <span style={DURATION_LBL}>{formatDuration(durationS)}</span>
            </div>
          </div>

          {/* QR real generado localmente */}
          <div style={QR_BOX}>
            <QRCodeSVG value={shareUrl} size={92} margin={1} fg="#0a0814" bg="#ffffff" />
            <span style={QR_LABEL}>Escanea</span>
          </div>
        </article>

        {/* === Mensaje editable === */}
        <label style={MSG_LABEL}>Añade un mensaje personal (opcional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          placeholder={`Descubrí algo fascinante sobre ${poiName}.`}
          style={MSG_TEXTAREA}
          rows={2}
          maxLength={200}
        />
        <div style={MSG_COUNTER}>{message.length}/200</div>

        {/* === Destinos (7 segun maqueta) === */}
        <div style={DESTINATIONS}>
          <DestBtn label="Instagram" bg="linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" onClick={() => doShare("native")} icon={<IGIcon />} />
          <DestBtn label="WhatsApp"  bg="#25D366"                onClick={() => doShare("whatsapp")} icon={<WhatsappIcon />} />
          <DestBtn label="Facebook"  bg="#1877F2"                onClick={() => doShare("facebook")} icon={<FacebookIcon />} />
          <DestBtn label="TikTok"    bg="#000"                   onClick={() => doShare("native")}   icon={<TikTokIcon />} />
          <DestBtn label="X"         bg="#000"                   onClick={() => doShare("x")}        icon={<XIcon />} />
          <DestBtn label="Copiar"    bg="rgba(255,255,255,0.08)" onClick={() => doShare("copy")}     icon={<LinkIcon />} />
          <DestBtn label="Más"       bg="rgba(255,255,255,0.08)" onClick={() => doShare("native")}   icon={<MoreIcon />} />
        </div>

        <button onClick={() => doShare("native")} style={SHARE_NOW}>
          Compartir ahora
        </button>
      </div>
    </div>
  );
}


// ============ subcomponentes ============

function DestBtn({ label, bg, icon, onClick }: {
  label: string; bg: string; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={DEST_BTN} aria-label={label}>
      <span style={{ ...DEST_CIRCLE, background: bg }}>{icon}</span>
      <span style={DEST_LABEL}>{label}</span>
    </button>
  );
}

function WhatsappIcon() {
  return <span style={{ fontSize: 18, color: "#fff" }}>✓</span>;
}
function XIcon() {
  return <span style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>X</span>;
}
function FacebookIcon() {
  return <span style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>f</span>;
}
function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IGIcon() {
  return <span style={{ fontSize: 16, color: "#fff" }}>◉</span>;
}
function TikTokIcon() {
  return <span style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>♪</span>;
}
function MoreIcon() {
  return <span style={{ fontSize: 18, color: "#fff" }}>•••</span>;
}


function formatDuration(s: number): string {
  if (s < 60) return `00:${String(s).padStart(2, "0")}`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kudos:toast", { detail: { message } }));
}


// ============ styles ============

const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(0,0,0,0.78)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 540,
  maxHeight: "92vh", overflowY: "auto",
  background: "#0a0814",
  borderTopLeftRadius: 22, borderTopRightRadius: 22,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  padding: "22px 22px 24px",
  position: "relative",
  color: "#fff",
};
const CLOSE: React.CSSProperties = {
  position: "absolute", top: 14, right: 14,
  width: 36, height: 36, borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "none", color: "#fff", fontSize: 18,
  cursor: "pointer",
};
const HEAD: React.CSSProperties = { textAlign: "center" as const, marginBottom: 18 };
const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 26, fontWeight: 500, color: "#fff",
};
const SUB: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13, color: "rgba(255,255,255,0.6)",
};

// Preview
const PREVIEW: React.CSSProperties = {
  position: "relative",
  background: "#15102b",
  borderRadius: 16,
  overflow: "hidden",
  marginBottom: 14,
};
const PREVIEW_HERO: React.CSSProperties = {
  position: "relative",
  minHeight: 340,
  backgroundSize: "cover",
  backgroundPosition: "center",
  padding: 16,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
};
const LOC_PILL: React.CSSProperties = {
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.18em",
  color: "#fff",
};
const LOC_PIN: React.CSSProperties = { color: "#8B6BFF", fontSize: 9 };
const LOGO_TOP: React.CSSProperties = {
  position: "absolute",
  top: 14,
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: 14,
  letterSpacing: "0.32em",
  fontWeight: 700,
  color: "#fff",
  textShadow: "0 1px 6px rgba(0,0,0,0.6)",
};
const POI_TITLE: React.CSSProperties = {
  margin: "auto 0 4px",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 48,
  fontWeight: 500,
  color: "#fff",
  letterSpacing: "-0.01em",
  textShadow: "0 1px 6px rgba(0,0,0,0.55)",
  lineHeight: 1,
};
const POI_EVOCATIVE: React.CSSProperties = {
  margin: "4px 0 14px",
  fontSize: 13,
  fontStyle: "italic",
  color: "#8B6BFF",
};
const CAPSULE_FOOT: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  letterSpacing: "0.18em",
  fontWeight: 700,
  color: "rgba(255,255,255,0.85)",
};
const PLAY_BADGE: React.CSSProperties = {
  width: 26, height: 26, borderRadius: "50%",
  background: "rgba(139,107,255,0.95)",
  color: "#fff", fontSize: 12,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const CAPSULE_LBL: React.CSSProperties = {};
const DURATION_LBL: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  letterSpacing: "0.1em",
  fontWeight: 600,
};

const QR_BOX: React.CSSProperties = {
  position: "absolute",
  right: 14,
  bottom: 14,
  background: "#fff",
  borderRadius: 8,
  padding: 6,
  textAlign: "center" as const,
};
const QR_LABEL: React.CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 8,
  color: "#0a0814",
  letterSpacing: "0.06em",
  fontWeight: 600,
};

// Mensaje
const MSG_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.65)",
  marginBottom: 6,
};
const MSG_TEXTAREA: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical" as const,
  outline: "none",
};
const MSG_COUNTER: React.CSSProperties = {
  textAlign: "right" as const,
  fontSize: 10,
  color: "rgba(255,255,255,0.4)",
  marginTop: 4,
  marginBottom: 16,
};

// Destinos
const DESTINATIONS: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 8,
  marginBottom: 14,
};
const DEST_BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
};
const DEST_CIRCLE: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const DEST_LABEL: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(255,255,255,0.85)",
};

const SHARE_NOW: React.CSSProperties = {
  width: "100%",
  padding: "13px 18px",
  background: "linear-gradient(135deg, #8B6BFF 0%, #6e4dd6 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
};
