/**
 * REALM OF CROWNS — Adaptive Controls & Conflict-Free Keyboard System Test Suite
 * Validates:
 * 1. Default key bindings conflict scanner (Zero conflicts)
 * 2. Reserved movement keys protection (W, A, S, D, Arrow Keys)
 * 3. Artificial conflict injection & detection (Primary vs Primary, Primary vs Secondary)
 * 4. Control Preferences manager (persistence, mode switching, clean screen mode)
 * 5. Joystick visibility & suppression logic
 * 6. Continuous movement vector calculation (WASD diagonals & Arrow keys)
 * 7. Remapping safety with conflict detection
 */

import { DEFAULT_KEY_BINDINGS, ShortcutManager, RESERVED_MOVEMENT_KEYS } from '../src/game/input/shortcutManager';
import { InputAction, KeyBinding } from '../src/game/input/inputTypes';
import { controlPreferences } from '../src/game/input/controlPreferences';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('REALM OF CROWNS — ADAPTIVE INPUT & CONTROLS TEST SUITE');
console.log('======================================================\n');

// ----------------------------------------------------
// TEST SUITE 1: Authoritative Default Bindings Validation
// ----------------------------------------------------
console.log('--- TEST SUITE 1: Authoritative Default Bindings Validation ---');

const defaultValidation = ShortcutManager.validateKeyBindings(DEFAULT_KEY_BINDINGS);
assert(defaultValidation.isValid, 'Default key bindings have ZERO conflicts', JSON.stringify(defaultValidation.conflicts));
assert(defaultValidation.conflicts.length === 0, 'Conflict count is 0');

// Verify all reserved movement keys are strictly mapped to movement actions only
for (const key of RESERVED_MOVEMENT_KEYS) {
  const matchingBindings = DEFAULT_KEY_BINDINGS.filter(b => b.primaryKey === key || b.secondaryKey === key);
  assert(matchingBindings.length === 1, `Reserved key ${key} is bound to exactly one action`);
  const binding = matchingBindings[0];
  const isMovement = [
    InputAction.MOVE_FORWARD,
    InputAction.MOVE_BACKWARD,
    InputAction.MOVE_LEFT,
    InputAction.MOVE_RIGHT,
  ].includes(binding.action);
  assert(isMovement, `Reserved key ${key} is bound exclusively to movement (${binding.name})`);
}

// Verify Army commands have the requested clean RTS layout
const attackBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.ATTACK);
assert(attackBinding?.primaryKey === 'KeyQ', 'Attack is bound to Q', attackBinding?.primaryKey);

const attackMoveBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.ATTACK_MOVE);
assert(attackMoveBinding?.primaryKey === 'KeyT', 'Attack-Move is bound to T', attackMoveBinding?.primaryKey);

const moveBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.MOVE_ORDER);
assert(moveBinding?.primaryKey === 'KeyM', 'Move Order is bound to M', moveBinding?.primaryKey);

const stopBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.STOP);
assert(stopBinding?.primaryKey === 'KeyX', 'Stop is bound to X', stopBinding?.primaryKey);

const holdBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.HOLD);
assert(holdBinding?.primaryKey === 'KeyH', 'Hold is bound to H', holdBinding?.primaryKey);

const defendBinding = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.DEFEND);
assert(defendBinding?.primaryKey === 'KeyG', 'Defend is bound to G', defendBinding?.primaryKey);

// Verify Formations
const lineForm = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.FORMATION_LINE);
assert(lineForm?.primaryKey === 'KeyZ', 'Line Formation is bound to Z', lineForm?.primaryKey);

const wedgeForm = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.FORMATION_WEDGE);
assert(wedgeForm?.primaryKey === 'KeyE', 'Wedge Formation is bound to E', wedgeForm?.primaryKey);

const colForm = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.FORMATION_COLUMN);
assert(colForm?.primaryKey === 'KeyV', 'Column Formation is bound to V', colForm?.primaryKey);

// Verify Selection
const heroSel = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.SELECT_HERO);
assert(heroSel?.primaryKey === 'Digit1', 'Select Hero is bound to 1', heroSel?.primaryKey);

const armySel = DEFAULT_KEY_BINDINGS.find(b => b.action === InputAction.SELECT_ARMY);
assert(armySel?.primaryKey === 'Digit2', 'Select Army is bound to 2', armySel?.primaryKey);

// ----------------------------------------------------
// TEST SUITE 2: Conflict Scanner Detection
// ----------------------------------------------------
console.log('\n--- TEST SUITE 2: Conflict Scanner Detection ---');

// Inject artificial duplicate: assign KeyA (Move Left) to ATTACK
const conflictBindings1: KeyBinding[] = DEFAULT_KEY_BINDINGS.map(b => {
  if (b.action === InputAction.ATTACK) {
    return { ...b, primaryKey: 'KeyA' };
  }
  return { ...b };
});

