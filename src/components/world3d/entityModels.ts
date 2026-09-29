/**
 * 3D Entity Models (Barbarian Camps, Ancient Shrines, and Animated Army Marches)
 * Optimized with distance LOD tiers to prevent rendering small soldiers and fences when zoomed out.
 */

import * as THREE from 'three';
import { BarbarianCamp, AncientShrine, ArmyMarch, HeroClass } from '../../types';
import { medievalModelService } from './medievalModelService';

export function createBarbarianCampMesh(camp: BarbarianCamp): THREE.Group {
  const group = new THREE.Group();
  group.name = `barbarian-camp-${camp.id}`;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9, flatShading: true });
  const tentMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.8, flatShading: true });
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  // 1. Spiked Palisade Wooden Stockade Fence (LOD-gated)
  const palisadeGroup = new THREE.Group();
  palisadeGroup.name = 'palisade-stockade';
  const numLogs = 10;
  const radius = 5.0;
  const logGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.6, 5);
  const spikeGeo = new THREE.ConeGeometry(0.35, 0.8, 5);

  for (let i = 0; i < numLogs; i++) {
    if (i === 0) continue; // Entrance gap
    const angle = (i * Math.PI * 2) / numLogs;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    const log = new THREE.Mesh(logGeo, woodMat);
    log.position.set(x, 1.3, z);
    palisadeGroup.add(log);

    const spike = new THREE.Mesh(spikeGeo, woodMat);
    spike.position.set(x, 2.6 + 0.4, z);
    palisadeGroup.add(spike);
  }
  group.add(palisadeGroup);

  // 2. Procedural Fallback Tents (Instant visual feedback)
  const placeholderTents = new THREE.Group();
  const tentGeo = new THREE.ConeGeometry(3.2, 4.2, 7);
  const tent = new THREE.Mesh(tentGeo, tentMat);
  tent.position.set(-1.2, 2.1, -1);
  tent.castShadow = true;
  placeholderTents.add(tent);
  group.add(placeholderTents);

  // 3. Real GLB Tents & Camp Equipment (Grouped for LOD culling)
  const propsGroup = new THREE.Group();
  propsGroup.name = 'camp-glb-props';
  group.add(propsGroup);

  medievalModelService
    .loadWorldAsset('tent', 3.4)
    .then((chieftainTent) => {
      chieftainTent.position.set(-1.2, 0, -1.0);
      placeholderTents.visible = false;
      propsGroup.add(chieftainTent);

      // Secondary Warrior Tent
      medievalModelService.loadWorldAsset('tent', 2.4).then((subTent) => {
        subTent.position.set(2.4, 0, -1.6);
        propsGroup.add(subTent);
      }).catch(() => {});

      // Real Weapon Rack
      medievalModelService.loadWorldAsset('weaponrack', 3.0).then((rack) => {
        rack.position.set(2.2, 0, 1.4);
        propsGroup.add(rack);
      }).catch(() => {});

      // Real Archery Target
      medievalModelService.loadWorldAsset('target', 3.0).then((targetModel) => {
        targetModel.position.set(-2.8, 0, 1.8);
        targetModel.rotation.y = 0.6;
        propsGroup.add(targetModel);
      }).catch(() => {});

      // Loot Supply Crates
      medievalModelService.loadWorldAsset('crate', 2.2).then((crate) => {
        crate.position.set(-0.2, 0, 2.6);
        propsGroup.add(crate);
      }).catch(() => {});
    })
    .catch(() => {});

  // 4. Central Roaring Bonfire with Embers & High-Efficiency Emissive Firelight (No PointLight!)
  const pitGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.35, 8);
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
  const pit = new THREE.Mesh(pitGeo, pitMat);
  pit.position.set(0.4, 0.18, 0.2);
  group.add(pit);

  // Glowing Coal Bed (High emissive, zero GPU light cost)
  const coalGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.15, 8);
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0xf97316,
    emissiveIntensity: 2.0,
    roughness: 0.8,
  });
  const coal = new THREE.Mesh(coalGeo, coalMat);
  coal.position.set(0.4, 0.26, 0.2);
  group.add(coal);

  // Soft Ambient Ground Glow Disc (Emulates area firelight with zero overhead)
  const groundGlowGeo = new THREE.CircleGeometry(3.6, 12);
  groundGlowGeo.rotateX(-Math.PI / 2);
  const groundGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const groundGlow = new THREE.Mesh(groundGlowGeo, groundGlowMat);
  groundGlow.position.set(0.4, 0.05, 0.2);
  group.add(groundGlow);

  // Dynamic Organic Multi-Tongue Flames
  const fireGroup = new THREE.Group();
  fireGroup.position.set(0.4, 0.35, 0.2);
  fireGroup.name = 'bonfire-flames';

  const flameMatOuter = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xf97316,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const flameMatInner = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.95,
  });

  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.9, 5), flameMatOuter);
  flame1.position.y = 0.95;
  fireGroup.add(flame1);

  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.7, 5), flameMatOuter);
  flame2.position.set(0.15, 0.85, -0.1);
  flame2.rotation.y = 1.2;
  fireGroup.add(flame2);

  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 5), flameMatInner);
  flameCore.position.y = 0.6;
  fireGroup.add(flameCore);

  group.add(fireGroup);

  // Bonfire flicker animation hook (zero point lights, smooth & fast)
  group.userData.updateAnimation = (time: number) => {
    const flicker = Math.sin(time * 12) * 0.15 + Math.cos(time * 20) * 0.1;
    groundGlowMat.opacity = Math.max(0.15, 0.28 + flicker * 0.1);
    flame1.scale.set(1 + flicker * 0.3, 1 + flicker * 0.4, 1 + flicker * 0.3);
    flame2.scale.set(1 - flicker * 0.2, 1 - flicker * 0.3, 1 - flicker * 0.2);
    flame1.rotation.y = time * 1.6;
    flame2.rotation.y = -time * 1.9;
  };

  // LOD hook for camp
  group.userData.setLOD = (tier: 'city' | 'region' | 'world') => {
    if (tier === 'world') {
      palisadeGroup.visible = false;
      propsGroup.visible = false;
      placeholderTents.visible = true;
    } else if (tier === 'region') {
      palisadeGroup.visible = true;
      propsGroup.visible = false;
      placeholderTents.visible = true;
    } else {
      palisadeGroup.visible = true;
      propsGroup.visible = true;
      placeholderTents.visible = propsGroup.children.length === 0;
    }
  };

  return group;
}

