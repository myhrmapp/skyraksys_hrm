# SkyrakSys HRM — Testing & E2E Guide

> **Document Owner**: QA / Test Automation Engineer  
> **Version**: 2.0 | **Last Updated**: 2026-03-27  
> **Audience**: QA engineers, developers writing/maintaining tests

---

## 1. Testing Strategy Overview

```
┌────────────────────────────────────────────────┐
│              Testing Pyramid                    │
│                                                 │
│              ╱  E2E  ╲           ~170 tests     │
│            ╱ Integration ╲       (Playwright)   │
│          ╱   Unit / Component  ╲  ~80+ tests    │
│        ╱      (Jest + RTL)       ╲  (Jest)      │
│      ╱         Service Tests       ╲            │
│    ╱____________(Jest)_______________╲           │
└────────────────────────────────────────────────┘
```

| Layer | Framework | Location | Runner |
|-------|-----------|----------|--------|
| **E2E Integration** | Playwright 1.58 | `frontend/e2e-integration/` | `npx playwright test` |
| **E2E Excel-Driven** | Playwright 1.58 | `frontend/e2e-excel/` | `npx playwright test -c playwright-excel.config.js` |
| **Frontend Unit** | Jest 27 + React Testing Library | `frontend/src/**/__tests__/` | `cd frontend && npm test` |
| **Backend Unit/Integration** | Jest 29 | `backend/tests/` | `cd backend && npm test` |

---

## 2. E2E Integration Tests (`e2e-integration/`)

### 2.1 Architecture

```
frontend/e2e-integration/
├── helpers.js                          # Shared utilities (login, nav, dates, data generators)
├── auth.spec.js                        # Authentication flow
├── employees.spec.js                   # Employee CRUD basics
├── employee-business-flows.spec.js     # Full employee lifecycle (14 flows)
├── departments.spec.js                 # Department CRUD
├── leaves.spec.js                      # Leave management basics
├── leave-business-flows.spec.js        # Leave lifecycle (6 flows)
├── timesheets.spec.js                  # Timesheet lifecycle (4 flows)
├── payroll-business-flows.spec.js      # Payroll & salary structures (4 flows)
├── attendance.spec.js                  # Attendance records & check-in/out
├── organization.spec.js                # Positions, holidays, org settings
├── tasks-projects.spec.js              # Project & task CRUD
├── dashboard-reports.spec.js           # Dashboard data & UI
├── admin-settings.spec.js              # System settings & RBAC
├── cross-role-workflows.spec.js        # Multi-role business journeys
├── full-workflow.spec.js               # Full frontend-only workflow (8 employees via UI)
├── api-health.spec.js                  # Health, CORS, auth checks
└── cleanup-test-data.js                # Post-run data cleanup utility
```

### 2.2 Playwright Configuration

