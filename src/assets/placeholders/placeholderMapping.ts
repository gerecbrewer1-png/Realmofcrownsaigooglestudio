/**
 * Placeholder Mapping & Visual Asset Inventory
 * 
 * Documents all current visual representations (placeholders and real assets)
 * and their planned replacements for the next asset acquisition phase.
 * 
 * This file serves as the visual audit and replacement roadmap.
 */

export type PlaceholderType = 'procedural' | 'primitive' | 'placeholder_model' | 'real_asset' | 'placeholder';

export interface PlaceholderMapping {
  assetId: string;
  currentType: PlaceholderType;
  currentRepresentation: string;
  currentlyUsedIn: string[];
  replacementTarget: string;
  replacementTier: number;
  notes: string;
}

/**
 * Complete mapping of all visual elements and their placeholder status
 */
export const PLACEHOLDER_MAPPINGS: PlaceholderMapping[] = [
  // ================ TERRAIN LAYER ================
  {
    assetId: 'grass_plane',
    currentType: 'procedural',
    currentRepresentation: 'Procedural hexagonal terrain tile (green material)',
    currentlyUsedIn: ['WorldMapView', 'terrainGenerator.ts'],
    replacementTarget: 'High-quality grass terrain tiles (tiled 4K texture)',
    replacementTier: 1,
    notes: 'Procedural grass works well. Replacement should use PBR tileable texture sets.',
  },
  {
    assetId: 'water_tile',
    currentType: 'procedural',
    currentRepresentation: 'Procedural water plane with shader animation',
    currentlyUsedIn: ['terrainGenerator.ts', 'World3DCanvas'],
    replacementTarget: 'High-fidelity water system with foam and waves',
    replacementTier: 1,
    notes: 'Current water uses THREE.WaveModifier or similar. Consider Ocean shader replacement later.',
  },

  // ================ MOUNTAINS & ROCKS ================
  {
    assetId: 'terrain_mountain',
    currentType: 'procedural',
    currentRepresentation: 'Procedural heightmap-based mountain mesh',
    currentlyUsedIn: ['terrainGenerator.ts'],
    replacementTarget: 'Artist-crafted mountain clusters with detail meshes',
    replacementTier: 1,
    notes: 'Procedural mountains acceptable for now. Real replacement would include hand-sculpted LODs.',
  },
  {
    assetId: 'rock_small_01',
    currentType: 'placeholder',
    currentRepresentation: 'Primitive box/sphere geometry (gray material)',
    currentlyUsedIn: ['World3DCanvas (scattered via procedural placement)'],
    replacementTarget: 'Realistic scattered rocks (Kenney assets or Poly Haven)',
    replacementTier: 1,
    notes: 'Placeholder rocks are low-priority but high-frequency. Ideal for InstancedMesh rendering.',
  },

  // ================ TREES & FOLIAGE ================
  {
    assetId: 'tree_pine_01',
    currentType: 'placeholder',
    currentRepresentation: 'Procedurally generated cone + cylinder (not yet in scene)',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'High-poly pine tree with LODs (Kenney or custom)',
    replacementTier: 1,
    notes: 'This is a planned asset. Consider pre-purchase from Kenney asset packs.',
  },
  {
    assetId: 'tree_oak_01',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Deciduous oak tree with seasonal variants',
    replacementTier: 1,
    notes: 'Future variant for meadows and open spaces.',
  },
  {
    assetId: 'bush_01',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Dense bush/shrub asset with LOD variants',
    replacementTier: 1,
    notes: 'High-frequency decoration, excellent instancing candidate.',
  },
  {
    assetId: 'grass_tuft',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Detailed grass clump with alpha transparency',
    replacementTier: 1,
    notes: 'Low-poly, high-frequency. Use for ground-level detail.',
  },

  // ================ BUILDINGS - CASTLE ================
  {
    assetId: 'castle_tier_1',
    currentType: 'primitive',
    currentRepresentation: 'Procedural box-based geometry with primitive shapes',
    currentlyUsedIn: ['buildingModels.ts (createPlayerCitadel, createRivalCastle)'],
    replacementTarget: 'Full 3D modeled castle with towers, walls, gates',
    replacementTier: 2,
    notes: 'Critical replacement. Player citadel is central to experience. Should be iconic and highly detailed.',
  },
  {
    assetId: 'castle_tier_2',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Upgraded castle with expanded walls and towers',
    replacementTier: 2,
    notes: 'Future progression tier after castle_tier_1.',
  },
  {
    assetId: 'tower_defense',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Defensive watchtower with battlements',
    replacementTier: 2,
    notes: 'Part of defensive infrastructure.',
  },
  {
    assetId: 'wall_section',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Stone wall segment for instanced fortification',
    replacementTier: 2,
    notes: 'High-frequency, repeatable. Excellent instancing candidate.',
  },

  // ================ BUILDINGS - RESIDENTIAL ================
  {
    assetId: 'house_stone_01',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Stone cottage/house for villages',
    replacementTier: 2,
    notes: 'Standard residential building. Medium priority.',
  },
  {
    assetId: 'house_wood_01',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Wooden house (budget variant)',
    replacementTier: 2,
    notes: 'Lower-tier residential alternative.',
  },

  // ================ BUILDINGS - RESOURCES ================
  {
    assetId: 'farm_01',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Medieval farm with fields and structures',
    replacementTier: 2,
    notes: 'Food production building. Visual should suggest agriculture.',
  },
  {
    assetId: 'mine_stone',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Mining facility with excavation pit',
    replacementTier: 2,
    notes: 'Stone extraction facility. Should have visual quarry elements.',
  },
  {
    assetId: 'lumber_camp',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Logging camp with woodpiles and structures',
    replacementTier: 2,
    notes: 'Wood production facility. Visual should suggest logging.',
  },

  // ================ WORLD RESOURCES ================
  {
    assetId: 'resource_stone_node',
    currentType: 'primitive',
    currentRepresentation: 'Primitive gray sphere/box (1000 tris)',
    currentlyUsedIn: ['resourceModels.ts', 'World3DCanvas'],
    replacementTarget: 'Realistic stone deposit with exposed ore veins',
    replacementTier: 1,
    notes: 'Currently placeholder. High-frequency on world map (instanced).',
  },
  {
    assetId: 'resource_wood_node',
    currentType: 'primitive',
    currentRepresentation: 'Primitive brown sphere/box',
    currentlyUsedIn: ['resourceModels.ts', 'World3DCanvas'],
    replacementTarget: 'Wooden log pile or ancient tree stump',
    replacementTier: 1,
    notes: 'Instanced on world map. Keep performance-optimized.',
  },
  {
    assetId: 'resource_gold_node',
    currentType: 'primitive',
    currentRepresentation: 'Primitive yellow/gold sphere',
    currentlyUsedIn: ['resourceModels.ts', 'World3DCanvas'],
    replacementTarget: 'Golden ore deposit with glowing elements',
    replacementTier: 1,
    notes: 'Premium resource. Should look visually distinct and valuable.',
  },
  {
    assetId: 'resource_iron_node',
    currentType: 'primitive',
    currentRepresentation: 'Primitive dark gray sphere',
    currentlyUsedIn: ['resourceModels.ts', 'World3DCanvas'],
    replacementTarget: 'Iron ore formation with crystalline structure',
    replacementTier: 1,
    notes: 'Common resource node. Instanced on world map.',
  },

  // ================ MILITARY ================
  {
    assetId: 'banner_flag',
    currentType: 'primitive',
    currentRepresentation: 'Procedural cloth flag (simple plane with wave shader)',
    currentlyUsedIn: ['entityModels.ts (createArmyMarchMesh)'],
    replacementTarget: 'High-quality fabric flag with better cloth simulation',
    replacementTier: 3,
    notes: 'Visual element on marching armies. Lower priority than buildings.',
  },
  {
    assetId: 'soldier_unit',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Detailed soldier model with armor and weapon',
    replacementTier: 3,
    notes: 'Future detailed unit representation for close-up views.',
  },
  {
    assetId: 'cavalry_unit',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Mounted cavalry soldier on horse',
    replacementTier: 3,
    notes: 'Specialized unit type.',
  },
  {
    assetId: 'archer_unit',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Archer with bow and quiver',
    replacementTier: 3,
    notes: 'Ranged unit type.',
  },

  // ================ EFFECTS ================
  {
    assetId: 'magic_aura',
    currentType: 'primitive',
    currentRepresentation: 'Procedural ring/aura mesh with glow material',
    currentlyUsedIn: ['World3DCanvas (shield visualization)'],
    replacementTarget: 'High-quality magical aura/shield visual effect',
    replacementTier: 3,
    notes: 'Defensive shield visualization. Particle-based or mesh-based replacement.',
  },
  {
    assetId: 'fire_effect',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Particle-based fire effect with smoke',
    replacementTier: 3,
    notes: 'Visual feedback for destruction or combat.',
  },
  {
    assetId: 'smoke_effect',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Smoke particle system',
    replacementTier: 3,
    notes: 'Atmospheric effect.',
  },

  // ================ CHARACTERS ================
  {
    assetId: 'hero_knight',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Detailed hero character model',
    replacementTier: 4,
    notes: 'Future character profile visualization.',
  },
  {
    assetId: 'villager_generic',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Generic villager NPC for cities',
    replacementTier: 4,
    notes: 'Future population visualization.',
  },
  {
    assetId: 'npc_merchant',
    currentType: 'placeholder',
    currentRepresentation: 'Not yet implemented',
    currentlyUsedIn: ['Not yet deployed'],
    replacementTarget: 'Distinctive merchant character',
    replacementTier: 4,
    notes: 'Special NPC for trading.',
  },

  // ================ ANCIENT SHRINES (Special) ================
  {
    assetId: 'ancient_shrine',
    currentType: 'primitive',
    currentRepresentation: 'Procedural stone pillar with glowing ring',
    currentlyUsedIn: ['entityModels.ts (createAncientShrineMesh)', 'World3DCanvas'],
    replacementTarget: 'Mystical ancient shrine with ornate design',
    replacementTier: 2,
    notes: 'Strategic power sites on world map. Should look magical and important.',
  },

  // ================ BARBARIAN CAMP ================
  {
    assetId: 'barbarian_camp',
    currentType: 'primitive',
    currentRepresentation: 'Procedural tents and wooden palisade',
    currentlyUsedIn: ['entityModels.ts (createBarbarianCampMesh)', 'World3DCanvas'],
    replacementTarget: 'Detailed barbarian encampment with tents and fortifications',
    replacementTier: 2,
    notes: 'Enemy settlements on world map. Should look hostile and primitive.',
  },
];

