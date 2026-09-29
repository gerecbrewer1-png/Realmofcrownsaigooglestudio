/**
 * Realm of Crowns - Military Troop Training & Hospital Modal
 * Allows sovereigns to recruit, train, speed up, and heal troops across
 * 4 categories (Infantry, Ranged, Cavalry, Siege) and 3 tiers.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Zap,
  Clock,
  Swords,
  Heart,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import {
  KingdomState,
  BuildingInstance,
  TroopDefinition,
  TrainingTask,
  Resources,
  InventoryItem,
  PlayerProfile,
} from '../types';
import { soundEngine } from '../audio/soundEngine';

interface TrainingModalProps {
  building: BuildingInstance;
  kingdom: KingdomState;
  player: PlayerProfile;
  definitions: Record<string, TroopDefinition>;
  inventory: InventoryItem[];
  onClose: () => void;
  onTrain: (buildingId: string, unitId: string, quantity: number) => Promise<void>;
  onSpeedup: (taskId: string, minutes: number, itemId?: string) => Promise<void>;
  onInstantComplete: (taskId: string) => Promise<void>;
  onHeal: (unitId: string, quantity: number) => Promise<void>;
  onInstantHealAll: () => Promise<void>;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  building,
  kingdom,
  player,
  definitions,
  inventory,
  onClose,
  onTrain,
  onSpeedup,
  onInstantComplete,
  onHeal,
  onInstantHealAll,
}) => {
  const [activeTab, setActiveTab] = useState<'recruit' | 'hospital'>(
    building.type === 'hospital' ? 'hospital' : 'recruit'
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownTick, setCountdownTick] = useState<number>(Date.now());

  // Filter available units for this building
  const availableUnits: TroopDefinition[] = (Object.values(definitions) as TroopDefinition[]).filter((def) => {
    if (building.type === 'barracks') {
      return def.buildingType === 'barracks';
    }
    if (building.type === 'archery_range') {
      return def.buildingType === 'archery_range';
    }
    if (building.type === 'stable') {
      return def.buildingType === 'stable';
    }
    if (building.type === 'siege_workshop') {
      return def.buildingType === 'siege_workshop';
    }
    if (building.type === 'hospital') {
      return true;
    }
    return false;
  });

  // Default select first unit if not set
  useEffect(() => {
    if (!selectedUnitId && availableUnits.length > 0) {
      setSelectedUnitId(availableUnits[0].unitId);
    }
  }, [availableUnits, selectedUnitId]);

  // Live timer tick for active training queues
  useEffect(() => {
    const timer = setInterval(() => setCountdownTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedDef = definitions[selectedUnitId] || availableUnits[0];

  // Active training task for this building
  const activeTask = kingdom.trainingQueue?.find((t) => t.buildingId === building.id);

  // Calculate training costs for selected quantity
  const totalCost: Resources = selectedDef
    ? {
        food: (selectedDef.trainingCost.food || 0) * quantity,
        wood: (selectedDef.trainingCost.wood || 0) * quantity,
        stone: (selectedDef.trainingCost.stone || 0) * quantity,
        iron: (selectedDef.trainingCost.iron || 0) * quantity,
        gold: (selectedDef.trainingCost.gold || 0) * quantity,
      }
    : { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 };

  const canAfford =
    kingdom.resources.food >= totalCost.food &&
    kingdom.resources.wood >= totalCost.wood &&
    kingdom.resources.stone >= totalCost.stone &&
    kingdom.resources.iron >= totalCost.iron &&
    kingdom.resources.gold >= totalCost.gold;

  const isBuildingLevelAdequate = selectedDef
    ? building.level >= selectedDef.requiredBuildingLevel
    : false;

  const totalDurationSec = selectedDef ? selectedDef.trainingSecondsPerUnit * quantity : 0;
  const durationMins = Math.floor(totalDurationSec / 60);
  const durationSecs = totalDurationSec % 60;

  const handleStartTrain = async () => {
    if (!canAfford || !isBuildingLevelAdequate || quantity <= 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      soundEngine.playChime();
      await onTrain(building.id, selectedUnitId, quantity);
    } catch (err: any) {
      setErrorMessage(err.message || 'Training failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Speedup items from inventory
  const speedupItems = inventory.filter((item) => item.type === 'speedup');

  // Wounded count
  const woundedEntries = (Object.entries(kingdom.woundedTroops || {}) as [string, number][]).filter(
    ([_, count]) => count > 0
  );
  const totalWoundedCount = woundedEntries.reduce((sum, [_, count]) => sum + (count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">
                  {building.type === 'barracks'
                    ? 'Infantry & Siege Barracks'
                    : building.type === 'archery_range'
                    ? 'Royal Archery Range'
                    : 'Warhorse Stables'}
                </h2>
                <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded">
                  Lv.{building.level}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Drill recruits, commission master armor, and expand the realm’s standing legions.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('recruit');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'recruit'
                ? 'bg-amber-600 text-slate-950 shadow'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Recruit & Train</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('hospital');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'hospital'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Citadel Hospital</span>
            {totalWoundedCount > 0 && (
              <span className="bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {totalWoundedCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Training Task Banner */}
        {activeTask && (
          <div className="bg-slate-950 border border-amber-500/50 rounded-xl p-3.5 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-bold text-amber-300">
                  Currently Training: {activeTask.quantity} {activeTask.unitName}
                </span>
                <span className="bg-amber-950 text-amber-300 font-bold text-[10px] px-1.5 py-0.5 rounded border border-amber-800">
                  Tier {activeTask.tier}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {Math.max(0, Math.ceil((activeTask.completionTime - countdownTick) / 1000))}s remaining
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {(() => {
              const totalMs = activeTask.durationSeconds * 1000;
              const elapsedMs = Math.max(0, countdownTick - activeTask.startTime);
              const progressPct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
              const remainingSec = Math.max(0, Math.ceil((activeTask.completionTime - countdownTick) / 1000));
              const gemCost = Math.max(5, Math.ceil(remainingSec / 30));

              return (
                <>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {speedupItems.length > 0 && (
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onSpeedup(activeTask.taskId, 5, speedupItems[0].id);
                        }}
                        className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-900/40 transition cursor-pointer flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Use Speedup ({speedupItems[0].name})</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        soundEngine.playChime();
                        onInstantComplete(activeTask.taskId);
                      }}
                      className="text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg shadow transition flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Finish Instantly ({gemCost} Gems)</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-2.5 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Recruit & Train */}
        {activeTab === 'recruit' && (
          <div className="flex flex-col gap-4">
            {/* Unit Selection Grid */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-2">
                Available Battalions & Tiers
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableUnits.map((unit) => {
                  const isLocked = building.level < unit.requiredBuildingLevel;
                  const isSelected = selectedUnitId === unit.unitId;
                  const currentCount = kingdom.troops[unit.unitId] || 0;

                  return (
                    <div
                      key={unit.unitId}
                      onClick={() => {
                        if (!isLocked) {
                          soundEngine.playClick();
                          setSelectedUnitId(unit.unitId);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isLocked
                          ? 'bg-slate-950/50 border-slate-800 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-950/50 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                          : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-amber-100">{unit.name}</span>
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                              T{unit.tier}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            {unit.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {currentCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">in Citadel</span>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-300 mt-2 pt-2 border-t border-slate-800">
                        <div>⚔️ {unit.attack}</div>
                        <div>🛡️ {unit.defense}</div>
                        <div>❤️ {unit.health}</div>
                        <div>⚡ {unit.speed}x</div>
                      </div>

                      {isLocked && (
                        <div className="mt-2 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Requires {unit.buildingType} Lv.{unit.requiredBuildingLevel}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Unit Details & Training Controls */}
            {selectedDef && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">{selectedDef.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedDef.description}</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-900 border border-slate-800 text-amber-300 px-2 py-1 rounded">
                    Power: +{selectedDef.power * quantity}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Quantity to Drill:</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {quantity.toLocaleString()} troops
                    </span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {[50, 100, 250, 500].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className={`px-2.5 py-1 text-[11px] rounded border transition cursor-pointer ${
                          quantity === q
                            ? 'bg-amber-600 text-slate-950 font-bold border-amber-500'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource Costs */}
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Provisions Required
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-mono">
                    <div className={kingdom.resources.food < totalCost.food ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      🌾 {totalCost.food.toLocaleString()}
                    </div>
                    <div className={kingdom.resources.wood < totalCost.wood ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      🪵 {totalCost.wood.toLocaleString()}
                    </div>
                    <div className={kingdom.resources.stone < totalCost.stone ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      🪨 {totalCost.stone.toLocaleString()}
                    </div>
                    <div className={kingdom.resources.iron < totalCost.iron ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      ⛏️ {totalCost.iron.toLocaleString()}
                    </div>
                    <div className={kingdom.resources.gold < totalCost.gold ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      🪙 {totalCost.gold.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Duration & Train Button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-200">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>
                      Drill Time: {durationMins > 0 ? `${durationMins}m ` : ''}{durationSecs}s
                    </span>
                  </div>

                  <button
                    disabled={!canAfford || !isBuildingLevelAdequate || isSubmitting}
                    onClick={handleStartTrain}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer ${
                      canAfford && isBuildingLevelAdequate && !isSubmitting
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      {!isBuildingLevelAdequate
                        ? 'Building Level Too Low'
                        : !canAfford
                        ? 'Insufficient Resources'
                        : isSubmitting
                        ? 'Ordering Drill...'
                        : 'Commence Training'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Citadel Hospital */}
        {activeTab === 'hospital' && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-rose-300">Infirmary & Hospital Ward</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Troops severely wounded in world battles are cared for here rather than lost to the crown.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {totalWoundedCount} / {kingdom.hospitalCapacity || 5000}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Capacity</span>
                </div>
              </div>

              {totalWoundedCount > 0 ? (
                <div className="flex flex-col gap-2.5 mt-2">
                  {woundedEntries.map(([unitId, count]) => {
                    const unitDef = definitions[unitId];
                    return (
                      <div
                        key={unitId}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-rose-400" />
                          <div>
                            <span className="text-xs font-bold text-amber-200">
                              {unitDef?.name || unitId}
                            </span>
                            <span className="text-[10px] text-rose-400 font-mono block">
                              {count.toLocaleString()} wounded
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            soundEngine.playChime();
                            onHeal(unitId, count);
                          }}
                          className="bg-rose-900/60 hover:bg-rose-800 border border-rose-500/40 text-rose-200 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Treat & Restore
                        </button>
                      </div>
                    );
                  })}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        soundEngine.playFanfare();
                        onInstantHealAll();
                      }}
                      className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Instant Heal All ({Math.max(10, Math.ceil(totalWoundedCount / 20))} Gems)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <span className="text-3xl">🕊️</span>
                  <span>No soldiers currently occupying hospital beds. The royal garrison is at full vitality.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
