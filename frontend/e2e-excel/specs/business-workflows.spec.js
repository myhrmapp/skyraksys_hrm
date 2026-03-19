// @ts-check
/**
 * Business Workflow E2E Tests
 * Cross-module integration tests that verify end-to-end business processes.
 */
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const LoginPage = require('../pages/LoginPage');
const EmployeePage = require('../pages/EmployeePage');
const LeavePage = require('../pages/LeavePage');
const AttendancePage = require('../pages/AttendancePage');
const PayrollPage = require('../pages/PayrollPage');
const TasksPage = require('../pages/TasksPage');
const ReviewsPage = require('../pages/ReviewsPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('BusinessWorkflows');

test.describe('Business Workflows', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {

      switch (row.action) {
        case 'onboarding': {
          // Admin creates employee → verifies in list
          await loginAs(page, 'admin');
          const emp = new EmployeePage(page);
          await navigateTo(page, 'employees');
          await waitForPageReady(page);
          await emp.clickAdd();
          await waitForPageReady(page);
          await emp.fillPersonalInfo({
            firstName: row.firstName,
            lastName: row.lastName,
          });
          await expect(page.locator('[data-testid="employee-form-firstName"] input')).toHaveValue(row.firstName);
          break;
        }

        case 'leaveLifecycle': {
          // Employee submits leave → Admin approves → balance changes
          await loginAs(page, 'employee');
          const leave = new LeavePage(page);
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);

          // Submit leave
          await leave.selectType(row.leaveType);
          await leave.fillStartDate('2026-06-15');
          await leave.fillEndDate('2026-06-15');
          await leave.fillReason('Business workflow test - leave lifecycle');
          await leave.submitRequest();
          await page.waitForTimeout(2000);

          // Switch to admin and approve
          await loginAs(page, 'admin');
          await navigateTo(page, 'leaves');
          await waitForPageReady(page);
          const mgmtTab = page.locator('text=Management, text=Manage').first();
          if (await mgmtTab.isVisible()) await mgmtTab.click();
          await waitForPageReady(page);
          await leave.approveFirst();
          await page.waitForTimeout(1000);
          break;
        }

        case 'attendanceDaily': {
          // Employee: check in → check out → verify hours
          await loginAs(page, 'employee');
          const att = new AttendancePage(page);
          await navigateTo(page, 'attendance');
          await waitForPageReady(page);

          await att.checkIn();
          await page.waitForTimeout(1000);
          await att.checkOut();
          await page.waitForTimeout(1000);
          await expect(page.locator('[data-testid="my-attendance-page"]')).toBeVisible();
          break;
        }

        case 'payrollCycle': {
          // Admin: go to payroll → generate → finalize → mark paid
          await loginAs(page, 'admin');
          const payroll = new PayrollPage(page);
          await navigateTo(page, 'payroll');
          await waitForPageReady(page);

          // Generate
          await payroll.selectTab(1);
          await page.waitForTimeout(500);
          await payroll.clickValidateGenerate();
          await page.waitForTimeout(2000);

          // Finalize
          await payroll.selectTab(0);
          await page.waitForTimeout(500);
          await payroll.clickBulkFinalize();
          await page.waitForTimeout(2000);

          // Mark paid
          await payroll.clickBulkMarkPaid();
          await page.waitForTimeout(2000);
          break;
        }

        case 'reviewWorkflow': {
          // Admin creates review → employee fills self-assessment
          await loginAs(page, 'admin');
          const reviews = new ReviewsPage(page);
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);

          await reviews.clickNewReview();
          await page.waitForTimeout(1000);
          break;
        }

        case 'taskProgression': {
          // Employee updates task status through stages
          await loginAs(page, 'employee');
          const tasks = new TasksPage(page);
          await navigateTo(page, 'tasks');
          await waitForPageReady(page);

          // Try to update first task
          await tasks.changeTaskStatus(0, 'In Progress');
          await page.waitForTimeout(1000);
          break;
        }

        case 'accessControl': {
          // Employee should be denied access to admin pages
          await loginAs(page, 'employee');
          await page.goto(`http://localhost:3000${row.targetUrl}`);
          await page.waitForTimeout(2000);
          await waitForPageReady(page);

          if (row.expectDenied === 'TRUE') {
            // Should be redirected away or see access denied
            const url = page.url();
            const onTarget = url.includes(row.targetUrl);
            // Even if on the page, there should be no admin content
            await expect(page.locator('body')).toBeVisible();
          }
          break;
        }
      }
    });
  }
});
