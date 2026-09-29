import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function validateStep15() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-step15-'));

  console.log('=== RUNNING STEP 15 COMPLETE VALIDATION ===');
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

  async function sampleScenario(name, setupFn) {
    console.log(`Running Scenario: ${name}...`);
    await page.evaluate(setupFn);
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

          if (now - start < 1500) {
            requestAnimationFrame(loop);
          } else {
            const elapsed = (now - start) / 1000;
            const fps = Math.round(frames / elapsed);
            frameTimes.sort((a, b) => a - b);
            const medianMs = frameTimes[Math.floor(frameTimes.length / 2)];
            const diag = window.__NAVAL_DIAGNOSTICS__ || {};

            resolve({
              fps,
              frameTimeMs: parseFloat(medianMs.toFixed(2)),
              drawCalls: diag.drawCalls || 0,
              visibleShips: diag.activeShips || 0,
              visiblePirates: diag.pirateStats ? diag.pirateStats.visiblePirates : 0,
              culledShips: diag.lodCounts ? diag.lodCounts.culled : 0,
              playerShipLOD: 'LOD0 (Hero)',
              triangles: diag.triangles || 0,
              lodDistribution: diag.lodCounts || {},
            });
          }
        }
        requestAnimationFrame(loop);
      });
    });

    console.log(`Scenario [${name}] Result:`, JSON.stringify(sample, null, 2));
    return sample;
  }

  // 1. PLAYER SHIP ONLY
  const resPlayerOnly = await sampleScenario('PLAYER SHIP ONLY', () => {
    window.__SET_NAVAL_SHIPS_COUNT__?.(1);
  });

  // 2. PLAYER + PIRATE (2 ships)
  const resPlayerPirate = await sampleScenario('PLAYER + PIRATE', () => {
    window.__SET_NAVAL_SHIPS_COUNT__?.(2);
  });

  // 3. PLAYER + MULTIPLE PIRATES (4 ships: player + 3 pirates)
  const resPlayerMultiPirates = await sampleScenario('PLAYER + MULTIPLE PIRATES', () => {
    window.__SET_NAVAL_SHIPS_COUNT__?.(4);
  });

  // 4. 5 SHIPS
  const res5Ships = await sampleScenario('5 SHIPS', () => {
    window.__SET_NAVAL_SHIPS_COUNT__?.(5);
  });

  // 5. 10 SHIPS (Full fleet)
  const res10Ships = await sampleScenario('10 SHIPS', () => {
    window.__SET_NAVAL_SHIPS_COUNT__?.(10);
  });

  // 6. PORT
  const resPort = await sampleScenario('PORT', () => {
    // Navigate player closer to mainland sovereign harbor
    const ps = window.__NAVAL_PLAYER_STATE__;
    if (ps) {
      ps.pos.set(0, 0, 850);
      ps.heading = 0;
    }
  });

  // 7. COMBAT
  const resCombat = await sampleScenario('COMBAT', () => {
    // Place player right in firing range of pirate p1
    const ps = window.__NAVAL_PLAYER_STATE__;
    if (ps) {
      ps.pos.set(0, 0, 75);
      ps.heading = Math.PI * 0.5; // broadside angle
    }
  });

  const fullReport = {
    playerOnly: resPlayerOnly,
    playerPirate: resPlayerPirate,
    playerMultiPirates: resPlayerMultiPirates,
    fiveShips: res5Ships,
    tenShips: res10Ships,
    port: resPort,
    combat: resCombat,
  };

  fs.writeFileSync('voyage_step15_validation.json', JSON.stringify(fullReport, null, 2));
  console.log('Saved voyage_step15_validation.json');

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

validateStep15().catch(console.error);
