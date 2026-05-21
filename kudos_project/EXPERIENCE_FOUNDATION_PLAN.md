# KUDOS Experience Core · Foundation Plan P0

**Fecha:** 2026-05-17
**Estado:** SCAFFOLDING COMPLETO · esperando Design System v1.0 para inyectar tokens.

> Arquitectura oficial: **Django = AXÓN Core / Knowledge Engine · Next.js = KUDOS Experience Core**.
> Ver `experience/ARCHITECTURE.md` para el contrato bridge HTTP.

---

## 1. Stack confirmado

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Runtime | React 19 |
| Tipado | TypeScript 5.6 strict |
| Estilos | Tailwind CSS 3.4 |
| Animación | Framer Motion 11 |
| Primitivas accesibles | Radix UI (base shadcn/ui) |
| Iconos | Lucide React 0.460 |

Cero Bootstrap. Cero Material UI. Cero CSS-in-JS pesado.

---

## 2. Estructura `/experience/` (creada)

```
experience/
├── app/
│   ├── (layout)/              · grupos de rutas con shells distintos
│   ├── globals.css            · shell @tailwind base/components/utilities
│   ├── layout.tsx             · RootLayout · metadata + viewport (sin tokens aún)
│   └── page.tsx               · placeholder provisional (se reemplaza tras tokens)
├── components/
│   ├── ui/                    · primitivas shadcn-style (Button, Dialog, etc.)
│   ├── shell/                 · AppShell · MainScene · FloatingDepth
│   ├── sidebar/               · navegación persistente (5 items P0)
│   └── atmosphere/            · partículas, noise, gradients
├── features/
│   ├── explore/               · entrypoint cinematográfico (P0)
│   ├── timeline/              · línea temporal (P1)
│   ├── mind/                  · 3 prompts → /api/mind/ask/ (P0 wireframe, P1 funcional)
│   ├── library/               · cápsulas guardadas (P1)
│   └── saved/                 · colecciones (P1)
├── design-system/
│   ├── tokens/                · colors / spacing / radius / shadows / typography / motion
│   └── primitives/            · GlassPanel, CinematicCard, ImmersiveHero, ...
├── motion/                    · variants Framer + transition presets
├── styles/                    · globals-base.css y utilities (post-tokens)
├── lib/
│   ├── api/django.ts          · ✓ cliente tipado (fetchCapsules5D, fetchCapsuleLight, askMind)
│   ├── mocks/                 · (vacío · sólo si necesario en P0 wireframe)
│   └── utils/cn.ts            · ✓ clsx + tailwind-merge
├── public/atmosphere/         · assets atmospheric (noise PNG, gradients SVG)
├── package.json               · ✓
├── tsconfig.json              · ✓ paths @/* configurados
├── tailwind.config.ts         · ✓ shell vacío esperando tokens
├── next.config.ts             · ✓ rewrites a Django + image domains
├── postcss.config.mjs         · ✓
├── next-env.d.ts              · ✓
├── .env.example               · ✓ NEXT_PUBLIC_DJANGO_BACKEND
├── .gitignore                 · ✓
├── README.md                  · ✓
└── ARCHITECTURE.md            · ✓ contrato AXÓN ↔ Experience
```

---

## 3. Las 8 sub-tareas P0 (estado)

### 3.1 Design Tokens — ⏸ esperando Design System v1.0

Archivos a crear cuando llegue el doc:

```
design-system/tokens/colors.ts        export const colors = { neon, magenta, ambar, ... }
design-system/tokens/spacing.ts       export const spacing = { 1, 2, 3, ... }
design-system/tokens/radius.ts        export const radius = { sm, md, lg, full, ... }
design-system/tokens/shadows.ts       export const shadows = { glow.cyan, glow.gold, ... }
design-system/tokens/typography.ts    export const typography = { serif, sans, sizes, ... }
design-system/tokens/motion.ts        export const motion = { ease.cinematic, dur.calm, ... }
design-system/tokens/index.ts         barrel export
```

