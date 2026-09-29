import * as THREE from 'three';
import { WorldTile, WorldTerrainType } from '../../types';
import { worldTerrainAssetService, WORLD_HEX_SCALE } from './worldTerrainAssetService';
import { getLushMeadowTexture, getWaterRipplesTexture } from './medievalTextures';

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
  if (terrain === 'water') return 0.35;
  if (terrain === 'forest') return 2.4;
  if (terrain === 'mountains') return 5.2;
  // Plains with gentle rolling elevation (2.0 to 2.6)
  const noise = Math.sin(q * 0.4 + r * 0.6) * 0.35 + Math.cos(q * 0.7 - r * 0.3) * 0.25;
  return 2.1 + noise;
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
  dispose?: () => void;
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

// -----------------------------------------------------------------------------
// CONSOLIDATED SHARED GEOMETRIES & MATERIALS (Zero-duplication singleton cache)
// -----------------------------------------------------------------------------
let _sharedLandHexGeo: THREE.BufferGeometry | null = null;
let _sharedWaterHexGeo: THREE.BufferGeometry | null = null;
let _sharedColliderGeo: THREE.BufferGeometry | null = null;

let _sharedLandMaterial: THREE.MeshStandardMaterial | null = null;
let _sharedWaterMaterial: THREE.MeshStandardMaterial | null = null;
let _sharedColliderMaterial: THREE.MeshBasicMaterial | null = null;

function getSharedLandHexGeo(): THREE.BufferGeometry {
  if (!_sharedLandHexGeo) {
    // 1.004 scale guarantees tight interlocking without gaps or black cracks
    _sharedLandHexGeo = createPointyHexPrismGeometry(HEX_SIZE * 1.004, 16);
  }
  return _sharedLandHexGeo;
}

function getSharedWaterHexGeo(): THREE.BufferGeometry {
  if (!_sharedWaterHexGeo) {
    // 0.998 scale fits snugly against land cliff embankments without z-fighting
    _sharedWaterHexGeo = createPointyHexPrismGeometry(HEX_SIZE * 0.998, 4);
  }
  return _sharedWaterHexGeo;
}

function getSharedColliderGeo(): THREE.BufferGeometry {
  if (!_sharedColliderGeo) {
    _sharedColliderGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.96, HEX_SIZE * 0.96, 4, 6);
  }
  return _sharedColliderGeo;
}

function getSharedLandMaterial(): THREE.MeshStandardMaterial {
  if (!_sharedLandMaterial) {
    const meadowTex = getLushMeadowTexture();
    _sharedLandMaterial = new THREE.MeshStandardMaterial({
      map: meadowTex,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: false,
    });
  }
  return _sharedLandMaterial;
}

function getSharedWaterMaterial(): THREE.MeshStandardMaterial {
  if (!_sharedWaterMaterial) {
    const waterTex = getWaterRipplesTexture();
    _sharedWaterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c68a4,
      map: waterTex,
      roughness: 0.14,
      metalness: 0.32,
      transparent: true,
      opacity: 0.94,
    });
  }
  return _sharedWaterMaterial;
}

function getSharedColliderMaterial(): THREE.MeshBasicMaterial {
  if (!_sharedColliderMaterial) {
    _sharedColliderMaterial = new THREE.MeshBasicMaterial({ visible: false });
  }
  return _sharedColliderMaterial;
}

interface ChunkData {
  chunkKey: string;
  chunkQ: number;
  chunkR: number;
  centerX: number;
  centerZ: number;
  group: THREE.Group;
  landMesh: THREE.InstancedMesh | null;
  waterMesh: THREE.InstancedMesh | null;
  treesGroup: THREE.Group;
  mountainsGroup: THREE.Group;
  propsGroup: THREE.Group;
}

/**
 * Creates the high-performance World Map terrain with:
 * 1. Chunked rendering using Three.js InstancedMesh for ALL terrain hexes
 * 2. Consolidated shared geometries and textures to reduce draw calls and memory usage
 * 3. Continuous green landmass clearly elevated and distinct from shimmering ocean water
 * 4. Fast spatial chunk frustum culling and distance LOD
 */
