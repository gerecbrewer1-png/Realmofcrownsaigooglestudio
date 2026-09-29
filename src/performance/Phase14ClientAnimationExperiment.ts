export type ClientAnimationMode = 'baseline_threejs' | 'web_worker_matrices' | 'gpu_instanced_skinning' | 'gpu_compute_shader';

export class Phase14ClientAnimationExperiment {
  private mode: ClientAnimationMode;
  private numEntities: number = 5000;
  
  public jsMainThreadMs: number = 0;
  public webWorkerMs: number = 0;
  public gpuUploadMs: number = 0;

  constructor(mode: ClientAnimationMode, entities: number = 5000) {
    this.mode = mode;
    this.numEntities = entities;
  }

  public simulateClientFrame() {
    if (this.mode === 'baseline_threejs') {
      // Three.js loops through 5000 Skeletons and updates matrices on the main thread
      this.jsMainThreadMs = this.numEntities * 0.02; // ~100ms
    } else if (this.mode === 'web_worker_matrices') {
      // Offload matrix math to a background Web Worker
      this.webWorkerMs = this.numEntities * 0.015;
      // Main thread still needs to upload matrix data to the GPU each frame
      this.jsMainThreadMs = this.numEntities * 0.005; // ~25ms
      this.gpuUploadMs = 2; 
    } else if (this.mode === 'gpu_instanced_skinning') {
      // Main thread only passes state (e.g., anim_index, time) in a Float32Array
      this.jsMainThreadMs = this.numEntities * 0.001; // ~5ms
      // Vertex shader calculates bone positions on the fly via bone texture lookups
      this.gpuUploadMs = 1;
    } else if (this.mode === 'gpu_compute_shader') {
      // WebGPU Compute Shader generates all matrices directly in VRAM
      this.jsMainThreadMs = 0.5; // negligible main thread CPU
      this.gpuUploadMs = 0.5;
    }
  }

  public getMetrics() {
    return {
      mainThreadMs: this.jsMainThreadMs,
      workerMs: this.webWorkerMs,
      gpuUploadMs: this.gpuUploadMs
    };
  }
}
