/**
 * REALM OF CROWNS - PHASE 2.6 SIMULATION LOD & LARGE FLEET ENGINE TEST SUITE
 * 
 * Validates:
 * 1. Simulation LOD (SIM0–SIM4) distance tier assignments
 * 2. 20m hysteresis buffer logic preventing rapid boundary toggling
 * 3. Time-sliced AI update frequencies (60Hz, 30Hz, 10Hz, 2Hz, 0.2Hz)
 * 4. Deterministic frame-stride interleaving (spikeless load distribution)
 * 5. 2D Spatial Hash Grid O(1) bucket lookups, cell transitions, and nearest entity search
 * 6. Object pooling for zero-allocation cannonballs, splash particles, and math buffers
 * 7. Area-of-Interest (AoI) network priority & replication frequency tiers
 * 8. Large-fleet manager scaling up to 250 concurrent simulated entities
 */

import * as THREE from 'three';
import { SimulationTier, VoyageSimulationLOD } from '../src/components/world3d/VoyageSimulationLOD';
import { VoyageSpatialGrid } from '../src/components/world3d/VoyageSpatialGrid';
import { VoyageObjectPool } from '../src/components/world3d/VoyageObjectPool';
import { VoyageAreaOfInterest, NetworkPriority } from '../src/components/world3d/VoyageAreaOfInterest';
import { VoyageFleetManager, FleetEntity } from '../src/components/world3d/VoyageFleetManager';
import { SHIP_CATALOG } from '../src/components/world3d/shipVisualService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

console.log('\n======================================================================');
console.log('REALM OF CROWNS — PHASE 2.6 SIMULATION LOD & LARGE-FLEET TEST SUITE');
console.log('======================================================================\n');

// --- TEST SUITE 1: Simulation LOD Distance Tiers & Evaluation ---
console.log('--- TEST SUITE 1: Simulation LOD Distance Tiers ---');
{
  // From uninitialized / distant:
  const tierAt50 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM3_DISTANT, 50, false, false);
  assert(tierAt50 === SimulationTier.SIM0_IMMEDIATE, 'Distance 50m maps to SIM0_IMMEDIATE');

  const tierAt200 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM3_DISTANT, 200, false, false);
  assert(tierAt200 === SimulationTier.SIM1_NEARBY, 'Distance 200m maps to SIM1_NEARBY');

  const tierAt500 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM3_DISTANT, 500, false, false);
  assert(tierAt500 === SimulationTier.SIM2_REGIONAL, 'Distance 500m maps to SIM2_REGIONAL');

  const tierAt1000 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM3_DISTANT, 1000, false, false);
  assert(tierAt1000 === SimulationTier.SIM3_DISTANT, 'Distance 1000m maps to SIM3_DISTANT');

  const tierAt2000 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM3_DISTANT, 2000, false, false);
  assert(tierAt2000 === SimulationTier.SIM4_STRATEGIC, 'Distance 2000m maps to SIM4_STRATEGIC');

  // Combat override within engagement envelope:
  const combatOverride = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM2_REGIONAL, 150, true, false);
  assert(combatOverride === SimulationTier.SIM0_IMMEDIATE, 'Active combat engagement (<180m) forces SIM0_IMMEDIATE');

  // Player flagship override:
  const playerOverride = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM4_STRATEGIC, 5000, false, true);
  assert(playerOverride === SimulationTier.SIM0_IMMEDIATE, 'Hero player flagship is permanently locked to SIM0_IMMEDIATE');
}

// --- TEST SUITE 2: Hysteresis Buffer Validation ---
console.log('\n--- TEST SUITE 2: 20m Hysteresis Buffer Stability ---');
{
  // Boundary between SIM0 and SIM1: exit at >= 140m, re-entry at < 120m (20m hysteresis)
  const sim0At135 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM0_IMMEDIATE, 135, false, false);
  assert(sim0At135 === SimulationTier.SIM0_IMMEDIATE, 'SIM0 entity at 135m (<140m) remains in SIM0');

  const sim0At145 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM0_IMMEDIATE, 145, false, false);
  assert(sim0At145 === SimulationTier.SIM1_NEARBY, 'SIM0 entity at 145m (>=140m) cleanly exits to SIM1_NEARBY');

  const sim1At130 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM1_NEARBY, 130, false, false);
  assert(sim1At130 === SimulationTier.SIM1_NEARBY, 'SIM1 entity approaching at 130m (>=120m) stays in SIM1 (preventing flip-flop jitter)');

  const sim1At110 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM1_NEARBY, 110, false, false);
  assert(sim1At110 === SimulationTier.SIM0_IMMEDIATE, 'SIM1 entity crossing <120m re-enters SIM0_IMMEDIATE');

  // Boundary between SIM1 and SIM2: exit at >= 350m, re-entry at < 330m (20m hysteresis)
  const sim1At345 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM1_NEARBY, 345, false, false);
  assert(sim1At345 === SimulationTier.SIM1_NEARBY, 'SIM1 entity at 345m (<350m) remains in SIM1');

  const sim1At355 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM1_NEARBY, 355, false, false);
  assert(sim1At355 === SimulationTier.SIM2_REGIONAL, 'SIM1 entity at 355m (>=350m) exits to SIM2_REGIONAL');

  const sim2At340 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM2_REGIONAL, 340, false, false);
  assert(sim2At340 === SimulationTier.SIM2_REGIONAL, 'SIM2 entity approaching at 340m (>=330m) stays in SIM2 (preventing jitter)');

  const sim2At320 = VoyageSimulationLOD.evaluateTier(SimulationTier.SIM2_REGIONAL, 320, false, false);
  assert(sim2At320 === SimulationTier.SIM1_NEARBY, 'SIM2 entity crossing <330m re-enters SIM1_NEARBY');
}

