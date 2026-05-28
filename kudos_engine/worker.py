"""
KUDOS Worker · servicio 24/7 que genera cápsulas en bucle infinito.

Diseñado para vivir en el PC de Eduardo. Lo arrancas una vez (al login de
Windows o desde PowerShell) y trabaja solo: toma POIs de una cola, genera
cápsulas con kudos_engine, las copia a /experience/public/capsules/, y
hace git push cuando hay >= UPLOAD_BATCH cápsulas nuevas.

Modo offline:
  - Si no hay internet, NO falla. Las cápsulas se acumulan en disco.
  - Cuando vuelve la conexión, autosync en el siguiente ciclo.
  - El worker NUNCA consume APIs de pago si ANTHROPIC_API_KEY no está
    presente — usa los guiones plantilla de providers/guion_claude.py.

Estado persistido:
  state/queue.json      → lista de POIs pendientes (ordenados por tier S→A→B→C)
  state/done.json       → POIs ya completados (con timestamp + ruta MP4)
  state/log.txt         → log append-only del worker

Comandos:
  python -m kudos_engine.worker                     # arranca el loop infinito
  python -m kudos_engine.worker --once              # procesa 1 POI y sale
  python -m kudos_engine.worker --status            # imprime cola + done
  python -m kudos_engine.worker --reseed            # regenera queue.json desde 0
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .pipeline import generate_capsule
from .providers.wikimedia import _slugify


ROOT = Path(__file__).resolve().parent
STATE_DIR = ROOT / "state"
STATE_DIR.mkdir(exist_ok=True)
QUEUE_PATH = STATE_DIR / "queue.json"
DONE_PATH = STATE_DIR / "done.json"
LOG_PATH = STATE_DIR / "log.txt"

# Carpeta de la app Next donde se sirven los .mp4
EXPERIENCE_CAPSULES = ROOT.parent / "experience" / "public" / "capsules"
EXPERIENCE_CAPSULES.mkdir(parents=True, exist_ok=True)

# Configuración
UPLOAD_BATCH = 5         # haz git push cada N cápsulas nuevas
LOOP_SLEEP_SECONDS = 10  # pausa entre POIs (no martillea CPU)
RETRY_BACKOFF = 60       # si una cápsula falla, espera 60s antes del siguiente


# ─── Logging ─────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    """Escribe a stdout + log.txt."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ─── Estado ──────────────────────────────────────────────────────────────

def load_queue() -> list[dict]:
    if not QUEUE_PATH.exists():
        return []
    return json.loads(QUEUE_PATH.read_text(encoding="utf-8"))


def save_queue(queue: list[dict]) -> None:
    QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")


def load_done() -> dict:
    if not DONE_PATH.exists():
        return {}
    return json.loads(DONE_PATH.read_text(encoding="utf-8"))


def save_done(done: dict) -> None:
    DONE_PATH.write_text(json.dumps(done, ensure_ascii=False, indent=2), encoding="utf-8")


# ─── Git ─────────────────────────────────────────────────────────────────

def git_run(args: list[str]) -> tuple[int, str]:
    """Ejecuta git en la raíz del repo. Devuelve (returncode, stderr+stdout)."""
    try:
        res = subprocess.run(
            ["git", *args],
            cwd=str(ROOT.parent),
            capture_output=True,
            text=True,
            timeout=60,
        )
        return res.returncode, (res.stdout + res.stderr).strip()
    except Exception as e:
        return 99, str(e)


def is_online() -> bool:
    """Test rápido: ¿hay conexión a github.com?"""
    rc, _ = git_run(["ls-remote", "--exit-code", "origin", "HEAD"])
    return rc == 0


