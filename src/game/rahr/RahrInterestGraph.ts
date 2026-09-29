/**
 * REALM OF CROWNS — RAHR (Realm Adaptive Hierarchical Runtime)
 * Phase 2: Hierarchical Interest Graph
 * 
 * Hierarchy:
 * WORLD
 *  -> REGION (128m x 128m - aligns with Realm quadtree terrain)
 *      -> CELL / SECTOR (32m x 32m - aligns with 33x33 terrain patch grid)
 *          -> GROUP (Squads, Formations, Herds, Settlements)
 *              -> ENTITY (Soldiers, NPCs, Wildlife, Raiders, Hero)
 * 
 * HIERARCHY FIRST RULE:
 * If a parent region/cell/group is irrelevant, do not iterate all children
 * just to discover they are irrelevant. Track parent-level rejection counts.
 */

import {
  RahrSimulationTier,
  RahrEntityKind,
  RahrGroupKind,
  RahrPosition,
  RahrEntityRecord,
  RahrGroupRecord,
  RahrCellRecord,
  RahrRegionRecord,
  RahrHysteresisThresholds,
  DEFAULT_RAHR_THRESHOLDS
} from './RahrTypes';

export class RahrInterestGraph {
  public readonly cellSize = 32.0;   // 32m per cell (matches terrain patch size 33)
  public readonly regionSize = 128.0; // 128m per region (4x4 cells)

  private thresholds: RahrHysteresisThresholds;

  // Authoritative state stores
  private entities = new Map<string, RahrEntityRecord>();
  private groups = new Map<string, RahrGroupRecord>();
  private cells = new Map<string, RahrCellRecord>();
  private regions = new Map<string, RahrRegionRecord>();

  // Spatial lookups
  private entityList: RahrEntityRecord[] = [];
  private groupList: RahrGroupRecord[] = [];

  // Metrics counters for the current frame
  public regionsEvaluated = 0;
  public regionsRejected = 0;
  public cellsEvaluated = 0;
  public cellsRejected = 0;
  public groupsEvaluated = 0;
  public groupsRejected = 0;
  public entitiesDetailedEval = 0;

  public t0Count = 0;
  public t1Count = 0;
  public t2Count = 0;
  public t3Count = 0;
  public t4Count = 0;

  // Stride bucket assignment counter (0..3)
  private nextBucket = 0;

  constructor(thresholds: RahrHysteresisThresholds = DEFAULT_RAHR_THRESHOLDS) {
    this.thresholds = { ...thresholds };
  }

  // --- REGISTRATION & AUTHORITATIVE WORLD STATE ---

  public registerEntity(
    id: string,
    kind: RahrEntityKind,
    pos: RahrPosition,
    groupId: string | null = null,
    isPlayerControlled = false
  ): RahrEntityRecord {
    let record = this.entities.get(id);
    if (!record) {
      const bucket = this.nextBucket++ % 4;
      record = {
        id,
        kind,
        position: { x: pos.x, y: pos.y, z: pos.z },
        tier: isPlayerControlled ? RahrSimulationTier.T0_FULL : RahrSimulationTier.T1_REDUCED,
        prevTier: isPlayerControlled ? RahrSimulationTier.T0_FULL : RahrSimulationTier.T1_REDUCED,
        tierChangeTimestamp: performance.now(),
        isPlayerControlled,
        isCombatCritical: false,
        lastCombatTimestamp: 0,
        hasActiveOrder: false,
        regionKey: '',
        cellKey: '',
        groupId,
        bucket,
        accumulatedDelta: 0,
        animFrameSkipCounter: 0
      };
      this.entities.set(id, record);
      this.entityList.push(record);
    } else {
      record.position.x = pos.x;
      record.position.y = pos.y;
      record.position.z = pos.z;
      record.groupId = groupId;
      record.isPlayerControlled = isPlayerControlled;
    }

    if (groupId) {
      const grp = this.groups.get(groupId);
      if (grp && !grp.memberIds.includes(id)) {
        grp.memberIds.push(id);
      }
    }

    this.assignSpatialHierarchy(record);
    return record;
  }

