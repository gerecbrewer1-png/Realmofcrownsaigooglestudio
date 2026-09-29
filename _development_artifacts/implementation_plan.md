# Realm of Crowns — Hero Citadel Controls & Animal Pack Hunting Implementation Plan

## Overview
This update addresses two critical player experience and gameplay systems in *Realm of Crowns*:
1. **Hero Citadel Controls & Navigation**:
   - Fix hero spawn orientation so Lord Arthurian spawns facing into the majestic Citadel plaza, courtyard fountain, and Great Keep (facing North, -Z), rather than staring into the South palisade wall.
   - Implement responsive **Click-to-Move** navigation for the hero (both Left-Click and Right-Click on ground) with interactive destination beacons, smooth pathing, and instant manual override via WASD/touch joystick.
   - Add `<canvas tabIndex={0}>` and click-to-focus so keyboard input is captured immediately without requiring manual window clicks.
2. **Wildlife Pack Hunting & Animal Combat**:
   - Upgrade wildlife simulation to feature a coordinated **Timber Wolf Pack** (Alpha + Stalkers) with shared hunting perception, howling/rallying, encircling flanking maneuvers, biting lunges with damage and cooldowns, and prey/intruder targeting (hunting deer and defending against bandit raiders).
   - Add biting attack animations, hit flashes, and death reactions to `PlayCanvasAnimal`.
   - Award loot drops when wolves bring down prey or when wild beasts are slain.

---

## User Review Required

> [!IMPORTANT]
> **Adaptive Controls Seamless Coexistence**:
> Click-to-move for the hero seamlessly complements WASD/Arrow keys and the on-screen touch joystick:
> - Clicking the ground sets a navigation destination and displays an amber beacon.
> - Pressing any WASD key or moving the joystick instantly overrides and cancels the click destination for tactile manual control.
> - Right-clicking with the Hero selected moves the Hero; right-clicking with Squad selected moves the Squad. Left-clicking the ground moves whichever entity is selected.

> [!NOTE]
> **Emergent Wildlife AI**:
> The Timber Wolf pack hunts deer naturally in the northern forests, but will also attack intruding bandit raiders who enter their territory, creating living 3-way emergent wilderness conflicts!

---

## Open Questions

None. The existing entity-component architecture and PlayCanvas systems provide all required hooks.

---

## Proposed Changes

```
/src/
├── game/
│   ├── heroes/
│   │   └── heroController.ts           # [MODIFY] Click-to-Move targetDestination, issueMoveTo, smooth pathing
│   ├── npc/
│   │   └── animalSystem.ts             # [MODIFY] Wolf Pack AI, encircling flank math, biting attacks & damage
│   ├── playcanvas/
│   │   ├── PlayCanvasApp.ts            # [MODIFY] Spawn rotation (facing North), hero click-to-move, animal combat sync
│   │   ├── PlayCanvasAnimal.ts         # [MODIFY] Attack lunge animation, hit flash, death tilt, Alpha visual scaling
│   │   └── PlayCanvasBattleCanvas.tsx  # [MODIFY] tabIndex={0} and canvas click-focus for instant keyboard response
/test/
└── test_graphics_gameplay_enhancements.ts # [MODIFY] Add automated tests for hero Click-to-Move & wolf pack coordination
```

---

### Component 1: Hero Citadel Movement & Facing

#### [MODIFY] [heroController.ts](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/heroes/heroController.ts)
- Add `public targetDestination: { x: number; z: number } | null = null;`.
- Add `public issueMoveTo(x: number, z: number): void { this.targetDestination = { x, z }; }`.
- In `setPlayerInput(vx, vy)`: if `Math.hypot(vx, vy) > 0.05`, clear `this.targetDestination = null;` so keyboard/joystick immediately cancels destination movement.
- In `updatePlayerMovement(delta)`:
  - If manual directional input `inputLen > 0.08`, follow input and set `targetDestination = null`.
  - Else if `this.targetDestination`:
    - Calculate `dx = this.targetDestination.x - this.profile.position.x; dz = this.targetDestination.z - this.profile.position.z;`
    - Calculate distance `dist = Math.hypot(dx, dz);`
    - If `dist > 0.4`:
      - Direction `dirX = dx / dist; dirZ = dz / dist;`
      - Speed = `this.profile.moveSpeed;`
      - Advance position by `dirX * speed * delta` and `dirZ * speed * delta`.
      - Set velocity to `{ x: dirX * speed, y: 0, z: dirZ * speed }`.
      - Rotate hero smoothly to face movement direction `targetAngle = Math.atan2(dirX, dirZ)` with angular interpolation.
      - Set animation state to `'Running_A'`.
    - Else (arrived at destination):
      - Clear `this.targetDestination = null`.
      - Set velocity to zero and animation state to `'Idle'`.

#### [MODIFY] [PlayCanvasApp.ts](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/playcanvas/PlayCanvasApp.ts)
- **Spawn Orientation**:
  - In constructor: initialize `HeroController` with `rotationY: Math.PI` (180 degrees) instead of `0`.
  - Hero now spawns facing North directly toward the Central Fountain (Z=0), Keep Portcullis (Z=-10), and Great Keep (Z=-18), rather than facing the South palisade wall (Z=32).
- **Click-to-Move Mouse Controls**:
  - In `handlePointerClick(e)`:
    - If `this.selectedEntity === 'hero'`, call `this.heroController.issueMoveTo(groundHit.x, groundHit.z)` and `this.showDestinationMarker(groundHit.x, groundHit.z)`.
  - In `handleRightClick(e)`:
    - If `this.selectedEntity === 'hero'`, call `this.heroController.issueMoveTo(groundHit.x, groundHit.z)` and `this.showDestinationMarker(groundHit.x, groundHit.z)`.
    - If `this.selectedEntity === 'squad'`, keep squad move command.
