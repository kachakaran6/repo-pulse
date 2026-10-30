import { test, expect } from '@playwright/test';

test.describe('Visual Regression Suite (Playwright Screenshots)', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss coachmarks, set consistent light theme, and reset feedback prompt state
    await page.addInitScript(() => {
      localStorage.setItem('repopulse_coachmarks_dismissed_v4', 'true');
      localStorage.setItem('repopulse_theme', 'light');
      localStorage.removeItem('repopulse_design_feedback_state');
    });
  });

  test('Phase 1: Application Shell layout (Desktop & Mobile)', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('banner').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    // Verify Shell visual snapshot
    await expect(page).toHaveScreenshot('shell-layout.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      mask: [
        page.locator('header [role="status"]'), // dynamic sync timer
      ],
    });
  });

  test('Phase 2: Main Ledger View with grouped sections and controls', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=overview&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('article[aria-label^="Repository"]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    // Verify main ledger view visual snapshot
    await expect(page.locator('main')).toHaveScreenshot('ledger-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      mask: [
        page.locator('header [role="status"]'),
      ],
    });
  });

  test('Phase 3: Repo Detail Slide-over Sheet / Drawer', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&repo=101&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    const drawer = page.locator('[aria-labelledby="repo-drawer-title"]');
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(300);

    // Verify Repo Detail Drawer snapshot
    await expect(drawer).toHaveScreenshot('repo-detail-drawer.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Phase 4: Triage Mode focus card and keyboard shortcuts', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=triage&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    const progress = page.getByRole('progressbar', { name: 'Triage queue progress' });
    await expect(progress).toBeVisible();
    await page.waitForTimeout(300);

    // Verify Triage mode snapshot
    await expect(page.locator('main')).toHaveScreenshot('triage-mode.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Phase 5: Remaining Views (Decisions, Digest, Analytics, Settings)', async ({ page }) => {
    // 1. Decisions View
    await page.goto('/?demo=true&welcome=false&tab=decisions&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Decisions")').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await expect(page.locator('main')).toHaveScreenshot('decisions-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    // 2. Digest View
    await page.goto('/?demo=true&welcome=false&tab=digest&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('text=Weekly Repository Digest').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await expect(page.locator('main')).toHaveScreenshot('digest-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    // 3. Analytics View
    await page.goto('/?demo=true&welcome=false&tab=analytics&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Portfolio Analytics")').waitFor({ state: 'visible' });
    await page.waitForTimeout(350);
    await expect(page.locator('main')).toHaveScreenshot('analytics-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    // 4. Settings View
    await page.goto('/?demo=true&welcome=false&tab=settings&ui=v4');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Settings")').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await expect(page.locator('main')).toHaveScreenshot('settings-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('Design Feedback Prompt: Renders "How\'s the new design?" floating pill', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&ui=v4&prompt=true');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the feedback prompt to become visible immediately
    const prompt = page.locator('aside[aria-label="Design feedback prompt"]');
    await expect(prompt).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(300);

    await expect(prompt).toHaveScreenshot('feedback-prompt.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});
