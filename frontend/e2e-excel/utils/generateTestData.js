/**
 * Generate test-data.xlsx with sheets for each module.
 *
 * Run: node e2e-excel/utils/generateTestData.js
 *
 * Each sheet has: testId, description, action, enabled, + module-specific columns
 */

const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();

// ─── 1. Login ──────────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'LOGIN-001', description: 'Successful admin login', action: 'login', enabled: 'TRUE', email: 'admin@skyraksys.com', password: 'admin123', expectedRole: 'admin', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-002', description: 'Successful HR login', action: 'login', enabled: 'TRUE', email: 'hr@skyraksys.com', password: 'admin123', expectedRole: 'hr', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-003', description: 'Successful manager login', action: 'login', enabled: 'TRUE', email: 'lead@skyraksys.com', password: 'admin123', expectedRole: 'manager', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-004', description: 'Successful employee login', action: 'login', enabled: 'TRUE', email: 'employee1@skyraksys.com', password: 'admin123', expectedRole: 'employee', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-005', description: 'Invalid password', action: 'login', enabled: 'TRUE', email: 'admin@skyraksys.com', password: 'wrong123', expectedRole: '', expectSuccess: 'FALSE' },
  { testId: 'LOGIN-006', description: 'Empty email field', action: 'login', enabled: 'TRUE', email: '', password: 'admin123', expectedRole: '', expectSuccess: 'FALSE' },
  { testId: 'LOGIN-007', description: 'Empty password field', action: 'login', enabled: 'TRUE', email: 'admin@skyraksys.com', password: '', expectedRole: '', expectSuccess: 'FALSE' },
  { testId: 'LOGIN-008', description: 'Non-existent user', action: 'login', enabled: 'TRUE', email: 'nobody@skyraksys.com', password: 'admin123', expectedRole: '', expectSuccess: 'FALSE' },
  { testId: 'LOGIN-009', description: 'Toggle password visibility', action: 'togglePassword', enabled: 'TRUE', email: '', password: '', expectedRole: '', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-010', description: 'Forgot password link navigation', action: 'forgotPassword', enabled: 'TRUE', email: '', password: '', expectedRole: '', expectSuccess: 'TRUE' },
  { testId: 'LOGIN-011', description: 'Logout flow', action: 'logout', enabled: 'TRUE', email: 'admin@skyraksys.com', password: 'admin123', expectedRole: 'admin', expectSuccess: 'TRUE' },
]), 'Login');

// ─── 2. Dashboard ──────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'DASH-001', description: 'Admin dashboard loads with stats', action: 'verifyStats', enabled: 'TRUE', role: 'admin', expectedElements: 'refreshButton,statTotalEmployees,statOnLeave,statPendingLeaves' },
  { testId: 'DASH-002', description: 'Admin quick actions navigate correctly', action: 'quickAction', enabled: 'TRUE', role: 'admin', quickAction: 'addEmployee', expectedUrl: '/employees/create' },
  { testId: 'DASH-003', description: 'Employee dashboard loads', action: 'verifyStats', enabled: 'TRUE', role: 'employee', expectedElements: 'heading,statPending,statThisMonth,statLeaveBalance' },
  { testId: 'DASH-004', description: 'Employee quick action - timesheet', action: 'quickAction', enabled: 'TRUE', role: 'employee', quickAction: 'timesheet', expectedUrl: '/timesheets' },
  { testId: 'DASH-005', description: 'Employee quick action - leave request', action: 'quickAction', enabled: 'TRUE', role: 'employee', quickAction: 'leaveRequest', expectedUrl: '/leaves' },
  { testId: 'DASH-006', description: 'Employee quick action - payslips', action: 'quickAction', enabled: 'TRUE', role: 'employee', quickAction: 'payslips', expectedUrl: '/payslips' },
  { testId: 'DASH-007', description: 'Manager dashboard loads', action: 'verifyStats', enabled: 'TRUE', role: 'manager', expectedElements: 'heading,btnApproveLeaves,btnApproveTS' },
  { testId: 'DASH-008', description: 'Dashboard refresh updates data', action: 'refresh', enabled: 'TRUE', role: 'admin', expectedElements: '' },
]), 'Dashboard');

