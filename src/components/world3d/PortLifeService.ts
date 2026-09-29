/**
 * Realm of Crowns — Port Life, Village Animals & NPC Guard Ecosystem
 * 
 * Populates 3D port havens and pirate sea caverns with living atmosphere:
 * 1. Armored NPC Guards:
 *    - Steel plate cuirass, pauldrons, crested iron helmet, broadsword, and heraldic shield.
 *    - Idle breathing, hand resting on sword hilt, and dynamic head tracking toward the hero.
 *    - Stationed at pier entrances, city gates, tavern portals, and council chambers.
 *    - Interactive dialogue prompts when approached or clicked.
 * 2. Village Animals:
 *    - Harbor Hounds / Dogs: tail-wagging, ear twitches, wandering between taverns and market.
 *    - Village & Pirate Cats: sleek calico/shadow cats perched on rum barrels and crates.
 *    - Coastal Seagulls: perched on wooden pier mooring bollards with periodic wing flaps.
 *    - Pack Donkeys / Ponies: saddled with burlap cargo sacks and trade baskets near the plaza.
 */

import * as THREE from 'three';
import { soundEngine } from '../../audio/soundEngine';
import { PirateGearService } from './PirateGearService';

const _tempGuardPos = new THREE.Vector3();

export interface GuardNPC {
  id: string;
  name: string;
  role: string;
  dialogue: string;
  group: THREE.Group;
  headBone: THREE.Object3D;
  swordMesh: THREE.Object3D;
  initialPos: THREE.Vector3;
  update: (delta: number, heroPos: THREE.Vector3, animTime: number) => void;
}

export interface VillagerNPC {
  id: string;
  name: string;
  role: string;
  dialogue: string;
  kind: 'maiden' | 'officer' | 'merchant' | 'dockhand';
  group: THREE.Group;
  headBone: THREE.Object3D;
  initialPos: THREE.Vector3;
  update: (delta: number, heroPos: THREE.Vector3, animTime: number) => void;
}

export interface VillageAnimal {
  id: string;
  kind: 'dog' | 'cat' | 'seagull' | 'donkey';
  name: string;
  group: THREE.Group;
  update: (delta: number, heroPos: THREE.Vector3, animTime: number) => void;
}

export interface PortLifeSystem {
  guards: GuardNPC[];
  villagers: VillagerNPC[];
  animals: VillageAnimal[];
  update: (delta: number, heroPos: THREE.Vector3, animTime: number) => void;
  getInteractableAtPoint: (point: THREE.Vector3, maxDist?: number) => GuardNPC | VillagerNPC | VillageAnimal | null;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// 1. PROCEDURAL 3D GUARD GENERATOR (Plate Armor, Helmet, Broadsword & Shield)
// ---------------------------------------------------------------------------

export function createGuardNPC(
  id: string,
  name: string,
  role: string,
  dialogue: string,
  pos: THREE.Vector3,
  rotY: number,
  isPirate: boolean
): GuardNPC {
  const group = new THREE.Group();
  group.name = `guard-${id}`;
  group.position.copy(pos);
  group.rotation.y = rotY;

  // Shared Materials
  const steelArmorMat = new THREE.MeshStandardMaterial({
    color: isPirate ? 0x334155 : 0x64748b,
    roughness: 0.32,
    metalness: 0.85,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: isPirate ? 0xb45309 : 0xf59e0b,
    roughness: 0.28,
    metalness: 0.9,
  });

  const tabardMat = new THREE.MeshStandardMaterial({
    color: isPirate ? 0x7f1d1d : 0x1e3a8a, // Crimson/Dark Burgundy for Pirates, Royal Navy Blue for Crown
    roughness: 0.75,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.82,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.65,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.95,
  });

  // Base Pedestal/Feet
  const footGeo = new THREE.BoxGeometry(0.32, 0.22, 0.45);
  const leftBoot = new THREE.Mesh(footGeo, leatherMat);
  leftBoot.position.set(-0.25, 0.11, 0.05);
  leftBoot.castShadow = true;
  group.add(leftBoot);

  const rightBoot = new THREE.Mesh(footGeo, leatherMat);
  rightBoot.position.set(0.25, 0.11, 0.05);
  rightBoot.castShadow = true;
  group.add(rightBoot);

  // Armored Greaves / Legs
  const legGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.75, 7);
  const leftLeg = new THREE.Mesh(legGeo, steelArmorMat);
  leftLeg.position.set(-0.25, 0.58, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, steelArmorMat);
  rightLeg.position.set(0.25, 0.58, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Armored Torso / Cuirass
  const torsoGeo = new THREE.BoxGeometry(0.72, 0.95, 0.44);
  const torso = new THREE.Mesh(torsoGeo, steelArmorMat);
  torso.position.set(0, 1.4, 0);
  torso.castShadow = true;
  group.add(torso);

  // Heraldic Tabard over Armor
  const tabardGeo = new THREE.BoxGeometry(0.55, 0.88, 0.48);
  const tabard = new THREE.Mesh(tabardGeo, tabardMat);
  tabard.position.set(0, 1.38, 0);
  group.add(tabard);

  // Heavy Plate Pauldrons (Shoulder Guards)
  const pauldronGeo = new THREE.SphereGeometry(0.26, 6, 6);
  pauldronGeo.scale(1.2, 0.8, 1.1);
  const leftPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
  leftPauldron.position.set(-0.48, 1.82, 0);
  leftPauldron.castShadow = true;
  group.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
  rightPauldron.position.set(0.48, 1.82, 0);
  rightPauldron.castShadow = true;
  group.add(rightPauldron);

  // Left Arm holding Shield
  const armGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.65, 6);
  const leftArm = new THREE.Mesh(armGeo, steelArmorMat);
  leftArm.position.set(-0.44, 1.45, 0.1);
  leftArm.rotation.x = 0.4;
  group.add(leftArm);

