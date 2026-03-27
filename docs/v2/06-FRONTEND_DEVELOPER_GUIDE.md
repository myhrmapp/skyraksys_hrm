# SkyrakSys HRM — Frontend Developer Guide

> **Document Owner**: Senior Frontend Developer  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Frontend developers, UI engineers, new team members

---

## 1. Quick Start

```bash
cd frontend
npm install
cp .env.example .env     # Set REACT_APP_API_URL if backend isn't on localhost:5000
npm start                # Dev server on port 3000 (proxies to backend:5000)
```

---

## 2. Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework (CRA) |
| Material-UI (MUI) | 5.15 | Component library |
| @tanstack/react-query | 5.90 | Server state management |
| react-router-dom | 6.25 | Client-side routing |
| react-hook-form | 7.48 | Form state management |
| yup | 1.7 | Schema validation |
| axios | 1.11 | HTTP client |
| notistack | 3.0 | Snackbar notifications |
| recharts | 2.8 | Charts & dashboards |
| date-fns / dayjs | 2.30 / 1.11 | Date utilities |
| xlsx / file-saver | 0.18 / 2.0 | Excel export |

---

## 3. Project Structure

```
frontend/src/
├── index.js                    # React root, providers
├── App.js                      # Theme, auth, routing
├── http-common.js              # Axios instance + interceptors
├── config/
│   ├── queryClient.js          # TanStack Query configuration
│   ├── apiEndpoints.js         # All API endpoint constants
│   └── payslipTemplates.js     # Default payslip structure
├── contexts/
│   ├── AuthContext.js           # Auth state, login/logout, role checks
│   ├── LoadingContext.js        # Global/per-key loading states
│   └── NotificationContext.js   # Snackbar notifications
├── hooks/
│   ├── index.js                 # useApi, useForm
│   ├── useApiCall.js            # Enhanced API call with states
│   ├── useConfirmDialog.js      # Confirmation dialog hook
│   ├── useEmployeeValidation.js # Employee form validation
│   ├── useFieldPermissions.js   # Role-based field visibility
│   ├── useFormValidation.js     # Generic form validation
│   ├── useMetadataCache.js      # Departments/positions cache
│   ├── useOptimization.js       # Debounce, throttle, memoization
│   └── queries/                 # TanStack React Query hooks
│       ├── useEmployeeQueries.js
│       ├── useLeaveQueries.js
│       ├── useTimesheetQueries.js
│       ├── usePayrollQueries.js
│       └── useReviewQueries.js
├── services/                    # API service layer
│   ├── auth.service.js
│   ├── employee.service.js
│   ├── leave.service.js
│   ├── timesheet.service.js
│   ├── attendance.service.js
│   ├── payroll.service.js
│   ├── dashboard.service.js
│   ├── salary.service.js
│   ├── employeeReview.service.js
│   ├── leaveAccrual.service.js
│   ├── restore.service.js
│   ├── settings.service.js
│   ├── ProjectService.js
│   ├── TaskService.js
│   └── serviceHelpers.js       # Response normalization
├── routes/
│   ├── index.js                 # Route group barrel export
│   ├── routeHelpers.js          # withBoundary(), lazy loading
│   ├── dashboardRoutes.js
│   ├── employeeRoutes.js
│   ├── leaveRoutes.js
│   ├── timesheetRoutes.js
│   ├── attendanceRoutes.js
│   ├── payrollRoutes.js
│   └── adminRoutes.js
├── components/
│   ├── layout/                  # Layout, Sidebar, AppBar
│   ├── common/                  # Login, ProtectedRoute, ErrorBoundary
│   ├── shared/                  # EmptyState, TableSkeleton, SectionError
│   ├── forms/                   # Validated form components
│   ├── features/                # Feature-specific components
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── leave/
│   │   ├── timesheet/
│   │   ├── attendance/
│   │   ├── payroll/
│   │   ├── reviews/
│   │   ├── tasks/
│   │   ├── admin/
│   │   └── help/
│   ├── manager/                 # Manager-specific components
│   ├── admin/                   # Admin pages (templates, holidays)
│   └── payslip/                 # Payslip viewer & template
├── theme/
│   └── modernTheme.js           # MUI theme customization
└── utils/
    ├── roleConfig.js            # RBAC configuration
    ├── helpers.js               # Date/string/validation helpers
    ├── formatCurrency.js        # INR formatting
    ├── apiResponseHandler.js    # API response wrapper
    ├── validation.js            # Form validation functions
    ├── logger.js                # Dev-only logging
    └── performance.js           # Memoization, virtualization
```

