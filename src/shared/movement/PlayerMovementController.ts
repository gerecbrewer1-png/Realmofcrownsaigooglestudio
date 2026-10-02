/**
 * REALM OF CROWNS — Local Player Production Movement Controller
 * Phase 18 Production Movement Architecture
 * 
 * Orchestrates the full player movement pipeline:
 * Input Intent
 *   → MovementInputCommand
 *   → Fixed Simulation Tick (MovementClock)
 *   → ShipSimulationState (simulateShip with 1.8 arcade multiplier)
 *   → Prediction Frame (PredictionBuffer)
 *   → Outbound Command Queue (Network)
 *   → Server Authoritative State ACK & Reconciliation (Rollback / Replay)
 *   → Sub-tick Render Interpolation (Alpha) & Wave Pitch/Roll
 *   → ShipRenderState
 *   → ShipPresentationOwner (One Final Transform Owner)
 *   → Three.js Mesh
 */

import * as THREE from 'three';
import {
  MovementInputCommand,
  ShipSimulationState,
  MovementFrame,
  ShipRenderState,
  ShipPhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
} from './ShipMovementTypes';
import { simulateShip, lerpAngle, normalizeAngle, createDefaultShipSimulationState } from './ShipSimulation';
import { MovementClock } from './MovementClock';
import { PredictionBuffer } from './PredictionBuffer';
import { ShipPresentationOwner } from './ShipPresentationOwner';

export interface PlayerInputIntent {
  rudderTarget: number;       // -1 (port) to 1 (starboard)
  sailSettingTarget?: number; // 0 (anchor) to 1 (full sail)
  sailAdjustDelta?: number;   // W / S rate delta
  braking?: boolean;
  reverse?: boolean;
}

export class PlayerMovementController {
  private clock: MovementClock;
  private predictionBuffer: PredictionBuffer;
  private presentationOwner: ShipPresentationOwner;

  private currentState: ShipSimulationState;
  private previousState: ShipSimulationState;
  private inputSequence = 0;

  // Visual pitch/roll smoothing
  private visualPitch = 0;
  private visualRoll = 0;

  // Metrics
  private lastPredictionError = 0;
  private rollbackCount = 0;

  constructor(
    initialState?: Partial<ShipSimulationState>,
    tickRate = 30
  ) {
    this.clock = new MovementClock(tickRate, 0.25);
    this.predictionBuffer = new PredictionBuffer(180);
    this.presentationOwner = new ShipPresentationOwner();

    this.currentState = createDefaultShipSimulationState(initialState);
    this.previousState = { ...this.currentState };
  }

