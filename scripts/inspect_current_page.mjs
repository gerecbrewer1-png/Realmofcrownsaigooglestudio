import puppeteer from 'puppeteer-core';
import path from 'path';

async function inspect() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-web-security', '--enable-webgl', '--window-size=1536,864']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1536, height: 864 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot Citadel
  await page.screenshot({ path: 'inspect_citadel_live.png' });
  console.log('Saved inspect_citadel_live.png');

  // Check buttons in DOM
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, [role="button"]')).map(el => ({
      id: el.id,
      text: el.textContent?.trim().slice(0, 40),
      className: el.className?.slice(0, 50),
      visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
    }));
  });
  console.log('Visible buttons:', buttons.filter(b => b.visible));

  // Navigate to Voyage
  const voyageBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Naval Voyage'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Naval Voyage:', voyageBtn);
  await new Promise(r => setTimeout(r, 4000));

  // Screenshot Voyage
  await page.screenshot({ path: 'inspect_voyage_live.png' });
  console.log('Saved inspect_voyage_live.png');

  const voyageButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"]')).map(el => ({
      id: el.id,
      text: el.textContent?.trim().slice(0, 40),
      visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
    })).filter(b => b.visible);
  });
  console.log('Voyage buttons:', voyageButtons);

  await browser.close();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
