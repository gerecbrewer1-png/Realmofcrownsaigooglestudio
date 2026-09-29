/**
 * Realm of Crowns - Core Types & Interfaces
 */

export type ResourceType = 'food' | 'wood' | 'stone' | 'iron' | 'gold';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
}

export interface ProductionRates {
  foodPerHour: number;
  woodPerHour: number;
  stonePerHour: number;
  ironPerHour: number;
  goldPerHour: number;
}

export type BuildingCategory = 'civil' | 'economic' | 'military' | 'defense' | 'science';

export type TroopCategory = 'infantry' | 'ranged' | 'cavalry' | 'siege';

export interface TroopDefinition {
  unitId: string;
  name: string;
  category: TroopCategory;
  tier: number;
  buildingType: string;
  requiredBuildingLevel: number;
  attack: number;
  defense: number;
  health: number;
  speed: number;
  loadCapacity: number;
  power: number;
  trainingCost: Resources;
  trainingSecondsPerUnit: number;
  description: string;
}

export interface BuildingPrerequisite {
  buildingType: string;
  level: number;
}

export interface BuildingDefinition {
  type: string;
  name: string;
  category: BuildingCategory;
  description: string;
  maxLevel: number;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  baseDurationSeconds: number;
  durationMultiplier: number;
  baseProduction?: Partial<ProductionRates>;
  productionMultiplier?: number;
  prerequisites: BuildingPrerequisite[];
  visualDistrict: 'central' | 'farmland' | 'quarry' | 'military' | 'walls';
}

export interface BuildingInstance {
  id: string;
  type: string;
  name: string;
  level: number;
  slot: string;
  visualDistrict: 'central' | 'farmland' | 'quarry' | 'military' | 'walls';
  isUpgrading?: boolean;
}

export interface ConstructionTask {
  taskId: string;
  buildingId: string;
  buildingType: string;
  buildingName: string;
  targetLevel: number;
  startTime: number; // ms
  completionTime: number; // ms
  durationSeconds: number;
}

export interface PlayerProfile {
  uid: string;
  displayName: string;
  title: string;
  avatar: string;
  playerLevel: number;
  playerExp: number;
  nextLevelExp: number;
  vipLevel: number;
  vipPoints: number;
  power: number;
  gems: number;
  shieldExpiresAt: number; // ms
  createdAt: number;
  lastLoginAt: number;
  loginStreak: number;
  starterCharterClaimed: boolean;
}

export interface TrainingTask {
  taskId: string;
  buildingId: string;
  buildingType: string;
  unitId: string;
  unitName: string;
  category: TroopCategory;
  tier: number;
  quantity: number;
  startTime: number;
  completionTime: number;
  durationSeconds: number;
}

export interface KingdomState {
  id: string;
  ownerUid: string;
  name: string;
  castleLevel: number;
  resources: Resources;
  storageCap: Resources;
  productionRates: ProductionRates;
  lastResourceUpdate: number; // ms
  buildings: BuildingInstance[];
  constructionQueue: ConstructionTask[];
  maxQueueSlots: number;
  troops: Record<string, number>;
  trainingQueue: TrainingTask[];
  woundedTroops: Record<string, number>;
  hospitalCapacity: number;
}

export type QuestCategory = 'chapter' | 'economic' | 'military' | 'daily';

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  targetType: 'building_level' | 'resource_count' | 'speedup_used' | 'collect_resource';
  targetKey: string;
  targetValue: number;
  rewardGems: number;
  rewardResources: Partial<Resources>;
  rewardItems?: { itemId: string; quantity: number }[];
  rewardExp: number;
  order: number;
}

export interface QuestProgress {
  questId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'speedup' | 'resource_pack' | 'shield' | 'chest';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  iconName: string;
  effect: {
    speedupMinutes?: number;
    resources?: Partial<Resources>;
    shieldHours?: number;
    gems?: number;
  };
}

