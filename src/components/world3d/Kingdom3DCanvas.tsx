/**
 * Realm of Crowns - 3D Interactive Medieval Kingdom Canvas
 * Implements a high-fidelity 3D medieval city view featuring:
 * - Real-time Three.js WebGL rendering with intuitive RTS orbit/pan/zoom camera.
 * - Procedural PBR materials with high-definition stone masonry, wood planks, slate, and thatch.
 * - Comprehensive multi-component medieval architectural complexes:
 *   Keep with castle progression, Royal Farm with wheat crops & windmill, Sawmill with log stacks,
 *   Quarry with derrick crane, Barracks with training yard & sparring dummies, Stables, Hospital, etc.
 * - Subtle environmental life: Rising chimney smoke, rotating windmill blades, waving heraldic banners,
 *   circling white doves, wall sentry guards.
 * - Natural terrain with cobblestone avenues, desire dirt trails, pine firs, oak trees, and granite boulders.
 * - Clear Kingdom <-> World Map portal transition at the grand south gatehouse.
 * - Active Commander standing in the central courtyard.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  BuildingInstance,
  BuildingDefinition,
  ConstructionTask,
  Commander,
  HeroClass,
} from '../../types';
import { createHeroMesh } from './heroModels';
import { medievalModelService } from './medievalModelService';
import { soundEngine } from '../../audio/soundEngine';
import {
  createHeroAura,
  getHeroPowerTier,
  getHeroTierName,
  HeroAuraController,
} from './heroAuraSystem';
import { CelebrationEffectManager } from './celebrationEffects';
import {
  buildArchitecturalComplex,
  ArchitecturalBundle,
} from './medievalBuildingArchitect';
import {
  createKingdomLifeSystem,
  KingdomLifeSystem,
} from './kingdomLife';
import {
  getCobblestoneTexture,
  getStoneWallTexture,
  getWoodPlankTexture,
  getRoofTileTexture,
} from './medievalTextures';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Compass,
  Sparkles,
  Swords,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface Kingdom3DCanvasProps {
  buildings: BuildingInstance[];
  definitions: Record<string, BuildingDefinition>;
  queue: ConstructionTask[];
  commander: Commander | null;
  castleLevel: number;
  onSelectBuilding: (building: BuildingInstance) => void;
  onCollectResources?: () => void;
  onNavigateToWorld?: () => void;
}

export const Kingdom3DCanvas: React.FC<Kingdom3DCanvasProps> = ({
  buildings,
  queue,
  commander,
  castleLevel,
  onSelectBuilding,
  onCollectResources,
  onNavigateToWorld,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number>(0);
  const lifeSystemRef = useRef<KingdomLifeSystem | null>(null);

  // Dynamic interactive objects for raycasting: maps mesh -> BuildingInstance
  const interactiveBuildings = useRef<Map<THREE.Object3D, BuildingInstance>>(new Map());
  const gatehouseMeshRef = useRef<THREE.Object3D | null>(null);
  const selectedMeshRingRef = useRef<THREE.Mesh | null>(null);
  const heroMeshRef = useRef<THREE.Object3D | null>(null);
  const heroAuraRef = useRef<HeroAuraController | null>(null);
  const realHeroActionTriggerRef = useRef<((name: string) => void) | null>(null);
  const heroUpdateRef = useRef<((delta: number) => void) | null>(null);
  const moatAnimatorRef = useRef<((time: number) => void) | null>(null);
  const celebrationManagerRef = useRef<CelebrationEffectManager | null>(null);
  const prevBuildingLevelsRef = useRef<Record<string, number>>({});

  // Hero Walk/Run Controller & Dynamic Navigation State
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const heroPositionRef = useRef(new THREE.Vector3(0, 0.25, 3.2));
  const heroHeadingRef = useRef(0); // 0 rad = facing South toward courtyard and camera
  const heroTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const heroKeysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });
  const heroCurrentAnimRef = useRef<string>('Idle');

  // Camera Orbit State
  const cameraState = useRef({
    radius: 46,
    theta: Math.PI / 4,
    phi: Math.PI / 3.4,
    target: new THREE.Vector3(0, 1.5, 0),
    isDragging: false,
    dragButton: 0,
    previousMousePosition: { x: 0, y: 0 },
  });

  const [hoveredBuildingName, setHoveredBuildingName] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Update camera matrix from spherical coordinates
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi, target } = cameraState.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  }, []);

  // --------------------------------------------------------------------------
  // Main Scene Initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    (window as any).__KINGDOM_SCENE__ = scene;
    scene.background = new THREE.Color(0x0c1220); // Twilight medieval atmosphere
    scene.fog = new THREE.FogExp2(0x0c1220, 0.009);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 400);
    cameraRef.current = camera;
    (window as any).__KINGDOM_CAMERA__ = camera;
    updateCameraPosition();

    // 3. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch (glError) {
      console.warn('WebGL initialization failed in Kingdom3DCanvas, rendering fallback:', glError);
      container.innerHTML = '<div class="flex items-center justify-center h-full text-amber-200 text-xs font-semibold p-4">WebGL Hardware Acceleration is initializing...</div>';
      return;
    }

    // 4. Atmospheric Medieval Lighting
    const ambientLight = new THREE.AmbientLight(0x718096, 1.3);
    scene.add(ambientLight);

    // Warm Sun Directional Light (Golden hour)
    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    sunLight.position.set(36, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 140;
    const d = 36;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Cool Sky Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-30, 24, -36);
    scene.add(rimLight);

    // 5. Build Kingdom Environment (Terrain, Moat, Drawbridge, Courtyards, Roads, Walls)
    buildKingdomGround(scene);
    const moatBundle = buildCitadelMoat(scene);
    moatAnimatorRef.current = moatBundle.updateAnimation;
    buildCitadelDrawbridge(scene);
    const gateMesh = buildCityWalls(scene, castleLevel);
    gatehouseMeshRef.current = gateMesh;

    // 6. Build Natural Vegetation (Pine Firs, Oak Trees, Granite Boulders)
    buildVegetationAndFoliage(scene);

    // 7. Selection Ring Mesh (Glowing Golden Rune Circle)
    const ringGeo = new THREE.TorusGeometry(3.6, 0.12, 8, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.position.set(0, 0.35, 0);
    selectionRing.visible = false;
    scene.add(selectionRing);
    selectedMeshRingRef.current = selectionRing;

    // 8. Construct Architectural Buildings & Collect Animation Hooks
    interactiveBuildings.current.clear();
    const windmillBlades: THREE.Object3D[] = [];
    const chimneyPoints: THREE.Vector3[] = [];
    const wavingBanners: THREE.Mesh[] = [];
    const armillarySpheres: THREE.Object3D[] = [];

    buildKingdomBuildings(
      scene,
      buildings,
      queue,
      interactiveBuildings.current,
      windmillBlades,
      chimneyPoints,
      wavingBanners,
      armillarySpheres
    );

    // 8b. Level-Up Celebration Visual Effects System
    const celebrationManager = new CelebrationEffectManager(scene);
    celebrationManagerRef.current = celebrationManager;

    // Check if any building just leveled up compared to prior render state
    buildings.forEach((b) => {
      const prevLvl = prevBuildingLevelsRef.current[b.id];
      if (prevLvl !== undefined && b.level > prevLvl) {
        const slotCoord = DISTRICT_SLOTS[b.slot] || { x: 0, z: 0 };
        celebrationManager.spawnCelebration(
          new THREE.Vector3(slotCoord.x, 0.5, slotCoord.z),
          b.name,
          b.level
        );
        soundEngine.playBuildingUpgradeComplete();
      }
      prevBuildingLevelsRef.current[b.id] = b.level;
    });

    // 9. Place Sovereign Commander in the Central Courtyard with Hero Power Aura
    const heroSlotGroup = new THREE.Group();
    heroSlotGroup.name = 'courtyard-commander-group';
    heroSlotGroup.position.copy(heroPositionRef.current);
    heroSlotGroup.rotation.y = heroHeadingRef.current; // Facing toward South Gate & Courtyard (toward player camera)
    scene.add(heroSlotGroup);
    heroMeshRef.current = heroSlotGroup;

    // Guarantee sovereign commander presence even during initial load or guest state
    const activeCmd: Commander = commander || {
      id: 'cmd_sovereign',
      name: 'Lord Commander',
      level: 1,
      heroClass: 'warlord' as HeroClass,
      attributes: { leadership: 10, military: 10, strategy: 10, logistics: 10 },
      equipment: {},
      skills: [],
      talentPoints: 0,
    };

    const cClass = (activeCmd.heroClass || (activeCmd as any).class || 'warlord') as HeroClass;
    let heroBundle: ReturnType<typeof createHeroMesh> | null = createHeroMesh(cClass, 0.95);
    heroSlotGroup.add(heroBundle.group);

    // Attach Class Power Aura matching Hero Level & Tier
    const heroAura = createHeroAura(cClass, activeCmd.level || 1, { scale: 1.0 });
    heroSlotGroup.add(heroAura.group);
    heroAuraRef.current = heroAura;

    // Overhead Tactical Hero Crest Billboard
    const tier = getHeroPowerTier(activeCmd.level || 1);
    const tierName = getHeroTierName(tier);
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 64;
    const bCtx = badgeCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      bCtx.strokeStyle = '#f59e0b';
      bCtx.lineWidth = 3;
      bCtx.beginPath();
      bCtx.roundRect(8, 8, 240, 48, 12);
      bCtx.fill();
      bCtx.stroke();

      bCtx.font = 'bold 20px sans-serif';
      bCtx.fillStyle = '#fef08a';
      bCtx.textAlign = 'center';
      bCtx.fillText(`Lv.${activeCmd.level} ${activeCmd.name}`, 128, 32);

      bCtx.font = 'bold 13px monospace';
      bCtx.fillStyle = '#38bdf8';
      bCtx.fillText(`T${tier} ${tierName} • Tap to Rally`, 128, 48);
    }
    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
    badgeSprite.scale.set(2.4, 0.6, 1);
    badgeSprite.position.set(0, 2.3, 0);
    heroSlotGroup.add(badgeSprite);

    // Asynchronously load the real rigged 3D hero model with 76 embedded skeletal animations
    medievalModelService.loadHeroCharacter(cClass, 1.1)
      .then((realHero) => {
        if (!sceneRef.current) return;
        if (heroBundle) {
          heroSlotGroup.remove(heroBundle.group);
          heroBundle = null;
        }
        heroSlotGroup.add(realHero.group);
        heroUpdateRef.current = realHero.update;
        realHeroActionTriggerRef.current = (name: string) => {
          realHero.playAction(name, 0.25);
        };
      })
      .catch((err) => {
        console.warn('[Kingdom3DCanvas] Real hero load fallback to procedural:', err);
      });

    // 10. Start Living Kingdom Ecosystem (Smoke, Doves, Banners, Mills)
    const lifeSystem = createKingdomLifeSystem(
      scene,
      chimneyPoints,
      windmillBlades,
      wavingBanners,
      armillarySpheres
    );
    lifeSystemRef.current = lifeSystem;

    // 11. Keyboard Navigation Listeners (WASD, Arrows, Shift to Sprint, Space to Rally)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      let handled = false;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          heroKeysRef.current.forward = true;
          handled = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          heroKeysRef.current.backward = true;
          handled = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          heroKeysRef.current.left = true;
          handled = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          heroKeysRef.current.right = true;
          handled = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          heroKeysRef.current.sprint = true;
          handled = true;
          break;
        case 'Space':
          soundEngine.playFanfare();
          heroAuraRef.current?.triggerAbilitySurge(3.5);
          heroCurrentAnimRef.current = '1H_Melee_Attack_Chop';
          realHeroActionTriggerRef.current?.('1H_Melee_Attack_Chop');
          const cmdName = commander?.name || 'Lord Commander';
          setHoveredBuildingName(`${cmdName}: "For the Realm! Rally!"`);
          handled = true;
          break;
      }
      if (handled) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          heroKeysRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          heroKeysRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          heroKeysRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          heroKeysRef.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          heroKeysRef.current.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 12. Animation Render Loop (Silky 60 FPS update of ecosystem, moat ripples, power aura, and hero movement)
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update Environmental Life System
      lifeSystem.update(delta, time / 1000);

      // Update Moat Water Ripples
      if (moatAnimatorRef.current) {
        moatAnimatorRef.current(time / 1000);
      }

      // Update Celebrations
      celebrationManager.update(delta);

      // Update Hero Power Aura
      if (heroAura) {
        heroAura.update(delta, time / 1000);
      }

      // --- HERO MOVEMENT & NAVIGATION CONTROLLER ---
      const keys = heroKeysRef.current;
      const isKeyMoving = keys.forward || keys.backward || keys.left || keys.right;

      let moveX = 0;
      let moveZ = 0;

      if (isKeyMoving) {
        // Keyboard cancels click-to-move target
        heroTargetPosRef.current = null;

        // Calculate camera-relative movement vectors
        const theta = cameraState.current.theta;
        const fwdX = -Math.sin(theta);
        const fwdZ = -Math.cos(theta);
        const rightX = Math.cos(theta);
        const rightZ = -Math.sin(theta);

        if (keys.forward) {
          moveX += fwdX;
          moveZ += fwdZ;
        }
        if (keys.backward) {
          moveX -= fwdX;
          moveZ -= fwdZ;
        }
        if (keys.right) {
          moveX += rightX;
          moveZ += rightZ;
        }
        if (keys.left) {
          moveX -= rightX;
          moveZ -= rightZ;
        }
      } else if (heroTargetPosRef.current) {
        const dx = heroTargetPosRef.current.x - heroPositionRef.current.x;
        const dz = heroTargetPosRef.current.z - heroPositionRef.current.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.35) {
          moveX = dx / dist;
          moveZ = dz / dist;
        } else {
          heroTargetPosRef.current = null;
        }
      }

      const moveLen = Math.hypot(moveX, moveZ);
      const isMoving = moveLen > 0.01;

      if (isMoving) {
        const dirX = moveX / moveLen;
        const dirZ = moveZ / moveLen;
        const speed = keys.sprint ? 6.2 : 3.4;

        heroPositionRef.current.x += dirX * speed * delta;
        heroPositionRef.current.z += dirZ * speed * delta;

        // Courtyard / Citadel boundary limits
        heroPositionRef.current.x = Math.max(-17.5, Math.min(17.5, heroPositionRef.current.x));
        heroPositionRef.current.z = Math.max(-13.5, Math.min(15.5, heroPositionRef.current.z));

        // Smooth rotation to face movement direction
        const targetAngle = Math.atan2(dirX, dirZ);
        let diffAngle = (targetAngle - heroHeadingRef.current) % (Math.PI * 2);
        if (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        if (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        heroHeadingRef.current += diffAngle * Math.min(1, delta * 12);

        // Update animation
        const desiredAnim = keys.sprint ? 'Running_A' : 'Walking_A';
        if (heroCurrentAnimRef.current !== desiredAnim) {
          heroCurrentAnimRef.current = desiredAnim;
          realHeroActionTriggerRef.current?.(desiredAnim);
        }

        // Camera smoothly follows hero center
        cameraState.current.target.x = THREE.MathUtils.lerp(
          cameraState.current.target.x,
          heroPositionRef.current.x,
          delta * 2.5
        );
        cameraState.current.target.z = THREE.MathUtils.lerp(
          cameraState.current.target.z,
          heroPositionRef.current.z,
          delta * 2.5
        );
        updateCameraPosition();
      } else {
        // Hero is stationary -> Idle
        if (
          heroCurrentAnimRef.current !== 'Idle' &&
          !heroCurrentAnimRef.current.includes('Attack') &&
          !heroCurrentAnimRef.current.includes('Cheer')
        ) {
          heroCurrentAnimRef.current = 'Idle';
          realHeroActionTriggerRef.current?.('Idle');
        }
      }

      heroSlotGroup.position.copy(heroPositionRef.current);
      heroSlotGroup.rotation.y = heroHeadingRef.current;

      // Hero animation (real skeletal mixer or procedural fallback)
      if (heroUpdateRef.current) {
        heroUpdateRef.current(delta);
      } else if (heroBundle) {
        heroBundle.updateAnimation(time / 1000);
      }

      // Pulse selected ring
      if (selectionRing.visible) {
        selectionRing.rotation.z += delta * 0.8;
      }

      renderer.render(scene, camera);
    };
    animFrameId.current = requestAnimationFrame(animate);

    // 13. Responsive Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      lifeSystem.dispose();
      celebrationManager.dispose();
      if (heroAura) {
        heroAura.dispose();
      }
      renderer.dispose();
    };
  }, [buildings, queue, commander, castleLevel, updateCameraPosition]);

  // --------------------------------------------------------------------------
  // RTS Orbit Camera Event Handlers
  // --------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    cameraState.current.isDragging = true;
    cameraState.current.dragButton = e.button;
    cameraState.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (cameraState.current.isDragging) {
      const deltaX = e.clientX - cameraState.current.previousMousePosition.x;
      const deltaY = e.clientY - cameraState.current.previousMousePosition.y;

      // Left-click orbit
      if (cameraState.current.dragButton === 0) {
        cameraState.current.theta -= deltaX * 0.007;
        cameraState.current.phi = Math.max(
          0.15,
          Math.min(Math.PI / 2.15, cameraState.current.phi - deltaY * 0.007)
        );
        updateCameraPosition();
      }
      // Right-click pan
      else if (cameraState.current.dragButton === 2) {
        const panFactor = 0.04;
        const sin = Math.sin(cameraState.current.theta);
        const cos = Math.cos(cameraState.current.theta);
        cameraState.current.target.x -= (cos * deltaX - sin * deltaY) * panFactor;
        cameraState.current.target.z -= (sin * deltaX + cos * deltaY) * panFactor;
        updateCameraPosition();
      }

      cameraState.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    } else {
      // Hover building detection
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const objectsToCheck = Array.from(interactiveBuildings.current.keys()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(objectsToCheck, true);

      if (intersects.length > 0) {
        let cur: THREE.Object3D | null = intersects[0].object;
        let matched: BuildingInstance | undefined;
        while (cur && !matched) {
          matched = interactiveBuildings.current.get(cur);
          cur = cur.parent;
        }
        if (matched) {
          setHoveredBuildingName(`${matched.name} (Lv.${matched.level})`);
          return;
        }
      }

      // Check if hovering active commander
      if (heroMeshRef.current && commander) {
        const heroIntersects = raycaster.intersectObject(heroMeshRef.current, true);
        if (heroIntersects.length > 0) {
          const tier = getHeroPowerTier(commander.level || 1);
          setHoveredBuildingName(`Commander ${commander.name} (Lv.${commander.level} • Tier ${tier} ${getHeroTierName(tier)})`);
          return;
        }
      }

      // Check if hovering gatehouse
      if (gatehouseMeshRef.current) {
        const gateIntersects = raycaster.intersectObject(gatehouseMeshRef.current, true);
        if (gateIntersects.length > 0) {
          setHoveredBuildingName('Grand South Gatehouse (March to World Map)');
          return;
        }
      }

      setHoveredBuildingName(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDragging = cameraState.current.isDragging;
    cameraState.current.isDragging = false;
    const dragDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    // Single click building selection or ground navigation (orbit drag threshold < 8px)
    if (wasDragging && dragDist < 8 && containerRef.current && cameraRef.current && sceneRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      // 1. Check Gatehouse click first
      if (gatehouseMeshRef.current && onNavigateToWorld) {
        const gateIntersects = raycaster.intersectObject(gatehouseMeshRef.current, true);
        if (gateIntersects.length > 0) {
          soundEngine.playHorn();
          onNavigateToWorld();
          return;
        }
      }

      // 2. Check Courtyard Commander click
      if (heroMeshRef.current) {
        const heroIntersects = raycaster.intersectObject(heroMeshRef.current, true);
        if (heroIntersects.length > 0) {
          soundEngine.playFanfare();
          heroAuraRef.current?.triggerAbilitySurge(3.5);
          const rallyActions = ['Cheer', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'];
          const chosen = rallyActions[Math.floor(Math.random() * rallyActions.length)];
          realHeroActionTriggerRef.current?.(chosen);
          const cmdName = commander?.name || 'Lord Commander';
          setHoveredBuildingName(`${cmdName}: "For the Realm! Battle Surge!"`);
          return;
        }
      }

      // 3. Check building click
      const objectsToCheck = Array.from(interactiveBuildings.current.keys()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(objectsToCheck, true);

      if (intersects.length > 0) {
        let cur: THREE.Object3D | null = intersects[0].object;
        let matchedBuilding: BuildingInstance | undefined;
        let hitObj: THREE.Object3D | null = null;

        while (cur && !matchedBuilding) {
          matchedBuilding = interactiveBuildings.current.get(cur);
          if (matchedBuilding) {
            hitObj = cur;
          }
          cur = cur.parent;
        }

        if (matchedBuilding) {
          soundEngine.playClick();
          setSelectedBuildingId(matchedBuilding.id);

          // Move selection ring to clicked building
          if (hitObj && selectedMeshRingRef.current) {
            selectedMeshRingRef.current.position.set(
              hitObj.position.x,
              0.35,
              hitObj.position.z
            );
            selectedMeshRingRef.current.visible = true;
          }

          onSelectBuilding(matchedBuilding);
          return;
        }
      }

      // 4. Courtyard / Citadel Ground Click-to-Move
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
      const groundIntersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, groundIntersection)) {
        const targetX = Math.max(-17.5, Math.min(17.5, groundIntersection.x));
        const targetZ = Math.max(-13.5, Math.min(15.5, groundIntersection.z));
        heroTargetPosRef.current = new THREE.Vector3(targetX, 0.25, targetZ);
        soundEngine.playClick();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    cameraState.current.radius = Math.max(
      16,
      Math.min(78, cameraState.current.radius + e.deltaY * 0.04)
    );
    updateCameraPosition();
  };

  const zoomIn = () => {
    soundEngine.playClick();
    cameraState.current.radius = Math.max(16, cameraState.current.radius - 8);
    updateCameraPosition();
  };

  const zoomOut = () => {
    soundEngine.playClick();
    cameraState.current.radius = Math.min(78, cameraState.current.radius + 8);
    updateCameraPosition();
  };

  const rotateCw = () => {
    soundEngine.playClick();
    cameraState.current.theta += Math.PI / 6;
    updateCameraPosition();
  };

  const rotateCcw = () => {
    soundEngine.playClick();
    cameraState.current.theta -= Math.PI / 6;
    updateCameraPosition();
  };

  const resetCamera = () => {
    soundEngine.playClick();
    cameraState.current.radius = 46;
    cameraState.current.theta = Math.PI / 4;
    cameraState.current.phi = Math.PI / 3.4;
    cameraState.current.target.set(0, 1.5, 0);
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-[480px] sm:h-[560px] md:h-[620px] rounded-2xl overflow-hidden border border-amber-900/60 shadow-2xl bg-slate-950">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Left: Sovereign Realm Citadel Badge & Active Hover Inspector */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-200 tracking-wide uppercase">
            3D Sovereign Realm Citadel
          </span>
          <span className="bg-amber-600/30 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40">
            Lv.{castleLevel}
          </span>
        </div>

        {hoveredBuildingName && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-400 text-amber-300 px-3 py-1 rounded-lg text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-1">
            Tap to inspect: <span className="text-white font-bold">{hoveredBuildingName}</span>
          </div>
        )}
      </div>

      {/* Top Right: March to World Map & Quick Harvest Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {onNavigateToWorld && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playHorn();
              onNavigateToWorld();
            }}
            title="March your army into the shared Realm World Map"
            className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xl border border-amber-300 cursor-pointer transition transform active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>March to World Map</span>
          </button>
        )}

        {onCollectResources && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playChime();
              onCollectResources();
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-emerald-300/50 cursor-pointer transition transform active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>Harvest All</span>
          </button>
        )}
      </div>

      {/* Top Center: Hero Movement Quick Controls Overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-full px-3.5 py-1 shadow-xl hidden sm:flex items-center gap-2.5 text-xs text-amber-200 pointer-events-none z-10">
        <span className="flex items-center gap-1 font-semibold">
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded">WASD</span>
          <span>Walk</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 font-semibold">
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded">Shift</span>
          <span>Sprint</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 font-semibold">
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded">Click Ground</span>
          <span>Move</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 font-semibold">
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded">Space</span>
          <span>Rally</span>
        </span>
      </div>

      {/* Bottom Right: RTS Orbit Camera Toolset */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-lg">
        <button
          type="button"
          onClick={zoomIn}
          title="Zoom In"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg transition cursor-pointer border border-slate-700/60"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title="Zoom Out"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg transition cursor-pointer border border-slate-700/60"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={rotateCcw}
          title="Rotate Left"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg transition cursor-pointer border border-slate-700/60"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={rotateCw}
          title="Rotate Right"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg transition cursor-pointer border border-slate-700/60"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera View"
          className="p-1.5 bg-amber-600/30 hover:bg-amber-500/40 text-amber-300 rounded-lg transition cursor-pointer border border-amber-500/50"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left: Navigation Hints & Gatehouse Portal Hint */}
      <div className="absolute bottom-3 left-3 bg-slate-950/75 backdrop-blur-sm border border-slate-800/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-400 pointer-events-none flex items-center gap-2">
        <span className="text-amber-300 font-semibold">WASD / Ground Click to Move Hero</span>
        <span className="text-slate-600">•</span>
        <span>Drag to orbit</span>
        <span className="text-slate-600">•</span>
        <span>Scroll to zoom</span>
        <span className="text-slate-600">•</span>
        <span className="text-amber-300 font-semibold">South Gate = World Map</span>
      </div>
    </div>
  );
};

