/**
 * Centralized Asset Registry
 * 
 * Defines all game assets (3D models, textures, sounds, etc.) with metadata.
 * Game systems refer to logical assetIds rather than scattering file paths throughout code.
 * Status can be "loaded", "loading", "missing", or "planned" for future assets.
 */

export type AssetCategory =
  | 'terrain'
  | 'environment'
  | 'buildings'
  | 'resources'
  | 'military'
  | 'characters'
  | 'effects'
  | 'ui';

export type AssetFormat = 'glb' | 'gltf' | 'png' | 'jpg' | 'mp3' | 'wav' | 'unknown';

export type PerformanceTier = 'ultra' | 'balanced' | 'performance';

export type AssetStatus = 'loaded' | 'loading' | 'missing' | 'planned';

export interface LODVariant {
  lod: 'lod0' | 'lod1' | 'lod2' | 'lod3';
  filePath?: string;
  triangleCount?: number;
  textureResolution?: string;
}

export interface AssetManifestEntry {
  assetId: string;
  category: AssetCategory;
  displayName: string;
  source?: string; // e.g. "placeholder", "kenney", "quaternius", "poly_haven", etc.
  license?: string; // e.g. "CC0", "proprietary", "UNKNOWN"
  filePath?: string;
  format: AssetFormat;
  triangleCount?: number;
  textureResolution?: string;
  lod?: LODVariant[];
  instancing?: boolean;
  intendedUse?: string;
  performanceTier: PerformanceTier;
  status: AssetStatus;
  notes?: string;
}

/**
 * Master Asset Registry
 * 
 * RULES:
 * - Do NOT invent asset file paths that don't exist
 * - Only mark status: "planned" for future placeholders
 * - Use "missing" if the placeholder was removed but needs replacement
 * - Use "loaded" for currently functional assets (placeholders or real)
 * - triangleCount, textureResolution: use "UNKNOWN" if not measured
 */
