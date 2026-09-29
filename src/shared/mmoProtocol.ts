/**
 * REALM OF CROWNS — Real-Time MMO Transport Protocol Specification
 * Phase 2.8 MMO Architecture
 * 
 * Version: ROC_REALTIME_PROTOCOL_V1
 * 
 * Defines the bidirectional packet schema, packet families, serialization helpers,
 * rate limits, numeric bounds, and validation guards.
 */

export const ROC_REALTIME_PROTOCOL_VERSION = 'ROC_REALTIME_PROTOCOL_V1';

// Maximum packet payload size in bytes (16 KB)
export const MAX_PACKET_BYTES = 16384;

// Liveness & Heartbeat timing
export const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
export const HEARTBEAT_TIMEOUT_MS = 30000;  // 30 seconds connection zombie timeout

// Rate limit maximums
export const RATE_LIMIT_CONFIG = {
  maxTotalMessagesPerSec: 100, // Burst allowance
  maxMovementInputsPerSec: 60, // Max 60Hz input stream
  maxCombatRequestsPerSec: 15,
  maxHeartbeatsPerSec: 4,
};

// Numeric validation bounds
export const WORLD_BOUNDS = {
  minCoord: -50000,
  maxCoord: 50000,
  maxSpeedKnots: 40,
  minHealth: 0,
  maxHealth: 100000,
};

// ============================================================================
// 1. PACKET FAMILIES & TYPES
// ============================================================================

export type MMOPacketType =
  // Connection & Handshake
  | 'HELLO'
  | 'AUTH_OK'
  | 'AUTH_ERROR'
  | 'AUTH_REFRESH'
  | 'ENTER_WORLD'
  | 'LEAVE_WORLD'
  | 'PING'
  | 'PONG'
  | 'SERVER_TIME'
  | 'ERROR'
  | 'DISCONNECT_REASON'
  // Real-Time Replication
  | 'ENTITY_SPAWN'
  | 'ENTITY_DESPAWN'
  | 'ENTITY_STATE'
  | 'ENTITY_DELTA'
  | 'PLAYER_INPUT'
  // Combat Foundation (Prepared for Phase 2.9 Server Authority)
  | 'FIRE_REQUEST'
  | 'FIRE_CONFIRMED'
  | 'PROJECTILE_SPAWN'
  | 'DAMAGE_EVENT'
  | 'SHIP_DEFEATED';

export type MMOEntityType =
  | 'player_ship'
  | 'pirate_ship'
  | 'merchant_ship'
  | 'npc_ship'
  | 'projectile'
  | 'army'
  | 'player_character';

export type DisconnectReasonCode =
  | 'SUPERSEDED'
  | 'TIMEOUT'
  | 'AUTH_FAILED'
  | 'INCOMPATIBLE_PROTOCOL'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MALFORMED_PACKET'
  | 'SERVER_SHUTDOWN'
  | 'CLIENT_REQUESTED';

// ============================================================================
// 2. DATA SCHEMAS
// ============================================================================

export interface MMOVector3 {
  x: number;
  y: number;
  z: number;
}

export interface MMOEntityTransformData {
  x: number;
  y: number;
  z: number;
  heading: number; // in radians (0 = North)
  speedKnots: number;
}

export interface MMOShipVisualConfig {
  definitionId: string;
  culture: string;
  shipClass: 'sloop' | 'brigantine' | 'frigate' | 'galleon' | 'war_galleon';
  hullColor: string;
  sailColor: string;
  crestId?: string;
}

// ============================================================================
// 3. PACKET DEFINITIONS
// ============================================================================

export interface HelloPacket {
  type: 'HELLO';
  protocolVersion: string;
  authToken: string;
  clientTimestamp: number;
  clientVersion?: string;
}

export interface AuthOkPacket {
  type: 'AUTH_OK';
  playerId: string;
  entityId: string;
  serverTickRate: number; // e.g. 30 Hz
  serverTimestamp: number;
  assignedTransform: MMOEntityTransformData;
}

export interface AuthErrorPacket {
  type: 'AUTH_ERROR';
  code: string;
  message: string;
  serverTimestamp: number;
}

export interface AuthRefreshPacket {
  type: 'AUTH_REFRESH';
  authToken: string;
}

export interface EnterWorldPacket {
  type: 'ENTER_WORLD';
  preferredSpawnPosition?: MMOVector3;
  shipVisualConfig?: MMOShipVisualConfig;
}

