const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Find button with text 'World Map' and click it
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text && text.includes('World Map')) {
      console.log('Clicking button:', text.trim());
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'restored_world_map.png' });
  console.log('SUCCESS: Saved restored_world_map.png');
  await browser.close();
}

run().catch(console.error);
