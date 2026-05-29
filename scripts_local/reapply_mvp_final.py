"""
Re-aplica los edits del MVP final usando escritura atómica con tempfile+os.replace.
Evita el bug de truncamiento de Cowork con archivos >15KB.
"""
import os, sys, tempfile, re

ROOT = os.environ.get("KUDOS_ROOT", r"C:\Users\efert\kudos_project")
if not os.path.exists(ROOT):
    # Linux sandbox path mapping
    alt = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
    if os.path.exists(alt):
        ROOT = alt


def atomic_write(path: str, content: str) -> None:
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d, text=False)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content.encode("utf-8"))
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except: pass
        raise


def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def patch_homefeed():
    """Añadir import TimelineStoryRail + wrap antes de ErasCard."""
    p = os.path.join(ROOT, "experience", "components", "screens", "home", "v5", "HomeFeedV5.tsx")
    s = read_file(p)
    if "TimelineStoryRail" in s:
        print("HomeFeedV5: already patched, skip")
        return
    s = s.replace(
        'import { ErasCard } from "./ErasCard";',
        'import { ErasCard } from "./ErasCard";\nimport { TimelineStoryRail } from "./TimelineStoryRail";',
    )
    s = s.replace(
        '      <ErrorBoundary fallback={null}>\n        <ErasCard />\n      </ErrorBoundary>',
        '      <ErrorBoundary fallback={null}>\n        <TimelineStoryRail />\n      </ErrorBoundary>\n\n      <ErrorBoundary fallback={null}>\n        <ErasCard />\n      </ErrorBoundary>',
    )
    atomic_write(p, s)
    print("HomeFeedV5: patched OK")


