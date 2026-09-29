# Realm of Crowns — World Map 3D Assets (Phase 1)

This document catalogs the real 3D model assets imported and integrated into the Realm of Crowns World Map terrain system during Phase 1.

## 1. Asset Pack Overview

* **Asset Pack:** KayKit Medieval Hexagon Pack (v1.0)
* **Creator / Author:** Kay Lousberg ([kaylousberg.com](https://kaylousberg.com))
* **Source Repository:** [GitHub: KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)
* **License:** CC0 1.0 Universal (Public Domain Dedication) — Free for commercial and non-commercial use without attribution required (though credited here).
* **Format:** Standalone binary GLTF (`.glb`), optimized and bundled with embedded texture atlas.
* **Storage Location:** `/public/assets/world/`

---

## 2. Imported Assets & Usage Map

### Base Terrain Tiles (`/public/assets/world/terrain/`)
| File | Model Source | Intended Use in World Map |
| :--- | :--- | :--- |
| `hex_grass.glb` | `tiles/base/hex_grass.gltf` | Primary green hex ground for plains, meadowlands, and forest floors. Seamless edge-to-edge hex alignment. |
| `hex_grass_sloped_low.glb` | `tiles/base/hex_grass_sloped_low.gltf` | Gentle elevation transitions between plains and foothills. |
| `hex_grass_sloped_high.glb` | `tiles/base/hex_grass_sloped_high.gltf` | Steep elevation ramps connecting low valleys to mountain plateaus. |

### Water & Rivers (`/public/assets/world/water/`)
| File | Model Source | Intended Use in World Map |
| :--- | :--- | :--- |
| `hex_water.glb` | `tiles/base/hex_water.gltf` | Recessed water hex basin for lakes, bays, and open ocean. Natural shoreline depth. |
| `hex_coast_A.glb` | `tiles/coast/hex_coast_A.gltf` | Coastal shoreline transition tiles connecting grass to open water. |
| `hex_coast_B.glb` | `tiles/coast/hex_coast_B.gltf` | Curved coastal shoreline transition tiles. |
| `hex_river_straight.glb` | `tiles/rivers/hex_river_A.gltf` | Straight river waterway channels flowing through valleys. |
| `hex_river_curve.glb` | `tiles/rivers/hex_river_B.gltf` | Curved natural river bends meandering through the landscape. |
| `hex_river_crossing.glb` | `tiles/rivers/hex_river_crossing.gltf` | River fords and crossings for overland travel paths. |

### Roads & Travel Routes (`/public/assets/world/roads/`)
| File | Model Source | Intended Use in World Map |
| :--- | :--- | :--- |
| `hex_road_straight.glb` | `tiles/roads/hex_road_A.gltf` | Straight dirt roads connecting settlements, resource outposts, and citadels. |
| `hex_road_curve.glb` | `tiles/roads/hex_road_B.gltf` | Curved roadway sections following natural terrain elevation lines. |
| `hex_road_intersection.glb` | `tiles/roads/hex_road_C.gltf` | 3-way crossroads and highway junctions. |
| `hex_road_end.glb` | `tiles/roads/hex_road_D.gltf` | Terminal roadway trailheads at isolated mines and camps. |

### Nature, Mountains & Forests (`/public/assets/world/nature/`)
| File | Model Source | Intended Use in World Map |
| :--- | :--- | :--- |
| `hill_single_A.glb` | `decoration/nature/hill_single_A.gltf` | Low rolling knolls and mounds on open plains. |
| `hills_A.glb` | `decoration/nature/hills_A.gltf` | Clustered rolling grassy hills providing natural topography. |
| `hills_B.glb` | `decoration/nature/hills_B.gltf` | Alternate hill formation for visual diversity. |
| `hills_trees.glb` | `decoration/nature/hills_A_trees.gltf` | Wooded hills forming transitional forest borders. |
| `mountain_A.glb` | `decoration/nature/mountain_A.gltf` | Tall granite mountain peak with rocky cliff faces. |
| `mountain_B.glb` | `decoration/nature/mountain_B.gltf` | Rugged mountain ridge crag. |
| `mountain_C.glb` | `decoration/nature/mountain_C.gltf` | Weathered alpine summit. |
| `mountain_grass.glb` | `decoration/nature/mountain_A_grass.gltf` | Highland mountain peak with grassy alpine meadows. |
| `trees_large.glb` | `decoration/nature/trees_A_large.gltf` | Dense old-growth forest cluster covering forest hex tiles. |
| `trees_medium.glb` | `decoration/nature/trees_A_medium.gltf` | Woodland groves for standard forest biome tiles. |
| `trees_small.glb` | `decoration/nature/trees_A_small.gltf` | Copse of trees on forest outskirts and riverbanks. |
| `tree_single_A.glb` | `decoration/nature/tree_single_A.gltf` | Lone deciduous tree placed organically on plains. |
| `tree_single_B.glb` | `decoration/nature/tree_single_B.gltf` | Lone conifer tree placed near highland borders. |
| `rock_single_A.glb` | `decoration/nature/rock_single_A.gltf` | Granite boulder scattered near cliffs and quarry zones. |
| `rock_single_B.glb` | `decoration/nature/rock_single_B.gltf` | Weathered stone boulder on riverbanks and hillsides. |
| `rock_single_C.glb` | `decoration/nature/rock_single_C.gltf` | Craggy rock cluster in mountain passes. |

---

## 3. Technical Integration Details

* **Hex Coordinate Scale:** `HEX_SIZE = 24`. The KayKit models have a unit hexagon width of 2.0 flat-to-flat, resulting in an exact mathematical scaling factor of:
  $$\text{Scale} = \frac{\text{HEX\_SIZE} \times \sqrt{3}}{2} \approx 20.7846$$
  This ensures seamless 0-gap tile matching across all six axial directions ($q, r$).
* **Material Batching:** All 29 models share the unified `hexagons_medieval` texture atlas, allowing high-performance GPU batching via `THREE.InstancedMesh`.
* **Draw Call Target:** Rendering the entire 1,500+ tile realm requires under 15 draw calls, sustaining 60 FPS across desktop and mobile devices.
* **Atmosphere:** Distant horizon fog is set far beyond playable realm boundaries ($>550$ units), ensuring the grassy, hilly medieval terrain is 100% crisp, saturated, and un-obscured.
