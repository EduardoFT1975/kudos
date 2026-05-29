/**
 * KUDOS HomeFeed v5 · tipos compartidos.
 */

export interface CapsuleManifestItem {
  url: string;
  meta_url?: string;
  name: string;
  tier: string;
  size_mb?: number;
  generated_at?: string;
}

export interface CapsulesIndex {
  capsules: Record<string, CapsuleManifestItem>;
  updated_at: string | null;
}
