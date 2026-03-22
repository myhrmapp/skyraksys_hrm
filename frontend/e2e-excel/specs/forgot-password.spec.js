// @ts-check
const { test, expect } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('ForgotPassword');

test.describe('Forgot Password', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await page.goto('/forgot-password');

      switch (row.action) {
        case 'pageLoad': {
          await expect(page.locator('[data-testid="forgot-password-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }
        case 'fillEmail': {
          const input = page.locator('[data-testid="forgot-password-email"] input');
          await expect(input).toBeVisible({ timeout: 5000 });
          await input.fill(row.email || 'test@example.com');
          await expect(input).toHaveValue(row.email || 'test@example.com');
          break;
        }
        case 'verifySubmit': {
          await expect(page.locator('[data-testid="forgot-password-submit-btn"]')).toBeVisible({ timeout: 5000 });
          break;
        }
        case 'backToLogin': {
          const link = page.locator('[data-testid="forgot-password-back-link"]');
          await expect(link).toBeVisible({ timeout: 5000 });
          await link.click();
          await expect(page).toHaveURL(/\/login/);
          break;
        }
      }
    });
  }
});
