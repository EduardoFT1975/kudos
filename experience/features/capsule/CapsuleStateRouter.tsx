"use client";

import * as React from "react";
import { CapsuleBuildingContext } from "./states/CapsuleBuildingContext";
import { CapsuleSparseDiscovery } from "./states/CapsuleSparseDiscovery";
import { CapsuleEmptyZone } from "./states/CapsuleEmptyZone";
import { CapsuleSuccess } from "./states/CapsuleSuccess";
import { CapsuleSystemUnavailable } from "./states/CapsuleSystemUnavailable";
import type { CapsuleResponse } from "@/types/capsule-state";

interface CapsuleStateRouterProps {
  response: CapsuleResponse | null;
  onRetry?: () => void;
  onExpand?: () => void;
  onManual?: () => void;
  onNext?: () => void;
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
    <CapsuleEmptyZone onRetry={onRetry} onExpand={onExpand} onManual={onManual} />
  );

  if (!response || response.state === "building_context") {
    return <CapsuleBuildingContext onRetry={onRetry} onExpand={onExpand} />;
  }

  if (response.state === "system_unavailable") {
    return <CapsuleSystemUnavailable onRetry={onRetry} onManual={onManual} />;
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

  return emptyZone;
}
