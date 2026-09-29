/**
 * Realm of Crowns - Authoritative World Map & Army March Routing Service
 * Governs hexagonal world grid, fog of war, resource gathering nodes,
 * barbarian camps, combat resolution, and army march routing.
 */

import {
  HexCoordinates,
  WorldTile,
  WorldTerrainType,
  WorldEntityType,
  ResourceNode,
  BarbarianCamp,
  RivalKingdom,
  AncientShrine,
  ArmyMarch,
  MarchType,
  MarchStatus,
  BattleReport,
  ScoutReport,
  PlayerWorldState,
  Resources,
  ResourceType,
} from '../../types';
import { kingdomService } from './kingdomService';
import { playerService } from './playerService';
import { combatService } from './combatService';
import {
  COMMANDER_ROSTER,
  calculateArmyCapacity,
  calculateArmySpeedFactor,
  calculateArmyPayloadCapacity,
} from './militaryConfig';

export class WorldService {
  private tiles: Map<string, WorldTile> = new Map();
  private playerWorldStates: Map<string, PlayerWorldState> = new Map();
  private reports: Map<string, (BattleReport | ScoutReport)[]> = new Map();
  private mapRadius = 22; // Vast Realm hex radius (approx 1,519 tiles)
  private initialized = false;

  constructor() {
    this.ensureWorldGenerated();
  }

  // ---------------------------------------------------------------------------
  // HEX MATH & COORDINATE UTILITIES
  // ---------------------------------------------------------------------------

  coordKey(coords: HexCoordinates): string {
    return `${coords.q},${coords.r}`;
  }

