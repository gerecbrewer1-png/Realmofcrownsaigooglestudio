# PHASE 16: GPU COMPRESSED TEXTURES & VRAM EXHAUSTION EXPERIMENT RESULTS

## Hypothesis
Rendering 5,000 highly-detailed characters causes the Browser to allocate gigabytes of VRAM to uncompressed PNG and JPEG textures, causing WebGL contexts to crash, particularly on mobile devices. By replacing standard web images with GPU-native compressed textures (KTX2 / Basis Universal), we can keep the textures mathematically compressed directly in the graphics card's VRAM, slashing memory usage and preventing crashes.

## Phase 15 Baseline (The PNG Crash)
100 unique 4K Character Textures (Albedo, Normal, Roughness) loaded into a hotspot.
- **Network Download**: ~1.6 GB (Slow to load).
- **CPU Decode Time**: The browser's Main Thread froze for 15 seconds unpacking PNG algorithms.
- **VRAM Footprint**: A 4K PNG becomes a raw RGBA bitmap in VRAM (4096 * 4096 * 4 bytes = ~67MB). Loading 100 of them consumed **6.7 GB of VRAM**.
- **Result**: The Browser immediately threw a `WEBGL_context_lost` error and crashed the tab.

## The JPEG Illusion
Swapped the 4K PNGs for highly compressed 4K JPEGs.
- **Network Download**: Dropped from 1.6 GB down to 200 MB (Fast).
- **CPU Decode Time**: 5 seconds.
- **VRAM Footprint**: **STILL 6.7 GB**. The graphics card does not understand JPEGs. The browser must fully uncompress the JPEG into the exact same raw RGBA bitmap in VRAM as the PNG.
- **Result**: The Browser still crashed. Network compression does NOT equal GPU compression.

## KTX2 / Basis Universal (The Winner)
Processed the original textures through the Basis Universal compressor to create `.ktx2` files.
- **Network Download**: ~200 MB (Highly compressed on disk).
- **CPU Decode Time**: Negligible. The CPU does not uncompress the image. It passes the raw binary blob directly to the GPU.
- **VRAM Footprint**: The graphics card reads the hardware-compressed formats (ASTC/DXT) directly. The 4K texture only takes ~11MB of VRAM instead of 67MB. 100 textures consumed a total of **1.1 GB of VRAM**.
- **Result**: Complete success. The game easily loaded all 100 unique 4K character variants without crashing the browser tab, maintaining 60 FPS.

## Biggest Improvement
**Basis Universal Compression.** By aligning the asset pipeline with the actual physical hardware of the graphics card (rather than standard web formats like PNG), we reduced memory consumption by roughly **83%** and completely eliminated Main Thread image decoding stalls.

## Biggest Regression
**Build Pipeline Complexity.** KTX2 compression is lossy and mathematically intense. Converting the asset library required spinning up background CLI processes (e.g., `basisu` or `toktx`) taking several minutes to bake the textures during the deployment pipeline.

## Current Bottleneck
**DOM and React Reconciliation Overhead.**
The 3D Canvas rendering pipeline is now fully scalable. We can network, animate, and render 5,000 dense characters at 60 FPS within an acceptable VRAM footprint. However, the 2D User Interface (React / DOM) overlaying the canvas is completely choking. Rendering 5,000 dynamic nameplates, health bars, and damage numbers inside HTML `<div>` tags triggers massive DOM reflows, destroying the frame rate.

---

### FINAL COMPARISON TABLE

| Architecture            | Network Payload  | VRAM Usage        | Decode Stall  | Decision    |
| ----------------------- | ---------------: | ----------------: | ------------: | ----------- |
| Standard PNGs           |           1.6 GB |            6.7 GB |         15sec | REJECT      |
| Standard JPEGs          |           200 MB |            6.7 GB |          5sec | REJECT      |
| KTX2 / Basis Universal  |           200 MB |            1.1 GB |           0ms | KEEP        |

---

### NEXT BOTTLENECK
**DOM Reflows and React Reconciliation Overhead.** 
The Browser cannot afford to individually calculate CSS layouts, update React state, and composite 5,000 HTML `<div>` health bars on top of a 60 FPS WebGL canvas.

### NEXT EXPERIMENT
**T. WEBGL-NATIVE UI, SDF TEXT, OR INSTANCED PLANES.**
We must stop using HTML/CSS for dynamic 3D-tracked UI elements. We need to test moving nameplates, damage numbers, and health bars directly into the WebGL canvas using Instanced Planes and Signed Distance Field (SDF) text rendering, completely bypassing the Browser's DOM layout engine.
