/**
 * Realm of Crowns — Naval Voyage HUD Memoized Sub-Components
 * Phase 2: Eliminate O(N) Hot-Loop Scans & Heavy State Churn
 * 
 * Extracts status gauges, compass, target enemy roster, and combat ticker into
 * React.memo wrapped sub-components to prevent re-rendering the full 142KB NavalVoyageView
 * component on every 2 Hz status emission.
 */

import React from 'react';
import {
  Navigation,
  Wind,
  Volume2,
  VolumeX,
  Map as MapIcon,
  Activity,
  Anchor,
  Swords,
  Crosshair,
  Shield,
  Target,
} from 'lucide-react';

export interface NavalStatusGaugesProps {
  playerHull: number;
  playerHullMax: number;
  playerSails: number;
  playerSailsMax: number;
  speedKnots: number;
  headingDeg: number;
  windStrength: number;
  windFromDeg: number;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onOpenSeaChart: () => void;
  showDevStats: boolean;
  onToggleDevStats: () => void;
}

export const NavalStatusGauges: React.FC<NavalStatusGaugesProps> = React.memo(({
  playerHull,
  playerHullMax,
  playerSails,
  playerSailsMax,
  speedKnots,
  headingDeg,
  windStrength,
  windFromDeg,
  isAudioMuted,
  onToggleAudio,
  onOpenSeaChart,
  showDevStats,
  onToggleDevStats,
}) => {
  const hullPct = Math.max(0, Math.min(100, Math.round((playerHull / Math.max(1, playerHullMax)) * 100)));
  const sailsPct = Math.max(0, Math.min(100, Math.round((playerSails / Math.max(1, playerSailsMax)) * 100)));

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Hull Gauge */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-1 backdrop-blur-md min-w-[130px]">
        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
          <span>HULL</span>
          <span className={hullPct < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
            {playerHull} / {playerHullMax}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              hullPct > 60 ? 'bg-emerald-500' : hullPct > 30 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${hullPct}%` }}
          />
        </div>
      </div>

      {/* Sails Gauge */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-1 backdrop-blur-md min-w-[120px]">
        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
          <span>SAILS</span>
          <span className="text-cyan-400">
            {playerSails} / {playerSailsMax}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${sailsPct}%` }}
          />
        </div>
      </div>

      {/* Speedometer */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-1.5 backdrop-blur-md">
        <Navigation
          className="w-4 h-4 text-amber-400 transition-transform duration-300"
          style={{ transform: `rotate(${headingDeg}deg)` }}
        />
        <div className="text-right">
          <div className="text-[9px] text-slate-400 leading-none">SPEED</div>
          <div className="text-xs font-black text-amber-200">{speedKnots} kts</div>
        </div>
      </div>

      {/* Wind Compass */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-1.5 backdrop-blur-md">
        <Wind
          className="w-4 h-4 text-sky-400 transition-transform duration-500"
          style={{ transform: `rotate(${windFromDeg}deg)` }}
        />
        <div>
          <div className="text-[9px] text-slate-400 leading-none">WIND</div>
          <div className="text-xs font-bold text-sky-300">
            {windStrength} kts <span className="text-[10px] font-normal">{windFromDeg}°</span>
          </div>
        </div>
      </div>

      {/* Audio Shanty Toggle */}
      <button
        onClick={onToggleAudio}
        title={isAudioMuted ? 'Unmute Sea Shanties' : 'Mute Sea Shanties'}
        className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-amber-300 text-xs shadow-md transition cursor-pointer"
      >
        {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />}
      </button>

      {/* Nautical Sea Chart Button */}
      <button
        id="naval-btn-sea-chart"
        onClick={onOpenSeaChart}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 text-indigo-200 text-xs font-bold shadow-lg shadow-indigo-950/40 backdrop-blur-md transition cursor-pointer"
      >
        <MapIcon className="w-4 h-4 text-indigo-400" />
        <span>Sea Chart [M]</span>
      </button>

      {/* Optimization Diagnostics Toggle */}
      <button
        id="naval-btn-dev-diagnostics"
        onClick={onToggleDevStats}
        title="Toggle Renderer Diagnostics HUD"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold shadow-md transition cursor-pointer ${
          showDevStats
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/60 text-slate-400'
        }`}
      >
        <Activity className="w-3.5 h-3.5" />
        <span>FPS / LOD</span>
      </button>
    </div>
  );
});

export interface TargetEnemyInfo {
  id: string;
  name: string;
  hull: number;
  hullMax: number;
  distance: number;
  crew: number;
  rank: number;
}

export interface NavalTargetEnemyWidgetProps {
  targetEnemy: TargetEnemyInfo | null;
  canBoard: boolean;
  onStartBoarding: (enemy: any) => void;
}

export const NavalTargetEnemyWidget: React.FC<NavalTargetEnemyWidgetProps> = React.memo(({
  targetEnemy,
  canBoard,
  onStartBoarding,
}) => {
  if (!targetEnemy) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/90 border border-amber-500/60 rounded-xl px-4 py-2 backdrop-blur-md shadow-2xl">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-red-400 animate-pulse" />
        <div>
          <div className="text-xs font-black text-amber-200">{targetEnemy.name}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>Dist: {targetEnemy.distance}m</span>
            <span>Rank {targetEnemy.rank}</span>
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div>
        <div className="text-[9px] text-slate-400 font-bold flex justify-between gap-3">
          <span>HULL</span>
          <span className="text-red-400">{targetEnemy.hull} / {targetEnemy.hullMax}</span>
        </div>
        <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-0.5 overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-200"
            style={{ width: `${Math.round((targetEnemy.hull / Math.max(1, targetEnemy.hullMax)) * 100)}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-400 mt-0.5">
          <span>CREW: {targetEnemy.crew}</span>
        </div>
      </div>

      {canBoard && (
        <button
          onClick={() => onStartBoarding(targetEnemy)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-900/60 animate-bounce cursor-pointer flex items-center gap-1.5"
        >
          <Swords className="w-4 h-4" />
          <span>Board Ship [B]</span>
        </button>
      )}
    </div>
  );
});

export interface NavalCombatLogTickerProps {
  combatLog: string[];
}

export const NavalCombatLogTicker: React.FC<NavalCombatLogTickerProps> = React.memo(({ combatLog }) => {
  return (
    <div className="absolute bottom-28 left-4 z-20 max-w-md pointer-events-none">
      <div className="space-y-1">
        {combatLog.slice(0, 3).map((log, idx) => (
          <div
            key={idx}
            className={`text-xs px-3.5 py-1.5 rounded-lg backdrop-blur-md border shadow-md transition-opacity ${
              idx === 0
                ? 'bg-slate-900/95 text-amber-200 border-amber-500/50 font-bold opacity-100'
                : 'bg-slate-950/75 text-slate-300 border-slate-800 font-normal opacity-70'
            }`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
});

export interface NavalIslandAnchorPromptProps {
  nearIsland: { id: string; name: string } | null;
  hasActiveHaven: boolean;
  onDockAtIsland: (isl: { id: string; name: string }) => void;
}

export const NavalIslandAnchorPrompt: React.FC<NavalIslandAnchorPromptProps> = React.memo(({
  nearIsland,
  hasActiveHaven,
  onDockAtIsland,
}) => {
  if (!nearIsland || hasActiveHaven) return null;

  return (
    <div className="absolute top-36 left-1/2 -translate-x-1/2 z-20 bg-amber-950/95 border-2 border-amber-500/90 rounded-2xl px-6 py-3.5 backdrop-blur-md shadow-2xl flex items-center gap-4 animate-bounce">
      <Anchor className="w-7 h-7 text-amber-400" />
      <div>
        <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">Approaching Harbor</div>
        <div className="text-base font-black text-amber-100">{nearIsland.name}</div>
      </div>
      <button
        id="naval-btn-drop-anchor"
        onClick={() => onDockAtIsland(nearIsland)}
        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-900/50 transition cursor-pointer"
      >
        Drop Anchor & Trade [Enter]
      </button>
    </div>
  );
});
