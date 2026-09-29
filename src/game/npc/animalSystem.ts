/**
 * REALM OF CROWNS — Wildlife & Animal Behavior System
 * Simulates ambient wildlife (Deer, Boar, Wolf Pack) with dynamic predator-prey dynamics,
 * coordinated pack hunting, encircling pincer maneuvers, biting attacks, and zero-overhead geometry.
 */

import { Vector3D } from './npcTypes';

export type AnimalType = 'deer' | 'boar' | 'wolf';

export interface AnimalEntity {
  id: string;
  name: string;
  type: AnimalType;
  position: Vector3D;
  targetPosition: Vector3D | null;
  velocity: Vector3D;
  rotationY: number;
  moveSpeed: number;
  state: 'idle' | 'wander' | 'flee' | 'hunt';
  health: number;
  maxHealth: number;
  idleTimer: number;
  homeArea: Vector3D;
  wanderRadius: number;

  // Combat & Pack Hunting Attributes
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  targetVictimId: string | null;
  packId?: string;
  isAlpha?: boolean;
  flankAngleOffset?: number;
  attackTriggered?: boolean;
  damageFlashTimer?: number;
}

export class AnimalSystem {
  private animals: AnimalEntity[] = [];
  public onPreyKilled?: (prey: AnimalEntity, killer: AnimalEntity) => void;

  constructor() {
    this.initializeFauna();
  }

