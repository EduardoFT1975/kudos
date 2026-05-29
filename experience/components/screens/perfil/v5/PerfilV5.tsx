"use client";
/**
 * KUDOS · /perfil v5 · identidad personal.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMyWorld } from "@/components/discovery/useMyWorld";


const LEVELS = [
  { name: "Iniciado",   max: 100, color: "#8B6BFF" },
  { name: "Explorador", max: 500, color: "#C9A961" },
  { name: "Cronista",   max: 1500, color: "#6BA888" },
  { name: "Custodio",   max: 5000, color: "#A85858" },
];


function levelFor(score: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].max) {
      return LEVELS[Math.min(i + 1, LEVELS.length - 1)];
    }
  }
  return LEVELS[0];
}


export function PerfilV5() {
  const router = useRouter();
  const { count, userId } = useMyWorld();
  const reputationScore = count * 5 + 20;        // MVP placeholder
  const level = levelFor(reputationScore);
  const pctToNext = Math.min(100, (reputationScore / level.max) * 100);
  const ptsLeft = Math.max(0, level.max - reputationScore);

  return (
    <div style={ROOT}>
      <header style={HDR}>
        <div style={HDR_LOGO}>KUDOS</div>
        <button style={HDR_BTN}>⌕</button>
      </header>

      <section style={HERO}>
        <div style={AVATAR}>
          <span style={AVATAR_TXT}>E</span>
        </div>
        <h1 style={NAME}>Eduardo</h1>
        <p style={HANDLE}>@eduardo · KUDOS</p>
        <div style={LEVEL_BADGE}>
          <span style={{ ...LEVEL_DOT, background: level.color }} />
          <span>Nivel {LEVELS.indexOf(level) + 1} · {level.name}</span>
        </div>
      </section>

      <section style={CARD}>
        <div style={CARD_HEAD}>
          <span style={SECTION_LBL}>MI MÉRITO</span>
        </div>
        <div style={REP_TITLE}>Tu reputación en KUDOS</div>
        <div style={REP_SCORE}>
          <span style={REP_NUM}>{reputationScore}</span>
          <span style={REP_OF}>/{level.max} pts</span>
        </div>
        <div style={REP_BAR}>
          <div style={{ ...REP_FILL, width: `${pctToNext}%`, background: `linear-gradient(90deg, #8B6BFF, ${level.color})` }} />
        </div>
        <div style={REP_FOOT}>
          {ptsLeft > 0 ? (
            <span>Te faltan <strong style={{ color: level.color }}>{ptsLeft} pts</strong> para Nivel {LEVELS.indexOf(level) + 2}</span>
          ) : (
            <span>Has alcanzado el nivel máximo · gracias por explorar</span>
          )}
        </div>
      </section>

      <div style={STATS_GRID}>
        <StatCell icon="🌍" value={count} label="Lugares guardados" />
        <StatCell icon="📍" value={0} label="Estuve aquí" />
        <StatCell icon="🔥" value={0} label="Racha de días" />
      </div>

      <section style={SHORTCUTS}>
        <div style={SECTION_LBL}>ATAJOS</div>
        <Shortcut icon="🌍" title="Mi Mundo" desc="Tus lugares, rutas y colecciones" onClick={() => router.push("/mi-mundo")} />
        <Shortcut icon="✨" title="Mis cápsulas" desc="Las que has creado" onClick={() => router.push("/mi-mundo")} />
        <Shortcut icon="⚙" title="Ajustes" desc="Privacidad, idioma, notificaciones" onClick={() => {}} />
      </section>

      <div style={USER_INFO}>
        <span>ID anónimo: {userId.slice(0, 16)}...</span>
      </div>
    </div>
  );
}


function StatCell({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div style={STAT_CARD}>
      <div style={STAT_ICON}>{icon}</div>
      <div style={STAT_VAL}>{value}</div>
      <div style={STAT_LBL}>{label}</div>
    </div>
  );
}


function Shortcut({ icon, title, desc, onClick }: {
  icon: string; title: string; desc: string; onClick: () => void;
}) {
  return (
    <div style={SC_ROW} onClick={onClick}>
      <div style={SC_ICON}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={SC_TITLE}>{title}</div>
        <div style={SC_DESC}>{desc}</div>
      </div>
      <span style={SC_ARROW}>›</span>
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
};
const HDR_LOGO: React.CSSProperties = {
  fontWeight: 700, fontSize: 18, letterSpacing: "0.18em", color: "#fff",
};
const HDR_BTN: React.CSSProperties = {
  width: 38, height: 38, borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", cursor: "pointer", fontSize: 14,
};

const HERO: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "20px 22px 30px",
};
const AVATAR: React.CSSProperties = {
  width: 96, height: 96, borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF, #E0815A)",
  margin: "0 auto 14px",
  border: "3px solid rgba(139,107,255,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const AVATAR_TXT: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 42, color: "#fff",
};
const NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 30, fontWeight: 400, color: "#fff",
};
const HANDLE: React.CSSProperties = {
  margin: "4px 0 12px", fontSize: 12, color: "rgba(255,255,255,0.55)",
};
const LEVEL_BADGE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "6px 14px", borderRadius: 999,
  background: "rgba(139,107,255,0.15)",
  border: "1px solid rgba(139,107,255,0.32)",
  fontSize: 12, color: "#fff",
};
const LEVEL_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
};

const CARD: React.CSSProperties = {
  margin: "0 22px 18px",
  background: "rgba(15,10,31,0.6)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 16, padding: 20,
};
const CARD_HEAD: React.CSSProperties = { marginBottom: 14 };
const SECTION_LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.55)",
};
const REP_TITLE: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10,
};
const REP_SCORE: React.CSSProperties = {
  display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12,
};
const REP_NUM: React.CSSProperties = {
  fontSize: 44, fontWeight: 700, color: "#fff",
};
const REP_OF: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.55)",
};
const REP_BAR: React.CSSProperties = {
  height: 6, background: "rgba(255,255,255,0.06)",
  borderRadius: 999, overflow: "hidden" as const,
};
const REP_FILL: React.CSSProperties = {
  height: "100%", borderRadius: 999,
  transition: "width 0.4s ease",
};
const REP_FOOT: React.CSSProperties = {
  marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.55)",
};

const STATS_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10, padding: "0 22px 18px",
};
const STAT_CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(139,107,255,0.12)",
  borderRadius: 14, padding: 14,
  textAlign: "center" as const,
};
const STAT_ICON: React.CSSProperties = { fontSize: 18, marginBottom: 6 };
const STAT_VAL: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: "#fff" };
const STAT_LBL: React.CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 4 };

const SHORTCUTS: React.CSSProperties = { padding: "0 22px" };
const SC_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "14px 16px",
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(139,107,255,0.12)",
  borderRadius: 14, marginBottom: 8,
  cursor: "pointer",
};
const SC_ICON: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: "rgba(139,107,255,0.18)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16,
};
const SC_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#fff" };
const SC_DESC: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 };
const SC_ARROW: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: 18 };

const USER_INFO: React.CSSProperties = {
  textAlign: "center" as const, padding: "30px 22px",
  fontSize: 9, color: "rgba(255,255,255,0.25)",
};
