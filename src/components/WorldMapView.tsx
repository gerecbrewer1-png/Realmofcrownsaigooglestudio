/**
 * Realm of Crowns - 3D World Map & Strategic Gameplay Layer
 * Seamless 3D fantasy world-space presentation featuring continuous terrain, elevation,
 * lighting, 3D cities, resource deposits, barbarian stockades, moving army battalions,
 * RTS camera controls with continuous arrow-key momentum glide, and contextual action overlays.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Compass,
  Castle,
  Swords,
  Trophy,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  MapPin,
  RotateCcw,
  RotateCw,
  Maximize2,
  Navigation,
  Anchor,
} from 'lucide-react';
import {
  WorldTile,
  PlayerWorldState,
  HexCoordinates,
  KingdomState,
  PlayerProfile,
  Commander,
  ArmyMarch,
} from '../types';
import { clientApi } from '../api/clientApi';
import { soundEngine } from '../audio/soundEngine';
import { World3DCanvas, MapActionType, GraphicsQuality } from './world3d/World3DCanvas';
import { WorldContextualCard } from './world3d/WorldContextualCard';
import { MarchDispatchModal, BattleReportsModal } from './world3d/WorldModals';
import { ZoomLevel } from './world3d/cameraController';
import { GameIcons } from './ui/GameIcons';

interface WorldMapViewProps {
  kingdom: KingdomState;
  player: PlayerProfile;
  commander: Commander;
  onRefreshKingdom: () => void;
  onBackToKingdom: () => void;
  onNavigateToVoyage?: () => void;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({
  kingdom,
  player,
  commander,
  onRefreshKingdom,
  onBackToKingdom,
  onNavigateToVoyage,
}) => {
  const [tiles, setTiles] = useState<WorldTile[]>([]);
  const [worldState, setWorldState] = useState<PlayerWorldState | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected object in 3D world
  const [selectedTile, setSelectedTile] = useState<WorldTile | null>(null);

  // Modals
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [dispatchType, setDispatchType] = useState<'gather' | 'attack_barbarian' | 'scout'>('gather');

  // Camera presets & Tactical Map Actions
  const [cameraPresetRequest, setCameraPresetRequest] = useState<ZoomLevel | null>(null);
  const [mapActionRequest, setMapActionRequest] = useState<{ action: MapActionType; id: number } | null>(null);

  // Strategic Information Layers
  const [activeFilter, setActiveFilter] = useState<'all' | 'territory' | 'resources' | 'war'>('all');

  // Graphics Quality (Performance, Balanced, Ultra)
  const [qualityMode, setQualityMode] = useState<GraphicsQuality>('balanced');
  const [qualityNotice, setQualityNotice] = useState<string | null>(null);

  // Strategic Sector Navigation & Coordinate Tracking
  const [cameraCoords, setCameraCoords] = useState<{ q: number; r: number }>({ q: 0, r: 0 });
  const [targetCoordsRequest, setTargetCoordsRequest] = useState<{ q: number; r: number; id: number } | null>(null);
  const [jumpModalOpen, setJumpModalOpen] = useState(false);
  const [inputQ, setInputQ] = useState('0');
  const [inputR, setInputR] = useState('0');

  // Active March Lifecycle Tracking & Sound Cues
  const prevMarchesRef = useRef<Map<string, { status: string; commander: string }>>(new Map());
  const [marchToast, setMarchToast] = useState<{ id: string; text: string; icon: string } | null>(null);

  useEffect(() => {
    if (!worldState) return;
    const currentMarches = worldState.activeMarches || [];
    const prevMap = prevMarchesRef.current;

    // Check for status changes in active marches
    currentMarches.forEach((m) => {
      const prev = prevMap.get(m.marchId);
      if (prev && prev.status !== m.status) {
        if (m.status === 'gathering') {
          soundEngine.playMarchHarvest();
          setMarchToast({
            id: `${m.marchId}-gather`,
            text: `${m.commanderName}'s battalion arrived and began harvesting!`,
            icon: '🌾',
          });
          setTimeout(() => setMarchToast(null), 3500);
        } else if (m.status === 'returning') {
          soundEngine.playMarchReturn();
          setMarchToast({
            id: `${m.marchId}-return`,
            text: `${m.commanderName}'s battalion is returning with resources!`,
            icon: '🛡️',
          });
          setTimeout(() => setMarchToast(null), 3500);
        }
      }
    });

    // Check if any march completed (was in prevMap but is now removed from activeMarches)
    prevMap.forEach((prevData, prevId) => {
      const stillActive = currentMarches.some((m) => m.marchId === prevId);
      if (!stillActive) {
        soundEngine.playResourceGroupCollect();
        onRefreshKingdom();
        setMarchToast({
          id: `${prevId}-done`,
          text: `${prevData.commander}'s expedition has returned! Resources added to royal treasury.`,
          icon: '👑',
        });
        setTimeout(() => setMarchToast(null), 4500);
      }
    });

    // Update prevMap
    const newMap = new Map<string, { status: string; commander: string }>();
    currentMarches.forEach((m) => newMap.set(m.marchId, { status: m.status, commander: m.commanderName }));
    prevMarchesRef.current = newMap;
  }, [worldState?.activeMarches, onRefreshKingdom]);

  // Trigger direct coordinate jump
  const jumpToCoords = (q: number, r: number) => {
    soundEngine.playClick();
    setTargetCoordsRequest({ q, r, id: Date.now() });
    const targetTile = tiles.find((t) => t.coords.q === q && t.coords.r === r);
    if (targetTile) setSelectedTile(targetTile);
    setJumpModalOpen(false);
  };

  // Nearest Strategic POIs from current camera crosshair (calculated only on-demand when Jump Modal is opened)
  const nearestBarbarian = useMemo(() => {
    if (!jumpModalOpen) return null;
    return tiles
      .filter((t) => t.entityType === 'barbarian_camp')
      .sort(
        (a, b) =>
          Math.abs(a.coords.q - cameraCoords.q) +
          Math.abs(a.coords.r - cameraCoords.r) -
          (Math.abs(b.coords.q - cameraCoords.q) + Math.abs(b.coords.r - cameraCoords.r))
      )[0];
  }, [tiles, cameraCoords, jumpModalOpen]);

  const nearestResource = useMemo(() => {
    if (!jumpModalOpen) return null;
    return tiles
      .filter((t) => t.entityType === 'resource_node')
      .sort(
        (a, b) =>
          Math.abs(a.coords.q - cameraCoords.q) +
          Math.abs(a.coords.r - cameraCoords.r) -
          (Math.abs(b.coords.q - cameraCoords.q) + Math.abs(b.coords.r - cameraCoords.r))
      )[0];
  }, [tiles, cameraCoords, jumpModalOpen]);

  const nearestRival = useMemo(() => {
    if (!jumpModalOpen) return null;
    return tiles
      .filter((t) => t.entityType === 'rival_kingdom')
      .sort(
        (a, b) =>
          Math.abs(a.coords.q - cameraCoords.q) +
          Math.abs(a.coords.r - cameraCoords.r) -
          (Math.abs(b.coords.q - cameraCoords.q) + Math.abs(b.coords.r - cameraCoords.r))
      )[0];
  }, [tiles, cameraCoords, jumpModalOpen]);

  const nearestShrine = useMemo(() => {
    if (!jumpModalOpen) return null;
    return tiles
      .filter((t) => t.entityType === 'ancient_shrine')
      .sort(
        (a, b) =>
          Math.abs(a.coords.q - cameraCoords.q) +
          Math.abs(a.coords.r - cameraCoords.r) -
          (Math.abs(b.coords.q - cameraCoords.q) + Math.abs(b.coords.r - cameraCoords.r))
      )[0];
  }, [tiles, cameraCoords, jumpModalOpen]);

  // Stabilized callbacks for World3DCanvas to avoid child re-renders
  const handleSelectTile = useCallback((t: WorldTile | null) => {
    soundEngine.playClick();
    setSelectedTile(t);
  }, []);

  const handleSelectMarch = useCallback((m: ArmyMarch) => {
    jumpToCoords(m.targetCoords.q, m.targetCoords.r);
    setSelectedTile(tiles.find((t) => t.coords.q === m.targetCoords.q && t.coords.r === m.targetCoords.r) || null);
  }, [tiles]);

  const handleResetCameraPreset = useCallback(() => {
    setCameraPresetRequest(null);
  }, []);

  const handleResetMapAction = useCallback(() => {
    setMapActionRequest(null);
  }, []);

  const handleAutoDegradeQuality = useCallback((newQ: GraphicsQuality) => {
    setQualityMode(newQ);
    setQualityNotice('Auto-tuned quality to ensure 60fps responsive glide');
    setTimeout(() => setQualityNotice(null), 4000);
  }, []);

  const handleResetTargetCoords = useCallback(() => {
    setTargetCoordsRequest(null);
  }, []);

  const handleCameraCoordsChange = useCallback((coords: { q: number; r: number }) => {
    setCameraCoords(coords);
  }, []);

  // Trigger map action helper
  const triggerMapAction = (action: MapActionType) => {
    soundEngine.playClick();
    setMapActionRequest({ action, id: Date.now() });
  };

  // Initial Load: World Map Hex Tiles (Loaded once; static geography)
  useEffect(() => {
    let isMounted = true;
    clientApi.getWorldTiles()
      .then((res) => {
        if (isMounted && res.success) {
          setTiles(res.tiles);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load 3D world tiles:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll Dynamic World State (marches, shields, ownership) every 3 seconds
  const pollWorldState = useCallback(async () => {
    try {
      const stateRes = await clientApi.getWorldState();
      if (stateRes.success) {
        setWorldState(stateRes.state);
      }
    } catch (err) {
      console.error('Failed to poll dynamic world state:', err);
    }
  }, []);

  useEffect(() => {
    pollWorldState();
    const interval = setInterval(pollWorldState, 3000);
    return () => clearInterval(interval);
  }, [pollWorldState]);

  // Handle march dispatch confirm
  const handleConfirmDispatch = async (params: {
    targetCoords: { q: number; r: number };
    marchType: 'gather' | 'attack_barbarian' | 'scout';
    commanderId: string;
    commanderName: string;
    troops: Record<string, number>;
  }) => {
    soundEngine.playMarchHorn();
    const res = await clientApi.dispatchMarch({
      targetCoords: params.targetCoords,
      marchType: params.marchType,
      commanderId: params.commanderId,
      commanderName: params.commanderName,
      troops: params.troops,
    });

    if (res.success) {
      setWorldState(res.state);
      onRefreshKingdom();
      setSelectedTile(null);
    }
  };

  // Handle march recall
  const handleRecall = async (marchId: string) => {
    soundEngine.playClick();
    try {
      const res = await clientApi.recallMarch(marchId);
      if (res.success) {
        setWorldState(res.state);
        onRefreshKingdom();
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to recall march.');
    }
  };

  // Handle scout dispatch
  const handleScout = async (coords: HexCoordinates) => {
    soundEngine.playScoutChime();
    try {
      const res = await clientApi.dispatchScout(coords);
      if (res.success) {
        setWorldState(res.state);
        setSelectedTile(null);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to dispatch scout.');
    }
  };

  // Calculate hex distance from player citadel (0,0)
  const selectedTileDistance = useMemo(() => {
    if (!selectedTile) return 0;
    const a = { q: 0, r: 0 };
    const b = selectedTile.coords;
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }, [selectedTile]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-amber-100 p-6 min-h-[600px]">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-semibold tracking-wide uppercase text-amber-400">
          Generating 3D Persistent Fantasy World...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-120px)] overflow-hidden bg-slate-950 select-none">
      {/* 1. Primary Continuous 3D World Canvas */}
      <World3DCanvas
        tiles={tiles}
        worldState={worldState}
        kingdom={kingdom}
        player={player}
        selectedTile={selectedTile}
        onSelectTile={handleSelectTile}
        onSelectMarch={handleSelectMarch}
        activeFilter={activeFilter}
        cameraPresetRequest={cameraPresetRequest}
        onResetCameraPreset={handleResetCameraPreset}
        mapActionRequest={mapActionRequest}
        onResetMapAction={handleResetMapAction}
        qualityMode={qualityMode}
        onAutoDegradeQuality={handleAutoDegradeQuality}
        onCameraCoordsChange={handleCameraCoordsChange}
        targetCoordsRequest={targetCoordsRequest}
        onResetTargetCoords={handleResetTargetCoords}
      />

      {/* March Status Toast */}
      {marchToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border border-emerald-500/80 text-emerald-200 text-xs px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95">
          <span className="text-base">{marchToast.icon}</span>
          <span className="font-semibold text-slate-100">{marchToast.text}</span>
        </div>
      )}

      {/* Auto-Optimization Notification Toast */}
      {qualityNotice && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-500/80 text-amber-200 text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md animate-bounce">
          ⚡ {qualityNotice}
        </div>
      )}

      {/* 2. Top Realm Compass & Strategic Status Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Realm Coordinates Badge & Quality Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-sector-jump-trigger"
            onClick={() => {
              soundEngine.playClick();
              setInputQ(cameraCoords.q.toString());
              setInputR(cameraCoords.r.toString());
              setJumpModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl transition cursor-pointer group min-h-[38px]"
            title="Open Sector Coordinates Jump & Strategic Bookmarks"
          >
            <Compass className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-xs font-black text-amber-200">Sector</span>
            <span className="text-[11px] text-amber-300 bg-amber-950/90 border border-amber-700/60 px-2 py-0.5 rounded font-mono font-bold">
              ({cameraCoords.q >= 0 ? `+${cameraCoords.q}` : cameraCoords.q}, {cameraCoords.r >= 0 ? `+${cameraCoords.r}` : cameraCoords.r})
            </span>
          </button>

          {/* Graphics Quality Toggle Button */}
          <button
            id="btn-quality-toggle"
            title="Toggle 3D Graphics Quality"
            onClick={() => {
              soundEngine.playClick();
              setQualityMode((prev) =>
                prev === 'balanced' ? 'ultra' : prev === 'ultra' ? 'performance' : 'balanced'
              );
            }}
            className="flex items-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 shadow-md transition cursor-pointer min-h-[38px]"
          >
            {qualityMode === 'performance' && (
              <span className="text-amber-400 font-bold flex items-center gap-1">⚡ Fast</span>
            )}
            {qualityMode === 'balanced' && (
              <span className="text-sky-400 font-bold flex items-center gap-1">⚖️ Balanced</span>
            )}
            {qualityMode === 'ultra' && (
              <span className="text-purple-400 font-bold flex items-center gap-1">🌟 Ultra</span>
            )}
          </button>
        </div>

        {/* Action Controls & Reports Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-world-reports"
            onClick={() => {
              soundEngine.playClick();
              setReportsModalOpen(true);
            }}
            className="relative flex items-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 border border-amber-600/50 px-3 py-1.5 rounded-xl text-xs font-black text-amber-300 shadow-xl cursor-pointer transition active:scale-95 min-h-[38px]"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Reports</span>
            {Boolean(worldState?.recentReports && worldState.recentReports.length > 0) && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {onNavigateToVoyage && (
            <button
              id="btn-world-voyage"
              onClick={() => {
                soundEngine.playHorn();
                onNavigateToVoyage();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xl cursor-pointer transition active:scale-95 min-h-[38px]"
            >
              <Anchor className="w-4 h-4 text-cyan-200" />
              <span>Sail Ocean</span>
            </button>
          )}

          <button
            id="btn-return-kingdom"
            onClick={() => {
              soundEngine.playClick();
              onBackToKingdom();
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xl cursor-pointer transition active:scale-95 min-h-[38px]"
          >
            <GameIcons.Citadel className="w-4 h-4" />
            <span>Citadel</span>
          </button>
        </div>
      </div>

      {/* 3. Strategic Information Filter Pill Bar (Top Center) */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1 bg-slate-950/95 border border-amber-900/60 backdrop-blur-md p-1 rounded-2xl shadow-2xl">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'territory', label: 'Territory' },
            { id: 'resources', label: 'Resources' },
            { id: 'war', label: 'War' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => {
              soundEngine.playClick();
              setActiveFilter(f.id);
            }}
            className={`px-3.5 py-1 rounded-xl text-xs font-black transition cursor-pointer min-h-[34px] ${
              activeFilter === f.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 4. Floating Active Marches Bar */}
      {Boolean(worldState?.activeMarches && worldState.activeMarches.length > 0) && (
        <div className="absolute top-26 left-3 right-3 z-30 flex flex-col gap-1.5 pointer-events-none max-w-md mx-auto">
          {worldState?.activeMarches.map((m) => {
            const now = Date.now();
            let progress = 0;
            let secondsLeft = 0;

            if (m.status === 'marching') {
              const elapsed = now - m.departureTime;
              const total = m.estimatedArrivalTime - m.departureTime;
              progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
              secondsLeft = Math.max(0, Math.ceil((m.estimatedArrivalTime - now) / 1000));
            } else if (m.status === 'gathering') {
              const elapsed = now - (m.gatheringStartedAt || now);
              const rate = m.gatheringRatePerHour || 18000;
              const gathered = Math.floor((elapsed / (3600 * 1000)) * rate);
              progress = Math.min(100, (gathered / m.maxPayloadCapacity) * 100);
            } else if (m.status === 'returning') {
              const elapsed = now - (m.returnDepartureTime || now);
              const total = (m.returnArrivalTime || now) - (m.returnDepartureTime || now);
              progress = Math.min(100, Math.max(0, (elapsed / Math.max(1, total)) * 100));
              secondsLeft = Math.max(0, Math.ceil(((m.returnArrivalTime || now) - now) / 1000));
            }

            return (
              <div
                key={m.marchId}
                className="bg-slate-950/95 border border-amber-500/50 backdrop-blur-md rounded-xl p-2 px-3 shadow-2xl pointer-events-auto flex items-center justify-between text-xs"
              >
                <div
                  className="flex-1 mr-3 cursor-pointer group"
                  onClick={() => jumpToCoords(m.targetCoords.q, m.targetCoords.r)}
                  title="Click to focus camera on this expedition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 group-hover:text-amber-200 transition-colors">
                      <Swords className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      {m.commanderName}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {m.status === 'marching' && `Marching: ${secondsLeft}s`}
                      {m.status === 'gathering' && `Gathering (${Math.round(progress)}%)`}
                      {m.status === 'returning' && `Returning: ${secondsLeft}s`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate group-hover:text-amber-300 transition-colors">
                    Target: {m.targetName} ({m.targetCoords.q},{m.targetCoords.r}) • Tap to focus
                  </div>
                </div>

                {m.status !== 'returning' && (
                  <button
                    onClick={() => handleRecall(m.marchId)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer transition active:scale-95"
                  >
                    Recall
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Compact Strategic Map HUD & Glide Controls (Right Side) */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Zoom In */}
        <button
          id="btn-map-zoom-in"
          onClick={() => triggerMapAction('zoom_in')}
          className="w-10 h-10 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/50 rounded-xl text-amber-300 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          id="btn-map-zoom-out"
          onClick={() => triggerMapAction('zoom_out')}
          className="w-10 h-10 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/50 rounded-xl text-amber-300 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Center on Citadel */}
        <button
          id="btn-map-center-citadel"
          onClick={() => triggerMapAction('center_citadel')}
          className="w-10 h-10 bg-gradient-to-b from-amber-900/80 to-slate-950/90 hover:from-amber-800 hover:to-slate-900 border border-amber-500 rounded-xl text-amber-400 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Center Camera on Sovereign Citadel (0,0)"
        >
          <GameIcons.Citadel className="w-5 h-5" />
        </button>

        {/* Toggle Tilt Perspective */}
        <button
          id="btn-map-toggle-tilt"
          onClick={() => triggerMapAction('tilt')}
          className="w-10 h-10 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/50 rounded-xl text-amber-300 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Toggle Cinematic Tilt Perspective"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Rotate Left CCW */}
        <button
          id="btn-map-rotate-ccw"
          onClick={() => triggerMapAction('rotate_ccw')}
          className="w-10 h-10 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/50 rounded-xl text-amber-300 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Rotate Camera Counter-Clockwise"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Rotate Right CW */}
        <button
          id="btn-map-rotate-cw"
          onClick={() => triggerMapAction('rotate_cw')}
          className="w-10 h-10 bg-slate-950/95 hover:bg-slate-900 border border-amber-600/50 rounded-xl text-amber-300 flex items-center justify-center shadow-xl cursor-pointer transition active:scale-90"
          title="Rotate Camera Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* 6. Keyboard Glide Navigation Hint (Bottom Left) */}
      <div className="absolute bottom-6 left-3 z-30 pointer-events-none hidden sm:flex items-center gap-2 bg-slate-950/80 border border-amber-900/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-amber-200/80 shadow-lg">
        <Navigation className="w-3.5 h-3.5 text-amber-400 rotate-45" />
        <span>Hold <strong className="text-amber-300 font-mono">Arrow Keys</strong> or <strong className="text-amber-300 font-mono">WASD</strong> to glide</span>
      </div>

      {/* 7. Contextual World Interaction Card Overlay */}
      {selectedTile && (
        <WorldContextualCard
          selectedTile={selectedTile}
          distance={selectedTileDistance}
          kingdom={kingdom}
          player={player}
          onClose={() => setSelectedTile(null)}
          onOpenDispatch={(type) => {
            soundEngine.playClick();
            setDispatchType(type);
            setDispatchModalOpen(true);
          }}
          onScout={() => handleScout(selectedTile.coords)}
          onBackToKingdom={onBackToKingdom}
          onFocusCityView={() => triggerMapAction('center_citadel')}
        />
      )}

      {/* 8. March Dispatch Configuration Modal */}
      {selectedTile && (
        <MarchDispatchModal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          selectedTile={selectedTile}
          dispatchType={dispatchType}
          kingdom={kingdom}
          commander={commander}
          calculatedDistance={selectedTileDistance}
          onConfirmDispatch={handleConfirmDispatch}
        />
      )}

      {/* 9. Battle & Scout Reports Modal */}
      <BattleReportsModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        worldState={worldState}
      />

      {/* 10. Sector Jump & Strategic Navigation Bookmarks Modal */}
      {jumpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-amber-500/60 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-amber-200 text-sm tracking-wide">
                  Strategic Sector Navigation
                </h3>
              </div>
              <button
                onClick={() => setJumpModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Manual Coordinate Teleport */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Direct Coordinate Jump:
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
                  <span className="text-xs font-mono text-amber-400 font-bold">Q:</span>
                  <input
                    type="number"
                    value={inputQ}
                    onChange={(e) => setInputQ(e.target.value)}
                    className="w-full bg-transparent text-xs text-white font-mono outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
                  <span className="text-xs font-mono text-amber-400 font-bold">R:</span>
                  <input
                    type="number"
                    value={inputR}
                    onChange={(e) => setInputR(e.target.value)}
                    className="w-full bg-transparent text-xs text-white font-mono outline-none"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => {
                    const q = parseInt(inputQ, 10) || 0;
                    const r = parseInt(inputR, 10) || 0;
                    jumpToCoords(q, r);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition active:scale-95 min-h-[32px]"
                >
                  Glide
                </button>
              </div>
            </div>

            {/* Quick Strategic Bookmarks */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-amber-400/90">
                Quick Sector Bookmarks:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Sovereign Citadel */}
                <button
                  onClick={() => jumpToCoords(0, 0)}
                  className="flex items-center gap-2 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-900/50 rounded-xl text-left cursor-pointer transition active:scale-95"
                >
                  <GameIcons.Citadel className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-amber-200">Sovereign Citadel</div>
                    <div className="text-[10px] text-slate-400 font-mono">(0, 0) • Center</div>
                  </div>
                </button>

                {/* 2. Nearest Barbarian Outpost */}
                {nearestBarbarian && (
                  <button
                    onClick={() => jumpToCoords(nearestBarbarian.coords.q, nearestBarbarian.coords.r)}
                    className="flex items-center gap-2 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-900/50 rounded-xl text-left cursor-pointer transition active:scale-95"
                  >
                    <Swords className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-red-200">Barbarian Camp</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({nearestBarbarian.coords.q}, {nearestBarbarian.coords.r}) • Lvl {nearestBarbarian.barbarianCamp?.level}
                      </div>
                    </div>
                  </button>
                )}

                {/* 3. Nearest Resource Field */}
                {nearestResource && (
                  <button
                    onClick={() => jumpToCoords(nearestResource.coords.q, nearestResource.coords.r)}
                    className="flex items-center gap-2 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-900/50 rounded-xl text-left cursor-pointer transition active:scale-95"
                  >
                    <GameIcons.Food className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-200 capitalize">
                        {nearestResource.resourceNode?.resourceType} Field
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({nearestResource.coords.q}, {nearestResource.coords.r}) • Lvl {nearestResource.resourceNode?.level}
                      </div>
                    </div>
                  </button>
                )}

                {/* 4. Nearest Rival Kingdom */}
                {nearestRival && (
                  <button
                    onClick={() => jumpToCoords(nearestRival.coords.q, nearestRival.coords.r)}
                    className="flex items-center gap-2 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-900/50 rounded-xl text-left cursor-pointer transition active:scale-95"
                  >
                    <Castle className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-purple-200 truncate">
                        {nearestRival.rivalKingdom?.ownerName || 'Rival Castle'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({nearestRival.coords.q}, {nearestRival.coords.r}) • Lvl {nearestRival.rivalKingdom?.castleLevel}
                      </div>
                    </div>
                  </button>
                )}

                {/* 5. Ancient Shrine */}
                {nearestShrine && (
                  <button
                    onClick={() => jumpToCoords(nearestShrine.coords.q, nearestShrine.coords.r)}
                    className="col-span-2 flex items-center gap-2 p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-sky-900/50 rounded-xl text-left cursor-pointer transition active:scale-95"
                  >
                    <Compass className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sky-200">
                        {nearestShrine.ancientShrine?.name || 'Ancient Shrine'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({nearestShrine.coords.q}, {nearestShrine.coords.r}) • Strategic Power Site
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
