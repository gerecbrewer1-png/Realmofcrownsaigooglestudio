/**
 * REALM OF CROWNS — MMO Spatial World Partition, Area of Interest & Network LOD
 * Phase 2.7 Revised MMO Architecture
 * 
 * Provides the authoritative spatial hierarchy, multi-factor Area of Interest (AOI),
 * Network LOD tiers (NET0-NET5), hysteresis, prefetch band, compact delta encoding,
 * and client-side interpolation.
 */

import { SimulationTier } from './VoyageSimulationLOD';

// ============================================================================
// 1. MMO WORLD HIERARCHY & DATA STRUCTURES
// ============================================================================

export type MMOEntityType =
  | 'player'
  | 'ship_player'
  | 'ship_pirate'
  | 'ship_merchant'
  | 'ship_military'
  | 'projectile_cannonball'
  | 'npc_army'
  | 'port_haven'
  | 'settlement'
  | 'wildlife';

export interface WorldCoord2D {
  x: number;
  z: number;
}

export interface MMOEntityTransform {
  x: number;
  y: number;
  z: number;
  heading: number; // in radians, 0 = North
  speedKnots: number;
}

/**
 * Compact Procedural Definition for Ships (Phase 4 Shipwright Ready)
 * Avoids transmitting raw 3D mesh geometry over the network.
 */
export interface ProceduralShipConfig {
  definitionId: string;
  seed: number;
  culture: 'norman' | 'nordic' | 'byzantine' | 'moorish' | 'corsair';
  shipClass: 'sloop' | 'brigantine' | 'frigate' | 'galleon' | 'war_galleon';
  hullConfiguration: number;
  sailConfiguration: number;
  primaryColor: string;
  secondaryColor: string;
  faction: string;
  damageState: number; // 0.0 (pristine) to 1.0 (wrecked)
}

/**
 * Compact Procedural Definition for Buildings & Settlements
 * Avoids transmitting raw architectural meshes over the network.
 */
export interface ProceduralBuildingConfig {
  definitionId: string;
  seed: number;
  culture: string;
  historicalPeriod: string;
  function: 'citadel' | 'barracks' | 'market' | 'dock' | 'lumber_mill' | 'watchtower';
  ownership: string;
  upgradeState: number; // Level 1 to 30
  damageState: number;
}

export interface MMOAuthoritativeEntity {
  id: string;
  type: MMOEntityType;
  name: string;
  transform: MMOEntityTransform;
  health: number;
  maxHealth: number;
  faction: string;
  shipConfig?: ProceduralShipConfig;
  buildingConfig?: ProceduralBuildingConfig;
  inCombat: boolean;
  targetEntityId?: string;
  isThreatToPlayer?: boolean;
  isFleetMember?: boolean;
  isQuestTarget?: boolean;
  lastSimulatedTimestamp: number;
}

// ============================================================================
// 2. NETWORK LOD TIERS (NET0 - NET5)
// ============================================================================

export enum NetworkLOD {
  NET0_CRITICAL = 0, // 30 Hz: Player, target, close combat (<120m), collision/incoming projectile
  NET1_NEAR = 1,     // 15 Hz: Near ships, near combat (<250m)
  NET2_LOCAL = 2,    // 5 Hz: Visible non-critical entities (<450m)
  NET3_DISTANT = 3,  // 1 Hz: Distant horizon fleet, distant quest targets (<800m)
  NET4_STRATEGIC = 4,// 0.2 Hz: Sector event updates (<2000m)
  NET5_IRRELEVANT = 5// 0 Hz: Culled from client network replication (>2000m or outside AOI)
}

export const NETWORK_LOD_RATES_HZ: Record<NetworkLOD, number> = {
  [NetworkLOD.NET0_CRITICAL]: 30.0,
  [NetworkLOD.NET1_NEAR]: 15.0,
  [NetworkLOD.NET2_LOCAL]: 5.0,
  [NetworkLOD.NET3_DISTANT]: 1.0,
  [NetworkLOD.NET4_STRATEGIC]: 0.2,
  [NetworkLOD.NET5_IRRELEVANT]: 0.0,
};

