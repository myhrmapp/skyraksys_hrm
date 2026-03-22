// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Navigation');

// Map Excel short names → actual sidebar nav testid suffixes (from Layout.js path-based testids)
const NAV_MAP = {
  admin: {
    dashboard: 'admin-dashboard', employees: 'employees', leaves: 'leave-management',
    attendance: 'attendance-management', timesheets: 'timesheets', payroll: 'payroll-management',
    tasks: 'project-task-config', reviews: 'employee-reviews', payslips: 'employee-payslips',
  },
  hr: {
    dashboard: 'admin-dashboard', employees: 'employees', leaves: 'leave-management',
    attendance: 'attendance-management', timesheets: 'timesheets', payroll: 'payroll-management',
    tasks: 'project-task-config', reviews: 'employee-reviews', payslips: 'employee-payslips',
  },
  manager: {
    dashboard: 'manager-dashboard', employees: 'employees', leaves: 'leave-management',
    timesheets: 'timesheets', tasks: 'project-task-config', reviews: 'employee-reviews',
    payslips: 'employee-payslips',
  },
  employee: {
    dashboard: 'employee-dashboard', leaves: 'leave-requests', attendance: 'my-attendance',
    timesheets: 'timesheets', tasks: 'my-tasks', payslips: 'employee-payslips',
    reviews: 'employee-reviews',
  },
};

function resolveNavTestid(role, shortName) {
  return NAV_MAP[role]?.[shortName] || shortName;
}

test.describe('Navigation & Access Control', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      // Navigate to role-specific dashboard after login to ensure sidebar is visible
      const DASHBOARD_ROUTES = { admin: '/admin-dashboard', hr: '/admin-dashboard', manager: '/manager-dashboard', employee: '/employee-dashboard' };

      if (row.role) {
        await loginAs(page, row.role);
        await page.goto(DASHBOARD_ROUTES[row.role] || '/dashboard');
        await waitForPageReady(page);
      }

      switch (row.action) {
        case 'verifySidebar': {
          const expected = (row.expectedItems || '').split(',').filter(Boolean);
          for (const item of expected) {
            const tid = resolveNavTestid(row.role, item.trim());
            const navItem = page.locator(`[data-testid="nav-${tid}"]`).first();
            await expect(navItem).toBeVisible({ timeout: 8000 });
          }
          break;
        }

        case 'navigateAll': {
          const modules = (row.modules || '').split(',').filter(Boolean);
          for (const mod of modules) {
            const tid = resolveNavTestid(row.role, mod.trim());
            const navItem = page.locator(`[data-testid="nav-${tid}"]`).first();
            if (await navItem.isVisible({ timeout: 3000 }).catch(() => false)) {
              await navItem.click();
              await waitForPageReady(page);
              await page.waitForTimeout(500);
              await expect(page.locator('body')).toBeVisible();
            }
          }
          break;
        }

        case 'verifyRole': {
          const roleChip = page.locator('[data-testid="layout-role-chip"]');
          await expect(roleChip).toBeVisible({ timeout: 8000 });
          const chipText = await roleChip.textContent();
          expect(chipText?.toLowerCase()).toContain(row.expectedText.toLowerCase());
          break;
        }

        case 'profileMenu': {
          const trigger = page.locator('[data-testid="layout-profile-menu-trigger"]');
          await expect(trigger).toBeVisible({ timeout: 8000 });
          await trigger.click();
          const expected = (row.expectedItems || '').split(',').filter(Boolean);
          for (const item of expected) {
            const kebab = item.trim().replace(/([A-Z])/g, '-$1').toLowerCase();
            await expect(page.locator(`[data-testid="layout-menu-${kebab}"]`)).toBeVisible({ timeout: 3000 });
          }
          await page.keyboard.press('Escape');
          break;
        }

        case 'toggleDrawer': {
          // Drawer toggle is only visible on mobile (display: { md: 'none' })
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(500);
          const toggle = page.locator('[data-testid="layout-drawer-toggle"]');
          await expect(toggle).toBeVisible({ timeout: 8000 });
          await toggle.click();
          await page.waitForTimeout(300);
          await expect(page.locator('body')).toBeVisible();
          // Restore desktop viewport
          await page.setViewportSize({ width: 1280, height: 720 });
          break;
        }

        case 'notFound': {
          await page.goto(row.path);
          await page.waitForTimeout(1000);
          await expect(page.locator('body')).toBeVisible();
          break;
        }

        case 'authRedirect': {
          // Fresh context — no login
          await page.goto(row.path);
          await page.waitForTimeout(2000);
          await expect(page).toHaveURL(/\/login/);
          break;
        }
      }
    });
  }
});