**Inyección en Tailwind:** `tailwind.config.ts` importará desde `design-system/tokens/index.ts` y poblará `theme.extend.*`.

### 3.2 Global Theme — ⏸ depende de tokens

`styles/globals-base.css` con `@layer base { :root { --neon: ...; --bg-deep: ...; } }`.
`app/globals.css` ya importa `@tailwind base/components/utilities` y respeta `prefers-reduced-motion`.

### 3.3 App Shell — ⏸ depende de tokens

`components/shell/AppShell.tsx` con grid:
```
[ Sidebar persistente · 280 px ] [ MainScene · flex-1 ]
                                  └─ <AmbientOverlay /> floating depth
```
Mobile: sidebar colapsa a bottom navigation (Radix `Sheet`).

### 3.4 Sidebar System — ⏸ depende de tokens

5 items iniciales con `lucide-react`:
- **Explorar** → `<Compass />` → `/`
- **Timeline** → `<Hourglass />` → `/timeline`
- **Mind** → `<BrainCircuit />` → `/mind`
- **Biblioteca** → `<Library />` → `/library`
- **Guardados** → `<Bookmark />` → `/saved`

Hover glow sutil · active state premium · search contextual con `cmd+k` (Radix `Dialog`).

### 3.5 Motion System — ⏸ depende de tokens

`motion/variants.ts` con presets:
- `fadeReveal` · opacity 0→1, y 8→0, duration token, ease `[0.22, 1, 0.36, 1]`.
- `atmosphericTransition` · scale + blur · cinematic pacing.
- `floatingMotion` · subtle y oscillation infinite.
- `blurTransition` · backdrop-filter blur in/out.
- `spatialTransition` · 3D-like perspective shift.

**Prohibido:** bounce · elastic · flashy timings (>500 ms aggressive).

### 3.6 UI Foundation — ⏸ depende de tokens

`design-system/primitives/`:
- `GlassPanel.tsx` · backdrop-blur + borde neón sutil
- `CinematicCard.tsx` · imagen hero + meta overlay + reveal motion
- `ImmersiveHero.tsx` · full-bleed con título dramático + CTA
- `SpatialButton.tsx` · variants (primary glow, ghost, share)
- `TimelineNode.tsx` · marker para el timeline engine (P1+)
- `AmbientOverlay.tsx` · capa atmospheric persistente

### 3.7 Responsive System — ⏸ depende de tokens

Mobile-first real:
- Breakpoints en `tokens/spacing.ts`
- Bottom navigation obligatoria en `< md`
- Sidebar lateral solo en `>= md`
- Touch targets ≥ 44px (Apple HIG)
- `viewport-fit=cover` ya configurado en `RootLayout`
- `100dvh` en lugar de `100vh`

### 3.8 Atmosphere Layer — ⏸ depende de tokens

`components/atmosphere/`:
- `Particles.tsx` · `<canvas>` minimal con ~30 partículas flotantes
- `Noise.tsx` · overlay SVG noise sutil (~3% opacity)
- `Gradients.tsx` · radial gradients espaciales (cyan/violet/dorado depth)
- `CinematicDepth.tsx` · blur layers para profundidad de campo

**Performance budget:**
- Particles: requestAnimationFrame con pausa si `prefers-reduced-motion`.
- Noise: SVG estático (no animado).
- Gradients: CSS puro (sin canvas).
- GPU: max 1 elemento con backdrop-filter activo a la vez en mobile.

---

## 4. Archivos ya entregados (P0 sin tokens)

