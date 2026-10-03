# Realm of Crowns — Consolidated Source Bundle
> Generated 2026-10-02 — 6 files, ready for external analysis

---

### File: src/components/world3d/NavalSeaCanvas.tsx
```typescript
/**
 * Realm of Crowns - 3D Ocean & Naval Sailing Simulation Canvas (Three.js)
 * Ported & adapted from Corsairs open-sea foundation into WebGL.
 * Complete with dynamic wave displacement, 17th century tall ship physics,
 * broadside cannon combat, hostile pirate AI, archipelago islands, and salvage.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { ShipVisualService, SHIP_CATALOG, ShipSpec } from './shipVisualService';
import { SailHeraldryService, FactionId } from './SailHeraldryService';
import { CoastalHarborBuilder } from './CoastalHarborBuilder';
import { VoyageQualityManager, VoyageQualityTier } from './VoyageQualityManager';
import { VoyageReflectionManager } from './VoyageReflectionManager';
import { ShipLODController } from './ShipLODController';
import { ShipSailRenderer } from './ShipSailRenderer';
import { VoyageDebugManager } from './VoyageDebugManager';
import { VoyageSimulationLOD, SimulationTier } from './VoyageSimulationLOD';
import { VoyageSpatialGrid } from './VoyageSpatialGrid';
import { VoyageObjectPool, PooledCannonball, PooledParticle } from './VoyageObjectPool';
import { VoyageFleetManager, FleetEntity } from './VoyageFleetManager';
import { VoyageAreaOfInterest } from './VoyageAreaOfInterest';
import { MMOWorldPartitionManager, NetworkLOD, MMOAuthoritativeEntity } from './MMOWorldPartition';
import { VoyageNetworkClient } from './VoyageNetworkClient';
import { VoyageCollisionSystem } from './VoyageCollisionSystem';
import { PlayerMovementController, ShipRenderState } from '../../shared/movement/index';
import { InstancedUIManager } from '../../rendering/InstancedUIManager';
import { soundEngine } from '../../audio/soundEngine';
import { ISLAND_HAVENS, NATIONS, IslandHavenSpec } from '../../data/navalCatalog';
import { auth } from '../../firebase/client';
import { FleetGPUInstancer } from './FleetGPUInstancer';
import { DeterministicProjectileSystem } from './DeterministicProjectileSystem';
import { SinglePassOceanMaterial } from './SinglePassOceanMaterial';

export interface NavalCombatStatus {
  playerHull: number;
  playerHullMax: number;
  playerSails: number;
  playerSailsMax: number;
  playerCrew: number;
  speedKnots: number;
  sailSetting: number; // 0, 0.5, 1.0
  headingDeg: number;
  windFromDeg: number;
  windStrength: number;
  portReload: number; // 0..1
  starboardReload: number; // 0..1
  nearIsland: { id: string; name: string; distance: number } | null;
  targetEnemy: { id: string; name: string; hull: number; hullMax: number; distance: number; crew: number; rank: number } | null;
  canBoard: boolean;
  isTruceZone?: boolean;
  combatLog: string[];
  lootCollected: { gold: number; gems: number; wood: number; relics: number };
}

export type CameraPreset = 'quarterdeck' | 'helm' | 'bow' | 'broadside_port' | 'broadside_starboard' | 'lookout' | 'free';
export type TimeOfDay = 'day' | 'sunset' | 'night';

interface NavalSeaCanvasProps {
  shipType?: string;
  currentAmmo?: 'balls' | 'knippels' | 'grapeshot' | 'bombs';
  cameraPreset?: CameraPreset;
  timeOfDay?: TimeOfDay;
  onStatusUpdate?: (status: NavalCombatStatus) => void;
  onVictory?: (loot: { gold: number; gems: number; wood: number; relics: number }) => void;
  onDefeat?: () => void;
  onRequestReturn?: () => void;
  onDockAtIsland?: (island: { id: string; name: string }) => void;
  onBoardEnemy?: (enemy: { id: string; name: string; hull: number; hullMax: number; crew: number; rank: number }) => void;
}

interface Cannonball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  fromPlayer: boolean;
  damage: number;
  ammoType: 'balls' | 'knippels' | 'grapeshot' | 'bombs';
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleGrowth: number;
}

interface FloatingLoot {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  type: 'gold' | 'gems' | 'wood' | 'relics';
  amount: number;
  bobOffset: number;
}

interface EnemyShip {
  id: string;
  name: string;
  spec: ShipSpec;
  faction: FactionId;
  mesh: THREE.Group;
  hull: number;
  hullMax: number;
  sails: number;
  sailsMax: number;
  pos: THREE.Vector3;
  heading: number; // radians
  speed: number;
  turnSpeed: number;
  reloadTimer: number;
  isSinking: boolean;
  sinkTimer: number;
  wake: THREE.Mesh;
}

export const NavalSeaCanvas: React.FC<NavalSeaCanvasProps> = ({
  shipType = 'galleon',
  currentAmmo = 'balls',
  cameraPreset = 'quarterdeck',
  timeOfDay = 'day',
  onStatusUpdate,
  onVictory,
  onDefeat,
  onRequestReturn,
  onDockAtIsland,
  onBoardEnemy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentAmmoRef = useRef<'balls' | 'knippels' | 'grapeshot' | 'bombs'>(currentAmmo);
  useEffect(() => {
    currentAmmoRef.current = currentAmmo;
  }, [currentAmmo]);

  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);
  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  const timeOfDayRef = useRef<TimeOfDay>(timeOfDay);
  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  const onDockAtIslandRef = useRef(onDockAtIsland);
  useEffect(() => {
    onDockAtIslandRef.current = onDockAtIsland;
  }, [onDockAtIsland]);

  const onBoardEnemyRef = useRef(onBoardEnemy);
  useEffect(() => {
    onBoardEnemyRef.current = onBoardEnemy;
  }, [onBoardEnemy]);

  const onStatusUpdateRef = useRef(onStatusUpdate);
  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  const onVictoryRef = useRef(onVictory);
  useEffect(() => {
    onVictoryRef.current = onVictory;
  }, [onVictory]);

  const onDefeatRef = useRef(onDefeat);
  useEffect(() => {
    onDefeatRef.current = onDefeat;
  }, [onDefeat]);

  // Persistent Player Ship coordinates across re-renders (Prevents frame/position resetting)
  const persistentPlayerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const persistentPlayerHeadingRef = useRef<number>(0);
  const persistentPlayerSpeedRef = useRef<number>(0);
  const persistentPlayerSailSettingRef = useRef<number>(0.5);
  const persistentPlayerHullRef = useRef<number | null>(null);
  const persistentPlayerSailsRef = useRef<number | null>(null);
  const persistentPlayerCrewRef = useRef<number | null>(null);

  const statusRef = useRef<NavalCombatStatus>({
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
    isTruceZone: false,
    combatLog: ['Fair winds, Captain! All sails ready for open sea voyage.'],
    lootCollected: { gold: 0, gems: 0, wood: 0, relics: 0 },
  });

  // Action triggers exposed via imperative ref / window event
  const fireBroadsideRef = useRef<(side: 'port' | 'starboard') => void>(() => { });
  const setSailSettingRef = useRef<(setting: number) => void>(() => { });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let isDisposed = false;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8); // Radiant Caribbean sky blue
    scene.fog = new THREE.Fog(0x38bdf8, 500, 3500); // Crisp foreground water, soft distant horizon

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 3500);
    camera.position.set(0, 16, -45);

    // Free-look / Orbit Camera controls (Click & drag to rotate 360°, wheel to zoom)
    let camOrbitYaw = 0.35; // Iconic 3/4 port-quarter angle showcasing carved stern gallery, broadside guns & wake
    let camOrbitPitch = 0.30; // Elevated ~17 degrees looking down over deck toward the open sea
    let camOrbitDist = 88; // Perfect distance framing entire tall ship and background mountains cleanly
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    // Detect mobile / touch devices for adaptive performance
    const isMobileDevice = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 768)
    );
    if (isMobileDevice) {
      VoyageQualityManager.setTier('LOW');
    }
    VoyageQualityManager.setAdaptive(true);
    const qSettings = VoyageQualityManager.getSettings();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobileDevice,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      // Cap pixel ratio to 1.0 on mobile to prevent GPU fillrate choking; 1.5 max on desktop
      const safePixelRatio = isMobileDevice ? 1.0 : Math.min(window.devicePixelRatio, qSettings.pixelRatioCap || 1.5);
      renderer.setPixelRatio(safePixelRatio);
      renderer.shadowMap.enabled = qSettings.shadowsEnabled && !isMobileDevice;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      container.appendChild(renderer.domElement);
    } catch (glErr) {
      console.warn('WebGL context creation failed in NavalSeaCanvas:', glErr);
      container.innerHTML = '<div class="flex items-center justify-center h-full text-cyan-200 text-xs font-semibold p-4">Initializing Naval Sea Simulation...</div>';
      return;
    }
    (window as any).__NAVAL_RENDERER__ = renderer;
    (window as any).__NAVAL_SCENE__ = scene;
    (window as any).__NAVAL_CAMERA__ = camera;
    (window as any).__NAVAL_DIAGNOSTICS__ = {
      fps: 60,
      frameTimeMs: 16.6,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      activeShips: 9,
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      camOrbitYaw -= dx * 0.005;
      camOrbitPitch = Math.max(0.06, Math.min(Math.PI * 0.44, camOrbitPitch + dy * 0.004));
    };

    const onPointerUp = () => {
      isDragging = false;
      dom.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camOrbitDist = Math.max(45, Math.min(240, camOrbitDist + e.deltaY * 0.08));
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Initial ambient ocean sound
    soundEngine.playNavalTrack('waves');

    // 2. Tropical Sun & Sky Lighting (Pristine ocean reflections, zero interference)
    const ambientLight = new THREE.AmbientLight(0xbae6fd, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0284c7, 0.6);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.0);
    sun.position.set(300, 400, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 280;
    const d = 75;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // 3. Dynamic Physical 3D Ocean Surface (THREE.Water + SinglePassOceanMaterial fallback)
    const oceanSize = 8000;
    const waterGeo = new THREE.PlaneGeometry(oceanSize, oceanSize);
    const waterNormalMap = SailHeraldryService.generateWaterNormalMap();
    const waterNormalMap2 = SailHeraldryService.generateWaterNormalMap();

    // Godot water shader color fidelity:
    // deep_color: vec3(0.008, 0.09, 0.16) -> 0x021729
    // shallow_color: vec3(0.05, 0.32, 0.42) -> 0x0d526b
    // foam_color: vec3(0.92, 0.96, 1.0) -> 0xebf5ff
    const waterSunColor = timeOfDay === 'night' ? 0x93c5fd : timeOfDay === 'sunset' ? 0xf97316 : 0xfffbeb;
    const waterDeepColor = timeOfDay === 'night' ? 0x010b14 : timeOfDay === 'sunset' ? 0x081f30 : 0x03273e;
    const waterShallowColor = timeOfDay === 'night' ? 0x041c30 : timeOfDay === 'sunset' ? 0x143c52 : 0x0d526b;
    const waterSkyColor = timeOfDay === 'night' ? 0x1e3a8a : timeOfDay === 'sunset' ? 0xf97316 : 0x38bdf8;

    // Phase 3: Single-Pass Specular Water Material with dual counter-scrolling normal maps
    const singlePassWaterMaterial = new SinglePassOceanMaterial({
      normalMap1: waterNormalMap,
      normalMap2: waterNormalMap2,
      sunDirection: sun.position.clone().normalize(),
      sunColor: waterSunColor,
      deepColor: waterDeepColor,
      shallowColor: waterShallowColor,
      skyColor: waterSkyColor,
    });

    const useSinglePassWater = isMobileDevice || VoyageQualityManager.getTier() !== 'HIGH';

    const water = new Water(waterGeo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormalMap,
      sunDirection: sun.position.clone().normalize(),
      sunColor: waterSunColor,
      waterColor: waterDeepColor,
      distortionScale: 1.6,
      fog: scene.fog !== undefined,
    });
    water.rotation.x = -Math.PI * 0.5;
    water.position.y = 0;

    if (useSinglePassWater) {
      water.material = singlePassWaterMaterial;
    }
    scene.add(water);

    // 3b. Initialize Phase 2 Ocean Reflection Optimization (throttled reflection pass & layer isolation)
    if (!useSinglePassWater) {
      VoyageReflectionManager.initialize(water, camera, VoyageQualityManager.getSettings().reflectionUpdateInterval);
    }

    // Wave height sampling function (Direct port of Godot dir_wave multi-harmonic crossing swells)
    const dirWave = (x: number, z: number, dx: number, dz: number, freq: number, speed: number, t: number): number => {
      const len = Math.hypot(dx, dz) || 1;
      return Math.sin((x * (dx / len) + z * (dz / len)) * freq + t * speed);
    };

    const getWaveHeight = (x: number, z: number, t: number): number => {
      // Swell 1: dir (1.0, 0.35), freq 0.030, speed 1.1, amp 0.55
      const w1 = dirWave(x, z, 1.0, 0.35, 0.030, 1.1, t) * 0.55;
      // Swell 2: dir (-0.4, 1.0), freq 0.052, speed 0.9, amp 0.35
      const w2 = dirWave(x, z, -0.4, 1.0, 0.052, 0.9, t) * 0.35;
      // Swell 3: dir (0.7, -0.8), freq 0.085, speed 1.6, amp 0.18
      const w3 = dirWave(x, z, 0.7, -0.8, 0.085, 1.6, t) * 0.18;
      return (w1 + w2 + w3) * 1.8;
    };

    // 4. Grand Coastal Mainland & Archipelago Harbor Cities
    interface Island {
      id: string;
      name: string;
      nation: string;
      pos: THREE.Vector3;
      radius: number;
      mesh: THREE.Group;
    }

    const islands: Island[] = [];
    const seagulls: { mesh: THREE.Group; center: THREE.Vector3; radius: number; speed: number; angle: number; y: number }[] = [];

    // Seagull wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      0, 0, 0, -1.2, 0.2, -0.4, -0.3, 0, 0.4,
      0, 0, 0, 1.2, 0.2, -0.4, 0.3, 0, 0.4
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    wingGeo.computeVertexNormals();
    const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // A. Grand Mainland Coastal Harbor & City (North Horizon Z=960)
    const mainlandHaven = CoastalHarborBuilder.createHarborCity({
      id: 'mainland_haven',
      name: 'Royal Sovereign Port & Mainland',
      faction: 'sovereign',
      position: new THREE.Vector3(0, 0, 960),
      rotationY: 0,
      scale: 1.4,
      tier: 3,
      isMainland: true,
    });
    // Optimization: disable shadow casting on static distant harbor geometry
    mainlandHaven.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    scene.add(mainlandHaven);

    islands.push({
      id: 'mainland_haven',
      name: 'Royal Sovereign Port (Mainland)',
      nation: 'england',
      pos: new THREE.Vector3(0, 0, 920),
      radius: 220,
      mesh: mainlandHaven,
    });

    // B. Archipelago Island Havens with 3D Coastal Cities & Arches (Compact ~40m)
    ISLAND_HAVENS.forEach((idef) => {
      const islPos = new THREE.Vector3(idef.position[0], 0, idef.position[1]);
      const havenFaction: FactionId = idef.nation === 'pirates' ? 'pirates' : idef.nation === 'spain' ? 'spain' : idef.nation === 'france' ? 'france' : idef.nation === 'holland' ? 'holland' : 'sovereign';

      const isCave = idef.id === 'brethrens_vault';
      const havenRotationY = isCave ? 0 : (Math.atan2(-islPos.x, -islPos.z) + 0.15);

      const havenHarbor = CoastalHarborBuilder.createHarborCity({
        id: idef.id,
        name: idef.name,
        faction: havenFaction,
        position: islPos.clone(),
        rotationY: havenRotationY,
        scale: isCave ? 1.5 : (1.1 + idef.tier * 0.1),
        tier: idef.tier,
        isMainland: false,
      });
      // Optimization: disable shadow casting on distant island havens
      havenHarbor.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      scene.add(havenHarbor);

      islands.push({
        id: idef.id,
        name: idef.name,
        nation: idef.nation,
        pos: islPos,
        radius: isCave ? 140 : (90 + idef.tier * 10),
        mesh: havenHarbor,
      });

      // Spawn circling seagulls above haven
      for (let g = 0; g < 4; g++) {
        const gull = new THREE.Group();
        const wingMesh = new THREE.Mesh(wingGeo, gullMat);
        gull.add(wingMesh);
        scene.add(gull);
        seagulls.push({
          mesh: gull,
          center: islPos.clone(),
          radius: idef.radius * 0.8 + Math.random() * 30,
          speed: 0.35 + Math.random() * 0.25,
          angle: (g / 4) * Math.PI * 2 + Math.random(),
          y: 40 + Math.random() * 20,
        });
      }

    });

    // 5. Player Ship Setup with Sovereign Royal Crest
    const playerSpec = SHIP_CATALOG[shipType] || SHIP_CATALOG.galleon;
    const playerMesh = ShipVisualService.createShipMesh(playerSpec, false, 'sovereign');
    playerMesh.visible = true;
    scene.add(playerMesh);

    const playerWake = ShipVisualService.createWakeMesh(playerSpec.length, playerSpec.beam);
    playerMesh.add(playerWake);

    const safeHull = (persistentPlayerHullRef.current !== null && persistentPlayerHullRef.current > 0)
      ? persistentPlayerHullRef.current
      : playerSpec.hullMax;
    const safeSails = (persistentPlayerSailsRef.current !== null && persistentPlayerSailsRef.current > 0)
      ? persistentPlayerSailsRef.current
      : playerSpec.sailsMax;
    const safeCrew = (persistentPlayerCrewRef.current !== null && persistentPlayerCrewRef.current > 0)
      ? persistentPlayerCrewRef.current
      : playerSpec.crewMax;

    const movementController = new PlayerMovementController({
      x: persistentPlayerPosRef.current.x,
      y: persistentPlayerPosRef.current.y,
      z: persistentPlayerPosRef.current.z,
      heading: persistentPlayerHeadingRef.current,
      speedKnots: persistentPlayerSpeedRef.current,
      rudder: 0,
      sailSetting: persistentPlayerSailSettingRef.current,
      hull: safeHull,
      maxHull: playerSpec.hullMax,
      sails: safeSails,
      maxSails: playerSpec.sailsMax,
      baseSpeed: playerSpec.baseSpeed,
      turnRate: playerSpec.turnRate,
      length: playerSpec.length,
      beam: playerSpec.beam,
    });
    (window as any).__MOVEMENT_CONTROLLER__ = movementController;

    const playerState = {
      pos: persistentPlayerPosRef.current.clone(),
      heading: persistentPlayerHeadingRef.current, // radians (0 = facing +Z)
      rudder: 0,
      speedKnots: persistentPlayerSpeedRef.current,
      sailSetting: persistentPlayerSailSettingRef.current, // 0 = furl, 0.5 = battle, 1.0 = full
      hull: safeHull,
      hullMax: playerSpec.hullMax,
      sails: safeSails,
      sailsMax: playerSpec.sailsMax,
      crew: safeCrew,
      portReload: 1.0,
      starboardReload: 1.0,
      rollAngle: 0,
      pitchAngle: 0,
      lastReconciledTick: 0,
    };
    (window as any).__NAVAL_PLAYER_STATE__ = playerState;

    // Apply immediate Frame 0 transform via the single presentation owner so playerMesh is positioned and visible before tick 0
    movementController.getPresentationOwner().applyRenderState(
      playerMesh,
      playerWake,
      {
        x: playerState.pos.x,
        y: playerState.pos.y,
        z: playerState.pos.z,
        pitch: playerState.pitchAngle,
        heading: playerState.heading,
        roll: playerState.rollAngle,
        speedKnots: playerState.speedKnots,
        rudder: playerState.rudder,
        sailSetting: playerState.sailSetting,
        wakeScale: 0.1,
        wakeVisible: false,
        presentationTimestamp: performance.now(),
      }
    );
    ShipLODController.updateShipLOD(playerMesh, 0, true);

    // 6. Hostile Pirate, Asian War Junk & Large-Fleet Setup (Phase 2.6)
    VoyageObjectPool.initialize(scene, 45, 90);
    const fleetManager = new VoyageFleetManager();
    const mmoPartition = new MMOWorldPartitionManager();
    (window as any).__MMO_PARTITION__ = mmoPartition;

    // Initialize Real-Time MMO Network Transport (Phase 2.8)
    let networkClient: VoyageNetworkClient | null = null;
    (async () => {
      let playerAuthToken = (typeof localStorage !== 'undefined' && localStorage.getItem('roc_player_id')) || `test_voyager_${Date.now()}`;
      try {
        if (auth.currentUser) {
          const fbToken = await auth.currentUser.getIdToken();
          if (fbToken) playerAuthToken = fbToken;
        }
      } catch (err) {
        console.warn('Could not fetch Firebase Auth Token for MMO WebSocket.', err);
      }
      
      networkClient = new VoyageNetworkClient(scene, playerAuthToken);
      networkClient.connect();
      (window as any).__VOYAGE_NETWORK_CLIENT__ = networkClient;
    })();

    // 7. Initialize Batched WebGL Instanced UI (Phase 17)
    const uiManager = new InstancedUIManager();
    scene.add(uiManager.group);

    // Wall 2: Fleet GPU Instancer for batched ship rendering (3 to 6 draw calls for 150 ships)
    const fleetInstancer = new FleetGPUInstancer();
    scene.add(fleetInstancer.group);

    // Wall 3: Deterministic Analytical Projectile System (1 draw call, zero in-flight raycasts)
    const deterministicProjectiles = new DeterministicProjectileSystem();
    scene.add(deterministicProjectiles.instancedMesh);

    const enemySpecs: EnemyShip[] = [];
    const enemyById = new Map<string, EnemyShip>();
    const islandById = new Map<string, (typeof ISLAND_HAVENS)[number]>();
    ISLAND_HAVENS.forEach((h) => islandById.set(h.id, h));

    const fleetTemplates: Array<{ id: string; name: string; type: string; faction: FactionId; x: number; z: number; heading: number }> = [
      { id: 'p1', name: 'Black Skull Corsair', type: 'pirate_corsair', faction: 'pirates', x: 0, z: 95, heading: Math.PI },
      { id: 'p2', name: 'Crimson Raider Brig', type: 'brig', faction: 'pirates', x: -75, z: 135, heading: Math.PI * 0.8 },
      { id: 'j1', name: 'Imperial Dragon War Junk', type: 'dragon_junk', faction: 'dragon', x: -240, z: 120, heading: -0.4 },
      { id: 'j2', name: 'Canton Treasure Junk', type: 'treasure_junk', faction: 'dragon', x: 280, z: -100, heading: Math.PI * 0.6 },
      { id: 'g1', name: 'Venetian War Galleass', type: 'galleass', faction: 'sovereign', x: 180, z: -180, heading: -Math.PI * 0.35 },
      { id: 's1', name: 'Armada Real Galleon', type: 'galleon', faction: 'spain', x: -160, z: 250, heading: 0.3 },
      { id: 'd1', name: 'Batavia Merchant Fluyt', type: 'corvette', faction: 'holland', x: 140, z: 220, heading: -Math.PI * 0.8 },
      { id: 'f1', name: 'Crown Patrol Frigate', type: 'frigate', faction: 'sovereign', x: 80, z: 320, heading: -Math.PI * 0.5 },
      { id: 'f2', name: 'Scourge War Tartane', type: 'tartane', faction: 'pirates', x: -60, z: -120, heading: 0.8 },
    ];

    fleetTemplates.forEach((pt) => {
      const spec = SHIP_CATALOG[pt.type] || SHIP_CATALOG.sloop;
      const isPirate = pt.faction === 'pirates';
      const mesh = ShipVisualService.createShipMesh(spec, isPirate, pt.faction);
      mesh.position.set(pt.x, 0, pt.z);
      mesh.rotation.y = pt.heading;
      scene.add(mesh);

      const wake = ShipVisualService.createWakeMesh(spec.length, spec.beam);
      mesh.add(wake);

      const enemyObj: EnemyShip = {
        id: pt.id,
        name: pt.name,
        spec,
        faction: pt.faction,
        mesh,
        hull: spec.hullMax,
        hullMax: spec.hullMax,
        sails: spec.sailsMax,
        sailsMax: spec.sailsMax,
        pos: new THREE.Vector3(pt.x, 0, pt.z),
        heading: pt.heading,
        speed: spec.baseSpeed * 0.55,
        turnSpeed: spec.turnRate * 0.02,
        reloadTimer: 3.0 + Math.random() * 4.0,
        isSinking: false,
        sinkTimer: 0,
        wake,
      };

      enemySpecs.push(enemyObj);
      enemyById.set(enemyObj.id, enemyObj);

      fleetManager.registerEntity({
        id: pt.id,
        name: pt.name,
        spec,
        faction: pt.faction,
        isPirate,
        mesh,
        wake,
        hull: spec.hullMax,
        hullMax: spec.hullMax,
        sails: spec.sailsMax,
        sailsMax: spec.sailsMax,
        pos: enemyObj.pos,
        heading: pt.heading,
        speed: spec.baseSpeed * 0.55,
        turnSpeed: spec.turnRate * 0.02,
        reloadTimer: 3.0 + Math.random() * 4.0,
        isSinking: false,
        sinkTimer: 0,
        simTier: SimulationTier.SIM0_IMMEDIATE,
        lodTier: 0,
        inCombat: false,
        renderVisible: true,
        lastSimUpdateFrame: 0,
      });

      mmoPartition.registerEntity({
        id: pt.id,
        type: isPirate ? 'ship_pirate' : 'ship_military',
        name: pt.name,
        transform: { x: pt.x, y: 0, z: pt.z, heading: pt.heading, speedKnots: spec.baseSpeed * 0.55 },
        health: spec.hullMax,
        maxHealth: spec.hullMax,
        faction: pt.faction,
        inCombat: false,
        lastSimulatedTimestamp: performance.now(),
      });
    });

    (window as any).__SET_NAVAL_SHIPS_COUNT__ = (targetTotalShips: number) => {
      const activeEnemiesCount = Math.max(0, targetTotalShips - 1);

      // Configure base 9 vessels
      enemySpecs.slice(0, 9).forEach((enemy, idx) => {
        const shouldBeActive = idx < activeEnemiesCount;
        if (enemy.mesh) enemy.mesh.visible = shouldBeActive;
        if (!shouldBeActive) {
          enemy.pos.set(99999, 0, 99999);
        } else if (enemy.pos.x > 5000) {
          const t = fleetTemplates[idx];
          if (t) enemy.pos.set(t.x, 0, t.z);
        }
      });

      // Scalable procedural fleet generation for large fleets (25, 50, 100, 250 ships)
      if (activeEnemiesCount > 9) {
        const currentCount = fleetManager.getEntities().length;
        if (activeEnemiesCount > currentCount) {
          const shipTypes = ['sloop', 'brig', 'corvette', 'frigate', 'tartane', 'pirate_corsair', 'dragon_junk', 'galleon'];
          const factions: FactionId[] = ['pirates', 'sovereign', 'spain', 'holland', 'dragon'];

          for (let k = currentCount; k < activeEnemiesCount; k++) {
            const type = shipTypes[k % shipTypes.length];
            const spec = SHIP_CATALOG[type] || SHIP_CATALOG.sloop;
            const faction = factions[k % factions.length];
            const isPirate = faction === 'pirates';

            // Golden spiral distribution across nautical archipelago rings
            const angle = k * 2.39996;
            const r = 180 + Math.sqrt(k) * 165;
            const posX = Math.cos(angle) * r;
            const posZ = Math.sin(angle) * r;
            const heading = (angle + Math.PI * 0.5) % (Math.PI * 2);

            let mesh: THREE.Group | undefined;
            let wake: THREE.Mesh | undefined;

            // Only instantiate 3D geometry for vessels within visible range (< 1400m)
            // and cap visual 3D mesh instances at 32 max to preserve 60 FPS mobile budget
            if (k < 32 && r < 1400) {
              mesh = ShipVisualService.createShipMesh(spec, isPirate, faction);
              mesh.position.set(posX, 0, posZ);
              mesh.rotation.y = heading;
              scene.add(mesh);

              wake = ShipVisualService.createWakeMesh(spec.length, spec.beam);
              mesh.add(wake);
            }

            const procEntity: FleetEntity = {
              id: `proc_ship_${k}`,
              name: `${isPirate ? 'Corsair' : 'Merchant'} ${spec.name} #${k + 1}`,
              spec,
              faction,
              isPirate,
              mesh,
              wake,
              hull: spec.hullMax,
              hullMax: spec.hullMax,
              sails: spec.sailsMax,
              sailsMax: spec.sailsMax,
              pos: new THREE.Vector3(posX, 0, posZ),
              heading,
              speed: spec.baseSpeed * (0.45 + (k % 5) * 0.08),
              turnSpeed: spec.turnRate * 0.02,
              reloadTimer: 3.0 + (k % 4),
              isSinking: false,
              sinkTimer: 0,
              simTier: r > 1500 ? SimulationTier.SIM4_STRATEGIC : r > 750 ? SimulationTier.SIM3_DISTANT : SimulationTier.SIM2_REGIONAL,
              lodTier: r > 650 ? 3 : 2,
              inCombat: false,
              renderVisible: mesh !== undefined,
              lastSimUpdateFrame: 0,
            };

            fleetManager.registerEntity(procEntity);

            mmoPartition.registerEntity({
              id: procEntity.id,
              type: isPirate ? 'ship_pirate' : 'ship_merchant',
              name: procEntity.name,
              transform: { x: posX, y: 0, z: posZ, heading, speedKnots: procEntity.speed },
              health: spec.hullMax,
              maxHealth: spec.hullMax,
              faction,
              inCombat: false,
              lastSimulatedTimestamp: performance.now(),
            });

            if (mesh) {
              const enemyObj: EnemyShip = {
                id: procEntity.id,
                name: procEntity.name,
                spec,
                faction,
                mesh,
                hull: spec.hullMax,
                hullMax: spec.hullMax,
                sails: spec.sailsMax,
                sailsMax: spec.sailsMax,
                pos: procEntity.pos,
                heading,
                speed: procEntity.speed,
                turnSpeed: procEntity.turnSpeed,
                reloadTimer: procEntity.reloadTimer,
                isSinking: false,
                sinkTimer: 0,
                wake: wake!,
              };
              enemySpecs.push(enemyObj);
              enemyById.set(enemyObj.id, enemyObj);
            }
          }
        }
      }
    };

    // Phase 2.7 MMO World Benchmark Generators
    (window as any).__POPULATE_MMO_WORLD__ = (count: number, spreadRadius = 3500) => {
      for (let w = 0; w < count; w++) {
        const angle = w * 2.39996;
        const r = 550 + Math.sqrt(w) * (spreadRadius / Math.max(1, Math.sqrt(count)));
        const wx = Math.cos(angle) * r;
        const wz = Math.sin(angle) * r;
        const id = `mmo_world_ent_${w}`;
        const isHostile = w % 3 === 0;
        mmoPartition.registerEntity({
          id,
          type: isHostile ? 'ship_pirate' : 'ship_merchant',
          name: `${isHostile ? 'Corsair Raider' : 'Trade Vessel'} #${w + 1}`,
          transform: { x: wx, y: 0, z: wz, heading: angle, speedKnots: 10 + (w % 6) },
          health: 1000,
          maxHealth: 1000,
          faction: isHostile ? 'pirates' : 'holland',
          inCombat: false,
          lastSimulatedTimestamp: performance.now(),
        });
      }
      return mmoPartition.getDiagnostics();
    };

    (window as any).__POPULATE_LOCAL_DENSE_TEST__ = (count: number, denseRadius = 250) => {
      const px = playerState.pos.x;
      const pz = playerState.pos.z;
      for (let d = 0; d < count; d++) {
        const angle = (d / count) * Math.PI * 2;
        const r = 30 + (d % 5) * (denseRadius / 5);
        const dx = px + Math.cos(angle) * r;
        const dz = pz + Math.sin(angle) * r;
        const id = `dense_ship_${d}`;
        mmoPartition.registerEntity({
          id,
          type: d % 2 === 0 ? 'ship_pirate' : 'ship_player',
          name: `Squadron Vessel #${d + 1}`,
          transform: { x: dx, y: 0, z: dz, heading: angle, speedKnots: 8 },
          health: 1200,
          maxHealth: 1200,
          faction: d % 2 === 0 ? 'pirates' : 'sovereign',
          inCombat: d < 10,
          lastSimulatedTimestamp: performance.now(),
        });
      }
      return mmoPartition.getDiagnostics();
    };

    (window as any).__SET_VOYAGE_QUALITY_TIER__ = (tier: VoyageQualityTier) => {
      VoyageQualityManager.setTier(tier);
      const settings = VoyageQualityManager.getSettings();
      renderer.shadowMap.enabled = settings.shadowsEnabled;
      VoyageReflectionManager.setUpdateInterval(settings.reflectionUpdateInterval);
    };

    (window as any).__SET_REFLECTION_INTERVAL__ = (interval: number) => {
      VoyageReflectionManager.setUpdateInterval(interval);
    };

    // 7. Cannonballs, Projectiles & Particles
    const cannonballs: Cannonball[] = [];
    const particles: Particle[] = [];
    const floatingLoot: FloatingLoot[] = [];

    const ballGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const ballMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

    const particleGeo = new THREE.SphereGeometry(0.6, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.65 });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Spawn floating salvage barrel
    const spawnSalvage = (pos: THREE.Vector3, type: 'gold' | 'gems' | 'wood' | 'relics', amount: number) => {
      const lootGroup = new THREE.Group();
      lootGroup.position.copy(pos);

      const barrelGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 8);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.z = Math.PI * 0.45;
      lootGroup.add(barrel);

      // Gold shimmer glow
      const glowGeo = new THREE.RingGeometry(1.2, 2.2, 12);
      glowGeo.rotateX(-Math.PI * 0.5);
      const glowMat = new THREE.MeshBasicMaterial({
        color: type === 'gems' ? 0x06b6d4 : 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.2;
      lootGroup.add(glow);

      scene.add(lootGroup);
      floatingLoot.push({
        mesh: lootGroup,
        pos: pos.clone(),
        type,
        amount,
        bobOffset: Math.random() * Math.PI * 2,
      });
    };

    // Spawn initial floating shipwreck salvage
    spawnSalvage(new THREE.Vector3(50, 0, -20), 'gold', 350);
    spawnSalvage(new THREE.Vector3(-120, 0, 50), 'wood', 400);
    spawnSalvage(new THREE.Vector3(200, 0, 180), 'gems', 40);

    // 8. Firing Mechanics
    const fireBroadside = (side: 'port' | 'starboard') => {
      if (playerState.hull <= 0) return;

      // Sacred Pirate Truce Sanctuary check (The Brethren's Vault at [-380, 220])
      const cavePos = new THREE.Vector3(-380, 0, 220);
      if (playerState.pos.distanceTo(cavePos) < 95) {
        statusRef.current.combatLog.unshift('⚔️ Sanctuary of Truce: Weapons held under the sacred Pirate Code!');
        soundEngine.playShipCreak();
        return;
      }

      const isPort = side === 'port';
      if (isPort && playerState.portReload < 1.0) return;
      if (!isPort && playerState.starboardReload < 1.0) return;

      // Phase 2.9: Server-Authoritative Firing Intent
      networkClient?.sendFireRequest(side);

      // Reset reload
      if (isPort) playerState.portReload = 0.0;
      else playerState.starboardReload = 0.0;

      soundEngine.playCannonFire();

      // Gun ports count
      const numGuns = Math.min(8, Math.floor(playerSpec.cannons / 2));
      const sideSign = isPort ? -1 : 1;

      // Active ammo characteristics
      const activeAmmo = currentAmmoRef.current || 'balls';
      let ammoSpeed = 56.0;
      let baseDmg = 65;
      let ballColor = 0x18181b;

      if (activeAmmo === 'knippels') {
        ammoSpeed = 48.0;
        baseDmg = 50;
        ballColor = 0x475569;
      } else if (activeAmmo === 'grapeshot') {
        ammoSpeed = 62.0;
        baseDmg = 40;
        ballColor = 0x94a3b8;
      } else if (activeAmmo === 'bombs') {
        ammoSpeed = 42.0;
        baseDmg = 115;
        ballColor = 0xf97316;
      }

      const activeBallMat = new THREE.MeshBasicMaterial({ color: ballColor });

      // Perpendicular vector for broadside
      const broadsideAngle = playerState.heading + sideSign * (Math.PI * 0.5);
      const dir = new THREE.Vector3(Math.sin(broadsideAngle), 0, Math.cos(broadsideAngle)).normalize();

      for (let i = 0; i < numGuns; i++) {
        const offsetDist = (i - numGuns * 0.5) * 2.2;
        const forward = new THREE.Vector3(Math.sin(playerState.heading), 0, Math.cos(playerState.heading));

        const spawnPos = playerState.pos
          .clone()
          .add(dir.clone().multiplyScalar(playerSpec.beam * 0.55))
          .add(forward.clone().multiplyScalar(offsetDist));
        spawnPos.y += 2.5;

        // Spread variation
        const spreadX = (Math.random() - 0.5) * 0.08;
        const spreadZ = (Math.random() - 0.5) * 0.08;
        const ballDir = dir.clone().add(new THREE.Vector3(spreadX, 0.12, spreadZ)).normalize();
        const ballVel = ballDir.multiplyScalar(ammoSpeed + Math.random() * 6.0);

        // Wall 3: Fire into deterministic analytical projectile system
        deterministicProjectiles.fire({
          origin: spawnPos,
          velocity: ballVel,
          fireTimestampSec: globalTime,
          damage: Math.round(baseDmg + Math.random() * 20),
          fromPlayer: true,
          targetEntityId: lastNearestEnemy?.id,
          targetPos: lastNearestEnemy ? lastNearestEnemy.pos : undefined,
        });

        // Wall 2: Muzzle smoke particle from pool only if close to camera (<= 40m)
        if (camera.position.distanceTo(spawnPos) <= 40) {
          const smoke = VoyageObjectPool.acquireParticle(
            spawnPos,
            dir.clone().multiplyScalar(4.0).add(new THREE.Vector3(0, 1.5, 0)),
            1.2,
            2.5
          );
          if (smoke) {
            particles.push(smoke as unknown as Particle);
          }
        }
      }

      statusRef.current.combatLog.unshift(`Fired ${side} broadside volley! (${numGuns} cannons)`);
      if (statusRef.current.combatLog.length > 5) statusRef.current.combatLog.pop();
    };

    fireBroadsideRef.current = fireBroadside;
    setSailSettingRef.current = (setting: number) => {
      playerState.sailSetting = setting;
      soundEngine.playShipCreak();
    };

    // 9. Controls & Keyboard
    const keysDown = new Set<string>();
    let lastClosestIsland: { id: string; name: string } | null = null;
    let lastNearestEnemy: EnemyShip | null = null;
    let lastMinDist = Infinity;

    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);

      if (e.code === 'KeyQ') fireBroadside('port');
      if (e.code === 'KeyE') fireBroadside('starboard');
      if (e.code === 'Digit1') playerState.sailSetting = 0.0;
      if (e.code === 'Digit2') playerState.sailSetting = 0.5;
      if (e.code === 'Digit3') playerState.sailSetting = 1.0;

      if (e.code === 'KeyB') {
        if (lastNearestEnemy && lastMinDist < 48 && !lastNearestEnemy.isSinking) {
          if (onBoardEnemyRef.current) {
            onBoardEnemyRef.current({
              id: lastNearestEnemy.id,
              name: lastNearestEnemy.name,
              hull: Math.round(lastNearestEnemy.hull),
              hullMax: lastNearestEnemy.hullMax,
              crew: Math.round(lastNearestEnemy.spec.crewMax * (lastNearestEnemy.hull / lastNearestEnemy.hullMax)),
              rank: lastNearestEnemy.spec.rank,
            });
          }
        }
      }

      if (e.code === 'Enter') {
        if (lastClosestIsland && onDockAtIslandRef.current) {
          onDockAtIslandRef.current({
            id: lastClosestIsland.id,
            name: lastClosestIsland.name,
          });
        }
      }
      if (e.code === 'Space') {
        playerState.sailSetting = playerState.sailSetting > 0 ? 0 : 0.5;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Pre-allocated scratch objects to eliminate per-frame GC allocations
    const _projScreenMatrix = new THREE.Matrix4();
    const _cameraFrustum = new THREE.Frustum();
    const _sphere = new THREE.Sphere();
    const _camTargetVec = new THREE.Vector3();
    const _lookAheadVec = new THREE.Vector3();
    const _toPlayerVec = new THREE.Vector3();
    const _aimVec = new THREE.Vector3();

    // 10. Main Animation & Physics Loop
    let lastTime = performance.now();
    let globalTime = 0;
    let logUpdateTimer = 0;
    let hasTolledBellForIsland: string | null = null;
    let renderFrameCount = 0;

    (window as any).__VOYAGE_DIAGNOSTICS_REPORT__ = () => ({
      requestAnimationFrameRunning: !isDisposed,
      frameCount: renderFrameCount,
      rendererExists: !!renderer,
      sceneExists: !!scene,
      cameraExists: !!camera,
      renderCalls: renderer?.info?.render?.calls ?? 0,
      canvasExists: !!renderer?.domElement,
      canvasWidth: renderer?.domElement?.width ?? 0,
      canvasHeight: renderer?.domElement?.height ?? 0,
      isContextLost: renderer?.getContext()?.isContextLost() ?? false,
      rendererDisposed: isDisposed,
      sceneChildrenLength: scene?.children?.length ?? 0,
      cameraPos: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null,
      cameraAspect: camera?.aspect,
      cameraNear: camera?.near,
      cameraFar: camera?.far,
      playerPos: playerState ? { x: playerState.pos.x, y: playerMesh?.position?.y ?? 0, z: playerState.pos.z } : null,
      playerHeading: playerState?.heading,
      lastError: (window as any).__VOYAGE_LAST_ERROR__ || null,
    });

    // Immediate camera positioning on frame 0 to prevent spawn jump
    const initialYaw = playerState.heading + Math.PI + camOrbitYaw;
    const initialCamX = playerState.pos.x + Math.sin(initialYaw) * Math.cos(camOrbitPitch) * camOrbitDist;
    const initialCamY = playerState.pos.y + Math.sin(camOrbitPitch) * camOrbitDist + 8.5;
    const initialCamZ = playerState.pos.z + Math.cos(initialYaw) * Math.cos(camOrbitPitch) * camOrbitDist;
    camera.position.set(initialCamX, initialCamY, initialCamZ);
    camera.lookAt(playerState.pos.x, playerState.pos.y + 10, playerState.pos.z + 18);

    let lastAppliedTod: string | null = null;
    const CAVE_SANCTUARY_POS = new THREE.Vector3(-380, 0, 220);

    // Phase 1: Throttled input tracking (strictly emit on state change or 5 Hz heartbeat)
    let lastSentRudder = 0;
    let lastSentSailDelta = 0;
    let lastSentCommandTimestamp = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      try {
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        globalTime += dt;

      // Wind dynamics (Wind blows from windAngle)
      const windFromRad = (statusRef.current.windFromDeg * Math.PI) / 180;
      const debugSwitches = VoyageDebugManager.getSwitches();
      const useIsolation = debugSwitches.movementIsolationEnabled !== false;

      // --- PLAYER SHIP CONTROLS & PRODUCTION MOVEMENT CORE (Phase 18) ---
      if (playerState.hull > 0) {
        // 1. Gather player input intents
        let rudderTarget = 0;
        if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) rudderTarget = 1;
        if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) rudderTarget = -1;

        let sailAdjustDelta = 0;
        if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) sailAdjustDelta += dt * 0.5;
        if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) sailAdjustDelta -= dt * 0.5;

        let renderState: ShipRenderState;
        let outboundCommands: any[] = [];

        if (useIsolation) {
          // 2. Reconcile with server authoritative state (if connected)
          if (networkClient) {
            const authState = networkClient.getAuthoritativePlayerState();
            if (authState && authState.serverTick > playerState.lastReconciledTick) {
              playerState.lastReconciledTick = authState.serverTick;
              movementController.reconcileAuthoritativeState(authState, windFromRad);
            }
          }

          // 3. Fixed Simulation Tick, Prediction, Sub-tick Interpolation & Transform Presentation
          const updateResult = movementController.update(
            {
              rudderTarget,
              sailAdjustDelta,
            },
            dt,
            windFromRad,
            getWaveHeight,
            globalTime,
            playerMesh,
            playerWake
          );
          renderState = updateResult.renderState;
          outboundCommands = updateResult.outboundCommands;
        } else {
          // Fallback path when experiment toggle is OFF:
          // Keep ShipPresentationOwner as the single writer so player ship is guaranteed visible & rendered
          if (rudderTarget !== 0) {
            playerState.rudder = THREE.MathUtils.clamp(playerState.rudder + rudderTarget * dt * 2.0, -1, 1);
          } else {
            playerState.rudder = THREE.MathUtils.damp(playerState.rudder, 0, 4.0, dt);
          }
          if (sailAdjustDelta !== 0) {
            playerState.sailSetting = THREE.MathUtils.clamp(playerState.sailSetting + sailAdjustDelta, 0, 1);
          }
          const turnSpeed = (playerSpec.turnRate || 20) * (Math.PI / 180) * 0.15;
          playerState.heading += playerState.rudder * turnSpeed * dt * (playerState.speedKnots / Math.max(1, playerSpec.baseSpeed));
          const targetKnots = playerSpec.baseSpeed * playerState.sailSetting;
          playerState.speedKnots = THREE.MathUtils.damp(playerState.speedKnots, targetKnots, 1.5, dt);
          
          const vel = (playerState.speedKnots * 0.514444) * dt;
          playerState.pos.x += Math.sin(playerState.heading) * vel;
          playerState.pos.z += Math.cos(playerState.heading) * vel;
          playerState.pos.y = getWaveHeight(playerState.pos.x, playerState.pos.z, globalTime);

          renderState = {
            x: playerState.pos.x,
            y: playerState.pos.y,
            z: playerState.pos.z,
            pitch: 0,
            heading: playerState.heading,
            roll: -playerState.rudder * 0.1,
            speedKnots: playerState.speedKnots,
            rudder: playerState.rudder,
            sailSetting: playerState.sailSetting,
            wakeScale: Math.max(0.1, playerState.speedKnots / 5.0),
            wakeVisible: playerState.speedKnots > 0.5,
            presentationTimestamp: performance.now(),
          };
          movementController.getPresentationOwner().applyRenderState(playerMesh, playerWake, renderState);
        }

        // 4. Send movement commands to MMO server (Phase 1: Throttled to input state change or 5 Hz heartbeat)
        if (networkClient && outboundCommands.length > 0) {
          const inputChanged =
            Math.abs(rudderTarget - lastSentRudder) > 0.01 ||
            Math.abs(sailAdjustDelta - lastSentSailDelta) > 0.001;
          const heartbeatDue = (now - lastSentCommandTimestamp) >= 200; // 5 Hz (every 200ms)

          if (inputChanged || heartbeatDue) {
            const latestCmd = outboundCommands[outboundCommands.length - 1];
            networkClient.sendMovementCommand(latestCmd);
            lastSentRudder = rudderTarget;
            lastSentSailDelta = sailAdjustDelta;
            lastSentCommandTimestamp = now;
          }
        }

        // 5. Sync playerState properties with canonical simulation & render state
        playerState.pos.x = renderState.x;
        playerState.pos.y = renderState.y;
        playerState.pos.z = renderState.z;
        playerState.heading = renderState.heading;
        playerState.speedKnots = renderState.speedKnots;
        playerState.rudder = renderState.rudder;
        playerState.sailSetting = renderState.sailSetting;
        playerState.pitchAngle = renderState.pitch;
        playerState.rollAngle = renderState.roll;

        // --- PHYSICAL COLLISION RESOLUTION ---
        const playerRadius = (playerSpec.length || 45) * 0.40;

        // 1. Island, Shoal & Northern Mainland Collision
        const landCol = VoyageCollisionSystem.resolveLandCollision(
          playerState.pos,
          playerRadius,
          playerState.speedKnots,
          playerState.heading,
          globalTime
        );
        if (landCol.collided) {
          movementController.applyCollisionImpulse(0.30, landCol.damage);
          playerState.speedKnots *= 0.30;
          if (landCol.damage > 0) {
            playerState.hull = Math.max(0, playerState.hull - landCol.damage);
          }
          if (landCol.logMessage) {
            statusRef.current.combatLog.unshift(landCol.logMessage);
          }
        }

        // 2. Ship-to-Ship Collision (Player vs Nearby NPC & MMO Vessels)
        const nearbyTargets = fleetManager.getSpatialGrid().queryRadius(
          playerState.pos.x,
          playerState.pos.z,
          playerRadius + 50
        );
        for (let sIdx = 0; sIdx < nearbyTargets.length; sIdx++) {
          const targetId = nearbyTargets[sIdx].id;
          const enemyShip = enemyById.get(targetId);
          if (enemyShip && !enemyShip.isSinking) {
            const enemyRadius = (enemyShip.spec.length || 32) * 0.40;
            const shipCol = VoyageCollisionSystem.resolveShipToShipCollision(
              playerState.pos,
              playerRadius,
              playerState.speedKnots,
              enemyShip.pos,
              enemyRadius,
              enemyShip.speed,
              globalTime
            );
            if (shipCol.collided) {
              movementController.applyCollisionImpulse(0.60, shipCol.rammingDamageA);
              playerState.speedKnots *= 0.60;
              enemyShip.speed *= 0.60;
              if (shipCol.rammingDamageA > 0) {
                playerState.hull = Math.max(0, playerState.hull - shipCol.rammingDamageA);
                enemyShip.hull = Math.max(0, enemyShip.hull - shipCol.rammingDamageB);

                // Spawn wood splinter particles at contact point from pool
                for (let sp = 0; sp < 3; sp++) {
                  const spVel = VoyageObjectPool.scratchVec2.set(
                    (Math.random() - 0.5) * 6,
                    3 + Math.random() * 2,
                    (Math.random() - 0.5) * 6
                  );
                  const spPart = VoyageObjectPool.acquireParticle(shipCol.contactPoint, spVel, 0.6, 1.2);
                  if (spPart) {
                    particles.push(spPart as unknown as Particle);
                  }
                }
                statusRef.current.combatLog.unshift(`⚠️ Ramming collision with ${enemyShip.name}! Decks shudder! -${shipCol.rammingDamageA} HP`);
              }
            }
          }
        }

        // Persist transform in refs so re-renders never wipe ship coordinates
        persistentPlayerPosRef.current.copy(playerState.pos);
        persistentPlayerHeadingRef.current = playerState.heading;
        persistentPlayerSpeedRef.current = playerState.speedKnots;
        persistentPlayerSailSettingRef.current = playerState.sailSetting;
        persistentPlayerHullRef.current = playerState.hull;
        persistentPlayerSailsRef.current = playerState.sails;
        persistentPlayerCrewRef.current = playerState.crew;

        // Reload recharge
        playerState.portReload = Math.min(1.0, playerState.portReload + dt * 0.25);
        playerState.starboardReload = Math.min(1.0, playerState.starboardReload + dt * 0.25);
      } else {
        // Player flagship hull defeated: smooth sinking presentation
        playerMesh.position.y -= dt * 1.2;
        playerMesh.rotation.z += dt * 0.04;
        playerMesh.rotation.x -= dt * 0.02;
      }

      // --- CINEMATIC CHASE & ORBIT CAMERA WITH PRESETS ---
      if (!isDragging) {
        const preset = cameraPresetRef.current || 'quarterdeck';
        let targetYaw = 0.35; // Elevated 3/4 quarterdeck view
        let targetPitch = 0.30; // ~17 degrees elevation
        let targetDist = 88; // Frames full hull, masts, wake, and horizon without clipping

        if (preset === 'helm') {
          targetYaw = 0.05;
          targetPitch = 0.22;
          targetDist = 36;
        } else if (preset === 'bow') {
          targetYaw = Math.PI - 0.35; // Looking directly at the carved bow figurehead
          targetPitch = 0.24;
          targetDist = 44;
        } else if (preset === 'broadside_port') {
          targetYaw = -Math.PI * 0.48;
          targetPitch = 0.18;
          targetDist = 58;
        } else if (preset === 'broadside_starboard') {
          targetYaw = Math.PI * 0.48;
          targetPitch = 0.18;
          targetDist = 58;
        } else if (preset === 'lookout') {
          targetYaw = 0.0;
          targetPitch = 0.45;
          targetDist = 95;
        }

        if (preset !== 'free') {
          camOrbitYaw = THREE.MathUtils.lerp(camOrbitYaw, targetYaw, dt * 2.5);
          camOrbitPitch = THREE.MathUtils.lerp(camOrbitPitch, targetPitch, dt * 2.5);
          camOrbitDist = THREE.MathUtils.lerp(camOrbitDist, targetDist, dt * 2.5);
        }
      }

      const totalYaw = playerState.heading + Math.PI + camOrbitYaw;
      const camTargetX = playerState.pos.x + Math.sin(totalYaw) * Math.cos(camOrbitPitch) * camOrbitDist;
      const camTargetY = playerState.pos.y + Math.sin(camOrbitPitch) * camOrbitDist + 6.5;
      const camTargetZ = playerState.pos.z + Math.cos(totalYaw) * Math.cos(camOrbitPitch) * camOrbitDist;

      if (Number.isFinite(camTargetX) && Number.isFinite(camTargetY) && Number.isFinite(camTargetZ)) {
        _camTargetVec.set(camTargetX, camTargetY, camTargetZ);
        camera.position.lerp(_camTargetVec, dt * 4.0);
      }

      if (cameraPresetRef.current === 'bow') {
        if (Number.isFinite(playerState.pos.x) && Number.isFinite(playerState.pos.y) && Number.isFinite(playerState.pos.z)) {
          camera.lookAt(playerState.pos.x, playerState.pos.y + 6.0, playerState.pos.z);
        }
      } else {
        const lookAheadDist = 26;
        const lookX = playerState.pos.x + Math.sin(playerState.heading) * lookAheadDist;
        const lookY = playerState.pos.y + 6.5;
        const lookZ = playerState.pos.z + Math.cos(playerState.heading) * lookAheadDist;
        if (Number.isFinite(lookX) && Number.isFinite(lookY) && Number.isFinite(lookZ)) {
          _lookAheadVec.set(lookX, lookY, lookZ);
          camera.lookAt(_lookAheadVec);
        }
      }
      camera.updateMatrixWorld(true);

      // --- DYNAMIC TIME OF DAY SKY & LIGHTING (Zero Per-Frame Allocation) ---
      const tod = timeOfDayRef.current || 'day';
      if (tod !== lastAppliedTod) {
        lastAppliedTod = tod;
        if (tod === 'sunset') {
          ambientLight.color.setHex(0xfbcfe8);
          ambientLight.intensity = 0.75;
          sun.color.setHex(0xf97316);
          sun.intensity = 2.4;
          if (scene.background && (scene.background as THREE.Color).isColor) {
            (scene.background as THREE.Color).setHex(0xc2410c);
          }
          if (scene.fog) {
            scene.fog.color.setHex(0xc2410c);
            (scene.fog as THREE.Fog).near = 400;
            (scene.fog as THREE.Fog).far = 3000;
          }
          if (water && (water as any).material?.uniforms) {
            (water as any).material.uniforms['sunColor'].value.setHex(0xf97316);
            (water as any).material.uniforms['waterColor'].value.setHex(0x081f30);
          }
        } else if (tod === 'night') {
          ambientLight.color.setHex(0x1e293b);
          ambientLight.intensity = 0.4;
          sun.color.setHex(0x94a3b8);
          sun.intensity = 0.85;
          if (scene.background && (scene.background as THREE.Color).isColor) {
            (scene.background as THREE.Color).setHex(0x020617);
          }
          if (scene.fog) {
            scene.fog.color.setHex(0x020617);
            (scene.fog as THREE.Fog).near = 300;
            (scene.fog as THREE.Fog).far = 2500;
          }
          if (water && (water as any).material?.uniforms) {
            (water as any).material.uniforms['sunColor'].value.setHex(0x93c5fd);
            (water as any).material.uniforms['waterColor'].value.setHex(0x010b14);
          }
        } else {
          // Daylight
          ambientLight.color.setHex(0xbae6fd);
          ambientLight.intensity = 0.95;
          sun.color.setHex(0xfffbeb);
          sun.intensity = 2.0;
          if (scene.background && (scene.background as THREE.Color).isColor) {
            (scene.background as THREE.Color).setHex(0x38bdf8);
          }
          if (scene.fog) {
            scene.fog.color.setHex(0x38bdf8);
            (scene.fog as THREE.Fog).near = 500;
            (scene.fog as THREE.Fog).far = 3500;
          }
          if (water && (water as any).material?.uniforms) {
            (water as any).material.uniforms['sunColor'].value.setHex(0xfffbeb);
            (water as any).material.uniforms['waterColor'].value.setHex(0x021729);
          }
        }
      }

      // Sun follows player for endless horizon lighting
      sun.position.set(playerState.pos.x + 200, 300, playerState.pos.z + 150);
      sun.target.position.copy(playerState.pos);
      sun.target.updateMatrixWorld();

      // Advance realistic ocean water shader & scroll normal ripples
      if (water && (water as any).material?.uniforms) {
        (water as any).material.uniforms['time'].value += dt * 0.7;
        (water as any).material.uniforms['sunDirection'].value.copy(sun.position).normalize();
      }
      if (waterNormalMap) {
        waterNormalMap.offset.x += dt * 0.021;
        waterNormalMap.offset.y += dt * 0.014;
      }

      // Animate player flag & pennant fluttering in the wind
      if (playerMesh.userData?.flagNode) {
        playerMesh.userData.flagNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 4.2) * 0.22;
        playerMesh.userData.flagNode.rotation.z = Math.cos(globalTime * 3.1) * 0.08;
      }
      if (playerMesh.userData?.pennantNode) {
        playerMesh.userData.pennantNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 5.0 + 1.2) * 0.28;
      }

      // Animate player sweep oars if equipped (War Junks, Galleasses)
      if (playerMesh.userData?.oarsNodes && playerMesh.userData.oarsNodes.length > 0) {
        const oarAngle = Math.sin(globalTime * 3.2) * (playerState.speedKnots > 0.5 ? 0.28 : 0.06);
        playerMesh.userData.oarsNodes.forEach((oar: THREE.Group) => {
          oar.rotation.x = oarAngle;
        });
      }

      // --- CIRCLING SEAGULLS ANIMATION (Culled beyond 320m) ---
      seagulls.forEach((g) => {
        const dCam = camera.position.distanceTo(g.center);
        if (dCam > 320) {
          g.mesh.visible = false;
          return;
        }
        g.mesh.visible = true;
        g.angle += g.speed * dt;
        const gx = g.center.x + Math.cos(g.angle) * g.radius;
        const gz = g.center.z + Math.sin(g.angle) * g.radius;
        g.mesh.position.set(gx, g.y + Math.sin(globalTime * 2 + g.angle) * 2.5, gz);
        g.mesh.rotation.y = -g.angle + Math.PI * 0.5;
        g.mesh.rotation.z = Math.sin(globalTime * 8 + g.angle) * 0.28;
      });

      // --- FRUSTUM & VISIBILITY CULLING SETUP (Zero Heap Allocation) ---
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _cameraFrustum.setFromProjectionMatrix(_projScreenMatrix);

      // Culling distant & off-screen island havens (saves hundreds of static draw calls)
      islands.forEach((isl) => {
        if (!isl.mesh) return;
        const distToCam = camera.position.distanceTo(isl.pos);
        if (distToCam > 1800) {
          isl.mesh.visible = false;
          return;
        }
        _sphere.center.copy(isl.pos);
        _sphere.radius = isl.radius;
        const inView = distToCam < isl.radius + 80 || _cameraFrustum.intersectsSphere(_sphere);
        isl.mesh.visible = inView;
      });

      // Player flagship locked to LOD0 (100% full visual fidelity, realistic PBR wood, heraldry, lanterns, rigging)
      ShipLODController.updateShipLOD(playerMesh, 0, true);

      // --- PIRATE & LIVING WORLD FLEET SIMULATION LOD (Phase 2.6) ---
      let nearestEnemy: EnemyShip | null = null;
      let minDistance = Infinity;
      const isPlayerInTruce = playerState.pos.distanceTo(CAVE_SANCTUARY_POS) < 165;

      // Update full fleet simulation via time-sliced Simulation LOD & Spatial Grid
      fleetManager.updateFleetSimulation(
        dt,
        globalTime,
        playerState.pos,
        camera.position,
        _cameraFrustum,
        isPlayerInTruce,
        CAVE_SANCTUARY_POS,
        getWaveHeight,
        (enemyFleetEntity) => {
          // Wall 3: Pirate firing broadside at player via DeterministicProjectileSystem
          soundEngine.playCannonFire();
          for (let b = 0; b < 3; b++) {
            _aimVec.copy(playerState.pos).sub(enemyFleetEntity.pos).normalize();
            _aimVec.y += 0.15;
            _aimVec.x += (Math.random() - 0.5) * 0.1;
            _aimVec.z += (Math.random() - 0.5) * 0.1;

            const spawnPos = VoyageObjectPool.scratchVec1.copy(enemyFleetEntity.pos);
            spawnPos.y += 2.5;

            const ballVel = _aimVec.multiplyScalar(48.0);
            deterministicProjectiles.fire({
              origin: spawnPos,
              velocity: ballVel,
              fireTimestampSec: globalTime,
              damage: Math.round(40 + Math.random() * 20),
              fromPlayer: false,
              sourceEntityId: enemyFleetEntity.id,
              targetEntityId: 'player_flagship',
              targetPos: playerState.pos,
            });
          }
          statusRef.current.combatLog.unshift(`${enemyFleetEntity.name} fired a broadside at our ship!`);
        }
      );

      // --- BATCHED UI UPDATES & FLEET GPU INSTANCING ---
      uiManager.beginUpdate();
      fleetInstancer.beginFrame();

      // Animate visible ship secondary details & sinking ships
      enemySpecs.forEach((enemy) => {
        if (enemy.isSinking) {
          enemy.sinkTimer += dt;
          enemy.mesh.position.y -= dt * 1.5;
          enemy.mesh.rotation.z += dt * 0.1;
          enemy.mesh.rotation.x -= dt * 0.08;

          // Smoke from burning hull via object pool only if close
          if (camera.position.distanceTo(enemy.pos) <= 40 && Math.random() < 0.3) {
            const smokePos = VoyageObjectPool.scratchVec1.copy(enemy.pos).add(
              VoyageObjectPool.scratchVec2.set((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4)
            );
            const smokeVel = VoyageObjectPool.scratchVec2.set(0, 3.5, 0);
            const smoke = VoyageObjectPool.acquireParticle(smokePos, smokeVel, 1.5, 2.0);
            if (smoke) {
              particles.push(smoke as unknown as Particle);
            }
          }

          if (enemy.sinkTimer > 7.0 && enemy.mesh.parent) {
            scene.remove(enemy.mesh);
          }
          return;
        }

        const distToCam = camera.position.distanceTo(enemy.pos);

        // Wall 2: Disable wake trails on any ship further than 40 meters from camera
        if (enemy.wake) {
          enemy.wake.visible = distToCam <= 40;
        }

        // Wall 2: Planar reflection layer tagging
        if (distToCam > 40) {
          VoyageReflectionManager.tagMicroDetail(enemy.mesh);
        } else {
          VoyageReflectionManager.tagProminentReflective(enemy.mesh);
        }

        // Wall 2: Instanced mesh rendering for ships beyond 40m
        const useGpuInstancing = distToCam > 40 && distToCam <= 350;
        if (useGpuInstancing) {
          const archetype = FleetGPUInstancer.getArchetype(enemy.spec);
          fleetInstancer.addShipInstance(
            archetype,
            enemy.pos.x,
            enemy.mesh.position.y,
            enemy.pos.z,
            enemy.heading
          );
          enemy.mesh.visible = false;
        } else if (distToCam <= 40) {
          enemy.mesh.visible = true;
        }

        // Animate enemy sweep oars if equipped and visible
        if (enemy.mesh.visible && enemy.mesh.userData?.oarsNodes && enemy.mesh.userData.oarsNodes.length > 0) {
          const oarAngle = Math.sin(globalTime * 3.2 + enemy.pos.x * 0.05) * 0.26;
          enemy.mesh.userData.oarsNodes.forEach((oar: THREE.Group) => {
            oar.rotation.x = oarAngle;
          });
        }

        // Animate enemy flags fluttering if visible
        if (enemy.mesh.visible && enemy.mesh.userData?.flagNode) {
          enemy.mesh.userData.flagNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 3.8 + enemy.pos.x) * 0.22;
          enemy.mesh.userData.flagNode.rotation.z = Math.cos(globalTime * 2.9 + enemy.pos.z) * 0.08;
        }
        if (enemy.mesh.visible && enemy.mesh.userData?.pennantNode) {
          enemy.mesh.userData.pennantNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 4.6 + enemy.pos.x) * 0.26;
        }

        if (enemy.mesh.visible || useGpuInstancing) {
          const uiPos = VoyageObjectPool.scratchVec1.copy(enemy.pos);
          uiPos.y += 18.0;
          uiManager.addNameplate(uiPos, enemy.name, enemy.faction === 'pirates', 3.0);
          uiPos.y -= 1.5;
          uiManager.addHealthBar(uiPos, Math.max(0, enemy.hull / enemy.hullMax), 4.0, 0.4);
        }
      });

      // Phase 5: Batch Remote MMO ships into FleetGPUInstancer
      if (networkClient) {
        for (const remote of networkClient.getRemoteEntities().values()) {
          const distToCam = camera.position.distanceTo(remote.group.position);
          const useGpuInstancing = distToCam > 40 && distToCam <= 400;

          if (useGpuInstancing) {
            const spec = SHIP_CATALOG[remote.type] || SHIP_CATALOG.frigate;
            const archetype = FleetGPUInstancer.getArchetype(spec);
            fleetInstancer.addShipInstance(
              archetype,
              remote.group.position.x,
              remote.group.position.y,
              remote.group.position.z,
              remote.group.rotation.y
            );
            remote.group.visible = false;
          } else if (distToCam <= 40) {
            remote.group.visible = true;
          }

          const uiPos = VoyageObjectPool.scratchVec1.copy(remote.group.position);
          uiPos.y += 18.0;
          const isPirate = remote.faction === 'pirates';
          uiManager.addNameplate(uiPos, remote.name, isPirate, 3.0);
          uiPos.y -= 1.5;
          uiManager.addHealthBar(uiPos, Math.max(0, remote.health / remote.maxHealth), 4.0, 0.4);
        }
      }

      // End frame for GPU instancing: flushes instance matrices once per frame
      fleetInstancer.endFrame();

      // Add Player's own nameplate and health bar
      const playerUIPos = VoyageObjectPool.scratchVec1.copy(playerState.pos);
      playerUIPos.y += 18.0;
      uiManager.addNameplate(playerUIPos, auth.currentUser?.displayName || 'You', false, 3.0);
      playerUIPos.y -= 1.5;
      uiManager.addHealthBar(playerUIPos, Math.max(0, playerState.hull / playerState.hullMax), 4.0, 0.4);

      uiManager.endUpdate();

      // Spatial query for nearest target enemy (O(1) local bucket lookup instead of O(N) scan)
      const nearestSpatial = fleetManager.getSpatialGrid().queryNearest(
        playerState.pos.x,
        playerState.pos.z,
        600,
        (se) => {
          const ent = fleetManager.getEntityById(se.id);
          return ent !== undefined && !ent.isSinking;
        }
      );
      if (nearestSpatial) {
        minDistance = nearestSpatial.distance;
        nearestEnemy = enemyById.get(nearestSpatial.entity.id) || null;
      }

      // --- DETERMINISTIC PROJECTILE SYSTEM & BALLISTIC IMPACTS (Wall 3) ---
      deterministicProjectiles.update(globalTime, (impact) => {
        const distToCam = camera.position.distanceTo(impact.impactPos);

        if (impact.isHit && impact.targetEntityId) {
          soundEngine.playCannonHit();

          // Wall 2: Spawn splinter particles only within 40m of camera
          if (distToCam <= 40) {
            const hitVel = VoyageObjectPool.scratchVec2.set((Math.random() - 0.5) * 5, 4, (Math.random() - 0.5) * 5);
            const hitP = VoyageObjectPool.acquireParticle(impact.impactPos, hitVel, 0.5, 1.2);
            if (hitP) particles.push(hitP as unknown as Particle);
          }

          if (impact.targetEntityId === 'player_flagship') {
            playerState.hull = Math.max(0, playerState.hull - impact.damage);
            statusRef.current.combatLog.unshift(`Incoming cannonball hit our hull! -${impact.damage} HP`);
            if (playerState.hull <= 0 && onDefeatRef.current) {
              onDefeatRef.current();
            }
          } else {
            const enemy = enemyById.get(impact.targetEntityId);
            if (enemy && !enemy.isSinking) {
              enemy.hull = Math.max(0, enemy.hull - impact.damage);
              statusRef.current.combatLog.unshift(`Direct hit on ${enemy.name}! -${impact.damage} HULL!`);

              if (enemy.hull <= 0) {
                enemy.isSinking = true;
                const fleetEnt = fleetManager.getEntityById(enemy.id);
                if (fleetEnt) fleetEnt.isSinking = true;
                soundEngine.playBattleVictory();
                statusRef.current.combatLog.unshift(`VICTORY! ${enemy.name} has been sent to Davy Jones' Locker!`);
                spawnSalvage(enemy.pos.clone(), 'gold', 500);
                spawnSalvage(enemy.pos.clone().add(new THREE.Vector3(12, 0, 8)), 'gems', 50);
                spawnSalvage(enemy.pos.clone().add(new THREE.Vector3(-10, 0, 10)), 'relics', 1);
                if (onVictoryRef.current) onVictoryRef.current({ gold: 500, gems: 50, wood: 200, relics: 1 });
              }
            }
          }
        } else {
          // Water splash
          soundEngine.playWaterSplash();
          if (distToCam <= 40) {
            const splashVel = VoyageObjectPool.scratchVec2.set(0, 3.5, 0);
            const splash = VoyageObjectPool.acquireParticle(impact.impactPos, splashVel, 0.6, 1.5);
            if (splash) particles.push(splash as unknown as Particle);
          }
        }
      });

      // --- ZERO-ALLOCATION PARTICLES UPDATE ---
      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.life += dt;
        VoyageObjectPool.scratchVec1.copy(pt.velocity).multiplyScalar(dt);
        pt.mesh.position.add(VoyageObjectPool.scratchVec1);
        pt.mesh.scale.addScalar(pt.scaleGrowth * dt);

        if (pt.life >= pt.maxLife) {
          VoyageObjectPool.releaseParticle(pt as any);
          particles.splice(p, 1);
        }
      }

      // --- FLOATING SALVAGE LOOT PICKUP ---
      for (let l = floatingLoot.length - 1; l >= 0; l--) {
        const loot = floatingLoot[l];
        loot.mesh.position.y = getWaveHeight(loot.pos.x, loot.pos.z, globalTime) + 0.8 + Math.sin(globalTime * 3 + loot.bobOffset) * 0.3;
        loot.mesh.rotation.y += dt * 1.5;

        // Player collected loot by sailing near
        if (playerState.pos.distanceTo(loot.pos) < 12.0 && playerState.hull > 0) {
          soundEngine.playLootReward();
          statusRef.current.lootCollected[loot.type] += loot.amount;
          statusRef.current.combatLog.unshift(`Plundered floating salvage: +${loot.amount} ${loot.type.toUpperCase()}!`);

          scene.remove(loot.mesh);
          floatingLoot.splice(l, 1);
        }
      }

      // Phase 3: Animate counter-scrolling normal maps for SinglePassOceanMaterial
      if (water.material === singlePassWaterMaterial) {
        singlePassWaterMaterial.updateTime(globalTime);
      }

      // --- ISLAND PROXIMITY DETECTION ---
      let closestIsland: { id: string; name: string; distance: number } | null = null;
      islands.forEach((isl) => {
        const dist = playerState.pos.distanceTo(isl.pos);
        if (dist < isl.radius + 40) {
          closestIsland = { id: isl.id, name: isl.name, distance: Math.round(dist) };
        }
      });

      lastClosestIsland = closestIsland;
      lastNearestEnemy = nearestEnemy as EnemyShip;
      lastMinDist = minDistance;

      const canBoardNow = !!(nearestEnemy && minDistance < 48 && !(nearestEnemy as EnemyShip).isSinking);

      // Dynamic naval music and harbor arrival bell transitions
      if (closestIsland && closestIsland.distance < 65) {
        if (hasTolledBellForIsland !== closestIsland.id) {
          hasTolledBellForIsland = closestIsland.id;
          soundEngine.playShipBell();
          const islSpec = closestIsland ? islandById.get(closestIsland.id) : undefined;
          if (islSpec) {
            if (islSpec.nation === 'england') soundEngine.playNavalTrack('town_england');
            else if (islSpec.nation === 'france') soundEngine.playNavalTrack('town_france');
            else if (islSpec.nation === 'spain') soundEngine.playNavalTrack('town_spain');
            else if (islSpec.nation === 'holland') soundEngine.playNavalTrack('town_holland');
            else soundEngine.playNavalTrack('town_pirates');
          }
        }
      } else if (!closestIsland || closestIsland.distance > 90) {
        hasTolledBellForIsland = null;
        if (minDistance < 220 && !(nearestEnemy as EnemyShip)?.isSinking) {
          soundEngine.playNavalTrack('battle');
        } else if (minDistance > 380) {
          soundEngine.playNavalTrack('shanty');
        }
      }

      // Status emission to React parent (throttled to 2 Hz / 500ms)
      logUpdateTimer += dt;
      if (logUpdateTimer >= 0.5) {
        logUpdateTimer = 0;
        statusRef.current = {
          ...statusRef.current,
          playerHull: Math.round(playerState.hull),
          playerHullMax: playerState.hullMax,
          playerSails: Math.round(playerState.sails),
          playerSailsMax: playerState.sailsMax,
          playerCrew: playerState.crew,
          speedKnots: Math.round(playerState.speedKnots * 10) / 10,
          sailSetting: playerState.sailSetting,
          headingDeg: Math.round(THREE.MathUtils.euclideanModulo(playerState.heading * (180 / Math.PI), 360)),
          portReload: playerState.portReload,
          starboardReload: playerState.starboardReload,
          nearIsland: closestIsland,
          canBoard: canBoardNow,
          isTruceZone: isPlayerInTruce,
          targetEnemy: nearestEnemy
            ? {
              id: (nearestEnemy as EnemyShip).id,
              name: (nearestEnemy as EnemyShip).name,
              hull: Math.round((nearestEnemy as EnemyShip).hull),
              hullMax: (nearestEnemy as EnemyShip).hullMax,
              distance: Math.round(minDistance),
              crew: Math.round((nearestEnemy as EnemyShip).spec.crewMax * ((nearestEnemy as EnemyShip).hull / (nearestEnemy as EnemyShip).hullMax)),
              rank: (nearestEnemy as EnemyShip).spec.rank,
            }
            : null,
        };

        if (onStatusUpdateRef.current) {
          onStatusUpdateRef.current(statusRef.current);
        }
      }

      // Phase 2 adaptive performance monitoring
      VoyageQualityManager.updateFrame(dt, globalTime);

      // Phase 2.7 MMO Spatial World Partition & Area of Interest Update
      mmoPartition.setPlayerPosition(playerState.pos.x, playerState.pos.z, (nearestEnemy as EnemyShip)?.id || null);
      mmoPartition.updateAOI(globalTime * 1000);
      const mmoDiag = mmoPartition.getDiagnostics();

      // Phase 2.9: Process Authoritative Combat Events
      const combatEvents = networkClient?.popCombatEvents() || [];
      for (const pkt of combatEvents) {
         if (pkt.type === 'FIRE_CONFIRMED') {
            soundEngine.playCannonFire();
            const firePkt = pkt as any; // FireConfirmedPacket
            const isLocal = true; // For now assume we just play sound, actual visual projectiles can be simplified or skipped since server resolves hits.
            // But let's spawn visual muzzle flashes at least!
            statusRef.current.combatLog.unshift(`Broadside fired!`);
         } else if (pkt.type === 'DAMAGE_EVENT') {
            const dmgPkt = pkt as any; // DamageEventPacket
            soundEngine.playCannonHit();
            
            // Check if it's our ship taking damage
            if (dmgPkt.targetEntityId === networkClient?.getControlledEntityId()) {
               playerState.hull = dmgPkt.remainingHealth;
               statusRef.current.combatLog.unshift(`💥 We took ${dmgPkt.damage} damage! Hull at ${Math.round(playerState.hull)}`);
            } else {
               statusRef.current.combatLog.unshift(`🎯 Direct hit! Dealt ${dmgPkt.damage} damage!`);
            }
         } else if (pkt.type === 'SHIP_DEFEATED') {
            const defPkt = pkt as any;
            soundEngine.playShipCreak();
            statusRef.current.combatLog.unshift(`☠️ Ship defeated!`);
         }
      }
      if (statusRef.current.combatLog.length > 5) statusRef.current.combatLog.length = 5;

      // Phase 2.8 Real-Time MMO Network Client & Remote Ship Interpolation
      networkClient?.update(dt);
      const defaultMetrics = {
        state: 'DISCONNECTED' as const,
        pingMs: 0,
        serverTick: 0,
        remoteEntitiesCount: 0,
        messagesReceived: 0,
        messagesSent: 0,
        bytesReceived: 0,
        bytesSent: 0,
        reconnectAttempts: 0,
      };
      const netMetrics = networkClient?.getMetrics() || defaultMetrics;

      renderer.render(scene, camera);
      renderFrameCount++;

      // Record live diagnostics throttled to ~10 FPS to eliminate GC thrashing
      if (renderFrameCount % 6 === 0) {
        const info = renderer.info;
        const qSettings = VoyageQualityManager.getSettings();
        const activeVisual = 1 + enemySpecs.filter((e) => e.mesh?.visible && !e.isSinking).length;
        const fleetDiag = fleetManager.getDiagnostics(activeVisual);

        (window as any).__NAVAL_DIAGNOSTICS__ = {
          fps: Math.round(1 / Math.max(0.001, dt)),
          frameTimeMs: Math.round(dt * 1000 * 10) / 10,
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          points: info.render.points,
          lines: info.render.lines,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          activeShips: fleetDiag.activeShips,
          totalShips: fleetDiag.totalShips,
          visibleShips: fleetDiag.visibleShips,
          culledShips: fleetDiag.culledShips,
          lodCounts: fleetDiag.lodTiers,
          simTiers: fleetDiag.simTiers,
          pirateStats: fleetDiag.pirateStats,
          npcStats: {
            spawned: fleetDiag.totalShips,
            active: fleetDiag.activeShips,
            visible: fleetDiag.visibleShips,
            culled: fleetDiag.culledShips,
          },
          aiUpdatesThisFrame: fleetDiag.aiUpdatesThisFrame,
          aiUpdatesPerSec: fleetDiag.aiUpdatesPerSec,
          spatialGridEntities: fleetDiag.spatialGridEntities,
          poolStats: VoyageObjectPool.getActiveStats(),
          debugSwitches: VoyageDebugManager.getSwitches(),
          qualityTier: VoyageQualityManager.getTier(),
          reflectionStatus: VoyageReflectionManager.getStatusString(),
          shadowQuality: `${qSettings.shadowMapSize} / ${qSettings.shadowDistance}m`,
          rendererBackend: 'WebGL2',
          rendererOwnership: 'Three.js (Voyage Exclusive)',
          activeRenderLoops: 1,
          activeGPUContexts: 1,
          connectionState: `Real-Time MMO: ${netMetrics.state} (Ping: ${netMetrics.pingMs}ms, Tick: ${netMetrics.serverTick})`,
          netMetrics,
          remoteEntitiesCount: netMetrics.remoteEntitiesCount,
          mmoDiag,
        };
      }
    } catch (err) {
      (window as any).__VOYAGE_LAST_ERROR__ = err;
      console.error('[Voyage Render Loop Exception]:', err);
    }
  };

    animId = requestAnimationFrame(animate);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      VoyageReflectionManager.dispose();
      VoyageObjectPool.dispose();
      uiManager.dispose();
      fleetInstancer.dispose();
      deterministicProjectiles.dispose();
      networkClient?.destroy();
      soundEngine.stopNavalTrack();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();
      waterGeo.dispose();
      (water as any).material?.dispose?.();
      waterNormalMap.dispose();
    };
  }, [shipType]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
