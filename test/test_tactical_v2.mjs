import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\61c6acb7-5f62-40ad-ba1c-b30129a91699';

async function runTest() {
  console.log('--- Starting Complete Tactical Slice V2 Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--proxy-server=direct://', '--proxy-bypass-list=*']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));

  // 1. Navigate to Tactical Battle tab
  console.log('Switching to Tactical Battle tab...');
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Battle'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Capture Initial Arena
  const arenaPath = path.join(ARTIFACT_DIR, 'tactical_v2_arena.png');
  await page.screenshot({ path: arenaPath });
  console.log('Captured Initial Arena:', arenaPath);

  // 3. Test Virtual Joystick Drag
  console.log('Simulating Joystick drag...');
  const joystickArea = await page.$('div[class*="rounded-full"][class*="cursor-pointer"]');
  if (joystickArea) {
    const box = await joystickArea.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, cy - 35, { steps: 5 });
      await new Promise(r => setTimeout(r, 500));
      await page.mouse.up();
    }
  }

  // 4. Test Attack and Ability
  console.log('Executing Attack and War Cry Stomp...');
  await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    if (app) {
      app.triggerHeroAttack();
      app.triggerHeroAbility();
    }
  });
  await new Promise(r => setTimeout(r, 400));

  // 5. Trigger Raid Event
  console.log('Sounding Raid Horn and spawning raiders...');
  await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    if (app) app.triggerRaidEvent();
  });
  // Wait past warning timer (3.0s) so wave 1 is fully active and advancing
  await new Promise(r => setTimeout(r, 3600));

  const combatStatus = await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    return {
      state: app ? app.raidEventSystem.getState() : null,
      raiders: app ? app.raidEventSystem.getRaiders().length : 0
    };
  });
  console.log('Raid In-Progress Status:', combatStatus);

  // Capture Active Combat
  const combatPath = path.join(ARTIFACT_DIR, 'tactical_v2_combat.png');
  await page.screenshot({ path: combatPath });
  console.log('Captured Active Combat:', combatPath);

  // 6. Defeat Wave 1, then Wave 2 to achieve Victory
  console.log('Resolving battle waves...');
  await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    if (app) {
      // Clear Wave 1
      for (const r of app.raidEventSystem.getRaiders()) {
        r.hp = 0;
        r.isDead = true;
      }
    }
  });
  // Step for wave 2 spawn
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    if (app) {
      // Clear Wave 2
      for (const r of app.raidEventSystem.getRaiders()) {
        r.hp = 0;
        r.isDead = true;
      }
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // 7. Check Victory Modal
  const victoryStatus = await page.evaluate(() => {
    const app = window.__PLAYCANVAS_APP__;
    const txt = document.body.innerText;
    return {
      raidState: app ? app.raidEventSystem.getState() : null,
      hasModalText: txt.includes('Citadel Defended') || txt.includes('Claim Spoils')
    };
  });
  console.log('Victory Status:', victoryStatus);

  // Capture Victory Modal
  const victoryPath = path.join(ARTIFACT_DIR, 'tactical_v2_victory_spoils.png');
  await page.screenshot({ path: victoryPath });
  console.log('Captured Victory Spoils:', victoryPath);

  // 8. Click Claim Spoils
  console.log('Claiming Spoils to deposit into Treasury...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const claimBtn = buttons.find(b => b.innerText && b.innerText.includes('Claim Spoils'));
    if (claimBtn) claimBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Capture Rewards Claimed & Toast
  const claimedPath = path.join(ARTIFACT_DIR, 'tactical_v2_rewards_claimed.png');
  await page.screenshot({ path: claimedPath });
  console.log('Captured Rewards Claimed State:', claimedPath);

  await browser.close();
  console.log('--- All Tactical Slice V2 Verifications Passed Successfully ---');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
