/**
 * REALM OF CROWNS — MMO Connection Registry & Session Lifecycle
 * Phase 2.8 MMO Architecture
 * 
 * Manages active WebSocket connections, authentication states, heartbeat liveness,
 * duplicate session superseding, and clean resource teardown.
 */

import { WebSocket } from 'ws';
import { ClientOutboundQueue } from './mmoBackpressure';
import { ConnectionRateLimiter } from './mmoRateLimiter';
import { ClientAOIState, ServerNetworkLOD } from './mmoServerWorldPartition';
import { DisconnectReasonCode, HEARTBEAT_TIMEOUT_MS } from '../../shared/mmoProtocol';

export interface MMOConnection {
  connectionId: string;
  socket: WebSocket;
  authenticatedPlayerId?: string;
  controlledEntityId?: string;
  playerName?: string;
  ipAddress: string;
  connectedAt: number;
  lastMessageTimestamp: number;
  lastPingTimestamp: number;
  rttMs: number;
  outboundQueue: ClientOutboundQueue;
  rateLimiter: ConnectionRateLimiter;
  aoiState?: ClientAOIState;
}

export class MMOConnectionRegistry {
  private connections: Map<string, MMOConnection> = new Map(); // connectionId -> MMOConnection
  private playerConnectionMap: Map<string, string> = new Map(); // playerId -> connectionId

  public register(connection: MMOConnection): void {
    this.connections.set(connection.connectionId, connection);
  }

  public get(connectionId: string): MMOConnection | undefined {
    return this.connections.get(connectionId);
  }

  public getByPlayerId(playerId: string): MMOConnection | undefined {
    const connId = this.playerConnectionMap.get(playerId);
    if (!connId) return undefined;
    return this.connections.get(connId);
  }

  public getAll(): MMOConnection[] {
    return Array.from(this.connections.values());
  }

  public count(): number {
    return this.connections.size;
  }

  public authenticatedCount(): number {
    return this.playerConnectionMap.size;
  }

  /**
   * Associates an authenticated player identity with this connection.
   * If the player already has an active connection, the older connection is SUPERSEDED!
   */
  public bindPlayer(
    connectionId: string,
    playerId: string,
    playerName: string,
    controlledEntityId: string,
    onSuperseded?: (oldConn: MMOConnection) => void
  ): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;

    // Check if player is already logged in on another socket
    const existingConnId = this.playerConnectionMap.get(playerId);
    if (existingConnId && existingConnId !== connectionId) {
      const oldConn = this.connections.get(existingConnId);
      if (oldConn && oldConn.socket.readyState === WebSocket.OPEN) {
        if (onSuperseded) {
          onSuperseded(oldConn);
        }
      }
      this.connections.delete(existingConnId);
    }

    conn.authenticatedPlayerId = playerId;
    conn.playerName = playerName;
    conn.controlledEntityId = controlledEntityId;
    this.playerConnectionMap.set(playerId, connectionId);

    // Initialize AOI state for this client
    conn.aoiState = {
      connectionId,
      playerId,
      controlledEntityId,
      position: { x: 0, z: 0 },
      subscribedEntities: new Map<string, ServerNetworkLOD>(),
      prefetchEntityIds: new Set<string>(),
    };

    return true;
  }

  /**
   * Cleans up a connection upon disconnect or timeout.
   */
  public unregister(connectionId: string): MMOConnection | undefined {
    const conn = this.connections.get(connectionId);
    if (!conn) return undefined;

    if (conn.authenticatedPlayerId) {
      const boundConnId = this.playerConnectionMap.get(conn.authenticatedPlayerId);
      if (boundConnId === connectionId) {
        this.playerConnectionMap.delete(conn.authenticatedPlayerId);
      }
    }

    conn.outboundQueue.clear();
    this.connections.delete(connectionId);
    return conn;
  }

  /**
   * Sweeps connections for zombie sockets (no message received within HEARTBEAT_TIMEOUT_MS).
   */
  public sweepZombies(onZombieFound: (conn: MMOConnection, reason: DisconnectReasonCode) => void): void {
    const now = Date.now();
    for (const conn of this.connections.values()) {
      if (now - conn.lastMessageTimestamp > HEARTBEAT_TIMEOUT_MS) {
        onZombieFound(conn, 'TIMEOUT');
      }
    }
  }

  public clear(): void {
    for (const conn of this.connections.values()) {
      try {
        conn.socket.close();
      } catch (_) {}
    }
    this.connections.clear();
    this.playerConnectionMap.clear();
  }
}