  // Heraldic Shield (Left Forearm)
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.52, 1.35, 0.25);
  shieldGroup.rotation.y = 0.2;

  const shieldGeo = new THREE.BoxGeometry(0.52, 0.85, 0.08);
  const shield = new THREE.Mesh(shieldGeo, tabardMat);
  shield.castShadow = true;
  shieldGroup.add(shield);

  // Shield Boss & Trim
  const bossGeo = new THREE.OctahedronGeometry(0.12, 0);
  const boss = new THREE.Mesh(bossGeo, goldTrimMat);
  boss.position.z = 0.06;
  shieldGroup.add(boss);
  group.add(shieldGroup);

  // Right Arm holding Steel Broadsword
  const rightArm = new THREE.Mesh(armGeo, steelArmorMat);
  rightArm.position.set(0.44, 1.45, 0.05);
  rightArm.rotation.x = -0.25;
  group.add(rightArm);

  // Sword Assembly
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0.48, 1.25, 0.2);
  swordGroup.rotation.x = 0.5;

  if (isPirate) {
    // Authentic Pirate Cutlass (Blackbeard Double-Bow Basket Hilt, Ref Image 3)
    const cutlass = PirateGearService.createPeriodSword('blackbeard_basket_t2', 0.95);
    swordGroup.add(cutlass);

    // Cross-Chest Leather Baldric across torso (Ref Image 4)
    const baldric = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 })
    );
    baldric.rotation.z = 0.6;
    baldric.position.set(0, 1.4, 0.02);
    group.add(baldric);

    // Brass Baldric Buckle
    const bBuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.03),
      goldTrimMat
    );
    bBuckle.rotation.z = 0.6;
    bBuckle.position.set(0.04, 1.42, 0.26);
    group.add(bBuckle);
  } else {
    // Crown Steel Broadsword
    const bladeGeo = new THREE.BoxGeometry(0.1, 1.15, 0.04);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.55;
    blade.castShadow = true;
    swordGroup.add(blade);

    const crossguardGeo = new THREE.BoxGeometry(0.38, 0.06, 0.08);
    const crossguard = new THREE.Mesh(crossguardGeo, goldTrimMat);
    crossguard.position.y = 0;
    swordGroup.add(crossguard);

    const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6);
    const grip = new THREE.Mesh(gripGeo, leatherMat);
    grip.position.y = -0.16;
    swordGroup.add(grip);

    const pommelGeo = new THREE.SphereGeometry(0.07, 6, 6);
    const pommel = new THREE.Mesh(pommelGeo, goldTrimMat);
    pommel.position.y = -0.32;
    swordGroup.add(pommel);
  }
  group.add(swordGroup);

  // Neck & Head Bone (For dynamic hero tracking)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 6), skinMat);
  neck.position.set(0, 1.95, 0);
  group.add(neck);

  const headBone = new THREE.Group();
  headBone.position.set(0, 2.12, 0);

  if (isPirate) {
    // Pirate Buccaneer Head with Facial Hair & Authentic Period Hat (Ref Image 2 & 4)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), skinMat);
    head.castShadow = true;
    headBone.add(head);

    const beard = PirateGearService.createPirateFacialHair('full_beard', 0.95);
    headBone.add(beard);

    // Period Tricorne with gold edge trim
    const hat = PirateGearService.createPeriodHat('tricorne', { scale: 0.95 });
    hat.position.y = 0.14;
    headBone.add(hat);
  } else {
    // Crown Crested Guard Helmet / Armet
    const helmGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const helm = new THREE.Mesh(helmGeo, steelArmorMat);
    helm.castShadow = true;
    headBone.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.28, 0.08, 0.18);
    const visor = new THREE.Mesh(visorGeo, new THREE.MeshBasicMaterial({ color: 0x09090b }));
    visor.position.set(0, 0, 0.18);
    headBone.add(visor);

    const plumeGeo = new THREE.ConeGeometry(0.08, 0.38, 5);
    plumeGeo.rotateX(0.2);
    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.6,
    });
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(0, 0.28, -0.04);
    headBone.add(plume);
  }

  group.add(headBone);

  // Overhead Guard Crest & Name Tag
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 256;
  badgeCanvas.height = 64;
  const bCtx = badgeCanvas.getContext('2d')!;
  bCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  bCtx.strokeStyle = isPirate ? '#b45309' : '#38bdf8';
  bCtx.lineWidth = 3;
  bCtx.roundRect(8, 8, 240, 48, 10);
  bCtx.fill();
  bCtx.stroke();

  bCtx.font = 'bold 18px sans-serif';
  bCtx.fillStyle = '#fef08a';
  bCtx.textAlign = 'center';
  bCtx.fillText(name, 128, 30);

  bCtx.font = 'bold 12px monospace';
  bCtx.fillStyle = isPirate ? '#fca5a5' : '#7dd3fc';
  bCtx.fillText(role, 128, 48);

  const badgeTex = new THREE.CanvasTexture(badgeCanvas);
  const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
  badgeSprite.scale.set(2.4, 0.6, 1);
  badgeSprite.position.set(0, 2.75, 0);
  group.add(badgeSprite);

  // Guard Update function
  const update = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
    // Breathing idle animation on torso and sword
    const breath = Math.sin(animTime * 2.2 + pos.x) * 0.02;
    torso.position.y = 1.4 + breath;
    headBone.position.y = 2.12 + breath * 1.2;
    swordGroup.rotation.x = 0.5 + Math.sin(animTime * 1.8 + pos.z) * 0.03;

    // Track hero orientation with head when close (within 14 meters, zero allocation)
    group.getWorldPosition(_tempGuardPos);
    const dx = heroPos.x - _tempGuardPos.x;
    const dz = heroPos.z - _tempGuardPos.z;
    const distToHero = Math.hypot(dx, dz);

    if (distToHero < 14.0) {
      // Calculate angle relative to guard facing
      const targetAngle = Math.atan2(dx, dz) - group.rotation.y;
      // Clamp head turn to +/- 65 degrees
      const clampedAngle = THREE.MathUtils.clamp(targetAngle, -1.15, 1.15);
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, clampedAngle, 8 * delta);
    } else {
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, 0, 4 * delta);
    }
  };

  return {
    id,
    name,
    role,
    dialogue,
    group,
    headBone,
    swordMesh: swordGroup,
    initialPos: pos.clone(),
    update,
  };
}

