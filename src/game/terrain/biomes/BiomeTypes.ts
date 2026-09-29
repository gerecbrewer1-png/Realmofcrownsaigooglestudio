/**
 * REALM OF CROWNS — Centralized 9-Biome Ecological & Material Architecture
 * Declares strong typing for the 9 Realm biomes controlling terrain shaders,
 * triplanar cliff parameters, atmosphere, ecology, and future resource distribution.
 */

export type BiomeKey =
  | 'temperate_forest'
  | 'grasslands'
  | 'coast'
  | 'highland'
  | 'alpine'
  | 'marsh'
  | 'dryland'
  | 'snow'
  | 'volcanic';

export type RockFamily =
  | 'granite'
  | 'limestone'
  | 'basalt'
  | 'sandstone'
  | 'slate'
  | 'obsidian'
  | 'shale';

export type WeatherTendency =
  | 'clear'
  | 'mist'
  | 'rain'
  | 'heavy_downpour'
  | 'blizzard'
  | 'dust_storm'
  | 'ash_fall';

export type ArchitectureStyle =
  | 'timber_stone'
  | 'feudal_citadel'
  | 'coastal_harbor'
  | 'nordic_timber'
  | 'highland_keep'
  | 'thatched_wattle'
  | 'adobe_clay'
  | 'fortified_granite';

export interface BiomeMaterialConfig {
  /** Primary flat terrain color (sRGB) */
  groundColor: [number, number, number];
  /** Secondary grassy / fertile accent color (sRGB) */
  accentColor: [number, number, number];
  /** Exposed cliff & escarpment rock color (sRGB) */
  cliffColor: [number, number, number];
  /** Scree, gravel, or sub-soil transition color (sRGB) */
  subSoilColor: [number, number, number];
  /** Surface roughness [0.0 - 1.0] */
  roughness: number;
  /** Surface metalness/reflectivity [0.0 - 1.0] */
  metalness: number;
  /** Planar texture coordinate tiling factor */
  uvScale: number;
  /** Triplanar cliff projection tiling factor */
  cliffScale: number;
}

export interface BiomeElevationConfig {
  /** Typical minimum terrain elevation for this biome */
  minElevation: number;
  /** Typical maximum terrain elevation for this biome */
  maxElevation: number;
  /** Slope factor threshold (1.0 - ny) where cliff projection begins */
  slopeThreshold: number;
  /** Micro-noise perturbation amplitude in shader */
  noisePerturbation: number;
}

export interface BiomeAtmosphericConfig {
  /** Atmospheric exponential fog density */
  fogDensity: number;
  /** Atmospheric fog color tint [r, g, b] */
  fogColor: [number, number, number];
  /** Ambient lighting warmth tint [r, g, b] */
  ambientTint: [number, number, number];
  /** Primary regional weather tendency */
  weatherTendency: WeatherTendency;
}

export interface BiomeEcologyConfig {
  /** Dominant geological rock family */
  rockFamily: RockFamily;
  /** Density multiplier for ground foliage & grass tufts [0.0 - 1.0] */
  vegetationDensity: number;
  /** Density multiplier for forest trees & shrubs [0.0 - 1.0] */
  treeDensity: number;
  /** Density of surface boulders and rock formations [0.0 - 1.0] */
  rockDensity: number;
  /** Regional vernacular architectural motif */
  architectureStyle: ArchitectureStyle;
  /** Primary harvestable resource nodes */
  harvestableResources: string[];
}

export interface BiomeDefinition {
  key: BiomeKey;
  name: string;
  description: string;
  temperature: number; // Normalized [0.0 (frigid) - 1.0 (torrid)]
  moisture: number;    // Normalized [0.0 (arid) - 1.0 (waterlogged)]
  materials: BiomeMaterialConfig;
  elevation: BiomeElevationConfig;
  atmosphere: BiomeAtmosphericConfig;
  ecology: BiomeEcologyConfig;
}
