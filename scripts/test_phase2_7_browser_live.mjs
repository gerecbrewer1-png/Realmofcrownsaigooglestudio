import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function runPhase27BrowserBenchmark() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-phase27-'));

  console.log('================================================================');
  console.log('REALM OF CROWNS — PHASE 2.7 BROWSER LIVE MMO VALIDATION');
  console.log('================================================================\n');

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
      '--user-data-dir=' + tempDir,
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  console.log('Navigating to http://127.0.0.1:3000/#voyage...');
  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  console.log('Waiting for Voyage 3D canvas and diagnostics initialization...');
  await page.waitForFunction(() => typeof window.__NAVAL_DIAGNOSTICS__ === 'object' && window.__NAVAL_DIAGNOSTICS__.drawCalls > 0, { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // Toggle F3 HUD if not already open
  await page.evaluate(() => {
    const devBtn = document.getElementById('naval-btn-dev-diagnostics');
    if (devBtn && !document.getElementById('naval-dev-stats-pill')) {
      devBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // Baseline reading (9 initial vessels)
  const baselineStats = await page.evaluate(() => {
    return {
      diagnostics: window.__NAVAL_DIAGNOSTICS__,
      mmoDiag: window.__MMO_PARTITION__ ? window.__MMO_PARTITION__.getDiagnostics() : null,
    };
  });
  console.log('--- Baseline Stats (9 Ships) ---');
  console.log(`  FPS: ${baselineStats.diagnostics.fps}`);
  console.log(`  Draw Calls: ${baselineStats.diagnostics.drawCalls}`);
  console.log(`  Triangles: ${baselineStats.diagnostics.triangles}`);
  console.log(`  Renderer Ownership: ${baselineStats.diagnostics.rendererOwnership}`);
  console.log(`  MMO AOI: ${baselineStats.diagnostics.mmoDiag?.aoiCount} / ${baselineStats.diagnostics.mmoDiag?.totalWorldEntities}`);

  // Populate 500 World Entities distributed across archipelago
  console.log('\nPopulating 500 MMO World Entities...');
  await page.evaluate(() => {
    if (typeof window.__POPULATE_MMO_WORLD__ === 'function') {
      window.__POPULATE_MMO_WORLD__(500);
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Sample 15 frames
  const world500Stats = await page.evaluate(() => {
    return {
      diagnostics: window.__NAVAL_DIAGNOSTICS__,
      mmoDiag: window.__MMO_PARTITION__ ? window.__MMO_PARTITION__.getDiagnostics() : null,
    };
  });

  console.log('--- 500 World Entities Test in Live Canvas ---');
  console.log(`  FPS: ${world500Stats.diagnostics.fps}`);
  console.log(`  Frame Time: ${world500Stats.diagnostics.frameTimeMs} ms`);
  console.log(`  Draw Calls: ${world500Stats.diagnostics.drawCalls}`);
  console.log(`  Active Ships in 3D: ${world500Stats.diagnostics.activeShips}`);
  console.log(`  MMO World Entities: ${world500Stats.diagnostics.mmoDiag?.totalWorldEntities}`);
  console.log(`  MMO Active AOI Count: ${world500Stats.diagnostics.mmoDiag?.aoiCount}`);
  console.log(`  Prefetch Count: ${world500Stats.diagnostics.mmoDiag?.prefetchCount}`);
  console.log(`  NET Tiers: NET0=${world500Stats.diagnostics.mmoDiag?.netTiers[0]}, NET1=${world500Stats.diagnostics.mmoDiag?.netTiers[1]}, NET2=${world500Stats.diagnostics.mmoDiag?.netTiers[2]}, NET3=${world500Stats.diagnostics.mmoDiag?.netTiers[3]}, NET4=${world500Stats.diagnostics.mmoDiag?.netTiers[4]}, NET5=${world500Stats.diagnostics.mmoDiag?.netTiers[5]}`);

  // Capture screenshot with F3 HUD open
  const hudPath = path.join(process.cwd(), 'voyage_phase2_7_mmo_hud.png');
  await page.screenshot({ path: hudPath, fullPage: false });
  console.log(`\nScreenshot captured with MMO HUD: ${hudPath}`);

  // Test dense local test (50 nearby ships)
  console.log('\nRunning Dense Local Test (50 nearby ships)...');
  await page.evaluate(() => {
    if (typeof window.__POPULATE_LOCAL_DENSE_TEST__ === 'function') {
      window.__POPULATE_LOCAL_DENSE_TEST__(50);
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  const denseStats = await page.evaluate(() => {
    return {
      diagnostics: window.__NAVAL_DIAGNOSTICS__,
      mmoDiag: window.__MMO_PARTITION__ ? window.__MMO_PARTITION__.getDiagnostics() : null,
    };
  });
  console.log(`  FPS: ${denseStats.diagnostics.fps}`);
  console.log(`  Frame Time: ${denseStats.diagnostics.frameTimeMs} ms`);
  console.log(`  Dense AOI Count: ${denseStats.diagnostics.mmoDiag?.aoiCount}`);
  console.log(`  High Rate Entities (NET0+NET1): ${(denseStats.diagnostics.mmoDiag?.netTiers[0] || 0) + (denseStats.diagnostics.mmoDiag?.netTiers[1] || 0)}`);

  const results = {
    baseline: baselineStats,
    world500: world500Stats,
    dense50: denseStats,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(process.cwd(), 'voyage_phase2_7_browser_live.json'), JSON.stringify(results, null, 2), 'utf-8');

  await browser.close();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n================================================================');
  console.log('PHASE 2.7 BROWSER LIVE MMO VALIDATION COMPLETE!');
  console.log('================================================================\n');
}

runPhase27BrowserBenchmark().catch((err) => {
  console.error('Browser live benchmark error:', err);
  process.exit(1);
});
