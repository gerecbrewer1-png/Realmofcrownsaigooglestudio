const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testWorldMapInteractions() {
  console.log('Testing World Map glide navigation and Sail Ocean transition...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

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
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Switching to World Map...');
  await page.waitForSelector('#nav-btn-map', { timeout: 10000 });
  await page.click('#nav-btn-map');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Gliding camera across the open world map using Arrow keys...');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowRight');
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('ArrowRight');
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 1500));

  const shotGlided = path.resolve(__dirname, '..', '06_world_map_glided.png');
  await page.screenshot({ path: shotGlided });
  console.log('Captured glided World Map screenshot:', shotGlided);

  console.log('Testing "Sail Ocean" button transition...');
  const clickedSail = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sailBtn = buttons.find(b => b.textContent && b.textContent.includes('Sail Ocean'));
    if (sailBtn) {
      sailBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Sail Ocean button:', clickedSail);

  await new Promise(r => setTimeout(r, 4000));

  const shotSail = path.resolve(__dirname, '..', '07_world_map_to_voyage.png');
  await page.screenshot({ path: shotSail });
  console.log('Captured transition to Naval Voyage from World Map:', shotSail);

  await browser.close();
  console.log('World Map interaction tests completed successfully.');
}

testWorldMapInteractions().catch(err => {
  console.error('World map interaction failed:', err);
  process.exit(1);
});
