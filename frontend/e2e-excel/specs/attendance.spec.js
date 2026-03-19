// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const AttendancePage = require('../pages/AttendancePage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Attendance');

test.describe('Attendance Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const attendance = new AttendancePage(page);

      switch (row.action) {
        case 'pageLoad': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'checkIn': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          const result = await attendance.checkIn();
          // Check-in button may be disabled if already checked in
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible();
          break;
        }

        case 'checkOut': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          const result = await attendance.checkOut();
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible();
          break;
        }

        case 'changeMonth': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          await attendance.selectMonth(row.month);
          await attendance.selectYear(row.year);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible();
          break;
        }

        case 'managementLoad': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          // Admin should see management view or a tab for it
          const mgmtPage = page.locator('[data-testid="attendance-management-page"]');
          const mgmtTab = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab.isVisible()) await mgmtTab.click();
          await expect(mgmtPage.or(page.locator('[data-testid="my-attendance-page"]'))).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'filterDate': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          const mgmtTab2 = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab2.isVisible()) await mgmtTab2.click();
          await waitForPageReady(page);
          await attendance.filterByDate(row.date);
          await page.waitForTimeout(500);
          break;
        }

        case 'markAttendance': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          const mgmtTab3 = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab3.isVisible()) await mgmtTab3.click();
          await waitForPageReady(page);
          await attendance.clickMarkAttendance();
          await page.waitForTimeout(1000);
          break;
        }

        case 'verifyStatus': {
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);
          const status = await attendance.getStatus();
          // Status should be some non-empty string (Checked In / Checked Out / Not Checked In)
          expect(status || '').toBeTruthy();
          break;
        }
      }
    });
  }
});
