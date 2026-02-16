# Frontend Architecture Guide

> **Last updated:** 2026-02-14 | **Source:** `skyraksys_hrm_app/frontend/src/`

---

## 1. Provider Hierarchy

```
<SmartErrorBoundary level="application">
  <ThemeProvider theme={modernTheme}>
    <CssBaseline />
    <LoadingProvider>
      <NotificationProvider>
        <SnackbarProvider maxSnack={3}>     ← notistack
          <AuthProvider>
            <SmartErrorBoundary level="routing">
              <Routes>
                ...
              </Routes>
            </SmartErrorBoundary>
          </AuthProvider>
        </SnackbarProvider>
      </NotificationProvider>
    </LoadingProvider>
  </ThemeProvider>
</SmartErrorBoundary>
```

---

## 2. Routing (App.js)

### 2.1 Public Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `Login` | Not lazy-loaded |
| `/forgot-password` | `ForgotPassword` | Not lazy-loaded |

### 2.2 Protected Routes (inside `<Layout>`)

All wrapped in `<ProtectedRoute>` which checks `isAuthenticated` + `hasRouteAccess(role, path)`.

#### Dashboards

| Path | Component | Roles |
|------|-----------|-------|
| `/` (index) | `DashboardRedirect` | Redirects by role |
| `/dashboard` | `DashboardRedirect` | All |
| `/admin-dashboard` | `AdminDashboard` | admin, hr |
| `/employee-dashboard` | `EmployeeDashboard` | employee |
| `/manager-dashboard` | `ManagerDashboard` | manager |
| `/performance-dashboard` | `PerformanceDashboard` | admin, hr, manager |

#### Employee Management

| Path | Component | Roles |
|------|-----------|-------|
| `/employees` | `EmployeeList` | admin, hr, manager |
| `/employees/add` | `EmployeeForm` | admin, hr |
| `/employees/:id` | `EmployeeProfileModern` | admin, hr, manager |
| `/employees/:id/edit` | `EmployeeForm` | admin, hr |
| `/employees/:id/user-account` | `UserAccountManagementPage` | admin, hr |
| `/my-profile` | `MyProfile` | All |
| `/employee-records` | `EmployeeRecords` | admin, hr |
| `/employee-reviews` | `EmployeeReviewManagement` | All |

#### Leave Management

| Path | Component | Roles |
|------|-----------|-------|
| `/leave-management` | `LeaveManagement` | admin, hr, manager |
| `/leave-requests` | `EmployeeLeaveRequests` | All |
| `/add-leave-request` | `LeaveRequest` | All |
| `/admin/leave-balances` | `LeaveBalanceModern` | admin, hr |
| `/admin/leave-accrual` | `LeaveAccrualManagement` | admin, hr |

#### Timesheet Management

| Path | Component | Roles |
|------|-----------|-------|
| `/timesheets` | `TimesheetHub` | All |
| `/timesheets/week/:weekStart` | `ModernWeeklyTimesheet` | All |

#### Payroll

| Path | Component | Roles |
|------|-----------|-------|
| `/payroll-management` | `ModernPayrollManagement` | admin, hr |
| `/employee-payslips` | `EmployeePayslips` | All |

#### Attendance

| Path | Component | Roles |
|------|-----------|-------|
| `/my-attendance` | `MyAttendance` | All |
| `/attendance-management` | `AttendanceManagement` | admin, hr |

#### Projects & Tasks

| Path | Component | Roles |
|------|-----------|-------|
| `/project-task-config` | `ProjectTaskConfiguration` | All |
| `/my-tasks` | `MyTasks` | All |
| `/projects` | `ProjectList` | All |
| `/projects/new` | `ProjectForm` | All |
| `/projects/:id` | `ProjectDetails` | All |

#### Administration

| Path | Component | Roles |
|------|-----------|-------|
| `/user-management` | `UserManagementEnhanced` | admin, hr |
| `/organization` | `OrganizationSettings` | admin, hr |
| `/admin/settings-hub` | `SystemSettingsHub` | admin |
| `/admin/restore` | `RestoreManagement` | admin |
| `/admin/config` | `AdminConfigPage` | admin |
| `/admin/payslip-templates` | `EnhancedPayslipTemplateConfiguration` | admin, hr |
| `/reports` | `ReportsModule` | admin, hr |
| `/admin/debug` | `AdminDebugPanel` | Dev only |

