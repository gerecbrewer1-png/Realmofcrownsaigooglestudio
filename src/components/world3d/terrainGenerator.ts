import * as THREE from 'three';
import { WorldTile, WorldTerrainType } from '../../types';
import { worldTerrainAssetService, WORLD_HEX_SCALE } from './worldTerrainAssetService';

export const HEX_SIZE = 24;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export function hexToWorldCoords(q: number, r: number): { x: number; z: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = HEX_SIZE * ((3 / 2) * r);
  return { x, z };
}

export function worldToHexCoords(x: number, z: number): { q: number; r: number } {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / HEX_SIZE;
  const r = ((2 / 3) * z) / HEX_SIZE;
  return axialRound(q, r);
}

function axialRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function getTerrainHeight(terrain: WorldTerrainType, q: number, r: number): number {
  if (terrain === 'water') return 0.2;
  if (terrain === 'forest') return 2.4;
  if (terrain === 'mountains') return 5.2;
  // Plains with gentle rolling elevation
  const noise = Math.sin(q * 0.4 + r * 0.6) * 0.35 + Math.cos(q * 0.7 - r * 0.3) * 0.25;
  return 2.0 + noise;
}

export interface TerrainMeshBundle {
  group: THREE.Group;
  hexMeshes: Map<string, THREE.Mesh>;
  waterMesh: THREE.Mesh;
  foliageGroup: THREE.Group;
  roadsGroup: THREE.Group;
  updateAnimation: (time: number) => void;
  setLOD: (zoomTier: 'city' | 'region' | 'world') => void;
  updateCameraTarget?: (camTarget: THREE.Vector3, zoomTier: 'city' | 'region' | 'world') => void;
}

// Deterministic hash for consistent visual placement
function hashCoords(q: number, r: number, seed = 0): number {
  const h = Math.sin(q * 127.1 + r * 311.7 + seed * 74.3) * 43758.5453123;
  return h - Math.floor(h);
}

/**
 * Creates a seamless pointy-topped hexagonal 3D prism.
 * The top face is aligned with the hex coordinate grid at Y = 0,
 * and the prism body extends downwards along -Y by `depth` to form a solid bedrock base.
 */