def patch_merit():
    """Cambiar import + uso PLACEHOLDER + añadir buildMeritView/deriveTags."""
    p = os.path.join(ROOT, "experience", "components", "screens", "merit", "v5", "MeritEngineV5.tsx")
    s = read_file(p)
    if "useSignals" in s:
        print("MeritEngineV5: already patched, skip")
        return
    old_imports = (
        'import * as React from "react";\n'
        'import { useRouter } from "next/navigation";\n'
        'import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";'
    )
    new_imports = (
        'import * as React from "react";\n'
        'import { useRouter } from "next/navigation";\n'
        'import { KudosFlowerLogo } from "@/components/brand/KudosFlowerLogo";\n'
        'import { useSignals, meritScore, meritLabel, type PoiSignalsData } from "@/components/discovery/useSignals";\n'
        'import { usePoiData, type PoiData } from "@/components/discovery/usePoiData";'
    )
    assert old_imports in s, "merit imports not found"
    s = s.replace(old_imports, new_imports, 1)

    # Insertar buildMeritView + deriveTags antes de "export function MeritEngineV5"
    helpers = '''
/** Convierte signals + poi reales al shape que esperan las cards. */
function buildMeritView(poiId: string, poi: PoiData | null, signals: PoiSignalsData | null) {
  if (!signals || !poi) return PLACEHOLDER;
  const score = meritScore(signals);
  const label = meritLabel(score);
  const factors = [
    { id: "impacto",     emoji: "★", name: "Impacto cultural",      sub: "Importancia histórica y cultural global", value: Math.round(signals.importance_score / 5),     max: 20 },
    { id: "conexion",    emoji: "♥", name: "Conexión emocional",    sub: "Capacidad de generar emoción y asombro",  value: Math.round(signals.emotion_score / 5),         max: 20 },
    { id: "relevancia",  emoji: "◍", name: "Relevancia colectiva",  sub: "Cuántas personas lo valoran positivamente", value: Math.round(signals.discovery_score / 5),     max: 20 },
    { id: "calidad",     emoji: "◉", name: "Calidad del contenido", sub: "Rigor, profundidad y claridad",            value: Math.round((signals.discovery_score + signals.importance_score) / 12), max: 20 },
    { id: "permanencia", emoji: "⏱", name: "Permanencia temporal",  sub: "Valor a lo largo del tiempo y generaciones", value: Math.round(signals.memory_score * 15 / 100), max: 15 },
    { id: "contexto",    emoji: "PIN", name: "Contexto local",        sub: "Importancia para el lugar y su comunidad", value: Math.round(signals.future_value_score * 10 / 100), max: 10 },
  ];
  const ep = signals.emotion_profile || {};
  const affinities = [
    { id: "tema",     name: "Afinidad temática",   value: Math.round((ep.aprendizaje || 0.3) * 100 + 40) },
    { id: "interes",  name: "Interés histórico",   value: Math.round((ep.asombro || 0.32) * 100 + 35) },
    { id: "viajes",   name: "Viajes futuros",      value: Math.round(signals.future_value_score * 0.9) },
    { id: "conexion", name: "Conexión personal",   value: Math.round((ep.conexion || 0.14) * 100 + 30) },
  ].map((a) => ({ ...a, value: Math.min(99, Math.max(20, a.value)) }));
  const total = Math.max(50, signals.total_resonances || 800);
  const community = {
    total,
    breakdown: [
      { name: "Inspirador",     pct: Math.round((ep.asombro || 0.4) * 100 * 1.6),    color: "#4a9d5f" },
      { name: "Impresionante",  pct: Math.round((ep.inspiracion || 0.18) * 100),     color: "#4080c8" },
      { name: "Interesante",    pct: Math.round((ep.aprendizaje || 0.24) * 100 * 0.4), color: "#d4a857" },
      { name: "Neutral",        pct: 2, color: "#888" },
      { name: "Poco relevante", pct: 1, color: "#c85858" },
    ].map((b) => ({ ...b, pct: Math.min(80, Math.max(1, b.pct)) })),
  };
  const sum = community.breakdown.reduce((a, b) => a + b.pct, 0);
  if (sum > 0) community.breakdown = community.breakdown.map((b) => ({ ...b, pct: Math.round(b.pct * 100 / sum) }));
  return {
    name: poi.name,
    location: poi.country || "—",
    category: poi.category,
    score,
    scoreLabel: label,
    scoreDelta: Math.round(signals.discovery_score / 10),
    factors,
    affinities,
    tags: deriveTagsMerit(poi.category),
    comparativa: [
      { rank: 2, name: "Machu Picchu", score: Math.max(75, score - 4) },
      { rank: 1, name: poi.name,        score },
      { rank: 3, name: "Taj Mahal",     score: Math.max(72, score - 6) },
    ],
    community,
    countries: Math.max(20, Math.round(signals.total_views / 80)),
  };
}


function deriveTagsMerit(category: string): string[] {
  const c = (category || "").toLowerCase();
  if (c.includes("monumento") || c.includes("imperio")) return ["Historia antigua", "Arquitectura", "Viajes", "Civilizaciones"];
  if (c.includes("religioso") || c.includes("iglesia")) return ["Espiritualidad", "Arquitectura sacra", "Arte", "Patrimonio"];
  if (c.includes("arqueol"))                              return ["Historia antigua", "Descubrimiento", "Civilizaciones"];
  if (c.includes("museo"))                                 return ["Arte", "Conocimiento", "Cultura"];
  if (c.includes("natural") || c.includes("parque"))      return ["Naturaleza", "Paisaje", "Biosfera"];
  return ["Cultura", "Patrimonio", "Viajes"];
}


export function MeritEngineV5({ poiId }: Props) {
  const router = useRouter();
  const { data: signals } = useSignals(poiId);
  const { poi } = usePoiData(poiId);
  const m = buildMeritView(poiId, poi, signals);

  return ('''
    old_fn_start = '''export function MeritEngineV5({ poiId }: Props) {
  const router = useRouter();
  const m = PLACEHOLDER;     // futuro: fetch /api/merit/{poiId}

  return ('''
    assert old_fn_start in s, "merit function start not found"
    s = s.replace(old_fn_start, helpers, 1)
    # Renombrar comentario placeholder
    s = s.replace("// Placeholder Phase 1\n", "// Placeholder Phase 1 (solo se usa si signals/poi devuelven null)\n", 1)
    atomic_write(p, s)
    print("MeritEngineV5: patched OK")


