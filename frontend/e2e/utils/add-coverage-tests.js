/**
 * Add 9 new route-coverage test sheets to the Excel workbook.
 * Run: node e2e-excel/utils/add-coverage-tests.js
 */
const xlsx = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = xlsx.readFile(EXCEL_PATH);

const newSheets = {
  ForgotPassword: [
    { testId: 'FP-001', description: 'Forgot password page loads', action: 'pageLoad', enabled: 'TRUE', role: '' },
    { testId: 'FP-002', description: 'Email input visible and accepts text', action: 'fillEmail', enabled: 'TRUE', role: '', email: 'test@example.com' },
    { testId: 'FP-003', description: 'Submit button visible', action: 'verifySubmit', enabled: 'TRUE', role: '' },
    { testId: 'FP-004', description: 'Back to login link works', action: 'backToLogin', enabled: 'TRUE', role: '' },
  ],
  PerformanceDashboard: [
    { testId: 'PD-001', description: 'Performance dashboard loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'PD-002', description: 'Performance dashboard loads for manager', action: 'pageLoad', enabled: 'TRUE', role: 'manager' },
    { testId: 'PD-003', description: 'Auto-refresh toggle visible', action: 'verifyToggle', enabled: 'TRUE', role: 'admin' },
    { testId: 'PD-004', description: 'Manual refresh button works', action: 'clickRefresh', enabled: 'TRUE', role: 'admin' },
    { testId: 'PD-005', description: 'Client/Server tabs visible', action: 'verifyTabs', enabled: 'TRUE', role: 'admin' },
  ],
  LeaveAccrual: [
    { testId: 'LA-001', description: 'Leave accrual page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'LA-002', description: 'Leave accrual page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
    { testId: 'LA-003', description: 'Run accrual button visible', action: 'verifyRunBtn', enabled: 'TRUE', role: 'admin' },
    { testId: 'LA-004', description: 'Preview button visible', action: 'verifyPreviewBtn', enabled: 'TRUE', role: 'admin' },
  ],
  LeaveTypes: [
    { testId: 'LT-001', description: 'Leave types page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'LT-002', description: 'Leave types page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
    { testId: 'LT-003', description: 'Add leave type button visible', action: 'verifyAddBtn', enabled: 'TRUE', role: 'admin' },
    { testId: 'LT-004', description: 'Leave types table displays', action: 'verifyTable', enabled: 'TRUE', role: 'admin' },
  ],
  EmployeeRecords: [
    { testId: 'ER-001', description: 'Employee records page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'ER-002', description: 'Employee records page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
    { testId: 'ER-003', description: 'Search employee autocomplete visible', action: 'verifySearch', enabled: 'TRUE', role: 'admin' },
    { testId: 'ER-004', description: 'Record tabs visible (leave/timesheet/attendance)', action: 'verifyTabs', enabled: 'TRUE', role: 'admin' },
  ],
  Reports: [
    { testId: 'RP-001', description: 'Reports page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'RP-002', description: 'Reports page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
    { testId: 'RP-003', description: 'Date range filter visible', action: 'verifyDateFilter', enabled: 'TRUE', role: 'admin' },
    { testId: 'RP-004', description: 'Export button visible', action: 'verifyExport', enabled: 'TRUE', role: 'admin' },
  ],
  RestoreManagement: [
    { testId: 'RM-001', description: 'Restore management page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'RM-002', description: 'Restore management page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
    { testId: 'RM-003', description: 'Restore tabs visible (reviews/balances/users)', action: 'verifyTabs', enabled: 'TRUE', role: 'admin' },
    { testId: 'RM-004', description: 'Tab switching works', action: 'switchTabs', enabled: 'TRUE', role: 'admin' },
  ],
  SettingsHub: [
    { testId: 'SH-001', description: 'Settings hub page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'SH-002', description: 'Settings hub tabs visible', action: 'verifyTabs', enabled: 'TRUE', role: 'admin' },
    { testId: 'SH-003', description: 'Tab switching works (email/preferences/advanced)', action: 'switchTabs', enabled: 'TRUE', role: 'admin' },
  ],
  MyProfile: [
    { testId: 'MP-001', description: 'My profile page loads for employee', action: 'pageLoad', enabled: 'TRUE', role: 'employee' },
    { testId: 'MP-002', description: 'My profile page loads for admin', action: 'pageLoad', enabled: 'TRUE', role: 'admin' },
    { testId: 'MP-003', description: 'My profile page loads for manager', action: 'pageLoad', enabled: 'TRUE', role: 'manager' },
    { testId: 'MP-004', description: 'My profile page loads for HR', action: 'pageLoad', enabled: 'TRUE', role: 'hr' },
  ],
};

let totalAdded = 0;
for (const [sheetName, rows] of Object.entries(newSheets)) {
  if (wb.SheetNames.includes(sheetName)) {
    console.log(`  SKIP: ${sheetName} already exists`);
    continue;
  }
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  console.log(`  ADD: ${sheetName} (${rows.length} tests)`);
  totalAdded += rows.length;
}

xlsx.writeFile(wb, EXCEL_PATH);
console.log(`\nDone — added ${totalAdded} tests across ${Object.keys(newSheets).length} new sheets`);
console.log(`Total sheets: ${wb.SheetNames.length}`);
