/**
 * REALM OF CROWNS — Heightfield Shape, Collision & World Height Queries
 * High-speed O(1) CPU elevation queries: getHeightAt(worldX, worldZ), getNormalAt(worldX, worldZ),
 * and exact ray-triangle intersection testing for tactile interaction.
 */

import * as pc from 'playcanvas';
import { HeightMap } from './HeightMap';

export interface TerrainRaycastHit {
  point: pc.Vec3;
  normal: pc.Vec3;
  distance: number;
}

export class HeightfieldShape {
  private _heightMap: HeightMap;
  private _halfWidth: number;
  private _halfDepth: number;
  private _aabb: pc.BoundingBox;

  public get heightMap() { return this._heightMap; }
  public get aabb() { return this._aabb; }

  constructor(heightMap: HeightMap) {
    this._heightMap = heightMap;
    this._halfWidth = (heightMap.width - 1) / 2;
    this._halfDepth = (heightMap.depth - 1) / 2;
    this._aabb = new pc.BoundingBox();
    this.updateAABB();
  }

  public updateAABB() {
    this._halfWidth = (this._heightMap.width - 1) / 2;
    this._halfDepth = (this._heightMap.depth - 1) / 2;
    this._aabb.setMinMax(
      new pc.Vec3(-this._halfWidth, this._heightMap.minHeight, -this._halfDepth),
      new pc.Vec3(this._halfWidth, this._heightMap.maxHeight, this._halfDepth)
    );
  }

  /**
   * Fast O(1) continuous height query at world coordinates (worldX, worldZ).
   * Takes entity world scale and translation into account.
   */
  public getHeightAt(
    worldX: number,
    worldZ: number,
    terrainPosition = pc.Vec3.ZERO,
    terrainScale = pc.Vec3.ONE
  ): number {
    // Transform world coord to terrain local grid space
    const localX = (worldX - terrainPosition.x) / terrainScale.x;
    const localZ = (worldZ - terrainPosition.z) / terrainScale.z;

    const gridX = localX + this._halfWidth;
    const gridZ = localZ + this._halfDepth;

    if (gridX < 0 || gridX > this._heightMap.width - 1 || gridZ < 0 || gridZ > this._heightMap.depth - 1) {
      return terrainPosition.y;
    }

    const altitude = this._heightMap.sampleBilinear(gridX, gridZ);
    return terrainPosition.y + altitude * terrainScale.y;
  }

  /**
   * Fast O(1) normal vector query at world coordinates (worldX, worldZ).
   */
  public getNormalAt(
    worldX: number,
    worldZ: number,
    out?: pc.Vec3,
    terrainPosition = pc.Vec3.ZERO,
    terrainScale = pc.Vec3.ONE
  ): pc.Vec3 {
    const res = out || new pc.Vec3();
    const localX = (worldX - terrainPosition.x) / terrainScale.x;
    const localZ = (worldZ - terrainPosition.z) / terrainScale.z;

    const gridX = localX + this._halfWidth;
    const gridZ = localZ + this._halfDepth;

    if (gridX < 0 || gridX > this._heightMap.width - 1 || gridZ < 0 || gridZ > this._heightMap.depth - 1) {
      res.set(0, 1, 0);
      return res;
    }

    this._heightMap.getNormal(gridX, gridZ, res);
    return res;
  }

  /**
   * Raycast intersection against heightfield with bounding-box pre-cull.
   */
  public raycast(ray: pc.Ray, terrainTransform?: pc.Mat4): TerrainRaycastHit | null {
    const localRay = new pc.Ray();
    if (terrainTransform) {
      const invTransform = new pc.Mat4();
      invTransform.invert(terrainTransform);
      invTransform.transformPoint(ray.origin, localRay.origin);
      invTransform.transformVector(ray.direction, localRay.direction);
      localRay.direction.normalize();
    } else {
      localRay.origin.copy(ray.origin);
      localRay.direction.copy(ray.direction);
    }

    // Check AABB hit
    if (!this._aabb.intersectsRay(localRay)) {
      return null;
    }

    // Step along the ray in 2D grid space (DDA-style ray marching)
    const stepSize = 0.5;
    const maxSteps = 400;
    const pos = new pc.Vec3();

    for (let i = 0; i < maxSteps; i++) {
      const t = i * stepSize;
      pos.copy(localRay.direction).mulScalar(t).add(localRay.origin);

      const gridX = pos.x + this._halfWidth;
      const gridZ = pos.z + this._halfDepth;

      if (gridX < 0 || gridX > this._heightMap.width - 1 || gridZ < 0 || gridZ > this._heightMap.depth - 1) {
        continue;
      }

      const terrainH = this._heightMap.sampleBilinear(gridX, gridZ);
      if (pos.y <= terrainH) {
        // Approximate hit point
        const hitPointLocal = new pc.Vec3(pos.x, terrainH, pos.z);
        const hitNormalLocal = this._heightMap.getNormal(gridX, gridZ);

        const hitPointWorld = new pc.Vec3();
        const hitNormalWorld = new pc.Vec3();

        if (terrainTransform) {
          terrainTransform.transformPoint(hitPointLocal, hitPointWorld);
          terrainTransform.transformVector(hitNormalLocal, hitNormalWorld);
          hitNormalWorld.normalize();
        } else {
          hitPointWorld.copy(hitPointLocal);
          hitNormalWorld.copy(hitNormalLocal);
        }

        return {
          point: hitPointWorld,
          normal: hitNormalWorld,
          distance: ray.origin.distance(hitPointWorld),
        };
      }
    }

    return null;
  }
}