// ─── 3. Employee ───────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'EMP-001', description: 'Employee list loads', action: 'listLoad', enabled: 'TRUE', role: 'admin', expectedMinRows: '1' },
  { testId: 'EMP-002', description: 'Search employee by name', action: 'search', enabled: 'TRUE', role: 'admin', searchTerm: 'John', expectedMinRows: '0' },
  { testId: 'EMP-003', description: 'Filter by Active status', action: 'filterStatus', enabled: 'TRUE', role: 'admin', filterValue: 'Active', expectedMinRows: '0' },
  { testId: 'EMP-004', description: 'Create new employee - personal info', action: 'create', enabled: 'TRUE', role: 'admin', firstName: 'Test', lastName: 'Automation', email: 'test.auto@skyraksys.com', phone: '9876543210', nationality: 'Indian', address: '123 Test St', city: 'Chennai', state: 'Tamil Nadu', pinCode: '600001' },
  { testId: 'EMP-005', description: 'Tab navigation - Personal to Employment', action: 'tabNavigation', enabled: 'TRUE', role: 'admin', fromTab: 'personal', toTab: 'employment' },
  { testId: 'EMP-006', description: 'Tab navigation - Employment to Emergency', action: 'tabNavigation', enabled: 'TRUE', role: 'admin', fromTab: 'employment', toTab: 'emergency' },
  { testId: 'EMP-007', description: 'Tab navigation - Emergency to Statutory', action: 'tabNavigation', enabled: 'TRUE', role: 'admin', fromTab: 'emergency', toTab: 'statutory' },
  { testId: 'EMP-008', description: 'View employee profile', action: 'viewProfile', enabled: 'TRUE', role: 'admin', employeeIndex: '0' },
  { testId: 'EMP-009', description: 'Employee self-view My Profile', action: 'myProfile', enabled: 'TRUE', role: 'employee', expectedElement: 'myProfilePage' },
  { testId: 'EMP-010', description: 'Export employee list', action: 'export', enabled: 'TRUE', role: 'admin', expectedElement: '' },
  { testId: 'EMP-011', description: 'Edit employee from profile', action: 'editFromProfile', enabled: 'TRUE', role: 'admin', employeeIndex: '0' },
  { testId: 'EMP-012', description: 'Cancel form shows unsaved dialog', action: 'unsavedDialog', enabled: 'TRUE', role: 'admin', expectedElement: 'unsavedStayBtn' },
]), 'Employee');

// ─── 4. Leave ──────────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'LV-001', description: 'Submit casual leave request', action: 'submitRequest', enabled: 'TRUE', role: 'employee', leaveType: 'Casual Leave', startDate: '2026-04-01', endDate: '2026-04-01', reason: 'Personal work - automation test', expectSuccess: 'TRUE' },
  { testId: 'LV-002', description: 'Submit sick leave request', action: 'submitRequest', enabled: 'TRUE', role: 'employee', leaveType: 'Sick Leave', startDate: '2026-04-02', endDate: '2026-04-03', reason: 'Feeling unwell - automation test', expectSuccess: 'TRUE' },
  { testId: 'LV-003', description: 'Submit leave with missing reason', action: 'submitRequest', enabled: 'TRUE', role: 'employee', leaveType: 'Casual Leave', startDate: '2026-04-05', endDate: '2026-04-05', reason: '', expectSuccess: 'FALSE' },
  { testId: 'LV-004', description: 'Admin approves leave', action: 'approve', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'LV-005', description: 'Admin rejects leave', action: 'reject', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'LV-006', description: 'View leave balances', action: 'viewBalances', enabled: 'TRUE', role: 'admin', expectedElement: 'balanceInitBtn' },
  { testId: 'LV-007', description: 'Add new leave type', action: 'addType', enabled: 'TRUE', role: 'admin', typeName: 'Automation Test Leave', typeAllowance: '5', expectSuccess: 'TRUE' },
  { testId: 'LV-008', description: 'Initialize leave balances', action: 'initBalances', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'LV-009', description: 'Leave accrual preview', action: 'accrualPreview', enabled: 'TRUE', role: 'admin', expectedElement: 'accrualPreviewBtn' },
  { testId: 'LV-010', description: 'Cancel leave request', action: 'cancelRequest', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'LV-011', description: 'End date before start date validation', action: 'submitRequest', enabled: 'TRUE', role: 'employee', leaveType: 'Casual Leave', startDate: '2026-04-10', endDate: '2026-04-08', reason: 'Invalid dates test', expectSuccess: 'FALSE' },
]), 'Leave');

