/**
 * Realm of Crowns — Hero Character & Leadership System
 * Models hero classes, progression, tactical abilities, and dual player/AI control modes.
 */

import { Vector3D } from '../npc/npcTypes';

export type HeroClass = 'Warlord' | 'Guardian' | 'Ranger' | 'Strategist' | 'Steward' | 'warlord' | 'guardian' | 'ranger' | 'strategist' | 'steward';

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  staminaCost: number;
  cooldownSeconds: number;
  lastUsedTimestamp: number;
  radius: number;
  damageMultiplier: number;
  effectType?: 'whirlwind' | 'shield_wall' | 'volley' | 'rally' | 'inspire';
  range?: number;
  cooldown?: number;
  currentCooldown?: number;
}

export interface HeroProfile {
  id: string;
  name: string;
  title?: string;
  heroClass: HeroClass;
  level: number;
  experience?: number;
  xp?: number;
  xpToNextLevel?: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  attackPower: number;
  defensePower: number;
  leadership: number; // Max units hero can command
  morale: number;     // 0 to 100

  position: Vector3D;
  rotationY: number;
  velocity: Vector3D;
  moveSpeed: number;

  isPlayerControlled: boolean;
  assignedArmyId: string | null;
  abilities: HeroAbility[];

  animationState: 'Idle' | 'Walking_A' | 'Running_A' | '1H_Melee_Attack_Chop' | '2H_Melee_Attack_Chop' | 'Death_A' | 'Hit_A' | 'Cheer';
}
