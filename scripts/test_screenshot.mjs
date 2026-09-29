import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\library\\.gemini\\antigravity-ide\\brain\\aa794a56-52f5-46e6-a932-edb088d1c17d';
  console.log('1. Launching Edge with headless new...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--run-all-compositor-stages-before-draw',
      '--disable-gpu-vsync',
      '--window-size=1536,864'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });

  console.log('2. Going to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Clicking Naval Voyage...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log('4. Attempting canvas.toDataURL extraction...');
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas ? canvas.toDataURL('image/png') : null;
  });
  if (dataUrl && dataUrl.length > 1000) {
    fs.writeFileSync(path.join(artifactDir, 'test_naval.png'), Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`5. Canvas extraction succeeded! Saved ${dataUrl.length} bytes.`);
  } else {
    console.log('5. Canvas returned empty or null dataUrl:', dataUrl ? dataUrl.length : 'null');
  }

  await browser.close();
  console.log('6. Browser closed cleanly!');
}

test().catch(e => {
  console.error('Test caught error:', e);
  process.exit(1);
});
