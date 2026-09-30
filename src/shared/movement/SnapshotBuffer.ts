/**
 * REALM OF CROWNS — Snapshot Buffer & Interpolation for Remote Entities
 * Phase 18 Production Movement Architecture
 * 
 * Bounded history of timestamped server snapshots.
 * Provides smooth hermite/linear interpolation with interpolation delay,
 * and bounded forward extrapolation when network packets are delayed.
 */

import { RemoteSnapshot } from './ShipMovementTypes';
import { lerpAngle } from './ShipSimulation';

export class SnapshotBuffer {
  public readonly maxCapacity: number;
  private snapshots: RemoteSnapshot[] = [];

  constructor(maxCapacity = 30) {
    this.maxCapacity = maxCapacity;
  }

  public pushSnapshot(snapshot: RemoteSnapshot): void {
    if (this.snapshots.length >= this.maxCapacity) {
      this.snapshots.shift();
    }
    this.snapshots.push(snapshot);
  }

  public getLatest(): RemoteSnapshot | undefined {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : undefined;
  }

  public size(): number {
    return this.snapshots.length;
  }

  public clear(): void {
    this.snapshots = [];
  }

  /**
   * Samples the buffer at a given render timestamp with interpolation delay.
   * 
   * @param renderTimestampMs Current presentation timestamp (performance.now() or Date.now())
   * @param interpolationDelayMs Target delay behind live server time (default 100ms)
   */
  public sample(renderTimestampMs: number, interpolationDelayMs = 100): RemoteSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) return this.snapshots[0];

    const targetTime = renderTimestampMs - interpolationDelayMs;
    const newest = this.snapshots[this.snapshots.length - 1];
    const oldest = this.snapshots[0];

    // If target time is older than our oldest snapshot, clamp to oldest
    if (targetTime <= oldest.serverTimestamp) {
      return oldest;
    }

    // If target time is newer than newest snapshot, perform bounded extrapolation
    if (targetTime > newest.serverTimestamp) {
      const extrapolationSec = Math.min((targetTime - newest.serverTimestamp) / 1000, 0.25); // Max 250ms
      const speedKnots = newest.speedKnots ?? 0;
      const moveDist = speedKnots * 1.8 * extrapolationSec; // 1.8 multiplier
      const forwardX = Math.sin(newest.heading);
      const forwardZ = Math.cos(newest.heading);

      return {
        ...newest,
        x: newest.x + forwardX * moveDist,
        z: newest.z + forwardZ * moveDist,
      };
    }

    // Find two surrounding snapshots for interpolation
    let p0 = oldest;
    let p1 = newest;
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (
        this.snapshots[i].serverTimestamp <= targetTime &&
        this.snapshots[i + 1].serverTimestamp >= targetTime
      ) {
        p0 = this.snapshots[i];
        p1 = this.snapshots[i + 1];
        break;
      }
    }

    const duration = p1.serverTimestamp - p0.serverTimestamp;
    const alpha = duration > 0 ? Math.max(0, Math.min(1, (targetTime - p0.serverTimestamp) / duration)) : 1;

    return {
      entityId: p1.entityId,
      serverTick: p1.serverTick,
      serverTimestamp: targetTime,
      x: p0.x + (p1.x - p0.x) * alpha,
      y: (p0.y ?? 0) + ((p1.y ?? 0) - (p0.y ?? 0)) * alpha,
      z: p0.z + (p1.z - p0.z) * alpha,
      heading: lerpAngle(p0.heading, p1.heading, alpha),
      speedKnots: p0.speedKnots + (p1.speedKnots - p0.speedKnots) * alpha,
      rudder: (p0.rudder ?? 0) + ((p1.rudder ?? 0) - (p0.rudder ?? 0)) * alpha,
      sailSetting: (p0.sailSetting ?? 0) + ((p1.sailSetting ?? 0) - (p0.sailSetting ?? 0)) * alpha,
      health: p1.health,
      stateFlags: p1.stateFlags,
    };
  }
}
