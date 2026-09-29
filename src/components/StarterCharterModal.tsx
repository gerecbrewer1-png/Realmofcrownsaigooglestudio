/**
 * Realm of Crowns - Starter Sovereign Charter Modal
 * Generous first-session onboarding package presentation.
 */

import React from 'react';
import { Sparkles, Gem, Wheat, Trees, Boxes, Shield, Award, Check } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface StarterCharterModalProps {
  onClaim: () => void;
}

export const StarterCharterModal: React.FC<StarterCharterModalProps> = ({ onClaim }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/70 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center text-amber-100 gap-4">
        {/* Heraldic Crest */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-700 to-slate-950 border-2 border-amber-400 shadow-2xl">
          <span className="text-4xl animate-bounce">👑</span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-widest font-extrabold text-amber-400">
            Royal Proclamation
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-amber-200 mt-0.5">
            The Sovereign Charter
          </h2>
          <p className="text-xs text-slate-300 max-w-md mt-1 leading-relaxed">
            Hail, Sovereign Lord! By royal decree of the High Council, your ancestral kingdom is granted full provisions to build, cultivate, and muster defenses without early hardship.
          </p>
        </div>

        {/* Provisions Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 text-xs text-left bg-slate-950/70 p-3.5 rounded-2xl border border-amber-900/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/85 border border-emerald-500/30">
            <Gem className="w-5 h-5 text-emerald-400 fill-emerald-400 shrink-0" />
            <div>
              <div className="font-extrabold text-emerald-400 font-mono">1,500 Gems</div>
              <div className="text-[10px] text-slate-400">Treasury Reserve</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/85 border border-sky-500/30">
            <Shield className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="font-extrabold text-sky-300 font-mono">24h Peace Shield</div>
              <div className="text-[10px] text-slate-400">Divine Protection</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/85 border border-amber-900/40">
            <Wheat className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-extrabold text-amber-200 font-mono">50K Food & Wood</div>
              <div className="text-[10px] text-slate-400">Settlement Supplies</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/85 border border-amber-900/40">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-extrabold text-amber-200">Sir Alden</div>
              <div className="text-[10px] text-slate-400">Epic Starter Hero</div>
            </div>
          </div>
        </div>

        {/* Accept Button */}
        <button
          id="claim-charter-btn"
          onClick={() => {
            soundEngine.playFanfare();
            onClaim();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-xl transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Accept Crown & Claim Provisions</span>
        </button>
      </div>
    </div>
  );
};
