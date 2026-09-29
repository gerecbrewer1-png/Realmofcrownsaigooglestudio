/**
 * Realm of Crowns - High-Craft Medieval Building Architect
 * Implements multi-component architectural complexes for personal kingdom structures:
 * - Central Keep (Multi-tiered castle progression, machicolations, battlements, spires, banners, entrance portal)
 * - Royal Farm (Fenced wheat crop rows, timber barn, thatched windmill with spinning lattice sails, hay cart)
 * - Lumber Sawmill (A-frame shed, log pyramids, crosscut saw bench, woodcutter stump with axe)
 * - Stone Quarry (Tiered bedrock cliff, oak derrick crane hoist, dressed stone pallets, mine cart)
 * - Infantry Barracks (Fortified dormitory, training ring, straw sparring dummies, weapon racks, archery targets)
 * - Warhorse Stables (Timber stalls, feed mangers, hay bales, corral paddock)
 * - Apothecary Hospital (Half-timbered infirmary, blue medic cross banner, lavender herb garden, convalescent tent)
 * - Royal Academy (Classical basilica, gothic arched windows, copper observatory dome, rotating armillary sphere)
 * - Blacksmith & Smelter (Stone hearth with glowing ember coals, iron anvil on log, quenching barrel, tool racks)
 * - Warehouse & Treasury (Banded vault doors, stacked crates, iron-bound chests, sack piles)
 * - Civilian Town Quarter (Gabled half-timber houses, flower boxes, market awnings, fruit barrels)
 */

import * as THREE from 'three';
import { BuildingInstance } from '../../types';
import {
  getStoneWallTexture,
  getWoodPlankTexture,
  getRoofTileTexture,
  getThatchTexture,
  getHeraldicBannerTexture,
} from './medievalTextures';

export interface ArchitecturalBundle {
  group: THREE.Group;
  windmillBlades?: THREE.Object3D;
  chimneys?: THREE.Vector3[];
  bannerFlags?: THREE.Mesh[];
  armillarySphere?: THREE.Object3D;
  trainingDummy?: THREE.Object3D;
  garrisonUnits?: THREE.Object3D[];
}

/**
 * Shared PBR Materials with Procedural Canvas Textures
 */
function getArchitecturalMaterials() {
  const stoneTex = getStoneWallTexture();
  const woodTex = getWoodPlankTexture();
  const blueRoofTex = getRoofTileTexture('#1e40af');
  const redRoofTex = getRoofTileTexture('#991b1b');
  const slateRoofTex = getRoofTileTexture('#334155', true);
  const thatchTex = getThatchTexture();

  return {
    stone: new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.85,
      metalness: 0.1,
    }),
    darkStone: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    }),
    wood: new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.8,
      metalness: 0.05,
    }),
    blueRoof: new THREE.MeshStandardMaterial({
      map: blueRoofTex,
      roughness: 0.5,
      metalness: 0.1,
    }),
    redRoof: new THREE.MeshStandardMaterial({
      map: redRoofTex,
      roughness: 0.55,
      metalness: 0.1,
    }),
    slateRoof: new THREE.MeshStandardMaterial({
      map: slateRoofTex,
      roughness: 0.6,
      metalness: 0.15,
    }),
    thatch: new THREE.MeshStandardMaterial({
      map: thatchTex,
      roughness: 0.95,
    }),
    goldTrim: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.9,
    }),
    iron: new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.5,
      metalness: 0.85,
    }),
    plasterWhite: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
    }),
    copperDome: new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      roughness: 0.45,
      metalness: 0.35,
    }),
    wheatCrops: new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.9,
      flatShading: true,
    }),
    tilledSoil: new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.95,
    }),
    sandFloor: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.95,
    }),
  };
}

/**
 * Builds a comprehensive medieval building complex based on type and level
 */
