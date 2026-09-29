# Realm of Crowns — Migration Status & Inventory

## Overview
Migration from legacy PlayCanvas web runtime to Godot 4.7-based 3D medieval MMO foundation.
All legacy gameplay concepts (Citadel, heroes, factions, animal packs, tactical combat, armies, guilds) are preserved and adapted into the new architecture.

---

## Asset & Code Inventory Categorization

| Item / System | Old Framework Path | Status | Action / Replacement |
|---|---|---|---|
| Core Game Rules & Economy Data | `src/game/economy.ts`, `ECONOMY.md` | KEEP | Adapted to Godot `core/economy/` & `core/economy.gd` |
| Heroes & Citadel Design | `src/game/citadel.ts`, `GAME_DESIGN.md` | KEEP | Integrated into Godot `core/realm_manager.gd`, Citadel overlay, Lord Alistair Commander |
| Animal Pack AI & Hunting Behavior | `src/game/animalSystem.ts` | KEEP | Ported to Godot `core/npc/pack_hunting_ai.gd` & 3D pack kinematics |
| Legacy HTML/Tailwind HUD / Web Canvas | `src/components/`, `src/game/playcanvas/` | ARCHIVE | Replaced by native Godot 4 UI with Kenney CC0 theme |
| Legacy PlayCanvas Scene Scripts | `src/game/playcanvas/scripts/` | ARCHIVE | Preserved in workspace root; inactive in Godot runtime |
| Procedural Ship & Sailing Engine | Elkhan-Isayev/corsairs | ACTIVE | Adapted into `RealmOfCrownsGodot/` |
| 3D Ocean & Water Shader | Corsairs + Godotwind techniques | ACTIVE | Upgraded in `RealmOfCrownsGodot/scenes/ocean/` |
| Medieval Port, Town & Castle Models | Old WebGL primitives / placeholders | REPLACE | Replaced by KayKit Medieval Builder + Kenney Castle/Town GLBs |
| New Godot UI | Legacy React overlays | REPLACE | Implemented in `RealmOfCrownsGodot/scenes/` with Kenney UI Pack |
| Old Ripped / Unclear Web Assets | Temporary scratch / extraction files | REMOVE | Not imported into Godot |

---

## Migration Milestones

- [x] **Phase 1: Environment & Tooling Verification** (Godot 4.7.2 CLI & console verified).
- [x] **Phase 2: Source Code Acquisition** (Corsairs MIT repo downloaded and test suites verified: 10 suites, 1309 assertions passed).
- [x] **Phase 3: Legal CC0 Medieval Asset Acquisition** (KayKit Builder, Kenney Fantasy Town, Kenney Castle, Kenney UI Packs downloaded and extracted).
- [x] **Phase 4: Asset License Manifest Created** (`docs/ASSET_LICENSE_MANIFEST.md`).
- [x] **Phase 5: Godot Project Scaffolding (`RealmOfCrownsGodot/`)** (All 55 core/scene/asset/system/test directories structured).
- [x] **Phase 6: Medieval Environment Replacement & Scene Assembly** (Authentic KayKit and Kenney GLB models for keep, barracks, castle, watchtower, walls, markets, lumbermill, props, terrain).
- [x] **Phase 7: Realm of Crowns System Reconnection** (Citadel state, Hero Commander Lord Alistair, wildlife wolf pack hunting AI, cargo hold, faction diplomacy matrix).
- [x] **Phase 8: Automated Validation & Headless Testing** (12 suites, 1358 checks, 0 failures; smoke scenes verified).
- [x] **Phase 9: Vertical Slice Verification** (`tests/test_vertical_slice_loop.gd` passed all 11 stages end-to-end; Vulkan 1.3 GPU windowed execution verified).
