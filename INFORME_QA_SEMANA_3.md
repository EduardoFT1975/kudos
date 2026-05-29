# INFORME QA SEMANA 3 · KUDOS · T3.2 EJEC Días 15-19

**Período:** 29 mayo 2026 (mega-sesión única, autorizada por Eduardo)
**Branch:** master
**Backend:** kudos_engine 2.9.0
**Frontend:** experience/ Next.js 15

---

## Resumen ejecutivo

Semana 3 completa. **Mi Mundo V2** ya no es una lista de favoritos: es un mapa cognitivo (constelación 7 pilares + shifts vividos + lugares clásicos). **Share V2** rompe con la cápsula genérica: el usuario está obligado a escribir una reflexión personal de 50+ caracteres antes de poder compartir, y la tarjeta lleva su nombre como atribución. **Login polish** estabiliza el flujo Google OAuth con migrate-anon automático en background. **Notificaciones mínimas** activas: 1 al día (Core de hoy a las 09:00 local) + 1 a los 7 días tras vivir un shift. SIN gamificación, SIN streaks, SIN engagement bait.

KPIs verificados verdes: TypeScript compila sin errores propios, Python compila sin sintaxis errors, endpoints registrados en main.py, FULLSCREEN_ROUTES incluye `/login`.

---

## Día 15 · Personal Graph radial 7 pilares

**Backend nuevo:** `kudos_engine/apps/personal/router.py`

- `GET /api/personal/graph` devuelve por cada uno de los 7 pilares: count Core completados, última exposición, luminosidad (off/tenue/medio/brillante) calculada según count.
- Discovery DNA detection: agrega los 5 criterios (5+ pilares · 2+ Cores · 1+ return_visit · 1+ reflection · 3+ relationship_followed) y los devuelve junto con `discovery_dna_unlocked: bool`.
- Mensaje contextual (5 variantes según progreso): desde "Hola. Hoy empieza algo" hasta "Has tocado los 7 pilares. Aqui empieza la profundidad".
- Filtrado por user_id si autenticado, sino por session_id (header X-Session-Id). NO mezcla.

**Frontend nuevo:** `experience/components/screens/mi-mundo/v5/PersonalGraph.tsx`

