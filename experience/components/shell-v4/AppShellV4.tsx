"use client";

/**
 * KUDOS . AppShellV4 . Canonical global shell rebuilt to mockup.
 *
 * Composition order:
 *   MobileSafeAreaProvider
 *     KeyboardViewportGuard
 *     MobileShellFixes
 *     FatalRecoveryLayer
 *       AppTopBarV4         (fixed top)
 *       AppCanvasV4         (route content slot)
 *       AppBottomNavV4      (fixed bottom . FAB central dispatches share)
 *       GlobalShareModal    (listens kudos:share-capsule:open globally)
 *       MeritToast          (listens kudos:merit:change globally . microfeedback)
 *
 * Backdrop intentionally omitted . mockups use flat --kudos-bg.
 */
import * as React from "react";
import { FatalRecoveryLayer } from "@/features/launch-closure/FatalRecoveryLayer";
import { MobileSafeAreaProvider } from "@/features/mobile-hardening/MobileSafeAreaProvider";
import { KeyboardViewportGuard } from "@/features/mobile-hardening/KeyboardViewportGuard";
import { MobileShellFixes } from "@/features/mobile-hardening/MobileShellFixes";
import { AppTopBarV4 } from "./AppTopBarV4";
import { AppBottomNavV4 } from "./AppBottomNavV4";
import { AppCanvasV4 } from "./AppCanvasV4";
import { GlobalShareModal } from "@/components/share/ShareCapsuleModal";
import { MeritToast } from "@/components/share/MeritToast";

interface Props { children: React.ReactNode; }

export function AppShellV4({ children }: Props) {
  return (
    <MobileSafeAreaProvider>
      <KeyboardViewportGuard />
      <MobileShellFixes />
      <FatalRecoveryLayer>
        <AppTopBarV4 />
        <AppCanvasV4>{children}</AppCanvasV4>
        <AppBottomNavV4 />
        <GlobalShareModal />
        <MeritToast />
      </FatalRecoveryLayer>
    </MobileSafeAreaProvider>
  );
}