// ─── 5. Attendance ─────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'ATT-001', description: 'My Attendance page loads', action: 'pageLoad', enabled: 'TRUE', role: 'employee', expectedElement: 'myPage' },
  { testId: 'ATT-002', description: 'Check-in action', action: 'checkIn', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'ATT-003', description: 'Check-out action', action: 'checkOut', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'ATT-004', description: 'View monthly report - change month', action: 'changeMonth', enabled: 'TRUE', role: 'employee', month: '1', year: '2026' },
  { testId: 'ATT-005', description: 'Attendance management page loads', action: 'managementLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'managementPage' },
  { testId: 'ATT-006', description: 'Filter attendance by date', action: 'filterDate', enabled: 'TRUE', role: 'admin', date: '2026-03-19', expectedElement: 'dataGrid' },
  { testId: 'ATT-007', description: 'Mark attendance manually', action: 'markAttendance', enabled: 'TRUE', role: 'admin', status: 'present', expectSuccess: 'TRUE' },
  { testId: 'ATT-008', description: 'Status chip displays correctly', action: 'verifyStatus', enabled: 'TRUE', role: 'employee', expectedElement: 'statusChip' },
]), 'Attendance');

// ─── 6. Payroll ────────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'PAY-001', description: 'Payroll management page loads', action: 'pageLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'managementPage' },
  { testId: 'PAY-002', description: 'Tab navigation - Overview', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', tabIndex: '0', tabName: 'Overview' },
  { testId: 'PAY-003', description: 'Tab navigation - Generate', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', tabIndex: '1', tabName: 'Generate' },
  { testId: 'PAY-004', description: 'Tab navigation - Process Payments', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', tabIndex: '2', tabName: 'Process Payments' },
  { testId: 'PAY-005', description: 'Tab navigation - Reports', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', tabIndex: '3', tabName: 'Reports' },
  { testId: 'PAY-006', description: 'Search payslips by employee', action: 'search', enabled: 'TRUE', role: 'admin', searchTerm: 'John' },
  { testId: 'PAY-007', description: 'Generate payslips (validate first)', action: 'generate', enabled: 'TRUE', role: 'admin', month: '3', year: '2026', expectSuccess: 'TRUE' },
  { testId: 'PAY-008', description: 'Bulk finalize payslips', action: 'bulkFinalize', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'PAY-009', description: 'Bulk mark as paid', action: 'bulkMarkPaid', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'PAY-010', description: 'Export payslips Excel', action: 'export', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'PAY-011', description: 'Refresh payslips list', action: 'refresh', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'PAY-012', description: 'Employee views own payslips', action: 'employeePayslips', enabled: 'TRUE', role: 'employee', expectedElement: 'employeePage' },
  { testId: 'PAY-013', description: 'Employee filters payslips by year', action: 'filterYear', enabled: 'TRUE', role: 'employee', year: '2026' },
  { testId: 'PAY-014', description: 'Employee views payslip detail', action: 'viewDetail', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'PAY-015', description: 'Employee downloads payslip PDF', action: 'download', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
]), 'Payroll');

// ─── 7. Tasks ──────────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'TSK-001', description: 'My Tasks page loads', action: 'pageLoad', enabled: 'TRUE', role: 'employee', expectedElement: 'page' },
  { testId: 'TSK-002', description: 'Search tasks', action: 'search', enabled: 'TRUE', role: 'employee', searchTerm: 'Test' },
  { testId: 'TSK-003', description: 'Filter tasks by status - In Progress', action: 'filterStatus', enabled: 'TRUE', role: 'employee', filterValue: 'In Progress' },
  { testId: 'TSK-004', description: 'Filter tasks by priority - High', action: 'filterPriority', enabled: 'TRUE', role: 'employee', filterValue: 'High' },
  { testId: 'TSK-005', description: 'Update task status', action: 'updateStatus', enabled: 'TRUE', role: 'employee', taskIndex: '0', newStatus: 'In Progress', expectSuccess: 'TRUE' },
  { testId: 'TSK-006', description: 'Clear filters shows all tasks', action: 'clearFilters', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'TSK-007', description: 'Summary cards show correct counts', action: 'verifyCounts', enabled: 'TRUE', role: 'employee', expectedElement: '' },
]), 'Tasks');