export function buildArchitecturalComplex(building: BuildingInstance): ArchitecturalBundle {
  const group = new THREE.Group();
  group.name = `architectural-${building.id}`;
  const mats = getArchitecturalMaterials();
  const lvl = Math.max(1, building.level);

  const bundle: ArchitecturalBundle = {
    group,
    chimneys: [],
    bannerFlags: [],
  };

  switch (building.type) {
    case 'castle':
      buildGrandKeep(bundle, lvl, mats);
      break;
    case 'farm':
      buildRoyalFarmstead(bundle, lvl, mats);
      break;
    case 'lumber_mill':
      buildTimberSawmill(bundle, lvl, mats);
      break;
    case 'quarry':
      buildStoneQuarry(bundle, lvl, mats);
      break;
    case 'barracks':
      buildInfantryBarracks(bundle, lvl, mats);
      break;
    case 'stable':
      buildWarhorseStables(bundle, lvl, mats);
      break;
    case 'hospital':
      buildApothecaryHospital(bundle, lvl, mats);
      break;
    case 'academy':
      buildRoyalAcademy(bundle, lvl, mats);
      break;
    case 'warehouse':
      buildGrandWarehouse(bundle, lvl, mats);
      break;
    case 'iron_mine':
      buildBlacksmithForge(bundle, lvl, mats);
      break;
    case 'gold_mine':
      buildGoldTreasurySmelter(bundle, lvl, mats);
      break;
    case 'archery_range':
      buildArcheryGrounds(bundle, lvl, mats);
      break;
    default:
      buildGrandKeep(bundle, lvl, mats);
  }

  return bundle;
}

/**
 * 1. CENTRAL KEEP (SOVEREIGN CASTLE CITADEL)
 * Features visual progression:
 * - Level 1-2: Fortified stone keep with timber palisade parapet, dual corner watchtowers, grand arched gate
 * - Level 3-5: Twin battlements, reinforced machicolations, central donjon spire, dual banner poles
 * - Level 6+: Majestic High Citadel with 4 corner spires, gold-leaf finials, lancet stained windows, flying banners
 */
