/**
 * REALM OF CROWNS — Bounded Prediction Buffer & Rollback Replay
 * Phase 18 Production Movement Architecture
 * 
 * Stores local movement frames (input command + predicted state).
 * Discards acknowledged frames upon server ACK.
 * Implements authoritative rollback and replay when server state diverges.
 */

import { MovementFrame, MovementInputCommand, ShipSimulationState } from './ShipMovementTypes';

export class PredictionBuffer {
  public readonly maxCapacity: number;
  private frames: MovementFrame[] = [];

  /**
   * @param maxCapacity Maximum number of predicted frames to retain (default 180 = 6s @ 30 Hz)
   */
  constructor(maxCapacity = 180) {
    this.maxCapacity = maxCapacity;
  }

  /**
   * Pushes a new movement frame into the prediction history.
   */
  public pushFrame(frame: MovementFrame): void {
    if (this.frames.length >= this.maxCapacity) {
      this.frames.shift();
    }
    this.frames.push(frame);
  }

  /**
   * Acknowledges frames up to and including ackSequence.
   * Discards older frames as they are confirmed by the server.
   */
  public acknowledge(ackSequence: number): void {
    if (ackSequence < 0) return;
    this.frames = this.frames.filter((f) => f.sequence > ackSequence);
  }

  /**
   * Returns all currently unacknowledged movement frames in chronological order.
   */
  public getUnacknowledged(): MovementFrame[] {
    return this.frames;
  }

  public getFrame(sequence: number): MovementFrame | undefined {
    return this.frames.find((f) => f.sequence === sequence);
  }

  public getLatestFrame(): MovementFrame | undefined {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : undefined;
  }

  public size(): number {
    return this.frames.length;
  }

  public clear(): void {
    this.frames = [];
  }

  /**
   * Authoritative Rollback & Replay.
   * 
   * When the server sends an authoritative state:
   * 1. Discard acknowledged inputs <= ackSequence.
   * 2. Starting from authoritativeState, sequentially replay all remaining unacknowledged inputs.
   * 3. Update the stored predicted states in the buffer.
   * 4. Return the new predicted tip state.
   */
  public rollbackAndReplay(
    authoritativeState: ShipSimulationState,
    ackSequence: number,
    simulateFn: (
      prev: ShipSimulationState,
      input: MovementInputCommand,
      dt: number
    ) => ShipSimulationState
  ): ShipSimulationState {
    this.acknowledge(ackSequence);

    let currentState = { ...authoritativeState };

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const nextState = simulateFn(currentState, frame.input, frame.input.dt);
      frame.state = nextState;
      currentState = nextState;
    }

    return currentState;
  }
}