export function createAncientShrineMesh(shrine: AncientShrine): {
  group: THREE.Group;
  updateAnimation: (time: number) => void;
} {
  const group = new THREE.Group();
  group.name = `ancient-shrine-${shrine.id}`;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, flatShading: true });
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
  });

  // Stepped temple dais
  const baseGeo = new THREE.CylinderGeometry(5.2, 5.8, 0.8, 8);
  const base = new THREE.Mesh(baseGeo, stoneMat);
  base.position.y = 0.4;
  base.receiveShadow = true;
  group.add(base);

  const tier2Geo = new THREE.CylinderGeometry(4.0, 4.4, 0.6, 8);
  const tier2 = new THREE.Mesh(tier2Geo, stoneMat);
  tier2.position.y = 1.1;
  tier2.receiveShadow = true;
  group.add(tier2);

  // 4 Corner Monolith Obelisks
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const x = 3.2 * Math.cos(angle);
    const z = 3.2 * Math.sin(angle);

    const pillarGeo = new THREE.BoxGeometry(0.8, 3.8, 0.8);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.set(x, 3.3, z);
    group.add(pillar);

    // Glowing rune insert
    const runeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.85), runeMat);
    runeMesh.position.set(x, 3.3, z);
    group.add(runeMesh);
  }

  // Mystic Sky Light Column
  const lightColumnGeo = new THREE.CylinderGeometry(0.4, 1.2, 38, 12);
  const lightColumnMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const lightColumn = new THREE.Mesh(lightColumnGeo, lightColumnMat);
  lightColumn.position.set(0, 19, 0);
  group.add(lightColumn);

  // Floating Levitation Crystal
  const crystalGeo = new THREE.OctahedronGeometry(1.5, 0);
  const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
  crystalMesh.position.set(0, 3.8, 0);
  crystalMesh.castShadow = true;
  group.add(crystalMesh);

  // Concentric floating rune ring
  const ringGeo = new THREE.TorusGeometry(2.2, 0.08, 6, 20);
  const ring = new THREE.Mesh(ringGeo, runeMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 3.8, 0);
  group.add(ring);

  const updateAnimation = (time: number) => {
    crystalMesh.rotation.y = time * 0.8;
    crystalMesh.position.y = 3.8 + Math.sin(time * 2) * 0.3;
    ring.rotation.z = time * 0.5;
  };

  return { group, updateAnimation };
}

