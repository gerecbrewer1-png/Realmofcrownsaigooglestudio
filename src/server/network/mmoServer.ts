/**
 * REALM OF CROWNS — Real-Time MMO WebSocket Server Engine
 * Phase 2.8 MMO Architecture
 * 
 * Mounts onto the existing Express HTTP server on port 3000 at path /ws.
 * Coordinates connection authentication, AOI replication, Network LOD (NET0-NET5),
 * bounded backpressure, rate limiting, and server-authoritative pirate ships.
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

import {
  ROC_REALTIME_PROTOCOL_VERSION,
  MAX_PACKET_BYTES,
  MMOPacket,
  HelloPacket,
  AuthOkPacket,
  AuthErrorPacket,
  AuthRefreshPacket,
  PingPacket,
  PongPacket,
  DisconnectReasonPacket,
  EntitySpawnPacket,
  EntityDespawnPacket,
  EntityDeltaPacket,
  PlayerInputPacket,
  FireRequestPacket,
  FireConfirmedPacket,
  DamageEventPacket,
  ShipDefeatedPacket,
  quantizeHeading,
  validateIncomingPacket,
  DisconnectReasonCode,
} from '../../shared/mmoProtocol';

import { MMOConnectionRegistry, MMOConnection } from './mmoConnectionRegistry';
import { ServerEntityRegistry } from './mmoEntityRegistry';
import { ServerWorldPartition } from './mmoServerWorldPartition';
import { ClientOutboundQueue } from './mmoBackpressure';
import { ConnectionRateLimiter } from './mmoRateLimiter';
import { MMOMetricsCollector, MMOMetricsSnapshot } from './mmoMetrics';
import { playerService } from '../services/playerService';
import { getFirebaseAdmin, isTestEnv } from '../firebaseAdmin';

export class MMOServer {
  private wss: WebSocketServer;
  private connections: MMOConnectionRegistry;
  private entityRegistry: ServerEntityRegistry;
  private worldPartition: ServerWorldPartition;
  private metrics: MMOMetricsCollector;

  private tickInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private serverTick = 0;
  private isRunning = false;

  private readonly TICK_RATE_HZ = 30;
  private readonly TICK_MS = 1000 / 30; // 33.33ms

  constructor(httpServer: HttpServer) {
    this.connections = new MMOConnectionRegistry();
    this.entityRegistry = new ServerEntityRegistry();
    this.worldPartition = new ServerWorldPartition();
    this.metrics = new MMOMetricsCollector();

    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      maxPayload: MAX_PACKET_BYTES,
    });

    this.setupWebSocketServer();
    this.initializeAuthoritativeWorld();
    this.startTickLoop();
  }

  /**
   * Spawns initial server-authoritative pirate ships and world entities.
   */
  private initializeAuthoritativeWorld(): void {
    // Spawns 4 server-authoritative pirate ships in active sea sectors
    this.entityRegistry.createPirateShip('pirate_black_skull', 'Black Skull Corsair', 150, 180, 200);
    this.entityRegistry.createPirateShip('pirate_crimson_blade', 'Crimson Blade', -220, 140, 220);
    this.entityRegistry.createPirateShip('pirate_shadow_brig', 'Shadow Brigantine', 280, -300, 250);
    this.entityRegistry.createPirateShip('pirate_iron_raider', 'Iron Raider', -350, -220, 240);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket, req) => {
      const connectionId = crypto.randomUUID();
      const ipAddress = req.socket.remoteAddress || '127.0.0.1';

      const connection: MMOConnection = {
        connectionId,
        socket,
        ipAddress,
        connectedAt: Date.now(),
        lastMessageTimestamp: Date.now(),
        lastPingTimestamp: Date.now(),
        rttMs: 0,
        outboundQueue: new ClientOutboundQueue(socket),
        rateLimiter: new ConnectionRateLimiter(),
      };

      this.connections.register(connection);

      socket.on('message', (raw: Buffer | string) => {
        this.handleSocketMessage(connection, raw);
      });

      socket.on('close', () => {
        this.handleSocketDisconnect(connection, 'CLIENT_REQUESTED');
      });

      socket.on('error', (err) => {
        this.handleSocketDisconnect(connection, 'CLIENT_REQUESTED');
      });
    });
  }

  /**
   * Validates and processes an incoming message frame.
   */
  private handleSocketMessage(conn: MMOConnection, raw: Buffer | string): void {
    const now = Date.now();
    conn.lastMessageTimestamp = now;
    this.metrics.totalMessagesReceived++;

    const byteLen = typeof raw === 'string' ? Buffer.byteLength(raw, 'utf8') : raw.length;
    this.metrics.totalBytesReceived += byteLen;

    // 1. Raw Byte Size Guard
    const sizeCheck = conn.rateLimiter.checkRawSize(byteLen);
    if (!sizeCheck.allowed) {
      this.metrics.totalMalformedPackets++;
      this.sendDisconnect(conn, 'MALFORMED_PACKET', sizeCheck.error || 'Oversized packet');
      return;
    }

    // 2. Safe JSON Parsing
    let parsed: unknown;
    try {
      const str = typeof raw === 'string' ? raw : raw.toString('utf8');
      parsed = JSON.parse(str);
    } catch (e) {
      this.metrics.totalMalformedPackets++;
      this.sendDisconnect(conn, 'MALFORMED_PACKET', 'Invalid JSON encoding');
      return;
    }

    // 3. Schema & Bounds Validation
    const validation = validateIncomingPacket(parsed);
    if (!validation.valid || !validation.packet) {
      this.metrics.totalMalformedPackets++;
      this.sendDisconnect(conn, 'MALFORMED_PACKET', validation.error || 'Validation failed');
      return;
    }

    const packet = validation.packet;

    // 4. Inbound Rate Limiting
    const rateCheck = conn.rateLimiter.checkRateLimit(packet);
    if (!rateCheck.allowed) {
      this.metrics.totalRateLimitRejects++;
      // Send error packet without immediately killing socket unless abuse continues
      this.sendPacket(conn, {
        type: 'ERROR',
        code: 'RATE_LIMIT',
        message: rateCheck.error || 'Rate limit exceeded',
      });
      return;
    }

    // 5. Packet Dispatch
    this.dispatchPacket(conn, packet);
  }

  /**
   * Routes validated packet to specific subsystem.
   */
  private dispatchPacket(conn: MMOConnection, packet: MMOPacket): void {
    switch (packet.type) {
      case 'HELLO':
        this.handleHello(conn, packet as HelloPacket);
        break;

      case 'PING':
        this.handlePing(conn, packet as PingPacket);
        break;

      case 'PLAYER_INPUT':
        this.handlePlayerInput(conn, packet as PlayerInputPacket);
        break;

      case 'FIRE_REQUEST':
        this.handleFireRequest(conn, packet as FireRequestPacket);
        break;

      case 'LEAVE_WORLD':
        this.handleSocketDisconnect(conn, 'CLIENT_REQUESTED');
        break;

      case 'AUTH_REFRESH':
        this.handleAuthRefresh(conn, packet as AuthRefreshPacket);
        break;
    }
  }

  /**
   * Processes validated player inputs for server-authoritative movement.
   */
  private handlePlayerInput(conn: MMOConnection, packet: PlayerInputPacket): void {
    if (!conn.authenticatedPlayerId) return;
    
    const entity = this.entityRegistry.getByPlayerId(conn.authenticatedPlayerId);
    if (!entity || !entity.inputs) return;

    // Apply client intents to the authoritative entity
    entity.inputs.rudder = packet.rudder;
    entity.inputs.throttle = packet.throttle;
    entity.lastProcessedInputSequence = packet.sequence;
    entity.lastUpdateTimestamp = Date.now();
  }

  private handleFireRequest(conn: MMOConnection, packet: FireRequestPacket): void {
    if (!conn.authenticatedPlayerId) return;
    
    const entity = this.entityRegistry.getByPlayerId(conn.authenticatedPlayerId);
    if (!entity || entity.health <= 0) return;

    const now = Date.now();
    const isPort = packet.broadside === 'port';
    const RELOAD_MS = 5000; // 5 seconds reload

    if (isPort) {
      if (entity.portReloadTimestamp && now - entity.portReloadTimestamp < RELOAD_MS) return;
      entity.portReloadTimestamp = now;
    } else {
      if (entity.starboardReloadTimestamp && now - entity.starboardReloadTimestamp < RELOAD_MS) return;
      entity.starboardReloadTimestamp = now;
    }
    
    const broadsideDir = isPort ? -Math.PI / 2 : Math.PI / 2;
    const fireAngle = entity.transform.heading + broadsideDir;
    
    const spread = (Math.random() - 0.5) * 0.1; 
    const finalAngle = fireAngle + spread;
    
    const velocityKnots = 100; // ~51 m/s
    const vx = Math.sin(finalAngle) * velocityKnots * 0.514444;
    const vz = Math.cos(finalAngle) * velocityKnots * 0.514444;
    
    // Spawn 3 cannonballs slightly offset
    const projectileIds: string[] = [];
    for(let i = 0; i < 3; i++) {
       const offsetZ = (i - 1) * 2;
       const p = this.entityRegistry.createProjectile(
         entity.id, 
         entity.transform.x + Math.sin(entity.transform.heading)*offsetZ, 
         entity.transform.z + Math.cos(entity.transform.heading)*offsetZ, 
         vx, 
         vz
       );
       projectileIds.push(p.id);
    }
    
    const confirmPkt: FireConfirmedPacket = {
      type: 'FIRE_CONFIRMED',
      sourceEntityId: entity.id,
      broadside: packet.broadside,
      projectileIds,
      serverTimestamp: Date.now()
    };
    
    // Broadcast fire event to AOI (or all clients for now, ideally just those nearby)
    this.broadcastToAOI(entity.transform.x, entity.transform.z, 1000, confirmPkt);
  }

  private broadcastToAOI(x: number, z: number, radius: number, packet: MMOPacket): void {
    const radSq = radius * radius;
    for (const c of this.connections.getAll()) {
      if (!c.authenticatedPlayerId) continue;
      const playerEnt = this.entityRegistry.getByPlayerId(c.authenticatedPlayerId);
      if (playerEnt) {
        const dx = playerEnt.transform.x - x;
        const dz = playerEnt.transform.z - z;
        if (dx*dx + dz*dz <= radSq) {
          this.sendPacket(c, packet);
          c.outboundQueue.flush();
        }
      }
    }
  }

  /**
   * Handles client authentication and assigns an authoritative ship.
   */
  private async handleHello(conn: MMOConnection, packet: HelloPacket): Promise<void> {
    // Protocol Version Handshake
    if (packet.protocolVersion !== ROC_REALTIME_PROTOCOL_VERSION) {
      const authErr: AuthErrorPacket = {
        type: 'AUTH_ERROR',
        code: 'INCOMPATIBLE_PROTOCOL',
        message: `Expected protocol ${ROC_REALTIME_PROTOCOL_VERSION}, got ${packet.protocolVersion}`,
        serverTimestamp: Date.now(),
      };
      this.sendPacket(conn, authErr);
      this.sendDisconnect(conn, 'INCOMPATIBLE_PROTOCOL', authErr.message);
      return;
    }

    // Authenticate token:
    const token = packet.authToken.trim();
    const stripped = token.startsWith('Bearer ') ? token.slice(7).trim() : token;

    let playerId: string | null = null;

    try {
      if (isTestEnv() && stripped.startsWith('test_voyager_')) {
        // Explicitly isolated TEST-ONLY path for synthetic clients
        playerId = stripped;
      } else {
        // Production Firebase ID-token verification
        if (!stripped) throw new Error('Missing token');
        const adminApp = getFirebaseAdmin();
        const authService = typeof (adminApp as any).auth === 'function' 
          ? (adminApp as any).auth() 
          : (await import('firebase-admin/auth')).getAuth(adminApp);
        const decodedToken = await authService.verifyIdToken(stripped);
        playerId = decodedToken.uid;
      }
    } catch (error) {
      console.warn('[AUTH FAILED] Token verification failed:', error);
      const authErr: AuthErrorPacket = {
        type: 'AUTH_ERROR',
        code: 'AUTH_FAILED',
        message: 'Invalid, malformed, or expired authentication credentials.',
        serverTimestamp: Date.now(),
      };
      this.sendPacket(conn, authErr);
      this.sendDisconnect(conn, 'AUTH_FAILED', authErr.message);
      return;
    }

    if (!playerId) return;

    // Bootstrap or fetch player profile
    const { player } = playerService.getOrCreatePlayer(playerId, 'Sovereign Lord');
    const playerName = player.displayName || 'Lord Sovereign';

    // Retrieve or spawn authoritative player flagship
    const ship = this.entityRegistry.createPlayerShip(playerId, playerName, 0, 0);

    // Bind connection in registry with duplicate session replacement
    this.connections.bindPlayer(
      conn.connectionId,
      playerId,
      playerName,
      ship.id,
      (supersededConn) => {
        // Disconnect old duplicate connection cleanly
        this.sendDisconnect(
          supersededConn,
          'SUPERSEDED',
          'A new session connected with your player credentials.'
        );
      }
    );

    // Reply with AUTH_OK
    const authOk: AuthOkPacket = {
      type: 'AUTH_OK',
      playerId,
      entityId: ship.id,
      serverTickRate: this.TICK_RATE_HZ,
      serverTimestamp: Date.now(),
      assignedTransform: { ...ship.transform },
    };
    this.sendPacket(conn, authOk);
  }

  private async handleAuthRefresh(conn: MMOConnection, packet: AuthRefreshPacket): Promise<void> {
    if (!conn.authenticatedPlayerId) return;

    const token = packet.authToken.trim();
    const stripped = token.startsWith('Bearer ') ? token.slice(7).trim() : token;
    let refreshedId: string | null = null;

    try {
      if (isTestEnv() && stripped.startsWith('test_voyager_')) {
        refreshedId = stripped;
      } else {
        if (!stripped) throw new Error('Missing token');
        const adminApp = getFirebaseAdmin();
        const authService = typeof (adminApp as any).auth === 'function' 
          ? (adminApp as any).auth() 
          : (await import('firebase-admin/auth')).getAuth(adminApp);
        const decodedToken = await authService.verifyIdToken(stripped);
        refreshedId = decodedToken.uid;
      }
    } catch (error) {
      console.warn('[AUTH REFRESH FAILED] Token verification failed:', error);
      return; // Silently fail the refresh; heartbeat will eventually catch them if it expires completely
    }

    if (refreshedId !== conn.authenticatedPlayerId) {
      console.warn(`[AUTH] Player ID mismatch during refresh. Expected ${conn.authenticatedPlayerId}, got ${refreshedId}`);
      this.sendDisconnect(conn, 'AUTH_FAILED', 'Authentication identity changed during active session.');
      return;
    }
    // Token is valid and matches the connected user.
  }

  private handlePing(conn: MMOConnection, packet: PingPacket): void {
    const now = Date.now();
    conn.rttMs = Math.max(0, now - packet.clientTimestamp);
    conn.lastPingTimestamp = now;

    const pong: PongPacket = {
      type: 'PONG',
      clientTimestamp: packet.clientTimestamp,
      serverTimestamp: now,
      sequence: packet.sequence,
    };
    this.sendPacket(conn, pong);
  }


  private handleSocketDisconnect(conn: MMOConnection, reason: DisconnectReasonCode): void {
    this.connections.unregister(conn.connectionId);

    // If player had a ship, despawn or keep dormant
    if (conn.controlledEntityId) {
      this.entityRegistry.remove(conn.controlledEntityId);
    }

    try {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.close();
      }
    } catch (_) {}
  }

  public sendPacket(conn: MMOConnection, packet: MMOPacket): boolean {
    const queued = conn.outboundQueue.enqueue(packet);
    if (queued) {
      this.metrics.totalMessagesSent++;
    }
    return queued;
  }

  public sendDisconnect(conn: MMOConnection, code: DisconnectReasonCode, message: string): void {
    const reasonPkt: DisconnectReasonPacket = {
      type: 'DISCONNECT_REASON',
      code,
      message,
    };
    this.sendPacket(conn, reasonPkt);
    conn.outboundQueue.flush();
    setTimeout(() => {
      try {
        conn.socket.close();
      } catch (_) {}
    }, 50);
  }

  /**
   * Main 30 Hz server replication tick loop.
   */
  private startTickLoop(): void {
    this.isRunning = true;
    let lastTickTime = performance.now();

    this.tickInterval = setInterval(() => {
      const now = performance.now();
      const dtSec = (now - lastTickTime) / 1000;
      lastTickTime = now;
      this.serverTick++;

      this.executeTick(dtSec);
    }, this.TICK_MS);

    // Heartbeat & zombie sweeper (every 5 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.connections.sweepZombies((conn, reason) => {
        this.sendDisconnect(conn, reason, 'Connection timed out due to heartbeat inactivity.');
      });
    }, 5000);
  }

  private executeTick(dtSec: number): void {
    // 1. Tick server-authoritative entities
    this.entityRegistry.tickPirates(dtSec);
    this.entityRegistry.tickPlayers(dtSec);
    
    // 1.5 Tick projectiles and resolve damage
    const projMetrics = this.entityRegistry.tickProjectiles(
      dtSec,
      (x, z, r) => this.worldPartition.getCandidateEntitiesForProjectile(x, z, r),
      (projectile, target) => {
        // Apply damage
      const damageAmt = 15;
      target.health -= damageAmt;
      const isFatal = target.health <= 0;
      if (isFatal) {
         target.health = 0;
         target.stateFlags |= 2; // set sinking flag
      }
      
      const dmgEvent: DamageEventPacket = {
        type: 'DAMAGE_EVENT',
        targetEntityId: target.id,
        sourceEntityId: projectile.sourceEntityId || 'unknown',
        damage: damageAmt,
        remainingHealth: target.health,
        isFatal,
        serverTimestamp: Date.now(),
      };
      this.broadcastToAOI(target.transform.x, target.transform.z, 1000, dmgEvent);

      if (isFatal) {
        const defeatPkt: ShipDefeatedPacket = {
          type: 'SHIP_DEFEATED',
          entityId: target.id,
          serverTimestamp: Date.now(),
        };
        this.broadcastToAOI(target.transform.x, target.transform.z, 1000, defeatPkt);
      }
    });

    // Update projectile metrics
    this.metrics.activeProjectiles = projMetrics.active;
    this.metrics.avgCandidatesChecked = projMetrics.avgCandidates;
    this.metrics.maxCandidatesChecked = projMetrics.maxCandidates;
    this.metrics.broadphaseCpuMs = projMetrics.broadphaseMs;
    this.metrics.preciseCpuMs = projMetrics.narrowphaseMs;
    this.metrics.totalProjectileCleanups += projMetrics.cleanups;

    // 2. Update server spatial grid
    const allEntities = this.entityRegistry.getAll();
    this.worldPartition.updateSpatialGrid(allEntities);

    // 3. Evaluate AOI & dispatch replication packets per connection
    const activeConnections = this.connections.getAll();
    const serverTimestamp = Date.now();

    for (const conn of activeConnections) {
      if (!conn.aoiState || !conn.authenticatedPlayerId) {
        conn.outboundQueue.flush();
        continue;
      }

      this.metrics.totalAOIQueries++;
      const aoiResult = this.worldPartition.evaluateClientAOI(
        conn.aoiState,
        this.entityRegistry,
        this.serverTick
      );

      // A. Deliver Entity Spawns
      for (const spawnEntity of aoiResult.spawns) {
        const spawnPkt: EntitySpawnPacket = {
          type: 'ENTITY_SPAWN',
          entityId: spawnEntity.id,
          entityType: spawnEntity.type,
          ownerPlayerId: spawnEntity.ownerPlayerId,
          name: spawnEntity.name,
          faction: spawnEntity.faction,
          transform: { ...spawnEntity.transform },
          health: spawnEntity.health,
          maxHealth: spawnEntity.maxHealth,
          visualConfig: spawnEntity.visualConfig,
          networkLOD: conn.aoiState.subscribedEntities.get(spawnEntity.id) || 0,
          stateFlags: spawnEntity.stateFlags,
          serverTimestamp,
        };
        this.sendPacket(conn, spawnPkt);
      }

      // B. Deliver Entity Despawns
      for (const despawnId of aoiResult.despawns) {
        const despawnPkt: EntityDespawnPacket = {
          type: 'ENTITY_DESPAWN',
          entityId: despawnId,
          reason: 'out_of_aoi',
          serverTimestamp,
        };
        this.sendPacket(conn, despawnPkt);
      }

      // C. Deliver Entity Transform Deltas (NET0 - NET4) for remote entities
      const playerEntity = this.entityRegistry.getByPlayerId(conn.authenticatedPlayerId);
      for (const item of aoiResult.activeDeltas) {
        const ent = item.entity;
        // Skip player's own entity in Block C: self authoritative state is sent in Block D with sequence acknowledgement
        if (playerEntity && ent.id === playerEntity.id) continue;

        const deltaPkt: EntityDeltaPacket = {
          type: 'ENTITY_DELTA',
          entityId: ent.id,
          serverTick: this.serverTick,
          serverTimestamp,
          x: Math.round(ent.transform.x * 10) / 10,
          z: Math.round(ent.transform.z * 10) / 10,
          headingQuantized: quantizeHeading(ent.transform.heading),
          speedKnots: Math.round(ent.transform.speedKnots * 10) / 10,
          health: ent.health,
          stateFlags: ent.stateFlags,
        };
        this.sendPacket(conn, deltaPkt);
        this.metrics.totalEntityDeltasSent++;
      }

      // D. Send Player's Own Authoritative State for Reconciliation (Phase 2.9)
      if (playerEntity) {
        const selfDeltaPkt: EntityDeltaPacket = {
          type: 'ENTITY_DELTA',
          entityId: playerEntity.id,
          serverTick: this.serverTick,
          serverTimestamp,
          x: Math.round(playerEntity.transform.x * 10) / 10,
          z: Math.round(playerEntity.transform.z * 10) / 10,
          headingQuantized: quantizeHeading(playerEntity.transform.heading),
          speedKnots: Math.round(playerEntity.transform.speedKnots * 10) / 10,
          health: playerEntity.health,
          stateFlags: playerEntity.stateFlags,
          lastProcessedInputSequence: playerEntity.lastProcessedInputSequence,
          exactX: playerEntity.transform.x,
          exactZ: playerEntity.transform.z,
          exactHeading: playerEntity.transform.heading,
        };
        this.sendPacket(conn, selfDeltaPkt);
      }

      // E. Flush outbound queue under backpressure rules
      conn.outboundQueue.flush();
    }
  }

  public getMetrics(): MMOMetricsSnapshot {
    return this.metrics.getSnapshot(
      this.connections.count(),
      this.connections.authenticatedCount(),
      this.entityRegistry.count(),
      this.serverTick
    );
  }

  public getEntityRegistry(): ServerEntityRegistry {
    return this.entityRegistry;
  }

  public getConnectionRegistry(): MMOConnectionRegistry {
    return this.connections;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connections.clear();
    this.wss.close();
  }
}