function buildGrandKeep(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // A. Elevated Stone Podium Base with Balustrade Steps
  const podiumW = 10 + Math.min(lvl * 0.4, 3);
  const podiumH = 0.8;
  const podium = new THREE.Mesh(new THREE.BoxGeometry(podiumW, podiumH, podiumW), mats.darkStone);
  podium.position.y = podiumH / 2;
  podium.receiveShadow = true;
  group.add(podium);

  // Stone Entrance Steps
  for (let s = 0; s < 4; s++) {
    const stepW = 4.2 - s * 0.4;
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.2, 0.6), mats.stone);
    step.position.set(0, s * 0.2 + 0.1, podiumW / 2 + (4 - s) * 0.5 - 0.4);
    group.add(step);
  }

  // B. Main Keep Fortress Body
  const keepW = 7.0 + Math.min(lvl * 0.3, 2.0);
  const keepH = 7.0 + Math.min(lvl * 0.5, 4.5);
  const keepD = 7.0 + Math.min(lvl * 0.3, 2.0);
  const keepBody = new THREE.Mesh(new THREE.BoxGeometry(keepW, keepH, keepD), mats.stone);
  keepBody.position.y = podiumH + keepH / 2;
  keepBody.castShadow = true;
  keepBody.receiveShadow = true;
  group.add(keepBody);

  // C. Grand Arched Entrance Portal
  const doorH = 3.2;
  const doorW = 2.4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.4), mats.wood);
  door.position.set(0, podiumH + doorH / 2, keepD / 2 + 0.1);
  group.add(door);

  // Stone Arch Surround
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.8, 0.6, 0.6), mats.darkStone);
  archTop.position.set(0, podiumH + doorH + 0.25, keepD / 2 + 0.2);
  group.add(archTop);

  // Iron Knocker studs
  const knockerMat = mats.goldTrim;
  const knocker1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), knockerMat);
  knocker1.rotation.x = Math.PI / 2;
  knocker1.position.set(-0.5, podiumH + 1.8, keepD / 2 + 0.35);
  const knocker2 = knocker1.clone();
  knocker2.position.set(0.5, podiumH + 1.8, keepD / 2 + 0.35);
  group.add(knocker1, knocker2);

  // D. Crenelated Parapets & Machicolations on Upper Deck
  const parapetY = podiumH + keepH;
  const numCrenels = 6;
  const crenelSpacing = keepW / numCrenels;

  for (let i = 0; i < numCrenels; i++) {
    const cx = -keepW / 2 + i * crenelSpacing + crenelSpacing / 2;
    // Front and Back battlements
    const cFront = new THREE.Mesh(new THREE.BoxGeometry(crenelSpacing * 0.6, 0.8, 0.4), mats.stone);
    cFront.position.set(cx, parapetY + 0.4, keepD / 2);
    const cBack = cFront.clone();
    cBack.position.set(cx, parapetY + 0.4, -keepD / 2);
    group.add(cFront, cBack);

    // Left and Right battlements
    const cLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, crenelSpacing * 0.6), mats.stone);
    cLeft.position.set(-keepW / 2, parapetY + 0.4, cx);
    const cRight = cLeft.clone();
    cRight.position.set(keepW / 2, parapetY + 0.4, cx);
    group.add(cLeft, cRight);
  }

  // Overhanging Timber Hoardings (War galleries)
  const hoarding = new THREE.Mesh(new THREE.BoxGeometry(keepW + 0.8, 1.0, keepD + 0.8), mats.wood);
  hoarding.position.set(0, parapetY - 0.5, 0);
  group.add(hoarding);

  // E. Four Corner Bastion Towers
  const towerRad = 1.4 + Math.min(lvl * 0.08, 0.5);
  const towerH = keepH + 3.0;
  const cornerOffsets = [
    { x: -keepW / 2, z: -keepD / 2 },
    { x: keepW / 2, z: -keepD / 2 },
    { x: -keepW / 2, z: keepD / 2 },
    { x: keepW / 2, z: keepD / 2 },
  ];

  cornerOffsets.forEach((pos) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(towerRad, towerRad * 1.15, towerH, 8), mats.stone);
    tower.position.set(pos.x, podiumH + towerH / 2, pos.z);
    tower.castShadow = true;
    group.add(tower);

    // Conical Roof
    const roofH = 3.2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(towerRad * 1.3, roofH, 8), mats.blueRoof);
    roof.position.set(pos.x, podiumH + towerH + roofH / 2, pos.z);
    roof.castShadow = true;
    group.add(roof);

    // Gold Finial on tower peak
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mats.goldTrim);
    finial.position.set(pos.x, podiumH + towerH + roofH + 0.2, pos.z);
    group.add(finial);
  });

  // F. Soaring Central High Donjon Spire (Levels 3+)
  if (lvl >= 3) {
    const donjonH = 6.0 + (lvl - 3) * 1.2;
    const donjonRad = 2.0;
    const donjon = new THREE.Mesh(new THREE.CylinderGeometry(donjonRad * 0.8, donjonRad, donjonH, 8), mats.stone);
    donjon.position.set(0, parapetY + donjonH / 2, 0);
    donjon.castShadow = true;
    group.add(donjon);

    const spireH = 5.5 + (lvl - 3) * 0.8;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(donjonRad * 1.25, spireH, 8), mats.blueRoof);
    spire.position.set(0, parapetY + donjonH + spireH / 2, 0);
    spire.castShadow = true;
    group.add(spire);

    // Master Banner Pole and Waving Heraldic Flag
    const poleH = 4.0;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, poleH, 6), mats.goldTrim);
    pole.position.set(0, parapetY + donjonH + spireH + poleH / 2, 0);
    group.add(pole);

    const bannerTex = getHeraldicBannerTexture('warlord');
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      side: THREE.DoubleSide,
      roughness: 0.6,
    });
    const flagGeo = new THREE.PlaneGeometry(1.6, 2.4, 8, 8);
    const flag = new THREE.Mesh(flagGeo, bannerMat);
    flag.position.set(0.9, parapetY + donjonH + spireH + poleH - 1.2, 0);
    group.add(flag);
    bundle.bannerFlags?.push(flag);
  }

  // G. Stone Fireplace Chimneys with Smoke Points
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), mats.darkStone);
  chimney.position.set(-keepW * 0.3, parapetY + 1.5, -keepD * 0.3);
  group.add(chimney);

  if (bundle.chimneys) {
    bundle.chimneys.push(
      new THREE.Vector3(group.position.x - keepW * 0.3, parapetY + 3.2, group.position.z - keepD * 0.3)
    );
  }

  // H. Facade Heraldic Shields
  const shieldGeo = new THREE.ConeGeometry(0.7, 1.2, 3);
  shieldGeo.rotateZ(Math.PI);
  const shieldMesh = new THREE.Mesh(shieldGeo, mats.goldTrim);
  shieldMesh.position.set(0, podiumH + keepH * 0.7, keepD / 2 + 0.15);
  group.add(shieldMesh);
}

