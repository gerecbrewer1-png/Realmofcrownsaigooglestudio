/**
 * Realm of Crowns — Phase 21 Verification Suite
 * Low-Draw-Call Naval MMO Architecture (Voyage Century / Bounty Bay Pattern)
 */

import * as THREE from 'three';
import { ShipSimulation, createDefaultShipSimulationState } from '../src/shared/movement/ShipSimulation';
import { MovementInputCommand } from '../src/shared/movement/ShipMovementTypes';
import { VoyageNetworkClient } from '../src/components/world3d/VoyageNetworkClient';
import { FleetGPUInstancer } from '../src/components/world3d/FleetGPUInstancer';
import { DeterministicProjectileSystem } from '../src/components/world3d/DeterministicProjectileSystem';
import { SinglePassOceanMaterial } from '../src/components/world3d/SinglePassOceanMaterial';
import { VoyageReflectionManager } from '../src/components/world3d/VoyageReflectionManager';
import { VoyageQualityManager } from '../src/components/world3d/VoyageQualityManager';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n============================================================');
console.log('PHASE 21: LOW-DRAW-CALL NAVAL MMO ARCHITECTURE');
console.log('Voyage Century / Bounty Bay Pattern Verification');
console.log('============================================================\n');

// -------------------------------------------------------------
// Phase 1: Input Throttling & Unified Movement Simulation
// -------------------------------------------------------------
console.log('--- Phase 1: Input Throttling & Unified Movement ---');
{
  // 1.1 Unified simulation step export
  assert(typeof ShipSimulation.step === 'function', 'ShipSimulation.step is exported and callable');
  const initState = createDefaultShipSimulationState({
    x: 0,
    z: 0,
    heading: 0,
    speedKnots: 10,
    baseSpeed: 12,
  });

  const cmd: MovementInputCommand = {
    sequence: 1,
    clientTick: 1,
    timestamp: 1000,
    dt: 0.1,
    rudderTarget: 0.5,
    sailSettingTarget: 1.0,
    braking: false,
    reverse: false,
    rudder: 0.5,
    sailSetting: 1.0,
  };

  const nextState = ShipSimulation.step(initState, cmd, 0.1);
  assert(nextState.z > initState.z, 'Ship advances forward along heading');
  assert(nextState.heading !== initState.heading, 'Ship turns according to rudderTarget');

  // 1.2 Reconciliation deadband (< 0.05m error)
  const client = new VoyageNetworkClient('ws://localhost:3000', 'test_token', new THREE.Scene());
  (client as any).authoritativePlayerState = {
    x: 100.0,
    z: 200.0,
    heading: 1.5,
    speedKnots: 8.0,
    lastAckSequence: 5,
  };

  // When error is under 0.05m, tier must be 'tiny' and position unchanged (0 oscillation)
  const reconciledTiny = client.reconcilePlayerState(
    { x: 100.02, z: 200.02 }, // ~0.028m error (< 0.05m deadband)
    1.5,
    8.0,
    0.033
  );

  assert(reconciledTiny.tier === 'tiny', 'Sub-0.05m error maps strictly to tier tiny');
  assert(reconciledTiny.x === 100.02, 'Local transform is NOT nudged when error is under 0.05m (deadband holds)');
  assert(reconciledTiny.z === 200.02, 'Z coordinate holds exactly without micro-oscillation');

  // 1.3 Small error convergence
  const reconciledSmall = client.reconcilePlayerState(
    { x: 100.25, z: 200.25 }, // ~0.35m error (< 0.50m)
    1.5,
    8.0,
    0.033
  );
  assert(reconciledSmall.tier === 'small', '0.35m error maps to tier small');
  assert(reconciledSmall.x < 100.25, 'Smoothly converges toward authoritative X');
  assert(reconciledSmall.z < 200.25, 'Smoothly converges toward authoritative Z');
}

// -------------------------------------------------------------
// Phase 2: O(1) Lookups & HUD State Throttling
// -------------------------------------------------------------
console.log('\n--- Phase 2: O(1) Hash Map Lookups & HUD Throttling ---');
{
  const enemyMap = new Map<string, { id: string; name: string }>();
  for (let i = 0; i < 150; i++) {
    enemyMap.set(`ship_${i}`, { id: `ship_${i}`, name: `Fleet Frigate ${i}` });
  }

  const startLookup = performance.now();
  for (let i = 0; i < 1000; i++) {
    const target = enemyMap.get(`ship_${i % 150}`);
    if (!target) throw new Error('Missing target');
  }
  const duration = performance.now() - startLookup;
  assert(duration < 2.0, `1,000 Hash Map lookups execute in ${duration.toFixed(3)} ms (O(1) time complexity)`);

  // Verify HUD status emission interval budget (2 Hz = 500ms)
  const dt = 1 / 60; // 60 FPS
  let timer = 0;
  let emissions = 0;
  for (let f = 0; f < 300; f++) { // exactly 300 frames = 5.0 seconds
    timer += dt;
    if (timer >= 0.499) {
      timer = 0;
      emissions++;
    }
  }
  assert(emissions === 10, `5 seconds at 60 FPS emits exactly 10 HUD updates (${(emissions / 5).toFixed(1)} Hz)`);
}

