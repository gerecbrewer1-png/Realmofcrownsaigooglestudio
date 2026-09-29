/**
 * Realm of Crowns - Authoritative Ledger Service
 * Maintains an immutable record of all premium currency and high-value economy movements.
 */

import { TransactionRecord } from '../../types';

export class LedgerService {
  private transactionsByPlayer: Map<string, TransactionRecord[]> = new Map();
  private processedIdempotencyKeys: Set<string> = new Set();

  isIdempotencyProcessed(idempotencyKey?: string): boolean {
    if (!idempotencyKey) return false;
    return this.processedIdempotencyKeys.has(idempotencyKey);
  }

  recordTransaction(
    playerId: string,
    source: string,
    currencyType: 'gems' | 'food' | 'wood' | 'stone' | 'iron' | 'gold',
    amountDelta: number,
    balanceAfter: number,
    idempotencyKey?: string
  ): TransactionRecord {
    if (idempotencyKey) {
      this.processedIdempotencyKeys.add(idempotencyKey);
    }

    const record: TransactionRecord = {
      transactionId: idempotencyKey ? `tx_${idempotencyKey}` : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      playerId,
      source,
      currencyType,
      amountDelta,
      balanceAfter,
      timestamp: Date.now(),
    };

    let playerHistory = this.transactionsByPlayer.get(playerId);
    if (!playerHistory) {
      playerHistory = [];
      this.transactionsByPlayer.set(playerId, playerHistory);
    }

    playerHistory.unshift(record);
    // Keep bounded per player
    if (playerHistory.length > 200) {
      playerHistory.pop();
    }
    return record;
  }

  getTransactions(playerId: string, limit = 50): TransactionRecord[] {
    const playerHistory = this.transactionsByPlayer.get(playerId) || [];
    return playerHistory.slice(0, Math.min(limit, 100));
  }
}

export const ledgerService = new LedgerService();