// ============================================================================
// 3. NETWORK PACKETS & DELTA ENCODING
// ============================================================================

export interface EntityIntroductionPacket {
  packetType: 'intro';
  entityId: string;
  entityType: MMOEntityType;
  name: string;
  faction: string;
  initialTransform: MMOEntityTransform;
  health: number;
  maxHealth: number;
  shipConfig?: ProceduralShipConfig;
  buildingConfig?: ProceduralBuildingConfig;
  stateFlags: number; // Bitmask: bit 0 = inCombat, bit 1 = isSinking, bit 2 = sailsFull
  serverTimestamp: number;
}

export interface EntityDeltaPacket {
  packetType: 'delta';
  entityId: string;
  serverTimestamp: number;
  // Compact quantized transforms
  x: number;
  z: number;
  headingQuantized: number; // 0..255 (quantized radian: heading / (2 * Math.PI) * 255)
  speedKnots: number;
  health: number;
  stateFlags: number;
}

export interface EntityLeavePacket {
  packetType: 'leave';
  entityId: string;
  reason: 'out_of_aoi' | 'destroyed' | 'zoned_out';
  serverTimestamp: number;
}

// ============================================================================
// 4. CLIENT INTERPOLATION ENGINE (SMOOTH RENDERING BETWEEN NETWORK TICKS)
// ============================================================================

export interface EntitySnapshot {
  timestamp: number;
  x: number;
  z: number;
  heading: number;
  speedKnots: number;
  health: number;
  stateFlags: number;
}

export class ClientEntityInterpolator {
  private snapshots: EntitySnapshot[] = [];
  private maxSnapshots = 12;
  private currentInterpolated: MMOEntityTransform;

  constructor(initial: MMOEntityTransform) {
    this.currentInterpolated = { ...initial };
    this.snapshots.push({
      timestamp: performance.now(),
      x: initial.x,
      z: initial.z,
      heading: initial.heading,
      speedKnots: initial.speedKnots,
      health: 100,
      stateFlags: 0,
    });
  }

  public pushDelta(delta: EntityDeltaPacket, localTimestamp = performance.now()): void {
    const heading = (delta.headingQuantized / 255) * (Math.PI * 2);
    this.snapshots.push({
      timestamp: localTimestamp,
      x: delta.x,
      z: delta.z,
      heading,
      speedKnots: delta.speedKnots,
      health: delta.health,
      stateFlags: delta.stateFlags,
    });

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Samples smooth position and heading at render time using Hermite/linear interpolation.
   * Interpolation delay of ~100ms compensates for network packet jitter.
   */
  public sample(renderTimestamp: number, interpDelayMs = 100): MMOEntityTransform {
    if (this.snapshots.length === 0) {
      return this.currentInterpolated;
    }

    if (this.snapshots.length === 1) {
      const snap = this.snapshots[0];
      this.currentInterpolated.x = snap.x;
      this.currentInterpolated.z = snap.z;
      this.currentInterpolated.heading = snap.heading;
      this.currentInterpolated.speedKnots = snap.speedKnots;
      return this.currentInterpolated;
    }

    const targetTime = renderTimestamp - interpDelayMs;

    // If targetTime is behind the oldest snapshot, clamp to oldest
    if (targetTime <= this.snapshots[0].timestamp) {
      const snap = this.snapshots[0];
      this.currentInterpolated.x = snap.x;
      this.currentInterpolated.z = snap.z;
      this.currentInterpolated.heading = snap.heading;
      this.currentInterpolated.speedKnots = snap.speedKnots;
      return this.currentInterpolated;
    }

    // If targetTime is ahead of newest snapshot, dead-reckon forward
    const newest = this.snapshots[this.snapshots.length - 1];
    if (targetTime >= newest.timestamp) {
      const dtSec = Math.min((targetTime - newest.timestamp) / 1000, 0.5);
      const moveDist = (newest.speedKnots * 0.514444) * dtSec;
      this.currentInterpolated.x = newest.x + Math.sin(newest.heading) * moveDist;
      this.currentInterpolated.z = newest.z + Math.cos(newest.heading) * moveDist;
      this.currentInterpolated.heading = newest.heading;
      this.currentInterpolated.speedKnots = newest.speedKnots;
      return this.currentInterpolated;
    }

    // Find the two surrounding snapshots for interpolation
    let p0 = this.snapshots[0];
    let p1 = this.snapshots[1];
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].timestamp <= targetTime && this.snapshots[i + 1].timestamp >= targetTime) {
        p0 = this.snapshots[i];
        p1 = this.snapshots[i + 1];
        break;
      }
    }

    const timeSpan = Math.max(1, p1.timestamp - p0.timestamp);
    const alpha = Math.max(0, Math.min(1, (targetTime - p0.timestamp) / timeSpan));

    // Linear position interpolation
    this.currentInterpolated.x = p0.x + (p1.x - p0.x) * alpha;
    this.currentInterpolated.z = p0.z + (p1.z - p0.z) * alpha;

    // Angular spherical interpolation (shortest angular path)
    let dHeading = p1.heading - p0.heading;
    while (dHeading > Math.PI) dHeading -= Math.PI * 2;
    while (dHeading < -Math.PI) dHeading += Math.PI * 2;
    this.currentInterpolated.heading = p0.heading + dHeading * alpha;
    this.currentInterpolated.speedKnots = p0.speedKnots + (p1.speedKnots - p0.speedKnots) * alpha;

    return this.currentInterpolated;
  }
}

