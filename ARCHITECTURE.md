# Realm of Crowns — Architecture Specification
## Phase 2.7 Revised MMO Architecture & Verification

---

## 1. High-Level Architecture Overview

Realm of Crowns follows a **Server-Authoritative Multi-Tier Architecture** with decoupled spatial partitioning, dual 3D graphics engines, and mobile-first MMO scaling:

```
WORLD
  │
SERVER AUTHORITY (Express + Firestore Persistence)
  │
SPATIAL WORLD PARTITION (World -> Region -> Zone -> Cell -> Entities)
  │
AREA OF INTEREST (AOI Multi-Factor Relevance + 50m Hysteresis + 150m Prefetch Band)
  │
NETWORK LOD (NET0: 30Hz, NET1: 15Hz, NET2: 5Hz, NET3: 1Hz, NET4: 0.2Hz, NET5: Culled)
  │
CLIENT ENTITY SET (Density-Budgeted Active Working Set <= 128 Entities)
  │
SIMULATION LOD (SIM0: 60Hz, SIM1: 30Hz, SIM2: 10Hz, SIM3: 2Hz, SIM4: Coarse)
  │
VISUAL LOD (LOD0 Hero Flagship, LOD1 Near, LOD2 Fleet, LOD3 Horizon Culling)
  │
RENDERER (Three.js for Voyage/World/Citadel; PlayCanvas for Tactical Battles)
  │
GPU (Hardware Accelerated WebGL2 Context)
```

---

## 2. Critical Dual-Renderer Boundary Audit

The codebase incorporates two industry-standard 3D WebGL2 engines, partitioned strictly by gameplay domain:

| Domain / View | Renderer Engine | Canvas Component | Viewport Ownership & Lifecycle |
|---|---|---|---|
| **Naval Sea Voyage** | **Three.js (`^0.185.1`)** | `NavalSeaCanvas.tsx` | Exclusive 3D ocean, tall ships, dynamic planar water reflections, archipelago islands, broadside cannons. |
| **Tactical Battles** | **PlayCanvas (`^2.22.2`)** | `PlayCanvasBattleCanvas.tsx` | Exclusive 3D battlefield arena, hero abilities, army formations, wolf packs, combat VFX. |
| **Strategic World Map** | **Three.js (`^0.185.1`)** | `World3DCanvas.tsx` | Hexagonal terrain mesh, procedural biomes, march routing, resource nodes, barbarian encampments. |
| **Living Citadel** | **Three.js (`^0.185.1`)** | `Kingdom3DCanvas.tsx` | Citadel buildings, castle keep, moat ripples, hero third-person locomotion, environmental life. |
| **Port Haven Walk** | **Three.js (`^0.185.1`)** | `PortHavenCanvas.tsx` | Walkable colonial ports, taverns, governor mansions, shipyards. |

### Verified Dual-Renderer Questionnaire
1. **Which engine renders the main world?** Three.js (`World3DCanvas.tsx` / `Kingdom3DCanvas.tsx`).
2. **Which engine renders Voyage?** Three.js exclusively (`NavalSeaCanvas.tsx`).
3. **Which engine renders ships?** Three.js (`ShipInstanceManager.ts`, `ShipSailRenderer.ts`, `ShipRiggingQuality.ts`).
4. **Which engine renders the ocean?** Three.js custom shader plane with normal maps and mirror planar reflections (`VoyageReflectionManager.ts`).
5. **Which engine renders tactical battles?** PlayCanvas exclusively (`PlayCanvasBattleCanvas.tsx` / `PlayCanvasApp.ts`).
6. **Are PlayCanvas and Three.js simultaneously rendering Voyage?** **NO**. Voyage is 100% Three.js. PlayCanvas is not mounted or rendered during Voyage.
7. **Are multiple requestAnimationFrame loops running?** **NO during normal gameplay**. React conditional tab rendering (`currentTab`) unmounts inactive canvases, destroying their renderers and canceling animation frame loops.
8. **Are multiple GPU contexts active simultaneously?** **NO**. Exactly one WebGL2 context is active on the DOM at a time.
9. **Are the same assets loaded by both engines?** **NO**. Three.js uses `THREE.GLTFLoader` and procedural geometries; PlayCanvas uses `pc.Application.assets` and procedural meshes.
10. **Are ship transforms copied between engines every frame?** **NO**. Ships exist exclusively in Three.js.
11. **Are hidden/inactive renderers still updating?** **NO**. React unmount lifecycle triggers `.destroy()` or `cancelAnimationFrame()` and `.dispose()`.
12. **Is React triggering unnecessary renderer work?** **NO**. Render loops execute directly in `requestAnimationFrame`; status updates to React are throttled to 10 FPS (100ms).

---

## 3. Server Authority vs Client Simulation

| Subsystem | Authority Classification | Implementation Location | Notes |
|---|---|---|---|
| **Account & Identity** | SERVER AUTHORITATIVE | `src/server/services/playerService.ts` | Firebase Auth UID verification |
| **Gem Economy & Ledgers** | SERVER AUTHORITATIVE | `src/server/services/ledgerService.ts` | Atomic double-entry transaction ledgers |
| **Kingdom Buildings & Queues**| SERVER AUTHORITATIVE | `src/server/services/kingdomService.ts` | Upgrade costs, build times, instant gems |
| **Resource Production** | SERVER AUTHORITATIVE | `src/server/services/kingdomService.ts` | Passive accrual calculated on server |
| **Inventory & Speedups** | SERVER AUTHORITATIVE | `src/server/services/inventoryService.ts`| Ownership validation & atomic item consumption |
| **Quests & Rewards** | SERVER AUTHORITATIVE | `src/server/services/questService.ts` | Criteria validation & double-claim guards |
| **Troops & Military Training**| SERVER AUTHORITATIVE | `src/server/services/kingdomService.ts` | Training queues, hospital healing |
| **World Map Marches** | SERVER AUTHORITATIVE | `src/server/services/worldService.ts` | Hex routing, barbarian battle outcomes |
| **Commanders & Talents** | SERVER AUTHORITATIVE | `server.ts` (`/api/commander/*`) | Talent points, levels, court assignments |
| **Naval Voyage Transforms** | CLIENT SIMULATED | `NavalSeaCanvas.tsx` | Transient high-frequency Euler integration |
| **Naval Broadside Combat** | CLIENT SIMULATED | `NavalSeaCanvas.tsx` | Ballistic arcs & local raycast collision |
| **Pirate & NPC Ship AI** | CLIENT SIMULATED | `VoyageSimulationLOD.ts` & `VoyageFleetManager.ts` | Sim0-Sim4 behavior state machines |