def patch_mimundo():
    """Conectar saves reales + FavCard."""
    p = os.path.join(ROOT, "experience", "components", "screens", "mi-mundo", "v5", "MiMundoV5.tsx")
    s = read_file(p)
    if "useMyWorld" in s and "FavCard" in s:
        print("MiMundoV5: already patched, skip")
        return
    s = s.replace(
        'import { MyWorldMiniMap } from "@/components/discovery/MyWorldMiniMap";',
        'import { MyWorldMiniMap } from "@/components/discovery/MyWorldMiniMap";\nimport { useMyWorld } from "@/components/discovery/useMyWorld";\nimport { usePoiData } from "@/components/discovery/usePoiData";',
        1,
    )
    old_state = (
        'export function MiMundoV5() {\n'
        '  const router = useRouter();\n'
        '  const [saves, setSaves] = React.useState<string[]>([]);\n'
        '\n'
        '  React.useEffect(() => {\n'
        '    try {\n'
        '      const s = JSON.parse(localStorage.getItem("kudos:saves") || "[]");\n'
        '      setSaves(Array.isArray(s) ? s : []);\n'
        '    } catch {}\n'
        '  }, []);'
    )
    new_state = (
        'export function MiMundoV5() {\n'
        '  const router = useRouter();\n'
        '  const { saves: myWorld } = useMyWorld();\n'
        '  const saves: string[] = React.useMemo(() => {\n'
        '    if (!Array.isArray(myWorld)) return [];\n'
        '    return myWorld.map((s: any) => typeof s === "string" ? s : (s?.poi_id || ""))\n'
        '                  .filter((id: string) => !!id);\n'
        '  }, [myWorld]);'
    )
    assert old_state in s, "mi-mundo state init not found"
    s = s.replace(old_state, new_state, 1)
    # Pasar saves al FavoritosCard
    s = s.replace(
        '<FavoritosCard count={saves.length} />',
        '<FavoritosCard count={saves.length} saves={saves} />',
        1,
    )
    # Reemplazar FavoritosCard función
    old_fav = '''function FavoritosCard({ count }: { count: number }) {
  const favoritos = [
    { name: "Coliseo", loc: "Roma, Italia", capsules: 8 },
    { name: "Machu Picchu", loc: "Cusco, Perú", capsules: 6 },
    { name: "Kyoto", loc: "Japón", capsules: 4 },
  ];
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tus lugares de Mi Mundo</h3>
        <a style={SEE_ALL}>Ver todos ›</a>
      </div>
      <div style={FAV_GRID}>
        {favoritos.map((f) => (
          <div key={f.name} style={FAV_CARD}>
            <div style={FAV_HERO}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <AddToMyWorldButton poiId={f.name.toLowerCase().replace(/\\s+/g, "-")} poiName={f.name} variant="compact" showMeaningPicker={false} />
              </div>
            </div>
            <div style={FAV_BODY}>
              <div style={FAV_NAME}>{f.name}</div>
              <div style={FAV_LOC}>{f.loc}</div>
              <div style={FAV_CHIP}>{f.capsules} cápsulas</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}'''
    new_fav = '''function FavoritosCard({ count, saves }: { count: number; saves: string[] }) {
  const ids = saves.slice(0, 6);
  return (
    <div style={CARD}>
      <div style={CARD_HEAD}>
        <h3 style={CARD_TITLE}>Tus lugares de Mi Mundo</h3>
        <a style={SEE_ALL} href="/guardados">Ver todos ›</a>
      </div>
      {ids.length === 0 ? (
        <div style={{ padding: "20px 8px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          Aún no has añadido lugares a Mi Mundo.<br/>
          Pulsa el corazón en cualquier POI para empezar.
        </div>
      ) : (
        <div style={FAV_GRID}>
          {ids.map((id) => <FavCard key={id} id={id} />)}
        </div>
      )}
    </div>
  );
}


function FavCard({ id }: { id: string }) {
  const { poi } = usePoiData(id);
  if (!poi) return null;
  return (
    <a href={`/poi/${id}`} style={{ ...FAV_CARD, textDecoration: "none" }}>
      <div style={FAV_HERO}>
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <AddToMyWorldButton poiId={id} poiName={poi.name} variant="compact" showMeaningPicker={false} />
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 22 }}>{poi.flag}</div>
      </div>
      <div style={FAV_BODY}>
        <div style={FAV_NAME}>{poi.name}</div>
        <div style={FAV_LOC}>{poi.country || "—"}</div>
        <div style={FAV_CHIP}>Mi Mundo</div>
      </div>
    </a>
  );
}'''
    assert old_fav in s, "old FavoritosCard not found"
    s = s.replace(old_fav, new_fav, 1)
    atomic_write(p, s)
    print("MiMundoV5: patched OK")


