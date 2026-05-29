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


# V8 · Importador Wikidata · más fiable que OSM, devuelve foto+UNESCO
class ImportWikidataBody(BaseModel):
    country: str = "ES"
    max_per_type: int = 800


@app.post("/api/pois/import_wikidata")
def api_pois_import_wikidata(body: ImportWikidataBody) -> dict:
    name = f"import_wd_{body.country.lower()}"
    return proc_start(
        name,
        [sys.executable, "-m", "kudos_engine.scripts.import_wikidata",
         "--country", body.country.upper(),
         "--max", str(body.max_per_type)],
    )


@app.post("/api/pois/import_wikidata_all")
def api_pois_import_wikidata_all() -> dict:
    """Lanza Wikidata para los 14 países top mundo en BACKGROUND, uno tras otro."""
    name = "import_wd_all"
    return proc_start(
        name,
        [sys.executable, "-m", "kudos_engine.scripts.import_wikidata", "--all"],
    )


@app.get("/api/pois/wikidata_status")
def api_pois_wikidata_status() -> dict:
    """Lista los JSON de Wikidata ya descargados con totales."""
    wd_dir = REPO_DIR / "experience" / "public" / "data" / "wikidata"
    items = []
    total = 0
    if wd_dir.exists():
        for f in sorted(wd_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                n = int(data.get("count", 0))
                total += n
                items.append({"country": data.get("country", f.stem.upper()),
                              "count": n,
                              "size_kb": f.stat().st_size // 1024})
            except Exception:
                pass
    return {"total_pois": total, "files": items}


@app.post("/api/git/auto_push")
def api_git_auto_push() -> dict:
    """git add experience/public/data + commit + push · útil tras importar."""
    rc1, out1 = _git(["add", "experience/public/data"])
    if rc1 != 0:
        return {"ok": False, "error": f"git add falló: {out1}"}
    rc2, out2 = _git(["-c", "user.email=eduardo@kudos.world", "-c", "user.name=Eduardo",
                       "commit", "-m", "Wikidata · datos nuevos importados desde el Panel"])
    if rc2 != 0 and "nothing to commit" not in out2.lower():
        return {"ok": False, "error": f"git commit falló: {out2}"}
    rc3, out3 = _git(["push", "origin", "HEAD"])
    if rc3 != 0:
        return {"ok": False, "error": f"git push falló: {out3}"}
    return {"ok": True, "output": f"{out1}\n{out2}\n{out3}"[-400:]}


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
def index() -> HTMLResponse:
    # No-cache · evita que Chrome sirva HTML viejo tras editar el panel
    return HTMLResponse(
        content=INDEX_HTML,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


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
<html lang="es">
<head>
<meta charset="utf-8">
<title>KUDOS · Panel del Fundador</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --navy:#1A1333; --navy2:#14112a; --navy3:#0a0612;
    --violet:#6C3CFF; --pink:#FF3CAC; --orange:#FF9A00; --yellow:#FFD23F;
    --white:#F2F2F7; --mute:#8b8b95; --border:#2a2548;
    --grad:linear-gradient(90deg,#FF9A00 0%,#FF3CAC 50%,#6C3CFF 100%);
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Poppins",system-ui,sans-serif; background:var(--navy3); color:var(--white); padding:24px; line-height:1.5; min-height:100vh; }
  .hero { display:grid; grid-template-columns:auto 1fr auto; gap:22px; align-items:center; margin-bottom:24px; padding-bottom:22px; border-bottom:1px solid var(--border); }
  .hero-logo { width:60px; height:60px; }
  .hero h1 { font-size:24px; font-weight:800; }
  .hero h1 .mark { background:var(--grad); -webkit-background-clip:text; background-clip:text; color:transparent; font-size:18px; font-weight:600; margin-left:8px; }
  .hero-tagline { font-size:11px; font-weight:700; letter-spacing:3px; color:var(--mute); text-transform:uppercase; margin-top:6px; }
  .hero-quote { text-align:right; max-width:320px; font-size:12px; color:var(--mute); font-style:italic; line-height:1.4; }
  .hero-quote b { display:block; color:var(--white); font-style:normal; font-weight:700; font-size:13px; }
  .hero-quote small { display:block; margin-top:4px; font-style:normal; font-size:10px; letter-spacing:1.5px; color:var(--violet); font-weight:700; text-transform:uppercase; }
  .pillars { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .pillar { background:rgba(108,60,255,0.06); border:1px solid rgba(108,60,255,0.18); border-radius:12px; padding:14px 16px; text-align:center; }
  .pillar-icon { font-size:22px; margin-bottom:6px; }
  .pillar-name { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--violet); }
  .pillar-desc { font-size:10.5px; color:var(--mute); margin-top:3px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:16px; }
  .card { background:var(--navy2); border:1px solid var(--border); border-radius:16px; padding:20px; position:relative; overflow:hidden; }
  .card::before { content:""; position:absolute; inset:0 0 auto 0; height:2px; background:var(--grad); opacity:0.5; }
  .card h2 { font-size:12.5px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:var(--white); margin-bottom:14px; display:flex; align-items:center; gap:8px; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; }
  .dot.green { background:#10b981; }
  .dot.gray { background:#4b5563; }
  .stat { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px; color:var(--mute); }
  .stat:last-child { border:none; }
  .stat b { color:var(--white); font-weight:600; }
  button { appearance:none; border:none; background:var(--grad); color:#fff; padding:9px 16px; border-radius:10px; font-family:"Poppins"; font-weight:600; font-size:12.5px; cursor:pointer; margin-right:6px; margin-top:8px; }
  button:hover { transform:translateY(-1px); }
  button.ghost { background:transparent; border:1px solid var(--border); color:var(--white); }
  button.danger { background:#dc2626; }
  input, select { background:var(--navy3); border:1px solid var(--border); color:var(--white); padding:8px 12px; border-radius:8px; font-size:13px; font-family:"Poppins"; margin-right:6px; }
  pre { background:var(--navy3); border:1px solid var(--border); border-radius:10px; padding:12px; font-size:11px; font-family:monospace; max-height:240px; overflow-y:auto; white-space:pre-wrap; color:#a0a0b0; }
  .toast { position:fixed; bottom:24px; right:24px; background:var(--navy2); border:1px solid var(--violet); padding:12px 18px; border-radius:12px; font-size:13px; opacity:0; transition:opacity 0.3s; z-index:1000; }
  .toast.show { opacity:1; }
  .api-row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12.5px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { text-align:left; padding:8px 6px; border-bottom:1px solid rgba(255,255,255,0.05); }
  th { color:var(--mute); font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:1px; }
</style>
</head>
<body>

<header class="hero">
  <svg class="hero-logo" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="kHero" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C3CFF"/>
      <stop offset="38%" stop-color="#FF3CAC"/>
      <stop offset="72%" stop-color="#FF9A00"/>
      <stop offset="100%" stop-color="#FFD23F"/>
    </linearGradient></defs>
    <rect width="96" height="96" rx="22" fill="#1A1333"/>
    <circle cx="48" cy="48" r="32" fill="none" stroke="url(#kHero)" stroke-width="6"/>
    <path d="M 48 28 L 51 45 L 68 48 L 51 51 L 48 68 L 45 51 L 28 48 L 45 45 Z" fill="url(#kHero)"/>
  </svg>
  <div>
    <h1>KUDOS <span class="mark">· Panel del Fundador</span></h1>
    <div class="hero-tagline">MÉRITO · DESCUBRIMIENTO · MEMORIA</div>
  </div>
  <div class="hero-quote">
    <b>Eduardo F.</b>
    Construimos tecnología con propósito para dejar huella en el mundo.
    <small>Fundador & CEO</small>
  </div>
</header>

<section class="pillars">
  <div class="pillar"><div class="pillar-icon">✦</div><div class="pillar-name">DESCUBRE</div><div class="pillar-desc">Lugares que merecen ser conocidos</div></div>
  <div class="pillar"><div class="pillar-icon">🔖</div><div class="pillar-name">GUARDA</div><div class="pillar-desc">Tu mapa personal de inspiración</div></div>
  <div class="pillar"><div class="pillar-icon">↗</div><div class="pillar-name">COMPARTE</div><div class="pillar-desc">Inspira a otros con cápsulas únicas</div></div>
  <div class="pillar"><div class="pillar-icon">♡</div><div class="pillar-name">DEJA HUELLA</div><div class="pillar-desc">El legado del futuro</div></div>
</section>

<div class="grid">
  <div class="card">
    <h2>🎬 Worker · <span id="worker-dot" class="dot gray"></span> <span id="worker-status">cargando</span></h2>
    <div id="worker-stats"></div>
    <div>
      <button onclick="callApi('/api/worker/start','POST','Worker arrancado')">▶ Arrancar</button>
      <button class="danger" onclick="callApi('/api/worker/stop','POST','Worker detenido')">■ Detener</button>
      <button class="ghost" onclick="loadLogs()">📋 Logs</button>
    </div>
    <pre id="worker-logs" style="display:none;margin-top:10px"></pre>
  </div>

  <div class="card">
    <h2>📍 POIs</h2>
    <div id="pois-stats">cargando</div>
    <div>
      <button onclick="callApi('/api/pois/reseed','POST','Cola regenerada')">🌱 Reseed (85)</button>
    </div>
    <div style="margin-top:10px">
      <select id="osm-country">
        <option value="ES">España</option><option value="IT">Italia</option><option value="FR">Francia</option>
      </select>
      <input type="number" id="osm-max" value="2000" style="width:90px">
      <button onclick="importOsm()">📦 Importar OSM</button>
    </div>
    <div style="margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:11px; color:var(--mute); letter-spacing:1px; margin-bottom:8px;">🌐 WIKIDATA (foto + UNESCO)</div>
      <select id="wd-country">
        <option value="ES">España</option><option value="IT">Italia</option><option value="FR">Francia</option>
        <option value="GR">Grecia</option><option value="PT">Portugal</option><option value="DE">Alemania</option>
        <option value="GB">Reino Unido</option><option value="JP">Japón</option>
      </select>
      <button onclick="importWikidata()">⬇ Importar Wikidata</button>
      <button onclick="importWikidataAll()">🌍 Top mundo (14)</button>
      <button class="ghost" onclick="autoPush()">⬆ Auto-push</button>
      <div id="wd-status" style="margin-top:8px; font-size:11px; color:var(--mute)">cargando</div>
    </div>
  </div>

  <div class="card">
    <h2>🔑 APIs externas</h2>
    <div id="apis-list">cargando</div>
    <div style="margin-top:10px">
      <select id="api-name">
        <option value="ANTHROPIC_API_KEY">Anthropic</option>
        <option value="OPENAI_API_KEY">OpenAI</option>
        <option value="KLING_API_KEY">Kling</option>
        <option value="ELEVENLABS_API_KEY">ElevenLabs</option>
      </select>
      <input type="password" id="api-value" placeholder="sk-..." style="width:180px">
      <button onclick="setApiKey()">💾 Guardar</button>
    </div>
  </div>

  <div class="card" style="grid-column:1 / -1">
    <h2>🎥 Cápsulas generadas</h2>
    <div id="capsules-stats" style="margin-bottom:10px; font-size:12.5px; color:var(--mute)"></div>
    <table>
      <thead><tr><th>Slug</th><th>Tamaño</th><th>Generada</th><th></th></tr></thead>
      <tbody id="capsules-body"></tbody>
    </table>
  </div>

  <div class="card">
    <h2>🚀 Git / Deploy</h2>
    <div id="git-stats">cargando</div>
    <div>
      <button onclick="gitPush()">⬆ Push pendientes</button>
    </div>
  </div>

  <div class="card">
    <h2>📊 Métricas globales</h2>
    <div id="metrics">cargando</div>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
console.log("[KUDOS] panel script START");

function toast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 2400);
}

function callApi(url, method, okMsg) {
  fetch(url, {method: method||"POST"})
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j.ok === false) {
        toast("ERROR: " + String(j.error || "error").slice(0,80));
        if (j.error && String(j.error).length > 80) alert(j.error);
      } else {
        toast(okMsg || "OK");
      }
      setTimeout(refresh, 600);
    })
    .catch(function(e){ toast("ERROR: " + e.message); });
}

function importOsm() {
  var country = document.getElementById("osm-country").value;
  var max = parseInt(document.getElementById("osm-max").value, 10);
  fetch("/api/pois/import_osm", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({country: country, max_results: max})
  })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if (j.ok) toast("Importando " + country + " (pid " + j.pid + ")");
    else { toast("ERROR"); alert(j.error || "error"); }
  })
  .catch(function(e){ toast("ERROR: " + e.message); });
}

function importWikidata() {
  var country = document.getElementById("wd-country").value;
  fetch("/api/pois/import_wikidata", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({country: country, max_per_type: 800})
  })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if (j.ok) toast("Importando Wikidata " + country + " (3-5 min)");
    else { toast("ERROR"); alert(j.error || "error"); }
  })
  .catch(function(e){ toast("ERROR: " + e.message); });
}

