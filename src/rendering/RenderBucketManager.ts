import { InstancedMesh, Matrix4, Object3D, BufferGeometry, Material, DynamicDrawUsage } from 'three';

export interface AssetDefinition {
  id: string;
  category: 'STATIC_INSTANCED' | 'DYNAMIC_INSTANCED' | 'UNIQUE' | 'ANIMATED';
  geometry: BufferGeometry;
  material: Material;
}

export class RenderBucket {
  public mesh: InstancedMesh;
  public capacity: number;
  public activeCount: number = 0;
  
  // Mapping from entity ID to instance index
  private entityMap: Map<string, number> = new Map();
  // Mapping from instance index to entity ID
  private indexMap: Map<number, string> = new Map();
  
  private dirtyIndices: Set<number> = new Set();
  
  constructor(public id: string, public def: AssetDefinition, initialCapacity = 256) {
    this.capacity = initialCapacity;
    this.mesh = new InstancedMesh(def.geometry, def.material, this.capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false; // We handle culling externally if needed
  }

  public addEntity(entityId: string, matrix: Matrix4) {
    if (this.entityMap.has(entityId)) return;
    
    if (this.activeCount >= this.capacity) {
      this.resize(this.capacity * 2);
    }
    
    const index = this.activeCount++;
    this.entityMap.set(entityId, index);
    this.indexMap.set(index, entityId);
    
    this.mesh.setMatrixAt(index, matrix);
    this.dirtyIndices.add(index);
  }

  public removeEntity(entityId: string) {
    const index = this.entityMap.get(entityId);
    if (index === undefined) return;

    const lastIndex = this.activeCount - 1;
    if (index !== lastIndex) {
      // Swap with last active instance to keep array packed
      const lastEntityId = this.indexMap.get(lastIndex)!;
      const lastMatrix = new Matrix4();
      this.mesh.getMatrixAt(lastIndex, lastMatrix);
      
      this.mesh.setMatrixAt(index, lastMatrix);
      this.entityMap.set(lastEntityId, index);
      this.indexMap.set(index, lastEntityId);
      this.dirtyIndices.add(index);
    }
    
    this.entityMap.delete(entityId);
    this.indexMap.delete(lastIndex);
    this.activeCount--;
    
    // Hide the removed instance
    const zeroMatrix = new Matrix4().makeScale(0, 0, 0);
    this.mesh.setMatrixAt(lastIndex, zeroMatrix);
    this.dirtyIndices.add(lastIndex);
  }

  public updateTransform(entityId: string, matrix: Matrix4) {
    const index = this.entityMap.get(entityId);
    if (index !== undefined) {
      this.mesh.setMatrixAt(index, matrix);
      this.dirtyIndices.add(index);
    }
  }

  public commit() {
    if (this.dirtyIndices.size > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.dirtyIndices.clear();
    }
    this.mesh.count = this.activeCount;
  }

  private resize(newCapacity: number) {
    const oldMesh = this.mesh;
    this.mesh = new InstancedMesh(this.def.geometry, this.def.material, newCapacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    
    // Copy existing matrices
    for (let i = 0; i < this.activeCount; i++) {
      const mat = new Matrix4();
      oldMesh.getMatrixAt(i, mat);
      this.mesh.setMatrixAt(i, mat);
    }
    
    this.capacity = newCapacity;
    oldMesh.dispose();
  }
}

export class RenderBucketManager {
  public buckets: Map<string, RenderBucket> = new Map();
  public dictionary: Map<string, AssetDefinition> = new Map();

  public registerAsset(def: AssetDefinition) {
    this.dictionary.set(def.id, def);
  }

  public getBucket(assetId: string): RenderBucket | null {
    let bucket = this.buckets.get(assetId);
    if (!bucket) {
      const def = this.dictionary.get(assetId);
      if (def && (def.category === 'STATIC_INSTANCED' || def.category === 'DYNAMIC_INSTANCED')) {
        bucket = new RenderBucket(assetId, def);
        this.buckets.set(assetId, bucket);
      }
    }
    return bucket || null;
  }

  public update() {
    for (const bucket of this.buckets.values()) {
      bucket.commit();
    }
  }
}