def patch_poinode():
    """Reemplazar Coliseo hardcoded con usePoiData/useSignals + añadir helpers."""
    p = os.path.join(ROOT, "experience", "components", "screens", "poi", "v5", "PoiNodeV5.tsx")
    s = read_file(p)
    if "usePoiData" in s and "deriveKeyData" in s:
        print("PoiNodeV5: already patched, skip")
        return
    # Imports
    s = s.replace(
        'import { useRelatedPois } from "@/components/discovery/useRelatedPois";',
        'import { useRelatedPois } from "@/components/discovery/useRelatedPois";\nimport { useNarratives, TYPE_ICON } from "@/components/discovery/useNarratives";\nimport { usePoiData } from "@/components/discovery/usePoiData";\nimport { useSignals } from "@/components/discovery/useSignals";',
        1,
    )
    # Si useNarratives ya está importado por separado, evitar duplicado
    # (En esta versión revertida useNarratives no está; debería estar)
    # Si HistoriaTab usa useNarratives, ya estaba. Si no, lo dejamos.

    # Reemplazar poi hardcoded
    old_poi = '''  const [tab, setTab] = React.useState<Tab>("resumen");
  const [era, setEra] = React.useState<"80" | "120" | "1500" | "1800" | "hoy">("80");

  // Phase 1 placeholder · hardcoded Coliseo
  const poi = {
    name: "Coliseo",
    category: "MONUMENTO HISTÓRICO",
    location: "Roma, Italia",
    flag: "🇮🇹",
    rating: 4.9,
    ratingCount: 1248,
    description: "Anfiteatro emblemático del Imperio Romano. Escenario de luchas de gladiadores y espectáculos que fascinaban al mundo.",
    tags: ["Historia", "Arquitectura", "Imperio Romano"],
    distance: "320 m",
    schedule: "Abierto ahora 8:30 – 19:00",
    keyData: [
      { icon: "🏛", label: "Construido", value: "70-80 d.C." },
      { icon: "👑", label: "Emperador", value: "Vespasiano" },
      { icon: "👥", label: "Capacidad", value: "50.000 - 80.000 espectadores" },
      { icon: "⚔", label: "Uso", value: "Juegos, combates y espectáculos públicos" },
    ],
  };'''
    new_poi = '''  const [tab, setTab] = React.useState<Tab>("resumen");
  const [era, setEra] = React.useState<"80" | "120" | "1500" | "1800" | "hoy">("80");

  const { poi: realPoi } = usePoiData(poiId);
  const { data: signals } = useSignals(poiId);

  const poi = {
    name: realPoi?.name || "Coliseo",
    category: realPoi?.category || "MONUMENTO HISTÓRICO",
    location: realPoi?.country || "Roma, Italia",
    flag: realPoi?.flag || "🇮🇹",
    rating: signals ? Math.round((Math.max(60, signals.emotion_score) / 100 + 4) * 10) / 10 : 4.9,
    ratingCount: signals?.total_resonances || 1248,
    description: realPoi?.short_description || "Anfiteatro emblemático del Imperio Romano. Escenario de luchas de gladiadores y espectáculos que fascinaban al mundo.",
    tags: deriveTagsForCategory(realPoi?.category),
    distance: "320 m",
    schedule: "Abierto ahora 8:30 – 19:00",
    keyData: deriveKeyData(realPoi?.category, realPoi?.country),
  };'''
    assert old_poi in s, "PoiNodeV5: old poi hardcoded not found"
    s = s.replace(old_poi, new_poi, 1)

    # Reemplazar HistoriaTab si todavía es el placeholder genérico
    old_historia = '''      {tab === "historia" && <HistoriaTab />}'''
    new_historia = '''      {tab === "historia" && <HistoriaTab poiId={poiId} />}'''
    if old_historia in s:
        s = s.replace(old_historia, new_historia, 1)

    # Reemplazar función HistoriaTab si existe versión vieja
    # Buscar firma vieja
    old_hist_fn = re.search(r'function HistoriaTab\(\) \{[^}]*?\}\s*\n', s, flags=re.S)
    if old_hist_fn:
        new_hist_fn = '''function HistoriaTab({ poiId }: { poiId: string }) {
  const { narratives, loading } = useNarratives(poiId);
  if (loading) {
    return <div style={CARD}><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Cargando historias...</p></div>;
  }
  if (narratives.length === 0) {
    return (
      <div style={CARD}>
        <h3 style={CARD_TITLE}>Más historias de este lugar</h3>
        <p style={{ margin: "6px 0", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          Narrativas en preparación. Disponibles tras ejecutar el pipeline batch.
        </p>
      </div>
    );
  }
  function formatDur(s: number) {
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }
  return (
    <div style={CARD}>
      <h3 style={CARD_TITLE}>Más historias de este lugar</h3>
      <p style={{ margin: "6px 0 14px", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
        Un POI no es una historia. Es un universo narrativo.
      </p>
      <div style={NARRATIVES_GRID}>
        {narratives.map((n, i) => (
          <button key={i} style={NARRATIVE_CARD}>
            <div style={NARRATIVE_HEAD}>
              <div style={NARRATIVE_ICON}>{TYPE_ICON[n.type] || "✦"}</div>
              <div style={NARRATIVE_DUR}>{formatDur(n.duration_s)} ▶</div>
            </div>
            <div style={NARRATIVE_TITLE}>{n.title}</div>
            <div style={NARRATIVE_HOOK}>{n.hook}</div>
            <div style={NARRATIVE_TYPE}>{n.type}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

'''
        s = s[:old_hist_fn.start()] + new_hist_fn + s[old_hist_fn.end():]

    # Añadir helpers al final + estilos para NARRATIVES si no existen
    add_helpers = '''


function deriveTagsForCategory(cat: string | undefined): string[] {
  const c = (cat || "").toLowerCase();
  if (c.includes("monumento") || c.includes("imperio")) return ["Historia", "Arquitectura", "Imperio"];
  if (c.includes("religioso") || c.includes("iglesia")) return ["Espiritualidad", "Arte sacro", "Patrimonio"];
  if (c.includes("arqueol")) return ["Historia antigua", "Descubrimiento", "Civilizaciones"];
  if (c.includes("museo")) return ["Arte", "Conocimiento", "Cultura"];
  if (c.includes("natural") || c.includes("parque")) return ["Naturaleza", "Paisaje", "Biosfera"];
  if (c.includes("plaza")) return ["Ciudad", "Encuentro", "Patrimonio"];
  if (c.includes("castillo") || c.includes("fortaleza")) return ["Defensa", "Historia medieval", "Arquitectura"];
  return ["Cultura", "Viajes", "Patrimonio"];
}


function deriveKeyData(cat: string | undefined, country: string | undefined): { icon: string; label: string; value: string }[] {
  const c = (cat || "").toLowerCase();
  const co = country || "—";
  if (c.includes("monumento") || c.includes("imperio")) return [
    { icon: "🏛", label: "Tipo",   value: "Monumento histórico" },
    { icon: "🌍", label: "País", value: co },
    { icon: "📅", label: "Época", value: "Antigüedad / Medieval" },
    { icon: "⚙",       label: "Función", value: "Civil · ceremonial · cultural" },
  ];
  if (c.includes("religioso") || c.includes("iglesia")) return [
    { icon: "✟", label: "Culto", value: "Patrimonio religioso" },
    { icon: "🌍", label: "País", value: co },
    { icon: "🎨", label: "Estilo", value: "Gótico / Barroco / Modernista" },
    { icon: "👥", label: "Visitantes", value: "Millones al año" },
  ];
  if (c.includes("arqueol")) return [
    { icon: "🏺", label: "Yacimiento", value: "Sitio arqueológico" },
    { icon: "🌍", label: "País", value: co },
    { icon: "📅", label: "Antigüedad", value: "Más de 1.000 años" },
    { icon: "🔎", label: "Descubrimiento", value: "Sigue revelando hallazgos" },
  ];
  if (c.includes("museo")) return [
    { icon: "🖼", label: "Tipo", value: "Museo" },
    { icon: "🌍", label: "País", value: co },
    { icon: "📚", label: "Colección", value: "Permanente · temporal" },
    { icon: "🎟", label: "Acceso", value: "Entrada según horario" },
  ];
  if (c.includes("natural") || c.includes("parque")) return [
    { icon: "🌲", label: "Tipo", value: "Espacio natural protegido" },
    { icon: "🌍", label: "País", value: co },
    { icon: "🦅", label: "Biodiversidad", value: "Fauna y flora endémica" },
    { icon: "🚶", label: "Acceso", value: "Senderos abiertos" },
  ];
  return [
    { icon: "📍", label: "Tipo", value: cat || "Lugar de interés" },
    { icon: "🌍", label: "País", value: co },
    { icon: "📅", label: "Patrimonio", value: "Cultural · histórico" },
    { icon: "👥", label: "Comunidad", value: "Reconocido localmente" },
  ];
}


// Estilos para narratives grid (si HistoriaTab nuevo se usa)
const NARRATIVES_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 10, marginTop: 10,
};
const NARRATIVE_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12, padding: 12, cursor: "pointer",
  textAlign: "left" as const, color: "#fff", fontFamily: "inherit",
};
const NARRATIVE_HEAD: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 8,
};
const NARRATIVE_ICON: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%",
  background: "rgba(139,107,255,0.18)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14,
};
const NARRATIVE_DUR: React.CSSProperties = {
  fontSize: 10, color: "rgba(255,255,255,0.5)",
};
const NARRATIVE_TITLE: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4,
};
const NARRATIVE_HOOK: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, marginBottom: 8,
};
const NARRATIVE_TYPE: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 6px", borderRadius: 4,
  background: "rgba(139,107,255,0.15)",
  fontSize: 9, color: "#8B6BFF", fontWeight: 600,
};
'''
    # Solo añadir si no existe ya deriveTagsForCategory
    if "deriveTagsForCategory" not in s:
        s = s.rstrip() + "\n" + add_helpers + "\n"
    atomic_write(p, s)
    print("PoiNodeV5: patched OK")


