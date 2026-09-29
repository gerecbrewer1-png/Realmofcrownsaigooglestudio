const puppeteer = require('puppeteer-core');
const os = require('os');
const fs = require('fs');

(async () => {
  try {
    // Find Edge or Chrome
    const executablePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let executablePath = executablePaths.find(p => fs.existsSync(p));
    
    if (!executablePath) {
      console.log(JSON.stringify({ error: 'No browser found' }));
      return;
    }

    const browser = await puppeteer.launch({ executablePath, headless: 'new' });
    const page = await browser.newPage();
    
    // We navigate to the app
    await page.goto('http://localhost:3000/?perf=1');
    
    // Wait for the app to settle
    await new Promise(r => setTimeout(r, 10000));
    
    // Get the performance stats
    const perfStats = await page.evaluate(() => {
      return window.perfStats || null;
    });

    await browser.close();
    
    console.log(JSON.stringify({ perfStats }));
  } catch (err) {
    console.error(err);
  }
})();
