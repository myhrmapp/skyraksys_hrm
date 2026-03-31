/**
 * Add comprehensive Business Workflow tests to the Excel workbook.
 *
 * Two sheets are created / replaced:
 *   1. BusinessWorkflows  — ALL workflow rows (ready + needs-implementation)
 *   2. WorkflowsReady     — View of only implementationStatus=ready rows (runnable)
 *
 * Run:  node e2e-excel/utils/add-workflow-tests.js
 */
const xlsx = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = xlsx.readFile(EXCEL_PATH);

// ─── Column schema ──────────────────────────────────────────────────────
// Every row uses a superset of columns. Unused columns are left blank.
// Columns:
//   testId, description, action, enabled, implementationStatus,
//   role, role2,                          ← roles for multi-login flows
//   firstName, lastName, email, phone,    ← employee / user fields
//   department, position,                 ← org fields
//   leaveType, startDate, endDate, reason,← leave fields
//   mondayHours … sundayHours, notes,     ← timesheet fields
//   projectName, taskName, taskStatus, taskPriority, ← task fields
//   reviewType, reviewPeriod,             ← review fields
//   month, year,                          ← payroll fields
//   targetUrl, expectDenied,              ← RBAC fields
//   expectSuccess, expectedElement,       ← assertions
//   prerequisite,                         ← dependency chain
//   tags                                  ← @smoke @regression etc.

const R = 'ready';              // implementationStatus
const N = 'needs-implementation';

function row(fields) {
  return {
    testId: '', description: '', action: '', enabled: 'TRUE',
    implementationStatus: R,
    role: '', role2: '',
    firstName: '', lastName: '', email: '', phone: '',
    department: '', position: '',
    leaveType: '', startDate: '', endDate: '', reason: '',
    mondayHours: '', tuesdayHours: '', wednesdayHours: '',
    thursdayHours: '', fridayHours: '', saturdayHours: '', sundayHours: '',
    notes: '',
    projectName: '', taskName: '', taskStatus: '', taskPriority: '',
    reviewType: '', reviewPeriod: '',
    month: '', year: '',
    targetUrl: '', expectDenied: '',
    expectSuccess: 'TRUE', expectedElement: '',
    prerequisite: '', tags: '',
    ...fields,
  };
}

// ─── WORKFLOW DEFINITIONS ───────────────────────────────────────────────

