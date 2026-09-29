import puppeteer from 'puppeteer-core';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function captureRepairedHUD() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-voyage-hud-'));

  console.log('=== CAPTURING REPAIRED VOYAGE DEV HUD ===');
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
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--user-data-dir=' + tempDir,
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  await page.goto('http://127.0.0.1:3000/#voyage', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
    if (typeof window.__NAVIGATE_TO_VOYAGE__ === 'function') {
      window.__NAVIGATE_TO_VOYAGE__();
    }
  });

  await page.waitForFunction(() => typeof window.__NAVAL_DIAGNOSTICS__ === 'object' && window.__NAVAL_DIAGNOSTICS__.drawCalls > 0, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Press F3 or click stats button to open DEV HUD
  await page.keyboard.press('F3');
  await new Promise(r => setTimeout(r, 800));

  const hudVisible = await page.evaluate(() => {
    const pill = document.getElementById('naval-dev-stats-pill');
    return !!pill;
  });
  console.log('HUD visible?', hudVisible);

  const screenshotPath = 'test_voyage_repaired_hud.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot with HUD:', screenshotPath);

  // Read diagnostics
  const diag = await page.evaluate(() => window.__NAVAL_DIAGNOSTICS__);
  console.log('DIAGNOSTICS REPORT:', JSON.stringify(diag, null, 2));

  await browser.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}

captureRepairedHUD().catch(console.error);
