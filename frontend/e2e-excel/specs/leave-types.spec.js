// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('LeaveTypes');

test.describe('Leave Types', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      await page.goto('/admin/leave-types');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="leave-type-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifyAddBtn': {
          await expect(page.locator('[data-testid="leave-type-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="leave-type-add-btn"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'verifyTable': {
          await expect(page.locator('[data-testid="leave-type-page"]')).toBeVisible({ timeout: 10000 });
          // Verify there's at least one table or grid structure
          const table = page.locator('table, [role="grid"]').first();
          await expect(table).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    });
  }
});