/**
 * 2. ROYAL FARMSTEAD (FARM)
 * Fenced enclosures, tilled crop furrows, red barn, flour windmill with animated lattice sails, grain cart
 */
function buildRoyalFarmstead(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // A. Tilled Soil Ground Plot
  const plotW = 11.0;
  const plotD = 8.5;
  const soil = new THREE.Mesh(new THREE.BoxGeometry(plotW, 0.15, plotD), mats.tilledSoil);
  soil.position.set(0, 0.08, 0);
  soil.receiveShadow = true;
  group.add(soil);

  // B. Parallel Wheat Crop Rows
  const numRows = 5;
  for (let r = 0; r < numRows; r++) {
    const z = -plotD / 2 + 1.2 + r * 1.5;
    const cropRow = new THREE.Mesh(new THREE.BoxGeometry(plotW - 2.5, 0.65, 0.8), mats.wheatCrops);
    cropRow.position.set(-0.8, 0.45, z);
    cropRow.castShadow = true;
    group.add(cropRow);
  }

  // C. Post-and-Rail Wooden Fence
  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6);
  const railGeoX = new THREE.BoxGeometry(plotW, 0.1, 0.08);
  const railGeoZ = new THREE.BoxGeometry(0.08, 0.1, plotD);

  const topRail1 = new THREE.Mesh(railGeoX, mats.wood);
  topRail1.position.set(0, 0.6, -plotD / 2);
  const topRail2 = topRail1.clone();
  topRail2.position.set(0, 0.6, plotD / 2);
  const sideRail1 = new THREE.Mesh(railGeoZ, mats.wood);
  sideRail1.position.set(-plotW / 2, 0.6, 0);
  const sideRail2 = sideRail1.clone();
  sideRail2.position.set(plotW / 2, 0.6, 0);
  group.add(topRail1, topRail2, sideRail1, sideRail2);

  // Corner Posts
  [
    [-plotW / 2, -plotD / 2],
    [plotW / 2, -plotD / 2],
    [-plotW / 2, plotD / 2],
    [plotW / 2, plotD / 2],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, mats.wood);
    post.position.set(px, 0.45, pz);
    group.add(post);
  });

  // D. Red Thatched Timber Barn
  const barnW = 4.2;
  const barnH = 3.2;
  const barnD = 4.8;
  const barn = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH, barnD), mats.redRoof);
  barn.position.set(-2.8, barnH / 2, 0);
  barn.castShadow = true;
  group.add(barn);

  const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.0, 4), mats.thatch);
  barnRoof.rotation.y = Math.PI / 4;
  barnRoof.position.set(-2.8, barnH + 1.0, 0);
  barnRoof.scale.set(1, 1, 1.4);
  barnRoof.castShadow = true;
  group.add(barnRoof);

  // Barn Double Doors
  const bDoor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.2), mats.wood);
  bDoor.position.set(-2.8, 1.1, barnD / 2 + 0.1);
  group.add(bDoor);

  // E. Thatched Flour Windmill
  const millBaseRad = 1.6;
  const millH = 5.5;
  const mill = new THREE.Mesh(new THREE.CylinderGeometry(1.2, millBaseRad, millH, 8), mats.stone);
  mill.position.set(3.2, millH / 2, 1.0);
  mill.castShadow = true;
  group.add(mill);

  const millCap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.0, 8), mats.thatch);
  millCap.position.set(3.2, millH + 1.0, 1.0);
  millCap.castShadow = true;
  group.add(millCap);

  // Windmill Rotating Sail Hub
  const sailHub = new THREE.Group();
  sailHub.position.set(3.2, millH + 0.6, 1.0 + 1.35);

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), mats.wood);
  axle.rotation.x = Math.PI / 2;
  sailHub.add(axle);

  // 4 Lattice Sails with Cloth Canvases
  for (let s = 0; s < 4; s++) {
    const angle = (Math.PI / 2) * s;
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.0, 0.12), mats.wood);
    spar.position.set(Math.sin(angle) * 2.0, Math.cos(angle) * 2.0, 0);
    spar.rotation.z = -angle;

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.4), mats.plasterWhite);
    cloth.position.set(Math.sin(angle) * 2.0 + Math.cos(angle) * 0.45, Math.cos(angle) * 2.0 - Math.sin(angle) * 0.45, 0.05);
    cloth.rotation.z = -angle;
    sailHub.add(spar, cloth);
  }
  group.add(sailHub);
  bundle.windmillBlades = sailHub;

  // F. Wooden Farm Cart with Wheels and Grain Bushels
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), mats.wood);
  cartBody.position.set(2.6, 0.7, -2.4);
  cartBody.castShadow = true;
  group.add(cartBody);

  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const w1 = new THREE.Mesh(wheelGeo, mats.wood);
  w1.position.set(2.6 - 0.9, 0.5, -2.4);
  const w2 = new THREE.Mesh(wheelGeo, mats.wood);
  w2.position.set(2.6 + 0.9, 0.5, -2.4);
  group.add(w1, w2);

  // Grain sacks inside cart
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), mats.thatch);
  sack.scale.set(1, 1.4, 1);
  sack.position.set(2.6, 1.2, -2.4);
  group.add(sack);
}

