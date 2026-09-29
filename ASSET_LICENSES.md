# Realm of Crowns — 3D Asset Licenses & Attribution Ledger

This document tracks all external 3D models, textures, animations, and audio assets utilized within **Realm of Crowns**, ensuring strict compliance with open-source and permissive licensing standards.

---

## 1. KayKit Medieval Hexagon & Settlement Assets
* **Author**: Kay Lousberg (KayKit)
* **Website**: https://kaykit.itch.io/
* **License**: Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)
* **Commercial Use**: Permitted
* **Attribution Requirement**: Optional (Credited out of appreciation)
* **Assets Included**:
  - `hex_grass.glb`: Base hexagonal meadowland tile
  - `hex_grass_sloped_low.glb`, `hex_grass_sloped_high.glb`: Elevation transitions
  - `hex_water.glb`, `hex_coast_A.glb`, `hex_coast_B.glb`: Marine & coastal waters
  - `hex_road_straight.glb`, `hex_road_curve.glb`, `hex_road_intersection.glb`: Paved trade thoroughfares
  - `gate.glb`, `keep.glb`, `house.glb`, `windmill.glb`, `barracks.glb`, `archeryrange.glb`: Citadel & village architecture
  - `trees_large.glb`, `trees_medium.glb`, `trees_small.glb`, `tree_single_A.glb`: Woodland foliage
  - `mountain_A.glb`, `mountain_B.glb`, `mountain_C.glb`, `hills_A.glb`: Topography & summits
  - `rock_single_A.glb`, `rock_single_B.glb`, `rock_single_C.glb`: Geological props
  - `tent.glb`, `weaponrack.glb`, `target.glb`, `crate.glb`: Camp & settlement props

---

## 2. Quaternius Medieval Animated Heroes & Troops
* **Author**: Quaternius
* **Website**: https://quaternius.com/
* **License**: Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)
* **Commercial Use**: Permitted
* **Attribution Requirement**: Optional (Credited out of appreciation)
* **Assets Included**:
  - `warlord.glb`: Armored vanguard commander with two-handed sword & shield
  - `guardian.glb`: Heavy defensive knight with tower shield & polearm
  - `ranger.glb`: Reconnaissance archer with longbow & leather armor
  - `strategist.glb`: Tactical officer with banner & ceremonial blade
  - `steward.glb`: Royal magistrate & civil administrator
  - Embedded Rigged Skeletal Animations:
    - `Idle`, `Walking_A`, `Running_A`, `1H_Melee_Attack_Chop`, `1H_Melee_Attack_Slice_Diagonal`, `2H_Melee_Attack_Chop`, `Cheer`, `Death_A`, `Hit_A`

---

## 3. Procedural Wildlife & Character Models
* **Source**: In-engine procedural geometry generator (`PlayCanvasAnimal.ts`, `PlayCanvasCharacter.ts`, `TacticalSceneBuilder.ts`)
* **License**: MIT (Realm of Crowns codebase)
* **Assets Included**:
  - Forest Stag, Wild Doe, Razor Boar, Grey Wolf with articulated limbs, antlers, and tusks.
  - Medieval settlement structures: Well plaza, Blacksmith forge, Sawmill, Wheat field, Archery targets.
  - 100% procedural low-poly geometry optimized for mobile performance, with dynamic walk cycles and combat animations.

---

## 4. Audio & Music
* **Source**: Procedural Real-Time Web Audio API Synthesizer (`/src/audio/soundEngine.ts`)
* **License**: MIT (Realm of Crowns codebase)
* **Dependencies**: Zero external commercial audio assets or licensed mp3 files. All sound effects (swords clashing, horns, arrows, footsteps) and medieval acoustic melodies are dynamically generated via oscillators and noise buffers.

---

## 5. Kenney Medieval Town, Port & Castle Assets
* **Author**: Kenney (Kenney.nl)
* **Website**: https://kenney.nl/assets/
* **License**: Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)
* **Commercial Use**: Permitted without restriction
* **Attribution Requirement**: Optional (Credited out of appreciation)
* **Assets Included**:
  - Medieval stone arches, breakwater pillars, aqueduct structures, docks, seawalls, timber timbered townhouses, and citadel battlements used for coastal harbors and sea-port views.

---

## 6. Maritime Visuals, Water Shader & Heraldry
* **Three.js Ocean Water Shader (`three/examples/jsm/objects/Water.js`)**:
  - **Author**: mrdoob and Three.js contributors
  - **License**: MIT License (https://github.com/mrdoob/three.js)
  - **Usage**: Real-time normal-mapped specular reflection, wave perturbation, and Fresnel deep-water rendering.
* **Procedural Sail Heraldry & Ensigns (`SailHeraldryService.ts`)**:
  - **License**: MIT (Realm of Crowns codebase)
  - **Assets**: Dynamic canvas textures for Jolly Roger pirate flags (skull & cutlasses), Spanish Cross of Burgundy, French Fleur-de-lis, Dutch Princevlag, English St. George, Sovereign Royal Crown, and weathered ship planking. Zero external copyrighted images used.

---

## 7. Engine & Middleware
* **PlayCanvas Engine**: MIT License (https://github.com/playcanvas/engine)
* **Three.js**: MIT License (https://github.com/mrdoob/three.js)
* **React & Vite**: MIT License

