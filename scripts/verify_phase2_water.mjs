import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyPhase2() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
  console.log('=== VERIFYING PHASE 2: AAA OILY RIPPLING MIRROR WATER SHADER (MICROSOFT EDGE) ===');

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
  await new Promise(r => setTimeout(r, 2000));

  // 1. Switch to Naval Voyage Mode
  console.log('Navigating to Naval Voyage...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  // Measure FPS in Naval Voyage
  const navalFps = await page.evaluate(async () => {
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
  console.log(`Naval Voyage FPS: ${navalFps}`);

  // Capture screenshot of Naval Sea with Oily Mirror Water
  const navalScreenshotPath = path.join(artifactDir, 'phase2_naval_water_mirror.png');
  await page.screenshot({ path: navalScreenshotPath });
  console.log(`Saved Naval Water screenshot: ${navalScreenshotPath}`);

  // Test full sail movement to inspect wake and water ripples
  console.log('Testing Full Sail movement for wake rendering...');
  await page.evaluate(() => {
    if (window.__NAVAL_CONTROLS__) {
      window.__NAVAL_CONTROLS__.setSailSetting(1.0);
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  const wakeScreenshotPath = path.join(artifactDir, 'phase2_naval_wake_foam.png');
  await page.screenshot({ path: wakeScreenshotPath });
  console.log(`Saved Wake Foam screenshot: ${wakeScreenshotPath}`);

  // 2. Switch to 3D Haven / Port Haven
  console.log('Navigating to 3D Port Haven...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Harbor') || b.textContent.includes('Haven')));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  const havenScreenshotPath = path.join(artifactDir, 'phase2_port_haven_water.png');
  await page.screenshot({ path: havenScreenshotPath });
  console.log(`Saved Port Haven screenshot: ${havenScreenshotPath}`);

  console.log('\n--- JAVASCRIPT & SHADER ERRORS ---');
  if (pageErrors.length === 0) {
    console.log('ZERO JavaScript errors or shader compilation exceptions!');
  } else {
    pageErrors.forEach(e => console.log('ERROR:', e));
  }

  const shaderWarnings = consoleLogs.filter(l => l.toLowerCase().includes('shader') || l.toLowerCase().includes('gl'));
  if (shaderWarnings.length > 0) {
    console.log('Shader warnings:', shaderWarnings);
  } else {
    console.log('Zero shader warnings!');
  }

  await browser.close();
  console.log('=== PHASE 2 VERIFICATION COMPLETE ===');
}

verifyPhase2().catch(err => {
  console.error('Phase 2 verification error:', err);
  process.exit(1);
});
