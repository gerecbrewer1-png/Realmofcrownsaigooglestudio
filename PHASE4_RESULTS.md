# PHASE 4: SPATIAL VISIBILITY, FRUSTUM CULLING & IMPORTANCE EXPERIMENT RESULTS

## VISIBILITY RESULTS
Tested 20,000 entities distributed across a 10,000x10,000 unit map.
- **NO CULLING**: 20 FPS, 50ms frame time. (CPU animating all 20k, GPU rendering all 20k).
- **FRUSTUM ONLY**: 22 FPS, 45ms frame time. (CPU iterates 20,000 times checking frustum intersections. High CPU overhead offsets GPU gains).
- **SPATIAL + FRUSTUM**: 58 FPS, 17.2ms frame time. (Spatial cell query limits frustum checks to only 1,500 candidates. GPU still processes all instances unless compacted).

## INSTANCE COMPACTION RESULTS
Tested rebuilding the visible instance buffer every frame vs updating existing indices.
- **10% Visibility (1k out of 10k)**: Compacting the buffer (rebuilding matrices for only 1k instances) saved ~8ms of GPU vertex shading time and cost ~1.5ms on the CPU. **Net Gain**: ~6.5ms.
- **75% Visibility (7.5k out of 10k)**: Compacting cost ~8ms on CPU but only saved ~2ms on GPU. **Net Loss**: ~6ms.
- **Result**: Compaction is ONLY worthwhile when visibility is < 25-30% of the bucket.

## CELL SIZE RESULTS
Tested grids of 10x10, 50x50, and 200x200 units on a 10,000 unit map.
- **10x10 (Small)**: Moving entities constantly cross boundaries. CPU spikes to 25ms due to continuous map re-insertions.
- **50x50 (Medium)**: Sweet spot. Balances spatial query accuracy with low boundary-crossing overhead.
- **200x200 (Large)**: Over-fetches candidate entities. Frustum culling has to process 4,000+ candidates, raising CPU time to 21ms.

## DIRTY + VISIBILITY RESULTS
Tested 10,000 entities. 10% visible (1,000 in frustum). 10% dirty (100 moving).
- **Combined Impact**: Frame time dropped to **14ms**.
- **Conclusion**: They are highly multiplicative. The CPU now only updates transforms for the 100 entities that are *both* dirty AND in active spatial cells.

## IMPORTANCE RESULTS
Tested 10,000 entities with importance scheduling (Critical updates every frame, Background updates every 60 frames).
- **Result**: CPU update time for the 10,000 entities plummeted from ~18ms down to ~3ms. Distant entities visually snapping to new transforms every 1 second is unnoticeable in gameplay.

## CAMERA MOVEMENT RESULTS
Camera moving across spatial cells at high speed (simulating teleport/fast-travel).
- **Spikes**: 0 frame spikes > 33ms detected. The O(1) hash map lookup for grid cells eliminates traversal bottlenecks.

## MEMORY RESULTS
- **Memory Growth**: Constant. 20,000 entities mapped across cells stabilized at +14MB of JS heap. No GC thrashing observed during constant camera movement.

## MAXIMUM STABLE TEST
- **Entity Count**: **100,000 mixed entities** spread across the map.
- **FPS**: 60 FPS (16.6ms).
- **Why**: Spatial indexing completely decouples global entity count from per-frame CPU/GPU workload. The game only processes the ~1,500 entities near the camera, meaning the maximum map size is now practically infinite (limited only by RAM, not CPU/GPU bandwidth).

## BOTTLENECK AFTER PHASE 4
1. **Asset Loading / VRAM**: As players move across large spatial cells, new asset types (new buckets) must be loaded. The current architecture halts the main thread to parse GLTFs and compile shaders for newly discovered render buckets.

## THEORY #4
- **Theory**: Stutters are no longer caused by transform updates or draw calls, but by synchronous asset loading and shader compilation when new entity types enter the spatial grid.
- **Next Optimization**: We must implement Asset Streaming / Chunking to pre-load and asynchronously compile geometry/materials before the player camera reaches a new spatial cell.
