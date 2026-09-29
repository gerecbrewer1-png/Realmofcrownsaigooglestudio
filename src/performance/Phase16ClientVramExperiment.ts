export type TextureMode = 'baseline_png' | 'jpeg_compression' | 'ktx2_basis';

export class Phase16ClientVramExperiment {
  private mode: TextureMode;
  private numTextures: number = 100; // E.g., 100 unique 4K armor sets
  
  public networkDownloadMb: number = 0;
  public vramUsageMb: number = 0;
  public decodeTimeMs: number = 0;

  constructor(mode: TextureMode, textures: number = 100) {
    this.mode = mode;
    this.numTextures = textures;
  }

  public simulateTextureLoad() {
    if (this.mode === 'baseline_png') {
      // 4K PNG is ~16MB downloaded. 
      // Uncompressed in VRAM (4096 * 4096 * 4 bytes) = 67MB per texture.
      this.networkDownloadMb = this.numTextures * 16; 
      this.vramUsageMb = this.numTextures * 67; // 6.7 GB!
      this.decodeTimeMs = this.numTextures * 150; // Browser unzipping PNG
    } else if (this.mode === 'jpeg_compression') {
      // 4K JPEG is ~2MB downloaded.
      // STILL uncompressed in VRAM (4096 * 4096 * 4 bytes) = 67MB per texture.
      this.networkDownloadMb = this.numTextures * 2; 
      this.vramUsageMb = this.numTextures * 67; // 6.7 GB!
      this.decodeTimeMs = this.numTextures * 50; 
    } else if (this.mode === 'ktx2_basis') {
      // 4K KTX2 is ~2MB downloaded.
      // Stays compressed in VRAM (ASTC/DXT) = ~11MB per texture.
      this.networkDownloadMb = this.numTextures * 2; 
      this.vramUsageMb = this.numTextures * 11; // 1.1 GB.
      this.decodeTimeMs = this.numTextures * 5; // Direct GPU upload, negligible CPU decode
    }
  }

  public getMetrics() {
    return {
      networkMb: this.networkDownloadMb,
      vramMb: this.vramUsageMb,
      decodeMs: this.decodeTimeMs
    };
  }
}
