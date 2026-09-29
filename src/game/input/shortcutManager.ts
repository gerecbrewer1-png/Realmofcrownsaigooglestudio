/**
 * REALM OF CROWNS — Centralized Shortcut & Input Manager
 * Single authoritative source of truth for all keyboard shortcuts, primary/secondary bindings,
 * automatic conflict validation, continuous movement hold tracking, and context filtering.
 */

import { InputAction, InputContext, KeyBinding, KeyConflict } from './inputTypes';
import { controlPreferences } from './controlPreferences';

const BINDINGS_STORAGE_KEY = 'realm_of_crowns_key_bindings';

export const RESERVED_MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
]);

export const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
  // --- MOVEMENT (Strictly Reserved) ---
  {
    action: InputAction.MOVE_FORWARD,
    name: 'Move Forward',
    category: 'MOVEMENT',
    primaryKey: 'KeyW',
    secondaryKey: 'ArrowUp',
    primaryDisplay: 'W',
    secondaryDisplay: '↑',
    isReservedMovement: true,
  },
  {
    action: InputAction.MOVE_LEFT,
    name: 'Move Left',
    category: 'MOVEMENT',
    primaryKey: 'KeyA',
    secondaryKey: 'ArrowLeft',
    primaryDisplay: 'A',
    secondaryDisplay: '←',
    isReservedMovement: true,
  },
  {
    action: InputAction.MOVE_BACKWARD,
    name: 'Move Backward',
    category: 'MOVEMENT',
    primaryKey: 'KeyS',
    secondaryKey: 'ArrowDown',
    primaryDisplay: 'S',
    secondaryDisplay: '↓',
    isReservedMovement: true,
  },
  {
    action: InputAction.MOVE_RIGHT,
    name: 'Move Right',
    category: 'MOVEMENT',
    primaryKey: 'KeyD',
    secondaryKey: 'ArrowRight',
    primaryDisplay: 'D',
    secondaryDisplay: '→',
    isReservedMovement: true,
  },

  // --- ARMY COMMANDS ---
  {
    action: InputAction.ATTACK,
    name: 'Attack',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyQ',
    secondaryKey: undefined,
    primaryDisplay: 'Q',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.ATTACK_MOVE,
    name: 'Attack-Move',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyT',
    secondaryKey: undefined,
    primaryDisplay: 'T',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.MOVE_ORDER,
    name: 'Move Order',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyM',
    secondaryKey: undefined,
    primaryDisplay: 'M',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FOLLOW,
    name: 'Follow',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyF',
    secondaryKey: undefined,
    primaryDisplay: 'F',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.DEFEND,
    name: 'Defend',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyG',
    secondaryKey: undefined,
    primaryDisplay: 'G',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.HOLD,
    name: 'Hold Position',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyH',
    secondaryKey: undefined,
    primaryDisplay: 'H',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.STOP,
    name: 'Stop',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyX',
    secondaryKey: undefined,
    primaryDisplay: 'X',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.RETREAT,
    name: 'Retreat',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyR',
    secondaryKey: undefined,
    primaryDisplay: 'R',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.CHARGE,
    name: 'Charge',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyC',
    secondaryKey: undefined,
    primaryDisplay: 'C',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.PATROL,
    name: 'Patrol',
    category: 'ARMY_COMMANDS',
    primaryKey: 'KeyP',
    secondaryKey: undefined,
    primaryDisplay: 'P',
    secondaryDisplay: '—',
  },

  // --- UNIT SELECTION ---
  {
    action: InputAction.SELECT_HERO,
    name: 'Select Hero',
    category: 'SELECTION',
    primaryKey: 'Digit1',
    secondaryKey: undefined,
    primaryDisplay: '1',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.SELECT_ARMY,
    name: 'Select Army',
    category: 'SELECTION',
    primaryKey: 'Digit2',
    secondaryKey: undefined,
    primaryDisplay: '2',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.SELECT_INFANTRY,
    name: 'Select Infantry',
    category: 'SELECTION',
    primaryKey: 'Digit3',
    secondaryKey: undefined,
    primaryDisplay: '3',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.SELECT_ARCHERS,
    name: 'Select Archers',
    category: 'SELECTION',
    primaryKey: 'Digit4',
    secondaryKey: undefined,
    primaryDisplay: '4',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.SELECT_CAVALRY,
    name: 'Select Cavalry',
    category: 'SELECTION',
    primaryKey: 'Digit5',
    secondaryKey: undefined,
    primaryDisplay: '5',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.CYCLE_SELECTION,
    name: 'Cycle Selection',
    category: 'SELECTION',
    primaryKey: 'Tab',
    secondaryKey: undefined,
    primaryDisplay: 'Tab',
    secondaryDisplay: '—',
  },

  // --- FORMATIONS ---
  {
    action: InputAction.FORMATION_LINE,
    name: 'Line Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyZ',
    secondaryKey: undefined,
    primaryDisplay: 'Z',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FORMATION_WEDGE,
    name: 'Wedge Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyE',
    secondaryKey: undefined,
    primaryDisplay: 'E',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FORMATION_COLUMN,
    name: 'Column Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyV',
    secondaryKey: undefined,
    primaryDisplay: 'V',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FORMATION_BOX,
    name: 'Box Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyB',
    secondaryKey: undefined,
    primaryDisplay: 'B',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FORMATION_CIRCLE,
    name: 'Circle Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyN',
    secondaryKey: undefined,
    primaryDisplay: 'N',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.FORMATION_DEFENSIVE,
    name: 'Defensive Formation',
    category: 'FORMATIONS',
    primaryKey: 'KeyJ',
    secondaryKey: undefined,
    primaryDisplay: 'J',
    secondaryDisplay: '—',
  },

  // --- CAMERA ---
  {
    action: InputAction.CAMERA_ZOOM_IN,
    name: 'Zoom In',
    category: 'CAMERA',
    primaryKey: 'Equal',
    secondaryKey: 'NumpadAdd',
    primaryDisplay: '+',
    secondaryDisplay: 'Wheel Up',
  },
  {
    action: InputAction.CAMERA_ZOOM_OUT,
    name: 'Zoom Out',
    category: 'CAMERA',
    primaryKey: 'Minus',
    secondaryKey: 'NumpadSubtract',
    primaryDisplay: '-',
    secondaryDisplay: 'Wheel Down',
  },

  // --- GAME / UI ---
  {
    action: InputAction.CANCEL,
    name: 'Cancel / Back',
    category: 'SYSTEM',
    primaryKey: 'Escape',
    secondaryKey: undefined,
    primaryDisplay: 'Esc',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.CONTROLS_HELP,
    name: 'Controls Help',
    category: 'SYSTEM',
    primaryKey: 'F1',
    secondaryKey: undefined,
    primaryDisplay: 'F1',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.OPEN_SETTINGS,
    name: 'Settings',
    category: 'SYSTEM',
    primaryKey: 'F2',
    secondaryKey: undefined,
    primaryDisplay: 'F2',
    secondaryDisplay: '—',
  },
  {
    action: InputAction.CLEAN_SCREEN,
    name: 'Clean Screen',
    category: 'SYSTEM',
    primaryKey: 'F10',
    secondaryKey: undefined,
    primaryDisplay: 'F10',
    secondaryDisplay: '—',
  },
];

