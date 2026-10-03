/**
 * REALM OF CROWNS — Client Real-Time MMO Network Bridge
 * Phase 2.8 MMO Architecture
 * 
 * Handles WebSocket connection, protocol negotiation, session authentication,
 * outbound throttled transforms/inputs, incoming AOI replication (SPAWN/DESPAWN/DELTA),
 * remote ship 3D mesh lifecycles, and smooth interpolation in Three.js.
 */

import * as THREE from 'three';
import {
  ROC_REALTIME_PROTOCOL_VERSION,
  MMOPacket,
  HelloPacket,
  AuthOkPacket,
  AuthErrorPacket,
  PingPacket,
  PongPacket,
  EntitySpawnPacket,
  EntityDespawnPacket,
  EntityDeltaPacket,
  PlayerInputPacket,
  DisconnectReasonPacket,
  unquantizeHeading,
  FireRequestPacket,
  FireConfirmedPacket,
  DamageEventPacket,
  ShipDefeatedPacket
} from '../../shared/mmoProtocol';

import { SnapshotBuffer } from '../../shared/movement/SnapshotBuffer';
import { MovementInputCommand, ShipSimulation, createDefaultShipSimulationState } from '../../shared/movement/index';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ShipVisualService, SHIP_CATALOG } from './shipVisualService';

export type NetworkConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface RemoteEntityDisplay {
  entityId: string;
  name: string;
  type: string;
  faction: string;
  group: THREE.Group;
  hullMesh?: THREE.Mesh;
  sailMeshes: THREE.Mesh[];
  interpolator: SnapshotBuffer;
  lastDeltaTimestamp: number;
  health: number;
  maxHealth: number;
  networkLOD: number;
}

export interface NetworkClientMetrics {
  state: NetworkConnectionState;
  pingMs: number;
  serverTick: number;
  remoteEntitiesCount: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  reconnectAttempts: number;
}

export interface PendingInput {
  sequence: number;
  rudder: number;
  throttle: number;
  dt: number;
  timestamp: number;
}

export interface ReconciliationMetrics {
  pendingInputCount: number;
  lastSentSequence: number;
  lastAcknowledgedSequence: number;
  predictionError: number;
  smoothCorrectionsPerSec: number;
  hardSnapsPerSec: number;
}

export class VoyageNetworkClient {
  private socket: WebSocket | null = null;
  private wsUrl: string;
  private authToken: string;
  private scene: THREE.Scene;

  private state: NetworkConnectionState = 'DISCONNECTED';
  private assignedPlayerId: string | null = null;
  private controlledEntityId: string | null = null;
  private serverTickRate = 30;
  private serverTimeOffset = 0; // serverTimestamp - clientTimestamp
  private latestServerTick = 0;

  // Combat Events Queue for React/Three.js to consume
  private combatEventQueue: MMOPacket[] = [];

  // Remote replicated entities
  private remoteEntities: Map<string, RemoteEntityDisplay> = new Map();

  // Phase 2.9: Server-Authoritative reconciliation state
  private authoritativePlayerState: {
    x: number;
    z: number;
    heading: number;
    speedKnots: number;
    serverTick: number;
    lastProcessedInputSequence?: number;
  } | null = null;

  // Pending inputs & acknowledgement history (bounded)
  private pendingInputs: PendingInput[] = [];
  private lastAcknowledgedSequence = -1;
  private predictionError = 0;
  private smoothCorrectionCount = 0;
  private hardSnapCount = 0;
  private smoothCorrectionsPerSec = 0;
  private hardSnapsPerSec = 0;
  private lastCorrectionRateTimestamp = performance.now();
  private recentSmoothCount = 0;
  private recentHardCount = 0;

  // Throttled client send state (30 Hz = 33.3ms)
  private lastSendTimestamp = 0;
  private readonly SEND_INTERVAL_MS = 33.33;
  private static readonly SIMULATION_DT = 1 / 30; // 0.033333s
  private inputSequence = 0;

