/**
 * World Modals Component
 * Contains March Dispatch Configuration Modal and Battle & Intelligence Dispatches Modal.
 */

import React, { useState } from 'react';
import {
  Swords,
  X,
  ShieldAlert,
  Trophy,
  Gem,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WorldTile,
  KingdomState,
  Commander,
  BattleReport,
  ScoutReport,
  PlayerWorldState,
} from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import {
  TROOP_DEFINITIONS,
  COMMANDER_ROSTER,
  calculateArmyCapacity,
  calculateArmySpeedFactor,
  calculateArmyPayloadCapacity,
  calculateTotalTroopPower,
} from '../../server/services/militaryConfig';

// ============================================================================
// 1. MARCH DISPATCH MODAL
// ============================================================================

interface MarchDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTile: WorldTile;
  dispatchType: 'gather' | 'attack_barbarian' | 'scout';
  kingdom: KingdomState;
  commander: Commander;
  calculatedDistance: number;
  onConfirmDispatch: (params: {
    targetCoords: { q: number; r: number };
    marchType: 'gather' | 'attack_barbarian' | 'scout';
    commanderId: string;
    commanderName: string;
    troops: Record<string, number>;
  }) => Promise<void>;
}

export const MarchDispatchModal: React.FC<MarchDispatchModalProps> = ({
  isOpen,
  onClose,
  selectedTile,
  dispatchType,
  kingdom,
  commander,
  calculatedDistance,
  onConfirmDispatch,
}) => {
  const [troopAllocation, setTroopAllocation] = useState<Record<string, number>>({
    swordsman_t1: Math.min(50, kingdom.troops?.swordsman_t1 || 0),
    archer_t1: Math.min(50, kingdom.troops?.archer_t1 || 0),
  });
  const [selectedCommanderId, setSelectedCommanderId] = useState<string>(commander.id || 'alden_valiant');
  const [selectedTroopCategory, setSelectedTroopCategory] = useState<'all' | 'infantry' | 'ranged' | 'cavalry' | 'siege'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeCommander = COMMANDER_ROSTER[selectedCommanderId] || commander;
  const maxDeploymentCapacity = calculateArmyCapacity(kingdom.castleLevel, activeCommander);
  const totalTroopsSelected: number = Object.values(troopAllocation).reduce<number>(
    (a: number, b: number) => a + (b > 0 ? b : 0),
    0
  );
  const totalArmyPower = calculateTotalTroopPower(troopAllocation) + activeCommander.power;
  let speedFactor = calculateArmySpeedFactor(troopAllocation, activeCommander);
  if (activeCommander?.stats?.marchSpeed) {
    speedFactor *= (1 + activeCommander.stats.marchSpeed);
  } else if (activeCommander?.heroClass === 'ranger') {
    speedFactor *= 1.35;
  }
  const estimatedMarchSeconds = Math.max(
    3,
    Math.round(calculatedDistance * (dispatchType === 'scout' ? 1.5 : Math.max(1.5, 4 / speedFactor)))
  );
  const payloadCapacity = calculateArmyPayloadCapacity(troopAllocation, activeCommander);

  const handleDispatch = async () => {
    try {
      setIsSubmitting(true);
      await onConfirmDispatch({
        targetCoords: selectedTile.coords,
        marchType: dispatchType,
        commanderId: activeCommander.id,
        commanderName: activeCommander.name,
        troops: troopAllocation,
      });
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to dispatch march.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 text-amber-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
              Sovereign Army Command
            </span>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-400" />
              {dispatchType === 'gather'
                ? `Gathering Expedition: ${selectedTile.resourceNode?.name || 'Resource Deposit'}`
                : `Assault: ${selectedTile.barbarianCamp?.name || selectedTile.rivalKingdom?.ownerName || 'Hostile Stronghold'}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Assessment if Barbarian Camp */}
        {selectedTile.barbarianCamp && (
          <div className="bg-purple-950/40 border border-purple-800/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-purple-300 font-bold">Enemy Host Rating</span>
              <span className="text-slate-400 block text-[11px]">
                Lv.{selectedTile.barbarianCamp.level} {selectedTile.barbarianCamp.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-amber-300 font-mono font-bold">
                {selectedTile.barbarianCamp.power.toLocaleString()} Power
              </span>
              <span className="text-[10px] text-slate-400 block">Defender Threat</span>
            </div>
          </div>
        )}

        {/* Commander Selection Bar */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Appoint Commanding Marshal
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.values(COMMANDER_ROSTER).map((cmd) => {
              const isSelected = selectedCommanderId === cmd.id;
              const hClass = cmd.heroClass || 'guardian';
              const classPerks: Record<string, string> = {
                warlord: '+20% Attack',
                guardian: '+25% Casualty Def',
                ranger: '+35% March Spd',
                steward: '+40% Payload',
                strategist: '+2.5k Cap',
              };
              const classIcons: Record<string, string> = {
                warlord: '⚔️',
                guardian: '🛡️',
                ranger: '🏹',
                steward: '📜',
                strategist: '♟️',
              };
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedCommanderId(cmd.id);
                  }}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/70 border-amber-400 shadow ring-1 ring-amber-400/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-amber-600/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{classIcons[hClass] || '🛡️'}</span>
                    <span className="text-xs font-bold text-slate-200 truncate">{cmd.name.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[9px]">
                    <span className="text-amber-400 font-bold uppercase">{hClass}</span>
                    <span className="text-emerald-300 font-mono font-semibold">{classPerks[hClass]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Troop Category Tabs & Quick Assign */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {(['all', 'infantry', 'ranged', 'cavalry', 'siege'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedTroopCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer shrink-0 ${
                  selectedTroopCategory === cat
                    ? 'bg-amber-600 text-slate-950'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                let remaining = maxDeploymentCapacity;
                const newAlloc: Record<string, number> = {};
                const troopsMap = (kingdom.troops || {}) as Record<string, number>;
                for (const [unitId, count] of Object.entries(troopsMap)) {
                  const num = Number(count) || 0;
                  if (num > 0 && remaining > 0) {
                    const toTake = Math.min(num, remaining);
                    newAlloc[unitId] = toTake;
                    remaining -= toTake;
                  }
                }
                setTroopAllocation(newAlloc);
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/60 rounded-lg cursor-pointer transition shadow-sm"
              title="Assign maximum available soldiers up to deployment capacity"
            >
              Max Army
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                setTroopAllocation({});
              }}
              className="px-2 py-1 text-[11px] font-bold bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-lg cursor-pointer transition"
              title="Reset troop allocation"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Troop Allocation Sliders */}
        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {Object.values(TROOP_DEFINITIONS)
            .filter((def) => selectedTroopCategory === 'all' || def.category === selectedTroopCategory)
            .map((unit) => {
              const garrisonAvailable = kingdom.troops[unit.unitId] || 0;
              const assigned = troopAllocation[unit.unitId] || 0;

              return (
                <div key={unit.unitId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{unit.name}</span>
                      <span className="bg-amber-950 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-800">
                        T{unit.tier}
                      </span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className="text-amber-400 font-bold">{assigned}</span>
                      <span className="text-slate-500"> / {garrisonAvailable.toLocaleString()} available</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max={garrisonAvailable}
                      value={assigned}
                      disabled={garrisonAvailable <= 0}
                      onChange={(e) =>
                        setTroopAllocation((prev) => ({
                          ...prev,
                          [unit.unitId]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-amber-500 cursor-pointer disabled:opacity-30"
                    />
                    <button
                      disabled={garrisonAvailable <= 0}
                      onClick={() =>
                        setTroopAllocation((prev) => ({
                          ...prev,
                          [unit.unitId]: garrisonAvailable,
                        }))
                      }
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 cursor-pointer disabled:opacity-30"
                    >
                      Max
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Capacity & Tactical Metrics Card */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Total Deployment Capacity:</span>
            <span
              className={`font-mono font-bold ${
                totalTroopsSelected > maxDeploymentCapacity ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              {totalTroopsSelected.toLocaleString()} / {maxDeploymentCapacity.toLocaleString()}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalTroopsSelected > maxDeploymentCapacity
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-300'
              }`}
              style={{
                width: `${Math.min(100, Math.round((totalTroopsSelected / Math.max(1, maxDeploymentCapacity)) * 100))}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-1 text-[11px] font-mono border-t border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block">Distance</span>
              <span className="text-slate-200 font-bold">{calculatedDistance} Hex</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">March Time</span>
              <span className="text-amber-400 font-bold">{estimatedMarchSeconds}s</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Army Power</span>
              <span className="text-amber-300 font-bold">{totalArmyPower.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Payload</span>
              <span className="text-emerald-400 font-bold">{payloadCapacity.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {totalTroopsSelected > maxDeploymentCapacity && (
          <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800 p-2 rounded-lg flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Army size exceeds deployment capacity. Reduce assigned troops.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={totalTroopsSelected <= 0 || totalTroopsSelected > maxDeploymentCapacity || isSubmitting}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <Swords className="w-4 h-4" />
            <span>{isSubmitting ? 'Deploying...' : 'Sound Horn & Deploy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. BATTLE & SCOUT REPORTS MODAL
// ============================================================================

interface BattleReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldState: PlayerWorldState | null;
}

export const BattleReportsModal: React.FC<BattleReportsModalProps> = ({
  isOpen,
  onClose,
  worldState,
}) => {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      soundEngine.playModalOpen();
      const first = worldState?.recentReports?.[0];
      if (first && 'victory' in first) {
        if ((first as BattleReport).victory) {
          soundEngine.playBattleVictory();
        } else {
          soundEngine.playBattleDefeat();
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-amber-900/70 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 text-amber-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Military & Intelligence Dispatches</h3>
              <span className="text-[11px] text-slate-400">Review expedition outcomes, casualties, and combat rounds</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
          {(!worldState?.recentReports || worldState.recentReports.length === 0) && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No military expeditions recorded yet. Dispatch scouts or attack barbarian camps to receive battle dispatches.
            </div>
          )}

          {worldState?.recentReports?.map((report) => {
            const isBattle = 'victory' in report;

            if (isBattle) {
              const b = report as BattleReport;
              const isExpanded = expandedReportId === b.id;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col gap-2.5 ${
                    b.victory ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-rose-950/30 border-rose-800/60'
                  }`}
                >
                  {/* Summary Banner */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          b.victory ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {b.victory ? 'Decisive Victory' : 'Battle Defeat'}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{b.targetName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(b.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Reward Badges */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {b.rewards?.gems ? (
                      <span className="bg-amber-950/80 border border-amber-600/40 text-amber-300 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Gem className="w-3 h-3 text-amber-400" />
                        +{b.rewards.gems} Gems
                      </span>
                    ) : null}
                    {b.commanderExpGained ? (
                      <span className="bg-blue-950/80 border border-blue-600/40 text-blue-300 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Award className="w-3 h-3 text-blue-400" />
                        +{b.commanderExpGained} EXP
                      </span>
                    ) : null}
                    {b.rewards?.resources &&
                      Object.entries(b.rewards.resources).map(([res, val]) => (
                        <span
                          key={res}
                          className="bg-slate-900 border border-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded"
                        >
                          +{Number(val).toLocaleString()} {res}
                        </span>
                      ))}
                  </div>

                  {/* Expandable Combat Details */}
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setExpandedReportId(isExpanded ? null : b.id);
                    }}
                    className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer pt-1 border-t border-slate-800/80"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Hide Combat Log & Casualty Ledger</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Inspect Battle Rounds & Hospital Casualties</span>
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 text-xs border-t border-slate-800">
                      {/* Casualties summary */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                          Royal Army Strength
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                          <div className="bg-slate-900 p-1.5 rounded">
                            <span className="text-[10px] text-slate-400 block">Sent</span>
                            <span className="text-slate-200 font-bold">
                              {Object.values(b.playerTroopsSent || {}).reduce((s, n) => s + n, 0)}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded">
                            <span className="text-[10px] text-rose-400 block">Hospital Wounded</span>
                            <span className="text-rose-300 font-bold">
                              {Object.values(b.playerSeverelyWounded || {}).reduce(
                                (s: number, n: number) => s + (n || 0),
                                0
                              )}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded">
                            <span className="text-[10px] text-emerald-400 block">Surviving</span>
                            <span className="text-emerald-300 font-bold">
                              {Object.values(b.playerSurviving || b.playerTroopsSent || {}).reduce(
                                (s: number, n: number) => s + (n || 0),
                                0
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Multi-Round Combat Logs */}
                      {b.rounds && b.rounds.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                            Tactical Engagement Rounds
                          </div>
                          {b.rounds.map((round) => (
                            <div
                              key={round.round}
                              className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[11px]"
                            >
                              <div className="flex items-center justify-between font-bold text-amber-300">
                                <span>
                                  Round {round.round}: {round.phaseName}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  ⚔️ {round.attackerDamageDealt.toLocaleString()} dmg
                                </span>
                              </div>
                              <p className="text-slate-400 mt-0.5 text-[10px]">{round.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            } else {
              const s = report as ScoutReport;
              return (
                <div key={s.id} className="p-3 rounded-xl border bg-cyan-950/30 border-cyan-900/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Intelligence Dispatch: {s.details?.name || 'Reconnaissance Target'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(s.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs space-y-1 text-slate-300">
                    <p>
                      <strong>Target Coords:</strong> ({s.targetCoords.q}, {s.targetCoords.r})
                    </p>
                    {s.details && (
                      <p className="text-slate-400 text-[11px]">
                        Scout reconnaissance confirms active defense perimeter and garrison units.
                      </p>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};
