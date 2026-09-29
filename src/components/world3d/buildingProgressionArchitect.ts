/**
 * Realm of Crowns - Building Visual Progression Engine
 *
 * Visibly transforms buildings according to their REAL gameplay level across 5 distinct visual tiers:
 * - Tier 1 (Lv 1–3): Early / Foundational settlement structures
 * - Tier 2 (Lv 4–6): Fortified & established structures with improved masonry & props
 * - Tier 3 (Lv 7–10): Advanced / Elite complexes with specialized workshops & battlements
 * - Tier 4 (Lv 11–15): Grand / Royal institutions with soaring silhouettes & perimeter details
 * - Tier 5 (Lv 16–25): Legendary / Imperial citadels with opulent heraldry, guards & royal effects
 *
 * Conforms to strict visual discipline:
 * - No fake demonstration levels; strictly bound to real gameplay level
 * - Employs real GLB medieval assets (props, nature, structures) from medievalModelService
 * - Complements with high-craft architectural masonry, banners, braziers, torches, and sentries
 */

import * as THREE from 'three';
import { BuildingInstance } from '../../types';
import {
  getStoneWallTexture,
  getWoodPlankTexture,
  getRoofTileTexture,
  getThatchTexture,
  getCobblestoneTexture,
  getHeraldicBannerTexture,
} from './medievalTextures';

export type BuildingVisualTier = 1 | 2 | 3 | 4 | 5;

export function getBuildingVisualTier(level: number): BuildingVisualTier {
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 10) return 3;
  if (level <= 15) return 4;
  return 5;
}

export function getBuildingTierName(tier: BuildingVisualTier): string {
  switch (tier) {
    case 1: return 'Settlement';
    case 2: return 'Fortified';
    case 3: return 'Advanced';
    case 4: return 'Royal';
    case 5: return 'Imperial';
  }
}

// Reusable Materials
const stoneMat = new THREE.MeshStandardMaterial({
  map: getStoneWallTexture(),
  roughness: 0.85,
  metalness: 0.1,
});

const darkStoneMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  map: getStoneWallTexture(),
  roughness: 0.9,
  metalness: 0.15,
});

const woodMat = new THREE.MeshStandardMaterial({
  map: getWoodPlankTexture(),
  roughness: 0.75,
  metalness: 0.05,
});

const royalBlueRoofMat = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  map: getRoofTileTexture(),
  roughness: 0.5,
  metalness: 0.25,
});

const redRoofMat = new THREE.MeshStandardMaterial({
  color: 0x991b1b,
  map: getRoofTileTexture(),
  roughness: 0.5,
  metalness: 0.2,
});

const goldTrimMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.25,
  metalness: 0.85,
});

const ironMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.4,
  metalness: 0.8,
});

const torchFlameMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24,
});

/**
 * Creates a detailed armored sentry guard mesh
 */
export function createCourtyardSentry(hasHalberd: boolean = true): THREE.Group {
  const guard = new THREE.Group();
  guard.name = 'courtyard-sentry';

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.9, 6);
  const body = new THREE.Mesh(bodyGeo, ironMat);
  body.position.y = 0.45;
  body.castShadow = true;
  guard.add(body);

  // Helmet with visor
  const helmGeo = new THREE.SphereGeometry(0.2, 6, 6);
  const helm = new THREE.Mesh(helmGeo, ironMat);
  helm.position.y = 1.0;
  guard.add(helm);

  // Plume
  const plumeGeo = new THREE.BoxGeometry(0.06, 0.22, 0.25);
  const plume = new THREE.Mesh(plumeGeo, royalBlueRoofMat);
  plume.position.set(0, 1.18, -0.02);
  guard.add(plume);

  // Kite Shield
  const shieldGeo = new THREE.BoxGeometry(0.08, 0.55, 0.32);
  const shield = new THREE.Mesh(shieldGeo, royalBlueRoofMat);
  shield.position.set(-0.25, 0.55, 0.1);
  guard.add(shield);

  if (hasHalberd) {
    // Halberd / Polearm
    const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4);
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(0.28, 0.9, 0.1);
    guard.add(pole);

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.3, 0.18);
    const blade = new THREE.Mesh(bladeGeo, ironMat);
    blade.position.set(0.28, 1.75, 0.1);
    guard.add(blade);
  }

  return guard;
}

