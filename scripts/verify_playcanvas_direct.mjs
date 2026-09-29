import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyDirect() {
  console.log('=== VERIFYING PLAYCANVAS WATER SYSTEM DIRECTLY IN EDGE ===');

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
      console.error('[BROWSER ERROR]', msg.text());
      errors.push(msg.text());
    } else if (msg.type() === 'warn') {
      // console.warn('[BROWSER WARN]', msg.text());
    } else {
      console.log('[BROWSER]', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[PAGE EXCEPTION]', err.message);
    errors.push(err.message);
  });

  console.log('1. Navigating directly to http://localhost:3000/?voyage=1&playcanvas=1 ...');
  await page.goto('http://localhost:3000/?voyage=1&playcanvas=1', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });

  console.log('2. Waiting 6.0 seconds for PlayCanvas shaders and scene to render...');
  await new Promise(r => setTimeout(r, 6000));

  // Inspect PlayCanvas state
  console.log('3. Inspecting PlayCanvas ocean state...');
  const state = await page.evaluate(() => {
    const pcOcean = window.__PLAYCANVAS_OCEAN__;
    if (!pcOcean) {
      return { active: false, reason: '__PLAYCANVAS_OCEAN__ not on window' };
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
      oceanEntity: ocean.entity.name,
      oceanTags: Array.from(ocean.entity.tags.list()),
      shipEntity: ship.name,
      cameraPos: cameraEntity.getPosition(),
      boundUniformCount: boundUniforms.length,
      boundUniforms,
      missingUniforms: expectedUniforms.filter(u => mat.parameters[u] === undefined),
    };
  });

  console.log('Inspection State:', JSON.stringify(state, null, 2));

  // Capture canvas dataURL
  console.log('4. Capturing canvas frame...');
  const screenshotPath = path.join(ARTIFACT_DIR, 'voyage_century_playcanvas_water_live.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to: ${screenshotPath}`);

  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`- Active: ${state.active}`);
  console.log(`- Bound Uniforms: ${state.boundUniformCount} / 13`);
  console.log(`- Browser Errors: ${errors.length}`);
  console.log('Done!');
}

verifyDirect().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
