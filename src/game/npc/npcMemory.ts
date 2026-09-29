/**
 * Realm of Crowns — NPC Memory System
 * Handles emotional impressions, event importance, progressive temporal decay,
 * and dynamic relationship scoring without unbounded memory bloat.
 */

import { MemoryRecord, MemoryEventType, NPCEntity, getRelationshipTier } from './npcTypes';

const MAX_MEMORIES_PER_NPC = 16;

export class NPCMemorySystem {
  /**
   * Adds a new memory impression to an NPC's record.
   * If memory exceeds capacity, the lowest importance decayed memory is evicted.
   */
  public static recordEvent(
    memories: MemoryRecord[],
    category: MemoryRecord['category'],
    description: string,
    importance: number,
    relationshipImpact: number,
    eventType?: MemoryEventType
  ): MemoryRecord[] {
    const newRecord: MemoryRecord = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      eventType,
      description,
      importance: Math.max(1, Math.min(10, importance)),
      timestamp: Date.now(),
      relationshipImpact,
      decayRate: 1.0 / (importance * 2), // High importance memories decay much slower
    };

    const updated = [newRecord, ...memories];

    if (updated.length > MAX_MEMORIES_PER_NPC) {
      // Sort by current effective retention weight and keep the most significant
      updated.sort((a, b) => this.getEffectiveWeight(b) - this.getEffectiveWeight(a));
      return updated.slice(0, MAX_MEMORIES_PER_NPC);
    }

    return updated;
  }

  /**
   * Applies an event memory to an NPC and updates their relationship score.
   */
  public static applyEventToNPC(
    npc: NPCEntity,
    eventType: MemoryEventType,
    description: string,
    importance: number,
    relationshipImpact: number
  ): void {
    const category: MemoryRecord['category'] =
      eventType === 'PLAYER_SAVED_VILLAGE' || eventType === 'HERO_SAVED_ME' || eventType === 'PLAYER_HELPED_ME'
        ? 'help'
        : eventType === 'PLAYER_ATTACKED_ME'
        ? 'harm'
        : eventType === 'PLAYER_BOUGHT_FROM_ME'
        ? 'trade'
        : eventType === 'VILLAGE_RAID'
        ? 'raid'
        : 'protection';

    npc.memories = this.recordEvent(
      npc.memories,
      category,
      description,
      importance,
      relationshipImpact,
      eventType
    );

    // Recompute relationship affinity
    npc.relationshipScore = Math.max(-100, Math.min(100, Math.round(this.calculateAffinity(npc.memories))));
  }

  /**
   * Computes current effective emotional weight of a memory considering elapsed time and decay
   */
  public static getEffectiveWeight(memory: MemoryRecord, nowMs: number = Date.now()): number {
    const elapsedHours = (nowMs - memory.timestamp) / (1000 * 60 * 60);
    // Exponential retention curve
    const retention = Math.exp(-memory.decayRate * elapsedHours);
    return memory.importance * retention;
  }

  /**
   * Calculates the cumulative relationship affinity (-100 to +100) toward a faction or player
   */
  public static calculateAffinity(memories: MemoryRecord[], nowMs: number = Date.now()): number {
    if (memories.length === 0) return 0;

    let totalWeight = 0;
    let weightedImpact = 0;

    memories.forEach((mem) => {
      const weight = this.getEffectiveWeight(mem, nowMs);
      if (weight > 0.1) {
        totalWeight += weight;
        weightedImpact += mem.relationshipImpact * weight;
      }
    });

    if (totalWeight <= 0) return 0;
    return Math.max(-100, Math.min(100, weightedImpact / totalWeight));
  }

  /**
   * Periodic purge of expired memories
   */
  public static pruneFadedMemories(memories: MemoryRecord[], nowMs: number = Date.now()): MemoryRecord[] {
    return memories.filter((m) => this.getEffectiveWeight(m, nowMs) > 0.15);
  }
}
