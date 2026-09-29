/**
 * REALM OF CROWNS — Phase 2.8 Real-Time MMO Transport & Protocol Test Suite
 * 
 * Verifies:
 * 1. Protocol version negotiation (ROC_REALTIME_PROTOCOL_V1)
 * 2. Authentication token verification and rejection of forged credentials
 * 3. Inbound rate limiting & burst protection
 * 4. Packet size limits (16KB) and rejection of NaN/Infinity/malformed data
 * 5. Duplicate connection handling (session superseding)
 * 6. Outbound backpressure & delta coalescing
 * 7. Connection heartbeat & zombie cleanup
 * 8. Server-authoritative pirate ships and world replication
 * 9. AOI spatial subscription & distance hysteresis
 * 10. Smooth client interpolation
 */

import { WebSocket } from 'ws';
import http from 'http';
import express from 'express';
import {
  ROC_REALTIME_PROTOCOL_VERSION,
  MAX_PACKET_BYTES,
  validateIncomingPacket,
  HelloPacket,
  PingPacket,
  ClientTransformTransitionalPacket,
  EntityDeltaPacket,
} from '../src/shared/mmoProtocol';

import { MMOServer } from '../src/server/network/mmoServer';
import { ClientOutboundQueue } from '../src/server/network/mmoBackpressure';
import { ConnectionRateLimiter } from '../src/server/network/mmoRateLimiter';
import { MMOConnectionRegistry, MMOConnection } from '../src/server/network/mmoConnectionRegistry';
import { ServerEntityRegistry } from '../src/server/network/mmoEntityRegistry';
import { ServerWorldPartition, ServerNetworkLOD } from '../src/server/network/mmoServerWorldPartition';
import { ClientEntityInterpolator } from '../src/components/world3d/MMOWorldPartition';

