export type OverdrawMode = 'baseline_painters' | 'hardware_occlusion' | 'depth_prepass' | 'software_occlusion';

export class Phase15ClientOverdrawExperiment {
  private mode: OverdrawMode;
  private pixelDensity: number = 5000; 
  
  public gpuPixelShaderMs: number = 0;
  public gpuDepthPassMs: number = 0;
  public mainThreadMs: number = 0;

  constructor(mode: OverdrawMode, pixels: number = 5000) {
    this.mode = mode;
    this.pixelDensity = pixels;
  }

  public simulateRenderPass() {
    if (this.mode === 'baseline_painters') {
      // GPU draws back-to-front or random order. Pixel shader fires for EVERY character overlapping.
      this.gpuPixelShaderMs = this.pixelDensity * 0.008; // 40ms frame time
    } else if (this.mode === 'hardware_occlusion') {
      // WebGL Occlusion Queries
      // Requires main thread to query the GPU result, halting the pipeline
      this.gpuPixelShaderMs = this.pixelDensity * 0.002;
      this.mainThreadMs = 25; // Pipeline stall
    } else if (this.mode === 'depth_prepass') {
      // Render scene without color first. Then render with color using 'Equal' depth function.
      this.gpuDepthPassMs = 2;
      // Pixel shader ONLY fires for the absolute front-most visible pixel
      this.gpuPixelShaderMs = this.pixelDensity * 0.001; // 5ms frame time
    } else if (this.mode === 'software_occlusion') {
      // CPU calculates what is visible behind buildings
      this.mainThreadMs = 15;
      this.gpuPixelShaderMs = this.pixelDensity * 0.002;
    }
  }

  public getMetrics() {
    return {
      mainThreadMs: this.mainThreadMs,
      gpuDepthPassMs: this.gpuDepthPassMs,
      gpuPixelShaderMs: this.gpuPixelShaderMs,
      totalGpuMs: this.gpuDepthPassMs + this.gpuPixelShaderMs
    };
  }
}
