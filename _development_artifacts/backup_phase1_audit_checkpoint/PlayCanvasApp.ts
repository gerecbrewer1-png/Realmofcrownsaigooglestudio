/**
 * REALM OF CROWNS — PlayCanvas Tactical 3D Engine & Battle Runtime
 * Manages WebGL2/WebGPU lifecycle, camera follow, mobile controls, 30-unit starter army,
 * 12-villager simulation with 4-phase daily schedules, wildlife fauna, arrow projectiles, and multi-wave raid combat.
 */

import * as pc from 'playcanvas';
import { TacticalSceneBuilder } from './TacticalSceneBuilder';
import { PlayCanvasCharacter } from './PlayCanvasCharacter';
import { PlayCanvasAnimal } from './PlayCanvasAnimal';
import { RealmTerrainManager } from '../terrain/RealmTerrainManager';
import { BiomeKey } from '../terrain/biomes/BiomeTypes';
import { HeroController } from '../heroes/heroController';
import { HeroProfile } from '../heroes/heroTypes';
import { ArmyController } from '../armies/armyController';
import { FormationType, TacticalOrder } from '../armies/armyTypes';
import { CombatSystem } from '../combat/combatSystem';
import { Combatant } from '../combat/combatTypes';
import { RaidEventSystem, RaiderUnit } from '../events/raidEventSystem';
import { PerformanceMonitor } from '../mobile/performanceMonitor';
import { NPCEntity, PersonalityTrait, VillagerOccupation, getRelationshipTier } from '../npc/npcTypes';
import { DecisionSystem, WorldContext } from '../ai/decisionSystem';
import { AnimalSystem } from '../npc/animalSystem';
import { soundEngine } from '../../audio/soundEngine';
import { BattleWaveManager } from '../battles/battleWaveManager';
import { TrainingArenaManager, DuelDifficulty } from '../arena/trainingArena';
import { ArmyOrder } from '../armies/armyTypes';
import { shortcutManager } from '../input/shortcutManager';
import { InputAction } from '../input/inputTypes';
import { controlPreferences } from '../input/controlPreferences';
import { CombatVFXSystem } from '../vfx/combatVFX';
import { LootSystem, LootReward } from '../loot/lootSystem';
import { RadarEntity } from '../../components/ui/TacticalRadar';

interface ArrowProjectile {
  entity: pc.Entity;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  speed: number;
  target: Combatant;
  attacker: Combatant;
}

export class PlayCanvasApp {
  public app: pc.Application;
  public canvas: HTMLCanvasElement;

  // Camera & Lights
  private cameraEntity!: pc.Entity;
  private sunEntity!: pc.Entity;

  // Controllers & Subsystems
  public heroController: HeroController;
  public armyController: ArmyController;
  public combatSystem: CombatSystem;
  public raidEventSystem: RaidEventSystem;
  public animalSystem: AnimalSystem;
  public performanceMonitor: PerformanceMonitor;
  public battleWaveManager: BattleWaveManager;
  public trainingArena: TrainingArenaManager;
  public combatVFX: CombatVFXSystem;
  public lootSystem: LootSystem;
  public terrainManager!: RealmTerrainManager;
  public onLootToast?: (reward: LootReward, x: number, y: number, z: number) => void;

  // Selection & Commands
  public selectedEntity: 'hero' | 'squad' | null = 'hero';
  public isMoveCommandPending = false;
  private destinationMarkerEntity!: pc.Entity;
  private destinationMarkerPulse = 0;
  private isTouchJoystickActive = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private isPointerDragging = false;

  // Visual Character representations
  private heroVisual?: PlayCanvasCharacter;
  private challengerVisual?: PlayCanvasCharacter;
  private squadVisuals: Map<string, PlayCanvasCharacter> = new Map();
  private npcVisuals: Map<string, PlayCanvasCharacter> = new Map();
  private raiderVisuals: Map<string, PlayCanvasCharacter> = new Map();
  private animalVisuals: Map<string, PlayCanvasAnimal> = new Map();

  // NPCs & Animals simulation state
  private npcs: NPCEntity[] = [];
  private arrows: ArrowProjectile[] = [];
  private droppedLootRaiderIds: Set<string> = new Set();

  // Centralized Shortcut subscriptions & Callbacks
  private shortcutUnsubs: Array<() => void> = [];
  public onCommandFeedback?: (text: string) => void;
  public onOpenSettings?: () => void;
  public onOpenHelp?: () => void;

  // Running loop & Time of Day clock
  private isRunning = false;
  private destroyed = false;
  private lastRaidState = 'peace';
  public timeOfDayHours = 11.5; // 0.0 to 24.0 (starts at mid-morning 11:30)

