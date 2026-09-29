/**
 * Realm of Crowns — World Map Asset Service
 * 
 * Manages loading, caching, and InstancedMesh generation for real KayKit Medieval Hexagon 3D assets:
 * - Base hex terrain (grass, water, coasts, roads)
 * - Topography (hills, mountain summits, alpine peaks)
 * - Clustered nature (dense tree groves, individual trees, granite boulders)
 * 
 * All models share the unified KayKit texture atlas for optimal draw-call batching.
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three-stdlib';

export const WORLD_HEX_SCALE = ((24 * Math.sqrt(3)) / 2) * 1.01; // 20.99245579 for HEX_SIZE = 24 (seamless interlocking hexes)

export interface LoadedWorldAsset {
  key: string;
  url: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh: THREE.Mesh;
}

export const WORLD_ASSET_PATHS: Record<string, string> = {
  // Terrain
  hex_grass: '/assets/world/terrain/hex_grass.glb',
  hex_grass_sloped_low: '/assets/world/terrain/hex_grass_sloped_low.glb',
  hex_grass_sloped_high: '/assets/world/terrain/hex_grass_sloped_high.glb',

  // Water & Shorelines
  hex_water: '/assets/world/water/hex_water.glb',
  hex_coast_A: '/assets/world/water/hex_coast_A.glb',
  hex_coast_B: '/assets/world/water/hex_coast_B.glb',
  hex_river_straight: '/assets/world/water/hex_river_straight.glb',
  hex_river_curve: '/assets/world/water/hex_river_curve.glb',
  hex_river_crossing: '/assets/world/water/hex_river_crossing.glb',

  // Roads
  hex_road_straight: '/assets/world/roads/hex_road_straight.glb',
  hex_road_curve: '/assets/world/roads/hex_road_curve.glb',
  hex_road_intersection: '/assets/world/roads/hex_road_intersection.glb',
  hex_road_end: '/assets/world/roads/hex_road_end.glb',

  // Hills & Mountains
  hill_single_A: '/assets/world/nature/hill_single_A.glb',
  hills_A: '/assets/world/nature/hills_A.glb',
  hills_B: '/assets/world/nature/hills_B.glb',
  hills_trees: '/assets/world/nature/hills_trees.glb',
  mountain_A: '/assets/world/nature/mountain_A.glb',
  mountain_B: '/assets/world/nature/mountain_B.glb',
  mountain_C: '/assets/world/nature/mountain_C.glb',
  mountain_grass: '/assets/world/nature/mountain_grass.glb',

  // Trees & Foliage
  trees_large: '/assets/world/nature/trees_large.glb',
  trees_medium: '/assets/world/nature/trees_medium.glb',
  trees_small: '/assets/world/nature/trees_small.glb',
  tree_single_A: '/assets/world/nature/tree_single_A.glb',
  tree_single_B: '/assets/world/nature/tree_single_B.glb',

  // Rocks & Boulders
  rock_single_A: '/assets/world/nature/rock_single_A.glb',
  rock_single_B: '/assets/world/nature/rock_single_B.glb',
  rock_single_C: '/assets/world/nature/rock_single_C.glb',
};

class WorldTerrainAssetService {
  private loader = new GLTFLoader();
  private cache = new Map<string, LoadedWorldAsset>();
  private loadPromise: Promise<Map<string, LoadedWorldAsset>> | null = null;
  private listeners: (() => void)[] = [];

  /**
   * Subscribe to asset loading events to trigger incremental visual populates
   */
  public onAssetLoaded(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe or trigger immediately if assets are already loaded
   */
  public onAssetsReady(callback: () => void): () => void {
    if (this.isReady()) {
      callback();
      return () => {};
    }
    const check = () => {
      if (this.isReady()) {
        callback();
      }
    };
    return this.onAssetLoaded(check);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[WorldTerrainAssetService] Listener error:', err);
      }
    });
  }

  /**
   * Preload all world terrain assets into GPU memory
   */
  public async preloadAll(): Promise<Map<string, LoadedWorldAsset>> {
    if (this.loadPromise) return this.loadPromise;

    if (typeof window === 'undefined') {
      return this.cache;
    }

    this.loadPromise = (async () => {
      const entries = Object.entries(WORLD_ASSET_PATHS);
      const loadPromises = entries.map(async ([key, url]) => {
        try {
          const gltf: GLTF = await new Promise((resolve, reject) => {
            this.loader.load(url, resolve, undefined, reject);
          });

          let foundMesh: THREE.Mesh | null = null;
          gltf.scene.traverse((child) => {
            if (!foundMesh && (child as THREE.Mesh).isMesh) {
              foundMesh = child as THREE.Mesh;
            }
          });

          if (foundMesh) {
            const mesh = foundMesh as THREE.Mesh;
            let finalMat: THREE.Material = mesh.material as THREE.Material;

            // Optimize material properties for vivid medieval landscape
            if (mesh.material) {
              const matList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              matList.forEach((rawMat) => {
                const mat = rawMat as THREE.MeshStandardMaterial;
                mat.roughness = 0.82;
                mat.metalness = 0.04;
                mat.needsUpdate = true;
              });

              // Specialized material enhancements for specific terrain elements
              if (key === 'hex_water') {
                finalMat = new THREE.MeshStandardMaterial({
                  color: 0x1d5fbc,
                  roughness: 0.18,
                  metalness: 0.28,
                  transparent: true,
                  opacity: 0.94,
                });
              }
            }

            this.cache.set(key, {
              key,
              url,
              geometry: mesh.geometry,
              material: finalMat,
              mesh,
            });

            console.log(`[WorldTerrainAssetService] Asset loaded: ${key} (${this.cache.size}/${entries.length})`);
            // Notify listeners that a new asset is available
            this.notifyListeners();
          } else {
            console.warn(`[WorldTerrainAssetService] No mesh found in ${key}`);
          }
        } catch (err) {
          console.warn(`[WorldTerrainAssetService] Failed to load ${key} from ${url}:`, err);
        }
      });

      await Promise.all(loadPromises);
      return this.cache;
    })();

    return this.loadPromise;
  }

  /**
   * Get cached asset if already loaded
   */
  public getAsset(key: string): LoadedWorldAsset | null {
    return this.cache.get(key) || null;
  }

  /**
   * Check if core terrain assets are ready
   */
  public isReady(): boolean {
    const essentialKeys = [
      'hex_grass',
      'hex_water',
      'hex_coast_A',
      'hex_road_straight',
      'mountain_A',
      'mountain_B',
      'mountain_C',
      'trees_large',
      'trees_medium',
      'hills_A',
    ];
    return essentialKeys.every((key) => this.cache.has(key));
  }

  /**
   * Check if a specific asset is loaded
   */
  public hasAsset(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Create an InstancedMesh from a loaded asset key
   */
  public createInstancedMesh(key: string, count: number): THREE.InstancedMesh | null {
    const asset = this.cache.get(key);
    if (!asset || count <= 0) return null;

    const instanced = new THREE.InstancedMesh(asset.geometry, asset.material, count);
    instanced.name = `instanced-${key}`;
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    // CRITICAL: Disable frustum culling so Three.js does not cull the entire instanced mesh
    // based on the single mesh's origin bounding sphere.
    instanced.frustumCulled = false;
    return instanced;
  }
}

export const worldTerrainAssetService = new WorldTerrainAssetService();
