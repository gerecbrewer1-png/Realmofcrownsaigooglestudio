/**
 * REALM OF CROWNS — Server-Side MMO World Partition & AOI Manager
 * Phase 2.8 MMO Architecture
 * 
 * Reuses the Phase 2.7 spatial cell hashing model to calculate per-client
 * Area of Interest (AOI), distance hysteresis, and Network LOD (NET0-NET5).
 * 
 * The server decides relevance. Clients never decide which other clients receive state.
 */

import { ServerMMOEntity, ServerEntityRegistry } from './mmoEntityRegistry';

export enum ServerNetworkLOD {
  NET0_CRITICAL = 0, // 30 Hz: Player, target, close combat (<120m)
  NET1_NEAR = 1,     // 15 Hz: Near ships (<250m)
  NET2_LOCAL = 2,    // 5 Hz: Local ships (<450m)
  NET3_DISTANT = 3,  // 1 Hz: Distant horizon ships (<800m)
  NET4_STRATEGIC = 4,// 0.2 Hz: Sector event updates (<2000m)
  NET5_IRRELEVANT = 5// 0 Hz: Culled from network replication (>2000m or outside AOI)
}

export const NETWORK_LOD_INTERVAL_TICKS: Record<ServerNetworkLOD, number> = {
  [ServerNetworkLOD.NET0_CRITICAL]: 1,   // Every tick (30 Hz)
  [ServerNetworkLOD.NET1_NEAR]: 2,       // Every 2 ticks (15 Hz)
  [ServerNetworkLOD.NET2_LOCAL]: 6,      // Every 6 ticks (5 Hz)
  [ServerNetworkLOD.NET3_DISTANT]: 30,   // Every 30 ticks (1 Hz)
  [ServerNetworkLOD.NET4_STRATEGIC]: 150,// Every 150 ticks (0.2 Hz)
  [ServerNetworkLOD.NET5_IRRELEVANT]: 999999, // Culled
};

export interface ClientAOIState {
  connectionId: string;
  playerId: string;
  controlledEntityId: string;
  position: { x: number; z: number };
  targetEntityId?: string;
  // Currently subscribed entities in client's AOI: entityId -> NetworkLOD
  subscribedEntities: Map<string, ServerNetworkLOD>;
  // Entities in prefetch band (450m - 600m)
  prefetchEntityIds: Set<string>;
}

export interface AOIUpdateResult {
  spawns: ServerMMOEntity[];
  despawns: string[]; // entityIds
  activeDeltas: { entity: ServerMMOEntity; lod: ServerNetworkLOD }[];
}

export class ServerWorldPartition {
  private cellSize = 150; // 150m grid
  private enterRadius = 450;
  private leaveRadius = 500; // 50m hysteresis
  private prefetchRadius = 600;
  private maxAOIEntities = 128; // Mobile safe ceiling

  // Spatial hash: cellKey -> Set<entityId>
  private cellBuckets: Map<string, Set<string>> = new Map();
  private entityCellMap: Map<string, string> = new Map();

