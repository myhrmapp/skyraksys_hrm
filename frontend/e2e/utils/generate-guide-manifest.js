/**
 * Generate User Guide Content from Excel Workflow Definitions
 *
 * Reads the WorkflowsReady Excel sheet and generates:
 *   1. public/guides/guide-manifest.json  — manifest for the in-app help system
 *   2. Placeholder entries for each workflow (video URLs filled after recording)
 *
 * Run BEFORE recording videos to create the initial manifest:
 *   node e2e-excel/utils/generate-guide-manifest.js
 *
 * Run AFTER recording videos (the guide-reporter.js merges video paths in):
 *   npx playwright test -c playwright-guide.config.js business-workflows
 */
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const GUIDE_DIR = path.join(__dirname, '..', '..', 'public', 'guides');
const MANIFEST_PATH = path.join(GUIDE_DIR, 'guide-manifest.json');

fs.mkdirSync(path.join(GUIDE_DIR, 'videos'), { recursive: true });
fs.mkdirSync(path.join(GUIDE_DIR, 'screenshots'), { recursive: true });

const wb = xlsx.readFile(EXCEL_PATH);

let rows;
if (wb.SheetNames.includes('WorkflowsReady')) {
  rows = xlsx.utils.sheet_to_json(wb.Sheets['WorkflowsReady']);
} else if (wb.SheetNames.includes('BusinessWorkflows')) {
  rows = xlsx.utils.sheet_to_json(wb.Sheets['BusinessWorkflows'])
    .filter(r => (r.implementationStatus || 'ready') === 'ready');
} else {
  console.error('No WorkflowsReady or BusinessWorkflows sheet found');
  process.exit(1);
}

// Module categorization based on action field
const MODULE_MAP = {
  Employee_Onboarding: { module: 'Employee Management', icon: 'PersonAdd', color: '#1976d2', order: 1 },
  Leave_Management: { module: 'Leave Management', icon: 'EventBusy', color: '#ed6c02', order: 2 },
  Attendance: { module: 'Attendance', icon: 'AccessTime', color: '#2e7d32', order: 3 },
  Timesheet: { module: 'Timesheets', icon: 'Schedule', color: '#9c27b0', order: 4 },
  Payroll: { module: 'Payroll', icon: 'Payment', color: '#d32f2f', order: 5 },
  Tasks_and_Projects: { module: 'Tasks & Projects', icon: 'Assignment', color: '#0288d1', order: 6 },
  Reviews: { module: 'Reviews', icon: 'RateReview', color: '#f57c00', order: 7 },
  Organization_Mgmt: { module: 'Organization', icon: 'Business', color: '#00838f', order: 8 },
  User_Management: { module: 'User Management', icon: 'ManageAccounts', color: '#5e35b1', order: 9 },
  RBAC: { module: 'Access Control', icon: 'Security', color: '#455a64', order: 10 },
  Navigation: { module: 'Navigation & UI', icon: 'Explore', color: '#795548', order: 11 },
  Reports_Settings: { module: 'Reports & Settings', icon: 'Assessment', color: '#607d8b', order: 12 },
  Employee_CRUD: { module: 'Employee Management', icon: 'People', color: '#1976d2', order: 1 },
  Cross_Module: { module: 'Cross-Module Workflows', icon: 'Hub', color: '#e91e63', order: 13 },
};

// Guess section from testId range
function guessSection(testId) {
  const num = parseInt(testId.replace('BW-', ''), 10);
  if (num < 20) return 'Employee_Onboarding';
  if (num < 40) return 'Leave_Management';
  if (num < 50) return 'Attendance';
  if (num < 70) return 'Timesheet';
  if (num < 90) return 'Payroll';
  if (num < 100) return 'Tasks_and_Projects';
  if (num < 110) return 'Reviews';
  if (num < 120) return 'Organization_Mgmt';
  if (num < 130) return 'User_Management';
  if (num < 150) return 'Cross_Module';
  if (num < 170) return 'RBAC';
  if (num < 180) return 'Navigation';
  if (num < 190) return 'Reports_Settings';
  return 'Employee_CRUD';
}

// Role display names
const ROLE_NAMES = {
  admin: 'Administrator',
  hr: 'HR Manager',
  manager: 'Team Lead / Manager',
  employee: 'Employee',
};

// Build guide entries
const guides = rows.map(row => {
  const section = guessSection(row.testId);
  const meta = MODULE_MAP[section] || { module: 'General', icon: 'Help', color: '#757575', order: 99 };
  const videoFile = `${row.testId}.webm`;
  const videoExists = fs.existsSync(path.join(GUIDE_DIR, 'videos', videoFile));

  return {
    testId: row.testId,
    title: row.description,
    module: meta.module,
    icon: meta.icon,
    color: meta.color,
    order: meta.order,
    action: row.action,
    role: row.role || 'admin',
    roleDisplay: ROLE_NAMES[row.role] || row.role || 'Administrator',
    tags: (row.tags || '').split(/[,\s]+/).map(t => t.trim().replace(/^@/, '')).filter(Boolean),
    videoUrl: videoExists ? `guides/videos/${videoFile}` : null,
    screenshotUrl: fs.existsSync(path.join(GUIDE_DIR, 'screenshots', `${row.testId}.png`))
      ? `guides/screenshots/${row.testId}.png` : null,
    steps: generateSteps(row),
    duration: null,
    status: videoExists ? 'recorded' : 'pending',
    recordedAt: videoExists ? fs.statSync(path.join(GUIDE_DIR, 'videos', videoFile)).mtime.toISOString() : null,
  };
});

