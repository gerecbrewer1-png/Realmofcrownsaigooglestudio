/**
 * REALM OF CROWNS — Centralized 9 Biome Catalog & Environmental Database
 * Defines complete aesthetic, material, geological, and atmospheric configurations for each biome.
 */

import { BiomeDefinition, BiomeKey } from './BiomeTypes';

export const BIOME_DEFINITIONS: Record<BiomeKey, BiomeDefinition> = {
  temperate_forest: {
    key: 'temperate_forest',
    name: 'Temperate Forest',
    description: 'Deep ancient woodlands with moss-covered loam, shaded glades, and granite boulders.',
    temperature: 0.55,
    moisture: 0.65,
    materials: {
      groundColor: [0.22, 0.35, 0.16],     // Mossy forest loam
      accentColor: [0.16, 0.28, 0.12],     // Deep leaf mold
      cliffColor: [0.38, 0.36, 0.34],      // Weathered grey granite
      subSoilColor: [0.28, 0.21, 0.14],    // Peat & tree root dirt
      roughness: 0.85,
      metalness: 0.05,
      uvScale: 8.0,
      cliffScale: 6.0,
    },
    elevation: {
      minElevation: 2.0,
      maxElevation: 18.0,
      slopeThreshold: 0.42,
      noisePerturbation: 0.18,
    },
    atmosphere: {
      fogDensity: 0.0035,
      fogColor: [0.72, 0.78, 0.75],
      ambientTint: [0.85, 0.92, 0.82],
      weatherTendency: 'mist',
    },
    ecology: {
      rockFamily: 'granite',
      vegetationDensity: 0.85,
      treeDensity: 0.75,
      rockDensity: 0.35,
      architectureStyle: 'timber_stone',
      harvestableResources: ['hardwood_timber', 'mushrooms', 'granite_stone', 'herbal_reagents'],
    },
  },

  grasslands: {
    key: 'grasslands',
    name: 'Verdant Grasslands',
    description: 'Rolling meadows and expansive pastures ideal for feudal fiefdoms, grazing herds, and grand armies.',
    temperature: 0.60,
    moisture: 0.50,
    materials: {
      groundColor: [0.32, 0.48, 0.18],     // Lush green prairie sod
      accentColor: [0.42, 0.55, 0.22],     // Sunlit meadow grass
      cliffColor: [0.48, 0.45, 0.40],      // Layered limestone crags
      subSoilColor: [0.36, 0.28, 0.18],    // Rich agricultural humus
      roughness: 0.80,
      metalness: 0.02,
      uvScale: 10.0,
      cliffScale: 6.5,
    },
    elevation: {
      minElevation: 1.0,
      maxElevation: 14.0,
      slopeThreshold: 0.45,
      noisePerturbation: 0.14,
    },
    atmosphere: {
      fogDensity: 0.0018,
      fogColor: [0.80, 0.85, 0.88],
      ambientTint: [1.0, 0.98, 0.92],
      weatherTendency: 'clear',
    },
    ecology: {
      rockFamily: 'limestone',
      vegetationDensity: 0.95,
      treeDensity: 0.25,
      rockDensity: 0.20,
      architectureStyle: 'feudal_citadel',
      harvestableResources: ['wheat_grain', 'flax_fiber', 'iron_ore', 'clay'],
    },
  },

  coast: {
    key: 'coast',
    name: 'Maritime Coast',
    description: 'Wind-sculpted sand dunes, tidal beaches, and sea-weathered limestone headlands.',
    temperature: 0.58,
    moisture: 0.85,
    materials: {
      groundColor: [0.76, 0.68, 0.48],     // Pale golden sea sand
      accentColor: [0.55, 0.58, 0.35],     // Coastal marram grass
      cliffColor: [0.52, 0.48, 0.42],      // Salt-crusted sea cliffs
      subSoilColor: [0.60, 0.52, 0.38],    // Wet tidal gravel
      roughness: 0.72,
      metalness: 0.08,
      uvScale: 12.0,
      cliffScale: 7.0,
    },
    elevation: {
      minElevation: 0.0,
      maxElevation: 10.0,
      slopeThreshold: 0.38,
      noisePerturbation: 0.15,
    },
    atmosphere: {
      fogDensity: 0.0040,
      fogColor: [0.75, 0.82, 0.88],
      ambientTint: [0.90, 0.95, 1.0],
      weatherTendency: 'mist',
    },
    ecology: {
      rockFamily: 'limestone',
      vegetationDensity: 0.40,
      treeDensity: 0.15,
      rockDensity: 0.30,
      architectureStyle: 'coastal_harbor',
      harvestableResources: ['salt_pans', 'amber', 'limestone', 'fish_shoals'],
    },
  },

  highland: {
    key: 'highland',
    name: 'Rugged Highlands',
    description: 'Windswept peat plateaus, dark slate outcroppings, and purple heather turf.',
    temperature: 0.40,
    moisture: 0.60,
    materials: {
      groundColor: [0.30, 0.32, 0.22],     // Heather & peat moorland
      accentColor: [0.38, 0.28, 0.32],     // Flowering heather violet
      cliffColor: [0.28, 0.28, 0.30],      // Dark highland slate & basalt
      subSoilColor: [0.22, 0.18, 0.16],    // Black bog peat
      roughness: 0.88,
      metalness: 0.06,
      uvScale: 8.0,
      cliffScale: 5.5,
    },
    elevation: {
      minElevation: 8.0,
      maxElevation: 30.0,
      slopeThreshold: 0.40,
      noisePerturbation: 0.22,
    },
    atmosphere: {
      fogDensity: 0.0050,
      fogColor: [0.68, 0.72, 0.76],
      ambientTint: [0.85, 0.88, 0.92],
      weatherTendency: 'rain',
    },
    ecology: {
      rockFamily: 'slate',
      vegetationDensity: 0.65,
      treeDensity: 0.20,
      rockDensity: 0.60,
      architectureStyle: 'highland_keep',
      harvestableResources: ['highland_wool', 'slate_stone', 'copper_veins', 'bog_iron'],
    },
  },

  alpine: {
    key: 'alpine',
    name: 'Alpine Crest',
    description: 'Towering mountain peaks, razor-sharp granite cirques, and periglacial talus slopes.',
    temperature: 0.22,
    moisture: 0.45,
    materials: {
      groundColor: [0.45, 0.44, 0.42],     // Rocky mountain scree
      accentColor: [0.32, 0.38, 0.26],     // Alpine tundra lichen
      cliffColor: [0.55, 0.52, 0.50],      // Chiseled grey granite peaks
      subSoilColor: [0.35, 0.34, 0.32],    // Coarse talus moraine
      roughness: 0.90,
      metalness: 0.10,
      uvScale: 7.0,
      cliffScale: 5.0,
    },
    elevation: {
      minElevation: 20.0,
      maxElevation: 55.0,
      slopeThreshold: 0.35,
      noisePerturbation: 0.25,
    },
    atmosphere: {
      fogDensity: 0.0030,
      fogColor: [0.82, 0.86, 0.92],
      ambientTint: [0.92, 0.94, 0.98],
      weatherTendency: 'clear',
    },
    ecology: {
      rockFamily: 'granite',
      vegetationDensity: 0.25,
      treeDensity: 0.10,
      rockDensity: 0.85,
      architectureStyle: 'fortified_granite',
      harvestableResources: ['silver_ore', 'granite_blocks', 'mountain_crystals', 'gold_seams'],
    },
  },

  marsh: {
    key: 'marsh',
    name: 'Swamp & Fenland',
    description: 'Stagnant waterways, dense reed-beds, murky bog silt, and decaying ancient timber.',
    temperature: 0.52,
    moisture: 0.95,
    materials: {
      groundColor: [0.20, 0.24, 0.16],     // Wet swamp muck & algae
      accentColor: [0.15, 0.18, 0.12],     // Decomposing peat bog
      cliffColor: [0.26, 0.25, 0.22],      // Mud-caked river shale
      subSoilColor: [0.16, 0.14, 0.11],    // Saturated black mire
      roughness: 0.60,
      metalness: 0.12,
      uvScale: 9.0,
      cliffScale: 6.0,
    },
    elevation: {
      minElevation: 0.0,
      maxElevation: 6.0,
      slopeThreshold: 0.50,
      noisePerturbation: 0.12,
    },
    atmosphere: {
      fogDensity: 0.0080,
      fogColor: [0.55, 0.62, 0.55],
      ambientTint: [0.75, 0.82, 0.72],
      weatherTendency: 'heavy_downpour',
    },
    ecology: {
      rockFamily: 'shale',
      vegetationDensity: 0.90,
      treeDensity: 0.45,
      rockDensity: 0.15,
      architectureStyle: 'thatched_wattle',
      harvestableResources: ['bog_iron', 'reeds_thatch', 'medicinal_leeches', 'swamp_cypress'],
    },
  },

  dryland: {
    key: 'dryland',
    name: 'Arid Wastes & Savanna',
    description: 'Sun-baked red clay, desiccated scrubland, and towering sandstone mesas.',
    temperature: 0.88,
    moisture: 0.15,
    materials: {
      groundColor: [0.68, 0.48, 0.32],     // Sun-baked terra-cotta clay
      accentColor: [0.58, 0.42, 0.25],     // Dry cracked loam
      cliffColor: [0.72, 0.38, 0.24],      // Striated red sandstone canyon
      subSoilColor: [0.75, 0.58, 0.38],    // Coarse desert sand
      roughness: 0.88,
      metalness: 0.02,
      uvScale: 11.0,
      cliffScale: 6.0,
    },
    elevation: {
      minElevation: 4.0,
      maxElevation: 25.0,
      slopeThreshold: 0.40,
      noisePerturbation: 0.20,
    },
    atmosphere: {
      fogDensity: 0.0025,
      fogColor: [0.85, 0.78, 0.68],
      ambientTint: [1.05, 0.95, 0.82],
      weatherTendency: 'dust_storm',
    },
    ecology: {
      rockFamily: 'sandstone',
      vegetationDensity: 0.20,
      treeDensity: 0.08,
      rockDensity: 0.50,
      architectureStyle: 'adobe_clay',
      harvestableResources: ['sulfur_powder', 'copper_nodules', 'sandstone_quarry', 'saltpetre'],
    },
  },

  snow: {
    key: 'snow',
    name: 'Glacial Tundra & Snowfields',
    description: 'Deep snowdrifts, blue glacial pack ice, and frost-fractured dark bedrock.',
    temperature: 0.10,
    moisture: 0.55,
    materials: {
      groundColor: [0.88, 0.92, 0.96],     // Fresh pristine snow
      accentColor: [0.78, 0.85, 0.92],     // Packed firn & glacier ice
      cliffColor: [0.28, 0.30, 0.35],      // Frost-shattered dark rock
      subSoilColor: [0.52, 0.58, 0.65],    // Frozen permafrost scree
      roughness: 0.45,
      metalness: 0.15,
      uvScale: 9.0,
      cliffScale: 5.5,
    },
    elevation: {
      minElevation: 6.0,
      maxElevation: 45.0,
      slopeThreshold: 0.38,
      noisePerturbation: 0.18,
    },
    atmosphere: {
      fogDensity: 0.0060,
      fogColor: [0.80, 0.86, 0.94],
      ambientTint: [0.88, 0.92, 1.0],
      weatherTendency: 'blizzard',
    },
    ecology: {
      rockFamily: 'basalt',
      vegetationDensity: 0.15,
      treeDensity: 0.12,
      rockDensity: 0.45,
      architectureStyle: 'nordic_timber',
      harvestableResources: ['glacial_ice', 'mithril_shards', 'mammoth_ivory', 'frost_lichen'],
    },
  },

  volcanic: {
    key: 'volcanic',
    name: 'Volcanic Ashlands',
    description: 'Black basalt crust, glowing subterranean fissures, pumice fields, and obsidian spires.',
    temperature: 0.92,
    moisture: 0.20,
    materials: {
      groundColor: [0.14, 0.13, 0.14],     // Scorched black volcanic ash
      accentColor: [0.24, 0.16, 0.12],     // Cinder & burnt terra
      cliffColor: [0.10, 0.10, 0.11],      // Sheer obsidian & dark basalt
      subSoilColor: [0.32, 0.14, 0.08],    // Sulfuric crust & embers
      roughness: 0.70,
      metalness: 0.25,
      uvScale: 8.0,
      cliffScale: 5.0,
    },
    elevation: {
      minElevation: 5.0,
      maxElevation: 35.0,
      slopeThreshold: 0.36,
      noisePerturbation: 0.22,
    },
    atmosphere: {
      fogDensity: 0.0070,
      fogColor: [0.35, 0.30, 0.30],
      ambientTint: [1.10, 0.85, 0.70],
      weatherTendency: 'ash_fall',
    },
    ecology: {
      rockFamily: 'obsidian',
      vegetationDensity: 0.05,
      treeDensity: 0.02,
      rockDensity: 0.75,
      architectureStyle: 'fortified_granite',
      harvestableResources: ['obsidian_glass', 'sulfur_crystals', 'black_iron', 'fire_gems'],
    },
  },
};
