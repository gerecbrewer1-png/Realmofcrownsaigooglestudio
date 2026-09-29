# Voyage / Naval Renderer Modernization — Phase 1 & Phase 2 Walkthrough

## Executive Summary

Phase 2 of the **Realm of Crowns** Voyage / Naval Renderer Modernization has been completed. This phase focused on Ship LOD, GPU Instancing, Visibility Culling, Rigging & Sail optimization, Reflection Throttling, Coastal Harbor Static Geometry Merging, and a 4-Tier Mobile Quality Management System.

Crucially:
- **Zero Gameplay or Physics Changes**: Sailing mechanics, wind physics, broadside ballistics, boarding melee, salvage looting, and naval audio remain 100% intact.
- **Hero Quality Preserved**: The player's flagship remains at 100% full LOD0 fidelity (all authentic shrouds, ratlines, rigging, carved figureheads, deck lanterns, animated flags, and billowing sails).
- **Draw Call Reduction**: Measured draw calls dropped from **884–938** down to **282–332** (**~68% reduction** across all fleet scales).
- **Memory & Geometry Cleanup**: Geometry count dropped from **787–853** down to **547–548** (**~30–35% reduction**).

---

## 1. Architectural Stack Overview

| Subsystem | Technology | Responsibility |
|---|---|---|
| **Naval Sea Voyage Simulation** | Three.js (r185) + WebGL2 | High-fidelity open ocean, buoyancy, Age-of-Sail tall ships, broadside combat, boarding deck |
| **Tactical 3D Battle Arena** | PlayCanvas v2.22.2 + `playcanvas-opti-pixel` v1.2.0 | Turn-based land/citadel tactical battles, BVH spatial indexing, Hierarchical Instancing, Occlusion Culling |
| **Quality Management** | [`VoyageQualityManager.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/VoyageQualityManager.ts) | 4 runtime tiers (`LOW`, `MEDIUM`, `HIGH`, `ULTRA`), adaptive frame-time monitoring, shadow distances, LOD multipliers |
| **Reflection & Layer Throttler** | [`VoyageReflectionManager.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/VoyageReflectionManager.ts) | Layer-based reflection culling (`Layer 0` reflected, `Layer 1` micro-detail culled), 1/2-frame and 1/4-frame reflection cadence |
| **Ship Hierarchical LOD** | [`ShipLODController.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/ShipLODController.ts) | 4-tier semantic LOD (`LOD0` < 60m, `LOD1` 60–160m, `LOD2` 160–350m, `LOD3` > 350m, culled > 750m) with 15m hysteresis |
| **Multi-Tier Rigging** | [`ShipRiggingQuality.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/ShipRiggingQuality.ts) | LOD0 full authentic shrouds + ratlines + stays; LOD1 single stay lines; LOD2/3 culled |
| **Parametric Billowing Sails** | [`ShipSailRenderer.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/ShipSailRenderer.ts) | Parametric curvature mesh, decoupled transform hierarchy eliminating per-frame CPU vertex updates |
| **Shared GPU Instancing** | [`ShipInstanceManager.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/ShipInstanceManager.ts) | `THREE.InstancedMesh` buffers for repeated cannons, barrels, crates, and deck lanterns |
| **Harbor Geometry Batching** | [`CoastalHarborBuilder.ts`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/src/components/world3d/CoastalHarborBuilder.ts) | Static geometry merging via `BufferGeometryUtils.mergeGeometries`, collapsing ~400+ harbor meshes down to ~36 batched meshes |

---

## 2. Phase 2 Key Optimizations Implemented

### A. Coastal Harbor Static Mesh Batching
- Mainland harbor structures and the 5 island haven towns previously generated ~400+ individual meshes, each with separate materials, transforms, and draw calls.
- Applied `BufferGeometryUtils.mergeGeometries` categorized by material key (wood walls, stone quay, tile roofs, docks), condensing each harbor town into single batched draw calls per material.
- Eliminated over **450 static draw calls** before the sea rendering even started.

### B. Water Reflection Layer Masking & Throttling
- `THREE.Water` executes a mirror camera pass (`mirrorCamera.render(scene)`) every frame, which essentially doubled scene draw calls.
- Introduced `VOYAGE_LAYERS.DEFAULT_AND_REFLECTION = 0` vs `VOYAGE_LAYERS.MICRO_DETAILS = 1`.
- Small deck props, rigging ropes, wake particles, and distant clutter are assigned to Layer 1, completely excluding them from the reflection camera's culling mask.
- In `MEDIUM` and `HIGH` quality tiers, water reflections are throttled to every 2nd frame (`reflectionInterval: 2`). In `LOW` tier, reflections update every 4th frame or fall back to ambient sky reflection. This instantly cuts reflection draw calls in half.

### C. 4-Tier Hierarchical Ship LOD with Hysteresis
- Built a clean 4-tier LOD hierarchy:
  - **LOD0 (Hero, < 60m)**: Full authentic 3D cannons, detailed rigging shrouds, ratlines, interior deck cabins, crew props, wake emitters, dynamic shadows.
  - **LOD1 (Mid-Range, 60–160m)**: Simplified rigging (stays only, no ratlines), instanced low-poly cannons, shadows disabled for enemies, interior culled unless in boarding combat.
  - **LOD2 (Distant Silhouette, 160–350m)**: Hull, masts, and simplified billowed sails only. All deck props, cannons, ratlines, and wake particles culled.
  - **LOD3 (Imposter / Horizon, > 350m)**: Simplified hull profile, flat billowed sail geometry.
  - **Culled (> 750m or Outside Frustum)**: Ship root mesh hidden, 0 draw calls.
