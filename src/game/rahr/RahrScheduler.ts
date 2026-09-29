/**
 * REALM OF CROWNS — RAHR (Realm Adaptive Hierarchical Runtime)
 * Phase 2: Time-Sliced & Frame-Budget-Aware Simulation Scheduler
 * 
 * CORE RULES:
 * 1. Entities always remain in authoritative world state.
 * 2. Spread non-critical AI/decision updates across frames using stable buckets.
 * 3. Never defer immediate player input, combat outcomes, critical collisions, or required events.
 * 4. Zero per-frame memory allocations (pre-allocated execution buffers).
 */

import {
  RahrSimulationTier,
  RahrEntityRecord,
  RahrGroupRecord
} from './RahrTypes';
import { RahrInterestGraph } from './RahrInterestGraph';

export interface RahrSchedulerOptions {
  frameBudgetMs?: number; // Soft simulation budget (default: 12.0ms leaving headroom for renderer in 16.67ms budget)
  enableTimeSlicing?: boolean;
}

export type EntityUpdateHandler = (
  entity: RahrEntityRecord,
  effectiveDelta: number,
  tier: RahrSimulationTier
) => void;

export type GroupUpdateHandler = (
  group: RahrGroupRecord,
  effectiveDelta: number,
  tier: RahrSimulationTier
) => void;

export class RahrScheduler {
  private interestGraph: RahrInterestGraph;
  private frameBudgetMs: number;
  public enableTimeSlicing = true;

  private frameIndex = 0;
  private lastSecondTime = performance.now();

  // Execution counters (accumulated over 1 second)
  private fullUpdatesCount = 0;
  private reducedUpdatesCount = 0;
  private groupUpdatesCount = 0;
  private deferredCount = 0;

  // Published rate telemetry
  public fullAIUpdatesPerSec = 0;
  public reducedAIUpdatesPerSec = 0;
  public groupAIUpdatesPerSec = 0;
  public deferredUpdates = 0;
  public schedulerCpuMs = 0;

  // Pre-allocated scratch buffers to prevent GC churn
  private scheduledT0: RahrEntityRecord[] = [];
  private scheduledT1: RahrEntityRecord[] = [];
  private scheduledT2: RahrEntityRecord[] = [];

  constructor(
    interestGraph: RahrInterestGraph,
    options: RahrSchedulerOptions = {}
  ) {
    this.interestGraph = interestGraph;
    this.frameBudgetMs = options.frameBudgetMs ?? 12.0;
    this.enableTimeSlicing = options.enableTimeSlicing ?? true;
  }

  public getFrameIndex(): number {
    return this.frameIndex;
  }