  parseKey(key: string): HexCoordinates {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  hexDistance(a: HexCoordinates, b: HexCoordinates): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  getNeighbors(c: HexCoordinates): HexCoordinates[] {
    const directions = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    return directions.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
  }

  getCoordsInRadius(center: HexCoordinates, radius: number): HexCoordinates[] {
    const results: HexCoordinates[] = [];
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        results.push({ q: center.q + q, r: center.r + r });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // PROCEDURAL WORLD GENERATION
  // ---------------------------------------------------------------------------

  private ensureWorldGenerated() {
    if (this.initialized) return;

    const allCoords = this.getCoordsInRadius({ q: 0, r: 0 }, this.mapRadius);

    for (const coords of allCoords) {
      const key = this.coordKey(coords);
      const distFromCenter = this.hexDistance({ q: 0, r: 0 }, coords);

      // Deterministic smooth continuous noise fields for coherent biomes
      const nx = coords.q * 0.16;
      const nz = coords.r * 0.16;
      const elevationNoise =
        Math.sin(nx) * Math.cos(nz) +
        Math.sin(nx * 2.1 + nz * 0.9) * 0.45 +
        Math.cos(nx * 0.7 - nz * 1.8) * 0.35;

      const moistureNoise =
        Math.cos(nx * 1.2) * Math.sin(nz * 1.1) +
        Math.sin((coords.q + coords.r) * 0.1) * 0.5;

      const riverNoise = Math.abs(Math.sin(coords.q * 0.14 + coords.r * 0.22 + Math.cos(coords.q * 0.08) * 1.4));

      // Local pseudo-random jitter for micro-features
      const seed = Math.abs(Math.sin(coords.q * 12.9898 + coords.r * 78.233) * 43758.5453) % 1;

      let terrain: WorldTerrainType = 'plains';
      let entityType: WorldEntityType = 'empty';
      let resourceNode: ResourceNode | undefined;
      let barbarianCamp: BarbarianCamp | undefined;
      let rivalKingdom: RivalKingdom | undefined;
      let ancientShrine: AncientShrine | undefined;

      // 1. Center tile (0, 0) is reserved for Sovereign Player Citadel
      if (coords.q === 0 && coords.r === 0) {
        terrain = 'plains';
        entityType = 'player_kingdom';
      }
      // 2. Coherent Mountain Ranges (forming scenic crags and ridges)
      else if (elevationNoise > 0.65 && distFromCenter > 2) {
        terrain = 'mountains';
      }
      // 3. Winding Riverways & Natural Lakes
      else if (riverNoise < 0.09 && distFromCenter > 3) {
        terrain = 'water';
      }
      // 4. Contiguous Ancient Woodland & Forests
      else if (moistureNoise > 0.22 || (elevationNoise < -0.4 && seed > 0.45)) {
        terrain = 'forest';
      }
      // 5. Fertile Meadows & Rolling Plains
      else {
        terrain = 'plains';
      }

      // 6. Populate World Entities on walkable terrain
      if (terrain !== 'mountains' && terrain !== 'water' && entityType !== 'player_kingdom') {
        // A. Ancient Arcane Shrines (Strategic territorial objectives across the realm)
        const shrineMap: Record<string, { id: string; name: string; buff: 'attack' | 'gathering'; pct: number; desc: string }> = {
          '4,-4': { id: 'shrine_valor', name: 'Sanctum of Valor', buff: 'attack', pct: 5, desc: 'Empowers marching battalions with +5% physical & siege attack power.' },
          '-4,4': { id: 'shrine_harvest', name: 'Altar of the Harvest', buff: 'gathering', pct: 10, desc: 'Fertility monolith granting +10% resource collection yield throughout the realm.' },
          '-8,-7': { id: 'shrine_tempest', name: 'Spire of the Tempest', buff: 'attack', pct: 8, desc: 'Wind shrine quickening army marches and boosting strike velocity.' },
          '9,6': { id: 'shrine_aegis', name: 'Monolith of the Ancients', buff: 'attack', pct: 7, desc: 'Ancient barrier augmenting troop resilience and armor.' },
          '-12,8': { id: 'shrine_sunstone', name: 'Font of the Sunstone', buff: 'gathering', pct: 12, desc: 'Radiant relic invigorating gathering crews with +12% efficiency.' },
          '13,-9': { id: 'shrine_warlord', name: 'Citadel of the War God', buff: 'attack', pct: 10, desc: 'Mythic altar granting +10% lethal combat prowess to allied lords.' },
        };

        const shrineDef = shrineMap[key];
        if (shrineDef) {
          entityType = 'ancient_shrine';
          ancientShrine = {
            id: shrineDef.id,
            name: shrineDef.name,
            buffType: shrineDef.buff,
            buffValuePercent: shrineDef.pct,
            description: shrineDef.desc,
          };
        }
        // B. Rival Kingdoms (Lords and Barons of rival noble houses across the continent)
        else if (
          (coords.q === 3 && coords.r === 2) ||
          (coords.q === -3 && coords.r === -2) ||
          (coords.q === 5 && coords.r === -3) ||
          (coords.q === -6 && coords.r === 5) ||
          (coords.q === 7 && coords.r === -7) ||
          (coords.q === -8 && coords.r === 2) ||
          (coords.q === 8 && coords.r === 3) ||
          (coords.q === -5 && coords.r === -8) ||
          (coords.q === 11 && coords.r === -4) ||
          (coords.q === -11 && coords.r === 9) ||
          (coords.q === 10 && coords.r === 8) ||
          (coords.q === -13 && coords.r === -3)
        ) {
          entityType = 'rival_kingdom';
          const rivalDefs = [
            { name: 'Duke Katherine', level: 3, power: 18500, tag: 'LION' },
            { name: 'Lord Brandon', level: 4, power: 34200, tag: 'WOLF' },
            { name: 'Baron Malakor', level: 2, power: 9800, tag: 'HAWK' },
            { name: 'Lady Aurelia', level: 5, power: 52400, tag: 'PHOENIX' },
            { name: 'Warlord Vane', level: 6, power: 74000, tag: 'DRAGON' },
            { name: 'Duchess Vivienne', level: 3, power: 21600, tag: 'STAG' },
            { name: 'Margrave Torvald', level: 4, power: 38900, tag: 'BEAR' },
            { name: 'Lady Seraphina', level: 5, power: 49800, tag: 'GRIFFIN' },
          ];
          const rivalIdx = Math.abs(coords.q * 3 + coords.r * 7) % rivalDefs.length;
          const rival = rivalDefs[rivalIdx];
          rivalKingdom = {
            id: `rival_${key}`,
            ownerName: rival.name,
            castleLevel: rival.level,
            power: rival.power,
            allianceTag: rival.tag,
            shieldActive: true,
            shieldExpiresAt: Date.now() + (12 + (rivalIdx % 24)) * 3600 * 1000,
          };
        }
        // C. Barbarian Camps & Strongholds (Levels 1 to 10 scaling outward with great bounties)
        else if (seed > 0.68 && distFromCenter >= 2) {
          entityType = 'barbarian_camp';
          const level = Math.min(10, Math.max(1, Math.floor(distFromCenter / 2.0)));
          const basePower = level * 1600;
          const campNames = [
            'Wildling Outpost',
            'Ironhide Marauders',
            'Shadowfang Warband',
            'Bloodaxe Warband',
            'Frostclaw Raiders',
            'Grimskull Encampment',
            'Bonecrusher Stronghold',
            'Dread Warlord Garrison',
            'Thunderpeak Chieftain Citadel',
            'Dragonmaw Bastion',
          ];
          barbarianCamp = {
            id: `barb_${key}`,
            level,
            name: `${campNames[(level - 1) % campNames.length]} (Lv ${level})`,
            power: basePower,
            garrison: {
              barbarian_warrior: level * 45,
              barbarian_archer: level * 28,
            },
            rewards: {
              gems: 25 + level * 20,
              resources: {
                food: 3500 * level,
                wood: 3500 * level,
                stone: 1800 * level,
                iron: 1200 * level,
                gold: 600 * level,
              },
              exp: 250 * level,
              speedupMinutes: 5 * level,
            },
            defeated: false,
          };
        }
        // D. Rich Resource Gathering Deposits (Food, Wood, Stone, Iron, Gold Lv 1-6)
        else if (seed > 0.32 && distFromCenter >= 1) {
          entityType = 'resource_node';
          const nodeTypes: ResourceType[] = ['food', 'wood', 'stone', 'iron', 'gold'];
          const nodeNames: Record<ResourceType, string> = {
            food: 'Golden Wheat Field',
            wood: 'Ancient Timber Grove',
            stone: 'Granite Stone Quarry',
            iron: 'Iron Vein Outcrop',
            gold: 'Royal Gold Deposit',
          };
          const selectedType = nodeTypes[Math.floor(seed * 10) % nodeTypes.length];
          const nodeLevel = Math.min(6, Math.max(1, Math.floor(distFromCenter / 3.4) + 1));
          const maxCapacity = (selectedType === 'gold' ? 10000 : 30000) * nodeLevel;
          const ratePerHour = (selectedType === 'gold' ? 7000 : 20000) * (1 + (nodeLevel - 1) * 0.35);

          resourceNode = {
            id: `res_${key}`,
            resourceType: selectedType,
            level: nodeLevel,
            name: `${nodeNames[selectedType]} (Lv ${nodeLevel})`,
            maxCapacity,
            currentCapacity: maxCapacity,
            gatheringRatePerHour: Math.round(ratePerHour),
          };
        }
      }

      this.tiles.set(key, {
        id: `tile_${key}`,
        coords,
        terrain,
        entityType,
        entityId: resourceNode?.id || barbarianCamp?.id || rivalKingdom?.id || ancientShrine?.id,
        resourceNode,
        barbarianCamp,
        rivalKingdom,
        ancientShrine,
        playerKingdom:
          entityType === 'player_kingdom'
            ? {
                ownerUid: 'player_home',
                name: 'Your Citadel',
                castleLevel: 1,
                power: 8500,
                shieldActive: true,
              }
            : undefined,
      });
    }

    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // PLAYER WORLD STATE & FOG OF WAR
  // ---------------------------------------------------------------------------

  getPlayerWorldState(playerId: string): PlayerWorldState {
    this.ensureWorldGenerated();
    let state = this.playerWorldStates.get(playerId);
    if (!state) {
      // Default explored radius 3 around home kingdom (q: 0, r: 0)
      const homeCoords: HexCoordinates = { q: 0, r: 0 };
      const initialExplored = this.getCoordsInRadius(homeCoords, 3).map((c) => this.coordKey(c));

      state = {
        playerId,
        homeCoords,
        exploredTileKeys: initialExplored,
        activeMarches: [],
        maxMarchSlots: 2,
        recentReports: [],
      };
      this.playerWorldStates.set(playerId, state);
    }

    // Tick active marches authoritatively
    this.tickPlayerMarches(state);

    return state;
  }

  revealFogOfWar(playerId: string, centerCoords: HexCoordinates, radius: number): string[] {
    const state = this.getPlayerWorldState(playerId);
    const newKeys = this.getCoordsInRadius(centerCoords, radius).map((c) => this.coordKey(c));
    const currentSet = new Set(state.exploredTileKeys);
    const addedKeys: string[] = [];

    for (const key of newKeys) {
      if (!currentSet.has(key) && this.tiles.has(key)) {
        currentSet.add(key);
        addedKeys.push(key);
      }
    }

    state.exploredTileKeys = Array.from(currentSet);
    return addedKeys;
  }

  getWorldTiles(): WorldTile[] {
    this.ensureWorldGenerated();
    return Array.from(this.tiles.values());
  }

  getTile(coords: HexCoordinates): WorldTile | undefined {
    this.ensureWorldGenerated();
    return this.tiles.get(this.coordKey(coords));
  }

  // ---------------------------------------------------------------------------
  // MARCH ENGINE & SERVER-AUTHORITATIVE TICK
  // ---------------------------------------------------------------------------

  dispatchMarch(
    playerId: string,
    targetCoords: HexCoordinates,
    marchType: MarchType,
    commanderId: string,
    commanderName: string,
    troops: Record<string, number>
  ): { success: boolean; march?: ArmyMarch; error?: string } {
    const playerState = this.getPlayerWorldState(playerId);
    const targetTile = this.getTile(targetCoords);

    if (!targetTile) {
      return { success: false, error: 'Target coordinates are outside the known realm.' };
    }

    if (targetTile.terrain === 'mountains' || targetTile.terrain === 'water') {
      return { success: false, error: 'Cannot march onto impassable terrain.' };
    }

    // Check march slot capacity
    if (playerState.activeMarches.length >= playerState.maxMarchSlots) {
      return {
        success: false,
        error: `All ${playerState.maxMarchSlots} army march queues are currently engaged.`,
      };
    }

    // Check commander availability
    const commanderBusy = playerState.activeMarches.some((m) => m.commanderId === commanderId);
    if (commanderBusy) {
      return { success: false, error: 'This commander is already leading an active march.' };
    }

    // Check troop count & availability from kingdom
    const totalTroops = Object.values(troops).reduce((sum, n) => sum + (Number.isInteger(n) && n > 0 ? n : 0), 0);
    if (totalTroops <= 0 && marchType !== 'scout') {
      return { success: false, error: 'At least one battalion of troops must be assigned to the march.' };
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const commander = commanderId ? COMMANDER_ROSTER[commanderId] : undefined;
    const maxArmyCapacity = calculateArmyCapacity(kingdom.castleLevel, commander);

    if (totalTroops > maxArmyCapacity && marchType !== 'scout') {
      return {
        success: false,
        error: `Army size (${totalTroops.toLocaleString()}) exceeds maximum march deployment capacity (${maxArmyCapacity.toLocaleString()}).`,
      };
    }

    for (const [unitId, count] of Object.entries(troops)) {
      const available = kingdom.troops[unitId] || 0;
      if (count > available) {
        return { success: false, error: `Insufficient troops: requested ${count} ${unitId}, only ${available} available.` };
      }
    }

    // Deduct troops from idle kingdom garrison
    for (const [unitId, count] of Object.entries(troops)) {
      kingdom.troops[unitId] = Math.max(0, (kingdom.troops[unitId] || 0) - count);
    }

    // Calculate distance and march duration based on unit speed and commander bonus
    const dist = this.hexDistance(playerState.homeCoords, targetCoords);
    let speedFactor = marchType === 'scout' ? 2.0 : calculateArmySpeedFactor(troops, commander);
    if (commander?.stats?.marchSpeed) {
      speedFactor *= (1 + commander.stats.marchSpeed);
    } else if (commander?.heroClass === 'ranger') {
      speedFactor *= 1.35;
    }
    const secPerHex = marchType === 'scout' ? 1.5 : Math.max(1.5, 4 / speedFactor);
    const totalDurationSeconds = Math.max(3, Math.round(dist * secPerHex));

    const now = Date.now();
    const marchId = `march_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Calculate troop payload capacity based on unit categories and commander bonus
    const maxPayloadCapacity = calculateArmyPayloadCapacity(troops, commander);

    let targetName = 'Open Territory';
    if (targetTile.resourceNode) targetName = targetTile.resourceNode.name;
    else if (targetTile.barbarianCamp) targetName = targetTile.barbarianCamp.name;
    else if (targetTile.rivalKingdom) targetName = `${targetTile.rivalKingdom.ownerName}'s Domain`;
    else if (targetTile.ancientShrine) targetName = targetTile.ancientShrine.name;

    const newMarch: ArmyMarch = {
      marchId,
      playerId,
      playerName: kingdom.name,
      commanderId,
      commanderName,
      type: marchType,
      status: 'marching',
      originCoords: playerState.homeCoords,
      targetCoords,
      targetType: targetTile.entityType,
      targetName,
      targetId: targetTile.entityId,
      troops: { ...troops },
      totalTroopCount: totalTroops,
      carriedResources: { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 },
      maxPayloadCapacity,
      gatheringRatePerHour: targetTile.resourceNode?.gatheringRatePerHour,
      departureTime: now,
      estimatedArrivalTime: now + totalDurationSeconds * 1000,
      totalDurationSeconds,
    };

    playerState.activeMarches.push(newMarch);
    return { success: true, march: newMarch };
  }

  recallMarch(playerId: string, marchId: string): { success: boolean; error?: string } {
    const playerState = this.getPlayerWorldState(playerId);
    const march = playerState.activeMarches.find((m) => m.marchId === marchId);

    if (!march) {
      return { success: false, error: 'March not found or already completed.' };
    }

    if (march.status === 'returning') {
      return { success: false, error: 'March is already returning to kingdom.' };
    }

    const now = Date.now();

    // If currently gathering, finalize gathered resources
    if (march.status === 'gathering' && march.gatheringStartedAt && march.gatheringRatePerHour) {
      const elapsedHours = (now - march.gatheringStartedAt) / (3600 * 1000);
      const gatheredAmount = Math.min(
        march.maxPayloadCapacity,
        Math.floor(elapsedHours * march.gatheringRatePerHour)
      );
      const targetTile = this.getTile(march.targetCoords);
      if (targetTile?.resourceNode) {
        const type = targetTile.resourceNode.resourceType;
        march.carriedResources[type] = Math.min(
          gatheredAmount,
          targetTile.resourceNode.currentCapacity
        );
        targetTile.resourceNode.currentCapacity = Math.max(
          0,
          targetTile.resourceNode.currentCapacity - gatheredAmount
        );
      }
    }

    // Set return travel parameters
    const dist = this.hexDistance(playerState.homeCoords, march.targetCoords);
    const returnSec = Math.max(3, Math.round(dist * 4));

    march.status = 'returning';
    march.returnDepartureTime = now;
    march.returnArrivalTime = now + returnSec * 1000;

    return { success: true };
  }

  tickPlayerMarches(playerState: PlayerWorldState): void {
    const now = Date.now();
    const remainingMarches: ArmyMarch[] = [];

    for (const march of playerState.activeMarches) {
      // 1. Marching -> Target Arrival
      if (march.status === 'marching' && now >= march.estimatedArrivalTime) {
        if (march.type === 'scout') {
          // Uncover fog of war
          this.revealFogOfWar(playerState.playerId, march.targetCoords, 2);

          const targetTile = this.getTile(march.targetCoords);
          const report: ScoutReport = {
            id: `scout_${Date.now()}`,
            timestamp: now,
            targetCoords: march.targetCoords,
            entityType: targetTile?.entityType || 'empty',
            details: {
              name: march.targetName,
              level: targetTile?.resourceNode?.level || targetTile?.barbarianCamp?.level,
              power: targetTile?.barbarianCamp?.power || targetTile?.rivalKingdom?.power,
              resourcesRemaining: targetTile?.resourceNode
                ? { [targetTile.resourceNode.resourceType]: targetTile.resourceNode.currentCapacity }
                : undefined,
              garrisonEstimate: targetTile?.barbarianCamp
                ? 'Hostile Warband Garrison'
                : targetTile?.rivalKingdom
                ? 'Fortified Royal Guard'
                : 'None',
              shieldStatus: targetTile?.rivalKingdom?.shieldActive ? 'Active Shield' : 'Unshielded',
            },
          };
          this.addReport(playerState.playerId, report);

          // Scout returns quickly
          march.status = 'returning';
          march.returnDepartureTime = now;
          march.returnArrivalTime = now + march.totalDurationSeconds * 1000;
          remainingMarches.push(march);
        } else if (march.type === 'attack_barbarian') {
          // Authoritative Combat Resolution
          const targetTile = this.getTile(march.targetCoords);
          const camp = targetTile?.barbarianCamp;

          const combatResult = combatService.resolveCombat(
            {
              playerId: playerState.playerId,
              playerName: march.playerName,
              commanderId: march.commanderId,
              commanderName: march.commanderName,
              troops: march.troops,
            },
            {
              coords: march.targetCoords,
              name: march.targetName,
              entityType: 'barbarian_camp',
              barbarianCamp: camp,
            }
          );

          this.addReport(playerState.playerId, combatResult.battleReport);

          if (combatResult.victory) {
            if (camp) {
              camp.defeated = true;
              camp.respawnTime = now + 10 * 60 * 1000;
            }

            if (combatResult.gemReward > 0) {
              playerService.grantGems(
                playerState.playerId,
                combatResult.gemReward,
                `barbarian_defeat:${camp?.id || 'camp'}`,
                `barb_${march.marchId}`
              );
            }

            march.carriedResources = { ...combatResult.plunderedResources };
          }

          // Surviving troops will march back to the citadel
          march.troops = { ...combatResult.survivingTroops };
          march.totalTroopCount = Object.values(march.troops).reduce(
            (sum, n) => sum + (n > 0 ? n : 0),
            0
          );

          // Uncover fog of war around target
          this.revealFogOfWar(playerState.playerId, march.targetCoords, 2);

          // Head back home
          march.status = 'returning';
          march.returnDepartureTime = now;
          march.returnArrivalTime = now + march.totalDurationSeconds * 1000;
          remainingMarches.push(march);
        } else if (march.type === 'gather') {
          // Arrived at resource node, start gathering
          march.status = 'gathering';
          march.gatheringStartedAt = now;
          this.revealFogOfWar(playerState.playerId, march.targetCoords, 2);
          remainingMarches.push(march);
        } else {
          remainingMarches.push(march);
        }
      }
      // 2. Gathering -> Full capacity or recall
      else if (march.status === 'gathering') {
        const elapsedHours = (now - (march.gatheringStartedAt || now)) / (3600 * 1000);
        const commander = march.commanderId ? COMMANDER_ROSTER[march.commanderId] : undefined;
        let gatherMult = 1.0;
        if (commander?.stats?.gatheringSpeedBonus) {
          gatherMult += commander.stats.gatheringSpeedBonus;
        } else if (commander?.heroClass === 'steward') {
          gatherMult += 0.30;
        } else if (commander?.heroClass === 'ranger') {
          gatherMult += 0.15;
        }
        const rate = Math.round((march.gatheringRatePerHour || 18000) * gatherMult);
        const currentHarvest = Math.floor(elapsedHours * rate);

        if (currentHarvest >= march.maxPayloadCapacity) {
          // Node depleted or capacity reached, return home
          const targetTile = this.getTile(march.targetCoords);
          if (targetTile?.resourceNode) {
            const resType = targetTile.resourceNode.resourceType;
            march.carriedResources[resType] = Math.min(
              march.maxPayloadCapacity,
              targetTile.resourceNode.currentCapacity
            );
            targetTile.resourceNode.currentCapacity = Math.max(
              0,
              targetTile.resourceNode.currentCapacity - march.carriedResources[resType]
            );
          }

          march.status = 'returning';
          march.returnDepartureTime = now;
          march.returnArrivalTime = now + march.totalDurationSeconds * 1000;
        }
        remainingMarches.push(march);
      }
      // 3. Returning -> Home Arrival
      else if (march.status === 'returning' && now >= (march.returnArrivalTime || 0)) {
        // March is complete! Deposit carried resources and restore troops to kingdom
        const kingdom = kingdomService.getKingdom(playerState.playerId);

        kingdom.resources.food += march.carriedResources.food;
        kingdom.resources.wood += march.carriedResources.wood;
        kingdom.resources.stone += march.carriedResources.stone;
        kingdom.resources.iron += march.carriedResources.iron;
        kingdom.resources.gold += march.carriedResources.gold;

        // Restore surviving troops
        for (const [unitId, count] of Object.entries(march.troops)) {
          kingdom.troops[unitId] = (kingdom.troops[unitId] || 0) + count;
        }

        march.status = 'completed';
        // Dropped from activeMarches
      } else {
        remainingMarches.push(march);
      }
    }

    playerState.activeMarches = remainingMarches;
  }

  // ---------------------------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------------------------

  private addReport(playerId: string, report: BattleReport | ScoutReport) {
    let list = this.reports.get(playerId);
    if (!list) {
      list = [];
      this.reports.set(playerId, list);
    }
    list.unshift(report);
    if (list.length > 20) list.pop();

    const state = this.playerWorldStates.get(playerId);
    if (state) {
      state.recentReports = list;
    }
  }

  getReports(playerId: string): (BattleReport | ScoutReport)[] {
    return this.reports.get(playerId) || [];
  }
}

export const worldService = new WorldService();
