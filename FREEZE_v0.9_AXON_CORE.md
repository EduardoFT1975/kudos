# KUDOS · FREEZE v0.9-axon-core · Estado funcional + deploy runbook

**Fecha:** 2026-05-17
**Estado:** FREEZE OPERACIONAL — sin nuevas features, sin nueva arquitectura, sin refactor adicional.
**Objetivo:** estabilidad + deploy readiness.

---

## 1. Estado funcional exacto

### 1.1 Versión
- **Tag git destino:** `v0.9-axon-core`
- **Branch base:** `master` (ver §3 para comando exacto)
- **Pre-tag commits:** `cd91532` "Initial commit for Kudos project" + `99b7852` "Initial commit"
- **Cambios sin commit en `master` (pre-FREEZE):** 414 archivos modificados/nuevos pendientes de stage.

### 1.2 PUBLIC CORE — 7 pilares operativos

| Pilar | Ruta | Estado |
|---|---|---|
| 1. Mapa 5D | `/map/` | ✓ clustering + bbox + lazy + mobile + modular |
| 2. Capsules | `/capsules/`, `/capsules/<uid>/` | ✓ lazy detail + portal contextual + gating DORMANT |
| 3. Search | `/search/` | ✓ |
| 4. Timeline | `/timeline/` | ✓ vista alt-view + 8 epochs |
| 5. Users | `/`, `/profile/`, `/accounts/login/`, `/register/` | ✓ |
| 6. Mind Lite | `/mind/`, `/mind/ask/` | ✓ 3 prompts + auto-fire |
| 7. Share | popup + capsule_detail | ✓ Web Share + OG + Twitter + JSON-LD |

### 1.3 Estructura crítica (frozen)

```
kudos_project/
├── features.py           193 L  · registry PUBLIC/DORMANT
├── middleware.py          61 L  · DormantRouteMiddleware
└── settings.py           226 L  · MIDDLEWARE incluye AXON gating

kudos_app/
├── templatetags/feature_tags.py  60 L
├── views.py             2 337 L  · 0 funciones duplicadas · 0 F401
├── urls.py                205 L  · 109 refs → views todas resuelven
├── models.py            1 114 L
└── templates/
    ├── base.html          180 L  · nav 7 pilares + gating
    ├── map.html           167 L  · módulos cargados externos
    ├── capsule_detail.html  876 L  · OG + Schema + gating DORMANT
    └── ai_panel.html      343 L  · Mind Lite · 3 chips

static/
├── vendor/leaflet/        162 KB · Leaflet 1.9.4 local
├── css/map5d.css          399 L
└── js/map5d/              670 L · 10 módulos (core, layers, clustering,
                                    popups, markers, search, timeline,
                                    mobile, ui, share)
```

### 1.4 Smoke test integral · 29/29 ✓

Última corrida: 2026-05-16. Cubre parse AST (8 archivos), balance HTML (8 checks), null bytes (0), duplicados (0), URLs→views (109 refs), feature gating (4 checks), middleware registrado, public routes pass (15), dormant blocking (16), 7 pilares vivos, identidad visual (17/17).

### 1.5 Configuración crítica

| Key | Valor |
|---|---|
| `DJANGO_ENV` | `development` (override con env var en producción) |
| `DEBUG` | depende de `DJANGO_ENV` |
| `ALLOWED_HOSTS` | env `ALLOWED_HOSTS` separado por comas |
| `DATABASE_URL` | env (Render/Heroku Postgres); fallback `db.sqlite3` |
| `SECRET_KEY` | env `SECRET_KEY` (REQUERIDA en producción) |
| `OPENAI_API_KEY` / `GOOGLE_MAPS_API_KEY` | env opcional |
| Override gating | `KUDOS_GATING_OFF=1`, `KUDOS_GATING_LOG=1`, `KUDOS_FEATURE_<NAME>=1` |

---

## 2. Backups generados en este FREEZE

### 2.1 Repo tarball

| Item | Valor |
|---|---|
| Archivo | `kudos_v0.9-axon-core.20260517T085217Z.tar.gz` |
| Ubicación | `outputs/` (entregable al usuario) |
| Tamaño | **87 MB** |
| Archivos incluidos | **724** |
| SHA256 | `c1a082ff90e3fc0e44b183f9533524422305b3163298d455ddbdbd9f8b059c3f` |
| Excluidos | `.git`, `staticfiles`, `media`, `node_modules`, `__pycache__`, `*.pyc`, `*.log`, `*.sqlite3`, `wiki_dumps`, snapshots `.dx` |

### 2.2 DB snapshot SQLite

