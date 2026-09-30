/**
 * REALM OF CROWNS — Shared Deterministic Ship Movement Simulation
 * Phase 18 Production Movement Architecture
 * 
 * Reusable movement simulation logic executed identically by:
 * 1. Client-side local prediction
 * 2. Client-side rollback & replay on server corrections
 * 3. Server-side authoritative player simulation
 * 4. Offline benchmark / verification tests
 */

import {
  ShipSimulationState,
  MovementInputCommand,
  ShipPhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
} from './ShipMovementTypes';

/**
 * Normalizes an angle in radians into the [0, 2*PI) range.
 */
export function normalizeAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  return ((rad % twoPi) + twoPi) % twoPi;
}

/**
 * Calculates the shortest angular difference from 'from' to 'to' in radians.
 */
export function angleDifference(from: number, to: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Helper to interpolate angles along the shortest arc.
 */
export function lerpAngle(from: number, to: number, alpha: number): number {
  const diff = angleDifference(from, to);
  return normalizeAngle(from + diff * Math.max(0, Math.min(1, alpha)));
}

/**
 * Simulates a single fixed step of ship motion.
 * 
 * Preserves the 1.8 arcade movement multiplier and existing naval control feel.
 * 
 * @param previous Previous authoritative or predicted simulation state
 * @param input Player intent command for this timestep
 * @param dt Timestep duration in seconds (e.g. 1/30 = 0.033333s)
 * @param customConfig Optional physics overrides
 * @returns The new simulation state
 */
export function simulateShip(
  previous: ShipSimulationState,
  input: MovementInputCommand,
  dt: number,
  customConfig?: Partial<ShipPhysicsConfig>
): ShipSimulationState {
  const config: ShipPhysicsConfig = {
    ...DEFAULT_PHYSICS_CONFIG,
    ...customConfig,
  };

  const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.2) : 0.033333;
  const safeBaseSpeed = Number.isFinite(previous.baseSpeed) && previous.baseSpeed > 0 ? previous.baseSpeed : 12.0;
  const safeTurnRate = Number.isFinite(previous.turnRate) && previous.turnRate > 0 ? previous.turnRate : 18.0;

  // 1. Rudder dynamic steering response
  const targetRudder = Math.max(-1.0, Math.min(1.0, input.rudderTarget ?? 0));
  const currentRudder = Number.isFinite(previous.rudder) ? previous.rudder : 0;
  const rudder = currentRudder + (targetRudder - currentRudder) * Math.min(1.0, safeDt * config.rudderResponseRate);

  // 2. Sail setting (throttle) adjustment
  let sailSetting = Number.isFinite(previous.sailSetting) ? previous.sailSetting : 0;
  if (input.braking) {
    sailSetting = Math.max(0.0, sailSetting - safeDt * 1.5);
  } else if (typeof input.sailSettingTarget === 'number') {
    const targetSail = Math.max(0.0, Math.min(1.0, input.sailSettingTarget));
    const delta = targetSail - sailSetting;
    const maxChange = safeDt * config.sailResponseRate;
    if (Math.abs(delta) <= maxChange) {
      sailSetting = targetSail;
    } else {
      sailSetting += Math.sign(delta) * maxChange;
    }
  }
  sailSetting = Math.max(0.0, Math.min(1.0, sailSetting));

  // 3. Wind dynamics
  const windFromRad = config.windAngleRad ?? 0;
  const angleToWind = Math.abs(
    ((((previous.heading - windFromRad + Math.PI) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)) - Math.PI
  );
  let windMultiplier = 0.75 + Math.sin(angleToWind) * 0.25;
  if (angleToWind < 0.4) {
    windMultiplier = 0.5; // in irons (head to wind)
  }

  // 4. Sail health ratio
  const maxSails = Number.isFinite(previous.maxSails) && previous.maxSails > 0 ? previous.maxSails : 100;
  const sails = Number.isFinite(previous.sails) ? previous.sails : maxSails;
  const sailHealthMult = Math.max(0.2, sails / maxSails);

  // 5. Target speed & linear acceleration
  const targetKnots = safeBaseSpeed * sailSetting * windMultiplier * sailHealthMult;
  const currentSpeed = Number.isFinite(previous.speedKnots) ? previous.speedKnots : 0;
  let speedKnots = currentSpeed + (targetKnots - currentSpeed) * Math.min(1.0, safeDt * config.accelerationRate);

  if (input.braking && speedKnots > 0) {
    speedKnots = Math.max(0.0, speedKnots - safeDt * 6.0);
  }
  if (input.reverse) {
    // Reverse propulsion (e.g. oars backing water)
    speedKnots = Math.max(-safeBaseSpeed * 0.35, speedKnots - safeDt * 3.0);
  }

  // 6. Turn rate scaling with speed
  const speedRatio = Math.max(0, speedKnots / safeBaseSpeed);
  const effectiveTurnRate = (safeTurnRate * (Math.PI / 180) * (speedRatio + 0.2)) * rudder;
  let heading = previous.heading + effectiveTurnRate * safeDt;
  heading = normalizeAngle(heading);

  // 7. Position advancement with 1.8 arcade movement multiplier
  const moveDist = speedKnots * config.arcadeSpeedMultiplier * safeDt;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);

  const posX = previous.x + forwardX * moveDist;
  const posZ = previous.z + forwardZ * moveDist;

  // 8. Construct next state with finite checks
  return {
    tick: previous.tick + 1,
    timestamp: previous.timestamp + Math.round(safeDt * 1000),
    x: Number.isFinite(posX) ? posX : previous.x,
    y: previous.y,
    z: Number.isFinite(posZ) ? posZ : previous.z,
    heading: Number.isFinite(heading) ? heading : previous.heading,
    speedKnots: Number.isFinite(speedKnots) ? speedKnots : 0,
    rudder: Number.isFinite(rudder) ? rudder : 0,
    sailSetting: Number.isFinite(sailSetting) ? sailSetting : 0,
    angularVelocity: effectiveTurnRate,
    pitchAngle: previous.pitchAngle,
    rollAngle: previous.rollAngle,
    hull: previous.hull,
    maxHull: previous.maxHull,
    sails: previous.sails,
    maxSails: previous.maxSails,
    baseSpeed: safeBaseSpeed,
    turnRate: safeTurnRate,
    length: previous.length,
    beam: previous.beam,
    lastAcknowledgedSequence: previous.lastAcknowledgedSequence,
  };
}

/**
 * Creates a default ship simulation state.
 */
export function createDefaultShipSimulationState(
  overrides?: Partial<ShipSimulationState>
): ShipSimulationState {
  return {
    tick: 0,
    timestamp: Date.now(),
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speedKnots: 0,
    rudder: 0,
    sailSetting: 0,
    angularVelocity: 0,
    pitchAngle: 0,
    rollAngle: 0,
    hull: 500,
    maxHull: 500,
    sails: 100,
    maxSails: 100,
    baseSpeed: 12.0,
    turnRate: 18.0,
    length: 45,
    beam: 12,
    lastAcknowledgedSequence: -1,
    ...overrides,
  };
}
