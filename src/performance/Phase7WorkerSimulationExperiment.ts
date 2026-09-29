export type SimulationMode = 'main' | 'worker' | 'hybrid';

export interface RaycastQuery {
  id: string;
  type: 'RAYCAST';
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
}

export interface WorkerMessage {
  type: 'INIT' | 'UPDATE' | 'RAYCAST_QUERY' | 'SYNC_REGION';
  payload: any;
}

export class Phase7ExperimentHarness {
  private mode: SimulationMode = 'main';
  private worker: Worker | null = null;
  private pendingQueries: Map<string, (result: any) => void> = new Map();

  constructor(mode: SimulationMode) {
    this.mode = mode;
    if (this.mode === 'worker' || this.mode === 'hybrid') {
      this.initWorker();
    }
  }

  private initWorker() {
    // In a real Vite app, this would be new Worker(new URL('./SimulationWorker.ts', import.meta.url))
    this.worker = new Worker('/workers/SimulationWorker.js');
    this.worker.onmessage = (e) => {
      if (e.data.type === 'RAYCAST_RESULT') {
        const resolve = this.pendingQueries.get(e.data.id);
        if (resolve) {
          resolve(e.data.result);
          this.pendingQueries.delete(e.data.id);
        }
      }
    };
  }

  public syncActiveRegion(entities: any[]) {
    if (this.worker) {
      // Send simplified bounding data, NOT Three.js meshes
      const simplified = entities.map(e => ({ id: e.id, x: e.x, y: e.y, z: e.z, radius: e.radius }));
      this.worker.postMessage({ type: 'SYNC_REGION', payload: simplified });
    }
  }

  public async performRaycast(origin: any, direction: any): Promise<any> {
    if (this.mode === 'main') {
      // Simulate expensive main-thread raycast against 100k entities
      return this.simulateMainThreadRaycast(origin, direction);
    } else {
      return new Promise((resolve) => {
        const id = Math.random().toString();
        this.pendingQueries.set(id, resolve);
        this.worker!.postMessage({
          id,
          type: 'RAYCAST_QUERY',
          origin,
          direction
        });
      });
    }
  }

  private simulateMainThreadRaycast(origin: any, direction: any) {
    // Mocking an O(N) main thread freeze
    const start = performance.now();
    while (performance.now() - start < 15) {} // Block for 15ms
    return { hit: true };
  }
}
