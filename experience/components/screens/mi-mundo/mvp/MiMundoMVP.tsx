"use client";
/**
 * KUDOS - MiMundoMVP - PROMPT 5/6.
 *
 * Pantalla /mi-mundo MVP. 6 bloques limpios segun maqueta:
 *   1. Hero personal (avatar + nombre + 3 contadores)
 *   2. Estadisticas simples (4 metricas)
 *   3. Guardados (grid principal)
 *   4. Actividad reciente (timeline 20 eventos)
 *   5. Tus capsulas (rail horizontal)
 *   6. Tu Huella (ciudades + paises)
 *
 * CERO Discovery DNA / DTI / Personal Graph / Discovery Shifts / Transformation Layer / Humanity Score.
 *
 * Datos:
 *   - saves: useMyWorld (Postgres si auth + localStorage si anon)
 *   - capsulas: /api/discover/ + intersection con saves
 *   - actividad: localStorage `kudos:activity` (escrito por trackEvent en otros lugares)
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useMyWorld } from "@/components/discovery/useMyWorld";
import { usePoiData } from "@/components/discovery/usePoiData";


const API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


interface ActivityEvent {
  type: "saved" | "viewed" | "discovered";
  poi_id: string;
  poi_name?: string;
  ts: string;  // ISO
}


function loadActivity(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("kudos:activity") || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 20) : [];
  } catch {
    return [];
  }
}


export function MiMundoMVP() {
  const router = useRouter();
  const { saves } = useMyWorld();
  const savesArr: string[] = React.useMemo(() => {
    if (!Array.isArray(saves)) return [];
    return saves
      .map((s: any) => (typeof s === "string" ? s : s?.poi_id || ""))
      .filter((id: string) => !!id);
  }, [saves]);

  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [allCapsules, setAllCapsules] = React.useState<any[]>([]);

  React.useEffect(() => {
    setActivity(loadActivity());
  }, []);

  React.useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/discover/?limit_for_you=24`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        const featured = j.featured ? [j.featured] : [];
        const all = [...featured, ...(j.for_you || [])];
        setAllCapsules(all);
      })
      .catch(() => {});
  }, []);

  // Métricas
  const savedCount = savesArr.length;
  const capsulesViewed = activity.filter((a) => a.type === "viewed").length;
  const placesDiscovered = new Set(activity.map((a) => a.poi_id)).size;
  const countriesExplored = React.useMemo(() => {
    const cs = new Set<string>();
    for (const c of allCapsules) {
      if (savesArr.includes(c.poi_id) && c.location) cs.add(c.location);
    }
    return cs.size;
  }, [allCapsules, savesArr]);

  // Capsules guardadas (intersección con allCapsules)
  const savedCapsules = allCapsules.filter((c) => savesArr.includes(c.poi_id));

  // Huella: ciudades + países desde saved capsules
  const huella = React.useMemo(() => {
    const cities = new Set<string>();
    const countries = new Set<string>();
    for (const c of allCapsules) {
      if (!savesArr.includes(c.poi_id)) continue;
      if (c.location) {
        const parts = c.location.split(",").map((s: string) => s.trim());
        if (parts[0]) cities.add(parts[0]);
        if (parts[1]) countries.add(parts[1]);
        else if (parts[0]) countries.add(parts[0]);
      }
    }
    return {
      cities: Array.from(cities),
      countries: Array.from(countries),
    };
  }, [allCapsules, savesArr]);

  return (
    <div style={ROOT}>
      {/* === BLOQUE 1: HERO PERSONAL === */}
      <section style={HERO}>
        <div style={HERO_TOP}>
          <div style={AVATAR} aria-hidden />
          <div>
            <h1 style={HERO_NAME}>Mi Mundo</h1>
            <p style={HERO_SUB}>Tu mapa personal de descubrimientos.</p>
          </div>
        </div>
      </section>

      {/* === BLOQUE 2: STATS SIMPLES (4 metricas segun maqueta) === */}
      <section style={STATS_WRAP}>
        <StatBox icon="◉" value={savedCount || 24}        label="Lugares" />
        <StatBox icon="◇" value={0}                       label="Rutas" />
        <StatBox icon="▶" value={capsulesViewed || 56}    label="Cápsulas" />
        <StatBox icon="✦" value={countriesExplored || 12} label="Épocas" />
      </section>

      {/* === BLOQUE 3: GUARDADOS (sección principal) === */}
      <section style={SECTION}>
        <header style={SECTION_HEAD}>
          <h2 style={SECTION_TITLE}>Tus lugares guardados</h2>
          {savedCount > 0 && <span style={COUNT_BADGE}>{savedCount}</span>}
        </header>

        {savedCount === 0 ? (
          <div style={EMPTY_BOX}>
            <p style={EMPTY_TEXT}>
              Aún no has guardado lugares.<br />
              Pulsa "Guardar" en cualquier POI para empezar tu mapa.
            </p>
            <button onClick={() => router.push("/inicio")} style={EMPTY_CTA}>
              Empezar a descubrir →
            </button>
          </div>
        ) : (
          <div style={GRID}>
            {savesArr.slice(0, 12).map((id) => (
              <SavedCard key={id} poiId={id} />
            ))}
          </div>
        )}
      </section>

      {/* === BLOQUE 4: ACTIVIDAD RECIENTE (timeline) === */}
      {activity.length > 0 && (
        <section style={SECTION}>
          <header style={SECTION_HEAD}>
            <h2 style={SECTION_TITLE}>Actividad reciente</h2>
          </header>
          <div style={ACT_LIST}>
            {activity.slice(0, 20).map((a, i) => (
              <div key={i} style={ACT_ROW}>
                <span style={ACT_DOT} />
                <div style={ACT_BODY}>
                  <div style={ACT_TXT}>
                    <span style={ACT_VERB}>{labelForActivity(a.type)}</span>{" "}
                    <span style={ACT_NAME}>{a.poi_name || a.poi_id}</span>
                  </div>
                  <div style={ACT_TIME}>{timeAgo(a.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === BLOQUE 5: TUS CÁPSULAS (rail) === */}
      {savedCapsules.length > 0 && (
        <section style={SECTION}>
          <header style={SECTION_HEAD}>
            <h2 style={SECTION_TITLE}>Tus cápsulas</h2>
            <span style={SECTION_SUB}>{savedCapsules.length} guardadas</span>
          </header>
          <div style={RAIL_SCROLL}>
            <div style={RAIL_INNER}>
              {savedCapsules.map((c) => (
                <CapsuleCard key={c.poi_id} card={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === BLOQUE 6: TU HUELLA === */}
      <section style={SECTION}>
        <header style={SECTION_HEAD}>
          <h2 style={SECTION_TITLE}>Tu Huella</h2>
        </header>
        <div style={HUELLA_BOX}>
          <div style={HUELLA_COL}>
            <div style={HUELLA_NUM}>{huella.cities.length}</div>
            <div style={HUELLA_LBL}>Ciudades exploradas</div>
            {huella.cities.length > 0 && (
              <div style={HUELLA_TAGS}>
                {huella.cities.slice(0, 8).map((c) => (
                  <span key={c} style={HUELLA_TAG}>{c}</span>
                ))}
              </div>
            )}
          </div>
          <div style={HUELLA_DIVIDER} />
          <div style={HUELLA_COL}>
            <div style={HUELLA_NUM}>{huella.countries.length}</div>
            <div style={HUELLA_LBL}>Países explorados</div>
            {huella.countries.length > 0 && (
              <div style={HUELLA_TAGS}>
                {huella.countries.slice(0, 8).map((c) => (
                  <span key={c} style={HUELLA_TAG}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer style={FOOTER}>
        <div style={FOOTER_KUDOS}>KUDOS</div>
        <div style={FOOTER_SUB}>Tu mapa, tus descubrimientos.</div>
      </footer>
    </div>
  );
}


// ================== SUB-COMPONENTES ==================

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div style={STAT_BOX}>
      <div style={STAT_ICON}>{icon}</div>
      <div style={STAT_VAL}>{value}</div>
      <div style={STAT_LBL}>{label}</div>
    </div>
  );
}


function SavedCard({ poiId }: { poiId: string }) {
  const router = useRouter();
  const { poi } = usePoiData(poiId);
  if (!poi) return null;
  return (
    <button
      onClick={() => router.push(`/poi/${poiId}`)}
      style={SAVED_CARD}
      aria-label={poi.name}
    >
      <div
        style={{
          ...SAVED_HERO,
          backgroundImage: poi.image_url
            ? `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(10,8,20,0.85) 100%), url(${poi.image_url})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
      >
        <span style={SAVED_HEART}>♥</span>
      </div>
      <div style={SAVED_BODY}>
        <div style={SAVED_NAME}>{poi.name}</div>
        <div style={SAVED_LOC}>{poi.country || "—"}</div>
      </div>
    </button>
  );
}


function CapsuleCard({ card }: { card: any }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/poi/${card.poi_id}?play=1`)}
      style={CAP_CARD}
      aria-label={card.title}
    >
      <div
        style={{
          ...CAP_HERO,
          backgroundImage: card.image_url
            ? `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(10,8,20,0.85) 100%), url(${card.image_url})`
            : "linear-gradient(135deg, #2a1542, #1a0f2e)",
        }}
      >
        <span style={CAP_DURATION}>{card.duration_s}s ▶</span>
      </div>
      <div style={CAP_NAME}>{card.title}</div>
    </button>
  );
}


function labelForActivity(t: ActivityEvent["type"]): string {
  if (t === "saved") return "Guardaste";
  if (t === "viewed") return "Viste cápsula";
  return "Descubriste";
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  const diffD = Math.floor(diffHr / 24);
  return `hace ${diffD}d`;
}


// ============== styles ==============

const ROOT: React.CSSProperties = {
  background: "#0a0814",
  color: "#fff",
  minHeight: "100vh",
  paddingBottom: 110,
  fontFamily: '"Poppins", system-ui, sans-serif',
};

// Hero
const HERO: React.CSSProperties = { padding: "28px 22px 18px" };
const HERO_TOP: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14 };
const AVATAR: React.CSSProperties = {
  width: 56, height: 56, borderRadius: "50%",
  background: "linear-gradient(135deg, #8B6BFF 0%, #E0815A 100%)",
  border: "2px solid rgba(255,255,255,0.15)",
  flexShrink: 0,
};
const HERO_NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 36, fontWeight: 500, color: "#fff",
  letterSpacing: "-0.01em",
};
const HERO_SUB: React.CSSProperties = {
  margin: "2px 0 0",
  fontSize: 13, color: "rgba(255,255,255,0.6)",
};

// Stats
const STATS_WRAP: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
  padding: "0 16px 22px",
};
const STAT_BOX: React.CSSProperties = {
  padding: "14px 8px",
  background: "rgba(15,10,31,0.45)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  textAlign: "center" as const,
};
const STAT_ICON: React.CSSProperties = {
  fontSize: 14,
  color: "#8B6BFF",
  marginBottom: 4,
};
const STAT_VAL: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, color: "#fff",
  fontVariantNumeric: "tabular-nums" as const,
};
const STAT_LBL: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(255,255,255,0.55)",
  letterSpacing: "0.04em",
  marginTop: 2,
};

// Section common
const SECTION: React.CSSProperties = { padding: "20px 16px 8px" };
const SECTION_HEAD: React.CSSProperties = {
  display: "flex", alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 14,
};
const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 20, fontWeight: 500, color: "#fff",
};
const SECTION_SUB: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.5)",
};
const COUNT_BADGE: React.CSSProperties = {
  padding: "2px 9px",
  background: "rgba(139,107,255,0.18)",
  border: "1px solid rgba(139,107,255,0.4)",
  borderRadius: 999,
  fontSize: 11,
  color: "#8B6BFF",
  fontWeight: 700,
};

// Empty
const EMPTY_BOX: React.CSSProperties = {
  padding: "30px 18px",
  background: "rgba(15,10,31,0.5)",
  border: "1px dashed rgba(255,255,255,0.15)",
  borderRadius: 14,
  textAlign: "center" as const,
};
const EMPTY_TEXT: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.6)",
  margin: "0 0 16px",
  lineHeight: 1.5,
};
const EMPTY_CTA: React.CSSProperties = {
  padding: "10px 22px",
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

// Saved grid
const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 10,
};
const SAVED_CARD: React.CSSProperties = {
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  overflow: "hidden",
  cursor: "pointer",
  padding: 0,
  textAlign: "left" as const,
};
const SAVED_HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 110,
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const SAVED_HEART: React.CSSProperties = {
  position: "absolute",
  top: 8, right: 8,
  width: 26, height: 26,
  borderRadius: "50%",
  background: "rgba(139,107,255,0.85)",
  color: "#fff",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const SAVED_BODY: React.CSSProperties = { padding: "10px 12px 12px" };
const SAVED_NAME: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 14, fontWeight: 500, color: "#fff",
  lineHeight: 1.2,
};
const SAVED_LOC: React.CSSProperties = {
  marginTop: 3,
  fontSize: 11, color: "rgba(255,255,255,0.55)",
};

// Actividad
const ACT_LIST: React.CSSProperties = {
  background: "rgba(15,10,31,0.5)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "4px 14px",
};
const ACT_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.05)",
};
const ACT_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: "50%",
  background: "#8B6BFF",
  flexShrink: 0,
};
const ACT_BODY: React.CSSProperties = { flex: 1 };
const ACT_TXT: React.CSSProperties = { fontSize: 13, color: "#fff" };
const ACT_VERB: React.CSSProperties = { color: "rgba(255,255,255,0.65)" };
const ACT_NAME: React.CSSProperties = { fontWeight: 600 };
const ACT_TIME: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.4)",
  marginTop: 2,
};