// Auto-generate step descriptions from action
function generateSteps(row) {
  const steps = [];
  const role = ROLE_NAMES[row.role] || row.role || 'Administrator';
  const action = row.action || '';

  steps.push(`Log in as **${role}**`);

  switch (action) {
    // ── EMPLOYEE ONBOARDING ──────────────────────────────────────────────────
    case 'onboarding':
    case 'onboardingFull':
      steps.push('Navigate to **Employees** → Click **Add Employee**');
      steps.push('Fill **Personal Info**: first name, last name, email, phone, nationality, city, state, PIN code');
      steps.push('Click **Next** → Fill **Employment Info**: department, position, hire date, employment type');
      steps.push('Click **Next** → Fill **Emergency Contact**: contact name and phone number');
      steps.push('Click **Next** → Fill **Statutory & Banking**: PAN, Aadhaar, bank name, account and IFSC');
      steps.push('Toggle **Enable Login** → set password and confirm password');
      steps.push('Click **Submit** → verify the new employee appears in the Employees list');
      break;

    case 'onboardingCreateLogin':
      steps.push('Navigate to **Employees** → search for the target employee by name');
      steps.push('Click the employee row to open their profile');
      steps.push('Click **Create Login** (or go to **Statutory & Banking** tab → User Account section)');
      steps.push('Enter email, set password and confirm → click **Save**');
      steps.push('Verify a success message confirms the login account was created');
      break;

    case 'onboardingVerifyDashboard':
      steps.push('Log out of the admin account');
      steps.push('Log back in using the **new employee\'s credentials** (email + password)');
      steps.push('Verify the **Employee Dashboard** loads with a personalised welcome');
      steps.push('Confirm the sidebar shows: My Timesheet, My Leave, My Payslips, My Attendance, My Profile');
      break;

    case 'onboardingAssignDepartment':
      steps.push('Navigate to **Employees** → locate the new employee in the list');
      steps.push('Click **Edit** → switch to the **Employment Info** tab');
      steps.push('Select the correct **Department** and **Position** from the dropdowns');
      steps.push('Click **Save** → verify the profile now shows the assigned department and position');
      break;

    // ── LEAVE MANAGEMENT ─────────────────────────────────────────────────────
    case 'leaveRequestSubmit':
      steps.push('Navigate to **My Leave** → click **New Leave Request**');
      steps.push('Select **Leave Type** from the dropdown (Annual, Sick, Casual, etc.)');
      steps.push('Pick **Start Date** and **End Date** using the date picker');
      steps.push('Enter a **Reason** in the text area → click **Submit**');
      steps.push('Verify the request appears in the list with **Pending** status');
      break;

    case 'leaveManagerApprove':
      steps.push('Navigate to **Leave Management** → open the **Pending** tab');
      steps.push('Locate the employee\'s leave request in the table');
      steps.push('Click **Approve** → optionally add a review comment');
      steps.push('Click **Confirm** → verify the status changes to **Approved**');
      steps.push('Confirm the employee\'s leave balance decreases accordingly');
      break;

    case 'leaveVerifyApproved':
      steps.push('Navigate to **My Leave** (employee view)');
      steps.push('Verify the approved request shows status **Approved** with the approver\'s name');
      steps.push('Check the leave balance cards at the top — balance should be reduced by the approved days');
      break;

    case 'leaveRequestReject':
      steps.push('Navigate to **Leave Management** → open the **Pending** tab');
      steps.push('Click **Reject** on the target request → enter a mandatory rejection reason');
      steps.push('Click **Confirm** → verify the status changes to **Rejected**');
      steps.push('Verify the employee\'s leave balance is **fully restored**');
      break;

    case 'leaveBalanceCheck':
      steps.push('Navigate to **My Leave** (employee view)');
      steps.push('View the **Leave Balance** cards: Annual, Sick, Casual days available');
      steps.push('Submit a leave request → verify the balance decreases immediately');
      steps.push('Cancel or reject the request → verify the balance is fully restored');
      break;

    case 'leaveCancelPending':
      steps.push('Navigate to **My Leave** → find a leave request with **Pending** status');
      steps.push('Click **Cancel** on the request → confirm the cancellation');
      steps.push('Verify status changes to **Cancelled**');
      steps.push('Verify the leave balance is fully **restored**');
      break;

    case 'leaveAdminManagement':
      steps.push('Navigate to **Leave Management** (admin/HR view)');
      steps.push('Use the **search bar** to filter by employee name');
      steps.push('Filter by **Status** (Pending, Approved, Rejected, Cancelled)');
      steps.push('Filter by **Date Range** to narrow to a specific period');
      steps.push('Approve or reject requests in bulk or individually as needed');
      break;

    case 'leaveTypesCRUD':
      steps.push('Navigate to **Organization** → click the **Leave Types** tab');
      steps.push('Click **Add Leave Type** → enter name, default days, and carry-forward rules');
      steps.push('Click **Save** → verify the new leave type appears in the list');
      steps.push('Click **Edit** to modify an entry → click **Delete** to remove it');
      break;

    case 'leaveLifecycle':
      steps.push('Employee submits a leave request → verify **Pending** status');
      steps.push('Manager approves the request → verify status changes to **Approved**');
      steps.push('Employee requests cancellation → verify status changes to **Cancellation Pending**');
      steps.push('Manager approves the cancellation → verify balance is fully restored');
      break;

    case 'leaveOverlapCheck':
    case 'leaveMultiDay':
      steps.push('Navigate to **My Leave** → submit a leave request for specific dates');
      steps.push('Attempt to submit a second request for overlapping dates');
      steps.push('Verify the system shows an **overlap error** and blocks the duplicate submission');
      break;

    case 'leaveZeroBalanceCheck':
    case 'leaveBalanceExhausted':
      steps.push('Navigate to **My Leave** → confirm leave balance shows **0 days** remaining');
      steps.push('Attempt to submit a new leave request for those leave type days');
      steps.push('Verify the system shows an **Insufficient balance** error and prevents submission');
      break;

    case 'leaveAccrual':
    case 'leaveAccrualRun':
      steps.push('Navigate to **Leave Management** → view an employee\'s leave balance');
      steps.push('Verify annual leave is accrued based on the employee\'s hire date and company policy');
      steps.push('Check that any carry-forward balance from the previous year is applied');
      break;

    case 'leaveDeductionCheck':
      steps.push('Submit and approve a leave request → verify the balance decreases by the correct number of working days');
      steps.push('Cancel the approved leave → verify the balance is restored accurately');
      steps.push('Confirm deduction and restoration amounts match the leave request duration');
      break;

    // ── ATTENDANCE ───────────────────────────────────────────────────────────
    case 'attendanceCheckInOut':
      steps.push('Navigate to **My Attendance** → verify today\'s record is displayed');
      steps.push('Click **Check In** → a timestamp is recorded for the start of the work day');
      steps.push('After work, click **Check Out** → the system calculates total hours worked');
      steps.push('Verify the daily record shows check-in time, check-out time, and duration');
      break;

    case 'attendanceDaily':
      steps.push('Navigate to **My Attendance** → view the monthly attendance calendar');
      steps.push('Verify today\'s status is shown (Present, Absent, or Half Day)');
      steps.push('Click on any past date to view that day\'s check-in, check-out, and hours');
      break;

    case 'attendanceAdminMark':
      steps.push('Navigate to **Attendance Management** → search for the target employee');
      steps.push('Select the date and choose the attendance type (Present, Absent, Half Day, On Leave)');
      steps.push('Click **Mark Attendance** → verify the record is saved');
      steps.push('Check the employee\'s attendance calendar reflects the admin-marked entry');
      break;

    case 'attendanceMonthNav':
      steps.push('Navigate to **My Attendance** → the current month is shown by default');
      steps.push('Use the **Month** and **Year** dropdowns to navigate to a previous period');
      steps.push('Verify historical attendance records load correctly for the selected month');
      break;

    case 'attendanceAdminFilter':
      steps.push('Navigate to **Attendance Management** → use the search bar to find an employee');
      steps.push('Apply a **Department** filter to narrow the employee list');
      steps.push('Set a **Date Range** filter → verify the summary updates with filtered data');
      steps.push('Review totals: Present days, Absent days, and total hours worked');
      break;

    case 'attendanceMissedCheckOut':
    case 'attendanceMissedCheckout':
      steps.push('Employee checks in for the day but does not check out (simulate missed check-out)');
      steps.push('Navigate to **Attendance Management** as admin → locate the incomplete record');
      steps.push('Click **Edit** → manually set the check-out time');
      steps.push('Verify total hours are recalculated and the record is now complete');
      break;

    // ── TIMESHEETS ───────────────────────────────────────────────────────────
    case 'timesheetWeeklyEntry':
      steps.push('Navigate to **My Timesheet** → verify the current week is displayed');
      steps.push('Click **Add Entry** → select a **Project** and **Task** from the dropdowns');
      steps.push('Enter hours for each day of the week (Mon–Fri) in the time grid');
      steps.push('Click **Save Draft** → verify hours are saved and the weekly total updates');
      break;

    case 'timesheetSubmit':
      steps.push('Navigate to **My Timesheet** → review all draft entries for the week');
      steps.push('Verify the total hours and project breakdown look correct');
      steps.push('Click **Submit for Approval** → confirm the submission');
      steps.push('Verify the timesheet status changes to **Submitted** and all fields become read-only');
      break;

    case 'timesheetReadOnlyAfterSubmit':
      steps.push('Navigate to **My Timesheet** → find a timesheet with **Submitted** status');
      steps.push('Attempt to edit any hour entry → verify all fields are **read-only**');
      steps.push('Verify the Submit button is replaced by a status badge');
      steps.push('Confirm the timesheet can only be modified after a manager rejects it');
      break;

    case 'timesheetManagerApprove':
      steps.push('Navigate to **Timesheet Approvals** (manager view) → view pending team timesheets');
      steps.push('Click on an employee\'s submitted timesheet to review hours by project and day');
      steps.push('Click **Approve** → optionally add a comment');
      steps.push('Verify the timesheet status changes to **Approved** in the approvals list');
      break;

    case 'timesheetManagerReject':
      steps.push('Navigate to **Timesheet Approvals** → find a pending team timesheet');
      steps.push('Click **Reject** → enter a mandatory rejection reason in the text field');
      steps.push('Click **Confirm** → verify status changes to **Rejected**');
      steps.push('Employee can now reopen and resubmit the timesheet with corrections');
      break;

    case 'timesheetResubmitAfterReject':
      steps.push('Navigate to **My Timesheet** → find a timesheet with **Rejected** status');
      steps.push('Read the rejection comment from the manager');
      steps.push('Click **Edit** to reopen the timesheet → correct the hours or project entries');
      steps.push('Click **Submit** again → verify status returns to **Submitted** for re-approval');
      break;

    case 'timesheetBulkApprove':
      steps.push('Navigate to **Timesheet Approvals** → switch to the list/table view');
      steps.push('Select multiple pending timesheets using the row checkboxes');
      steps.push('Click **Bulk Approve** at the top of the list → confirm the action');
      steps.push('Verify all selected timesheets change to **Approved** status simultaneously');
      break;

    case 'timesheetHistoryExport':
      steps.push('Navigate to **Timesheet History** → select a date range for the report');
      steps.push('Optionally filter by employee, project, or status');
      steps.push('Click **Export** → verify a CSV or Excel file downloads to your device');
      break;

    case 'timesheetMultiProject':
      steps.push('Navigate to **My Timesheet** → click **Add Entry** → select **Project A**');
      steps.push('Enter hours for Project A for the week → click **Save Draft**');
      steps.push('Click **Add Entry** again → select **Project B** → enter additional hours');
      steps.push('Verify both project entries appear and the weekly total aggregates all hours');
      break;

    case 'timesheetValidation':
      steps.push('Navigate to **My Timesheet** → try submitting without entering any hours');
      steps.push('Verify the validation error: **No hours entered for this week**');
      steps.push('Try entering a negative number in any day field → verify it is rejected');
      steps.push('Enter valid hours → verify the submit button becomes active');
      break;

    case 'timesheetEmptySubmitBlocked':
      steps.push('Navigate to **My Timesheet** → ensure the week has no entries');
      steps.push('Click **Submit** on the empty timesheet');
      steps.push('Verify the system shows an error: hours are required before submitting');
      steps.push('Add at least one hour → verify **Submit** is now allowed');
      break;

    case 'timesheetOvertime':
    case 'timesheetOvertimeAlert':
      steps.push('Navigate to **My Timesheet** → enter more than 8 hours for a single day');
      steps.push('Verify overtime hours are highlighted or flagged in the grid');
      steps.push('Submit the timesheet → verify overtime is visible in the manager approval view');
      break;

    // ── PAYROLL ──────────────────────────────────────────────────────────────
    case 'payrollPageAndTabs':
      steps.push('Navigate to **Payroll Management** → verify the page loads with all tabs');
      steps.push('Click **Payroll List** tab → view all payroll records for the current period');
      steps.push('Click **Generate Payroll** tab → view the generation form');
      steps.push('Click **Payslip Templates** tab → view configured salary templates');
      break;

    case 'payrollGenerate':
      steps.push('Navigate to **Payroll Management** → click the **Generate Payroll** tab');
      steps.push('Select **Month** and **Year** from the dropdowns');
      steps.push('Click **Validate & Generate** → review the preview: salaries, allowances, deductions');
      steps.push('Click **Confirm Generate** → verify payroll records are created with **Draft** status');
      break;

    case 'payrollFinalize':
      steps.push('Navigate to **Payroll Management** → select **Draft** payroll records using checkboxes');
      steps.push('Review all employee payroll entries for accuracy');
      steps.push('Click **Finalize** → confirm the action in the dialog');
      steps.push('Verify status changes from **Draft** to **Finalized** (editing is now locked)');
      break;

    case 'payrollMarkPaid':
      steps.push('Navigate to **Payroll Management** → select **Finalized** payroll records');
      steps.push('Click **Mark as Paid** → enter the payment date and payment method');
      steps.push('Confirm the action → verify status changes to **Paid**');
      steps.push('Employee payslips are now available for download from **My Payslips**');
      break;

    case 'payrollEmployeeView':
      steps.push('Navigate to **My Payslips** (employee view)');
      steps.push('View the payslip summary: gross pay, total deductions, and net pay');
      steps.push('Check the payslip history showing previous months with their payment status');
      break;

    case 'payrollEmployeeDownload':
      steps.push('Navigate to **My Payslips** → find a payslip with **Paid** status');
      steps.push('Click the **Download** button on the payslip row');
      steps.push('Verify a PDF payslip opens or downloads to your device');
      steps.push('Confirm the PDF contains: employee name, pay period, earnings breakdown, deductions, net pay');
      break;

    case 'payrollSearchAndExport':
      steps.push('Navigate to **Payroll Management** → use the search bar to filter by employee name');
      steps.push('Filter by **Month**, **Year**, or **Status** (Draft, Finalized, Paid)');
      steps.push('Click **Export** → verify payroll data downloads as a CSV or Excel file');
      break;

    case 'payrollTemplateConfig':
      steps.push('Navigate to **Payroll Template Configuration** (admin only)');
      steps.push('View existing templates or click **Add Template** to create a new one');
      steps.push('Configure **Earnings**: basic salary, HRA, transport allowance, medical allowance');
      steps.push('Configure **Deductions**: PF, ESI, professional tax → click **Save**');
      steps.push('Assign the template to specific departments or individual employees');
      break;

    case 'payrollHRAccess':
      steps.push('Log in as **HR Manager** → navigate to **Payroll Management**');
      steps.push('Verify HR can view all employee payroll records');
      steps.push('Verify HR can generate, finalize, and mark payroll as paid');
      steps.push('Confirm HR access level is equivalent to admin for payroll operations');
      break;

    case 'payrollEmployeeRBAC':
      steps.push('Log in as **Employee** → attempt to navigate to **Payroll Management**');
      steps.push('Verify the page redirects to the employee dashboard or shows **Access Denied**');
      steps.push('Navigate to **My Payslips** → verify the employee can only see their own payslips');
      break;

    case 'payrollCycle':
      steps.push('Generate payroll → verify all records show **Draft** status');
      steps.push('Finalize payroll → verify status changes to **Finalized** (editing locked)');
      steps.push('Mark as Paid → verify status changes to **Paid** and payslips become downloadable');
      steps.push('Verify the complete audit trail shows each status transition with timestamps');
      break;

    case 'payrollAmountsVerify':
    case 'payrollSalaryBreakdown':
      steps.push('Generate payroll for an employee with a known salary structure');
      steps.push('Verify **Gross Pay** = basic salary + HRA + all configured allowances');
      steps.push('Verify **Deductions** = PF + ESI + income tax + any other configured deductions');
      steps.push('Verify **Net Pay** = Gross Pay − Total Deductions → cross-check with salary structure');
      break;

    case 'payrollRegenerate':
    case 'payrollReprocess':
      steps.push('Navigate to **Payroll Management** → find a **Draft** payroll entry');
      steps.push('Update the employee\'s salary structure (e.g., change basic salary)');
      steps.push('Return to payroll → click **Regenerate** on the draft entry');
      steps.push('Verify the payroll amounts are recalculated and net pay reflects the changes');
      break;

    // ── TASKS & PROJECTS ─────────────────────────────────────────────────────
    case 'taskViewAndFilter':
      steps.push('Navigate to **My Tasks** → view all tasks assigned to you');
      steps.push('Filter by **Priority** (High, Medium, Low) using the dropdown');
      steps.push('Filter by **Status** (To Do, In Progress, Done) → verify counts update');
      break;

    case 'taskStatusChange':
      steps.push('Navigate to **My Tasks** → find a task assigned to you');
      steps.push('Click the **Status** dropdown on the task card or row');
      steps.push('Select a new status (e.g., **To Do** → **In Progress**)');
      steps.push('Verify the task updates in the list immediately with the new status');
      break;

    case 'taskProgression':
      steps.push('Navigate to **My Tasks** → find a task with **To Do** status');
      steps.push('Change status to **In Progress** → verify the task updates');
      steps.push('Change status to **Done** → verify the task is marked as complete');
      steps.push('Confirm the completion is reflected in the project overview (if applicable)');
      break;

    case 'taskAssignAndView':
    case 'taskAssignToEmployee':
      steps.push('Navigate to **Project Configuration** (admin/manager) → select a project');
      steps.push('Click **Add Task** → fill task name, description, priority, assignee, and due date');
      steps.push('Click **Save** → verify the task appears under the project');
      steps.push('The assigned employee navigates to **My Tasks** → confirms the task appears');
      break;

    case 'projectCreateAndVerify':
      steps.push('Navigate to **Project Configuration** → click **Add Project**');
      steps.push('Fill in project name, description, start date, and end date');
      steps.push('Assign team members to the project → click **Save**');
      steps.push('Verify the new project appears in the project list with correct details');
      break;

    case 'taskCreateUnderProject':
      steps.push('Navigate to **Project Configuration** → select an existing project');
      steps.push('Click **Add Task** → fill task name, description, priority, assignee, and due date');
      steps.push('Click **Save** → verify the task appears under the project with all details correct');
      break;

    case 'projectEditAndDelete':
      steps.push('Navigate to **Project Configuration** → click **Edit** on an existing project');
      steps.push('Modify the project name or end date → click **Save** → verify the changes');
      steps.push('Select an empty project → click **Delete** → confirm deletion');
      steps.push('Verify the deleted project no longer appears in the list');
      break;

    case 'taskProjectRBAC':
      steps.push('Log in as **Employee** → navigate to **My Tasks** → verify only assigned tasks are shown');
      steps.push('Attempt to access **Project Configuration** → verify access is denied');
      steps.push('Log in as **Manager** → verify access to manage team projects and tasks');
      break;

    // ── REVIEWS ──────────────────────────────────────────────────────────────
    case 'reviewCreate':
      steps.push('Navigate to **Employee Reviews** → click **New Review**');
      steps.push('Select the employee, review period, and type (Annual, Mid-Year, Probation)');
      steps.push('Enter performance ratings for each competency and add written feedback');
      steps.push('Click **Save** → verify the review appears in the list with **Draft** status');
      break;

    case 'reviewWorkflow':
      steps.push('Manager creates a review → status is **Draft**');
      steps.push('Manager submits for self-assessment → status changes to **Pending Self-Assessment**');
      steps.push('Employee completes self-assessment → status changes to **Manager Review**');
      steps.push('Manager finalizes the review → status changes to **Approved**');
      break;

    case 'reviewSelfAssessment':
      steps.push('log in as **Employee** → navigate to **My Reviews**');
      steps.push('Find a review with **Pending Self-Assessment** status → click **Self-Assess**');
      steps.push('Fill in ratings and comments for each competency area');
      steps.push('Click **Submit** → verify status updates and the manager is notified');
      break;

    case 'reviewApprove':
      steps.push('Navigate to **Employee Reviews** (manager view) → find a review awaiting approval');
      steps.push('Review the employee\'s self-assessment ratings alongside your own manager ratings');
      steps.push('Click **Approve** → confirm the action in the dialog');
      steps.push('Verify review status changes to **Approved** and the employee can view the final outcome');
      break;

    case 'reviewSearchFilter':
      steps.push('Navigate to **Employee Reviews** → type an employee name in the search bar');
      steps.push('Filter by **Status** (Draft, Pending, Manager Review, Approved)');
      steps.push('Filter by **Review Period** → verify results update to match the selected filters');
      break;

    case 'reviewEditDelete':
      steps.push('Navigate to **Employee Reviews** → find a review with **Draft** status');
      steps.push('Click **Edit** → modify ratings or written comments → click **Save**');
      steps.push('Click **Delete** on a draft review → confirm the deletion → verify it is removed');
      break;

    case 'reviewFullCycle':
      steps.push('Manager creates review → Employee completes self-assessment');
      steps.push('Manager adds final ratings → both versions are visible side by side');
      steps.push('Manager approves → both parties can view the final approved review');
      break;

    // ── ORGANIZATION ─────────────────────────────────────────────────────────
    case 'orgDeptCRUD':
      steps.push('Navigate to **Organization** → click the **Departments** tab');
      steps.push('Click **Add Department** → enter department name and optional description');
      steps.push('Click **Save** → verify the department appears in the department list');
      steps.push('Click **Edit** to rename it → click **Delete** → confirm removal');
      break;

    case 'orgPositionCRUD':
      steps.push('Navigate to **Organization** → click the **Positions** tab');
      steps.push('Click **Add Position** → enter job title, select department, and set job level');
      steps.push('Click **Save** → verify the position appears in the positions list');
      steps.push('Click **Edit** to update details → click **Delete** → confirm removal');
      break;

    case 'orgHolidayCRUD':
      steps.push('Navigate to **Organization** → click the **Holidays** tab');
      steps.push('Click **Add Holiday** → enter holiday name, date, and type (National / Regional / Optional)');
      steps.push('Click **Save** → verify the holiday appears in the holidays list');
      steps.push('Click **Edit** to change the date → click **Delete** → confirm removal');
      break;

    case 'orgDeptSearch':
      steps.push('Navigate to **Organization** → **Departments** tab');
      steps.push('Type a department name in the **Search** bar');
      steps.push('Verify the list filters in real time to show only matching departments');
      break;

    case 'orgDeptEmptyValidation':
      steps.push('Navigate to **Organization** → **Departments** tab → click **Add Department**');
      steps.push('Leave the department name field empty → click **Save**');
      steps.push('Verify validation error: **Department name is required**');
      steps.push('Fill in the name → verify the error clears and saving succeeds');
      break;

    case 'orgRBAC':
      steps.push('Log in as **Employee** → attempt to access **Organization** settings');
      steps.push('Verify the page redirects to the employee dashboard or shows **Access Denied**');
      steps.push('Log in as **Admin** → verify full CRUD access to Departments, Positions, and Holidays');
      break;

    case 'orgDeptDeleteWithEmployees':
      steps.push('Navigate to **Organization** → **Departments** tab');
      steps.push('Attempt to delete a department that has active employees assigned');
      steps.push('Verify system shows a **warning** or prevents deletion with a clear error message');
      steps.push('Reassign employees to another department first → verify deletion now succeeds');
      break;

    // ── USER MANAGEMENT ───────────────────────────────────────────────────────
    case 'userCreateFull':
      steps.push('Navigate to **User Management** → click the **Create User** tab');
      steps.push('Fill in: **Email**, **First Name**, **Last Name**, **Password**, **Confirm Password**, **Role**');
      steps.push('Click **Create User** → verify a success message is displayed');
      steps.push('Switch to the **Manage** tab → verify the new user appears with the correct role');
      break;

    case 'userSearchAndFilter':
      steps.push('Navigate to **User Management** → click the **Manage** tab');
      steps.push('Type a name or email in the **Search** bar → verify real-time filtering');
      steps.push('Filter by **Role** (Admin, HR, Manager, Employee)');
      steps.push('Filter by **Status** (Active, Inactive) → verify results update correctly');
      break;

    case 'userValidation':
      steps.push('Navigate to **User Management** → click **Create User**');
      steps.push('Submit the empty form → verify all required field errors appear simultaneously');
      steps.push('Enter mismatched passwords → verify **Passwords must match** error');
      steps.push('Enter an already-used email → verify **Email already in use** error');
      break;

    case 'userRBAC':
      steps.push('Log in as **Employee** → attempt to navigate to **User Management**');
      steps.push('Verify redirect to the employee dashboard or **Access Denied** message is shown');
      steps.push('Log in as **Admin** → verify full access: create, edit, activate/deactivate users');
      break;

    case 'userRoleChange':
      steps.push('Navigate to **User Management** → **Manage** tab → find the target user');
      steps.push('Click **Edit** → change the **Role** dropdown (e.g., Employee → Manager)');
      steps.push('Click **Save** → verify the role badge updates in the user list');
      steps.push('The user\'s sidebar menu and access permissions reflect the new role on next login');
      break;

    case 'userDeactivate':
    case 'userAccountDeactivate':
      steps.push('Navigate to **User Management** → **Manage** tab → find an active user');
      steps.push('Toggle the **Active** switch to **Inactive** → confirm the action');
      steps.push('Verify the user row shows an **Inactive** badge');
      steps.push('Attempt to log in as the deactivated user → verify **Account disabled** error');
      break;

    // ── EMPLOYEE CRUD ────────────────────────────────────────────────────────
    case 'employeeCreateEditDelete':
      steps.push('Navigate to **Employees** → click **Add Employee** → fill all required fields');
      steps.push('Click **Submit** → verify the employee appears in the list with correct details');
      steps.push('Click **Edit** on the employee → change the first name → click **Save**');
      steps.push('Click **Terminate/Delete** → confirm the action → verify the employee is removed or marked Terminated');
      break;

    case 'employeeSearchFilter':
      steps.push('Navigate to **Employees** → type an employee name in the **Search** bar');
      steps.push('Filter by **Status** (Active, Terminated, On Leave) using the dropdown');
      steps.push('Filter by **Department** → verify the table updates to show only matching employees');
      break;

    case 'employeeExport':
      steps.push('Navigate to **Employees** → apply any desired filters (department, status)');
      steps.push('Click the **Export** button → verify a CSV or Excel file downloads');
      steps.push('Open the downloaded file → verify it contains correct, complete employee data');
      break;

    case 'employeeFormValidation':
      steps.push('Navigate to **Employees** → click **Add Employee**');
      steps.push('Enter an invalid email format (e.g., missing @) → verify the email validation error');
      steps.push('Enter a non-10-digit phone number → verify the phone validation error');
      steps.push('Enter an invalid PAN format → verify the PAN validation error');
      steps.push('Click **Submit** while errors exist → verify the form does not proceed');
      break;

    case 'employeeViewAllTabs':
      steps.push('Navigate to **Employees** → click an employee row to open their full profile');
      steps.push('Click the **Personal Info** tab → verify name, contact, and address details');
      steps.push('Click the **Employment Info** tab → verify department, position, and hire date');
      steps.push('Click the **Emergency Contact** tab → verify emergency contact name and phone');
      steps.push('Click the **Statutory & Banking** tab → verify PAN, Aadhaar, and bank account info');
      break;

    case 'employeeManagerTeamView':
      steps.push('Log in as **Manager** → navigate to **Employees** (My Team view)');
      steps.push('Verify the list shows **only employees** who report to this manager');
      steps.push('Compare with the admin view → confirm the manager sees fewer total employees');
      break;

    case 'employeeSalaryStructure':
      steps.push('Navigate to **Employees** → open an employee\'s profile → click the **Salary** tab');
      steps.push('Fill in **Basic Salary** → add allowances: HRA, transport, medical');
      steps.push('Add deductions: PF, ESI, professional tax');
      steps.push('Click **Save** → verify the salary structure is saved and gross/net totals display correctly');
      break;

    // ── ACCESS CONTROL / RBAC ────────────────────────────────────────────────
    case 'rbacEmployeeDenied':
      steps.push('Log in as **Employee** → attempt to navigate to an admin-only page (e.g., User Management)');
      steps.push('Verify the page redirects to the employee dashboard or shows **Access Denied**');
      steps.push('Confirm the employee sidebar does not show any admin-only menu items');
      break;

    case 'rbacManagerDenied':
      steps.push('Log in as **Manager** → attempt to access admin-restricted pages (User Management, Payroll Config)');
      steps.push('Verify the page redirects or shows an **Access Denied** response for each restricted page');
      break;

    case 'rbacManagerAllowed':
      steps.push('Log in as **Manager** → navigate to each manager-allowed section');
      steps.push('Verify access to: Leave Approvals, Timesheet Approvals, Team Members, Projects');
      steps.push('Confirm each page loads without errors or permission prompts');
      break;

    case 'rbacHRAllowed':
      steps.push('Log in as **HR Manager** → navigate to HR-specific sections');
      steps.push('Verify access to: Payroll Management, Employee Management, Leave Management');
      steps.push('Confirm HR has read and write access for employee records and payroll actions');
      break;

    case 'rbacAdminFull':
      steps.push('Log in as **Administrator** → verify full system access');
      steps.push('Navigate to all major sections: User Management, Organization, Payroll, Reports, Settings');
      steps.push('Verify no **Access Denied** messages and all CRUD operations are available');
      break;

    case 'accessControl':
    case 'rbacSessionExpiry':
      steps.push(`Attempt to access a restricted page as **${role}**`);
      steps.push('Verify the response matches expected role-based permission (allow or deny)');
      steps.push('Confirm API returns **403 Forbidden** for unauthorized role access attempts');
      break;

    // ── NAVIGATION ───────────────────────────────────────────────────────────
    case 'sidebarNavAdmin':
    case 'navAdminSidebar':
      steps.push('Log in as **Administrator** → verify all admin sidebar sections are visible');
      steps.push('Sections expected: Dashboard, Employees, Leave, Timesheets, Payroll, Organization, User Management, Reports, Settings, Help');
      steps.push('Click each top-level menu item → verify the correct page loads without errors');
      break;

    case 'sidebarNavEmployee':
    case 'navEmployeeSidebar':
      steps.push('Log in as **Employee** → verify the employee sidebar is shown');
      steps.push('Sections expected: Dashboard, My Timesheet, My Leave, My Payslips, My Attendance, My Reviews, My Tasks, My Profile, Help');
      steps.push('Click each item → verify correct page loads without Access Denied errors');
      break;

    case 'profileMenu':
    case 'navProfileMenu':
      steps.push('Click the **profile avatar** in the top-right corner of the header');
      steps.push('Verify the dropdown shows: **My Profile**, **Change Password**, and **Logout**');
      steps.push('Click **My Profile** → verify the profile page loads with correct user details');
      break;

    case 'nav404':
    case 'nav404Page':
      steps.push('Navigate to a non-existent URL (e.g., /this-page-does-not-exist)');
      steps.push('Verify the **404 — Page Not Found** screen appears with a helpful message');
      steps.push('Click **Go to Dashboard** or use the browser back button → verify redirect to the home page');
      break;

    // ── REPORTS & SETTINGS ───────────────────────────────────────────────────
    case 'reportAdminView':
    case 'reportsPageLoad':
      steps.push('Navigate to **Reports** (admin/HR only)');
      steps.push('View available report types: Employee Summary, Leave Report, Payroll Summary, Timesheet Report');
      steps.push('Select parameters (date range, department) → click **Generate**');
      steps.push('Verify the report table loads with correct aggregated data');
      break;

    case 'reportExport':
    case 'reportsExport':
      steps.push('Navigate to **Reports** → generate any available report');
      steps.push('Click **Export** → verify the report downloads in CSV or PDF format');
      steps.push('Open the downloaded file → verify it contains correct report data');
      break;

    case 'settingsHub':
    case 'settingsTabNavigation':
      steps.push('Navigate to **Settings Hub** (admin only)');
      steps.push('View the available settings categories: General, Email, Security, Notifications');
      steps.push('Update a setting (e.g., company name or email config) → click **Save**');
      steps.push('Verify the change is persisted after a page refresh');
      break;

    case 'restoreManagementTabs':
      steps.push('Navigate to **Restore Management** (admin only)');
      steps.push('View the **Backup History** tab → confirm backup records are listed with timestamps');
      steps.push('Check the **Data Import** tab → verify the import interface is accessible');
      steps.push('Check the **Audit Trail** tab → view recent system changes and restore points');
      break;

    // ── CROSS-MODULE ─────────────────────────────────────────────────────────
    case 'crossModulePaycheck':
    case 'hireToPaycheck':
      steps.push('Configure employee salary structure → ensure timesheets are submitted and approved');
      steps.push('Generate payroll for the same period → verify payroll uses approved timesheet hours');
      steps.push('Finalize and mark payroll as Paid → employee downloads the payslip');
      steps.push('Verify the payslip shows correct regular and overtime pay using the timesheet data');
      break;

    case 'crossModuleLeaveAttendance':
    case 'leaveAffectsAttendance':
      steps.push('Employee submits a leave request for specific dates → manager approves it');
      steps.push('Navigate to **Attendance Management** → view the approved leave dates');
      steps.push('Verify those dates automatically show **On Leave** status in the attendance record');
      break;

    case 'crossModuleTimesheetPayroll':
    case 'timesheetToPayroll':
      steps.push('Employee submits weekly timesheets → manager approves them');
      steps.push('Admin generates payroll for the same period');
      steps.push('Verify payroll calculation includes the **approved timesheet hours**');
      steps.push('Confirm the payslip shows correct total hours worked and corresponding pay');
      break;

    case 'crossModuleDashboard':
    case 'dashboardDataAccuracy':
      steps.push('Log in as **Administrator** → view the system dashboard with organisation-wide statistics');
      steps.push('Verify stats: total employees, pending leave requests, pending timesheets, payroll status');
      steps.push('Log in as **Manager** → confirm the dashboard shows team-specific metrics');
      steps.push('Log in as **Employee** → confirm personal stats: leave balance, timesheet status, latest payslip');
      break;

    default:
      if (action) steps.push(`Execute the **${row.description}** workflow`);
      break;
  }

  steps.push('Verify the expected outcome is achieved');
  return steps;
}

