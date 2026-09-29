/**
 * Realm of Crowns — Mobile-Optimized Simulation Tiers
 * Partitions world entities into distance-based tiers to ensure 60 FPS performance on mobile devices.
 */

import { NPCEntity, Vector3D } from '../npc/npcTypes';

export type SimulationTier = 'NEAR' | 'MID' | 'FAR';

export interface TierThresholds {
  nearDistSq: number; // Default: 35m squared = 1225
  midDistSq: number;  // Default: 80m squared = 6400
}

export class SimulationTierSystem {
  public static readonly DEFAULT_THRESHOLDS: TierThresholds = {
    nearDistSq: 35 * 35,
    midDistSq: 80 * 80,
  };

  /**
   * Determines the active simulation fidelity tier based on distance from the player camera / hero
   */
  public static getEntityTier(
    entityPos: Vector3D,
    playerFocusPos: Vector3D,
    thresholds: TierThresholds = this.DEFAULT_THRESHOLDS
  ): SimulationTier {
    const dx = entityPos.x - playerFocusPos.x;
    const dz = entityPos.z - playerFocusPos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= thresholds.nearDistSq) return 'NEAR';
    if (distSq <= thresholds.midDistSq) return 'MID';
    return 'FAR';
  }

  /**
   * Groups entities into simulation tier buckets for batch processing
   */
  public static partitionEntities(
    entities: NPCEntity[],
    playerFocusPos: Vector3D,
    thresholds: TierThresholds = this.DEFAULT_THRESHOLDS
  ): { near: NPCEntity[]; mid: NPCEntity[]; far: NPCEntity[] } {
    const near: NPCEntity[] = [];
    const mid: NPCEntity[] = [];
    const far: NPCEntity[] = [];

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const tier = this.getEntityTier(e.position, playerFocusPos, thresholds);
      if (tier === 'NEAR') near.push(e);
      else if (tier === 'MID') mid.push(e);
      else far.push(e);
    }

    return { near, mid, far };
  }
}
