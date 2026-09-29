/**
 * Realm of Crowns - Authoritative Player Service
 */

import { PlayerProfile } from '../../types';
import { GAME_CONFIG, STARTER_COMMANDER } from './gameConfig';
import { kingdomService } from './kingdomService';
import { inventoryService } from './inventoryService';
import { ledgerService } from './ledgerService';

export class PlayerService {
  private players: Map<string, PlayerProfile> = new Map();

  getOrCreatePlayer(uid: string, displayName = 'Sovereign Lord'): { player: PlayerProfile; isNew: boolean } {
    let player = this.players.get(uid);
    let isNew = false;

    if (!player) {
      isNew = true;
      const now = Date.now();
      player = {
        uid,
        displayName,
        title: 'Lord of the Crown',
        avatar: 'crown_knight',
        playerLevel: 1,
        playerExp: 0,
        nextLevelExp: 1000,
        vipLevel: 1,
        vipPoints: 100,
        power: 12500,
        gems: GAME_CONFIG.starterPackage.gems,
        shieldExpiresAt: now + GAME_CONFIG.starterPackage.shieldHours * 3600 * 1000,
        createdAt: now,
        lastLoginAt: now,
        loginStreak: 1,
        starterCharterClaimed: true,
      };

      this.players.set(uid, player);

      // Initialize kingdom
      kingdomService.createDefaultKingdom(uid, displayName);

      // Initialize inventory with starter package
      inventoryService.initializeInventory(uid, GAME_CONFIG.starterPackage.items);

      // Record starter gems transaction in ledger
      ledgerService.recordTransaction(
        uid,
        'starter_charter_grant',
        'gems',
        GAME_CONFIG.starterPackage.gems,
        player.gems
      );
    } else {
      player.lastLoginAt = Date.now();
    }

    this.recalculatePlayerPower(player);
    return { player, isNew };
  }

  recalculatePlayerPower(player: PlayerProfile): void {
    const kingdom = kingdomService.getKingdom(player.uid);
    let buildingPower = 0;
    for (const b of kingdom.buildings) {
      buildingPower += b.level * 850;
    }

    let troopPower = 0;
    for (const [_, count] of Object.entries(kingdom.troops)) {
      troopPower += (count as number) * 15;
    }

    const commanderPower = STARTER_COMMANDER.power;
    player.power = buildingPower + troopPower + commanderPower + player.playerLevel * 500;
  }

  addExp(player: PlayerProfile, expAmount: number): boolean {
    player.playerExp += expAmount;
    let leveledUp = false;
    while (player.playerExp >= player.nextLevelExp) {
      player.playerExp -= player.nextLevelExp;
      player.playerLevel += 1;
      player.nextLevelExp = Math.floor(player.nextLevelExp * 1.5);
      leveledUp = true;
    }
    this.recalculatePlayerPower(player);
    return leveledUp;
  }

  hasPlayer(uid: string): boolean {
    return this.players.has(uid);
  }

  getPlayer(uid: string): PlayerProfile | undefined {
    return this.players.get(uid);
  }

  claimStarterCharter(uid: string): { success: boolean; player?: PlayerProfile; error?: string } {
    const player = this.players.get(uid);
    if (!player) return { success: false, error: 'Player not found.' };

    if (player.starterCharterClaimed) {
      return { success: false, error: 'Royal Sovereign Charter has already been claimed.' };
    }

    player.starterCharterClaimed = true;
    player.gems += GAME_CONFIG.starterPackage.gems;
    player.shieldExpiresAt = Date.now() + GAME_CONFIG.starterPackage.shieldHours * 3600 * 1000;

    inventoryService.initializeInventory(uid, GAME_CONFIG.starterPackage.items);

    ledgerService.recordTransaction(
      uid,
      'starter_charter_claim',
      'gems',
      GAME_CONFIG.starterPackage.gems,
      player.gems,
      `starter_${uid}`
    );

    this.recalculatePlayerPower(player);
    return { success: true, player };
  }

  grantGems(uid: string, amount: number, source: string, idempotencyKey?: string): number {
    const player = this.players.get(uid);
    if (!player) return 0;
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return player.gems;
    }

    if (idempotencyKey && ledgerService.isIdempotencyProcessed(idempotencyKey)) {
      return player.gems;
    }

    player.gems += amount;
    ledgerService.recordTransaction(uid, source, 'gems', amount, player.gems, idempotencyKey);
    return player.gems;
  }

  spendGems(uid: string, amount: number, reason: string, idempotencyKey?: string): { success: boolean; newBalance?: number; error?: string } {
    const player = this.players.get(uid);
    if (!player) return { success: false, error: 'Player not found.' };

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Invalid gem amount. Must be a positive integer.' };
    }

    if (idempotencyKey && ledgerService.isIdempotencyProcessed(idempotencyKey)) {
      return { success: true, newBalance: player.gems };
    }

    if (player.gems < amount) {
      return { success: false, error: 'Insufficient Gems in treasury.' };
    }

    player.gems -= amount;
    ledgerService.recordTransaction(uid, reason, 'gems', -amount, player.gems, idempotencyKey);
    return { success: true, newBalance: player.gems };
  }
}

export const playerService = new PlayerService();