```javascript
// playwright.config.js (integration)
module.exports = defineConfig({
  testDir: './e2e-integration',
  fullyParallel: false,        // Sequential — tests share DB state
  workers: 1,                  // Single worker
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,              // 30s per test
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### 2.3 Helper Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `loginViaAPI` | `(page, role)` | Fast API login (sets httpOnly cookies) |
| `loginViaUI` | `(page, role)` | UI login via form (for navigation tests) |
| `logout` | `(page)` | API logout + navigate to `/login` |
| `waitForPageLoad` | `(page, timeout?)` | Wait for MUI spinners/skeletons to disappear |
| `todayISO` | `()` | Current date as `YYYY-MM-DD` |
| `futureDateISO` | `(daysAhead)` | Future date as `YYYY-MM-DD` |
| `pastDateISO` | `(daysBack)` | Past date as `YYYY-MM-DD` |
| `currentMonday` | `()` | Most recent Monday as `YYYY-MM-DD` |
| `uniqueEmail` | `(prefix?)` | Unique email for test isolation |
| `uniqueId` | `(prefix?)` | Unique string identifier |
| `getDepartment` | `(page, name?)` | Fetch department by name from API |
| `getPosition` | `(page, title?)` | Fetch position by title from API |
| `getLeaveType` | `(page)` | Fetch first available leave type |
| `getMyEmployee` | `(page)` | Fetch current user's employee record |
| `createTestEmployee` | `(page, overrides?)` | Create employee via API (for test setup) |
| `deleteTestEmployee` | `(page, id)` | Cleanup employee via API |

### 2.4 Test Users (Seeded)

| Role | Email | Password | Persona |
|------|-------|----------|---------|
| Admin | `admin@skyraksys.com` | `admin123` | System Administrator |
| HR | `hr@skyraksys.com` | `admin123` | HR Manager |
| Manager | `lead@skyraksys.com` | `admin123` | Team Lead |
| Employee | `employee1@skyraksys.com` | `admin123` | Alice Brown |

### 2.5 Test Spec Inventory

| Spec File | Tests | Business Flows | Key Coverage |
|-----------|-------|----------------|--------------|
| `auth.spec.js` | 5 | Login, logout, cookies, error handling | JWT cookie auth |
| `api-health.spec.js` | 4 | Health, CORS, protected endpoints | Infrastructure |
| `employee-business-flows.spec.js` | ~20 | CRUD lifecycle, salary, user account, search, RBAC | Employee module |
| `employees.spec.js` | 4 | List, render, profile | Employee basics |
| `departments.spec.js` | 3 | List, render, CRUD | Department module |
| `leave-business-flows.spec.js` | ~15 | Types, requests, approval, cancellation, admin CRUD | Leave module |
| `leaves.spec.js` | 3 | Types, requests, employee view | Leave basics |
| `timesheets.spec.js` | ~12 | CRUD, submission, approval, weekly nav, RBAC | Timesheet module |
| `payroll-business-flows.spec.js` | ~15 | Salary structures, payslip gen, PDF, finalize, RBAC | Payroll module |
| `attendance.spec.js` | ~10 | Check-in/out, summary, daily/monthly, admin marks | Attendance module |
| `organization.spec.js` | ~12 | Positions, holidays CRUD, org settings UI | Org settings |
| `tasks-projects.spec.js` | ~10 | Project CRUD, task CRUD, assignment, my-tasks | Tasks module |
| `dashboard-reports.spec.js` | ~8 | Dashboard API, UI rendering per role, reports | Dashboard module |
| `admin-settings.spec.js` | ~8 | System settings, server metrics, user management, RBAC | Admin module |
| `cross-role-workflows.spec.js` | ~10 | Leave journey, timesheet journey, cross-role state | Cross-module |
| `full-workflow.spec.js` | ~30 | UI-only: create 8 employees, timesheets, payroll, leave, attendance | Full lifecycle |

### 2.6 Running Tests

```bash
cd frontend

# Run all integration tests
npx playwright test

# Run specific spec
npx playwright test e2e-integration/auth.spec.js

# Run with UI mode (interactive)
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed

# Run with specific grep
npx playwright test --grep "employee"

# Generate report
npx playwright show-report playwright-report-integration
```

---

## 3. E2E Excel-Driven Tests (`e2e-excel/`)

### 3.1 Architecture

Test data is externalized in an Excel workbook (`fixtures/test-data.xlsx`). Each sheet maps to a module. The `ExcelReader` loads rows, and specs iterate over them.

```
frontend/e2e-excel/
├── fixtures/
│   └── test-data.xlsx           # Master workbook (all test data)
├── lib/
│   ├── excel-reader.js          # Reads/filters rows from .xlsx
│   └── object-repository.js     # CSS/data-testid selector catalog
├── pages/                       # Page Object Models
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── EmployeePage.js
│   ├── LeavePage.js
│   ├── TimesheetPage.js
│   ├── PayrollPage.js
│   ├── AttendancePage.js
│   ├── TasksPage.js
│   ├── ReviewsPage.js
│   ├── OrganizationPage.js
│   └── UserManagementPage.js
├── fixtures/
│   └── test-fixtures.js         # Playwright fixtures (loginAs, waitForPageReady, navigateTo)
└── specs/                       # Test files
    ├── login.spec.js
    ├── forgot-password.spec.js
    ├── dashboard.spec.js
    ├── employee.spec.js
    ├── employee-records.spec.js
    ├── attendance.spec.js
    ├── leave.spec.js
    ├── leave-types.spec.js
    ├── timesheet.spec.js
    ├── payroll.spec.js
    ├── tasks.spec.js
    ├── reviews.spec.js
    ├── organization.spec.js
    └── user-management.spec.js