export interface LeaveWorldPacket {
  type: 'LEAVE_WORLD';
  reason?: string;
}

export interface PingPacket {
  type: 'PING';
  clientTimestamp: number;
  sequence: number;
}

export interface PongPacket {
  type: 'PONG';
  clientTimestamp: number;
  serverTimestamp: number;
  sequence: number;
}

export interface ServerTimePacket {
  type: 'SERVER_TIME';
  serverTick: number;
  serverTimestamp: number;
}

export interface ErrorPacket {
  type: 'ERROR';
  code: string;
  message: string;
}

export interface DisconnectReasonPacket {
  type: 'DISCONNECT_REASON';
  code: DisconnectReasonCode;
  message: string;
}

export interface EntitySpawnPacket {
  type: 'ENTITY_SPAWN';
  entityId: string;
  entityType: MMOEntityType;
  ownerPlayerId?: string;
  name: string;
  faction: string;
  transform: MMOEntityTransformData;
  health: number;
  maxHealth: number;
  visualConfig?: MMOShipVisualConfig;
  networkLOD: number; // 0..5
  stateFlags: number; // Bitmask: bit 0 = combat, bit 1 = sinking, bit 2 = full sails
  serverTimestamp: number;
}

export interface EntityDespawnPacket {
  type: 'ENTITY_DESPAWN';
  entityId: string;
  reason: 'out_of_aoi' | 'destroyed' | 'disconnected';
  serverTimestamp: number;
}

export interface EntityStatePacket {
  type: 'ENTITY_STATE';
  entityId: string;
  transform: MMOEntityTransformData;
  health: number;
  stateFlags: number;
  serverTick: number;
  serverTimestamp: number;
}

/**
 * Compact high-frequency delta packet (~28-32 bytes equivalent)
 */
export interface EntityDeltaPacket {
  type: 'ENTITY_DELTA';
  entityId: string;
  serverTick: number;
  serverTimestamp: number;
  x: number;
  z: number;
  headingQuantized: number; // 0..255 (quantized heading byte)
  speedKnots: number;
  health: number;
  stateFlags: number;
  lastProcessedInputSequence?: number;
  exactX?: number;
  exactZ?: number;
  exactHeading?: number;
}

export interface PlayerInputPacket {
  type: 'PLAYER_INPUT';
  sequence: number;
  clientTimestamp: number;
  rudder: number;       // -1.0 (hard port) to +1.0 (hard starboard)
  throttle: number;     // 0.0 (anchor/idle) to 1.0 (full sails)
  desiredHeading?: number;
  fireSide?: 'broadside_port' | 'broadside_starboard' | 'none';
}


// Combat Foundation Packets (Phase 2.9 Prep)
export interface FireRequestPacket {
  type: 'FIRE_REQUEST';
  broadside: 'port' | 'starboard';
  clientTimestamp: number;
  targetEntityId?: string;
}

export interface FireConfirmedPacket {
  type: 'FIRE_CONFIRMED';
  sourceEntityId: string;
  broadside: 'port' | 'starboard';
  projectileIds: string[];
  serverTimestamp: number;
}

export interface ProjectileSpawnPacket {
  type: 'PROJECTILE_SPAWN';
  projectileId: string;
  sourceEntityId: string;
  origin: MMOVector3;
  velocity: MMOVector3;
  serverTimestamp: number;
}

export interface DamageEventPacket {
  type: 'DAMAGE_EVENT';
  targetEntityId: string;
  sourceEntityId: string;
  damage: number;
  remainingHealth: number;
  isFatal: boolean;
  serverTimestamp: number;
}

export interface ShipDefeatedPacket {
  type: 'SHIP_DEFEATED';
  entityId: string;
  killerEntityId?: string;
  serverTimestamp: number;
}

export type MMOPacket =
  | HelloPacket
  | AuthOkPacket
  | AuthErrorPacket
  | AuthRefreshPacket
  | EnterWorldPacket
  | LeaveWorldPacket
  | PingPacket
  | PongPacket
  | ServerTimePacket
  | ErrorPacket
  | DisconnectReasonPacket
  | EntitySpawnPacket
  | EntityDespawnPacket
  | EntityStatePacket
  | EntityDeltaPacket
  | PlayerInputPacket
  | FireRequestPacket
  | FireConfirmedPacket
  | ProjectileSpawnPacket
  | DamageEventPacket
  | ShipDefeatedPacket;

