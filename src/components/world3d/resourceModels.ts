/**
 * 3D Resource Node Models (Shared Materials & LOD Optimized)
 * High-performance 3D models for Food, Wood, Stone, Iron, and Gold deposits.
 */

import * as THREE from 'three';
import { ResourceNode } from '../../types';
import { medievalModelService } from './medievalModelService';

// Shared Materials Cache
const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
const strawMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7, flatShading: true });
const barnRoofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6, flatShading: true });
const siloMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
const logMat = new THREE.MeshStandardMaterial({ color: 0x5c3818, roughness: 0.9 });
const plankMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.7 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: true });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
const oreMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });
const furnaceMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
const stoneWallMatRef = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85, flatShading: true });
const goldRockMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9, flatShading: true });
const goldCrystalMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  roughness: 0.15,
  metalness: 0.95,
});
const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.85,
  flatShading: true,
});

export function createResourceNodeMesh(node: ResourceNode): THREE.Group {
  const group = new THREE.Group();
  group.name = `resource-node-${node.id}`;

  const propsGroup = new THREE.Group();
  propsGroup.name = 'secondary-props';
  group.add(propsGroup);

  const { resourceType, level } = node;

  switch (resourceType) {
    case 'food':
      buildFoodNode(group, propsGroup, level);
      break;
    case 'wood':
      buildWoodNode(group, propsGroup, level);
      break;
    case 'stone':
      buildStoneNode(group, propsGroup, level);
      break;
    case 'iron':
      buildIronNode(group, propsGroup, level);
      break;
    case 'gold':
      buildGoldNode(group, propsGroup, level);
      break;
    default:
      buildFoodNode(group, propsGroup, level);
  }

  // Level indicator banner / beacon pedestal
  const basePedestal = new THREE.CylinderGeometry(5.8, 6.2, 0.4, 8);
  const pedestal = new THREE.Mesh(basePedestal, pedestalMat);
  pedestal.position.y = 0.2;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // LOD hook
  group.userData.setLOD = (tier: 'city' | 'region' | 'world') => {
    if (tier === 'world') {
      propsGroup.visible = false;
    } else if (tier === 'region') {
      propsGroup.visible = false;
    } else {
      propsGroup.visible = true;
    }
  };

  return group;
}

/**
 * 1. Food: Wheat Farmland with Thatched Windmill, Barn & Silo (Enhanced with real GLB windmill)
 */
function buildFoodNode(group: THREE.Group, propsGroup: THREE.Group, level: number): void {
  const placeholder = new THREE.Group();

  // Red Timber Barn
  const barnGeo = new THREE.BoxGeometry(3.2, 2.4, 3.8);
  const barn = new THREE.Mesh(barnGeo, woodMat);
  barn.position.set(-2.0, 1.2, -0.5);
  barn.castShadow = true;
  placeholder.add(barn);

  const roofGeo = new THREE.ConeGeometry(2.8, 1.6, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, barnRoofMat);
  roof.position.set(-2.0, 2.4 + 0.8, -0.5);
  roof.scale.set(1, 1, 1.3);
  placeholder.add(roof);

  // Thatched Windmill Tower
  const millTowerGeo = new THREE.CylinderGeometry(1.2, 1.8, 4.2, 8);
  const millTower = new THREE.Mesh(millTowerGeo, stoneWallMatRef);
  millTower.position.set(1.8, 2.1, -1.0);
  millTower.castShadow = true;
  placeholder.add(millTower);

  const millCapGeo = new THREE.ConeGeometry(1.5, 1.6, 8);
  const millCap = new THREE.Mesh(millCapGeo, barnRoofMat);
  millCap.position.set(1.8, 4.2 + 0.8, -1.0);
  placeholder.add(millCap);

  // Windmill 4-Blade Sails
  const sailsGroup = new THREE.Group();
  sailsGroup.position.set(1.8, 4.2, 0.4);
  for (let s = 0; s < 4; s++) {
    const sailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 0.08), strawMat);
    sailBlade.position.y = 1.4;
    const spar = new THREE.Group();
    spar.rotation.z = (Math.PI / 2) * s;
    spar.add(sailBlade);
    sailsGroup.add(spar);
  }
  placeholder.add(sailsGroup);

  group.add(placeholder);

  // Load real GLB Windmill and Farm crates
  medievalModelService
    .loadWorldAsset('windmill', 3.6)
    .then((windmillModel) => {
      windmillModel.position.set(0, 0, 0);
      placeholder.visible = false;
      group.add(windmillModel);

      // Add farm supply crates
      medievalModelService.loadWorldAsset('crate', 2.2).then((crateModel) => {
        crateModel.position.set(-2.4, 0, 1.8);
        propsGroup.add(crateModel);
      }).catch(() => {});
    })
    .catch(() => {});

  // Golden Wheat Sheaves & Hay Bales
  const hayGeo = new THREE.ConeGeometry(0.9, 1.3, 5);
  for (let i = 0; i < 2 + Math.min(level, 3); i++) {
    const hay = new THREE.Mesh(hayGeo, strawMat);
    hay.position.set(-0.5 + (i % 2) * 1.4, 0.65, 1.2 + Math.floor(i / 2) * 1.1);
    propsGroup.add(hay);
  }
}

