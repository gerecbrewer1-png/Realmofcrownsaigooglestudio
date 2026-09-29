/**
 * Realm of Crowns - Client API Gateway
 * Communicates with server-authoritative API endpoints.
 */

import {
  PlayerProfile,
  KingdomState,
  QuestDefinition,
  QuestProgress,
  InventoryItem,
  Commander,
  ConstructionTask,
  Resources,
  GameConfiguration,
  BuildingDefinition,
  TransactionRecord,
  PlayerWorldState,
  WorldTile,
  HexCoordinates,
  MarchType,
  ArmyMarch,
  TroopDefinition,
  TrainingTask,
} from '../types';

class ClientApi {
  private currentUserId: string = 'lord_sovereign_1';

  setUserId(uid: string): void {
    this.currentUserId = uid;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-player-id': this.currentUserId,
      Authorization: `Bearer ${this.currentUserId}`,
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async getProfile(): Promise<{ player: PlayerProfile; isNew: boolean }> {
    return this.request<{ player: PlayerProfile; isNew: boolean }>('/api/auth/profile');
  }

  async getKingdom(): Promise<{ kingdom: KingdomState }> {
    return this.request<{ kingdom: KingdomState }>('/api/kingdom');
  }

  async upgradeBuilding(buildingId: string): Promise<{ success: boolean; task: ConstructionTask; kingdom: KingdomState }> {
    return this.request('/api/buildings/upgrade', {
      method: 'POST',
      body: JSON.stringify({ buildingId }),
    });
  }

  async speedupBuilding(
    taskId: string,
    minutes: number,
    itemId?: string
  ): Promise<{ success: boolean; completed: boolean; kingdom: KingdomState; inventory: InventoryItem[] }> {
    return this.request('/api/buildings/speedup', {
      method: 'POST',
      body: JSON.stringify({ taskId, minutes, itemId }),
    });
  }

  async instantCompleteBuilding(
    taskId: string,
    gemCost?: number
  ): Promise<{ success: boolean; authoritativeGemCost?: number; kingdom: KingdomState; player: PlayerProfile }> {
    return this.request('/api/buildings/instant', {
      method: 'POST',
      body: JSON.stringify({ taskId, gemCost }),
    });
  }

  async bootstrapStarter(): Promise<{ success: boolean; player: PlayerProfile; kingdom: KingdomState; inventory: InventoryItem[] }> {
    return this.request('/api/auth/bootstrap-starter', {
      method: 'POST',
    });
  }

  async collectResources(): Promise<{ success: boolean; resources: Resources }> {
    return this.request('/api/buildings/collect', {
      method: 'POST',
    });
  }

  async getQuests(): Promise<{ quests: (QuestDefinition & QuestProgress)[] }> {
    return this.request('/api/quests');
  }

  async claimQuest(
    questId: string
  ): Promise<{
    success: boolean;
    player: PlayerProfile;
    kingdom: KingdomState;
    quests: (QuestDefinition & QuestProgress)[];
    inventory: InventoryItem[];
    granted: { grantedResources?: Partial<Resources>; grantedGems?: number; grantedExp?: number };
  }> {
    return this.request('/api/quests/claim', {
      method: 'POST',
      body: JSON.stringify({ questId }),
    });
  }

  async getInventory(): Promise<{ items: InventoryItem[] }> {
    return this.request('/api/inventory');
  }

  async useItem(
    itemId: string,
    quantity = 1
  ): Promise<{ success: boolean; inventory: InventoryItem[]; kingdom: KingdomState; player: PlayerProfile }> {
    return this.request('/api/inventory/use', {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity }),
    });
  }

  async getCommander(): Promise<{ commander: Commander; commanders: Record<string, Commander> }> {
    return this.request('/api/commander');
  }

  async assignCommanderRole(
    commanderId: string,
    role: string
  ): Promise<{ success: boolean; commander: Commander; commanders: Record<string, Commander> }> {
    return this.request('/api/commander/assign-role', {
      method: 'POST',
      body: JSON.stringify({ commanderId, role }),
    });
  }

  async levelUpCommander(
    commanderId: string
  ): Promise<{ success: boolean; commander: Commander; commanders: Record<string, Commander> }> {
    return this.request('/api/commander/level-up', {
      method: 'POST',
      body: JSON.stringify({ commanderId }),
    });
  }

  async upgradeCommanderTalent(
    commanderId: string,
    branchId: string,
    talentId: string
  ): Promise<{ success: boolean; commander: Commander; commanders: Record<string, Commander> }> {
    return this.request('/api/commander/upgrade-talent', {
      method: 'POST',
      body: JSON.stringify({ commanderId, branchId, talentId }),
    });
  }

  async getConfig(): Promise<{ config: GameConfiguration; buildingDefinitions: Record<string, BuildingDefinition> }> {
    return this.request('/api/config');
  }

  async getTransactions(): Promise<{ transactions: TransactionRecord[] }> {
    return this.request('/api/transactions');
  }

  async adminGrant(data: {
    gems?: number;
    food?: number;
    wood?: number;
    stone?: number;
    iron?: number;
    gold?: number;
  }): Promise<{ success: boolean; player: PlayerProfile; kingdom: KingdomState }> {
    return this.request('/api/admin/grant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // -------------------------------------------------------------
  // PHASE 2: WORLD MAP & MARCH SYSTEM
  // -------------------------------------------------------------

  async getWorldState(): Promise<{ success: boolean; state: PlayerWorldState }> {
    return this.request('/api/world/state');
  }

  async getWorldTiles(): Promise<{ success: boolean; tiles: WorldTile[] }> {
    return this.request('/api/world/tiles');
  }

  async dispatchMarch(params: {
    targetCoords: HexCoordinates;
    marchType: MarchType;
    commanderId?: string;
    commanderName?: string;
    troops?: Record<string, number>;
  }): Promise<{ success: boolean; march?: ArmyMarch; state: PlayerWorldState; kingdom: KingdomState }> {
    return this.request('/api/world/march/dispatch', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async recallMarch(marchId: string): Promise<{ success: boolean; state: PlayerWorldState }> {
    return this.request('/api/world/march/recall', {
      method: 'POST',
      body: JSON.stringify({ marchId }),
    });
  }

  async dispatchScout(targetCoords: HexCoordinates): Promise<{ success: boolean; march?: ArmyMarch; state: PlayerWorldState }> {
    return this.request('/api/world/scout', {
      method: 'POST',
      body: JSON.stringify({ targetCoords }),
    });
  }

  // -------------------------------------------------------------
  // PHASE 3: MILITARY & ARMY COMBAT SYSTEM
  // -------------------------------------------------------------

  async getMilitaryTroops(): Promise<{
    success: boolean;
    definitions: Record<string, TroopDefinition>;
    troops: Record<string, number>;
    trainingQueue: TrainingTask[];
    woundedTroops: Record<string, number>;
  }> {
    return this.request('/api/military/troops');
  }

  async trainTroops(params: {
    buildingId: string;
    unitId: string;
    quantity: number;
  }): Promise<{ success: boolean; task: TrainingTask; kingdom: KingdomState }> {
    return this.request('/api/military/train', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async speedupTraining(
    taskId: string,
    minutes: number,
    itemId?: string
  ): Promise<{ success: boolean; completed: boolean; kingdom: KingdomState; inventory: InventoryItem[] }> {
    return this.request('/api/military/speedup', {
      method: 'POST',
      body: JSON.stringify({ taskId, minutes, itemId }),
    });
  }

  async instantCompleteTraining(
    taskId: string
  ): Promise<{ success: boolean; gemCost: number; kingdom: KingdomState; player: PlayerProfile }> {
    return this.request('/api/military/instant', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  }

  async healWoundedTroops(
    unitId: string,
    quantity: number
  ): Promise<{ success: boolean; kingdom: KingdomState }> {
    return this.request('/api/military/heal', {
      method: 'POST',
      body: JSON.stringify({ unitId, quantity }),
    });
  }

  async instantHealAllWounded(): Promise<{
    success: boolean;
    gemCost: number;
    totalHealed: number;
    kingdom: KingdomState;
    player: PlayerProfile;
  }> {
    return this.request('/api/military/heal-all-instant', {
      method: 'POST',
    });
  }

  async getCommanders(): Promise<{ commander: Commander; commanders: Record<string, Commander> }> {
    return this.request('/api/commander');
  }
}

export const clientApi = new ClientApi();
