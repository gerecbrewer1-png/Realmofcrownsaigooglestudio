/**
 * REALM OF CROWNS — Mobile Tactical Combat HUD
 * Touch-optimized controls: virtual joystick, 6 tactical orders, 4 formations,
 * 3 hero abilities (Stomp, Rally, Shield), NPC proximity dialogue, and Time of Day tracker.
 */

import React, { useRef, useState, useEffect } from 'react';
import { VirtualJoystick } from '../../game/mobile/virtualJoystick';
import { FormationType, TacticalOrder } from '../../game/armies/armyTypes';
import { Shield, Swords, Zap, Users, Compass, Flame, Crosshair, AlertTriangle, ShieldAlert, Sun, Moon, Sunset, MessageSquare, Eye, Sliders, Keyboard } from 'lucide-react';
import { controlPreferences } from '../../game/input/controlPreferences';
import { ControlPreferences } from '../../game/input/inputTypes';

interface MobileCombatHUDProps {
  // Hero state
  heroName: string;
  heroHp: number;
  heroMaxHp: number;
  heroStamina: number;
  heroMaxStamina: number;
  controlMode: 'player' | 'ai';
  onToggleControlMode: () => void;

  // Actions
  onJoystickMove: (x: number, y: number) => void;
  onAttack: () => void;
  onAbility: (abilityId: string) => void;

  // Squad commands
  currentOrder: TacticalOrder;
  currentFormation: FormationType;
  onSelectOrder: (order: TacticalOrder) => void;
  onSelectFormation: (formation: FormationType) => void;

  // Raid event
  raidState: 'peace' | 'warning' | 'in_progress' | 'victory' | 'defeat';
  raidStats: {
    wave: number;
    totalWaves: number;
    enemiesRemaining: number;
  };
  onTriggerRaid: () => void;

  // Living World
  timeOfDayHours: number;
  nearbyNPC?: {
    name: string;
    occupation: string;
    relationshipScore: number;
    relationshipTier: string;
    speech: string;
  } | null;

