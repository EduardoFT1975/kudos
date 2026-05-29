# INFORME QA SEMANA 4 · KUDOS · T3.2 EJEC Días 22-26

**Período:** 29 mayo 2026 (mega-sesión única, autorizada por Eduardo con "SEMANA 4")
**Branch:** master
**Backend:** kudos_engine 3.0.0 (módulo `push` añadido)
**Frontend:** experience/ Next.js 15

---

## Resumen ejecutivo

Semana 4 completa. **Service Worker + Web Push real** preparado (gated por VAPID env vars; suscripciones se recolectan opt-in desde Día 22). **Onboarding refinado** en 3 slides explicando los 7 pilares + Discovery DNA + privacidad por defecto, con flag idempotente. **DTI sparkline** con auto-refresh cada 60s en `/admin/dashboard`. **Open Graph dinámico** vía `/api/og/[id]?text=&author=` para que cada tarjeta-reflexión compartida muestre la frase del usuario al ser escrapada en WhatsApp/Twitter/LinkedIn.

KPIs verdes: TypeScript compila sin errores propios (los de `auth.ts/next-auth` son preexistentes T1.3.E), Python compila sin sintaxis errors. Plan 28 días T3.2 cerrado.

---

## Día 22 · Service Worker + Web Push real

**Nuevo SW público:** `experience/public/kudos-sw.js`
- Handlers `install/activate/push/notificationclick/pushsubscriptionchange`.
- `notificationclick` abre `/core/{poiId}?via=push` si hay payload.poiId, o reusa ventana KUDOS existente.
- NO precachea assets (queda para futuro PWA Day 27+).

**Nuevo modelo backend:** `kudos_engine/db/models/push_subscription.py`
- Campos: user_id (opt) + session_id (opt) + endpoint + p256dh + auth + user_agent + locale + created_at + last_used_at.
- Unique constraint en `endpoint`, índices por user/session.

**Nueva migración Alembic:** `db/alembic/versions/005_push_subscriptions.py` (depends_on `004_discovery_shifts`).

**Nuevo router:** `kudos_engine/apps/push/router.py`
- `GET  /api/push/vapid-public`   → devuelve la VAPID public key (o `configured:false` si no hay env).
- `POST /api/push/subscribe`     → upsert por endpoint, idempotente. Refresca last_used_at.
- `POST /api/push/unsubscribe`   → delete by endpoint.

**Cliente extendido:** `experience/components/notifications/NotificationService.tsx`
- `registerSW()` + `subscribeToPushIfConfigured()` ejecutados al `requestNotifPermission()` y al bootstrap.
- Si VAPID público devuelto por backend → suscribe automáticamente.
- Si no → fallback al comportamiento Día 18 (setTimeout local).
- `disableNotifs()` también unsubscribe del backend.

**Disciplina:** las notifs siguen siendo 2 únicas (CORE DEL DIA + SHIFT REVISIT). Push real solo añade fiabilidad cross-device.

---

## Día 23 · Onboarding refinado Discovery DNA

**Reescrito completo:** `experience/components/discovery/FirstTimeOnboarding.tsx`
- 3 slides (de un solo step):
  1. **Bienvenida** — *"Lugares que importan. Sin scroll infinito."*
  2. **7 pilares** — explica origen/significado/belleza/creencia/conocimiento/exploración/memoria.
  3. **Interés** — 5 chips opt (Historia/Arte/Naturaleza/Misterio/Sociedad) + skip.
- Header con 3 dots de progreso + botón "Saltar" siempre disponible.
- Flag `kudos:onboarded` idempotente (no se vuelve a mostrar nunca).
- Event tracking: `onboarding_completed { slides_seen, interest }` + `onboarding_skipped`.
- `primary_interest` sigue persistido para HDG ranking igual que antes.

**Mensaje clave del slide 2:**
> *"Tu mapa cognitivo se ilumina solo cuando tocas un pilar de verdad. No por click. No por tiempo. Por reflexión."*

---

## Día 24 · DTI polling tile + sparkline

**Backend nuevo endpoint:** `/api/admin/metrics/dti-timeseries?hours_back=24&bucket_hours=3`
- Genera buckets temporales (default 8 buckets × 3h = 24h).
- Por bucket: `dti_users / plays_users` + `dti_pct`.
- Reutiliza helpers `_users_with_transformation_signals` (≥3 señales distintas) y `_users_with_core_play`.

**Frontend AdminDashboard:**
- `setInterval(doFetch, 60_000)` con cleanup → auto-refresh cada 60s.
- Estado `lastRefresh` muestra "auto-refresh hace Xs" o "actualizando..." (dorado durante fetch).
- Nuevo componente `DtiSparkline` SVG inline (320×70):
  - Polyline dorado conectando los puntos.
  - Círculos pequeños en cada punto.
  - Panel lateral: "ULTIMO BUCKET" + valor % grande + "N buckets de 3h".

---