```

---

### File: src/components/world3d/VoyageNetworkClient.ts
```typescript
/**
 * REALM OF CROWNS — Client Real-Time MMO Network Bridge
 * Phase 2.8 MMO Architecture
 * 
 * Handles WebSocket connection, protocol negotiation, session authentication,
 * outbound throttled transforms/inputs, incoming AOI replication (SPAWN/DESPAWN/DELTA),
 * remote ship 3D mesh lifecycles, and smooth interpolation in Three.js.
 */

import * as THREE from 'three';
import {
  ROC_REALTIME_PROTOCOL_VERSION,
  MMOPacket,
  HelloPacket,
  AuthOkPacket,
  AuthErrorPacket,
  PingPacket,
  PongPacket,
  EntitySpawnPacket,
  EntityDespawnPacket,
  EntityDeltaPacket,
  PlayerInputPacket,
  DisconnectReasonPacket,
  unquantizeHeading,
  FireRequestPacket,
  FireConfirmedPacket,
  DamageEventPacket,
  ShipDefeatedPacket
} from '../../shared/mmoProtocol';

import { ClientEntityInterpolator } from './MMOWorldPartition';
import { MovementInputCommand, ShipSimulation, createDefaultShipSimulationState } from '../../shared/movement/index';

export type NetworkConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface RemoteEntityDisplay {
  entityId: string;
  name: string;
  type: string;
  faction: string;
  group: THREE.Group;
  hullMesh?: THREE.Mesh;
  sailMeshes: THREE.Mesh[];
  interpolator: ClientEntityInterpolator;
  lastDeltaTimestamp: number;
  health: number;
  maxHealth: number;
  networkLOD: number;
}

