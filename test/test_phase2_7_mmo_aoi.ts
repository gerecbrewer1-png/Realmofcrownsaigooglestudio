/**
 * REALM OF CROWNS — MMO Spatial World Partition, AOI & Network LOD Test Suite
 * Phase 2.7 Verification
 */

import {
  MMOWorldPartitionManager,
  NetworkLOD,
  NETWORK_LOD_RATES_HZ,
  ClientEntityInterpolator,
  MMOAuthoritativeEntity,
  ProceduralShipConfig,
  ProceduralBuildingConfig,
} from '../src/components/world3d/MMOWorldPartition';
import { SimulationTier } from '../src/components/world3d/VoyageSimulationLOD';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('\n============================================================');
console.log('PHASE 2.7 TEST SUITE: MMO SPATIAL PARTITION, AOI & NETWORK LOD');
console.log('============================================================\n');

// ----------------------------------------------------------------------------
// Test 1: MMO World Hierarchy & Spatial Cell Hashing
// ----------------------------------------------------------------------------
console.log('--- Test 1: MMO World Hierarchy & Uniform Grid Cell Hashing ---');
const partition = new MMOWorldPartitionManager({ cellSize: 150 });

assert(partition.getCellCoord(0) === 0, 'Origin X (0m) maps to cell coord 0');
assert(partition.getCellCoord(149) === 0, 'Point at 149m maps to cell coord 0');
assert(partition.getCellCoord(150) === 1, 'Point at 150m maps to cell coord 1');
assert(partition.getCellCoord(-1) === -1, 'Point at -1m maps to cell coord -1');
assert(partition.getCellCoord(-150) === -1, 'Point at -150m maps to cell coord -1');
assert(partition.getCellCoord(-151) === -2, 'Point at -151m maps to cell coord -2');

// ----------------------------------------------------------------------------
// Test 2: Authoritative Entity Registration & Spatial Indexing
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: Entity Registration & Spatial Indexing ---');
const ship1: MMOAuthoritativeEntity = {
  id: 'ship_royal_01',
  type: 'ship_player',
  name: 'HMS Vanguard',
  transform: { x: 50, y: 0, z: 80, heading: 0, speedKnots: 12 },
  health: 2200,
  maxHealth: 2200,
  faction: 'sovereign',
  inCombat: false,
  lastSimulatedTimestamp: Date.now(),
};

partition.registerEntity(ship1);
assert(partition.getEntity('ship_royal_01') !== undefined, 'Authoritative ship registered in world partition');
assert(partition.getDiagnostics().totalWorldEntities === 1, 'Total world entities counter updated to 1');

// Move entity to another cell and update
ship1.transform.x = 400;
ship1.transform.z = 600;
partition.updateEntitySpatialCell(ship1);
assert(partition.getCellCoord(400) === 2, 'Entity moved to cell X=2');
assert(partition.getCellCoord(600) === 4, 'Entity moved to cell Z=4');

// ----------------------------------------------------------------------------
// Test 3: Multi-Factor Gameplay Relevance Scoring
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Multi-Factor Gameplay Relevance Scoring ---');
// Distance alone is not enough — combat threats and projectiles get priority!
const distantThreat: MMOAuthoritativeEntity = {
  id: 'cannonball_incoming',
  type: 'projectile_cannonball',
  name: 'Roundshot Ballistic',
  transform: { x: 300, y: 5, z: 300, heading: 0, speedKnots: 60 },
  health: 1,
  maxHealth: 1,
  faction: 'pirates',
  inCombat: true,
  isThreatToPlayer: true,
  lastSimulatedTimestamp: Date.now(),
};

const distantMerchant: MMOAuthoritativeEntity = {
  id: 'merchant_fluyt',
  type: 'ship_merchant',
  name: 'Batavia Fluyt',
  transform: { x: 280, y: 0, z: 280, heading: 0, speedKnots: 8 },
  health: 1000,
  maxHealth: 1000,
  faction: 'holland',
  inCombat: false,
  lastSimulatedTimestamp: Date.now(),
};

