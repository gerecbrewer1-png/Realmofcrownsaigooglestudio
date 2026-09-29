const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('--- VOYAGE PERFORMANCE PROFILER (BASELINE MEASUREMENT) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,720',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('error') || text.includes('Warning')) {
      console.log('BROWSER LOG:', text);
    }
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for React to mount
  await page.waitForSelector('#root', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss any starter modal if present
  try {
    const charterButton = await page.$('button');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && (text.includes('Charter') || text.includes('Claim') || text.includes('Accept') || text.includes('Begin'))) {
        console.log('Dismissing charter modal:', text);
        await btn.click();
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }
  } catch (e) {
    // Ignore modal dismissal failure
  }

  // Click Voyage tab
  console.log('Switching to Voyage tab...');
  const clickedVoyage = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const voyageBtn = buttons.find(b => b.innerText && b.innerText.toLowerCase().includes('voyage'));
    if (voyageBtn) {
      voyageBtn.click();
      return true;
    }
    return false;
  });

  if (!clickedVoyage) {
    console.error('Could not find Voyage tab button!');
    await browser.close();
    process.exit(1);
  }

  // Wait for __NAVAL_RENDERER__ to be initialized
  console.log('Waiting for Voyage 3D Scene initialization...');
  await page.waitForFunction(() => !!window.__NAVAL_RENDERER__, { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));

  // Helper function to sample performance over 60 frames
  async function samplePerformance(shipCount) {
    console.log(`Setting ship count to: ${shipCount}...`);
    await page.evaluate((count) => {
      if (window.__SET_NAVAL_SHIPS_COUNT__) {
        window.__SET_NAVAL_SHIPS_COUNT__(count);
      }
    }, shipCount);

    // Allow frames to stabilize
    await new Promise(r => setTimeout(r, 2000));

    // Sample across 60 frames
    const sample = await page.evaluate(async () => {
      const frames = [];
      const renderer = window.__NAVAL_RENDERER__;
      const scene = window.__NAVAL_SCENE__;

      let shadowCasters = 0;
      let totalMeshes = 0;
      let pointLights = 0;

      if (scene) {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            totalMeshes++;
            if (obj.castShadow) shadowCasters++;
          }
          if (obj.isPointLight) pointLights++;
        });
      }

      for (let i = 0; i < 60; i++) {
        await new Promise(r => requestAnimationFrame(r));
        const diag = window.__NAVAL_DIAGNOSTICS__ || {};
        frames.push({
          fps: diag.fps || 60,
          frameTimeMs: diag.frameTimeMs || 16.6,
          drawCalls: diag.drawCalls || 0,
          triangles: diag.triangles || 0,
          geometries: diag.geometries || 0,
          textures: diag.textures || 0,
          activeShips: diag.activeShips || 1,
        });
      }

      const avgFps = Math.round(frames.reduce((a, b) => a + b.fps, 0) / frames.length);
      const minFps = Math.min(...frames.map(f => f.fps));
      const maxFps = Math.max(...frames.map(f => f.fps));
      const avgFrameTimeMs = Math.round((frames.reduce((a, b) => a + b.frameTimeMs, 0) / frames.length) * 10) / 10;
      const avgDrawCalls = Math.round(frames.reduce((a, b) => a + b.drawCalls, 0) / frames.length);
      const avgTriangles = Math.round(frames.reduce((a, b) => a + b.triangles, 0) / frames.length);
      const latest = frames[frames.length - 1];

      return {
        shipCount: latest.activeShips,
        avgFps,
        minFps,
        maxFps,
        avgFrameTimeMs,
        drawCalls: avgDrawCalls,
        triangles: avgTriangles,
        geometries: latest.geometries,
        textures: latest.textures,
        totalMeshesInScene: totalMeshes,
        shadowCastingMeshes: shadowCasters,
        pointLightsInScene: pointLights,
      };
    });

    console.log(`Results for ${shipCount} ship(s):`, sample);
    return sample;
  }

  // Profile 1 ship, 5 ships, 10 ships
  const baselineResults = {
    timestamp: new Date().toISOString(),
    profileStage: 'BEFORE_OPTIMIZATION',
    ships1: await samplePerformance(1),
    ships5: await samplePerformance(5),
    ships10: await samplePerformance(10),
  };

  // Capture screenshot of baseline
  const artifactsDir = path.resolve(process.cwd(), '_development_artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const screenshotPath = path.join(artifactsDir, 'baseline_voyage_unoptimized.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved baseline screenshot to:', screenshotPath);

  const jsonPath = path.join(artifactsDir, 'baseline_measurements_before.json');
  fs.writeFileSync(jsonPath, JSON.stringify(baselineResults, null, 2));
  console.log('Saved baseline data to:', jsonPath);

  await browser.close();
  console.log('--- BASELINE PROFILING COMPLETE ---');
}

run().catch(err => {
  console.error('Profiling error:', err);
  process.exit(1);
});
