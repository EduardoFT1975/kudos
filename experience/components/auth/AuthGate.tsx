"use client";
/**
 * AuthGate · KUDOS T1.3.
 *
 * Wrap acciones privadas (guardar, resonar, crear capsula).
 * Si el usuario NO esta autenticado, redirige a /auth/sign-in.
 *
 * NO bloquea exploracion (mapa, POI, capsulas). Solo se monta sobre
 * botones/acciones que requieren identidad.
 *
 * Uso:
 *   <AuthGate fallback={<SignInPrompt />}>
 *     <SaveButton />
 *   </AuthGate>
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";


interface Props {
  children: React.ReactNode;
  /** Si el user NO esta autenticado · render esto en su lugar (opcional). */
  fallback?: React.ReactNode;
  /** Mostrar children igual aunque no este logueado (default: true). */
  passthroughWhenAnon?: boolean;
}


export function AuthGate({ children, fallback, passthroughWhenAnon = true }: Props) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  if (passthroughWhenAnon) return <>{children}</>;
  return null;
}


/**
 * Hook auxiliar: requireAuth(fn).
 * Si autenticado ejecuta fn. Si no, redirige a /auth/sign-in.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const router = useRouter();
  return React.useCallback((action: () => void | Promise<void>) => {
    if (user) {
      void action();
    } else {
      router.push("/auth/sign-in");
    }
  }, [user, router]);
}
