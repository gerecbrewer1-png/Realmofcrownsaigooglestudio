/**
 * Realm of Crowns - Military & Troop Configuration
 * Defines all 4 military categories (Infantry, Ranged, Cavalry, Siege) across 3 tiers,
 * combat counter-triangle coefficients, training formulas, and commander archetypes.
 */

import { TroopDefinition, TroopCategory, Resources, Commander } from '../../types';

export const TROOP_DEFINITIONS: Record<string, TroopDefinition> = {
  // -------------------------------------------------------------------------
  // INFANTRY (Trained in Infantry Barracks)
  // Strong vs Cavalry, Vulnerable to Archers
  // -------------------------------------------------------------------------
  swordsman_t1: {
    unitId: 'swordsman_t1',
    name: 'Royal Swordsman',
    category: 'infantry',
    tier: 1,
    buildingType: 'barracks',
    requiredBuildingLevel: 1,
    attack: 22,
    defense: 24,
    health: 40,
    speed: 1.0,
    loadCapacity: 20,
    power: 10,
    trainingCost: { food: 50, wood: 40, stone: 0, iron: 10, gold: 0 },
    trainingSecondsPerUnit: 2,
    description: 'Disciplined foot soldiers bearing iron broadswords and stout kiteshields.',
  },
  swordsman_t2: {
    unitId: 'swordsman_t2',
    name: 'Vanguard Man-at-Arms',
    category: 'infantry',
    tier: 2,
    buildingType: 'barracks',
    requiredBuildingLevel: 4,
    attack: 38,
    defense: 42,
    health: 75,
    speed: 1.0,
    loadCapacity: 25,
    power: 24,
    trainingCost: { food: 120, wood: 90, stone: 30, iron: 40, gold: 10 },
    trainingSecondsPerUnit: 4,
    description: 'Veterans forged in bloody siege defenses, equipped with steel breastplates.',
  },
  swordsman_t3: {
    unitId: 'swordsman_t3',
    name: 'Imperial Royal Guard',
    category: 'infantry',
    tier: 3,
    buildingType: 'barracks',
    requiredBuildingLevel: 8,
    attack: 65,
    defense: 72,
    health: 130,
    speed: 1.05,
    loadCapacity: 32,
    power: 55,
    trainingCost: { food: 280, wood: 200, stone: 80, iron: 120, gold: 35 },
    trainingSecondsPerUnit: 7,
    description: 'Elite crown champions wielding masterwork halberds and gilded tower shields.',
  },

  // -------------------------------------------------------------------------
  // RANGED (Trained in Archery Range)
  // Strong vs Infantry, Vulnerable to Cavalry
  // -------------------------------------------------------------------------
  archer_t1: {
    unitId: 'archer_t1',
    name: 'Longbow Archer',
    category: 'ranged',
    tier: 1,
    buildingType: 'archery_range',
    requiredBuildingLevel: 1,
    attack: 26,
    defense: 18,
    health: 32,
    speed: 1.0,
    loadCapacity: 18,
    power: 10,
    trainingCost: { food: 40, wood: 60, stone: 0, iron: 5, gold: 0 },
    trainingSecondsPerUnit: 2,
    description: 'Nimble archers who darken the sky with deadly bodkin arrows from distance.',
  },
  archer_t2: {
    unitId: 'archer_t2',
    name: 'Heavy Crossbowman',
    category: 'ranged',
    tier: 2,
    buildingType: 'archery_range',
    requiredBuildingLevel: 4,
    attack: 46,
    defense: 32,
    health: 60,
    speed: 1.0,
    loadCapacity: 22,
    power: 24,
    trainingCost: { food: 100, wood: 140, stone: 20, iron: 30, gold: 10 },
    trainingSecondsPerUnit: 4,
    description: 'Mechanical crossbow specialists who punch bolts through heavy armor.',
  },
  archer_t3: {
    unitId: 'archer_t3',
    name: 'Elite Sharpshooter',
    category: 'ranged',
    tier: 3,
    buildingType: 'archery_range',
    requiredBuildingLevel: 8,
    attack: 78,
    defense: 54,
    health: 110,
    speed: 1.05,
    loadCapacity: 28,
    power: 55,
    trainingCost: { food: 220, wood: 320, stone: 60, iron: 90, gold: 35 },
    trainingSecondsPerUnit: 7,
    description: 'Master bowyers firing enchanted composite bows with lethal pinpoint accuracy.',
  },

  // -------------------------------------------------------------------------
  // CAVALRY (Trained in Warhorse Stables)
  // Strong vs Ranged, Fast March Speed, Vulnerable to Infantry
  // -------------------------------------------------------------------------
  cavalry_t1: {
    unitId: 'cavalry_t1',
    name: 'Scout Light Cavalry',
    category: 'cavalry',
    tier: 1,
    buildingType: 'stable',
    requiredBuildingLevel: 1,
    attack: 25,
    defense: 20,
    health: 38,
    speed: 1.45,
    loadCapacity: 15,
    power: 12,
    trainingCost: { food: 70, wood: 40, stone: 0, iron: 15, gold: 5 },
    trainingSecondsPerUnit: 3,
    description: 'Rapid horsemen on swift steeds, ideal for quick raids and running down routed foes.',
  },
  cavalry_t2: {
    unitId: 'cavalry_t2',
    name: 'Armored Knight',
    category: 'cavalry',
    tier: 2,
    buildingType: 'stable',
    requiredBuildingLevel: 4,
    attack: 44,
    defense: 38,
    health: 72,
    speed: 1.4,
    loadCapacity: 20,
    power: 26,
    trainingCost: { food: 160, wood: 90, stone: 20, iron: 60, gold: 20 },
    trainingSecondsPerUnit: 5,
    description: 'Heavy shock cavalry outfitted with barded destriers and couched lances.',
  },
  cavalry_t3: {
    unitId: 'cavalry_t3',
    name: 'Paladin Warhorse Rider',
    category: 'cavalry',
    tier: 3,
    buildingType: 'stable',
    requiredBuildingLevel: 8,
    attack: 74,
    defense: 66,
    health: 125,
    speed: 1.4,
    loadCapacity: 26,
    power: 60,
    trainingCost: { food: 350, wood: 200, stone: 60, iron: 160, gold: 50 },
    trainingSecondsPerUnit: 8,
    description: 'Consecrated knights whose devastating thunderous charges break enemy lines.',
  },

  // -------------------------------------------------------------------------
  // SIEGE (Trained in Barracks / Workshop)
  // Immense Load Capacity, High Fortification Damage, Slower March Speed
  // -------------------------------------------------------------------------
  siege_t1: {
    unitId: 'siege_t1',
    name: 'Battering Ram',
    category: 'siege',
    tier: 1,
    buildingType: 'barracks',
    requiredBuildingLevel: 2,
    attack: 18,
    defense: 30,
    health: 60,
    speed: 0.75,
    loadCapacity: 50,
    power: 11,
    trainingCost: { food: 40, wood: 100, stone: 30, iron: 15, gold: 0 },
    trainingSecondsPerUnit: 3,
    description: 'Reinforced oak logs with forged iron ram heads designed to shatter gates and carry loot.',
  },
  siege_t2: {
    unitId: 'siege_t2',
    name: 'Heavy Catapult',
    category: 'siege',
    tier: 2,
    buildingType: 'barracks',
    requiredBuildingLevel: 5,
    attack: 34,
    defense: 50,
    health: 100,
    speed: 0.75,
    loadCapacity: 75,
    power: 25,
    trainingCost: { food: 90, wood: 220, stone: 80, iron: 40, gold: 15 },
    trainingSecondsPerUnit: 5,
    description: 'Torsion engines slinging burning pitch and boulders into enemy fortifications.',
  },
  siege_t3: {
    unitId: 'siege_t3',
    name: 'Iron Trebuchet',
    category: 'siege',
    tier: 3,
    buildingType: 'barracks',
    requiredBuildingLevel: 9,
    attack: 62,
    defense: 85,
    health: 170,
    speed: 0.7,
    loadCapacity: 110,
    power: 58,
    trainingCost: { food: 180, wood: 450, stone: 200, iron: 110, gold: 40 },
    trainingSecondsPerUnit: 9,
    description: 'Colossal counterweight trebuchets pulverizing stone ramparts from extreme distance.',
  },
};

