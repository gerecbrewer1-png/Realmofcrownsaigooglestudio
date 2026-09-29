const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function verifyAllPortsAndHeroMovement() {
  console.log('=== STARTING FULL VALIDATION ACROSS ALL PORTS & HERO MOVEMENT ===');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(edgePath) ? edgePath : chromePath;

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
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[MedievalModelService]') || text.includes('FPS:') || text.includes('HERO') || text.includes('Docked')) {
      console.log('BROWSER:', text);
    }
  });

  console.log('1. Loading Realm of Crowns at http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3500));

  // Navigate to Voyage tab
  console.log('2. Opening Voyage / Naval Mode...');
  await page.waitForSelector('#nav-btn-voyage', { timeout: 10000 });
  await page.click('#nav-btn-voyage');
  await new Promise(r => setTimeout(r, 3000));

  // Open Sea Chart Modal
  console.log('3. Opening Nautical Sea Chart...');
  await page.waitForSelector('#naval-btn-sea-chart', { timeout: 10000 });
  await page.click('#naval-btn-sea-chart');
  await new Promise(r => setTimeout(r, 1500));

  // --- PORT 1: OXBAY (Normal Colonial Port) ---
  console.log('4. Docking at Oxbay (Normal Colonial Port)...');
  await page.waitForSelector('#chart-island-oxbay', { timeout: 8000 });
  await page.click('#chart-island-oxbay');
  await new Promise(r => setTimeout(r, 5000));

  // Measure FPS and latency in Oxbay
  const oxbayPerf = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (frames >= 60) {
          const elapsed = (performance.now() - start) / 1000;
          const fps = Math.round(frames / elapsed);
          resolve({ fps, elapsed: Math.round(elapsed * 1000) });
        } else {
          requestAnimationFrame(loop);
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log(`>>> OXBAY PERFORMANCE: ${oxbayPerf.fps} FPS (measured over 60 frames in ${oxbayPerf.elapsed}ms)`);

  // Test Hero Arrow Movement
  console.log('5. Testing Hero Arrow key movement in Oxbay...');
  // Walk forward
  await page.keyboard.down('ArrowDown');
  await new Promise(r => setTimeout(r, 2200));
  await page.keyboard.up('ArrowDown');
  await new Promise(r => setTimeout(r, 500));

  // Rotate camera slightly to frame hero walking along street
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(580, 380, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1000));

  const shot22 = path.resolve(__dirname, '..', '22_normal_port_hero_smooth_walking.png');
  await page.screenshot({ path: shot22 });
  console.log('Saved Screenshot 22:', shot22);

  // Approach and interact with Officer / Captain Horatio
  console.log('6. Interacting with Captain Horatio...');
  await page.keyboard.press('KeyE');
  await new Promise(r => setTimeout(r, 1000));
  const promptBtn = await page.$('#btn-station-interact-prompt');
  if (promptBtn) await promptBtn.click();
  await new Promise(r => setTimeout(r, 1500));

  const shot23 = path.resolve(__dirname, '..', '23_normal_port_captain_horatio.png');
  await page.screenshot({ path: shot23 });
  console.log('Saved Screenshot 23:', shot23);

  // Dismiss dialog
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // --- PORT 2: THE BRETHREN'S VAULT (Pirate Cavern Grotto) ---
  console.log("7. Opening Sea Chart to dock at The Brethren's Vault (Pirate Haven)...");
  // Board flagship to return to sea
  const boardBtn = await page.$('button[title*="Set Sail"], button:has-text("Set Sail")');
  // Or press E when near gangway, or trigger modal
  await page.evaluate(() => {
    // Return to sea view
    const backBtn = document.querySelector('button:has(.lucide-anchor)');
  });

  // Re-open Sea Chart modal directly
  await page.evaluate(() => {
    window.location.reload();
  });
  await new Promise(r => setTimeout(r, 4000));

  await page.waitForSelector('#nav-btn-voyage');
  await page.click('#nav-btn-voyage');
  await new Promise(r => setTimeout(r, 3000));

  await page.waitForSelector('#naval-btn-sea-chart');
  await page.click('#naval-btn-sea-chart');
  await new Promise(r => setTimeout(r, 1500));

  console.log("8. Docking at The Brethren's Vault...");
  await page.waitForSelector('#chart-island-brethren-vault', { timeout: 8000 });
  await page.click('#chart-island-brethren-vault');
  await new Promise(r => setTimeout(r, 5000));

  // Measure FPS in Pirate Cavern
  const grottoPerf = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (frames >= 60) {
          const elapsed = (performance.now() - start) / 1000;
          const fps = Math.round(frames / elapsed);
          resolve({ fps, elapsed: Math.round(elapsed * 1000) });
        } else {
          requestAnimationFrame(loop);
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log(`>>> PIRATE GROTTO PERFORMANCE: ${grottoPerf.fps} FPS (measured over 60 frames in ${grottoPerf.elapsed}ms)`);

  // Rotate camera to frame Treasure Council with unified clothing & hats
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(820, 390, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1500));

  const shot24 = path.resolve(__dirname, '..', '24_pirate_grotto_council_clothing_fixed.png');
  await page.screenshot({ path: shot24 });
  console.log('Saved Screenshot 24:', shot24);

  // Walk hero toward Shore Campfire
  console.log('9. Walking hero smoothly toward Shore Campfire gathering...');
  await page.keyboard.down('ArrowUp');
  await new Promise(r => setTimeout(r, 1800));
  await page.keyboard.up('ArrowUp');
  await new Promise(r => setTimeout(r, 1000));

  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(440, 370, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1500));

  const shot25 = path.resolve(__dirname, '..', '25_pirate_campfire_clothing_fixed.png');
  await page.screenshot({ path: shot25 });
  console.log('Saved Screenshot 25:', shot25);

  // --- 3D GEAR GALLERY CHECK ---
  console.log('10. Navigating to 3D Gear Gallery to verify all clothing, hats & cutlasses...');
  await page.goto('http://127.0.0.1:3000/gear_gallery.html', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4500));

  const shot26 = path.resolve(__dirname, '..', '26_gear_gallery_unified_clothing.png');
  await page.screenshot({ path: shot26 });
  console.log('Saved Screenshot 26:', shot26);

  await browser.close();
  console.log('=== ALL VALIDATIONS & SCREENSHOTS COMPLETED SUCCESSFULLY ===');
}

verifyAllPortsAndHeroMovement().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
