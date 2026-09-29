/**
 * REALM OF CROWNS — MMO Inbound Rate Limiting & Packet Shield
 * Phase 2.8 MMO Architecture
 * 
 * Enforces per-connection rate limits with sliding-window burst allowance,
 * protects against message floods, and validates packet size bounds.
 */

import { RATE_LIMIT_CONFIG, MAX_PACKET_BYTES, MMOPacket } from '../../shared/mmoProtocol';

export interface RateLimiterStats {
  totalPacketsChecked: number;
  totalRateLimitViolations: number;
  totalOversizedPackets: number;
}

export class ConnectionRateLimiter {
  private messageTimestamps: number[] = [];
  private inputTimestamps: number[] = [];
  private combatTimestamps: number[] = [];
  private pingTimestamps: number[] = [];

  private stats: RateLimiterStats = {
    totalPacketsChecked: 0,
    totalRateLimitViolations: 0,
    totalOversizedPackets: 0,
  };

  /**
   * Validates raw incoming message size before parsing.
   */
  public checkRawSize(byteLength: number): { allowed: boolean; error?: string } {
    this.stats.totalPacketsChecked++;
    if (byteLength > MAX_PACKET_BYTES) {
      this.stats.totalOversizedPackets++;
      return {
        allowed: false,
        error: `Packet size ${byteLength} bytes exceeds limit of ${MAX_PACKET_BYTES} bytes`,
      };
    }
    return { allowed: true };
  }

  /**
   * Check if a packet is permitted under rate limit policies.
   */
  public checkRateLimit(packet: MMOPacket): { allowed: boolean; error?: string } {
    const now = Date.now();
    const oneSecAgo = now - 1000;

    // Prune stale timestamps older than 1 second
    this.messageTimestamps = this.messageTimestamps.filter((t) => t > oneSecAgo);
    this.inputTimestamps = this.inputTimestamps.filter((t) => t > oneSecAgo);
    this.combatTimestamps = this.combatTimestamps.filter((t) => t > oneSecAgo);
    this.pingTimestamps = this.pingTimestamps.filter((t) => t > oneSecAgo);

    // 1. Overall Message Count Limit (100 msgs/sec burst)
    if (this.messageTimestamps.length >= RATE_LIMIT_CONFIG.maxTotalMessagesPerSec) {
      this.stats.totalRateLimitViolations++;
      return { allowed: false, error: 'Overall message rate limit exceeded' };
    }
    this.messageTimestamps.push(now);

    // 2. Specific Sub-Channel Limits
    if (packet.type === 'PLAYER_INPUT') {
      if (this.inputTimestamps.length >= RATE_LIMIT_CONFIG.maxMovementInputsPerSec) {
        this.stats.totalRateLimitViolations++;
        return { allowed: false, error: 'Movement input rate limit exceeded' };
      }
      this.inputTimestamps.push(now);
    } else if (packet.type === 'FIRE_REQUEST') {
      if (this.combatTimestamps.length >= RATE_LIMIT_CONFIG.maxCombatRequestsPerSec) {
        this.stats.totalRateLimitViolations++;
        return { allowed: false, error: 'Combat request rate limit exceeded' };
      }
      this.combatTimestamps.push(now);
    } else if (packet.type === 'PING') {
      if (this.pingTimestamps.length >= RATE_LIMIT_CONFIG.maxHeartbeatsPerSec) {
        this.stats.totalRateLimitViolations++;
        return { allowed: false, error: 'Heartbeat rate limit exceeded' };
      }
      this.pingTimestamps.push(now);
    }

    return { allowed: true };
  }

  public getStats(): RateLimiterStats {
    return { ...this.stats };
  }
}