---

## 4. Provider Hierarchy

```
<React.StrictMode>
  <ErrorBoundary level="application">
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={modernTheme}>
          <CssBaseline />
          <LoadingProvider>
            <SnackbarProvider maxSnack={3}>
              <AuthProvider>
                <Routes>
                  {/* Public: /login, /forgot-password */}
                  {/* Protected: <ProtectedRoute><Layout><Outlet/></Layout></ProtectedRoute> */}
                </Routes>
              </AuthProvider>
            </SnackbarProvider>
          </LoadingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
</React.StrictMode>
```

---

## 5. Authentication

### AuthContext API

```javascript
const {
  user,              // Current user object
  isAuthenticated,   // Boolean
  loading,           // Initial auth check loading
  login,             // async (email, password) → user
  logout,            // async () → redirect to /login
  updateProfile,     // async (data)
  changePassword,    // async (currentPw, newPw)
  // Role checks
  isAdmin,           // Boolean
  isHR,              // Boolean
  isManager,         // Boolean
  isEmployee,        // Boolean
  hasRole,           // (role) → Boolean
  hasAnyRole,        // ([roles]) → Boolean
  // Permission checks
  canManageEmployees,
  canApproveLeaves,
  canViewPayroll,
  canManageSettings,
} = useAuth();
```

### How It Works

1. On app load, `AuthProvider` calls `GET /api/auth/me` to check existing session
2. Login calls `POST /api/auth/login` → server sets httpOnly cookies
3. All API calls auto-include cookies (`withCredentials: true`)
4. On 401, Axios interceptor silently calls `POST /api/auth/refresh-token`
5. If refresh fails, user is redirected to `/login`

### Token Storage

Tokens are in **httpOnly cookies** — never accessible from JavaScript. No localStorage/sessionStorage.

---

## 6. Routing

### Route Protection

```javascript
// ProtectedRoute component
<ProtectedRoute requiredRoles={['admin', 'hr']}>
  <PayrollManagement />
</ProtectedRoute>
```

Checks `isAuthenticated` + optional `requiredRoles` against `user.role`.

### Code Splitting

All route components use lazy loading via `withBoundary()`:

```javascript
// routeHelpers.js
export function withBoundary(LazyComponent) {
  return (
    <SmartErrorBoundary level="page">
      <Suspense fallback={<LoadingSpinner />}>
        <LazyComponent />
      </Suspense>
    </SmartErrorBoundary>
  );
}
```

### Route Groups

| Group | Prefix | Key Routes |
|-------|--------|-----------|
| Dashboard | `/` | `/dashboard`, `/admin-dashboard`, `/employee-dashboard`, `/manager-dashboard` |
| Employee | `/employees` | `/employees`, `/employees/add`, `/employees/:id`, `/employees/:id/edit`, `/my-profile` |
| Leave | `/leave-*` | `/leave-management`, `/leave-requests`, `/add-leave-request`, `/admin/leave-*` |
| Timesheet | `/timesheets` | `/timesheets`, `/timesheets/week/:weekStart` |
| Attendance | `/attendance` | `/my-attendance`, `/attendance-management` |
| Payroll | `/payroll-*` | `/payroll-management`, `/employee-payslips` |
| Admin | `/admin/*` | `/user-management`, `/organization`, `/admin/settings-hub`, `/admin/restore` |
| Tasks | `/my-tasks` | `/my-tasks`, `/project-task-config` |

---

## 7. Data Fetching

### Primary: TanStack React Query

```javascript
// Configuration (config/queryClient.js)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      gcTime: 10 * 60 * 1000,     // 10 minutes
      retry: (count, error) => count < 3 && error.status >= 500,
      refetchOnWindowFocus: false,
    }
  }
});
```

### Using Query Hooks

