/**
 * Realm of Crowns - Real 3D Medieval Model Service
 * 
 * Manages loading, caching, scaling, and animating real external GLB assets:
 * - CC0 Medieval Buildings (Keep, Windmill, Sawmill, Quarry, Barracks, Infirmary, Academy, etc.)
 * - CC0 Environmental Nature & Props (Trees, Rock boulders, Crates, Weapon racks, Targets)
 * - CC0 Rigged Animated Characters (Warlord, Guardian, Ranger, Steward, Strategist)
 * 
 * Source: KayKit Medieval Hexagon Pack & Character Pack Adventures by Kay Lousberg (CC0 Public Domain)
 */

import * as THREE from 'three';
import { GLTF, GLTFLoader, SkeletonUtils } from 'three-stdlib';
import { BuildingInstance, HeroClass } from '../../types';
import { enrichBuildingWithProgression } from './buildingProgressionArchitect';

// Asset URL maps
const BUILDING_MODELS: Record<string, string> = {
  // Central Keep / Castle
  center: '/assets/medieval/buildings/keep.glb',
  keep: '/assets/medieval/buildings/keep.glb',
  castle: '/assets/medieval/buildings/keep.glb',

  // Farm / Windmill
  farm: '/assets/medieval/buildings/windmill.glb',
  farm_1: '/assets/medieval/buildings/windmill.glb',
  windmill: '/assets/medieval/buildings/windmill.glb',

  // Sawmill / Lumber Mill
  lumber: '/assets/medieval/buildings/sawmill.glb',
  lumber_1: '/assets/medieval/buildings/sawmill.glb',
  lumber_mill: '/assets/medieval/buildings/sawmill.glb',
  sawmill: '/assets/medieval/buildings/sawmill.glb',

  // Quarry / Stone Mine
  quarry: '/assets/medieval/buildings/quarry.glb',
  quarry_1: '/assets/medieval/buildings/quarry.glb',

  // Blacksmith / Iron Mine
  iron_1: '/assets/medieval/buildings/blacksmith.glb',
  iron_mine: '/assets/medieval/buildings/blacksmith.glb',
  blacksmith: '/assets/medieval/buildings/blacksmith.glb',

  // Gold Mine / Market / Warehouse
  gold_1: '/assets/medieval/buildings/market.glb',
  gold_mine: '/assets/medieval/buildings/market.glb',
  warehouse: '/assets/medieval/buildings/market.glb',
  market: '/assets/medieval/buildings/market.glb',

  // Military Garrison / Barracks
  barracks: '/assets/medieval/buildings/barracks.glb',

  // Archery Range
  archery: '/assets/medieval/buildings/archeryrange.glb',
  archery_range: '/assets/medieval/buildings/archeryrange.glb',

  // Hospital / Infirmary / Apothecary
  hospital: '/assets/medieval/buildings/infirmary.glb',
  infirmary: '/assets/medieval/buildings/infirmary.glb',

  // Royal Academy / High Observatory
  academy: '/assets/medieval/buildings/academy.glb',

  // Stables / Residential House
  stable: '/assets/medieval/buildings/house.glb',
  house: '/assets/medieval/buildings/house.glb',

  // Gatehouse
  gate: '/assets/medieval/buildings/gate.glb',
};

const HERO_MODELS: Record<HeroClass, string> = {
  warlord: '/assets/medieval/heroes/warlord.glb',
  guardian: '/assets/medieval/heroes/guardian.glb',
  ranger: '/assets/medieval/heroes/ranger.glb',
  steward: '/assets/medieval/heroes/steward.glb',
  strategist: '/assets/medieval/heroes/strategist.glb',
};

const PROP_MODELS: Record<string, string> = {
  tree_single: '/assets/medieval/nature/tree_single.glb',
  tree_grove: '/assets/medieval/nature/tree_grove.glb',
  rock_single: '/assets/medieval/nature/rock_single.glb',
  rock_cluster: '/assets/medieval/nature/rock_cluster.glb',
  crate: '/assets/medieval/props/crate.glb',
  lumber: '/assets/medieval/props/resource_lumber.glb',
  stone: '/assets/medieval/props/resource_stone.glb',
  target: '/assets/medieval/props/target.glb',
  weaponrack: '/assets/medieval/props/weaponrack.glb',
  tent: '/assets/medieval/props/tent.glb',
};

