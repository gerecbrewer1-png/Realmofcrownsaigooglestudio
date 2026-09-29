/**
 * REALM OF CROWNS — MMO Outbound Backpressure & Slow Client Protection
 * Phase 2.8 MMO Architecture
 * 
 * Prevents mobile and high-latency clients from exhausting server memory.
 * Coalesces replaceable high-frequency transforms, drops cosmetic packets under congestion,
 * and guarantees critical lifecycle events (spawn, despawn, damage, disconnect).
 */

import { WebSocket } from 'ws';
import { MMOPacket, EntityDeltaPacket } from '../../shared/mmoProtocol';

export type PacketPriority = 'CRITICAL' | 'REPLACEABLE_STATE' | 'COSMETIC';

export interface QueuedMessage {
  priority: PacketPriority;
  packet: MMOPacket;
  entityId?: string; // Present for REPLACEABLE_STATE (deltas)
  enqueuedTimestamp: number;
  byteLength: number;
}

export interface BackpressureStats {
  queuedMessages: number;
  queuedBytes: number;
  totalSentBytes: number;
  totalDroppedPackets: number;
  totalCoalescedDeltas: number;
  isCongested: boolean;
}

export class ClientOutboundQueue {
  private socket: WebSocket;
  private maxQueueBytes: number;
  private congestionThresholdBytes: number;

  private queue: QueuedMessage[] = [];
  // Map entityId -> index in queue for fast O(1) coalescing of transform deltas
  private deltaIndexMap: Map<string, number> = new Map();

  private queuedBytes = 0;
  private totalSentBytes = 0;
  private totalDroppedPackets = 0;
  private totalCoalescedDeltas = 0;

  constructor(socket: WebSocket, maxQueueBytes = 131072) { // 128 KB limit
    this.socket = socket;
    this.maxQueueBytes = maxQueueBytes;
    this.congestionThresholdBytes = Math.floor(maxQueueBytes * 0.5); // 64 KB threshold
  }

  /**
   * Determine packet classification for backpressure prioritization.
   */
  public static classifyPacket(packet: MMOPacket): { priority: PacketPriority; entityId?: string } {
    switch (packet.type) {
      case 'ENTITY_DELTA':
        return { priority: 'REPLACEABLE_STATE', entityId: (packet as EntityDeltaPacket).entityId };
      case 'SERVER_TIME':
      case 'PONG':
        return { priority: 'COSMETIC' };
      default:
        // Spawn, Despawn, Auth, Input, Damage, Disconnect are CRITICAL
        return { priority: 'CRITICAL' };
    }
  }

  /**
   * Enqueues an outgoing packet.
   * If priority is REPLACEABLE_STATE (e.g. EntityDeltaPacket) and an older delta for this entity
   * is already queued, the older one is replaced (coalesced) with the newest state.
   */
  public enqueue(packet: MMOPacket): boolean {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const { priority, entityId } = ClientOutboundQueue.classifyPacket(packet);
    const jsonStr = JSON.stringify(packet);
    const byteLength = Buffer.byteLength(jsonStr, 'utf8');

    // Check if socket bufferedAmount is already backing up
    const socketBuffer = this.socket.bufferedAmount || 0;
    const totalPendingBytes = this.queuedBytes + socketBuffer;
    const isCongested = totalPendingBytes >= this.congestionThresholdBytes;

    // 1. If REPLACEABLE_STATE (Entity Delta), check for coalescing
    if (priority === 'REPLACEABLE_STATE' && entityId) {
      const existingIdx = this.deltaIndexMap.get(entityId);
      if (existingIdx !== undefined && existingIdx < this.queue.length) {
        // Coalesce: Replace older delta with newest snapshot
        const oldMsg = this.queue[existingIdx];
        this.queuedBytes -= oldMsg.byteLength;
        this.queue[existingIdx] = {
          priority,
          packet,
          entityId,
          enqueuedTimestamp: Date.now(),
          byteLength,
        };
        this.queuedBytes += byteLength;
        this.totalCoalescedDeltas++;
        return true;
      }
    }

    // 2. If congested, drop cosmetic packets immediately
    if (isCongested && priority === 'COSMETIC') {
      this.totalDroppedPackets++;
      return false;
    }

    // 3. If hard memory limit exceeded
    if (totalPendingBytes + byteLength > this.maxQueueBytes) {
      if (priority === 'REPLACEABLE_STATE') {
        // Drop non-critical delta rather than crashing or exhausting memory
        this.totalDroppedPackets++;
        return false;
      } else if (priority === 'COSMETIC') {
        this.totalDroppedPackets++;
        return false;
      }
      // CRITICAL events are preserved even under heavy load unless connection must be dropped
    }

    // Append to queue
    const queueIdx = this.queue.length;
    this.queue.push({
      priority,
      packet,
      entityId,
      enqueuedTimestamp: Date.now(),
      byteLength,
    });
    this.queuedBytes += byteLength;

    if (priority === 'REPLACEABLE_STATE' && entityId) {
      this.deltaIndexMap.set(entityId, queueIdx);
    }

    return true;
  }

  /**
   * Flushes as many queued messages as the socket can safely handle without choking.
   */
  public flush(): number {
    if (this.socket.readyState !== WebSocket.OPEN) {
      this.clear();
      return 0;
    }

    let sentCount = 0;
    // Keep socket buffer below 32KB
    while (this.queue.length > 0 && (this.socket.bufferedAmount || 0) < 32768) {
      const msg = this.queue.shift();
      if (!msg) break;

      this.queuedBytes = Math.max(0, this.queuedBytes - msg.byteLength);
      if (msg.entityId) {
        this.deltaIndexMap.delete(msg.entityId);
      }

      try {
        const payload = JSON.stringify(msg.packet);
        this.socket.send(payload);
        this.totalSentBytes += msg.byteLength;
        sentCount++;
      } catch (err) {
        // Socket write error, break and let disconnect handler clean up
        break;
      }
    }

    // Rebuild index map for remaining items
    if (this.queue.length > 0) {
      this.deltaIndexMap.clear();
      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        if (item.entityId) {
          this.deltaIndexMap.set(item.entityId, i);
        }
      }
    }

    return sentCount;
  }

  public getStats(): BackpressureStats {
    const socketBuffer = this.socket.bufferedAmount || 0;
    return {
      queuedMessages: this.queue.length,
      queuedBytes: this.queuedBytes + socketBuffer,
      totalSentBytes: this.totalSentBytes,
      totalDroppedPackets: this.totalDroppedPackets,
      totalCoalescedDeltas: this.totalCoalescedDeltas,
      isCongested: (this.queuedBytes + socketBuffer) >= this.congestionThresholdBytes,
    };
  }

  public clear(): void {
    this.queue = [];
    this.deltaIndexMap.clear();
    this.queuedBytes = 0;
  }
}
