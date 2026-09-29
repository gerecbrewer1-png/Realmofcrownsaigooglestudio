/**
 * REALM OF CROWNS — RAHR (Realm Adaptive Hierarchical Runtime)
 * Phase 2: Hierarchical Interest Graph & Time-Sliced Simulation Scheduler
 * 
 * Core Types & Data Contracts
 * Hierarchy: WORLD -> REGION -> CELL/SECTOR -> GROUP -> ENTITY
 * 
 * CORE RULE:
 * Entities always remain in authoritative world state. RAHR changes
 * processing frequency/fidelity, never whether an entity exists.
 */

export enum RahrSimulationTier {
  T0_FULL = 0,       // Nearby / player-critical / combat-critical (60Hz / every frame)
  T1_REDUCED = 1,    // Relevant medium distance (15-20Hz / every 3-4 frames)
  T2_GROUP = 2,      // Army / formation / herd group-level decision simulation (~10Hz)
  T3_AGGREGATE = 3,  // Distant statistical / strategic simulation (1Hz architecture)
  T4_DORMANT = 4     // Persistent state only, no CPU ticks, transform dirtying suppressed
}

export type RahrEntityKind =
  | 'player'
  | 'hero'
  | 'soldier'
  | 'guard'
  | 'npc'
  | 'animal'
  | 'raider'
  | 'challenger'
  | 'projectile';

export type RahrGroupKind =
  | 'formation'
  | 'settlement'
  | 'herd'
  | 'patrol'
  | 'wildlife'
  | 'structure';

export interface RahrPosition {
  x: number;
  y: number;
  z: number;
}

export interface RahrSpatialBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/**
 * Hysteresis configuration to prevent rapid toggling at tier boundaries.
 * Entity must exceed enterDist to drop to lower fidelity tier,
 * and must come closer than exitDist to return to higher fidelity tier.
 */
export interface RahrHysteresisThresholds {
  t0_to_t1: number; // e.g. 38m
  t1_to_t0: number; // e.g. 30m (8m window)

  t1_to_t2: number; // e.g. 75m
  t2_to_t1: number; // e.g. 65m (10m window)

  t2_to_t3: number; // e.g. 120m
  t3_to_t2: number; // e.g. 105m (15m window)

  t3_to_t4: number; // e.g. 170m
  t4_to_t3: number; // e.g. 150m (20m window)
}

export const DEFAULT_RAHR_THRESHOLDS: RahrHysteresisThresholds = {
  t0_to_t1: 38,
  t1_to_t0: 30,

  t1_to_t2: 75,
  t2_to_t1: 65,

  t2_to_t3: 120,
  t3_to_t2: 105,

  t3_to_t4: 170,
  t4_to_t3: 150
};

export interface RahrEntityRecord {
  id: string;
  kind: RahrEntityKind;
  position: RahrPosition;
  tier: RahrSimulationTier;
  prevTier: RahrSimulationTier;
  tierChangeTimestamp: number;

  // Overrides & invariants
  isPlayerControlled: boolean;
  isCombatCritical: boolean;
  lastCombatTimestamp: number;
  hasActiveOrder: boolean;

  // Spatial & Hierarchy mapping
  regionKey: string;
  cellKey: string;
  groupId: string | null;

  // Stride bucket for time slicing (0..N-1)
  bucket: number;

  // Accumulated delta time across skipped frames for interpolation
  accumulatedDelta: number;
  animFrameSkipCounter: number;
}

export interface RahrGroupRecord {
  id: string;
  kind: RahrGroupKind;
  name?: string;
  center: RahrPosition;
  radius: number;
  tier: RahrSimulationTier;
  prevTier: RahrSimulationTier;
  memberIds: string[];
  bucket: number;
  isEvaluated: boolean;
  isRejected: boolean;
  accumulatedDelta: number;
}

export interface RahrCellRecord {
  key: string;
  cellX: number;
  cellZ: number;
  bounds: RahrSpatialBounds;
  center: RahrPosition;
  tier: RahrSimulationTier;
  entityIds: string[];
  groupIds: string[];
  isEvaluated: boolean;
  isRejected: boolean;
}

export interface RahrRegionRecord {
  key: string;
  regionX: number;
  regionZ: number;
  bounds: RahrSpatialBounds;
  center: RahrPosition;
  tier: RahrSimulationTier;
  cellKeys: string[];
  isEvaluated: boolean;
  isRejected: boolean;
}

export interface RahrTelemetrySnapshot {
  // Counts per tier
  t0Count: number;
  t1Count: number;
  t2Count: number;
  t3Count: number;
  t4Count: number;
  totalEntities: number;

  // Hierarchical culling rejections
  regionsEvaluated: number;
  regionsRejected: number;
  cellsEvaluated: number;
  cellsRejected: number;
  groupsEvaluated: number;
  groupsRejected: number;
  entitiesDetailedEval: number;

  // Scheduler execution metrics
  fullAIUpdatesPerSec: number;
  reducedAIUpdatesPerSec: number;
  groupAIUpdatesPerSec: number;
  deferredUpdates: number;
  schedulerCpuMs: number;

  // Navigation metrics
  navRequestsPerSec: number;
  repathsPerSec: number;
  navUpdatesPerSec: number;

  // Animation evaluations
  animEvalsFull: number;
  animEvalsReduced: number;
  animEvalsDormant: number;
}