// --- TEST SUITE 3: Time-Sliced AI Update Frequencies ---
console.log('\n--- TEST SUITE 3: Time-Sliced AI Update Frequencies ---');
{
  // SIM0 should tick on EVERY frame
  let sim0Ticks = 0;
  for (let f = 0; f < 60; f++) {
    if (VoyageSimulationLOD.shouldUpdateOnFrame(SimulationTier.SIM0_IMMEDIATE, f, 0)) {
      sim0Ticks++;
    }
  }
  assert(sim0Ticks === 60, `SIM0 updated 60/60 frames (60Hz full frequency)`);

  // SIM1 should tick every 2 frames (stride 2 = 30Hz)
  let sim1Ticks = 0;
  for (let f = 0; f < 60; f++) {
    if (VoyageSimulationLOD.shouldUpdateOnFrame(SimulationTier.SIM1_NEARBY, f, 0)) {
      sim1Ticks++;
    }
  }
  assert(sim1Ticks === 30, `SIM1 updated 30/60 frames (30Hz half frequency)`);

  // SIM2 should tick every 6 frames (stride 6 = 10Hz)
  let sim2Ticks = 0;
  for (let f = 0; f < 60; f++) {
    if (VoyageSimulationLOD.shouldUpdateOnFrame(SimulationTier.SIM2_REGIONAL, f, 0)) {
      sim2Ticks++;
    }
  }
  assert(sim2Ticks === 10, `SIM2 updated 10/60 frames (10Hz regional frequency)`);

  // SIM3 should tick every 30 frames (stride 30 = 2Hz)
  let sim3Ticks = 0;
  for (let f = 0; f < 60; f++) {
    if (VoyageSimulationLOD.shouldUpdateOnFrame(SimulationTier.SIM3_DISTANT, f, 0)) {
      sim3Ticks++;
    }
  }
  assert(sim3Ticks === 2, `SIM3 updated 2/60 frames (2Hz horizon frequency)`);

  // Interleaving test: 6 entities in SIM2 should have their updates spread out across different frames!
  const frameBuckets: number[] = new Array(6).fill(0);
  for (let eIdx = 0; eIdx < 6; eIdx++) {
    for (let f = 0; f < 6; f++) {
      if (VoyageSimulationLOD.shouldUpdateOnFrame(SimulationTier.SIM2_REGIONAL, f, eIdx)) {
        frameBuckets[f]++;
      }
    }
  }
  // Exactly 1 entity should update on each of the 6 frames!
  const maxInSingleFrame = Math.max(...frameBuckets);
  const minInSingleFrame = Math.min(...frameBuckets);
  assert(maxInSingleFrame === 1 && minInSingleFrame === 1, 'SIM2 AI load is perfectly uniform across frames (1 ship per frame, zero spikes)');
}

