/**
 * REALM OF CROWNS — Phase 18 Production Movement Core Verification Tests
 * 
 * Verifies:
 * 1. Deterministic simulateShip math (1.8 arcade movement multiplier, turning, wind, braking)
 * 2. MovementClock fixed timestep accumulation and spiral-of-death clamp
 * 3. PredictionBuffer history tracking, server ACK pruning, and rollback replay
 * 4. PlayerMovementController integrated pipeline and single transform owner
 */

import {
  simulateShip,
  createDefaultShipSimulationState,
  MovementClock,
  PredictionBuffer,
  ShipPresentationOwner,
  PlayerMovementController,
  MovementInputCommand,
  DEFAULT_PHYSICS_CONFIG,
} from '../src/shared/movement/index';
import * as THREE from 'three';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`, details ?? '');
    failCount++;
  }
}

async function runPhase18Tests() {
  console.log('\n==================================================');
  console.log('PHASE 18 PRODUCTION SHIP MOVEMENT CORE VERIFICATION');
  console.log('==================================================\n');

  // --- TEST 1: 1.8 ARCADE MOVEMENT MULTIPLIER ---
  console.log('1. Testing 1.8 Arcade Movement Multiplier & Position Advancement...');
  {
    const state = createDefaultShipSimulationState({
      x: 0,
      z: 0,
      heading: 0, // facing +Z (forwardX = 0, forwardZ = 1)
      speedKnots: 10.0,
      baseSpeed: 12.0,
      sailSetting: 1.0,
    });

    const cmd: MovementInputCommand = {
      sequence: 1,
      clientTick: 1,
      timestamp: 1000,
      rudderTarget: 0,
      sailSettingTarget: 1.0,
      braking: false,
      reverse: false,
      rudder: 0,
      sailSetting: 1.0,
      dt: 0.1, // 0.1s
    };

    const next = simulateShip(state, cmd, 0.1);
    const expectedDist = next.speedKnots * 1.8 * 0.1;
    const deltaZ = next.z - state.z;
    assert(Math.abs(deltaZ - expectedDist) < 0.0001, 'Forward movement distance uses exact 1.8 multiplier');
    assert(DEFAULT_PHYSICS_CONFIG.arcadeSpeedMultiplier === 1.8, 'DEFAULT_PHYSICS_CONFIG specifies 1.8 arcade multiplier');
  }

  // --- TEST 2: STEERING DYNAMICS & NORMALIZATION ---
  console.log('\n2. Testing Rudder Steering & Heading Normalization...');
  {
    const state = createDefaultShipSimulationState({
      heading: 0,
      speedKnots: 10.0,
      baseSpeed: 12.0,
      turnRate: 30.0, // 30 deg/sec
    });

    // Steer left (rudder target = 1.0)
    const cmdLeft: MovementInputCommand = {
      sequence: 1,
      clientTick: 1,
      timestamp: 1000,
      rudderTarget: 1.0,
      sailSettingTarget: 1.0,
      braking: false,
      reverse: false,
      rudder: 1.0,
      sailSetting: 1.0,
      dt: 0.05,
    };

    const nextLeft = simulateShip(state, cmdLeft, 0.05);
    assert(nextLeft.heading > state.heading, 'Left rudder turns positively in yaw');
    assert(nextLeft.heading >= 0 && nextLeft.heading < Math.PI * 2, 'Heading stays normalized [0, 2*PI)');

    // Steer right (rudder target = -1.0)
    const cmdRight: MovementInputCommand = {
      sequence: 2,
      clientTick: 2,
      timestamp: 1500,
      rudderTarget: -1.0,
      sailSettingTarget: 1.0,
      braking: false,
      reverse: false,
      rudder: -1.0,
      sailSetting: 1.0,
      dt: 0.05,
    };
    const nextRight = simulateShip(state, cmdRight, 0.05);
    assert(nextRight.heading < Math.PI * 2 && nextRight.heading > Math.PI, 'Right rudder wraps heading smoothly in [0, 2*PI)');
  }

  // --- TEST 3: FIXED TIMESTEP CLOCK ACCUMULATION ---
  console.log('\n3. Testing MovementClock Timestep Accumulation & Clamping...');
  {
    const clock = new MovementClock(30, 0.25); // 30 Hz = 33.33ms
    assert(Math.abs(clock.fixedTimestepSec - 1 / 30) < 0.0001, 'Clock fixed timestep is 1/30s (33.33ms)');

    // Frame 1: 16.6ms (60 FPS frame) -> Not enough for 33.33ms step
    const f1 = clock.advance(0.016666);
    assert(f1.steps === 0, 'Frame 1 (16.6ms) accumulates without ticking fixed step');
    assert(f1.alpha > 0.45 && f1.alpha < 0.55, 'Sub-tick alpha correctly reflects ~50% progress');

    // Frame 2: 17ms -> Total is ~33.6ms >= 33.33ms -> 1 step!
    const f2 = clock.advance(0.017);
    assert(f2.steps === 1, 'Frame 2 crosses fixed threshold and produces 1 simulation step');
    assert(clock.getTick() === 1, 'Clock simulation tick advanced to 1');

    // Large frame spike: 1.5 seconds (tab switch / pause)
    const fSpike = clock.advance(1.5);
    // Clamped to maxAccumulatedSec (0.25s) = floor(0.25 / (1/30)) = 7 steps max, preventing death spiral
    assert(fSpike.steps <= 8, `Large frame spike clamped to maxAccumulatedSec (steps=${fSpike.steps} <= 8)`);
  }

  // --- TEST 4: PREDICTION BUFFER & ROLLBACK REPLAY ---
  console.log('\n4. Testing PredictionBuffer & Rollback Replay...');
  {
    const buffer = new PredictionBuffer(60);
    const baseState = createDefaultShipSimulationState({ x: 100, z: 200, heading: 0, speedKnots: 8 });

    // Push 3 frames
    let current = baseState;
    for (let seq = 1; seq <= 3; seq++) {
      const input: MovementInputCommand = {
        sequence: seq,
        clientTick: seq,
        timestamp: 1000 + seq * 33,
        rudderTarget: 0,
        sailSettingTarget: 1.0,
        braking: false,
        reverse: false,
        rudder: 0,
        sailSetting: 1.0,
        dt: 1 / 30,
      };
      current = simulateShip(current, input, 1 / 30);
      buffer.pushFrame({ sequence: seq, tick: seq, input, state: current, timestamp: input.timestamp });
    }

    assert(buffer.size() === 3, 'Prediction buffer stored 3 frames');

    // Server acknowledges sequence 1
    buffer.acknowledge(1);
    assert(buffer.size() === 2, 'Buffer pruned sequence 1, retaining unacknowledged 2 and 3');

    // Server reports authoritative correction for sequence 1 (server position slightly different, e.g. x=102, z=205)
    const correctedAuthState = { ...baseState, x: 102, z: 205 };
    const replayedTip = buffer.rollbackAndReplay(correctedAuthState, 1, (prev, inp, dt) => simulateShip(prev, inp, dt));

    assert(replayedTip.x > 100 && replayedTip.z > 205, 'Rollback replay successfully applied unacknowledged inputs on top of server state');
    assert(buffer.getFrame(2)?.state.x === replayedTip.x || buffer.getFrame(3)?.state.z === replayedTip.z, 'Prediction frames updated with replayed state');
  }

  // --- TEST 5: SHIP PRESENTATION OWNER (ONE FINAL TRANSFORM OWNER) ---
  console.log('\n5. Testing ShipPresentationOwner Single Transform Application...');
  {
    const presentation = new ShipPresentationOwner();
    const mesh = new THREE.Object3D();
    const wake = new THREE.Object3D();

    presentation.applyRenderState(mesh, wake, {
      x: 123.45,
      y: 2.5,
      z: 678.9,
      pitch: 0.05,
      heading: 1.57,
      roll: -0.03,
      speedKnots: 12.0,
      rudder: 0.2,
      sailSetting: 1.0,
      wakeScale: 2.4,
      wakeVisible: true,
      presentationTimestamp: 2000,
    });

    assert(mesh.position.x === 123.45, 'Mesh position X set by presentation owner');
    assert(mesh.position.y === 2.5, 'Mesh position Y set by presentation owner');
    assert(mesh.position.z === 678.9, 'Mesh position Z set by presentation owner');
    assert(mesh.rotation.y === 1.57, 'Mesh rotation Y (heading) set by presentation owner');
    assert(wake.visible === true, 'Wake visibility updated');
    assert(presentation.getLatestRenderState()?.x === 123.45, 'Latest render state cached for camera consumption');
  }

  // --- TEST 6: INTEGRATED PLAYER MOVEMENT CONTROLLER ---
  console.log('\n6. Testing Integrated PlayerMovementController Pipeline...');
  {
    const controller = new PlayerMovementController({
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      speedKnots: 0,
      baseSpeed: 14.0,
      turnRate: 20.0,
    }, 30);

    const mesh = new THREE.Object3D();
    const wake = new THREE.Object3D();
    const mockWaveHeight = (x: number, z: number, t: number) => Math.sin(x * 0.1 + t) * 0.5;

    // Simulate 30 frames at 60 FPS (dt = 0.016666) with forward throttle
    for (let f = 0; f < 30; f++) {
      const res = controller.update(
        { rudderTarget: 0, sailSettingTarget: 1.0 },
        0.016666,
        0,
        mockWaveHeight,
        f * 0.016666,
        mesh,
        wake
      );
      if (f === 29) {
        assert(res.renderState.speedKnots > 0, `Ship accelerates forward (speedKnots = ${res.renderState.speedKnots.toFixed(2)})`);
        assert(res.renderState.z > 0, `Ship travels forward along +Z (z = ${res.renderState.z.toFixed(2)})`);
        assert(mesh.position.z === res.renderState.z, 'Three.js mesh position matches renderState exactly');
      }
    }
  }

  console.log('\n==================================================');
  console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase18Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
