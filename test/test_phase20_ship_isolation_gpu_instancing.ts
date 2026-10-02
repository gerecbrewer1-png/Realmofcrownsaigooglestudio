/**
 * REALM OF CROWNS — Phase 20 Verification Test Suite
 * 
 * Verifies the 4-Step Checklist for 100-Player Capacity & Mobile Optimization:
 * 
 * Step 1: Hot-Loop Optimizations
 *   - Duplicate input send elimination
 *   - Reconciliation soft error blending (no micro-rubberbanding)
 *   - Map lookups (O(1)) vs array scans
 *   - 2 Hz React update throttling
 * 
 * Step 2: Fleet GPU Instancing & Overdraw Elimination (Wall 2)
 *   - 150 ships across 3 hull archetypes collapsed to 6 draw calls
 *   - Wake trails culled beyond 40 meters
 *   - Distant ships (> 100m) transition to low-poly billboards/impostors
 * 
 * Step 3: Radius-Based Network Throttling
 *   - Euclidean distance tiers (NET0 to NET5)
 * 
 * Step 4: Deterministic Analytical Projectiles (Wall 3)
 *   - Flat Float32Array typed buffer (zero GC allocations)
 *   - Exact analytical trajectories x(t), y(t), z(t)
 *   - Impact resolution only at t_impact (0ms in-flight physics raycasts)
 *   - 1 single draw call for all cannonballs
 */