def patch_worldengine():
    """Añadir relationLinesRef + useEffect World Graph."""
    p = os.path.join(ROOT, "experience", "components", "world-engine", "WorldEngine.tsx")
    s = read_file(p)
    if "relationLinesRef" in s:
        print("WorldEngine: already patched, skip")
        return
    s = s.replace(
        '  const markersRef = React.useRef<Map<string, any>>(new Map());',
        '  const markersRef = React.useRef<Map<string, any>>(new Map());\n  // World Graph: lineas POI<->POI cuando hay activeId\n  const relationLinesRef = React.useRef<any[]>([]);',
        1,
    )
    # Insertar effect después del useEffect que monta markers (busca el cierre con renderTick deps)
    anchor = '  }, [renderTick, zoom, mapReady, activeId, activeFilter, capsulesIndex]);'
    addition = '''  }, [renderTick, zoom, mapReady, activeId, activeFilter, capsulesIndex]);


  // World Graph: lineas POI<->POI cuando hay activeId
  React.useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;
    relationLinesRef.current.forEach((ln) => { try { ln.remove(); } catch {} });
    relationLinesRef.current = [];
    if (!activeId) return;
    const active = allNodesRef.current.find((p) => p.id === activeId);
    if (!active) return;
    fetch("/data/relationships/index.json", { cache: "force-cache" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const rels: any[] = (j && j.relationships && j.relationships[activeId]) || [];
        if (rels.length === 0) return;
        for (const r of rels.slice(0, 5)) {
          const target = allNodesRef.current.find((p) => p.id === r.id);
          if (!target) continue;
          if (isNaN(target.lat) || isNaN(target.lng)) continue;
          const color = r.type === "geographical" ? "#8B6BFF" :
                        r.type === "thematic"     ? "#C9A961" :
                        r.type === "historical"   ? "#6e4dd6" :
                                                     "#a87cff";
          try {
            const line = L.polyline(
              [[active.lat, active.lng], [target.lat, target.lng]],
              {
                color,
                weight: 1.6,
                opacity: 0.55,
                dashArray: r.type === "thematic" ? "4 6" : undefined,
                interactive: false,
              }
            ).addTo(map);
            relationLinesRef.current.push(line);
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      relationLinesRef.current.forEach((ln) => { try { ln.remove(); } catch {} });
      relationLinesRef.current = [];
    };
  }, [activeId, mapReady]);'''
    assert anchor in s, "WorldEngine: anchor not found"
    s = s.replace(anchor, addition, 1)
    atomic_write(p, s)
    print("WorldEngine: patched OK")