export interface NetworkClientMetrics {
  state: NetworkConnectionState;
  pingMs: number;
  serverTick: number;
  remoteEntitiesCount: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  reconnectAttempts: number;
}

export interface PendingInput {
  sequence: number;
  rudder: number;
  throttle: number;
  dt: number;
  timestamp: number;
}

export interface ReconciliationMetrics {
  pendingInputCount: number;
  lastSentSequence: number;
  lastAcknowledgedSequence: number;
  predictionError: number;
  smoothCorrectionsPerSec: number;
  hardSnapsPerSec: number;
}

export class VoyageNetworkClient {
  private socket: WebSocket | null = null;
  private wsUrl: string;
  private authToken: string;
  private scene: THREE.Scene;

  private state: NetworkConnectionState = 'DISCONNECTED';
  private assignedPlayerId: string | null = null;
  private controlledEntityId: string | null = null;
  private serverTickRate = 30;
  private serverTimeOffset = 0; // serverTimestamp - clientTimestamp
  private latestServerTick = 0;

  // Combat Events Queue for React/Three.js to consume
  private combatEventQueue: MMOPacket[] = [];

  // Remote replicated entities
  private remoteEntities: Map<string, RemoteEntityDisplay> = new Map();

  // Phase 2.9: Server-Authoritative reconciliation state
  private authoritativePlayerState: {
    x: number;
    z: number;
    heading: number;
    speedKnots: number;
    serverTick: number;
    lastProcessedInputSequence?: number;
  } | null = null;

