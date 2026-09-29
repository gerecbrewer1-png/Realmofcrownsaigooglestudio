export type AssetStatus = 'UNKNOWN' | 'REQUESTED' | 'LOADING' | 'DECODING' | 'READY' | 'WARM' | 'EVICTABLE';
export type AssetPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'PREFETCH';

export interface AssetManifestEntry {
  id: string;
  url: string;
  type: 'GLTF' | 'TEXTURE' | 'AUDIO';
  status: AssetStatus;
  priority: AssetPriority;
  sizeBytes?: number;
  lastUsedTime: number;
}

export class AssetStreamingManager {
  private manifest: Map<string, AssetManifestEntry> = new Map();
  private cache: Map<string, any> = new Map();
  private maxFrameBudgetMs: number = 2.0; // Allowed background work time
  
  // Predict movement
  public updatePlayerVector(currentCellX: number, currentCellZ: number, velocityX: number, velocityZ: number) {
    // Generate prefetch cone based on velocity
    const predictedX = currentCellX + Math.sign(velocityX);
    const predictedZ = currentCellZ + Math.sign(velocityZ);
    this.queuePrefetchForCell(predictedX, predictedZ);
  }

  private queuePrefetchForCell(x: number, z: number) {
    // Lookup required assets for predicted cell
    const requiredAssets = this.getAssetsForCell(x, z);
    for (const assetId of requiredAssets) {
      const entry = this.manifest.get(assetId);
      if (entry && entry.status === 'UNKNOWN') {
        entry.status = 'REQUESTED';
        entry.priority = 'PREFETCH';
      }
    }
  }

  // Called each frame with remaining budget
  public processStreamingQueue(remainingFrameTimeMs: number) {
    if (remainingFrameTimeMs <= 0) return;

    let timeSpent = 0;
    const start = performance.now();

    // 1. Process CRITICAL (must block if needed, but try to avoid)
    // 2. Process HIGH
    // 3. Process PREFETCH only if time remains
    for (const [id, entry] of this.manifest.entries()) {
      if (timeSpent >= this.maxFrameBudgetMs) break;

      if (entry.status === 'REQUESTED' && (entry.priority === 'PREFETCH' || entry.priority === 'HIGH')) {
        this.startLoad(entry);
        timeSpent = performance.now() - start;
      }
    }
    
    this.manageCacheMemory();
  }

  private startLoad(entry: AssetManifestEntry) {
    entry.status = 'LOADING';
    // Mock async load
    setTimeout(() => {
      entry.status = 'READY';
      entry.lastUsedTime = performance.now();
      this.cache.set(entry.id, { /* mock data */ });
    }, Math.random() * 200 + 50);
  }

  private manageCacheMemory() {
    // Evict COLD/EVICTABLE assets if memory budget exceeded
    const now = performance.now();
    for (const [id, entry] of this.manifest.entries()) {
      if (entry.status === 'READY' && (now - entry.lastUsedTime > 30000)) {
        entry.status = 'EVICTABLE';
        this.cache.delete(id);
        // dispose three.js resources here
      }
    }
  }

  private getAssetsForCell(x: number, z: number): string[] {
    // Mock lookup
    return [`tree_${x}_${z}`, `rock_${x}_${z}`];
  }
}