// ─── 8. Reviews ────────────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'REV-001', description: 'Reviews page loads', action: 'pageLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'page' },
  { testId: 'REV-002', description: 'Create new review', action: 'create', enabled: 'TRUE', role: 'admin', reviewType: 'quarterly', reviewPeriod: 'Q1 2026', expectSuccess: 'TRUE' },
  { testId: 'REV-003', description: 'Search reviews by employee', action: 'search', enabled: 'TRUE', role: 'admin', searchTerm: 'John' },
  { testId: 'REV-004', description: 'Filter by status - draft', action: 'filterStatus', enabled: 'TRUE', role: 'admin', filterValue: 'draft' },
  { testId: 'REV-005', description: 'Filter by type - annual', action: 'filterType', enabled: 'TRUE', role: 'admin', filterValue: 'annual' },
  { testId: 'REV-006', description: 'Edit existing review', action: 'edit', enabled: 'TRUE', role: 'admin', reviewIndex: '0', expectSuccess: 'TRUE' },
  { testId: 'REV-007', description: 'Delete review', action: 'delete', enabled: 'TRUE', role: 'admin', reviewIndex: '0', expectSuccess: 'TRUE' },
  { testId: 'REV-008', description: 'HR approves review', action: 'approve', enabled: 'TRUE', role: 'hr', reviewIndex: '0', expectSuccess: 'TRUE' },
  { testId: 'REV-009', description: 'Employee submits self-assessment', action: 'selfAssessment', enabled: 'TRUE', role: 'employee', assessment: 'I achieved all Q1 targets and improved team efficiency.', expectSuccess: 'TRUE' },
  { testId: 'REV-010', description: 'Manager views review as read-only', action: 'viewReview', enabled: 'TRUE', role: 'manager', reviewIndex: '0' },
]), 'Reviews');

// ─── 9. Organization ──────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'ORG-001', description: 'Department management page loads', action: 'deptPageLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'page' },
  { testId: 'ORG-002', description: 'Add new department', action: 'addDept', enabled: 'TRUE', role: 'admin', deptName: 'QA Automation', deptCode: 'QA-AUTO', expectSuccess: 'TRUE' },
  { testId: 'ORG-003', description: 'Search departments', action: 'searchDept', enabled: 'TRUE', role: 'admin', searchTerm: 'Engineering' },
  { testId: 'ORG-004', description: 'Edit department', action: 'editDept', enabled: 'TRUE', role: 'admin', deptIndex: '0', expectSuccess: 'TRUE' },
  { testId: 'ORG-005', description: 'Position management page loads', action: 'posPageLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'page' },
  { testId: 'ORG-006', description: 'Add new position', action: 'addPosition', enabled: 'TRUE', role: 'admin', posTitle: 'Test Automation Engineer', expectSuccess: 'TRUE' },
  { testId: 'ORG-007', description: 'Holiday calendar loads', action: 'holidayPageLoad', enabled: 'TRUE', role: 'admin', expectedElement: 'page' },
  { testId: 'ORG-008', description: 'Add holiday', action: 'addHoliday', enabled: 'TRUE', role: 'admin', holidayName: 'Test Holiday', holidayDate: '2026-12-25', expectSuccess: 'TRUE' },
  { testId: 'ORG-009', description: 'Delete department', action: 'deleteDept', enabled: 'TRUE', role: 'admin', deptIndex: '0', expectSuccess: 'TRUE' },
  { testId: 'ORG-010', description: 'Delete position', action: 'deletePosition', enabled: 'TRUE', role: 'admin', posIndex: '0', expectSuccess: 'TRUE' },
]), 'Organization');