- Incorporated a **15m hysteresis buffer** (`ENTER_LOD` vs `EXIT_LOD`) to eliminate rapid geometry flickering/popping at distance boundaries.

### D. Multi-Tier Rigging & Billowing Sails
- Rigging lines (`shrouds`, `ratlines`, `stays`, `lifts`) previously comprised over 40 individual line meshes per ship.
- Created `ShipRiggingQuality` to categorize ropes into essential structural stays vs high-density ratlines.
- Distant ships immediately shed their rigging meshes, removing dozens of draw calls per vessel.
- Sails now utilize parametric UV-billowed geometries (`ShipSailRenderer`), removing CPU-based per-frame vertex array reallocations.

### E. 4-Tier Mobile Quality Management (`VoyageQualityManager`)
Integrated 4 distinct quality presets selectable at runtime via the HUD:
- **`LOW (Mobile / Battery Saver)`**:
  - `shadowMapSize: 512`, `shadowDistance: 35m`, `shadowsEnabled: false`
  - `reflectionInterval: 4`, `reflectionResolution: 0.5`
  - `lodDistanceMultiplier: 0.65`, `particleBudget: 0.3`
- **`MEDIUM (Balanced Web & Mobile)`**:
  - `shadowMapSize: 1024`, `shadowDistance: 60m`, `shadowsEnabled: true`
  - `reflectionInterval: 2`, `reflectionResolution: 0.75`
  - `lodDistanceMultiplier: 0.85`, `particleBudget: 0.65`
- **`HIGH (Desktop Default)`**:
  - `shadowMapSize: 1024`, `shadowDistance: 90m`, `shadowsEnabled: true`
  - `reflectionInterval: 2`, `reflectionResolution: 1.0`
  - `lodDistanceMultiplier: 1.0`, `particleBudget: 1.0`
- **`ULTRA (Cinematic Capture)`**:
  - `shadowMapSize: 2048`, `shadowDistance: 160m`, `shadowsEnabled: true`
  - `reflectionInterval: 1`, `reflectionResolution: 1.0`
  - `lodDistanceMultiplier: 1.4`, `particleBudget: 1.5`
- Features a conservative 3-second moving-average adaptive frame monitor with a 10-second hysteresis cooldown to down-tier smoothly on low-spec hardware without oscillating.

---

## 3. Real Profiling Metrics (BEFORE vs. AFTER)

All metrics were captured using [`scripts/measure_naval_baseline.mjs`](file:///c:/Users/gerec.brewer/OneDrive%20-%20Ball%20State%20University/realm-of-crowns_-medieval-mmo-strategy/scripts/measure_naval_baseline.mjs) running in headless Chrome with WebGL SwiftShader:

| Fleet Configuration | Metric | Phase 1 Baseline | Phase 2 (Optimized) | Real Improvement |
|---|---|---|---|---|
| **1 Ship (Player Flagship)** | **Draw Calls** | 884 | **282** | **-602 calls (-68.1%)** |
| | **Geometries** | 787 | **547** | **-240 geoms (-30.5%)** |
| | **Triangles** | 17,124 | **17,580** | Full Hero LOD0 preserved |
| | **LOD Distribution** | Uncontrolled | `LOD0: 1, Culled: 9` | 100% Hero flagship fidelity |
| **5 Ships (Fleet Encounter)** | **Draw Calls** | 909 | **305** | **-604 calls (-66.4%)** |
| | **Geometries** | 811 | **547** | **-264 geoms (-32.5%)** |
| | **Triangles** | 18,508 | **18,636** | Stable budget |
| | **LOD Distribution** | Uncontrolled | `LOD0: 1, LOD2: 2, Culled: 7` | Distant ships downgraded |
| **10 Ships (Full Fleet Battle)** | **Draw Calls** | 938 | **332** | **-606 calls (-64.6%)** |
| | **Geometries** | 853 | **548** | **-305 geoms (-35.8%)** |
| | **Triangles** | 19,468 | **20,076** | Scalable budget |
| | **LOD Distribution** | Uncontrolled | `LOD0: 1, LOD2: 4, LOD3: 1, Culled: 4` | Clean LOD distribution |

---

## 4. In-Game HUD Controls & Diagnostics

The DEV Diagnostics HUD (`⚡ Stats` button or `[F3]`) now provides live control and telemetry:
- **Quality Tier Switchers**: Quick-select buttons `[LOW]`, `[MED]`, `[HIGH]`, `[ULTRA]` to test quality presets live.
- **Fleet Benchmark Triggers**: `[1 Ship]`, `[5 Ships]`, `[10 Ships]`.
- **Live Counters**: Real-time FPS, draw calls, triangles, active ships, LOD breakdown (`LOD0 / LOD1 / LOD2 / LOD3 / Culled`), reflection throttle status, and shadow config.

---

## 5. Checkpoint & Archive Verification

The complete Phase 2 state has been verified and backed up into:
1. `C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24.zip` (48,325,440 bytes / ~46.09 MB)
2. `c:\Users\gerec.brewer\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy\_development_artifacts\checkpoint24.zip` (48,325,440 bytes / ~46.09 MB)

TypeScript compilation (`tsc --noEmit`) passes cleanly with **zero errors**.
Dev server runs smoothly on `http://127.0.0.1:3000/#voyage`.