  // Pending inputs & acknowledgement history (bounded)
  private pendingInputs: PendingInput[] = [];
  private lastAcknowledgedSequence = -1;
  private predictionError = 0;
  private smoothCorrectionCount = 0;
  private hardSnapCount = 0;
  private smoothCorrectionsPerSec = 0;
  private hardSnapsPerSec = 0;
  private lastCorrectionRateTimestamp = performance.now();
  private recentSmoothCount = 0;
  private recentHardCount = 0;

  // Throttled client send state (30 Hz = 33.3ms)
  private lastSendTimestamp = 0;
  private readonly SEND_INTERVAL_MS = 33.33;
  private inputSequence = 0;

  // Heartbeat & Ping
  private pingInterval: any = null;
  private pingSequence = 0;
  private pingMs = 0;

  // Reconnection
  private reconnectAttempts = 0;
  private reconnectTimeout: any = null;
  private isDestroyed = false;

  // Telemetry metrics
  private messagesReceived = 0;
  private messagesSent = 0;
  private bytesReceived = 0;
  private bytesSent = 0;

  // Shared reusable geometries & materials for remote ships
  private static sharedHullGeometry: THREE.BufferGeometry | null = null;
  private static sharedSailGeometry: THREE.BufferGeometry | null = null;

  constructor(scene: THREE.Scene, authToken: string, customWsUrl?: string) {
    this.scene = scene;
    this.authToken = authToken;

    if (customWsUrl) {
      this.wsUrl = customWsUrl;
    } else {
      const loc = typeof window !== 'undefined' ? window.location : null;
      const protocol = loc && loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = loc ? loc.host : 'localhost:3000';
      this.wsUrl = `${protocol}//${host}/ws`;
    }

    VoyageNetworkClient.initSharedMeshes();
  }