// ---------------------------------------------------------------------------
// 2. PROCEDURAL VILLAGE ANIMALS GENERATOR
// ---------------------------------------------------------------------------

export function createVillageAnimal(
  id: string,
  kind: 'dog' | 'cat' | 'seagull' | 'donkey',
  name: string,
  pos: THREE.Vector3,
  wanderRadius = 4.0
): VillageAnimal {
  const group = new THREE.Group();
  group.name = `animal-${kind}-${id}`;
  group.position.copy(pos);

  let updateAnimal: (delta: number, heroPos: THREE.Vector3, animTime: number) => void;

  if (kind === 'dog') {
    // Harbor Hound: Golden brown hound with floppy ears and wagging tail
    const furMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
    const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const noseMat = new THREE.MeshBasicMaterial({ color: 0x18181b });

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.42, 0.38, 0.85);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    // Head & Snout
    const headGeo = new THREE.BoxGeometry(0.32, 0.3, 0.38);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.68, 0.46);
    group.add(head);

    const snoutGeo = new THREE.BoxGeometry(0.18, 0.16, 0.28);
    const snout = new THREE.Mesh(snoutGeo, darkFurMat);
    snout.position.set(0, 0.62, 0.68);
    group.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), noseMat);
    nose.position.set(0, 0.68, 0.82);
    group.add(nose);

    // Floppy Ears
    const earGeo = new THREE.BoxGeometry(0.09, 0.22, 0.14);
    const leftEar = new THREE.Mesh(earGeo, darkFurMat);
    leftEar.position.set(-0.19, 0.72, 0.44);
    leftEar.rotation.z = -0.3;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, darkFurMat);
    rightEar.position.set(0.19, 0.72, 0.44);
    rightEar.rotation.z = 0.3;
    group.add(rightEar);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.35, 6);
    const legs: THREE.Mesh[] = [];
    [
      { x: -0.16, z: 0.26 },
      { x: 0.16, z: 0.26 },
      { x: -0.16, z: -0.26 },
      { x: 0.16, z: -0.26 },
    ].forEach((lp) => {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(lp.x, 0.18, lp.z);
      leg.castShadow = true;
      legs.push(leg);
      group.add(leg);
    });

    // Wagging Tail
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 5);
    tailGeo.rotateX(0.5);
    const tail = new THREE.Mesh(tailGeo, darkFurMat);
    tail.position.set(0, 0.52, -0.44);
    group.add(tail);

    let wanderAngle = Math.random() * Math.PI * 2;
    const originPos = pos.clone();

    updateAnimal = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
      // Rapid tail wagging
      tail.rotation.y = Math.sin(animTime * 12.0) * 0.45;

      // Subtle breathing & head sniffing
      head.position.y = 0.68 + Math.sin(animTime * 3.0) * 0.03;
      head.rotation.x = Math.sin(animTime * 1.5) * 0.1;

      // Gentle wandering near initial origin
      wanderAngle += delta * 0.35;
      const targetX = originPos.x + Math.sin(wanderAngle) * wanderRadius;
      const targetZ = originPos.z + Math.cos(wanderAngle) * wanderRadius;

      const dx = targetX - group.position.x;
      const dz = targetZ - group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.1) {
        group.position.x += (dx / dist) * 1.8 * delta;
        group.position.z += (dz / dist) * 1.8 * delta;
        group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, Math.atan2(dx, dz), 6 * delta);

        // Leg strides
        legs[0].rotation.x = Math.sin(animTime * 9) * 0.4;
        legs[1].rotation.x = -Math.sin(animTime * 9) * 0.4;
        legs[2].rotation.x = -Math.sin(animTime * 9) * 0.4;
        legs[3].rotation.x = Math.sin(animTime * 9) * 0.4;
      }
    };
  } else if (kind === 'cat') {
    // Village/Pirate Cat: Sleek black/calico cat with pointed ears and curling tail
    const catMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.24, 0.22, 0.52);
    const body = new THREE.Mesh(bodyGeo, catMat);
    body.position.y = 0.26;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.14, 7, 7);
    const head = new THREE.Mesh(headGeo, catMat);
    head.position.set(0, 0.38, 0.28);
    group.add(head);

    // Green glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, 0.4, 0.39);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, 0.4, 0.39);
    group.add(leftEye, rightEye);

    // Pointed Ears
    const earGeo = new THREE.ConeGeometry(0.045, 0.12, 4);
    const leftEar = new THREE.Mesh(earGeo, whiteMat);
    leftEar.position.set(-0.08, 0.52, 0.28);
    const rightEar = new THREE.Mesh(earGeo, whiteMat);
    rightEar.position.set(0.08, 0.52, 0.28);
    group.add(leftEar, rightEar);

    // Curled Tail
    const tailGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.45, 5);
    tailGeo.rotateX(0.8);
    const tail = new THREE.Mesh(tailGeo, catMat);
    tail.position.set(0, 0.32, -0.32);
    group.add(tail);

    updateAnimal = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
      // Gentle tail twitching
      tail.rotation.z = Math.sin(animTime * 3.5) * 0.25;
      tail.rotation.x = 0.8 + Math.sin(animTime * 2.0) * 0.1;
      head.rotation.y = Math.sin(animTime * 1.2) * 0.3;
    };
  } else if (kind === 'seagull') {
    // Coastal Seagull: White body, slate wings, yellow beak
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
    const beakMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.18, 0.55, 6);
    bodyGeo.rotateX(Math.PI * 0.45);
    const body = new THREE.Mesh(bodyGeo, featherMat);
    body.position.y = 0.25;
    group.add(body);

    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), beakMat);
    beak.rotateX(Math.PI * 0.5);
    beak.position.set(0, 0.28, 0.34);
    group.add(beak);

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.55, 0.05, 0.25);
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0.3, 0);
    group.add(wings);

    updateAnimal = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
      // Periodic wing flap
      const flapTime = (animTime * 0.8) % 6.0;
      if (flapTime < 0.6) {
        wings.rotation.z = Math.sin(animTime * 24.0) * 0.5;
      } else {
        wings.rotation.z = 0;
      }
      body.rotation.y = Math.sin(animTime * 0.8) * 0.2;
    };
  } else {
    // Pack Donkey / Pony
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.85 });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.95 });

    const bodyGeo = new THREE.BoxGeometry(0.7, 0.75, 1.4);
    const body = new THREE.Mesh(bodyGeo, coatMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    // Head & Long Donkey Ears
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), coatMat);
    head.position.set(0, 1.5, 0.75);
    group.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.35), muzzleMat);
    muzzle.position.set(0, 1.35, 1.05);
    group.add(muzzle);

    const earGeo = new THREE.ConeGeometry(0.08, 0.45, 4);
    const leftEar = new THREE.Mesh(earGeo, coatMat);
    leftEar.position.set(-0.16, 1.88, 0.65);
    leftEar.rotation.z = -0.2;
    const rightEar = new THREE.Mesh(earGeo, coatMat);
    rightEar.position.set(0.16, 1.88, 0.65);
    rightEar.rotation.z = 0.2;
    group.add(leftEar, rightEar);

    // 4 Sturdy Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.8, 6);
    [
      { x: -0.26, z: 0.45 },
      { x: 0.26, z: 0.45 },
      { x: -0.26, z: -0.45 },
      { x: 0.26, z: -0.45 },
    ].forEach((lp) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(lp.x, 0.4, lp.z);
      leg.castShadow = true;
      group.add(leg);
    });

    // Side Cargo Baskets / Sacks
    const sackGeo = new THREE.BoxGeometry(0.35, 0.55, 0.65);
    const leftSack = new THREE.Mesh(sackGeo, sackMat);
    leftSack.position.set(-0.48, 1.0, 0);
    const rightSack = new THREE.Mesh(sackGeo, sackMat);
    rightSack.position.set(0.48, 1.0, 0);
    group.add(leftSack, rightSack);

    updateAnimal = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
      // Calm head nodding & ear twitching
      head.position.y = 1.5 + Math.sin(animTime * 1.4) * 0.03;
      leftEar.rotation.z = -0.2 + Math.sin(animTime * 3.2) * 0.06;
      rightEar.rotation.z = 0.2 - Math.sin(animTime * 2.8) * 0.06;
    };
  }

  return {
    id,
    kind,
    name,
    group,
    update: updateAnimal,
  };
}