/**
 * 3. TIMBER SAWMILL (LUMBER MILL)
 * Open log pavilion, log pyramid stacks, crosscut saw bench, woodcutter stump with axe
 */
function buildTimberSawmill(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // A. Sawmill Open Pavilion Shelter
  const shedW = 5.5;
  const shedD = 5.0;
  const shedH = 3.6;

  // 4 Corner Timber Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.25, shedH, 8);
  [
    [-shedW / 2 + 0.3, -shedD / 2 + 0.3],
    [shedW / 2 - 0.3, -shedD / 2 + 0.3],
    [-shedW / 2 + 0.3, shedD / 2 - 0.3],
    [shedW / 2 - 0.3, shedD / 2 - 0.3],
  ].forEach(([px, pz]) => {
    const p = new THREE.Mesh(pillarGeo, mats.wood);
    p.position.set(px - 1.5, shedH / 2, pz);
    p.castShadow = true;
    group.add(p);
  });

  // Sloping Gabled Wood-Shingle Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), mats.wood);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-1.5, shedH + 0.9, 0);
  roof.scale.set(1, 1, 1.3);
  roof.castShadow = true;
  group.add(roof);

  // B. Sawing Bench & Industrial Saw Mechanism
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 3.2), mats.wood);
  bench.position.set(-1.5, 0.45, 0);
  bench.castShadow = true;
  group.add(bench);

  // Large Circular Saw Blade
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16), mats.iron);
  blade.rotation.x = Math.PI / 2;
  blade.position.set(-1.5, 1.2, 0);
  group.add(blade);

  // C. Stacked Pyramid of Cut Logs
  const logGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.8, 8);
  logGeo.rotateZ(Math.PI / 2);

  // Bottom row (3 logs)
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(logGeo, mats.wood);
    log.position.set(3.0, 0.28, -1.0 + i * 0.6);
    log.castShadow = true;
    group.add(log);
  }
  // Middle row (2 logs)
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(logGeo, mats.wood);
    log.position.set(3.0, 0.72, -0.7 + i * 0.6);
    log.castShadow = true;
    group.add(log);
  }
  // Top log
  const topLog = new THREE.Mesh(logGeo, mats.wood);
  topLog.position.set(3.0, 1.15, -0.4);
  topLog.castShadow = true;
  group.add(topLog);

  // D. Woodcutter Stump with Embedded Iron Axe
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), mats.wood);
  stump.position.set(2.4, 0.4, 2.0);
  stump.castShadow = true;
  group.add(stump);

  // Axe handle and head
  const axeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), mats.wood);
  axeHandle.rotation.z = Math.PI / 6;
  axeHandle.position.set(2.4 + 0.2, 1.0, 2.0);
  const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.06), mats.iron);
  axeBlade.position.set(2.4, 0.85, 2.0);
  group.add(axeHandle, axeBlade);
}

/**
 * 4. STONE QUARRY
 * Stepped bedrock face, oak derrick crane hoist, dressed ashlar stone pallets, wooden mining pushcart
 */