// ============================================================================
// Procedural Medieval Terrain & Landscape Construction
// ============================================================================

/**
 * Builds the natural landscape, cobblestone plaza, and connecting roads
 */
function buildKingdomGround(scene: THREE.Scene): void {
  const cobbleTex = getCobblestoneTexture();

  // 1. Natural Grass Base Terrain (Island bedrock within moat)
  const innerIslandGeo = new THREE.CylinderGeometry(25.0, 25.5, 1.2, 48);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a24,
    roughness: 0.85,
    flatShading: true,
  });
  const innerIsland = new THREE.Mesh(innerIslandGeo, groundMat);
  innerIsland.position.y = -0.6;
  innerIsland.receiveShadow = true;
  scene.add(innerIsland);

  // Outer Continental Terrain Beyond Moat
  const outerTerrainGeo = new THREE.RingGeometry(31.8, 46.0, 48);
  const outerTerrainMat = new THREE.MeshStandardMaterial({
    color: 0x19331e,
    roughness: 0.88,
    flatShading: true,
  });
  const outerTerrain = new THREE.Mesh(outerTerrainGeo, outerTerrainMat);
  outerTerrain.rotation.x = -Math.PI / 2;
  outerTerrain.position.y = 0.02;
  outerTerrain.receiveShadow = true;
  scene.add(outerTerrain);

  // 2. Cobblestone Citadel Central Plaza
  const plazaGeo = new THREE.CylinderGeometry(15, 15.5, 0.4, 32);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.75,
  });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.y = 0.15;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // 3. Cobblestone Avenues branching North (Keep), South (Gate), East (Farm), West (Mines)
  const roadMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.8,
  });

  // North-South Main Royal Road (leads straight through South Gatehouse to Drawbridge threshold)
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 39.5), roadMat);
  roadNS.position.set(0, 0.18, 3.2);
  roadNS.receiveShadow = true;
  scene.add(roadNS);

  // East-West Merchant Avenue
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(34, 0.08, 4.8), roadMat);
  roadEW.position.set(0, 0.18, 0);
  roadEW.receiveShadow = true;
  scene.add(roadEW);

  // Desire dirt path curving to farm fields
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x5a3e1b, roughness: 0.9 });
  const farmPath = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 12), dirtMat);
  farmPath.rotation.y = Math.PI / 4;
  farmPath.position.set(11, 0.16, -7);
  farmPath.receiveShadow = true;
  scene.add(farmPath);
}

