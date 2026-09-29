import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function profileBottlenecks() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-perf-'));

  console.log('=== PROFILING VOYAGE PERFORMANCE BOTTLENECKS ===');
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

  // Profile across 60 frames
  const profileData = await page.evaluate(async () => {
    return new Promise(resolve => {
      let samples = 0;
      const results = {
        totalFrameTimes: [],
        fps: 0,
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        activeShips: 0,
        pirateStats: null,
      };

      let start = performance.now();
      let lastTime = start;

      function onFrame(now) {
        samples++;
        results.totalFrameTimes.push(now - lastTime);
        lastTime = now;

        if (samples < 30) {
          requestAnimationFrame(onFrame);
        } else {
          const elapsed = (now - start) / 1000;
          results.fps = Math.round(samples / elapsed);
          results.totalFrameTimes.sort((a, b) => a - b);
          results.medianFrameTime = results.totalFrameTimes[Math.floor(results.totalFrameTimes.length / 2)];

          const diag = window.__NAVAL_DIAGNOSTICS__ || {};
          results.drawCalls = diag.drawCalls;
          results.triangles = diag.triangles;
          results.geometries = diag.geometries;
          results.textures = diag.textures;
          results.activeShips = diag.activeShips;
          results.lodCounts = diag.lodCounts;
          results.qualityTier = diag.qualityTier;
          results.reflectionStatus = diag.reflectionStatus;
          results.shadowQuality = diag.shadowQuality;

          resolve(results);
        }
      }
      requestAnimationFrame(onFrame);
    });
  });

  console.log('PROFILE DATA:', JSON.stringify(profileData, null, 2));

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

profileBottlenecks().catch(console.error);
