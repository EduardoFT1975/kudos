# KUDOS · Arquitectura oficial

> Dos núcleos. Una identidad. Cero duplicación.

```
┌─────────────────────────────────────────────────────────────────┐
│  KUDOS EXPERIENCE CORE  (Next.js 15 + TypeScript)               │
│  /experience/                                                   │
│                                                                 │
│  · Capa cinematográfica                                         │
│  · Spatial UI · Timeline Engine · Mind UI · Capsule Experience  │
│  · Server + Client Components                                   │
│  · Tailwind + Framer Motion + Radix                             │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP (mismas APIs del MVP v0.9)
                             │  /api/django/*  →  /api/*
                             │  /api/mind/*    →  /mind/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AXÓN CORE / KNOWLEDGE ENGINE  (Django v0.9-axon-core)          │
│  /kudos_project/, /kudos_app/                                   │
│                                                                 │
│  · Datos (PostgreSQL · 1 458 cápsulas+)                         │
│  · Auth + Sesiones + Admin                                      │
│  · Modelos: Capsule, User, Review, AIAgent, ...                 │
│  · APIs:                                                        │
│      /api/capsules/5d/         bbox-paginated, slim             │
│      /api/capsules/<uid>/light/  metadata lazy                  │
│      /api/capsules/nearby/                                      │
│      /api/capsules/                                             │
│      /api/stats/                                                │
│      /mind/ask/                  Mind Lite (3 prompts)          │
│  · Feature gating (DormantRouteMiddleware)                      │
│  · Timeline source                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Reglas de oro de la separación

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| **AXÓN Core (Django)** | Datos · Auth · Lógica de negocio · APIs · Admin | UI cinematográfica · Animaciones · Frontend visual |
| **Experience Core (Next.js)** | Spatial UI · Motion · Timeline UX · Mind UX · Capsule UX | Mocks permanentes · Backend paralelo · Duplicar lógica · Reescribir auth |

## Bridge HTTP · contratos preservados

| Endpoint Django (heredado v0.9) | Acceso desde Next.js |
|---|---|
| `GET /api/capsules/5d/` | `fetch('/api/django/capsules/5d/')` |
| `GET /api/capsules/<uid>/light/` | `fetch('/api/django/capsules/<uid>/light/')` |
| `GET /api/capsules/nearby/` | `fetch('/api/django/capsules/nearby/')` |
| `GET /api/capsules/` | `fetch('/api/django/capsules/')` |
| `GET /api/stats/` | `fetch('/api/django/stats/')` |
| `POST /mind/ask/` | `fetch('/api/mind/ask/', { method: 'POST', credentials: 'include' })` |

Reescrituras configuradas en `next.config.ts`. El cliente tipado vive en
`experience/lib/api/django.ts`.

## Auth: sesiones Django compartidas

- El usuario sigue autenticándose contra `/accounts/login/` de Django.
- Next.js consume APIs con `credentials: 'include'` para enviar la cookie
  de sesión Django.
- CSRF token leído de la cookie `csrftoken` y enviado en header
  `X-CSRFToken` para POST/PUT/DELETE.
- En desarrollo: `localhost:3000` (Next) + `localhost:8000` (Django) requiere
  `CORS` configurado en Django si NO se usa proxy de Next.config rewrites.
  El rewrite por defecto evita CORS.

## Prioridades evolutivas

| # | Pilar | Cuándo |
|---|---|---|
| 1 | Experience Layer (AppShell · Atmosphere · Sidebar · Bottom nav) | P0 — esta fase |
| 2 | Spatial UI (GlassPanel · CinematicCard · ImmersiveHero · SpatialButton · TimelineNode · AmbientOverlay) | P0 — esta fase |
| 3 | Timeline Engine | P1 — siguiente |
| 4 | KUDOS Mind | P1 — siguiente |
| 5 | Capsule Experience completa | P1 — siguiente |

## Lo que NO se construye en P0

- Roma Experience (página de la primera ciudad piloto) — P1
- Timeline avanzada con scroll cinematic — P1
- IA real conectada (mientras tanto: heurística local del backend Django) — P1
- Comunidad / Comments / Reviews enriquecidos — P2
- DAO / Memento / Aport — DORMANT (preservado en Django, no expuesto)

## Cómo el Experience Core preserva los logros del AXÓN MVP

| AXÓN MVP (Django) | Equivalente en Experience Core |
|---|---|
| `DormantRouteMiddleware` | El frontend SOLO llama a las APIs PUBLIC_URL_NAMES. Cero CTAs a rutas DORMANT. |
| Lazy popup `/light/` (D5) | `fetchCapsuleLight(uid)` con `next.revalidate=60`. Misma estrategia, misma cache de 60 s. |
| `bbox + Cache-Control` (D4) | `fetchCapsules5D({ bbox })` con `next.revalidate=60`. |
| Mind Lite 3 prompts (D12) | Feature `mind/` en Next.js que consume `POST /api/mind/ask/`. |
| Share Web API (D10) | Componente `<ShareButton>` usa `navigator.share`. URLs apuntan a Django `/capsules/<uid>/` con sus OG tags ya servidos. |
| Identidad visual KUDOS | Design tokens en `design-system/tokens/` (pendientes del Design System v1.0). |

## Status

**P0 scaffolding completo · esperando Design System v1.0 antes de inyectar tokens.**
