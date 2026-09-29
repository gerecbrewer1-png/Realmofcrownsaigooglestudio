/**
 * Realm of Crowns - Authoritative Kingdom Service
 * Governs settlement buildings, construction queues, and dynamic resource production.
 */

import { KingdomState, BuildingInstance, ConstructionTask, TrainingTask, Resources, ProductionRates } from '../../types';
import {
  BUILDING_DEFINITIONS,
  GAME_CONFIG,
  calculateBuildingCost,
  calculateBuildingDurationSeconds,
  calculateProductionRate
} from './gameConfig';
import {
  TROOP_DEFINITIONS,
  getTroopDefinition,
  calculateTrainingCost,
  calculateTrainingDurationSeconds,
} from './militaryConfig';

export class KingdomService {
  private kingdoms: Map<string, KingdomState> = new Map();

  createDefaultKingdom(ownerUid: string, playerName: string): KingdomState {
    const starterBuildings: BuildingInstance[] = [
      { id: 'castle', type: 'castle', name: 'Main Castle', level: 1, slot: 'center', visualDistrict: 'central' },
      { id: 'farm_1', type: 'farm', name: 'Royal Farmstead', level: 1, slot: 'farm_1', visualDistrict: 'farmland' },
      { id: 'lumber_1', type: 'lumber_mill', name: 'Lumber Mill', level: 1, slot: 'lumber_1', visualDistrict: 'farmland' },
      { id: 'warehouse', type: 'warehouse', name: 'Grand Warehouse', level: 1, slot: 'warehouse', visualDistrict: 'central' },
      { id: 'barracks', type: 'barracks', name: 'Infantry Barracks', level: 1, slot: 'barracks', visualDistrict: 'military' },
      { id: 'wall', type: 'wall', name: 'Fortified Ramparts', level: 1, slot: 'wall', visualDistrict: 'walls' },
      // Empty or unlocked building slots ready for construction
      { id: 'quarry_1', type: 'quarry', name: 'Stone Quarry', level: 0, slot: 'quarry_1', visualDistrict: 'quarry' },
      { id: 'academy', type: 'academy', name: 'Royal Academy', level: 0, slot: 'academy', visualDistrict: 'central' },
      { id: 'hospital', type: 'hospital', name: 'Apothecary Hospital', level: 0, slot: 'hospital', visualDistrict: 'central' },
      { id: 'archery', type: 'archery_range', name: 'Archery Range', level: 0, slot: 'archery', visualDistrict: 'military' },
      { id: 'stable', type: 'stable', name: 'Warhorse Stables', level: 0, slot: 'stable', visualDistrict: 'military' },
      { id: 'iron_1', type: 'iron_mine', name: 'Iron Mine', level: 0, slot: 'iron_1', visualDistrict: 'quarry' },
      { id: 'gold_1', type: 'gold_mine', name: 'Gold Smelter', level: 0, slot: 'gold_1', visualDistrict: 'quarry' },
    ];

    const initialResources: Resources = { ...GAME_CONFIG.starterPackage.resources };
    const storageCap: Resources = {
      food: 250000,
      wood: 250000,
      stone: 180000,
      iron: 120000,
      gold: 80000,
    };

    const state: KingdomState = {
      id: `k_${ownerUid}`,
      ownerUid,
      name: `${playerName}'s Realm`,
      castleLevel: 1,
      resources: initialResources,
      storageCap,
      productionRates: {
        foodPerHour: 1200,
        woodPerHour: 1200,
        stonePerHour: 0,
        ironPerHour: 0,
        goldPerHour: 0,
      },
      lastResourceUpdate: Date.now(),
      buildings: starterBuildings,
      constructionQueue: [],
      maxQueueSlots: 2, // 2 simultaneous builder hammers
      troops: { ...GAME_CONFIG.starterPackage.starterTroops },
      trainingQueue: [],
      woundedTroops: {},
      hospitalCapacity: 5000,
    };

    this.recalculateProduction(state);
    this.kingdoms.set(ownerUid, state);
    return state;
  }

  getKingdom(ownerUid: string, playerName = 'Lord'): KingdomState {
    let kingdom = this.kingdoms.get(ownerUid);
    if (!kingdom) {
      kingdom = this.createDefaultKingdom(ownerUid, playerName);
    }
    this.updateAuthoritativeState(kingdom);
    return kingdom;
  }

