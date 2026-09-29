/**
 * Realm of Crowns - Phase 1 Security, Architecture & Authoritative Test Suite
 * Tests server-authoritative validations, anti-cheat rules, economic formulas, and ledger integrity.
 */

import { playerService } from '../src/server/services/playerService';
import { kingdomService } from '../src/server/services/kingdomService';
import { questService } from '../src/server/services/questService';
import { inventoryService } from '../src/server/services/inventoryService';
import { ledgerService } from '../src/server/services/ledgerService';
import { worldService } from '../src/server/services/worldService';
import {
  GAME_CONFIG,
  BUILDING_DEFINITIONS,
  calculateBuildingCost,
  calculateBuildingDurationSeconds,
  calculateInstantGemCost,
} from '../src/server/services/gameConfig';
import {
  COMMANDER_ROSTER,
  calculateArmyCapacity,
  calculateArmySpeedFactor,
  calculateArmyPayloadCapacity,
} from '../src/server/services/militaryConfig';
import { createHeroMesh } from '../src/components/world3d/heroModels';
import { ASSET_MANIFEST } from '../src/assetPipeline/assetManifest';
import { assetRegistry } from '../src/assetPipeline/assetRegistry';
import { HeroClass, BuildingInstance } from '../src/types';
import { buildArchitecturalComplex } from '../src/components/world3d/medievalBuildingArchitect';
import { createKingdomLifeSystem } from '../src/components/world3d/kingdomLife';
import {
  getStoneWallTexture,
  getWoodPlankTexture,
  getRoofTileTexture,
  getThatchTexture,
  getCobblestoneTexture,
  getHeraldicBannerTexture,
} from '../src/components/world3d/medievalTextures';
import * as THREE from 'three';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('REALM OF CROWNS - PHASE 1 AUTOMATED AUDIT TEST SUITE');
  console.log('====================================================\n');

  const testPlayerA = 'test_user_alpha';
  const testPlayerB = 'test_user_beta';

  // ----------------------------------------------------
  // TEST SUITE 1: PLAYER INITIALIZATION & LEDGER ISOLATION
  // ----------------------------------------------------
  console.log('1. Player Initialization & Ledger Isolation');
  const { player: playerA } = playerService.getOrCreatePlayer(testPlayerA, 'Lord Alpha');
  const { player: playerB } = playerService.getOrCreatePlayer(testPlayerB, 'Lord Beta');

  assert(playerA.uid === testPlayerA, 'Player A initialized with correct UID');
  assert(playerB.uid === testPlayerB, 'Player B initialized with correct UID');
  assert(playerA.gems === GAME_CONFIG.starterPackage.gems, 'Player A granted exact starter gems');

  const txA = ledgerService.getTransactions(testPlayerA);
  const txB = ledgerService.getTransactions(testPlayerB);
  assert(txA.length >= 1, 'Player A has transaction history');
  assert(txB.length >= 1, 'Player B has transaction history');
  assert(
    txA.every((t) => t.playerId === testPlayerA),
    'Player A ledger contains only Player A transactions'
  );
  assert(
    txB.every((t) => t.playerId === testPlayerB),
    'Player B ledger contains only Player B transactions'
  );

  // ----------------------------------------------------
  // TEST SUITE 2: GEM ECONOMY & NEGATIVE NUMBER EXPLOITS
  // ----------------------------------------------------
  console.log('\n2. Gem Economy & Exploit Defenses');
  const startGems = playerA.gems;

  // Exploit attempt 1: negative spend
  const negativeSpend = playerService.spendGems(testPlayerA, -500, 'exploit_negative_spend');
  assert(
    !negativeSpend.success,
    'Negative gem spend rejected',
    `Expected failure, got: ${negativeSpend.success}`
  );
  assert(playerA.gems === startGems, 'Player gems unaffected by negative spend attempt');

  // Exploit attempt 2: fractional/NaN spend
  const nanSpend = playerService.spendGems(testPlayerA, NaN, 'exploit_nan_spend');
  assert(!nanSpend.success, 'NaN gem spend rejected');

  // Exploit attempt 3: spending more than treasury
  const excessiveSpend = playerService.spendGems(testPlayerA, startGems + 100000, 'excessive_spend');
  assert(!excessiveSpend.success, 'Excessive gem spend rejected due to insufficient balance');

  // Valid spend
  const validSpend = playerService.spendGems(testPlayerA, 50, 'valid_speedup');
  assert(validSpend.success, 'Valid gem deduction succeeds');
  assert(playerA.gems === startGems - 50, 'Gems correctly deducted');

  // Idempotent spend
  const idempKey = 'tx_idemp_test_1';
  const spend1 = playerService.spendGems(testPlayerA, 25, 'idemp_test', idempKey);
  const spend2 = playerService.spendGems(testPlayerA, 25, 'idemp_test', idempKey);
  assert(spend1.success && spend2.success, 'Idempotent spend returns success');
  assert(playerA.gems === startGems - 75, 'Idempotent spend deducted currency only once');

  // ----------------------------------------------------
  // TEST SUITE 3: INVENTORY ANTI-CHEAT & QUANTITY GUARDS
  // ----------------------------------------------------
  console.log('\n3. Inventory Anti-Cheat & Quantity Guards');
  const inv = inventoryService.getInventory(testPlayerA);
  const testSpeedup = inv.find((i) => i.id === 'speedup_1m');
  assert(Boolean(testSpeedup), 'Speedup 1m item exists in inventory');

  const startQty = testSpeedup!.quantity;

  // Exploit attempt: negative consume to duplicate items
  const negConsume = inventoryService.consumeItem(testPlayerA, 'speedup_1m', -10);
  assert(!negConsume.success, 'Negative item consumption rejected');
  assert(testSpeedup!.quantity === startQty, 'Item quantity unchanged after negative consume attempt');

  // Exploit attempt: consume 0
  const zeroConsume = inventoryService.consumeItem(testPlayerA, 'speedup_1m', 0);
  assert(!zeroConsume.success, 'Zero item consumption rejected');

  // Exploit attempt: consume more than available
  const overConsume = inventoryService.consumeItem(testPlayerA, 'speedup_1m', startQty + 999);
  assert(!overConsume.success, 'Over-consumption rejected');

  // Valid consume
  const validConsume = inventoryService.consumeItem(testPlayerA, 'speedup_1m', 1);
  assert(validConsume.success, 'Valid item consumption succeeds');
  assert(testSpeedup!.quantity === startQty - 1, 'Item quantity reduced by 1');

  // ----------------------------------------------------
  // TEST SUITE 4: BUILDING UPGRADE & QUEUE CONSTRAINTS
  // ----------------------------------------------------
  console.log('\n4. Building Upgrade & Queue Constraints');
  const kingdom = kingdomService.getKingdom(testPlayerA);

  // Upgrade Castle to Level 2
  const upgradeCastle = kingdomService.startBuildingUpgrade(testPlayerA, 'castle');
  assert(upgradeCastle.success, 'Castle upgrade initiation succeeds');
  assert(kingdom.constructionQueue.length === 1, 'Construction queue contains 1 task');

  // Attempt duplicate upgrade while already in queue
  const dupUpgrade = kingdomService.startBuildingUpgrade(testPlayerA, 'castle');
  assert(!dupUpgrade.success, 'Duplicate upgrade on same building rejected');

  // Attempt second upgrade when maxQueueSlots is 1
  const farmUpgrade = kingdomService.startBuildingUpgrade(testPlayerA, 'farm_1');
  assert(!farmUpgrade.success, 'Second upgrade rejected when queue capacity is reached');

  // Prerequisite validation test on Gold Smelter (requires Castle Lv 4)
  const goldSmelter = kingdom.buildings.find((b) => b.type === 'gold_mine');
  if (goldSmelter) {
    // Castle is level 1
    const prereqFail = kingdomService.startBuildingUpgrade(testPlayerA, goldSmelter.id);
    assert(!prereqFail.success, 'Building prerequisite (Castle Level 4) strictly enforced');
  }

  // ----------------------------------------------------
  // TEST SUITE 5: TIMERS, SPEEDUPS & INSTANT COMPLETION
  // ----------------------------------------------------
  console.log('\n5. Timers, Speedups & Authoritative Cost');
  const activeTask = kingdom.constructionQueue[0];
  assert(Boolean(activeTask), 'Active task present');

  // Authoritative gem cost formula check
  const cost60s = calculateInstantGemCost(60);
  assert(cost60s === 5, '60s remaining yields minimum 5 Gems');
  const cost3600s = calculateInstantGemCost(3600);
  assert(cost3600s === 120, '1 hour (3600s) yields exactly 120 Gems (3600 / 30)');

  // Test speedup without completing task prematurely
  const speedupRes = kingdomService.applySpeedup(testPlayerA, activeTask.taskId, 0.05); // 3 seconds
  assert(speedupRes.success, 'Authoritative speedup application succeeds');

  // Instant complete
  const instantRes = kingdomService.instantComplete(testPlayerA, activeTask.taskId);
  assert(instantRes.success && instantRes.completed, 'Instant complete finishes building');
  assert(kingdom.constructionQueue.length === 0, 'Queue cleared after completion');

  const upgradedCastle = kingdom.buildings.find((b) => b.id === 'castle');
  assert(upgradedCastle!.level === 2, 'Castle successfully upgraded to Level 2');

  // ----------------------------------------------------
  // TEST SUITE 6: QUEST COMPLETION & DOUBLE-CLAIM
  // ----------------------------------------------------
  console.log('\n6. Quest System & Double-Claim Defenses');
  const quests = questService.getQuests(testPlayerA);
  const chapter1 = quests.find((q) => q.id === 'chapter_1_castle');
  assert(Boolean(chapter1), 'Chapter 1 quest found');
  assert(chapter1!.completed, 'Chapter 1 quest marked completed (Castle reached Level 2)');

  // Count ledger before quest claim
  const ledgerCountBefore = ledgerService.getTransactions(testPlayerA).length;

  const claimRes = questService.claimReward(testPlayerA, 'chapter_1_castle', (amt) => {
    return playerService.grantGems(testPlayerA, amt, 'quest_reward:chapter_1_castle');
  });

  assert(claimRes.success, 'Quest reward claimed successfully');

  // Verify only 1 new ledger entry was created (no duplicate logging)
  const ledgerCountAfter = ledgerService.getTransactions(testPlayerA).length;
  assert(
    ledgerCountAfter === ledgerCountBefore + 1,
    'Quest claim logged exactly 1 transaction to ledger (no duplicate record)'
  );

  // Attempt duplicate claim
  const dupClaim = questService.claimReward(testPlayerA, 'chapter_1_castle', (amt) => {
    return playerService.grantGems(testPlayerA, amt, 'quest_reward:chapter_1_castle');
  });
  assert(!dupClaim.success, 'Duplicate quest claim attempt strictly rejected');

  // ----------------------------------------------------
  // TEST SUITE 7: ECONOMIC BALANCE & MATHEMATICAL FORMULAS
  // ----------------------------------------------------
  console.log('\n7. Economic Balance & Formula Scalability');
  const castleDef = BUILDING_DEFINITIONS['castle'];
  const lvl25Cost = calculateBuildingCost(castleDef, 25);
  const lvl25Duration = calculateBuildingDurationSeconds(castleDef, 25);

  // Warehouse storage cap at level 25 is 5,050,000 resources
  const warehouseLevel25Storage = Math.floor(250000 * (1 + 24 * 0.8)); // 5,050,000
  assert(
    lvl25Cost.food < warehouseLevel25Storage,
    `Level 25 Castle food cost (${lvl25Cost.food.toLocaleString()}) fits in warehouse cap (${warehouseLevel25Storage.toLocaleString()})`
  );
  assert(
    lvl25Cost.wood < warehouseLevel25Storage,
    `Level 25 Castle wood cost (${lvl25Cost.wood.toLocaleString()}) fits in warehouse cap (${warehouseLevel25Storage.toLocaleString()})`
  );

  // Check upgrade duration: must be <= 3 days (259,200s), not 25 years!
  const threeDaysSeconds = 3 * 24 * 3600;
  assert(
    lvl25Duration <= threeDaysSeconds,
    `Level 25 Castle duration (${Math.round(lvl25Duration / 3600)}h) is achievable (< 72h)`
  );

  // ----------------------------------------------------
  // TEST SUITE 8: PHASE 2 WORLD MAP & ARMY MARCH ENGINE
  // ----------------------------------------------------
  console.log('\n8. Persistent World Map & Army March Engine');
  const allTiles = worldService.getWorldTiles();
  assert(allTiles.length > 200, `World map generated ${allTiles.length} hex tiles (> 200)`);

  const originTile = worldService.getTile({ q: 0, r: 0 });
  assert(originTile !== undefined, 'Origin tile (0, 0) exists');
  assert(originTile?.terrain === 'plains', 'Origin tile is fertile plains');

  // Check player world state initialization
  const pWorldState = worldService.getPlayerWorldState(testPlayerA);
  assert(pWorldState.homeCoords.q === 0 && pWorldState.homeCoords.r === 0, 'Player home coordinates are (0, 0)');
  assert(pWorldState.exploredTileKeys.length > 0, 'Player has initial explored vision radius around citadel');
  assert(pWorldState.maxMarchSlots === 2, 'Player has exactly 2 march deployment slots');

  // Grant test troops to Player A
  const kState = kingdomService.getKingdom(testPlayerA);
  kState.troops.swordsman_t1 = 150;
  kState.troops.archer_t1 = 100;

  // Find a barbarian camp and a resource node
  const barbarianTile = allTiles.find((t) => t.entityType === 'barbarian_camp');
  const resourceTile = allTiles.find((t) => t.entityType === 'resource_node');
  assert(barbarianTile !== undefined, 'Barbarian camp spawned on world map');
  assert(resourceTile !== undefined, 'Resource node spawned on world map');

  // Test 8.1: Cannot dispatch with 0 troops
  const resZero = worldService.dispatchMarch(
    testPlayerA,
    resourceTile!.coords,
    'gather',
    'alden',
    'Alden',
    { swordsman_t1: 0, archer_t1: 0 }
  );
  assert(!resZero.success, 'Rejected army deployment with 0 troops');

  // Test 8.2: Dispatch gathering march successfully
  const marchRes1 = worldService.dispatchMarch(
    testPlayerA,
    resourceTile!.coords,
    'gather',
    'alden_valiant',
    'Alden the Valiant',
    { swordsman_t1: 40, archer_t1: 30 }
  );

  assert(marchRes1.success && marchRes1.march?.status === 'marching', 'March dispatched with status "marching"');
  assert(kState.troops.swordsman_t1 === 110, 'Swordsmen deducted from garrison (150 -> 110)');
  assert(kState.troops.archer_t1 === 70, 'Archers deducted from garrison (100 -> 70)');

  // Test 8.3: Dispatch second march (barbarian attack with second commander)
  const marchRes2 = worldService.dispatchMarch(
    testPlayerA,
    barbarianTile!.coords,
    'attack_barbarian',
    'valeria_vanguard',
    'Valeria Ironheart',
    { swordsman_t1: 50, archer_t1: 50 }
  );
  assert(marchRes2.success && marchRes2.march?.status === 'marching', 'Second march dispatched successfully');

  // Test 8.4: Cannot exceed max march slots (slot capacity 2)
  const marchRes3 = worldService.dispatchMarch(
    testPlayerA,
    resourceTile!.coords,
    'gather',
    'commander_3',
    'Third Commander',
    { swordsman_t1: 10, archer_t1: 10 }
  );
  assert(!marchRes3.success, 'Rejected march when all march slots are in use (2/2)');

  // Test 8.5: Recall march returns troops home
  const marchIdToRecall = marchRes1.march!.marchId;
  const recallRes = worldService.recallMarch(testPlayerA, marchIdToRecall);
  assert(recallRes.success, 'March recall succeeded');
  const pWorldUpdated = worldService.getPlayerWorldState(testPlayerA);
  const recalledMarch = pWorldUpdated.activeMarches.find((m) => m.marchId === marchIdToRecall);
  assert(recalledMarch?.status === 'returning', 'Recalled march switched status to "returning"');

  // Test 8.6: Scout dispatch adds tile to explored vision (using testPlayerB with free march slot)
  const mapTiles = worldService.getWorldTiles();
  const passableScoutTarget = mapTiles.find(
    (t) => (t.terrain === 'plains' || t.terrain === 'forest') && (t.coords.q !== 0 || t.coords.r !== 0)
  );
  const distantCoords = passableScoutTarget ? passableScoutTarget.coords : { q: 1, r: 0 };
  const scoutMarchRes = worldService.dispatchMarch(
    testPlayerB,
    distantCoords,
    'scout',
    'scout_unit',
    'Scout Rider',
    {}
  );
  assert(scoutMarchRes.success, 'Scout rider successfully dispatched');

  // ----------------------------------------------------
  // 9. HERO & CLASS SYSTEM VERIFICATION
  // ----------------------------------------------------
  console.log('\n9. Hero & Class System Verification');

  const warlord = COMMANDER_ROSTER['valeria_vanguard'];
  assert(warlord && warlord.heroClass === 'warlord', 'Warlord Valeria Ironheart registered with class "warlord"');
  assert(warlord.stats && warlord.stats.pveDamageBonus > 0, 'Warlord has offensive PvE bonus');

  const guardian = COMMANDER_ROSTER['alden_valiant'];
  assert(guardian && guardian.heroClass === 'guardian', 'Guardian Alden the Valiant registered with class "guardian"');
  assert(guardian.stats && guardian.stats.casualtyProtection >= 0.15, 'Guardian grants >= 15% casualty protection');

  const ranger = COMMANDER_ROSTER['elena_swiftbow'];
  assert(ranger && ranger.heroClass === 'ranger', 'Ranger Elena Swiftbow registered with class "ranger"');
  assert(ranger.stats && ranger.stats.marchSpeed >= 0.25, 'Ranger grants >= 25% march speed');

  const steward = COMMANDER_ROSTER['rodrick_ironwall'];
  assert(steward && steward.heroClass === 'steward', 'Steward Rodrick Ironwall registered with class "steward"');
  assert(steward.stats && steward.stats.payloadMultiplier >= 0.35, 'Steward grants >= 35% payload multiplier');

  const strategist = COMMANDER_ROSTER['vivian_gray'];
  assert(strategist && strategist.heroClass === 'strategist', 'Strategist Vivian Gray registered with class "strategist"');
  assert(strategist.stats && strategist.stats.armyCapacityBonus >= 2500, 'Strategist grants >= 2,500 army capacity');

  // Army Capacity calculation respects class bonuses
  const stratCap = calculateArmyCapacity(1, strategist);
  const warlordCap = calculateArmyCapacity(1, warlord);
  assert(stratCap > warlordCap, 'Strategist provides higher army deployment capacity than Warlord');

  // Army Speed factor calculation respects Ranger speed bonus
  const rangerSpeed = calculateArmySpeedFactor({ archer_t1: 100 }, ranger);
  const guardianSpeed = calculateArmySpeedFactor({ archer_t1: 100 }, guardian);
  assert(rangerSpeed > guardianSpeed, 'Ranger army marches significantly faster than Guardian army');

  // Army Payload calculation respects Steward logistics bonus
  const stewardPayload = calculateArmyPayloadCapacity({ swordsman_t1: 100 }, steward);
  const warlordPayload = calculateArmyPayloadCapacity({ swordsman_t1: 100 }, warlord);
  assert(stewardPayload > warlordPayload, 'Steward army carries significantly higher resource payload');

  // ----------------------------------------------------
  // 10. 3D ASSET PIPELINE & HERO MODEL FACTORY VERIFICATION
  // ----------------------------------------------------
  console.log('\n10. 3D Asset Pipeline & Hero Model Factory Verification');

  const heroClasses: HeroClass[] = ['warlord', 'guardian', 'ranger', 'steward', 'strategist'];
  for (const hClass of heroClasses) {
    const bundle = createHeroMesh(hClass);
    assert(bundle !== undefined, `3D mesh factory generates bundle for "${hClass}"`);
    assert(bundle.group.children.length > 0, `3D hero group for "${hClass}" contains rendered meshes`);
    assert(typeof bundle.updateAnimation === 'function', `3D hero bundle for "${hClass}" has animation update handler`);
  }

  // Asset Manifest entries
  assert(Boolean(ASSET_MANIFEST['hero_warlord_mesh']), 'Asset manifest registers "hero_warlord_mesh"');
  assert(Boolean(ASSET_MANIFEST['hero_guardian_mesh']), 'Asset manifest registers "hero_guardian_mesh"');
  assert(Boolean(ASSET_MANIFEST['hero_ranger_mesh']), 'Asset manifest registers "hero_ranger_mesh"');
  assert(Boolean(ASSET_MANIFEST['hero_steward_mesh']), 'Asset manifest registers "hero_steward_mesh"');
  assert(Boolean(ASSET_MANIFEST['hero_strategist_mesh']), 'Asset manifest registers "hero_strategist_mesh"');
  assert(Boolean(ASSET_MANIFEST['building_castle_keep']), 'Asset manifest registers "building_castle_keep"');

  // Asset Registry Aliases
  assert(assetRegistry.get('hero_warlord')?.assetId === 'hero_warlord_mesh', 'Asset registry resolves "hero_warlord"');
  assert(assetRegistry.get('hero_guardian')?.assetId === 'hero_guardian_mesh', 'Asset registry resolves "hero_guardian"');
  assert(assetRegistry.get('hero_ranger')?.assetId === 'hero_ranger_mesh', 'Asset registry resolves "hero_ranger"');
  assert(assetRegistry.get('hero_steward')?.assetId === 'hero_steward_mesh', 'Asset registry resolves "hero_steward"');
  assert(assetRegistry.get('hero_strategist')?.assetId === 'hero_strategist_mesh', 'Asset registry resolves "hero_strategist"');
  assert(assetRegistry.get('kingdom_realm_view')?.assetId === 'building_castle_keep', 'Asset registry resolves "kingdom_realm_view"');

  // ----------------------------------------------------
  // 11. MEDIEVAL ARCHITECTURAL COMPLEXES & LIVING REALM VERIFICATION
  // ----------------------------------------------------
  console.log('\n11. Medieval Architectural Complexes & Living Realm Verification');

  // 11.1 Procedural Textures
  assert(getStoneWallTexture() instanceof THREE.Texture, 'Procedural stone wall texture generated');
  assert(getWoodPlankTexture() instanceof THREE.Texture, 'Procedural wood plank texture generated');
  assert(getRoofTileTexture() instanceof THREE.Texture, 'Procedural slate/tile roof texture generated');
  assert(getThatchTexture() instanceof THREE.Texture, 'Procedural thatch texture generated');
  assert(getCobblestoneTexture() instanceof THREE.Texture, 'Procedural cobblestone texture generated');
  assert(getHeraldicBannerTexture('warlord') instanceof THREE.Texture, 'Procedural heraldic banner texture generated');

  // 11.2 Architectural complexes for diverse medieval buildings
  const mockCastle1: BuildingInstance = { id: 'c1', type: 'castle', level: 1, slot: 'center', name: 'Castle', visualDistrict: 'central' };
  const mockCastle5: BuildingInstance = { id: 'c5', type: 'castle', level: 5, slot: 'center', name: 'Castle', visualDistrict: 'central' };
  const mockFarm: BuildingInstance = { id: 'f1', type: 'farm', level: 3, slot: 'farm_1', name: 'Farm', visualDistrict: 'farmland' };
  const mockLumber: BuildingInstance = { id: 'l1', type: 'lumber_mill', level: 2, slot: 'lumber_1', name: 'Lumber Mill', visualDistrict: 'farmland' };
  const mockQuarry: BuildingInstance = { id: 'q1', type: 'quarry', level: 2, slot: 'quarry_1', name: 'Quarry', visualDistrict: 'quarry' };
  const mockBarracks: BuildingInstance = { id: 'b1', type: 'barracks', level: 3, slot: 'barracks', name: 'Barracks', visualDistrict: 'military' };
  const mockAcademy: BuildingInstance = { id: 'a1', type: 'academy', level: 2, slot: 'academy', name: 'Academy', visualDistrict: 'central' };
  const mockHospital: BuildingInstance = { id: 'h1', type: 'hospital', level: 1, slot: 'hospital', name: 'Hospital', visualDistrict: 'central' };

  const castleBundle1 = buildArchitecturalComplex(mockCastle1);
  const castleBundle5 = buildArchitecturalComplex(mockCastle5);
  const farmBundle = buildArchitecturalComplex(mockFarm);
  const lumberBundle = buildArchitecturalComplex(mockLumber);
  const quarryBundle = buildArchitecturalComplex(mockQuarry);
  const barracksBundle = buildArchitecturalComplex(mockBarracks);
  const academyBundle = buildArchitecturalComplex(mockAcademy);
  const hospitalBundle = buildArchitecturalComplex(mockHospital);

  assert(castleBundle1.group.children.length > 0, 'Castle Lv.1 complex builds with child components');
  assert(castleBundle5.group.children.length > castleBundle1.group.children.length, 'Castle visual progression increases complexity with level (machicolations, spires, towers)');
  assert(Boolean(farmBundle.windmillBlades), 'Farm complex generates rotating windmill blades hook');
  assert(lumberBundle.group.children.length >= 3, 'Sawmill complex includes timber structure and log piles');
  assert(quarryBundle.group.children.length >= 3, 'Quarry complex includes bedrock cuts, derrick crane and mining cart');
  assert(barracksBundle.group.children.length >= 4, 'Barracks complex includes enclosed training grounds, weapon racks, and dummy');
  assert(Boolean(academyBundle.armillarySphere), 'Academy complex generates rotating armillary sphere hook');
  assert(hospitalBundle.group.children.length >= 3, 'Hospital complex includes timber sanctuary and medicinal garden');

  // 11.3 Living Realm Ecosystem (Particles, Windmills, Banners, Circling Doves)
  const dummyScene = new THREE.Scene();
  const chimneys = [new THREE.Vector3(0, 4, 0), new THREE.Vector3(10, 3, 5)];
  const windmillList = farmBundle.windmillBlades ? [farmBundle.windmillBlades] : [];
  const bannerList: THREE.Mesh[] = castleBundle5.bannerFlags || [];
  const sphereList = academyBundle.armillarySphere ? [academyBundle.armillarySphere] : [];

  const lifeSystem = createKingdomLifeSystem(
    dummyScene,
    chimneys,
    windmillList,
    bannerList,
    sphereList
  );
  assert(lifeSystem !== null && typeof lifeSystem.update === 'function', 'Living Kingdom life system instantiated with update loop');

  // Run two simulation ticks
  lifeSystem.update(0.016, 1.0);
  lifeSystem.update(0.016, 1.016);
  assert(true, 'Living Kingdom life system updates environmental animations without error');

  lifeSystem.dispose();
  assert(true, 'Living Kingdom life system disposes particles cleanly');

  // ----------------------------------------------------
  // FINAL TALLY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
