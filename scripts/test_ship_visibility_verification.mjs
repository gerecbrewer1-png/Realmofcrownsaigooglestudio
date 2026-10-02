import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function verifyShipVisibility() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-vis-verif-'));

  console.log('=== VERIFYING PLAYER SHIP VISIBILITY IN LIVE BROWSER ===');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--user-data-dir=' + tempDir,
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => pageErrors.push(err.toString()));

  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss charter / Enter voyage
  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  await page.waitForSelector('canvas', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  // Comprehensive ship inspection function
  const inspectShip = async (label) => {
    const state = await page.evaluate(() => {
      const diag = typeof window.__VOYAGE_DIAGNOSTICS_REPORT__ === 'function' ? window.__VOYAGE_DIAGNOSTICS_REPORT__() : null;
      const ps = window.__NAVAL_PLAYER_STATE__;
      const ctrl = window.__MOVEMENT_CONTROLLER__;
      const scene = window.__NAVAL_SCENE__;
      const lastErr = window.__VOYAGE_LAST_ERROR__ ? String(window.__VOYAGE_LAST_ERROR__) : null;
      const debug = window.__VOYAGE_DEBUG_SWITCHES__ || null;

      // Find player ship mesh in scene
      let playerMeshInfo = null;
      if (scene) {
        const pMesh = scene.children.find(c => c.name && c.name.startsWith('ship-') && !c.name.includes('pirate'));
        if (pMesh) {
          playerMeshInfo = {
            name: pMesh.name,
            visible: pMesh.visible,
            position: { x: pMesh.position.x, y: pMesh.position.y, z: pMesh.position.z },
            rotation: { x: pMesh.rotation.x, y: pMesh.rotation.y, z: pMesh.rotation.z },
            childCount: pMesh.children.length,
            lod0Visible: pMesh.userData?.lodLevels?.[0]?.visible ?? null,
            currentLOD: pMesh.userData?.currentLOD ?? null,
          };
        }
      }

      return {
        diag,
        playerState: ps ? { pos: ps.pos, heading: ps.heading, speedKnots: ps.speedKnots, hull: ps.hull } : null,
        playerMeshInfo,
        debug,
        lastErr
      };
    });
    console.log(`\n--- [${label}] ---`);
    console.log('Player Mesh Info:', JSON.stringify(state.playerMeshInfo, null, 2));
    console.log('Player State:', JSON.stringify(state.playerState, null, 2));
    console.log('Diagnostics:', JSON.stringify(state.diag ? { frameCount: state.diag.frameCount, renderCalls: state.diag.renderCalls, playerPos: state.diag.playerPos } : null));
    await page.screenshot({ path: `verified_${label}.png` });
    return state;
  };

  // 1. Initial Load Verification
  const initial = await inspectShip('1_initial_load');

  // 2. Movement Verification (W key forward)
  console.log('\nSailing forward with W key...');
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 2500));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 500));
  const moving = await inspectShip('2_sailing_forward');

  // 3. Turning Verification (A key port turn)
  console.log('\nSteering port with A key...');
  await page.keyboard.down('KeyA');
  await new Promise(r => setTimeout(r, 2000));
  await page.keyboard.up('KeyA');
  await new Promise(r => setTimeout(r, 500));
  const turning = await inspectShip('3_turning_port');

  // 4. Camera Presets Verification
  console.log('\nTesting Camera Presets (Helm, Prow, Port)...');
  const presets = ['Helm', 'Prow', 'Port'];
  for (const p of presets) {
    await page.evaluate((presetName) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.innerText && b.innerText.includes(presetName));
      if (found) found.click();
    }, p);
    await new Promise(r => setTimeout(r, 1000));
    await inspectShip(`4_camera_${p}`);
  }

  // 5. Experiment Toggle OFF Verification
  console.log('\nToggling movementIsolationEnabled OFF (Testing fallback path)...');
  await page.evaluate(() => {
    if (typeof window.__TOGGLE_VOYAGE_DEBUG__ === 'function') {
      window.__TOGGLE_VOYAGE_DEBUG__('movementIsolationEnabled');
    }
  });
  await new Promise(r => setTimeout(r, 500));
  // Sail forward with experiment toggle OFF
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 2000));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 500));
  const experimentOff = await inspectShip('5_experiment_toggle_off');

  // Restore toggle back to ON
  await page.evaluate(() => {
    if (typeof window.__TOGGLE_VOYAGE_DEBUG__ === 'function') {
      window.__TOGGLE_VOYAGE_DEBUG__('movementIsolationEnabled');
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. Reset camera to Quarterdeck and inspect final state
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const found = btns.find(b => b.innerText && b.innerText.includes('Deck'));
    if (found) found.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await inspectShip('6_final_verification');

  console.log('\n=== VERIFICATION CHECKS ===');
  console.log('1. Initial Mesh Visible:', initial.playerMeshInfo?.visible === true);
  console.log('2. Initial LOD0 Visible:', initial.playerMeshInfo?.lod0Visible === true);
  console.log('3. Sailing Forward Mesh Visible:', moving.playerMeshInfo?.visible === true);
  console.log('4. Turning Mesh Visible:', turning.playerMeshInfo?.visible === true);
  console.log('5. Experiment OFF Mesh Visible:', experimentOff.playerMeshInfo?.visible === true);
  console.log('6. Page Errors:', pageErrors.length);

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}

  const allPassed = 
    initial.playerMeshInfo?.visible === true &&
    initial.playerMeshInfo?.lod0Visible === true &&
    moving.playerMeshInfo?.visible === true &&
    turning.playerMeshInfo?.visible === true &&
    experimentOff.playerMeshInfo?.visible === true &&
    pageErrors.length === 0;

  if (allPassed) {
    console.log('\n>>> ALL BROWSER VISIBILITY CHECKS PASSED SUCCESSFULLY! <<<');
  } else {
    console.error('\n>>> SOME BROWSER VISIBILITY CHECKS FAILED! <<<');
    process.exit(1);
  }
}

verifyShipVisibility().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
