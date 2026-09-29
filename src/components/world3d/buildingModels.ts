/**
 * 3D Fantasy Building and City Models (Performance & LOD Optimized)
 * Generates multi-tiered citadels, castles, battlements, walls, gatehouses, and district structures.
 * Supports distance-based LOD tiers ('city', 'region', 'world') to eliminate off-screen/far-draw costs.
 */

import * as THREE from 'three';
import { KingdomState } from '../../types';
import { medievalModelService } from './medievalModelService';

export interface City3DBundle {
  group: THREE.Group;
  keepMesh: THREE.Object3D;
  wallsGroup: THREE.Group;
  shieldMesh?: THREE.Mesh;
  districtBuildings: THREE.Group;
  updateAnimation?: (time: number) => void;
  setLOD: (tier: 'city' | 'region' | 'world') => void;
}

// Shared Fantasy Materials Cache to prevent multiple allocations
const stoneWallMat = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.8,
  metalness: 0.1,
  flatShading: true,
});

const darkStoneMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.85,
  metalness: 0.15,
  flatShading: true,
});

const royalBlueRoofMat = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  roughness: 0.4,
  metalness: 0.2,
  flatShading: true,
});

const redRoofMat = new THREE.MeshStandardMaterial({
  color: 0xb91c1c,
  roughness: 0.45,
  metalness: 0.15,
  flatShading: true,
});

const goldTrimMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.3,
  metalness: 0.8,
});

const woodTimberMat = new THREE.MeshStandardMaterial({
  color: 0x78350f,
  roughness: 0.9,
});

const torchGlowMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24,
});

/**
 * Creates Player Kingdom Capital Citadel with LOD support
 */
export function createPlayerCitadel(
  kingdom: KingdomState,
  shieldActive = false,
  isDetailed = true
): City3DBundle {
  const group = new THREE.Group();
  group.name = 'player-citadel';

  const castleLevel = kingdom.castleLevel || 1;

  // 1. Central Keep (High-tier Citadel Spire)
  const keepGroup = createFortifiedKeep(castleLevel, true);
  group.add(keepGroup);

  // 2. Outer Defensive Curtain Wall with 6 Bastion Towers & Grand Gatehouse
  const wallRadius = 11.5;
  const wallsGroup = createPerimeterWalls(wallRadius, castleLevel);
  group.add(wallsGroup);

  // 3. Specialized Internal Districts (Barracks, Farm, Lumber Mill, Quarry)
  const districtBuildings = new THREE.Group();
  districtBuildings.name = 'districts';

  if (isDetailed) {
    // Military District: Barracks
    const barracks = createBarracksBuilding();
    barracks.position.set(-5.5, 0, -5.5);
    districtBuildings.add(barracks);

    // Agriculture District: Farm & Windmill
    const farm = createFarmBuilding();
    farm.position.set(5.5, 0, -5.2);
    districtBuildings.add(farm);

    // Forestry District: Lumber Mill
    const lumber = createLumberBuilding();
    lumber.position.set(-5.8, 0, 4.8);
    districtBuildings.add(lumber);

    // Stonemason Workshop
    const stoneShop = createStoneWorkshop();
    stoneShop.position.set(5.5, 0, 5.0);
    districtBuildings.add(stoneShop);
  }

  group.add(districtBuildings);

  // 4. Cobblestone Citadel Plaza Base
  const basePlazaGeo = new THREE.CylinderGeometry(wallRadius + 1.2, wallRadius + 2.0, 0.4, 12);
  const basePlazaMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    flatShading: true,
  });
  const plaza = new THREE.Mesh(basePlazaGeo, basePlazaMat);
  plaza.position.y = 0.2;
  plaza.receiveShadow = true;
  group.add(plaza);

  // 5. Active Peace Shield (translucent energy dome)
  let shieldMesh: THREE.Mesh | undefined;
  if (shieldActive) {
    shieldMesh = createEnergyShieldDome(wallRadius + 3.2, 0x38bdf8);
    group.add(shieldMesh);
  }

  // 6. Animation Handler
  const updateAnimation = (time: number) => {
    if (shieldMesh) {
      shieldMesh.rotation.y = time * 0.2;
      (shieldMesh.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(time * 2) * 0.08;
    }
  };

  // 7. Distance-based LOD controller
  const setLOD = (tier: 'city' | 'region' | 'world') => {
    if (tier === 'world') {
      districtBuildings.visible = false;
      wallsGroup.visible = false;
      keepGroup.visible = true;
    } else if (tier === 'region') {
      districtBuildings.visible = false;
      wallsGroup.visible = true;
      keepGroup.visible = true;
    } else {
      districtBuildings.visible = true;
      wallsGroup.visible = true;
      keepGroup.visible = true;
    }
  };

  return {
    group,
    keepMesh: keepGroup,
    wallsGroup,
    shieldMesh,
    districtBuildings,
    updateAnimation,
    setLOD,
  };
}