/**
 * 2. Wood: Timber Grove with Sawmill & Real Stacked Lumber Assets
 */
function buildWoodNode(group: THREE.Group, propsGroup: THREE.Group, level: number): void {
  const placeholder = new THREE.Group();

  // Lumberjack Cabin
  const cabinGeo = new THREE.BoxGeometry(3, 2, 3);
  const cabin = new THREE.Mesh(cabinGeo, logMat);
  cabin.position.set(-1.5, 1, 0);
  cabin.castShadow = true;
  placeholder.add(cabin);

  const roofGeo = new THREE.ConeGeometry(2.8, 1.6, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, logMat);
  roof.position.set(-1.5, 2.8, 0);
  placeholder.add(roof);

  // Large Lumber Stacks
  const stackGeo = new THREE.BoxGeometry(2.5, 1.2, 1.8);
  const stack = new THREE.Mesh(stackGeo, plankMat);
  stack.position.set(2, 0.6, 1);
  placeholder.add(stack);

  group.add(placeholder);

  // Real GLB Sawmill + Resource Lumber Stacks
  medievalModelService
    .loadWorldAsset('sawmill', 3.2)
    .then((sawmillModel) => {
      sawmillModel.position.set(-0.8, 0, -0.6);
      placeholder.visible = false;
      group.add(sawmillModel);

      // Stacked lumber prop
      medievalModelService.loadWorldAsset('lumber', 3.8).then((lumberModel) => {
        lumberModel.position.set(2.4, 0, 1.4);
        propsGroup.add(lumberModel);
      }).catch(() => {});

      // Forester supply crate
      medievalModelService.loadWorldAsset('crate', 2.0).then((crateModel) => {
        crateModel.position.set(-2.6, 0, 1.8);
        propsGroup.add(crateModel);
      }).catch(() => {});
    })
    .catch(() => {});

  // Surrounding Pines
  const treeCount = 2 + Math.min(level, 2);
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 5);
  const foliageGeo = new THREE.ConeGeometry(1.5, 3, 5);

  for (let i = 0; i < treeCount; i++) {
    const angle = (i * Math.PI * 2) / treeCount + 0.5;
    const px = Math.cos(angle) * 3.8;
    const pz = Math.sin(angle) * 3.8;

    const trunk = new THREE.Mesh(trunkGeo, logMat);
    trunk.position.set(px, 0.9, pz);
    propsGroup.add(trunk);

    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(px, 2.8, pz);
    propsGroup.add(foliage);
  }
}

/**
 * 3. Stone: Granite Quarry with Real Quarry & Cut Stone Block Assets
 */
function buildStoneNode(group: THREE.Group, propsGroup: THREE.Group, level: number): void {
  const placeholder = new THREE.Group();

  // Excavated tiered quarry pit
  const pitGeo = new THREE.CylinderGeometry(4.5, 3.5, 1.8, 6);
  const pit = new THREE.Mesh(pitGeo, darkRockMat);
  pit.position.set(0, 0.9, 0);
  pit.receiveShadow = true;
  placeholder.add(pit);

  // Cut stone blocks
  const blockSizes = [
    { w: 1.6, h: 1.2, d: 1.4, x: -1.8, z: 0.8 },
    { w: 1.4, h: 1.4, d: 1.2, x: 1.5, z: -1.2 },
  ];

  blockSizes.forEach((b) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), rockMat);
    block.position.set(b.x, 1.8 + b.h / 2, b.z);
    placeholder.add(block);
  });

  group.add(placeholder);

  // Real GLB Quarry + Cut Stone Blocks + Rock Cluster
  medievalModelService
    .loadWorldAsset('quarry', 3.0)
    .then((quarryModel) => {
      quarryModel.position.set(-0.6, 0, -0.6);
      placeholder.visible = false;
      group.add(quarryModel);

      // Cut stone blocks prop
      medievalModelService.loadWorldAsset('stone', 3.8).then((stoneModel) => {
        stoneModel.position.set(2.2, 0, 1.2);
        propsGroup.add(stoneModel);
      }).catch(() => {});

      // Granite rock cluster
      medievalModelService.loadWorldAsset('rock_cluster', 3.5).then((rockModel) => {
        rockModel.position.set(-2.4, 0, 2.0);
        propsGroup.add(rockModel);
      }).catch(() => {});
    })
    .catch(() => {});
}