```

### 3.2 Excel Workbook Structure

Each sheet has these standard columns:

| Column | Required | Description |
|--------|----------|-------------|
| `testId` | Yes | Unique ID (e.g., `LOGIN-001`) |
| `description` | Yes | Test case description |
| `action` | Yes | Action to perform (e.g., `login`, `listLoad`, `submitRequest`) |
| `enabled` | Yes | `TRUE`/`FALSE` — controls whether test runs |
| `role` | Often | Which user role to test as |
| `expectSuccess` | Often | Expected outcome (`TRUE`/`FALSE`) |
| `prerequisite` | Optional | Comma-separated testIds that must run first |
| *(module-specific)* | Varies | e.g., `email`, `password`, `leaveType`, `startDate`, etc. |

### 3.3 ExcelReader Class

```javascript
const reader = new ExcelReader();

// Read all enabled tests from a sheet
const rows = reader.readEnabledTests('Login');

// Read selected tests (respects prerequisite chains)
const rows = reader.getSelectedTests('Employee');

// List all sheets
const sheets = reader.listSheets();

// Group tests by action
const grouped = reader.groupBy(rows, 'action');
```

### 3.4 Page Object Model

Each page object encapsulates:
- **CSS selectors** — imported from `lib/object-repository.js`
- **Navigation** — `goto()`, `gotoList()`, `gotoManagement()`
- **Actions** — `fillForm()`, `submit()`, `search()`, `filterByStatus()`
- **Assertions** — `isPageVisible()`, `isTableVisible()`, `getRowCount()`
- **MUI Helpers** — `_pickSelectOption()` for MUI Select components

### 3.5 Running Excel-Driven Tests

```bash
cd frontend

# Run all excel-driven tests
npx playwright test -c playwright-excel.config.js

# Run specific module
npx playwright test -c playwright-excel.config.js specs/employee.spec.js

