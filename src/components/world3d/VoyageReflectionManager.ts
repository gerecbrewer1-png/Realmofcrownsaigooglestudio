/**
 * Realm of Crowns - Voyage Ocean Reflection Manager (Phase 2)
 * 
 * Optimizes the Three.js Water mirror reflection camera pass:
 * 1. Layer Masking: Isolates prominent reflection geometry (ship hulls, main masts, large bastions)
 *    on Layer 0 while directing micro-props (cannons, deck furniture, barrels, crates, ratlines)
 *    to Layer 1 (visible to the main camera, culled from the planar reflection pass).
 * 2. Throttled Update Frequency: Allows reflection passes to update at configurable frame intervals
 *    (e.g., 30 FPS or 15 FPS while the game runs at 60 FPS), cutting reflection draw calls by 50% to 75%.
 * 3. Mobile Bypassing: Safely disables the secondary render pass on LOW quality tiers.
 */

import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

export const VOYAGE_LAYERS = {
  DEFAULT_AND_REFLECTION: 0, // Visible to both main camera and ocean reflection camera
  MICRO_DETAILS: 1,          // Visible ONLY to main camera (barrels, crates, cannons, tiny props)
  WATER_SURFACE: 2,          // Water mesh itself
} as const;

export class VoyageReflectionManager {
  private static waterInstance: Water | null = null;
  private static frameCounter = 0;
  private static updateInterval = 2; // Default: update reflection every 2nd frame (30 FPS)
  private static enabled = true;
  private static originalOnBeforeRender: ((renderer: any, scene: any, camera: any) => void) | null = null;

  public static initialize(water: Water, mainCamera: THREE.PerspectiveCamera, initialInterval = 2) {
    this.waterInstance = water;
    this.updateInterval = initialInterval;
    this.frameCounter = 0;
    this.enabled = initialInterval > 0;

    // Enable Layer 0 and Layer 1 on the main camera so player sees everything
    mainCamera.layers.enable(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    mainCamera.layers.enable(VOYAGE_LAYERS.MICRO_DETAILS);

    // Intercept water.onBeforeRender to inject throttling and layer masking
    const mirrorCamera = (water as any).material?.uniforms?.mirrorSampler ? (water as any).mirrorCamera : null;
    if (mirrorCamera) {
      // Mirror camera only renders Layer 0 (prominent hulls, masts, horizon structures)
      mirrorCamera.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    }

    if (typeof water.onBeforeRender === 'function') {
      this.originalOnBeforeRender = water.onBeforeRender.bind(water);

      water.onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
        // Reflection isolation test: allow DEV bypass toggle or disabled interval
        const isBypassed = typeof window !== 'undefined' && (window as any).__BYPASS_REFLECTION__ === true;
        if (!this.enabled || this.updateInterval === 0 || isBypassed) {
          return; // Skip reflection render completely
        }

        this.frameCounter++;
        // Always render on frame 1 so the reflection texture is populated immediately
        if (this.frameCounter > 1 && this.updateInterval > 1 && (this.frameCounter % this.updateInterval) !== 0) {
          return; // Use previous frame's reflection render target (50-75% draw call reduction)
        }

        // Configure mirror camera to only render Layer 0
        const mCam = (this.waterInstance as any)?.mirrorCamera;
        if (mCam) {
          mCam.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
        }

        if (this.originalOnBeforeRender) {
          this.originalOnBeforeRender(renderer, scene, camera);
        }
      };
    }
  }

  public static dispose() {
    this.waterInstance = null;
    this.originalOnBeforeRender = null;
    this.frameCounter = 0;
  }

  public static setUpdateInterval(interval: number) {
    this.updateInterval = Math.max(0, interval);
    this.enabled = this.updateInterval > 0;
  }

  public static getUpdateInterval(): number {
    return this.updateInterval;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static getStatusString(): string {
    if (!this.enabled || this.updateInterval === 0) return 'OFF (Mobile Saver)';
    if (this.updateInterval === 1) return 'ON (Every Frame)';
    return `ON (1/${this.updateInterval} Frames)`;
  }

  /**
   * Helper to assign an object to Layer 1 (micro details, culled from reflection)
   */
  public static tagMicroDetail(obj: THREE.Object3D) {
    obj.traverse((child) => {
      child.layers.set(VOYAGE_LAYERS.MICRO_DETAILS);
    });
  }

  /**
   * Helper to assign an object to Layer 0 (reflects on water)
   */
  public static tagProminentReflective(obj: THREE.Object3D) {
    obj.traverse((child) => {
      child.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    });
  }
}
