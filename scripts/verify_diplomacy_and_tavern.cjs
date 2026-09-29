const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\e1b4e729-c52a-438d-8a4a-22d726883d42';

async function verifyDiplomacyAndTavern() {
  console.log('=== VERIFYING DIPLOMACY AND PIRATE TAVERN ===');
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

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  // Dismiss starter charter if open
  await page.evaluate(() => {
    const charter = document.querySelector('#claim-charter-btn');
    if (charter) charter.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Enter Voyage view
  console.log('Navigating to Voyage view...');
  await page.evaluate(() => {
    const btn = document.querySelector('#nav-btn-voyage') || document.querySelector('#btn-naval-voyage-citadel');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Open Caribbean Nations & Maritime Diplomacy Ledger
  console.log('1. Opening Nations & Diplomacy Ledger...');
  await page.evaluate(() => {
    const btn = document.querySelector('#naval-btn-diplomacy');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const shotDiplomacy = path.join(ARTIFACT_DIR, 'naval_5_nations_diplomacy.png');
  await page.screenshot({ path: shotDiplomacy });
  console.log('-> Saved Screenshot: Nations Diplomacy:', shotDiplomacy);

  // Close Diplomacy modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('#naval-btn-close-diplomacy');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Open Sea Chart and Dock at Isle of Crowns to inspect Tavern
  console.log('2. Opening Sea Chart and Docking at Haven...');
  await page.keyboard.press('KeyM');
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const isle = document.querySelector('#chart-island-isle-of-crowns') || document.querySelector('#chart-island-oxbay');
    if (isle) isle.click();
  });
  await new Promise(r => setTimeout(r, 1800));

  // Switch to Pirate Tavern tab
  console.log('3. Inspecting Pirate Tavern tab...');
  await page.evaluate(() => {
    const tab = document.querySelector('#naval-tab-tavern');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const shotTavern = path.join(ARTIFACT_DIR, 'naval_10_pirate_tavern.png');
  await page.screenshot({ path: shotTavern });
  console.log('-> Saved Screenshot: Pirate Tavern:', shotTavern);

  await browser.close();
  console.log('=== VERIFICATION OF DIPLOMACY AND TAVERN COMPLETED! ===');
}

verifyDiplomacyAndTavern().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