/**
 * Builds the deep defensive water moat surrounding the Citadel
 */
function buildCitadelMoat(scene: THREE.Scene): {
  moatGroup: THREE.Group;
  waterMesh: THREE.Mesh;
  updateAnimation: (time: number) => void;
} {
  const moatGroup = new THREE.Group();
  moatGroup.name = 'citadel-moat';

  const stoneTex = getStoneWallTexture();
  const cobbleTex = getCobblestoneTexture();

  const innerRevetmentMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.85,
    color: 0x475569,
  });
  const outerEmbankmentMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.88,
    color: 0x334155,
  });

  // 1. Moat Trench Bed & Submerged Silt
  const trenchBedGeo = new THREE.RingGeometry(24.6, 32.4, 64);
  const trenchBedMat = new THREE.MeshStandardMaterial({
    color: 0x05131f,
    roughness: 0.95,
  });
  const trenchBed = new THREE.Mesh(trenchBedGeo, trenchBedMat);
  trenchBed.rotation.x = -Math.PI / 2;
  trenchBed.position.y = -0.55;
  moatGroup.add(trenchBed);

  // 2. Inner Stone Revetment Escarp (Retaining wall inside edge of moat below the city curtain walls)
  const innerEscarpGeo = new THREE.CylinderGeometry(24.8, 25.4, 0.85, 48, 1, true);
  const innerEscarp = new THREE.Mesh(innerEscarpGeo, innerRevetmentMat);
  innerEscarp.position.y = -0.15;
  innerEscarp.receiveShadow = true;
  moatGroup.add(innerEscarp);

  // 3. Outer Counterscarp Embankment (Sloping stone bank on the outside of the moat)
  const outerCounterscarpGeo = new THREE.CylinderGeometry(32.4, 31.6, 0.85, 48, 1, true);
  const outerCounterscarp = new THREE.Mesh(outerCounterscarpGeo, outerEmbankmentMat);
  outerCounterscarp.position.y = -0.15;
  outerCounterscarp.receiveShadow = true;
  moatGroup.add(outerCounterscarp);

  // 4. Defensive Water Surface with Refractive Sheen & Subtle Bobbing
  const waterGeo = new THREE.RingGeometry(24.9, 32.1, 64);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    roughness: 0.12,
    metalness: 0.32,
    transparent: true,
    opacity: 0.92,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.08;
  waterMesh.receiveShadow = true;
  moatGroup.add(waterMesh);

  scene.add(moatGroup);

  const updateAnimation = (time: number) => {
    // Subtle breathing surface oscillation for living water feel
    waterMesh.position.y = 0.08 + Math.sin(time * 1.8) * 0.015;
    waterMat.roughness = 0.12 + Math.sin(time * 0.8) * 0.04;
  };

  return { moatGroup, waterMesh, updateAnimation };
}