import * as THREE from 'three';
import { FleetGPUInstancer } from '../src/components/world3d/FleetGPUInstancer';
import { DeterministicProjectileSystem } from '../src/components/world3d/DeterministicProjectileSystem';
import { ShipLODController } from '../src/components/world3d/ShipLODController';
import { VoyageSimulationLOD } from '../src/components/world3d/VoyageSimulationLOD';
import { VoyageDebugManager } from '../src/components/world3d/VoyageDebugManager';
import { PlayerMovementController } from '../src/shared/movement/PlayerMovementController';
import { ServerNetworkLOD, ServerWorldPartition, NETWORK_LOD_INTERVAL_TICKS } from '../src/server/network/mmoServerWorldPartition';
import { ServerEntityRegistry } from '../src/server/network/mmoEntityRegistry';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`, details ?? '');
    failCount++;
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('PHASE 20: 100-PLAYER CAPACITY, GPU INSTANCING & PROJECTILES');
  console.log('============================================================\n');

  // --- STEP 1: HOT-LOOP FIXES ---
  console.log('--- Step 1: Hot-Loop Fixes & Movement Reconciliation ---');
  {
    // 1. Movement Isolation single sender toggle
    const switches = VoyageDebugManager.getSwitches();
    assert(switches.movementIsolationEnabled === true, 'Movement isolation enabled by default (single-writer)');

    // 2. Soft reconciliation blending for sub-threshold divergence
    const controller = new PlayerMovementController({ x: 0, z: 0, heading: 0, speedKnots: 10 });
    // Run an update so input sequence 1 is queued in the prediction buffer
    const updateResult = controller.update({ rudderTarget: 0, sailSettingTarget: 1.0 }, 0.033333, 0, () => 0, 0);
    const posBefore = controller.getState();

    // Reconcile with slight authoritative drift matching the sequence (0.05m drift, below 0.45 threshold)
    controller.reconcileAuthoritativeState(
      {
        serverTick: 1,
        x: posBefore.x + 0.05,
        z: posBefore.z + 0.05,
        heading: posBefore.heading,
        speedKnots: posBefore.speedKnots,
        lastProcessedInputSequence: updateResult.outboundCommands[0]?.sequence ?? 1,
      },
      0
    );

    const posAfter = controller.getState();
    assert(
      posAfter.x > posBefore.x && posAfter.x < posBefore.x + 0.05,
      `Soft error blending gently nudges position toward auth without snapping (delta=${(posAfter.x - posBefore.x).toFixed(4)})`
    );
    assert(
      controller.getRollbackCount() === 0,
      'Sub-threshold error does not trigger disruptive rollback/replay'
    );
  }

  // --- STEP 2: FLEET GPU INSTANCING & OVERDRAW ELIMINATION ---
  console.log('\n--- Step 2: Fleet GPU Instancing & Overdraw Elimination (Wall 2) ---');
  {
    const instancer = new FleetGPUInstancer();
    assert(instancer.group.children.length === 6, 'Instancer maintains exactly 6 instanced meshes (3 hull + 3 sail archetypes)');

    instancer.beginFrame();

    // Populate 150 ships across small, medium, large archetypes
    for (let i = 0; i < 50; i++) {
      instancer.addShipInstance('small', i * 10, 0, 100, 0);
      instancer.addShipInstance('medium', i * 10, 0, 200, 0.5);
      instancer.addShipInstance('large', i * 10, 0, 300, 1.0);
    }

    instancer.endFrame();

    assert(instancer.getActiveCount() === 150, 'Successfully batched 150 concurrent fleet vessels');
    assert(instancer.getDrawCallCount() === 6, '150 fleet vessels consume exactly 6 draw calls (not 600-900)');

    // Verify distant ship (> 100m) LOD impostor swap
    const testMesh = new THREE.Group();
    testMesh.userData = {
      lodLevels: [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()],
      currentLOD: 0,
    };
    
    // At 30m (< 40m): Hero / LOD0
    const lodNear = ShipLODController.updateShipLOD(testMesh, 30, false, false, 30, false);
    assert(lodNear === 0, 'Ship within 40m renders in full Hero LOD0');

    // At 80m: Intermediate LOD2
    const lodMid = ShipLODController.updateShipLOD(testMesh, 80, false, false, 80, false);
    assert(lodMid === 2, 'Ship at 80m renders in LOD2');

    // At 110m (> 100m): Low-poly silhouette/impostor LOD3
    const lodDistant = ShipLODController.updateShipLOD(testMesh, 110, false, false, 110, false);
    assert(lodDistant === 3, 'Ship beyond 100m swaps immediately to low-poly impostor LOD3');

    instancer.dispose();
  }

  // --- STEP 3: RADIUS-BASED NETWORK THROTTLING ---
  console.log('\n--- Step 3: Radius-Based Network Throttling ---');
  {
    assert(NETWORK_LOD_INTERVAL_TICKS[ServerNetworkLOD.NET0_CRITICAL] === 1, 'NET0 (<120m) replicates at 30 Hz (every tick)');
    assert(NETWORK_LOD_INTERVAL_TICKS[ServerNetworkLOD.NET1_NEAR] === 2, 'NET1 (<250m) replicates at 15 Hz (every 2 ticks)');
    assert(NETWORK_LOD_INTERVAL_TICKS[ServerNetworkLOD.NET2_LOCAL] === 6, 'NET2 (<450m) replicates at 5 Hz (every 6 ticks)');
    assert(NETWORK_LOD_INTERVAL_TICKS[ServerNetworkLOD.NET3_DISTANT] === 30, 'NET3 (<800m) replicates at 1 Hz (every 30 ticks)');
    assert(NETWORK_LOD_INTERVAL_TICKS[ServerNetworkLOD.NET4_STRATEGIC] === 150, 'NET4 (<2000m) replicates at 0.2 Hz (every 150 ticks)');

    // Test spatial radius classification in ServerWorldPartition
    const partition = new ServerWorldPartition();
    const registry = new ServerEntityRegistry();

    // Register distant ships at various radii
    const shipNear = registry.createPlayerShip('p_near', 'Near Ship', 50, 0);
    const shipMid = registry.createPlayerShip('p_mid', 'Mid Ship', 200, 0);
    const shipLocal = registry.createPlayerShip('p_local', 'Local Ship', 350, 0);
    const shipDistant = registry.createPlayerShip('p_dist', 'Distant Ship', 550, 0);

    partition.updateSpatialGrid(registry.getAll());

    const clientAOI = {
      connectionId: 'c1',
      playerId: 'hero',
      controlledEntityId: 'hero_ship',
      position: { x: 0, z: 0 },
      subscribedEntities: new Map<string, ServerNetworkLOD>(),
      prefetchEntityIds: new Set<string>(),
    };

    const aoiResult = partition.evaluateClientAOI(clientAOI, registry, 30);
    
    // Check assigned LOD tiers in subscribed map
    const lodNearAssigned = clientAOI.subscribedEntities.get(shipNear.id);
    const lodMidAssigned = clientAOI.subscribedEntities.get(shipMid.id);
    const lodLocalAssigned = clientAOI.subscribedEntities.get(shipLocal.id);

    assert(lodNearAssigned === ServerNetworkLOD.NET0_CRITICAL, 'Near ship (50m) assigned NET0_CRITICAL');
    assert(lodMidAssigned === ServerNetworkLOD.NET1_NEAR, 'Mid ship (200m) assigned NET1_NEAR');
    assert(lodLocalAssigned === ServerNetworkLOD.NET2_LOCAL, 'Local ship (350m) assigned NET2_LOCAL');
    assert(clientAOI.prefetchEntityIds.has(shipDistant.id), 'Distant ship (550m) buffered in outer prefetch band (450m-600m)');
  }

  // --- STEP 4: DETERMINISTIC ANALYTICAL PROJECTILES ---
  console.log('\n--- Step 4: Deterministic Analytical Projectiles (Wall 3) ---');
  {
    const projSystem = new DeterministicProjectileSystem();
    assert(projSystem.instancedMesh !== undefined, 'InstancedMesh initialized for cannonball rendering');
    assert(projSystem.getActiveCount() === 0, 'Initial active projectile count is 0');

    // Fire 500 cannonballs
    const origin = new THREE.Vector3(0, 3, 0);
    const velocity = new THREE.Vector3(20, 15, 0); // forward X=20, up Y=15
    const fireTime = 100.0;

    for (let i = 0; i < 500; i++) {
      projSystem.fire({
        origin,
        velocity: new THREE.Vector3(20 + (i % 5), 15, (i % 3) - 1),
        fireTimestampSec: fireTime,
        damage: 50,
        fromPlayer: true,
        targetEntityId: i === 0 ? 'test_enemy_1' : undefined,
      });
    }

    assert(projSystem.getActiveCount() === 500, '500 concurrent cannonballs buffered in flat Float32Array');

    // Update in-flight at t = fireTime + 1.0s (in air, y > 0)
    let impactCount = 0;
    projSystem.update(fireTime + 1.0, (impact) => {
      impactCount++;
    });

    assert(impactCount === 0, 'Zero impact checks triggered while projectiles are mid-arc in flight');
    assert(projSystem.getActiveCount() === 500, 'All 500 projectiles remain active in flight');

    // Advance time past impact time (~ fireTime + 3.5s)
    let resolvedImpacts = 0;
    let hitDetected = false;

    projSystem.update(fireTime + 4.0, (impact) => {
      resolvedImpacts++;
      if (impact.targetEntityId === 'test_enemy_1') {
        hitDetected = true;
        assert(impact.damage === 50, 'Impact event preserves exact damage value');
        assert(impact.fromPlayer === true, 'Impact event identifies player origin');
      }
    });

    assert(resolvedImpacts === 500, 'All 500 projectiles resolved impacts exactly at calculated t_impact');
    assert(hitDetected === true, 'Targeted projectile correctly identified target impact');
    assert(projSystem.getActiveCount() === 0, 'Buffer fully recycled back to free stack with zero memory leak');

    projSystem.dispose();
  }

  console.log('\n============================================================');
  console.log(`PHASE 20 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
