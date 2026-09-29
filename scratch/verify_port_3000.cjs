const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  console.log('[Verify] Connecting to Chrome...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--proxy-server=direct://',
        '--proxy-bypass-list=*',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser Error]:`, err));

    console.log('[Verify] Navigating to http://127.0.0.1:3000 ...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    console.log(`[Verify] Page Title: "${title}"`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshotPath = path.resolve('_development_artifacts', 'port_3000_running.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[Verify] Saved screenshot to ${screenshotPath}`);

    // Click World Map
    console.log('[Verify] Clicking World Map tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.innerText.includes('World Map'));
      if (mapBtn) mapBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mapScreenshotPath = path.resolve('_development_artifacts', 'port_3000_world_map.png');
    await page.screenshot({ path: mapScreenshotPath, fullPage: false });
    console.log(`[Verify] Saved screenshot to ${mapScreenshotPath}`);

    // Click Battle tab
    console.log('[Verify] Clicking Battle tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const battleBtn = btns.find(b => b.innerText.includes('Battle'));
      if (battleBtn) battleBtn.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    const battleScreenshotPath = path.resolve('_development_artifacts', 'port_3000_battle.png');
    await page.screenshot({ path: battleScreenshotPath, fullPage: false });
    console.log(`[Verify] Saved screenshot to ${battleScreenshotPath}`);

    const appRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        rootChildren: root ? root.children.length : 0,
        textSnippet: document.body.innerText.slice(0, 200)
      };
    });
    console.log('[Verify] App Root inspection:', JSON.stringify(appRoot, null, 2));

  } catch (err) {
    console.error('[Verify] Error during verification:', err);
  } finally {
    if (browser) await browser.close();
    console.log('[Verify] Finished.');
  }
})();
