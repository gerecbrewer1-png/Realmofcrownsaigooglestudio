export type PartitionMode = 'single' | '2-region' | '4-region' | '8-region' | 'adaptive';

export interface PartitionEntity {
  id: string;
  x: number;
  z: number;
  regionId: number;
  authorityServerId: string;
}

export class Phase10DistributedServerExperiment {
  private mode: PartitionMode;
  private servers: Map<string, Set<string>> = new Map();
  private entities: Map<string, PartitionEntity> = new Map();
  
  // Metrics
  public handoffCount: number = 0;
  public crossRegionMessages: number = 0;
  public maxSimulationTickMs: Map<string, number> = new Map();

  constructor(mode: PartitionMode, numServers: number) {
    this.mode = mode;
    for (let i = 0; i < numServers; i++) {
      this.servers.set(`server_${i}`, new Set());
      this.maxSimulationTickMs.set(`server_${i}`, 0);
    }
  }

  public getRegionForPosition(x: number, z: number): number {
    if (this.mode === 'single') return 0;
    if (this.mode === '2-region') return x < 5000 ? 0 : 1;
    if (this.mode === '4-region') {
      const col = x < 5000 ? 0 : 1;
      const row = z < 5000 ? 0 : 1;
      return row * 2 + col;
    }
    return 0; // Simplified
  }

  public simulateEntityMove(entityId: string, newX: number, newZ: number) {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const oldRegion = entity.regionId;
    const newRegion = this.getRegionForPosition(newX, newZ);

    if (oldRegion !== newRegion) {
      this.performHandoff(entity, oldRegion, newRegion);
    }
    
    entity.x = newX;
    entity.z = newZ;
  }

  private performHandoff(entity: PartitionEntity, oldRegion: number, newRegion: number) {
    this.handoffCount++;
    const oldServer = `server_${oldRegion}`;
    const newServer = `server_${newRegion}`;
    
    // Simulate async handoff protocol
    this.servers.get(oldServer)?.delete(entity.id);
    this.servers.get(newServer)?.add(entity.id);
    entity.regionId = newRegion;
    entity.authorityServerId = newServer;
  }

  public simulateServerTick() {
    this.servers.forEach((entitySet, serverId) => {
      // Simulate O(N) spatial interaction cost (e.g. collision, AI targeting)
      // If 5000 entities are in one server, tick time explodes
      const n = entitySet.size;
      const tickCostMs = n * Math.log10(n + 1) * 0.005; 
      this.maxSimulationTickMs.set(serverId, tickCostMs);
    });
  }
}