# With UI
npx playwright test -c playwright-excel.config.js --ui
```

---

## 4. Frontend Unit Tests (Jest + RTL)

### 4.1 Test Structure

```
frontend/src/
├── __tests__/
│   └── infrastructure.test.js              # Smoke test for test setup
├── contexts/__tests__/
│   └── AuthContext.test.js                  # Auth provider/hooks
├── utils/__tests__/
│   └── employeeValidation.test.js           # Validation logic
├── components/
│   ├── common/__tests__/
│   │   ├── Login.test.js
│   │   ├── ForgotPassword.test.js
│   │   ├── ProtectedRoute.test.js
│   │   ├── SmartErrorBoundary.test.js
│   │   ├── ResponsiveTable.test.js
│   │   ├── ConfirmDialog.test.js
│   │   ├── FormFields.test.js
│   │   └── PhotoUpload.test.js
│   ├── features/
│   │   ├── dashboard/__tests__/
│   │   │   ├── AdminDashboard.test.js
│   │   │   ├── ManagerDashboard.test.js
│   │   │   └── EmployeeDashboard.test.js
│   │   ├── employees/__tests__/
│   │   │   ├── EmployeeList.test.js
│   │   │   ├── EmployeeForm.test.js
│   │   │   ├── EmployeeProfileModern.test.js
│   │   │   ├── EmployeeRecords.test.js
│   │   │   ├── MyProfile.test.js
│   │   │   ├── UserAccountManager.test.js
│   │   │   └── UserAccountManagementPage.test.js
│   │   ├── employees/components/__tests__/
│   │   │   └── DeleteEmployeeDialog.test.js
│   │   ├── employees/tabs/__tests__/
│   │   │   ├── PersonalInformationTab.test.js
│   │   │   ├── EmploymentInformationTab.test.js
│   │   │   ├── SalaryStructureTab.test.js
│   │   │   ├── ContactEmergencyTab.test.js
│   │   │   ├── StatutoryBankingTab.test.js
│   │   │   └── UserAccountTab.test.js
│   │   ├── leave/__tests__/
│   │   │   ├── LeaveManagement.test.js
│   │   │   ├── EmployeeLeaveRequests.test.js
│   │   │   ├── LeaveBalanceModern.test.js
│   │   │   └── LeaveAccrualManagement.test.js
│   │   ├── timesheet/__tests__/
│   │   │   ├── ModernWeeklyTimesheet.test.js
│   │   │   ├── TimesheetApproval.test.js
│   │   │   └── TimesheetHistory.test.js
│   │   ├── payroll/__tests__/
│   │   │   ├── ModernPayrollManagement.test.js
│   │   │   ├── EmployeePayslips.test.js
│   │   │   └── PayslipTemplateManager.test.js
│   │   ├── attendance/__tests__/
│   │   │   ├── MyAttendance.test.js
│   │   │   └── AttendanceManagement.test.js
│   │   ├── tasks/__tests__/
│   │   │   └── MyTasks.test.js
│   │   ├── reviews/__tests__/
│   │   │   └── EmployeeReviewManagement.test.js
│   │   └── admin/__tests__/
│   │       ├── UserManagement.test.js
│   │       ├── DepartmentManagement.test.js
│   │       ├── PositionManagement.test.js
│   │       ├── ProjectTaskConfiguration.test.js
│   │       └── RestoreManagement.test.js
```

### 4.2 Test Utilities (`test-utils/testUtils.js`)

| Export | Purpose |
|--------|---------|
| `renderWithProviders(ui, options)` | Wraps component in QueryClient, Router, Theme, Auth, Notification providers |
| `createMockUser(role)` | Creates mock user object for given role |
| `createMockEmployee(overrides)` | Creates mock employee object |
| `buildAuthValue(overrides)` | Builds complete auth context value |
| `TestAuthContext` | Test-friendly auth context provider |

### 4.3 Mocking Patterns

**Service mocks** (conditional for integration mode):
```javascript
jest.mock('../../../../services/employee.service', () => {
  if (process.env.REACT_APP_TEST_MODE === 'integration') {
    return jest.requireActual('../../../../services/employee.service');
  }
  return { employeeService: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn() } };
});
```

**Hook mocks**:
```javascript
jest.mock('../hooks/useEmployeeRecords');
useEmployeeRecords.mockReturnValue({ data: mockData, loading: false });
```

**Navigation mocks**:
```javascript
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
```

### 4.4 Running Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=EmployeeList

# Run with coverage
npm test -- --coverage

# Run in watch mode (default CRA behavior)
npm test -- --watchAll=false
```

---

## 5. Backend Tests (Jest)

### 5.1 Test Structure

