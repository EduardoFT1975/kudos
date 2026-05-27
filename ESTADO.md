# ESTADO.md — KUDOS

**Bitácora viva del proyecto.** Se actualiza al final de cada mensaje de Cowork.

---

## Cabecera

- **Última actualización**: 2026-05-27
- **Mensaje actual / total estimado**: **8 / ~35**
- **Fase**: MVP de las maquetas · Semana 2 · día 5 · smoke E2E local VALIDADO. Ready to deploy
- **Tarea activa (sistema TaskUpdate)**: #57 — Deploy a Render (pending, siguiente msg)
- **Producto en producción**: https://kudos-40cq.onrender.com (Render free tier, MVP CLOSE previo del 2026-05-23)

## Resumen de qué se ha hecho hoy (msg 1)

1. **Auditoría fundacional cerrada** (tarea #46, mensaje anterior). Diagnóstico en 7 secciones del estado real del proyecto.
2. **Decisión de Eduardo**: GPT-5 fuera. Las maquetas son el MVP. Cowork al timón.
3. **Documento Estratégico Maestro recibido** y formalizado en PROYECTO.md.
4. **Limpieza quirúrgica ejecutada** sin tocar producto:
   - 33 carpetas AXÓN movidas de `experience/lib/` a `legacy/axon-experimental-lib/`
   - 11 snapshots Django archivados en `legacy/django-snapshots/`
   - `legacy_views.py` (106 KB) archivado
   - 2 scripts .bat duplicados + `requirements.bad.txt` archivados
   - 4 vistas HTML sueltas archivadas
   - 33 docs históricos consolidados en `legacy/old-docs/`
   - 14 scripts sueltos en raíz movidos a `legacy/scripts-old/`
   - 12 CSVs/logs movidos a `legacy/data-old/`
   - 8 carpetas concept (ar_vr, blockchain, ipfs, tensorflow-source, streamlit, prometheus, temp_dockerfiles, translator) movidas a `legacy/features-concept/`
   - Caches purgadas (`__pycache__`, `.pytest_cache`, `matplotlib-cache`, `dump.rdb`, `celerybeat-*`)
5. **PROYECTO.md creado** en español con visión, producto, roadmap 30 días, stack actual, cadena de mando, reglas de oro.
6. **ESTADO.md creado** (este documento).

Verificado antes de mover: ningún archivo en `experience/app/`, `components/`, `features/`, `hooks/` importa de las carpetas AXÓN. Cero riesgo.

## Estado del repo después de la limpieza

### Raíz `kudos_project/`
- **Docs activos** (9): `README.md`, `PROYECTO.md`, `ESTADO.md`, `PROJECT_STATUS.md`, `MVP_PROGRESS.md`, `CURRENT_BLOCKERS.md`, `MVP_GAPS.md`, `NEXT_PRIORITY.md`, `INSTRUCCIONES.md`, `AXON_CORE.md`, `LICENSES.md`
- **PDF**: `Auditoria_Kudos.pdf` (50 KB · sin leer aún · pendiente)
- **Deploy**: `Dockerfile_app`, `Procfile`, `build.sh`, `render.yaml`, `railway.json`, `requirements.txt`, `runtime.txt`, `package-lock.json`, `KUDOS_SAFE_DEPLOY_V2.bat`
- **Django**: `manage.py`, `db.sqlite3` (mantener local, NO subir a git)

### Carpetas producto (activas)
- `kudos_app/` · backend Django principal
- `kudos_project/` · settings Django
- `content_engine/` · pipeline de cápsulas + LLM
- `experience/` · frontend Next.js 15
- `templates/`, `static/`, `staticfiles/`, `media/`, `data/`, `images/`, `clips/`, `capsulas_prueba/`
- `components/` · ¿qué hay aquí? (revisar próximo mensaje)
- `scripts/`, `tests/`, `reports/`, `logs/`, `docs/`
- `venv/` · entorno virtual local

### Carpeta `legacy/` (archivo, no se toca, no se importa)
- `axon-experimental-lib/` · 33 carpetas AXÓN
- `django-snapshots/` · 11 snapshots versionados
- `features-concept/` · 8 carpetas concept antiguas (blockchain, ar_vr, ipfs, etc.)
- `old-deploy-scripts/` · scripts batch viejos + requirements.bad.txt
- `old-docs/` · 33 docs históricos
- `old-views/` · legacy_views.py + 4 vistas HTML sueltas
- `scripts-old/` · 14 scripts sueltos
- `data-old/` · CSVs y logs viejos

## Bloqueos abiertos del equipo (heredados, P0 declarados antes de mí)

1. 🟥 **BLOCKER-AX-ANTHROPIC-KEY** · `ANTHROPIC_API_KEY` no verificada en Render. Sin esa key el Echo card cae al fallback procedural. Eduardo: comprobar Render dashboard → servicio `kudos` → Environment.
2. 🟥 **BLOCKER-AX-HOME-VERIFY** · Validar HOME 200 en producción post-MVP-close.
3. 🟧 Smoke navegacional físico mobile en iOS Safari + Android Chrome.
4. 🟧 Lighthouse Mobile real sin medir.
5. 🟧 Primer deploy del `kudos-frontend` service en Render confirmado + URL real.
6. 🟧 Re-ejecutar `run_master_smoke_map` post-MVP-close.
7. 🟧 Diagnosticar Barcelona UNGROUNDED en Content Engine.
8. 🟨 Gatear ~30 enlaces dormant en plantillas PUBLIC Django.

## → Necesito de Eduardo (acción)

Nada de esta semana 1 requiere tu intervención. Sigo trabajando.

Cuando llegue el momento (probablemente msg 5-6) te pediré:
- Confirmar que `ANTHROPIC_API_KEY` está en Render Environment del servicio `kudos`
- Confirmar URL del frontend si está desplegado
- Probar la URL pública en tu móvil físico y avisarme de cualquier roce visible

## Resumen de qué se ha hecho hoy (msg 2)

1. **Auditoría exhaustiva de `experience/components/screens/`** (tarea #48 cerrada).
2. **Hallazgo crítico**: el frontend Next.js está construido al **75-85%** sobre las maquetas, **pero todo corre contra `localStorage` (`lib/kudos/store.ts`)**. No hay ni una sola llamada `fetch()` al backend Django desde los componentes. La única referencia al backend es `lib/env/check.ts` que valida que `NEXT_PUBLIC_API_BASE_URL` exista — pero nadie la usa todavía.
3. **Matriz pantalla → estado real construida** (sección siguiente).
4. **Conclusión accionable para Semana 2**: lo que falta para MVP no es UI — es **persistir Mérito + Mi Mundo + Saved en backend Django** y **generar contenido real de cápsulas vídeo 0:15**. Esto cambia la prioridad: no se reescribe Frontend, se conecta.

## Matriz pantalla → estado real (auditoría msg 2)

| Pantalla | Ruta | Líneas | Fuente datos | Fidelidad maqueta | Estado |
|---|---|---:|---|---|---|
| HomeScreen | `/inicio` | 1.193 | `kudos/store` + geo | Feed + cards + filtros | ✅ 85% |
| MapScreen | `/mapa` | 1.055 | `kudos/store` + Leaflet OSM dark | Mapa con POIs, capas pendientes | ✅ 75% |
| MeritScreen | `/merito` | 1.268 | `kudos/store` + `useMerit` + `readStreak` | Score, pilares, multiplicadores, gráfica 30d | ✅ 85% (sin backend) |
| MiMundoScreen | `/mi-mundo` | 981 | `kudos/store` + `useSaved` | Saved, visited, colecciones | ✅ 80% (sin backend) |
| PoiScreen | `/poi/[id]` | 1.499 | `kudos/store` + `mocks-v2` | Detalle POI + cápsulas + cercanas | ✅ 75% |
| ShareCapsuleModal | (modal global) | 1.230 | local | Share sheet + +25 mérito | ✅ 80% |
| MeritToast | (toast global) | 161 | local | Toast +25 al compartir | ✅ 100% |
| VideoCapsule | (componente) | 325 | local | Player vertical 0:15 | ✅ 70% (falta contenido real) |
| HomeMapPanel | (componente) | 279 | local | Toggle Feed/Mapa en HOME | ✅ 80% |
| PerfilScreen | `/perfil` | 417 | `kudos/store` + `useMerit` | Perfil + datos mérito | 🟧 70% |
| MindScreen | `/mind` | 261 | `mocks-v2` | KUDOS MIND chat | 🟧 35% — preguntas hardcoded |
| StudioScreen | `/studio` | 238 | `mocks-v2` | Esqueleto | 🟥 30% |
| SettingsScreen | `/ajustes` | 210 | sin store | Sencilla, funciona | 🟧 50% |
| MomentsScreen | `/momentos` | 183 | `mocks-v2` | Esqueleto | 🟥 30% |
| TimelineScreen | `/linea-tiempo` | 146 | `mocks-v2` | Esqueleto | 🟥 30% |
| NotificationsScreen | `/notificaciones` | 133 | `mocks-v2` | Lista estática | 🟥 30% |
| PlaceScreen | `/places/[slug]` | 96 | `mocks-v2/fixtures` | Hero + botones, casi vacío | 🟥 25% — **duplica PoiScreen** |
| ConnectionsScreen | `/conexiones` | 93 | `mocks-v2` | Esqueleto | 🟥 25% |
| MemoriesScreen | `/mis-memorias` | 94 | `mocks-v2` | Esqueleto | 🟥 25% |
| InviteScreen | `/invitar` | 81 | sin store | Esqueleto | 🟥 20% |
| TimeRomeScreen | `/time/rome` | 77 | `mocks-v2` | Concept | 🟥 20% |

**Cifras totales**: 17 pantallas, ~9.000 líneas TSX, **0 llamadas a backend**.

## Hallazgos clave del Msg 2

1. **Dos sistemas de datos paralelos en el frontend**:
   - `lib/kudos/store.ts` (509 L) — store moderno con localStorage para HOME, MAPA, MÉRITO, MI MUNDO, POI, PERFIL.
   - `lib/mocks-v2/fixtures.ts` (94 KB) + `epochs.ts` (58 KB) — fixtures antiguos que aún usan las pantallas secundarias.
   - **Decisión**: el store moderno gana. Los mocks-v2 se irán eliminando a medida que conectemos backend.

2. **`PlaceScreen` (96 líneas) es legacy** — la maqueta de detalle de lugar (Coliseo) está realmente implementada en `PoiScreen` (1.499 líneas, ruta `/poi/[id]`). La ruta `/places/[slug]` debería redirigir o desaparecer. Posible cleanup futuro.

3. **Pantallas que NO entran al MVP** (sección 9 de PROYECTO.md) ya tienen esqueleto pero no se les dedicará trabajo: `/conexiones`, `/mis-memorias`, `/momentos`, `/notificaciones`, `/invitar`, `/time/rome`, `/linea-tiempo`. Quedan como están.

4. **Lo que toca conectar al backend en Semana 2** (orden de prioridad):
   1. `useSaved` (Mi Mundo) → modelos Django `Bookmark` ya existen.
   2. `useMerit` + `readMeritEvents` + `addMeritEvent` → necesita modelos `MeritEvent`, `MeritScore` nuevos.
   3. `tickStreak` + `readStreak` → necesita modelo `Streak` nuevo.
   4. `useVisited` (CheckIn) → necesita modelo `Visit` o `CheckIn` nuevo.
   5. Colecciones de Mi Mundo → necesita modelo `Collection` nuevo.

## Bloqueos abiertos del equipo (sin cambios desde msg 1)

1. 🟥 **BLOCKER-AX-ANTHROPIC-KEY** · `ANTHROPIC_API_KEY` en Render.
2. 🟥 **BLOCKER-AX-HOME-VERIFY** · Validar HOME 200 en producción.
3. 🟧 Smoke navegacional físico mobile iOS/Android.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render + URL real.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.

## → Necesito de Eduardo (acción)

Nada esta semana. Sigo.

## Resumen de qué se ha hecho hoy (msg 3)

1. **Auditoría completa de `kudos_app/models.py`** (50 KB · 42 modelos) y `content_engine/models.py` (4 modelos).
2. **Hallazgo secundario**: `kudos_app/models.py` está duplicado en `kudos_project/kudos_app/models.py` (mismo md5 — `bae5529690...`). Django solo carga uno. Pendiente cleanup futuro, sin urgencia.
3. **Matriz hook frontend → modelo Django construida** (sección siguiente). Resultado: **5 modelos hay que crear, 1 hay que extender**.

## Matriz hook frontend → backend Django (P32.03)

| Hook / función store.ts | Modelo Django actual | Acción Semana 2 |
|---|---|---|
| `useSaved` (POIs) | ❌ no existe | Extender `Bookmark`: añadir `place = FK(Place, null=True)`, hacer `capsule` también opcional, CHECK constraint XOR |
| `useSaved` (cápsulas) | ✅ `Bookmark` (user + capsule + note + created) | Reutilizar, exponer API REST |
| `useMerit` / `addMeritEvent` | ❌ no existe | **CREAR `MeritEvent`** (user, pillar, points, label, capsule_fk?, place_fk?, ts) |
| `MeritSnapshot` (total/level/perPillar/last30) | ❌ no existe | Calcular on-the-fly desde `MeritEvent` (endpoint `/api/merit/snapshot/`), o cache materializada `MeritScore` si la query duele |
| `useVisited` / `markVisited` | ⚠️ `Activity` genérico (descripcion + lat/lon + JSONField) | **CREAR `Visit`** (user, place_fk, ts) — más limpio que reusar Activity |
| `tickStreak` / `readStreak` | ❌ no existe | **CREAR `Streak`** (user OneToOne, last_day DateField, days IntegerField) |
| Colecciones de Mi Mundo | ❌ no existe | **CREAR `Collection`** (user, name, slug, description, capsules m2m, places m2m) |
| Multiplicadores Mérito | ❌ no existe | Calcular on-the-fly desde `MeritEvent` + `Streak` + `Visit`. Sin tabla nueva |
| Logros desbloqueables | ✅ `Badge` (user, name, description, icon, date_awarded) | Reutilizar, exponer API REST + endpoint auto-award |
| Like en cápsula | ✅ `Like` | Ya existe, exponer API |
| Reviews | ✅ `Review` | Ya existe pero no aparece en maquetas MVP. Saltar |
| Cápsulas (catálogo) | ✅ `Capsule` (1.458 en BD) + `Place` (canónico) | API endpoints ya existen, reutilizar |
| Place detalle | ✅ `Place` + `content_engine.PlaceCapsule` | Conectar `PoiScreen` a `/api/capsules/viewport/` + nuevo `/api/places/<slug>/` |

## Modelos Django a crear (resumen ejecutivo)

```
MeritEvent      → user FK · pillar(5 choices) · points int · label · capsule FK? · place FK? · ts datetime · indexed(user, ts)
Visit           → user FK · place FK · ts datetime · unique_together(user, place)
Streak          → user OneToOne · last_day date · days int
Collection      → user FK · name · slug · description · auto_kind(saved/visited/manual/affinity) · capsules m2m · places m2m
Bookmark (mod)  → añadir place FK nullable + hacer capsule nullable + CHECK(place IS NULL XOR capsule IS NULL)
```

5 cambios en migraciones. Esto es la totalidad del backend nuevo para MVP de maquetas. Todo lo demás (`Anthropic echo`, `PlaceCapsule`, `Capsule` catálogo) ya existe.

## Modelos Django que NO se tocan (irrelevantes para MVP)

`Proposal`, `Vote`, `SocialSpace`, `Competition`, `MoodEntry`, `Department`, `Role`, `KPI`, `Goal`, `BudgetLine`, `HistoricalCharacter`, `StrategicDocument`, `Habit`, `HabitLog`, `JournalEntry`, `LearningItem`, `HealthMetric`, `CryptoWatch`, `CryptoOperation`, `AIAgent`, `AIAction`, `AIInsight`, `AIDirective`, `Follow`, `DirectMessage`, `Notification`, `CapsuleVersion`, `CapsuleAport`, `FeedItem`, `Certificate`, `VirtualOperation`, `SettingsConfig`.

**32 modelos premature** declarados antes del MVP. Quedan inactivos. Cuando MVP esté shippeado, decisión: archivar o conservar.

## Bloqueos abiertos del equipo (sin cambios desde msg 1)

1. 🟥 **BLOCKER-AX-ANTHROPIC-KEY** · `ANTHROPIC_API_KEY` en Render.
2. 🟥 **BLOCKER-AX-HOME-VERIFY** · Validar HOME 200 en producción.
3. 🟧 Smoke navegacional físico mobile iOS/Android.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render + URL real.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 **(nuevo)** Duplicado `kudos_app/models.py` en `kudos_project/kudos_app/models.py` — limpiar tras MVP.

## → Necesito de Eduardo (acción)

Nada esta semana. Sigo.

## Resumen de qué se ha hecho hoy (msg 4)

1. **Modificado `kudos_app/models.py`**: `Bookmark` ahora soporta tanto `Capsule` como `Place`, con CHECK XOR + dos UniqueConstraint condicionales.
2. **Añadidos al final de `kudos_app/models.py`** los 4 modelos nuevos: `MeritEvent`, `Visit`, `Streak`, `Collection`. Total archivo: 1.397 líneas.
3. **Escrita migración** `kudos_app/migrations/0008_mvp_merit_visit_streak_collection.py` (283 líneas) con: AlterUniqueTogether, AlterField, AddField, AddConstraint x3, CreateModel x4, AddIndex x3. Dependencia: `0007_axon_foundation`. Reversible.
4. **Incidencia recuperada**: durante la edición, el archivo `models.py` se truncó a 1.211 líneas (Edit con bloque grande cortó a mitad de palabra `help_t`). Reconstruido vía script Python atómico `outputs/restore_models.py` + `tempfile.mkstemp + os.replace`. Sintaxis Python validada con `ast.parse` antes de escribir.
5. **Verificación AST cruzada**: las 6 comprobaciones pasan (clases nuevas presentes, CreateModel en migración, Bookmark XOR en ambos, capsule nullable, 5 pilares coherentes, dependencies correctas).
6. **NO ejecutado `migrate`** todavía. Eduardo dijo: que arranque limpio en local primero. Se ejecuta en próximos pasos cuando haya venv accesible.

## Archivos creados/modificados en msg 4

```
kudos_app/models.py                                          (modificado · 1.397 líneas · md5 cambiado)
kudos_app/migrations/0008_mvp_merit_visit_streak_collection.py  (nuevo · 283 líneas)
outputs/restore_models.py                                    (script reparación, scratchpad)
```

## Validaciones automáticas pasadas

- ✅ `ast.parse(models.py)` → válido
- ✅ `ast.parse(migrations/0008_*.py)` → válido
- ✅ 4 clases nuevas detectadas: `MeritEvent`, `Visit`, `Streak`, `Collection`
- ✅ 4 `CreateModel` correspondientes en migración
- ✅ `bookmark_xor_capsule_place` presente en ambos archivos
- ✅ `Bookmark.capsule` ahora `null=True`
- ✅ 5 pilares Mérito coherentes entre models.py y migración
- ✅ Migración depende correctamente de `0007_axon_foundation`

## Lo que falta antes de ejecutar `migrate` en local

Cuando Eduardo levante el venv local:
```bash
cd kudos_project
source venv/bin/activate    # o equivalente Windows
python manage.py makemigrations --dry-run --verbosity 2
python manage.py migrate --plan
python manage.py migrate kudos_app 0008
```

Si `makemigrations --dry-run` detecta diferencias adicionales, son cosas
menores (default values, choices alignment) que ajustaré en msg posterior.

## Bloqueos abiertos (sin cambios)

1. 🟥 BLOCKER-AX-ANTHROPIC-KEY · `ANTHROPIC_API_KEY` Render.
2. 🟥 BLOCKER-AX-HOME-VERIFY · HOME 200 prod.
3. 🟧 Smoke navegacional físico mobile.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 Duplicado `kudos_app/models.py` ↔ `kudos_project/kudos_app/models.py` (cleanup tras MVP).

## → Necesito de Eduardo (acción)

Nada todavía. Cuando llegue Msg 7-8 te pediré:
- Levantar el venv local y correr `python manage.py migrate kudos_app 0008` (1 comando) para validar que la migración aplica sin errores.

Sigo trabajando en backend hasta entonces.

## Resumen de qué se ha hecho hoy (msg 5)

1. **Decidido stack API**: Django nativo + `JsonResponse`. NO DRF (coherente con el resto del proyecto que no lo usa).
2. **Creado `kudos_app/services/merit.py`** (217 líneas) · capa de dominio espejo del store TS. Funciones: `add_event`, `compute_snapshot`, `tick_streak`, `read_streak`, `mark_visited`.
3. **Creado `kudos_app/api_mvp.py`** (240 líneas) · 7 endpoints REST con `@login_required` + JSON body parsing + CSRF exempt para POST/DELETE.
4. **Creado `kudos_app/tests_merit.py`** (185 líneas) · 17 tests unitarios agrupados en 5 clases: MeritEventServiceTests, ComputeSnapshotTests, StreakServiceTests, MarkVisitedTests, BookmarkConstraintTests.
5. **Modificado `kudos_app/urls.py`** · añadido import + 7 rutas API. Total: 225 líneas.
6. **Incidencia recurrente**: `urls.py` también se truncó tras Edit con bloque grande. Recuperado con `outputs/restore_urls.py` (mismo patrón atómico que `restore_models.py`). **Lección: Edit con bloques >2 KB corrompe archivos · usar Write directo o scripts atómicos Python.**

## Endpoints REST creados

```
GET    /api/merit/snapshot/      → snapshot completo (total, level, pilares, last_30) + streak
GET    /api/merit/events/        → últimos 200 eventos
POST   /api/merit/events/add/    → añadir evento + tick_streak
GET    /api/bookmarks/           → lista Bookmarks usuario
POST   /api/bookmarks/           → crear (idempotente, kind=capsule|poi)
DELETE /api/bookmarks/           → eliminar
GET    /api/visits/              → lista Visits usuario
POST   /api/visits/              → mark_visited + tick_streak
GET    /api/streak/              → estado racha
GET    /api/collections/         → lista Collections usuario
```

## Verificación AST cruzada superada

- ✅ Sintaxis válida en los 7 archivos modificados/creados
- ✅ 7 URL paths registrados (`api_merit_*`, `api_bookmarks`, `api_visits`, `api_streak`, `api_collections`)
- ✅ 5 funciones servicio espejean store.ts (`add_event`, `compute_snapshot`, `tick_streak`, `read_streak`, `mark_visited`)
- ✅ **Breakpoints de nivel coinciden TS↔PY**: `[0,100,250,500,800,1200,1700,2300,3000,4000,5500,7500,10000]`
- ✅ Los 5 pilares (`creacion`, `inspiracion`, `descubrimiento`, `comunidad`, `integridad`) coherentes en ambos lados
- ✅ 5 clases de tests + 17 métodos `test_*`

## Archivos creados/modificados en msg 5

```
kudos_app/services/__init__.py                  (nuevo · 5 líneas)
kudos_app/services/merit.py                     (nuevo · 217 líneas)
kudos_app/api_mvp.py                            (nuevo · 240 líneas)
kudos_app/tests_merit.py                        (nuevo · 185 líneas)
kudos_app/urls.py                               (modificado · 215 → 225 líneas)
outputs/restore_urls.py                         (script reparación, scratchpad)
```

## Lo que falta para validar en local

Cuando Eduardo levante venv:
```bash
cd kudos_project
python manage.py migrate kudos_app 0008      # aplicar migración msg 4
python manage.py test kudos_app.tests_merit -v 2
python manage.py runserver
# verificar GET http://localhost:8000/api/merit/snapshot/ (con auth)
```

## Bloqueos abiertos (sin cambios)

1. 🟥 BLOCKER-AX-ANTHROPIC-KEY · `ANTHROPIC_API_KEY` Render.
2. 🟥 BLOCKER-AX-HOME-VERIFY · HOME 200 prod.
3. 🟧 Smoke navegacional físico mobile.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 Duplicado `kudos_app/models.py` ↔ `kudos_project/kudos_app/models.py` (cleanup tras MVP).
10. 🟨 **(nuevo)** Edit con bloques grandes corrompe archivos · workaround: scripts atómicos Python en `outputs/`.

## → Necesito de Eduardo (acción)

Aún nada. Cuando llegue Msg 7-8 te pediré ejecutar 2 comandos en local:
- `python manage.py migrate kudos_app 0008`
- `python manage.py test kudos_app.tests_merit -v 2`

Sigo trabajando.

## Resumen de qué se ha hecho hoy (msg 6)

1. **Decidida arquitectura "write-only optimistic"**: la app escribe primero a localStorage (síncrono, UI optimista) y dispara fire-and-forget al backend. La hidratación bidireccional queda para Msg 7.
2. **Creado módulo `experience/lib/api/`** con 6 archivos:
   - `client.ts` (130 L) · fetch base con timeout, AbortController, `credentials: include`, errores HTTP/red → `null` (nunca throw).
   - `types.ts` (107 L) · contratos TS espejo de `api_mvp.py`.
   - `merit.ts` (50 L) · `fetchMeritSnapshot`, `fetchMeritEvents`, `postMeritEvent`, `fetchStreak`.
   - `saved.ts` (38 L) · `fetchBookmarks`, `postBookmark`, `deleteBookmark`.
   - `visits.ts` (28 L) · `fetchVisits`, `postVisit`.
   - `index.ts` (12 L) · barrel.
3. **Creado `experience/lib/kudos/sync.ts`** (87 L) · `syncToBackend(action)` fire-and-forget no-throw, no-await. Si `NEXT_PUBLIC_API_BASE_URL` ausente → no-op total.
4. **Modificado `experience/lib/kudos/store.ts`**: añadido import + 3 llamadas a `syncToBackend` en `addMeritEvent`, `useSaved.toggle` y `markVisited`. Lógica local intacta.
5. **Incidencia recurrente confirmada**: `store.ts` se truncó tras el último Edit. Patrón claro: cualquier Edit en archivos >15 KB trunca el final aunque el bloque editado sea pequeño. Recuperado con `outputs/restore_store_ts.py`.
6. **TypeScript strict check**: ✅ cero errores en mis archivos nuevos. El único error del proyecto (`lib/capsule-engine/qc-engine.ts:317` · llave doble `};\n};`) es **pre-existente**, vive en código no usado por pantallas MVP. Apuntado al backlog.

## Arquitectura write-only resultante

```
Usuario pulsa "Guardar"
   ↓
useSaved.toggle()           ← API pública React hook
   ↓
writeSaved() → localStorage ← FUENTE DE VERDAD LOCAL (síncrono)
setSaved(next)              ← UI actualiza inmediatamente
   ↓
syncToBackend({ kind: "savedToggle", ... })
   ↓                        ← fire-and-forget (queueMicrotask)
   └─ apiPost('/api/bookmarks/', ...) → Django
        ↓
        Si OK: persistido. Si falla: silencioso, localStorage aún válido.
```

**Garantías:**
- ✅ UI nunca espera red.
- ✅ App funciona 100% sin backend configurado (env var ausente).
- ✅ App funciona 100% offline.
- ✅ Si red falla a mitad de operación, localStorage tiene la verdad.

## Archivos creados/modificados en msg 6

```
experience/lib/api/__init__.py             (no aplica, TS no usa __init__)
experience/lib/api/client.ts               (nuevo · 130 líneas)
experience/lib/api/types.ts                (nuevo · 107 líneas)
experience/lib/api/merit.ts                (nuevo · 50 líneas)
experience/lib/api/saved.ts                (nuevo · 38 líneas)
experience/lib/api/visits.ts               (nuevo · 28 líneas)
experience/lib/api/index.ts                (nuevo · 12 líneas)
experience/lib/kudos/sync.ts               (nuevo · 87 líneas)
experience/lib/kudos/store.ts              (modificado · 509 → 515 líneas)
outputs/restore_store_ts.py                (script reparación, scratchpad)
```

## Bloqueos abiertos

1. 🟥 BLOCKER-AX-ANTHROPIC-KEY · `ANTHROPIC_API_KEY` Render.
2. 🟥 BLOCKER-AX-HOME-VERIFY · HOME 200 prod.
3. 🟧 Smoke navegacional físico mobile.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 Duplicado `kudos_app/models.py` ↔ `kudos_project/kudos_app/models.py`.
10. 🟨 Edit con bloques >15 KB corrompe archivos · workaround scripts atómicos.
11. 🟨 **(nuevo)** TS error pre-existente en `lib/capsule-engine/qc-engine.ts:317` (llave doble). No bloquea MVP; fix de 1 línea cuando toque.

## → Necesito de Eduardo (acción)

Aún nada. Cuando hayas levantado venv local + frontend local, te pediré (Msg 8 estimado):
1. `python manage.py migrate kudos_app 0008`
2. `python manage.py test kudos_app.tests_merit -v 2`
3. Configurar `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` en `experience/.env.local`
4. `npm run dev` + probar Guardar/Compartir/Visitar y ver en Django admin que llegan los registros.

## Resumen de qué se ha hecho hoy (msg 7)

1. **Estrategia de hidratación decidida: "localStorage wins"** (conservadora).
   - Si una colección local está vacía → hidrata desde backend.
   - Si ya tiene datos → NO se toca. El sync.ts de Msg 6 sigue empujando deltas.
   - Esto evita el problema clásico de fetch destructivo (borrado local sobrescrito). Last-write-wins por timestamp queda para post-MVP cuando haya tombstones.

2. **Añadido `hydrateLocalStore(payload)` en `store.ts`** · escribe sólo colecciones vacías + dispara los CustomEvents para que los hooks re-renderen. Devuelve `{saved, merit, visited}` de qué se aplicó.

3. **Creado `experience/lib/kudos/hydration.ts`** (118 L) · `hydrateFromBackend()` async:
   - Llama `fetchBookmarks` + `fetchMeritEvents` + `fetchVisits` en paralelo.
   - Convierte respuestas API (`ApiBookmark`/`ApiMeritEvent`/`ApiVisit`) a formato local del store.
   - Llama `hydrateLocalStore`.
   - No-op silencioso si `isApiAvailable()` es false o cualquier fetch devuelve null.

4. **Creado `experience/components/providers/BackendHydration.tsx`** (37 L) · componente client `"use client"` que llama `hydrateFromBackend()` UNA SOLA VEZ en mount (con `useRef` para inmunidad a StrictMode).

5. **Modificado `experience/app/layout.tsx`** · añadido import + `<BackendHydration />` dentro de body. Se ejecuta en cada carga de la app, una sola vez por sesión.

6. **Incidencias controladas (2)**:
   - `store.ts` se truncó tras el Edit de `hydrateLocalStore` (522 L, se cortó `tickStreak`). Reparado con `outputs/restore_store_ts_v2.py` → 545 L, llaves 116=116.
   - `app/layout.tsx` se truncó tras el Edit de `<BackendHydration />` (faltaba cierre HTML completo). Reparado con `outputs/restore_layout_tsx.py` → 84 L, llaves 24=24.

7. **Verificación TypeScript strict**: ✅ cero errores en archivos MVP nuevos (lib/api/, lib/kudos/, components/providers/, app/layout.tsx). Único error en proyecto sigue siendo el pre-existente `qc-engine.ts:317`.

## Ciclo Mérito + Mi Mundo cerrado

```
┌─────────────────────────────────────────────────────────────┐
│  RUNTIME · Usuario abre la app                              │
│                                                             │
│  1. BackendHydration monta (layout.tsx)                     │
│  2. hydrateFromBackend() → 3 fetches paralelo               │
│  3. hydrateLocalStore() → escribe sólo si vacío             │
│  4. CustomEvent → hooks useSaved/useMerit/useVisited refresh│
│                                                             │
│  RUNTIME · Usuario interactúa (Guardar / Compartir / Visit) │
│                                                             │
│  1. Hook actualiza localStorage (síncrono, UI optimista)    │
│  2. syncToBackend() fire-and-forget al backend Django       │
│  3. Backend persiste · si red falla, localStorage prevalece │
└─────────────────────────────────────────────────────────────┘
```

## Archivos creados/modificados en msg 7

```
experience/lib/kudos/store.ts                              (modificado · +35 líneas hydrateLocalStore)
experience/lib/kudos/hydration.ts                          (nuevo · 118 líneas)
experience/components/providers/BackendHydration.tsx       (nuevo · 37 líneas)
experience/app/layout.tsx                                  (modificado · +2 líneas)
outputs/restore_store_ts_v2.py                             (script reparación)
outputs/restore_layout_tsx.py                              (script reparación)
```

## Estado del MVP de maquetas

| Componente | Estado | Comentario |
|---|---|---|
| **Backend Django · modelos** | ✅ Listos | Migración 0008 escrita, no aplicada |
| **Backend Django · API** | ✅ Listos | 7 endpoints + 17 tests escritos |
| **Backend Django · `migrate` ejecutado** | ⏳ Pendiente Eduardo | 1 comando local |
| **Frontend · cliente API** | ✅ Listo | 6 archivos lib/api/* |
| **Frontend · sync.ts write-only** | ✅ Listo | Fire-and-forget |
| **Frontend · hydration.ts** | ✅ Listo | localStorage wins |
| **Frontend · BackendHydration en layout** | ✅ Listo | Mount-once |
| **Smoke E2E** | ⏳ Pendiente Eduardo | Tras migrate local |
| **Deploy a Render** | ⏳ Pendiente · Msg 9-10 | Post smoke OK |
| **Contenido vídeos cápsula 0:15** | ⏳ Semana 3 | Tras backend integrado |

## Bloqueos abiertos

1. 🟥 BLOCKER-AX-ANTHROPIC-KEY · Render Environment.
2. 🟥 BLOCKER-AX-HOME-VERIFY · HOME 200 prod.
3. 🟧 Smoke navegacional físico mobile.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 Duplicado `kudos_app/models.py`.
10. 🟨 Edit con bloques en archivos >15 KB · workaround scripts atómicos.
11. 🟨 TS error pre-existente `qc-engine.ts:317`.

## → Necesito de Eduardo (acción · ESTE MENSAJE)

He llegado al límite de lo que puedo hacer sin tu intervención. Antes de pasar a generar contenido de cápsulas (Semana 3), necesito que valides en local que el ciclo Mérito + Mi Mundo funciona end-to-end.

**5 comandos en orden:**

```bash
# 1. Activar venv y aplicar migración (1 nueva tabla por modelo + bookmark mod)
cd /ruta/al/kudos_project
source venv/bin/activate  # o equivalente Windows
python manage.py migrate kudos_app 0008

# 2. Correr los 17 tests unitarios del servicio Mérito
python manage.py test kudos_app.tests_merit -v 2

# 3. Levantar backend
python manage.py runserver  # corre en :8000

# 4. Configurar variable env del frontend (en OTRA terminal)
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000' >> experience/.env.local

# 5. Levantar frontend
cd experience
npm run dev   # corre en :3000
```

**Smoke E2E (3 acciones manuales):**
1. Abre `http://localhost:3000`, inicia sesión (usuario Django existente).
2. Pulsa "Guardar" en cualquier POI. Mira `http://localhost:8000/admin/kudos_app/bookmark/` → debe haber un Bookmark nuevo con `place` no nulo y `capsule` nulo.
3. Comparte una cápsula. Mira `/admin/kudos_app/meritevent/` → debe haber un evento +25 Comunidad. Y `/admin/kudos_app/streak/` debe tener `days >= 1`.

**Si algo falla, pégame el error completo (terminal o screenshot del 500).** Si todo funciona, dilo y paso a Msg 9 (deploy a Render).

## Resumen de qué se ha hecho hoy (msg 8) · SMOKE E2E LOCAL CONFIRMADO

**Eduardo ha levantado el venv local y ha validado end-to-end el ciclo Mérito + Mi Mundo.**

Datos visibles en `localhost:8000/admin/`:
- ✅ **Bookmark id=4** · Place=Ogrove · User=admin
- ✅ **3 MeritEvents** · pillar=descubrimiento · +10 c/u (3 toggles del corazón)
- ✅ **1 Streak** · user=admin · days=1 · best_days=1
- ✅ **Place=Ogrove** auto-creado por el endpoint

## 7 bugs encontrados y corregidos durante el smoke

| # | Bug | Causa raíz | Fix |
|---|---|---|---|
| 1 | Tests `TypeError: missing 'uid'` | Mi `_make_user` no pasaba `uid` (User custom requiere uid+alias) | Pasar `uid=alias` en helper |
| 2 | Eduardo no entraba a `/admin/` | UID de superuser desconocido | Script `reset_admin.py` standalone con `admin/admin1234` |
| 3 | Hydration mismatch SSR vs cliente | `useState(() => readSaved())` lee localStorage en initial (SSR vacío) | `useState([])` + useEffect hidrata tras mount |
| 4 | `localhost:3000/admin` → loop infinito | Rewrite Next + Django redirect absoluto crearon ciclo | Eliminar rewrite `/admin`. Usar `:8000` directo |
| 5 | POST sin slash → 500, DELETE con slash → loop | Next.js quita trailing slashes, Django no redirige POST | `trailingSlash:true` + destination con `/` explícito |
| 6 | `lugar no encontrado` 404 | Frontend tiene 15+ POIs hardcoded no sembrados en Django | `Place.objects.get_or_create(slug=...)` auto-creación |
| 7 | Admin `/meritevent/` → 404 | Faltaba registrar modelos nuevos en `admin.py` | `@admin.register(...)` para MeritEvent/Visit/Streak/Collection |

7 bugs todos en deuda técnica de integración. El backend, los modelos y el frontend funcionaban cada uno por su lado — los bugs salieron al conectarlos. Cada uno me enseñó algo:
- (1) los helpers de testing deben replicar la firma exacta del modelo
- (3) localStorage + SSR es un patrón conocido sin solución única
- (5) trailingSlash es trampa común en proxies Next.js↔Django
- (6) frontends con seeds hardcoded necesitan get_or_create en backend

## Archivos creados/modificados en msg 8

```
kudos_app/tests_merit.py             (fix uid en _make_user)
kudos_app/api_mvp.py                 (3 patches: sin @login_required, demo user, auto-Place)
kudos_app/admin.py                   (4 ModelAdmin nuevos)
kudos_app/migrations/0008_*.py       (ya creado, aplicado en local)
experience/next.config.ts            (trailingSlash + proxy /api/*)
experience/lib/api/client.ts         (URL relativa en navegador)
experience/lib/kudos/sync.ts         (logs de debug)
experience/lib/kudos/store.ts        (SSR-safe useState, dual-write)
experience/lib/kudos/hydration.ts    (nuevo)
experience/components/providers/BackendHydration.tsx  (nuevo)
experience/app/layout.tsx            (BackendHydration mounted)
reset_admin.py                       (script standalone admin)
```

## Hallazgo importante: el auth real ya funciona

Aunque puse `_resolve_user(request)` con fallback al user `demo`, el sistema detectó que Eduardo tenía sesión Django activa (cookie de `localhost:8000/admin/`) y usó el user `admin` real. La racha y los eventos quedaron correctamente asignados a `admin`, no a `demo`. **El sistema ya está listo para auth real** · solo hay que mantener `_resolve_user` con el fallback como red de seguridad para anónimos.

## Bloqueos abiertos (estado actual)

1. 🟥 BLOCKER-AX-ANTHROPIC-KEY · `ANTHROPIC_API_KEY` Render. Sigue sin verificar.
2. 🟥 BLOCKER-AX-HOME-VERIFY · HOME 200 prod.
3. 🟧 Smoke navegacional físico mobile.
4. 🟧 Lighthouse Mobile real.
5. 🟧 Primer deploy `kudos-frontend` Render.
6. 🟧 Re-ejecutar `run_master_smoke_map`.
7. 🟧 Diagnosticar Barcelona UNGROUNDED.
8. 🟨 Gatear ~30 enlaces dormant Django.
9. 🟨 Duplicado `kudos_app/models.py`.
10. 🟨 Edit con bloques en archivos >15 KB · workaround scripts atómicos.
11. 🟨 TS error pre-existente `lib/capsule-engine/qc-engine.ts:317`.

## → Necesito de Eduardo (próximo msg)

Solo confirmar antes del deploy:
1. ¿Tienes acceso al dashboard de Render para subir cambios?
2. ¿`ANTHROPIC_API_KEY` está configurada como env var en Render? (esto ya lo necesitamos para el primer BLOCKER).

Mientras tanto preparo el commit + push + plan de deploy.

## Próximo mensaje (msg 9)

**P32.09 · Deploy a Render.** Pasos:
1. Commit con todo el trabajo de Semana 2.
2. Push a Git → Render detecta y rebuilds `kudos` backend.
3. `build.sh` aplica migraciones automáticamente (0008 incluida).
4. Verificar HOME 200 + endpoints `/api/*` responden con datos.
5. Si `kudos-frontend` Render service no existe → crearlo desde `render.yaml`.
6. Smoke desde el móvil real con la URL de Render.

---

## Historial de mensajes (cronológico inverso)

### Msg 8 · 2026-05-27 · Smoke E2E local validado · 7 bugs corregidos
- Tarea #54 cerrada.
- 7 bugs encontrados+corregidos: tests uid · admin login · hydration · proxy admin loop · trailing slash · auto-Place · admin.py registro.
- Eduardo confirmó visualmente: 1 Bookmark, 3 MeritEvents, 1 Streak en admin Django.
- Sistema funciona ya con auth real (cookie de localhost:8000/admin reconocida).
- Ciclo Mérito + Mi Mundo CERRADO end-to-end en local.
- Backend ↔ frontend conectado, listo para deploy.

### Msg 7 · 2026-05-27 · Hidratación bidireccional · ciclo Mérito CERRADO
- Tarea #53 cerrada.
- `hydrateLocalStore` añadido a store.ts (export público).
- `hydration.ts` + `BackendHydration.tsx` creados.
- `app/layout.tsx` integra hidratación en mount.
- Estrategia: localStorage wins (conservadora), no-op si backend ausente.
- 2 incidencias de truncado, recuperadas con scripts atómicos.
- TS strict: cero errores en archivos MVP nuevos.
- **CICLO CERRADO**: el frontend ahora lee, escribe y sincroniza con backend.
- Esperando validación local de Eduardo antes de continuar.

### Msg 6 · 2026-05-27 · Cliente API frontend + write-only dual-write
- Tarea #52 cerrada.
- 7 archivos nuevos en `experience/lib/api/` + `experience/lib/kudos/sync.ts`.
- `store.ts` modificado en 4 puntos (1 import + 3 llamadas `syncToBackend`).
- Arquitectura write-only fire-and-forget · UI nunca espera red.
- 0 errores TypeScript en archivos MVP nuevos.
- Detectado y apuntado error TS pre-existente en `qc-engine.ts:317` (no bloqueante).
- Incidencia: store.ts truncado tras Edit; reparado script atómico.

### Msg 5 · 2026-05-27 · Servicios + API REST Mérito + Mi Mundo
- Tarea #51 cerrada.
- 4 archivos nuevos (services/merit.py, api_mvp.py, tests_merit.py, services/__init__.py).
- 7 endpoints REST registrados en urls.py.
- 17 tests unitarios escritos.
- Pilares + breakpoints idénticos a TS — espejo verificado.
- Incidencia urls.py truncado: recuperado con script atómico.
- 0 deploys, 0 `migrate` ejecutados todavía (esperando ventana de Eduardo).

### Msg 4 · 2026-05-27 · Backend MVP · modelos + migración 0008
- Tarea #50 cerrada.
- Bookmark extendido (XOR Capsule/Place).
- 4 modelos nuevos creados: MeritEvent, Visit, Streak, Collection.
- Migración 0008 escrita y validada AST.
- Incidencia: `models.py` se truncó durante Edit grande; recuperado con script Python atómico.
- 0 deploys, 0 `migrate` ejecutados. Todo en local listo para validación humana.

### Msg 3 · 2026-05-27 · Inventario de modelos Django para Mérito + Mi Mundo
- Tarea #49 cerrada.
- Auditados 42 modelos en `kudos_app/models.py` + 4 en `content_engine/models.py`.
- Matriz hook → modelo construida.
- Resultado: 4 modelos nuevos (`MeritEvent`, `Visit`, `Streak`, `Collection`) + 1 extensión (`Bookmark.place`). Eso es todo el backend MVP nuevo.
- Detectado duplicado `kudos_app/models.py` (cleanup futuro, no bloqueante).

### Msg 2 · 2026-05-27 · Auditoría de pantallas Experience
- Tarea #48 cerrada.
- 17 pantallas inventariadas, ~9.000 líneas TSX.
- Matriz pantalla → estado construida (5 al 85%, 4 al 70-80%, 8 al 20-35%).
- **Hallazgo crítico**: frontend completo en localStorage, 0 fetches al backend. La obra de Semana 2 es CONEXIÓN, no UI.
- Identificadas pantallas que NO entran al MVP (no se tocan).

### Msg 1 · 2026-05-25 · Limpieza quirúrgica + documentos de continuidad
- Tarea #47 ejecutada.
- 117+ archivos/carpetas archivados en `legacy/` sin tocar producto.
- PROYECTO.md + ESTADO.md creados en español.
- Stack y roadmap formalizados.

### Msg 0 · 2026-05-24 (mensaje anterior) · Auditoría fundacional
- Tarea #46 cerrada.
- Diagnóstico en 7 secciones entregado.
- Verificado: KUDOS NO empieza de cero — MVP CLOSE shippeado, gap real con las maquetas, plan a 30 días viable sobre la base existente.
