/**
 * REALM OF CROWNS — Performance Audit Profiler & Benchmark
 * Measures execution times, per-frame memory allocations, and scene complexity
 * for PlayCanvas tactical runtime and simulation systems.
 */

import { DecisionSystem, WorldContext } from '../src/game/ai/decisionSystem';
import { NPCEntity, PersonalityTrait } from '../src/game/npc/npcTypes';
import { CombatSystem } from '../src/game/combat/combatSystem';
import { Combatant } from '../src/game/combat/combatTypes';
import { ArmyController } from '../src/game/armies/armyController';
import { AnimalSystem } from '../src/game/npc/animalSystem';
import { RaidEventSystem, RaiderUnit } from '../src/game/events/raidEventSystem';
import { HeightMap } from '../src/game/terrain/core/HeightMap';
import { HeightfieldShape } from '../src/game/terrain/core/HeightfieldShape';

console.log('====================================================');
console.log('REALM OF CROWNS — PERFORMANCE AUDIT PROFILER (PHASE 1)');
console.log('====================================================\n');

// 1. Setup simulated scene environment matching PlayCanvasApp
const heightMap = new HeightMap(129, 129, 24, 33);
heightMap.generateProcedural(777, 0.5, 24 * 0.85);
const heightfield = new HeightfieldShape(heightMap);

const armyController = new ArmyController();
const combatSystem = new CombatSystem();
const animalSystem = new AnimalSystem();
const raidSystem = new RaidEventSystem();

// Populate 12 villagers
const npcs: NPCEntity[] = [];
const roles: any[] = ['farmer', 'blacksmith', 'guard', 'woodcutter', 'miner', 'merchant', 'baker', 'priest', 'builder', 'innkeeper', 'weaver', 'brewer'];
for (let i = 0; i < 12; i++) {
  npcs.push({
    id: `npc_${i}`,
    name: `Villager ${i}`,
    role: roles[i],
    faction: 'kingdom',
    traits: new Set<PersonalityTrait>(['HARDWORKING']),
    courage: 0.5,
    aggression: 0.2,
    loyalty: 0.8,
    sociability: 0.7,
    position: { x: (i % 4) * 5 - 10, y: 0, z: Math.floor(i / 4) * 5 - 10 },
    targetPosition: { x: 0, y: 0, z: 0 },
    velocity: { x: 0.1, y: 0, z: 0.1 },
    rotationY: 0,
    moveSpeed: 2.2,
    health: 100,
    maxHealth: 100,
    attackPower: 10,
    attackRange: 1.5,
    attackCooldownMs: 1500,
    lastAttackTimestamp: 0,
    activity: 'working',
    needs: { survival: 80, safety: 90, work: 70, social: 60, duty: 50 },
    memories: [],
    relationshipScore: 50,
    currentTargetId: null,
    homePosition: { x: -10, y: 0, z: -10 },
    workPosition: { x: 5, y: 0, z: 5 },
    animationState: 'Walking_A'
  });
}

// Spawn 15 raiders
const raiders: RaiderUnit[] = [];
for (let i = 0; i < 15; i++) {
  raiders.push({
    id: `raider_${i}`,
    name: `Raider Raider ${i}`,
    type: i % 3 === 0 ? 'archer' : 'infantry',
    x: 35 + (i % 5) * 3,
    y: 0,
    z: 30 + Math.floor(i / 5) * 3,
    targetObjective: { x: 0, z: 0, label: 'Citadel' },
    hp: 80,
    maxHp: 80,
    attackDamage: 14,
    attackRange: i % 3 === 0 ? 12 : 2.2,
    attackCooldown: 0,
    speed: 2.8,
    isLeader: i === 0,
    isDead: false,
    killBountyGold: 15,
    rotationY: Math.PI
  });
}

// 2. Measure Garbage Allocation in baseline onUpdate loop
const ITERATIONS = 1000;
console.log(`Running ${ITERATIONS} simulated frames of baseline CPU update logic...`);

// Test A: Per-frame allocation profiling
if (global.gc) { global.gc(); }
const memBefore = process.memoryUsage().heapUsed;
const tStart = performance.now();

let totalDecisionMs = 0;
let totalHeightMs = 0;
let totalArmyMs = 0;
let totalAnimalMs = 0;
let totalCombatMs = 0;