| Item | Valor |
|---|---|
| Archivo | `kudos_db.20260517T085412Z.sqlite3` |
| Ubicación | `outputs/` |
| Tamaño | **9.52 MB** |
| SHA256 | `93b90c9a63dd5a27a7a5135abd51f27e6f57d09b9e2b0526131c750ceac69832` (idéntico al original — copia bit-perfect) |
| Integridad | `PRAGMA integrity_check`: **ok** |
| Tablas | 53 |
| Cápsulas | **1 458** |
| Users | 10 |

### 2.3 Snapshots Dx (microbackups por fase)

23 snapshots `.snapshot.dX.YYYYMMDDTHHMMSSZ` distribuidos por carpeta:
- d3: 2 (zombies eliminados)
- d4: 2 (clustering+bbox)
- d5: 3 (lazy popup)
- d6: 3 (mobile)
- d7: 1 (refactor frontend)
- d10: 10 (capsule engine)
- d12: 2 (Mind Lite)

**Rollback verificado read-only: 6/6 archivos críticos producen sha256 idéntico al snapshot al restaurar.**

---

## 3. Tag git · runbook exacto

> **Importante:** este sandbox tiene git instalado pero bloquea `index.lock` rotation. **Los comandos siguientes deben ejecutarse en la máquina local del fundador**, no aquí.

```bash
cd /ruta/local/a/kudos_project
git status -sb                                # debería listar ~414 cambios

# Identidad git (sólo primera vez)
git config user.email "tu-email@dominio"
git config user.name  "Tu Nombre"

# Stage + commit
git add -A
git commit -m "AXON · v0.9-axon-core · primer núcleo funcional coherente

- 7 pilares PUBLIC CORE operativos
- Feature gating con middleware + templatetags
- Mapa 5D: bbox + clustering + lazy popup + mobile + modular
- Capsule engine: portal contextual con share Web API
- MIND LITE: 3 prompts contextuales, sin chatbot
- Identidad visual preservada: 17/17 elementos auditados
- Smoke test integral: 29/29 checks
- 23 snapshots reversibles preservados"

# Tag anotado
git tag -a v0.9-axon-core -m "Primer núcleo funcional coherente de KUDOS"

# Push
git push origin master
git push origin v0.9-axon-core
```

### Tag firmado (recomendado para producción)
```bash
git tag -s v0.9-axon-core -m "KUDOS v0.9-axon-core" \
        --local-user="tu-clave-gpg"
```

---

## 4. Deploy checklist (pre-flight)

### 4.1 Validaciones obligatorias antes de desplegar

```
[ ] git status limpio (todo commited en v0.9-axon-core)
[ ] git tag -l muestra v0.9-axon-core
[ ] python manage.py check --deploy        → 0 warnings críticos
[ ] python manage.py migrate --plan        → revisar migraciones pendientes
[ ] python manage.py collectstatic --noinput
[ ] SECRET_KEY env var configurada (no la del .env.example)
[ ] DEBUG=False en producción
[ ] ALLOWED_HOSTS contiene el dominio público
[ ] CSRF_TRUSTED_ORIGINS contiene https://<dominio>
[ ] DATABASE_URL apunta a Postgres productivo (no SQLite)
[ ] Backup DB pre-deploy guardado fuera del servidor
```

### 4.2 Smoke test post-deploy

```
URL                        Esperado
------------------------   ----------------
/                          200 home
/map/                      200 atlas
/api/capsules/5d/?         200 JSON con bbox limit
/capsules/                 200 lista
/capsules/<uid_real>/      200 detail OG completos
/search/?q=madrid          200 resultados
/timeline/                 200
/mind/                     200 (Lite, 3 chips)
/mind/ask/                 POST 200 {reply}
/profile/                  200 (con login)

/marketplace/              404 ✓ (DORMANT)
/founder/                  404 ✓ (DORMANT)
/feed/                     404 ✓ (DORMANT)
/wisdom/                   404 ✓ (DORMANT)
```

### 4.3 Validaciones manuales (browser real)

```
[ ] Mapa carga en < 3 s (4G simulado)
[ ] Pan/zoom sin freeze (60 fps móvil mid-range)
[ ] Clustering visible (~30 puntos en z=3)
[ ] Click marker → popup instant + chips fade-in
[ ] Click "Explorar →" → capsule_detail abre
[ ] Click "↗ Compartir" → Web Share o clipboard toast
[ ] Click "📜 Timeline" → vista timeline
[ ] Click "🧠 Preguntar a Mind" (desde cápsula) → /mind/?capsule=X
[ ] Mind Lite auto-fire del prompt "what" funciona
[ ] OG preview en WhatsApp (validar con opengraph.xyz)
[ ] Twitter Card validator pasa
[ ] Lighthouse Mobile Performance ≥ 70 (frontera aceptable con glass blur)
[ ] Lighthouse Mobile Best Practices ≥ 90
[ ] Lighthouse Mobile A11y ≥ 90
[ ] Lighthouse Mobile SEO ≥ 90
```