/**
 * Creates a Rival Player Kingdom Castle with LOD support
 */
export function createRivalCastle(
  castleLevel: number,
  ownerName: string,
  shieldActive: boolean
): City3DBundle {
  const group = new THREE.Group();
  group.name = `rival-${ownerName}`;

  const districtBuildings = new THREE.Group();

  // Rival Keep with Crimson Roofs
  const keepGroup = createFortifiedKeep(castleLevel, false);
  group.add(keepGroup);

  // Wall perimeter
  const wallRadius = 11;
  const wallsGroup = createPerimeterWalls(wallRadius, castleLevel);
  group.add(wallsGroup);

  // Ground base
  const plazaGeo = new THREE.CylinderGeometry(wallRadius + 1, wallRadius + 1.8, 0.4, 12);
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.y = 0.2;
  plaza.receiveShadow = true;
  group.add(plaza);

  // Shield dome if active
  let shieldMesh: THREE.Mesh | undefined;
  if (shieldActive) {
    shieldMesh = createEnergyShieldDome(wallRadius + 2.5, 0xf59e0b);
    group.add(shieldMesh);
  }

  const updateAnimation = (time: number) => {
    if (shieldMesh) {
      shieldMesh.rotation.y = -time * 0.15;
    }
  };

  const setLOD = (tier: 'city' | 'region' | 'world') => {
    if (tier === 'world') {
      wallsGroup.visible = false;
    } else {
      wallsGroup.visible = true;
    }
  };

  return {
    group,
    keepMesh: keepGroup,
    wallsGroup,
    shieldMesh,
    districtBuildings,
    updateAnimation,
    setLOD,
  };
}

/**
 * Creates multi-tiered fantasy castle keep utilizing real GLB keep asset
 */
function createFortifiedKeep(level: number, isPlayer: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = isPlayer ? 'sovereign-keep' : 'rival-keep';
  const roofMat = isPlayer ? royalBlueRoofMat : redRoofMat;

  // 1. Procedural placeholder while GLB loads
  const placeholderGroup = new THREE.Group();
  placeholderGroup.name = 'keep-placeholder';

  const baseHeight = 4.5 + Math.min(level * 0.4, 3);
  const baseWidth = 5.5 + Math.min(level * 0.3, 2);
  const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth);
  const baseMesh = new THREE.Mesh(baseGeo, stoneWallMat);
  baseMesh.position.y = baseHeight / 2;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  placeholderGroup.add(baseMesh);

  const towerHeight = baseHeight + 3 + (level > 5 ? 2.5 : 0);
  const towerGeo = new THREE.CylinderGeometry(2, 2.3, towerHeight, 8);
  const towerMesh = new THREE.Mesh(towerGeo, darkStoneMat);
  towerMesh.position.y = towerHeight / 2;
  towerMesh.castShadow = true;
  placeholderGroup.add(towerMesh);

  const spireHeight = 4.5;
  const spireGeo = new THREE.ConeGeometry(2.6, spireHeight, 8);
  const spireMesh = new THREE.Mesh(spireGeo, roofMat);
  spireMesh.position.y = towerHeight + spireHeight / 2;
  spireMesh.castShadow = true;
  placeholderGroup.add(spireMesh);

  group.add(placeholderGroup);

  // 2. Real GLB Keep Integration
  const keepScale = isPlayer ? 4.8 + Math.min(level * 0.1, 1.2) : 3.8 + Math.min(level * 0.08, 0.8);
  medievalModelService
    .loadWorldAsset('keep', keepScale)
    .then((keepModel) => {
      // Offset keep so base sits cleanly on ground
      keepModel.position.set(0, 0, 0);
      placeholderGroup.visible = false;
      group.add(keepModel);
    })
    .catch((err) => {
      console.warn('[buildingModels] Fallback keep used:', err);
    });

  // 3. Royal / Warlord Banners & Majestic Crown Beacon for Player Citadel
  if (isPlayer) {
    // Sovereign Light Beacon
    const beaconGeo = new THREE.CylinderGeometry(0.3, 0.9, 45, 12);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 22.5, 0);
    group.add(beacon);

    // Golden Floating Crown Crest
    const crownGeo = new THREE.CylinderGeometry(1.4, 1.0, 0.7, 8);
    const crownMesh = new THREE.Mesh(crownGeo, goldTrimMat);
    crownMesh.position.set(0, 19.5, 0);
    group.add(crownMesh);

    // Royal Banner
    const bannerPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 4);
    const bannerPole = new THREE.Mesh(bannerPoleGeo, goldTrimMat);
    bannerPole.position.set(0, 19.5, 0);
    group.add(bannerPole);

    const bannerFlagGeo = new THREE.BoxGeometry(2.0, 1.2, 0.06);
    const bannerFlag = new THREE.Mesh(bannerFlagGeo, royalBlueRoofMat);
    bannerFlag.position.set(1.0, 20.8, 0);
    group.add(bannerFlag);
  } else {
    // Rival Warlord War Banner
    const bannerPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 4);
    const bannerPole = new THREE.Mesh(bannerPoleGeo, darkStoneMat);
    bannerPole.position.set(0, 16.5, 0);
    group.add(bannerPole);

    const bannerFlagGeo = new THREE.BoxGeometry(1.6, 1.0, 0.05);
    const bannerFlag = new THREE.Mesh(bannerFlagGeo, redRoofMat);
    bannerFlag.position.set(0.8, 17.6, 0);
    group.add(bannerFlag);
  }

  return group;
}