  private static initSharedMeshes(): void {
    if (!VoyageNetworkClient.sharedHullGeometry) {
      // Procedural streamlined hull geometry for remote ships
      VoyageNetworkClient.sharedHullGeometry = new THREE.BoxGeometry(4.0, 3.2, 14.0);
    }
    if (!VoyageNetworkClient.sharedSailGeometry) {
      VoyageNetworkClient.sharedSailGeometry = new THREE.PlaneGeometry(6.0, 7.5);
    }
  }

  public connect(): void {
    if (this.isDestroyed || this.state === 'CONNECTED' || this.state === 'CONNECTING') {
      return;
    }

    this.state = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING';

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.state = 'CONNECTING';
        this.sendHello();
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        this.handleDisconnect();
      };

      this.socket.onerror = () => {
        this.handleDisconnect();
      };
    } catch (err) {
      this.handleDisconnect();
    }
  }

  private sendHello(): void {
    const hello: HelloPacket = {
      type: 'HELLO',
      protocolVersion: ROC_REALTIME_PROTOCOL_VERSION,
      authToken: this.authToken,
      clientTimestamp: Date.now(),
    };
    this.sendPacket(hello);
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.state === 'CONNECTED') {
        const ping: PingPacket = {
          type: 'PING',
          clientTimestamp: Date.now(),
          sequence: ++this.pingSequence,
        };
        this.sendPacket(ping);
      }
    }, 5000);
  }

  private handleMessage(raw: any): void {
    this.messagesReceived++;
    const str = typeof raw === 'string' ? raw : raw.toString();
    this.bytesReceived += str.length;

    try {
      const packet = JSON.parse(str) as MMOPacket;
      switch (packet.type) {
        case 'AUTH_OK': {
          const p = packet as AuthOkPacket;
          this.assignedPlayerId = p.playerId;
          this.controlledEntityId = p.entityId;
          this.serverTickRate = p.serverTickRate;
          this.serverTimeOffset = p.serverTimestamp - Date.now();
          this.state = 'CONNECTED';
          break;
        }

        case 'AUTH_ERROR': {
          this.state = 'DISCONNECTED';
          break;
        }

        case 'PONG': {
          const p = packet as PongPacket;
          this.pingMs = Math.max(0, Date.now() - p.clientTimestamp);
          break;
        }

        case 'ENTITY_SPAWN': {
          this.handleEntitySpawn(packet as EntitySpawnPacket);
          break;
        }

        case 'ENTITY_DESPAWN': {
          this.handleEntityDespawn(packet as EntityDespawnPacket);
          break;
        }

        case 'ENTITY_DELTA': {
          this.handleEntityDelta(packet as EntityDeltaPacket);
          break;
        }

        case 'DISCONNECT_REASON': {
          break;
        }

        case 'FIRE_CONFIRMED':
        case 'DAMAGE_EVENT':
        case 'SHIP_DEFEATED': {
          this.combatEventQueue.push(packet);
          break;
        }
      }
    } catch (err) {
      // Malformed packet pass-through
    }
  }

  private handleEntitySpawn(pkt: EntitySpawnPacket): void {
    // Avoid creating a duplicate visual mesh for our own ship
    if (pkt.entityId === this.controlledEntityId) return;
    
    // Phase 2.9: Projectiles are invisible server-side objects for collision
    // The client uses FIRE_CONFIRMED to spawn client-side visual effects
    if (pkt.entityType === 'projectile') return;

    // Remove existing if already present
    if (this.remoteEntities.has(pkt.entityId)) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: pkt.entityId, reason: 'out_of_aoi', serverTimestamp: pkt.serverTimestamp });
    }

    const group = new THREE.Group();
    group.name = `remote_ship_${pkt.entityId}`;
    group.position.set(pkt.transform.x, pkt.transform.y, pkt.transform.z);
    group.rotation.y = pkt.transform.heading;

    // Procedural Hull
    const isPirate = pkt.entityType === 'pirate_ship';
    const hullMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x221111 : 0x2b394a,
      roughness: 0.6,
      metalness: 0.1,
    });
    const hullMesh = new THREE.Mesh(VoyageNetworkClient.sharedHullGeometry!, hullMat);
    hullMesh.position.y = 1.0;
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    group.add(hullMesh);

    // Procedural Mast & Sails
    const sailMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x6a1b1a : 0xf4ecd8,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const sailMeshes: THREE.Mesh[] = [];

    // Main mast
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.3, 14.0, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9 });
    const mastMesh = new THREE.Mesh(mastGeo, mastMat);
    mastMesh.position.y = 7.0;
    group.add(mastMesh);

    // Main sail
    const sailMesh = new THREE.Mesh(VoyageNetworkClient.sharedSailGeometry!, sailMat);
    sailMesh.position.set(0, 8.5, 0.4);
    group.add(sailMesh);
    sailMeshes.push(sailMesh);

    // Nameplates and Health bars will now be batched by InstancedUIManager
    // inside NavalSeaCanvas.tsx to eliminate DOM / Sprite draw call overhead.

    this.scene.add(group);

    const interpolator = new ClientEntityInterpolator({
      x: pkt.transform.x,
      y: pkt.transform.y,
      z: pkt.transform.z,
      heading: pkt.transform.heading,
      speedKnots: pkt.transform.speedKnots,
    });

    this.remoteEntities.set(pkt.entityId, {
      entityId: pkt.entityId,
      name: pkt.name,
      type: pkt.entityType,
      faction: pkt.faction,
      group,
      hullMesh,
      sailMeshes,
      interpolator,
      lastDeltaTimestamp: performance.now(),
      health: pkt.health,
      maxHealth: pkt.maxHealth,
      networkLOD: pkt.networkLOD,
    });
  }

  private handleEntityDespawn(pkt: EntityDespawnPacket): void {
    const entry = this.remoteEntities.get(pkt.entityId);
    if (!entry) return;

    this.scene.remove(entry.group);

    // Dispose geometries and materials
    entry.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.remoteEntities.delete(pkt.entityId);
  }

  private handleEntityDelta(pkt: EntityDeltaPacket): void {
    this.latestServerTick = Math.max(this.latestServerTick, pkt.serverTick);
    
    // Capture authoritative state for local player reconciliation
    if (pkt.entityId === this.controlledEntityId) {
      const ackSeq = typeof pkt.lastProcessedInputSequence === 'number' && Number.isFinite(pkt.lastProcessedInputSequence)
        ? pkt.lastProcessedInputSequence
        : -1;

      // Discard acknowledged inputs <= ackSeq
      if (ackSeq >= 0) {
        this.lastAcknowledgedSequence = ackSeq;
        this.pendingInputs = this.pendingInputs.filter((inp) => inp.sequence > ackSeq);
      }

      const rawX = pkt.exactX ?? pkt.x;
      const rawZ = pkt.exactZ ?? pkt.z;
      const rawHeading = pkt.exactHeading ?? unquantizeHeading(pkt.headingQuantized);
      const rawSpeed = pkt.speedKnots;

      if (Number.isFinite(rawX) && Number.isFinite(rawZ) && Number.isFinite(rawHeading) && Number.isFinite(rawSpeed)) {
        this.authoritativePlayerState = {
          x: rawX,
          z: rawZ,
          heading: rawHeading,
          speedKnots: rawSpeed,
          serverTick: pkt.serverTick,
          lastProcessedInputSequence: ackSeq,
        };
      }
      return;
    }

    const entry = this.remoteEntities.get(pkt.entityId);
    if (!entry) return;

    entry.lastDeltaTimestamp = performance.now();
    entry.health = pkt.health;

    // Push into Hermite/Linear interpolator
    entry.interpolator.pushDelta(
      {
        packetType: 'delta',
        entityId: pkt.entityId,
        serverTimestamp: pkt.serverTimestamp,
        x: pkt.x,
        z: pkt.z,
        headingQuantized: pkt.headingQuantized,
        speedKnots: pkt.speedKnots,
        health: pkt.health,
        stateFlags: pkt.stateFlags,
      },
      performance.now()
    );
  }

  /**
   * Called every frame in the Three.js render loop.
   * Interpolates remote entities smoothly at 60 FPS.
   */
  public update(_deltaTimeSec: number): void {
    const now = performance.now();

    for (const remote of this.remoteEntities.values()) {
      const transform = remote.interpolator.sample(now, 150);
      remote.group.position.x = transform.x;
      remote.group.position.z = transform.z;
      remote.group.rotation.y = transform.heading;

      // Subtle roll with speed
      const rollAngle = Math.sin(now * 0.003) * 0.04 * (transform.speedKnots / 10);
      remote.group.rotation.z = rollAngle;
    }
  }

  /**
   * Transmits local ship transform and input stream to the server (throttled to 30 Hz).
   */
  public sendLocalTransform(
    x: number,
    y: number,
    z: number,
    heading: number,
    speedKnots: number,
    rudder = 0,
    throttle = 1
  ): void {
    if (this.state !== 'CONNECTED' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = performance.now();
    if (now - this.lastSendTimestamp < this.SEND_INTERVAL_MS) {
      return;
    }
    this.lastSendTimestamp = now;

    // Send input intent packet (foundation for Phase 2.9 server authority)
    const seq = this.inputSequence++;
    const inputPkt: PlayerInputPacket = {
      type: 'PLAYER_INPUT',
      sequence: seq,
      clientTimestamp: Date.now(),
      rudder,
      throttle,
      desiredHeading: heading,
    };
    this.sendPacket(inputPkt);

    // Save pending input for prediction replay (bounded to 120 entries)
    this.pendingInputs.push({
      sequence: seq,
      rudder,
      throttle,
      dt: this.SEND_INTERVAL_MS / 1000,
      timestamp: now,
    });
    if (this.pendingInputs.length > 120) {
      this.pendingInputs.shift();
    }
  }

  /**
   * Phase 18: Transmits explicit MovementInputCommand from the PlayerMovementController.
   */
  public sendMovementCommand(cmd: MovementInputCommand): void {
    if (this.state !== 'CONNECTED' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const inputPkt: PlayerInputPacket = {
      type: 'PLAYER_INPUT',
      sequence: cmd.sequence,
      clientTimestamp: Date.now(),
      rudder: cmd.rudderTarget,
      throttle: cmd.sailSettingTarget,
    };
    this.sendPacket(inputPkt);
  }

  public sendFireRequest(broadside: 'port' | 'starboard', targetId?: string): void {
    const pkt: FireRequestPacket = {
      type: 'FIRE_REQUEST',
      broadside,
      clientTimestamp: Date.now(),
      targetEntityId: targetId
    };
    this.sendPacket(pkt);
  }

  public getControlledEntityId(): string | null {
    return this.controlledEntityId;
  }

  public popCombatEvents(): MMOPacket[] {
    const events = [...this.combatEventQueue];
    this.combatEventQueue = [];
    return events;
  }

  public getAuthoritativePlayerState() {
    return this.authoritativePlayerState;
  }

  public getPendingInputCount(): number {
    return this.pendingInputs.length;
  }

  public getLastAcknowledgedSequence(): number {
    return this.lastAcknowledgedSequence;
  }

  public getReconciliationMetrics(): ReconciliationMetrics {
    return {
      pendingInputCount: this.pendingInputs.length,
      lastSentSequence: Math.max(0, this.inputSequence - 1),
      lastAcknowledgedSequence: this.lastAcknowledgedSequence,
      predictionError: this.predictionError,
      smoothCorrectionsPerSec: this.smoothCorrectionsPerSec,
      hardSnapsPerSec: this.hardSnapsPerSec,
    };
  }

  /**
   * Reconciles current client prediction against server authoritative snapshot by replaying unacknowledged inputs.
   */
  public reconcilePlayerState(
    currentPos: { x: number; z: number },
    currentHeading: number,
    currentSpeed: number,
    dt: number,
    profile: { baseSpeed: number; turnRate: number; maxHealth: number } = { baseSpeed: 12.0, turnRate: 18.0, maxHealth: 500 },
    health = 500
  ): {
    x: number;
    z: number;
    heading: number;
    speedKnots: number;
    predictionError: number;
    tier: 'tiny' | 'small' | 'moderate' | 'severe';
  } {
    // Safety check inputs
    const validCurrentX = Number.isFinite(currentPos?.x) ? currentPos.x : 0;
    const validCurrentZ = Number.isFinite(currentPos?.z) ? currentPos.z : 0;
    const validCurrentHeading = Number.isFinite(currentHeading) ? currentHeading : 0;
    const validCurrentSpeed = Number.isFinite(currentSpeed) ? currentSpeed : 0;
    const validDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0.033;

    if (
      !this.authoritativePlayerState ||
      !Number.isFinite(this.authoritativePlayerState.x) ||
      !Number.isFinite(this.authoritativePlayerState.z) ||
      !Number.isFinite(this.authoritativePlayerState.heading) ||
      !Number.isFinite(this.authoritativePlayerState.speedKnots)
    ) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    const safeBaseSpeed = profile && Number.isFinite(profile.baseSpeed) && profile.baseSpeed > 0 ? profile.baseSpeed : 12.0;
    const safeTurnRate = profile && Number.isFinite(profile.turnRate) && profile.turnRate > 0 ? profile.turnRate : 18.0;
    const safeMaxHealth = profile && Number.isFinite(profile.maxHealth) && profile.maxHealth > 0 ? profile.maxHealth : 500;
    const safeHealth = Number.isFinite(health) ? health : safeMaxHealth;

    // 1. Replay unacknowledged pending inputs on top of authoritative snapshot via deterministic ShipSimulation.step
    let simState = createDefaultShipSimulationState({
      x: this.authoritativePlayerState.x,
      z: this.authoritativePlayerState.z,
      heading: this.authoritativePlayerState.heading,
      speedKnots: this.authoritativePlayerState.speedKnots,
      baseSpeed: safeBaseSpeed,
      turnRate: safeTurnRate,
      maxHull: safeMaxHealth,
      hull: safeHealth,
      maxSails: safeMaxHealth > 0 ? safeMaxHealth * 0.2 : 100,
      sails: safeHealth > 0 ? safeHealth * 0.2 : 100,
    });

    for (const inp of this.pendingInputs) {
      if (!inp || !Number.isFinite(inp.throttle) || !Number.isFinite(inp.rudder) || !Number.isFinite(inp.dt)) continue;
      const cmd: MovementInputCommand = {
        sequence: inp.sequence,
        clientTick: inp.sequence,
        timestamp: inp.timestamp,
        dt: inp.dt,
        rudderTarget: inp.rudder,
        sailSettingTarget: inp.throttle,
        braking: false,
        reverse: false,
        rudder: inp.rudder,
        sailSetting: inp.throttle,
      };
      simState = ShipSimulation.step(simState, cmd, inp.dt);
    }

    const simX = simState.x;
    const simZ = simState.z;
    const simHeading = simState.heading;
    const simSpeed = simState.speedKnots;

    // Safety fallback if simulation produced non-finite values
    if (!Number.isFinite(simX) || !Number.isFinite(simZ) || !Number.isFinite(simHeading) || !Number.isFinite(simSpeed)) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    // 2. Measure prediction error (divergence from replayed authority)
    const err = Math.hypot(validCurrentX - simX, validCurrentZ - simZ);
    this.predictionError = Number.isFinite(err) ? err : 0;

    // 3. Update rate counters
    const now = performance.now();
    const elapsedSec = (now - this.lastCorrectionRateTimestamp) / 1000;
    if (elapsedSec >= 1.0) {
      this.smoothCorrectionsPerSec = this.recentSmoothCount / elapsedSec;
      this.hardSnapsPerSec = this.recentHardCount / elapsedSec;
      this.recentSmoothCount = 0;
      this.recentHardCount = 0;
      this.lastCorrectionRateTimestamp = now;
    }

    // Shortest-path angular interpolation helper
    const angleLerp = (from: number, to: number, alpha: number): number => {
      let diff = to - from;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let res = from + diff * Math.min(1, Math.max(0, alpha));
      if (res > Math.PI * 2) res -= Math.PI * 2;
      if (res < 0) res += Math.PI * 2;
      return res;
    };

    // 4. Apply error tiers
    let tier: 'tiny' | 'small' | 'moderate' | 'severe' = 'tiny';
    let resX = validCurrentX;
    let resZ = validCurrentZ;
    let resHeading = validCurrentHeading;
    let resSpeed = validCurrentSpeed;

    if (err < 0.05) {
      // Tiny error (< 0.05m): ignore to prevent transform oscillation
      tier = 'tiny';
    } else if (err < 0.50) {
      // Small error: smooth convergence into the < 0.05m deadband
      tier = 'small';
      const blend = Math.min(1.0, validDt * 5.0);
      resX = THREE.MathUtils.lerp(validCurrentX, simX, blend);
      resZ = THREE.MathUtils.lerp(validCurrentZ, simZ, blend);
      resHeading = angleLerp(validCurrentHeading, simHeading, blend);
      resSpeed = THREE.MathUtils.lerp(validCurrentSpeed, simSpeed, blend);
      this.recentSmoothCount++;
    } else if (err < 3.0) {
      // Moderate error: faster correction
      tier = 'moderate';
      resX = THREE.MathUtils.lerp(validCurrentX, simX, validDt * 8.0);
      resZ = THREE.MathUtils.lerp(validCurrentZ, simZ, validDt * 8.0);
      resHeading = angleLerp(validCurrentHeading, simHeading, validDt * 8.0);
      resSpeed = THREE.MathUtils.lerp(validCurrentSpeed, simSpeed, validDt * 6.0);
      this.recentSmoothCount++;
    } else {
      // Severe / impossible divergence: hard snap
      tier = 'severe';
      resX = simX;
      resZ = simZ;
      resHeading = simHeading;
      resSpeed = simSpeed;
      this.recentHardCount++;
    }

    if (!Number.isFinite(resX) || !Number.isFinite(resZ) || !Number.isFinite(resHeading) || !Number.isFinite(resSpeed)) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    return {
      x: resX,
      z: resZ,
      heading: resHeading,
      speedKnots: resSpeed,
      predictionError: this.predictionError,
      tier,
    };
  }

  public sendPacket(packet: MMOPacket): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const json = JSON.stringify(packet);
      this.socket.send(json);
      this.messagesSent++;
      this.bytesSent += json.length;
      return true;
    } catch (_) {
      return false;
    }
  }

  private handleDisconnect(): void {
    if (this.isDestroyed) return;
    this.state = 'DISCONNECTED';

    // Cleanup ping
    if (this.pingInterval) clearInterval(this.pingInterval);

    // Clear remote entities
    for (const [id] of this.remoteEntities) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: id, reason: 'disconnected', serverTimestamp: Date.now() });
    }

    // Exponential backoff reconnect: 1s, 2s, 4s, up to 10s
    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts - 1));

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public getMetrics(): NetworkClientMetrics {
    return {
      state: this.state,
      pingMs: this.pingMs,
      serverTick: this.latestServerTick,
      remoteEntitiesCount: this.remoteEntities.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public getRemoteEntities(): Map<string, RemoteEntityDisplay> {
    return this.remoteEntities;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    if (this.socket) {
      try {
        this.socket.close();
      } catch (_) {}
      this.socket = null;
    }

    // Clean up meshes
    for (const [id] of this.remoteEntities) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: id, reason: 'disconnected', serverTimestamp: Date.now() });
    }
  }
}
```

---

### File: src/shared/movement/ShipSimulation.ts
```typescript
/**
 * REALM OF CROWNS — Shared Deterministic Ship Movement Simulation
 * Phase 18 Production Movement Architecture
 * 
 * Reusable movement simulation logic executed identically by:
 * 1. Client-side local prediction
 * 2. Client-side rollback & replay on server corrections
 * 3. Server-side authoritative player simulation
 * 4. Offline benchmark / verification tests
 */

