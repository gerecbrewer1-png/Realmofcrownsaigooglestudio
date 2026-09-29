/**
 * REALM OF CROWNS — Chunked HeightMap Core Data Structure
 * Manages Float32Array altitude grid, continuous bilinear sampling, gradient normals, slope, and procedural generation.
 */

import * as pc from 'playcanvas';
import { SimplexNoise } from './SimplexNoise';

export class HeightMap {
  private _data: Float32Array;
  private _width: number;
  private _depth: number;
  private _minHeight = 0;
  private _maxHeight = 10;
  private _dataChunkSize = 33;

  public get data() { return this._data; }
  public get width() { return this._width; }
  public get depth() { return this._depth; }
  public get minHeight() { return this._minHeight; }
  public get maxHeight() { return this._maxHeight; }
  public get dataChunkSize() { return this._dataChunkSize; }

  constructor(width: number, depth: number, maxHeight = 25, dataChunkSize = 33) {
    this._width = width;
    this._depth = depth;
    this._maxHeight = maxHeight;
    this._dataChunkSize = dataChunkSize;
    this._data = new Float32Array(width * depth);
  }

  public get(x: number, z: number): number {
    const cx = Math.max(0, Math.min(this._width - 1, x | 0));
    const cz = Math.max(0, Math.min(this._depth - 1, z | 0));
    return this._data[cz * this._width + cx];
  }

  public set(x: number, z: number, val: number) {
    if (x < 0 || x >= this._width || z < 0 || z >= this._depth) return;
    this._data[z * this._width + x] = val;
    if (val < this._minHeight) this._minHeight = val;
    if (val > this._maxHeight) this._maxHeight = val;
  }

  /**
   * Continuous bilinear interpolation for smooth sub-grid altitude sampling.
   */
  public sampleBilinear(x: number, z: number): number {
    const clampedX = Math.max(0, Math.min(this._width - 1.0001, x));
    const clampedZ = Math.max(0, Math.min(this._depth - 1.0001, z));

    const x0 = Math.floor(clampedX);
    const z0 = Math.floor(clampedZ);
    const x1 = Math.min(this._width - 1, x0 + 1);
    const z1 = Math.min(this._depth - 1, z0 + 1);

    const fx = clampedX - x0;
    const fz = clampedZ - z0;

    const h00 = this._data[z0 * this._width + x0];
    const h10 = this._data[z0 * this._width + x1];
    const h01 = this._data[z1 * this._width + x0];
    const h11 = this._data[z1 * this._width + x1];

    const h0 = h00 * (1.0 - fx) + h10 * fx;
    const h1 = h01 * (1.0 - fx) + h11 * fx;

    return h0 * (1.0 - fz) + h1 * fz;
  }

  /**
   * Fast finite-difference normal calculation at (x, z).
   */
  public getNormal(x: number, z: number, out?: pc.Vec3): pc.Vec3 {
    const res = out || new pc.Vec3();
    const step = 1.0;
    const left = this.sampleBilinear(x - step, z);
    const right = this.sampleBilinear(x + step, z);
    const down = this.sampleBilinear(x, z - step);
    const up = this.sampleBilinear(x, z + step);

    // Normal = cross( (2*step, right-left, 0), (0, up-down, 2*step) )
    res.set(left - right, 2.0 * step, down - up);
    res.normalize();
    return res;
  }

  /**
   * Slope factor from 0.0 (perfectly flat) to 1.0 (vertical shear).
   */
  public getSlope(x: number, z: number): number {
    const n = this.getNormal(x, z);
    return Math.max(0, Math.min(1.0, 1.0 - n.y));
  }

  /**
   * Recalculates bounding min and max altitude across the data set.
   */
  public recalculateMinMax() {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this._data.length; i++) {
      const v = this._data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    this._minHeight = min === Infinity ? 0 : min;
    this._maxHeight = max === -Infinity ? 10 : max;
  }

  /**
   * Generates a multi-octave medieval landscape featuring valleys, riverbeds, and dramatic cliffs.
   */
  public generateProcedural(seed = 42, baseHeight = 0.0, amplitude = 22.0) {
    const noise = new SimplexNoise(seed);
    const halfW = (this._width - 1) / 2;
    const halfD = (this._depth - 1) / 2;

    for (let z = 0; z < this._depth; z++) {
      for (let x = 0; x < this._width; x++) {
        // Local meter coordinates relative to center (0, 0)
        const localX = x - halfW;
        const localZ = z - halfD;
        const distFromCenter = Math.sqrt(localX * localX + localZ * localZ);

        // Low-frequency continent shaping
        const continental = (noise.fbm2D(x * 0.018, z * 0.018, 3, 2.0, 0.5) + 1.0) * 0.5;

        // Mid-frequency mountain ridges & terraces
        const ridges = Math.abs(noise.noise2D(x * 0.04, z * 0.04));
        const terrace = Math.pow(continental, 1.4);

        // High-frequency surface roughness
        const detail = noise.fbm2D(x * 0.09, z * 0.09, 2, 2.0, 0.4) * 0.12;

        // Village sanctuary: flat at y=0 within 25m radius, blending up to full height by 48m
        const innerRadius = 25.0;
        const outerRadius = 48.0;
        const blendNorm = Math.min(1.0, Math.max(0.0, (distFromCenter - innerRadius) / (outerRadius - innerRadius)));
        const smoothSanctuary = blendNorm * blendNorm * (3.0 - 2.0 * blendNorm);

        const h = baseHeight + (terrace * 0.65 + ridges * 0.35 + detail) * amplitude * smoothSanctuary;
        this._data[z * this._width + x] = Math.max(0, h);
      }
    }
    this.recalculateMinMax();
  }

  /**
   * Box/Gaussian smooth filter in a designated local zone.
   */
  public smoothHeightsZone(minX: number, maxX: number, minZ: number, maxZ: number, factor = 0.5) {
    const x0 = Math.max(1, minX);
    const x1 = Math.min(this._width - 2, maxX);
    const z0 = Math.max(1, minZ);
    const z1 = Math.min(this._depth - 2, maxZ);

    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const current = this.get(x, z);
        const avg = (
          this.get(x - 1, z) + this.get(x + 1, z) +
          this.get(x, z - 1) + this.get(x, z + 1)
        ) * 0.25;
        this.set(x, z, current * (1 - factor) + avg * factor);
      }
    }
    this.recalculateMinMax();
  }
}
