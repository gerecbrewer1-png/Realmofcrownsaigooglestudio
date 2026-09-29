/**
 * Realm of Crowns - Authoritative Game Configuration
 * Fully data-driven balance parameters for buildings, quests, starter packages, and economy.
 */

import { BuildingDefinition, GameConfiguration, InventoryItem, Commander, QuestDefinition, Resources, ProductionRates } from '../../types';
import { COMMANDER_ROSTER } from './militaryConfig';

export const STARTER_COMMANDER: Commander = COMMANDER_ROSTER['alden_valiant'];

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'speedup_1m',
    name: '1-Minute Speed-Up',
    description: 'Reduces active construction or research duration by 1 minute.',
    type: 'speedup',
    rarity: 'common',
    quantity: 10,
    iconName: 'Clock',
    effect: { speedupMinutes: 1 },
  },
  {
    id: 'speedup_5m',
    name: '5-Minute Speed-Up',
    description: 'Reduces active construction or research duration by 5 minutes.',
    type: 'speedup',
    rarity: 'uncommon',
    quantity: 6,
    iconName: 'Clock',
    effect: { speedupMinutes: 5 },
  },
  {
    id: 'speedup_15m',
    name: '15-Minute Speed-Up',
    description: 'Reduces active construction or research duration by 15 minutes.',
    type: 'speedup',
    rarity: 'rare',
    quantity: 4,
    iconName: 'Clock',
    effect: { speedupMinutes: 15 },
  },
  {
    id: 'pack_food_10k',
    name: '10,000 Food Supply',
    description: 'Opens to grant 10,000 Food directly to your kingdom granaries.',
    type: 'resource_pack',
    rarity: 'uncommon',
    quantity: 5,
    iconName: 'Wheat',
    effect: { resources: { food: 10000 } },
  },
  {
    id: 'pack_wood_10k',
    name: '10,000 Timber Bundle',
    description: 'Opens to grant 10,000 Wood directly to your kingdom stockyards.',
    type: 'resource_pack',
    rarity: 'uncommon',
    quantity: 5,
    iconName: 'Trees',
    effect: { resources: { wood: 10000 } },
  },
  {
    id: 'pack_stone_5k',
    name: '5,000 Stone Blocks',
    description: 'Opens to grant 5,000 Stone for fortress masonry.',
    type: 'resource_pack',
    rarity: 'rare',
    quantity: 3,
    iconName: 'Boxes',
    effect: { resources: { stone: 5000 } },
  },
  {
    id: 'peace_shield_8h',
    name: '8-Hour Peace Shield',
    description: 'Enshrouds your kingdom in celestial protection, preventing enemy scouts and assaults.',
    type: 'shield',
    rarity: 'rare',
    quantity: 2,
    iconName: 'Shield',
    effect: { shieldHours: 8 },
  }
];

