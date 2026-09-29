/**
 * REALM OF CROWNS — Terrain MeshInstance Factory
 * Assembles PlayCanvas MeshInstances linked to shared vertex/index buffers and shader parameters.
 */

import * as pc from 'playcanvas';
import { GPUBuffersManager } from './GPUBuffersManager';
import { GPUHeightMapBuffer } from './GPUHeightMapBuffer';
import { RealmTerrainShaders } from '../shaders/RealmTerrainShaders';
import { BiomeMaterialConfig } from '../biomes/BiomeTypes';

export class MeshInstanceFactory {
  private _app: pc.AppBase;
  private _buffersManager: GPUBuffersManager;
  private _heightMapBuffer: GPUHeightMapBuffer;
  private _material!: pc.StandardMaterial;
  private _aabb: pc.BoundingBox;

  public get material() { return this._material; }
  public get aabb() { return this._aabb; }

  constructor(app: pc.AppBase, buffersManager: GPUBuffersManager, heightMapBuffer: GPUHeightMapBuffer) {
    this._app = app;
    this._buffersManager = buffersManager;
    this._heightMapBuffer = heightMapBuffer;
    this._aabb = new pc.BoundingBox();
    this.updateAABB();
    this._initMaterial();
  }

  public updateAABB() {
    const hm = this._heightMapBuffer.heightMap;
    const halfW = (hm.width - 1) / 2;
    const halfD = (hm.depth - 1) / 2;
    this._aabb.setMinMax(
      new pc.Vec3(-halfW, hm.minHeight - 2, -halfD),
      new pc.Vec3(halfW, hm.maxHeight + 5, halfD)
    );
  }

  private _initMaterial() {
    const hm = this._heightMapBuffer.heightMap;
    const patchSize = this._buffersManager.gridBuilder.patchSize;

    this._material = new pc.StandardMaterial();
    this._material.name = 'RealmTerrainTriplanarMaterial';
    this._material.cull = pc.CULLFACE_BACK;
    this._material.useLighting = true;
    this._material.useSkybox = true;
    this._material.diffuse = new pc.Color(0.26, 0.40, 0.18);
    this._material.ambient = new pc.Color(0.15, 0.22, 0.12);
    this._material.shininess = 12;

    // Bind uniforms for shaders that query them
    this._material.setParameter('uHeightMap', this._heightMapBuffer.texture);
    this._material.setParameter('uMaxHeight', hm.maxHeight);
    this._material.setParameter('uMaxAltitude', hm.maxHeight);
    this._material.setParameter('uSlopeThreshold', 0.42);
    this._material.setParameter('uCliffScale', 0.25);
    this._material.setParameter('uGroundScale', 0.12);
    this._material.setParameter('uNoiseScale', 0.08);
    this._material.setParameter('uBiomeTemperature', 0.55);
    this._material.setParameter('uCameraPos', [0, 10, 0]);

    // Initial neutral medieval colors
    this._material.setParameter('uGroundColor', [0.26, 0.40, 0.18]);
    this._material.setParameter('uAccentColor', [0.36, 0.50, 0.22]);
    this._material.setParameter('uCliffColor', [0.38, 0.36, 0.34]);
    this._material.setParameter('uSubSoilColor', [0.28, 0.22, 0.16]);
    this._material.setParameter('uSnowColor', [0.90, 0.94, 0.98]);

    this._material.update();
  }

  public applyBiomeMaterials(matConfig: BiomeMaterialConfig, temperature = 0.55, slopeThreshold = 0.42) {
    this._material.setParameter('uGroundColor', matConfig.groundColor);
    this._material.setParameter('uAccentColor', matConfig.accentColor);
    this._material.setParameter('uCliffColor', matConfig.cliffColor);
    this._material.setParameter('uSubSoilColor', matConfig.subSoilColor);
    this._material.setParameter('uBiomeTemperature', temperature);
    this._material.setParameter('uSlopeThreshold', slopeThreshold);
    this._material.setParameter('uCliffScale', matConfig.cliffScale * 0.04);
    this._material.setParameter('uGroundScale', matConfig.uvScale * 0.015);
  }

  public createPatchMeshInstance(
    patchX: number,
    patchZ: number,
    minX: number,
    minZ: number,
    entity: pc.Entity
  ): pc.MeshInstance {
    const device = this._app.graphicsDevice;
    const patchMesh = new pc.Mesh(device);

    patchMesh.aabb = this._aabb;
    patchMesh.indexBuffer[0] = this._buffersManager.sharedIndexBuffer;
    patchMesh.vertexBuffer = this._buffersManager.sharedVertexBuffer;

    const prim = patchMesh.primitive[0];
    prim.type = pc.PRIMITIVE_TRIANGLES;
    prim.base = 0;
    prim.count = this._buffersManager.gridBuilder.patchIndices.length;
    prim.indexed = true;

    const meshInstance = new pc.MeshInstance(patchMesh, this._material, entity);
    meshInstance.cull = false;
    meshInstance.castShadow = false;
    meshInstance.receiveShadow = true;

    meshInstance.setParameter('uPatchCoordOffset', [minX, minZ]);
    meshInstance.setParameter('uPatchLodCore', 0);

    return meshInstance;
  }
}