  /**
   * Authoritatively updates resources produced since last tick and resolves completed building timers.
   */
  updateAuthoritativeState(kingdom: KingdomState): void {
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - kingdom.lastResourceUpdate) / 1000);

    if (elapsedSeconds > 0) {
      // Accumulate resources
      const hours = elapsedSeconds / 3600;
      kingdom.resources.food = Math.min(
        kingdom.storageCap.food,
        Math.floor(kingdom.resources.food + kingdom.productionRates.foodPerHour * hours)
      );
      kingdom.resources.wood = Math.min(
        kingdom.storageCap.wood,
        Math.floor(kingdom.resources.wood + kingdom.productionRates.woodPerHour * hours)
      );
      kingdom.resources.stone = Math.min(
        kingdom.storageCap.stone,
        Math.floor(kingdom.resources.stone + kingdom.productionRates.stonePerHour * hours)
      );
      kingdom.resources.iron = Math.min(
        kingdom.storageCap.iron,
        Math.floor(kingdom.resources.iron + kingdom.productionRates.ironPerHour * hours)
      );
      kingdom.resources.gold = Math.min(
        kingdom.storageCap.gold,
        Math.floor(kingdom.resources.gold + kingdom.productionRates.goldPerHour * hours)
      );
      kingdom.lastResourceUpdate = now;
    }

    // Resolve completed construction tasks
    const remainingTasks: ConstructionTask[] = [];
    let stateChanged = false;

    for (const task of kingdom.constructionQueue) {
      if (now >= task.completionTime) {
        // Complete the upgrade
        const b = kingdom.buildings.find((b) => b.id === task.buildingId);
        if (b) {
          b.level = task.targetLevel;
          b.isUpgrading = false;
          if (b.type === 'castle') {
            kingdom.castleLevel = b.level;
          }
        }
        stateChanged = true;
      } else {
        remainingTasks.push(task);
      }
    }

    kingdom.constructionQueue = remainingTasks;

    // Backward compatibility guards
    if (!kingdom.trainingQueue) kingdom.trainingQueue = [];
    if (!kingdom.woundedTroops) kingdom.woundedTroops = {};
    if (!kingdom.hospitalCapacity) kingdom.hospitalCapacity = 5000;

    // Resolve completed troop training tasks
    const remainingTraining: TrainingTask[] = [];
    for (const task of kingdom.trainingQueue) {
      if (now >= task.completionTime) {
        kingdom.troops[task.unitId] = (kingdom.troops[task.unitId] || 0) + task.quantity;
      } else {
        remainingTraining.push(task);
      }
    }
    kingdom.trainingQueue = remainingTraining;

    if (stateChanged) {
      this.recalculateProduction(kingdom);
    }
  }

  recalculateProduction(kingdom: KingdomState): void {
    const rates: ProductionRates = {
      foodPerHour: 0,
      woodPerHour: 0,
      stonePerHour: 0,
      ironPerHour: 0,
      goldPerHour: 0,
    };

    let warehouseLevel = 1;

    for (const b of kingdom.buildings) {
      if (b.level <= 0) continue;
      if (b.type === 'warehouse') warehouseLevel = b.level;

      const def = BUILDING_DEFINITIONS[b.type];
      if (def && def.baseProduction) {
        const p = calculateProductionRate(def, b.level);
        if (p.foodPerHour) rates.foodPerHour += p.foodPerHour;
        if (p.woodPerHour) rates.woodPerHour += p.woodPerHour;
        if (p.stonePerHour) rates.stonePerHour += p.stonePerHour;
        if (p.ironPerHour) rates.ironPerHour += p.ironPerHour;
        if (p.goldPerHour) rates.goldPerHour += p.goldPerHour;
      }
    }

    kingdom.productionRates = rates;
    // Scale warehouse storage
    const storageMultiplier = 1 + (warehouseLevel - 1) * 0.8;
    kingdom.storageCap = {
      food: Math.floor(250000 * storageMultiplier),
      wood: Math.floor(250000 * storageMultiplier),
      stone: Math.floor(180000 * storageMultiplier),
      iron: Math.floor(120000 * storageMultiplier),
      gold: Math.floor(80000 * storageMultiplier),
    };
  }

  startBuildingUpgrade(
    ownerUid: string,
    buildingId: string
  ): { success: boolean; error?: string; task?: ConstructionTask } {
    const kingdom = this.getKingdom(ownerUid);
    this.updateAuthoritativeState(kingdom);

    const building = kingdom.buildings.find((b) => b.id === buildingId);
    if (!building) {
      return { success: false, error: 'Building slot not found.' };
    }

    const def = BUILDING_DEFINITIONS[building.type];
    if (!def) {
      return { success: false, error: 'Building definition not registered.' };
    }

    const targetLevel = building.level + 1;
    if (targetLevel > def.maxLevel) {
      return { success: false, error: `Building already reached maximum level (${def.maxLevel}).` };
    }

    // Check if already in queue
    if (kingdom.constructionQueue.some((t) => t.buildingId === buildingId)) {
      return { success: false, error: 'Building is already undergoing construction.' };
    }

    // Check queue availability
    if (kingdom.constructionQueue.length >= kingdom.maxQueueSlots) {
      return { success: false, error: 'All builder hammers are currently occupied.' };
    }

    // Check castle level cap (except for castle itself)
    if (building.type !== 'castle' && targetLevel > kingdom.castleLevel) {
      return {
        success: false,
        error: `Requires Main Castle level ${targetLevel} before this structure can be upgraded further.`,
      };
    }

    // Check prerequisites
    for (const prereq of def.prerequisites) {
      const match = kingdom.buildings.find((b) => b.type === prereq.buildingType);
      if (!match || match.level < prereq.level) {
        const reqDef = BUILDING_DEFINITIONS[prereq.buildingType];
        return {
          success: false,
          error: `Requires ${reqDef?.name || prereq.buildingType} level ${prereq.level}.`,
        };
      }
    }

    // Calculate costs
    const costs = calculateBuildingCost(def, targetLevel);
    if (
      kingdom.resources.food < costs.food ||
      kingdom.resources.wood < costs.wood ||
      kingdom.resources.stone < costs.stone ||
      kingdom.resources.iron < costs.iron ||
      kingdom.resources.gold < costs.gold
    ) {
      return { success: false, error: 'Insufficient kingdom resources for this construction.' };
    }

    // Deduct resources
    kingdom.resources.food -= costs.food;
    kingdom.resources.wood -= costs.wood;
    kingdom.resources.stone -= costs.stone;
    kingdom.resources.iron -= costs.iron;
    kingdom.resources.gold -= costs.gold;

    const durationSeconds = calculateBuildingDurationSeconds(def, targetLevel);
    const now = Date.now();
    const task: ConstructionTask = {
      taskId: `task_${Date.now()}_${buildingId}`,
      buildingId,
      buildingType: building.type,
      buildingName: def.name,
      targetLevel,
      startTime: now,
      completionTime: now + durationSeconds * 1000,
      durationSeconds,
    };

    building.isUpgrading = true;
    kingdom.constructionQueue.push(task);

    return { success: true, task };
  }

  applySpeedup(
    ownerUid: string,
    taskId: string,
    minutes: number
  ): { success: boolean; completed: boolean; error?: string } {
    const kingdom = this.getKingdom(ownerUid);
    const task = kingdom.constructionQueue.find((t) => t.taskId === taskId);
    if (!task) return { success: false, completed: false, error: 'Construction task not found.' };

    const reductionMs = minutes * 60 * 1000;
    task.completionTime = Math.max(Date.now(), task.completionTime - reductionMs);

    this.updateAuthoritativeState(kingdom);
    const stillInQueue = kingdom.constructionQueue.some((t) => t.taskId === taskId);
    return { success: true, completed: !stillInQueue };
  }

  instantComplete(
    ownerUid: string,
    taskId: string
  ): { success: boolean; completed: boolean; error?: string } {
    const kingdom = this.getKingdom(ownerUid);
    const task = kingdom.constructionQueue.find((t) => t.taskId === taskId);
    if (!task) return { success: false, completed: false, error: 'Construction task not found.' };

    task.completionTime = Date.now() - 1000;
    this.updateAuthoritativeState(kingdom);
    return { success: true, completed: true };
  }

  getTask(ownerUid: string, taskId: string): ConstructionTask | undefined {
    const kingdom = this.getKingdom(ownerUid);
    this.updateAuthoritativeState(kingdom);
    return kingdom.constructionQueue.find((t) => t.taskId === taskId);
  }

  // -------------------------------------------------------------------------
  // MILITARY TROOP TRAINING & RECRUITMENT
  // -------------------------------------------------------------------------

  startTroopTraining(
    ownerUid: string,
    buildingId: string,
    unitId: string,
    quantity: number
  ): { success: boolean; error?: string; task?: TrainingTask } {
    const kingdom = this.getKingdom(ownerUid);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { success: false, error: 'Quantity must be a positive integer.' };
    }

    const unitDef = getTroopDefinition(unitId);
    if (!unitDef) {
      return { success: false, error: `Invalid unit type: ${unitId}` };
    }

    // Validate training facility
    const building = kingdom.buildings.find((b) => b.id === buildingId);
    if (!building) {
      return { success: false, error: 'Training building not found.' };
    }

    // Siege can be trained in barracks or workshop
    const canTrainInBuilding =
      building.type === unitDef.buildingType ||
      (unitDef.category === 'siege' && building.type === 'barracks');

    if (!canTrainInBuilding) {
      return {
        success: false,
        error: `${unitDef.name} must be trained in a ${unitDef.buildingType}.`,
      };
    }

    if (building.level < unitDef.requiredBuildingLevel) {
      return {
        success: false,
        error: `${unitDef.name} requires ${unitDef.buildingType} level ${unitDef.requiredBuildingLevel}. Current is level ${building.level}.`,
      };
    }

    // Check resource costs
    const totalCost = calculateTrainingCost(unitDef, quantity);
    if (
      kingdom.resources.food < totalCost.food ||
      kingdom.resources.wood < totalCost.wood ||
      kingdom.resources.stone < totalCost.stone ||
      kingdom.resources.iron < totalCost.iron ||
      kingdom.resources.gold < totalCost.gold
    ) {
      return { success: false, error: 'Insufficient resources to drill these troops.' };
    }

    // Deduct resources
    kingdom.resources.food -= totalCost.food;
    kingdom.resources.wood -= totalCost.wood;
    kingdom.resources.stone -= totalCost.stone;
    kingdom.resources.iron -= totalCost.iron;
    kingdom.resources.gold -= totalCost.gold;

    const durationSeconds = calculateTrainingDurationSeconds(unitDef, quantity);
    const now = Date.now();
    const task: TrainingTask = {
      taskId: `train_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      buildingId,
      buildingType: building.type,
      unitId: unitDef.unitId,
      unitName: unitDef.name,
      category: unitDef.category,
      tier: unitDef.tier,
      quantity,
      startTime: now,
      completionTime: now + durationSeconds * 1000,
      durationSeconds,
    };

    kingdom.trainingQueue.push(task);
    return { success: true, task };
  }

  speedupTraining(
    ownerUid: string,
    taskId: string,
    minutes: number
  ): { success: boolean; completed: boolean; error?: string } {
    const kingdom = this.getKingdom(ownerUid);
    const task = kingdom.trainingQueue.find((t) => t.taskId === taskId);
    if (!task) return { success: false, completed: false, error: 'Training task not found.' };

    const reductionMs = minutes * 60 * 1000;
    task.completionTime = Math.max(Date.now(), task.completionTime - reductionMs);

    this.updateAuthoritativeState(kingdom);
    const stillInQueue = kingdom.trainingQueue.some((t) => t.taskId === taskId);
    return { success: true, completed: !stillInQueue };
  }

  instantCompleteTraining(
    ownerUid: string,
    taskId: string
  ): { success: boolean; completed: boolean; error?: string } {
    const kingdom = this.getKingdom(ownerUid);
    const task = kingdom.trainingQueue.find((t) => t.taskId === taskId);
    if (!task) return { success: false, completed: false, error: 'Training task not found.' };

    task.completionTime = Date.now() - 1000;
    this.updateAuthoritativeState(kingdom);
    return { success: true, completed: true };
  }

  // -------------------------------------------------------------------------
  // CITADEL HOSPITAL & HEALING
  // -------------------------------------------------------------------------

  healWoundedTroops(
    ownerUid: string,
    unitId: string,
    quantity: number
  ): { success: boolean; error?: string } {
    const kingdom = this.getKingdom(ownerUid);
    const currentWounded = kingdom.woundedTroops[unitId] || 0;
    if (quantity <= 0 || quantity > currentWounded) {
      return { success: false, error: 'Invalid healing quantity.' };
    }

    const unitDef = getTroopDefinition(unitId);
    if (!unitDef) return { success: false, error: 'Invalid unit type.' };

    // Healing costs 35% of training cost in food/iron
    const foodCost = Math.floor((unitDef.trainingCost.food || 0) * quantity * 0.35);
    const ironCost = Math.floor((unitDef.trainingCost.iron || 0) * quantity * 0.35);

    if (kingdom.resources.food < foodCost || kingdom.resources.iron < ironCost) {
      return { success: false, error: 'Insufficient hospital provisions to treat wounded.' };
    }

    kingdom.resources.food -= foodCost;
    kingdom.resources.iron -= ironCost;
    kingdom.woundedTroops[unitId] -= quantity;
    if (kingdom.woundedTroops[unitId] <= 0) {
      delete kingdom.woundedTroops[unitId];
    }
    kingdom.troops[unitId] = (kingdom.troops[unitId] || 0) + quantity;

    return { success: true };
  }

  instantHealAllWounded(ownerUid: string): { success: boolean; totalHealed: number } {
    const kingdom = this.getKingdom(ownerUid);
    let totalHealed = 0;
    for (const [unitId, count] of Object.entries(kingdom.woundedTroops)) {
      if (count > 0) {
        kingdom.troops[unitId] = (kingdom.troops[unitId] || 0) + count;
        totalHealed += count;
      }
    }
    kingdom.woundedTroops = {};
    return { success: true, totalHealed };
  }
}

export const kingdomService = new KingdomService();