  public initializeFauna(): void {
    this.animals = [
      // 1. Deer grazing in western forest groves (Prey)
      {
        id: 'animal_deer_1',
        name: 'Forest Stag',
        type: 'deer',
        position: { x: -26, y: 0, z: -10 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: 0.5,
        moveSpeed: 4.8,
        state: 'wander',
        health: 50,
        maxHealth: 50,
        idleTimer: 2.0,
        homeArea: { x: -26, y: 0, z: -10 },
        wanderRadius: 10,
        attackDamage: 0,
        attackRange: 1.2,
        attackCooldown: 2.0,
        attackTimer: 0,
        targetVictimId: null
      },
      {
        id: 'animal_deer_2',
        name: 'Wild Doe',
        type: 'deer',
        position: { x: -28, y: 0, z: 5 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: 1.2,
        moveSpeed: 4.8,
        state: 'wander',
        health: 40,
        maxHealth: 40,
        idleTimer: 1.5,
        homeArea: { x: -28, y: 0, z: 5 },
        wanderRadius: 9,
        attackDamage: 0,
        attackRange: 1.2,
        attackCooldown: 2.0,
        attackTimer: 0,
        targetVictimId: null
      },

      // 2. Razor Boar foraging in south forest edge (Neutral / Defensive)
      {
        id: 'animal_boar_1',
        name: 'Razor Boar',
        type: 'boar',
        position: { x: 22, y: 0, z: 34 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: -0.8,
        moveSpeed: 3.4,
        state: 'wander',
        health: 80,
        maxHealth: 80,
        idleTimer: 3.0,
        homeArea: { x: 22, y: 0, z: 34 },
        wanderRadius: 7,
        attackDamage: 22,
        attackRange: 1.7,
        attackCooldown: 1.5,
        attackTimer: 0,
        targetVictimId: null
      },

      // 3. Timber Wolf Pack stalking northern wood borders (Coordinated Pack Hunters)
      // Alpha Leader
      {
        id: 'animal_wolf_alpha',
        name: 'Timber Wolf Alpha',
        type: 'wolf',
        position: { x: 24, y: 0, z: -24 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: -2.1,
        moveSpeed: 5.6,
        state: 'wander',
        health: 110,
        maxHealth: 110,
        idleTimer: 2.5,
        homeArea: { x: 24, y: 0, z: -24 },
        wanderRadius: 14,
        attackDamage: 30,
        attackRange: 1.9,
        attackCooldown: 1.2,
        attackTimer: 0,
        targetVictimId: null,
        packId: 'timber_pack',
        isAlpha: true,
        flankAngleOffset: 0
      },
      // Stalker 1 (Left Flanker)
      {
        id: 'animal_wolf_stalker_1',
        name: 'Wolf Stalker (Left Flank)',
        type: 'wolf',
        position: { x: 21, y: 0, z: -26 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: -2.3,
        moveSpeed: 5.3,
        state: 'wander',
        health: 65,
        maxHealth: 65,
        idleTimer: 2.0,
        homeArea: { x: 24, y: 0, z: -24 },
        wanderRadius: 12,
        attackDamage: 22,
        attackRange: 1.6,
        attackCooldown: 1.3,
        attackTimer: 0,
        targetVictimId: null,
        packId: 'timber_pack',
        isAlpha: false,
        flankAngleOffset: Math.PI / 4 // +45 degrees encirclement
      },
      // Stalker 2 (Right Flanker)
      {
        id: 'animal_wolf_stalker_2',
        name: 'Wolf Stalker (Right Flank)',
        type: 'wolf',
        position: { x: 27, y: 0, z: -26 },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: -1.9,
        moveSpeed: 5.3,
        state: 'wander',
        health: 65,
        maxHealth: 65,
        idleTimer: 2.2,
        homeArea: { x: 24, y: 0, z: -24 },
        wanderRadius: 12,
        attackDamage: 22,
        attackRange: 1.6,
        attackCooldown: 1.3,
        attackTimer: 0,
        targetVictimId: null,
        packId: 'timber_pack',
        isAlpha: false,
        flankAngleOffset: -Math.PI / 4 // -45 degrees encirclement
      }
    ];
  }

  public getAnimals(): AnimalEntity[] {
    return this.animals;
  }

  public update(
    delta: number,
    threats: Array<{ id?: string; x: number; z: number; isHero?: boolean; isRaider?: boolean; hp?: number }>
  ): void {
    // 1. Reset per-frame attack triggers and tick timers
    for (const animal of this.animals) {
      animal.attackTriggered = false;
      if (animal.attackTimer > 0) animal.attackTimer -= delta;
      if (animal.damageFlashTimer && animal.damageFlashTimer > 0) animal.damageFlashTimer -= delta;
    }

    // 2. Coordinated Wolf Pack Perception & Target Sharing
    this.updateWolfPackCoordination(threats);

    // 3. Process Individual Animal AI Behaviors
    for (const animal of this.animals) {
      if (animal.health <= 0) continue;

      if (animal.type === 'deer') {
        this.updateDeerBehavior(animal, delta, threats);
      } else if (animal.type === 'boar') {
        this.updateBoarBehavior(animal, delta, threats);
      } else if (animal.type === 'wolf') {
        this.updateWolfBehavior(animal, delta, threats);
      }

      // Movement execution
      this.executeMovement(animal, delta);
    }
  }

  /**
   * Wolf Pack Coordinator:
   * Shares target acquisition across all living wolves in the pack.
   */
  private updateWolfPackCoordination(
    threats: Array<{ id?: string; x: number; z: number; isHero?: boolean; isRaider?: boolean; hp?: number }>
  ): void {
    const packWolves = this.animals.filter(a => a.type === 'wolf' && a.packId === 'timber_pack' && a.health > 0);
    if (packWolves.length === 0) return;

    // Check if current pack target is still valid
    let currentTargetId: string | null = null;
    for (const w of packWolves) {
      if (w.targetVictimId) {
        currentTargetId = w.targetVictimId;
        break;
      }
    }

    // Verify target validity
    let targetValid = false;
    if (currentTargetId) {
      const preyAnimal = this.animals.find(a => a.id === currentTargetId && a.health > 0);
      if (preyAnimal) {
        targetValid = true;
      } else {
        // Check if target was a threat/raider
        const threatTarget = threats.find(t => t.id === currentTargetId && (t.hp === undefined || t.hp > 0));
        if (threatTarget) targetValid = true;
      }
    }

    if (!targetValid) {
      currentTargetId = null;
      for (const w of packWolves) {
        w.targetVictimId = null;
      }
    }

    // If no target, scan for nearby prey (deer) or intruding hostile raiders
    if (!currentTargetId) {
      // Priority 1: Deer within 26m of any pack wolf
      let bestPrey: AnimalEntity | null = null;
      let minPreyDist = 26.0;

      for (const w of packWolves) {
        for (const deer of this.animals) {
          if (deer.type === 'deer' && deer.health > 0) {
            const d = Math.hypot(deer.position.x - w.position.x, deer.position.z - w.position.z);
            if (d < minPreyDist) {
              minPreyDist = d;
              bestPrey = deer;
            }
          }
        }
      }

      if (bestPrey) {
        currentTargetId = bestPrey.id;
      } else {
        // Priority 2: Intruding raiders within 18m of wolves' northern home area
        for (const t of threats) {
          if (t.isRaider && (t.hp === undefined || t.hp > 0)) {
            const d = Math.hypot(t.x - 24, t.z - (-24));
            if (d < 18.0) {
              currentTargetId = t.id || 'raider_intruder';
              break;
            }
          }
        }
      }

      // Propagate target to all pack members
      if (currentTargetId) {
        for (const w of packWolves) {
          w.targetVictimId = currentTargetId;
          w.state = 'hunt';
          w.idleTimer = 0;
        }
      }
    }
  }

  /**
   * Wolf AI Behavior:
   * Encircles target from coordinated flanking angles and executes biting attacks.
   */
  private updateWolfBehavior(
    wolf: AnimalEntity,
    delta: number,
    threats: Array<{ id?: string; x: number; z: number; isHero?: boolean; isRaider?: boolean; hp?: number }>
  ): void {
    if (wolf.targetVictimId) {
      // Find victim (either deer or threat)
      const deerVictim = this.animals.find(a => a.id === wolf.targetVictimId && a.health > 0);
      let victimX: number | null = null;
      let victimZ: number | null = null;
      let isVictimDead = false;

      if (deerVictim) {
        victimX = deerVictim.position.x;
        victimZ = deerVictim.position.z;
        isVictimDead = deerVictim.health <= 0;
      } else {
        const threatVictim = threats.find(t => t.id === wolf.targetVictimId);
        if (threatVictim) {
          victimX = threatVictim.x;
          victimZ = threatVictim.z;
          isVictimDead = threatVictim.hp !== undefined && threatVictim.hp <= 0;
        }
      }

      if (victimX !== null && victimZ !== null && !isVictimDead) {
        wolf.state = 'hunt';

        // Pack flanking & encirclement math
        const dx = victimX - wolf.position.x;
        const dz = victimZ - wolf.position.z;
        const dist = Math.hypot(dx, dz);
        const baseAngle = Math.atan2(dz, dx);
        const flankOffset = wolf.flankAngleOffset || 0;
        const surroundRadius = wolf.isAlpha ? 1.0 : 2.0;

        // Position wolf at flanking angle around victim
        wolf.targetPosition = {
          x: victimX + Math.cos(baseAngle + flankOffset) * surroundRadius,
          y: 0,
          z: victimZ + Math.sin(baseAngle + flankOffset) * surroundRadius
        };

        // Biting Attack execution
        if (dist <= wolf.attackRange && wolf.attackTimer <= 0) {
          wolf.attackTimer = wolf.attackCooldown;
          wolf.attackTriggered = true;

          // Apply damage to victim
          if (deerVictim) {
            deerVictim.health = Math.max(0, deerVictim.health - wolf.attackDamage);
            deerVictim.damageFlashTimer = 0.2;
            if (deerVictim.health <= 0) {
              // Pack kill!
              wolf.targetVictimId = null;
              wolf.state = 'idle';
              wolf.idleTimer = 4.0;
              this.onPreyKilled?.(deerVictim, wolf);
            }
          } else {
            const threatVictim = threats.find(t => t.id === wolf.targetVictimId);
            if (threatVictim && threatVictim.hp !== undefined) {
              threatVictim.hp = Math.max(0, threatVictim.hp - wolf.attackDamage);
            }
          }
        }
        return;
      } else {
        wolf.targetVictimId = null;
      }
    }

    // Normal pack territory wander
    this.handleNormalWander(wolf, delta);
  }

  /**
   * Deer AI Behavior:
   * Flees rapidly from wolves, players, and raiders.
   */
  private updateDeerBehavior(
    deer: AnimalEntity,
    delta: number,
    threats: Array<{ x: number; z: number }>
  ): void {
    let nearestThreat: { x: number; z: number } | null = null;
    let minThreatDist = Infinity;

    // Check wolves first (high alert)
    for (const w of this.animals) {
      if (w.type === 'wolf' && w.health > 0) {
        const d = Math.hypot(w.position.x - deer.position.x, w.position.z - deer.position.z);
        if (d < 18.0 && d < minThreatDist) {
          minThreatDist = d;
          nearestThreat = { x: w.position.x, z: w.position.z };
        }
      }
    }

    // Check human threats
    for (const t of threats) {
      const d = Math.hypot(t.x - deer.position.x, t.z - deer.position.z);
      if (d < 12.0 && d < minThreatDist) {
        minThreatDist = d;
        nearestThreat = t;
      }
    }

    if (nearestThreat) {
      deer.state = 'flee';
      const awayX = deer.position.x - nearestThreat.x;
      const awayZ = deer.position.z - nearestThreat.z;
      const awayLen = Math.hypot(awayX, awayZ) || 1;
      deer.targetPosition = {
        x: deer.position.x + (awayX / awayLen) * 14,
        y: 0,
        z: deer.position.z + (awayZ / awayLen) * 14
      };
    } else {
      this.handleNormalWander(deer, delta);
    }
  }

  /**
   * Boar AI Behavior:
   * Wanders calmly, but if provoked or threatened closely, charges and gores.
   */
  private updateBoarBehavior(
    boar: AnimalEntity,
    delta: number,
    threats: Array<{ id?: string; x: number; z: number; hp?: number }>
  ): void {
    let closeThreat: { x: number; z: number; id?: string; hp?: number } | null = null;
    for (const t of threats) {
      const d = Math.hypot(t.x - boar.position.x, t.z - boar.position.z);
      if (d < 5.0) {
        closeThreat = t;
        break;
      }
    }

    if (closeThreat) {
      const dist = Math.hypot(closeThreat.x - boar.position.x, closeThreat.z - boar.position.z);
      if (dist <= boar.attackRange && boar.attackTimer <= 0) {
        boar.attackTimer = boar.attackCooldown;
        boar.attackTriggered = true;
        if (closeThreat.hp !== undefined) {
          closeThreat.hp = Math.max(0, closeThreat.hp - boar.attackDamage);
        }
      } else {
        // Charge toward threat
        boar.state = 'hunt';
        boar.targetPosition = { x: closeThreat.x, y: 0, z: closeThreat.z };
      }
    } else {
      this.handleNormalWander(boar, delta);
    }
  }

  private handleNormalWander(animal: AnimalEntity, delta: number): void {
    if (animal.state === 'flee' && (!animal.targetPosition || Math.hypot(animal.position.x - animal.targetPosition.x, animal.position.z - animal.targetPosition.z) < 1.0)) {
      animal.state = 'idle';
      animal.idleTimer = 3.0;
    }

    if (animal.idleTimer > 0) {
      animal.idleTimer -= delta;
      animal.state = 'idle';
      animal.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    // Pick new wander target if none or reached
    if (!animal.targetPosition || Math.hypot(animal.position.x - animal.targetPosition.x, animal.position.z - animal.targetPosition.z) < 1.2) {
      animal.state = 'idle';
      animal.idleTimer = 2.0 + Math.random() * 3.0;
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.0 + Math.random() * animal.wanderRadius;
      animal.targetPosition = {
        x: animal.homeArea.x + Math.cos(angle) * dist,
        y: 0,
        z: animal.homeArea.z + Math.sin(angle) * dist
      };
    } else {
      animal.state = 'wander';
    }
  }

  private executeMovement(animal: AnimalEntity, delta: number): void {
    if (!animal.targetPosition) {
      animal.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    const dx = animal.targetPosition.x - animal.position.x;
    const dz = animal.targetPosition.z - animal.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.4) {
      animal.position.x = animal.targetPosition.x;
      animal.position.z = animal.targetPosition.z;
      animal.targetPosition = null;
      animal.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    const speed = animal.state === 'flee' || animal.state === 'hunt'
      ? animal.moveSpeed * 1.35
      : animal.moveSpeed * 0.55;

    const step = Math.min(dist, speed * delta);
    const dirX = dx / dist;
    const dirZ = dz / dist;

    animal.position.x += dirX * step;
    animal.position.z += dirZ * step;
    animal.velocity = { x: dirX * speed, y: 0, z: dirZ * speed };

    const targetAngle = Math.atan2(dirX, dirZ);
    let diff = targetAngle - animal.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    animal.rotationY += diff * Math.min(1.0, 10.0 * delta);
  }
}
