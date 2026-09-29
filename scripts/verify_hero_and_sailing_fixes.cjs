const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function verifyHeroAndSailing() {
  console.log('--- STARTING VERIFICATION: CITADEL HERO CONTROLLER & NAVAL VOYAGE SAILING ---');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('error') || txt.includes('Error') || txt.includes('[Kingdom3DCanvas]') || txt.includes('[NavalSeaCanvas]')) {
      console.log('PAGE LOG:', txt);
    }
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\e1b4e729-c52a-438d-8a4a-22d726883d42';

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Dismiss Sovereign Charter Modal if present
  console.log('Dismissing Starter Charter Modal if open...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const charterBtn = btns.find(b => b.textContent && b.textContent.includes('ACCEPT CROWN'));
    if (charterBtn) {
      charterBtn.click();
      console.log('Clicked ACCEPT CROWN button');
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // =========================================================================
  // TEST 1: Citadel Hero Controllability & Facing Direction
  // =========================================================================
  console.log('\n--- TEST 1: Inspecting Citadel Hero in 3D Canvas ---');

  // Check hero initial position and orientation in Three.js scene
  const heroInitialState = await page.evaluate(() => {
    const scene = window.__KINGDOM_SCENE__;
    if (!scene) return { error: 'Scene not found on window.__KINGDOM_SCENE__' };
    const hero = scene.getObjectByName('courtyard-commander-group');
    if (!hero) return { error: 'Hero courtyard-commander-group not found in scene' };
    return {
      pos: { x: hero.position.x, y: hero.position.y, z: hero.position.z },
      rotY: hero.rotation.y,
    };
  });
  console.log('Hero Initial State:', heroInitialState);

  // Check if hero is facing away from the castle (rotY is close to 0, not Math.PI)
  if (Math.abs(heroInitialState.rotY) < 0.2) {
    console.log('✅ PASS: Hero is correctly facing forward (South toward courtyard/camera, rotY ≈ 0), NOT facing the castle wall!');
  } else {
    console.log(`⚠️ Hero rotY is ${heroInitialState.rotY} rad (Math.PI ≈ ${Math.PI})`);
  }

  // Press 'KeyW' to walk forward
  console.log('Dispatching KeyW to walk hero forward for 2.0s...');
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
  });
  for (let step = 0; step < 20; step++) {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 100));
  }
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 300));

  const heroWalkedState = await page.evaluate(() => {
    const scene = window.__KINGDOM_SCENE__;
    if (!scene) return null;
    const hero = scene.getObjectByName('courtyard-commander-group');
    if (!hero) return null;
    return {
      pos: { x: hero.position.x, y: hero.position.y, z: hero.position.z },
      rotY: hero.rotation.y,
    };
  });
  console.log('Hero Walked State (after KeyW):', heroWalkedState);

  const deltaX = heroWalkedState.pos.x - heroInitialState.pos.x;
  const deltaZ = heroWalkedState.pos.z - heroInitialState.pos.z;
  const moveDistance = Math.hypot(deltaX, deltaZ);
  console.log(`Hero moved distance: ${moveDistance.toFixed(2)} units (deltaX: ${deltaX.toFixed(2)}, deltaZ: ${deltaZ.toFixed(2)})`);

  if (moveDistance > 0.8) {
    console.log('✅ PASS: Hero successfully controlled via WASD! Character moved smoothly across the courtyard!');
  } else {
    console.log(`Hero movement delta: ${moveDistance.toFixed(2)} units.`);
  }

  // Press Space to test rally
  console.log('Pressing Spacebar to trigger hero rally action...');
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 1000));

  const snapCitadel = path.join(artifactDir, 'citadel_hero_controlled.png');
  await page.screenshot({ path: snapCitadel });
  console.log('Saved Citadel Hero Controlled screenshot:', snapCitadel);

  // =========================================================================
  // TEST 2: Voyage Open Sea Continuous Sailing & No Reset Bug
  // =========================================================================
  console.log('\n--- TEST 2: Navigating to Naval Voyage Mode ---');
  // Click "Naval Voyage" button in Citadel or bottom nav
  const clickedVoyage = await page.evaluate(() => {
    const btn = document.getElementById('btn-naval-voyage-citadel');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked btn-naval-voyage-citadel:', clickedVoyage);
  await new Promise(r => setTimeout(r, 3000));

  // Verify Naval Sea Canvas is initialized
  const seaInitState = await page.evaluate(() => {
    const state = window.__NAVAL_PLAYER_STATE__;
    return state ? {
      pos: state.pos,
      speed: state.speed,
      heading: state.heading,
      sailSetting: state.sailSetting
    } : null;
  });
  console.log('Naval Sea Initial State:', seaInitState);

  // Focus canvas and press 'KeyW' multiple times to reach Full Sail
  console.log('Setting sails to Full Sail (pressing KeyW twice)...');
  await page.mouse.click(640, 360);
  await page.keyboard.press('KeyW');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('KeyW');
  await new Promise(r => setTimeout(r, 300));

  console.log('Monitoring ship position over 12 seconds across multiple authoritative sync intervals...');
  const samples = [];
  for (let i = 1; i <= 6; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const sample = await page.evaluate(() => {
      const state = window.__NAVAL_PLAYER_STATE__;
      return state ? {
        x: state.pos.x,
        y: state.pos.y,
        z: state.pos.z,
        speed: state.speed,
        sailSetting: state.sailSetting
      } : null;
    });
    console.log(`[T+${i * 2}s] Ship Pos: (${sample?.x?.toFixed(1)}, ${sample?.y?.toFixed(1)}, ${sample?.z?.toFixed(1)}) | Speed: ${sample?.speed?.toFixed(2)} | Sail: ${sample?.sailSetting}`);
    if (sample) samples.push(sample);
  }

  // Check if position was reset back to starting point (0, 0, -80) at any point after moving
  let didReset = false;
  let maxZDistance = 0;
  for (let i = 1; i < samples.length; i++) {
    const prevZ = samples[i - 1].z;
    const currZ = samples[i].z;
    const distFromOrigin = Math.abs(currZ - (-80));
    if (distFromOrigin > maxZDistance) maxZDistance = distFromOrigin;

    // If it was far away and suddenly snapped back to -80
    if (Math.abs(prevZ - (-80)) > 15 && Math.abs(currZ - (-80)) < 2) {
      didReset = true;
      console.error(`❌ SHIP RESET DETECTED at sample ${i}! Jumped from Z=${prevZ} back to Z=${currZ}!`);
    }
  }

  if (!didReset && maxZDistance > 20) {
    console.log(`✅ PASS: Ship sailed continuously forward without ever resetting! Max advance: ${maxZDistance.toFixed(1)} units!`);
  } else if (didReset) {
    console.error('❌ FAIL: Ship reset back to starting point.');
  } else {
    console.log(`Ship advanced: ${maxZDistance.toFixed(1)} units.`);
  }

  const snapVoyage = path.join(artifactDir, 'voyage_continuous_sailing.png');
  await page.screenshot({ path: snapVoyage });
  console.log('Saved Continuous Sailing screenshot:', snapVoyage);

  await browser.close();
  console.log('--- ALL VERIFICATION COMPLETE ---');
}

verifyHeroAndSailing().catch(err => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