export type HeroClass = 'warlord' | 'guardian' | 'ranger' | 'steward' | 'strategist';
export type HeroRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface HeroCoreStats {
  armyAttack: number;
  armyDefense: number;
  armyHealth: number;
  marchSpeed: number;
  armyCapacityBonus: number;
  payloadMultiplier: number;
  gatheringSpeedBonus: number;
  casualtyProtection: number;
  constructionSpeedBonus: number;
  trainingSpeedBonus: number;
  pveDamageBonus: number;
  pvpDamageBonus: number;
}

export interface HeroSkill {
  id: string;
  name: string;
  description: string;
  type?: 'passive' | 'combat_round' | 'active_march';
  unlockedAtStar?: number;
  level: number;
  maxLevel?: number;
  effectKey?: string;
  baseValue?: number;
}

export interface TalentNode {
  id: string;
  nodeId?: string;
  name: string;
  description: string;
  tier?: 1 | 2 | 3 | 4 | number;
  pointsAllocated?: number;
  currentRank?: number;
  currentPoints?: number;
  maxPoints: number;
  maxRank?: number;
  statModifiers?: Partial<HeroCoreStats>;
  buffEffect?: Partial<HeroCoreStats>;
  requiredNodeId?: string;
}

export interface TalentBranch {
  id?: string;
  branchId?: string;
  name: string;
  description: string;
  investedPoints?: number;
  nodes?: TalentNode[];
  talents?: TalentNode[];
}

export interface HeroEquipmentSlots {
  weapon?: string;
  armor?: string;
  helmet?: string;
  accessory?: string;
  steedOrBanner?: string;
}

export type HeroRole =
  | 'citadel_garrison'
  | 'field_march'
  | 'treasury_overseer'
  | 'logistics_minister'
  | 'master_of_arms'
  | 'idle'
  | 'marching'
  | 'stationed_garrison'
  | 'city_steward';

export interface Commander {
  id: string;
  name: string;
  title: string;
  rarity: HeroRarity;
  heroClass: HeroClass;
  archetype: 'infantry' | 'cavalry' | 'ranged' | 'gathering' | HeroClass;
  level: number;
  exp: number;
  maxExp: number;
  power: number;
  stars: number;
  bio: string;
  stats?: HeroCoreStats;
  skills: HeroSkill[];
  talentBranches?: TalentBranch[];
  talentPoints?: number;
  equipment?: HeroEquipmentSlots;
  assignedRole?: HeroRole;
}

export interface TransactionRecord {
  transactionId: string;
  playerId: string;
  source: string;
  currencyType: 'gems' | 'food' | 'wood' | 'stone' | 'iron' | 'gold';
  amountDelta: number;
  balanceAfter: number;
  timestamp: number;
}

export interface GameConfiguration {
  version: string;
  starterPackage: {
    gems: number;
    resources: Resources;
    items: { itemId: string; quantity: number }[];
    shieldHours: number;
    starterCommanderId: string;
    starterTroops: Record<string, number>;
  };
  buildingDefs: Record<string, BuildingDefinition>;
  questDefs: QuestDefinition[];
  storePacks: {
    id: string;
    name: string;
    priceUsd: number;
    gems: number;
    bonusGems: number;
    badge?: string;
  }[];
}

// ---------------------------------------------------------------------------
// PHASE 2: PERSISTENT WORLD MAP & MARCH SYSTEM TYPES
// ---------------------------------------------------------------------------

export interface HexCoordinates {
  q: number; // axial column
  r: number; // axial row
}

export type WorldTerrainType = 'plains' | 'forest' | 'mountains' | 'water';

export type WorldEntityType =
  | 'empty'
  | 'player_kingdom'
  | 'rival_kingdom'
  | 'resource_node'
  | 'barbarian_camp'
  | 'ancient_shrine';

