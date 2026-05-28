"use client";

/**
 * KUDOS . MeritScreen . Canonical replica of Merito mockup.
 *
 * Single concrete file. Real store data via useMerit + readStreak + useSaved.
 * Honest fallbacks when no real signal exists.
 *
 * Layout:
 *   - Header: title + subtitle + descripcion
 *   - Right: 2 stat cards (Merit Score with ring progress + 30-day progress)
 *   - Pilares del merito: 5 cards (Creacion / Inspiracion / Descubrimiento /
 *     Comunidad / Integridad) real perPillar values + progress bars
 *   - Split: Contribuciones recientes (real merit events) + Logros
 *     (computed from real signals)
 *   - Split: Multiplicadores activos (4 cards . racha real + others honest)
 *     + Historial de merito (line chart 30d real)
 *   - Footer info bar: "Para que sirve el merito?" + 3 benefits
 */

import * as React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/design-system/v2";
import {
  readStreak,
  useMerit,
  useSaved,
  type MeritEvent,
  type MeritPillar,
} from "@/lib/kudos/store";

// =====================================================================
// Pillar definitions (display order + caps + colors)
// =====================================================================

interface PillarDef {
  id: MeritPillar;
  label: string;
  icon: IconName;
  color: string;
  cap: number;
  desc: string;
}

const PILLARS: ReadonlyArray<PillarDef> = [
  { id: "creacion",       label: "Creacion",       icon: "studio",   color: "#8B6BFF", cap: 300, desc: "Capsulas, guias y contenido original que aportan valor." },
  { id: "inspiracion",    label: "Inspiracion",    icon: "heart",    color: "#34D399", cap: 250, desc: "Impacto positivo en otros usuarios y la comunidad." },
  { id: "descubrimiento", label: "Descubrimiento", icon: "search",   color: "#FF9A00", cap: 200, desc: "Explorar, encontrar y compartir conocimiento valioso." },
  { id: "comunidad",      label: "Comunidad",      icon: "people",   color: "#38BDF8", cap: 150, desc: "Colaborar, ayudar y construir relaciones significativas." },
  { id: "integridad",     label: "Integridad",     icon: "founder",  color: "#FF3CAC", cap: 100, desc: "Calidad, confianza y respeto a las normas de KUDOS." },
];

const LEVEL_NAMES = [
  "Iniciado",       // L1
  "Explorador",     // L2
  "Curioso",        // L3
  "Descubridor",    // L4
  "Aventurero",     // L5
  "Cronista",       // L6
  "Explorador Experto",  // L7
  "Embajador",      // L8
  "Cartografo",     // L9
  "Visionario",     // L10
  "Maestro",        // L11
  "Leyenda",        // L12
  "Mitico",         // L13
];

// =====================================================================
// Component
// =====================================================================

