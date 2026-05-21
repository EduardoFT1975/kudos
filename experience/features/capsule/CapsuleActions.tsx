"use client";

/**
 * KUDOS Experience · <CapsuleActions />
 *
 * Save + Share con micro-feedback cinematográfico.
 *   Save:    toggle persistido en localStorage (lib/hooks/useSavedCapsules).
 *            Bookmark icon que cambia outline ↔ filled con glow ripple.
 *   Share:   intenta navigator.share; fallback copia URL al clipboard.
 *
 * Toast inferior · 2.6s · auto-dismiss.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, BookmarkCheck, Share2, Check, Link as LinkIcon } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";
import { useSavedCapsules } from "@/lib/hooks/useSavedCapsules";
import { cn } from "@/lib/utils/cn";

export interface CapsuleActionsProps {
  slug: string;
  title: string;
  /** Variante visual. */
  variant?: "hero" | "footer";
}

export function CapsuleActions({ slug, title, variant = "hero" }: CapsuleActionsProps) {
  const { isSaved, toggleSaved, hydrated } = useSavedCapsules();
  const toast = useToast();
  const [shareAvailable, setShareAvailable] = React.useState(false);

  React.useEffect(() => {
    setShareAvailable(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const saved = hydrated && isSaved(slug);

  const onSave = () => {
    const nowSaved = toggleSaved(slug);
    toast.show(
      nowSaved ? "Cápsula guardada" : "Cápsula descartada",
      { icon: nowSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" /> }
    );
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData: ShareData = {
      title: `${title} · KUDOS`,
      text: `Descubre ${title} en KUDOS — la interfaz de descubrimiento de la realidad.`,
      url,
    };
    if (shareAvailable) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Usuario canceló o falló · caemos a clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show("Enlace copiado", { icon: <LinkIcon className="size-4" /> });
    } catch {
      toast.show("No se pudo compartir", { icon: <Check className="size-4" /> });
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "footer" && "justify-center"
        )}
      >
        <ActionPill
          ariaLabel={saved ? "Quitar de guardadas" : "Guardar cápsula"}
          active={saved}
          onClick={onSave}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saved ? "saved" : "unsaved"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              className="inline-flex"
            >
              {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            </motion.span>
          </AnimatePresence>
          <span className="text-[12px] font-medium">{saved ? "Guardada" : "Guardar"}</span>
        </ActionPill>

        <ActionPill ariaLabel="Compartir cápsula" onClick={onShare}>
          <Share2 className="size-4" />
          <span className="text-[12px] font-medium">Compartir</span>
        </ActionPill>
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

// ---------------------------------------------------------------------------
// ActionPill · botón glass con glow ripple on click
// ---------------------------------------------------------------------------
function ActionPill({
  children,
  onClick,
  ariaLabel,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  active?: boolean;
}) {
  const [ripples, setRipples] = React.useState<number[]>([]);

  const handle = () => {
    const id = Date.now();
    setRipples((prev) => [...prev, id]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r !== id)), 700);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center gap-2 overflow-hidden rounded-full",
        "border bg-white/[0.05] backdrop-blur-md px-4 py-2",
        "transition-all duration-300 ease-out",
        active
          ? "border-[var(--kudos-accent)]/55 text-[var(--kudos-accent-bright)] shadow-[0_0_18px_-6px_var(--kudos-accent-glow)]"
          : "border-white/12 text-white/85 hover:border-white/30 hover:bg-white/[0.10] hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)]"
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      {/* Glow ripples */}
      {ripples.map((id) => (
        <motion.span
          key={id}
          aria-hidden
          initial={{ opacity: 0.5, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 12,
            height: 12,
            background: "radial-gradient(circle, var(--kudos-accent-glow) 0%, transparent 70%)",
          }}
        />
      ))}
    </button>
  );
}
