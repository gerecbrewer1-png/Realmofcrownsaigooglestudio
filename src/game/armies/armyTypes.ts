/**
 * REALM OF CROWNS — Mobile Tactical Army & Unit Types
 * Defines troop archetypes, formation geometries, unit states, and commands.
 */

export type UnitType = 'swordsman' | 'spearman' | 'archer' | 'cavalry' | 'guard';

export type FormationType = 'line' | 'column' | 'wedge' | 'defensive_box' | 'scatter';

export type TacticalOrder = 'follow' | 'hold' | 'attack' | 'defend' | 'charge' | 'retreat' | 'move' | 'stop' | 'patrol';

export type UnitState = 'IDLE' | 'MOVING' | 'FORMING' | 'ATTACKING' | 'DEFENDING' | 'RETREATING' | 'DEAD';

export interface ArmyOrder {
  id: string;
  type: TacticalOrder;
  destination?: { x: number; z: number };
  targetId?: string | null;
  formation: FormationType;
  priority: number;
  issuedBy: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'cancelled';
}

export interface UnitStats {
  maxHp: number;
  hp: number;
  attackDamage: number;
  attackRange: number;       // meters (melee: ~2m, archers: ~16m)
  attackSpeed: number;       // attacks per second
  attackCooldown: number;    // seconds remaining
  moveSpeed: number;         // meters/sec
  armor: number;             // flat damage reduction
  morale: number;            // 0 - 100 (below 20 = rout)
}

export interface ArmyUnit {
  id: string;
  name: string;
  type: UnitType;
  team: 'player' | 'ally' | 'enemy' | 'neutral';
  stats: UnitStats;
  
  // Position & Orientation
  x: number;
  y: number;
  z: number;
  rotationY: number;

  // Formation slot
  formationIndex: number;
  slotOffsetX: number; // offset relative to formation center/leader
  slotOffsetZ: number;

  // State
  state: UnitState;
  order: TacticalOrder;
  currentOrderObj?: ArmyOrder | null;
  targetUnitId: string | null;
  targetPosition: { x: number; z: number } | null;
  isEngaged: boolean;
  isRouting: boolean;
  isDead: boolean;
  isSelected?: boolean;

  // Animation state
  currentAnim: 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'death' | 'cheer';
}

export interface FormationSlot {
  index: number;
  offsetX: number;
  offsetZ: number;
  preferredType?: UnitType;
}

export interface ArmySquad {
  id: string;
  name: string;
  leaderId: string;
  formation: FormationType;
  currentOrder: TacticalOrder;
  activeOrder?: ArmyOrder | null;
  units: ArmyUnit[];
  rallyPoint: { x: number; z: number };
  formationCenter: { x: number; z: number };
  facingAngle: number;
  isSelected?: boolean;
}

