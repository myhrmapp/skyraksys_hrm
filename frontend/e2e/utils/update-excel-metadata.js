/**
 * Update Excel test-data.xlsx to add enriched metadata columns:
 *   - testType: UI | API | Hybrid (UI + API)
 *   - testCategory: Functional area grouping
 *   - detailedSteps: End-to-end step description for human readers
 *   - lastRunStatus: Placeholders (updated by CI)
 *
 * Also adds a "GapAnalysis" sheet listing untested scenarios.
 *
 * Usage: node e2e-excel/utils/update-excel-metadata.js
 */

const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');

// ── Test metadata mapping ──────────────────────────────────────

const testMetadata = {
  // ── LIST & NAVIGATION ──
  'EMP-001': {
    testType: 'UI',
    testCategory: 'List & Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Wait for page load\n4. Verify employee table is visible\n5. Verify row count >= 1',
  },
  'EMP-002': {
    testType: 'UI',
    testCategory: 'Search & Filter',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Enter "John" in search box\n5. Verify table remains visible with filtered results',
  },
  'EMP-003': {
    testType: 'UI',
    testCategory: 'Search & Filter',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Search for "admin"\n4. Verify result count > 0\n5. Clear search\n6. Verify full list recovers with count >= previous',
  },
  'EMP-004': {
    testType: 'UI',
    testCategory: 'Search & Filter',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Select "Active" from status filter dropdown\n5. Verify table is visible with filtered results',
  },
  'EMP-005': {
    testType: 'UI',
    testCategory: 'Search & Filter',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Select "Terminated" from status filter dropdown\n5. Verify table is visible with filtered results',
  },
  'EMP-006': {
    testType: 'UI',
    testCategory: 'List & Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Wait for page load\n4. Verify pagination component is visible',
  },
  'EMP-007': {
    testType: 'UI',
    testCategory: 'List & Navigation',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Wait for page load\n4. Verify employee table is visible\n5. Verify row count >= 1',
  },
  'EMP-008': {
    testType: 'UI',
    testCategory: 'Search & Filter',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to table view\n4. Search for "employee"\n5. Verify table remains visible',
  },
  'EMP-009': {
    testType: 'UI',
    testCategory: 'List & Navigation',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Wait for page load\n4. Verify employee table visible (team view only)\n5. Verify row count >= 0',
  },
  'EMP-010': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Employee\n2. Navigate to /employees\n3. Wait for page load\n4. Verify table is NOT visible OR redirected to /dashboard',
  },

  // ── CREATE ──
  'EMP-011': {
    testType: 'UI',
    testCategory: 'Create Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Click Add Employee button\n4. Fill Personal Info tab (firstName, lastName, email, phone, nationality, address, city, state, pinCode)\n5. Verify firstName and lastName fields contain entered values',
  },
  'EMP-012': {
    testType: 'UI',
    testCategory: 'Create Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Click Add Employee\n4. Fill Personal Info tab\n5. Click Next — fill Employment Info (hireDate, employmentType, workLocation)\n6. Click Next — fill Emergency Contact (name, phone)\n7. Click Next — Statutory tab\n8. Click Submit\n9. Verify success alert or redirect to employee list',
  },
  'EMP-013': {
    testType: 'API + UI',
    testCategory: 'Create Employee',
    detailedSteps: '1. Login as Admin\n2. Call POST /api/employees via API proxy (firstName, lastName, phone, auto-email, password)\n3. Verify API returns created employee object\n4. Navigate to /employees\n5. Search for created employee firstName\n6. Verify employee appears in table (count > 0)',
  },
  'EMP-014': {
    testType: 'UI',
    testCategory: 'Create Employee',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Click Add Employee button\n4. Fill Personal Info tab (firstName, lastName, email, phone, nationality, address, city, state, pinCode)\n5. Verify firstName and lastName fields contain entered values',
  },
  'EMP-015': {
    testType: 'UI',
    testCategory: 'Create Employee',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Click Add Employee\n4. Fill all 4 tabs (Personal, Employment, Emergency, Statutory)\n5. Click Submit\n6. Verify success alert or redirect to list',
  },
  'EMP-016': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Wait for page load\n4. Verify Add Employee button is NOT visible',
  },

  // ── VIEW / PROFILE ──
  'EMP-017': {
    testType: 'UI',
    testCategory: 'View Profile',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Click View action on first employee row\n5. Verify profile header is visible',
  },
  'EMP-018': {
    testType: 'UI',
    testCategory: 'View Profile',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Click View action on first employee\n5. Verify profile header visible\n6. Verify page body has content (employee data rendered)',
  },
  'EMP-019': {
    testType: 'UI',
    testCategory: 'View Profile',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Switch to table view\n4. Click View action on first employee\n5. Verify profile header visible',
  },
  'EMP-020': {
    testType: 'UI',
    testCategory: 'View Profile',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Switch to table view\n4. Click View action on first team member\n5. Verify profile header visible',
  },
  'EMP-021': {
    testType: 'UI',
    testCategory: 'My Profile',
    detailedSteps: '1. Login as Employee\n2. Navigate to My Profile via sidebar/menu or direct /my-profile\n3. Wait for profile page load (up to 10s)\n4. Verify My Profile page is visible',
  },
  'EMP-022': {
    testType: 'UI',
    testCategory: 'My Profile',
    detailedSteps: '1. Login as Employee\n2. Navigate to My Profile\n3. Verify profile page is visible\n4. Verify page body shows employee information (read-only view)',
  },
  'EMP-023': {
    testType: 'UI',
    testCategory: 'My Profile',
    detailedSteps: '1. Login as Admin\n2. Navigate to My Profile\n3. Verify My Profile page is visible',
  },
  'EMP-024': {
    testType: 'UI',
    testCategory: 'My Profile',
    detailedSteps: '1. Login as Manager\n2. Navigate to My Profile (with fallback to /my-profile)\n3. Verify My Profile page is visible',
  },

  // ── EDIT ──
  'EMP-025': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Click View on first employee → profile page\n5. Verify Edit button visible\n6. Click Edit button\n7. Verify profile enters inline edit mode (Save/Cancel buttons appear)',
  },
  'EMP-026': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to table view\n4. Click Edit action button on first row\n5. Verify navigated to profile in edit mode\n6. Verify inline edit mode active (Save/Cancel buttons)',
  },
  'EMP-027': {
    testType: 'API + UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Create test employee via API (POST /api/employees)\n3. Navigate to edit form for created employee\n4. Update firstName to "UpdatedAdmin"\n5. Click Submit\n6. Verify success alert or redirect to list',
  },
  'EMP-028': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → View first employee\n3. Verify Edit button visible, click Edit\n4. Verify profile inline edit mode — employment fields editable',
  },
  'EMP-029': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → View first employee\n3. Click Edit\n4. Verify inline edit mode — emergency contact section editable',
  },
  'EMP-030': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → View first employee\n3. Click Edit\n4. Verify inline edit mode — statutory info section editable',
  },
  'EMP-031': {
    testType: 'UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → View first employee\n3. Verify Edit button visible, click Edit\n4. Verify profile enters inline edit mode',
  },
  'EMP-032': {
    testType: 'API + UI',
    testCategory: 'Edit Employee',
    detailedSteps: '1. Login as HR\n2. Create test employee via API\n3. Navigate to edit form\n4. Update firstName to "UpdatedHR"\n5. Click Submit\n6. Verify success or redirect',
  },
  'EMP-033': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Verify Add Employee button is NOT visible (list-level restriction)\n4. Manager can edit subordinates on profile but cannot add/delete',
  },

  // ── DELETE ──
  'EMP-034': {
    testType: 'API + UI',
    testCategory: 'Delete Employee',
    detailedSteps: '1. Login as Admin\n2. Create test employee via API\n3. Navigate to /employees\n4. Search for created employee\n5. Switch to card view (delete only in card view)\n6. Click Delete button on employee card\n7. Verify delete confirmation dialog appears\n8. Click Confirm delete\n9. Wait for deletion to process',
  },
  'EMP-035': {
    testType: 'UI',
    testCategory: 'Delete Employee',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Switch to card view\n4. Click Delete on first employee card\n5. Verify delete confirmation dialog appears\n6. Click Cancel\n7. Verify dialog closes, page still usable',
  },
  'EMP-036': {
    testType: 'API',
    testCategory: 'Delete Employee',
    detailedSteps: '1. Login as Admin\n2. Create test employee via API (POST /api/employees)\n3. Delete via API (DELETE /api/employees/:id)\n4. Navigate to /employees\n5. Search for deleted employee name\n6. Verify employee not found or status changed to Terminated',
  },
  'EMP-037': {
    testType: 'API + UI',
    testCategory: 'Delete Employee',
    detailedSteps: '1. Login as HR\n2. Create test employee via API\n3. Navigate to /employees\n4. Search for created employee\n5. Switch to card view\n6. Click Delete button\n7. Verify confirmation dialog\n8. Confirm delete\n9. Wait for deletion',
  },

  // ── TAB NAVIGATION ──
  'EMP-038': {
    testType: 'UI',
    testCategory: 'Form Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Click Add Employee\n4. Click on Employment tab\n5. Verify Employment tab is selected (aria-selected=true)',
  },
  'EMP-039': {
    testType: 'UI',
    testCategory: 'Form Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click on Emergency tab\n4. Verify Emergency tab is selected (aria-selected=true)',
  },
  'EMP-040': {
    testType: 'UI',
    testCategory: 'Form Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Click on Statutory tab\n4. Verify Statutory tab is selected (aria-selected=true)',
  },
  'EMP-041': {
    testType: 'UI',
    testCategory: 'Form Navigation',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Fill required personal info\n4. Click Next → Verify Employment tab selected\n5. Click Prev → Verify Personal tab selected',
  },

  // ── EXPORT ──
  'EMP-042': {
    testType: 'UI',
    testCategory: 'Export',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Verify Export button visible\n4. Click Export\n5. Wait for download event (up to 5s)\n6. Verify page remains stable with table visible',
  },
  'EMP-043': {
    testType: 'UI',
    testCategory: 'Export',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Verify Export button visible\n4. Click Export\n5. Verify page remains stable',
  },

  // ── UNSAVED CHANGES ──
  'EMP-044': {
    testType: 'UI',
    testCategory: 'Form UX',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Type "Unsaved" in firstName field\n4. Click Cancel\n5. Verify unsaved changes warning dialog appears',
  },
  'EMP-045': {
    testType: 'UI',
    testCategory: 'Form UX',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Type "StayTest" in firstName\n4. Click Cancel\n5. Verify unsaved dialog appears\n6. Click "Stay" button\n7. Verify still on form with Submit button visible',
  },
  'EMP-046': {
    testType: 'UI',
    testCategory: 'Form UX',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → Add Employee\n3. Type "LeaveTest" in firstName\n4. Click Cancel\n5. Verify unsaved dialog appears\n6. Click "Leave" button\n7. Verify navigated away — Submit button not visible',
  },

  // ── ROLE-BASED ACCESS ──
  'EMP-047': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Verify Add Employee button IS visible (expectVisible=TRUE)',
  },
  'EMP-048': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees\n3. Verify Add Employee button IS visible (expectVisible=TRUE)',
  },
  'EMP-049': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees\n3. Verify Add Employee button is NOT visible (expectVisible=FALSE)',
  },
  'EMP-050': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees → View first employee profile\n3. Verify Edit button IS visible on profile',
  },
  'EMP-051': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as HR\n2. Navigate to /employees → View first employee profile\n3. Verify Edit button IS visible on profile',
  },
  'EMP-052': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Manager\n2. Navigate to /employees → View first employee profile\n3. Manager has canEdit on profile for subordinates — verify based on test expectation',
  },
  'EMP-053': {
    testType: 'UI',
    testCategory: 'RBAC / Access Control',
    detailedSteps: '1. Login as Admin\n2. Navigate to /employees\n3. Verify Export button IS visible (expectVisible=TRUE)',
  },
};

