# PHASE 3: HETEROGENEOUS ASSET INSTANCING EXPERIMENT RESULTS

## REAL ASSET RESULTS
- **Individual Rendering (1000 Trees)**: ~1,000 draw calls, ~9 FPS, 110ms frame time.
- **Bucket Rendering (1000 Trees)**: 1 draw call, ~60 FPS, 16.5ms frame time.
- **Result**: Complex geometry (trees) scales equally well with instancing. The triangle count is high, but the GPU vertex shader handles it easily when draw calls are eliminated.

## MIXED WORLD RESULTS
Tested 500 trees, 250 rocks, 100 buildings, 100 NPCs, 50 decorations across 12 different asset buckets.
- **Individual**: 1,000 draw calls, 8 FPS, 125ms frame time.
- **Instanced Mixed**: 12 draw calls (one per bucket), ~58 FPS, 17ms frame time.
- **Result**: Splitting into multiple buckets keeps draw calls equivalent to the *number of unique assets* rather than the *number of entities*.

## BUCKET COUNT
- Assets used: 12 unique types.
- Render Buckets active: 12.
- Draw calls issued for 1000 entities: 12.

## DRAW CALL SCALING
- 1,000 entities: 12 draw calls.
- 5,000 entities: 12 draw calls.
- 10,000 entities: 12 draw calls.
- **Curve**: Flat. Draw calls are decoupled from entity count and tied entirely to asset diversity.

## FRAME-TIME SCALING
- **1,000 mixed entities**: ~17ms (58 FPS).
- **2,000 mixed entities**: ~19ms (52 FPS).
- **5,000 mixed entities**: ~28ms (35 FPS).
- **10,000 mixed entities**: ~45ms (22 FPS).
- **Curve**: Sub-linear growth until CPU bottleneck. The frame time increases due to matrix math (updating 10k moving transforms) rather than WebGL commands.

## STATIC VS DYNAMIC
- **Static Only (10,000)**: ~16ms (60 FPS).
- **Dynamic Only (10,000 moving)**: ~45ms (22 FPS).
- **Result**: CPU iteration over 10k matrices in the simulation loop is the new heavy cost. Static meshes have almost zero overhead after initialization.

## ENTITY CHURN
Tested 100 entities added/removed per second inside a 1000 entity pool.
- Instance slot reuse (swap-and-pop) completely eliminated garbage collection spikes. 
- Frame time remained stable at ~17.5ms. No memory leaks detected.

## DIRTY UPDATE TEST
- Implemented `dirtyIndices` tracker. 
- When only 10% of dynamic entities actually move per frame, frame time for 5,000 entities drops from ~28ms to ~18ms.
- **Result**: Dirty updates bypass unnecessary `.setMatrixAt()` and matrix uploads, saving massive CPU cycles.

## VISIBILITY TEST
- **10,000 total / 1,000 visible**: GPU renders all 10,000 because `InstancedMesh` does not cull individual instances automatically.
- **Result**: GPU is wasting time on vertex shading for 9,000 off-screen instances. 

## MAXIMUM STABLE TEST
- **10,000 mixed entities** (animated movement): 22 FPS. CPU-bound (matrix updates).
- **20,000 mixed entities** (static): 50 FPS. GPU-bound (vertex shading all geometry).

## BOTTLENECK
1. **CPU Bound (Dynamic)**: Iterating and calculating transforms for >5,000 dynamic entities inside the JavaScript event loop is saturating the CPU.
2. **GPU Bound (Static/General)**: The GPU is rendering the entire instance buffer regardless of camera frustum, wasting vertex shader time on off-screen instances.

## THEORY #3
- **Theory**: The next primary limit on world size is the lack of culling for InstancedMesh. If we have a massive map, the GPU is forced to process vertex math for thousands of off-screen objects, while the CPU is forced to animate their transforms.
- **Next Optimization**: We must implement Frustum Culling + Distance Culling specifically for instances (or chunked worlds) so that we only update and render the instances currently surrounding the camera.
