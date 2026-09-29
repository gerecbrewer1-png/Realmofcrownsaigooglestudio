const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\f4d8688b-09e7-4256-8a2a-23e0fd463016';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyDragonAndCave() {
  console.log('Capturing close-up Dragon Figurehead and 3D Black Market Cave...');

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

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

  try {
    const claimBtn = await page.waitForSelector('#claim-charter-btn', { timeout: 3000 });
    if (claimBtn) await claimBtn.click();
  } catch (e) {}

  const voyageBtn = await page.waitForSelector('#nav-btn-voyage', { timeout: 5000 });
  await voyageBtn.click();
  await new Promise((r) => setTimeout(r, 4000));

  // 1. Select dragon_junk
  console.log('Selecting Dragon War Junk...');
  await page.select('select', 'dragon_junk');
  await new Promise((r) => setTimeout(r, 2000));

  // Click the 'Prow' camera preset button to focus on the carved golden dragon figurehead
  console.log('Selecting Prow camera preset...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.trim() === 'Prow') {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 2500));

  const dragonBowPath = path.join(ARTIFACT_DIR, 'dragon_figurehead_bow_verified.png');
  await page.screenshot({ path: dragonBowPath });
  console.log('Captured Dragon Figurehead Bow screenshot:', dragonBowPath);

  // 2. Sail directly in front of The Brethren's Vault cave ([-380, 0, 140] looking north +Z toward 220)
  console.log('Teleporting ship in front of Black Market Cave...');
  // Switch back to Deck camera preset
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
      state.heading = 0; // facing +Z toward cave arch at 220
      state.speedKnots = 2.0;
    }
  });
  await new Promise((r) => setTimeout(r, 3000));

  const cave3DPath = path.join(ARTIFACT_DIR, 'black_market_cave_entrance_verified.png');
  await page.screenshot({ path: cave3DPath });
  console.log('Captured 3D Black Market Cave Entrance screenshot:', cave3DPath);

  await browser.close();
  console.log('Done!');
}

verifyDragonAndCave().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