function importWikidataAll() {
  if (!confirm("Importar 14 paises top mundo? Tarda 40-60 min en background.")) return;
  fetch("/api/pois/import_wikidata_all", {method: "POST"})
    .then(function(r){ return r.json(); })
    .then(function(j){ toast(j.ok ? "Importando 14 paises" : "ERROR: " + j.error); });
}

function autoPush() {
  toast("Pushing...");
  fetch("/api/git/auto_push", {method: "POST"})
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j.ok) toast("Push OK - Render redesplegara");
      else { toast("ERROR"); alert(j.error || "error"); }
      setTimeout(refresh, 800);
    });
}

function gitPush() {
  toast("Pushing...");
  fetch("/api/git/push", {method: "POST"})
    .then(function(r){ return r.json(); })
    .then(function(j){
      toast(j.ok ? "Push OK" : "Push fallo");
      setTimeout(refresh, 800);
    });
}

function setApiKey() {
  var name = document.getElementById("api-name").value;
  var value = document.getElementById("api-value").value;
  if (!value) { toast("Pega la clave"); return; }
  fetch("/api/apis/key", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({name: name, value: value})
  })
  .then(function(r){
    if (r.ok) {
      toast("Guardada");
      document.getElementById("api-value").value = "";
    }
    setTimeout(refresh, 600);
  });
}