  /**
   * Main scheduling execution step called on PlayCanvas onUpdate.
   * Dispatches updates according to simulation tiers and stable time-sliced buckets.
   */
  public execute(
    delta: number,
    onEntityUpdate: EntityUpdateHandler,
    onGroupUpdate?: GroupUpdateHandler
  ): void {
    const startTime = performance.now();
    this.frameIndex++;

    // Clear scratch buffers without allocating new arrays
    this.scheduledT0.length = 0;
    this.scheduledT1.length = 0;
    this.scheduledT2.length = 0;

    // --- STEP 1: GROUP WORKFLOW (T2 Formations / Herds) ---
    if (onGroupUpdate) {
      const groups = this.interestGraph.getAllGroups();
      for (let i = 0; i < groups.length; i++) {
        const grp = groups[i];
        if (grp.tier === RahrSimulationTier.T4_DORMANT) {
          grp.accumulatedDelta = 0;
          continue;
        }

        // T2 Group decisions run every 6 frames (~10Hz) on its assigned bucket
        const isGroupDue = !this.enableTimeSlicing ||
          grp.tier === RahrSimulationTier.T0_FULL ||
          ((this.frameIndex + grp.bucket) % 6 === 0);

        if (isGroupDue) {
          const dt = grp.accumulatedDelta + delta;
          grp.accumulatedDelta = 0;
          onGroupUpdate(grp, dt, grp.tier);
          this.groupUpdatesCount++;
        } else {
          grp.accumulatedDelta += delta;
        }
      }
    }

    // --- STEP 2: PARTITION ENTITIES INTO TIME-SLICED BUCKETS ---
    const allEntities = this.interestGraph.getAllEntities();
    const entityCount = allEntities.length;

    for (let i = 0; i < entityCount; i++) {
      const ent = allEntities[i];

      // T0: ALWAYS run every frame (player hero, combat-critical, nearby agents)
      if (ent.tier === RahrSimulationTier.T0_FULL) {
        this.scheduledT0.push(ent);
        continue;
      }

      // T4: Dormant - zero execution, keep state intact
      if (ent.tier === RahrSimulationTier.T4_DORMANT) {
        ent.accumulatedDelta = 0;
        continue;
      }

      // T1: Time-sliced over 3 frames (~20Hz). Bucket spread: frameIndex % 3 === bucket % 3
      if (ent.tier === RahrSimulationTier.T1_REDUCED) {
        if (!this.enableTimeSlicing || ((this.frameIndex + ent.bucket) % 3 === 0)) {
          this.scheduledT1.push(ent);
        } else {
          ent.accumulatedDelta += delta;
        }
        continue;
      }

      // T2: Part of a group in formation/herd
      if (ent.tier === RahrSimulationTier.T2_GROUP) {
        // Individual members run simplified steering ticks every 4 frames (~15Hz)
        if (!this.enableTimeSlicing || ((this.frameIndex + ent.bucket) % 4 === 0)) {
          this.scheduledT2.push(ent);
        } else {
          ent.accumulatedDelta += delta;
        }
        continue;
      }

      // T3: Distant aggregate/strategic (1Hz stride 60)
      if (ent.tier === RahrSimulationTier.T3_AGGREGATE) {
        if (!this.enableTimeSlicing || ((this.frameIndex + ent.bucket) % 60 === 0)) {
          const dt = ent.accumulatedDelta + delta;
          ent.accumulatedDelta = 0;
          onEntityUpdate(ent, dt, ent.tier);
          this.reducedUpdatesCount++;
        } else {
          ent.accumulatedDelta += delta;
        }
      }
    }

    // --- STEP 3: EXECUTE T0 FULL SIMULATION (CRITICAL - NEVER DEFERRED) ---
    for (let i = 0; i < this.scheduledT0.length; i++) {
      const ent = this.scheduledT0[i];
      const dt = ent.accumulatedDelta + delta;
      ent.accumulatedDelta = 0;
      onEntityUpdate(ent, dt, RahrSimulationTier.T0_FULL);
      this.fullUpdatesCount++;
    }

    // --- STEP 4: EXECUTE T1 REDUCED SIMULATION (BUDGET AWARE) ---
    for (let i = 0; i < this.scheduledT1.length; i++) {
      // Check frame budget
      const elapsed = performance.now() - startTime;
      if (elapsed > this.frameBudgetMs) {
        // Budget exhausted: defer remaining T1 entities to next tick
        for (let j = i; j < this.scheduledT1.length; j++) {
          this.scheduledT1[j].accumulatedDelta += delta;
          this.deferredCount++;
        }
        break;
      }

      const ent = this.scheduledT1[i];
      const dt = ent.accumulatedDelta + delta;
      ent.accumulatedDelta = 0;
      onEntityUpdate(ent, dt, RahrSimulationTier.T1_REDUCED);
      this.reducedUpdatesCount++;
    }

    // --- STEP 5: EXECUTE T2 SIMPLIFIED GROUP-MEMBER STEERING (BUDGET AWARE) ---
    for (let i = 0; i < this.scheduledT2.length; i++) {
      const elapsed = performance.now() - startTime;
      if (elapsed > this.frameBudgetMs) {
        for (let j = i; j < this.scheduledT2.length; j++) {
          this.scheduledT2[j].accumulatedDelta += delta;
          this.deferredCount++;
        }
        break;
      }

      const ent = this.scheduledT2[i];
      const dt = ent.accumulatedDelta + delta;
      ent.accumulatedDelta = 0;
      onEntityUpdate(ent, dt, RahrSimulationTier.T2_GROUP);
      this.reducedUpdatesCount++;
    }

    // Track total scheduler execution time
    this.schedulerCpuMs = Math.round((performance.now() - startTime) * 100) / 100;

    // Telemetry publishing: 1Hz rolling window
    const now = performance.now();
    if (now - this.lastSecondTime >= 1000) {
      const factor = 1000 / (now - this.lastSecondTime);
      this.fullAIUpdatesPerSec = Math.round(this.fullUpdatesCount * factor);
      this.reducedAIUpdatesPerSec = Math.round(this.reducedUpdatesCount * factor);
      this.groupAIUpdatesPerSec = Math.round(this.groupUpdatesCount * factor);
      this.deferredUpdates = this.deferredCount;

      this.fullUpdatesCount = 0;
      this.reducedUpdatesCount = 0;
      this.groupUpdatesCount = 0;
      this.deferredCount = 0;
      this.lastSecondTime = now;
    }
  }

  /**
   * Determines if animation evaluation should run for an entity this frame
   * T0: 100% every frame
   * T1: Every 2nd frame with accumulated delta
   * T2/T3/T4: Skipped or minimal
   */
  public shouldEvaluateAnimation(entity: RahrEntityRecord): boolean {
    if (entity.tier === RahrSimulationTier.T0_FULL) return true;
    if (entity.tier === RahrSimulationTier.T1_REDUCED) {
      entity.animFrameSkipCounter = (entity.animFrameSkipCounter + 1) % 2;
      return entity.animFrameSkipCounter === 0;
    }
    return false;
  }
}
