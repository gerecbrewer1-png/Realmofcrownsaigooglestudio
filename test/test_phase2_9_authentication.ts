import { MMOServer } from '../src/server/network/mmoServer';
import WebSocket from 'ws';
import http from 'http';
import { HelloPacket, ROC_REALTIME_PROTOCOL_VERSION } from '../src/shared/mmoProtocol';

const PORT = 3002; // Test port

async function runTests() {
  console.log('=== Running Phase 2.9 Authentication Tests ===');
  
  // Set test environment explicitly before server initialization
  process.env.NODE_ENV = 'test';
  process.env.ROC_TEST_MODE = '1';

  const server = http.createServer();
  const mmoServer = new MMOServer(server);
  
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`Test MMO Server running on port ${PORT}`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  async function connectAndSendHello(token: string, protocolVersion: string = ROC_REALTIME_PROTOCOL_VERSION): Promise<any> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { ws.close(); } catch (_) {}
          resolve({ type: 'TIMEOUT' });
        }
      }, 6000);

      ws.on('open', () => {
        const hello: HelloPacket = {
          type: 'HELLO',
          protocolVersion,
          authToken: token,
          clientTimestamp: Date.now(),
        };
        ws.send(JSON.stringify(hello));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          ws.close();
          resolve(msg);
        }
      });

      ws.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ type: 'CLOSED' });
        }
      });
      
      ws.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ type: 'CLOSED' });
        }
      });
    });
  }

  // 1. VALID IDENTITY (Test-bypass allowed in test env)
  let res = await connectAndSendHello('test_voyager_123');
  assert(res.type === 'AUTH_OK' && res.playerId === 'test_voyager_123', 'Valid identity connects successfully');

  // 2. INVALID TOKEN (Fails Firebase Admin fallback, expects missing creds or reject)
  res = await connectAndSendHello('Bearer some_invalid_token');
  if (!( (res.type === 'AUTH_ERROR' && res.code === 'AUTH_FAILED') || (res.type === 'DISCONNECT_REASON' && res.code === 'AUTH_FAILED') || res.type === 'CLOSED' )) {
    console.error('DEBUG RES FOR INVALID TOKEN FAILED:', res);
  }
  assert(
    (res.type === 'AUTH_ERROR' && res.code === 'AUTH_FAILED') ||
    (res.type === 'DISCONNECT_REASON' && res.code === 'AUTH_FAILED') ||
    res.type === 'CLOSED',
    'Invalid token is rejected'
  );

  // 3. MALFORMED TOKEN
  res = await connectAndSendHello('');
  assert(res.type === 'AUTH_ERROR' || res.type === 'CLOSED' || res.type === 'DISCONNECT_REASON', 'Missing/Malformed token is rejected');

  // 4. DUPLICATE SESSION
  const ws1 = new WebSocket(`ws://localhost:${PORT}/ws`);
  await new Promise<void>((resolve) => {
    ws1.on('open', () => {
      ws1.send(JSON.stringify({ type: 'HELLO', protocolVersion: ROC_REALTIME_PROTOCOL_VERSION, authToken: 'test_voyager_dup', clientTimestamp: Date.now() }));
    });
    ws1.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'AUTH_OK') resolve();
    });
  });

  const resDup = await connectAndSendHello('test_voyager_dup');
  assert(resDup.type === 'AUTH_OK', 'New duplicate session is accepted');
  
  await new Promise<void>((resolve) => {
    ws1.on('close', () => resolve());
    setTimeout(resolve, 500); // Wait for superseded kick
  });
  assert(ws1.readyState === WebSocket.CLOSED, 'Old duplicate session is superseded and closed');

  // 5. PRODUCTION TEST-BYPASS ATTEMPT
  process.env.NODE_ENV = 'production';
  process.env.ROC_TEST_MODE = '0';
  const resProd = await connectAndSendHello('test_voyager_hack');
  assert(resProd.type === 'AUTH_ERROR' && resProd.code === 'AUTH_FAILED', 'Production blocks synthetic test path');
  
  process.env.NODE_ENV = 'test';
  process.env.ROC_TEST_MODE = '1';

  // 6. AUTH_REFRESH: Same identity succeeds, identity switch rejected
  const wsRefresh = new WebSocket(`ws://localhost:${PORT}/ws`);
  await new Promise<void>((resolve) => {
    wsRefresh.on('open', () => {
      wsRefresh.send(JSON.stringify({ type: 'HELLO', protocolVersion: ROC_REALTIME_PROTOCOL_VERSION, authToken: 'test_voyager_refresh', clientTimestamp: Date.now() }));
    });
    wsRefresh.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'AUTH_OK') resolve();
    });
  });

  // Attempt refresh with different identity
  let refreshMismatchedClosed = false;
  wsRefresh.on('close', () => {
    refreshMismatchedClosed = true;
  });
  wsRefresh.send(JSON.stringify({ type: 'AUTH_REFRESH', authToken: 'test_voyager_impersonator' }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert(refreshMismatchedClosed, 'AUTH_REFRESH with changed identity is disconnected');

  mmoServer.stop();
  server.close();
  
  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
