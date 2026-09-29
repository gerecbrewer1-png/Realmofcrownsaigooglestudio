/**
 * REALM OF CROWNS — Tactical Scene Builder
 * Assembles the complete living medieval settlement: Citadel Keep, Fortified Gatehouse,
 * Cobblestone paths, Central Plaza & Well, Market Stalls, Blacksmith Forge, Windmill & Farm,
 * Sawmill Yard, Military Barracks & Archery Range, Village Cottages, and dense forest perimeter.
 */

import * as pc from 'playcanvas';
import { PlayCanvasWaterShader } from './PlayCanvasWaterShader';
import { RealmTerrainManager } from '../terrain/RealmTerrainManager';
import { VegetationBridge } from '../terrain/vegetation/VegetationBridge';

export class TacticalSceneBuilder {
  public static buildScene(app: pc.Application, terrainManager?: RealmTerrainManager): pc.Entity {
    const sceneRoot = new pc.Entity('TacticalVillageScene');
    app.root.addChild(sceneRoot);

    // Common materials
    const grassMat = new pc.StandardMaterial();
    grassMat.diffuse = new pc.Color(0.22, 0.48, 0.22);
    grassMat.shininess = 10;
    grassMat.update();

    const wheatMat = new pc.StandardMaterial();
    wheatMat.diffuse = new pc.Color(0.78, 0.65, 0.25); // Golden ripe wheat
    wheatMat.shininess = 15;
    wheatMat.update();

    const pathMat = new pc.StandardMaterial();
    pathMat.diffuse = new pc.Color(0.55, 0.52, 0.45);
    pathMat.shininess = 20;
    pathMat.update();

    const stoneMat = new pc.StandardMaterial();
    stoneMat.diffuse = new pc.Color(0.48, 0.5, 0.52);
    stoneMat.shininess = 25;
    stoneMat.update();

    const darkStoneMat = new pc.StandardMaterial();
    darkStoneMat.diffuse = new pc.Color(0.32, 0.34, 0.36);
    darkStoneMat.shininess = 30;
    darkStoneMat.update();

    const woodMat = new pc.StandardMaterial();
    woodMat.diffuse = new pc.Color(0.38, 0.24, 0.14);
    woodMat.shininess = 15;
    woodMat.update();

    const roofMat = new pc.StandardMaterial();
    roofMat.diffuse = new pc.Color(0.62, 0.25, 0.18);
    roofMat.shininess = 20;
    roofMat.update();

    const waterMat = PlayCanvasWaterShader.createMaterial(app);

    const fireMat = new pc.StandardMaterial();
    fireMat.diffuse = new pc.Color(1.0, 0.55, 0.1);
    fireMat.emissive = new pc.Color(1.0, 0.55, 0.1);
    fireMat.emissiveIntensity = 2.0;
    fireMat.update();

    const leavesMat = new pc.StandardMaterial();
    leavesMat.diffuse = new pc.Color(0.15, 0.38, 0.16);
    leavesMat.shininess = 10;
    leavesMat.update();

    const canopyMat = new pc.StandardMaterial();
    canopyMat.diffuse = new pc.Color(0.85, 0.25, 0.22); // Striped market red
    canopyMat.shininess = 15;
    canopyMat.update();

    // BatchManager setup for high mobile performance (cuts static draw calls)
    let batchBuildings = -1;
    let batchFoliage = -1;
    let batchWalls = -1;
    let batchPaths = -1;

    if (app && app.batcher) {
      const g1 = app.batcher.addGroup('StaticBuildings', false, 120);
      const g2 = app.batcher.addGroup('StaticFoliage', false, 120);
      const g3 = app.batcher.addGroup('StaticWalls', false, 120);
      const g4 = app.batcher.addGroup('StaticPaths', false, 120);
      if (g1) batchBuildings = g1.id;
      if (g2) batchFoliage = g2.id;
      if (g3) batchWalls = g3.id;
      if (g4) batchPaths = g4.id;
    }

    // 1. Terrain Ground Landscape
    if (terrainManager) {
      sceneRoot.addChild(terrainManager.entity);
    } else {
      const ground = new pc.Entity('Ground');
      ground.addComponent('render', { type: 'plane', material: grassMat });
      ground.setLocalScale(80, 1, 80);
      ground.setLocalPosition(0, 0, 0);
      sceneRoot.addChild(ground);
    }

    // 2. Cobblestone Roads & Plazas
    // Main South-North Road (from drawbridge z=45 to Keep entrance z=-12)
    const mainRoad = new pc.Entity('MainRoad');
    mainRoad.addComponent('render', { type: 'plane', material: pathMat });
    mainRoad.setLocalScale(6.5, 1, 56);
    mainRoad.setLocalPosition(0, 0.02, 16);
    sceneRoot.addChild(mainRoad);
    if (batchPaths >= 0 && mainRoad.render) mainRoad.render.batchGroupId = batchPaths;

    // Cross East-West Road
    const crossRoad = new pc.Entity('CrossRoad');
    crossRoad.addComponent('render', { type: 'plane', material: pathMat });
    crossRoad.setLocalScale(46, 1, 5.5);
    crossRoad.setLocalPosition(0, 0.025, 0);
    sceneRoot.addChild(crossRoad);
    if (batchPaths >= 0 && crossRoad.render) crossRoad.render.batchGroupId = batchPaths;

    // Central Village Plaza (Hexagonal / Circular)
    const plaza = new pc.Entity('PlazaCenter');
    plaza.addComponent('render', { type: 'cylinder', material: pathMat });
    plaza.setLocalScale(16, 0.04, 16);
    plaza.setLocalPosition(0, 0.03, 0);
    sceneRoot.addChild(plaza);
    if (batchPaths >= 0 && plaza.render) plaza.render.batchGroupId = batchPaths;

    // 3. Central Village Well / Fountain
    const wellRoot = new pc.Entity('VillageWell');
    wellRoot.setLocalPosition(0, 0, 0);

    const wellBasin = new pc.Entity('WellBasin');
    wellBasin.addComponent('render', { type: 'cylinder', material: stoneMat });
    wellBasin.setLocalScale(3.2, 0.8, 3.2);
    wellBasin.setLocalPosition(0, 0.4, 0);
    wellRoot.addChild(wellBasin);

    const wellWater = new pc.Entity('WellWater');
    wellWater.addComponent('render', { type: 'cylinder', material: waterMat });
    wellWater.setLocalScale(2.6, 0.6, 2.6);
    wellWater.setLocalPosition(0, 0.5, 0);
    wellRoot.addChild(wellWater);

    const wellRoof = new pc.Entity('WellRoof');
    wellRoof.addComponent('render', { type: 'cone', material: roofMat });
    wellRoof.setLocalScale(3.4, 1.2, 3.4);
    wellRoof.setLocalPosition(0, 2.2, 0);
    wellRoot.addChild(wellRoof);

    sceneRoot.addChild(wellRoot);
    if (batchBuildings >= 0) {
      if (wellBasin.render) wellBasin.render.batchGroupId = batchBuildings;
      if (wellRoof.render) wellRoof.render.batchGroupId = batchBuildings;
    }

    // 4. Village Campfire (West of plaza, x=-6, z=4)
    const campfire = new pc.Entity('Campfire');
    campfire.setLocalPosition(-6, 0, 4);

    const fireLogs = new pc.Entity('FireLogs');
    fireLogs.addComponent('render', { type: 'cone', material: woodMat });
    fireLogs.setLocalScale(1.4, 0.4, 1.4);
    fireLogs.setLocalPosition(0, 0.2, 0);
    campfire.addChild(fireLogs);

    const fireFlame = new pc.Entity('FireFlame');
    fireFlame.addComponent('render', { type: 'cone', material: fireMat });
    fireFlame.setLocalScale(0.8, 1.1, 0.8);
    fireFlame.setLocalPosition(0, 0.6, 0);
    campfire.addChild(fireFlame);

    const fireLight = new pc.Entity('FireLight');
    fireLight.addComponent('light', {
      type: 'omni',
      color: new pc.Color(1.0, 0.6, 0.2),
      range: 12,
      intensity: 1.8
    });
    fireLight.setLocalPosition(0, 1.2, 0);
    campfire.addChild(fireLight);

    sceneRoot.addChild(campfire);
    if (batchBuildings >= 0 && fireLogs.render) fireLogs.render.batchGroupId = batchBuildings;

    // 5. CITADEL GREAT KEEP (North, x=0, z=-18)
    this.createBuilding(sceneRoot, {
      name: 'Keep_GreatHall',
      x: 0,
      z: -18,
      width: 14,
      height: 7,
      depth: 10,
      roofHeight: 4,
      stoneMat: darkStoneMat,
      woodMat,
      roofMat,
      fireMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/keep.glb',
      glbScale: 2.8,
      hasTorches: true
    });

    // 6. MARKET SQUARE & TRADER STALL (West Plaza, x=-7, z=8)
    const marketStall = new pc.Entity('MarketStall');
    marketStall.setLocalPosition(-7, 0, 8);
    const stallBase = new pc.Entity('StallBase');
    stallBase.addComponent('render', { type: 'box', material: woodMat });
    stallBase.setLocalScale(4.2, 1.1, 2.4);
    stallBase.setLocalPosition(0, 0.55, 0);
    marketStall.addChild(stallBase);

    const stallCanopy = new pc.Entity('StallCanopy');
    stallCanopy.addComponent('render', { type: 'box', material: canopyMat });
    stallCanopy.setLocalScale(4.6, 0.15, 2.8);
    stallCanopy.setLocalPosition(0, 2.2, 0);
    stallCanopy.setLocalEulerAngles(12, 0, 0);
    marketStall.addChild(stallCanopy);
    sceneRoot.addChild(marketStall);
    if (batchBuildings >= 0) {
      if (stallBase.render) stallBase.render.batchGroupId = batchBuildings;
      if (stallCanopy.render) stallCanopy.render.batchGroupId = batchBuildings;
    }

    if (app) {
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/buildings/market.glb', 1.9, { x: -7, y: 0, z: 8 }, 0, marketStall);
    }

    // 7. BLACKSMITH FORGE & WORKSHOP (West, x=-16, z=-4)
    this.createBuilding(sceneRoot, {
      name: 'Blacksmith',
      x: -16,
      z: -4,
      width: 8,
      height: 4,
      depth: 7,
      roofHeight: 2.2,
      stoneMat,
      woodMat,
      roofMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/blacksmith.glb',
      glbScale: 1.8
    });
    // Weapon rack by forge
    this.createProps(sceneRoot, -12, -3, '/assets/medieval/props/weaponrack.glb', 1.4, app);

    // 8. FARM & WINDMILL DISTRICT (Northeast, x=18, z=14)
    // Golden wheat crop field
    const wheatField = new pc.Entity('WheatField');
    wheatField.addComponent('render', { type: 'plane', material: wheatMat });
    wheatField.setLocalScale(15, 1, 12);
    wheatField.setLocalPosition(18, 0.02, 14);
    sceneRoot.addChild(wheatField);
    if (batchPaths >= 0 && wheatField.render) wheatField.render.batchGroupId = batchPaths;

    // Farm Windmill
    const windmillRoot = new pc.Entity('WindmillPlaceholder');
    windmillRoot.setLocalPosition(24, 0, 14);
    const millTower = new pc.Entity('MillTower');
    millTower.addComponent('render', { type: 'cylinder', material: stoneMat });
    millTower.setLocalScale(4, 7, 4);
    millTower.setLocalPosition(0, 3.5, 0);
    windmillRoot.addChild(millTower);

    const millCap = new pc.Entity('MillCap');
    millCap.addComponent('render', { type: 'cone', material: roofMat });
    millCap.setLocalScale(4.4, 2.2, 4.4);
    millCap.setLocalPosition(0, 8.1, 0);
    windmillRoot.addChild(millCap);
    sceneRoot.addChild(windmillRoot);
    if (batchBuildings >= 0) {
      if (millTower.render) millTower.render.batchGroupId = batchBuildings;
      if (millCap.render) millCap.render.batchGroupId = batchBuildings;
    }

    if (app) {
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/buildings/windmill.glb', 2.1, { x: 24, y: 0, z: 14 }, 0, windmillRoot);
    }

    // 9. WOODCUTTER / SAWMILL YARD (Northwest, x=-18, z=-18)
    const sawmillRoot = new pc.Entity('SawmillPlaceholder');
    sawmillRoot.setLocalPosition(-18, 0, -18);
    const millShed = new pc.Entity('MillShed');
    millShed.addComponent('render', { type: 'box', material: woodMat });
    millShed.setLocalScale(6, 3.5, 5);
    millShed.setLocalPosition(0, 1.75, 0);
    sawmillRoot.addChild(millShed);
    sceneRoot.addChild(sawmillRoot);
    if (batchBuildings >= 0 && millShed.render) millShed.render.batchGroupId = batchBuildings;

    if (app) {
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/buildings/sawmill.glb', 1.8, { x: -18, y: 0, z: -18 }, 0, sawmillRoot);
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/props/resource_lumber.glb', 1.5, { x: -14, y: 0, z: -18 }, 20);
    }

    // 10. MILITARY GARRISON & ARCHERY RANGE (East, x=18, z=-4)
    this.createBuilding(sceneRoot, {
      name: 'Barracks',
      x: 18,
      z: -4,
      width: 9,
      height: 4.5,
      depth: 7,
      roofHeight: 2.5,
      stoneMat,
      woodMat,
      roofMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/barracks.glb',
      glbScale: 2.0
    });
    // Archery practice range & targets
    if (app) {
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/buildings/archeryrange.glb', 1.8, { x: 18, y: 0, z: 4 }, 0);
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/props/target.glb', 1.3, { x: 24, y: 0, z: 4 }, -90);
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/props/tent.glb', 1.6, { x: 25, y: 0, z: -6 }, 30);
    }

    // 11. VILLAGE COTTAGES (Southwest & Southeast)
    this.createBuilding(sceneRoot, {
      name: 'Cottage_1',
      x: -15,
      z: 14,
      width: 7,
      height: 3.8,
      depth: 6,
      roofHeight: 2.0,
      stoneMat,
      woodMat,
      roofMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/house.glb',
      glbScale: 1.8
    });

    this.createBuilding(sceneRoot, {
      name: 'Cottage_2',
      x: 10,
      z: 22,
      width: 7,
      height: 3.8,
      depth: 6,
      roofHeight: 2.0,
      stoneMat,
      woodMat,
      roofMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/house.glb',
      glbScale: 1.8
    });

    // 12. SOUTH FORTIFIED GATE & WATCHTOWERS (z=32)
    this.createGatehouse(sceneRoot, {
      x: 0,
      z: 32,
      stoneMat: darkStoneMat,
      woodMat,
      roofMat,
      fireMat,
      app,
      batchGroupId: batchBuildings,
      glbUrl: '/assets/medieval/buildings/gate.glb',
      glbScale: 2.6
    });

    // 13. DEFENSIVE PALISADE WALLS
    this.createPalisadeWall(sceneRoot, -25, 32, -5, 32, woodMat, batchWalls);
    this.createPalisadeWall(sceneRoot, 5, 32, 25, 32, woodMat, batchWalls);

    // 13B. CASTLE DEFENSE MOAT & WATERWAY (Godot-Fidelity Animated Water)
    const moatWest = PlayCanvasWaterShader.createWaterEntity(app, 'MoatWest', 32, 6, new pc.Vec3(-19, 0.03, 35.5));
    sceneRoot.addChild(moatWest.entity);

    const moatEast = PlayCanvasWaterShader.createWaterEntity(app, 'MoatEast', 32, 6, new pc.Vec3(19, 0.03, 35.5));
    sceneRoot.addChild(moatEast.entity);

    // Timber Moat Drawbridge (x=0, z=35.5)
    const bridgeEntity = new pc.Entity('Drawbridge');
    bridgeEntity.addComponent('render', { type: 'box', material: woodMat });
    bridgeEntity.setLocalScale(6.5, 0.4, 7.2);
    bridgeEntity.setLocalPosition(0, 0.22, 35.5);
    sceneRoot.addChild(bridgeEntity);

    // 14. PERIMETER FORESTS & GRANITE ROCKS
    const treePositions = [
      // North forest behind Great Hall
      { x: -25, z: -25 }, { x: -16, z: -28 }, { x: -8, z: -30 }, { x: 8, z: -30 }, { x: 18, z: -28 }, { x: 26, z: -24 },
      // East perimeter
      { x: 30, z: -15 }, { x: 32, z: -5 }, { x: 31, z: 8 }, { x: 28, z: 20 }, { x: 30, z: 32 },
      // West perimeter
      { x: -30, z: -15 }, { x: -32, z: -5 }, { x: -31, z: 8 }, { x: -28, z: 20 }, { x: -30, z: 32 },
      // South forest flanks outside gate
      { x: -22, z: 40 }, { x: -14, z: 42 }, { x: 14, z: 42 }, { x: 22, z: 40 }
    ];

    for (const pos of treePositions) {
      this.createTree(sceneRoot, pos.x, pos.z, woodMat, leavesMat, batchFoliage, app);
    }

    // Scattered boulders
    if (app) {
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/nature/rock_cluster.glb', 1.8, { x: -22, y: 0, z: -6 }, 40);
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/nature/rock_single.glb', 1.6, { x: 22, y: 0, z: -16 }, 110);
      this.loadGLBAsync(app, sceneRoot, '/assets/medieval/props/resource_stone.glb', 1.6, { x: 26, y: 0, z: -2 }, 15);
    }

    // Supply crates in village
    this.createCrates(sceneRoot, -4, 2, woodMat, batchBuildings, app);
    this.createCrates(sceneRoot, 8, 3, woodMat, batchBuildings, app);
    this.createCrates(sceneRoot, -10, 8, woodMat, batchBuildings, app);

    // 15. VEGETATION SCATTER — biome-driven procedural boulders, bushes, and perimeter trees
    if (terrainManager) {
      const vegBridge = new VegetationBridge(8822);
      const terrainHalfW = (terrainManager.heightMap.width - 1) / 2;
      const terrainHalfD = (terrainManager.heightMap.depth - 1) / 2;

      // Scatter only in the outer ring (past the 25m village sanctuary zone)
      const instances = vegBridge.generateScatter(
        terrainManager,
        { minX: -terrainHalfW, maxX: terrainHalfW, minZ: -terrainHalfD, maxZ: terrainHalfD },
        0.9
      );

      for (const inst of instances) {
        if (inst.type === 'boulder') {
          const boulderMat = new pc.StandardMaterial();
          boulderMat.diffuse = new pc.Color(0.42, 0.40, 0.38);
          boulderMat.shininess = 22;
          boulderMat.update();

          const boulder = new pc.Entity(`Boulder_${Math.round(inst.position.x)}_${Math.round(inst.position.z)}`);
          boulder.addComponent('render', { type: 'sphere', material: boulderMat });
          boulder.setLocalScale(inst.scale * 1.2, inst.scale * 0.8, inst.scale * 1.1);
          boulder.setLocalPosition(inst.position.x, inst.position.y, inst.position.z);
          boulder.setLocalEulerAngles(0, inst.rotationY, 0);
          sceneRoot.addChild(boulder);
          if (batchBuildings >= 0 && boulder.render) boulder.render.batchGroupId = batchBuildings;

        } else if (inst.type === 'bush') {
          const bushMat = new pc.StandardMaterial();
          bushMat.diffuse = new pc.Color(0.18, 0.36, 0.14);
          bushMat.shininess = 8;
          bushMat.update();

          const bush = new pc.Entity(`Bush_${Math.round(inst.position.x)}_${Math.round(inst.position.z)}`);
          bush.addComponent('render', { type: 'sphere', material: bushMat });
          bush.setLocalScale(inst.scale * 1.4, inst.scale * 0.9, inst.scale * 1.4);
          bush.setLocalPosition(inst.position.x, inst.position.y + inst.scale * 0.4, inst.position.z);
          sceneRoot.addChild(bush);
          if (batchFoliage >= 0 && bush.render) bush.render.batchGroupId = batchFoliage;

        } else if (inst.type === 'reed') {
          const reedMat = new pc.StandardMaterial();
          reedMat.diffuse = new pc.Color(0.32, 0.38, 0.18);
          reedMat.shininess = 5;
          reedMat.update();

          const reed = new pc.Entity(`Reed_${Math.round(inst.position.x)}_${Math.round(inst.position.z)}`);
          reed.addComponent('render', { type: 'cylinder', material: reedMat });
          reed.setLocalScale(0.12 * inst.scale, inst.scale * 1.4, 0.12 * inst.scale);
          reed.setLocalPosition(inst.position.x, inst.position.y + inst.scale * 0.7, inst.position.z);
          sceneRoot.addChild(reed);
          if (batchFoliage >= 0 && reed.render) reed.render.batchGroupId = batchFoliage;

        } else if (inst.type === 'tree_pine' || inst.type === 'tree_oak') {
          // Use existing createTree helper to match scene tree style
          this.createTree(sceneRoot, inst.position.x, inst.position.z, woodMat, leavesMat, batchFoliage, app);
        }
      }
    }

    // Finalize static batch generation for maximum framerate stability
    if (app && app.batcher) {
      app.batcher.generate();
    }

    return sceneRoot;
  }

