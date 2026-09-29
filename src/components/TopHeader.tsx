/**
 * Realm of Crowns - Premium 4X Fantasy Strategy Top Header HUD
 * Displays player sovereignty, power, peace shield countdown, authoritative resources with storage caps,
 * and quick strategic action controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Keyboard,
  Anchor,
} from 'lucide-react';
import { PlayerProfile, Resources, ProductionRates } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { GameIcons } from './ui/GameIcons';

interface TopHeaderProps {
  player: PlayerProfile | null;
  resources: Resources;
  productionRates: ProductionRates;
  storageCap: Resources;
  currentTab?: string;
  onOpenStore: () => void;
  onOpenAdmin: () => void;
  onOpenAudioSettings?: () => void;
  onOpenControlsSettings?: () => void;
  onToggleMap?: () => void;
  onNavigateVoyage?: () => void;
  onCollect: () => void;
  isCollecting: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  player,
  resources,
  productionRates,
  storageCap,
  currentTab,
  onOpenStore,
  onOpenAdmin,
  onOpenAudioSettings,
  onOpenControlsSettings,
  onToggleMap,
  onNavigateVoyage,
  onCollect,
  isCollecting,
}) => {
  const [soundActive, setSoundActive] = useState(soundEngine.isEnabled());
  const [shieldTimeLeft, setShieldTimeLeft] = useState<string>('');

  useEffect(() => {
    return soundEngine.onSettingsChange((s) => {
      setSoundActive(!s.masterMuted && s.masterVolume > 0);
    });
  }, []);

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const remainingMs = player.shieldExpiresAt - Date.now();
      if (remainingMs > 0) {
        const hours = Math.floor(remainingMs / (3600 * 1000));
        const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
        setShieldTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setShieldTimeLeft('Expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.shieldExpiresAt]);

  const toggleAudio = () => {
    const newState = soundEngine.toggleSound();
    setSoundActive(newState);
    if (newState) soundEngine.playClick();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
  };

  const resourceItems = [
    {
      id: 'food',
      name: 'Food',
      amount: resources.food,
      rate: productionRates.foodPerHour,
      cap: storageCap.food || 50000,
      icon: GameIcons.Food,
      color: 'from-amber-500/20 to-amber-950/40',
      borderColor: 'border-amber-700/40',
    },
    {
      id: 'wood',
      name: 'Wood',
      amount: resources.wood,
      rate: productionRates.woodPerHour,
      cap: storageCap.wood || 50000,
      icon: GameIcons.Wood,
      color: 'from-emerald-500/20 to-emerald-950/40',
      borderColor: 'border-emerald-700/40',
    },
    {
      id: 'stone',
      name: 'Stone',
      amount: resources.stone,
      rate: productionRates.stonePerHour,
      cap: storageCap.stone || 50000,
      icon: GameIcons.Stone,
      color: 'from-slate-500/20 to-slate-950/40',
      borderColor: 'border-slate-600/40',
    },
    {
      id: 'iron',
      name: 'Iron',
      amount: resources.iron,
      rate: productionRates.ironPerHour,
      cap: storageCap.iron || 50000,
      icon: GameIcons.Iron,
      color: 'from-blue-500/20 to-blue-950/40',
      borderColor: 'border-blue-700/40',
    },
    {
      id: 'gold',
      name: 'Gold',
      amount: resources.gold,
      rate: productionRates.goldPerHour,
      cap: storageCap.gold || 50000,
      icon: GameIcons.Gold,
      color: 'from-yellow-500/20 to-yellow-950/40',
      borderColor: 'border-yellow-700/40',
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/95 border-b border-amber-900/50 backdrop-blur-md px-2.5 py-1.5 text-amber-100 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
        {/* Top Row: Sovereign Profile, Military Power, Shield, Gem Treasury, Quick Switchers */}
        <div className="flex items-center justify-between gap-2">
          {/* Sovereign Profile Crest */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-amber-700 via-amber-900 to-slate-950 border border-amber-500/60 shadow-md">
              <GameIcons.Crown className="w-5 h-5 drop-shadow" />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded-sm border border-amber-900 leading-tight">
                Lv.{player?.playerLevel || 1}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-amber-200 tracking-tight truncate max-w-[120px] sm:max-w-none">
                  {player?.displayName || 'Lord Valerius'}
                </span>
                <span className="text-[9px] uppercase font-black bg-gradient-to-r from-amber-950 to-slate-900 text-amber-400 px-1.5 py-0.5 rounded border border-amber-700/50">
                  VIP {player?.vipLevel || 1}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                <GameIcons.Power className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-400">Power:</span>
                <span className="font-bold text-amber-400">{(player?.power || 12500).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Middle: Peace Shield Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-sky-800/40 text-[11px] shadow-sm">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Peace Shield:</span>
            <span className="font-mono text-sky-300 font-bold">{shieldTimeLeft || '24h Active'}</span>
          </div>

          {/* Right: Gem Vault & Action Controls */}
          <div className="flex items-center gap-1.5">
            {/* Gem Treasury Pill */}
            <button
              id="gems-wallet-btn"
              onClick={() => {
                soundEngine.playChime();
                onOpenStore();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 hover:from-slate-800 hover:to-slate-800 px-2.5 py-1.5 min-h-[40px] rounded-xl border border-emerald-500/50 text-emerald-300 font-mono text-xs font-black transition shadow-sm cursor-pointer"
              title="Treasury Gems - Open Store"
            >
              <GameIcons.Gems className="w-4 h-4 shrink-0" />
              <span>{player?.gems?.toLocaleString() ?? '1,500'}</span>
              <span className="bg-emerald-600 text-slate-950 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-black ml-0.5">
                +
              </span>
            </button>

            {/* World Map / Citadel Toggle Button */}
            {onToggleMap && (
              <button
                id="toggle-world-map-btn"
                onClick={() => {
                  soundEngine.playClick();
                  onToggleMap();
                }}
                className={`flex items-center justify-center gap-1.5 font-black text-xs px-2.5 py-1.5 min-h-[40px] rounded-xl shadow-md transition cursor-pointer active:scale-95 ${
                  currentTab === 'map'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/50'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-700/50'
                }`}
                title={currentTab === 'map' ? 'Return to Citadel' : 'Enter 3D Strategic World'}
              >
                {currentTab === 'map' ? (
                  <>
                    <GameIcons.Citadel className="w-4 h-4" />
                    <span className="hidden sm:inline">Citadel</span>
                  </>
                ) : (
                  <>
                    <GameIcons.WorldMap className="w-4 h-4" />
                    <span className="hidden sm:inline">World Map</span>
                  </>
                )}
              </button>
            )}

            {/* Direct Naval Voyage Header Button */}
            {onNavigateVoyage && (
              <button
                id="header-voyage-btn"
                onClick={() => {
                  soundEngine.playClick();
                  onNavigateVoyage();
                }}
                className={`flex items-center justify-center gap-1.5 font-black text-xs px-2.5 py-1.5 min-h-[40px] rounded-xl shadow-md transition cursor-pointer active:scale-95 ${
                  currentTab === 'voyage'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-950/50'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-700/50'
                }`}
                title="Enter 3D Naval Voyage"
              >
                <Anchor className="w-4 h-4" />
                <span className="hidden sm:inline">Voyage</span>
              </button>
            )}

            {/* Harvest Collect Button */}
            <button
              id="harvest-resources-btn"
              onClick={() => {
                soundEngine.playCoins();
                onCollect();
              }}
              disabled={isCollecting}
              className="flex items-center justify-center gap-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs px-2.5 py-1.5 min-h-[40px] rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              title="Collect generated kingdom resources"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Harvest</span>
            </button>

            {/* Audio Controls */}
            <div className="flex items-center bg-slate-900/80 border border-amber-900/40 rounded-xl p-0.5">
              <button
                id="toggle-sound-btn"
                onClick={toggleAudio}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-amber-300 transition cursor-pointer"
                title={soundActive ? 'Mute Audio (Master)' : 'Unmute Audio (Master)'}
              >
                {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
              {onOpenAudioSettings && (
                <button
                  id="open-audio-settings-btn"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenAudioSettings();
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-amber-400/80 hover:text-amber-300 transition cursor-pointer"
                  title="Audio & Soundtrack Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenControlsSettings && (
                <button
                  id="open-controls-header-btn"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenControlsSettings();
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-amber-400/80 hover:text-amber-300 transition cursor-pointer"
                  title="Adaptive Controls & Shortcuts (F2)"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sovereign Deck Settings */}
            <button
              id="open-admin-btn"
              onClick={() => {
                soundEngine.playClick();
                onOpenAdmin();
              }}
              className="min-h-[40px] px-2.5 flex items-center justify-center gap-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-amber-900/40 transition cursor-pointer text-xs font-bold"
              title="Kingdom Sovereign Administration Deck"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Admin</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: 5 Core Resources Bar with Capacity Indicators */}
        <div className="grid grid-cols-5 gap-1.5 text-[10px] sm:text-xs">
          {resourceItems.map((res) => {
            const Icon = res.icon;
            const pct = Math.min(100, Math.round((res.amount / res.cap) * 100));

            return (
              <div
                key={res.id}
                className={`relative flex flex-col justify-between bg-slate-900/90 px-1.5 py-1 rounded-xl border ${res.borderColor} overflow-hidden shadow-inner`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-black text-slate-100 truncate text-[11px] leading-tight">
                      {formatNumber(res.amount)}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono hidden sm:inline leading-tight">
                      +{formatNumber(res.rate)}/h
                    </span>
                  </div>
                </div>

                {/* Capacity Fill Gauge */}
                <div className="w-full bg-slate-950/80 h-1 rounded-full mt-0.5 overflow-hidden border border-slate-800/40">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
