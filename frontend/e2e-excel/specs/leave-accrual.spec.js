// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('LeaveAccrual');

test.describe('Leave Accrual', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      await page.goto('/admin/leave-accrual');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="leave-accrual-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifyRunBtn': {
          await expect(page.locator('[data-testid="leave-accrual-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="leave-accrual-run-btn"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'verifyPreviewBtn': {
          await expect(page.locator('[data-testid="leave-accrual-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="leave-accrual-preview-btn"]')).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    });
  }
});
