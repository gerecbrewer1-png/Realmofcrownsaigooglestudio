/**
 * 3D World Canvas Component (High-Performance Architecture)
 * Features:
 * - Decoupled scene rendering: UI updates and march updates do NOT trigger full scene rebuilds.
 * - Instanced foliage and mountain rendering for ultra-low draw calls.
 * - Real-time Level of Detail (LOD) tier management based on camera distance.
 * - Optimized lighting & shadows with configurable Quality Modes (Performance / Balanced / Ultra).
 * - Smooth camera navigation with multi-tier presets (City, Region, World).
 * - Automatic FPS degradation protection to preserve device responsiveness.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  WorldTile,
  PlayerWorldState,
  KingdomState,
  PlayerProfile,
  ArmyMarch,
} from '../../types';
import {
  createWorldTerrain,
  hexToWorldCoords,
  worldToHexCoords,
  TerrainMeshBundle,
  HEX_SIZE,
} from './terrainGenerator';
import { soundEngine } from '../../audio/soundEngine';
import {
  createPlayerCitadel,
  createRivalCastle,
  City3DBundle,
} from './buildingModels';
import { createResourceNodeMesh } from './resourceModels';
import {
  createBarbarianCampMesh,
  createAncientShrineMesh,
  createArmyMarchMesh,
  Army3DBundle,
} from './entityModels';
import {
  RTSCameraController,
  ZoomLevel,
} from './cameraController';
import { worldTerrainAssetService } from './worldTerrainAssetService';
import { getWaterRipplesTexture } from './medievalTextures';

export type GraphicsQuality = 'performance' | 'balanced' | 'ultra';

export type MapActionType =
  | 'zoom_in'
  | 'zoom_out'
  | 'tilt'
  | 'rotate_cw'
  | 'rotate_ccw'
  | 'center_citadel';

export interface World3DCanvasProps {
  tiles: WorldTile[];
  worldState: PlayerWorldState | null;
  kingdom: KingdomState;
  player: PlayerProfile;
  selectedTile: WorldTile | null;
  onSelectTile: (tile: WorldTile | null) => void;
  onSelectMarch?: (march: ArmyMarch) => void;
  activeFilter: 'all' | 'territory' | 'resources' | 'war';
  cameraPresetRequest?: ZoomLevel | null;
  onResetCameraPreset?: () => void;
  mapActionRequest?: { action: MapActionType; id: number } | null;
  onResetMapAction?: () => void;
  qualityMode?: GraphicsQuality;
  onAutoDegradeQuality?: (newQuality: GraphicsQuality) => void;
  onCameraCoordsChange?: (coords: { q: number; r: number }) => void;
  targetCoordsRequest?: { q: number; r: number; id: number } | null;
  onResetTargetCoords?: () => void;
}

function World3DCanvasComponent({
  tiles,
  worldState,
  kingdom,
  player,
  selectedTile,
  onSelectTile,
  onSelectMarch,
  activeFilter,
  cameraPresetRequest,
  onResetCameraPreset,
  mapActionRequest,
  onResetMapAction,
  qualityMode = 'balanced',
  onAutoDegradeQuality,
  onCameraCoordsChange,
  targetCoordsRequest,
  onResetTargetCoords,
}: World3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controllerRef = useRef<RTSCameraController | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Callback ref to avoid effect recreation
  const onCameraCoordsChangeRef = useRef(onCameraCoordsChange);
  useEffect(() => {
    onCameraCoordsChangeRef.current = onCameraCoordsChange;
  }, [onCameraCoordsChange]);

  // Group references to avoid full-scene rebuilds
  const terrainBundleRef = useRef<TerrainMeshBundle | null>(null);
  const terrainGroupRef = useRef<THREE.Group>(new THREE.Group());
  const citiesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const resourcesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const npcsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const armiesGroupRef = useRef<THREE.Group>(new THREE.Group());

interface WorldAnimator {
  x: number;
  z: number;
  update: (time: number) => void;
  isGlobal?: boolean;
}

// City bundles for dynamic LOD
  const cityBundlesRef = useRef<City3DBundle[]>([]);
  const marchBundlesMap = useRef<Map<string, Army3DBundle>>(new Map());
  const animatorsRef = useRef<WorldAnimator[]>([]);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const builtTilesFingerprintRef = useRef<string>('');

  // Active Zoom tier tracking (ref-based to eliminate React re-renders during gameplay)
  const lastZoomTierRef = useRef<ZoomLevel>('region');
  const zoomBadgeRef = useRef<HTMLDivElement>(null);
  const lastReportedHexRef = useRef<{ q: number; r: number }>({ q: -9999, r: -9999 });

  // Raycaster for world interaction
  const raycaster = useRef(new THREE.Raycaster());
  const mousePos = useRef(new THREE.Vector2());
  const isPointerDown = useRef(false);
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const hasPannedSignificantly = useRef(false);

  // Multi-touch tracking
  const touchState = useRef<{
    initialDist: number;
    initialAngle: number;
  }>({ initialDist: 0, initialAngle: 0 });

  // FPS performance monitoring
  const fpsHistory = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const lowFpsCounter = useRef(0);

  // --------------------------------------------------------------------------
  // 1. Primary Scene, Camera, and Renderer Initialization (Runs ONCE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Preload real 3D world terrain assets
    worldTerrainAssetService.preloadAll();

    // Scene with clear medieval atmosphere
    // Bright, clear daytime horizon framing the grand realm continent
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xa3d5f7);
    scene.background = skyColor;
    // Ground remains 100% crisp, saturated, and visible with zero obscuring fog
    scene.fog = null;
    sceneRef.current = scene;
    (window as any).__WORLD_SCENE__ = scene;
    (window as any).THREE = THREE;

    // Endless Continuous Ocean Floor
    // Spans 8000x8000 beneath the entire continental landmass and out to the horizon.
    // Guarantees rich royal ocean water anywhere there is aquatic hexes or open seas,
    // with zero void gaps visible from any camera angle.
    const outerOceanGeo = new THREE.PlaneGeometry(8000, 8000);
    const outerOceanTex = getWaterRipplesTexture();
    const outerOceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a4b7c,
      map: outerOceanTex,
      roughness: 0.16,
      metalness: 0.30,
      transparent: true,
      opacity: 0.95,
    });
    const outerOceanMesh = new THREE.Mesh(outerOceanGeo, outerOceanMat);
    outerOceanMesh.rotation.x = -Math.PI / 2;
    outerOceanMesh.position.y = 0.05;
    outerOceanMesh.receiveShadow = true;
    scene.add(outerOceanMesh);

    // Camera (expanded horizon)
    const camera = new THREE.PerspectiveCamera(48, width / height, 2, 1600);
    cameraRef.current = camera;

    // RTS Controller
    const controller = new RTSCameraController(camera, new THREE.Vector3(0, 0, 0));
    controllerRef.current = controller;
    (window as any).__WORLD_CAMERA__ = camera;
    (window as any).__WORLD_CONTROLLER__ = controller;

    // WebGL Renderer with High-Performance Config
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: qualityMode !== 'performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    const pixelRatio = qualityMode === 'ultra' ? Math.min(window.devicePixelRatio, 2) : (qualityMode === 'balanced' ? 1.25 : 1.0);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = qualityMode !== 'performance';
    renderer.shadowMap.type = qualityMode === 'ultra' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Global Ambient Fill Light (clear natural daylight fill)
    const ambientLight = new THREE.AmbientLight(0xfffdf5, 0.85);
    scene.add(ambientLight);

    // Sunlight (Warm directional medieval sunlight)
    const sunLight = new THREE.DirectionalLight(0xfffaea, 2.1);
    sunLight.position.set(90, 160, 90);
    sunLight.castShadow = qualityMode !== 'performance';
    const shadowMapSize = qualityMode === 'ultra' ? 1024 : 512;
    sunLight.shadow.mapSize.width = shadowMapSize;
    sunLight.shadow.mapSize.height = shadowMapSize;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 480;
    const d = 200;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Hemispheric Sky/Meadow Ambient Light (Sky blue dome + warm grass bounce)
    const hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x4a7c38, 0.8);
    hemiLight.position.set(0, 120, 0);
    scene.add(hemiLight);

    // Selection Ring (Targeting Beacon)
    const ringGeo = new THREE.RingGeometry(8.5, 9.5, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    scene.add(selectionRing);
    selectionRingRef.current = selectionRing;

    // Scene Groups Assembly
    terrainGroupRef.current.name = 'group-terrain';
    citiesGroupRef.current.name = 'group-cities';
    resourcesGroupRef.current.name = 'group-resources';
    npcsGroupRef.current.name = 'group-npcs';
    armiesGroupRef.current.name = 'group-armies';

    scene.add(terrainGroupRef.current);
    scene.add(citiesGroupRef.current);
    scene.add(resourcesGroupRef.current);
    scene.add(npcsGroupRef.current);
    scene.add(armiesGroupRef.current);

    // Keyboard Arrow Keys Continuous Gliding
    const keysPressed = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
        ].includes(e.code)
      ) {
        e.preventDefault();
        keysPressed.add(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let frameCount = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      frameCount++;
      const now = performance.now();
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // FPS Monitoring
      const instantFps = 1000 / Math.max(1, now - lastTimeRef.current);
      lastTimeRef.current = now;
      fpsHistory.current.push(instantFps);
      if (fpsHistory.current.length > 60) fpsHistory.current.shift();

      // Check for prolonged frame drops every 60 frames (~1s)
      if (frameCount % 60 === 0 && qualityMode !== 'performance') {
        const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
        if (avgFps < 25) {
          lowFpsCounter.current++;
          if (lowFpsCounter.current >= 3) {
            // Auto-degrade quality to protect browser
            if (onAutoDegradeQuality) {
              onAutoDegradeQuality('performance');
            }
          }
        } else {
          lowFpsCounter.current = 0;
        }
      }

      // Continuous Keyboard Momentum Glide
      let inputX = 0;
      let inputZ = 0;
      if (keysPressed.has('ArrowRight') || keysPressed.has('KeyD')) inputX += 1;
      if (keysPressed.has('ArrowLeft') || keysPressed.has('KeyA')) inputX -= 1;
      if (keysPressed.has('ArrowUp') || keysPressed.has('KeyW')) inputZ += 1;
      if (keysPressed.has('ArrowDown') || keysPressed.has('KeyS')) inputZ -= 1;
      controller.setGlideInput(inputX, inputZ);

      // Update camera controller with momentum physics
      controller.update(delta);

      // Throttled LOD Check (every 8 frames) - updates DOM HUD and mesh LOD with zero React re-renders
      if (frameCount % 8 === 0) {
        const zoomTier = controller.getCurrentZoomLevel();
        if (zoomTier !== lastZoomTierRef.current) {
          lastZoomTierRef.current = zoomTier;
          if (zoomBadgeRef.current) {
            zoomBadgeRef.current.textContent =
              zoomTier === 'city'
                ? '🏰 Citadel District'
                : zoomTier === 'region'
                ? '🗺️ Regional Territory'
                : '🌐 Realm Grand View';
          }

          // Apply LOD to terrain, cities, armies, resources, and barbarian camps
          terrainBundleRef.current?.setLOD(zoomTier);
          cityBundlesRef.current.forEach((cb) => cb.setLOD(zoomTier));
          marchBundlesMap.current.forEach((mb) => mb.setLOD(zoomTier));
          resourcesGroupRef.current.children.forEach((child) => {
            child.userData?.setLOD?.(zoomTier);
          });
          npcsGroupRef.current.children.forEach((child) => {
            child.userData?.setLOD?.(zoomTier);
          });
        }
      }

      const camTarget = controller.state.target;

      // Keep directional sun shadow camera centered on active camera view
      if (sunLightRef.current) {
        sunLightRef.current.position.set(camTarget.x + 90, 160, camTarget.z + 90);
        sunLightRef.current.target.position.set(camTarget.x, camTarget.y, camTarget.z);
        sunLightRef.current.target.updateMatrixWorld();
      }

      // Dynamically cull terrain chunks based on camera distance (throttled every 6 frames)
      if (frameCount % 6 === 0 && terrainBundleRef.current?.updateCameraTarget) {
        terrainBundleRef.current.updateCameraTarget(camTarget, controller.getCurrentZoomLevel());
      }

      // Update camera crosshair coordinates for UI status only when integer coordinates change
      if (frameCount % 10 === 0 && onCameraCoordsChangeRef.current) {
        const hex = worldToHexCoords(camTarget.x, camTarget.z);
        if (hex.q !== lastReportedHexRef.current.q || hex.r !== lastReportedHexRef.current.r) {
          lastReportedHexRef.current = hex;
          onCameraCoordsChangeRef.current(hex);
        }
      }

      // Animate registered animators within active camera viewport proximity
      const maxDistanceSq = 180 * 180; // 180 units view horizon

      animatorsRef.current.forEach((anim) => {
        if (anim.isGlobal) {
          anim.update(time);
          return;
        }
        const dx = anim.x - camTarget.x;
        const dz = anim.z - camTarget.z;
        if (dx * dx + dz * dz < maxDistanceSq) {
          anim.update(time);
        }
      });

      // Animate active march positions
      const currentTimeMs = Date.now();
      marchBundlesMap.current.forEach((m) => m.updatePosition(currentTimeMs));

      // Animate selection ring pulsation
      if (selectionRing.visible) {
        const scale = 1 + Math.sin(time * 3.5) * 0.04;
        selectionRing.scale.set(scale, 1, scale);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      builtTilesFingerprintRef.current = '';
      terrainBundleRef.current?.dispose?.();
      terrainBundleRef.current = null;
      terrainGroupRef.current.clear();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  // --------------------------------------------------------------------------
  // 2. Dynamic Graphics Quality Mode Updates
  // --------------------------------------------------------------------------
  useEffect(() => {
    const renderer = rendererRef.current;
    const sunLight = sunLightRef.current;
    if (!renderer || !sunLight) return;

    if (qualityMode === 'performance') {
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1.0);
      sunLight.castShadow = false;
    } else if (qualityMode === 'balanced') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;
      renderer.setPixelRatio(1.25);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 512;
      sunLight.shadow.mapSize.height = 512;
    } else if (qualityMode === 'ultra') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
    }
  }, [qualityMode]);

  // --------------------------------------------------------------------------
  // 3. Build Terrain & Static World Entities (Only when `tiles` change!)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || tiles.length === 0) return;

    // Avoid redundant rebuild if tile array identity hasn't changed
    const fingerprint = `${tiles.length}_${tiles[0]?.id || ''}_${tiles[tiles.length - 1]?.id || ''}`;
    if (builtTilesFingerprintRef.current === fingerprint && terrainBundleRef.current) {
      if (!terrainGroupRef.current.children.includes(terrainBundleRef.current.group)) {
        terrainGroupRef.current.clear();
        terrainGroupRef.current.add(terrainBundleRef.current.group);
      }
      return;
    }
    builtTilesFingerprintRef.current = fingerprint;

    // Clean up previous terrain bundle
    terrainBundleRef.current?.dispose?.();
    terrainGroupRef.current.clear();
    terrainBundleRef.current = null;

    // Clear static entity groups
    citiesGroupRef.current.clear();
    resourcesGroupRef.current.clear();
    npcsGroupRef.current.clear();

    animatorsRef.current = [];
    interactiveObjectsRef.current = [];
    cityBundlesRef.current = [];

    // 1. Build Optimized Procedural Terrain
    const terrainBundle = createWorldTerrain(tiles);
    terrainGroupRef.current.add(terrainBundle.group);
    terrainBundleRef.current = terrainBundle;
    (window as any).__TERRAIN_BUNDLE__ = terrainBundle;
    (window as any).__TILES__ = tiles;
    animatorsRef.current.push({ x: 0, z: 0, update: terrainBundle.updateAnimation, isGlobal: true });

    // Register hex tiles for raycasting
    terrainBundle.hexMeshes.forEach((mesh) => {
      interactiveObjectsRef.current.push(mesh);
    });

    // 2. Build World Entities onto their respective groups
    const isPlayerShielded = !!(player.shieldExpiresAt && player.shieldExpiresAt > Date.now());

    tiles.forEach((tile) => {
      const { q, r } = tile.coords;
      const { x, z } = hexToWorldCoords(q, r);
      const elevation = tile.terrain === 'mountains' ? 8.8 : 2.2;

      // A. Player Citadel at (0,0)
      if (tile.entityType === 'player_kingdom' || (tile.coords.q === 0 && tile.coords.r === 0)) {
        const cityBundle = createPlayerCitadel(kingdom, isPlayerShielded, true);
        cityBundle.group.position.set(x, elevation, z);
        citiesGroupRef.current.add(cityBundle.group);
        cityBundlesRef.current.push(cityBundle);

        if (cityBundle.updateAnimation) {
          animatorsRef.current.push({ x, z, update: cityBundle.updateAnimation });
        }

        cityBundle.group.userData = { isWorldObject: true, type: 'city', tile };
        interactiveObjectsRef.current.push(cityBundle.group);
      }

      // B. Rival Player Castle
      else if (tile.entityType === 'rival_kingdom' && tile.rivalKingdom) {
        const rivalShielded = tile.rivalKingdom.shieldActive || false;
        const cityBundle = createRivalCastle(
          tile.rivalKingdom.castleLevel,
          tile.rivalKingdom.ownerName || 'Rival Lord',
          rivalShielded
        );
        cityBundle.group.position.set(x, elevation, z);
        citiesGroupRef.current.add(cityBundle.group);
        cityBundlesRef.current.push(cityBundle);

        if (cityBundle.updateAnimation) {
          animatorsRef.current.push({ x, z, update: cityBundle.updateAnimation });
        }

        cityBundle.group.userData = { isWorldObject: true, type: 'rival_castle', tile };
        interactiveObjectsRef.current.push(cityBundle.group);
      }

      // C. Resource Deposits
      else if (tile.entityType === 'resource_node' && tile.resourceNode) {
        const resourceMesh = createResourceNodeMesh(tile.resourceNode);
        resourceMesh.position.set(x, elevation, z);
        resourcesGroupRef.current.add(resourceMesh);

        resourceMesh.userData = { isWorldObject: true, type: 'resource_node', tile };
        interactiveObjectsRef.current.push(resourceMesh);
      }

      // D. Barbarian Outpost Camp
      else if (tile.entityType === 'barbarian_camp' && tile.barbarianCamp) {
        const campMesh = createBarbarianCampMesh(tile.barbarianCamp);
        campMesh.position.set(x, elevation, z);
        npcsGroupRef.current.add(campMesh);

        if (campMesh.userData?.updateAnimation) {
          animatorsRef.current.push({ x, z, update: campMesh.userData.updateAnimation });
        }

        campMesh.userData = { isWorldObject: true, type: 'barbarian_camp', tile };
        interactiveObjectsRef.current.push(campMesh);
      }

      // E. Ancient Shrine
      else if (tile.entityType === 'ancient_shrine' && tile.ancientShrine) {
        const shrineBundle = createAncientShrineMesh(tile.ancientShrine);
        shrineBundle.group.position.set(x, elevation, z);
        npcsGroupRef.current.add(shrineBundle.group);

        if (shrineBundle.updateAnimation) {
          animatorsRef.current.push({ x, z, update: shrineBundle.updateAnimation });
        }

        shrineBundle.group.userData = { isWorldObject: true, type: 'shrine', tile };
        interactiveObjectsRef.current.push(shrineBundle.group);
      }
    });

    // Apply current LOD tier to new models
    const currentTier = controllerRef.current?.getCurrentZoomLevel() || 'region';
    terrainBundle.setLOD(currentTier);
    cityBundlesRef.current.forEach((cb) => cb.setLOD(currentTier));
    resourcesGroupRef.current.children.forEach((child) => {
      child.userData?.setLOD?.(currentTier);
    });
    npcsGroupRef.current.children.forEach((child) => {
      child.userData?.setLOD?.(currentTier);
    });
  }, [tiles]); // ONLY re-run when tiles change!

  // --------------------------------------------------------------------------
  // 4. Update Active Army Marches Independently (No scene or terrain rebuilds!)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const armiesGroup = armiesGroupRef.current;
    if (!armiesGroup) return;

    const activeMarches = worldState?.activeMarches || [];
    const activeIds = new Set(activeMarches.map((m) => m.marchId));

    // Remove marches that are no longer active
    marchBundlesMap.current.forEach((bundle, id) => {
      if (!activeIds.has(id)) {
        armiesGroup.remove(bundle.group);
        armiesGroup.remove(bundle.pathLine);
        armiesGroup.remove(bundle.destinationBeacon);
        interactiveObjectsRef.current = interactiveObjectsRef.current.filter((o) => o !== bundle.group);
        bundle.dispose();
        marchBundlesMap.current.delete(id);
      }
    });

    // Add or update active marches
    const currentTier = controllerRef.current?.getCurrentZoomLevel() || 'region';
    activeMarches.forEach((march) => {
      const existingBundle = marchBundlesMap.current.get(march.marchId);
      if (existingBundle) {
        existingBundle.updateMarchState(march);
        existingBundle.group.userData.march = march;
      } else {
        const originPos = hexToWorldCoords(march.originCoords.q, march.originCoords.r);
        const targetPos = hexToWorldCoords(march.targetCoords.q, march.targetCoords.r);

        const bundle = createArmyMarchMesh(march, originPos, targetPos);
        bundle.setLOD(currentTier);
        armiesGroup.add(bundle.group);
        armiesGroup.add(bundle.pathLine);
        armiesGroup.add(bundle.destinationBeacon);

        bundle.group.userData = {
          isWorldObject: true,
          type: 'army_march',
          march,
        };
        interactiveObjectsRef.current.push(bundle.group);
        marchBundlesMap.current.set(march.marchId, bundle);
      }
    });
  }, [worldState?.activeMarches]);

  // --------------------------------------------------------------------------
  // 5. Filter Visibility Toggling (Instant 0ms UI filtering, no rebuilds!)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeFilter === 'all') {
      citiesGroupRef.current.visible = true;
      resourcesGroupRef.current.visible = true;
      npcsGroupRef.current.visible = true;
    } else if (activeFilter === 'territory') {
      citiesGroupRef.current.visible = true;
      resourcesGroupRef.current.visible = false;
      npcsGroupRef.current.visible = false;
    } else if (activeFilter === 'resources') {
      citiesGroupRef.current.visible = false;
      resourcesGroupRef.current.visible = true;
      npcsGroupRef.current.visible = false;
    } else if (activeFilter === 'war') {
      citiesGroupRef.current.visible = true;
      resourcesGroupRef.current.visible = false;
      npcsGroupRef.current.visible = true;
    }
  }, [activeFilter]);

  // --------------------------------------------------------------------------
  // 6. Selection Ring Position Update
  // --------------------------------------------------------------------------
  useEffect(() => {
    const ring = selectionRingRef.current;
    if (!ring) return;

    if (selectedTile) {
      const { x, z } = hexToWorldCoords(selectedTile.coords.q, selectedTile.coords.r);
      const elevation = selectedTile.terrain === 'mountains' ? 8.9 : 2.15;
      ring.position.set(x, elevation + 0.12, z);
      ring.visible = true;
    } else {
      ring.visible = false;
    }
  }, [selectedTile]);

  // --------------------------------------------------------------------------
  // 7. Camera Preset Triggers (City / Region / World)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!cameraPresetRequest || !controllerRef.current) return;

    if (cameraPresetRequest === 'city') {
      controllerRef.current.focusOn(0, 0, 'city', 900);
    } else if (cameraPresetRequest === 'region') {
      const target = selectedTile
        ? hexToWorldCoords(selectedTile.coords.q, selectedTile.coords.r)
        : { x: 0, z: 0 };
      controllerRef.current.focusOn(target.x, target.z, 'region', 900);
    } else if (cameraPresetRequest === 'world') {
      controllerRef.current.focusOn(0, 0, 'world', 1000);
    }

    if (onResetCameraPreset) onResetCameraPreset();
  }, [cameraPresetRequest, selectedTile, onResetCameraPreset]);

  // Handle direct coordinate navigation request (e.g. from sector bookmarks or coordinate input)
  useEffect(() => {
    if (!targetCoordsRequest || !controllerRef.current) return;
    const target = hexToWorldCoords(targetCoordsRequest.q, targetCoordsRequest.r);
    controllerRef.current.focusOn(target.x, target.z, 'region', 950);
    if (onResetTargetCoords) onResetTargetCoords();
  }, [targetCoordsRequest, onResetTargetCoords]);

  // --------------------------------------------------------------------------
  // 8. Map Action Controls (Zoom In/Out, Tilt, Rotate, Center Citadel)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!mapActionRequest || !controllerRef.current) return;
    const { action } = mapActionRequest;

    if (action === 'zoom_in') {
      controllerRef.current.zoomIn();
    } else if (action === 'zoom_out') {
      controllerRef.current.zoomOut();
    } else if (action === 'tilt') {
      controllerRef.current.toggleTilt();
    } else if (action === 'rotate_cw') {
      controllerRef.current.rotateClockwise();
    } else if (action === 'rotate_ccw') {
      controllerRef.current.rotateCounterClockwise();
    } else if (action === 'center_citadel') {
      controllerRef.current.focusOn(0, 0, 'city', 900);
    }

    if (onResetMapAction) {
      onResetMapAction();
    }
  }, [mapActionRequest, onResetMapAction]);

  // --------------------------------------------------------------------------
  // 8. User Interaction Handlers (Mouse & Touch Drag, Zoom, Raycast Tap)
  // --------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    hasPannedSignificantly.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || !controllerRef.current) return;

    const dx = e.clientX - pointerStartPos.current.x;
    const dy = e.clientY - pointerStartPos.current.y;

    if (Math.hypot(dx, dy) > 5) {
      hasPannedSignificantly.current = true;
    }

    // Use reliable clientX/clientY deltas to prevent iframe stutter or missed pointerlock ticks
    const moveX = e.clientX - lastPointerPos.current.x;
    const moveY = e.clientY - lastPointerPos.current.y;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };

    if (e.buttons === 2 || e.shiftKey) {
      // Right-drag or Shift-drag: Rotate and Pitch
      controllerRef.current.rotateBy(-moveX * 0.005, -moveY * 0.004);
    } else {
      // Left-drag: Pan World (scaled responsively with current camera altitude)
      const panSpeed = (controllerRef.current.state.radius / 100) * 0.35;
      controllerRef.current.panBy(-moveX * panSpeed, -moveY * panSpeed);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isPointerDown.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // If user tapped without dragging, perform Raycast Selection!
    if (!hasPannedSignificantly.current && rendererRef.current && cameraRef.current) {
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mousePos.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mousePos.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mousePos.current, cameraRef.current);
      const intersects = raycaster.current.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.isWorldObject && hitObj.parent) {
          hitObj = hitObj.parent;
        }

        if (hitObj && hitObj.userData?.type === 'army_march' && hitObj.userData.march) {
          soundEngine.playMarchHorn();
          onSelectMarch?.(hitObj.userData.march);
          return;
        }

        if (hitObj && hitObj.userData?.tile) {
          onSelectTile(hitObj.userData.tile);
          return;
        }
      }

      // Tap on empty space deselects
      onSelectTile(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!controllerRef.current) return;
    // Continuous exponential zoom factor for buttery smooth zooming on both trackpads and stepped wheels
    const zoomFactor = Math.max(0.84, Math.min(1.18, Math.pow(1.0016, e.deltaY)));
    controllerRef.current.zoomBy(zoomFactor);
  };

  // Touch handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      touchState.current = { initialDist: dist, initialAngle: angle };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!controllerRef.current) return;

    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

      // Pinch zoom
      if (touchState.current.initialDist > 0) {
        const factor = touchState.current.initialDist / dist;
        controllerRef.current.zoomBy(factor > 1 ? 1.03 : 0.97);
        touchState.current.initialDist = dist;
      }

      // Two-finger rotation
      const deltaAngle = angle - touchState.current.initialAngle;
      controllerRef.current.rotateBy(deltaAngle * 0.4);
      touchState.current.initialAngle = angle;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D World Tactical Zoom HUD Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 pointer-events-none">
        <div
          ref={zoomBadgeRef}
          className="px-2.5 py-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg text-[11px] font-semibold tracking-wider uppercase text-amber-400 shadow-lg"
        >
          🗺️ Regional Territory
        </div>
      </div>
    </div>
  );
}

export const World3DCanvas = React.memo(World3DCanvasComponent);