class MedievalModelService {
  private loader: GLTFLoader;
  private gltfCache: Map<string, GLTF> = new Map();
  private pendingLoads: Map<string, Promise<GLTF>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Loads a GLTF file with caching
   */
  public async loadGLTF(url: string): Promise<GLTF> {
    if (this.gltfCache.has(url)) {
      return this.gltfCache.get(url)!;
    }

    if (this.pendingLoads.has(url)) {
      return this.pendingLoads.get(url)!;
    }

    const loadPromise = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.gltfCache.set(url, gltf);
          this.pendingLoads.delete(url);
          resolve(gltf);
        },
        undefined,
        (err) => {
          this.pendingLoads.delete(url);
          console.warn(`[MedievalModelService] Failed to load GLB at "${url}":`, err);
          reject(err);
        }
      );
    });

    this.pendingLoads.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Clones and configures a real 3D building model for a given building instance
   */
  public async createBuildingMesh(
    building: BuildingInstance,
    onWindmillFanFound?: (fan: THREE.Object3D) => void
  ): Promise<THREE.Group> {
    const typeKey = building.type.toLowerCase();
    const slotKey = building.slot.toLowerCase();
    const modelUrl = BUILDING_MODELS[typeKey] || BUILDING_MODELS[slotKey] || BUILDING_MODELS['center'];

    const gltf = await this.loadGLTF(modelUrl);
    const scene = gltf.scene.clone(true);
    const container = new THREE.Group();
    container.name = `real-building-${building.id}`;

    // Enable shadows on all meshes
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Calibrated scale and rotation so models fit district lots perfectly
    let scale = 2.4;
    let rotY = 0;

    if (typeKey === 'center' || typeKey === 'keep' || typeKey === 'castle' || slotKey === 'center') {
      scale = 2.65 + Math.min(building.level * 0.12, 0.6); // Grand Keep scales proudly with level
      rotY = 0;
    } else if (typeKey.includes('farm') || typeKey.includes('windmill') || slotKey.includes('farm')) {
      scale = 2.5;
      rotY = Math.PI * 0.25;

      // Locate the rotating fan mesh inside the windmill
      let fanMesh: THREE.Object3D | null = null;
      scene.traverse((child) => {
        if (child.name.toLowerCase().includes('fan') || child.name.toLowerCase().includes('blade')) {
          fanMesh = child;
        }
      });
      if (fanMesh && onWindmillFanFound) {
        onWindmillFanFound(fanMesh);
      }
    } else if (typeKey.includes('lumber') || typeKey.includes('sawmill') || slotKey.includes('lumber')) {
      scale = 2.45;
      rotY = -Math.PI * 0.35;
    } else if (typeKey.includes('quarry') || slotKey.includes('quarry')) {
      scale = 2.35;
      rotY = Math.PI * 0.35;
    } else if (typeKey.includes('iron') || typeKey.includes('blacksmith') || slotKey.includes('iron')) {
      scale = 2.45;
      rotY = Math.PI * 0.4;
    } else if (typeKey.includes('gold') || slotKey.includes('gold')) {
      scale = 2.35;
      rotY = Math.PI * 0.45;
    } else if (typeKey.includes('barracks') || slotKey.includes('barracks')) {
      scale = 2.5;
      rotY = -Math.PI * 0.15;
    } else if (typeKey.includes('archery') || slotKey.includes('archery')) {
      scale = 2.35;
      rotY = Math.PI;
    } else if (typeKey.includes('hospital') || typeKey.includes('infirmary') || slotKey.includes('hospital')) {
      scale = 2.4;
      rotY = Math.PI;
    } else if (typeKey.includes('academy') || slotKey.includes('academy')) {
      scale = 2.45;
      rotY = -Math.PI * 0.5;
    } else if (typeKey.includes('warehouse') || typeKey.includes('market') || slotKey.includes('warehouse')) {
      scale = 2.35;
      rotY = Math.PI * 0.5;
    } else if (typeKey.includes('stable') || slotKey.includes('stable')) {
      scale = 2.6;
      rotY = -Math.PI * 0.2;
    } else {
      scale = 2.4;
      rotY = 0;
    }

    scene.scale.set(scale, scale, scale);
    scene.rotation.y = rotY;
    container.add(scene);

    // Add Level-specific visual decoration props
    this.attachLevelDecorations(container, building, scale);

    return container;
  }

  /**
   * Attaches real 3D props (crates, lumber, stone, tents, targets) based on building upgrade level
   */
  private attachLevelDecorations(container: THREE.Group, building: BuildingInstance, baseScale: number): void {
    const key = building.type.toLowerCase();
    const lvl = building.level;

    // Enrich with comprehensive visual tier architectural additions & environmental features
    enrichBuildingWithProgression(container, building, baseScale, (url) => this.loadWorldAsset(url));

    if (lvl >= 2) {
      if (key.includes('sawmill') || key.includes('lumber')) {
        this.loadGLTF(PROP_MODELS.lumber).then((gltf) => {
          const lumber = gltf.scene.clone(true);
          lumber.scale.set(1.5, 1.5, 1.5);
          lumber.position.set(1.8, 0, 1.2);
          lumber.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(lumber);
        }).catch(() => {});
      } else if (key.includes('quarry')) {
        this.loadGLTF(PROP_MODELS.stone).then((gltf) => {
          const stone = gltf.scene.clone(true);
          stone.scale.set(1.6, 1.6, 1.6);
          stone.position.set(-1.6, 0, 1.2);
          stone.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(stone);
        }).catch(() => {});
      } else if (key.includes('barracks')) {
        this.loadGLTF(PROP_MODELS.weaponrack).then((gltf) => {
          const rack = gltf.scene.clone(true);
          rack.scale.set(1.4, 1.4, 1.4);
          rack.position.set(2.0, 0, -0.8);
          rack.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(rack);
        }).catch(() => {});
      } else if (key.includes('warehouse') || key.includes('market')) {
        this.loadGLTF(PROP_MODELS.crate).then((gltf) => {
          const crate = gltf.scene.clone(true);
          crate.scale.set(1.4, 1.4, 1.4);
          crate.position.set(1.8, 0, 1.0);
          crate.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(crate);
        }).catch(() => {});
      }
    }

    if (lvl >= 3) {
      if (key.includes('barracks')) {
        this.loadGLTF(PROP_MODELS.target).then((gltf) => {
          const target = gltf.scene.clone(true);
          target.scale.set(1.4, 1.4, 1.4);
          target.position.set(-2.0, 0, 1.4);
          target.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(target);
        }).catch(() => {});
      }
    }

    if (lvl >= 4) {
      if (key.includes('barracks') || key.includes('center') || key.includes('keep')) {
        this.loadGLTF(PROP_MODELS.tent).then((gltf) => {
          const tent = gltf.scene.clone(true);
          tent.scale.set(1.3, 1.3, 1.3);
          tent.position.set(2.8, 0, 2.2);
          tent.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          container.add(tent);
        }).catch(() => {});
      }
    }
  }

  /**
   * Loads and instantiates real 3D nature props (Pine Trees, Oak Groves, Boulders)
   */
  public async createNatureProps(scene: THREE.Scene): Promise<THREE.Group> {
    const natureGroup = new THREE.Group();
    natureGroup.name = 'real-nature-props';

    try {
      const [singleTreeGltf, groveTreeGltf, rockSingleGltf, rockClusterGltf] = await Promise.all([
        this.loadGLTF(PROP_MODELS.tree_single),
        this.loadGLTF(PROP_MODELS.tree_grove),
        this.loadGLTF(PROP_MODELS.rock_single),
        this.loadGLTF(PROP_MODELS.rock_cluster),
      ]);

      // 1. Perimeter Tree Groves
      const grovePositions = [
        { x: -19, z: -17, s: 2.4, r: 0.2 },
        { x: -21, z: 2, s: 2.5, r: 1.1 },
        { x: 20, z: -16, s: 2.4, r: 2.3 },
        { x: 21, z: 3, s: 2.5, r: 0.8 },
        { x: -17, z: -20, s: 2.2, r: 1.7 },
        { x: 17, z: -20, s: 2.2, r: 3.1 },
      ];

      grovePositions.forEach(({ x, z, s, r }) => {
        const grove = groveTreeGltf.scene.clone(true);
        grove.scale.set(s, s, s);
        grove.rotation.y = r;
        grove.position.set(x, 0, z);
        grove.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        natureGroup.add(grove);
      });

      // 2. Individual Courtyard & Roadside Trees
      const singleTreePositions = [
        { x: -6.5, z: -13.5, s: 2.2, r: 0.5 },
        { x: 6.5, z: -13.5, s: 2.2, r: 1.8 },
        { x: 8.5, z: 4.5, s: 2.0, r: 2.4 },
        { x: -8.5, z: 4.5, s: 2.0, r: 0.9 },
        { x: 14.5, z: -3.5, s: 2.0, r: 1.2 },
        { x: -13.5, z: 4.5, s: 2.0, r: 3.0 },
      ];

      singleTreePositions.forEach(({ x, z, s, r }) => {
        const tree = singleTreeGltf.scene.clone(true);
        tree.scale.set(s, s, s);
        tree.rotation.y = r;
        tree.position.set(x, 0, z);
        tree.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        natureGroup.add(tree);
      });

      // 3. Granite Boulders and Crags
      const boulderPositions = [
        { x: -16, z: 15, s: 4.0, r: 0.7, cluster: true },
        { x: 16, z: 14, s: 3.8, r: 1.9, cluster: true },
        { x: 17, z: -5, s: 3.4, r: 2.5, cluster: false },
        { x: -16.5, z: -7, s: 3.5, r: 0.3, cluster: false },
      ];

      boulderPositions.forEach(({ x, z, s, r, cluster }) => {
        const source = cluster ? rockClusterGltf : rockSingleGltf;
        const rock = source.scene.clone(true);
        rock.scale.set(s, s, s);
        rock.rotation.y = r;
        rock.position.set(x, 0, z);
        rock.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        natureGroup.add(rock);
      });

      scene.add(natureGroup);
    } catch (err) {
      console.warn('[MedievalModelService] Nature props loading error:', err);
    }

    return natureGroup;
  }

  /**
   * Loads a real rigged, animated 3D hero character with full 76-animation suite
   */
  public async loadHeroCharacter(
    heroClass: HeroClass,
    scale: number = 1.0
  ): Promise<{
    group: THREE.Group;
    mixer: THREE.AnimationMixer;
    actions: Record<string, THREE.AnimationAction>;
    playAction: (name: string, duration?: number, onFinish?: () => void) => void;
    update: (delta: number) => void;
    getCurrentActionName: () => string;
  }> {
    const url = HERO_MODELS[heroClass] || HERO_MODELS.warlord;
    const gltf = await this.loadGLTF(url);

    // Deep clone rigged skeleton with three-stdlib SkeletonUtils
    const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    const group = new THREE.Group();
    group.name = `real-hero-${heroClass}`;

    clonedScene.scale.set(scale, scale, scale);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(clonedScene);

    // Animation Mixer Setup bound to cloned hierarchy
    const mixer = new THREE.AnimationMixer(clonedScene);
    const actions: Record<string, THREE.AnimationAction> = {};
    let currentActionName = 'Idle';
    let finishTimeoutId: number | null = null;

    if (gltf.animations && gltf.animations.length > 0) {
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);

        // One-shot actions that should clamp and return to idle
        const isOneShot =
          clip.name.includes('Attack') ||
          clip.name.includes('Cheer') ||
          clip.name.includes('Hit') ||
          clip.name.includes('Jump') ||
          clip.name.includes('Death') ||
          clip.name.includes('Spellcast');

        if (isOneShot) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity);
        }

        actions[clip.name] = action;
      });

      // Prefer Idle animation by default
      const idleAction =
        actions['Idle'] ||
        actions['2H_Melee_Idle'] ||
        actions['Unarmed_Idle'] ||
        Object.values(actions)[0];

      if (idleAction) {
        idleAction.reset();
        idleAction.enabled = true;
        idleAction.setEffectiveWeight(1);
        idleAction.setEffectiveTimeScale(1);
        idleAction.play();
        currentActionName = idleAction.getClip().name;
      }
    }

    const playAction = (name: string, duration: number = 0.25, onFinish?: () => void) => {
      // Avoid resetting the animation on every frame if it is already playing
      if (currentActionName === name && actions[name]?.isRunning()) {
        return;
      }

      const nextAction = actions[name];
      if (!nextAction) {
        console.warn(`[MedievalModelService] Action "${name}" not found on hero "${heroClass}". Available:`, Object.keys(actions).slice(0, 10));
        return;
      }

      if (finishTimeoutId !== null) {
        window.clearTimeout(finishTimeoutId);
        finishTimeoutId = null;
      }

      const prevAction = actions[currentActionName];
      if (prevAction && prevAction !== nextAction) {
        prevAction.fadeOut(duration);
      }

      nextAction.reset();
      nextAction.enabled = true;
      nextAction.setEffectiveTimeScale(1);
      nextAction.setEffectiveWeight(1);
      nextAction.fadeIn(duration);
      nextAction.play();
      currentActionName = name;

      // If one-shot action, schedule smooth return to Idle when finished
      const clipDuration = nextAction.getClip().duration;
      const isOneShot =
        name.includes('Attack') ||
        name.includes('Cheer') ||
        name.includes('Hit') ||
        name.includes('Jump') ||
        name.includes('Spellcast');

      if (isOneShot && clipDuration > 0) {
        const ms = Math.max(800, (clipDuration - duration) * 1000);
        finishTimeoutId = window.setTimeout(() => {
          if (actions['Idle'] && currentActionName === name) {
            playAction('Idle', 0.3);
          }
          if (onFinish) onFinish();
        }, ms);
      }
    };

    const update = (delta: number) => {
      mixer.update(delta);
    };

    const getCurrentActionName = () => currentActionName;

    return {
      group,
      mixer,
      actions,
      playAction,
      update,
      getCurrentActionName,
    };
  }

  /**
   * Loads and clones any medieval building or prop asset for strategic world map use
   */
  public async loadWorldAsset(assetKey: string, scale: number = 1.0): Promise<THREE.Group> {
    const url = BUILDING_MODELS[assetKey] || PROP_MODELS[assetKey] || assetKey;
    const gltf = await this.loadGLTF(url);
    const clone = gltf.scene.clone(true);
    clone.scale.set(scale, scale, scale);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }

  /**
   * Retrieves nature meshes (single tree, tree grove, rocks) for instancing in world terrain
   */
  public async getNatureMeshes(): Promise<{
    treeSingle: THREE.Mesh | null;
    treeGrove: THREE.Mesh | null;
    rockSingle: THREE.Mesh | null;
    rockCluster: THREE.Mesh | null;
  }> {
    try {
      const [treeSingleGltf, treeGroveGltf, rockSingleGltf, rockClusterGltf] = await Promise.all([
        this.loadGLTF(PROP_MODELS.tree_single),
        this.loadGLTF(PROP_MODELS.tree_grove),
        this.loadGLTF(PROP_MODELS.rock_single),
        this.loadGLTF(PROP_MODELS.rock_cluster),
      ]);

      let treeSingle: THREE.Mesh | null = null;
      let treeGrove: THREE.Mesh | null = null;
      let rockSingle: THREE.Mesh | null = null;
      let rockCluster: THREE.Mesh | null = null;

      treeSingleGltf.scene.traverse((c) => {
        if (!treeSingle && (c as THREE.Mesh).isMesh) treeSingle = c as THREE.Mesh;
      });
      treeGroveGltf.scene.traverse((c) => {
        if (!treeGrove && (c as THREE.Mesh).isMesh) treeGrove = c as THREE.Mesh;
      });
      rockSingleGltf.scene.traverse((c) => {
        if (!rockSingle && (c as THREE.Mesh).isMesh) rockSingle = c as THREE.Mesh;
      });
      rockClusterGltf.scene.traverse((c) => {
        if (!rockCluster && (c as THREE.Mesh).isMesh) rockCluster = c as THREE.Mesh;
      });

      return { treeSingle, treeGrove, rockSingle, rockCluster };
    } catch (err) {
      console.warn('[MedievalModelService] getNatureMeshes failed:', err);
      return { treeSingle: null, treeGrove: null, rockSingle: null, rockCluster: null };
    }
  }
}

export const medievalModelService = new MedievalModelService();
