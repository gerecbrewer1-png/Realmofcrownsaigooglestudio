const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\706e3afe-62d1-40cd-8e24-90bd183e1748';

(async () => {
  console.log('[Verify] Starting Pirate Gear & Outfits Visual Verification with Edge Chromium...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: BROWSER_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--proxy-server=direct://',
        '--proxy-bypass-list=*',
        '--window-size=1440,900'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[PortHavenCanvas]') || txt.includes('[PirateGearService]')) {
        console.log(`[Browser Console] ${txt}`);
      }
    });

    console.log('[Verify] Navigating to http://127.0.0.1:3000 ...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Switch to Naval Voyage tab
    console.log('[Verify] Navigating to Naval Voyage view...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const vBtn = btns.find(b => b.innerText && (b.innerText.includes('Naval') || b.innerText.includes('Voyage') || b.innerText.includes('Set Sail')));
      if (vBtn) vBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Open Sea Chart (Key M)
    console.log('[Verify] Opening Sea Chart modal...');
    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));

    // 3. Click The Brethren's Vault on Sea Chart
    console.log('[Verify] Docking at The Brethren\'s Vault (Pirate Cavern Grotto)...');
    const clickedVault = await page.evaluate(() => {
      const el = document.getElementById('chart-island-brethrens_vault');
      if (el) {
        el.click();
        return true;
      }
      return false;
    });
    console.log(`[Verify] Clicked vault island: ${clickedVault}`);
    await new Promise(r => setTimeout(r, 3500));

    // 4. Capture The Brethren's Vault Treasure Council (matching Ref Image 1)
    const ss1 = path.join(ARTIFACT_DIR, '17_pirate_grotto_treasure_council.png');
    await page.screenshot({ path: ss1 });
    console.log(`[Verify] Saved Screenshot 1: ${ss1}`);

    // 5. Walk toward the Beach Campfire Gathering (Ref Image 4) using Arrow keys
    console.log('[Verify] Walking toward the Beach Campfire Gathering (Arrow keys)...');
    await page.keyboard.down('ArrowRight');
    await new Promise(r => setTimeout(r, 1200));
    await page.keyboard.up('ArrowRight');

    await page.keyboard.down('ArrowUp');
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.up('ArrowUp');
    await new Promise(r => setTimeout(r, 1500));

    const ss2 = path.join(ARTIFACT_DIR, '18_pirate_campfire_gathering.png');
    await page.screenshot({ path: ss2 });
    console.log(`[Verify] Saved Screenshot 2: ${ss2}`);

    // 6. Click Captain Edward Vane or Black Bart to show Interactive Dialogue Card
    console.log('[Verify] Clicking Pirate Captain for Interactive Dialogue Card...');
    await page.evaluate(() => {
      // Dispatch click event in scene near captain coordinates
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        // Click near center-right where campfire captain is
        const evt = new MouseEvent('pointerdown', {
          bubbles: true,
          clientX: rect.left + rect.width * 0.62,
          clientY: rect.top + rect.height * 0.48,
        });
        canvas.dispatchEvent(evt);
        const upEvt = new MouseEvent('pointerup', {
          bubbles: true,
          clientX: rect.left + rect.width * 0.62,
          clientY: rect.top + rect.height * 0.48,
        });
        canvas.dispatchEvent(upEvt);
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    const ss3 = path.join(ARTIFACT_DIR, '19_pirate_captain_dialogue.png');
    await page.screenshot({ path: ss3 });
    console.log(`[Verify] Saved Screenshot 3: ${ss3}`);

    // 7. Transition to Normal Port (Oxbay) to verify Naval Officer in Colonial Bicorne (Ref Image 2 No. 356)
    console.log('[Verify] Setting sail to open sea...');
    await page.evaluate(() => {
      const sailBtn = document.getElementById('btn-port-set-sail');
      if (sailBtn) sailBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('[Verify] Opening Sea Chart for Oxbay...');
    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));

    await page.evaluate(() => {
      const el = document.getElementById('chart-island-oxbay');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 3500));

    const ss4 = path.join(ARTIFACT_DIR, '20_normal_port_officer_bicorne.png');
    await page.screenshot({ path: ss4 });
    console.log(`[Verify] Saved Screenshot 4: ${ss4}`);

    console.log('[Verify] All screenshots captured successfully!');
  } catch (err) {
    console.error('[Verify Error]:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
