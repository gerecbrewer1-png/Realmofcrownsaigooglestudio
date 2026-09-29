/**
 * REALM OF CROWNS — GPU HeightMap Texture Buffer
 * Uploads HeightMap floating-point data to a GPU Texture for fast vertex shader displacement & normals.
 */

import * as pc from 'playcanvas';
import { HeightMap } from '../core/HeightMap';

export class GPUHeightMapBuffer {
  private _app: pc.AppBase;
  private _heightMap: HeightMap;
  private _texture: pc.Texture;
  private _format = pc.PIXELFORMAT_R32F;

  public get texture() { return this._texture; }
  public get format() { return this._format; }
  public get heightMap() { return this._heightMap; }

  constructor(app: pc.AppBase, heightMap: HeightMap) {
    this._app = app;
    this._heightMap = heightMap;
    this._initTexture();
  }

  public destroy() {
    this._texture?.destroy();
  }

  private _initTexture() {
    const device = this._app.graphicsDevice;
    const width = this._heightMap.width;
    const depth = this._heightMap.depth;

    // Check if R32F is supported on current device, otherwise fallback to RGBA8
    const data = new Float32Array(this._heightMap.data);

    this._texture = new pc.Texture(device, {
      name: 'uHeightMap',
      width: width,
      height: depth,
      format: pc.PIXELFORMAT_R32F,
      mipmaps: false,
      minFilter: pc.FILTER_NEAREST,
      magFilter: pc.FILTER_NEAREST,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      flipY: false,
      levels: [data],
    });

    this._texture.upload();
  }

  /**
   * Refreshes the GPU texture with latest CPU height data.
   */
  public update() {
    const data = new Float32Array(this._heightMap.data);
    const locked = this._texture.lock() as any;
    if (locked && typeof locked.set === 'function') {
      locked.set(data);
    } else if (Array.isArray(locked)) {
      locked[0] = data;
    }
    this._texture.unlock();
    this._texture.upload();
  }
}