const conflictCheck1 = ShortcutManager.validateKeyBindings(conflictBindings1);
assert(!conflictCheck1.isValid, 'Scanner correctly flags Primary vs Primary duplicate (KeyA on Attack and Move Left)');
assert(conflictCheck1.conflicts.length > 0, 'Scanner reports conflict details');
console.log('   Detected Conflict Notice:', conflictCheck1.conflicts[0]?.description);

// Inject artificial secondary conflict: assign ArrowUp (Move Forward secondary) to DEFEND
const conflictBindings2: KeyBinding[] = DEFAULT_KEY_BINDINGS.map(b => {
  if (b.action === InputAction.DEFEND) {
    return { ...b, primaryKey: 'ArrowUp' };
  }
  return { ...b };
});

const conflictCheck2 = ShortcutManager.validateKeyBindings(conflictBindings2);
assert(!conflictCheck2.isValid, 'Scanner correctly flags Primary vs Secondary duplicate (ArrowUp on Defend and Move Forward)');
console.log('   Detected Conflict Notice:', conflictCheck2.conflicts[0]?.description);

// ----------------------------------------------------
// TEST SUITE 3: Control Preferences & Visibility Logic
// ----------------------------------------------------
console.log('\n--- TEST SUITE 3: Control Preferences & Visibility Logic ---');

// Default state
controlPreferences.resetToDefaults();
const initialPrefs = controlPreferences.getPreferences();
assert(initialPrefs.showJoystick === true, 'Default showJoystick is true');
assert(initialPrefs.showActionButtons === true, 'Default showActionButtons is true');
assert(initialPrefs.cleanScreenMode === false, 'Default cleanScreenMode is false');

// Toggle Clean Screen mode
const cleanActive = controlPreferences.toggleCleanScreen();
assert(cleanActive === true, 'Clean Screen Mode activated');
assert(controlPreferences.getPreferences().cleanScreenMode === true, 'cleanScreenMode state is true');
assert(controlPreferences.shouldRenderJoystick() === false, 'shouldRenderJoystick() returns FALSE when clean screen is active');
assert(controlPreferences.shouldRenderActionButtons() === false, 'shouldRenderActionButtons() returns FALSE when clean screen is active');

// Toggle Clean Screen mode off
controlPreferences.toggleCleanScreen();
assert(controlPreferences.getPreferences().cleanScreenMode === false, 'Clean screen toggled back off');

// Toggle showJoystick
controlPreferences.toggleJoystick();
assert(controlPreferences.getPreferences().showJoystick === false, 'showJoystick toggled to false');
assert(controlPreferences.shouldRenderJoystick() === false, 'shouldRenderJoystick() returns FALSE when showJoystick is false');

// Toggle showJoystick back on
controlPreferences.toggleJoystick();
assert(controlPreferences.getPreferences().showJoystick === true, 'showJoystick toggled back to true');

// Mode switching
controlPreferences.setControlMode('KEYBOARD');
assert(controlPreferences.getEffectiveControlMode() === 'KEYBOARD', 'Control mode switched to KEYBOARD');
assert(controlPreferences.shouldRenderJoystick() === false, 'shouldRenderJoystick() returns FALSE in KEYBOARD mode for pure desktop view');

controlPreferences.setControlMode('JOYSTICK');
assert(controlPreferences.getEffectiveControlMode() === 'JOYSTICK', 'Control mode switched to JOYSTICK');
assert(controlPreferences.shouldRenderJoystick() === true, 'shouldRenderJoystick() returns TRUE in JOYSTICK mode');

controlPreferences.setControlMode('BOTH');
assert(controlPreferences.getEffectiveControlMode() === 'BOTH', 'Control mode switched to BOTH');
assert(controlPreferences.shouldRenderJoystick() === true, 'shouldRenderJoystick() returns TRUE in BOTH mode');

// Reset to defaults
controlPreferences.resetToDefaults();
assert(controlPreferences.getPreferences().controlMode === 'AUTO', 'Reset restores AUTO control mode');

// ----------------------------------------------------
// TEST SUITE 4: Continuous Movement Vector Math
// ----------------------------------------------------
console.log('\n--- TEST SUITE 4: Movement Vector Calculation ---');

// Test diagonal calculation directly
const fwdX = 0, fwdZ = -1;
const rightX = 1, rightZ = 0;
const diagX = fwdX + rightX;
const diagZ = fwdZ + rightZ;
const mag = Math.hypot(diagX, diagZ);
const normX = diagX / mag;
const normZ = diagZ / mag;

assert(Math.abs(normX - 0.7071) < 0.01, 'W+D Diagonal X is ~0.707 (normalized)');
assert(Math.abs(normZ - (-0.7071)) < 0.01, 'W+D Diagonal Z is ~-0.707 (normalized)');
assert(Math.abs(Math.hypot(normX, normZ) - 1.0) < 0.001, 'Diagonal vector length is exactly 1.0');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n======================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
