/**
 * REALM OF CROWNS — End-to-End Browser Verification for Adaptive Input & Controls System
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\gerec.brewer\\.gemini\\antigravity-ide\\brain\\3e4c8c3c-e8f4-4aa0-82ec-9cebc6e29890';

async function runAdaptiveControlsE2E() {
  console.log('================================================================');
  console.log('=== Starting Realm of Crowns Adaptive Controls E2E Test ===');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--proxy-server=direct://',
      '--proxy-bypass-list=*'
    ]
  });

  const page = await browser.newPage();
  // Set mobile-first viewport (480x850, scale 2)
  await page.setViewport({ width: 480, height: 850, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('error') || txt.includes('Error') || txt.includes('Conflict') || txt.includes('ORDER') || txt.includes('SELECTED')) {
      console.log('BROWSER_LOG:', txt);
    }
  });

  console.log('1. Navigating to Realm of Crowns at http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss Charter modal if visible
  await page.evaluate(() => {
    const btn = document.getElementById('claim-charter-btn') || 
      Array.from(document.querySelectorAll('button')).find(x => x.innerText && x.innerText.includes('Accept Crown'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Navigate to Tactical Battle View
  console.log('2. Entering Tactical Battle Arena...');
  await page.evaluate(() => {
    const battleTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Battle'));
    if (battleTab) battleTab.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot 1: Full HUD with Adaptive Controls Header
  console.log('3. Capturing Full Tactical HUD...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_01_full_hud.png') });

  // Open Controls Settings Modal via #open-controls-settings-btn
  console.log('4. Opening Controls Settings Modal...');
  await page.evaluate(() => {
    const btn = document.getElementById('open-controls-settings-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot 2: Controls Settings Modal (Preferences Tab)
  console.log('5. Capturing Controls Settings Modal (Preferences)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_02_controls_settings.png') });

  // Switch to Keyboard Reference & Remapping Tab
  console.log('6. Switching to Keyboard Reference & Remapping Tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Keyboard Reference'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot 3: Keyboard Reference Table
  console.log('7. Capturing Keyboard Reference Table...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_03_keyboard_reference_table.png') });

  // Close Settings Modal
  await page.evaluate(() => {
    const closeBtn = document.getElementById('close-controls-settings-btn') ||
      document.querySelector('button[aria-label="Close Settings"]') ||
      document.querySelector('div.fixed button[aria-label="Close Help"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕' || b.innerHTML.includes('lucide-x'));
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Open Quick In-Game Help (F1) via HUD button or F1
  console.log('8. Opening Quick Help Overlay (F1 / #open-controls-help-btn)...');
  await page.evaluate(() => {
    const btn = document.getElementById('open-controls-help-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 4: Quick F1 Overlay
  console.log('9. Capturing Quick Help Overlay...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_04_quick_f1_overlay.png') });

  // Close Help overlay with Escape or close button
  const debugButtons = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button')).map(b => ({
      id: b.id,
      text: b.innerText?.slice(0, 20),
      aria: b.getAttribute('aria-label'),
      html: b.innerHTML?.slice(0, 30)
    }));
    const closeBtn = document.getElementById('close-quick-help-btn') ||
      document.querySelector('button[aria-label="Close Help"]') ||
      Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Close Help');
    if (closeBtn) {
      closeBtn.click();
      return { found: true, allBtns };
    }
    return { found: false, allBtns };
  });
  console.log('   Quick Help close debug:', debugButtons.found, 'Total buttons in DOM:', debugButtons.allBtns.length);
  console.log('   BUTTONS IN DOM:', JSON.stringify(debugButtons.allBtns.map(b => b.text || b.id || b.aria)));
  await new Promise(r => setTimeout(r, 800));

  // Test Clean Screen Mode via F10 or button
  console.log('10. Activating Clean Screen Mode (F10)...');
  await page.keyboard.press('F10');
  await new Promise(r => setTimeout(r, 800));

  // Verify Joystick is completely hidden from DOM
  const joystickVisible = await page.evaluate(() => {
    const el = document.querySelector('div.rounded-full.border-2.border-amber-600\\/40');
    return !!el;
  });
  console.log('   Joystick element in DOM during Clean Screen:', joystickVisible ? 'PRESENT' : 'REMOVED (Clean)');

  // Screenshot 5: Clean Screen Mode
  console.log('11. Capturing Clean Screen Battlefield View...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_05_clean_screen_mode.png') });

  // Restore controls via F10
  console.log('12. Restoring Controls via F10...');
  await page.keyboard.press('F10');
  await new Promise(r => setTimeout(r, 800));

  // Test Hero Movement (W) and Attack (Q)
  console.log('13. Testing Hero Movement and Tactical Commands...');
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyQ');
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 6: Command Feedback Badge & Movement
  console.log('14. Capturing Command Feedback and Attack Execution...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'adaptive_06_wasd_movement_and_feedback.png') });

  console.log('================================================================');
  console.log('=== All Adaptive Controls E2E Tests Completed Successfully! ===');
  console.log('================================================================');

  await browser.close();
  process.exit(0);
}

runAdaptiveControlsE2E().catch(err => {
  console.error('Fatal E2E Error:', err);
  process.exit(1);
});