---

## 4. MMO World Model & Spatial Partitioning

Hierarchy:
`WORLD` (e.g. Archipelago) -> `REGION` (5000m x 5000m) -> `ZONE` (1000m x 1000m) -> `CELL` (150m Grid) -> `ENTITIES`

### Spatial Query Architecture
- Employs a zero-allocation 2D Uniform Spatial Hash Grid (`VoyageSpatialGrid.ts` / `MMOWorldPartition.ts`).
- Candidate entities within the prefetch band are queried in **O(1)** time using integer cell bucket lookups:
  `cellX = Math.floor(x / 150)`, `cellZ = Math.floor(z / 150)`.
- Eliminates $O(N^2)$ exhaustive distance checks across thousands of global entities.

### Separation of Concerns (Part 12)
1. **WORLD EXISTENCE:** Authoritative state on server/world partition.
2. **SERVER SIMULATION:** Coarse/strategic tick when unobserved; promoted when players enter.
3. **NETWORK RELEVANCE:** Area of Interest filtering determines which entities replicate to client.
4. **CLIENT SIMULATION:** Simulation LOD (`SIM0-SIM4`) allocates CPU cycles on client.
5. **VISUAL RENDERING:** Visual LOD (`LOD0-LOD3`) and frustum culling allocate GPU cycles.

A ship culled from rendering still exists and updates physics. A ship outside a player's AOI still exists authoritatively in the world.

---

## 5. Area of Interest (AOI), Hysteresis & Network LOD

### Multi-Factor Relevance Scoring
Relevance is **NOT** purely distance-based:
- **Base Distance**: Linear attenuation up to prefetch boundary.
- **Incoming Cannonball Threat**: `+250 priority` (Always immediate).
- **Target or Attacker Entity**: `+180 priority`.
- **Active Combat Engagement**: `+100 priority`.
- **Quest Target Entity**: `+60 priority`.
- **Fleet / Allied Formation**: `+40 priority`.

### AOI Hysteresis & Prefetch Band
- **Enter Active AOI**: Distance $\le 450\text{ m}$.
- **Leave Active AOI**: Distance $> 500\text{ m}$ ($50\text{ m}$ hysteresis band prevents flapping/churn).
- **Outer Prefetch Band**: $450\text{ m} \text{ to } 600\text{ m}$. Introduces entity metadata and preloads 3D assets before entry into active combat/visual range.

### Network LOD Tiers

| Tier | Name | Target Replication Rate | Description |
|---|---|---|---|
| **NET0** | `CRITICAL_REALTIME` | 30.0 Hz | Player hero, current target, incoming projectiles, close combat (<120m). |
| **NET1** | `NEAR_INTERACTIVE` | 15.0 Hz | Nearby players, hostile pirates, maneuvering fleets (<250m). |
| **NET2** | `LOCAL_VISIBLE` | 5.0 Hz | Visible regional ships within visual sight (<450m). |
| **NET3** | `DISTANT_HORIZON` | 1.0 Hz | Horizon vessels, distant fleet members (<800m). |
| **NET4** | `STRATEGIC` | 0.2 Hz | Sector state updates, world events (<2000m). |
| **NET5** | `IRRELEVANT` | 0.0 Hz | Culled from network replication; no realtime packets sent. |

### Density Budget Capping (Mobile Protection)
- Client active replication is capped at 128 entities maximum, with high-rate (`NET0` + `NET1`) capped at 48 entities.
- In dense 200+ player battles, entities are sorted by relevance score: top-priority vessels receive high update rates, while background vessels gracefully throttle down to `NET2/NET3` rather than freezing or disconnecting.

---

## 6. Network Delta Encoding & Client Interpolation

- **Compact Delta Serialization**: Transmits quantized fixed-point coordinates (`x, z`), 1-byte quantized heading (`0..255`), speed knots, health, and bitmask state flags. Static configurations (mesh IDs, ship classes, faction colors) are sent only once upon entry.
- **Client Interpolation Engine (`ClientEntityInterpolator`)**: Maintains a timestamped ring buffer of received snapshots and performs smooth Hermite/linear interpolation with angular shortest-path slerp, accompanied by dead-reckoning extrapolation during packet delay.

---

## 7. Future Procedural Structures (Phase 4 Ready)

- **Procedural Ship Config (`ProceduralShipConfig`)**: Compact definition containing `definitionId`, `seed`, `culture`, `shipClass`, `hullConfiguration`, `sailConfiguration`, `primaryColor`, `secondaryColor`, `faction`, and `damageState`.
- **Procedural Building Config (`ProceduralBuildingConfig`)**: Compact definition containing `definitionId`, `seed`, `culture`, `historicalPeriod`, `function`, `ownership`, `upgradeState`, and `damageState`.
- **Zero Raw Geometry Transmitted**: Procedural systems generate 3D meshes deterministically from seeds on the client.