  /**
   * Advances the player simulation and updates the Three.js mesh.
   * 
   * @param intent Player input intent from keyboard/gamepad
   * @param deltaTimeSec Render delta time
   * @param windFromRad Current wind angle in radians
   * @param getWaveHeightFn Function returning wave height at (x, z, time)
   * @param globalTime Sea surface animation time
   * @param shipMesh Player ship Three.js Object3D
   * @param wakeMesh Player wake Three.js Object3D
   * @returns Generated render state and any commands that should be sent to the server
   */
  public update(
    intent: PlayerInputIntent,
    deltaTimeSec: number,
    windFromRad: number,
    getWaveHeightFn: (x: number, z: number, time: number) => number,
    globalTime: number,
    shipMesh: THREE.Object3D,
    wakeMesh: THREE.Object3D | null
  ): {
    renderState: ShipRenderState;
    outboundCommands: MovementInputCommand[];
  } {
    const { steps, alpha } = this.clock.advance(deltaTimeSec);
    const outboundCommands: MovementInputCommand[] = [];

    // Calculate current sail target if adjusting with W/S delta
    let currentSailTarget = this.currentState.sailSetting;
    if (typeof intent.sailAdjustDelta === 'number' && intent.sailAdjustDelta !== 0) {
      currentSailTarget = Math.max(0.0, Math.min(1.0, currentSailTarget + intent.sailAdjustDelta));
    } else if (typeof intent.sailSettingTarget === 'number') {
      currentSailTarget = intent.sailSettingTarget;
    }

    // Run fixed simulation steps
    for (let i = 0; i < steps; i++) {
      const seq = this.inputSequence++;
      const fixedDt = this.clock.fixedTimestepSec;

      const cmd: MovementInputCommand = {
        sequence: seq,
        clientTick: this.clock.getTick(),
        timestamp: performance.now(),
        rudderTarget: intent.rudderTarget,
        sailSettingTarget: currentSailTarget,
        braking: Boolean(intent.braking),
        reverse: Boolean(intent.reverse),
        rudder: this.currentState.rudder,
        sailSetting: this.currentState.sailSetting,
        dt: fixedDt,
      };

      // Run shared deterministic simulation
      const nextState = simulateShip(
        this.currentState,
        cmd,
        fixedDt,
        { windAngleRad: windFromRad }
      );

      // Save predicted frame into bounded prediction buffer
      const frame: MovementFrame = {
        sequence: seq,
        tick: this.clock.getTick(),
        input: cmd,
        state: nextState,
        timestamp: cmd.timestamp,
      };
      this.predictionBuffer.pushFrame(frame);

      this.previousState = this.currentState;
      this.currentState = nextState;

      outboundCommands.push(cmd);
    }

    // Render Interpolation (Sub-tick smoothing between previous and current simulation ticks)
    const interpX = this.previousState.x + (this.currentState.x - this.previousState.x) * alpha;
    const interpZ = this.previousState.z + (this.currentState.z - this.previousState.z) * alpha;
    const interpHeading = lerpAngle(this.previousState.heading, this.currentState.heading, alpha);
    const interpSpeed = this.previousState.speedKnots + (this.currentState.speedKnots - this.previousState.speedKnots) * alpha;
    const interpRudder = this.previousState.rudder + (this.currentState.rudder - this.previousState.rudder) * alpha;
    const interpSail = this.previousState.sailSetting + (this.currentState.sailSetting - this.previousState.sailSetting) * alpha;

    // Wave pitch and roll response
    const forwardX = Math.sin(interpHeading);
    const forwardZ = Math.cos(interpHeading);

    const waveY = getWaveHeightFn(interpX, interpZ, globalTime);
    const waveAheadY = getWaveHeightFn(interpX + forwardX * 6, interpZ + forwardZ * 6, globalTime);
    const waveSideY = getWaveHeightFn(interpX + forwardZ * 4, interpZ - forwardX * 4, globalTime);

    const safeWaveY = Number.isFinite(waveY) ? waveY : 0;
    const safeAheadY = Number.isFinite(waveAheadY) ? waveAheadY : safeWaveY;
    const safeSideY = Number.isFinite(waveSideY) ? waveSideY : safeWaveY;

    const targetPitch = (safeAheadY - safeWaveY) * 0.08;
    const baseSpeed = this.currentState.baseSpeed || 12.0;
    const targetRoll = (safeSideY - safeWaveY) * 0.12 - interpRudder * (interpSpeed / baseSpeed) * 0.14;

    const safeDt = Math.min(deltaTimeSec, 0.1);
    this.visualPitch = this.visualPitch + (targetPitch - this.visualPitch) * Math.min(1.0, safeDt * 3.0);
    this.visualRoll = this.visualRoll + (targetRoll - this.visualRoll) * Math.min(1.0, safeDt * 3.0);

    const wakeScale = Math.max(0.1, interpSpeed / 5.0);
    const wakeVisible = interpSpeed > 0.5;

    const renderState: ShipRenderState = {
      x: interpX,
      y: safeWaveY,
      z: interpZ,
      pitch: this.visualPitch,
      heading: interpHeading,
      roll: this.visualRoll,
      speedKnots: interpSpeed,
      rudder: interpRudder,
      sailSetting: interpSail,
      wakeScale,
      wakeVisible,
      presentationTimestamp: performance.now(),
    };

    // Apply to Three.js through the single authoritative transform owner
    this.presentationOwner.applyRenderState(shipMesh, wakeMesh, renderState);

    return { renderState, outboundCommands };
  }