/**
 * Builds the heavy fortified timber Drawbridge spanning the moat at the South Gatehouse
 */
function buildCitadelDrawbridge(scene: THREE.Scene): THREE.Group {
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'citadel-fortified-drawbridge';

  const woodTex = getWoodPlankTexture();
  const stoneTex = getStoneWallTexture();
  const cobbleTex = getCobblestoneTexture();

  const timberMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x3e2311,
    roughness: 0.85,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.35,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x334155,
    roughness: 0.8,
  });

  // Span runs from gate portal (Z = 23.5) to outer bank (Z = 33.2) along X = 0
  const bridgeLength = 9.8;
  const bridgeWidth = 5.2;
  const bridgeThickness = 0.32;
  const centerY = 0.22;
  const centerZ = 28.35;

  // 1. Heavy Timber Oak Deck Planks
  const deckGeo = new THREE.BoxGeometry(bridgeWidth, bridgeThickness, bridgeLength);
  const deck = new THREE.Mesh(deckGeo, timberMat);
  deck.position.set(0, centerY, centerZ);
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridgeGroup.add(deck);

  // 2. Wrought-Iron Reinforcement Straps Across Deck Width
  for (let s = -3.8; s <= 3.8; s += 1.9) {
    const strapGeo = new THREE.BoxGeometry(bridgeWidth + 0.1, 0.04, 0.18);
    const strap = new THREE.Mesh(strapGeo, ironMat);
    strap.position.set(0, centerY + bridgeThickness / 2 + 0.02, centerZ + s);
    bridgeGroup.add(strap);
  }

  // 3. Massive Submerged Stone Pier Abutments in Moat Bed (Supporting underside of deck)
  const pier1Geo = new THREE.BoxGeometry(bridgeWidth - 0.6, 1.2, 1.8);
  const pier1 = new THREE.Mesh(pier1Geo, pierMat);
  pier1.position.set(0, -0.54, centerZ - 1.8);
  pier1.receiveShadow = true;
  pier1.castShadow = true;
  bridgeGroup.add(pier1);

  const pier2 = new THREE.Mesh(pier1Geo, pierMat);
  pier2.position.set(0, -0.54, centerZ + 2.2);
  pier2.receiveShadow = true;
  pier2.castShadow = true;
  bridgeGroup.add(pier2);

  // 4. Timber Gallows Lifting Towers at Citadel Gate Portal
  const gallowsGroup = new THREE.Group();
  gallowsGroup.position.set(0, 0, 23.8);

  const postGeo = new THREE.BoxGeometry(0.55, 6.2, 0.55);
  const postLeft = new THREE.Mesh(postGeo, timberMat);
  postLeft.position.set(-bridgeWidth / 2 - 0.35, 3.1, 0);
  postLeft.castShadow = true;

  const postRight = new THREE.Mesh(postGeo, timberMat);
  postRight.position.set(bridgeWidth / 2 + 0.35, 3.1, 0);
  postRight.castShadow = true;

  // Overhead Crossbeam with Pulley Blocks
  const beamGeo = new THREE.BoxGeometry(bridgeWidth + 1.4, 0.55, 0.55);
  const beam = new THREE.Mesh(beamGeo, timberMat);
  beam.position.set(0, 5.9, 0);
  beam.castShadow = true;

  // Diagonal Knee Braces
  const braceLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), timberMat);
  braceLeft.position.set(-bridgeWidth / 2 + 0.2, 5.0, 0);
  braceLeft.rotation.z = Math.PI / 4;

  const braceRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), timberMat);
  braceRight.position.set(bridgeWidth / 2 - 0.2, 5.0, 0);
  braceRight.rotation.z = -Math.PI / 4;

  gallowsGroup.add(postLeft, postRight, beam, braceLeft, braceRight);
  bridgeGroup.add(gallowsGroup);

  // 5. Heavy Iron Suspension Chains Running Diagonally to Outer Deck Edge
  const chainStartLeft = new THREE.Vector3(-bridgeWidth / 2 + 0.4, 5.6, 24.0);
  const chainEndLeft = new THREE.Vector3(-bridgeWidth / 2 + 0.4, centerY + 0.2, 32.2);

  const chainStartRight = new THREE.Vector3(bridgeWidth / 2 - 0.4, 5.6, 24.0);
  const chainEndRight = new THREE.Vector3(bridgeWidth / 2 - 0.4, centerY + 0.2, 32.2);

  const buildChainMesh = (start: THREE.Vector3, end: THREE.Vector3) => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const chainCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, len, 6),
      ironMat
    );
    chainCyl.position.copy(start).addScaledVector(dir, 0.5);
    chainCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return chainCyl;
  };

  bridgeGroup.add(buildChainMesh(chainStartLeft, chainEndLeft));
  bridgeGroup.add(buildChainMesh(chainStartRight, chainEndRight));

  // 6. Timber Safety Balustrades Along Deck Edges
  for (const side of [-1, 1]) {
    const railX = (side * (bridgeWidth - 0.35)) / 2;
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, bridgeLength - 0.4), timberMat);
    topRail.position.set(railX, centerY + 1.1, centerZ);
    bridgeGroup.add(topRail);

    for (let st = -4.0; st <= 4.0; st += 1.6) {
      const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), timberMat);
      stanchion.position.set(railX, centerY + 0.55, centerZ + st);
      bridgeGroup.add(stanchion);
    }
  }

  // 7. Outer Bridgehead Bastion Plinths & Iron Fire Braziers
  const plinthGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
  const brazierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  for (const side of [-1, 1]) {
    const plinth = new THREE.Mesh(plinthGeo, pierMat);
    const plinthX = side * (bridgeWidth / 2 + 1.1);
    plinth.position.set(plinthX, 0.7, 33.2);
    plinth.castShadow = true;
    bridgeGroup.add(plinth);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 0.4, 8), brazierMat);
    bowl.position.set(plinthX, 1.55, 33.2);
    bridgeGroup.add(bowl);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), flameMat);
    flame.position.set(plinthX, 1.95, 33.2);
    bridgeGroup.add(flame);
  }

  // 8. Outer Cobblestone Road leading away from the Drawbridge toward the World Map
  const outerRoad = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.08, 10.0),
    new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.8 })
  );
  outerRoad.position.set(0, 0.18, 38.0);
  outerRoad.receiveShadow = true;
  bridgeGroup.add(outerRoad);

  scene.add(bridgeGroup);
  return bridgeGroup;
}