// ---------------------------------------------------------------------------
// COMBAT TRIANGLE ADVANTAGE MATRIX
// ---------------------------------------------------------------------------
export const COMBAT_TRIANGLE_ADVANTAGE: Record<TroopCategory, Partial<Record<TroopCategory, number>>> = {
  infantry: {
    cavalry: 1.25, // Infantry gains +25% damage vs Cavalry
    ranged: 0.85,   // Infantry takes more / deals less vs Ranged
    siege: 1.15,
    infantry: 1.0,
  },
  cavalry: {
    ranged: 1.25,   // Cavalry gains +25% damage vs Ranged
    infantry: 0.85, // Cavalry vulnerable to Infantry spears
    siege: 1.2,
    cavalry: 1.0,
  },
  ranged: {
    infantry: 1.25, // Ranged gains +25% damage vs Infantry
    cavalry: 0.85,  // Ranged vulnerable to fast Cavalry charges
    siege: 1.1,
    ranged: 1.0,
  },
  siege: {
    infantry: 0.9,
    cavalry: 0.85,
    ranged: 0.9,
    siege: 1.0,
  },
};

// ---------------------------------------------------------------------------
// ROSTER OF AVAILABLE COMMANDERS (5 HERO CLASSES)
// ---------------------------------------------------------------------------
export const COMMANDER_ROSTER: Record<string, Commander> = {
  // --- WARLORDS ---
  valeria_vanguard: {
    id: 'valeria_vanguard',
    name: 'Lady Valeria Ironheart',
    title: 'Marshal of the Silver Steppes',
    rarity: 'legendary',
    heroClass: 'warlord',
    archetype: 'cavalry',
    level: 1,
    exp: 0,
    maxExp: 1500,
    power: 1800,
    stars: 1,
    bio: 'A relentless equestrian commander from the high plains whose thunderous cavalry charges break enemy lines.',
    stats: {
      armyAttack: 0.20,
      armyDefense: 0.05,
      armyHealth: 0.10,
      marchSpeed: 0.20,
      armyCapacityBonus: 2000,
      payloadMultiplier: 0.10,
      gatheringSpeedBonus: 0.0,
      casualtyProtection: 0.05,
      constructionSpeedBonus: 0.0,
      trainingSpeedBonus: 0.05,
      pveDamageBonus: 0.20,
      pvpDamageBonus: 0.25,
    },
    skills: [
      {
        id: 'valeria_skill_1',
        name: 'Thunderous Charge',
        description: 'Increases cavalry attack by 20% and deals direct shock damage in Round 1.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
      {
        id: 'valeria_skill_2',
        name: 'Iron Will of the Steppes',
        description: 'Increases army march speed by 20% and expands army deployment capacity by 2,000.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },
  kragor_bloodthorn: {
    id: 'kragor_bloodthorn',
    name: 'Kragor Bloodthorn',
    title: 'Chieftain of the Iron Crags',
    rarity: 'epic',
    heroClass: 'warlord',
    archetype: 'infantry',
    level: 1,
    exp: 0,
    maxExp: 1000,
    power: 1400,
    stars: 1,
    bio: 'A fierce frontier warlord whose shock infantry specialize in storming barbarian strongholds and mountain passes.',
    stats: {
      armyAttack: 0.18,
      armyDefense: 0.08,
      armyHealth: 0.12,
      marchSpeed: 0.10,
      armyCapacityBonus: 1500,
      payloadMultiplier: 0.15,
      gatheringSpeedBonus: 0.0,
      casualtyProtection: 0.05,
      constructionSpeedBonus: 0.0,
      trainingSpeedBonus: 0.0,
      pveDamageBonus: 0.35,
      pvpDamageBonus: 0.15,
    },
    skills: [
      {
        id: 'kragor_skill_1',
        name: 'Barbarian Scourge',
        description: 'Deals +35% damage when attacking Barbarian Camps and wandering hordes.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'kragor_skill_2',
        name: 'Crag Cleaver',
        description: 'Infantry deal +15% attack and pierce 10% enemy armor during frontline clashes.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
    ],
  },

  // --- GUARDIANS ---
  alden_valiant: {
    id: 'alden_valiant',
    name: 'Sir Alden the Valiant',
    title: 'Knight of the Sun Crest',
    rarity: 'epic',
    heroClass: 'guardian',
    archetype: 'infantry',
    level: 1,
    exp: 0,
    maxExp: 1000,
    power: 1350,
    stars: 1,
    bio: 'A steadfast knight sworn to the crown. His presence steels infantry ranks and bolsters kingdom defense.',
    stats: {
      armyAttack: 0.05,
      armyDefense: 0.22,
      armyHealth: 0.18,
      marchSpeed: 0.05,
      armyCapacityBonus: 1200,
      payloadMultiplier: 0.05,
      gatheringSpeedBonus: 0.0,
      casualtyProtection: 0.18,
      constructionSpeedBonus: 0.0,
      trainingSpeedBonus: 0.05,
      pveDamageBonus: 0.05,
      pvpDamageBonus: 0.10,
    },
    skills: [
      {
        id: 'alden_skill_1',
        name: 'Shield Wall of the Sun',
        description: 'Increases infantry defense by 20% and reduces damage taken in melee combat.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
      {
        id: 'alden_skill_2',
        name: 'Sun-Forged Aegis',
        description: 'Protects the garrison and converts 18% of casualties into hospital wounded rather than fatalities.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },
  margaret_stonecrest: {
    id: 'margaret_stonecrest',
    name: 'Dame Margaret Stonecrest',
    title: 'Warden of the Southern Keep',
    rarity: 'legendary',
    heroClass: 'guardian',
    archetype: 'infantry',
    level: 1,
    exp: 0,
    maxExp: 1500,
    power: 1750,
    stars: 1,
    bio: 'A master architect-knight who transforms the Citadel into an impregnable fortress capable of withstanding protracted sieges.',
    stats: {
      armyAttack: 0.06,
      armyDefense: 0.28,
      armyHealth: 0.22,
      marchSpeed: 0.0,
      armyCapacityBonus: 1800,
      payloadMultiplier: 0.05,
      gatheringSpeedBonus: 0.0,
      casualtyProtection: 0.22,
      constructionSpeedBonus: 0.08,
      trainingSpeedBonus: 0.0,
      pveDamageBonus: 0.05,
      pvpDamageBonus: 0.15,
    },
    skills: [
      {
        id: 'margaret_skill_1',
        name: 'Rampart of Iron',
        description: 'Increases wall defense by 30% and reduces siege weapon damage by 25%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'margaret_skill_2',
        name: 'Fortress Retaliation',
        description: 'Garrisoned troops inflict +25% counter-attack damage when attacked inside the city.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
    ],
  },

  // --- RANGERS ---
  elena_swiftbow: {
    id: 'elena_swiftbow',
    name: 'Elena Swiftbow',
    title: 'Ranger General of Eldenwood',
    rarity: 'epic',
    heroClass: 'ranger',
    archetype: 'ranged',
    level: 1,
    exp: 0,
    maxExp: 1000,
    power: 1300,
    stars: 1,
    bio: 'A legendary master ranger whose archers blot out the sun and strike with unmatched swiftness across open terrain.',
    stats: {
      armyAttack: 0.14,
      armyDefense: 0.06,
      armyHealth: 0.08,
      marchSpeed: 0.30,
      armyCapacityBonus: 1200,
      payloadMultiplier: 0.10,
      gatheringSpeedBonus: 0.15,
      casualtyProtection: 0.08,
      constructionSpeedBonus: 0.0,
      trainingSpeedBonus: 0.05,
      pveDamageBonus: 0.15,
      pvpDamageBonus: 0.10,
    },
    skills: [
      {
        id: 'elena_skill_1',
        name: 'Black Arrow Volley',
        description: 'Increases archer attack by 20% and deals first-strike damage in Round 1.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
      {
        id: 'elena_skill_2',
        name: 'Wildwood Stride',
        description: 'Increases army march speed by 30% and increases gathering speed on world nodes by 15%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },
  corbin_windwalker: {
    id: 'corbin_windwalker',
    name: 'Corbin the Windwalker',
    title: 'Scoutmaster of the High Plains',
    rarity: 'rare',
    heroClass: 'ranger',
    archetype: 'ranged',
    level: 1,
    exp: 0,
    maxExp: 800,
    power: 1050,
    stars: 1,
    bio: 'An agile courier and pathfinder who navigates hostile territory faster than any mounted rider.',
    stats: {
      armyAttack: 0.08,
      armyDefense: 0.05,
      armyHealth: 0.06,
      marchSpeed: 0.40,
      armyCapacityBonus: 800,
      payloadMultiplier: 0.15,
      gatheringSpeedBonus: 0.20,
      casualtyProtection: 0.10,
      constructionSpeedBonus: 0.0,
      trainingSpeedBonus: 0.0,
      pveDamageBonus: 0.10,
      pvpDamageBonus: 0.05,
    },
    skills: [
      {
        id: 'corbin_skill_1',
        name: 'Zephyr Stride',
        description: 'Increases army march speed by 40% and scout movement speed by 50%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'corbin_skill_2',
        name: 'Pathfinder Eyes',
        description: 'Expands fog of war vision radius by +2 hexes and accelerates gathering by 20%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },

  // --- STEWARDS ---
  rodrick_ironwall: {
    id: 'rodrick_ironwall',
    name: 'Lord Rodrick Ironwall',
    title: 'Grand Engineer of the Bastion',
    rarity: 'epic',
    heroClass: 'steward',
    archetype: 'gathering',
    level: 1,
    exp: 0,
    maxExp: 1000,
    power: 1200,
    stars: 1,
    bio: 'A master tactician and builder specializing in civic development, fortified storage, and massive resource transport.',
    stats: {
      armyAttack: 0.05,
      armyDefense: 0.12,
      armyHealth: 0.10,
      marchSpeed: 0.05,
      armyCapacityBonus: 1500,
      payloadMultiplier: 0.40,
      gatheringSpeedBonus: 0.25,
      casualtyProtection: 0.08,
      constructionSpeedBonus: 0.12,
      trainingSpeedBonus: 0.05,
      pveDamageBonus: 0.05,
      pvpDamageBonus: 0.05,
    },
    skills: [
      {
        id: 'rodrick_skill_1',
        name: 'Imperial Logistics',
        description: 'Increases army resource plunder & transport payload capacity by 40%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'rodrick_skill_2',
        name: 'Master Blueprint',
        description: 'Reduces building upgrade construction time by 12% when assigned to the city.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },
  beatrice_prosperous: {
    id: 'beatrice_prosperous',
    name: 'Lady Beatrice the Prosperous',
    title: 'High Chancellor of the Guilds',
    rarity: 'legendary',
    heroClass: 'steward',
    archetype: 'gathering',
    level: 1,
    exp: 0,
    maxExp: 1500,
    power: 1650,
    stars: 1,
    bio: 'An economic visionary whose merchant agreements and grain silos ensure the kingdom never falters in wealth or harvest.',
    stats: {
      armyAttack: 0.04,
      armyDefense: 0.08,
      armyHealth: 0.10,
      marchSpeed: 0.10,
      armyCapacityBonus: 2000,
      payloadMultiplier: 0.50,
      gatheringSpeedBonus: 0.35,
      casualtyProtection: 0.06,
      constructionSpeedBonus: 0.15,
      trainingSpeedBonus: 0.10,
      pveDamageBonus: 0.05,
      pvpDamageBonus: 0.05,
    },
    skills: [
      {
        id: 'beatrice_skill_1',
        name: 'Golden Prosperity',
        description: 'Boosts passive hourly resource production by 20% and gathering speed by 35%.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'beatrice_skill_2',
        name: 'Deep Vaults',
        description: 'Protects an additional 150,000 resources from being looted during city raids.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },

  // --- STRATEGISTS ---
  vivian_gray: {
    id: 'vivian_gray',
    name: 'Archmage Vivian Gray',
    title: 'Grand Diviner of the Crown',
    rarity: 'legendary',
    heroClass: 'strategist',
    archetype: 'ranged',
    level: 1,
    exp: 0,
    maxExp: 1500,
    power: 1850,
    stars: 1,
    bio: 'A peerless tactician whose analytical mastery unlocks combined-arms synergies and amplifies combat counter advantages.',
    stats: {
      armyAttack: 0.14,
      armyDefense: 0.14,
      armyHealth: 0.14,
      marchSpeed: 0.15,
      armyCapacityBonus: 3000,
      payloadMultiplier: 0.20,
      gatheringSpeedBonus: 0.10,
      casualtyProtection: 0.12,
      constructionSpeedBonus: 0.05,
      trainingSpeedBonus: 0.15,
      pveDamageBonus: 0.20,
      pvpDamageBonus: 0.20,
    },
    skills: [
      {
        id: 'vivian_skill_1',
        name: 'Tactical Insight',
        description: 'Increases combat counter-triangle multiplier by 20% and expands army capacity by 3,000.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'vivian_skill_2',
        name: 'Combined Arms Doctrine',
        description: 'When fielding at least 2 unit types, all battalions gain +12% attack and defense.',
        level: 1,
        maxLevel: 5,
        type: 'combat_round',
      },
    ],
  },
  bryan_thorne: {
    id: 'bryan_thorne',
    name: 'Commander Bryan Thorne',
    title: 'Master of the Royal Academy',
    rarity: 'epic',
    heroClass: 'strategist',
    archetype: 'infantry',
    level: 1,
    exp: 0,
    maxExp: 1000,
    power: 1350,
    stars: 1,
    bio: 'A disciplined military scholar who drills recruits with speed and turns irregular levies into seasoned veterans.',
    stats: {
      armyAttack: 0.12,
      armyDefense: 0.12,
      armyHealth: 0.10,
      marchSpeed: 0.12,
      armyCapacityBonus: 2200,
      payloadMultiplier: 0.15,
      gatheringSpeedBonus: 0.05,
      casualtyProtection: 0.10,
      constructionSpeedBonus: 0.05,
      trainingSpeedBonus: 0.20,
      pveDamageBonus: 0.15,
      pvpDamageBonus: 0.15,
    },
    skills: [
      {
        id: 'bryan_skill_1',
        name: 'Rigorous Drill',
        description: 'Reduces troop training duration by 15% and increases military power.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
      {
        id: 'bryan_skill_2',
        name: 'Disciplined Vanguard',
        description: 'Expands deployment capacity by 2,200 and grants +10% defense in all combat rounds.',
        level: 1,
        maxLevel: 5,
        type: 'passive',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// CALCULATION HELPERS
// ---------------------------------------------------------------------------

export function getTroopDefinition(unitId: string): TroopDefinition | undefined {
  return TROOP_DEFINITIONS[unitId];
}

export function calculateTrainingCost(def: TroopDefinition, quantity: number): Resources {
  return {
    food: (def.trainingCost.food || 0) * quantity,
    wood: (def.trainingCost.wood || 0) * quantity,
    stone: (def.trainingCost.stone || 0) * quantity,
    iron: (def.trainingCost.iron || 0) * quantity,
    gold: (def.trainingCost.gold || 0) * quantity,
  };
}

export function calculateTrainingDurationSeconds(def: TroopDefinition, quantity: number): number {
  return Math.max(1, Math.round(def.trainingSecondsPerUnit * quantity));
}

export function calculateArmyCapacity(castleLevel: number, commander?: Commander): number {
  // Base 3,000 + 1,000 per castle level + commander level bonus
  const baseCap = 3000 + (castleLevel - 1) * 1000;
  let cmdBonus = 0;
  if (commander) {
    cmdBonus += commander.level * 200;
    if (commander.stats?.armyCapacityBonus) {
      cmdBonus += commander.stats.armyCapacityBonus;
    } else if (commander.heroClass === 'strategist') {
      cmdBonus += 2500;
    } else if (commander.heroClass === 'warlord') {
      cmdBonus += 1800;
    } else if (commander.id === 'alden_valiant') cmdBonus += 1000;
    else if (commander.id === 'valeria_vanguard') cmdBonus += 1500;
    else if (commander.id === 'elena_swiftbow') cmdBonus += 1200;
    else if (commander.id === 'rodrick_ironwall') cmdBonus += 2000;
  }
  return baseCap + cmdBonus;
}

export function calculateArmySpeedFactor(troops: Record<string, number>, commander?: Commander): number {
  let minSpeed = 1.0;
  let hasTroops = false;

  for (const [unitId, count] of Object.entries(troops)) {
    if (count <= 0) continue;
    hasTroops = true;
    const def = getTroopDefinition(unitId);
    if (def) {
      if (def.speed < minSpeed) minSpeed = def.speed;
    }
  }

  if (!hasTroops) return 1.0;

  // Commander speed bonus
  let commanderSpeedMult = 1.0;
  if (commander) {
    if (commander.stats?.marchSpeed) {
      commanderSpeedMult += commander.stats.marchSpeed;
    } else if (commander.heroClass === 'ranger') {
      commanderSpeedMult += 0.35;
    } else if (commander.heroClass === 'warlord') {
      commanderSpeedMult += 0.15;
    } else if (commander.id === 'alden_valiant') commanderSpeedMult += 0.10;
    else if (commander.id === 'valeria_vanguard') commanderSpeedMult += 0.25;
  }

  return minSpeed * commanderSpeedMult;
}

export function calculateArmyPayloadCapacity(troops: Record<string, number>, commander?: Commander): number {
  let totalPayload = 0;
  for (const [unitId, count] of Object.entries(troops)) {
    if (count <= 0) continue;
    const def = getTroopDefinition(unitId);
    const perUnit = def ? def.loadCapacity : 20;
    totalPayload += perUnit * count;
  }

  if (commander) {
    if (commander.stats?.payloadMultiplier) {
      totalPayload = Math.round(totalPayload * (1 + commander.stats.payloadMultiplier));
    } else if (commander.heroClass === 'steward') {
      totalPayload = Math.round(totalPayload * 1.40);
    } else if (commander.id === 'rodrick_ironwall') {
      totalPayload = Math.round(totalPayload * 1.35); // +35% logistics bonus
    }
  }

  return totalPayload;
}

export function calculateTotalTroopPower(troops: Record<string, number>): number {
  let totalPower = 0;
  for (const [unitId, count] of Object.entries(troops)) {
    if (count <= 0) continue;
    const def = getTroopDefinition(unitId);
    const perUnit = def ? def.power : 10;
    totalPower += perUnit * count;
  }
  return totalPower;
}