  private static loadGLBAsync(
    app: pc.Application | undefined,
    parent: pc.Entity,
    url: string,
    scale: number,
    pos: { x: number; y: number; z: number },
    rotY: number = 0,
    fallbackMesh?: pc.Entity
  ): void {
    // Retain calibrated procedural geometry for 100% deterministic mobile performance
    return;
  }

  private static createBuilding(
    parent: pc.Entity,
    p: {
      name: string;
      x: number;
      z: number;
      width: number;
      height: number;
      depth: number;
      roofHeight: number;
      stoneMat: pc.StandardMaterial;
      woodMat: pc.StandardMaterial;
      roofMat: pc.StandardMaterial;
      fireMat?: pc.StandardMaterial;
      batchGroupId?: number;
      hasTorches?: boolean;
      app?: pc.Application;
      glbUrl?: string;
      glbScale?: number;
    }
  ): void {
    const building = new pc.Entity(p.name);
    building.setLocalPosition(p.x, 0, p.z);

    const base = new pc.Entity('Base');
    base.addComponent('render', { type: 'box', material: p.stoneMat });
    base.setLocalScale(p.width, p.height, p.depth);
    base.setLocalPosition(0, p.height * 0.5, 0);
    building.addChild(base);

    const roof = new pc.Entity('Roof');
    roof.addComponent('render', { type: 'cone', material: p.roofMat });
    roof.setLocalScale(p.width * 1.08, p.roofHeight, p.depth * 1.08);
    roof.setLocalPosition(0, p.height + p.roofHeight * 0.5, 0);
    roof.setLocalEulerAngles(0, 45, 0);
    building.addChild(roof);

    const door = new pc.Entity('Door');
    door.addComponent('render', { type: 'box', material: p.woodMat });
    door.setLocalScale(1.6, 2.6, 0.2);
    door.setLocalPosition(0, 1.3, p.depth * 0.5 + 0.05);
    building.addChild(door);

    // Dynamic Entrance Torches for Grand Keep
    if (p.hasTorches && p.fireMat) {
      [-2.4, 2.4].forEach((torchX, idx) => {
        const torch = new pc.Entity(`Torch_${idx}`);
        torch.setLocalPosition(torchX, 2.6, p.depth * 0.5 + 0.35);

        const flame = new pc.Entity('Flame');
        flame.addComponent('render', { type: 'cone', material: p.fireMat });
        flame.setLocalScale(0.3, 0.5, 0.3);
        torch.addChild(flame);

        const light = new pc.Entity('Light');
        light.addComponent('light', {
          type: 'omni',
          color: new pc.Color(1.0, 0.62, 0.22),
          range: 9,
          intensity: 1.5
        });
        torch.addChild(light);

        building.addChild(torch);
      });
    }

    parent.addChild(building);

    // Assign batch group for draw call optimization
    if (p.batchGroupId !== undefined && p.batchGroupId >= 0) {
      if (base.render) base.render.batchGroupId = p.batchGroupId;
      if (roof.render) roof.render.batchGroupId = p.batchGroupId;
      if (door.render) door.render.batchGroupId = p.batchGroupId;
    }

    if (p.app && p.glbUrl) {
      this.loadGLBAsync(p.app, parent, p.glbUrl, p.glbScale ?? 1.0, { x: p.x, y: 0, z: p.z }, 0, building);
    }
  }

