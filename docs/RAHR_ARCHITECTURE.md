# RAHR Architecture Specification (Phase 2)
**Architecture:** Realm Adaptive Hierarchical Runtime (RAHR)  
**Status:** Phase 2 Complete — Interest Graph & Simulation Scheduler  
**Timestamp:** 2026-09-29  
**Target Environment:** Mobile-First Medieval MMO / RTS 3D Web World (PlayCanvas / WebGL2 / WebGPU)

---

## 1. Executive Summary & Core Invariant

The **Realm Adaptive Hierarchical Runtime (RAHR)** is the foundational performance architecture of *Realm of Crowns*. Its purpose is to unify spatial visibility, graphical LOD, simulation LOD, AI decision fidelity, navigation updates, animation evaluation, and multiplayer Area of Interest (AoI) into a coherent, hierarchical runtime.

### The Authoritative State Invariant
> **CORE RULE:**  
> Entities **always remain in authoritative world state**. RAHR dynamically adapts processing frequency and fidelity—it **never alters whether an entity exists or destroys its state**.

Units maintain their HP, stats, inventory, active destinations, formation slot offsets, and relationships regardless of whether they are simulated at 60Hz (T0) or dormant (T4).

---

## 2. Five-Level Hierarchical Interest System

RAHR replaces naive, flat $O(N)$ entity loops with a 5-level spatial and organizational interest graph that directly reuses the existing procedural terrain patch dimensions:

```
WORLD (Continuous coordinate space)
  └── REGION (128m × 128m - 4×4 terrain patch sectors)
        └── CELL / SECTOR (32m × 32m - exactly aligns with 33×33 terrain patches)
              └── GROUP (Formations, Herds, Settlements, Patrols)
                    └── ENTITY (Hero, Soldiers, Villagers, Wildlife, Raiders)
```

### Hierarchy-First Principle
If a parent spatial container (Region or Cell) or organizational Group is determined to be outside the relevant focus radius, RAHR **rejects the parent container immediately** (`regionsRejected++`, `cellsRejected++`, `groupsRejected++`). Child entities are marked with the appropriate coarse tier in bulk without executing per-entity distance calculations, vector arithmetic, or matrix updates.

Detailed per-entity evaluations run **only** for non-rejected, active entities in close proximity to the player focus (`entitiesDetailedEval`).

---

## 3. Five Simulation Tiers & Hysteresis

| Tier | Name | Target Frequency | Frame Stride | Description & Relevance Envelope |
| :--- | :--- | :--- | :--- | :--- |
| **T0** | **FULL** | **60 Hz** | Stride 1 (Every frame) | Player hero, immediate threats, active combat engagements, units within ≤ 30m. Full AI perception, collision, steering, and articulated animation. |
| **T1** | **REDUCED** | **~20 Hz** | Stride 3 (Time-sliced) | Relevant medium distance (30m – 75m). Throttled AI ticks, smoothed locomotion interpolation, alternating animation evaluations. |
| **T2** | **GROUP** | **~10 Hz** | Stride 6 (Group bucket) | Army formations, animal herds, and patrol squads (75m – 120m). Formations make group decisions via centroid; individual soldiers follow local slot offsets. |
| **T3** | **AGGREGATE** | **~1 Hz** | Stride 60 | Distant statistical & strategic simulation (120m – 170m). Coarse state progression, strategic village production, no per-frame scene graph updates. |
| **T4** | **DORMANT** | **0 Hz** | Freeze CPU ticks | Distant persistent entities (> 170m). Transform recalculations and AI decision loops suppressed; authoritative state preserved in memory. |