// ============================================================================
// 5. AREA OF INTEREST & SPATIAL WORLD PARTITION MANAGER
// ============================================================================

export interface AOIConfig {
  enterRadius: number;    // Radius to enter active AOI (e.g. 450m)
  leaveRadius: number;    // Radius to leave active AOI (e.g. 500m -> 50m hysteresis)
  prefetchRadius: number; // Outer prefetch band (e.g. 600m -> 100m buffer)
  cellSize: number;       // Uniform grid cell dimension (e.g. 150m)
  maxHighRateEntities: number; // Density budget capping for mobile (e.g. 48)
  maxTotalAOIEntities: number; // Max total entities client replicates (e.g. 128)
}

export const DEFAULT_AOI_CONFIG: AOIConfig = {
  enterRadius: 450,
  leaveRadius: 500,
  prefetchRadius: 600,
  cellSize: 150,
  maxHighRateEntities: 48,
  maxTotalAOIEntities: 128,
};

export interface ClientReplicatedEntity {
  entity: MMOAuthoritativeEntity;
  networkLOD: NetworkLOD;
  simTier: SimulationTier;
  distanceToPlayer: number;
  relevanceScore: number;
  lastPacketSentTimestamp: number;
  interpolator: ClientEntityInterpolator;
  isInPrefetch: boolean;
}

export class MMOWorldPartitionManager {
  private config: AOIConfig;
  private invCellSize: number;

  // Authoritative World Hierarchy
  // World -> Region -> Zone -> Cell -> Entities
  private worldEntities: Map<string, MMOAuthoritativeEntity> = new Map();
  private cellBuckets: Map<string, Set<string>> = new Map();
  private entityCellMap: Map<string, string> = new Map();

  // Connected Client AOI State (Per-Player Viewport)
  private playerPosition: WorldCoord2D = { x: 0, z: 0 };
  private playerTargetEntityId: string | null = null;
  private activeAOISet: Map<string, ClientReplicatedEntity> = new Map();
  private prefetchSet: Set<string> = new Set();

  // Metrics and Diagnostics
  private diagnostics = {
    totalWorldEntities: 0,
    aoiCount: 0,
    prefetchCount: 0,
    netTiers: [0, 0, 0, 0, 0, 0], // NET0 to NET5 counts
    simTiers: [0, 0, 0, 0, 0],    // SIM0 to SIM4 counts
    incomingBytesPerSec: 0,
    messagesPerSec: 0,
    transformUpdatesPerSec: 0,
    currentRegion: 'Archipelago_Central',
    currentZone: 'Sovereign_Haven',
    currentCell: '0,0',
  };

  // Reusable candidate buffer to prevent GC pressure
  private candidateBuffer: string[] = [];

  constructor(config: Partial<AOIConfig> = {}) {
    this.config = { ...DEFAULT_AOI_CONFIG, ...config };
    this.invCellSize = 1 / this.config.cellSize;
  }

