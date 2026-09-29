# Realm of Crowns — Asset Attribution & Licensing Manifest

This document records the provenance, licenses, and acquisition statuses of all 3D models, textures, audio, and visual assets used in **Realm of Crowns**.

---

## 1. Asset Integration Architecture

All 3D models and environments are resolved via the central **Asset Pipeline**:
- `src/assetPipeline/assetManifest.ts`: Canonical asset specifications, LOD levels, bounding boxes, and metadata.
- `src/assetPipeline/assetRegistry.ts`: Logical aliases to canonical manifest keys with fallback support.
- `src/components/world3d/medievalTextures.ts`: Procedural PBR texture generation (CanvasTexture) for stone masonry, timber grain, terracotta/slate roofing, thatch, and class heraldic banners.
- `src/components/world3d/medievalBuildingArchitect.ts`: Multi-component medieval architectural complexes.
- `src/components/world3d/heroModels.ts`: Procedural 3D hero class models.

---

## 2. 3D Mesh Assets & Pipeline Targets

| Asset Key / Alias | Category | Expected Path / Location | Source / Author | License | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `building_castle_core` | Building | `/assets/buildings/defense/castle_keep.glb` | Quaternius Medieval Strategy Pack | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Fallback provides multi-tiered keep with level 1-6 progression, machicolations, and banner poles. |
| `building_farm_core` | Building | `/assets/buildings/resource/farm_windmill.glb` | Quaternius / Kenney Medieval Kit | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Procedural fallback includes wheat field rows, timber barn, and rotating lattice sail windmill. |
| `building_lumber_core` | Building | `/assets/buildings/resource/lumber_mill.glb` | Quaternius / Poly Haven | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Procedural fallback includes A-frame sawmill, log pyramids, and chopping block with axe. |
| `building_quarry_core` | Building | `/assets/buildings/resource/stone_quarry.glb` | Quaternius / Poly Haven | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Procedural fallback includes stepped bedrock cliff, derrick crane hoist, and mining cart. |
| `building_barracks_core` | Building | `/assets/buildings/military/barracks_hall.glb` | Quaternius Medieval Strategy Pack | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Procedural fallback includes garrison hall, enclosed combat training yard, dummy, and weapon racks. |
| `building_hospital_core` | Building | `/assets/buildings/houses/infirmary_sanctuary.glb` | Quaternius / Kenney | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Half-timbered building with blue healer cross banner and medicinal herb garden. |
| `building_academy_core` | Building | `/assets/buildings/houses/academy_observatory.glb` | Quaternius / Poly Haven | CC0 (Public Domain) | Pipeline Integrated (Procedural fallback active) | Classical basilica with copper dome and rotating armillary sphere. |
| `hero_warlord` | Character | `/assets/characters/warlord_heavy_armor.glb` | Quaternius / Mixamo | CC0 / Permissive | Procedural 3D Model Active | Iron plate armor, horned crest helmet, broadsword, heraldic shield, crimson cape. |
| `hero_guardian` | Character | `/assets/characters/guardian_bastion.glb` | Quaternius / Mixamo | CC0 / Permissive | Procedural 3D Model Active | Sun-crest gilded plate armor, winged visor, massive tower shield, golden lance. |
| `hero_ranger` | Character | `/assets/characters/ranger_scout.glb` | Quaternius / Mixamo | CC0 / Permissive | Procedural 3D Model Active | Forest-green hooded mantle, leather doublet, recurve bow, quiver of arrows. |
| `hero_steward` | Character | `/assets/characters/steward_treasurer.glb` | Quaternius / Mixamo | CC0 / Permissive | Procedural 3D Model Active | Sovereign merchant robes, golden medallion, royal ledger, realm keys. |
| `hero_strategist` | Character | `/assets/characters/strategist_tactician.glb` | Quaternius / Mixamo | CC0 / Permissive | Procedural 3D Model Active | High commander helmet, tactical standard, royal mantle, star insignia. |

*Note: For GLB assets marked "Pipeline Integrated (Procedural fallback active)", the loading pipeline is fully wired in `AssetRegistry` and `AssetManifest`. When physical GLB files are placed in `/public/assets/...`, the engine automatically hot-loads the GLBs; otherwise, it seamlessly renders the high-craft procedural 3D architectural bundles without missing mesh errors.*

---

## 3. Procedural PBR Textures & Materials

| Texture Name | File Generator | Visual Characteristics | License |
| :--- | :--- | :--- | :--- |
| Mortared Ashlar Stone | `src/components/world3d/medievalTextures.ts` | High-res brick coursing, chiseled bevels, mortar joints, roughness noise | MIT / Proprietary to Realm of Crowns |
| Aged Timber Planks | `src/components/world3d/medievalTextures.ts` | Dark oak wood grain, curved grain lines, nail studs, plank shadow seams | MIT / Proprietary to Realm of Crowns |
| Terracotta & Slate Roof Tiles | `src/components/world3d/medievalTextures.ts` | Scalloped / rectangular shingle rows with vertical shadow gradients | MIT / Proprietary to Realm of Crowns |
| Golden Straw Thatch | `src/components/world3d/medievalTextures.ts` | Dense vertical straw fibers, multi-tone yellow/brown, layered overhangs | MIT / Proprietary to Realm of Crowns |
| River Rock Cobblestone | `src/components/world3d/medievalTextures.ts` | Irregular rounded river stones with dirt grouting and specular highlights | MIT / Proprietary to Realm of Crowns |
| Woven Heraldic Silk Banners | `src/components/world3d/medievalTextures.ts` | Class-specific heraldic shields (Lion, Sun, Bow, Scale, Star), gold fringe | MIT / Proprietary to Realm of Crowns |

---

## 4. Audio Synthesis & Sound Effects

All sound effects (horns, chimes, button clicks, martial fanfares) are procedurally generated in real time using the browser's native **Web Audio API** via `src/audio/soundEngine.ts`. No copyrighted external MP3/WAV samples are required, guaranteeing zero licensing friction and zero download latency.