def upload_batch(slugs: list[str]) -> bool:
    """git add + commit + push para los .mp4 listados. True si ok."""
    if not slugs:
        return True
    paths = [
        f"experience/public/capsules/{s}.mp4" for s in slugs
        if (EXPERIENCE_CAPSULES / f"{s}.mp4").exists()
    ]
    if not paths:
        return True
    log(f"git add · {len(paths)} archivos")
    rc, out = git_run(["add", *paths])
    if rc != 0:
        log(f"git add ERROR: {out}")
        return False
    msg = f"Worker · {len(paths)} capsulas nuevas\n\n" + "\n".join(f"- {p}" for p in paths)
    rc, out = git_run(["-c", "user.email=worker@kudos.world",
                       "-c", "user.name=KUDOS Worker", "commit", "-m", msg])
    if rc != 0:
        # Quizá no hay cambios (ya commiteados) — no es error
        if "nothing to commit" in out.lower():
            log("git commit: nada nuevo")
            return True
        log(f"git commit ERROR: {out}")
        return False
    if not is_online():
        log("offline · commit local guardado, push diferido")
        return True
    rc, out = git_run(["push", "origin", "HEAD"])
    if rc != 0:
        log(f"git push ERROR (se reintentará): {out}")
        return False
    log(f"git push OK · {len(paths)} cápsulas en producción")
    return True


# ─── Procesador de un POI ────────────────────────────────────────────────

def process_poi(poi: dict) -> Optional[str]:
    """
    Genera la cápsula y la copia a experience/public/capsules/.
    Devuelve el slug del POI procesado, o None si falló.
    """
    name = poi.get("name", "POI desconocido")
    slug = poi.get("slug") or _slugify(name)
    log(f"→ {name} · tier={poi.get('tier', '?')}")

    try:
        result = generate_capsule(
            poi=poi,
            skip_voice=False,
            include_intro=True,
            verbose=False,
        )
    except Exception as e:
        log(f"✗ generate_capsule falló: {e}")
        log(traceback.format_exc())
        return None

    src = result.get("video")
    if not src:
        log(f"⚠ {name} tier no genera vídeo (tier {result.get('tier')})")
        return None

    src_path = Path(src)
    if not src_path.exists():
        log(f"✗ MP4 no encontrado: {src}")
        return None

    dst_path = EXPERIENCE_CAPSULES / f"{slug}.mp4"
    shutil.copyfile(src_path, dst_path)
    log(f"✓ {slug}.mp4 ({dst_path.stat().st_size // 1024} KB) → experience/public/capsules/")
    return slug


# ─── Loop principal ──────────────────────────────────────────────────────

def loop(once: bool = False) -> None:
    queue = load_queue()
    done = load_done()

    if not queue:
        log("queue.json vacía · ejecuta: python -m kudos_engine.worker --reseed")
        return

    pending_uploads: list[str] = []
    consecutive_failures = 0

    while True:
        # Filtrar siguientes POIs no procesados
        next_pois = [p for p in queue if p.get("id") not in done]
        if not next_pois:
            log("✨ ¡Cola completada! · todos los POIs procesados")
            if pending_uploads:
                upload_batch(pending_uploads)
            return

        poi = next_pois[0]
        slug = process_poi(poi)
        if slug:
            done[poi["id"]] = {
                "name": poi["name"],
                "slug": slug,
                "at": datetime.now(timezone.utc).isoformat(),
            }
            save_done(done)
            pending_uploads.append(slug)
            consecutive_failures = 0
        else:
            consecutive_failures += 1
            done[poi["id"]] = {
                "name": poi["name"],
                "skipped": True,
                "at": datetime.now(timezone.utc).isoformat(),
            }
            save_done(done)
            if consecutive_failures >= 3:
                log(f"3 fallos seguidos · backoff {RETRY_BACKOFF}s")
                time.sleep(RETRY_BACKOFF)
                consecutive_failures = 0

        # ¿Toca batch upload?
        if len(pending_uploads) >= UPLOAD_BATCH:
            if upload_batch(pending_uploads):
                pending_uploads = []

        if once:
            if pending_uploads:
                upload_batch(pending_uploads)
            return

        time.sleep(LOOP_SLEEP_SECONDS)


# ─── Cola inicial (reseed) ───────────────────────────────────────────────

