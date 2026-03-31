// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('EmployeeRecords');

test.describe('Employee Records', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      await page.goto('/employee-records');
      await waitForPageReady(page);

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="employee-records-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }
        case 'verifySearch': {
          await expect(page.locator('[data-testid="employee-records-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="employee-records-search"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'verifyTabs': {
          await expect(page.locator('[data-testid="employee-records-page"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('[data-testid="records-tab-leave"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="records-tab-timesheet"]')).toBeVisible({ timeout: 5000 });
          await expect(page.locator('[data-testid="records-tab-attendance"]')).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    });
  }
});