### Hysteresis Buffer Gates
To prevent rapid, jarring tier oscillation ("thrashing") when units linger near spatial boundary lines:
- **T0 ↔ T1:** Enter T1 at **> 38m**; return to T0 only at **< 30m** (8m hysteresis gap).
- **T1 ↔ T2:** Enter T2 at **> 75m**; return to T1 only at **< 65m** (10m hysteresis gap).
- **T2 ↔ T3:** Enter T3 at **> 120m**; return to T2 only at **< 105m** (15m hysteresis gap).
- **T3 ↔ T4:** Enter T4 at **> 170m**; return to T3 only at **< 150m** (20m hysteresis gap).

### Critical Overrides
1. **Player Hero:** Permanently locked to **T0_FULL**.
2. **Combat Engagement:** Any entity taking damage or executing an attack is immediately escalated to **T0_FULL** for a minimum of 3.0 seconds (`lastCombatTimestamp`), guaranteeing zero combat disruption.
3. **Projectiles:** Projectiles (arrows, ballistics) always run at full 60Hz.

---

## 4. Time-Sliced, Budget-Aware Scheduler

Rather than running all T1/T2 updates simultaneously every $N$th frame—which creates periodic frame-time spikes—RAHR partitions non-critical entities across stable buckets:

```
Frame F + 0: T0 entities (100%) + T1 Bucket 0 (33%) + T2 Bucket 0 (16%)
Frame F + 1: T0 entities (100%) + T1 Bucket 1 (33%) + T2 Bucket 1 (16%)
Frame F + 2: T0 entities (100%) + T1 Bucket 2 (33%) + T2 Bucket 2 (16%)
```

### Frame Budget Awareness
- **Soft Target:** 12.0 ms maximum simulation time (leaving 4.67 ms for WebGL forward and shadow rendering passes within the 16.67 ms / 60 FPS desktop frame budget).
- **Graceful Deferral:** If unexpected heavy workloads cause simulation to exceed the budget threshold, non-critical T1/T2 updates for remaining bucket units are deferred (`deferredUpdates++`) to the next tick with accumulated delta.
- **Immediate Invariant:** Player inputs, active combat damage applications, and projectile hits are marked immediate and are **never deferred**.

---

## 5. Navigation & Order Preservation

The navigation subsystem (`RahrNavigationManager`) interfaces with tactical squad orders and hero click-to-move:
1. **Authoritative Destination Registry:** Stores all active destinations and paths.
2. **Throttled Path Steering:** Distant units (T1/T2) advance along their heading vector with accumulated delta time without calling expensive per-frame avoidance sweeps against all 30 formation members.
3. **Precision Arrival Detection:** When any unit approaches within **≤ 2.0m** of its target destination, it automatically switches to high-precision arrival evaluation to guarantee crisp stopping on its destination marker.

---

## 6. Animation Evaluation Throttling

While animated character GPU instancing is deferred to later phases (per requirements), RAHR eliminates redundant CPU animation evaluations:
- **T0 Units:** Evaluated every frame (100%).
- **T1 Units:** Evaluated every 2nd frame (`animFrameSkipCounter % 2 === 0`) with accumulated delta, preserving smooth motion while cutting bone/mesh matrix dirtying by 50%.
- **Idle Units:** Stationary units lock to rest pose; redundant `setLocalEulerAngles` calls are suppressed via transition latches (`wasMoving`).
- **T4 Units:** Animation updates completely halted.

---

## 7. Telemetry & Metrics Instrumentation

The `RahrPerformanceMonitor` telemetry pipeline tracks:
- Live entity counts across tiers (`T0`, `T1`, `T2`, `T3`, `T4`)
- Hierarchical rejection metrics (`regionsRejected`, `cellsRejected`, `groupsRejected`, `entitiesDetailedEval`)
- AI update rates (`fullAIUpdatesPerSec`, `reducedAIUpdatesPerSec`, `deferredUpdates`)
- Navigation throughput (`navRequestsPerSec`, `repathsPerSec`, `navUpdatesPerSec`)
- Animation rates (`animEvalsPerFrame`, `animReducedPerFrame`)
- Scheduler overhead (`rahrSchedulerCpuMs`)