/**
 * Builds the outer curtain walls, fortified bastions, rampart sentry defenders, and arched gatehouse
 */
function buildCityWalls(scene: THREE.Scene, level: number): THREE.Object3D {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'kingdom-walls';

  const stoneTex = getStoneWallTexture();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8 });
  const blueRoofTex = getRoofTileTexture('#1e40af');
  const blueRoofMat = new THREE.MeshStandardMaterial({ map: blueRoofTex, roughness: 0.5 });

  const radius = 24;
  const numTowers = 8;
  const wallHeight = 3.6 + Math.min(level * 0.15, 1.4);
  let gatehouseMesh: THREE.Object3D | null = null;

  // Tower angles: tower 2 is at angle PI/2 (X = 0, Z = 24), which is the South Gate!
  for (let i = 0; i < numTowers; i++) {
    const angle = (Math.PI * 2 * i) / numTowers;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    // Tower 2 is the Grand South Gatehouse portal
    if (i === 2) {
      gatehouseMesh = buildGatehouse(0, radius, wallHeight);
      wallGroup.add(gatehouseMesh);
      continue;
    }

    // Bastion Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, wallHeight + 2.5, 8), stoneMat);
    tower.position.set(x, (wallHeight + 2.5) / 2, z);
    tower.castShadow = true;
    wallGroup.add(tower);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.6, 8), blueRoofMat);
    roof.position.set(x, wallHeight + 2.5 + 1.3, z);
    roof.castShadow = true;
    wallGroup.add(roof);

    // Curtain Wall connecting to next tower
    const nextAngle = (Math.PI * 2 * (i + 1)) / numTowers;
    let nextX = radius * Math.cos(nextAngle);
    let nextZ = radius * Math.sin(nextAngle);

    // If connecting to/from the South Gatehouse, connect cleanly to its flanking pillars
    let curX = x;
    let curZ = z;
    if (i === 1) {
      // Connect Tower 1 to Gatehouse East Wing (X = 3.8, Z = 24)
      nextX = 3.8;
      nextZ = radius;
    }

    const wallLen = Math.hypot(nextX - curX, nextZ - curZ) - 1.2;
    if (wallLen > 1) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, wallHeight, wallLen), stoneMat);
      const midX = (curX + nextX) / 2;
      const midZ = (curZ + nextZ) / 2;
      const wallAngle = Math.atan2(nextZ - curZ, nextX - curX);

      wall.position.set(midX, wallHeight / 2, midZ);
      wall.rotation.y = -wallAngle + Math.PI / 2;
      wall.receiveShadow = true;
      wall.castShadow = true;
      wallGroup.add(wall);
    }
  }

  // Connect Gatehouse West Wing (X = -3.8, Z = 24) to Tower 3 (angle 3PI/4)
  const tower3Angle = (Math.PI * 2 * 3) / numTowers;
  const t3X = radius * Math.cos(tower3Angle);
  const t3Z = radius * Math.sin(tower3Angle);
  const gWestX = -3.8;
  const gWestZ = radius;
  const wWallLen = Math.hypot(t3X - gWestX, t3Z - gWestZ) - 1.2;
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, wallHeight, wWallLen), stoneMat);
  const wMidX = (gWestX + t3X) / 2;
  const wMidZ = (gWestZ + t3Z) / 2;
  const wWallAngle = Math.atan2(t3Z - gWestZ, t3X - gWestX);
  westWall.position.set(wMidX, wallHeight / 2, wMidZ);
  westWall.rotation.y = -wWallAngle + Math.PI / 2;
  westWall.receiveShadow = true;
  westWall.castShadow = true;
  wallGroup.add(westWall);

  // Add Wall Sentries and Defenders guarding the citadel ramparts
  buildWallDefenders(wallGroup, wallHeight);

  scene.add(wallGroup);
  return gatehouseMesh || wallGroup;
}