  // Camera pan & zoom state
  private camZoom = 18;
  private camOffsetX = 0;
  private camOffsetZ = 16;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Initialize PlayCanvas Application
    this.app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      keyboard: new pc.Keyboard(window)
    });

    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.setCanvasFillMode(pc.FILLMODE_NONE);

    // 2. Initialize Subsystems
    this.performanceMonitor = new PerformanceMonitor('auto');
    this.combatSystem = new CombatSystem();
    this.raidEventSystem = new RaidEventSystem();
    this.armyController = new ArmyController();
    this.animalSystem = new AnimalSystem();

    const heroProfile: HeroProfile = {
      id: 'hero_player_1',
      name: 'Lord Arthurian',
      title: 'Knight Commander of the Vanguard',
      heroClass: 'Warlord',
      level: 5,
      xp: 1250,
      xpToNextLevel: 2000,
      health: 450,
      maxHealth: 450,
      stamina: 100,
      maxStamina: 100,
      attackPower: 45,
      defensePower: 18,
      leadership: 20,
      morale: 100,
      position: { x: 0, y: 0, z: 8 },
      rotationY: 0,
      velocity: { x: 0, y: 0, z: 0 },
      moveSpeed: 4.8,
      isPlayerControlled: true,
      assignedArmyId: 'squad_royal_guard',
      animationState: 'Idle',
      abilities: [
        {
          id: 'warlord_stomp',
          name: 'Heavy Strike & Stomp',
          cooldownSeconds: 7,
          lastUsedTimestamp: 0,
          staminaCost: 30,
          radius: 6,
          range: 6,
          damageMultiplier: 1.8,
          description: 'Slams the earth with titanic force, dealing 1.8x damage and staggering nearby foes.'
        },
        {
          id: 'rally_vanguard',
          name: 'Rally the Vanguard',
          cooldownSeconds: 12,
          lastUsedTimestamp: 0,
          staminaCost: 35,
          radius: 14,
          range: 14,
          damageMultiplier: 1.0,
          description: 'Blows the royal horn, inspiring the garrison, restoring +40 HP to troops, and boosting attack.'
        },
        {
          id: 'shield_defend',
          name: 'Shield Guard',
          cooldownSeconds: 4,
          lastUsedTimestamp: 0,
          staminaCost: 20,
          radius: 2,
          range: 2,
          damageMultiplier: 0.5,
          description: 'Raises the gilded kite shield, mitigating 70% of all incoming damage.'
        }
      ]
    };

    this.heroController = new HeroController(heroProfile, { x: 0, y: 0, z: 8, rotationY: Math.PI });
    this.battleWaveManager = new BattleWaveManager();
    this.trainingArena = new TrainingArenaManager();
    this.combatVFX = new CombatVFXSystem(this.app);
    this.lootSystem = new LootSystem(this.app);

    this.lootSystem.onLootCollected = (reward) => {
      try { soundEngine.playCoins(); } catch {}
      const heroPos = this.heroController.getPosition();
      this.onLootToast?.(reward, heroPos.x, heroPos.y, heroPos.z);
      this.onCommandFeedback?.(`LOOT COLLECTED: ${reward.label}`);
    };

    this.animalSystem.onPreyKilled = (prey, killer) => {
      try { soundEngine.playChime(); } catch {}
      this.lootSystem.spawnLoot('gold', prey.position.x, prey.position.z, 25);
      this.onCommandFeedback?.(`${killer.name} brought down ${prey.name}!`);
    };

    // 3. Build Environment Scene & Markers
    this.setupCameraAndLighting();
    this.terrainManager = new RealmTerrainManager(this.app, {
      width: 129,
      depth: 129,
      patchSize: 33,
      maxHeight: 22,
      initialBiome: 'grasslands',
    });
    this.setupDestinationMarker();
    this.setupInputListeners();
    this.setupShortcutListeners();
    TacticalSceneBuilder.buildScene(this.app, this.terrainManager);

    // 4. Populate Hero, 30-Unit Army, Settlement NPCs, and Wildlife
    this.setupHeroVisual();
    this.setupFullArmy();
    this.setupSettlementNPCs();
    this.setupWildlife();

    // 5. Start engine
    this.app.start();
    this.isRunning = true;

    this.app.on('update', this.onUpdate, this);
    this.handleResize();
  }

  private setupCameraAndLighting(): void {
    // 1. Calibrated Exposure
    this.app.scene.exposure = 1.12;

    // 2. Atmospheric Height Fog
    this.app.scene.fog.type = pc.FOG_EXP2;
    this.app.scene.fog.density = 0.0055;
    const initialSky = new pc.Color(0.38, 0.52, 0.72);
    this.app.scene.fog.color = initialSky;

    // 3. Main Tactical Camera with ACES Filmic Tone Mapping
    this.cameraEntity = new pc.Entity('TacticalCamera');
    this.cameraEntity.addComponent('camera', {
      clearColor: initialSky,
      fov: 46,
      nearClip: 0.5,
      farClip: 240,
      toneMapping: pc.TONEMAP_ACES
    });
    this.cameraEntity.setPosition(0, 18, 24);
    this.cameraEntity.setEulerAngles(-45, 0, 0);
    this.app.root.addChild(this.cameraEntity);

    // 4. Directional Sun with PCF5 Soft Cascading Shadows
    this.sunEntity = new pc.Entity('DirectionalSun');
    this.sunEntity.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1.0, 0.96, 0.88),
      intensity: 1.35,
      castShadows: true,
      shadowType: pc.SHADOW_PCF5,
      shadowDistance: 85,
      shadowResolution: 2048,
      shadowBias: 0.04,
      normalOffsetBias: 0.08
    });
    this.sunEntity.setEulerAngles(52, 38, 0);
    this.app.root.addChild(this.sunEntity);

    // 5. Ambient light
    this.app.scene.ambientLight = new pc.Color(0.38, 0.42, 0.5);
  }

  private setupDestinationMarker(): void {
    this.destinationMarkerEntity = new pc.Entity('DestinationMarker');

    // Glowing amber ground ring
    const ringMat = new pc.StandardMaterial();
    ringMat.diffuse = new pc.Color(1.0, 0.78, 0.15);
    ringMat.emissive = ringMat.diffuse;
    ringMat.emissiveIntensity = 0.8;
    ringMat.update();

    const ring = new pc.Entity('MarkerRing');
    ring.addComponent('render', { type: 'cylinder', material: ringMat });
    ring.setLocalScale(2.6, 0.05, 2.6);
    ring.setLocalPosition(0, 0.04, 0);
    this.destinationMarkerEntity.addChild(ring);

    // Vertical light beacon beam
    const beamMat = new pc.StandardMaterial();
    beamMat.diffuse = new pc.Color(1.0, 0.85, 0.3);
    beamMat.emissive = beamMat.diffuse;
    beamMat.emissiveIntensity = 0.7;
    beamMat.blendType = pc.BLEND_ADDITIVE;
    beamMat.opacity = 0.65;
    beamMat.update();

    const beam = new pc.Entity('MarkerBeam');
    beam.addComponent('render', { type: 'cylinder', material: beamMat });
    beam.setLocalScale(0.18, 3.8, 0.18);
    beam.setLocalPosition(0, 1.9, 0);
    this.destinationMarkerEntity.addChild(beam);

    this.destinationMarkerEntity.enabled = false;
    this.app.root.addChild(this.destinationMarkerEntity);
  }

  private setupInputListeners(): void {
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.isPointerDragging = false;
    });

    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.buttons === 4 || e.buttons === 2) {
        // Middle or right drag camera pan
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.camOffsetX -= dx * 0.04;
        this.camOffsetZ -= dy * 0.04;
        this.isPointerDragging = true;
      }
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    this.canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this.isPointerDragging) {
        this.handlePointerClick(e);
      }
      this.isPointerDragging = false;
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.camZoom = Math.max(8, Math.min(34, this.camZoom + e.deltaY * 0.02));
    }, { passive: false });

    // Context menu prevention for right-click RTS controls
    this.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      this.handleRightClick(e);
    });
  }

  public screenToGround(screenX: number, screenY: number): { x: number; z: number } | null {
    if (!this.cameraEntity || !this.cameraEntity.camera) return null;
    const from = this.cameraEntity.getPosition();
    const to = new pc.Vec3();
    this.cameraEntity.camera.screenToWorld(screenX, screenY, this.cameraEntity.camera.farClip, to);
    const dir = new pc.Vec3().sub2(to, from).normalize();
    if (Math.abs(dir.y) < 0.0001) return null;
    const t = -from.y / dir.y;
    if (t <= 0) return null;
    return { x: from.x + t * dir.x, z: from.z + t * dir.z };
  }

  private handlePointerClick(e: PointerEvent): void {
    if (e.button === 2) return; // Right click handled separately

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const groundHit = this.screenToGround(screenX, screenY);
    if (!groundHit) return;

    // If in Move Command mode, issue Move to ground coordinate
    if (this.isMoveCommandPending) {
      this.issueSquadMove(groundHit.x, groundHit.z);
      this.isMoveCommandPending = false;
      return;
    }

    // Check click on Hero
    const heroPos = this.heroController.getPosition();
    if (Math.hypot(groundHit.x - heroPos.x, groundHit.z - heroPos.z) < 2.5) {
      this.selectHero(true);
      return;
    }

    // Check click on Squad unit
    const squad = this.armyController.getSquad('squad_royal_guard');
    if (squad) {
      for (const u of squad.units) {
        if (!u.isDead && Math.hypot(groundHit.x - u.x, groundHit.z - u.z) < 1.8) {
          this.selectSquad(true);
          return;
        }
      }
    }

    // If hero is selected, clicking on ground issues Click-to-Move!
    if (this.selectedEntity === 'hero') {
      this.heroController.issueMoveTo(groundHit.x, groundHit.z);
      this.showDestinationMarker(groundHit.x, groundHit.z);
    }

    // If squad is selected, clicking on ground moves squad there!
    if (this.selectedEntity === 'squad') {
      this.issueSquadMove(groundHit.x, groundHit.z);
    }
  }

  private handleRightClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const groundHit = this.screenToGround(screenX, screenY);
    if (!groundHit) return;

    if (this.selectedEntity === 'hero') {
      this.heroController.issueMoveTo(groundHit.x, groundHit.z);
      this.showDestinationMarker(groundHit.x, groundHit.z);
      return;
    }

    this.selectSquad(true);
    this.issueSquadMove(groundHit.x, groundHit.z);
  }

  public showDestinationMarker(x: number, z: number): void {
    const markerY = (this.terrainManager ? this.terrainManager.getHeightAt(x, z) : 0) + 0.03;
    this.destinationMarkerEntity.setPosition(x, markerY, z);
    this.destinationMarkerEntity.enabled = true;
    this.destinationMarkerPulse = 0;
  }

  public selectSquad(selected: boolean): void {
    this.selectedEntity = selected ? 'squad' : null;
    const squad = this.armyController.getSquad('squad_royal_guard');
    if (squad) {
      squad.isSelected = selected;
      for (const u of squad.units) {
        u.isSelected = selected;
        const vis = this.squadVisuals.get(u.id);
        if (vis) vis.setSelected(selected);
      }
    }
    if (selected && this.heroVisual) {
      this.heroVisual.setSelected(false);
    }
  }

  public selectHero(selected: boolean): void {
    this.selectedEntity = selected ? 'hero' : null;
    if (this.heroVisual) {
      this.heroVisual.setSelected(selected);
    }
    if (selected) {
      this.selectSquad(false);
    }
  }

  public setMoveCommandMode(active: boolean): void {
    this.isMoveCommandPending = active;
    if (active) {
      this.selectSquad(true);
    }
  }

  public issueSquadMove(destX: number, destZ: number, formation?: FormationType): void {
    this.armyController.issueMoveTo('squad_royal_guard', destX, destZ, formation);
    this.showDestinationMarker(destX, destZ);
    try {
      soundEngine.playHorn();
    } catch {}
  }

  private setupHeroVisual(): void {
    const pos = this.heroController.getPosition();
    this.heroVisual = new PlayCanvasCharacter(this.app, {
      id: 'hero_player_1',
      name: 'Lord Arthurian',
      team: 'player',
      color: new pc.Color(0.18, 0.45, 0.85), // Royal blue
      isHero: true,
      hasShield: true
    });
    this.heroVisual.setPosition(pos.x, 0, pos.z);
    this.heroVisual.setRotationY(pos.rotationY);
    this.heroVisual.updateHealth(pos.hp, pos.maxHp);
    this.heroVisual.setSelected(true);
    this.heroVisual.loadGLB('/assets/medieval/heroes/warlord.glb', 1.35);
  }

  /**
   * Sets up full 30-unit starter army: 14 Swordsmen, 8 Spearmen, 8 Archers.
   */
  private setupFullArmy(): void {
    const heroPos = this.heroController.getPosition();
    const unitConfigs: Array<{ type: 'swordsman' | 'spearman' | 'archer'; name: string; team: 'player' }> = [];

    // 14 Swordsmen
    for (let i = 1; i <= 14; i++) {
      unitConfigs.push({ type: 'swordsman', name: `Vanguard Blade ${i}`, team: 'player' });
    }
    // 8 Spearmen / Halberdiers
    for (let i = 1; i <= 8; i++) {
      unitConfigs.push({ type: 'spearman', name: `Halberdier ${i}`, team: 'player' });
    }
    // 8 Archers
    for (let i = 1; i <= 8; i++) {
      unitConfigs.push({ type: 'archer', name: `Royal Longbowman ${i}`, team: 'player' });
    }

    const squad = this.armyController.createSquad(
      'squad_royal_guard',
      '1st Royal Vanguard Regiment',
      'hero_player_1',
      'line',
      'follow',
      unitConfigs
    );

    for (const unit of squad.units) {
      unit.x = heroPos.x + unit.slotOffsetX;
      unit.z = heroPos.z + unit.slotOffsetZ;
      unit.rotationY = heroPos.rotationY;

      const visual = new PlayCanvasCharacter(this.app, {
        id: unit.id,
        name: unit.name,
        team: 'ally',
        color: unit.type === 'swordsman'
          ? new pc.Color(0.2, 0.65, 0.85) // Royal blue-steel
          : unit.type === 'spearman'
          ? new pc.Color(0.25, 0.55, 0.7) // Steel halberd
          : new pc.Color(0.3, 0.7, 0.45), // Archer forest green
        hasShield: unit.type === 'swordsman',
        hasSpear: unit.type === 'spearman',
        hasBow: unit.type === 'archer',
        scale: 0.95
      });

      visual.setPosition(unit.x, 0, unit.z);
      visual.setRotationY(unit.rotationY);
      visual.updateHealth(unit.stats.hp, unit.stats.maxHp);

      if (unit.type === 'swordsman') {
        visual.loadGLB('/assets/medieval/heroes/guardian.glb', 1.0);
      } else if (unit.type === 'archer') {
        visual.loadGLB('/assets/medieval/heroes/ranger.glb', 1.0);
      } else if (unit.type === 'spearman') {
        visual.loadGLB('/assets/medieval/heroes/strategist.glb', 1.0);
      }

      this.squadVisuals.set(unit.id, visual);
    }
  }

  /**
   * Sets up 12 settlement NPCs covering all 8 occupations with daily schedules,
   * personalities, memory records, and relationship metrics.
   */
  private setupSettlementNPCs(): void {
    const rawConfigs = [
      {
        id: 'npc_farmer_1',
        name: 'Farmer Caleb',
        role: 'farmer' as const,
        occupation: 'FARMER' as VillagerOccupation,
        home: { x: -14, y: 0, z: 12 },
        work: { x: 18, y: 0, z: 14 },
        evening: { x: 2, y: 0, z: 4 },
        traits: ['DUTIFUL', 'SOCIABLE', 'KIND'] as PersonalityTrait[],
        courage: 0.35,
        relationship: 30,
        greeting: 'Harvest looks bountiful, Lord Arthurian!'
      },
      {
        id: 'npc_farmer_2',
        name: 'Farmer Brenda',
        role: 'farmer' as const,
        occupation: 'FARMER' as VillagerOccupation,
        home: { x: -16, y: 0, z: 16 },
        work: { x: 16, y: 0, z: 10 },
        evening: { x: 0, y: 0, z: 6 },
        traits: ['DUTIFUL', 'CAUTIOUS'] as PersonalityTrait[],
        courage: 0.3,
        relationship: 25,
        greeting: 'Tending the crops for the citadel grain stores, sire.'
      },
      {
        id: 'npc_smith',
        name: 'Smith Roger',
        role: 'blacksmith' as const,
        occupation: 'BLACKSMITH' as VillagerOccupation,
        home: { x: -18, y: 0, z: -2 },
        work: { x: -14, y: 0, z: -4 },
        evening: { x: -5, y: 0, z: 2 },
        traits: ['BRAVE', 'DUTIFUL', 'LOYAL'] as PersonalityTrait[],
        courage: 0.75,
        relationship: 50,
        greeting: 'Sharpened fifty broadswords today for the Vanguard!'
      },
      {
        id: 'npc_merchant',
        name: 'Merchant Vivienne',
        role: 'merchant' as const,
        occupation: 'MERCHANT' as VillagerOccupation,
        home: { x: 8, y: 0, z: 20 },
        work: { x: -6, y: 0, z: 8 },
        evening: { x: -4, y: 0, z: 6 },
        traits: ['GREEDY', 'SOCIABLE', 'AMBITIOUS'] as PersonalityTrait[],
        courage: 0.25,
        relationship: 20,
        greeting: 'Welcome to the market! Rare silks and provisions for sale!'
      },
      {
        id: 'npc_woodcutter',
        name: 'Woodcutter Thorne',
        role: 'woodcutter' as const,
        occupation: 'WOODCUTTER' as VillagerOccupation,
        home: { x: -12, y: 0, z: 18 },
        work: { x: -16, y: 0, z: -17 },
        evening: { x: -3, y: 0, z: 1 },
        traits: ['DUTIFUL', 'LONER', 'BRAVE'] as PersonalityTrait[],
        courage: 0.6,
        relationship: 25,
        greeting: 'The pines yield solid timber for the citadel walls.'
      },
      {
        id: 'npc_miner',
        name: 'Miner Donald',
        role: 'miner' as const,
        occupation: 'MINER' as VillagerOccupation,
        home: { x: 12, y: 0, z: 22 },
        work: { x: 24, y: 0, z: -2 },
        evening: { x: 3, y: 0, z: 2 },
        traits: ['DUTIFUL', 'CAUTIOUS'] as PersonalityTrait[],
        courage: 0.45,
        relationship: 30,
        greeting: 'Fresh granite blocks quarried for the defenses.'
      },
      {
        id: 'npc_fisher',
        name: 'Fisher Rowan',
        role: 'villager' as const,
        occupation: 'FISHER' as VillagerOccupation,
        home: { x: -13, y: 0, z: 15 },
        work: { x: 2, y: 0, z: 2 },
        evening: { x: 1, y: 0, z: 1 },
        traits: ['SOCIABLE', 'KIND'] as PersonalityTrait[],
        courage: 0.35,
        relationship: 25,
        greeting: 'Clean water in the well keeps the village hearty, my Lord!'
      },
      {
        id: 'npc_elder',
        name: 'Elder Tobias',
        role: 'noble' as const,
        occupation: 'VILLAGER' as VillagerOccupation,
        home: { x: 2, y: 0, z: -8 },
        work: { x: -1, y: 0, z: -2 },
        evening: { x: 0, y: 0, z: 1 },
        traits: ['PROTECTIVE', 'DUTIFUL', 'LOYAL'] as PersonalityTrait[],
        courage: 0.5,
        relationship: 60,
        greeting: 'The realm flourishes under your watchful eye, Commander.'
      },
      {
        id: 'npc_townsfolk',
        name: 'Townsfolk Edith',
        role: 'villager' as const,
        occupation: 'VILLAGER' as VillagerOccupation,
        home: { x: -15, y: 0, z: 14 },
        work: { x: -5, y: 0, z: 6 },
        evening: { x: -2, y: 0, z: 3 },
        traits: ['CAUTIOUS', 'KIND', 'SOCIABLE'] as PersonalityTrait[],
        courage: 0.25,
        relationship: 30,
        greeting: 'A peaceful day in the settlement, blessings upon you.'
      },
      {
        id: 'npc_guard_vane',
        name: 'Captain Vane',
        role: 'guard' as const,
        occupation: 'GUARD' as VillagerOccupation,
        home: { x: 16, y: 0, z: -6 },
        work: { x: -1, y: 0, z: 28 },
        evening: { x: 0, y: 0, z: 24 },
        traits: ['BRAVE', 'LOYAL', 'PROTECTIVE', 'DISCIPLINED'] as PersonalityTrait[],
        courage: 0.9,
        relationship: 75,
        greeting: 'South Gate garrison standing ready, Commander Arthurian!'
      },
      {
        id: 'npc_guard_aldous',
        name: 'Guard Aldous',
        role: 'guard' as const,
        occupation: 'GUARD' as VillagerOccupation,
        home: { x: 18, y: 0, z: -4 },
        work: { x: 6, y: 0, z: 28 },
        evening: { x: 4, y: 0, z: 22 },
        traits: ['BRAVE', 'DISCIPLINED'] as PersonalityTrait[],
        courage: 0.8,
        relationship: 65,
        greeting: 'East palisade watch is clear. No bandit sightings yet.'
      },
      {
        id: 'npc_guard_cedric',
        name: 'Guard Cedric',
        role: 'guard' as const,
        occupation: 'GUARD' as VillagerOccupation,
        home: { x: 16, y: 0, z: -2 },
        work: { x: -8, y: 0, z: 28 },
        evening: { x: -4, y: 0, z: 22 },
        traits: ['BRAVE', 'LOYAL'] as PersonalityTrait[],
        courage: 0.8,
        relationship: 65,
        greeting: 'West wall sentry reports all quiet along the treeline.'
      }
    ];

    for (const cfg of rawConfigs) {
      const traitSet = new Set<PersonalityTrait>(cfg.traits);
      const isGuard = cfg.role === 'guard';

      const npc: NPCEntity = {
        id: cfg.id,
        name: cfg.name,
        role: cfg.role,
        occupation: cfg.occupation,
        faction: 'villagers',
        traits: traitSet,
        courage: cfg.courage,
        aggression: isGuard ? 0.6 : 0.15,
        loyalty: 0.85,
        sociability: 0.7,
        position: { x: cfg.work.x, y: 0, z: cfg.work.z },
        targetPosition: null,
        velocity: { x: 0, y: 0, z: 0 },
        rotationY: 0,
        moveSpeed: isGuard ? 3.0 : 2.3,
        health: isGuard ? 160 : 90,
        maxHealth: isGuard ? 160 : 90,
        attackPower: isGuard ? 22 : (cfg.occupation === 'BLACKSMITH' ? 18 : 10),
        attackRange: isGuard ? 2.2 : 1.8,
        attackCooldownMs: 1200,
        lastAttackTimestamp: 0,
        activity: 'working',
        needs: { survival: 100, safety: 100, work: 85, social: 70, duty: isGuard ? 95 : 75 },
        memories: [],
        relationshipScore: cfg.relationship,
        currentTargetId: null,
        homePosition: cfg.home,
        workPosition: cfg.work,
        schedule: {
          morning: cfg.work,
          day: cfg.work,
          evening: cfg.evening,
          night: cfg.home
        },
        dialogue: {
          greeting: cfg.greeting,
          busy: 'Got much to attend to today, sire.',
          raidAlarm: 'Raiders approaching! Sound the bells!',
          raidPanic: 'Bandits! Run for the Great Keep!',
          victoryThanks: 'Praise Lord Arthurian and the Vanguard!'
        },
        animationState: 'Idle'
      };

      this.npcs.push(npc);

      const visual = new PlayCanvasCharacter(this.app, {
        id: cfg.id,
        name: cfg.name,
        team: isGuard ? 'ally' : 'neutral',
        color: isGuard
          ? new pc.Color(0.22, 0.45, 0.75) // Guard heraldry
          : cfg.occupation === 'MERCHANT'
          ? new pc.Color(0.78, 0.22, 0.22) // Red merchant tunic
          : cfg.occupation === 'BLACKSMITH'
          ? new pc.Color(0.35, 0.35, 0.4) // Dark smith apron
          : new pc.Color(0.68, 0.55, 0.38), // Linen tunic
        scale: isGuard ? 1.05 : 0.95,
        hasShield: isGuard,
        hasSpear: isGuard
      });

      visual.setPosition(cfg.work.x, 0, cfg.work.z);
      visual.loadGLB('/assets/medieval/heroes/steward.glb', 0.95);
      this.npcVisuals.set(cfg.id, visual);
    }
  }

  private setupWildlife(): void {
    const animals = this.animalSystem.getAnimals();
    for (const animal of animals) {
      const visual = new PlayCanvasAnimal(this.app, animal.id, animal.type);
      visual.setPosition(animal.position.x, 0, animal.position.z);
      visual.setRotationY(animal.rotationY);
      this.animalVisuals.set(animal.id, visual);
    }
  }

  // --- CONTROLS & COMMANDS ---

  public toggleControlMode(): 'player' | 'ai' {
    const newMode = this.heroController.isPlayerControlled() ? 'ai' : 'player';
    this.heroController.setControlMode(newMode);
    return newMode;
  }

  public setJoystickVector(vx: number, vy: number): void {
    if (Math.hypot(vx, vy) > 0.05) {
      this.isTouchJoystickActive = true;
      if (this.heroController.isPlayerControlled()) {
        this.heroController.setPlayerInput(vx, -vy);
      }
    } else {
      this.isTouchJoystickActive = false;
      if (this.heroController.isPlayerControlled()) {
        const kbVec = shortcutManager.getMovementVector();
        if (Math.hypot(kbVec.x, kbVec.z) > 0.01) {
          this.heroController.setPlayerInput(kbVec.x, kbVec.z);
        } else {
          this.heroController.setPlayerInput(0, 0);
        }
      }
    }
  }

  public triggerHeroAttack(): void {
    this.heroController.triggerPlayerAttack();
    soundEngine.playMeleeAttack();
    if (this.heroVisual) {
      this.heroVisual.triggerAttack();
    }

    const heroPos = this.heroController.getPosition();
    const heroCombatant: Combatant = {
      id: this.heroController.profile.id,
      name: this.heroController.profile.name,
      team: 'player',
      x: heroPos.x,
      y: heroPos.y,
      z: heroPos.z,
      rotationY: heroPos.rotationY,
      hp: heroPos.hp,
      maxHp: heroPos.maxHp,
      attackDamage: heroPos.attackDamage,
      attackRange: heroPos.attackRange,
      attackCooldown: 0,
      armor: heroPos.defense,
      isDead: false
    };

    const raiders = this.raidEventSystem.getRaiders();
    for (const raider of raiders) {
      if (raider.isDead) continue;
      const res = this.combatSystem.executeAttack(heroCombatant, raider, 1.0, 0.25);
      if (res) {
        this.combatVFX.spawnHitSparks(raider.x, 1.2, raider.z);
        const visual = this.raiderVisuals.get(raider.id);
        if (visual) {
          visual.triggerHitFlash();
          visual.updateHealth(raider.hp, raider.maxHp);
        }
        break;
      }
    }

    // Also attack Training Arena Challenger if in range
    if (this.trainingArena.isActive && this.trainingArena.challenger) {
      const chal = this.trainingArena.challenger;
      const d = Math.hypot(chal.position.x - heroPos.x, chal.position.z - heroPos.z);
      if (d < 2.8) {
        const chalCombatant: Combatant = {
          id: 'challenger',
          name: chal.name,
          team: 'enemy',
          x: chal.position.x,
          y: 0,
          z: chal.position.z,
          rotationY: chal.rotationY,
          hp: chal.health,
          maxHp: chal.maxHealth,
          attackDamage: chal.attackPower,
          attackRange: 2.5,
          attackCooldown: 0,
          armor: 12,
          isDead: false
        };
        const res = this.combatSystem.executeAttack(heroCombatant, chalCombatant, 1.0, 0.3);
        if (res) {
          chal.health = chalCombatant.hp;
          this.combatVFX.spawnHitSparks(chal.position.x, 1.2, chal.position.z);
          if (this.challengerVisual) {
            this.challengerVisual.triggerHitFlash();
            this.challengerVisual.updateHealth(chal.health, chal.maxHealth);
          }
        }
      }
    }
  }

  public triggerHeroAbility(abilityId: string = 'warlord_stomp'): void {
    const used = this.heroController.useAbility(abilityId);
    if (!used) return;

    const heroPos = this.heroController.getPosition();

    if (abilityId === 'warlord_stomp') {
      soundEngine.playBattleClash();
      soundEngine.playHorn();
      if (this.heroVisual) this.heroVisual.triggerHeavyAttack();

      // Spawn 3D expanding ground shockwave VFX
      this.combatVFX.spawnShockwave(heroPos.x, heroPos.y, heroPos.z, 6.8, 0.55);

      const heroCombatant: Combatant = {
        id: this.heroController.profile.id,
        name: this.heroController.profile.name,
        team: 'player',
        x: heroPos.x,
        y: heroPos.y,
        z: heroPos.z,
        rotationY: heroPos.rotationY,
        hp: heroPos.hp,
        maxHp: heroPos.maxHp,
        attackDamage: heroPos.attackDamage,
        attackRange: 6.8,
        attackCooldown: 0,
        armor: heroPos.defense,
        isDead: false
      };

      const raiders = this.raidEventSystem.getRaiders();
      for (const raider of raiders) {
        if (raider.isDead) continue;
        const res = this.combatSystem.executeAttack(heroCombatant, raider, 1.8, 0.4);
        if (res) {
          this.combatVFX.spawnHitSparks(raider.x, 1.2, raider.z);
          const visual = this.raiderVisuals.get(raider.id);
          if (visual) {
            visual.triggerHitFlash();
            visual.updateHealth(raider.hp, raider.maxHp);
          }
        }
      }
    } else if (abilityId === 'rally_vanguard') {
      soundEngine.playHorn();
      soundEngine.playFanfare();

      // Spawn golden ascending pillar and halo aura
      this.combatVFX.spawnRallyAura(heroPos.x, heroPos.y, heroPos.z, 0.95);

      // Heal nearby units in squad & spawn green float text
      const squad = this.armyController.getSquad('squad_royal_guard');
      if (squad) {
        for (const u of squad.units) {
          if (!u.isDead) {
            u.stats.hp = Math.min(u.stats.maxHp, u.stats.hp + 45);
            this.combatSystem.spawnFloatingNumber({
              x: u.x,
              y: 1.8,
              z: u.z,
              amount: 45,
              isCrit: false,
              isHeal: true,
              color: '#34d399'
            });
            const vis = this.squadVisuals.get(u.id);
            if (vis) vis.updateHealth(u.stats.hp, u.stats.maxHp);
          }
        }
      }
    } else if (abilityId === 'shield_defend') {
      soundEngine.playShieldBlock();
      if (this.heroVisual) {
        this.heroVisual.setShieldGuard(true);
        this.combatVFX.setShieldAegis(this.heroVisual.root, true);
        setTimeout(() => {
          if (this.heroVisual) {
            this.heroVisual.setShieldGuard(false);
            this.combatVFX.setShieldAegis(this.heroVisual.root, false);
          }
        }, 4000);
      }
    }
  }

  public setSquadFormation(formation: FormationType): void {
    this.armyController.setFormation('squad_royal_guard', formation);
  }

  public setSquadOrder(order: TacticalOrder): void {
    if (order === 'move') {
      this.setMoveCommandMode(true);
      return;
    }
    this.armyController.setOrder('squad_royal_guard', order);
    if (order === 'stop') {
      this.isMoveCommandPending = false;
      if (this.destinationMarkerEntity) {
        this.destinationMarkerEntity.enabled = false;
      }
    }
  }

  public startTrainingDuel(difficulty: DuelDifficulty = 'NORMAL'): void {
    const challenger = this.trainingArena.initializeDuel(difficulty);
    if (this.challengerVisual) {
      this.challengerVisual.destroy();
    }
    this.challengerVisual = new PlayCanvasCharacter(this.app, {
      id: challenger.id,
      name: challenger.name,
      team: 'enemy',
      color: new pc.Color(0.85, 0.45, 0.15),
      isHero: true,
      hasShield: true,
      scale: 1.3
    });
    this.challengerVisual.setPosition(challenger.position.x, 0, challenger.position.z);
    this.challengerVisual.setRotationY(challenger.rotationY);
    this.challengerVisual.updateHealth(challenger.health, challenger.maxHealth);
    this.challengerVisual.loadGLB('/assets/medieval/heroes/guardian.glb', 1.3);
    try {
      soundEngine.playHorn();
    } catch {}
  }

  public stopTrainingDuel(): void {
    this.trainingArena.endDuel();
    if (this.challengerVisual) {
      this.challengerVisual.destroy();
      this.challengerVisual = undefined;
    }
  }

  public triggerRaidEvent(): void {
    try {
      soundEngine.playBattleStart();
    } catch {
      // Audio optional
    }
    this.droppedLootRaiderIds.clear();
    this.raidEventSystem.triggerRaid();
  }

  // --- ARROW PROJECTILE LAUNCHER ---

  private spawnArrow(attacker: Combatant, target: Combatant, damage: number): void {
    const arrowEntity = new pc.Entity('Arrow');
    const woodMat = new pc.StandardMaterial();
    woodMat.diffuse = new pc.Color(0.85, 0.75, 0.55);
    woodMat.update();

    arrowEntity.addComponent('render', { type: 'cylinder', material: woodMat });
    arrowEntity.setLocalScale(0.04, 0.8, 0.04);
    arrowEntity.setPosition(attacker.x, 1.2, attacker.z);
    this.app.root.addChild(arrowEntity);

    this.arrows.push({
      entity: arrowEntity,
      startX: attacker.x,
      startY: 1.2,
      startZ: attacker.z,
      targetX: target.x,
      targetY: 1.1,
      targetZ: target.z,
      progress: 0,
      speed: 24.0, // 24 m/s arrow velocity
      target,
      attacker
    });
  }

  // --- 24-HOUR DAY/NIGHT ASTRONOMICAL LIGHTING CYCLE ---
  private updateDayNightCycle(delta: number): void {
    const hours = this.timeOfDayHours;
    const sunLight = this.sunEntity.light;
    if (!sunLight) return;

    // Sun elevation: peaks at 12:00, lowest at 00:00
    const sunAngle = ((hours - 6) / 12) * Math.PI; // 0 at 6am, PI at 6pm
    const elevation = Math.max(-15, Math.sin(sunAngle) * 65);
    const azimuth = 30 + ((hours / 24) * 360);
    this.sunEntity.setEulerAngles(elevation, azimuth, 0);

    const cameraComp = this.cameraEntity.camera;

    if (hours >= 6 && hours < 8.5) {
      // DAWN: Golden Rose
      const t = (hours - 6) / 2.5;
      sunLight.color = new pc.Color(1.0, 0.78 + t * 0.18, 0.55 + t * 0.33);
      sunLight.intensity = 0.8 + t * 0.55;
      this.app.scene.ambientLight = new pc.Color(0.32 + t * 0.06, 0.32 + t * 0.1, 0.42 + t * 0.08);
      const sky = new pc.Color(0.48 + t * -0.1, 0.42 + t * 0.1, 0.55 + t * 0.17);
      if (cameraComp) cameraComp.clearColor = sky;
      this.app.scene.fog.color = sky;
    } else if (hours >= 8.5 && hours < 16.5) {
      // DAY: Crisp 5500K daylight
      sunLight.color = new pc.Color(1.0, 0.96, 0.9);
      sunLight.intensity = 1.35;
      this.app.scene.ambientLight = new pc.Color(0.4, 0.44, 0.52);
      const sky = new pc.Color(0.36, 0.52, 0.74);
      if (cameraComp) cameraComp.clearColor = sky;
      this.app.scene.fog.color = sky;
    } else if (hours >= 16.5 && hours < 19.5) {
      // DUSK: Fiery Crimson & Golden Hour
      const t = (hours - 16.5) / 3.0;
      sunLight.color = new pc.Color(1.0, 0.82 - t * 0.35, 0.45 - t * 0.3);
      sunLight.intensity = 1.3 - t * 0.65;
      this.app.scene.ambientLight = new pc.Color(0.38 - t * 0.15, 0.35 - t * 0.15, 0.46 - t * 0.15);
      const sky = new pc.Color(0.52 - t * 0.3, 0.38 - t * 0.22, 0.5 - t * 0.25);
      if (cameraComp) cameraComp.clearColor = sky;
      this.app.scene.fog.color = sky;
    } else {
      // NIGHT: Cool Indigo Moonlight
      sunLight.color = new pc.Color(0.35, 0.48, 0.75);
      sunLight.intensity = 0.42;
      this.app.scene.ambientLight = new pc.Color(0.14, 0.16, 0.24);
      const sky = new pc.Color(0.08, 0.1, 0.18);
      if (cameraComp) cameraComp.clearColor = sky;
      this.app.scene.fog.color = sky;
    }
  }

  // --- MAIN LOOP ---

  private onUpdate(delta: number): void {
    if (!this.isRunning || this.destroyed) return;
    const clampedDelta = Math.min(delta, 0.1);

    // Advance World Clock (coarse simulation: ~1 real minute = 1 game hour)
    this.timeOfDayHours = (this.timeOfDayHours + clampedDelta * 0.05) % 24.0;
    this.updateDayNightCycle(clampedDelta);

    // 0. Update Terrain Quadtree LOD, Frustum Culling & Triplanar Projection
    if (this.terrainManager) {
      this.terrainManager.update(clampedDelta, this.cameraEntity);
    }

    // 1. Tick Performance Monitor
    this.performanceMonitor.tick();

    // 2. Keyboard & Touch Movement (WASD & Arrow Keys & Joystick)
    // Feeds the EXACT same HeroController movement system
    const kbVec = shortcutManager.getMovementVector();
    if (Math.hypot(kbVec.x, kbVec.z) > 0.01) {
      if (this.heroController.isPlayerControlled()) {
        this.heroController.setPlayerInput(kbVec.x, kbVec.z);
      }
    } else if (!this.isTouchJoystickActive && this.heroController.isPlayerControlled()) {
      if (!this.heroController.targetDestination) {
        this.heroController.setPlayerInput(0, 0);
      }
    }

    // 3. Update Destination Marker pulse & arrival detection
    if (this.destinationMarkerEntity && this.destinationMarkerEntity.enabled) {
      this.destinationMarkerPulse += clampedDelta * 4.0;
      const pulseScale = 2.4 + Math.sin(this.destinationMarkerPulse) * 0.35;
      const ring = this.destinationMarkerEntity.children[0];
      if (ring) ring.setLocalScale(pulseScale, 0.05, pulseScale);

      if (this.selectedEntity === 'hero') {
        if (!this.heroController.targetDestination) {
          this.destinationMarkerEntity.enabled = false;
        }
      } else {
        const squad = this.armyController.getSquad('squad_royal_guard');
        if (squad && squad.activeOrder?.destination) {
          const dest = squad.activeOrder.destination;
          const distToDest = Math.hypot(squad.formationCenter.x - dest.x, squad.formationCenter.z - dest.z);
          if (distToDest < 1.6) {
            this.destinationMarkerEntity.enabled = false;
          }
        }
      }
    }

    // 4. Update Combat Floating Texts, Arrows & VFX
    this.combatSystem.update(clampedDelta);
    this.updateArrowProjectiles(clampedDelta);
    this.combatVFX.update(clampedDelta);

    // 5. Update Raid System & Waves
    this.raidEventSystem.update(clampedDelta, this.npcs);
    this.syncRaiderVisuals();

    const currentRaidState = this.raidEventSystem.getState();
    if (currentRaidState !== this.lastRaidState) {
      try {
        if (currentRaidState === 'warning' || currentRaidState === 'in_progress') {
          soundEngine.playBattleStart();
        } else if (currentRaidState === 'victory') {
          soundEngine.playBattleVictory();
          setTimeout(() => {
            try { soundEngine.playLootReward(); } catch {}
          }, 400);
        } else if (currentRaidState === 'defeat') {
          soundEngine.playBattleDefeat();
        }
      } catch {
        // Audio optional
      }
      this.lastRaidState = currentRaidState;
    }

    // Reinforcement wave check via BattleWaveManager
    const raiders = this.raidEventSystem.getRaiders().filter(r => !r.isDead);
    if (currentRaidState === 'in_progress') {
      const nextWave = this.battleWaveManager.checkReinforcements(clampedDelta, raiders.length);
      if (nextWave) {
        this.raidEventSystem.addReinforcements(nextWave.enemyInfantry, nextWave.enemyArchers);
        try { soundEngine.playHorn(); } catch {}
      }
    }

    // 6. Update NPCs via DecisionSystem
    const raiderEntities: NPCEntity[] = raiders.map(r => ({
      id: r.id,
      name: r.name,
      role: 'bandit',
      faction: 'bandits',
      traits: new Set<PersonalityTrait>(['AGGRESSIVE', 'BRAVE']),
      courage: 0.8,
      aggression: 0.9,
      loyalty: 0.5,
      sociability: 0.3,
      position: { x: r.x, y: 0, z: r.z },
      targetPosition: { x: r.targetObjective.x, y: 0, z: r.targetObjective.z },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: r.rotationY,
      moveSpeed: 2.8,
      health: r.hp,
      maxHealth: r.maxHp,
      attackPower: r.attackDamage,
      attackRange: r.attackRange,
      attackCooldownMs: 1500,
      lastAttackTimestamp: 0,
      activity: 'attacking',
      needs: { survival: 100, safety: 80, work: 0, social: 0, duty: 100 },
      memories: [],
      relationshipScore: -100,
      currentTargetId: null,
      homePosition: { x: r.x, y: 0, z: r.z },
      workPosition: { x: 0, y: 0, z: 0 },
      animationState: 'Running_A'
    }));

    const heroPos = this.heroController.getPosition();
    const worldContext: WorldContext = {
      timeOfDayHours: this.timeOfDayHours,
      isRaidActive: this.raidEventSystem.getState() === 'in_progress',
      playerPos: { x: heroPos.x, y: heroPos.y, z: heroPos.z },
      threats: raiderEntities,
      allies: this.npcs,
      villageCenter: { x: 0, y: 0, z: 0 },
      safeHouse: { x: 0, y: 0, z: -18 }
    };

    for (const npc of this.npcs) {
      DecisionSystem.updateDecision(npc, worldContext, clampedDelta);
      DecisionSystem.executeMovement(npc, clampedDelta);

      const visual = this.npcVisuals.get(npc.id);
      if (visual) {
        const npcY = this.terrainManager ? this.terrainManager.getHeightAt(npc.position.x, npc.position.z) : 0;
        visual.setPosition(npc.position.x, npcY, npc.position.z);
        visual.setRotationY(npc.rotationY);
        visual.updateHealth(npc.health, npc.maxHealth);
        const isNpcMoving = (npc.velocity && Math.hypot(npc.velocity.x, npc.velocity.z) > 0.05) ||
                            (npc.targetPosition ? Math.hypot(npc.targetPosition.x - npc.position.x, npc.targetPosition.z - npc.position.z) > 0.3 : false);
        visual.update(clampedDelta, isNpcMoving ? 1 : 0);

        // Guard attack against nearby raiders
        if (npc.role === 'guard' && npc.activity === 'attacking' && raiders.length > 0) {
          const guardCombatant: Combatant = {
            id: npc.id,
            name: npc.name,
            team: 'ally',
            x: npc.position.x,
            y: 0,
            z: npc.position.z,
            rotationY: npc.rotationY,
            hp: npc.health,
            maxHp: npc.maxHealth,
            attackDamage: npc.attackPower,
            attackRange: npc.attackRange,
            attackCooldown: 0,
            armor: 7,
            isDead: false
          };
          for (const raider of raiders) {
            const res = this.combatSystem.executeAttack(guardCombatant, raider, 1.0, 0.15);
            if (res) {
              visual.triggerAttack();
              const rVis = this.raiderVisuals.get(raider.id);
              if (rVis) {
                rVis.triggerHitFlash();
                rVis.updateHealth(raider.hp, raider.maxHp);
              }
              break;
            }
          }
        }
      }
    }

    // 7. Update Animals & Wildlife
    const threatPositions = [
      { id: 'hero', x: heroPos.x, z: heroPos.z, isHero: true, hp: heroPos.hp },
      ...raiders.map(r => ({ id: r.id, x: r.x, z: r.z, isRaider: true, hp: r.hp }))
    ];
    this.animalSystem.update(clampedDelta, threatPositions);
    for (const animal of this.animalSystem.getAnimals()) {
      const aVis = this.animalVisuals.get(animal.id);
      if (aVis) {
        if (animal.health <= 0) {
          if (!aVis.isDead) aVis.triggerDeath();
          continue;
        }
        const animalY = this.terrainManager ? this.terrainManager.getHeightAt(animal.position.x, animal.position.z) : 0;
        aVis.setPosition(animal.position.x, animalY, animal.position.z);
        aVis.setRotationY(animal.rotationY);
        if (animal.attackTriggered) {
          aVis.triggerAttack();
          try { soundEngine.playMeleeAttack(); } catch {}
        }
        if (animal.damageFlashTimer && animal.damageFlashTimer > 0) {
          aVis.triggerHitFlash();
        }
        const isMoving = animal.state === 'wander' || animal.state === 'flee' || animal.state === 'hunt';
        aVis.update(clampedDelta, isMoving);
      }
    }

    // 8. Update Hero Controller & Articulated Visual
    this.heroController.update(
      clampedDelta,
      raiders.map(r => ({ id: r.id, x: r.x, z: r.z, isDead: r.isDead }))
    );

    const updatedHeroPos = this.heroController.getPosition();
    const heroVel = this.heroController.profile.velocity;
    const isHeroMoving = (heroVel.x * heroVel.x + heroVel.z * heroVel.z) > 0.05;

    if (this.heroVisual) {
      const heroY = this.terrainManager ? this.terrainManager.getHeightAt(updatedHeroPos.x, updatedHeroPos.z) : 0;
      this.heroVisual.setPosition(updatedHeroPos.x, heroY, updatedHeroPos.z);
      this.heroVisual.setRotationY(updatedHeroPos.rotationY);
      this.heroVisual.updateHealth(updatedHeroPos.hp, updatedHeroPos.maxHp);
      this.heroVisual.update(clampedDelta, isHeroMoving ? 1 : 0);
    }

    // Update Battlefield Loot Magnet & Proximity Pickup
    this.lootSystem.update(clampedDelta, updatedHeroPos);

    // 9. Update Army Squads & Formations
    this.armyController.update(
      clampedDelta,
      { x: updatedHeroPos.x, y: updatedHeroPos.y, z: updatedHeroPos.z, rotationY: updatedHeroPos.rotationY },
      raiders.map(r => ({ id: r.id, x: r.x, z: r.z, team: 'enemy', isDead: r.isDead }))
    );

    // Sync Squad Visuals & execute melee/ranged combat
    const squad = this.armyController.getSquad('squad_royal_guard');
    if (squad) {
      for (const unit of squad.units) {
        const visual = this.squadVisuals.get(unit.id);
        if (visual) {
          const unitY = this.terrainManager ? this.terrainManager.getHeightAt(unit.x, unit.z) : 0;
          visual.setPosition(unit.x, unitY, unit.z);
          visual.setRotationY(unit.rotationY);
          visual.updateHealth(unit.stats.hp, unit.stats.maxHp);

          const isUnitMoving = (unit.state === 'MOVING' || unit.state === 'FORMING' || unit.state === 'RETREATING' || unit.state === 'ATTACKING') &&
                               (unit.targetPosition ? Math.hypot(unit.targetPosition.x - unit.x, unit.targetPosition.z - unit.z) > 0.25 : false);
          visual.update(clampedDelta, isUnitMoving ? 1 : 0);

          if (unit.isEngaged && unit.stats.attackCooldown <= 0) {
            visual.triggerAttack();
            unit.stats.attackCooldown = 1.0 / unit.stats.attackSpeed;

            const unitCombatant: Combatant = {
              id: unit.id,
              name: unit.name,
              team: 'ally',
              x: unit.x,
              y: unit.y,
              z: unit.z,
              rotationY: unit.rotationY,
              hp: unit.stats.hp,
              maxHp: unit.stats.maxHp,
              attackDamage: unit.stats.attackDamage,
              attackRange: unit.stats.attackRange,
              attackCooldown: 0,
              armor: unit.stats.armor,
              isDead: false
            };

            for (const raider of raiders) {
              if (unit.type === 'archer') {
                // Archer loose arrow projectile
                this.spawnArrow(unitCombatant, raider, unit.stats.attackDamage);
                break;
              } else {
                // Melee strike
                const res = this.combatSystem.executeAttack(unitCombatant, raider, 1.0, 0.15);
                if (res) {
                  const raiderVis = this.raiderVisuals.get(raider.id);
                  if (raiderVis) {
                    raiderVis.triggerHitFlash();
                    raiderVis.updateHealth(raider.hp, raider.maxHp);
                  }
                  break;
                }
              }
            }
          }
        }
      }
    }

    // 10. Training Arena Duel Update
    if (this.trainingArena.isActive && this.trainingArena.challenger) {
      this.trainingArena.update(clampedDelta, {
        x: updatedHeroPos.x,
        y: updatedHeroPos.y,
        z: updatedHeroPos.z,
        isGuarding: false
      });

      const chal = this.trainingArena.challenger;
      if (this.challengerVisual) {
        this.challengerVisual.setPosition(chal.position.x, 0, chal.position.z);
        this.challengerVisual.setRotationY(chal.rotationY);
        this.challengerVisual.updateHealth(chal.health, chal.maxHealth);
        const isChalMoving = chal.state === 'CIRCLING';
        this.challengerVisual.update(clampedDelta, isChalMoving ? 1 : 0);

        if (chal.state === 'ATTACKING') {
          this.challengerVisual.triggerAttack();
          const dToHero = Math.hypot(updatedHeroPos.x - chal.position.x, updatedHeroPos.z - chal.position.z);
          if (dToHero < 2.5) {
            this.heroController.takeDamage(chal.attackPower * 0.35);
            if (this.heroVisual) this.heroVisual.triggerHitFlash();
            try { soundEngine.playMeleeAttack(); } catch {}
          }
        }
      }
    }

    // 11. Raider attacks against Hero or Vanguard
    const heroCombatant: Combatant = {
      id: this.heroController.profile.id,
      name: this.heroController.profile.name,
      team: 'player',
      x: updatedHeroPos.x,
      y: updatedHeroPos.y,
      z: updatedHeroPos.z,
      rotationY: updatedHeroPos.rotationY,
      hp: updatedHeroPos.hp,
      maxHp: updatedHeroPos.maxHp,
      attackDamage: updatedHeroPos.attackDamage,
      attackRange: 2.4,
      attackCooldown: 0,
      armor: updatedHeroPos.defense,
      isDead: false
    };

    for (const raider of raiders) {
      if (raider.attackCooldown <= 0) {
        const dx = updatedHeroPos.x - raider.x;
        const dz = updatedHeroPos.z - raider.z;
        const distToHero = Math.hypot(dx, dz);

        if (distToHero <= raider.attackRange) {
          raider.attackCooldown = 1.4;
          const rVis = this.raiderVisuals.get(raider.id);
          if (rVis) rVis.triggerAttack();

          const res = this.combatSystem.executeAttack(raider, heroCombatant, 1.0, 0.1);
          if (res) {
            this.heroController.takeDamage(res.damageDealt);
            try { soundEngine.playTroopLoss(); } catch {}
            if (this.heroVisual) this.heroVisual.triggerHitFlash();
          }
        }
      }
    }

    // 12. Camera Follow
    this.updateCameraFollow(clampedDelta, updatedHeroPos.x, updatedHeroPos.z);

    // 13. Update Metrics
    const totalEntities =
      1 +
      (squad?.units.length ?? 0) +
      this.npcs.length +
      this.animalSystem.getAnimals().length +
      raiders.length +
      (this.trainingArena.challenger ? 1 : 0);
    this.performanceMonitor.setEntityCount(totalEntities);
  }

  private updateArrowProjectiles(delta: number): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arr = this.arrows[i];
      const dx = arr.targetX - arr.startX;
      const dz = arr.targetZ - arr.startZ;
      const totalDist = Math.hypot(dx, dz) || 1;

      arr.progress += (arr.speed * delta) / totalDist;

      if (arr.progress >= 1.0) {
        // Arrow arrived at target!
        arr.entity.destroy();
        this.arrows.splice(i, 1);

        if (!arr.target.isDead) {
          const res = this.combatSystem.executeAttack(arr.attacker, arr.target, 1.0, 0.25);
          if (res) {
            const rVis = this.raiderVisuals.get(arr.target.id);
            if (rVis) {
              rVis.triggerHitFlash();
              rVis.updateHealth(arr.target.hp, arr.target.maxHp);
            }
          }
        }
      } else {
        const currX = arr.startX + dx * arr.progress;
        const currZ = arr.startZ + dz * arr.progress;
        // Parabolic arc (apex ~ 2.5m high)
        const arcY = arr.startY + Math.sin(arr.progress * Math.PI) * 2.2;

        arr.entity.setPosition(currX, arcY, currZ);
        arr.entity.setEulerAngles(90 - arr.progress * 40, (Math.atan2(dx, dz) * 180) / Math.PI, 0);
      }
    }
  }

  private syncRaiderVisuals(): void {
    const raiders = this.raidEventSystem.getRaiders();
    for (const raider of raiders) {
      if ((raider.isDead || raider.hp <= 0) && !this.droppedLootRaiderIds.has(raider.id)) {
        this.droppedLootRaiderIds.add(raider.id);
        const lootType = raider.isLeader ? 'chest' : Math.random() < 0.28 ? 'gems' : 'gold';
        this.lootSystem.spawnLoot(lootType, raider.x, raider.z);
      }

      let visual = this.raiderVisuals.get(raider.id);
      if (raider.isDead || raider.hp <= 0) {
        if (visual) {
          visual.destroy();
          this.raiderVisuals.delete(raider.id);
        }
        continue;
      }

      if (!visual) {
        visual = new PlayCanvasCharacter(this.app, {
          id: raider.id,
          name: raider.name,
          team: 'enemy',
          color: new pc.Color(0.85, 0.18, 0.18), // Raider crimson
          scale: raider.isLeader ? 1.35 : 1.05,
          hasShield: raider.isLeader
        });
        if (raider.isLeader) {
          visual.loadGLB('/assets/medieval/heroes/warlord.glb', 1.3);
        } else {
          visual.loadGLB('/assets/medieval/heroes/guardian.glb', 1.05);
        }
        this.raiderVisuals.set(raider.id, visual);
      }

      const raiderY = this.terrainManager ? this.terrainManager.getHeightAt(raider.x, raider.z) : 0;
      visual.setPosition(raider.x, raiderY, raider.z);
      visual.setRotationY(raider.rotationY);
      visual.updateHealth(raider.hp, raider.maxHp);
      visual.update(0.016, 0);
    }
  }

  private updateCameraFollow(delta: number, targetX: number, targetZ: number): void {
    const camPos = this.cameraEntity.getPosition();
    const desiredX = targetX + this.camOffsetX;
    const desiredZ = targetZ + this.camOffsetZ;
    const groundY = this.terrainManager ? this.terrainManager.getHeightAt(targetX, targetZ) : 0;
    const desiredY = groundY + this.camZoom;

    const lerpRate = Math.min(1.0, 5.5 * delta);
    const newX = camPos.x + (desiredX - camPos.x) * lerpRate;
    const newZ = camPos.z + (desiredZ - camPos.z) * lerpRate;
    const newY = camPos.y + (desiredY - camPos.y) * lerpRate;

    this.cameraEntity.setPosition(newX, newY, newZ);
    this.cameraEntity.setEulerAngles(-45, 0, 0);
  }

  // --- GETTERS FOR REACT HUD ---

  public getSettlementNPCs(): NPCEntity[] {
    return this.npcs;
  }

  public getNearbyNPC(): NPCEntity | null {
    const heroPos = this.heroController.getPosition();
    let closest: NPCEntity | null = null;
    let minD = 4.5;
    for (const npc of this.npcs) {
      if (npc.health <= 0) continue;
      const d = Math.hypot(npc.position.x - heroPos.x, npc.position.z - heroPos.z);
      if (d < minD) {
        minD = d;
        closest = npc;
      }
    }
    return closest;
  }

  public handleResize(): void {
    if (!this.canvas || this.destroyed) return;
    const parent = this.canvas.parentElement;
    const width = parent && parent.clientWidth > 0 ? parent.clientWidth : (window.innerWidth || 390);
    const height = parent && parent.clientHeight > 0 ? parent.clientHeight : (window.innerHeight - 56 || 780);

    const resScale = this.performanceMonitor.getMetrics().resolutionScale;
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2) * resScale;
    this.app.resizeCanvas(width, height);
  }

  // --- CENTRALIZED SHORTCUT DISPATCHER SETUP ---
  private setupShortcutListeners(): void {
    // 1. Army Commands (Clean RTS layout: Q=Attack, T=AttackMove, M=Move, F=Follow, G=Defend, H=Hold, X=Stop, R=Retreat, C=Charge, P=Patrol)
    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.ATTACK, () => {
      this.triggerHeroAttack();
      this.onCommandFeedback?.('ATTACK ORDER (Q)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.ATTACK_MOVE, () => {
      this.setSquadOrder('attack');
      this.onCommandFeedback?.('ATTACK-MOVE ORDER (T)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.MOVE_ORDER, () => {
      this.setMoveCommandMode(true);
      this.onCommandFeedback?.('MOVE ORDER MODE (M)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FOLLOW, () => {
      this.setSquadOrder('follow');
      this.onCommandFeedback?.('FOLLOW ORDER (F)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.DEFEND, () => {
      this.setSquadOrder('defend');
      this.onCommandFeedback?.('DEFEND ORDER (G)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.HOLD, () => {
      this.setSquadOrder('hold');
      this.onCommandFeedback?.('HOLD POSITION (H)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.STOP, () => {
      this.setSquadOrder('stop');
      this.onCommandFeedback?.('STOP ORDER (X)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.RETREAT, () => {
      this.setSquadOrder('retreat');
      this.onCommandFeedback?.('RETREAT ORDER (R)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CHARGE, () => {
      this.setSquadOrder('charge');
      this.onCommandFeedback?.('CHARGE ORDER (C)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.PATROL, () => {
      this.setSquadOrder('patrol');
      this.onCommandFeedback?.('PATROL ORDER (P)');
    }));

    // 2. Formations (Z=Line, E=Wedge, V=Column, B=Box, N=Circle, J=Defensive)
    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_LINE, () => {
      this.setSquadFormation('line');
      this.onCommandFeedback?.('FORMATION: LINE (Z)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_WEDGE, () => {
      this.setSquadFormation('wedge');
      this.onCommandFeedback?.('FORMATION: WEDGE (E)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_COLUMN, () => {
      this.setSquadFormation('column');
      this.onCommandFeedback?.('FORMATION: COLUMN (V)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_BOX, () => {
      this.setSquadFormation('defensive_box');
      this.onCommandFeedback?.('FORMATION: BOX (B)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_CIRCLE, () => {
      this.setSquadFormation('scatter');
      this.onCommandFeedback?.('FORMATION: CIRCLE (N)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.FORMATION_DEFENSIVE, () => {
      this.setSquadFormation('defensive_box');
      this.onCommandFeedback?.('FORMATION: DEFENSIVE (J)');
    }));

    // 3. Selection (1=Hero, 2=Army, 3=Infantry, 4=Archers, 5=Cavalry, Tab=Cycle)
    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.SELECT_HERO, () => {
      this.selectHero(true);
      this.onCommandFeedback?.('SELECTED: HERO (1)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.SELECT_ARMY, () => {
      this.selectSquad(true);
      this.onCommandFeedback?.('SELECTED: FULL ARMY (2)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.SELECT_INFANTRY, () => {
      this.selectSquad(true);
      this.onCommandFeedback?.('SELECTED: INFANTRY (3)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.SELECT_ARCHERS, () => {
      this.selectSquad(true);
      this.onCommandFeedback?.('SELECTED: ARCHERS (4)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.SELECT_CAVALRY, () => {
      this.selectSquad(true);
      this.onCommandFeedback?.('SELECTED: CAVALRY / SPEARS (5)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CYCLE_SELECTION, () => {
      if (this.selectedEntity === 'hero') {
        this.selectSquad(true);
        this.onCommandFeedback?.('SELECTED: ARMY (Tab)');
      } else {
        this.selectHero(true);
        this.onCommandFeedback?.('SELECTED: HERO (Tab)');
      }
    }));

    // 4. Camera Zoom (+, -)
    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CAMERA_ZOOM_IN, () => {
      this.camZoom = Math.max(8, this.camZoom - 2);
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CAMERA_ZOOM_OUT, () => {
      this.camZoom = Math.min(34, this.camZoom + 2);
    }));

    // 5. System / UI (Esc, Clean Screen, Settings, Help)
    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CANCEL, () => {
      if (this.isMoveCommandPending) {
        this.setMoveCommandMode(false);
        this.onCommandFeedback?.('COMMAND CANCELLED (Esc)');
      } else {
        this.selectSquad(false);
        this.selectHero(false);
      }
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CLEAN_SCREEN, () => {
      const active = controlPreferences.toggleCleanScreen();
      this.onCommandFeedback?.(active ? 'CLEAN SCREEN: ON (F10)' : 'CLEAN SCREEN: OFF (F10)');
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.OPEN_SETTINGS, () => {
      this.onOpenSettings?.();
    }));

    this.shortcutUnsubs.push(shortcutManager.onAction(InputAction.CONTROLS_HELP, () => {
      this.onOpenHelp?.();
    }));
  }

  public getCameraComponent(): pc.CameraComponent | null {
    return this.cameraEntity?.camera ?? null;
  }

  public getRadarEntities(): RadarEntity[] {
    const entities: RadarEntity[] = [];
    const heroPos = this.heroController.getPosition();

    // 1. Hero
    entities.push({
      id: 'hero',
      x: heroPos.x,
      z: heroPos.z,
      type: 'hero',
      name: this.heroController.profile.name
    });

    // 2. Vanguard Royal Guard
    const squad = this.armyController.getSquad('squad_royal_guard');
    if (squad) {
      for (const unit of squad.units) {
        if (!unit.isDead && unit.stats.hp > 0) {
          entities.push({
            id: unit.id,
            x: unit.x,
            z: unit.z,
            type: 'ally',
            name: unit.name
          });
        }
      }
    }

    // 3. Raiders
    const raiders = this.raidEventSystem.getRaiders();
    for (const r of raiders) {
      if (!r.isDead && r.hp > 0) {
        entities.push({
          id: r.id,
          x: r.x,
          z: r.z,
          type: 'enemy',
          name: r.name
        });
      }
    }

    // 4. Arena Duel Challenger
    if (this.trainingArena.isActive && this.trainingArena.challenger && this.trainingArena.challenger.health > 0) {
      const chal = this.trainingArena.challenger;
      entities.push({
        id: chal.id,
        x: chal.position.x,
        z: chal.position.z,
        type: 'enemy',
        name: chal.name
      });
    }

    // 5. Settlement NPCs
    for (const npc of this.npcs) {
      if (npc.health > 0) {
        entities.push({
          id: npc.id,
          x: npc.position.x,
          z: npc.position.z,
          type: 'neutral',
          name: npc.name
        });
      }
    }

    // 6. Wildlife Animals
    for (const animal of this.animalSystem.getAnimals()) {
      entities.push({
        id: animal.id,
        x: animal.position.x,
        z: animal.position.z,
        type: 'neutral',
        name: animal.type
      });
    }

    // 7. Active Loot Drops
    for (const loot of this.lootSystem.getActiveLoot()) {
      entities.push({
        id: loot.id,
        x: loot.x,
        z: loot.z,
        type: 'loot',
        name: loot.type.toUpperCase()
      });
    }

    // 8. Destination Beacon (if active)
    if (this.destinationMarkerEntity && this.destinationMarkerEntity.enabled) {
      const pos = this.destinationMarkerEntity.getPosition();
      entities.push({
        id: 'move_marker_beacon',
        x: pos.x,
        z: pos.z,
        type: 'beacon',
        name: 'Order Beacon'
      });
    }

    return entities;
  }

  public setTerrainBiome(biome: BiomeKey): void {
    if (this.terrainManager) {
      this.terrainManager.setBiome(biome);
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isRunning = false;
    for (const unsub of this.shortcutUnsubs) {
      unsub();
    }
    this.shortcutUnsubs = [];
    for (const arr of this.arrows) {
      arr.entity.destroy();
    }
    this.arrows = [];
    this.combatVFX.destroy();
    this.lootSystem.destroy();
    this.terrainManager?.destroy();
    this.app.off('update', this.onUpdate, this);
    this.app.destroy();
  }
}