export const ASSET_REGISTRY: Record<string, AssetManifestEntry> = {
  // ================ TERRAIN ================
  hex_grass: {
    assetId: 'hex_grass',
    category: 'terrain',
    displayName: 'Hex Grass Ground',
    source: 'KayKit (Kay Lousberg)',
    license: 'CC0',
    format: 'glb',
    triangleCount: 36,
    textureResolution: '512x512 atlas (embedded)',
    instancing: true,
    performanceTier: 'balanced',
    status: 'loaded',
    notes: 'Real KayKit medieval hex grass base for plains, meadows and forest floors',
  },

  hex_water: {
    assetId: 'hex_water',
    category: 'terrain',
    displayName: 'Hex Water Basin',
    source: 'KayKit (Kay Lousberg)',
    license: 'CC0',
    format: 'glb',
    triangleCount: 36,
    textureResolution: '512x512 atlas (embedded)',
    instancing: true,
    performanceTier: 'balanced',
    status: 'loaded',
    notes: 'Real KayKit recessed water hex basin for lakes and riverways',
  },

  dirt_path: {
    assetId: 'dirt_path',
    category: 'terrain',
    displayName: 'Hex Dirt Road',
    source: 'KayKit (Kay Lousberg)',
    license: 'CC0',
    format: 'glb',
    triangleCount: 42,
    textureResolution: '512x512 atlas (embedded)',
    instancing: true,
    performanceTier: 'balanced',
    status: 'loaded',
    notes: 'KayKit hex dirt road connecting settlements and citadels',
  },

  rock_terrain: {
    assetId: 'rock_terrain',
    category: 'terrain',
    displayName: 'Mountain Peaks & Crags',
    source: 'KayKit (Kay Lousberg)',
    license: 'CC0',
    format: 'glb',
    triangleCount: 280,
    textureResolution: '512x512 atlas (embedded)',
    instancing: true,
    performanceTier: 'balanced',
    status: 'loaded',
    notes: 'Real KayKit granite summits (mountain_A, mountain_B, mountain_C)',
  },

  // ================ ENVIRONMENT - TREES ================
  tree_pine_01: {
    assetId: 'tree_pine_01',
    category: 'environment',
    displayName: 'Pine Tree',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
      { lod: 'lod3' },
    ],
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Coniferous tree for forests',
  },

  tree_oak_01: {
    assetId: 'tree_oak_01',
    category: 'environment',
    displayName: 'Oak Tree',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
      { lod: 'lod3' },
    ],
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Deciduous tree for meadows',
  },

  bush_01: {
    assetId: 'bush_01',
    category: 'environment',
    displayName: 'Dense Bush',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'planned',
    notes: 'Low-poly foliage for instancing',
  },

  rock_small_01: {
    assetId: 'rock_small_01',
    category: 'environment',
    displayName: 'Small Rock',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'planned',
    notes: 'Scattered decorative rocks',
  },

  grass_tuft: {
    assetId: 'grass_tuft',
    category: 'environment',
    displayName: 'Grass Tuft',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'planned',
    notes: 'Decorative grass clumps',
  },

  // ================ BUILDINGS - HOUSES ================
  house_stone_01: {
    assetId: 'house_stone_01',
    category: 'buildings',
    displayName: 'Stone House',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Residential building for villages',
  },

  house_wood_01: {
    assetId: 'house_wood_01',
    category: 'buildings',
    displayName: 'Wooden House',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Residential building - budget option',
  },

  castle_tier_1: {
    assetId: 'castle_tier_1',
    category: 'buildings',
    displayName: 'Castle - Tier 1',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 50000,
    textureResolution: 'UNKNOWN',
    lod: [
      { lod: 'lod0', triangleCount: 50000 },
      { lod: 'lod1', triangleCount: 25000 },
      { lod: 'lod2', triangleCount: 10000 },
      { lod: 'lod3', triangleCount: 2000 },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'loaded',
    notes: 'Player citadel - placeholder geometries, will be replaced',
  },

  castle_tier_2: {
    assetId: 'castle_tier_2',
    category: 'buildings',
    displayName: 'Castle - Tier 2',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    lod: [
      { lod: 'lod0', textureResolution: '4K' },
      { lod: 'lod1', textureResolution: '2K' },
      { lod: 'lod2', textureResolution: '1K' },
      { lod: 'lod3' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Upgraded castle with towers',
  },

  tower_defense: {
    assetId: 'tower_defense',
    category: 'buildings',
    displayName: 'Defense Tower',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Defensive structure on walls',
  },

  wall_section: {
    assetId: 'wall_section',
    category: 'buildings',
    displayName: 'Wall Section',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Repeatable defensive wall',
  },

  // ================ BUILDINGS - RESOURCES ================
  farm_01: {
    assetId: 'farm_01',
    category: 'buildings',
    displayName: 'Farm',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Food production building',
  },

  mine_stone: {
    assetId: 'mine_stone',
    category: 'buildings',
    displayName: 'Stone Mine',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Stone extraction facility',
  },

  lumber_camp: {
    assetId: 'lumber_camp',
    category: 'buildings',
    displayName: 'Lumber Camp',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
      { lod: 'lod2', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Wood production facility',
  },

  // ================ RESOURCES - NODE TYPES ================
  resource_stone_node: {
    assetId: 'resource_stone_node',
    category: 'resources',
    displayName: 'Stone Deposit',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 2000,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'World stone node - placeholder',
  },

  resource_wood_node: {
    assetId: 'resource_wood_node',
    category: 'resources',
    displayName: 'Wood Deposit',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 2000,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'World wood node - placeholder',
  },

  resource_gold_node: {
    assetId: 'resource_gold_node',
    category: 'resources',
    displayName: 'Gold Deposit',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 2000,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'World gold node - placeholder',
  },

  resource_iron_node: {
    assetId: 'resource_iron_node',
    category: 'resources',
    displayName: 'Iron Deposit',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 2000,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'World iron node - placeholder',
  },

  // ================ MILITARY ================
  soldier_unit: {
    assetId: 'soldier_unit',
    category: 'military',
    displayName: 'Soldier',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '1K',
    lod: [
      { lod: 'lod0', textureResolution: '1K' },
      { lod: 'lod1', textureResolution: '512' },
      { lod: 'lod2' },
    ],
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Infantry unit for marches',
  },

  cavalry_unit: {
    assetId: 'cavalry_unit',
    category: 'military',
    displayName: 'Cavalry',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '1K',
    lod: [
      { lod: 'lod0', textureResolution: '1K' },
      { lod: 'lod1', textureResolution: '512' },
      { lod: 'lod2' },
    ],
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Mounted cavalry unit',
  },

  archer_unit: {
    assetId: 'archer_unit',
    category: 'military',
    displayName: 'Archer',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '1K',
    lod: [
      { lod: 'lod0', textureResolution: '1K' },
      { lod: 'lod1', textureResolution: '512' },
      { lod: 'lod2' },
    ],
    instancing: true,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Ranged archer unit',
  },

  banner_flag: {
    assetId: 'banner_flag',
    category: 'military',
    displayName: 'Banner Flag',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 200,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'Army march banner - placeholder',
  },

  // ================ CHARACTERS ================
  hero_knight: {
    assetId: 'hero_knight',
    category: 'characters',
    displayName: 'Knight Hero',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '2K',
    lod: [
      { lod: 'lod0', textureResolution: '2K' },
      { lod: 'lod1', textureResolution: '1K' },
    ],
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Player hero character',
  },

  villager_generic: {
    assetId: 'villager_generic',
    category: 'characters',
    displayName: 'Villager',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '1K',
    lod: [
      { lod: 'lod0', textureResolution: '1K' },
      { lod: 'lod1', textureResolution: '512' },
      { lod: 'lod2' },
    ],
    instancing: true,
    performanceTier: 'performance',
    status: 'planned',
    notes: 'NPC villager for settlements',
  },

  npc_merchant: {
    assetId: 'npc_merchant',
    category: 'characters',
    displayName: 'Merchant',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: '1K',
    lod: [
      { lod: 'lod0', textureResolution: '1K' },
      { lod: 'lod1', textureResolution: '512' },
    ],
    instancing: false,
    performanceTier: 'performance',
    status: 'planned',
    notes: 'Special NPC for trade',
  },

  // ================ EFFECTS ================
  fire_effect: {
    assetId: 'fire_effect',
    category: 'effects',
    displayName: 'Fire Effect',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Fire particle/mesh effect for destruction',
  },

  smoke_effect: {
    assetId: 'smoke_effect',
    category: 'effects',
    displayName: 'Smoke Effect',
    source: 'planned',
    license: 'UNKNOWN',
    format: 'glb',
    triangleCount: undefined,
    textureResolution: 'UNKNOWN',
    instancing: false,
    performanceTier: 'balanced',
    status: 'planned',
    notes: 'Smoke particle effect',
  },

  magic_aura: {
    assetId: 'magic_aura',
    category: 'effects',
    displayName: 'Magic Aura',
    source: 'placeholder',
    license: 'proprietary',
    format: 'unknown',
    triangleCount: 500,
    textureResolution: 'UNKNOWN',
    instancing: true,
    performanceTier: 'performance',
    status: 'loaded',
    notes: 'Magical shield/buff effect - placeholder',
  },
};

/**
 * Lookup utility function
 */
export function getAssetInfo(assetId: string): AssetManifestEntry | null {
  return ASSET_REGISTRY[assetId] || null;
}

/**
 * Get all assets of a specific category
 */
export function getAssetsByCategory(category: AssetCategory): AssetManifestEntry[] {
  return Object.values(ASSET_REGISTRY).filter((a) => a.category === category);
}

/**
 * Get all assets with a specific status
 */
export function getAssetsByStatus(status: AssetStatus): AssetManifestEntry[] {
  return Object.values(ASSET_REGISTRY).filter((a) => a.status === status);
}

/**
 * Get currently loaded/available assets
 */
export function getLoadedAssets(): AssetManifestEntry[] {
  return Object.values(ASSET_REGISTRY).filter(
    (a) => a.status === 'loaded' || a.status === 'loading'
  );
}

/**
 * Get planned assets (future acquisitions)
 */
export function getPlannedAssets(): AssetManifestEntry[] {
  return Object.values(ASSET_REGISTRY).filter((a) => a.status === 'planned');
}
