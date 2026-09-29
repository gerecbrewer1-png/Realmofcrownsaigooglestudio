/**
 * Realm of Crowns - 3D Hero / Commander Models
 * Procedural stylized 3D models representing the 5 Hero Classes:
 * - WARLORD: Heavy plate armor, horned crest helmet, longsword, heraldic shield, crimson cape.
 * - GUARDIAN: Sun-crest gilded armor, massive tower shield, winged visor, golden lance/spear.
 * - RANGER: Forest-green hooded mantle, leather doublet, recurve longbow, quiver of arrows.
 * - STEWARD: Sovereign merchant robes, golden medallion, royal ledger & realm keys.
 * - STRATEGIST: High commander helm, tactical battle standard, royal mantle, star insignia.
 */

import * as THREE from 'three';
import { HeroClass } from '../../types';

// Shared Materials Palette
const skinMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  roughness: 0.7,
  metalness: 0.05,
});

const ironArmorMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.35,
  metalness: 0.8,
});

const darkPlateMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.4,
  metalness: 0.75,
});

const goldTrimMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.25,
  metalness: 0.9,
});

const crimsonCapeMat = new THREE.MeshStandardMaterial({
  color: 0x991b1b,
  roughness: 0.8,
  side: THREE.DoubleSide,
});

const guardianBlueMat = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  roughness: 0.4,
  metalness: 0.6,
});

const rangerGreenMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.85,
});

const rangerLeatherMat = new THREE.MeshStandardMaterial({
  color: 0x78350f,
  roughness: 0.8,
});

const stewardGoldMat = new THREE.MeshStandardMaterial({
  color: 0xd97706,
  roughness: 0.3,
  metalness: 0.7,
});

const stewardRobesMat = new THREE.MeshStandardMaterial({
  color: 0x581c87,
  roughness: 0.75,
});

const strategistNavyMat = new THREE.MeshStandardMaterial({
  color: 0x1e3a8a,
  roughness: 0.5,
  metalness: 0.5,
});

const bladeSilverMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.2,
  metalness: 0.95,
});

const glowAuraMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24,
  transparent: true,
  opacity: 0.4,
});

export interface Hero3DBundle {
  group: THREE.Group;
  heroClass: HeroClass;
  updateAnimation: (time: number, speed?: number) => void;
  triggerAbilityVFX?: () => void;
}

/**
 * Creates a detailed 3D Hero / Commander mesh for the given class
 */
export function createHeroMesh(heroClass: HeroClass, scale = 1.0, isWalkable = false): Hero3DBundle {
  const group = new THREE.Group();
  group.name = `hero-model-${heroClass}`;

  const heroRoot = new THREE.Group();
  heroRoot.scale.set(scale, scale, scale);
  group.add(heroRoot);

  let dais: THREE.Mesh | null = null;
  let aura: THREE.Mesh | null = null;

  if (!isWalkable) {
    // Common Pedestal Dais (for showcase previews)
    const daisGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.25, 12);
    const daisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = 0.125;
    dais.receiveShadow = true;
    heroRoot.add(dais);

    // Aura Ring
    const auraGeo = new THREE.TorusGeometry(1.1, 0.04, 6, 24);
    aura = new THREE.Mesh(auraGeo, glowAuraMat);
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.26;
    heroRoot.add(aura);
  }

  // Build class-specific character geometry
  let weaponPivot: THREE.Group | null = null;
  let capeMesh: THREE.Mesh | null = null;
  let leftLeg: THREE.Mesh | null = null;
  let rightLeg: THREE.Mesh | null = null;
  let bodyGroup: THREE.Group | null = null;

  switch (heroClass) {
    case 'warlord':
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildWarlord(heroRoot));
      break;
    case 'guardian':
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildGuardian(heroRoot));
      break;
    case 'ranger':
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildRanger(heroRoot));
      break;
    case 'steward':
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildSteward(heroRoot));
      break;
    case 'strategist':
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildStrategist(heroRoot));
      break;
    default:
      ({ weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup } = buildWarlord(heroRoot));
  }

  if (isWalkable && bodyGroup) {
    bodyGroup.position.y = 0; // Feet touch ground directly at y = 0
  }

  // Animation handler
  const updateAnimation = (time: number, speed = 0) => {
    if (!isWalkable) {
      // Subtle idle breathing & swaying
      heroRoot.position.y = Math.sin(time * 2) * 0.05;
      if (aura) aura.rotation.z = time * 0.8;
    } else {
      heroRoot.position.y = 0;
      if (speed > 0.15) {
        // Natural walking stride and torso bobbing
        if (leftLeg) leftLeg.rotation.x = Math.sin(time * 9.0) * 0.55;
        if (rightLeg) rightLeg.rotation.x = -Math.sin(time * 9.0) * 0.55;
        if (bodyGroup) bodyGroup.position.y = Math.abs(Math.sin(time * 9.0)) * 0.06;
      } else {
        if (leftLeg) leftLeg.rotation.x *= 0.8;
        if (rightLeg) rightLeg.rotation.x *= 0.8;
        if (bodyGroup) bodyGroup.position.y = 0;
      }
    }

    if (capeMesh) {
      capeMesh.rotation.x = 0.15 + Math.sin(time * (speed > 0.15 ? 6 : 3)) * (speed > 0.15 ? 0.18 : 0.08);
    }

    if (weaponPivot) {
      weaponPivot.rotation.z = Math.sin(time * 1.5) * 0.06;
    }
  };

  return {
    group,
    heroClass,
    updateAnimation,
  };
}

