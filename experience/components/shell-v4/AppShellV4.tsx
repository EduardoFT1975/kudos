"use client";

/**
 * KUDOS . AppShellV4 . Canonical global shell.
 *
 * FULLSCREEN_ROUTES: rutas v5 con su propio Header · sin TopBar shell.
 *   - /world (mapa cinematográfico)
 *   - /inicio (HomeFeedV5)
 *   - /mi-mundo (MiMundoV5)
 *   - /poi/[id] (PoiNodeV5)
 *   - /merit/[poi_id] (MeritEngineV5)
 *
 * En todas estas rutas mantenemos BottomNav + ShareModal + Toast del shell
 * para no aislar las pantallas y permitir navegación.
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
import { ShareCapsuleModalV5 } from "@/components/share/ShareCapsuleModalV5";
import { MeritToast } from "@/components/share/MeritToast";

interface Props { children: React.ReactNode; }

// v5 pages · cada una tiene su Header propio (no usan TopBar shell)
const FULLSCREEN_ROUTES = ["/world", "/inicio", "/mi-mundo", "/poi", "/merit"];

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
          <ShareCapsuleModalV5 />
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
        <ShareCapsuleModalV5 />
        <MeritToast />
      </FatalRecoveryLayer>
    </MobileSafeAreaProvider>
  );
}
