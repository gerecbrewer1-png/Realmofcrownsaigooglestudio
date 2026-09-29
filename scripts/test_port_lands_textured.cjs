const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testPortLands() {
  console.log('Testing Port Lands textured gradient, arrow keys movement, and NPC click navigation...');
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

  console.log('Opening Pirate Haven modal...');
  await page.waitForSelector('#naval-btn-pirate-haven', { timeout: 10000 });
  await page.click('#naval-btn-pirate-haven');
  await new Promise(r => setTimeout(r, 1500));

  console.log('Docking at Tortuga Pirate Haven...');
  const tortugaBtn = '#btn-voyage-tortuga-haven';
  await page.waitForSelector(tortugaBtn, { timeout: 8000 });
  await page.click(tortugaBtn);
  await new Promise(r => setTimeout(r, 5000));

  const shotDock = path.resolve(__dirname, '..', '08_port_lands_textured_dock.png');
  await page.screenshot({ path: shotDock });
  console.log('Saved textured dock screenshot:', shotDock);

  console.log('Testing Arrow keys movement...');
  await page.keyboard.down('ArrowUp');
  await new Promise(r => setTimeout(r, 1800));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await new Promise(r => setTimeout(r, 1200));
  await page.keyboard.up('ArrowRight');
  await new Promise(r => setTimeout(r, 2000));

  const shotArrow = path.resolve(__dirname, '..', '09_port_lands_arrow_walk.png');
  await page.screenshot({ path: shotArrow });
  console.log('Saved Arrow keys walk screenshot:', shotArrow);

  console.log('Testing NPC click navigation...');
  // Click on the screen near center-left where the Tavern / Market station beacon is
  await page.mouse.click(450, 420);
  await new Promise(r => setTimeout(r, 3000));

  const shotNpc = path.resolve(__dirname, '..', '10_port_lands_click_npc.png');
  await page.screenshot({ path: shotNpc });
  console.log('Saved NPC click screenshot:', shotNpc);

  await browser.close();
  console.log('Port Lands test completed successfully!');
}

testPortLands().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
