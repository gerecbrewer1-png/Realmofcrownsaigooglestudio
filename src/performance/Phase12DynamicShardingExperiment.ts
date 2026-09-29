export type BalanceMode = 'static' | 'rebalance' | 'subdivide' | 'steal' | 'adaptive';

export interface DynamicZone {
  id: string;
  entities: Set<string>;
  workerId: number;
  cpuLoad: number;
}

export class Phase12DynamicShardingExperiment {
  private mode: BalanceMode;
  private zones: Map<string, DynamicZone> = new Map();
  private numWorkers: number = 4;
  private migrationOverheadMs: number = 0;

  constructor(mode: BalanceMode, numWorkers: number = 4) {
    this.mode = mode;
    this.numWorkers = numWorkers;
    this.initializeZones();
  }

  private initializeZones() {
    for (let i = 0; i < 16; i++) {
      const zoneId = `zone_${i}`;
      this.zones.set(zoneId, {
        id: zoneId,
        entities: new Set(),
        workerId: i % this.numWorkers,
        cpuLoad: 0
      });
    }
  }

  public simulateHotspotMigration(migratingEntities: number) {
    // Simulate all entities crowding into zone_0
    const hotZone = this.zones.get('zone_0')!;
    hotZone.cpuLoad = migratingEntities;

    // Orchestrator Tick
    if (this.mode === 'rebalance') {
      this.rebalanceWholeZones();
    } else if (this.mode === 'subdivide') {
      this.recursiveSubdivide(hotZone);
    } else if (this.mode === 'steal') {
      this.workerStealing(hotZone);
    } else if (this.mode === 'adaptive') {
      // Use rebalance for minor imbalance, subdivide for extreme
      if (hotZone.cpuLoad > 2000) {
        this.recursiveSubdivide(hotZone);
      } else {
        this.rebalanceWholeZones();
      }
    }
  }

  private rebalanceWholeZones() {
    // Moves non-hot zones to other workers to free up the hot worker
    this.migrationOverheadMs += 2; 
  }

  private recursiveSubdivide(zone: DynamicZone) {
    // Splits a hot zone into 4 smaller zones and reassigns them
    // Expensive snapshot and serialization overhead
    this.migrationOverheadMs += 15; 
  }

  private workerStealing(zone: DynamicZone) {
    // Idle workers compute collisions for the hot zone via shared memory/IPC
    // High synchronization overhead
    this.migrationOverheadMs += 8;
  }

  public getMetrics() {
    return {
      migrationLatencyMs: this.migrationOverheadMs,
      orchestratorOverheadMs: 1.5,
    };
  }
}