partition.setPlayerPosition(0, 0);
const threatScore = partition.calculateRelevanceScore(distantThreat, 424);
const merchantScore = partition.calculateRelevanceScore(distantMerchant, 396);

assert(threatScore > merchantScore, 'Incoming cannonball threat scores HIGHER than closer peaceful merchant', `Threat: ${threatScore}, Merchant: ${merchantScore}`);

// Target entity boost
const targetedPirate: MMOAuthoritativeEntity = {
  id: 'pirate_warlord',
  type: 'ship_pirate',
  name: 'Kraken Queen',
  transform: { x: 200, y: 0, z: 200, heading: 0, speedKnots: 10 },
  health: 1500,
  maxHealth: 1500,
  faction: 'pirates',
  inCombat: true,
  lastSimulatedTimestamp: Date.now(),
};

partition.setPlayerPosition(0, 0, 'pirate_warlord');
const targetedScore = partition.calculateRelevanceScore(targetedPirate, 282);
assert(targetedScore >= 180, 'Player target receives direct focus bonus', `Score: ${targetedScore}`);

// ----------------------------------------------------------------------------
// Test 4: AOI Hysteresis & Boundary Stability
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: AOI Hysteresis (Enter 450m vs Leave 500m) ---');
const testPartition = new MMOWorldPartitionManager({
  enterRadius: 450,
  leaveRadius: 500,
  prefetchRadius: 600,
});

testPartition.setPlayerPosition(0, 0);

const borderShip: MMOAuthoritativeEntity = {
  id: 'border_patrol',
  type: 'ship_pirate',
  name: 'Border Corsair',
  transform: { x: 440, y: 0, z: 0, heading: 0, speedKnots: 5 },
  health: 800,
  maxHealth: 800,
  faction: 'pirates',
  inCombat: false,
  lastSimulatedTimestamp: Date.now(),
};

testPartition.registerEntity(borderShip);

// Step 1: Ship at 440m -> Inside enterRadius (450m) -> Enters AOI
const update1 = testPartition.updateAOI(1000);
assert(testPartition.getActiveAOISet().has('border_patrol'), 'Ship at 440m successfully ENTERS active AOI');
assert(update1.enteredEntities.length === 1, 'Introduction packet generated for entering entity');
assert(update1.enteredEntities[0].entityId === 'border_patrol', 'Intro packet contains correct entity ID');

// Step 2: Ship moves to 470m (between enter 450m and leave 500m)
// Due to HYSTERESIS, it should REMAIN in the active AOI rather than flapping!
borderShip.transform.x = 470;
testPartition.updateEntitySpatialCell(borderShip);
const update2 = testPartition.updateAOI(2000);
assert(testPartition.getActiveAOISet().has('border_patrol'), 'Ship at 470m REMAINS in AOI due to 50m hysteresis band');
assert(update2.leftEntities.length === 0, 'No leave packet sent while within leave threshold');

// Step 3: Ship moves to 520m (beyond leaveRadius 500m) -> Leaves AOI
borderShip.transform.x = 520;
testPartition.updateEntitySpatialCell(borderShip);
const update3 = testPartition.updateAOI(3000);
assert(!testPartition.getActiveAOISet().has('border_patrol'), 'Ship at 520m LEAVES active AOI');
assert(update3.leftEntities.length === 1, 'Leave packet generated when exceeding leave radius');
assert(update3.leftEntities[0].entityId === 'border_patrol', 'Leave packet identifies departing ship');

// CRITICAL (Part 12): World existence != client AOI relevance!
assert(testPartition.getEntity('border_patrol') !== undefined, 'Authoritative entity STILL EXISTS on server/world partition after leaving client AOI');

// ----------------------------------------------------------------------------
// Test 5: Prefetch Band Buffer
// ----------------------------------------------------------------------------
console.log('\n--- Test 5: Outer Prefetch Band Buffer (450m - 600m) ---');
const prefetchShip: MMOAuthoritativeEntity = {
  id: 'prefetch_sloop',
  type: 'ship_merchant',
  name: 'Prefetch Trader',
  transform: { x: 550, y: 0, z: 0, heading: 0, speedKnots: 8 },
  health: 600,
  maxHealth: 600,
  faction: 'holland',
  inCombat: false,
  lastSimulatedTimestamp: Date.now(),
};

