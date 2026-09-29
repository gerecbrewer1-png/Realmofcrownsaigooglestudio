/**
 * REALM OF CROWNS — Patch Grid & Crackless LOD Index Builder
 * Generates shared index buffers with all 16 seam-stitching permutations per LOD level.
 */

import { BOTTOM, LEFT, LodInfo, RIGHT, TOP, IReadonlyLodInfo } from './LodInfo';
import { LodEstimator } from './LodEstimator';

export interface IGrid {
  readonly width: number;
  readonly depth: number;
}

export interface IGridPatched extends IGrid {
  readonly patchSize: number;
}

export interface IGridPatchedInfo extends IGridPatched {
  readonly numPatchesX: number;
  readonly numPatchesZ: number;
}

export interface IGridPatchedLod extends IGridPatchedInfo {
  readonly lodEstimator: LodEstimator;
  readonly lodInfo: IReadonlyLodInfo[];
}

export class GridBuilder implements IGridPatchedLod {
  private _lodInfo: LodInfo[] = [];
  private _lodEstimator: LodEstimator;
  private _indices: Uint32Array;
  private _width: number;
  private _depth: number;
  private _patchSize: number;
  private _numPatchesX: number;
  private _numPatchesZ: number;

  public get width() { return this._width; }
  public get depth() { return this._depth; }
  public get patchSize() { return this._patchSize; }
  public get numPatchesX() { return this._numPatchesX; }
  public get numPatchesZ() { return this._numPatchesZ; }
  public get maxLOD() { return this._lodEstimator.max; }
  public get lodCount() { return this._lodEstimator.count; }
  public get patchIndices(): Uint32Array { return this._indices; }
  public get lodEstimator() { return this._lodEstimator; }
  public get lodInfo(): IReadonlyLodInfo[] { return this._lodInfo; }

  constructor(grid: IGridPatched) {
    this._width = grid.width;
    this._depth = grid.depth;
    this._patchSize = grid.patchSize;
    this._numPatchesX = Math.floor((this._width - 1) / (this._patchSize - 1));
    this._numPatchesZ = Math.floor((this._depth - 1) / (this._patchSize - 1));

    if ((this._width - 1) % (this._patchSize - 1) !== 0) {
      throw new Error(`Width - 1 (${this._width - 1}) must be divisible by patchSize - 1 (${this._patchSize - 1})`);
    }
    if ((this._depth - 1) % (this._patchSize - 1) !== 0) {
      throw new Error(`Depth - 1 (${this._depth - 1}) must be divisible by patchSize - 1 (${this._patchSize - 1})`);
    }
    if (this._patchSize < 3 || this._patchSize % 2 === 0) {
      throw new Error(`Patch size must be an odd number >= 3 (got ${this._patchSize})`);
    }

    this._lodEstimator = new LodEstimator(this._patchSize, this._numPatchesX, this._numPatchesZ);
    this._lodInfo = new Array(this._lodEstimator.count);
    for (let i = 0; i < this._lodInfo.length; i++) {
      this._lodInfo[i] = new LodInfo();
    }

    const numIndices = this._calcNumIndices();
    this._indices = new Uint32Array(numIndices);
    this._initIndices(this._indices);
  }

  private _calcNumIndices(): number {
    let numQuads = (this.patchSize - 1) ** 2;
    let numIndices = 0;
    const maxPermutationsPerLevel = 16;
    const indicesPerQuad = 6;

    for (let lod = 0; lod < this.lodCount; lod++) {
      numIndices += numQuads * indicesPerQuad * maxPermutationsPerLevel;
      numQuads /= 4;
    }
    return numIndices;
  }

  private _initIndices(indices: Uint32Array): number {
    let index = 0;
    for (let lod = 0; lod < this.lodCount; lod++) {
      index = this._initIndicesLOD(index, indices, lod);
    }
    return index;
  }

  private _initIndicesLOD(index: number, indices: Uint32Array, lod: number): number {
    for (let l = 0; l < LEFT; l++) {
      for (let r = 0; r < RIGHT; r++) {
        for (let t = 0; t < TOP; t++) {
          for (let b = 0; b < BOTTOM; b++) {
            const info = this._lodInfo[lod].info[l][r][t][b];
            const start = index;
            index = this._initIndicesLODSingle(index, indices, lod, lod + l, lod + r, lod + t, lod + b);
            info.start = start;
            info.count = index - start;
          }
        }
      }
    }
    return index;
  }

  private _initIndicesLODSingle(
    index: number,
    indices: Uint32Array,
    lodCore: number,
    lodLeft: number,
    lodRight: number,
    lodTop: number,
    lodBottom: number
  ): number {
    const width = this.patchSize;
    const fanStep = Math.pow(2, lodCore + 1);
    const endPos = this.patchSize - 1 - fanStep;

    for (let z = 0; z <= endPos; z += fanStep) {
      for (let x = 0; x <= endPos; x += fanStep) {
        const lLeft = x === 0 ? lodLeft : lodCore;
        const lRight = x === endPos ? lodRight : lodCore;
        const lBottom = z === 0 ? lodBottom : lodCore;
        const lTop = z === endPos ? lodTop : lodCore;
        index = this._createTriangleFan(index, indices, lodCore, lLeft, lRight, lTop, lBottom, x, z, width);
      }
    }
    return index;
  }

  private _createTriangleFan(
    index: number,
    indices: Uint32Array,
    lodCore: number,
    lodLeft: number,
    lodRight: number,
    lodTop: number,
    lodBottom: number,
    x: number,
    z: number,
    width: number
  ): number {
    const stepLeft = Math.pow(2, lodLeft);
    const stepRight = Math.pow(2, lodRight);
    const stepTop = Math.pow(2, lodTop);
    const stepBottom = Math.pow(2, lodBottom);
    const stepCenter = Math.pow(2, lodCore);

    const indexCenter = (z + stepCenter) * width + x + stepCenter;

    // First up
    let indexTemp1 = z * width + x;
    let indexTemp2 = (z + stepLeft) * width + x;
    index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);

    // Second up
    if (lodLeft === lodCore) {
      indexTemp1 = indexTemp2;
      indexTemp2 += stepLeft * width;
      index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);
    }

    // First right
    indexTemp1 = indexTemp2;
    indexTemp2 += stepTop;
    index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);

    // Second right
    if (lodTop === lodCore) {
      indexTemp1 = indexTemp2;
      indexTemp2 += stepTop;
      index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);
    }

    // First down
    indexTemp1 = indexTemp2;
    indexTemp2 -= stepRight * width;
    index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);

    // Second down
    if (lodRight === lodCore) {
      indexTemp1 = indexTemp2;
      indexTemp2 -= stepRight * width;
      index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);
    }

    // First left
    indexTemp1 = indexTemp2;
    indexTemp2 -= stepBottom;
    index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);

    // Second left
    if (lodBottom === lodCore) {
      indexTemp1 = indexTemp2;
      indexTemp2 -= stepBottom;
      index = this._addTriangle(index, indices, indexCenter, indexTemp1, indexTemp2);
    }

    return index;
  }

  private _addTriangle(index: number, indices: Uint32Array, v1: number, v2: number, v3: number): number {
    indices[index++] = v1;
    indices[index++] = v2;
    indices[index++] = v3;
    return index;
  }
}
