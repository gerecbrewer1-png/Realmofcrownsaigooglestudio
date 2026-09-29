import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function compareOffVsOn() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-compare-'));

  console.log('=== RUNNING OPTIMIZATION OFF VS ON COMPARISON ===');
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

  await page.waitForFunction(() => typeof window.__NAVAL_DIAGNOSTICS__ === 'object' && window.__NAVAL_DIAGNOSTICS__.drawCalls > 0, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  async function sampleScene(name, configFn) {
    console.log(`Setting up ${name}...`);
    await page.evaluate(configFn);
    await new Promise(r => setTimeout(r, 1500));

    const sample = await page.evaluate(async () => {
      return new Promise(resolve => {
        let frames = 0;
        const frameTimes = [];
        let start = performance.now();
        let last = start;

        function loop(now) {
          frames++;
          frameTimes.push(now - last);
          last = now;

          if (now - start < 2000) {
            requestAnimationFrame(loop);
          } else {
            const elapsed = (now - start) / 1000;
            const fps = Math.round(frames / elapsed);
            frameTimes.sort((a, b) => a - b);
            const medianMs = frameTimes[Math.floor(frameTimes.length / 2)];
            const diag = window.__NAVAL_DIAGNOSTICS__ || {};

            resolve({
              fps,
              medianFrameTimeMs: parseFloat(medianMs.toFixed(2)),
              drawCalls: diag.drawCalls || 0,
              triangles: diag.triangles || 0,
              geometries: diag.geometries || 0,
              activeShips: diag.activeShips || 0,
              visiblePirates: diag.pirateStats ? diag.pirateStats.visiblePirates : 0,
              visibleNPCs: diag.npcStats ? diag.npcStats.visible : 0,
              lodCounts: diag.lodCounts || {},
              qualityTier: diag.qualityTier,
            });
          }
        }
        requestAnimationFrame(loop);
      });
    });

    console.log(`${name} Results:`, JSON.stringify(sample, null, 2));
    return sample;
  }

  // TEST A: Optimizations ON (Phase 2 Repaired)
  const testA = await sampleScene('TEST A (Optimizations ON)', () => {
    if (typeof window.__SET_VOYAGE_QUALITY_TIER__ === 'function') {
      window.__SET_VOYAGE_QUALITY_TIER__('HIGH');
    }
    if (typeof window.__VOYAGE_DEBUG_SWITCHES__ === 'object') {
      window.__VOYAGE_DEBUG_SWITCHES__.shipLODEnabled = true;
      window.__VOYAGE_DEBUG_SWITCHES__.forceLOD0OnAllPirates = false;
      window.__VOYAGE_DEBUG_SWITCHES__.frustumCullingEnabled = false;
    }
  });

  // TEST B: Optimizations OFF (All ships forced to LOD0, full reflection every frame)
  const testB = await sampleScene('TEST B (Optimizations OFF)', () => {
    if (typeof window.__SET_VOYAGE_QUALITY_TIER__ === 'function') {
      window.__SET_VOYAGE_QUALITY_TIER__('ULTRA'); // reflection every frame
    }
    if (typeof window.__VOYAGE_DEBUG_SWITCHES__ === 'object') {
      window.__VOYAGE_DEBUG_SWITCHES__.shipLODEnabled = false; // all LOD0
      window.__VOYAGE_DEBUG_SWITCHES__.forceLOD0OnAllPirates = true;
    }
  });

  const comparison = { testA_Optimized: testA, testB_Unoptimized: testB };
  fs.writeFileSync('voyage_compare_off_vs_on.json', JSON.stringify(comparison, null, 2));
  console.log('Saved voyage_compare_off_vs_on.json');

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

compareOffVsOn().catch(console.error);
