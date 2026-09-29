/**
 * REALM OF CROWNS — Tactical Army Controller
 * Manages squad state, formation steering, all 8 army orders (Move, Follow, Attack, Defend, Hold, Retreat, Charge, Stop),
 * unit separation avoidance, target distribution, and command failure telemetry.
 */

import { ArmyOrder, ArmySquad, ArmyUnit, FormationType, TacticalOrder, UnitState, UnitType } from './armyTypes';
import { FormationSystem } from './formationSystem';

interface OrderDiagnostic {
  orderId: string;
  squadId: string;
  type: TacticalOrder;
  destination?: { x: number; z: number };
  issuedAt: number;
  initialPositions: Map<string, { x: number; z: number }>;
  loggedFailure: boolean;
}

export class ArmyController {
  private squads: Map<string, ArmySquad> = new Map();
  private activeDiagnostics: Map<string, OrderDiagnostic> = new Map();

  /**
   * Creates a squad of units and initial formation.
   */
  public createSquad(
    id: string,
    name: string,
    leaderId: string,
    formation: FormationType,
    initialOrder: TacticalOrder,
    unitConfigs: Array<{ type: UnitType; name: string; team: 'player' | 'ally' | 'enemy' }>
  ): ArmySquad {
    const units: ArmyUnit[] = unitConfigs.map((cfg, index) => {
      const stats = this.getDefaultStats(cfg.type);
      return {
        id: `${id}_unit_${index}`,
        name: cfg.name,
        type: cfg.type,
        team: cfg.team,
        stats,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        formationIndex: index,
        slotOffsetX: 0,
        slotOffsetZ: 0,
        state: 'IDLE' as UnitState,
        order: initialOrder,
        currentOrderObj: null,
        targetUnitId: null,
        targetPosition: null,
        isEngaged: false,
        isRouting: false,
        isDead: false,
        isSelected: false,
        currentAnim: 'idle'
      };
    });

    FormationSystem.applyFormationToSquad(units, formation);

    const squad: ArmySquad = {
      id,
      name,
      leaderId,
      formation,
      currentOrder: initialOrder,
      activeOrder: null,
      units,
      rallyPoint: { x: 0, z: 0 },
      formationCenter: { x: 0, z: 0 },
      facingAngle: 0,
      isSelected: false
    };

    this.squads.set(id, squad);
    return squad;
  }

  public getSquad(squadId: string): ArmySquad | undefined {
    return this.squads.get(squadId);
  }

  public getAllSquads(): ArmySquad[] {
    return Array.from(this.squads.values());
  }

  /**
   * Issues a fully qualified ArmyOrder to a squad, updating formation slots and individual unit targets.
   */
  public issueOrder(squadId: string, order: ArmyOrder): void {
    const squad = this.squads.get(squadId);
    if (!squad) {
      console.warn(`[ArmyController] Cannot issue order: Squad ${squadId} not found.`);
      return;
    }

    squad.currentOrder = order.type;
    squad.activeOrder = order;
    order.status = 'executing';

    // Track diagnostic state to ensure units actually move
    const posMap = new Map<string, { x: number; z: number }>();
    for (const u of squad.units) {
      posMap.set(u.id, { x: u.x, z: u.z });
    }
    this.activeDiagnostics.set(squadId, {
      orderId: order.id,
      squadId,
      type: order.type,
      destination: order.destination,
      issuedAt: Date.now(),
      initialPositions: posMap,
      loggedFailure: false
    });

    // Calculate squad centroid
    let avgX = 0;
    let avgZ = 0;
    let aliveCount = 0;
    for (const u of squad.units) {
      if (!u.isDead) {
        avgX += u.x;
        avgZ += u.z;
        aliveCount++;
      }
    }
    if (aliveCount > 0) {
      squad.formationCenter = { x: avgX / aliveCount, z: avgZ / aliveCount };
    }

    // Process specific order logic
    switch (order.type) {
      case 'move': {
        if (!order.destination) break;
        squad.rallyPoint = { x: order.destination.x, z: order.destination.z };

        // Calculate heading from current centroid toward destination
        const dx = order.destination.x - squad.formationCenter.x;
        const dz = order.destination.z - squad.formationCenter.z;
        const heading = Math.atan2(dx, dz);
        squad.facingAngle = heading;

        // Assign each unit its offset destination slot in formation
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'move';
          unit.currentOrderObj = order;
          unit.state = 'MOVING';

          const slotWorld = FormationSystem.calculateWorldSlotPosition(
            order.destination.x,
            order.destination.z,
            heading,
            unit.slotOffsetX,
            unit.slotOffsetZ
          );

          unit.targetPosition = slotWorld;
          unit.isEngaged = false;
        }
        break;
      }

      case 'stop': {
        squad.rallyPoint = { x: squad.formationCenter.x, z: squad.formationCenter.z };
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'stop';
          unit.currentOrderObj = order;
          unit.state = 'IDLE';
          unit.targetPosition = null;
          unit.targetUnitId = null;
          unit.isEngaged = false;
          unit.currentAnim = 'idle';
        }
        order.status = 'completed';
        break;
      }

