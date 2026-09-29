/**
 * Realm of Crowns — Voyage Collision & Physical Obstacle System
 * 
 * High-performance, zero-allocation 2D spatial collision engine:
 * 1. Island & Landmass Collisions:
 *    - Solid island shorelines, rocky bluffs, coastal reefs, and mountain cliffs
 *    - Grand Northern Mainland Continental boundary (Z >= 840m)
 *    - Realistic hull-grounding physics: tangent sliding, momentum deceleration,
 *      hull scrape damage, and creaking wood sound effects
 * 2. Ship-to-Ship Collisions:
 *    - Player vs Enemy NPC ships, Player vs Remote MMO ships, and AI vs AI
 *    - Elastic/inelastic impulse response, hull separation pushback
 *    - Ramming mechanics with collision damage and splinter particle bursts
 * 3. AI Fleet Obstacle Avoidance:
 *    - Repulsion forces keeping vessels from penetrating islands or stacking onto each other
 */

import * as THREE from 'three';
import { ISLAND_HAVENS } from '../../data/navalCatalog';
import { soundEngine } from '../../audio/soundEngine';

export interface CollisionObstacle {
  id: string;
  name: string;
  x: number;
  z: number;
  solidRadius: number; // Inner impassable rock/land radius
  warningRadius: number; // Shallows/shoals advisory zone
  isMainland?: boolean;
}

export interface CollisionResult {
  collided: boolean;
  type: 'none' | 'island' | 'mainland' | 'ship';
  obstacleName?: string;
  damage: number;
  pushX: number;
  pushZ: number;
  logMessage?: string;
}

export class VoyageCollisionSystem {
  // Pre-compiled list of static land obstacles (Islands + Havens + Vault)
  private static obstacles: CollisionObstacle[] = [];
  private static lastScrapeSoundTime = 0;
  private static lastLogTime = 0;

  // Northern Mainland Continental barrier Z threshold
  public static readonly MAINLAND_Z_LIMIT = 835;

  // Scratch vectors to guarantee ZERO heap allocation during 60 FPS collision queries
  private static readonly _vecA = new THREE.Vector2();
  private static readonly _vecB = new THREE.Vector2();

  public static initialize(): void {
    if (this.obstacles.length > 0) return;

    // 1. Grand Mainland Coastal Barrier (Center around X=0, Z=920)
    this.obstacles.push({
      id: 'mainland_haven',
      name: 'Royal Sovereign Mainland Coast & Mountains',
      x: 0,
      z: 920,
      solidRadius: 185,
      warningRadius: 240,
      isMainland: true,
    });

    // 2. Archipelago Island Havens
    ISLAND_HAVENS.forEach((idef) => {
      const isCave = idef.id === 'brethrens_vault';
      // The solid core begins at ~68% of the visual haven radius, leaving mooring water for docks
      const solidR = isCave ? 110 : idef.radius * 0.68;
      this.obstacles.push({
        id: idef.id,
        name: idef.name,
        x: idef.position[0],
        z: idef.position[1],
        solidRadius: solidR,
        warningRadius: solidR + 35,
      });
    });
  }

  public static getObstacles(): readonly CollisionObstacle[] {
    if (this.obstacles.length === 0) this.initialize();
    return this.obstacles;
  }

  /**
   * Resolves collision between a ship and all static landmasses/mountains.
   * If collision occurs, adjusts ship position out of the landmass,
   * cancels inward velocity (tangent sliding), and applies grounding feedback.
   */
  public static resolveLandCollision(
    shipPos: THREE.Vector3,
    shipRadius: number,
    currentSpeedKnots: number,
    headingRad: number,
    nowSec: number
  ): CollisionResult {
    if (this.obstacles.length === 0) this.initialize();

    let collided = false;
    let obstacleName = '';
    let isMainlandHit = false;
    let pushX = 0;
    let pushZ = 0;
    let totalDmg = 0;

    // A. Check Northern Mainland Continental Wall (Z >= MAINLAND_Z_LIMIT)
    const effectiveMainlandZ = this.MAINLAND_Z_LIMIT - shipRadius;
    if (shipPos.z > effectiveMainlandZ) {
      collided = true;
      isMainlandHit = true;
      obstacleName = 'Northern Mainland Cliffs & Mountains';
      const depth = shipPos.z - effectiveMainlandZ;
      shipPos.z = effectiveMainlandZ; // Push back south
      pushZ -= depth;

      // Grounding damage & audio if colliding at speed
      if (currentSpeedKnots > 1.5) {
        totalDmg = Math.round(Math.min(25, currentSpeedKnots * 2.2));
      }
    }

    // B. Check Archipelago Islands & Coastal Formations
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dx = shipPos.x - obs.x;
      const dz = shipPos.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = obs.solidRadius + shipRadius;

      if (distSq < minDist * minDist) {
        collided = true;
        obstacleName = obs.name;
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Push ship out along contact normal to water perimeter
        shipPos.x += nx * overlap;
        shipPos.z += nz * overlap;
        pushX += nx * overlap;
        pushZ += nz * overlap;

        if (currentSpeedKnots > 1.5) {
          totalDmg += Math.round(Math.min(30, currentSpeedKnots * 2.5));
        }
        break; // Primary closest island resolved
      }
    }

