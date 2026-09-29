# Realm of Crowns — Adaptive Input & Control System Walkthrough

## Executive Summary
The **Adaptive Input & Control System** transforms *Realm of Crowns* into a modern, cross-platform medieval RTS and action experience. It bridges **mobile-first touch ergonomics** with **deep desktop browser RTS keyboard & mouse controls** without compromises.

The system addresses the core user requirement: **giving players total control over their input preferences while preventing on-screen joysticks and action buttons from obstructing critical battlefield visuals.**

```
                                 [PLAYER INPUT SOURCES]
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
             [Touch / Joystick]   [Mouse / RTS]   [Keyboard Shortcuts]
                     │                  │                  │
                     │                  ▼                  │
                     │          (Ground Raycasting)        │
                     │          (Left-Click Select)        │
                     │          (Right-Click Order)        │
                     │                                     │
                     └──────────────────┬──────────────────┘
                                        ▼
                           [CENTRAL SHORTCUT DISPATCHER]
                           - Primary / Secondary Resolution
                           - Context Filtering (Chat/Text/UI)
                           - Key Hold vs Single-Fire Filter
                           - Reserved Movement Protection
                                        │
                                        ▼
                      [UNIFIED CONTROLLER / COMMAND PIPELINE]
                      ├─ Hero Movement Controller (WASD / Joystick)
                      ├─ Army Tactical Orders (Q, T, M, F, G, H, X, R, C, P)
                      ├─ Formation Matrices (Z, E, V, B, N, J)
                      └─ Unit Selection Manager (1, 2, 3, 4, 5, Tab)
```

---

## Key Pillars Implemented

### 1. Centralized Single Source of Truth
- **`ShortcutManager` (`src/game/input/shortcutManager.ts`)**: Authoritative central manager controlling all key bindings, active context, hold vector calculation, single-fire dispatch, and conflict validation.
- **`ControlPreferencesManager` (`src/game/input/controlPreferences.ts`)**: Persistent player settings manager (`localStorage`) with reactive subscriptions (`subscribe`) governing visibility and opacity of HUD elements.

### 2. Conflict-Free Keyboard Layout (Zero Duplicate Conflicts)
Movement keys are **strictly reserved** for continuous hero locomotion and will never accidentally trigger combat abilities or army commands.

| Category | Action | Primary | Secondary | Behavior |
| :--- | :--- | :---: | :---: | :--- |
| **Movement** *(Reserved)* | Move Forward | **W** | **↑** | Held for continuous hero movement |
| **Movement** *(Reserved)* | Move Left | **A** | **←** | Held for continuous hero movement |
| **Movement** *(Reserved)* | Move Backward | **S** | **↓** | Held for continuous hero movement |
| **Movement** *(Reserved)* | Move Right | **D** | **→** | Held for continuous hero movement |
| **Army Commands** | Attack | **Q** | — | Single-press; targets hostile or area |
| **Army Commands** | Attack-Move | **T** | — | Advance and engage hostiles in path |
| **Army Commands** | Move Order | **M** | — | Enter ground destination march mode |
| **Army Commands** | Follow | **F** | — | Squad falls into formation behind hero |
| **Army Commands** | Defend | **G** | — | Anchor defensive guard perimeter |
| **Army Commands** | Hold Position | **H** | — | Units maintain slots; engage only in reach |
| **Army Commands** | Stop | **X** | — | Instant halt; cancels active orders |
| **Army Commands** | Retreat | **R** | — | Disengage and sprint to Citadel gates |
| **Army Commands** | Charge | **C** | — | High-speed vanguard shock assault |
| **Army Commands** | Patrol | **P** | — | Waypoint patrol routine |
| **Unit Selection** | Select Hero | **1** | — | Direct player control of Lord Arthurian |
| **Unit Selection** | Select Army | **2** | — | Select entire active army vanguard |
| **Unit Selection** | Select Infantry | **3** | — | Select frontline swordsmen & spearmen |
| **Unit Selection** | Select Archers | **4** | — | Select rear guard bowmen |
| **Unit Selection** | Select Cavalry | **5** | — | Select outrider cavalry |
| **Unit Selection** | Cycle Selection | **Tab** | — | Cycle through available squads |
| **Formations** | Line Formation | **Z** | — | Frontline battle line spread |
| **Formations** | Wedge Formation | **E** | — | Spearhead shock wedge |
| **Formations** | Column Formation | **V** | — | Rapid road march column |
| **Formations** | Box Formation | **B** | — | 360° defensive perimeter |
| **Formations** | Circle Formation | **N** | — | Protective ring formation |
| **Formations** | Defensive Formation | **J** | — | Shield wall defense |
| **Camera & UI** | Zoom In | **+** | Mouse Wheel | Camera distance decrease |
| **Camera & UI** | Zoom Out | **-** | Mouse Wheel | Camera distance increase |
| **Camera & UI** | Cancel / Back | **Esc** | — | Cancel move beacon / close active modal |
| **Camera & UI** | Controls Help | **F1** | — | Toggle in-game cheatsheet overlay |
| **Camera & UI** | Controls Settings | **F2** | — | Toggle full preferences & remapping |
| **Camera & UI** | Clean Screen | **F10** | — | Toggle clean battlefield mode |

