const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testNormalPortVillage() {
  console.log('Testing Normal Port Village, Mediterranean Street, Rope-Wrapped Pilings & Waterfront...');
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

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools') && !text.includes('WebGL context') && !text.includes('AudioContext')) {
      console.log('BROWSER LOG:', text);
    }
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Switching to Voyage tab...');
  await page.waitForSelector('#nav-btn-voyage', { timeout: 10000 });
  await page.click('#nav-btn-voyage');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Opening Nautical Sea Chart modal...');
  await page.waitForSelector('#naval-btn-sea-chart', { timeout: 10000 });
  await page.click('#naval-btn-sea-chart');
  await new Promise(r => setTimeout(r, 1500));

  console.log('Docking at Oxbay (Normal Colonial / Mediterranean Port) via Sea Chart...');
  await page.waitForSelector('#chart-island-oxbay', { timeout: 8000 });
  await page.click('#chart-island-oxbay');
  await new Promise(r => setTimeout(r, 6000));

  // 1. Capture the bustling village street thoroughfare (Reference Image 1)
  // Rotate camera slightly to look into the market avenue with multi-tier houses, striped awnings, and crates
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(560, 390, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1500));

  const shot1 = path.resolve(__dirname, '..', '14_normal_port_village_street.png');
  await page.screenshot({ path: shot1 });
  console.log('Saved Normal Port Village Street screenshot:', shot1);

  // 2. Smoothly walk towards the waterfront pier (Reference Image 2)
  console.log('Walking hero smoothly down the avenue towards the waterfront pier...');
  await page.keyboard.down('ArrowDown');
  await new Promise(r => setTimeout(r, 2600));
  await page.keyboard.up('ArrowDown');
  await new Promise(r => setTimeout(r, 1000));

  // Rotate camera to frame the wooden pier, rope-wrapped pilings, seated maidens, and tall ship
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(860, 350, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1500));

  const shot2 = path.resolve(__dirname, '..', '15_normal_port_pier_and_tall_ship.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved Normal Port Pier & Tall Ship screenshot:', shot2);

  // 3. Interact with Villager / Harbor Maiden / Sentry Guard
  console.log('Interacting with Villager / Harbor Maiden / Guard...');
  // Click on the prompt or press KeyE
  await page.keyboard.press('KeyE');
  await new Promise(r => setTimeout(r, 1200));

  const promptBtn = await page.$('#btn-station-interact-prompt');
  if (promptBtn) {
    console.log('Clicking prompt button #btn-station-interact-prompt...');
    await promptBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  } else {
    // Click near Maiden Clara on the left pier barrel
    console.log('Clicking near villager on pier barrel...');
    await page.mouse.click(420, 520);
    await new Promise(r => setTimeout(r, 1500));
  }

  const shot3 = path.resolve(__dirname, '..', '16_normal_port_villager_dialogue.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved Normal Port Villager Dialogue screenshot:', shot3);

  await browser.close();
  console.log('All normal port village tests finished successfully!');
}

testNormalPortVillage().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
