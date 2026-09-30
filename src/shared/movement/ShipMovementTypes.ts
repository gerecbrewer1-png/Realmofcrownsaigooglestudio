/**
 * REALM OF CROWNS — Production Ship Movement Types
 * Phase 18 Production Movement Architecture
 */

/**
 * Explicit movement command representing player intent.
 * Sent from client to server and used in fixed-step local simulation.
 */
export interface MovementInputCommand {
  sequence: number;          // Monotonically increasing input sequence
  clientTick: number;        // Client simulation tick when input was sampled
  timestamp: number;         // Time of input capture (ms)
  rudderTarget: number;      // Desired rudder deflection [-1.0 (port) to 1.0 (starboard)]
  sailSettingTarget: number; // Desired sail setting [0.0 (furl/idle) to 1.0 (full sails)]
  braking: boolean;          // Active braking / anchoring flag
  reverse: boolean;          // Reverse propulsion flag
  rudder: number;            // Current evaluated rudder deflection [-1.0 .. 1.0]
  sailSetting: number;       // Current evaluated sail setting [0.0 .. 1.0]
  dt: number;                // Fixed simulation timestep duration (seconds)
}

/**
 * Authoritative ship simulation state.
 * Contains only the data required to simulate and reproduce ship motion deterministically.
 */
export interface ShipSimulationState {
  tick: number;              // Authoritative / predicted simulation tick
  timestamp: number;         // Simulation state timestamp (ms)
  x: number;                 // World X coordinate
  y: number;                 // World Y coordinate (sea surface baseline)
  z: number;                 // World Z coordinate
  heading: number;           // Heading angle in radians (0 = +Z)
  speedKnots: number;        // Forward speed in knots
  rudder: number;            // Current rudder position [-1.0 .. 1.0]
  sailSetting: number;       // Current sail setting [0.0 .. 1.0]
  angularVelocity: number;   // Heading change rate (rad/s)
  pitchAngle: number;        // Hull pitch angle (radians)
  rollAngle: number;         // Hull roll angle (radians)
  hull: number;              // Current hull health
  maxHull: number;           // Maximum hull health
  sails: number;             // Current sail health
  maxSails: number;          // Maximum sail health
  baseSpeed: number;         // Base ship speed rating (knots)
  turnRate: number;          // Base ship turn rate rating (deg/s)
  length?: number;           // Ship length for collisions/scale
  beam?: number;             // Ship beam width
  lastAcknowledgedSequence: number; // Highest server-acknowledged input sequence
}

/**
 * Historical movement frame retained in the prediction buffer.
 * Pairs an input command with the resulting predicted simulation state.
 */
export interface MovementFrame {
  sequence: number;
  tick: number;
  input: MovementInputCommand;
  state: ShipSimulationState;
  timestamp: number;
}

/**
 * Presentation-only render state passed to the final transform owner.
 * Contains interpolated transforms, pitching/rolling, and visual flags.
 */
export interface ShipRenderState {
  x: number;
  y: number;
  z: number;
  pitch: number;
  heading: number;
  roll: number;
  speedKnots: number;
  rudder: number;
  sailSetting: number;
  wakeScale: number;
  wakeVisible: boolean;
  presentationTimestamp: number;
  isReconciling?: boolean;
}

/**
 * Authoritative server snapshot for remote or local entity state.
 */
export interface RemoteSnapshot {
  entityId: string;
  serverTick: number;
  serverTimestamp: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  speedKnots: number;
  rudder?: number;
  sailSetting?: number;
  health?: number;
  stateFlags?: number;
  lastProcessedInputSequence?: number;
}

/**
 * Physics parameters for ship simulation.
 */
export interface ShipPhysicsConfig {
  arcadeSpeedMultiplier: number; // 1.8 arcade multiplier as required
  rudderResponseRate: number;    // Rudder interpolation speed (default 4.0)
  sailResponseRate: number;      // Sail adjustment rate (default 0.5)
  accelerationRate: number;      // Speed lerp factor (default 1.2)
  waterDragCoeff: number;        // Drag factor
  windAngleRad: number;          // Current wind direction in radians
}

export const DEFAULT_PHYSICS_CONFIG: ShipPhysicsConfig = {
  arcadeSpeedMultiplier: 1.8,    // Preserve existing 1.8 arcade multiplier
  rudderResponseRate: 4.0,
  sailResponseRate: 0.5,
  accelerationRate: 1.2,
  waterDragCoeff: 0.3,
  windAngleRad: 0,
};
