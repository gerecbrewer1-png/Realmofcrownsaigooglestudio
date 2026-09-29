# Realm of Crowns — Asset License Manifest

This document records the licensing, provenance, creator, commercial use permissions, and import paths for all assets in the Godot-based foundation. In strict compliance with project rules, no ripped, proprietary, or non-commercial assets are permitted.

---

## Asset Records

### 1. Corsairs Core Foundation & Procedural World Systems
- **Asset**: Corsairs (Wind of Freedom) Engine Core, Procedural Ship Generators, Open Sea, Naval Combat, Boarding, Port Towns, Day/Night, and RPG Simulation Core
- **Source**: GitHub (`Elkhan-Isayev/corsairs`)
- **URL**: https://github.com/Elkhan-Isayev/corsairs
- **Creator**: Elkhan Isayev
- **License**: MIT License
- **Commercial Use**: Permitted
- **Attribution Required**: Yes (Preserved in license header and documentation)
- **Imported Location**: `RealmOfCrownsGodot/core/`, `RealmOfCrownsGodot/scenes/`, `RealmOfCrownsGodot/scripts/`, `RealmOfCrownsGodot/systems/`
- **Conversion Performed**: Adapted into Realm of Crowns architecture and naming; integrated with medieval MMO systems, citadel, heroes, guilds, armies, and modular environment replacement.
- **Notes**: High-performance procedural ship geometry generator, 3D ocean simulation, sea battle, harbor mode, and deterministic unit-tested core.

---

### 2. KayKit Medieval Builder Pack
- **Asset**: KayKit Medieval Builder Pack v1.0 (Buildings, Walls, Towers, Gates, Castle Pieces, Market, Lumbermill, Watermill, Windmill, Details, Trees, Rocks)
- **Source**: OpenGameArt.org / Kay Lousberg
- **URL**: https://opengameart.org/content/kaykit-medieval-builder-pack-10
- **Creator**: Kay Lousberg (https://kaylousberg.com/)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **Commercial Use**: Permitted
- **Attribution Required**: No (Provided as good practice)
- **Imported Location**: `RealmOfCrownsGodot/assets/buildings/`, `RealmOfCrownsGodot/assets/castles/`, `RealmOfCrownsGodot/assets/vegetation/`, `RealmOfCrownsGodot/assets/props/`
- **Conversion Performed**: Extracted native GLTF/GLB models, configured collision shapes, calibrated pivot/origin, standard PBR materials for Godot 4.
- **Notes**: CC0 modular building and fortification set.

---

### 3. Kenney Fantasy Town Kit
- **Asset**: Kenney Fantasy Town Kit v2.0 (Modular fantasy/medieval buildings, roofs, chimneys, doors, market stalls, docks, props, lanterns)
- **Source**: Kenney.nl
- **URL**: https://kenney.nl/assets/fantasy-town-kit
- **Creator**: Kenney (Kenney Vleugels - https://kenney.nl/)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **Commercial Use**: Permitted
- **Attribution Required**: No (Provided as good practice)
- **Imported Location**: `RealmOfCrownsGodot/assets/villages/`, `RealmOfCrownsGodot/assets/ports/`, `RealmOfCrownsGodot/assets/markets/`
- **Conversion Performed**: Native GLB assets imported into Godot 4, material assignment, static body colliders configured.
- **Notes**: Perfect for bustling medieval port towns and coastal settlements.

---

### 4. Kenney Castle Kit
- **Asset**: Kenney Castle Kit v1.0 (Castle walls, battlements, bastions, towers, gates, stone arches, citadels)
- **Source**: Kenney.nl
- **URL**: https://kenney.nl/assets/castle-kit
- **Creator**: Kenney (Kenney Vleugels - https://kenney.nl/)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **Commercial Use**: Permitted
- **Attribution Required**: No (Provided as good practice)
- **Imported Location**: `RealmOfCrownsGodot/assets/castles/`, `RealmOfCrownsGodot/assets/citadel/`
- **Conversion Performed**: Native GLB assets imported into Godot 4, modular grid alignment, collision generation.
- **Notes**: Foundation for the Realm of Crowns Citadel and siege fortification system.

---

### 5. Kenney UI Pack & RPG Expansion
- **Asset**: Kenney UI Pack + UI Pack RPG Expansion (Buttons, panels, parchment backgrounds, health/stamina bars, compass, minimap frames, item slots, equipment frames, weapon/armor icons)
- **Source**: Kenney.nl
- **URL**: https://kenney.nl/assets/ui-pack & https://kenney.nl/assets/ui-pack-rpg-expansion
- **Creator**: Kenney (Kenney Vleugels - https://kenney.nl/)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **Commercial Use**: Permitted
- **Attribution Required**: No (Provided as good practice)
- **Imported Location**: `RealmOfCrownsGodot/assets/ui/`, `RealmOfCrownsGodot/assets/icons/`
- **Conversion Performed**: Imported high-DPI 2D PNG sprites, slices configured for Godot 4 NinePatchRect, custom Theme resource generated.
- **Notes**: Clean, modular UI presentation layer independent of game logic.

---

## Prohibited Asset Verification
- [x] No ripped assets from Voyage Century Online (VCO).
- [x] No ripped assets from Sea Dogs / Pirates of the Caribbean (Akella).
- [x] No extracted World of Warcraft or Black Desert assets.
- [x] All 3D models and textures are verified CC0 or MIT licenses with explicit commercial use permission.
