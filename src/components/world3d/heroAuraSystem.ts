/**
 * Realm of Crowns - Hero Visual Progression & Original Power Aura System
 *
 * Implements a refined, layered medieval fantasy energy system:
 * - 5 Visual Power Tiers based on real hero level (Novice, Veteran, Elite, Champion, Legendary)
 * - 5 Distinct Class Auras (Warlord, Guardian, Ranger, Steward, Strategist)
 * - Layered effects: ground rune ring, additive energy sheath, rising particles/wisps,
 *   weapon glow node, orbiting tactical sigils, ability surge, and level-up bursts.
 * - Tasteful, original fantasy aesthetic (not Dragon Ball Z, no blocky particles, no opaque spheres).
 */

import * as THREE from 'three';
import { HeroClass } from '../../types';

export type HeroPowerTier = 1 | 2 | 3 | 4 | 5;

export interface HeroTierConfig {
  tier: HeroPowerTier;
  name: 'Novice' | 'Veteran' | 'Elite' | 'Champion' | 'Legendary';
  minLevel: number;
  maxLevel: number;
  particleCount: number;
  auraIntensity: number;
  sheathScale: number;
  ringRadius: number;
  hasWeaponGlow: boolean;
  hasOrbitingSigils: boolean;
  hasGroundRune: boolean;
}

export function getHeroPowerTier(level: number): HeroPowerTier {
  if (level <= 5) return 1;
  if (level <= 15) return 2;
  if (level <= 25) return 3;
  if (level <= 35) return 4;
  return 5;
}

export function getHeroTierConfig(level: number): HeroTierConfig {
  const tier = getHeroPowerTier(level);
  switch (tier) {
    case 1:
      return {
        tier: 1,
        name: 'Novice',
        minLevel: 1,
        maxLevel: 5,
        particleCount: 0,
        auraIntensity: 0.12,
        sheathScale: 0.85,
        ringRadius: 0.55,
        hasWeaponGlow: false,
        hasOrbitingSigils: false,
        hasGroundRune: false,
      };
    case 2:
      return {
        tier: 2,
        name: 'Veteran',
        minLevel: 6,
        maxLevel: 15,
        particleCount: 16,
        auraIntensity: 0.28,
        sheathScale: 1.0,
        ringRadius: 0.7,
        hasWeaponGlow: true,
        hasOrbitingSigils: false,
        hasGroundRune: true,
      };
    case 3:
      return {
        tier: 3,
        name: 'Elite',
        minLevel: 16,
        maxLevel: 25,
        particleCount: 28,
        auraIntensity: 0.45,
        sheathScale: 1.15,
        ringRadius: 0.85,
        hasWeaponGlow: true,
        hasOrbitingSigils: true,
        hasGroundRune: true,
      };
    case 4:
      return {
        tier: 4,
        name: 'Champion',
        minLevel: 26,
        maxLevel: 35,
        particleCount: 38,
        auraIntensity: 0.65,
        sheathScale: 1.3,
        ringRadius: 1.0,
        hasWeaponGlow: true,
        hasOrbitingSigils: true,
        hasGroundRune: true,
      };
    case 5:
    default:
      return {
        tier: 5,
        name: 'Legendary',
        minLevel: 36,
        maxLevel: 50,
        particleCount: 50,
        auraIntensity: 0.85,
        sheathScale: 1.45,
        ringRadius: 1.15,
        hasWeaponGlow: true,
        hasOrbitingSigils: true,
        hasGroundRune: true,
      };
  }
}

export function getHeroTierName(tier: HeroPowerTier): string {
  switch (tier) {
    case 1: return 'Novice';
    case 2: return 'Veteran';
    case 3: return 'Elite';
    case 4: return 'Champion';
    case 5: return 'Legendary';
  }
}

export interface ClassAuraPalette {
  primary: number;       // Main aura color
  secondary: number;     // Inner highlight / particle color
  accent: number;        // Ground rune / flash color
  name: string;
}

