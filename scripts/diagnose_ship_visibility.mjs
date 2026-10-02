import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function diagnoseShipVisibility() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-visibility-diag-'));

  console.log('=== SHIP VISIBILITY DIAGNOSTIC RUNNING ===');
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

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.toString()}`));

  console.log('Navigating to http://127.0.0.1:3000/#voyage...');
  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss charter or accept crown if present
  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  console.log('Waiting for canvas...');
  await page.waitForSelector('canvas', { timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  // Capture screenshot 1 on initial load
  await page.screenshot({ path: 'diagnose_ship_initial.png' });
  console.log('Captured diagnose_ship_initial.png');

  // Query scene graph and diagnostics
  const diagnosis = await page.evaluate(() => {
    const diagReport = typeof window.__VOYAGE_DIAGNOSTICS_REPORT__ === 'function' ? window.__VOYAGE_DIAGNOSTICS_REPORT__() : null;
    const navalDiag = window.__NAVAL_DIAGNOSTICS__ || null;
    const playerState = window.__NAVAL_PLAYER_STATE__ || null;
    const movementCtrl = window.__MOVEMENT_CONTROLLER__ || null;

    // Search for ship mesh in scene or global
    // Let's inspect window.__VOYAGE_DEBUG_GET_SCENE__ if available, or examine through renderer
    let playerMeshDiag = null;
    let cameraDiag = null;

    // In NavalSeaCanvas, let's see what is globally exposed
    return {
      diagReport,
      navalDiag,
      playerState,
      hasMovementController: !!movementCtrl,
      movementMetrics: movementCtrl ? movementCtrl.getMetrics() : null,
      latestRenderState: movementCtrl ? movementCtrl.getLatestRenderState() : null,
    };
  });

  console.log('DIAGNOSIS REPORT:', JSON.stringify(diagnosis, null, 2));

  fs.writeFileSync('diagnose_ship_report.json', JSON.stringify({ diagnosis, consoleLogs }, null, 2));

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

diagnoseShipVisibility().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