| Archivo | Estado |
|---|---|
| `experience/package.json` | ✓ Next 15 + React 19 + Tailwind 3.4 + Framer 11 + Radix + Lucide |
| `experience/tsconfig.json` | ✓ strict + paths `@/*` |
| `experience/next.config.ts` | ✓ rewrites `/api/django/*` y `/api/mind/*` + image domains |
| `experience/tailwind.config.ts` | ✓ shell vacío (esperando tokens) |
| `experience/postcss.config.mjs` | ✓ |
| `experience/.gitignore` | ✓ |
| `experience/.env.example` | ✓ `NEXT_PUBLIC_DJANGO_BACKEND` |
| `experience/next-env.d.ts` | ✓ |
| `experience/app/globals.css` | ✓ shell + `prefers-reduced-motion` |
| `experience/app/layout.tsx` | ✓ RootLayout + metadata KUDOS |
| `experience/app/page.tsx` | ✓ placeholder provisional |
| `experience/lib/api/django.ts` | ✓ cliente tipado: `fetchCapsules5D`, `fetchCapsuleLight`, `askMind` |
| `experience/lib/utils/cn.ts` | ✓ `clsx` + `tailwind-merge` |
| `experience/README.md` | ✓ |
| `experience/ARCHITECTURE.md` | ✓ contrato AXÓN ↔ Experience |
| `EXPERIENCE_FOUNDATION_PLAN.md` | ✓ este documento |

---

## 5. Próximo paso (bloqueo)

> **Pegar Design System v1.0** (paleta, tipografía, escalas, sombras, motion eases, breakpoints).

Tras recibirlo, en la siguiente pasada:

1. Crear los 6 archivos `design-system/tokens/*.ts`
2. Cablear `tailwind.config.ts` para consumirlos
3. Implementar `styles/globals-base.css` (vars CSS + scroll behavior)
4. Implementar `motion/variants.ts` con presets cinematic
5. Implementar las 6 primitivas (GlassPanel, CinematicCard, ImmersiveHero, SpatialButton, TimelineNode, AmbientOverlay)
6. Implementar `components/shell/AppShell.tsx` + `components/sidebar/Sidebar.tsx`
7. Implementar `components/atmosphere/*` con presupuesto GPU
8. Reescribir `app/page.tsx` como `<ImmersiveHero />` + `<AppShell />`
9. Smoke test: `npm install && npm run typecheck && npm run dev` debe arrancar limpio
10. Capturas visuales de la home cinematográfica vacía

---

## 6. Cómo correr cuando esté completo

```bash
cd experience
cp .env.example .env.local
# editar NEXT_PUBLIC_DJANGO_BACKEND apuntando a tu Render productivo

npm install
npm run dev        # localhost:3000

# typecheck
npm run typecheck

# build de producción
npm run build && npm start
```

El backend Django (`v0.9-axon-core` en Render) sigue siendo el productivo. El Experience Core se despliega en paralelo (Vercel recomendado por DX, alternativa Render).

---

## 7. Reglas absolutas durante construcción

- ✗ Cero estilos inline arbitrarios (excepción: `app/page.tsx` provisional, se reemplaza).
- ✗ Cero mocks permanentes (sólo wireframes P0 si Design no llega; se eliminan en P1).
- ✗ Cero duplicación de lógica que ya existe en Django.
- ✗ Cero Bootstrap, cero Material UI.
- ✓ TODO tokenizado.
- ✓ Server Components por defecto, Client solo cuando necesario.
- ✓ Performance first: `optimizePackageImports`, AVIF/WebP, lazy boundaries.
- ✓ Mobile-first real con bottom navigation.
- ✓ A11y: contrast WCAG AA · focus rings visibles · `prefers-reduced-motion` respect.

---

## 8. Cómo se siente al abrir la app (objetivo P0)

Cuando Design System llegue y P0 esté completo, abrir la home debe sentirse:

- **Espacial** · fondo profundo con depth real, no plano
- **Premium** · tipografía Cormorant Garamond + sans secundaria, espaciado generoso
- **Inmersivo** · atmosphere overlay sutil, partículas mínimas
- **Silencioso** · cero ruido visual, cero saturación
- **Cinematográfico** · transiciones lentas (300-600 ms), eases custom

Aunque NO existan features reales. El universo visual primero. La narrativa después.
