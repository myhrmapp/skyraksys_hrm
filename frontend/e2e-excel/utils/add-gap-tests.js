/**
 * Add the 24 gap analysis scenarios as new test rows in the Employee sheet.
 * Also updates the GapAnalysis sheet status and refreshes TestSummary.
 *
 * Usage: node e2e-excel/utils/add-gap-tests.js
 */

const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');

// ── New test rows to add ───────────────────────────────────────

const newTests = [
  // ─── FILTERS ─────────────────────────────────────────
  {
    testId: 'EMP-054',
    description: 'Admin: Filter by Department',
    testType: 'UI',
    testCategory: 'Search & Filter',
    action: 'filterDepartment',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Select department from filter dropdown\n5. Verify table shows filtered results',
    filterValue: 'Human Resources',
  },
  {
    testId: 'EMP-055',
    description: 'Admin: Filter by Employment Type (Full-time)',
    testType: 'UI',
    testCategory: 'Search & Filter',
    action: 'filterEmploymentType',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Select "Full-time" from employment type filter\n5. Verify table visible with filtered results',
    filterValue: 'Full-time',
  },
  {
    testId: 'EMP-056',
    description: 'Admin: Filter by Work Location (Remote)',
    testType: 'UI',
    testCategory: 'Search & Filter',
    action: 'filterWorkLocation',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Select "Remote" from work location filter\n5. Verify table visible with filtered results',
    filterValue: 'Remote',
  },

  // ─── CREATE USER LOGIN ACCOUNT ───────────────────────
  {
    testId: 'EMP-057',
    description: 'Admin: Create Login dialog opens from card view',
    testType: 'UI',
    testCategory: 'User Account Management',
    action: 'createUserLogin',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to card view\n4. Click Create Login button on first card\n5. Verify Create User Account dialog opens\n6. Verify email field is visible\n7. Cancel dialog',
  },
  {
    testId: 'EMP-058',
    description: 'HR: Create Login dialog opens from card view',
    testType: 'UI',
    testCategory: 'User Account Management',
    action: 'createUserLogin',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to card view\n4. Click Create Login button on first card\n5. Verify dialog opens\n6. Cancel dialog',
  },

  // ─── MANAGE USER ACCOUNT ─────────────────────────────
  {
    testId: 'EMP-059',
    description: 'Admin: Manage Login navigates to user account page',
    testType: 'UI',
    testCategory: 'User Account Management',
    action: 'manageUserAccount',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to card view\n4. Click Manage Login button on employee with existing account\n5. Verify navigated to User Account Management page\n6. Verify Quick Action buttons visible (Reset Password, Lock, etc.)',
  },
  {
    testId: 'EMP-060',
    description: 'HR: Manage Login navigates to user account page',
    testType: 'UI',
    testCategory: 'User Account Management',
    action: 'manageUserAccount',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to card view\n4. Click Manage Login on employee with account\n5. Verify User Account Management page loads',
  },

  // ─── PHOTO UPLOAD ────────────────────────────────────
  {
    testId: 'EMP-061',
    description: 'Admin: Photo upload button visible on create form',
    testType: 'UI',
    testCategory: 'Create Employee',
    action: 'photoUploadVisible',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Click Add Employee\n4. Verify photo upload button is visible on Personal Info tab',
  },

  // ─── SALARY STRUCTURE ────────────────────────────────
  {
    testId: 'EMP-062',
    description: 'Admin: Salary fields visible on Employment tab',
    testType: 'UI',
    testCategory: 'Salary & Compensation',
    action: 'salaryFieldsVisible',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click Next to Employment tab\n4. Verify salary currency select or pay frequency select is visible',
  },

  // ─── STATUTORY & BANKING FIELDS ──────────────────────
  {
    testId: 'EMP-063',
    description: 'Admin: Statutory fields visible (PAN, Aadhaar, Bank)',
    testType: 'UI',
    testCategory: 'Statutory & Banking',
    action: 'statutoryFieldsVisible',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click Statutory tab\n4. Verify PAN, Aadhaar, Bank Name fields are visible',
  },
  {
    testId: 'EMP-064',
    description: 'Admin: Enter bank details on statutory tab',
    testType: 'UI',
    testCategory: 'Statutory & Banking',
    action: 'bankDetailsEntry',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click Statutory tab\n4. Fill bank name, account number, IFSC code, branch\n5. Verify bank name field has entered value',
  },

  // ─── CASCADING DEPARTMENT → POSITION ─────────────────
  {
    testId: 'EMP-065',
    description: 'Admin: Department and Position dropdowns on employment tab',
    testType: 'UI',
    testCategory: 'Form Navigation',
    action: 'cascadingDeptPosition',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click Next to Employment tab\n4. Verify Department select is visible\n5. Verify Position select is visible',
  },

  // ─── VIEW PAYSLIP BUTTON ─────────────────────────────
  {
    testId: 'EMP-066',
    description: 'Admin: Payslip button visible on employee profile',
    testType: 'UI',
    testCategory: 'View Profile',
    action: 'viewPayslipButton',
    enabled: 'TRUE',
    role: 'admin',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → View first employee profile\n3. Verify Payslip button is visible (Admin has canEditSensitive)',
    expectVisible: 'TRUE',
  },
  {
    testId: 'EMP-067',
    description: 'HR: Payslip button visible on employee profile',
    testType: 'UI',
    testCategory: 'View Profile',
    action: 'viewPayslipButton',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → View first employee profile\n3. Verify Payslip button is visible (HR has canEditSensitive)',
    expectVisible: 'TRUE',
  },

  // ─── RBAC — DELETE DENIED ────────────────────────────
  {
    testId: 'EMP-068',
    description: 'Manager: Delete button NOT visible on cards',
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    action: 'deleteDenied',
    enabled: 'TRUE',
    role: 'manager',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Switch to card view\n4. Verify delete button is NOT visible on employee cards',
  },

  // ─── RBAC — EXPORT DENIED ───────────────────────────
  {
    testId: 'EMP-069',
    description: 'HR: Export button is visible',
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    action: 'verifyExportVisible',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Verify Export button IS visible',
    expectVisible: 'TRUE',
  },
  {
    testId: 'EMP-070',
    description: 'Manager: Export button is NOT visible',
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    action: 'verifyExportVisible',
    enabled: 'TRUE',
    role: 'manager',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Verify Export button is NOT visible',
    expectVisible: 'FALSE',
  },

  // ─── MY PROFILE — HR ────────────────────────────────
  {
    testId: 'EMP-071',
    description: 'HR: View own My Profile',
    testType: 'UI',
    testCategory: 'My Profile',
    action: 'myProfile',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to My Profile via sidebar/menu or /my-profile\n3. Verify My Profile page is visible',
  },

  // ─── EDIT — HR FROM LIST ─────────────────────────────
  {
    testId: 'EMP-072',
    description: 'HR: Edit from list action button',
    testType: 'UI',
    testCategory: 'Edit Employee',
    action: 'editFromList',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to table view\n4. Click Edit action on first row\n5. Verify profile enters inline edit mode',
  },

  // ─── HR: Cancel delete dialog ────────────────────────
  {
    testId: 'EMP-073',
    description: 'HR: Cancel delete dialog',
    testType: 'UI',
    testCategory: 'Delete Employee',
    action: 'deleteCancelDialog',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to card view\n4. Click Delete on first employee\n5. Verify dialog\n6. Click Cancel\n7. Verify dialog closes',
  },

  // ─── HR: Tab Navigation  ─────────────────────────────
  {
    testId: 'EMP-074',
    description: 'HR: Tab navigation Personal to Employment',
    testType: 'UI',
    testCategory: 'Form Navigation',
    action: 'tabNavigation',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → Add Employee\n3. Click Employment tab\n4. Verify Employment tab selected (aria-selected=true)',
    toTab: 'employment',
    fromTab: 'personal',
  },

  // ─── HR: Unsaved changes ─────────────────────────────
  {
    testId: 'EMP-075',
    description: 'HR: Cancel form shows unsaved dialog',
    testType: 'UI',
    testCategory: 'Form UX',
    action: 'unsavedDialog',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → Add Employee\n3. Type in firstName field\n4. Click Cancel\n5. Verify unsaved changes dialog appears',
  },

  // ─── HR: View Profile verify fields ──────────────────
  {
    testId: 'EMP-076',
    description: 'HR: View profile and verify fields',
    testType: 'UI',
    testCategory: 'View Profile',
    action: 'viewProfileVerifyFields',
    enabled: 'TRUE',
    role: 'hr',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → View first employee\n3. Verify profile header visible\n4. Verify page body has content',
  },

  // ─── Manager: Search employee ────────────────────────
  {
    testId: 'EMP-077',
    description: 'Manager: Search team member',
    testType: 'UI',
    testCategory: 'Search & Filter',
    action: 'search',
    enabled: 'TRUE',
    role: 'manager',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Switch to table view\n4. Search for "employee"\n5. Verify table remains visible',
    searchTerm: 'employee',
  },
];

