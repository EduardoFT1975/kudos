/**
 * KUDOS Experience · <Button />
 *
 * Convención shadcn/ui: cva variants + Radix Slot para `asChild`.
 * Variants alineados con el lenguaje cinematic (glow púrpura primario,
 * glass elegante secundario, outline sutil).
 */
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  // base · todas las variantes comparten esto
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium",
    "transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kudos-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kudos-bg)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /** CTA principal · glow púrpura cinematográfico. */
        glow: [
          "rounded-full",
          "bg-gradient-to-r from-[var(--kudos-accent)] to-[var(--kudos-accent-bright)]",
          "text-[var(--kudos-ink-invert)]",
          "shadow-[0_0_28px_-6px_var(--kudos-accent-glow)]",
          "hover:shadow-[0_0_44px_-4px_var(--kudos-accent-glow)] hover:-translate-y-px",
          "active:translate-y-0",
        ].join(" "),
        /** Secundaria · glass elegante. */
        ghost: [
          "rounded-full",
          "bg-[var(--kudos-glass)]",
          "text-[var(--kudos-ink)]",
          "border border-[var(--kudos-border)]",
          "backdrop-blur-md",
          "hover:bg-[var(--kudos-glass-hi)] hover:border-[var(--kudos-border-strong)]",
        ].join(" "),
        /** Outline mínimo. */
        outline: [
          "rounded-full",
          "border border-[var(--kudos-border)]",
          "text-[var(--kudos-ink)]",
          "hover:border-[var(--kudos-accent)] hover:text-white",
        ].join(" "),
        /** Texto puro, sin caja. */
        link: [
          "text-[var(--kudos-accent)]",
          "underline-offset-4 hover:underline",
          "rounded-sm",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-7 text-[15px]",
        icon: "size-10 rounded-full p-0",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
