/**
 * REALM OF CROWNS — High-Level Terrain System Manager & Engine Bridge
 * Integrates procedural heightmaps, GPU buffer management, quadtree patch LOD,
 * original Realm triplanar cliff shaders, and the 9-biome ecological matrix into PlayCanvas.
 */

import * as pc from 'playcanvas';
import { HeightMap } from './core/HeightMap';
import { GridBuilder } from './core/GridBuilder';
import { HeightfieldShape } from './core/HeightfieldShape';
import { PatchesManager } from './core/PatchesManager';
import { GPUHeightMapBuffer } from './heightfield/GPUHeightMapBuffer';
import { GPUBuffersManager } from './heightfield/GPUBuffersManager';
import { MeshInstanceFactory } from './heightfield/MeshInstanceFactory';
import { BiomeSystem } from './biomes/BiomeSystem';
import { BiomeKey } from './biomes/BiomeTypes';
import { BIOME_DEFINITIONS } from './biomes/BiomeDefinitions';

export interface RealmTerrainOptions {
  width?: number;         // Must satisfy: (width - 1) % (patchSize - 1) == 0
  depth?: number;         // e.g. 129, 257, 513
  patchSize?: number;     // e.g. 17 or 33
  maxHeight?: number;     // Vertical elevation amplitude
  initialBiome?: BiomeKey;// Default 'grasslands' or 'temperate_forest'
  scale?: pc.Vec3;        // World scale (e.g. 1m per grid unit)
}

export class RealmTerrainManager {
  public app: pc.AppBase;
  public entity: pc.Entity;

  // Core Subsystems
  public heightMap: HeightMap;
  public heightfieldShape: HeightfieldShape;
  public gridBuilder: GridBuilder;
  public patchesManager: PatchesManager;
  public biomeSystem: BiomeSystem;

  // GPU Buffers & Rendering
  private _gpuHeightMapBuffer: GPUHeightMapBuffer;
  private _gpuBuffersManager: GPUBuffersManager;
  private _meshInstanceFactory: MeshInstanceFactory;

  // State & Settings
  private _currentBiome: BiomeKey = 'grasslands';
  private _camPosArray = [0, 0, 0];
  private _isDestroyed = false;

  public get currentBiome(): BiomeKey { return this._currentBiome; }

  constructor(app: pc.AppBase, options: RealmTerrainOptions = {}) {
    this.app = app;
    const width = options.width || 129;
    const depth = options.depth || 129;
    const patchSize = options.patchSize || 33;
    const maxHeight = options.maxHeight || 24;
    this._currentBiome = options.initialBiome || 'grasslands';

    // 1. Initialize HeightMap & procedural terrain
    this.heightMap = new HeightMap(width, depth, maxHeight, patchSize);
    this.heightMap.generateProcedural(777, 0.5, maxHeight * 0.85);

    // 2. Build Collision & CPU query shape
    this.heightfieldShape = new HeightfieldShape(this.heightMap);

    // 3. Build LOD Grid & seam indexes
    this.gridBuilder = new GridBuilder({ width, depth, patchSize });

    // 4. Allocate GPU Buffers
    this._gpuHeightMapBuffer = new GPUHeightMapBuffer(this.app, this.heightMap);
    this._gpuBuffersManager = new GPUBuffersManager(this.app.graphicsDevice, this.gridBuilder);
    this._meshInstanceFactory = new MeshInstanceFactory(this.app, this._gpuBuffersManager, this._gpuHeightMapBuffer);

    // 5. Initialize Biome System
    this.biomeSystem = new BiomeSystem(1337);
    this.setBiome(this._currentBiome);

    // 6. Setup Patches Manager & Entity
    this.patchesManager = new PatchesManager(this.app, this.gridBuilder, this.heightMap, 2500);

    this.entity = new pc.Entity('RealmTerrain');
    if (options.scale) {
      this.entity.setLocalScale(options.scale);
    }

    // 7. Instantiate patch MeshInstances and bind to entity render component
    const meshInstances: pc.MeshInstance[] = [];
    const numPatchesX = this.gridBuilder.numPatchesX;
    const numPatchesZ = this.gridBuilder.numPatchesZ;

    for (let pz = 0; pz < numPatchesZ; pz++) {
      for (let px = 0; px < numPatchesX; px++) {
        const minX = px * (patchSize - 1);
        const minZ = pz * (patchSize - 1);
        const mi = this._meshInstanceFactory.createPatchMeshInstance(px, pz, minX, minZ, this.entity);
        meshInstances.push(mi);
        this.patchesManager.registerPatch(px, pz, mi);
      }
    }

    this.entity.addComponent('render', {
      meshInstances: meshInstances,
      castShadows: false,
      receiveShadows: true,
    });
  }

  /**
   * Set active biome to one of the 9 Realm biomes.
   */
  public setBiome(biomeKey: BiomeKey) {
    this._currentBiome = biomeKey;
    const def = BIOME_DEFINITIONS[biomeKey];
    if (def) {
      this._meshInstanceFactory.applyBiomeMaterials(
        def.materials,
        def.temperature,
        def.elevation.slopeThreshold
      );
    }
  }

  /**
   * Continuous world elevation query at (worldX, worldZ).
   */
  public getHeightAt(worldX: number, worldZ: number): number {
    const pos = this.entity.getPosition();
    const scale = this.entity.getLocalScale();
    return this.heightfieldShape.getHeightAt(worldX, worldZ, pos, scale);
  }

  /**
   * Continuous world surface normal query at (worldX, worldZ).
   */
  public getNormalAt(worldX: number, worldZ: number, out?: pc.Vec3): pc.Vec3 {
    const pos = this.entity.getPosition();
    const scale = this.entity.getLocalScale();
    return this.heightfieldShape.getNormalAt(worldX, worldZ, out, pos, scale);
  }

  /**
   * Raycast intersection testing against the terrain.
   */
  public raycast(ray: pc.Ray) {
    return this.heightfieldShape.raycast(ray, this.entity.getWorldTransform());
  }

  /**
   * Called every frame to drive camera tracking, LOD evaluation, and frustum culling.
   */
  public update(dt: number, cameraEntity?: pc.Entity) {
    if (this._isDestroyed) return;

    if (cameraEntity) {
      const camPos = cameraEntity.getPosition();
      this._camPosArray[0] = camPos.x;
      this._camPosArray[1] = camPos.y;
      this._camPosArray[2] = camPos.z;
      this._meshInstanceFactory.material.setParameter('uCameraPos', this._camPosArray);

      const frustum = cameraEntity.camera?.frustum;
      this.patchesManager.update(cameraEntity, frustum, this.entity.getWorldTransform());
    }
  }

  public destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    this._gpuHeightMapBuffer?.destroy();
    this._gpuBuffersManager?.destroy();
    this._meshInstanceFactory?.material?.destroy();
    this.entity?.destroy();
  }
}