import {
  ShipSimulationState,
  MovementInputCommand,
  ShipPhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
} from './ShipMovementTypes';

/**
 * Normalizes an angle in radians into the [0, 2*PI) range.
 */
export function normalizeAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  return ((rad % twoPi) + twoPi) % twoPi;
}

/**
 * Calculates the shortest angular difference from 'from' to 'to' in radians.
 */
export function angleDifference(from: number, to: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Helper to interpolate angles along the shortest arc.
 */
export function lerpAngle(from: number, to: number, alpha: number): number {
  const diff = angleDifference(from, to);
  return normalizeAngle(from + diff * Math.max(0, Math.min(1, alpha)));
}

/**
 * Simulates a single fixed step of ship motion.
 * 
 * Preserves the 1.8 arcade movement multiplier and existing naval control feel.
 * 
 * @param previous Previous authoritative or predicted simulation state
 * @param input Player intent command for this timestep
 * @param dt Timestep duration in seconds (e.g. 1/30 = 0.033333s)
 * @param customConfig Optional physics overrides
 * @returns The new simulation state
 */
export function simulateShip(
  previous: ShipSimulationState,
  input: MovementInputCommand,
  dt: number,
  customConfig?: Partial<ShipPhysicsConfig>
): ShipSimulationState {
  const config: ShipPhysicsConfig = {
    ...DEFAULT_PHYSICS_CONFIG,
    ...customConfig,
  };

  const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.2) : 0.033333;
  const safeBaseSpeed = Number.isFinite(previous.baseSpeed) && previous.baseSpeed > 0 ? previous.baseSpeed : 12.0;
  const safeTurnRate = Number.isFinite(previous.turnRate) && previous.turnRate > 0 ? previous.turnRate : 18.0;

  // 1. Rudder dynamic steering response
  const targetRudder = Math.max(-1.0, Math.min(1.0, input.rudderTarget ?? 0));
  const currentRudder = Number.isFinite(previous.rudder) ? previous.rudder : 0;
  const rudder = currentRudder + (targetRudder - currentRudder) * Math.min(1.0, safeDt * config.rudderResponseRate);

  // 2. Sail setting (throttle) adjustment
  let sailSetting = Number.isFinite(previous.sailSetting) ? previous.sailSetting : 0;
  if (input.braking) {
    sailSetting = Math.max(0.0, sailSetting - safeDt * 1.5);
  } else if (typeof input.sailSettingTarget === 'number') {
    const targetSail = Math.max(0.0, Math.min(1.0, input.sailSettingTarget));
    const delta = targetSail - sailSetting;
    const maxChange = safeDt * config.sailResponseRate;
    if (Math.abs(delta) <= maxChange) {
      sailSetting = targetSail;
    } else {
      sailSetting += Math.sign(delta) * maxChange;
    }
  }
  sailSetting = Math.max(0.0, Math.min(1.0, sailSetting));

  // 3. Wind dynamics
  const windFromRad = config.windAngleRad ?? 0;
  const angleToWind = Math.abs(
    ((((previous.heading - windFromRad + Math.PI) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2)) - Math.PI
  );
  let windMultiplier = 0.75 + Math.sin(angleToWind) * 0.25;
  if (angleToWind < 0.4) {
    windMultiplier = 0.5; // in irons (head to wind)
  }

  // 4. Sail health ratio
  const maxSails = Number.isFinite(previous.maxSails) && previous.maxSails > 0 ? previous.maxSails : 100;
  const sails = Number.isFinite(previous.sails) ? previous.sails : maxSails;
  const sailHealthMult = Math.max(0.2, sails / maxSails);

  // 5. Target speed & linear acceleration
  const targetKnots = safeBaseSpeed * sailSetting * windMultiplier * sailHealthMult;
  const currentSpeed = Number.isFinite(previous.speedKnots) ? previous.speedKnots : 0;
  let speedKnots = currentSpeed + (targetKnots - currentSpeed) * Math.min(1.0, safeDt * config.accelerationRate);

  if (input.braking && speedKnots > 0) {
    speedKnots = Math.max(0.0, speedKnots - safeDt * 6.0);
  }
  if (input.reverse) {
    // Reverse propulsion (e.g. oars backing water)
    speedKnots = Math.max(-safeBaseSpeed * 0.35, speedKnots - safeDt * 3.0);
  }

  // 6. Turn rate scaling with speed
  const speedRatio = Math.max(0, speedKnots / safeBaseSpeed);
  const effectiveTurnRate = (safeTurnRate * (Math.PI / 180) * (speedRatio + 0.2)) * rudder;
  let heading = previous.heading + effectiveTurnRate * safeDt;
  heading = normalizeAngle(heading);

  // 7. Position advancement with 1.8 arcade movement multiplier
  const moveDist = speedKnots * config.arcadeSpeedMultiplier * safeDt;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);

  const posX = previous.x + forwardX * moveDist;
  const posZ = previous.z + forwardZ * moveDist;

  // 8. Construct next state with finite checks
  return {
    tick: previous.tick + 1,
    timestamp: previous.timestamp + Math.round(safeDt * 1000),
    x: Number.isFinite(posX) ? posX : previous.x,
    y: previous.y,
    z: Number.isFinite(posZ) ? posZ : previous.z,
    heading: Number.isFinite(heading) ? heading : previous.heading,
    speedKnots: Number.isFinite(speedKnots) ? speedKnots : 0,
    rudder: Number.isFinite(rudder) ? rudder : 0,
    sailSetting: Number.isFinite(sailSetting) ? sailSetting : 0,
    angularVelocity: effectiveTurnRate,
    pitchAngle: previous.pitchAngle,
    rollAngle: previous.rollAngle,
    hull: previous.hull,
    maxHull: previous.maxHull,
    sails: previous.sails,
    maxSails: previous.maxSails,
    baseSpeed: safeBaseSpeed,
    turnRate: safeTurnRate,
    length: previous.length,
    beam: previous.beam,
    lastAcknowledgedSequence: previous.lastAcknowledgedSequence,
  };
}

