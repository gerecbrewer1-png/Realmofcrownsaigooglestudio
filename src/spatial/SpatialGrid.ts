export class SpatialGrid {
  private cellSize: number;
  // Map of "x,z" to a set of entity IDs
  private cells: Map<string, Set<string>> = new Map();
  // Map of entity ID to their current cell key
  private entityCells: Map<string, string> = new Map();

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  public addEntity(id: string, x: number, z: number) {
    const key = this.getCellKey(x, z);
    this.entityCells.set(id, key);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(id);
  }

  public updateEntity(id: string, x: number, z: number) {
    const newKey = this.getCellKey(x, z);
    const oldKey = this.entityCells.get(id);

    if (oldKey === newKey) return; // Still in same cell

    if (oldKey) {
      this.cells.get(oldKey)?.delete(id);
    }
    
    this.entityCells.set(id, newKey);
    if (!this.cells.has(newKey)) {
      this.cells.set(newKey, new Set());
    }
    this.cells.get(newKey)!.add(id);
  }

  public removeEntity(id: string) {
    const oldKey = this.entityCells.get(id);
    if (oldKey) {
      this.cells.get(oldKey)?.delete(id);
      this.entityCells.delete(id);
    }
  }

  public getVisibleEntities(cameraX: number, cameraZ: number, radius: number): string[] {
    const minCx = Math.floor((cameraX - radius) / this.cellSize);
    const maxCx = Math.floor((cameraX + radius) / this.cellSize);
    const minCz = Math.floor((cameraZ - radius) / this.cellSize);
    const maxCz = Math.floor((cameraZ + radius) / this.cellSize);

    const visibleEntities: string[] = [];
    
    // Cell-level rejection happens implicitly here since we only query the bounding box
    for (let x = minCx; x <= maxCx; x++) {
      for (let z = minCz; z <= maxCz; z++) {
        const key = `${x},${z}`;
        const cell = this.cells.get(key);
        if (cell) {
          visibleEntities.push(...Array.from(cell));
        }
      }
    }

    return visibleEntities;
  }
}
