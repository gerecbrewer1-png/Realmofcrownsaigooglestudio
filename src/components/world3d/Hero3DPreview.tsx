/**
 * Realm of Crowns - 3D Hero / Commander Preview Canvas
 * Renders an interactive 3D model of the selected commander with:
 * - 360 degree drag-to-spin rotation
 * - Class-specific animated weapon and mantle
 * - Dynamic lighting and pedestal
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HeroClass, Commander } from '../../types';
import { createHeroMesh } from './heroModels';
import { medievalModelService } from './medievalModelService';
import { Sparkles, RotateCw, Flame } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  createHeroAura,
  getHeroPowerTier,
  getHeroTierName,
  CLASS_AURA_PALETTES,
  HeroAuraController,
} from './heroAuraSystem';

interface Hero3DPreviewProps {
  heroClass: HeroClass;
  rarity?: string;
  level?: number;
  commander?: Commander;
  onTriggerAbility?: () => void;
}

export const Hero3DPreview: React.FC<Hero3DPreviewProps> = ({
  heroClass,
  level = 1,
  commander,
  onTriggerAbility,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number>(0);
  const heroGroupRef = useRef<THREE.Group | null>(null);
  const heroActionTriggerRef = useRef<((name: string) => void) | null>(null);
  const auraControllerRef = useRef<HeroAuraController | null>(null);
  const prevLevelRef = useRef<number>(level);

  const isDragging = useRef(false);
  const prevMouseX = useRef(0);
  const autoRotateSpeed = useRef(0.008);

  const heroLevel = commander?.level || level || 1;
  const powerTier = getHeroPowerTier(heroLevel);
  const tierName = getHeroTierName(powerTier);
  const palette = CLASS_AURA_PALETTES[heroClass] || CLASS_AURA_PALETTES.warlord;

  // React to external level change (e.g. user clicked Level Up)
  useEffect(() => {
    if (auraControllerRef.current) {
      auraControllerRef.current.updateLevel(heroLevel);
      if (heroLevel > prevLevelRef.current) {
        // Celebratory level-up burst
        auraControllerRef.current.triggerLevelUpBurst();
        soundEngine.playFanfare();
      }
    }
    prevLevelRef.current = heroLevel;
  }, [heroLevel]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.6, 5.5);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // 5. Hero Container
    const rootHeroGroup = new THREE.Group();
    heroGroupRef.current = rootHeroGroup;
    scene.add(rootHeroGroup);

    // Initial procedural mesh as immediate display
    const heroBundle = createHeroMesh(heroClass, 1.0);
    rootHeroGroup.add(heroBundle.group);

    // 6. Attach Hero Power Aura Controller
    const aura = createHeroAura(heroClass, heroLevel, { scale: 1.15 });
    rootHeroGroup.add(aura.group);
    auraControllerRef.current = aura;

    // Asynchronously load real rigged animated 3D hero model
    let mixerUpdate: ((delta: number) => void) | null = null;
    medievalModelService.loadHeroCharacter(heroClass, 1.25)
      .then((realHero) => {
        rootHeroGroup.remove(heroBundle.group);
        rootHeroGroup.add(realHero.group);
        mixerUpdate = realHero.update;
        heroActionTriggerRef.current = realHero.playAction;
      })
      .catch((err) => {
        console.warn('[Hero3DPreview] Fallback to procedural mesh:', err);
      });

    // 7. Animation Loop
    let animTime = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      animTime += 0.025;

      if (!isDragging.current && heroGroupRef.current) {
        heroGroupRef.current.rotation.y += autoRotateSpeed.current;
      }

      if (mixerUpdate) {
        mixerUpdate(delta);
      } else {
        heroBundle.updateAnimation(animTime);
      }

      // Update Power Aura System
      if (auraControllerRef.current) {
        auraControllerRef.current.update(delta, time / 1000);
      }

      renderer.render(scene, camera);
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    // Resize Observer
    const ro = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animFrameId.current);
      if (auraControllerRef.current) {
        auraControllerRef.current.dispose();
      }
      renderer.dispose();
    };
  }, [heroClass]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    prevMouseX.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !heroGroupRef.current) return;
    const delta = e.clientX - prevMouseX.current;
    heroGroupRef.current.rotation.y += delta * 0.015;
    prevMouseX.current = e.clientX;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const spinHero = () => {
    soundEngine.playClick();
    if (heroGroupRef.current) {
      heroGroupRef.current.rotation.y += Math.PI / 2;
    }
  };

  const handleRally = () => {
    soundEngine.playFanfare();
    if (heroActionTriggerRef.current) {
      heroActionTriggerRef.current('Cheer');
      setTimeout(() => {
        if (heroActionTriggerRef.current) {
          heroActionTriggerRef.current('Idle');
        }
      }, 2400);
    }
    // Surge hero power aura!
    if (auraControllerRef.current) {
      auraControllerRef.current.triggerAbilitySurge(2.8);
    }
    if (onTriggerAbility) {
      onTriggerAbility();
    }
  };

  return (
    <div className="relative w-36 h-40 sm:w-48 sm:h-52 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 shadow-inner group">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Visual Power Tier Badge */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-slate-950/85 backdrop-blur-sm border border-amber-500/40 text-[9px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
        <Flame className="w-2.5 h-2.5 text-amber-400" />
        <span className="text-amber-300">T{powerTier}</span>
        <span className="text-slate-400 font-mono">• {tierName}</span>
      </div>

      {/* Manual Spin Button */}
      <button
        type="button"
        onClick={spinHero}
        title="Spin 3D Model"
        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition cursor-pointer shadow opacity-80 group-hover:opacity-100"
      >
        <RotateCw className="w-3 h-3" />
      </button>

      {/* Ability Rally Surge Button */}
      <button
        type="button"
        onClick={handleRally}
        title="Activate Heroic Rally (Surges Power Aura)"
        className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg font-bold flex items-center gap-1 text-[10px] active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
        <span>Rally</span>
      </button>

      {/* Power Aura Flavor Tag */}
      <div className="absolute bottom-1 left-2 text-[8px] text-slate-400 pointer-events-none flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `#${palette.primary.toString(16)}` }} />
        <span>{palette.name}</span>
      </div>
    </div>
  );
};
