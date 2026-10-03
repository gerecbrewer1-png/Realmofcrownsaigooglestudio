/**
 * Realm of Crowns — 3D Walkable Port Haven & Pirate Sea Cavern Canvas
 * 
 * Delivers a true-scale, immersive walkable 3D port exploration experience:
 * 1. Third-person control of the player's customized Citadel Hero (WASD / sprint / rally).
 * 2. Two rich procedural environments:
 *    - The Brethren's Vault: A colossal vaulted subterranean sea cavern grotto with
 *      carved stone skull totem columns, burning torch braziers, heaps of sparkling
 *      gold doubloons, ruby chests, skeletons in gibbet cages, and a moored flagship.
 *    - Archipelago Island Port: Cobblestone waterfront quays, colonial buildings (Tavern,
 *      Market, Shipyard, Governor), market stalls, street lamps, and tropical mountains.
 * 3. In-world interactive stations with proximity detection ([E] Interact):
 *    - Moored Flagship Gangway: Board ship and set sail into open seas.
 *    - Smuggler's Black Market / Store: Trade plundered contraband (+50% bonus).
 *    - Shipyard & Drydock: Hull repairs and fleet management.
 *    - Pirate Tavern: Recruit outlaw crew and hear sea rumors.
 *    - Pirate Code Truce Shrine / Governor: Sacred sanctuary blessing and bounties.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Anchor,
  Store,
  Hammer,
  Users,
  Shield,
} from 'lucide-react';
import { IslandHavenSpec } from '../../data/navalCatalog';
import { KingdomState, PlayerProfile, HeroClass } from '../../types';
import { ShipVisualService, SHIP_CATALOG } from './shipVisualService';
import { CoastalHarborBuilder } from './CoastalHarborBuilder';
import { createHeroMesh } from './heroModels';
import { createHeroAura } from './heroAuraSystem';
import { medievalModelService } from './medievalModelService';
import { soundEngine } from '../../audio/soundEngine';
import { createPortLifeSystem, PortLifeSystem, GuardNPC, VillagerNPC, VillageAnimal } from './PortLifeService';
import { NormalPortVillageBuilder } from './NormalPortVillageBuilder';
import { PirateGearService } from './PirateGearService';

export interface PortHavenCanvasProps {
  haven: IslandHavenSpec;
  kingdom: KingdomState;
  player: PlayerProfile;
  shipType?: string;
  onSetSail: () => void;
  onOpenStationModal: (station: 'shipyard' | 'market' | 'tavern' | 'bounty') => void;
}

interface InteractableStation {
  id: 'gangway' | 'market' | 'shipyard' | 'tavern' | 'shrine' | 'treasure';
  name: string;
  actionPrompt: string;
  pos: THREE.Vector3;
  icon: string;
  handler: () => void;
  color: string;
}

/**
 * Generates a high-resolution textured cobblestone gradient for port land surfaces.
 * Blends wet shoreline slate, weathered pirate paving stones, and warm inland earth tones.
 */