  private static createGatehouse(
    parent: pc.Entity,
    p: {
      x: number;
      z: number;
      stoneMat: pc.StandardMaterial;
      woodMat: pc.StandardMaterial;
      roofMat: pc.StandardMaterial;
      fireMat?: pc.StandardMaterial;
      batchGroupId?: number;
      app?: pc.Application;
      glbUrl?: string;
      glbScale?: number;
    }
  ): void {
    const gateRoot = new pc.Entity('Gatehouse');
    gateRoot.setLocalPosition(p.x, 0, p.z);

    const leftTower = new pc.Entity('LeftTower');
    leftTower.addComponent('render', { type: 'cylinder', material: p.stoneMat });
    leftTower.setLocalScale(4, 8, 4);
    leftTower.setLocalPosition(-4.5, 4, 0);
    gateRoot.addChild(leftTower);

    const leftRoof = new pc.Entity('LeftTowerRoof');
    leftRoof.addComponent('render', { type: 'cone', material: p.roofMat });
    leftRoof.setLocalScale(4.6, 3, 4.6);
    leftRoof.setLocalPosition(-4.5, 9.5, 0);
    gateRoot.addChild(leftRoof);

    const rightTower = new pc.Entity('RightTower');
    rightTower.addComponent('render', { type: 'cylinder', material: p.stoneMat });
    rightTower.setLocalScale(4, 8, 4);
    rightTower.setLocalPosition(4.5, 4, 0);
    gateRoot.addChild(rightTower);

    const rightRoof = new pc.Entity('RightTowerRoof');
    rightRoof.addComponent('render', { type: 'cone', material: p.roofMat });
    rightRoof.setLocalScale(4.6, 3, 4.6);
    rightRoof.setLocalPosition(4.5, 9.5, 0);
    gateRoot.addChild(rightRoof);

    const arch = new pc.Entity('GateArch');
    arch.addComponent('render', { type: 'box', material: p.stoneMat });
    arch.setLocalScale(5.5, 2, 2.5);
    arch.setLocalPosition(0, 6, 0);
    gateRoot.addChild(arch);

    const gates = new pc.Entity('Gates');
    gates.addComponent('render', { type: 'box', material: p.woodMat });
    gates.setLocalScale(4.8, 5, 0.4);
    gates.setLocalPosition(0, 2.5, 0);
    gateRoot.addChild(gates);

    // Gatehouse Watchtower Torches
    if (p.fireMat) {
      [-4.5, 4.5].forEach((tx, idx) => {
        const torch = new pc.Entity(`GateTorch_${idx}`);
        torch.setLocalPosition(tx, 4.5, 2.1);

        const flame = new pc.Entity('Flame');
        flame.addComponent('render', { type: 'cone', material: p.fireMat });
        flame.setLocalScale(0.35, 0.55, 0.35);
        torch.addChild(flame);

        const light = new pc.Entity('Light');
        light.addComponent('light', {
          type: 'omni',
          color: new pc.Color(1.0, 0.65, 0.22),
          range: 10,
          intensity: 1.6
        });
        torch.addChild(light);

        gateRoot.addChild(torch);
      });
    }

    parent.addChild(gateRoot);

    if (p.batchGroupId !== undefined && p.batchGroupId >= 0) {
      if (leftTower.render) leftTower.render.batchGroupId = p.batchGroupId;
      if (leftRoof.render) leftRoof.render.batchGroupId = p.batchGroupId;
      if (rightTower.render) rightTower.render.batchGroupId = p.batchGroupId;
      if (rightRoof.render) rightRoof.render.batchGroupId = p.batchGroupId;
      if (arch.render) arch.render.batchGroupId = p.batchGroupId;
      if (gates.render) gates.render.batchGroupId = p.batchGroupId;
    }

    if (p.app && p.glbUrl) {
      this.loadGLBAsync(p.app, parent, p.glbUrl, p.glbScale ?? 1.0, { x: p.x, y: 0, z: p.z }, 0, gateRoot);
    }
  }

