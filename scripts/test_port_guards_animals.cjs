const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testGuardsAndAnimals() {
  console.log('Testing Armored NPC Guards, Village Animals, and Smooth Movement...');
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

  console.log('Docking at Tortuga Pirate Haven to inspect Guards & Animals...');
  await page.waitForSelector('#btn-voyage-tortuga-haven', { timeout: 8000 });
  await page.click('#btn-voyage-tortuga-haven');
  await new Promise(r => setTimeout(r, 5000));

  // Rotate camera slightly to see guards at the pier entrance
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(720, 360, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await new Promise(r => setTimeout(r, 1000));

  const shot1 = path.resolve(__dirname, '..', '11_port_guards_and_animals.png');
  await page.screenshot({ path: shot1 });
  console.log('Saved Guards & Animals screenshot:', shot1);

  console.log('Testing smooth hero movement with Arrow keys...');
  // Hold ArrowUp smoothly
  await page.keyboard.down('ArrowUp');
  await new Promise(r => setTimeout(r, 2000));
  await page.keyboard.up('ArrowUp');
  // Hold ArrowLeft smoothly
  await page.keyboard.down('ArrowLeft');
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.up('ArrowLeft');
  await new Promise(r => setTimeout(r, 2000));

  const shot2 = path.resolve(__dirname, '..', '12_hero_smooth_movement.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved Smooth Hero Movement screenshot:', shot2);

  console.log('Triggering interaction with NPC Guard / Animal...');
  // Click on the guard on the right side of the plaza (Quartermaster Redbeard)
  await page.mouse.click(1200, 435);
  await new Promise(r => setTimeout(r, 2500));

  // Press KeyE to interact
  await page.keyboard.press('KeyE');
  await new Promise(r => setTimeout(r, 1000));

  const promptBtn = await page.$('#btn-station-interact-prompt');
  if (promptBtn) {
    console.log('Clicking #btn-station-interact-prompt...');
    await promptBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const shot3 = path.resolve(__dirname, '..', '13_guard_dialogue_card.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved Guard Dialogue Card screenshot:', shot3);

  await browser.close();
  console.log('All tests finished successfully!');
}

testGuardsAndAnimals().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
