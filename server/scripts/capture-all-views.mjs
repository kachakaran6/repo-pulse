import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:\\Users\\karan\\.gemini\\antigravity-ide\\brain\\a4b542b8-0d26-4e18-9e06-f55a41125749';

async function captureViews() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  // 1. Landing Page
  console.log('Navigating to landing page...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  const landingPath = path.join(ARTIFACTS_DIR, 'landing_page_proof.png');
  await page.screenshot({ path: landingPath, fullPage: false });
  console.log(`Saved landing screenshot to: ${landingPath}`);

  // 2. Dev Login
  console.log('Performing Dev Login...');
  const devLoginBtn = page.locator('#dev-login-btn');
  if (await devLoginBtn.isVisible()) {
    await devLoginBtn.click();
  } else {
    // Fallback: trigger API dev-login directly and reload
    await page.evaluate(async () => {
      await fetch('/auth/dev-login', { method: 'POST' });
    });
    await page.reload();
  }
  
  // Wait for Overview page to load
  await page.waitForSelector('.overview-summary, .heat-bar', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // 3. Overview Page
  const overviewPath = path.join(ARTIFACTS_DIR, 'overview_page_proof.png');
  await page.screenshot({ path: overviewPath, fullPage: false });
  console.log(`Saved overview screenshot to: ${overviewPath}`);

  // 4. Triage Page
  console.log('Navigating to Triage page...');
  const triageTab = page.locator('#tab-triage');
  if (await triageTab.isVisible()) {
    await triageTab.click();
    await page.waitForTimeout(1000);
    const triagePath = path.join(ARTIFACTS_DIR, 'triage_page_proof.png');
    await page.screenshot({ path: triagePath, fullPage: false });
    console.log(`Saved triage screenshot to: ${triagePath}`);
  }

  // 5. Settings Page
  console.log('Navigating to Settings page...');
  const settingsTab = page.locator('#tab-settings');
  if (await settingsTab.isVisible()) {
    await settingsTab.click();
    await page.waitForTimeout(1000);
    const settingsPath = path.join(ARTIFACTS_DIR, 'settings_page_proof.png');
    await page.screenshot({ path: settingsPath, fullPage: false });
    console.log(`Saved settings screenshot to: ${settingsPath}`);
  }

  // 6. Sign Out
  console.log('Performing sign out...');
  const userMenuBtn = page.locator('#user-menu-btn');
  if (await userMenuBtn.isVisible()) {
    await userMenuBtn.click();
    await page.waitForTimeout(300);
    const signOutBtn = page.locator('#signout-btn');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    }
  } else {
    await page.evaluate(async () => {
      await fetch('/auth/logout', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    });
    await page.reload();
  }

  await page.waitForTimeout(1500);
  const signedOutPath = path.join(ARTIFACTS_DIR, 'signed_out_proof.png');
  await page.screenshot({ path: signedOutPath, fullPage: false });
  console.log(`Saved signed-out screenshot to: ${signedOutPath}`);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureViews().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