/**
 * Places armed sentry guards along the citadel ramparts guarding the gate and drawbridge
 */
function buildWallDefenders(wallGroup: THREE.Group, wallHeight: number): void {
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
  const spearMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });

  for (const side of [-1, 1]) {
    const sentry = new THREE.Group();
    sentry.name = `wall-sentry-${side < 0 ? 'west' : 'east'}`;
    sentry.position.set(side * 4.6, wallHeight + 0.1, 23.6);
    sentry.rotation.y = Math.PI; // Facing outward toward the drawbridge & approaching armies

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.3, 6), armorMat);
    body.position.y = 0.65;
    sentry.add(body);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 6), armorMat);
    helm.position.y = 1.4;
    sentry.add(helm);

    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.5), shieldMat);
    shield.position.set(-0.38, 0.75, 0.15);
    sentry.add(shield);

    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5), spearMat);
    spear.position.set(0.38, 1.2, 0.2);
    sentry.add(spear);

    wallGroup.add(sentry);
  }
}

/**
 * Builds the Grand South Gatehouse linking the Citadel to the World Map
 */
function buildGatehouse(centerX: number, centerZ: number, wallHeight: number): THREE.Group {
  const gate = new THREE.Group();
  gate.name = 'city-gatehouse-portal';

  const stoneTex = getStoneWallTexture();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.85 });

  // Twin Flanking Gate Towers (procedural initial/fallback)
  const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, wallHeight + 2.8, 2.6), stoneMat);
  pillar1.position.set(-2.8, (wallHeight + 2.8) / 2, 0);
  const pillar2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, wallHeight + 2.8, 2.6), stoneMat);
  pillar2.position.set(2.8, (wallHeight + 2.8) / 2, 0);

  // Arched Lintel Span
  const arch = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 2.8), stoneMat);
  arch.position.set(0, wallHeight + 2.2, 0);

  // Portcullis Iron Grate & Heavy Timber Doors
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.8, wallHeight, 0.4), woodMat);
  door.position.set(0, wallHeight / 2, 0);

  // Gatehouse Crest Shield & Flag
  const crest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.2), goldTrimMat);
  crest.position.set(0, wallHeight + 2.4, 1.5);

  gate.add(pillar1, pillar2, arch, door, crest);
  gate.position.set(centerX, 0, centerZ);
  gate.rotation.y = 0; // Facing directly South toward drawbridge

  // Asynchronously load real external 3D Gatehouse GLB model
  medievalModelService
    .loadGLTF('/assets/medieval/buildings/gate.glb')
    .then((gltf) => {
      const realGate = gltf.scene.clone(true);
      realGate.scale.set(3.4, 3.4, 3.4);
      realGate.rotation.y = 0; // Aligned with the perimeter wall curve and South drawbridge portal
      realGate.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Replace procedural gate parts with external GLB
      while (gate.children.length > 0) {
        gate.remove(gate.children[0]);
      }
      gate.add(realGate);
    })
    .catch(() => {
      // Keep procedural fallback if GLB fails
    });

  return gate;
}

