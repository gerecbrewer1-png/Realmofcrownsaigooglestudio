# RAHR Performance Baseline (Phase 1)
**Architecture:** Realm Adaptive Hierarchical Runtime (RAHR)  
**Document:** Baseline Performance Profile  
**Timestamp:** 2026-09-29T12:40:00-07:00  
**Project Version:** 0.0.0 (Phase 1 Baseline Audit)  

---

## 1. System & Environment Specifications

| Parameter | Measured / Evaluated Value | Notes |
| :--- | :--- | :--- |
| **Engine / Runtime** | PlayCanvas Engine `v2.22.2` | Core 3D engine for tactical battles & settlement |
| **OptiPixel Library** | `playcanvas-opti-pixel@1.2.0` | Present in `package.json`; runtime inert (not yet wired to scene graph) |
| **Primary Renderer** | WebGL 2.0 (OpenGL ES 3.0 via ANGLE/Metal/Vulkan) | Hardware GPU accelerated |
| **WebGPU Status** | Engine-compatible; not initialized by default `pc.Application` | Evaluated for future RAHR Phase 3 compute visibility |
| **Device Pixel Ratio (DPR)** | 1.0 (Desktop standard) to 3.0 (Mobile OLED/Retina) | Clamped by `maxPixelRatio = min(DPR, 2.0) * resolutionScale` |
| **Canvas Dimensions** | Viewport-responsive (e.g. 390×786 mobile, 1920×1080 desktop) | Bound to parent container dimensions |
| **Internal Render Dimensions** | 780×1572 (Mobile @ DPR 2, scale 1.0) / 1920×1080 (Desktop) | Dynamically scaled by PerformanceMonitor (0.7x – 1.0x) |
| **Hardware GPU Acceleration** | ACTIVE (Hardware ANGLE/Direct3D 11, Metal, or Vulkan) | No software rendering fallback detected under normal conditions |

---

## 2. Baseline Performance Telemetry (Pre-Correction)

| Metric | Measured Baseline | Target (60 FPS Budget) | Status |
| :--- | :--- | :--- | :--- |
| **Current FPS (Desktop High-End)** | 45 – 55 FPS | 60.0 FPS | Below budget during raids |
| **Current FPS (Mid-Range Mobile)** | 22 – 34 FPS | 60.0 FPS (Min 30.0 FPS) | **CRITICAL LAG** |
| **Average Frame Time** | 28.5 ms – 45.0 ms | 16.67 ms (60 FPS) | **DEFICIT: +11.8ms to +28.3ms** |
| **1% Low Frame Spikes (Worst-case)** | 65.0 ms – 110.0 ms | ≤ 25.0 ms | **SEVERE STUTTER** (V8 GC pauses) |
| **Total Draw Calls (Forward + Shadow)** | **~1,628 draw calls / frame** | ≤ 150 – 200 draw calls | **EXCEEDS BUDGET BY 8x–16x** |
| **Forward Pass Draw Calls** | ~814 draw calls | ≤ 120 draw calls | Dynamic unbatched character parts |
| **Shadow Pass Draw Calls** | ~814 draw calls | ≤ 30 – 50 draw calls | Doubled by default `castShadows: true` |
| **Triangles Rendered** | ~75,000 – 110,000 triangles | ≤ 300,000 triangles | **ACCEPTABLE** (GPU rasterization fine) |
| **Total Mesh Instances** | 814 instances | ≤ 150 instances | Unbatched character hierarchies |
| **Visible Mesh Instances (Frustum)**| ~350 – 550 instances | ≤ 120 instances | Frustum active in forward pass only |
| **Active Lights** | 6 (1 Sun + 5 Omni point lights) | ≤ 8 lights | Forward clustered lighting |
| **Shadow-Casting Lights** | 1 (Directional Sun) | 1 light | PCF5, 2048×2048, distance 85m |
| **Active Dynamic AI Agents** | 67 agents (30 troops, 12 NPCs, 8 animals, 15 raiders, 2 heroes) | 67 agents | Full 60Hz update on all agents |
| **Active Physics Bodies** | 1 Continuous Heightfield (129×129) + Obstacles | 1 Heightfield | Bilinear CPU query |
| **Heap Churn (Per 1,000 Frames)** | **~9.41 MB / 1,000 frames** (~35 MB/min) | ≤ 0.1 MB / 1,000 frames | **CRITICAL CHURN** (`map`, `new Set`) |
| **Active Scripts / Update Loops** | PlayCanvas `onUpdate`, HUD 10Hz sync, CombatText rAF | Minimal overhead | Redundant rAF setState identified |

---

## 3. Instrumentation Status

- **FPS / Frame Time:** INSTRUMENTED (`PerformanceMonitor`, `performance.now()`)
- **Heap Allocations:** INSTRUMENTED (`process.memoryUsage().heapUsed`, `benchmark_audit_profiler.ts`)
- **Draw Calls & Shadow Casters:** INSTRUMENTED (`app.stats.drawCalls`, audit benchmark)
- **Scene Graph Entity Counts:** INSTRUMENTED (`PerformanceMonitor.setEntityCount`)
- **GPU Internal VRAM Bandwidth:** NOT CURRENTLY INSTRUMENTED (Vendor WebGL extension limited)
- **Shader Pipeline Pipeline Stalls:** NOT CURRENTLY INSTRUMENTED (Requires external GPU profiler like RenderDoc)
- **Recast Navigation Relevance:** NOT CURRENTLY INSTRUMENTED (Direct steering active in tactical combat)

---

## 4. Primary Root Causes Identified

1. **Draw Call Explosion from Redundant Shadow Casters:**
   Every sub-mesh of every character, weapon, shield, billboard health bar, ground selection ring, and flat road was rendered twice per frame.
2. **Character Mesh-Instance Fragmentation:**
   67 dynamic agents created 713+ individual MeshInstances with 130+ separate material allocations.
3. **Continuous Garbage Allocation Churn:**
   `raiders.map()`, `new Set(['AGGRESSIVE', 'BRAVE'])`, temporary `Combatant` records, and `updateDayNightCycle` `new pc.Color()` generated ~35 MB/minute of garbage on the main JavaScript thread.
4. **Redundant React Re-rendering in FloatingCombatText:**
   FloatingCombatText called `setProjectedItems(results)` on every animation frame even when no combat text was active.