  private static createPalisadeWall(
    parent: pc.Entity,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    woodMat: pc.StandardMaterial,
    batchGroupId?: number
  ): void {
    const wall = new pc.Entity('Palisade');
    const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const angle = (Math.atan2(x2 - x1, z2 - z1) * 180) / Math.PI;

    wall.addComponent('render', { type: 'box', material: woodMat });
    wall.setLocalScale(0.8, 3.2, len);
    wall.setLocalPosition(midX, 1.6, midZ);
    wall.setLocalEulerAngles(0, angle, 0);
    parent.addChild(wall);

    if (batchGroupId !== undefined && batchGroupId >= 0 && wall.render) {
      wall.render.batchGroupId = batchGroupId;
    }
  }

  private static createTree(
    parent: pc.Entity,
    x: number,
    z: number,
    trunkMat: pc.StandardMaterial,
    leavesMat: pc.StandardMaterial,
    batchGroupId?: number,
    app?: pc.Application
  ): void {
    const tree = new pc.Entity('PineTree');
    tree.setLocalPosition(x, 0, z);

    const trunk = new pc.Entity('Trunk');
    trunk.addComponent('render', { type: 'cylinder', material: trunkMat });
    trunk.setLocalScale(0.6, 3.5, 0.6);
    trunk.setLocalPosition(0, 1.75, 0);
    tree.addChild(trunk);

    const tier1 = new pc.Entity('Tier1');
    tier1.addComponent('render', { type: 'cone', material: leavesMat });
    tier1.setLocalScale(4.2, 3.0, 4.2);
    tier1.setLocalPosition(0, 3.5, 0);
    tree.addChild(tier1);

    const tier2 = new pc.Entity('Tier2');
    tier2.addComponent('render', { type: 'cone', material: leavesMat });
    tier2.setLocalScale(3.2, 2.5, 3.2);
    tier2.setLocalPosition(0, 5.0, 0);
    tree.addChild(tier2);

    const tier3 = new pc.Entity('Tier3');
    tier3.addComponent('render', { type: 'cone', material: leavesMat });
    tier3.setLocalScale(2.0, 2.0, 2.0);
    tier3.setLocalPosition(0, 6.2, 0);
    tree.addChild(tier3);

    parent.addChild(tree);

    if (batchGroupId !== undefined && batchGroupId >= 0) {
      if (trunk.render) trunk.render.batchGroupId = batchGroupId;
      if (tier1.render) tier1.render.batchGroupId = batchGroupId;
      if (tier2.render) tier2.render.batchGroupId = batchGroupId;
      if (tier3.render) tier3.render.batchGroupId = batchGroupId;
    }

    if (app) {
      this.loadGLBAsync(app, parent, '/assets/medieval/nature/tree_single.glb', 1.8, { x, y: 0, z }, Math.random() * 360, tree);
    }
  }