/**
 * Builds realistic medieval vegetation using real external GLB assets (Pine Firs, Tree Groves, Granite Boulders)
 * with procedural fallback if assets fail.
 */
function buildVegetationAndFoliage(scene: THREE.Scene): void {
  // Load real external GLB nature props
  medievalModelService.createNatureProps(scene).catch((err) => {
    console.warn('[Kingdom3DCanvas] Real nature assets failed, using procedural fallback:', err);
    buildProceduralVegetationFallback(scene);
  });
}

/**
 * Procedural vegetation fallback if GLB nature assets cannot be loaded
 */
function buildProceduralVegetationFallback(scene: THREE.Scene): void {
  const foliageGroup = new THREE.Group();
  foliageGroup.name = 'kingdom-foliage-fallback';

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85, flatShading: true });
  const oakLeavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });

  // 1. Clustered Pine Firs (Forest edge along perimeter)
  const pineCoords = [
    { x: 19, z: -18, s: 1.2 },
    { x: 21, z: -16, s: 0.9 },
    { x: 17, z: -20, s: 1.1 },
    { x: 20, z: 2, s: 1.3 },
    { x: 21, z: 5, s: 1.0 },
    { x: -19, z: -18, s: 1.1 },
    { x: -21, z: -15, s: 0.95 },
    { x: -20, z: 2, s: 1.25 },
    { x: -21, z: 5, s: 1.0 },
  ];

  pineCoords.forEach(({ x, z, s }) => {
    const pine = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 2.4 * s, 6), trunkMat);
    trunk.position.y = 1.2 * s;
    trunk.castShadow = true;
    pine.add(trunk);

    for (let t = 0; t < 3; t++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry((1.8 - t * 0.35) * s, 1.8 * s, 7),
        pineNeedleMat
      );
      cone.position.y = (1.8 + t * 1.1) * s;
      cone.castShadow = true;
      pine.add(cone);
    }
    pine.position.set(x, 0, z);
    foliageGroup.add(pine);
  });

  // 2. Broadleaf Oak Trees (Inner courtyards)
  const oakCoords = [
    { x: -6.5, z: -13.5, s: 1.1 },
    { x: 6.5, z: -13.5, s: 1.1 },
    { x: 8.5, z: 4.5, s: 1.0 },
    { x: -8.5, z: 4.5, s: 1.0 },
  ];

  oakCoords.forEach(({ x, z, s }) => {
    const oak = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.38 * s, 2.2 * s, 8), trunkMat);
    trunk.position.y = 1.1 * s;
    trunk.castShadow = true;
    oak.add(trunk);

    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 * s, 1), oakLeavesMat);
    canopy.position.y = 3.0 * s;
    canopy.castShadow = true;
    oak.add(canopy);

    oak.position.set(x, 0, z);
    foliageGroup.add(oak);
  });

  // 3. Granite Boulders
  const rockCoords = [
    { x: -16, z: 15, r: 0.9 },
    { x: -17, z: 14, r: 0.6 },
    { x: 16, z: 14, r: 0.8 },
    { x: 17, z: -5, r: 0.7 },
  ];

  rockCoords.forEach(({ x, z, r }) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    rock.position.set(x, r * 0.7, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    foliageGroup.add(rock);
  });

  scene.add(foliageGroup);
}

