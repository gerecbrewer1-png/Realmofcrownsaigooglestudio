/**
 * REALM OF CROWNS — Patch Quadtree LOD Manager
 * Computes per-patch distance from local camera position and maintains crackless LOD levels across neighbors.
 */

import { LodEstimator, IPatchLod } from './LodEstimator';

export interface ILodState {
  getPatchLod(patchX: number, patchZ: number): IPatchLod;
  getLodForDistance(distance: number): number;
  updatePatchLod(patchX: number, patchZ: number): boolean;
}

export interface IHeightProvider {
  width: number;
  depth: number;
  get(x: number, z: number): number;
}

export class LodState implements ILodState {
  private _zFar: number;
  private _regions: number[];
  private _map: IPatchLod[][];
  private _numPatchesX: number;
  private _numPatchesZ: number;

  public get zFar() { return this._zFar; }
  public get regions() { return this._regions; }

  constructor(numPatchesX: number, numPatchesZ: number, lodCount: number, zFar: number) {
    this._numPatchesX = numPatchesX;
    this._numPatchesZ = numPatchesZ;
    this._zFar = zFar;
    this._regions = new Array<number>(lodCount);

    this._map = new Array(numPatchesX);
    for (let x = 0; x < numPatchesX; x++) {
      this._map[x] = new Array(numPatchesZ);
      for (let z = 0; z < numPatchesZ; z++) {
        this._map[x][z] = {
          distance: 0,
          core: 0,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        };
      }
    }

    this._calcLodRegions();
  }

  public setZFar(zFar: number) {
    this._zFar = zFar;
    this._calcLodRegions();
  }

  private _calcLodRegions() {
    let sum = 0;
    for (let i = 0; i < this._regions.length; i++) {
      sum += i + 1;
    }
    const x = this._zFar / sum;
    let temp = 0;
    for (let i = 0; i < this._regions.length; i++) {
      const curRange = Math.floor(x * (i + 1));
      this._regions[i] = temp + curRange;
      temp += curRange;
    }
  }

  public getPatchLod(patchX: number, patchZ: number): IPatchLod {
    return this._map[patchX][patchZ];
  }

  public getLodForDistance(distance: number): number {
    let lod = this._regions.length - 1;
    for (let i = 0; i < this._regions.length; i++) {
      if (distance < this._regions[i]) {
        lod = i;
        break;
      }
    }
    return lod;
  }

  public updatePatchLod(patchX: number, patchZ: number): boolean {
    const item = this._map[patchX][patchZ];
    const coreLod = item.core;
    let hasChange = false;

    if (patchX > 0) {
      const next = this._map[patchX - 1][patchZ].core > coreLod ? 1 : 0;
      if (item.left !== next) {
        item.left = next;
        hasChange = true;
      }
    }
    if (patchX < this._numPatchesX - 1) {
      const next = this._map[patchX + 1][patchZ].core > coreLod ? 1 : 0;
      if (item.right !== next) {
        item.right = next;
        hasChange = true;
      }
    }
    if (patchZ > 0) {
      const next = this._map[patchX][patchZ - 1].core > coreLod ? 1 : 0;
      if (item.bottom !== next) {
        item.bottom = next;
        hasChange = true;
      }
    }
    if (patchZ < this._numPatchesZ - 1) {
      const next = this._map[patchX][patchZ + 1].core > coreLod ? 1 : 0;
      if (item.top !== next) {
        item.top = next;
        hasChange = true;
      }
    }

    return hasChange;
  }
}

export class LodManager {
  private _states: LodState[] = [];
  private _patchSize: number;
  private _numPatchesX: number;
  private _numPatchesZ: number;
  private _lodCount: number;

  public get patchSize() { return this._patchSize; }
  public get numPatchesX() { return this._numPatchesX; }
  public get numPatchesZ() { return this._numPatchesZ; }
  public get count() { return this._lodCount; }

  constructor(lodEstimator: LodEstimator) {
    this._patchSize = lodEstimator.patchSize;
    this._numPatchesX = lodEstimator.numPatchesX;
    this._numPatchesZ = lodEstimator.numPatchesZ;
    this._lodCount = lodEstimator.count;
  }

  public createState(zFar: number): LodState {
    const state = new LodState(this._numPatchesX, this._numPatchesZ, this._lodCount, zFar);
    this._states.push(state);
    return state;
  }

  public removeState(state: LodState) {
    const idx = this._states.indexOf(state);
    if (idx !== -1) this._states.splice(idx, 1);
  }

  public update(
    localViewPos: { x: number; y: number; z: number },
    heightProvider: IHeightProvider,
    useYPos = true
  ): boolean {
    const a = this._updateLodMapPass1(localViewPos, heightProvider, useYPos);
    const b = this._updateLodMapPass2();
    return a || b;
  }

  private _updateLodMapPass1(
    localViewPos: { x: number; y: number; z: number },
    heightProvider: IHeightProvider,
    useYPos: boolean
  ): boolean {
    const widthM1 = heightProvider.width - 1;
    const depthM1 = heightProvider.depth - 1;
    const patchSizeM1 = this._patchSize - 1;
    const halfWidth = widthM1 / 2;
    const halfDepth = depthM1 / 2;
    const centerStep = Math.floor(this._patchSize / 2);

    let proxyPatchCenterY = 0;
    let hasChange = false;

    if (useYPos) {
      const normalizeCameraX = Math.min(Math.max(localViewPos.x + halfWidth, 0), widthM1);
      const normalizeCameraZ = Math.min(Math.max(localViewPos.z + halfDepth, 0), depthM1);
      const cameraAltitude = heightProvider.get(Math.floor(normalizeCameraX), Math.floor(normalizeCameraZ));
      proxyPatchCenterY = (localViewPos.y - cameraAltitude) ** 2;
    }

    for (let pz = 0; pz < this._numPatchesZ; pz++) {
      for (let px = 0; px < this._numPatchesX; px++) {
        const x = px * patchSizeM1 + centerStep;
        const z = pz * patchSizeM1 + centerStep;

        const patchCenterX = -halfWidth + x;
        const patchCenterZ = -halfDepth + z;
        const distanceToCamera = Math.sqrt(
          (localViewPos.x - patchCenterX) ** 2 +
          (localViewPos.z - patchCenterZ) ** 2 +
          proxyPatchCenterY
        );

        for (const state of this._states) {
          const coreLod = state.getLodForDistance(distanceToCamera);
          const patchLod = state.getPatchLod(px, pz);
          patchLod.distance = distanceToCamera;

          if (patchLod.core !== coreLod) {
            patchLod.core = coreLod;
            hasChange = true;
          }
        }
      }
    }

    return hasChange;
  }

  private _updateLodMapPass2(): boolean {
    let hasChange = false;
    for (let pz = 0; pz < this._numPatchesZ; pz++) {
      for (let px = 0; px < this._numPatchesX; px++) {
        for (const state of this._states) {
          if (state.updatePatchLod(px, pz)) {
            hasChange = true;
          }
        }
      }
    }
    return hasChange;
  }
}