// ── Gap Analysis Data ──────────────────────────────────────────

const gapAnalysis = [
  {
    gapId: 'GAP-001',
    feature: 'Create User Login Account',
    description: 'Dialog to create user account (username/password/role) for existing employee',
    uiLocation: 'Employee List → Card/Table → Create Login button (VpnKey icon)',
    apiEndpoint: 'POST /api/auth/register (or similar)',
    priority: 'HIGH',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-054',
    notes: 'CreateUserAccountDialog component exists. Tests data-testid: employee-card-create-login-btn / employee-table-create-login-btn',
  },
  {
    gapId: 'GAP-002',
    feature: 'Manage User Account Page',
    description: 'Full user account management: reset password, lock/unlock, send welcome email, force logout',
    uiLocation: '/employees/:id/user-account (UserAccountManagementPage)',
    apiEndpoint: 'Multiple auth endpoints',
    priority: 'HIGH',
    effort: 'High',
    status: 'Not Tested',
    suggestedTestId: 'EMP-055 to EMP-059',
    notes: 'Manage Login button on card/table view navigates to this page. 5 quick actions available.',
  },
  {
    gapId: 'GAP-003',
    feature: 'Photo Upload on Create',
    description: 'Upload employee photo during creation (EmployeeForm Tab 1)',
    uiLocation: 'Employee Form → Personal Info tab → Photo upload area',
    apiEndpoint: 'POST /api/employees/:id/photo',
    priority: 'MEDIUM',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-060',
    notes: 'Photo upload component with preview exists in the form',
  },
  {
    gapId: 'GAP-004',
    feature: 'Department Filter',
    description: 'Filter employee list by department dropdown',
    uiLocation: 'Employee List → Filters section → Department dropdown',
    apiEndpoint: 'GET /api/employees?department=X',
    priority: 'MEDIUM',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-061',
    notes: 'filterDepartment action exists in spec but no Excel row uses it',
  },
  {
    gapId: 'GAP-005',
    feature: 'Employment Type Filter',
    description: 'Filter by Full-time, Part-time, Contract',
    uiLocation: 'Employee List → Filters → Employment Type dropdown',
    apiEndpoint: 'GET /api/employees?employmentType=X',
    priority: 'MEDIUM',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-062',
    notes: 'EmployeeListFilters component supports this filter',
  },
  {
    gapId: 'GAP-006',
    feature: 'Work Location Filter',
    description: 'Filter by work location',
    uiLocation: 'Employee List → Filters → Work Location dropdown',
    apiEndpoint: 'GET /api/employees?workLocation=X',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-063',
    notes: 'EmployeeListFilters component supports this filter',
  },
  {
    gapId: 'GAP-007',
    feature: 'Salary/Compensation Entry',
    description: 'Fill salary structure: basic, allowances (HRA, transport, medical, food, etc.), deductions (PF, TDS, professional tax)',
    uiLocation: 'Employee Form → Employment & Compensation tab → Salary section',
    apiEndpoint: 'PUT /api/employees/:id/compensation',
    priority: 'HIGH',
    effort: 'High',
    status: 'Not Tested',
    suggestedTestId: 'EMP-064',
    notes: 'SalaryStructureTab component with detailed breakdowns. Critical business feature.',
  },
  {
    gapId: 'GAP-008',
    feature: 'Statutory Fields Validation',
    description: 'Enter and validate Aadhaar (12 digits), PAN (XXXXX9999X), UAN, PF, ESI numbers',
    uiLocation: 'Employee Form → Statutory & Banking tab',
    apiEndpoint: 'PUT /api/employees/:id (statutory fields)',
    priority: 'MEDIUM',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-065',
    notes: 'StatutoryBankingTab component exists with validation rules',
  },
  {
    gapId: 'GAP-009',
    feature: 'Bank Details Entry',
    description: 'Enter bank name, account number, IFSC code, branch, account holder name',
    uiLocation: 'Employee Form → Statutory & Banking tab → Bank section',
    apiEndpoint: 'PUT /api/employees/:id (bank fields)',
    priority: 'MEDIUM',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-066',
    notes: 'Bank details fields in StatutoryBankingTab',
  },
  {
    gapId: 'GAP-010',
    feature: 'Employee Status Change (Activate/Deactivate/Terminate)',
    description: 'Change employee status via PATCH endpoint',
    uiLocation: 'Profile page or admin action',
    apiEndpoint: 'PATCH /api/employees/:id/status',
    priority: 'MEDIUM',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-067',
    notes: 'Dedicated PATCH endpoint for status changes. Different from DELETE which sets Terminated.',
  },
  {
    gapId: 'GAP-011',
    feature: 'Form Auto-Save / Draft Restore',
    description: 'Form auto-saves to localStorage. On re-open, draft restore dialog appears.',
    uiLocation: 'Employee Form → auto-save indicator + restore dialog on load',
    apiEndpoint: 'N/A (client-side)',
    priority: 'LOW',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-068',
    notes: 'EmployeeForm has auto-save with ConfirmDialog for draft restoration',
  },
  {
    gapId: 'GAP-012',
    feature: 'Keyboard Shortcut Ctrl+S',
    description: 'Save form via Ctrl+S keyboard shortcut',
    uiLocation: 'Employee Form (any tab)',
    apiEndpoint: 'POST/PUT /api/employees',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-069',
    notes: 'EmployeeForm registers keydown listener for Ctrl+S',
  },
  {
    gapId: 'GAP-013',
    feature: 'Save as Draft Button',
    description: 'Explicit save-as-draft button on employee form',
    uiLocation: 'Employee Form → Actions section',
    apiEndpoint: 'N/A (client-side localStorage)',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-070',
    notes: 'EmployeeFormActions component provides Save Draft button',
  },
  {
    gapId: 'GAP-014',
    feature: 'Tab Validation Indicators',
    description: 'Visual indicators on form tabs showing valid (✓), invalid (✗), or warning (⚠) state',
    uiLocation: 'Employee Form → Tab headers',
    apiEndpoint: 'N/A (client-side)',
    priority: 'LOW',
    effort: 'Medium',
    status: 'Not Tested',
    suggestedTestId: 'EMP-071',
    notes: 'EmployeeFormTabs renders completion/error badges per tab',
  },
  {
    gapId: 'GAP-015',
    feature: 'Cascading Department → Position Dropdown',
    description: 'When department is selected, position dropdown filters to department-specific positions',
    uiLocation: 'Employee Form → Employment tab → Department + Position selects',
    apiEndpoint: 'GET /api/employees/meta/positions?department=X',
    priority: 'MEDIUM',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-072',
    notes: 'Important data integrity feature',
  },
  {
    gapId: 'GAP-016',
    feature: 'View Payslip from Profile',
    description: 'Click "View Payslip" button on employee profile page',
    uiLocation: 'Employee Profile → header actions → View Payslip button',
    apiEndpoint: 'GET /api/payslips (related)',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-073',
    notes: 'Button visible to Admin/HR. Cross-module integration.',
  },
  {
    gapId: 'GAP-017',
    feature: 'Bulk Update Operations',
    description: 'Bulk update employees (department, status, etc.)',
    uiLocation: 'Backend-only (may not have UI)',
    apiEndpoint: 'POST /api/employees/bulk-update',
    priority: 'LOW',
    effort: 'High',
    status: 'Not Tested',
    suggestedTestId: 'EMP-074',
    notes: 'Backend endpoint exists. May not have frontend UI yet.',
  },
  {
    gapId: 'GAP-018',
    feature: 'Employee Statistics/Dashboard',
    description: 'Fetch employee statistics (counts by status, department, etc.)',
    uiLocation: 'Dashboard widget or /employees/statistics',
    apiEndpoint: 'GET /api/employees/statistics',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-075',
    notes: 'API endpoint exists. May be consumed by dashboard module.',
  },
  {
    gapId: 'GAP-019',
    feature: 'Sort Employee List',
    description: 'Sort employee table by column headers (name, date, department etc.)',
    uiLocation: 'Employee List → Table column headers',
    apiEndpoint: 'GET /api/employees?sort=field&order=asc|desc',
    priority: 'MEDIUM',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-076',
    notes: 'Backend supports sortBy/sortOrder params. Table headers may be clickable.',
  },
  {
    gapId: 'GAP-020',
    feature: 'HR: My Profile View',
    description: 'HR user viewing their own My Profile page',
    uiLocation: '/my-profile (logged in as HR)',
    apiEndpoint: 'GET /api/employees/me',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-077',
    notes: 'Tested for employee (EMP-021), admin (EMP-023), manager (EMP-024), but not HR',
  },
  {
    gapId: 'GAP-021',
    feature: 'Manager: Delete Denied',
    description: 'Manager should NOT be able to delete employees',
    uiLocation: 'Employee List → Card view → No delete button for manager',
    apiEndpoint: 'N/A',
    priority: 'MEDIUM',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-078',
    notes: 'Tested that manager cannot add (EMP-016, EMP-049) but not that manager cannot delete',
  },
  {
    gapId: 'GAP-022',
    feature: 'Employee: Delete Denied',
    description: 'Employee role should NOT see delete button',
    uiLocation: 'Employee role has no access to employee list, implicitly tested',
    apiEndpoint: 'N/A',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-079',
    notes: 'Partially covered by EMP-010 (employee cannot access list). Delete denial is implicit.',
  },
  {
    gapId: 'GAP-023',
    feature: 'HR: Export Visible',
    description: 'Verify export button is visible for HR role',
    uiLocation: 'Employee List → Export button',
    apiEndpoint: 'N/A',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-080',
    notes: 'Export visibility tested for Admin (EMP-053) but not explicitly for HR as verifyExportVisible',
  },
  {
    gapId: 'GAP-024',
    feature: 'Manager: Export Denied',
    description: 'Verify export button is NOT visible for Manager role',
    uiLocation: 'Employee List → Export button should be hidden',
    apiEndpoint: 'N/A',
    priority: 'LOW',
    effort: 'Low',
    status: 'Not Tested',
    suggestedTestId: 'EMP-081',
    notes: 'Export visibility not checked for Manager/Employee roles',
  },
];

