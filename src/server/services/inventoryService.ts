/**
 * Realm of Crowns - Authoritative Inventory Service
 */

import { InventoryItem } from '../../types';
import { INITIAL_ITEMS } from './gameConfig';

export class InventoryService {
  private playerInventories: Map<string, Map<string, InventoryItem>> = new Map();

  initializeInventory(playerId: string, starterItems: { itemId: string; quantity: number }[]): InventoryItem[] {
    const itemMap = new Map<string, InventoryItem>();
    
    // Base catalog
    for (const base of INITIAL_ITEMS) {
      const match = starterItems.find((s) => s.itemId === base.id);
      const qty = match ? match.quantity : 0;
      itemMap.set(base.id, { ...base, quantity: qty });
    }

    this.playerInventories.set(playerId, itemMap);
    return Array.from(itemMap.values());
  }

  getInventory(playerId: string): InventoryItem[] {
    let map = this.playerInventories.get(playerId);
    if (!map) {
      this.initializeInventory(playerId, INITIAL_ITEMS.map((i) => ({ itemId: i.id, quantity: i.quantity })));
      map = this.playerInventories.get(playerId)!;
    }
    return Array.from(map.values());
  }

  getItem(playerId: string, itemId: string): InventoryItem | undefined {
    const inv = this.playerInventories.get(playerId);
    if (!inv) return undefined;
    return inv.get(itemId);
  }

  addItem(playerId: string, itemId: string, quantity: number): InventoryItem | null {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    const inv = this.playerInventories.get(playerId);
    if (!inv) {
      this.getInventory(playerId);
    }
    const currentMap = this.playerInventories.get(playerId)!;
    const existing = currentMap.get(itemId);
    if (existing) {
      existing.quantity += quantity;
      return existing;
    } else {
      const base = INITIAL_ITEMS.find((i) => i.id === itemId);
      const item: InventoryItem = base
        ? { ...base, quantity }
        : {
            id: itemId,
            name: itemId,
            description: 'Kingdom inventory item',
            type: 'chest',
            rarity: 'common',
            quantity,
            iconName: 'Package',
            effect: {},
          };
      currentMap.set(itemId, item);
      return item;
    }
  }

  consumeItem(playerId: string, itemId: string, quantity = 1): { success: boolean; item?: InventoryItem; error?: string } {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { success: false, error: 'Quantity must be a positive integer.' };
    }

    const inv = this.playerInventories.get(playerId);
    if (!inv) return { success: false, error: 'Inventory not initialized' };

    const item = inv.get(itemId);
    if (!item || item.quantity < quantity) {
      return { success: false, error: 'Insufficient quantity in inventory' };
    }

    item.quantity -= quantity;
    return { success: true, item };
  }
}

export const inventoryService = new InventoryService();
