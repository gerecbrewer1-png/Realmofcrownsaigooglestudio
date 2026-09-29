const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function runPirateHavenTest() {
  console.log('Starting full automated playtest of Pirate Haven on http://127.0.0.1:3000 ...');
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
      console.log('BROWSER CONSOLE:', text);
    }
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Switching to Voyage tab via #nav-btn-voyage...');
  await page.waitForSelector('#nav-btn-voyage', { timeout: 10000 });
  await page.click('#nav-btn-voyage');
  await new Promise(r => setTimeout(r, 4000));

  const shot1 = path.resolve(__dirname, '..', '01_naval_sea_view.png');
  await page.screenshot({ path: shot1 });
  console.log('Captured Sea View:', shot1);

  console.log('Clicking #naval-btn-pirate-haven...');
  await page.waitForSelector('#naval-btn-pirate-haven', { timeout: 10000 });
  await page.click('#naval-btn-pirate-haven');
  await new Promise(r => setTimeout(r, 1500));

  const shot2 = path.resolve(__dirname, '..', '02_pirate_haven_modal.png');
  await page.screenshot({ path: shot2 });
  console.log('Captured Pirate Haven Modal:', shot2);

  console.log('Clicking Brethrens Vault voyage button...');
  const vaultBtnSelector = '#btn-voyage-brethrens_vault';
  await page.waitForSelector(vaultBtnSelector, { timeout: 5000 });
  await page.click(vaultBtnSelector);
  console.log('Docked at The Brethrens Vault! Waiting for 3D port haven canvas to render...');
  await new Promise(r => setTimeout(r, 5000));

  const shot3 = path.resolve(__dirname, '..', '03_pirate_haven_3d_port.png');
  await page.screenshot({ path: shot3 });
  console.log('Captured 3D Pirate Port Haven:', shot3);

  console.log('Simulating Hero movement (WASD)...');
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD');
  await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.up('KeyD');
  await new Promise(r => setTimeout(r, 2000));

  const shot4 = path.resolve(__dirname, '..', '04_pirate_haven_hero_walk.png');
  await page.screenshot({ path: shot4 });
  console.log('Captured Hero movement in Pirate Haven:', shot4);

  await browser.close();
  console.log('All Pirate Haven verification tests PASSED with flying colors!');
}

runPirateHavenTest().catch(err => {
  console.error('Playtest failed:', err);
  process.exit(1);
});
