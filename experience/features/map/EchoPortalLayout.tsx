"use client";

/**
 * KUDOS Experience · EchoPortalLayout
 *
 * Page surface that replaces the legacy "map + modal" architecture.
 * North star:
 *   LEFT  · Echo hero (poster-style story card · persistent)
 *   CENTER · Map intelligence (MapExplorer in `embedded` mode · no modal)
 *   RIGHT · Context panel stack (what it is, reactions, metadata)
 *   BOTTOM · 4-module strip (CTA, timeline, related echoes, layers)
 *
 * State contract: single `activeEcho`. Map emits onEchoChange + onNearbyChange.
 * No popup. No floating modal. No map-first.
 *
 * Desktop-first MVP. Narrow viewports collapse to single-column stack.
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { KudosLogo } from "@/components/shell/KudosLogo";

// MapExplorer is client-only (maplibre-gl). Dynamic import avoids SSR break.
const MapExplorer = dynamic(
  () => import("./MapExplorer").then((m) => m.MapExplorer),
  { ssr: false },
);

// Lifted from MapExplorer · single source of truth para active Echo.
export type ActiveEcho = {
  entity_id: string;
  title: string;
  lat: number;
  lng: number;
  distance_m: number;
  wikidata_url: string;
  wikipedia_url_es: string;
  wikipedia_url_en: string;
  narrative: string | null;
  imageUrl: string | null;
  description: string | null;
  pageUrl: string | null;
  culturalDna?: string[];
  echoSource?: string;
  loading: boolean;
  errorMessage?: string;
};

export type NearbyEntry = {
  entity_id?: string;
  title?: string;
  lat?: number;
  lng?: number;
  distance_m?: number;
  wikipedia_url_es?: string;
  wikipedia_url_en?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const POETIC_FALLBACKS = [
  "Una memoria que sigue caminando entre estos pasos.",
  "Un eco que el lugar nunca llegó a callar.",
  "Donde el tiempo dobla la esquina y mira atrás.",
  "Lo que el lugar recuerda cuando nadie lo escucha.",
  "Aquí algo respira más despacio que el presente.",
  "El paisaje guarda nombres que no pronuncia.",
];

function hashPick(seed: string, options: string[]): string {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return options[Math.abs(h) % options.length];
}

function trimToSentence(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const window = t.slice(0, maxLen);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (lastStop > 80) return t.slice(0, lastStop + 1).trim();
  return window.trimEnd() + " …";
}

// ---------------------------------------------------------------------------
// Sub: EchoHeroCard (left column)
// ---------------------------------------------------------------------------
function EchoHeroCard({
  echo,
  onPickPreset,
  onRetry,
}: {
  echo: ActiveEcho | null;
  onPickPreset?: (preset: { id: string; lat: number; lng: number }) => void;
  onRetry?: () => void;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  React.useEffect(() => { setImgFailed(false); }, [echo?.entity_id, echo?.imageUrl]);

  // FIX 4 · Shimmer copy evolution · escalado con elapsed time del loading.
  // 0-8s: Formando eco · 8-18s: Despertando memoria local · 18-30s: Primer
  // eco del día. Re-render forzado en t=8s y t=18s vía setState.
  const [loadingPhase, setLoadingPhase] = React.useState<0 | 1 | 2>(0);
  const loadStartRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (!echo?.loading) {
      setLoadingPhase(0);
      return;
    }
    loadStartRef.current = Date.now();
    setLoadingPhase(0);
    const t1 = window.setTimeout(() => setLoadingPhase(1), 8000);
    const t2 = window.setTimeout(() => setLoadingPhase(2), 18000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [echo?.entity_id, echo?.title, echo?.loading]);

  const loadingCopy =
    loadingPhase === 0 ? "Formando eco…"
    : loadingPhase === 1 ? "Despertando memoria local…"
    : "Primer eco del día… merece unos segundos";

  if (!echo) {
    // FIX 2 · empty state cinematográfico con CTAs reales.
    // Si geo denied / no POIs / Wikidata falla, el usuario tiene un camino
    // adelante · NO dead loop. Click city preset → flyTo + fetch.
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[28px] border border-white/8 bg-[rgba(7,11,28,0.82)] p-8 text-center backdrop-blur-xl"
      >
        {/* Ambient brand halo behind K · radial violet wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 40%, rgba(167,139,250,0.22) 0%, rgba(7,11,28,0) 65%)",
          }}
        />
        {/* K mark · brand presence · breathing */}
        <div
          className="relative z-10"
          style={{
            animation: "kudos-breathe 4.6s ease-in-out infinite",
            filter: "drop-shadow(0 0 24px var(--kudos-accent-glow))",
          }}
        >
          <KudosLogo variant="mark" size="lg" />
        </div>
        <div className="relative z-10 flex max-w-[320px] flex-col items-center gap-3">
          <h2 className="font-display text-[18px] font-extralight leading-[1.25] tracking-[-0.005em] text-white/88">
            Explora el mundo aunque el silencio no haya hablado aún.
          </h2>
          <p className="font-mono text-[9px] uppercase tracking-[0.40em] text-white/30">
            The Meaning Layer
          </p>
        </div>
        {/* City preset CTAs · ELIMINA el dead loop · agencia al usuario */}
        <div className="relative z-10 flex flex-col items-center gap-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CITY_PRESETS_ECHO.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPickPreset?.(c)}
                className="rounded-full border border-[var(--kudos-accent)]/45 bg-[var(--kudos-accent)]/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)] transition-all hover:bg-[var(--kudos-accent)]/22 hover:tracking-[0.36em]"
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(167,139,250,0.10)," +
                    "0 8px 18px -8px rgba(139,92,246,0.45)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPickPreset?.({ id: "roma", lat: 41.8902, lng: 12.4922 })}
            className="font-mono text-[9.5px] uppercase tracking-[0.30em] text-white/35 transition-colors hover:text-white/70"
          >
            Buscar otro lugar →
          </button>
        </div>
      </div>
    );
  }

  const subtitle = (() => {
    const desc = (echo.description ?? "").trim();
    if (desc && desc.length <= 100) return desc[0].toUpperCase() + desc.slice(1);
    return hashPick(echo.entity_id || echo.title, POETIC_FALLBACKS);
  })();

  const story = echo.narrative ? trimToSentence(echo.narrative, 280) : null;
  const sourceUrl =
    echo.pageUrl || echo.wikipedia_url_es || echo.wikipedia_url_en || echo.wikidata_url || "";

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[32px]"
      style={{
        background: "linear-gradient(180deg, rgba(11,16,38,0.98) 0%, rgba(5,9,24,0.98) 100%)",
        // Cinematic depth · NO hard border · solo violet ambient halo.
        boxShadow:
          "0 48px 120px -28px rgba(0,0,0,0.85)," +
          "0 0 140px -32px rgba(139,92,246,0.42)," +
          "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Hero · 65% · POSTER · lower-third title lockup overlaid */}
      <div
        key={echo.entity_id || echo.title}
        className="relative w-full overflow-hidden bg-[rgba(11,15,34,1)]"
        style={{
          flex: "0 0 65%",
          // Soft crossfade cuando cambia el Echo · feels handoff,
          // not "image replaced". Combina con Ken Burns interno.
          animation: "kudos-fade-in 600ms cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        {echo.imageUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={echo.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{
              filter: "saturate(0.94) contrast(1.08) brightness(0.88)",
              animation: "kudos-ken-burns 22s ease-out both",
              transformOrigin: "55% 40%",
            }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(140% 90% at 25% 20%, rgba(196,181,253,0.36) 0%, rgba(109,40,217,0.22) 32%, rgba(7,11,28,0) 65%)," +
                  "radial-gradient(90% 70% at 78% 88%, rgba(56,189,248,0.20) 0%, rgba(7,11,28,0) 58%)",
                animation: "kudos-ken-burns 22s ease-out both",
                transformOrigin: "40% 50%",
              }}
            />
            {/* Brand watermark · K mark gigante ultra-low opacity behind
                hero content. Brand memory feel · NO intrusivo. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: 0.10, filter: "blur(0.5px)" }}
            >
              <div style={{ transform: "scale(3.2)" }}>
                <KudosLogo variant="mark" size="lg" />
              </div>
            </div>
            {/* Iniciales display layer · on top of brand watermark */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                aria-hidden
                className="font-display font-extralight tracking-[-0.04em] text-white/[0.07] select-none"
                style={{ fontSize: "clamp(80px, 16vw, 140px)", lineHeight: 1 }}
              >
                {echo.title.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "·"}
              </span>
            </div>
          </div>
        )}
        {/* Vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(110% 80% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* Cinematic gradient fade · stretches further · poster feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,9,24,0) 0%, rgba(5,9,24,0.20) 30%, rgba(5,9,24,0.70) 70%, rgba(5,9,24,0.95) 92%, rgba(5,9,24,1) 100%)",
          }}
        />
        {/* Title soft glow zone behind lockup */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
          style={{
            background:
              "radial-gradient(80% 100% at 18% 100%, rgba(139,92,246,0.28) 0%, rgba(5,9,24,0) 65%)",
          }}
        />

        {/* LOWER-THIRD POSTER LOCKUP · Echo eyebrow + huge title +
            poetic subtitle overlaid on image · cinematic dominance. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-7 pb-7">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full"
              style={{
                background: "var(--kudos-accent-bright)",
                boxShadow: "0 0 14px var(--kudos-accent-glow), 0 0 4px rgba(0,0,0,0.6)",
                animation: "kudos-breathe 3.2s ease-in-out infinite",
              }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.46em] text-white/70"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
            >
              Echo
            </span>
          </div>
          <h2
            className="font-display font-extralight leading-[0.95] tracking-[-0.02em] text-white"
            style={{
              fontSize: "clamp(34px, 4vw, 52px)",
              textShadow: "0 2px 20px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            {echo.title}
          </h2>
          {echo.loading && !echo.description ? (
            <span
              aria-hidden
              className="block h-3.5 w-[68%] rounded-full"
              style={{
                background: "linear-gradient(90deg, rgba(196,181,253,0.18) 0%, rgba(196,181,253,0.40) 50%, rgba(196,181,253,0.18) 100%)",
                backgroundSize: "200% 100%",
                animation: "kudos-shimmer 1.6s ease-in-out infinite",
              }}
            />
          ) : (
            <p
              className="font-display text-[15px] font-light italic leading-snug text-[var(--kudos-accent-bright)]/95"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Body · 35% · solo narrative + CTA · title vive en el poster.
          Espacio respira · NO acumular metadata aquí (eso vive en right rail). */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-7 pb-7 pt-5">
        <div className="flex-1 overflow-y-auto pr-1">
          {echo.loading ? (
            <div className="flex flex-col gap-3 pt-1">
              {/* FIX 4 · loading copy evolves with elapsed time */}
              <div className="flex items-center gap-2.5 pb-1">
                <div
                  style={{
                    animation: "kudos-breathe 1.6s ease-in-out infinite",
                    filter: "drop-shadow(0 0 10px var(--kudos-accent-glow))",
                  }}
                >
                  <KudosLogo variant="mark" size="sm" className="!size-4" />
                </div>
                <span
                  key={loadingPhase}
                  className="font-mono text-[9px] uppercase tracking-[0.36em] text-[var(--kudos-accent-bright)]/70"
                  style={{ animation: "kudos-fade-in 380ms ease both" }}
                >
                  {loadingCopy}
                </span>
              </div>
              {[88, 72, 80, 55].map((w, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="block h-3 rounded-full"
                  style={{
                    width: `${w}%`,
                    background: "linear-gradient(90deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.22) 50%, rgba(167,139,250,0.08) 100%)",
                    backgroundSize: "200% 100%",
                    animation: `kudos-shimmer 1.6s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : story ? (
            <p className="font-display text-[14.5px] font-light leading-[1.6] text-white/82">
              {story}
            </p>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="font-display text-[13px] font-light italic leading-relaxed text-white/55">
                {echo.errorMessage ?? "El lugar guarda silencio · todavía no encuentra palabras propias."}
              </p>
              {/* FIX 3 · retry CTA visible cuando hay errorMessage */}
              {echo.errorMessage && onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--kudos-accent)]/40 bg-[var(--kudos-accent)]/10 px-4 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.30em] text-[var(--kudos-accent-bright)] transition-all hover:bg-[var(--kudos-accent)]/22"
                >
                  Reintentar <span aria-hidden>↻</span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        <a
          href={sourceUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!sourceUrl) e.preventDefault(); }}
          className="group mt-1 inline-flex items-center justify-center gap-3 self-stretch rounded-full border border-[var(--kudos-accent)]/55 bg-[var(--kudos-accent)]/14 px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.34em] text-[var(--kudos-accent-bright)] transition-all hover:bg-[var(--kudos-accent)]/24 hover:tracking-[0.38em]"
          style={{
            boxShadow:
              "0 0 0 1px rgba(167,139,250,0.12)," +
              "0 14px 28px -12px rgba(139,92,246,0.5)",
          }}
        >
          <span>Entrar en este Echo</span>
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub: ContextPanelStack (right column)
// ---------------------------------------------------------------------------
/** Editorial rail section · staggered reveal cuando activeEcho cambia.
 *  `revealIndex` controla el delay (100ms × index) · feels editorial,
 *  not "data replaced". `revealKey` fuerza remount al cambiar de Echo. */
function RailSection({
  eyebrow,
  children,
  divider = true,
  revealIndex = 0,
  revealKey = "",
}: {
  eyebrow: string;
  children: React.ReactNode;
  divider?: boolean;
  revealIndex?: number;
  revealKey?: string;
}) {
  return (
    <div
      key={`${revealKey}::${revealIndex}`}
      className="flex flex-col gap-3 px-5 py-5"
      style={{
        animation: `kudos-tab-fade 460ms cubic-bezier(.2,.7,.2,1) ${revealIndex * 110}ms both`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-1 rounded-full"
          style={{
            background: "var(--kudos-accent-bright)",
            boxShadow: "0 0 8px var(--kudos-accent-glow)",
          }}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.42em] text-white/35">
          {eyebrow}
        </span>
      </div>
      <div>{children}</div>
      {divider ? (
        <div
          aria-hidden
          className="mt-1 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(167,139,250,0) 0%, rgba(167,139,250,0.18) 50%, rgba(167,139,250,0) 100%)",
          }}
        />
      ) : null}
    </div>
  );
}

function ContextPanelStack({ echo }: { echo: ActiveEcho | null }) {
  if (!echo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-display text-[13px] font-light italic leading-relaxed text-white/30">
          El contexto del eco aparecerá aquí.
        </p>
      </div>
    );
  }

  const dna = echo.culturalDna ?? [];
  const mockReactions = ["✦ 12", "♡ 4", "💬 2"];
  // Reveal key · cuando activeEcho cambia, las secciones re-montan
  // y la animación de stagger fires · feels handoff causal del mapa.
  const rk = echo.entity_id || echo.title;

  return (
    // Editorial rail · NO box · single column · divisores hairline soft.
    // Magazine side rail feel · not admin stack.
    <div className="flex h-full flex-col overflow-y-auto">
      <RailSection eyebrow="¿Qué es este Echo?" revealIndex={0} revealKey={rk}>
        {dna.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dna.slice(0, 6).map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.30em] text-white/75"
                style={{
                  background: "rgba(167,139,250,0.04)",
                  border: "1px solid rgba(167,139,250,0.18)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-display text-[13px] font-light italic leading-relaxed text-white/40">
            ADN cultural en formación…
          </p>
        )}
      </RailSection>

      <RailSection eyebrow="Reacciones" revealIndex={1} revealKey={rk}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {mockReactions.map((r) => (
              <span
                key={r}
                className="font-mono text-[12px] tracking-[0.16em] text-white/70"
              >
                {r}
              </span>
            ))}
          </div>
          <p className="font-display text-[12px] font-light italic leading-relaxed text-white/35">
            Las memorias compartidas aparecerán aquí.
          </p>
        </div>
      </RailSection>

      <RailSection eyebrow="Coordenadas" divider={!!(echo.wikipedia_url_es || echo.wikidata_url)} revealIndex={2} revealKey={rk}>
        <div className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[0.28em]">
          <div className="flex items-center justify-between">
            <span className="text-white/30">Latitud</span>
            <span className="font-display text-[14px] font-light tracking-tight normal-case text-white/82">
              {echo.lat.toFixed(4)}°
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/30">Longitud</span>
            <span className="font-display text-[14px] font-light tracking-tight normal-case text-white/82">
              {echo.lng.toFixed(4)}°
            </span>
          </div>
          {echo.distance_m > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-white/30">Distancia</span>
              <span className="font-display text-[14px] font-light tracking-tight normal-case text-[var(--kudos-accent-bright)]/90">
                {(echo.distance_m / 1000).toFixed(2)} km
              </span>
            </div>
          ) : null}
          {echo.echoSource ? (
            <div className="flex items-center justify-between">
              <span className="text-white/30">Origen</span>
              <span className="text-white/50">{echo.echoSource}</span>
            </div>
          ) : null}
        </div>
      </RailSection>

      {echo.wikidata_url || echo.wikipedia_url_es ? (
        <RailSection eyebrow="Fuentes" divider={false} revealIndex={3} revealKey={rk}>
          <div className="flex flex-wrap gap-2">
            {echo.wikipedia_url_es ? (
              <a
                href={echo.wikipedia_url_es}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55 transition-colors hover:text-[var(--kudos-accent-bright)]"
              >
                Wikipedia · ES →
              </a>
            ) : null}
            {echo.wikidata_url ? (
              <a
                href={echo.wikidata_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55 transition-colors hover:text-[var(--kudos-accent-bright)]"
              >
                Wikidata →
              </a>
            ) : null}
          </div>
        </RailSection>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub: BottomStrip (4 modules)
// ---------------------------------------------------------------------------
/** Streaming-rail content preview · NO obvious card frame · subtle
 *  background gradient + glass que se siente como tile editorial
 *  (Netflix/Apple TV row), not admin module. */
function StripPreview({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-full min-w-0 flex-col gap-2 rounded-2xl p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(167,139,250,0.04) 0%, rgba(7,11,28,0.0) 100%)," +
          "rgba(7,11,28,0.42)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-1 rounded-full"
          style={{
            background: "var(--kudos-accent-bright)",
            boxShadow: "0 0 6px var(--kudos-accent-glow)",
          }}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.42em] text-white/35">
          {eyebrow}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function BottomStrip({
  echo,
  nearby,
  onPickNearby,
  lastPickedKey,
}: {
  echo: ActiveEcho | null;
  nearby: NearbyEntry[];
  onPickNearby: (n: NearbyEntry) => void;
  lastPickedKey: string;
}) {
  const otherEchoes = nearby
    .filter((n) => n.title && (echo?.entity_id ? n.entity_id !== echo.entity_id : true) && n.title !== echo?.title)
    .slice(0, 3);

  return (
    <div className="grid h-full grid-cols-4 gap-3">
      <StripPreview eyebrow="Sigue explorando">
        <div className="flex h-full flex-col justify-between">
          <p className="font-display text-[13px] font-light italic leading-snug text-white/68">
            {echo
              ? "Explora más capas de este lugar."
              : "Empieza por un punto del mapa."}
          </p>
          <a
            href={echo?.pageUrl || echo?.wikipedia_url_es || echo?.wikidata_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!echo?.pageUrl && !echo?.wikipedia_url_es && !echo?.wikidata_url) e.preventDefault();
            }}
            className="inline-flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--kudos-accent-bright)]/85 transition-colors hover:text-[var(--kudos-accent-bright)]"
          >
            Abrir fuente <span aria-hidden>→</span>
          </a>
        </div>
      </StripPreview>

      <StripPreview eyebrow="Coordenadas">
        <div className="flex h-full flex-col justify-between">
          {echo ? (
            <>
              <div className="font-display text-[15px] font-extralight tracking-tight text-white/85">
                {echo.lat.toFixed(2)}° · {echo.lng.toFixed(2)}°
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                {echo.distance_m > 0 ? `a ${(echo.distance_m / 1000).toFixed(1)} km` : "aquí mismo"}
              </p>
            </>
          ) : (
            <p className="font-display text-[12.5px] font-light italic leading-snug text-white/40">
              Sin selección activa.
            </p>
          )}
        </div>
      </StripPreview>

      <StripPreview eyebrow="Línea temporal">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">Eco</span>
            <span className="font-display text-[16px] font-extralight tracking-tight text-[var(--kudos-accent-bright)]">
              presente
            </span>
          </div>
          <div
            aria-hidden
            className="relative h-1 w-full rounded-full"
            style={{ background: "rgba(167,139,250,0.12)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: "78%", background: "rgba(196,181,253,0.7)" }}
            />
            <div
              className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full"
              style={{
                left: "78%",
                background: "var(--kudos-accent-bright)",
                boxShadow: "0 0 10px var(--kudos-accent-glow)",
              }}
            />
          </div>
        </div>
      </StripPreview>

      <StripPreview eyebrow="Cerca de aquí">
        {otherEchoes.length > 0 ? (
          <div className="flex h-full flex-col gap-1.5 overflow-y-auto pr-1">
            {otherEchoes.map((o, i) => {
              const tileKey = (o.entity_id ?? "") + (o.title ?? "");
              const isPicked = !!tileKey && lastPickedKey.startsWith(tileKey);
              return (
              <button
                key={(o.entity_id ?? "") + i}
                type="button"
                onClick={() => onPickNearby(o)}
                className="group flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all"
                style={{
                  borderColor: isPicked ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.08)",
                  background: isPicked ? "rgba(167,139,250,0.10)" : "rgba(255,255,255,0.025)",
                  boxShadow: isPicked
                    ? "0 0 26px -4px rgba(167,139,250,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "none",
                  animation: isPicked ? "kudos-breathe 1.2s ease-in-out 1" : undefined,
                }}
              >
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-md"
                  style={{
                    background: "radial-gradient(circle at 30% 30%, rgba(196,181,253,0.4) 0%, rgba(139,92,246,0.22) 60%, rgba(7,11,28,0.4) 100%)",
                    border: "1px solid rgba(167,139,250,0.22)",
                  }}
                >
                  <span
                    className="inline-block size-1 rounded-full"
                    style={{
                      background: "var(--kudos-accent-bright)",
                      boxShadow: "0 0 6px var(--kudos-accent-glow)",
                    }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-[12.5px] font-light text-white/85 group-hover:text-white">
                  {o.title}
                </span>
              </button>
              );
            })}
          </div>
        ) : (
          <p className="font-display text-[12.5px] font-light italic leading-snug text-white/40">
            Aún no hay otros ecos cargados.
          </p>
        )}
      </StripPreview>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main · EchoPortalLayout
// ---------------------------------------------------------------------------
// FIX 2 · city presets para empty-state · usuario sin geo / sin POIs.
const CITY_PRESETS_ECHO: ReadonlyArray<{ id: string; label: string; lat: number; lng: number }> = [
  { id: "roma",   label: "Roma",    lat: 41.8902, lng: 12.4922 },
  { id: "atenas", label: "Atenas",  lat: 37.9755, lng: 23.7261 },
  { id: "egipto", label: "Egipto",  lat: 29.9792, lng: 31.1342 },
];

export function EchoPortalLayout() {
  const [activeEcho, setActiveEcho] = React.useState<ActiveEcho | null>(null);
  const [nearbyEchoes, setNearbyEchoes] = React.useState<NearbyEntry[]>([]);
  // Trigger key to instruct embedded MapExplorer to open a specific POI
  // (bottom strip · "Cerca de aquí" click delegates a la map surface).
  const [pickTrigger, setPickTrigger] = React.useState<NearbyEntry | null>(null);
  // FIX 2 · pan trigger · used by empty-state CTAs to fly map to preset city.
  const [panTrigger, setPanTrigger] = React.useState<{ lat: number; lng: number } | null>(null);

  // FIX 1 · PREWARM Render dyno · fire-and-forget GET /api/health/
  // en mount. Mientras el user concede geo + el map carga maplibre, el
  // backend Render despierta. Cold-start cae de ~30s a ~5s.
  React.useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    if (!apiBase) return;
    const ctrl = new AbortController();
    fetch(`${apiBase}/api/health/`, {
      signal: ctrl.signal,
      cache: "no-store",
      method: "GET",
    }).catch(() => { /* silent · prewarm best-effort */ });
    return () => { try { ctrl.abort(); } catch { /* defensive */ } };
  }, []);

  // Last-picked id · drives bottom-tile pulse feedback (1.2s) when
  // user clicks a "Cerca de aquí" stub · feels like the world activated.
  const [lastPickedKey, setLastPickedKey] = React.useState<string>("");
  const handlePickNearby = React.useCallback((n: NearbyEntry) => {
    setPickTrigger(n);
    setLastPickedKey((n.entity_id || n.title || "") + Date.now());
    window.setTimeout(() => setLastPickedKey(""), 1400);
  }, []);

  // FIX 2 · city preset handler · fly map to lat/lng + re-fetch local-capsules.
  const handlePickPreset = React.useCallback((p: { id: string; lat: number; lng: number }) => {
    setPanTrigger({ lat: p.lat, lng: p.lng });
  }, []);

  // FIX 3 · retry · re-fire the synthesize fetch by re-dispatching the
  // current echo through pickTrigger (changes identity → MapExplorer
  // useEffect on externalEchoRequest fires → resets provisionalView
  // loading=true → fetchEcho effect re-runs).
  const handleRetry = React.useCallback(() => {
    setActiveEcho((prev) => {
      if (!prev) return prev;
      setPickTrigger({
        entity_id: prev.entity_id,
        title: prev.title,
        lat: prev.lat,
        lng: prev.lng,
        distance_m: prev.distance_m,
        wikipedia_url_es: prev.wikipedia_url_es,
        wikipedia_url_en: prev.wikipedia_url_en,
      });
      return { ...prev, loading: true, errorMessage: undefined };
    });
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        // Reserve 56px para el global <KudosHeader /> fixed top.
        height: "calc(100dvh - 56px)",
        marginTop: "56px",
        background:
          "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.05) 0%, rgba(5,10,31,0) 70%)," +
          "linear-gradient(180deg, rgba(5,10,31,1) 0%, rgba(3,6,20,1) 100%)",
      }}
    >
      {/* AMBIENT SEAM GLOWS · cosen las 3 columnas en un solo mundo visual.
          Radial violet wash entre hero↔map y map↔rail · subliminal continuity. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            // seam hero ↔ map (≈ col 480px)
            "radial-gradient(280px 60% at calc(420px + 18px) 40%, rgba(167,139,250,0.08) 0%, rgba(5,10,31,0) 60%)," +
            // seam map ↔ rail (≈ right of 1fr column · simétrico)
            "radial-gradient(280px 60% at calc(100% - 380px) 50%, rgba(167,139,250,0.06) 0%, rgba(5,10,31,0) 60%)," +
            // base bottom ambient
            "radial-gradient(60% 30% at 50% 100%, rgba(139,92,246,0.04) 0%, rgba(5,10,31,0) 70%)",
        }}
      />
      <div
        className="echo-portal-grid h-full w-full p-3 md:p-5"
        style={{
          // Hero-dominant proportions · LEFT > RIGHT, CENTER recede.
          // Hero gana ancho, right rail se vuelve editorial estrecho.
          display: "grid",
          gridTemplateColumns: "minmax(360px, 480px) minmax(0, 1fr) minmax(300px, 360px)",
          gridTemplateRows: "minmax(0, 1fr) 168px",
          gap: "18px",
        }}
      >
        {/* LEFT · Echo hero (row 1 col 1) */}
        <div style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }} className="min-h-0">
          <EchoHeroCard
            echo={activeEcho}
            onPickPreset={handlePickPreset}
            onRetry={handleRetry}
          />
        </div>

        {/* CENTER · Map surface (row 1 col 2) */}
        <div
          style={{
            gridColumn: "2 / 3",
            gridRow: "1 / 2",
            // Soft cinematic frame · NO visible border · ambient inner
            // shadow + outer violet halo · mapa recede visualmente
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.04)," +
              "inset 0 0 80px rgba(5,9,24,0.55)," +
              "0 0 60px -20px rgba(139,92,246,0.18)",
          }}
          className="relative min-h-0 overflow-hidden rounded-[32px]"
        >
          <MapExplorer
            embedded
            onEchoChange={setActiveEcho}
            onNearbyChange={setNearbyEchoes}
            externalEchoRequest={pickTrigger}
            onEchoRequestConsumed={() => setPickTrigger(null)}
            externalPanRequest={panTrigger}
            onPanRequestConsumed={() => setPanTrigger(null)}
          />
          {/* Brand chip · LIVE CONTEXT · invisible-premium identidad */}
          <div
            className="pointer-events-none absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5"
            style={{
              background: "rgba(7,11,28,0.62)",
              backdropFilter: "blur(14px) saturate(140%)",
              WebkitBackdropFilter: "blur(14px) saturate(140%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <KudosLogo variant="mark" size="sm" className="!size-4" />
            <span className="font-mono text-[9px] uppercase tracking-[0.36em] text-white/55">
              Live context
            </span>
            <span
              aria-hidden
              className="ml-1 inline-block size-1 rounded-full"
              style={{
                background: "var(--kudos-accent-bright)",
                boxShadow: "0 0 8px var(--kudos-accent-glow)",
                animation: "kudos-breathe 3.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* RIGHT · Context panel (row 1 col 3) */}
        <div style={{ gridColumn: "3 / 4", gridRow: "1 / 2" }} className="min-h-0">
          <ContextPanelStack echo={activeEcho} />
        </div>

        {/* BOTTOM · 4-module strip (row 2 col 1-3) */}
        <div style={{ gridColumn: "1 / 4", gridRow: "2 / 3" }} className="min-h-0">
          <BottomStrip
            echo={activeEcho}
            nearby={nearbyEchoes}
            onPickNearby={handlePickNearby}
            lastPickedKey={lastPickedKey}
          />
        </div>
      </div>

      {/* Narrow viewport · stack fallback (no real mobile en este commit) */}
      <style>{`
        @media (max-width: 1080px) {
          .echo-portal-grid {
            display: flex !important;
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .echo-portal-grid > div {
            grid-column: auto !important;
            grid-row: auto !important;
            min-height: 360px !important;
          }
        }
      `}</style>
    </div>
  );
}
