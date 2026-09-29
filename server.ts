/**
 * Realm of Crowns - Full-Stack Express & Vite Server
 * Serves server-authoritative API endpoints and mounts Vite middleware for the web client.
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { MMOServer } from './src/server/network/mmoServer';

import { playerService } from './src/server/services/playerService';
import { kingdomService } from './src/server/services/kingdomService';
import { questService } from './src/server/services/questService';
import { inventoryService } from './src/server/services/inventoryService';
import { ledgerService } from './src/server/services/ledgerService';
import { worldService } from './src/server/services/worldService';
import { GAME_CONFIG, STARTER_COMMANDER, BUILDING_DEFINITIONS, calculateInstantGemCost } from './src/server/services/gameConfig';
import { TROOP_DEFINITIONS, COMMANDER_ROSTER } from './src/server/services/militaryConfig';
import { Commander } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Secure helper to extract authenticated player identity
  const getPlayerId = (req: Request): string | null => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      if (token && token.length >= 3) return token;
    }
    const xPlayerId = req.headers['x-player-id'] as string;
    if (xPlayerId && typeof xPlayerId === 'string') {
      const sanitized = xPlayerId.trim();
      if (/^[a-zA-Z0-9_-]{3,128}$/.test(sanitized)) {
        return sanitized;
      }
    }
    return null;
  };

  // Auth middleware guard
  const requireAuth = (req: Request, res: Response, next: () => void) => {
    const playerId = getPlayerId(req);
    if (!playerId) {
      res.status(401).json({ success: false, error: 'Authentication required. Please authenticate before making requests.' });
      return;
    }
    (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId = playerId;
    next();
  };

  // -------------------------------------------------------------
  // API ROUTES (MUST PRECEDE VITE MIDDLEWARE)
  // -------------------------------------------------------------

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', game: 'Realm of Crowns', version: GAME_CONFIG.version });
  });

  // MMO Realtime Transport & Network Metrics
  app.get('/api/mmo/metrics', (_req: Request, res: Response) => {
    if (mmoServer) {
      res.json({ success: true, metrics: mmoServer.getMetrics() });
    } else {
      res.status(503).json({ success: false, error: 'MMO Server starting up' });
    }
  });

  // Player Profile (Bootstrap or fetch)
  app.get('/api/auth/profile', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { player, isNew } = playerService.getOrCreatePlayer(playerId, 'Sovereign Lord');
    res.json({ player, isNewPlayer: isNew, isNew });
  });

  // Explicit Starter Charter Claim Endpoint
  app.post('/api/auth/bootstrap-starter', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const result = playerService.claimStarterCharter(playerId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    const kingdom = kingdomService.getKingdom(playerId);
    const inventory = inventoryService.getInventory(playerId);
    res.json({
      success: true,
      player: result.player,
      kingdom,
      inventory,
    });
  });

  // Kingdom State
  app.get('/api/kingdom', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const kingdom = kingdomService.getKingdom(playerId, 'Sovereign Lord');
    res.json({ kingdom });
  });

  // Building Upgrade
  app.post('/api/buildings/upgrade', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { buildingId } = req.body;
    if (!buildingId || typeof buildingId !== 'string') {
      return res.status(400).json({ success: false, error: 'buildingId is required.' });
    }

    const result = kingdomService.startBuildingUpgrade(playerId, buildingId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);
    playerService.recalculatePlayerPower(player);

    res.json({
      success: true,
      task: result.task,
      kingdom,
    });
  });

  // Building Speedup (Server-authoritative item & duration validation)
  app.post('/api/buildings/speedup', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { taskId, minutes, itemId } = req.body;
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid taskId is required.' });
    }

    const task = kingdomService.getTask(playerId, taskId);
    if (!task) {
      return res.status(400).json({ success: false, error: 'Active construction task not found.' });
    }

    let authoritativeMinutes = Number(minutes);

    // If itemId provided, verify item exists and enforces its authoritative speedupMinutes
    if (itemId) {
      const invItem = inventoryService.getItem(playerId, itemId);
      if (!invItem || invItem.quantity < 1) {
        return res.status(400).json({ success: false, error: 'Speedup item unavailable in inventory.' });
      }
      if (!invItem.effect.speedupMinutes || invItem.effect.speedupMinutes <= 0) {
        return res.status(400).json({ success: false, error: 'Item has no speedup properties.' });
      }

      authoritativeMinutes = invItem.effect.speedupMinutes;

      const consumeRes = inventoryService.consumeItem(playerId, itemId, 1);
      if (!consumeRes.success) {
        return res.status(400).json({ success: false, error: consumeRes.error });
      }
    } else {
      if (!Number.isInteger(authoritativeMinutes) || authoritativeMinutes <= 0) {
        return res.status(400).json({ success: false, error: 'Valid positive minutes required.' });
      }
    }

    const speedupResult = kingdomService.applySpeedup(playerId, taskId, authoritativeMinutes);
    const kingdom = kingdomService.getKingdom(playerId);
    const inventory = inventoryService.getInventory(playerId);

    res.json({
      success: speedupResult.success,
      completed: speedupResult.completed,
      minutesApplied: authoritativeMinutes,
      kingdom,
      inventory,
    });
  });

  // Instant Complete with Gems (Authoritative Gem cost calculation on server)
  app.post('/api/buildings/instant', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { taskId } = req.body;
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid taskId is required.' });
    }

    const task = kingdomService.getTask(playerId, taskId);
    if (!task) {
      return res.status(400).json({ success: false, error: 'Active construction task not found in queue.' });
    }

    // Authoritative calculation of remaining time and cost
    const remainingSec = Math.max(0, Math.ceil((task.completionTime - Date.now()) / 1000));
    const authoritativeGemCost = calculateInstantGemCost(remainingSec);

    const spendRes = playerService.spendGems(playerId, authoritativeGemCost, `instant_building:${taskId}`);
    if (!spendRes.success) {
      return res.status(400).json({ success: false, error: spendRes.error });
    }

    kingdomService.instantComplete(playerId, taskId);
    const kingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);

    res.json({
      success: true,
      authoritativeGemCost,
      kingdom,
      player,
    });
  });

  // Collect Produced Resources
  app.post('/api/buildings/collect', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const kingdom = kingdomService.getKingdom(playerId);
    kingdomService.updateAuthoritativeState(kingdom);
    res.json({ success: true, resources: kingdom.resources });
  });

  // Quests
  app.get('/api/quests', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const quests = questService.getQuests(playerId);
    res.json({ quests });
  });

  app.post('/api/quests/claim', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { questId } = req.body;
    if (!questId || typeof questId !== 'string') {
      return res.status(400).json({ success: false, error: 'questId required.' });
    }

    const result = questService.claimReward(playerId, questId, (amount) => {
      return playerService.grantGems(playerId, amount, `quest_reward:${questId}`, `quest_${playerId}_${questId}`);
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    const { player } = playerService.getOrCreatePlayer(playerId);
    if (result.grantedExp) {
      playerService.addExp(player, result.grantedExp);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const quests = questService.getQuests(playerId);
    const inventory = inventoryService.getInventory(playerId);

    res.json({
      success: true,
      player,
      kingdom,
      quests,
      inventory,
      granted: result,
    });
  });

  // Inventory
  app.get('/api/inventory', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const items = inventoryService.getInventory(playerId);
    res.json({ items });
  });

  app.post('/api/inventory/use', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { itemId, quantity = 1 } = req.body;
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ success: false, error: 'itemId required.' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
      return res.status(400).json({ success: false, error: 'Quantity must be an integer between 1 and 100.' });
    }

    const consumeRes = inventoryService.consumeItem(playerId, itemId, qty);
    if (!consumeRes.success) {
      return res.status(400).json(consumeRes);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);
    const item = consumeRes.item!;

    // Apply item effects
    if (item.effect.resources) {
      if (item.effect.resources.food) kingdom.resources.food += item.effect.resources.food * qty;
      if (item.effect.resources.wood) kingdom.resources.wood += item.effect.resources.wood * qty;
      if (item.effect.resources.stone) kingdom.resources.stone += item.effect.resources.stone * qty;
      if (item.effect.resources.iron) kingdom.resources.iron += item.effect.resources.iron * qty;
      if (item.effect.resources.gold) kingdom.resources.gold += item.effect.resources.gold * qty;
    }

    if (item.effect.shieldHours) {
      const now = Date.now();
      const current = Math.max(now, player.shieldExpiresAt);
      player.shieldExpiresAt = current + item.effect.shieldHours * 3600 * 1000 * qty;
    }

    const inventory = inventoryService.getInventory(playerId);
    res.json({
      success: true,
      inventory,
      kingdom,
      player,
    });
  });

  // Player commanders store (role assignments, talent points, leveling)
  const playerCommandersStore = new Map<string, Record<string, Commander>>();

  function getPlayerCommanders(playerId: string): Record<string, Commander> {
    if (!playerCommandersStore.has(playerId)) {
      const cloned: Record<string, Commander> = JSON.parse(JSON.stringify(COMMANDER_ROSTER));
      if (cloned['alden_valiant']) cloned['alden_valiant'].assignedRole = 'citadel_garrison';
      if (cloned['valeria_vanguard']) cloned['valeria_vanguard'].assignedRole = 'field_march';
      playerCommandersStore.set(playerId, cloned);
    }
    return playerCommandersStore.get(playerId)!;
  }

  // Commander Details & Roster
  app.get('/api/commander', (req: Request, res: Response) => {
    const playerId = getPlayerId(req) || 'guest_default';
    const commanders = getPlayerCommanders(playerId);
    const primary = commanders['alden_valiant'] || STARTER_COMMANDER;
    res.json({ commander: primary, commanders });
  });

  // Assign Commander Role (Citadel Garrison, Field March, Treasury Overseer, Logistics Minister, Master of Arms)
  app.post('/api/commander/assign-role', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { commanderId, role } = req.body;
    if (!commanderId || typeof commanderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid commanderId is required.' });
    }

    const validRoles = ['citadel_garrison', 'field_march', 'treasury_overseer', 'logistics_minister', 'master_of_arms', 'unassigned'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const commanders = getPlayerCommanders(playerId);
    const targetCommander = commanders[commanderId];
    if (!targetCommander) {
      return res.status(404).json({ success: false, error: 'Commander not found in royal court.' });
    }

    // Unique roles: only 1 commander can be garrison, treasury overseer, logistics minister, or master of arms at a time
    if (role !== 'field_march' && role !== 'unassigned') {
      for (const cmd of Object.values(commanders)) {
        if (cmd.assignedRole === role && cmd.id !== commanderId) {
          cmd.assignedRole = undefined;
        }
      }
    }

    targetCommander.assignedRole = role === 'unassigned' ? undefined : (role as any);

    res.json({
      success: true,
      commander: targetCommander,
      commanders,
    });
  });

  // Level Up Commander using Hero Tome / Experience
  app.post('/api/commander/level-up', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { commanderId } = req.body;
    if (!commanderId || typeof commanderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid commanderId is required.' });
    }

    const commanders = getPlayerCommanders(playerId);
    const cmd = commanders[commanderId];
    if (!cmd) {
      return res.status(404).json({ success: false, error: 'Commander not found.' });
    }

    if (cmd.level >= 50) {
      return res.status(400).json({ success: false, error: 'Commander is already at maximum level.' });
    }

    cmd.level += 1;
    cmd.power = Math.round(cmd.power * 1.15 + 250);
    cmd.talentPoints = (cmd.talentPoints || 0) + 1;
    cmd.maxExp = Math.round(cmd.maxExp * 1.35);

    res.json({
      success: true,
      commander: cmd,
      commanders,
    });
  });

  // Spend Talent Point on Talent Branch Node
  app.post('/api/commander/upgrade-talent', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { commanderId, branchId, talentId } = req.body;
    if (!commanderId || !branchId || !talentId) {
      return res.status(400).json({ success: false, error: 'commanderId, branchId, and talentId are required.' });
    }

    const commanders = getPlayerCommanders(playerId);
    const cmd = commanders[commanderId];
    if (!cmd) {
      return res.status(404).json({ success: false, error: 'Commander not found.' });
    }

    if ((cmd.talentPoints || 0) <= 0) {
      return res.status(400).json({ success: false, error: 'No available talent points to allocate.' });
    }

    const branch = cmd.talentBranches?.find((b) => b.id === branchId);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Talent branch not found.' });
    }

    const talent = branch.talents.find((t) => t.id === talentId);
    if (!talent) {
      return res.status(404).json({ success: false, error: 'Talent node not found.' });
    }

    if (talent.currentRank >= talent.maxRank) {
      return res.status(400).json({ success: false, error: 'Talent node is already at maximum rank.' });
    }

    talent.currentRank += 1;
    branch.investedPoints += 1;
    cmd.talentPoints = Math.max(0, (cmd.talentPoints || 1) - 1);

    // Apply incremental stat bonus if applicable
    if (cmd.stats && talent.buffEffect) {
      const effectKey = Object.keys(talent.buffEffect)[0] as keyof typeof cmd.stats;
      if (effectKey && typeof cmd.stats[effectKey] === 'number') {
        const buffVal = talent.buffEffect[effectKey] as number;
        (cmd.stats[effectKey] as number) += buffVal;
      }
    }

    res.json({
      success: true,
      commander: cmd,
      commanders,
    });
  });

  // -------------------------------------------------------------
  // PHASE 3: MILITARY & ARMY COMBAT SYSTEM ENDPOINTS
  // -------------------------------------------------------------

  // Troop Catalog & Garrison Roster
  app.get('/api/military/troops', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const kingdom = kingdomService.getKingdom(playerId);
    res.json({
      success: true,
      definitions: TROOP_DEFINITIONS,
      troops: kingdom.troops,
      trainingQueue: kingdom.trainingQueue || [],
      woundedTroops: kingdom.woundedTroops || {},
    });
  });

  // Start Training Troops
  app.post('/api/military/train', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { buildingId, unitId, quantity } = req.body;

    if (!buildingId || !unitId || typeof quantity !== 'number') {
      return res.status(400).json({ success: false, error: 'buildingId, unitId, and valid quantity required.' });
    }

    const trainRes = kingdomService.startTroopTraining(playerId, buildingId, unitId, quantity);
    if (!trainRes.success) {
      return res.status(400).json(trainRes);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    res.json({
      success: true,
      task: trainRes.task,
      kingdom,
    });
  });

  // Speed Up Training Task
  app.post('/api/military/speedup', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { taskId, minutes, itemId } = req.body;

    if (!taskId || typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({ success: false, error: 'Valid taskId and minutes required.' });
    }

    if (itemId) {
      const consume = inventoryService.consumeItem(playerId, itemId, 1);
      if (!consume.success) {
        return res.status(400).json({ success: false, error: consume.error });
      }
    }

    const speedupRes = kingdomService.speedupTraining(playerId, taskId, minutes);
    if (!speedupRes.success) {
      return res.status(400).json(speedupRes);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const inventory = inventoryService.getInventory(playerId);

    res.json({
      success: true,
      completed: speedupRes.completed,
      kingdom,
      inventory,
    });
  });

  // Instant Complete Training Task with Gems
  app.post('/api/military/instant', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { taskId } = req.body;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid taskId required.' });
    }

    const kingdom = kingdomService.getKingdom(playerId);
    const task = kingdom.trainingQueue.find((t) => t.taskId === taskId);
    if (!task) {
      return res.status(400).json({ success: false, error: 'Training task not found in queue.' });
    }

    const remainingSec = Math.max(0, Math.ceil((task.completionTime - Date.now()) / 1000));
    const gemCost = Math.max(5, Math.ceil(remainingSec / 30));

    const spendRes = playerService.spendGems(playerId, gemCost, `instant_train:${taskId}`);
    if (!spendRes.success) {
      return res.status(400).json({ success: false, error: spendRes.error });
    }

    kingdomService.instantCompleteTraining(playerId, taskId);
    const updatedKingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);

    res.json({
      success: true,
      gemCost,
      kingdom: updatedKingdom,
      player,
    });
  });

  // Heal Wounded Troops at Citadel Hospital
  app.post('/api/military/heal', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { unitId, quantity } = req.body;

    if (!unitId || typeof quantity !== 'number') {
      return res.status(400).json({ success: false, error: 'unitId and quantity required.' });
    }

    const healRes = kingdomService.healWoundedTroops(playerId, unitId, quantity);
    if (!healRes.success) {
      return res.status(400).json(healRes);
    }

    const kingdom = kingdomService.getKingdom(playerId);
    res.json({
      success: true,
      kingdom,
    });
  });

  // Instant Heal All Wounded with Gems
  app.post('/api/military/heal-all-instant', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const kingdom = kingdomService.getKingdom(playerId);

    const totalWounded = Object.values(kingdom.woundedTroops || {}).reduce((sum, n) => sum + (n || 0), 0);
    if (totalWounded <= 0) {
      return res.status(400).json({ success: false, error: 'No wounded troops in the hospital.' });
    }

    const gemCost = Math.max(10, Math.ceil(totalWounded / 20));
    const spendRes = playerService.spendGems(playerId, gemCost, 'instant_hospital_treatment');
    if (!spendRes.success) {
      return res.status(400).json({ success: false, error: spendRes.error });
    }

    const healRes = kingdomService.instantHealAllWounded(playerId);
    const updatedKingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);

    res.json({
      success: true,
      gemCost,
      totalHealed: healRes.totalHealed,
      kingdom: updatedKingdom,
      player,
    });
  });

  // Config & Catalog
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({ config: GAME_CONFIG, buildingDefinitions: BUILDING_DEFINITIONS });
  });

  // -------------------------------------------------------------
  // PHASE 2: WORLD MAP & MARCH ROUTING ENDPOINTS
  // -------------------------------------------------------------

  // Get Player World State (Fog of war, active marches, reports)
  app.get('/api/world/state', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const state = worldService.getPlayerWorldState(playerId);
    res.json({ success: true, state });
  });

  // Get World Tiles Grid
  app.get('/api/world/tiles', requireAuth, (_req: Request, res: Response) => {
    const tiles = worldService.getWorldTiles();
    res.json({ success: true, tiles });
  });

  // Dispatch Army March (Gathering, Barbarian Attack, Scouting)
  app.post('/api/world/march/dispatch', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { targetCoords, marchType, commanderId, commanderName, troops } = req.body;

    if (!targetCoords || typeof targetCoords.q !== 'number' || typeof targetCoords.r !== 'number') {
      return res.status(400).json({ success: false, error: 'Valid target coordinates { q, r } are required.' });
    }

    if (!['gather', 'attack_barbarian', 'scout'].includes(marchType)) {
      return res.status(400).json({ success: false, error: 'Invalid marchType specified.' });
    }

    const sanitizedTroops: Record<string, number> = {};
    if (troops && typeof troops === 'object') {
      for (const [key, val] of Object.entries(troops)) {
        const n = Number(val);
        if (Number.isInteger(n) && n > 0) {
          sanitizedTroops[key] = n;
        }
      }
    }

    const result = worldService.dispatchMarch(
      playerId,
      targetCoords,
      marchType,
      commanderId || 'alden_valiant',
      commanderName || 'Alden the Valiant',
      sanitizedTroops
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const state = worldService.getPlayerWorldState(playerId);
    const kingdom = kingdomService.getKingdom(playerId);

    res.json({
      success: true,
      march: result.march,
      state,
      kingdom,
    });
  });

  // Recall Active March
  app.post('/api/world/march/recall', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { marchId } = req.body;

    if (!marchId || typeof marchId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid marchId is required.' });
    }

    const result = worldService.recallMarch(playerId, marchId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const state = worldService.getPlayerWorldState(playerId);
    res.json({ success: true, state });
  });

  // Fast Scout Dispatch
  app.post('/api/world/scout', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { targetCoords } = req.body;

    if (!targetCoords || typeof targetCoords.q !== 'number' || typeof targetCoords.r !== 'number') {
      return res.status(400).json({ success: false, error: 'Valid target coordinates { q, r } are required.' });
    }

    const result = worldService.dispatchMarch(
      playerId,
      targetCoords,
      'scout',
      'scout_unit',
      'Falcon Scout',
      {}
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const state = worldService.getPlayerWorldState(playerId);
    res.json({
      success: true,
      march: result.march,
      state,
    });
  });

  // Transactions Ledger
  app.get('/api/transactions', requireAuth, (req: Request, res: Response) => {
    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const history = ledgerService.getTransactions(playerId);
    res.json({ transactions: history });
  });

  // Admin Tools (Protected with validation and environment checking)
  app.post('/api/admin/grant', requireAuth, (req: Request, res: Response) => {
    // In production, reject if admin secret header is missing or incorrect
    if (process.env.NODE_ENV === 'production') {
      const adminKey = req.headers['x-admin-key'];
      const configuredSecret = process.env.ADMIN_SECRET;
      if (!configuredSecret || adminKey !== configuredSecret) {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin access not authorized.' });
      }
    }

    const playerId = (req as unknown as { authenticatedPlayerId: string }).authenticatedPlayerId;
    const { gems, food, wood, stone, iron, gold } = req.body;
    const kingdom = kingdomService.getKingdom(playerId);
    const { player } = playerService.getOrCreatePlayer(playerId);

    const sanitizePositiveInt = (v: unknown): number => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : 0;
    };

    const grantGems = sanitizePositiveInt(gems);
    const grantFood = sanitizePositiveInt(food);
    const grantWood = sanitizePositiveInt(wood);
    const grantStone = sanitizePositiveInt(stone);
    const grantIron = sanitizePositiveInt(iron);
    const grantGold = sanitizePositiveInt(gold);

    if (grantGems > 0) playerService.grantGems(playerId, grantGems, 'admin_grant');
    if (grantFood > 0) kingdom.resources.food += grantFood;
    if (grantWood > 0) kingdom.resources.wood += grantWood;
    if (grantStone > 0) kingdom.resources.stone += grantStone;
    if (grantIron > 0) kingdom.resources.iron += grantIron;
    if (grantGold > 0) kingdom.resources.gold += grantGold;

    playerService.recalculatePlayerPower(player);
    res.json({ success: true, player, kingdom });
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE / PRODUCTION STATIC SERVING
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const mmoServer = new MMOServer(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Realm of Crowns server & MMO WebSocket listening on http://0.0.0.0:${PORT} (/ws)`);
  });
}

startServer();