      case 'follow': {
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'follow';
          unit.currentOrderObj = order;
          unit.state = 'FORMING';
          unit.targetUnitId = null;
          unit.isEngaged = false;
        }
        break;
      }

      case 'hold': {
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'hold';
          unit.currentOrderObj = order;
          unit.state = 'DEFENDING';
          unit.targetPosition = null;
          unit.currentAnim = 'idle';
        }
        break;
      }

      case 'defend': {
        const center = order.destination || squad.formationCenter;
        squad.rallyPoint = { x: center.x, z: center.z };
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'defend';
          unit.currentOrderObj = order;
          unit.state = 'DEFENDING';
        }
        break;
      }

      case 'charge': {
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'charge';
          unit.currentOrderObj = order;
          unit.state = 'ATTACKING';
        }
        break;
      }

      case 'retreat': {
        squad.rallyPoint = { x: 0, z: -18 }; // Great Keep gates
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'retreat';
          unit.currentOrderObj = order;
          unit.state = 'RETREATING';
          unit.targetPosition = { x: 0, z: -18 };
        }
        break;
      }

      case 'attack': {
        for (const unit of squad.units) {
          if (unit.isDead) continue;
          unit.order = 'attack';
          unit.currentOrderObj = order;
          unit.state = 'ATTACKING';
        }
        break;
      }
    }
  }

  /**
   * Helper to issue a Move order to a specific world position.
   */
  public issueMoveTo(squadId: string, destX: number, destZ: number, formation?: FormationType): ArmyOrder {
    const squad = this.squads.get(squadId);
    const form = formation || squad?.formation || 'line';
    const order: ArmyOrder = {
      id: `order_move_${Date.now()}`,
      type: 'move',
      destination: { x: destX, z: destZ },
      formation: form,
      priority: 1,
      issuedBy: 'player',
      timestamp: Date.now(),
      status: 'pending'
    };

    if (formation && squad && squad.formation !== formation) {
      this.setFormation(squadId, formation);
    }

    this.issueOrder(squadId, order);
    return order;
  }

  /**
   * Sets formation for a squad and recalibrates slot offsets.
   */
  public setFormation(squadId: string, formation: FormationType): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;
    squad.formation = formation;
    FormationSystem.applyFormationToSquad(squad.units, formation);

    // If currently on a move order or follow, immediately recompute target slots
    if (squad.currentOrder === 'move' && squad.rallyPoint) {
      for (const unit of squad.units) {
        if (!unit.isDead) {
          const slotWorld = FormationSystem.calculateWorldSlotPosition(
            squad.rallyPoint.x,
            squad.rallyPoint.z,
            squad.facingAngle,
            unit.slotOffsetX,
            unit.slotOffsetZ
          );
          unit.targetPosition = slotWorld;
        }
      }
    }
  }

  /**
   * Sets order for a squad (legacy shorthand).
   */
  public setOrder(squadId: string, order: TacticalOrder): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    const armyOrder: ArmyOrder = {
      id: `order_${order}_${Date.now()}`,
      type: order,
      destination: order === 'move' ? squad.rallyPoint : undefined,
      formation: squad.formation,
      priority: 1,
      issuedBy: 'player',
      timestamp: Date.now(),
      status: 'pending'
    };

    this.issueOrder(squadId, armyOrder);
  }

  /**
   * Main update tick for all squads, unit steering, and combat.
   */
  public update(
    delta: number,
    leaderPos: { x: number; y: number; z: number; rotationY: number },
    potentialTargets: Array<{ id: string; x: number; z: number; team: string; isDead: boolean }>
  ): void {
    const activeEnemies = potentialTargets.filter(t => !t.isDead);

    for (const squad of this.squads.values()) {
      let squadMovingCount = 0;
      let squadAliveCount = 0;
      let sumX = 0;
      let sumZ = 0;

      for (let i = 0; i < squad.units.length; i++) {
        const unit = squad.units[i];
        if (unit.isDead) continue;

        squadAliveCount++;
        sumX += unit.x;
        sumZ += unit.z;

        // Cooldown tick
        if (unit.stats.attackCooldown > 0) {
          unit.stats.attackCooldown = Math.max(0, unit.stats.attackCooldown - delta);
        }

        // Process order behaviors
        switch (unit.order) {
          case 'move':
            this.updateMoveOrder(unit, squad, delta);
            break;
          case 'follow':
            this.updateFollowOrder(unit, leaderPos, delta);
            break;
          case 'hold':
            this.updateHoldOrder(unit, activeEnemies, delta);
            break;
          case 'attack':
            this.updateAttackOrder(unit, activeEnemies, i, delta);
            break;
          case 'defend':
            this.updateDefendOrder(unit, squad.rallyPoint, activeEnemies, delta);
            break;
          case 'charge':
            this.updateChargeOrder(unit, activeEnemies, delta);
            break;
          case 'retreat':
            this.updateRetreatOrder(unit, delta);
            break;
          case 'stop':
            unit.state = 'IDLE';
            unit.currentAnim = 'idle';
            unit.isEngaged = false;
            break;
        }

        // Apply local separation avoidance to prevent stacking
        this.applyLocalAvoidance(unit, squad.units, i);

        if (unit.state === 'MOVING' || unit.currentAnim === 'walk' || unit.currentAnim === 'run') {
          squadMovingCount++;
        }
      }

      if (squadAliveCount > 0) {
        squad.formationCenter = { x: sumX / squadAliveCount, z: sumZ / squadAliveCount };
      }

      // If move order completed (all units arrived)
      if (squad.currentOrder === 'move' && squad.activeOrder && squadMovingCount === 0) {
        squad.activeOrder.status = 'completed';
      }

      // Check command failure diagnostics
      this.checkCommandFailureDiagnostics(squad);
    }
  }

  /**
   * MOVE ORDER: Directs unit to its assigned formation slot offset.
   */
  private updateMoveOrder(unit: ArmyUnit, squad: ArmySquad, delta: number): void {
    if (!unit.targetPosition) {
      unit.state = 'IDLE';
      unit.currentAnim = 'idle';
      return;
    }

    const dx = unit.targetPosition.x - unit.x;
    const dz = unit.targetPosition.z - unit.z;
    const distSq = dx * dx + dz * dz;

    // Arrival threshold: 0.45m
    if (distSq > 0.2) {
      const dist = Math.sqrt(distSq);
      const speedMultiplier = dist > 6.0 ? 1.4 : 1.0;
      const moveDist = Math.min(dist, unit.stats.moveSpeed * speedMultiplier * delta);

      unit.x += (dx / dist) * moveDist;
      unit.z += (dz / dist) * moveDist;

      unit.rotationY = Math.atan2(dx, dz);
      unit.state = 'MOVING';
      unit.currentAnim = speedMultiplier > 1.2 ? 'run' : 'walk';
    } else {
      // Arrived in formation slot
      unit.rotationY = squad.facingAngle;
      unit.state = 'IDLE';
      unit.currentAnim = 'idle';
    }
  }

  /**
   * FOLLOW ORDER: Units follow leader while maintaining formation slots behind.
   */
  private updateFollowOrder(
    unit: ArmyUnit,
    leaderPos: { x: number; y: number; z: number; rotationY: number },
    delta: number
  ): void {
    const targetPos = FormationSystem.calculateWorldSlotPosition(
      leaderPos.x,
      leaderPos.z,
      leaderPos.rotationY,
      unit.slotOffsetX,
      unit.slotOffsetZ
    );

    const dx = targetPos.x - unit.x;
    const dz = targetPos.z - unit.z;
    const distSq = dx * dx + dz * dz;

    if (distSq > 0.1) {
      const dist = Math.sqrt(distSq);
      const speedMultiplier = dist > 7.0 ? 1.5 : (dist > 3.0 ? 1.25 : 1.0);
      const moveDist = Math.min(dist, unit.stats.moveSpeed * speedMultiplier * delta);

      unit.x += (dx / dist) * moveDist;
      unit.z += (dz / dist) * moveDist;

      unit.rotationY = Math.atan2(dx, dz);
      unit.state = 'MOVING';
      unit.currentAnim = speedMultiplier > 1.2 ? 'run' : 'walk';
    } else {
      unit.rotationY = leaderPos.rotationY;
      unit.state = 'IDLE';
      unit.currentAnim = 'idle';
    }
  }

  /**
   * HOLD ORDER: Units do not pursue, only attack enemies within direct reach.
   */
  private updateHoldOrder(
    unit: ArmyUnit,
    targets: Array<{ id: string; x: number; z: number; team: string }>,
    delta: number
  ): void {
    const nearestEnemy = this.findNearestHostile(unit, targets, unit.stats.attackRange * 1.3);
    if (nearestEnemy) {
      const dx = nearestEnemy.x - unit.x;
      const dz = nearestEnemy.z - unit.z;
      unit.rotationY = Math.atan2(dx, dz);
      unit.currentAnim = 'attack';
      unit.isEngaged = true;
      unit.state = 'ATTACKING';
    } else {
      unit.currentAnim = 'idle';
      unit.isEngaged = false;
      unit.state = 'DEFENDING';
    }
  }

  /**
   * ATTACK ORDER: Distributed targeting across active hostiles.
   */
  private updateAttackOrder(
    unit: ArmyUnit,
    targets: Array<{ id: string; x: number; z: number; team: string }>,
    unitIndex: number,
    delta: number
  ): void {
    if (targets.length === 0) {
      unit.currentAnim = 'idle';
      unit.isEngaged = false;
      unit.state = 'IDLE';
      return;
    }

    // Target distribution: units disperse among enemies rather than piling on one
    const targetIdx = unitIndex % targets.length;
    const assignedTarget = targets[targetIdx] || targets[0];

    const dx = assignedTarget.x - unit.x;
    const dz = assignedTarget.z - unit.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    unit.rotationY = Math.atan2(dx, dz);

    // Archers maintain distance (6m to 14m)
    if (unit.type === 'archer') {
      if (dist < 4.5) {
        // Backpedal
        const moveDist = Math.min(4.5 - dist, unit.stats.moveSpeed * delta);
        unit.x -= (dx / dist) * moveDist;
        unit.z -= (dz / dist) * moveDist;
        unit.currentAnim = 'walk';
        unit.state = 'MOVING';
        unit.isEngaged = false;
      } else if (dist <= unit.stats.attackRange) {
        unit.currentAnim = 'attack';
        unit.isEngaged = true;
        unit.state = 'ATTACKING';
      } else {
        const moveDist = Math.min(dist - unit.stats.attackRange * 0.85, unit.stats.moveSpeed * delta);
        unit.x += (dx / dist) * moveDist;
        unit.z += (dz / dist) * moveDist;
        unit.currentAnim = 'walk';
        unit.state = 'MOVING';
        unit.isEngaged = false;
      }
      return;
    }

    // Melee attack
    if (dist <= unit.stats.attackRange) {
      unit.currentAnim = 'attack';
      unit.isEngaged = true;
      unit.state = 'ATTACKING';
    } else {
      const moveDist = Math.min(dist - unit.stats.attackRange * 0.8, unit.stats.moveSpeed * delta);
      unit.x += (dx / dist) * moveDist;
      unit.z += (dz / dist) * moveDist;
      unit.currentAnim = 'walk';
      unit.state = 'MOVING';
      unit.isEngaged = false;
    }
  }

  /**
   * DEFEND ORDER: Holds perimeter at defend center.
   */
  private updateDefendOrder(
    unit: ArmyUnit,
    defendCenter: { x: number; z: number },
    targets: Array<{ id: string; x: number; z: number; team: string }>,
    delta: number
  ): void {
    const nearestEnemy = this.findNearestHostile(unit, targets, 16.0);
    if (nearestEnemy) {
      this.updateAttackOrder(unit, targets, unit.formationIndex, delta);
    } else {
      // Stay near defensive anchor
      const dx = (defendCenter.x + unit.slotOffsetX) - unit.x;
      const dz = (defendCenter.z + unit.slotOffsetZ) - unit.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > 1.0) {
        const dist = Math.sqrt(distSq);
        const moveDist = Math.min(dist, unit.stats.moveSpeed * delta);
        unit.x += (dx / dist) * moveDist;
        unit.z += (dz / dist) * moveDist;
        unit.rotationY = Math.atan2(dx, dz);
        unit.currentAnim = 'walk';
        unit.state = 'MOVING';
      } else {
        unit.currentAnim = 'idle';
        unit.isEngaged = false;
        unit.state = 'DEFENDING';
      }
    }
  }

  /**
   * CHARGE ORDER: Full sprint directly into enemy lines.
   */
  private updateChargeOrder(
    unit: ArmyUnit,
    targets: Array<{ id: string; x: number; z: number; team: string }>,
    delta: number
  ): void {
    const nearestEnemy = this.findNearestHostile(unit, targets, 40.0);
    if (!nearestEnemy) {
      unit.currentAnim = 'idle';
      unit.state = 'IDLE';
      return;
    }

    const dx = nearestEnemy.x - unit.x;
    const dz = nearestEnemy.z - unit.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    unit.rotationY = Math.atan2(dx, dz);

    if (dist <= unit.stats.attackRange) {
      unit.currentAnim = 'attack';
      unit.isEngaged = true;
      unit.state = 'ATTACKING';
    } else {
      const moveDist = Math.min(dist - unit.stats.attackRange * 0.7, unit.stats.moveSpeed * 1.35 * delta);
      unit.x += (dx / dist) * moveDist;
      unit.z += (dz / dist) * moveDist;
      unit.currentAnim = 'run';
      unit.state = 'MOVING';
      unit.isEngaged = false;
    }
  }

  /**
   * RETREAT ORDER: Sprint back toward Great Keep gates.
   */
  private updateRetreatOrder(unit: ArmyUnit, delta: number): void {
    const keepX = 0;
    const keepZ = -18;
    const dx = keepX - unit.x;
    const dz = keepZ - unit.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 2.0) {
      const moveDist = Math.min(dist, unit.stats.moveSpeed * 1.25 * delta);
      unit.x += (dx / dist) * moveDist;
      unit.z += (dz / dist) * moveDist;
      unit.rotationY = Math.atan2(dx, dz);
      unit.currentAnim = 'run';
      unit.state = 'RETREATING';
      unit.isEngaged = false;
    } else {
      unit.currentAnim = 'idle';
      unit.state = 'IDLE';
      unit.isEngaged = false;
    }
  }

  /**
   * Local separation avoidance to prevent units occupying the exact same coordinates.
   */
  private applyLocalAvoidance(unit: ArmyUnit, units: ArmyUnit[], myIndex: number): void {
    const minSeparation = 1.1; // 1.1 meter personal radius
    let pushX = 0;
    let pushZ = 0;

    for (let j = 0; j < units.length; j++) {
      if (j === myIndex || units[j].isDead) continue;
      const other = units[j];
      const dx = unit.x - other.x;
      const dz = unit.z - other.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < minSeparation * minSeparation && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = (minSeparation - dist) * 0.5;
        pushX += (dx / dist) * overlap;
        pushZ += (dz / dist) * overlap;
      }
    }

    unit.x += pushX * 0.4;
    unit.z += pushZ * 0.4;
  }

  /**
   * Diagnostic telemetry for command failure detection.
   */
  private checkCommandFailureDiagnostics(squad: ArmySquad): void {
    const diag = this.activeDiagnostics.get(squad.id);
    if (!diag || diag.loggedFailure) return;

    const elapsed = Date.now() - diag.issuedAt;
    // Check after 1.8 seconds of order issuance
    if (elapsed > 1800 && (diag.type === 'move' || diag.type === 'charge')) {
      let maxDisplacement = 0;
      for (const unit of squad.units) {
        if (unit.isDead) continue;
        const initial = diag.initialPositions.get(unit.id);
        if (initial) {
          const d = Math.hypot(unit.x - initial.x, unit.z - initial.z);
          if (d > maxDisplacement) maxDisplacement = d;
        }
      }

      if (maxDisplacement < 0.25) {
        diag.loggedFailure = true;
        console.warn(
          `[COMMAND FAILURE DIAGNOSTIC] Squad ${squad.id} failed to move after order ${diag.type}! Max displacement: ${maxDisplacement.toFixed(2)}m. Destination: (${diag.destination?.x}, ${diag.destination?.z}). Unit count: ${squad.units.length}`
        );
      }
    }
  }

  private findNearestHostile(
    unit: ArmyUnit,
    targets: Array<{ id: string; x: number; z: number; team: string }>,
    maxDist: number
  ): { id: string; x: number; z: number } | null {
    let nearest: { id: string; x: number; z: number } | null = null;
    let minD = maxDist * maxDist;

    for (const t of targets) {
      if (t.team === unit.team) continue;
      const dx = t.x - unit.x;
      const dz = t.z - unit.z;
      const d = dx * dx + dz * dz;
      if (d < minD) {
        minD = d;
        nearest = t;
      }
    }

    return nearest;
  }

  private getDefaultStats(type: UnitType) {
    switch (type) {
      case 'swordsman':
        return {
          maxHp: 130,
          hp: 130,
          attackDamage: 18,
          attackRange: 2.1,
          attackSpeed: 1.1,
          attackCooldown: 0,
          moveSpeed: 3.4,
          armor: 5,
          morale: 100
        };
      case 'spearman':
        return {
          maxHp: 150,
          hp: 150,
          attackDamage: 16,
          attackRange: 2.8,
          attackSpeed: 0.9,
          attackCooldown: 0,
          moveSpeed: 3.2,
          armor: 7,
          morale: 100
        };
      case 'archer':
        return {
          maxHp: 90,
          hp: 90,
          attackDamage: 22,
          attackRange: 16.0,
          attackSpeed: 0.75,
          attackCooldown: 0,
          moveSpeed: 3.6,
          armor: 2,
          morale: 85
        };
      case 'cavalry':
        return {
          maxHp: 210,
          hp: 210,
          attackDamage: 26,
          attackRange: 2.4,
          attackSpeed: 1.2,
          attackCooldown: 0,
          moveSpeed: 5.4,
          armor: 8,
          morale: 100
        };
      case 'guard':
        return {
          maxHp: 170,
          hp: 170,
          attackDamage: 22,
          attackRange: 2.3,
          attackSpeed: 1.0,
          attackCooldown: 0,
          moveSpeed: 3.2,
          armor: 8,
          morale: 100
        };
    }
  }
}