/**
 * Creates defensive curtain wall and corner bastion towers
 */
function createPerimeterWalls(radius: number, level: number): THREE.Group {
  const group = new THREE.Group();
  const numTowers = 6;
  const wallHeight = 2.4 + (level > 4 ? 0.6 : 0);

  // Bastion towers in a hexagon
  for (let i = 0; i < numTowers; i++) {
    const angle = (Math.PI / 3) * i;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    // Watchtower
    const towerGeo = new THREE.CylinderGeometry(1.2, 1.4, wallHeight + 1.8, 6);
    const tower = new THREE.Mesh(towerGeo, darkStoneMat);
    tower.position.set(x, (wallHeight + 1.8) / 2, z);
    tower.castShadow = true;
    group.add(tower);

    // Tower Roof Cap
    const capGeo = new THREE.ConeGeometry(1.5, 1.8, 6);
    const cap = new THREE.Mesh(capGeo, royalBlueRoofMat);
    cap.position.set(x, wallHeight + 1.8 + 0.9, z);
    group.add(cap);

    // Wall Segment to next tower
    const nextAngle = (Math.PI / 3) * ((i + 1) % numTowers);
    const nextX = radius * Math.cos(nextAngle);
    const nextZ = radius * Math.sin(nextAngle);

    // Leave gap at front (i === 1) for grand gatehouse
    if (i === 1) {
      const gatehouse = createGatehouse(x, z, nextX, nextZ, wallHeight);
      group.add(gatehouse);
      continue;
    }

    const wallLength = Math.hypot(nextX - x, nextZ - z) - 1.8;
    const wallGeo = new THREE.BoxGeometry(0.8, wallHeight, wallLength);
    const wall = new THREE.Mesh(wallGeo, stoneWallMat);

    const midX = (x + nextX) / 2;
    const midZ = (z + nextZ) / 2;
    const wallAngle = Math.atan2(nextZ - z, nextX - x);

    wall.position.set(midX, wallHeight / 2, midZ);
    wall.rotation.y = -wallAngle + Math.PI / 2;
    wall.receiveShadow = true;
    group.add(wall);
  }

  return group;
}

/**
 * Creates arched fortress gatehouse utilizing real GLB gate asset
 */