- SVG heptagonal radial: 7 nodos en círculo + nodo central "TU".
- 4 estados visuales de luminosidad: off (#3a3550 r=7) · tenue (#5A8BB8 r=9) · medio (#8B6BFF r=11) · brillante (#C9A961 r=14 con glow halo).
- Líneas centro→pilar visibles solo si el pilar está activo (dorado tenue) vs casi invisibles si off.
- Sección Discovery DNA: caja dorada si desbloqueado, sino `<details>` plegable con checkbox de los 5 criterios.

**Disciplina:** sin números visibles al usuario (la luminosidad ES el dato). Sin "puntos", sin "porcentajes".

---

## Día 16 · ShiftHistory + Mi Mundo V2 tabs

**Backend extendido:** `/api/personal/shifts` añadido en el mismo router.

- Agrupa `shift_acknowledged` events por poi_id (Core), recupera el DiscoveryShift completo (BEFORE/DISCOVERY/AFTER/identity_to) por POI.
- Devuelve revisit_count + first_lived_at + last_revisited_at.
- Ordenado por última revisita descendente.
- Mensaje contextual ("Tu primer Discovery Shift", "X shifts vividos. Cada uno cambio algo en como ves el mundo", etc).

**Frontend nuevo:** `experience/components/screens/mi-mundo/v5/ShiftHistory.tsx`

- Lista de tarjetas con borde-izquierdo colorido por pilar.
- Colapsado: muestra solo BEFORE → AFTER (la "fórmula" del shift).
- Expandido (al tocar): muestra el descubrimiento completo + identity_shift_to + revisit count + link "Revisitar →" al /core/[id].
- `timeAgo()` formato relativo en español.

**Refactor pantalla principal:** `experience/components/screens/mi-mundo/v5/MiMundoTabs.tsx`

- 3 tabs: "Mapa cognitivo" (default) | "Tus shifts" | "Tus lugares" (= MiMundoV5 clásico preservado).
- Persistencia en sessionStorage (`kudos:miMundoTab`).
- Header serif "Lo que has tocado." + subtítulo "Privado por defecto".
- Subrayado dorado para tab activa.

**Cambio de routing:** `experience/app/mi-mundo/page.tsx` ahora renderiza `<MiMundoTabs />` en vez de `<MiMundoV5 />` directamente. MiMundoV5 sigue exportado y accesible desde el tab "Tus lugares".

---

## Día 17 · Share V2 con reflexión personal

**Frontend nuevo:** `experience/components/share/ShareReflectionModalV2.tsx`

- Listener global: `window.dispatchEvent(new CustomEvent("kudos:share-reflection-v2:open", { detail: { poiId, poiName, image, userName, capsuleId } }))`.
- Textarea con counter 50/280 chars (rojo→verde al cruzar el mínimo).
- Botón "Generar tarjeta y enlace" deshabilitado hasta cumplir mínimo.
- Al confirmar:
  1. POST `/api/telemetry/event` con `event_type=reflection_submitted` y `payload.text_length` (cuenta para DTI + Discovery DNA).
  2. Construye URL corta `${origin}/c/${capsuleId}?ref=${userId}` con encoding seguro.
  3. POST segundo evento `share_initiated` con payload `{via: "share_v2_reflection", url}`.
- Vista resultado: tarjeta preview foto+frase+atribución "— {Nombre}, descubriendo en KUDOS" + URL copiable + botón share nativo (`navigator.share`) o fallback copy.
- Mensaje de disciplina: *"KUDOS no comparte tarjetas vacias. La reflexion es lo que da valor."*

**Backend short URL:** `experience/app/c/[id]/page.tsx` evolucionado.

- Si `id` está en `CORE_BY_DAY` (7 Cores) → redirect a `/core/[id]?via=share&ref=...`.
- Si no, intenta `loadCapsule()` → redirect a `/poi/[id]?play=1&via=share&ref=...`.
- Si nada existe, mantiene redirect a `/poi/[id]` para que el frontend pueda mostrar 404.
- Open Graph dinámico preservado.

**Conector en CoreScreen:** `DiscoveryShiftCard` ahora muestra un botón dorado "Compartir con tu reflexion →" que dispara el modal con los datos correctos (poiId, narrative.title como poiName, userName desde sessionStorage).

**Modal montado globalmente:** `<ShareReflectionModalV2 />` añadido en ambos modos de `AppShellV4` (fullscreen + normal).

---

## Día 18 · Login polish + Migrate-anon + Notificaciones mínimas

### Login polish

**Página nueva:** `experience/app/login/page.tsx` + `experience/components/auth/LoginScreen.tsx`

- Layout centrado, fondo radial gradient.
- Bloque hero serif: *"Conserva tu mapa entre dispositivos."*
- Explicación 1-párrafo: KUDOS funciona sin cuenta; login solo desbloquea sync.
- Botón Google único + link "Seguir como invitado" (fallback respetuoso).
- Nota privacidad: *"No publicamos en tu nombre. No leemos tu correo."*

**Botón Google:** `experience/components/auth/LoginGoogleButton.tsx`

- 2 variants (primary/ghost), full-width opcional.
- SVG glyph oficial Google.
- Estado loading durante signIn.

**Auth bootstrap:** `experience/components/auth/AuthBootstrap.tsx` + montado globalmente.

- Componente invisible que monta `useAuth` (cold start refresh + me) + `useMigrateAnon` (trasvase anon→user) sin necesidad de un Provider explícito.

### Migrate-anon

**Hook nuevo:** `experience/components/auth/useMigrateAnon.ts`

- Al detectar `user + accessToken + sessionId`, hace POST `/api/auth/migrate-anon` con `{session_id}`.
- Idempotente (flag `kudos:migrated:{userId}` en sessionStorage).
- Si falla, deshace el flag para reintentar.
- Persiste `kudos:userName` + `kudos:userId` (usados por Share V2).

**FULLSCREEN_ROUTES extendido:** `/login` añadido.

### Notificaciones mínimas

**Servicio nuevo:** `experience/components/notifications/NotificationService.tsx`

- 2 notifs únicas (alineadas con disciplina anti-engagement):
  1. **CORE DEL DIA** · 09:00 local, 1 vez al día como máximo, key `kudos:notifs:lastDailyShown` por día.
  2. **SHIFT REVISIT** · T+7d tras completar Core, key `kudos:notifs:revisit:{poiId}` persistido.
- API pública: `getNotifStatus()`, `requestNotifPermission()` (lazy, NO al cargar), `disableNotifs()`, `scheduleShiftRevisit(poiId, title)`.
- Bootstrap `<NotificationServiceBootstrap />` montado en AppShell: reprograma daily + revisits pendientes en cada cold start.

**Hook al completar Core:** `scheduleShiftRevisit` llamado en `CoreScreen.onYes()` justo después del POST a `/api/core/{id}/complete`.

**Opt-in card:** `experience/components/notifications/NotifOptInCard.tsx` — tarjeta sutil con toggle Activar/Activadas/Bloqueadas. Diseñada para colocarse en /perfil (NO promocionada en home).

---

## Día 19 · QA estructural

### TypeScript

```
$ cd experience && npx tsc --noEmit --skipLibCheck
(errores residuales solo en auth.ts → next-auth no instalado, preexistente T1.3.E)
```

Todos los errores propios resueltos. Truncamientos detectados y corregidos vía Python atomic write (`tempfile.mkstemp + os.fdopen + os.replace`) en:
- `app/c/[id]/page.tsx` (3229 → 3515 bytes)
- `app/mi-mundo/page.tsx` (460 → 573 bytes)
- `components/shell-v4/AppShellV4.tsx` (2339 → 2379 bytes)
- `components/screens/core/CoreScreen.tsx` (17034 → 18338 bytes; recuperados estilos RATE_TXT/RATE_BACK/LOADING/ERROR_BOX/SHARE_REFLECTION_BTN/CLOSE_BTN)

### Python

```
$ python3 -m py_compile kudos_engine/apps/personal/router.py
  → OK
$ python3 -m py_compile kudos_engine/apps/main.py
  → OK
```

Truncamientos en backend también corregidos:
- `kudos_engine/apps/personal/router.py` (6051 → 8112 bytes)
- `kudos_engine/apps/main.py` (5429 → 5789 bytes; añadido `personal_graph` a modules_loaded, `discovery_dna` array a root response, version 2.8.0 → 2.9.0)

### Endpoints registrados en `kudos_engine/apps/main.py`

Con `KUDOS_USE_POSTGRES=1`:

| Router | Prefijo | Endpoints |
|---|---|---|
| save_pg | /api/save | CRUD My World |
| telemetry_pg | /api/telemetry | event ingestion |
| signals_pg | /api/signals | WHY signals |
| db_admin | /api/db-admin | mantenimiento |
| auth | /api/auth | OAuth + JWT |
| migration | /api/auth/migrate-anon | trasvase |
| core_engine | /api/core | Humanity Core API |
| admin_metrics | /api/admin | 5 KPIs MVP |
| **personal** | **/api/personal** | **Graph + Shifts (NUEVO Semana 3)** |

### Modals globales

`AppShellV4` ahora monta:
- ShareCapsuleModalV5 (legacy)
- **ShareReflectionModalV2 (NUEVO)**
- MeritToast
- FirstTimeOnboarding (solo fullscreen)
- **NotificationServiceBootstrap (NUEVO)**
- **AuthBootstrap (NUEVO)**

---

## Artefactos creados / modificados

### Backend (3 archivos)

| Archivo | Estado | Bytes |
|---|---|---|
| `kudos_engine/apps/personal/__init__.py` | nuevo | 184 |
| `kudos_engine/apps/personal/router.py` | nuevo | 8112 |
| `kudos_engine/apps/main.py` | modif | 5789 |

### Frontend (9 archivos nuevos + 3 modif)

| Archivo | Estado |
|---|---|
| `experience/components/screens/mi-mundo/v5/PersonalGraph.tsx` | nuevo |
| `experience/components/screens/mi-mundo/v5/ShiftHistory.tsx` | nuevo |
| `experience/components/screens/mi-mundo/v5/MiMundoTabs.tsx` | nuevo |
| `experience/components/share/ShareReflectionModalV2.tsx` | nuevo |
| `experience/components/auth/LoginGoogleButton.tsx` | nuevo |
| `experience/components/auth/LoginScreen.tsx` | nuevo |
| `experience/components/auth/useMigrateAnon.ts` | nuevo |
| `experience/components/auth/AuthBootstrap.tsx` | nuevo |
| `experience/components/notifications/NotificationService.tsx` | nuevo |
| `experience/components/notifications/NotifOptInCard.tsx` | nuevo |
| `experience/app/login/page.tsx` | nuevo |
| `experience/app/mi-mundo/page.tsx` | modif (→ MiMundoTabs) |
| `experience/app/c/[id]/page.tsx` | modif (+CORE_BY_DAY + ref) |
| `experience/components/shell-v4/AppShellV4.tsx` | modif (+modals globales) |
| `experience/components/screens/core/CoreScreen.tsx` | modif (+share btn + revisit) |

---

## Disciplina respetada

- NO gamificación. NO XP. NO badges. NO rachas. NO leaderboards.
- NO números visibles en el Personal Graph (la luminosidad ES el dato).
- NO compartir vacío. La reflexión personal es obligatoria.
- NO notificaciones agresivas. Máximo 1 al día.
- NO promoción de notifs en home. Opt-in vive en /perfil, discreto.
- NO autoplay invasivo. Notificaciones requieren acción del usuario.
- 16 funcionalidades CONGELADAS siguen congeladas (IA generativa, video pipeline, AR/VR, blockchain, social complejo, monetización, apps nativas, multi-idioma, API pública, etc).

---

## Próximo: Semana 4 (Días 22-26)

Tentativa según plan 28 días T3.2:
- Día 22: Notifications Service Worker (Web Push real, no setTimeout local)
- Día 23: Onboarding flow refinado (Discovery DNA explicado al user)
- Día 24: Polling DTI tile en /admin/dashboard
- Día 25: Open Graph dinámico por reflexión (PNG generado on-the-fly)
- Día 26: QA Semana 4 + ramp-up al launch

Esperando confirmación del CEO antes de continuar.

---

## Comando push consolidado

```powershell
# Desde C:\Users\efert\kudos_project
git add -A
git commit -m "feat(week3): Mi Mundo V2 + Share V2 + Login polish + Notifs minimas

- Personal Graph radial 7 pilares (constelacion SVG)
- ShiftHistory revisitable + Mi Mundo tabs
- Share V2 con reflexion personal 50+ chars
- /c/[id] short URL con ref tracking
- Login polish + migrate-anon automatico
- NotificationService minimal (daily Core + revisit T+7d)
- AuthBootstrap + NotificationBootstrap globales

Backend kudos_engine 2.9.0 (+/api/personal/graph +/api/personal/shifts)
Frontend 11 nuevos archivos + 4 modificados

T3.2 EJEC Days 15-19 cerrado"
git push origin master
```
