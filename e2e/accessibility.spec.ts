import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Responsive Design Suite (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress coachmark tour dialog during accessibility audits
    await page.addInitScript(() => {
      localStorage.setItem('repopulse_coachmarks_dismissed_v4', 'true');
    });
  });

  // Helper for checking horizontal overflow
  const assertNoHorizontalOverflow = async (page: any) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  };

  test('Landing page: Zero Axe violations & no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Ledger View (Demo): Zero Axe violations & responsive layout', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[role="main"], main, #main-content', { state: 'attached' });

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Repo Detail Drawer: Focus trapping and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&repo=101');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the drawer dialog to render
    const drawer = page.locator('[aria-labelledby="repo-drawer-title"]');
    await expect(drawer).toBeVisible();

    await assertNoHorizontalOverflow(page);

    // Verify focus is contained inside the drawer
    await expect(async () => {
      const isFocusInDrawer = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('[aria-labelledby="repo-drawer-title"]');
        return dialog ? dialog.contains(active) : false;
      });
      expect(isFocusInDrawer).toBe(true);
    }).toPass();

    const results = await new AxeBuilder({ page })
      .include('[aria-labelledby="repo-drawer-title"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Triage Mode: Progress bar, live region, and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=triage');
    await page.waitForLoadState('domcontentloaded');

    await assertNoHorizontalOverflow(page);

    // Verify triage queue progressbar exists
    const progress = page.getByRole('progressbar', { name: 'Triage queue progress' });
    await expect(progress).toBeVisible();

    // Verify live region exists
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion.first()).toBeAttached();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Decisions View: Searchable timeline and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=decisions');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Decisions")').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Digest View: Magazine layout and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=digest');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('text=Weekly Repository Digest').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Analytics View: Charts grid and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=analytics');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Portfolio Analytics")').waitFor({ state: 'visible' });
    await page.waitForTimeout(350);

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Settings View: Navigation, toggles, and zero Axe violations', async ({ page }) => {
    await page.goto('/?demo=true&welcome=false&tab=settings');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main h1:has-text("Settings")').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Design Tokens Page: Palette, contrast, and zero Axe violations', async ({ page }) => {
    await page.goto('/design-tokens');
    await page.waitForLoadState('domcontentloaded');

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Component Catalog: Interactive states and zero Axe violations', async ({ page }) => {
    await page.goto('/components');
    await page.waitForLoadState('domcontentloaded');

    await assertNoHorizontalOverflow(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Mobile Touch Targets: Verify touch target dimensions on 360px viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Only applicable to mobile viewports');

    await page.goto('/?demo=true&welcome=false');
    await page.waitForLoadState('domcontentloaded');

    // Bottom tab bar navigation items must have height >= 44px
    const bottomTabs = page.locator('[role="tablist"] [role="tab"]');
    const count = await bottomTabs.count();
    for (let i = 0; i < count; i++) {
      const box = await bottomTabs.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