function buildStoneQuarry(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // A. Stepped Excavated Bedrock Quarry Faces
  const pit = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 7.5), mats.darkStone);
  pit.position.set(0, 0.25, 0);
  pit.receiveShadow = true;
  group.add(pit);

  const rockStep1 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.6, 2.8), mats.stone);
  rockStep1.position.set(0, 0.8, -2.2);
  rockStep1.castShadow = true;
  group.add(rockStep1);

  const rockStep2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 2.2), mats.darkStone);
  rockStep2.position.set(0, 1.4, -3.0);
  rockStep2.castShadow = true;
  group.add(rockStep2);

  // B. Heavy Oak Derrick Crane Hoist
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 5.2, 8), mats.wood);
  mast.position.set(-2.6, 2.6, 1.2);
  mast.castShadow = true;
  group.add(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.2, 8), mats.wood);
  boom.rotation.z = -Math.PI / 3.5;
  boom.position.set(-1.0, 4.0, 1.2);
  group.add(boom);

  // Hoist Cargo Rope and Stone Basket
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mats.wood);
  rope.position.set(0.6, 3.2, 1.2);
  group.add(rope);

  const cargoBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), mats.stone);
  cargoBlock.position.set(0.6, 1.8, 1.2);
  cargoBlock.castShadow = true;
  group.add(cargoBlock);

  // C. Dressed Ashlar Masonry Pallet Stacks
  for (let s = 0; s < 4; s++) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), mats.stone);
    block.position.set(2.8, 0.25 + s * 0.5, 0);
    block.castShadow = true;
    group.add(block);
  }

  // D. Mining Pushcart on Timber Tracks
  const track1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4.0), mats.wood);
  track1.position.set(1.5, 0.1, 1.2);
  const track2 = track1.clone();
  track2.position.set(2.3, 0.1, 1.2);
  group.add(track1, track2);

  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.5), mats.wood);
  cart.position.set(1.9, 0.5, 1.2);
  cart.castShadow = true;
  group.add(cart);
}

/**
 * 5. INFANTRY BARRACKS & TRAINING GROUND
 * Stone garrison hall, enclosed sandy combat training yard, straw sparring dummies, weapon racks, archery targets
 */
function buildInfantryBarracks(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // A. Fortified Garrison Hall
  const hallW = 4.8;
  const hallH = 3.6;
  const hallD = 5.2;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallD), mats.stone);
  hall.position.set(-2.6, hallH / 2, 0);
  hall.castShadow = true;
  group.add(hall);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.0, 4), mats.slateRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-2.6, hallH + 1.0, 0);
  roof.scale.set(1, 1, 1.4);
  roof.castShadow = true;
  group.add(roof);

  // Regimental Banners on Barracks Façade
  const bannerTex = getHeraldicBannerTexture('warlord');
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide });
  const bFlag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), bannerMat);
  bFlag.position.set(-2.6, hallH * 0.7, hallD / 2 + 0.05);
  group.add(bFlag);

  // B. Enclosed Sandy Combat Training Ring
  const ringW = 6.0;
  const ringD = 6.0;
  const sand = new THREE.Mesh(new THREE.BoxGeometry(ringW, 0.1, ringD), mats.sandFloor);
  sand.position.set(3.2, 0.05, 0);
  sand.receiveShadow = true;
  group.add(sand);

  // Timber Fence around Training Yard
  const fenceGeoX = new THREE.BoxGeometry(ringW, 0.4, 0.1);
  const fenceGeoZ = new THREE.BoxGeometry(0.1, 0.4, ringD);
  const fTop = new THREE.Mesh(fenceGeoX, mats.wood);
  fTop.position.set(3.2, 0.3, -ringD / 2);
  const fBottom = fTop.clone();
  fBottom.position.set(3.2, 0.3, ringD / 2);
  const fRight = new THREE.Mesh(fenceGeoZ, mats.wood);
  fRight.position.set(3.2 + ringW / 2, 0.3, 0);
  group.add(fTop, fBottom, fRight);

  // C. Straw Combat Sparring Dummy on Rotating Post
  const dummyPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), mats.wood);
  dummyPost.position.set(2.4, 1.1, -0.6);
  const dummyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.0, 8), mats.thatch);
  dummyBody.position.set(2.4, 1.3, -0.6);
  const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mats.thatch);
  dummyHead.position.set(2.4, 1.95, -0.6);
  // Crossarm with shield
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), mats.wood);
  arm.position.set(2.4, 1.4, -0.6);
  const dummyShield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8), mats.wood);
  dummyShield.rotation.x = Math.PI / 2;
  dummyShield.position.set(2.4 + 0.7, 1.4, -0.6);
  group.add(dummyPost, dummyBody, dummyHead, arm, dummyShield);

  // D. Weapon Rack with Swords and Halberds
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 2.0), mats.wood);
  rack.position.set(5.2, 0.7, 1.2);
  rack.castShadow = true;
  group.add(rack);

  // E. Archery Straw Target with Concentric Rings
  const target = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 16), mats.thatch);
  target.rotation.x = Math.PI / 2;
  target.position.set(3.4, 1.2, 2.2);
  target.castShadow = true;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), mats.wood);
  stand.position.set(3.4, 0.7, 2.2);
  group.add(target, stand);
}

