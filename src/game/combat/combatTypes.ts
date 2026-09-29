/**
 * REALM OF CROWNS — Combat Foundation Types
 * Common interfaces for hero, army unit, guard, and raider combat resolution.
 */

export interface Combatant {
  id: string;
  name: string;
  team: 'player' | 'ally' | 'enemy' | 'neutral';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  hp: number;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  armor: number;
  isDead: boolean;
  onTakeDamage?: (amount: number, sourceId: string) => void;
  onDie?: () => void;
}

export interface FloatingDamageNumber {
  id: string;
  x: number;
  y: number;
  z: number;
  amount: number;
  isCrit: boolean;
  isHeal: boolean;
  color: string;
  lifetime: number;    // seconds remaining
  maxLifetime: number;
  velocityUp: number;
}

export interface DamageResult {
  damageDealt: number;
  isCrit: boolean;
  targetKilled: boolean;
  targetRemainingHp: number;
}
