/**
 * REALM OF CROWNS — Mobile Performance Engine & Dynamic Scaler
 * Tracks FPS, frame times, entity density, and automatically adapts resolution scale to maintain 60 FPS.
 */

import { RahrPerformanceMonitor, RahrTelemetryMetrics } from '../performance/RahrPerformanceMonitor';

export type QualityPreset = 'low' | 'medium' | 'high' | 'auto';

export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  onePercentLowFps?: number;
  frameTimeMs: number;
  avgFrameTimeMs?: number;
  worstFrameMs?: number;
  resolutionScale: number;
  preset: QualityPreset;
  activeEntities: number;
  drawCalls: number;
  forwardDrawCalls?: number;
  shadowDrawCalls?: number;
  triangles?: number;
  visibleObjects?: number;
  activeAIAgents?: number;
  activeAnimations?: number;
  activePhysicsBodies?: number;
  jsHeapUsedMB?: number | null;
  isBatteryThrottling: boolean;

  // RAHR Phase 2 telemetry
  tierCounts?: { t0: number; t1: number; t2: number; t3: number; t4: number };
  fullAIUpdatesPerSec?: number;
  reducedAIUpdatesPerSec?: number;
  deferredUpdates?: number;
  navRequestsPerSec?: number;
  animEvalsPerFrame?: number;
  animReducedPerFrame?: number;
  regionsRejected?: number;
  cellsRejected?: number;
  groupsRejected?: number;
  entitiesDetailedEval?: number;
  rahrSchedulerCpuMs?: number;

  // RAHR Phase 3 Visibility & BVH telemetry
  bvhCandidates?: number;
  frustumRejected?: number;
  rahrRejected?: number;
  occlusionRejected?: number;
  bvhEvaluationMs?: number;
}

export class PerformanceMonitor {
  private rahrMonitor: RahrPerformanceMonitor;
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private fpsHistory: number[] = [];
  private frameTimeMs = 16.6;
  
  private preset: QualityPreset = 'auto';
  private resolutionScale = 1.0;
  private lowFpsSeconds = 0;
  private highFpsSeconds = 0;

  private activeEntities = 0;
  private drawCalls = 0;

  constructor(initialPreset: QualityPreset = 'auto') {
    this.rahrMonitor = RahrPerformanceMonitor.getInstance();
    this.setPreset(initialPreset);
  }

  public setPreset(preset: QualityPreset): void {
    this.preset = preset;
    this.rahrMonitor.setPreset(preset);
    switch (preset) {
      case 'low':
        this.resolutionScale = 0.75;
        break;
      case 'medium':
        this.resolutionScale = 0.85;
        break;
      case 'high':
        this.resolutionScale = 1.0;
        break;
      case 'auto':
        this.resolutionScale = 1.0;
        break;
    }
  }

  public setEntityCount(count: number): void {
    this.activeEntities = count;
    this.rahrMonitor.setSimulationCounts({ activeObjects: count });
  }

  public setDrawCalls(count: number): void {
    this.drawCalls = count;
  }

  public tick(app?: any): void {
    this.rahrMonitor.tick(app);
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frameTimeMs = Math.round((elapsed / this.frames) * 10) / 10;
      this.frames = 0;
      this.lastTime = now;

      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }

      // Dynamic Auto Scaling
      if (this.preset === 'auto') {
        if (this.fps < 38) {
          this.lowFpsSeconds++;
          this.highFpsSeconds = 0;
          if (this.lowFpsSeconds >= 2) {
            this.resolutionScale = Math.max(0.7, this.resolutionScale - 0.1);
            this.lowFpsSeconds = 0;
          }
        } else if (this.fps > 55) {
          this.highFpsSeconds++;
          this.lowFpsSeconds = 0;
          if (this.highFpsSeconds >= 4) {
            this.resolutionScale = Math.min(1.0, this.resolutionScale + 0.05);
            this.highFpsSeconds = 0;
          }
        }
      }
    }
  }

  public getMetrics(): PerformanceMetrics {
    const rahr = this.rahrMonitor.getTelemetry();
    const avg = this.fpsHistory.length > 0
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : this.fps;

    return {
      fps: this.fps,
      avgFps: avg,
      onePercentLowFps: rahr.onePercentLowFps,
      frameTimeMs: this.frameTimeMs,
      avgFrameTimeMs: rahr.avgFrameTimeMs,
      worstFrameMs: rahr.worstFrameMs,
      resolutionScale: Math.round(this.resolutionScale * 100) / 100,
      preset: this.preset,
      activeEntities: this.activeEntities,
      drawCalls: rahr.drawCalls || this.drawCalls,
      forwardDrawCalls: rahr.forwardDrawCalls,
      shadowDrawCalls: rahr.shadowDrawCalls,
      triangles: rahr.triangles,
      visibleObjects: rahr.visibleObjects,
      activeAIAgents: rahr.activeAIAgents,
      activeAnimations: rahr.activeAnimations,
      activePhysicsBodies: rahr.activePhysicsBodies,
      jsHeapUsedMB: rahr.jsHeapUsedMB,
      isBatteryThrottling: this.fps < 30,
      tierCounts: rahr.tierCounts,
      fullAIUpdatesPerSec: rahr.fullAIUpdatesPerSec,
      reducedAIUpdatesPerSec: rahr.reducedAIUpdatesPerSec,
      deferredUpdates: rahr.deferredUpdates,
      navRequestsPerSec: rahr.navRequestsPerSec,
      animEvalsPerFrame: rahr.animEvalsPerFrame,
      animReducedPerFrame: rahr.animReducedPerFrame,
      regionsRejected: rahr.regionsRejected,
      cellsRejected: rahr.cellsRejected,
      groupsRejected: rahr.groupsRejected,
      entitiesDetailedEval: rahr.entitiesDetailedEval,
      rahrSchedulerCpuMs: rahr.rahrSchedulerCpuMs,
      bvhCandidates: rahr.bvhCandidates,
      frustumRejected: rahr.frustumRejected,
      rahrRejected: rahr.rahrRejected,
      occlusionRejected: rahr.occlusionRejected,
      bvhEvaluationMs: rahr.bvhEvaluationMs
    };
  }
}
