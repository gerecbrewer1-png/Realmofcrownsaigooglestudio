/**
 * REALM OF CROWNS — Mobile Performance Engine Overlay
 * Live telemetry: FPS, frame time, draw calls, resolution scaling, and preset switching.
 */

import React, { useState } from 'react';
import { PerformanceMetrics, QualityPreset } from '../../game/mobile/performanceMonitor';

interface PerformanceOverlayProps {
  metrics: PerformanceMetrics;
  onSelectPreset: (preset: QualityPreset) => void;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  metrics,
  onSelectPreset
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-emerald-400';
    if (fps >= 35) return 'text-amber-400';
    return 'text-rose-500 font-bold';
  };

  return (
    <div className="absolute top-[104px] sm:top-[112px] left-3 z-40 select-none text-xs font-mono">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-lg px-2.5 py-1.5 shadow-lg flex items-center gap-2 hover:border-amber-600/50 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className={getFpsColor(metrics.fps)}>{metrics.fps} FPS</span>
        <span className="text-stone-400 text-[10px]">({metrics.frameTimeMs}ms)</span>
        <span className="text-amber-400/80 text-[10px] uppercase font-bold">
          {metrics.preset} ({(metrics.resolutionScale * 100).toFixed(0)}%)
        </span>
      </div>

      {isExpanded && (
        <div className="mt-1.5 p-3 bg-stone-950/95 backdrop-blur-lg border border-amber-900/40 rounded-lg shadow-2xl space-y-1.5 text-stone-300 w-64 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
            <span className="text-stone-400 text-[11px]">Avg FPS (10s)</span>
            <span className={getFpsColor(metrics.avgFps)}>{metrics.avgFps} FPS</span>
          </div>

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
            <span className="text-stone-400 text-[11px]">1% Low (Spikes)</span>
            <span className={metrics.worstFrameMs && metrics.worstFrameMs > 33.3 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {metrics.worstFrameMs ? `${metrics.worstFrameMs}ms` : '16.6ms'} ({metrics.onePercentLowFps ?? 60} FPS)
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
            <span className="text-stone-400 text-[11px]">Draw Calls</span>
            <span className="text-amber-300 font-bold">{metrics.drawCalls}</span>
          </div>

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
            <span className="text-stone-400 text-[11px]">Active AI / Anim</span>
            <span className="text-stone-200 font-semibold">{metrics.activeAIAgents ?? metrics.activeEntities} / {metrics.activeAnimations ?? 0}</span>
          </div>

          {metrics.tierCounts && (
            <div className="border-b border-stone-800/80 pb-1 text-[11px]">
              <div className="flex justify-between text-stone-400 mb-0.5">
                <span>RAHR Tiers</span>
                <span className="text-amber-400 font-bold">
                  T0:{metrics.tierCounts.t0} | T1:{metrics.tierCounts.t1} | T2:{metrics.tierCounts.t2}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>Rejections (Reg/Cell/Grp)</span>
                <span className="text-emerald-400 font-semibold">
                  {metrics.regionsRejected ?? 0}R / {metrics.cellsRejected ?? 0}C / {metrics.groupsRejected ?? 0}G
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                <span>AI Updates (Full/Red/Def)</span>
                <span className="text-stone-300">
                  {metrics.fullAIUpdatesPerSec ?? 0}/s | {metrics.reducedAIUpdatesPerSec ?? 0}/s | {metrics.deferredUpdates ?? 0}
                </span>
              </div>
              {metrics.rahrSchedulerCpuMs !== undefined && (
                <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                  <span>Scheduler Overhead</span>
                  <span className="text-amber-300 font-mono">{metrics.rahrSchedulerCpuMs}ms</span>
                </div>
              )}
            </div>
          )}

          {metrics.bvhCandidates !== undefined && (
            <div className="border-b border-stone-800/80 pb-1 text-[11px]">
              <div className="flex justify-between text-stone-400 mb-0.5">
                <span>OptiPixel Culling</span>
                <span className="text-cyan-400 font-bold">BVH: {metrics.bvhCandidates}</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>Culled (Frust/Occ)</span>
                <span className="text-emerald-400 font-semibold">
                  {metrics.frustumRejected ?? 0} Frust / {metrics.occlusionRejected ?? 0} Occ
                </span>
              </div>
              {metrics.bvhEvaluationMs !== undefined && (
                <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                  <span>BVH Eval Time</span>
                  <span className="text-cyan-300 font-mono">{metrics.bvhEvaluationMs.toFixed(2)}ms</span>
                </div>
              )}
            </div>
          )}

          {metrics.jsHeapUsedMB !== undefined && metrics.jsHeapUsedMB !== null && (
            <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
              <span className="text-stone-400 text-[11px]">JS Heap</span>
              <span className="text-stone-300">{metrics.jsHeapUsedMB} MB</span>
            </div>
          )}

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1">
            <span className="text-stone-400 text-[11px]">Engine / Arch</span>
            <span className="text-amber-400 font-bold">PlayCanvas 2.22 (RAHR)</span>
          </div>

          <div className="pt-1">
            <div className="text-[11px] text-stone-400 mb-1.5">Quality Preset:</div>
            <div className="grid grid-cols-4 gap-1">
              {(['low', 'medium', 'high', 'auto'] as QualityPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onSelectPreset(p)}
                  className={`px-1.5 py-1 text-[10px] font-bold rounded uppercase transition-all ${
                    metrics.preset === p
                      ? 'bg-amber-600 text-stone-950 shadow'
                      : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
