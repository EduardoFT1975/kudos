"use client";
/**
 * KUDOS · ShareReflectionModalV2 · T3.2 EJEC Day 17.
 *
 * Share V2 con reflexion personal obligatoria (50+ chars).
 * Tarjeta resultante:
 *   - Foto del POI
 *   - Frase del usuario (entrecomillada)
 *   - Atribucion: "-- {Nombre}, descubriendo en KUDOS"
 *   - URL corta: kudos.world/c/{capsuleId}?ref={userId}
 *
 * Listener: window.dispatchEvent(new CustomEvent("kudos:share-reflection-v2:open", { detail: {...} }))
 *
 * Detail: { poiId, poiName, image, userName?, capsuleId? }
 */
import * as React from "react";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";
const PUBLIC_BASE = (typeof window !== "undefined" ? window.location.origin : "https://kudos.world");

const MIN_REFLECTION_CHARS = 50;
const MAX_REFLECTION_CHARS = 280;


interface SharePayload {
  poiId: string;
  poiName: string;
  image?: string;
  userName?: string;
  capsuleId?: string;
}


export function ShareReflectionModalV2() {
  const [open, setOpen] = React.useState(false);
  const [payload, setPayload] = React.useState<SharePayload | null>(null);
  const [reflection, setReflection] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{ shareUrl: string } | null>(null);

  React.useEffect(() => {
    function onOpen(ev: Event) {
      const ce = ev as CustomEvent<SharePayload>;
      if (!ce.detail || !ce.detail.poiId) return;
      setPayload(ce.detail);
      setReflection("");
      setSubmitted(null);
      setOpen(true);
    }
    window.addEventListener("kudos:share-reflection-v2:open", onOpen as EventListener);
    return () => window.removeEventListener("kudos:share-reflection-v2:open", onOpen as EventListener);
  }, []);

  if (!open || !payload) return null;

  const close = () => {
    setOpen(false);
    setPayload(null);
    setReflection("");
    setSubmitted(null);
  };

  const chars = reflection.trim().length;
  const valid = chars >= MIN_REFLECTION_CHARS && chars <= MAX_REFLECTION_CHARS;
  const userName = payload.userName || "Tu";

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);

    const sid = sessionStorage.getItem("kudos:session") || "";
    const userId = sessionStorage.getItem("kudos:userId") || "";

    // 1. Reportar como telemetry reflection_submitted (cuenta DTI + Discovery DNA)
    try {
      await fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid },
        credentials: "include",
        body: JSON.stringify({
          event_type: "reflection_submitted",
          poi_id: payload.poiId,
          payload: {
            text_length: chars,
            via: "share_v2",
            capsule_id: payload.capsuleId || null,
          },
        }),
      });
    } catch { /* tolerante */ }

    // 2. Construir URL corta con ref + text + author (Day 25 OG dinamico)
    const cid = payload.capsuleId || payload.poiId;
    const qs = new URLSearchParams();
    if (userId)   qs.set("ref", userId);
    qs.set("text", reflection.trim().slice(0, 200));
    qs.set("author", userName.slice(0, 40));
    const shareUrl = `${PUBLIC_BASE}/c/${encodeURIComponent(cid)}?${qs.toString()}`;

    // 3. share_initiated event
    try {
      await fetch(`${API}/api/telemetry/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid },
        credentials: "include",
        body: JSON.stringify({
          event_type: "share_initiated",
          poi_id: payload.poiId,
          payload: { via: "share_v2_reflection", url: shareUrl },
        }),
      });
    } catch { /* tolerante */ }

    setSubmitting(false);
    setSubmitted({ shareUrl });
  };

  const copyLink = () => {
    if (!submitted) return;
    navigator.clipboard?.writeText(submitted.shareUrl);
    dispatchToast("Enlace copiado");
  };

  const tryNativeShare = () => {
    if (!submitted) return;
    if (!(navigator as any).share) { copyLink(); return; }
    (navigator as any).share({
      title: payload.poiName,
      text: `"${reflection.trim()}" — descubriendo en KUDOS`,
      url: submitted.shareUrl,
    }).catch(() => {});
  };

  return (
    <div style={BACKDROP} onClick={close} role="dialog" aria-modal="true">
      <div style={SHEET} onClick={(e) => e.stopPropagation()}>
        <button style={CLOSE} onClick={close} aria-label="Cerrar">✕</button>

        {!submitted ? (
          <>
            <header style={HEAD}>
              <span style={LABEL}>COMPARTIR · REFLEXION PERSONAL</span>
              <h2 style={TITLE}>Lo compartes con tus palabras.</h2>
              <p style={SUB}>
                KUDOS no comparte texto generico. Compartes lo que pensaste tu, despues de descubrir.
              </p>
            </header>

            {/* Preview tarjeta */}
            <ReflectionPreview
              poiName={payload.poiName}
              image={payload.image}
              text={reflection.trim() || "(escribe tu reflexion abajo)"}
              userName={userName}
            />

            {/* Editor */}
            <div style={EDITOR_WRAP}>
              <label style={EDITOR_LABEL}>
                Tu reflexion sobre {payload.poiName}
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value.slice(0, MAX_REFLECTION_CHARS))}
                placeholder="Lo que sentiste, lo que cambio, lo que entendiste por primera vez..."
                style={TEXTAREA}
                rows={5}
                maxLength={MAX_REFLECTION_CHARS}
              />
              <div style={COUNTER_ROW}>
                <span style={{ ...COUNTER, color: valid ? "#7BB87B" : "rgba(255,255,255,0.45)" }}>
                  {chars} / {MIN_REFLECTION_CHARS} minimos
                </span>
                <span style={COUNTER_MAX}>maximo {MAX_REFLECTION_CHARS}</span>
              </div>
            </div>

            <button
              style={{
                ...SUBMIT,
                opacity: valid ? 1 : 0.45,
                cursor: valid ? "pointer" : "not-allowed",
              }}
              onClick={submit}
              disabled={!valid || submitting}
            >
              {submitting ? "Generando enlace..." : "Generar tarjeta y enlace"}
            </button>

            <p style={DISCIPLINE_NOTE}>
              KUDOS no comparte tarjetas vacias. La reflexion es lo que da valor.
            </p>
          </>
        ) : (
          <>
            <header style={HEAD}>
              <span style={{ ...LABEL, color: "#7BB87B" }}>LISTO</span>
              <h2 style={TITLE}>Tu tarjeta esta lista.</h2>
            </header>

            <ReflectionPreview
              poiName={payload.poiName}
              image={payload.image}
              text={reflection.trim()}
              userName={userName}
            />

            <div style={URL_BOX}>
              <span style={URL_TEXT}>{submitted.shareUrl}</span>
              <button onClick={copyLink} style={URL_COPY}>Copiar</button>
            </div>

            <div style={ACTIONS}>
              <button onClick={tryNativeShare} style={ACTION_PRIMARY}>Compartir</button>
              <button onClick={close} style={ACTION_SECONDARY}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// Componente reutilizable: tarjeta foto+frase+atribucion
function ReflectionPreview({
  poiName, image, text, userName,
}: { poiName: string; image?: string; text: string; userName: string }) {
  return (
    <article style={PREVIEW}>
      <div style={{
        ...PREVIEW_HERO,
        backgroundImage: image ? `linear-gradient(rgba(10,8,20,0.35), rgba(10,8,20,0.85)), url(${image})` : undefined,
      }}>
        <span style={PREVIEW_LOGO}>KUDOS</span>
        <span style={PREVIEW_POI}>{poiName}</span>
      </div>
      <div style={PREVIEW_BODY}>
        <p style={PREVIEW_QUOTE}>{text.startsWith('"') ? text : `"${text}"`}</p>
        <p style={PREVIEW_ATTR}>— {userName}, descubriendo en KUDOS</p>
      </div>
    </article>
  );
}


function dispatchToast(msg: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kudos:toast", { detail: { message: msg } }));
}


// =================== styles ===================

const BACKDROP: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(0,0,0,0.78)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  fontFamily: '"Poppins", system-ui, sans-serif',
};
const SHEET: React.CSSProperties = {
  width: "100%", maxWidth: 540,
  maxHeight: "95vh", overflowY: "auto",
  background: "#0a0814",
  borderTopLeftRadius: 22, borderTopRightRadius: 22,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  padding: "22px 22px 28px",
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
const HEAD: React.CSSProperties = { marginBottom: 18 };
const LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.22em",
  color: "rgba(201,169,97,0.85)", fontWeight: 700,
  display: "block", marginBottom: 6,
};
const TITLE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 24, fontWeight: 500,
  color: "#fff", margin: 0,
  letterSpacing: "-0.01em",
};
const SUB: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13, lineHeight: 1.5,
  color: "rgba(255,255,255,0.6)",
};

const PREVIEW: React.CSSProperties = {
  marginTop: 8,
  background: "#15102b",
  borderRadius: 14, overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
};
const PREVIEW_HERO: React.CSSProperties = {
  position: "relative",
  height: 150,
  background: "linear-gradient(135deg, #2a1542, #1a0f2e)",
  backgroundSize: "cover", backgroundPosition: "center",
  display: "flex", flexDirection: "column", justifyContent: "space-between",
  padding: 14,
};
const PREVIEW_LOGO: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.3em",
  fontWeight: 700, color: "#fff",
};
const PREVIEW_POI: React.CSSProperties = {
  alignSelf: "flex-start",
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 22, fontWeight: 500, color: "#fff",
  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
};
const PREVIEW_BODY: React.CSSProperties = {
  padding: "18px 18px 20px",
};
const PREVIEW_QUOTE: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 16, fontStyle: "italic",
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.95)",
  margin: 0,
};
const PREVIEW_ATTR: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11, letterSpacing: "0.06em",
  color: "rgba(201,169,97,0.85)",
};

const EDITOR_WRAP: React.CSSProperties = { marginTop: 18 };
const EDITOR_LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11, letterSpacing: "0.12em",
  color: "rgba(255,255,255,0.7)",
  marginBottom: 6,
};
const TEXTAREA: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff", fontSize: 14, lineHeight: 1.5,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  resize: "vertical" as const,
  outline: "none",
};
const COUNTER_ROW: React.CSSProperties = {
  display: "flex", justifyContent: "space-between",
  marginTop: 6,
};
const COUNTER: React.CSSProperties = {
  fontSize: 11, fontWeight: 500,
};
const COUNTER_MAX: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.35)",
};

const SUBMIT: React.CSSProperties = {
  marginTop: 18, width: "100%",
  padding: "13px 18px",
  background: "#C9A961", color: "#0a0814",
  border: "none", borderRadius: 12,
  fontSize: 14, fontWeight: 700,
  letterSpacing: "0.04em",
  transition: "opacity 200ms ease",
};
const DISCIPLINE_NOTE: React.CSSProperties = {
  margin: "14px 0 0",
  fontSize: 11, fontStyle: "italic",
  color: "rgba(255,255,255,0.45)",
  textAlign: "center" as const,
};

const URL_BOX: React.CSSProperties = {
  marginTop: 16, padding: "10px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  display: "flex", alignItems: "center", gap: 10,
};
const URL_TEXT: React.CSSProperties = {
  flex: 1, fontSize: 12,
  color: "rgba(255,255,255,0.85)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  fontFamily: "monospace",
};
const URL_COPY: React.CSSProperties = {
  padding: "5px 12px",
  background: "rgba(201,169,97,0.18)",
  border: "1px solid rgba(201,169,97,0.45)",
  color: "#C9A961",
  borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: "pointer",
};
const ACTIONS: React.CSSProperties = {
  marginTop: 16, display: "flex", gap: 10,
};
const ACTION_PRIMARY: React.CSSProperties = {
  flex: 1, padding: "12px 14px",
  background: "#C9A961", color: "#0a0814",
  border: "none", borderRadius: 12,
  fontSize: 13, fontWeight: 700,
  cursor: "pointer",
};
const ACTION_SECONDARY: React.CSSProperties = {
  padding: "12px 14px",
  background: "transparent", color: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 12,
  fontSize: 13, fontWeight: 500,
  cursor: "pointer",
};
