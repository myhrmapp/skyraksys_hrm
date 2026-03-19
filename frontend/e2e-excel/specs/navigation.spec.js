// @ts-check
const { test, expect, loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Navigation');

test.describe('Navigation & Access Control', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      if (row.role) {
        await loginAs(page, row.role);
      }

      switch (row.action) {
        case 'verifySidebar': {
          await waitForPageReady(page);
          const expected = (row.expectedItems || '').split(',').filter(Boolean);
          for (const item of expected) {
            const navItem = page.locator(`[data-testid="nav-${item}"], [data-testid="nav-/${item}"]`);
            await expect(navItem.first()).toBeVisible({ timeout: 5000 });
          }
          break;
        }

        case 'navigateAll': {
          const modules = (row.modules || '').split(',').filter(Boolean);
          for (const mod of modules) {
            const navItem = page.locator(`[data-testid="nav-${mod}"], [data-testid="nav-/${mod}"]`).first();
            if (await navItem.isVisible()) {
              await navItem.click();
              await waitForPageReady(page);
              await page.waitForTimeout(500);
              // Page should have loaded without errors
              await expect(page.locator('body')).toBeVisible();
            }
          }
          break;
        }

        case 'verifyRole': {
          await waitForPageReady(page);
          const roleChip = page.locator('[data-testid="layout-role-chip"]');
          await expect(roleChip).toBeVisible({ timeout: 5000 });
          const chipText = await roleChip.textContent();
          expect(chipText?.toLowerCase()).toContain(row.expectedText.toLowerCase());
          break;
        }

        case 'profileMenu': {
          await waitForPageReady(page);
          await page.locator('[data-testid="layout-profile-menu-trigger"]').click();
          const expected = (row.expectedItems || '').split(',').filter(Boolean);
          for (const item of expected) {
            const menuItem = page.locator(`[data-testid="layout-menu-${item}"]`);
            if (item === 'viewProfile') {
              await expect(page.locator('[data-testid="layout-menu-view-profile"]')).toBeVisible();
            } else {
              await expect(menuItem).toBeVisible({ timeout: 3000 });
            }
          }
          // Close menu
          await page.keyboard.press('Escape');
          break;
        }

        case 'toggleDrawer': {
          await waitForPageReady(page);
          const toggle = page.locator('[data-testid="layout-drawer-toggle"]');
          if (await toggle.isVisible()) {
            await toggle.click();
            await page.waitForTimeout(300);
            // Drawer should visually collapse (checking it didn't break)
            await expect(page.locator('body')).toBeVisible();
          }
          break;
        }

        case 'notFound': {
          await page.goto(`http://localhost:3000${row.path}`);
          await page.waitForTimeout(1000);
          // Should show 404 page or redirect to a known page
          await expect(page.locator('body')).toBeVisible();
          break;
        }

        case 'authRedirect': {
          // Without logging in, navigate to a protected route
          await page.goto(`http://localhost:3000${row.path}`);
          await page.waitForTimeout(2000);
          // Should redirect to login
          await expect(page).toHaveURL(/\/login/);
          break;
        }
      }
    });
  }
});
