/**
 * Realm of Crowns - Sovereign Admin Deck
 * Real-time controls for balance testing, resource grants, and system inspection.
 */

import React, { useState } from 'react';
import { X, Sliders, Gem, Wheat, Trees, Boxes, Hammer, Coins, Zap, ShieldAlert, Check } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface AdminModalProps {
  onClose: () => void;
  onGrant: (data: { gems?: number; food?: number; wood?: number; stone?: number; iron?: number; gold?: number }) => void;
  onInstantCompleteAll?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose, onGrant }) => {
  const [grantedNotice, setGrantedNotice] = useState<string | null>(null);

  const handleGrant = (data: { gems?: number; food?: number; wood?: number; stone?: number; iron?: number; gold?: number }, label: string) => {
    soundEngine.playCoins();
    onGrant(data);
    setGrantedNotice(`Granted ${label} successfully!`);
    setTimeout(() => setGrantedNotice(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">Sovereign Admin Deck</h2>
                <span className="bg-red-950 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-red-800">
                  Dev Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">Inspect server states, test progression balance, and inject test payloads.</p>
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

        {grantedNotice && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{grantedNotice}</span>
          </div>
        )}

        {/* Quick Balance Injection */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Authoritative Resource Injections
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleGrant({ food: 100000, wood: 100000 }, '+100K Food & Wood')}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Wheat className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">+100K Timber & Food</span>
              </div>
              <span className="text-slate-500 text-xs">+</span>
            </button>

            <button
              onClick={() => handleGrant({ stone: 50000, iron: 50000 }, '+50K Stone & Iron')}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-slate-300" />
                <span className="text-xs font-bold text-slate-200">+50K Stone & Iron</span>
              </div>
              <span className="text-slate-500 text-xs">+</span>
            </button>

            <button
              onClick={() => handleGrant({ gold: 25000 }, '+25K Gold Bullion')}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold text-slate-200">+25K Gold Bullion</span>
              </div>
              <span className="text-slate-500 text-xs">+</span>
            </button>

            <button
              onClick={() => handleGrant({ gems: 2500 }, '+2,500 Treasury Gems')}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-emerald-900/50 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">+2,500 Gems</span>
              </div>
              <span className="text-slate-500 text-xs">+</span>
            </button>
          </div>
        </div>

        {/* Server & Security Status */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col gap-2 font-mono">
          <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-amber-300">
            System & Security Status
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Authoritative Server:</span>
            <span className="text-emerald-400 font-bold">Online (Port 3000)</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Firestore Cloud Database:</span>
            <span className="text-emerald-400 font-bold">infinite-jet-rvk22</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Security Rules:</span>
            <span className="text-emerald-400 font-bold">ABAC Deployed (firestore.rules)</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-500">Game Architecture:</span>
            <span className="text-amber-300 font-bold">Phase 0 + Phase 1 Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