  public registerGroup(
    id: string,
    kind: RahrGroupKind,
    center: RahrPosition,
    radius = 12.0
  ): RahrGroupRecord {
    let group = this.groups.get(id);
    if (!group) {
      const bucket = this.nextBucket++ % 6;
      group = {
        id,
        kind,
        center: { x: center.x, y: center.y, z: center.z },
        radius,
        tier: RahrSimulationTier.T0_FULL,
        prevTier: RahrSimulationTier.T0_FULL,
        memberIds: [],
        bucket,
        isEvaluated: false,
        isRejected: false,
        accumulatedDelta: 0
      };
      this.groups.set(id, group);
      this.groupList.push(group);
    } else {
      group.center.x = center.x;
      group.center.y = center.y;
      group.center.z = center.z;
      group.radius = radius;
    }

    const cellKey = this.getCellKey(center.x, center.z);
    const cell = this.getOrCreateCell(cellKey, center.x, center.z);
    if (!cell.groupIds.includes(id)) {
      cell.groupIds.push(id);
    }

    return group;
  }

  public removeEntity(id: string): void {
    const record = this.entities.get(id);
    if (!record) return;

    if (record.cellKey) {
      const cell = this.cells.get(record.cellKey);
      if (cell) {
        const idx = cell.entityIds.indexOf(id);
        if (idx !== -1) cell.entityIds.splice(idx, 1);
      }
    }

    if (record.groupId) {
      const grp = this.groups.get(record.groupId);
      if (grp) {
        const idx = grp.memberIds.indexOf(id);
        if (idx !== -1) grp.memberIds.splice(idx, 1);
      }
    }

    this.entities.delete(id);
    const listIdx = this.entityList.findIndex(e => e.id === id);
    if (listIdx !== -1) this.entityList.splice(listIdx, 1);
  }

  public getEntity(id: string): RahrEntityRecord | undefined {
    return this.entities.get(id);
  }

  public getGroup(id: string): RahrGroupRecord | undefined {
    return this.groups.get(id);
  }

  public getAllEntities(): RahrEntityRecord[] {
    return this.entityList;
  }

  public getAllGroups(): RahrGroupRecord[] {
    return this.groupList;
  }

  public updateEntityPosition(id: string, x: number, y: number, z: number): void {
    const record = this.entities.get(id);
    if (!record) return;

    record.position.x = x;
    record.position.y = y;
    record.position.z = z;

    const newCellKey = this.getCellKey(x, z);
    if (newCellKey !== record.cellKey) {
      // Remove from previous cell
      if (record.cellKey) {
        const prevCell = this.cells.get(record.cellKey);
        if (prevCell) {
          const idx = prevCell.entityIds.indexOf(id);
          if (idx !== -1) prevCell.entityIds.splice(idx, 1);
        }
      }
      this.assignSpatialHierarchy(record);
    }
  }

  public updateGroupCenter(id: string, x: number, y: number, z: number): void {
    const group = this.groups.get(id);
    if (!group) return;
    group.center.x = x;
    group.center.y = y;
    group.center.z = z;
  }

  public setCombatCritical(id: string, isCritical: boolean): void {
    const record = this.entities.get(id);
    if (record) {
      record.isCombatCritical = isCritical;
      if (isCritical) {
        record.lastCombatTimestamp = performance.now();
        record.tier = RahrSimulationTier.T0_FULL;
      }
    }
  }

  // --- SPATIAL HIERARCHY MAPPING ---

