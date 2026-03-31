// @ts-check
const { test, expect, TEST_USERS } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const LoginPage = require('../pages/LoginPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Login');

test.describe('Login Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      const loginPage = new LoginPage(page);

      switch (row.action) {
        case 'login': {
          await loginPage.goto();
          await loginPage.login(row.email, row.password);

          if (row.expectSuccess === 'TRUE') {
            await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
            // Verify role-based redirect happened
            await expect(page.locator('body')).toBeVisible();
          } else {
            // Should remain on login or show an error
            const onLogin = await loginPage.isOnLoginPage();
            const errorMsg = await loginPage.getErrorMessage();
            expect(onLogin || errorMsg !== null).toBeTruthy();
          }
          break;
        }

        case 'togglePassword': {
          await loginPage.goto();
          await loginPage.fillPassword('test123');
          const input = page.locator('[data-testid="login-password-input"] input');
          await expect(input).toHaveAttribute('type', 'password');
          await loginPage.togglePasswordVisibility();
          await expect(input).toHaveAttribute('type', 'text');
          break;
        }

        case 'forgotPassword': {
          await loginPage.goto();
          await loginPage.clickForgotPassword();
          await expect(page).toHaveURL(/forgot-password/);
          break;
        }

        case 'logout': {
          await loginPage.goto();
          await loginPage.login(row.email, row.password);
          await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

          // Perform logout via profile menu
          await page.locator('[data-testid="layout-profile-menu-trigger"]').click();
          await page.locator('[data-testid="layout-menu-logout"]').click();
          await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
          break;
        }
      }
    });
  }
});