def reseed() -> None:
    """
    Construye queue.json con los Top 100 POIs.

    Fuente: lista curada estática (ver TOP_100 abajo). Eduardo puede editarla
    o reemplazarla por una salida de seed_world_pois.py si quiere ampliar.
    """
    save_queue(TOP_100)
    log(f"queue.json creada · {len(TOP_100)} POIs en cola")


# Top 100 POIs (subset del WORLD_ICONS + GLOBAL_SEEDS de places-global.ts).
# Cada entrada: id estable + datos para clasificación tier.
TOP_100: list[dict] = [
    # ─── Tier S · iconos del planeta ─────────────────────────────────────
    {"id": "rome",        "name": "Coliseo de Roma",          "country": "Italia",      "unesco": True,  "annual_visitors": 7_600_000, "wikipedia_languages": 130, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "g-eiffel",    "name": "Torre Eiffel",             "country": "Francia",     "unesco": False, "annual_visitors": 7_000_000, "wikipedia_languages": 120, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "g-taj",       "name": "Taj Mahal",                "country": "India",       "unesco": True,  "annual_visitors": 8_000_000, "wikipedia_languages": 110, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "g-giza",      "name": "Pirámides de Giza",        "country": "Egipto",      "unesco": True,  "annual_visitors": 4_500_000, "wikipedia_languages": 100, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "g-greatwall", "name": "Gran Muralla China",       "country": "China",       "unesco": True,  "annual_visitors": 10_000_000, "wikipedia_languages": 130, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "machu",       "name": "Machu Picchu",             "country": "Perú",        "unesco": True,  "annual_visitors": 1_500_000, "wikipedia_languages": 100, "anthropic_confidence": 0.95, "tier_hint": "S"},
    {"id": "petra",       "name": "Petra",                    "country": "Jordania",    "unesco": True,  "annual_visitors":   800_000, "wikipedia_languages":  90, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-chichen",   "name": "Chichén Itzá",             "country": "México",      "unesco": True,  "annual_visitors": 2_500_000, "wikipedia_languages":  85, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "g-cristored", "name": "Cristo Redentor",          "country": "Brasil",      "unesco": False, "annual_visitors": 2_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-angkor",    "name": "Angkor Wat",               "country": "Camboya",     "unesco": True,  "annual_visitors": 2_500_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "athens",      "name": "Acrópolis de Atenas",      "country": "Grecia",      "unesco": True,  "annual_visitors": 3_000_000, "wikipedia_languages":  90, "anthropic_confidence": 0.94, "tier_hint": "S"},
    {"id": "g-stonehenge","name": "Stonehenge",               "country": "Reino Unido", "unesco": True,  "annual_visitors": 1_500_000, "wikipedia_languages":  90, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "g-sagrada",   "name": "Sagrada Familia",          "country": "España",      "unesco": True,  "annual_visitors": 4_700_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "granada",     "name": "Alhambra",                 "country": "España",      "unesco": True,  "annual_visitors": 2_800_000, "wikipedia_languages":  90, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-libertad",  "name": "Estatua de la Libertad",   "country": "EE.UU.",      "unesco": True,  "annual_visitors": 4_500_000, "wikipedia_languages": 100, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-notredame", "name": "Notre-Dame de París",      "country": "Francia",     "unesco": True,  "annual_visitors": 12_000_000, "wikipedia_languages": 100, "anthropic_confidence": 0.94, "tier_hint": "S"},
    {"id": "g-sphinx",    "name": "Esfinge de Giza",          "country": "Egipto",      "unesco": True,  "annual_visitors": 4_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "g-vatican",   "name": "Capilla Sixtina",          "country": "Vaticano",    "unesco": True,  "annual_visitors": 6_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-bigben",    "name": "Big Ben",                  "country": "Reino Unido", "unesco": True,  "annual_visitors": 2_000_000, "wikipedia_languages":  90, "anthropic_confidence": 0.91, "tier_hint": "S"},
    {"id": "g-empire",    "name": "Empire State Building",    "country": "EE.UU.",      "unesco": False, "annual_visitors": 4_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "g-opera",     "name": "Ópera de Sídney",          "country": "Australia",   "unesco": True,  "annual_visitors": 8_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-forbidden", "name": "Ciudad Prohibida",         "country": "China",       "unesco": True,  "annual_visitors": 14_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "S"},
    {"id": "g-cordoba",   "name": "Mezquita de Córdoba",      "country": "España",      "unesco": True,  "annual_visitors": 1_900_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "S"},
    {"id": "g-bluemosque","name": "Mezquita Azul",            "country": "Turquía",     "unesco": True,  "annual_visitors": 5_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "g-rapa",      "name": "Isla de Pascua",           "country": "Chile",       "unesco": True,  "annual_visitors":   100_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "S"},

    # ─── Tier A · top regionales (continuamos) ───────────────────────────
    {"id": "g-louvre",    "name": "Museo del Louvre",         "country": "Francia",     "unesco": True,  "annual_visitors": 9_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.93, "tier_hint": "A"},
    {"id": "g-versailles","name": "Versalles",                "country": "Francia",     "unesco": True,  "annual_visitors": 8_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-msm",       "name": "Mont Saint-Michel",        "country": "Francia",     "unesco": True,  "annual_visitors": 2_500_000, "wikipedia_languages":  70, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-neuschwan", "name": "Neuschwanstein",           "country": "Alemania",    "unesco": False, "annual_visitors": 1_400_000, "wikipedia_languages":  70, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-brandenburg","name":"Puerta de Brandeburgo",    "country": "Alemania",    "unesco": False, "annual_visitors": 5_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-pisa",      "name": "Torre de Pisa",            "country": "Italia",      "unesco": True,  "annual_visitors": 5_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-florencia", "name": "Catedral de Florencia",    "country": "Italia",      "unesco": True,  "annual_visitors": 4_500_000, "wikipedia_languages":  60, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-venice",    "name": "Plaza de San Marcos",      "country": "Italia",      "unesco": True,  "annual_visitors": 8_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-pompeya",   "name": "Pompeya",                  "country": "Italia",      "unesco": True,  "annual_visitors": 4_000_000, "wikipedia_languages":  90, "anthropic_confidence": 0.93, "tier_hint": "A"},
    {"id": "g-sevilla",   "name": "Catedral de Sevilla",      "country": "España",      "unesco": True,  "annual_visitors": 1_500_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-burgos",    "name": "Catedral de Burgos",       "country": "España",      "unesco": True,  "annual_visitors":   500_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-toledo",    "name": "Toledo",                   "country": "España",      "unesco": True,  "annual_visitors": 2_300_000, "wikipedia_languages":  60, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-escorial",  "name": "El Escorial",              "country": "España",      "unesco": True,  "annual_visitors":   700_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-prado",     "name": "Museo del Prado",          "country": "España",      "unesco": False, "annual_visitors": 3_500_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-bilbao",    "name": "Guggenheim Bilbao",        "country": "España",      "unesco": False, "annual_visitors": 1_200_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-portoabey", "name": "Torre de Belém",           "country": "Portugal",    "unesco": True,  "annual_visitors": 1_000_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-lisbon",    "name": "Tranvía 28 Lisboa",        "country": "Portugal",    "unesco": False, "annual_visitors": 5_000_000, "wikipedia_languages":  30, "anthropic_confidence": 0.85, "tier_hint": "A"},
    {"id": "g-redsq",     "name": "Plaza Roja Moscú",         "country": "Rusia",       "unesco": True,  "annual_visitors": 3_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-amsterdam", "name": "Canales de Ámsterdam",     "country": "Países Bajos","unesco": True,  "annual_visitors": 10_000_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-copenhagen","name": "Nyhavn Copenhague",        "country": "Dinamarca",   "unesco": False, "annual_visitors": 8_000_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-edinburgh", "name": "Castillo de Edimburgo",    "country": "Reino Unido", "unesco": True,  "annual_visitors": 2_000_000, "wikipedia_languages":  50, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-dubrovnik", "name": "Dubrovnik",                "country": "Croacia",     "unesco": True,  "annual_visitors": 1_300_000, "wikipedia_languages":  50, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-praga",     "name": "Castillo de Praga",        "country": "Rep. Checa",  "unesco": True,  "annual_visitors": 2_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-terracota", "name": "Guerreros de Xi'an",       "country": "China",       "unesco": True,  "annual_visitors": 8_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-bagan",     "name": "Bagan",                    "country": "Myanmar",     "unesco": True,  "annual_visitors":   300_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-borobudur", "name": "Borobudur",                "country": "Indonesia",   "unesco": True,  "annual_visitors": 4_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-petronas",  "name": "Torres Petronas",          "country": "Malasia",     "unesco": False, "annual_visitors": 2_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-kyoto",     "name": "Kinkaku-ji",               "country": "Japón",       "unesco": True,  "annual_visitors": 5_000_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-mtfuji",    "name": "Monte Fuji",               "country": "Japón",       "unesco": True,  "annual_visitors":   300_000, "wikipedia_languages":  90, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-fushimi",   "name": "Fushimi Inari",            "country": "Japón",       "unesco": False, "annual_visitors": 10_000_000, "wikipedia_languages":  40, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-burj",      "name": "Burj Khalifa",             "country": "EAU",         "unesco": False, "annual_visitors": 1_900_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-jerusalem", "name": "Muro de las Lamentaciones","country": "Israel",      "unesco": True,  "annual_visitors": 5_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-persepolis","name": "Persépolis",               "country": "Irán",        "unesco": True,  "annual_visitors":   300_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-samarkand", "name": "Samarcanda",               "country": "Uzbekistán",  "unesco": True,  "annual_visitors":   200_000, "wikipedia_languages":  50, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-goldengate","name": "Golden Gate",              "country": "EE.UU.",      "unesco": False, "annual_visitors": 10_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-grand",     "name": "Gran Cañón",               "country": "EE.UU.",      "unesco": True,  "annual_visitors": 5_900_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "g-niagara",   "name": "Cataratas del Niágara",    "country": "Canadá",      "unesco": False, "annual_visitors": 14_000_000, "wikipedia_languages":  70, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-cn",        "name": "Torre CN",                 "country": "Canadá",      "unesco": False, "annual_visitors": 1_500_000, "wikipedia_languages":  60, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-teotihuacan","name": "Teotihuacán",             "country": "México",      "unesco": True,  "annual_visitors": 4_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-iguazu",    "name": "Cataratas del Iguazú",     "country": "Argentina",   "unesco": True,  "annual_visitors": 1_500_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-perito",    "name": "Perito Moreno",            "country": "Argentina",   "unesco": True,  "annual_visitors":   600_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-tikal",     "name": "Tikal",                    "country": "Guatemala",   "unesco": True,  "annual_visitors":   200_000, "wikipedia_languages":  50, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-galapagos", "name": "Islas Galápagos",          "country": "Ecuador",     "unesco": True,  "annual_visitors":   250_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "A"},
    {"id": "cusco",       "name": "Cusco",                    "country": "Perú",        "unesco": True,  "annual_visitors": 1_200_000, "wikipedia_languages":  60, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-luxor",     "name": "Karnak Luxor",             "country": "Egipto",      "unesco": True,  "annual_visitors": 1_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-marrakech", "name": "Plaza Jemaa el-Fna",       "country": "Marruecos",   "unesco": True,  "annual_visitors": 1_500_000, "wikipedia_languages":  40, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-lalibela",  "name": "Lalibela",                 "country": "Etiopía",     "unesco": True,  "annual_visitors":   100_000, "wikipedia_languages":  40, "anthropic_confidence": 0.88, "tier_hint": "A"},
    {"id": "g-kilimanjaro","name":"Kilimanjaro",              "country": "Tanzania",    "unesco": True,  "annual_visitors":    50_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "g-victoria",  "name": "Cataratas Victoria",       "country": "Zambia",      "unesco": True,  "annual_visitors":   300_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "g-table",     "name": "Table Mountain",           "country": "Sudáfrica",   "unesco": True,  "annual_visitors": 1_000_000, "wikipedia_languages":  40, "anthropic_confidence": 0.89, "tier_hint": "A"},
    {"id": "g-uluru",     "name": "Uluru",                    "country": "Australia",   "unesco": True,  "annual_visitors":   300_000, "wikipedia_languages":  60, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "istanbul",    "name": "Hagia Sofia",              "country": "Turquía",     "unesco": True,  "annual_visitors": 3_700_000, "wikipedia_languages":  80, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "ogrove",      "name": "O Grove · Castros Areoso", "country": "España",      "unesco": False, "annual_visitors":    20_000, "wikipedia_languages":   8, "anthropic_confidence": 0.80, "tier_hint": "B"},
    {"id": "pontevedra",  "name": "Pontevedra medieval",      "country": "España",      "unesco": False, "annual_visitors":   100_000, "wikipedia_languages":  10, "anthropic_confidence": 0.82, "tier_hint": "B"},
    {"id": "santiago",    "name": "Santiago de Compostela",   "country": "España",      "unesco": True,  "annual_visitors":   350_000, "wikipedia_languages":  50, "anthropic_confidence": 0.90, "tier_hint": "A"},
    {"id": "paris",       "name": "París · Belle Époque",     "country": "Francia",     "unesco": True,  "annual_visitors": 12_000_000, "wikipedia_languages": 100, "anthropic_confidence": 0.92, "tier_hint": "S"},
    {"id": "tokyo",       "name": "Tokio · Shōwa",            "country": "Japón",       "unesco": False, "annual_visitors": 10_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "washington",  "name": "Washington · National Mall","country": "EE.UU.",     "unesco": True,  "annual_visitors": 35_000_000, "wikipedia_languages":  60, "anthropic_confidence": 0.91, "tier_hint": "A"},
    {"id": "salamanca",   "name": "Salamanca · Universidad",  "country": "España",      "unesco": True,  "annual_visitors":   200_000, "wikipedia_languages":  30, "anthropic_confidence": 0.85, "tier_hint": "A"},
    {"id": "barcelona",   "name": "Barcelona · Las Ramblas",  "country": "España",      "unesco": False, "annual_visitors": 12_000_000, "wikipedia_languages":  80, "anthropic_confidence": 0.91, "tier_hint": "A"},
    # 85 entries · suficiente para arrancar. Cuando termine, añadimos más.
]


# ─── CLI ─────────────────────────────────────────────────────────────────

def cmd_status() -> int:
    queue = load_queue()
    done = load_done()
    pending = [p for p in queue if p["id"] not in done]
    log(f"queue: {len(queue)} POIs · done: {len(done)} · pending: {len(pending)}")
    if pending[:5]:
        log("siguientes 5:")
        for p in pending[:5]:
            log(f"  · {p['name']}")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="kudos_engine.worker")
    p.add_argument("--once", action="store_true", help="Procesa solo 1 POI y sale")
    p.add_argument("--status", action="store_true", help="Imprime estado de cola")
    p.add_argument("--reseed", action="store_true", help="Regenera queue.json desde 0")
    args = p.parse_args(argv)

    if args.status:
        return cmd_status()
    if args.reseed:
        reseed()
        return 0

    log("KUDOS Worker arrancando · " + ("modo --once" if args.once else "loop infinito"))
    log(f"  queue: {QUEUE_PATH}")
    log(f"  done:  {DONE_PATH}")
    log(f"  out:   {EXPERIENCE_CAPSULES}")
    try:
        loop(once=args.once)
    except KeyboardInterrupt:
        log("interrumpido por usuario · adios")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
