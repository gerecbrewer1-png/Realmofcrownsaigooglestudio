/**
 * Realm of Crowns - Interactive Kingdom Overview
 * Renders the medieval settlement districts with data-driven building cards,
 * live construction progress, and building inspection triggers.
 */

import React, { useState, useEffect } from 'react';
import {
  Castle,
  Wheat,
  Trees,
  Boxes,
  Hammer,
  Coins,
  Shield,
  BookOpen,
  HeartPulse,
  Crosshair,
  Compass,
  ArrowUpCircle,
  Clock,
  Zap,
  Sparkles,
  ChevronRight,
  Swords,
  Heart,
  Eye,
  LayoutGrid,
  Anchor,
} from 'lucide-react';
import { BuildingInstance, ConstructionTask, BuildingDefinition, Commander } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { Kingdom3DCanvas } from './world3d/Kingdom3DCanvas';

interface KingdomViewProps {
  buildings: BuildingInstance[];
  queue: ConstructionTask[];
  maxQueueSlots: number;
  definitions: Record<string, BuildingDefinition>;
  commander?: Commander | null;
  castleLevel?: number;
  onSelectBuilding: (building: BuildingInstance) => void;
  onSpeedupTask: (task: ConstructionTask) => void;
  onInstantComplete: (task: ConstructionTask) => void;
  onOpenQuests: () => void;
  activeQuestTitle?: string;
  onOpenTraining?: (building: BuildingInstance) => void;
  onCollectResources?: () => void;
  onNavigateToWorld?: () => void;
  onNavigateToBattle?: () => void;
  onNavigateToVoyage?: () => void;
}

