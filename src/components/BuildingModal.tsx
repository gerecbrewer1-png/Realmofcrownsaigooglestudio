/**
 * Realm of Crowns - Building Modal
 * Detailed inspection of selected building, stats comparison, upgrade prerequisites,
 * cost breakdown, and active construction speedup tools.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Castle,
  Wheat,
  Trees,
  Boxes,
  Hammer,
  Coins,
  Shield,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles,
  Swords,
  Heart,
} from 'lucide-react';
import { BuildingInstance, BuildingDefinition, Resources, ConstructionTask, InventoryItem } from '../types';
import { calculateBuildingCost, calculateBuildingDurationSeconds } from '../server/services/gameConfig';
import { soundEngine } from '../audio/soundEngine';

interface BuildingModalProps {
  building: BuildingInstance | null;
  def: BuildingDefinition | null;
  allBuildings: BuildingInstance[];
  castleLevel: number;
  currentResources: Resources;
  activeTask?: ConstructionTask;
  inventory: InventoryItem[];
  gemBalance: number;
  onClose: () => void;
  onStartUpgrade: (buildingId: string) => void;
  onSpeedup: (taskId: string, minutes: number, itemId?: string) => void;
  onInstant: (taskId: string, gemCost: number) => void;
  onOpenTraining?: (building: BuildingInstance) => void;
}

export const BuildingModal: React.FC<BuildingModalProps> = ({
  building,
  def,
  allBuildings,
  castleLevel,
  currentResources,
  activeTask,
  inventory,
  gemBalance,
  onClose,
  onStartUpgrade,
  onSpeedup,
  onInstant,
  onOpenTraining,
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!building || !def) return null;

  const targetLevel = building.level + 1;
  const isMaxLevel = targetLevel > def.maxLevel;
  const costs = isMaxLevel ? { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 } : calculateBuildingCost(def, targetLevel);
  const durationSec = isMaxLevel ? 0 : calculateBuildingDurationSeconds(def, targetLevel);

  // Prerequisites checks
  const prereqChecks = def.prerequisites.map((p) => {
    const match = allBuildings.find((b) => b.type === p.buildingType);
    const met = match ? match.level >= p.level : false;
    return { ...p, met, current: match ? match.level : 0 };
  });

  const castlePrereqMet = building.type === 'castle' || targetLevel <= castleLevel;
  const canAfford =
    currentResources.food >= costs.food &&
    currentResources.wood >= costs.wood &&
    currentResources.stone >= costs.stone &&
    currentResources.iron >= costs.iron &&
    currentResources.gold >= costs.gold;

  const allPrereqsMet = prereqChecks.every((p) => p.met) && castlePrereqMet;
  const canUpgrade = !activeTask && !isMaxLevel && canAfford && allPrereqsMet;

  // Active Task Math
  const remainingSec = activeTask ? Math.max(0, Math.floor((activeTask.completionTime - now) / 1000)) : 0;
  const instantGemCost = Math.max(5, Math.ceil(remainingSec / 30));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const speedupItems = inventory.filter((i) => i.type === 'speedup' && i.quantity > 0);

  return (
    <div
      id="building-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundEngine.playClick();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Castle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">{def.name}</h2>
                <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded">
                  Lv.{building.level}
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">{def.category} Structure</p>
            </div>
          </div>
          <button
            id="close-building-modal-btn"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          {def.description}
        </p>

        {/* Active Construction Progress (If upgrading) */}
        {activeTask ? (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Hammer className="w-4 h-4 animate-spin text-amber-400" />
                <span>Construction in Progress</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-sm text-amber-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>
                  {Math.floor(remainingSec / 60)}:{(remainingSec % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Instant Finish with Gems */}
            <div className="pt-2 border-t border-amber-900/50 flex flex-col gap-2">
              <button
                onClick={() => {
                  soundEngine.playChime();
                  onInstant(activeTask.taskId, instantGemCost);
                }}
                disabled={gemBalance < instantGemCost}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Instant Completion ({instantGemCost} Gems)</span>
              </button>
            </div>

            {/* Use Speedup Items */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">
                Apply Speed-Up Items
              </div>
              {speedupItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {speedupItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        soundEngine.playHammer();
                        onSpeedup(activeTask.taskId, item.effect.speedupMinutes || 1, item.id);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 border border-amber-900/50 rounded-lg p-2 flex flex-col items-center gap-1 text-center transition cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-200 leading-none">{item.name}</span>
                      <span className="text-[9px] text-slate-400">Own: {item.quantity}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No speed-up items in inventory. Complete chapter quests or inspect the store to acquire speed-ups.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Normal Upgrade Inspector */
          <div className="flex flex-col gap-4">
            {/* Level Comparison */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400">Current Level</span>
                <span className="font-bold text-amber-300 text-sm">Level {building.level}</span>
              </div>
              <span className="text-slate-500 text-lg">→</span>
              <div className="flex flex-col items-end">
                <span className="text-slate-400">Next Level</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {isMaxLevel ? 'MAX' : `Level ${targetLevel}`}
                </span>
              </div>
            </div>

            {/* Prerequisites */}
            {!isMaxLevel && (
              <div className="flex flex-col gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                  Upgrade Requirements
                </div>

                {/* Castle level requirement */}
                {building.type !== 'castle' && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {castlePrereqMet ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className={castlePrereqMet ? 'text-slate-300' : 'text-rose-300'}>
                        Main Castle Level {targetLevel}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">Current: Lv.{castleLevel}</span>
                  </div>
                )}

                {/* Other Building Prerequisites */}
                {prereqChecks.map((p) => (
                  <div key={p.buildingType} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {p.met ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className={p.met ? 'text-slate-300' : 'text-rose-300'}>
                        {p.buildingType.replace('_', ' ')} Level {p.level}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">Current: Lv.{p.current}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Required Resources */}
            {!isMaxLevel && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  <span>Required Resources</span>
                  <span className="flex items-center gap-1 text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Duration: {durationSec}s</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {costs.food > 0 && (
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        currentResources.food >= costs.food
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Wheat className="w-3.5 h-3.5 text-amber-400" />
                        <span>Food</span>
                      </div>
                      <span className="font-mono font-bold">{costs.food.toLocaleString()}</span>
                    </div>
                  )}

                  {costs.wood > 0 && (
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        currentResources.wood >= costs.wood
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Trees className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Wood</span>
                      </div>
                      <span className="font-mono font-bold">{costs.wood.toLocaleString()}</span>
                    </div>
                  )}

                  {costs.stone > 0 && (
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        currentResources.stone >= costs.stone
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-slate-400" />
                        <span>Stone</span>
                      </div>
                      <span className="font-mono font-bold">{costs.stone.toLocaleString()}</span>
                    </div>
                  )}

                  {costs.iron > 0 && (
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        currentResources.iron >= costs.iron
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Hammer className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Iron</span>
                      </div>
                      <span className="font-mono font-bold">{costs.iron.toLocaleString()}</span>
                    </div>
                  )}

                  {costs.gold > 0 && (
                    <div
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        currentResources.gold >= costs.gold
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                          : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gold</span>
                      </div>
                      <span className="font-mono font-bold">{costs.gold.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Military Training Action Button for Military Buildings */}
            {building.level > 0 && ['barracks', 'archery_range', 'stable', 'siege_workshop', 'hospital'].includes(building.type) && onOpenTraining && (
              <button
                id="recruit-troops-btn"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTraining(building);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {building.type === 'hospital' ? <Heart className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                <span>
                  {building.type === 'hospital'
                    ? 'Citadel Infirmary & Heal Wounded'
                    : 'Recruit & Train Battalions'}
                </span>
              </button>
            )}

            {/* Upgrade Action Button */}
            {!isMaxLevel ? (
              <button
                id="start-upgrade-btn"
                onClick={() => {
                  soundEngine.playHammer();
                  onStartUpgrade(building.id);
                }}
                disabled={!canUpgrade}
                className="w-full py-3 mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Hammer className="w-4 h-4" />
                <span>
                  {building.level === 0 ? 'Construct Building' : `Upgrade to Level ${targetLevel}`}
                </span>
              </button>
            ) : (
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-center text-xs font-semibold text-amber-300">
                Structure has reached the maximum sovereign level.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