---

## 5. Rollback runbook

### 5.1 Rollback del repo (a estado pre-AXÓN)

```bash
# Reversión global: simplemente git checkout al commit anterior
git checkout cd91532  # commit pre-AXÓN
# o:
git checkout HEAD~1
```

### 5.2 Rollback selectivo por fase

Si una fase Dx introduce un bug en producción:

```bash
# Fase D7 (refactor frontend) → restaurar map.html
cp kudos_app/templates/map.html.snapshot.d7.20260516T134506Z \
   kudos_app/templates/map.html
rm -rf static/vendor/leaflet/ static/css/map5d.css static/js/map5d/

# Fase D10 (capsule engine) → restaurar capsule_detail
cp kudos_app/templates/capsule_detail.html.snapshot.d10.20260516T183045Z \
   kudos_app/templates/capsule_detail.html

# Fase D12 (Mind Lite) → restaurar ai_panel + quitar ai_lite_ask
cp kudos_app/templates/ai_panel.html.snapshot.d12.20260516T185058Z \
   kudos_app/templates/ai_panel.html
cp kudos_app/views.py.snapshot.d12.20260516T185058Z kudos_app/views.py
# manual: eliminar línea ai_lite_ask de urls.py
```

### 5.3 Rollback de DB

```bash
# Detener app primero
sudo systemctl stop kudos     # o supervisorctl stop kudos

# SQLite local
cp outputs/kudos_db.20260517T085412Z.sqlite3 db.sqlite3

# Postgres
psql $DATABASE_URL < outputs/kudos_db_pre_axon.sql

sudo systemctl start kudos
```

### 5.4 Off-switch del gating (sin redeploy)

Si las rutas DORMANT necesitan reactivarse en emergencia:

```bash
# En el servidor productivo
export KUDOS_GATING_OFF=1
# reiniciar gunicorn / uwsgi
```

Esto desactiva `DormantRouteMiddleware` por completo. Todas las rutas pasan a estar accesibles. Útil para debugging sin redeploy.

---

## 6. Reglas durante FREEZE

✗ **NO añadir nuevas features.**
✗ **NO expandir arquitectura** (mover apps/, microservicios, etc.).
✗ **NO reestructurar producto.**
✗ **NO subir nuevas dependencias** (excepto si son hotfixes críticos de seguridad).

✓ **SÍ** corregir bugs detectados durante demo / validación productiva.
✓ **SÍ** ajustar copy / textos visibles (sin cambiar IA, lógica, UX flow).
✓ **SÍ** completar deuda 🔴 LAUNCH BLOCKER de `KNOWN_DEBTS.md` si bloquea demo:
  - validar Lighthouse Mobile real
  - validar share preview real
  - smoke test físico iOS/Android

---

## 7. Resumen de entregables

| Documento | Líneas | Propósito |
|---|---|---|
| `AXON_RELEASE_AUDIT.md` | 174 | Estado final detallado del MVP |
| `PUBLIC_CORE_STATUS.md` | 126 | Checklist 7 pilares por pilar |
| `KNOWN_DEBTS.md` | 103 | 28 deudas reales clasificadas (3 🔴 / 14 🟡 / 11 🟢) |
| `RELEASE_NOTES_v0.9_AXON_CORE.md` | 187 | Qué cambió desde el monolito |
| `FREEZE_v0.9_AXON_CORE.md` | este doc | Runbook deploy + rollback |

Archivos en `outputs/` (descargables):
- `kudos_v0.9-axon-core.20260517T085217Z.tar.gz` (87 MB · repo completo sin .git/DB)
- `kudos_db.20260517T085412Z.sqlite3` (9.5 MB · 1 458 cápsulas)

---

## 8. Comando único de validación final

Antes de declarar FREEZE definitivo, ejecutar en la máquina del fundador:

```bash
cd /ruta/local/a/kudos_project
git status -sb && \
git tag -l | grep v0.9-axon-core && \
python manage.py check --deploy 2>&1 | tail -5 && \
echo "─── FREEZE OK ───"
```

Si los 3 comandos pasan → **v0.9-axon-core está congelado y listo para deploy productivo**.

---

## 9. Sello final

```
Versión:    v0.9-axon-core
Pilares:    7/7 operativos
Smoke:      29/29 checks
Identidad:  17/17 elementos
Snapshots:  23 reversibles
Backups:    repo tarball + DB snapshot
Deuda:      28 ítems documentados (0 bloquean código)
Estado:     FREEZE
```

> *"Revelar el producto oculto dentro del monolito. No construir más sistema. Convertir el núcleo existente en producto estable, experiencia memorable, demo pública sólida y base escalable real."* — mandato AXÓN, cumplido.