### 2.3 Legacy Redirects

15+ redirects maintain backward compatibility: `/add-employee` → `/employees/add`, `/department-management` → `/organization`, `/timesheet-history` → `/timesheets/history`, `/settings` → `/admin/settings-hub`, etc.

### 2.4 ProtectedRoute Logic

```
1. loading → CircularProgress spinner
2. !isAuthenticated → Navigate to /login (with returnUrl)
3. requiredRoles provided → check user.role against array
4. Always check hasRouteAccess(userRole, pathname) via roleConfig.js
5. Denied → UnauthorizedPage component
```

---

## 3. Navigation Structure (Layout.js)

Sidebar uses **grouped accordion** pattern with role-conditional menus.

### Admin/HR Menu

| Group | Label | Path | Icon |
|-------|-------|------|------|
| **Dashboard** | Overview | `/admin-dashboard` | Dashboard |
| | Performance | `/performance-dashboard` | TrendingUp |
| **People** | All Employees | `/employees` | People |
| | Employee Records | `/employee-records` | Assignment |
| | Employee Reviews | `/employee-reviews` | RateReview |
| | Organization | `/organization` | Business |
| **Work** | Leave Requests | `/leave-management` | EventBusy |
| | Leave Balances | `/admin/leave-balances` | AccountBalance |
| | Leave Accrual | `/admin/leave-accrual` | Update |
| | Timesheet Approvals | `/timesheets?view=approvals` | Timer |
| | Attendance Mgmt | `/attendance-management` | Fingerprint |
| | Projects | `/project-task-config` | FolderSpecial |
| **Payroll & Reports** | Payroll Management | `/payroll-management` | AttachMoney |
| | Payslip Templates | `/admin/payslip-templates` | Receipt |
| | Reports | `/reports` | Assessment |
| **Settings** | User Management | `/user-management` | ManageAccounts |
| | System Settings | `/admin/settings-hub` | Settings |
| | Admin Config | `/admin/config` | AdminPanelSettings |
| | Restore Records | `/admin/restore` | RestoreFromTrash |
| **My Stuff** | My Timesheet | `/timesheets` | Schedule |
| | My Leave | `/leave-requests` | BeachAccess |
| | My Payslips | `/employee-payslips` | Receipt |
| | My Attendance | `/my-attendance` | Fingerprint |
| | My Profile | `/my-profile` | AccountCircle |

### Manager Menu

Dashboard + Team Members + Approvals (Leave, Timesheet) + Projects + My Stuff section.

### Employee Menu

Dashboard + My Stuff only (Timesheet, Leave, Payslips, Reviews, Tasks, Profile).

---

## 4. State Management

### 4.1 Context Providers

#### AuthContext

**State:** `user`, `loading`, `isAuthenticated`

**Methods:** `login(email, password)`, `register(userData)`, `logout()`, `updateProfile(data)`, `changePassword(current, new)`

**Role checks (booleans, not functions):**
- `isAdmin`, `isHR`, `isManager`, `isEmployee`
- `canManageEmployees` (admin, hr)
- `canApproveLeaves` (admin, hr, manager)
- `canViewPayroll` (admin, hr)
- `canManageSettings` (admin)

**Auth mechanism:** httpOnly cookies. On startup, calls `GET /auth/me`. Token refresh via axios interceptor.

#### LoadingContext

Key-based loading states. Methods: `setLoading(key, bool, options)`, `setGlobalLoadingState(bool, message)`, `isLoading(key)`, `isAnyLoading()`, `clearAllLoading()`.

Exports skeleton components: `PageSkeleton`, `TableSkeleton`, `FormSkeleton`, `CardSkeleton`.

#### NotificationContext

Methods: `showSuccess(msg)`, `showError(msg)` (8s auto-hide), `showWarning(msg)`, `showInfo(msg)`, `clearAllNotifications()`. Max 3 simultaneous. Renders MUI `Snackbar` + `Alert`.