/**
 * Get all placeholders that need replacement in a specific tier
 */
export function getPlaceholdersByTier(tier: number): PlaceholderMapping[] {
  return PLACEHOLDER_MAPPINGS.filter((p) => p.replacementTier === tier);
}

/**
 * Get all currently deployed placeholders
 */
export function getDeployedPlaceholders(): PlaceholderMapping[] {
  return PLACEHOLDER_MAPPINGS.filter((p) => p.currentlyUsedIn.length > 0);
}

/**
 * Get all planned assets not yet deployed
 */
export function getNotYetDeployed(): PlaceholderMapping[] {
  return PLACEHOLDER_MAPPINGS.filter(
    (p) => p.currentlyUsedIn.length === 0 || p.currentlyUsedIn.includes('Not yet deployed')
  );
}

/**
 * Summary statistics
 */
export function getPlaceholderStats(): {
  total: number;
  deployed: number;
  byType: Record<PlaceholderType, number>;
  byTier: Record<number, number>;
} {
  const stats = {
    total: PLACEHOLDER_MAPPINGS.length,
    deployed: getDeployedPlaceholders().length,
    byType: {
      procedural: 0,
      primitive: 0,
      placeholder_model: 0,
      real_asset: 0,
      placeholder: 0,
    },
    byTier: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    },
  };

  PLACEHOLDER_MAPPINGS.forEach((p) => {
    stats.byType[p.currentType]++;
    stats.byTier[p.replacementTier]++;
  });

  return stats;
}
