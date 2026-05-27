/**
 * KUDOS Experience · /echo/[id] · loading (V2 · T6 polish)
 *
 * Premium cinematic loading state. Matches the real layout dimensions
 * so the transition to mounted content is layout-shift-free. Shimmer
 * is era-neutral violet · obsidian background mirrors EchoAmbientBg.
 */
import * as React from "react";

export default function EchoLoading() {
  return (
    <main
      className="relative w-full overflow-hidden"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(60% 40% at 50% 0%, rgba(139,92,246,0.06) 0%, rgba(5,10,31,0) 70%)," +
          "linear-gradient(180deg, rgba(5,10,31,1) 0%, rgba(3,6,20,1) 100%)",
      }}
    >
      <style>{`
        @keyframes kudos-load-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes kudos-load-breath {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.92; }
        }
      `}</style>

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-6 sm:gap-8 sm:px-8 sm:pt-10">
        {/* Tiny brand cue · breathing accent · feels like product is "thinking" */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span
            aria-hidden
            className="inline-block size-1 rounded-full"
            style={{
              background: "var(--kudos-accent-bright)",
              boxShadow: "0 0 10px var(--kudos-accent-glow)",
              animation: "kudos-load-breath 2.4s ease-in-out infinite",
            }}
          />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.36em] text-white/55">
            KUDOS · Cargando el eco
          </span>
        </div>

        {/* Hero skeleton · 16:9 poster matching real Hero */}
        <SkelCard ratio="16/9" />

        {/* Map skeleton · 16:9 matching TemporalMapSection plate */}
        <SkelCard ratio="16/9" />

        {/* Timeline skeleton · auto-height ~360px */}
        <SkelCard height={360} />

        {/* Layers skeleton · auto-height ~400px */}
        <SkelCard height={400} />
      </div>
    </main>
  );
}

function SkelCard({
  ratio, height,
}: {
  ratio?: string;
  height?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/[0.06]"
      style={{
        aspectRatio: ratio,
        height: height ? `${height}px` : undefined,
        background:
          "linear-gradient(180deg, rgba(11,16,38,0.92) 0%, rgba(5,9,24,0.92) 100%)",
        boxShadow:
          "0 36px 80px -28px rgba(0,0,0,0.7)," +
          "0 0 60px -24px rgba(139,92,246,0.18)," +
          "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Subtle shimmer sweep */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, " +
            "rgba(255,255,255,0) 35%, rgba(167,139,250,0.08) 50%, rgba(255,255,255,0) 65%)",
          backgroundSize: "200% 100%",
          animation: "kudos-load-shimmer 3.4s ease-in-out infinite",
        }}
      />
      {/* Ambient corner halos */}
      <div
        aria-hidden
        className="absolute -left-16 -top-16 size-[40%]"
        style={{
          background:
            "radial-gradient(circle, rgba(196,181,253,0.10) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-12 -right-12 size-[35%]"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
    </div>
  );
}
