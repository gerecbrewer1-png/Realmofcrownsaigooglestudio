/**
 * REALM OF CROWNS — Detailed Draw Call Breakdown Auditor (Phase 3 Baseline)
 * Categorizes all mesh instances and shadow casters in the PlayCanvas tactical scene.
 */

import * as pc from 'playcanvas';

// Setup window.pc for OptiPixel and PlayCanvas
(global as any).window = global;
(global as any).window.pc = pc;
(global as any).document = {
  createElement: () => ({
    getContext: () => ({
      createImageData: () => ({ data: new Uint8ClampedArray(256 * 256 * 4) }),
      putImageData: () => {}
    }),
    width: 256,
    height: 256
  })
};

import { TacticalSceneBuilder } from '../src/game/playcanvas/TacticalSceneBuilder';
import { PlayCanvasCharacter } from '../src/game/playcanvas/PlayCanvasCharacter';
import { PlayCanvasAnimal } from '../src/game/playcanvas/PlayCanvasAnimal';
import { RealmTerrainManager } from '../src/game/terrain/RealmTerrainManager';
import { RaidEventSystem } from '../src/game/events/raidEventSystem';

console.log('====================================================');
console.log('REALM OF CROWNS — DRAW CALL & MESH INSTANCE BREAKDOWN AUDIT');
console.log('====================================================\n');

// Stub Entity addComponent and Material update for headless Node testing
pc.Entity.prototype.addComponent = function(this: any, type: string, data: any) {
  this.c = this.c || {};
  const comp = {
    ...data,
    entity: this,
    system: {
      removeComponent: () => {}
    },
    onPostStateChange: () => {},
    onEnable: () => {},
    onDisable: () => {},
    meshInstances: data?.meshInstances || [{
      castShadow: data?.castShadows !== false,
      mesh: { primitive: [{ count: 36 }] }
    }]
  };
  this.c[type] = comp;
  this[type] = comp;
  return comp;
};
pc.StandardMaterial.prototype.update = function() {};

const rootEntity = new pc.Entity('AppRoot');
const device = new pc.NullGraphicsDevice({} as any);
const app: any = {
  graphicsDevice: device,
  root: rootEntity,
  scene: {
    fog: {}
  },
  batcher: {
    addGroup: () => ({ id: 1 }),
    generate: () => {}
  }
};

// Create Camera
const cameraEntity = new pc.Entity('TacticalCamera');
cameraEntity.addComponent('camera', {
  fov: 46,
  nearClip: 0.5,
  farClip: 240
});
cameraEntity.setPosition(0, 18, 24);
cameraEntity.setEulerAngles(-45, 0, 0);
app.root.addChild(cameraEntity);

// Create Directional Sun
const sunEntity = new pc.Entity('DirectionalSun');
sunEntity.addComponent('light', {
  type: 'directional',
  castShadows: true,
  shadowDistance: 85,
  shadowResolution: 2048,
  shadowBias: 0.12,
  normalOffsetBias: 0.05
});
sunEntity.setEulerAngles(45, 30, 0);
app.root.addChild(sunEntity);

// Build Terrain
const terrainManager = new RealmTerrainManager(app, {
  resolution: 129,
  patchSize: 33,
  heightScale: 24,
  initialBiome: 'grasslands'
});

// Build Tactical Village Scene
const sceneRoot = TacticalSceneBuilder.buildScene(app as any, terrainManager);

// Populate 30 Starter Army Units (15 Swordsmen, 10 Archers, 5 Knights)
const squadUnits: PlayCanvasCharacter[] = [];
for (let i = 0; i < 30; i++) {
  const type = i < 15 ? 'infantry' : (i < 25 ? 'archer' : 'cavalry');
  const row = Math.floor(i / 6);
  const col = i % 6;
  const x = (col - 2.5) * 2.2;
  const z = 8 + row * 2.2;
  const unit = new PlayCanvasCharacter(app as any, {
    id: `Troop_${i}`,
    name: `Troop_${i}`,
    team: 'ally',
    color: new pc.Color(0.2, 0.4, 0.8),
    type: type as any,
    scale: 0.95,
    hasShield: type === 'infantry',
    hasBow: type === 'archer',
    weaponType: type === 'archer' ? 'bow' : 'sword'
  });
  unit.setPosition(x, 0, z);
  squadUnits.push(unit);
}

// Populate 12 Settlement NPCs
const settlementNPCs: PlayCanvasCharacter[] = [];
for (let i = 0; i < 12; i++) {
  const npc = new PlayCanvasCharacter(app as any, {
    id: `NPC_${i}`,
    name: `NPC_${i}`,
    team: 'neutral',
    color: new pc.Color(0.6, 0.5, 0.3),
    type: 'infantry',
    scale: 0.9
  });
  npc.setPosition((i % 4) * 8 - 12, 0, Math.floor(i / 4) * 8 - 10);
  settlementNPCs.push(npc);
}

// Populate 8 Wildlife Animals
const animals: PlayCanvasAnimal[] = [];
for (let i = 0; i < 8; i++) {
  const kind = i < 4 ? 'deer' : (i < 6 ? 'boar' : 'wolf');
  const animal = new PlayCanvasAnimal(app as any, `Animal_${i}`, kind as any);
  animal.setPosition(-40 + (i % 3) * 6, 0, -30 + Math.floor(i / 3) * 6);
  animals.push(animal);
}