function createPointyHexPrismGeometry(radius: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

interface ChunkData {
  chunkKey: string;
  centerX: number;
  centerZ: number;
  group: THREE.Group;
  treesGroup: THREE.Group;
  mountainsGroup: THREE.Group;
  propsGroup: THREE.Group;
}

/**
 * Creates the high-performance World Map terrain with:
 * 1. Single-draw-call continuous green medieval landmass (pointy-topped hex bedrock)
 * 2. Spatial chunking for environmental 3D models (trees, mountains, props)
 * 3. Dynamic camera distance-based visibility & zoom LOD
 */
export function createWorldTerrain(tiles: WorldTile[]): TerrainMeshBundle {
  const group = new THREE.Group();
  group.name = 'world-terrain-root';

  const hexMeshes = new Map<string, THREE.Mesh>();
  const foliageGroup = new THREE.Group();
  foliageGroup.name = 'asset-foliage-group';
  const roadsGroup = new THREE.Group();
  roadsGroup.name = 'asset-roads-group';

  // Shared geometry for raycasting colliders (invisible, 0 draw calls)
  const colliderGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.98, HEX_SIZE * 0.98, 4, 6);
  const colliderMat = new THREE.MeshBasicMaterial({ visible: false });

  // 1. Build Interaction & Raycast Colliders
  tiles.forEach((tile) => {
    const { q, r } = tile.coords;
    const { x, z } = hexToWorldCoords(q, r);
    const height = getTerrainHeight(tile.terrain, q, r);

    const collider = new THREE.Mesh(colliderGeo, colliderMat);
    collider.position.set(x, height, z);
    collider.userData = {
      isWorldObject: true,
      type: 'hex_tile',
      tileId: tile.id,
      coords: tile.coords,
      tile,
      worldPos: new THREE.Vector3(x, height, z),
    };

    const tileKey = `${q},${r}`;
    hexMeshes.set(tileKey, collider);
    group.add(collider);
  });

  // 2. Identify Road and Path hexes connecting Citadel (0,0) to nearby points of interest
  const roadHexKeys = new Set<string>();
  tiles.forEach((tile) => {
    if (tile.entityType !== 'empty' && !(tile.coords.q === 0 && tile.coords.r === 0)) {
      const dist = Math.hypot(tile.coords.q, tile.coords.r);
      if (dist > 0 && dist <= 4.5) {
        const steps = Math.max(1, Math.round(dist));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const lq = Math.round(tile.coords.q * t);
          const lr = Math.round(tile.coords.r * t);
          roadHexKeys.add(`${lq},${lr}`);
        }
      }
    }
  });

  // 3. BASE SUBTERRANEAN BEDROCK FOUNDATION (1 Draw Call for 1,500+ hexes)
  // Sits directly beneath the 3D surface tiles to prevent any void exposure at steep angles.
  const baseGeo = createPointyHexPrismGeometry(HEX_SIZE * 1.01, 16);
  const baseMat = new THREE.MeshStandardMaterial({
    roughness: 0.90,
    metalness: 0.02,
    flatShading: true,
  });
  const baseTerrainInst = new THREE.InstancedMesh(baseGeo, baseMat, tiles.length);
  baseTerrainInst.name = 'base-hex-bedrock-foundation';
  baseTerrainInst.frustumCulled = false;
  baseTerrainInst.receiveShadow = true;

  const tempDummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  tiles.forEach((tile, idx) => {
    const { q, r } = tile.coords;
    const { x, z } = hexToWorldCoords(q, r);
    const height = getTerrainHeight(tile.terrain, q, r);

    tempDummy.position.set(x, height - 0.2, z);
    tempDummy.rotation.set(0, 0, 0);
    tempDummy.scale.set(1, 1, 1);
    tempDummy.updateMatrix();
    baseTerrainInst.setMatrixAt(idx, tempDummy.matrix);

    if (tile.terrain === 'water') {
      tempColor.setHex(0x0c4a6e); // Submerged aquatic ocean trench
    } else if (tile.terrain === 'forest') {
      tempColor.setHex(0x235a29); // Deep lush woodland green
    } else if (tile.terrain === 'mountains') {
      tempColor.setHex(0x64748b); // Alpine granite peak slate
    } else {
      tempColor.setHex(0x4d9043); // Vivid rolling meadow grass
    }
    baseTerrainInst.setColorAt(idx, tempColor);
  });

  baseTerrainInst.instanceMatrix.needsUpdate = true;
  if (baseTerrainInst.instanceColor) {
    baseTerrainInst.instanceColor.needsUpdate = true;
  }
  group.add(baseTerrainInst);

  // 4. SPATIAL CHUNKING ARCHITECTURE FOR 3D ENVIRONMENT DETAILS
  // Partition world into 8x8 axial hex chunks (~190 unit radius per chunk).
  // Chunks enable fast frustum culling and distance-based LOD without per-frame allocations.
  const CHUNK_SIZE = 8;
  const chunksMap = new Map<string, {
    chunkKey: string;
    tiles: WorldTile[];
    sumX: number;
    sumZ: number;
  }>();

  tiles.forEach((tile) => {
    const { q, r } = tile.coords;
    const chunkQ = Math.floor((q + 32) / CHUNK_SIZE);
    const chunkR = Math.floor((r + 32) / CHUNK_SIZE);
    const key = `${chunkQ},${chunkR}`;

    const { x, z } = hexToWorldCoords(q, r);
    let chunk = chunksMap.get(key);
    if (!chunk) {
      chunk = { chunkKey: key, tiles: [], sumX: 0, sumZ: 0 };
      chunksMap.set(key, chunk);
    }
    chunk.tiles.push(tile);
    chunk.sumX += x;
    chunk.sumZ += z;
  });

  const activeChunks: ChunkData[] = [];
  const dummy = new THREE.Object3D();
  const S = WORLD_HEX_SCALE;
  let visualsPopulated = false;

  // Inland water sheen instanced mesh
  let activeWaterInst: THREE.InstancedMesh | null = null;

  const populateVisuals = () => {
    console.log('[terrainGenerator] populateVisuals called. visualsPopulated:', visualsPopulated, 'isReady:', worldTerrainAssetService.isReady());
    if (visualsPopulated) return;
    if (!worldTerrainAssetService.isReady()) return;

    // A. Real 3D KayKit Medieval Hexagon Land Tiles (hex_grass.glb)
    const landTiles = tiles.filter((t) => t.terrain !== 'water');
    if (landTiles.length > 0) {
      const grassInst = worldTerrainAssetService.createInstancedMesh('hex_grass', landTiles.length);
      if (grassInst) {
        landTiles.forEach((tile, idx) => {
          const { q, r } = tile.coords;
          const { x, z } = hexToWorldCoords(q, r);
          const height = getTerrainHeight(tile.terrain, q, r);
          const seed = hashCoords(q, r, 7);
          const hexRot = Math.floor(seed * 6) * (Math.PI / 3);

          dummy.position.set(x, height, z);
          dummy.rotation.set(0, hexRot, 0);
          dummy.scale.set(S, S, S);
          dummy.updateMatrix();
          grassInst.setMatrixAt(idx, dummy.matrix);
        });
        grassInst.instanceMatrix.needsUpdate = true;
        grassInst.computeBoundingSphere();
        group.add(grassInst);
      }
    }

    // B. Real 3D Paved Trade Roads (hex_road_straight.glb)
    const roadTiles = tiles.filter((t) => roadHexKeys.has(`${t.coords.q},${t.coords.r}`) && t.terrain !== 'water');
    if (roadTiles.length > 0) {
      const roadInst = worldTerrainAssetService.createInstancedMesh('hex_road_straight', roadTiles.length);
      if (roadInst) {
        roadTiles.forEach((tile, idx) => {
          const { q, r } = tile.coords;
          const { x, z } = hexToWorldCoords(q, r);
          const height = getTerrainHeight(tile.terrain, q, r);
          const angleToCenter = Math.atan2(-x, -z);
          const snappedRot = Math.round(angleToCenter / (Math.PI / 3)) * (Math.PI / 3);

          dummy.position.set(x, height + 0.06, z);
          dummy.rotation.set(0, snappedRot, 0);
          dummy.scale.set(S * 1.002, S * 1.002, S * 1.002);
          dummy.updateMatrix();
          roadInst.setMatrixAt(idx, dummy.matrix);
        });
        roadInst.instanceMatrix.needsUpdate = true;
        roadInst.computeBoundingSphere();
        group.add(roadInst);
      }
    }

    // C. Real 3D Inland Water Surface (hex_water.glb)
    const waterTiles = tiles.filter((t) => t.terrain === 'water');
    if (waterTiles.length > 0) {
      const waterInst = worldTerrainAssetService.createInstancedMesh('hex_water', waterTiles.length);
      if (waterInst) {
        waterTiles.forEach((tile, idx) => {
          const { x, z } = hexToWorldCoords(tile.coords.q, tile.coords.r);
          dummy.position.set(x, 0.35, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(S, S, S);
          dummy.updateMatrix();
          waterInst.setMatrixAt(idx, dummy.matrix);
        });
        waterInst.instanceMatrix.needsUpdate = true;
        waterInst.computeBoundingSphere();
        group.add(waterInst);
        activeWaterInst = waterInst;
      }
    }

    // D. Build Chunks with Rich Instanced Environment Assets
    chunksMap.forEach((chunkDef) => {
      const count = chunkDef.tiles.length;
      if (count === 0) return;

      const centerX = chunkDef.sumX / count;
      const centerZ = chunkDef.sumZ / count;

      const chunkGroup = new THREE.Group();
      chunkGroup.name = `chunk-${chunkDef.chunkKey}`;

      const treesGroup = new THREE.Group();
      treesGroup.name = `chunk-${chunkDef.chunkKey}-trees`;
      const mountainsGroup = new THREE.Group();
      mountainsGroup.name = `chunk-${chunkDef.chunkKey}-mountains`;
      const propsGroup = new THREE.Group();
      propsGroup.name = `chunk-${chunkDef.chunkKey}-props`;

      // Collect environmental placements for this chunk
      const treeLargeItems: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const treeMedItems: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const treeSmallItems: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const singleTreeItems: { x: number; y: number; z: number; rotY: number; s: number }[] = [];

      const mountainItemsA: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const mountainItemsB: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const mountainItemsC: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const hillItems: { x: number; y: number; z: number; rotY: number; s: number }[] = [];

      const propItemsA: { x: number; y: number; z: number; rotY: number; s: number }[] = [];
      const propItemsB: { x: number; y: number; z: number; rotY: number; s: number }[] = [];

      chunkDef.tiles.forEach((tile) => {
        const { q, r } = tile.coords;
        const { x, z } = hexToWorldCoords(q, r);
        const height = getTerrainHeight(tile.terrain, q, r);

        // 1. Forest Woodlands (Dense, continuous medieval forest canopies)
        if (tile.terrain === 'forest') {
          const fSeed = hashCoords(q, r, 5);
          const fRot = Math.floor(hashCoords(q, r, 6) * 6) * (Math.PI / 3);
          const fScale = 0.92 + hashCoords(q, r, 7) * 0.22;

          if (fSeed < 0.45) {
            treeLargeItems.push({ x, y: height, z, rotY: fRot, s: fScale });
          } else if (fSeed < 0.80) {
            treeMedItems.push({ x, y: height, z, rotY: fRot, s: fScale });
          } else if (fSeed < 0.95) {
            treeSmallItems.push({ x, y: height, z, rotY: fRot, s: fScale });
          } else {
            singleTreeItems.push({ x, y: height, z, rotY: fRot, s: fScale });
          }
        }

        // 2. Mountain Ranges & Alpine Peaks (Majestic contiguous mountain chains)
        else if (tile.terrain === 'mountains') {
          const mSeed = hashCoords(q, r, 2);
          const mRot = Math.floor(hashCoords(q, r, 3) * 6) * (Math.PI / 3);
          const mScale = 0.95 + hashCoords(q, r, 4) * 0.25;

          if (mSeed < 0.32) {
            mountainItemsA.push({ x, y: height, z, rotY: mRot, s: mScale });
          } else if (mSeed < 0.64) {
            mountainItemsB.push({ x, y: height, z, rotY: mRot, s: mScale });
          } else if (mSeed < 0.88) {
            mountainItemsC.push({ x, y: height, z, rotY: mRot, s: mScale });
          } else {
            hillItems.push({ x, y: height, z, rotY: mRot, s: mScale });
          }
        }

        // 3. Plains Countryside (Rolling knolls, wildflowers, outcroppings & sentinel trees)
        else if (tile.terrain === 'plains' && tile.entityType === 'empty') {
          if (!roadHexKeys.has(`${q},${r}`)) {
            const pSeed = hashCoords(q, r, 8);
            if (pSeed < 0.14) {
              hillItems.push({ x, y: height, z, rotY: Math.floor(pSeed * 6) * (Math.PI / 3), s: 1.0 });
            } else if (pSeed >= 0.14 && pSeed < 0.22) {
              const rRot = hashCoords(q, r, 9) * Math.PI * 2;
              const ox = (hashCoords(q, r, 10) - 0.5) * 6;
              const oz = (hashCoords(q, r, 11) - 0.5) * 6;
              if (pSeed < 0.18) {
                propItemsA.push({ x: x + ox, y: height, z: z + oz, rotY: rRot, s: 1.1 });
              } else {
                propItemsB.push({ x: x + ox, y: height, z: z + oz, rotY: rRot, s: 1.1 });
              }
            } else if (pSeed >= 0.22 && pSeed < 0.28) {
              singleTreeItems.push({
                x: x + (hashCoords(q, r, 12) - 0.5) * 6,
                y: height,
                z: z + (hashCoords(q, r, 13) - 0.5) * 6,
                rotY: hashCoords(q, r, 14) * Math.PI * 2,
                s: 0.95 + hashCoords(q, r, 15) * 0.2,
              });
            }
          }
        }
      });

      // Helper to instantiate chunk mesh with tight bounding sphere
      const createChunkInstMesh = (
        assetKey: string,
        items: { x: number; y: number; z: number; rotY: number; s: number }[],
        targetParent: THREE.Group
      ) => {
        if (items.length === 0) return;
        const inst = worldTerrainAssetService.createInstancedMesh(assetKey, items.length);
        if (!inst) return;

        items.forEach((item, idx) => {
          dummy.position.set(item.x, item.y, item.z);
          dummy.rotation.set(0, item.rotY, 0);
          const scale = S * item.s;
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          inst.setMatrixAt(idx, dummy.matrix);
        });

        inst.instanceMatrix.needsUpdate = true;
        inst.computeBoundingSphere();
        inst.frustumCulled = false;
        targetParent.add(inst);
      };

      // Populate chunk nature and topography groups
      createChunkInstMesh('trees_large', treeLargeItems, treesGroup);
      createChunkInstMesh('trees_medium', treeMedItems, treesGroup);
      createChunkInstMesh('trees_small', treeSmallItems, treesGroup);
      createChunkInstMesh('tree_single_A', singleTreeItems, treesGroup);

      createChunkInstMesh('mountain_A', mountainItemsA, mountainsGroup);
      createChunkInstMesh('mountain_B', mountainItemsB, mountainsGroup);
      createChunkInstMesh('mountain_C', mountainItemsC, mountainsGroup);
      createChunkInstMesh('hills_A', hillItems, mountainsGroup);

      createChunkInstMesh('rock_single_A', propItemsA, propsGroup);
      createChunkInstMesh('rock_single_B', propItemsB, propsGroup);

      chunkGroup.add(treesGroup);
      chunkGroup.add(mountainsGroup);
      chunkGroup.add(propsGroup);
      group.add(chunkGroup);

      activeChunks.push({
        chunkKey: chunkDef.chunkKey,
        centerX,
        centerZ,
        group: chunkGroup,
        treesGroup,
        mountainsGroup,
        propsGroup,
      });
    });

    visualsPopulated = true;
    setLOD(currentZoomTier);
  };

  // Preload and build visuals as assets become ready
  console.log('[terrainGenerator] Initial isReady check:', worldTerrainAssetService.isReady());
  if (worldTerrainAssetService.isReady()) {
    populateVisuals();
  } else {
    const unsub = worldTerrainAssetService.onAssetLoaded(() => {
      const ready = worldTerrainAssetService.isReady();
      console.log('[terrainGenerator] onAssetLoaded triggered, isReady:', ready);
      if (ready) {
        populateVisuals();
        unsub();
      }
    });

    worldTerrainAssetService.preloadAll().then(() => {
      const ready = worldTerrainAssetService.isReady();
      console.log('[terrainGenerator] preloadAll.then triggered, isReady:', ready);
      if (ready) {
        populateVisuals();
      }
    });
  }

  // Satisfy waterMesh contract for bundle
  const waterMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
  waterMesh.visible = false;
  group.add(waterMesh);

  group.add(foliageGroup);
  group.add(roadsGroup);

  let currentZoomTier: 'city' | 'region' | 'world' = 'region';

  // Water animation callback (disabled at world zoom to save CPU)
  const updateAnimation = (time: number) => {
    if (currentZoomTier === 'world') return;
    if (activeWaterInst) {
      activeWaterInst.position.y = Math.sin(time * 1.4) * 0.08;
    }
  };

  // Zoom-level LOD (Requirement 10: Camera-based visibility)
  const setLOD = (zoomTier: 'city' | 'region' | 'world') => {
    currentZoomTier = zoomTier;
    if (!visualsPopulated) return;

    activeChunks.forEach((chunk) => {
      if (zoomTier === 'world') {
        // Zoomed out: hide small foliage and props, keep only base terrain and major mountain peaks
        chunk.treesGroup.visible = false;
        chunk.propsGroup.visible = false;
        chunk.mountainsGroup.visible = true;
      } else if (zoomTier === 'region') {
        chunk.treesGroup.visible = true;
        chunk.mountainsGroup.visible = true;
        chunk.propsGroup.visible = false; // props hidden in regional view
      } else {
        // City view: full environmental detail
        chunk.treesGroup.visible = true;
        chunk.mountainsGroup.visible = true;
        chunk.propsGroup.visible = true;
      }
    });
  };

  // Dynamic Camera Distance-based Chunk Culling (Requirement 8 & 9)
  const updateCameraTarget = (camTarget: THREE.Vector3, zoomTier: 'city' | 'region' | 'world') => {
    currentZoomTier = zoomTier;
    if (!visualsPopulated) return;

    const nearDistSq = 320 * 320;   // ~7 hex radius: Full detail
    const midDistSq = 580 * 580;    // ~14 hex radius: Medium detail

    activeChunks.forEach((chunk) => {
      const dx = chunk.centerX - camTarget.x;
      const dz = chunk.centerZ - camTarget.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > midDistSq) {
        // Far: Hide detailed 3D props; continuous green base terrain handles visual fidelity
        chunk.treesGroup.visible = false;
        chunk.mountainsGroup.visible = false;
        chunk.propsGroup.visible = false;
      } else if (distSq > nearDistSq) {
        // Medium: Show mountains; show trees only if not in world zoom; hide micro props
        chunk.mountainsGroup.visible = true;
        chunk.treesGroup.visible = zoomTier !== 'world';
        chunk.propsGroup.visible = false;
      } else {
        // Near: Apply active zoom tier settings
        if (zoomTier === 'world') {
          chunk.treesGroup.visible = false;
          chunk.mountainsGroup.visible = true;
          chunk.propsGroup.visible = false;
        } else if (zoomTier === 'region') {
          chunk.treesGroup.visible = true;
          chunk.mountainsGroup.visible = true;
          chunk.propsGroup.visible = false;
        } else {
          chunk.treesGroup.visible = true;
          chunk.mountainsGroup.visible = true;
          chunk.propsGroup.visible = true;
        }
      }
    });
  };

  return {
    group,
    hexMeshes,
    waterMesh,
    foliageGroup,
    roadsGroup,
    updateAnimation,
    setLOD,
    updateCameraTarget,
  };
}