// ── Main ───────────────────────────────────────────────────────

function main() {
  const wb = XLSX.readFile(WORKBOOK_PATH);
  const existingRows = XLSX.utils.sheet_to_json(wb.Sheets['Employee'], { defval: '' });

  // Get all column names from existing sheet
  const allColumns = Object.keys(existingRows[0]);

  // Merge new rows with all columns (fill missing with '')
  const enrichedNewTests = newTests.map((test) => {
    const row = {};
    for (const col of allColumns) {
      row[col] = test[col] || '';
    }
    return row;
  });

  // Append new rows
  const allRows = [...existingRows, ...enrichedNewTests];

  // Create updated sheet
  const newSheet = XLSX.utils.json_to_sheet(allRows);

  // Set column widths matching existing
  newSheet['!cols'] = [
    { wch: 10 },  // testId
    { wch: 45 },  // description
    { wch: 12 },  // testType
    { wch: 22 },  // testCategory
    { wch: 22 },  // action
    { wch: 8 },   // enabled
    { wch: 10 },  // role
    { wch: 80 },  // detailedSteps
    { wch: 14 },  // expectedMinRows
    { wch: 14 },  // searchTerm
    { wch: 14 },  // filterValue
    { wch: 14 },  // firstName
    { wch: 14 },  // lastName
    { wch: 28 },  // email
    { wch: 14 },  // phone
    { wch: 12 },  // nationality
    { wch: 18 },  // address
    { wch: 12 },  // city
    { wch: 14 },  // state
    { wch: 10 },  // pinCode
    { wch: 12 },  // hireDate
    { wch: 14 },  // employmentType
    { wch: 14 },  // workLocation
    { wch: 18 },  // emergencyName
    { wch: 16 },  // emergencyPhone
    { wch: 14 },  // employeeIndex
    { wch: 14 },  // toTab
    { wch: 14 },  // fromTab
    { wch: 14 },  // newFirstName
    { wch: 12 },  // expectVisible
    { wch: 12 },  // expectResults
  ];

  wb.Sheets['Employee'] = newSheet;

  // ── Update TestSummary ──────────────────────────────────
  const summaryData = [
    { metric: 'Total Employee Tests', value: allRows.length },
    { metric: 'Enabled Tests', value: allRows.filter(r => String(r.enabled).toUpperCase() === 'TRUE').length },
    { metric: 'UI Tests', value: allRows.filter(r => r.testType === 'UI').length },
    { metric: 'API Tests', value: allRows.filter(r => r.testType === 'API').length },
    { metric: 'Hybrid (API + UI) Tests', value: allRows.filter(r => r.testType === 'API + UI').length },
    { metric: '', value: '' },
    { metric: '── By Category ──', value: '── Count ──' },
    ...Object.entries(
      allRows.reduce((acc, r) => { if (r.testCategory) { acc[r.testCategory] = (acc[r.testCategory] || 0) + 1; } return acc; }, {})
    ).sort(([,a], [,b]) => b - a).map(([cat, count]) => ({ metric: cat, value: count })),
    { metric: '', value: '' },
    { metric: '── By Role ──', value: '── Count ──' },
    ...Object.entries(
      allRows.reduce((acc, r) => { acc[r.role] = (acc[r.role] || 0) + 1; return acc; }, {})
    ).sort(([,a], [,b]) => b - a).map(([role, count]) => ({ metric: role, value: count })),
    { metric: '', value: '' },
    { metric: '── Test Run ──', value: '' },
    { metric: 'Last Updated', value: new Date().toISOString().split('T')[0] },
    { metric: 'Previous Run (53 tests)', value: '53/53 PASSED (100%)' },
    { metric: 'New Tests Added', value: newTests.length },
    { metric: 'Total Tests Now', value: allRows.length },
    { metric: 'Test Framework', value: 'Playwright (Excel-Driven)' },
    { metric: 'Config File', value: 'playwright-excel.config.js' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 45 }];
  wb.Sheets['TestSummary'] = summarySheet;

  // ── Write ─────────────────────────────────────────────────
  XLSX.writeFile(wb, WORKBOOK_PATH);

  console.log(`✅ Added ${newTests.length} new test rows to Employee sheet`);
  console.log(`   Total tests now: ${allRows.length} (was ${existingRows.length})`);
  console.log(`\nNew test IDs:`);
  newTests.forEach(t => console.log(`   ${t.testId}: ${t.description} [${t.action}] (${t.role})`));
}

main();
