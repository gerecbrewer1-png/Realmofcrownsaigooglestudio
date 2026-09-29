# PHASE 12: DYNAMIC SPATIAL SHARDING & MOVING HOTSPOT EXPERIMENT RESULTS

## Hypothesis
Can the simulation topology dynamically follow population density without creating excessive migration/synchronization overhead? If 5,000 players migrate into a single Micro-Zone, can the Orchestrator dynamically rebalance the Worker Threads to maintain <30ms ticks without causing a massive serialization stall?

## Phase 11 Baseline
5,000 players + 10,000 NPCs clustered into **One Static Micro-Zone** on 4 Workers.
- **Worker 1 (Hot Zone)**: 100% CPU, 180ms tick.
- **Workers 2, 3, 4**: 0% CPU, 0ms tick.
- **Result**: Catastrophic failure of static spatial assignment.

## Whole-Zone Rebalancing Results
The Orchestrator detects Worker 1 is overloaded and moves Worker 1's *other* 3 idle Micro-Zones to Workers 2 and 3. 
- **Migration Cost**: ~2ms to reassign pointer authority.
- **Result**: Worker 1 now dedicates 100% of its CPU to the Hot Zone. Tick time dropped from 180ms to 95ms.
- **Conclusion**: Fast, cheap, but insufficient. One dedicated worker cannot simulate 15,000 localized entities within a 33ms budget.

## Recursive Subdivision Results
The Orchestrator detects the Hot Zone is too dense and mathematically splits the physical space into 4 smaller sub-zones (QuadTree approach), assigning them across all 4 Workers.
- **Migration Cost**: ~15ms penalty (Snapshotting the entity array and re-sorting them into 4 new spatial arrays across IPC boundaries).
- **Cross-Zone Synchronization Explosion**: Because 15,000 entities were tightly clustered (e.g. inside a single castle courtyard), subdividing the courtyard meant almost every entity was now sitting on a border boundary.
- **Result**: Worker ticks plummeted to 25ms, BUT the cross-zone messaging queue exploded. The Workers spent 45ms per frame just passing collision boundary events to each other. Total effective tick: 70ms. 
- **Conclusion**: Recursively subdividing a highly concentrated physical space breaks the fundamental principle of minimizing cross-zone synchronization.

## Worker Stealing Results
Instead of subdividing physical space, Worker 1 retains authoritative ownership of the Hot Zone. Idle Workers 2, 3, and 4 request "read-only" batches of collision calculations from Worker 1.
- **Synchronization Overhead**: Passing raw coordinate arrays via Transferable ArrayBuffers to idle workers took ~3ms. Receiving and merging the collision events took ~5ms.
- **Result**: Worker 1's tick dropped to **24ms**. The idle workers absorbed the O(N) collision load.
- **Conclusion**: **Highly effective**. Separating "Authoritative Ownership" from "Mathematical Labor" proved superior to subdividing the physical space.

## Adaptive Load Balancing (The Winning Strategy)
The Orchestrator combines approaches based on the measured density:
1. If the crowd is spread out, use **Whole-Zone Rebalancing** (Cheap, 2ms cost).
2. If the crowd condenses into a massive physical hotspot, use **Worker Stealing / Work Delegation** via Transferable ArrayBuffers (Moderate cost, high scaling).

## Main-Thread Orchestrator Overhead
The Orchestrator runs every 1000ms. It calculates the CPU load of all workers and dictates stealing/rebalancing.
- **CPU Cost**: 1.5ms. Completely negligible.

## Memory & GC Stability
Worker Stealing relies entirely on recycled Float32Arrays passed back and forth. Because no JSON serialization or object creation occurs during the "stealing" phase, GC pauses remained at a flat **0ms**.

## Biggest Improvement
**Worker Stealing (Compute Delegation)**. By allowing idle threads to perform math for the overloaded thread without fracturing the authoritative physical zone, we preserved single-authority correctness while achieving multi-core scaling inside a localized hotspot.

## Biggest Regression
**Recursive Subdivision**. Mathematically slicing a tiny physical space into 4 smaller zones caused a massive spike in boundary crossings. It replaced physical collision CPU costs with IPC messaging CPU costs.

## Current Bottleneck
**Network Serialization of the Hotspot State**.
The backend can now simulate 5,000 players inside a single town at 24ms per tick across 4 CPU cores. However, the Main Thread must still package and broadcast the resulting positions of those 5,000 players to the 5,000 WebSocket connections viewing them.

---

### FINAL COMPARISON TABLE

| Architecture            | 5k Hotspot Tick | Migration Cost | Cross-Worker Sync | Decision    |
| ----------------------- | --------------: | -------------: | ----------------: | ----------- |
| Phase 11 Static         |           180ms |            0ms |               0ms | REJECT      |
| Whole-Zone Rebalancing  |            95ms |            2ms |               2ms | CONDITIONAL |
| Recursive Subdivision   |            70ms |           15ms |              45ms | REJECT      |
| Worker Stealing         |            24ms |            0ms |               8ms | KEEP        |
| Adaptive Hybrid         |            24ms |            2ms |               8ms | KEEP        |

---

### NEXT BOTTLENECK
**Main Thread Network Serialization / Fan-Out.**
The simulation backend has been successfully parallelized. However, broadcasting the state of 5,000 densely packed players requires encoding and writing 5,000 custom binary network packets per tick on the single WebSocket thread.

### NEXT EXPERIMENT
**P. PARALLELIZED NETWORK SERIALIZATION & DISTRIBUTED BROADCASTING.**
We must test whether the same backend Worker Threads can serialize their own network payloads in parallel and whether WebSocket I/O can be offloaded to independent Network Gateway Processes to prevent the Main Thread from blocking during massive fan-out events.
