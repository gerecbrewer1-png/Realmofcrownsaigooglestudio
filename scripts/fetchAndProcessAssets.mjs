import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const KAYKIT_MEDIEVAL_RAW = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf';
const KAYKIT_CHARACTERS_RAW = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf';

const tempDir = path.resolve('temp_asset_processing');
fs.mkdirSync(tempDir, { recursive: true });

const targetMedieval = path.resolve('public/assets/medieval');
fs.mkdirSync(path.join(targetMedieval, 'buildings'), { recursive: true });
fs.mkdirSync(path.join(targetMedieval, 'nature'), { recursive: true });
fs.mkdirSync(path.join(targetMedieval, 'props'), { recursive: true });
fs.mkdirSync(path.join(targetMedieval, 'heroes'), { recursive: true });

// First, download the shared texture file for medieval pack
console.log('Downloading shared texture...');
const textureUrl = `${KAYKIT_MEDIEVAL_RAW}/buildings/red/hexagons_medieval.png`;
execSync(`curl -s -o "${path.join(tempDir, 'hexagons_medieval.png')}" "${textureUrl}"`);

const buildings = [
  { name: 'keep.glb', gltfPath: 'buildings/red/building_castle_red' },
  { name: 'windmill.glb', gltfPath: 'buildings/red/building_windmill_red' },
  { name: 'sawmill.glb', gltfPath: 'buildings/red/building_lumbermill_red' },
  { name: 'quarry.glb', gltfPath: 'buildings/red/building_mine_red' },
  { name: 'barracks.glb', gltfPath: 'buildings/red/building_barracks_red' },
  { name: 'infirmary.glb', gltfPath: 'buildings/red/building_church_red' },
  { name: 'academy.glb', gltfPath: 'buildings/red/building_tower_catapult_red' },
  { name: 'archeryrange.glb', gltfPath: 'buildings/red/building_archeryrange_red' },
  { name: 'blacksmith.glb', gltfPath: 'buildings/red/building_blacksmith_red' },
  { name: 'house.glb', gltfPath: 'buildings/red/building_home_A_red' },
  { name: 'market.glb', gltfPath: 'buildings/red/building_market_red' },
  { name: 'gate.glb', gltfPath: 'buildings/neutral/wall_straight_gate' }
];

const nature = [
  { name: 'tree_single.glb', gltfPath: 'decoration/nature/tree_single_A' },
  { name: 'tree_grove.glb', gltfPath: 'decoration/nature/trees_A_large' },
  { name: 'rock_single.glb', gltfPath: 'decoration/nature/rock_single_A' },
  { name: 'rock_cluster.glb', gltfPath: 'decoration/nature/rock_single_B' }
];

const props = [
  { name: 'resource_lumber.glb', gltfPath: 'decoration/props/resource_lumber' },
  { name: 'resource_stone.glb', gltfPath: 'decoration/props/resource_stone' },
  { name: 'target.glb', gltfPath: 'decoration/props/target' },
  { name: 'weaponrack.glb', gltfPath: 'decoration/props/weaponrack' },
  { name: 'tent.glb', gltfPath: 'decoration/props/tent' },
  { name: 'crate.glb', gltfPath: 'decoration/props/crate_A_big' }
];

function processGltfList(items, subDir) {
  for (const item of items) {
    const baseName = path.basename(item.gltfPath);
    const gltfUrl = `${KAYKIT_MEDIEVAL_RAW}/${item.gltfPath}.gltf`;
    const binUrl = `${KAYKIT_MEDIEVAL_RAW}/${item.gltfPath}.bin`;
    
    const localGltf = path.join(tempDir, `${baseName}.gltf`);
    const localBin = path.join(tempDir, `${baseName}.bin`);
    const outGlb = path.join(targetMedieval, subDir, item.name);

    console.log(`Processing ${item.name}...`);
    execSync(`curl -s -o "${localGltf}" "${gltfUrl}"`);
    execSync(`curl -s -o "${localBin}" "${binUrl}"`);

    // Use gltf-pipeline to produce a standalone self-contained GLB
    try {
      execSync(`npx gltf-pipeline -i "${localGltf}" -o "${outGlb}"`, { stdio: 'pipe' });
      const stats = fs.statSync(outGlb);
      console.log(`  ✓ Generated ${item.name} (${Math.round(stats.size / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ Failed to convert ${item.name}:`, err.message);
    }
  }
}

console.log('--- Processing Buildings ---');
processGltfList(buildings, 'buildings');

console.log('--- Processing Nature ---');
processGltfList(nature, 'nature');

console.log('--- Processing Props ---');
processGltfList(props, 'props');

console.log('--- Processing Heroes ---');
const heroes = [
  { name: 'warlord.glb', remote: 'Barbarian.glb' },
  { name: 'guardian.glb', remote: 'Knight.glb' },
  { name: 'ranger.glb', remote: 'Rogue_Hooded.glb' },
  { name: 'steward.glb', remote: 'Rogue.glb' },
  { name: 'strategist.glb', remote: 'Mage.glb' }
];

for (const hero of heroes) {
  const url = `${KAYKIT_CHARACTERS_RAW}/${hero.remote}`;
  const outHero = path.join(targetMedieval, 'heroes', hero.name);
  console.log(`Downloading hero ${hero.name}...`);
  execSync(`curl -s -o "${outHero}" "${url}"`);
  const stats = fs.statSync(outHero);
  console.log(`  ✓ Saved hero ${hero.name} (${Math.round(stats.size / 1024)} KB)`);
}

// Clean up tempDir
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('All 3D models downloaded and packaged into public/assets/medieval/ successfully!');