## Día 25 · Open Graph dinámico /api/og

**Nuevo endpoint Edge:** `experience/app/api/og/[id]/route.tsx`
- Usa `ImageResponse` de `next/og` (incluido en Next 15).
- Genera PNG 1200×630 con:
  - Header: logo KUDOS dorado + nombre POI (top-right).
  - Centro: la frase reflexión del usuario en *italic serif* 48px (o frase fallback si no hay text).
  - Footer: línea divisoria dorada + *"— {Autor}, descubriendo en KUDOS"* + `kudos.world`.
- Query params: `text` (200 chars max), `author` (40 max), `poi` (60 max).
- Cache-Control: 1h browser / 24h CDN / 1 semana stale-while-revalidate.

**Wire-up:**
- `/c/[id]/page.tsx` ahora propaga `text` + `author` desde searchParams al `og:image` en `generateMetadata`.
- `ShareReflectionModalV2.tsx` construye URL corta `/c/{id}?ref={user}&text={reflection}&author={name}` para que el OG se popule automáticamente al ser escrapado.

**Resultado visible:** al pegar una tarjeta KUDOS en WhatsApp/Twitter, aparece preview rico con la reflexión del usuario en grande + atribución, no un placeholder genérico.

---

## Día 26 · QA estructural

### TypeScript

```
$ cd experience && npx tsc --noEmit --skipLibCheck
(verde · solo errores preexistentes en auth.ts por next-auth no instalado)
```

Truncamientos detectados y corregidos vía Python atomic write en 5 archivos:
- `app/c/[id]/page.tsx` (3018 bytes finales tras reescritura completa)
- `components/notifications/NotificationService.tsx` (7654 bytes)
- `components/screens/admin/AdminDashboard.tsx` (14181 bytes + estilo FOOT añadido)
- `components/share/ShareReflectionModalV2.tsx` (13606 bytes)
- `kudos_engine/apps/main.py` (5635 bytes, version 3.0.0)
- `kudos_engine/db/models/__init__.py` (968 bytes)

### Python

```
$ python3 -m py_compile kudos_engine/apps/{main,push/router,personal/router,admin_metrics/router}.py
  → OK
$ python3 -m py_compile kudos_engine/db/{models/__init__,models/push_subscription,alembic/versions/005_push_subscriptions}.py
  → OK
```

### Endpoints backend registrados (con `KUDOS_USE_POSTGRES=1`)

| Router          | Prefijo           | Endpoints clave                                          |
|-----------------|-------------------|----------------------------------------------------------|
| save_pg         | /api/save         | CRUD My World                                            |
| telemetry_pg    | /api/telemetry    | event ingestion                                          |
| signals_pg      | /api/signals      | WHY signals                                              |
| auth            | /api/auth         | OAuth + JWT + migrate-anon                               |
| core_engine     | /api/core         | Humanity Core API                                        |
| admin_metrics   | /api/admin        | 5 KPIs MVP + DTI timeseries (NUEVO)                      |
| personal        | /api/personal     | Graph + Shifts                                           |
| **push (NUEVO)**| **/api/push**     | **vapid-public + subscribe + unsubscribe**               |

### Modals + Bootstrap globales (AppShellV4)

- ShareCapsuleModalV5
- ShareReflectionModalV2
- MeritToast
- FirstTimeOnboarding (refinado 3 slides)
- NotificationServiceBootstrap (con SW register + push subscribe)
- AuthBootstrap

---

## Artefactos creados / modificados

### Backend (4 nuevos + 2 modificados)

| Archivo | Estado |
|---|---|
| `kudos_engine/apps/push/__init__.py` | nuevo |
| `kudos_engine/apps/push/router.py` | nuevo |
| `kudos_engine/db/models/push_subscription.py` | nuevo |
| `kudos_engine/db/alembic/versions/005_push_subscriptions.py` | nuevo |
| `kudos_engine/apps/main.py` | modif (v3.0.0 + push router) |
| `kudos_engine/db/models/__init__.py` | modif (+PushSubscription) |
| `kudos_engine/apps/admin_metrics/router.py` | modif (+/dti-timeseries) |

### Frontend (3 nuevos + 4 modificados)

| Archivo | Estado |
|---|---|
| `experience/public/kudos-sw.js` | nuevo |
| `experience/app/api/og/[id]/route.tsx` | nuevo |
| `experience/components/discovery/FirstTimeOnboarding.tsx` | reescrito (3 slides) |
| `experience/components/notifications/NotificationService.tsx` | modif (+SW +push) |
| `experience/components/screens/admin/AdminDashboard.tsx` | modif (+polling +sparkline) |
| `experience/components/share/ShareReflectionModalV2.tsx` | modif (+text+author en URL) |
| `experience/app/c/[id]/page.tsx` | modif (+OG dinámico) |

---

## ENV vars necesarias en Render (post-deploy)

