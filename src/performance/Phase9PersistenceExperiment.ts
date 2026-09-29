export type PersistenceMode = 'direct' | 'batched' | 'memory' | 'journal' | 'adaptive';

export type StateClass = 'CRITICAL' | 'IMPORTANT' | 'RECONSTRUCTABLE' | 'EPHEMERAL';

export interface StateChangeEvent {
  entityId: string;
  type: StateClass;
  field: string;
  value: any;
  timestamp: number;
}

export class Phase9PersistenceExperiment {
  private mode: PersistenceMode;
  private changeBuffer: Map<string, StateChangeEvent> = new Map();
  private dbWriteCount: number = 0;
  private dbRowWrites: number = 0;

  constructor(mode: PersistenceMode) {
    this.mode = mode;
  }

  public recordStateChange(event: StateChangeEvent) {
    if (event.type === 'EPHEMERAL') return; // Do not persist

    if (this.mode === 'direct') {
      this.simulateDirectWrite(event);
      return;
    }

    if (this.mode === 'adaptive' || this.mode === 'batched' || this.mode === 'memory') {
      if (event.type === 'CRITICAL') {
        // Critical states written immediately (e.g., currency)
        this.simulateDirectWrite(event);
      } else if (event.type === 'IMPORTANT' || event.type === 'RECONSTRUCTABLE') {
        // Coalescing: Overwrite previous pending changes for the same field
        const key = `${event.entityId}_${event.field}`;
        this.changeBuffer.set(key, event);
      }
    }
  }

  public flushBatch() {
    if (this.changeBuffer.size === 0) return;

    this.dbWriteCount++;
    this.dbRowWrites += this.changeBuffer.size;
    
    // Simulate database latency based on batch size
    const delay = Math.min(10 + this.changeBuffer.size * 0.1, 500); 
    
    this.changeBuffer.clear();
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private simulateDirectWrite(event: StateChangeEvent) {
    this.dbWriteCount++;
    this.dbRowWrites++;
    // Simulate a synchronous DB hit
  }

  public getMetrics() {
    return {
      dbWriteCount: this.dbWriteCount,
      dbRowWrites: this.dbRowWrites,
      pendingQueueSize: this.changeBuffer.size
    };
  }
}
