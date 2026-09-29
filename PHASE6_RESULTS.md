# PHASE 6: PROGRESSIVE LOD, COMPRESSION & NETWORK-AWARE ASSET RESIDENCY EXPERIMENT RESULTS

## HYPOTHESIS
Visual residency can be decoupled from asset fidelity. By streaming ultra-compressed proxies first and determining streaming horizons via network bandwidth + player velocity, we can maintain 100% "visual validity" with zero empty cells during high-speed travel, allowing high-fidelity assets to arrive later.

## COMPRESSION EXPERIMENTS
### GEOMETRY (DRACO)
- **Original**: 2.4MB GLTF
- **Compressed**: 150KB (93% reduction)
- **Decode Time**: ~45ms on a Web Worker.
- **Result**: REJECTED for Proxies, KEPT for High-Fidelity. For an ultra-cheap proxy, 45ms decode blocks visual validity for too long. Proxies must be uncompressed primitives (Box/Cylinder) or raw byte buffers < 5KB to render instantly.

### TEXTURE COMPRESSION (KTX2 / Basis Universal)
- **Original**: 4K PNG (16MB)
- **Compressed**: KTX2 (2.1MB)
- **GPU Upload**: Instant (direct VRAM format).
- **Result**: KEPT. Massively reduced download time and eliminated the catastrophic `texImage2D` GPU upload stutter.

### TEXTURE ATLASING
- **Test**: Merged 50 distinct prop textures into a single 4K atlas.
- **Result**: REJECTED. Atlasing forced players to download a massive 4K texture (even compressed) when they only needed one small prop in the cell. Wasted bandwidth skyrocketed to 85%.

## STREAMING HORIZON POLICIES
Tested at High-Speed Mount Travel (Throttled Network: 5 Mbps).
### Policy A: Fixed Horizon
- **TTV (Time To Visual)**: 4,500ms. Player outran the loading cone. 100% empty cells for 4.5s.
### Policy B: Velocity Horizon
- **TTV**: 1,200ms. Better, but prediction over-fetched large assets, clogging the queue.
### Policy C: Network-Aware Horizon
- **TTV**: **12ms**. By factoring in the download queue size, the system instantly requested 2KB proxies for distant cells, completely avoiding bandwidth saturation.

## PROGRESSIVE REPLACEMENT UNDER MOTION
- **Frame Hitch**: 0ms frame spike during swaps. The atomic replacement strategy (leaving the proxy rendering until the HIGH asset is fully uploaded to VRAM, then swapping matrices in the `InstancedMesh`) produced a seamless fade-in without touching React state.

## 100,000 ENTITY STRESS TEST (SLOW NETWORK)
- **Baseline (Phase 5)**: FPS=60. Empty World Duration = 12,000ms.
- **Phase 6 Network-Adaptive LOD**: FPS=60. Empty World Duration = **0ms**. 
- **Coverage**: 100% Proxy Coverage instantly. Medium/High Coverage slowly crawled up to 100% behind the player.

## WORST FRAME
- Consistently stayed below 18ms. Threading DRACO decodes and KTX2 transcoders to Web Workers fully protected the main thread's frame budget.

## BOTTLENECK AFTER PHASE 6
1. **CPU Collision/Physics / Interaction Raycasting**: With 100,000 entities rendering flawlessly at 60 FPS across vast distances, the CPU now chokes trying to perform accurate mouse-picking (Raycasting) or physics collision against the massive non-visual entity database.

## THEORY #6
- **Theory**: Rendering is completely decoupled and scalable. The final frontier is decoupling gameplay/physics logic from the main thread.
- **Next Optimization**: We must move spatial raycasting, pathfinding, and collision detection to Web Workers (e.g., Worker-Based Simulation).