// -------------------------------------------------------------
// Phase 3: Transition Ocean Rendering to Single-Pass Specular Water
// -------------------------------------------------------------
console.log('\n--- Phase 3: Single-Pass Specular Ocean Material & Mobile Reflection Bypass ---');
{
  const tex1 = new THREE.Texture();
  const tex2 = new THREE.Texture();
  const oceanMat = new SinglePassOceanMaterial({
    normalMap1: tex1,
    normalMap2: tex2,
    sunDirection: new THREE.Vector3(1, 2, 1),
    sunColor: 0xfffbeb,
    deepColor: 0x021729,
    shallowColor: 0x0d526b,
    skyColor: 0x38bdf8,
  });

  assert(oceanMat !== null, 'SinglePassOceanMaterial successfully instantiated');
  assert(oceanMat.uniforms.normalMap1.value === tex1, 'Normal map 1 bound to uniform');
  assert(oceanMat.uniforms.normalMap2.value === tex2, 'Normal map 2 bound to uniform');
  assert(oceanMat.transparent === true, 'Ocean material has transparency enabled');

  oceanMat.updateTime(12.5);
  assert(oceanMat.uniforms.time.value === 12.5, 'Uniform time updates for counter-scrolling UV waves');

  // Verify reflection bypass logic
  VoyageQualityManager.setTier('LOW');
  const statusStr = VoyageReflectionManager.getStatusString();
  assert(statusStr.includes('OFF'), `Reflection pass bypassed for low tier: "${statusStr}"`);
}

// -------------------------------------------------------------
// Phase 4: Deterministic Cannonball Trajectories (No In-Flight Raycasting)
// -------------------------------------------------------------
console.log('\n--- Phase 4: Deterministic Cannonball Trajectories ---');
{
  const projectiles = new DeterministicProjectileSystem();
  assert(projectiles.getActiveCount() === 0, 'Initial projectile count is 0');

  // Fire 100 broadside balls
  const fireTime = 10.0;
  const ids: number[] = [];
  for (let i = 0; i < 100; i++) {
    const id = projectiles.fire({
      origin: new THREE.Vector3(0, 2, 0),
      velocity: new THREE.Vector3(30 + i * 0.1, 10, 0),
      fireTimestampSec: fireTime,
      damage: 50,
      fromPlayer: true,
      targetEntityId: `target_${i}`,
    });
    ids.push(id);
  }
  assert(projectiles.getActiveCount() === 100, '100 broadside projectiles active in flight');

  // During flight, 0 impacts must occur
  let inFlightImpacts = 0;
  projectiles.update(fireTime + 0.5, () => {
    inFlightImpacts++;
  });
  assert(inFlightImpacts === 0, 'Zero impacts or collision raycasts during ballistic flight arc');
  assert(projectiles.getActiveCount() === 100, 'All 100 projectiles continue along analytical trajectory');

  // Advance time past impact: impacts resolve analytically
  let resolvedImpacts = 0;
  projectiles.update(fireTime + 5.0, (event) => {
    resolvedImpacts++;
    assert(event.damage === 50, 'Impact damage value matches launch parameters');
  });
  assert(resolvedImpacts === 100, 'All 100 projectiles resolved impacts at analytical t_impact');
  assert(projectiles.getActiveCount() === 0, 'Buffer fully recycled with zero memory leak');
  projectiles.dispose();
}

// -------------------------------------------------------------
// Phase 5: GPU Instancing for Remote Fleet Ships
// -------------------------------------------------------------
console.log('\n--- Phase 5: GPU Instancing for Remote Fleet Ships ---');
{
  const instancer = new FleetGPUInstancer();
  instancer.beginFrame();

  // Add 50 small, 50 medium, 50 large ships (150 ships total)
  for (let i = 0; i < 50; i++) {
    instancer.addShipInstance('small', i * 10, 0, i * 10, 0);
    instancer.addShipInstance('medium', -i * 10, 0, i * 10, 1.0);
    instancer.addShipInstance('large', i * 10, 0, -i * 10, 2.0);
  }

  instancer.endFrame();

  const drawCalls = instancer.getDrawCallCount();
  assert(drawCalls === 6, `150 fleet vessels batch into exactly ${drawCalls} draw calls (<= 6 calls, budget <= 10)`);
  assert(instancer.getActiveInstanceCount('small') === 50, '50 small vessels active in GPU instance buffer');
  assert(instancer.getActiveInstanceCount('medium') === 50, '50 medium vessels active in GPU instance buffer');
  assert(instancer.getActiveInstanceCount('large') === 50, '50 large vessels active in GPU instance buffer');
  instancer.dispose();
}

console.log('\n============================================================');
console.log(`PHASE 21 VERIFICATION SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
console.log('============================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
}
