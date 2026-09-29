/**
 * Realm of Crowns — NPC Data & Intelligence Architecture
 * Defines deterministic personality traits, occupations, needs, memory records, daily schedules,
 * relationship affinity metrics, and entity profiles.
 */

export type PersonalityTrait =
  | 'BRAVE'
  | 'COWARDLY'
  | 'AGGRESSIVE'
  | 'CAUTIOUS'
  | 'LOYAL'
  | 'GREEDY'
  | 'KIND'
  | 'SELFISH'
  | 'CURIOUS'
  | 'DUTIFUL'
  | 'AMBITIOUS'
  | 'SOCIABLE'
  | 'LONER'
  | 'PROTECTIVE'
  | 'DISCIPLINED';

export type VillagerOccupation =
  | 'FARMER'
  | 'WOODCUTTER'
  | 'MINER'
  | 'BLACKSMITH'
  | 'MERCHANT'
  | 'FISHER'
  | 'VILLAGER'
  | 'GUARD';

export type NPCRole =
  | 'villager'
  | 'guard'
  | 'merchant'
  | 'blacksmith'
  | 'farmer'
  | 'woodcutter'
  | 'miner'
  | 'noble'
  | 'soldier'
  | 'hero'
  | 'bandit'
  | 'wildlife';

export type FactionId = 'kingdom' | 'villagers' | 'bandits' | 'wildlife';

export type ActivityState =
  | 'idle'
  | 'working'
  | 'patrolling'
  | 'socializing'
  | 'sleeping'
  | 'fleeing'
  | 'defending'
  | 'attacking'
  | 'investigating'
  | 'celebrating';

export type MemoryEventType =
  | 'PLAYER_HELPED_ME'
  | 'PLAYER_ATTACKED_ME'
  | 'PLAYER_SAVED_VILLAGE'
  | 'PLAYER_BOUGHT_FROM_ME'
  | 'PLAYER_STOLE_FROM_ME'
  | 'ALLY_DIED'
  | 'VILLAGE_RAID'
  | 'HERO_SAVED_ME';

export type RelationshipTier =
  | 'Hatred'     // -100
  | 'Distrust'   // -50
  | 'Neutral'    // 0
  | 'Friendly'   // +25
  | 'Trusted'    // +50
  | 'Loyal'      // +75
  | 'Devoted';   // +100

export function getRelationshipTier(score: number): RelationshipTier {
  if (score <= -75) return 'Hatred';
  if (score <= -25) return 'Distrust';
  if (score < 20) return 'Neutral';
  if (score < 45) return 'Friendly';
  if (score < 70) return 'Trusted';
  if (score < 90) return 'Loyal';
  return 'Devoted';
}

export interface MemoryRecord {
  id: string;
  eventType?: MemoryEventType;
  category: 'help' | 'harm' | 'theft' | 'protection' | 'trade' | 'quest' | 'raid';
  description: string;
  importance: number; // 1 (minor interaction) to 10 (life-altering event)
  timestamp: number;
  relationshipImpact: number; // -100 to +100
  decayRate: number; // Per hour decay factor
}

export interface NPCNeeds {
  survival: number; // 0 to 100
  safety: number;   // 0 to 100 (low = high fear)
  work: number;     // 0 to 100
  social: number;   // 0 to 100
  duty: number;     // 0 to 100
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface DailySchedule {
  morning: Vector3D; // wake up and travel to vocation
  day: Vector3D;     // vocation workplace
  evening: Vector3D; // town square, tavern, market socialization
  night: Vector3D;   // home cottage or quarters
}

export interface NPCDialogueSet {
  greeting: string;
  busy: string;
  raidAlarm: string;
  raidPanic: string;
  victoryThanks: string;
}

export interface NPCEntity {
  id: string;
  name: string;
  role: NPCRole;
  occupation?: VillagerOccupation;
  faction: FactionId;
  traits: Set<PersonalityTrait>;
  courage: number;       // 0.0 (extreme coward) to 1.0 (fearless martyr)
  aggression: number;    // 0.0 (peaceful) to 1.0 (belligerent)
  loyalty: number;       // 0.0 to 1.0
  sociability: number;   // 0.0 to 1.0

  position: Vector3D;
  targetPosition: Vector3D | null;
  velocity: Vector3D;
  rotationY: number;
  moveSpeed: number;

  health: number;
  maxHealth: number;
  attackPower: number;
  attackRange: number;
  attackCooldownMs: number;
  lastAttackTimestamp: number;

  activity: ActivityState;
  needs: NPCNeeds;
  memories: MemoryRecord[];
  relationshipScore: number; // -100 (hatred) to +100 (devoted)
  currentTargetId: string | null;
  homePosition: Vector3D;
  workPosition: Vector3D;
  schedule?: DailySchedule;
  dialogue?: NPCDialogueSet;

  // Speech bubble overlay
  speechBubbleText?: string | null;
  speechBubbleTimer?: number;

  animationState: 'Idle' | 'Walking_A' | 'Running_A' | '1H_Melee_Attack_Chop' | 'Death_A' | 'Hit_A' | 'Cheer';
}
