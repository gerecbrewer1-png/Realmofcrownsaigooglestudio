/**
 * Reusable Model Loader for GLB/glTF Assets
 * 
 * Features:
 * - Automatic caching to prevent loading the same model multiple times
 * - Clone geometry for instances while reusing materials
 * - Async loading with error handling
 * - Compatible with Three.js GLTFLoader
 * - Tracks loading state for UI feedback
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type LoaderState = 'idle' | 'loading' | 'loaded' | 'error';

export interface LoadedAsset {
  scene: THREE.Group | THREE.Object3D;
  animations: THREE.AnimationClip[];
  materials: THREE.Material[];
  state: LoaderState;
  error?: Error;
}

/**
 * Global asset cache and loader
 */
class ModelLoaderService {
  private gltfLoader: GLTFLoader;
  private cache: Map<string, LoadedAsset> = new Map();
  private loadingPromises: Map<string, Promise<LoadedAsset>> = new Map();

  constructor() {
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Load a GLB/glTF model by file path
   * Returns cached asset if already loaded
   * Prevents duplicate simultaneous loads
   */
  async loadAsset(filePath: string): Promise<LoadedAsset> {
    // Return from cache if available
    if (this.cache.has(filePath)) {
      const cached = this.cache.get(filePath)!;
      if (cached.state === 'loaded') {
        return cached;
      }
    }

    // Prevent duplicate simultaneous loads
    if (this.loadingPromises.has(filePath)) {
      return this.loadingPromises.get(filePath)!;
    }

    // Create loading promise
    const loadPromise = this._load(filePath);
    this.loadingPromises.set(filePath, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(filePath);
      return result;
    } catch (error) {
      this.loadingPromises.delete(filePath);
      throw error;
    }
  }

  /**
   * Internal load implementation
   */
  private async _load(filePath: string): Promise<LoadedAsset> {
    const asset: LoadedAsset = {
      scene: new THREE.Group(),
      animations: [],
      materials: [],
      state: 'loading',
    };

    this.cache.set(filePath, asset);

    try {
      const gltf = await this.gltfLoader.loadAsync(filePath);

      // Process and cache the loaded asset
      asset.scene = gltf.scene;
      asset.animations = gltf.animations || [];
      
      // Extract all materials from the scene
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            asset.materials.push(...child.material);
          } else {
            asset.materials.push(child.material);
          }
        }
      });

      asset.state = 'loaded';
      return asset;
    } catch (error) {
      asset.state = 'error';
      asset.error = error instanceof Error ? error : new Error('Unknown loading error');
      console.error(`Failed to load asset ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Create an instance (clone) of a loaded asset
   * Reuses geometry and materials, creates new Object3D hierarchy
   */
  async createInstance(filePath: string): Promise<THREE.Object3D> {
    const asset = await this.loadAsset(filePath);
    
    if (asset.state !== 'loaded') {
      throw new Error(`Asset ${filePath} not loaded: ${asset.state}`);
    }

    // Deep clone the scene but reuse materials and geometry
    const instance = asset.scene.clone();
    
    // Traverse and fix references (ensure materials are reused)
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Keep material references (don't duplicate)
        // But create new instances of the mesh geometry can be shared via instancing
        if (!child.geometry.isBufferGeometry) {
          child.geometry = new THREE.BufferGeometry();
        }
      }
    });

    return instance;
  }

  /**
   * Preload an asset into cache without creating an instance
   */
  async preload(filePath: string): Promise<void> {
    await this.loadAsset(filePath);
  }

  /**
   * Get cached asset without loading (returns null if not cached)
   */
  getCached(filePath: string): LoadedAsset | null {
    return this.cache.get(filePath) || null;
  }

  /**
   * Clear specific asset from cache
   */
  clearAsset(filePath: string): void {
    const asset = this.cache.get(filePath);
    if (asset) {
      // Dispose materials and geometries
      asset.materials.forEach((mat) => mat.dispose());
      this.cache.delete(filePath);
    }
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    this.cache.forEach((asset) => {
      asset.materials.forEach((mat) => mat.dispose());
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalCached: number;
    loadedCount: number;
    loadingCount: number;
    errorCount: number;
  } {
    const stats = {
      totalCached: this.cache.size,
      loadedCount: 0,
      loadingCount: 0,
      errorCount: 0,
    };

    this.cache.forEach((asset) => {
      if (asset.state === 'loaded') stats.loadedCount++;
      else if (asset.state === 'loading') stats.loadingCount++;
      else if (asset.state === 'error') stats.errorCount++;
    });

    return stats;
  }
}

/**
 * Singleton instance
 */
export const modelLoader = new ModelLoaderService();

/**
 * Preload batch of assets (useful for level initialization)
 */
export async function preloadAssets(filePaths: string[]): Promise<void> {
  const promises = filePaths.map((path) => modelLoader.preload(path).catch(() => {
    // Silently ignore preload errors; they'll be caught on actual use
  }));
  await Promise.all(promises);
}