export function createWorldTerrain(tiles: WorldTile[]): TerrainMeshBundle {
  const group = new THREE.Group();
  group.name = 'world-terrain-root';

  const hexMeshes = new Map<string, THREE.Mesh>();
  const foliageGroup = new THREE.Group();
  foliageGroup.name = 'asset-foliage-group';
  const roadsGroup = new THREE.Group();
  roadsGroup.name = 'asset-roads-group';

  // Consolidated geometries and materials
  const landGeo = getSharedLandHexGeo();
  const waterGeo = getSharedWaterHexGeo();
  const colliderGeo = getSharedColliderGeo();

  const landMat = getSharedLandMaterial();
  const waterMat = getSharedWaterMaterial();
  const colliderMat = getSharedColliderMaterial();

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
      if (dist > 0 && dist <= 5.0) {
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

  // 3. SPATIAL CHUNKING ARCHITECTURE FOR ALL TERRAIN HEXES
  // Group tiles into axial chunks (CHUNK_SIZE = 6, ~140 unit radius per chunk).
  // Each chunk manages its own InstancedMesh for land and water hexes with frustum culling.
  const CHUNK_SIZE = 6;
  const chunksMap = new Map<string, {
    chunkKey: string;
    chunkQ: number;
    chunkR: number;
    tiles: WorldTile[];
    sumX: number;
    sumZ: number;
  }>();

  tiles.forEach((tile) => {
    const { q, r } = tile.coords;
    const chunkQ = Math.floor(q / CHUNK_SIZE);
    const chunkR = Math.floor(r / CHUNK_SIZE);
    const key = `${chunkQ}_${chunkR}`;

    const { x, z } = hexToWorldCoords(q, r);
    let chunk = chunksMap.get(key);
    if (!chunk) {
      chunk = { chunkKey: key, chunkQ, chunkR, tiles: [], sumX: 0, sumZ: 0 };
      chunksMap.set(key, chunk);
    }
    chunk.tiles.push(tile);
    chunk.sumX += x;
    chunk.sumZ += z;
  });

  const activeChunks: ChunkData[] = [];
  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();
  const S = WORLD_HEX_SCALE;
  let visualsPopulated = false;

  // Build each chunk's terrain hex InstancedMeshes
  chunksMap.forEach((chunkDef) => {
    const count = chunkDef.tiles.length;
    if (count === 0) return;

    const centerX = chunkDef.sumX / count;
    const centerZ = chunkDef.sumZ / count;

    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk-${chunkDef.chunkKey}`;

    const landTiles = chunkDef.tiles.filter((t) => t.terrain !== 'water');
    const waterTiles = chunkDef.tiles.filter((t) => t.terrain === 'water');

    let landMesh: THREE.InstancedMesh | null = null;
    let waterMesh: THREE.InstancedMesh | null = null;

    // A. Chunk Land Hexes InstancedMesh (Continuous Green Landmass)
    if (landTiles.length > 0) {
      landMesh = new THREE.InstancedMesh(landGeo, landMat, landTiles.length);
      landMesh.name = `chunk-${chunkDef.chunkKey}-land`;
      landMesh.receiveShadow = true;
      landMesh.castShadow = false;

      landTiles.forEach((tile, idx) => {
        const { q, r } = tile.coords;
        const { x, z } = hexToWorldCoords(q, r);
        const height = getTerrainHeight(tile.terrain, q, r);

        dummy.position.set(x, height, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        landMesh!.setMatrixAt(idx, dummy.matrix);

        // Biome and road tinting
        if (roadHexKeys.has(`${q},${r}`)) {
          // Warm cobblestone trade road path
          tempColor.setHex(0xb59e7a);
        } else if (tile.terrain === 'forest') {
          // Deep ancient woodland green
          tempColor.setHex(0x27632a);
        } else if (tile.terrain === 'mountains') {
          // Granite alpine crag slate
          tempColor.setHex(0x6c7d91);
        } else {
          // Continuous lush rolling meadow green (with subtle natural variation)
          const varSeed = hashCoords(q, r, 3);
          if (varSeed < 0.35) {
            tempColor.setHex(0x48a03c);
          } else if (varSeed < 0.70) {
            tempColor.setHex(0x52b045);
          } else {
            tempColor.setHex(0x3e8e34);
          }
        }
        landMesh!.setColorAt(idx, tempColor);
      });

      landMesh.instanceMatrix.needsUpdate = true;
      if (landMesh.instanceColor) {
        landMesh.instanceColor.needsUpdate = true;
      }
      landMesh.computeBoundingSphere();
      landMesh.computeBoundingBox();
      landMesh.frustumCulled = true;
      chunkGroup.add(landMesh);
    }

    // B. Chunk Water Hexes InstancedMesh (Distinct Deep Shimmering Ocean)
    if (waterTiles.length > 0) {
      waterMesh = new THREE.InstancedMesh(waterGeo, waterMat, waterTiles.length);
      waterMesh.name = `chunk-${chunkDef.chunkKey}-water`;
      waterMesh.receiveShadow = true;
      waterMesh.castShadow = false;

      waterTiles.forEach((tile, idx) => {
        const { q, r } = tile.coords;
        const { x, z } = hexToWorldCoords(q, r);

        dummy.position.set(x, 0.35, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        waterMesh!.setMatrixAt(idx, dummy.matrix);

        tempColor.setHex(0x0a5b8e); // Deep shimmering royal ocean blue
        waterMesh!.setColorAt(idx, tempColor);
      });

      waterMesh.instanceMatrix.needsUpdate = true;
      if (waterMesh.instanceColor) {
        waterMesh.instanceColor.needsUpdate = true;
      }
      waterMesh.computeBoundingSphere();
      waterMesh.computeBoundingBox();
      waterMesh.frustumCulled = true;
      chunkGroup.add(waterMesh);
    }

    // C. Environmental Detail Groups for Nature Assets (Trees, Mountains, Props)
    const treesGroup = new THREE.Group();
    treesGroup.name = `chunk-${chunkDef.chunkKey}-trees`;
    const mountainsGroup = new THREE.Group();
    mountainsGroup.name = `chunk-${chunkDef.chunkKey}-mountains`;
    const propsGroup = new THREE.Group();
    propsGroup.name = `chunk-${chunkDef.chunkKey}-props`;

    chunkGroup.add(treesGroup);
    chunkGroup.add(mountainsGroup);
    chunkGroup.add(propsGroup);

    group.add(chunkGroup);

    activeChunks.push({
      chunkKey: chunkDef.chunkKey,
      chunkQ: chunkDef.chunkQ,
      chunkR: chunkDef.chunkR,
      centerX,
      centerZ,
      group: chunkGroup,
      landMesh,
      waterMesh,
      treesGroup,
      mountainsGroup,
      propsGroup,
    });
  });

  // Populate 3D Nature & Topography environmental models per chunk
  const populateVisuals = () => {
    if (visualsPopulated) return;
    if (!worldTerrainAssetService.isReady()) return;

    activeChunks.forEach((chunk) => {
      const chunkDef = chunksMap.get(chunk.chunkKey);
      if (!chunkDef) return;

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

        // Forest Woodlands
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
        // Mountain Ranges
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
        // Rolling Plains Countryside
        else if (tile.terrain === 'plains' && tile.entityType === 'empty') {
          if (!roadHexKeys.has(`${q},${r}`)) {
            const pSeed = hashCoords(q, r, 8);
            if (pSeed < 0.12) {
              hillItems.push({ x, y: height, z, rotY: Math.floor(pSeed * 6) * (Math.PI / 3), s: 1.0 });
            } else if (pSeed >= 0.12 && pSeed < 0.20) {
              const rRot = hashCoords(q, r, 9) * Math.PI * 2;
              const ox = (hashCoords(q, r, 10) - 0.5) * 6;
              const oz = (hashCoords(q, r, 11) - 0.5) * 6;
              if (pSeed < 0.16) {
                propItemsA.push({ x: x + ox, y: height, z: z + oz, rotY: rRot, s: 1.1 });
              } else {
                propItemsB.push({ x: x + ox, y: height, z: z + oz, rotY: rRot, s: 1.1 });
              }
            } else if (pSeed >= 0.20 && pSeed < 0.26) {
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
        inst.frustumCulled = true;
        targetParent.add(inst);
      };

      createChunkInstMesh('trees_large', treeLargeItems, chunk.treesGroup);
      createChunkInstMesh('trees_medium', treeMedItems, chunk.treesGroup);
      createChunkInstMesh('trees_small', treeSmallItems, chunk.treesGroup);
      createChunkInstMesh('tree_single_A', singleTreeItems, chunk.treesGroup);

      createChunkInstMesh('mountain_A', mountainItemsA, chunk.mountainsGroup);
      createChunkInstMesh('mountain_B', mountainItemsB, chunk.mountainsGroup);
      createChunkInstMesh('mountain_C', mountainItemsC, chunk.mountainsGroup);
      createChunkInstMesh('hills_A', hillItems, chunk.mountainsGroup);

      createChunkInstMesh('rock_single_A', propItemsA, chunk.propsGroup);
      createChunkInstMesh('rock_single_B', propItemsB, chunk.propsGroup);
    });

    visualsPopulated = true;
    setLOD(currentZoomTier);
  };

  // Preload and build visuals as assets become ready
  if (worldTerrainAssetService.isReady()) {
    populateVisuals();
  } else {
    const unsub = worldTerrainAssetService.onAssetLoaded(() => {
      if (worldTerrainAssetService.isReady()) {
        populateVisuals();
        unsub();
      }
    });

    worldTerrainAssetService.preloadAll().then(() => {
      if (worldTerrainAssetService.isReady()) {
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

  // Water animation callback: updates shared water texture offsets smoothly on GPU
  const waterTex = waterMat.map;
  const updateAnimation = (time: number) => {
    if (waterTex) {
      waterTex.offset.x = (time * 0.012) % 1;
      waterTex.offset.y = (time * 0.008) % 1;
    }
  };

  // Zoom-level LOD
  const setLOD = (zoomTier: 'city' | 'region' | 'world') => {
    currentZoomTier = zoomTier;
    activeChunks.forEach((chunk) => {
      if (zoomTier === 'world') {
        // Zoomed out: hide small foliage and props, keep solid continuous green landmass & mountains
        chunk.treesGroup.visible = false;
        chunk.propsGroup.visible = false;
        chunk.mountainsGroup.visible = true;
      } else if (zoomTier === 'region') {
        // Regional view: show tree groves & mountains, hide micro props
        chunk.treesGroup.visible = true;
        chunk.mountainsGroup.visible = true;
        chunk.propsGroup.visible = false;
      } else {
        // City view: full environmental fidelity
        chunk.treesGroup.visible = true;
        chunk.mountainsGroup.visible = true;
        chunk.propsGroup.visible = true;
      }
    });
  };

  // Dynamic Camera Distance-based Chunk Culling & LOD
  const updateCameraTarget = (camTarget: THREE.Vector3, zoomTier: 'city' | 'region' | 'world') => {
    currentZoomTier = zoomTier;

    const nearDistSq = 320 * 320;   // ~7 hex radius: Full detail
    const midDistSq = 620 * 620;    // ~14 hex radius: Medium detail
    const farDistSq = 1100 * 1100;  // Visible horizon limit

    activeChunks.forEach((chunk) => {
      const dx = chunk.centerX - camTarget.x;
      const dz = chunk.centerZ - camTarget.z;
      const distSq = dx * dx + dz * dz;

      if (distSq > farDistSq) {
        // Beyond horizon: cull entire chunk group
        chunk.group.visible = false;
      } else {
        chunk.group.visible = true;

        if (distSq > midDistSq) {
          // Mid-to-far distance: Keep landmass and mountain silhouettes; cull fine trees/props
          chunk.treesGroup.visible = false;
          chunk.mountainsGroup.visible = true;
          chunk.propsGroup.visible = false;
        } else if (distSq > nearDistSq) {
          // Medium distance
          chunk.mountainsGroup.visible = true;
          chunk.treesGroup.visible = zoomTier !== 'world';
          chunk.propsGroup.visible = false;
        } else {
          // Near distance: Apply active zoom settings
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
      }
    });
  };

  const dispose = () => {
    activeChunks.forEach((chunk) => {
      if (chunk.landMesh) {
        chunk.landMesh.dispose();
      }
      if (chunk.waterMesh) {
        chunk.waterMesh.dispose();
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
    dispose,
  };
}