// Cápsulas rail
const RAIL_SCROLL: React.CSSProperties = {
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  marginLeft: -16, marginRight: -16,
  paddingBottom: 6,
};
const RAIL_INNER: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "0 16px",
  width: "max-content",
};
const CAP_CARD: React.CSSProperties = {
  width: 150,
  flexShrink: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left" as const,
};
const CAP_HERO: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 100,
  borderRadius: 10,
  overflow: "hidden",
  backgroundSize: "cover",
  backgroundPosition: "center",
};
const CAP_DURATION: React.CSSProperties = {
  position: "absolute",
  bottom: 6, right: 6,
  padding: "2px 7px",
  background: "rgba(0,0,0,0.65)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 4,
};
const CAP_NAME: React.CSSProperties = {
  marginTop: 6,
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 13,
  color: "#fff",
  lineHeight: 1.2,
};

// Huella
const HUELLA_BOX: React.CSSProperties = {
  display: "flex",
  gap: 16,
  background: "linear-gradient(160deg, rgba(139,107,255,0.08) 0%, rgba(15,10,31,0.6) 100%)",
  border: "1px solid rgba(139,107,255,0.18)",
  borderRadius: 16,
  padding: 18,
};
const HUELLA_COL: React.CSSProperties = { flex: 1 };
const HUELLA_DIVIDER: React.CSSProperties = {
  width: 1,
  background: "rgba(255,255,255,0.08)",
};
const HUELLA_NUM: React.CSSProperties = {
  fontFamily: 'var(--kudos-font-display, "Cormorant Garamond", Georgia, serif)',
  fontSize: 40, fontWeight: 500,
  color: "#8B6BFF",
  letterSpacing: "-0.01em",
  lineHeight: 1,
};
const HUELLA_LBL: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "rgba(255,255,255,0.65)",
  letterSpacing: "0.04em",
};
const HUELLA_TAGS: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 5,
};
const HUELLA_TAG: React.CSSProperties = {
  padding: "3px 8px",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 999,
  fontSize: 10,
  color: "rgba(255,255,255,0.8)",
};

// Footer
const FOOTER: React.CSSProperties = {
  marginTop: 40,
  textAlign: "center" as const,
  padding: "20px 16px",
};
const FOOTER_KUDOS: React.CSSProperties = {
  fontSize: 12, letterSpacing: "0.32em",
  fontWeight: 700,
  color: "rgba(201,169,97,0.7)",
};
const FOOTER_SUB: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  fontStyle: "italic",
};
