// @ts-check
const { test, expect, loginAs } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('PerformanceDashboard');

test.describe('Performance Dashboard', () => {
  // Group tests by role to avoid repeated login/navigation that overwhelms
  // the performance API endpoints (auto-refresh polls every 5s)
  const adminRows = rows.filter(r => r.role === 'admin');
  const managerRows = rows.filter(r => r.role === 'manager');

  if (adminRows.length > 0) {
    test(`${adminRows.map(r => r.testId).join('/')}: Admin performance dashboard tests`, async ({ page }) => {
      test.setTimeout(60000);
      await loginAs(page, 'admin');
      await page.goto('/performance-dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="performance-dashboard-page"]')).toBeVisible({ timeout: 20000 });

      for (const row of adminRows) {
        switch (row.action) {
          case 'pageLoad':
            // Already verified above
            break;
          case 'verifyToggle':
            await expect(page.locator('[data-testid="perf-auto-refresh-toggle"]')).toBeVisible({ timeout: 5000 });
            break;
          case 'clickRefresh': {
            const btn = page.locator('[data-testid="perf-refresh-btn"]');
            await expect(btn).toBeVisible({ timeout: 5000 });
            await btn.click();
            await page.waitForTimeout(500);
            break;
          }
          case 'verifyTabs':
            await expect(page.locator('[data-testid="perf-tab-client"]')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('[data-testid="perf-tab-server"]')).toBeVisible({ timeout: 5000 });
            break;
        }
      }
    });
  }

  if (managerRows.length > 0) {
    test(`${managerRows.map(r => r.testId).join('/')}: Manager performance dashboard tests`, async ({ page }) => {
      test.setTimeout(60000);
      await loginAs(page, 'manager');
      await page.goto('/performance-dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="performance-dashboard-page"]')).toBeVisible({ timeout: 20000 });

      for (const row of managerRows) {
        switch (row.action) {
          case 'pageLoad':
            break;
        }
      }
    });
  }
});