def patch_share():
    """Cambiar PreviewCard + overlays + DISCOVERED_BY."""
    p = os.path.join(ROOT, "experience", "components", "share", "ShareCapsuleModalV5.tsx")
    s = read_file(p)
    if "MiniMapOverlay" in s:
        print("ShareCapsuleModalV5: already patched, skip")
        return
    old_preview = '''function PreviewCard({ style, poiName, location, evocative, dur, image }: {
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
}'''
    new_preview = '''function PreviewCard({ style, poiName, location, evocative, dur, image }: {
  style: PreviewStyle; poiName: string; location: string;
  evocative: string; dur: number; image?: string;
}) {
  const bg =
    style === "epico"    ? (image ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,10,31,0.85) 100%), url("${image}") center/cover` : "linear-gradient(135deg, #2a1542 0%, #1a0f2e 100%)") :
    style === "minimal"  ? "linear-gradient(180deg, #0a0814 0%, #14101f 100%)" :
    style === "mapa"     ? "linear-gradient(180deg, #0b1428 0%, #142847 100%)" :
                            "linear-gradient(180deg, #2a1219 0%, #1a0a12 100%)";

  return (
    <div style={{ ...CARD_WRAP, background: bg }}>
      <div style={CARD_TOP}>
        <KudosFlowerLogo size={28} variant={style === "minimal" ? "gold" : "white"} />
        <span style={CARD_BRAND}>KUDOS</span>
      </div>

      <div style={CARD_PIN}>
        <span style={{ marginRight: 6 }}>📍</span>
        <span>{location}</span>
      </div>

      {style === "mapa" && <MiniMapOverlay />}
      {style === "timeline" && <TimelineOverlay />}
      {style === "minimal" && <MinimalGlow />}

      <div style={{ flex: 1 }} />

      <h3 style={{ ...CARD_TITLE, fontWeight: style === "minimal" ? 300 : 600 }}>{poiName}</h3>
      <p style={CARD_EVOCATIVE}>{evocative}</p>

      <div style={DISCOVERED_BY}>
        <span style={DISCOVERED_DOT} />
        <span>Descubierto por <strong style={{ color: "#C9A961" }}>Eduardo</strong></span>
      </div>

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


function MiniMapOverlay() {
  return (
    <svg
      viewBox="0 0 280 110"
      style={{ position: "absolute", inset: "60px 16px auto", width: "calc(100% - 32px)", height: 110, opacity: 0.6, pointerEvents: "none" }}
      preserveAspectRatio="none"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={`h${i}`} x1="0" y1={110 * p} x2="280" y2={110 * p}
              stroke="rgba(139,107,255,0.18)" strokeWidth="0.5" />
      ))}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, i) => (
        <line key={`v${i}`} x1={280 * p} y1="0" x2={280 * p} y2="110"
              stroke="rgba(139,107,255,0.18)" strokeWidth="0.5" />
      ))}
      <path d="M30,80 Q90,40 140,55 T260,30" fill="none" stroke="#8B6BFF" strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx="30" cy="80" r="3" fill="#C9A961" />
      <circle cx="140" cy="55" r="5" fill="#8B6BFF" stroke="#fff" strokeWidth="1.5" />
      <circle cx="260" cy="30" r="3" fill="#C9A961" />
    </svg>
  );
}


function TimelineOverlay() {
  return (
    <svg
      viewBox="0 0 280 60"
      style={{ position: "absolute", inset: "70px 16px auto", width: "calc(100% - 32px)", height: 60, opacity: 0.7, pointerEvents: "none" }}
      preserveAspectRatio="none"
    >
      <line x1="10" y1="30" x2="270" y2="30" stroke="rgba(201,169,97,0.4)" strokeWidth="1.5" />
      {[20, 80, 140, 200, 250].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="30" r={i === 2 ? 5 : 3} fill={i === 2 ? "#C9A961" : "rgba(201,169,97,0.55)"} />
          <text x={x} y="50" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.45)">
            {["80 d.C.", "476", "1300", "1800", "Hoy"][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}


function MinimalGlow() {
  return (
    <div style={{
      position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
      width: 140, height: 140, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(201,169,97,0.18) 0%, transparent 70%)",
      pointerEvents: "none",
    }} />
  );
}'''
    assert old_preview in s, "Share: old PreviewCard not found"
    s = s.replace(old_preview, new_preview, 1)
    # Añadir estilos DISCOVERED_BY/DOT al final
    extra = '''

const DISCOVERED_BY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "5px 10px", borderRadius: 999,
  background: "rgba(201,169,97,0.10)",
  border: "1px solid rgba(201,169,97,0.32)",
  fontSize: 11, color: "rgba(255,255,255,0.85)",
  alignSelf: "flex-start", marginBottom: 12,
  letterSpacing: "0.02em",
};
const DISCOVERED_DOT: React.CSSProperties = {
  width: 7, height: 7, borderRadius: "50%",
  background: "#C9A961",
  boxShadow: "0 0 8px rgba(201,169,97,0.6)",
};
'''
    if "DISCOVERED_BY" not in s:
        s = s.rstrip() + "\n" + extra
    atomic_write(p, s)
    print("ShareCapsuleModalV5: patched OK")


def main():
    patch_homefeed()
    patch_merit()
    patch_mimundo()
    patch_poinode()
    patch_worldengine()
    patch_share()
    print("\nALL PATCHES APPLIED OK")


if __name__ == "__main__":
    main()
  patch_homefeed()
  patch_merit()
  patch_mimundo()
  patch_poinode()
  patch_worldengine()
  patch_share()
  print("\nALL PATCHES APPLIED OK")


if __name__ == "__main__":
    main()
    main()
