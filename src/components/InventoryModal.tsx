/**
 * Realm of Crowns - Inventory & Vault Modal
 */

import React, { useState } from 'react';
import { X, Clock, Wheat, Trees, Boxes, Shield, Package, Sparkles } from 'lucide-react';
import { InventoryItem } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface InventoryModalProps {
  items: InventoryItem[];
  onClose: () => void;
  onUseItem: (itemId: string, quantity?: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ items, onClose, onUseItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'speedup' | 'resource_pack' | 'shield'>('all');

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((i) => i.type === selectedCategory);

  const getItemIcon = (item: InventoryItem) => {
    switch (item.type) {
      case 'speedup':
        return <Clock className="w-6 h-6 text-amber-400" />;
      case 'resource_pack':
        return <Wheat className="w-6 h-6 text-emerald-400" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-sky-400" />;
      default:
        return <Package className="w-6 h-6 text-amber-300" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-200">Kingdom Vault & Inventory</h2>
              <p className="text-xs text-slate-400">Manage stockpiled speed-up vouchers, resource packs, and shields.</p>
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

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'speedup', label: 'Speed-Ups' },
            { id: 'resource_pack', label: 'Resource Packs' },
            { id: 'shield', label: 'Peace Shields' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundEngine.playClick();
                setSelectedCategory(cat.id as any);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/70 border border-slate-800 hover:border-amber-900/60 rounded-xl p-3 flex flex-col justify-between gap-2.5 transition shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-750 shrink-0">
                  {getItemIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-200 truncate">{item.name}</h4>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/40">
                      x{item.quantity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  onClick={() => {
                    if (item.type === 'resource_pack') soundEngine.playCoins();
                    else if (item.type === 'shield') soundEngine.playFanfare();
                    else soundEngine.playClick();
                    onUseItem(item.id, 1);
                  }}
                  disabled={item.quantity <= 0}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use Item</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
