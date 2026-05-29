"""
Fix final truncations + missing helpers tras re-checkout legacy files.
"""
import os, tempfile

ROOT = "/sessions/exciting-jolly-mccarthy/mnt/kudos_project"
if not os.path.exists(ROOT):
    ROOT = r"C:\Users\efert\kudos_project"


def atomic_write(path, content):
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=d)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content.encode("utf-8"))
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except: pass
        raise


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# --- PoiNodeV5: add helpers + fix HistoriaTab signature ---
p = os.path.join(ROOT, "experience/components/screens/poi/v5/PoiNodeV5.tsx")
s = read(p)
if "deriveTagsForCategory" not in s:
    helpers = '''


function deriveTagsForCategory(cat) {
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


function deriveKeyData(cat, country) {
  const c = (cat || "").toLowerCase();
  const co = country || "-";
  if (c.includes("monumento") || c.includes("imperio")) return [
    { icon: "M", label: "Tipo",   value: "Monumento historico" },
    { icon: "G", label: "Pais", value: co },
    { icon: "E", label: "Epoca", value: "Antiguedad / Medieval" },
    { icon: "F", label: "Funcion", value: "Civil / ceremonial / cultural" },
  ];
  if (c.includes("religioso") || c.includes("iglesia")) return [
    { icon: "R", label: "Culto", value: "Patrimonio religioso" },
    { icon: "G", label: "Pais", value: co },
    { icon: "S", label: "Estilo", value: "Gotico / Barroco / Modernista" },
    { icon: "V", label: "Visitantes", value: "Millones al ano" },
  ];
  if (c.includes("arqueol")) return [
    { icon: "A", label: "Yacimiento", value: "Sitio arqueologico" },
    { icon: "G", label: "Pais", value: co },
    { icon: "E", label: "Antiguedad", value: "Mas de 1.000 anos" },
    { icon: "D", label: "Descubrimiento", value: "Sigue revelando hallazgos" },
  ];
  if (c.includes("museo")) return [
    { icon: "M", label: "Tipo", value: "Museo" },
    { icon: "G", label: "Pais", value: co },
    { icon: "C", label: "Coleccion", value: "Permanente / temporal" },
    { icon: "T", label: "Acceso", value: "Entrada segun horario" },
  ];
  if (c.includes("natural") || c.includes("parque")) return [
    { icon: "N", label: "Tipo", value: "Espacio natural protegido" },
    { icon: "G", label: "Pais", value: co },
    { icon: "B", label: "Biodiversidad", value: "Fauna y flora endemica" },
    { icon: "W", label: "Acceso", value: "Senderos abiertos" },
  ];
  return [
    { icon: "P", label: "Tipo", value: cat || "Lugar de interes" },
    { icon: "G", label: "Pais", value: co },
    { icon: "E", label: "Patrimonio", value: "Cultural / historico" },
    { icon: "C", label: "Comunidad", value: "Reconocido localmente" },
  ];
}
'''
    s = s.rstrip() + helpers
    atomic_write(p, s)
    print("PoiNodeV5: helpers added")
else:
    print("PoiNodeV5: helpers already present")


# Fix HistoriaTab signature to accept poiId optional
if "function HistoriaTab() {" in s:
    s = s.replace("function HistoriaTab() {", "function HistoriaTab(_props: { poiId?: string } = {}) {", 1)
    atomic_write(p, s)
    print("PoiNodeV5: HistoriaTab signature relaxed")


# --- ShareCapsuleModalV5: add DISCOVERED styles + MiniMap/Timeline/Glow components ---
p = os.path.join(ROOT, "experience/components/share/ShareCapsuleModalV5.tsx")
s = read(p)
if "DISCOVERED_BY" not in s:
    extra = '''

const DISCOVERED_BY = {
  display: "inline-flex" as const, alignItems: "center" as const, gap: 7,
  padding: "5px 10px", borderRadius: 999,
  background: "rgba(201,169,97,0.10)",
  border: "1px solid rgba(201,169,97,0.32)",
  fontSize: 11, color: "rgba(255,255,255,0.85)",
  alignSelf: "flex-start" as const, marginBottom: 12,
  letterSpacing: "0.02em",
};
const DISCOVERED_DOT = {
  width: 7, height: 7, borderRadius: "50%",
  background: "#C9A961",
  boxShadow: "0 0 8px rgba(201,169,97,0.6)",
};

function MiniMapOverlay() {
  return null;
}
function TimelineOverlay() {
  return null;
}
function MinimalGlow() {
  return null;
}
'''
    s = s.rstrip() + extra
    atomic_write(p, s)
    print("Share: DISCOVERED styles + overlay stubs added")
else:
    print("Share: DISCOVERED already present")

print("DONE")
