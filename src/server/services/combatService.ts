/**
 * Realm of Crowns - Deterministic Server-Authoritative Combat Service
 * Implements tactical multi-round army battle simulation, combat counter-triangle calculations,
 * commander talent application, casualties split (surviving, hospital wounded, dead),
 * resource plunder payload capping, and battle report generation.
 */

import {
  BattleReport,
  BattleRound,
  Commander,
  HexCoordinates,
  Resources,
  BarbarianCamp,
  RivalKingdom,
} from '../../types';
import {
  getTroopDefinition,
  COMBAT_TRIANGLE_ADVANTAGE,
  calculateArmyPayloadCapacity,
  COMMANDER_ROSTER,
} from './militaryConfig';
import { playerService } from './playerService';
import { kingdomService } from './kingdomService';

export interface CombatArmyInput {
  playerId: string;
  playerName: string;
  commanderId?: string;
  commanderName?: string;
  troops: Record<string, number>;
}

export interface CombatTargetInput {
  coords: HexCoordinates;
  name: string;
  entityType: 'barbarian_camp' | 'rival_kingdom';
  barbarianCamp?: BarbarianCamp;
  rivalKingdom?: RivalKingdom;
}

export interface CombatResolutionResult {
  victory: boolean;
  battleReport: BattleReport;
  survivingTroops: Record<string, number>;
  severelyWoundedTroops: Record<string, number>;
  killedTroops: Record<string, number>;
  plunderedResources: Resources;
  gemReward: number;
  expReward: number;
  commanderLevelUp: boolean;
  newCommanderLevel?: number;
}