export function MeritScreen() {
  const { snapshot } = useMerit();
  const { saved } = useSaved();
  const [streakDays, setStreakDays] = React.useState(0);

  React.useEffect(() => {
    setStreakDays(readStreak().days || 0);
  }, [snapshot.total]);

  const { total, level, nextLevelAt, perPillar, recent, last30 } = snapshot;
  const levelName = LEVEL_NAMES[Math.max(0, Math.min(level - 1, LEVEL_NAMES.length - 1))];

  // Progress toward next level
  const prevBP = level <= 1 ? 0 : levelBreakpoint(level - 1);
  const nextBP = nextLevelAt;
  const span = Math.max(1, nextBP - prevBP);
  const cur = Math.max(0, Math.min(total - prevBP, span));
  const pct = Math.round((cur / span) * 100);

  // Last 30 days sparkline points
  const sparkPoints = React.useMemo(() => buildSparkPath(last30), [last30]);

  // Footer stats (real)
  const totalGain30 = React.useMemo(() => last30.reduce((sum, d) => sum + d.points, 0), [last30]);
  const actions30 = recent.length; // simplified · real count of recent events
  const avg30 = totalGain30 > 0 ? (totalGain30 / 30).toFixed(1) : "0";

  // Logros computed from real signals (honest)
  const logros = React.useMemo(() => buildLogros({
    total,
    level,
    perPillar,
    streakDays,
    savedCount: saved.filter((s) => s.kind === "poi").length,
  }), [total, level, perPillar, streakDays, saved]);

  // Multiplicadores
  const multipliers = [
    { label: "Racha diaria",     sub: streakDays > 0 ? `${streakDays} d&iacute;as` : "Hoy comienzas", icon: "moments" as IconName, color: "#FF9A00", value: streakDays > 0 ? 1 + Math.min(streakDays * 0.05, 0.5) : 1.0 },
    { label: "Contenido validado", sub: "Sin se&ntilde;al a&uacute;n",       icon: "founder" as IconName, color: "#34D399", value: 1.0 },
    { label: "Impacto social",    sub: "Por tus c&aacute;psulas",     icon: "heart"   as IconName, color: "#FF3CAC", value: 1.0 },
    { label: "Invita a amigos",   sub: "Activa +10%",          icon: "people"  as IconName, color: "#8B6BFF", value: 0.0 },
  ];
  const multTotal = multipliers.reduce((acc, m) => m.value > 0 ? acc * m.value : acc, 1);

  return (
    <div className="kudos-merito" style={ROOT}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={HEADER}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <h1 style={H1}>M&Eacute;RITO</h1>
            <span style={INFO_ICON} aria-hidden><Icon name="more" size={16} /></span>
          </div>
          <p style={LEAD}>El motor que impulsa el valor en KUDOS</p>
          <p style={DESC}>
            Reconocemos las contribuciones que enriquecen el conocimiento,
            inspiran a otros y construyen comunidad.
          </p>
        </div>

        <div style={HEADER_STATS}>
          {/* Merit Score card */}
          <div style={STAT_CARD} className="kudos-elev-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={STAT_LABEL_TOP}>Merit Score</span>
              <span style={STAT_NUMBER}>
                <span>{total}</span>
                <span style={STAT_NUMBER_DIVIDER}>/{nextBP}</span>
              </span>
              <div style={LEVEL_CHIP}>
                <span style={LEVEL_DOT}><Icon name="founder" size={11} /></span>
                <span>Nivel {level} . {levelName}</span>
              </div>
            </div>
            <ProgressRing pct={pct} />
          </div>

          {/* 30-day progress card (honest replacement for fake rank) */}
          <div style={STAT_CARD} className="kudos-elev-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={STAT_LABEL_TOP}>Tu progreso</span>
              <span style={STAT_NUMBER_SMALL}>
                <span>+{totalGain30}</span>
                <span style={STAT_NUMBER_DIVIDER}>pts (30 d&iacute;as)</span>
              </span>
              <span style={{ ...STAT_LABEL_TOP, color: "rgba(242,242,247,0.5)" }}>
                {actions30 > 0 ? `${actions30} acciones recientes` : "Aun sin acciones registradas"}
              </span>
            </div>
            <Sparkline points={sparkPoints} />
          </div>
        </div>
      </header>

      {/* ── Tension block · Te faltan X para Nivel N ─────────────── */}
      <section style={TENSION_BLOCK} className="kudos-elev-1" aria-label="Progreso al siguiente nivel">
        <div style={TENSION_HEAD}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={TENSION_EYEBROW}>TU PR&Oacute;XIMO NIVEL</span>
            <h3 style={TENSION_TITLE}>
              {nextBP > total ? (
                <>
                  Te faltan <span style={TENSION_NUMBER}>{nextBP - total} pts</span> para subir a{" "}
                  <span style={TENSION_NEXT_LEVEL}>Nivel {level + 1}</span>
                </>
              ) : (
                <>Has alcanzado el m&aacute;ximo nivel disponible.</>
              )}
            </h3>
          </div>
          <Link href="/inicio" style={TENSION_CTA} className="kudos-tap">
            <span>Sigue descubriendo</span>
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <div style={TENSION_TRACK}>
          <div style={{ ...TENSION_FILL, width: `${pct}%` }} />
        </div>
        <div style={TENSION_FOOT}>
          <span>{cur} / {span} pts en este nivel</span>
          <span style={{ color: "var(--kudos-accent-bright, #8B6BFF)" }}>{pct}%</span>
        </div>
      </section>

      {/* ── Pilares del merito ──────────────────────────────────── */}
      <section style={SECTION}>
        <div style={SECTION_HEAD}>
          <h2 style={SECTION_TITLE}>Pilares del m&eacute;rito</h2>
          <button type="button" style={HOW_BTN}>
            <span>&iquest;C&oacute;mo funciona?</span>
            <Icon name="more" size={12} />
          </button>
        </div>

        <div style={PILLARS_GRID}>
          {PILLARS.map((p) => {
            const value = perPillar[p.id] ?? 0;
            const pctP = Math.min(100, Math.round((value / p.cap) * 100));
            return (
              <article key={p.id} style={PILLAR_CARD} className="kudos-tap-lift kudos-elev-1">
                <span style={{ ...PILLAR_ICON, background: `${p.color}24`, color: p.color }}>
                  <Icon name={p.icon} size={20} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <span style={PILLAR_LABEL}>{p.label}</span>
                  <span style={PILLAR_NUMBER}>
                    <span>{value}</span>
                    <span style={PILLAR_CAP}>/{p.cap}</span>
                  </span>
                </div>
                <div style={PROGRESS_TRACK}>
                  <div style={{ ...PROGRESS_FILL, width: `${pctP}%`, background: p.color, boxShadow: `0 0 12px ${p.color}55` }} />
                </div>
                <p style={PILLAR_DESC}>{p.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Split: Contribuciones recientes + Logros ───────────── */}
      <div className="kudos-merito-split" style={SPLIT}>
        <section style={PANEL} className="kudos-elev-1">
          <div style={PANEL_HEAD}>
            <h3 style={PANEL_TITLE}>Contribuciones recientes</h3>
            <a href="#" style={SEE_ALL}>Ver todas</a>
          </div>
          {recent.length > 0 ? (
            <ul style={LIST}>
              {recent.slice(0, 6).map((ev) => (
                <RecentRow key={ev.id} ev={ev} />
              ))}
            </ul>
          ) : (
            <EmptyHint text="A&uacute;n no has registrado contribuciones. Empieza guardando un POI o compartiendo una c&aacute;psula." />
          )}
        </section>

        <section style={PANEL} className="kudos-elev-1">
          <div style={PANEL_HEAD}>
            <h3 style={PANEL_TITLE}>Logros</h3>
            <a href="#" style={SEE_ALL}>Ver todos</a>
          </div>
          <ul style={LIST}>
            {logros.map((l) => (
              <LogroRow key={l.id} logro={l} />
            ))}
          </ul>
          <div style={NEXT_LOGRO}>
            <a href="#" style={NEXT_LOGRO_LINK}>
              <span>Ver pr&oacute;ximos logros</span>
              <Icon name="chevron-right" size={12} />
            </a>
          </div>
        </section>
      </div>

      {/* ── Split: Multiplicadores + Historial ──────────────────── */}
      <div className="kudos-merito-split" style={SPLIT}>
        <section style={PANEL} className="kudos-elev-1">
          <div style={PANEL_HEAD}>
            <h3 style={PANEL_TITLE}>Multiplicadores activos</h3>
            <span style={INFO_ICON_SMALL} aria-hidden><Icon name="more" size={12} /></span>
          </div>
          <div style={MULT_GRID}>
            {multipliers.map((m) => (
              <MultCard key={m.label} m={m} />
            ))}
          </div>
          <div style={MULT_FOOTER}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={MULT_TOTAL_LABEL}>Multiplicador total actual</span>
              <span style={MULT_TOTAL_VALUE}>{multTotal.toFixed(2)}x</span>
            </div>
            <a href="#" style={MULT_LINK}>
              <span>M&aacute;s m&eacute;rito por cada acci&oacute;n</span>
              <Icon name="arrow-right" size={12} style={{ transform: "rotate(-45deg)" }} />
            </a>
          </div>
        </section>

        <section style={PANEL} className="kudos-elev-1">
          <div style={PANEL_HEAD}>
            <h3 style={PANEL_TITLE}>Historial de m&eacute;rito</h3>
            <span style={INFO_ICON_SMALL}>30 d&iacute;as</span>
          </div>
          <div style={CHART_WRAP}>
            <SparklineLarge points={sparkPoints} maxValue={Math.max(...last30.map((d) => d.points), 10)} />
          </div>
          <div style={CHART_FOOTER}>
            <FooterStat label="M&Eacute;RITO GANADO" value={`+${totalGain30}`} color="#34D399" />
            <FooterStat label="ACCIONES"         value={String(actions30)}     color="#F2F2F7" />
            <FooterStat label="PROMEDIO DIARIO"  value={`+${avg30}`}           color="#8B6BFF" />
          </div>
        </section>
      </div>

      {/* ── Bottom info bar ─────────────────────────────────────── */}
      <section style={INFO_BAR} className="kudos-info-bar kudos-elev-1">
        <div style={INFO_BAR_LEFT}>
          <span style={INFO_GLYPH}>&#10038;</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <h3 style={INFO_BAR_TITLE}>&iquest;Para qu&eacute; sirve el m&eacute;rito?</h3>
            <p style={INFO_BAR_TEXT}>
              El m&eacute;rito te da visibilidad, acceso a beneficios exclusivos y te
              permite influir en la comunidad de KUDOS.
            </p>
          </div>
        </div>
        <div style={INFO_BAR_RIGHT}>
          <BenefitItem icon="map"     label="Mayor visibilidad"   sub="en el mapa y feed" />
          <BenefitItem icon="founder" label="Acceso a funciones"  sub="premium" />
          <BenefitItem icon="people"  label="Vota y decide"       sub="en la comunidad" />
        </div>
      </section>

      <div style={{ height: 32 }} />

      <style>{`
        @media (max-width: 1023.98px) {
          .kudos-merito-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          /* INFO_BAR: en mobile el grid 1.4fr+1fr aplasta los 3 beneficios.
             Apilamos vertical para que los textos no se superpongan. */
          .kudos-info-bar { grid-template-columns: 1fr !important; gap: 14px !important; }
          .kudos-info-bar > div:last-child { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 480px) {
          /* En móviles muy estrechos, apilamos también los 3 beneficios. */
          .kudos-info-bar > div:last-child { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .kudos-merito { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// Sub-components (inline, concrete)
// =====================================================================

function ProgressRing({ pct }: { pct: number }) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="kudos-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FF9A00" />
            <stop offset="50%"  stopColor="#FF3CAC" />
            <stop offset="100%" stopColor="#6C3CFF" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke="url(#kudos-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
    </div>
  );
}

function Sparkline({ points }: { points: string }) {
  return (
    <svg width="140" height="56" viewBox="0 0 140 56" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="kudos-spark-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#8B6BFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8B6BFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points ? (
        <>
          <path d={`${points} L 140,56 L 0,56 Z`} fill="url(#kudos-spark-fill)" />
          <path d={points} fill="none" stroke="#8B6BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </svg>
  );
}

function SparklineLarge({ points, maxValue }: { points: string; maxValue: number }) {
  return (
    <svg width="100%" height="180" viewBox="0 0 600 180" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="kudos-spark-large-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#6C3CFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6C3CFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y axis grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1="0" x2="600" y1={20 + g * 140} y2={20 + g * 140} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {points ? (
        <>
          <path d={`${pathScale(points)} L 600,160 L 0,160 Z`} fill="url(#kudos-spark-large-fill)" />
          <path d={pathScale(points)} fill="none" stroke="#8B6BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <text x="300" y="100" textAnchor="middle" fill="rgba(242,242,247,0.32)" fontFamily="Poppins" fontSize="13">
          Sin actividad en los ultimos 30 dias
        </text>
      )}
      {/* X axis labels */}
      <text x="0"   y="178" fill="rgba(242,242,247,0.42)" fontFamily="Poppins" fontSize="10">hace 30 d</text>
      <text x="300" y="178" textAnchor="middle" fill="rgba(242,242,247,0.42)" fontFamily="Poppins" fontSize="10">hace 15 d</text>
      <text x="600" y="178" textAnchor="end" fill="rgba(242,242,247,0.42)" fontFamily="Poppins" fontSize="10">hoy</text>
      {/* Mark max with circle */}
      {maxValue > 0 ? <circle cx="582" cy={20 + 140 * 0.15} r="4" fill="#8B6BFF" stroke="#1A1333" strokeWidth="2" /> : null}
    </svg>
  );
}

function pathScale(p: string): string {
  // Re-scale a 140x56 path approximate to 600x140 (axis grid uses y20-y160)
  // simple homothetic scale: x*=4.286, y*=2.5; offset y+20
  return p.replace(/([ML])\s*([\d.]+),([\d.]+)/g, (_m, cmd, x, y) => {
    const nx = (parseFloat(x) * (600 / 140)).toFixed(2);
    const ny = (20 + parseFloat(y) * (140 / 56)).toFixed(2);
    return `${cmd} ${nx},${ny}`;
  });
}

function RecentRow({ ev }: { ev: MeritEvent }) {
  const pillarMeta = PILLARS.find((p) => p.id === ev.pillar);
  return (
    <li style={RECENT_ROW}>
      <span style={{ ...RECENT_ICON, background: `${pillarMeta?.color ?? "#8B6BFF"}24`, color: pillarMeta?.color ?? "#8B6BFF" }}>
        <Icon name={pillarMeta?.icon ?? "founder"} size={14} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={RECENT_TITLE}>{ev.label}</span>
        <span style={RECENT_META}>{formatRel(ev.ts)}</span>
      </div>
      <span style={{ ...POINTS_PILL, color: pillarMeta?.color ?? "#8B6BFF" }}>+{ev.points}</span>
    </li>
  );
}

interface Logro { id: string; title: string; desc: string; icon: IconName; color: string; unlocked: boolean; }

function buildLogros(input: { total: number; level: number; perPillar: Record<MeritPillar, number>; streakDays: number; savedCount: number }): ReadonlyArray<Logro> {
  return [
    { id: "primer-descubrimiento", title: "Primer descubrimiento", desc: "Suma tu primer punto de descubrimiento", icon: "search",  color: "#FF9A00", unlocked: input.perPillar.descubrimiento > 0 },
    { id: "creador-constante",     title: "Creador constante",     desc: "Acumula 100 pts en creacion",            icon: "studio",  color: "#8B6BFF", unlocked: input.perPillar.creacion >= 100 },
    { id: "inspirador",            title: "Inspirador",            desc: "Recibe inspiracion de la comunidad",     icon: "heart",   color: "#34D399", unlocked: input.perPillar.inspiracion >= 50 },
    { id: "curador",               title: "Curador",               desc: "Guarda 10 POIs en Mi Mundo",              icon: "saved",   color: "#38BDF8", unlocked: input.savedCount >= 10 },
    { id: "racha-7d",              title: "Racha 7 dias",          desc: "Mantente activo 7 dias seguidos",         icon: "moments", color: "#FF3CAC", unlocked: input.streakDays >= 7 },
    { id: "nivel-3",               title: "Nivel 3",               desc: "Alcanza el nivel 3 en KUDOS",             icon: "founder", color: "#6C3CFF", unlocked: input.level >= 3 },
  ];
}

function LogroRow({ logro }: { logro: Logro }) {
  return (
    <li style={LOGRO_ROW}>
      <span style={{ ...LOGRO_ICON, background: `${logro.color}24`, color: logro.color }}>
        <Icon name={logro.icon} size={16} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ ...LOGRO_TITLE, color: logro.unlocked ? "var(--kudos-ink)" : "rgba(242,242,247,0.55)" }}>{logro.title}</span>
        <span style={LOGRO_DESC}>{logro.desc}</span>
      </div>
      <span style={logro.unlocked ? LOGRO_BADGE_OK : LOGRO_BADGE_PEND}>
        {logro.unlocked ? <Icon name="discover" size={12} /> : null}
      </span>
    </li>
  );
}

function MultCard({ m }: { m: { label: string; sub: string; icon: IconName; color: string; value: number } }) {
  const active = m.value > 0;
  return (
    <article style={MULT_CARD} className="kudos-tap-lift kudos-elev-1">
      <span style={MULT_LABEL} dangerouslySetInnerHTML={{ __html: m.label }} />
      <span style={MULT_SUB} dangerouslySetInnerHTML={{ __html: m.sub }} />
      <span style={{ ...MULT_GLYPH, background: active ? `${m.color}24` : "rgba(255,255,255,0.04)", color: active ? m.color : "rgba(242,242,247,0.35)" }}>
        <Icon name={m.icon} size={20} />
      </span>
      <span style={{ ...MULT_VALUE, color: active ? m.color : "rgba(242,242,247,0.35)" }}>
        {active ? `${m.value.toFixed(1)}x` : "0.0x"}
      </span>
    </article>
  );
}

function FooterStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={FOOTER_STAT}>
      <span style={{ ...FOOTER_STAT_LABEL }} dangerouslySetInnerHTML={{ __html: label }} />
      <span style={{ ...FOOTER_STAT_VALUE, color }}>{value}</span>
    </div>
  );
}

function BenefitItem({ icon, label, sub }: { icon: IconName; label: string; sub: string }) {
  return (
    <div style={BENEFIT_ITEM}>
      <span style={BENEFIT_ICON}><Icon name={icon} size={14} /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={BENEFIT_LABEL}>{label}</span>
        <span style={BENEFIT_SUB}>{sub}</span>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={EMPTY_HINT}>
      <span style={EMPTY_HINT_GLYPH}>&#10038;</span>
      <p style={EMPTY_HINT_TEXT} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

// =====================================================================
// Utilities
// =====================================================================

function buildSparkPath(days: ReadonlyArray<{ day: string; points: number }>): string {
  if (days.length === 0) return "";
  const max = Math.max(...days.map((d) => d.points), 10);
  const w = 140 / Math.max(1, days.length - 1);
  const h = 56;
  return days.map((d, i) => {
    const x = i * w;
    const y = h - (d.points / max) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function levelBreakpoint(level: number): number {
  const breakpoints = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5500, 7500, 10000];
  return breakpoints[Math.min(level, breakpoints.length - 1)] ?? 0;
}

function formatRel(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "hace 1 h" : `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? "ayer" : `hace ${days} dias`;
  const wk = Math.floor(days / 7);
  if (wk < 5) return wk === 1 ? "hace 1 sem" : `hace ${wk} sem`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return mo === 1 ? "hace 1 mes" : `hace ${mo} meses`;
  const yr = Math.floor(days / 365);
  return yr === 1 ? "hace 1 ano" : `hace ${yr} anos`;
}

// =====================================================================
// Styles
// =====================================================================

const ROOT: React.CSSProperties = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
  padding: "16px 24px 0",
  color: "var(--kudos-ink)",
  fontFamily: "var(--kudos-font-body)",
};

// Header
const HEADER: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
  gap: 22,
  alignItems: "flex-start",
  marginBottom: 22,
};

const H1: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: "clamp(36px, 5vw, 56px)",
  fontWeight: 700,
  letterSpacing: "0.02em",
  lineHeight: 1,
  color: "var(--kudos-ink)",
};

const INFO_ICON: React.CSSProperties = {
  width: 28, height: 28,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(242,242,247,0.55)",
};

const INFO_ICON_SMALL: React.CSSProperties = {
  ...INFO_ICON,
  width: 20, height: 20,
  fontSize: 10.5,
  fontFamily: "var(--kudos-font-mono)",
  padding: 0,
};

const LEAD: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  color: "var(--kudos-ink)",
};

const DESC: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  color: "rgba(242,242,247,0.62)",
  maxWidth: 460,
  lineHeight: 1.5,
};

const HEADER_STATS: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const STAT_CARD: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "center",
  padding: 16,
  borderRadius: 16,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const STAT_LABEL_TOP: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "rgba(242,242,247,0.55)",
};