const workflows = [
  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1 — EMPLOYEE ONBOARDING JOURNEY (BW-010 … BW-019)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-010', action: 'onboardingFull',
    description: 'Full employee onboarding: add employee with all 4 tabs filled',
    role: 'admin', tags: '@smoke @onboarding',
    firstName: 'QA', lastName: 'Onboardee', email: 'qa.onboard@test.com', phone: '9876543210',
    department: 'Engineering', position: 'Software Engineer (Mid)',
  }),
  row({ testId: 'BW-011', action: 'onboardingCreateLogin',
    description: 'Create user login for newly onboarded employee',
    role: 'admin', tags: '@onboarding',
    prerequisite: 'BW-010',
    email: 'qa.onboard@test.com', firstName: 'QA', lastName: 'Onboardee',
  }),
  row({ testId: 'BW-012', action: 'onboardingVerifyDashboard',
    description: 'New employee logs in and sees employee dashboard',
    role: 'employee', tags: '@onboarding',
    prerequisite: 'BW-011',
    email: 'qa.onboard@test.com',
    expectedElement: 'employee-dashboard-page',
  }),
  row({ testId: 'BW-013', action: 'onboardingAssignDepartment',
    description: 'HR assigns department and position to new employee',
    role: 'hr', tags: '@onboarding',
    prerequisite: 'BW-010',
    department: 'Engineering', position: 'Developer',
    firstName: 'QA', lastName: 'Onboardee',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2 — LEAVE MANAGEMENT END-TO-END (BW-020 … BW-039)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-020', action: 'leaveRequestSubmit',
    description: 'Employee submits casual leave request with dates and reason',
    role: 'employee', tags: '@smoke @leave',
    leaveType: 'Casual Leave', startDate: '2026-07-01', endDate: '2026-07-01',
    reason: 'Personal work — workflow test',
  }),
  row({ testId: 'BW-021', action: 'leaveManagerApprove',
    description: 'Manager approves the pending leave request',
    role: 'manager', tags: '@leave',
    prerequisite: 'BW-020',
  }),
  row({ testId: 'BW-022', action: 'leaveVerifyApproved',
    description: 'Employee verifies leave request shows Approved status',
    role: 'employee', tags: '@leave',
    prerequisite: 'BW-021',
    expectedElement: 'Approved',
  }),
  row({ testId: 'BW-023', action: 'leaveRequestReject',
    description: 'Employee submits sick leave, manager rejects with reason',
    role: 'employee', role2: 'manager', tags: '@leave',
    leaveType: 'Sick Leave', startDate: '2026-07-10', endDate: '2026-07-10',
    reason: 'Feeling unwell — workflow reject test',
  }),
  row({ testId: 'BW-024', action: 'leaveBalanceCheck',
    description: 'Employee views leave balance cards after approved leave',
    role: 'employee', tags: '@leave',
    prerequisite: 'BW-022',
  }),
  row({ testId: 'BW-025', action: 'leaveCancelPending',
    description: 'Employee submits leave then cancels it before approval',
    role: 'employee', tags: '@leave',
    leaveType: 'Casual Leave', startDate: '2026-08-01', endDate: '2026-08-01',
    reason: 'Cancel test — workflow',
  }),
  row({ testId: 'BW-026', action: 'leaveOverlapCheck',
    description: 'Employee submits leave overlapping with already-approved leave — should warn/reject',
    role: 'employee', tags: '@leave @validation',
    leaveType: 'Casual Leave', startDate: '2026-07-01', endDate: '2026-07-01',
    reason: 'Overlap test',
    prerequisite: 'BW-022',
  }),
  row({ testId: 'BW-027', action: 'leaveBalanceExhausted',
    description: 'Employee tries to submit leave when balance is zero — should reject',
    role: 'employee', tags: '@leave @validation',
    leaveType: 'Casual Leave', startDate: '2026-09-01', endDate: '2026-09-30',
    reason: 'Exhaust balance test',
  }),
  row({ testId: 'BW-028', action: 'leaveAdminManagement',
    description: 'Admin views leave management, filters by status, searches by employee name',
    role: 'admin', tags: '@leave',
  }),
  row({ testId: 'BW-029', action: 'leaveTypesCRUD',
    description: 'Admin adds new leave type, verifies it appears, then deletes it',
    role: 'admin', tags: '@leave @admin',
    leaveType: 'WF-Test Leave',
  }),
  row({ testId: 'BW-030', action: 'leaveAccrualRun',
    description: 'Admin opens leave accrual, previews, and runs accrual process',
    role: 'admin', tags: '@leave @admin',
  }),
  row({ testId: 'BW-031', action: 'leaveMultiDay',
    description: 'Employee submits 3-day leave, manager approves, balance deducted by 3',
    role: 'employee', role2: 'manager', tags: '@leave',
    leaveType: 'Annual Leave', startDate: '2026-08-10', endDate: '2026-08-12',
    reason: 'Three day vacation — workflow test',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3 — ATTENDANCE WORKFLOWS (BW-040 … BW-049)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-040', action: 'attendanceCheckInOut',
    description: 'Employee checks in, verifies status, checks out, verifies status',
    role: 'employee', tags: '@smoke @attendance',
  }),
  row({ testId: 'BW-041', action: 'attendanceAdminMark',
    description: 'Admin marks attendance for an employee via management UI',
    role: 'admin', tags: '@attendance',
  }),
  row({ testId: 'BW-042', action: 'attendanceMonthNav',
    description: 'Employee navigates to previous month and verifies attendance data grid',
    role: 'employee', tags: '@attendance',
  }),
  row({ testId: 'BW-043', action: 'attendanceAdminFilter',
    description: 'Admin filters attendance by date and verifies results',
    role: 'admin', tags: '@attendance',
    startDate: '2026-03-01',
  }),
  row({ testId: 'BW-044', action: 'attendanceMissedCheckout',
    description: 'Employee checks in but forgets check-out — verify status shows CHECKED IN',
    role: 'employee', tags: '@attendance @edge',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4 — TIMESHEET WORKFLOWS (BW-050 … BW-069)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-050', action: 'timesheetWeeklyEntry',
    description: 'Employee fills full week hours (Mon-Fri 8h each), saves draft',
    role: 'employee', tags: '@smoke @timesheet',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8',
    thursdayHours: '8', fridayHours: '8',
    projectName: '', notes: 'Weekly workflow test',
  }),
  row({ testId: 'BW-051', action: 'timesheetSubmit',
    description: 'Employee submits saved timesheet for approval',
    role: 'employee', tags: '@timesheet',
    prerequisite: 'BW-050',
  }),
  row({ testId: 'BW-052', action: 'timesheetReadOnlyAfterSubmit',
    description: 'Submitted timesheet is read-only for employee',
    role: 'employee', tags: '@timesheet',
    prerequisite: 'BW-051',
  }),
  row({ testId: 'BW-053', action: 'timesheetManagerApprove',
    description: 'Manager approves submitted timesheet with comments',
    role: 'manager', tags: '@timesheet',
    prerequisite: 'BW-051',
    notes: 'Approved — looks good',
  }),
  row({ testId: 'BW-054', action: 'timesheetManagerReject',
    description: 'Manager rejects submitted timesheet with mandatory comments',
    role: 'manager', tags: '@timesheet',
    notes: 'Please correct Wednesday hours',
  }),
  row({ testId: 'BW-055', action: 'timesheetResubmitAfterReject',
    description: 'Employee edits rejected timesheet and resubmits',
    role: 'employee', tags: '@timesheet',
    prerequisite: 'BW-054',
    wednesdayHours: '7',
  }),
  row({ testId: 'BW-056', action: 'timesheetBulkApprove',
    description: 'Manager selects multiple timesheets and bulk-approves',
    role: 'manager', tags: '@timesheet',
  }),
  row({ testId: 'BW-057', action: 'timesheetHistoryExport',
    description: 'Employee exports timesheet history to file',
    role: 'employee', tags: '@timesheet',
  }),
  row({ testId: 'BW-058', action: 'timesheetMultiProject',
    description: 'Employee adds 2 task rows with different projects, fills hours for both',
    role: 'employee', tags: '@timesheet',
    mondayHours: '4', tuesdayHours: '4',
    notes: 'Multi-project workflow',
  }),
  row({ testId: 'BW-059', action: 'timesheetValidation',
    description: 'Employee enters >24 hours in a day — validation rejects',
    role: 'employee', tags: '@timesheet @validation',
    mondayHours: '25',
  }),
  row({ testId: 'BW-060', action: 'timesheetEmptySubmitBlocked',
    description: 'Empty timesheet submit is blocked',
    role: 'employee', tags: '@timesheet @validation',
  }),
  row({ testId: 'BW-061', action: 'timesheetOvertimeAlert',
    description: 'Employee enters >40 weekly hours — overtime indicator appears',
    role: 'employee', tags: '@timesheet @validation',
    mondayHours: '9', tuesdayHours: '9', wednesdayHours: '9',
    thursdayHours: '9', fridayHours: '9',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5 — PAYROLL WORKFLOWS (BW-070 … BW-089)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-070', action: 'payrollPageAndTabs',
    description: 'Admin navigates payroll management page and verifies all 4 tabs exist',
    role: 'admin', tags: '@smoke @payroll',
  }),
  row({ testId: 'BW-071', action: 'payrollGenerate',
    description: 'Admin navigates to generate tab, selects employees, clicks validate & generate',
    role: 'admin', tags: '@payroll',
    month: '3', year: '2026',
  }),
  row({ testId: 'BW-072', action: 'payrollFinalize',
    description: 'Admin bulk-finalizes generated payslips',
    role: 'admin', tags: '@payroll',
    prerequisite: 'BW-071',
  }),
  row({ testId: 'BW-073', action: 'payrollMarkPaid',
    description: 'Admin marks finalized payslips as paid',
    role: 'admin', tags: '@payroll',
    prerequisite: 'BW-072',
  }),
  row({ testId: 'BW-074', action: 'payrollEmployeeView',
    description: 'Employee views own payslips page, checks summary cards and table',
    role: 'employee', tags: '@payroll',
  }),
  row({ testId: 'BW-075', action: 'payrollEmployeeDownload',
    description: 'Employee downloads a payslip PDF',
    role: 'employee', tags: '@payroll',
  }),
  row({ testId: 'BW-076', action: 'payrollSearchAndExport',
    description: 'Admin searches payslips and exports to file',
    role: 'admin', tags: '@payroll',
  }),
  row({ testId: 'BW-077', action: 'payrollTemplateConfig',
    description: 'Admin views payroll template configuration page',
    role: 'admin', tags: '@payroll',
  }),
  row({ testId: 'BW-078', action: 'payrollHRAccess',
    description: 'HR accesses payroll management with full read/export permissions',
    role: 'hr', tags: '@payroll @rbac',
  }),
  row({ testId: 'BW-079', action: 'payrollEmployeeRBAC',
    description: 'Employee cannot access payroll management page',
    role: 'employee', tags: '@payroll @rbac',
    targetUrl: 'payroll', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-080', action: 'payrollSalaryBreakdown',
    description: 'Verify generated payslip amounts match employee salary components (basic + allowances - deductions)',
    role: 'admin', tags: '@payroll @accuracy',
  }),
  row({ testId: 'BW-081', action: 'payrollReprocess',
    description: 'Admin re-generates payroll for a month that already has payslips',
    role: 'admin', tags: '@payroll @edge',
    month: '3', year: '2026',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6 — TASK & PROJECT MANAGEMENT (BW-090 … BW-099)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-090', action: 'taskViewAndFilter',
    description: 'Employee views my tasks, filters by priority High',
    role: 'employee', tags: '@smoke @tasks',
    taskPriority: 'High',
  }),
  row({ testId: 'BW-091', action: 'taskStatusChange',
    description: 'Employee changes task status from Not Started to In Progress',
    role: 'employee', tags: '@tasks',
    taskStatus: 'In Progress',
  }),
  row({ testId: 'BW-092', action: 'projectCreateAndVerify',
    description: 'Admin creates project, verifies it appears in project list',
    role: 'admin', tags: '@tasks',
    projectName: 'WF-Test Project', notes: 'Workflow test project',
    startDate: '2026-03-01', endDate: '2026-12-31',
  }),
  row({ testId: 'BW-093', action: 'taskCreateUnderProject',
    description: 'Admin creates a task under the project, verifies task tab shows it',
    role: 'admin', tags: '@tasks',
    prerequisite: 'BW-092',
    taskName: 'WF-Test Task', taskPriority: 'High', taskStatus: 'Not Started',
    projectName: 'WF-Test Project',
  }),
  row({ testId: 'BW-094', action: 'projectEditAndDelete',
    description: 'Admin edits project name, then deletes it',
    role: 'admin', tags: '@tasks',
    prerequisite: 'BW-092',
    projectName: 'WF-Test Project',
  }),
  row({ testId: 'BW-095', action: 'taskAssignToEmployee',
    description: 'Admin assigns task to employee and employee sees it in My Tasks',
    role: 'admin', role2: 'employee', tags: '@tasks',
    taskName: 'WF-Assigned Task',
  }),
  row({ testId: 'BW-096', action: 'taskProjectRBAC',
    description: 'Employee cannot access project config page',
    role: 'employee', tags: '@tasks @rbac',
    targetUrl: '/tasks/config', expectDenied: 'TRUE',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7 — REVIEW / PERFORMANCE WORKFLOWS (BW-100 … BW-109)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-100', action: 'reviewCreate',
    description: 'Admin creates a new performance review',
    role: 'admin', tags: '@smoke @reviews',
    reviewType: 'quarterly', reviewPeriod: 'Q1 2026',
  }),
  row({ testId: 'BW-101', action: 'reviewSelfAssessment',
    description: 'Employee submits self-assessment on their review',
    role: 'admin', tags: '@reviews',
    prerequisite: 'BW-100',
  }),
  row({ testId: 'BW-102', action: 'reviewApprove',
    description: 'Admin approves the reviewed performance review',
    role: 'admin', tags: '@reviews',
    prerequisite: 'BW-101',
  }),
  row({ testId: 'BW-103', action: 'reviewSearchFilter',
    description: 'Search reviews by employee name and filter by status',
    role: 'admin', tags: '@reviews',
    firstName: 'John',
  }),
  row({ testId: 'BW-104', action: 'reviewEditDelete',
    description: 'Admin edits a review, then deletes another',
    role: 'admin', tags: '@reviews',
  }),
  row({ testId: 'BW-105', action: 'reviewFullCycle',
    description: 'Full cycle: create → self-assess → manager-rate → HR-approve → finalize',
    role: 'admin', role2: 'employee', tags: '@reviews @critical',
    reviewType: 'annual', reviewPeriod: '2026',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8 — ORGANIZATION MANAGEMENT (BW-110 … BW-119)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-110', action: 'orgDeptCRUD',
    description: 'Admin creates department, edits it, then deletes it',
    role: 'admin', tags: '@smoke @organization',
    department: 'WF-Test Dept',
  }),
  row({ testId: 'BW-111', action: 'orgPositionCRUD',
    description: 'Admin creates position, edits it, then deletes it',
    role: 'admin', tags: '@organization',
    position: 'WF-Test Position',
  }),
  row({ testId: 'BW-112', action: 'orgHolidayCRUD',
    description: 'Admin creates holiday, verifies it appears, then deletes',
    role: 'admin', tags: '@organization',
    startDate: '2026-12-25',
  }),
  row({ testId: 'BW-113', action: 'orgDeptSearch',
    description: 'Admin searches departments by name',
    role: 'admin', tags: '@organization',
    department: 'Engineering',
  }),
  row({ testId: 'BW-114', action: 'orgDeptEmptyValidation',
    description: 'Admin tries to add department with empty name — validation blocks',
    role: 'admin', tags: '@organization @validation',
  }),
  row({ testId: 'BW-115', action: 'orgRBAC',
    description: 'Employee cannot access organization management',
    role: 'employee', tags: '@organization @rbac',
    targetUrl: '/admin/organization', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-116', action: 'orgDeptDeleteWithEmployees',
    description: 'Admin tries to delete department with assigned employees — blocked or warned',
    role: 'admin', tags: '@organization @edge',
    department: 'Engineering',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 9 — USER MANAGEMENT (BW-120 … BW-129)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-120', action: 'userCreateFull',
    description: 'Admin creates a new user with all fields (email, name, role, password)',
    role: 'admin', tags: '@smoke @usermgmt',
    email: 'wf.newuser@test.com', firstName: 'WF', lastName: 'User',
  }),
  row({ testId: 'BW-121', action: 'userSearchAndFilter',
    description: 'Admin searches user by name and filters by role',
    role: 'admin', tags: '@usermgmt',
    firstName: 'admin',
  }),
  row({ testId: 'BW-122', action: 'userValidation',
    description: 'Submit empty form shows validation; password mismatch caught',
    role: 'admin', tags: '@usermgmt @validation',
  }),
  row({ testId: 'BW-123', action: 'userRBAC',
    description: 'Non-admin users cannot access user management',
    role: 'employee', tags: '@usermgmt @rbac',
    targetUrl: '/admin/user-management', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-124', action: 'userRoleChange',
    description: 'Admin changes user role from employee to manager and verifies access changes',
    role: 'admin', tags: '@usermgmt @critical',
  }),
  row({ testId: 'BW-125', action: 'userAccountDeactivate',
    description: 'Admin deactivates user account, verifies login is blocked',
    role: 'admin', tags: '@usermgmt @critical',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 10 — CROSS-MODULE INTEGRATION (BW-130 … BW-149)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-130', action: 'hireToPaycheck',
    description: 'Full hire-to-paycheck: create employee → assign dept → create login → generate payslip',
    role: 'admin', tags: '@critical @integration',
    firstName: 'HirePay', lastName: 'Test',
    department: 'Engineering', position: 'Software Engineer (Mid)',
  }),
  row({ testId: 'BW-131', action: 'leaveAffectsAttendance',
    description: 'Approved leave day shows as leave in attendance view (not absent)',
    role: 'employee', role2: 'admin', tags: '@integration',
    leaveType: 'Casual Leave', startDate: '2026-07-15', endDate: '2026-07-15',
  }),
  row({ testId: 'BW-132', action: 'timesheetToPayroll',
    description: 'Approved timesheet hours reflect in payroll calculation',
    role: 'employee', role2: 'admin', tags: '@integration',
  }),
  row({ testId: 'BW-133', action: 'dashboardDataAccuracy',
    description: 'Dashboard stat cards reflect actual employee/leave/attendance counts',
    role: 'admin', tags: '@integration @data-accuracy',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 11 — RBAC & ACCESS CONTROL (BW-150 … BW-169)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-150', action: 'rbacEmployeeDenied',
    description: 'Employee denied access to employee management',
    role: 'employee', tags: '@rbac',
    targetUrl: 'employees', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-151', action: 'rbacEmployeeDenied',
    description: 'Employee denied access to payroll management',
    role: 'employee', tags: '@rbac',
    targetUrl: 'payroll', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-152', action: 'rbacEmployeeDenied',
    description: 'Employee denied access to leave management (admin)',
    role: 'employee', tags: '@rbac',
    targetUrl: 'leave-management', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-153', action: 'rbacEmployeeDenied',
    description: 'Employee denied access to attendance management',
    role: 'employee', tags: '@rbac',
    targetUrl: 'attendance-management', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-154', action: 'rbacManagerDenied',
    description: 'Manager denied access to payroll management',
    role: 'manager', tags: '@rbac',
    targetUrl: 'payroll', expectDenied: 'TRUE',
  }),
  row({ testId: 'BW-155', action: 'rbacManagerAllowed',
    description: 'Manager can access timesheets and approve them',
    role: 'manager', tags: '@rbac',
    targetUrl: 'timesheets',
  }),
  row({ testId: 'BW-156', action: 'rbacHRAllowed',
    description: 'HR can access employee management and leave management',
    role: 'hr', tags: '@rbac',
  }),
  row({ testId: 'BW-157', action: 'rbacAdminFull',
    description: 'Admin can access all modules without restriction',
    role: 'admin', tags: '@rbac',
  }),
  row({ testId: 'BW-158', action: 'rbacSessionExpiry',
    description: 'Session expiry redirects to login page',
    role: 'employee', tags: '@rbac @security',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 12 — NAVIGATION & UI SMOKE (BW-170 … BW-179)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-170', action: 'navAdminSidebar',
    description: 'Admin sidebar shows all navigation items and each navigates correctly',
    role: 'admin', tags: '@smoke @navigation',
  }),
  row({ testId: 'BW-171', action: 'navEmployeeSidebar',
    description: 'Employee sidebar shows limited nav items matching role permissions',
    role: 'employee', tags: '@navigation',
  }),
  row({ testId: 'BW-172', action: 'navProfileMenu',
    description: 'Profile menu opens with My Profile and Logout options',
    role: 'employee', tags: '@navigation',
  }),
  row({ testId: 'BW-173', action: 'nav404Page',
    description: 'Navigating to invalid URL shows 404 or redirect',
    role: 'admin', tags: '@navigation',
    targetUrl: '/nonexistent-page-xyz',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 13 — REPORTS & SETTINGS (BW-180 … BW-189)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-180', action: 'reportsPageLoad',
    description: 'Admin opens reports page and verifies date filter and export button',
    role: 'admin', tags: '@smoke @reports',
  }),
  row({ testId: 'BW-181', action: 'settingsTabNavigation',
    description: 'Admin opens settings hub and navigates through email/preferences/advanced tabs',
    role: 'admin', tags: '@settings',
  }),
  row({ testId: 'BW-182', action: 'restoreManagementTabs',
    description: 'Admin opens restore management page and verifies reviews/balances/users tabs',
    role: 'admin', tags: '@admin',
  }),
  row({ testId: 'BW-183', action: 'reportsExport',
    description: 'Admin exports report data and verifies download triggers',
    role: 'admin', tags: '@reports',
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 14 — EMPLOYEE CRUD DEEP (BW-190 … BW-199)
  // ═══════════════════════════════════════════════════════════════════════
  row({ testId: 'BW-190', action: 'employeeCreateEditDelete',
    description: 'Full employee CRUD: create with all fields → verify profile → edit name → delete',
    role: 'admin', tags: '@smoke @employee',
    firstName: 'CRUD', lastName: 'Fulltest', email: 'crud.test@test.com', phone: '9999999999',
    department: 'Engineering',
  }),
  row({ testId: 'BW-191', action: 'employeeSearchFilter',
    description: 'Search for employee, filter by Active status, filter by department',
    role: 'admin', tags: '@employee',
    firstName: 'John', department: 'Engineering',
  }),
  row({ testId: 'BW-192', action: 'employeeExport',
    description: 'Admin exports employee list and verifies download',
    role: 'admin', tags: '@employee',
  }),
  row({ testId: 'BW-193', action: 'employeeFormValidation',
    description: 'Submit employee form with invalid email, phone, PAN — all validation errors shown',
    role: 'admin', tags: '@employee @validation',
    email: 'not-valid', phone: '123', firstName: 'Val', lastName: 'Test',
  }),
  row({ testId: 'BW-194', action: 'employeeViewAllTabs',
    description: 'View employee profile and navigate all 4 tabs: personal, employment, emergency, statutory',
    role: 'admin', tags: '@employee',
  }),
  row({ testId: 'BW-195', action: 'employeeManagerTeamView',
    description: 'Manager sees only their team members (fewer than admin)',
    role: 'manager', tags: '@employee @rbac',
  }),
  row({ testId: 'BW-196', action: 'employeeSalaryStructure',
    description: 'Admin fills full salary structure (basic + all allowances + deductions) and verifies save',
    role: 'admin', tags: '@employee @payroll',
    firstName: 'Salary', lastName: 'Test',
  }),
];

// ─── Write to Excel ─────────────────────────────────────────────────────

// Remove old sheets if they exist
for (const name of ['BusinessWorkflows', 'WorkflowsReady']) {
  const idx = wb.SheetNames.indexOf(name);
  if (idx !== -1) {
    wb.SheetNames.splice(idx, 1);
    delete wb.Sheets[name];
  }
}

// Sheet 1: All workflows
const wsAll = xlsx.utils.json_to_sheet(workflows);
xlsx.utils.book_append_sheet(wb, wsAll, 'BusinessWorkflows');

// Sheet 2: Only ready-to-run workflows
const readyRows = workflows.filter(r => r.implementationStatus === R);
const wsReady = xlsx.utils.json_to_sheet(readyRows);
xlsx.utils.book_append_sheet(wb, wsReady, 'WorkflowsReady');

xlsx.writeFile(wb, EXCEL_PATH);

// ─── Summary ────────────────────────────────────────────────────────────
const ready = workflows.filter(r => r.implementationStatus === R).length;
const needsImpl = workflows.filter(r => r.implementationStatus === N).length;
const sections = new Set(workflows.map(r => r.tags.split(' ')[1] || 'uncategorized'));

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          Business Workflow Tests — Summary              ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  Total workflows:          ${String(workflows.length).padStart(4)}                        ║`);
console.log(`║  Ready to run:             ${String(ready).padStart(4)}                        ║`);
console.log(`║  Needs implementation:     ${String(needsImpl).padStart(4)}                        ║`);
console.log(`║  Sections:                 ${String(sections.size).padStart(4)}                        ║`);
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  Sheets written:                                        ║');
console.log('║    • BusinessWorkflows  — all rows (master)             ║');
console.log('║    • WorkflowsReady    — enabled + ready only (runner)  ║');
console.log('╚══════════════════════════════════════════════════════════╝');

console.log('\nBreakdown by section:');
const bySec = {};
for (const r of workflows) {
  const tag = (r.tags.match(/@(\w+)/) || ['', 'other'])[1];
  if (!bySec[tag]) bySec[tag] = { ready: 0, needs: 0 };
  if (r.implementationStatus === R) bySec[tag].ready++; else bySec[tag].needs++;
}
for (const [tag, counts] of Object.entries(bySec).sort((a, b) => (b[1].ready + b[1].needs) - (a[1].ready + a[1].needs))) {
  console.log(`  @${tag.padEnd(18)} ready: ${String(counts.ready).padStart(2)}   needs-impl: ${String(counts.needs).padStart(2)}   total: ${counts.ready + counts.needs}`);
}