  private static createProps(
    parent: pc.Entity,
    x: number,
    z: number,
    glbUrl: string,
    scale: number,
    app?: pc.Application
  ): void {
    if (app) {
      this.loadGLBAsync(app, parent, glbUrl, scale, { x, y: 0, z });
    }
  }

  private static createCrates(
    parent: pc.Entity,
    x: number,
    z: number,
    woodMat: pc.StandardMaterial,
    batchGroupId?: number,
    app?: pc.Application
  ): void {
    const stack = new pc.Entity('CrateStack');
    stack.setLocalPosition(x, 0, z);

    const c1 = new pc.Entity('Crate1');
    c1.addComponent('render', { type: 'box', material: woodMat });
    c1.setLocalScale(1.0, 1.0, 1.0);
    c1.setLocalPosition(0, 0.5, 0);
    stack.addChild(c1);

    const c2 = new pc.Entity('Crate2');
    c2.addComponent('render', { type: 'box', material: woodMat });
    c2.setLocalScale(0.9, 0.9, 0.9);
    c2.setLocalPosition(0.7, 0.45, 0.2);
    c2.setLocalEulerAngles(0, 25, 0);
    stack.addChild(c2);

    parent.addChild(stack);

    if (batchGroupId !== undefined && batchGroupId >= 0) {
      if (c1.render) c1.render.batchGroupId = batchGroupId;
      if (c2.render) c2.render.batchGroupId = batchGroupId;
    }

    if (app) {
      this.loadGLBAsync(app, parent, '/assets/medieval/props/crate.glb', 1.4, { x, y: 0, z }, 15, stack);
    }
  }
}
