/**
 * REALM OF CROWNS — Biome Evaluation & Continuous Climate Blend Engine
 * Evaluates Whittaker macro-climates (temperature, moisture, elevation) with continuous smooth Hermite
 * blending across the 9 Realm biomes. Prevents unnatural seams or sudden texture cuts.
 */

import { BiomeDefinition, BiomeKey, BiomeMaterialConfig } from './BiomeTypes';
import { BIOME_DEFINITIONS } from './BiomeDefinitions';
import { SimplexNoise } from '../core/SimplexNoise';

export interface BiomeBlendSample {
  primary: BiomeDefinition;
  secondary: BiomeDefinition;
  blendFactor: number;
  weights: Map<BiomeKey, number>;
  material: BiomeMaterialConfig;
  slopeThreshold: number;
}

export class BiomeSystem {
  private _tempNoise: SimplexNoise;
  private _moistureNoise: SimplexNoise;
  private _macroScale: number;

  constructor(seed = 9876, macroScale = 0.003) {
    this._tempNoise = new SimplexNoise(seed);
    this._moistureNoise = new SimplexNoise(seed + 101);
    this._macroScale = macroScale;
  }

  /**
   * Sample normalized temperature [0.0 - 1.0] at world coordinates.
   * Decreases smoothly as altitude increases (adiabatic lapse rate).
   */
  public getTemperature(worldX: number, worldZ: number, elevation = 0): number {
    const raw = (this._tempNoise.fbm2D(worldX * this._macroScale, worldZ * this._macroScale, 3, 2.0, 0.5) + 1.0) * 0.5;
    const lapseRate = Math.max(0, elevation) * 0.012; // High peaks drop temperature
    return Math.max(0.0, Math.min(1.0, raw - lapseRate));
  }

  /**
   * Sample normalized moisture [0.0 - 1.0] at world coordinates.
   */
  public getMoisture(worldX: number, worldZ: number): number {
    const raw = (this._moistureNoise.fbm2D(worldX * this._macroScale, worldZ * this._macroScale, 3, 2.0, 0.5) + 1.0) * 0.5;
    return Math.max(0.0, Math.min(1.0, raw));
  }

  /**
   * Evaluates the dominant biome and continuous blend weights at given coordinates.
   */
  public sampleBiome(worldX: number, worldZ: number, elevation = 0): BiomeBlendSample {
    const temp = this.getTemperature(worldX, worldZ, elevation);
    const moist = this.getMoisture(worldX, worldZ);

    // Calculate Euclidean distance in (temperature, moisture, elevation) space to each biome center
    const distances: Array<{ key: BiomeKey; dist: number; weight: number }> = [];
    let totalInverseDist = 0;

    const keys = Object.keys(BIOME_DEFINITIONS) as BiomeKey[];
    for (const key of keys) {
      const def = BIOME_DEFINITIONS[key];
      const dTemp = (temp - def.temperature) * 1.4;
      const dMoist = (moist - def.moisture) * 1.0;

      // Elevation matching penalty
      let dElev = 0;
      if (elevation < def.elevation.minElevation) {
        dElev = (def.elevation.minElevation - elevation) * 0.04;
      } else if (elevation > def.elevation.maxElevation) {
        dElev = (elevation - def.elevation.maxElevation) * 0.04;
      }

      const dist = Math.sqrt(dTemp * dTemp + dMoist * dMoist + dElev * dElev) + 0.0001;
      const weight = 1.0 / Math.pow(dist, 3.5); // Higher power sharpens local cores while keeping borders smooth

      distances.push({ key, dist, weight });
      totalInverseDist += weight;
    }

    // Sort by smallest distance
    distances.sort((a, b) => a.dist - b.dist);

    const primaryKey = distances[0].key;
    const secondaryKey = distances[1].key;
    const primary = BIOME_DEFINITIONS[primaryKey];
    const secondary = BIOME_DEFINITIONS[secondaryKey];

    const weightsMap = new Map<BiomeKey, number>();
    for (const item of distances) {
      weightsMap.set(item.key, item.weight / totalInverseDist);
    }

    // Normalized blend factor between primary and secondary
    const w1 = weightsMap.get(primaryKey) || 1.0;
    const w2 = weightsMap.get(secondaryKey) || 0.0;
    const blendFactor = w2 / (w1 + w2 + 0.00001);

    // Interpolate material tokens
    const mat1 = primary.materials;
    const mat2 = secondary.materials;
    const t = blendFactor;

    const blendedMat: BiomeMaterialConfig = {
      groundColor: this._lerp3(mat1.groundColor, mat2.groundColor, t),
      accentColor: this._lerp3(mat1.accentColor, mat2.accentColor, t),
      cliffColor: this._lerp3(mat1.cliffColor, mat2.cliffColor, t),
      subSoilColor: this._lerp3(mat1.subSoilColor, mat2.subSoilColor, t),
      roughness: mat1.roughness * (1 - t) + mat2.roughness * t,
      metalness: mat1.metalness * (1 - t) + mat2.metalness * t,
      uvScale: mat1.uvScale * (1 - t) + mat2.uvScale * t,
      cliffScale: mat1.cliffScale * (1 - t) + mat2.cliffScale * t,
    };

    const slopeThreshold = primary.elevation.slopeThreshold * (1 - t) + secondary.elevation.slopeThreshold * t;

    return {
      primary,
      secondary,
      blendFactor,
      weights: weightsMap,
      material: blendedMat,
      slopeThreshold,
    };
  }

  private _lerp3(
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] {
    return [
      a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t,
      a[2] * (1 - t) + b[2] * t,
    ];
  }
}
