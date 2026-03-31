// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const AttendancePage = require('../pages/AttendancePage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Attendance');

// Route depends on role: employee → /my-attendance, admin/hr → /attendance-management
const ADMIN_ACTIONS = ['managementLoad', 'filterDate', 'markAttendance'];

test.describe('Attendance Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const attendance = new AttendancePage(page);
      const route = ADMIN_ACTIONS.includes(row.action) ? 'attendance-management' : 'my-attendance';

      switch (row.action) {
        case 'pageLoad': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'checkIn': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          // Check-in button may be absent if already checked in today
          await attendance.checkIn();
          break;
        }

        case 'checkOut': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          // Check-out button may be absent if not checked in or already checked out
          await attendance.checkOut();
          break;
        }

        case 'changeMonth': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          await attendance.selectMonth(row.month);
          await attendance.selectYear(row.year);
          await page.waitForTimeout(500);
          break;
        }

        case 'managementLoad': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="attendance-management-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'filterDate': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="attendance-management-page"]')).toBeVisible({ timeout: 8000 });
          await attendance.filterByDate(row.date);
          await page.waitForTimeout(500);
          break;
        }

        case 'markAttendance': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="attendance-management-page"]')).toBeVisible({ timeout: 8000 });
          await attendance.clickMarkAttendance();
          await page.waitForTimeout(1000);
          // Close dialog if it opened
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
            const cancelBtn = dialog.locator('button:has-text("Cancel")');
            if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await cancelBtn.click();
            }
          }
          break;
        }

        case 'verifyStatus': {
          await navigateTo(page, route);
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          const status = await attendance.getStatus();
          // Status chip should show: CHECKED IN, CHECKED OUT, or NOT CHECKED IN
          expect(status || '').toBeTruthy();
          break;
        }
      }
    });
  }
});
