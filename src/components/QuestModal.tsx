/**
 * Realm of Crowns - Quest Modal
 * Displays chapter progression, beginner milestones, and reward claiming.
 */

import React from 'react';
import { X, Sparkles, Gem, Wheat, Trees, Boxes, Check, ArrowRight } from 'lucide-react';
import { QuestDefinition, QuestProgress } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface QuestModalProps {
  quests: (QuestDefinition & QuestProgress)[];
  onClose: () => void;
  onClaim: (questId: string) => void;
}

export const QuestModal: React.FC<QuestModalProps> = ({ quests, onClose, onClaim }) => {
  const sortedQuests = [...quests].sort((a, b) => {
    // Unclaimed completed quests first, then in-progress, then claimed
    if (a.completed && !a.claimed && (!b.completed || b.claimed)) return -1;
    if (b.completed && !b.claimed && (!a.completed || a.claimed)) return 1;
    if (!a.claimed && b.claimed) return -1;
    if (a.claimed && !b.claimed) return 1;
    return a.order - b.order;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-200">Royal Chapter Quests</h2>
              <p className="text-xs text-slate-400">Complete sovereign decrees to expand your realm and claim royal rewards.</p>
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

        {/* Quest List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {sortedQuests.map((quest) => {
            const pct = Math.min(100, Math.floor((quest.currentValue / quest.targetValue) * 100));

            return (
              <div
                key={quest.id}
                className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition ${
                  quest.claimed
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : quest.completed
                    ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-amber-500/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                      {quest.category} Objective
                    </span>
                    <h3 className="text-sm font-bold text-amber-100">{quest.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{quest.description}</p>
                  </div>

                  {/* Claim Button or Status */}
                  <div className="shrink-0">
                    {quest.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-800/80 px-2.5 py-1 rounded">
                        <Check className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : quest.completed ? (
                      <button
                        onClick={() => {
                          soundEngine.playFanfare();
                          onClaim(quest.id);
                        }}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-md animate-pulse cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Claim Reward</span>
                      </button>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800/60 px-2 py-1 rounded">
                        {quest.currentValue} / {quest.targetValue}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {!quest.claimed && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {/* Rewards Summary */}
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-300">
                  <span className="text-slate-400 font-sans font-bold">Rewards:</span>
                  {quest.rewardGems > 0 && (
                    <span className="flex items-center gap-1 text-emerald-300 font-bold">
                      <Gem className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                      +{quest.rewardGems} Gems
                    </span>
                  )}
                  {quest.rewardResources.food && (
                    <span className="flex items-center gap-1 text-amber-200">
                      <Wheat className="w-3 h-3 text-amber-400" />
                      +{quest.rewardResources.food.toLocaleString()}
                    </span>
                  )}
                  {quest.rewardResources.wood && (
                    <span className="flex items-center gap-1 text-emerald-200">
                      <Trees className="w-3 h-3 text-emerald-400" />
                      +{quest.rewardResources.wood.toLocaleString()}
                    </span>
                  )}
                  {quest.rewardResources.stone && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Boxes className="w-3 h-3 text-slate-400" />
                      +{quest.rewardResources.stone.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