// ---------------------------------------------------------------------------
// 3. PROCEDURAL VILLAGER GENERATOR (Harbor Maidens, Naval Officers, Merchants, Dockworkers)
// (Directly modeled after the user's reference images)
// ---------------------------------------------------------------------------

export function createVillagerNPC(
  id: string,
  name: string,
  role: string,
  dialogue: string,
  kind: 'maiden' | 'officer' | 'merchant' | 'dockhand',
  pos: THREE.Vector3,
  rotY: number
): VillagerNPC {
  const group = new THREE.Group();
  group.name = `villager-${id}`;
  group.position.copy(pos);
  group.rotation.y = rotY;

  // Curated materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b0, roughness: 0.75 });
  const darkHairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
  const auburnHairMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const creamLinenMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.85 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  const navyCoatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.75 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.85 });
  const crimsonSashMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 }); // warm terracotta
  const skirtLinenMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 }); // beige linen

  const headBone = new THREE.Group();
  headBone.position.set(0, 1.95, 0);

  if (kind === 'maiden') {
    // 1. HARBOR MAIDEN (Inspired by Reference Image 2: layered peasant skirt, gathered blouse, corset, long wavy hair)
    // Tiered Ruffled Skirt (layers of terracotta and ecru linen)
    const lowerSkirtGeo = new THREE.ConeGeometry(0.78, 1.15, 12, 1, true);
    const lowerSkirt = new THREE.Mesh(lowerSkirtGeo, skirtLinenMat);
    lowerSkirt.position.y = 0.58;
    group.add(lowerSkirt);

    const upperSkirtGeo = new THREE.ConeGeometry(0.68, 0.75, 12, 1, true);
    const upperSkirt = new THREE.Mesh(upperSkirtGeo, skirtMat);
    upperSkirt.position.y = 0.95;
    group.add(upperSkirt);

    // Corset / Laced Bodice
    const corsetGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.55, 8);
    const corset = new THREE.Mesh(corsetGeo, leatherMat);
    corset.position.y = 1.35;
    group.add(corset);

    // Gathered Peasant Blouse (off-the-shoulder puff sleeves)
    const blouseGeo = new THREE.CylinderGeometry(0.35, 0.32, 0.45, 8);
    const blouse = new THREE.Mesh(blouseGeo, creamLinenMat);
    blouse.position.y = 1.65;
    group.add(blouse);

    // Puff Sleeves
    [-0.38, 0.38].forEach((sx) => {
      const puffGeo = new THREE.SphereGeometry(0.18, 6, 6);
      const puff = new THREE.Mesh(puffGeo, creamLinenMat);
      puff.position.set(sx, 1.65, 0);
      group.add(puff);

      // Forearm
      const armGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6);
      const arm = new THREE.Mesh(armGeo, skinMat);
      arm.position.set(sx, 1.35, 0.08);
      group.add(arm);
    });

    // Neck & Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    headBone.add(head);

    // Flowing Long Dark Wavy Hair (drapes down shoulders, exactly like Reference 2)
    const hairTopGeo = new THREE.SphereGeometry(0.23, 8, 8);
    const hairTop = new THREE.Mesh(hairTopGeo, darkHairMat);
    hairTop.position.set(0, 0.04, -0.04);
    headBone.add(hairTop);

    // Flowing hair locks falling over back and shoulders
    [-0.14, 0.14, 0].forEach((hx, idx) => {
      const lockGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.65, 5);
      const lock = new THREE.Mesh(lockGeo, idx === 1 ? auburnHairMat : darkHairMat);
      lock.position.set(hx, -0.32, -0.12);
      lock.rotation.x = -0.15;
      headBone.add(lock);
    });

    group.add(headBone);
  } else if (kind === 'officer') {
    // 2. NAVAL OFFICER (Inspired by Reference Image 1: long navy coat, gold trim, bicorne/tricorne hat, red sash, saber)
    [-0.22, 0.22].forEach((lx) => {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.9, 6);
      const leg = new THREE.Mesh(legGeo, creamLinenMat);
      leg.position.set(lx, 0.45, 0);
      group.add(leg);

      const bootGeo = new THREE.BoxGeometry(0.28, 0.22, 0.42);
      const boot = new THREE.Mesh(bootGeo, leatherMat);
      boot.position.set(lx, 0.11, 0.08);
      group.add(boot);
    });

    // Long Navy Blue Coat Torso
    const coatGeo = new THREE.BoxGeometry(0.72, 0.95, 0.45);
    const coat = new THREE.Mesh(coatGeo, navyCoatMat);
    coat.position.y = 1.38;
    group.add(coat);

    // Crimson Silk Sash across chest
    const sashGeo = new THREE.BoxGeometry(0.74, 0.16, 0.47);
    const sash = new THREE.Mesh(sashGeo, crimsonSashMat);
    sash.rotation.z = -0.4;
    sash.position.y = 1.38;
    group.add(sash);

    // Gold Epaulets on shoulders
    [-0.38, 0.38].forEach((ex) => {
      const epGeo = new THREE.BoxGeometry(0.22, 0.08, 0.28);
      const ep = new THREE.Mesh(epGeo, goldTrimMat);
      ep.position.set(ex, 1.82, 0);
      group.add(ep);
    });

    // Authentic Gilded Swept-Hilt Officer Saber at hip (Ref Image 3 The Siren T3)
    const officerSaber = PirateGearService.createPeriodSword('siren_swept_t3', 0.85);
    officerSaber.rotation.z = 0.45;
    officerSaber.position.set(-0.45, 0.92, 0.05);
    group.add(officerSaber);

    // Head with Authentic Colonial Naval Bicorne (Ref Image 2 No. 356)
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    headBone.add(head);

    const officerHat = PirateGearService.createPeriodHat('bicorne_naval', { scale: 0.95 });
    officerHat.position.y = 0.14;
    headBone.add(officerHat);

    group.add(headBone);
  } else {
    // 3. MERCHANT / DOCKHAND (Linen shirt, vest, boots)
    [-0.22, 0.22].forEach((lx) => {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.9, 6);
      const leg = new THREE.Mesh(legGeo, leatherMat);
      leg.position.set(lx, 0.45, 0);
      group.add(leg);
    });

    const torsoGeo = new THREE.BoxGeometry(0.68, 0.9, 0.42);
    const torso = new THREE.Mesh(torsoGeo, kind === 'merchant' ? skirtMat : creamLinenMat);
    torso.position.y = 1.35;
    group.add(torso);

    [-0.38, 0.38].forEach((ax) => {
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 6);
      const arm = new THREE.Mesh(armGeo, skinMat);
      arm.position.set(ax, 1.35, 0);
      group.add(arm);
    });

    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    headBone.add(head);

    const hairGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const hair = new THREE.Mesh(hairGeo, darkHairMat);
    hair.position.set(0, 0.04, -0.02);
    headBone.add(hair);

    group.add(headBone);
  }

  // Overhead Interactive Villager Nameplate
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 256;
  badgeCanvas.height = 64;
  const ctx = badgeCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = kind === 'officer' ? '#38bdf8' : kind === 'maiden' ? '#f472b6' : '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 52, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 19px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 28);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = kind === 'officer' ? '#7dd3fc' : kind === 'maiden' ? '#fbcfe8' : '#fed7aa';
    ctx.fillText(role, 128, 46);
  }
  const badgeTex = new THREE.CanvasTexture(badgeCanvas);
  const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, depthTest: false }));
  badgeSprite.scale.set(2.4, 0.6, 1);
  badgeSprite.position.set(0, 2.7, 0);
  group.add(badgeSprite);

  const initialPos = pos.clone();

  const update = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
    // Dynamic Head-Tracking toward Hero
    const dx = heroPos.x - initialPos.x;
    const dz = heroPos.z - initialPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 12.0) {
      const targetAngle = Math.atan2(dx, dz) - group.rotation.y;
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetAngle * 0.7, 0.12);
    } else {
      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, 0, 0.05);
    }

    // Gentle breathing
    group.position.y = initialPos.y + Math.sin(animTime * 1.8 + initialPos.x) * 0.02;
  };

  return {
    id,
    name,
    role,
    dialogue,
    kind,
    group,
    headBone,
    initialPos,
    update,
  };
}

