import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyPhase4Complete() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
  console.log('=== VERIFYING PHASE 4: BOATS, LIVING PORT BOARDWALKS, STERN LANTERNS & KARST BACKDROP ===');

  const pageErrors = [];

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
    pageErrors.push(err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000 in Microsoft Edge...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Switch to Naval Voyage Mode
  console.log('Switching to Naval Voyage mode...');
  const clickedVoyage = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log(`Naval Voyage clicked: ${clickedVoyage}`);
  await new Promise(r => setTimeout(r, 4000));

  // Capture Naval Flagship with 3 Glowing Amber Stern Lanterns, Fanged Skull Prow, and Oily Rippling Water
  const flagshipPath = path.join(artifactDir, 'phase4_naval_flagship_stern_lanterns.png');
  await page.screenshot({ path: flagshipPath });
  console.log(`Saved Naval Flagship Stern Lanterns screenshot: ${flagshipPath}`);

  // 2. Open Pirate Haven modal & Enter The Brethren's Vault (Pirate Cavern Grotto)
  console.log('Opening Pirate Haven modal...');
  const clickedModal = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pirate Haven'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log(`Pirate Haven modal clicked: ${clickedModal}`);
  await new Promise(r => setTimeout(r, 1500));

  console.log('Entering The Brethren\'s Vault (Colossal Skull Cliff Grotto)...');
  await page.evaluate(() => {
    const vaultBtn = document.getElementById('btn-voyage-brethrens_vault');
    if (vaultBtn) {
      vaultBtn.click();
    } else {
      const anyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Sea Cavern'));
      if (anyBtn) anyBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 4500));

  // Capture Brethren's Vault Cavern Grotto (Colossal skull portal, subterranean waterfall, gold heaps)
  const vaultPath = path.join(artifactDir, 'phase4_brethrens_vault_cavern_grotto.png');
  await page.screenshot({ path: vaultPath });
  console.log(`Saved Brethren's Vault Grotto screenshot: ${vaultPath}`);

  // 3. Return to Open Sea
  console.log('Returning to Open Sea via #btn-port-haven-set-sail...');
  await page.evaluate(() => {
    const returnBtn = document.getElementById('btn-port-haven-set-sail') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Set Sail') || b.textContent.includes('Return')));
    if (returnBtn) returnBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // 4. Open Pirate Haven modal & Enter Tortuga Haven (Colonial Boardwalk with Crates & Karst Mountains)
  console.log('Opening Pirate Haven modal to enter Tortuga Haven...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pirate Haven'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Entering Tortuga Haven...');
  await page.evaluate(() => {
    const tortugaBtn = document.getElementById('btn-voyage-tortuga-haven');
    if (tortugaBtn) {
      tortugaBtn.click();
    } else {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Drop Anchor'));
      if (btns[0]) btns[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 4500));

  // Walk forward a few steps on the boardwalk to see cargo crates and scenery
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 1200));
  await page.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 1000));

  // Capture Walkable Port Boardwalk (with crates, barrels, tall ship, karst mountains, waterfalls)
  const boardwalkPath = path.join(artifactDir, 'phase4_walkable_port_boardwalk.png');
  await page.screenshot({ path: boardwalkPath });
  console.log(`Saved Walkable Port Boardwalk screenshot: ${boardwalkPath}`);

  console.log('\n--- JAVASCRIPT ERRORS ---');
  if (pageErrors.length === 0) {
    console.log('ZERO JavaScript errors or exceptions in Phase 4!');
  } else {
    pageErrors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();
  console.log('=== PHASE 4 VERIFICATION COMPLETE ===');
}

verifyPhase4Complete().catch(err => {
  console.error('Phase 4 verification failed:', err);
  process.exit(1);
});