// --- TEST SUITE 4: 2D Spatial Hash Grid Architecture ---
console.log('\n--- TEST SUITE 4: 2D Spatial Hash Grid Architecture ---');
{
  const grid = new VoyageSpatialGrid(150);

  // Insert 3 ships at different positions
  grid.updateEntity({ id: 'ship_a', x: 0, z: 0, radius: 15 });
  grid.updateEntity({ id: 'ship_b', x: 40, z: 20, radius: 20 });
  grid.updateEntity({ id: 'ship_c', x: 800, z: 800, radius: 25 });

  assert(grid.getEntityCount() === 3, 'Spatial grid contains 3 registered entities');

  // Query around origin (radius 100m)
  const nearby = grid.queryRadius(0, 0, 100);
  assert(nearby.length === 2, 'queryRadius(0,0, 100) returns exactly ship_a and ship_b');
  assert(nearby.some(e => e.id === 'ship_a') && nearby.some(e => e.id === 'ship_b'), 'Results contain ship_a and ship_b');

  // Nearest query
  const nearest = grid.queryNearest(0, 0, 200);
  assert(nearest !== null && nearest.entity.id === 'ship_a', 'queryNearest finds ship_a at distance 0');

  const nearestToB = grid.queryNearest(50, 20, 200, (e) => e.id !== 'ship_a');
  assert(nearestToB !== null && nearestToB.entity.id === 'ship_b', 'Filtered queryNearest finds ship_b');

  // Move ship_a across 150m boundary to (300, 300)
  grid.updateEntity({ id: 'ship_a', x: 300, z: 300, radius: 15 });
  const nearbyAfterMove = grid.queryRadius(0, 0, 100);
  assert(nearbyAfterMove.length === 1 && nearbyAfterMove[0].id === 'ship_b', 'After moving ship_a, only ship_b is near origin');

  // Remove ship_b
  grid.removeEntity('ship_b');
  assert(grid.getEntityCount() === 2, 'Entity count is 2 after removal');
  assert(grid.queryRadius(0, 0, 100).length === 0, 'Origin query returns 0 after removing ship_b');
}

// --- TEST SUITE 5: Zero-Allocation Object Pool ---
console.log('\n--- TEST SUITE 5: Zero-Allocation Object Pool ---');
{
  const dummyScene = new THREE.Scene();
  VoyageObjectPool.initialize(dummyScene, 10, 20);

  const initialStats = VoyageObjectPool.getActiveStats();
  assert(initialStats.activeBalls === 0, 'Initial active balls is 0');
  assert(initialStats.totalBallsInPool >= 10, 'Initial ball pool pre-populated with >= 10 instances');

  // Acquire cannonball
  const ball = VoyageObjectPool.acquireCannonball(
    new THREE.Vector3(10, 2, 10),
    new THREE.Vector3(0, 0, 40),
    true,
    65,
    'balls'
  );
  assert(ball !== null && ball.active === true, 'Successfully acquired pooled cannonball');
  assert(VoyageObjectPool.getActiveStats().activeBalls === 1, 'Active balls count is 1');

  // Acquire particle
  const particle = VoyageObjectPool.acquireParticle(
    new THREE.Vector3(10, 2, 10),
    new THREE.Vector3(0, 3, 0),
    0.6,
    1.5
  );
  assert(particle !== null && particle.active === true, 'Successfully acquired pooled particle');
  assert(VoyageObjectPool.getActiveStats().activeParticles === 1, 'Active particles count is 1');

  // Release cannonball and particle
  VoyageObjectPool.releaseCannonball(ball!);
  VoyageObjectPool.releaseParticle(particle!);
  assert(VoyageObjectPool.getActiveStats().activeBalls === 0, 'Active balls returned to 0 after release');
  assert(VoyageObjectPool.getActiveStats().activeParticles === 0, 'Active particles returned to 0 after release');

  // Scratch vectors validation
  VoyageObjectPool.scratchVec1.set(1, 2, 3);
  VoyageObjectPool.scratchVec2.set(4, 5, 6);
  VoyageObjectPool.scratchVec3.copy(VoyageObjectPool.scratchVec1).add(VoyageObjectPool.scratchVec2);
  assert(VoyageObjectPool.scratchVec3.x === 5 && VoyageObjectPool.scratchVec3.y === 7, 'Scratch vectors operate without allocation');
}

// --- TEST SUITE 6: MMO Area of Interest (AoI) Network Relevance ---
console.log('\n--- TEST SUITE 6: MMO Area-of-Interest Network Relevance ---');
{
  const combatRelevance = VoyageAreaOfInterest.calculateRelevance('pirate_leader', SimulationTier.SIM0_IMMEDIATE, 80, true);
  assert(combatRelevance.networkPriority === NetworkPriority.CRITICAL_REALTIME, 'SIM0 close combat has CRITICAL_REALTIME priority');
  assert(combatRelevance.replicationRateHz === 30, 'Critical combat replicates at 30 Hz');

  const fleetRelevance = VoyageAreaOfInterest.calculateRelevance('fleet_ally', SimulationTier.SIM1_NEARBY, 250, false, false, true);
  assert(fleetRelevance.networkPriority === NetworkPriority.HIGH_INTERACTIVE, 'Nearby fleet member has HIGH_INTERACTIVE priority');
  assert(fleetRelevance.replicationRateHz === 15, 'Fleet member replicates at 15 Hz');

  const regionalRelevance = VoyageAreaOfInterest.calculateRelevance('merchant_convoy', SimulationTier.SIM2_REGIONAL, 600);
  assert(regionalRelevance.networkPriority === NetworkPriority.MEDIUM_REGIONAL, 'SIM2 vessel has MEDIUM_REGIONAL priority');
  assert(regionalRelevance.replicationRateHz === 5, 'Regional vessel replicates at 5 Hz');

  const distantRelevance = VoyageAreaOfInterest.calculateRelevance('patrol_brig', SimulationTier.SIM3_DISTANT, 1200);
  assert(distantRelevance.networkPriority === NetworkPriority.LOW_HORIZON, 'SIM3 vessel has LOW_HORIZON priority');
  assert(distantRelevance.replicationRateHz === 1, 'Horizon vessel replicates at 1 Hz');

  const strategicRelevance = VoyageAreaOfInterest.calculateRelevance('world_trade_fleet', SimulationTier.SIM4_STRATEGIC, 3500);
  assert(strategicRelevance.networkPriority === NetworkPriority.DORMANT_STRATEGIC, 'SIM4 vessel has DORMANT_STRATEGIC priority');
  assert(strategicRelevance.replicationRateHz === 0.2, 'Strategic world entity replicates at 0.2 Hz (1 sync per 5 sec)');
}

