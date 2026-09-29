const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

async function diagnose() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('--- LAUNCHING MICROSOFT EDGE DIAGNOSTICS ---');

  const failedRequests = [];
  const consoleLogs = [];
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

  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText
    });
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0', timeout: 30000 });

  console.log('\n--- FAILED NETWORK REQUESTS (404s / Errors) ---');
  if (failedRequests.length === 0) {
    console.log('No failed network requests!');
  } else {
    failedRequests.forEach(r => console.log(`FAIL: ${r.url} - ${r.status || r.failure}`));
  }

  console.log('\n--- JAVASCRIPT PAGE ERRORS ---');
  if (pageErrors.length === 0) {
    console.log('No JavaScript uncaught exceptions!');
  } else {
    pageErrors.forEach(e => console.log(`ERROR: ${e}`));
  }

  console.log('\n--- RELEVANT CONSOLE WARNINGS / LOGS ---');
  const filteredLogs = consoleLogs.filter(l => 
    !l.includes('React DevTools') && 
    !l.includes('[vite]') &&
    !l.includes('injected env')
  );
  filteredLogs.slice(-25).forEach(l => console.log(l));

  // Measure FPS in Citadel
  console.log('\n--- MEASURING CITADEL FPS & FRAME TIME ---');
  const fpsData = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      let start = performance.now();
      const frameTimes = [];
      let last = start;

      function loop(now) {
        frames++;
        frameTimes.push(now - last);
        last = now;
        if (now - start < 3000) {
          requestAnimationFrame(loop);
        } else {
          const elapsed = (now - start) / 1000;
          const fps = frames / elapsed;
          frameTimes.sort((a, b) => a - b);
          const median = frameTimes[Math.floor(frameTimes.length / 2)];
          const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
          resolve({
            fps: Math.round(fps),
            medianMs: median.toFixed(2),
            p95Ms: p95.toFixed(2),
            totalFrames: frames
          });
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Citadel Performance:', fpsData);

  // Check scene objects and renderer info
  console.log('\n--- THREE.JS RENDERER STATS ---');
  const renderStats = await page.evaluate(() => {
    const scene = window.__KINGDOM_SCENE__;
    const renderer = window.__THREE_RENDERER__;
    let meshCount = 0;
    let triCount = 0;
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh) {
          meshCount++;
          if (obj.geometry && obj.geometry.index) {
            triCount += obj.geometry.index.count / 3;
          } else if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
            triCount += obj.geometry.attributes.position.count / 3;
          }
        }
      });
    }
    return {
      hasScene: !!scene,
      meshCount,
      estimatedTriangles: Math.round(triCount)
    };
  });
  console.log('Render stats:', renderStats);

  // Check controls and event listeners
  console.log('\n--- INPUT & CONTROLS CHECK ---');
  const inputCheck = await page.evaluate(() => {
    const hero = window.__KINGDOM_SCENE__?.getObjectByName('courtyard-commander-group');
    const hasHero = !!hero;
    return {
      hasHeroGroup: hasHero,
      heroPosition: hero ? { x: hero.position.x, y: hero.position.y, z: hero.position.z } : null
    };
  });
  console.log('Input & Hero check:', inputCheck);

  // Navigate to Voyage mode
  console.log('\n--- SWITCHING TO NAVAL VOYAGE MODE ---');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const voyageFps = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      let start = performance.now();
      const frameTimes = [];
      let last = start;
      function loop(now) {
        frames++;
        frameTimes.push(now - last);
        last = now;
        if (now - start < 3000) {
          requestAnimationFrame(loop);
        } else {
          const elapsed = (now - start) / 1000;
          resolve({
            fps: Math.round(frames / elapsed),
            totalFrames: frames
          });
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Naval Voyage FPS:', voyageFps);

  const voyageState = await page.evaluate(() => {
    return {
      navalPlayerState: window.__NAVAL_PLAYER_STATE__,
      hasNavalCanvas: !!document.querySelector('canvas')
    };
  });
  console.log('Voyage State:', voyageState);

  await browser.close();
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