function createGatehouse(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  wallHeight: number
): THREE.Group {
  const gateGroup = new THREE.Group();
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  const wallAngle = Math.atan2(z2 - z1, x2 - x1);

  // Procedural fallback
  const placeholder = new THREE.Group();
  const gatePillarGeo = new THREE.BoxGeometry(1.6, wallHeight + 1.2, 1.6);
  const pillar1 = new THREE.Mesh(gatePillarGeo, darkStoneMat);
  pillar1.position.set(-1.8, (wallHeight + 1.2) / 2, 0);
  placeholder.add(pillar1);

  const pillar2 = new THREE.Mesh(gatePillarGeo, darkStoneMat);
  pillar2.position.set(1.8, (wallHeight + 1.2) / 2, 0);
  placeholder.add(pillar2);

  const lintelGeo = new THREE.BoxGeometry(4.2, 1.2, 1.8);
  const lintel = new THREE.Mesh(lintelGeo, stoneWallMat);
  lintel.position.set(0, wallHeight + 1.2, 0);
  placeholder.add(lintel);
  gateGroup.add(placeholder);

  // Real GLB Gatehouse
  medievalModelService
    .loadWorldAsset('gate', 3.4)
    .then((gateModel) => {
      gateModel.position.set(0, 0, 0);
      placeholder.visible = false;
      gateGroup.add(gateModel);
    })
    .catch(() => {});

  gateGroup.position.set(midX, 0, midZ);
  gateGroup.rotation.y = -wallAngle + Math.PI / 2;
  return gateGroup;
}

/**
 * Creates 3D Barracks military training hall with real GLB house / barracks
 */
function createBarracksBuilding(): THREE.Group {
  const bGroup = new THREE.Group();
  const placeholder = new THREE.Group();
  const hallGeo = new THREE.BoxGeometry(3.5, 2.2, 4.2);
  const hall = new THREE.Mesh(hallGeo, woodTimberMat);
  hall.position.y = 1.1;
  placeholder.add(hall);
  bGroup.add(placeholder);

  medievalModelService
    .loadWorldAsset('barracks', 2.8)
    .then((model) => {
      placeholder.visible = false;
      bGroup.add(model);
    })
    .catch(() => {
      medievalModelService.loadWorldAsset('house', 2.8).then((h) => {
        placeholder.visible = false;
        bGroup.add(h);
      }).catch(() => {});
    });

  return bGroup;
}

/**
 * Creates 3D Farmhouse with real GLB windmill
 */
function createFarmBuilding(): THREE.Group {
  const farmGroup = new THREE.Group();
  const placeholder = new THREE.Group();
  const cottageGeo = new THREE.BoxGeometry(3, 2, 3);
  const cottage = new THREE.Mesh(cottageGeo, woodTimberMat);
  cottage.position.y = 1;
  placeholder.add(cottage);
  farmGroup.add(placeholder);

  medievalModelService
    .loadWorldAsset('windmill', 2.8)
    .then((model) => {
      placeholder.visible = false;
      farmGroup.add(model);
    })
    .catch(() => {});

  return farmGroup;
}

/**
 * Creates 3D Lumber Mill with real GLB sawmill / lumber props
 */
function createLumberBuilding(): THREE.Group {
  const group = new THREE.Group();
  const placeholder = new THREE.Group();
  const shedGeo = new THREE.BoxGeometry(3.2, 1.8, 2.8);
  const shed = new THREE.Mesh(shedGeo, woodTimberMat);
  shed.position.y = 0.9;
  placeholder.add(shed);
  group.add(placeholder);

  medievalModelService
    .loadWorldAsset('sawmill', 2.8)
    .then((model) => {
      placeholder.visible = false;
      group.add(model);
    })
    .catch(() => {});

  return group;
}

/**
 * Creates 3D Stonemason Workshop & Quarry Cranes with real GLB quarry / stone props
 */
function createStoneWorkshop(): THREE.Group {
  const group = new THREE.Group();
  const placeholder = new THREE.Group();
  const shopGeo = new THREE.BoxGeometry(3, 2.2, 3);
  const shop = new THREE.Mesh(shopGeo, stoneWallMat);
  shop.position.y = 1.1;
  placeholder.add(shop);
  group.add(placeholder);

  medievalModelService
    .loadWorldAsset('quarry', 2.8)
    .then((model) => {
      placeholder.visible = false;
      group.add(model);
    })
    .catch(() => {});

  return group;
}

/**
 * Creates spherical glowing peace shield
 */
function createEnergyShieldDome(radius: number, colorHex: number): THREE.Mesh {
  const shieldGeo = new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.y = 0;
  return shield;
}