  // --- HIERARCHICAL SPATIAL INDEXING ---

  private hashCell(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getCellCoord(val: number): number {
    return Math.floor(val * this.invCellSize);
  }

  public registerEntity(entity: MMOAuthoritativeEntity): void {
    this.worldEntities.set(entity.id, entity);
    this.updateEntitySpatialCell(entity);
    this.diagnostics.totalWorldEntities = this.worldEntities.size;
  }

  public unregisterEntity(entityId: string): void {
    const oldCell = this.entityCellMap.get(entityId);
    if (oldCell) {
      const bucket = this.cellBuckets.get(oldCell);
      if (bucket) {
        bucket.delete(entityId);
        if (bucket.size === 0) this.cellBuckets.delete(oldCell);
      }
      this.entityCellMap.delete(entityId);
    }
    this.worldEntities.delete(entityId);
    this.activeAOISet.delete(entityId);
    this.prefetchSet.delete(entityId);
    this.diagnostics.totalWorldEntities = this.worldEntities.size;
  }

  public updateEntitySpatialCell(entity: MMOAuthoritativeEntity): void {
    const cx = this.getCellCoord(entity.transform.x);
    const cz = this.getCellCoord(entity.transform.z);
    const newCell = this.hashCell(cx, cz);
    const oldCell = this.entityCellMap.get(entity.id);

    if (oldCell === newCell) return;

    if (oldCell) {
      const oldBucket = this.cellBuckets.get(oldCell);
      if (oldBucket) {
        oldBucket.delete(entity.id);
        if (oldBucket.size === 0) this.cellBuckets.delete(oldCell);
      }
    }

    let newBucket = this.cellBuckets.get(newCell);
    if (!newBucket) {
      newBucket = new Set();
      this.cellBuckets.set(newCell, newBucket);
    }
    newBucket.add(entity.id);
    this.entityCellMap.set(entity.id, newCell);
  }

  // --- MULTI-FACTOR RELEVANCE SCORING ---

  /**
   * Computes multi-factor gameplay relevance score.
   * Distance alone is NOT enough — factors combat, targets, projectiles, and fleet.
   */
  public calculateRelevanceScore(
    entity: MMOAuthoritativeEntity,
    distance: number
  ): number {
    // Base score from inverted distance (closer = higher)
    let score = Math.max(0, 1000 - distance);

    // Incoming Projectile / Cannonball Threat (+250) -> Highest priority
    if (entity.type === 'projectile_cannonball' || entity.isThreatToPlayer) {
      score += 250;
    }

    // Direct Target or Attacker (+180)
    if (entity.id === this.playerTargetEntityId || entity.targetEntityId === 'player_hero') {
      score += 180;
    }

    // Active Combat Engagement (+100)
    if (entity.inCombat) {
      score += 100;
    }

    // Quest Objective Target (+60)
    if (entity.isQuestTarget) {
      score += 60;
    }

    // Fleet / Guild / Allied Formation (+40)
    if (entity.isFleetMember) {
      score += 40;
    }

    return score;
  }

  // --- AREA OF INTEREST UPDATE LOOP ---

  public setPlayerPosition(x: number, z: number, targetEntityId: string | null = null): void {
    this.playerPosition.x = x;
    this.playerPosition.z = z;
    this.playerTargetEntityId = targetEntityId;

    const pcx = this.getCellCoord(x);
    const pcz = this.getCellCoord(z);
    this.diagnostics.currentCell = this.hashCell(pcx, pcz);
  }

  /**
   * Executes the full AOI and Network LOD determination.
   * - O(1) cell query of candidate entities within prefetch radius.
   * - Hysteresis check (enter vs leave thresholds).
   * - Multi-factor scoring.
   * - Density budget sorting.
   * - Network LOD and Simulation LOD tier assignment.
   */
  public updateAOI(currentTime = performance.now()): {
    enteredEntities: EntityIntroductionPacket[];
    leftEntities: EntityLeavePacket[];
    deltaPackets: EntityDeltaPacket[];
  } {
    const enteredEntities: EntityIntroductionPacket[] = [];
    const leftEntities: EntityLeavePacket[] = [];
    const deltaPackets: EntityDeltaPacket[] = [];

    const px = this.playerPosition.x;
    const pz = this.playerPosition.z;

    const prefetchRadius = this.config.prefetchRadius;
    const enterRadius = this.config.enterRadius;
    const leaveRadius = this.config.leaveRadius;

    // 1. Determine cell radius for spatial query
    const cellRadius = Math.ceil(prefetchRadius * this.invCellSize);
    const pcx = this.getCellCoord(px);
    const pcz = this.getCellCoord(pz);

    this.candidateBuffer.length = 0;
    for (let cx = pcx - cellRadius; cx <= pcx + cellRadius; cx++) {
      for (let cz = pcz - cellRadius; cz <= pcz + cellRadius; cz++) {
        const key = this.hashCell(cx, cz);
        const bucket = this.cellBuckets.get(key);
        if (bucket) {
          for (const id of bucket) {
            this.candidateBuffer.push(id);
          }
        }
      }
    }

    // 2. Score all candidate entities
    interface ScoredCandidate {
      entity: MMOAuthoritativeEntity;
      distance: number;
      score: number;
    }

    const candidates: ScoredCandidate[] = [];
    const candidateSet = new Set<string>();

    for (let i = 0; i < this.candidateBuffer.length; i++) {
      const id = this.candidateBuffer[i];
      candidateSet.add(id);
      const entity = this.worldEntities.get(id);
      if (!entity) continue;

      const dx = entity.transform.x - px;
      const dz = entity.transform.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= prefetchRadius) {
        const score = this.calculateRelevanceScore(entity, dist);
        candidates.push({ entity, distance: dist, score });
      }
    }

    // 3. Sort candidates by relevance score descending
    candidates.sort((a, b) => b.score - a.score);

    // 4. Reset diagnostics tier counters
    this.diagnostics.netTiers.fill(0);
    this.diagnostics.simTiers.fill(0);

    const nextActiveAOISet: Map<string, ClientReplicatedEntity> = new Map();
    const nextPrefetchSet: Set<string> = new Set();

    let highRateCount = 0;
    let totalAOICount = 0;

    for (const cand of candidates) {
      const { entity, distance, score } = cand;
      const wasActive = this.activeAOISet.has(entity.id);

      // Check AOI Hysteresis:
      // If already active, it leaves at leaveRadius (500m).
      // If not yet active, it enters at enterRadius (450m).
      const effectiveRadius = wasActive ? leaveRadius : enterRadius;

      if (distance <= effectiveRadius && totalAOICount < this.config.maxTotalAOIEntities) {
        totalAOICount++;

        // Determine Network LOD Tier based on score, distance, and density budget
        let netLOD: NetworkLOD;
        let simTier: SimulationTier;

        const isCritical =
          entity.type === 'projectile_cannonball' ||
          entity.isThreatToPlayer ||
          entity.id === this.playerTargetEntityId ||
          (entity.inCombat && distance < 120);

        if (isCritical) {
          netLOD = NetworkLOD.NET0_CRITICAL;
          simTier = SimulationTier.SIM0_IMMEDIATE;
          highRateCount++;
        } else if (distance < 200 && highRateCount < this.config.maxHighRateEntities) {
          netLOD = NetworkLOD.NET1_NEAR;
          simTier = SimulationTier.SIM1_NEARBY;
          highRateCount++;
        } else if (distance < 450) {
          netLOD = NetworkLOD.NET2_LOCAL;
          simTier = SimulationTier.SIM2_REGIONAL;
        } else {
          netLOD = NetworkLOD.NET3_DISTANT;
          simTier = SimulationTier.SIM3_DISTANT;
        }

        this.diagnostics.netTiers[netLOD]++;
        this.diagnostics.simTiers[simTier]++;

        let clientEntity = this.activeAOISet.get(entity.id);
        if (!clientEntity) {
          // Newly entered AOI! Emit Introduction Packet
          const introPacket: EntityIntroductionPacket = {
            packetType: 'intro',
            entityId: entity.id,
            entityType: entity.type,
            name: entity.name,
            faction: entity.faction,
            initialTransform: { ...entity.transform },
            health: entity.health,
            maxHealth: entity.maxHealth,
            shipConfig: entity.shipConfig,
            buildingConfig: entity.buildingConfig,
            stateFlags: (entity.inCombat ? 1 : 0),
            serverTimestamp: currentTime,
          };
          enteredEntities.push(introPacket);

          clientEntity = {
            entity,
            networkLOD: netLOD,
            simTier,
            distanceToPlayer: distance,
            relevanceScore: score,
            lastPacketSentTimestamp: currentTime,
            interpolator: new ClientEntityInterpolator(entity.transform),
            isInPrefetch: false,
          };
        } else {
          clientEntity.networkLOD = netLOD;
          clientEntity.simTier = simTier;
          clientEntity.distanceToPlayer = distance;
          clientEntity.relevanceScore = score;
        }

        // Check if delta packet is due for this tier's replication frequency
        const rateHz = NETWORK_LOD_RATES_HZ[netLOD];
        const intervalMs = rateHz > 0 ? 1000 / rateHz : Infinity;
        if (currentTime - clientEntity.lastPacketSentTimestamp >= intervalMs) {
          clientEntity.lastPacketSentTimestamp = currentTime;

          // Pack compact delta
          const headingQuantized = Math.round(
            ((entity.transform.heading % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) /
              (Math.PI * 2) *
              255
          );

          const delta: EntityDeltaPacket = {
            packetType: 'delta',
            entityId: entity.id,
            serverTimestamp: currentTime,
            x: Math.round(entity.transform.x * 10) / 10,
            z: Math.round(entity.transform.z * 10) / 10,
            headingQuantized,
            speedKnots: Math.round(entity.transform.speedKnots * 10) / 10,
            health: entity.health,
            stateFlags: (entity.inCombat ? 1 : 0),
          };

          deltaPackets.push(delta);
          clientEntity.interpolator.pushDelta(delta, currentTime);
        }

        nextActiveAOISet.set(entity.id, clientEntity);
      } else {
        // In the outer Prefetch Band (between active AOI and prefetchRadius)
        nextPrefetchSet.add(entity.id);
        this.diagnostics.netTiers[NetworkLOD.NET4_STRATEGIC]++;
      }
    }

    // 5. Detect entities that left the active AOI
    for (const [id, activeClient] of this.activeAOISet) {
      if (!nextActiveAOISet.has(id)) {
        leftEntities.push({
          packetType: 'leave',
          entityId: id,
          reason: 'out_of_aoi',
          serverTimestamp: currentTime,
        });
      }
    }

    this.activeAOISet = nextActiveAOISet;
    this.prefetchSet = nextPrefetchSet;

    // Update diagnostics summary
    this.diagnostics.totalWorldEntities = this.worldEntities.size;
    this.diagnostics.aoiCount = this.activeAOISet.size;
    this.diagnostics.prefetchCount = this.prefetchSet.size;

    // Calculate simulated network bandwidth and message rate
    const totalBytes =
      enteredEntities.length * 280 + // Approx size of intro packet
      deltaPackets.length * 28 +     // Compact delta ~28 bytes
      leftEntities.length * 16;      // Leave packet ~16 bytes

    this.diagnostics.incomingBytesPerSec = totalBytes * 10; // Scaled estimate
    this.diagnostics.messagesPerSec = (enteredEntities.length + deltaPackets.length + leftEntities.length) * 10;
    this.diagnostics.transformUpdatesPerSec = deltaPackets.length * 10;

    return { enteredEntities, leftEntities, deltaPackets };
  }

  // --- QUERY ACCESSORS ---

  public getActiveAOISet(): Map<string, ClientReplicatedEntity> {
    return this.activeAOISet;
  }

  public getPrefetchSet(): Set<string> {
    return this.prefetchSet;
  }

  public getDiagnostics() {
    return { ...this.diagnostics };
  }

  public getEntity(id: string): MMOAuthoritativeEntity | undefined {
    return this.worldEntities.get(id);
  }

  public getReplicatedEntity(id: string): ClientReplicatedEntity | undefined {
    return this.activeAOISet.get(id);
  }
}
