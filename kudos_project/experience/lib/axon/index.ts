/**
 * KUDOS Experience · barrel de `lib/axon`.
 *
 * Importa todo desde `@/lib/axon`:
 *
 *   import { axon, getHealth, listCapsules, getPlace, AxonError } from "@/lib/axon";
 */
export { axonFetch, axon, type AxonRequestInit } from "./client";
export { getAxonBaseUrl, requireAxonBaseUrl, AXON_DEFAULTS } from "./config";
export { AxonError, isAxonError, isMissingEndpoint, type AxonErrorCode } from "./errors";
export type {
  HealthStatus,
  Capsule,
  Capsule5D,
  Capsules5DResponse,
  CapsuleLight,
  Place,
  MindMode,
  MindAskResponse,
} from "./types";

export { getHealth, HEALTH_PATH } from "./endpoints/health";
export {
  listCapsules,
  fetchCapsules5D,
  fetchCapsuleLight,
  type ListCapsulesParams,
  type ListCapsulesResult,
  type BBox,
} from "./endpoints/capsules";
export { getPlace, placePath } from "./endpoints/places";
export {
  getDiscoveryFeed,
  type FeedItem,
  type FeedItemSource,
  type GetDiscoveryFeedOpts,
} from "./endpoints/feed";
