import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function diagnose() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-diag-'));

  console.log('=== RUNNING EMERGENCY VOYAGE DIAGNOSTIC ===');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--proxy-server=direct://',
      '--proxy-bypass-list=*',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--user-data-dir=' + tempDir,
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('BROWSER_ERR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('PAGE_ERROR:', err.message);
  });

  console.log('Navigating to http://127.0.0.1:3000/#voyage ...');
  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss modal if present and ensure voyage navigation
  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  console.log('Waiting for simulation to mount...');
  await page.waitForFunction(() => typeof window.__NAVAL_DIAGNOSTICS__ === 'object' && window.__NAVAL_DIAGNOSTICS__.drawCalls > 0, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Inspect state
  const state = await page.evaluate(() => {
    const diag = window.__NAVAL_DIAGNOSTICS__ || {};
    const playerState = window.__NAVAL_PLAYER_STATE__ || {};
    return {
      diagnostics: diag,
      playerPos: playerState.pos ? { x: playerState.pos.x, y: playerState.pos.y, z: playerState.pos.z } : null,
      playerHeading: playerState.heading,
    };
  });

  console.log('INITIAL STATE:', JSON.stringify(state, null, 2));

  // Take screenshot of current view
  const screenshotPath = 'test_voyage_emergency_screen.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot:', screenshotPath);

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