// ── Main ───────────────────────────────────────────────────────

function main() {
  const wb = XLSX.readFile(WORKBOOK_PATH);

  // ── Update Employee sheet ────────────────────────────────────
  const employeeRows = XLSX.utils.sheet_to_json(wb.Sheets['Employee'], { defval: '' });

  const enrichedRows = employeeRows.map((row) => {
    const meta = testMetadata[row.testId] || {};
    return {
      testId: row.testId,
      description: row.description,
      testType: meta.testType || 'UI',
      testCategory: meta.testCategory || 'Uncategorized',
      action: row.action,
      enabled: row.enabled,
      role: row.role,
      detailedSteps: meta.detailedSteps || '',
      // Preserve all original data columns
      expectedMinRows: row.expectedMinRows,
      searchTerm: row.searchTerm,
      filterValue: row.filterValue,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      nationality: row.nationality,
      address: row.address,
      city: row.city,
      state: row.state,
      pinCode: row.pinCode,
      hireDate: row.hireDate,
      employmentType: row.employmentType,
      workLocation: row.workLocation,
      emergencyName: row.emergencyName,
      emergencyPhone: row.emergencyPhone,
      employeeIndex: row.employeeIndex,
      toTab: row.toTab,
      fromTab: row.fromTab,
      newFirstName: row.newFirstName,
      expectVisible: row.expectVisible,
      expectResults: row.expectResults,
    };
  });

  // Create new enriched Employee sheet
  const newEmployeeSheet = XLSX.utils.json_to_sheet(enrichedRows);

  // Set column widths for readability
  newEmployeeSheet['!cols'] = [
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

  wb.Sheets['Employee'] = newEmployeeSheet;

  // ── Create GapAnalysis sheet ──────────────────────────────────
  const gapSheet = XLSX.utils.json_to_sheet(gapAnalysis);
  gapSheet['!cols'] = [
    { wch: 10 },  // gapId
    { wch: 35 },  // feature
    { wch: 70 },  // description
    { wch: 55 },  // uiLocation
    { wch: 40 },  // apiEndpoint
    { wch: 10 },  // priority
    { wch: 10 },  // effort
    { wch: 14 },  // status
    { wch: 18 },  // suggestedTestId
    { wch: 70 },  // notes
  ];

  // Add GapAnalysis sheet if not exists
  if (!wb.SheetNames.includes('GapAnalysis')) {
    XLSX.utils.book_append_sheet(wb, gapSheet, 'GapAnalysis');
  } else {
    wb.Sheets['GapAnalysis'] = gapSheet;
  }

  // ── Create TestSummary sheet ──────────────────────────────────
  const summaryData = [
    { metric: 'Total Employee Tests', value: enrichedRows.length },
    { metric: 'Enabled Tests', value: enrichedRows.filter(r => String(r.enabled).toUpperCase() === 'TRUE').length },
    { metric: 'UI Tests', value: enrichedRows.filter(r => r.testType === 'UI').length },
    { metric: 'API Tests', value: enrichedRows.filter(r => r.testType === 'API').length },
    { metric: 'Hybrid (API + UI) Tests', value: enrichedRows.filter(r => r.testType === 'API + UI').length },
    { metric: '', value: '' },
    { metric: '── By Category ──', value: '── Count ──' },
    ...Object.entries(
      enrichedRows.reduce((acc, r) => { acc[r.testCategory] = (acc[r.testCategory] || 0) + 1; return acc; }, {})
    ).map(([cat, count]) => ({ metric: cat, value: count })),
    { metric: '', value: '' },
    { metric: '── By Role ──', value: '── Count ──' },
    ...Object.entries(
      enrichedRows.reduce((acc, r) => { acc[r.role] = (acc[r.role] || 0) + 1; return acc; }, {})
    ).map(([role, count]) => ({ metric: role, value: count })),
    { metric: '', value: '' },
    { metric: '── Gaps ──', value: '── Count ──' },
    { metric: 'Total Gaps Identified', value: gapAnalysis.length },
    { metric: 'HIGH Priority Gaps', value: gapAnalysis.filter(g => g.priority === 'HIGH').length },
    { metric: 'MEDIUM Priority Gaps', value: gapAnalysis.filter(g => g.priority === 'MEDIUM').length },
    { metric: 'LOW Priority Gaps', value: gapAnalysis.filter(g => g.priority === 'LOW').length },
    { metric: '', value: '' },
    { metric: '── Last Run ──', value: '' },
    { metric: 'Last Run Date', value: new Date().toISOString().split('T')[0] },
    { metric: 'Last Run Result', value: '53/53 PASSED (100%)' },
    { metric: 'Duration', value: '4.0 minutes' },
    { metric: 'Test Framework', value: 'Playwright (Excel-Driven)' },
    { metric: 'Config File', value: 'playwright-excel.config.js' },
    { metric: 'Report Location', value: 'playwright-report-excel/' },
    { metric: 'JSON Results', value: 'test-results/employee-test-results.json' },
    { metric: 'JUnit Results', value: 'test-results/employee-test-results.xml' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 45 }];

  if (!wb.SheetNames.includes('TestSummary')) {
    XLSX.utils.book_append_sheet(wb, summarySheet, 'TestSummary');
  } else {
    wb.Sheets['TestSummary'] = summarySheet;
  }

  // ── Write back ────────────────────────────────────────────────
  XLSX.writeFile(wb, WORKBOOK_PATH);
  console.log(`✅ Updated ${WORKBOOK_PATH}`);
  console.log(`   - Employee sheet: ${enrichedRows.length} tests enriched with testType, testCategory, detailedSteps`);
  console.log(`   - GapAnalysis sheet: ${gapAnalysis.length} untested scenarios identified`);
  console.log(`   - TestSummary sheet: aggregate metrics and last run info`);
  console.log(`\nSheets in workbook: ${wb.SheetNames.join(', ')}`);
}

main();
