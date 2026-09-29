/**
 * Realm of Crowns - Voyage 2D Spatial Hash Grid (Phase 2.6)
 * 
 * Replaces O(N^2) exhaustive entity-to-entity distance scanning with O(1) spatial bucket lookups.
 * Designed for large fleets (100 to 1000+ ships) with zero per-query heap allocations.
 */

export interface SpatialEntity {
  id: string;
  x: number;
  z: number;
  radius: number;
  faction?: string;
  isPirate?: boolean;
  userData?: any;
}

export class VoyageSpatialGrid {
  private cellSize: number;
  private invCellSize: number;
  // Key: string bucket "cellX,cellZ" -> Set of entity IDs
  private buckets: Map<string, Set<string>> = new Map();
  // Key: entity ID -> SpatialEntity
  private entityMap: Map<string, SpatialEntity> = new Map();
  // Key: entity ID -> current bucket key
  private entityBucketMap: Map<string, string> = new Map();

  // Reusable query buffer to prevent garbage collection during runtime queries
  private queryBuffer: SpatialEntity[] = [];

  constructor(cellSize = 150) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
  }

  private hash(cx: number, cz: number): string {
    return cx + ',' + cz;
  }

  private getCellCoord(val: number): number {
    return Math.floor(val * this.invCellSize);
  }

  /**
   * Inserts or updates an entity in the spatial grid.
   */
  public updateEntity(entity: SpatialEntity): void {
    const cx = this.getCellCoord(entity.x);
    const cz = this.getCellCoord(entity.z);
    const newKey = this.hash(cx, cz);
    const oldKey = this.entityBucketMap.get(entity.id);

    this.entityMap.set(entity.id, entity);

    if (oldKey === newKey) {
      return; // Still in the same grid cell
    }

    // Remove from previous cell
    if (oldKey) {
      const oldBucket = this.buckets.get(oldKey);
      if (oldBucket) {
        oldBucket.delete(entity.id);
        if (oldBucket.size === 0) {
          this.buckets.delete(oldKey);
        }
      }
    }

    // Add to new cell
    let newBucket = this.buckets.get(newKey);
    if (!newBucket) {
      newBucket = new Set();
      this.buckets.set(newKey, newBucket);
    }
    newBucket.add(entity.id);
    this.entityBucketMap.set(entity.id, newKey);
  }

  /**
   * Removes an entity from the grid.
   */
  public removeEntity(id: string): void {
    const key = this.entityBucketMap.get(id);
    if (key) {
      const bucket = this.buckets.get(key);
      if (bucket) {
        bucket.delete(id);
        if (bucket.size === 0) {
          this.buckets.delete(key);
        }
      }
      this.entityBucketMap.delete(id);
    }
    this.entityMap.delete(id);
  }

  /**
   * Queries all entities within a given radius of (x, z).
   * Populates and returns the internal reusable query buffer to eliminate heap allocations.
   */
  public queryRadius(x: number, z: number, radius: number): SpatialEntity[] {
    this.queryBuffer.length = 0;
    const r2 = radius * radius;

    const minCx = this.getCellCoord(x - radius);
    const maxCx = this.getCellCoord(x + radius);
    const minCz = this.getCellCoord(z - radius);
    const maxCz = this.getCellCoord(z + radius);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.hash(cx, cz);
        const bucket = this.buckets.get(key);
        if (!bucket) continue;

        for (const id of bucket) {
          const entity = this.entityMap.get(id);
          if (!entity) continue;

          const dx = entity.x - x;
          const dz = entity.z - z;
          if (dx * dx + dz * dz <= r2) {
            this.queryBuffer.push(entity);
          }
        }
      }
    }

    return this.queryBuffer;
  }

  /**
   * Finds the single nearest entity matching an optional filter within maxRadius.
   */
  public queryNearest(
    x: number,
    z: number,
    maxRadius: number,
    filter?: (e: SpatialEntity) => boolean
  ): { entity: SpatialEntity; distance: number } | null {
    const candidates = this.queryRadius(x, z, maxRadius);
    if (candidates.length === 0) return null;

    let nearest: SpatialEntity | null = null;
    let minD2 = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      if (filter && !filter(e)) continue;

      const dx = e.x - x;
      const dz = e.z - z;
      const d2 = dx * dx + dz * dz;

      if (d2 < minD2) {
        minD2 = d2;
        nearest = e;
      }
    }

    return nearest ? { entity: nearest, distance: Math.sqrt(minD2) } : null;
  }

  /**
   * Clears the grid completely.
   */
  public clear(): void {
    this.buckets.clear();
    this.entityMap.clear();
    this.entityBucketMap.clear();
    this.queryBuffer.length = 0;
  }

  public getEntityCount(): number {
    return this.entityMap.size;
  }
}