  private getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}_${cz}`;
  }

  private getRegionKey(x: number, z: number): string {
    const rx = Math.floor(x / this.regionSize);
    const rz = Math.floor(z / this.regionSize);
    return `${rx}_${rz}`;
  }

  private getOrCreateCell(key: string, x: number, z: number): RahrCellRecord {
    let cell = this.cells.get(key);
    if (!cell) {
      const cx = Math.floor(x / this.cellSize);
      const cz = Math.floor(z / this.cellSize);
      const minX = cx * this.cellSize;
      const minZ = cz * this.cellSize;
      const maxX = minX + this.cellSize;
      const maxZ = minZ + this.cellSize;

      cell = {
        key,
        cellX: cx,
        cellZ: cz,
        bounds: { minX, minZ, maxX, maxZ },
        center: { x: (minX + maxX) * 0.5, y: 0, z: (minZ + maxZ) * 0.5 },
        tier: RahrSimulationTier.T1_REDUCED,
        entityIds: [],
        groupIds: [],
        isEvaluated: false,
        isRejected: false
      };
      this.cells.set(key, cell);

      // Bind to region
      const regKey = this.getRegionKey(x, z);
      const region = this.getOrCreateRegion(regKey, x, z);
      if (!region.cellKeys.includes(key)) {
        region.cellKeys.push(key);
      }
    }
    return cell;
  }

  private getOrCreateRegion(key: string, x: number, z: number): RahrRegionRecord {
    let region = this.regions.get(key);
    if (!region) {
      const rx = Math.floor(x / this.regionSize);
      const rz = Math.floor(z / this.regionSize);
      const minX = rx * this.regionSize;
      const minZ = rz * this.regionSize;
      const maxX = minX + this.regionSize;
      const maxZ = minZ + this.regionSize;

      region = {
        key,
        regionX: rx,
        regionZ: rz,
        bounds: { minX, minZ, maxX, maxZ },
        center: { x: (minX + maxX) * 0.5, y: 0, z: (minZ + maxZ) * 0.5 },
        tier: RahrSimulationTier.T1_REDUCED,
        cellKeys: [],
        isEvaluated: false,
        isRejected: false
      };
      this.regions.set(key, region);
    }
    return region;
  }

  private assignSpatialHierarchy(record: RahrEntityRecord): void {
    const cellKey = this.getCellKey(record.position.x, record.position.z);
    const regionKey = this.getRegionKey(record.position.x, record.position.z);

    record.cellKey = cellKey;
    record.regionKey = regionKey;

    const cell = this.getOrCreateCell(cellKey, record.position.x, record.position.z);
    if (!cell.entityIds.includes(record.id)) {
      cell.entityIds.push(record.id);
    }
  }

  // --- HIERARCHY-FIRST RELEVANCE EVALUATION WITH HYSTERESIS ---

  /**
   * Evaluates interest graph relevance from the focus position (player hero / camera).
   * Executes HIERARCHY FIRST:
   * 1. Check Region bounds. If region is beyond active radius, reject region and mark all contents dormant.
   * 2. If region is relevant, check Cells. If cell is distant, reject detailed entity checks.
   * 3. For groups (formations, herds), evaluate group centroid tier. If group is in T2, members inherit group tier.
   * 4. Detailed per-entity evaluations run only for non-rejected, active entities with hysteresis.
   */
  public evaluateInterest(focusPos: RahrPosition, now: number = performance.now()): void {
    // Reset frame counters
    this.regionsEvaluated = 0;
    this.regionsRejected = 0;
    this.cellsEvaluated = 0;
    this.cellsRejected = 0;
    this.groupsEvaluated = 0;
    this.groupsRejected = 0;
    this.entitiesDetailedEval = 0;

    this.t0Count = 0;
    this.t1Count = 0;
    this.t2Count = 0;
    this.t3Count = 0;
    this.t4Count = 0;

    const fx = focusPos.x;
    const fz = focusPos.z;

    // --- STEP 1: REGION EVALUATION (HIERARCHY FIRST) ---
    for (const region of this.regions.values()) {
      this.regionsEvaluated++;
      const minDistanceSq = this.getMinDistanceSqToBounds(region.bounds, fx, fz);

      // If entire region is beyond T3/T4 dormant boundary (170m^2 = 28900), reject region immediately!
      if (minDistanceSq > this.thresholds.t3_to_t4 * this.thresholds.t3_to_t4) {
        region.tier = RahrSimulationTier.T4_DORMANT;
        region.isRejected = true;
        this.regionsRejected++;

        // Fast mark all children dormant without detailed per-entity distance tests
        for (let i = 0; i < region.cellKeys.length; i++) {
          const cell = this.cells.get(region.cellKeys[i]);
          if (cell) {
            cell.tier = RahrSimulationTier.T4_DORMANT;
            cell.isRejected = true;
            this.cellsRejected++;
            for (let j = 0; j < cell.entityIds.length; j++) {
              const ent = this.entities.get(cell.entityIds[j]);
              if (ent && !ent.isPlayerControlled && !ent.isCombatCritical) {
                ent.prevTier = ent.tier;
                ent.tier = RahrSimulationTier.T4_DORMANT;
                this.t4Count++;
              }
            }
          }
        }
        continue;
      }

      region.isRejected = false;
      region.tier = minDistanceSq < this.thresholds.t0_to_t1 * this.thresholds.t0_to_t1
        ? RahrSimulationTier.T0_FULL
        : RahrSimulationTier.T1_REDUCED;

      // --- STEP 2: CELL EVALUATION ---
      for (let i = 0; i < region.cellKeys.length; i++) {
        const cell = this.cells.get(region.cellKeys[i]);
        if (!cell) continue;

        this.cellsEvaluated++;
        const cellDistSq = this.getMinDistanceSqToBounds(cell.bounds, fx, fz);

        // Distant cell check: If cell > T2/T3 boundary (120m), reject detailed entity tests
        if (cellDistSq > this.thresholds.t2_to_t3 * this.thresholds.t2_to_t3) {
          cell.tier = cellDistSq > this.thresholds.t3_to_t4 * this.thresholds.t3_to_t4
            ? RahrSimulationTier.T4_DORMANT
            : RahrSimulationTier.T3_AGGREGATE;
          cell.isRejected = true;
          this.cellsRejected++;

          for (let j = 0; j < cell.entityIds.length; j++) {
            const ent = this.entities.get(cell.entityIds[j]);
            if (ent && !ent.isPlayerControlled && !ent.isCombatCritical) {
              ent.prevTier = ent.tier;
              ent.tier = cell.tier;
              if (cell.tier === RahrSimulationTier.T3_AGGREGATE) this.t3Count++;
              else this.t4Count++;
            }
          }
          continue;
        }

        cell.isRejected = false;
        cell.tier = cellDistSq < this.thresholds.t0_to_t1 * this.thresholds.t0_to_t1
          ? RahrSimulationTier.T0_FULL
          : RahrSimulationTier.T1_REDUCED;
      }
    }

    // --- STEP 3: GROUP EVALUATION (Army Formations, Herds, Wildlife) ---
    for (const group of this.groupList) {
      this.groupsEvaluated++;
      const gdx = group.center.x - fx;
      const gdz = group.center.z - fz;
      const gDist = Math.hypot(gdx, gdz);

      // Evaluate group tier with hysteresis
      group.prevTier = group.tier;
      group.tier = this.evaluateTierWithHysteresis(group.tier, gDist);

      // If group is in T2_GROUP or lower fidelity, group decisions govern the squad
      if (group.tier >= RahrSimulationTier.T2_GROUP) {
        group.isRejected = true;
        this.groupsRejected++;

        // Group members inherit group tier unless in active combat override
        for (let i = 0; i < group.memberIds.length; i++) {
          const ent = this.entities.get(group.memberIds[i]);
          if (!ent) continue;

          if (ent.isPlayerControlled || ent.isCombatCritical || (ent.lastCombatTimestamp > 0 && now - ent.lastCombatTimestamp < 3000)) {
            ent.prevTier = ent.tier;
            ent.tier = RahrSimulationTier.T0_FULL;
            this.t0Count++;
          } else {
            ent.prevTier = ent.tier;
            ent.tier = group.tier;
            if (group.tier === RahrSimulationTier.T2_GROUP) this.t2Count++;
            else if (group.tier === RahrSimulationTier.T3_AGGREGATE) this.t3Count++;
            else this.t4Count++;
          }
        }
      } else {
        group.isRejected = false;
      }
    }

    // --- STEP 4: DETAILED ENTITY EVALUATION (Only for non-rejected, active entities) ---
    for (let i = 0; i < this.entityList.length; i++) {
      const ent = this.entityList[i];

      // INVARIANT 1: Player hero is permanently locked to T0_FULL
      if (ent.isPlayerControlled || ent.kind === 'player' || ent.kind === 'projectile') {
        ent.prevTier = ent.tier;
        ent.tier = RahrSimulationTier.T0_FULL;
        this.t0Count++;
        continue;
      }

      // INVARIANT 2: Active combat engagement override (< 3 seconds since combat)
      if (ent.isCombatCritical || (ent.lastCombatTimestamp > 0 && now - ent.lastCombatTimestamp < 3000)) {
        ent.prevTier = ent.tier;
        ent.tier = RahrSimulationTier.T0_FULL;
        this.t0Count++;
        continue;
      }

      // If entity was already categorized by group rejection in Step 3 or cell rejection in Step 2, count and continue
      if (ent.groupId) {
        const grp = this.groups.get(ent.groupId);
        if (grp && grp.isRejected) {
          // Already handled in Step 3
          continue;
        }
      }

      const cell = this.cells.get(ent.cellKey);
      if (cell && cell.isRejected) {
        // Already handled in Step 2
        continue;
      }

      // Detailed distance evaluation with hysteresis
      this.entitiesDetailedEval++;
      const edx = ent.position.x - fx;
      const edz = ent.position.z - fz;
      const dist = Math.hypot(edx, edz);

      ent.prevTier = ent.tier;
      ent.tier = this.evaluateTierWithHysteresis(ent.tier, dist);

      if (ent.tier !== ent.prevTier) {
        ent.tierChangeTimestamp = now;
      }

      switch (ent.tier) {
        case RahrSimulationTier.T0_FULL:
          this.t0Count++;
          break;
        case RahrSimulationTier.T1_REDUCED:
          this.t1Count++;
          break;
        case RahrSimulationTier.T2_GROUP:
          this.t2Count++;
          break;
        case RahrSimulationTier.T3_AGGREGATE:
          this.t3Count++;
          break;
        case RahrSimulationTier.T4_DORMANT:
          this.t4Count++;
          break;
      }
    }
  }

  /**
   * Applies hysteresis thresholds to prevent rapid oscillation at boundaries
   */
  private evaluateTierWithHysteresis(currentTier: RahrSimulationTier, dist: number): RahrSimulationTier {
    const t = this.thresholds;

    // Direct multi-tier jump evaluation when distance far exceeds upper boundaries
    if (dist > t.t3_to_t4) return RahrSimulationTier.T4_DORMANT;
    if (dist > t.t2_to_t3) return RahrSimulationTier.T3_AGGREGATE;
    if (dist > t.t1_to_t2) return RahrSimulationTier.T2_GROUP;

    switch (currentTier) {
      case RahrSimulationTier.T0_FULL:
        if (dist > t.t0_to_t1) return RahrSimulationTier.T1_REDUCED;
        return RahrSimulationTier.T0_FULL;

      case RahrSimulationTier.T1_REDUCED:
        if (dist < t.t1_to_t0) return RahrSimulationTier.T0_FULL;
        if (dist > t.t1_to_t2) return RahrSimulationTier.T2_GROUP;
        return RahrSimulationTier.T1_REDUCED;

      case RahrSimulationTier.T2_GROUP:
        if (dist < t.t2_to_t1) return dist < t.t1_to_t0 ? RahrSimulationTier.T0_FULL : RahrSimulationTier.T1_REDUCED;
        if (dist > t.t2_to_t3) return RahrSimulationTier.T3_AGGREGATE;
        return RahrSimulationTier.T2_GROUP;

      case RahrSimulationTier.T3_AGGREGATE:
        if (dist < t.t3_to_t2) return this.evaluateTierWithHysteresis(RahrSimulationTier.T2_GROUP, dist);
        if (dist > t.t3_to_t4) return RahrSimulationTier.T4_DORMANT;
        return RahrSimulationTier.T3_AGGREGATE;

      case RahrSimulationTier.T4_DORMANT:
        if (dist < t.t4_to_t3) return this.evaluateTierWithHysteresis(RahrSimulationTier.T3_AGGREGATE, dist);
        return RahrSimulationTier.T4_DORMANT;

      default:
        return RahrSimulationTier.T1_REDUCED;
    }
  }

  private getMinDistanceSqToBounds(b: RahrSpatialBounds, px: number, pz: number): number {
    const dx = Math.max(b.minX - px, 0, px - b.maxX);
    const dz = Math.max(b.minZ - pz, 0, pz - b.maxZ);
    return dx * dx + dz * dz;
  }
}