export interface Army3DBundle {
  group: THREE.Group;
  pathLine: THREE.Line;
  destinationBeacon: THREE.Group;
  soldiersGroup: THREE.Group;
  bannerGroup: THREE.Group;
  updatePosition: (currentTime: number) => void;
  updateMarchState: (updatedMarch: ArmyMarch) => void;
  setLOD: (tier: 'city' | 'region' | 'world') => void;
  dispose: () => void;
}

// Estimates ground elevation at world coords so armies walk proudly on top of hills & valleys
function sampleRouteElevation(x: number, z: number): number {
  const HEX_SIZE = 10;
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / HEX_SIZE;
  const r = ((2 / 3) * z) / HEX_SIZE;
  const rq = Math.round(q);
  const rr = Math.round(r);
  const noise = Math.sin(rq * 0.7 + rr * 0.5) * 0.5 + Math.cos(rq * 0.4 - rr * 0.8) * 0.35;
  // Standard land tile is 1.8 to 2.8, hills 4.8. We provide generous headroom so nothing clips.
  return Math.max(2.4, 2.6 + noise);
}

// Generates a crisp, billboarding tactical crest tag floating above the army
function createMarchTagCanvas(
  commanderName: string,
  marchType: string,
  troopCount: number,
  status: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  // Dark heraldic card backing with gold border
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = status === 'returning' ? '#10b981' : '#f59e0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 72, 10);
  ctx.fill();
  ctx.stroke();

  // Status icon / badge
  const icon = marchType === 'gather' ? '🌾' : marchType === 'attack_barbarian' ? '⚔️' : '👁️';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText(`${icon} ${commanderName || 'Battalion'}`, 14, 32);

  // Subtext: Troops & current state
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = status === 'returning' ? '#6ee7b7' : '#cbd5e1';
  const statusLabel =
    status === 'gathering'
      ? 'Harvesting Resources...'
      : status === 'returning'
      ? 'Returning with Spoils'
      : `${troopCount || 100} Troops En Route`;
  ctx.fillText(statusLabel, 14, 60);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates a high-visibility, terrain-adaptive 3D army march battalion with:
 * - Dynamic terrain height tracking (never buried underground)
 * - Arced 3D trajectory ribbon lifted cleanly into the air
 * - Luminous destination beacon & targeting ring at target coordinates
 * - Detailed vanguard commander & armored legionnaires with marching cadence
 * - Large waving silk war standard
 * - Floating tactical tag showing real-time army status
 */
export function createArmyMarchMesh(
  initialMarch: ArmyMarch,
  originWorld: { x: number; z: number },
  targetWorld: { x: number; z: number }
): Army3DBundle {
  let currentMarch = { ...initialMarch };
  const group = new THREE.Group();
  group.name = `army-march-${currentMarch.marchId}`;
  group.scale.set(2.4, 2.4, 2.4); // Enhanced scale for clear visibility across all zoom tiers

  const soldiersGroup = new THREE.Group();
  soldiersGroup.name = 'soldiers';
  const bannerGroup = new THREE.Group();
  bannerGroup.name = 'banner';

  const isReturning = currentMarch.status === 'returning';
  const marchColor = isReturning ? 0x10b981 : 0xf59e0b;

  // 1. Materials
  const armorMat = new THREE.MeshStandardMaterial({
    color: marchColor,
    roughness: 0.35,
    metalness: 0.65,
    flatShading: true,
  });
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const spearMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
  const goldCommanderMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.8 });
  const bannerMat = new THREE.MeshBasicMaterial({ color: marchColor, side: THREE.DoubleSide });

  // 2. Vanguard Commander (Leading the Formation with real 3D animated hero)
  const commanderGroup = new THREE.Group();
  commanderGroup.name = 'commander';
  commanderGroup.position.set(0, 0, 1.4);

  // Procedural fallback meshes shown while GLB loads
  const fallbackCmdGroup = new THREE.Group();
  const cmdBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 1.5, 6), goldCommanderMat);
  cmdBody.position.y = 0.75;
  const cmdHelm = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), goldCommanderMat);
  cmdHelm.position.y = 1.65;
  const cmdPlume = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.5), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
  cmdPlume.position.set(0, 2.0, -0.05);
  const cmdSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.18), spearMat);
  cmdSword.position.set(0.55, 1.0, 0.3);
  cmdSword.rotation.x = 0.3;
  fallbackCmdGroup.add(cmdBody, cmdHelm, cmdPlume, cmdSword);
  commanderGroup.add(fallbackCmdGroup);
  soldiersGroup.add(commanderGroup);

  // Resolve hero class from commander attributes
  let heroClass: HeroClass = 'warlord';
  const nameLower = (currentMarch.commanderName || '').toLowerCase();
  if (nameLower.includes('paladin') || nameLower.includes('alden') || nameLower.includes('guardian') || nameLower.includes('light')) {
    heroClass = 'guardian';
  } else if (nameLower.includes('ranger') || nameLower.includes('lyra') || nameLower.includes('bow')) {
    heroClass = 'ranger';
  } else if (nameLower.includes('mage') || nameLower.includes('zephyr') || nameLower.includes('strategist') || nameLower.includes('arcane')) {
    heroClass = 'strategist';
  } else if (nameLower.includes('steward') || nameLower.includes('shade') || nameLower.includes('shadow')) {
    heroClass = 'steward';
  }

  type LoadedHeroType = Awaited<ReturnType<typeof medievalModelService.loadHeroCharacter>>;
  let realHero: LoadedHeroType | null = null;
  let lastHeroUpdateTime = 0;

  medievalModelService
    .loadHeroCharacter(heroClass, 0.9)
    .then((heroInst) => {
      realHero = heroInst;
      fallbackCmdGroup.visible = false;
      commanderGroup.add(heroInst.group);

      if (currentMarch.status === 'marching' || currentMarch.status === 'returning') {
        heroInst.playAction('Walking_A');
      } else if (currentMarch.status === 'gathering') {
        if (currentMarch.type === 'attack_barbarian') {
          heroInst.playAction('1H_Melee_Attack_Chop');
        } else {
          heroInst.playAction('Cheer');
        }
      }
    })
    .catch((err) => {
      console.warn('[ArmyMarch] Failed to load 3D hero model, keeping fallback:', err);
    });

  // 3. Line Infantry Battalion (6 armored units in 2x3 rank)
  const bodyGeo = new THREE.CylinderGeometry(0.34, 0.38, 1.35, 6);
  const helmetGeo = new THREE.SphereGeometry(0.34, 6, 6);
  const shieldGeo = new THREE.BoxGeometry(0.12, 0.8, 0.55);
  const spearGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5);

  const soldierMeshes: { group: THREE.Group; spear: THREE.Mesh; seed: number }[] = [];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const soldier = new THREE.Group();
      soldier.name = `infantry-${row}-${col}`;

      const body = new THREE.Mesh(bodyGeo, armorMat);
      body.position.y = 0.68;
      soldier.add(body);

      const helmet = new THREE.Mesh(helmetGeo, armorMat);
      helmet.position.y = 1.48;
      soldier.add(helmet);

      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(-0.42, 0.8, 0.15);
      soldier.add(shield);

      const spear = new THREE.Mesh(spearGeo, spearMat);
      spear.position.set(0.42, 1.3, 0.4);
      spear.rotation.x = -0.35; // Spear tipped forward
      soldier.add(spear);

      const posX = (col - 1) * 1.15;
      const posZ = -row * 1.2 - 0.2;
      soldier.position.set(posX, 0, posZ);

      soldiersGroup.add(soldier);
      soldierMeshes.push({ group: soldier, spear, seed: row * 3 + col });
    }
  }

  // 4. Regal Heraldic War Standard
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 6), shieldMat);
  pole.position.set(0, 2.4, 0.5);
  bannerGroup.add(pole);

  // Golden finial spearhead on top of pole
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 5), goldCommanderMat);
  finial.position.set(0, 4.8, 0.5);
  bannerGroup.add(finial);

  // Large silk heraldic flag that waves in the wind
  const flagGeo = new THREE.PlaneGeometry(2.4, 1.4, 6, 2);
  const flag = new THREE.Mesh(flagGeo, bannerMat);
  flag.position.set(1.2, 4.0, 0.5);
  flag.rotation.y = Math.PI / 2;
  bannerGroup.add(flag);

  // 5. Overhead Billboarding Tactical Status Tag
  let tagTexture = createMarchTagCanvas(
    currentMarch.commanderName,
    currentMarch.type,
    currentMarch.totalTroopCount,
    currentMarch.status
  );
  const tagMat = new THREE.SpriteMaterial({
    map: tagTexture,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const tagSprite = new THREE.Sprite(tagMat);
  tagSprite.position.set(0, 6.2, 0.5);
  tagSprite.scale.set(4.2, 1.3, 1);
  bannerGroup.add(tagSprite);

  group.add(soldiersGroup);
  group.add(bannerGroup);

  // 6. Multi-Point Elevated Trajectory Ribbon (Arcs high above terrain & hills)
  const segmentCount = 28;
  const pathPoints: THREE.Vector3[] = [];
  for (let s = 0; s <= segmentCount; s++) {
    const fraction = s / segmentCount;
    const px = originWorld.x + (targetWorld.x - originWorld.x) * fraction;
    const pz = originWorld.z + (targetWorld.z - originWorld.z) * fraction;
    // Base elevation of terrain along line + gentle parabolic arc above hills
    const groundY = sampleRouteElevation(px, pz);
    const arcHeight = Math.sin(fraction * Math.PI) * 2.8;
    pathPoints.push(new THREE.Vector3(px, groundY + 1.2 + arcHeight, pz));
  }

  const lineGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const lineMat = new THREE.LineDashedMaterial({
    color: marchColor,
    dashSize: 2.5,
    gapSize: 1.5,
    linewidth: 3,
  });
  const pathLine = new THREE.Line(lineGeo, lineMat);
  pathLine.computeLineDistances();

  // 7. Luminous Destination Beacon at Target Node
  const destinationBeacon = new THREE.Group();
  destinationBeacon.name = `beacon-${currentMarch.marchId}`;
  const targetElevation = sampleRouteElevation(targetWorld.x, targetWorld.z);
  destinationBeacon.position.set(targetWorld.x, targetElevation + 0.3, targetWorld.z);

  // Outer Pulse Ring
  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: marchColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.9, 24), beaconRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  destinationBeacon.add(outerRing);

  // Inner Rotating Compass Ring
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 6), beaconRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  destinationBeacon.add(innerRing);

  // Vertical Light Pillar Beam
  const beamMat = new THREE.MeshBasicMaterial({
    color: marchColor,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 12, 8, 1, true), beamMat);
  beam.position.y = 6;
  destinationBeacon.add(beam);

  // Floating Target Diamond Icon
  const targetDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({
      color: marchColor,
      emissive: marchColor,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    })
  );
  targetDiamond.position.y = 7.5;
  destinationBeacon.add(targetDiamond);

  // State Tracking & Optimization Caches
  let lastSampledX = -9999;
  let lastSampledZ = -9999;
  let cachedGroundElevation = 2.4;
  let currentLOD: 'city' | 'region' | 'world' = 'region';

  // 8. Dynamic Position & Cadence Animation
  const updatePosition = (currentTime: number) => {
    let t = 0;
    if (currentMarch.status === 'marching') {
      const total = Math.max(1, currentMarch.estimatedArrivalTime - currentMarch.departureTime);
      const elapsed = currentTime - currentMarch.departureTime;
      t = Math.min(1, Math.max(0, elapsed / total));
    } else if (currentMarch.status === 'returning') {
      const returnDep = currentMarch.returnDepartureTime || currentTime;
      const returnArr = currentMarch.returnArrivalTime || currentTime;
      const total = Math.max(1, returnArr - returnDep);
      const elapsed = currentTime - returnDep;
      t = 1 - Math.min(1, Math.max(0, elapsed / total));
    } else if (currentMarch.status === 'gathering') {
      t = 1; // Stay firmly at destination
    } else {
      t = 1;
    }

    const curX = originWorld.x + (targetWorld.x - originWorld.x) * t;
    const curZ = originWorld.z + (targetWorld.z - originWorld.z) * t;

    // Fast cached route elevation sampling
    if (Math.abs(curX - lastSampledX) > 0.5 || Math.abs(curZ - lastSampledZ) > 0.5) {
      cachedGroundElevation = sampleRouteElevation(curX, curZ);
      lastSampledX = curX;
      lastSampledZ = curZ;
    }

    // Stride bobbing cadence
    const isWalking = currentMarch.status === 'marching' || currentMarch.status === 'returning';
    const strideFreq = 0.009;
    const bob = isWalking && currentLOD !== 'world' ? Math.abs(Math.sin(currentTime * strideFreq)) * 0.35 : 0;
    group.position.set(curX, cachedGroundElevation + 0.2 + bob, curZ);

    // Turn battalion to face movement direction
    const dx = targetWorld.x - originWorld.x;
    const dz = targetWorld.z - originWorld.z;
    if (currentMarch.status === 'returning') {
      group.rotation.y = Math.atan2(-dx, -dz);
    } else {
      group.rotation.y = Math.atan2(dx, dz);
    }

    // Individual soldier marching stride & spear bob (only in close/medium tiers)
    if (isWalking && currentLOD !== 'world') {
      soldierMeshes.forEach((s) => {
        if (!s.group.visible) return;
        const step = Math.sin(currentTime * strideFreq * 2 + s.seed);
        s.group.position.y = Math.max(0, step * 0.15);
        s.spear.rotation.x = -0.35 + step * 0.12;
      });
    }

    // Smooth heraldic banner flutter (rotation wave, zero GPU buffer re-uploads)
    flag.rotation.y = Math.PI / 2 + Math.sin(currentTime * 0.006) * 0.14;
    flag.rotation.z = Math.cos(currentTime * 0.005) * 0.08;

    // Beacon Rotation & Pulse
    if (destinationBeacon.visible) {
      outerRing.rotation.z = currentTime * 0.001;
      innerRing.rotation.z = -currentTime * 0.002;
      targetDiamond.rotation.y = currentTime * 0.002;
      targetDiamond.position.y = 7.5 + Math.sin(currentTime * 0.003) * 0.5;
      const pulse = 1 + Math.sin(currentTime * 0.004) * 0.08;
      outerRing.scale.set(pulse, pulse, 1);
    }

    // Dashed line scroll animation
    lineMat.dashSize = 2.5 + Math.sin(currentTime * 0.003) * 0.4;

    // Real 3D hero skeletal animation update
    if (realHero) {
      const dt = lastHeroUpdateTime > 0 ? Math.min(0.1, (currentTime - lastHeroUpdateTime) / 1000) : 0.016;
      lastHeroUpdateTime = currentTime;
      realHero.update(dt);

      const isWalkingNow = currentMarch.status === 'marching' || currentMarch.status === 'returning';
      const curAction = realHero.getCurrentActionName();

      if (isWalkingNow) {
        if (curAction !== 'Walking_A') {
          realHero.playAction('Walking_A', 0.2);
        }
      } else if (currentMarch.status === 'gathering') {
        if (currentMarch.type === 'attack_barbarian') {
          if (!curAction.includes('Attack')) {
            realHero.playAction('1H_Melee_Attack_Chop', 0.2);
          }
        } else {
          if (curAction !== 'Cheer' && curAction !== 'Idle') {
            realHero.playAction('Cheer', 0.2);
          }
        }
      }
    }
  };

  // 9. Update March State (Reactivity to server ticks)
  const updateMarchState = (updatedMarch: ArmyMarch) => {
    currentMarch = { ...updatedMarch };
    const returning = currentMarch.status === 'returning';
    const newColor = returning ? 0x10b981 : 0xf59e0b;

    armorMat.color.setHex(newColor);
    bannerMat.color.setHex(newColor);
    lineMat.color.setHex(newColor);
    beaconRingMat.color.setHex(newColor);
    beamMat.color.setHex(newColor);
    (targetDiamond.material as THREE.MeshStandardMaterial).color.setHex(newColor);
    (targetDiamond.material as THREE.MeshStandardMaterial).emissive.setHex(newColor);

    // Hide destination beacon once army arrives and returns
    if (returning) {
      destinationBeacon.visible = false;
    }

    if (realHero) {
      if (currentMarch.status === 'gathering') {
        if (currentMarch.type === 'attack_barbarian') {
          realHero.playAction('1H_Melee_Attack_Chop', 0.2);
        } else {
          realHero.playAction('Cheer', 0.2);
        }
      } else if (currentMarch.status === 'returning') {
        realHero.playAction('Walking_A', 0.2);
      }
    }

    // Refresh tactical tag canvas
    tagTexture.dispose();
    tagTexture = createMarchTagCanvas(
      currentMarch.commanderName,
      currentMarch.type,
      currentMarch.totalTroopCount,
      currentMarch.status
    );
    tagMat.map = tagTexture;
    tagMat.needsUpdate = true;
  };

  // 10. Distance LOD Tiers (Orbit hides tiny soldiers, shows prominent banner & billboard)
  const setLOD = (tier: 'city' | 'region' | 'world') => {
    currentLOD = tier;
    if (tier === 'world') {
      soldiersGroup.visible = false; // Hide soldiers at orbit distance for maximum FPS
      commanderGroup.visible = false;
      bannerGroup.scale.set(1.5, 1.5, 1.5);
      tagSprite.scale.set(6.2, 1.9, 1); // Large readable billboard from orbit
      destinationBeacon.scale.set(1.4, 1.4, 1.4);
    } else if (tier === 'region') {
      soldiersGroup.visible = true;
      commanderGroup.visible = true;
      soldierMeshes.forEach((s, idx) => {
        s.group.visible = idx < 3; // Commander + 2 escort guards
      });
      bannerGroup.scale.set(1.0, 1.0, 1.0);
      tagSprite.scale.set(4.2, 1.3, 1);
      destinationBeacon.scale.set(1.0, 1.0, 1.0);
    } else {
      soldiersGroup.visible = true;
      commanderGroup.visible = true;
      soldierMeshes.forEach((s) => {
        s.group.visible = true; // Full squad
      });
      bannerGroup.scale.set(1.0, 1.0, 1.0);
      tagSprite.scale.set(3.8, 1.2, 1);
      destinationBeacon.scale.set(1.0, 1.0, 1.0);
    }
  };

  const dispose = () => {
    if (realHero) {
      realHero.mixer.stopAllAction();
    }
    tagTexture.dispose();
    tagMat.dispose();
    armorMat.dispose();
    shieldMat.dispose();
    spearMat.dispose();
    goldCommanderMat.dispose();
    bannerMat.dispose();
    lineGeo.dispose();
    lineMat.dispose();
    beaconRingMat.dispose();
    beamMat.dispose();
  };

  return {
    group,
    pathLine,
    destinationBeacon,
    soldiersGroup,
    bannerGroup,
    updatePosition,
    updateMarchState,
    setLOD,
    dispose,
  };
}
