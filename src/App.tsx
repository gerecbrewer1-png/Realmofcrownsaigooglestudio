/**
 * Realm of Crowns - Main Application Entry Point
 * Coordinates authoritative game state, polling, audio synthesizer, and responsive game screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clientApi } from './api/clientApi';
import { initAuthSession } from './firebase/client';
import {
  PlayerProfile,
  KingdomState,
  QuestDefinition,
  QuestProgress,
  InventoryItem,
  Commander,
  BuildingInstance,
  BuildingDefinition,
  GameConfiguration,
  ConstructionTask,
  TransactionRecord,
  TroopDefinition,
} from './types';
import { TROOP_DEFINITIONS } from './server/services/militaryConfig';
import { TopHeader } from './components/TopHeader';
import { KingdomView } from './components/KingdomView';
import { WorldMapView } from './components/WorldMapView';
import { BuildingModal } from './components/BuildingModal';
import { TrainingModal } from './components/TrainingModal';
import { QuestModal } from './components/QuestModal';
import { InventoryModal } from './components/InventoryModal';
import { CommanderModal } from './components/CommanderModal';
import { ShopModal } from './components/ShopModal';
import { AdminModal } from './components/AdminModal';
import { StarterCharterModal } from './components/StarterCharterModal';
import { AudioSettingsModal } from './components/ui/AudioSettingsModal';
import { ControlsSettingsModal } from './components/ui/ControlsSettingsModal';
import { QuickHelpOverlay } from './components/ui/QuickHelpOverlay';
import { TacticalView } from './components/TacticalView';
import { NavalVoyageView } from './components/NavalVoyageView';
import { BottomNav, NavTabType } from './components/BottomNav';
import { soundEngine } from './audio/soundEngine';
import { shortcutManager } from './game/input/shortcutManager';
import { InputAction } from './game/input/inputTypes';

export default function App() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [kingdom, setKingdom] = useState<KingdomState | null>(null);
  const [quests, setQuests] = useState<(QuestDefinition & QuestProgress)[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [commander, setCommander] = useState<Commander | null>(null);
  const [commanders, setCommanders] = useState<Record<string, Commander>>({});
  const [config, setConfig] = useState<GameConfiguration | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, BuildingDefinition>>({});
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Modals & Navigation
  const [currentTab, setCurrentTab] = useState<NavTabType>(() => {
    if (typeof window !== 'undefined' && (window.location.hash.includes('voyage') || window.location.search.includes('voyage'))) {
      return 'voyage';
    }
    return 'kingdom';
  });
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInstance | null>(null);
  const [trainingBuilding, setTrainingBuilding] = useState<BuildingInstance | null>(null);
  const [troopDefs, setTroopDefs] = useState<Record<string, TroopDefinition>>(TROOP_DEFINITIONS);
  const [showStarterCharter, setShowStarterCharter] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window.location.hash.includes('voyage') || window.location.search.includes('voyage'))) {
      return false;
    }
    return false;
  });

  useEffect(() => {
    (window as any).__NAVIGATE_TO_VOYAGE__ = () => {
      setCurrentTab('voyage');
      setShowStarterCharter(false);
    };
  }, []);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [showControlsSettings, setShowControlsSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Centralized shortcut subscriptions for F1 (Help), F2 (Settings), and Esc (Cancel/Close)
  useEffect(() => {
    const unsubHelp = shortcutManager.onAction(InputAction.CONTROLS_HELP, () => {
      setShowHelp(prev => !prev);
    });
    const unsubSettings = shortcutManager.onAction(InputAction.OPEN_SETTINGS, () => {
      setShowControlsSettings(prev => !prev);
    });
    const unsubCancel = shortcutManager.onAction(InputAction.CANCEL, () => {
      setShowHelp(false);
      setShowControlsSettings(false);
    });
    return () => {
      unsubHelp();
      unsubSettings();
      unsubCancel();
    };
  }, []);

  // Dynamic soundtrack & environmental ambience switching
  useEffect(() => {
    if (currentTab === 'map') {
      soundEngine.playMusic('world');
      soundEngine.setAmbience('world_plains');
    } else {
      soundEngine.playMusic('citadel');
      soundEngine.setAmbience('citadel');
    }
  }, [currentTab]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // 1. Initialize Auth and Load authoritatively
  const loadAuthoritativeState = useCallback(async () => {
    try {
      const [profileRes, kingdomRes, questsRes, invRes, cmdRes, cfgRes, txRes, troopRes] = await Promise.all([
        clientApi.getProfile(),
        clientApi.getKingdom(),
        clientApi.getQuests(),
        clientApi.getInventory(),
        clientApi.getCommander(),
        clientApi.getConfig(),
        clientApi.getTransactions(),
        clientApi.getMilitaryTroops(),
      ]);

      setPlayer(profileRes.player);
      setKingdom(kingdomRes.kingdom);
      setQuests(questsRes.quests);
      setInventory(invRes.items);
      setCommander(cmdRes.commander);
      if (cmdRes.commanders) {
        setCommanders(cmdRes.commanders);
      }
      setConfig(cfgRes.config);
      setDefinitions(cfgRes.buildingDefinitions);
      setTransactions(txRes.transactions);
      if (troopRes?.definitions) {
        setTroopDefs(troopRes.definitions);
      }

      if (profileRes.isNew) {
        setShowStarterCharter(true);
      }
    } catch (err) {
      console.warn('Initial load notice:', err);
    }
  }, []);

  useEffect(() => {
    initAuthSession((user) => {
      clientApi.setUserId(user.uid);
      loadAuthoritativeState();
    });
    // Fallback load immediately
    loadAuthoritativeState();
  }, [loadAuthoritativeState]);

  // 2. Periodic sync for construction timers and resource ticks
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const kingdomRes = await clientApi.getKingdom();
        setKingdom(kingdomRes.kingdom);
        const questsRes = await clientApi.getQuests();
        setQuests(questsRes.quests);
      } catch {
        // quiet sync
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, []);

  // Action Handlers
  const handleUpgradeBuilding = async (buildingId: string) => {
    try {
      const res = await clientApi.upgradeBuilding(buildingId);
      if (res.success) {
        soundEngine.playConstructionStart();
        setKingdom(res.kingdom);
        // Refresh player profile
        const profRes = await clientApi.getProfile();
        setPlayer(profRes.player);
        const questsRes = await clientApi.getQuests();
        setQuests(questsRes.quests);
        showToast(`Construction initiated on ${res.task.buildingName}!`);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Upgrade failed.');
    }
  };

  const handleSpeedup = async (taskId: string, minutes: number, itemId?: string) => {
    try {
      const res = await clientApi.speedupBuilding(taskId, minutes, itemId);
      if (res.success) {
        setKingdom(res.kingdom);
        setInventory(res.inventory);
        if (res.completed) {
          showToast('Construction completed with speed-up!');
          soundEngine.playBuildingUpgradeComplete();
          const profRes = await clientApi.getProfile();
          setPlayer(profRes.player);
          const questsRes = await clientApi.getQuests();
          setQuests(questsRes.quests);
        } else {
          soundEngine.playHammer();
          showToast(`Applied ${minutes} minutes of speed-up!`);
        }
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Speedup failed.');
    }
  };

  const handleInstantComplete = async (taskId: string, gemCost: number) => {
    try {
      const res = await clientApi.instantCompleteBuilding(taskId, gemCost);
      if (res.success) {
        setKingdom(res.kingdom);
        setPlayer(res.player);
        showToast('Construction completed instantly with Gems!');
        soundEngine.playBuildingUpgradeComplete();
        const questsRes = await clientApi.getQuests();
        setQuests(questsRes.quests);
        const txRes = await clientApi.getTransactions();
        setTransactions(txRes.transactions);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Instant completion failed.');
    }
  };

  const handleCollectResources = async () => {
    setIsCollecting(true);
    try {
      const res = await clientApi.collectResources();
      if (res.success && kingdom) {
        soundEngine.playResourceGroupCollect();
        setKingdom({ ...kingdom, resources: res.resources });
        showToast('Resources harvested from economic districts!');
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Harvest failed.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    try {
      const res = await clientApi.claimQuest(questId);
      if (res.success) {
        soundEngine.playFanfare();
        setTimeout(() => soundEngine.playLootReward(), 200);
        setPlayer(res.player);
        setKingdom(res.kingdom);
        setQuests(res.quests);
        setInventory(res.inventory);
        showToast('Royal quest reward claimed!');
        const txRes = await clientApi.getTransactions();
        setTransactions(txRes.transactions);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Claim failed.');
    }
  };

  const handleUseItem = async (itemId: string, quantity = 1) => {
    try {
      const res = await clientApi.useItem(itemId, quantity);
      if (res.success) {
        soundEngine.playChime();
        setInventory(res.inventory);
        setKingdom(res.kingdom);
        setPlayer(res.player);
        showToast('Item successfully utilized!');
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Could not use item.');
    }
  };

  const handleAdminGrant = async (data: any) => {
    try {
      const res = await clientApi.adminGrant(data);
      if (res.success) {
        setPlayer(res.player);
        setKingdom(res.kingdom);
        showToast('Authoritative grant applied!');
        const txRes = await clientApi.getTransactions();
        setTransactions(txRes.transactions);
      }
    } catch (err: any) {
      showToast(err.message || 'Grant failed.');
    }
  };

  const handleSimulatePurchase = async (pack: GameConfiguration['storePacks'][0]) => {
    const totalGems = pack.gems + pack.bonusGems;
    await handleAdminGrant({ gems: totalGems });
    showToast(`Received ${totalGems.toLocaleString()} Gems from ${pack.name}!`);
  };

  const handleTrainTroops = async (buildingId: string, unitId: string, quantity: number) => {
    try {
      const res = await clientApi.trainTroops({ buildingId, unitId, quantity });
      if (res.success) {
        soundEngine.playBarracksTraining();
        setKingdom(res.kingdom);
        showToast(`Ordered training of ${quantity.toLocaleString()} troops!`);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Recruitment failed.');
      throw err;
    }
  };

  const handleSpeedupTraining = async (taskId: string, minutes: number, itemId?: string) => {
    try {
      const res = await clientApi.speedupTraining(taskId, minutes, itemId);
      if (res.success) {
        soundEngine.playBarracksTraining();
        setKingdom(res.kingdom);
        setInventory(res.inventory);
        showToast(res.completed ? 'Troop training finished!' : `Training boosted by ${minutes}m!`);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Speedup failed.');
      throw err;
    }
  };

  const handleInstantCompleteTraining = async (taskId: string) => {
    try {
      const res = await clientApi.instantCompleteTraining(taskId);
      if (res.success) {
        soundEngine.playBarracksTraining();
        setKingdom(res.kingdom);
        setPlayer(res.player);
        showToast(`Troop training finished instantly for ${res.gemCost} Gems!`);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Instant completion failed.');
      throw err;
    }
  };

  const handleHealTroops = async (unitId: string, quantity: number) => {
    try {
      const res = await clientApi.healWoundedTroops(unitId, quantity);
      if (res.success) {
        soundEngine.playChime();
        setKingdom(res.kingdom);
        showToast(`Citadel hospital treated ${quantity.toLocaleString()} troops!`);
      }
    } catch (err: any) {
      soundEngine.playError();
      showToast(err.message || 'Treatment failed.');
      throw err;
    }
  };

  const handleInstantHealAll = async () => {
    try {
      const res = await clientApi.instantHealAllWounded();
      if (res.success) {
        soundEngine.playChime();
        setKingdom(res.kingdom);
        setPlayer(res.player);
        showToast(`Healed all ${res.totalHealed.toLocaleString()} wounded soldiers for ${res.gemCost} Gems!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Instant treatment failed.');
      throw err;
    }
  };

  const handleRaidVictory = useCallback(async (rewards: { gold: number; food: number; stone: number; iron: number }) => {
    try {
      await clientApi.adminGrant({
        gold: rewards.gold,
        food: rewards.food,
        stone: rewards.stone,
        iron: rewards.iron,
      });
      await loadAuthoritativeState();
      showToast(`⚔️ Citadel Defended! +${rewards.gold} Gold, +${rewards.food} Food added to Treasury!`);
    } catch (e) {
      console.error('Failed to grant raid victory rewards', e);
    }
  }, [loadAuthoritativeState]);

  const unclaimedQuestsCount = quests.filter((q) => q.completed && !q.claimed).length;
  const activeChapterQuest = quests.find((q) => !q.claimed);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-top-2 border border-amber-300 max-w-[85vw] text-center pointer-events-none">
          {notification}
        </div>
      )}

      {/* Top Authoritative Header HUD (hidden in Tactical Battle and Naval Voyage for maximum 3D view) */}
      {currentTab !== 'tactical' && currentTab !== 'voyage' && (
        <TopHeader
          player={player}
          resources={kingdom?.resources || { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 }}
          productionRates={kingdom?.productionRates || { foodPerHour: 0, woodPerHour: 0, stonePerHour: 0, ironPerHour: 0, goldPerHour: 0 }}
          storageCap={kingdom?.storageCap || { food: 250000, wood: 250000, stone: 180000, iron: 120000, gold: 80000 }}
          currentTab={currentTab}
          onOpenStore={() => {
            soundEngine.playModalOpen();
            setCurrentTab('shop');
          }}
          onOpenAdmin={() => {
            soundEngine.playModalOpen();
            setCurrentTab('admin');
          }}
          onOpenAudioSettings={() => {
            soundEngine.playModalOpen();
            setShowAudioSettings(true);
          }}
          onOpenControlsSettings={() => {
            soundEngine.playModalOpen();
            setShowControlsSettings(true);
          }}
          onToggleMap={() => {
            soundEngine.playTabSwitch();
            setCurrentTab((tab) => (tab === 'map' ? 'kingdom' : 'map'));
            setSelectedBuilding(null);
            setTrainingBuilding(null);
          }}
          onNavigateVoyage={() => {
            soundEngine.playTabSwitch();
            setCurrentTab('voyage');
            setSelectedBuilding(null);
            setTrainingBuilding(null);
          }}
          onCollect={handleCollectResources}
          isCollecting={isCollecting}
        />
      )}

      {/* Main View: Kingdom View, Persistent World Map View, Tactical Battle View, or Naval Voyage */}
      {currentTab === 'tactical' ? (
        <main className="fixed inset-0 bottom-[54px] z-10 overflow-hidden bg-stone-950">
          <TacticalView
            onRaidVictory={handleRaidVictory}
            onOpenControlsSettings={() => setShowControlsSettings(true)}
            onOpenHelp={() => setShowHelp(true)}
          />
        </main>
      ) : currentTab === 'voyage' ? (
        kingdom && player ? (
          <main className="fixed inset-0 bottom-[54px] z-10 overflow-hidden bg-slate-950">
            <NavalVoyageView
              kingdom={kingdom}
              player={player}
              onBackToRealm={() => setCurrentTab('kingdom')}
              onHarvestBooty={(loot) => {
                showToast(`Naval Booty Harvested: +${loot.gold} Gold, +${loot.gems} Gems!`);
                loadAuthoritativeState();
              }}
            />
          </main>
        ) : (
          <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-amber-300 gap-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-sm tracking-wide">Preparing Royal Sovereign Voyage...</p>
          </div>
        )
      ) : currentTab === 'map' ? (
        kingdom && player && commander ? (
          <main className="flex-1 pb-20">
            <WorldMapView
              kingdom={kingdom}
              player={player}
              commander={commander}
              onRefreshKingdom={loadAuthoritativeState}
              onBackToKingdom={() => setCurrentTab('kingdom')}
              onNavigateToVoyage={() => setCurrentTab('voyage')}
            />
          </main>
        ) : (
          <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-amber-300 gap-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-sm tracking-wide">Unfurling Strategic World Map...</p>
          </div>
        )
      ) : (
        <main className="flex-1 pb-24">
          <KingdomView
            buildings={kingdom?.buildings || []}
            queue={kingdom?.constructionQueue || []}
            maxQueueSlots={kingdom?.maxQueueSlots || 2}
            definitions={definitions}
            commander={commander}
            castleLevel={kingdom?.castleLevel || 1}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onSpeedupTask={(task) => {
              const matchBuilding = kingdom?.buildings.find((b) => b.id === task.buildingId);
              if (matchBuilding) setSelectedBuilding(matchBuilding);
            }}
            onInstantComplete={(task) => {
              const matchBuilding = kingdom?.buildings.find((b) => b.id === task.buildingId);
              if (matchBuilding) setSelectedBuilding(matchBuilding);
            }}
            onOpenQuests={() => setCurrentTab('quests')}
            activeQuestTitle={activeChapterQuest?.title}
            onOpenTraining={(b) => setTrainingBuilding(b)}
            onCollectResources={handleCollectResources}
            onNavigateToWorld={() => setCurrentTab('map')}
            onNavigateToBattle={() => setCurrentTab('tactical')}
            onNavigateToVoyage={() => setCurrentTab('voyage')}
          />
        </main>
      )}

      {/* Mobile-First Navigation Dock */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={(tab) => {
          soundEngine.playTabSwitch();
          setCurrentTab(tab);
          setSelectedBuilding(null);
          setTrainingBuilding(null);
        }}
        unclaimedQuestsCount={unclaimedQuestsCount}
      />

      {/* Modals */}
      {selectedBuilding && definitions[selectedBuilding.type] && (
        <BuildingModal
          building={selectedBuilding}
          def={definitions[selectedBuilding.type]}
          allBuildings={kingdom?.buildings || []}
          castleLevel={kingdom?.castleLevel || 1}
          currentResources={kingdom?.resources || { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 }}
          activeTask={kingdom?.constructionQueue.find((t) => t.buildingId === selectedBuilding.id)}
          inventory={inventory}
          gemBalance={player?.gems || 0}
          onClose={() => setSelectedBuilding(null)}
          onStartUpgrade={handleUpgradeBuilding}
          onSpeedup={handleSpeedup}
          onInstant={handleInstantComplete}
          onOpenTraining={(b) => {
            setSelectedBuilding(null);
            setTrainingBuilding(b);
          }}
        />
      )}

      {trainingBuilding && player && kingdom && (
        <TrainingModal
          building={trainingBuilding}
          kingdom={kingdom}
          player={player}
          definitions={troopDefs}
          inventory={inventory}
          onClose={() => setTrainingBuilding(null)}
          onTrain={handleTrainTroops}
          onSpeedup={handleSpeedupTraining}
          onInstantComplete={handleInstantCompleteTraining}
          onHeal={handleHealTroops}
          onInstantHealAll={handleInstantHealAll}
        />
      )}

      {currentTab === 'quests' && (
        <QuestModal
          quests={quests}
          onClose={() => setCurrentTab('kingdom')}
          onClaim={handleClaimQuest}
        />
      )}

      {currentTab === 'inventory' && (
        <InventoryModal
          items={inventory}
          onClose={() => setCurrentTab('kingdom')}
          onUseItem={handleUseItem}
        />
      )}

      {currentTab === 'commander' && (
        <CommanderModal
          commander={commander}
          commanders={commanders}
          onClose={() => setCurrentTab('kingdom')}
          onCommanderUpdated={(updatedCmd, allCmds) => {
            setCommander(updatedCmd);
            setCommanders(allCmds);
          }}
        />
      )}

      {currentTab === 'shop' && (
        <ShopModal
          config={config}
          transactions={transactions}
          gemBalance={player?.gems || 0}
          onClose={() => setCurrentTab('kingdom')}
          onSimulatePurchase={handleSimulatePurchase}
        />
      )}

      {currentTab === 'admin' && (
        <AdminModal
          onClose={() => setCurrentTab('kingdom')}
          onGrant={handleAdminGrant}
        />
      )}

      {showStarterCharter && (
        <StarterCharterModal
          onClaim={() => {
            setShowStarterCharter(false);
            showToast('The Sovereign Charter has been established!');
          }}
        />
      )}

      {/* Acoustic & Audio Sanctuary Modal */}
      <AudioSettingsModal
        isOpen={showAudioSettings}
        onClose={() => {
          soundEngine.playModalClose();
          setShowAudioSettings(false);
        }}
      />

      {/* Adaptive Controls Settings Modal */}
      <ControlsSettingsModal
        isOpen={showControlsSettings}
        onClose={() => {
          soundEngine.playModalClose();
          setShowControlsSettings(false);
        }}
      />

      {/* Keyboard Quick Help Overlay (F1) */}
      <QuickHelpOverlay
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        onOpenSettings={() => {
          setShowHelp(false);
          setShowControlsSettings(true);
        }}
      />
    </div>
  );
}
