/**
 * REALM OF CROWNS — Quadtree Patch LOD Estimator & Seam Bitmask Codec
 */

export interface IPatchLodBase {
  core: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface IPatchLod extends IPatchLodBase {
  distance: number;
}

export function getLodId(c: number, l: number, r: number, t: number, b: number): number {
  const lodCore = c + 1;
  const lodBinaryValue = (l << 3) | (r << 2) | (t << 1) | b;
  return lodCore * 16 - lodBinaryValue;
}

export function getLodInfoId(lod: IPatchLodBase): number {
  return getLodId(lod.core, lod.left, lod.right, lod.top, lod.bottom);
}

export function decodeLodId(id: number): IPatchLodBase {
  const cAdjusted = Math.floor(id / 16);
  const binaryPart = id % 16;

  const left = (binaryPart >> 3) & 1;
  const right = (binaryPart >> 2) & 1;
  const top = (binaryPart >> 1) & 1;
  const bottom = binaryPart & 1;
  const core = cAdjusted - 1;

  return { core, left, right, top, bottom };
}

export class LodEstimator {
  private _patchSize: number;
  private _numPatchesX: number;
  private _numPatchesZ: number;
  private _lodCount = 0;

  public get patchSize() { return this._patchSize; }
  public get numPatchesX() { return this._numPatchesX; }
  public get numPatchesZ() { return this._numPatchesZ; }
  public get count() { return this._lodCount; }
  public get max() { return Math.max(0, this._lodCount - 1); }

  constructor(patchSize: number, numPatchesX: number, numPatchesZ: number) {
    this._patchSize = patchSize;
    this._numPatchesX = numPatchesX;
    this._numPatchesZ = numPatchesZ;
    this._calcMaxLOD();
  }

  public setParams(patchSize: number, numPatchesX: number, numPatchesZ: number) {
    this._patchSize = patchSize;
    this._numPatchesX = numPatchesX;
    this._numPatchesZ = numPatchesZ;
    this._calcMaxLOD();
  }

  private _calcMaxLOD() {
    const numSegments = this._patchSize - 1;
    if (numSegments <= 0) {
      this._lodCount = 1;
      return;
    }
    const numSegmentsLog2Floor = Math.floor(Math.log2(numSegments));
    this._lodCount = Math.max(1, numSegmentsLog2Floor);
  }
}