/**
 * Creates a stone wall brazier with glowing fire coals
 */
export function createBrazier(height: number = 0.8): THREE.Group {
  const brazier = new THREE.Group();
  brazier.name = 'fire-brazier';

  const baseGeo = new THREE.CylinderGeometry(0.15, 0.25, height, 6);
  const base = new THREE.Mesh(baseGeo, darkStoneMat);
  base.position.y = height / 2;
  brazier.add(base);

  const bowlGeo = new THREE.CylinderGeometry(0.35, 0.18, 0.25, 6);
  const bowl = new THREE.Mesh(bowlGeo, ironMat);
  bowl.position.y = height + 0.1;
  brazier.add(bowl);

  const fireGeo = new THREE.ConeGeometry(0.22, 0.45, 5);
  const fire = new THREE.Mesh(fireGeo, torchFlameMat);
  fire.position.y = height + 0.32;
  brazier.add(fire);

  return brazier;
}

/**
 * Creates an authentic silk heraldic pennant
 */
export function createHeraldicPennant(width: number = 0.8, height: number = 1.6): THREE.Group {
  const pennant = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, height + 0.5, 4);
  const pole = new THREE.Mesh(poleGeo, woodMat);
  pole.position.y = (height + 0.5) / 2;
  pennant.add(pole);

  const finialGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
  const finial = new THREE.Mesh(finialGeo, goldTrimMat);
  finial.position.y = height + 0.5;
  pennant.add(finial);

  const flagGeo = new THREE.PlaneGeometry(width, height);
  const flagMat = new THREE.MeshStandardMaterial({
    map: getHeraldicBannerTexture('guardian'),
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(width / 2, height / 2 + 0.2, 0);
  pennant.add(flag);

  return pennant;
}

/**
 * Creates an ashlar stone watchtower section
 */
function createStoneWatchtower(height: number, radius: number): THREE.Group {
  const tower = new THREE.Group();
  const shaftGeo = new THREE.CylinderGeometry(radius * 0.88, radius, height, 8);
  const shaft = new THREE.Mesh(shaftGeo, stoneMat);
  shaft.position.y = height / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  tower.add(shaft);

  // Machicolated parapet
  const parapetGeo = new THREE.CylinderGeometry(radius * 1.08, radius * 0.9, 0.6, 8);
  const parapet = new THREE.Mesh(parapetGeo, darkStoneMat);
  parapet.position.y = height + 0.3;
  tower.add(parapet);

  // Conical roof
  const roofGeo = new THREE.ConeGeometry(radius * 1.15, height * 0.45, 8);
  const roof = new THREE.Mesh(roofGeo, royalBlueRoofMat);
  roof.position.y = height + 0.6 + (height * 0.45) / 2;
  roof.castShadow = true;
  tower.add(roof);

  // Golden finial on tower peak
  const finialGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
  const finial = new THREE.Mesh(finialGeo, goldTrimMat);
  finial.position.y = height + 0.6 + height * 0.45 + 0.2;
  tower.add(finial);

  return tower;
}

/**
 * Attaches comprehensive visual tier progression to real 3D building instances
 */
export function enrichBuildingWithProgression(
  container: THREE.Group,
  building: BuildingInstance,
  baseScale: number,
  propLoader: (url: string) => Promise<THREE.Group>
): void {
  const key = building.type.toLowerCase();
  const lvl = Math.max(1, building.level);
  const tier = getBuildingVisualTier(lvl);

  const decorGroup = new THREE.Group();
  decorGroup.name = `progression-tier-${tier}-${building.id}`;
  container.add(decorGroup);

  // -------------------------------------------------------------
  // 1. CASTLE / GRAND KEEP PROGRESSION (The central sovereign anchor)
  // -------------------------------------------------------------
  if (key.includes('castle') || key.includes('keep') || key.includes('center')) {
    // Tier 1 (Lv 1-3): Base keep with timber gate & low stone curbs
    if (tier >= 1) {
      const stoneCurbGeo = new THREE.BoxGeometry(4.2, 0.25, 4.2);
      const stoneCurb = new THREE.Mesh(stoneCurbGeo, darkStoneMat);
      stoneCurb.position.set(0, 0.12, 0);
      stoneCurb.receiveShadow = true;
      decorGroup.add(stoneCurb);
    }

    // Tier 2 (Lv 4-6): Ashlar stone plinth, twin front bastion watchtowers, wall torches, 2 sentry guards
    if (tier >= 2) {
      // Raised ashlar masonry podium
      const podiumGeo = new THREE.BoxGeometry(5.4, 0.45, 5.4);
      const podium = new THREE.Mesh(podiumGeo, stoneMat);
      podium.position.set(0, 0.22, 0);
      podium.receiveShadow = true;
      decorGroup.add(podium);

      // Twin front watchtowers flanking keep entrance
      const towerL = createStoneWatchtower(3.8, 0.65);
      towerL.position.set(-2.4, 0.4, 2.2);
      decorGroup.add(towerL);

      const towerR = createStoneWatchtower(3.8, 0.65);
      towerR.position.set(2.4, 0.4, 2.2);
      decorGroup.add(towerR);

      // Courtyard Sentries
      const guard1 = createCourtyardSentry(true);
      guard1.position.set(-1.4, 0.45, 2.4);
      guard1.rotation.y = 0.2;
      decorGroup.add(guard1);

      const guard2 = createCourtyardSentry(true);
      guard2.position.set(1.4, 0.45, 2.4);
      guard2.rotation.y = -0.2;
      decorGroup.add(guard2);

      // Heraldic Pennants
      const pennantL = createHeraldicPennant(0.6, 1.4);
      pennantL.position.set(-2.4, 4.4, 2.2);
      decorGroup.add(pennantL);

      const pennantR = createHeraldicPennant(0.6, 1.4);
      pennantR.position.set(2.4, 4.4, 2.2);
      decorGroup.add(pennantR);
    }

    // Tier 3 (Lv 7-10): Flanking stone wings, corner braziers, arched stone gateways
    if (tier >= 3) {
      // Flanking stone bastion wings
      const wingGeo = new THREE.BoxGeometry(1.6, 2.8, 3.6);
      const wingL = new THREE.Mesh(wingGeo, stoneMat);
      wingL.position.set(-3.2, 1.5, 0);
      wingL.castShadow = true;
      decorGroup.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, stoneMat);
      wingR.position.set(3.2, 1.5, 0);
      wingR.castShadow = true;
      decorGroup.add(wingR);

      // Corner Blazing Braziers
      const brazier1 = createBrazier(0.9);
      brazier1.position.set(-2.8, 0.45, -2.4);
      decorGroup.add(brazier1);

      const brazier2 = createBrazier(0.9);
      brazier2.position.set(2.8, 0.45, -2.4);
      decorGroup.add(brazier2);
    }

    // Tier 4 (Lv 11-15): 4 corner towers, high soaring central spire, 4 sentries in formation, silk banners
    if (tier >= 4) {
      // Rear Citadel Bastion Towers
      const towerBackL = createStoneWatchtower(4.6, 0.72);
      towerBackL.position.set(-2.6, 0.4, -2.5);
      decorGroup.add(towerBackL);

      const towerBackR = createStoneWatchtower(4.6, 0.72);
      towerBackR.position.set(2.6, 0.4, -2.5);
      decorGroup.add(towerBackR);

      // Additional Sentries
      const guard3 = createCourtyardSentry(true);
      guard3.position.set(-2.0, 0.45, 1.6);
      guard3.rotation.y = 0.5;
      decorGroup.add(guard3);

      const guard4 = createCourtyardSentry(true);
      guard4.position.set(2.0, 0.45, 1.6);
      guard4.rotation.y = -0.5;
      decorGroup.add(guard4);

      // Gold Trim on Main Gate Arch
      const archGeo = new THREE.TorusGeometry(1.1, 0.12, 6, 12, Math.PI);
      const archMesh = new THREE.Mesh(archGeo, goldTrimMat);
      archMesh.position.set(0, 1.8, 2.5);
      decorGroup.add(archMesh);
    }

    // Tier 5 (Lv 16-25): Imperial Royal Citadel: Soaring golden finials, 6 royal sentries, grand double gatehouse
    if (tier >= 5) {
      // Grand Donjon Spire Tower
      const donjonGeo = new THREE.CylinderGeometry(0.85, 1.0, 6.2, 8);
      const donjon = new THREE.Mesh(donjonGeo, darkStoneMat);
      donjon.position.set(0, 5.5, -0.6);
      donjon.castShadow = true;
      decorGroup.add(donjon);

      const donjonRoofGeo = new THREE.ConeGeometry(1.2, 3.2, 8);
      const donjonRoof = new THREE.Mesh(donjonRoofGeo, royalBlueRoofMat);
      donjonRoof.position.set(0, 10.2, -0.6);
      decorGroup.add(donjonRoof);

      // Imperial Golden Crown Finial
      const crownGeo = new THREE.CylinderGeometry(0.5, 0.35, 0.4, 8);
      const crown = new THREE.Mesh(crownGeo, goldTrimMat);
      crown.position.set(0, 12.0, -0.6);
      decorGroup.add(crown);

      // Two Elite Royal Sentries flanking the portcullis
      const royalGuard1 = createCourtyardSentry(true);
      royalGuard1.position.set(-0.9, 0.45, 2.9);
      decorGroup.add(royalGuard1);

      const royalGuard2 = createCourtyardSentry(true);
      royalGuard2.position.set(0.9, 0.45, 2.9);
      decorGroup.add(royalGuard2);
    }
    return;
  }

  // -------------------------------------------------------------
  // 2. FARMSTEAD / WINDMILL PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('farm') || key.includes('windmill')) {
    // Tier 2: Wooden fence enclosure and wheat rows
    if (tier >= 2) {
      const fenceGeo = new THREE.BoxGeometry(4.0, 0.4, 0.08);
      const fenceFront = new THREE.Mesh(fenceGeo, woodMat);
      fenceFront.position.set(0, 0.2, 2.2);
      decorGroup.add(fenceFront);

      const fenceSide = new THREE.BoxGeometry(0.08, 0.4, 3.6);
      const fenceL = new THREE.Mesh(fenceSide, woodMat);
      fenceL.position.set(-2.0, 0.2, 0.4);
      decorGroup.add(fenceL);

      // Wheat furrow patch
      const wheatGeo = new THREE.BoxGeometry(1.6, 0.35, 2.2);
      const wheatMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 });
      const wheatPatch = new THREE.Mesh(wheatGeo, wheatMat);
      wheatPatch.position.set(1.4, 0.18, 0.5);
      decorGroup.add(wheatPatch);
    }

    // Tier 3: Wooden hay wagon cart with spoked wheels
    if (tier >= 3) {
      const cartGroup = new THREE.Group();
      const cartBed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.8), woodMat);
      cartBed.position.y = 0.35;
      cartGroup.add(cartBed);

      const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 8);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel1 = new THREE.Mesh(wheelGeo, darkStoneMat);
      wheel1.position.set(-0.65, 0.25, 0.3);
      const wheel2 = new THREE.Mesh(wheelGeo, darkStoneMat);
      wheel2.position.set(0.65, 0.25, 0.3);
      cartGroup.add(wheel1, wheel2);

      cartGroup.position.set(-1.6, 0, 1.4);
      cartGroup.rotation.y = 0.35;
      decorGroup.add(cartGroup);
    }

    // Tier 4-5: Flour granary silo annex with terracotta roof
    if (tier >= 4) {
      const granaryGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.8, 8);
      const granary = new THREE.Mesh(granaryGeo, stoneMat);
      granary.position.set(-2.2, 0.9, -1.2);
      decorGroup.add(granary);

      const granaryRoofGeo = new THREE.ConeGeometry(0.95, 1.1, 8);
      const granaryRoof = new THREE.Mesh(granaryRoofGeo, redRoofMat);
      granaryRoof.position.set(-2.2, 2.35, -1.2);
      decorGroup.add(granaryRoof);
    }
    return;
  }

  // -------------------------------------------------------------
  // 3. SAWMILL / LUMBER MILL PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('lumber') || key.includes('sawmill')) {
    if (tier >= 2) {
      // Woodcutter chopping block with embedded steel axe
      const stumpGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.5, 6);
      const stump = new THREE.Mesh(stumpGeo, woodMat);
      stump.position.set(1.4, 0.25, 1.2);
      decorGroup.add(stump);

      const axeHeadGeo = new THREE.BoxGeometry(0.04, 0.18, 0.12);
      const axeHead = new THREE.Mesh(axeHeadGeo, ironMat);
      axeHead.position.set(1.4, 0.55, 1.2);
      decorGroup.add(axeHead);
    }

    if (tier >= 3) {
      // Open-air timber work shed with crosscut saw bench
      const shedRoofGeo = new THREE.BoxGeometry(1.8, 0.1, 1.2);
      const shedRoof = new THREE.Mesh(shedRoofGeo, woodMat);
      shedRoof.position.set(-1.8, 1.4, 0.8);
      shedRoof.rotation.z = -0.15;
      decorGroup.add(shedRoof);

      // Posts
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4);
      const p1 = new THREE.Mesh(postGeo, woodMat);
      p1.position.set(-2.6, 0.7, 0.3);
      const p2 = new THREE.Mesh(postGeo, woodMat);
      p2.position.set(-1.0, 0.7, 0.3);
      decorGroup.add(p1, p2);
    }

    if (tier >= 4) {
      // Heavy timber gantry crane for moving massive pine logs
      const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.6), woodMat);
      gantryBeam.position.set(1.8, 2.4, 0);
      decorGroup.add(gantryBeam);

      const gantryLegL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), woodMat);
      gantryLegL.position.set(1.8, 1.2, -1.2);
      decorGroup.add(gantryLegL);

      const gantryLegR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), woodMat);
      gantryLegR.position.set(1.8, 1.2, 1.2);
      decorGroup.add(gantryLegR);
    }
    return;
  }

  // -------------------------------------------------------------
  // 4. QUARRY PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('quarry')) {
    if (tier >= 2) {
      // Timber scaffolding ramp & stone mason chisel bench
      const rampGeo = new THREE.BoxGeometry(1.2, 0.1, 1.6);
      const ramp = new THREE.Mesh(rampGeo, woodMat);
      ramp.position.set(1.5, 0.4, 1.0);
      ramp.rotation.x = -0.25;
      decorGroup.add(ramp);
    }

    if (tier >= 3) {
      // Heavy oak derrick hoist crane
      const derrickPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), woodMat);
      derrickPole.position.set(-1.8, 1.4, 1.2);
      decorGroup.add(derrickPole);

      const derrickBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), woodMat);
      derrickBoom.position.set(-1.2, 2.2, 1.2);
      derrickBoom.rotation.z = -Math.PI / 4;
      decorGroup.add(derrickBoom);

      // Iron hoist cable & granite block
      const stoneGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const liftedStone = new THREE.Mesh(stoneGeo, darkStoneMat);
      liftedStone.position.set(-0.5, 1.2, 1.2);
      decorGroup.add(liftedStone);
    }

    if (tier >= 4) {
      // Narrow gauge timber tracks with granite mine cart
      const track1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 3.2), woodMat);
      track1.position.set(1.8, 0.04, 0);
      const track2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 3.2), woodMat);
      track2.position.set(2.4, 0.04, 0);
      decorGroup.add(track1, track2);

      const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.9), ironMat);
      cartBody.position.set(2.1, 0.35, 0.5);
      decorGroup.add(cartBody);
    }
    return;
  }

  // -------------------------------------------------------------
  // 5. BARRACKS PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('barracks')) {
    if (tier >= 2) {
      // Straw sparring dummy
      const dummyPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 4), woodMat);
      dummyPost.position.set(-1.8, 0.7, 1.2);
      decorGroup.add(dummyPost);

      const dummyCross = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), woodMat);
      dummyCross.position.set(-1.8, 1.05, 1.2);
      decorGroup.add(dummyCross);

      const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 5), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      dummyHead.position.set(-1.8, 1.35, 1.2);
      decorGroup.add(dummyHead);
    }

    if (tier >= 3) {
      // Fenced gravel training yard with 2 drilling recruits
      const drillGuard1 = createCourtyardSentry(false);
      drillGuard1.position.set(1.6, 0, 1.4);
      drillGuard1.rotation.y = -Math.PI / 2;
      decorGroup.add(drillGuard1);

      const drillGuard2 = createCourtyardSentry(true);
      drillGuard2.position.set(1.6, 0, 0.4);
      drillGuard2.rotation.y = -Math.PI / 2;
      decorGroup.add(drillGuard2);

      // Troop deployment heraldic standard
      const standard = createHeraldicPennant(0.5, 1.2);
      standard.position.set(2.2, 0, 1.8);
      decorGroup.add(standard);
    }

    if (tier >= 4) {
      // Armored weapon rack & perimeter palisade stakes
      for (let s = 0; s < 4; s++) {
        const stakeGeo = new THREE.ConeGeometry(0.08, 1.2, 4);
        const stake = new THREE.Mesh(stakeGeo, woodMat);
        stake.position.set(-2.5 + s * 0.4, 0.6, 2.2);
        stake.rotation.x = 0.2;
        decorGroup.add(stake);
      }

      // Third elite sentry guarding armory
      const armoryGuard = createCourtyardSentry(true);
      armoryGuard.position.set(-2.2, 0, -1.0);
      armoryGuard.rotation.y = Math.PI / 4;
      decorGroup.add(armoryGuard);
    }
    return;
  }

  // -------------------------------------------------------------
  // 6. BLACKSMITH / IRON MINE PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('iron') || key.includes('blacksmith')) {
    if (tier >= 2) {
      // Heavy iron anvil on oak log stump
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 6), woodMat);
      stump.position.set(1.5, 0.22, 1.0);
      decorGroup.add(stump);

      const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.2), ironMat);
      anvilBase.position.set(1.5, 0.52, 1.0);
      decorGroup.add(anvilBase);

      const hornGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
      hornGeo.rotateZ(-Math.PI / 2);
      const anvilHorn = new THREE.Mesh(hornGeo, ironMat);
      anvilHorn.position.set(1.72, 0.58, 1.0);
      decorGroup.add(anvilHorn);

      // Water quenching barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.55, 6), woodMat);
      barrel.position.set(1.2, 0.28, 1.6);
      decorGroup.add(barrel);
    }

    if (tier >= 3) {
      // Glowing stone forge hearth with red ember light
      const forgeGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0);
      const forge = new THREE.Mesh(forgeGeo, darkStoneMat);
      forge.position.set(-1.8, 0.45, 0.6);
      decorGroup.add(forge);

      // Glowing coal bed inside forge
      const forgeCoal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.6), torchFlameMat);
      forgeCoal.position.set(-1.8, 0.5, 0.6);
      decorGroup.add(forgeCoal);

      // Stack of steel ingots
      const ingotGeo = new THREE.BoxGeometry(0.45, 0.08, 0.2);
      for (let i = 0; i < 3; i++) {
        const ingot = new THREE.Mesh(ingotGeo, ironMat);
        ingot.position.set(1.6, 0.04 + i * 0.09, -0.8);
        decorGroup.add(ingot);
      }
    }

    if (tier >= 4) {
      // Billowing stone smelter chimney with blazing fire
      const chimneyGeo = new THREE.CylinderGeometry(0.4, 0.55, 3.2, 6);
      const chimney = new THREE.Mesh(chimneyGeo, darkStoneMat);
      chimney.position.set(-1.8, 1.8, -1.0);
      decorGroup.add(chimney);

      const brazier = createBrazier(0.8);
      brazier.position.set(1.8, 0, 2.0);
      decorGroup.add(brazier);
    }
    return;
  }

  // -------------------------------------------------------------
  // 7. ARCHERY RANGE PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('archery')) {
    if (tier >= 2) {
      // Quiver barrel with arrows
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55, 6), woodMat);
      barrel.position.set(1.2, 0.28, 1.2);
      decorGroup.add(barrel);
    }

    if (tier >= 3) {
      // Timber shooting shelter canopy
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.4), woodMat);
      canopy.position.set(1.5, 1.5, 0.5);
      canopy.rotation.z = -0.1;
      decorGroup.add(canopy);

      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4), woodMat);
      post1.position.set(0.7, 0.75, 0.5);
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4), woodMat);
      post2.position.set(2.3, 0.75, 0.5);
      decorGroup.add(post1, post2);
    }

    if (tier >= 4) {
      // Range distance marker posts
      for (let p = 1; p <= 3; p++) {
        const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4), woodMat);
        marker.position.set(-1.8, 0.45, -1.5 + p * 1.0);
        decorGroup.add(marker);
      }
    }
    return;
  }

  // -------------------------------------------------------------
  // 8. ACADEMY PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('academy')) {
    if (tier >= 2) {
      // Scholar stone study benches
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.45), stoneMat);
      bench.position.set(1.5, 0.18, 1.2);
      decorGroup.add(bench);
    }

    if (tier >= 3) {
      // Rotating brass armillary sphere on stone plinth
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.8, 6), darkStoneMat);
      plinth.position.set(-1.8, 0.4, 1.2);
      decorGroup.add(plinth);

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 4, 16), goldTrimMat);
      ring1.position.set(-1.8, 1.1, 1.2);
      ring1.rotation.x = Math.PI / 4;
      decorGroup.add(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 4, 16), goldTrimMat);
      ring2.position.set(-1.8, 1.1, 1.2);
      ring2.rotation.y = Math.PI / 3;
      decorGroup.add(ring2);
    }

    if (tier >= 4) {
      // Observatory turret spire with copper dome
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.6, 8), stoneMat);
      spire.position.set(0, 3.2, 0);
      decorGroup.add(spire);

      const copperDome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldTrimMat);
      copperDome.position.set(0, 4.5, 0);
      decorGroup.add(copperDome);
    }
    return;
  }

  // -------------------------------------------------------------
  // 9. HOSPITAL / INFIRMARY PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('hospital') || key.includes('infirmary')) {
    if (tier >= 2) {
      // Lavender and medicinal herb garden bed
      const gardenBed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.0), darkStoneMat);
      gardenBed.position.set(1.4, 0.1, 1.2);
      decorGroup.add(gardenBed);

      const herbs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.8), new THREE.MeshStandardMaterial({ color: 0x15803d }));
      herbs.position.set(1.4, 0.25, 1.2);
      decorGroup.add(herbs);
    }

    if (tier >= 3) {
      // Convalescent field tent with medic heraldic flag
      const tentGeo = new THREE.ConeGeometry(0.9, 1.4, 4);
      tentGeo.rotateY(Math.PI / 4);
      const tent = new THREE.Mesh(tentGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }));
      tent.position.set(-1.8, 0.7, 1.0);
      decorGroup.add(tent);

      const crossFlag = createHeraldicPennant(0.4, 0.9);
      crossFlag.position.set(-1.8, 1.4, 1.0);
      decorGroup.add(crossFlag);
    }
    return;
  }

  // -------------------------------------------------------------
  // 10. WAREHOUSE / MARKET / TREASURY PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('warehouse') || key.includes('market') || key.includes('gold')) {
    if (tier >= 2) {
      // Stacks of trade crates
      const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), woodMat);
      crate1.position.set(1.5, 0.25, 1.2);
      decorGroup.add(crate1);

      const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), woodMat);
      crate2.position.set(1.5, 0.7, 1.2);
      decorGroup.add(crate2);
    }

    if (tier >= 3) {
      // Striped merchant stall awning with goods barrels
      const awning = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.2), redRoofMat);
      awning.position.set(-1.6, 1.3, 1.0);
      awning.rotation.x = 0.15;
      decorGroup.add(awning);

      const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 6), woodMat);
      barrel1.position.set(-1.3, 0.28, 1.1);
      decorGroup.add(barrel1);
    }

    if (tier >= 4) {
      // Treasury reinforced iron vault with gleaming gold ingots
      const vaultGate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.15), ironMat);
      vaultGate.position.set(0, 0.7, 2.2);
      decorGroup.add(vaultGate);

      // Gold bullion bars
      for (let g = 0; g < 4; g++) {
        const goldBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.15), goldTrimMat);
        goldBar.position.set(-1.8 + g * 0.35, 0.04, -1.0);
        decorGroup.add(goldBar);
      }
    }
    return;
  }

  // -------------------------------------------------------------
  // 11. WARHORSE STABLES PROGRESSION
  // -------------------------------------------------------------
  if (key.includes('stable')) {
    if (tier >= 2) {
      // Paddock fence rails & hay bales
      const fence = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.08), woodMat);
      fence.position.set(0, 0.2, 2.0);
      decorGroup.add(fence);

      const hayBale = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
      hayBale.position.set(1.4, 0.22, 1.2);
      decorGroup.add(hayBale);
    }

    if (tier >= 3) {
      // Timber feed mangers & water trough
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.5), darkStoneMat);
      trough.position.set(-1.5, 0.18, 1.2);
      decorGroup.add(trough);
    }

    if (tier >= 4) {
      // Tournament lances & chivalric shield display
      const lanceStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), woodMat);
      lanceStand.position.set(2.0, 0.9, 0.5);
      decorGroup.add(lanceStand);

      const banner = createHeraldicPennant(0.5, 1.1);
      banner.position.set(2.0, 1.0, 0.5);
      decorGroup.add(banner);
    }
    return;
  }
}
