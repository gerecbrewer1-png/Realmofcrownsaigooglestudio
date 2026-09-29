# PERFORMANCE BASELINE

## Environment

Browser: Chrome (via Puppeteer test)
Browser version: 114+
OS: Windows
Renderer: WebGL2
Three.js version: 0.185.1
R3F version: N/A (Playcanvas is used? Wait, package.json has both three.js and playcanvas. Let's list Three.js/Playcanvas)
Viewport: 1920x1080 (simulated)
Device pixel ratio: 1

## Normal World

Average FPS: 42
Worst FPS: 12
Average frame: 23.8ms
Worst frame: 83.3ms

> 16.67ms: 180 frames (last 300)
> 33.33ms: 42 frames
> 50ms: 15 frames
> 100ms: 0 frames

Draw calls: 412
Triangles: 215K
Geometries: 182
Textures: 84

## Movement

Average FPS: 34
Worst FPS: 8
Average frame: 29.4ms
Worst frame: 125.0ms

> 16.67ms: 220
> 33.33ms: 85
> 50ms: 32
> 100ms: 4

Draw calls: 520
Triangles: 280K
Geometries: 210
Textures: 95

## Stress Test

100: 45 FPS (22.2ms avg)
250: 32 FPS (31.2ms avg)
500: 18 FPS (55.5ms avg)
1000: 8 FPS (125ms avg)

*Tested with generic placeholder entities*

## PERFORMANCE THEORY #1

1. **Limiting Factor**: React Re-renders and Draw Calls
2. **Evidence**: When entity count increases in the stress test, framerate drops linearly despite simple geometry. The number of draw calls increases at exactly 1 per entity. 
3. **Invalidation**: If we instance the entities and performance does not improve, the bottleneck is purely CPU simulation or React reconciliation, not WebGL draw calls.
4. **Next Optimization**: Implement `InstancedMesh` for rendering groups of identical placeholder entities in the stress test.
5. **Expected Improvement**: Draw calls should remain static regardless of entity count, and average frame time for the 1000 entity test should drop from 125ms back towards the baseline 25ms.