/**
 * Creates a default ship simulation state.
 */
export function createDefaultShipSimulationState(
  overrides?: Partial<ShipSimulationState>
): ShipSimulationState {
  return {
    tick: 0,
    timestamp: Date.now(),
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speedKnots: 0,
    rudder: 0,
    sailSetting: 0,
    angularVelocity: 0,
    pitchAngle: 0,
    rollAngle: 0,
    hull: 500,
    maxHull: 500,
    sails: 100,
    maxSails: 100,
    baseSpeed: 12.0,
    turnRate: 18.0,
    length: 45,
    beam: 12,
    lastAcknowledgedSequence: -1,
    ...overrides,
  };
}

/**
 * Unified ShipSimulation object conforming to client/reconciliation deterministic interface.
 */
export const ShipSimulation = {
  step: simulateShip,
  createDefaultState: createDefaultShipSimulationState,
  normalizeAngle,
  angleDifference,
  lerpAngle,
};
```

---

### File: src/shared/movement/SnapshotBuffer.ts
```typescript
/**
 * REALM OF CROWNS — Snapshot Buffer & Interpolation for Remote Entities
 * Phase 18 Production Movement Architecture
 * 
 * Bounded history of timestamped server snapshots.
 * Provides smooth hermite/linear interpolation with interpolation delay,
 * and bounded forward extrapolation when network packets are delayed.
 */

