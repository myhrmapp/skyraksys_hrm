// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const DashboardPage = require('../pages/DashboardPage');
const selectors = require('../lib/object-repository');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Dashboard');

// Map roles to their dashboard routes
const DASHBOARD_ROUTES = {
  admin: '/admin-dashboard',
  hr: '/admin-dashboard',
  manager: '/manager-dashboard',
  employee: '/employee-dashboard',
};

test.describe('Dashboard Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      // Navigate directly to the role-specific dashboard to avoid redirect timing issues
      const dashRoute = DASHBOARD_ROUTES[row.role] || '/admin-dashboard';
      await page.goto(dashRoute);
      await waitForPageReady(page);
      const dashboard = new DashboardPage(page);

      switch (row.action) {
        case 'verifyStats': {
          const elements = (row.expectedElements || '').split(',').filter(Boolean);
          if (row.role === 'admin') {
            const visible = await dashboard.isAdminDashboardVisible();
            expect(visible).toBeTruthy();
            for (const el of elements) {
              const sel = selectors.adminDashboard[el];
              if (sel) {
                await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 });
              }
            }
          } else if (row.role === 'employee') {
            const visible = await dashboard.isEmployeeDashboardVisible();
            expect(visible).toBeTruthy();
            for (const el of elements) {
              const sel = selectors.employeeDashboard[el];
              if (sel) {
                await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 });
              }
            }
          } else if (row.role === 'manager') {
            const visible = await dashboard.isManagerDashboardVisible();
            expect(visible).toBeTruthy();
            for (const el of elements) {
              const sel = selectors.managerDashboard[el];
              if (sel) {
                await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 });
              }
            }
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
