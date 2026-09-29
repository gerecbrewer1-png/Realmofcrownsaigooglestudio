export type NetworkMode = 'baseline' | 'interest' | 'delta' | 'interestDelta' | 'adaptive';

export interface EntityState {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  animState: number;
}

export class Phase8NetworkExperiment {
  private globalEntities: Map<string, EntityState> = new Map();
  private mode: NetworkMode;
  private bandwidthUsageBytes: number = 0;
  
  // Simulated Server State
  private lastSentState: Map<string, any> = new Map();

  constructor(mode: NetworkMode, entityCount: number) {
    this.mode = mode;
    this.initWorld(entityCount);
  }

  private initWorld(count: number) {
    for (let i = 0; i < count; i++) {
      const id = i.toString();
      this.globalEntities.set(id, {
        id,
        x: Math.random() * 10000,
        y: 0,
        z: Math.random() * 10000,
        vx: 0,
        vy: 0,
        vz: 0,
        animState: 0
      });
    }
  }

  public simulateServerTick(playerX: number, playerZ: number, interestRadius: number): ArrayBuffer | any[] {
    let payloadSize = 0;
    const updates: any[] = [];

    this.globalEntities.forEach((entity) => {
      // 1. Interest Management
      if (this.mode === 'interest' || this.mode === 'interestDelta' || this.mode === 'adaptive') {
        const dist = Math.hypot(entity.x - playerX, entity.z - playerZ);
        if (dist > interestRadius) return; // Out of interest
      }

      // 2. Delta Compression
      if (this.mode === 'delta' || this.mode === 'interestDelta' || this.mode === 'adaptive') {
        const last = this.lastSentState.get(entity.id);
        const delta: any = { id: entity.id };
        let hasChanges = false;

        if (!last || last.x !== entity.x || last.z !== entity.z) {
          delta.x = entity.x; delta.z = entity.z;
          hasChanges = true;
        }

        if (hasChanges) {
          updates.push(delta);
          this.lastSentState.set(entity.id, { ...entity });
          payloadSize += 12; // simulated byte size for delta
        }
      } else {
        // Baseline: send full state
        updates.push(entity);
        payloadSize += 32; // simulated byte size for full state
      }
    });

    this.bandwidthUsageBytes += payloadSize;
    return updates; // In real implementation, this returns a binary ArrayBuffer
  }

  public getBandwidthUsage() {
    return this.bandwidthUsageBytes;
  }
}