import { RemoteSnapshot } from './ShipMovementTypes';
import { lerpAngle } from './ShipSimulation';

export class SnapshotBuffer {
  public readonly maxCapacity: number;
  private snapshots: RemoteSnapshot[] = [];

  constructor(maxCapacity = 30) {
    this.maxCapacity = maxCapacity;
  }

  public pushSnapshot(snapshot: RemoteSnapshot): void {
    if (this.snapshots.length >= this.maxCapacity) {
      this.snapshots.shift();
    }
    this.snapshots.push(snapshot);
  }

  public getLatest(): RemoteSnapshot | undefined {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : undefined;
  }

  public size(): number {
    return this.snapshots.length;
  }

  public clear(): void {
    this.snapshots = [];
  }

  /**
   * Samples the buffer at a given render timestamp with interpolation delay.
   * 
   * @param renderTimestampMs Current presentation timestamp (performance.now() or Date.now())
   * @param interpolationDelayMs Target delay behind live server time (default 100ms)
   */
  public sample(renderTimestampMs: number, interpolationDelayMs = 100): RemoteSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) return this.snapshots[0];

    const targetTime = renderTimestampMs - interpolationDelayMs;
    const newest = this.snapshots[this.snapshots.length - 1];
    const oldest = this.snapshots[0];

    // If target time is older than our oldest snapshot, clamp to oldest
    if (targetTime <= oldest.serverTimestamp) {
      return oldest;
    }

    // If target time is newer than newest snapshot, perform bounded extrapolation
    if (targetTime > newest.serverTimestamp) {
      const extrapolationSec = Math.min((targetTime - newest.serverTimestamp) / 1000, 0.25); // Max 250ms
      const speedKnots = newest.speedKnots ?? 0;
      const moveDist = speedKnots * 1.8 * extrapolationSec; // 1.8 multiplier
      const forwardX = Math.sin(newest.heading);
      const forwardZ = Math.cos(newest.heading);

      return {
        ...newest,
        x: newest.x + forwardX * moveDist,
        z: newest.z + forwardZ * moveDist,
      };
    }

    // Find two surrounding snapshots for interpolation
    let p0 = oldest;
    let p1 = newest;
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (
        this.snapshots[i].serverTimestamp <= targetTime &&
        this.snapshots[i + 1].serverTimestamp >= targetTime
      ) {
        p0 = this.snapshots[i];
        p1 = this.snapshots[i + 1];
        break;
      }
    }

    const duration = p1.serverTimestamp - p0.serverTimestamp;
    const alpha = duration > 0 ? Math.max(0, Math.min(1, (targetTime - p0.serverTimestamp) / duration)) : 1;

    return {
      entityId: p1.entityId,
      serverTick: p1.serverTick,
      serverTimestamp: targetTime,
      x: p0.x + (p1.x - p0.x) * alpha,
      y: (p0.y ?? 0) + ((p1.y ?? 0) - (p0.y ?? 0)) * alpha,
      z: p0.z + (p1.z - p0.z) * alpha,
      heading: lerpAngle(p0.heading, p1.heading, alpha),
      speedKnots: p0.speedKnots + (p1.speedKnots - p0.speedKnots) * alpha,
      rudder: (p0.rudder ?? 0) + ((p1.rudder ?? 0) - (p0.rudder ?? 0)) * alpha,
      sailSetting: (p0.sailSetting ?? 0) + ((p1.sailSetting ?? 0) - (p0.sailSetting ?? 0)) * alpha,
      health: p1.health,
      stateFlags: p1.stateFlags,
    };
  }
}
```

---

### File: src/components/world3d/VoyageReflectionManager.ts
```typescript
/**
 * Realm of Crowns - Voyage Ocean Reflection Manager (Phase 2)
 * 
 * Optimizes the Three.js Water mirror reflection camera pass:
 * 1. Layer Masking: Isolates prominent reflection geometry (ship hulls, main masts, large bastions)
 *    on Layer 0 while directing micro-props (cannons, deck furniture, barrels, crates, ratlines)
 *    to Layer 1 (visible to the main camera, culled from the planar reflection pass).
 * 2. Throttled Update Frequency: Allows reflection passes to update at configurable frame intervals
 *    (e.g., 30 FPS or 15 FPS while the game runs at 60 FPS), cutting reflection draw calls by 50% to 75%.
 * 3. Mobile Bypassing: Safely disables the secondary render pass on LOW quality tiers.
 */

import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { VoyageQualityManager } from './VoyageQualityManager';

export const VOYAGE_LAYERS = {
  DEFAULT_AND_REFLECTION: 0, // Visible to both main camera and ocean reflection camera
  MICRO_DETAILS: 1,          // Visible ONLY to main camera (barrels, crates, cannons, tiny props)
  WATER_SURFACE: 2,          // Water mesh itself
} as const;

export class VoyageReflectionManager {
  private static waterInstance: Water | null = null;
  private static frameCounter = 0;
  private static updateInterval = 2; // Default: update reflection every 2nd frame (30 FPS)
  private static enabled = true;
  private static originalOnBeforeRender: ((renderer: any, scene: any, camera: any) => void) | null = null;

  public static initialize(water: Water, mainCamera: THREE.PerspectiveCamera, initialInterval = 2) {
    this.waterInstance = water;
    this.updateInterval = initialInterval;
    this.frameCounter = 0;
    this.enabled = initialInterval > 0;

    // Enable Layer 0 and Layer 1 on the main camera so player sees everything
    mainCamera.layers.enable(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    mainCamera.layers.enable(VOYAGE_LAYERS.MICRO_DETAILS);

    // Intercept water.onBeforeRender to inject throttling and layer masking
    const mirrorCamera = (water as any).material?.uniforms?.mirrorSampler ? (water as any).mirrorCamera : null;
    if (mirrorCamera) {
      // Mirror camera only renders Layer 0 (prominent hulls, masts, horizon structures)
      mirrorCamera.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    }

    if (typeof water.onBeforeRender === 'function') {
      this.originalOnBeforeRender = water.onBeforeRender.bind(water);

      water.onBeforeRender = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
        // Reflection isolation test: allow DEV bypass toggle or disabled interval
        const isBypassed = typeof window !== 'undefined' && (window as any).__BYPASS_REFLECTION__ === true;
        const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const qualityTier = VoyageQualityManager.getTier();
        const isLowTier = qualityTier !== 'HIGH';

        // Phase 3: Bypass planar reflection on mobile or below HIGH quality tier to halve active draw calls
        if (!this.enabled || this.updateInterval === 0 || isBypassed || isMobile || isLowTier) {
          return; // Skip reflection render completely
        }

        this.frameCounter++;
        // Always render on frame 1 so the reflection texture is populated immediately
        if (this.frameCounter > 1 && this.updateInterval > 1 && (this.frameCounter % this.updateInterval) !== 0) {
          return; // Use previous frame's reflection render target (50-75% draw call reduction)
        }

        // Configure mirror camera to only render Layer 0
        const mCam = (this.waterInstance as any)?.mirrorCamera;
        if (mCam) {
          mCam.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
        }

        if (this.originalOnBeforeRender) {
          this.originalOnBeforeRender(renderer, scene, camera);
        }
      };
    }
  }

  public static dispose() {
    this.waterInstance = null;
    this.originalOnBeforeRender = null;
    this.frameCounter = 0;
  }

  public static setUpdateInterval(interval: number) {
    this.updateInterval = Math.max(0, interval);
    this.enabled = this.updateInterval > 0;
  }

  public static getUpdateInterval(): number {
    return this.updateInterval;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  public static getStatusString(): string {
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const qualityTier = VoyageQualityManager.getTier();
    if (isMobile) return 'OFF (Mobile Specular Mode)';
    if (qualityTier !== 'HIGH') return `OFF (${qualityTier} Specular Mode)`;
    if (!this.enabled || this.updateInterval === 0) return 'OFF (Mobile Saver)';
    if (this.updateInterval === 1) return 'ON (Every Frame)';
    return `ON (1/${this.updateInterval} Frames)`;
  }

  /**
   * Helper to assign an object to Layer 1 (micro details, culled from reflection)
   */
  public static tagMicroDetail(obj: THREE.Object3D) {
    obj.traverse((child) => {
      child.layers.set(VOYAGE_LAYERS.MICRO_DETAILS);
    });
  }

  /**
   * Helper to assign an object to Layer 0 (reflects on water)
   */
  public static tagProminentReflective(obj: THREE.Object3D) {
    obj.traverse((child) => {
      child.layers.set(VOYAGE_LAYERS.DEFAULT_AND_REFLECTION);
    });
  }
}
```

---

### File: src/components/world3d/VoyageQualityManager.ts
```typescript
/**
 * Realm of Crowns - Voyage Quality & Performance Manager (Phase 2)
 * 
 * Provides four distinct quality tiers (LOW, MEDIUM, HIGH, ULTRA) calibrated for
 * mobile devices, laptops, and high-performance desktop rigs.
 * Includes conservative adaptive performance scaling that monitors sustained frame-times
 * over a multi-second evaluation window with cooldowns to prevent quality oscillation.
 */

export type VoyageQualityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface VoyageQualitySettings {
  tier: VoyageQualityTier;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowDistance: number;
  shadowBias: number;
  reflectionEnabled: boolean;
  reflectionUpdateInterval: number; // 1 = every frame, 2 = every 2nd frame, 4 = every 4th frame, 0 = disabled
  reflectionTextureSize: number;
  lodDistanceMultiplier: number; // 0.7 = closer transitions (mobile), 1.0 = standard, 1.3 = farther
  maxVisibleShips: number;
  particleLimit: number;
  wakeQuality: 'low' | 'medium' | 'high';
  riggingDetail: 'minimal' | 'medium' | 'full';
  pixelRatioCap: number;
}

export const QUALITY_PRESETS: Record<VoyageQualityTier, VoyageQualitySettings> = {
  LOW: {
    tier: 'LOW',
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowDistance: 50,
    shadowBias: -0.001,
    reflectionEnabled: true,
    reflectionUpdateInterval: 4, // 15 FPS throttled reflection instead of flat disabled sea
    reflectionTextureSize: 256,
    lodDistanceMultiplier: 0.85,
    maxVisibleShips: 10,
    particleLimit: 35,
    wakeQuality: 'low',
    riggingDetail: 'minimal',
    pixelRatioCap: 1.0,
  },
  MEDIUM: {
    tier: 'MEDIUM',
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowDistance: 60,
    shadowBias: -0.0006,
    reflectionEnabled: true,
    reflectionUpdateInterval: 4, // 15 FPS reflection at 60 FPS gameplay
    reflectionTextureSize: 256,
    lodDistanceMultiplier: 0.85,
    maxVisibleShips: 14,
    particleLimit: 50,
    wakeQuality: 'medium',
    riggingDetail: 'medium',
    pixelRatioCap: 1.5,
  },
  HIGH: {
    tier: 'HIGH',
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowDistance: 80,
    shadowBias: -0.0005,
    reflectionEnabled: true,
    reflectionUpdateInterval: 2, // 30 FPS reflection at 60 FPS gameplay
    reflectionTextureSize: 512,
    lodDistanceMultiplier: 1.0,
    maxVisibleShips: 24,
    particleLimit: 90,
    wakeQuality: 'high',
    riggingDetail: 'full',
    pixelRatioCap: 2.0,
  },
  ULTRA: {
    tier: 'ULTRA',
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowDistance: 120,
    shadowBias: -0.0003,
    reflectionEnabled: true,
    reflectionUpdateInterval: 1, // Full 60 FPS reflection
    reflectionTextureSize: 512,
    lodDistanceMultiplier: 1.3,
    maxVisibleShips: 36,
    particleLimit: 140,
    wakeQuality: 'high',
    riggingDetail: 'full',
    pixelRatioCap: 2.0,
  },
};

export class VoyageQualityManager {
  private static currentTier: VoyageQualityTier = 'HIGH';
  private static settings: VoyageQualitySettings = { ...QUALITY_PRESETS.HIGH };
  private static adaptiveEnabled = false;

  // Adaptive Performance Monitoring State
  private static frameTimeSamples: number[] = [];
  private static lastAdaptiveCheck = 0;
  private static lastQualityChange = 0;
  private static readonly SAMPLE_WINDOW_SEC = 3.0; // 3-second evaluation window
  private static readonly COOLDOWN_SEC = 6.0; // 6-second cooldown between changes
  private static readonly TARGET_FRAME_TIME_MS = 28.0; // ~35 FPS floor threshold
  private static readonly RECOVERY_FRAME_TIME_MS = 17.5; // ~57 FPS recovery threshold

  private static listeners: Array<(settings: VoyageQualitySettings) => void> = [];

  public static getSettings(): VoyageQualitySettings {
    return this.settings;
  }

  public static getTier(): VoyageQualityTier {
    return this.currentTier;
  }

  public static setTier(tier: VoyageQualityTier) {
    this.currentTier = tier;
    this.settings = { ...QUALITY_PRESETS[tier] };
    this.notifyListeners();
  }

  public static setAdaptive(enabled: boolean) {
    this.adaptiveEnabled = enabled;
  }

  public static isAdaptive(): boolean {
    return this.adaptiveEnabled;
  }

  public static addListener(cb: (settings: VoyageQualitySettings) => void) {
    this.listeners.push(cb);
  }

  public static removeListener(cb: (settings: VoyageQualitySettings) => void) {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  private static notifyListeners() {
    this.listeners.forEach((cb) => cb(this.settings));
  }

  /**
   * Called every frame to feed frame duration.
   * Performs conservative hysteresis adjustment to prevent quality thrashing.
   */
  public static updateFrame(dt: number, currentTimeSec: number) {
    if (!this.adaptiveEnabled) return;

    const frameTimeMs = dt * 1000;
    this.frameTimeSamples.push(frameTimeMs);

    if (currentTimeSec - this.lastAdaptiveCheck < this.SAMPLE_WINDOW_SEC) {
      return;
    }

    this.lastAdaptiveCheck = currentTimeSec;

    if (this.frameTimeSamples.length < 15) {
      this.frameTimeSamples = [];
      return;
    }

    // Compute median frame time
    const sorted = [...this.frameTimeSamples].sort((a, b) => a - b);
    const medianMs = sorted[Math.floor(sorted.length / 2)];
    this.frameTimeSamples = [];

    // Honor cooldown
    if (currentTimeSec - this.lastQualityChange < this.COOLDOWN_SEC) {
      return;
    }

    // Step down quality if struggling under sustained load
    if (medianMs > this.TARGET_FRAME_TIME_MS) {
      if (this.currentTier === 'ULTRA') {
        this.setTier('HIGH');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'HIGH') {
        this.setTier('MEDIUM');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'MEDIUM') {
        this.setTier('LOW');
        this.lastQualityChange = currentTimeSec;
      }
    } else if (medianMs < this.RECOVERY_FRAME_TIME_MS) {
      // Step up quality if excess performance is consistently available
      if (this.currentTier === 'LOW') {
        this.setTier('MEDIUM');
        this.lastQualityChange = currentTimeSec;
      } else if (this.currentTier === 'MEDIUM') {
        this.setTier('HIGH');
        this.lastQualityChange = currentTimeSec;
      }
    }
  }
}
```
