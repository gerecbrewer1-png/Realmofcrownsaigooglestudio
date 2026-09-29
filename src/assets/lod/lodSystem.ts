/**
 * Level of Detail (LOD) System
 * 
 * Provides flexible LOD switching based on camera distance.
 * Supports multiple LOD tiers (0=highest detail to 3=lowest).
 * Can be applied to any THREE.Object3D or group.
 * Configurable LOD distances for different use cases.
 */

import * as THREE from 'three';

export type LODTier = 'lod0' | 'lod1' | 'lod2' | 'lod3';

export interface LODConfig {
  /** Distance at which LOD0 is visible (meters) */
  lod0Distance: number;
  /** Distance at which LOD1 is visible */
  lod1Distance: number;
  /** Distance at which LOD2 is visible */
  lod2Distance: number;
  /** Distance at which LOD3 is visible */
  lod3Distance: number;
}

/** Default LOD distances for buildings and characters */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  lod0Distance: 50,  // High detail up to 50m
  lod1Distance: 150, // Medium detail 50-150m
  lod2Distance: 400, // Low detail 150-400m
  lod3Distance: 1000, // Distant representation 400-1000m
};

/** More aggressive LOD for foliage and small objects */
export const FOLIAGE_LOD_CONFIG: LODConfig = {
  lod0Distance: 30,
  lod1Distance: 80,
  lod2Distance: 200,
  lod3Distance: 500,
};

/** Relaxed LOD for high-performance mode */
export const PERFORMANCE_LOD_CONFIG: LODConfig = {
  lod0Distance: 25,
  lod1Distance: 70,
  lod2Distance: 150,
  lod3Distance: 400,
};

/**
 * Represents a single LOD level with its visibility and data
 */
export interface LODLevel {
  tier: LODTier;
  object: THREE.Object3D | null;
  distance: number;
}

/**
 * Manages multiple LOD representations of a single object
 */
export class LODManager {
  private lodLevels: Map<LODTier, THREE.Object3D> = new Map();
  private currentLOD: LODTier = 'lod0';
  private lodConfig: LODConfig;
  private referenceObject: THREE.Object3D;

  constructor(referenceObject: THREE.Object3D, config: LODConfig = DEFAULT_LOD_CONFIG) {
    this.referenceObject = referenceObject;
    this.lodConfig = config;
  }

  /**
   * Register a LOD level
   */
  setLOD(tier: LODTier, object: THREE.Object3D): void {
    this.lodLevels.set(tier, object);
    
    // Initially hide all but LOD0
    if (tier !== 'lod0') {
      object.visible = false;
    }
  }

  /**
   * Update LOD based on distance from camera
   * Camera position and reference object position are used to calculate distance
   */
  updateLOD(cameraPosition: THREE.Vector3): void {
    const distance = cameraPosition.distanceTo(this.referenceObject.position);
    let newLOD: LODTier = 'lod0';

    if (distance > this.lodConfig.lod3Distance) {
      newLOD = 'lod3';
    } else if (distance > this.lodConfig.lod2Distance) {
      newLOD = 'lod2';
    } else if (distance > this.lodConfig.lod1Distance) {
      newLOD = 'lod1';
    } else {
      newLOD = 'lod0';
    }

    if (newLOD !== this.currentLOD) {
      this.switchLOD(newLOD);
    }
  }

  /**
   * Manually switch to a specific LOD tier
   */
  switchLOD(tier: LODTier): void {
    if (!this.lodLevels.has(tier)) {
      console.warn(`LOD tier ${tier} not registered for this object`);
      return;
    }

    // Hide current LOD
    const currentObject = this.lodLevels.get(this.currentLOD);
    if (currentObject) {
      currentObject.visible = false;
    }

    // Show new LOD
    const newObject = this.lodLevels.get(tier);
    if (newObject) {
      newObject.visible = true;
    }

    this.currentLOD = tier;
  }

  /**
   * Get currently active LOD tier
   */
  getCurrentLOD(): LODTier {
    return this.currentLOD;
  }

  /**
   * Get all registered LOD objects
   */
  getLODObjects(): Map<LODTier, THREE.Object3D> {
    return new Map(this.lodLevels);
  }

  /**
   * Dispose of all LOD geometries and materials
   */
  dispose(): void {
    this.lodLevels.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.lodLevels.clear();
  }

  /**
   * Update LOD configuration (useful for switching quality modes)
   */
  updateConfig(config: LODConfig): void {
    this.lodConfig = config;
  }

  /**
   * Get current LOD configuration
   */
  getConfig(): LODConfig {
    return { ...this.lodConfig };
  }
}

/**
 * Global LOD manager pool for tracking multiple LOD managers
 */
export class LODManagerPool {
  private managers: LODManager[] = [];

  /**
   * Add a manager to the pool
   */
  add(manager: LODManager): void {
    this.managers.push(manager);
  }

  /**
   * Remove a manager from the pool
   */
  remove(manager: LODManager): void {
    const index = this.managers.indexOf(manager);
    if (index !== -1) {
      this.managers.splice(index, 1);
    }
  }

  /**
   * Update all managers based on camera position
   */
  updateAll(cameraPosition: THREE.Vector3): void {
    this.managers.forEach((manager) => manager.updateLOD(cameraPosition));
  }

  /**
   * Update all managers to a specific LOD tier (useful for quality mode changes)
   */
  setAllLOD(tier: LODTier): void {
    this.managers.forEach((manager) => manager.switchLOD(tier));
  }

  /**
   * Update configuration for all managers
   */
  updateConfigAll(config: LODConfig): void {
    this.managers.forEach((manager) => manager.updateConfig(config));
  }

  /**
   * Dispose of all managers
   */
  disposeAll(): void {
    this.managers.forEach((manager) => manager.dispose());
    this.managers = [];
  }

  /**
   * Get count of managed objects
   */
  getCount(): number {
    return this.managers.length;
  }

  /**
   * Clear all managers
   */
  clear(): void {
    this.managers.forEach((manager) => manager.dispose());
    this.managers = [];
  }
}

/**
 * Suggested LOD configuration based on quality mode
 */
export function getLODConfigForQuality(
  quality: 'performance' | 'balanced' | 'ultra'
): LODConfig {
  switch (quality) {
    case 'performance':
      return PERFORMANCE_LOD_CONFIG;
    case 'balanced':
      return DEFAULT_LOD_CONFIG;
    case 'ultra':
      return {
        lod0Distance: 100,
        lod1Distance: 300,
        lod2Distance: 800,
        lod3Distance: 2000,
      };
    default:
      return DEFAULT_LOD_CONFIG;
  }
}
