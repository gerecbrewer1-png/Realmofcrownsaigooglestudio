/**
 * REALM OF CROWNS — Quadtree Patch Culling & LOD Assembly
 * Controls per-patch MeshInstances, dynamic bounding spheres, frustum culling, and LOD seam updates.
 */

import * as pc from 'playcanvas';
import { GridBuilder } from './GridBuilder';
import { HeightMap } from './HeightMap';
import { LodManager, LodState } from './LodManager';
import { ISingleLodInfo } from './LodInfo';
import { IPatchLod } from './LodEstimator';

export interface TerrainPatch {
  patchX: number;
  patchZ: number;
  meshInstance: pc.MeshInstance;
  sphere: pc.BoundingSphere;
  minX: number;
  minZ: number;
}

export class PatchesManager {
  private _app: pc.AppBase;
  private _grid: GridBuilder;
  private _heightMap: HeightMap;
  private _lodManager: LodManager;
  private _lodState: LodState;
  private _patches: TerrainPatch[] = [];
  private _halfWidth: number;
  private _halfDepth: number;

  public get grid() { return this._grid; }
  public get lodManager() { return this._lodManager; }
  public get lodState() { return this._lodState; }
  public get patches() { return this._patches; }

  constructor(app: pc.AppBase, grid: GridBuilder, heightMap: HeightMap, zFar = 2000) {
    this._app = app;
    this._grid = grid;
    this._heightMap = heightMap;
    this._lodManager = new LodManager(grid.lodEstimator);
    this._lodState = this._lodManager.createState(zFar);
    this._halfWidth = (heightMap.width - 1) / 2;
    this._halfDepth = (heightMap.depth - 1) / 2;
  }

  public registerPatch(patchX: number, patchZ: number, meshInstance: pc.MeshInstance): TerrainPatch {
    const patchSize = this._grid.patchSize;
    const minX = patchX * (patchSize - 1);
    const minZ = patchZ * (patchSize - 1);

    // Calculate local bounding sphere
    const halfPatch = (patchSize - 1) / 2;
    const centerX = -this._halfWidth + minX + halfPatch;
    const centerZ = -this._halfDepth + minZ + halfPatch;
    const midY = (this._heightMap.minHeight + this._heightMap.maxHeight) / 2;
    const radius = Math.sqrt(halfPatch * halfPatch * 2 + ((this._heightMap.maxHeight - this._heightMap.minHeight) / 2) ** 2) * 1.15;

    const sphere = new pc.BoundingSphere(new pc.Vec3(centerX, midY, centerZ), radius);

    const patch: TerrainPatch = {
      patchX,
      patchZ,
      meshInstance,
      sphere,
      minX,
      minZ,
    };

    this._patches.push(patch);
    return patch;
  }

  public update(cameraEntity?: pc.Entity, frustum?: pc.Frustum, terrainTransform?: pc.Mat4) {
    if (cameraEntity) {
      const camPos = cameraEntity.getPosition();
      let localCamPos = camPos;
      if (terrainTransform) {
        const inv = new pc.Mat4();
        inv.invert(terrainTransform);
        localCamPos = new pc.Vec3();
        inv.transformPoint(camPos, localCamPos);
      }
      this._lodManager.update(localCamPos, this._heightMap, true);
    }

    // Update each patch visibility and index buffer primitive slice
    const patchSizeM1 = this._grid.patchSize - 1;
    for (let i = 0; i < this._patches.length; i++) {
      const p = this._patches[i];
      const plod = this._lodState.getPatchLod(p.patchX, p.patchZ);

      // Frustum culling
      let visible = true;
      if (frustum) {
        const worldSphere = new pc.BoundingSphere();
        if (terrainTransform) {
          terrainTransform.transformPoint(p.sphere.center, worldSphere.center);
          const scale = terrainTransform.getScale();
          worldSphere.radius = p.sphere.radius * Math.max(scale.x, Math.max(scale.y, scale.z));
        } else {
          worldSphere.center.copy(p.sphere.center);
          worldSphere.radius = p.sphere.radius;
        }
        visible = frustum.containsSphere(worldSphere) > 0;
      }

      p.meshInstance.visible = visible;
      p.meshInstance.visibleThisFrame = visible;

      if (visible) {
        // Query seam-stitched primitive slice
        const info: ISingleLodInfo = this._grid.lodInfo[plod.core].info[plod.left][plod.right][plod.top][plod.bottom];
        const prim = p.meshInstance.mesh.primitive[0];
        prim.base = info.start;
        prim.count = info.count;

        // Set LOD uniform for vertex displacement resolution
        p.meshInstance.setParameter('uPatchLodCore', plod.core);
        p.meshInstance.setParameter('uPatchCoordOffset', [p.minX, p.minZ]);
      }
    }
  }

  public recalculateBoundingSpheres() {
    const patchSize = this._grid.patchSize;
    const halfPatch = (patchSize - 1) / 2;
    const midY = (this._heightMap.minHeight + this._heightMap.maxHeight) / 2;
    const radius = Math.sqrt(halfPatch * halfPatch * 2 + ((this._heightMap.maxHeight - this._heightMap.minHeight) / 2) ** 2) * 1.15;

    for (let i = 0; i < this._patches.length; i++) {
      const p = this._patches[i];
      const minX = p.patchX * (patchSize - 1);
      const minZ = p.patchZ * (patchSize - 1);
      const centerX = -this._halfWidth + minX + halfPatch;
      const centerZ = -this._halfDepth + minZ + halfPatch;
      p.sphere.center.set(centerX, midY, centerZ);
      p.sphere.radius = radius;
    }
  }
}
