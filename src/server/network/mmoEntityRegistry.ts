/**
 * REALM OF CROWNS — MMO Server Entity Registry & Simulation State
 * Phase 2.8 MMO Architecture
 * 
 * Authoritative registry for all real-time world entities:
 * Player ships, server-owned pirate ships, merchants, and projectiles.
 */

import {
  MMOEntityType,
  MMOEntityTransformData,
  MMOShipVisualConfig,
} from '../../shared/mmoProtocol';

export interface ServerMMOEntity {
  id: string;
  type: MMOEntityType;
  name: string;
  ownerPlayerId?: string; // Set for player ships
  faction: string;
  transform: MMOEntityTransformData;
  health: number;
  maxHealth: number;
  visualConfig?: MMOShipVisualConfig;
  stateFlags: number; // bit 0: combat, bit 1: sinking, bit 2: sailsFull
  inCombat: boolean;
  targetEntityId?: string;
  velocity?: { x: number; y: number; z: number };
  sourceEntityId?: string;
  spawnTimestamp?: number;
  portReloadTimestamp?: number;
  starboardReloadTimestamp?: number;
  inputs?: {
    rudder: number;
    throttle: number;
  };
  physicsProfile?: {
    baseSpeed: number;
    turnRate: number;
  };
  lastProcessedInputSequence?: number;
  lastUpdateTimestamp: number;
  // AI State for Server-Authoritative Pirates
  aiPatrolCenter?: { x: number; z: number };
  aiPatrolRadius?: number;
  aiPatrolAngle?: number;
  aiState?: 'patrol' | 'pursuit' | 'flee' | 'idle';
}

export class ServerEntityRegistry {
  private entities: Map<string, ServerMMOEntity> = new Map();
  private playerEntityMap: Map<string, string> = new Map(); // playerId -> entityId

  /**
   * Registers or updates an entity.
   */
  public register(entity: ServerMMOEntity): void {
    this.entities.set(entity.id, entity);
    if (entity.ownerPlayerId) {
      this.playerEntityMap.set(entity.ownerPlayerId, entity.id);
    }
  }

  public get(id: string): ServerMMOEntity | undefined {
    return this.entities.get(id);
  }

  public getByPlayerId(playerId: string): ServerMMOEntity | undefined {
    const entityId = this.playerEntityMap.get(playerId);
    if (!entityId) return undefined;
    return this.entities.get(entityId);
  }

  public getAll(): ServerMMOEntity[] {
    return Array.from(this.entities.values());
  }

  public remove(id: string): boolean {
    const entity = this.entities.get(id);
    if (entity) {
      if (entity.ownerPlayerId) {
        this.playerEntityMap.delete(entity.ownerPlayerId);
      }
      return this.entities.delete(id);
    }
    return false;
  }

  public count(): number {
    return this.entities.size;
  }

  /**
   * Spawns an authoritative player flagship.
   */
  public createPlayerShip(
    playerId: string,
    playerName: string,
    spawnX = 0,
    spawnZ = 0,
    visualConfig?: MMOShipVisualConfig
  ): ServerMMOEntity {
    // Check if player already has a registered ship
    const existing = this.getByPlayerId(playerId);
    if (existing) {
      existing.transform.x = spawnX;
      existing.transform.z = spawnZ;
      existing.lastUpdateTimestamp = Date.now();
      return existing;
    }

    const entityId = `ship_player_${playerId}`;
    const ship: ServerMMOEntity = {
      id: entityId,
      type: 'player_ship',
      name: playerName,
      ownerPlayerId: playerId,
      faction: 'royal_navy',
      transform: {
        x: spawnX,
        y: 0,
        z: spawnZ,
        heading: 0,
        speedKnots: 0,
      },
      health: 500,
      maxHealth: 500,
      visualConfig: visualConfig || {
        definitionId: 'player_sloop_norman',
        culture: 'norman',
        shipClass: 'sloop',
        hullColor: '#2b394a',
        sailColor: '#f4ecd8',
      },
      stateFlags: 0,
      inCombat: false,
      inputs: { rudder: 0, throttle: 1.0 },
      physicsProfile: { baseSpeed: 12.0, turnRate: 18.0 },
      lastUpdateTimestamp: Date.now(),
    };

    this.register(ship);
    return ship;
  }

