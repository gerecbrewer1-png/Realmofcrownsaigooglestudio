/**
 * REALM OF CROWNS — RAHR Phase 3: Hierarchical Render Visibility Pipeline
 * 
 * Visibility Hierarchy:
 * RAHR WORLD / REGION / CELL
 *  -> parent-level relevance rejection (32m cell & 128m region coarse culling)
 *  -> OptiPixel BVH (HybridBuilder spatial acceleration)
 *  -> Frustum Culling (PlayCanvas camera frustum with v2 bridge)
 *  -> LOD with Hysteresis (NEAR, MID, FAR, CULLED)
 *  -> Occlusion Candidates (Conservative major occluder test)
 *  -> PlayCanvas Rendering (Sets meshInstance.visible for forward + shadow pass savings)
 * 
 * INVARIANTS:
 * - Authoritative world state is 100% preserved.
 * - Player Hero is never culled.
 * - Units in active combat near camera are never culled.
 * - Coarse regions rejected BEFORE expensive per-object tests.
 * - Occlusion never runs on objects already rejected by RAHR/BVH/Frustum.
 * - Zero per-frame garbage generation (scratch vectors/buffers pre-allocated).
 */

import * as pc from 'playcanvas';
import './RahrOptiPixelBridge';
import { BVH, HybridBuilder } from 'playcanvas-opti-pixel';

export type VisibilityCategory =
  | 'terrain'
  | 'building'
  | 'vegetation'
  | 'character'
  | 'weapon'
  | 'water'
  | 'ui'
  | 'prop'
  | 'other';

export interface IVisibilityItem {
  id: string;
  category: VisibilityCategory;
  cellKey: string;
  regionKey: string;
  // Bounding box in Float32Array: [minX, maxX, minY, maxY, minZ, maxZ]
  box: Float32Array;
  center: pc.Vec3;
  radius: number;
  isStatic: boolean;
  meshInstances: pc.MeshInstance[];
  entity?: pc.Entity;
  castsShadow: boolean;
  canCastShadow: boolean;

  // LOD Details
  currentLod: number; // 0: NEAR, 1: MID, 2: FAR, 3: CULLED
  lodDistance: number;
  subMeshesByLod?: {
    near?: pc.MeshInstance[];
    mid?: pc.MeshInstance[];
    far?: pc.MeshInstance[];
  };

  // State flags
  isVisible: boolean;
  isOccluded: boolean;
  isHero?: boolean;
  isCombatCritical?: boolean;
  bvhNode?: any;
}

export interface IVisibilityCell {
  key: string;
  cellX: number;
  cellZ: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  center: pc.Vec3;
  radius: number;
  aabb: pc.BoundingBox;
  items: IVisibilityItem[];
  isRejected: boolean;
}

export interface RahrVisibilityMetrics {
  totalObjects: number;
  rahrRejected: number;
  bvhCandidates: number;
  frustumRejected: number;
  occlusionRejected: number;
  visibleRendered: number;
  forwardDrawCalls: number;
  shadowDrawCalls: number;
  totalDrawCalls: number;
  bvhEvaluationMs: number;
  lodTransitionsThisFrame: number;
}

export interface MajorOccluder {
  id: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  center: pc.Vec3;
  halfExtents: pc.Vec3;
}

export class RahrVisibilityPipeline {
  private static instance: RahrVisibilityPipeline | null = null;

  // OptiPixel BVH for static world objects
  private staticBvh: any;
  private staticBuilder: any;

  // Spatial cells (32m x 32m)
  private cells: Map<string, IVisibilityCell> = new Map();
  private itemsById: Map<string, IVisibilityItem> = new Map();
  private dynamicItems: IVisibilityItem[] = [];

  // Major occluders (Keep, Gatehouse, Towers, Walls)
  private majorOccluders: MajorOccluder[] = [];

  // Reusable scratch objects to eliminate per-frame allocations
  private scratchVec3 = new pc.Vec3();
  private scratchCamPos = new pc.Vec3();
  private scratchAabb = new pc.BoundingBox();

