// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const OrganizationPage = require('../pages/OrganizationPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Organization');

test.describe('Organization Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const org = new OrganizationPage(page);

      switch (row.action) {
        case 'deptPageLoad': {
          await navigateTo(page, 'departments');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="department-management-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'addDept': {
          await navigateTo(page, 'departments');
          await waitForPageReady(page);
          await org.clickAddDepartment();
          await page.waitForTimeout(500);
          // Fill department form if visible
          const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
          if (await nameInput.isVisible()) {
            await nameInput.fill(row.deptName);
          }
          await org.clickSaveDepartment();
          await page.waitForTimeout(1000);
          break;
        }

        case 'searchDept': {
          await navigateTo(page, 'departments');
          await waitForPageReady(page);
          await org.searchDepartment(row.searchTerm);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="department-management-page"]')).toBeVisible();
          break;
        }

        case 'editDept': {
          await navigateTo(page, 'departments');
          await waitForPageReady(page);
          await org.clickEditDepartment();
          await page.waitForTimeout(500);
          break;
        }

        case 'deleteDept': {
          await navigateTo(page, 'departments');
          await waitForPageReady(page);
          await org.clickDeleteDepartment();
          await page.waitForTimeout(500);
          const confirmBtn = page.locator('[data-testid="confirm-dialog-confirm-btn"]');
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
          }
          break;
        }

        case 'posPageLoad': {
          await navigateTo(page, 'positions');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="position-management-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'addPosition': {
          await navigateTo(page, 'positions');
          await waitForPageReady(page);
          await org.clickAddPosition();
          await page.waitForTimeout(500);
          const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
          if (await titleInput.isVisible()) {
            await titleInput.fill(row.posTitle);
          }
          await org.clickSavePosition();
          await page.waitForTimeout(1000);
          break;
        }

        case 'deletePosition': {
          await navigateTo(page, 'positions');
          await waitForPageReady(page);
          await org.clickDeletePosition();
          await page.waitForTimeout(500);
          const confirmBtn2 = page.locator('[data-testid="confirm-dialog-confirm-btn"]');
          if (await confirmBtn2.isVisible()) {
            await confirmBtn2.click();
            await page.waitForTimeout(1000);
          }
          break;
        }

        case 'holidayPageLoad': {
          await navigateTo(page, 'holidays');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="holiday-calendar-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'addHoliday': {
          await navigateTo(page, 'holidays');
          await waitForPageReady(page);
          await org.clickAddHoliday();
          await page.waitForTimeout(500);
          const nameField = page.locator('input[name="name"], input[placeholder*="holiday" i]').first();
          if (await nameField.isVisible()) {
            await nameField.fill(row.holidayName);
          }
          await org.clickSaveHoliday();
          await page.waitForTimeout(1000);
          break;
        }
      }
    });
  }
});
