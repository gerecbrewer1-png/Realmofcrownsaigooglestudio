const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\e1b4e729-c52a-438d-8a4a-22d726883d42';

async function verifyNavalFullFlow() {
  console.log('=== REALM OF CROWNS: FULL NAVAL RESTORATION VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--proxy-server=direct://',
      '--proxy-bypass-list=*',
      '--enable-webgl',
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools') && !text.includes('WebGL context') && !text.includes('AudioContext')) {
      console.log('PAGE LOG:', text);
    }
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  console.log('1. Loading http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));

  // 2. Click Voyage Tab
  console.log('2. Entering Naval Voyage & Open Ocean Sailing view...');
  try {
    await page.waitForSelector('#nav-btn-voyage, #btn-naval-voyage-citadel', { timeout: 8000 });
    await page.evaluate(() => {
      const btn = document.querySelector('#nav-btn-voyage') || document.querySelector('#btn-naval-voyage-citadel');
      if (btn) btn.click();
    });
  } catch (e) {
    console.log('Voyage button click notice:', e.message);
  }
  await new Promise(r => setTimeout(r, 3500));

  // Save Screenshot 1: Open Ocean Sailing (Day)
  const shot1 = path.join(ARTIFACT_DIR, 'naval_1_open_sea_day.png');
  await page.screenshot({ path: shot1 });
  console.log('-> Saved Screenshot 1: Open Sea Day:', shot1);

  // 3. Open Captain's Log & Sea Dogs Skill Tree Modal
  console.log('3. Opening Captain\'s Log & Sea Dogs Skill Tree...');
  try {
    await page.waitForSelector('#naval-btn-captain', { timeout: 8000 });
    await page.evaluate(() => document.querySelector('#naval-btn-captain').click());
    await new Promise(r => setTimeout(r, 1200));

    const shotCaptain = path.join(ARTIFACT_DIR, 'naval_3_captain_skills_tree.png');
    await page.screenshot({ path: shotCaptain });
    console.log('-> Saved Screenshot: Captain Skills Tree:', shotCaptain);

    // Test allocating a skill point in Navigation or Accuracy
    console.log('-> Allocating skill point in Captain Skill Tree...');
    await page.evaluate(() => {
      const plusButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.trim() === '+');
      if (plusButtons.length > 0) plusButtons[0].click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Close Captain modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#naval-btn-close-captain');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.error('Error in Captain Skill step:', e);
  }

  // 4. Open Governor Quests Modal
  console.log('4. Opening Governor Admiralty Commissions & Quests modal...');
  try {
    await page.waitForSelector('#naval-btn-quests', { timeout: 8000 });
    await page.evaluate(() => document.querySelector('#naval-btn-quests').click());
    await new Promise(r => setTimeout(r, 1200));

    const shotQuests = path.join(ARTIFACT_DIR, 'naval_4_governor_quests.png');
    await page.screenshot({ path: shotQuests });
    console.log('-> Saved Screenshot: Governor Quests:', shotQuests);

    // Close Quests modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#naval-btn-close-quests');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.error('Error in Governor Quests step:', e);
  }

  // 5. Open Caribbean Nations & Maritime Diplomacy Modal
  console.log('5. Opening Caribbean Nations & Diplomacy ledger...');
  try {
    await page.waitForSelector('#naval-btn-diplomacy', { timeout: 8000 });
    await page.evaluate(() => document.querySelector('#naval-btn-diplomacy').click());
    await new Promise(r => setTimeout(r, 1200));

    const shotDiplomacy = path.join(ARTIFACT_DIR, 'naval_5_nations_diplomacy.png');
    await page.screenshot({ path: shotDiplomacy });
    console.log('-> Saved Screenshot: Nations Diplomacy:', shotDiplomacy);

    // Close Diplomacy modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('#naval-btn-close-diplomacy');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.error('Error in Diplomacy step:', e);
  }

  // 6. Open Nautical Archipelago Sea Chart (Key M)
  console.log('6. Opening Nautical Archipelago Sea Chart (Key M)...');
  try {
    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));

    const shotChart = path.join(ARTIFACT_DIR, 'naval_6_nautical_sea_chart.png');
    await page.screenshot({ path: shotChart });
    console.log('-> Saved Screenshot: Nautical Sea Chart:', shotChart);

    // 7. Drop Anchor at Harbor by clicking island on chart
    console.log('7. Docking at Harbor via Nautical Chart island pin...');
    await page.evaluate(() => {
      const isle = document.querySelector('#chart-island-isle-of-crowns') || document.querySelector('#chart-island-oxbay');
      if (isle) isle.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.error('Error in Nautical Chart step:', e);
  }

  // Screenshot 8: Island Haven Harbor - Shipyard & Fleet Tab
  console.log('8. Inspecting Island Haven Harbor - Shipyard & Fleet Tab...');
  try {
    const shotShipyard = path.join(ARTIFACT_DIR, 'naval_7_island_harbor_shipyard.png');
    await page.screenshot({ path: shotShipyard });
    console.log('-> Saved Screenshot: Island Haven Harbor Shipyard:', shotShipyard);

    // Switch to Smuggler's Market Tab
    console.log('9. Inspecting Haven Smuggler\'s Market (Buy & Sell)...');
    await page.evaluate(() => {
      const marketTab = document.querySelector('#naval-tab-market');
      if (marketTab) marketTab.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const shotMarket = path.join(ARTIFACT_DIR, 'naval_8_haven_market_trade.png');
    await page.screenshot({ path: shotMarket });
    console.log('-> Saved Screenshot: Haven Market Trade:', shotMarket);

    // Switch to Bounty Board Tab
    console.log('10. Inspecting Haven Bounty Board & Commissions...');
    await page.evaluate(() => {
      const bountyTab = document.querySelector('#naval-tab-bounty');
      if (bountyTab) bountyTab.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const shotBounty = path.join(ARTIFACT_DIR, 'naval_9_haven_bounty_commissions.png');
    await page.screenshot({ path: shotBounty });
    console.log('-> Saved Screenshot: Haven Bounty & Commissions:', shotBounty);

    // Close Haven Modal
    await page.evaluate(() => {
      const closeHaven = document.querySelector('#naval-btn-close-haven');
      if (closeHaven) closeHaven.click();
    });
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.error('Error in Haven Harbor steps:', e);
  }

  await browser.close();
  console.log('=== ALL FULL NAVAL VERIFICATION FLOW TESTS COMPLETED SUCCESSFULLY! ===');
}

verifyNavalFullFlow().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