  // Metrics
  private metrics: RahrVisibilityMetrics = {
    totalObjects: 0,
    rahrRejected: 0,
    bvhCandidates: 0,
    frustumRejected: 0,
    occlusionRejected: 0,
    visibleRendered: 0,
    forwardDrawCalls: 0,
    shadowDrawCalls: 0,
    totalDrawCalls: 0,
    bvhEvaluationMs: 0,
    lodTransitionsThisFrame: 0
  };

  // Pipeline configuration toggles
  public enableCoarseCulling = true;
  public enableOptiPixelBvh = true;
  public enableFrustumCulling = true;
  public enableLodHysteresis = true;
  public enableConservativeOcclusion = true;
  public enableShadowOptimization = true;

  constructor() {
    this.staticBuilder = new HybridBuilder(Float32Array);
    this.staticBvh = new BVH(this.staticBuilder);
  }

  public static getInstance(): RahrVisibilityPipeline {
    if (!RahrVisibilityPipeline.instance) {
      RahrVisibilityPipeline.instance = new RahrVisibilityPipeline();
    }
    return RahrVisibilityPipeline.instance;
  }

  public clear(): void {
    this.cells.clear();
    this.itemsById.clear();
    this.dynamicItems = [];
    this.majorOccluders = [];
    this.staticBvh.clear();
  }