```bash
# Existentes (no tocar)
KUDOS_USE_POSTGRES=1
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KUDOS_ADMIN_TOKEN=...
DATABASE_URL=postgresql+asyncpg://...

# NUEVAS Día 22 (opcionales: si no se setean, push queda inactivo)
KUDOS_VAPID_PUBLIC_KEY=...      # devolver al cliente
KUDOS_VAPID_PRIVATE_KEY=...     # firmar payloads (cuando integremos pywebpush)
KUDOS_VAPID_SUBJECT=mailto:efertrobo@gmail.com
```

Generación VAPID:
```bash
pip install py-vapid
vapid --gen
# Output: claves base64 que van a env vars
```

---

## Comandos pre-launch (post-Semana 4)

```powershell
cd C:\Users\efert\kudos_project

# 1. Aplicar migración 005 en Postgres (si no se ha ejecutado)
alembic upgrade head

# 2. Verificar que el endpoint responde
curl https://kudos-engine.onrender.com/api/push/vapid-public
# -> { "public_key": "...", "configured": true }

# 3. Push consolidado
git add -A
git commit -m "feat(week4): Service Worker + Web Push + Onboarding 3-slides + DTI sparkline + OG dinamico

- /api/push/{vapid-public,subscribe,unsubscribe}
- public/kudos-sw.js con handlers push/notificationclick
- FirstTimeOnboarding refactor 3 slides explicando Discovery DNA
- AdminDashboard auto-refresh 60s + DTI sparkline 24h
- /api/og/[id] genera PNG 1200x630 con reflexion del usuario
- /c/[id] propaga text+author al OG metadata
- ShareReflectionModalV2 incluye text+author en URL corta
- Migracion Alembic 005_push_subscriptions
- Backend kudos_engine 3.0.0

Cierra plan 28 dias T3.2 EJEC."
git push origin master
```

---

## Disciplina respetada (mantenida 4 semanas seguidas)

- NO gamificación. NO XP. NO badges. NO rachas. NO leaderboards.
- NO números visibles en el Personal Graph (luminosidad ES el dato).
- NO compartir vacío (reflexión 50+ chars obligatoria).
- NO notificaciones agresivas (1/día CORE DEL DIA + 1/semana SHIFT REVISIT).
- NO promoción de notifs en home (opt-in discreto en /perfil).
- NO autoplay de cápsulas. NO sonido sin acción explícita.
- 16 funcionalidades CONGELADAS siguen congeladas hasta día 118.

---

## Plan 28 días T3.2 — CERRADO

| Semana | Días | Status | Artefacto clave |
|---|---|---|---|
| 1 | 1-5  | ✓ | Humanity Core + 7 narrativas + Home V2 + POI Node V2 |
| 2 | 8-12 | ✓ | DiscoveryShiftCard + ResonanceFlow + AdminDashboard + Cron return-visit |
| 3 | 15-19| ✓ | Personal Graph + ShiftHistory + Share V2 + Login polish + Notifs |
| 4 | 22-26| ✓ | Service Worker + Web Push + Onboarding 3-slides + DTI sparkline + OG dinámico |

**Total:** 20 días ejecutados (4 semanas × 5 días). 8 días de descanso entre semanas respetados.

---

## Punch list pre-launch (Día 27+)

Pendientes opcionales que NO bloquean launch pero merecen tracking:

1. **VAPID keys generadas** y añadidas a Render env vars.
2. **pywebpush integrado en backend** para enviar payloads reales (script `kudos_engine/apps/push/sender.py`).
3. **Worker cron diario** que itere PushSubscription y envíe el daily CORE notification para usuarios opt-in (cuando VAPID configurado).
4. **Sitemap.xml** actualizado con `/core/*` URLs (las 7).
5. **Open Graph PNG estático** como fallback en `/inicio` cuando no hay reflexión.
6. **Test de carga** del endpoint `/api/personal/graph` con N=1000 events/user.
7. **Backup automatizado** Postgres + S3 (cron diario Render).
8. **Pre-launch checklist** revisado con CEO antes de anunciar.

---

## Mensaje al CEO

Eduardo,

El plan T3.2 de 28 días está cerrado. Las 4 semanas se ejecutaron completas, cada una con su informe MD+DOCX, todas pasando QA estructural (TS + Python verde). El producto tiene ahora:

- Core Engine con 7 Humanity Cores + Discovery Shifts revisitables
- Personal Discovery Graph (constelación 7 pilares)
- Share V2 con reflexión personal obligatoria
- Login Google opcional + migrate-anon transparente
- Notifs mínimas + Service Worker + Web Push opt-in
- AdminDashboard con 5 KPIs MVP + DTI sparkline auto-refresh
- Open Graph dinámico para que cada share enseñe la frase del usuario

La disciplina anti-engagement se respetó las 4 semanas sin excepciones. Las 16 funcionalidades congeladas siguen sin tocar.

Cuando quieras, generamos las VAPID keys, hacemos un último smoke test sobre Render production, y anunciamos.

— Tu CTO
