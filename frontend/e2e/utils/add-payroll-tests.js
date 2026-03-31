/**
 * Add complete Payroll test rows to test-data.xlsx
 * Ensures all 40 PAY-xxx test cases (PAY-001 to PAY-040) are in the sheet.
 *
 * Run: node frontend/e2e-excel/utils/add-payroll-tests.js
 */
const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = XLSX.readFile(WORKBOOK_PATH);

// Complete Payroll test suite — 40 rows matching the spec coverage
const payrollTests = [
  // ════════════════════════════════════════════════
  // ADMIN TESTS (PAY-001 to PAY-024)
  // ════════════════════════════════════════════════
  { testId: 'PAY-001', description: 'Admin: Payroll management page loads', action: 'pageLoad', enabled: 'TRUE', role: 'admin', category: 'Page Load', route: '/payroll-management', expectedElement: 'managementPage' },
  { testId: 'PAY-002', description: 'Admin: All 4 tabs visible (Overview, Generate, Payments, Reports)', action: 'tabCount', enabled: 'TRUE', role: 'admin', category: 'Navigation', route: '/payroll-management', expectedElement: 'tabs', expectedValue: '4' },
  { testId: 'PAY-003', description: 'Admin: Switch to Overview tab', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', category: 'Navigation', route: '/payroll-management', tabIndex: '0', tabName: 'Overview' },
  { testId: 'PAY-004', description: 'Admin: Switch to Generate Payslips tab', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', category: 'Navigation', route: '/payroll-management', tabIndex: '1', tabName: 'Generate Payslips' },
  { testId: 'PAY-005', description: 'Admin: Switch to Process Payments tab', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', category: 'Navigation', route: '/payroll-management', tabIndex: '2', tabName: 'Process Payments' },
  { testId: 'PAY-006', description: 'Admin: Switch to Reports & Analytics tab', action: 'tabSwitch', enabled: 'TRUE', role: 'admin', category: 'Navigation', route: '/payroll-management', tabIndex: '3', tabName: 'Reports & Analytics' },
  { testId: 'PAY-007', description: 'Admin: Overview stats cards visible (total payroll, pending, processed)', action: 'overviewStats', enabled: 'TRUE', role: 'admin', category: 'Dashboard', route: '/payroll-management', expectedElement: 'overviewStats' },
  { testId: 'PAY-008', description: 'Admin: Quick actions panel visible on Overview', action: 'quickActions', enabled: 'TRUE', role: 'admin', category: 'Dashboard', route: '/payroll-management', expectedElement: 'quickActions' },
  { testId: 'PAY-009', description: 'Admin: Search payslips by employee name', action: 'search', enabled: 'TRUE', role: 'admin', category: 'Search & Filter', route: '/payroll-management', searchTerm: 'test' },
  { testId: 'PAY-010', description: 'Admin: Generate tab shows employee list with checkboxes', action: 'generateTabReady', enabled: 'TRUE', role: 'admin', category: 'Payslip Generation', route: '/payroll-management', tabIndex: '1' },
  { testId: 'PAY-011', description: 'Admin: Employee checkbox count >= 1 on Generate tab', action: 'employeeCheckboxCount', enabled: 'TRUE', role: 'admin', category: 'Payslip Generation', route: '/payroll-management', tabIndex: '1' },
  { testId: 'PAY-012', description: 'Admin: Validate & Generate button visible (disabled until selection)', action: 'validateGenerate', enabled: 'TRUE', role: 'admin', category: 'Payslip Generation', route: '/payroll-management', expectedElement: 'validateGenerateBtn' },
  { testId: 'PAY-013', description: 'Admin: Process Payments tab loads', action: 'paymentsTab', enabled: 'TRUE', role: 'admin', category: 'Payments', route: '/payroll-management', tabIndex: '2' },
  { testId: 'PAY-014', description: 'Admin: Reports & Analytics tab shows report content', action: 'reportsTab', enabled: 'TRUE', role: 'admin', category: 'Reports', route: '/payroll-management', tabIndex: '3' },
  { testId: 'PAY-015', description: 'Admin: Bulk Finalize button visible on Overview', action: 'bulkFinalize', enabled: 'TRUE', role: 'admin', category: 'Bulk Actions', route: '/payroll-management' },
  { testId: 'PAY-016', description: 'Admin: Bulk Mark as Paid button visible on Overview', action: 'bulkMarkPaid', enabled: 'TRUE', role: 'admin', category: 'Bulk Actions', route: '/payroll-management' },
  { testId: 'PAY-017', description: 'Admin: Export payslips to CSV triggers download', action: 'export', enabled: 'TRUE', role: 'admin', category: 'Export', route: '/payroll-management', expectedElement: 'exportBtn' },
  { testId: 'PAY-018', description: 'Admin: Refresh button reloads payslip data', action: 'refresh', enabled: 'TRUE', role: 'admin', category: 'Page Actions', route: '/payroll-management', expectedElement: 'refreshBtn' },
  { testId: 'PAY-019', description: 'Admin: Payslip table rows visible on Overview', action: 'payslipTableRows', enabled: 'TRUE', role: 'admin', category: 'Data Display', route: '/payroll-management' },
  { testId: 'PAY-020', description: 'Admin: Select All checkbox on payslip table', action: 'selectAllCheckbox', enabled: 'TRUE', role: 'admin', category: 'Data Display', route: '/payroll-management' },
  { testId: 'PAY-021', description: 'Admin: View Details button visible on payslip row', action: 'viewDetailsBtn', enabled: 'TRUE', role: 'admin', category: 'Data Display', route: '/payroll-management' },
  { testId: 'PAY-022', description: 'Admin: Payslip Template Configuration page loads', action: 'templatePageLoad', enabled: 'TRUE', role: 'admin', category: 'Templates', route: '/admin/payslip-templates', expectedElement: 'templatePage' },
  { testId: 'PAY-023', description: 'Admin: Create Template button visible', action: 'templateCreateBtn', enabled: 'TRUE', role: 'admin', category: 'Templates', route: '/admin/payslip-templates', expectedElement: 'templateCreateBtn' },
  { testId: 'PAY-024', description: 'Admin: Template cards displayed (count >= 0)', action: 'templateCards', enabled: 'TRUE', role: 'admin', category: 'Templates', route: '/admin/payslip-templates' },

  // ════════════════════════════════════════════════
  // HR TESTS (PAY-025 to PAY-030)
  // ════════════════════════════════════════════════
  { testId: 'PAY-025', description: 'HR: Payroll management page loads', action: 'pageLoad', enabled: 'TRUE', role: 'hr', category: 'Page Load', route: '/payroll-management', expectedElement: 'managementPage' },
  { testId: 'PAY-026', description: 'HR: Tab navigation works', action: 'tabSwitch', enabled: 'TRUE', role: 'hr', category: 'Navigation', route: '/payroll-management', tabIndex: '1' },
  { testId: 'PAY-027', description: 'HR: Overview stats visible', action: 'overviewStats', enabled: 'TRUE', role: 'hr', category: 'Dashboard', route: '/payroll-management', expectedElement: 'overviewStats' },
  { testId: 'PAY-028', description: 'HR: Search payslips', action: 'search', enabled: 'TRUE', role: 'hr', category: 'Search & Filter', route: '/payroll-management', searchTerm: 'test' },
  { testId: 'PAY-029', description: 'HR: Export payslips triggers download', action: 'export', enabled: 'TRUE', role: 'hr', category: 'Export', route: '/payroll-management', expectedElement: 'exportBtn' },
  { testId: 'PAY-030', description: 'HR: Refresh payslips reloads data', action: 'refresh', enabled: 'TRUE', role: 'hr', category: 'Page Actions', route: '/payroll-management', expectedElement: 'refreshBtn' },

  // ════════════════════════════════════════════════
  // EMPLOYEE TESTS (PAY-031 to PAY-039)
  // ════════════════════════════════════════════════
  { testId: 'PAY-031', description: 'Employee: My Payslips page loads', action: 'myPayslipsLoad', enabled: 'TRUE', role: 'employee', category: 'Page Load', route: '/employee-payslips', expectedElement: 'employeePage' },
  { testId: 'PAY-032', description: 'Employee: Summary cards visible (net pay, YTD, deductions)', action: 'summaryCards', enabled: 'TRUE', role: 'employee', category: 'Dashboard', route: '/employee-payslips' },
  { testId: 'PAY-033', description: 'Employee: Payslip table columns present', action: 'tableColumns', enabled: 'TRUE', role: 'employee', category: 'Data Display', route: '/employee-payslips' },
  { testId: 'PAY-034', description: 'Employee: Year filter dropdown visible', action: 'yearFilter', enabled: 'TRUE', role: 'employee', category: 'Search & Filter', route: '/employee-payslips', expectedElement: 'yearFilter' },
  { testId: 'PAY-035', description: 'Employee: Payslip row count >= 0', action: 'payslipRowCount', enabled: 'TRUE', role: 'employee', category: 'Data Display', route: '/employee-payslips' },
  { testId: 'PAY-036', description: 'Employee: View payslip opens detail dialog', action: 'viewPayslipDialog', enabled: 'TRUE', role: 'employee', category: 'View Details', route: '/employee-payslips', prerequisite: 'PAY-035' },
  { testId: 'PAY-037', description: 'Employee: Download payslip PDF triggers download', action: 'downloadPayslip', enabled: 'TRUE', role: 'employee', category: 'Export', route: '/employee-payslips', prerequisite: 'PAY-035' },
  { testId: 'PAY-038', description: 'Employee: Back button navigates away from payslips', action: 'backButton', enabled: 'TRUE', role: 'employee', category: 'Navigation', route: '/employee-payslips', expectedElement: 'backBtn' },
  { testId: 'PAY-039', description: 'Employee: RBAC denied on admin payroll page', action: 'rbacDenied', enabled: 'TRUE', role: 'employee', category: 'RBAC', route: '/payroll-management', expectSuccess: 'FALSE' },

  // ════════════════════════════════════════════════
  // MANAGER TEST (PAY-040)
  // ════════════════════════════════════════════════
  { testId: 'PAY-040', description: 'Manager: RBAC denied on admin payroll page', action: 'rbacDenied', enabled: 'TRUE', role: 'manager', category: 'RBAC', route: '/payroll-management', expectSuccess: 'FALSE' },
];

// Replace or create the Payroll sheet
const ws = XLSX.utils.json_to_sheet(payrollTests);
ws['!cols'] = [
  { wch: 10 },  // testId
  { wch: 60 },  // description
  { wch: 22 },  // action
  { wch: 8 },   // enabled
  { wch: 10 },  // role
  { wch: 20 },  // category
  { wch: 28 },  // route
  { wch: 20 },  // expectedElement
  { wch: 12 },  // expectedValue
  { wch: 8 },   // tabIndex
  { wch: 20 },  // tabName
  { wch: 12 },  // searchTerm
  { wch: 8 },   // month
  { wch: 8 },   // year
  { wch: 12 },  // expectSuccess
  { wch: 18 },  // prerequisite
];

if (wb.SheetNames.includes('Payroll')) {
  wb.Sheets['Payroll'] = ws;
  console.log('✅ Replaced existing Payroll sheet');
} else {
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  console.log('✅ Created new Payroll sheet');
}

XLSX.writeFile(wb, WORKBOOK_PATH);
console.log(`   ${payrollTests.length} test cases (PAY-001 to PAY-040)`);
console.log(`   Roles: admin (24), hr (6), employee (9), manager (1)`);
console.log(`   Categories: Page Load, Navigation, Dashboard, Search & Filter,`);
console.log(`               Payslip Generation, Payments, Reports, Bulk Actions,`);
console.log(`               Export, Templates, Data Display, View Details, RBAC`);
console.log(`\nSheets: ${wb.SheetNames.join(', ')}`);
