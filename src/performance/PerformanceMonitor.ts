export class PerformanceMonitor {
  static frameCount = 0;
  static lastTime = performance.now();
  static history: number[] = [];
  static fps = 0;
  static worstFrame = 0;
  static buckets = {
    under8: 0,
    under16: 0,
    under25: 0,
    under33: 0,
    under50: 0,
    under100: 0,
    over100: 0
  };
  static entities = 0;
  static drawCalls = 0;
  static triangles = 0;
  
  static update() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.history.push(delta);
    if (this.history.length > 300) this.history.shift();
    
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      const sum = this.history.reduce((a,b) => a+b, 0);
      this.fps = 1000 / (sum / this.history.length);
      this.worstFrame = Math.max(...this.history);
    }
    
    if (delta < 8.33) this.buckets.under8++;
    else if (delta < 16.67) this.buckets.under16++;
    else if (delta < 25) this.buckets.under25++;
    else if (delta < 33.33) this.buckets.under33++;
    else if (delta < 50) this.buckets.under50++;
    else if (delta < 100) this.buckets.under100++;
    else this.buckets.over100++;
    
    // Make available globally for testing
    (window as any).perfStats = {
      fps: this.fps,
      worst: this.worstFrame,
      buckets: this.buckets,
      entities: this.entities,
      drawCalls: this.drawCalls,
      triangles: this.triangles
    };
  }
}