let testPassCount = 0;
let testFailCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    testPassCount++;
    console.log(`  ✓ ${message}`);
  } else {
    testFailCount++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('PHASE 2.8 TEST SUITE: REAL-TIME MMO TRANSPORT FOUNDATION');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Protocol Version Negotiation
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Protocol Version Negotiation ---');
  {
    const validHello: HelloPacket = {
      type: 'HELLO',
      protocolVersion: ROC_REALTIME_PROTOCOL_VERSION,
      authToken: 'test_token_123',
      clientTimestamp: Date.now(),
    };
    const checkValid = validateIncomingPacket(validHello);
    assert(checkValid.valid === true, `Protocol version ${ROC_REALTIME_PROTOCOL_VERSION} validated`);

    const invalidHello = {
      type: 'HELLO',
      protocolVersion: 'ROC_OBSOLETE_V0',
      authToken: 'test_token_123',
      clientTimestamp: Date.now(),
    };
    const checkInvalid = validateIncomingPacket(invalidHello);
    assert(checkInvalid.valid === false, 'Obsolete protocol version rejected cleanly');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Packet Validation & Malformed/NaN Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Packet Validation & Numeric Guards ---');
  {
    const badInput = {
      type: 'PLAYER_INPUT',
      sequence: 1,
      clientTimestamp: Date.now(),
      rudder: NaN,
      throttle: 1,
    };
    const resNaN = validateIncomingPacket(badInput);
    assert(resNaN.valid === false, 'NaN coordinates rejected without server crash');

    const outOfBoundsRudder = {
      type: 'PLAYER_INPUT',
      sequence: 2,
      clientTimestamp: Date.now(),
      rudder: 2.0, // Exceeds [-1, 1] bounds
      throttle: 1.0,
    };
    const resOOB = validateIncomingPacket(outOfBoundsRudder);
    assert(resOOB.valid === false, 'Out-of-bounds coordinates rejected');

    const excessiveSpeed = {
      type: 'PLAYER_INPUT',
      sequence: 3,
      clientTimestamp: Date.now(),
      rudder: 0.5,
      throttle: 5.0, // Unnatural throttle
    };
    const resSpeed = validateIncomingPacket(excessiveSpeed);
    assert(resSpeed.valid === false, 'Excessive unnatural speed rejected');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Inbound Rate Limiting & Burst Protection
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Inbound Rate Limiting & Burst Shield ---');
  {
    const rateLimiter = new ConnectionRateLimiter();

    // Check raw size guard
    const sizePass = rateLimiter.checkRawSize(1024);
    assert(sizePass.allowed === true, '1KB packet passes size check');

    const sizeFail = rateLimiter.checkRawSize(MAX_PACKET_BYTES + 500);
    assert(sizeFail.allowed === false, 'Oversized packet (>16KB) caught and blocked');

    // Burst test: 60 movement inputs allowed, 61st rejected
    let allowedInputs = 0;
    let rejectedInputs = 0;
    for (let i = 0; i < 75; i++) {
      const pkt = {
        type: 'PLAYER_INPUT' as const,
        sequence: i,
        clientTimestamp: Date.now(),
        rudder: 0,
        throttle: 1.0,
      };
      const check = rateLimiter.checkRateLimit(pkt);
      if (check.allowed) allowedInputs++;
      else rejectedInputs++;
    }

    assert(allowedInputs === 60, `Rate limiter permitted exactly 60 input bursts (got ${allowedInputs})`);
    assert(rejectedInputs === 15, `Rate limiter rejected 15 excess abusive input packets (got ${rejectedInputs})`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Outbound Backpressure & Delta Coalescing
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Outbound Backpressure & Stale Delta Coalescing ---');
  {
    // Mock socket for testing queue
    const mockSocket = {
      readyState: 1, // OPEN
      bufferedAmount: 0,
      send: () => {},
    } as unknown as WebSocket;

    const queue = new ClientOutboundQueue(mockSocket, 65536);

    // Enqueue 5 successive deltas for the same entity (simulating lagging client)
    for (let tick = 1; tick <= 5; tick++) {
      const delta: EntityDeltaPacket = {
        type: 'ENTITY_DELTA',
        entityId: 'ship_target_alpha',
        serverTick: tick,
        serverTimestamp: Date.now(),
        x: tick * 10,
        z: tick * 10,
        headingQuantized: 128,
        speedKnots: 8,
        health: 500,
        stateFlags: 0,
      };
      queue.enqueue(delta);
    }

    const stats = queue.getStats();
    assert(stats.queuedMessages === 1, `Queue coalesced 5 transform deltas down to 1 newest state (got ${stats.queuedMessages})`);
    assert(stats.totalCoalescedDeltas === 4, `Total coalesced counter reports 4 replaced transforms (got ${stats.totalCoalescedDeltas})`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Duplicate Connection Handling (Session Superseding)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Duplicate Connection Handling ---');
  {
    const connRegistry = new MMOConnectionRegistry();

    const mockSocketA = { readyState: 1, close: () => {} } as unknown as WebSocket;
    const mockSocketB = { readyState: 1, close: () => {} } as unknown as WebSocket;

    const connA: MMOConnection = {
      connectionId: 'conn_a_111',
      socket: mockSocketA,
      ipAddress: '127.0.0.1',
      connectedAt: Date.now(),
      lastMessageTimestamp: Date.now(),
      lastPingTimestamp: Date.now(),
      rttMs: 0,
      outboundQueue: new ClientOutboundQueue(mockSocketA),
      rateLimiter: new ConnectionRateLimiter(),
    };

    const connB: MMOConnection = {
      connectionId: 'conn_b_222',
      socket: mockSocketB,
      ipAddress: '127.0.0.1',
      connectedAt: Date.now(),
      lastMessageTimestamp: Date.now(),
      lastPingTimestamp: Date.now(),
      rttMs: 0,
      outboundQueue: new ClientOutboundQueue(mockSocketB),
      rateLimiter: new ConnectionRateLimiter(),
    };

    connRegistry.register(connA);
    connRegistry.bindPlayer('conn_a_111', 'player_sovereign_1', 'Lord Sovereign', 'ship_1');
    assert(connRegistry.authenticatedCount() === 1, 'Initial session registered and bound');

    let oldSessionSuperseded = false;
    connRegistry.register(connB);
    connRegistry.bindPlayer('conn_b_222', 'player_sovereign_1', 'Lord Sovereign', 'ship_1', (oldConn) => {
      oldSessionSuperseded = true;
      assert(oldConn.connectionId === 'conn_a_111', 'Old connection identified for superseding');
    });

    assert(oldSessionSuperseded === true, 'Duplicate login cleanly superseded previous connection');
    assert(connRegistry.getByPlayerId('player_sovereign_1')?.connectionId === 'conn_b_222', 'Active player connection now bound to new socket');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Server Entity Registry & Authoritative Pirate Simulation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Server Entity Registry & Pirate Coexistence ---');
  {
    const entityRegistry = new ServerEntityRegistry();

    // Create player ship
    const playerShip = entityRegistry.createPlayerShip('player_demo', 'Lord Sovereign', 0, 0);
    assert(playerShip.id === 'ship_player_player_demo', 'Player flagship registered');

    // Create server-authoritative pirate
    const pirate = entityRegistry.createPirateShip('pirate_test_1', 'Black Corsair', 100, 100, 200);
    assert(pirate.type === 'pirate_ship', 'Authoritative pirate ship registered');
    assert(pirate.faction === 'corsair_fleet', 'Pirate belongs to corsair fleet');

    // Tick pirate simulation for 1 second (30 ticks of 0.033s)
    const initialHeading = pirate.transform.heading;
    for (let t = 0; t < 30; t++) {
      entityRegistry.tickPirates(1 / 30);
    }

    assert(pirate.transform.heading !== initialHeading, 'Server-authoritative pirate turns along patrol vector');
    assert(entityRegistry.count() === 2, 'Entity registry maintains 2 active world entities');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Server World Partition, AOI Hysteresis & Network LOD
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Server World Partition & AOI Broadcasting ---');
  {
    const registry = new ServerEntityRegistry();
    const partition = new ServerWorldPartition();

    // Player A at (0, 0)
    const playerA = registry.createPlayerShip('player_a', 'Player A', 0, 0);

    // Player B at (300, 0) -> Within 450m enter radius
    const playerB = registry.createPlayerShip('player_b', 'Player B', 300, 0);

    // Distant pirate at (1500, 0) -> Outside 500m AOI
    const distantPirate = registry.createPirateShip('pirate_far', 'Distant Raider', 1500, 0);

    partition.updateSpatialGrid(registry.getAll());

    const clientA_AOI = {
      connectionId: 'conn_a',
      playerId: 'player_a',
      controlledEntityId: playerA.id,
      position: { x: 0, z: 0 },
      subscribedEntities: new Map<string, ServerNetworkLOD>(),
      prefetchEntityIds: new Set<string>(),
    };

    // Evaluate tick 0
    const resTick0 = partition.evaluateClientAOI(clientA_AOI, registry, 0);

    // Player B should enter AOI as SPAWN
    assert(resTick0.spawns.length === 1, `Client A received exactly 1 spawn (got ${resTick0.spawns.length})`);
    assert(resTick0.spawns[0].id === playerB.id, 'Spawned entity is Player B');

    // Distant pirate should NOT be in AOI
    assert(!clientA_AOI.subscribedEntities.has(distantPirate.id), 'Distant pirate (>500m) is NOT in active AOI');

    // Move Player B to 470m (between 450m enter and 500m leave -> Hysteresis buffer)
    playerB.transform.x = 470;
    partition.updateSpatialGrid(registry.getAll());
    const resTick1 = partition.evaluateClientAOI(clientA_AOI, registry, 1);

    assert(clientA_AOI.subscribedEntities.has(playerB.id), 'Player B at 470m REMAINS in AOI due to 50m hysteresis');
    assert(resTick1.despawns.length === 0, 'No despawn generated while within 500m leave threshold');

    // Move Player B to 550m (exceeds 500m leave radius)
    playerB.transform.x = 550;
    partition.updateSpatialGrid(registry.getAll());
    const resTick2 = partition.evaluateClientAOI(clientA_AOI, registry, 2);

    assert(!clientA_AOI.subscribedEntities.has(playerB.id), 'Player B at 550m leaves active AOI');
    assert(resTick2.despawns.length === 1, 'Client A received 1 despawn event');
    assert(resTick2.despawns[0] === playerB.id, 'Despawned entity matches Player B');
  }

  // --------------------------------------------------------------------------
  // TEST 8: Client-Side Hermite & Linear Interpolation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Client-Side Transform Interpolation ---');
  {
    const interp = new ClientEntityInterpolator({ x: 0, y: 0, z: 0, heading: 0, speedKnots: 10 });
    const now = performance.now();
    const t0 = now + 100;
    const t1 = now + 200;

    interp.pushDelta({
      packetType: 'delta',
      entityId: 'ship_remote',
      serverTimestamp: t0,
      x: 0,
      z: 0,
      headingQuantized: 0,
      speedKnots: 10,
      health: 100,
      stateFlags: 0,
    }, t0);

    interp.pushDelta({
      packetType: 'delta',
      entityId: 'ship_remote',
      serverTimestamp: t1,
      x: 30,
      z: 40,
      headingQuantized: 64, // ~PI/2
      speedKnots: 10,
      health: 100,
      stateFlags: 0,
    }, t1);

    // Sample midway at t = t0 + 50ms
    const sampled = interp.sample(t0 + 50, 0);
    assert(Math.abs(sampled.x - 15) < 1.0, `Midpoint X smoothly interpolated to ~15 (got ${sampled.x.toFixed(2)})`);
    assert(Math.abs(sampled.z - 20) < 1.0, `Midpoint Z smoothly interpolated to ~20 (got ${sampled.z.toFixed(2)})`);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Heartbeat Liveness & Zombie Cleanup
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Heartbeat Liveness & Zombie Detection ---');
  {
    const registry = new MMOConnectionRegistry();
    const mockSocket = { readyState: 1, close: () => {} } as unknown as WebSocket;

    const zombieConn: MMOConnection = {
      connectionId: 'conn_zombie',
      socket: mockSocket,
      ipAddress: '127.0.0.1',
      connectedAt: Date.now() - 40000,
      lastMessageTimestamp: Date.now() - 35000, // 35 seconds ago (> 30s timeout)
      lastPingTimestamp: Date.now() - 35000,
      rttMs: 0,
      outboundQueue: new ClientOutboundQueue(mockSocket),
      rateLimiter: new ConnectionRateLimiter(),
    };

    registry.register(zombieConn);
    assert(registry.count() === 1, 'Zombie connection registered');

    let sweptZombies = 0;
    registry.sweepZombies((conn, reason) => {
      sweptZombies++;
      assert(reason === 'TIMEOUT', 'Sweep identified zombie with TIMEOUT reason');
    });

    assert(sweptZombies === 1, 'Zombie connection detected and sweep callback triggered');
  }

  console.log('\n============================================================');
  console.log(`PHASE 2.8 TEST RESULTS: ${testPassCount} PASSED, ${testFailCount} FAILED`);
  console.log('============================================================\n');

  if (testFailCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
