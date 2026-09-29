/**
 * Asset Pipeline Core Types & Metadata Definitions
 * 
 * Supports scalable asset tracking, licensing compliance, LOD tiers,
 * instancing eligibility, and procedural fallbacks.
 */

export type AssetCategory =
  | 'terrain'
  | 'environment'
  | 'water'
  | 'buildings'
  | 'cities'
  | 'resources'
  | 'military'
  | 'characters'
  | 'animals'
  | 'effects'
  | 'ui';

export type AssetSource =
  | 'quaternius'
  | 'poly_haven'
  | 'kenney'
  | 'opengameart'
  | 'procedural'
  | 'custom';

export type AssetLicense =
  | 'CC0'
  | 'CC-BY-4.0'
  | 'CC-BY-3.0'
  | 'MIT'
  | 'Public Domain'
  | 'UNKNOWN';

export type AssetFormat = 'glb' | 'gltf' | 'texture' | 'procedural' | 'hdr';

export type AssetStatus = 'planned' | 'active' | 'procedural_fallback' | 'deprecated';

export type PerformanceTier = 'essential' | 'standard' | 'high' | 'ultra' | 'UNKNOWN';

export type LODLevel = 'lod0' | 'lod1' | 'lod2' | 'lod3';

export interface AssetMetadata {
  /** Logical unique identifier (e.g. "building_castle_t1") */
  assetId: string;
  /** Primary category */
  category: AssetCategory;
  /** Legal asset source / author */
  source: AssetSource | string;
  /** License type for commercial game verification */
  license: AssetLicense;
  /** File path relative to public root or procedural handler key */
  filePath: string;
  /** Format of the asset payload */
  format: AssetFormat;
  /** Functional purpose within the MMO/strategy world */
  intendedUse: string;
  /** Performance tier recommendation */
  performanceTier: PerformanceTier;
  /** Whether the asset can be batched into an InstancedMesh */
  instancingEligible: boolean;
  /** Available LOD models or tiers */
  lodAvailability: {
    hasLOD: boolean;
    availableTiers: LODLevel[];
  };
  /** Estimated or measured triangle count ('UNKNOWN' if not yet imported) */
  triangleCount: number | 'UNKNOWN';
  /** Texture resolution description ('UNKNOWN' if not yet imported) */
  textureResolution: string | 'UNKNOWN';
  /** Current implementation status */
  status: AssetStatus;
  /** Optional fallback procedural creator identifier */
  fallbackGeneratorId?: string;
  /** Optional bounding box dimensions [width, height, depth] */
  dimensions?: [number, number, number];
}

export interface LODConfig {
  /** Camera distance threshold for LOD 0 (Close / High detail) */
  lod0Distance: number;
  /** Camera distance threshold for LOD 1 (Medium detail) */
  lod1Distance: number;
  /** Camera distance threshold for LOD 2 (Low detail) */
  lod2Distance: number;
  /** Camera distance threshold for LOD 3 (Distant / Strategic icon) */
  lod3Distance: number;
  /** Hysteresis margin to prevent rapid flickering on boundary crossing */
  hysteresis: number;
}
