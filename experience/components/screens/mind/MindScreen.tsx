"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard, Icon, Pill, color } from "@/design-system/v2";
import { MIND_CONVERSATION, type MockMindMessage } from "@/lib/mocks-v2/fixtures";

interface SuggestionGroup { label: string; items: ReadonlyArray<string>; }
const SUGGESTION_GROUPS: ReadonlyArray<SuggestionGroup> = [
  { label: "Lugares", items: [
    "Cuéntame sobre Roma en el año 64",
    "¿Quién construyó el Coliseo?",
    "Conecta Pompeya con Herculano",
  ]},
  { label: "Personas", items: [
    "Háblame de Pericles",
    "¿Quién era Pachacútec?",
    "Mahalia Jackson y MLK",
  ]},
  { label: "Eventos", items: [
    "Resume Machu Picchu en 3 ideas",
    "¿Por qué cayó Notre-Dame?",
    "Lo que pasó el 10 de marzo de 1945",
  ]},
];

export function MindScreen() {
  const [messages, setMessages] = React.useState<MockMindMessage[]>([...MIND_CONVERSATION]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", body: text.trim() }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: `m-${Date.now()}`,
        role: "mind",
        body: "Buena pregunta. Estoy cruzando las capas históricas, geográficas y culturales relevantes. En la versión final esta respuesta vendrá del modelo conectado al corpus KUDOS · ahora estás viendo el shell de conversación. La estructura, las citas y los cards funcionan idénticos al producto real.",
        citations: [
          { title: "KUDOS Mind · documentación técnica", year: "2024" },
        ],
      }]);
      setThinking(false);
    }, 1200);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      maxWidth: 920,
      margin: "0 auto",
      paddingBottom: 0,
    }}>
      <header style={{ padding: "24px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div aria-hidden style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, rgba(56,189,248,0.32) 0%, rgba(56,189,248,0.08) 100%)",
            border: "1px solid rgba(56,189,248,0.55)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#7dd3fc",
            boxShadow: "0 0 22px rgba(56,189,248,0.32)",
          }}>
            <Icon name="mind" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--kudos-font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: color.ink }}>
              KUDOS Mind <Pill tone="default" size="sm" style={{ verticalAlign: "middle", marginLeft: 6, color: "#7dd3fc", borderColor: "rgba(56,189,248,0.45)" }}>BETA</Pill>
            </h1>
            <p style={{ margin: "4px 0 0", color: color.inkMid, fontFamily: "var(--kudos-font-body)", fontSize: 13.5 }}>
              IA contextual sobre el corpus KUDOS · cita fuentes verificadas · no inventa lugares.
            </p>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div style={{ padding: "0 22px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        {messages.map((m) => <Message key={m.id} msg={m} />)}
        {thinking ? <Thinking /> : null}
      </div>

      {/* SUGGESTIONS · grouped */}
      <div style={{ padding: "0 22px 14px" }}>
        <div style={{
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 10,
          color: color.inkLow,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}>Sugerencias</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUGGESTION_GROUPS.map((g) => (
            <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--kudos-font-mono)", fontSize: 10, color: color.inkMid, minWidth: 64, letterSpacing: "0.08em", textTransform: "uppercase" }}>{g.label}</span>
              {g.items.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} style={{
                  padding: "6px 12px",
                  background: "rgba(56,189,248,0.06)",
                  border: "1px solid rgba(56,189,248,0.24)",
                  borderRadius: 999,
                  color: "#7dd3fc",
                  fontFamily: "var(--kudos-font-body)",
                  fontSize: 11.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}>{s}</button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* INPUT */}
      <div style={{
        position: "sticky",
        bottom: 0,
        padding: "12px 22px",
        paddingBottom: "calc(12px + var(--kudos-safe-bottom, 0px))",
        background: "rgba(10,6,18,0.94)",
        borderTop: `1px solid ${color.border}`,
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
      }}>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta a KUDOS Mind..."
            style={{
              flex: 1, height: 44, padding: "0 16px",
              background: color.glass,
              border: `1px solid ${color.border}`,
              borderRadius: 999,
              color: color.ink,
              fontFamily: "var(--kudos-font-body)",
              fontSize: 14, outline: "none",
            }}
          />
          <button type="submit" aria-label="Enviar" style={{
            width: 44, height: 44,
            background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
            border: "1px solid #38bdf8",
            borderRadius: 999,
            color: "#0a0612",
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="arrow-right" size={18} />
          </button>
        </form>
        <div style={{
          marginTop: 8,
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 10,
          color: color.inkLow,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}>
          Mind cita fuentes · no responde sobre cosas que no están en el corpus · te dice cuándo no sabe.
        </div>
      </div>
    </div>
  );
}

function Message({ msg }: { msg: MockMindMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "min(720px, 92%)" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6,
          color: isUser ? color.inkLow : "#7dd3fc",
          fontFamily: "var(--kudos-font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}>
          {isUser ? "Tú" : "KUDOS Mind"}
        </div>
        <div style={{
          padding: "14px 18px",
          background: isUser ? "rgba(139,92,246,0.12)" : "rgba(56,189,248,0.06)",
          border: `1px solid ${isUser ? "rgba(139,92,246,0.32)" : "rgba(56,189,248,0.28)"}`,
          borderRadius: 18,
          borderTopLeftRadius: isUser ? 18 : 4,
          borderTopRightRadius: isUser ? 4 : 18,
          color: color.ink,
          fontFamily: "var(--kudos-font-body)",
          fontSize: 14.5,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}>
          {msg.body}
        </div>

        {msg.cards && msg.cards.length > 0 ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {msg.cards.map((c, i) => (
              <Link key={i} href={c.href} style={{ textDecoration: "none" }}>
                <GlassCard interactive style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <span aria-hidden style={{ color: "#7dd3fc", display: "inline-flex" }}>
                    <Icon name="discover" size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 13.5, fontWeight: 600, color: color.ink }}>{c.title}</div>
                    <div style={{ fontFamily: "var(--kudos-font-body)", fontSize: 11.5, color: color.inkMid, marginTop: 2 }}>{c.subtitle}</div>
                  </div>
                  <Icon name="chevron-right" size={14} />
                </GlassCard>
              </Link>
            ))}
          </div>
        ) : null}

        {msg.citations && msg.citations.length > 0 ? (
          <div style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${color.border}`,
            borderRadius: 10,
            fontFamily: "var(--kudos-font-mono)",
            fontSize: 10.5,
            color: color.inkMid,
            lineHeight: 1.6,
          }}>
            <span style={{ color: color.accentBright, letterSpacing: "0.14em", textTransform: "uppercase", marginRight: 6 }}>Fuentes</span>
            {msg.citations.map((c, i) => (
              <span key={i} style={{ marginRight: 12 }}>· {c.title}{c.year ? ` (${c.year})` : ""}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.22)", borderRadius: 18 }}>
        {[0,1,2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: 999,
            background: "#7dd3fc",
            animation: "kudos-breathe 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
            opacity: 0.55,
          }} />
        ))}
      </div>
    </div>
  );
}
