/**
 * Generates a comprehensive Test Matrix spreadsheet for SkyrakSys HRM.
 * Covers every module, every feature, every persona (Admin, HR, Manager, Employee).
 * 
 * Tabs:
 *   1. Summary Dashboard    — High-level stats & legend
 *   2. Auth & Session       — Login, logout, password, tokens
 *   3. Dashboard            — Per-role dashboard features
 *   4. Employee Management  — CRUD, profile, records, photos
 *   5. Leave Management     — Requests, balances, types, accrual
 *   6. Timesheet & Attendance — Time entry, approvals, attendance
 *   7. Payroll & Compensation — Payroll, payslips, templates, salary
 *   8. Org & Projects       — Departments, positions, holidays, projects, tasks
 *   9. Reviews & Performance — Reviews, performance dashboard
 *  10. Reports & System     — Reports, settings, user mgmt, restore, help
 *  11. RBAC & Negative      — Access denied, role enforcement, edge cases
 *  12. Cross-Role Workflows — End-to-end business flows
 */

const ExcelJS = require('exceljs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'docs', 'SkyrakSys_HRM_Test_Matrix.xlsx');

// ═══════════════════════════════════════════════════════════════════
// STYLING HELPERS
// ═══════════════════════════════════════════════════════════════════
const COLORS = {
  headerBg: 'FF1A3C6E',      // dark navy
  headerFg: 'FFFFFFFF',
  sectionBg: 'FF2E5090',     // medium blue
  sectionFg: 'FFFFFFFF',
  subSectionBg: 'FFE8EDF5',  // light blue
  adminBg: 'FFDCE6F1',       // pale blue
  hrBg: 'FFE2EFDA',          // pale green
  managerBg: 'FFFFF2CC',     // pale yellow
  employeeBg: 'FFFCE4D6',    // pale orange
  passBg: 'FFD4EDDA',
  failBg: 'FFF8D7DA',
  blockedBg: 'FFFFF3CD',
  naBg: 'FFE2E3E5',
  white: 'FFFFFFFF',
  lightGray: 'FFF5F5F5',
};

function applyHeaderStyle(row, colCount) {
  row.height = 28;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.headerFg }, size: 10, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  }
}

function applySectionStyle(row, colCount, bg = COLORS.sectionBg) {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.sectionFg }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  }
}

function applyRowStyle(row, colCount, isAlt = false) {
  const bg = isAlt ? COLORS.lightGray : COLORS.white;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { size: 9, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
  }
}

function applyRoleResultColumns(row, adminVal, hrVal, mgrVal, empVal, startCol) {
  const vals = [adminVal, hrVal, mgrVal, empVal];
  const bgs = [COLORS.adminBg, COLORS.hrBg, COLORS.managerBg, COLORS.employeeBg];
  for (let i = 0; i < 4; i++) {
    const cell = row.getCell(startCol + i);
    cell.value = vals[i];
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgs[i] } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { size: 9 };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MATRIX COLUMN STRUCTURE (same across all test tabs)
//  A: TC# | B: Module | C: Feature | D: Test Scenario | E: Steps
//  F: Expected Result | G: Priority | H: Pre-Condition
//  I: Admin | J: HR | K: Manager | L: Employee
//  M: Status | N: Notes
// ═══════════════════════════════════════════════════════════════════
const COLS = [
  { header: 'TC #', key: 'tc', width: 8 },
  { header: 'Module', key: 'module', width: 16 },
  { header: 'Feature', key: 'feature', width: 22 },
  { header: 'Test Scenario', key: 'scenario', width: 40 },
  { header: 'Steps / Actions', key: 'steps', width: 48 },
  { header: 'Expected Result', key: 'expected', width: 40 },
  { header: 'Priority', key: 'priority', width: 8 },
  { header: 'Pre-Condition', key: 'precondition', width: 28 },
  { header: 'Admin', key: 'admin', width: 10 },
  { header: 'HR', key: 'hr', width: 10 },
  { header: 'Manager', key: 'manager', width: 10 },
  { header: 'Employee', key: 'employee', width: 10 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Notes / Defects', key: 'notes', width: 30 },
];

function createTestSheet(wb, name, data) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    properties: { defaultRowHeight: 20 }
  });

  ws.columns = COLS.map(c => ({ header: c.header, key: c.key, width: c.width }));
  applyHeaderStyle(ws.getRow(1), COLS.length);

  let rowIdx = 0;
  let tcNum = 1;

  data.forEach(item => {
    if (item._section) {
      const row = ws.addRow({
        tc: '', module: item._section, feature: '', scenario: '',
        steps: '', expected: '', priority: '', precondition: '',
        admin: '', hr: '', manager: '', employee: '',
        status: '', notes: ''
      });
      applySectionStyle(row, COLS.length, item._sectionBg || COLORS.sectionBg);
      ws.mergeCells(row.number, 2, row.number, 14);
      rowIdx++;
      return;
    }

    const row = ws.addRow({
      tc: `TC-${String(tcNum).padStart(3, '0')}`,
      module: item.module || '',
      feature: item.feature || '',
      scenario: item.scenario || '',
      steps: item.steps || '',
      expected: item.expected || '',
      priority: item.priority || 'M',
      precondition: item.precondition || 'Logged in',
      admin: item.admin || '',
      hr: item.hr || '',
      manager: item.manager || '',
      employee: item.employee || '',
      status: '',
      notes: item.notes || '',
    });
    applyRowStyle(row, COLS.length, rowIdx % 2 === 1);
    applyRoleResultColumns(row, item.admin || '', item.hr || '', item.manager || '', item.employee || '', 9);
    tcNum++;
    rowIdx++;
  });

  // Auto-filter
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: COLS.length } };

  return ws;
}

// ═══════════════════════════════════════════════════════════════════
// TEST DATA — EVERY MODULE
// ═══════════════════════════════════════════════════════════════════