/**
 * 6. WARHORSE STABLES
 */
function buildWarhorseStables(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // Timber stable barn
  const barnW = 7.2;
  const barnH = 3.2;
  const barnD = 4.2;
  const barn = new THREE.Mesh(new THREE.BoxGeometry(barnW, barnH, barnD), mats.wood);
  barn.position.set(0, barnH / 2, -1.2);
  barn.castShadow = true;
  group.add(barn);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 1.8, 4), mats.thatch);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, barnH + 0.9, -1.2);
  roof.scale.set(1.5, 1, 1);
  group.add(roof);

  // Open Stall Partitions
  for (let s = -2; s <= 2; s++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), mats.wood);
    post.position.set(s * 1.4, 1.2, 1.0);
    group.add(post);
  }

  // Fenced Paddock Corral
  const corral = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 3.2), mats.sandFloor);
  corral.position.set(0, 0.05, 2.2);
  group.add(corral);
}

/**
 * 7. APOTHECARY HOSPITAL
 * White lime-washed walls, timber framing, steep gabled slate roof, blue medic cross banner, lavender garden
 */
function buildApothecaryHospital(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  const w = 5.2;
  const h = 3.8;
  const d = 5.0;
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.plasterWhite);
  bldg.position.set(-1.2, h / 2, 0);
  bldg.castShadow = true;
  group.add(bldg);

  // Timber cross beams on façade
  const beamMat = mats.wood;
  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.2, d + 0.05), beamMat);
  beam1.position.set(-1.2, h * 0.5, 0);
  group.add(beam1);

  // Steep Gabled Slate Roof with Dormer
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), mats.slateRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(-1.2, h + 1.1, 0);
  roof.scale.set(1, 1, 1.3);
  group.add(roof);

  // Blue Healer Cross Shield Banner
  const crossGroup = new THREE.Group();
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.08), mats.blueRoof);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.08), mats.blueRoof);
  crossGroup.add(crossH, crossV);
  crossGroup.position.set(-1.2, h * 0.75, d / 2 + 0.06);
  group.add(crossGroup);

  // Medicinal Herb Garden Beds
  const herbBed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 3.8), mats.tilledSoil);
  herbBed.position.set(3.0, 0.15, 0);
  group.add(herbBed);

  const herbPlant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 6), mats.wheatCrops);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const p = herbPlant.clone();
      p.position.set(3.0 + i * 0.8, 0.45, j * 1.2);
      group.add(p);
    }
  }
}

/**
 * 8. ROYAL ACADEMY & OBSERVATORY
 * Classical stone basilica, arched colonnade, gothic lancet windows, copper-verdigris dome, rotating armillary sphere
 */
function buildRoyalAcademy(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  const w = 5.8;
  const h = 4.2;
  const d = 5.8;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.stone);
  base.position.set(0, h / 2, 0);
  base.castShadow = true;
  group.add(base);

  // Arched Gothic Colonnade Portico
  for (let c = -2; c <= 2; c++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, h, 8), mats.stone);
    col.position.set(c * 1.2, h / 2, d / 2 + 0.8);
    col.castShadow = true;
    group.add(col);
  }

  // Octagonal Observatory Tower
  const towerH = 3.6;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, towerH, 8), mats.stone);
  tower.position.set(0, h + towerH / 2, 0);
  group.add(tower);

  // Copper Verdigris Dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.copperDome);
  dome.position.set(0, h + towerH, 0);
  group.add(dome);

  // Rotating Gilded Armillary Sphere
  const armillary = new THREE.Group();
  armillary.position.set(0, h + towerH + 2.5, 0);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 24), mats.goldTrim);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 24), mats.goldTrim);
  ring2.rotation.x = Math.PI / 2;
  const centralStar = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mats.goldTrim);
  armillary.add(ring1, ring2, centralStar);
  group.add(armillary);
  bundle.armillarySphere = armillary;
}