export const CLASS_AURA_PALETTES: Record<HeroClass, ClassAuraPalette> = {
  warlord: {
    primary: 0xf43f5e,    // Fiery Rose Crimson
    secondary: 0xf97316,  // Flame Amber
    accent: 0xfbbf24,     // Gold Spark
    name: 'Blood & Flame Valor',
  },
  guardian: {
    primary: 0x38bdf8,    // Bastion Sky Azure
    secondary: 0x0284c7,  // Deep Aegis Blue
    accent: 0xe0f2fe,     // Diamond Barrier Glint
    name: 'Aegis Bastion Ward',
  },
  ranger: {
    primary: 0x10b981,    // Emerald Gale
    secondary: 0x34d399,  // Jade Wind
    accent: 0xa7f3d0,     // Swift Zephyr Leaf
    name: 'Sylvan Gale Wind',
  },
  steward: {
    primary: 0xf59e0b,    // Treasury Amber Gold
    secondary: 0xeab308,  // Radiant Sol Gold
    accent: 0x10b981,     // Jade Harvest Mote
    name: 'Sovereign Prosperity',
  },
  strategist: {
    primary: 0xc084fc,    // Mystic Amethyst
    secondary: 0x818cf8,  // Celestial Indigo
    accent: 0xfae8ff,     // Runic Arcane Glyph
    name: 'Grand Arcane Tactics',
  },
};

export interface HeroAuraController {
  group: THREE.Group;
  update: (delta: number, time: number) => void;
  triggerAbilitySurge: (durationSeconds?: number) => void;
  triggerLevelUpBurst: () => void;
  updateLevel: (newLevel: number) => void;
  setLOD?: (tier: 'city' | 'region' | 'world') => void;
  dispose: () => void;
}

// Reusable soft circular particle texture
let cachedParticleTexture: THREE.CanvasTexture | null = null;
function getParticleTexture(): THREE.CanvasTexture {
  if (cachedParticleTexture) return cachedParticleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  cachedParticleTexture = new THREE.CanvasTexture(canvas);
  return cachedParticleTexture;
}

/**
 * Creates an authoritative 3D Hero Power Aura instance
 */