/**
 * 4. Iron: Mine Forge with Real Blacksmith & Weapon Rack Assets
 */
function buildIronNode(group: THREE.Group, propsGroup: THREE.Group, level: number): void {
  const placeholder = new THREE.Group();

  // Mountain cavern portal
  const caveGeo = new THREE.DodecahedronGeometry(3.5, 1);
  const cave = new THREE.Mesh(caveGeo, rockMat);
  cave.position.set(-0.8, 2.5, -0.8);
  cave.scale.set(1.4, 1.1, 1.2);
  cave.castShadow = true;
  placeholder.add(cave);

  // Smelting Blast Furnace Chimney
  const chimneyGeo = new THREE.CylinderGeometry(0.9, 1.4, 4.2, 6);
  const chimney = new THREE.Mesh(chimneyGeo, furnaceMat);
  chimney.position.set(2.8, 2.1, 0.5);
  chimney.castShadow = true;
  placeholder.add(chimney);

  group.add(placeholder);

  // Real GLB Blacksmith Forge + Weaponrack
  medievalModelService
    .loadWorldAsset('blacksmith', 3.0)
    .then((smithModel) => {
      smithModel.position.set(-0.6, 0, -0.5);
      placeholder.visible = false;
      group.add(smithModel);

      // Real Weapon Rack
      medievalModelService.loadWorldAsset('weaponrack', 3.2).then((rackModel) => {
        rackModel.position.set(2.2, 0, 1.5);
        propsGroup.add(rackModel);
      }).catch(() => {});

      // Supply crate
      medievalModelService.loadWorldAsset('crate', 2.0).then((crateModel) => {
        crateModel.position.set(-2.2, 0, 1.8);
        propsGroup.add(crateModel);
      }).catch(() => {});
    })
    .catch(() => {});

  // Glowing furnace heat core
  const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(1.2, 0.6, 0.4);
  group.add(glow);
}

/**
 * 5. Gold: Gilded Outpost with Real Market & Treasure Chests
 */
function buildGoldNode(group: THREE.Group, propsGroup: THREE.Group, level: number): void {
  const placeholder = new THREE.Group();

  // Gold outcrop rock
  const outcropGeo = new THREE.DodecahedronGeometry(3.2, 1);
  const outcrop = new THREE.Mesh(outcropGeo, goldRockMat);
  outcrop.position.set(0, 2.2, 0);
  outcrop.scale.set(1.3, 0.9, 1.2);
  outcrop.castShadow = true;
  placeholder.add(outcrop);

  group.add(placeholder);

  // Real GLB Market/Treasury Pavilion + Treasure Crates
  medievalModelService
    .loadWorldAsset('market', 2.8)
    .then((marketModel) => {
      marketModel.position.set(-0.5, 0, -0.5);
      placeholder.visible = false;
      group.add(marketModel);

      // Gold treasure crates
      medievalModelService.loadWorldAsset('crate', 2.5).then((crateModel) => {
        crateModel.position.set(2.0, 0, 1.2);
        propsGroup.add(crateModel);
      }).catch(() => {});
    })
    .catch(() => {});

  // Prismatic glittering gold crystal nuggets
  const crystalPositions = [
    { x: -1.2, y: 0.8, z: 1.6, scale: 1.2 },
    { x: 1.2, y: 0.8, z: -1.5, scale: 1.4 },
    { x: 1.8, y: 0.6, z: 0.8, scale: 1.1 },
  ];

  crystalPositions.forEach((cp) => {
    const cGeo = new THREE.ConeGeometry(0.5 * cp.scale, 1.8 * cp.scale, 5);
    const crystal = new THREE.Mesh(cGeo, goldCrystalMat);
    crystal.position.set(cp.x, cp.y, cp.z);
    propsGroup.add(crystal);
  });
}