// ── TAB 2: Auth & Session ──
const authTests = [
  { _section: '🔐 LOGIN' },
  { module: 'Auth', feature: 'Login', scenario: 'Successful login with valid credentials', steps: '1. Navigate to /login\n2. Enter email & password\n3. Click Sign In', expected: 'Redirected to role-specific dashboard. JWT cookies set.', priority: 'H', precondition: 'Valid user exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Auth', feature: 'Login', scenario: 'Login with invalid email', steps: '1. Enter non-existent email\n2. Enter any password\n3. Click Sign In', expected: 'Error message: "Invalid credentials". No redirect.', priority: 'H', precondition: 'N/A', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Login', scenario: 'Login with wrong password', steps: '1. Enter valid email\n2. Enter wrong password\n3. Click Sign In', expected: 'Error message: "Invalid credentials". Account not locked (first attempt).', priority: 'H', precondition: 'Valid user exists', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Login', scenario: 'Login with empty fields', steps: '1. Leave email/password blank\n2. Click Sign In', expected: 'Validation error shown. Form not submitted.', priority: 'M', precondition: 'N/A', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Login', scenario: 'Password visibility toggle', steps: '1. Enter password\n2. Click eye icon', expected: 'Password text toggles between hidden (dots) and visible (plain text).', priority: 'L', precondition: 'N/A', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Login', scenario: 'Login with locked account', steps: '1. Login with a locked/deactivated user', expected: 'Error message. No session created.', priority: 'H', precondition: 'User account is locked/deactivated', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Login', scenario: 'Login redirects to correct dashboard per role', steps: '1. Login as each role', expected: 'Admin→/admin-dashboard, HR→/admin-dashboard, Manager→/manager-dashboard, Employee→/employee-dashboard', priority: 'H', precondition: 'Valid users for each role', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },

  { _section: '🔓 LOGOUT & SESSION' },
  { module: 'Auth', feature: 'Logout', scenario: 'Successful logout', steps: '1. Click profile icon\n2. Click "Sign Out"', expected: 'Redirected to /login. Cookies cleared. Cannot access protected pages.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Auth', feature: 'Session', scenario: 'Token refresh (silent re-auth)', steps: '1. Wait for access token expiry (~15min)\n2. Perform any action', expected: 'New access token issued silently via refresh token. No login prompt.', priority: 'H', precondition: 'Logged in, refresh token valid', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Session', scenario: 'Session expired — redirect to login', steps: '1. Wait for both tokens to expire\n2. Try to navigate', expected: 'Redirected to /login with session expired message.', priority: 'H', precondition: 'Both tokens expired', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Session', scenario: 'Re-login after logout sets fresh cookies', steps: '1. Login\n2. Logout\n3. Login again\n4. Check cookies', expected: 'Old cookies cleared on logout. Fresh accessToken & refreshToken on re-login.', priority: 'H', precondition: 'Valid user', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A', notes: 'Bug D#1 fix verified' },
  { module: 'Auth', feature: 'Session', scenario: 'Concurrent sessions (same user, multiple tabs)', steps: '1. Login in Tab A\n2. Login in Tab B\n3. Logout in Tab A\n4. Try action in Tab B', expected: 'Tab B session may still work (depends on token). No crash.', priority: 'M', precondition: 'Valid user', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '🔑 PASSWORD MANAGEMENT' },
  { module: 'Auth', feature: 'Change Password', scenario: 'Change own password successfully', steps: '1. Profile → Account Settings\n2. Enter current password\n3. Enter new password + confirm\n4. Submit', expected: 'Success message. Can login with new password. Old password rejected.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Auth', feature: 'Change Password', scenario: 'Change password with wrong current password', steps: '1. Enter wrong current password\n2. Enter new password\n3. Submit', expected: 'Error: "Current password is incorrect". Password unchanged.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Forgot Password', scenario: 'Request password reset email', steps: '1. Click "Forgot Password" on login\n2. Enter registered email\n3. Submit', expected: 'Success message shown. Reset email sent (if SMTP configured).', priority: 'H', precondition: 'Not logged in, SMTP configured', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Forgot Password', scenario: 'Forgot password with non-existent email', steps: '1. Enter unregistered email\n2. Submit', expected: 'Generic success message (no email leak). No email sent.', priority: 'M', precondition: 'Not logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Auth', feature: 'Admin Reset', scenario: 'Admin resets another user\'s password', steps: '1. Go to User Management\n2. Select user\n3. Click Reset Password\n4. Enter new password', expected: 'Password updated. User can login with new password.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '👤 PROFILE MENU' },
  { module: 'Auth', feature: 'Profile Menu', scenario: 'Profile dropdown shows correct items', steps: '1. Click profile avatar/icon in header', expected: 'Dropdown: View Profile, Account Settings, Help & User Guide, Sign Out. NO "Notifications".', priority: 'M', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test', notes: 'Bug A#5 fix verified' },
  { module: 'Auth', feature: 'Profile Menu', scenario: 'View Profile navigates correctly', steps: '1. Click profile icon → View Profile', expected: 'Navigates to /my-profile with current user\'s data.', priority: 'M', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
];

// ── TAB 3: Dashboard ──
const dashboardTests = [
  { _section: '📊 ADMIN / HR DASHBOARD' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: 'Dashboard loads with all stat cards', steps: '1. Login as Admin/HR\n2. Navigate to /admin-dashboard', expected: 'Page loads. Shows: Total Employees, On Leave, New Hires, Departments, Draft Timesheets, Approved Timesheets.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: '"On Leave" card is clickable and navigates', steps: '1. Click "On Leave" stat card', expected: 'Navigates to /leave-requests page.', priority: 'M', precondition: 'Admin dashboard loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#6 fix' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: '"New Hires" card is clickable and navigates', steps: '1. Click "New Hires" stat card', expected: 'Navigates to /employees page.', priority: 'M', precondition: 'Admin dashboard loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#6 fix' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: '"Draft Timesheets" card is clickable', steps: '1. Click "Draft" timesheet card', expected: 'Navigates to /timesheets page.', priority: 'M', precondition: 'Admin dashboard loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#7 fix' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: '"Approved Timesheets" card is clickable', steps: '1. Click "Approved" timesheet card', expected: 'Navigates to /timesheets page.', priority: 'M', precondition: 'Admin dashboard loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#7 fix' },
  { module: 'Dashboard', feature: 'Admin Dashboard', scenario: 'Dashboard data refreshes on revisit', steps: '1. View dashboard\n2. Navigate away\n3. Navigate back', expected: 'Data reloads with fresh stats.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '📊 EMPLOYEE DASHBOARD' },
  { module: 'Dashboard', feature: 'Employee Dashboard', scenario: 'Dashboard loads with personal stats', steps: '1. Login as Employee\n2. Navigate to /employee-dashboard', expected: 'Shows: Leave balance, pending tasks, recent activity, quick links.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Dashboard', feature: 'Employee Dashboard', scenario: '"Profile" quick link navigates to /my-profile', steps: '1. Click "Profile" quick action link', expected: 'Navigates to /my-profile (NOT /employee-profile).', priority: 'H', precondition: 'Employee dashboard loaded', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test', notes: 'Bug E#5 fix' },
  { module: 'Dashboard', feature: 'Employee Dashboard', scenario: 'All quick links work correctly', steps: '1. Click each quick action (Timesheet, Leave, Attendance, etc.)', expected: 'Each link navigates to the correct page without 404.', priority: 'M', precondition: 'Employee dashboard loaded', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },

  { _section: '📊 MANAGER DASHBOARD' },
  { module: 'Dashboard', feature: 'Manager Dashboard', scenario: 'Dashboard loads with team overview', steps: '1. Login as Manager\n2. Navigate to /manager-dashboard', expected: 'Shows: Team members count, pending approvals, team performance overview.', priority: 'H', precondition: 'Manager logged in', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Dashboard', feature: 'Manager Dashboard', scenario: '"Profile" quick link navigates to /my-profile', steps: '1. Click "Profile" quick action', expected: 'Navigates to /my-profile.', priority: 'M', precondition: 'Manager dashboard loaded', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A', notes: 'Bug E#5 fix' },

  { _section: '📊 PERFORMANCE DASHBOARD' },
  { module: 'Dashboard', feature: 'Performance', scenario: 'Performance dashboard loads with metrics', steps: '1. Navigate to /performance-dashboard', expected: 'Page loads with performance charts and KPIs.', priority: 'M', precondition: 'Admin/HR/Manager logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Dashboard', feature: 'Performance', scenario: 'Auto-refresh toggle works', steps: '1. Toggle auto-refresh switch\n2. Observe data polling starts/stops', expected: 'Toggle: ON→data refreshes periodically, OFF→static display.', priority: 'L', precondition: 'Performance dashboard loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 4: Employee Management ──
const employeeTests = [
  { _section: '👥 EMPLOYEE LIST' },
  { module: 'Employees', feature: 'List View', scenario: 'Employee list loads with data', steps: '1. Navigate to /employees', expected: 'Table/card view loads with employee records, pagination, search bar.', priority: 'H', precondition: 'Admin/HR/Manager logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Deny' },
  { module: 'Employees', feature: 'List View', scenario: 'Toggle between card and table view', steps: '1. Click view toggle (card/table icon)', expected: 'View switches between card layout and table layout.', priority: 'M', precondition: 'Employee list loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Search', scenario: 'Search employees by name', steps: '1. Type employee name in search box', expected: 'List filters to matching employees in real-time.', priority: 'H', precondition: 'Employee list loaded', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Employees', feature: 'Filter', scenario: 'Filter by department', steps: '1. Open department filter dropdown\n2. Select a department', expected: 'List shows only employees from selected department.', priority: 'M', precondition: 'Employee list loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Filter', scenario: 'Filter by employment status (Active/Inactive)', steps: '1. Open status filter\n2. Select "Active" or "Inactive"', expected: 'List shows only employees matching the selected status.', priority: 'M', precondition: 'Employee list loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Filter', scenario: 'Filter by employment type (Full-time/Part-time/Contract)', steps: '1. Open type filter\n2. Select type', expected: 'List shows only employees of selected type.', priority: 'M', precondition: 'Employee list loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Export', scenario: 'Export employee list to Excel', steps: '1. Click Export button\n2. Save file', expected: 'Excel/CSV file downloads with all visible employee data.', priority: 'M', precondition: 'Employee list loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Pagination', scenario: 'Navigate between pages', steps: '1. Click page 2 / Next button', expected: 'Next batch of employees loads correctly.', priority: 'M', precondition: 'Employee list has >20 records', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '➕ CREATE EMPLOYEE' },
  { module: 'Employees', feature: 'Create', scenario: 'Create employee with all required fields', steps: '1. Click Add Employee\n2. Fill Personal Info tab (first name, last name, email, phone, gender, DOB)\n3. Fill Employment tab (employee ID, department, position, join date, status)\n4. Fill Salary tab (basic salary, components)\n5. Fill Contact tab (address, emergency contact)\n6. Save', expected: 'Employee created successfully. Appears in employee list. Success toast shown.', priority: 'H', precondition: 'Admin/HR logged in, departments & positions exist', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Employees', feature: 'Create', scenario: 'Create employee — validation errors (missing required fields)', steps: '1. Click Add Employee\n2. Leave required fields blank\n3. Click Save', expected: 'Validation errors shown for each missing required field. Form not submitted.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Create', scenario: 'Create employee — duplicate email', steps: '1. Create employee with email that already exists', expected: 'Error: "Email already in use" or similar. Employee not created.', priority: 'H', precondition: 'Admin logged in, existing employee in DB', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Create', scenario: 'Upload photo during creation', steps: '1. In Add Employee form\n2. Click photo upload area\n3. Select image file\n4. Save employee', expected: 'Photo uploaded and displayed in employee profile.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Create', scenario: 'Create employee with user account', steps: '1. Add employee\n2. Go to User Account tab\n3. Set role, email, password\n4. Save', expected: 'Employee + User created. User can login with credentials.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '✏️ EDIT EMPLOYEE' },
  { module: 'Employees', feature: 'Edit', scenario: 'Edit employee personal info', steps: '1. Navigate to employee profile\n2. Click Edit\n3. Modify name, phone, etc.\n4. Save', expected: 'Changes saved. Updated data reflected on profile page.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'N/A' },
  { module: 'Employees', feature: 'Edit', scenario: 'Edit employee compensation/salary', steps: '1. Edit employee → Salary tab\n2. Change basic salary, allowances\n3. Save', expected: 'Salary updated. Reflected in payroll calculation.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'Edit', scenario: 'Upload/change employee photo in edit mode', steps: '1. Edit employee\n2. Click photo area\n3. Upload new photo\n4. Save', expected: 'New photo saved and displayed.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#16 fix' },
  { module: 'Employees', feature: 'Edit', scenario: 'Employee self-edit profile', steps: '1. Login as Employee\n2. Go to My Profile → Edit\n3. Change allowed fields\n4. Save', expected: 'Employee can edit own profile (limited fields). Changes saved.', priority: 'H', precondition: 'Employee logged in, linked employee record', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Employees', feature: 'Edit', scenario: 'Employee ID field is read-only/auto-generated', steps: '1. Edit employee\n2. Check Employee ID field', expected: 'Employee ID (EMP-XXX) is not editable or is read-only.', priority: 'L', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '👁️ VIEW EMPLOYEE PROFILE' },
  { module: 'Employees', feature: 'Profile', scenario: 'View employee full profile', steps: '1. Click on employee in list\n2. Or navigate to /employees/:id', expected: 'Profile page shows all tabs: Personal, Employment, Contact, Statutory, Banking.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Employees', feature: 'Profile', scenario: 'View own profile (My Profile)', steps: '1. Navigate to /my-profile', expected: 'Displays logged-in user\'s employee profile with all sections.', priority: 'H', precondition: 'Logged in, linked employee record', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Employees', feature: 'Profile', scenario: 'Manager views team member profile', steps: '1. Login as Manager\n2. Navigate to employee list\n3. Click team member', expected: 'Can view profile of direct reports only. Access denied for other employees.', priority: 'H', precondition: 'Manager logged in, has direct reports', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A' },

  { _section: '🗑️ DELETE / DEACTIVATE EMPLOYEE' },
  { module: 'Employees', feature: 'Delete', scenario: 'Soft-delete employee', steps: '1. Go to employee list\n2. Click delete action on an employee\n3. Confirm deletion', expected: 'Employee soft-deleted (marked inactive). Disappears from active list. Appears in /employee-records.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Employees', feature: 'Status', scenario: 'Change employee status (Active/Inactive/On Leave/Terminated)', steps: '1. Edit employee\n2. Change status dropdown\n3. Save', expected: 'Status updated. Employee moves to appropriate list/filter view.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '📋 EMPLOYEE RECORDS (Archive)' },
  { module: 'Employees', feature: 'Records', scenario: 'View soft-deleted employees', steps: '1. Navigate to /employee-records', expected: 'Page shows soft-deleted employees with restore options.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Employees', feature: 'Records', scenario: 'Search in employee records', steps: '1. Type name in search box', expected: 'Filters archived employees matching the search term.', priority: 'L', precondition: 'Employee records page loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '👤 USER ACCOUNT MANAGEMENT' },
  { module: 'Employees', feature: 'User Account', scenario: 'Create user account for employee', steps: '1. Go to Employee Profile → User Account tab\n2. Click Create Account\n3. Set email, role, password\n4. Save', expected: 'User account created. Employee can now login.', priority: 'H', precondition: 'Admin logged in, employee without user account', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'User Account', scenario: 'Send welcome email to new user', steps: '1. Go to User Account tab\n2. Click "Send Welcome Email"', expected: 'Welcome email API called. No toUpperCase crash (500 = SMTP config only).', priority: 'H', precondition: 'Admin logged in, user account exists', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A', notes: 'Bug A#12 fix' },
  { module: 'Employees', feature: 'User Account', scenario: 'Lock/unlock user account', steps: '1. User Account tab\n2. Click Lock/Unlock button', expected: 'Account status toggled. Locked user cannot login.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Employees', feature: 'User Account', scenario: 'Force logout a user', steps: '1. User Account tab\n2. Click Force Logout', expected: 'User\'s active sessions invalidated. User redirected to login.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 5: Leave Management ──
const leaveTests = [
  { _section: '📝 LEAVE REQUESTS (Employee)' },
  { module: 'Leave', feature: 'Submit Request', scenario: 'Submit new leave request', steps: '1. Navigate to /add-leave-request\n2. Select leave type\n3. Set start & end date\n4. Enter reason\n5. Submit', expected: 'Leave request created with "Pending" status. Appears in My Leave list.', priority: 'H', precondition: 'Employee/Manager logged in, leave types configured', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'Test' },
  { module: 'Leave', feature: 'Submit Request', scenario: 'Submit leave — insufficient balance', steps: '1. Request more days than available balance', expected: 'Error: "Insufficient leave balance". Request NOT submitted.', priority: 'H', precondition: 'Employee with known balance', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Leave', feature: 'Submit Request', scenario: 'Submit leave — overlapping dates', steps: '1. Submit leave for dates that overlap with existing approved leave', expected: 'Error about overlapping dates. Request NOT submitted.', priority: 'H', precondition: 'Employee with existing approved leave', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Leave', feature: 'Submit Request', scenario: 'Submit leave — past dates', steps: '1. Try to request leave with start date in the past', expected: 'Either allowed or validation error (depends on config). Verify behavior.', priority: 'M', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Leave', feature: 'View Leave', scenario: 'View "My Leave" requests list', steps: '1. Navigate to /leave-requests', expected: 'Shows all own leave requests with status (Pending/Approved/Rejected/Cancelled).', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'Test' },
  { module: 'Leave', feature: 'Cancel Leave', scenario: 'Cancel a pending leave request', steps: '1. Go to My Leave\n2. Find pending request\n3. Click Cancel button', expected: 'Leave status changes to "Cancelled". Balance restored.', priority: 'H', precondition: 'Employee has pending leave request', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test', notes: 'Bug A#24 fix' },
  { module: 'Leave', feature: 'Cancel Leave', scenario: 'Cannot cancel approved leave', steps: '1. Try to cancel an already approved leave', expected: 'Cancel button not available or action rejected for approved leaves.', priority: 'M', precondition: 'Employee has approved leave', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Leave', feature: 'Leave Balance', scenario: 'View own leave balance summary', steps: '1. Navigate to /leave-requests\n2. Check balance display', expected: 'Leave balance shown per leave type (Annual, Sick, etc.) with used/remaining.', priority: 'H', precondition: 'Employee logged in, balances configured', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },

  { _section: '✅ LEAVE MANAGEMENT (Admin/HR/Manager)' },
  { module: 'Leave', feature: 'Leave Management', scenario: 'View all leave requests', steps: '1. Navigate to /leave-management', expected: 'Shows all employee leave requests with filter tabs (All/Pending/Approved/Rejected).', priority: 'H', precondition: 'Admin/HR/Manager logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Deny' },
  { module: 'Leave', feature: 'Approve Leave', scenario: 'Approve a pending leave request', steps: '1. Go to Leave Management\n2. Click Approve on pending request', expected: 'Status changes to "Approved". Employee balance deducted.', priority: 'H', precondition: 'Admin/HR/Manager logged in, pending request exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Leave', feature: 'Reject Leave', scenario: 'Reject a pending leave request', steps: '1. Go to Leave Management\n2. Click Reject on pending request\n3. Enter reason', expected: 'Status changes to "Rejected". Balance NOT deducted.', priority: 'H', precondition: 'Admin/HR/Manager logged in, pending request exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Leave', feature: 'Filter', scenario: 'Filter leave by employee, status, type, date', steps: '1. Apply various filter combinations', expected: 'List updates correctly per filter criteria.', priority: 'M', precondition: 'Leave management loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Leave', feature: 'Manager Scope', scenario: 'Manager sees only team leave requests', steps: '1. Login as Manager\n2. Go to Leave Management', expected: 'Only direct reports\' leave requests visible.', priority: 'H', precondition: 'Manager logged in with team', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A' },

  { _section: '⚖️ LEAVE BALANCES (Admin)' },
  { module: 'Leave', feature: 'Leave Balances', scenario: 'View all employee leave balances', steps: '1. Navigate to /admin/leave-balances', expected: 'Table shows all employees with balance per leave type.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Leave', feature: 'Leave Balances', scenario: 'Create/adjust leave balance', steps: '1. Click Adjust/Create balance\n2. Select employee & leave type\n3. Enter amount\n4. Save', expected: 'Balance updated. Reflected in employee\'s available balance immediately.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '🏷️ LEAVE TYPES (Admin)' },
  { module: 'Leave', feature: 'Leave Types', scenario: 'View all leave types', steps: '1. Navigate to /admin/leave-types', expected: 'Table shows all leave types (Annual, Sick, Personal, etc.) with config.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Leave', feature: 'Leave Types', scenario: 'Create new leave type', steps: '1. Click Add\n2. Enter name, max days, category\n3. Save', expected: 'New leave type created. Available in leave request dropdown.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Leave', feature: 'Leave Types', scenario: 'Edit leave type', steps: '1. Click Edit on existing type\n2. Change settings\n3. Save', expected: 'Leave type updated. Changes reflected in future requests.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Leave', feature: 'Leave Types', scenario: 'Delete leave type', steps: '1. Click Delete on leave type\n2. Confirm', expected: 'Leave type soft-deleted. Not available for new requests.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '📈 LEAVE ACCRUAL' },
  { module: 'Leave', feature: 'Accrual', scenario: 'View accrual status', steps: '1. Navigate to /admin/leave-accrual', expected: 'Shows accrual configuration and employee accrual status.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Leave', feature: 'Accrual', scenario: 'Preview accrual run', steps: '1. Click Preview / Dry Run button', expected: 'Shows projected balance changes without applying them.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Leave', feature: 'Accrual', scenario: 'Execute accrual run', steps: '1. Click Run Accrual button\n2. Confirm', expected: 'Balances updated for all employees per accrual rules.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 6: Timesheet & Attendance ──
const timesheetTests = [
  { _section: '⏱️ TIMESHEET HUB' },
  { module: 'Timesheet', feature: 'Hub', scenario: 'Timesheet hub page loads', steps: '1. Navigate to /timesheets', expected: 'Hub shows tabs (My Timesheets, Approvals for managers), week selector, timesheet list.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Timesheet', feature: 'Hub', scenario: 'Navigate between weeks', steps: '1. Click Previous/Next week arrows\n2. Or click date picker', expected: 'Selected week changes. Timesheet data for that week loads.', priority: 'H', precondition: 'Timesheet hub loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'Test' },

  { _section: '📝 WEEKLY TIMESHEET ENTRY' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Create new timesheet entry for the week', steps: '1. Navigate to a week\n2. Add project/task row\n3. Enter hours for each day\n4. Save', expected: 'Timesheet entry saved as Draft. Hours reflected in summary.', priority: 'H', precondition: 'Employee/all roles, projects configured', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Edit existing timesheet hours', steps: '1. Open week with existing draft entry\n2. Change hours\n3. Save', expected: 'Updated hours saved. Total recalculated.', priority: 'H', precondition: 'Draft timesheet exists', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Add multiple project rows to weekly timesheet', steps: '1. Click Add Task/Project row\n2. Select different project\n3. Enter hours', expected: 'Multiple rows displayed. Total for day = sum of all projects.', priority: 'M', precondition: 'Multiple projects exist', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Delete task row from timesheet', steps: '1. Click delete icon on a row', expected: 'Row removed. Hours for that project cleared.', priority: 'M', precondition: 'Timesheet with multiple rows', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Submit timesheet for approval', steps: '1. Fill weekly timesheet\n2. Click Submit', expected: 'Status changes from Draft to Submitted. Cannot edit until approved/rejected.', priority: 'H', precondition: 'Draft timesheet with data', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Withdraw submitted timesheet', steps: '1. Go to submitted timesheet\n2. Click Withdraw', expected: 'Status returns to Draft. Can edit again.', priority: 'M', precondition: 'Submitted (not yet approved) timesheet', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Timesheet', feature: 'Entry', scenario: 'Cannot edit approved timesheet', steps: '1. Navigate to approved timesheet\n2. Try to edit hours', expected: 'Fields are read-only or edit button not available.', priority: 'H', precondition: 'Approved timesheet exists', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },

  { _section: '✅ TIMESHEET APPROVAL' },
  { module: 'Timesheet', feature: 'Approve', scenario: 'View pending timesheets for approval', steps: '1. Login as Manager/Admin/HR\n2. Go to Timesheets → Approvals tab', expected: 'List of submitted timesheets awaiting approval shown.', priority: 'H', precondition: 'Manager/Admin/HR logged in, submitted timesheets exist', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Deny' },
  { module: 'Timesheet', feature: 'Approve', scenario: 'Approve a submitted timesheet', steps: '1. Click Approve on a submitted timesheet', expected: 'Status changes to Approved. Employee sees approval.', priority: 'H', precondition: 'Submitted timesheet exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Timesheet', feature: 'Approve', scenario: 'Reject a submitted timesheet', steps: '1. Click Reject\n2. Enter rejection reason', expected: 'Status changes to Rejected. Employee can edit and resubmit.', priority: 'H', precondition: 'Submitted timesheet exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Timesheet', feature: 'History', scenario: 'View timesheet history', steps: '1. Navigate to Timesheets → History tab', expected: 'Shows all past timesheets with statuses, totals, dates.', priority: 'M', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },

  { _section: '📅 ATTENDANCE' },
  { module: 'Attendance', feature: 'My Attendance', scenario: 'View own attendance records', steps: '1. Navigate to /my-attendance', expected: 'Calendar/table view of own check-in/check-out records.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Attendance', feature: 'My Attendance', scenario: 'Employee check-in', steps: '1. Click Check-In button', expected: 'Check-in time recorded. Status shows as "Checked In".', priority: 'H', precondition: 'Employee logged in, not checked in yet today', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Attendance', feature: 'My Attendance', scenario: 'Employee check-out', steps: '1. Click Check-Out button', expected: 'Check-out time recorded. Total hours calculated for the day.', priority: 'H', precondition: 'Employee checked in today', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Attendance', feature: 'Management', scenario: 'View all attendance records (Admin)', steps: '1. Navigate to /attendance-management', expected: 'Shows all employees\' attendance records with date filter.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Attendance', feature: 'Management', scenario: 'Mark manual attendance for employee', steps: '1. Click Mark Attendance\n2. Select employee\n3. Set check-in/check-out times\n4. Save', expected: 'Attendance record created with ISO timestamps. Times stored correctly.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#21 fix' },
  { module: 'Attendance', feature: 'Management', scenario: 'Edit attendance record', steps: '1. Click Edit on existing record\n2. Modify times\n3. Save', expected: 'Record updated. New times reflected.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Attendance', feature: 'Management', scenario: 'Filter attendance by employee/date', steps: '1. Select employee from dropdown\n2. Choose date range', expected: 'Records filtered to selected employee and date range.', priority: 'M', precondition: 'Attendance management loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Attendance', feature: 'Export', scenario: 'Export attendance data (CSV)', steps: '1. Click Export button', expected: 'CSV file downloads with attendance data.', priority: 'M', precondition: 'Attendance management loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 7: Payroll & Compensation ──
const payrollTests = [
  { _section: '💰 PAYROLL MANAGEMENT' },
  { module: 'Payroll', feature: 'Payroll List', scenario: 'View payroll management page', steps: '1. Navigate to /payroll-management', expected: 'Payroll page loads with tabs, search, employee payroll data table.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Payroll', feature: 'Search', scenario: 'Search payroll by employee name', steps: '1. Type employee name in search box', expected: 'Payroll list filters without cursor jumping. Debounce applied.', priority: 'M', precondition: 'Payroll page loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A', notes: 'Bug A#27 fix' },
  { module: 'Payroll', feature: 'Calculate', scenario: 'Calculate payroll for month', steps: '1. Click Calculate/Process Payroll\n2. Select month/year\n3. Confirm', expected: 'Payroll calculated for all active employees. Net pay, deductions shown.', priority: 'H', precondition: 'Admin/HR logged in, salary structures exist', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Create', scenario: 'Create payroll record', steps: '1. Click Add Payroll\n2. Select employee/period\n3. Enter details\n4. Save', expected: 'Payroll record created. Appears in payroll list.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Edit', scenario: 'Edit payroll record', steps: '1. Click Edit on payroll row\n2. Modify amounts\n3. Save', expected: 'Payroll record updated with new amounts.', priority: 'M', precondition: 'Admin/HR logged in, draft payroll exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '💳 PAYSLIPS' },
  { module: 'Payroll', feature: 'Generate Payslips', scenario: 'Generate payslips for all employees', steps: '1. Click Generate Payslips\n2. Select month/year\n3. Confirm', expected: 'Payslips generated for all employees. Status: Draft.', priority: 'H', precondition: 'Admin/HR logged in, payroll data exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Payslip Preview', scenario: 'Preview payslip before finalizing', steps: '1. Click Preview on draft payslip', expected: 'Shows payslip with earnings, deductions, net pay in formatted view.', priority: 'M', precondition: 'Draft payslip exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Finalize', scenario: 'Finalize payslip (lock editing)', steps: '1. Select payslip\n2. Click Finalize', expected: 'Payslip locked. Cannot be edited. Available to employee.', priority: 'H', precondition: 'Draft payslip exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Bulk Finalize', scenario: 'Finalize multiple payslips at once', steps: '1. Select multiple payslips\n2. Click Bulk Finalize', expected: 'All selected payslips finalized.', priority: 'M', precondition: 'Multiple draft payslips exist', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Mark Paid', scenario: 'Mark payslip as paid', steps: '1. Select finalized payslip\n2. Click Mark as Paid', expected: 'Payslip status changes to "Paid".', priority: 'H', precondition: 'Finalized payslip exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '📄 EMPLOYEE PAYSLIPS (View)' },
  { module: 'Payroll', feature: 'View Payslips', scenario: 'Employee views own payslips', steps: '1. Navigate to /employee-payslips', expected: 'Shows list of own payslips with month, earnings, deductions, net pay.', priority: 'H', precondition: 'Employee logged in, payslips exist', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Payroll', feature: 'Download PDF', scenario: 'Download payslip as PDF', steps: '1. Click Download/PDF button on a payslip', expected: 'PDF file downloads with formatted payslip.', priority: 'H', precondition: 'Finalized payslip exists', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Payroll', feature: 'View Detail', scenario: 'View payslip detail dialog', steps: '1. Click on a payslip row or View button', expected: 'Dialog/page shows full payslip breakdown (earnings, deductions, tax, net).', priority: 'M', precondition: 'Payslips exist', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Payroll', feature: 'Export', scenario: 'Export payslip summary report', steps: '1. Admin/HR: Click Export on payroll page', expected: 'Excel/CSV report downloads with all payslip data.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '🖼️ PAYSLIP TEMPLATES' },
  { module: 'Payroll', feature: 'Templates', scenario: 'View payslip templates', steps: '1. Navigate to /admin/payslip-templates', expected: 'Page shows list of payslip templates with preview.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Payroll', feature: 'Templates', scenario: 'Create new payslip template', steps: '1. Click Create Template\n2. Configure sections\n3. Save', expected: 'New template created. Available for payslip generation.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Templates', scenario: 'Set template as default', steps: '1. Click "Set as Default" on a template', expected: 'Template marked as default. Used for new payslip generation.', priority: 'M', precondition: 'Multiple templates exist', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '💵 SALARY STRUCTURES' },
  { module: 'Payroll', feature: 'Salary', scenario: 'View salary structure in employee edit form', steps: '1. Edit employee → Salary/Compensation tab', expected: 'Shows salary components: basic, HRA, allowances, deductions. 6+ fields.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Payroll', feature: 'Salary', scenario: 'Update salary structure', steps: '1. Edit employee compensation tab\n2. Change salary components\n3. Save', expected: 'Salary updated. Reflected in next payroll calculation.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 8: Org & Projects ──
const orgTests = [
  { _section: '🏢 DEPARTMENTS' },
  { module: 'Organization', feature: 'Departments', scenario: 'View all departments', steps: '1. Navigate to /organization → Departments tab', expected: 'Table shows all departments with name, head, employee count.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Organization', feature: 'Departments', scenario: 'Create new department', steps: '1. Click Add Department\n2. Enter name, code, description\n3. Save', expected: 'Department created. Available in employee dropdown.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Departments', scenario: 'Edit department', steps: '1. Click Edit on department\n2. Change name/details\n3. Save', expected: 'Department updated. Changes reflected everywhere.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Departments', scenario: 'Delete department', steps: '1. Click Delete on department\n2. Confirm', expected: 'Department soft-deleted. Not available in dropdowns.', priority: 'M', precondition: 'Admin logged in, department has no employees', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Departments', scenario: 'Search departments', steps: '1. Type in search box', expected: 'List filters to matching departments.', priority: 'L', precondition: 'Departments page loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '📍 POSITIONS' },
  { module: 'Organization', feature: 'Positions', scenario: 'View all positions', steps: '1. Navigate to /organization → Positions tab', expected: 'Table shows all job positions with title and salary range.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Organization', feature: 'Positions', scenario: 'Create new position', steps: '1. Click Add Position\n2. Enter title, description, salary range\n3. Save', expected: 'Position created. Available in employee dropdown.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Positions', scenario: 'Edit position', steps: '1. Click Edit\n2. Change details\n3. Save', expected: 'Position updated.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Positions', scenario: 'Delete position', steps: '1. Click Delete\n2. Confirm', expected: 'Position soft-deleted.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '🎄 HOLIDAYS' },
  { module: 'Organization', feature: 'Holidays', scenario: 'View holiday calendar', steps: '1. Navigate to /organization → Holidays tab', expected: 'Shows holiday list/calendar for the year.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Organization', feature: 'Holidays', scenario: 'Create new holiday', steps: '1. Click Add Holiday\n2. Enter name, date, type\n3. Save', expected: 'Holiday created. Reflected in attendance & leave calculations.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Holidays', scenario: 'Edit holiday', steps: '1. Click Edit\n2. Change details\n3. Save', expected: 'Holiday updated.', priority: 'L', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Organization', feature: 'Holidays', scenario: 'Delete holiday', steps: '1. Click Delete\n2. Confirm', expected: 'Holiday removed from calendar.', priority: 'L', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '📦 PROJECTS' },
  { module: 'Projects', feature: 'Project List', scenario: 'View projects page', steps: '1. Navigate to /project-task-config → Projects tab', expected: 'Shows project cards/table with name, status, dates.', priority: 'H', precondition: 'Admin/HR/Manager logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Deny' },
  { module: 'Projects', feature: 'Create', scenario: 'Create new project', steps: '1. Click Add Project\n2. Enter name, description, dates, status\n3. Save', expected: 'Project created. Available for task assignment.', priority: 'H', precondition: 'Admin/Manager logged in', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Projects', feature: 'Edit', scenario: 'Edit project details', steps: '1. Click Edit on project\n2. Change details\n3. Save', expected: 'Project updated.', priority: 'M', precondition: 'Admin/Manager logged in', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Projects', feature: 'Delete', scenario: 'Delete project', steps: '1. Click Delete on project\n2. Confirm', expected: 'Project soft-deleted. Associated tasks remain but project unlinked.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Projects', feature: 'Search', scenario: 'Search projects', steps: '1. Type in search box', expected: 'List filters to matching projects.', priority: 'L', precondition: 'Projects page loaded', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },

  { _section: '✅ TASKS' },
  { module: 'Tasks', feature: 'My Tasks', scenario: 'View assigned tasks', steps: '1. Navigate to /my-tasks', expected: 'Shows tasks assigned to logged-in user with status, due date, priority.', priority: 'H', precondition: 'Logged in, tasks assigned', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Tasks', feature: 'Create', scenario: 'Create new task', steps: '1. Navigate to /project-task-config → Tasks tab\n2. Click Add Task\n3. Select project, assignee, dates, priority\n4. Save', expected: 'Task created. Appears in assignee\'s My Tasks.', priority: 'H', precondition: 'Admin/Manager logged in, project exists', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Tasks', feature: 'Edit', scenario: 'Edit task details', steps: '1. Click Edit on task\n2. Change details\n3. Save', expected: 'Task updated. Changes visible to assignee.', priority: 'M', precondition: 'Admin/Manager logged in', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Tasks', feature: 'Status Update', scenario: 'Update task status (In Progress/Complete)', steps: '1. Click on task\n2. Change status dropdown\n3. Save', expected: 'Task status updated. Reflected in task list.', priority: 'H', precondition: 'Task assigned to user', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'Test' },
  { module: 'Tasks', feature: 'Delete', scenario: 'Delete task', steps: '1. Click Delete on task\n2. Confirm', expected: 'Task soft-deleted. Removed from assignee\'s list.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Tasks', feature: 'Filter', scenario: 'Filter tasks by project, status, assignee', steps: '1. Apply filter combinations', expected: 'Task list filters correctly.', priority: 'M', precondition: 'Tasks page loaded', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'Test' },
];

// ── TAB 9: Reviews & Performance ──
const reviewTests = [
  { _section: '⭐ EMPLOYEE REVIEWS' },
  { module: 'Reviews', feature: 'View Reviews', scenario: 'View all employee reviews', steps: '1. Navigate to /employee-reviews', expected: 'Table shows reviews with employee name, reviewer, status, date.', priority: 'H', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'Reviews', feature: 'Create Review', scenario: 'Create new employee review', steps: '1. Click New Review\n2. Select employee\n3. Fill review form (rating, feedback)\n4. Save', expected: 'Review created with Draft/Pending status.', priority: 'H', precondition: 'Admin/HR/Manager logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Deny' },
  { module: 'Reviews', feature: 'Edit Review', scenario: 'Edit an existing review', steps: '1. Click Edit on a review\n2. Update rating/feedback\n3. Save', expected: 'Review updated. Changes reflected in list.', priority: 'M', precondition: 'Draft review exists', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'N/A' },
  { module: 'Reviews', feature: 'Submit Review', scenario: 'Submit review for approval', steps: '1. Complete review form\n2. Click Submit', expected: 'Review status changes to "Submitted". Can be approved by admin/HR.', priority: 'H', precondition: 'Draft review filled', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Reviews', feature: 'Approve Review', scenario: 'Approve a submitted review', steps: '1. Click Approve on submitted review', expected: 'Status changes to Approved. Visible to employee.', priority: 'H', precondition: 'Admin/HR logged in, submitted review exists', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Reviews', feature: 'Self-Assessment', scenario: 'Employee submits self-assessment', steps: '1. Login as Employee\n2. Go to reviews\n3. Open assigned review\n4. Fill self-assessment\n5. Submit', expected: 'Self-assessment saved. Visible to reviewer.', priority: 'H', precondition: 'Review assigned to employee', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Reviews', feature: 'Delete Review', scenario: 'Delete an employee review', steps: '1. Click Delete on review\n2. Confirm', expected: 'Review soft-deleted. Can be restored from Restore page.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'Deny' },
  { module: 'Reviews', feature: 'Search', scenario: 'Search reviews by employee name', steps: '1. Type in search box', expected: 'Reviews filtered by employee name.', priority: 'L', precondition: 'Reviews page loaded', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Reviews', feature: 'Filter', scenario: 'Filter reviews by status', steps: '1. Select status filter', expected: 'List shows only reviews matching selected status.', priority: 'M', precondition: 'Reviews page loaded', admin: 'Test', hr: 'N/A', manager: 'Test', employee: 'N/A' },
  { module: 'Reviews', feature: 'View Feedback', scenario: 'Employee views completed review feedback', steps: '1. Login as Employee\n2. Open approved review', expected: 'Can see manager\'s feedback and rating. Cannot edit.', priority: 'H', precondition: 'Approved review exists for employee', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
];

// ── TAB 10: Reports & System ──
const systemTests = [
  { _section: '📊 REPORTS' },
  { module: 'Reports', feature: 'Reports Dashboard', scenario: 'View reports page', steps: '1. Navigate to /reports', expected: 'Reports page loads with report type options and date filters.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'Reports', feature: 'Employee Report', scenario: 'Generate employee report', steps: '1. Select Employee Report type\n2. Set date range\n3. Click Generate', expected: 'Report generated with employee statistics, charts.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Reports', feature: 'Leave Report', scenario: 'Generate leave summary report', steps: '1. Select Leave Report\n2. Set date range\n3. Generate', expected: 'Leave utilization report with per-employee breakdown.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Reports', feature: 'Payroll Report', scenario: 'Generate payroll report', steps: '1. Select Payroll Report\n2. Set month/year\n3. Generate', expected: 'Payroll summary with totals.', priority: 'M', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'Reports', feature: 'Export', scenario: 'Export report data', steps: '1. Generate a report\n2. Click Export', expected: 'Report data downloads as Excel/CSV.', priority: 'M', precondition: 'Report generated', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },

  { _section: '👤 USER MANAGEMENT' },
  { module: 'System', feature: 'User List', scenario: 'View all users', steps: '1. Navigate to /user-management', expected: 'Table shows users with email, role, status, last login.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'System', feature: 'Create User', scenario: 'Create new user account', steps: '1. Click Create tab\n2. Enter email, password, first/last name, role\n3. Submit', expected: 'User created. Can login with credentials.', priority: 'H', precondition: 'Admin/HR logged in', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Create User', scenario: 'Create user — select each role', steps: '1. Create user with role=admin\n2. Create with role=hr\n3. role=manager\n4. role=employee', expected: 'Each role selectable and user created. Role determines access.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Edit User', scenario: 'Edit user role', steps: '1. Select user\n2. Change role\n3. Save', expected: 'Role updated. User\'s access changes on next login.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Search Users', scenario: 'Search users by email/name', steps: '1. Type in search box', expected: 'User list filters to matching users.', priority: 'M', precondition: 'User management loaded', admin: 'Test', hr: 'Test', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Filter Users', scenario: 'Filter users by role', steps: '1. Select role filter', expected: 'Shows only users with selected role.', priority: 'M', precondition: 'User management loaded', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Deactivate', scenario: 'Deactivate a user account', steps: '1. Click Deactivate on user\n2. Confirm', expected: 'User deactivated. Cannot login.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Reset Password', scenario: 'Admin resets user password', steps: '1. Select user\n2. Click Reset Password\n3. Enter new password\n4. Confirm', expected: 'Password reset. User must use new password.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '⚙️ SYSTEM SETTINGS' },
  { module: 'System', feature: 'Settings Hub', scenario: 'View system settings page', steps: '1. Navigate to /admin/settings-hub', expected: 'Settings page loads with tabs: Email Config, Preferences, Advanced.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'Deny', manager: 'Deny', employee: 'Deny' },
  { module: 'System', feature: 'Email Config', scenario: 'Configure SMTP settings', steps: '1. Go to Email Config tab\n2. Enter SMTP host, port, credentials\n3. Save', expected: 'SMTP settings saved. System can send emails.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Email Config', scenario: 'Test SMTP connection', steps: '1. Enter SMTP settings\n2. Click Test Connection', expected: 'Connection test result shown (success/failure with details).', priority: 'M', precondition: 'Admin logged in, SMTP settings entered', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Preferences', scenario: 'Toggle payslip display options', steps: '1. Go to Preferences tab\n2. Toggle Show Earnings/Show Deductions\n3. Save', expected: 'Display settings updated. Payslip view reflects changes.', priority: 'L', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '🔄 RESTORE MANAGEMENT' },
  { module: 'System', feature: 'Restore', scenario: 'View restore management page', steps: '1. Navigate to /admin/restore', expected: 'Shows tabs: Deleted Reviews, Deleted Leave Balances, Deleted Users.', priority: 'M', precondition: 'Admin logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
  { module: 'System', feature: 'Restore', scenario: 'Restore soft-deleted review', steps: '1. Go to Deleted Reviews tab\n2. Click Restore on a deleted review', expected: 'Review restored. Appears back in reviews list.', priority: 'M', precondition: 'Admin logged in, deleted review exists', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'System', feature: 'Restore', scenario: 'Restore deleted user', steps: '1. Go to Deleted Users tab\n2. Click Restore on a deleted user', expected: 'User reactivated. Can login again.', priority: 'M', precondition: 'Admin logged in, deleted user exists', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },

  { _section: '❓ HELP & DOCUMENTATION' },
  { module: 'System', feature: 'User Guide', scenario: 'Access user guide page', steps: '1. Navigate to /user-guide', expected: 'Page loads with documentation content. No access denied.', priority: 'L', precondition: 'Any role logged in', admin: 'Test', hr: 'Test', manager: 'Test', employee: 'Test' },
  { module: 'System', feature: 'System Showcase', scenario: 'Access system showcase (Admin only)', steps: '1. Navigate to /system-showcase', expected: 'Admin: page loads with feature showcase. Employee/Manager: Access Denied.', priority: 'L', precondition: 'Logged in', admin: 'Test', hr: 'Test', manager: 'Deny', employee: 'Deny' },
];

// ── TAB 11: RBAC & Negative Tests ──
const rbacTests = [
  { _section: '🚫 ROLE-BASED ACCESS DENIAL' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /employees (list)', steps: '1. Login as Employee\n2. Navigate to /employees', expected: 'Access Denied page or redirect. Cannot see employee list.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /admin-dashboard', steps: '1. Login as Employee\n2. Navigate to /admin-dashboard', expected: 'Access Denied or redirect to employee-dashboard.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /payroll-management', steps: '1. Login as Employee\n2. Navigate to /payroll-management', expected: 'Access Denied page.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /user-management', steps: '1. Login as Employee\n2. Navigate to /user-management', expected: 'Access Denied page.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /organization', steps: '1. Login as Employee\n2. Navigate to /organization', expected: 'Access Denied page.', priority: 'M', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /admin/leave-balances', steps: '1. Login as Employee\n2. Navigate to /admin/leave-balances', expected: 'Access Denied page.', priority: 'M', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'Employee Denied', scenario: 'Employee cannot access /reports', steps: '1. Login as Employee\n2. Navigate to /reports', expected: 'Access Denied page.', priority: 'M', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },

  { module: 'RBAC', feature: 'Manager Denied', scenario: 'Manager cannot access /employees/add', steps: '1. Login as Manager\n2. Navigate to /employees/add', expected: 'Access Denied. Manager cannot create employees.', priority: 'H', precondition: 'Manager logged in', admin: 'N/A', hr: 'N/A', manager: 'Deny', employee: 'N/A' },
  { module: 'RBAC', feature: 'Manager Denied', scenario: 'Manager cannot access /payroll-management', steps: '1. Login as Manager\n2. Navigate to /payroll-management', expected: 'Access Denied.', priority: 'H', precondition: 'Manager logged in', admin: 'N/A', hr: 'N/A', manager: 'Deny', employee: 'N/A' },
  { module: 'RBAC', feature: 'Manager Denied', scenario: 'Manager cannot access /admin/settings-hub', steps: '1. Login as Manager\n2. Navigate to /admin/settings-hub', expected: 'Access Denied.', priority: 'M', precondition: 'Manager logged in', admin: 'N/A', hr: 'N/A', manager: 'Deny', employee: 'N/A' },
  { module: 'RBAC', feature: 'Manager Denied', scenario: 'Manager cannot access /admin/restore', steps: '1. Login as Manager\n2. Navigate to /admin/restore', expected: 'Access Denied.', priority: 'M', precondition: 'Manager logged in', admin: 'N/A', hr: 'N/A', manager: 'Deny', employee: 'N/A' },

  { _section: '🔒 API-LEVEL RBAC' },
  { module: 'RBAC', feature: 'API Deny', scenario: 'Employee cannot call admin API endpoints directly', steps: '1. As Employee, make API call to POST /api/employees', expected: 'HTTP 403 Forbidden. Access denied response.', priority: 'H', precondition: 'Employee auth token', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Deny' },
  { module: 'RBAC', feature: 'API Deny', scenario: 'Unauthenticated request to protected endpoint', steps: '1. Call GET /api/employees without token', expected: 'HTTP 401 Unauthorized.', priority: 'H', precondition: 'No auth token', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'RBAC', feature: 'API Deny', scenario: 'Invalid/expired JWT token', steps: '1. Call API with expired or malformed token', expected: 'HTTP 401 Unauthorized. Proper error message.', priority: 'H', precondition: 'Expired/invalid token', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'RBAC', feature: 'Data Scope', scenario: 'Employee can only see own attendance', steps: '1. Login as Employee\n2. Call GET /api/attendance', expected: 'Only own records returned. Cannot see other employees.', priority: 'H', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'RBAC', feature: 'Data Scope', scenario: 'Manager sees only team data', steps: '1. Login as Manager\n2. Get employees / timesheets / leaves', expected: 'Only direct reports\' data returned.', priority: 'H', precondition: 'Manager logged in with team', admin: 'N/A', hr: 'N/A', manager: 'Test', employee: 'N/A' },

  { _section: '🛡️ EDGE CASES & NEGATIVE TESTS' },
  { module: 'Negative', feature: 'Navigation', scenario: 'Navigate to non-existent route', steps: '1. Navigate to /this-does-not-exist', expected: '404 page or redirect to dashboard.', priority: 'L', precondition: 'Logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'Test' },
  { module: 'Negative', feature: 'Navigation', scenario: 'Access protected page when not logged in', steps: '1. Clear cookies\n2. Navigate to /admin-dashboard', expected: 'Redirect to /login page.', priority: 'H', precondition: 'Not logged in', admin: 'N/A', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Forms', scenario: 'XSS in text input fields', steps: '1. Enter <script>alert(1)</script> in name/description fields\n2. Save\n3. Reload page', expected: 'Script NOT executed. Input sanitized or escaped. No XSS vulnerability.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Forms', scenario: 'SQL injection in search fields', steps: '1. Enter " OR 1=1 -- in search box', expected: 'No data leak. Search treats input as literal text.', priority: 'H', precondition: 'Admin logged in', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Forms', scenario: 'Very long input in text fields', steps: '1. Enter 10000+ characters in a name field\n2. Save', expected: 'Validation truncates or rejects. No crash.', priority: 'L', precondition: 'Any form open', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Upload', scenario: 'Upload non-image file as photo', steps: '1. Upload .exe or .txt file in photo upload', expected: 'Rejected with "Invalid file type" error. File not saved.', priority: 'M', precondition: 'Photo upload form', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Upload', scenario: 'Upload oversized file', steps: '1. Upload a 20MB image as photo', expected: 'Rejected with file size error. Upload not processed.', priority: 'M', precondition: 'Photo upload form', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Negative', feature: 'Concurrent', scenario: 'Two admins edit same employee simultaneously', steps: '1. Admin A and Admin B both edit employee X\n2. A saves first\n3. B saves after', expected: 'Last save wins or conflict detection. No data corruption.', priority: 'M', precondition: 'Two admin sessions', admin: 'Test', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
];

// ── TAB 12: Cross-Role Workflows ──
const workflowTests = [
  { _section: '🔄 EMPLOYEE ONBOARDING FLOW' },
  { module: 'Workflow', feature: 'Onboarding', scenario: 'Full employee onboarding: create → link account → first login', steps: '1. Admin creates employee (all tabs)\n2. Admin creates user account for employee\n3. Admin sends welcome email\n4. New user logs in\n5. New user views own dashboard & profile\n6. New user submits first timesheet', expected: 'Complete flow works end-to-end. New employee can access all self-service features.', priority: 'H', precondition: 'Admin logged in, departments/positions configured', admin: 'Lead', hr: 'N/A', manager: 'N/A', employee: 'Verify' },

  { _section: '🔄 LEAVE REQUEST → APPROVAL FLOW' },
  { module: 'Workflow', feature: 'Leave Flow', scenario: 'Employee submits leave → Manager approves → Balance updated', steps: '1. Employee submits leave request\n2. Manager sees pending request\n3. Manager approves\n4. Employee sees approved status\n5. Employee leave balance reduced', expected: 'Each step works. Status transitions correctly. Balance auto-deducted.', priority: 'H', precondition: 'Employee & Manager accounts linked', admin: 'N/A', hr: 'N/A', manager: 'Approve', employee: 'Submit' },
  { module: 'Workflow', feature: 'Leave Flow', scenario: 'Employee submits leave → Manager rejects', steps: '1. Employee submits leave\n2. Manager rejects with reason\n3. Employee sees rejection', expected: 'Status = Rejected. Balance NOT deducted. Reason visible to employee.', priority: 'H', precondition: 'Employee & Manager accounts linked', admin: 'N/A', hr: 'N/A', manager: 'Reject', employee: 'Submit' },
  { module: 'Workflow', feature: 'Leave Flow', scenario: 'Employee submits then cancels leave before approval', steps: '1. Employee submits leave\n2. Employee cancels pending request\n3. Manager no longer sees it as pending', expected: 'Status = Cancelled. Disappears from manager\'s pending queue.', priority: 'M', precondition: 'Employee logged in', admin: 'N/A', hr: 'N/A', manager: 'Verify', employee: 'Cancel' },

  { _section: '🔄 TIMESHEET → APPROVAL FLOW' },
  { module: 'Workflow', feature: 'Timesheet Flow', scenario: 'Employee submits timesheet → Manager approves', steps: '1. Employee creates weekly timesheet\n2. Employee enters hours for projects\n3. Employee submits\n4. Manager sees in Approvals tab\n5. Manager approves\n6. Employee sees accepted', expected: 'Complete flow works. Status transitions: Draft→Submitted→Approved.', priority: 'H', precondition: 'Employee & Manager linked, projects exist', admin: 'N/A', hr: 'N/A', manager: 'Approve', employee: 'Submit' },
  { module: 'Workflow', feature: 'Timesheet Flow', scenario: 'Manager rejects → Employee revises → Resubmit', steps: '1. Employee submits timesheet\n2. Manager rejects\n3. Employee edits corrections\n4. Employee resubmits\n5. Manager approves', expected: 'Rejected timesheet becomes editable. Resubmit works. Final approval.', priority: 'H', precondition: 'Existing submitted timesheet', admin: 'N/A', hr: 'N/A', manager: 'Reject→Approve', employee: 'Edit→Submit' },

  { _section: '🔄 PAYROLL CYCLE FLOW' },
  { module: 'Workflow', feature: 'Payroll Cycle', scenario: 'Full payroll cycle: calculate → generate payslips → finalize → mark paid', steps: '1. HR calculates payroll for month\n2. HR reviews payroll data\n3. HR generates payslips\n4. HR reviews payslip preview\n5. HR finalizes payslips\n6. Admin marks as paid\n7. Employees view payslips\n8. Employee downloads PDF', expected: 'Full cycle completes. Payslips available to employees with correct amounts.', priority: 'H', precondition: 'Employees with salary structures, attendance data', admin: 'Finalize', hr: 'Process', manager: 'N/A', employee: 'View' },

  { _section: '🔄 EMPLOYEE REVIEW FLOW' },
  { module: 'Workflow', feature: 'Review Cycle', scenario: 'Manager creates review → Employee self-assesses → Manager submits → Admin approves', steps: '1. Manager creates review for direct report\n2. Employee fills self-assessment\n3. Manager adds feedback & rating\n4. Manager submits review\n5. Admin/HR approves\n6. Employee can view final review', expected: 'Full review lifecycle works. Permissions respected at each stage.', priority: 'H', precondition: 'Manager with direct reports', admin: 'Approve', hr: 'N/A', manager: 'Create+Submit', employee: 'Self-Assess' },

  { _section: '🔄 ATTENDANCE + MANUAL CORRECTION FLOW' },
  { module: 'Workflow', feature: 'Attendance Flow', scenario: 'Employee checks in/out → Admin corrects time → View history', steps: '1. Employee checks in\n2. Employee checks out\n3. Admin views attendance management\n4. Admin edits check-in/out times\n5. Employee views corrected attendance', expected: 'Check-in/out creates records. Admin correction with ISO timestamps saved. Employee sees updated times.', priority: 'H', precondition: 'Employee & Admin accounts', admin: 'Correct', hr: 'N/A', manager: 'N/A', employee: 'Check in/out' },

  { _section: '🔄 DATA LIFECYCLE (CREATE → DELETE → RESTORE)' },
  { module: 'Workflow', feature: 'Data Lifecycle', scenario: 'Create department → Assign employees → Delete → Restore', steps: '1. Admin creates department\n2. Admin assigns employees to it\n3. Admin deletes department\n4. Verify employees remain but department removed from dropdowns\n5. Admin restores department', expected: 'Full CRUD lifecycle works. Soft delete preserves data. Restore brings back.', priority: 'M', precondition: 'Admin logged in', admin: 'Full', hr: 'N/A', manager: 'N/A', employee: 'N/A' },
  { module: 'Workflow', feature: 'Data Lifecycle', scenario: 'Create user → Deactivate → Cannot login → Restore → Can login', steps: '1. Admin creates user\n2. New user verifies login\n3. Admin deactivates user\n4. User tries login → rejected\n5. Admin restores/reactivates\n6. User can login again', expected: 'Full account lifecycle works correctly.', priority: 'M', precondition: 'Admin logged in', admin: 'Full', hr: 'N/A', manager: 'N/A', employee: 'Verify' },
];

// ═══════════════════════════════════════════════════════════════════
// SUMMARY TAB
// ═══════════════════════════════════════════════════════════════════
function createSummarySheet(wb) {
  const ws = wb.addWorksheet('Summary', {
    properties: { defaultRowHeight: 20 }
  });

  // Title
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SkyrakSys HRM — Comprehensive Test Matrix';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerFg } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Metadata
  const meta = [
    ['Application:', 'SkyrakSys HRM (Human Resource Management System)'],
    ['Version:', 'v1.0 — Full Suite'],
    ['Date Created:', new Date().toISOString().split('T')[0]],
    ['Test Accounts:', 'admin@skyraksys.com | hr@skyraksys.com | lead@skyraksys.com | employee1@skyraksys.com (all: admin123)'],
    ['Environments:', 'Frontend: localhost:3000 | Backend: localhost:5000 | DB: PostgreSQL localhost:5432'],
    ['Roles:', 'Admin (full access) | HR (people+payroll) | Manager (team oversight) | Employee (self-service)'],
  ];
  meta.forEach((m, i) => {
    const row = ws.getRow(3 + i);
    row.getCell(1).value = m[0];
    row.getCell(1).font = { bold: true, size: 10 };
    ws.mergeCells(row.number, 2, row.number, 8);
    row.getCell(2).value = m[1];
    row.getCell(2).font = { size: 10 };
  });

  // Module breakdown table
  const startRow = 11;
  const moduleHeaders = ['Tab #', 'Tab Name', 'Module Coverage', 'Test Cases', 'Priority-H', 'Priority-M', 'Priority-L'];
  const mhRow = ws.getRow(startRow);
  moduleHeaders.forEach((h, i) => { mhRow.getCell(i + 1).value = h; });
  applyHeaderStyle(mhRow, moduleHeaders.length);

  const modules = [
    ['2', 'Auth & Session', 'Login, Logout, Password, Profile Menu, Token Refresh', authTests.filter(t => !t._section).length],
    ['3', 'Dashboard', 'Admin/HR/Employee/Manager Dashboards, Performance', dashboardTests.filter(t => !t._section).length],
    ['4', 'Employee Management', 'CRUD, Profile, Records, User Accounts, Photos', employeeTests.filter(t => !t._section).length],
    ['5', 'Leave Management', 'Requests, Approval, Balances, Types, Accrual', leaveTests.filter(t => !t._section).length],
    ['6', 'Timesheet & Attendance', 'Weekly Entry, Approvals, Check-in/out, Manual Attendance', timesheetTests.filter(t => !t._section).length],
    ['7', 'Payroll & Compensation', 'Payroll, Payslips, Templates, Salary Structures', payrollTests.filter(t => !t._section).length],
    ['8', 'Org & Projects', 'Departments, Positions, Holidays, Projects, Tasks', orgTests.filter(t => !t._section).length],
    ['9', 'Reviews & Performance', 'Employee Reviews, Self-Assessment, Approval Cycle', reviewTests.filter(t => !t._section).length],
    ['10', 'Reports & System', 'Reports, User Mgmt, Settings, Restore, Help', systemTests.filter(t => !t._section).length],
    ['11', 'RBAC & Negative', 'Access Denial, API Security, Edge Cases, XSS/SQLi', rbacTests.filter(t => !t._section).length],
    ['12', 'Cross-Role Workflows', 'End-to-End Business Flows (Onboarding, Leave, Payroll, etc.)', workflowTests.filter(t => !t._section).length],
  ];

  let totalTC = 0;
  modules.forEach((m, i) => {
    const row = ws.getRow(startRow + 1 + i);
    row.getCell(1).value = m[0];
    row.getCell(2).value = m[1];
    row.getCell(3).value = m[2];
    row.getCell(4).value = m[3];
    totalTC += m[3];
    applyRowStyle(row, moduleHeaders.length, i % 2 === 1);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(4).font = { bold: true, size: 10 };
  });

  // Total row
  const totRow = ws.getRow(startRow + 1 + modules.length);
  totRow.getCell(1).value = '';
  totRow.getCell(2).value = 'TOTAL';
  totRow.getCell(3).value = '';
  totRow.getCell(4).value = totalTC;
  totRow.getCell(2).font = { bold: true, size: 11 };
  totRow.getCell(4).font = { bold: true, size: 11 };
  totRow.getCell(4).alignment = { horizontal: 'center' };
  for (let c = 1; c <= moduleHeaders.length; c++) {
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
    totRow.getCell(c).border = { top: { style: 'medium' }, bottom: { style: 'medium' } };
  }

  // Legend
  const legendStart = startRow + modules.length + 4;
  ws.getRow(legendStart).getCell(1).value = 'LEGEND';
  ws.getRow(legendStart).getCell(1).font = { bold: true, size: 12 };

  const legend = [
    ['Test', 'Role should execute this test case'],
    ['Deny', 'Role should be DENIED access (test the denial)'],
    ['N/A', 'Not applicable for this role'],
    ['Lead', 'Role leads/initiates the workflow step'],
    ['Verify', 'Role verifies the outcome of the step'],
    ['Submit', 'Role submits/creates the item'],
    ['Approve', 'Role approves the item'],
    ['H / M / L', 'Priority: High (must test) / Medium / Low (nice to have)'],
    ['Status column:', 'PASS / FAIL / BLOCKED / SKIP / NOT RUN'],
  ];
  legend.forEach((l, i) => {
    const row = ws.getRow(legendStart + 1 + i);
    row.getCell(2).value = l[0];
    row.getCell(2).font = { bold: true, size: 9 };
    row.getCell(3).value = l[1];
    row.getCell(3).font = { size: 9 };
  });

  // Role color legend
  const colorLegend = legendStart + legend.length + 2;
  ws.getRow(colorLegend).getCell(1).value = 'ROLE COLUMNS';
  ws.getRow(colorLegend).getCell(1).font = { bold: true, size: 12 };
  [['Admin', COLORS.adminBg], ['HR', COLORS.hrBg], ['Manager', COLORS.managerBg], ['Employee', COLORS.employeeBg]].forEach((r, i) => {
    const row = ws.getRow(colorLegend + 1 + i);
    row.getCell(2).value = r[0];
    row.getCell(2).font = { bold: true, size: 10 };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r[1] } };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r[1] } };
  });

  // Column widths
  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 55;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 12;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SkyrakSys QA';
  wb.created = new Date();

  createSummarySheet(wb);
  createTestSheet(wb, 'Auth & Session', authTests);
  createTestSheet(wb, 'Dashboard', dashboardTests);
  createTestSheet(wb, 'Employee Management', employeeTests);
  createTestSheet(wb, 'Leave Management', leaveTests);
  createTestSheet(wb, 'Timesheet & Attendance', timesheetTests);
  createTestSheet(wb, 'Payroll & Compensation', payrollTests);
  createTestSheet(wb, 'Org & Projects', orgTests);
  createTestSheet(wb, 'Reviews & Performance', reviewTests);
  createTestSheet(wb, 'Reports & System', systemTests);
  createTestSheet(wb, 'RBAC & Negative', rbacTests);
  createTestSheet(wb, 'Cross-Role Workflows', workflowTests);

  await wb.xlsx.writeFile(OUTPUT);

  // Count totals
  const allTests = [authTests, dashboardTests, employeeTests, leaveTests, timesheetTests, payrollTests, orgTests, reviewTests, systemTests, rbacTests, workflowTests];
  const total = allTests.reduce((sum, tests) => sum + tests.filter(t => !t._section).length, 0);

  console.log('✅ Test Matrix generated:', OUTPUT);
  console.log(`   12 tabs | ${total} test cases | 4 roles`);
  console.log('   Tabs:');
  console.log('    1. Summary Dashboard');
  console.log('    2. Auth & Session');
  console.log('    3. Dashboard');
  console.log('    4. Employee Management');
  console.log('    5. Leave Management');
  console.log('    6. Timesheet & Attendance');
  console.log('    7. Payroll & Compensation');
  console.log('    8. Org & Projects');
  console.log('    9. Reviews & Performance');
  console.log('   10. Reports & System');
  console.log('   11. RBAC & Negative');
  console.log('   12. Cross-Role Workflows');
}

main().catch(e => console.error('ERROR:', e));
