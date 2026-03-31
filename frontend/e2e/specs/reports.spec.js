// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Reports');

test.describe('Reports', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      await page.goto('/reports');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifyDateFilter': {
          await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="reports-date-range-select"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'verifyExport': {
          await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="reports-export-btn"]')).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    });
  }
});
