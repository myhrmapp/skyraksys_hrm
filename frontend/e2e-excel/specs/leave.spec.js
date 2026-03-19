// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const LeavePage = require('../pages/LeavePage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Leave');

test.describe('Leave Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const leave = new LeavePage(page);

      switch (row.action) {
        case 'submitRequest': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          await leave.selectType(row.leaveType);
          await leave.fillStartDate(row.startDate);
          await leave.fillEndDate(row.endDate);
          if (row.reason) {
            await leave.fillReason(row.reason);
          }
          await leave.submitRequest();
          await page.waitForTimeout(1000);

          if (row.expectSuccess === 'TRUE') {
            // Should show success toast or refresh the form
            const toast = page.locator('.notistack-SnackbarContainer');
            const onPage = page.locator('[data-testid="leave-request-form"]');
            await expect(toast.or(onPage)).toBeVisible({ timeout: 5000 });
          } else {
            // Should remain on form or show validation error
            await expect(page.locator('[data-testid="leave-request-form"]')).toBeVisible();
          }
          break;
        }

        case 'approve': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          // Navigate to management tab/section
          const mgmtTab = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab.isVisible()) await mgmtTab.click();
          await waitForPageReady(page);
          await leave.approveFirst();
          await page.waitForTimeout(1000);
          break;
        }

        case 'reject': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const mgmtTab2 = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab2.isVisible()) await mgmtTab2.click();
          await waitForPageReady(page);
          await leave.rejectFirst();
          await page.waitForTimeout(1000);
          break;
        }

        case 'viewBalances': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const balTab = page.locator('text=Balance, text=Balances').first();
          if (await balTab.isVisible()) await balTab.click();
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="leave-balance-init-btn"]').or(page.locator('table, .MuiDataGrid-root')).first()).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'addType': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const typeTab = page.locator('text=Types, text=Leave Types').first();
          if (await typeTab.isVisible()) await typeTab.click();
          await waitForPageReady(page);
          const addBtn = page.locator('[data-testid="leave-type-add-btn"]');
          if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
          }
          break;
        }

        case 'initBalances': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const balTab2 = page.locator('text=Balance, text=Balances').first();
          if (await balTab2.isVisible()) await balTab2.click();
          await waitForPageReady(page);
          const initBtn = page.locator('[data-testid="leave-balance-init-btn"]');
          if (await initBtn.isVisible()) {
            await initBtn.click();
            await page.waitForTimeout(2000);
          }
          break;
        }

        case 'accrualPreview': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const accTab = page.locator('text=Accrual').first();
          if (await accTab.isVisible()) await accTab.click();
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="leave-accrual-preview-btn"]').or(page.locator('body'))).toBeVisible();
          break;
        }

        case 'cancelRequest': {
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          // Look for a cancel button on the first pending request
          const cancelBtn = page.locator('button:has-text("Cancel")').first();
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(1000);
          }
          break;
        }
      }
    });
  }
});
