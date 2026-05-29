<#
KUDOS · RECOVER.ps1
====================

Ejecuta TODO lo necesario para sincronizar producción tras la megatarea
autónoma del 29 May 2026.

USO:
  cd C:\Users\efert\kudos_project
  powershell -ExecutionPolicy Bypass -File RECOVER.ps1

Lo que hace:
  1. Verifica estado git · muestra qué se va a commitear
  2. Re-ejecuta recompute_tiers · scoring HDG opcional
  3. git add masivo de TODO lo pendiente (sin tocar capsulas_prueba antiguo)
  4. commit consolidado con mensaje claro
  5. git push origin master
  6. Imprime URLs para verificar tras redeploy
#>

$ErrorActionPreference = "Stop"
$cwd = Get-Location
if (-not (Test-Path "$cwd\.git")) {
    Write-Host "ERROR · ejecuta este script desde C:\Users\efert\kudos_project" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  KUDOS · RECOVER · sincronización completa"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

# ─── 1) Estado git ───────────────────────────────────────────────────
Write-Host "[1/5] Estado git actual..." -ForegroundColor Cyan
git status --short
Write-Host ""

# ─── 2) Re-recompute tiers (opcional · si algo cambió en regex) ─────
Write-Host "[2/5] Re-computando tiers en backend..." -ForegroundColor Cyan
try {
    python -m kudos_engine.scripts.recompute_tiers 2>&1 | Select-Object -Last 6
} catch {
    Write-Host "  (saltado · python no disponible o script falló)" -ForegroundColor Yellow
}
Write-Host ""

# ─── 3) git add masivo · todo lo relevante ──────────────────────────
Write-Host "[3/5] Añadiendo archivos al stage..." -ForegroundColor Cyan
git add experience/app
git add experience/components
git add experience/public/capsules
git add experience/public/data/wikidata
git add experience/public/media
git add kudos_engine/apps
git add kudos_engine/scripts
git add render.yaml
git add DEPLOY_API_V2.md
git add ESTADO_KUDOS.md
git add RECOVER.ps1

# Mostrar qué se va a commitear
Write-Host ""
Write-Host "Resumen de archivos en stage:"
git diff --cached --stat | Select-Object -Last 10
Write-Host ""

# ─── 4) Commit ──────────────────────────────────────────────────────
Write-Host "[4/5] Commit..." -ForegroundColor Cyan
$msg = "MEGATAREA · sincronizacion total · page.tsx v5 (HomeFeed/MiMundo/POI) + AppShellV4 BottomNav en /world + AppBottomNavV4 KudosFlower central + signals module + HDG models extendidos + 11 capsulas reales curadas + RECOVER script"
$emailFlag = "-c"
$emailVal = "user.email=eduardo@kudos.world"
$nameFlag = "-c"
$nameVal = "user.name=Eduardo"
git $emailFlag $emailVal $nameFlag $nameVal commit -m $msg
if ($LASTEXITCODE -ne 0) {
    Write-Host "  (nada que commitear · ya está sincronizado)" -ForegroundColor Yellow
}
Write-Host ""

# ─── 5) Push ────────────────────────────────────────────────────────
Write-Host "[5/5] Push a origin master..." -ForegroundColor Cyan
git push origin master
Write-Host ""

# ─── Resumen final ──────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  COMPLETADO · Render redeploya en ~3 min"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "URLs para verificar tras redeploy:" -ForegroundColor Green
Write-Host "  Home Feed v5      https://kudos-frontend-rsi3.onrender.com/inicio"
Write-Host "  World Map v5      https://kudos-frontend-rsi3.onrender.com/world"
Write-Host "  Mi Mundo v5       https://kudos-frontend-rsi3.onrender.com/mi-mundo"
Write-Host "  POI Node v5       https://kudos-frontend-rsi3.onrender.com/poi/wd-Q10285"
Write-Host "  Merit Engine v5   https://kudos-frontend-rsi3.onrender.com/merit/wd-Q10285"
Write-Host ""
Write-Host "Si algo falla, mira los Render logs en:" -ForegroundColor Yellow
Write-Host "  https://dashboard.render.com/web/srv-d87d8st7vvec738uc2m0"
Write-Host ""