```javascript
import { useEmployees, useCreateEmployee } from '../hooks/queries/useEmployeeQueries';

function EmployeeList() {
  const { data, isLoading, error } = useEmployees({ page: 1, limit: 10, search: '' });
  const createMutation = useCreateEmployee();

  const handleCreate = (formData) => {
    createMutation.mutate(formData, {
      onSuccess: () => { /* show notification, refetch */ },
      onError: (err) => { /* show error */ }
    });
  };
}
```

### Available Query Hooks

| Module | Queries | Mutations |
|--------|---------|-----------|
| Employee | `useEmployees(filters)`, `useEmployee(id)` | `useCreateEmployee()`, `useUpdateEmployee()`, `useDeleteEmployee()` |
| Leave | `useLeaveRequests()`, `useLeaveBalances()`, `usePendingLeaveApprovals()`, `useLeaveTypes()` | `useCreateLeaveRequest()`, `useApproveLeaveRequest()`, `useRejectLeaveRequest()`, `useCancelLeaveRequest()` |
| Timesheet | `useTimesheets()`, `useTimesheet(id)`, `usePendingTimesheetApprovals()` | `useCreateTimesheet()`, `useUpdateTimesheet()`, `useSubmitTimesheet()`, `useApproveTimesheet()` |
| Payroll | `usePayslips()`, `usePayslip(id)`, `usePayrollRuns()` | `useGeneratePayslips()`, `useApprovePayslip()`, `useDownloadPayslip()` |
| Reviews | `useEmployeeReviews()`, `useEmployeeReview(id)` | `useCreateEmployeeReview()`, `useUpdateEmployeeReview()`, `useDeleteEmployeeReview()` |

### Legacy: useApiCall

```javascript
const { data, loading, error, execute } = useApiCall(employeeService.getAll);
useEffect(() => { execute({ page: 1 }); }, []);
```

---

## 8. Form Management

### Pattern 1: React Hook Form + Yup (Complex Forms)

```javascript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  firstName: yup.string().required().min(2).max(50),
  email: yup.string().required().email(),
});

function EmployeeForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { firstName: '', email: '' }
  });
  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

### Pattern 2: useFormValidation Hook (Simple Forms)

```javascript
const { values, errors, touched, setValue, handleSubmit, reset } = useFormValidation({
  initialValues: { name: '', code: '' },
  validators: { name: [{ type: 'required' }, { type: 'maxLength', value: 50 }] }
});
```

### Pattern 3: StandardForm (Multi-Step)

```javascript
<StandardForm
  steps={[{ label: 'Personal', fields: [...] }, { label: 'Employment', fields: [...] }]}
  validationSchema={schema}
  onSubmit={handleSubmit}
  autoSave={true}
/>
```

---

## 9. Role-Based UI

### 4-Tier Access Control

1. **Route-level**: `ProtectedRoute` + `ROUTE_PERMISSIONS` in `utils/roleConfig.js`
2. **Component-level**: `useAuth()` booleans
3. **Field-level**: `useFieldPermissions()` hook
4. **Sidebar**: Role-aware menu in `Layout.js`

### Using Field Permissions

```javascript
const { canViewField, canEditField } = useFieldPermissions();

// In JSX:
{canViewField('salary') && <SalarySection />}
<TextField disabled={!canEditField('email')} ... />
```

### Role Configuration (`utils/roleConfig.js`)

```javascript
export const ROUTE_PERMISSIONS = {
  '/employees': ['admin', 'hr', 'manager'],
  '/payroll-management': ['admin', 'hr'],
  '/leave-requests': ['admin', 'hr', 'manager', 'employee'],
  '/my-profile': ['admin', 'hr', 'manager', 'employee'],
  // ...
};

export function getDefaultDashboard(role) {
  switch (role) {
    case 'admin': case 'hr': return '/admin-dashboard';
    case 'manager': return '/manager-dashboard';
    default: return '/employee-dashboard';
  }
}
```

---

## 10. API Services

### Axios Configuration (`http-common.js`)

```javascript
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: true,  // Send httpOnly cookies
  headers: { 'Content-Type': 'application/json' }
});
```

**401 Interceptor**: On 401 response → queues failed request → calls `/auth/refresh-token` → retries queued requests. If refresh fails → redirect to `/login`.

### Service Pattern

```javascript
// services/employee.service.js
import http from '../http-common';

