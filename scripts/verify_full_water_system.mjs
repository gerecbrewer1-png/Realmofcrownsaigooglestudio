import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyWaterSystem() {
  console.log('====================================================================');
  console.log('VERIFYING VOYAGE CENTURY PLAYCANVAS WATER & SHIP SYSTEM');
  console.log('====================================================================');

  // 1. Verify Package files on disk
  const packageDir = 'playcanvas_water_package';
  const expectedFiles = [
    'waterVertex.glsl',
    'waterFragment.glsl',
    'waterRenderer.js',
    'shipWake.js',
    'shipFoam.js',
    'underwater.js',
    'normalMap1.png',
    'normalMap2.png',
    'foamMap.png',
    'causticsMap.png',
  ];

  console.log('1. Checking delivered package files in playcanvas_water_package/:');
  let missingCount = 0;
  for (const f of expectedFiles) {
    const fullPath = path.join(packageDir, f);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`   ✓ ${f} (${stats.size} bytes)`);
    } else {
      console.error(`   ✗ MISSING: ${f}`);
      missingCount++;
    }
  }

  // 2. Launch Microsoft Edge
  console.log('\n2. Launching Microsoft Edge for PlayCanvas rendering verification...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1280,720',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  console.log('3. Loading http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss starter modal if present
  try {
    const claimBtn = await page.$('#claim-charter-btn');
    if (claimBtn) {
      console.log('   Dismissing charter modal...');
      await claimBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (e) {}

  // 4. Navigate directly into Naval Voyage
  console.log('4. Navigating to Naval Voyage mode...');
  await page.evaluate(() => {
    // Find voyage button
    const buttons = Array.from(document.querySelectorAll('button'));
    const voyageBtn = document.querySelector('#nav-btn-voyage') || buttons.find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (voyageBtn) voyageBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // 5. Switch to Voyage Century (PlayCanvas)
  console.log('5. Clicking "🌊 Voyage Century (PlayCanvas)" button...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#btn-switch-playcanvas-water') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Voyage Century'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log(`   Button found and clicked: ${clicked}`);
  await new Promise(r => setTimeout(r, 3000));

  // 6. Inspect PlayCanvas runtime state
  console.log('6. Inspecting PlayCanvas ocean runtime state...');
  const state = await page.evaluate(() => {
    const pcOcean = window.__PLAYCANVAS_OCEAN__;
    if (!pcOcean) {
      return { active: false, reason: 'window.__PLAYCANVAS_OCEAN__ is not set' };
    }

    const { app, ocean, ship, cameraEntity } = pcOcean;
    const mat = ocean.waterMaterial.material;

    const expectedUniforms = [
      'uTime',
      'uWaveStrength',
      'uWaveSpeed',
      'uWaveLength',
      'uNormalMap1',
      'uNormalMap2',
      'uFoamMap',
      'uCausticsMap',
      'uReflectionTexture',
      'uRefractionTexture',
      'uCameraPosition',
      'uLightDirection',
      'uDepthTexture',
    ];

    const boundUniforms = expectedUniforms.filter(u => mat.parameters[u] !== undefined);

    return {
      active: true,
      appName: app.graphicsDevice ? app.graphicsDevice.precision : 'unknown',
      oceanEntity: !!ocean.entity,
      shipEntity: !!ship,
      cameraEntity: !!cameraEntity,
      boundUniformCount: boundUniforms.length,
      boundUniforms,
      missingUniforms: expectedUniforms.filter(u => mat.parameters[u] === undefined),
      cameraPosition: cameraEntity.getPosition(),
    };
  });

  console.log('   Runtime Inspection:', JSON.stringify(state, null, 2));

  // 7. Capture Screenshot
  console.log('7. Capturing verification screenshot...');
  const screenshotPath = path.join(ARTIFACT_DIR, 'voyage_century_playcanvas_water.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`   Screenshot saved to: ${screenshotPath}`);

  await browser.close();

  console.log('\n====================================================================');
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`- Missing Package Files: ${missingCount}`);
  console.log(`- PlayCanvas Active: ${state.active}`);
  console.log(`- Bound Uniforms: ${state.boundUniformCount} / 13`);
  console.log(`- Page Exceptions: ${errors.length}`);
  console.log('====================================================================');
}

verifyWaterSystem().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
