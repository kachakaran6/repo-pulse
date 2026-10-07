import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

describe('Auth & UI E2E Workflow (Playwright)', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('1. Displays clean unauthenticated landing page with GitHub Sign-in', async () => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);

    const title = await page.textContent('h1');
    expect(title).toContain('See which repos you are still working on');

    const githubBtn = page.locator('button:has-text("Sign in with GitHub")').first();
    expect(await githubBtn.isVisible()).toBe(true);

    // Verify absence of PAT input and password boxes
    const passwordInputs = await page.locator('input[type="password"]').count();
    expect(passwordInputs).toBe(0);
    const patInputs = await page.locator('input[placeholder*="token" i], input[placeholder*="PAT" i]').count();
    expect(patInputs).toBe(0);
  }, 15000);

  it('2. Signs in via Dev Login and reaches Overview page with synced repositories', async () => {
    const devLoginBtn = page.locator('#dev-login-btn');
    if (await devLoginBtn.isVisible()) {
      await devLoginBtn.click();
    } else {
      await page.evaluate(async () => {
        await fetch('/auth/dev-login', { method: 'POST' });
      });
      await page.reload();
    }

    // Wait for Overview UI elements
    await page.waitForSelector('.overview-summary, .heat-bar', { timeout: 12000 });
    
    const summaryText = await page.textContent('.overview-summary');
    expect(summaryText).toBeTruthy();

    const repoRows = await page.locator('.ledger-row').count();
    expect(repoRows).toBeGreaterThan(0);
  }, 20000);

  it('3. Updates repository metadata and verifies persistence across reload', async () => {
    // Make direct API call with session cookie to set metadata, then verify in UI
    await page.evaluate(async () => {
      const reposRes = await fetch('/api/repos');
      const data = await reposRes.json();
      const firstRepo = data.repos[0];
      await fetch(`/api/repos/${firstRepo.id}/meta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          label: 'E2E Verified SaaS',
          decision: 'keep'
        })
      });
    });

    // Reload page to verify persistence
    await page.reload();
    await page.waitForSelector('.overview-summary, .heat-bar', { timeout: 12000 });
    
    // Check if the label is visible on the page
    const pageContent = await page.content();
    expect(pageContent).toContain('E2E Verified SaaS');
  }, 20000);

  it('4. Signs out and returns to landing page in unauthenticated state', async () => {
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

    await page.waitForSelector('.landing-hero-h1, button:has-text("Sign in with GitHub")', { timeout: 12000 });
    const githubBtn = page.locator('button:has-text("Sign in with GitHub")').first();
    expect(await githubBtn.isVisible()).toBe(true);

    // Verify /api/me returns 401
    const meStatus = await page.evaluate(async () => {
      const res = await fetch('/api/me');
      return res.status;
    });
    expect(meStatus).toBe(401);
  }, 15000);
});
