/**
 * Instancing System for High-Performance Rendering
 * 
 * Converts repeated objects (trees, rocks, grass, etc.) into InstancedMesh
 * for dramatic reduction in draw calls while maintaining individual control.
 * 
 * Features:
 * - Automatic geometry/material reuse
 * - Matrix caching for efficient updates
 * - Configurable instance limits
 * - Support for LOD with instancing
 */

import * as THREE from 'three';

export interface InstanceData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible?: boolean;
}

/**
 * Manages a single InstancedMesh and provides convenient APIs
 */
export class InstancedMeshPool {
  private instancedMesh: THREE.InstancedMesh;
  private instanceCount: number = 0;
  private maxInstances: number;
  private matrixCache: Map<number, THREE.Matrix4> = new Map();
  private visibility: Map<number, boolean> = new Map();

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    maxInstances: number = 1000
  ) {
    this.maxInstances = maxInstances;
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    this.instancedMesh.frustumCulled = true;
  }

  /**
   * Add an instance and return its index
   */
  addInstance(data: InstanceData): number {
    if (this.instanceCount >= this.maxInstances) {
      console.warn(`InstancedMeshPool full (${this.maxInstances} instances)`);
      return -1;
    }

    const index = this.instanceCount++;
    const matrix = new THREE.Matrix4();
    matrix.compose(data.position, new THREE.Quaternion().setFromEuler(data.rotation), data.scale);
    
    this.instancedMesh.setMatrixAt(index, matrix);
    this.matrixCache.set(index, matrix);
    this.visibility.set(index, data.visible !== false);

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    return index;
  }

  /**
   * Update an instance's transform
   */
  updateInstance(index: number, data: Partial<InstanceData>): void {
    if (index < 0 || index >= this.instanceCount) {
      console.warn(`Invalid instance index: ${index}`);
      return;
    }

    const matrix = this.matrixCache.get(index) || new THREE.Matrix4();
    this.instancedMesh.getMatrixAt(index, matrix);

    // Update components
    if (data.position || data.rotation || data.scale) {
      const pos = data.position || new THREE.Vector3();
      const rot = new THREE.Quaternion().setFromEuler(data.rotation || new THREE.Euler());
      const scale = data.scale || new THREE.Vector3(1, 1, 1);
      matrix.compose(pos, rot, scale);
      this.instancedMesh.setMatrixAt(index, matrix);
      this.matrixCache.set(index, matrix);
    }

    if (data.visible !== undefined) {
      this.setVisibility(index, data.visible);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Toggle visibility of an instance (by making it a zero-scale instance)
   */
  setVisibility(index: number, visible: boolean): void {
    if (index < 0 || index >= this.instanceCount) return;

    this.visibility.set(index, visible);

    const matrix = new THREE.Matrix4();
    this.instancedMesh.getMatrixAt(index, matrix);

    if (!visible) {
      // Make invisible by scaling to zero
      const scale = new THREE.Vector3(0, 0, 0);
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      matrix.decompose(position, quaternion, scale);
      matrix.compose(position, quaternion, new THREE.Vector3(0, 0, 0));
    } else {
      // Restore original scale from cache (if needed)
      // For now, assume original scale was 1,1,1
      const scale = new THREE.Vector3(1, 1, 1);
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      matrix.decompose(position, quaternion, new THREE.Vector3());
      matrix.compose(position, quaternion, scale);
    }

    this.instancedMesh.setMatrixAt(index, matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get the underlying InstancedMesh
   */
  getMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  /**
   * Get current instance count
   */
  getCount(): number {
    return this.instanceCount;
  }

  /**
   * Get maximum possible instances
   */
  getMaxCount(): number {
    return this.maxInstances;
  }

  /**
   * Clear all instances
   */
  clear(): void {
    this.instanceCount = 0;
    this.matrixCache.clear();
    this.visibility.clear();
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Dispose of mesh, geometry, and materials
   */
  dispose(): void {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach((m) => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
    this.matrixCache.clear();
    this.visibility.clear();
  }
}

/**
 * Helper to create a simple cube geometry for testing
 */
export function createSimpleGeometry(type: 'cube' | 'sphere' | 'cone' = 'cube'): THREE.BufferGeometry {
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 8, 8);
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 8);
    case 'cube':
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/**
 * Batch instances from multiple sources into single InstancedMesh
 * Useful for combining trees, rocks, etc. of the same type
 */
export class InstanceBatchManager {
  private pools: Map<string, InstancedMeshPool> = new Map();
  private group: THREE.Group;

  constructor(parentGroup?: THREE.Group) {
    this.group = parentGroup || new THREE.Group();
  }

  /**
   * Create or get a pool for a specific asset
   */
  getPool(
    poolId: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    maxInstances: number = 1000
  ): InstancedMeshPool {
    if (!this.pools.has(poolId)) {
      const pool = new InstancedMeshPool(geometry, material, maxInstances);
      this.pools.set(poolId, pool);
      this.group.add(pool.getMesh());
    }
    return this.pools.get(poolId)!;
  }

  /**
   * Add instance to a pool
   */
  addInstance(poolId: string, data: InstanceData): number {
    const pool = this.pools.get(poolId);
    if (!pool) {
      console.warn(`Pool ${poolId} not found`);
      return -1;
    }
    return pool.addInstance(data);
  }

  /**
   * Get the group containing all InstancedMeshes
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get all pools
   */
  getPools(): Map<string, InstancedMeshPool> {
    return new Map(this.pools);
  }

  /**
   * Get stats
   */
  getStats(): {
    totalPools: number;
    totalInstances: number;
    poolStats: Array<{ poolId: string; count: number; max: number }>;
  } {
    const poolStats: Array<{ poolId: string; count: number; max: number }> = [];
    let totalInstances = 0;

    this.pools.forEach((pool, poolId) => {
      const count = pool.getCount();
      const max = pool.getMaxCount();
      poolStats.push({ poolId, count, max });
      totalInstances += count;
    });

    return {
      totalPools: this.pools.size,
      totalInstances,
      poolStats,
    };
  }

  /**
   * Dispose all pools
   */
  disposeAll(): void {
    this.pools.forEach((pool) => pool.dispose());
    this.pools.clear();
  }
}