export interface ResourceNode {
  id: string;
  resourceType: ResourceType;
  level: number;
  name: string;
  maxCapacity: number;
  currentCapacity: number;
  gatheringRatePerHour: number;
  occupiedByPlayerId?: string;
  occupiedByPlayerName?: string;
  marchId?: string;
}

export interface BarbarianCamp {
  id: string;
  level: number;
  name: string;
  power: number;
  garrison: Record<string, number>;
  rewards: {
    gems: number;
    resources: Partial<Resources>;
    exp: number;
    speedupMinutes: number;
  };
  defeated?: boolean;
  respawnTime?: number;
}

export interface RivalKingdom {
  id: string;
  ownerName: string;
  castleLevel: number;
  power: number;
  allianceTag?: string;
  shieldActive: boolean;
  shieldExpiresAt?: number;
}

export interface AncientShrine {
  id: string;
  name: string;
  buffType: 'attack' | 'gathering' | 'defense';
  buffValuePercent: number;
  description: string;
}

export interface WorldTile {
  id: string;
  coords: HexCoordinates;
  terrain: WorldTerrainType;
  entityType: WorldEntityType;
  entityId?: string;
  resourceNode?: ResourceNode;
  barbarianCamp?: BarbarianCamp;
  rivalKingdom?: RivalKingdom;
  ancientShrine?: AncientShrine;
  playerKingdom?: {
    ownerUid: string;
    name: string;
    castleLevel: number;
    power: number;
    shieldActive: boolean;
  };
}

export type MarchType = 'gather' | 'attack_barbarian' | 'scout' | 'return';
export type MarchStatus = 'marching' | 'gathering' | 'returning' | 'completed';

export interface ArmyMarch {
  marchId: string;
  playerId: string;
  playerName: string;
  commanderId: string;
  commanderName: string;
  type: MarchType;
  status: MarchStatus;
  originCoords: HexCoordinates;
  targetCoords: HexCoordinates;
  targetType: WorldEntityType;
  targetName: string;
  targetId?: string;
  troops: Record<string, number>;
  totalTroopCount: number;
  carriedResources: Resources;
  maxPayloadCapacity: number;
  gatheringRatePerHour?: number;
  departureTime: number; // ms
  estimatedArrivalTime: number; // ms
  totalDurationSeconds: number;
  gatheringStartedAt?: number;
  returnDepartureTime?: number;
  returnArrivalTime?: number;
  battleReportId?: string;
}

export interface BattleRound {
  round: number;
  phaseName: string;
  attackerDamageDealt: number;
  defenderDamageDealt: number;
  description: string;
}

export interface BattleReport {
  id: string;
  timestamp: number;
  targetName: string;
  targetCoords: HexCoordinates;
  victory: boolean;
  commanderId?: string;
  commanderName?: string;
  commanderExpGained: number;
  commanderLevelUp?: boolean;
  newCommanderLevel?: number;
  rounds?: BattleRound[];
  rewards: {
    gems: number;
    resources: Partial<Resources>;
    speedupMinutes?: number;
  };
  playerTroopsSent: Record<string, number>;
  playerCasualties: Record<string, number>;
  playerSeverelyWounded?: Record<string, number>;
  playerKilled?: Record<string, number>;
  playerSurviving?: Record<string, number>;
  enemyTroopsInitial?: Record<string, number>;
  enemyTroopsDefeated: Record<string, number>;
  plunderedResources?: Resources;
}

export interface ScoutReport {
  id: string;
  timestamp: number;
  targetCoords: HexCoordinates;
  entityType: WorldEntityType;
  details: {
    name: string;
    level?: number;
    power?: number;
    resourcesRemaining?: Partial<Resources>;
    garrisonEstimate?: string;
    shieldStatus?: string;
  };
}

export interface PlayerWorldState {
  playerId: string;
  homeCoords: HexCoordinates;
  exploredTileKeys: string[];
  activeMarches: ArmyMarch[];
  maxMarchSlots: number;
  recentReports: (BattleReport | ScoutReport)[];
}