// ---------------------------------------------------------------------------
// 4. MAIN PORT LIFE SYSTEM CREATOR
// ---------------------------------------------------------------------------

export function createPortLifeSystem(
  scene: THREE.Scene,
  isCave: boolean,
  isPirate: boolean
): PortLifeSystem {
  const guards: GuardNPC[] = [];
  const villagers: VillagerNPC[] = [];
  const animals: VillageAnimal[] = [];
  const rootGroup = new THREE.Group();
  rootGroup.name = 'port-life-ecosystem';
  scene.add(rootGroup);

  if (isCave) {
    // --- THE BRETHREN'S VAULT (Pirate Sea Cavern Grotto) ---
    // 1. Vault Gate Sentries (Equipped with Blackbeard cutlasses and tricornes)
    const g1 = createGuardNPC(
      'vault-sentry-1',
      'Corsair Ironclad Jax',
      'Vault Gatekeeper',
      '"Hold yer cutlass sheathed, captain. The Sacred Truce protects all within these cavern walls!"',
      new THREE.Vector3(-6, 1.0, -12),
      Math.PI * 0.05,
      true
    );
    const g2 = createGuardNPC(
      'vault-sentry-2',
      'Buccaneer Brutus',
      'Pier Watchman',
      '"Spanish galleons were sighted two leagues leeward. Keep yer powder dry!"',
      new THREE.Vector3(6, 1.0, -12),
      -Math.PI * 0.05,
      true
    );
    const g3 = createGuardNPC(
      'vault-sentry-3',
      'Quartermaster Drake',
      'Council Guardian',
      '"The Brethren Council respects only plunder and courage. Speak with the Altar to swear the oath."',
      new THREE.Vector3(8, 1.0, 32),
      Math.PI * 0.85,
      true
    );
    guards.push(g1, g2, g3);

    // 2. THE TREASURE COUNCIL (Directly matching Reference Image 1)
    // Gathered around the overflowing gold chest with crimson frock coats, bandanas, and cutlasses
    const c_bart = PirateGearService.createPirateCaptainNPC({
      id: 'council-black-bart',
      name: 'Captain Black Bart',
      role: 'Brethren Fleet Admiral',
      dialogue: '"Every doubloon in this chest was won with iron and saltwater! Swear the Sacred Truce, commander."',
      pos: new THREE.Vector3(-12, 1.0, 24),
      rotY: Math.PI * 0.35,
      outfit: 'crimson_frock_coat',
      hat: 'feathered_tricorne',
      sword: 'blackbeard_basket_t2',
      pose: 'standing_sword_ready',
      facialHair: 'full_beard',
      scale: 1.05,
    });

    const c_morgan = PirateGearService.createPirateCaptainNPC({
      id: 'council-morgan',
      name: 'Quartermaster Morgan',
      role: 'Council Treasurer',
      dialogue: '"Rubies from the Coromandel, gold ingots from Cartagena... count yer share with care, friend."',
      pos: new THREE.Vector3(-15, 1.0, 22),
      rotY: Math.PI * 0.45,
      outfit: 'buff_waistcoat',
      hat: 'pirate_bandana',
      sword: 'siren_clamshell_t1',
      pose: 'sitting_on_chest',
      facialHair: 'goatee',
      scale: 1.0,
    });

    const c_sterling = PirateGearService.createPirateCaptainNPC({
      id: 'council-sterling',
      name: 'Captain Jack Sterling',
      role: 'Corsair Privateer',
      dialogue: '"The King\'s navy hunts our wake, but no man o\' war dares navigate this subterranean sea gate!"',
      pos: new THREE.Vector3(-10, 1.0, 26),
      rotY: Math.PI * 0.15,
      outfit: 'khaki_corsair',
      hat: 'cocked_chapeau',
      sword: 'duelist_rapier',
      pose: 'standing_sword_ready',
      facialHair: 'full_beard',
      scale: 1.0,
    });
    guards.push(c_bart, c_morgan, c_sterling);

    // 3. NIGHT BEACH CAMPFIRE GATHERING (Directly matching Reference Image 4)
    // Driftwood campfire with captains conversing under the cavern stars with tall ship in background
    const campfire = PirateGearService.createBeachCampfire(1.2);
    campfire.position.set(16, 1.0, 14);
    rootGroup.add(campfire);

    const c_vane = PirateGearService.createPirateCaptainNPC({
      id: 'fire-captain-vane',
      name: 'Captain Edward Vane',
      role: 'Dread Raider',
      dialogue: '"The tide turns under the crescent moon. Tomorrow night, we raid the silver convoy off the shoals!"',
      pos: new THREE.Vector3(14.5, 1.0, 15),
      rotY: Math.PI * 0.75,
      outfit: 'navy_officer_coat',
      hat: 'feathered_tricorne',
      sword: 'blackbeard_falchion_t3',
      pose: 'leaning_on_sword',
      facialHair: 'full_beard',
      scale: 1.05,
    });

    const c_flint = PirateGearService.createPirateCaptainNPC({
      id: 'fire-captain-flint',
      name: 'Captain Jonas Flint',
      role: 'Galleon Commander',
      dialogue: '"Keep yer powder dry and cutlass sharp. When the broadsides roar, hesitation is death."',
      pos: new THREE.Vector3(17.5, 1.0, 16),
      rotY: -Math.PI * 0.75,
      outfit: 'khaki_corsair',
      hat: 'tricorne',
      sword: 'blackbeard_cutlass_t1',
      pose: 'standing_sword_ready',
      facialHair: 'full_beard',
      scale: 1.0,
    });

    const c_darby = PirateGearService.createPirateCaptainNPC({
      id: 'fire-bosun-darby',
      name: 'Bo\'sun Darby',
      role: 'Master Gunner',
      dialogue: '"Twenty-four heavy cannon greased and primed! No ship afloat can withstand our flagship\'s volley."',
      pos: new THREE.Vector3(17.5, 1.0, 12),
      rotY: -Math.PI * 0.25,
      outfit: 'buff_waistcoat',
      hat: 'yager_rosette',
      sword: 'orchid_scimitar',
      pose: 'sitting_on_barrel',
      facialHair: 'full_beard',
      scale: 0.98,
    });
    guards.push(c_vane, c_flint, c_darby);

    const c1 = createVillageAnimal('cave-cat', 'cat', 'Shadow Paw', new THREE.Vector3(-14, 1.8, 22));
    const d1 = createVillageAnimal('cave-hound', 'dog', 'Old Barnaby', new THREE.Vector3(12, 1.0, 18), 3.0);
    const s1 = createVillageAnimal('cave-gull', 'seagull', 'Reef Diver', new THREE.Vector3(-8, 1.4, -28));
    animals.push(c1, d1, s1);
  } else if (isPirate) {
    // --- PIRATE ISLAND HAVEN (Tortuga) ---
    const g1 = createGuardNPC(
      'port-sentry-pier-left',
      'Corsair Sentry Vane',
      'Pier Harbor Watch',
      '"Welcome to Tortuga, buccaneer! Plunder is plentiful and the rum runs cold."',
      new THREE.Vector3(-8, 1.0, -16),
      Math.PI * 0.1,
      true
    );
    const g2 = createGuardNPC(
      'port-sentry-pier-right',
      'Freebooter Flint',
      'Pier Harbor Watch',
      '"Watch yer pouch near the smuggler stalls. Cutpurses lurk in every shadow."',
      new THREE.Vector3(8, 1.0, -16),
      -Math.PI * 0.1,
      true
    );
    const g3 = createGuardNPC(
      'port-sentry-plaza-gate',
      'Captain Blackheart',
      'Governor Palace Guard',
      '"The Brethren Code dictates fair shares of all captured Spanish gold!"',
      new THREE.Vector3(-10, 1.0, 60),
      Math.PI * 0.75,
      true
    );
    const g4 = createGuardNPC(
      'port-sentry-storehouse',
      'Quartermaster Redbeard',
      'Storehouse Guard',
      '"Drydock and ship refits are open to all sea-worthy captains. Speak with the master shipwright."',
      new THREE.Vector3(24, 1.0, 48),
      -Math.PI * 0.65,
      true
    );
    guards.push(g1, g2, g3, g4);

    const d1 = createVillageAnimal('plaza-hound', 'dog', 'Rusty the Tavern Dog', new THREE.Vector3(-22, 1.0, 36), 4.5);
    const d2 = createVillageAnimal('pier-hound', 'dog', 'Sailor', new THREE.Vector3(6, 1.0, 8), 3.5);
    const c1 = createVillageAnimal('market-cat', 'cat', 'Whiskerjack', new THREE.Vector3(-14, 1.8, 33));
    const c2 = createVillageAnimal('tavern-cat', 'cat', 'Barnacle', new THREE.Vector3(-32, 1.0, 42));
    const s1 = createVillageAnimal('quay-gull-1', 'seagull', 'Saltwind', new THREE.Vector3(-10, 1.4, -38));
    const s2 = createVillageAnimal('quay-gull-2', 'seagull', 'Stormy', new THREE.Vector3(10, 1.4, -38));
    const p1 = createVillageAnimal('market-donkey', 'donkey', 'Barnaby the Pack Mule', new THREE.Vector3(14, 1.0, 38));
    animals.push(d1, d2, c1, c2, s1, s2, p1);
  } else {
    // --- NORMAL COLONIAL / MEDITERRANEAN PORT (Oxbay, Redmond, Isla Muelle, Conceicao) ---
    // (Directly modeled after Reference Images 1 & 2)

    // 1. Armored Royal Sentry Guards with plate cuirass, helmets, broadswords & shields
    const g1 = createGuardNPC(
      'port-sentry-pier-left',
      'Lieutenant Sterling',
      'Admiralty Pier Guard',
      '"Halt, traveler! Present your vessel manifest before offloading cargo at the royal quay."',
      new THREE.Vector3(-9, 1.0, 4),
      Math.PI * 0.08,
      false
    );
    const g2 = createGuardNPC(
      'port-sentry-pier-right',
      'Sergeant Cromwell',
      'Pier Harbor Watch',
      '"Citadel authority preserves order throughout this port. Keep all blades sheathed on the promenade."',
      new THREE.Vector3(9, 1.0, 4),
      -Math.PI * 0.08,
      false
    );
    const g3 = createGuardNPC(
      'port-sentry-palace',
      'Royal Halberdier Vance',
      'Governor Chancellery Guard',
      '"His Excellency the Governor has posted lucrative bounties for rogue pirate hunters across the Antilles."',
      new THREE.Vector3(-10, 1.0, 68),
      Math.PI * 0.75,
      false
    );
    const g4 = createGuardNPC(
      'port-sentry-arsenal',
      'Customs Warden Thorne',
      'Arsenal & Storehouse Sentry',
      '"Drydock repair slips and timber refits are certified by the Master Shipwright. Safe voyages, commander!"',
      new THREE.Vector3(12, 1.0, 68),
      -Math.PI * 0.75,
      false
    );
    guards.push(g1, g2, g3, g4);

    // 2. Harbor Maidens & Villagers (Inspired by Reference Images 1 & 2)
    const v1 = createVillagerNPC(
      'harbor-maiden-clara',
      'Maiden Clara',
      'Harbor Maiden',
      '"The ocean breeze brings sweet salt and jasmine today... Welcome ashore, Lord Commander!"',
      'maiden',
      new THREE.Vector3(-8.8, 1.0, -18),
      Math.PI * 0.4
    );
    const v2 = createVillagerNPC(
      'harbor-maiden-rosalind',
      'Maiden Rosalind',
      'Harbor Maiden',
      '"We watch the horizon for the white sails of the trade fleet. What news do you bring from the open sea?"',
      'maiden',
      new THREE.Vector3(8.8, 1.0, -22),
      -Math.PI * 0.45
    );
    const v3 = createVillagerNPC(
      'officer-horatio',
      'Captain Horatio',
      'Royal Naval Officer',
      '"The shipping lanes are secure under Crown protection. May fair winds and fortune guide your voyage!"',
      'officer',
      new THREE.Vector3(0, 1.0, 18),
      Math.PI
    );
    const v4 = createVillagerNPC(
      'merchant-alistair',
      'Merchant Alistair',
      'Fruit & Spice Trader',
      '"Fresh Valencia oranges, sweet Caribbean sugar, and rare cinnamon! Honest cargo for an honest captain."',
      'merchant',
      new THREE.Vector3(-12, 1.0, 28),
      Math.PI * 0.5
    );
    const v5 = createVillagerNPC(
      'dockhand-toby',
      'Dockhand Toby',
      'Quayside Stevedore',
      '"Careful near the mooring lines, captain! The incoming tide is running swift this evening."',
      'dockhand',
      new THREE.Vector3(-6, 1.0, -8),
      Math.PI * 0.2
    );
    villagers.push(v1, v2, v3, v4, v5);

    // 3. Normal Port Village Animals (Dogs, Cats, Pack Donkeys, Seagulls on Rope Pilings)
    const d1 = createVillageAnimal('pier-dog-sailor', 'dog', 'Sailor the Pier Hound', new THREE.Vector3(5.5, 1.0, -12), 3.0);
    const d2 = createVillageAnimal('tavern-dog-rusty', 'dog', 'Rusty the Tavern Dog', new THREE.Vector3(-18, 1.0, 36), 4.0);
    const c1 = createVillageAnimal('market-cat-whisker', 'cat', 'Whiskerjack the Market Cat', new THREE.Vector3(-13, 1.8, 48));
    const c2 = createVillageAnimal('quay-cat-barnacle', 'cat', 'Barnacle the Quayside Cat', new THREE.Vector3(8.8, 1.8, 2));
    const p1 = createVillageAnimal('plaza-mule-barnaby', 'donkey', 'Barnaby the Pack Mule', new THREE.Vector3(12, 1.0, 38));
    const s1 = createVillageAnimal('piling-gull-1', 'seagull', 'Saltwind', new THREE.Vector3(-10.2, 4.4, -35));
    const s2 = createVillageAnimal('piling-gull-2', 'seagull', 'Stormy', new THREE.Vector3(10.2, 4.4, -45));
    animals.push(d1, d2, c1, c2, p1, s1, s2);
  }

  // Add all entities to root group
  guards.forEach((g) => rootGroup.add(g.group));
  villagers.forEach((v) => rootGroup.add(v.group));
  animals.forEach((a) => rootGroup.add(a.group));

  // Update loop
  const update = (delta: number, heroPos: THREE.Vector3, animTime: number) => {
    guards.forEach((g) => g.update(delta, heroPos, animTime));
    villagers.forEach((v) => v.update(delta, heroPos, animTime));
    animals.forEach((a) => a.update(delta, heroPos, animTime));
  };

  // Find nearest guard, villager, or animal to raycast/click point
  const getInteractableAtPoint = (point: THREE.Vector3, maxDist = 4.0) => {
    for (const g of guards) {
      const worldPos = new THREE.Vector3();
      g.group.getWorldPosition(worldPos);
      if (Math.hypot(point.x - worldPos.x, point.z - worldPos.z) < maxDist) {
        return g;
      }
    }
    for (const v of villagers) {
      const worldPos = new THREE.Vector3();
      v.group.getWorldPosition(worldPos);
      if (Math.hypot(point.x - worldPos.x, point.z - worldPos.z) < maxDist) {
        return v;
      }
    }
    for (const a of animals) {
      const worldPos = new THREE.Vector3();
      a.group.getWorldPosition(worldPos);
      if (Math.hypot(point.x - worldPos.x, point.z - worldPos.z) < maxDist) {
        return a;
      }
    }
    return null;
  };

  const dispose = () => {
    scene.remove(rootGroup);
    guards.forEach((g) => {
      g.group.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    });
    villagers.forEach((v) => {
      v.group.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    });
    animals.forEach((a) => {
      a.group.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    });
  };

  return {
    guards,
    villagers,
    animals,
    update,
    getInteractableAtPoint,
    dispose,
  };
}