for (let frame = 0; frame < ITERATIONS; frame++) {
  const dt = 0.016;

  // 1. Raider map & Set allocation (baseline pattern from PlayCanvasApp.ts lines 1234-1263)
  const tDec0 = performance.now();
  const raiderEntities: NPCEntity[] = raiders.map(r => ({
    id: r.id,
    name: r.name,
    role: 'bandit',
    faction: 'bandits',
    traits: new Set<PersonalityTrait>(['AGGRESSIVE', 'BRAVE']),
    courage: 0.8,
    aggression: 0.9,
    loyalty: 0.5,
    sociability: 0.3,
    position: { x: r.x, y: 0, z: r.z },
    targetPosition: { x: r.targetObjective.x, y: 0, z: r.targetObjective.z },
    velocity: { x: 0, y: 0, z: 0 },
    rotationY: r.rotationY,
    moveSpeed: 2.8,
    health: r.hp,
    maxHp: r.maxHp,
    attackPower: r.attackDamage,
    attackRange: r.attackRange,
    attackCooldownMs: 1500,
    lastAttackTimestamp: 0,
    activity: 'attacking',
    needs: { survival: 100, safety: 80, work: 0, social: 0, duty: 100 },
    memories: [],
    relationshipScore: -100,
    currentTargetId: null,
    homePosition: { x: r.x, y: 0, z: r.z },
    workPosition: { x: 0, y: 0, z: 0 },
    animationState: 'Running_A'
  }));

  const worldContext: WorldContext = {
    timeOfDayHours: 12.0,
    isRaidActive: true,
    playerPos: { x: 0, y: 0, z: 8 },
    threats: raiderEntities,
    allies: npcs,
    villageCenter: { x: 0, y: 0, z: 0 },
    safeHouse: { x: 0, y: 0, z: -18 }
  };

  for (const npc of npcs) {
    DecisionSystem.updateDecision(npc, worldContext, dt);
    DecisionSystem.executeMovement(npc, dt);
  }
  totalDecisionMs += (performance.now() - tDec0);

  // 2. Terrain height sampling for 50 entities
  const tHeight0 = performance.now();
  for (let i = 0; i < 50; i++) {
    heightfield.getHeightAt(i * 1.5 - 25, (i % 10) * 2 - 10);
  }
  totalHeightMs += (performance.now() - tHeight0);

  // 3. Animal system update
  const tAnim0 = performance.now();
  const threatPositions = [
    { id: 'hero', x: 0, z: 8, isHero: true, hp: 450 },
    ...raiders.map(r => ({ id: r.id, x: r.x, z: r.z, isRaider: true, hp: r.hp }))
  ];
  animalSystem.update(dt, threatPositions);
  totalAnimalMs += (performance.now() - tAnim0);

  // 4. Army controller update
  const tArmy0 = performance.now();
  armyController.update(
    dt,
    { x: 0, y: 0, z: 8, rotationY: Math.PI },
    raiders.map(r => ({ id: r.id, x: r.x, z: r.z, team: 'enemy', isDead: r.isDead }))
  );
  totalArmyMs += (performance.now() - tArmy0);
}

const tTotal = performance.now() - tStart;
const memAfter = process.memoryUsage().heapUsed;
const heapDeltaMB = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

console.log('--- BASELINE CPU TIMINGS & ALLOCATIONS ---');
console.log(`Total duration for ${ITERATIONS} frames: ${tTotal.toFixed(2)} ms`);
console.log(`Average CPU simulation time per frame: ${(tTotal / ITERATIONS).toFixed(3)} ms`);
console.log(`- DecisionSystem + raiders mapping: ${(totalDecisionMs / ITERATIONS).toFixed(3)} ms/frame`);
console.log(`- ArmyController + formations:      ${(totalArmyMs / ITERATIONS).toFixed(3)} ms/frame`);
console.log(`- AnimalSystem + threat checks:     ${(totalAnimalMs / ITERATIONS).toFixed(3)} ms/frame`);
console.log(`- Terrain 50x height sampling:      ${(totalHeightMs / ITERATIONS).toFixed(3)} ms/frame`);
console.log(`Heap churn in ${ITERATIONS} frames: +${heapDeltaMB} MB allocated`);
console.log(`Estimated object allocations per frame: ~${15 * 5 + 35} objects/frame (~${((15 * 5 + 35) * 60).toLocaleString()} objects/sec)\n`);

// 3. Mesh instance & draw call audit
console.log('--- SCENE GRAPH & RENDER PASS AUDIT ---');
const CHARACTERS = 1 + 30 + 12 + 8 + 1 + 15; // Hero (1) + Squad (30) + Villagers (12) + Animals (8) + Challenger (1) + Raiders (15) = 67
const PARTS_PER_CHAR = 11; // body, torso, crest, head, 2 legs, weapon(2), shield(2), 2 healthbar boxes
const PARTS_PER_ANIMAL = 8; // body, neck, head, 4 legs, ears/horns
const TERRAIN_PATCHES = 16;
const STATIC_PROPS = 85;

const dynamicMeshInstances = (CHARACTERS - 8) * PARTS_PER_CHAR + 8 * PARTS_PER_ANIMAL;
const totalForwardMeshInstances = dynamicMeshInstances + TERRAIN_PATCHES + STATIC_PROPS;
const shadowCastersUnoptimized = totalForwardMeshInstances; // Default castShadows = true on all render components
const estimatedDrawCallsUnoptimized = totalForwardMeshInstances + shadowCastersUnoptimized;

console.log(`Total dynamic characters: ${CHARACTERS}`);
console.log(`Total dynamic character/animal mesh instances: ${dynamicMeshInstances}`);
console.log(`Total forward pass mesh instances: ~${totalForwardMeshInstances}`);
console.log(`Shadow caster mesh instances (unoptimized): ~${shadowCastersUnoptimized}`);
console.log(`Estimated total draw calls per frame (forward + shadow): ~${estimatedDrawCallsUnoptimized} calls!`);

console.log('\nAudit benchmark completed.');
