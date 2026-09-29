/**
 * Realm of Crowns — Deterministic NPC Decision & Schedule Utility System
 * Evaluates immediate survival, 4-phase daily schedules (Morning, Day, Evening, Night),
 * social needs, speech greetings, and raid emergency reactions.
 */

import { NPCEntity, Vector3D } from '../npc/npcTypes';
import { PersonalitySystem } from './personalitySystem';

export interface WorldContext {
  timeOfDayHours: number; // 0.0 to 24.0 (e.g. 8.0 = morning, 12.0 = noon, 19.0 = evening, 23.0 = night)
  isRaidActive: boolean;
  playerPos?: Vector3D;
  threats: NPCEntity[];
  allies: NPCEntity[];
  villageCenter: Vector3D;
  safeHouse: Vector3D;
}

export class DecisionSystem {
  /**
   * Updates an NPC's behavior state and destination based on internal traits, needs, daily schedules, and context
   */
  public static updateDecision(npc: NPCEntity, context: WorldContext, deltaSec: number): void {
    if (npc.health <= 0) {
      npc.activity = 'idle';
      npc.animationState = 'Death_A';
      return;
    }

    // Decrement speech bubble timer
    if (npc.speechBubbleTimer && npc.speechBubbleTimer > 0) {
      npc.speechBubbleTimer -= deltaSec;
      if (npc.speechBubbleTimer <= 0) {
        npc.speechBubbleText = null;
      }
    }

    const mods = PersonalitySystem.evaluateModifiers(npc);
    const healthFraction = npc.health / npc.maxHealth;

    // 1. Scan for closest hostile threat
    let closestThreat: NPCEntity | null = null;
    let closestDistSq = Infinity;
    const basePerceptionDist = npc.role === 'guard' || npc.role === 'hero' ? 30.0 : 18.0;
    const effectivePerceptionDist = basePerceptionDist * mods.aggroDistanceMultiplier;

    context.threats.forEach((threat) => {
      if (threat.health <= 0) return;
      const dx = threat.position.x - npc.position.x;
      const dz = threat.position.z - npc.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < effectivePerceptionDist * effectivePerceptionDist && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestThreat = threat;
      }
    });

    const isThreatNear = !!closestThreat;
    const threatDist = Math.sqrt(closestDistSq);

    // 2. High-Priority Survival & Raid Emergency Evaluation
    if (context.isRaidActive || isThreatNear) {
      // Check if entity panics and flees
      const shouldFlee =
        healthFraction < mods.fleeHealthThreshold ||
        npc.role === 'wildlife' ||
        (npc.role === 'villager' && mods.combatWillingness < 0.55 && npc.occupation !== 'BLACKSMITH');

      if (shouldFlee) {
        npc.activity = 'fleeing';
        npc.animationState = 'Running_A';
        npc.moveSpeed = 4.8;
        npc.speechBubbleText = npc.dialogue?.raidPanic || 'Bandits! To the Great Keep!';
        npc.speechBubbleTimer = 2.0;

        if (closestThreat) {
          // Flee away from threat toward Great Keep safehouse
          const awayX = npc.position.x - (closestThreat as NPCEntity).position.x;
          const awayZ = npc.position.z - (closestThreat as NPCEntity).position.z;
          const awayLen = Math.hypot(awayX, awayZ) || 1;
          npc.targetPosition = {
            x: npc.position.x + (awayX / awayLen) * 14 + (context.safeHouse.x - npc.position.x) * 0.4,
            y: 0,
            z: npc.position.z + (awayZ / awayLen) * 14 + (context.safeHouse.z - npc.position.z) * 0.4,
          };
        } else {
          npc.targetPosition = { ...context.safeHouse };
        }
        return;
      }

      // Defenders, Guards, Soldiers, Heroes, and Brave Craftsmen: Stand & Fight
      if (
        npc.role === 'guard' ||
        npc.role === 'soldier' ||
        npc.role === 'hero' ||
        mods.combatWillingness >= 0.55 ||
        npc.occupation === 'BLACKSMITH'
      ) {
        if (closestThreat) {
          npc.currentTargetId = (closestThreat as NPCEntity).id;
          if (threatDist <= npc.attackRange) {
            // In melee range: Attack!
            npc.activity = 'attacking';
            npc.targetPosition = null;
            npc.animationState = '1H_Melee_Attack_Chop';
            const dx = (closestThreat as NPCEntity).position.x - npc.position.x;
            const dz = (closestThreat as NPCEntity).position.z - npc.position.z;
            npc.rotationY = Math.atan2(dx, dz);
          } else {
            // Close distance
            npc.activity = 'defending';
            npc.animationState = 'Running_A';
            npc.moveSpeed = 4.2;
            npc.targetPosition = {
              x: (closestThreat as NPCEntity).position.x,
              y: 0,
              z: (closestThreat as NPCEntity).position.z,
            };
          }
          return;
        }
      }
    }

    // 3. Peacetime Schedule & Daily Routine (Morning, Day, Evening, Night)
    npc.currentTargetId = null;
    const hour = context.timeOfDayHours;

