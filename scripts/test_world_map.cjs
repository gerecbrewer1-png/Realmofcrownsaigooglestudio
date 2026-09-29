const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function testWorldMap() {
  console.log('Testing World Map open world view on http://127.0.0.1:3000 ...');
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

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' || text.toLowerCase().includes('error') || text.toLowerCase().includes('uncaught')) {
      console.log(`[PAGE ${type.toUpperCase()}]:`, text);
      errors.push(text);
    } else if (!text.includes('AudioContext') && !text.includes('Download the React DevTools')) {
      console.log(`[PAGE LOG]:`, text);
    }
  });

  page.on('pageerror', err => {
    console.error('[UNCAUGHT PAGE ERROR]:', err.message, err.stack);
    errors.push(err.message);
  });

  console.log('Navigating to http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Looking for World Map navigation button...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#nav-btn-map') || 
                Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('World Map'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked World Map button:', clicked);

  await new Promise(r => setTimeout(r, 5000));

  const pageState = await page.evaluate(() => {
    const text = document.body.innerText;
    const canvas = document.querySelector('canvas');
    return {
      title: document.title,
      hasCanvas: !!canvas,
      canvasWidth: canvas ? canvas.width : null,
      canvasHeight: canvas ? canvas.height : null,
      snippet: text.substring(0, 300)
    };
  });
  console.log('Page State after World Map click:', pageState);

  const shotPath = path.resolve(__dirname, '..', '05_world_map_view.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved World Map screenshot to:', shotPath);

  await browser.close();
  console.log('World Map test finished. Errors count:', errors.length);
}

testWorldMap().catch(err => {
  console.error('World map test failed:', err);
  process.exit(1);
});
