/**
 * REALM OF CROWNS — Chunked Terrain InstancedMesh Validation Test
 * Validates:
 * 1. World terrain hexes are partitioned into spatial chunks.
 * 2. Every chunk uses Three.js InstancedMesh for its terrain hexes (land & water).
 * 3. Shared geometries (land hex, water hex) and materials are consolidated across all chunks (0 duplication).
 * 4. Land hexes are elevated above sea level with solid vertical bedrock base, creating a continuous green landmass distinct from ocean water.
 * 5. Frustum culling and bounding box/sphere are enabled on all chunk InstancedMeshes.
 */

import * as THREE from 'three';
import { createWorldTerrain, getTerrainHeight, HEX_SIZE, hexToWorldCoords } from '../src/components/world3d/terrainGenerator';
import { WorldTile } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

console.log('\n======================================================');
console.log('REALM OF CROWNS — CHUNKED TERRAIN INSTANCED MESH TESTS');
console.log('======================================================\n');

// 1. Generate synthetic world tiles around Citadel (radius 8)
const syntheticTiles: WorldTile[] = [];
for (let q = -8; q <= 8; q++) {
  const r1 = Math.max(-8, -q - 8);
  const r2 = Math.min(8, -q + 8);
  for (let r = r1; r <= r2; r++) {
    const isWater = Math.abs(q) >= 6 || Math.abs(r) >= 6;
    const isForest = !isWater && (q + r) % 3 === 0;
    const isMountain = !isWater && !isForest && (q * r) % 5 === 0;
    const terrain = isWater ? 'water' : isForest ? 'forest' : isMountain ? 'mountains' : 'plains';

    syntheticTiles.push({
      id: `tile_${q}_${r}`,
      coords: { q, r },
      terrain,
      entityType: q === 0 && r === 0 ? 'player_kingdom' : 'empty',
    });
  }
}

assert(syntheticTiles.length > 100, `Generated ${syntheticTiles.length} test hex tiles`);

// 2. Build Chunked Terrain Bundle
const bundle = createWorldTerrain(syntheticTiles);
assert(bundle !== null, 'createWorldTerrain returned valid bundle');
assert(bundle.group instanceof THREE.Group, 'Terrain bundle root is THREE.Group');

// 3. Inspect Chunks and InstancedMeshes
const chunkGroups: THREE.Group[] = [];
bundle.group.traverse((child) => {
  if (child instanceof THREE.Group && child.name.startsWith('chunk-') && !child.name.includes('-trees') && !child.name.includes('-mountains') && !child.name.includes('-props')) {
    chunkGroups.push(child);
  }
});

assert(chunkGroups.length > 1, `Terrain is partitioned into ${chunkGroups.length} spatial chunks (expected > 1)`);

// 4. Verify InstancedMeshes inside Chunks
let totalLandInstances = 0;
let totalWaterInstances = 0;
const observedLandGeometries = new Set<THREE.BufferGeometry>();
const observedLandMaterials = new Set<THREE.Material>();
const observedWaterGeometries = new Set<THREE.BufferGeometry>();
const observedWaterMaterials = new Set<THREE.Material>();

chunkGroups.forEach((chunk) => {
  chunk.children.forEach((child) => {
    if (child instanceof THREE.InstancedMesh) {
      assert(child.frustumCulled === true, `Chunk InstancedMesh ${child.name} has frustumCulled = true`);
      assert(child.boundingSphere !== null, `Chunk InstancedMesh ${child.name} has computed bounding sphere`);

      if (child.name.endsWith('-land')) {
        totalLandInstances += child.count;
        observedLandGeometries.add(child.geometry);
        observedLandMaterials.add(child.material as THREE.Material);
      } else if (child.name.endsWith('-water')) {
        totalWaterInstances += child.count;
        observedWaterGeometries.add(child.geometry);
        observedWaterMaterials.add(child.material as THREE.Material);
      }
    }
  });
});

const expectedLand = syntheticTiles.filter((t) => t.terrain !== 'water').length;
const expectedWater = syntheticTiles.filter((t) => t.terrain === 'water').length;

assert(totalLandInstances === expectedLand, `All land tiles (${totalLandInstances}/${expectedLand}) accounted for in chunk InstancedMeshes`);
assert(totalWaterInstances === expectedWater, `All water tiles (${totalWaterInstances}/${expectedWater}) accounted for in chunk InstancedMeshes`);

// 5. Consolidate shared geometries and materials verification (0 duplicates!)
assert(observedLandGeometries.size === 1, `Exactly 1 consolidated shared geometry used across all land chunks (got ${observedLandGeometries.size})`);
assert(observedLandMaterials.size === 1, `Exactly 1 consolidated shared material used across all land chunks (got ${observedLandMaterials.size})`);

if (expectedWater > 0) {
  assert(observedWaterGeometries.size === 1, `Exactly 1 consolidated shared geometry used across all water chunks (got ${observedWaterGeometries.size})`);
  assert(observedWaterMaterials.size === 1, `Exactly 1 consolidated shared material used across all water chunks (got ${observedWaterMaterials.size})`);
}

// 6. Verify continuous green landmass elevation vs ocean water
const waterHeight = getTerrainHeight('water', 0, 0);
const plainsHeight = getTerrainHeight('plains', 0, 0);
const forestHeight = getTerrainHeight('forest', 0, 0);
const mountainHeight = getTerrainHeight('mountains', 0, 0);

assert(waterHeight <= 0.40, `Water level sits low at sea level (${waterHeight} <= 0.40)`);
assert(plainsHeight >= 1.70, `Plains landmass elevates significantly above water level (${plainsHeight} >= 1.70)`);
assert(forestHeight >= plainsHeight, `Forest canopy elevates above plains (${forestHeight} >= ${plainsHeight})`);
assert(mountainHeight >= 5.0, `Mountains tower above landscape (${mountainHeight} >= 5.0)`);
assert(plainsHeight - waterHeight >= 1.5, `Continuous landmass has distinct vertical coastal relief (${(plainsHeight - waterHeight).toFixed(2)} units)`);

// 7. Cleanup & Dispose
bundle.dispose?.();
console.log('\n======================================================');
console.log('ALL CHUNKED TERRAIN INSTANCED MESH TESTS PASSED (100%)');
console.log('======================================================\n');
