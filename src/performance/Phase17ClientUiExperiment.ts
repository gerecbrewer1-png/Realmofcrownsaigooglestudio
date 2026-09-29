export type UiMode = 'baseline_html_dom' | 'html_canvas_2d' | 'webgl_instanced_planes' | 'webgl_sdf_text';

export class Phase17ClientUiExperiment {
  private mode: UiMode;
  private numUiElements: number = 5000; 
  
  public domReflowMs: number = 0;
  public jsUpdateMs: number = 0;
  public gpuRenderMs: number = 0;

  constructor(mode: UiMode, uiElements: number = 5000) {
    this.mode = mode;
    this.numUiElements = uiElements;
  }

  public simulateUiFrame() {
    if (this.mode === 'baseline_html_dom') {
      // 5000 React <div> elements absolute positioned tracking 3D coordinates
      this.jsUpdateMs = this.numUiElements * 0.02; // React reconciliation (~100ms)
      this.domReflowMs = this.numUiElements * 0.05; // Browser Layout & Paint (~250ms!)
      this.gpuRenderMs = 2; // Compositor is fast, but DOM is dead
    } else if (this.mode === 'html_canvas_2d') {
      // One giant absolute positioned <canvas> drawing 5000 strings and rects
      this.jsUpdateMs = this.numUiElements * 0.01; // Canvas API calls (~50ms)
      this.domReflowMs = 0; // No DOM nodes
      this.gpuRenderMs = 5; 
    } else if (this.mode === 'webgl_instanced_planes') {
      // Health bars drawn using a single InstancedMesh inside the 3D scene
      this.jsUpdateMs = this.numUiElements * 0.001; // Updating Float32Array (~5ms)
      this.domReflowMs = 0; 
      this.gpuRenderMs = 1; // 1 Draw Call
    } else if (this.mode === 'webgl_sdf_text') {
      // Nameplates / Damage Numbers drawn using Instanced Signed Distance Fields
      this.jsUpdateMs = this.numUiElements * 0.002; // Updating text buffers (~10ms)
      this.domReflowMs = 0;
      this.gpuRenderMs = 2; // 1 Draw Call
    }
  }

  public getMetrics() {
    return {
      jsUpdateMs: this.jsUpdateMs,
      domReflowMs: this.domReflowMs,
      gpuRenderMs: this.gpuRenderMs,
      totalCpuMs: this.jsUpdateMs + this.domReflowMs
    };
  }
}