// Spawn 15 Raiders
const raiders: PlayCanvasCharacter[] = [];
for (let i = 0; i < 15; i++) {
  const isArcher = i % 3 === 0;
  const raider = new PlayCanvasCharacter(app as any, {
    id: `Raider_${i}`,
    name: `Raider_${i}`,
    team: 'enemy',
    color: new pc.Color(0.7, 0.2, 0.2),
    type: isArcher ? 'archer' : 'infantry',
    scale: 1.0,
    hasBow: isArcher,
    weaponType: isArcher ? 'bow' : 'axe'
  });
  raider.setPosition(35 + (i % 5) * 3, 0, 30 + Math.floor(i / 5) * 3);
  raiders.push(raider);
}

// Hero Character
const heroChar = new PlayCanvasCharacter(app as any, {
  id: 'HeroCharacter',
  name: 'HeroCharacter',
  team: 'player',
  color: new pc.Color(0.85, 0.7, 0.15),
  type: 'hero',
  isHero: true,
  scale: 1.05,
  hasShield: true,
  weaponType: 'sword'
});
heroChar.setPosition(0, 0, 8);

// -------------------------------------------------------------------
// Traverse Scene and Catalog Every Single MeshInstance
// -------------------------------------------------------------------

interface MeshCategoryStats {
  category: string;
  forwardInstances: number;
  shadowCasters: number;
  totalDraws: number;
  triangles: number;
}

const categories: Record<string, MeshCategoryStats> = {
  terrain: { category: 'terrain', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  buildings: { category: 'buildings', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  vegetation: { category: 'vegetation', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  characters: { category: 'characters', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  weapons_equipment: { category: 'weapons/equipment', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  water_ocean: { category: 'water/ocean', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  ui_healthbars: { category: 'ui/healthbars', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 },
  other: { category: 'other (roads/props/rocks)', forwardInstances: 0, shadowCasters: 0, totalDraws: 0, triangles: 0 }
};

function classifyEntity(entity: pc.Entity): string {
  let curr: pc.Entity | null = entity;
  let fullPath = '';
  while (curr) {
    fullPath = curr.name + '/' + fullPath;
    curr = curr.parent as pc.Entity;
  }
  const p = fullPath.toLowerCase();

  if (p.includes('terrain') || p.includes('patch')) return 'terrain';
  if (p.includes('water') || p.includes('moat') || p.includes('wellwater')) return 'water_ocean';
  if (p.includes('health') || p.includes('selectionring')) return 'ui_healthbars';
  if (p.includes('weapon') || p.includes('shield') || p.includes('quiver') || p.includes('bow')) return 'weapons_equipment';
  if (p.includes('tree') || p.includes('bush') || p.includes('reed') || p.includes('leaves') || p.includes('trunk') || p.includes('foliage')) return 'vegetation';
  if (p.includes('keep') || p.includes('gate') || p.includes('tower') || p.includes('barracks') || p.includes('cottage') || p.includes('house') || p.includes('forge') || p.includes('blacksmith') || p.includes('sawmill') || p.includes('windmill') || p.includes('mill') || p.includes('wellbasin') || p.includes('wellroof') || p.includes('palisade') || p.includes('wall') || p.includes('stall')) return 'buildings';
  if (p.includes('troop') || p.includes('npc') || p.includes('raider') || p.includes('hero') || p.includes('animal') || p.includes('wolf') || p.includes('boar') || p.includes('deer') || p.includes('body') || p.includes('head') || p.includes('leg') || p.includes('torso') || p.includes('crest')) return 'characters';
  return 'other';
}

function traverseAndCatalog(root: pc.Entity) {
  const stack: pc.Entity[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.render && node.render.meshInstances) {
      const catKey = classifyEntity(node);
      const cat = categories[catKey] || categories['other'];

      for (const mi of node.render.meshInstances) {
        cat.forwardInstances++;
        // Triangle estimate
        const numIndices = mi.mesh ? mi.mesh.primitive[0]?.count || 0 : 0;
        cat.triangles += Math.floor(numIndices / 3);

        const castsShadow = node.render.castShadows && mi.castShadow;
        if (castsShadow) {
          cat.shadowCasters++;
        }
      }
    }

    for (const child of node.children as pc.Entity[]) {
      stack.push(child);
    }
  }
}

traverseAndCatalog(app.root as pc.Entity);

let totalForward = 0;
let totalShadows = 0;
let totalTriangles = 0;

console.log('--- EXACT BREAKDOWN BY CATEGORY ---');
console.table(
  Object.values(categories).map(c => {
    const totalDraws = c.forwardInstances + c.shadowCasters;
    totalForward += c.forwardInstances;
    totalShadows += c.shadowCasters;
    totalTriangles += c.triangles;
    return {
      Category: c.category,
      'Forward Draws': c.forwardInstances,
      'Shadow Draws': c.shadowCasters,
      'Total Draws': totalDraws,
      '% of Total': 0, // will compute below
      Triangles: c.triangles
    };
  })
);

const grandTotal = totalForward + totalShadows;
console.log(`\nGrand Total Forward Draws:  ${totalForward}`);
console.log(`Grand Total Shadow Draws:   ${totalShadows}`);
console.log(`Grand Total Draw Calls:     ${grandTotal}`);
console.log(`Grand Total Triangles:      ${totalTriangles}\n`);

// Percentage breakdown
for (const c of Object.values(categories)) {
  const d = c.forwardInstances + c.shadowCasters;
  console.log(`  - ${c.category.padEnd(25)}: ${d.toString().padStart(4)} draws (${((d / grandTotal) * 100).toFixed(1)}%) | Fwd: ${c.forwardInstances}, Shadow: ${c.shadowCasters}`);
}
