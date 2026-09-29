/**
 * Contextual World Interaction Card
 * Compact, non-blocking tactical overlay that appears directly above the 3D world when an object is selected.
 * Enhanced with bespoke fantasy icons, metallic frames, and strategic action states.
 */

import React from 'react';
import {
  MapPin,
  ArrowRight,
  X,
  Sparkles,
  TreePine,
  Mountain,
} from 'lucide-react';
import { WorldTile, KingdomState, PlayerProfile } from '../../types';
import { soundEngine } from '../../audio/soundEngine';
import { GameIcons } from '../ui/GameIcons';

interface WorldContextualCardProps {
  selectedTile: WorldTile;
  distance: number;
  kingdom: KingdomState;
  player: PlayerProfile;
  onClose: () => void;
  onOpenDispatch: (type: 'gather' | 'attack_barbarian' | 'scout') => void;
  onScout: () => void;
  onBackToKingdom: () => void;
  onFocusCityView: () => void;
}

export const WorldContextualCard: React.FC<WorldContextualCardProps> = ({
  selectedTile,
  distance,
  kingdom,
  player,
  onClose,
  onOpenDispatch,
  onScout,
  onBackToKingdom,
  onFocusCityView,
}) => {
  const { coords, entityType, terrain, resourceNode, barbarianCamp, rivalKingdom, ancientShrine } = selectedTile;
  const isHome = coords.q === 0 && coords.r === 0;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-950/95 border-2 border-amber-500/60 backdrop-blur-2xl rounded-2xl shadow-2xl p-4 text-slate-100 relative overflow-hidden">
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Close Selection Card"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Home Player Citadel */}
        {isHome && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/30 to-amber-950/60 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-inner">
                <GameIcons.Citadel className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-amber-300 flex items-center gap-2">
                  {player?.displayName || 'Lord Valerius'}&apos;s Royal Citadel
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-mono font-bold">
                    Lv.{kingdom.castleLevel}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Coords: ({coords.q}, {coords.r}) Sovereign Capital Domain
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Military Power</span>
                <span className="text-amber-400 font-mono font-extrabold text-sm flex items-center gap-1">
                  <GameIcons.Power className="w-3.5 h-3.5" />
                  {(player?.power || 12500).toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Peace Shield</span>
                <span className={`font-bold text-sm flex items-center gap-1 ${kingdom.shieldActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <GameIcons.Defense className="w-3.5 h-3.5" />
                  {kingdom.shieldActive ? 'Active (Protected)' : 'Shield Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onFocusCityView();
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-900/40 cursor-pointer transition min-h-[44px]"
              >
                <GameIcons.Citadel className="w-4 h-4" />
                <span>Focus City Camera</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onBackToKingdom();
                }}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition min-h-[44px]"
              >
                <span>Citadel Management</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Resource Node */}
        {entityType === 'resource_node' && resourceNode && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-950/50 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-inner">
                {resourceNode.resourceType === 'food' && <GameIcons.Food className="w-7 h-7" />}
                {resourceNode.resourceType === 'wood' && <GameIcons.Wood className="w-7 h-7" />}
                {resourceNode.resourceType === 'stone' && <GameIcons.Stone className="w-7 h-7" />}
                {resourceNode.resourceType === 'iron' && <GameIcons.Iron className="w-7 h-7" />}
                {resourceNode.resourceType === 'gold' && <GameIcons.Gold className="w-7 h-7" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  {resourceNode.name}
                  <span className="text-[10px] bg-slate-900 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    Lv.{resourceNode.level}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  ({coords.q}, {coords.r}) • Distance: {distance} hexes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px] font-semibold">Remaining Deposit</span>
                <span className="text-amber-300 font-mono font-bold">
                  {resourceNode.currentCapacity.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px] font-semibold">Harvest Rate</span>
                <span className="text-emerald-400 font-mono font-bold">
                  +{resourceNode.gatheringRatePerHour.toLocaleString()}/h
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px] font-semibold">Status</span>
                <span className="text-slate-200 font-semibold truncate block">
                  {resourceNode.occupiedByPlayerName ? 'Occupied' : 'Unclaimed'}
                </span>
              </div>
            </div>

            <button
              id="btn-action-gather"
              onClick={() => {
                soundEngine.playMarchHorn();
                onOpenDispatch('gather');
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition active:scale-[0.98] min-h-[44px]"
            >
              <GameIcons.Food className="w-4 h-4" />
              <span>Dispatch Harvesting Battalion</span>
            </button>
          </div>
        )}

        {/* 3. Barbarian Camp */}
        {entityType === 'barbarian_camp' && barbarianCamp && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/30 to-red-950/60 border border-red-500/60 flex items-center justify-center text-red-400 shadow-inner">
                <GameIcons.Attack className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-rose-300 flex items-center gap-2">
                  {barbarianCamp.name}
                  <span className="text-[10px] bg-rose-950/90 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    Lv.{barbarianCamp.level}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  ({coords.q}, {coords.r}) • Distance: {distance} hexes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Host Power</span>
                <span className="text-rose-400 font-mono font-extrabold text-sm flex items-center gap-1">
                  <GameIcons.Army className="w-3.5 h-3.5" />
                  {barbarianCamp.power.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Victory Spoils</span>
                <span className="text-amber-300 font-mono font-bold text-sm flex items-center gap-1">
                  <GameIcons.Gems className="w-3.5 h-3.5" />
                  +{barbarianCamp.rewards.gems} Gems &amp; Loot
                </span>
              </div>
            </div>

            <button
              id="btn-action-attack-barbarian"
              onClick={() => {
                soundEngine.playBattleClash();
                onOpenDispatch('attack_barbarian');
              }}
              className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition active:scale-[0.98] min-h-[44px]"
            >
              <GameIcons.Attack className="w-4 h-4" />
              <span>Assault Barbarian Fortress</span>
            </button>
          </div>
        )}

        {/* 4. Rival Player Kingdom */}
        {entityType === 'rival_kingdom' && rivalKingdom && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-indigo-950/60 border border-indigo-500/60 flex items-center justify-center text-indigo-400 shadow-inner">
                <GameIcons.Citadel className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  Lord {rivalKingdom.ownerName}
                  <span className="text-[10px] bg-slate-900 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    Lv.{rivalKingdom.castleLevel}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  ({coords.q}, {coords.r}) • Distance: {distance} hexes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Kingdom Power</span>
                <span className="text-indigo-300 font-mono font-extrabold text-sm flex items-center gap-1">
                  <GameIcons.Power className="w-3.5 h-3.5" />
                  {rivalKingdom.power.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Defense Shield</span>
                <span className={`font-bold text-sm flex items-center gap-1 ${rivalKingdom.shieldActive ? 'text-amber-400' : 'text-rose-400'}`}>
                  <GameIcons.Defense className="w-3.5 h-3.5" />
                  {rivalKingdom.shieldActive ? 'Fortified Shield' : 'Unprotected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onScout();
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border border-sky-900/50 cursor-pointer transition min-h-[44px]"
              >
                <GameIcons.Scout className="w-4 h-4" />
                <span>Scout Defenses</span>
              </button>
              <button
                disabled={rivalKingdom.shieldActive}
                onClick={() => {
                  soundEngine.playBattleClash();
                  onOpenDispatch('attack_barbarian');
                }}
                className={`flex-1 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition min-h-[44px] ${
                  rivalKingdom.shieldActive
                    ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800'
                    : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 cursor-pointer'
                }`}
              >
                <GameIcons.Attack className="w-4 h-4" />
                <span>{rivalKingdom.shieldActive ? 'Shielded' : 'Raid Kingdom'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Ancient Shrine */}
        {entityType === 'ancient_shrine' && ancientShrine && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600/30 to-sky-950/60 border border-sky-500/60 flex items-center justify-center text-sky-400 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-sky-300">{ancientShrine.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  ({coords.q}, {coords.r}) Celestial Monolith
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 mb-3 text-xs">
              <span className="text-amber-400 font-bold block mb-1">Arcane Blessing:</span>
              <p className="text-slate-300">{ancientShrine.description}</p>
            </div>

            <div className="text-center text-[11px] text-sky-400 font-semibold py-1">
              Active realm-wide holy shrine blessing conferred to all nearby sovereign lords.
            </div>
          </div>
        )}

        {/* 6. Empty Terrain */}
        {entityType === 'empty' && !isHome && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                {terrain === 'mountains' ? <Mountain className="w-5 h-5 text-slate-300" /> : <TreePine className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-200 capitalize">{terrain} Wilderness</h3>
                <p className="text-xs text-slate-400">
                  Sector ({coords.q}, {coords.r}) • Distance: {distance} hexes
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Unoccupied territory in the realm. Clear for marching battalions or outpost relocation.
            </p>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer min-h-[44px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
