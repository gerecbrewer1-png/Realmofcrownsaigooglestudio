import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyPhase3() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
  console.log('=== VERIFYING PHASE 3: AAA KARST MOUNTAINS, CASCADING WATERFALLS, MOSSY BRIDGES & SKULL GROTTO ===');

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
    pageErrors.push(err.toString());
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Switch to Naval Voyage Mode
  console.log('Navigating to Naval Voyage...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  // Capture Naval Horizon with Karst Mountains & Waterfall
  const navalMountainsPath = path.join(artifactDir, 'phase3_naval_karst_mountains.png');
  await page.screenshot({ path: navalMountainsPath });
  console.log(`Saved Naval Karst Mountains screenshot: ${navalMountainsPath}`);

  // 2. Open Pirate Haven modal and enter 3D Port Haven
  console.log('Opening Pirate Haven modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pirate Haven'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Dropping anchor to explore 3D Port Haven...');
  await page.evaluate(() => {
    // Click the first "DROP ANCHOR & EXPLORE [3D]" button
    const buttons = Array.from(document.querySelectorAll('button'));
    const anchorBtn = buttons.find(b => b.textContent && b.textContent.includes('DROP ANCHOR & EXPLORE [3D]'));
    if (anchorBtn) anchorBtn.click();
  });
  await new Promise(r => setTimeout(r, 4500));

  // Capture 3D Port Haven Walkable Environment (with karst backdrop, waterfall, moss, boardwalk)
  const portHavenWalkablePath = path.join(artifactDir, 'phase3_port_haven_walkable.png');
  await page.screenshot({ path: portHavenWalkablePath });
  console.log(`Saved 3D Port Haven Walkable screenshot: ${portHavenWalkablePath}`);

  // Measure FPS inside 3D Walkable Port
  const havenFps = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      let start = performance.now();
      function loop(now) {
        frames++;
        if (now - start < 2000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round(frames / ((now - start) / 1000)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log(`3D Port Haven FPS: ${havenFps}`);

  console.log('\n--- JAVASCRIPT ERRORS ---');
  if (pageErrors.length === 0) {
    console.log('ZERO JavaScript errors or exceptions in Phase 3!');
  } else {
    pageErrors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();
  console.log('=== PHASE 3 VERIFICATION COMPLETE ===');
}

verifyPhase3().catch(err => {
  console.error('Phase 3 verification error:', err);
  process.exit(1);
});