const STAT_NUMBER: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 4,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 40,
  fontWeight: 700,
  letterSpacing: "-0.015em",
  color: "var(--kudos-ink)",
  lineHeight: 1,
};

const STAT_NUMBER_SMALL: React.CSSProperties = {
  ...STAT_NUMBER,
  fontSize: 28,
};

const STAT_NUMBER_DIVIDER: React.CSSProperties = {
  fontFamily: "var(--kudos-font-body)",
  fontSize: 14,
  fontWeight: 500,
  color: "rgba(242,242,247,0.45)",
};

const LEVEL_CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 11px",
  borderRadius: 999,
  background: "rgba(108,60,255,0.18)",
  border: "1px solid rgba(108,60,255,0.45)",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  fontSize: 11,
  fontWeight: 600,
  width: "fit-content",
  marginTop: 4,
};

const LEVEL_DOT: React.CSSProperties = {
  display: "inline-flex",
  color: "var(--kudos-accent-bright, #8B6BFF)",
};

// Sections
const SECTION: React.CSSProperties = {
  marginBottom: 22,
};

const SECTION_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--kudos-font-display)",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "-0.015em",
  color: "var(--kudos-ink)",
};

const HOW_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "transparent",
  border: "none",
  color: "var(--kudos-accent-bright, #8B6BFF)",
  cursor: "pointer",
  fontFamily: "var(--kudos-font-body)",
  fontSize: 12.5,
  fontWeight: 700,
  flexShrink: 0,
};

const TENSION_TRACK: React.CSSProperties = {
  height: 10,
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  overflow: "hidden",
};

const TENSION_FILL: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "var(--kudos-gradient-cta)",
  boxShadow: "0 0 14px rgba(108,60,255,0.45)",
  transition: "width 320ms",
};

const TENSION_FOOT: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontFamily: "var(--kudos-font-mono)",
  fontSize: 11,
  color: "rgba(242,242,247,0.62)",
};
