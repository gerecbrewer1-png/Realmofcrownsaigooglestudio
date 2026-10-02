/**
 * Realm of Crowns - Naval Voyage & Pirate Sea Expedition View
 * Integrated 3D open-sea sailing, naval broadside combat, hostile pirate encounters,
 * nautical sea chart, boarding deck clashes, island haven trading, and salvage collection.
 * Ported and enhanced from Corsairs / Sea Dogs II traditions into the sovereign realm.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Anchor,
  Wind,
  Navigation,
  Map as MapIcon,
  Sparkles,
  Coins,
  Gem,
  Swords,
  ChevronLeft,
  Crosshair,
  Shield,
  Activity,
  Award,
  RefreshCw,
  Volume2,
  VolumeX,
  Flame,
  Skull,
  Store,
  Hammer,
  Users,
  CheckCircle2,
  X,
  Target,
  Package,
  Scroll,
  Camera,
  Sun,
  Moon,
  Sunset,
  Globe,
  Plus,
  Crown,
} from 'lucide-react';
import { NavalSeaCanvas, NavalCombatStatus, CameraPreset, TimeOfDay } from './world3d/NavalSeaCanvas';
import {
  NavalStatusGauges,
  NavalTargetEnemyWidget,
  NavalCombatLogTicker,
  NavalIslandAnchorPrompt,
} from './NavalVoyageHUDComponents';
import { PortHavenCanvas } from './world3d/PortHavenCanvas';
import { SHIP_CATALOG, ShipSpec } from './world3d/shipVisualService';
import {
  AMMO_TYPES,
  TRADE_GOODS,
  ISLAND_HAVENS,
  AmmoSpec,
  IslandHavenSpec,
  TradeGoodSpec,
  CAPTAIN_SKILLS,
  CaptainProfile,
  CaptainSkillId,
  createDefaultCaptain,
  getXpForCaptainLevel,
  NATIONS,
  NationId,
  NavalQuest,
  generateIslandQuests,
  calculateCommodityBuyPrice,
  calculateCommoditySellPrice,
} from '../data/navalCatalog';
import { soundEngine } from '../audio/soundEngine';
import { KingdomState, PlayerProfile } from '../types';

interface NavalVoyageViewProps {
  kingdom: KingdomState;
  player: PlayerProfile;
  onBackToRealm: () => void;
  onHarvestBooty?: (loot: { gold: number; gems: number; wood: number; relics: number }) => void;
}

interface BoardingTarget {
  id: string;
  name: string;
  hull: number;
  hullMax: number;
  crew: number;
  rank: number;
}

export const NavalVoyageView: React.FC<NavalVoyageViewProps> = ({
  kingdom,
  player,
  onBackToRealm,
  onHarvestBooty,
}) => {
  const [selectedShipKey, setSelectedShipKey] = useState<string>('galleon');
  const [currentAmmo, setCurrentAmmo] = useState<'balls' | 'knippels' | 'grapeshot' | 'bombs'>('balls');

  // Cargo Hold for plundered naval commodities
  const [cargoHold, setCargoHold] = useState<Record<string, number>>({
    rum: 16,
    spices: 6,
    silk: 8,
    tobacco: 12,
    silver: 3,
    planks: 30,
    gunpowder: 40,
  });

  const [status, setStatus] = useState<NavalCombatStatus>({
    playerHull: 2200,
    playerHullMax: 2200,
    playerSails: 450,
    playerSailsMax: 450,
    playerCrew: 250,
    speedKnots: 0,
    sailSetting: 0.5,
    headingDeg: 0,
    windFromDeg: 45,
    windStrength: 12,
    portReload: 1.0,
    starboardReload: 1.0,
    nearIsland: null,
    targetEnemy: null,
    canBoard: false,
    combatLog: ['Fair winds, Captain! All sails ready for open sea voyage.'],
    lootCollected: { gold: 0, gems: 0, wood: 0, relics: 0 },
  });

  // Modal States & Navigation Mode
  const [voyageMode, setVoyageMode] = useState<'sea' | 'port_exploration'>('sea');
  const [showHavenServicesModal, setShowHavenServicesModal] = useState<boolean>(false);
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [activeIslandHaven, setActiveIslandHaven] = useState<IslandHavenSpec | null>(null);
  const [islandTab, setIslandTab] = useState<'shipyard' | 'market' | 'tavern' | 'bounty'>('shipyard');

  // Atmosphere & Camera State
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('quarterdeck');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [dayCounter, setDayCounter] = useState<number>(1);

  // Sea Dogs Captain Profile & Skill Tree
  const [captain, setCaptain] = useState<CaptainProfile>(() =>
    createDefaultCaptain(player.displayName || 'Admiral Sovereign', 'england')
  );
  const [showCaptainModal, setShowCaptainModal] = useState<boolean>(false);

  // Governor & Tavern Quests
  const [activeQuests, setActiveQuests] = useState<NavalQuest[]>([
    {
      id: 'quest-start-rum',
      kind: 'deliver',
      title: 'Deliver 15 units of Vintage Rum to Redmond',
      fromIslandId: 'oxbay',
      toIslandId: 'redmond',
      deadlineDay: 14,
      rewardGold: 950,
      rewardXp: 180,
      goodsId: 'rum',
      goodsUnits: 15,
    },
    {
      id: 'quest-start-pirate',
      kind: 'hunt',
      title: 'Hunt down Pirate Sloop raiders near Tortuga',
      fromIslandId: 'isle-of-crowns',
      toIslandId: 'tortuga-haven',
      deadlineDay: 20,
      rewardGold: 1400,
      rewardXp: 250,
      targetShipClass: 'sloop',
    },
  ]);
  const [showQuestsModal, setShowQuestsModal] = useState<boolean>(false);
  const [showDiplomacyModal, setShowDiplomacyModal] = useState<boolean>(false);
  const [showPirateHavenModal, setShowPirateHavenModal] = useState<boolean>(false);

  // Boarding Action Modal State
  const [boardingTarget, setBoardingTarget] = useState<BoardingTarget | null>(null);
  const [boardingAllyCrew, setBoardingAllyCrew] = useState<number>(250);
  const [boardingEnemyCrew, setBoardingEnemyCrew] = useState<number>(100);
  const [boardingInitialEnemyCrew, setBoardingInitialEnemyCrew] = useState<number>(100);
  const [boardingRound, setBoardingRound] = useState<number>(1);
  const [boardingLog, setBoardingLog] = useState<string[]>([]);
  const [boardingOutcome, setBoardingOutcome] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');

  // Victory / Defeat Loot Modals
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);
  const [defeatModalOpen, setDefeatModalOpen] = useState<boolean>(false);
  const [victoryLoot, setVictoryLoot] = useState<{ gold: number; gems: number; wood: number; relics: number }>({
    gold: 0,
    gems: 0,
    wood: 0,
    relics: 0,
  });

  // Audio State
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const raiseCaptainSkill = (skillId: CaptainSkillId) => {
    if (captain.freeSkillPoints <= 0) return;
    if ((captain.skills[skillId] || 0) >= 10) return;
    soundEngine.playBuildingUpgradeComplete();
    setCaptain((prev) => ({
      ...prev,
      freeSkillPoints: prev.freeSkillPoints - 1,
      skills: {
        ...prev.skills,
        [skillId]: (prev.skills[skillId] || 1) + 1,
      },
    }));
  };

  const addCaptainXp = (amount: number) => {
    setCaptain((prev) => {
      let xp = prev.xp + amount;
      let level = prev.level;
      let freePts = prev.freeSkillPoints;
      let nextXp = getXpForCaptainLevel(level);

      while (xp >= nextXp) {
        xp -= nextXp;
        level += 1;
        freePts += 2;
        nextXp = getXpForCaptainLevel(level);
        soundEngine.playFanfare();
      }

      return {
        ...prev,
        xp,
        level,
        freeSkillPoints: freePts,
      };
    });
  };

  const [islandQuestsMap, setIslandQuestsMap] = useState<Record<string, NavalQuest[]>>({});

  // Optimization / Diagnostics HUD State (Voyage Renderer Phase 2.5)
  const [showDevStats, setShowDevStats] = useState<boolean>(false);
  const [devStats, setDevStats] = useState<{
    fps: number;
    frameTimeMs: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    activeShips: number;
    totalShips: number;
    lodCounts: { lod0: number; lod1: number; lod2: number; lod3: number; culled: number };
    simTiers: { sim0: number; sim1: number; sim2: number; sim3: number; sim4: number };
    aiUpdatesPerSec: number;
    spatialGridEntities: number;
    pirateStats: {
      expectedPirates: number;
      spawnedPirates: number;
      activePirates: number;
      visiblePirates: number;
      culledPirates: number;
      lod0Pirates: number;
      lod1Pirates: number;
      lod2Pirates: number;
      lod3Pirates: number;
    };
    npcStats: {
      spawned: number;
      active: number;
      visible: number;
      culled: number;
    };
    debugSwitches: {
      optiPixelEnabled: boolean;
      bvhEnabled: boolean;
      frustumCullingEnabled: boolean;
      occlusionCullingEnabled: boolean;
      shipLODEnabled: boolean;
      gpuInstancingEnabled: boolean;
      adaptiveQualityEnabled: boolean;
      forceLOD0OnAllPirates: boolean;
    };
    qualityTier: string;
    reflectionStatus: string;
    shadowQuality: string;
    rendererBackend: string;
  }>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    activeShips: 0,
    totalShips: 0,
    lodCounts: { lod0: 0, lod1: 0, lod2: 0, lod3: 0, culled: 0 },
    simTiers: { sim0: 0, sim1: 0, sim2: 0, sim3: 0, sim4: 0 },
    aiUpdatesPerSec: 0,
    spatialGridEntities: 0,
    pirateStats: {
      expectedPirates: 3,
      spawnedPirates: 3,
      activePirates: 3,
      visiblePirates: 3,
      culledPirates: 0,
      lod0Pirates: 1,
      lod1Pirates: 2,
      lod2Pirates: 0,
      lod3Pirates: 0,
    },
    npcStats: {
      spawned: 9,
      active: 9,
      visible: 9,
      culled: 0,
    },
    debugSwitches: {
      optiPixelEnabled: true,
      bvhEnabled: true,
      frustumCullingEnabled: false,
      occlusionCullingEnabled: true,
      shipLODEnabled: true,
      gpuInstancingEnabled: true,
      adaptiveQualityEnabled: false,
      forceLOD0OnAllPirates: false,
    },
    qualityTier: 'HIGH',
    reflectionStatus: 'ON (1/2 Frames)',
    shadowQuality: '1024 / 80m',
    rendererBackend: 'WebGL2',
    rendererOwnership: 'Three.js (Voyage Exclusive)',
    activeRenderLoops: 1,
    activeGPUContexts: 1,
    connectionState: 'Client-Authoritative Simulation (Phase 2.7 MMO Ready)',
    mmoDiag: {
      totalWorldEntities: 9,
      aoiCount: 9,
      prefetchCount: 0,
      netTiers: [1, 2, 6, 0, 0, 0],
      simTiers: [1, 2, 6, 0, 0],
      currentRegion: 'Archipelago_Central',
      currentZone: 'Sovereign_Haven',
      currentCell: '0,0',
      incomingBytesPerSec: 0,
      messagesPerSec: 0,
      transformUpdatesPerSec: 0,
    },
  });

  useEffect(() => {
    if (!showDevStats) return;
    const interval = setInterval(() => {
      const diag = (window as any).__NAVAL_DIAGNOSTICS__;
      if (diag) {
        setDevStats({
          fps: Math.round(diag.fps || 60),
          frameTimeMs: Number((diag.frameTimeMs || 16.6).toFixed(1)),
          drawCalls: diag.drawCalls || 0,
          triangles: diag.triangles || 0,
          geometries: diag.geometries || 0,
          textures: diag.textures || 0,
          activeShips: diag.activeShips || 0,
          totalShips: diag.totalShips || 0,
          lodCounts: diag.lodCounts || { lod0: 0, lod1: 0, lod2: 0, lod3: 0, culled: 0 },
          simTiers: diag.simTiers || { sim0: 0, sim1: 0, sim2: 0, sim3: 0, sim4: 0 },
          aiUpdatesPerSec: diag.aiUpdatesPerSec || 0,
          spatialGridEntities: diag.spatialGridEntities || 0,
          pirateStats: diag.pirateStats || {
            expectedPirates: 3,
            spawnedPirates: 3,
            activePirates: 3,
            visiblePirates: 3,
            culledPirates: 0,
            lod0Pirates: 1,
            lod1Pirates: 2,
            lod2Pirates: 0,
            lod3Pirates: 0,
          },
          npcStats: diag.npcStats || {
            spawned: 9,
            active: 9,
            visible: 9,
            culled: 0,
          },
          debugSwitches: diag.debugSwitches || (window as any).__VOYAGE_DEBUG_SWITCHES__ || {
            optiPixelEnabled: true,
            bvhEnabled: true,
            frustumCullingEnabled: false,
            occlusionCullingEnabled: true,
            shipLODEnabled: true,
            gpuInstancingEnabled: true,
            adaptiveQualityEnabled: false,
            forceLOD0OnAllPirates: false,
          },
          qualityTier: diag.qualityTier || 'HIGH',
          reflectionStatus: diag.reflectionStatus || 'ON (1/2 Frames)',
          shadowQuality: diag.shadowQuality || '1024 / 80m',
          rendererBackend: diag.rendererBackend || 'WebGL2',
          rendererOwnership: diag.rendererOwnership || 'Three.js (Voyage Exclusive)',
          activeRenderLoops: diag.activeRenderLoops || 1,
          activeGPUContexts: diag.activeGPUContexts || 1,
          connectionState: diag.connectionState || 'Client-Authoritative Simulation (Phase 2.7 MMO Ready)',
          netMetrics: diag.netMetrics || null,
          remoteEntitiesCount: diag.remoteEntitiesCount || 0,
          mmoDiag: diag.mmoDiag || {
            totalWorldEntities: 9,
            aoiCount: 9,
            prefetchCount: 0,
            netTiers: [1, 2, 6, 0, 0, 0],
            simTiers: [1, 2, 6, 0, 0],
            currentRegion: 'Archipelago_Central',
            currentZone: 'Sovereign_Haven',
            currentCell: '0,0',
            incomingBytesPerSec: 0,
            messagesPerSec: 0,
            transformUpdatesPerSec: 0,
          },
        });
      }
    }, 350);
    return () => clearInterval(interval);
  }, [showDevStats]);

  const getOrGenerateIslandQuests = (islandId: string) => {
    if (islandQuestsMap[islandId]) return islandQuestsMap[islandId];
    const generated = generateIslandQuests(islandId, dayCounter);
    setIslandQuestsMap((prev) => ({ ...prev, [islandId]: generated }));
    return generated;
  };

  const acceptQuest = (quest: NavalQuest) => {
    soundEngine.playFanfare();
    setActiveQuests((prev) => [...prev, quest]);
    setIslandQuestsMap((prev) => ({
      ...prev,
      [quest.fromIslandId]: (prev[quest.fromIslandId] || []).filter((q) => q.id !== quest.id),
    }));
  };

  const completeQuest = (questId: string) => {
    const q = activeQuests.find((item) => item.id === questId);
    if (!q) return;
    soundEngine.playFanfare();
    soundEngine.playLootReward();
    addCaptainXp(q.rewardXp);
    if (onHarvestBooty) {
      onHarvestBooty({ gold: q.rewardGold, gems: 10, wood: 50, relics: 1 });
    }
    setCaptain((prev) => ({ ...prev, gold: prev.gold + q.rewardGold }));
    setActiveQuests((prev) => prev.filter((item) => item.id !== questId));
  };

  const abandonQuest = (questId: string) => {
    soundEngine.playClick();
    setActiveQuests((prev) => prev.filter((item) => item.id !== questId));
  };

  const buyCommodity = (goodId: string, units: number, costPerUnit: number) => {
    const totalCost = units * costPerUnit;
    if (captain.gold < totalCost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playLootReward();
    setCaptain((prev) => ({ ...prev, gold: prev.gold - totalCost }));
    setCargoHold((prev) => ({
      ...prev,
      [goodId]: (prev[goodId] || 0) + units,
    }));
  };

  const sellCommodity = (goodId: string, units: number, pricePerUnit: number) => {
    const available = cargoHold[goodId] || 0;
    const toSell = Math.min(available, units);
    if (toSell <= 0) return;
    const totalGain = toSell * pricePerUnit;
    soundEngine.playLootReward();
    setCaptain((prev) => ({ ...prev, gold: prev.gold + totalGain }));
    if (onHarvestBooty) {
      onHarvestBooty({ gold: totalGain, gems: 0, wood: 0, relics: 0 });
    }
    setCargoHold((prev) => ({
      ...prev,
      [goodId]: Math.max(0, available - toSell),
    }));
  };

  const shipSpec: ShipSpec = SHIP_CATALOG[selectedShipKey] || SHIP_CATALOG.galleon;

  const handleStatusUpdate = useCallback((newStatus: NavalCombatStatus) => {
    setStatus(newStatus);
  }, []);

  const handleVictory = useCallback(
    (loot: { gold: number; gems: number; wood: number; relics: number }) => {
      setVictoryLoot(loot);
      setVictoryModalOpen(true);
      if (onHarvestBooty) onHarvestBooty(loot);
    },
    [onHarvestBooty]
  );

  const handleDefeat = useCallback(() => {
    setDefeatModalOpen(true);
  }, []);

  const fireBroadside = (side: 'port' | 'starboard') => {
    const key = side === 'port' ? 'KeyQ' : 'KeyE';
    window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
  };

  const setSailSetting = (val: number) => {
    const key = val === 0 ? 'Digit1' : val === 0.5 ? 'Digit2' : 'Digit3';
    window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
  };

  const turnRudder = (dir: 'left' | 'right') => {
    const key = dir === 'left' ? 'KeyA' : 'KeyD';
    window.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: key }));
    }, 250);
  };

  // Initiate Boarding Action
  const startBoarding = (enemy: BoardingTarget) => {
    soundEngine.playBattleVictory();
    soundEngine.playCutlassClash();
    setBoardingTarget(enemy);
    setBoardingAllyCrew(status.playerCrew);
    setBoardingEnemyCrew(enemy.crew || 80);
    setBoardingInitialEnemyCrew(enemy.crew || 80);
    setBoardingRound(1);
    setBoardingOutcome('ongoing');
    setBoardingLog([
      `Grappling hooks locked onto ${enemy.name}! Marines prepare to board!`,
      `Both crews collide on the smoke-filled bloodstained deck!`,
    ]);
  };

  // Perform Boarding Round Action
  const performBoardingAction = (action: 'cutlass' | 'pistol' | 'charge') => {
    if (boardingOutcome !== 'ongoing' || !boardingTarget) return;

    soundEngine.playCutlassClash();
    const newRound = boardingRound + 1;
    setBoardingRound(newRound);

    let allyLosses = 0;
    let enemyLosses = 0;
    let actionDesc = '';

    if (action === 'cutlass') {
      enemyLosses = Math.floor(14 + Math.random() * 16);
      allyLosses = Math.floor(4 + Math.random() * 8);
      actionDesc = `Cutlass melee clash! You cut down ${enemyLosses} corsairs, losing ${allyLosses} marines.`;
    } else if (action === 'pistol') {
      soundEngine.playCannonFire();
      enemyLosses = Math.floor(22 + Math.random() * 20);
      allyLosses = Math.floor(2 + Math.random() * 5);
      actionDesc = `Point-blank pistol volley! Lethal blast kills ${enemyLosses} enemy officers!`;
    } else {
      soundEngine.playMarch();
      enemyLosses = Math.floor(30 + Math.random() * 25);
      allyLosses = Math.floor(10 + Math.random() * 14);
      actionDesc = `Fierce Marines bayonet charge! Enemy line collapses, ${enemyLosses} enemy fallen!`;
    }

    const updatedAllyCrew = Math.max(0, boardingAllyCrew - allyLosses);
    const updatedEnemyCrew = Math.max(0, boardingEnemyCrew - enemyLosses);

    setBoardingAllyCrew(updatedAllyCrew);
    setBoardingEnemyCrew(updatedEnemyCrew);

    const updatedLog = [actionDesc, ...boardingLog].slice(0, 6);

    if (updatedEnemyCrew <= 0 || updatedEnemyCrew <= boardingInitialEnemyCrew * 0.25) {
      setBoardingOutcome('victory');
      soundEngine.playFanfare();
      updatedLog.unshift(`VICTORY! The enemy captain surrenders! ${boardingTarget.name} is captured!`);
      const prizeGold = 1800 + Math.floor(Math.random() * 1500);
      const prizeGems = 35 + Math.floor(Math.random() * 25);
      if (onHarvestBooty) {
        onHarvestBooty({ gold: prizeGold, gems: prizeGems, wood: 350, relics: 2 });
      }
      setCargoHold((prev) => ({
        ...prev,
        rum: (prev.rum || 0) + 8,
        silver: (prev.silver || 0) + 4,
        silk: (prev.silk || 0) + 6,
        spices: (prev.spices || 0) + 5,
      }));
    } else if (updatedAllyCrew <= 0) {
      setBoardingOutcome('defeat');
      soundEngine.playError();
      updatedLog.unshift(`DEFEAT! Boarding party repelled! We must withdraw!`);
    }

    setBoardingLog(updatedLog);
  };

  // Harbor Docking Handler
  const handleDockAtIsland = (islInfo: { id: string; name: string }) => {
    soundEngine.playLootReward();
    soundEngine.playNavalTrack('town_pirates');
    const matched = ISLAND_HAVENS.find((h) => h.id === islInfo.id) || {
      id: islInfo.id,
      name: islInfo.name,
      position: [0, 0] as [number, number],
      radius: 80,
      allegiance: 'Crown' as const,
      color: '#eab308',
      description: 'Prosperous colonial deep-water anchorage and naval repair dock.',
      facilities: ['Shipyard', 'Outpost Market', 'Tavern'],
      availableShips: ['sloop', 'brig', 'galleon', 'frigate'],
      tradeBonus: 'Standard trade rates',
    };
    setActiveIslandHaven(matched);
    setVoyageMode('port_exploration');
    setShowHavenServicesModal(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleNavalShortcuts = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        soundEngine.playClick();
        setShowDevStats((prev) => !prev);
      }
      if (e.code === 'KeyM') {
        soundEngine.playClick();
        setShowChartModal((prev) => !prev);
      }
      if (e.code === 'KeyR') {
        soundEngine.playClick();
        const order: Array<'balls' | 'knippels' | 'grapeshot' | 'bombs'> = ['balls', 'knippels', 'grapeshot', 'bombs'];
        setCurrentAmmo((prev) => {
          const idx = order.indexOf(prev);
          return order[(idx + 1) % order.length];
        });
      }
      if (e.code === 'KeyB' && status.canBoard && status.targetEnemy && !boardingTarget) {
        startBoarding(status.targetEnemy);
      }
      if (e.code === 'Escape') {
        setShowChartModal(false);
        if (showHavenServicesModal) {
          setShowHavenServicesModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleNavalShortcuts);
    return () => window.removeEventListener('keydown', handleNavalShortcuts);
  }, [status.canBoard, status.targetEnemy, boardingTarget]);

  const hullPct = Math.max(0, Math.min(100, Math.round((status.playerHull / status.playerHullMax) * 100)));
  const sailsPct = Math.max(0, Math.min(100, Math.round((status.playerSails / status.playerSailsMax) * 100)));

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 select-none overflow-hidden font-sans">
      {/* 3D WebGL Ocean Simulation Canvas OR Walkable 3D Port Haven Canvas */}
      {voyageMode === 'port_exploration' && activeIslandHaven ? (
        <div className="absolute inset-0 z-0">
          <PortHavenCanvas
            haven={activeIslandHaven}
            kingdom={kingdom}
            player={player}
            shipType={selectedShipKey}
            onSetSail={() => {
              soundEngine.playShipBell();
              setVoyageMode('sea');
              setActiveIslandHaven(null);
              setShowHavenServicesModal(false);
            }}
            onOpenStationModal={(station) => {
              setIslandTab(station === 'governor' ? 'bounty' : (station as any));
              setShowHavenServicesModal(true);
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0">
          <NavalSeaCanvas
            shipType={selectedShipKey}
            currentAmmo={currentAmmo}
            cameraPreset={cameraPreset}
            timeOfDay={timeOfDay}
            onStatusUpdate={handleStatusUpdate}
            onVictory={handleVictory}
            onDefeat={handleDefeat}
            onRequestReturn={onBackToRealm}
            onDockAtIsland={handleDockAtIsland}
            onBoardEnemy={(enemy) => startBoarding(enemy)}
          />
        </div>
      )}

      {/* Top Naval Command Bar (Only visible while sailing on open sea) */}
      {voyageMode === 'sea' && (
        <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent p-3 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 pointer-events-auto flex-wrap">
          {/* Back to Realm / Citadel & Ship Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                soundEngine.playClick();
                soundEngine.stopNavalTrack();
                onBackToRealm();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-bold tracking-wide shadow-lg shadow-black/40 backdrop-blur-md transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Citadel</span>
            </button>

            {/* Flagship Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs backdrop-blur-md">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedShipKey}
                onChange={(e) => {
                  soundEngine.playClick();
                  setSelectedShipKey(e.target.value);
                }}
                className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
              >
                {Object.values(SHIP_CATALOG).map((spec) => (
                  <option key={spec.id} value={spec.id} className="bg-slate-900 text-slate-200">
                    {spec.name} (Rank {spec.rank})
                  </option>
                ))}
              </select>
            </div>

            {/* Captain's Log & Skill Tree Button */}
            <button
              id="naval-btn-captain"
              onClick={() => {
                soundEngine.playClick();
                setShowCaptainModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-200 text-xs font-bold shadow-md cursor-pointer transition"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Captain Lv.{captain.level}</span>
              {captain.freeSkillPoints > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-bounce">
                  +{captain.freeSkillPoints}
                </span>
              )}
            </button>

            {/* Governor Quests Button */}
            <button
              id="naval-btn-quests"
              onClick={() => {
                soundEngine.playClick();
                setShowQuestsModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 text-indigo-200 text-xs font-bold shadow-md cursor-pointer transition"
            >
              <Scroll className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quests ({activeQuests.filter((q) => !q.isCompleted).length})</span>
            </button>

            {/* Nations & Diplomacy Button */}
            <button
              id="naval-btn-diplomacy"
              onClick={() => {
                soundEngine.playClick();
                setShowDiplomacyModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-bold shadow-md cursor-pointer transition"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diplomacy</span>
            </button>

            {/* Pirate Haven Fast Voyage & Black Market Expedition Button */}
            <button
              id="naval-btn-pirate-haven"
              onClick={() => {
                soundEngine.playClick();
                setShowPirateHavenModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-950/90 to-purple-950/90 hover:from-red-900 hover:to-purple-900 border border-purple-500/60 text-purple-200 text-xs font-bold shadow-md cursor-pointer transition"
            >
              <Skull className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Pirate Haven</span>
            </button>

            {/* Time of Day Toggle */}
            <div className="flex items-center bg-slate-900/80 border border-slate-700/60 rounded-lg p-0.5">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setTimeOfDay('day');
                }}
                className={`p-1 rounded text-xs transition cursor-pointer ${
                  timeOfDay === 'day' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Daylight"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setTimeOfDay('sunset');
                }}
                className={`p-1 rounded text-xs transition cursor-pointer ${
                  timeOfDay === 'sunset' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Golden Sunset"
              >
                <Sunset className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setTimeOfDay('night');
                }}
                className={`p-1 rounded text-xs transition cursor-pointer ${
                  timeOfDay === 'night' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Moonlit Night"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Camera Presets Selector */}
            <div className="hidden lg:flex items-center bg-slate-900/80 border border-slate-700/60 rounded-lg p-0.5 text-[10px] font-bold">
              <Camera className="w-3 h-3 text-slate-400 ml-1.5 mr-1" />
              {(['quarterdeck', 'helm', 'bow', 'broadside_port', 'broadside_starboard', 'lookout', 'free'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  id={`cam-preset-${preset}`}
                  onClick={() => {
                    soundEngine.playClick();
                    setCameraPreset(preset);
                  }}
                  className={`px-1.5 py-0.5 rounded capitalize transition cursor-pointer ${
                    cameraPreset === preset ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset === 'quarterdeck' ? 'Deck' : preset === 'helm' ? 'Helm' : preset === 'bow' ? 'Prow' : preset === 'broadside_port' ? 'Port' : preset === 'broadside_starboard' ? 'Stbd' : preset === 'lookout' ? 'Mast' : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Phase 2: Memoized Vitals Gauges to eliminate component re-render churn */}
          <NavalStatusGauges
            playerHull={status.playerHull}
            playerHullMax={status.playerHullMax}
            playerSails={status.playerSails}
            playerSailsMax={status.playerSailsMax}
            speedKnots={status.speedKnots}
            headingDeg={status.headingDeg}
            windStrength={status.windStrength}
            windFromDeg={status.windFromDeg}
            isAudioMuted={isAudioMuted}
            onToggleAudio={() => {
              if (isAudioMuted) {
                setIsAudioMuted(false);
                soundEngine.playNavalTrack('shanty');
              } else {
                setIsAudioMuted(true);
                soundEngine.stopNavalTrack();
              }
            }}
            onOpenSeaChart={() => {
              soundEngine.playClick();
              setShowChartModal(true);
            }}
            showDevStats={showDevStats}
            onToggleDevStats={() => {
              soundEngine.playClick();
              setShowDevStats((prev) => !prev);
            }}
          />
        </div>
      </header>
      )}

      {/* Open Sea Indicators & Widgets */}
      {voyageMode === 'sea' && (
        <>
          {/* Floating Renderer Diagnostics HUD */}
          {showDevStats && (
            <div
              id="naval-dev-stats-pill"
              className="absolute top-16 right-4 z-40 bg-slate-950/95 border border-emerald-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-200 pointer-events-auto min-w-[270px] select-none"
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
                <span className="text-[11px] font-black text-emerald-400 tracking-wider flex items-center gap-1.5 uppercase">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  Voyage Renderer Phase 2
                </span>
                <button
                  onClick={() => setShowDevStats(false)}
                  className="text-slate-500 hover:text-white px-1 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div>FPS: <span className="font-bold text-amber-300">{devStats.fps}</span></div>
                <div>Time: <span className="font-bold text-amber-300">{devStats.frameTimeMs} ms</span></div>
                <div>Draw Calls: <span className="font-bold text-sky-300">{devStats.drawCalls.toLocaleString()}</span></div>
                <div>Triangles: <span className="font-bold text-sky-300">{devStats.triangles.toLocaleString()}</span></div>
                <div>Geoms: <span className="text-slate-400">{devStats.geometries}</span></div>
                <div>Textures: <span className="text-slate-400">{devStats.textures}</span></div>
                <div className="col-span-2 pt-1 border-t border-slate-800/80 flex justify-between">
                  <span>Backend: <span className="font-bold text-emerald-400">{devStats.rendererBackend}</span></span>
                  <span>Tier: <span className="font-bold text-amber-300">{devStats.qualityTier}</span></span>
                </div>
                <div className="col-span-2 flex justify-between text-[10px] text-slate-400">
                  <span>Reflect: <span className="text-sky-300">{devStats.reflectionStatus}</span></span>
                  <span>Shadows: <span className="text-sky-300">{devStats.shadowQuality}</span></span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-800/80">
                  Active Ships: <span className="font-bold text-emerald-300">{devStats.activeShips}</span> / {devStats.totalShips}
                </div>
                <div className="col-span-2 text-[10px] space-y-0.5 text-slate-300 pt-0.5">
                  <div className="flex justify-between">
                    <span className="text-emerald-400">LOD0 (&lt;60m Hero Flagship):</span>
                    <span className="font-bold">{devStats.lodCounts.lod0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">LOD1 (60-160m Near):</span>
                    <span className="font-bold">{devStats.lodCounts.lod1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-400">LOD2 (160-350m Fleet):</span>
                    <span className="font-bold">{devStats.lodCounts.lod2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-400">LOD3 (&gt;350m Horizon):</span>
                    <span className="font-bold">{devStats.lodCounts.lod3}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Culled (&gt;750m / Offscreen):</span>
                    <span className="font-bold text-slate-400">{devStats.lodCounts.culled}</span>
                  </div>
                </div>
                {/* Step 5 & 20: Simulation LOD (SIM0 - SIM4) Diagnostics */}
                <div className="col-span-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div className="font-bold text-amber-300 mb-0.5 flex justify-between">
                    <span>⚡ SIMULATION LOD (PHASE 2.6):</span>
                    <span className="text-emerald-400 font-mono">
                      AI: {devStats.aiUpdatesPerSec} Hz | Grid: {devStats.spatialGridEntities}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] mt-1">
                    <div className="bg-rose-950/80 border border-rose-500/60 rounded py-0.5">
                      <div className="text-rose-300 font-bold">SIM0</div>
                      <div className="text-white font-black">{devStats.simTiers.sim0}</div>
                    </div>
                    <div className="bg-amber-950/80 border border-amber-500/60 rounded py-0.5">
                      <div className="text-amber-300 font-bold">SIM1</div>
                      <div className="text-white font-black">{devStats.simTiers.sim1}</div>
                    </div>
                    <div className="bg-sky-950/80 border border-sky-500/60 rounded py-0.5">
                      <div className="text-sky-300 font-bold">SIM2</div>
                      <div className="text-white font-black">{devStats.simTiers.sim2}</div>
                    </div>
                    <div className="bg-indigo-950/80 border border-indigo-500/60 rounded py-0.5">
                      <div className="text-indigo-300 font-bold">SIM3</div>
                      <div className="text-white font-black">{devStats.simTiers.sim3}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded py-0.5">
                      <div className="text-slate-400 font-bold">SIM4</div>
                      <div className="text-slate-200 font-black">{devStats.simTiers.sim4}</div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Pirate System Diagnostics */}
                <div className="col-span-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div className="font-bold text-red-400 mb-0.5 flex justify-between">
                    <span>🏴‍☠️ PIRATE SYSTEM:</span>
                    <span className="text-amber-300">
                      Exp: {devStats.pirateStats.expectedPirates} | Spwn: {devStats.pirateStats.spawnedPirates} | Act: {devStats.pirateStats.activePirates}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-emerald-400">Visible: {devStats.pirateStats.visiblePirates}</span>
                    <span className="text-rose-400">Culled: {devStats.pirateStats.culledPirates}</span>
                    <span>LOD 0:{devStats.pirateStats.lod0Pirates} 1:{devStats.pirateStats.lod1Pirates} 2:{devStats.pirateStats.lod2Pirates} 3:{devStats.pirateStats.lod3Pirates}</span>
                  </div>
                </div>

                {/* Step 3: NPC Ships Diagnostics */}
                <div className="col-span-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div className="font-bold text-cyan-400 mb-0.5 flex justify-between">
                    <span>⚓ ALL NPC SHIPS:</span>
                    <span className="text-slate-200">
                      Spwn: {devStats.npcStats.spawned} | Act: {devStats.npcStats.active} | Vis: {devStats.npcStats.visible} | Culled: {devStats.npcStats.culled}
                    </span>
                  </div>
                </div>

                {/* Step 34: MMO Spatial World Partition, AOI & Network LOD (Phase 2.7) */}
                <div className="col-span-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                  <div className="font-bold text-cyan-300 mb-0.5 flex justify-between">
                    <span>🌐 MMO AREA OF INTEREST (PHASE 2.7):</span>
                    <span className="text-emerald-400 font-mono">
                      AOI: {devStats.mmoDiag?.aoiCount ?? 0} / {devStats.mmoDiag?.totalWorldEntities ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[9px] mb-1">
                    <span>Zone: <span className="text-amber-200">{devStats.mmoDiag?.currentZone}</span></span>
                    <span>Cell: <span className="text-amber-200">[{devStats.mmoDiag?.currentCell}]</span></span>
                    <span>Prefetch: <span className="text-sky-300">{devStats.mmoDiag?.prefetchCount ?? 0}</span></span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9px]">
                    <div className="bg-rose-950/80 border border-rose-500/60 rounded py-0.5">
                      <div className="text-rose-300 font-bold text-[8px]">NET0</div>
                      <div className="text-white font-black">{devStats.mmoDiag?.netTiers?.[0] ?? 0}</div>
                    </div>
                    <div className="bg-amber-950/80 border border-amber-500/60 rounded py-0.5">
                      <div className="text-amber-300 font-bold text-[8px]">NET1</div>
                      <div className="text-white font-black">{devStats.mmoDiag?.netTiers?.[1] ?? 0}</div>
                    </div>
                    <div className="bg-sky-950/80 border border-sky-500/60 rounded py-0.5">
                      <div className="text-sky-300 font-bold text-[8px]">NET2</div>
                      <div className="text-white font-black">{devStats.mmoDiag?.netTiers?.[2] ?? 0}</div>
                    </div>
                    <div className="bg-indigo-950/80 border border-indigo-500/60 rounded py-0.5">
                      <div className="text-indigo-300 font-bold text-[8px]">NET3</div>
                      <div className="text-white font-black">{devStats.mmoDiag?.netTiers?.[3] ?? 0}</div>
                    </div>
                    <div className="bg-purple-950/80 border border-purple-500/60 rounded py-0.5">
                      <div className="text-purple-300 font-bold text-[8px]">NET4</div>
                      <div className="text-white font-black">{devStats.mmoDiag?.netTiers?.[4] ?? 0}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded py-0.5">
                      <div className="text-slate-400 font-bold text-[8px]">NET5</div>
                      <div className="text-slate-300 font-black">{devStats.mmoDiag?.netTiers?.[5] ?? 0}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[9px] pt-1">
                    <span>Bandwidth: <span className="text-emerald-300">{((devStats.mmoDiag?.incomingBytesPerSec || 0) / 1024).toFixed(1)} KB/s</span></span>
                    <span>Msgs: <span className="text-amber-300">{devStats.mmoDiag?.messagesPerSec || 0}/s</span></span>
                    <span>Sync: <span className="text-sky-300">{devStats.mmoDiag?.transformUpdatesPerSec || 0}/s</span></span>
                  </div>
                </div>

                {/* Step 35: Real-Time MMO WebSocket Transport (Phase 2.8) */}
                <div className="col-span-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                  <div className="font-bold text-emerald-400 mb-0.5 flex justify-between">
                    <span>⚡ REAL-TIME MMO TRANSPORT (PHASE 2.8):</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                      (devStats as any).netMetrics?.state === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                        : 'bg-amber-950 text-amber-300 border border-amber-500'
                    }`}>
                      {(devStats as any).netMetrics?.state || 'CONNECTED'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-[9px]">
                    <span>Ping: <span className="text-emerald-300 font-bold font-mono">{(devStats as any).netMetrics?.pingMs || 0} ms</span></span>
                    <span>Server Tick: <span className="text-amber-300 font-bold font-mono">#{(devStats as any).netMetrics?.serverTick || 0} (30Hz)</span></span>
                    <span>Remote Ships: <span className="text-sky-300 font-bold font-mono">{(devStats as any).netMetrics?.remoteEntitiesCount || 0}</span></span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[9px] pt-0.5">
                    <span>Traffic: <span className="text-slate-200">{Math.round(((devStats as any).netMetrics?.bytesReceived || 0) / 1024)} KB in / {Math.round(((devStats as any).netMetrics?.bytesSent || 0) / 1024)} KB out</span></span>
                    <span>Msgs: <span className="text-slate-200">{(devStats as any).netMetrics?.messagesReceived || 0} rx / {(devStats as any).netMetrics?.messagesSent || 0} tx</span></span>
                  </div>
                </div>

                {/* Step 4: Diagnostic Switches */}
                <div className="col-span-2 pt-1.5 border-t border-slate-800/80 text-[10px] space-y-1">
                  <div className="text-amber-400 font-bold tracking-wider">DIAGNOSTIC TOGGLES (STEP 4):</div>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <button
                      id="diag-toggle-lod"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('shipLODEnabled')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.shipLODEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-rose-950 text-rose-300 border-rose-500'
                      }`}
                    >
                      Ship LOD: {devStats.debugSwitches.shipLODEnabled ? 'ON' : 'OFF (LOD0)'}
                    </button>
                    <button
                      id="diag-toggle-force-lod0-pirates"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('forceLOD0OnAllPirates')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.forceLOD0OnAllPirates
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-slate-800 text-slate-400 border-slate-600'
                      }`}
                    >
                      Pirates LOD0: {devStats.debugSwitches.forceLOD0OnAllPirates ? 'FORCED' : 'AUTO'}
                    </button>
                    <button
                      id="diag-toggle-frustum"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('frustumCullingEnabled')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.frustumCullingEnabled
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-slate-800 text-slate-300 border-slate-600'
                      }`}
                    >
                      Manual Frustum: {devStats.debugSwitches.frustumCullingEnabled ? 'ON' : 'OFF (Native)'}
                    </button>
                    <button
                      id="diag-toggle-adaptive"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('adaptiveQualityEnabled')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.adaptiveQualityEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-600'
                      }`}
                    >
                      Adaptive Qual: {devStats.debugSwitches.adaptiveQualityEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      id="diag-toggle-optipixel"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('optiPixelEnabled')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.optiPixelEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-rose-950 text-rose-300 border-rose-500'
                      }`}
                    >
                      OptiPixel: {devStats.debugSwitches.optiPixelEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      id="diag-toggle-bvh"
                      onClick={() => (window as any).__TOGGLE_VOYAGE_DEBUG__?.('bvhEnabled')}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.debugSwitches.bvhEnabled
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : 'bg-rose-950 text-rose-300 border-rose-500'
                      }`}
                    >
                      BVH: {devStats.debugSwitches.bvhEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Mobile Tier Controls */}
                <div className="col-span-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
                  <span className="text-slate-400 font-sans font-bold">Tier:</span>
                  {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((t) => (
                    <button
                      key={t}
                      id={`quality-tier-${t.toLowerCase()}`}
                      onClick={() => (window as any).__SET_VOYAGE_QUALITY_TIER__?.(t)}
                      className={`px-1.5 py-0.5 rounded font-bold border transition cursor-pointer ${
                        devStats.qualityTier === t
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                    >
                      {t === 'MEDIUM' ? 'MED' : t}
                    </button>
                  ))}
                </div>

                {/* Scalable Fleet Benchmark Controls (Phase 2.6: 1, 10, 25, 50, 100, 250 ships) */}
                <div className="col-span-2 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div className="text-slate-400 font-sans font-bold mb-1">Large Fleet Benchmark:</div>
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 10, 25, 50, 100, 250].map((count) => (
                      <button
                        key={count}
                        id={`bench-${count}-ships`}
                        onClick={() => (window as any).__SET_NAVAL_SHIPS_COUNT__?.(count)}
                        className={`px-1 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer text-center ${
                          devStats.totalShips === count
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-600'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Sacred Pirate Code Truce Sanctuary Banner (Open Sea) */}
          {status.isTruceZone && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-5 py-2 rounded-full bg-purple-950/90 border-2 border-purple-500/80 text-purple-200 text-xs font-black tracking-widest uppercase shadow-2xl shadow-purple-950/80 backdrop-blur-md animate-pulse pointer-events-none">
              <Skull className="w-4 h-4 text-purple-400" />
              <span>⚔️ Sanctuary of Truce — Protected under the Pirate Code</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {/* Phase 2: Memoized Target Enemy & Boarding HUD Widget */}
          <NavalTargetEnemyWidget
            targetEnemy={status.targetEnemy}
            canBoard={status.canBoard}
            onStartBoarding={(enemy) => startBoarding(enemy)}
          />

          {/* Phase 2: Memoized Island Anchor Prompt */}
          <NavalIslandAnchorPrompt
            nearIsland={status.nearIsland}
            hasActiveHaven={Boolean(activeIslandHaven)}
            onDockAtIsland={handleDockAtIsland}
          />

          {/* Camera & Seamanship Controls Badge */}
          <div className="absolute top-20 right-4 z-20 pointer-events-none hidden md:block">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-md shadow-lg">
              🖱️ <span className="text-amber-300 font-semibold">Drag</span> to orbit 360° • ⚙️ <span className="text-amber-300 font-semibold">Wheel</span> to zoom
            </div>
          </div>

          {/* Phase 2: Memoized Real-time Combat & Voyage Log Ticker */}
          <NavalCombatLogTicker combatLog={status.combatLog} />

      {/* Tactical Broadside, Ammunition & Steering Controls Dock */}
      <footer className="absolute bottom-16 left-0 right-0 z-30 p-2 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
          {/* Port Broadside Cannon Button */}
          <button
            onClick={() => fireBroadside('port')}
            disabled={status.portReload < 1.0}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wider border shadow-xl transition cursor-pointer ${
              status.portReload >= 1.0
                ? 'bg-gradient-to-r from-red-900 to-amber-900 border-amber-500 text-amber-100 hover:brightness-110 active:scale-95'
                : 'bg-slate-900/80 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Crosshair className="w-5 h-5 text-amber-400" />
            <div>
              <div className="leading-none">Fire Port [Q]</div>
              <div className="text-[10px] text-amber-300/80 font-normal mt-0.5">
                {status.portReload >= 1.0 ? 'Ready' : `Reloading ${Math.round(status.portReload * 100)}%`}
              </div>
            </div>
          </button>

          {/* Center: Ammunition Selector + Rudder + Sail Setting */}
          <div className="flex flex-col items-center gap-2">
            {/* Active Ammo Types Toolbar */}
            <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-xl">
              <span className="text-[10px] text-slate-400 font-bold px-2">AMMO [R]:</span>
              {(Object.keys(AMMO_TYPES) as Array<'balls' | 'knippels' | 'grapeshot' | 'bombs'>).map((ammoKey) => {
                const spec: AmmoSpec = AMMO_TYPES[ammoKey];
                const isActive = currentAmmo === ammoKey;
                return (
                  <button
                    key={ammoKey}
                    onClick={() => {
                      soundEngine.playClick();
                      setCurrentAmmo(ammoKey);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>{spec.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Rudder & Sail Setting Controls */}
            <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-md">
              {/* Rudder Port */}
              <button
                onClick={() => turnRudder('left')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-600 transition cursor-pointer"
              >
                ◄ Port [A]
              </button>

              {/* Sail Setting Presets */}
              <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button
                  onClick={() => setSailSetting(0)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    status.sailSetting === 0
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Furl [1]
                </button>
                <button
                  onClick={() => setSailSetting(0.5)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    status.sailSetting === 0.5
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Battle [2]
                </button>
                <button
                  onClick={() => setSailSetting(1.0)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    status.sailSetting === 1.0
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full [3]
                </button>
              </div>

              {/* Rudder Starboard */}
              <button
                onClick={() => turnRudder('right')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-600 transition cursor-pointer"
              >
                Stbd [D] ►
              </button>
            </div>
          </div>

          {/* Starboard Broadside Cannon Button */}
          <button
            onClick={() => fireBroadside('starboard')}
            disabled={status.starboardReload < 1.0}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wider border shadow-xl transition cursor-pointer ${
              status.starboardReload >= 1.0
                ? 'bg-gradient-to-r from-amber-900 to-red-900 border-amber-500 text-amber-100 hover:brightness-110 active:scale-95'
                : 'bg-slate-900/80 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <div>
              <div className="leading-none">Fire STBD [E]</div>
              <div className="text-[10px] text-amber-300/80 font-normal mt-0.5">
                {status.starboardReload >= 1.0 ? 'Ready' : `Reloading ${Math.round(status.starboardReload * 100)}%`}
              </div>
            </div>
            <Crosshair className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </footer>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: BOARDING ACTION DECK COMBAT                      */}
      {/* ========================================================= */}
      {boardingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Swords className="w-7 h-7 text-red-400 animate-pulse" />
                <div>
                  <h3 className="text-xl font-black text-amber-300 tracking-wide">
                    BOARDING ACTION: {boardingTarget.name}
                  </h3>
                  <div className="text-xs text-slate-400">Round {boardingRound} • Clash of Cutlasses</div>
                </div>
              </div>
              <button
                onClick={() => setBoardingTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crew Health Meters */}
            <div className="grid grid-cols-2 gap-6 my-6">
              {/* Ally Marines */}
              <div className="bg-slate-950/80 border border-blue-500/50 rounded-xl p-4">
                <div className="flex justify-between items-center text-xs font-bold text-blue-300 mb-2">
                  <span>OUR BOARDING PARTY</span>
                  <span className="text-base font-black text-white">{boardingAllyCrew}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((boardingAllyCrew / status.playerCrew) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Enemy Pirates */}
              <div className="bg-slate-950/80 border border-red-500/50 rounded-xl p-4">
                <div className="flex justify-between items-center text-xs font-bold text-red-300 mb-2">
                  <span>ENEMY PIRATE CREW</span>
                  <span className="text-base font-black text-white">{boardingEnemyCrew}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((boardingEnemyCrew / boardingInitialEnemyCrew) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Combat Action Buttons */}
            {boardingOutcome === 'ongoing' ? (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => performBoardingAction('cutlass')}
                  className="p-3.5 rounded-xl bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 border border-amber-500 text-amber-100 font-bold text-xs flex flex-col items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Swords className="w-5 h-5 text-amber-300" />
                  <span>Cutlass Strike</span>
                  <span className="text-[10px] text-amber-300/70 font-normal">Moderate damage</span>
                </button>

                <button
                  onClick={() => performBoardingAction('pistol')}
                  className="p-3.5 rounded-xl bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border border-red-500 text-red-100 font-bold text-xs flex flex-col items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Crosshair className="w-5 h-5 text-red-300" />
                  <span>Pistol Volley</span>
                  <span className="text-[10px] text-red-300/70 font-normal">High burst strike</span>
                </button>

                <button
                  onClick={() => performBoardingAction('charge')}
                  className="p-3.5 rounded-xl bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 border border-blue-500 text-blue-100 font-bold text-xs flex flex-col items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Users className="w-5 h-5 text-blue-300" />
                  <span>Marines Charge</span>
                  <span className="text-[10px] text-blue-300/70 font-normal">All-out assault</span>
                </button>
              </div>
            ) : boardingOutcome === 'victory' ? (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-lg font-black text-emerald-300">PRIZE VESSEL CAPTURED!</h4>
                <p className="text-xs text-emerald-200 mt-1">
                  You plundered the captain's coffer and seized all cargo!
                </p>
                <button
                  onClick={() => setBoardingTarget(null)}
                  className="mt-3 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer"
                >
                  Claim Spoils & Return to Helm
                </button>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/80 text-center">
                <Skull className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <h4 className="text-lg font-black text-red-300">BOARDING FAILED</h4>
                <p className="text-xs text-red-200 mt-1">Our marines had to retreat to our ship.</p>
                <button
                  onClick={() => setBoardingTarget(null)}
                  className="mt-3 px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase cursor-pointer"
                >
                  Disengage & Cut Lines
                </button>
              </div>
            )}

            {/* Combat Action Log */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300">
              {boardingLog.map((log, idx) => (
                <div key={idx} className={idx === 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ISLAND HAVEN & HARBOR PORT SCREEN                */}
      {/* ========================================================= */}
      {activeIslandHaven && showHavenServicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Anchor className="w-8 h-8 text-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-amber-300 tracking-wide">{activeIslandHaven.name}</h3>
                    <span className="text-[10px] uppercase font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700/60">
                      {activeIslandHaven.allegiance}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{activeIslandHaven.description}</div>
                </div>
              </div>
              <button
                id="naval-btn-close-haven"
                onClick={() => setShowHavenServicesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Special Brethren's Vault Grotto Banner */}
            {activeIslandHaven.id === 'brethrens_vault' && (
              <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-purple-950/90 border-2 border-purple-500/80 rounded-xl p-3.5 mt-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏴‍☠️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-purple-200 uppercase tracking-wider">
                        The Brethren's Vault — Secret Black Market Grotto
                      </span>
                      <span className="text-[10px] bg-purple-900 text-purple-200 font-bold px-2 py-0.5 rounded-full border border-purple-400">
                        ⚔️ Sacred Truce Sanctuary
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Governed by the sacred Pirate Code. All weapons are held in sanctuary. Enjoy +50% payout on plundered contraband, forbidden eastern warships, and outlaw gunpowder munitions!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pirate Haven Banner for Tortuga / Smugglers / Serpent Reef */}
            {activeIslandHaven.nation === 'pirates' && activeIslandHaven.id !== 'brethrens_vault' && (
              <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/90 border-2 border-red-500/80 rounded-xl p-3.5 mt-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">☠️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-amber-200 uppercase tracking-wider">
                        {activeIslandHaven.name} — Brotherhood Freebooter Stronghold
                      </span>
                      <span className="text-[10px] bg-red-900 text-red-200 font-bold px-2 py-0.5 rounded-full border border-red-400">
                        🏴‍☠️ Pirate Haven
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {activeIslandHaven.description} {activeIslandHaven.tradeBonus}. All plunder is welcomed without crown tariffs!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs Toolbar */}
            <div className="flex items-center gap-2 border-b border-slate-800 pt-3 pb-2">
              <button
                id="naval-tab-shipyard"
                onClick={() => setIslandTab('shipyard')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  islandTab === 'shipyard'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>Shipyard & Fleet</span>
              </button>

              <button
                id="naval-tab-market"
                onClick={() => setIslandTab('market')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  islandTab === 'market'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Smuggler's Market</span>
              </button>

              <button
                id="naval-tab-tavern"
                onClick={() => setIslandTab('tavern')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  islandTab === 'tavern'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pirate Tavern</span>
              </button>

              <button
                id="naval-tab-bounty"
                onClick={() => setIslandTab('bounty')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  islandTab === 'bounty'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scroll className="w-4 h-4" />
                <span>Bounty Board</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4">
              {islandTab === 'shipyard' && (
                <div className="space-y-4">
                  {/* Hull Repair Card */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">Drydock Hull Repair & Careening</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Scrape barnacles and caulk oak seams to restore full hull durability.
                      </p>
                      <div className="text-xs text-slate-300 mt-2">
                        Current: <span className="text-amber-400 font-bold">{status.playerHull}</span> /{' '}
                        {status.playerHullMax} HP
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundEngine.playBuildingUpgradeComplete();
                        setStatus((prev) => ({ ...prev, playerHull: prev.playerHullMax }));
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                    >
                      Repair Hull (Free Port Courtesy)
                    </button>
                  </div>

                  {/* Available Ships for Purchase / Refit */}
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider pt-2">
                    Available Ship Classes at {activeIslandHaven.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeIslandHaven.availableShips.map((shipId) => {
                      const spec = SHIP_CATALOG[shipId] || SHIP_CATALOG.sloop;
                      const isEquipped = selectedShipKey === shipId;
                      return (
                        <div
                          key={shipId}
                          className={`bg-slate-950/70 border rounded-xl p-3 flex items-center justify-between ${
                            isEquipped ? 'border-amber-500' : 'border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-200">{spec.name}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                                Rank {spec.rank}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Hull: {spec.hullMax} • Cannons: {spec.cannons} • Speed: {spec.baseSpeed} kts
                            </div>
                          </div>
                          {isEquipped ? (
                            <span className="text-xs font-bold text-emerald-400 px-3 py-1 bg-emerald-950/60 border border-emerald-600/50 rounded-lg">
                              Flagship
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                soundEngine.playClick();
                                setSelectedShipKey(shipId);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                            >
                              Command
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {islandTab === 'market' && (
                <div className="space-y-5">
                  {/* Trade Header & Gold Bar */}
                  <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div>
                      <span className="text-amber-300 font-bold">Haven Trade Bonus: </span>
                      <span className="text-amber-100">{activeIslandHaven.tradeBonus}</span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">
                        Trade Skill Rank {captain.skills.trade}: +{(captain.skills.trade * 1.5).toFixed(1)}% selling price, -{(captain.skills.trade * 1.5).toFixed(1)}% purchase cost
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-amber-600/50">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-300">Captain's Coffer:</span>
                      <span className="text-sm font-black text-amber-300">{captain.gold.toLocaleString()} Gold</span>
                    </div>
                  </div>

                  {/* Section 1: Cargo in Hold to Sell */}
                  <div>
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cargo Hold (Sell to Merchant Quay)</span>
                    </h4>
                    {Object.keys(cargoHold).filter((k) => (cargoHold[k] || 0) > 0).length === 0 ? (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                        Your cargo hold is currently empty. Plunder enemy prize vessels or purchase commodities below!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.keys(cargoHold).map((goodKey) => {
                          const good = TRADE_GOODS[goodKey];
                          const qty = cargoHold[goodKey] || 0;
                          if (!good || qty <= 0) return null;
                          const unitPrice = calculateCommoditySellPrice(goodKey, activeIslandHaven, captain.skills.trade);
                          const totalSellValue = unitPrice * qty;

                          return (
                            <div
                              key={goodKey}
                              className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{good.icon}</span>
                                <div>
                                  <div className="font-bold text-xs text-slate-200">
                                    {good.name} (x{qty})
                                  </div>
                                  <div className="text-[10px] text-amber-300">
                                    Sell: {unitPrice} Gold/unit
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {qty > 5 && (
                                  <button
                                    onClick={() => sellCommodity(goodKey, 5, unitPrice)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    Sell 5
                                  </button>
                                )}
                                <button
                                  onClick={() => sellCommodity(goodKey, qty, unitPrice)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  <span>Sell All (+{totalSellValue})</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Colony Warehouse & Provisions (Buy) */}
                  <div>
                    <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Colony Warehouse & Provisions (Purchase Cargo)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.keys(TRADE_GOODS).map((goodKey) => {
                        const good = TRADE_GOODS[goodKey];
                        const unitBuyPrice = calculateCommodityBuyPrice(goodKey, activeIslandHaven, captain.skills.trade);
                        const costFive = unitBuyPrice * 5;
                        const isExport = activeIslandHaven.exports.includes(goodKey);
                        const isImport = activeIslandHaven.imports.includes(goodKey);

                        return (
                          <div
                            key={goodKey}
                            className={`bg-slate-950/80 border rounded-xl p-3 flex items-center justify-between ${
                              isExport ? 'border-emerald-700/60' : isImport ? 'border-amber-700/60' : 'border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{good.icon}</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-200">{good.name}</span>
                                  {isExport && (
                                    <span className="text-[9px] bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-600/50">
                                      Export Cheap
                                    </span>
                                  )}
                                  {isImport && (
                                    <span className="text-[9px] bg-amber-950 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-600/50">
                                      High Demand
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Price: <span className="text-cyan-300 font-bold">{unitBuyPrice} Gold</span> / unit • In Hold: {cargoHold[goodKey] || 0}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => buyCommodity(goodKey, 5, unitBuyPrice)}
                              disabled={captain.gold < costFive}
                              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                                captain.gold >= costFive
                                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-md'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Buy 5 ({costFive}g)</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {islandTab === 'tavern' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">
                        {activeIslandHaven.nation === 'pirates' ? '🏴‍☠️ The Jolly Roger Corsair Tavern' : 'The Salty Parrot Tavern'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {activeIslandHaven.nation === 'pirates'
                          ? 'Recruit reckless buccaneers, sea dogs, and cutthroat boarders ready to storm enemy decks for prize booty.'
                          : 'Recruit hard-bitten privateers and experienced gunners to replenish lost crew members.'}
                      </p>
                      <div className="text-xs text-slate-300 mt-2">
                        Current Crew: <span className="text-cyan-400 font-bold">{status.playerCrew}</span> /{' '}
                        {shipSpec.crewMax}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          soundEngine.playFanfare();
                          setStatus((prev) => ({ ...prev, playerCrew: shipSpec.crewMax }));
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                      >
                        Recruit Full Crew
                      </button>
                      {activeIslandHaven.nation === 'pirates' && (
                        <button
                          onClick={() => {
                            soundEngine.playCutlassClash();
                            soundEngine.playFanfare();
                            setStatus((prev) => ({
                              ...prev,
                              playerCrew: shipSpec.crewMax,
                              combatLog: ['⚔️ Hired Buccaneer Cutthroats! Crew morale is at maximum fever pitch!', ...prev.combatLog],
                            }));
                          }}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 text-white font-black text-[11px] uppercase tracking-wider cursor-pointer shadow-md"
                        >
                          ⚔️ Rally Pirate Cutthroats
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rumors & Sea Lore */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-amber-300 uppercase">Tavern Keeper Rumors</h5>
                    <p className="text-xs text-slate-300 mt-1 italic">
                      {activeIslandHaven.nation === 'pirates'
                        ? '"Aye Captain, word in Tortuga is that Spanish treasure galleons laden with silver bullion are navigating the windward channel south of Serpent Reef..."'
                        : '"Aye Captain, they say the Black Skull Corsair has been spotted prowling south of Serpent Reef, carrying Spanish silver chests from Havana..."'}
                    </p>
                  </div>
                </div>
              )}

              {islandTab === 'bounty' && (
                <div className="space-y-4">
                  {/* Quests Ready for Turn-in */}
                  {activeQuests.filter((q) => q.toIslandId === activeIslandHaven.id).length > 0 && (
                    <div className="bg-emerald-950/60 border-2 border-emerald-500/80 rounded-xl p-4">
                      <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                        <span>Commissions Ready for Delivery at {activeIslandHaven.name}!</span>
                      </h4>
                      <div className="space-y-2">
                        {activeQuests
                          .filter((q) => q.toIslandId === activeIslandHaven.id)
                          .map((q) => (
                            <div
                              key={q.id}
                              className="bg-slate-950/80 border border-emerald-700/60 rounded-lg p-3 flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-200">{q.title}</div>
                                <div className="text-[10px] text-emerald-400 mt-0.5">
                                  Reward: +{q.rewardGold} Gold • +{q.rewardXp} Captain XP
                                </div>
                              </div>
                              <button
                                onClick={() => completeQuest(q.id)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer shadow-lg"
                              >
                                Turn In & Collect Reward
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Available Island Commissions */}
                  <div>
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Scroll className="w-3.5 h-3.5 text-amber-400" />
                      <span>Governor & Admiralty Commissions Available</span>
                    </h4>
                    <div className="space-y-2.5">
                      {getOrGenerateIslandQuests(activeIslandHaven.id).map((quest) => {
                        const destHaven = ISLAND_HAVENS.find((h) => h.id === quest.toIslandId);
                        return (
                          <div
                            key={quest.id}
                            className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 flex items-center justify-between transition"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    quest.kind === 'hunt'
                                      ? 'bg-red-950 text-red-300 border border-red-700/60'
                                      : quest.kind === 'deliver'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                                      : 'bg-purple-950 text-purple-300 border border-purple-700/60'
                                  }`}
                                >
                                  {quest.kind}
                                </span>
                                <span className="text-xs font-bold text-slate-200">{quest.title}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                                <span>Destination: <span className="text-amber-300 font-semibold">{destHaven?.name || quest.toIslandId}</span></span>
                                <span>Reward: <span className="text-amber-300 font-bold">{quest.rewardGold} Gold</span> + <span className="text-cyan-300 font-bold">{quest.rewardXp} XP</span></span>
                              </div>
                            </div>

                            <button
                              onClick={() => acceptQuest(quest)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-md"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Accept Commission</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  soundEngine.stopNavalTrack();
                  setActiveIslandHaven(null);
                  onBackToRealm();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
              >
                Return to Sovereign Citadel
              </button>

              <button
                id="naval-btn-haven-set-sail"
                onClick={() => {
                  soundEngine.playShipBell();
                  soundEngine.playNavalTrack('shanty');
                  setActiveIslandHaven(null);
                  setVoyageMode('sea');
                  setShowHavenServicesModal(false);
                }}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-900/40"
              >
                Set Sail to Sea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: NAUTICAL SEA CHART MODAL                         */}
      {/* ========================================================= */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-300">Nautical Archipelago Chart</h3>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2D Compass Sea Chart Canvas Representation */}
            <div className="relative w-full h-80 bg-slate-950 rounded-xl mt-4 border border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Chart Grid Lines */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Compass Rose */}
              <Compass className="absolute top-4 right-4 w-12 h-12 text-amber-500/40 pointer-events-none" />

              {/* Island Havens */}
              {ISLAND_HAVENS.map((isl) => {
                const normX = 50 + (isl.position[0] / 1200) * 80;
                const normY = 50 + (isl.position[1] / 1200) * 80;
                return (
                  <div
                    key={isl.id}
                    id={`chart-island-${isl.id}`}
                    className="absolute flex flex-col items-center cursor-pointer group"
                    style={{ left: `${normX}%`, top: `${normY}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => {
                      handleDockAtIsland(isl);
                      setShowChartModal(false);
                    }}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg group-hover:scale-125 transition ${
                        isl.nation === 'pirates' ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-slate-950 animate-pulse' : ''
                      }`}
                      style={{ backgroundColor: `${isl.color}33`, borderColor: isl.color, borderWidth: 2 }}
                    >
                      {isl.nation === 'pirates' ? (
                        <Skull className="w-3.5 h-3.5 text-purple-300" />
                      ) : (
                        <Anchor className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold mt-1 whitespace-nowrap px-1 rounded ${
                      isl.nation === 'pirates' ? 'text-purple-300 bg-purple-950/90 border border-purple-600/60' : 'text-amber-200 bg-slate-950/80'
                    }`}>
                      {isl.name}
                    </span>
                  </div>
                );
              })}

              {/* Player Flagship Location Marker */}
              <div
                className="absolute flex flex-col items-center pointer-events-none"
                style={{
                  left: `50%`,
                  top: `50%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Navigation
                  className="w-8 h-8 text-amber-400 drop-shadow-md transition-transform"
                  style={{ transform: `rotate(${status.headingDeg}deg)` }}
                />
                <span className="text-[10px] font-black text-amber-300 mt-0.5 bg-amber-950/90 border border-amber-600/60 px-1.5 py-0.2 rounded">
                  Flagship ({status.speedKnots} kts)
                </span>
              </div>
            </div>

            {/* Quick-Dock Pirate Havens Bar */}
            <div className="mt-3 bg-slate-950/80 border border-purple-900/60 rounded-xl p-2.5">
              <div className="text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>Pirate Havens & Sanctuaries (Click to Fast-Voyage)</span>
                </div>
                <span className="text-[9px] text-purple-400 font-normal">Black Market Bonuses</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ISLAND_HAVENS.filter((h) => h.nation === 'pirates').map((haven) => (
                  <button
                    key={haven.id}
                    onClick={() => {
                      soundEngine.playShipBell();
                      handleDockAtIsland(haven);
                      setShowChartModal(false);
                    }}
                    className="p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/70 border border-purple-600/50 text-left transition cursor-pointer group"
                  >
                    <div className="font-bold text-[11px] text-purple-200 group-hover:text-amber-300 transition truncate">
                      {haven.name}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                      {haven.id === 'brethrens_vault' ? '⚔️ Black Market Cave' : haven.tradeBonus}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <div>
                Wind:{' '}
                <span className="text-sky-300 font-bold">
                  {status.windFromDeg}° at {status.windStrength} knots
                </span>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
              >
                Close Chart [M]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: VICTORY SPOILS MODAL                             */}
      {/* ========================================================= */}
      {victoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative text-slate-100">
            <Award className="w-16 h-16 text-emerald-400 mx-auto mb-3 animate-bounce" />
            <h3 className="text-2xl font-black text-emerald-300 uppercase tracking-wide">
              Naval Victory!
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Hostile corsair sunk! Sinking hull yielded rich maritime booty!
            </p>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Coins className="w-6 h-6 text-amber-400" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Gold Doubloons</div>
                  <div className="text-base font-black text-amber-300">+{victoryLoot.gold}</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Gem className="w-6 h-6 text-cyan-400" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Ocean Gems</div>
                  <div className="text-base font-black text-cyan-300">+{victoryLoot.gems}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setVictoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              Claim Spoils & Continue Voyage
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DEFEAT MODAL                                     */}
      {/* ========================================================= */}
      {defeatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative text-slate-100">
            <Skull className="w-16 h-16 text-red-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-2xl font-black text-red-400 uppercase tracking-wide">Shipwrecked!</h3>
            <p className="text-xs text-slate-300 mt-1">
              Your flagship was battered beneath the waves. Friendly fishing vessels rescued your crew.
            </p>

            <button
              onClick={() => {
                setDefeatModalOpen(false);
                soundEngine.stopNavalTrack();
                onBackToRealm();
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              Return to Sovereign Citadel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: CAPTAIN'S LOG & SEA DOGS SKILL TREE              */}
      {/* ========================================================= */}
      {showCaptainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-amber-300 tracking-wide">
                      Captain's Maritime Log & Skill Tree
                    </h3>
                    <span className="text-[11px] bg-amber-950 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-700/60">
                      Level {captain.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {captain.name} • Sailing under the colors of {NATIONS[captain.nation].name} {NATIONS[captain.nation].flagEmoji}
                  </div>
                </div>
              </div>
              <button
                id="naval-btn-close-captain"
                onClick={() => setShowCaptainModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Experience & Free Points Status Bar */}
            <div className="my-4 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>CAPTAIN EXPERIENCE (XP)</span>
                  <span className="text-cyan-400 font-mono">
                    {captain.xp} / {getXpForCaptainLevel(captain.level)} XP
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-amber-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((captain.xp / getXpForCaptainLevel(captain.level)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase leading-none">Unallocated Points</div>
                  <div className="text-xl font-black text-amber-300">{captain.freeSkillPoints} Pts</div>
                </div>
                {captain.freeSkillPoints > 0 && (
                  <span className="bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs px-2.5 py-1 rounded-lg font-bold animate-pulse">
                    Upgrades Available!
                  </span>
                )}
              </div>
            </div>

            {/* 10 Sea Dogs Captain Skills Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                {(Object.keys(CAPTAIN_SKILLS) as CaptainSkillId[]).map((skillId) => {
                  const spec = CAPTAIN_SKILLS[skillId];
                  const currentVal = captain.skills[skillId] || 1;
                  const canUpgrade = captain.freeSkillPoints > 0 && currentVal < 10;

                  return (
                    <div
                      key={skillId}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{spec.icon}</span>
                            <div>
                              <div className="font-bold text-sm text-slate-200">{spec.name}</div>
                              <div className="text-[10px] text-amber-300 font-semibold">{spec.bonusText}</div>
                            </div>
                          </div>

                          {/* Skill Level & Plus Button */}
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-amber-400 font-mono">
                              {currentVal}/10
                            </span>
                            <button
                              onClick={() => raiseCaptainSkill(skillId)}
                              disabled={!canUpgrade}
                              className={`w-7 h-7 rounded-lg font-black text-sm flex items-center justify-center transition shadow-md ${
                                canUpgrade
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                              title={canUpgrade ? 'Upgrade Skill' : 'No Points Available or Max Rank'}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-2">{spec.description}</p>
                      </div>

                      {/* Rank Indicator Dots */}
                      <div className="flex items-center gap-1 mt-3">
                        {Array.from({ length: 10 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-1.5 rounded-full transition-all ${
                              idx < currentVal
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Skills enhance ship seamanship, broadside salvo accuracy, boarding casualties, and commercial margins.
              </div>
              <button
                id="naval-btn-close-captain"
                onClick={() => setShowCaptainModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: GOVERNOR COMMISSIONS & ACTIVE QUESTS             */}
      {/* ========================================================= */}
      {showQuestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Scroll className="w-7 h-7 text-indigo-400" />
                <div>
                  <h3 className="text-xl font-black text-indigo-300 tracking-wide">
                    Colonial Admiralty Commissions & Quests
                  </h3>
                  <div className="text-xs text-slate-400">
                    Active Contracts ({activeQuests.length}) • Island Haven Deliveries & Bounties
                  </div>
                </div>
              </div>
              <button
                id="naval-btn-close-quests"
                onClick={() => setShowQuestsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quest List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {activeQuests.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center">
                  <Scroll className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-bold text-slate-300">No Active Naval Commissions</div>
                  <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Drop anchor at colonial ports (Oxbay, Redmond, Tortuga, etc.) and visit the Bounty Board or Governor's Palace to accept high-paying cargo deliveries and pirate hunting contracts!
                  </div>
                </div>
              ) : (
                activeQuests.map((quest) => {
                  const fromHaven = ISLAND_HAVENS.find((h) => h.id === quest.fromIslandId);
                  const toHaven = ISLAND_HAVENS.find((h) => h.id === quest.toIslandId);
                  const isAtDestination = activeIslandHaven && activeIslandHaven.id === quest.toIslandId;

                  return (
                    <div
                      key={quest.id}
                      className={`bg-slate-950/80 border rounded-xl p-4 transition ${
                        isAtDestination ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                quest.kind === 'hunt'
                                  ? 'bg-red-950 text-red-300 border border-red-700/60'
                                  : quest.kind === 'deliver'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                                  : 'bg-purple-950 text-purple-300 border border-purple-700/60'
                              }`}
                            >
                              {quest.kind}
                            </span>
                            <h4 className="text-sm font-bold text-slate-100">{quest.title}</h4>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                            <span>Origin: <span className="text-slate-300 font-semibold">{fromHaven?.name || quest.fromIslandId}</span></span>
                            <span>➔</span>
                            <span>Destination: <span className="text-amber-300 font-semibold">{toHaven?.name || quest.toIslandId}</span></span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-1">
                            <span>Reward: <span className="text-amber-300 font-bold">{quest.rewardGold} Gold</span></span>
                            <span>XP: <span className="text-cyan-300 font-bold">+{quest.rewardXp} XP</span></span>
                            <span>Deadline: <span className="text-slate-300">Day {quest.deadlineDay}</span></span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {isAtDestination ? (
                            <button
                              onClick={() => completeQuest(quest.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-900/50 animate-bounce"
                            >
                              Turn In & Claim Spoils
                            </button>
                          ) : (
                            <button
                              onClick={() => abandonQuest(quest.id)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 text-xs transition cursor-pointer border border-slate-700 hover:border-red-800"
                            >
                              Abandon
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Complete quests to earn gold, gems, and captain XP to rank up your maritime skills.
              </div>
              <button
                id="naval-btn-close-quests"
                onClick={() => setShowQuestsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Close Quests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 8: CARIBBEAN NATIONS & MARITIME DIPLOMACY LEDGER    */}
      {/* ========================================================= */}
      {showDiplomacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Globe className="w-7 h-7 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-black text-emerald-300 tracking-wide">
                    Caribbean Sovereign Nations & Diplomacy
                  </h3>
                  <div className="text-xs text-slate-400">
                    Diplomatic Standing • Letters of Marque • International Wars
                  </div>
                </div>
              </div>
              <button
                id="naval-btn-close-diplomacy"
                onClick={() => setShowDiplomacyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nations List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(Object.keys(NATIONS) as NationId[]).map((nationId) => {
                const spec = NATIONS[nationId];
                const rep = captain.reputation[nationId] ?? 0;
                const statusKind = rep >= 25 ? 'Allied' : rep <= -25 ? 'At War' : 'Neutral';
                const statusColor =
                  rep >= 25
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-600/50'
                    : rep <= -25
                    ? 'text-red-400 bg-red-950/60 border-red-600/50'
                    : 'text-amber-400 bg-amber-950/60 border-amber-600/50';

                return (
                  <div
                    key={nationId}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{spec.flagEmoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-100">{spec.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusColor}`}>
                              {statusKind}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{spec.description}</p>
                        </div>
                      </div>

                      {/* Default Wars / Alliances */}
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">Relations:</span>
                        {Object.entries(spec.defaultRelations).map(([otherId, rel]) => {
                          if (otherId === nationId) return null;
                          const otherSpec = NATIONS[otherId as NationId];
                          return (
                            <span
                              key={otherId}
                              className={`px-1.5 py-0.2 rounded font-mono ${
                                rel === -1
                                  ? 'text-red-400 bg-red-950/40'
                                  : rel === 1
                                  ? 'text-emerald-400 bg-emerald-950/40'
                                  : 'text-slate-400'
                              }`}
                            >
                              {otherSpec.flagEmoji} {rel === -1 ? 'War' : rel === 1 ? 'Peace' : 'Neutral'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Standing Score Bar */}
                    <div className="w-full md:w-44 bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                        <span>REPUTATION</span>
                        <span className={rep >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {rep > 0 ? `+${rep}` : rep}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                        <div
                          className={`h-full transition-all duration-300 ${
                            rep >= 25 ? 'bg-emerald-500' : rep <= -25 ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(5, Math.min(100, Math.round(((rep + 100) / 200) * 100)))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Attacking merchantmen flying national banners worsens standing; hunting pirate raiders boosts crown favors.
              </div>
              <button
                id="naval-btn-close-diplomacy"
                onClick={() => setShowDiplomacyModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase cursor-pointer shadow-lg"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: PIRATE HAVEN EXPEDITIONS & OUTLAW SANCTUARIES    */}
      {/* ========================================================= */}
      {showPirateHavenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/80 border-2 border-purple-500/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/60">
              <div className="flex items-center gap-3">
                <Skull className="w-8 h-8 text-purple-400 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-purple-200 tracking-wide uppercase">
                      Pirate Havens & Outlaw Sanctuaries
                    </h3>
                    <span className="text-[10px] bg-purple-900/90 text-purple-200 font-black px-2 py-0.5 rounded border border-purple-500/70">
                      Brotherhood of the Coast
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Fast-voyage to lawless archipelago strongholds. Plunder contraband, recruit cutthroats, and trade under Pirate Code protection.
                  </div>
                </div>
              </div>
              <button
                id="naval-btn-close-pirate-modal"
                onClick={() => setShowPirateHavenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Pirate Havens */}
            <div className="overflow-y-auto space-y-3.5 my-4 pr-1">
              {ISLAND_HAVENS.filter((h) => h.nation === 'pirates').map((haven) => {
                const isCaveHaven = haven.id === 'brethrens_vault';
                return (
                  <div
                    key={haven.id}
                    className={`rounded-xl p-4 border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isCaveHaven
                        ? 'bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-purple-500/80 shadow-lg shadow-purple-950/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-purple-600/60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{isCaveHaven ? '🏴‍☠️' : '☠️'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-base text-amber-200">{haven.name}</h4>
                            <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-700/60 font-bold">
                              Tier {haven.tier} Stronghold
                            </span>
                            {isCaveHaven && (
                              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-600/60 font-bold">
                                ⚔️ Sacred Truce
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{haven.description}</p>
                        </div>
                      </div>

                      {/* Perks & Trade Bonus */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-600/40 font-bold">
                          💰 {haven.tradeBonus}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700/60">
                          ⚓ Facilities: {haven.facilities.join(' • ')}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700/60">
                          🧭 Coords: [{haven.position[0]}, {haven.position[1]}]
                        </span>
                      </div>
                    </div>

                    <button
                      id={`btn-voyage-${haven.id}`}
                      onClick={() => {
                        soundEngine.playShipBell();
                        handleDockAtIsland(haven);
                        setShowPirateHavenModal(false);
                      }}
                      className="w-full md:w-auto whitespace-nowrap px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-950/60 cursor-pointer transition active:scale-95"
                    >
                      {isCaveHaven ? '⚓ Explore Sea Cavern [3D]' : '⚓ Drop Anchor & Explore [3D]'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-purple-900/60 flex items-center justify-between text-xs text-slate-400">
              <div>
                🏴‍☠️ <span className="text-purple-300 font-semibold">Pirate Code Sanctuary:</span> Weapons are held inside The Brethren's Vault. Enjoy full immunity from crown patrols while harbored.
              </div>
              <button
                onClick={() => setShowPirateHavenModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
              >
                Close Expeditions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
