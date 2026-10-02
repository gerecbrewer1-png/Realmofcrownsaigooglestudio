import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function testInteractive() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-vis-interact-'));

  console.log('=== RUNNING INTERACTIVE SHIP VISIBILITY INVESTIGATION ===');
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

  // Dismiss charter
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

  // Inspect state
  const inspectShip = async (label) => {
    const state = await page.evaluate(() => {
      const diag = typeof window.__VOYAGE_DIAGNOSTICS_REPORT__ === 'function' ? window.__VOYAGE_DIAGNOSTICS_REPORT__() : null;
      const ps = window.__NAVAL_PLAYER_STATE__;
      const ctrl = window.__MOVEMENT_CONTROLLER__;
      const lastErr = window.__VOYAGE_LAST_ERROR__ ? String(window.__VOYAGE_LAST_ERROR__) : null;
      return {
        diag,
        playerState: ps ? { pos: ps.pos, heading: ps.heading, speedKnots: ps.speedKnots, hull: ps.hull } : null,
        metrics: ctrl ? ctrl.getMetrics() : null,
        lastErr
      };
    });
    console.log(`[${label}] State:`, JSON.stringify(state, null, 2));
    await page.screenshot({ path: `vis_${label}.png` });
    return state;
  };

  await inspectShip('1_initial');

  // Test 2: Press W (Forward) for 3 seconds
  console.log('Testing W key forward...');
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 500));
  await inspectShip('2_after_w');

  // Test 3: Camera presets
  console.log('Testing Camera Presets...');
  const presets = ['Helm', 'Prow', 'Port', 'Stbd', 'Mast', 'Free', 'Deck'];
  for (const p of presets) {
    const clicked = await page.evaluate((presetName) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.innerText && b.innerText.includes(presetName));
      if (found) {
        found.click();
        return true;
      }
      return false;
    }, p);
    await new Promise(r => setTimeout(r, 1000));
    await inspectShip(`3_cam_${p}`);
  }

  // Test 4: Ship Type Change (Dropdown)
  console.log('Testing Ship Type Change...');
  const shipTypes = ['sloop', 'corvette', 'frigate', 'galleon'];
  for (const st of shipTypes) {
    await page.evaluate((type) => {
      const select = document.querySelector('select');
      if (select) {
        select.value = type;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, st);
    await new Promise(r => setTimeout(r, 1500));
    await inspectShip(`4_ship_${st}`);
  }

  // Test 5: Scene Transition / Tab Switch (Citadel -> Voyage)
  console.log('Testing Tab Switch to Citadel then back to Voyage...');
  await page.evaluate(() => {
    // Click Citadel tab
    const btns = Array.from(document.querySelectorAll('button'));
    const citadelBtn = btns.find(b => b.innerText && b.innerText.includes('Citadel'));
    if (citadelBtn) citadelBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await inspectShip('5_citadel_view');

  await page.evaluate(() => {
    // Click Voyage tab
    const btns = Array.from(document.querySelectorAll('button'));
    const voyageBtn = btns.find(b => b.innerText && b.innerText.includes('Voyage'));
    if (voyageBtn) voyageBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await inspectShip('5_return_to_voyage');

  console.log('Page Errors:', pageErrors);
  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

testInteractive().catch(err => {
  console.error('Interactive test error:', err);
  process.exit(1);
});
