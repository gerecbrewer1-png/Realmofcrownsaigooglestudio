const os = require('os');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\8ea779ad-d60f-47ca-b3ed-895cb6604a71';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function captureVoyage() {
  const tempProfile = path.join(os.tmpdir(), 'edge_voyage_capture_' + Date.now());
  console.log('Launching Microsoft Edge with isolated profile:', tempProfile);

  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1536,900',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1536, height: 900 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('identitytoolkit') && !txt.includes('favicon')) {
          console.warn('Browser console error:', txt);
        }
      }
    });

    console.log('Navigating to http://127.0.0.1:3000 ...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('DOM Content Loaded!');
    await new Promise((r) => setTimeout(r, 1500));

    // Dismiss modals via DOM click to prevent CDP animation hang
    await page.evaluate(() => {
      const closeB = document.getElementById('close-building-modal-btn');
      if (closeB) closeB.click();
      const claimB = document.getElementById('claim-charter-btn');
      if (claimB) claimB.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Switch to Naval Voyage
    console.log('Navigating to Naval Voyage...');
    const switched = await page.evaluate(() => {
      const headerBtn = document.getElementById('header-voyage-btn');
      if (headerBtn) {
        headerBtn.click();
        return 'header';
      }
      const navBtn = document.getElementById('nav-btn-voyage');
      if (navBtn) {
        navBtn.click();
        return 'nav';
      }
      return false;
    });
    console.log('Navigation trigger result:', switched);

    // Wait 5 seconds for ocean, tall ship, and karst gorge to render
    console.log('Waiting 5s for 3D ocean, tall ship, and karst gorge render...');
    await new Promise((r) => setTimeout(r, 5000));

    const outPath = path.join(ARTIFACT_DIR, 'edge_naval_voyage_verified.png');
    await page.screenshot({ path: outPath });
    console.log('Naval Voyage screenshot saved to:', outPath);

    // Switch to Port Broadside camera view
    console.log('Switching to Port Broadside camera view...');
    const portSwitched = await page.evaluate(() => {
      const btn = document.getElementById('cam-preset-broadside_port');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Port camera switched:', portSwitched);

    await new Promise((r) => setTimeout(r, 2000));
    const portPath = path.join(ARTIFACT_DIR, 'edge_naval_voyage_port_view.png');
    await page.screenshot({ path: portPath });
    console.log('Port view screenshot saved to:', portPath);
  } finally {
    await browser.close();
    console.log('Microsoft Edge session closed.');
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (e) {}
  }
  console.log('Microsoft Edge verification complete!');
}

captureVoyage().catch((err) => {
  console.error('Failed in Microsoft Edge:', err);
  process.exit(1);
});