/**
 * 1. WARLORD: Valeria / Kragor
 * Heavy plate cuirass, spiked pauldrons, horned helmet, heater shield, longsword
 */
function buildWarlord(parent: THREE.Group) {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.25;

  // Legs & Boots
  const legGeo = new THREE.CylinderGeometry(0.2, 0.24, 1.2, 6);
  const leftLeg = new THREE.Mesh(legGeo, darkPlateMat);
  leftLeg.position.set(-0.35, 0.6, 0);
  const rightLeg = new THREE.Mesh(legGeo, darkPlateMat);
  rightLeg.position.set(0.35, 0.6, 0);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso / Cuirass
  const torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.6);
  const torso = new THREE.Mesh(torsoGeo, ironArmorMat);
  torso.position.y = 1.6;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Golden Breastplate Insignia
  const crestGeo = new THREE.BoxGeometry(0.5, 0.6, 0.08);
  const crest = new THREE.Mesh(crestGeo, goldTrimMat);
  crest.position.set(0, 1.65, 0.32);
  bodyGroup.add(crest);

  // Pauldrons (Spiked Shoulder Guards)
  const pauldronGeo = new THREE.ConeGeometry(0.35, 0.5, 5);
  pauldronGeo.rotateZ(Math.PI);
  const leftPauldron = new THREE.Mesh(pauldronGeo, ironArmorMat);
  leftPauldron.position.set(-0.65, 2.05, 0);
  const rightPauldron = new THREE.Mesh(pauldronGeo, ironArmorMat);
  rightPauldron.position.set(0.65, 2.05, 0);
  bodyGroup.add(leftPauldron, rightPauldron);

  // Helmet with Horned / Lion Crest
  const headGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const head = new THREE.Mesh(headGeo, ironArmorMat);
  head.position.y = 2.45;
  head.castShadow = true;
  bodyGroup.add(head);

  const crestPlumeGeo = new THREE.BoxGeometry(0.12, 0.5, 0.6);
  const crestPlume = new THREE.Mesh(crestPlumeGeo, crimsonCapeMat);
  crestPlume.position.set(0, 2.8, 0);
  bodyGroup.add(crestPlume);

  // Flowing Crimson Cape
  const capeGeo = new THREE.PlaneGeometry(0.9, 1.8, 4, 4);
  const capeMesh = new THREE.Mesh(capeGeo, crimsonCapeMat);
  capeMesh.position.set(0, 1.3, -0.35);
  capeMesh.rotation.x = 0.15;
  bodyGroup.add(capeMesh);

  // Longsword in Right Hand
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.7, 1.4, 0.2);

  const swordHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), goldTrimMat);
  swordHilt.position.y = 0.2;
  weaponPivot.add(swordHilt);

  const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.1), goldTrimMat);
  swordGuard.position.y = 0.4;
  weaponPivot.add(swordGuard);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.04), bladeSilverMat);
  blade.position.y = 1.2;
  blade.castShadow = true;
  weaponPivot.add(blade);

  bodyGroup.add(weaponPivot);

  // Shield on Left Arm
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.8), crimsonCapeMat);
  shield.position.set(-0.7, 1.6, 0.3);
  const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.85), goldTrimMat);
  shieldRim.position.copy(shield.position);
  bodyGroup.add(shield, shieldRim);

  parent.add(bodyGroup);
  return { weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup };
}