class EmployeeService {
  getAll(params) { return http.get('/employees', { params }); }
  getById(id) { return http.get(`/employees/${id}`); }
  create(data) { return http.post('/employees', data); }
  update(id, data) { return http.put(`/employees/${id}`, data); }
  delete(id) { return http.delete(`/employees/${id}`); }
}
export default new EmployeeService();
```

### Response Normalization

```javascript
import { normalizeResponse, normalizeError } from './serviceHelpers';

// normalizeResponse unwraps: { data: { data: actualData, pagination } }
// normalizeError creates Error with: .message, .status, .errors[]
```

---

## 11. Error Handling

### 3-Tier Error Boundaries

```
SmartErrorBoundary(application)     ← Wraps entire app
  └→ SmartErrorBoundary(routing)    ← Wraps Routes
       └→ SmartErrorBoundary(page)  ← Wraps each lazy component
```

Each level shows appropriate fallback UI and a "Retry" button.

### API Error Handling

```javascript
import { ApiResponseHandler } from '../utils/apiResponseHandler';

const result = await ApiResponseHandler.handleApiCall(() => service.create(data));
if (result.isSuccess()) {
  // result.data
} else {
  // result.getErrorMessage()
}
```

### useErrorRecovery Hook

```javascript
const { executeWithRecovery } = useErrorRecovery();
await executeWithRecovery(
  () => apiCall(),
  { maxRetries: 3, retryDelay: 1000, onError: handleError }
);
```

---

## 12. Notifications

```javascript
import { useNotifications } from '../contexts/NotificationContext';

const { showSuccess, showError, showWarning, showInfo } = useNotifications();

showSuccess('Employee created successfully');
showError('Failed to save changes');
showWarning('Unsaved changes will be lost');
```

Notistack auto-stacks up to 3 notifications (top-right, auto-hide 5s).

---

## 13. Component Patterns

### Feature Component Structure

```
components/features/employees/
├── EmployeeList.js              # List page with filters, pagination
├── EmployeeForm.js              # Create/edit form (multi-step)
├── EmployeeProfileModern.js     # Profile view with tabs
├── EmployeeRecords.js           # Records management
├── MyProfile.js                 # Employee's own profile
├── UserAccountManagementPage.js # User account admin
├── components/                  # Sub-components
│   ├── EmployeeTable.js
│   ├── EmployeeFilters.js
│   └── EmployeeCard.js
├── hooks/                       # Feature-specific hooks
│   └── useEmployeeData.js
└── tabs/                        # Profile tab contents
    ├── PersonalTab.js
    ├── EmploymentTab.js
    └── CompensationTab.js
```

### Shared Components

| Component | Usage |
|-----------|-------|
| `ConfirmDialog` | `const { dialogProps, confirm } = useConfirmDialog(); confirm({ title, message, onConfirm })` |
| `EmptyState` | Zero-data placeholder with icon + action button |
| `ResponsiveTable` | Desktop table / mobile card switch |
| `ResponsiveForm` | Responsive form container with stepper |
| `TabbedPage` | Page layout with tab navigation |
| `PhotoUpload` | Employee photo uploader with preview |

---

## 14. Adding a New Feature

### Step-by-Step Guide

**Example: Adding a "Training" module**

1. **Create API Service** (`services/training.service.js`)
2. **Create Query Hooks** (`hooks/queries/useTrainingQueries.js`)
3. **Create Components** (`components/features/training/`)
4. **Create Route Group** (`routes/trainingRoutes.js`) with `withBoundary()`
5. **Add Route Permissions** in `utils/roleConfig.js`
6. **Add Sidebar Menu** in `components/layout/Layout.js`
7. **Import Routes** in `App.js`

---

## 15. Build & Deploy

```bash
npm run build           # Production build → build/
npm run test            # Run Jest unit tests
npm run test:e2e        # Run Playwright E2E tests (from frontend/e2e-integration/)
```

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api    # Backend API URL
REACT_APP_ENV=development                       # Environment name
```

The production build is served by Nginx in Docker (see `nginx.conf`).

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
