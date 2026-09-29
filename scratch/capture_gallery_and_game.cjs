const puppeteer = require('puppeteer-core');
const path = require('path');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\706e3afe-62d1-40cd-8e24-90bd183e1748';

(async () => {
  console.log('[Capture] Launching Edge Chromium with direct proxy bypass...');
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

    // STEP 1: CAPTURE 3D GEAR REFERENCE GALLERY
    console.log('[Capture] Loading 3D Gear Reference Gallery: http://127.0.0.1:3000/gear_gallery.html ...');
    await page.goto('http://127.0.0.1:3000/gear_gallery.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const ssGallery = path.join(ARTIFACT_DIR, '21_pirate_hats_and_swords_reference_gallery.png');
    await page.screenshot({ path: ssGallery });
    console.log(`[Capture] Saved Gallery Screenshot: ${ssGallery}`);

    // STEP 2: CAPTURE IN-GAME DIALOGUE AND OXBAY PORT
    console.log('[Capture] Loading main game: http://127.0.0.1:3000 ...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    // Navigate to Naval Voyage view
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const vBtn = btns.find(b => b.innerText && (b.innerText.includes('Naval') || b.innerText.includes('Voyage') || b.innerText.includes('Set Sail')));
      if (vBtn) vBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Open Sea Chart (Key M)
    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));

    // Click The Brethren's Vault
    await page.evaluate(() => {
      const el = document.getElementById('chart-island-brethrens_vault');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 3500));

    // Click Captain Black Bart at the gold treasure chest (around screen center-right)
    console.log('[Capture] Clicking Captain Black Bart for Dialogue Card...');
    await page.mouse.click(820, 360);
    await new Promise(r => setTimeout(r, 1500));

    const ssDialogue = path.join(ARTIFACT_DIR, '19_pirate_captain_dialogue.png');
    await page.screenshot({ path: ssDialogue });
    console.log(`[Capture] Saved Dialogue Screenshot: ${ssDialogue}`);

    // Set sail and visit Oxbay
    console.log('[Capture] Setting sail to open sea...');
    await page.evaluate(() => {
      const sailBtn = document.getElementById('btn-port-set-sail');
      if (sailBtn) sailBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));

    await page.evaluate(() => {
      const el = document.getElementById('chart-island-oxbay');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 3500));

    // Walk forward on the promenade
    await page.keyboard.down('ArrowUp');
    await new Promise(r => setTimeout(r, 1200));
    await page.keyboard.up('ArrowUp');
    await new Promise(r => setTimeout(r, 1200));

    const ssOxbay = path.join(ARTIFACT_DIR, '20_normal_port_officer_bicorne.png');
    await page.screenshot({ path: ssOxbay });
    console.log(`[Capture] Saved Oxbay Screenshot: ${ssOxbay}`);

    console.log('[Capture] All verification captures completed successfully!');
  } catch (err) {
    console.error('[Capture Error]:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
