"use client";

/**
 * KUDOS Experience · <CapsuleStateRouter />
 *
 * Single entry point that dispatches between the 4 UX states based on
 * a unified CapsuleResponse received from /api/capsule/nearby.
 *
 *   building_context   · CapsuleBuildingContext  (also default when
 *                        response is null · async fetch in flight)
 *   success            · CapsuleSuccess          (verified memory · V0
 *                        minimal contract from API)
 *   sparse_discovery   · CapsuleSparseDiscovery  (partial trace, honest)
 *   empty_zone         · CapsuleEmptyZone        (silent, no error)
 *
 * Defensive fallback: any inconsistent shape (e.g., state="success"
 * with no capsule, or unrecognized state value) collapses to
 * empty_zone rather than crashing. User always sees a valid page.
 *
 * BOUNDARY: this router is the only place in the client tree that
 * needs to know about CapsuleUXState. Downstream state components
 * receive a clean CapsuleData prop (or no prop). Backend taxonomy
 * (failure_class, raw confidence) is invisible past this point.
 *
 * NOTE on CapsuleExperience: the rich CapsuleExperience composer
 * (timeline + relations + media + presence) expects a richer Capsule
 * shape that the V0 content engine doesn't yet produce. When future
 * phases extend the pipeline to generate timeline/media/relations,
 * swap CapsuleSuccess for CapsuleExperience here (one-line change).
 */
import * as React from "react";
import { CapsuleBuildingContext } from "./states/CapsuleBuildingContext";
import { CapsuleSparseDiscovery } from "./states/CapsuleSparseDiscovery";
import { CapsuleEmptyZone } from "./states/CapsuleEmptyZone";
import { CapsuleSuccess } from "./states/CapsuleSuccess";
import { CapsuleSystemUnavailable } from "./states/CapsuleSystemUnavailable";
import type { CapsuleResponse } from "@/types/capsule-state";

interface CapsuleStateRouterProps {
  /** API response. `null` = async fetch in flight → building_context. */
  response: CapsuleResponse | null;
  /** Phase 14.5-14.7 · loop + recovery callbacks. The router maps four
   *  semantic primitives to each state component's prop names:
   *
   *    onRetry  · same coords, same radius                 (retry)
   *    onExpand · same coords, expanded radius             (broader search)
   *    onManual · open the manual city picker              (jump elsewhere)
   *    onNext   · pop session-local queue, fallback manual (loop next)
   *
   *  Mapping per state:
   *    building_context → onRetry, onExpand
   *    success          → onExploreNearby=onExpand, onNext=onNext ?? onManual
   *    sparse_discovery → onExpand, onPickOther=onManual   (no queue · area sparse)
   *    empty_zone       → onRetry, onExpand, onManual      (no queue · area empty)
   *
   *  onNext is only consumed by CapsuleSuccess · the queue's preloaded
   *  candidates apply when the user is on a strong capsule and wants
   *  the next one fast. Sparse / empty states route "go elsewhere" CTAs
   *  to onManual because the queue (probing the same vicinity) would
   *  likely surface equally-sparse results.
   *
   *  Any callback may be omitted · receiving components degrade
   *  gracefully (no CTA pill rendered for missing handlers). */
  onRetry?: () => void;
  onExpand?: () => void;
  onManual?: () => void;
  onNext?: () => void;
  /** P0.9 Memory Graph · coords activas de la sesión. Solo se propagan
   *  a CapsuleSuccess para que el RememberPill las persista junto a la
   *  cápsula en localStorage. Sparse/empty states no las necesitan
   *  (no hay nada que recordar). */
  lat?: number | null;
  lng?: number | null;
}

export function CapsuleStateRouter({
  response,
  onRetry,
  onExpand,
  onManual,
  onNext,
  lat = null,
  lng = null,
}: CapsuleStateRouterProps) {
  const emptyZone = (
    <CapsuleEmptyZone
      onRetry={onRetry}
      onExpand={onExpand}
      onManual={onManual}
    />
  );

  if (!response || response.state === "building_context") {
    return (
      <CapsuleBuildingContext
        onRetry={onRetry}
        onExpand={onExpand}
      />
    );
  }

  // Phase 14.10 · system_unavailable is a distinct surface. Don't
  // collapse it to empty_zone · the user needs to know this is infra,
  // not their place being silent.
  if (response.state === "system_unavailable") {
    return (
      <CapsuleSystemUnavailable
        onRetry={onRetry}
        onManual={onManual}
      />
    );
  }

  if (response.state === "empty_zone") {
    return emptyZone;
  }

  if (response.state === "sparse_discovery") {
    if (response.capsule) {
      return (
        <CapsuleSparseDiscovery
          capsule={response.capsule}
          onExpand={onExpand}
          onPickOther={onManual}
        />
      );
    }
    return emptyZone;
  }

  if (response.state === "success") {
    if (response.capsule) {
      // onNext takes priority; manual picker fallback keeps backward
      // compatibility for callers that don't wire the queue.
      return (
        <CapsuleSuccess
          capsule={response.capsule}
          onExploreNearby={onExpand}
          onNext={onNext ?? onManual}
          lat={lat}
          lng={lng}
        />
      );
    }
    return emptyZone;
  }

  // Exhaustiveness fallback · any unrecognized state collapses to silence.
  return emptyZone;
}