function delCapsule(slug) {
  if (!confirm("Borrar " + slug + ".mp4?")) return;
  fetch("/api/capsules/" + slug, {method: "DELETE"})
    .then(function(){ toast(slug + " borrada"); setTimeout(refresh, 200); });
}

function loadLogs() {
  var pre = document.getElementById("worker-logs");
  pre.style.display = "block";
  fetch("/api/worker/logs")
    .then(function(r){ return r.text(); })
    .then(function(t){ pre.textContent = t; pre.scrollTop = pre.scrollHeight; });
}

function refresh() {
  console.log("[KUDOS] refresh tick");
  fetch("/api/status")
    .then(function(r){ return r.json(); })
    .then(function(s){
      var wDot = document.getElementById("worker-dot");
      var wSt = document.getElementById("worker-status");
      if (s.worker.running) {
        wDot.className = "dot green";
        wSt.textContent = "corriendo (pid " + s.worker.pid + ")";
      } else {
        wDot.className = "dot gray";
        wSt.textContent = "PARADO";
      }
      document.getElementById("worker-stats").innerHTML =
        '<div class="stat"><span>POIs hechos</span><b>' + s.pois.done + '</b></div>' +
        '<div class="stat"><span>POIs pendientes</span><b>' + s.pois.pending + '</b></div>' +
        '<div class="stat"><span>Capsulas en disco</span><b>' + s.capsules.total + ' · ' + s.capsules.total_mb + ' MB</b></div>';
      var apisHtml = "";
      Object.keys(s.apis).forEach(function(k){
        var a = s.apis[k];
        apisHtml += '<div class="api-row">' +
          '<div><div>' + a.label + '</div><div style="font-size:10.5px;color:var(--mute)">' + a.cost_hint + '</div>' +
          (a.preview ? '<div style="font-size:10px;color:#10b981;font-family:monospace">' + a.preview + '</div>' : '') +
          '</div><span class="dot ' + (a.configured ? "green" : "gray") + '"></span></div>';
      });
      document.getElementById("apis-list").innerHTML = apisHtml;
      document.getElementById("metrics").innerHTML =
        '<div class="stat"><span>POIs en cola</span><b>' + s.pois.queue + '</b></div>' +
        '<div class="stat"><span>POIs procesados</span><b>' + s.pois.done + '</b></div>' +
        '<div class="stat"><span>Capsulas MP4</span><b>' + s.capsules.total + '</b></div>' +
        '<div class="stat"><span>POIs OSM importados</span><b>' + s.osm.total_pois + '</b></div>' +
        '<div class="stat"><span>Ultimo HEAD</span><b>' + s.git.head + '</b></div>';
    })
    .catch(function(e){ console.warn("status fail", e); });

  fetch("/api/pois/stats").then(function(r){ return r.json(); }).then(function(ps){
    var byTier = Object.keys(ps.by_tier).map(function(t){ return t + ":" + ps.by_tier[t]; }).join(" · ");
    document.getElementById("pois-stats").innerHTML =
      '<div class="stat"><span>Cola total</span><b>' + ps.queue + '</b></div>' +
      '<div class="stat"><span>Por tier</span><b>' + (byTier || "-") + '</b></div>';
  }).catch(function(){});

  fetch("/api/capsules").then(function(r){ return r.json(); }).then(function(cap){
    document.getElementById("capsules-stats").textContent = cap.count + " capsulas";
    var body = "";
    for (var i = 0; i < cap.items.length && i < 50; i++) {
      var c = cap.items[i];
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"); td1.innerHTML = "<b>" + c.slug + "</b>"; tr.appendChild(td1);
      var td2 = document.createElement("td"); td2.textContent = c.size_kb + " KB"; tr.appendChild(td2);
      var td3 = document.createElement("td"); td3.textContent = new Date(c.mtime).toLocaleString(); tr.appendChild(td3);
      var td4 = document.createElement("td"); 
      var btn = document.createElement("button"); btn.className = "ghost"; btn.textContent = "Borrar";
      btn.dataset.slug = c.slug;
      btn.onclick = function() { delCapsule(this.dataset.slug); };
      td4.appendChild(btn); tr.appendChild(td4);
      body += tr.outerHTML;
    }
    document.getElementById("capsules-body").innerHTML = body;
  }).catch(function(){});

  fetch("/api/git/status").then(function(r){ return r.json(); }).then(function(g){
    document.getElementById("git-stats").innerHTML =
      '<div class="stat"><span>Branch</span><b>' + g.branch + '</b></div>' +
      '<div class="stat"><span>HEAD</span><b>' + g.head + '</b></div>' +
      '<div class="stat"><span>Commits pendientes</span><b>' + g.ahead + '</b></div>' +
      '<div class="stat"><span>Archivos sin commit</span><b>' + g.dirty_files + '</b></div>';
  }).catch(function(){});

  fetch("/api/pois/wikidata_status").then(function(r){ return r.json(); }).then(function(wd){
    var txt = wd.total_pois > 0
      ? wd.total_pois.toLocaleString() + " POIs · " + wd.files.length + " paises (" + wd.files.map(function(f){return f.country;}).join(", ") + ")"
      : "Sin datos · pulsa Importar Wikidata";
    document.getElementById("wd-status").textContent = txt;
  }).catch(function(){});
}

console.log("[KUDOS] llamando refresh por primera vez");
refresh();
setInterval(refresh, 5000);
console.log("[KUDOS] panel script END · interval cada 5s");
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
    print("  KUDOS . Panel del Fundador")
    print(f"  Abre en tu navegador: http://{args.host}:{args.port}")
    print("  Ctrl+C para parar")
    print("=" * 60)
    print()
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
