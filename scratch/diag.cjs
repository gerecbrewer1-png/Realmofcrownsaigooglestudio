const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => console.log('PAGE LOG [' + msg.type() + ']:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to http://127.0.0.1:3000...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'load', timeout: 20000 });
  console.log('Loaded! Waiting 3s for 3D canvas render...');

  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'citadel_view.png' });
  console.log('Citadel screenshot saved to citadel_view.png');

  // Look for World Map button
  const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
  console.log('Buttons on screen:', buttons.slice(0, 15));

  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const worldBtn = btns.find(b => b.textContent.includes('World') || b.title?.includes('World'));
    if (worldBtn) {
      worldBtn.click();
      return true;
    }
    return false;
  });

  console.log('Clicked World button:', clicked);
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'world_view.png' });
  console.log('World screenshot saved to world_view.png');

  await browser.close();
  console.log('Diagnosis complete.');
})().catch(e => console.error('Script error:', e));
