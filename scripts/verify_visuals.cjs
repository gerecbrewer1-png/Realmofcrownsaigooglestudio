/**
 * REALM OF CROWNS — Built-in Visual Inspection Tool
 * Uses puppeteer-core + Microsoft Edge (msedge.exe) with ZERO external CDN dependencies.
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\f4d8688b-09e7-4256-8a2a-23e0fd463016';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyAllScenes() {
  console.log('Starting visual verification using Microsoft Edge...');
  console.log('Edge path:', EDGE_PATH);

  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error('Edge executable not found at: ' + EDGE_PATH);
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', text);
    }
  });

  page.on('pageerror', (err) => {
    console.error('PAGE EXCEPTION:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('Loaded initial page.');

  // Check for Starter Charter modal and claim it
  try {
    const claimBtn = await page.waitForSelector('#claim-charter-btn', { timeout: 4000 });
    if (claimBtn) {
      console.log('Dismissing Starter Charter Modal (#claim-charter-btn)...');
      await claimBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    console.log('No starter charter modal appeared or already claimed.');
  }

  // 1. Capture Citadel View
  console.log('Waiting 3s for Citadel 3D canvas...');
  await new Promise((r) => setTimeout(r, 3000));
  const citadelPath = path.join(ARTIFACT_DIR, 'citadel_verified_edge.png');
  await page.screenshot({ path: citadelPath });
  console.log('Captured Citadel screenshot:', citadelPath);

  // 2. Switch to Naval Voyage tab
  console.log('Clicking Naval Voyage tab (#nav-btn-voyage)...');
  const voyageBtn = await page.waitForSelector('#nav-btn-voyage', { timeout: 5000 });
  if (voyageBtn) {
    await voyageBtn.click();
    console.log('Switched to Naval Voyage. Waiting 5s for ocean water, coastal harbor & ships...');
    await new Promise((r) => setTimeout(r, 5000));
    const voyagePath = path.join(ARTIFACT_DIR, 'naval_voyage_verified_edge.png');
    await page.screenshot({ path: voyagePath });
    console.log('Captured Naval Voyage screenshot:', voyagePath);

    // 2b. Select Dragon War Junk in Flagship Selector
    try {
      console.log('Selecting Dragon War Junk from Flagship Selector...');
      await page.select('select', 'dragon_junk');
      await new Promise((r) => setTimeout(r, 2500));
      const junkPath = path.join(ARTIFACT_DIR, 'dragon_war_junk_verified.png');
      await page.screenshot({ path: junkPath });
      console.log('Captured Dragon War Junk screenshot:', junkPath);
    } catch (e) {
      console.warn('Could not select dragon_junk:', e.message);
    }

    // 2c. Open Sea Chart to inspect archipelago layout & havens
    try {
      console.log('Opening Sea Chart modal...');
      await page.keyboard.press('KeyM');
      await new Promise((r) => setTimeout(r, 1500));
      const chartPath = path.join(ARTIFACT_DIR, 'sea_chart_verified.png');
      await page.screenshot({ path: chartPath });
      console.log('Captured Sea Chart screenshot:', chartPath);
      // Close chart modal with Escape
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.warn('Could not open sea chart:', e.message);
    }

    // 2d. Trigger dock modal for The Brethren's Vault
    try {
      console.log('Opening Haven modal for The Brethren\'s Vault...');
      await page.evaluate(() => {
        // Find dock handler or simulate docking at brethrens_vault
        const state = (window).__NAVAL_PLAYER_STATE__;
        if (state) {
          state.pos.set(-380, 0, 220); // Teleport player into the Black Market Cave!
        }
      });
      await new Promise((r) => setTimeout(r, 1500));
      await page.keyboard.press('Enter');
      await new Promise((r) => setTimeout(r, 2000));
      const vaultPath = path.join(ARTIFACT_DIR, 'black_market_vault_verified.png');
      await page.screenshot({ path: vaultPath });
      console.log('Captured Black Market Vault Haven screenshot:', vaultPath);

      // Close modal if open
      const closeBtn = await page.$('#naval-btn-close-haven');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.warn('Could not test Brethrens Vault modal:', e.message);
    }
  } else {
    console.warn('Naval Voyage button not found.');
  }

  // 3. Switch to Tactical Battle tab
  console.log('Clicking Tactical Battle tab (#nav-btn-tactical)...');
  const tacticalBtn = await page.waitForSelector('#nav-btn-tactical', { timeout: 5000 });
  if (tacticalBtn) {
    await tacticalBtn.click();
    console.log('Switched to Tactical Battle. Waiting 5s for PlayCanvas engine & moat water...');
    await new Promise((r) => setTimeout(r, 5000));
    const tacticalPath = path.join(ARTIFACT_DIR, 'tactical_verified_edge.png');
    await page.screenshot({ path: tacticalPath });
    console.log('Captured Tactical Battle screenshot:', tacticalPath);
  } else {
    console.warn('Tactical button not found.');
  }

  await browser.close();
  console.log('Verification completed successfully! Total page exceptions:', errors.length);
}

verifyAllScenes().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
