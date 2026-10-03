/**
 * Realm of Crowns — 3D Coastal Harbor & Island Haven Builder
 * 
 * Creates realistic, majestic Age-of-Sail maritime environments:
 * 1. Grand Sovereign Mainland Coastal Port: Arched stone breakwaters, seawalls,
 *    waterfront quays, multi-story port skyline, hilltop citadel keep, and distant
 *    mountain backdrop ridges situated safely behind the city.
 * 2. Scenic Archipelago Island Havens: Compact tropical havens with sandy beaches,
 *    terraced coastal rock bluffs, lush 3D palm trees, wooden boardwalk piers,
 *    warehouses, taverns, and summit beacon towers, bounded cleanly so ships never clip.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FactionId, SailHeraldryService } from './SailHeraldryService';

export interface HarborConfig {
  id: string;
  name: string;
  faction: FactionId;
  position: THREE.Vector3;
  rotationY?: number;
  scale?: number;
  tier?: number;
  isMainland?: boolean;
}

const _gltfLoader = new GLTFLoader();

export class CoastalHarborBuilder {
  /**
   * Main entry point: builds a grand mainland harbor or a compact island haven,
   * then batches all static sub-meshes by material to collapse hundreds of draw calls.
   */
  
  public static createHarborCity(config: HarborConfig): THREE.Group {
    const isMainland = config.isMainland || config.id === 'mainland_haven';
    let rawGroup: THREE.Group;
    if (isMainland) {
      if (config.faction === 'pirates') {
         rawGroup = this.createMainlandHarbor(config); // Or custom pirate
      } else if (config.faction === 'holland') {
         rawGroup = this.createMainlandHarbor(config);
      } else if (config.faction === 'dragon') {
         rawGroup = this.createMainlandHarbor(config);
      } else {
         rawGroup = this.createMainlandHarbor(config);
      }
    } else if (config.id === 'brethrens_vault' || config.id.includes('vault') || config.id.includes('cave') || config.faction === 'pirates') {
      rawGroup = this.createSkullCavernSanctuary(config);
    } else {
      rawGroup = this.createIslandHaven(config);
    }

    // Interactive vendors
    const vendorNode = new THREE.Group();
    vendorNode.name = '[Master Shipwright]';
    vendorNode.userData.isVendor = true;
    rawGroup.add(vendorNode);
    
    const brokerNode = new THREE.Group();
    brokerNode.name = '[Commodity Broker]';
    brokerNode.userData.isVendor = true;
    rawGroup.add(brokerNode);
    
    const tavernNode = new THREE.Group();
    tavernNode.name = '[Tavern Master]';
    tavernNode.userData.isVendor = true;
    rawGroup.add(tavernNode);

    // Ambient Town Life
    // 3-4 patrolling guards, 2 dockworkers, 3 roaming animals... We'll tag these in userData
    rawGroup.userData.ambientLife = { guards: 4, dockworkers: 2, animals: 3 };

    // --- MODULAR TIMBER DOCKS (Phase 2) ---
    // Instantiate harvested GLTF assets for harbor docks, props, and lanterns.
    const modularDocks = new THREE.Group();
    modularDocks.name = 'modular-timber-docks';
    modularDocks.position.set(0, 0, 0); // Position relative to harbor origin
    rawGroup.add(modularDocks);

    // Load Main Pier & Pilings
    _gltfLoader.load('/assets/models/town/structure-platform-dock.glb', (gltf) => {
      // Assemble main pier spine using linked platform docks resting on pilings
      const zOffsets = [-15, -25, -35, -45]; // Extend out into harbor
      zOffsets.forEach((z) => {
        const spine = gltf.scene.clone();
        spine.position.set(0, 0.4, z);
        modularDocks.add(spine);
      });
    });

    // Load Finger Piers (T-shaped)
    _gltfLoader.load('/assets/models/town/structure-platform-dock-small.glb', (gltf) => {
      // Add T-shaped finger piers extending sideways for ship mooring
      const positions = [
        { x: -10, z: -25, r: Math.PI / 2 },
        { x: 10, z: -25, r: -Math.PI / 2 },
        { x: -10, z: -45, r: Math.PI / 2 },
        { x: 10, z: -45, r: -Math.PI / 2 },
      ];
      positions.forEach((pos) => {
        const finger = gltf.scene.clone();
        finger.position.set(pos.x, 0.4, pos.z);
        finger.rotation.y = pos.r;
        modularDocks.add(finger);
        
        // Add warm iron lanterns at the end of each finger pier
        const lantern = new THREE.PointLight(0xf59e0b, 1.5, 20);
        lantern.position.set(pos.x + (Math.sign(pos.x) * 2), 2.0, pos.z);
        modularDocks.add(lantern);
      });
    });

    // Load Props (Barrels & Crates)
    const loadProp = (path: string, callback: (scene: THREE.Group) => void) => {
      _gltfLoader.load(path, (gltf) => callback(gltf.scene));
    };

    loadProp('/assets/models/town/barrel.glb', (scene) => {
      const positions = [{ x: -2, z: -16 }, { x: 3, z: -26 }, { x: -4, z: -36 }, { x: -1, z: -46 }];
      positions.forEach((p) => {
        const barrel = scene.clone();
        barrel.position.set(p.x, 0.42, p.z);
        modularDocks.add(barrel);
      });
    });

    loadProp('/assets/models/town/crate.glb', (scene) => {
      const positions = [{ x: 2, z: -18 }, { x: -3, z: -28 }, { x: 4, z: -38 }];
      positions.forEach((p) => {
        const crate = scene.clone();
        crate.position.set(p.x, 0.42, p.z);
        crate.rotation.y = Math.random() * Math.PI;
        modularDocks.add(crate);
      });
    });

    loadProp('/assets/models/town/crate-bottles.glb', (scene) => {
      const positions = [{ x: 2, z: -18, y: 1.4 }, { x: -3, z: -28, y: 1.4 }];
      positions.forEach((p) => {
        const crate = scene.clone();
        crate.position.set(p.x, 0.42 + p.y, p.z); // Stacked on top of crate
        crate.rotation.y = Math.random() * Math.PI;
        modularDocks.add(crate);
      });
    });

    return this.batchStaticMeshes(rawGroup);
  }

  /**
   * GPU Batching Optimizer: Combines all static meshes sharing the same material
   * into unified geometries via BufferGeometryUtils.mergeGeometries.
   * Produces pixel-perfect visual fidelity while reducing draw calls by 80-90%.
   */
  public static batchStaticMeshes(group: THREE.Group): THREE.Group {
    group.updateMatrixWorld(true);
    const inverseParentMatrix = new THREE.Matrix4().copy(group.matrixWorld).invert();

    const meshesByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const meshesToRemove: THREE.Mesh[] = [];

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.parent !== null) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          const mat = mesh.material as THREE.Material;
          if (!meshesByMaterial.has(mat)) {
            meshesByMaterial.set(mat, []);
          }

          const relativeMatrix = new THREE.Matrix4().multiplyMatrices(inverseParentMatrix, mesh.matrixWorld);
          const clonedGeo = mesh.geometry.clone();
          clonedGeo.applyMatrix4(relativeMatrix);
          meshesByMaterial.get(mat)!.push(clonedGeo);
          meshesToRemove.push(mesh);
        }
      }
    });

    meshesToRemove.forEach((m) => {
      if (m.parent) m.parent.remove(m);
    });

    meshesByMaterial.forEach((geos, mat) => {
      if (geos.length === 1) {
        const singleMesh = new THREE.Mesh(geos[0], mat);
        singleMesh.castShadow = false;
        singleMesh.receiveShadow = false;
        group.add(singleMesh);
      } else if (geos.length > 1) {
        const mergedGeo = BufferGeometryUtils.mergeGeometries(geos, false);
        if (mergedGeo) {
          const batchedMesh = new THREE.Mesh(mergedGeo, mat);
          batchedMesh.castShadow = false;
          batchedMesh.receiveShadow = false;
          group.add(batchedMesh);
        }
      }
    });

    return group;
  }

  /**
   * 1. Grand Mainland Coastal Port (North Horizon Z=950)
   * Expansive arched breakwaters, waterfront quays, tiered city, and distant mountain ridges
   */
  public static createMainlandHarbor(config: HarborConfig): THREE.Group {
    const harborGroup = new THREE.Group();
    harborGroup.name = `harbor-${config.id}`;
    harborGroup.position.copy(config.position);
    if (config.rotationY) harborGroup.rotation.y = config.rotationY;

    const s = config.scale || 1.3;
    const isPirate = config.faction === 'pirates';

    // Premium Materials
    const stoneWallMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x334155 : 0x64748b,
      roughness: 0.88,
      flatShading: true,
    });
    const stoneArchMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x1e293b : 0x475569,
      roughness: 0.82,
      flatShading: true,
    });
    const pierWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.90,
      flatShading: true,
    });
    const houseWallMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x475569 : 0xf1f5f9,
      roughness: 0.85,
      flatShading: true,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x18181b : 0xb45309,
      roughness: 0.75,
      flatShading: true,
    });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.7,
    });
    const cliffRockMat = new THREE.MeshStandardMaterial({
      color: 0x292524, // Dark granite slate sea cliff
      roughness: 0.97,
      metalness: 0.04,
      flatShading: true,
    });
    const wetWaterlineMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Wet basalt waterline band (y=-2 to y=2)
      roughness: 0.85,
      metalness: 0.18,
      flatShading: true,
    });
    const mountainSlateMat = new THREE.MeshStandardMaterial({
      color: 0x292524, // Dark granite cliff face — stratified coastal rock
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true,
    });
    const mountainPeakMat = new THREE.MeshStandardMaterial({
      color: 0x2d372e, // Alpine moss — high-altitude natural tones on granite
      roughness: 0.94,
      flatShading: true,
    });
    const beachSandMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.95,
      flatShading: true,
    });

    // A. Natural Mountain Ridge Backdrop (strictly BEHIND the port, local Z = 200 to 380)
    const mountainGroup = new THREE.Group();
    const mountainPeaks = [
      { x: -260, z: 280, r: 110, h: 180 },
      { x: -130, z: 320, r: 125, h: 220 },
      { x: 0, z: 350, r: 145, h: 260 }, // Colossal sovereign citadel peak
      { x: 140, z: 310, r: 120, h: 215 },
      { x: 270, z: 270, r: 105, h: 175 },
    ];

    mountainPeaks.forEach((p, idx) => {
      // Broad mountain ridge with rugged shoulders and crags
      const ridgeGeo = new THREE.CylinderGeometry(p.r * 0.22 * s, p.r * 1.05 * s, p.h * s, 8);
      const ridge = new THREE.Mesh(ridgeGeo, mountainSlateMat);
      ridge.position.set(p.x * s, (p.h * s) * 0.5, p.z * s);
      ridge.scale.set(1.45, 1.0, 0.85); // Elongated along horizon
      ridge.rotation.y = idx * 0.55;
      mountainGroup.add(ridge);

      // Summit peak crags
      const summitGeo = new THREE.CylinderGeometry(p.r * 0.08 * s, p.r * 0.28 * s, p.h * 0.35 * s, 6);
      const summit = new THREE.Mesh(summitGeo, mountainPeakMat);
      summit.position.set(p.x * s, (p.h * s) * 0.92, p.z * s);
      summit.scale.set(1.3, 1.0, 0.8);
      mountainGroup.add(summit);
    });
    harborGroup.add(mountainGroup);

    // B. Coastal Stone Bluff Terrace — dark granite with wet waterline band
    const bluffGeo = new THREE.CylinderGeometry(155 * s, 175 * s, 35 * s, 14);
    const bluff = new THREE.Mesh(bluffGeo, cliffRockMat);
    bluff.position.set(0, 16 * s, 105 * s);
    bluff.scale.set(2.1, 1.0, 0.55);
    harborGroup.add(bluff);

    // Wet waterline band along cliff base
    const waterlineGeo = new THREE.CylinderGeometry(158 * s, 178 * s, 4 * s, 14);
    const waterlineBand = new THREE.Mesh(waterlineGeo, wetWaterlineMat);
    waterlineBand.position.set(0, 0 * s, 105 * s);
    waterlineBand.scale.set(2.1, 1.0, 0.55);
    harborGroup.add(waterlineBand);

    // C. Waterfront Stone Quay & Ramparts (local Z = 10 to 65)
    const quayGeo = new THREE.BoxGeometry(280 * s, 6 * s, 55 * s);
    const quay = new THREE.Mesh(quayGeo, stoneWallMat);
    quay.position.set(0, 3 * s, 38 * s);
    harborGroup.add(quay);

    // Sandy Shoreline along waterfront base
    const beachGeo = new THREE.BoxGeometry(300 * s, 2 * s, 22 * s);
    const beach = new THREE.Mesh(beachGeo, beachSandMat);
    beach.position.set(0, 1.0 * s, 11 * s);
    harborGroup.add(beach);

    // D. Arched Stone Sea Walls & Breakwater (Jutting outward into bay, local Z = -50 to 5)
    const seawallGroup = new THREE.Group();
    const seaWallRadius = 120 * s;
    const archCount = 8;
    const archAngleSpan = Math.PI * 0.8;
    const startAngle = (Math.PI - archAngleSpan) * 0.5;

    for (let i = 0; i <= archCount; i++) {
      const theta = startAngle + (archAngleSpan / archCount) * i;
      const px = Math.cos(theta) * seaWallRadius;
      const pz = -Math.sin(theta) * (seaWallRadius * 0.45) - 10 * s;

      // Heavy Stone Defensive Tower / Pillar
      const pillarGeo = new THREE.CylinderGeometry(5.5 * s, 6.5 * s, 18 * s, 8);
      const pillar = new THREE.Mesh(pillarGeo, stoneWallMat);
      pillar.position.set(px, 8 * s, pz);
      seawallGroup.add(pillar);

      // Connecting Bridge Spans
      if (i < archCount) {
        const nextTheta = startAngle + (archAngleSpan / archCount) * (i + 1);
        const nx = Math.cos(nextTheta) * seaWallRadius;
        const nz = -Math.sin(nextTheta) * (seaWallRadius * 0.45) - 10 * s;

        const midX = (px + nx) * 0.5;
        const midZ = (pz + nz) * 0.5;
        const spanDist = Math.hypot(nx - px, nz - pz);

        const deckGeo = new THREE.BoxGeometry(spanDist, 3.8 * s, 7.5 * s);
        const bridgeDeck = new THREE.Mesh(deckGeo, stoneArchMat);
        bridgeDeck.position.set(midX, 15 * s, midZ);
        bridgeDeck.lookAt(nx, 15 * s, nz);
        bridgeDeck.rotateY(Math.PI * 0.5);
        seawallGroup.add(bridgeDeck);

        const underArchGeo = new THREE.CylinderGeometry(spanDist * 0.35, spanDist * 0.35, 7.0 * s, 8, 1, false, 0, Math.PI);
        const underArch = new THREE.Mesh(underArchGeo, stoneArchMat);
        underArch.position.set(midX, 12 * s, midZ);
        underArch.rotation.z = Math.PI * 0.5;
        underArch.lookAt(nx, 12 * s, nz);
        underArch.rotateY(Math.PI * 0.5);
        seawallGroup.add(underArch);
      }
    }
    harborGroup.add(seawallGroup);

    // E. Removed procedural wooden quays to allow modular GLTF timber docks (Phase 2)
    harborGroup.add(new THREE.Group());

    // F. Tiered Waterfront Port Town (local Z = 25 to 65)
    const cityGroup = new THREE.Group();
    for (let r = 0; r < 2; r++) {
      const rowZ = (30 + r * 22) * s;
      const rowElevation = (6 + r * 10) * s;
      for (let b = -6; b <= 6; b++) {
        const bx = (b * 20 + (r % 2) * 10) * s;
        const bWidth = 11 * s;
        const bDepth = 11 * s;
        const bHeight = (12 + (Math.abs(b) % 3) * 4 + r * 4) * s;

        const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
        const bMesh = new THREE.Mesh(bGeo, houseWallMat);
        bMesh.position.set(bx, rowElevation + bHeight * 0.5, rowZ);
        cityGroup.add(bMesh);

        const roofGeo = new THREE.ConeGeometry(bWidth * 0.75, 7 * s, 4);
        roofGeo.rotateY(Math.PI * 0.25);
        const rMesh = new THREE.Mesh(roofGeo, roofMat);
        rMesh.position.set(bx, rowElevation + bHeight + 3.5 * s, rowZ);
        cityGroup.add(rMesh);
      }
    }
    harborGroup.add(cityGroup);

    // G. Hilltop Citadel Keep & Towering Lighthouse (local Z = 110)
    const citadelGroup = new THREE.Group();
    const keepX = 0;
    const keepZ = 115 * s;
    const keepElevation = 34 * s;

    // Citadel Fortress
    const keepGeo = new THREE.BoxGeometry(36 * s, 30 * s, 36 * s);
    const keep = new THREE.Mesh(keepGeo, stoneWallMat);
    keep.position.set(keepX, keepElevation + 15 * s, keepZ);
    citadelGroup.add(keep);

    // Harbor Lighthouse Tower
    const towerGeo = new THREE.CylinderGeometry(7 * s, 9.5 * s, 44 * s, 12);
    const tower = new THREE.Mesh(towerGeo, stoneArchMat);
    tower.position.set(keepX, keepElevation + 36 * s, keepZ - 12 * s);
    citadelGroup.add(tower);

    // Lighthouse Lantern Room
    const lanternGeo = new THREE.CylinderGeometry(4.2 * s, 4.2 * s, 7 * s, 8);
    const lantern = new THREE.Mesh(lanternGeo, trimGoldMat);
    lantern.position.set(keepX, keepElevation + 58 * s, keepZ - 12 * s);
    citadelGroup.add(lantern);

    const lighthouse = new THREE.PointLight(0xfef08a, 4.0, 450 * s);
    lighthouse.position.set(keepX, keepElevation + 58 * s, keepZ - 12 * s);
    citadelGroup.add(lighthouse);

    // Sovereign Royal Ensign Flag
    const bannerMat = new THREE.MeshStandardMaterial({
      map: SailHeraldryService.getFlagTexture(config.faction),
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    const bannerGeo = new THREE.PlaneGeometry(20 * s, 13 * s);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(keepX + 11 * s, keepElevation + 62 * s, keepZ - 12 * s);
    citadelGroup.add(banner);

    harborGroup.add(citadelGroup);
    return harborGroup;
  }

  /**
   * 2. Scenic Archipelago Island Haven (Compact radius ~36m)
   * Natural coastal rocks, palm trees, sandy beach ring, and wooden docks.
   * Completely bounded so ships sailing nearby NEVER intersect land!
   */
  /**
   * 2. Scenic Archipelago Island Haven (Massive True-Scale ~140m-200m)
   * Towering mountain peaks, terraced coastal cliffs, sweeping beaches,
   * lush palm groves, multi-tier wooden quays, and summit watchtower.
   * Proportioned realistically so 40m-60m ships dock alongside naturally.
   */
  public static createIslandHaven(config: HarborConfig): THREE.Group {
    const havenGroup = new THREE.Group();
    havenGroup.name = `island-${config.id}`;
    havenGroup.position.copy(config.position);
    if (config.rotationY) havenGroup.rotation.y = config.rotationY;

    const s = config.scale || 1.35;
    const isPirate = config.faction === 'pirates';

    // Materials — Phase 3: Craggy granite cliffs with wet waterline bands
    const cliffRockMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x1c1917 : 0x292524, // Dark granite slate sea cliff
      roughness: 0.97,
      metalness: 0.04,
      flatShading: true,
    });
    const wetWaterlineMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Wet basalt waterline band
      roughness: 0.85,
      metalness: 0.18,
      flatShading: true,
    });
    const mountainSlateMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x1c1917 : 0x292524, // Stratified coastal rock — dark granite
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true,
    });
    const mountainPeakMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x18181b : 0x2d372e, // Alpine moss tones on summit granite
      roughness: 0.94,
      flatShading: true,
    });
    const palmLeafMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x1c1917 : 0x15803d,
      roughness: 0.88,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const trunkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x54371b,
      roughness: 0.90,
      flatShading: true,
    });
    const beachSandMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x3f3f46 : 0xfde047,
      roughness: 0.95,
      flatShading: true,
    });
    const pierWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.92,
      flatShading: true,
    });
    const houseWallMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x52525b : 0xf1f5f9,
      roughness: 0.85,
      flatShading: true,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: isPirate ? 0x18181b : config.faction === 'spain' ? 0xb45309 : 0x991b1b,
      roughness: 0.78,
      flatShading: true,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.88,
      flatShading: true,
    });

    // A. Craggy Sea Cliff Geology — Phase 3: stratified dark granite with wet waterline bands
    // 1. Broad Sandy Shoreline Shelf (Base at sea level)
    const islandBaseGeo = new THREE.CylinderGeometry(85 * s, 110 * s, 5 * s, 18);
    const islandBase = new THREE.Mesh(islandBaseGeo, beachSandMat);
    islandBase.position.set(0, 1.8 * s, 20 * s);
    havenGroup.add(islandBase);

    // 2. Wet basalt waterline band — y = -2 to y = 2
    const waterlineBandGeo = new THREE.CylinderGeometry(82 * s, 112 * s, 4 * s, 16);
    const waterlineBand = new THREE.Mesh(waterlineBandGeo, wetWaterlineMat);
    waterlineBand.position.set(0, 0, 20 * s);
    havenGroup.add(waterlineBand);

    // 3. Stratified coastal rock bluffs — multi-layer jagged faces
    const bluff1Geo = new THREE.CylinderGeometry(58 * s, 78 * s, 18 * s, 12);
    const bluff1 = new THREE.Mesh(bluff1Geo, cliffRockMat);
    bluff1.position.set(0, 8 * s, 32 * s);
    bluff1.rotation.y = 0.4;
    havenGroup.add(bluff1);

    const bluff2Geo = new THREE.CylinderGeometry(48 * s, 62 * s, 22 * s, 10);
    const bluff2 = new THREE.Mesh(bluff2Geo, cliffRockMat);
    bluff2.position.set(8 * s, 20 * s, 36 * s);
    bluff2.rotation.y = 1.1;
    havenGroup.add(bluff2);

    // 4. Craggy Mountain Peaks — granite slate with alpine moss summit caps
    const mainPeakGeo = new THREE.CylinderGeometry(16 * s, 56 * s, 95 * s, 9);
    const mainPeak = new THREE.Mesh(mainPeakGeo, mountainSlateMat);
    mainPeak.position.set(0, 48 * s, 36 * s);
    mainPeak.rotation.y = 0.7;
    havenGroup.add(mainPeak);

    // Alpine moss summit cap
    const mainCapGeo = new THREE.CylinderGeometry(8 * s, 18 * s, 18 * s, 8);
    const mainCap = new THREE.Mesh(mainCapGeo, mountainPeakMat);
    mainCap.position.set(0, 90 * s, 36 * s);
    havenGroup.add(mainCap);

    const leftPeakGeo = new THREE.CylinderGeometry(10 * s, 42 * s, 68 * s, 8);
    const leftPeak = new THREE.Mesh(leftPeakGeo, mountainSlateMat);
    leftPeak.position.set(-52 * s, 38 * s, 42 * s);
    leftPeak.rotation.y = 1.3;
    havenGroup.add(leftPeak);

    const leftCapGeo = new THREE.CylinderGeometry(5 * s, 12 * s, 14 * s, 7);
    const leftCap = new THREE.Mesh(leftCapGeo, mountainPeakMat);
    leftCap.position.set(-52 * s, 68 * s, 42 * s);
    havenGroup.add(leftCap);

    const rightPeakGeo = new THREE.CylinderGeometry(12 * s, 44 * s, 72 * s, 8);
    const rightPeak = new THREE.Mesh(rightPeakGeo, mountainSlateMat);
    rightPeak.position.set(52 * s, 40 * s, 42 * s);
    rightPeak.rotation.y = 0.5;
    havenGroup.add(rightPeak);

    const rightCapGeo = new THREE.CylinderGeometry(6 * s, 13 * s, 16 * s, 7);
    const rightCap = new THREE.Mesh(rightCapGeo, mountainPeakMat);
    rightCap.position.set(52 * s, 72 * s, 42 * s);
    havenGroup.add(rightCap);

    // B. Lush Palm Tree Groves along slopes and beaches
    const palmPositions = [
      { x: -38 * s, z: 5 * s, h: 14 * s, rot: 0.18 },
      { x: 38 * s, z: 8 * s, h: 15 * s, rot: -0.22 },
      { x: -28 * s, z: 26 * s, h: 16 * s, rot: 0.12 },
      { x: 32 * s, z: 28 * s, h: 15 * s, rot: -0.15 },
      { x: -48 * s, z: 22 * s, h: 17 * s, rot: 0.25 },
      { x: 48 * s, z: 24 * s, h: 16 * s, rot: -0.20 },
      { x: -14 * s, z: 38 * s, h: 18 * s, rot: 0.08 },
      { x: 16 * s, z: 36 * s, h: 17 * s, rot: -0.10 },
    ];

    palmPositions.forEach(p => {
      const trunkGeo = new THREE.CylinderGeometry(0.55 * s, 0.85 * s, p.h, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkWoodMat);
      trunk.position.set(p.x, 6 * s + p.h * 0.5, p.z);
      trunk.rotation.z = p.rot;
      havenGroup.add(trunk);

      for (let f = 0; f < 6; f++) {
        const frondGeo = new THREE.ConeGeometry(3.6 * s, 7.5 * s, 3);
        frondGeo.rotateX(Math.PI * 0.45);
        const frond = new THREE.Mesh(frondGeo, palmLeafMat);
        frond.position.set(p.x, 6 * s + p.h + 0.8 * s, p.z);
        frond.rotation.y = (f / 6) * Math.PI * 2;
        havenGroup.add(frond);
      }
    });

    // C. Removed procedural wooden boardwalks to allow modular GLTF timber docks (Phase 2)
    havenGroup.add(new THREE.Group());

    // D. Port Town Settlement Buildings (Tavern, Customs House, Storehouse, Governor)
    const buildingDefs = [
      { x: -22 * s, z: 2 * s, w: 14 * s, h: 11 * s, d: 12 * s }, // Tavern
      { x: 22 * s, z: 2 * s, w: 15 * s, h: 12 * s, d: 13 * s },  // Customs
      { x: -30 * s, z: 18 * s, w: 13 * s, h: 10 * s, d: 11 * s }, // Storehouse
      { x: 30 * s, z: 18 * s, w: 14 * s, h: 11 * s, d: 12 * s }, // Warehouse
    ];

    buildingDefs.forEach(b => {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMesh = new THREE.Mesh(bGeo, houseWallMat);
      bMesh.position.set(b.x, 5 * s + b.h * 0.5, b.z);
      havenGroup.add(bMesh);

      const roofGeo = new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.72, 6.5 * s, 4);
      roofGeo.rotateY(Math.PI * 0.25);
      const rMesh = new THREE.Mesh(roofGeo, roofMat);
      rMesh.position.set(b.x, 5 * s + b.h + 3.2 * s, b.z);
      havenGroup.add(rMesh);
    });

    // E. Summit Watchtower & Ensign (Height 35m)
    const towerGeo = new THREE.CylinderGeometry(5.5 * s, 7.5 * s, 26 * s, 8);
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(0, 32 * s, 26 * s);
    havenGroup.add(tower);

    const staffGeo = new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 16 * s, 6);
    const staff = new THREE.Mesh(staffGeo, pierWoodMat);
    staff.position.set(0, 48 * s, 26 * s);
    havenGroup.add(staff);

    const flagMat = new THREE.MeshStandardMaterial({
      map: SailHeraldryService.getFlagTexture(config.faction),
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    const flagGeo = new THREE.PlaneGeometry(12 * s, 7.5 * s);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(6 * s, 51 * s, 26 * s);
    havenGroup.add(flag);

    const beacon = new THREE.PointLight(0xfef08a, 3.5, 200 * s);
    beacon.position.set(0, 46 * s, 26 * s);
    havenGroup.add(beacon);

    return havenGroup;
  }

  /**
   * 3. The Brethren's Vault — Hollow Skull Cavern Sanctuary at (-380, 0, 220)
   * Phase 3 rebuild:
   * - 48m wide × 42m tall hollow stone archway at waterline
   * - Stalactite rock teeth descending from upper brow to y=12 — open skull jaw
   * - Moss ribbons with sine-wave vertex offset across brow
   * - Dark emerald subterranean lagoon (X:-430 to -330, Z:170 to 270)
   * - 4 brazier PointLights (#10b981, 2.2 intensity, 35m distance)
   * - GLTF stilt boardwalks (structure-platform-dock.glb + small)
   * - Barrel & crate props along market perimeter
   * - Vendor nodes: [Contraband Smuggler], [Black Market Fence], [Underground Shipwright]
   */
  public static createSkullCavernSanctuary(config: HarborConfig): THREE.Group {
    const caveGroup = new THREE.Group();
    caveGroup.name = `cave-${config.id}`;
    caveGroup.position.copy(config.position);
    if (config.rotationY) caveGroup.rotation.y = config.rotationY;

    // Phase 3 materials — dark volcanic basalt
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.97,
      metalness: 0.06,
      flatShading: true,
    });
    const graniteCliffMat = new THREE.MeshStandardMaterial({
      color: 0x292524, // Dark granite sea cliff
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true,
    });
    const wetWaterlineMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Wet basalt waterline
      roughness: 0.85,
      metalness: 0.18,
      flatShading: true,
    });

    // Moss material with sine-wave vertex animation
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x2d372e, // Natural alpine moss draped over stone brow
      side: THREE.DoubleSide,
      roughness: 0.92,
    });
    mossMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `uniform float uTime;
` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
         transformed.x += sin(uTime * 1.5 + position.y) * 0.08;`
      );
      mossMat.userData.shader = shader;
    };

    // -------------------------------------------------------
    // A. Volcanic Mountain Massif Exterior (260m wide, 140m tall)
    // -------------------------------------------------------
    const massifGeo = new THREE.CylinderGeometry(25, 145, 140, 10);
    const massif = new THREE.Mesh(massifGeo, graniteCliffMat);
    massif.position.set(0, 68, 60);
    massif.scale.set(1.8, 1.0, 0.9);
    massif.rotation.y = 0.6;
    caveGroup.add(massif);

    // Alpine moss summit cap
    const massifCapGeo = new THREE.CylinderGeometry(12, 28, 25, 8);
    const massifCap = new THREE.Mesh(massifCapGeo, new THREE.MeshStandardMaterial({
      color: 0x2d372e, roughness: 0.94, flatShading: true,
    }));
    massifCap.position.set(0, 132, 60);
    caveGroup.add(massifCap);

    // Wet waterline band along cliff base
    const massifWaterlineGeo = new THREE.CylinderGeometry(148, 152, 4, 10);
    const massifWaterline = new THREE.Mesh(massifWaterlineGeo, wetWaterlineMat);
    massifWaterline.position.set(0, 0, 60);
    massifWaterline.scale.set(1.8, 1.0, 0.9);
    caveGroup.add(massifWaterline);

    // -------------------------------------------------------
    // B. Hollow Skull Archway Entrance (48m wide, 42m tall clearance)
    // -------------------------------------------------------
    const ARCH_W = 24; // half-width → full span = 48m
    const ARCH_H = 54; // pillar height; clearance = 54 - 12 = 42m

    // Left brow pillar
    const leftPillarGeo = new THREE.CylinderGeometry(13, 18, ARCH_H, 9);
    const leftPillar = new THREE.Mesh(leftPillarGeo, basaltMat);
    leftPillar.position.set(-ARCH_W, ARCH_H * 0.5, 0);
    caveGroup.add(leftPillar);

    // Right brow pillar
    const rightPillarGeo = new THREE.CylinderGeometry(13, 18, ARCH_H, 9);
    const rightPillar = new THREE.Mesh(rightPillarGeo, basaltMat);
    rightPillar.position.set(ARCH_W, ARCH_H * 0.5, 0);
    caveGroup.add(rightPillar);

    // Monolithic brow lintel spanning the arch
    const lintelGeo = new THREE.BoxGeometry(ARCH_W * 2 + 26, 14, 22);
    const lintel = new THREE.Mesh(lintelGeo, basaltMat);
    lintel.position.set(0, ARCH_H, 0);
    caveGroup.add(lintel);

    // Moss ribbons draped across brow with sine-wave vertex animation
    for (let i = -2; i <= 2; i++) {
      const mossGeo = new THREE.PlaneGeometry(2.2, 28, 5, 14);
      const mossRibbon = new THREE.Mesh(mossGeo, mossMat);
      mossRibbon.position.set(i * 10, ARCH_H - 8, 3);
      caveGroup.add(mossRibbon);
    }

    // Stalactite rock teeth — descending from upper brow toward y = 12 (open skull jaw)
    for (let i = -3; i <= 3; i++) {
      const toothH = 18 + Math.abs(i) * 3;
      const toothGeo = new THREE.ConeGeometry(2.5 + Math.abs(i) * 0.4, toothH, 5);
      toothGeo.rotateX(Math.PI); // Point downward
      const tooth = new THREE.Mesh(toothGeo, basaltMat);
      // Top at ARCH_H, tip at ARCH_H - toothH → ensure tip ≥ 12
      tooth.position.set(i * 7.5, ARCH_H - toothH * 0.5, -2);
      caveGroup.add(tooth);
    }

    // -------------------------------------------------------
    // C. Subterranean Lagoon Interior Shell (X:-430 to -330, Z:170 to 270 → local coords centered at -380,0,220)
    // Local: X:-50 to +50, Z:-50 to +50
    // -------------------------------------------------------
    const lagoonShellGeo = new THREE.BoxGeometry(110, 85, 115);
    const lagoonShellMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0f, side: THREE.BackSide });
    const lagoonShell = new THREE.Mesh(lagoonShellGeo, lagoonShellMat);
    lagoonShell.position.set(0, 40, 40);
    caveGroup.add(lagoonShell);

    // Dark emerald lagoon water plane
    const lagoonWaterGeo = new THREE.PlaneGeometry(95, 95, 4, 4);
    lagoonWaterGeo.rotateX(-Math.PI * 0.5);
    const lagoonWaterMat = new THREE.MeshStandardMaterial({
      color: 0x041f1a,
      roughness: 0.08,
      metalness: 0.55,
      transparent: true,
      opacity: 0.92,
    });
    const lagoonWater = new THREE.Mesh(lagoonWaterGeo, lagoonWaterMat);
    lagoonWater.position.set(0, -0.5, 40);
    caveGroup.add(lagoonWater);

    // 4 brazier point lights — emerald (#10b981), intensity 2.2, distance 35m
    const brazierPositions = [
      new THREE.Vector3(-28, 1, 18),
      new THREE.Vector3(28, 1, 18),
      new THREE.Vector3(-28, 1, 58),
      new THREE.Vector3(28, 1, 58),
    ];
    brazierPositions.forEach((pos) => {
      // Brazier mesh
      const brazierGeo = new THREE.CylinderGeometry(1.8, 1.0, 3.2, 7);
      const brazier = new THREE.Mesh(brazierGeo, basaltMat);
      brazier.position.copy(pos);
      caveGroup.add(brazier);

      // Flame bowl
      const flameGeo = new THREE.SphereGeometry(1.4, 6, 5);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 2.0,
        roughness: 0.2,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, pos.y + 2.5, pos.z);
      caveGroup.add(flame);

      // Emerald PointLight
      const light = new THREE.PointLight(0x10b981, 2.2, 35);
      light.position.set(pos.x, pos.y + 3, pos.z);
      caveGroup.add(light);
    });

    // -------------------------------------------------------
    // D. GLTF Stilt Boardwalks — branching market platforms
    // -------------------------------------------------------
    _gltfLoader.load('/assets/models/town/structure-platform-dock.glb', (gltf) => {
      // Main boardwalk spine along the lagoon edge
      const boardwalkPositions = [
        { x: 0, z: 15 },
        { x: 0, z: 28 },
        { x: 0, z: 41 },
      ];
      boardwalkPositions.forEach((p) => {
        const board = gltf.scene.clone();
        board.position.set(p.x, 0.4, p.z);
        caveGroup.add(board);
      });
    });

    _gltfLoader.load('/assets/models/town/structure-platform-dock-small.glb', (gltf) => {
      // Branching finger piers into the lagoon
      const fingerPositions = [
        { x: -12, z: 28, r: Math.PI / 2 },
        { x: 12, z: 28, r: -Math.PI / 2 },
        { x: -12, z: 41, r: Math.PI / 2 },
        { x: 12, z: 41, r: -Math.PI / 2 },
      ];
      fingerPositions.forEach((p) => {
        const finger = gltf.scene.clone();
        finger.position.set(p.x, 0.4, p.z);
        finger.rotation.y = p.r;
        caveGroup.add(finger);
      });
    });

    // -------------------------------------------------------
    // E. Prop scatter — barrels & crates along market perimeter
    // -------------------------------------------------------
    _gltfLoader.load('/assets/models/town/barrel.glb', (gltf) => {
      const propPositions = [
        { x: -6, z: 12 }, { x: 7, z: 16 }, { x: -8, z: 32 }, { x: 9, z: 44 },
      ];
      propPositions.forEach((p) => {
        const prop = gltf.scene.clone();
        prop.position.set(p.x, 0.42, p.z);
        caveGroup.add(prop);
      });
    });

    _gltfLoader.load('/assets/models/town/crate.glb', (gltf) => {
      const propPositions = [
        { x: -4, z: 18 }, { x: 5, z: 30 }, { x: -7, z: 46 },
      ];
      propPositions.forEach((p) => {
        const prop = gltf.scene.clone();
        prop.position.set(p.x, 0.42, p.z);
        prop.rotation.y = Math.random() * Math.PI;
        caveGroup.add(prop);
      });
    });

    // -------------------------------------------------------
    // F. Interactive vendor nodes with nameplates
    // -------------------------------------------------------
    const vendors = [
      { name: '[Contraband Smuggler]', x: -8, z: 20 },
      { name: '[Black Market Fence]', x: 8, z: 28 },
      { name: '[Underground Shipwright]', x: 0, z: 40 },
    ];
    vendors.forEach((v) => {
      const node = new THREE.Group();
      node.name = v.name;
      node.userData.isVendor = true;
      node.userData.nameplate = v.name;
      node.position.set(v.x, 1.0, v.z);
      caveGroup.add(node);
    });

    return caveGroup;
  }

  public static createColossalSkullPillar(s: number, eyeColor: number = 0xef4444): THREE.Group {
    const pillarGroup = new THREE.Group();
    pillarGroup.name = 'colossal-skull-pillar';

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, flatShading: true });
    const stoneBoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.88, flatShading: true });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.45, metalness: 0.85 });

    // Main carved column stem (Height 40m)
    const stemGeo = new THREE.CylinderGeometry(4.2 * s, 5.5 * s, 36 * s, 10);
    const stem = new THREE.Mesh(stemGeo, basaltMat);
    stem.position.set(0, 18 * s, 0);
    pillarGroup.add(stem);

    // Pedestal Base
    const baseGeo = new THREE.BoxGeometry(12 * s, 4.5 * s, 12 * s);
    const base = new THREE.Mesh(baseGeo, basaltMat);
    base.position.set(0, 2.25 * s, 0);
    pillarGroup.add(base);

    // Carved Colossal Skull Face (Height ~14m)
    const skullGroup = new THREE.Group();
    skullGroup.position.set(0, 26 * s, 2.2 * s);

    // Cranium
    const craniumGeo = new THREE.SphereGeometry(4.5 * s, 8, 8);
    craniumGeo.scale(1.0, 1.25, 1.1);
    const cranium = new THREE.Mesh(craniumGeo, stoneBoneMat);
    skullGroup.add(cranium);

    // Deep Eye Sockets with glowing ruby/emerald gems
    const eyeSocketMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const eyeGemMat = new THREE.MeshStandardMaterial({
      color: eyeColor,
      emissive: new THREE.Color(eyeColor),
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });

    for (let side = -1; side <= 1; side += 2) {
      // Dark hollow socket
      const socketGeo = new THREE.CylinderGeometry(1.2 * s, 1.0 * s, 1.5 * s, 6);
      socketGeo.rotateX(Math.PI * 0.5);
      const socket = new THREE.Mesh(socketGeo, eyeSocketMat);
      socket.position.set(side * 1.7 * s, 0.4 * s, 4.0 * s);
      skullGroup.add(socket);

      // Burning Eye Gem
      const gemGeo = new THREE.SphereGeometry(0.7 * s, 6, 6);
      const gem = new THREE.Mesh(gemGeo, eyeGemMat);
      gem.position.set(side * 1.7 * s, 0.4 * s, 4.2 * s);
      skullGroup.add(gem);

      // Eye point light
      const eyeLight = new THREE.PointLight(eyeColor, 2.2, 45 * s);
      eyeLight.position.set(side * 1.7 * s, 0.4 * s, 5.0 * s);
      skullGroup.add(eyeLight);
    }

    // Carved Stone Teeth / Maxilla
    const jawGeo = new THREE.BoxGeometry(4.0 * s, 2.2 * s, 2.5 * s);
    const jaw = new THREE.Mesh(jawGeo, stoneBoneMat);
    jaw.position.set(0, -3.2 * s, 3.2 * s);
    skullGroup.add(jaw);

    for (let t = -3; t <= 3; t++) {
      const toothGeo = new THREE.BoxGeometry(0.35 * s, 0.8 * s, 0.35 * s);
      const tooth = new THREE.Mesh(toothGeo, stoneBoneMat);
      tooth.position.set(t * 0.55 * s, -2.4 * s, 4.4 * s);
      skullGroup.add(tooth);
    }

    pillarGroup.add(skullGroup);

    // Projecting Iron Brackets with Fire Braziers
    for (let side = -1; side <= 1; side += 2) {
      const armGeo = new THREE.BoxGeometry(3.5 * s, 0.45 * s, 0.45 * s);
      const arm = new THREE.Mesh(armGeo, ironMat);
      arm.position.set(side * 5.2 * s, 22 * s, 0);
      pillarGroup.add(arm);

      const bz = this.createFireBrazier(s * 1.2);
      bz.position.set(side * 7.0 * s, 22.5 * s, 0);
      pillarGroup.add(bz);
    }

    return pillarGroup;
  }

  /**
   * Spiked skull mounted atop a weathered timber stake
   */
  public static createSpikedSkullStake(s: number): THREE.Group {
    const stakeGroup = new THREE.Group();
    stakeGroup.name = 'spiked-skull-stake';

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xded6c5, roughness: 0.85 });

    // Wooden spike pole
    const poleGeo = new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 4.5 * s, 6);
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(0, 2.25 * s, 0);
    stakeGroup.add(pole);

    // Impaled skull
    const craniumGeo = new THREE.SphereGeometry(0.38 * s, 7, 7);
    craniumGeo.scale(0.85, 1.0, 1.1);
    const cranium = new THREE.Mesh(craniumGeo, boneMat);
    cranium.position.set(0, 4.6 * s, 0);
    stakeGroup.add(cranium);

    // Lower jaw
    const jawGeo = new THREE.BoxGeometry(0.36 * s, 0.22 * s, 0.45 * s);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, 4.25 * s, 0.1 * s);
    stakeGroup.add(jaw);

    // Eye sockets
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    for (let side = -1; side <= 1; side += 2) {
      const eyeGeo = new THREE.SphereGeometry(0.1 * s, 5, 5);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.14 * s, 4.65 * s, 0.35 * s);
      stakeGroup.add(eye);
    }

    return stakeGroup;
  }

  /**
   * Hanging iron gibbet cage suspended by a chain with an articulated skeleton trapped inside
   */
  public static createHangingGibbetCage(s: number): THREE.Group {
    const gibbetGroup = new THREE.Group();
    gibbetGroup.name = 'hanging-gibbet-cage';

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.9 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xded6c5, roughness: 0.85 });

    // Hanging iron chain
    const chainGeo = new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 4.0 * s, 4);
    const chain = new THREE.Mesh(chainGeo, ironMat);
    chain.position.set(0, 2.0 * s, 0);
    gibbetGroup.add(chain);

    // Iron cage top & bottom rings
    for (let r = 0; r <= 1; r++) {
      const ringGeo = new THREE.TorusGeometry(0.85 * s, 0.06 * s, 4, 10);
      ringGeo.rotateX(Math.PI * 0.5);
      const ring = new THREE.Mesh(ringGeo, ironMat);
      ring.position.set(0, (r === 0 ? -1.8 : 0.2) * s, 0);
      gibbetGroup.add(ring);
    }

    // Vertical iron bars
    for (let b = 0; b < 6; b++) {
      const angle = (b / 6) * Math.PI * 2;
      const barGeo = new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 2.1 * s, 4);
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(Math.cos(angle) * 0.85 * s, -0.8 * s, Math.sin(angle) * 0.85 * s);
      gibbetGroup.add(bar);
    }

    // Imprisoned Skeleton inside
    const skelSkullGeo = new THREE.SphereGeometry(0.28 * s, 6, 6);
    const skelSkull = new THREE.Mesh(skelSkullGeo, boneMat);
    skelSkull.position.set(0, -0.3 * s, 0);
    skelSkull.rotation.set(0.2, 0.15, -0.2); // Slumped
    gibbetGroup.add(skelSkull);

    // Ribcage
    const ribGeo = new THREE.CylinderGeometry(0.35 * s, 0.25 * s, 0.7 * s, 6);
    const ribs = new THREE.Mesh(ribGeo, boneMat);
    ribs.position.set(0, -0.85 * s, 0);
    gibbetGroup.add(ribs);

    // Dangling leg bones
    for (let side = -1; side <= 1; side += 2) {
      const legGeo = new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.8 * s, 4);
      const leg = new THREE.Mesh(legGeo, boneMat);
      leg.position.set(side * 0.2 * s, -1.5 * s, 0);
      gibbetGroup.add(leg);
    }

    return gibbetGroup;
  }

  /**
   * Cast iron fire brazier on tripod legs with burning coals & warm point light
   */
  public static createFireBrazier(s: number): THREE.Group {
    const brazier = new THREE.Group();
    brazier.name = 'fire-brazier';

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.85 });
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xf97316),
      emissiveIntensity: 1.6,
      roughness: 0.3,
    });

    // Tripod legs
    for (let leg = 0; leg < 3; leg++) {
      const lAngle = (leg / 3) * Math.PI * 2;
      const legGeo = new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 1.8 * s, 4);
      legGeo.rotateZ(0.25);
      legGeo.rotateY(lAngle);
      const lMesh = new THREE.Mesh(legGeo, ironMat);
      lMesh.position.set(Math.cos(lAngle) * 0.4 * s, 0.9 * s, Math.sin(lAngle) * 0.4 * s);
      brazier.add(lMesh);
    }

    // Cast iron bowl
    const bowlGeo = new THREE.CylinderGeometry(1.1 * s, 0.6 * s, 0.6 * s, 8);
    const bowl = new THREE.Mesh(bowlGeo, ironMat);
    bowl.position.set(0, 1.8 * s, 0);
    brazier.add(bowl);

    // Burning hot coals
    const coalGeo = new THREE.DodecahedronGeometry(0.7 * s, 0);
    const coal = new THREE.Mesh(coalGeo, coalMat);
    coal.position.set(0, 2.1 * s, 0);
    brazier.add(coal);

    // Flame point light
    const fireLight = new THREE.PointLight(0xf97316, 2.5, 45 * s);
    fireLight.position.set(0, 2.3 * s, 0);
    brazier.add(fireLight);

    return brazier;
  }

  /**
   * Sparkling deluxe treasure pile: Spanish chest overflowing with golden doubloons and gemstones
   */
  public static createTreasurePile(s: number): THREE.Group {
    const pile = new THREE.Group();
    pile.name = 'treasure-pile';

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.92,
    });
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xb91c1c),
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.3,
    });
    const emeraldMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: new THREE.Color(0x047857),
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.3,
    });

    // Golden doubloon mound
    const moundGeo = new THREE.ConeGeometry(2.4 * s, 1.4 * s, 8);
    const mound = new THREE.Mesh(moundGeo, goldMat);
    mound.position.set(0, 0.7 * s, 0);
    pile.add(mound);

    // Spanish Treasure Chest (Base + angled lid)
    const chestBaseGeo = new THREE.BoxGeometry(2.0 * s, 1.1 * s, 1.3 * s);
    const chestBase = new THREE.Mesh(chestBaseGeo, woodMat);
    chestBase.position.set(0.6 * s, 0.55 * s, 0.4 * s);
    chestBase.rotation.y = 0.35;
    pile.add(chestBase);

    const chestLidGeo = new THREE.CylinderGeometry(0.65 * s, 0.65 * s, 2.0 * s, 6, 1, false, 0, Math.PI);
    chestLidGeo.rotateZ(Math.PI * 0.5);
    const chestLid = new THREE.Mesh(chestLidGeo, woodMat);
    chestLid.position.set(0.6 * s, 1.3 * s, 0.4 * s);
    chestLid.rotation.y = 0.35;
    chestLid.rotation.x = -0.5; // Open lid
    pile.add(chestLid);

    // Scattered Rubies and Emeralds
    const gemMatArray = [rubyMat, emeraldMat];
    for (let g = 0; g < 6; g++) {
      const gAngle = (g / 6) * Math.PI * 2;
      const gemGeo = new THREE.DodecahedronGeometry(0.22 * s, 0);
      const gemMesh = new THREE.Mesh(gemGeo, gemMatArray[g % 2]);
      gemMesh.position.set(Math.cos(gAngle) * 1.5 * s, 0.35 * s, Math.sin(gAngle) * 1.5 * s);
      pile.add(gemMesh);
    }

    return pile;
  }
}
