// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const DashboardPage = require('../pages/DashboardPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Dashboard');

test.describe('Dashboard Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      await waitForPageReady(page);
      const dashboard = new DashboardPage(page);

      switch (row.action) {
        case 'verifyStats': {
          const elements = (row.expectedElements || '').split(',').filter(Boolean);
          if (row.role === 'admin') {
            const visible = await dashboard.isAdminDashboardVisible();
            expect(visible).toBeTruthy();
            for (const el of elements) {
              const selector = `[data-testid="admin-dashboard-${el.replace(/([A-Z])/g, '-$1').toLowerCase()}"]`;
              await expect(page.locator(selector).first()).toBeVisible({ timeout: 8000 });
            }
          } else if (row.role === 'employee') {
            const visible = await dashboard.isEmployeeDashboardVisible();
            expect(visible).toBeTruthy();
          } else if (row.role === 'manager') {
            const visible = await dashboard.isManagerDashboardVisible();
            expect(visible).toBeTruthy();
          }
          break;
        }

        case 'quickAction': {
          if (row.role === 'admin') {
            await dashboard.clickAdminAction(row.quickAction);
          } else if (row.role === 'employee') {
            await dashboard.clickEmployeeQuickAction(row.quickAction);
          }
          await page.waitForTimeout(1000);
          await expect(page).toHaveURL(new RegExp(row.expectedUrl));
          break;
        }

        case 'refresh': {
          if (row.role === 'admin') {
            await dashboard.clickAdminRefresh();
          }
          await waitForPageReady(page);
          // After refresh the dashboard should still be visible
          await expect(page.locator('body')).toBeVisible();
          break;
        }
      }
    });
  }
});
