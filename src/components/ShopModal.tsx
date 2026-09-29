/**
 * Realm of Crowns - Royal Treasury & Shop Modal
 * Showcases fair-play monetization, Gem packs, speedup bundles, and transaction ledger.
 */

import React, { useState } from 'react';
import { X, Gem, ShieldCheck, History, Sparkles, Clock, Check } from 'lucide-react';
import { GameConfiguration, TransactionRecord } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface ShopModalProps {
  config: GameConfiguration | null;
  transactions: TransactionRecord[];
  gemBalance: number;
  onClose: () => void;
  onSimulatePurchase: (pack: GameConfiguration['storePacks'][0]) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  config,
  transactions,
  gemBalance,
  onClose,
  onSimulatePurchase,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'ledger'>('store');
  const [purchasedPackId, setPurchasedPackId] = useState<string | null>(null);

  const packs = config?.storePacks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-emerald-400">
              <Gem className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">Royal Treasury & Vault</h2>
                <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  <Gem className="w-3 h-3 fill-emerald-400" />
                  {gemBalance.toLocaleString()} Gems
                </span>
              </div>
              <p className="text-xs text-slate-400">Optional time acceleration and convenience. Fair play is strictly guaranteed.</p>
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
              setActiveTab('store');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'store'
                ? 'bg-amber-600 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Gem className="w-3.5 h-3.5" />
            <span>Treasury Store</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('ledger');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-amber-600 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Ledger</span>
          </button>
        </div>

        {/* Tab 1: Store Packs */}
        {activeTab === 'store' && (
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Fair Play Notice */}
            <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Fair Play Guarantee:</strong> Spending is 100% optional. All buildings, military tiers, and technologies can be fully unlocked through gameplay, quests, and daily milestones.
              </span>
            </div>

            {/* Gem Packs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {packs.map((pack) => {
                const totalGems = pack.gems + pack.bonusGems;
                const isJustPurchased = purchasedPackId === pack.id;

                return (
                  <div
                    key={pack.id}
                    className="relative bg-slate-950/80 border border-amber-900/40 hover:border-amber-500/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-center shadow transition"
                  >
                    {pack.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow">
                        {pack.badge}
                      </span>
                    )}

                    <div className="pt-1">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                        <Gem className="w-6 h-6 fill-emerald-400" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-200">{pack.name}</h4>
                      <div className="text-base font-extrabold text-emerald-400 font-mono mt-1">
                        {totalGems.toLocaleString()} Gems
                      </div>
                      {pack.bonusGems > 0 && (
                        <div className="text-[10px] text-amber-400 font-semibold font-mono">
                          +{pack.bonusGems.toLocaleString()} Bonus Included
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        soundEngine.playChime();
                        setPurchasedPackId(pack.id);
                        setTimeout(() => setPurchasedPackId(null), 2500);
                        onSimulatePurchase(pack);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isJustPurchased ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Acquired!</span>
                        </>
                      ) : (
                        <span>${pack.priceUsd.toFixed(2)} USD</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Transaction Ledger */}
        {activeTab === 'ledger' && (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            <p className="text-xs text-slate-400 mb-1">
              Immutable server-authoritative ledger tracking all currency grants and expenditures:
            </p>
            {transactions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold text-amber-200 uppercase text-[11px] font-sans">
                        {tx.source.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(tx.timestamp).toLocaleTimeString()} · {tx.transactionId}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          tx.amountDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.amountDelta > 0 ? `+${tx.amountDelta}` : tx.amountDelta} {tx.currencyType}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Balance: {tx.balanceAfter.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-4 text-center">No transaction records logged yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
