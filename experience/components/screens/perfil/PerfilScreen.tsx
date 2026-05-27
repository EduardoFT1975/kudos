"use client";

/**
 * KUDOS . PerfilScreen . Identity-first profile with merit anchor.
 *
 * Reemplaza el stub anterior. Real data via useMerit + useSaved + useVisited.
 * Foco: la pantalla Perfil = identidad + reputacion (acceso a /merito).
 */

import * as React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/design-system/v2";
import {
  readStreak,
  useMerit,
  useSaved,
  useVisited,
} from "@/lib/kudos/store";

const LEVEL_NAMES = [
  "Iniciado", "Explorador", "Curioso", "Descubridor", "Aventurero",
  "Cronista", "Explorador Experto", "Embajador", "Cartografo", "Visionario",
  "Maestro", "Leyenda", "Mitico",
];

export function PerfilScreen() {
  const { snapshot } = useMerit();
  const { saved } = useSaved();
  const { items: visited } = useVisited();
  const [streakDays, setStreakDays] = React.useState(0);
  React.useEffect(() => {
    setStreakDays(readStreak().days || 0);
  }, [snapshot.total]);

  const levelName = LEVEL_NAMES[Math.max(0, Math.min(snapshot.level - 1, LEVEL_NAMES.length - 1))];
  const prevBP = snapshot.level <= 1 ? 0 : levelBreakpoint(snapshot.level - 1);
  const nextBP = snapshot.nextLevelAt;
  const span = Math.max(1, nextBP - prevBP);
  const cur = Math.max(0, Math.min(snapshot.total - prevBP, span));
  const pct = Math.round((cur / span) * 100);
  const remaining = Math.max(0, nextBP - snapshot.total);

  const savedCount = saved.filter((s) => s.kind === "poi").length;
  const visitedCount = visited.length;

  return (
    <div className="kudos-perfil" style={ROOT}>
      {/* Identity hero */}
      <header style={HERO}>
        <div style={AVATAR_WRAP}>
          <div style={AVATAR_RING}>
            <div style={AVATAR_INNER}>E</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h1 style={NAME}>Eduardo</h1>
          <span style={HANDLE}>@eduardo . KUDOS</span>
          <div style={LEVEL_CHIP}>
            <BrandDot />
            <span>Nivel {snapshot.level} . {levelName}</span>
          </div>
        </div>
      </header>

      {/* Mi merito card . anchor a /merito */}
      <section>
        <h2 style={SECTION_EYEBROW}>MI M&Eacute;RITO</h2>
        <Link href="/merito" style={MERIT_CARD} aria-label="Ver detalle de merito">
          <div style={MERIT_CARD_HEAD}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={MERIT_LABEL}>Tu reputaci&oacute;n en KUDOS</span>
              <span style={MERIT_NUMBER}>
                <span>{snapshot.total}</span>
                <span style={MERIT_DIVIDER}>/{nextBP} pts</span>
              </span>
            </div>
            <span style={MERIT_CHEVRON}><Icon name="chevron-right" size={20} /></span>
          </div>

          <div style={PROGRESS_TRACK}>
            <div style={{ ...PROGRESS_FILL, width: `${pct}%` }} />
          </div>

          <div style={MERIT_CARD_FOOT}>
            <span style={MERIT_FOOT_LEFT}>
              {remaining > 0 ? (
                <span>Te faltan <strong style={{ color: "var(--kudos-accent-bright, #8B6BFF)" }}>{remaining} pts</strong> para Nivel {snapshot.level + 1}</span>
              ) : (
                <span>Has alcanzado el m&aacute;ximo de este nivel.</span>
              )}
            </span>
            <span style={MERIT_FOOT_RIGHT}>
              <span>Ver detalle</span>
              <Icon name="arrow-right" size={12} />
            </span>
          </div>
        </Link>
      </section>

      {/* Identity stats */}
      <section style={STATS_GRID}>
        <StatTile icon="saved"   color="#6C3CFF" label="Lugares guardados" value={savedCount} />
        <StatTile icon="here"    color="#34D399" label="Estuve aqu&iacute;"   value={visitedCount} />
        <StatTile icon="moments" color="#FF9A00" label="Racha de d&iacute;as"   value={streakDays} />
      </section>

      {/* Quick access rows */}
      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={SECTION_EYEBROW}>ATAJOS</h2>
        <AccessRow href="/mi-mundo"  icon="saved"    title="Mi Mundo"           sub="Tus lugares, rutas y colecciones" />
        <AccessRow href="/merito"    icon="founder"  title="Mi m&eacute;rito"        sub="Pilares, logros, multiplicadores" />
        <AccessRow href="/inicio"    icon="discover" title="Descubrir m&aacute;s"    sub="Vuelve al feed canonico" />
      </section>

      <div style={{ height: 28 }} />
    </div>
  );
}

// =====================================================================
// Sub-pieces
// =====================================================================