  public getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}:${cz}`;
  }

  /**
   * Updates spatial grid index for all entities in the registry.
   */
  public updateSpatialGrid(entities: ServerMMOEntity[]): void {
    this.cellBuckets.clear();
    this.entityCellMap.clear();

    for (const entity of entities) {
      const key = this.getCellKey(entity.transform.x, entity.transform.z);
      this.entityCellMap.set(entity.id, key);

      let bucket = this.cellBuckets.get(key);
      if (!bucket) {
        bucket = new Set();
        this.cellBuckets.set(key, bucket);
      }
      bucket.add(entity.id);
    }
  }

  /**
   * Phase 2.9 Broadphase: Returns entity IDs in the current and directly adjacent cells.
   * Useful for projectile continuous collision detection.
   */
  public getCandidateEntitiesForProjectile(x: number, z: number, searchRadius: number = 20): string[] {
    const candidates: string[] = [];
    const minCx = Math.floor((x - searchRadius) / this.cellSize);
    const maxCx = Math.floor((x + searchRadius) / this.cellSize);
    const minCz = Math.floor((z - searchRadius) / this.cellSize);
    const maxCz = Math.floor((z + searchRadius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.cellBuckets.get(`${cx}:${cz}`);
        if (bucket) {
          for (const id of bucket) {
            candidates.push(id);
          }
        }
      }
    }
    return candidates;
  }

  /**
   * Evaluates AOI subscriptions for a specific client.
   * Employs 50m hysteresis band to prevent boundary flip-flop jitter.
   */
  public evaluateClientAOI(
    client: ClientAOIState,
    registry: ServerEntityRegistry,
    serverTick: number
  ): AOIUpdateResult {
    const px = client.position.x;
    const pz = client.position.z;
    const currentSubscribed = client.subscribedEntities;
    const nextSubscribed: Map<string, ServerNetworkLOD> = new Map();
    const nextPrefetch: Set<string> = new Set();

    const spawns: ServerMMOEntity[] = [];
    const despawns: string[] = [];
    const activeDeltas: { entity: ServerMMOEntity; lod: ServerNetworkLOD }[] = [];

    // Query candidate cells within prefetch radius
    const cellRadius = Math.ceil(this.prefetchRadius / this.cellSize);
    const centerCx = Math.floor(px / this.cellSize);
    const centerCz = Math.floor(pz / this.cellSize);

    const candidateIds = new Set<string>();
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCx + dx}:${centerCz + dz}`;
        const bucket = this.cellBuckets.get(key);
        if (bucket) {
          for (const id of bucket) {
            candidateIds.add(id);
          }
        }
      }
    }

    // Rank candidates by distance and importance
    interface CandidateScored {
      entity: ServerMMOEntity;
      dist: number;
      lod: ServerNetworkLOD;
      score: number;
    }

    const scoredCandidates: CandidateScored[] = [];

    for (const id of candidateIds) {
      // Do not replicate client's own ship back to itself in AOI list
      if (id === client.controlledEntityId) continue;

      const entity = registry.get(id);
      if (!entity) continue;

      const dist = Math.hypot(entity.transform.x - px, entity.transform.z - pz);
      const wasSubscribed = currentSubscribed.has(id);

      // Check AOI bounds with hysteresis
      const threshold = wasSubscribed ? this.leaveRadius : this.enterRadius;
      if (dist > threshold) {
        if (dist <= this.prefetchRadius) {
          nextPrefetch.add(id);
        }
        continue;
      }

      // Assign Network LOD tier based on distance and combat priority
      let lod = ServerNetworkLOD.NET2_LOCAL;
      let priorityScore = 1000 - dist;

      if (id === client.targetEntityId || (entity.inCombat && dist < 120)) {
        lod = ServerNetworkLOD.NET0_CRITICAL;
        priorityScore += 5000;
      } else if (dist < 120) {
        lod = ServerNetworkLOD.NET0_CRITICAL;
        priorityScore += 3000;
      } else if (dist < 250) {
        lod = ServerNetworkLOD.NET1_NEAR;
        priorityScore += 1500;
      } else if (dist < 450) {
        lod = ServerNetworkLOD.NET2_LOCAL;
        priorityScore += 500;
      } else if (dist < 800) {
        lod = ServerNetworkLOD.NET3_DISTANT;
        priorityScore += 100;
      } else {
        lod = ServerNetworkLOD.NET4_STRATEGIC;
      }

      // Player ships get priority boost
      if (entity.type === 'player_ship') {
        priorityScore += 800;
      }

      scoredCandidates.push({ entity, dist, lod, score: priorityScore });
    }

    // Sort descending by priority score and enforce max AOI cap
    scoredCandidates.sort((a, b) => b.score - a.score);
    const cappedCandidates = scoredCandidates.slice(0, this.maxAOIEntities);

    for (const item of cappedCandidates) {
      nextSubscribed.set(item.entity.id, item.lod);

      // If was not subscribed before, this is a new SPAWN
      if (!currentSubscribed.has(item.entity.id)) {
        spawns.push(item.entity);
      }

      // Check if entity should replicate a delta on this tick according to its LOD interval
      const interval = NETWORK_LOD_INTERVAL_TICKS[item.lod];
      if (serverTick % interval === 0) {
        activeDeltas.push({ entity: item.entity, lod: item.lod });
      }
    }

    // Identify despawns (entities that were subscribed but are no longer in nextSubscribed)
    for (const [id] of currentSubscribed) {
      if (!nextSubscribed.has(id)) {
        despawns.push(id);
      }
    }

    // Commit new state
    client.subscribedEntities = nextSubscribed;
    client.prefetchEntityIds = nextPrefetch;

    return { spawns, despawns, activeDeltas };
  }
}
