/**
 * REALM OF CROWNS — Patch LOD Seam Stitching Data
 * Manages the 16 permutations of edge stitching (LEFT, RIGHT, TOP, BOTTOM) for crackless quadtree LODs.
 */

export const LEFT = 2;
export const RIGHT = 2;
export const TOP = 2;
export const BOTTOM = 2;

export interface ISingleLodInfo {
  start: number;
  count: number;
}

export function initInfo(): ISingleLodInfo[][][][] {
  const arr = new Array<ISingleLodInfo[][][]>(LEFT);

  for (let l = 0; l < LEFT; l++) {
    arr[l] = new Array<ISingleLodInfo[][]>(RIGHT);
    for (let r = 0; r < RIGHT; r++) {
      arr[l][r] = new Array<ISingleLodInfo[]>(TOP);
      for (let t = 0; t < TOP; t++) {
        arr[l][r][t] = new Array<ISingleLodInfo>(BOTTOM);
        for (let b = 0; b < BOTTOM; b++) {
          arr[l][r][t][b] = {
            start: 0,
            count: 0,
          };
        }
      }
    }
  }

  return arr;
}

export interface IReadonlyLodInfo {
  info: Readonly<ISingleLodInfo>[][][][];
}

export class LodInfo implements IReadonlyLodInfo {
  public info: ISingleLodInfo[][][][];

  constructor() {
    this.info = initInfo();
  }

  public clear() {
    for (let l = 0; l < LEFT; l++) {
      for (let r = 0; r < RIGHT; r++) {
        for (let t = 0; t < TOP; t++) {
          for (let b = 0; b < BOTTOM; b++) {
            const single = this.info[l][r][t][b];
            single.start = 0;
            single.count = 0;
          }
        }
      }
    }
  }
}
