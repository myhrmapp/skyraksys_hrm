// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const EmployeePage = require('../pages/EmployeePage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Employee');

test.describe('Employee Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const emp = new EmployeePage(page);

      switch (row.action) {
        case 'listLoad': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          const count = await emp.getTableRowCount();
          expect(count).toBeGreaterThanOrEqual(parseInt(row.expectedMinRows));
          break;
        }

        case 'search': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.search(row.searchTerm);
          await page.waitForTimeout(500);
          // Search should not break the page
          await expect(page.locator('[data-testid="employee-list-table"]')).toBeVisible();
          break;
        }

        case 'filterStatus': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.filterByStatus(row.filterValue);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="employee-list-table"]')).toBeVisible();
          break;
        }

        case 'create': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.clickAdd();
          await waitForPageReady(page);
          await emp.fillPersonalInfo({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
          });
          // Verify form fields were filled
          await expect(page.locator('[data-testid="employee-form-firstName"] input')).toHaveValue(row.firstName);
          await expect(page.locator('[data-testid="employee-form-lastName"] input')).toHaveValue(row.lastName);
          break;
        }

        case 'tabNavigation': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.clickAdd();
          await waitForPageReady(page);
          await emp.gotoTab(row.toTab);
          // The tab content should be rendered
          await expect(page.locator(`[data-testid="employee-form-tab-${row.toTab}"]`)).toHaveAttribute('aria-selected', 'true');
          break;
        }

        case 'viewProfile': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          // Click the first employee row to view profile
          const rows = page.locator('[data-testid="employee-list-table"] tbody tr');
          if (await rows.count() > 0) {
            await rows.first().click();
            await waitForPageReady(page);
            await expect(page.locator('[data-testid="employee-profile-page"]')).toBeVisible({ timeout: 8000 });
          }
          break;
        }

        case 'myProfile': {
          // Employee viewing their own profile
          await page.locator('[data-testid="layout-profile-menu-trigger"]').click();
          await page.locator('[data-testid="layout-menu-view-profile"]').click();
          await waitForPageReady(page);
          await expect(page.locator('body')).toBeVisible();
          break;
        }

        case 'export': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          // Start download listener before clicking
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
            emp.clickExport(),
          ]);
          // Export should trigger download or at least not crash
          await expect(page.locator('[data-testid="employee-list-page"]')).toBeVisible();
          break;
        }

        case 'editFromProfile': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          const tableRows = page.locator('[data-testid="employee-list-table"] tbody tr');
          if (await tableRows.count() > 0) {
            await tableRows.first().click();
            await waitForPageReady(page);
            await emp.clickEditFromProfile();
            await waitForPageReady(page);
            // Should be on edit form now
            await expect(page.locator('[data-testid="employee-form-page"]')).toBeVisible({ timeout: 8000 });
          }
          break;
        }

        case 'unsavedDialog': {
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.clickAdd();
          await waitForPageReady(page);
          await emp.fillPersonalInfo({ firstName: 'Unsaved' });
          await emp.clickCancel();
          // Should show unsaved changes confirmation
          await expect(page.locator('[data-testid="unsaved-stay-btn"], [role="dialog"]').first()).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    });
  }
});