  // Heartbeat & Ping
  private pingInterval: any = null;
  private pingSequence = 0;
  private pingMs = 0;

  // Reconnection
  private reconnectAttempts = 0;
  private reconnectTimeout: any = null;
  private isDestroyed = false;

  // Telemetry metrics
  private messagesReceived = 0;
  private messagesSent = 0;
  private bytesReceived = 0;
  private bytesSent = 0;

  // Shared reusable geometries & materials for remote ships
  private static sharedHullGeometry: THREE.BufferGeometry | null = null;
  private static sharedSailGeometry: THREE.BufferGeometry | null = null;
  private static sharedMastGeometry: THREE.BufferGeometry | null = null;
  private static playerHullMat: THREE.Material | null = null;
  private static pirateHullMat: THREE.Material | null = null;
  private static mastMat: THREE.Material | null = null;
  private static sailMat: THREE.Material | null = null;
  private static pirateSailMat: THREE.Material | null = null;

  constructor(scene: THREE.Scene, authToken: string, customWsUrl?: string) {
    this.scene = scene;
    this.authToken = authToken;

    if (customWsUrl) {
      this.wsUrl = customWsUrl;
    } else {
      const loc = typeof window !== 'undefined' ? window.location : null;
      const protocol = loc && loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = loc ? loc.host : 'localhost:3000';
      this.wsUrl = `${protocol}//${host}/ws`;
    }

    VoyageNetworkClient.initSharedMeshes();
  }

