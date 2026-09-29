/**
 * REALM OF CROWNS — RAHR (Realm Adaptive Hierarchical Runtime)
 * Phase 2: Navigation & Pathfinding Telemetry & Throttling Bridge
 * 
 * Inspects, tracks, and throttles navigation requests without losing
 * active orders or destinations.
 */

import { RahrSimulationTier, RahrEntityRecord } from './RahrTypes';

export interface NavDestination {
  x: number;
  z: number;
}

export class RahrNavigationManager {
  private static instance: RahrNavigationManager | null = null;

  // Telemetry counters
  private pathRequestCounter = 0;
  private repathCounter = 0;
  private navUpdateCounter = 0;

  public pathRequestsPerSec = 0;
  public repathsPerSec = 0;
  public navUpdatesPerSec = 0;

  private lastSecTimestamp = performance.now();

  // Active destinations registry to guarantee authoritative preservation
  private destinations = new Map<string, NavDestination>();

  public static getInstance(): RahrNavigationManager {
    if (!RahrNavigationManager.instance) {
      RahrNavigationManager.instance = new RahrNavigationManager();
    }
    return RahrNavigationManager.instance;
  }

  public recordPathRequest(entityId: string, dest: NavDestination): void {
    this.pathRequestCounter++;
    this.destinations.set(entityId, { x: dest.x, z: dest.z });
  }

  public recordRepath(entityId: string): void {
    this.repathCounter++;
  }

  public recordNavUpdate(): void {
    this.navUpdateCounter++;
  }

  public clearDestination(entityId: string): void {
    this.destinations.delete(entityId);
  }

  public getDestination(entityId: string): NavDestination | undefined {
    return this.destinations.get(entityId);
  }

  /**
   * Evaluates whether an entity should run detailed steering/avoidance navigation this frame.
   * - T0: Always runs (precision navigation)
   * - T1: Runs every 2nd or 3rd frame (or when close to arrival)
   * - T2: Runs group-level formation navigation
   * - T4: Suppressed
   * 
   * Invariant: Never loses destinations or orders.
   */
  public shouldUpdateNavigation(
    entity: RahrEntityRecord,
    distToDest: number,
    frameIndex: number
  ): boolean {
    this.recordNavUpdate();

    // Within 2.0m of destination: always precision check for exact arrival!
    if (distToDest <= 2.0) return true;

    // T0: Precision full navigation every frame
    if (entity.tier === RahrSimulationTier.T0_FULL) return true;

    // T1: Time-sliced navigation update
    if (entity.tier === RahrSimulationTier.T1_REDUCED) {
      return (frameIndex + entity.bucket) % 3 === 0;
    }

    // T2: Group formation navigation
    if (entity.tier === RahrSimulationTier.T2_GROUP) {
      return (frameIndex + entity.bucket) % 4 === 0;
    }

    return false;
  }

  /**
   * Called once per frame to update 1Hz telemetry rates
   */
  public tick(): void {
    const now = performance.now();
    const elapsed = now - this.lastSecTimestamp;
    if (elapsed >= 1000) {
      const factor = 1000 / elapsed;
      this.pathRequestsPerSec = Math.round(this.pathRequestCounter * factor);
      this.repathsPerSec = Math.round(this.repathCounter * factor);
      this.navUpdatesPerSec = Math.round(this.navUpdateCounter * factor);

      this.pathRequestCounter = 0;
      this.repathCounter = 0;
      this.navUpdateCounter = 0;
      this.lastSecTimestamp = now;
    }
  }
}