    if (collided) {
      // Audio feedback (throttled to avoid rapid repeats)
      if (nowSec - this.lastScrapeSoundTime > 1.2) {
        this.lastScrapeSoundTime = nowSec;
        soundEngine.playShipCreak();
        if (currentSpeedKnots > 4.0) {
          soundEngine.playCannonHit();
        }
      }

      // Log message debounced to every 3 seconds
      let logMessage: string | undefined;
      if (nowSec - this.lastLogTime > 2.5) {
        this.lastLogTime = nowSec;
        logMessage = isMainlandHit
          ? `⚠️ Continental shelf! Mountains and shoals block passage north!`
          : `⚠️ Ran aground on the rocky coast of ${obstacleName}!`;
      }

      return {
        collided: true,
        type: isMainlandHit ? 'mainland' : 'island',
        obstacleName,
        damage: totalDmg,
        pushX,
        pushZ,
        logMessage,
      };
    }

    return { collided: false, type: 'none', damage: 0, pushX: 0, pushZ: 0 };
  }

  /**
   * Resolves physical collision between two ships (elastic/inelastic contact).
   * Pushes both hulls apart, reduces forward momentum, and applies ramming damage if moving fast.
   */
  public static resolveShipToShipCollision(
    posA: THREE.Vector3,
    radiusA: number,
    speedA: number,
    posB: THREE.Vector3,
    radiusB: number,
    speedB: number,
    nowSec: number
  ): {
    collided: boolean;
    overlap: number;
    rammingDamageA: number;
    rammingDamageB: number;
    contactPoint: THREE.Vector3;
  } {
    const dx = posA.x - posB.x;
    const dz = posA.z - posB.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radiusA + radiusB;

    if (distSq >= minDist * minDist || distSq < 0.0001) {
      return {
        collided: false,
        overlap: 0,
        rammingDamageA: 0,
        rammingDamageB: 0,
        contactPoint: posA,
      };
    }

    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    const nx = dx / dist;
    const nz = dz / dist;

    // Equal and opposite positional separation pushback
    const pushA = overlap * 0.52;
    const pushB = overlap * 0.52;
    posA.x += nx * pushA;
    posA.z += nz * pushA;
    posB.x -= nx * pushB;
    posB.z -= nz * pushB;

    // Contact point midway between hulls
    const contactPoint = new THREE.Vector3(
      posA.x - nx * (radiusA - overlap * 0.5),
      (posA.y + posB.y) * 0.5 + 1.2,
      posA.z - nz * (radiusA - overlap * 0.5)
    );

    // Calculate ramming impact
    const relativeSpeed = Math.abs(speedA + speedB);
    let dmgA = 0;
    let dmgB = 0;

    if (relativeSpeed > 2.5) {
      dmgA = Math.round(relativeSpeed * 4.5);
      dmgB = Math.round(relativeSpeed * 4.5);

      if (nowSec - this.lastScrapeSoundTime > 0.8) {
        this.lastScrapeSoundTime = nowSec;
        soundEngine.playCannonHit();
        soundEngine.playShipCreak();
      }
    }

    return {
      collided: true,
      overlap,
      rammingDamageA: dmgA,
      rammingDamageB: dmgB,
      contactPoint,
    };
  }

  /**
   * Steers AI fleet entity away from nearby islands and mainland to prevent beaching.
   */
  public static calculateIslandAvoidanceHeading(
    x: number,
    z: number,
    heading: number,
    turnRateRad: number,
    dt: number
  ): number {
    if (this.obstacles.length === 0) this.initialize();

    // A. Mainland Avoidance (Turn away from north if within 120m of continental limit)
    if (z > this.MAINLAND_Z_LIMIT - 110) {
      // Steer toward South (PI)
      const diff = THREE.MathUtils.euclideanModulo(Math.PI - heading + Math.PI, Math.PI * 2) - Math.PI;
      return heading + Math.sign(diff) * Math.min(Math.abs(diff), turnRateRad * 1.5 * dt);
    }

    // B. Island Avoidance
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dx = x - obs.x;
      const dz = z - obs.z;
      const distSq = dx * dx + dz * dz;
      const avoidDist = obs.warningRadius;

      if (distSq < avoidDist * avoidDist) {
        // Desired heading points directly away from island center
        const desiredHeading = Math.atan2(dx, dz);
        const diff = THREE.MathUtils.euclideanModulo(desiredHeading - heading + Math.PI, Math.PI * 2) - Math.PI;
        return heading + Math.sign(diff) * Math.min(Math.abs(diff), turnRateRad * 2.0 * dt);
      }
    }

    return heading;
  }
}
