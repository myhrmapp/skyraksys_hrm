# SkyRakSys HRM — Comprehensive Technical Documentation

> **Generated from source code analysis** | **Stack:** Node.js / Express / Sequelize / PostgreSQL  
> **Backend path:** `skyraksys_hrm_app/backend/` | **Port:** 5000 (env configurable)

---

# PART A — COMPLETE API REFERENCE

## Table of Contents — API

| # | Module | Prefix | Endpoints |
|---|--------|--------|-----------|
| 1 | [Authentication](#1-authentication) | `/api/auth` | 20 |
| 2 | [Users](#2-users) | `/api/users` | 3 |
| 3 | [Employees](#3-employees) | `/api/employees` | 20 |
| 4 | [Departments](#4-departments) | `/api/departments` | 5 |
| 5 | [Positions](#5-positions) | `/api/positions` | 5 |
| 6 | [Projects](#6-projects) | `/api/projects` | 7 |
| 7 | [Tasks](#7-tasks) | `/api/tasks` | 7 |
| 8 | [Timesheets](#8-timesheets) | `/api/timesheets` | 21 |
| 9 | [Leave Requests](#9-leave-requests) | `/api/leave`, `/api/leaves` | 18 |
| 10 | [Leave Balance Admin](#10-leave-balance-admin) | `/api/admin/leave-balances` | 7 |
| 11 | [Leave Accrual](#11-leave-accrual) | `/api/leave-accrual` | 4 |
| 12 | [Payslips](#12-payslips) | `/api/payslips` | 17 |
| 13 | [Payslip Templates](#13-payslip-templates) | `/api/payslip-templates` | 10 |
| 14 | [Salary Structures](#14-salary-structures) | `/api/salary-structures` | 9 |
| 15 | [Payroll Data](#15-payroll-data) | `/api/payroll`, `/api/payroll-data` | 15 |
| 16 | [Attendance](#16-attendance) | `/api/attendance` | 9 |
| 17 | [Holidays](#17-holidays) | `/api/holidays` | 7 |
| 18 | [Employee Reviews](#18-employee-reviews) | `/api/employee-reviews` | 6 |
| 19 | [Dashboard](#19-dashboard) | `/api/dashboard` | 3 |
| 20 | [Settings](#20-settings) | `/api/settings` | 2 |
| 21 | [Email](#21-email) | `/api/email` | 3 |
| 22 | [Admin Config](#22-admin-config) | `/api/admin/config` | 4 |
| 23 | [Admin — Email Config](#23-admin--email-config) | `/api/admin` | 6 |
| 24 | [System Config](#24-system-config) | `/api/system-config` | 4 |
| 25 | [Performance](#25-performance) | `/api/performance` | 3 |
| 26 | [Restore](#26-restore) | `/api/restore` | 6 |
| 27 | [Debug (dev/test only)](#27-debug-devtest-only) | `/api/debug` | 24+ |
| | **TOTAL** | | **~238** |

---

### Middleware Legend

| Shorthand | Full Name | Description |
|-----------|-----------|-------------|
| `auth` | `authenticateToken` | JWT verification (cookie or Bearer header) |
| `admin` | `authorize('admin')` | Admin role only |
| `adminHR` | `authorize(['admin','hr'])` | Admin or HR |
| `mgrPlus` | `authorize(['manager','admin','hr'])` | Manager, Admin, or HR |
| `allRoles` | `authorize(['employee','manager','admin','hr'])` | Any authenticated role |
| `validate(schema)` | Joi/schema validation | Request body validation |
| `validateParams` | UUID param validation | Path parameter validation |
| `validateQuery` | Query string validation | Query string validation |
| `canAccess` | `canAccessEmployee` | Self/admin/HR/manager-of check |
| `isAdminOrHR` | Inline role check | Admin or HR role |
| `upload` | `multer` middleware | File upload handler |
| `rateLimit` | Rate limiter | Per-route rate limiting |
| `fieldAccess` | `enhancedFieldAccessControl` | Field-level access control |
| `reauth` | `requirePasswordReauth` | Re-authentication required |

---

## 1. Authentication

**Route file:** `routes/auth.routes.js` (555 lines)  
**Prefix:** `/api/auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/api/auth/login` | `validate(loginSchema)` | User login — returns JWT tokens, sets cookies |
| 2 | POST | `/api/auth/logout` | `auth` | Logout — blacklists token, clears cookies |
| 3 | POST | `/api/auth/refresh-token` | — | Refresh access token using refresh token |
| 4 | GET | `/api/auth/profile` | `auth` | Get current user profile with employee data |
| 5 | GET | `/api/auth/me` | `auth` | Alias for `/profile` |
| 6 | PUT | `/api/auth/change-password` | `auth`, `validate(changePasswordSchema)` | Change own password |
| 7 | POST | `/api/auth/forgot-password` | `passwordResetLimiter` | Request password reset email |
| 8 | POST | `/api/auth/reset-password` | — | Reset password with token |
| 9 | POST | `/api/auth/verify-reset-token` | — | Verify password reset token validity |
| 10 | POST | `/api/auth/cleanup-tokens` | `auth`, `admin` | Clean up expired refresh tokens |
| 11 | POST | `/api/auth/register` | `auth`, `admin`, `validate(adminRegisterSchema)` | Admin creates new user account |
| 12 | GET | `/api/auth/users` | `auth`, `adminHR` | List all users (paginated, filterable) |
| 13 | PUT | `/api/auth/users/:userId/reset-password` | `auth`, `admin`, `validateParams`, `validate` | Admin reset user password |
| 14 | PUT | `/api/auth/users/:userId/account` | `auth`, `admin`, `validateParams`, `validate` | Update user account details |
| 15 | POST | `/api/auth/users/employee/:employeeId` | `auth`, `admin`, `validateParams` | Create user account for existing employee |
| 16 | PUT | `/api/auth/users/:userId/role` | `auth`, `admin`, `validateParams`, `validate` | Change user role |
| 17 | PUT | `/api/auth/users/:userId/status` | `auth`, `admin`, `validateParams`, `validate` | Activate/deactivate user |
| 18 | PUT | `/api/auth/users/:userId/lock` | `auth`, `admin`, `validateParams`, `validate` | Lock/unlock user account |
| 19 | POST | `/api/auth/users/:userId/send-welcome-email` | `auth`, `admin`, `validateParams` | Send welcome email to user |
| 20 | DELETE | `/api/auth/users/:userId` | `auth`, `admin`, `validateParams` | Soft-delete user account |

**Login Request Body:**
```json
{ "email": "string (required)", "password": "string (required)" }
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "string", "role": "string", "employeeId": "uuid|null" }
  },
  "message": "Login successful"
}
```
Cookies set: `accessToken` (httpOnly, 15min, path `/`), `refreshToken` (httpOnly, 7d, path `/api/auth`)

---

## 2. Users

**Route file:** `routes/user.routes.js`  
**Prefix:** `/api/users`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/users` | `auth`, `admin` | List all users |
| 2 | GET | `/api/users/profile` | `auth` | Get own profile |
| 3 | PUT | `/api/users/profile` | `auth` | Update own profile |

---

## 3. Employees

**Route file:** `routes/employee.routes.js`  
**Prefix:** `/api/employees`  
**Global middleware:** `auth`, `enhancedFieldAccessControl`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/employees` | `validateQuery(employeeQuerySchema)` | List employees (paginated, filtered) |
| 2 | GET | `/api/employees/me` | — | Get own employee record |
| 3 | GET | `/api/employees/statistics` | `isAdminOrHR` | Employee statistics/counts |
| 4 | GET | `/api/employees/meta/departments` | — | List departments (meta) |
| 5 | GET | `/api/employees/departments` | — | Alias for meta/departments |
| 6 | GET | `/api/employees/meta/positions` | — | List positions (meta) |
| 7 | GET | `/api/employees/positions` | — | Alias for meta/positions |
| 8 | GET | `/api/employees/managers` | `isAdminOrHR` | List employees who are managers |
| 9 | GET | `/api/employees/export` | `isAdminOrHR` | Export employees to CSV |
| 10 | GET | `/api/employees/by-employee-id/:employeeId` | `canAccess` | Get by employee ID string |
| 11 | GET | `/api/employees/manager/:managerId/team` | `mgrPlus` | Get manager's team members |
| 12 | GET | `/api/employees/team-members` | `mgrPlus` | Get current user's team |
| 13 | GET | `/api/employees/:id` | `canAccess`, `validateParams` | Get employee by UUID |
| 14 | POST | `/api/employees` | `isAdminOrHR`, `upload`, `validate(createEmployeeSchema)` | Create employee (with photo) |
| 15 | POST | `/api/employees/:id/photo` | `isAdminOrHR`, `upload`, `validateParams` | Upload employee photo |
| 16 | POST | `/api/employees/bulk-update` | `isAdminOrHR` | Bulk update employees |
| 17 | PUT | `/api/employees/:id` | `profileUpdateLimiter`, `canAccess`, `validateParams` | Update employee |
| 18 | PUT | `/api/employees/:id/compensation` | `isAdminOrHR`, `validateParams`, `validate(updateCompensationSchema)` | Update compensation |
| 19 | PATCH | `/api/employees/:id/status` | `isAdminOrHR`, `validateParams`, `validate(updateStatusSchema)` | Change employee status |
| 20 | DELETE | `/api/employees/:id` | `isAdminOrHR`, `validateParams` | Soft-delete employee |

---

## 4. Departments

**Route file:** `routes/department.routes.js` (420 lines)  
**Prefix:** `/api/departments`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/departments` | `auth` | List departments (optional pagination) |
| 2 | GET | `/api/departments/:id` | `auth` | Get department by ID |
| 3 | POST | `/api/departments` | `auth`, inline `adminHR` | Create department |
| 4 | PUT | `/api/departments/:id` | `auth`, inline `adminHR` | Update department |
| 5 | DELETE | `/api/departments/:id` | `auth`, inline `admin` | Soft-delete department |

---

## 5. Positions

**Route file:** `routes/position.routes.js` (459 lines)  
**Prefix:** `/api/positions`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/positions` | `auth` | List positions (optional pagination) |
| 2 | GET | `/api/positions/:id` | `auth` | Get position by ID |
| 3 | POST | `/api/positions` | `auth`, inline `adminHR` | Create position |
| 4 | PUT | `/api/positions/:id` | `auth`, inline `adminHR` | Update position |
| 5 | DELETE | `/api/positions/:id` | `auth`, inline `admin` | Soft-delete position |

---

## 6. Projects

**Route file:** `routes/project.routes.js` (680 lines)  
**Prefix:** `/api/projects`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/projects` | `auth` | List projects (RBAC-filtered, paged) |
| 2 | GET | `/api/projects/:id` | `auth` | Get project by ID |
| 3 | POST | `/api/projects` | `auth`, `canModifyProjects`, `validate(projectSchema.create)` | Create project |
| 4 | PUT | `/api/projects/:id` | `auth`, `canModifyProjects`, `validate(projectSchema.update)` | Update project |
| 5 | DELETE | `/api/projects/:id` | `auth`, inline `admin` | Soft-delete project |
| 6 | GET | `/api/projects/:id/stats` | `auth` | Project statistics |
| 7 | GET | `/api/projects/:id/timeline` | `auth` | Project timeline |

---

## 7. Tasks

**Route file:** `routes/task.routes.js` (636 lines)  
**Prefix:** `/api/tasks`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/tasks` | `auth` | List tasks (RBAC-filtered, paged) |
| 2 | GET | `/api/tasks/:id` | `auth` | Get task (access check) |
| 3 | POST | `/api/tasks` | `auth`, `canModifyTasks`, `validate(taskSchema.create)` | Create task |
| 4 | PUT | `/api/tasks/:id` | `auth`, permission check | Update task (employees: limited fields) |
| 5 | DELETE | `/api/tasks/:id` | `auth`, `canModifyTasks` | Delete task |
| 6 | POST | `/api/tasks/bulk` | `auth`, `canModifyTasks` | Bulk create tasks |
| 7 | GET | `/api/tasks/workload/:employeeId` | `auth` | Get employee workload |

---

## 8. Timesheets

**Route file:** `routes/timesheet.routes.js` (672 lines)  
**Prefix:** `/api/timesheets`  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/timesheets` | `validateQuery(timesheetQuerySchema)` | List timesheets (RBAC-filtered) |
| 2 | GET | `/api/timesheets/me` | — | Get own timesheets |
| 3 | GET | `/api/timesheets/summary` | — | Get summary |
| 4 | GET | `/api/timesheets/week/:weekStart` | — | Get by week start date |
| 5 | GET | `/api/timesheets/:id` | `validateParams` | Get by ID |
| 6 | POST | `/api/timesheets` | `validate(createTimesheetSchema)` | Create timesheet entry |
| 7 | PUT | `/api/timesheets/:id` | `validateParams`, `validate(updateTimesheetSchema)` | Update timesheet |
| 8 | PATCH | `/api/timesheets/:id/submit` | `validateParams` | Submit for approval |
| 9 | PATCH | `/api/timesheets/:id/approve` | `mgrPlus`, `validateParams` | Approve timesheet |
| 10 | POST | `/api/timesheets/:id/approve` | `mgrPlus`, `validateParams` | Approve (POST alias) |
| 11 | PATCH | `/api/timesheets/:id/reject` | `mgrPlus`, `validateParams`, `validate(timesheetApprovalSchema)` | Reject timesheet |
| 12 | POST | `/api/timesheets/:id/reject` | `mgrPlus`, `validateParams`, `validate(timesheetApprovalSchema)` | Reject (POST alias) |
| 13 | POST | `/api/timesheets/bulk-submit` | `validate(bulkSubmitTimesheetSchema)` | Bulk submit timesheets |
| 14 | POST | `/api/timesheets/week/submit` | `validate(bulkSubmitTimesheetSchema)` | Weekly bulk submit |
| 15 | POST | `/api/timesheets/bulk-approve` | `mgrPlus` | Bulk approve |
| 16 | POST | `/api/timesheets/bulk-reject` | `bulkOperationLimiter`, `mgrPlus` | Bulk reject |
| 17 | GET | `/api/timesheets/approval/pending` | `isManagerOrAbove` | Pending approvals |
| 18 | GET | `/api/timesheets/stats/summary` | — | Stats summary |
| 19 | POST | `/api/timesheets/bulk-save` | — | Bulk save (max 100) |
| 20 | PUT | `/api/timesheets/bulk-update` | — | Bulk update (max 100) |
| 21 | DELETE | `/api/timesheets/:id` | `allRoles`, `validateParams` | Delete timesheet |

---

## 9. Leave Requests

**Route file:** `routes/leave.routes.js`  
**Prefix:** `/api/leave` and `/api/leaves` (dual mount)  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/leave` | `validateQuery(leaveQuerySchema)` | List leave requests |
| 2 | GET | `/api/leave/me` | — | Get own leaves |
| 3 | GET | `/api/leave/statistics` | `adminHR` | Leave statistics |
| 4 | GET | `/api/leave/balance/:employeeId` | — | Get employee balance |
| 5 | GET | `/api/leave/meta/types` | — | List leave types |
| 6 | GET | `/api/leave/meta/balance` | — | Own leave balance |
| 7 | GET | `/api/leave/balance` | `adminHR` | All employee balances |
| 8 | GET | `/api/leave/pending-for-manager` | `mgrPlus` | Manager's pending requests |
| 9 | GET | `/api/leave/manager/:managerId/pending` | `validateParams` | Specific manager's pending |
| 10 | GET | `/api/leave/recent-approvals` | `mgrPlus` | Recent approval history |
| 11 | GET | `/api/leave/:id` | `validateParams` | Get leave by ID |
| 12 | POST | `/api/leave` | `validate(createLeaveRequestSchema)` | Create leave request |
| 13 | PUT | `/api/leave/:id` | `validateParams` | Update leave request |
| 14 | PATCH/PUT | `/api/leave/:id/approve` | `mgrPlus`, `validateParams` | Approve leave |
| 15 | PATCH/PUT | `/api/leave/:id/reject` | `mgrPlus`, `validateParams` | Reject leave |
| 16 | PATCH/POST | `/api/leave/:id/cancel` | `validateParams` | Cancel leave |
| 17 | POST | `/api/leave/:id/approve-cancellation` | `mgrPlus`, `validateParams` | Approve cancellation |
| 18 | DELETE | `/api/leave/:id` | `allRoles`, `validateParams` | Delete leave request |

---

## 10. Leave Balance Admin

**Route file:** `routes/leave-balance-admin.routes.js` (569 lines)  
**Prefix:** `/api/admin/leave-balances`  
**Global middleware:** `auth`, inline `adminHR` check

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/admin/leave-balances` | — | List balances (paginated, filtered) |
| 2 | GET | `/api/admin/leave-balances/:id` | — | Get single balance |
| 3 | POST | `/api/admin/leave-balances` | — | Create balance record |
| 4 | PUT | `/api/admin/leave-balances/:id` | — | Update balance (audit logged) |
| 5 | DELETE | `/api/admin/leave-balances/:id` | — | Delete balance (audit logged) |
| 6 | POST | `/api/admin/leave-balances/bulk/initialize` | — | Bulk init balances for all active employees |
| 7 | GET | `/api/admin/leave-balances/summary/overview` | — | Leave balance summary by type |

---

## 11. Leave Accrual

**Route file:** `routes/leave-accrual.routes.js`  
**Prefix:** `/api/leave-accrual`  
**Global middleware:** `auth`, `adminHR`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/leave-accrual/status` | — | Accrual status by year |
| 2 | GET | `/api/leave-accrual/preview` | — | Preview next accrual (dry-run) |
| 3 | POST | `/api/leave-accrual/run` | `admin` | Manually trigger accrual |
| 4 | POST | `/api/leave-accrual/carry-forward` | `admin` | Year-end carry forward |

---

## 12. Payslips

**Route file:** `routes/payslipRoutes.js`  
**Prefix:** `/api/payslips`  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/payslips` | — | List all payslips |
| 2 | GET | `/api/payslips/my` | — | Get own payslips |
| 3 | GET | `/api/payslips/history/:employeeId` | — | Employee payslip history |
| 4 | GET | `/api/payslips/reports/summary` | `isAdminOrHR` | Summary report |
| 5 | GET | `/api/payslips/reports/export` | `isAdminOrHR` | Export report |
| 6 | GET | `/api/payslips/:id` | — | Get payslip by ID |
| 7 | GET | `/api/payslips/:id/pdf` | — | Download payslip PDF |
| 8 | POST | `/api/payslips/calculate-preview` | `isAdminOrHR` | Calculate preview |
| 9 | POST | `/api/payslips/validate` | `isAdminOrHR` | Validate employees |
| 10 | POST | `/api/payslips/generate` | `isAdminOrHR` | Generate payslips |
| 11 | POST | `/api/payslips/generate-all` | `isAdminOrHR` | Generate all payslips |
| 12 | PUT | `/api/payslips/:id` | `isAdminOrHR` | Update payslip |
| 13 | PUT | `/api/payslips/:id/finalize` | `isAdminOrHR` | Finalize payslip |
| 14 | PUT | `/api/payslips/:id/mark-paid` | `isAdminOrHR` | Mark as paid |
| 15 | POST | `/api/payslips/bulk-finalize` | `isAdminOrHR` | Bulk finalize |
| 16 | POST | `/api/payslips/bulk-paid` | `isAdminOrHR` | Bulk mark paid |
| 17 | DELETE | `/api/payslips/bulk` | `admin` | Bulk delete payslips |

---

## 13. Payslip Templates

**Route file:** `routes/payslipTemplateRoutes.js` (559 lines)  
**Prefix:** `/api/payslip-templates`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/payslip-templates/debug/test` | `auth`, `admin` | Debug test endpoint |
| 2 | GET | `/api/payslip-templates` | `auth`, `isAdminOrHR`, `validateQuery` | List templates |
| 3 | GET | `/api/payslip-templates/active` | `auth` | List active templates |
| 4 | GET | `/api/payslip-templates/default/template` | `auth` | Get (or auto-create) default template |
| 5 | GET | `/api/payslip-templates/:id` | `auth`, `isAdminOrHR`, `validateParams` | Get template by ID |
| 6 | POST | `/api/payslip-templates` | `auth`, `isAdminOrHR`, `validate(createTemplate)` | Create template |
| 7 | PUT | `/api/payslip-templates/:id` | `auth`, `isAdminOrHR`, `validateParams`, `validate(updateTemplate)` | Update template |
| 8 | POST | `/api/payslip-templates/:id/duplicate` | `auth`, `isAdminOrHR`, `validateParams`, `validate(duplicateTemplate)` | Duplicate template |
| 9 | POST | `/api/payslip-templates/:id/set-default` | `auth`, `isAdminOrHR`, `validateParams` | Set as default |
| 10 | POST | `/api/payslip-templates/:id/toggle-status` | `auth`, `isAdminOrHR`, `validateParams` | Toggle active status |
| 11 | DELETE | `/api/payslip-templates/:id` | `auth`, `admin`, `validateParams` | Delete template |

---

## 14. Salary Structures

**Route file:** `routes/salaryStructureRoutes.js` (398 lines)  
**Prefix:** `/api/salary-structures`  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/salary-structures` | `adminHR`, `validateQuery` | List salary structures |
| 2 | GET | `/api/salary-structures/employee/:employeeId` | `adminHR`/`employee`, `validateParams` | Get by employee (all) |
| 3 | GET | `/api/salary-structures/employee/:employeeId/current` | `adminHR`/`employee`, `validateParams` | Get current/active |
| 4 | GET | `/api/salary-structures/:id` | `adminHR`, `validateParams` | Get by ID |
| 5 | POST | `/api/salary-structures` | `adminHR`, `validate(createSalaryStructureSchema)` | Create |
| 6 | PUT | `/api/salary-structures/:id` | `adminHR`, `validateParams`, `validate(updateSalaryStructureSchema)` | Update |
| 7 | POST | `/api/salary-structures/:id/activate` | `adminHR`, `validateParams` | Activate (deactivates others) |
| 8 | POST | `/api/salary-structures/:id/deactivate` | `adminHR`, `validateParams` | Deactivate |
| 9 | DELETE | `/api/salary-structures/:id` | `admin`, `validateParams` | Delete |

---

## 15. Payroll Data

**Route file:** `routes/payrollDataRoutes.js`  
**Prefix:** `/api/payroll` and `/api/payroll-data` (dual mount)  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/payroll` | `adminHR`, `validateQuery` | List payroll records |
| 2 | GET | `/api/payroll/summary` | `adminHR` | Payroll summary |
| 3 | GET | `/api/payroll/employee/:employeeId` | `validateParams` | Employee payroll (RBAC in controller) |
| 4 | GET | `/api/payroll/:id` | `validateParams` | Get by ID |
| 5 | POST | `/api/payroll/calculate` | `adminHR`, `validate(calculatePayrollSchema)` | Calculate payroll |
| 6 | POST | `/api/payroll` | `adminHR`, `validate(createPayrollSchema)` | Create payroll record |
| 7 | PUT | `/api/payroll/:id` | `adminHR`, `validateParams`, `validate(updatePayrollSchema)` | Update payroll |
| 8 | POST | `/api/payroll/:id/submit` | `adminHR`, `validateParams` | Submit for approval |
| 9 | POST | `/api/payroll/:id/approve` | `adminHR`, `validateParams` | Approve payroll |
| 10 | POST | `/api/payroll/:id/process` | `admin`, `validateParams` | Process payroll |
| 11 | POST | `/api/payroll/:id/payslip` | `adminHR`, `validateParams` | Generate payslip from payroll |
| 12 | POST | `/api/payroll/bulk-approve` | `adminHR` | Bulk approve |
| 13 | DELETE | `/api/payroll/:id` | `admin`, `validateParams` | Delete payroll record |
| 14 | POST | `/api/payroll/import-csv` | `admin`, `upload.single('file')` | Import from CSV |
| 15 | GET | `/api/payroll/export-csv` | `adminHR` | Export to CSV |

---

## 16. Attendance

**Route file:** `routes/attendance.routes.js`  
**Prefix:** `/api/attendance`  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/api/attendance/check-in` | — | Employee check-in (self-service) |
| 2 | POST | `/api/attendance/check-out` | — | Employee check-out (self-service) |
| 3 | GET | `/api/attendance/today` | — | Get today's attendance status |
| 4 | GET | `/api/attendance/my` | — | Own attendance (date range) |
| 5 | GET | `/api/attendance/my/report` | — | Own monthly report |
| 6 | GET | `/api/attendance/daily` | `mgrPlus` | Daily attendance report |
| 7 | GET | `/api/attendance/employee/:employeeId/report` | `mgrPlus` | Employee report |
| 8 | POST | `/api/attendance/mark` | `adminHR` | Manual attendance marking |
| 9 | GET | `/api/attendance/summary` | `mgrPlus` | Attendance summary |

---

## 17. Holidays

**Route file:** `routes/holiday.routes.js`  
**Prefix:** `/api/holidays`  
**Global middleware:** `auth`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/holidays` | — | List holidays (year/type filter, paged) |
| 2 | GET | `/api/holidays/count` | — | Count in date range |
| 3 | GET | `/api/holidays/:id` | — | Get holiday by ID |
| 4 | POST | `/api/holidays` | `adminHR` | Create holiday |
| 5 | PUT | `/api/holidays/:id` | `adminHR` | Update holiday |
| 6 | DELETE | `/api/holidays/:id` | `admin` | Delete holiday |
| 7 | POST | `/api/holidays/bulk` | `adminHR` | Bulk create holidays |

---

## 18. Employee Reviews

**Route file:** `routes/employee-review.routes.js` (592 lines)  
**Prefix:** `/api/employee-reviews`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/employee-reviews` | `auth` | List reviews (RBAC-filtered, paged) |
| 2 | GET | `/api/employee-reviews/meta/dashboard` | `auth` | Review statistics dashboard |
| 3 | GET | `/api/employee-reviews/:id` | `auth` | Get review by ID (RBAC) |
| 4 | POST | `/api/employee-reviews` | `auth`, inline `mgrPlus` | Create review |
| 5 | PUT | `/api/employee-reviews/:id` | `auth` | Update review (employees: self-assessment only) |
| 6 | PUT | `/api/employee-reviews/:id/status` | `auth`, inline role check | Update review status / HR approve |
| 7 | DELETE | `/api/employee-reviews/:id` | `auth`, inline `adminHR` | Delete review |

---

## 19. Dashboard

**Route file:** `routes/dashboard.routes.js`  
**Prefix:** `/api/dashboard`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/dashboard/employee-stats` | `auth` | Employee-facing stats |
| 2 | GET | `/api/dashboard/stats` | `auth` | Role-based stats (admin=full, manager=team, emp=basic) |
| 3 | GET | `/api/dashboard/admin-stats` | `auth`, `isAdminOrHR` | Admin statistics |

---

## 20. Settings

**Route file:** `routes/settings.routes.js`  
**Prefix:** `/api/settings`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/settings/payslip-template` | `auth` | Get payslip template settings |
| 2 | PUT | `/api/settings/payslip-template` | `isAdminOrHR`, `uploadCompanyLogo`, `handleUploadError` | Update template with logo |

---

## 21. Email

**Route file:** `routes/email.routes.js`  
**Prefix:** `/api/email`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/api/email/welcome/:userId` | `auth`, `adminHR` | Send welcome email |
| 2 | POST | `/api/email/password-reset/:userId` | `auth`, `adminHR` | Send password reset email |
| 3 | POST | `/api/email/account-status/:userId` | `auth`, `adminHR` | Send account status email |

---

## 22. Admin Config

**Route file:** `routes/admin-config.routes.js`  
**Prefix:** `/api/admin/config`  
**Global middleware:** `auth`, `admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/admin/config` | — | Get effective config (safe subset) |
| 2 | POST | `/api/admin/config/toggle-seeding` | — | Toggle demo seeding flag |
| 3 | POST | `/api/admin/config/seed-now` | — | Run demo data seeding |
| 4 | POST | `/api/admin/config/purge-demo` | — | Purge all demo data |

---

## 23. Admin — Email Config

**Route file:** `routes/admin.routes.js`  
**Prefix:** `/api/admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/admin/email-config` | `auth`, `admin` | Get email configuration |
| 2 | POST | `/api/admin/email-config` | `auth`, `admin`, `validate(emailConfigSchema)` | Update email config |
| 3 | POST | `/api/admin/email-config/test` | `auth`, `admin` | Test email config (connection) |
| 4 | POST | `/api/admin/email-config/send-test` | `auth`, `admin`, `validate(testEmailSchema)` | Send test email |
| 5 | GET | `/api/admin/email-config/history` | `auth`, `admin` | Email config change history |
| 6 | POST | `/api/admin/email-config/rollback` | `auth`, `admin` | Rollback email config |

---

## 24. System Config

**Route file:** `routes/system-config.routes.js`  
**Prefix:** `/api/system-config`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | POST | `/api/system-config/view` | `auth`, `admin`, `reauth` | View system config (password re-auth) |
| 2 | PUT | `/api/system-config/update` | `auth`, `admin`, `reauth` | Update system config |
| 3 | GET | `/api/system-config/audit-trail` | `auth`, `admin` | Config change audit trail |
| 4 | POST | `/api/system-config/verify-password` | `auth`, `admin` | Verify admin password |

---

## 25. Performance

**Route file:** `routes/performance.routes.js`  
**Prefix:** `/api/performance`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/performance/server-metrics` | `auth`, `admin` | Server performance metrics |
| 2 | GET | `/api/performance/api-metrics` | `auth`, `admin` | API endpoint metrics |
| 3 | GET | `/api/performance/health-metrics` | `auth` | Basic health check |

---

## 26. Restore

**Route file:** `routes/restore.routes.js`  
**Prefix:** `/api/restore`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/restore/employee-reviews` | `auth`, `admin` | List soft-deleted reviews |
| 2 | GET | `/api/restore/leave-balances` | `auth`, `admin` | List soft-deleted balances |
| 3 | GET | `/api/restore/users` | `auth`, `admin` | List soft-deleted users |
| 4 | POST | `/api/restore/employee-reviews/:id` | `auth`, `admin` | Restore deleted review |
| 5 | POST | `/api/restore/leave-balances/:id` | `auth`, `admin` | Restore deleted balance |
| 6 | POST | `/api/restore/users/:id` | `auth`, `admin` | Restore deleted user |

---

## 27. Debug (dev/test only)

**Route file:** `routes/debug.routes.js` (881 lines)  
**Prefix:** `/api/debug`  
**Guard:** Only loaded when `NODE_ENV !== 'production'`  
**Global middleware:** `auth`, `admin`

| # | Method | Path | Middleware | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/debug/stats` | — | Overall database stats |
| 2 | GET | `/api/debug/employees` | — | List employees (debug) |
| 3 | GET | `/api/debug/users` | — | List users (debug) |
| 4 | GET | `/api/debug/departments` | — | List departments (debug) |
| 5 | GET | `/api/debug/positions` | — | List positions (debug) |
| 6 | GET | `/api/debug/leaves` | — | List leave requests (debug) |
| 7 | GET | `/api/debug/timesheets` | — | List timesheets (debug) |
| 8 | GET | `/api/debug/payslips` | — | List payslips (debug) |
| 9 | PUT | `/api/debug/leaves/:id/approve` | — | Force-approve leave |
| 10 | PUT | `/api/debug/leaves/:id/reject` | — | Force-reject leave |
| 11 | POST | `/api/debug/seed-demo` | — | Seed demo data |
| 12 | POST | `/api/debug/sql` | — | Execute raw SQL |
| 13 | GET | `/api/debug/system/info` | — | OS/CPU/memory/Node info |
| 14 | GET | `/api/debug/system/database` | — | Database status/connections |
| 15 | GET | `/api/debug/config` | — | All config (sensitive masked) |
| 16 | PUT | `/api/debug/config/:key` | — | Update single config key |
| 17 | PUT | `/api/debug/config` | — | Update multiple config keys |
| 18 | POST | `/api/debug/config/backup` | — | Backup config |
| 19 | GET | `/api/debug/config/backups` | — | List config backups |
| 20 | POST | `/api/debug/config/restore` | — | Restore config from backup |
| 21 | GET | `/api/debug/logs` | — | List log files |
| 22 | GET | `/api/debug/logs/:logType` | — | Read log file (paginated) |
| 23 | GET | `/api/debug/logs/:logType/tail` | — | Tail log file |
| 24 | DELETE | `/api/debug/logs/:logType` | — | Clear log file |
| 25 | GET | `/api/debug/database/tables` | — | List all DB tables |
| 26 | GET | `/api/debug/database/schema/:tableName` | — | Table schema |
| 27 | GET | `/api/debug/database/table-data/:tableName` | — | Browse table data |
| 28 | POST | `/api/debug/database/execute` | — | Execute SQL query |
| 29 | GET | `/api/debug/database/stats` | — | Database statistics |
| 30 | POST | `/api/debug/database/explain` | — | EXPLAIN query plan |
| 31 | GET | `/api/debug/database/connections` | — | Active DB connections |
| 32 | POST | `/api/debug/database/backup/:tableName` | — | Backup table data |
| 33 | GET | `/api/debug/projects-tasks` | — | Debug projects/tasks listing |

---

# PART B — DATABASE DESIGN

## Entity-Relationship Overview

```
┌──────────┐     ┌────────────┐     ┌────────────┐
│  Users   │────▶│ Employees  │────▶│ Departments │
│          │     │            │     │            │
│          │     │            │────▶│ Positions   │
└──────────┘     └────────────┘     └────────────┘
                       │
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐
   │LeaveRequest│ │Timesheet │ │Attendance│ │SalaryStruct │
   │            │ │          │ │          │ │             │
   └────────────┘ └──────────┘ └──────────┘ └─────────────┘
          │            │                           │
          ▼            ▼                           ▼
   ┌────────────┐ ┌──────────┐              ┌────────────┐
   │LeaveBalance│ │ Project  │              │PayrollData │
   │            │ │          │              │            │
   └────────────┘ └──────────┘              └────────────┘
          │            │                           │
          ▼            ▼                           ▼
   ┌────────────┐ ┌──────────┐              ┌────────────┐
   │ LeaveType  │ │  Task    │              │  Payslip   │
   └────────────┘ └──────────┘              └────────────┘
                                                   │
                                            ┌──────┴───────┐
                                            ▼              ▼
                                     ┌────────────┐ ┌──────────────┐
                                     │PayslipTmpl │ │PayslipAudit  │
                                     └────────────┘ └──────────────┘

 Cross-cutting:
   AuditLog, SystemConfig, RefreshToken, PasswordResetToken, Holiday, EmployeeReview
```

## Tables Created (19 total, in migration dependency order)

1. `users`
2. `departments`
3. `positions`
4. `employees`
5. `refresh_tokens`
6. `leave_types`
7. `leave_balances`
8. `leave_requests`
9. `projects`
10. `tasks`
11. `timesheets`
12. `salary_structures`
13. `payslip_templates`
14. `payroll_data`
15. `payslips`
16. `payslip_audit_logs`
17. `audit_logs`
18. `system_configs`
19. `employee_reviews`
20. `password_reset_tokens` (added in later migration)
21. `holidays` (added in later migration)
22. `attendances` (added in later migration)

---

### Model 1: `users`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| firstName | STRING | NOT NULL | | |
| lastName | STRING | NOT NULL | | |
| email | STRING | NOT NULL, UNIQUE | | Index: `idx_users_email` |
| password | STRING | NOT NULL | | Excluded from defaultScope |
| role | ENUM('admin','hr','manager','employee') | NOT NULL | 'employee' | Index: `idx_users_role` |
| isActive | BOOLEAN | | true | Index: `idx_users_active` |
| failedLoginAttempts | INTEGER | NOT NULL | 0 | |
| lockoutUntil | DATE | nullable | | |
| lastLoginAt | DATE | nullable | | |
| passwordChangedAt | DATE | nullable | | |
| emailVerifiedAt | DATE | nullable | | |
| createdAt | DATE | NOT NULL | NOW() | |
| updatedAt | DATE | NOT NULL | NOW() | |
| deletedAt | DATE | nullable | | Paranoid (soft delete) |

**Scopes:** `defaultScope` excludes `password`; `withPassword` includes all fields.  
**Associations:** hasOne Employee, hasMany RefreshToken

---

### Model 2: `employees`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | STRING | UNIQUE, NOT NULL | | HR-assigned employee ID |
| firstName | STRING | NOT NULL | | |
| lastName | STRING | NOT NULL | | |
| email | STRING | UNIQUE, NOT NULL | | |
| phone | STRING | nullable | | |
| hireDate | DATEONLY | nullable | | |
| status | ENUM('Active','Inactive','On Leave','Terminated') | | 'Active' | |
| aadhaarNumber | STRING | nullable | | Indian ID |
| panNumber | STRING | nullable | | Tax ID |
| uanNumber | STRING | nullable | | PF Universal Account |
| pfNumber | STRING | nullable | | PF Number |
| esiNumber | STRING | nullable | | ESI Number |
| bankName | STRING | nullable | | |
| bankAccountNumber | STRING | nullable | | |
| ifscCode | STRING | nullable | | |
| bankBranch | STRING | nullable | | |
| accountHolderName | STRING | nullable | | |
| address | TEXT | nullable | | |
| city | STRING | nullable | | |
| state | STRING | nullable | | |
| pinCode | STRING | nullable | | |
| emergencyContactName | STRING | nullable | | |
| emergencyContactPhone | STRING | nullable | | |
| emergencyContactRelation | STRING | nullable | | |
| dateOfBirth | DATEONLY | nullable | | |
| gender | ENUM('Male','Female','Other') | nullable | | |
| photoUrl | STRING | nullable | | |
| maritalStatus | ENUM('Single','Married','Divorced','Widowed') | nullable | | |
| nationality | STRING | nullable | | |
| workLocation | STRING | nullable | | |
| employmentType | ENUM('Full-time','Part-time','Contract','Intern') | nullable | | |
| joiningDate | DATEONLY | nullable | | |
| confirmationDate | DATEONLY | nullable | | |
| resignationDate | DATEONLY | nullable | | |
| lastWorkingDate | DATEONLY | nullable | | |
| probationPeriod | INTEGER | nullable | | In months |
| noticePeriod | INTEGER | nullable | | In days |
| salary | JSON | nullable | | Legacy embedded salary |
| userId | UUID | FK → users.id | | |
| departmentId | UUID | FK → departments.id | | |
| positionId | UUID | FK → positions.id | | |
| managerId | UUID | FK → employees.id | | Self-referencing |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Associations:** belongsTo User, Department, Position, Employee(manager); hasMany Employee(subordinates), LeaveRequest, LeaveBalance, Timesheet; hasOne SalaryStructure

---

### Model 3: `departments`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING | NOT NULL, UNIQUE | | |
| code | STRING(10) | UNIQUE, nullable | | |
| description | TEXT | nullable | | |
| parentId | UUID | FK → departments.id, nullable | | Self-referencing hierarchy |
| managerId | UUID | FK → employees.id, nullable | | Added after employees table |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Associations:** self-ref parent/children, belongsTo Employee(manager), hasMany Employee, Position

---

### Model 4: `positions`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| title | STRING | NOT NULL | | |
| code | STRING(50) | UNIQUE, nullable | | |
| description | TEXT | nullable | | |
| level | ENUM('Entry','Junior','Mid','Senior','Lead','Manager','Director') | nullable | | |
| departmentId | UUID | FK → departments.id | | |
| minSalary | DECIMAL | nullable | | |
| maxSalary | DECIMAL | nullable | | |
| responsibilities | TEXT | nullable | | |
| requirements | TEXT | nullable | | |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Associations:** belongsTo Department, hasMany Employee

---

### Model 5: `leave_types`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING | NOT NULL, UNIQUE | | |
| description | TEXT | nullable | | |
| maxDaysPerYear | INTEGER | | | Annual entitlement |
| carryForward | BOOLEAN | | false | Whether unused days carry over |
| maxCarryForwardDays | INTEGER | | 0 | Cap on carry-forward |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**No paranoid (no soft delete).** Associations: hasMany LeaveRequest, LeaveBalance

---

### Model 6: `leave_balances`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| leaveTypeId | UUID | FK → leave_types.id, NOT NULL | | |
| year | INTEGER | NOT NULL | | |
| totalAccrued | DECIMAL(5,2) | | 0 | |
| totalTaken | DECIMAL(5,2) | | 0 | |
| totalPending | DECIMAL(5,2) | | 0 | |
| balance | DECIMAL(5,2) | | 0 | |
| carryForward | DECIMAL(5,2) | | 0 | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Unique Index:** `[employeeId, leaveTypeId, year]`  
**Associations:** belongsTo Employee, LeaveType

---

### Model 7: `leave_requests`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| leaveTypeId | UUID | FK → leave_types.id | | |
| startDate | DATEONLY | NOT NULL | | |
| endDate | DATEONLY | NOT NULL | | |
| totalDays | DECIMAL(4,1) | | | Calculated |
| reason | TEXT | | | |
| status | ENUM('Pending','Approved','Rejected','Cancelled','Cancellation Requested') | | 'Pending' | |
| approvedBy | UUID | FK → users.id, nullable | | |
| approvedAt | DATE | nullable | | |
| rejectedAt | DATE | nullable | | |
| approverComments | TEXT | nullable | | |
| rejectionReason | TEXT | nullable | | |
| employeeComments | TEXT | nullable | | |
| attachments | JSON | nullable | | |
| isHalfDay | BOOLEAN | | false | |
| halfDayType | ENUM('first_half','second_half') | nullable | | |
| isCancellation | BOOLEAN | | false | |
| originalLeaveRequestId | UUID | FK → leave_requests.id, nullable | | Self-referencing |
| cancellationNote | TEXT | nullable | | |
| cancelledAt | DATE | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Associations:** belongsTo Employee, LeaveType, User(approver), self-ref(originalLeaveRequest)

---

### Model 8: `projects`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING | NOT NULL, UNIQUE | | Unique constraint added in migration |
| description | TEXT | nullable | | |
| startDate | DATEONLY | nullable | | |
| endDate | DATEONLY | nullable | | |
| status | ENUM('Planning','Active','On Hold','Completed','Cancelled') | | 'Planning' | |
| clientName | STRING | nullable | | |
| managerId | UUID | FK → employees.id, nullable | | |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**No paranoid.** Associations: belongsTo Employee(manager), hasMany Task, Timesheet

---

### Model 9: `tasks`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING | NOT NULL | | |
| description | TEXT | nullable | | |
| projectId | UUID | FK → projects.id | | |
| assignedTo | UUID | FK → employees.id, nullable | | |
| estimatedHours | DECIMAL | nullable | | |
| actualHours | DECIMAL | nullable | | |
| status | ENUM('Not Started','In Progress','Completed','On Hold') | | 'Not Started' | |
| priority | ENUM('Low','Medium','High','Critical') | | 'Medium' | |
| availableToAll | BOOLEAN | | false | If true, any employee can log time |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**No paranoid.** Associations: belongsTo Project, Employee(assignee), hasMany Timesheet

---

### Model 10: `timesheets`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| projectId | UUID | FK → projects.id | | |
| taskId | UUID | FK → tasks.id, nullable | | |
| weekStartDate | DATEONLY | NOT NULL | | Monday |
| weekEndDate | DATEONLY | | | Sunday |
| weekNumber | INTEGER | | | ISO week |
| year | INTEGER | | | |
| totalHoursWorked | DECIMAL(5,2) | | 0 | Sum of daily hours |
| mondayHours | DECIMAL(4,2) | | 0 | |
| tuesdayHours | DECIMAL(4,2) | | 0 | |
| wednesdayHours | DECIMAL(4,2) | | 0 | |
| thursdayHours | DECIMAL(4,2) | | 0 | |
| fridayHours | DECIMAL(4,2) | | 0 | |
| saturdayHours | DECIMAL(4,2) | | 0 | |
| sundayHours | DECIMAL(4,2) | | 0 | |
| description | TEXT | nullable | | |
| status | ENUM('Draft','Submitted','Approved','Rejected') | | 'Draft' | |
| submittedAt | DATE | nullable | | |
| approvedAt | DATE | nullable | | |
| rejectedAt | DATE | nullable | | |
| approverComments | TEXT | nullable | | |
| approvedBy | UUID | FK → employees.id, nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Indexes:** `[employeeId, weekStartDate]`, `[projectId, weekStartDate]`, `[status]`, `[weekStartDate, weekEndDate]`  
**Associations:** belongsTo Employee, Project, Task, User(approver)

---

### Model 11: `salary_structures`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, UNIQUE | | One active per employee |
| basicSalary | DECIMAL | NOT NULL | | |
| hra | DECIMAL | | 0 | House Rent Allowance |
| allowances | JSON | nullable | | Additional allowances |
| pfContribution | DECIMAL | | 0 | Provident Fund |
| tds | DECIMAL | | 0 | Tax Deducted at Source |
| professionalTax | DECIMAL | | 0 | |
| otherDeductions | JSON | nullable | | |
| currency | STRING | | 'INR' | |
| effectiveFrom | DATEONLY | | | |
| isActive | BOOLEAN | | true | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**Unique constraint:** `uq_salary_structures_employee_id` (from migration)  
**Associations:** belongsTo Employee

---

### Model 12: `payroll_data`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | INTEGER | PK, AUTO_INCREMENT | | May be UUID if migration ran on empty DB |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| payPeriod | STRING | NOT NULL | | e.g. "2026-02" |
| payPeriodStart | DATEONLY | | | |
| payPeriodEnd | DATEONLY | | | |
| totalWorkingDays | INTEGER | | | |
| presentDays | INTEGER | | | |
| absentDays | INTEGER | | | |
| lopDays | INTEGER | | 0 | Loss of Pay days |
| paidDays | INTEGER | | | |
| overtimeHours | DECIMAL | | 0 | |
| weeklyOffDays | INTEGER | | | |
| holidays | INTEGER | | | |
| variableEarnings | JSON | nullable | | |
| variableDeductions | JSON | nullable | | |
| leaveAdjustments | JSON | nullable | | |
| grossSalary | DECIMAL | | | |
| totalDeductions | DECIMAL | | | |
| netSalary | DECIMAL | | | |
| paymentMode | ENUM('bank_transfer','cheque','cash') | nullable | | |
| disbursementDate | DATEONLY | nullable | | |
| status | ENUM('draft','calculated','approved','paid','cancelled') | | 'draft' | |
| approvedBy | UUID | FK → users.id, nullable | | |
| approvedAt | DATE | nullable | | |
| approvalComments | TEXT | nullable | | |
| createdBy | UUID | FK → users.id | | |
| updatedBy | UUID | FK → users.id, nullable | | |
| calculationNotes | TEXT | nullable | | |
| templateUsed | STRING | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**Indexes:** `employeeId`, `payPeriod`, `status`, unique `[employeeId, payPeriod]`  
**Associations:** belongsTo Employee, User(creator/updater/approver), hasOne Payslip

---

### Model 13: `payslips`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| payrollDataId | INTEGER/UUID | FK → payroll_data.id, nullable | | Type depends on migration |
| payPeriod | STRING | | | |
| month | INTEGER | | | |
| year | INTEGER | | | |
| payPeriodStart | DATEONLY | nullable | | |
| payPeriodEnd | DATEONLY | nullable | | |
| templateId | UUID | FK → payslip_templates.id, nullable | | |
| templateVersion | INTEGER | nullable | | |
| employeeInfo | JSON | | | Snapshot of employee data |
| companyInfo | JSON | | | Company details |
| earnings | JSON | | {} | Earnings breakdown |
| deductions | JSON | | {} | Deductions breakdown |
| attendance | JSON | | {} | Attendance summary |
| grossEarnings | DECIMAL(12,2) | | 0 | |
| totalDeductions | DECIMAL(12,2) | | 0 | |
| netPay | DECIMAL(12,2) | | 0 | |
| netPayInWords | STRING | nullable | | |
| payslipNumber | STRING | UNIQUE | | Auto-generated: PS{YYYY}{MM}{empId} |
| payDate | DATEONLY | nullable | | |
| generatedDate | DATE | nullable | | |
| generatedBy | UUID | FK → users.id, nullable | | |
| status | ENUM('draft','finalized','paid','cancelled') | | 'draft' | |
| calculationDetails | JSON | nullable | | |
| pdfMetadata | JSON | nullable | | |
| additionalData | JSON | nullable | | |
| version | INTEGER | | 1 | Incremented on each update |
| isLocked | BOOLEAN | | false | Prevents edits when true |
| manuallyEdited | BOOLEAN | | false | |
| lastEditedBy | UUID | FK → users.id, nullable | | |
| lastEditedAt | DATE | nullable | | |
| finalizedAt | DATE | nullable | | |
| finalizedBy | UUID | FK → users.id, nullable | | |
| paidAt | DATE | nullable | | |
| paidBy | UUID | FK → users.id, nullable | | |
| paymentMethod | STRING(50) | nullable | | |
| paymentReference | STRING(100) | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Indexes:**  
- UNIQUE `[employeeId, month, year]`  
- `[month, year]`  
- `[status]`  
- UNIQUE `[payslipNumber]`  
- `[templateId]`  
- `[payrollDataId]`  
- `[generatedBy]`  
- `[isLocked]`

**Hooks:** `beforeCreate` auto-generates payslipNumber. `beforeUpdate` prevents modifying locked payslips, increments version.  
**Instance methods:** `lock()`, `unlock(force)`, `markAsPaid()`  
**Class methods:** `findByEmployee()`, `findByMonthYear()`, `generateBulkPayslips()`  
**Associations:** belongsTo Employee, PayslipTemplate, PayrollData, User(generator)

---

### Model 14: `payslip_templates`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING | NOT NULL, UNIQUE | | Unique constraint from migration |
| description | TEXT | nullable | | |
| isDefault | BOOLEAN | | false | Only one default allowed |
| isActive | BOOLEAN | | true | |
| headerFields | JSON | nullable | | Template header config |
| earningsFields | JSON | nullable | | Earnings field definitions |
| deductionsFields | JSON | nullable | | Deduction field definitions |
| footerFields | JSON | nullable | | Footer config |
| styling | JSON | nullable | | CSS/styling overrides |
| createdBy | UUID | FK → employees.id, nullable | | |
| updatedBy | UUID | FK → employees.id, nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**Indexes:** `isDefault`, `isActive`, `name`  
**Hook:** `beforeSave` ensures only one template is default.  
**Associations:** belongsTo Employee(creator/updater)

---

### Model 15: `payslip_audit_logs`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | gen_random_uuid() | Converted from INTEGER by migration |
| payslipId | UUID | FK → payslips.id, CASCADE | | |
| action | ENUM('manual_edit','status_change','finalize','mark_paid','regenerate') | NOT NULL | | |
| performedBy | UUID | FK → users.id | | |
| reason | TEXT | nullable | | |
| changes | JSONB | nullable | | Before/after values |
| ipAddress | STRING | nullable | | |
| userAgent | STRING | nullable | | |
| createdAt | DATE | NOT NULL | | Only createdAt, no updatedAt |

**Indexes:** `payslipId`, `performedBy`, `action`, `createdAt`  
**Associations:** belongsTo Payslip, User(performer)

---

### Model 16: `audit_logs`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| action | ENUM(~30+ actions) | NOT NULL | | LOGIN_SUCCESS, CREATED, UPDATED, DELETED, APPROVED, REJECTED, STATUS_CHANGED, BALANCE_ADJUSTED, PASSWORD_CHANGED, PASSWORD_RESET, etc. |
| entityType | STRING(50) | | | Model name (User, Employee, etc.) |
| entityId | UUID | nullable | | Target entity UUID |
| userId | UUID | FK → users.id, nullable | | Actor |
| oldValues | JSONB | nullable | | Before snapshot |
| newValues | JSONB | nullable | | After snapshot |
| reason | TEXT | nullable | | Human-readable reason |
| ipAddress | STRING(45) | nullable | | |
| userAgent | TEXT | nullable | | |
| metadata | JSONB | nullable | {} | Additional context |
| duration | INTEGER | nullable | | Operation ms |
| success | BOOLEAN | NOT NULL | true | |
| errorMessage | TEXT | nullable | | If operation failed |
| createdAt | DATE | NOT NULL | | |

**No updatedAt (immutable). No paranoid (cannot be deleted).**

**Virtual fields:** `entity` → `entityType`, `details` → `metadata` (backward compat)

**Indexes:**  
- `idx_audit_logs_user_id` on `[userId]`
- `idx_audit_logs_entity` on `[entityType, entityId]`
- `idx_audit_logs_action` on `[action]`
- `idx_audit_logs_created_at` on `[createdAt]`
- `idx_audit_logs_success` on `[success]`
- `idx_audit_logs_user_action_date` on `[userId, action, createdAt]`
- `idx_audit_logs_entity_date` on `[entityType, entityId, createdAt]`

**Hooks:** `beforeUpdate` throws (immutable), `beforeDestroy` throws (compliance), `beforeCreate` sanitizes sensitive fields (password, token, apiKey, etc.)  
**Class methods:** `getEntityHistory()`, `getUserActivity()`, `getFailedOperations()`  
**Associations:** belongsTo User (onDelete RESTRICT)

---

### Model 17: `refresh_tokens`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| token | TEXT | UNIQUE, NOT NULL | | Refresh token value |
| userId | UUID | FK → users.id, NOT NULL | | |
| expiresAt | DATE | NOT NULL | | |
| isRevoked | BOOLEAN | | false | |
| revokedAt | DATE | nullable | | |
| userAgent | TEXT | nullable | | |
| ipAddress | STRING | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**Associations:** belongsTo User

---

### Model 18: `system_configs`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| category | STRING(50) | NOT NULL | | Group (e.g. "auth", "email") |
| key | STRING(100) | NOT NULL | | Config key name |
| value | TEXT | | | JSON-encoded value |
| version | INTEGER | | 1 | Versioned for audit trail |
| changedBy | UUID | FK → users.id, nullable | | |
| description | TEXT | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**No paranoid.**  
**Indexes:** `[category, key, version]`, `[category, key]`, `[changedBy]`  
**Associations:** belongsTo User(changedByUser)

---

### Model 19: `employee_reviews`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| reviewerId | UUID | FK → users.id | | |
| reviewPeriod | STRING | | | e.g. "Q1 2026" |
| reviewType | ENUM('quarterly','annual','probationary','performance_improvement') | | | |
| overallRating | DECIMAL(3,2) | nullable | | 1.00–5.00 |
| technicalSkills | DECIMAL(3,2) | nullable | | |
| communication | DECIMAL(3,2) | nullable | | |
| teamwork | DECIMAL(3,2) | nullable | | |
| leadership | DECIMAL(3,2) | nullable | | |
| punctuality | DECIMAL(3,2) | nullable | | |
| achievements | TEXT | nullable | | |
| areasForImprovement | TEXT | nullable | | |
| goals | TEXT | nullable | | |
| reviewerComments | TEXT | nullable | | |
| employeeSelfAssessment | TEXT | nullable | | |
| status | ENUM('draft','pending_employee_input','pending_approval','completed','archived') | | 'draft' | |
| reviewDate | DATEONLY | nullable | | |
| nextReviewDate | DATEONLY | nullable | | |
| hrApproved | BOOLEAN | | false | |
| hrApprovedBy | UUID | FK → users.id, nullable | | |
| hrApprovedAt | DATE | nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Indexes:** `employeeId`, `reviewerId`, `reviewPeriod`, `status`  
**Associations:** belongsTo Employee, User(reviewer), User(hrApprover)

---

### Model 20: `holidays`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| name | STRING(100) | NOT NULL | | |
| date | DATEONLY | NOT NULL | | |
| type | ENUM('public','restricted','company') | | 'public' | |
| year | INTEGER | | | Derived from date |
| isRecurring | BOOLEAN | | false | |
| description | STRING(500) | nullable | | |
| isActive | BOOLEAN | | true | |
| createdBy | UUID | FK → users.id, nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |

**Indexes:** `year`, `date`, UNIQUE `[date, name]`  
**Associations:** belongsTo User(creator)

---

### Model 21: `attendances`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| employeeId | UUID | FK → employees.id, NOT NULL | | |
| date | DATEONLY | NOT NULL | | |
| checkIn | DATE | nullable | | Full timestamp |
| checkOut | DATE | nullable | | |
| status | ENUM('present','absent','half-day','on-leave','holiday','weekend','late') | | 'present' | |
| hoursWorked | DECIMAL(5,2) | | 0 | |
| overtimeHours | DECIMAL(5,2) | | 0 | |
| lateMinutes | INTEGER | | 0 | |
| earlyLeaveMinutes | INTEGER | | 0 | |
| breakDuration | DECIMAL(5,2) | | 0 | |
| source | ENUM('manual','biometric','web','mobile') | | 'web' | |
| notes | TEXT | nullable | | |
| ipAddress | STRING | nullable | | |
| approvedBy | UUID | FK → users.id, nullable | | |
| createdAt | DATE | NOT NULL | | |
| updatedAt | DATE | NOT NULL | | |
| deletedAt | DATE | nullable | | Paranoid |

**Indexes:** UNIQUE `[employeeId, date]`, `[date]`, `[status]`, `[employeeId, date, status]`  
**Associations:** belongsTo Employee, User(approver)

---

### Model 22: `password_reset_tokens`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| id | UUID | PK | UUIDV4 | |
| tokenId | STRING(64) | UNIQUE, NOT NULL | | Hashed token identifier |
| userId | UUID | FK → users.id | | |
| email | STRING | NOT NULL | | |
| usedAt | DATE | nullable | | When token was consumed |
| expiresAt | DATE | NOT NULL | | |
| createdAt | DATE | NOT NULL | | |

**No updatedAt.**  
**Indexes:** UNIQUE `tokenId`, `[email, createdAt]`, `[expiresAt]`  
**Associations:** belongsTo User

---

## Migrations

| # | File | Purpose |
|---|------|---------|
| 1 | `20260209000000-fresh-consolidated-schema.js` | Creates all 19 core tables from scratch (replaces 19 incremental migrations) |
| 2 | `20260209100000-gap-fixes-module-2-3-5-6.js` | Adds UNIQUE on salary_structures.employee_id, changes audit_logs FK to RESTRICT, converts payroll_data PK to UUID (if empty), adds UNIQUE on payslip_templates.name & projects.name |
| 3 | `20260210000000-gap-fixes-module-9-10-11.js` | Additional module fixes |
| 4 | `20260210000001-normalize-audit-log-actions.js` | Standardizes audit log action enum values |
| 5 | `20260210000002-fix-approvedby-fk-consistency.js` | Fixes FK types on approvedBy columns |
| 6 | `20260210000003-create-password-reset-tokens.js` | Creates password_reset_tokens table |
| 7 | `20260210000004-create-holidays.js` | Creates holidays table |
| 8 | `20260210000005-create-attendances.js` | Creates attendances table |
| 9 | `20260210100000-fix-pk-type-mismatches.js` | Converts payslip_audit_logs.id from INTEGER to UUID; validates payroll_data.id type consistency |

---

# PART C — SECURITY ARCHITECTURE

## 1. Middleware Chain (Request Processing Order)

Applied globally in `server.js` (lines 1–611), in this exact order:

```
Request →
  1. express-status-monitor        (non-Windows) or basic /status endpoint
  2. responseTime                   Logs slow requests (>500ms warning)
  3. helmet()                       Sets security headers (CSP, HSTS, X-Frame-Options, etc.)
  4. xss-clean                      XSS payload sanitization on req.body/query/params
  5. hpp()                          HTTP Parameter Pollution protection
  6. trust proxy                    Configurable (TRUST_PROXY env)
  7. cors(corsOptions)              CORS enforcement with whitelist
  8. Rate Limiter (general)         300 req/15min on /api/* (configurable)
  9. Rate Limiter (auth)            20 req/15min on /api/auth/* (configurable)
 10. express.json({ limit: '2mb' }) JSON body parser
 11. express.urlencoded()           URL-encoded parser (limit: 2mb)
 12. cookieParser()                 Parse cookies
 13. requestLogger                  Assigns unique request ID (X-Request-ID)
 14. morgan()                       HTTP access logging
 15. Static files (/uploads)        Behind authenticateToken
 16. → Route handlers               Per-route middleware + controllers
 17. 404 catch-all                  Unmatched routes
 18. errorLogger                    Error logging middleware
 19. Error handler                  Structured error responses
→ Response
```

## 2. Authentication System

### 2.1 JWT Configuration

**Source:** `config/auth.config.js`

| Setting | Value | Source |
|---------|-------|--------|
| JWT Secret | `process.env.JWT_SECRET` | Required in production |
| JWT Expiry | `15m` (15 minutes) | |
| Refresh Secret | `process.env.JWT_REFRESH_SECRET` | Required in production |
| Refresh Expiry | `7d` (7 days) | |
| Algorithm | HS256 (default) | |

**Production enforcement:** Throws error if `JWT_SECRET` or `JWT_REFRESH_SECRET` are not set when `NODE_ENV === 'production'`.

### 2.2 Token Generation

**Access Token payload:**
```json
{
  "id": "user.id (UUID)",
  "email": "user.email",
  "role": "user.role",
  "employeeId": "employee.id or null",
  "jti": "uuidv4() — unique token ID for blacklisting"
}
```

**Refresh Token:** Stored in `refresh_tokens` table with `token` (JWT), `userId`, `expiresAt`, `userAgent`, `ipAddress`. JWT payload includes `{ id, tokenId, type: 'refresh' }`.

### 2.3 `authenticateToken` Middleware

**Source:** `middleware/auth.js` (210 lines)

1. Extracts token from `req.cookies.accessToken` OR `Authorization: Bearer <token>` header
2. Verifies JWT signature and expiry using `jwt.verify()`
3. Checks token's `jti` against **in-memory blacklist** — rejects if blacklisted
4. Looks up User (with Employee include) from database
5. Checks `user.isActive === true` — rejects if deactivated
6. Populates `req.user`, `req.userId`, `req.userRole`, `req.employeeId`

### 2.4 Cookie Settings

**Source:** `controllers/authController.js` (lines 197–213)

**accessToken cookie:**
| Property | Value |
|----------|-------|
| httpOnly | `true` |
| secure | `true` in production, `false` in dev |
| sameSite | `'Strict'` |
| maxAge | `900000` (15 minutes) |
| path | `'/'` |

**refreshToken cookie:**
| Property | Value |
|----------|-------|
| httpOnly | `true` |
| secure | `true` in production, `false` in dev |
| sameSite | `'Strict'` |
| maxAge | `604800000` (7 days) |
| path | `'/api/auth'` (restricted path) |

### 2.5 Token Blacklist

**Source:** `utils/tokenBlacklist.js`

- **Storage:** In-memory `Map<jti, expiresAtTimestamp>`
- **Add:** `addToBlacklist(jti, expiresAtTimestamp)` — called on logout
- **Check:** `isBlacklisted(jti)` — returns `true` if jti exists and not yet expired
- **Cleanup:** Every **5 minutes**, expired entries are purged
- **Limitation:** Not shared across PM2 cluster instances — needs Redis for multi-process

## 3. Authorization

### 3.1 `authorize(...roles)` Middleware

Accepts string or array of role names. Flattens nested arrays. Checks `req.userRole` against allowed roles. Returns `403 Forbidden` if not matched.

### 3.2 Role-Based Access Control Matrix

| Resource | admin | hr | manager | employee |
|----------|:-----:|:--:|:-------:|:--------:|
| User CRUD | ✅ | ❌ | ❌ | ❌ |
| Employee CRUD | ✅ | ✅ | ❌ | ❌ |
| Employee Read (own) | ✅ | ✅ | ✅ | ✅ |
| Employee Read (team) | ✅ | ✅ | ✅ | ❌ |
| Department CRUD | ✅ (delete) | ✅ (create/update) | ❌ | ❌ |
| Position CRUD | ✅ (delete) | ✅ (create/update) | ❌ | ❌ |
| Project CRUD | ✅ | ✅ | ✅ | ❌ |
| Task CRUD | ✅ | ✅ | ✅ | Limited |
| Timesheet — own | ✅ | ✅ | ✅ | ✅ |
| Timesheet — approve | ✅ | ✅ | ✅ | ❌ |
| Leave — own | ✅ | ✅ | ✅ | ✅ |
| Leave — approve | ✅ | ✅ | ✅ | ❌ |
| Leave Balance Admin | ✅ | ✅ | ❌ | ❌ |
| Payroll/Payslip CRUD | ✅ | ✅ | ❌ | ❌ |
| Payslip — own | ✅ | ✅ | ✅ | ✅ |
| Payslip Delete | ✅ | ❌ | ❌ | ❌ |
| Salary Structure | ✅ | ✅ | ❌ | Read own |
| Attendance — own | ✅ | ✅ | ✅ | ✅ |
| Attendance — view all | ✅ | ✅ | ✅ | ❌ |
| Attendance — mark | ✅ | ✅ | ❌ | ❌ |
| Holiday CRUD | ✅ (delete) | ✅ (create/update) | ❌ | ❌ |
| Holiday Read | ✅ | ✅ | ✅ | ✅ |
| Employee Reviews | ✅ | ✅ | ✅ | Self only |
| System Config | ✅ | ❌ | ❌ | ❌ |
| Admin Config | ✅ | ❌ | ❌ | ❌ |
| Email Config | ✅ | ❌ | ❌ | ❌ |
| Performance Metrics | ✅ | ❌ | ❌ | Health only |
| Debug Routes | ✅ | ❌ | ❌ | ❌ |
| Restore Routes | ✅ | ❌ | ❌ | ❌ |

### 3.3 `canAccessEmployee` Middleware

Logic:
1. Admin/HR → **allow** (any employee)
2. Self access (req.employeeId matches target) → **allow**
3. Manager → check if target is a subordinate (Employee.managerId === req.employeeId) → **allow/deny**
4. Otherwise → **403 Forbidden**

### 3.4 `enhancedFieldAccessControl` Middleware

Applied globally on employee routes. Controls which fields are visible/editable based on role. Employees see restricted field sets; admin/HR see all fields.

## 4. Rate Limiting

### 4.1 General API Rate Limiter

**Source:** `server.js`

| Setting | Value |
|---------|-------|
| Window | 15 minutes |
| Max requests | 300 (env: `RATE_LIMIT_MAX`) |
| Scope | `/api/*` |
| Key | IP address |
| Response | 429 Too Many Requests |

### 4.2 Auth Rate Limiter

| Setting | Value |
|---------|-------|
| Window | 15 minutes |
| Max requests | 20 (env: `AUTH_RATE_LIMIT_MAX`) |
| Scope | `/api/auth/*` |
| Key | IP address |

### 4.3 Login Rate Limiter (Custom)

**Source:** `middleware/login-rate-limiter.js` (249 lines)

**Per-IP limits:**
| Setting | Value |
|---------|-------|
| Max attempts | 5 |
| Window | 15 minutes |
| Backoff | Exponential (multiplier increases after 3+ failures) |

**Per-username limits:**
| Setting | Value |
|---------|-------|
| Max attempts | 10 |
| Window | 1 hour |

**Features:**
- Tracks per-IP and per-username independently via in-memory `Map`
- **Exponential backoff:** After 3 consecutive failures, backoff multiplier increases (×2, ×4, etc.)
- **Distributed attack detection:** Runs every 60 seconds; alerts when 50+ attempts target the same username from different IPs
- **Localhost whitelist:** `127.0.0.1` and `::1` bypass rate limiting
- **Cleanup:** Old records purged every 5 minutes
- **Rate limit headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

### 4.4 Additional Rate Limiters

- **`profileUpdateLimiter`** — on `PUT /api/employees/:id`
- **`bulkOperationLimiter`** — on `POST /api/timesheets/bulk-reject`
- **`passwordResetLimiter`** — on `POST /api/auth/forgot-password`

## 5. CORS Configuration

**Source:** `server.js`

**Allowed Origins:**
```
http://localhost:3000
http://localhost:3001
http://localhost:5000
http://localhost:8080
http://127.0.0.1:3000
http://127.0.0.1:3001
http://127.0.0.1:5000
http://127.0.0.1:8080
http://95.216.14.232:3000   (production)
http://95.216.14.232         (production)
process.env.FRONTEND_URL     (if set)
process.env.CORS_ORIGIN      (if set)
```

**Settings:**
| Option | Value |
|--------|-------|
| credentials | `true` |
| methods | `GET, POST, PUT, DELETE, OPTIONS, PATCH` |
| allowedHeaders | `Content-Type, Authorization, X-Requested-With` |
| optionsSuccessStatus | `200` |
| origin | Whitelist function (returns `true` for listed origins, also allows no-origin requests) |

## 6. Security Headers (Helmet)

`helmet()` is applied with default settings, which includes:

- **Content-Security-Policy** (CSP)
- **Strict-Transport-Security** (HSTS)
- **X-Content-Type-Options:** nosniff
- **X-Frame-Options:** SAMEORIGIN
- **X-XSS-Protection:** 0 (disabled in favor of CSP)
- **X-DNS-Prefetch-Control:** off
- **X-Download-Options:** noopen
- **X-Permitted-Cross-Domain-Policies:** none
- **Referrer-Policy:** no-referrer

## 7. Input Sanitization

| Layer | Library/Method | Scope |
|-------|---------------|-------|
| XSS | `xss-clean` | All req.body, req.query, req.params |
| HPP | `hpp()` | Prevents parameter pollution |
| Request body limit | `express.json({ limit: '2mb' })` | Prevents large payload attacks |
| Schema validation | Joi schemas via `validate()` middleware | Per-route request body/query/params |

## 8. Password Security

- **Hashing:** bcrypt (via User model hooks)
- **Account lockout:** After configurable failed attempts, `lockoutUntil` is set
- **Password change tracking:** `passwordChangedAt` field
- **Password reset:** Token-based flow via `password_reset_tokens` table; tokens have `expiresAt` and `usedAt` tracking
- **System config access:** Requires password re-authentication (`requirePasswordReauth` middleware)

## 9. Audit Logging

**Comprehensive audit trail via `audit_logs` table:**

- **Immutable:** `beforeUpdate` and `beforeDestroy` hooks throw errors
- **Sensitive data redaction:** `beforeCreate` hook sanitizes fields: `password`, `passwordHash`, `token`, `apiKey`, `secret`, `ssn`
- **Tracked actions:** LOGIN_SUCCESS, LOGIN_FAILED, CREATED, UPDATED, DELETED, APPROVED, REJECTED, STATUS_CHANGED, BALANCE_ADJUSTED, PASSWORD_CHANGED, PASSWORD_RESET, DISTRIBUTED_ATTACK_DETECTED, and 20+ more
- **Context captured:** userId, entityType, entityId, oldValues, newValues, ipAddress, userAgent, metadata, duration, success/failure

**Payslip-specific audit:** Separate `payslip_audit_logs` table tracks manual_edit, status_change, finalize, mark_paid, regenerate actions.

## 10. Error Handling

**Centralized error handler** (server.js) catches:
- `AppError` instances → custom status/message
- Sequelize `ValidationError` → 400 with field-level messages
- Sequelize `UniqueConstraintError` → 409 Conflict
- Sequelize `ForeignKeyConstraintError` → 409
- JWT `JsonWebTokenError` → 401
- JWT `TokenExpiredError` → 401
- Multer errors → 400 with file upload messages
- Unknown errors → 500 (stack trace hidden in production)

## 11. File Upload Security

- **Library:** Multer
- **Storage:** Disk storage under `uploads/` directory
- **Access control:** `/uploads` static route is behind `authenticateToken`
- **Upload type handlers:** `uploadEmployeePhoto`, `uploadCompanyLogo` with upload error handling middleware

## 12. Debug Route Protection

- **Guard:** `debug.routes.js` is only loaded when `NODE_ENV !== 'production'`
- **Auth required:** Even in dev, requires `authenticateToken` + `admin` role
- **Dangerous endpoints:** Raw SQL execution, config changes, DB browsing — all restricted to non-production admin access

---

*End of documentation. Total endpoints cataloged: ~238. Total models: 22 tables. Generated from direct source code analysis of all 27 route files, 23 model files, 9 migration files, middleware, and configuration.*
