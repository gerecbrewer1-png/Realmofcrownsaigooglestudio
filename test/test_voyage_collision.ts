import * as THREE from 'three';
import { VoyageCollisionSystem } from '../src/components/world3d/VoyageCollisionSystem';

console.log('====================================================');
console.log('VOYAGE COLLISION & OBSTACLE PHYSICAL TEST SUITE');
console.log('====================================================');

VoyageCollisionSystem.initialize();
const obstacles = VoyageCollisionSystem.getObstacles();
console.log(`✓ Initialized ${obstacles.length} solid land & island obstacles.`);

let passed = 0;
let failed = 0;

function assert(cond: boolean, desc: string) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

// --- TEST 1: Island Perimeter Solid Collision ---
console.log('\n--- Test 1: Island Solid Shoreline Collision ---');
const oxbay = obstacles.find((o) => o.id === 'oxbay')!;
const shipPos = new THREE.Vector3(oxbay.x + 10, 0, oxbay.z + 10);
const shipRadius = 15;
const originalDist = Math.hypot(shipPos.x - oxbay.x, shipPos.z - oxbay.z);

assert(originalDist < oxbay.solidRadius + shipRadius, 'Ship initially starts inside island collision zone');

const colResult = VoyageCollisionSystem.resolveLandCollision(shipPos, shipRadius, 8.0, 0, 1.0);
const newDist = Math.hypot(shipPos.x - oxbay.x, shipPos.z - oxbay.z);

assert(colResult.collided === true, 'Collision was detected with Oxbay');
assert(colResult.type === 'island', 'Collision type is island');
assert(newDist >= oxbay.solidRadius + shipRadius - 0.01, `Ship pushed out to safety (newDist: ${newDist.toFixed(1)} >= ${oxbay.solidRadius + shipRadius})`);
assert(colResult.damage > 0, `Grounding damage applied for high speed entry: ${colResult.damage} HP`);

// --- TEST 2: Northern Mainland Continental Cliff Barrier ---
console.log('\n--- Test 2: Northern Mainland Continental Boundary ---');
const mainlandShipPos = new THREE.Vector3(50, 0, 860); // Past 835 limit
const mainlandCol = VoyageCollisionSystem.resolveLandCollision(mainlandShipPos, 15, 6.0, 0, 2.0);

assert(mainlandCol.collided === true, 'Northern mainland wall blocks forward movement');
assert(mainlandShipPos.z <= VoyageCollisionSystem.MAINLAND_Z_LIMIT - 15, `Ship clamped below mainland limit (Z: ${mainlandShipPos.z})`);
assert(mainlandCol.type === 'mainland', 'Collision identified as northern mainland');

// --- TEST 3: Ship-to-Ship Hull Separation & Ramming ---
console.log('\n--- Test 3: Ship-to-Ship Physical Separation & Ramming ---');
const shipA = new THREE.Vector3(100, 0, 100);
const shipB = new THREE.Vector3(108, 0, 100); // 8m apart, both with radius 16 (minDist 32)
const shipCol = VoyageCollisionSystem.resolveShipToShipCollision(shipA, 16, 8.0, shipB, 16, 5.0, 3.0);

assert(shipCol.collided === true, 'Ship-to-ship collision detected');
const finalShipDist = shipA.distanceTo(shipB);
assert(finalShipDist >= 32 - 0.01, `Ships pushed apart to touch boundaries (final dist: ${finalShipDist.toFixed(1)}m >= 32m)`);
assert(shipCol.rammingDamageA > 0, `Ramming damage dealt: ${shipCol.rammingDamageA} HP`);

// --- TEST 4: AI Fleet Island Avoidance Steering ---
console.log('\n--- Test 4: AI Fleet Island Avoidance Steering ---');
// AI ship approaching island from west (heading east = PI/2)
const aiHeading = Math.PI * 0.5;
const adjustedHeading = VoyageCollisionSystem.calculateIslandAvoidanceHeading(
  oxbay.x - oxbay.warningRadius + 10,
  oxbay.z,
  aiHeading,
  0.5,
  0.1
);

assert(adjustedHeading !== aiHeading, `AI steered away from island (from ${aiHeading.toFixed(2)} to ${adjustedHeading.toFixed(2)})`);

console.log(`\n====================================================`);
console.log(`COLLISION SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
console.log(`====================================================`);

if (failed > 0) process.exit(1);