function StatTile({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: number }) {
  return (
    <div style={STAT_TILE}>
      <span style={{ ...STAT_ICON, background: `${color}33`, color }}>
        <Icon name={icon} size={18} />
      </span>
      <span style={STAT_NUMBER}>{value}</span>
      <span style={STAT_LABEL} dangerouslySetInnerHTML={{ __html: label }} />
    </div>
  );
}

function AccessRow({ href, icon, title, sub }: { href: string; icon: IconName; title: string; sub: string }) {
  return (
    <Link href={href} style={ACCESS_ROW}>
      <span style={ACCESS_ICON}><Icon name={icon} size={16} /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={ACCESS_TITLE} dangerouslySetInnerHTML={{ __html: title }} />
        <span style={ACCESS_SUB} dangerouslySetInnerHTML={{ __html: sub }} />
      </div>
      <Icon name="chevron-right" size={14} />
    </Link>
  );
}

function BrandDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="kudos-perfil-dot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF9A00" />
          <stop offset="50%"  stopColor="#FF3CAC" />
          <stop offset="100%" stopColor="#6C3CFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="none" stroke="url(#kudos-perfil-dot)" strokeWidth="3.5" />
      <path d="M 16 8 L 17.2 14.4 L 23.6 16 L 17.2 17.6 L 16 24 L 14.8 17.6 L 8.4 16 L 14.8 14.4 Z" fill="url(#kudos-perfil-dot)" />
    </svg>
  );
}

function levelBreakpoint(level: number): number {
  const bp = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10000];
  return bp[Math.min(level, bp.length - 1)] ?? 0;
}

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  padding: "20px 24px 0",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const HERO: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "8px 0 14px",
};

const AVATAR_WRAP: React.CSSProperties = {
  flexShrink: 0,
};

const AVATAR_RING: React.CSSProperties = {
  width: 72, height: 72,
  borderRadius: "50%",
  padding: 3,
  background: "var(--kudos-gradient-cta)",
  boxShadow: "0 12px 24px -8px rgba(108,60,255,0.55)",
};

const AVATAR_INNER: React.CSSProperties = {
  width: "100%", height: "100%",
  borderRadius: "50%",
  background: "var(--kudos-bg, #1A1333)",
  color: "var(--kudos-ink)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--kudos-font-display)",
  fontWeight: 700,
  fontSize: 26,
};

const NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: "var(--kudos-ink)",
};

const HANDLE: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(242,242,247,0.55)",
};

const LEVEL_CHIP: React.CSSProperties = {
  marginTop: 6,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  borderRadius: 999,
  background: "rgba(108,60,255,0.18)",
  border: "1px solid rgba(108,60,255,0.45)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 11.5,
  fontWeight: 600,
  width: "fit-content",
};

const SECTION_EYEBROW: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.18em",
  color: "rgba(242,242,247,0.55)",
  textTransform: "uppercase",
};

// Merit card
const MERIT_CARD: React.CSSProperties = {
  display: "block",
  padding: "18px 18px 16px",
  borderRadius: 18,
  background: "linear-gradient(135deg, rgba(255,154,0,0.10) 0%, rgba(108,60,255,0.16) 100%)",
  border: "1px solid rgba(108,60,255,0.32)",
  textDecoration: "none",
  color: "var(--kudos-ink)",
  cursor: "pointer",
};

const MERIT_CARD_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const MERIT_LABEL: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 500,
  color: "rgba(242,242,247,0.62)",
};

const MERIT_NUMBER: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 30,
  fontWeight: 700,
  letterSpacing: "-0.015em",
  color: "var(--kudos-ink)",
  lineHeight: 1,
};

const MERIT_DIVIDER: React.CSSProperties = {
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(242,242,247,0.45)",
};

const MERIT_CHEVRON: React.CSSProperties = {
  display: "inline-flex",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};

const PROGRESS_TRACK: React.CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  overflow: "hidden",
};

const PROGRESS_FILL: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "var(--kudos-gradient-cta)",
  boxShadow: "0 0 12px rgba(108,60,255,0.45)",
  transition: "width 320ms",
};

const MERIT_CARD_FOOT: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 10,
};

const MERIT_FOOT_LEFT: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(242,242,247,0.78)",
};

const MERIT_FOOT_RIGHT: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 12,
  fontWeight: 600,
};

// Stats grid
const STATS_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const STAT_TILE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const STAT_ICON: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const STAT_NUMBER: React.CSSProperties = {
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: "var(--kudos-ink)",
  lineHeight: 1,
};

const STAT_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(242,242,247,0.62)",
};

// Access rows
const ACCESS_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  textDecoration: "none",
  color: "var(--kudos-ink)",
};

const ACCESS_ICON: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: 10,
  background: "rgba(108,60,255,0.16)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const ACCESS_TITLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--kudos-ink)",
};

const ACCESS_SUB: React.CSSProperties = {
  fontSize: 11.5,
  color: "rgba(242,242,247,0.55)",
};