// ─── 10. Navigation ───────────────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'NAV-001', description: 'Sidebar shows correct nav items for admin', action: 'verifySidebar', enabled: 'TRUE', role: 'admin', expectedItems: 'dashboard,employees,leaves,attendance,timesheets,payroll,tasks,reviews' },
  { testId: 'NAV-002', description: 'Sidebar shows correct nav items for employee', action: 'verifySidebar', enabled: 'TRUE', role: 'employee', expectedItems: 'dashboard,leaves,attendance,timesheets,tasks,payslips' },
  { testId: 'NAV-003', description: 'Navigate to each module - admin', action: 'navigateAll', enabled: 'TRUE', role: 'admin', modules: 'employees,leaves,attendance,timesheets,payroll,tasks,reviews' },
  { testId: 'NAV-004', description: 'Role chip displays correct role', action: 'verifyRole', enabled: 'TRUE', role: 'admin', expectedText: 'admin' },
  { testId: 'NAV-005', description: 'Profile menu opens', action: 'profileMenu', enabled: 'TRUE', role: 'employee', expectedItems: 'viewProfile,settings,logout' },
  { testId: 'NAV-006', description: 'Drawer toggle collapses sidebar', action: 'toggleDrawer', enabled: 'TRUE', role: 'admin', expectSuccess: 'TRUE' },
  { testId: 'NAV-007', description: '404 page for invalid route', action: 'notFound', enabled: 'TRUE', role: 'admin', path: '/nonexistent-route' },
  { testId: 'NAV-008', description: 'Unauthenticated redirect to login', action: 'authRedirect', enabled: 'TRUE', role: '', path: '/dashboard' },
]), 'Navigation');

// ─── 11. Business Workflows ───────────────────────
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
  { testId: 'BW-001', description: 'Employee onboarding: create → assign dept → create user', action: 'onboarding', enabled: 'TRUE', role: 'admin', firstName: 'Onboard', lastName: 'Test', department: 'Engineering', expectSuccess: 'TRUE' },
  { testId: 'BW-002', description: 'Leave lifecycle: request → approve → reflect balance', action: 'leaveLifecycle', enabled: 'TRUE', role: 'admin', leaveType: 'Casual Leave', expectSuccess: 'TRUE' },
  { testId: 'BW-003', description: 'Attendance daily flow: check-in → check-out → verify hours', action: 'attendanceDaily', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'BW-004', description: 'Payroll cycle: generate → finalize → mark paid', action: 'payrollCycle', enabled: 'TRUE', role: 'admin', month: '3', year: '2026', expectSuccess: 'TRUE' },
  { testId: 'BW-005', description: 'Review workflow: create → employee input → HR approve', action: 'reviewWorkflow', enabled: 'TRUE', role: 'admin', reviewType: 'quarterly', expectSuccess: 'TRUE' },
  { testId: 'BW-006', description: 'Task status progression: Not Started → In Progress → Completed', action: 'taskProgression', enabled: 'TRUE', role: 'employee', expectSuccess: 'TRUE' },
  { testId: 'BW-007', description: 'Role-based access: employee cannot access payroll admin', action: 'accessControl', enabled: 'TRUE', role: 'employee', targetUrl: '/payroll', expectDenied: 'TRUE' },
  { testId: 'BW-008', description: 'Role-based access: employee cannot access employee management', action: 'accessControl', enabled: 'TRUE', role: 'employee', targetUrl: '/employees', expectDenied: 'TRUE' },
]), 'BusinessWorkflows');

// ─── Write the workbook ───────────────────────────
const outputPath = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Test data workbook generated: ${outputPath}`);
console.log(`📊 Sheets: ${wb.SheetNames.join(', ')}`);
console.log(`📝 Total test cases: ${wb.SheetNames.reduce((sum, name) => sum + XLSX.utils.sheet_to_json(wb.Sheets[name]).length, 0)}`);
