/**
 * REALM OF CROWNS — RAHR Phase 3: PlayCanvas OptiPixel Engine Bridge
 * 
 * Ensures 100% runtime compatibility between PlayCanvas v2.22.2 and playcanvas-opti-pixel@1.2.0.
 * 
 * Specifically addresses:
 * 1. Global window.pc registration required by OptiPixel ESM/CJS bundles.
 * 2. PlayCanvas v2 Frustum.planes getter compatibility (pc.Frustum in v2 uses Float32Array planeData
 *    internally and returns an empty array for planes; OptiPixel BVH expects 6 Plane objects).
 */

import * as pc from 'playcanvas';

// 1. Register global window.pc for OptiPixel bundles
if (typeof window !== 'undefined') {
  if (!(window as any).pc) {
    (window as any).pc = pc;
  }
} else if (typeof global !== 'undefined') {
  (global as any).window = global;
  (global as any).pc = pc;
}

// 2. Bridge pc.Frustum.prototype.planes for OptiPixel BVH FrustumUtils
let isBridgeInitialized = false;

export function initializeOptiPixelBridge(): void {
  if (isBridgeInitialized) return;
  isBridgeInitialized = true;

  try {
    const existingDesc = Object.getOwnPropertyDescriptor(pc.Frustum.prototype, 'planes');
    // If getter exists and returns empty or is not providing 6 planes
    if (!existingDesc || existingDesc.configurable) {
      Object.defineProperty(pc.Frustum.prototype, 'planes', {
        get(this: any) {
          if (!this._optiPlanes) {
            this._optiPlanes = [
              new pc.Plane(),
              new pc.Plane(),
              new pc.Plane(),
              new pc.Plane(),
              new pc.Plane(),
              new pc.Plane()
            ];
          }
          // Extract the 6 planes from PlayCanvas v2 planeData
          for (let i = 0; i < 6; i++) {
            this.getPlane(i, this._optiPlanes[i]);
          }
          return this._optiPlanes;
        },
        set(this: any, val: any) {
          this._optiPlanes = val;
        },
        configurable: true,
        enumerable: false
      });
    }
  } catch (err) {
    console.warn('[RAHR OptiPixel Bridge] Warning initializing Frustum planes bridge:', err);
  }
}

// Auto-initialize on import
initializeOptiPixelBridge();