  /**
   * Spawns a server-authoritative pirate ship.
   */
  public createPirateShip(
    id: string,
    name: string,
    spawnX: number,
    spawnZ: number,
    patrolRadius = 250
  ): ServerMMOEntity {
    const pirate: ServerMMOEntity = {
      id,
      type: 'pirate_ship',
      name,
      faction: 'corsair_fleet',
      transform: {
        x: spawnX,
        y: 0,
        z: spawnZ,
        heading: Math.random() * Math.PI * 2,
        speedKnots: 8.0,
      },
      health: 300,
      maxHealth: 300,
      visualConfig: {
        definitionId: 'pirate_brigantine_black',
        culture: 'corsair',
        shipClass: 'brigantine',
        hullColor: '#1a1a1a',
        sailColor: '#6a1b1a',
      },
      stateFlags: 4, // bit 2 = sailsFull
      inCombat: false,
      lastUpdateTimestamp: Date.now(),
      aiPatrolCenter: { x: spawnX, z: spawnZ },
      aiPatrolRadius: patrolRadius,
      aiPatrolAngle: Math.random() * Math.PI * 2,
      aiState: 'patrol',
    };

    this.register(pirate);
    return pirate;
  }

  /**
   * Simulates server-authoritative pirate movement.
   * Runs at server tick rate (e.g. 30 Hz).
   */
  public tickPirates(dtSec: number): void {
    const now = Date.now();
    for (const entity of this.entities.values()) {
      if (entity.type === 'pirate_ship' && entity.aiPatrolCenter) {
        // Simple circular/figure-eight patrol around center
        const currentAngle = entity.aiPatrolAngle || 0;
        // Turn rate: ~0.08 rad/sec
        const newAngle = currentAngle + 0.08 * dtSec;
        entity.aiPatrolAngle = newAngle;

        const radius = entity.aiPatrolRadius || 250;
        const targetX = entity.aiPatrolCenter.x + Math.cos(newAngle) * radius;
        const targetZ = entity.aiPatrolCenter.z + Math.sin(newAngle) * radius;

        const dx = targetX - entity.transform.x;
        const dz = targetZ - entity.transform.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 1.0) {
          const desiredHeading = Math.atan2(dx, dz);
          // Turn smoothly toward desired heading
          let dHeading = desiredHeading - entity.transform.heading;
          while (dHeading > Math.PI) dHeading -= Math.PI * 2;
          while (dHeading < -Math.PI) dHeading += Math.PI * 2;
          entity.transform.heading += Math.max(-1.5 * dtSec, Math.min(1.5 * dtSec, dHeading));

          // Move along heading at current speed
          const speedMs = entity.transform.speedKnots * 0.514444;
          entity.transform.x += Math.sin(entity.transform.heading) * speedMs * dtSec;
          entity.transform.z += Math.cos(entity.transform.heading) * speedMs * dtSec;
        }

        entity.lastUpdateTimestamp = now;
      }
    }
  }

  /**
   * Phase 2.9: Server-Authoritative Player Ship Physics Tick
   */
  public tickPlayers(dtSec: number): void {
    for (const entity of this.entities.values()) {
      if (entity.type !== 'player_ship' || !entity.inputs || !entity.physicsProfile) continue;

      // 1. Process inputs
      const { rudder, throttle } = entity.inputs;
      const { baseSpeed, turnRate } = entity.physicsProfile;

      // 2. Simple wind multiplier (assuming wind from North / 0 radians for now)
      const windFromRad = 0;
      const angleToWind = Math.abs((((entity.transform.heading - windFromRad + Math.PI) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI);
      
      let windMultiplier = 0.75 + Math.sin(angleToWind) * 0.25;
      if (angleToWind < 0.4) windMultiplier = 0.5; // in irons

      const sailHealthMult = Math.max(0.2, entity.health / entity.maxHealth);
      const targetKnots = baseSpeed * throttle * windMultiplier * sailHealthMult;

      // Lerp speed
      entity.transform.speedKnots += (targetKnots - entity.transform.speedKnots) * Math.min(1, dtSec * 1.2);

      // 3. Turn logic
      const effectiveTurnRate = (turnRate * (Math.PI / 180) * (entity.transform.speedKnots / baseSpeed + 0.2)) * rudder;
      entity.transform.heading += effectiveTurnRate * dtSec;
      
      // Normalize heading
      if (entity.transform.heading > Math.PI * 2) entity.transform.heading -= Math.PI * 2;
      if (entity.transform.heading < 0) entity.transform.heading += Math.PI * 2;

      // 4. Position advancement
      const moveDist = entity.transform.speedKnots * 1.8 * dtSec;
      entity.transform.x += Math.sin(entity.transform.heading) * moveDist;
      entity.transform.z += Math.cos(entity.transform.heading) * moveDist;
    }
  }

  /**
   * Phase 2.9: Server-Authoritative Projectile Physics Tick (Broadphase & Continuous Collision)
   */
  public tickProjectiles(
    dtSec: number, 
    getCandidates: (x: number, z: number, r: number) => string[],
    onHit: (projectile: ServerMMOEntity, target: ServerMMOEntity) => void
  ): { active: number; avgCandidates: number; maxCandidates: number; broadphaseMs: number; narrowphaseMs: number; cleanups: number } {
    const now = performance.now();
    let active = 0;
    let totalCandidates = 0;
    let maxCandidates = 0;
    let broadphaseMs = 0;
    let narrowphaseMs = 0;
    let cleanups = 0;

    for (const entity of this.entities.values()) {
      if (entity.type !== 'projectile' || !entity.velocity) continue;
      active++;

      // 1. Despawn old projectiles (e.g., max lifetime 4 seconds)
      if (entity.spawnTimestamp && Date.now() - entity.spawnTimestamp > 4000) {
        this.remove(entity.id);
        cleanups++;
        continue;
      }

      // 2. Advance position and record segment
      const prevX = entity.transform.x;
      const prevZ = entity.transform.z;
      entity.transform.x += entity.velocity.x * dtSec;
      entity.transform.z += entity.velocity.z * dtSec;

      // 3. Broadphase: query only nearby cells via spatial partition
      const tBroadStart = performance.now();
      const stepDist = Math.hypot(entity.velocity.x * dtSec, entity.velocity.z * dtSec);
      const candidates = getCandidates(entity.transform.x, entity.transform.z, stepDist + 20);
      broadphaseMs += (performance.now() - tBroadStart);

      totalCandidates += candidates.length;
      if (candidates.length > maxCandidates) maxCandidates = candidates.length;

      // 4. Narrowphase: swept-segment continuous collision detection
      const tNarrowStart = performance.now();
      let hit = false;
      
      const shooter = entity.sourceEntityId ? this.entities.get(entity.sourceEntityId) : null;
      
      for (const targetId of candidates) {
        const target = this.entities.get(targetId);
        if (!target || target.type === 'projectile' || target.id === entity.sourceEntityId || target.health <= 0) continue;
        
        // Faction-based friendly fire rule
        if (shooter && shooter.faction === target.faction && target.faction !== 'none') continue;

        const px = target.transform.x;
        const pz = target.transform.z;
        const ax = prevX;
        const az = prevZ;
        const bx = entity.transform.x;
        const bz = entity.transform.z;

        const l2 = (bx - ax)*(bx - ax) + (bz - az)*(bz - az);
        let distSq = 0;
        if (l2 === 0) {
           distSq = (px - ax)*(px - ax) + (pz - az)*(pz - az);
        } else {
           let t = ((px - ax)*(bx - ax) + (pz - az)*(bz - az)) / l2;
           t = Math.max(0, Math.min(1, t));
           const projX = ax + t*(bx - ax);
           const projZ = az + t*(bz - az);
           distSq = (px - projX)*(px - projX) + (pz - projZ)*(pz - projZ);
        }

        // Simple 8-meter radius collision for ships
        if (distSq < 64) {
          onHit(entity, target);
          this.remove(entity.id);
          cleanups++;
          hit = true;
          break; // Projectile destroyed
        }
      }
      narrowphaseMs += (performance.now() - tNarrowStart);
    }
    
    return {
       active,
       avgCandidates: active > 0 ? totalCandidates / active : 0,
       maxCandidates,
       broadphaseMs,
       narrowphaseMs,
       cleanups
    };
  }

  public createProjectile(
    sourceEntityId: string,
    x: number,
    z: number,
    vx: number,
    vz: number
  ): ServerMMOEntity {
    const projId = `proj_${crypto.randomUUID()}`;
    const proj: ServerMMOEntity = {
      id: projId,
      type: 'projectile',
      name: 'Cannonball',
      faction: 'none',
      sourceEntityId,
      transform: {
        x,
        y: 1.5,
        z,
        heading: Math.atan2(vx, vz),
        speedKnots: Math.hypot(vx, vz) * 1.94384, // roughly m/s to knots
      },
      velocity: { x: vx, y: 0, z: vz },
      health: 1,
      maxHealth: 1,
      stateFlags: 0,
      inCombat: true,
      lastUpdateTimestamp: Date.now(),
      spawnTimestamp: Date.now(),
    };
    this.register(proj);
    return proj;
  }

  public clear(): void {
    this.entities.clear();
    this.playerEntityMap.clear();
  }
}