/**
 * 2. GUARDIAN: Alden the Valiant / Margaret Stonecrest
 * Polished gold-embossed plate, sun-crested grand tower shield, bastion spear
 */
function buildGuardian(parent: THREE.Group) {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.25;

  // Legs in Heavy Steel Greaves
  const legGeo = new THREE.CylinderGeometry(0.24, 0.26, 1.2, 6);
  const leftLeg = new THREE.Mesh(legGeo, guardianBlueMat);
  leftLeg.position.set(-0.35, 0.6, 0);
  const rightLeg = new THREE.Mesh(legGeo, guardianBlueMat);
  rightLeg.position.set(0.35, 0.6, 0);
  bodyGroup.add(leftLeg, rightLeg);

  // Heavy Cuirass
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.7), guardianBlueMat);
  torso.position.y = 1.65;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Sun-forged chest medallion
  const sunMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8), goldTrimMat);
  sunMedallion.rotation.x = Math.PI / 2;
  sunMedallion.position.set(0, 1.7, 0.37);
  bodyGroup.add(sunMedallion);

  // Winged Helmet Visor
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), guardianBlueMat);
  head.position.y = 2.5;
  bodyGroup.add(head);

  const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), goldTrimMat);
  wingLeft.position.set(-0.4, 2.7, -0.1);
  wingLeft.rotation.z = -0.3;
  const wingRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), goldTrimMat);
  wingRight.position.set(0.4, 2.7, -0.1);
  wingRight.rotation.z = 0.3;
  bodyGroup.add(wingLeft, wingRight);

  // Royal Mantle Cape
  const capeGeo = new THREE.PlaneGeometry(1.0, 1.9, 4, 4);
  const capeMesh = new THREE.Mesh(capeGeo, guardianBlueMat);
  capeMesh.position.set(0, 1.4, -0.4);
  capeMesh.rotation.x = 0.12;
  bodyGroup.add(capeMesh);

  // Massive Tower Shield
  const towerShield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 1.0), darkPlateMat);
  towerShield.position.set(-0.7, 1.4, 0.4);
  const sunInlay = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 8), goldTrimMat);
  sunInlay.rotation.z = Math.PI / 2;
  sunInlay.position.copy(towerShield.position);
  bodyGroup.add(towerShield, sunInlay);

  // Bastion Spear in Right Hand
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.7, 1.4, 0.2);

  const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), darkPlateMat);
  spearShaft.position.y = 1.0;
  weaponPivot.add(spearShaft);

  const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 4), bladeSilverMat);
  spearHead.position.y = 2.5;
  weaponPivot.add(spearHead);

  bodyGroup.add(weaponPivot);

  parent.add(bodyGroup);
  return { weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup };
}

/**
 * 3. RANGER: Elena Swiftbow / Thorne Shadowstalker
 * Hooded cowl, leather jerkin, recurve longbow, quiver on back, swift boots
 */
function buildRanger(parent: THREE.Group) {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.25;

  // Swift Boots
  const legGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.2, 6);
  const leftLeg = new THREE.Mesh(legGeo, rangerLeatherMat);
  leftLeg.position.set(-0.3, 0.6, 0);
  const rightLeg = new THREE.Mesh(legGeo, rangerLeatherMat);
  rightLeg.position.set(0.3, 0.6, 0);
  bodyGroup.add(leftLeg, rightLeg);

  // Leather Doublet with Forest Green Tunic
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.55), rangerGreenMat);
  torso.position.y = 1.55;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Leather shoulder strap
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.6), rangerLeatherMat);
  strap.position.set(0, 1.6, 0);
  strap.rotation.z = 0.6;
  bodyGroup.add(strap);

  // Hooded Cowl / Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), skinMat);
  head.position.y = 2.4;
  bodyGroup.add(head);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 6), rangerGreenMat);
  hood.position.set(0, 2.55, -0.05);
  hood.rotation.x = -0.2;
  bodyGroup.add(hood);

  // Quiver with Arrows on Back
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.2, 6), rangerLeatherMat);
  quiver.position.set(0.2, 1.7, -0.38);
  quiver.rotation.z = -0.3;
  bodyGroup.add(quiver);

  // Short Forester Cape
  const capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), rangerGreenMat);
  capeMesh.position.set(0, 1.3, -0.32);
  capeMesh.rotation.x = 0.15;
  bodyGroup.add(capeMesh);

  // Recurve Longbow in Left Hand
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(-0.65, 1.4, 0.2);

  const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 5, 12, Math.PI * 0.9), rangerLeatherMat);
  bowCurve.rotation.y = Math.PI / 2;
  bowCurve.position.y = 0.5;
  weaponPivot.add(bowCurve);

  bodyGroup.add(weaponPivot);

  parent.add(bodyGroup);
  return { weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup };
}

