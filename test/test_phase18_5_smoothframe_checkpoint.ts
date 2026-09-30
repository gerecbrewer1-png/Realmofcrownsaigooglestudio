/**
 * REALM OF CROWNS — PHASE 18.5 SMOOTHFRAME CHECKPOINT & CONTINUATION TEST
 * 
 * Checkpoint test file establishing:
 * 1. Verification of Phase 18 Production Movement Core integrity
 * 2. Phase 18.5 Frame Pacing & Hitch Detection Watchdog harness
 * 3. Execution boundary and state of progress for resumption
 * 
 * CURRENT STATUS:
 * [x] Phase 18 Movement Architecture: Complete & Active
 *     - ShipMovementTypes, ShipSimulation (1.8 arcade multiplier preserved)
 *     - MovementClock (30 Hz fixed timestep with accumulator & death-spiral clamp)
 *     - PredictionBuffer (180 frames, sequence ACK pruning, rollback replay)
 *     - SnapshotBuffer (interpolation + bounded extrapolation)
 *     - ShipPresentationOwner (One single authoritative Three.js transform writer)
 *     - PlayerMovementController wired to NavalSeaCanvas.tsx
 *     - VoyageNetworkClient sending movement commands to MMO server
 *     - Server tickPlayers using shared deterministic simulateShip
 *     - Verified live in Microsoft Edge: 9.3 kts acceleration, port/stbd turns, furl/stop, camera presets
 * 
 * NEXT STEP TO EXECUTE:
 * [ ] Phase 18.5: RAHR SmoothFrame — Browser-First Frame Pacing & Hitch Elimination
 *     - Pass 1: Hitch Detection Watchdog & high-frequency instrumentation
 *     - Pass 2: Collect reproducible hitch evidence across the 9 scenarios
 *     - Pass 3: Root cause identification (Whole-frame vs Sim vs GPU/resource vs Transform)
 *     - Pass 4: Targeted evidence-backed remediation
 *     - Pass 5: Re-test identical scenarios
 *     - Pass 6: Produce docs/RAHR_SHIP_HITCH_ANALYSIS.md, docs/RAHR_SMOOTHFRAME_RESULTS.md, docs/RAHR_FRAME_OWNERSHIP.md
 */

import {
  simulateShip,
  createDefaultShipSimulationState,
  MovementClock,
  PredictionBuffer,
  ShipPresentationOwner,
  PlayerMovementController,
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

// ============================================================================
// PHASE 18.5 HITCH CLASSIFIER SPECIFICATION
// ============================================================================
export interface HitchClassification {
  durationMs: number;
  tier: 'NORMAL' | 'WARNING' | 'SIGNIFICANT' | 'HITCH' | 'SEVERE' | 'EXTREME';
}

export function classifyFrameDuration(durationMs: number): HitchClassification {
  if (durationMs >= 250) return { durationMs, tier: 'EXTREME' };
  if (durationMs >= 100) return { durationMs, tier: 'SEVERE' };
  if (durationMs >= 50) return { durationMs, tier: 'HITCH' };
  if (durationMs >= 33.33) return { durationMs, tier: 'SIGNIFICANT' };
  if (durationMs >= 25) return { durationMs, tier: 'WARNING' };
  return { durationMs, tier: 'NORMAL' };
}

async function runCheckpointTests() {
  console.log('\n================================================================');
  console.log('REALM OF CROWNS — PHASE 18.5 SMOOTHFRAME CHECKPOINT TEST');
  console.log('================================================================\n');

  // 1. Verify Phase 18 Core Primitives Integrity
  console.log('1. Verifying Phase 18 Production Movement Core...');
  {
    assert(DEFAULT_PHYSICS_CONFIG.arcadeSpeedMultiplier === 1.8, '1.8 arcade multiplier invariant intact');

    const state = createDefaultShipSimulationState({ speedKnots: 10, baseSpeed: 12 });
    const cmd = {
      sequence: 1,
      clientTick: 1,
      timestamp: 1000,
      rudderTarget: 0,
      sailSettingTarget: 1.0,
      braking: false,
      reverse: false,
      rudder: 0,
      sailSetting: 1.0,
      dt: 0.033333,
    };
    const next = simulateShip(state, cmd, 0.033333);
    assert(next.z > state.z, 'Forward movement simulation advancing cleanly');

    const clock = new MovementClock(30);
    const advance = clock.advance(1 / 30);
    assert(advance.steps === 1, 'Fixed 30 Hz simulation clock ticking properly');

    const buffer = new PredictionBuffer(60);
    buffer.pushFrame({ sequence: 1, tick: 1, input: cmd, state: next, timestamp: 1000 });
    buffer.acknowledge(1);
    assert(buffer.size() === 0, 'Prediction buffer frame acknowledgment functional');

    const presentation = new ShipPresentationOwner();
    const mesh = new THREE.Object3D();
    presentation.applyRenderState(mesh, null, {
      x: 50,
      y: 0,
      z: 100,
      pitch: 0,
      heading: 0,
      roll: 0,
      speedKnots: 10,
      rudder: 0,
      sailSetting: 1,
      wakeScale: 1,
      wakeVisible: true,
      presentationTimestamp: 1000,
    });
    assert(mesh.position.x === 50 && mesh.position.z === 100, 'ShipPresentationOwner single transform writer intact');
  }

  // 2. Verify Phase 18.5 Frame Hitch Classification Hierarchy
  console.log('\n2. Verifying Phase 18.5 Hitch Classification Tiers...');
  {
    assert(classifyFrameDuration(16.6).tier === 'NORMAL', '16.6ms frame classified as NORMAL');
    assert(classifyFrameDuration(28.0).tier === 'WARNING', '28ms frame classified as WARNING (>25ms)');
    assert(classifyFrameDuration(40.0).tier === 'SIGNIFICANT', '40ms frame classified as SIGNIFICANT (>33.33ms)');
    assert(classifyFrameDuration(65.0).tier === 'HITCH', '65ms frame classified as HITCH (>50ms)');
    assert(classifyFrameDuration(140.0).tier === 'SEVERE', '140ms frame classified as SEVERE (>100ms)');
    assert(classifyFrameDuration(310.0).tier === 'EXTREME', '310ms frame classified as EXTREME (>250ms)');
  }

  // 3. Print Resume Instructions
  console.log('\n================================================================');
  console.log('CHECKPOINT VERIFIED — READY TO RESUME PHASE 18.5');
  console.log('RESUME AT: PASS 1 (Instrument Hitch Watchdog & Collect Trace Data)');
  console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runCheckpointTests().catch((err) => {
  console.error('Checkpoint test failed:', err);
  process.exit(1);
});
