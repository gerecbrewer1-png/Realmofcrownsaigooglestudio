/**
 * REALM OF CROWNS — Input & Control Types
 * Authoritative types for centralized shortcut manager, control preferences, and input contexts.
 */

export type InputContext =
  | 'GAMEPLAY'
  | 'HERO_CONTROL'
  | 'ARMY_COMMAND'
  | 'CHAT'
  | 'TEXT_INPUT'
  | 'MENU'
  | 'SETTINGS';

export type ControlMode = 'AUTO' | 'JOYSTICK' | 'KEYBOARD' | 'BOTH';

export type ControlSize = 'small' | 'medium' | 'large';

export type ControlOpacity = 'low' | 'medium' | 'high';

export type ActionCategory =
  | 'MOVEMENT'
  | 'ARMY_COMMANDS'
  | 'SELECTION'
  | 'FORMATIONS'
  | 'CAMERA'
  | 'SYSTEM';

export enum InputAction {
  // Movement (Reserved W, A, S, D & Arrows)
  MOVE_FORWARD = 'MOVE_FORWARD',
  MOVE_BACKWARD = 'MOVE_BACKWARD',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',

  // Army Commands
  ATTACK = 'ATTACK',
  ATTACK_MOVE = 'ATTACK_MOVE',
  MOVE_ORDER = 'MOVE_ORDER',
  FOLLOW = 'FOLLOW',
  DEFEND = 'DEFEND',
  HOLD = 'HOLD',
  STOP = 'STOP',
  RETREAT = 'RETREAT',
  CHARGE = 'CHARGE',
  PATROL = 'PATROL',

  // Unit / Group Selection
  SELECT_HERO = 'SELECT_HERO',
  SELECT_ARMY = 'SELECT_ARMY',
  SELECT_INFANTRY = 'SELECT_INFANTRY',
  SELECT_ARCHERS = 'SELECT_ARCHERS',
  SELECT_CAVALRY = 'SELECT_CAVALRY',
  CYCLE_SELECTION = 'CYCLE_SELECTION',

  // Formations
  FORMATION_LINE = 'FORMATION_LINE',
  FORMATION_WEDGE = 'FORMATION_WEDGE',
  FORMATION_COLUMN = 'FORMATION_COLUMN',
  FORMATION_BOX = 'FORMATION_BOX',
  FORMATION_CIRCLE = 'FORMATION_CIRCLE',
  FORMATION_DEFENSIVE = 'FORMATION_DEFENSIVE',

  // Camera
  CAMERA_ZOOM_IN = 'CAMERA_ZOOM_IN',
  CAMERA_ZOOM_OUT = 'CAMERA_ZOOM_OUT',

  // System / UI
  CANCEL = 'CANCEL',
  CONTROLS_HELP = 'CONTROLS_HELP',
  OPEN_SETTINGS = 'OPEN_SETTINGS',
  CLEAN_SCREEN = 'CLEAN_SCREEN',
}

export interface KeyBinding {
  action: InputAction;
  name: string;
  category: ActionCategory;
  primaryKey: string; // e.g. "KeyW", "KeyQ", "Digit1"
  secondaryKey?: string; // e.g. "ArrowUp", or undefined
  primaryDisplay: string; // e.g. "W", "Q", "1"
  secondaryDisplay?: string; // e.g. "↑", "—"
  isReservedMovement?: boolean;
}

export interface ControlPreferences {
  controlMode: ControlMode;
  showJoystick: boolean;
  showActionButtons: boolean;
  showControlHints: boolean;
  buttonOpacity: number; // 0.2 to 1.0
  joystickOpacity: number; // 0.2 to 1.0
  compactControls: boolean;
  controlSize: ControlSize;
  cleanScreenMode: boolean;
  compactBattleHud: boolean;
}

export interface KeyConflict {
  key: string;
  action1: InputAction;
  action1Name: string;
  type1: 'primary' | 'secondary';
  action2: InputAction;
  action2Name: string;
  type2: 'primary' | 'secondary';
  description: string;
}
