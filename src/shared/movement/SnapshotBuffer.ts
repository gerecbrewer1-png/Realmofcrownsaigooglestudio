/**
 * REALM OF CROWNS — Snapshot Buffer & Interpolation for Remote Entities
 * Fixed Clock Domain & Optimized Backward Search
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
   * Samples the buffer using synchronized server time.
   *
   * @param currentServerTimeMs Synchronized server timestamp (clientNow + serverTimeOffset)
   * @param interpolationDelayMs Target delay behind live server stream (typically 100ms - 150ms)
   */
  public sample(currentServerTimeMs: number, interpolationDelayMs = 120): RemoteSnapshot | null {
    const len = this.snapshots.length;
    if (len === 0) return null;
    if (len === 1) return this.snapshots[0];

    const targetTime = currentServerTimeMs - interpolationDelayMs;
    const newest = this.snapshots[len - 1];
    const oldest = this.snapshots[0];

    // Clamped to oldest available snapshot if client time falls behind buffer history
    if (targetTime <= oldest.serverTimestamp) {
      return oldest;
    }

    // Bounded extrapolation if packets arrive late
    if (targetTime > newest.serverTimestamp) {
      const extrapolationSec = Math.min((targetTime - newest.serverTimestamp) / 1000, 0.25);
      const speedKnots = newest.speedKnots ?? 0;
      const moveDist = speedKnots * 1.8 * extrapolationSec;
      
      // Account for turning intent if rudder is present
      const turnRate = 18.0 * (Math.PI / 180);
      const predictedHeading = newest.heading + (newest.rudder ?? 0) * turnRate * extrapolationSec;

      const forwardX = Math.sin(predictedHeading);
      const forwardZ = Math.cos(predictedHeading);

      return {
        ...newest,
        heading: predictedHeading,
        x: newest.x + forwardX * moveDist,
        z: newest.z + forwardZ * moveDist,
      };
    }

    // Fast backwards search: target time is almost always near the end of the buffer
    let p0 = oldest;
    let p1 = newest;
    for (let i = len - 2; i >= 0; i--) {
      if (this.snapshots[i].serverTimestamp <= targetTime) {
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
