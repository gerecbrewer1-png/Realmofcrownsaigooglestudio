/**
 * REALM OF CROWNS — Mobile Tactical Battle View
 * Houses the PlayCanvas 3D combat arena, Mobile Combat HUD, and Performance Overlay.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCanvasBattleCanvas } from '../game/playcanvas/PlayCanvasBattleCanvas';
import { PlayCanvasApp } from '../game/playcanvas/PlayCanvasApp';
import { MobileCombatHUD } from './ui/MobileCombatHUD';
import { PerformanceOverlay } from './ui/PerformanceOverlay';
import { FloatingCombatText } from './ui/FloatingCombatText';
import { TacticalRadar, RadarEntity } from './ui/TacticalRadar';
import { FormationType, TacticalOrder } from '../game/armies/armyTypes';
import { PerformanceMetrics, QualityPreset } from '../game/mobile/performanceMonitor';
import { RaidState, RaidRewards } from '../game/events/raidEventSystem';
import { getRelationshipTier } from '../game/npc/npcTypes';
import { LootReward } from '../game/loot/lootSystem';
import { controlPreferences } from '../game/input/controlPreferences';

interface TacticalViewProps {
  onRaidVictory?: (rewards: RaidRewards) => void;
  onOpenControlsSettings?: () => void;
  onOpenHelp?: () => void;
}

export const TacticalView: React.FC<TacticalViewProps> = ({
  onRaidVictory,
  onOpenControlsSettings,
  onOpenHelp,
}) => {
  const appRef = useRef<PlayCanvasApp | null>(null);
  const [victoryRewards, setVictoryRewards] = useState<RaidRewards | null>(null);

  // Radar & Clean Screen & Loot state
  const [cleanScreen, setCleanScreen] = useState(false);
  const [radarEntities, setRadarEntities] = useState<RadarEntity[]>([]);
  const [heroPosCoords, setHeroPosCoords] = useState({ x: 0, z: 8, rotationY: 0 });
  const [lootToasts, setLootToasts] = useState<Array<{ id: string; reward: LootReward; x: number; y: number; z: number; timestamp: number }>>([]);

  // Hero state
  const [heroState, setHeroState] = useState({
    name: 'Lord Arthurian',
    hp: 450,
    maxHp: 450,
    stamina: 100,
    maxStamina: 100,
    controlMode: 'player' as 'player' | 'ai'
  });

  // Squad orders
  const [currentOrder, setCurrentOrder] = useState<TacticalOrder>('follow');
  const [currentFormation, setCurrentFormation] = useState<FormationType>('line');

  // Living World: Time of day & Nearby NPC
  const [timeOfDayHours, setTimeOfDayHours] = useState<number>(11.5);
  const [nearbyNPC, setNearbyNPC] = useState<{
    name: string;
    occupation: string;
    relationshipScore: number;
    relationshipTier: string;
    speech: string;
  } | null>(null);

  // Raid event
  const [raidState, setRaidState] = useState<RaidState>('peace');
  const [raidStats, setRaidStats] = useState({
    wave: 0,
    totalWaves: 2,
    enemiesRemaining: 0
  });

  // Performance metrics
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    frameTimeMs: 16.6,
    resolutionScale: 1.0,
    preset: 'auto',
    activeEntities: 35,
    drawCalls: 22,
    isBatteryThrottling: false
  });

  // Training Arena Duel & Move Command state
  const [isMovePending, setIsMovePending] = useState(false);
  const [isDuelActive, setIsDuelActive] = useState(false);
  const [duelChallenger, setDuelChallenger] = useState<{
    name: string;
    health: number;
    maxHealth: number;
    difficulty: string;
  } | null>(null);

  const [commandFeedbackText, setCommandFeedbackText] = useState<string | null>(null);

  const onRaidVictoryRef = useRef(onRaidVictory);
  onRaidVictoryRef.current = onRaidVictory;
  const onOpenControlsSettingsRef = useRef(onOpenControlsSettings);
  onOpenControlsSettingsRef.current = onOpenControlsSettings;
  const onOpenHelpRef = useRef(onOpenHelp);
  onOpenHelpRef.current = onOpenHelp;

  // Subscribe to Clean Screen preferences
  useEffect(() => {
    setCleanScreen(controlPreferences.getPreferences().cleanScreenMode);
    const unsub = controlPreferences.subscribe((p) => {
      setCleanScreen(p.cleanScreenMode);
    });
    return unsub;
  }, []);

  const handleAppReady = useCallback((app: PlayCanvasApp) => {
    appRef.current = app;
    app.raidEventSystem.onVictory = (rewards) => {
      setVictoryRewards(rewards);
      onRaidVictoryRef.current?.(rewards);
    };
    app.onCommandFeedback = (text: string) => {
      setCommandFeedbackText(text);
      setTimeout(() => setCommandFeedbackText(null), 2200);
    };
    app.onLootToast = (reward, x, y, z) => {
      setLootToasts((prev) => [
        ...prev.slice(-5),
        {
          id: 'toast_' + Math.random().toString(36).slice(2),
          reward,
          x,
          y,
          z,
          timestamp: Date.now()
        }
      ]);
    };
    app.onOpenSettings = () => onOpenControlsSettingsRef.current?.();
    app.onOpenHelp = () => onOpenHelpRef.current?.();
  }, []);

  // Sync loop from PlayCanvas to React HUD (every 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const app = appRef.current;
      if (!app) return;

      const heroPos = app.heroController.getPosition();
      const profile = app.heroController.profile;
      const isPlayer = app.heroController.isPlayerControlled();

      setHeroState({
        name: profile.name,
        hp: heroPos.hp,
        maxHp: heroPos.maxHp,
        stamina: Math.round(heroPos.stamina),
        maxStamina: heroPos.maxStamina,
        controlMode: isPlayer ? 'player' : 'ai'
      });

      setHeroPosCoords({
        x: heroPos.x,
        z: heroPos.z,
        rotationY: heroPos.rotationY
      });
      setRadarEntities(app.getRadarEntities());

      setTimeOfDayHours(app.timeOfDayHours);
      setIsMovePending(app.isMoveCommandPending);
      setIsDuelActive(app.trainingArena.isActive);

      if (app.trainingArena.isActive && app.trainingArena.challenger) {
        setDuelChallenger({
          name: app.trainingArena.challenger.name,
          health: app.trainingArena.challenger.health,
          maxHealth: app.trainingArena.challenger.maxHealth,
          difficulty: app.trainingArena.difficulty
        });
      } else {
        setDuelChallenger(null);
      }

      const near = app.getNearbyNPC();
      if (near && near.speechBubbleText) {
        setNearbyNPC({
          name: near.name,
          occupation: near.occupation || 'Villager',
          relationshipScore: near.relationshipScore,
          relationshipTier: getRelationshipTier(near.relationshipScore),
          speech: near.speechBubbleText
        });
      } else {
        setNearbyNPC(null);
      }

      const rState = app.raidEventSystem.getState();
      const rStats = app.raidEventSystem.getStats();
      setRaidState(rState);
      setRaidStats({
        wave: rStats.wave,
        totalWaves: rStats.totalWaves,
        enemiesRemaining: rStats.enemiesRemaining
      });

      setPerfMetrics(app.performanceMonitor.getMetrics());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleRadarPing = useCallback((worldX: number, worldZ: number) => {
    if (!appRef.current) return;
    appRef.current.selectSquad(true);
    appRef.current.issueSquadMove(worldX, worldZ);
    appRef.current.onCommandFeedback?.(`TACTICAL DISPATCH: (${worldX.toFixed(0)}, ${worldZ.toFixed(0)})`);
  }, []);

  // Handlers
  const handleJoystickMove = useCallback((x: number, y: number) => {
    appRef.current?.setJoystickVector(x, y);
  }, []);

  const handleAttack = useCallback(() => {
    appRef.current?.triggerHeroAttack();
  }, []);

  const handleAbility = useCallback((abilityId: string) => {
    appRef.current?.triggerHeroAbility(abilityId);
  }, []);

  const handleToggleControlMode = useCallback(() => {
    if (appRef.current) {
      const mode = appRef.current.toggleControlMode();
      setHeroState(prev => ({ ...prev, controlMode: mode }));
    }
  }, []);

  const handleSelectOrder = useCallback((order: TacticalOrder) => {
    setCurrentOrder(order);
    appRef.current?.setSquadOrder(order);
  }, []);

  const handleSelectFormation = useCallback((formation: FormationType) => {
    setCurrentFormation(formation);
    appRef.current?.setSquadFormation(formation);
  }, []);

  const handleTriggerRaid = useCallback(() => {
    appRef.current?.triggerRaidEvent();
  }, []);

  const handleStartDuel = useCallback((difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT') => {
    appRef.current?.startTrainingDuel(difficulty);
    setIsDuelActive(true);
  }, []);

  const handleStopDuel = useCallback(() => {
    appRef.current?.stopTrainingDuel();
    setIsDuelActive(false);
    setDuelChallenger(null);
  }, []);

  const handleSelectPreset = useCallback((preset: QualityPreset) => {
    appRef.current?.performanceMonitor.setPreset(preset);
    appRef.current?.handleResize();
  }, []);

  return (
    <div className="relative w-full h-full bg-stone-950 overflow-hidden select-none">
      {/* 3D PlayCanvas Engine Canvas */}
      <PlayCanvasBattleCanvas
        onAppReady={handleAppReady}
        className="w-full h-full"
      />

      {/* 3D Screen-Projected Floating Combat Numbers & Loot Toasts */}
      <FloatingCombatText app={appRef.current} lootToasts={lootToasts} />

      {/* Real-time Medieval Tactical Radar Minimap */}
      {!cleanScreen && (
        <div className="absolute top-20 right-3 sm:right-6 z-40 pointer-events-auto">
          <TacticalRadar
            heroPos={heroPosCoords}
            entities={radarEntities}
            range={44}
            onPingLocation={handleRadarPing}
          />
        </div>
      )}

      {/* Mobile Performance HUD Overlay */}
      <PerformanceOverlay
        metrics={perfMetrics}
        onSelectPreset={handleSelectPreset}
      />

      {/* Mobile Touch Combat HUD */}
      <MobileCombatHUD
        heroName={heroState.name}
        heroHp={heroState.hp}
        heroMaxHp={heroState.maxHp}
        heroStamina={heroState.stamina}
        heroMaxStamina={heroState.maxStamina}
        controlMode={heroState.controlMode}
        onToggleControlMode={handleToggleControlMode}
        onJoystickMove={handleJoystickMove}
        onAttack={handleAttack}
        onAbility={handleAbility}
        currentOrder={currentOrder}
        currentFormation={currentFormation}
        onSelectOrder={handleSelectOrder}
        onSelectFormation={handleSelectFormation}
        raidState={raidState}
        raidStats={raidStats}
        onTriggerRaid={handleTriggerRaid}
        timeOfDayHours={timeOfDayHours}
        nearbyNPC={nearbyNPC}
        isMovePending={isMovePending}
        isDuelActive={isDuelActive}
        duelChallenger={duelChallenger}
        onStartDuel={handleStartDuel}
        onStopDuel={handleStopDuel}
        onOpenControlsSettings={onOpenControlsSettings}
        onOpenHelp={onOpenHelp}
        commandFeedbackText={commandFeedbackText}
      />

      {/* Victory Celebration & Loot Modal */}
      {victoryRewards && (
        <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-amber-950/90 to-stone-950 border-2 border-amber-500/80 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="text-3xl animate-bounce">⚔️</div>
            <h2 className="text-xl font-extrabold text-amber-300 tracking-wide uppercase">
              Citadel Defended!
            </h2>
            <p className="text-xs text-amber-100/80">
              The raiders have been repelled by Lord Arthurian and the Royal Vanguard. The villagers remember your valor!
            </p>

            <div className="grid grid-cols-2 gap-2 bg-stone-900/80 rounded-xl p-3 border border-amber-900/40 text-xs font-bold">
              <div className="flex items-center justify-between text-yellow-400">
                <span>Gold:</span>
                <span>+{victoryRewards.gold}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Food:</span>
                <span>+{victoryRewards.food}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Stone:</span>
                <span>+{victoryRewards.stone}</span>
              </div>
              <div className="flex items-center justify-between text-cyan-400">
                <span>Iron:</span>
                <span>+{victoryRewards.iron}</span>
              </div>
            </div>

            <button
              id="claim-spoils-btn"
              onClick={() => setVictoryRewards(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              Claim Spoils
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default TacticalView;
