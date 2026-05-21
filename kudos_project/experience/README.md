# KUDOS · Experience Core

> Cinematic frontend layer (Next.js 15) sobre el backend Django `v0.9-axon-core`.

**Estado:** P0 scaffolding · esperando Design System v1.0 para tokenizar.

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript 5.6 (strict)
- Tailwind CSS 3.4
- Framer Motion 11
- Radix UI primitives (base de shadcn/ui)
- Lucide Icons

## Estructura

```
experience/
├── app/                    Next.js App Router · layouts y rutas
├── components/
│   ├── ui/                 primitivas shadcn-style
│   ├── shell/              AppShell, MainScene, FloatingDepth
│   ├── sidebar/            navegación persistente
│   └── atmosphere/         partículas, noise, gradients espaciales
├── features/
│   ├── explore/            entrypoint cinematográfico
│   ├── timeline/           línea temporal (P1+)
│   ├── mind/               3 prompts (consume /api/mind/ask/)
│   ├── library/            cápsulas guardadas (P1+)
│   └── saved/              colecciones (P1+)
├── design-system/
│   ├── tokens/             colors / spacing / radius / shadows / typography / motion
│   └── primitives/         GlassPanel, CinematicCard, ImmersiveHero, ...
├── motion/                 variants Framer + transition presets
├── styles/                 globals + utilities CSS
└── lib/
    ├── api/                cliente Django (django.ts)
    ├── mocks/              datos hardcoded para P0
    └── utils/              cn, formatters, etc.
```

## Bridge al backend Django

`next.config.ts` proxea:

- `/api/django/*` → `${NEXT_PUBLIC_DJANGO_BACKEND}/api/*`
- `/api/mind/*`   → `${NEXT_PUBLIC_DJANGO_BACKEND}/mind/*`

Esto preserva el contrato del MVP (`/api/capsules/5d/`, `/api/capsules/<uid>/light/`,
`/mind/ask/`) sin reimplementar backend.

## Cómo correr en local (cuando esté completo)

```bash
cd experience
cp .env.example .env.local
# Editar NEXT_PUBLIC_DJANGO_BACKEND si tu Django no está en localhost:8000
npm install
npm run dev
```

## Reglas de oro

- **TODO tokenizado.** Cero estilos inline arbitrarios (excepto `app/page.tsx`
  provisional que se reemplaza tras Design System v1.0).
- **Mobile-first real.** Bottom navigation obligatoria.
- **Motion calmado.** Sin bounce, sin elastic, sin flashy. Fade · float · blur.
- **Cero Bootstrap. Cero Material UI.** Solo Radix + Tailwind.
- **Performance first.** `optimizePackageImports`, `prefers-reduced-motion`,
  imágenes AVIF/WebP, server components por defecto.

Detalles completos en `EXPERIENCE_FOUNDATION_PLAN.md` (raíz del repo).