function createPortCobblestoneTexture(isCave: boolean, isPirate: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Base longitudinal depth gradient (Shoreline damp to inland)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  if (isCave) {
    baseGrad.addColorStop(0, '#18181b');
    baseGrad.addColorStop(0.35, '#27272a');
    baseGrad.addColorStop(0.7, '#3f3f46');
    baseGrad.addColorStop(1, '#52525b');
  } else if (isPirate) {
    baseGrad.addColorStop(0, '#1e293b'); // Dark ocean-wet basalt
    baseGrad.addColorStop(0.35, '#334155'); // Weathered corsair grey
    baseGrad.addColorStop(0.7, '#475569'); // Sun-bleached cobblestone
    baseGrad.addColorStop(1, '#57534e'); // Warm torchlit plaza
  } else {
    baseGrad.addColorStop(0, '#334155');
    baseGrad.addColorStop(0.4, '#64748b');
    baseGrad.addColorStop(0.8, '#94a3b8');
    baseGrad.addColorStop(1, '#cbd5e1');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Procedural Beveled Cobblestones / Flagstones
  const rows = 28;
  const cols = 28;
  const cellW = 1024 / cols;
  const cellH = 1024 / rows;

  for (let r = 0; r < rows; r++) {
    const rowOffset = (r % 2) * (cellW * 0.5);
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + rowOffset;
      const y = r * cellH;

      const hash = Math.sin(c * 17.13 + r * 63.41) * 43758.5453;
      const rand = hash - Math.floor(hash);
      const toneOffset = (rand - 0.5) * 36;

      const pad = 2.2;
      const stoneW = cellW - pad * 2;
      const stoneH = cellH - pad * 2;

      // Mortar groove gap
      ctx.fillStyle = isCave ? '#09090b' : '#0f172a';
      ctx.fillRect(x, y, cellW, cellH);

      // Radial bevel lighting per stone
      const stoneGrad = ctx.createRadialGradient(
        x + pad + stoneW * 0.38,
        y + pad + stoneH * 0.35,
        1,
        x + pad + stoneW * 0.5,
        y + pad + stoneH * 0.5,
        stoneW * 0.72
      );

      const rVal = Math.max(25, Math.min(185, (isCave ? 65 : isPirate ? 80 : 125) + toneOffset));
      const gVal = Math.max(25, Math.min(185, (isCave ? 58 : isPirate ? 88 : 125) + toneOffset * 0.9));
      const bVal = Math.max(25, Math.min(185, (isCave ? 50 : isPirate ? 98 : 130) + toneOffset * 0.8));

      stoneGrad.addColorStop(0, `rgb(${Math.min(255, rVal + 28)}, ${Math.min(255, gVal + 28)}, ${Math.min(255, bVal + 28)})`);
      stoneGrad.addColorStop(0.75, `rgb(${rVal}, ${gVal}, ${bVal})`);
      stoneGrad.addColorStop(1, `rgb(${Math.max(10, rVal - 32)}, ${Math.max(10, gVal - 32)}, ${Math.max(10, bVal - 32)})`);

      ctx.fillStyle = stoneGrad;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, stoneW, stoneH, 4);
      ctx.fill();

      // Subtle specular border highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 3. Fine noise and sand grain texture
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 18;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

/**
 * Generates weathered wooden dock plank textures with seam gaps, grain, and iron nails.
 */
function createPortPlankTexture(isCave: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isCave ? '#1c1917' : '#291b10';
  ctx.fillRect(0, 0, 1024, 1024);

  const plankCount = 20;
  const plankH = 1024 / plankCount;

  for (let p = 0; p < plankCount; p++) {
    const y = p * plankH;
    const tone = (Math.random() - 0.5) * 28;

    const plankGrad = ctx.createLinearGradient(0, y, 0, y + plankH);
    const rBase = isCave ? 60 + tone : 88 + tone;
    const gBase = isCave ? 42 + tone * 0.7 : 62 + tone * 0.7;
    const bBase = isCave ? 26 + tone * 0.5 : 38 + tone * 0.5;

    plankGrad.addColorStop(0, `rgb(${rBase + 16}, ${gBase + 14}, ${bBase + 10})`);
    plankGrad.addColorStop(0.5, `rgb(${rBase}, ${gBase}, ${bBase})`);
    plankGrad.addColorStop(1, `rgb(${Math.max(10, rBase - 22)}, ${Math.max(10, gBase - 18)}, ${Math.max(10, bBase - 14)})`);

    ctx.fillStyle = plankGrad;
    ctx.fillRect(0, y + 2, 1024, plankH - 4);

    // Grain striations
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 3; g++) {
      const lineY = y + 5 + g * (plankH / 3.5) + (Math.random() - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.bezierCurveTo(340, lineY + (Math.random() - 0.5) * 5, 680, lineY + (Math.random() - 0.5) * 5, 1024, lineY);
      ctx.stroke();
    }

    // Iron nail rivets
    ctx.fillStyle = '#0f172a';
    [80, 240, 520, 760, 940].forEach(nx => {
      ctx.beginPath();
      ctx.arc(nx, y + plankH * 0.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dark seam line
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, y, 1024, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 8);
  return texture;
}

export const PortHavenCanvas: React.FC<PortHavenCanvasProps> = ({
  haven,
  kingdom,
  player,
  shipType = 'galleon',
  onSetSail,
  onOpenStationModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStation, setActiveStation] = useState<InteractableStation | null>(null);
  const [, setHeroPromptText] = useState<string>('');
  const [, setIsSprint] = useState<boolean>(false);

  const isCave = haven.id === 'brethrens_vault' || haven.id.includes('vault') || haven.id.includes('cave');
  const isPirateHaven = isCave || haven.nation === 'pirates' || haven.id.includes('tortuga') || haven.id.includes('smuggler') || haven.id.includes('serpent') || haven.id.includes('quebradas');

  // Hero Commander Profile
  const activeCommander = kingdom.commander || {
    id: 'commander-default',
    name: player.displayName || 'Lord Commander',
    level: 1,
    heroClass: 'warlord' as HeroClass,
  };
  const heroClass = (activeCommander.heroClass || (activeCommander as any).class || 'warlord') as HeroClass;

  // Touch joystick state for mobile
  const [touchActive, setTouchActive] = useState<boolean>(false);
  const touchOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDir = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interactive Guard & Animal Dialogue Bubble
  const [activeNpcDialogue, setActiveNpcDialogue] = useState<{ speaker: string; role: string; text: string; icon: string } | null>(null);

  // References for render loop
  const animFrameId = useRef<number | null>(null);
  const heroPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.0, isCave ? 12 : 18));
  const heroHeadingRef = useRef<number>(0);
  const heroVelocityRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const heroMeshRef = useRef<THREE.Group | null>(null);
  const heroUpdateRef = useRef<((delta: number) => void) | null>(null);
  const realHeroActionTriggerRef = useRef<((name: string) => void) | null>(null);
  const heroAuraRef = useRef<any>(null);

  // Click-to-Move Target for NPC / Station Interaction
  const clickMoveTargetRef = useRef<{ station: InteractableStation; pos: THREE.Vector3 } | null>(null);
  const activeStationRef = useRef<InteractableStation | null>(null);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTime = useRef<number>(0);

  // Camera Orbit Parameters
  const cameraYaw = useRef<number>(Math.PI);
  const cameraPitch = useRef<number>(0.24);
  const cameraDist = useRef<number>(isCave ? 8.5 : 9.5);
  const isDragging = useRef<boolean>(false);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Input states: strictly Arrow keys for hero movement
  const keysDown = useRef<{ forward: boolean; backward: boolean; left: boolean; right: boolean; sprint: boolean }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  // Interactable Stations registry
  const interactablesRef = useRef<InteractableStation[]>([]);

  // Setup Three.js World
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const navMeshGroup = new THREE.Group();
    navMeshGroup.name = "navMeshLayer";
    navMeshGroup.layers.set(2);
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ visible: false }));
    floorMesh.position.y = 0.42; // Set NavMesh plane to cover modular dock platforms
    floorMesh.layers.set(2);
    navMeshGroup.add(floorMesh);
    scene.add(navMeshGroup);
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 2000);
    camera.position.set(0, 8, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isCave ? 1.35 : isPirateHaven ? 1.25 : 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // 1. Environment & Lighting Setup
    if (isCave) {
      // Subterranean Pirate Cavern Atmosphere - Rich warm golden torchlight & emerald lagoon
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.005);

      // Warm golden ambient fill
      const ambientLight = new THREE.AmbientLight(0x78350f, 2.0);
      scene.add(ambientLight);

      // Overhead golden cavern sunlight beam
      const fissureLight = new THREE.DirectionalLight(0xfef08a, 2.5);
      fissureLight.position.set(20, 70, 20);
      fissureLight.target.position.set(0, 0, 15);
      scene.add(fissureLight);
      scene.add(fissureLight.target);

      // Central blazing chandelier / fiery brazier cluster
      const centralTorch = new THREE.PointLight(0xf97316, 5.5, 180);
      centralTorch.position.set(0, 16, 15);
      scene.add(centralTorch);

      // Emerald lagoon glow deep in the grotto
      const emeraldLagoonLight = new THREE.PointLight(0x10b981, 4.8, 160);
      emeraldLagoonLight.position.set(-15, 4, -18);
      scene.add(emeraldLagoonLight);

      // Violet Black Market Truce glow
      const purpleTruceLight = new THREE.PointLight(0xa855f7, 4.2, 140);
      purpleTruceLight.position.set(22, 10, 35);
      scene.add(purpleTruceLight);
    } else if (isPirateHaven) {
      // Dramatic Golden-Orange Sunset & Twilight for Island Pirate Strongholds
      scene.background = new THREE.Color(0xd97706);
      scene.fog = new THREE.FogExp2(0x451a03, 0.0035);

      const ambientLight = new THREE.AmbientLight(0x78350f, 1.8);
      scene.add(ambientLight);

      const sunsetSun = new THREE.DirectionalLight(0xfdba74, 3.2);
      sunsetSun.position.set(110, 85, -40);
      sunsetSun.castShadow = true;
      scene.add(sunsetSun);
    } else {
      // Tropical Open-Air Island Port Atmosphere
      scene.background = new THREE.Color(0x38bdf8);
      scene.fog = new THREE.Fog(0x38bdf8, 200, 1200);

      const ambientLight = new THREE.AmbientLight(0xe0f2fe, 1.4);
      scene.add(ambientLight);

      const sun = new THREE.DirectionalLight(0xfffbeb, 2.6);
      sun.position.set(80, 150, 70);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      scene.add(sun);
    }

    // 2. Build Procedural Environment (Cavern Grotto or Island Port)
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Colliders bounding walkable area
    const colliders: THREE.Box3[] = [];

    // Shared GPU Uniforms for Dynamic Ground Gradient Processing as Hero Moves (Zero Latency)
    const groundUniforms = {
      uHeroPos: { value: new THREE.Vector2(heroPositionRef.current.x, heroPositionRef.current.z) },
      uTime: { value: 0 },
      uIsMoving: { value: 0 },
      uHeroSpeed: { value: 0 },
    };

    const attachDynamicGroundShader = (mat: THREE.MeshStandardMaterial) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uHeroPos = groundUniforms.uHeroPos;
        shader.uniforms.uTime = groundUniforms.uTime;
        shader.uniforms.uIsMoving = groundUniforms.uIsMoving;
        shader.uniforms.uHeroSpeed = groundUniforms.uHeroSpeed;

        shader.vertexShader = `
          varying vec3 vWorldPos;
          ${shader.vertexShader}
        `.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );

        shader.fragmentShader = `
          uniform vec2 uHeroPos;
          uniform float uTime;
          uniform float uIsMoving;
          uniform float uHeroSpeed;
          varying vec3 vWorldPos;
          ${shader.fragmentShader}
        `.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          // --- DYNAMIC GROUND PROCESSING AS HERO MOVES ---
          float dHero = distance(vWorldPos.xz, uHeroPos);

          // 1. Radiant Hero Focal Glow (illuminates textured stone grain within 7.5m radius)
          float heroAura = smoothstep(7.5, 0.4, dHero);

          // 2. Dynamic Stepping Footfall Ripples (expands outward as hero walks)
          float footPulse = uIsMoving * 0.28 * sin(dHero * 3.8 - uTime * 8.5) * smoothstep(6.0, 0.0, dHero);

          // 3. Port Haven Depth Gradient (Harbor edge wet basalt to inland warm stone)
          float depthGrad = smoothstep(-35.0, 55.0, vWorldPos.z);
          vec3 depthGlow = mix(vec3(0.01, 0.05, 0.08), vec3(0.08, 0.04, 0.01), depthGrad);

          // Blend dynamic golden/emerald hero resonance with textured ground
          vec3 heroIllumination = vec3(0.96, 0.76, 0.38) * (heroAura * 0.38 + footPulse);
          gl_FragColor.rgb += heroIllumination + depthGlow;
          `
        );
      };
    };

    // Procedural Textured Gradients for Land Grounds
    const cobbleTex = createPortCobblestoneTexture(isCave, isPirateHaven);
    const plankTex = createPortPlankTexture(isCave);

    // Water Surface (Subterranean Lagoon or Harbor Bay)
    const waterGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: isCave ? 0x064e3b : isPirateHaven ? 0x0f766e : 0x0284c7,
      roughness: 0.12,
      metalness: 0.65,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.6;
    worldGroup.add(waterMesh);

    if (isCave) {
      // -------------------------------------------------------------
      // CASE A: The Brethren's Vault (Pirate Cavern Grotto)
      // -------------------------------------------------------------
      const wetRockMat = new THREE.MeshStandardMaterial({
        color: 0x52525b,
        map: cobbleTex,
        roughness: 0.65,
        metalness: 0.22,
      });
      attachDynamicGroundShader(wetRockMat);

      const woodMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: plankTex,
        roughness: 0.78,
      });
      attachDynamicGroundShader(woodMat);

      // Large Cavern Bedrock Platform with Dynamic Textured Gradient
      const caveBedrockGeo = new THREE.BoxGeometry(110, 2.0, 120);
      const caveBedrock = new THREE.Mesh(caveBedrockGeo, wetRockMat);
      caveBedrock.position.set(0, -0.2, 18);
      caveBedrock.receiveShadow = true;
      worldGroup.add(caveBedrock);

      // Cavern Dome Shell (Hollow dome inverted)
      const domeGeo = new THREE.SphereGeometry(120, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
      domeGeo.scale(1.2, 0.65, 1.1);
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.96,
        side: THREE.BackSide,
        flatShading: true,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(0, -2, 10);
      worldGroup.add(dome);

      // Hanging Stalactites from Cavern Roof
      const stalactites = [
        { x: -35, z: 15, h: 28, r: 4.5 },
        { x: 32, z: -10, h: 32, r: 5.0 },
        { x: 0, z: -25, h: 36, r: 5.5 },
        { x: -18, z: 45, h: 25, r: 4.0 },
        { x: 28, z: 40, h: 26, r: 4.2 },
        { x: -45, z: -15, h: 22, r: 3.8 },
      ];
      stalactites.forEach(st => {
        const stGeo = new THREE.ConeGeometry(st.r, st.h, 6);
        stGeo.rotateX(Math.PI);
        const stMesh = new THREE.Mesh(stGeo, wetRockMat);
        stMesh.position.set(st.x, 50 - st.h * 0.5, st.z);
        worldGroup.add(stMesh);
      });

      // Giant Carved Skull Totem Pillars lining the grotto (Reference Image #1)
      const skullPillars = [
        { x: -22, z: 0, eyeColor: 0xef4444 },
        { x: 22, z: 0, eyeColor: 0x10b981 },
        { x: -24, z: 28, eyeColor: 0xa855f7 },
        { x: 24, z: 28, eyeColor: 0xf59e0b },
      ];
      skullPillars.forEach(sp => {
        const pillar = CoastalHarborBuilder.createColossalSkullPillar(0.9, sp.eyeColor);
        pillar.position.set(sp.x, 1.0, sp.z);
        worldGroup.add(pillar);
      });

      // Smuggler Boardwalks & Stone Platforms (Walkable Zone, surface Y = 1.0)
      const boardwalkGeo = new THREE.BoxGeometry(42, 1.6, 65);
      const boardwalk = new THREE.Mesh(boardwalkGeo, woodMat);
      boardwalk.position.set(0, 0.2, 20);
      worldGroup.add(boardwalk);

      // Deep water pier removed for modular GLTF docks

      // Grounded Spanish Galleon Shipwreck lodged in the cavern rocks
      const wreck = new THREE.Group();
      wreck.position.set(-45, 2, -10);
      wreck.rotation.set(0.18, 0.45, -0.28);
      const wreckHullGeo = new THREE.BoxGeometry(16, 12, 45);
      const wreckHull = new THREE.Mesh(wreckHullGeo, woodMat);
      wreck.add(wreckHull);
      const wreckMastGeo = new THREE.CylinderGeometry(0.7, 1.0, 32, 6);
      wreckMastGeo.rotateZ(0.6);
      const wreckMast = new THREE.Mesh(wreckMastGeo, woodMat);
      wreckMast.position.set(6, 14, 0);
      wreck.add(wreckMast);
      worldGroup.add(wreck);

      // Heaps of Sparkling Gold Doubloons & Gem Chests (Reference Image #1)
      const goldPiles = [
        { x: -14, z: 24 },
        { x: 16, z: 26 },
        { x: -10, z: 42 },
        { x: 10, z: 42 },
      ];
      goldPiles.forEach(gp => {
        const mound = CoastalHarborBuilder.createTreasurePile(2.0);
        mound.position.set(gp.x, 1.0, gp.z);
        worldGroup.add(mound);
      });

      // Hanging Iron Gibbet Cages with Skeletons
      const gibbets = [
        { x: -10, y: 12, z: 5 },
        { x: 10, y: 13, z: 5 },
        { x: -8, y: 14, z: 32 },
        { x: 8, y: 14, z: 32 },
      ];
      gibbets.forEach(gb => {
        const cage = CoastalHarborBuilder.createHangingGibbetCage(1.3);
        cage.position.set(gb.x, gb.y, gb.z);
        worldGroup.add(cage);
      });

      // Torches & Fire Braziers
      const braziers = [
        { x: -6, z: -30 },
        { x: 6, z: -30 },
        { x: -15, z: 12 },
        { x: 15, z: 12 },
        { x: -15, z: 36 },
        { x: 15, z: 36 },
      ];
      braziers.forEach(bp => {
        const bz = CoastalHarborBuilder.createFireBrazier(1.2);
        bz.position.set(bp.x, 1.0, bp.z);
        worldGroup.add(bz);
      });

      // Smuggler Stalls & Contraband Barrels
      for (let i = 0; i < 12; i++) {
        const barrelGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.8, 8);
        const barrel = new THREE.Mesh(barrelGeo, woodMat);
        barrel.position.set(-18 + (i % 4) * 2.2, 2.0, 18 + Math.floor(i / 4) * 3);
        worldGroup.add(barrel);
      }
    } else {
      // -------------------------------------------------------------
      // CASE B: Archipelago Island Port (Colonial Town & Docks)
      // -------------------------------------------------------------
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: cobbleTex,
        roughness: 0.82,
      });
      attachDynamicGroundShader(stoneMat);

      const woodMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: plankTex,
        roughness: 0.78,
      });
      attachDynamicGroundShader(woodMat);

      if (!isPirateHaven) {
        // --- NORMAL COLONIAL & MEDITERRANEAN VILLAGE & HARBOR (Based on Reference Images 1 & 2) ---
        // Generates bustling multi-story village streets, striped market awnings, fruit crates,
        // rope-wrapped pier pilings, and moored tall ships
        NormalPortVillageBuilder.buildNormalPortVillage(
          worldGroup,
          stoneMat,
          woodMat,
          colliders,
          { havenName: haven.name, nation: haven.nation }
        );
      } else {
        // --- PIRATE ISLAND STRONGHOLD (Tortuga / Smuggler Haven) ---
        const houseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, flatShading: true });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.75, flatShading: true });
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.95 });
        const mountainMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, flatShading: true });

        // Sandy Coastline
        const beachGeo = new THREE.PlaneGeometry(350, 80);
        beachGeo.rotateX(-Math.PI * 0.5);
        const beach = new THREE.Mesh(beachGeo, sandMat);
        beach.position.set(0, 0.05, 50);
        worldGroup.add(beach);

        // Distant Mountain Ridge Backdrop
        for (let m = 0; m < 5; m++) {
          const peakGeo = new THREE.CylinderGeometry(15, 65, 110, 8);
          const peak = new THREE.Mesh(peakGeo, mountainMat);
          peak.position.set(-140 + m * 70, 50, 120 + (m % 2) * 25);
          worldGroup.add(peak);
        }

        // Stone Quay & Waterfront Promenade (Walkable top surface Y = 1.0)
        const quayGeo = new THREE.BoxGeometry(160, 1.8, 45);
        const quay = new THREE.Mesh(quayGeo, stoneMat);
        quay.position.set(0, 0.1, 15);
        quay.receiveShadow = true;
        worldGroup.add(quay);

        // Deep-water Wooden Pier removed for modular GLTF docks

        // Cobblestone Main Town Plaza with Textured Gradient
        const plazaGeo = new THREE.BoxGeometry(140, 1.8, 50);
        const plaza = new THREE.Mesh(plazaGeo, stoneMat);
        plaza.position.set(0, 0.1, 50);
        plaza.receiveShadow = true;
        worldGroup.add(plaza);

        // Pirate Houses & Storehouses
        const buildings = [
          { x: -38, z: 35, w: 20, h: 14, d: 16, name: 'Tavern' },
          { x: 38, z: 35, w: 22, h: 15, d: 18, name: 'Shipyard' },
          { x: -30, z: 62, w: 18, h: 13, d: 15, name: 'Storehouse' },
          { x: 30, z: 62, w: 20, h: 14, d: 16, name: 'Customs' },
          { x: 0, z: 72, w: 28, h: 18, d: 20, name: 'Governor' },
        ];

        buildings.forEach(b => {
          const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), houseMat);
          bMesh.position.set(b.x, 1.0 + b.h * 0.5, b.z);
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;
          worldGroup.add(bMesh);

          const rMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.72, 7.5, 4), roofMat);
          rMesh.rotation.y = Math.PI * 0.25;
          rMesh.position.set(b.x, 1.0 + b.h + 3.75, b.z);
          const box = new THREE.Box3();
          box.setFromCenterAndSize(new THREE.Vector3(b.x, 10, b.z), new THREE.Vector3(b.w + 1, 30, b.d + 1));
          colliders.push(box);
        });

        // Pirate Market Stalls
        const stallX = [-18, 18];
        stallX.forEach(sx => {
          const stallGeo = new THREE.BoxGeometry(7, 2, 4);
          const stall = new THREE.Mesh(stallGeo, woodMat);
          stall.position.set(sx, 2.0, 32);
          worldGroup.add(stall);

          const awningMat = new THREE.MeshStandardMaterial({ color: sx < 0 ? 0x991b1b : 0xd97706, roughness: 0.8 });
          const awningGeo = new THREE.BoxGeometry(7.5, 0.4, 4.5);
          const awning = new THREE.Mesh(awningGeo, awningMat);
          awning.position.set(sx, 4.2, 32);
          awning.rotation.x = -0.15;
          worldGroup.add(awning);
        });

        // Spiked Skull Stakes guarding the pier & quays
        const skullStakes = [
          { x: -14, z: -40 },
          { x: 14, z: -40 },
          { x: -14, z: -15 },
          { x: 14, z: -15 },
          { x: -35, z: 2 },
          { x: 35, z: 2 },
        ];
        skullStakes.forEach(p => {
          const stake = CoastalHarborBuilder.createSpikedSkullStake(1.5);
          stake.position.set(p.x, 1.0, p.z);
          worldGroup.add(stake);
        });

        // Plunder Treasure Piles & Chests
        const goldPiles = [
          { x: -14, z: 24 },
          { x: 16, z: 24 },
        ];
        goldPiles.forEach(gp => {
          const pile = CoastalHarborBuilder.createTreasurePile(1.6);
          pile.position.set(gp.x, 1.0, gp.z);
          worldGroup.add(pile);
        });

        // Fire Braziers along the pier approach
        const braziers = [
          { x: -12, z: -30 },
          { x: 12, z: -30 },
          { x: -25, z: 20 },
          { x: 25, z: 20 },
        ];
        braziers.forEach(bp => {
          const bz = CoastalHarborBuilder.createFireBrazier(1.3);
          bz.position.set(bp.x, 1.0, bp.z);
          worldGroup.add(bz);
        });

        // Contraband Rum Barrels along the docks
        for (let b = 0; b < 10; b++) {
          const barrelGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.8, 8);
          const barrel = new THREE.Mesh(barrelGeo, woodMat);
          barrel.position.set(-16 + (b % 3) * 2.5, 1.8, -10 + Math.floor(b / 3) * 3);
          worldGroup.add(barrel);
        }
      }
    }

    // 3. Player's Moored Flagship Floating at the Pier
    const playerShipSpec = SHIP_CATALOG[shipType] || SHIP_CATALOG.galleon;
    const mooredShip = ShipVisualService.createShipMesh(
      playerShipSpec,
      false,
      (isCave || isPirateHaven) ? 'pirates' : (haven.nation as any) || 'sovereign'
    );
    mooredShip.position.set(isCave ? 26 : 30, -0.4, isCave ? -32 : -36);
    mooredShip.rotation.y = -Math.PI * 0.45;
    mooredShip.scale.set(0.95, 0.95, 0.95);
    worldGroup.add(mooredShip);

    // 4. Register In-World Interactive Stations
    const stations: InteractableStation[] = [
      {
        id: 'gangway',
        name: 'Moored Flagship Gangway',
        actionPrompt: 'Board Flagship & Set Sail to Open Sea',
        pos: new THREE.Vector3(isCave ? 10 : 12, 1.4, isCave ? -28 : -32),
        icon: '⚓',
        color: '#38bdf8',
        handler: () => {
          soundEngine.playShipBell();
          onSetSail();
        },
      },
      {
        id: 'market',
        name: isCave ? "Smuggler's Black Market Fence" : isPirateHaven ? "Tortuga Black Market & Contraband Fence" : 'Marketplace Emporium',
        actionPrompt: isCave ? 'Fence Contraband (+50% Smuggler Payout)' : isPirateHaven ? 'Fence Plunder & Contraband (+35% Pirate Payout)' : 'Trade Goods & Plunder',
        pos: new THREE.Vector3(isCave ? -12 : -18, 1.4, isCave ? 18 : 32),
        icon: '💰',
        color: '#f59e0b',
        handler: () => {
          soundEngine.playCoins();
          onOpenStationModal('market');
        },
      },
      {
        id: 'shipyard',
        name: isCave ? "Smuggler's Outlaw Drydock" : isPirateHaven ? "Buccaneer Slipway & Drydock" : 'Naval Shipyard Master',
        actionPrompt: isCave ? 'Outlaw Warships, Dragon Junks & Hull Repairs' : isPirateHaven ? 'Corsair Raider Refits & Hull Repairs' : 'Fleet Upgrades & Careening',
        pos: new THREE.Vector3(isCave ? 18 : 36, 1.4, isCave ? 18 : 36),
        icon: '🔨',
        color: '#ef4444',
        handler: () => {
          soundEngine.playClick();
          onOpenStationModal('shipyard');
        },
      },
      {
        id: 'tavern',
        name: isCave ? 'The Drowned Rat Pirate Tavern' : isPirateHaven ? 'The Jolly Roger Buccaneer Tavern' : 'Harbor Tavern',
        actionPrompt: isCave ? 'Recruit Outlaw Rowers & Dark Rumors' : isPirateHaven ? 'Hire Buccaneer Cutthroats & Buy Rum' : 'Hire Sailors & Local Quests',
        pos: new THREE.Vector3(isCave ? -14 : -35, 1.4, isCave ? 38 : 46),
        icon: '🍺',
        color: '#10b981',
        handler: () => {
          soundEngine.playClick();
          onOpenStationModal('tavern');
        },
      },
      {
        id: 'shrine',
        name: isCave ? 'Sacred Pirate Code Truce Shrine' : isPirateHaven ? 'Brethren of the Coast Council & Bounties' : "Governor's Port Authority",
        actionPrompt: isCave ? 'Commune with Brethren Altar (Truce Protection)' : isPirateHaven ? 'Pirate Code Truce & Raider Bounties' : 'Letters of Marque & Royal Bounties',
        pos: new THREE.Vector3(isCave ? 14 : 0, 1.4, isCave ? 38 : 72),
        icon: (isCave || isPirateHaven) ? '🏴‍☠️' : '👑',
        color: '#a855f7',
        handler: () => {
          soundEngine.playFanfare();
          onOpenStationModal('bounty');
        },
      },
    ];
    interactablesRef.current = stations;

    // Visual Station Beacon Markers
    stations.forEach(st => {
      const beaconGroup = new THREE.Group();
      beaconGroup.position.copy(st.pos);

      // Pulsing floor ring
      const ringGeo = new THREE.RingGeometry(1.4, 1.8, 24);
      ringGeo.rotateX(-Math.PI * 0.5);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(st.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      beaconGroup.add(ringMesh);

      // Overhead floating diamond
      const diamondGeo = new THREE.OctahedronGeometry(0.55, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(st.color),
        emissive: new THREE.Color(st.color),
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });
      const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
      diamondMesh.position.y = 2.8;
      beaconGroup.add(diamondMesh);

      worldGroup.add(beaconGroup);
    });

    // 5. Spawn Citadel Hero Commander
    const heroSlotGroup = new THREE.Group();
    heroSlotGroup.position.copy(heroPositionRef.current);
    scene.add(heroSlotGroup);
    heroMeshRef.current = heroSlotGroup;

    // Procedural Fallback Mesh (configured for walking with legs touching ground, no pedestal dais)
    let heroBundle: ReturnType<typeof createHeroMesh> | null = createHeroMesh(heroClass, 0.95, true);
    // Attach period hat to procedural hero
    const proceduralHat = PirateGearService.createPeriodHat(
      isPirateHaven ? 'feathered_tricorne' : 'bicorne_naval',
      { scale: 0.9 }
    );
    proceduralHat.position.set(0, 2.05, 0);
    heroBundle.group.add(proceduralHat);
    heroSlotGroup.add(heroBundle.group);

    // Hero Power Aura matching Level
    const heroAura = createHeroAura(heroClass, activeCommander.level || 1, { scale: 1.0 });
    heroSlotGroup.add(heroAura.group);
    heroAuraRef.current = heroAura;

    // Hero Overhead Crest
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 64;
    const bCtx = badgeCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      bCtx.strokeStyle = isCave ? '#a855f7' : isPirateHaven ? '#f59e0b' : '#38bdf8';
      bCtx.lineWidth = 3;
      bCtx.beginPath();
      bCtx.roundRect(8, 8, 240, 48, 12);
      bCtx.fill();
      bCtx.stroke();

      bCtx.font = 'bold 20px sans-serif';
      bCtx.fillStyle = '#fef08a';
      bCtx.textAlign = 'center';
      bCtx.fillText(`Lv.${activeCommander.level} ${activeCommander.name}`, 128, 32);

      bCtx.font = 'bold 13px monospace';
      bCtx.fillStyle = '#38bdf8';
      bCtx.fillText(isCave ? '⚓ Grotto Exploration • ↑↓←→ Move' : isPirateHaven ? '🏴‍☠️ Pirate Haven • ↑↓←→ Move' : '⚔️ Citadel Hero • ↑↓←→ Move', 128, 48);
    }
    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
    badgeSprite.scale.set(2.6, 0.65, 1);
    badgeSprite.position.set(0, 2.5, 0);
    heroSlotGroup.add(badgeSprite);

    // Asynchronously load rigged hero model with skeletal animations
    medievalModelService.loadHeroCharacter(heroClass, 1.1)
      .then((realHero) => {
        if (!heroSlotGroup) return;
        if (heroBundle) {
          heroSlotGroup.remove(heroBundle.group);
          heroBundle = null;
        }

        // Attach authentic period hat to rigged hero's head bone so it follows all skeletal animations
        const hatType = isPirateHaven ? 'feathered_tricorne' : 'bicorne_naval';
        const riggedHat = PirateGearService.createPeriodHat(hatType, { scale: 0.92 });
        const heroHeadBone = realHero.group.getObjectByName('head') || realHero.group.getObjectByName('Head');
        if (heroHeadBone) {
          riggedHat.position.set(0, 0.28, 0.02);
          heroHeadBone.add(riggedHat);
        } else {
          riggedHat.position.set(0, 1.95, 0.05);
          realHero.group.add(riggedHat);
        }

        heroSlotGroup.add(realHero.group);
        heroUpdateRef.current = realHero.update;
        realHeroActionTriggerRef.current = (name: string) => {
          realHero.playAction(name, 0.25);
        };
      })
      .catch((err) => {
        console.warn('[PortHavenCanvas] Hero rigged load fallback to procedural:', err);
      });

    // 6. Spawn Port Life Ecosystem (Armored Sentry Guards & Village Animals)
    const portLife = createPortLifeSystem(scene, isCave, isPirateHaven);

    // 6. Keyboard Movement Listeners (Restricted to Arrow keys only)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      let handled = false;
      switch (e.code) {
        case 'ArrowUp':
          keysDown.current.forward = true;
          clickMoveTargetRef.current = null; // Instant manual control takeover with 0 latency
          handled = true;
          break;
        case 'ArrowDown':
          keysDown.current.backward = true;
          clickMoveTargetRef.current = null;
          handled = true;
          break;
        case 'ArrowLeft':
          keysDown.current.left = true;
          clickMoveTargetRef.current = null;
          handled = true;
          break;
        case 'ArrowRight':
          keysDown.current.right = true;
          clickMoveTargetRef.current = null;
          handled = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keysDown.current.sprint = true;
          setIsSprint(true);
          handled = true;
          break;
        case 'KeyE':
          if (activeStationRef.current) {
            activeStationRef.current.handler();
            handled = true;
          }
          break;
        case 'Space':
          soundEngine.playFanfare();
          heroAuraRef.current?.triggerAbilitySurge(3.5);
          realHeroActionTriggerRef.current?.('1H_Melee_Attack_Chop');
          handled = true;
          break;
      }
      if (handled) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
          keysDown.current.forward = false;
          break;
        case 'ArrowDown':
          keysDown.current.backward = false;
          break;
        case 'ArrowLeft':
          keysDown.current.left = false;
          break;
        case 'ArrowRight':
          keysDown.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keysDown.current.sprint = false;
          setIsSprint(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 7. Raycaster & Pointer Listeners (Click-to-Move only for NPCs / Stations, RMB for Orbit)
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
    const rayGroundPoint = new THREE.Vector3();

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
      pointerDownTime.current = performance.now();
      if (e.button === 0 || e.button === 2) {
        isDragging.current = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        pointerDownPos.current = { x: e.clientX, y: e.clientY };

        cameraYaw.current -= dx * 0.007;
        cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current + dy * 0.005, 0.05, 1.25);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging.current = false;

      // Detect deliberate click (vs camera drag)
      const dragDist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
      const clickDuration = performance.now() - pointerDownTime.current;

      if (e.button === 0 && dragDist < 8 && clickDuration < 380 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);

        let clickedStation: InteractableStation | null = null;
        if (raycaster.ray.intersectPlane(groundPlane, rayGroundPoint)) {
          // Check if clicked near an NPC Guard, Villager, or Animal first
          const hitLife = portLife.getInteractableAtPoint(rayGroundPoint, 5.0);
          if (hitLife) {
            soundEngine.playClick();
            const isAnimal = 'kind' in hitLife && (hitLife.kind === 'dog' || hitLife.kind === 'cat' || hitLife.kind === 'seagull' || hitLife.kind === 'donkey');
            const isVillager = 'kind' in hitLife && (hitLife.kind === 'maiden' || hitLife.kind === 'officer' || hitLife.kind === 'merchant' || hitLife.kind === 'dockhand');
            const isGuard = !isAnimal && !isVillager;
            const targetPos = hitLife.group.position.clone();
            const openDialogue = () => {
              if (isGuard) {
                soundEngine.playFanfare();
                const g = hitLife as GuardNPC;
                const isCouncil = g.name.includes('Bart') || g.name.includes('Morgan') || g.name.includes('Sterling');
                const isCampfire = g.name.includes('Vane') || g.name.includes('Flint') || g.name.includes('Darby');
                const isPirate = isCouncil || isCampfire || g.name.includes('Corsair') || g.name.includes('Buccaneer') || g.name.includes('Captain');
                const gIcon = isCouncil ? '💎' : isCampfire ? '🔥' : isPirate ? '🏴‍☠️' : '⚔️';
                setActiveNpcDialogue({
                  speaker: g.name,
                  role: g.role,
                  text: g.dialogue,
                  icon: gIcon,
                });
              } else if (isVillager) {
                soundEngine.playClick();
                const v = hitLife as VillagerNPC;
                const vIcon = v.kind === 'officer' ? '🎖️' : v.kind === 'maiden' ? '🌺' : v.kind === 'merchant' ? '💰' : '📦';
                setActiveNpcDialogue({
                  speaker: v.name,
                  role: v.role,
                  text: v.dialogue,
                  icon: vIcon,
                });
              } else {
                soundEngine.playLootReward();
                setActiveNpcDialogue({
                  speaker: hitLife.name,
                  role: `Village ${(hitLife as VillageAnimal).kind}`,
                  text: `You gently pet ${hitLife.name}. It happily snuggles close to your armor! 🐾`,
                  icon: '🐾',
                });
              }
            };

            const distToHero = Math.hypot(heroPositionRef.current.x - targetPos.x, heroPositionRef.current.z - targetPos.z);
            if (distToHero < 4.5) {
              openDialogue();
            } else {
              clickMoveTargetRef.current = {
                station: {
                  id: isGuard ? 'guard' : isVillager ? 'villager' : 'animal',
                  name: hitLife.name,
                  actionPrompt: isGuard
                    ? (hitLife as GuardNPC).dialogue
                    : isVillager
                    ? (hitLife as VillagerNPC).dialogue
                    : `Pet ${hitLife.name} the ${(hitLife as VillageAnimal).kind}`,
                  pos: targetPos,
                  icon: isGuard ? '⚔️' : isVillager ? '🌺' : '🐾',
                  handler: openDialogue,
                  color: isGuard ? '#38bdf8' : isVillager ? '#f472b6' : '#34d399',
                } as any,
                pos: targetPos,
              };
            }
            return;
          }

          let closestDist = 6.0;
          stations.forEach(st => {
            const d = Math.hypot(rayGroundPoint.x - st.pos.x, rayGroundPoint.z - st.pos.z);
            if (d < closestDist) {
              closestDist = d;
              clickedStation = st;
            }
          });
        }

        if (clickedStation) {
          // User clicked directly on a Station -> navigate and open
          soundEngine.playClick();
          clickMoveTargetRef.current = {
            station: clickedStation,
            pos: (clickedStation as InteractableStation).pos.clone(),
          };
        } else {
          // Empty land / ground was clicked -> DO NOT MOVE
          // Movement is reserved strictly to Arrow keys as requested
          clickMoveTargetRef.current = null;
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDist.current = THREE.MathUtils.clamp(cameraDist.current + e.deltaY * 0.015, 6, 35);
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Pre-allocated math objects to guarantee 0 GC pressure and 60 FPS in render loop
    const _tempCamTarget = new THREE.Vector3();
    let proximityThrottleCounter = 0;

    // 8. Main 60 FPS Render & Animation Loop
    let lastTime = performance.now();
    let animTime = 0;

    const verticalRaycaster = new THREE.Raycaster();
    verticalRaycaster.layers.set(2);
    const downwardVec = new THREE.Vector3(0, -1, 0);

    const animate = (time: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      animTime += dt;

      // Bobbing moored flagship
      if (mooredShip) {
        mooredShip.position.y = -0.4 + Math.sin(animTime * 1.8) * 0.18;
        mooredShip.rotation.z = Math.sin(animTime * 1.4) * 0.025;
      }

      // Update Hero Aura, Skeletal Rig, & Procedural Hero Mesh (with dynamic walk animation)
      if (heroAura) heroAura.update(dt, animTime);
      if (heroUpdateRef.current) heroUpdateRef.current(dt);
      if (heroBundle) {
        const hSpeed = Math.hypot(heroVelocityRef.current.x, heroVelocityRef.current.z);
        heroBundle.updateAnimation(animTime, hSpeed);
      }

      // Update Port Life System (Guards breathing/tracking & village animals roaming)
      portLife.update(dt, heroPositionRef.current, animTime);

      // --- HERO MOVEMENT CONTROLLER (Smooth Kinematic Velocity & Shortest Angular Heading) ---
      const keys = keysDown.current;
      let moveX = 0;
      let moveZ = 0;

      // Keyboard input (strictly Arrow keys)
      const yaw = cameraYaw.current;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const hasManualKey = keys.forward || keys.backward || keys.left || keys.right;

      if (hasManualKey) {
        clickMoveTargetRef.current = null;
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
      } else if (clickMoveTargetRef.current) {
        // Auto-navigate towards clicked NPC / station / guard
        const target = clickMoveTargetRef.current;
        const toTargetX = target.pos.x - heroPositionRef.current.x;
        const toTargetZ = target.pos.z - heroPositionRef.current.z;
        const distToTarget = Math.hypot(toTargetX, toTargetZ);

        if (distToTarget > 3.0) {
          moveX = toTargetX / distToTarget;
          moveZ = toTargetZ / distToTarget;
        } else {
          // Reached the NPC/station! Trigger handler and clear target
          const targetStation = target.station;
          clickMoveTargetRef.current = null;
          targetStation.handler();
        }
      }

      // Touch joystick input (for mobile devices)
      if (touchActive && (Math.abs(touchDir.current.x) > 0.05 || Math.abs(touchDir.current.y) > 0.05)) {
        clickMoveTargetRef.current = null;
        moveX += fwdX * -touchDir.current.y + rightX * touchDir.current.x;
        moveZ += fwdZ * -touchDir.current.y + rightZ * touchDir.current.x;
      }

      const moveLen = Math.hypot(moveX, moveZ);
      const isMoving = moveLen > 0.01;

      // Smooth Kinematic Velocity with Butter-Smooth Acceleration & Deceleration
      const targetSpeed = isMoving ? (keys.sprint ? 9.2 : 5.0) : 0;
      const dirX = isMoving ? moveX / moveLen : 0;
      const dirZ = isMoving ? moveZ / moveLen : 0;

      const targetVx = dirX * targetSpeed;
      const targetVz = dirZ * targetSpeed;

      const accel = isMoving ? 22.0 : 26.0;
      heroVelocityRef.current.x += (targetVx - heroVelocityRef.current.x) * Math.min(1.0, accel * dt);
      heroVelocityRef.current.z += (targetVz - heroVelocityRef.current.z) * Math.min(1.0, accel * dt);

      const currentSpeed = Math.hypot(heroVelocityRef.current.x, heroVelocityRef.current.z);

      // Integrate Position
      const nextX = heroPositionRef.current.x + heroVelocityRef.current.x * dt;
      const nextZ = heroPositionRef.current.z + heroVelocityRef.current.z * dt;

      // Bounded Walkable Area
      let minX = isCave ? -32 : -75;
      let maxX = isCave ? 32 : 75;
      let minZ = isCave ? -38 : -50;
      let maxZ = isCave ? 52 : 90;

      heroPositionRef.current.x = THREE.MathUtils.clamp(nextX, minX, maxX);
      heroPositionRef.current.z = THREE.MathUtils.clamp(nextZ, minZ, maxZ);

      // Decoupled Vertical Raycast against NavMesh (Layer 2)
      verticalRaycaster.set(new THREE.Vector3(heroPositionRef.current.x, 100.0, heroPositionRef.current.z), downwardVec);
      const intersects = verticalRaycaster.intersectObject(navMeshGroup, true);
      if (intersects.length > 0) {
         heroPositionRef.current.y = intersects[0].point.y;
      } else {
         heroPositionRef.current.y = 1.0;
      }
      // Shortest Angular Heading Interpolation (prevents 360-degree snap spin)
      if (currentSpeed > 0.15) {
        const targetRotY = Math.atan2(heroVelocityRef.current.x, heroVelocityRef.current.z);
        let diff = targetRotY - heroHeadingRef.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        heroHeadingRef.current += diff * Math.min(1.0, 18.0 * dt);

        realHeroActionTriggerRef.current?.(keys.sprint ? 'Running_A' : 'Walking_A');
      } else {
        realHeroActionTriggerRef.current?.('Idle');
      }

      // Update ground dynamic processing uniforms (0 CPU allocation, 0 latency)
      groundUniforms.uHeroPos.value.set(heroPositionRef.current.x, heroPositionRef.current.z);
      groundUniforms.uTime.value = animTime;
      groundUniforms.uIsMoving.value = currentSpeed > 0.2 ? 1.0 : 0.0;
      groundUniforms.uHeroSpeed.value = currentSpeed;

      // Update hero mesh position in scene
      if (heroMeshRef.current) {
        heroMeshRef.current.position.set(heroPositionRef.current.x, heroPositionRef.current.y, heroPositionRef.current.z);
        heroMeshRef.current.rotation.y = heroHeadingRef.current;
      }

      // --- THIRD-PERSON CAMERA CHASE CONTROLLER (Zero GC Vector Lerp) ---
      const camPitch = cameraPitch.current;
      const camDist = cameraDist.current;
      const camYaw = cameraYaw.current;

      const camTargetX = heroPositionRef.current.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
      const camTargetY = heroPositionRef.current.y + Math.sin(camPitch) * camDist + 1.6;
      const camTargetZ = heroPositionRef.current.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;

      _tempCamTarget.set(camTargetX, camTargetY, camTargetZ);
      camera.position.lerp(_tempCamTarget, Math.min(1.0, 12 * dt));
      camera.lookAt(heroPositionRef.current.x, heroPositionRef.current.y + 1.4, heroPositionRef.current.z);

      // --- STATION & GUARD PROXIMITY DETECTION (Throttled to run every 6 frames for locked 60 FPS) ---
      proximityThrottleCounter++;
      if (proximityThrottleCounter % 6 === 0) {
        let closestStation: InteractableStation | null = null;
        let closestDist = 5.2; // 5.2m interact range

        stations.forEach(st => {
          const dist = Math.hypot(heroPositionRef.current.x - st.pos.x, heroPositionRef.current.z - st.pos.z);
          if (dist < closestDist) {
            closestDist = dist;
            closestStation = st;
          }
        });

        // Check proximity to guards
        let closestGuard: GuardNPC | null = null;
        let guardDist = 4.2;
        portLife.guards.forEach(g => {
          const d = Math.hypot(heroPositionRef.current.x - g.initialPos.x, heroPositionRef.current.z - g.initialPos.z);
          if (d < guardDist) {
            guardDist = d;
            closestGuard = g;
          }
        });

        // Check proximity to villagers (Harbor Maidens, Officers, Merchants)
        let closestVillager: VillagerNPC | null = null;
        let villagerDist = 4.2;
        portLife.villagers?.forEach(v => {
          const d = Math.hypot(heroPositionRef.current.x - v.initialPos.x, heroPositionRef.current.z - v.initialPos.z);
          if (d < villagerDist) {
            villagerDist = d;
            closestVillager = v;
          }
        });

        // Check proximity to animals
        let closestAnimal: VillageAnimal | null = null;
        let animalDist = 3.5;
        portLife.animals.forEach(a => {
          const d = Math.hypot(heroPositionRef.current.x - a.group.position.x, heroPositionRef.current.z - a.group.position.z);
          if (d < animalDist) {
            animalDist = d;
            closestAnimal = a;
          }
        });

        if (closestStation) {
          activeStationRef.current = closestStation;
          setActiveStation(closestStation);
          setHeroPromptText(`[E] ${(closestStation as InteractableStation).actionPrompt}`);
        } else if (closestGuard) {
          const guardObj = {
            id: 'guard',
            name: (closestGuard as GuardNPC).name,
            actionPrompt: `Speak with ${(closestGuard as GuardNPC).name}`,
            pos: (closestGuard as GuardNPC).initialPos,
            icon: '⚔️',
            handler: () => {
              soundEngine.playFanfare();
              setActiveNpcDialogue({
                speaker: (closestGuard as GuardNPC).name,
                role: (closestGuard as GuardNPC).role,
                text: (closestGuard as GuardNPC).dialogue,
                icon: '⚔️',
              });
            },
            color: '#38bdf8',
          } as any;
          activeStationRef.current = guardObj;
          setActiveStation(guardObj);
          setHeroPromptText(`[E] Speak with ${(closestGuard as GuardNPC).name}`);
        } else if (closestVillager) {
          const vIcon = (closestVillager as VillagerNPC).kind === 'officer' ? '🎖️' : (closestVillager as VillagerNPC).kind === 'maiden' ? '🌺' : (closestVillager as VillagerNPC).kind === 'merchant' ? '💰' : '📦';
          const villagerObj = {
            id: 'villager',
            name: (closestVillager as VillagerNPC).name,
            actionPrompt: `Speak with ${(closestVillager as VillagerNPC).name}`,
            pos: (closestVillager as VillagerNPC).initialPos,
            icon: vIcon,
            handler: () => {
              soundEngine.playClick();
              setActiveNpcDialogue({
                speaker: (closestVillager as VillagerNPC).name,
                role: (closestVillager as VillagerNPC).role,
                text: (closestVillager as VillagerNPC).dialogue,
                icon: vIcon,
              });
            },
            color: '#f472b6',
          } as any;
          activeStationRef.current = villagerObj;
          setActiveStation(villagerObj);
          setHeroPromptText(`[E] Speak with ${(closestVillager as VillagerNPC).name}`);
        } else if (closestAnimal) {
          const animalObj = {
            id: 'animal',
            name: (closestAnimal as VillageAnimal).name,
            actionPrompt: `Pet ${(closestAnimal as VillageAnimal).name} the ${(closestAnimal as VillageAnimal).kind}`,
            pos: (closestAnimal as VillageAnimal).group.position.clone(),
            icon: '🐾',
            handler: () => {
              soundEngine.playLootReward();
              setActiveNpcDialogue({
                speaker: (closestAnimal as VillageAnimal).name,
                role: `Village ${(closestAnimal as VillageAnimal).kind}`,
                text: `You gently pet ${(closestAnimal as VillageAnimal).name}. It happily snuggles close to your armor! 🐾`,
                icon: '🐾',
              });
            },
            color: '#34d399',
          } as any;
          activeStationRef.current = animalObj;
          setActiveStation(animalObj);
          setHeroPromptText(`[E] Pet ${(closestAnimal as VillageAnimal).name}`);
        } else {
          activeStationRef.current = null;
          setActiveStation(null);
          setHeroPromptText('');
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      portLife.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [haven, isCave, heroClass, shipType, activeCommander.level, onSetSail, onOpenStationModal]);

  // Touch joystick handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchOrigin.current = { x: touch.clientX, y: touch.clientY };
    touchDir.current = { x: 0, y: 0 };
    setTouchActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchOrigin.current.x;
    const dy = touch.clientY - touchOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    touchDir.current = {
      x: (Math.cos(angle) * clampedDist) / maxRadius,
      y: (Math.sin(angle) * clampedDist) / maxRadius,
    };
  };

  const handleTouchEnd = () => {
    setTouchActive(false);
    touchDir.current = { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* --- TOP STATUS & NAVIGATION HUD (Godot Style) --- */}
      <div className="absolute top-[148px] md:top-[142px] left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        {/* Left: Haven Banner & Faction Crest */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-amber-500/50 rounded-2xl px-4 py-2.5 shadow-2xl pointer-events-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400 flex items-center justify-center text-xl shadow-inner">
            {isCave ? '🏴‍☠️' : '🏰'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-amber-200 tracking-wide uppercase">
                {haven.name}
              </span>
              <span className="text-[10px] uppercase font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700/60">
                {haven.allegiance}
              </span>
              {isCave && (
                <span className="text-[10px] uppercase font-black bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-500 animate-pulse">
                  ⚔️ Sacred Truce
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
              <span>Commander: <strong className="text-amber-300">{activeCommander.name}</strong></span>
              <span>•</span>
              <span>Gold: <strong className="text-yellow-400">{kingdom.resources.gold.toLocaleString()}</strong></span>
              <span>•</span>
              <span>Class: <strong className="text-sky-300 uppercase">{heroClass}</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Controls Legend */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300 shadow-xl">
          <span className="font-semibold text-amber-400 font-mono">↑↓←→ Arrows</span> Walk
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-sky-400 font-mono">Click NPC</span> Navigate & Talk
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-amber-400 font-mono">Shift</span> Sprint
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-amber-400 font-mono">RMB Drag</span> Camera
          <span className="text-slate-600">•</span>
          <span className="font-semibold text-amber-400 font-mono">E</span> Interact
        </div>

        {/* Right: Set Sail & Quick Services Action Buttons */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            id="btn-port-quick-services"
            type="button"
            onClick={() => onOpenStationModal('shipyard')}
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer active:scale-95"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Port Services</span>
          </button>

          <button
            id="btn-port-set-sail"
            type="button"
            onClick={() => {
              soundEngine.playShipBell();
              onSetSail();
            }}
            className="bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xl border border-sky-300 cursor-pointer transition transform active:scale-95 animate-pulse"
          >
            <Anchor className="w-4 h-4 stroke-[2.5]" />
            <span>Set Sail to Open Sea</span>
          </button>
        </div>
      </div>

      {/* --- IN-WORLD CONTEXTUAL ACTION PROMPT (Proximity to Station or Guard) --- */}
      {activeStation && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl px-6 py-3 shadow-2xl z-30 flex items-center gap-4 animate-bounce">
          <div className="text-2xl">{activeStation.icon}</div>
          <div>
            <div className="font-black text-sm text-amber-300 uppercase tracking-wide">
              {activeStation.name}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">{activeStation.actionPrompt}</div>
          </div>
          <button
            id="btn-station-interact-prompt"
            type="button"
            onClick={() => activeStation.handler()}
            className="ml-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-amber-300 cursor-pointer transition active:scale-95"
          >
            <span className="font-mono bg-slate-950/40 text-slate-950 px-1.5 py-0.5 rounded text-[11px]">E</span>
            <span>Interact</span>
          </button>
        </div>
      )}

      {/* --- NPC GUARD & VILLAGE ANIMAL INTERACTIVE DIALOGUE CARD --- */}
      {activeNpcDialogue && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-xl border-2 border-sky-400/80 rounded-2xl p-4 shadow-2xl z-40 max-w-md w-full flex items-start gap-3.5 animate-fadeIn">
          <div className="text-3xl p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 shadow-inner">
            {activeNpcDialogue.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-300">{activeNpcDialogue.speaker}</span>
                <span className="text-[10px] bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-700/60 font-bold">
                  {activeNpcDialogue.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNpcDialogue(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-200 mt-2 leading-relaxed italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              {activeNpcDialogue.text}
            </p>
          </div>
        </div>
      )}

      {/* --- BOTTOM QUICK STATIONS BAR (Direct access or guidance) --- */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2 z-20">
        <button
          type="button"
          onClick={() => onOpenStationModal('market')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
        >
          <Store className="w-3.5 h-3.5 text-amber-400" />
          <span>Market</span>
        </button>

        <span className="text-slate-700">•</span>

        <button
          type="button"
          onClick={() => onOpenStationModal('shipyard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
        >
          <Hammer className="w-3.5 h-3.5 text-red-400" />
          <span>Shipyard</span>
        </button>

        <span className="text-slate-700">•</span>

        <button
          type="button"
          onClick={() => onOpenStationModal('tavern')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tavern</span>
        </button>

        <span className="text-slate-700">•</span>

        <button
          type="button"
          onClick={() => onOpenStationModal('bounty')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span>{isCave ? 'Truce Shrine' : 'Bounties'}</span>
        </button>

        <span className="text-slate-700">•</span>

        <button
          type="button"
          onClick={() => {
            soundEngine.playShipBell();
            onSetSail();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 transition cursor-pointer"
        >
          <Anchor className="w-3.5 h-3.5" />
          <span>Set Sail</span>
        </button>
      </div>

      {/* --- MOBILE TOUCH VIRTUAL JOYSTICK & ACTION BUTTON --- */}
      <div className="sm:hidden absolute bottom-20 left-4 z-20">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-24 h-24 rounded-full bg-slate-900/70 border-2 border-slate-700 flex items-center justify-center relative touch-none shadow-2xl"
        >
          <div
            className="w-10 h-10 rounded-full bg-amber-500/80 border border-amber-300 absolute transition-transform"
            style={{
              transform: `translate(${touchDir.current.x * 24}px, ${touchDir.current.y * 24}px)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
