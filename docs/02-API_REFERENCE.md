# API Reference

> **Last updated:** 2026-02-14 | **Total endpoints:** ~238 across 27 route files  
> **Base URL:** `http://localhost:5000/api` (dev) | Configured via `API_BASE_URL` env var

---

## Quick Reference

| # | Module | Prefix | Count |
|---|--------|--------|:-----:|
| 1 | [Authentication](#1-authentication) | `/api/auth` | 20 |
| 2 | [Users](#2-users) | `/api/users` | 3 |
| 3 | [Employees](#3-employees) | `/api/employees` | 20 |
| 4 | [Departments](#4-departments) | `/api/departments` | 5 |
| 5 | [Positions](#5-positions) | `/api/positions` | 5 |
| 6 | [Projects](#6-projects) | `/api/projects` | 7 |
| 7 | [Tasks](#7-tasks) | `/api/tasks` | 7 |
| 8 | [Timesheets](#8-timesheets) | `/api/timesheets` | 21 |
| 9 | [Leave Requests](#9-leave-requests) | `/api/leave` | 18 |
| 10 | [Leave Balance Admin](#10-leave-balance-admin) | `/api/admin/leave-balances` | 7 |
| 11 | [Leave Accrual](#11-leave-accrual) | `/api/leave-accrual` | 4 |
| 12 | [Payslips](#12-payslips) | `/api/payslips` | 17 |
| 13 | [Payslip Templates](#13-payslip-templates) | `/api/payslip-templates` | 11 |
| 14 | [Salary Structures](#14-salary-structures) | `/api/salary-structures` | 9 |
| 15 | [Payroll Data](#15-payroll-data) | `/api/payroll` | 15 |
| 16 | [Attendance](#16-attendance) | `/api/attendance` | 9 |
| 17 | [Holidays](#17-holidays) | `/api/holidays` | 7 |
| 18 | [Employee Reviews](#18-employee-reviews) | `/api/employee-reviews` | 7 |
| 19 | [Dashboard](#19-dashboard) | `/api/dashboard` | 3 |
| 20 | [Settings](#20-settings) | `/api/settings` | 2 |
| 21 | [Email](#21-email) | `/api/email` | 3 |
| 22 | [Admin Config](#22-admin-config) | `/api/admin/config` | 4 |
| 23 | [Admin Email Config](#23-admin-email-config) | `/api/admin` | 6 |
| 24 | [System Config](#24-system-config) | `/api/system-config` | 4 |
| 25 | [Performance](#25-performance) | `/api/performance` | 3 |
| 26 | [Restore](#26-restore) | `/api/restore` | 6 |
| 27 | [Debug](#27-debug-devtest-only) | `/api/debug` | 33 |

---

## Middleware Legend

| Shorthand | Full Name | Description |
|-----------|-----------|-------------|
| `auth` | `authenticateToken` | JWT verification (cookie or Bearer header) |
| `admin` | `authorize('admin')` | Admin role only |
| `adminHR` | `authorize(['admin','hr'])` | Admin or HR |
| `mgrPlus` | `authorize(['manager','admin','hr'])` | Manager, Admin, or HR |
| `allRoles` | `authorize(['employee','manager','admin','hr'])` | Any authenticated role |
| `validate(schema)` | Joi schema validation | Request body validation |
| `validateParams` | UUID param validation | Path parameter validation |
| `validateQuery` | Query string validation | Query string validation |
| `canAccess` | `canAccessEmployee` | Self/admin/HR/manager-of check |
| `isAdminOrHR` | Inline role check | Admin or HR role |
| `upload` | `multer` middleware | File upload handler |
| `rateLimit` | Various rate limiters | Per-route rate limiting |
| `fieldAccess` | `enhancedFieldAccessControl` | Field-level access control |
| `reauth` | `requirePasswordReauth` | Re-authentication required |

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

---

## 1. Authentication

**Route file:** `routes/auth.routes.js` (555 lines) | **Prefix:** `/api/auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/auth/login` | `validate(loginSchema)` | Login — returns JWT, sets cookies |
| 2 | POST | `/auth/logout` | `auth` | Logout — blacklists token, clears cookies |
| 3 | POST | `/auth/refresh-token` | — | Refresh access token |
| 4 | GET | `/auth/profile` | `auth` | Current user profile + employee data |
| 5 | GET | `/auth/me` | `auth` | Alias for `/profile` |
| 6 | PUT | `/auth/change-password` | `auth`, `validate` | Change own password |
| 7 | POST | `/auth/forgot-password` | `passwordResetLimiter` | Request password reset email |
| 8 | POST | `/auth/reset-password` | — | Reset password with token |
| 9 | POST | `/auth/verify-reset-token` | — | Verify reset token validity |
| 10 | POST | `/auth/cleanup-tokens` | `auth`, `admin` | Clean expired refresh tokens |
| 11 | POST | `/auth/register` | `auth`, `admin`, `validate` | Admin creates user account |
| 12 | GET | `/auth/users` | `auth`, `adminHR` | List all users (paginated) |
| 13 | PUT | `/auth/users/:userId/reset-password` | `auth`, `admin`, `validateParams` | Admin resets user password |
| 14 | PUT | `/auth/users/:userId/account` | `auth`, `admin`, `validateParams` | Update user account |
| 15 | POST | `/auth/users/employee/:employeeId` | `auth`, `admin` | Create user for employee |
| 16 | PUT | `/auth/users/:userId/role` | `auth`, `admin`, `validateParams` | Change user role |
| 17 | PUT | `/auth/users/:userId/status` | `auth`, `admin`, `validateParams` | Activate/deactivate user |
| 18 | PUT | `/auth/users/:userId/lock` | `auth`, `admin`, `validateParams` | Lock/unlock account |
| 19 | POST | `/auth/users/:userId/send-welcome-email` | `auth`, `admin` | Send welcome email |
| 20 | DELETE | `/auth/users/:userId` | `auth`, `admin`, `validateParams` | Soft-delete user |

**Login Request:**
```json
{ "email": "admin@example.com", "password": "SecurePass123!" }
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", "role": "admin|hr|manager|employee", "employeeId": "uuid|null" }
  },
  "message": "Login successful"
}
```
Sets cookies: `accessToken` (httpOnly, 15min), `refreshToken` (httpOnly, 7d, path `/api/auth`)

---

## 2. Users

**Prefix:** `/api/users`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/users` | `auth`, `admin` | List all users |
| 2 | GET | `/users/profile` | `auth` | Get own profile |
| 3 | PUT | `/users/profile` | `auth` | Update own profile |

---

## 3. Employees

**Prefix:** `/api/employees` | **Global:** `auth`, `enhancedFieldAccessControl`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/employees` | `validateQuery` | List employees (paginated, filtered) |
| 2 | GET | `/employees/me` | — | Get own employee record |
| 3 | GET | `/employees/statistics` | `isAdminOrHR` | Employee statistics/counts |
| 4 | GET | `/employees/meta/departments` | — | List departments (meta) |
| 5 | GET | `/employees/departments` | — | Alias for meta/departments |
| 6 | GET | `/employees/meta/positions` | — | List positions (meta) |
| 7 | GET | `/employees/positions` | — | Alias for meta/positions |
| 8 | GET | `/employees/managers` | `isAdminOrHR` | List managers |
| 9 | GET | `/employees/export` | `isAdminOrHR` | Export CSV |
| 10 | GET | `/employees/by-employee-id/:employeeId` | `canAccess` | Get by employee ID string |
| 11 | GET | `/employees/manager/:managerId/team` | `mgrPlus` | Manager's team members |
| 12 | GET | `/employees/team-members` | `mgrPlus` | Current user's team |
| 13 | GET | `/employees/:id` | `canAccess`, `validateParams` | Get by UUID |
| 14 | POST | `/employees` | `isAdminOrHR`, `upload`, `validate` | Create (with photo) |
| 15 | POST | `/employees/:id/photo` | `isAdminOrHR`, `upload` | Upload photo |
| 16 | POST | `/employees/bulk-update` | `isAdminOrHR` | Bulk update |
| 17 | PUT | `/employees/:id` | `profileUpdateLimiter`, `canAccess` | Update employee |
| 18 | PUT | `/employees/:id/compensation` | `isAdminOrHR`, `validate` | Update compensation |
| 19 | PATCH | `/employees/:id/status` | `isAdminOrHR`, `validate` | Change status |
| 20 | DELETE | `/employees/:id` | `isAdminOrHR`, `validateParams` | Soft-delete |

**Query Parameters (GET /employees):**
```
?page=1&limit=20&search=john&status=Active&departmentId=uuid&positionId=uuid&sortBy=firstName&sortOrder=asc
```

---

## 4. Departments

**Prefix:** `/api/departments`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/departments` | `auth` | List departments |
| 2 | GET | `/departments/:id` | `auth` | Get department |
| 3 | POST | `/departments` | `auth`, `adminHR` | Create |
| 4 | PUT | `/departments/:id` | `auth`, `adminHR` | Update |
| 5 | DELETE | `/departments/:id` | `auth`, `admin` | Soft-delete |

---

## 5. Positions

**Prefix:** `/api/positions`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/positions` | `auth` | List positions |
| 2 | GET | `/positions/:id` | `auth` | Get position |
| 3 | POST | `/positions` | `auth`, `adminHR` | Create |
| 4 | PUT | `/positions/:id` | `auth`, `adminHR` | Update |
| 5 | DELETE | `/positions/:id` | `auth`, `admin` | Soft-delete |

---

## 6. Projects

**Prefix:** `/api/projects`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/projects` | `auth` | List (RBAC-filtered, paged) |
| 2 | GET | `/projects/:id` | `auth` | Get project |
| 3 | POST | `/projects` | `auth`, `canModifyProjects`, `validate` | Create |
| 4 | PUT | `/projects/:id` | `auth`, `canModifyProjects`, `validate` | Update |
| 5 | DELETE | `/projects/:id` | `auth`, `admin` | Soft-delete |
| 6 | GET | `/projects/:id/stats` | `auth` | Statistics |
| 7 | GET | `/projects/:id/timeline` | `auth` | Timeline |

---

## 7. Tasks

**Prefix:** `/api/tasks`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/tasks` | `auth` | List (RBAC-filtered, paged) |
| 2 | GET | `/tasks/:id` | `auth` | Get task |
| 3 | POST | `/tasks` | `auth`, `canModifyTasks`, `validate` | Create |
| 4 | PUT | `/tasks/:id` | `auth`, permission check | Update (employees: limited) |
| 5 | DELETE | `/tasks/:id` | `auth`, `canModifyTasks` | Delete |
| 6 | POST | `/tasks/bulk` | `auth`, `canModifyTasks` | Bulk create |
| 7 | GET | `/tasks/workload/:employeeId` | `auth` | Employee workload |

---

## 8. Timesheets

**Prefix:** `/api/timesheets` | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/timesheets` | `validateQuery` | List (RBAC-filtered) |
| 2 | GET | `/timesheets/me` | — | Own timesheets |
| 3 | GET | `/timesheets/summary` | — | Summary |
| 4 | GET | `/timesheets/week/:weekStart` | — | By week start date |
| 5 | GET | `/timesheets/:id` | `validateParams` | Get by ID |
| 6 | POST | `/timesheets` | `validate` | Create entry |
| 7 | PUT | `/timesheets/:id` | `validateParams`, `validate` | Update |
| 8 | PATCH | `/timesheets/:id/submit` | `validateParams` | Submit for approval |
| 9 | PATCH | `/timesheets/:id/approve` | `mgrPlus`, `validateParams` | Approve |
| 10 | POST | `/timesheets/:id/approve` | `mgrPlus`, `validateParams` | Approve (alias) |
| 11 | PATCH | `/timesheets/:id/reject` | `mgrPlus`, `validateParams`, `validate` | Reject |
| 12 | POST | `/timesheets/:id/reject` | `mgrPlus`, `validateParams`, `validate` | Reject (alias) |
| 13 | POST | `/timesheets/bulk-submit` | `validate` | Bulk submit |
| 14 | POST | `/timesheets/week/submit` | `validate` | Weekly bulk submit |
| 15 | POST | `/timesheets/bulk-approve` | `mgrPlus` | Bulk approve |
| 16 | POST | `/timesheets/bulk-reject` | `bulkOperationLimiter`, `mgrPlus` | Bulk reject |
| 17 | GET | `/timesheets/approval/pending` | `isManagerOrAbove` | Pending approvals |
| 18 | GET | `/timesheets/stats/summary` | — | Stats summary |
| 19 | POST | `/timesheets/bulk-save` | — | Bulk save (max 100) |
| 20 | PUT | `/timesheets/bulk-update` | — | Bulk update (max 100) |
| 21 | DELETE | `/timesheets/:id` | `allRoles`, `validateParams` | Delete |

---

## 9. Leave Requests

**Prefix:** `/api/leave` (also mounted at `/api/leaves`) | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/leave` | `validateQuery` | List leave requests |
| 2 | GET | `/leave/me` | — | Own leaves |
| 3 | GET | `/leave/statistics` | `adminHR` | Leave statistics |
| 4 | GET | `/leave/balance/:employeeId` | — | Employee balance |
| 5 | GET | `/leave/meta/types` | — | Leave types |
| 6 | GET | `/leave/meta/balance` | — | Own balance |
| 7 | GET | `/leave/balance` | `adminHR` | All balances |
| 8 | GET | `/leave/pending-for-manager` | `mgrPlus` | Manager's pending |
| 9 | GET | `/leave/manager/:managerId/pending` | `validateParams` | Specific manager pending |
| 10 | GET | `/leave/recent-approvals` | `mgrPlus` | Recent approvals |
| 11 | GET | `/leave/:id` | `validateParams` | Get by ID |
| 12 | POST | `/leave` | `validate` | Create request |
| 13 | PUT | `/leave/:id` | `validateParams` | Update |
| 14 | PATCH/PUT | `/leave/:id/approve` | `mgrPlus`, `validateParams` | Approve |
| 15 | PATCH/PUT | `/leave/:id/reject` | `mgrPlus`, `validateParams` | Reject |
| 16 | PATCH/POST | `/leave/:id/cancel` | `validateParams` | Cancel |
| 17 | POST | `/leave/:id/approve-cancellation` | `mgrPlus`, `validateParams` | Approve cancellation |
| 18 | DELETE | `/leave/:id` | `allRoles`, `validateParams` | Delete |

---

## 10. Leave Balance Admin

**Prefix:** `/api/admin/leave-balances` | **Global:** `auth`, `adminHR`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/admin/leave-balances` | — | List (paginated, filtered) |
| 2 | GET | `/admin/leave-balances/:id` | — | Get single balance |
| 3 | POST | `/admin/leave-balances` | — | Create balance |
| 4 | PUT | `/admin/leave-balances/:id` | — | Update (audit logged) |
| 5 | DELETE | `/admin/leave-balances/:id` | — | Delete (audit logged) |
| 6 | POST | `/admin/leave-balances/bulk/initialize` | — | Bulk init all active employees |
| 7 | GET | `/admin/leave-balances/summary/overview` | — | Summary by type |

---

## 11. Leave Accrual

**Prefix:** `/api/leave-accrual` | **Global:** `auth`, `adminHR`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/leave-accrual/status` | — | Accrual status by year |
| 2 | GET | `/leave-accrual/preview` | — | Preview next accrual (dry-run) |
| 3 | POST | `/leave-accrual/run` | `admin` | Manually trigger accrual |
| 4 | POST | `/leave-accrual/carry-forward` | `admin` | Year-end carry forward |

---

## 12. Payslips

**Prefix:** `/api/payslips` | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/payslips` | — | List all payslips |
| 2 | GET | `/payslips/my` | — | Own payslips |
| 3 | GET | `/payslips/history/:employeeId` | — | Employee history |
| 4 | GET | `/payslips/reports/summary` | `isAdminOrHR` | Summary report |
| 5 | GET | `/payslips/reports/export` | `isAdminOrHR` | Export report |
| 6 | GET | `/payslips/:id` | — | Get by ID |
| 7 | GET | `/payslips/:id/pdf` | — | Download PDF |
| 8 | POST | `/payslips/calculate-preview` | `isAdminOrHR` | Calculate preview |
| 9 | POST | `/payslips/validate` | `isAdminOrHR` | Validate employees |
| 10 | POST | `/payslips/generate` | `isAdminOrHR` | Generate payslips |
| 11 | POST | `/payslips/generate-all` | `isAdminOrHR` | Generate all |
| 12 | PUT | `/payslips/:id` | `isAdminOrHR` | Update |
| 13 | PUT | `/payslips/:id/finalize` | `isAdminOrHR` | Finalize |
| 14 | PUT | `/payslips/:id/mark-paid` | `isAdminOrHR` | Mark paid |
| 15 | POST | `/payslips/bulk-finalize` | `isAdminOrHR` | Bulk finalize |
| 16 | POST | `/payslips/bulk-paid` | `isAdminOrHR` | Bulk mark paid |
| 17 | DELETE | `/payslips/bulk` | `admin` | Bulk delete |

---

## 13. Payslip Templates

**Prefix:** `/api/payslip-templates`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/payslip-templates/debug/test` | `auth`, `admin` | Debug test |
| 2 | GET | `/payslip-templates` | `auth`, `isAdminOrHR` | List templates |
| 3 | GET | `/payslip-templates/active` | `auth` | Active templates |
| 4 | GET | `/payslip-templates/default/template` | `auth` | Get/create default |
| 5 | GET | `/payslip-templates/:id` | `auth`, `isAdminOrHR` | Get by ID |
| 6 | POST | `/payslip-templates` | `auth`, `isAdminOrHR`, `validate` | Create |
| 7 | PUT | `/payslip-templates/:id` | `auth`, `isAdminOrHR`, `validate` | Update |
| 8 | POST | `/payslip-templates/:id/duplicate` | `auth`, `isAdminOrHR`, `validate` | Duplicate |
| 9 | POST | `/payslip-templates/:id/set-default` | `auth`, `isAdminOrHR` | Set default |
| 10 | POST | `/payslip-templates/:id/toggle-status` | `auth`, `isAdminOrHR` | Toggle status |
| 11 | DELETE | `/payslip-templates/:id` | `auth`, `admin` | Delete |

---

## 14. Salary Structures

**Prefix:** `/api/salary-structures` | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/salary-structures` | `adminHR` | List all |
| 2 | GET | `/salary-structures/employee/:employeeId` | `adminHR`/self | All for employee |
| 3 | GET | `/salary-structures/employee/:employeeId/current` | `adminHR`/self | Current active |
| 4 | GET | `/salary-structures/:id` | `adminHR` | Get by ID |
| 5 | POST | `/salary-structures` | `adminHR`, `validate` | Create |
| 6 | PUT | `/salary-structures/:id` | `adminHR`, `validate` | Update |
| 7 | POST | `/salary-structures/:id/activate` | `adminHR` | Activate |
| 8 | POST | `/salary-structures/:id/deactivate` | `adminHR` | Deactivate |
| 9 | DELETE | `/salary-structures/:id` | `admin` | Delete |

---

## 15. Payroll Data

**Prefix:** `/api/payroll` (also `/api/payroll-data`) | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/payroll` | `adminHR` | List records |
| 2 | GET | `/payroll/summary` | `adminHR` | Summary |
| 3 | GET | `/payroll/employee/:employeeId` | RBAC | Employee payroll |
| 4 | GET | `/payroll/:id` | `validateParams` | Get by ID |
| 5 | POST | `/payroll/calculate` | `adminHR`, `validate` | Calculate |
| 6 | POST | `/payroll` | `adminHR`, `validate` | Create |
| 7 | PUT | `/payroll/:id` | `adminHR`, `validate` | Update |
| 8 | POST | `/payroll/:id/submit` | `adminHR` | Submit for approval |
| 9 | POST | `/payroll/:id/approve` | `adminHR` | Approve |
| 10 | POST | `/payroll/:id/process` | `admin` | Process |
| 11 | POST | `/payroll/:id/payslip` | `adminHR` | Generate payslip |
| 12 | POST | `/payroll/bulk-approve` | `adminHR` | Bulk approve |
| 13 | DELETE | `/payroll/:id` | `admin` | Delete |
| 14 | POST | `/payroll/import-csv` | `admin`, `upload` | Import CSV |
| 15 | GET | `/payroll/export-csv` | `adminHR` | Export CSV |

---

## 16. Attendance

**Prefix:** `/api/attendance` | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/attendance/check-in` | — | Self check-in |
| 2 | POST | `/attendance/check-out` | — | Self check-out |
| 3 | GET | `/attendance/today` | — | Today's status |
| 4 | GET | `/attendance/my` | — | Own (date range) |
| 5 | GET | `/attendance/my/report` | — | Own monthly report |
| 6 | GET | `/attendance/daily` | `mgrPlus` | Daily report |
| 7 | GET | `/attendance/employee/:employeeId/report` | `mgrPlus` | Employee report |
| 8 | POST | `/attendance/mark` | `adminHR` | Manual marking |
| 9 | GET | `/attendance/summary` | `mgrPlus` | Summary |

---

## 17. Holidays

**Prefix:** `/api/holidays` | **Global:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/holidays` | — | List (year/type filter) |
| 2 | GET | `/holidays/count` | — | Count in date range |
| 3 | GET | `/holidays/:id` | — | Get by ID |
| 4 | POST | `/holidays` | `adminHR` | Create |
| 5 | PUT | `/holidays/:id` | `adminHR` | Update |
| 6 | DELETE | `/holidays/:id` | `admin` | Delete |
| 7 | POST | `/holidays/bulk` | `adminHR` | Bulk create |

---

## 18. Employee Reviews

**Prefix:** `/api/employee-reviews`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/employee-reviews` | `auth` | List (RBAC-filtered) |
| 2 | GET | `/employee-reviews/meta/dashboard` | `auth` | Dashboard stats |
| 3 | GET | `/employee-reviews/:id` | `auth` | Get by ID |
| 4 | POST | `/employee-reviews` | `auth`, `mgrPlus` | Create |
| 5 | PUT | `/employee-reviews/:id` | `auth` | Update (self-assessment) |
| 6 | PUT | `/employee-reviews/:id/status` | `auth`, role check | Update status / HR approve |
| 7 | DELETE | `/employee-reviews/:id` | `auth`, `adminHR` | Delete |

---

## 19. Dashboard

**Prefix:** `/api/dashboard`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/dashboard/employee-stats` | `auth` | Employee-facing stats |
| 2 | GET | `/dashboard/stats` | `auth` | Role-based stats |
| 3 | GET | `/dashboard/admin-stats` | `auth`, `isAdminOrHR` | Admin statistics |

---

## 20. Settings

**Prefix:** `/api/settings`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/settings/payslip-template` | `auth` | Get payslip template settings |
| 2 | PUT | `/settings/payslip-template` | `isAdminOrHR`, `upload` | Update with logo |

---

## 21. Email

**Prefix:** `/api/email`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/email/welcome/:userId` | `auth`, `adminHR` | Send welcome email |
| 2 | POST | `/email/password-reset/:userId` | `auth`, `adminHR` | Send password reset |
| 3 | POST | `/email/account-status/:userId` | `auth`, `adminHR` | Send status email |

---

## 22. Admin Config

**Prefix:** `/api/admin/config` | **Global:** `auth`, `admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/admin/config` | — | Get effective config |
| 2 | POST | `/admin/config/toggle-seeding` | — | Toggle demo seeding flag |
| 3 | POST | `/admin/config/seed-now` | — | Run demo data seeding |
| 4 | POST | `/admin/config/purge-demo` | — | Purge demo data |

---

## 23. Admin Email Config

**Prefix:** `/api/admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/admin/email-config` | `auth`, `admin` | Get email config |
| 2 | POST | `/admin/email-config` | `auth`, `admin`, `validate` | Update email config |
| 3 | POST | `/admin/email-config/test` | `auth`, `admin` | Test connection |
| 4 | POST | `/admin/email-config/send-test` | `auth`, `admin`, `validate` | Send test email |
| 5 | GET | `/admin/email-config/history` | `auth`, `admin` | Change history |
| 6 | POST | `/admin/email-config/rollback` | `auth`, `admin` | Rollback config |

---

## 24. System Config

**Prefix:** `/api/system-config`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/system-config/view` | `auth`, `admin`, `reauth` | View config (re-auth) |
| 2 | PUT | `/system-config/update` | `auth`, `admin`, `reauth` | Update config |
| 3 | GET | `/system-config/audit-trail` | `auth`, `admin` | Change audit trail |
| 4 | POST | `/system-config/verify-password` | `auth`, `admin` | Verify admin password |

---

## 25. Performance

**Prefix:** `/api/performance`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/performance/server-metrics` | `auth`, `admin` | Server metrics |
| 2 | GET | `/performance/api-metrics` | `auth`, `admin` | API metrics |
| 3 | GET | `/performance/health-metrics` | `auth` | Basic health |

---

## 26. Restore

**Prefix:** `/api/restore` | **Global:** `auth`, `admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/restore/employee-reviews` | — | Deleted reviews |
| 2 | GET | `/restore/leave-balances` | — | Deleted balances |
| 3 | GET | `/restore/users` | — | Deleted users |
| 4 | POST | `/restore/employee-reviews/:id` | — | Restore review |
| 5 | POST | `/restore/leave-balances/:id` | — | Restore balance |
| 6 | POST | `/restore/users/:id` | — | Restore user |

---

## 27. Debug (dev/test only)

**Prefix:** `/api/debug` | **Guard:** `NODE_ENV !== 'production'` | **Global:** `auth`, `admin`

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/debug/stats` | Database stats |
| 2 | GET | `/debug/employees` | List employees |
| 3 | GET | `/debug/users` | List users |
| 4 | GET | `/debug/departments` | List departments |
| 5 | GET | `/debug/positions` | List positions |
| 6 | GET | `/debug/leaves` | List leaves |
| 7 | GET | `/debug/timesheets` | List timesheets |
| 8 | GET | `/debug/payslips` | List payslips |
| 9 | PUT | `/debug/leaves/:id/approve` | Force-approve |
| 10 | PUT | `/debug/leaves/:id/reject` | Force-reject |
| 11 | POST | `/debug/seed-demo` | Seed demo data |
| 12 | POST | `/debug/sql` | Execute raw SQL |
| 13 | GET | `/debug/system/info` | OS/CPU/memory |
| 14 | GET | `/debug/system/database` | DB status |
| 15–18 | — | `/debug/config/*` | Config CRUD + backup/restore |
| 19–24 | — | `/debug/logs/*` | Log file operations |
| 25–33 | — | `/debug/database/*` | DB admin (tables, schema, data, SQL, explain, connections, backup) |