export function createHeroAura(
  heroClass: HeroClass,
  initialLevel: number = 1,
  options?: { scale?: number; isCompact?: boolean }
): HeroAuraController {
  const group = new THREE.Group();
  group.name = `hero-aura-${heroClass}`;

  const scale = options?.scale || 1.0;
  const isCompact = options?.isCompact || false;
  let currentLevel = initialLevel;
  let tierConfig = getHeroTierConfig(currentLevel);
  const palette = CLASS_AURA_PALETTES[heroClass] || CLASS_AURA_PALETTES.warlord;

  // Surge state (activated by abilities or level-up)
  let surgeFactor = 0; // 0 (normal) to 1 (peak surge)
  let surgeDecayRate = 0.5;

  // 1. Ground Runic Ward / Pulse Circle
  const ringGeo = new THREE.RingGeometry(
    tierConfig.ringRadius * 0.78 * scale,
    tierConfig.ringRadius * scale,
    32
  );
  ringGeo.rotateX(-Math.PI / 2);

  const ringMat = new THREE.MeshBasicMaterial({
    color: palette.primary,
    transparent: true,
    opacity: tierConfig.hasGroundRune ? 0.45 : 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const groundRing = new THREE.Mesh(ringGeo, ringMat);
  groundRing.position.y = 0.02;
  group.add(groundRing);

  // Concentric decorative inner circle
  const innerRingGeo = new THREE.RingGeometry(
    tierConfig.ringRadius * 0.45 * scale,
    tierConfig.ringRadius * 0.52 * scale,
    24
  );
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: tierConfig.hasGroundRune ? 0.35 : 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.position.y = 0.025;
  group.add(innerRing);

  // 2. Soft Additive Energy Sheath (Tapered cylinder around hero body)
  const sheathGeo = new THREE.CylinderGeometry(
    0.35 * scale * tierConfig.sheathScale,
    0.58 * scale * tierConfig.sheathScale,
    1.75 * scale * tierConfig.sheathScale,
    16,
    1,
    true
  );
  const sheathMat = new THREE.MeshBasicMaterial({
    color: palette.primary,
    transparent: true,
    opacity: tierConfig.auraIntensity * 0.35,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sheathMesh = new THREE.Mesh(sheathGeo, sheathMat);
  sheathMesh.position.y = 0.9 * scale;
  group.add(sheathMesh);

  // 3. Upward Moving Wisps & Floating Particles
  const maxParticles = 60;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  const velocities: { x: number; y: number; z: number; phase: number; speed: number }[] = [];

  for (let i = 0; i < maxParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = (0.2 + Math.random() * 0.5) * scale;
    positions[i * 3] = Math.cos(angle) * rad;
    positions[i * 3 + 1] = Math.random() * 2.0 * scale;
    positions[i * 3 + 2] = Math.sin(angle) * rad;

    velocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y: 0.45 + Math.random() * 0.65,
      z: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: 1.0 + Math.random() * 0.8,
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: palette.secondary,
    size: (isCompact ? 0.12 : 0.18) * scale,
    map: getParticleTexture(),
    transparent: true,
    opacity: tierConfig.tier > 1 ? 0.75 : 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  group.add(particleSystem);

  // 4. Orbiting Tactical / Guardian Sigils (Tiers 3+)
  const sigilGroup = new THREE.Group();
  sigilGroup.name = 'orbiting-sigils';
  const sigilCount = tierConfig.tier >= 4 ? 3 : (tierConfig.tier === 3 ? 2 : 0);
  const sigilMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < sigilCount; i++) {
    // Elegant diamond / lozenge runic markers
    const sGeo = new THREE.OctahedronGeometry(0.09 * scale, 0);
    const sMat = new THREE.MeshBasicMaterial({
      color: palette.accent,
      wireframe: heroClass === 'guardian',
      blending: THREE.AdditiveBlending,
    });
    const sMesh = new THREE.Mesh(sGeo, sMat);
    sigilGroup.add(sMesh);
    sigilMeshes.push(sMesh);
  }
  sigilGroup.position.y = 1.1 * scale;
  group.add(sigilGroup);

  // 5. Weapon Sheen Node
  const weaponGlowGeo = new THREE.SphereGeometry(0.14 * scale, 8, 8);
  const weaponGlowMat = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: tierConfig.hasWeaponGlow ? 0.6 : 0,
    blending: THREE.AdditiveBlending,
  });
  const weaponGlow = new THREE.Mesh(weaponGlowGeo, weaponGlowMat);
  // Default position aligned with right-hand weapon in hero models
  weaponGlow.position.set(0.48 * scale, 1.05 * scale, 0.22 * scale);
  group.add(weaponGlow);

  // 6. Expanding Shockwave Ring (Used during Rally / Level Up)
  const shockGeo = new THREE.RingGeometry(0.2 * scale, 0.35 * scale, 32);
  shockGeo.rotateX(-Math.PI / 2);
  const shockMat = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shockRing = new THREE.Mesh(shockGeo, shockMat);
  shockRing.position.y = 0.04;
  group.add(shockRing);
  let shockScale = 1;
  let shockActive = false;

  // Level Update Handler
  const updateLevel = (newLevel: number) => {
    currentLevel = newLevel;
    tierConfig = getHeroTierConfig(newLevel);

    // Update Sheath
    sheathMat.opacity = Math.min(0.8, tierConfig.auraIntensity * 0.45);
    const sScale = tierConfig.sheathScale;
    sheathMesh.scale.set(sScale, sScale, sScale);

    // Update Ground Ring
    ringMat.opacity = tierConfig.hasGroundRune ? 0.45 : 0;
    innerRingMat.opacity = tierConfig.hasGroundRune ? 0.35 : 0;

    // Update Particles
    particleMat.opacity = tierConfig.particleCount > 0 ? 0.8 : 0;

    // Update Weapon Glow
    weaponGlowMat.opacity = tierConfig.hasWeaponGlow ? 0.65 : 0;

    // Rebuild sigils if needed
    while (sigilGroup.children.length > 0) {
      sigilGroup.remove(sigilGroup.children[0]);
    }
    sigilMeshes.length = 0;
    const targetSigils = tierConfig.tier >= 4 ? 3 : (tierConfig.tier === 3 ? 2 : 0);
    for (let i = 0; i < targetSigils; i++) {
      const sGeo = new THREE.OctahedronGeometry(0.09 * scale, 0);
      const sMat = new THREE.MeshBasicMaterial({
        color: palette.accent,
        wireframe: heroClass === 'guardian',
        blending: THREE.AdditiveBlending,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sigilGroup.add(sMesh);
      sigilMeshes.push(sMesh);
    }
  };

  // Ability Surge Trigger
  const triggerAbilitySurge = (durationSeconds: number = 2.4) => {
    surgeFactor = 1.0;
    surgeDecayRate = 1.0 / Math.max(0.5, durationSeconds);
    shockActive = true;
    shockScale = 0.5;
    shockMat.opacity = 0.9;
  };

  // Level Up Celebratory Burst
  const triggerLevelUpBurst = () => {
    surgeFactor = 1.5;
    surgeDecayRate = 0.35;
    shockActive = true;
    shockScale = 0.2;
    shockMat.opacity = 1.0;
    // Burst particles instantly to top
    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < maxParticles; i++) {
      arr[i * 3 + 1] = Math.random() * 2.5 * scale;
    }
    posAttr.needsUpdate = true;
  };

  // LOD tier tracking
  let currentLODTier: 'city' | 'region' | 'world' = 'city';

  const setLOD = (tier: 'city' | 'region' | 'world') => {
    currentLODTier = tier;
    if (tier === 'world') {
      particleSystem.visible = false;
      sigilGroup.visible = false;
      sheathMesh.visible = false;
      weaponGlow.visible = false;
      groundRing.visible = true;
      innerRing.visible = true;
    } else if (tier === 'region') {
      particleSystem.visible = tierConfig.particleCount > 0;
      sigilGroup.visible = false;
      sheathMesh.visible = tierConfig.tier >= 2;
      weaponGlow.visible = tierConfig.hasWeaponGlow;
      groundRing.visible = true;
      innerRing.visible = true;
    } else {
      particleSystem.visible = tierConfig.particleCount > 0;
      sigilGroup.visible = sigilMeshes.length > 0;
      sheathMesh.visible = tierConfig.tier >= 2;
      weaponGlow.visible = tierConfig.hasWeaponGlow;
      groundRing.visible = true;
      innerRing.visible = true;
    }
  };

  // Frame Render Loop Update
  const update = (delta: number, time: number) => {
    if (!group.visible) return;

    if (currentLODTier === 'world') {
      // High altitude orbit: minimal ground rune rotation, zero particle updates
      groundRing.rotation.y += delta * 0.4;
      innerRing.rotation.y -= delta * 0.5;
      return;
    }

    // 1. Surge Decay
    if (surgeFactor > 0) {
      surgeFactor = Math.max(0, surgeFactor - delta * surgeDecayRate);
    }

    const currentSurge = surgeFactor;
    const effectiveAura = tierConfig.auraIntensity + currentSurge * 0.4;

    // 2. Animate Ground Rings
    if (tierConfig.hasGroundRune || currentSurge > 0) {
      groundRing.rotation.y += delta * 0.6;
      innerRing.rotation.y -= delta * 0.9;

      ringMat.opacity = (tierConfig.hasGroundRune ? 0.35 : 0) + currentSurge * 0.45 + Math.sin(time * 3) * 0.08;
      innerRingMat.opacity = (tierConfig.hasGroundRune ? 0.28 : 0) + currentSurge * 0.4 + Math.cos(time * 4) * 0.07;
    }

    // 3. Animate Energy Sheath (Breathing pulse + class movement)
    if (tierConfig.tier >= 2 || currentSurge > 0) {
      let breatheFreq = 3.5;
      let wobble = 0.06;

      if (heroClass === 'warlord') {
        breatheFreq = 7.0; // Aggressive flame flicker
        wobble = 0.1;
      } else if (heroClass === 'guardian') {
        breatheFreq = 2.2; // Slow stalwart barrier pulse
        wobble = 0.04;
      } else if (heroClass === 'ranger') {
        breatheFreq = 5.0; // Wind stream flutter
        sheathMesh.rotation.y += delta * 2.0;
      }

      const pulse = 1.0 + Math.sin(time * breatheFreq) * wobble + currentSurge * 0.35;
      const baseSheath = tierConfig.sheathScale;
      sheathMesh.scale.set(baseSheath * pulse, baseSheath * (1.0 + currentSurge * 0.2), baseSheath * pulse);
      sheathMat.opacity = effectiveAura * (0.32 + Math.sin(time * breatheFreq) * 0.08);
      sheathMesh.visible = true;
    } else {
      sheathMesh.visible = false;
    }

    // 4. Animate Rising Particles
    const activeCount = Math.min(maxParticles, tierConfig.particleCount + Math.floor(currentSurge * 20));
    if (activeCount > 0) {
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      const speedMultiplier = 1.0 + currentSurge * 2.2;

      for (let i = 0; i < maxParticles; i++) {
        if (i >= activeCount) {
          // Hide inactive particles by moving below ground
          arr[i * 3 + 1] = -100;
          continue;
        }

        const v = velocities[i];
        arr[i * 3 + 1] += v.y * v.speed * speedMultiplier * delta;

        // Class-specific trajectory
        if (heroClass === 'ranger') {
          // Spiraling wind vortex
          const rad = Math.sqrt(arr[i * 3] * arr[i * 3] + arr[i * 3 + 2] * arr[i * 3 + 2]);
          const currentAngle = Math.atan2(arr[i * 3 + 2], arr[i * 3]) + delta * 2.5;
          arr[i * 3] = Math.cos(currentAngle) * rad;
          arr[i * 3 + 2] = Math.sin(currentAngle) * rad;
        } else if (heroClass === 'warlord') {
          // Fiery embers flutter outward
          arr[i * 3] += Math.sin(time * 8 + v.phase) * delta * 0.3;
          arr[i * 3 + 2] += Math.cos(time * 8 + v.phase) * delta * 0.3;
        } else if (heroClass === 'strategist') {
          // Orbital planar motion
          const currentAngle = Math.atan2(arr[i * 3 + 2], arr[i * 3]) + delta * 1.5;
          const rad = 0.45 * scale;
          arr[i * 3] = Math.cos(currentAngle) * rad;
          arr[i * 3 + 2] = Math.sin(currentAngle) * rad;
        }

        // Reset when reaching top
        const maxHeight = (1.9 + currentSurge * 0.6) * scale;
        if (arr[i * 3 + 1] > maxHeight) {
          const angle = Math.random() * Math.PI * 2;
          const rad = (0.15 + Math.random() * 0.45) * scale;
          arr[i * 3] = Math.cos(angle) * rad;
          arr[i * 3 + 1] = 0.05 * scale;
          arr[i * 3 + 2] = Math.sin(angle) * rad;
        }
      }

      posAttr.needsUpdate = true;
      particleMat.opacity = Math.min(1.0, (tierConfig.tier > 1 ? 0.75 : 0) + currentSurge * 0.5);
      particleSystem.visible = true;
    } else {
      particleSystem.visible = false;
    }

    // 5. Animate Orbiting Sigils (Tier 3+)
    if (sigilMeshes.length > 0) {
      const sigilRadius = (0.65 + currentSurge * 0.25) * scale;
      const orbitSpeed = (heroClass === 'strategist' ? 1.8 : 1.2) * (1.0 + currentSurge);

      sigilMeshes.forEach((mesh, index) => {
        const offsetAngle = (index / sigilMeshes.length) * Math.PI * 2;
        const currentAngle = time * orbitSpeed + offsetAngle;
        mesh.position.x = Math.cos(currentAngle) * sigilRadius;
        mesh.position.z = Math.sin(currentAngle) * sigilRadius;
        mesh.position.y = Math.sin(time * 3 + index) * 0.15 * scale;
        mesh.rotation.y += delta * 3;
        mesh.rotation.x += delta * 2;
      });
      sigilGroup.visible = true;
    } else {
      sigilGroup.visible = false;
    }

    // 6. Animate Weapon Glow
    if (tierConfig.hasWeaponGlow || currentSurge > 0) {
      weaponGlowMat.opacity = (tierConfig.hasWeaponGlow ? 0.5 : 0) + currentSurge * 0.5 + Math.sin(time * 6) * 0.15;
      const wScale = 1.0 + currentSurge * 0.5 + Math.sin(time * 6) * 0.1;
      weaponGlow.scale.set(wScale, wScale, wScale);
      weaponGlow.visible = true;
    } else {
      weaponGlow.visible = false;
    }

    // 7. Animate Shockwave
    if (shockActive) {
      shockScale += delta * 3.5;
      shockRing.scale.set(shockScale, shockScale, shockScale);
      shockMat.opacity = Math.max(0, shockMat.opacity - delta * 1.8);
      if (shockMat.opacity <= 0) {
        shockActive = false;
      }
    }
  };

  // Clean disposal
  const dispose = () => {
    ringGeo.dispose();
    ringMat.dispose();
    innerRingGeo.dispose();
    innerRingMat.dispose();
    sheathGeo.dispose();
    sheathMat.dispose();
    particleGeo.dispose();
    particleMat.dispose();
    sigilMeshes.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    weaponGlowGeo.dispose();
    weaponGlowMat.dispose();
    shockGeo.dispose();
    shockMat.dispose();
  };

  return {
    group,
    update,
    triggerAbilitySurge,
    triggerLevelUpBurst,
    updateLevel,
    setLOD,
    dispose,
  };
}
