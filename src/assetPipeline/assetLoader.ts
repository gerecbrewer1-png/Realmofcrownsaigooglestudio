/**
 * Asynchronous Cached 3D Asset Loader
 * 
 * Supports:
 * - GLB/glTF loading via Three.js / three-stdlib
 * - In-memory template caching to eliminate redundant network downloads
 * - Meshoptimizer (meshopt) decompression integration
 * - Deep cloning (with skeleton/animation support)
 * - Safe procedural fallbacks for planned or missing assets
 * - Comprehensive GPU resource disposal (geometries, textures, materials)
 */

import * as THREE from 'three';
import { GLTF, GLTFLoader, SkeletonUtils } from 'three-stdlib';
import { MeshoptDecoder } from 'meshoptimizer';
import { assetRegistry } from './assetRegistry';
import { AssetMetadata } from './types';

export interface LoadedAssetInstance {
  assetId: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  isFallback: boolean;
}

export type FallbackGenerator = (metadata: AssetMetadata) => THREE.Group;

class AssetLoader {
  private gltfLoader: GLTFLoader;
  private templateCache: Map<string, GLTF> = new Map();
  private pendingPromises: Map<string, Promise<GLTF>> = new Map();
  private fallbackGenerators: Map<string, FallbackGenerator> = new Map();

  constructor() {
    this.gltfLoader = new GLTFLoader();
    
    // Configure MeshoptDecoder if available
    try {
      if (MeshoptDecoder) {
        this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
      }
    } catch {
      // MeshoptDecoder optional init fallback
    }
  }

  /**
   * Registers a procedural generator function for fallbacks
   */
  public registerFallbackGenerator(categoryOrId: string, generator: FallbackGenerator): void {
    this.fallbackGenerators.set(categoryOrId, generator);
  }

  /**
   * Loads a GLTF/GLB by URL with deduplication and caching
   */
  public async loadGLTF(url: string): Promise<GLTF> {
    if (this.templateCache.has(url)) {
      return this.templateCache.get(url)!;
    }

    if (this.pendingPromises.has(url)) {
      return this.pendingPromises.get(url)!;
    }

    const loadPromise = new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.templateCache.set(url, gltf);
          this.pendingPromises.delete(url);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.pendingPromises.delete(url);
          console.warn(`[AssetLoader] Failed to load GLTF at "${url}":`, error);
          reject(error);
        }
      );
    });

    this.pendingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Instantiates an asset by logical ID or alias.
   * If the asset is planned, missing, or fails to load, cleanly executes the procedural fallback.
   */
  public async instantiate(idOrAlias: string): Promise<LoadedAssetInstance> {
    const metadata = assetRegistry.get(idOrAlias);

    if (!metadata) {
      console.warn(`[AssetLoader] Unknown asset "${idOrAlias}", creating default procedural box.`);
      return {
        assetId: idOrAlias,
        scene: this.createGenericFallbackGroup(idOrAlias),
        animations: [],
        isFallback: true,
      };
    }

    // Check if the asset is already marked as procedural fallback or planned
    if (metadata.status === 'procedural_fallback' || metadata.status === 'planned') {
      const fallbackGroup = this.getFallbackGroup(metadata);
      return {
        assetId: metadata.assetId,
        scene: fallbackGroup,
        animations: [],
        isFallback: true,
      };
    }

    try {
      const gltf = await this.loadGLTF(metadata.filePath);
      
      // Clone model (use three-stdlib clone for rigged animated characters or standard clone)
      let clonedScene: THREE.Group;
      if (gltf.animations && gltf.animations.length > 0) {
        clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
      } else {
        clonedScene = gltf.scene.clone(true);
      }

      // Configure shadows
      clonedScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      return {
        assetId: metadata.assetId,
        scene: clonedScene,
        animations: gltf.animations || [],
        isFallback: false,
      };
    } catch {
      console.warn(`[AssetLoader] Asset "${metadata.assetId}" could not be loaded. Routing to procedural fallback.`);
      const fallbackGroup = this.getFallbackGroup(metadata);
      return {
        assetId: metadata.assetId,
        scene: fallbackGroup,
        animations: [],
        isFallback: true,
      };
    }
  }

  /**
   * Retrieves or builds the procedural fallback for an asset
   */
  private getFallbackGroup(metadata: AssetMetadata): THREE.Group {
    // 1. Check specific asset ID generator
    if (this.fallbackGenerators.has(metadata.assetId)) {
      return this.fallbackGenerators.get(metadata.assetId)!(metadata);
    }
    // 2. Check category fallback generator
    if (this.fallbackGenerators.has(metadata.category)) {
      return this.fallbackGenerators.get(metadata.category)!(metadata);
    }
    // 3. Default fallback
    return this.createGenericFallbackGroup(metadata.assetId);
  }

  private createGenericFallbackGroup(assetId: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `fallback-${assetId}`;
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1;
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  /**
   * Comprehensive WebGL resource disposal to prevent GPU memory leaks
   */
  public disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(mesh.material);
          }
        }
      }
    });
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  private disposeMaterial(material: THREE.Material): void {
    material.dispose();
    // Dispose material textures
    const stdMat = material as THREE.MeshStandardMaterial;
    if (stdMat.map) stdMat.map.dispose();
    if (stdMat.normalMap) stdMat.normalMap.dispose();
    if (stdMat.roughnessMap) stdMat.roughnessMap.dispose();
    if (stdMat.metalnessMap) stdMat.metalnessMap.dispose();
    if (stdMat.aoMap) stdMat.aoMap.dispose();
    if (stdMat.emissiveMap) stdMat.emissiveMap.dispose();
  }

  /**
   * Clears in-memory template caches and disposes all cached geometries and textures
   */
  public clearCache(): void {
    this.templateCache.forEach((gltf) => {
      this.disposeObject(gltf.scene);
    });
    this.templateCache.clear();
    this.pendingPromises.clear();
  }
}

export const assetLoader = new AssetLoader();