// ============================================================================
// 4. PACKET VALIDATION & GUARDS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  packet?: MMOPacket;
}

export function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);
}

export function isValidCoordinate(x: unknown, z: unknown): boolean {
  if (!isFiniteNumber(x) || !isFiniteNumber(z)) return false;
  return (
    x >= WORLD_BOUNDS.minCoord &&
    x <= WORLD_BOUNDS.maxCoord &&
    z >= WORLD_BOUNDS.minCoord &&
    z <= WORLD_BOUNDS.maxCoord
  );
}

export function quantizeHeading(headingRad: number): number {
  let norm = headingRad % (Math.PI * 2);
  if (norm < 0) norm += Math.PI * 2;
  return Math.round((norm / (Math.PI * 2)) * 255) & 0xff;
}

export function unquantizeHeading(quantizedByte: number): number {
  return ((quantizedByte & 0xff) / 255) * (Math.PI * 2);
}

export function validateIncomingPacket(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Packet must be an object' };
  }

  const p = raw as Partial<MMOPacket>;
  if (!p.type || typeof p.type !== 'string') {
    return { valid: false, error: 'Missing or invalid packet type' };
  }

  switch (p.type) {
    case 'HELLO': {
      const pkt = p as Partial<HelloPacket>;
      if (!pkt.protocolVersion || typeof pkt.protocolVersion !== 'string') {
        return { valid: false, error: 'HELLO: Missing protocolVersion' };
      }
      if (pkt.protocolVersion !== ROC_REALTIME_PROTOCOL_VERSION) {
        return { valid: false, error: `Incompatible protocol: expected ${ROC_REALTIME_PROTOCOL_VERSION}, got ${pkt.protocolVersion}` };
      }
      if (!pkt.authToken || typeof pkt.authToken !== 'string' || pkt.authToken.length < 3) {
        return { valid: false, error: 'HELLO: Missing or invalid authToken' };
      }
      return { valid: true, packet: p as MMOPacket };
    }

    case 'AUTH_REFRESH': {
      const pkt = p as Partial<AuthRefreshPacket>;
      if (!pkt.authToken || typeof pkt.authToken !== 'string' || pkt.authToken.length < 3) {
        return { valid: false, error: 'AUTH_REFRESH: Missing or invalid authToken' };
      }
      return { valid: true, packet: p as MMOPacket };
    }

    case 'PING': {
      const pkt = p as Partial<PingPacket>;
      if (!isFiniteNumber(pkt.clientTimestamp)) {
        return { valid: false, error: 'PING: Invalid clientTimestamp' };
      }
      return { valid: true, packet: p as MMOPacket };
    }

    case 'PONG': {
      return { valid: true, packet: p as MMOPacket };
    }

    case 'ENTER_WORLD': {
      const pkt = p as Partial<EnterWorldPacket>;
      if (pkt.preferredSpawnPosition) {
        if (!isValidCoordinate(pkt.preferredSpawnPosition.x, pkt.preferredSpawnPosition.z)) {
          return { valid: false, error: 'ENTER_WORLD: Coordinates out of world bounds' };
        }
      }
      return { valid: true, packet: p as MMOPacket };
    }

    case 'LEAVE_WORLD': {
      return { valid: true, packet: p as MMOPacket };
    }

    case 'PLAYER_INPUT': {
      const pkt = p as Partial<PlayerInputPacket>;
      if (!isFiniteNumber(pkt.rudder) || pkt.rudder < -1.0 || pkt.rudder > 1.0) {
        return { valid: false, error: 'PLAYER_INPUT: Rudder must be within [-1, 1]' };
      }
      if (!isFiniteNumber(pkt.throttle) || pkt.throttle < 0.0 || pkt.throttle > 1.0) {
        return { valid: false, error: 'PLAYER_INPUT: Throttle must be within [0, 1]' };
      }
      return { valid: true, packet: p as MMOPacket };
    }


    case 'FIRE_REQUEST': {
      const pkt = p as Partial<FireRequestPacket>;
      if (pkt.broadside !== 'port' && pkt.broadside !== 'starboard') {
        return { valid: false, error: 'FIRE_REQUEST: Invalid broadside side' };
      }
      return { valid: true, packet: p as MMOPacket };
    }

    default:
      // Valid packet type pass-through
      return { valid: true, packet: p as MMOPacket };
  }
}