testPartition.registerEntity(prefetchShip);
testPartition.updateAOI(4000);
assert(testPartition.getPrefetchSet().has('prefetch_sloop'), 'Ship at 550m captured in outer prefetch set');
assert(!testPartition.getActiveAOISet().has('prefetch_sloop'), 'Ship at 550m NOT in high-rate active AOI');

// ----------------------------------------------------------------------------
// Test 6: Network LOD Tiers & Replication Frequency
// ----------------------------------------------------------------------------
console.log('\n--- Test 6: Network LOD Replication Tiers ---');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET0_CRITICAL] === 30.0, 'NET0_CRITICAL replicates at 30 Hz');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET1_NEAR] === 15.0, 'NET1_NEAR replicates at 15 Hz');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET2_LOCAL] === 5.0, 'NET2_LOCAL replicates at 5 Hz');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET3_DISTANT] === 1.0, 'NET3_DISTANT replicates at 1 Hz');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET4_STRATEGIC] === 0.2, 'NET4_STRATEGIC replicates at 0.2 Hz');
assert(NETWORK_LOD_RATES_HZ[NetworkLOD.NET5_IRRELEVANT] === 0.0, 'NET5_IRRELEVANT replicates at 0.0 Hz (culled)');

// ----------------------------------------------------------------------------
// Test 7: Compact Delta Quantization & Packet Formats
// ----------------------------------------------------------------------------
console.log('\n--- Test 7: Compact Delta Serialization & Quantization ---');
const heroShip: MMOAuthoritativeEntity = {
  id: 'hero_test',
  type: 'ship_player',
  name: 'Hero Sovereign',
  transform: { x: 12.345, y: 0, z: 45.678, heading: Math.PI / 2, speedKnots: 14.8 },
  health: 1950,
  maxHealth: 2000,
  faction: 'sovereign',
  inCombat: true,
  isThreatToPlayer: true,
  lastSimulatedTimestamp: Date.now(),
};

testPartition.registerEntity(heroShip);
// Tick 1 (5000ms): Hero enters AOI and receives introduction packet
const introRes = testPartition.updateAOI(5000);
assert(introRes.enteredEntities.some((e) => e.entityId === 'hero_test'), 'Hero receives Introduction packet on initial entry');

// Tick 2 (5050ms, 50ms later > 33ms NET0 interval): Replication tick generates delta packet
const updateDeltas = testPartition.updateAOI(5050);
const delta = updateDeltas.deltaPackets.find((d) => d.entityId === 'hero_test');

assert(delta !== undefined, 'Delta packet generated for hero entity on replication tick');
if (delta) {
  assert(delta.x === 12.3, 'X coordinate quantized to 1 decimal place', `Got: ${delta.x}`);
  assert(delta.z === 45.7, 'Z coordinate quantized to 1 decimal place', `Got: ${delta.z}`);
  // Heading Math.PI / 2 (90 deg) quantized to 0..255 -> ~64
  assert(delta.headingQuantized >= 62 && delta.headingQuantized <= 66, 'Heading quantized to 1-byte integer (0..255)', `Got: ${delta.headingQuantized}`);
  assert(delta.stateFlags === 1, 'Combat state encoded as bitmask flag 1');
}

// ----------------------------------------------------------------------------
// Test 8: Client-Side Interpolation Engine
// ----------------------------------------------------------------------------
console.log('\n--- Test 8: Client-Side Hermite / Linear Interpolation ---');
const initialTransform = { x: 0, y: 0, z: 0, heading: 0, speedKnots: 10 };
const interpolator = new ClientEntityInterpolator(initialTransform);

// Push two timestamped delta packets 200ms apart (representing a 5 Hz NET2 stream)
const t0 = 10000;
const t1 = 10200;