/**
 * 9. GRAND WAREHOUSE & TREASURY
 */
function buildGrandWarehouse(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  const w = 5.8;
  const h = 3.8;
  const d = 5.2;
  const vault = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.stone);
  vault.position.set(0, h / 2, 0);
  vault.castShadow = true;
  group.add(vault);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.0, 4), mats.slateRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, h + 1.0, 0);
  roof.scale.set(1.1, 1, 1.2);
  group.add(roof);

  // Heavy Iron-Banded Vault Double Doors
  const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.3), mats.iron);
  vaultDoor.position.set(0, 1.3, d / 2 + 0.1);
  group.add(vaultDoor);

  // Stacked Crates and Chests outside
  const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const c1 = new THREE.Mesh(crateGeo, mats.wood);
  c1.position.set(w / 2 + 0.8, 0.4, 0);
  const c2 = new THREE.Mesh(crateGeo, mats.wood);
  c2.position.set(w / 2 + 0.8, 0.4, 0.9);
  const c3 = new THREE.Mesh(crateGeo, mats.wood);
  c3.position.set(w / 2 + 0.8, 1.2, 0.4);
  group.add(c1, c2, c3);
}

/**
 * 10. BLACKSMITH FORGE & SMELTER
 */
function buildBlacksmithForge(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // Open Stone Hearth
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 2.6), mats.stone);
  hearth.position.set(-1.2, 0.6, 0);
  group.add(hearth);

  // Glowing Coal Bed (Emissive fire glow)
  const coalsMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const coals = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.6), coalsMat);
  coals.position.set(-1.2, 1.25, 0);
  group.add(coals);

  // Stone Chimney Hood
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 1.8), mats.darkStone);
  chimney.position.set(-1.2, 2.8, 0);
  group.add(chimney);

  if (bundle.chimneys) {
    bundle.chimneys.push(new THREE.Vector3(group.position.x - 1.2, 4.6, group.position.z));
  }

  // Cast-Iron Anvil on Oak Stump
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.8, 8), mats.wood);
  stump.position.set(1.8, 0.4, 0);
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.4), mats.iron);
  anvil.position.set(1.8, 0.9, 0);
  group.add(stump, anvil);

  // Quenching Water Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.9, 12), mats.wood);
  barrel.position.set(1.8, 0.45, 1.4);
  group.add(barrel);
}

/**
 * 11. GOLD TREASURY SMELTER
 */
function buildGoldTreasurySmelter(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  const w = 4.8;
  const h = 3.6;
  const d = 4.8;
  const smelter = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.darkStone);
  smelter.position.set(0, h / 2, 0);
  group.add(smelter);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.0, 4), mats.slateRoof);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, h + 1.0, 0);
  group.add(roof);

  // Gold Bullion Ingot Stacks
  const ingotGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
  for (let i = 0; i < 6; i++) {
    const ingot = new THREE.Mesh(ingotGeo, mats.goldTrim);
    ingot.position.set(w / 2 + 0.6, 0.1 + (i % 3) * 0.22, (i < 3 ? 0 : 0.4));
    group.add(ingot);
  }
}

/**
 * 12. ARCHERY GROUNDS
 */
function buildArcheryGrounds(bundle: ArchitecturalBundle, lvl: number, mats: ReturnType<typeof getArchitecturalMaterials>): void {
  const group = bundle.group;

  // Shooting Pavilion
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 2.2), mats.wood);
  pavilion.position.set(0, 1.6, -2.0);
  group.add(pavilion);

  // Archery Field Targets
  for (let t = -1; t <= 1; t++) {
    const target = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), mats.thatch);
    target.rotation.x = Math.PI / 2;
    target.position.set(t * 1.8, 1.2, 2.2);
    target.castShadow = true;
    group.add(target);
  }
}
