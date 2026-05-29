"use client";
/**
 * AppShellV4 - KUDOS PROMPT 5/6.
 * Top nav + bottom nav + modal compartir UNICO (ShareMVP).
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
import { ShareMVP } from "@/components/share/ShareMVP";
import { MeritToast } from "@/components/share/MeritToast";
import { FirstTimeOnboarding } from "@/components/discovery/FirstTimeOnboarding";
import { NotificationServiceBootstrap } from "@/components/notifications/NotificationService";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";

interface Props { children: React.ReactNode; }

const FULLSCREEN_ROUTES = ["/world", "/inicio", "/mi-mundo", "/poi", "/merit", "/perfil", "/guardados", "/core", "/login"];

export function AppShellV4({ children }: Props) {
  const pathname = usePathname() || "";
  const isFullscreen = FULLSCREEN_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isFullscreen) {
    return (
      <MobileSafeAreaProvider>
        <FatalRecoveryLayer>
          {children}
          <AppBottomNavV4 />
          <ShareMVP />
          <MeritToast />
          <FirstTimeOnboarding />
          <NotificationServiceBootstrap />
          <AuthBootstrap />
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
        <ShareMVP />
        <MeritToast />
        <NotificationServiceBootstrap />
        <AuthBootstrap />
      </FatalRecoveryLayer>
    </MobileSafeAreaProvider>
  );
}