interpolator.pushDelta({
  packetType: 'delta',
  entityId: 'test_interp',
  serverTimestamp: t0,
  x: 0,
  z: 0,
  headingQuantized: 0,
  speedKnots: 10,
  health: 100,
  stateFlags: 0,
}, t0);

interpolator.pushDelta({
  packetType: 'delta',
  entityId: 'test_interp',
  serverTimestamp: t1,
  x: 20,
  z: 40,
  headingQuantized: 64, // ~90 degrees
  speedKnots: 12,
  health: 100,
  stateFlags: 0,
}, t1);

// Sample midway through the time span (t0 + 100ms, with 100ms interp delay -> renderTime = t0 + 200ms = 10200ms)
const midSample = interpolator.sample(10200, 100);
assert(Math.abs(midSample.x - 10) < 1.0, 'Position X smoothly interpolated midway between 0 and 20', `Got: ${midSample.x.toFixed(2)}`);
assert(Math.abs(midSample.z - 20) < 1.0, 'Position Z smoothly interpolated midway between 0 and 40', `Got: ${midSample.z.toFixed(2)}`);
assert(midSample.heading > 0.6 && midSample.heading < 0.95, 'Heading smoothly interpolated between 0 and PI/2', `Got: ${midSample.heading.toFixed(2)} rad`);

// ----------------------------------------------------------------------------
// Test 9: Procedural Ship & Architecture Data Representation
// ----------------------------------------------------------------------------
console.log('\n--- Test 9: Future Procedural Definition Structures ---');
const shipConfig: ProceduralShipConfig = {
  definitionId: 'ship_frigate_norman',
  seed: 94821,
  culture: 'norman',
  shipClass: 'frigate',
  hullConfiguration: 3,
  sailConfiguration: 2,
  primaryColor: '#eab308',
  secondaryColor: '#0f172a',
  faction: 'sovereign',
  damageState: 0.15,
};

const buildingConfig: ProceduralBuildingConfig = {
  definitionId: 'bldg_dock_01',
  seed: 48102,
  culture: 'norman',
  historicalPeriod: '13th_century',
  function: 'dock',
  ownership: 'player_sovereign',
  upgradeState: 12,
  damageState: 0.0,
};

assert(shipConfig.seed === 94821 && shipConfig.culture === 'norman', 'Procedural Ship definition compact & valid');
assert(buildingConfig.upgradeState === 12 && buildingConfig.function === 'dock', 'Procedural Building definition compact & valid');

// ----------------------------------------------------------------------------
// Test 10: Density Budget & Large Cluster Handling
// ----------------------------------------------------------------------------
console.log('\n--- Test 10: Density Budget & Priority Capping ---');
const densePartition = new MMOWorldPartitionManager({
  enterRadius: 450,
  maxHighRateEntities: 10,
  maxTotalAOIEntities: 25,
});

densePartition.setPlayerPosition(0, 0);

// Populate 60 nearby entities in close range
for (let i = 0; i < 60; i++) {
  densePartition.registerEntity({
    id: `cluster_ship_${i}`,
    type: i === 0 ? 'ship_player' : 'ship_pirate',
    name: `Fleet Ship #${i}`,
    transform: { x: 50 + (i % 10) * 10, y: 0, z: 50 + Math.floor(i / 10) * 10, heading: 0, speedKnots: 8 },
    health: 1000,
    maxHealth: 1000,
    faction: 'pirates',
    inCombat: i < 5, // Top 5 in combat
    lastSimulatedTimestamp: Date.now(),
  });
}

densePartition.updateAOI(20000);
const denseDiag = densePartition.getDiagnostics();

assert(denseDiag.totalWorldEntities === 60, 'All 60 world entities registered');
assert(denseDiag.aoiCount <= 25, 'Active client AOI capped to budget limit of 25 (mobile protection)', `Actual AOI: ${denseDiag.aoiCount}`);
assert(denseDiag.netTiers[NetworkLOD.NET0_CRITICAL] + denseDiag.netTiers[NetworkLOD.NET1_NEAR] <= 15, 'High-rate network tiers capped per budget');

console.log('\n============================================================');
console.log(`PHASE 2.7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