- **Update Loop Sync**:
  - In `onUpdate`:
    - When no keyboard key is pressed and joystick is inactive, only call `heroController.setPlayerInput(0, 0)` if `!this.heroController.targetDestination`, preserving active click-to-move pathing.
    - Check if hero reached `targetDestination`; if so, disable `destinationMarkerEntity`.

#### [MODIFY] [PlayCanvasBattleCanvas.tsx](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/playcanvas/PlayCanvasBattleCanvas.tsx)
- Add `tabIndex={0}` to `<canvas>`.
- Add `onClick={(e) => e.currentTarget.focus()}` and autofocus on mount so keyboard events (WASD / Arrows / Q / M) are immediately captured upon loading or clicking the game screen.

---

### Component 2: Animal Pack Hunting & Combat System

#### [MODIFY] [animalSystem.ts](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/npc/animalSystem.ts)
- **Combat & Pack Attributes**:
  - Extend `AnimalEntity` with:
    ```typescript
    attackDamage: number;
    attackRange: number;
    attackCooldown: number;
    attackTimer: number;
    targetVictimId: string | null;
    packId?: string;
    isAlpha?: boolean;
    flankAngleOffset?: number;
    attackTriggered?: boolean;
    ```
- **Fauna Population**:
  - Replace single wolf with a coordinated **Timber Wolf Pack**:
    - `animal_wolf_alpha`: "Timber Wolf Alpha", HP 95, Damage 28, Speed 5.4, Range 1.8, Scale 1.25x, Pack Leader.
    - `animal_wolf_stalker_1`: "Wolf Stalker", HP 60, Damage 20, Speed 5.2, Range 1.6, Flank Offset +45°.
    - `animal_wolf_stalker_2`: "Wolf Stalker", HP 60, Damage 20, Speed 5.2, Range 1.6, Flank Offset -45°.
  - Forest Deer:
    - `animal_deer_1` ("Forest Stag", HP 45, Speed 4.8)
    - `animal_deer_2` ("Wild Doe", HP 40, Speed 4.8)
  - Razor Boars:
    - `animal_boar_1` ("Razor Boar", HP 75, Damage 18, Speed 3.4, counter-attacks if provoked).
- **Pack Perception & Flanking AI**:
  - If any wolf in a pack spots prey (deer) within 20m or a hostile raider within 14m:
    - Sets pack alert: propagates target ID and coordinates to all pack members.
    - Stalkers calculate flanking offset position using polar coordinates:
      `targetX = prey.x + Math.cos(baseAngle + flankAngleOffset) * surroundDist`
      `targetZ = prey.z + Math.sin(baseAngle + flankAngleOffset) * surroundDist`
    - Creates an encircling pack formation closing in on the prey from 3 angles!
- **Attack & Damage Dealing**:
  - When distance to victim is `<= attackRange` and `attackTimer <= 0`:
    - Victim takes damage (`victim.health -= animal.attackDamage`).
    - Reset `attackTimer = attackCooldown`.
    - Mark `attackTriggered = true` for animation sync.
    - If victim dies (`health <= 0`):
      - Clear target, pack howls/feeds (`state = 'idle'`), and resumes roaming.
      - Trigger loot drop callback.

#### [MODIFY] [PlayCanvasAnimal.ts](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/playcanvas/PlayCanvasAnimal.ts)
- **Alpha Wolf Visuals**:
  - Check if `id.includes('alpha')`: apply 1.25x scale, darker fur material, and subtle golden eye points.
- **Combat Animations**:
  - `triggerAttack()`:
    - Quick forward pounce and snapping head bob (`attackAnimTimer = 0.35s`), pitching body forward by -15° and snapping back.
  - `triggerHitFlash()`:
    - Red emissive flash (`hitFlashTimer = 0.18s`).
  - `triggerDeath()`:
    - Tumble onto side (`setLocalEulerAngles(-90, 0, 0)`) and disable locomotion.

#### [MODIFY] [PlayCanvasApp.ts](file:///c:/Users/library/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/game/playcanvas/PlayCanvasApp.ts)
- In the animal update loop:
  - If `animal.attackTriggered`: call `aVis.triggerAttack()`, play bite sound, and reset flag.
  - If animal dies: call `aVis.triggerDeath()`.
  - If prey dies: spawn loot drop (`lootSystem.spawnLoot('gold', x, z)`).

---

## Verification Plan

### Automated Tests
1. **TypeScript Build**:
   ```bash
   cmd.exe /c "npx tsc --noEmit"
   ```
   Verify 0 compilation errors across all modules.

2. **Gameplay & Pack Hunting Automated Tests**:
   Add test suite to `test/test_graphics_gameplay_enhancements.ts`:
   - Verify `HeroController.issueMoveTo()` moves the hero toward destination and stops at destination.
   - Verify manual input clears `targetDestination`.
   - Verify initial hero rotation is facing North (-Z).
   - Verify Wolf Pack contains Alpha and Stalkers.
   - Verify Pack sharing target and encircling coordinates.
   - Verify Wolf attack deals damage and triggers cooldown.
   ```bash
   cmd.exe /c "npx tsx test/test_graphics_gameplay_enhancements.ts"
   ```

### Manual & Interactive Verification
- Check hero facing at game start: hero faces North toward fountain and Keep.
- Left-click and right-click in Citadel courtyard: hero moves smoothly with running animation to clicked point, beacon shows and clears on arrival.
- Press WASD / Arrow keys: hero immediately responds and overrides click destination.
- Observe Northern Forest: Timber Wolf Alpha and Stalkers coordinate, encircle deer prey, lunge in biting attacks, slay deer, and drop loot.