export const BUILDING_DEFINITIONS: Record<string, BuildingDefinition> = {
  castle: {
    type: 'castle',
    name: 'Main Castle',
    category: 'civil',
    description: 'The sovereign heart of your domain. Castle level dictates all maximum building levels, queue caps, and unlocks.',
    maxLevel: 25,
    baseCost: { food: 500, wood: 500, stone: 300, iron: 150, gold: 100 },
    costMultiplier: 1.35,
    baseDurationSeconds: 15,
    durationMultiplier: 1.38,
    prerequisites: [],
    visualDistrict: 'central',
  },
  farm: {
    type: 'farm',
    name: 'Royal Farmstead',
    category: 'economic',
    description: 'Cultivates crops and livestock to feed workers and nourish marching armies.',
    maxLevel: 25,
    baseCost: { food: 100, wood: 150, stone: 50, iron: 0, gold: 0 },
    costMultiplier: 1.28,
    baseDurationSeconds: 8,
    durationMultiplier: 1.32,
    baseProduction: { foodPerHour: 1200 },
    productionMultiplier: 1.45,
    prerequisites: [{ buildingType: 'castle', level: 1 }],
    visualDistrict: 'farmland',
  },
  lumber_mill: {
    type: 'lumber_mill',
    name: 'Lumber Mill',
    category: 'economic',
    description: 'Harvests sturdy oak and pine timber for construction, palisades, and siege crafts.',
    maxLevel: 25,
    baseCost: { food: 150, wood: 100, stone: 50, iron: 0, gold: 0 },
    costMultiplier: 1.28,
    baseDurationSeconds: 8,
    durationMultiplier: 1.32,
    baseProduction: { woodPerHour: 1200 },
    productionMultiplier: 1.45,
    prerequisites: [{ buildingType: 'castle', level: 1 }],
    visualDistrict: 'farmland',
  },
  quarry: {
    type: 'quarry',
    name: 'Stone Quarry',
    category: 'economic',
    description: 'Excavates granite and limestone for thick battlements, towers, and foundation stones.',
    maxLevel: 25,
    baseCost: { food: 200, wood: 200, stone: 100, iron: 50, gold: 0 },
    costMultiplier: 1.3,
    baseDurationSeconds: 12,
    durationMultiplier: 1.34,
    baseProduction: { stonePerHour: 900 },
    productionMultiplier: 1.45,
    prerequisites: [{ buildingType: 'castle', level: 2 }],
    visualDistrict: 'quarry',
  },
  iron_mine: {
    type: 'iron_mine',
    name: 'Iron Mine',
    category: 'economic',
    description: 'Extracts deep vein iron ore for forging weapons, plate armor, and siege fittings.',
    maxLevel: 25,
    baseCost: { food: 300, wood: 300, stone: 250, iron: 100, gold: 50 },
    costMultiplier: 1.32,
    baseDurationSeconds: 18,
    durationMultiplier: 1.35,
    baseProduction: { ironPerHour: 600 },
    productionMultiplier: 1.45,
    prerequisites: [{ buildingType: 'castle', level: 3 }],
    visualDistrict: 'quarry',
  },
  gold_mine: {
    type: 'gold_mine',
    name: 'Gold Smelter',
    category: 'economic',
    description: 'Refines auric veins into gleaming bullion for research, diplomacy, and mercenary contracts.',
    maxLevel: 25,
    baseCost: { food: 400, wood: 400, stone: 350, iron: 250, gold: 100 },
    costMultiplier: 1.33,
    baseDurationSeconds: 24,
    durationMultiplier: 1.36,
    baseProduction: { goldPerHour: 350 },
    productionMultiplier: 1.45,
    prerequisites: [{ buildingType: 'castle', level: 4 }],
    visualDistrict: 'quarry',
  },
  warehouse: {
    type: 'warehouse',
    name: 'Grand Warehouse',
    category: 'civil',
    description: 'Safeguards stored goods from enemy plunder and expands kingdom maximum storage limits.',
    maxLevel: 25,
    baseCost: { food: 250, wood: 250, stone: 150, iron: 50, gold: 25 },
    costMultiplier: 1.3,
    baseDurationSeconds: 15,
    durationMultiplier: 1.33,
    prerequisites: [{ buildingType: 'castle', level: 1 }],
    visualDistrict: 'central',
  },
  barracks: {
    type: 'barracks',
    name: 'Infantry Barracks',
    category: 'military',
    description: 'Drills swordsmen, shield-bearers, and vanguard infantry. Higher levels unlock higher troop tiers.',
    maxLevel: 25,
    baseCost: { food: 200, wood: 250, stone: 100, iron: 50, gold: 0 },
    costMultiplier: 1.31,
    baseDurationSeconds: 15,
    durationMultiplier: 1.34,
    prerequisites: [{ buildingType: 'castle', level: 1 }],
    visualDistrict: 'military',
  },
  archery_range: {
    type: 'archery_range',
    name: 'Archery Range',
    category: 'military',
    description: 'Trains bowmen, crossbowmen, and elite skirmishers.',
    maxLevel: 25,
    baseCost: { food: 250, wood: 300, stone: 100, iron: 50, gold: 0 },
    costMultiplier: 1.31,
    baseDurationSeconds: 18,
    durationMultiplier: 1.34,
    prerequisites: [{ buildingType: 'castle', level: 2 }],
    visualDistrict: 'military',
  },
  stable: {
    type: 'stable',
    name: 'Warhorse Stables',
    category: 'military',
    description: 'Breeds spirited war steeds and trains knights, lancers, and fast cavalry.',
    maxLevel: 25,
    baseCost: { food: 350, wood: 350, stone: 150, iron: 100, gold: 50 },
    costMultiplier: 1.33,
    baseDurationSeconds: 22,
    durationMultiplier: 1.35,
    prerequisites: [{ buildingType: 'castle', level: 3 }],
    visualDistrict: 'military',
  },
  academy: {
    type: 'academy',
    name: 'Royal Academy',
    category: 'science',
    description: 'Fosters scholars and alchemists to research economy bonuses, military tactics, and defense works.',
    maxLevel: 25,
    baseCost: { food: 300, wood: 300, stone: 200, iron: 100, gold: 150 },
    costMultiplier: 1.33,
    baseDurationSeconds: 25,
    durationMultiplier: 1.36,
    prerequisites: [{ buildingType: 'castle', level: 2 }],
    visualDistrict: 'central',
  },
  hospital: {
    type: 'hospital',
    name: 'Apothecary Hospital',
    category: 'civil',
    description: 'Heals wounded troops after defensive sieges and field battles, saving them from permanent death.',
    maxLevel: 25,
    baseCost: { food: 200, wood: 200, stone: 100, iron: 50, gold: 25 },
    costMultiplier: 1.3,
    baseDurationSeconds: 15,
    durationMultiplier: 1.33,
    prerequisites: [{ buildingType: 'castle', level: 2 }],
    visualDistrict: 'central',
  },
  wall: {
    type: 'wall',
    name: 'Fortified Ramparts',
    category: 'defense',
    description: 'Perimeter stone walls lined with arrow slits and defensive moats to repel invader assaults.',
    maxLevel: 25,
    baseCost: { food: 200, wood: 400, stone: 500, iron: 150, gold: 50 },
    costMultiplier: 1.34,
    baseDurationSeconds: 20,
    durationMultiplier: 1.36,
    prerequisites: [{ buildingType: 'castle', level: 1 }],
    visualDistrict: 'walls',
  },
  watchtower: {
    type: 'watchtower',
    name: 'High Watchtower',
    category: 'defense',
    description: 'Spies across the realm to give early warning of incoming marches and provides scout reports.',
    maxLevel: 25,
    baseCost: { food: 150, wood: 300, stone: 200, iron: 50, gold: 20 },
    costMultiplier: 1.31,
    baseDurationSeconds: 15,
    durationMultiplier: 1.33,
    prerequisites: [{ buildingType: 'castle', level: 2 }],
    visualDistrict: 'walls',
  }
};

