/**
 * Realm of Crowns - Voyage Debug & Diagnostic Manager (Phase 2.5)
 * 
 * Provides runtime switches to isolate, toggle, and diagnose individual renderer systems:
 * - OptiPixel integration (PlayCanvas / BVH bridge)
 * - BVH spatial partitioning
 * - Manual Frustum Culling vs Native Three.js Culling
 * - Occlusion Culling
 * - Ship Hierarchical LOD
 * - GPU Instancing for ship and harbor props
 * - Adaptive Quality Scaling
 * - Force LOD0 on all pirate vessels
 */

export interface VoyageDebugSwitches {
  optiPixelEnabled: boolean;
  bvhEnabled: boolean;
  frustumCullingEnabled: boolean;
  occlusionCullingEnabled: boolean;
  shipLODEnabled: boolean;
  gpuInstancingEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  forceLOD0OnAllPirates: boolean;
  movementIsolationEnabled: boolean;
}

export class VoyageDebugManager {
  private static switches: VoyageDebugSwitches = {
    optiPixelEnabled: true,
    bvhEnabled: true,
    frustumCullingEnabled: false, // Let Three.js native frustum culling handle moving ships safely
    occlusionCullingEnabled: true,
    shipLODEnabled: true,
    gpuInstancingEnabled: true,
    adaptiveQualityEnabled: false, // Default to stable quality (prevent unwanted downscaling to LOW)
    forceLOD0OnAllPirates: false,
    movementIsolationEnabled: true,
  };

  private static listeners: Array<(switches: VoyageDebugSwitches) => void> = [];

  public static getSwitches(): VoyageDebugSwitches {
    return this.switches;
  }

  public static setSwitch<K extends keyof VoyageDebugSwitches>(key: K, value: VoyageDebugSwitches[K]) {
    this.switches[key] = value;
    this.notify();
  }

  public static toggleSwitch(key: keyof VoyageDebugSwitches) {
    this.switches[key] = !this.switches[key];
    this.notify();
  }

  public static addListener(cb: (switches: VoyageDebugSwitches) => void) {
    this.listeners.push(cb);
  }

  public static removeListener(cb: (switches: VoyageDebugSwitches) => void) {
    this.listeners = this.listeners.filter(l => l !== cb);
  }

  private static notify() {
    if (typeof window !== 'undefined') {
      (window as any).__VOYAGE_DEBUG_SWITCHES__ = { ...this.switches };
    }
    this.listeners.forEach(cb => cb(this.switches));
  }
}

if (typeof window !== 'undefined') {
  (window as any).__VOYAGE_DEBUG_SWITCHES__ = VoyageDebugManager.getSwitches();
  (window as any).__TOGGLE_VOYAGE_DEBUG__ = (key: keyof VoyageDebugSwitches) => {
    VoyageDebugManager.toggleSwitch(key);
    return VoyageDebugManager.getSwitches();
  };
}