// --- TEST SUITE 7: Large-Fleet Scalability (250 Concurrent Entities) ---
console.log('\n--- TEST SUITE 7: Large Fleet Manager (250 Entities Scalability) ---');
{
  const fleetManager = new VoyageFleetManager();
  const dummyFrustum = new THREE.Frustum();
  dummyFrustum.setFromProjectionMatrix(new THREE.Matrix4());

  const shipSpec = SHIP_CATALOG.sloop;
  const caveSanctuary = new THREE.Vector3(-380, 0, 220);
  const playerPos = new THREE.Vector3(0, 0, 0);
  const cameraPos = new THREE.Vector3(0, 30, -50);

  // Register 250 fleet entities across archipelago rings
  for (let i = 0; i < 250; i++) {
    const angle = i * 2.39996;
    const r = 50 + Math.sqrt(i) * 120; // range 50m to ~1950m
    const posX = Math.cos(angle) * r;
    const posZ = Math.sin(angle) * r;

    const entity: FleetEntity = {
      id: `ship_${i}`,
      name: `Vessel #${i}`,
      spec: shipSpec,
      faction: i % 3 === 0 ? 'pirates' : 'sovereign',
      isPirate: i % 3 === 0,
      hull: 100,
      hullMax: 100,
      sails: 100,
      sailsMax: 100,
      pos: new THREE.Vector3(posX, 0, posZ),
      heading: 0,
      speed: 12,
      turnSpeed: 0.8,
      reloadTimer: 3,
      isSinking: false,
      sinkTimer: 0,
      simTier: SimulationTier.SIM3_DISTANT,
      lodTier: 3,
      inCombat: false,
      renderVisible: false,
      lastSimUpdateFrame: 0,
    };
    fleetManager.registerEntity(entity);
  }

  assert(fleetManager.getEntities().length === 250, 'Registered 250 simulated fleet entities');

  // Run simulation tick
  const tStart = performance.now();
  fleetManager.updateFleetSimulation(
    0.016,
    1.0,
    playerPos,
    cameraPos,
    dummyFrustum,
    false,
    caveSanctuary
  );
  const tElapsed = performance.now() - tStart;

  const diag = fleetManager.getDiagnostics(32);
  console.log(`  📊 Fleet Sim Execution Time for 250 entities: ${tElapsed.toFixed(2)} ms`);
  console.log(`  📊 SIM Tier Counts: SIM0=${diag.simTiers.sim0}, SIM1=${diag.simTiers.sim1}, SIM2=${diag.simTiers.sim2}, SIM3=${diag.simTiers.sim3}, SIM4=${diag.simTiers.sim4}`);
  console.log(`  📊 AI Updates This Frame: ${diag.aiUpdatesThisFrame} (out of 250 entities)`);

  assert(tElapsed < 12.0, `Fleet update took ${tElapsed.toFixed(2)}ms (well within 16.6ms 60FPS frame budget)`);
  assert(diag.totalShips === 251, 'Total ships report 251 (250 fleet + 1 player flagship)');
  assert(diag.simTiers.sim0 > 0, 'Entities near origin correctly classified into SIM0');
  assert(diag.simTiers.sim4 > 0, 'Distant entities (>1500m) correctly classified into SIM4_STRATEGIC');
  assert(diag.aiUpdatesThisFrame < 250, 'Time-slicing successfully pruned full AI evaluation on distant ships');
}

console.log('\n======================================================================');
console.log('ALL PHASE 2.6 SIMULATION LOD & LARGE-FLEET ENGINE TESTS PASSED!');
console.log('======================================================================\n');
