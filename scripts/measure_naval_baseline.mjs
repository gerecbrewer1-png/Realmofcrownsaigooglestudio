import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function measure() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-profile-'));

  console.log('=== LAUNCHING VOYAGE PERFORMANCE PROFILER ===');
  console.log('Using browser:', executablePath);
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

  page.on('console', msg => {
    console.log(`BROWSER_LOG [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log('PAGE_ERROR:', err.message, err.stack);
  });

  console.log('Navigating to http://127.0.0.1:3000/#voyage ...');
  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss Starter Charter modal if present
  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  console.log('Waiting for Naval Sea simulation to mount...');
  await page.waitForFunction(() => typeof window.__NAVAL_DIAGNOSTICS__ === 'object' && window.__NAVAL_DIAGNOSTICS__.drawCalls > 0, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  async function samplePerformance(shipCount) {
    console.log(`Setting active ship count to ${shipCount}...`);
    await page.evaluate((count) => {
      if (typeof window.__SET_NAVAL_SHIPS_COUNT__ === 'function') {
        window.__SET_NAVAL_SHIPS_COUNT__(count);
      }
    }, shipCount);

    await new Promise(r => setTimeout(r, 1200));

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
              textures: diag.textures || 0,
              activeShips: diag.activeShips || 0,
              lodCounts: diag.lodCounts || {},
            });
          }
        }
        requestAnimationFrame(loop);
      });
    });

    return sample;
  }

  const result1 = await samplePerformance(1);
  console.log('--- 1 SHIP (Player Flagship) ---', JSON.stringify(result1, null, 2));

  const result5 = await samplePerformance(5);
  console.log('--- 5 SHIPS ---', JSON.stringify(result5, null, 2));

  const result10 = await samplePerformance(10);
  console.log('--- 10 SHIPS ---', JSON.stringify(result10, null, 2));

  const fullReport = {
    oneShip: result1,
    fiveShips: result5,
    tenShips: result10,
  };

  fs.writeFileSync('voyage_profile_phase2.json', JSON.stringify(fullReport, null, 2));
  console.log('Saved voyage_profile_phase2.json');

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

measure().catch(err => {
  console.error('Measurement error:', err);
  process.exit(1);
});