### 3. Primary vs. Secondary Binding System
- **Primary**: Default/main key for an action (e.g. `W` for Move Forward, `Q` for Attack).
- **Secondary**: Alternate key triggering the **exact same action** (e.g. `↑` for Move Forward).
- **Conflict Validation Engine**: Evaluates `Primary vs Primary`, `Primary vs Secondary`, and `Secondary vs Secondary` across all 31 actions. If a player attempts to assign a key already bound to another action, a **Conflict Modal** warns the player and provides `[Replace Existing]` or `[Cancel]`.

### 4. Clean Screen & Adaptive Joystick Visibility
- When `cleanScreenMode = true` or `showJoystick = false`, the virtual joystick is **completely removed from the DOM** (`renderJoystick ? <div .../> : <div className="pointer-events-none"/>`), guaranteeing **zero touch interception** and restoring 100% of the screen area for camera and RTS commands.
- Toggled instantly via the HUD button `◉ Controls` or keyboard shortcut `F10`.
- Control size (`small`, `medium`, `large`) and opacity sliders (`joystickOpacity`, `buttonOpacity`) adapt smoothly to player preference.

### 5. Context Filtering & Text Input Suppression
- Centralized check in `ShortcutManager` detects active `<input>`, `<textarea>`, `<select>`, or `contenteditable` elements.
- Typing `w`, `a`, `s`, `d`, `q`, etc., into chat, rename boxes, or search bars **never** moves the hero or issues accidental military commands.

---

## Visual Verification & Artifacts

### 1. Full Tactical HUD with Quick Controls
The top-left hero panel features quick access to `◉ Controls (F10)`, `Settings (F2)`, and `Help (F1)`, positioned cleanly above the telemetry display.
![Full Tactical HUD](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_01_full_hud.png)

### 2. Control Preferences Settings Modal
Allows players to seamlessly switch between `AUTO`, `JOYSTICK`, `KEYBOARD`, and `BOTH` without restarting the game. Includes toggles for joystick visibility, action buttons, Clean Screen mode, Compact HUD, and live opacity sliders.
![Control Preferences Modal](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_02_controls_settings.png)

### 3. Authoritative Dynamic Keyboard Reference Table
Generated dynamically from the central `ShortcutManager` bindings. Features collapsible categories, distinct `[Reserved]` badges for WASD/Arrows, and interactive `[Change Primary]`, `[Change Alt]`, and `[Reset]` controls.
![Dynamic Keyboard Reference Table](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_03_keyboard_reference_table.png)