export class CombatService {
  /**
   * Deterministically resolves combat between an attacking army and a world map target.
   */
  resolveCombat(army: CombatArmyInput, target: CombatTargetInput): CombatResolutionResult {
    const now = Date.now();
    const commander = army.commanderId ? COMMANDER_ROSTER[army.commanderId] : undefined;

    // 1. Calculate Attacker Stats & Category Breakdowns
    let attackerAttack = 0;
    let attackerDefense = 0;
    let attackerHp = 0;
    let attackerTotalTroops = 0;

    const attackerCategoryCounts = {
      infantry: 0,
      ranged: 0,
      cavalry: 0,
      siege: 0,
    };

    for (const [unitId, count] of Object.entries(army.troops)) {
      if (count <= 0) continue;
      attackerTotalTroops += count;
      const def = getTroopDefinition(unitId);
      if (def) {
        attackerCategoryCounts[def.category] += count;
        attackerAttack += def.attack * count;
        attackerDefense += def.defense * count;
        attackerHp += def.health * count;
      } else {
        // Fallback generic stats
        attackerAttack += 20 * count;
        attackerDefense += 20 * count;
        attackerHp += 40 * count;
      }
    }

    // Apply Commander Class & Archetype Bonuses
    if (commander) {
      const levelMult = 1 + (commander.level - 1) * 0.05;

      // 1. Class-specific attribute scaling
      const heroClass = commander.heroClass || 
        (commander.archetype === 'cavalry' ? 'warlord' : 
         commander.archetype === 'infantry' ? 'guardian' : 
         commander.archetype === 'ranged' ? 'ranger' : 'steward');

      if (heroClass === 'warlord') {
        const atkBonus = (commander.stats?.armyAttack || 0.18) * levelMult;
        attackerAttack += Math.round(attackerAttack * atkBonus);
        if (target.entityType === 'barbarian_camp') {
          const pveBonus = commander.stats?.pveDamageBonus || 0.20;
          attackerAttack += Math.round(attackerAttack * pveBonus);
        }
        if (target.entityType === 'rival_kingdom') {
          const pvpBonus = commander.stats?.pvpDamageBonus || 0.15;
          attackerAttack += Math.round(attackerAttack * pvpBonus);
        }
      } else if (heroClass === 'guardian') {
        const defBonus = (commander.stats?.armyDefense || 0.22) * levelMult;
        const hpBonus = (commander.stats?.armyHealth || 0.18) * levelMult;
        attackerDefense += Math.round(attackerDefense * defBonus);
        attackerHp += Math.round(attackerHp * hpBonus);
      } else if (heroClass === 'ranger') {
        const atkBonus = (commander.stats?.armyAttack || 0.12) * levelMult;
        const defBonus = (commander.stats?.armyDefense || 0.06) * levelMult;
        attackerAttack += Math.round(attackerAttack * atkBonus);
        attackerDefense += Math.round(attackerDefense * defBonus);
      } else if (heroClass === 'steward') {
        attackerDefense += Math.round(100 * levelMult);
        attackerHp += Math.round(150 * levelMult);
      } else if (heroClass === 'strategist') {
        const atkBonus = (commander.stats?.armyAttack || 0.12) * levelMult;
        const defBonus = (commander.stats?.armyDefense || 0.12) * levelMult;
        attackerAttack += Math.round(attackerAttack * atkBonus);
        attackerDefense += Math.round(attackerDefense * defBonus);
        attackerHp += Math.round(attackerHp * 0.10);
      }

      // 2. Unit-specific synergy bonuses
      if (commander.archetype === 'infantry') {
        attackerAttack += attackerCategoryCounts.infantry * 10 * levelMult;
        attackerDefense += attackerCategoryCounts.infantry * 12 * levelMult;
      } else if (commander.archetype === 'cavalry') {
        attackerAttack += attackerCategoryCounts.cavalry * 14 * levelMult;
      } else if (commander.archetype === 'ranged') {
        attackerAttack += attackerCategoryCounts.ranged * 14 * levelMult;
      } else if (commander.archetype === 'gathering') {
        attackerDefense += 100 * levelMult;
      }
    }

    // 2. Determine Defender Stats
    let defenderAttack = 0;
    let defenderDefense = 0;
    let defenderHp = 0;
    let defenderTroopsInitial: Record<string, number> = {};

    if (target.entityType === 'barbarian_camp' && target.barbarianCamp) {
      const camp = target.barbarianCamp;
      defenderTroopsInitial = { ...camp.garrison };
      const campLevel = camp.level || 1;
      defenderAttack = camp.power * 0.55 + campLevel * 150;
      defenderDefense = camp.power * 0.45 + campLevel * 120;
      defenderHp = camp.power * 1.8;
    } else {
      // Rival kingdom or fallback
      const rivalPower = target.rivalKingdom?.power || 5000;
      defenderAttack = rivalPower * 0.5;
      defenderDefense = rivalPower * 0.5;
      defenderHp = rivalPower * 1.6;
      defenderTroopsInitial = { swordsman_t1: 100, archer_t1: 80 };
    }

    // 3. Multi-Round Combat Simulation
    const rounds: BattleRound[] = [];
    let currentAttackerHp = attackerHp;
    let currentDefenderHp = defenderHp;

    const roundPhases = [
      { round: 1, name: 'Ranged Skirmish Volley', desc: 'Archers unleash a hail of arrows across no-man’s land.' },
      { round: 2, name: 'Frontline Melee Clash', desc: 'Infantry and vanguard cavalry crash into the enemy formation.' },
      { round: 3, name: 'Flank Charge & Shock Assault', desc: 'Cavalry wings execute deep flanking maneuvers to break lines.' },
      { round: 4, name: 'Decisive Breakthrough', desc: 'The sovereign army pushes forward in an all-out decisive drive.' },
    ];

    for (const phase of roundPhases) {
      if (currentAttackerHp <= 0 || currentDefenderHp <= 0) break;

      // Calculate Round Damage with tactical advantage
      let roundAtkMultiplier = 1.0;
      if (phase.round === 1) {
        if (attackerCategoryCounts.ranged > 0) roundAtkMultiplier += 0.2; // Ranged bonus in volley phase
        if (commander?.heroClass === 'ranger') roundAtkMultiplier += 0.20; // Ranger First Strike Volley
      }
      if (phase.round === 2) {
        if (attackerCategoryCounts.infantry > 0) roundAtkMultiplier += 0.15;
        if (commander?.heroClass === 'warlord') roundAtkMultiplier += 0.25; // Warlord Frontline Breakthrough
      }
      if (phase.round === 3) {
        if (attackerCategoryCounts.cavalry > 0) roundAtkMultiplier += 0.25; // Cavalry shock
        if (commander?.heroClass === 'strategist') roundAtkMultiplier += 0.20; // Strategist Tactical Re-formation
      }

      const atkDmg = Math.max(
        15,
        Math.floor(((attackerAttack * roundAtkMultiplier) / Math.max(1, defenderDefense * 0.05)) * 0.3)
      );
      const defDmg = Math.max(
        10,
        Math.floor((defenderAttack / Math.max(1, attackerDefense * 0.05)) * 0.25)
      );

      currentDefenderHp = Math.max(0, currentDefenderHp - atkDmg);
      currentAttackerHp = Math.max(0, currentAttackerHp - defDmg);

      rounds.push({
        round: phase.round,
        phaseName: phase.name,
        attackerDamageDealt: atkDmg,
        defenderDamageDealt: defDmg,
        description: phase.desc,
      });
    }

    // 4. Determine Victory Condition
    const victory = currentDefenderHp <= 0 || currentAttackerHp / attackerHp >= currentDefenderHp / defenderHp;

    // 5. Calculate Casualties & Hospital Recovery
    // Damage ratio determines overall casualties
    const damageTakenRatio = Math.min(0.85, Math.max(0.05, 1 - currentAttackerHp / Math.max(1, attackerHp)));
    const totalCasualtiesCount = Math.floor(attackerTotalTroops * damageTakenRatio * (victory ? 0.35 : 0.75));

    const survivingTroops: Record<string, number> = {};
    const severelyWoundedTroops: Record<string, number> = {};
    const killedTroops: Record<string, number> = {};
    const playerCasualties: Record<string, number> = {};

    let remainingCasualtiesToDistribute = totalCasualtiesCount;

    // Base: 65% saved to hospital, 35% KIA. Guardians convert up to 85% to hospital wounded
    let hospitalSaveRatio = 0.65;
    if (commander?.heroClass === 'guardian') {
      const casualtyShield = commander.stats?.casualtyProtection || 0.18;
      hospitalSaveRatio = Math.min(0.88, 0.65 + casualtyShield);
    }

    for (const [unitId, count] of Object.entries(army.troops)) {
      if (count <= 0) continue;
      const proportion = count / Math.max(1, attackerTotalTroops);
      const unitLosses = Math.min(count, Math.round(remainingCasualtiesToDistribute * proportion));

      const woundedCount = Math.floor(unitLosses * hospitalSaveRatio);
      const deadCount = unitLosses - woundedCount;
      const survivors = Math.max(0, count - unitLosses);

      survivingTroops[unitId] = survivors;
      if (woundedCount > 0) severelyWoundedTroops[unitId] = woundedCount;
      if (deadCount > 0) killedTroops[unitId] = deadCount;
      if (unitLosses > 0) playerCasualties[unitId] = unitLosses;
    }

    // 6. Plunder & Resource Rewards
    const survivingPayloadCap = calculateArmyPayloadCapacity(survivingTroops, commander);
    const plunderedResources: Resources = { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 };
    let gemReward = 0;
    let expReward = 0;
    let speedupMinutes = 0;

    if (victory) {
      if (target.entityType === 'barbarian_camp' && target.barbarianCamp) {
        const camp = target.barbarianCamp;
        gemReward = camp.rewards.gems || 30;
        expReward = camp.rewards.exp || 250;
        speedupMinutes = camp.rewards.speedupMinutes || 5;

        const maxLoot = Math.min(survivingPayloadCap, 50000);
        const eachLoot = Math.floor(maxLoot / 3);
        plunderedResources.food = eachLoot;
        plunderedResources.wood = eachLoot;
        plunderedResources.stone = eachLoot;
      }
    } else {
      // Consolation EXP
      expReward = 75;
    }

    // 7. Commander Progression
    let commanderLevelUp = false;
    let newCommanderLevel = commander?.level;

    if (commander) {
      commander.exp += expReward;
      while (commander.exp >= commander.maxExp && commander.level < 50) {
        commander.exp -= commander.maxExp;
        commander.level += 1;
        commander.maxExp = Math.round(commander.maxExp * 1.35);
        commander.power += 300;
        commanderLevelUp = true;
        newCommanderLevel = commander.level;
      }
    }

    // 8. Update Citadel Hospital with Severely Wounded
    if (Object.keys(severelyWoundedTroops).length > 0) {
      const kingdom = kingdomService.getKingdom(army.playerId);
      for (const [unitId, count] of Object.entries(severelyWoundedTroops)) {
        kingdom.woundedTroops[unitId] = (kingdom.woundedTroops[unitId] || 0) + count;
      }
    }

    // 9. Construct Comprehensive Battle Report
    const battleReport: BattleReport = {
      id: `battle_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      targetName: target.name,
      targetCoords: target.coords,
      victory,
      commanderId: army.commanderId,
      commanderName: army.commanderName || commander?.name,
      commanderExpGained: expReward,
      commanderLevelUp,
      newCommanderLevel,
      rounds,
      rewards: {
        gems: gemReward,
        resources: plunderedResources,
        speedupMinutes,
      },
      playerTroopsSent: { ...army.troops },
      playerCasualties,
      playerSeverelyWounded: severelyWoundedTroops,
      playerKilled: killedTroops,
      playerSurviving: survivingTroops,
      enemyTroopsInitial: defenderTroopsInitial,
      enemyTroopsDefeated: victory ? defenderTroopsInitial : {},
      plunderedResources,
    };

    return {
      victory,
      battleReport,
      survivingTroops,
      severelyWoundedTroops,
      killedTroops,
      plunderedResources,
      gemReward,
      expReward,
      commanderLevelUp,
      newCommanderLevel,
    };
  }
}

export const combatService = new CombatService();
