// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('SettingsHub');

test.describe('Settings Hub', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, 'admin');
      await page.goto('/admin/settings-hub');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="settings-hub-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifyTabs': {
          await expect(page.locator('[data-testid="settings-hub-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="settings-hub-tab-email"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="settings-hub-tab-preferences"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="settings-hub-tab-advanced"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'switchTabs': {
          await expect(page.locator('[data-testid="settings-hub-page"]')).toBeVisible({ timeout: 10000 });
          for (const tab of ['settings-hub-tab-email', 'settings-hub-tab-preferences', 'settings-hub-tab-advanced']) {
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