/**
 * 4. STEWARD: Rodrick Ironwall / Cedric Pennyworth
 * Regal purple merchant robes, gold chain of office, royal ledger and realm keys
 */
function buildSteward(parent: THREE.Group) {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.25;

  // Robes Floor Skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 1.3, 8), stewardRobesMat);
  skirt.position.y = 0.65;
  bodyGroup.add(skirt);

  // Upper Robe / Tunic
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.6), stewardRobesMat);
  torso.position.y = 1.6;
  bodyGroup.add(torso);

  // Gold Chain of Office Medallion
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 16), stewardGoldMat);
  chain.position.set(0, 1.7, 0.32);
  bodyGroup.add(chain);

  // Head with Velvet Cap
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), skinMat);
  head.position.y = 2.4;
  bodyGroup.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), stewardRobesMat);
  cap.position.y = 2.65;
  bodyGroup.add(cap);

  // Royal Ledger in Left Hand
  const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.15), stewardGoldMat);
  ledger.position.set(-0.6, 1.35, 0.25);
  ledger.rotation.z = -0.3;
  bodyGroup.add(ledger);

  // Key of the Realm in Right Hand
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.6, 1.35, 0.25);
  const keyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), goldTrimMat);
  keyStem.position.y = 0.3;
  weaponPivot.add(keyStem);
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), goldTrimMat);
  keyRing.position.y = 0.6;
  weaponPivot.add(keyRing);
  bodyGroup.add(weaponPivot);

  parent.add(bodyGroup);
  return { weaponPivot, capeMesh: null, leftLeg: null, rightLeg: null, bodyGroup };
}

/**
 * 5. STRATEGIST: Vivian Gray / Aurelius Mindweaver
 * High commander helm with plume, tactical command standard, royal star mantle
 */
function buildStrategist(parent: THREE.Group) {
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.25;

  // Armored legs
  const legGeo = new THREE.CylinderGeometry(0.2, 0.22, 1.2, 6);
  const leftLeg = new THREE.Mesh(legGeo, strategistNavyMat);
  leftLeg.position.set(-0.32, 0.6, 0);
  const rightLeg = new THREE.Mesh(legGeo, strategistNavyMat);
  rightLeg.position.set(0.32, 0.6, 0);
  bodyGroup.add(leftLeg, rightLeg);

  // Commander Cuirass
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.6), strategistNavyMat);
  torso.position.y = 1.6;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Royal Tactical Star Emblem
  const starEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), goldTrimMat);
  starEmblem.position.set(0, 1.7, 0.35);
  bodyGroup.add(starEmblem);

  // High Commander Visor & Plume
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), ironArmorMat);
  head.position.y = 2.45;
  bodyGroup.add(head);

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 5), goldTrimMat);
  plume.position.set(0, 2.9, -0.05);
  plume.rotation.x = -0.3;
  bodyGroup.add(plume);

  // Royal Mantle
  const capeGeo = new THREE.PlaneGeometry(0.95, 1.8);
  const capeMesh = new THREE.Mesh(capeGeo, strategistNavyMat);
  capeMesh.position.set(0, 1.35, -0.36);
  capeMesh.rotation.x = 0.14;
  bodyGroup.add(capeMesh);

  // High Command Battle Standard
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.7, 1.3, 0.2);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), darkPlateMat);
  pole.position.y = 1.2;
  weaponPivot.add(pole);

  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 4), goldTrimMat);
  spearTip.position.y = 2.9;
  weaponPivot.add(spearTip);

  const standardFlag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), goldTrimMat);
  standardFlag.position.set(0.6, 2.3, 0);
  weaponPivot.add(standardFlag);

  bodyGroup.add(weaponPivot);

  parent.add(bodyGroup);
  return { weaponPivot, capeMesh, leftLeg, rightLeg, bodyGroup };
}
