const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testNavalVoyage() {
  console.log('Testing Naval Voyage & Pirate Haven at http://127.0.0.1:3000 ...');
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
      console.log('PAGE LOG:', text);
    }
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Clicking Naval Voyage button...');
  const clickedVoyage = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div, span'));
    const voyageBtn = buttons.find(b => b.textContent && (b.textContent.includes('Naval Voyage') || b.textContent.trim() === 'Voyage'));
    if (voyageBtn) {
      voyageBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked voyage button:', clickedVoyage);

  await new Promise(r => setTimeout(r, 4000));

  const voyageOutPath = path.resolve(__dirname, '..', 'naval_voyage_verified.png');
  await page.screenshot({ path: voyageOutPath });
  console.log('Saved voyage screenshot:', voyageOutPath);

  // Now click Pirate Haven button if present
  console.log('Looking for Pirate Haven button...');
  const clickedPirate = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div, span'));
    const pirateBtn = buttons.find(b => b.textContent && b.textContent.includes('Pirate Haven'));
    if (pirateBtn) {
      pirateBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked pirate haven button:', clickedPirate);

  await new Promise(r => setTimeout(r, 2000));

  const pirateOutPath = path.resolve(__dirname, '..', 'pirate_haven_modal_verified.png');
  await page.screenshot({ path: pirateOutPath });
  console.log('Saved pirate haven modal screenshot:', pirateOutPath);

  await browser.close();
  console.log('Test completed successfully.');
}

testNavalVoyage().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
