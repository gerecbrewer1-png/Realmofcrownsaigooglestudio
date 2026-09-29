/**
 * Realm of Crowns - Mobile-First Strategic Bottom Navigation Dock
 * Heavy fantasy strategy dock with metallic beveled borders, jewel-toned notifications,
 * and high-contrast illuminated active indicators.
 */

import React from 'react';
import { Sparkles, Package, Award, Gem, Swords, Anchor } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { GameIcons } from './ui/GameIcons';

export type NavTabType = 'kingdom' | 'map' | 'voyage' | 'tactical' | 'quests' | 'inventory' | 'commander' | 'shop' | 'admin';

interface BottomNavProps {
  currentTab: NavTabType;
  onChangeTab: (tab: NavTabType) => void;
  unclaimedQuestsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  unclaimedQuestsCount,
}) => {
  interface TabItem {
    id: NavTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const tabs: TabItem[] = [
    { id: 'kingdom', label: 'Citadel', icon: GameIcons.Citadel },
    { id: 'map', label: 'World Map', icon: GameIcons.WorldMap },
    { id: 'voyage', label: 'Voyage', icon: Anchor },
    { id: 'tactical', label: 'Battle', icon: Swords },
    { id: 'quests', label: 'Quests', icon: Sparkles, badge: unclaimedQuestsCount },
    { id: 'inventory', label: 'Treasury', icon: Package },
    { id: 'commander', label: 'Hero', icon: Award },
    { id: 'shop', label: 'Vault', icon: Gem },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 border-t-2 border-amber-600/50 backdrop-blur-xl px-2 py-1 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => {
                soundEngine.playClick();
                onChangeTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[54px] min-h-[48px] cursor-pointer ${
                isActive
                  ? 'text-amber-300 bg-gradient-to-b from-amber-900/60 to-amber-950/40 border border-amber-500/50 shadow-lg shadow-amber-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow' : 'opacity-85'}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse border border-emerald-300">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight whitespace-nowrap font-bold ${
                  isActive ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Active illuminated top tab line */}
              {isActive && (
                <div className="absolute -top-[5px] w-6 h-0.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