  // Phase 3 Additions: Move Command & Training Arena
  isMovePending?: boolean;
  isDuelActive?: boolean;
  duelChallenger?: {
    name: string;
    health: number;
    maxHealth: number;
    difficulty: string;
  } | null;
  onStartDuel?: (difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT') => void;
  onStopDuel?: () => void;

  // Adaptive Input / Controls Integration
  onOpenControlsSettings?: () => void;
  onOpenHelp?: () => void;
  commandFeedbackText?: string | null;
}

export const MobileCombatHUD: React.FC<MobileCombatHUDProps> = ({
  heroName,
  heroHp,
  heroMaxHp,
  heroStamina,
  heroMaxStamina,
  controlMode,
  onToggleControlMode,
  onJoystickMove,
  onAttack,
  onAbility,
  currentOrder,
  currentFormation,
  onSelectOrder,
  onSelectFormation,
  raidState,
  raidStats,
  onTriggerRaid,
  timeOfDayHours,
  nearbyNPC,
  isMovePending = false,
  isDuelActive = false,
  duelChallenger = null,
  onStartDuel,
  onStopDuel,
  onOpenControlsSettings,
  onOpenHelp,
  commandFeedbackText = null,
}) => {
  const joystickRef = useRef<VirtualJoystick>(new VirtualJoystick({ baseRadius: 60, maxRadius: 60, deadzone: 0.12 }));
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });
  const touchAreaRef = useRef<HTMLDivElement | null>(null);
  const [showOrdersMenu, setShowOrdersMenu] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD' | 'EXPERT'>('NORMAL');

  // Control Preferences reactive subscription
  const [prefs, setPrefs] = useState<ControlPreferences>(controlPreferences.getPreferences());
  useEffect(() => {
    return controlPreferences.subscribe(p => setPrefs(p));
  }, []);

  const renderJoystick = controlPreferences.shouldRenderJoystick();
  const renderButtons = controlPreferences.shouldRenderActionButtons();
  const controlScale = prefs.controlSize === 'small' ? 0.85 : prefs.controlSize === 'large' ? 1.15 : 1.0;

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    joystickRef.current.handleTouchStart(touch.identifier, centerX, centerY);
    updateJoystickPosition(touch.clientX, touch.clientY, centerX, centerY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const rect = touchAreaRef.current?.getBoundingClientRect();
      if (!rect) continue;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      joystickRef.current.handleTouchMove(touch.identifier, touch.clientX, touch.clientY);
      updateJoystickPosition(touch.clientX, touch.clientY, centerX, centerY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    joystickRef.current.handleTouchEnd(touch.identifier);
    setJoystickThumb({ x: 0, y: 0, active: false });
    onJoystickMove(0, 0);
  };

  // Mouse fallback handlers for desktop / testing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setIsMouseDown(true);
    joystickRef.current.handleTouchStart(999, centerX, centerY);
    updateJoystickPosition(e.clientX, e.clientY, centerX, centerY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown) return;
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    joystickRef.current.handleTouchMove(999, e.clientX, e.clientY);
    updateJoystickPosition(e.clientX, e.clientY, centerX, centerY);
  };

  const handleMouseUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);
    joystickRef.current.handleTouchEnd(999);
    setJoystickThumb({ x: 0, y: 0, active: false });
    onJoystickMove(0, 0);
  };

  const updateJoystickPosition = (
    clientX: number,
    clientY: number,
    centerX: number,
    centerY: number
  ) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = 55;
    const clampedDist = Math.min(dist, maxR);

    const normX = dist > 0 ? (dx / dist) * clampedDist : 0;
    const normY = dist > 0 ? (dy / dist) * clampedDist : 0;

    setJoystickThumb({ x: normX, y: normY, active: true });

    const vec = joystickRef.current.getVector();
    onJoystickMove(vec.x, vec.y);
  };

  const hpPercent = Math.max(0, Math.min(100, (heroHp / heroMaxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (heroStamina / heroMaxStamina) * 100));

  // Time of Day formatting
  const formattedHour = Math.floor(timeOfDayHours);
  const formattedMinute = Math.floor((timeOfDayHours % 1) * 60);
  const timeString = `${formattedHour.toString().padStart(2, '0')}:${formattedMinute.toString().padStart(2, '0')}`;
  const isNight = timeOfDayHours >= 22.0 || timeOfDayHours < 6.0;
  const isEvening = timeOfDayHours >= 18.0 && timeOfDayHours < 22.0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      {/* --- TOP BAR: Hero Vitals, Time of Day & Raid Status --- */}
      <div className="flex justify-between items-start gap-3 pointer-events-auto">
        {/* Hero Vitals & Quick Controls */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-stone-950/85 backdrop-blur-md border border-amber-900/50 rounded-xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 sm:gap-3 w-44 sm:w-64">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500/50 flex items-center justify-center font-bold text-amber-200 shadow flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold">
                <span className="text-amber-200 truncate">{heroName}</span>
                <span className="text-emerald-400 font-mono text-[10px] sm:text-[11px]">{heroHp}/{heroMaxHp}</span>
              </div>
              {/* HP Bar */}
              <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-150"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              {/* Stamina Bar */}
              <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-150"
                  style={{ width: `${staminaPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick HUD Controls Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              id="clean-screen-btn"
              onClick={() => controlPreferences.toggleCleanScreen()}
              className={`px-2 py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold shadow flex items-center gap-1 active:scale-95 transition-all ${
                prefs.cleanScreenMode
                  ? 'bg-amber-600 border-amber-400 text-stone-950 font-black'
                  : 'bg-stone-950/85 border-stone-800 text-stone-300 hover:text-amber-300'
              }`}
              title="Toggle Clean Screen Mode (F10)"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span>{prefs.cleanScreenMode ? '◉ Controls Hidden' : '◉ Controls'}</span>
              <span className="text-[9px] text-stone-400 font-mono hidden sm:inline">(F10)</span>
            </button>

            <button
              id="open-controls-settings-btn"
              onClick={onOpenControlsSettings}
              className="px-2 py-1 bg-stone-950/85 hover:bg-stone-900 border border-stone-800 hover:border-amber-600/60 rounded-lg text-stone-300 hover:text-amber-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow transition-all active:scale-95"
              title="Open Controls Settings (F2)"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Settings</span>
              <span className="text-[9px] text-stone-400 font-mono">(F2)</span>
            </button>

            <button
              id="open-controls-help-btn"
              onClick={onOpenHelp}
              className="px-2 py-1 bg-stone-950/85 hover:bg-stone-900 border border-stone-800 hover:border-amber-600/60 rounded-lg text-stone-300 hover:text-amber-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow transition-all active:scale-95"
              title="Keyboard Reference (F1)"
            >
              <Keyboard className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Help</span>
              <span className="text-[9px] text-stone-400 font-mono">(F1)</span>
            </button>
          </div>
        </div>

        {/* Time of Day & Raid Event Status */}
        <div className="flex flex-col items-end gap-1.5">
          {/* Time of Day Clock */}
          <div className="bg-stone-950/85 backdrop-blur-md border border-stone-800 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-mono font-bold text-amber-300 shadow">
            {isNight ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : isEvening ? (
              <Sunset className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
            )}
            <span>{timeString}</span>
            <span className="text-[10px] text-stone-400 font-sans uppercase">
              {isNight ? 'Night' : isEvening ? 'Evening' : timeOfDayHours < 9 ? 'Morning' : 'Day'}
            </span>
          </div>

          {/* Raid Event Banner / Horn Trigger & Duel Arena Button */}
          <div className="flex items-center gap-2">
            {!isDuelActive && (
              <button
                id="hero-duel-btn"
                onClick={() => setShowArenaModal(true)}
                className="bg-gradient-to-r from-amber-700/90 to-yellow-800/90 hover:from-amber-600 hover:to-yellow-700 text-amber-100 border border-amber-500/60 px-2.5 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                <Swords className="w-3.5 h-3.5 text-amber-300" />
                Duel Arena (1v1)
              </button>
            )}

            {isDuelActive && (
              <button
                onClick={onStopDuel}
                className="bg-red-800 hover:bg-red-700 text-white border border-red-500 px-2.5 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                Withdraw Duel
              </button>
            )}

            {raidState === 'peace' ? (
              <button
                id="sound-raid-btn"
                onClick={onTriggerRaid}
                className="bg-gradient-to-r from-red-900/90 to-amber-900/90 hover:from-red-800 hover:to-amber-800 text-amber-100 border border-red-600/50 px-3.5 py-1.5 rounded-lg shadow-lg font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
                Sound Raid Horn
              </button>
            ) : (
              <div className="bg-red-950/90 border border-red-600/80 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 animate-pulse text-xs">
                <Flame className="w-5 h-5 text-rose-400 animate-bounce" />
                <div>
                  <div className="font-bold text-red-200">
                    {raidState === 'warning' && 'Scout Horn: Raiders Spotted!'}
                    {raidState === 'in_progress' && `Wave ${raidStats.wave}/${raidStats.totalWaves}: Defend Citadel!`}
                    {raidState === 'victory' && 'Citadel Victorious! Raiders Repelled!'}
                  </div>
                  {raidState === 'in_progress' && (
                    <div className="text-[10px] text-red-300 font-mono">
                      Hostiles Remaining: {raidStats.enemiesRemaining}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direct Hero Control / Autonomous AI Toggle */}
          <button
            onClick={onToggleControlMode}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-lg flex items-center gap-1.5 active:scale-95 transition-all ${
              controlMode === 'player'
                ? 'bg-amber-600/90 border-amber-400 text-stone-950 font-extrabold'
                : 'bg-stone-900/90 border-stone-700 text-amber-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {controlMode === 'player' ? 'Player Control (WASD/Touch)' : 'Autonomous AI Active'}
          </button>
        </div>
      </div>

      {/* --- DUEL ARENA ACTIVE STATUS BANNER --- */}
      {isDuelActive && duelChallenger && (
        <div className="self-center pointer-events-auto bg-stone-950/90 border-2 border-amber-500/80 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-3 animate-in fade-in">
          <div className="w-8 h-8 rounded-lg bg-red-900/80 border border-red-500 flex items-center justify-center font-bold text-red-200">
            ⚔️
          </div>
          <div className="space-y-1 min-w-[140px]">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-amber-300">{duelChallenger.name}</span>
              <span className="text-red-400 font-mono text-[10px]">{duelChallenger.difficulty}</span>
            </div>
            <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden border border-stone-800">
              <div
                className="h-full bg-red-500 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (duelChallenger.health / duelChallenger.maxHealth) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- PROXIMITY NPC DIALOGUE & REPUTATION CARD --- */}
      {nearbyNPC && (
        <div className="self-center pointer-events-auto bg-stone-950/90 backdrop-blur-md border border-amber-600/60 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 max-w-sm w-full animate-in fade-in slide-in-from-top-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500/50 flex items-center justify-center font-bold text-amber-200 shadow flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200 truncate">{nearbyNPC.name}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-400">
                {nearbyNPC.relationshipTier} ({nearbyNPC.relationshipScore > 0 ? `+${nearbyNPC.relationshipScore}` : nearbyNPC.relationshipScore})
              </span>
            </div>
            <p className="text-[11px] text-stone-300 italic truncate mt-0.5">
              "{nearbyNPC.speech}"
            </p>
          </div>
        </div>
      )}

      {/* --- MIDDLE: Command Feedback & Tactical Order / Formation Command Dock --- */}
      <div className="self-center pointer-events-auto flex flex-col items-center">
        {/* Floating Command Mode Feedback Badge */}
        {commandFeedbackText && (
          <div className="mb-2 px-4 py-1.5 bg-stone-950/95 border-2 border-amber-500 rounded-full shadow-2xl text-amber-300 font-black text-xs tracking-wider uppercase animate-in fade-in zoom-in-95 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{commandFeedbackText}</span>
          </div>
        )}

        {/* Move Command Banner Indicator */}
        {(isMovePending || currentOrder === 'move') && (
          <div className="mb-2 px-3.5 py-1.5 bg-amber-500 text-stone-950 font-black text-[11px] rounded-full shadow-2xl animate-pulse flex items-center gap-1.5 border border-amber-300">
            <span>📍 TAP BATTLEFIELD TO MARCH SQUAD (OR RIGHT-CLICK)</span>
          </div>
        )}

        {!prefs.cleanScreenMode && (
          <div className="bg-stone-950/85 backdrop-blur-md border border-amber-900/40 rounded-xl px-2.5 py-1.5 shadow-2xl flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setShowOrdersMenu(!showOrdersMenu)}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded text-xs font-bold flex items-center gap-1 border border-stone-800"
            >
              <Users className="w-3.5 h-3.5" />
              Order: <span className="uppercase text-amber-400">{currentOrder}</span>
            </button>

            {(['follow', 'move', 'hold', 'stop', 'attack', 'defend', 'charge', 'retreat'] as TacticalOrder[]).map((ord) => (
              <button
                key={ord}
                onClick={() => onSelectOrder(ord)}
                className={`px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase transition-all ${
                  currentOrder === ord
                    ? 'bg-amber-600 text-stone-950 font-extrabold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {ord}
              </button>
            ))}
          </div>
        )}

        {/* Formations Dropdown if toggled */}
        {showOrdersMenu && (
          <div className="mt-1.5 p-2 bg-stone-950/95 backdrop-blur-lg border border-amber-900/60 rounded-xl shadow-2xl flex items-center justify-center gap-1.5 text-xs flex-wrap">
            <span className="text-stone-400 text-[10px] font-bold uppercase mr-1">Formation:</span>
            {(['line', 'column', 'wedge', 'defensive_box', 'scatter'] as FormationType[]).map((form) => (
              <button
                key={form}
                onClick={() => {
                  onSelectFormation(form);
                  setShowOrdersMenu(false);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  currentFormation === form
                    ? 'bg-amber-600 text-stone-950'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {form.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- HERO TRAINING ARENA MODAL --- */}
      {showArenaModal && (
        <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-stone-900 border-2 border-amber-600/80 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-extrabold text-amber-300 text-sm uppercase flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-amber-400" />
                Hero Training Field Duel
              </h3>
              <button
                onClick={() => setShowArenaModal(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Engage in a 1v1 tactical duel against an AI Champion. Challenge different tactical behaviors to hone your combat prowess.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-amber-200 uppercase">Opponent Difficulty:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['EASY', 'NORMAL', 'HARD', 'EXPERT'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      selectedDifficulty === diff
                        ? 'bg-amber-600 border-amber-400 text-stone-950 font-black shadow'
                        : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                id="enter-duel-btn"
                onClick={() => {
                  onStartDuel?.(selectedDifficulty);
                  setShowArenaModal(false);
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
              >
                Enter Duel
              </button>
              <button
                onClick={() => setShowArenaModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM ROW: Virtual Analog Joystick (Left) & Action Combat Abilities (Right) --- */}
      <div className="flex justify-between items-end pointer-events-auto pb-2">
        {/* Virtual Analog Joystick */}
        {renderJoystick ? (
          <div
            ref={touchAreaRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              opacity: prefs.joystickOpacity,
              transform: `scale(${controlScale})`,
              transformOrigin: 'bottom left'
            }}
            className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center cursor-pointer select-none touch-none transition-transform"
          >
            {/* Base Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-600/40 bg-stone-950/50 backdrop-blur-sm shadow-2xl flex items-center justify-center">
              <div className="w-1 h-2 bg-amber-500/40 absolute top-1 rounded" />
              <div className="w-1 h-2 bg-amber-500/40 absolute bottom-1 rounded" />
              <div className="h-1 w-2 bg-amber-500/40 absolute left-1 rounded" />
              <div className="h-1 w-2 bg-amber-500/40 absolute right-1 rounded" />
            </div>

            {/* Draggable Knob */}
            <div
              className={`w-14 h-14 rounded-full border-2 border-amber-400 shadow-xl flex items-center justify-center transition-transform duration-75 ${
                joystickThumb.active
                  ? 'bg-gradient-to-br from-amber-500 to-amber-700 scale-105'
                  : 'bg-gradient-to-br from-stone-800 to-stone-900'
              }`}
              style={{
                transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`
              }}
            >
              <Crosshair className="w-5 h-5 text-amber-200/80" />
            </div>
          </div>
        ) : (
          <div className="pointer-events-none" />
        )}

        {/* Action Combat Buttons (Touch-Optimized, >56px) */}
        {renderButtons ? (
          <div
            className="flex items-end gap-2 sm:gap-3.5 pr-1 transition-transform"
            style={{
              opacity: prefs.buttonOpacity,
              transform: `scale(${controlScale})`,
              transformOrigin: 'bottom right'
            }}
          >
            {/* Shield Guard Button */}
            <button
              onClick={() => onAbility('shield_defend')}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-900/90 to-stone-900 border border-blue-500/60 shadow-2xl flex flex-col items-center justify-center active:scale-90 active:border-blue-300 transition-all"
              title="Shield Guard (-70% damage)"
            >
              <ShieldAlert className="w-5 h-5 text-cyan-300" />
              <span className="text-[8px] sm:text-[9px] font-bold text-cyan-200 mt-0.5">Guard</span>
            </button>

            {/* Rally the Vanguard Ability Button */}
            <button
              onClick={() => onAbility('rally_vanguard')}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-900/90 to-stone-900 border border-emerald-500/60 shadow-2xl flex flex-col items-center justify-center active:scale-90 active:border-emerald-300 transition-all"
              title="Rally (+40 HP heal & buff)"
            >
              <Users className="w-5 h-5 text-emerald-300" />
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-200 mt-0.5">Rally</span>
            </button>

            {/* Heavy Strike & Stomp Ability Button */}
            <button
              onClick={() => onAbility('warlord_stomp')}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-800 to-amber-950 border border-amber-500/60 shadow-2xl flex flex-col items-center justify-center active:scale-90 active:border-amber-300 transition-all"
              title="Heavy Stomp (1.8x AoE damage)"
            >
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-[8px] sm:text-[9px] font-bold text-amber-200 mt-0.5">Stomp</span>
            </button>

            {/* Primary Attack Button (Large, Sword) */}
            <button
              onClick={onAttack}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-center active:scale-90 active:brightness-125 transition-all"
            >
              <Swords className="w-8 h-8 sm:w-9 sm:h-9 text-stone-950 drop-shadow" />
              <span className="text-[9px] sm:text-[10px] font-black text-stone-950 tracking-wider uppercase mt-0.5">
                Strike
              </span>
            </button>
          </div>
        ) : (
          <div className="pointer-events-none" />
        )}
      </div>
    </div>
  );
};