> **Note:** App also wraps with notistack `SnackbarProvider` — both notification systems coexist (some components use `enqueueSnackbar`, others use `showSuccess`).

### 4.2 React Query (TanStack)

Primary data-fetching layer. All hooks in `frontend/src/hooks/queries/`.

#### Query Key Pattern

```js
const entityKeys = {
  all: ['entity-name'],
  lists: () => [...entityKeys.all, 'list'],
  list: (filters) => [...entityKeys.lists(), filters],
  details: () => [...entityKeys.all, 'detail'],
  detail: (id) => [...entityKeys.details(), id],
};
```

#### Queries (useQuery)

| Hook | Service Call | Enabled |
|------|-------------|---------|
| `useEmployees(filters)` | `employeeService.getAll(filters)` | Always |
| `useEmployee(id)` | `employeeService.getById(id)` | `!!id` |
| `useLeaveRequests(filters)` | `leaveService.getAll(filters)` | Always |
| `useLeaveBalances(employeeId)` | `leaveService.getBalances(employeeId)` | `!!employeeId` |
| `usePendingLeaveApprovals()` | `leaveService.getPendingApprovals()` | Always |
| `useLeaveTypes()` | `leaveService.getLeaveTypes()` | Always (10min stale) |
| `useTimesheets(filters)` | `timesheetService.getAll(filters)` | Always |
| `usePendingTimesheetApprovals()` | `timesheetService.getPendingApprovals()` | Always |
| `usePayslips(filters)` | `payrollService.getPayslips(filters)` | Always |
| `usePayrollRuns(filters)` | `payrollService.getPayrollRuns(filters)` | Always |
| `useEmployeeReviews(filters)` | `employeeReviewService.getAll(filters)` | Always |
| `useReviewDashboard()` | `employeeReviewService.getDashboardStats()` | Always (2min stale) |

#### Mutations (useMutation)

All mutations use `useQueryClient()` for cache invalidation and `enqueueSnackbar()` for notifications.

| Hook | Action | Invalidates |
|------|--------|-------------|
| `useCreateEmployee` | `create` / `createWithPhoto` | `employees.lists()` |
| `useUpdateEmployee` | `update(id, data)` | detail + lists |
| `useDeleteEmployee` | `delete(id)` | removes detail, invalidates lists |
| `useCreateLeaveRequest` | `create(data)` | lists + balances |
| `useApproveLeaveRequest` | `approve(id)` | lists + detail + pending |
| `useRejectLeaveRequest` | `reject(id)` | lists + detail + pending |
| `useCancelLeaveRequest` | `cancel(id)` | lists + detail |
| `useCreateTimesheet` | `create(data)` | lists |
| `useSubmitTimesheet` | `submit(id)` | detail + lists + pending |
| `useApproveTimesheet` | `approve(id)` | lists + detail + pending |
| `useGeneratePayslips` | `generatePayslips(data)` | payslips + runs |
| `useCreateEmployeeReview` | `create(data)` | lists + dashboard |
| `useUpdateReviewStatus` | `updateStatus(id)` | lists + detail + dashboard |

---

## 5. Service Layer

### 5.1 HTTP Client (http-common.js)

```js
const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  withCredentials: true  // sends httpOnly cookies
});
```

**Request interceptor:** Pass-through (cookie-based, no token injection).

**Response interceptor — Silent token refresh on 401:**
1. If 401 and not already retried → `POST /auth/refresh-token`
2. Queue concurrent requests while refresh is in-flight
3. On refresh success → replay all queued requests
4. On refresh failure → redirect to `/login`

### 5.2 Service Files

All services exported from `services/index.js`.

#### AuthService — 19 methods
`login`, `register`, `logout`, `getProfile`, `updateProfile`, `changePassword`, `resetPassword`, `toggleUserStatus`, `updateUserRole`, `resetUserPassword`, `updateUserAccount`, `createUserAccount`, `getUserByEmployeeId`, `sendPasswordResetEmail`, `sendAccountStatusEmail`, `checkEmailStatus`, `getAllUsers`, `deleteUser`, `lockUserAccount`, `sendWelcomeEmail`