export class ShortcutManager {
  private static instance: ShortcutManager | null = null;
  private bindings: KeyBinding[] = [];
  private activeContext: InputContext = 'GAMEPLAY';
  private heldKeys: Set<string> = new Set();
  private actionListeners: Map<InputAction, Set<() => void>> = new Map();
  private anyActionListeners: Set<(action: InputAction) => void> = new Set();
  private bindingChangeListeners: Set<(bindings: KeyBinding[]) => void> = new Set();

  private constructor() {
    this.bindings = this.loadBindings();
    this.validateAndCleanBindings();
    this.setupWindowListeners();
  }

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  /**
   * Loads bindings from local storage or returns the default set.
   */
  private loadBindings(): KeyBinding[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(BINDINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as KeyBinding[];
          // Merge with default list in case new actions were added
          return DEFAULT_KEY_BINDINGS.map(def => {
            const found = parsed.find(p => p.action === def.action);
            return found ? { ...def, ...found } : { ...def };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load key bindings', e);
    }
    return DEFAULT_KEY_BINDINGS.map(b => ({ ...b }));
  }

  public saveBindings(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(this.bindings));
      }
    } catch (e) {
      console.warn('Failed to save key bindings', e);
    }
    this.notifyBindingChangeListeners();
  }

  /**
   * Scans every binding and returns validation status and all detected conflicts.
   */
  public static validateKeyBindings(bindings: KeyBinding[]): { isValid: boolean; conflicts: KeyConflict[] } {
    const conflicts: KeyConflict[] = [];
    const assignedKeys = new Map<string, { action: InputAction; name: string; type: 'primary' | 'secondary' }>();

    for (const b of bindings) {
      // 1. Check Primary Key
      if (b.primaryKey) {
        const existing = assignedKeys.get(b.primaryKey);
        if (existing && existing.action !== b.action) {
          conflicts.push({
            key: b.primaryKey,
            action1: existing.action,
            action1Name: existing.name,
            type1: existing.type,
            action2: b.action,
            action2Name: b.name,
            type2: 'primary',
            description: `Key "${ShortcutManager.formatKeyDisplay(b.primaryKey)}" is assigned to both ${existing.name} (${existing.type}) and ${b.name} (primary)`,
          });
        } else {
          assignedKeys.set(b.primaryKey, { action: b.action, name: b.name, type: 'primary' });
        }
      }

      // 2. Check Secondary Key
      if (b.secondaryKey) {
        const existing = assignedKeys.get(b.secondaryKey);
        if (existing && existing.action !== b.action) {
          conflicts.push({
            key: b.secondaryKey,
            action1: existing.action,
            action1Name: existing.name,
            type1: existing.type,
            action2: b.action,
            action2Name: b.name,
            type2: 'secondary',
            description: `Key "${ShortcutManager.formatKeyDisplay(b.secondaryKey)}" is assigned to both ${existing.name} (${existing.type}) and ${b.name} (secondary)`,
          });
        } else {
          assignedKeys.set(b.secondaryKey, { action: b.action, name: b.name, type: 'secondary' });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }

  public validateCurrentBindings(): { isValid: boolean; conflicts: KeyConflict[] } {
    return ShortcutManager.validateKeyBindings(this.bindings);
  }

  private validateAndCleanBindings(): void {
    const check = this.validateCurrentBindings();
    if (!check.isValid) {
      console.warn('Keyboard shortcut conflict detected in saved bindings! Resetting to defaults:', check.conflicts);
      this.bindings = DEFAULT_KEY_BINDINGS.map(b => ({ ...b }));
      this.saveBindings();
    }
  }

  public getBindings(): KeyBinding[] {
    return this.bindings.map(b => ({ ...b }));
  }

  public getBinding(action: InputAction): KeyBinding | undefined {
    return this.bindings.find(b => b.action === action);
  }

  /**
   * Remaps a key binding with automatic conflict detection and reserved movement safety.
   */
  public remapKey(
    action: InputAction,
    rawKey: string,
    isSecondary: boolean,
    forceReplace: boolean = false
  ): { success: boolean; conflict?: KeyConflict; reason?: string } {
    const targetBinding = this.bindings.find(b => b.action === action);
    if (!targetBinding) {
      return { success: false, reason: 'Action not found' };
    }

    const formattedDisplay = ShortcutManager.formatKeyDisplay(rawKey);

    // Reserved movement safety check:
    // If rawKey is a reserved movement key (W, A, S, D, Arrow Keys),
    // prevent non-movement actions from taking it unless explicitly forced.
    const isMovementAction = [
      InputAction.MOVE_FORWARD,
      InputAction.MOVE_BACKWARD,
      InputAction.MOVE_LEFT,
      InputAction.MOVE_RIGHT,
    ].includes(action);

    if (!isMovementAction && RESERVED_MOVEMENT_KEYS.has(rawKey) && !forceReplace) {
      return {
        success: false,
        reason: `Key "${formattedDisplay}" is a reserved movement key. Replacing it with a command key is strongly discouraged.`,
      };
    }

    // Check for conflict
    for (const b of this.bindings) {
      if (b.action === action) continue;

      if (b.primaryKey === rawKey) {
        const conflict: KeyConflict = {
          key: rawKey,
          action1: b.action,
          action1Name: b.name,
          type1: 'primary',
          action2: action,
          action2Name: targetBinding.name,
          type2: isSecondary ? 'secondary' : 'primary',
          description: `Key "${formattedDisplay}" is already assigned to ${b.name} (Primary).`,
        };

        if (!forceReplace) {
          return { success: false, conflict };
        } else {
          // Replace: unbind old action's primary key
          b.primaryKey = '';
          b.primaryDisplay = '—';
        }
      }

      if (b.secondaryKey === rawKey) {
        const conflict: KeyConflict = {
          key: rawKey,
          action1: b.action,
          action1Name: b.name,
          type1: 'secondary',
          action2: action,
          action2Name: targetBinding.name,
          type2: isSecondary ? 'secondary' : 'primary',
          description: `Key "${formattedDisplay}" is already assigned to ${b.name} (Secondary).`,
        };

        if (!forceReplace) {
          return { success: false, conflict };
        } else {
          // Replace: unbind old action's secondary key
          b.secondaryKey = undefined;
          b.secondaryDisplay = '—';
        }
      }
    }

    // Apply new key
    if (isSecondary) {
      targetBinding.secondaryKey = rawKey;
      targetBinding.secondaryDisplay = formattedDisplay;
    } else {
      targetBinding.primaryKey = rawKey;
      targetBinding.primaryDisplay = formattedDisplay;
    }

    this.saveBindings();
    return { success: true };
  }

  public resetKey(action: InputAction): void {
    const def = DEFAULT_KEY_BINDINGS.find(b => b.action === action);
    const target = this.bindings.find(b => b.action === action);
    if (def && target) {
      target.primaryKey = def.primaryKey;
      target.secondaryKey = def.secondaryKey;
      target.primaryDisplay = def.primaryDisplay;
      target.secondaryDisplay = def.secondaryDisplay;
      this.saveBindings();
    }
  }

  public resetAllKeys(): void {
    this.bindings = DEFAULT_KEY_BINDINGS.map(b => ({ ...b }));
    this.saveBindings();
  }

  public setContext(context: InputContext): void {
    this.activeContext = context;
  }

  public getContext(): InputContext {
    return this.activeContext;
  }

  /**
   * Formats event.code into clean user-facing label (e.g. "KeyW" -> "W", "ArrowUp" -> "↑").
   */
  public static formatKeyDisplay(code: string): string {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    switch (code) {
      case 'ArrowUp': return '↑';
      case 'ArrowDown': return '↓';
      case 'ArrowLeft': return '←';
      case 'ArrowRight': return '→';
      case 'Space': return 'Space';
      case 'Escape': return 'Esc';
      case 'Tab': return 'Tab';
      case 'Equal': return '+';
      case 'Minus': return '-';
      case 'Enter': return 'Enter';
      case 'Backspace': return 'Backspace';
      case 'ShiftLeft':
      case 'ShiftRight': return 'Shift';
      case 'ControlLeft':
      case 'ControlRight': return 'Ctrl';
      case 'AltLeft':
      case 'AltRight': return 'Alt';
      default: return code;
    }
  }

  /**
   * Continuous movement vector calculation based on currently held keys.
   * Returns normalized vector: { x: -1..1, z: -1..1 }.
   */
  public getMovementVector(): { x: number; z: number } {
    // If preferences indicate keyboard is disabled (e.g. pure JOYSTICK mode), return 0
    const mode = controlPreferences.getEffectiveControlMode();
    if (mode === 'JOYSTICK') {
      return { x: 0, z: 0 };
    }

    let x = 0;
    let z = 0;

    const fwd = this.bindings.find(b => b.action === InputAction.MOVE_FORWARD);
    const bwd = this.bindings.find(b => b.action === InputAction.MOVE_BACKWARD);
    const left = this.bindings.find(b => b.action === InputAction.MOVE_LEFT);
    const right = this.bindings.find(b => b.action === InputAction.MOVE_RIGHT);

    if (fwd && (this.heldKeys.has(fwd.primaryKey) || (fwd.secondaryKey && this.heldKeys.has(fwd.secondaryKey)))) {
      z -= 1;
    }
    if (bwd && (this.heldKeys.has(bwd.primaryKey) || (bwd.secondaryKey && this.heldKeys.has(bwd.secondaryKey)))) {
      z += 1;
    }
    if (left && (this.heldKeys.has(left.primaryKey) || (left.secondaryKey && this.heldKeys.has(left.secondaryKey)))) {
      x -= 1;
    }
    if (right && (this.heldKeys.has(right.primaryKey) || (right.secondaryKey && this.heldKeys.has(right.secondaryKey)))) {
      x += 1;
    }

    const mag = Math.hypot(x, z);
    if (mag > 0.001) {
      return { x: x / mag, z: z / mag };
    }
    return { x: 0, z: 0 };
  }

  /**
   * Action subscriptions
   */
  public onAction(action: InputAction, callback: () => void): () => void {
    if (!this.actionListeners.has(action)) {
      this.actionListeners.set(action, new Set());
    }
    this.actionListeners.get(action)!.add(callback);
    return () => {
      this.actionListeners.get(action)?.delete(callback);
    };
  }

  public onAnyAction(callback: (action: InputAction) => void): () => void {
    this.anyActionListeners.add(callback);
    return () => {
      this.anyActionListeners.delete(callback);
    };
  }

  public onBindingChange(callback: (bindings: KeyBinding[]) => void): () => void {
    this.bindingChangeListeners.add(callback);
    return () => {
      this.bindingChangeListeners.delete(callback);
    };
  }

  private notifyBindingChangeListeners(): void {
    const list = this.getBindings();
    for (const l of this.bindingChangeListeners) {
      try { l(list); } catch (e) { console.error(e); }
    }
  }

  public dispatchAction(action: InputAction): void {
    const listeners = this.actionListeners.get(action);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(); } catch (e) { console.error('Error executing shortcut action', action, e); }
      }
    }
    for (const anyCb of this.anyActionListeners) {
      try { anyCb(action); } catch (e) { console.error(e); }
    }
  }

  /**
   * Window Key Listeners
   */
  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // 1. Text Field / Chat box suppression:
      // If typing in input, textarea, select, or contenteditable, completely suppress gameplay shortcuts!
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        return;
      }

      this.heldKeys.add(e.code);

      // 2. Continuous movement actions (W, A, S, D, Arrow Keys) are handled via getMovementVector() in the update loop.
      // Do NOT dispatch discrete one-shot triggers for movement.
      if (RESERVED_MOVEMENT_KEYS.has(e.code)) {
        return;
      }

      // 3. For discrete command keys (Q, T, M, F, G, H, X, R, C, P, Formations, Selection, etc.),
      // ensure we do not repeatedly fire while key is held!
      if (e.repeat) {
        return;
      }

      // Look up matching action
      for (const b of this.bindings) {
        if (b.isReservedMovement) continue; // movement keys don't trigger command actions

        if (b.primaryKey === e.code || (b.secondaryKey && b.secondaryKey === e.code)) {
          // Prevent browser defaults for functional gameplay keys like Tab, F1, F2, F10, +, -
          if (['Tab', 'F1', 'F2', 'F10', 'Equal', 'Minus'].includes(e.code)) {
            e.preventDefault();
          }

          this.dispatchAction(b.action);
          break;
        }
      }
    }, { passive: false });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.heldKeys.clear();
    });
  }
}

export const shortcutManager = ShortcutManager.getInstance();
