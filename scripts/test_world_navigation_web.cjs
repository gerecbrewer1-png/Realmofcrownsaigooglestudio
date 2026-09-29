const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testWorldNavigationWeb() {
  console.log('Launching Chrome to inspect http://127.0.0.1:3000 ...');
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
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('Waiting 12s for Godot WASM/PCK engine to load into Main Menu...');
  await new Promise(r => setTimeout(r, 12000));

  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\e1b4e729-c52a-438d-8a4a-22d726883d42';

  // Step 1: In Main Menu, click "Begin Campaign" at (640, 430)
  console.log('Clicking "Begin Campaign" at (640, 430)...');
  await page.mouse.click(640, 430);
  await new Promise(r => setTimeout(r, 4500));

  const snapTown = path.join(artifactDir, 'web_port_town_oxbay.png');
  await page.screenshot({ path: snapTown });
  console.log('Saved Oxbay Port Town screenshot:', snapTown);

  // Step 2: Test Navigation toolbar - Click "⛵ Set Sail to Ocean" at (120, 75)
  console.log('Clicking "Set Sail to Ocean" on Navigation Toolbar (X=120, Y=75)...');
  await page.mouse.click(120, 75);
  await new Promise(r => setTimeout(r, 4500));

  const snapOcean = path.join(artifactDir, 'web_open_sea_sailing.png');
  await page.screenshot({ path: snapOcean });
  console.log('Saved Open Sea Sailing screenshot:', snapOcean);

  // Step 3: Open Sea Chart by clicking "🗺️ Sea Chart (M)" button (X=1160, Y=31)
  console.log('Opening Sea Chart (X=1160, Y=31)...');
  await page.mouse.click(1160, 31);
  await new Promise(r => setTimeout(r, 2000));

  const snapChart = path.join(artifactDir, 'web_sea_chart.png');
  await page.screenshot({ path: snapChart });
  console.log('Saved Sea Chart screenshot:', snapChart);

  // Step 4: Click Redmond on the sea chart (X=581, Y=414)
  console.log('Selecting Redmond on Sea Chart (X=581, Y=414)...');
  await page.mouse.click(581, 414);
  await new Promise(r => setTimeout(r, 1500));

  const snapPrompt = path.join(artifactDir, 'web_voyage_prompt.png');
  await page.screenshot({ path: snapPrompt });
  console.log('Saved Voyage Prompt screenshot:', snapPrompt);

  // Step 5: Click "Fast Voyage & Landfall" button (center X=640, Y=545)
  console.log('Clicking "Fast Voyage & Landfall" (X=640, Y=545)...');
  await page.mouse.click(640, 545);
  await new Promise(r => setTimeout(r, 5500));

  const snapRedmond = path.join(artifactDir, 'web_port_town_redmond.png');
  await page.screenshot({ path: snapRedmond });
  console.log('Saved Redmond Port Town screenshot:', snapRedmond);

  // Step 6: Click "🍺 Tavern" on Navigation Toolbar (X=240, Y=75)
  console.log('Clicking "Tavern" on Navigation Toolbar (X=240, Y=75)...');
  await page.mouse.click(240, 75);
  await new Promise(r => setTimeout(r, 2500));

  const snapTavern = path.join(artifactDir, 'web_tavern_navigation.png');
  await page.screenshot({ path: snapTavern });
  console.log('Saved Tavern Navigation screenshot:', snapTavern);

  await browser.close();
  console.log('Web verification completed successfully!');
}

testWorldNavigationWeb().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
