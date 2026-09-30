/**
 * REALM OF CROWNS — Edge Browser Gameplay Verification Script
 * 
 * Launches real Microsoft Edge (visible GUI window), navigates to Voyage,
 * conducts interactive gameplay tests (sail, turn, stop, camera presets),
 * captures console telemetry and screenshots.
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\gerec.brewer\\.gemini\\antigravity-ide\\brain\\bf2c8ff1-7293-456c-ad76-18ad4b342395';

async function testEdgeGameplay() {
  console.log('Launching Microsoft Edge (Visible Window)...');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    userDataDir: 'C:\\temp\\edge_test_prof',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    const page = await browser.newPage();
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        console.error('BROWSER CONSOLE ERROR:', text);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.toString());
      console.error('BROWSER PAGE ERROR:', err.toString());
    });

    console.log('Navigating to http://localhost:3000/#voyage...');
    await page.goto('http://localhost:3000/#voyage', { timeout: 60000 });

    // Wait for the naval canvas to initialize
    console.log('Waiting for Voyage Canvas to initialize...');
    await page.waitForSelector('canvas', { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 3000)); // Allow 3D scene & assets to spin up

    // Dismiss Starter Charter Modal if open
    const allButtons = await page.$$('button');
    for (const b of allButtons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes('ACCEPT CROWN')) {
        console.log('Dismissing Starter Charter Modal...');
        await b.click();
        await new Promise((r) => setTimeout(r, 1500));
        break;
      }
    }

    // 1. Initial State Check
    const initialStatus = await page.evaluate(() => {
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      const ctrl = (window as any).__MOVEMENT_CONTROLLER__;
      return {
        hasState: Boolean(state),
        hasController: Boolean(ctrl),
        pos: state ? { x: state.pos.x, y: state.pos.y, z: state.pos.z } : null,
        heading: state ? state.heading : null,
        speedKnots: state ? state.speedKnots : null,
        hull: state ? state.hull : null,
      };
    });

    console.log('Initial Ship Status in Edge:', initialStatus);
    const screenshot1 = path.join(ARTIFACTS_DIR, 'edge_1_initial_voyage.png');
    await page.screenshot({ path: screenshot1 });
    console.log(`Saved screenshot: ${screenshot1}`);

    // Click canvas to focus input
    const canvas = await page.$('canvas');
    if (canvas) await canvas.click();

    // 2. Test Forward Sailing (W key for 3.5s)
    console.log('\n--- Test 2: Accelerating Forward (Holding KeyW for 3.5s) ---');
    await page.keyboard.down('KeyW');
    await new Promise((r) => setTimeout(r, 3500));
    await page.keyboard.up('KeyW');

    // Wait a brief moment for speed update
    await new Promise((r) => setTimeout(r, 500));

    const forwardStatus = await page.evaluate(() => {
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      const ctrl = (window as any).__MOVEMENT_CONTROLLER__;
      const metrics = ctrl ? ctrl.getMetrics() : null;
      return {
        pos: state ? { x: state.pos.x, z: state.pos.z } : null,
        heading: state ? state.heading : null,
        speedKnots: state ? state.speedKnots : null,
        metrics,
      };
    });
    console.log('Status After Forward Acceleration:', forwardStatus);
    const screenshot2 = path.join(ARTIFACTS_DIR, 'edge_2_forward_sailing.png');
    await page.screenshot({ path: screenshot2 });

    // 3. Test Turning Left (KeyA for 2.5s)
    console.log('\n--- Test 3: Turning Left (Holding KeyA for 2.5s) ---');
    await page.keyboard.down('KeyA');
    await new Promise((r) => setTimeout(r, 2500));
    await page.keyboard.up('KeyA');
    await new Promise((r) => setTimeout(r, 500));

    const leftTurnStatus = await page.evaluate(() => {
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      return {
        pos: state ? { x: state.pos.x, z: state.pos.z } : null,
        heading: state ? state.heading : null,
        speedKnots: state ? state.speedKnots : null,
      };
    });
    console.log('Status After Left Turn:', leftTurnStatus);
    const screenshot3 = path.join(ARTIFACTS_DIR, 'edge_3_left_turn.png');
    await page.screenshot({ path: screenshot3 });

    // 4. Test Turning Right (KeyD for 3.0s)
    console.log('\n--- Test 4: Turning Right (Holding KeyD for 3.0s) ---');
    await page.keyboard.down('KeyD');
    await new Promise((r) => setTimeout(r, 3000));
    await page.keyboard.up('KeyD');
    await new Promise((r) => setTimeout(r, 500));

    const rightTurnStatus = await page.evaluate(() => {
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      return {
        pos: state ? { x: state.pos.x, z: state.pos.z } : null,
        heading: state ? state.heading : null,
        speedKnots: state ? state.speedKnots : null,
      };
    });
    console.log('Status After Right Turn:', rightTurnStatus);

    // 5. Test Deceleration & Stop (KeyS for 3.5s)
    console.log('\n--- Test 5: Furl Sails / Stop (Holding KeyS for 3.5s) ---');
    await page.keyboard.down('KeyS');
    await new Promise((r) => setTimeout(r, 3500));
    await page.keyboard.up('KeyS');
    await new Promise((r) => setTimeout(r, 1000));

    const stopStatus = await page.evaluate(() => {
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      return {
        pos: state ? { x: state.pos.x, z: state.pos.z } : null,
        heading: state ? state.heading : null,
        speedKnots: state ? state.speedKnots : null,
        sailSetting: state ? state.sailSetting : null,
      };
    });
    console.log('Status After Furl / Stopping:', stopStatus);
    const screenshot4 = path.join(ARTIFACTS_DIR, 'edge_4_stopped.png');
    await page.screenshot({ path: screenshot4 });

    // 6. Test Camera Presets
    console.log('\n--- Test 6: Testing Camera Presets ---');
    const cameraButtons = await page.$$('button');
    let testedCamera = false;
    for (const btn of cameraButtons) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && (txt.includes('Quarterdeck') || txt.includes('Helm') || txt.includes('Bow') || txt.includes('Broadside'))) {
        console.log(`Clicking camera preset button: "${txt.trim()}"`);
        await btn.click();
        testedCamera = true;
        await new Promise((r) => setTimeout(r, 1500));
        break;
      }
    }

    const screenshot5 = path.join(ARTIFACTS_DIR, 'edge_5_camera_preset.png');
    await page.screenshot({ path: screenshot5 });

    // 7. Check for NaN or Stutter metrics
    const finalReport = await page.evaluate(() => {
      const ctrl = (window as any).__MOVEMENT_CONTROLLER__;
      const state = (window as any).__NAVAL_PLAYER_STATE__;
      const net = (window as any).__VOYAGE_NETWORK_CLIENT__;

      const hasNaN = !Number.isFinite(state?.pos?.x) || !Number.isFinite(state?.pos?.z) || !Number.isFinite(state?.heading) || !Number.isFinite(state?.speedKnots);
      return {
        hasNaN,
        finalState: state ? {
          x: state.pos.x,
          z: state.pos.z,
          heading: state.heading,
          speedKnots: state.speedKnots,
          hull: state.hull,
        } : null,
        controllerMetrics: ctrl ? ctrl.getMetrics() : null,
        networkMetrics: net ? net.getReconciliationMetrics() : null,
      };
    });

    console.log('\n==================================================');
    console.log('EDGE GAMEPLAY VERIFICATION FINAL REPORT:');
    console.log(JSON.stringify(finalReport, null, 2));
    console.log(`Page Errors: ${pageErrors.length}`);
    console.log('==================================================\n');

    await new Promise((r) => setTimeout(r, 2000));
  } finally {
    await browser.close();
  }
}

testEdgeGameplay().catch((err) => {
  console.error('Edge test error:', err);
  process.exit(1);
});