```
backend/tests/
├── setup.js                           # Global setup (DB connection)
├── teardown.js                        # Global teardown (close DB)
├── env-setup.js                       # Environment variable setup
├── helpers/
│   ├── testHelper.js                  # TestHelper class (user/employee creation, tokens)
│   └── dataLoader.js                  # Excel test data loader
├── utils/
│   ├── testUtils.js                   # DB setup/cleanup, token generation
│   └── testDataHelpers.js             # Employee/department creation helpers
├── fixtures/
│   └── test-data.xlsx                 # Shared test data workbook
├── routes/
│   └── employee.test.js               # Employee API route tests
├── services/
│   ├── ServiceIntegration.test.js     # Service layer smoke test
│   ├── PayrollService.test.js         # Payroll calculation tests
│   ├── LeaveService.test.js           # Leave request/approval tests
│   └── TimesheetService.test.js       # Weekly timesheet tests
├── feature/
│   ├── system/
│   │   ├── healthcheck.test.js        # Health endpoint
│   │   ├── data-integrity.test.js     # DB constraints & validation
│   │   ├── soft-delete.test.js        # Paranoid mode (soft delete)
│   │   ├── system-config.test.js      # System config API (admin-only)
│   │   ├── project-service.test.js    # ProjectService CRUD
│   │   └── task-service.test.js       # TaskService CRUD
│   └── timesheet/
│       ├── timesheet-calculation-service.test.js  # Calculations & aggregations
│       ├── timesheet-submission-service.test.js   # Submit workflow
│       ├── timesheet-approval-service.test.js     # Approve/reject workflow
│       ├── timesheet-bulk-service.test.js         # Bulk operations
│       └── timesheet-validator.test.js            # Input validation
└── e2e/
    └── frontend/
        └── workflows/
            ├── business-workflows-e2e.test.js      # Full lifecycle via API
            ├── payslip-generation-e2e.test.js       # Payslip generation workflow
            └── project-task-workflows-e2e.test.js   # Project/task lifecycle
```

### 5.2 Jest Configuration

```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1,           // Sequential (DB conflicts)
  testTimeout: 30000,
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  setupFiles: ['./tests/env-setup.js'],
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'controllers/**/*.js', 'services/**/*.js', 'models/**/*.js',
    'middleware/**/*.js', 'utils/**/*.js',
    '!**/node_modules/**', '!**/tests/**'
  ],
};
```

### 5.3 Test Helper (TestHelper class)

```javascript
const helper = new TestHelper(app);

// Create users with roles
const { user: admin, token: adminToken } = await helper.createAdminUser();
const { user: hr, token: hrToken } = await helper.createHRUser();
const { user: manager, token: managerToken } = await helper.createManagerUser();
const { user: emp, token: empToken } = await helper.createEmployeeUser();

// Create supporting data
const dept = await helper.createDepartment({ name: 'Engineering' });
const pos = await helper.createPosition({ title: 'Developer', departmentId: dept.id });

// Cleanup
await helper.cleanup(); // Removes all created test data
```

### 5.4 Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test
npx jest tests/services/PayrollService.test.js

# Run with coverage
npx jest --coverage

# Run a category
npx jest tests/feature/timesheet/
```

---

## 6. Test Data Management

### 6.1 Seeded Demo Data

The database must be seeded before running E2E tests:

```bash
cd backend
npx sequelize-cli db:seed:all
```

Seeded data includes:
- 4 users (admin, hr, manager, employee) with known passwords
- Departments: Engineering, Human Resources, Sales & Marketing, Finance & Accounting
- Positions linked to departments
- 12 leave types with accrual rules
- Leave balances for all employees
- Sample employees with salary structures

### 6.2 Test Data Isolation

- **E2E Integration**: Tests create data with `uniqueEmail()` / `uniqueId()` prefixes, then clean up via API `DELETE` calls in `afterEach`/`afterAll`.
- **Excel-Driven**: Tests use seeded data; write operations use the `test-fixtures.js` helpers.
- **Backend Unit**: Each test creates its own DB records and cleans up via `testDataHelpers.clearTestData()`.
- **Cleanup utility**: `cleanup-test-data.js` can be run post-test to remove leftover test artifacts.

### 6.3 Employee ID Format

Test-created employees use the `SKYT` prefix format (e.g., `SKYT1234`). The backend auto-generates IDs using a `CAST(REPLACE(employeeId, 'SKYT', '') AS INTEGER)` query to find the next available number.

---

## 7. Common Patterns & Tips

### Writing a New E2E Test

```javascript
// 1. Import helpers
const { test, expect } = require('@playwright/test');
const { loginViaAPI, logout, waitForPageLoad, API_URL } = require('./helpers');