export const KingdomView: React.FC<KingdomViewProps> = ({
  buildings,
  queue,
  maxQueueSlots,
  definitions,
  commander,
  castleLevel = 1,
  onSelectBuilding,
  onSpeedupTask,
  onInstantComplete,
  onOpenQuests,
  activeQuestTitle,
  onOpenTraining,
  onCollectResources,
  onNavigateToWorld,
  onNavigateToBattle,
  onNavigateToVoyage,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | 'roster'>('3d');
  const [selectedDistrict, setSelectedDistrict] = useState<'all' | 'central' | 'farmland' | 'quarry' | 'military' | 'walls'>('all');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getBuildingIcon = (type: string) => {
    switch (type) {
      case 'castle':
        return <Castle className="w-6 h-6 text-amber-400" />;
      case 'farm':
        return <Wheat className="w-6 h-6 text-amber-300" />;
      case 'lumber_mill':
        return <Trees className="w-6 h-6 text-emerald-400" />;
      case 'quarry':
        return <Boxes className="w-6 h-6 text-slate-300" />;
      case 'iron_mine':
        return <Hammer className="w-6 h-6 text-indigo-300" />;
      case 'gold_mine':
        return <Coins className="w-6 h-6 text-amber-300" />;
      case 'warehouse':
        return <Boxes className="w-6 h-6 text-amber-500" />;
      case 'barracks':
        return <Shield className="w-6 h-6 text-red-400" />;
      case 'archery_range':
        return <Crosshair className="w-6 h-6 text-emerald-400" />;
      case 'stable':
        return <Compass className="w-6 h-6 text-sky-400" />;
      case 'academy':
        return <BookOpen className="w-6 h-6 text-cyan-400" />;
      case 'hospital':
        return <HeartPulse className="w-6 h-6 text-rose-400" />;
      case 'wall':
      case 'watchtower':
        return <Shield className="w-6 h-6 text-slate-300" />;
      default:
        return <Castle className="w-6 h-6 text-amber-400" />;
    }
  };

  const filteredBuildings = selectedDistrict === 'all'
    ? buildings
    : buildings.filter((b) => b.visualDistrict === selectedDistrict);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 py-4 flex flex-col gap-4">
      {/* Chapter Quest Quick Tracker Banner */}
      {activeQuestTitle && (
        <div
          id="active-quest-banner"
          onClick={() => {
            soundEngine.playClick();
            onOpenQuests();
          }}
          className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between shadow-lg cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Current Royal Objective</div>
              <div className="text-xs sm:text-sm font-semibold text-amber-100">{activeQuestTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
            <span>View Quests</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* View Mode Switcher & World Portal */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-amber-900/40 rounded-xl p-1.5 shadow-md">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setViewMode('3d');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === '3d'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>3D Realm Citadel</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setViewMode('roster');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'roster'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>District Roster</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToWorld && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHorn();
                onNavigateToWorld();
              }}
              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">March to</span> World Map
            </button>
          )}

          {onNavigateToBattle && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playHorn();
                onNavigateToBattle();
              }}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/60 text-red-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>Battle</span>
            </button>
          )}

          {onNavigateToVoyage && (
            <button
              type="button"
              id="btn-naval-voyage-citadel"
              onClick={() => {
                soundEngine.playHorn();
                onNavigateToVoyage();
              }}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/60 text-cyan-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Anchor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Naval Voyage</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D Interactive Kingdom View */}
      {viewMode === '3d' && (
        <div className="w-full">
          <Kingdom3DCanvas
            buildings={buildings}
            definitions={definitions}
            queue={queue}
            commander={commander || null}
            castleLevel={castleLevel}
            onSelectBuilding={onSelectBuilding}
            onCollectResources={onCollectResources}
            onNavigateToWorld={onNavigateToWorld}
          />
        </div>
      )}

      {/* Active Construction Queue Banner */}
      <div className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide uppercase">
              Builder Hammers ({queue.length} / {maxQueueSlots})
            </h2>
          </div>
          {queue.length === 0 && (
            <span className="text-[11px] text-slate-400 italic">Hammers idle. Tap any building to upgrade.</span>
          )}
        </div>

        {queue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {queue.map((task) => {
              const remainingSeconds = Math.max(0, Math.floor((task.completionTime - now) / 1000));
              const progressPct = Math.min(
                100,
                Math.max(0, ((now - task.startTime) / (task.completionTime - task.startTime)) * 100)
              );
              const minutes = Math.floor(remainingSeconds / 60);
              const seconds = remainingSeconds % 60;
              const gemCost = Math.max(5, Math.ceil(remainingSeconds / 30));

              return (
                <div
                  key={task.taskId}
                  className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-2.5 flex flex-col gap-2 shadow-inner"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>{task.buildingName}</span>
                      <span className="text-amber-400">→ Lv.{task.targetLevel}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs text-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {minutes}:{seconds < 10 ? '0' : ''}{seconds}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        onSpeedupTask(task);
                      }}
                      className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded border border-amber-900/40 transition cursor-pointer"
                    >
                      Speed Up
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playChime();
                        onInstantComplete(task);
                      }}
                      className="text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded shadow transition flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 fill-slate-950" />
                      <span>Finish ({gemCost} Gems)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>All builder queues are clear and ready for sovereign expansion.</span>
          </div>
        )}
      </div>

      {/* District Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        {[
          { id: 'all', label: 'All Districts' },
          { id: 'central', label: 'Sovereign Keep' },
          { id: 'farmland', label: 'Farmlands' },
          { id: 'quarry', label: 'Mountain Mines' },
          { id: 'military', label: 'Garrison' },
          { id: 'walls', label: 'Bastion' },
        ].map((d) => (
          <button
            key={d.id}
            onClick={() => {
              soundEngine.playClick();
              setSelectedDistrict(d.id as any);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedDistrict === d.id
                ? 'bg-amber-600 text-slate-950 shadow-md font-bold'
                : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Grid of Kingdom Buildings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredBuildings.map((building) => {
          const def = definitions[building.type];
          const activeTask = queue.find((t) => t.buildingId === building.id);
          const isUpgrading = !!activeTask;

          return (
            <div
              key={building.id}
              id={`building-card-${building.id}`}
              onClick={() => {
                soundEngine.playClick();
                onSelectBuilding(building);
              }}
              className={`relative rounded-xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md group ${
                isUpgrading
                  ? 'bg-slate-900 border-2 border-amber-400 shadow-amber-950/50'
                  : building.level > 0
                  ? 'bg-slate-900/80 hover:bg-slate-850 border border-amber-900/40 hover:border-amber-500/60'
                  : 'bg-slate-950/60 hover:bg-slate-900 border border-dashed border-slate-700 opacity-80'
              }`}
            >
              {/* Top Row: Icon and Level */}
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl border ${
                  building.level > 0
                    ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-600/30'
                    : 'bg-slate-900 border-slate-700'
                }`}>
                  {getBuildingIcon(building.type)}
                </div>

                <div className="flex flex-col items-end">
                  {building.level > 0 ? (
                    <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded shadow">
                      Lv.{building.level}
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 font-bold text-[10px] px-1.5 py-0.5 rounded">
                      Unbuilt
                    </span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">
                    {def?.category || 'Civil'}
                  </span>
                </div>
              </div>

              {/* Middle Row: Name and Production */}
              <div className="mt-3">
                <h3 className="text-sm font-bold text-amber-100 group-hover:text-amber-300 transition truncate">
                  {building.name}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {def?.description}
                </p>
              </div>

              {/* Military Direct Quick Action Button */}
              {building.level > 0 && ['barracks', 'archery_range', 'stable', 'siege_workshop', 'hospital'].includes(building.type) && onOpenTraining && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClick();
                    onOpenTraining(building);
                  }}
                  className="mt-2.5 w-full py-1.5 px-2 bg-amber-600/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                >
                  {building.type === 'hospital' ? <Heart className="w-3 h-3 text-rose-400" /> : <Swords className="w-3 h-3 text-amber-400" />}
                  <span>{building.type === 'hospital' ? 'Citadel Hospital' : 'Recruit Battalions'}</span>
                </button>
              )}

              {/* Bottom Row: Status / Upgrade Trigger */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {isUpgrading ? (
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Hammer className="w-3.5 h-3.5 animate-spin" />
                    <span>Upgrading...</span>
                  </div>
                ) : building.level > 0 ? (
                  <div className="flex items-center gap-1 text-slate-400 text-[11px] group-hover:text-amber-400">
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Inspect / Upgrade</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                    <span>Construct</span>
                  </div>
                )}
                <span className="text-slate-500 text-xs">›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
