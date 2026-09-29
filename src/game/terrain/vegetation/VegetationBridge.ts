/**
 * REALM OF CROWNS — Biome Vegetation & Foliage Bridge
 * Computes deterministic vegetation, tree, and rock scatter distributions
 * conditioned on biome ecology, elevation, and terrain slope thresholds.
 */

import * as pc from 'playcanvas';
import { BiomeKey } from '../biomes/BiomeTypes';
import { BIOME_DEFINITIONS } from '../biomes/BiomeDefinitions';
import { RealmTerrainManager } from '../RealmTerrainManager';
import { SimplexNoise } from '../core/SimplexNoise';

export type PropType = 'tree_oak' | 'tree_pine' | 'bush' | 'grass_tuft' | 'boulder' | 'reed';

export interface VegetationInstance {
  type: PropType;
  position: pc.Vec3;
  rotationY: number;
  scale: number;
  biome: BiomeKey;
}

export class VegetationBridge {
  private _noise: SimplexNoise;

  constructor(seed = 4455) {
    this._noise = new SimplexNoise(seed);
  }

  /**
   * Generates candidate foliage and prop instances across the terrain footprint.
   */
  public generateScatter(
    terrain: RealmTerrainManager,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    densityMultiplier = 1.0
  ): VegetationInstance[] {
    const instances: VegetationInstance[] = [];
    const biome = terrain.currentBiome;
    const def = BIOME_DEFINITIONS[biome];
    if (!def) return instances;

    const ecology = def.ecology;
    const step = 4.0; // 4m grid sampling

    for (let z = bounds.minZ; z <= bounds.maxZ; z += step) {
      for (let x = bounds.minX; x <= bounds.maxX; x += step) {
        // Natural jitter
        const jx = x + this._noise.noise2D(x * 0.2, z * 0.2) * 1.8;
        const jz = z + this._noise.noise2D(z * 0.2, x * 0.2) * 1.8;

        // Skip castle center courtyard (radius ~22m)
        const distFromCenter = Math.sqrt(jx * jx + jz * jz);
        if (distFromCenter < 22.0) continue;

        // Query terrain height & normal
        const normal = terrain.getNormalAt(jx, jz);
        const slope = Math.max(0, 1.0 - normal.y);
        const height = terrain.getHeightAt(jx, jz);

        // Sheer cliffs (slope > 0.42) shed all trees and dense vegetation
        if (slope > 0.42) {
          // Occasional small rock boulder clinging to shelf
          if (this._noise.noise2D(jx * 0.1, jz * 0.1) > 0.65 && ecology.rockDensity > 0.3) {
            instances.push({
              type: 'boulder',
              position: new pc.Vec3(jx, height, jz),
              rotationY: Math.random() * 360,
              scale: 0.6 + Math.random() * 0.8,
              biome,
            });
          }
          continue;
        }

        // Noise distribution density check
        const densityVal = (this._noise.fbm2D(jx * 0.05, jz * 0.05, 2, 2.0, 0.5) + 1.0) * 0.5;

        // 1. Trees check
        if (densityVal < ecology.treeDensity * densityMultiplier * 0.35) {
          const isEvergreen = biome === 'snow' || biome === 'alpine' || biome === 'highland';
          instances.push({
            type: isEvergreen ? 'tree_pine' : 'tree_oak',
            position: new pc.Vec3(jx, height, jz),
            rotationY: Math.random() * 360,
            scale: 0.8 + Math.random() * 0.5,
            biome,
          });
          continue;
        }

        // 2. Bushes & Shrubs check
        if (densityVal < (ecology.treeDensity + ecology.vegetationDensity * 0.2) * densityMultiplier) {
          instances.push({
            type: biome === 'marsh' ? 'reed' : 'bush',
            position: new pc.Vec3(jx, height, jz),
            rotationY: Math.random() * 360,
            scale: 0.7 + Math.random() * 0.4,
            biome,
          });
          continue;
        }

        // 3. Surface Boulders
        if (this._noise.noise2D(jx * 0.15, jz * 0.15) > (1.0 - ecology.rockDensity * 0.35)) {
          instances.push({
            type: 'boulder',
            position: new pc.Vec3(jx, height, jz),
            rotationY: Math.random() * 360,
            scale: 0.5 + Math.random() * 1.2,
            biome,
          });
        }
      }
    }

    return instances;
  }
}
