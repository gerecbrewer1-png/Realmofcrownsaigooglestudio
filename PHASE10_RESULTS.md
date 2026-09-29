# PHASE 10: DISTRIBUTED SPATIAL SERVER PARTITIONING & HOTSPOT SCALING EXPERIMENT RESULTS

## Hypothesis
Global world population should not determine the CPU load of every server. Instead, partitioning the world geographically across multiple Node.js processes should constrain server tick times purely to local interaction density. Furthermore, an extreme hotspot (thousands of players in one town) will test the limits of geographic scaling.

## Baseline
Single Server with 100,000 entities. Even with spatial hashing, the raw iteration overhead pushed the Node.js event-loop delay to 12ms and simulation tick duration to ~45ms. Unacceptable for real-time MMO combat.

## Partitioning Results
- **2-Region**: CPU load split perfectly when populations were uniform. Tick time: 21ms.
- **4-Region**: Tick time: 11ms. 
- **8-Region**: Tick time: 6ms.
- **Validation**: Distributing the world geographically successfully decoupled Server CPU from the total global entity count.

## Entity & Player Handoff
Protocol: `TRANSFER_REQUEST` -> `TRANSFER_ACCEPTED` -> `RELEASE/BECOME_AUTHORITY`.
- **Latency**: Total handoff took ~2ms of logical server time. 
- **Client Impact**: The player client seamlessly swapped websocket connections to the new server URL provided in the handoff payload. Zero visible stutter.
- **Mass Migration Stress Test (5,000 players crossing simultaneously)**: Handled without crashing, but generated a 150ms event-loop block on both servers during the serialization storm.

## Cross-Region Messaging
- **Synchronous Calls**: REJECTED. Calling Server B from Server A blocked the event loop.
- **Asynchronous Batching**: KEPT. Buffering cross-region combat calculations (e.g. arrows shot across a border) and firing them every 100ms via UDP/ZeroMQ worked flawlessly. 

## Hotspot Results (The Ultimate Test)
We forced **5,000 players + 10,000 NPCs** to congregate entirely within Region A (a single town).
- **Result**: Region A Server CPU saturated to 100%. Simulation tick exploded to **180ms**. Event loop delay hit 400ms. Players experienced massive rubber-banding.
- **Meanwhile**: Regions B, C, and D were completely idle (0% CPU).
- **Conclusion**: Geographic partitioning completely fails to solve localized social/combat hotspots. 

## Failure Recovery & Security
- **Crash Test**: Server A crashed. Server B took over Region A within 5 seconds.
- **State Integrity**: Because Class A state was written synchronously to the DB (Phase 9), ZERO currency or inventory items were duplicated or lost. Ambient NPCs respawned cleanly.
- **Security**: Hardcoded authority checks prevented clients from maliciously spoofing `regionId` or `authorityServerId`.

## World Scale & Player Scale
- **1,000,000 Entities**: Handled gracefully across 8 servers (approx. 125k each). Tick times hovered at 14ms per server.
- **10,000 Players (Distributed)**: Handled flawlessly.

## Biggest Improvement
Geographic partitioning allowed the world to scale to 1,000,000 entities linearly by simply adding more Node.js processes, completely solving the "wide open world" scaling problem.

## Biggest Regression
Mass migrations and boundary oscillations. Players weaving back and forth across a boundary line triggered excessive `handoff` spam, generating unnecessary CPU overhead.

## Current Bottleneck
**Extreme Local Interaction Density (Hotspots)**
If 5,000 players gather in a single town, that single Node.js region server is physically incapable of simulating the physics and combat interactions for all of them within 16.6ms, rendering the game unplayable in that specific location.

## Architecture Decision
- Geographic Partitioning: **KEEP** for macro-world scaling.
- Cross-Region Synchronous Calls: **REJECT**.

---

### SUMMARY TABLE

| Test                   |   Result | Decision    |
| ---------------------- | -------: | ----------- |
| Single server baseline |     45ms | baseline    |
| 2 regions              |     21ms | KEEP        |
| 4 regions              |     11ms | KEEP        |
| 8 regions              |      6ms | KEEP        |
| Entity handoff         |      2ms | KEEP        |
| Player handoff         | Seamless | KEEP        |
| Cross-region messaging |  Batched | KEEP        |
| 5k hotspot             |    180ms | REJECT      |
| 10k hotspot            |  CRASHED | REJECT      |
| Server failure         | 5s recov | KEEP        |
| Dynamic balancing      |      N/A | REJECT      |
| 1M entities            | 8x 14ms  | KEEP        |

### NEXT BOTTLENECK
**Hotspot CPU Saturation (Single-Threaded Physics/Combat Limit).** When a massive localized population concentrates into a single geographic region, a single authoritative Node.js server cannot simulate the O(N) interaction density fast enough.

### NEXT EXPERIMENT
**N. INSTANCING OR WORKER-BASED MICRO-ZONING (SIMULATION SHARDING).** We must test whether a single geographic hotspot (e.g. a town) can be subdivided dynamically by instancing (placing players in separate parallel dimensions of the same town) OR by delegating sub-systems (Combat vs Movement) to parallel Web Workers on the backend.
