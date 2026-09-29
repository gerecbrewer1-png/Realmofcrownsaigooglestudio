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
import { soundEngine } from '../../audio/soundEngine';
import { ISLAND_HAVENS, NATIONS, IslandHavenSpec } from '../../data/navalCatalog';

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

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
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

    // 3. Dynamic Physical 3D Ocean Surface (THREE.Water)
    const oceanSize = 8000;
    const waterGeo = new THREE.PlaneGeometry(oceanSize, oceanSize);
    const waterNormalMap = SailHeraldryService.generateWaterNormalMap();

    // Godot water shader color fidelity:
    // deep_color: vec3(0.008, 0.09, 0.16) -> 0x021729
    // shallow_color: vec3(0.05, 0.32, 0.42) -> 0x0d526b
    // foam_color: vec3(0.92, 0.96, 1.0) -> 0xebf5ff
    const waterSunColor = timeOfDay === 'night' ? 0x93c5fd : timeOfDay === 'sunset' ? 0xf97316 : 0xfffbeb;
    const waterDeepColor = timeOfDay === 'night' ? 0x010b14 : timeOfDay === 'sunset' ? 0x081f30 : 0x03273e;

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
    scene.add(water);

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
    scene.add(playerMesh);

    const playerWake = ShipVisualService.createWakeMesh(playerSpec.length, playerSpec.beam);
    playerMesh.add(playerWake);

    const playerState = {
      pos: persistentPlayerPosRef.current.clone(),
      heading: persistentPlayerHeadingRef.current, // radians (0 = facing +Z)
      rudder: 0,
      speedKnots: persistentPlayerSpeedRef.current,
      sailSetting: persistentPlayerSailSettingRef.current, // 0 = furl, 0.5 = battle, 1.0 = full
      hull: persistentPlayerHullRef.current ?? playerSpec.hullMax,
      hullMax: playerSpec.hullMax,
      sails: persistentPlayerSailsRef.current ?? playerSpec.sailsMax,
      sailsMax: playerSpec.sailsMax,
      crew: persistentPlayerCrewRef.current ?? playerSpec.crewMax,
      portReload: 1.0,
      starboardReload: 1.0,
      rollAngle: 0,
      pitchAngle: 0,
    };
    (window as any).__NAVAL_PLAYER_STATE__ = playerState;

    // 6. Hostile Pirate, Asian War Junk & Rival Faction Fleet Setup
    const enemySpecs: EnemyShip[] = [];
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

      enemySpecs.push({
        id: pt.id,
        name: pt.name,
        spec,
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
      });
    });

    (window as any).__SET_NAVAL_SHIPS_COUNT__ = (targetTotalShips: number) => {
      const activeEnemiesCount = Math.max(0, targetTotalShips - 1);
      enemySpecs.forEach((enemy, idx) => {
        const shouldBeActive = idx < activeEnemiesCount;
        enemy.mesh.visible = shouldBeActive;
        if (!shouldBeActive) {
          enemy.pos.set(99999, 0, 99999);
        } else if (enemy.pos.x > 5000) {
          const t = fleetTemplates[idx];
          if (t) enemy.pos.set(t.x, 0, t.z);
        }
      });
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

        const ballMesh = new THREE.Mesh(ballGeo, activeBallMat);
        ballMesh.position.copy(spawnPos);
        if (activeAmmo === 'bombs') {
          ballMesh.scale.set(1.3, 1.3, 1.3);
        }
        scene.add(ballMesh);

        cannonballs.push({
          mesh: ballMesh,
          velocity: ballDir.multiplyScalar(ammoSpeed + Math.random() * 6.0),
          life: 0,
          maxLife: 2.8,
          fromPlayer: true,
          damage: Math.round(baseDmg + Math.random() * 20),
          ammoType: activeAmmo,
        });

        // Muzzle smoke particle
        const smoke = new THREE.Mesh(particleGeo, smokeMat.clone());
        smoke.position.copy(spawnPos);
        scene.add(smoke);
        particles.push({
          mesh: smoke,
          velocity: dir.clone().multiplyScalar(4.0).add(new THREE.Vector3(0, 1.5, 0)),
          life: 0,
          maxLife: 1.2,
          scaleGrowth: 2.5,
        });
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

    // Immediate camera positioning on frame 0 to prevent spawn jump
    const initialYaw = playerState.heading + Math.PI + camOrbitYaw;
    const initialCamX = playerState.pos.x + Math.sin(initialYaw) * Math.cos(camOrbitPitch) * camOrbitDist;
    const initialCamY = playerState.pos.y + Math.sin(camOrbitPitch) * camOrbitDist + 8.5;
    const initialCamZ = playerState.pos.z + Math.cos(initialYaw) * Math.cos(camOrbitPitch) * camOrbitDist;
    camera.position.set(initialCamX, initialCamY, initialCamZ);
    camera.lookAt(playerState.pos.x, playerState.pos.y + 10, playerState.pos.z + 18);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      globalTime += dt;

      // Wind dynamics (Wind blows from windAngle)
      const windFromRad = (statusRef.current.windFromDeg * Math.PI) / 180;

      // --- PLAYER SHIP CONTROLS & PHYSICS ---
      if (playerState.hull > 0) {
        // Rudder turning
        let rudderTarget = 0;
        if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) rudderTarget = 1;
        if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) rudderTarget = -1;

        playerState.rudder = THREE.MathUtils.lerp(playerState.rudder, rudderTarget, dt * 4.0);

        // Sail adjustments with W / S
        if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) {
          playerState.sailSetting = Math.min(1.0, playerState.sailSetting + dt * 0.5);
        }
        if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) {
          playerState.sailSetting = Math.max(0.0, playerState.sailSetting - dt * 0.5);
        }

        // Calculate speed relative to wind
        const angleToWind = Math.abs(THREE.MathUtils.euclideanModulo(playerState.heading - windFromRad + Math.PI, Math.PI * 2) - Math.PI);
        // Broad reach (angle ~ 90°-135°) gives highest multiplier
        let windMultiplier = 0.75 + Math.sin(angleToWind) * 0.25;
        if (angleToWind < 0.4) windMultiplier = 0.5; // in irons (upwind)

        const sailHealthMult = playerState.sails / playerState.sailsMax;
        const targetKnots = playerSpec.baseSpeed * playerState.sailSetting * windMultiplier * sailHealthMult;
        playerState.speedKnots = THREE.MathUtils.lerp(playerState.speedKnots, targetKnots, dt * 1.2);

        // Turn rate scales with forward speed
        const effectiveTurnRate = (playerSpec.turnRate * (Math.PI / 180) * (playerState.speedKnots / playerSpec.baseSpeed + 0.2)) * playerState.rudder;
        playerState.heading += effectiveTurnRate * dt;

        // Advance position
        const forwardX = Math.sin(playerState.heading);
        const forwardZ = Math.cos(playerState.heading);
        const moveDist = playerState.speedKnots * 1.8 * dt;
        playerState.pos.x += forwardX * moveDist;
        playerState.pos.z += forwardZ * moveDist;

        // Persist transform in refs so re-renders never wipe ship coordinates
        persistentPlayerPosRef.current.copy(playerState.pos);
        persistentPlayerHeadingRef.current = playerState.heading;
        persistentPlayerSpeedRef.current = playerState.speedKnots;
        persistentPlayerSailSettingRef.current = playerState.sailSetting;
        persistentPlayerHullRef.current = playerState.hull;
        persistentPlayerSailsRef.current = playerState.sails;
        persistentPlayerCrewRef.current = playerState.crew;

        // Wave pitching and rolling
        const waveY = getWaveHeight(playerState.pos.x, playerState.pos.z, globalTime);
        const waveAheadY = getWaveHeight(playerState.pos.x + forwardX * 6, playerState.pos.z + forwardZ * 6, globalTime);
        const waveSideY = getWaveHeight(playerState.pos.x + forwardZ * 4, playerState.pos.z - forwardX * 4, globalTime);

        playerState.pitchAngle = THREE.MathUtils.lerp(playerState.pitchAngle, (waveAheadY - waveY) * 0.08, dt * 3.0);
        playerState.rollAngle = THREE.MathUtils.lerp(
          playerState.rollAngle,
          (waveSideY - waveY) * 0.12 - playerState.rudder * (playerState.speedKnots / playerSpec.baseSpeed) * 0.14,
          dt * 3.0
        );

        // Update player mesh transform
        playerMesh.position.set(playerState.pos.x, waveY, playerState.pos.z);
        playerMesh.rotation.set(playerState.pitchAngle, playerState.heading, playerState.rollAngle);

        // Wake foam elongation
        playerWake.scale.set(1.0, Math.max(0.1, playerState.speedKnots / 5.0), 1.0);
        playerWake.visible = playerState.speedKnots > 0.5;

        // Reload recharge
        playerState.portReload = Math.min(1.0, playerState.portReload + dt * 0.25);
        playerState.starboardReload = Math.min(1.0, playerState.starboardReload + dt * 0.25);
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

      _camTargetVec.set(camTargetX, camTargetY, camTargetZ);
      camera.position.lerp(_camTargetVec, dt * 4.0);

      if (cameraPresetRef.current === 'bow') {
        camera.lookAt(playerState.pos.x, playerState.pos.y + 6.0, playerState.pos.z);
      } else {
        const lookAheadDist = 26;
        _lookAheadVec.set(
          playerState.pos.x + Math.sin(playerState.heading) * lookAheadDist,
          playerState.pos.y + 6.5,
          playerState.pos.z + Math.cos(playerState.heading) * lookAheadDist
        );
        camera.lookAt(_lookAheadVec);
      }

      // --- DYNAMIC TIME OF DAY SKY & LIGHTING ---
      const tod = timeOfDayRef.current || 'day';
      if (tod === 'sunset') {
        ambientLight.color.setHex(0xfbcfe8);
        ambientLight.intensity = 0.75;
        sun.color.setHex(0xf97316);
        sun.intensity = 2.4;
        scene.background = new THREE.Color(0xc2410c);
        scene.fog = new THREE.Fog(0xc2410c, 400, 3000);
        if (water && (water as any).material?.uniforms) {
          (water as any).material.uniforms['sunColor'].value.setHex(0xf97316);
          (water as any).material.uniforms['waterColor'].value.setHex(0x081f30);
        }
      } else if (tod === 'night') {
        ambientLight.color.setHex(0x1e293b);
        ambientLight.intensity = 0.4;
        sun.color.setHex(0x94a3b8);
        sun.intensity = 0.85;
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.Fog(0x020617, 300, 2500);
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
        scene.background = new THREE.Color(0x38bdf8);
        scene.fog = new THREE.Fog(0x38bdf8, 500, 3500);
        if (water && (water as any).material?.uniforms) {
          (water as any).material.uniforms['sunColor'].value.setHex(0xfffbeb);
          (water as any).material.uniforms['waterColor'].value.setHex(0x021729);
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
      ShipVisualService.updateShipLOD(playerMesh, 0);

      let lod0Count = 1; // player flagship
      let lod1Count = 0;
      let lod2Count = 0;
      let lod3Count = 0;
      let culledCount = 0;

      // --- PIRATE & LIVING WORLD FLEET AI & COMBAT ---
      let nearestEnemy: EnemyShip | null = null;
      let minDistance = Infinity;
      const caveSanctuaryPos = new THREE.Vector3(-380, 0, 220);
      const isPlayerInTruce = playerState.pos.distanceTo(caveSanctuaryPos) < 165;

      enemySpecs.forEach((enemy) => {
        // Animate enemy sweep oars if equipped
        if (enemy.mesh.userData?.oarsNodes && enemy.mesh.userData.oarsNodes.length > 0) {
          const oarAngle = Math.sin(globalTime * 3.2 + enemy.pos.x * 0.05) * 0.26;
          enemy.mesh.userData.oarsNodes.forEach((oar: THREE.Group) => {
            oar.rotation.x = oarAngle;
          });
        }

        if (enemy.isSinking) {
          enemy.sinkTimer += dt;
          enemy.mesh.position.y -= dt * 1.5;
          enemy.mesh.rotation.z += dt * 0.1;
          enemy.mesh.rotation.x -= dt * 0.08;

          // Smoke from burning hull
          if (Math.random() < 0.3) {
            const smoke = new THREE.Mesh(particleGeo, smokeMat.clone());
            smoke.position.copy(enemy.pos).add(new THREE.Vector3((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4));
            scene.add(smoke);
            particles.push({
              mesh: smoke,
              velocity: new THREE.Vector3(0, 3.5, 0),
              life: 0,
              maxLife: 1.5,
              scaleGrowth: 2.0,
            });
          }

          if (enemy.sinkTimer > 7.0 && enemy.mesh.parent) {
            scene.remove(enemy.mesh);
          }
          return;
        }

        const distToPlayer = enemy.pos.distanceTo(playerState.pos);
        if (distToPlayer < minDistance) {
          minDistance = distToPlayer;
          nearestEnemy = enemy;
        }

        const isEnemyInTruce = enemy.pos.distanceTo(caveSanctuaryPos) < 95;
        const isMerchantPeaceful = enemy.spec.id === 'treasure_junk';

        // Combat behavior if player is within 140 units AND neither ship is in the sacred Truce Sanctuary
        if (distToPlayer < 140 && playerState.hull > 0 && !isPlayerInTruce && !isEnemyInTruce && !isMerchantPeaceful) {
          // Steer to broadside alignment
          _toPlayerVec.copy(playerState.pos).sub(enemy.pos).normalize();
          const desiredHeading = Math.atan2(_toPlayerVec.x, _toPlayerVec.z) + (Math.PI * 0.5); // align perpendicular for broadside

          // Turn towards desired angle
          const diff = THREE.MathUtils.euclideanModulo(desiredHeading - enemy.heading + Math.PI, Math.PI * 2) - Math.PI;
          enemy.heading += Math.sign(diff) * Math.min(Math.abs(diff), enemy.turnSpeed * dt);

          // Pirate firing broadside at player
          enemy.reloadTimer -= dt;
          if (enemy.reloadTimer <= 0 && distToPlayer < 90) {
            enemy.reloadTimer = 5.0 + Math.random() * 3.0;
            soundEngine.playCannonFire();

            // Fire 3 cannonballs at player
            for (let b = 0; b < 3; b++) {
              const ballMesh = new THREE.Mesh(ballGeo, ballMat);
              ballMesh.position.copy(enemy.pos).add(new THREE.Vector3(0, 2.5, 0));
              scene.add(ballMesh);

              _aimVec.copy(playerState.pos).sub(enemy.pos).normalize();
              _aimVec.y += 0.15;
              _aimVec.x += (Math.random() - 0.5) * 0.1;
              _aimVec.z += (Math.random() - 0.5) * 0.1;

              cannonballs.push({
                mesh: ballMesh,
                velocity: _aimVec.multiplyScalar(48.0),
                life: 0,
                maxLife: 2.8,
                fromPlayer: false,
                damage: Math.round(40 + Math.random() * 20),
                ammoType: 'balls',
              });
            }

            statusRef.current.combatLog.unshift(`${enemy.name} fired a broadside at our ship!`);
          }
        } else {
          // Peaceful cruising or living trade convoy route
          enemy.heading += enemy.turnSpeed * 0.25 * dt;
        }

        // Advance enemy ship
        enemy.pos.x += Math.sin(enemy.heading) * enemy.speed * dt;
        enemy.pos.z += Math.cos(enemy.heading) * enemy.speed * dt;

        const eWaveY = getWaveHeight(enemy.pos.x, enemy.pos.z, globalTime);
        enemy.mesh.position.set(enemy.pos.x, eWaveY, enemy.pos.z);
        enemy.mesh.rotation.y = enemy.heading;

        // Dynamic Camera Frustum Culling & 4-Tier LOD with 15m Hysteresis Buffer
        const distToCam = enemy.pos.distanceTo(camera.position);
        const boundRadius = (enemy.spec.length || 30) * 0.8;
        _sphere.center.copy(enemy.pos);
        _sphere.radius = boundRadius;
        const inFrustum = _cameraFrustum.intersectsSphere(_sphere);

        if (!inFrustum || distToCam > 750) {
          enemy.mesh.visible = false;
          if (enemy.wake) enemy.wake.visible = false;
          culledCount++;
        } else {
          enemy.mesh.visible = true;
          if (enemy.wake) enemy.wake.visible = distToCam < 200;
          const activeLOD = ShipVisualService.updateShipLOD(enemy.mesh, distToCam);
          if (activeLOD === 0) lod0Count++;
          else if (activeLOD === 1) lod1Count++;
          else if (activeLOD === 2) lod2Count++;
          else if (activeLOD === 3) lod3Count++;

          // Shadow optimization: only close/combat-relevant enemies cast shadows
          const shouldCastShadow = distToCam < 45;
          if (enemy.mesh.userData.isShadowCasting !== shouldCastShadow) {
            enemy.mesh.userData.isShadowCasting = shouldCastShadow;
            enemy.mesh.traverse((ch) => {
              if ((ch as THREE.Mesh).isMesh) {
                ch.castShadow = shouldCastShadow;
              }
            });
          }
        }

        // Animate enemy flags fluttering
        if (enemy.mesh.userData?.flagNode && enemy.mesh.visible) {
          enemy.mesh.userData.flagNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 3.8 + enemy.pos.x) * 0.22;
          enemy.mesh.userData.flagNode.rotation.z = Math.cos(globalTime * 2.9 + enemy.pos.z) * 0.08;
        }
        if (enemy.mesh.userData?.pennantNode && enemy.mesh.visible) {
          enemy.mesh.userData.pennantNode.rotation.y = Math.PI * 0.5 + Math.sin(globalTime * 4.6 + enemy.pos.x) * 0.26;
        }
      });

      // --- CANNONBALL BALLISTICS & IMPACTS ---
      for (let i = cannonballs.length - 1; i >= 0; i--) {
        const ball = cannonballs[i];
        ball.life += dt;
        ball.velocity.y -= 9.8 * dt; // gravity arc
        ball.mesh.position.add(ball.velocity.clone().multiplyScalar(dt));

        const waterHeight = getWaveHeight(ball.mesh.position.x, ball.mesh.position.z, globalTime);

        // Check water splash
        if (ball.mesh.position.y <= waterHeight) {
          soundEngine.playWaterSplash();

          // Water splash particle
          const splash = new THREE.Mesh(particleGeo, smokeMat.clone());
          splash.position.set(ball.mesh.position.x, waterHeight + 0.5, ball.mesh.position.z);
          scene.add(splash);
          particles.push({
            mesh: splash,
            velocity: new THREE.Vector3(0, 3.5, 0),
            life: 0,
            maxLife: 0.6,
            scaleGrowth: 1.5,
          });

          scene.remove(ball.mesh);
          cannonballs.splice(i, 1);
          continue;
        }

        // Check player hit by enemy cannonball
        if (!ball.fromPlayer && ball.mesh.position.distanceTo(playerState.pos) < playerSpec.length * 0.45) {
          playerState.hull = Math.max(0, playerState.hull - ball.damage);
          soundEngine.playCannonHit();

          // Splinters particle
          const hitP = new THREE.Mesh(particleGeo, fireMat);
          hitP.position.copy(ball.mesh.position);
          scene.add(hitP);
          particles.push({
            mesh: hitP,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 5, 4, (Math.random() - 0.5) * 5),
            life: 0,
            maxLife: 0.5,
            scaleGrowth: 1.2,
          });

          statusRef.current.combatLog.unshift(`Incoming cannonball hit our hull! -${ball.damage} HP`);
          scene.remove(ball.mesh);
          cannonballs.splice(i, 1);

          if (playerState.hull <= 0) {
            statusRef.current.combatLog.unshift(`DISASTER! Our flagship has suffered catastrophic hull failure!`);
            if (onDefeatRef.current) onDefeatRef.current();
          }
          continue;
        }

        // Check enemy hit by player cannonball
        if (ball.fromPlayer) {
          let hitEnemy = false;
          for (const enemy of enemySpecs) {
            if (enemy.isSinking) continue;
            if (ball.mesh.position.distanceTo(enemy.pos) < enemy.spec.length * 0.45) {
              let hullDmg = ball.damage;
              let sailDmg = Math.round(ball.damage * 0.25);
              let logText = `Direct hit on ${enemy.name}! -${ball.damage} HULL!`;

              if (ball.ammoType === 'knippels') {
                hullDmg = Math.round(ball.damage * 0.2);
                sailDmg = Math.round(ball.damage * 2.8);
                enemy.sails = Math.max(0, enemy.sails - sailDmg);
                enemy.speed = Math.max(1.2, enemy.speed * 0.82);
                logText = `Chain shot sheared rigging of ${enemy.name}! -${sailDmg} SAILS!`;
              } else if (ball.ammoType === 'grapeshot') {
                hullDmg = Math.round(ball.damage * 0.15);
                logText = `Canister grape swept decks of ${enemy.name}! Crew shattered!`;
              } else if (ball.ammoType === 'bombs') {
                hullDmg = Math.round(ball.damage * 1.75);
                sailDmg = Math.round(ball.damage * 0.5);
                logText = `Explosive bomb detonated on ${enemy.name}! -${hullDmg} FIRE DAMAGE!`;
              }

              enemy.hull = Math.max(0, enemy.hull - hullDmg);
              soundEngine.playCannonHit();
              hitEnemy = true;
              statusRef.current.combatLog.unshift(logText);

              // Wood splinter explosion
              for (let sp = 0; sp < 3; sp++) {
                const splinter = new THREE.Mesh(particleGeo, fireMat);
                splinter.position.copy(ball.mesh.position);
                scene.add(splinter);
                particles.push({
                  mesh: splinter,
                  velocity: new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 3, (Math.random() - 0.5) * 8),
                  life: 0,
                  maxLife: 0.7,
                  scaleGrowth: 1.2,
                });
              }

              // Check if enemy sunk
              if (enemy.hull <= 0) {
                enemy.isSinking = true;
                soundEngine.playBattleVictory();
                statusRef.current.combatLog.unshift(`VICTORY! ${enemy.name} has been sent to Davy Jones' Locker!`);

                // Spawn floating booty
                spawnSalvage(enemy.pos.clone(), 'gold', 500);
                spawnSalvage(enemy.pos.clone().add(new THREE.Vector3(12, 0, 8)), 'gems', 50);
                spawnSalvage(enemy.pos.clone().add(new THREE.Vector3(-10, 0, 10)), 'relics', 1);

                if (onVictoryRef.current) {
                  onVictoryRef.current({ gold: 500, gems: 50, wood: 200, relics: 1 });
                }
              }
              break;
            }
          }

          if (hitEnemy) {
            scene.remove(ball.mesh);
            cannonballs.splice(i, 1);
            continue;
          }
        }

        // Expire
        if (ball.life > ball.maxLife) {
          scene.remove(ball.mesh);
          cannonballs.splice(i, 1);
        }
      }

      // --- PARTICLES UPDATE ---
      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.life += dt;
        pt.mesh.position.add(pt.velocity.clone().multiplyScalar(dt));
        pt.mesh.scale.addScalar(pt.scaleGrowth * dt);

        if (pt.life >= pt.maxLife) {
          scene.remove(pt.mesh);
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
          const islSpec = ISLAND_HAVENS.find((h) => h.id === closestIsland?.id);
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

      // Status emission to React parent (throttled to 10 FPS)
      logUpdateTimer += dt;
      if (logUpdateTimer >= 0.1) {
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

      renderer.render(scene, camera);

      // Record live diagnostics for baseline and profiling
      const info = renderer.info;
      (window as any).__NAVAL_DIAGNOSTICS__ = {
        fps: Math.round(1 / Math.max(0.001, dt)),
        frameTimeMs: Math.round(dt * 1000 * 10) / 10,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        activeShips: 1 + enemySpecs.filter((e) => e.mesh.visible && !e.isSinking).length,
        lodCounts: {
          lod0: lod0Count,
          lod1: lod1Count,
          lod2: lod2Count,
          lod3: lod3Count,
          culled: culledCount,
        },
      };
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
      soundEngine.stopNavalTrack();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      waterGeo.dispose();
      (water as any).material?.dispose?.();
      waterNormalMap.dispose();
    };
  }, [shipType, timeOfDay]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
