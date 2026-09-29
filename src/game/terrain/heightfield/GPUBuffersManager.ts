/**
 * REALM OF CROWNS — GPU Shared Buffers Manager
 * Allocates single shared vertex buffer and single shared index buffer used by all terrain patches.
 */

import * as pc from 'playcanvas';
import { GridBuilder } from '../core/GridBuilder';

export class GPUBuffersManager {
  private _device: pc.GraphicsDevice;
  private _gridBuilder: GridBuilder;
  private _sharedVertexBuffer!: pc.VertexBuffer;
  private _sharedIndexBuffer!: pc.IndexBuffer;

  public get sharedVertexBuffer() { return this._sharedVertexBuffer; }
  public get sharedIndexBuffer() { return this._sharedIndexBuffer; }
  public get gridBuilder() { return this._gridBuilder; }

  constructor(device: pc.GraphicsDevice, gridBuilder: GridBuilder) {
    this._device = device;
    this._gridBuilder = gridBuilder;
    this._initVertexBuffer();
    this._initIndexBuffer();
  }

  public destroy() {
    this._sharedVertexBuffer?.destroy();
    this._sharedIndexBuffer?.destroy();
  }

  private _initVertexBuffer() {
    const patchSize = this._gridBuilder.patchSize;
    const vertexCount = patchSize * patchSize;

    // Create coords & normals buffer: 3 float32 position + 3 float32 normal per vertex
    const coordsData = new Float32Array(vertexCount * 6);
    let idx = 0;
    for (let z = 0; z < patchSize; z++) {
      for (let x = 0; x < patchSize; x++) {
        // Position
        coordsData[idx++] = x;
        coordsData[idx++] = 0;
        coordsData[idx++] = z;
        // Normal pointing upwards
        coordsData[idx++] = 0;
        coordsData[idx++] = 1;
        coordsData[idx++] = 0;
      }
    }

    const formatDesc = [
      {
        semantic: pc.SEMANTIC_POSITION,
        components: 3,
        type: pc.TYPE_FLOAT32,
        normalize: false,
      },
      {
        semantic: pc.SEMANTIC_NORMAL,
        components: 3,
        type: pc.TYPE_FLOAT32,
        normalize: false,
      },
    ];

    const vertexFormat = new pc.VertexFormat(this._device, formatDesc, vertexCount);
    this._sharedVertexBuffer = new pc.VertexBuffer(this._device, vertexFormat, vertexCount, {
      usage: pc.BUFFER_STATIC,
      data: coordsData.buffer,
    });
  }

  private _initIndexBuffer() {
    const patchIndices = this._gridBuilder.patchIndices;
    this._sharedIndexBuffer = new pc.IndexBuffer(
      this._device,
      pc.INDEXFORMAT_UINT32,
      patchIndices.length,
      pc.BUFFER_STATIC,
      patchIndices,
      { storage: false }
    );
  }
}