### 4. Quick In-Game Help Overlay (F1)
Lightweight, floating RTS cheatsheet accessible instantly with `F1` or the HUD `Help` button. Dismissible via `Esc`, close button, or pressing `F1` again.
![Quick F1 Cheatsheet](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_04_quick_f1_overlay.png)

### 5. Clean Screen Battlefield View (F10)
Activating Clean Screen mode completely unmounts the virtual joystick, action buttons, and order bar from the DOM. Floating banner confirms `CLEAN SCREEN: ON (F10)` while leaving hero vitals, raid status, and the entire 3D battlefield unobstructed.
![Clean Screen Mode](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_05_clean_screen_mode.png)

### 6. Continuous WASD Movement & Single-Fire Command Feedback
Pressing `W` continuously moves the hero along the citadel pathway. Pressing `Q` executes an attack order with an animated gold feedback badge `ATTACK ORDER (Q)`.
![WASD Movement & Attack Feedback](file:///C:/Users/gerec.brewer/.gemini/antigravity-ide/brain/3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890/adaptive_06_wasd_movement_and_feedback.png)

---

## Test Results & Verification

### 1. Automated Unit & Integration Suite (`test/test_adaptive_controls.ts`)
Executed with `npx tsx test/test_adaptive_controls.ts`:
- **53 passed, 0 failed**.
- Verified zero duplicate bindings in default table.
- Verified all 8 reserved movement keys (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `ArrowUp`, `ArrowLeft`, `ArrowDown`, `ArrowRight`) are exclusively bound to movement.
- Verified automatic conflict scanner correctly catches primary-primary and primary-secondary duplicates.
- Verified continuous hold movement vector normalization (e.g. diagonal $W+D$ normalized to length $1.0$).
- Verified control preferences visibility logic across all modes (`AUTO`, `KEYBOARD`, `JOYSTICK`, `BOTH`).

### 2. End-to-End Browser Verification (`test/test_adaptive_controls_e2e.mjs`)
Executed via Puppeteer in headless mobile-first environment:
- Verified navigation to Tactical Battle Arena.
- Verified opening and closing Controls Settings modal (`F2`).
- Verified opening and closing Quick Help overlay (`F1` / `Escape`).
- Verified Clean Screen mode (`F10`) completely removes the joystick DOM element (`REMOVED (Clean)`).
- Verified controls restoration via `F10`.
- Verified hero movement via `KeyW` and tactical command dispatch via `KeyQ`.
- Verified command feedback badge rendering.
- Exit code 0, zero errors.

---

## Summary of Completed Files

1. **`src/game/input/inputTypes.ts`**: Core interfaces, enums (`InputAction`, `InputContext`, `ControlMode`), and binding schemas.
2. **`src/game/input/controlPreferences.ts`**: Persistent settings manager with reactive subscriptions and DOM rendering predicates.
3. **`src/game/input/shortcutManager.ts`**: Central authoritative shortcut dispatcher, default key bindings, validation engine, hold movement vector calculation, and text field suppression.
4. **`src/components/ui/ControlsSettingsModal.tsx`**: High-polish preferences and dynamic keyboard reference modal with category accordion and conflict dialog.
5. **`src/components/ui/QuickHelpOverlay.tsx`**: Lightweight in-game `F1` RTS cheatsheet.
6. **`src/components/ui/MobileCombatHUD.tsx`**: Adaptive rendering for joystick and buttons, quick controls header bar, and floating command feedback banner.
7. **`src/components/ui/PerformanceOverlay.tsx`**: Adjusted positioning to sit cleanly beneath quick controls without overlap.
8. **`src/game/playcanvas/PlayCanvasApp.ts`**: Integrated with `shortcutManager.getMovementVector()` and `shortcutManager.onAction(...)`.
9. **`src/components/TacticalView.tsx` & `src/App.tsx`**: Unified top-level modal orchestration with centralized shortcut subscriptions.
10. **`test/test_adaptive_controls.ts` & `test/test_adaptive_controls_e2e.mjs`**: Full automated verification suites.
