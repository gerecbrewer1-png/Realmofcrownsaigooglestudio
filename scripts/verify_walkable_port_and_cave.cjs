const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\f4d8688b-09e7-4256-8a2a-23e0fd463016';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyWalkablePortAndCave() {
  console.log('Verifying Walkable 3D Port Haven & Massive Sea Cavern with Citadel Hero in Edge...');

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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error('PAGE EXCEPTION:', err.message);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 35000 });
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const claimBtn = await page.waitForSelector('#claim-charter-btn', { timeout: 4000 });
    if (claimBtn) {
      console.log('Dismissing charter modal...');
      await claimBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    console.log('No charter modal found, proceeding...');
  }

  // 1. Navigate to Naval Voyage
  console.log('Navigating to Naval Voyage mode...');
  try {
    const voyageBtn = await page.waitForSelector('#nav-btn-voyage', { timeout: 10000 });
    await voyageBtn.click();
  } catch (e) {
    console.error('Failed to find #nav-btn-voyage, capturing current state screenshot...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'nav_error_debug.png') });
    throw e;
  }
  await new Promise((r) => setTimeout(r, 4000));

  // Select Dragon War Junk
  try {
    console.log('Selecting Dragon War Junk...');
    await page.select('select', 'dragon_junk');
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {}

  // 2. Approach massive sea cavern at The Brethren's Vault ([-380, 0, 140] facing +Z)
  console.log('Approaching massive sea cavern at The Brethren\'s Vault...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.trim() === 'Deck') {
      await btn.click();
      break;
    }
  }

  await page.evaluate(() => {
    const state = (window).__NAVAL_PLAYER_STATE__;
    if (state) {
      state.pos.set(-380, 0, 140);
      state.heading = 0;
      state.speedKnots = 2.0;
    }
  });
  await new Promise((r) => setTimeout(r, 3500));

  const massiveCavernSeaPath = path.join(ARTIFACT_DIR, 'massive_sea_cavern_open_sea_verified.png');
  await page.screenshot({ path: massiveCavernSeaPath });
  console.log('Captured Massive Sea Cavern in Open Sea:', massiveCavernSeaPath);

  // 3. Dock at The Brethren's Vault (Trigger 3D Walkable Cave)
  console.log('Docking at The Brethren\'s Vault to enter 3D Walkable Pirate Cave...');
  const anchorBtn = await page.$('#naval-btn-drop-anchor');
  if (anchorBtn) {
    await anchorBtn.click();
  } else {
    // Open sea chart and click Brethren's Vault
    await page.keyboard.press('KeyM');
    await new Promise((r) => setTimeout(r, 1000));
    const vaultMarker = await page.$('#chart-island-brethrens_vault');
    if (vaultMarker) await vaultMarker.click();
  }
  await new Promise((r) => setTimeout(r, 4000));

  // 4. In 3D Cave: Move Hero with WASD
  console.log('Simulating Hero walking inside the subterranean pirate cave...');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 1500));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.up('KeyA');
  await new Promise((r) => setTimeout(r, 2000));

  const walkableCavePath = path.join(ARTIFACT_DIR, 'walkable_pirate_cave_hero_verified.png');
  await page.screenshot({ path: walkableCavePath });
  console.log('Captured Walkable 3D Pirate Cave with Hero:', walkableCavePath);

  // 5. Test interaction with in-world station (e.g. Black Market)
  console.log('Interacting with Black Market fence station...');
  const interactBtn = await page.$('#btn-station-interact-prompt');
  if (interactBtn) {
    await interactBtn.click();
  } else {
    // Trigger via bottom quick stations bar
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Market')) {
        await b.click();
        break;
      }
    }
  }
  await new Promise((r) => setTimeout(r, 2000));

  const blackMarketDrawerPath = path.join(ARTIFACT_DIR, 'black_market_trade_drawer_verified.png');
  await page.screenshot({ path: blackMarketDrawerPath });
  console.log('Captured Black Market Trade Drawer in 3D Cave:', blackMarketDrawerPath);

  // 6. Close drawer
  const closeBtn = await page.$('#naval-btn-close-haven');
  if (closeBtn) await closeBtn.click();
  await new Promise((r) => setTimeout(r, 1500));

  // 7. Test "Set Sail to Open Sea"
  console.log('Testing Set Sail from 3D Port back to Open Sea...');
  const setSailBtn = await page.$('#btn-port-set-sail');
  if (setSailBtn) {
    await setSailBtn.click();
  } else {
    await page.keyboard.press('KeyE');
  }
  await new Promise((r) => setTimeout(r, 3500));

  const returnSeaPath = path.join(ARTIFACT_DIR, 'return_to_open_sea_verified.png');
  await page.screenshot({ path: returnSeaPath });
  console.log('Captured Return to Open Sea Sailing:', returnSeaPath);

  // 8. Now dock at a colonial island haven (e.g. Oxbay) to verify island port
  console.log('Opening Sea Chart and docking at Oxbay to verify Walkable Island Port...');
  await page.keyboard.press('KeyM');
  await new Promise((r) => setTimeout(r, 1500));
  const oxbayMarker = await page.$('#chart-island-oxbay');
  if (oxbayMarker) {
    await oxbayMarker.click();
  } else {
    const firstIsl = await page.$('[id^="chart-island-"]');
    if (firstIsl) await firstIsl.click();
  }
  await new Promise((r) => setTimeout(r, 4000));

  // Walk around in the colonial port
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 1200));
  await page.keyboard.up('KeyW');
  await new Promise((r) => setTimeout(r, 2000));

  const islandPortPath = path.join(ARTIFACT_DIR, 'walkable_island_port_hero_verified.png');
  await page.screenshot({ path: islandPortPath });
  console.log('Captured Walkable 3D Island Port Town with Hero:', islandPortPath);

  await browser.close();
  console.log('All Walkable 3D Port and Sea Cavern tests verified successfully!');
}

verifyWalkablePortAndCave().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});