// Group by module
const byModule = {};
for (const g of guides) {
  if (!byModule[g.module]) {
    byModule[g.module] = { module: g.module, icon: g.icon, color: g.color, order: g.order, guides: [] };
  }
  byModule[g.module].guides.push(g);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  appName: 'SkyrakSys HRM',
  version: '1.0.0',
  totalGuides: guides.length,
  totalWithVideo: guides.filter(g => g.videoUrl).length,
  modules: Object.values(byModule).sort((a, b) => a.order - b.order),
  guides,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

console.log('\n📖 User Guide Manifest Generated');
console.log(`   ${guides.length} guide entries`);
console.log(`   ${guides.filter(g => g.videoUrl).length} with recorded videos`);
console.log(`   ${Object.keys(byModule).length} modules`);
console.log(`   → ${MANIFEST_PATH}\n`);
console.log('Modules:');
for (const [name, m] of Object.entries(byModule)) {
  console.log(`   ${name}: ${m.guides.length} guides`);
}
console.log('\nNext steps:');
console.log('  1. Record videos: npx playwright test -c playwright-guide.config.js business-workflows');
console.log('  2. Rebuild frontend: npm run build (or dev server picks up public/ changes)');
console.log('  3. Access in-app: Click "Help & Support" → User Guides\n');
