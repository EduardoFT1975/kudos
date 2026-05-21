"use client";

/**
 * KUDOS Experience · <CapsuleMindEntry />
 *
 * Invocación contextual a KUDOS Mind. NO CTA SaaS. Glass pill con
 * Sparkles + texto. En este slice, abre un toast — la conexión real al
 * endpoint /mind/ask/ con contexto de cápsula se implementa cuando se
 * construya el overlay Mind completo.
 */
import * as React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

export interface CapsuleMindEntryProps {
  /** Título de la cápsula · usado en el mensaje del toast. */
  contextTitle: string;
  /** Variante visual. */
  variant?: "inline" | "floating";
}

export function CapsuleMindEntry({ contextTitle, variant = "inline" }: CapsuleMindEntryProps) {
  const toast = useToast();

  const onInvoke = () => {
    toast.show(`Mind se conectará pronto al contexto de ${contextTitle}`, {
      icon: <Sparkles className="size-4" />,
    });
  };

  return (
    <>
      <div
        className={cn(
          "relative inline-flex",
          variant === "floating" && "isolate"
        )}
      >
        {/* Halo respiratorio · sólo en variante floating · sensación de invocación */}
        {variant === "floating" && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[180%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            animate={{
              opacity: [0.4, 0.85, 0.4],
              scale: [0.9, 1.05, 0.9],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(circle at center, var(--kudos-accent-glow-soft) 0%, transparent 65%)",
              filter: "blur(8px)",
            }}
          />
        )}

        <motion.button
          type="button"
          onClick={onInvoke}
          aria-label={`Preguntar a KUDOS Mind sobre ${contextTitle}`}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group inline-flex items-center gap-3 overflow-hidden rounded-full px-5 py-3",
            "border border-[var(--kudos-accent)]/35 bg-[var(--kudos-accent)]/[0.07] backdrop-blur-xl",
            "text-[13px] font-medium text-white",
            "transition-all duration-500 ease-out",
            "hover:border-[var(--kudos-accent)]/60 hover:bg-[var(--kudos-accent)]/[0.12]",
            "hover:shadow-[0_0_36px_-8px_var(--kudos-accent-glow)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]",
            variant === "floating" && "shadow-[0_0_28px_-10px_var(--kudos-accent-glow)]"
          )}
        >
          {/* Sparkles animado · oscilación más lenta · sensación contemplativa */}
          <motion.span
            aria-hidden
            className="relative inline-flex"
            animate={{
              rotate: [0, 4, -4, 0],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-4 text-[var(--kudos-accent-bright)]" />
          </motion.span>

          <span className="flex flex-col items-start leading-none">
            <span className="text-[13px] tracking-tight">Preguntar a KUDOS Mind</span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
              Invocación contextual
            </span>
          </span>

          {/* Borde glow on hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 100%, var(--kudos-accent-glow-soft) 0%, transparent 60%)",
            }}
          />
        </motion.button>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        icon={toast.icon}
        onClose={toast.close}
      />
    </>
  );
}
