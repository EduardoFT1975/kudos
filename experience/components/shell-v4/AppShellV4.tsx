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
 * /world · cinematográfico sin top bar pero CON bottom nav (integración app).
 * Backdrop intentionally omitted . mockups use flat --kudos-bg.
 */
import * as React from "react";
import { usePathname } from "next/navigation";
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

// Rutas que NO usan top bar (pero SÍ bottom nav).
const FULLSCREEN_ROUTES = ["/world"];

export function AppShellV4({ children }: Props) {
  const pathname = usePathname() || "";
  const isFullscreen = FULLSCREEN_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isFullscreen) {
    // /world · cinematográfico SIN top bar · pero CON bottom nav
    // para no aislar la pantalla del resto de la app.
    return (
      <MobileSafeAreaProvider>
        <FatalRecoveryLayer>
          {children}
          <AppBottomNavV4 />
          <GlobalShareModal />
          <MeritToast />
        </FatalRecoveryLayer>
      </MobileSafeAreaProvider>
    );
  }

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