#### EmployeeService — 16 methods
`getAll`, `get`/`getById`, `getMyProfile`, `create`, `createWithPhoto`, `uploadPhoto`, `update`, `updateCompensation`, `delete`, `getDepartments`, `getPositions`, `search`, `checkEmailExists`, `checkEmployeeIdExists`, `getStatistics`, `updateStatus`, `exportEmployees`

#### LeaveService — 18 methods
`getAll`, `get`/`getById`, `create`, `updateStatus`, `approve`, `reject`, `getBalance`, `getPendingApprovals`, `getLeaveTypes`, `getCalendar`, `getStatistics`, `cancel`, `createBalance`, `updateBalance`, `initializeBalances`, `getLeaveBalanceAdmin`, `getPendingForManager`, `getMyBalance`

#### TimesheetService — 17 methods
`getAll`, `get`, `create`, `update`, `updateStatus`, `submit`, `getSummary`, `getProjects`, `getTasks`, `getByWeek`, `getByDateRange`, `getPending`, `createBatch`, `bulkSubmit`, `bulkSave`, `bulkUpdate`, `bulkApprove`, `bulkReject`, `getPendingApprovals`

#### PayrollService — 13 methods
Template CRUD (5) + `setDefault`, `toggleStatus`, `duplicate`, `getActive`, `processPayroll`, `getPayrollHistory`, `importPayrollCsv`, `calculatePreview`

#### PayslipService — 7 methods
`generatePayslip`, `finalizePayslip`, `getPayslipHistory`, `getPayslipById`, `getAllPayslips`, `createPayslip`, `generateBulkPayslips` + client-side `calculatePayslip`

#### Other Services
- **DepartmentService** — CRUD + `getPositions(deptId)` (6 methods)
- **PositionService** — CRUD + `getByDepartment(deptId)` (6 methods)
- **SalaryService** — `getSalaryStructure`, `createSalaryStructure`, `updateSalaryStructure`, `getAllSalaryStructures`
- **EmployeeReviewService** — CRUD + `updateStatus`, `hrApprove`, `getDashboardStats`
- **LeaveAccrualService** — `getStatus`, `preview`, `runAccrual`, `carryForward`
- **LeaveBalanceAdminService** — CRUD + `bulkInitialize`, `getSummary`, `getEmployees`, `getLeaveTypes`
- **RestoreService** — `getDeletedReviews/Balance/Users`, `restoreReview/Balance/User`
- **DashboardService** — `getStats`, `getAdminStats`, `getManagerStats`, `getEmployeeStats`
- **PerformanceService** — Server metrics + client-side performance
- **SettingsService** — `getPayslipTemplate`, `updatePayslipTemplate`
- **ProjectService** — CRUD + `getStats`, `getActiveProjects`
- **TaskService** — CRUD + `getByProject`, `bulkCreate`, `updateStatus`

### 5.3 ApiService (Generic Wrapper)

Used by `DepartmentService` and `PositionService`. Methods: `get`, `post`, `put`, `patch`, `delete`, `upload`, `download`. Normalizes all responses to `{ success, data, message, meta, pagination }`.

---

## 6. Form Patterns

### 6.1 Validation Approach

**No external form libraries** (no Formik, no React Hook Form, no Joi in frontend). All validation is custom:

- **`employeeValidation.js`** (557 lines) — India-specific regex rules: PAN (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`), Aadhaar (12 digits), UAN, ESI, IFSC, PIN. Employee ID: `SKYT####`.
- **`validationFixes.js`** — Pre-submission sanitizer: auto-uppercases PAN/IFSC, strips non-digits from phone, normalizes dates to `YYYY-MM-DD`, sets defaults (`nationality: 'Indian'`, `status: 'Active'`).

### 6.2 Form State Management

Forms use plain **`useState`**. Two reusable hooks:

**`useForm`** — basic: `values`, `errors`, `touched`, `handleChange`, `handleBlur`, `handleSubmit`, `resetForm`.

**`useFormValidation`** — enhanced: accepts declarative `validationSchema` object with rules per field (`required`, `email`, `phone`, `minLength`, `maxLength`, `pattern`, `validate(value, allValues)`). Returns `isDirty`, `isFormValid`, `isSubmitting`.

### 6.3 Employee Form (Most Complex)

`useEmployeeValidation(initialData, mode)` orchestrates:
- `validateSingleField(field, value, formData)` — real-time per-field
- `validateForm(formData)` — full form validation
- `validateWithBusinessLogic(formData)` — cross-field rules (confirmation date > joining date, probation alignment)
- `prepareDataForSubmission(formData)` — transforms for API

Required fields: `firstName`, `lastName`, `email`, `hireDate`, `departmentId`, `positionId` (+ `employeeId` in create mode).

### 6.4 Error Display

- MUI `TextField` with `error` + `helperText` props
- Toast via `enqueueSnackbar` (notistack) for mutation results
- `NotificationContext` (`showError`/`showSuccess`) for non-form feedback
- `SmartErrorBoundary` wraps page-level routes for render error catches

---

## 7. Key Utilities

| File | Purpose |
|------|---------|
| `roleConfig.js` | `ROLES` enum, `ROUTE_PERMISSIONS` map, `hasRouteAccess()`, `getDefaultDashboard()` |
| `formatCurrency.js` | `formatCurrency(amount)` → `₹1,23,456` (en-IN locale, INR) |
| `errorRecovery.js` | `ErrorRecoveryManager`: exponential backoff, circuit breaker, jitter, operation tracking |
| `apiResponseHandler.js` | Standardizes API responses: `success()`, `error()`, `handleApiCall()`, status-specific messages |
| `helpers.js` | `formatDate`, `calculateDaysBetween`, `validateEmail`, `debounce`, `deepClone` |
| `logger.js` | Dev-only logging (suppressed in production) |
| `payslipCalculations.js` | Client-side payslip engine: number-to-words (Indian), PT slabs, EPF/ESI, HRA |
| `employeeCreationUtils.js` | Cached dept/position lookups, `createEmployeePayload()` transformer |
| `apiEndpoints.js` | 245-line centralized endpoint definitions by domain |

### 7.1 Field-Level Permissions (useFieldPermissions)

Per-role field access control:

| Role | View | Edit | Sensitive Fields |
|------|------|------|-----------------|
| **Admin** | All (`*`) | All (`*`) | Yes |
| **HR** | 30+ fields | 25+ fields | Yes |
| **Manager** | ~15 basic fields | 4 fields (dept, position, workLocation, status) | No |
| **Employee** | Own basic info (~20) | 6 fields (phone, address, city, state, pinCode, emergency) | No |

**Sensitive fields:** `aadhaarNumber`, `panNumber`, `bankAccountNumber`, `salaryStructure`, `uanNumber`, `pfNumber`, `esiNumber`

---

## 8. Custom Hooks Reference

| Hook | Purpose |
|------|---------|
| `useApi` | Simple API call wrapper (`{ data, loading, error, execute, refetch }`) |
| `useApiCall` | Enhanced with `ApiResponseHandler` (`{ execute, hasData, hasError, isIdle }`) |
| `useMultipleApiCalls` | Track multiple named API operations |
| `useConfirmDialog` | Reusable confirm dialog state (`{ dialogProps, confirm({title, message, onConfirm}) }`) |
| `useEmployeeValidation` | Employee form validation with business logic |
| `useErrorRecovery` | Error recovery with retry strategies |
| `useFieldPermissions` | RBAC field-level access control |
| `useFormValidation` | Generic form validation with schema |
| `useMetadataCache` | Caches departments/positions/managers in-memory |
| `useDebounce` | Debounce a value |
| `useThrottle` | Throttle a value |
| `usePrevious` | Track previous value via ref |
| `useIsMounted` | Mount status check for safe async |
| `useSafeAsync` | Safe async execution with mount guard |
| `usePerformanceMonitor` | Track render/mount times |
| `useAPIPerformanceMonitor` | Track API request latency |
