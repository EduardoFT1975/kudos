"use client";

/**
 * KUDOS Experience · <PageAtmosphere />
 *
 * Capa atmosférica espacial CONTINUA. Vive como fondo fijo detrás de toda
 * la Capsule Experience.
 *
 * Calibración v2 (presence calibration phase):
 *   - intensidades bajadas en todos los layers
 *   - heartbeat más sutil y más espaciado
 *   - ghost arches más tenues
 *   - light trails con blur más fuerte (se ven menos como líneas)
 *   - **nuevo**: warm glow ámbar que solo emerge cuando el usuario está
 *     idle ≥8s. Sensación de que el lugar "responde" a la atención.
 *
 * Regla: menos intensidad = más presencia.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { useIdleDwell } from "@/lib/hooks/useIdleDwell";
import { ambientFade } from "@/motion/ambient";

// 7 motas con posiciones estables (sin Math.random en render para SSR-safe).
const MOTES = [
  { x: 12, size: 1.0, duration: 42, delay: 0 },
  { x: 24, size: 0.7, duration: 48, delay: 8 },
  { x: 38, size: 1.2, duration: 36, delay: 18 },
  { x: 52, size: 0.8, duration: 52, delay: 4 },
  { x: 66, size: 0.9, duration: 40, delay: 22 },
  { x: 78, size: 0.6, duration: 56, delay: 14 },
  { x: 88, size: 1.1, duration: 44, delay: 28 },
] as const;

export function PageAtmosphere() {
  const { isIdle, dwellMs } = useIdleDwell(8000);
  // Quietud prolongada · el lugar se siente "más cálido" cuanto más te quedas.
  const deepDwell = dwellMs >= 18000;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* ── Top light shaft · haz cenital sutil ─────────────────────────── */}
      <motion.div
        className="absolute left-1/2 top-0 h-[80%] w-[45%] -translate-x-1/2"
        variants={ambientFade}
        initial="initial"
        animate="animate"
        style={{
          background:
            "linear-gradient(to bottom, rgba(167,139,250,0.065) 0%, rgba(167,139,250,0.018) 30%, transparent 60%)",
          filter: "blur(22px)",
        }}
      />

      {/* ── Side corridors · franjas laterales (sensación "portal") ────── */}
      <div
        className="absolute left-0 top-0 h-full w-40"
        style={{
          background:
            "linear-gradient(to right, rgba(124,58,237,0.055) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-40"
        style={{
          background:
            "linear-gradient(to left, rgba(124,58,237,0.055) 0%, transparent 100%)",
        }}
      />

      {/* ── Bottom warmth · halo cálido lejano ──────────────────────────── */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        animate={{ opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(248,113,113,0.04) 0%, transparent 60%)",
        }}
      />

      {/* ── Dust motes · partículas ascendentes (más tenues que v1) ────── */}
      {MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/55"
          style={{
            left: `${m.x}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            filter: "blur(0.6px)",
            boxShadow: "0 0 5px rgba(255,255,255,0.4)",
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{
            y: "-10vh",
            opacity: [0, 0.55, 0.55, 0],
          }}
          transition={{
            duration: m.duration,
            delay: m.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.12, 0.88, 1],
          }}
        />
      ))}

      {/* ── Ghost arch · silueta arqueada a la deriva (única) ──────────── */}
      <motion.svg
        className="absolute left-[-15%] top-[18%] h-[36%] w-[55%] opacity-[0.022]"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        animate={{
          x: ["0%", "12%", "0%"],
          opacity: [0.012, 0.032, 0.012],
        }}
        transition={{ duration: 44, repeat: Infinity, ease: "easeInOut" }}
      >
        <g fill="none" stroke="white" strokeWidth="0.35">
          <path d="M 20 80 L 20 50 A 12 12 0 0 1 44 50 L 44 80" />
          <path d="M 50 80 L 50 50 A 12 12 0 0 1 74 50 L 74 80" />
          <line x1="10" y1="80" x2="84" y2="80" />
        </g>
      </motion.svg>

      {/* ── Light trail vertical · único · purple alineado con SpatialAnchor */}
      <motion.div
        className="absolute top-0 h-[120%] w-px"
        style={{
          left: "37%",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(167,139,250,0.13) 30%, rgba(167,139,250,0.13) 70%, transparent 100%)",
          filter: "blur(1px)",
        }}
        animate={{ y: ["-20%", "0%", "-20%"], opacity: [0.22, 0.5, 0.22] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Warm glow contextual · emerge cuando isIdle (≥8s). Fade 4.5s. */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isIdle ? 1 : 0 }}
        transition={{ duration: 4.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 55%, rgba(248,180,110,0.025) 0%, transparent 65%)",
        }}
      />

      {/* ── Deep dwell warm layer · dwellMs ≥ 18s · más cálido, más difuso.
            Fade in 7s. El lugar se "asienta" en silencio contigo. */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: deepDwell ? 1 : 0 }}
        transition={{ duration: 7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 60%, rgba(248,180,110,0.025) 0%, rgba(248,113,113,0.012) 35%, transparent 75%)",
        }}
      />
    </div>
  );
}
