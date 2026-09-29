/**
 * Realm of Crowns - Authoritative Quest Service
 * Tracks chapter milestones, validates completion criteria, and grants anti-cheat rewards.
 */

import { QuestProgress, QuestDefinition, Resources } from '../../types';
import { INITIAL_QUESTS } from './gameConfig';
import { kingdomService } from './kingdomService';
import { inventoryService } from './inventoryService';
import { ledgerService } from './ledgerService';

export class QuestService {
  private playerQuests: Map<string, Map<string, QuestProgress>> = new Map();

  getQuests(playerId: string): (QuestDefinition & QuestProgress)[] {
    let questMap = this.playerQuests.get(playerId);
    if (!questMap) {
      questMap = new Map();
      for (const q of INITIAL_QUESTS) {
        questMap.set(q.id, {
          questId: q.id,
          currentValue: 0,
          targetValue: q.targetValue,
          completed: false,
          claimed: false,
        });
      }
      this.playerQuests.set(playerId, questMap);
    }

    // Refresh progress based on current kingdom state
    const kingdom = kingdomService.getKingdom(playerId);
    const results: (QuestDefinition & QuestProgress)[] = [];

    for (const def of INITIAL_QUESTS) {
      let progress = questMap.get(def.id);
      if (!progress) {
        progress = {
          questId: def.id,
          currentValue: 0,
          targetValue: def.targetValue,
          completed: false,
          claimed: false,
        };
        questMap.set(def.id, progress);
      }

      if (!progress.claimed) {
        if (def.targetType === 'building_level') {
          const b = kingdom.buildings.find((b) => b.type === def.targetKey);
          progress.currentValue = b ? b.level : 0;
          progress.completed = progress.currentValue >= progress.targetValue;
        } else if (def.targetType === 'resource_count') {
          const resVal = (kingdom.resources as unknown as Record<string, number>)[def.targetKey] || 0;
          progress.currentValue = resVal;
          progress.completed = progress.currentValue >= progress.targetValue;
        }
      }

      results.push({ ...def, ...progress });
    }

    return results;
  }

  claimReward(
    playerId: string,
    questId: string,
    onGrantGems: (amount: number) => number
  ): {
    success: boolean;
    error?: string;
    grantedResources?: Partial<Resources>;
    grantedGems?: number;
    grantedExp?: number;
  } {
    const quests = this.getQuests(playerId);
    const targetQuest = quests.find((q) => q.id === questId);

    if (!targetQuest) {
      return { success: false, error: 'Quest not found.' };
    }

    if (targetQuest.claimed) {
      return { success: false, error: 'Quest reward has already been claimed.' };
    }

    if (!targetQuest.completed) {
      return { success: false, error: 'Quest objectives have not yet been fulfilled.' };
    }

    // Mark as claimed
    const questMap = this.playerQuests.get(playerId)!;
    const prog = questMap.get(questId)!;
    prog.claimed = true;

    // Grant resources to kingdom
    const kingdom = kingdomService.getKingdom(playerId);
    if (targetQuest.rewardResources.food) kingdom.resources.food += targetQuest.rewardResources.food;
    if (targetQuest.rewardResources.wood) kingdom.resources.wood += targetQuest.rewardResources.wood;
    if (targetQuest.rewardResources.stone) kingdom.resources.stone += targetQuest.rewardResources.stone;
    if (targetQuest.rewardResources.iron) kingdom.resources.iron += targetQuest.rewardResources.iron;
    if (targetQuest.rewardResources.gold) kingdom.resources.gold += targetQuest.rewardResources.gold;

    // Grant items if any
    if (targetQuest.rewardItems) {
      for (const it of targetQuest.rewardItems) {
        inventoryService.addItem(playerId, it.itemId, it.quantity);
      }
    }

    // Grant Gems via authoritative callback (which records to ledger once)
    if (targetQuest.rewardGems > 0) {
      onGrantGems(targetQuest.rewardGems);
    }

    return {
      success: true,
      grantedResources: targetQuest.rewardResources,
      grantedGems: targetQuest.rewardGems,
      grantedExp: targetQuest.rewardExp,
    };
  }
}

export const questService = new QuestService();