    // Check Player Proximity for friendly interaction / greeting
    if (context.playerPos) {
      const pDist = Math.hypot(context.playerPos.x - npc.position.x, context.playerPos.z - npc.position.z);
      if (pDist < 4.0 && !npc.speechBubbleText) {
        // Face player
        const pdx = context.playerPos.x - npc.position.x;
        const pdz = context.playerPos.z - npc.position.z;
        npc.rotationY = Math.atan2(pdx, pdz);

        if (npc.role === 'merchant') {
          npc.speechBubbleText = 'Finest goods in the realm! Trade with me, Sire!';
        } else if (npc.role === 'guard') {
          npc.speechBubbleText = 'Citadel gates secure, Commander Arthurian!';
        } else if (npc.relationshipScore >= 50) {
          npc.speechBubbleText = 'Blessings upon your noble house, Lord Arthurian!';
        } else if (npc.occupation === 'FARMER') {
          npc.speechBubbleText = 'The wheat grows tall under your protection, my Lord!';
        } else if (npc.occupation === 'BLACKSMITH') {
          npc.speechBubbleText = 'Cold iron and honest steel for your Vanguard!';
        } else {
          npc.speechBubbleText = npc.dialogue?.greeting || 'Good day, my Lord!';
        }
        npc.speechBubbleTimer = 3.0;
      }
    }

    if (hour >= 22.0 || hour < 6.0) {
      // Phase 4: NIGHT (22:00 - 6:00) — Sleep / Rest at home quarters
      npc.activity = 'sleeping';
      const sleepTarget = npc.schedule?.night || npc.homePosition;
      npc.targetPosition = { ...sleepTarget };
      npc.moveSpeed = 2.0;
      npc.animationState = Math.hypot(npc.position.x - sleepTarget.x, npc.position.z - sleepTarget.z) > 1.2 ? 'Walking_A' : 'Idle';
    } else if (hour >= 6.0 && hour < 9.0) {
      // Phase 1: MORNING (6:00 - 9:00) — Wake up, travel to workstation
      npc.activity = 'working';
      const morningTarget = npc.schedule?.morning || npc.workPosition;
      npc.targetPosition = { ...morningTarget };
      npc.moveSpeed = 2.2;
      npc.animationState = Math.hypot(npc.position.x - morningTarget.x, npc.position.z - morningTarget.z) > 1.0 ? 'Walking_A' : 'Idle';
    } else if (hour >= 9.0 && hour < 18.0) {
      // Phase 2: DAY (9:00 - 18:00) — Work at assigned vocation
      if (npc.role === 'guard') {
        npc.activity = 'patrolling';
        npc.animationState = 'Walking_A';
        npc.moveSpeed = 2.5;
        // Guard patrol cycle along south gate & palisade
        const patrolT = Math.sin(Date.now() * 0.0004) * 0.5 + 0.5;
        npc.targetPosition = {
          x: npc.workPosition.x * patrolT + context.villageCenter.x * (1 - patrolT),
          y: 0,
          z: npc.workPosition.z * patrolT + (context.villageCenter.z + 20) * (1 - patrolT),
        };
      } else {
        // Villager working at vocation (Farm, Blacksmith, Sawmill, Market, etc.)
        npc.activity = 'working';
        const dayTarget = npc.schedule?.day || npc.workPosition;
        npc.targetPosition = { ...dayTarget };
        npc.moveSpeed = 2.2;
        npc.animationState = Math.hypot(npc.position.x - dayTarget.x, npc.position.z - dayTarget.z) > 1.0 ? 'Walking_A' : 'Idle';
      }
    } else {
      // Phase 3: EVENING (18:00 - 22:00) — Socialize at central plaza, tavern, or campfire
      npc.activity = 'socializing';
      const eveningTarget = npc.schedule?.evening || {
        x: context.villageCenter.x + (Math.sin(parseInt(npc.id.slice(-2) || '1', 10) * 1.5) * 4.5),
        y: 0,
        z: context.villageCenter.z + (Math.cos(parseInt(npc.id.slice(-2) || '1', 10) * 1.5) * 4.5),
      };
      npc.targetPosition = { ...eveningTarget };
      npc.moveSpeed = 2.0;
      npc.animationState = Math.hypot(npc.position.x - eveningTarget.x, npc.position.z - eveningTarget.z) > 1.0 ? 'Walking_A' : 'Idle';
    }
  }

  /**
   * Translates entity toward its current targetPosition with smooth steering and obstacle jitter prevention
   */
  public static executeMovement(npc: NPCEntity, deltaSec: number): void {
    if (!npc.targetPosition || npc.health <= 0 || npc.activity === 'attacking') {
      npc.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    const dx = npc.targetPosition.x - npc.position.x;
    const dz = npc.targetPosition.z - npc.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.35) {
      npc.position.x = npc.targetPosition.x;
      npc.position.z = npc.targetPosition.z;
      npc.targetPosition = null;
      npc.velocity = { x: 0, y: 0, z: 0 };
      npc.animationState = 'Idle';
      return;
    }

    const step = Math.min(dist, npc.moveSpeed * deltaSec);
    const dirX = dx / dist;
    const dirZ = dz / dist;

    npc.position.x += dirX * step;
    npc.position.z += dirZ * step;
    npc.velocity = { x: dirX * npc.moveSpeed, y: 0, z: dirZ * npc.moveSpeed };

    // Smooth rotational alignment
    const targetAngle = Math.atan2(dirX, dirZ);
    let diff = targetAngle - npc.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    npc.rotationY += diff * Math.min(1.0, 10.0 * deltaSec);
  }
}
