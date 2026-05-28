"""
KUDOS · Panel del Fundador · servidor local.

Arranca con:  python -m kudos_engine.control_panel
Abre:         http://localhost:3001

Sin auth (solo accesible desde tu PC). El frontend está embebido en este
mismo archivo como HTML+CSS+JS para que no haga falta build ni node.

Endpoints API:
  GET    /api/status              → estado general del sistema
  GET    /api/worker/status       → worker running? + última línea log
  POST   /api/worker/start        → arranca worker en background
  POST   /api/worker/stop         → mata worker
  GET    /api/worker/logs         → últimas 200 líneas del log
  GET    /api/pois/stats          → totals de queue + done
  POST   /api/pois/reseed         → regenera queue.json desde TOP_85
  POST   /api/pois/import_osm     → lanza import_osm para un país
  GET    /api/capsules            → lista MP4 generados en experience/public/capsules/
  DELETE /api/capsules/{slug}     → borra un .mp4
  GET    /api/apis                → estado de las claves de API
  POST   /api/apis/key            → setea ANTHROPIC_API_KEY (en memoria del proceso)
  GET    /api/git/status          → branch, commits ahead, cambios pendientes
  POST   /api/git/push            → git push origin master
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional


# ─── Dependencies (lazy import for clarity) ───────────────────────────────
try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
    from pydantic import BaseModel
    import uvicorn
except ImportError as e:
    print(f"ERROR · falta instalar deps: {e}")
    print()
    print("Pega en PowerShell:")
    print("   python -m pip install fastapi uvicorn[standard] pydantic")
    sys.exit(1)


# ─── Paths ────────────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent
ENGINE_DIR = HERE.parent                     # kudos_engine/
REPO_DIR = ENGINE_DIR.parent                 # kudos_project/
STATE_DIR = ENGINE_DIR / "state"
QUEUE_PATH = STATE_DIR / "queue.json"
DONE_PATH = STATE_DIR / "done.json"
LOG_PATH = STATE_DIR / "log.txt"
CAPSULES_DIR = REPO_DIR / "experience" / "public" / "capsules"
OSM_DATA_DIR = REPO_DIR / "experience" / "public" / "data" / "osm"

STATE_DIR.mkdir(parents=True, exist_ok=True)
CAPSULES_DIR.mkdir(parents=True, exist_ok=True)
OSM_DATA_DIR.mkdir(parents=True, exist_ok=True)


# ─── Process registry (worker, import_osm, etc.) ──────────────────────────
_PROCS: dict[str, subprocess.Popen] = {}


def proc_alive(name: str) -> bool:
    p = _PROCS.get(name)
    return p is not None and p.poll() is None


def proc_start(name: str, cmd: list[str], cwd: Optional[Path] = None) -> dict:
    if proc_alive(name):
        return {"ok": False, "error": f"'{name}' ya está corriendo (pid {_PROCS[name].pid})"}
    # stderr+stdout → archivo de log para diagnóstico (antes iba a DEVNULL → invisible)
    log_path = STATE_DIR / f"{name}.stderr.log"
    env = os.environ.copy()
    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        log_f = open(log_path, "w", encoding="utf-8")
        p = subprocess.Popen(
            cmd,
            cwd=str(cwd or REPO_DIR),
            env=env,
            stdout=log_f,
            stderr=subprocess.STDOUT,
            creationflags=creationflags,
        )
        _PROCS[name] = p
        # Verificamos a los 1.2s si sigue vivo. Si murió, devolvemos el log
        # como error útil para que el panel haga alert() con el detalle real.
        time.sleep(1.2)
        if p.poll() is not None:
            try:
                tail = log_path.read_text(encoding="utf-8", errors="ignore").strip()[-800:]
            except Exception:
                tail = "(sin log)"
            return {"ok": False, "error": f"'{name}' murió en 1s (exit {p.returncode})\n\n{tail}"}
        return {"ok": True, "pid": p.pid, "log": str(log_path)}
    except Exception as e:
        return {"ok": False, "error": f"No pude arrancar '{name}': {type(e).__name__}: {e}"}


def proc_stop(name: str) -> dict:
    p = _PROCS.get(name)
    if p is None or p.poll() is not None:
        return {"ok": False, "error": f"'{name}' no está corriendo"}
    try:
        if os.name == "nt":
            p.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            p.terminate()
        p.wait(timeout=5)
    except Exception:
        try:
            p.kill()
        except Exception:
            pass
    return {"ok": True}


# ─── App ──────────────────────────────────────────────────────────────────
app = FastAPI(title="KUDOS · Panel Fundador", version="0.1.0")


# ═══════════════════════ STATUS GLOBAL ════════════════════════════════════

@app.get("/api/status")
def api_status() -> dict:
    queue = _load_json(QUEUE_PATH, default=[])
    done = _load_json(DONE_PATH, default={})
    capsules = list(CAPSULES_DIR.glob("*.mp4"))
    osm_files = list(OSM_DATA_DIR.glob("*.json"))
    rc, out = _git(["rev-parse", "HEAD"])
    head = out.strip()[:7] if rc == 0 else "?"
    rc, out = _git(["rev-list", "--count", "@{u}..HEAD"])
    ahead = int(out.strip()) if rc == 0 and out.strip().isdigit() else 0

    return {
        "worker": {
            "running": proc_alive("worker"),
            "pid": _PROCS["worker"].pid if proc_alive("worker") else None,
        },
        "pois": {
            "queue": len(queue),
            "done": len(done),
            "pending": max(0, len(queue) - len(done)),
        },
        "capsules": {
            "total": len(capsules),
            "total_mb": round(sum(c.stat().st_size for c in capsules) / (1024 * 1024), 1),
        },
        "osm": {
            "files": [{"name": f.name, "size_kb": f.stat().st_size // 1024} for f in osm_files],
            "total_pois": _osm_total(),
        },
        "git": {
            "head": head,
            "ahead": ahead,
        },
        "apis": _api_status_dict(),
    }


# ═══════════════════════ WORKER ══════════════════════════════════════════

@app.get("/api/worker/status")
def api_worker_status() -> dict:
    return {
        "running": proc_alive("worker"),
        "pid": _PROCS["worker"].pid if proc_alive("worker") else None,
        "tail": _tail(LOG_PATH, 20),
    }


@app.post("/api/worker/start")
def api_worker_start() -> dict:
    return proc_start("worker", [sys.executable, "-m", "kudos_engine.worker"])


@app.post("/api/worker/stop")
def api_worker_stop() -> dict:
    return proc_stop("worker")


@app.get("/api/worker/logs", response_class=PlainTextResponse)
def api_worker_logs() -> str:
    return "\n".join(_tail(LOG_PATH, 200))


# ═══════════════════════ POIs ════════════════════════════════════════════

@app.get("/api/pois/stats")
def api_pois_stats() -> dict:
    queue = _load_json(QUEUE_PATH, default=[])
    done = _load_json(DONE_PATH, default={})
    pending = [p for p in queue if p.get("id") not in done]
    by_tier: dict[str, int] = {}
    for p in queue:
        by_tier[p.get("tier_hint", "?")] = by_tier.get(p.get("tier_hint", "?"), 0) + 1
    return {
        "queue": len(queue),
        "done": len(done),
        "pending": len(pending),
        "by_tier": by_tier,
        "next_5": [{"id": p["id"], "name": p["name"]} for p in pending[:5]],
    }


@app.post("/api/pois/reseed")
def api_pois_reseed() -> dict:
    from kudos_engine.worker import reseed
    reseed()
    return {"ok": True, "queue_size": len(_load_json(QUEUE_PATH, default=[]))}


class ImportOsmBody(BaseModel):
    country: str
    max_results: int = 2000


@app.post("/api/pois/import_osm")
def api_pois_import_osm(body: ImportOsmBody) -> dict:
    name = f"import_osm_{body.country.lower()}"
    return proc_start(
        name,
        [sys.executable, "-m", "kudos_engine.scripts.import_osm",
         "--country", body.country.upper(),
         "--max", str(body.max_results)],
    )


# ═══════════════════════ CAPSULES ═════════════════════════════════════════

@app.get("/api/capsules")
def api_capsules() -> dict:
    items = []
    for f in sorted(CAPSULES_DIR.glob("*.mp4"), key=lambda p: -p.stat().st_mtime):
        items.append({
            "slug": f.stem,
            "name": f.name,
            "size_kb": f.stat().st_size // 1024,
            "mtime": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        })
    return {"count": len(items), "items": items}


@app.delete("/api/capsules/{slug}")
def api_capsules_delete(slug: str) -> dict:
    p = CAPSULES_DIR / f"{slug}.mp4"
    if not p.exists():
        raise HTTPException(404, "no encontrado")
    p.unlink()
    return {"ok": True}


# ═══════════════════════ APIS ════════════════════════════════════════════

API_KEYS = {
    "ANTHROPIC_API_KEY":  {"label": "Anthropic (Claude)",  "cost_hint": "~$0.01 por cápsula"},
    "OPENAI_API_KEY":     {"label": "OpenAI (Sora 2)",     "cost_hint": "~$10-15 por cápsula"},
    "KLING_API_KEY":      {"label": "Kling AI",            "cost_hint": "Free tier 166 créditos/día"},
    "ELEVENLABS_API_KEY": {"label": "ElevenLabs (voz pro)","cost_hint": "10 min/mes gratis"},
}


@app.get("/api/apis")
def api_apis() -> dict:
    return {"apis": _api_status_dict()}


class ApiKeyBody(BaseModel):
    name: str
    value: str


@app.post("/api/apis/key")
def api_apis_set_key(body: ApiKeyBody) -> dict:
    if body.name not in API_KEYS:
        raise HTTPException(400, f"clave no soportada: {body.name}")
    # Solo en memoria del proceso · no se persiste a disco por seguridad
    os.environ[body.name] = body.value.strip()
    return {"ok": True}


def _api_status_dict() -> dict:
    out = {}
    for k, meta in API_KEYS.items():
        v = os.environ.get(k)
        out[k] = {
            "label": meta["label"],
            "cost_hint": meta["cost_hint"],
            "configured": bool(v),
            "preview": (v[:8] + "..." + v[-4:]) if v and len(v) > 14 else None,
        }
    return out


# ═══════════════════════ GIT ═════════════════════════════════════════════

@app.get("/api/git/status")
def api_git_status() -> dict:
    rc, branch = _git(["rev-parse", "--abbrev-ref", "HEAD"])
    rc2, head = _git(["rev-parse", "HEAD"])
    rc3, ahead = _git(["rev-list", "--count", "@{u}..HEAD"])
    rc4, dirty = _git(["status", "--short"])
    return {
        "branch": branch.strip() if rc == 0 else "?",
        "head": head.strip()[:7] if rc2 == 0 else "?",
        "ahead": int(ahead.strip()) if rc3 == 0 and ahead.strip().isdigit() else 0,
        "dirty_files": len(dirty.strip().splitlines()) if rc4 == 0 else 0,
    }


@app.post("/api/git/push")
def api_git_push() -> dict:
    rc, out = _git(["push", "origin", "HEAD"])
    return {"ok": rc == 0, "output": out}


# ═══════════════════════ FRONTEND (single page) ══════════════════════════

@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return INDEX_HTML


# ═══════════════════════ Helpers ══════════════════════════════════════════

def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _tail(path: Path, n: int) -> list[str]:
    if not path.exists():
        return []
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        return lines[-n:]
    except Exception:
        return []


def _git(args: list[str]) -> tuple[int, str]:
    try:
        r = subprocess.run(
            ["git", *args],
            cwd=str(REPO_DIR),
            capture_output=True, text=True, timeout=60,
        )
        return r.returncode, (r.stdout + r.stderr)
    except Exception as e:
        return 99, str(e)


def _osm_total() -> int:
    total = 0
    for f in OSM_DATA_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            total += int(data.get("count", 0))
        except Exception:
            pass
    return total


# ═══════════════════════ HTML (single page, sin build) ═══════════════════
# Se carga al final para no romper la lectura del módulo
INDEX_HTML = """<!doctype html>
<html lang=es>
<head>
<meta charset=utf-8>
<title>KUDOS · Panel del Fundador</title>
<meta name=viewport content="width=device-width,initial-scale=1">
<link rel=preconnect href="https://fonts.googleapis.com">
<link rel=preconnect href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel=stylesheet>
<style>
  :root {
    --navy:#1A1333; --navy2:#14112a; --navy3:#0a0612;
    --violet:#6C3CFF; --pink:#FF3CAC; --orange:#FF9A00; --yellow:#FFD23F;
    --white:#F2F2F7; --mute:#8b8b95; --border:#2a2548;
    --gradh:linear-gradient(90deg,#FF9A00 0%,#FF3CAC 50%,#6C3CFF 100%);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family:"Poppins",-apple-system,"Segoe UI",system-ui,sans-serif; background:radial-gradient(ellipse at top left,rgba(108,60,255,0.10) 0%,transparent 50%),radial-gradient(ellipse at top right,rgba(255,60,172,0.08) 0%,transparent 50%),var(--navy3); color:var(--white); padding:28px; line-height:1.5; min-height:100vh; }
  .hero { display:grid; grid-template-columns:auto 1fr auto; gap:22px; align-items:center; margin-bottom:24px; padding-bottom:22px; border-bottom:1px solid var(--border); }
  .hero-logo { width:60px; height:60px; flex-shrink:0; }
  .hero-text h1 { font-size:26px; font-weight:800; letter-spacing:-0.5px; color:var(--white); display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
  .hero-text h1 .mark { background:var(--gradh); -webkit-background-clip:text; background-clip:text; color:transparent; font-size:18px; font-weight:600; }
  .hero-tagline { font-size:11px; font-weight:700; letter-spacing:3px; color:var(--mute); text-transform:uppercase; margin-top:6px; }
  .hero-quote { text-align:right; max-width:320px; font-size:12px; color:var(--mute); font-style:italic; line-height:1.4; }
  .hero-quote b { display:block; color:var(--white); font-style:normal; font-weight:700; font-size:13px; margin-bottom:2px; letter-spacing:0.5px; }
  .hero-quote small { display:block; margin-top:4px; font-style:normal; font-size:10px; letter-spacing:1.5px; color:var(--violet); font-weight:700; text-transform:uppercase; }
  .pillars { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .pillar { background:rgba(108,60,255,0.06); border:1px solid rgba(108,60,255,0.18); border-radius:12px; padding:14px 16px; text-align:center; }
  .pillar-icon { font-size:22px; margin-bottom:6px; line-height:1; }
  .pillar-name { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--violet); }
  .pillar-desc { font-size:10.5px; color:var(--mute); margin-top:3px; line-height:1.35; }
  @media (max-width:720px){ .pillars{grid-template-columns:repeat(2,1fr);} }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
  .card { background: #14112a; border: 1px solid #2a2548; border-radius: 14px; padding: 18px; }
  .card h2 { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #b8b8c5; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
  .dot.green { background: #10b981; box-shadow: 0 0 8px #10b98166; }
  .dot.red { background: #ef4444; }
  .dot.gray { background: #4b5563; }
  .dot.yellow { background: #f59e0b; }
  .stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1f1b35; font-size: 13px; }
  .stat:last-child { border: none; }
  .stat b { color: #fff; }
  button { appearance: none; border: none; background: linear-gradient(90deg,#6C3CFF,#FF3CAC); color: #fff; padding: 8px 14px; border-radius: 10px; font-weight: 600; font-size: 12.5px; cursor: pointer; transition: transform 0.1s; margin-right: 6px; margin-top: 6px; }
  button:hover { transform: translateY(-1px); }
  button.ghost { background: transparent; border: 1px solid #4b5563; }
  button.danger { background: #dc2626; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  input, select { background: #1f1b35; border: 1px solid #3a3358; color: #f2f2f7; padding: 8px 10px; border-radius: 8px; font-size: 13px; margin-right: 6px; }
  pre { background: #0a0612; border: 1px solid #2a2548; border-radius: 8px; padding: 10px; font-size: 11px; font-family: "JetBrains Mono", monospace; max-height: 220px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; color: #a0a0b0; }
  .toast { position: fixed; bottom: 20px; right: 20px; background: #14112a; border: 1px solid #2a2548; padding: 10px 14px; border-radius: 10px; font-size: 13px; opacity: 0; transition: opacity 0.3s; }
  .toast.show { opacity: 1; }
  .api-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid #1f1b35; font-size: 12.5px; }
  .api-row:last-child { border: none; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #1f1b35; }
  th { color: #b8b8c5; font-weight: 600; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.4px; }
</style>
</head>
<body>

<header class=hero>
  <svg class=hero-logo viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-label="KUDOS">
    <defs>
      <linearGradient id="kHero" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6C3CFF"/>
        <stop offset="38%" stop-color="#FF3CAC"/>
        <stop offset="72%" stop-color="#FF9A00"/>
        <stop offset="100%" stop-color="#FFD23F"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="22" fill="#1A1333"/>
    <circle cx="48" cy="48" r="32" fill="none" stroke="url(#kHero)" stroke-width="6"/>
    <path d="M 48 28 L 51 45 L 68 48 L 51 51 L 48 68 L 45 51 L 28 48 L 45 45 Z" fill="url(#kHero)"/>
  </svg>
  <div class=hero-text>
    <h1>KUDOS <span class=mark>· Panel del Fundador</span></h1>
    <div class=hero-tagline>MÉRITO · DESCUBRIMIENTO · MEMORIA</div>
  </div>
  <div class=hero-quote>
    <b>Eduardo F.</b>
    "Construimos tecnología con propósito para dejar huella en el mundo."
    <small>Fundador & CEO</small>
  </div>
</header>

<section class=pillars>
  <div class=pillar><div class=pillar-icon>✦</div><div class=pillar-name>DESCUBRE</div><div class=pillar-desc>Lugares que merecen ser conocidos</div></div>
  <div class=pillar><div class=pillar-icon>🔖</div><div class=pillar-name>GUARDA</div><div class=pillar-desc>Tu mapa personal de inspiración</div></div>
  <div class=pillar><div class=pillar-icon>↗</div><div class=pillar-name>COMPARTE</div><div class=pillar-desc>Inspira a otros con cápsulas únicas</div></div>
  <div class=pillar><div class=pillar-icon>♡</div><div class=pillar-name>DEJA HUELLA</div><div class=pillar-desc>El legado del futuro</div></div>
</section>

<div class="grid">

  <!-- WORKER -->
  <div class="card">
    <h2>🎬 Worker · <span id=worker-dot class="dot gray"></span><span id=worker-status>cargando…</span></h2>
    <div id=worker-stats></div>
    <div>
      <button onclick="post('/api/worker/start', 'Worker arrancado')">▶ Arrancar</button>
      <button class=danger onclick="post('/api/worker/stop', 'Worker detenido')">■ Detener</button>
      <button class=ghost onclick="loadLogs()">📋 Ver logs</button>
    </div>
    <pre id=worker-logs style="display:none;margin-top:10px"></pre>
  </div>

  <!-- POIs -->
  <div class="card">
    <h2>📍 POIs</h2>
    <div id=pois-stats>cargando…</div>
    <div>
      <button onclick="post('/api/pois/reseed', 'Cola regenerada con TOP 85 POIs')">🌱 Reseed (85 POIs)</button>
    </div>
    <div style="margin-top: 10px;">
      <select id=osm-country>
        <option value=ES>España</option>
        <option value=IT>Italia</option>
        <option value=FR>Francia</option>
        <option value=GR>Grecia</option>
        <option value=PT>Portugal</option>
        <option value=DE>Alemania</option>
        <option value=GB>Reino Unido</option>
        <option value=EG>Egipto</option>
        <option value=MX>México</option>
        <option value=PE>Perú</option>
        <option value=IN>India</option>
        <option value=CN>China</option>
        <option value=JP>Japón</option>
        <option value=TR>Turquía</option>
        <option value=US>EE.UU.</option>
      </select>
      <input type=number id=osm-max value=2000 min=100 max=10000 style="width:90px;">
      <button onclick="importOSM()">📦 Importar OSM</button>
    </div>
  </div>

  <!-- APIs -->
  <div class="card">
    <h2>🔑 APIs externas</h2>
    <div id=apis-list>cargando…</div>
    <div style="margin-top:10px">
      <select id=api-name>
        <option value=ANTHROPIC_API_KEY>Anthropic</option>
        <option value=OPENAI_API_KEY>OpenAI (Sora)</option>
        <option value=KLING_API_KEY>Kling</option>
        <option value=ELEVENLABS_API_KEY>ElevenLabs</option>
      </select>
      <input type=password id=api-value placeholder="sk-..." style="width:180px;">
      <button onclick="setKey()">💾 Guardar</button>
    </div>
  </div>

  <!-- CAPSULES -->
  <div class="card" style="grid-column: 1 / -1;">
    <h2>🎥 Cápsulas generadas</h2>
    <div id=capsules-stats style="margin-bottom:10px;font-size:12.5px;color:#b8b8c5"></div>
    <table id=capsules-table>
      <thead><tr><th>Slug</th><th>Tamaño</th><th>Generada</th><th></th></tr></thead>
      <tbody id=capsules-body></tbody>
    </table>
  </div>

  <!-- GIT / DEPLOY -->
  <div class="card">
    <h2>🚀 Git / Deploy</h2>
    <div id=git-stats>cargando…</div>
    <div>
      <button onclick="gitPush()">⬆ Push pendientes</button>
    </div>
  </div>

  <!-- METRICS -->
  <div class="card">
    <h2>📊 Métricas globales</h2>
    <div id=metrics>cargando…</div>
  </div>

</div>

<div id=toast class=toast></div>

<script>
const toast = (msg) => {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
};

const post = async (url, ok_msg) => {
  try {
    const r = await fetch(url, {method:'POST'});
    const j = await r.json();
    if (j.ok === false) {
      console.error('POST error:', j.error);
      toast('❌ ' + String(j.error || 'error').slice(0, 100));
      if (j.error && String(j.error).includes('\n')) alert(j.error);
    } else {
      toast('✅ ' + (ok_msg || 'OK'));
    }
    setTimeout(refresh, 600);
  } catch (e) { toast('❌ ' + e.message); }
};

const importOSM = async () => {
  const country = document.getElementById('osm-country').value;
  const max_results = parseInt(document.getElementById('osm-max').value, 10);
  try {
    const r = await fetch('/api/pois/import_osm', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({country, max_results}),
    });
    const j = await r.json();
    if (j.ok) {
      toast(`📦 Importando ${country} (pid ${j.pid}) · tarda 1-3 min`);
    } else {
      console.error('Import OSM ERROR:', j.error);
      toast('❌ Importar OSM falló · ver detalle');
      alert('IMPORTAR OSM FALLÓ:\n\n' + j.error);
    }
    setTimeout(refresh, 600);
  } catch (e) { toast('❌ ' + e.message); }
};

const setKey = async () => {
  const name = document.getElementById('api-name').value;
  const value = document.getElementById('api-value').value;
  if (!value) { toast('❌ pega la clave'); return; }
  try {
    const r = await fetch('/api/apis/key', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name, value}),
    });
    if (r.ok) { toast('💾 Guardada'); document.getElementById('api-value').value = ''; }
    setTimeout(refresh, 600);
  } catch (e) { toast('❌ ' + e.message); }
};

const gitPush = async () => {
  toast('⬆ Pushing…');
  const r = await fetch('/api/git/push', {method:'POST'});
  const j = await r.json();
  toast(j.ok ? '✅ Push OK' : '❌ Push falló');
  setTimeout(refresh, 600);
};

const delCapsule = async (slug) => {
  if (!confirm(`Borrar ${slug}.mp4?`)) return;
  await fetch(`/api/capsules/${slug}`, {method:'DELETE'});
  toast(`🗑 ${slug}.mp4 borrada`);
  setTimeout(refresh, 200);
};

const loadLogs = async () => {
  const pre = document.getElementById('worker-logs');
  pre.style.display = 'block';
  const r = await fetch('/api/worker/logs');
  pre.textContent = await r.text();
  pre.scrollTop = pre.scrollHeight;
};

async function refresh() {
  try {
    const s = await fetch('/api/status').then(r => r.json());

    // Worker
    const wDot = document.getElementById('worker-dot');
    const wSt = document.getElementById('worker-status');
    if (s.worker.running) {
      wDot.className = 'dot green';
      wSt.textContent = `corriendo (pid ${s.worker.pid})`;
    } else {
      wDot.className = 'dot gray';
      wSt.textContent = 'parado';
    }
    document.getElementById('worker-stats').innerHTML = `
      <div class=stat><span>POIs hechos</span><b>${s.pois.done}</b></div>
      <div class=stat><span>POIs pendientes</span><b>${s.pois.pending}</b></div>
      <div class=stat><span>Cápsulas en disco</span><b>${s.capsules.total} · ${s.capsules.total_mb} MB</b></div>
    `;

    // POIs
    const ps = await fetch('/api/pois/stats').then(r => r.json());
    const byTier = Object.entries(ps.by_tier).map(([t,n]) => `${t}:${n}`).join(' · ');
    document.getElementById('pois-stats').innerHTML = `
      <div class=stat><span>Cola total</span><b>${ps.queue}</b></div>
      <div class=stat><span>Por tier</span><b>${byTier || '—'}</b></div>
      <div class=stat><span>Siguientes</span><b style="font-size:11px;font-weight:normal">${ps.next_5.map(p=>p.name).join(' · ') || '—'}</b></div>
    `;

    // APIs
    document.getElementById('apis-list').innerHTML =
      Object.entries(s.apis).map(([k,a]) => `
        <div class=api-row>
          <div>
            <div>${a.label}</div>
            <div style="font-size:10.5px;color:#8b8b95">${a.cost_hint}</div>
            ${a.preview ? `<div style="font-size:10px;color:#10b981;font-family:monospace">${a.preview}</div>` : ''}
          </div>
          <span class="dot ${a.configured ? 'green' : 'gray'}"></span>
        </div>
      `).join('');

    // Cápsulas
    const cap = await fetch('/api/capsules').then(r => r.json());
    document.getElementById('capsules-stats').textContent = `${cap.count} cápsulas · ${(cap.items.reduce((a,c)=>a+c.size_kb,0)/1024).toFixed(1)} MB total`;
    document.getElementById('capsules-body').innerHTML = cap.items.slice(0, 50).map(c => `
      <tr>
        <td><b>${c.slug}</b></td>
        <td>${c.size_kb} KB</td>
        <td>${new Date(c.mtime).toLocaleString('es-ES')}</td>
        <td><button class=ghost onclick="delCapsule('${c.slug}')">🗑</button></td>
      </tr>
    `).join('');

    // Git
    const g = await fetch('/api/git/status').then(r => r.json());
    document.getElementById('git-stats').innerHTML = `
      <div class=stat><span>Branch</span><b>${g.branch}</b></div>
      <div class=stat><span>HEAD</span><b>${g.head}</b></div>
      <div class=stat><span>Commits pendientes push</span><b style="color:${g.ahead>0?'#f59e0b':'#10b981'}">${g.ahead}</b></div>
      <div class=stat><span>Archivos sin commit</span><b>${g.dirty_files}</b></div>
    `;

    // Metrics
    document.getElementById('metrics').innerHTML = `
      <div class=stat><span>POIs en cola</span><b>${s.pois.queue}</b></div>
      <div class=stat><span>POIs procesados</span><b>${s.pois.done}</b></div>
      <div class=stat><span>Cápsulas MP4</span><b>${s.capsules.total}</b></div>
      <div class=stat><span>POIs OSM importados</span><b>${s.osm.total_pois}</b></div>
      <div class=stat><span>Archivos OSM</span><b>${s.osm.files.length}</b></div>
      <div class=stat><span>Último HEAD</span><b>${s.git.head}</b></div>
    `;
  } catch (e) {
    console.error(e);
  }
}

refresh();
setInterval(refresh, 5000);
</script>

</body>
</html>
"""


# ═══════════════════════ CLI ═════════════════════════════════════════════

def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="kudos_engine.control_panel")
    p.add_argument("--port", type=int, default=3001)
    p.add_argument("--host", default="127.0.0.1")
    args = p.parse_args(argv)

    print()
    print("=" * 60)
    print(f"  KUDOS · Panel del Fundador")
    print(f"  Abre en tu navegador: http://{args.host}:{args.port}")
    print(f"  Ctrl+C para parar")
    print("=" * 60)
    print()

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    return 0
