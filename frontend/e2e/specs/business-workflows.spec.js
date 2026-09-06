// @ts-check
/**
 * Business Workflow E2E Tests — Comprehensive Edition
 *
 * Cross-module integration tests that verify end-to-end business processes.
 * Driven by the "WorkflowsReady" Excel sheet (only implementationStatus=ready rows).
 *
 * To run all ready workflows:
 *   npx playwright test --config=playwright-excel.config.js business-workflows
 *
 * To run a specific workflow by ID:
 *   TEST_IDS=BW-050,BW-051 npx playwright test --config=playwright-excel.config.js business-workflows
 */
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const EmployeePage = require('../pages/EmployeePage');
const LeavePage = require('../pages/LeavePage');
const AttendancePage = require('../pages/AttendancePage');
const PayrollPage = require('../pages/PayrollPage');
const TimesheetPage = require('../pages/TimesheetPage');
const TasksPage = require('../pages/TasksPage');
const ReviewsPage = require('../pages/ReviewsPage');
const OrganizationPage = require('../pages/OrganizationPage');
const UserManagementPage = require('../pages/UserManagementPage');
const { verifyEmployeeInDB, verifyLeaveInDB, verifyDepartmentInDB, verifyProjectInDB, verifyReviewInDB, verifyUserInDB, deleteRecordViaAPI } = require('../utils/api-verify');

const reader = new ExcelReader();

// Use WorkflowsReady sheet (only ready-to-run rows) — falls back to BusinessWorkflows
let rows;
try {
  rows = reader.getSelectedTests('WorkflowsReady');
} catch {
  rows = reader.getSelectedTests('BusinessWorkflows')
    .filter(r => (r.implementationStatus || 'ready') === 'ready');
}

// Route map: short Excel name → actual app route
const ROUTE_MAP = {
  employees: '/employees',
    leaves: '/leave',
  'leave-management': '/leave-management',
    attendance: '/attendance',
    'attendance-management': '/attendance?view=management',
  payroll: '/payroll-management',
  reviews: '/employee-reviews',
  tasks: '/my-tasks',
  timesheets: '/timesheets',
};

test.describe('Business Workflows', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      const action = row.action;

      // ═══════════════════════════════════════════════════════════════
      // EMPLOYEE ONBOARDING
      // ═══════════════════════════════════════════════════════════════
      const { ActionRegistry } = require('../actions/action-registry');
      
      const context = {
        test, page, row, expect, loginAs, waitForPageReady, navigateTo, ROUTE_MAP,
        EmployeePage, LeavePage, AttendancePage, PayrollPage, TimesheetPage, TasksPage, ReviewsPage, OrganizationPage, UserManagementPage,
        verifyEmployeeInDB, verifyLeaveInDB, verifyDepartmentInDB, verifyProjectInDB, verifyReviewInDB, verifyUserInDB, deleteRecordViaAPI
      };

      await ActionRegistry.execute(action, context);

    });
  }
});
