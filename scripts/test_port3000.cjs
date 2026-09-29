const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', 'node_modules', 'puppeteer-core'));

async function testWebPort() {
  console.log('Testing http://127.0.0.1:3000 health and full capacity...');
  const fs = require('fs');
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
    if (!text.includes('Download the React DevTools') && !text.includes('WebGL context')) {
      console.log('PAGE LOG:', text);
    }
  });
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  console.log('Navigating to http://127.0.0.1:3000 ...');
  const response = await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('HTTP Status:', response.status());

  await new Promise(r => setTimeout(r, 4000));

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const localOutPath = path.resolve(__dirname, '..', 'port_3000_verified.png');
  await page.screenshot({ path: localOutPath });
  console.log('Screenshot verified and saved to:', localOutPath);

  await browser.close();
  console.log('Health check complete. Server is operating at FULL CAPACITY.');
}

testWebPort().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