export const INITIAL_QUESTS: QuestDefinition[] = [
  {
    id: 'chapter_1_castle',
    title: 'Chapter I: Sovereign Foundation',
    description: 'Upgrade your Main Castle to Level 2 to establish your royal lineage.',
    category: 'chapter',
    targetType: 'building_level',
    targetKey: 'castle',
    targetValue: 2,
    rewardGems: 150,
    rewardResources: { food: 2500, wood: 2500, stone: 1500 },
    rewardExp: 250,
    order: 1,
  },
  {
    id: 'chapter_1_farm',
    title: 'Nourish the Realm',
    description: 'Upgrade your Royal Farmstead to Level 2 to sustain growing populations.',
    category: 'economic',
    targetType: 'building_level',
    targetKey: 'farm',
    targetValue: 2,
    rewardGems: 75,
    rewardResources: { food: 3000, wood: 1500 },
    rewardExp: 150,
    order: 2,
  },
  {
    id: 'chapter_1_lumber',
    title: 'Fell the Timber',
    description: 'Upgrade your Lumber Mill to Level 2 to supply structural lumber.',
    category: 'economic',
    targetType: 'building_level',
    targetKey: 'lumber_mill',
    targetValue: 2,
    rewardGems: 75,
    rewardResources: { wood: 3000, stone: 1000 },
    rewardExp: 150,
    order: 3,
  },
  {
    id: 'chapter_2_barracks',
    title: 'Muster the Guard',
    description: 'Upgrade your Infantry Barracks to Level 2 to prepare defensive garrisons.',
    category: 'military',
    targetType: 'building_level',
    targetKey: 'barracks',
    targetValue: 2,
    rewardGems: 100,
    rewardResources: { food: 2000, iron: 1000 },
    rewardExp: 200,
    order: 4,
  },
  {
    id: 'chapter_2_castle',
    title: 'Chapter II: Stone & Bastion',
    description: 'Upgrade your Main Castle to Level 3 to unlock the Stone Quarry and Academy.',
    category: 'chapter',
    targetType: 'building_level',
    targetKey: 'castle',
    targetValue: 3,
    rewardGems: 250,
    rewardResources: { food: 5000, wood: 5000, stone: 3000, iron: 1500 },
    rewardExp: 500,
    order: 5,
  },
  {
    id: 'chapter_2_quarry',
    title: 'Hew the Stone',
    description: 'Construct and upgrade the Stone Quarry to Level 1.',
    category: 'economic',
    targetType: 'building_level',
    targetKey: 'quarry',
    targetValue: 1,
    rewardGems: 100,
    rewardResources: { stone: 4000, gold: 500 },
    rewardExp: 200,
    order: 6,
  },
  {
    id: 'chapter_3_castle',
    title: 'Chapter III: Crown Ascendant',
    description: 'Upgrade your Main Castle to Level 4 to unlock the Warhorse Stables and Iron Mine.',
    category: 'chapter',
    targetType: 'building_level',
    targetKey: 'castle',
    targetValue: 4,
    rewardGems: 400,
    rewardResources: { food: 10000, wood: 10000, stone: 6000, iron: 3000, gold: 1500 },
    rewardExp: 1000,
    order: 7,
  }
];

