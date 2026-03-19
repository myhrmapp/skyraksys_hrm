// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const PayrollPage = require('../pages/PayrollPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Payroll');

test.describe('Payroll Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const payroll = new PayrollPage(page);

      switch (row.action) {
        case 'pageLoad': {
          await navigateTo(page, row.role === 'employee' ? 'payslips' : 'payroll');
          await waitForPageReady(page);
          if (row.role === 'employee') {
            await expect(page.locator('[data-testid="employee-payslips-page"]')).toBeVisible({ timeout: 8000 });
          } else {
            await expect(page.locator('[data-testid="payroll-management-page"]')).toBeVisible({ timeout: 8000 });
          }
          break;
        }

        case 'tabSwitch': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.selectTab(parseInt(row.tabIndex));
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="payroll-management-page"]')).toBeVisible();
          break;
        }

        case 'search': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.search(row.searchTerm);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="payroll-management-page"]')).toBeVisible();
          break;
        }

        case 'generate': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.selectTab(1); // Generate tab
          await page.waitForTimeout(500);
          await payroll.clickValidateGenerate();
          await page.waitForTimeout(2000);
          break;
        }

        case 'bulkFinalize': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.clickBulkFinalize();
          await page.waitForTimeout(2000);
          break;
        }

        case 'bulkMarkPaid': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.clickBulkMarkPaid();
          await page.waitForTimeout(2000);
          break;
        }

        case 'export': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
            payroll.clickExport(),
          ]);
          await expect(page.locator('[data-testid="payroll-management-page"]')).toBeVisible();
          break;
        }

        case 'refresh': {
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);
          await payroll.clickRefresh();
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="payroll-management-page"]')).toBeVisible();
          break;
        }

        case 'employeePayslips': {
          await navigateTo(page, 'payslips');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="employee-payslips-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'filterYear': {
          await navigateTo(page, 'payslips');
          await waitForPageReady(page);
          await payroll.filterByYear(row.year);
          await page.waitForTimeout(500);
          break;
        }

        case 'viewDetail': {
          await navigateTo(page, 'payslips');
          await waitForPageReady(page);
          await payroll.clickViewFirst();
          await page.waitForTimeout(1000);
          break;
        }

        case 'download': {
          await navigateTo(page, 'payslips');
          await waitForPageReady(page);
          const [dl] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
            payroll.clickDownloadFirst(),
          ]);
          break;
        }
      }
    });
  }
});