  private static initSharedMeshes(): void {
    if (!VoyageNetworkClient.sharedHullGeometry) {
      // Procedural streamlined hull geometry for remote ships
      VoyageNetworkClient.sharedHullGeometry = new THREE.BoxGeometry(4.0, 3.2, 14.0);
      
      const loader = new GLTFLoader();
      loader.load('/assets/models/ship-light.glb', (gltf) => {
        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.name.toLowerCase().includes('hull')) {
            VoyageNetworkClient.sharedHullGeometry = child.geometry;
          }
        });
        if (VoyageNetworkClient.sharedHullGeometry instanceof THREE.BoxGeometry) {
          gltf.scene.traverse((child: any) => {
            if (child.isMesh && VoyageNetworkClient.sharedHullGeometry instanceof THREE.BoxGeometry) {
              VoyageNetworkClient.sharedHullGeometry = child.geometry;
            }
          });
        }
      }, undefined, (error) => {
        console.warn('Failed to load shared fleet hull, falling back to procedural BoxGeometry.', error);
      });
    }
    if (!VoyageNetworkClient.sharedSailGeometry) {
      VoyageNetworkClient.sharedSailGeometry = new THREE.PlaneGeometry(6.0, 7.5);
    }
    if (!VoyageNetworkClient.sharedMastGeometry) {
      VoyageNetworkClient.sharedMastGeometry = new THREE.CylinderGeometry(0.2, 0.3, 14.0, 8);
    }
    if (!VoyageNetworkClient.playerHullMat) {
      VoyageNetworkClient.playerHullMat = new THREE.MeshLambertMaterial({ color: 0x2b394a });
    }
    if (!VoyageNetworkClient.pirateHullMat) {
      VoyageNetworkClient.pirateHullMat = new THREE.MeshLambertMaterial({ color: 0x221111 });
    }
    if (!VoyageNetworkClient.mastMat) {
      VoyageNetworkClient.mastMat = new THREE.MeshLambertMaterial({ color: 0x3d2716 });
    }
    if (!VoyageNetworkClient.sailMat) {
      VoyageNetworkClient.sailMat = new THREE.MeshLambertMaterial({ color: 0xf4ecd8, side: THREE.DoubleSide });
    }
    if (!VoyageNetworkClient.pirateSailMat) {
      VoyageNetworkClient.pirateSailMat = new THREE.MeshLambertMaterial({ color: 0x6a1b1a, side: THREE.DoubleSide });
    }
  }

  public connect(): void {
    if (this.isDestroyed || this.state === 'CONNECTED' || this.state === 'CONNECTING') {
      return;
    }

    this.state = this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING';

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.state = 'CONNECTING';
        this.sendHello();
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        this.handleDisconnect();
      };

      this.socket.onerror = () => {
        this.handleDisconnect();
      };
    } catch (err) {
      this.handleDisconnect();
    }
  }

  private sendHello(): void {
    const hello: HelloPacket = {
      type: 'HELLO',
      protocolVersion: ROC_REALTIME_PROTOCOL_VERSION,
      authToken: this.authToken,
      clientTimestamp: Date.now(),
    };
    this.sendPacket(hello);
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.state === 'CONNECTED') {
        const ping: PingPacket = {
          type: 'PING',
          clientTimestamp: Date.now(),
          sequence: ++this.pingSequence,
        };
        this.sendPacket(ping);
      }
    }, 5000);
  }

  private handleMessage(raw: any): void {
    this.messagesReceived++;
    const str = typeof raw === 'string' ? raw : raw.toString();
    this.bytesReceived += str.length;

    try {
      const packet = JSON.parse(str) as MMOPacket;
      switch (packet.type) {
        case 'AUTH_OK': {
          const p = packet as AuthOkPacket;
          this.assignedPlayerId = p.playerId;
          this.controlledEntityId = p.entityId;
          this.serverTickRate = p.serverTickRate;
          this.serverTimeOffset = p.serverTimestamp - Date.now();
          this.state = 'CONNECTED';
          break;
        }

        case 'AUTH_ERROR': {
          this.state = 'DISCONNECTED';
          break;
        }

        case 'PONG': {
          const p = packet as PongPacket;
          this.pingMs = Math.max(0, Date.now() - p.clientTimestamp);
          break;
        }

        case 'ENTITY_SPAWN': {
          this.handleEntitySpawn(packet as EntitySpawnPacket);
          break;
        }

        case 'ENTITY_DESPAWN': {
          this.handleEntityDespawn(packet as EntityDespawnPacket);
          break;
        }

        case 'ENTITY_DELTA': {
          this.handleEntityDelta(packet as EntityDeltaPacket);
          break;
        }

        case 'DISCONNECT_REASON': {
          break;
        }

        case 'FIRE_CONFIRMED':
        case 'DAMAGE_EVENT':
        case 'SHIP_DEFEATED': {
          this.combatEventQueue.push(packet);
          break;
        }
      }
    } catch (err) {
      // Malformed packet pass-through
    }
  }

  private handleEntitySpawn(pkt: EntitySpawnPacket): void {
    // Avoid creating a duplicate visual mesh for our own ship or local fleet
    if (pkt.entityId === this.controlledEntityId) return;
    if ((pkt as any).playerId && (pkt as any).playerId === this.assignedPlayerId) return;
    if (pkt.entityId.startsWith('player_')) return;
    
    // Ignore local template ships to avoid ghost duplicates
    if (pkt.entityId === 'p1' || pkt.entityId === 'p2' || pkt.entityId === 's1' || pkt.entityId === 'j1' || pkt.entityId === 'j2' || pkt.entityId === 'g1' || pkt.entityId === 'd1' || pkt.entityId === 'f1' || pkt.entityId === 'f2') {
      return;
    }

    // Phase 2.9: Projectiles are invisible server-side objects for collision
    if (pkt.entityType === 'projectile') return;

    // Remove existing if already present
    if (this.remoteEntities.has(pkt.entityId)) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: pkt.entityId, reason: 'out_of_aoi', serverTimestamp: pkt.serverTimestamp });
    }

    const group = new THREE.Group();
    group.name = `remote_ship_${pkt.entityId}`;
    group.position.set(pkt.transform.x, pkt.transform.y, pkt.transform.z);
    group.rotation.y = pkt.transform.heading;

    // Render using authentic GLTF ship models (NO procedural brown box / quad sail)
    const isPirate = pkt.entityType === 'pirate_ship' || pkt.faction === 'pirates';
    const spec = SHIP_CATALOG[pkt.entityType] || (isPirate ? SHIP_CATALOG.brig : SHIP_CATALOG.galleon);
    const shipModel = ShipVisualService.createShipMesh(spec, isPirate, (pkt.faction as any) || (isPirate ? 'pirates' : 'sovereign'));
    group.add(shipModel);

    this.scene.add(group);

    const interpolator = new SnapshotBuffer(15);
    interpolator.pushSnapshot({
      entityId: pkt.entityId,
      serverTick: (pkt as any).serverTick ?? 0,
      serverTimestamp: pkt.serverTimestamp,
      x: pkt.transform.x,
      y: pkt.transform.y ?? 0,
      z: pkt.transform.z,
      heading: pkt.transform.heading,
      speedKnots: pkt.transform.speedKnots,
      health: pkt.health,
    });

    this.remoteEntities.set(pkt.entityId, {
      entityId: pkt.entityId,
      name: pkt.name,
      type: pkt.entityType,
      faction: pkt.faction,
      group,
      hullMesh: undefined,
      sailMeshes: [],
      interpolator,
      lastDeltaTimestamp: performance.now(),
      health: pkt.health,
      maxHealth: pkt.maxHealth,
      networkLOD: pkt.networkLOD,
    });
  }

  private handleEntityDespawn(pkt: EntityDespawnPacket): void {
    const entry = this.remoteEntities.get(pkt.entityId);
    if (!entry) return;

    this.scene.remove(entry.group);

    // Shared geometries and materials are not disposed here

    this.remoteEntities.delete(pkt.entityId);
  }

  private handleEntityDelta(pkt: EntityDeltaPacket): void {
    this.latestServerTick = Math.max(this.latestServerTick, pkt.serverTick);
    
    // Capture authoritative state for local player reconciliation
    if (pkt.entityId === this.controlledEntityId) {
      const ackSeq = typeof pkt.lastProcessedInputSequence === 'number' && Number.isFinite(pkt.lastProcessedInputSequence)
        ? pkt.lastProcessedInputSequence
        : -1;

      // Discard acknowledged inputs <= ackSeq
      if (ackSeq >= 0) {
        this.lastAcknowledgedSequence = ackSeq;
        this.pendingInputs = this.pendingInputs.filter((inp) => inp.sequence > ackSeq);
      }

      const rawX = pkt.exactX ?? pkt.x;
      const rawZ = pkt.exactZ ?? pkt.z;
      const rawHeading = pkt.exactHeading ?? unquantizeHeading(pkt.headingQuantized);
      const rawSpeed = pkt.speedKnots;

      if (Number.isFinite(rawX) && Number.isFinite(rawZ) && Number.isFinite(rawHeading) && Number.isFinite(rawSpeed)) {
        this.authoritativePlayerState = {
          x: rawX,
          z: rawZ,
          heading: rawHeading,
          speedKnots: rawSpeed,
          serverTick: pkt.serverTick,
          lastProcessedInputSequence: ackSeq,
        };
      }
      return;
    }

    const entry = this.remoteEntities.get(pkt.entityId);
    if (!entry) return;

    entry.lastDeltaTimestamp = performance.now();
    entry.health = pkt.health;

    // Push into SnapshotBuffer
    entry.interpolator.pushSnapshot({
      entityId: pkt.entityId,
      serverTick: pkt.serverTick,
      serverTimestamp: pkt.serverTimestamp,
      x: pkt.x,
      y: 0,
      z: pkt.z,
      heading: unquantizeHeading(pkt.headingQuantized),
      speedKnots: pkt.speedKnots,
      health: pkt.health,
      stateFlags: pkt.stateFlags,
    });
  }

  /**
   * Called every frame in the Three.js render loop.
   * Interpolates remote entities smoothly at 60 FPS.
   */
  public update(_deltaTimeSec: number): void {
    const now = performance.now();
    const estimatedServerTime = Date.now() + this.serverTimeOffset;

    for (const remote of this.remoteEntities.values()) {
      const transform = remote.interpolator.sample(estimatedServerTime, 120);
      if (transform) {
        remote.group.position.x = transform.x;
        remote.group.position.z = transform.z;
        remote.group.rotation.y = transform.heading;

        // Subtle roll with speed
        const rollAngle = Math.sin(now * 0.003) * 0.04 * (transform.speedKnots / 10);
        remote.group.rotation.z = rollAngle;
      }
    }
  }

  /**
   * Phase 18: Transmits explicit MovementInputCommand from the PlayerMovementController.
   */
  public sendMovementCommand(cmd: MovementInputCommand): void {
    if (this.state !== 'CONNECTED' || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = performance.now();
    if (now - this.lastSendTimestamp < this.SEND_INTERVAL_MS) {
      return;
    }
    this.lastSendTimestamp = now;

    const seq = this.inputSequence++;
    const inputPkt: PlayerInputPacket = {
      type: 'PLAYER_INPUT',
      sequence: seq,
      clientTimestamp: Date.now(),
      rudder: cmd.rudderTarget,
      throttle: cmd.sailSettingTarget,
    };
    this.sendPacket(inputPkt);

    // Save pending input for prediction replay (bounded to 120 entries)
    this.pendingInputs.push({
      sequence: seq,
      rudder: cmd.rudderTarget,
      throttle: cmd.sailSettingTarget,
      dt: VoyageNetworkClient.SIMULATION_DT,
      timestamp: now,
    });
    if (this.pendingInputs.length > 120) {
      this.pendingInputs.shift();
    }
  }

  public sendFireRequest(broadside: 'port' | 'starboard', targetId?: string): void {
    const pkt: FireRequestPacket = {
      type: 'FIRE_REQUEST',
      broadside,
      clientTimestamp: Date.now(),
      targetEntityId: targetId
    };
    this.sendPacket(pkt);
  }

  public getControlledEntityId(): string | null {
    return this.controlledEntityId;
  }

  public popCombatEvents(): MMOPacket[] {
    const events = [...this.combatEventQueue];
    this.combatEventQueue = [];
    return events;
  }

  public getAuthoritativePlayerState() {
    return this.authoritativePlayerState;
  }

  public getPendingInputCount(): number {
    return this.pendingInputs.length;
  }

  public getLastAcknowledgedSequence(): number {
    return this.lastAcknowledgedSequence;
  }

  public getReconciliationMetrics(): ReconciliationMetrics {
    return {
      pendingInputCount: this.pendingInputs.length,
      lastSentSequence: Math.max(0, this.inputSequence - 1),
      lastAcknowledgedSequence: this.lastAcknowledgedSequence,
      predictionError: this.predictionError,
      smoothCorrectionsPerSec: this.smoothCorrectionsPerSec,
      hardSnapsPerSec: this.hardSnapsPerSec,
    };
  }

  /**
   * Reconciles current client prediction against server authoritative snapshot by replaying unacknowledged inputs.
   */
  public reconcilePlayerState(
    currentPos: { x: number; z: number },
    currentHeading: number,
    currentSpeed: number,
    dt: number,
    profile: { baseSpeed: number; turnRate: number; maxHealth: number } = { baseSpeed: 12.0, turnRate: 18.0, maxHealth: 500 },
    health = 500
  ): {
    x: number;
    z: number;
    heading: number;
    speedKnots: number;
    predictionError: number;
    tier: 'tiny' | 'small' | 'moderate' | 'severe';
  } {
    // Safety check inputs
    const validCurrentX = Number.isFinite(currentPos?.x) ? currentPos.x : 0;
    const validCurrentZ = Number.isFinite(currentPos?.z) ? currentPos.z : 0;
    const validCurrentHeading = Number.isFinite(currentHeading) ? currentHeading : 0;
    const validCurrentSpeed = Number.isFinite(currentSpeed) ? currentSpeed : 0;
    const validDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0.033;

    if (
      !this.authoritativePlayerState ||
      !Number.isFinite(this.authoritativePlayerState.x) ||
      !Number.isFinite(this.authoritativePlayerState.z) ||
      !Number.isFinite(this.authoritativePlayerState.heading) ||
      !Number.isFinite(this.authoritativePlayerState.speedKnots)
    ) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    const safeBaseSpeed = profile && Number.isFinite(profile.baseSpeed) && profile.baseSpeed > 0 ? profile.baseSpeed : 12.0;
    const safeTurnRate = profile && Number.isFinite(profile.turnRate) && profile.turnRate > 0 ? profile.turnRate : 18.0;
    const safeMaxHealth = profile && Number.isFinite(profile.maxHealth) && profile.maxHealth > 0 ? profile.maxHealth : 500;
    const safeHealth = Number.isFinite(health) ? health : safeMaxHealth;

    // 1. Replay unacknowledged pending inputs on top of authoritative snapshot via deterministic ShipSimulation.step
    let simState = createDefaultShipSimulationState({
      x: this.authoritativePlayerState.x,
      z: this.authoritativePlayerState.z,
      heading: this.authoritativePlayerState.heading,
      speedKnots: this.authoritativePlayerState.speedKnots,
      baseSpeed: safeBaseSpeed,
      turnRate: safeTurnRate,
      maxHull: safeMaxHealth,
      hull: safeHealth,
      maxSails: safeMaxHealth > 0 ? safeMaxHealth * 0.2 : 100,
      sails: safeHealth > 0 ? safeHealth * 0.2 : 100,
    });

    for (const inp of this.pendingInputs) {
      if (!inp || !Number.isFinite(inp.throttle) || !Number.isFinite(inp.rudder) || !Number.isFinite(inp.dt)) continue;
      const cmd: MovementInputCommand = {
        sequence: inp.sequence,
        clientTick: inp.sequence,
        timestamp: inp.timestamp,
        dt: VoyageNetworkClient.SIMULATION_DT,
        rudderTarget: inp.rudder,
        sailSettingTarget: inp.throttle,
        braking: false,
        reverse: false,
        rudder: inp.rudder,
        sailSetting: inp.throttle,
      };
      simState = ShipSimulation.step(simState, cmd, VoyageNetworkClient.SIMULATION_DT);
    }

    const simX = simState.x;
    const simZ = simState.z;
    const simHeading = simState.heading;
    const simSpeed = simState.speedKnots;

    // Safety fallback if simulation produced non-finite values
    if (!Number.isFinite(simX) || !Number.isFinite(simZ) || !Number.isFinite(simHeading) || !Number.isFinite(simSpeed)) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    // 2. Measure prediction error (divergence from replayed authority)
    const err = Math.hypot(validCurrentX - simX, validCurrentZ - simZ);
    this.predictionError = Number.isFinite(err) ? err : 0;

    // 3. Update rate counters
    const now = performance.now();
    const elapsedSec = (now - this.lastCorrectionRateTimestamp) / 1000;
    if (elapsedSec >= 1.0) {
      this.smoothCorrectionsPerSec = this.recentSmoothCount / elapsedSec;
      this.hardSnapsPerSec = this.recentHardCount / elapsedSec;
      this.recentSmoothCount = 0;
      this.recentHardCount = 0;
      this.lastCorrectionRateTimestamp = now;
    }

    // Shortest-path angular interpolation helper
    const angleLerp = (from: number, to: number, alpha: number): number => {
      let diff = to - from;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let res = from + diff * Math.min(1, Math.max(0, alpha));
      if (res > Math.PI * 2) res -= Math.PI * 2;
      if (res < 0) res += Math.PI * 2;
      return res;
    };

    // 4. Apply error tiers
    let tier: 'tiny' | 'small' | 'moderate' | 'severe' = 'tiny';
    let resX = validCurrentX;
    let resZ = validCurrentZ;
    let resHeading = validCurrentHeading;
    let resSpeed = validCurrentSpeed;

    if (err < 0.10) {
      // Tiny error (< 0.10m): ignore to prevent transform oscillation
      tier = 'tiny';
      resX = validCurrentX;
      resZ = validCurrentZ;
      resHeading = validCurrentHeading;
      resSpeed = validCurrentSpeed;
    } else if (err < 0.50) {
      // Small error: smooth convergence into the < 0.10m deadband
      tier = 'small';
      const blend = Math.min(1.0, validDt * 5.0);
      resX = THREE.MathUtils.lerp(validCurrentX, simX, blend);
      resZ = THREE.MathUtils.lerp(validCurrentZ, simZ, blend);
      resHeading = angleLerp(validCurrentHeading, simHeading, blend);
      resSpeed = THREE.MathUtils.lerp(validCurrentSpeed, simSpeed, blend);
      this.recentSmoothCount++;
    } else if (err < 3.0) {
      // Moderate error: faster correction
      tier = 'moderate';
      resX = THREE.MathUtils.lerp(validCurrentX, simX, validDt * 8.0);
      resZ = THREE.MathUtils.lerp(validCurrentZ, simZ, validDt * 8.0);
      resHeading = angleLerp(validCurrentHeading, simHeading, validDt * 8.0);
      resSpeed = THREE.MathUtils.lerp(validCurrentSpeed, simSpeed, validDt * 6.0);
      this.recentSmoothCount++;
    } else {
      // Severe / impossible divergence: hard snap
      tier = 'severe';
      resX = simX;
      resZ = simZ;
      resHeading = simHeading;
      resSpeed = simSpeed;
      this.recentHardCount++;
    }

    if (!Number.isFinite(resX) || !Number.isFinite(resZ) || !Number.isFinite(resHeading) || !Number.isFinite(resSpeed)) {
      return {
        x: validCurrentX,
        z: validCurrentZ,
        heading: validCurrentHeading,
        speedKnots: validCurrentSpeed,
        predictionError: 0,
        tier: 'tiny',
      };
    }

    return {
      x: resX,
      z: resZ,
      heading: resHeading,
      speedKnots: resSpeed,
      predictionError: this.predictionError,
      tier,
    };
  }

  public sendPacket(packet: MMOPacket): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const json = JSON.stringify(packet);
      this.socket.send(json);
      this.messagesSent++;
      this.bytesSent += json.length;
      return true;
    } catch (_) {
      return false;
    }
  }

  private handleDisconnect(): void {
    if (this.isDestroyed) return;
    this.state = 'DISCONNECTED';

    // Cleanup ping
    if (this.pingInterval) clearInterval(this.pingInterval);

    // Clear remote entities
    for (const [id] of this.remoteEntities) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: id, reason: 'disconnected', serverTimestamp: Date.now() });
    }

    // Exponential backoff reconnect: 1s, 2s, 4s, up to 10s
    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts - 1));

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public getMetrics(): NetworkClientMetrics {
    return {
      state: this.state,
      pingMs: this.pingMs,
      serverTick: this.latestServerTick,
      remoteEntitiesCount: this.remoteEntities.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public getRemoteEntities(): Map<string, RemoteEntityDisplay> {
    return this.remoteEntities;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    if (this.socket) {
      try {
        this.socket.close();
      } catch (_) {}
      this.socket = null;
    }

    // Clean up meshes
    for (const [id] of this.remoteEntities) {
      this.handleEntityDespawn({ type: 'ENTITY_DESPAWN', entityId: id, reason: 'disconnected', serverTimestamp: Date.now() });
    }
  }
}
