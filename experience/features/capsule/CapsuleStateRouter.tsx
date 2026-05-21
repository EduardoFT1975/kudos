"use client";

import * as React from "react";
import { CapsuleBuildingContext } from "./states/CapsuleBuildingContext";
import { CapsuleSparseDiscovery } from "./states/CapsuleSparseDiscovery";
import { CapsuleEmptyZone } from "./states/CapsuleEmptyZone";
import { CapsuleSuccess } from "./states/CapsuleSuccess";
import { CapsuleSystemUnavailable } from "./states/CapsuleSystemUnavailable";
import { RichCapsuleLiveRenderer } from "./RichCapsuleLiveRenderer";
import { MidCapsuleRenderer } from "./MidCapsuleRenderer";
import { classifyCapsuleTier } from "@/lib/capsule/quality";
import { track } from "@/lib/analytics/plausible";
import type { CapsuleResponse, CapsuleData } from "@/types/capsule-state";

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
        <SuccessTierRenderer
          capsule={response.capsule}
          lat={lat}
          lng={lng}
          onExpand={onExpand}
          onNext={onNext ?? onManual}
        />
      );
    }
    return emptyZone;
  }

  return emptyZone;
}

interface SuccessTierRendererProps {
  capsule: CapsuleData;
  lat: number | null;
  lng: number | null;
  onExpand?: () => void;
  onNext?: () => void;
}

function SuccessTierRenderer({
  capsule,
  lat,
  lng,
  onExpand,
  onNext,
}: SuccessTierRendererProps) {
  const tierResult = React.useMemo(() => classifyCapsuleTier(capsule), [capsule]);
  const lastTrackedIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (lastTrackedIdRef.current === capsule.id) return;
    lastTrackedIdRef.current = capsule.id;
    track("capsule_render_tier", {
      tier: tierResult.tier,
      reason: tierResult.reason,
    });
  }, [capsule.id, tierResult.tier, tierResult.reason]);

  if (tierResult.tier === "A") {
    return (
      <RichCapsuleLiveRenderer
        capsule={capsule}
        lat={lat}
        lng={lng}
        onExploreNearby={onExpand}
        onNext={onNext}
      />
    );
  }

  if (tierResult.tier === "B") {
    return (
      <MidCapsuleRenderer
        capsule={capsule}
        lat={lat}
        lng={lng}
        onExploreNearby={onExpand}
        onNext={onNext}
      />
    );
  }

  return (
    <CapsuleSuccess
      capsule={capsule}
      onExploreNearby={onExpand}
      onNext={onNext}
      lat={lat}
      lng={lng}
    />
  );
}