// 2. Describe a flow
test.describe.serial('Module — Flow: Description', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('step a — verb what it does', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/endpoint`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // UI tests: loginViaUI for navigation, then interact with DOM
  test('step b — UI interaction', async ({ page }) => {
    await logout(page);
    await loginViaUI(page, 'admin');
    await page.goto('/target-page');
    await waitForPageLoad(page);
    await expect(page.getByRole('heading', { name: /title/i })).toBeVisible();
  });
});
```

### Handling MUI Components in Playwright

```javascript
// MUI Select (data-testid on hidden input)
const hiddenInput = page.locator('[data-testid="my-select"]');
const wrapper = hiddenInput.locator('xpath=ancestor::div[contains(@class,"MuiSelect")]').first();
await wrapper.click({ force: true });
await page.locator('[role="option"]').filter({ hasText: /option text/i }).click();

// MUI DatePicker (type formatted date)
const input = page.locator('[data-testid="date-input"]');
await input.click({ clickCount: 3 });
await input.type('03/27/2026', { delay: 50 });

// Wait for MUI loading to finish
await page.waitForFunction(() => {
  return document.querySelectorAll('[role="progressbar"]').length === 0
      && document.querySelectorAll('.MuiSkeleton-root').length === 0;
}, { timeout: 10000 });
```

### Handling Flaky Tests

1. **Use `waitForPageLoad()`** after every navigation
2. **Use `failOnStatusCode: false`** for API calls that may 404/501 on optional endpoints
3. **Use `expect([403, 404]).toContain(res.status())`** for endpoints that may not exist
4. **Avoid `waitForTimeout()`** — prefer `waitFor()` or `waitForURL()`
5. **Use `.catch(() => false)` on `isVisible()`** to handle race conditions

---

## 8. CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: skyraksys_hrm_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd backend && npm ci
      - run: cd frontend && npm ci
      - run: npx playwright install --with-deps chromium
      - run: cd backend && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all
        env:
          DB_HOST: localhost
          DB_NAME: skyraksys_hrm_test
      - run: cd backend && npm start &
      - run: cd frontend && npm start &
      - run: sleep 15 # Wait for servers
      - run: cd frontend && npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report-integration/
```

### Reports & Artifacts

| Artifact | Location | Content |
|----------|----------|---------|
| Integration HTML report | `frontend/playwright-report-integration/` | Test results, screenshots, traces |
| Excel test HTML report | `frontend/playwright-report-excel/` | Excel-driven test results |
| Screenshots | `frontend/test-results/` | Failure screenshots |
| Traces | `frontend/test-results/` | Playwright trace files (`.zip`) |
| Backend logs | `frontend/test-results/backend-logs/` | Captured backend logs (full-workflow) |

---

## 9. Coverage Goals

| Layer | Target | Notes |
|-------|--------|-------|
| Backend Services | 95% line coverage | Per `jest.config.js` threshold |
| Frontend Components | 80%+ | All major components have test files |
| E2E Business Flows | 100% modules | All 8 modules have integration specs |
| E2E RBAC | All 4 roles | Admin, HR, Manager, Employee tested |
| Cross-module flows | Key journeys | Leave approval, timesheet submission, payroll |

---

## 10. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Tests fail with `ECONNREFUSED` | Backend not running | Start backend: `cd backend && npm start` |
| Login fails in E2E | DB not seeded | Run `npx sequelize-cli db:seed:all` |
| MUI select not clicking | Wrong selector depth | Use `xpath=ancestor::div` to find clickable wrapper |
| Stale test data | Previous run leftovers | Run `cleanup-test-data.js` or re-seed DB |
| `page.request` 401 | Cookies expired | Ensure `loginViaAPI` runs in `beforeEach` |
| Frontend test memory leak | Too many queries | Add `queryClient.clear()` in `afterEach` |
| `waitForPageLoad` timeout | Page has persistent spinner | Use `.catch()` pattern (already in helpers) |

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