  /**
   * Reconciles local predicted state against server authoritative state.
   * Performs rollback and replay if prediction error exceeds threshold.
   */
  public reconcileAuthoritativeState(
    auth: {
      x: number;
      z: number;
      heading: number;
      speedKnots: number;
      serverTick: number;
      lastProcessedInputSequence?: number;
    },
    windFromRad: number
  ): void {
    if (!Number.isFinite(auth.x) || !Number.isFinite(auth.z) || !Number.isFinite(auth.heading)) {
      return;
    }

    const ackSeq = typeof auth.lastProcessedInputSequence === 'number' && auth.lastProcessedInputSequence >= 0
      ? auth.lastProcessedInputSequence
      : -1;

    // Measure prediction error against local current state
    const err = Math.hypot(this.currentState.x - auth.x, this.currentState.z - auth.z);
    this.lastPredictionError = err;

    if (ackSeq < 0) {
      // No input ack, smooth position correction if large
      if (err > 25.0) {
        this.currentState.x = auth.x;
        this.currentState.z = auth.z;
        this.currentState.heading = auth.heading;
        this.currentState.speedKnots = auth.speedKnots;
      }
      return;
    }

    // If prediction error is significant (> 0.45 units) or heading diverged, trigger rollback & replay
    const headingErr = Math.abs(normalizeAngle(this.currentState.heading - auth.heading));
    const shouldRollback = err > 0.45 || headingErr > 0.15;

    if (shouldRollback) {
      this.rollbackCount++;
      const authBaseState: ShipSimulationState = {
        ...this.currentState,
        tick: auth.serverTick,
        x: auth.x,
        z: auth.z,
        heading: auth.heading,
        speedKnots: auth.speedKnots,
        lastAcknowledgedSequence: ackSeq,
      };

      // Replay unacknowledged inputs from prediction buffer using shared simulation
      const replayedState = this.predictionBuffer.rollbackAndReplay(
        authBaseState,
        ackSeq,
        (prev, inp, dt) => simulateShip(prev, inp, dt, { windAngleRad: windFromRad })
      );

      this.previousState = { ...this.currentState };
      this.currentState = replayedState;
    } else {
      // Discard acknowledged frames cleanly without rollback
      this.predictionBuffer.acknowledge(ackSeq);

      // Smooth error blending for sub-threshold divergence to eliminate micro-rubberbanding
      if (err > 0.01) {
        const blendFactor = 0.15;
        this.currentState.x += (auth.x - this.currentState.x) * blendFactor;
        this.currentState.z += (auth.z - this.currentState.z) * blendFactor;
        this.currentState.heading = lerpAngle(this.currentState.heading, auth.heading, blendFactor);
        this.currentState.speedKnots += (auth.speedKnots - this.currentState.speedKnots) * blendFactor;
      }
    }
  }

  /**
   * Applies an external collision impulse (e.g. land collision or ramming)
   */
  public applyCollisionImpulse(speedFactor: number, damage = 0): void {
    this.currentState.speedKnots *= speedFactor;
    if (damage > 0) {
      this.currentState.hull = Math.max(0, this.currentState.hull - damage);
    }
    this.previousState.speedKnots = this.currentState.speedKnots;
  }

  public getState(): ShipSimulationState {
    return { ...this.currentState };
  }

  public setState(state: Partial<ShipSimulationState>): void {
    this.currentState = { ...this.currentState, ...state };
    this.previousState = { ...this.currentState };
  }

  public getRenderState(): ShipRenderState | null {
    return this.presentationOwner.getLatestRenderState();
  }

  public getPresentationOwner(): ShipPresentationOwner {
    return this.presentationOwner;
  }

  public getRollbackCount(): number {
    return this.rollbackCount;
  }

  public getMetrics() {
    return {
      predictionError: this.lastPredictionError,
      unacknowledgedFrames: this.predictionBuffer.size(),
      rollbackCount: this.rollbackCount,
      currentSpeedKnots: this.currentState.speedKnots,
      currentHeading: this.currentState.heading,
      currentTick: this.clock.getTick(),
    };
  }
}
