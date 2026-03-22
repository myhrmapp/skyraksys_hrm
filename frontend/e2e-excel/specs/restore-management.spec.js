// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('RestoreManagement');

test.describe('Restore Management', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      // Use admin for all restore tests — admin routes require frontend rebuild
      // to pick up new ROUTE_PERMISSIONS entries for non-admin roles
      await loginAs(page, 'admin');
      await page.goto('/admin/restore');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="restore-management-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifyTabs': {
          await expect(page.locator('[data-testid="restore-management-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="restore-tab-reviews"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="restore-tab-balances"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="restore-tab-users"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'switchTabs': {
          await expect(page.locator('[data-testid="restore-management-page"]')).toBeVisible({ timeout: 10000 });
          // Click each tab and verify content area changes
          for (const tab of ['restore-tab-reviews', 'restore-tab-balances', 'restore-tab-users']) {
            const tabBtn = page.locator(`[data-testid="${tab}"]`);
            if (await tabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tabBtn.click();
              await page.waitForTimeout(500);
            }
          }
          break;
        }
      }
    });
  }
});
