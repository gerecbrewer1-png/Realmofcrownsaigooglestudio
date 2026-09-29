/**
 * REALM OF CROWNS — MMO Server Diagnostics & Metrics Collector
 * Phase 2.8 MMO Architecture
 * 
 * Aggregates real-time MMO network telemetry:
 * Socket counts, throughput, AOI queries, coalesced frames, dropped packets,
 * memory consumption, and event loop latency.
 */

export interface MMOMetricsSnapshot {
  connectedSockets: number;
  authenticatedSockets: number;
  activeWorldEntities: number;
  messagesReceivedPerSec: number;
  messagesSentPerSec: number;
  bytesReceivedPerSec: number;
  bytesSentPerSec: number;
  aoiQueriesPerSec: number;
  entityDeltasSentPerSec: number;
  totalCoalescedDeltas: number;
  totalDroppedPackets: number;
  totalRateLimitRejects: number;
  totalMalformedPackets: number;
  memoryUsageMB: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  eventLoopDelayMs: number;
  serverTick: number;
  uptimeSeconds: number;

  // Phase 2.9 Projectile Physics Diagnostics
  activeProjectiles: number;
  avgCandidatesChecked: number;
  maxCandidatesChecked: number;
  broadphaseCpuMs: number;
  preciseCpuMs: number;
  totalProjectileCleanups: number;
}

export class MMOMetricsCollector {
  private startTime = Date.now();

  // Cumulative counters
  public totalMessagesReceived = 0;
  public totalMessagesSent = 0;
  public totalBytesReceived = 0;
  public totalBytesSent = 0;
  public totalAOIQueries = 0;
  public totalEntityDeltasSent = 0;
  public totalCoalescedDeltas = 0;
  public totalDroppedPackets = 0;
  public totalRateLimitRejects = 0;
  public totalMalformedPackets = 0;
  
  // Phase 2.9 Projectiles
  public activeProjectiles = 0;
  public avgCandidatesChecked = 0;
  public maxCandidatesChecked = 0;
  public broadphaseCpuMs = 0;
  public preciseCpuMs = 0;
  public totalProjectileCleanups = 0;

  // Rate calculation state (1-second window)
  private lastRateCheckTime = Date.now();
  private prevMsgRecv = 0;
  private prevMsgSent = 0;
  private prevBytesRecv = 0;
  private prevBytesSent = 0;
  private prevAoiQueries = 0;
  private prevEntityDeltas = 0;

  private rateMsgRecv = 0;
  private rateMsgSent = 0;
  private rateBytesRecv = 0;
  private rateBytesSent = 0;
  private rateAoiQueries = 0;
  private rateEntityDeltas = 0;

  // Event loop delay measurement
  private eventLoopDelayMs = 0;
  private lastLoopTime = Date.now();

  constructor() {
    // Measure event loop delay every 1000ms
    setInterval(() => {
      const now = Date.now();
      const expected = 1000;
      const elapsed = now - this.lastLoopTime;
      this.eventLoopDelayMs = Math.max(0, elapsed - expected);
      this.lastLoopTime = now;
      this.updateRates(now);
    }, 1000).unref();
  }

  private updateRates(now: number): void {
    const dt = Math.max(0.001, (now - this.lastRateCheckTime) / 1000);
    this.rateMsgRecv = (this.totalMessagesReceived - this.prevMsgRecv) / dt;
    this.rateMsgSent = (this.totalMessagesSent - this.prevMsgSent) / dt;
    this.rateBytesRecv = (this.totalBytesReceived - this.prevBytesRecv) / dt;
    this.rateBytesSent = (this.totalBytesSent - this.prevBytesSent) / dt;
    this.rateAoiQueries = (this.totalAOIQueries - this.prevAoiQueries) / dt;
    this.rateEntityDeltas = (this.totalEntityDeltasSent - this.prevEntityDeltas) / dt;

    this.prevMsgRecv = this.totalMessagesReceived;
    this.prevMsgSent = this.totalMessagesSent;
    this.prevBytesRecv = this.totalBytesReceived;
    this.prevBytesSent = this.totalBytesSent;
    this.prevAoiQueries = this.totalAOIQueries;
    this.prevEntityDeltas = this.totalEntityDeltasSent;
    this.lastRateCheckTime = now;
  }

  public getSnapshot(
    connectedSockets: number,
    authenticatedSockets: number,
    activeWorldEntities: number,
    serverTick: number
  ): MMOMetricsSnapshot {
    const mem = process.memoryUsage();
    return {
      connectedSockets,
      authenticatedSockets,
      activeWorldEntities,
      messagesReceivedPerSec: Math.round(this.rateMsgRecv),
      messagesSentPerSec: Math.round(this.rateMsgSent),
      bytesReceivedPerSec: Math.round(this.rateBytesRecv),
      bytesSentPerSec: Math.round(this.rateBytesSent),
      aoiQueriesPerSec: Math.round(this.rateAoiQueries),
      entityDeltasSentPerSec: Math.round(this.rateEntityDeltas),
      totalCoalescedDeltas: this.totalCoalescedDeltas,
      totalDroppedPackets: this.totalDroppedPackets,
      totalRateLimitRejects: this.totalRateLimitRejects,
      totalMalformedPackets: this.totalMalformedPackets,
      memoryUsageMB: {
        rss: Math.round(mem.rss / (1024 * 1024) * 10) / 10,
        heapUsed: Math.round(mem.heapUsed / (1024 * 1024) * 10) / 10,
        heapTotal: Math.round(mem.heapTotal / (1024 * 1024) * 10) / 10,
      },
      eventLoopDelayMs: Math.round(this.eventLoopDelayMs * 10) / 10,
      serverTick,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      
      activeProjectiles: this.activeProjectiles,
      avgCandidatesChecked: Math.round(this.avgCandidatesChecked * 10) / 10,
      maxCandidatesChecked: this.maxCandidatesChecked,
      broadphaseCpuMs: Math.round(this.broadphaseCpuMs * 100) / 100,
      preciseCpuMs: Math.round(this.preciseCpuMs * 100) / 100,
      totalProjectileCleanups: this.totalProjectileCleanups,
    };
  }
}
