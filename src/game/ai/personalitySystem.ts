/**
 * Realm of Crowns — NPC Personality & Trait System
 * Translates 14 discrete personality traits into quantitative behavioral multipliers.
 */

import { PersonalityTrait, NPCEntity } from '../npc/npcTypes';

export interface BehavioralModifiers {
  fleeHealthThreshold: number; // Health fraction (0.0 to 1.0) where entity breaks and flees
  aggroDistanceMultiplier: number;
  combatWillingness: number;   // 0.0 (pacifist/flee) to 1.0 (stand and fight)
  socialUrgeMultiplier: number;
  workDutyMultiplier: number;
  allyAssistanceRadius: number;
}

export class PersonalitySystem {
  /**
   * Derives real-time behavioral decision modifiers from an entity's trait set and core attributes
   */
  public static evaluateModifiers(entity: NPCEntity): BehavioralModifiers {
    const traits = entity.traits;

    let fleeHealthThreshold = 0.35; // Default: flee at 35% health
    let aggroDistanceMultiplier = 1.0;
    let combatWillingness = entity.courage;
    let socialUrgeMultiplier = entity.sociability;
    let workDutyMultiplier = 1.0;
    let allyAssistanceRadius = 14.0;

    // 1. Courage & Cowardice
    if (traits.has('BRAVE')) {
      fleeHealthThreshold -= 0.20; // Only flee at 15% health
      combatWillingness += 0.35;
      allyAssistanceRadius += 10.0;
    }
    if (traits.has('COWARDLY')) {
      fleeHealthThreshold += 0.35; // Flee at 70% health or on sight of danger
      combatWillingness -= 0.50;
      aggroDistanceMultiplier *= 0.6;
    }

    // 2. Belligerence & Caution
    if (traits.has('AGGRESSIVE')) {
      aggroDistanceMultiplier *= 1.4;
      combatWillingness += 0.25;
      fleeHealthThreshold -= 0.10;
    }
    if (traits.has('CAUTIOUS')) {
      aggroDistanceMultiplier *= 0.8;
      fleeHealthThreshold += 0.15;
    }

    // 3. Loyalty & Protection
    if (traits.has('LOYAL')) {
      combatWillingness += 0.20;
      allyAssistanceRadius += 12.0;
    }
    if (traits.has('PROTECTIVE')) {
      allyAssistanceRadius += 16.0;
      combatWillingness += 0.30;
    }

    // 4. Social & Work Tendencies
    if (traits.has('SOCIABLE')) {
      socialUrgeMultiplier *= 1.6;
    }
    if (traits.has('LONER')) {
      socialUrgeMultiplier *= 0.3;
    }
    if (traits.has('DUTIFUL')) {
      workDutyMultiplier *= 1.5;
    }
    if (traits.has('SELFISH')) {
      allyAssistanceRadius *= 0.4;
      fleeHealthThreshold += 0.10;
    }
    if (traits.has('KIND')) {
      allyAssistanceRadius += 8.0;
    }

    return {
      fleeHealthThreshold: Math.max(0.05, Math.min(0.90, fleeHealthThreshold)),
      aggroDistanceMultiplier: Math.max(0.4, Math.min(2.0, aggroDistanceMultiplier)),
      combatWillingness: Math.max(0.0, Math.min(1.0, combatWillingness)),
      socialUrgeMultiplier: Math.max(0.1, Math.min(2.5, socialUrgeMultiplier)),
      workDutyMultiplier: Math.max(0.2, Math.min(2.5, workDutyMultiplier)),
      allyAssistanceRadius: Math.max(4.0, Math.min(35.0, allyAssistanceRadius)),
    };
  }
}
