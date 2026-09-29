/**
 * Realm of Crowns - MMO Area of Interest (AOI) & Relevance Interface (Phase 2.6)
 * 
 * Provides the architectural foundation for Phase 2.7 MMO networking.
 * Bridges Simulation LOD with server-side network replication, spatial grid cells,
 * and entity relevance tiers without requiring the client to track every global MMO entity.
 */

import { SimulationTier } from './VoyageSimulationLOD';
export { NetworkLOD, MMOWorldPartitionManager } from './MMOWorldPartition';

export enum NetworkPriority {
  CRITICAL_REALTIME = 0, // Broadside combat, projectile impacts, collision (60 Hz sync)
  HIGH_INTERACTIVE = 1,  // Nearby ships, steering, sail adjustment (20-30 Hz sync)
  MEDIUM_REGIONAL = 2,   // Visual fleet maneuvering within sight (5-10 Hz sync)
  LOW_HORIZON = 3,       // Distant ships on horizon (1-2 Hz sync)
  DORMANT_STRATEGIC = 4, // Far-off MMO simulated entities (Dead-reckoning only)
}

export interface NetworkEntityRelevance {
  entityId: string;
  simTier: SimulationTier;
  networkPriority: NetworkPriority;
  distanceToPlayer: number;
  isCombatRelevant: boolean;
  isQuestRelevant: boolean;
  isFleetMember: boolean;
  spatialCell: string; // e.g. "cell_12_4"
  replicationRateHz: number;
  lastSyncTimestamp: number;
}

export class VoyageAreaOfInterest {
  public static calculateRelevance(
    entityId: string,
    simTier: SimulationTier,
    distanceToPlayer: number,
    isCombatRelevant = false,
    isQuestRelevant = false,
    isFleetMember = false,
    cellCoord = '0,0'
  ): NetworkEntityRelevance {
    let networkPriority = NetworkPriority.LOW_HORIZON;
    let replicationRateHz = 1.0;

    if (isCombatRelevant || simTier === SimulationTier.SIM0_IMMEDIATE) {
      networkPriority = NetworkPriority.CRITICAL_REALTIME;
      replicationRateHz = 30.0;
    } else if (isFleetMember || isQuestRelevant || simTier === SimulationTier.SIM1_NEARBY) {
      networkPriority = NetworkPriority.HIGH_INTERACTIVE;
      replicationRateHz = 15.0;
    } else if (simTier === SimulationTier.SIM2_REGIONAL) {
      networkPriority = NetworkPriority.MEDIUM_REGIONAL;
      replicationRateHz = 5.0;
    } else if (simTier === SimulationTier.SIM3_DISTANT) {
      networkPriority = NetworkPriority.LOW_HORIZON;
      replicationRateHz = 1.0;
    } else {
      networkPriority = NetworkPriority.DORMANT_STRATEGIC;
      replicationRateHz = 0.2;
    }

    return {
      entityId,
      simTier,
      networkPriority,
      distanceToPlayer,
      isCombatRelevant,
      isQuestRelevant,
      isFleetMember,
      spatialCell: cellCoord,
      replicationRateHz,
      lastSyncTimestamp: Date.now(),
    };
  }
}