export const GAME_CONFIG: GameConfiguration = {
  version: '1.0.0-phase1',
  starterPackage: {
    gems: 1500,
    resources: {
      food: 50000,
      wood: 50000,
      stone: 35000,
      iron: 20000,
      gold: 10000,
    },
    items: [
      { itemId: 'speedup_1m', quantity: 15 },
      { itemId: 'speedup_5m', quantity: 8 },
      { itemId: 'speedup_15m', quantity: 4 },
      { itemId: 'pack_food_10k', quantity: 5 },
      { itemId: 'pack_wood_10k', quantity: 5 },
      { itemId: 'pack_stone_5k', quantity: 4 },
      { itemId: 'peace_shield_8h', quantity: 3 },
    ],
    shieldHours: 24, // 24-hour Peace Shield for newly founded kingdoms
    starterCommanderId: 'alden_valiant',
    starterTroops: {
      swordsman_t1: 150,
      archer_t1: 100,
    }
  },
  buildingDefs: BUILDING_DEFINITIONS,
  questDefs: INITIAL_QUESTS,
  storePacks: [
    { id: 'gems_tier_1', name: 'Pouch of Gems', priceUsd: 0.99, gems: 500, bonusGems: 0 },
    { id: 'gems_tier_2', name: 'Sack of Gems', priceUsd: 4.99, gems: 2500, bonusGems: 250, badge: 'Popular' },
    { id: 'gems_tier_3', name: 'Sovereign Chest', priceUsd: 9.99, gems: 5000, bonusGems: 1000, badge: 'Best Value' },
    { id: 'gems_tier_4', name: 'Royal Treasury', priceUsd: 19.99, gems: 11000, bonusGems: 2000 },
    { id: 'gems_tier_5', name: 'King’s Hoard', priceUsd: 49.99, gems: 30000, bonusGems: 5000 },
    { id: 'gems_tier_6', name: 'Emperor’s Cache', priceUsd: 99.99, gems: 65000, bonusGems: 15000 }
  ]
};

// Math calculation helpers
export function calculateBuildingCost(def: BuildingDefinition, targetLevel: number): Resources {
  const mult = Math.pow(def.costMultiplier, Math.max(0, targetLevel - 1));
  return {
    food: Math.floor((def.baseCost.food || 0) * mult),
    wood: Math.floor((def.baseCost.wood || 0) * mult),
    stone: Math.floor((def.baseCost.stone || 0) * mult),
    iron: Math.floor((def.baseCost.iron || 0) * mult),
    gold: Math.floor((def.baseCost.gold || 0) * mult),
  };
}

export function calculateBuildingDurationSeconds(def: BuildingDefinition, targetLevel: number): number {
  if (targetLevel === 1) return def.baseDurationSeconds;
  return Math.floor(def.baseDurationSeconds * Math.pow(def.durationMultiplier, targetLevel - 1));
}

export function calculateProductionRate(def: BuildingDefinition, level: number): Partial<ProductionRates> {
  if (!def.baseProduction || level <= 0) return {};
  const mult = 1 + (level - 1) * (def.productionMultiplier ? def.productionMultiplier - 1 : 0.45);
  const res: Partial<ProductionRates> = {};
  if (def.baseProduction.foodPerHour) res.foodPerHour = Math.floor(def.baseProduction.foodPerHour * mult);
  if (def.baseProduction.woodPerHour) res.woodPerHour = Math.floor(def.baseProduction.woodPerHour * mult);
  if (def.baseProduction.stonePerHour) res.stonePerHour = Math.floor(def.baseProduction.stonePerHour * mult);
  if (def.baseProduction.ironPerHour) res.ironPerHour = Math.floor(def.baseProduction.ironPerHour * mult);
  if (def.baseProduction.goldPerHour) res.goldPerHour = Math.floor(def.baseProduction.goldPerHour * mult);
  return res;
}

export function calculateInstantGemCost(remainingSeconds: number): number {
  if (remainingSeconds <= 0) return 0;
  return Math.max(5, Math.ceil(remainingSeconds / 30));
}