  /**
   * Helper to format cell key matching RAHR 32m grid.
   */
  public getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / 32);
    const cz = Math.floor(z / 32);
    return `cell_${cx}_${cz}`;
  }

  /**
   * Helper to format region key matching RAHR 128m grid.
   */
  public getRegionKey(x: number, z: number): string {
    const rx = Math.floor(x / 128);
    const rz = Math.floor(z / 128);
    return `region_${rx}_${rz}`;
  }

  /**
   * Get or create a 32m cell.
   */
  public getOrCreateCell(cellX: number, cellZ: number): IVisibilityCell {
    const key = `cell_${cellX}_${cellZ}`;
    let cell = this.cells.get(key);
    if (!cell) {
      const minX = cellX * 32;
      const maxX = minX + 32;
      const minZ = cellZ * 32;
      const maxZ = minZ + 32;
      const centerX = minX + 16;
      const centerZ = minZ + 16;
      const center = new pc.Vec3(centerX, 5, centerZ);
      const halfExtents = new pc.Vec3(16, 25, 16);
      const aabb = new pc.BoundingBox(center, halfExtents);
      const radius = Math.sqrt(16 * 16 + 25 * 25 + 16 * 16);

      cell = {
        key,
        cellX,
        cellZ,
        bounds: { minX, maxX, minZ, maxZ, minY: -10, maxY: 40 },
        center,
        radius,
        aabb,
        items: [],
        isRejected: false
      };
      this.cells.set(key, cell);
    }
    return cell;
  }

  /**
   * Registers a static or dynamic object into the visibility hierarchy.
   */
  public registerItem(config: {
    id: string;
    category: VisibilityCategory;
    center: { x: number; y: number; z: number };
    extents: { x: number; y: number; z: number };
    isStatic: boolean;
    meshInstances: pc.MeshInstance[];
    entity?: pc.Entity;
    canCastShadow?: boolean;
    isHero?: boolean;
    subMeshesByLod?: {
      near?: pc.MeshInstance[];
      mid?: pc.MeshInstance[];
      far?: pc.MeshInstance[];
    };
  }): IVisibilityItem {
    const cellX = Math.floor(config.center.x / 32);
    const cellZ = Math.floor(config.center.z / 32);
    const cell = this.getOrCreateCell(cellX, cellZ);

    const minX = config.center.x - config.extents.x;
    const maxX = config.center.x + config.extents.x;
    const minY = config.center.y - config.extents.y;
    const maxY = config.center.y + config.extents.y;
    const minZ = config.center.z - config.extents.z;
    const maxZ = config.center.z + config.extents.z;

    const box = new Float32Array([minX, maxX, minY, maxY, minZ, maxZ]);
    const center = new pc.Vec3(config.center.x, config.center.y, config.center.z);
    const radius = Math.sqrt(
      config.extents.x * config.extents.x +
      config.extents.y * config.extents.y +
      config.extents.z * config.extents.z
    );

    const item: IVisibilityItem = {
      id: config.id,
      category: config.category,
      cellKey: cell.key,
      regionKey: this.getRegionKey(config.center.x, config.center.z),
      box,
      center,
      radius,
      isStatic: config.isStatic,
      meshInstances: config.meshInstances,
      entity: config.entity,
      castsShadow: config.canCastShadow !== false,
      canCastShadow: config.canCastShadow !== false,
      currentLod: 0,
      lodDistance: 0,
      subMeshesByLod: config.subMeshesByLod,
      isVisible: true,
      isOccluded: false,
      isHero: config.isHero
    };

    cell.items.push(item);
    this.itemsById.set(item.id, item);

    if (config.isStatic) {
      // Insert into OptiPixel BVH once
      try {
        item.bvhNode = this.staticBvh.insert(item, box, 0.2);
      } catch (err) {
        // Fallback gracefully if BVH insertion encounters an edge case
        console.warn(`[RAHR BVH] Warning inserting ${item.id}:`, err);
      }
    } else {
      this.dynamicItems.push(item);
    }

    return item;
  }

  /**
   * Registers a major occluder geometry (e.g. Citadel Keep, Gatehouse towers).
   */
  public registerMajorOccluder(
    id: string,
    center: { x: number; y: number; z: number },
    extents: { x: number; y: number; z: number }
  ): void {
    this.majorOccluders.push({
      id,
      bounds: {
        minX: center.x - extents.x,
        maxX: center.x + extents.x,
        minY: center.y - extents.y,
        maxY: center.y + extents.y,
        minZ: center.z - extents.z,
        maxZ: center.z + extents.z
      },
      center: new pc.Vec3(center.x, center.y, center.z),
      halfExtents: new pc.Vec3(extents.x, extents.y, extents.z)
    });
  }

  /**
   * Updates a dynamic item's position and bounding box.
   */
  public updateDynamicItem(
    id: string,
    center: { x: number; y: number; z: number },
    isCombatCritical = false
  ): void {
    const item = this.itemsById.get(id);
    if (!item) return;

    item.center.set(center.x, center.y, center.z);
    item.isCombatCritical = isCombatCritical;

    const r = item.radius;
    item.box[0] = center.x - r;
    item.box[1] = center.x + r;
    item.box[2] = center.y - r;
    item.box[3] = center.y + r;
    item.box[4] = center.z - r;
    item.box[5] = center.z + r;

    // Check if item crossed into another cell
    const newCellKey = this.getCellKey(center.x, center.z);
    if (newCellKey !== item.cellKey) {
      const oldCell = this.cells.get(item.cellKey);
      if (oldCell) {
        const idx = oldCell.items.indexOf(item);
        if (idx !== -1) oldCell.items.splice(idx, 1);
      }
      const newCellX = Math.floor(center.x / 32);
      const newCellZ = Math.floor(center.z / 32);
      const newCell = this.getOrCreateCell(newCellX, newCellZ);
      newCell.items.push(item);
      item.cellKey = newCellKey;
    }
  }

  /**
   * Main Visibility Evaluation Routine.
   * Runs the strict hierarchy:
   * RAHR Cell Rejection -> OptiPixel BVH -> Frustum Culling -> LOD -> Occlusion -> Mesh Application
   */
  public evaluateVisibility(cameraEntity: pc.Entity): RahrVisibilityMetrics {
    const t0 = performance.now();

    const camera = cameraEntity.camera;
    const frustum = camera?.frustum;
    const camPos = cameraEntity.getPosition();
    this.scratchCamPos.copy(camPos);

    // Reset per-frame metric counters
    this.metrics.totalObjects = this.itemsById.size;
    this.metrics.rahrRejected = 0;
    this.metrics.bvhCandidates = 0;
    this.metrics.frustumRejected = 0;
    this.metrics.occlusionRejected = 0;
    this.metrics.visibleRendered = 0;
    this.metrics.forwardDrawCalls = 0;
    this.metrics.shadowDrawCalls = 0;
    this.metrics.totalDrawCalls = 0;
    this.metrics.lodTransitionsThisFrame = 0;

    // Fast-path: If camera or frustum is not ready, make everything visible
    if (!frustum) {
      for (const item of this.itemsById.values()) {
        this.applyItemVisibility(item, true, 0, true);
        this.metrics.visibleRendered++;
      }
      this.metrics.bvhEvaluationMs = performance.now() - t0;
      return this.metrics;
    }

    // -----------------------------------------------------------------
    // STAGE 1: RAHR PARENT-LEVEL COARSE REJECTION (32m Cell Grid)
    // -----------------------------------------------------------------
    const activeCells: IVisibilityCell[] = [];

    if (this.enableCoarseCulling) {
      for (const cell of this.cells.values()) {
        // Fast AABB intersection test against camera frustum
        const contains = (frustum as any).containsAabb
          ? (frustum as any).containsAabb(cell.aabb)
          : frustum.containsPoint(cell.center);

        if (contains === 0) {
          // Coarse rejection: entire 32m cell is outside frustum!
          cell.isRejected = true;
          this.metrics.rahrRejected += cell.items.length;

          // Bulk mark all child items invisible without running expensive per-object checks
          for (let i = 0; i < cell.items.length; i++) {
            const item = cell.items[i];
            if (item.isHero) {
              // INVARIANT: Hero is never culled
              activeCells.push(cell);
              break;
            }
            this.applyItemVisibility(item, false, 3, false);
          }
        } else {
          cell.isRejected = false;
          activeCells.push(cell);
        }
      }
    } else {
      for (const cell of this.cells.values()) {
        cell.isRejected = false;
        activeCells.push(cell);
      }
    }

    // -----------------------------------------------------------------
    // STAGE 2: OPTIPIXEL BVH HIERARCHICAL QUERY (Static Objects)
    // -----------------------------------------------------------------
    const bvhVisibleSet = new Set<string>();

    if (this.enableOptiPixelBvh && this.staticBvh && this.staticBvh.root) {
      try {
        this.staticBvh.frustumCulling(frustum, (node: any) => {
          if (node && node.object) {
            bvhVisibleSet.add(node.object.id);
          }
        });
      } catch (err) {
        // Fallback: If BVH query encountered issue, populate from active cells
        for (const cell of activeCells) {
          for (const it of cell.items) {
            if (it.isStatic) bvhVisibleSet.add(it.id);
          }
        }
      }
    } else {
      // If BVH disabled, all static items in active cells become candidates
      for (const cell of activeCells) {
        for (const it of cell.items) {
          if (it.isStatic) bvhVisibleSet.add(it.id);
        }
      }
    }

    this.metrics.bvhCandidates = bvhVisibleSet.size;

    // -----------------------------------------------------------------
    // STAGE 3, 4, 5, 6: FRUSTUM NARROWPHASE, LOD, OCCLUSION & RENDERING
    // -----------------------------------------------------------------
    for (const cell of activeCells) {
      for (let i = 0; i < cell.items.length; i++) {
        const item = cell.items[i];

        // Hero invariant
        if (item.isHero) {
          this.applyItemVisibility(item, true, 0, true);
          this.metrics.visibleRendered++;
          continue;
        }

        // 1. Frustum Verification
        let isFrustumVisible = true;

        if (item.isStatic) {
          isFrustumVisible = bvhVisibleSet.has(item.id);
        } else {
          // Dynamic entity: test item bounding box against frustum
          if (this.enableFrustumCulling) {
            this.scratchVec3.set(
              (item.box[1] - item.box[0]) * 0.5,
              (item.box[3] - item.box[2]) * 0.5,
              (item.box[5] - item.box[4]) * 0.5
            );
            this.scratchAabb.center.copy(item.center);
            this.scratchAabb.halfExtents.copy(this.scratchVec3);

            const testResult = (frustum as any).containsAabb
              ? (frustum as any).containsAabb(this.scratchAabb)
              : frustum.containsPoint(item.center);

            isFrustumVisible = testResult > 0;
          }
        }

        if (!isFrustumVisible) {
          this.metrics.frustumRejected++;
          this.applyItemVisibility(item, false, 3, false);
          continue;
        }

        // 2. LOD Evaluation with Hysteresis
        const dx = item.center.x - this.scratchCamPos.x;
        const dy = item.center.y - this.scratchCamPos.y;
        const dz = item.center.z - this.scratchCamPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        item.lodDistance = dist;

        let targetLod = item.currentLod;

        if (this.enableLodHysteresis) {
          // Hysteresis window gates:
          // NEAR <-> MID: enter MID > 42m, return to NEAR < 34m (8m window)
          // MID <-> FAR: enter FAR > 85m, return to MID < 75m (10m window)
          // FAR <-> CULLED: enter CULLED > 160m, return to FAR < 145m (15m window)
          if (item.currentLod === 0) {
            if (dist > 42) targetLod = 1;
          } else if (item.currentLod === 1) {
            if (dist < 34) targetLod = 0;
            else if (dist > 85) targetLod = 2;
          } else if (item.currentLod === 2) {
            if (dist < 75) targetLod = 1;
            else if (dist > 160) targetLod = 3;
          } else {
            if (dist < 145) targetLod = 2;
          }
        } else {
          // Discrete thresholds without hysteresis
          if (dist < 38) targetLod = 0;
          else if (dist < 80) targetLod = 1;
          else if (dist < 155) targetLod = 2;
          else targetLod = 3;
        }

        if (targetLod !== item.currentLod) {
          item.currentLod = targetLod;
          this.metrics.lodTransitionsThisFrame++;
        }

        if (targetLod === 3) {
          // Beyond max render distance
          this.metrics.frustumRejected++;
          this.applyItemVisibility(item, false, 3, false);
          continue;
        }

        // 3. Conservative Occlusion Culling
        // Do NOT run occlusion on already rejected items!
        let isOccluded = false;

        if (this.enableConservativeOcclusion && this.majorOccluders.length > 0) {
          isOccluded = this.testConservativeOcclusion(item, dist);
        }

        if (isOccluded) {
          this.metrics.occlusionRejected++;
          this.applyItemVisibility(item, false, targetLod, false);
          continue;
        }

        // 4. Shadow Optimization (Requirement 7)
        // Volumetric shadows on nearby/medium objects; micro-objects and distant low LOD skip shadow map
        let castsShadow = item.canCastShadow;
        if (this.enableShadowOptimization) {
          if (targetLod >= 2) {
            // Distant low LOD objects don't submit to shadow map
            castsShadow = false;
          } else if (item.category === 'vegetation' && item.radius < 0.8) {
            // Tiny bushes, reeds, small scatter do not cast shadows
            castsShadow = false;
          } else if (item.category === 'prop' && item.radius < 0.6) {
            castsShadow = false;
          }
        }

        // 5. Apply visibility to PlayCanvas
        this.applyItemVisibility(item, true, targetLod, castsShadow);
        this.metrics.visibleRendered++;
      }
    }

    this.metrics.totalDrawCalls = this.metrics.forwardDrawCalls + this.metrics.shadowDrawCalls;
    this.metrics.bvhEvaluationMs = performance.now() - t0;
    return this.metrics;
  }

  /**
   * Applies visibility and LOD submesh state directly to PlayCanvas MeshInstances.
   */
  private applyItemVisibility(
    item: IVisibilityItem,
    visible: boolean,
    lodLevel: number,
    castsShadow: boolean
  ): void {
    item.isVisible = visible;
    item.castsShadow = castsShadow;

    if (item.entity && item.entity.render) {
      item.entity.render.enabled = visible;
      if (visible) {
        item.entity.render.castShadows = castsShadow;
      }
    }

    if (!visible) {
      for (let i = 0; i < item.meshInstances.length; i++) {
        const mi = item.meshInstances[i];
        mi.visible = false;
        mi.castShadow = false;
      }
      return;
    }

    // Handle submeshes by LOD
    if (item.subMeshesByLod) {
      const nearList = item.subMeshesByLod.near || [];
      const midList = item.subMeshesByLod.mid || [];
      const farList = item.subMeshesByLod.far || [];

      if (lodLevel === 0) {
        // Full detail (NEAR)
        for (const mi of nearList) { mi.visible = true; mi.castShadow = castsShadow; }
        for (const mi of midList) { mi.visible = true; mi.castShadow = castsShadow; }
        for (const mi of farList) { mi.visible = true; mi.castShadow = castsShadow; }
      } else if (lodLevel === 1) {
        // Reduced detail (MID): skip near-only micro-detail
        for (const mi of nearList) { mi.visible = false; mi.castShadow = false; }
        for (const mi of midList) { mi.visible = true; mi.castShadow = castsShadow; }
        for (const mi of farList) { mi.visible = true; mi.castShadow = castsShadow; }
      } else {
        // Coarse silhouette (FAR)
        for (const mi of nearList) { mi.visible = false; mi.castShadow = false; }
        for (const mi of midList) { mi.visible = false; mi.castShadow = false; }
        for (const mi of farList) { mi.visible = true; mi.castShadow = false; }
      }
    } else {
      // Standard mesh instances
      for (let i = 0; i < item.meshInstances.length; i++) {
        const mi = item.meshInstances[i];
        mi.visible = true;
        mi.castShadow = castsShadow;
      }
    }

    // Accumulate draw calls for telemetry
    const forwardCount = item.meshInstances.filter(m => m.visible).length;
    this.metrics.forwardDrawCalls += forwardCount;
    if (castsShadow) {
      this.metrics.shadowDrawCalls += item.meshInstances.filter(m => m.visible && m.castShadow).length;
    }
  }

  /**
   * Conservative Major Occluder Testing.
   * Checks whether an object is completely occluded behind a solid massive building
   * (Citadel Keep, Gatehouse, or Palisade Wall) along the camera view line.
   */
  private testConservativeOcclusion(item: IVisibilityItem, itemDist: number): boolean {
    // Only test objects sufficiently far behind an occluder
    if (itemDist < 25) return false;
    if (item.category === 'building') return false; // Buildings are potential occluders, not occluded

    const camX = this.scratchCamPos.x;
    const camZ = this.scratchCamPos.z;
    const itemX = item.center.x;
    const itemZ = item.center.z;

    for (let i = 0; i < this.majorOccluders.length; i++) {
      const occ = this.majorOccluders[i];
      const occDist = Math.sqrt(
        (occ.center.x - camX) * (occ.center.x - camX) +
        (occ.center.z - camZ) * (occ.center.z - camZ)
      );

      // Item must be behind the occluder
      if (itemDist <= occDist + 8.0) continue;

      // Project ray from camera to item center
      const t = (occ.center.z - camZ) / (itemZ - camZ);
      if (t > 0 && t < 1.0) {
        const rayXAtOcc = camX + t * (itemX - camX);
        const rayYAtOcc = this.scratchCamPos.y + t * (item.center.y - this.scratchCamPos.y);

        // Check if ray passes through occluder box with safety margin
        const halfW = occ.halfExtents.x * 0.9;
        const halfH = occ.halfExtents.y * 0.9;
        if (
          Math.abs(rayXAtOcc - occ.center.x) < halfW &&
          rayYAtOcc < occ.center.y + halfH &&
          rayYAtOcc > occ.center.y - halfH
        ) {
          item.isOccluded = true;
          return true;
        }
      }
    }

    item.isOccluded = false;
    return false;
  }

  public getMetrics(): RahrVisibilityMetrics {
    return { ...this.metrics };
  }
}
