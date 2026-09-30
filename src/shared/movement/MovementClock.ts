/**
 * REALM OF CROWNS — Fixed Simulation Movement Clock
 * Phase 18 Production Movement Architecture
 * 
 * Decouples movement simulation physics from render frame rate.
 * Uses an accumulator pattern with fixed timesteps (30 Hz default)
 * and remainder alpha for smooth render interpolation.
 */

export interface ClockAdvanceResult {
  steps: number; // Number of fixed simulation steps to run this frame
  alpha: number; // Sub-tick interpolation remainder [0.0 .. 1.0] for rendering
}

export class MovementClock {
  public readonly fixedTimestepSec: number;
  public readonly tickRate: number;
  public readonly maxAccumulatedSec: number;

  private accumulatedTimeSec = 0;
  private currentTick = 0;

  /**
   * @param tickRate Target simulation frequency in Hz (default 30 Hz matching MMO server)
   * @param maxAccumulatedSec Maximum accumulated simulation time to prevent spiral of death (default 0.25s)
   */
  constructor(tickRate = 30, maxAccumulatedSec = 0.25) {
    this.tickRate = tickRate;
    this.fixedTimestepSec = 1 / tickRate;
    this.maxAccumulatedSec = maxAccumulatedSec;
  }

  /**
   * Advances the clock with render frame delta time.
   * Clamps large frame spikes and returns the number of fixed simulation steps to run.
   * 
   * @param deltaTimeSec Render delta time in seconds
   * @returns steps to simulate and alpha for render interpolation
   */
  public advance(deltaTimeSec: number): ClockAdvanceResult {
    const safeDt = Number.isFinite(deltaTimeSec) && deltaTimeSec > 0 ? deltaTimeSec : 0.016666;
    // Clamp individual frame delta to prevent spiral of death on tab unfocus/stutter
    const clampedDt = Math.min(safeDt, this.maxAccumulatedSec);

    this.accumulatedTimeSec += clampedDt;
    if (this.accumulatedTimeSec > this.maxAccumulatedSec) {
      this.accumulatedTimeSec = this.maxAccumulatedSec;
    }

    const steps = Math.floor(this.accumulatedTimeSec / this.fixedTimestepSec);
    this.accumulatedTimeSec -= steps * this.fixedTimestepSec;
    this.currentTick += steps;

    // Remainder alpha in [0..1]
    const alpha = Math.max(0, Math.min(1, this.accumulatedTimeSec / this.fixedTimestepSec));

    return { steps, alpha };
  }

  public getTick(): number {
    return this.currentTick;
  }

  public setTick(tick: number): void {
    this.currentTick = Math.max(0, tick);
  }

  public reset(): void {
    this.accumulatedTimeSec = 0;
    this.currentTick = 0;
  }
}
