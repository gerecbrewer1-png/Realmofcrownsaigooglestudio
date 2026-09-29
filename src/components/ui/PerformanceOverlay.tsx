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
        <div className="mt-1.5 p-3 bg-stone-950/95 backdrop-blur-lg border border-amber-900/40 rounded-lg shadow-2xl space-y-2 text-stone-300 w-52 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1.5">
            <span className="text-stone-400 text-[11px]">Avg FPS (10s)</span>
            <span className={getFpsColor(metrics.avgFps)}>{metrics.avgFps} FPS</span>
          </div>

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1.5">
            <span className="text-stone-400 text-[11px]">Active Entities</span>
            <span className="text-stone-200 font-semibold">{metrics.activeEntities}</span>
          </div>

          <div className="flex justify-between items-center border-b border-stone-800/80 pb-1.5">
            <span className="text-stone-400 text-[11px]">Engine</span>
            <span className="text-amber-400 font-bold">PlayCanvas 2.22</span>
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