// Architectural lot locations inside kingdom grounds
export const DISTRICT_SLOTS: Record<string, { x: number; z: number }> = {
  center: { x: 0, z: -2.0 },
  warehouse: { x: -6.5, z: 0 },
  academy: { x: 6.5, z: 0 },
  hospital: { x: 0, z: -9.5 },
  farm_1: { x: 13.5, z: -10.5 },
  lumber_1: { x: 13.5, z: 8.5 },
  quarry_1: { x: -13.5, z: 10.5 },
  iron_1: { x: -14.5, z: -3.5 },
  gold_1: { x: -13.5, z: -11.0 },
  barracks: { x: -7.5, z: 9.5 },
  archery: { x: 0, z: 11.5 },
  stable: { x: 7.5, z: 9.5 },
};

/**
 * Builds all functional kingdom buildings and attaches them for interactive raycast selection.
 * PRIMARY RENDER PATH: Loads legitimate external GLB assets via medievalModelService.
 * FALLBACK PATH: Only instantiates procedural models if GLB asset loading fails.
 */
function buildKingdomBuildings(
  scene: THREE.Scene,
  buildings: BuildingInstance[],
  queue: ConstructionTask[],
  interactiveMap: Map<THREE.Object3D, BuildingInstance>,
  windmillBlades: THREE.Object3D[],
  chimneyPoints: THREE.Vector3[],
  wavingBanners: THREE.Mesh[],
  armillarySpheres: THREE.Object3D[]
): void {
  const districtSlots = DISTRICT_SLOTS;

  buildings.forEach((b) => {
    const slot = districtSlots[b.slot] || { x: 0, z: 0 };

    // Create a dedicated container slot at the district lot location
    const slotContainer = new THREE.Group();
    slotContainer.name = `building-slot-${b.slot}-${b.id}`;
    slotContainer.position.set(slot.x, 0.2, slot.z);
    scene.add(slotContainer);

    // Register slotContainer to the interactiveMap for clean raycast selection
    interactiveMap.set(slotContainer, b);

    // Check if building is currently upgrading and attach upgrade aura/marker
    const activeTask = queue.find((t) => t.buildingId === b.id);
    if (activeTask) {
      addUpgradeEffects(slotContainer);
    }

    // PRIMARY PATH: Load the legitimate external GLB model via medievalModelService
    medievalModelService
      .createBuildingMesh(b, (fanMesh) => {
        windmillBlades.push(fanMesh);
      })
      .then((realBuildingMesh) => {
        // Add external GLB building directly to slotContainer
        slotContainer.add(realBuildingMesh);
      })
      .catch((err) => {
        console.warn(`[Kingdom3DCanvas] GLB failed for ${b.type}, falling back to procedural:`, err);
        // FALLBACK ONLY: If external asset fails to load, render procedural model
        const fallback = buildArchitecturalComplex(b);
        slotContainer.add(fallback.group);

        if (fallback.windmillBlades) windmillBlades.push(fallback.windmillBlades);
        if (fallback.chimneys && fallback.chimneys.length > 0) {
          fallback.chimneys.forEach((c) => {
            chimneyPoints.push(new THREE.Vector3(c.x, c.y, c.z));
          });
        }
        if (fallback.bannerFlags && fallback.bannerFlags.length > 0) {
          fallback.bannerFlags.forEach((f) => wavingBanners.push(f));
        }
        if (fallback.armillarySphere) {
          armillarySpheres.push(fallback.armillarySphere);
        }
      });
  });
}

/**
 * Adds golden builder hammers and upgrade aura to upgrading buildings
 */
function addUpgradeEffects(group: THREE.Group): void {
  // Upward golden energy ring
  const auraGeo = new THREE.TorusGeometry(2.8, 0.08, 6, 28);
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.65 });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.45;
  group.add(aura);

  // Floating Builder Hammer Marker
  const hammerHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x78350f })
  );
  hammerHandle.position.set(0, 6.0, 0);
  const hammerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85 })
  );
  hammerHead.position.set(0, 6.6, 0);
  group.add(hammerHandle, hammerHead);
}
