# SkyrakSys HRM — API Reference

> **Document Owner**: Senior Backend Developer  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Frontend developers, API consumers, integration engineers

---

## 1. API Overview

| Property | Value |
|----------|-------|
| **Base URL** | `http://localhost:5000/api` |
| **Protocol** | REST over HTTPS (HTTP in dev) |
| **Authentication** | JWT via httpOnly cookies |
| **Content-Type** | `application/json` |
| **Date Format** | ISO 8601 (`YYYY-MM-DD`) |
| **UUID Format** | v4 UUID for all entity IDs |
| **Pagination** | `?page=1&limit=10` (default limit: 10) |

### Standard Response Envelope

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 }
}
```

**Error**:
```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": [{ "field": "email", "message": "Email is required" }]
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (role insufficient) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Business rule violation |
| 429 | Rate limited |
| 500 | Internal server error |

---

## 2. Route Mounting Summary

The API is mounted in `server.js` across 31 mount points:

| Base Path | Route Module | Notes |
|-----------|-------------|-------|
| `/api/auth` | auth.routes.js | Authentication + user management |
| `/api/users` | user.routes.js | User profile ops |
| `/api/employees` | employee.routes.js | Core HR entity CRUD |
| `/api/departments` | department.routes.js | Org structure |
| `/api/positions` | position.routes.js | Job roles |
| `/api/projects` | project.routes.js | Project management |
| `/api/tasks` | task.routes.js | Task tracking |
| `/api/timesheets` | timesheet.routes.js | Time entry/approval |
| `/api/leave` / `/api/leaves` | leave.routes.js | Leave management (aliased) |
| `/api/admin/leave-balances` | leave-balance-admin.routes.js | Admin leave balance ops |
| `/api/admin/leave-types` | leave-type-admin.routes.js | Leave type management |
| `/api/payroll` / `/api/payroll-data` | payrollDataRoutes.js | Payroll processing (aliased) |
| `/api/payslips` | payslipRoutes.js | Payslip generation & PDF |
| `/api/payslip-templates` | payslipTemplateRoutes.js | Payslip format templates |
| `/api/salary-structures` | salaryStructureRoutes.js | Compensation structures |
| `/api/dashboard` | dashboard.routes.js | Dashboard statistics |
| `/api/settings` | settings.routes.js | App settings |
| `/api/email` | email.routes.js | Email dispatch |
| `/api/performance` | performance.routes.js | Server metrics |
| `/api/admin` | admin.routes.js | Admin email config |
| `/api/restore` | restore.routes.js | Soft-delete recovery |
| `/api/employee-reviews` | employee-review.routes.js | Performance reviews |
| `/api/holidays` | holiday.routes.js | Holiday calendar |
| `/api/attendance` | attendance.routes.js | Clock-in/clock-out |
| `/api/leave-accrual` | leave-accrual.routes.js | Monthly accrual process |
| `/api/system-config` | system-config.routes.js | System settings (password-protected) |
| `/api/debug` | debug.routes.js | Dev/test debug endpoints |
| `/api/admin/config` | admin-config.routes.js | Runtime config toggles |
| `/health` / `/api/health` | server.js | Health check endpoints |

---

## 3. Authentication Module

### 3.1 Login
```
POST /api/auth/login
```
**Auth**: None | **Rate Limit**: Standard

| Body Field | Type | Required | Notes |
|-----------|------|----------|-------|
| email | string | Yes | Valid email |
| password | string | Yes | Min 6 chars |

**Success (200)**: Sets `accessToken` and `refreshToken` httpOnly cookies. Returns user profile.

**Errors**: 401 (invalid credentials), 423 (account locked after 5 attempts)

---

### 3.2 Logout
```
POST /api/auth/logout
```
**Auth**: JWT | **Roles**: Any

Clears cookies, revokes refresh token.

---

### 3.3 Refresh Token
```
POST /api/auth/refresh-token
```
**Auth**: None (reads cookie) 

Issues new access + refresh token pair. Old refresh token is revoked.

---

### 3.4 Get Profile
```
GET /api/auth/profile
GET /api/auth/me
```
**Auth**: JWT | **Roles**: Any

Returns current user with associated employee data.

---

### 3.5 Update Profile
```
PUT /api/auth/me
```
**Auth**: JWT | **Roles**: Any

| Body Field | Type | Required |
|-----------|------|----------|
| firstName | string | No |
| lastName | string | No |
| phone | string | No |

---

### 3.6 Change Password
```
PUT /api/auth/change-password
```
**Auth**: JWT | **Roles**: Any

| Body Field | Type | Required |
|-----------|------|----------|
| currentPassword | string | Yes |
| newPassword | string | Yes | Min 6 chars |

---

### 3.7 Forgot Password
```
POST /api/auth/forgot-password
```
**Auth**: None | **Rate Limit**: `passwordResetLimiter`

| Body Field | Type | Required |
|-----------|------|----------|
| email | string | Yes |

Sends password reset email with token link.

---

### 3.8 Reset Password
```
POST /api/auth/reset-password
```
**Auth**: None

| Body Field | Type | Required |
|-----------|------|----------|
| token | string | Yes |
| newPassword | string | Yes |

---

### 3.9 User Management (Admin)

```
POST   /api/auth/register              # Create user (admin only)
GET    /api/auth/users                  # List all users (admin/hr)
PUT    /api/auth/users/:userId/reset-password  # Reset user password (admin)
PUT    /api/auth/users/:userId/account  # Update email/role (admin)
PUT    /api/auth/users/:userId/role     # Update role (admin)
PUT    /api/auth/users/:userId/status   # Activate/deactivate (admin)
PUT    /api/auth/users/:userId/lock     # Lock/unlock (admin)
DELETE /api/auth/users/:userId          # Soft delete (admin)
GET    /api/auth/users/employee/:empId  # Get user for employee (admin/hr)
POST   /api/auth/users/employee/:empId  # Create user for employee (admin)
POST   /api/auth/users/:userId/send-welcome-email  # Send welcome (admin)
POST   /api/auth/cleanup-tokens         # Cleanup expired tokens (admin)
```

---

## 4. Employee Module

### 4.1 List Employees
```
GET /api/employees
```
**Auth**: JWT | **Roles**: All (field-level access enforced)

| Query Param | Type | Default | Notes |
|------------|------|---------|-------|
| page | integer | 1 | — |
| limit | integer | 10 | Max 100 |
| search | string | — | Name, email, employeeId |
| department | UUID | — | Filter by department |
| status | string | — | `Active`, `Inactive`, etc. |
| sortBy | string | `createdAt` | Column name |
| sortOrder | string | `DESC` | `ASC` or `DESC` |

**Field Access**: Employees see limited fields. Managers see team. Admin/HR see all fields.

---

### 4.2 Get Employee
```
GET /api/employees/:id
GET /api/employees/by-employee-id/:employeeId
GET /api/employees/me
```
**Auth**: JWT | **Middleware**: `canAccessEmployee`

Returns full employee record with salary structure, department, position, manager.

---

### 4.3 Create Employee
```
POST /api/employees
```
**Auth**: JWT | **Roles**: Admin, HR

| Body Field | Type | Required | Notes |
|-----------|------|----------|-------|
| firstName | string | Yes | 2–50 chars |
| lastName | string | Yes | 2–50 chars |
| email | string | Yes | Unique |
| phone | string | No | 10–15 digits |
| hireDate | date | Yes | ISO 8601 |
| departmentId | UUID | Yes | Must exist |
| positionId | UUID | Yes | Must exist |
| managerId | UUID | No | Self-referential |
| salary.basicSalary | number | No | Decimal |
| salary.allowances.hra | number | No | |
| salary.allowances.other | number | No | |
| salary.deductions.pf | number | No | |
| salary.deductions.esi | number | No | |
| salary.deductions.incomeTax | number | No | |
| salary.deductions.professionalTax | number | No | |
| salary.currency | string | No | Default: INR |
| salary.effectiveFrom | date | No | |

Supports multipart/form-data for photo upload.

---

### 4.4 Update Employee
```
PUT /api/employees/:id
```
**Auth**: JWT | **Middleware**: `canAccessEmployee`, `profileUpdateLimiter`

Same fields as create. Field-level access control limits what each role can update.

---

### 4.5 Update Compensation
```
PUT /api/employees/:id/compensation
```
**Auth**: JWT | **Roles**: Admin, HR

Updates salary structure separately from employee profile.

---

### 4.6 Other Employee Endpoints
```
GET    /api/employees/statistics         # HR dashboard stats (admin/hr)
GET    /api/employees/managers           # List managers (admin/hr)
GET    /api/employees/export             # CSV export (admin/hr)
GET    /api/employees/meta/departments   # Department dropdown data
GET    /api/employees/meta/positions     # Position dropdown data
GET    /api/employees/manager/:id/team   # Team members (manager+)
GET    /api/employees/team-members       # My team
POST   /api/employees/:id/photo          # Upload photo (admin/hr)
POST   /api/employees/bulk-update        # Bulk update (admin/hr)
PATCH  /api/employees/:id/status         # Update status (admin/hr)
DELETE /api/employees/:id                # Soft delete (admin/hr)
```

---

## 5. Department Module

```
GET    /api/departments                 # List (all, paginated)
GET    /api/departments/:id             # Get by ID
POST   /api/departments                 # Create (admin/hr)
PUT    /api/departments/:id             # Update (admin/hr)
DELETE /api/departments/:id             # Delete (admin, checks employees)
```

| Create/Update Fields | Type | Required |
|---------------------|------|----------|
| name | string | Yes (unique) |
| code | string | No (unique, 10 chars) |
| description | text | No |
| parentId | UUID | No (self-ref hierarchy) |
| managerId | UUID | No |

---

## 6. Position Module

```
GET    /api/positions                   # List (all, paginated)
GET    /api/positions/:id               # Get by ID
POST   /api/positions                   # Create (admin/hr)
PUT    /api/positions/:id               # Update (admin/hr)
DELETE /api/positions/:id               # Delete (admin, checks employees)
```

| Create/Update Fields | Type | Required |
|---------------------|------|----------|
| title | string | Yes |
| code | string | No (unique) |
| departmentId | UUID | Yes |
| level | enum | No (Entry–Director) |
| minSalary / maxSalary | decimal | No |

---

## 7. Leave Management Module

### 7.1 Leave Requests
```
GET    /api/leave                       # All leaves (paginated, role-filtered)
GET    /api/leave/me                    # My leaves
GET    /api/leave/:id                   # Get by ID
POST   /api/leave                       # Create request
PUT    /api/leave/:id                   # Update (own, pending only)
PATCH  /api/leave/:id/approve           # Approve (manager/admin/hr)
PUT    /api/leave/:id/approve           # Approve (alias)
PATCH  /api/leave/:id/reject            # Reject (manager/admin/hr)
PUT    /api/leave/:id/reject            # Reject (alias)
PATCH  /api/leave/:id/cancel            # Cancel own
POST   /api/leave/:id/cancel            # Cancel own (alias)
POST   /api/leave/:id/approve-cancellation  # Approve cancellation request
DELETE /api/leave/:id                   # Delete (role-based)
```

| Create Fields | Type | Required |
|--------------|------|----------|
| leaveTypeId | UUID | Yes |
| startDate | date | Yes |
| endDate | date | Yes |
| reason | text | Yes |
| isHalfDay | boolean | No |
| halfDayType | enum | If isHalfDay |

### 7.2 Leave Balance & Statistics
```
GET /api/leave/balance/:employeeId     # Employee's balance
GET /api/leave/meta/types              # Available leave types
GET /api/leave/meta/balance            # Own balance
GET /api/leave/statistics              # HR statistics (admin/hr)
GET /api/leave/pending-for-manager     # Manager's pending queue
GET /api/leave/recent-approvals        # Recent approval history
```

### 7.3 Admin Leave Operations
```
GET/POST/PUT /api/admin/leave-balances      # Balance CRUD (admin/hr)
GET/POST/PUT/DELETE /api/admin/leave-types   # Type CRUD (admin/hr)
```

### 7.4 Leave Accrual
```
GET  /api/leave-accrual/status          # Accrual status (admin/hr)
GET  /api/leave-accrual/preview         # Preview next accrual (admin/hr)
POST /api/leave-accrual/run             # Run monthly accrual (admin)
POST /api/leave-accrual/carry-forward   # Year-end carry forward (admin)
```

---

## 8. Timesheet Module

```
GET    /api/timesheets                  # All timesheets (paginated)
GET    /api/timesheets/me               # My timesheets
GET    /api/timesheets/summary          # Summary stats
GET    /api/timesheets/week/:weekStart  # Entries for specific week
GET    /api/timesheets/approval/pending # Pending approvals (manager+)
GET    /api/timesheets/stats/summary    # Timesheet statistics
GET    /api/timesheets/:id              # Get by ID
POST   /api/timesheets                  # Create entry
PUT    /api/timesheets/:id              # Update entry
PATCH  /api/timesheets/:id/submit       # Submit for approval
PATCH  /api/timesheets/:id/approve      # Approve (manager+)
PATCH  /api/timesheets/:id/reject       # Reject (manager+)
POST   /api/timesheets/bulk-submit      # Bulk submit
POST   /api/timesheets/bulk-approve     # Bulk approve (manager+)
POST   /api/timesheets/bulk-reject      # Bulk reject (manager+, rate-limited)
POST   /api/timesheets/bulk-save        # Bulk save entries
PUT    /api/timesheets/bulk-update      # Bulk update
```

| Create Fields | Type | Required |
|--------------|------|----------|
| projectId | UUID | Yes |
| taskId | UUID | Yes |
| weekStartDate | date | Yes (must be Monday) |
| mondayHours–sundayHours | decimal | No (default 0) |
| description | text | No |

---

## 9. Project & Task Module

### Projects
```
GET    /api/projects                    # List (paginated, role-filtered)
GET    /api/projects/:id                # Get with tasks
GET    /api/projects/:id/stats          # Project statistics
POST   /api/projects                    # Create (admin/manager)
PUT    /api/projects/:id                # Update (admin/manager)
DELETE /api/projects/:id                # Soft delete + tasks (admin)
```

### Tasks
```
GET    /api/tasks                       # List (paginated, role-filtered)
GET    /api/tasks/my-tasks              # Current user's tasks
GET    /api/tasks/:id                   # Get by ID (access check)
GET    /api/tasks/workload/:employeeId  # Employee workload stats
POST   /api/tasks                       # Create (admin/manager)
POST   /api/tasks/bulk                  # Bulk create (admin/manager)
PUT    /api/tasks/:id                   # Update (RBAC field limits)
PATCH  /api/tasks/:id/progress          # Update progress
DELETE /api/tasks/:id                   # Soft delete (admin/manager)
```

---

## 10. Payroll Module

### 10.1 Payroll Data
```
GET    /api/payroll                     # List payroll runs (admin/hr)
GET    /api/payroll/summary             # Payroll summary (admin/hr)
GET    /api/payroll/employee/:empId     # Employee payroll history
GET    /api/payroll/:id                 # Get payroll record
GET    /api/payroll/export-csv          # CSV export (admin/hr)
POST   /api/payroll/calculate           # Calculate payroll (admin/hr)
POST   /api/payroll                     # Create payroll record (admin/hr)
POST   /api/payroll/:id/submit          # Submit for approval (admin/hr)
POST   /api/payroll/:id/approve         # Approve (admin/hr)
POST   /api/payroll/:id/process         # Process payment (admin)
POST   /api/payroll/:id/payslip         # Generate payslip (admin/hr)
POST   /api/payroll/bulk-approve        # Bulk approve (admin/hr)
POST   /api/payroll/import-csv          # Import CSV (admin)
PUT    /api/payroll/:id                 # Update (admin/hr)
DELETE /api/payroll/:id                 # Delete (admin)
```

### 10.2 Salary Structures
```
GET    /api/salary-structures                          # List (admin/hr)
GET    /api/salary-structures/employee/:empId           # Employee's structures
GET    /api/salary-structures/employee/:empId/current   # Current active
GET    /api/salary-structures/:id                       # Get by ID (admin/hr)
POST   /api/salary-structures                           # Create (admin/hr)
PUT    /api/salary-structures/:id                       # Update (admin/hr)
```

### 10.3 Payslips
```
GET    /api/payslips                    # List payslips
GET    /api/payslips/my                 # My payslips
GET    /api/payslips/history/:empId     # Employee payslip history
GET    /api/payslips/reports/summary    # Summary report (admin/hr)
GET    /api/payslips/reports/export     # Export report (admin/hr)
GET    /api/payslips/:id                # Get by ID
GET    /api/payslips/:id/pdf            # Download PDF
POST   /api/payslips/calculate-preview  # Preview calculation (admin/hr)
POST   /api/payslips/validate           # Validate employees (admin/hr)
POST   /api/payslips/generate           # Generate payslips (admin/hr)
POST   /api/payslips/generate-all       # Generate all payslips (admin/hr)
POST   /api/payslips/bulk-finalize      # Bulk finalize (admin/hr)
POST   /api/payslips/bulk-paid          # Bulk mark as paid (admin/hr)
PUT    /api/payslips/:id                # Update (admin/hr)
PUT    /api/payslips/:id/finalize       # Finalize (admin/hr)
PUT    /api/payslips/:id/mark-paid      # Mark as paid (admin/hr)
DELETE /api/payslips/bulk               # Bulk delete (admin)
```

### 10.4 Payslip Templates
```
GET    /api/payslip-templates                   # List (admin/hr)
GET    /api/payslip-templates/active            # Active templates
GET    /api/payslip-templates/default/template  # Get/create default
GET    /api/payslip-templates/:id               # Get by ID (admin/hr)
POST   /api/payslip-templates                   # Create (admin/hr)
PUT    /api/payslip-templates/:id               # Update (admin/hr)
```

---

## 11. Attendance Module

```
GET    /api/attendance                          # List (role-filtered)
GET    /api/attendance/today                    # Today's status
GET    /api/attendance/my                       # My attendance
GET    /api/attendance/my/report                # My monthly report
GET    /api/attendance/daily                    # Daily report (manager+)
GET    /api/attendance/summary                  # Summary (manager+)
GET    /api/attendance/employee/:empId/report   # Employee report (manager+)
POST   /api/attendance                          # Create record (admin/hr)
POST   /api/attendance/clock-in                 # Clock in
POST   /api/attendance/clock-out                # Clock out
POST   /api/attendance/check-in                 # Clock in (alias)
POST   /api/attendance/check-out                # Clock out (alias)
POST   /api/attendance/mark                     # Mark attendance (admin/hr)
PUT    /api/attendance/:id                      # Update (owner or admin/hr)
DELETE /api/attendance/:id                      # Delete (admin/hr)
```

---

## 12. Performance Reviews

```
GET    /api/employee-reviews/meta/dashboard     # Review dashboard
GET    /api/employee-reviews                    # List reviews
GET    /api/employee-reviews/employee/:empId    # Employee's reviews
GET    /api/employee-reviews/:id                # Get by ID
POST   /api/employee-reviews                    # Create (admin/hr/manager)
PUT    /api/employee-reviews/:id                # Update
PUT    /api/employee-reviews/:id/status         # Update status (admin/hr/manager)
PATCH  /api/employee-reviews/:id/submit         # Submit review
PATCH  /api/employee-reviews/:id/approve        # Approve (admin/hr/manager)
PATCH  /api/employee-reviews/:id/self-assessment # Self-assessment
DELETE /api/employee-reviews/:id                # Delete (admin/hr)
```

---

## 13. Holiday Module

```
GET    /api/holidays                     # List (filterable by year, type)
GET    /api/holidays/count               # Count in date range
GET    /api/holidays/:id                 # Get by ID
POST   /api/holidays                     # Create (admin/hr)
POST   /api/holidays/bulk                # Bulk create (admin/hr)
PUT    /api/holidays/:id                 # Update (admin/hr)
DELETE /api/holidays/:id                 # Delete (admin)
```

---

## 14. Dashboard Module

```
GET /api/dashboard/employee-stats       # Employee statistics
GET /api/dashboard/stats                # Role-based dashboard stats
GET /api/dashboard/admin-stats          # Admin dashboard with charts (admin/hr)
```

---

## 15. Administration

### Email Configuration
```
GET  /api/admin/email-config            # Get SMTP config (admin)
POST /api/admin/email-config            # Save SMTP config (admin)
POST /api/admin/email-config/test       # Test SMTP connection (admin)
POST /api/admin/email-config/send-test  # Send test email (admin)
GET  /api/admin/email-config/history    # Config version history (admin)
POST /api/admin/email-config/rollback   # Rollback config (admin)
```

### Email Dispatch
```
POST /api/email/welcome/:userId          # Send welcome email (admin/hr)
POST /api/email/password-reset/:userId   # Send password reset (admin/hr)
POST /api/email/account-status/:userId   # Send status email (admin/hr)
GET  /api/email/status                   # Email service health (admin/hr)
```

### System Config (Password-Protected)
```
POST /api/system-config/view            # View config (admin, requires re-auth)
PUT  /api/system-config/update          # Update config (admin, requires re-auth)
GET  /api/system-config/audit-trail     # Config change history (admin)
POST /api/system-config/verify-password # Verify admin password
```

### Runtime Config
```
GET  /api/admin/config                  # Get safe env subset (admin)
POST /api/admin/config/toggle-seeding   # Toggle demo seeding (admin)
POST /api/admin/config/seed-now         # Run seeding (admin)
POST /api/admin/config/purge-demo       # Purge demo data (admin)
```

### Soft-Delete Recovery
```
POST /api/restore/employee-reviews/:id  # Restore review (admin)
POST /api/restore/leave-balances/:id    # Restore balance (admin)
POST /api/restore/users/:id             # Restore user (admin)
GET  /api/restore/employee-reviews      # List deleted reviews (admin)
GET  /api/restore/leave-balances        # List deleted balances (admin)
```

---

## 16. Monitoring & Health

```
GET /health                             # Basic health check
GET /api/health                         # API health check
GET /status                             # Server status
GET /api/performance/server-metrics     # CPU, memory, DB (admin)
GET /api/performance/api-metrics        # API response times (admin)
GET /api/performance/health-metrics     # Basic health (any)
```

---

## 17. Middleware Pipeline

Every request passes through this ordered middleware stack:

1. **helmet** — Security headers (HSTS, CSP, XSS protection)
2. **CORS** — Origin whitelist, credentials: true
3. **Rate Limiter** — 200 req/15min per IP
4. **express.json** — Body parser (50KB limit)
5. **express.urlencoded** — Form parser
6. **cookieParser** — Parse JWT cookies
7. **morgan** — Request logging
8. **requestId** — UUID per request
9. **requestLogger** — Structured logging
10. **compression** — gzip response compression
11. **Static Files** — `/uploads` directory
12. **authenticateToken** — JWT verification (per-route)
13. **authorize(roles)** — Role-based access (per-route)
14. **validate(schema)** — Joi body validation (per-route)
15. **validateQuery/Params** — Query/param validation (per-route)
16. **enhancedFieldAccessControl** — Field-level filtering (employees)
17. **Specialized** — Upload, rate limiters, re-auth (per-route)
18. **404 Handler** — Unmatched routes
19. **Error Handler** — Centralized error formatting

---

## 18. Authentication Flow

```
Client                          Server
  │                               │
  ├──POST /api/auth/login────────→│  Validate credentials
  │                               │  Check lockout
  │←─Set-Cookie: accessToken─────│  15min JWT in httpOnly cookie
  │←─Set-Cookie: refreshToken────│  7-day refresh in httpOnly cookie
  │                               │
  ├──GET /api/employees──────────→│  Read accessToken cookie
  │  (Cookie: accessToken=...)    │  Verify JWT signature + expiry
  │←─200 OK─────────────────────│  Proceed to route handler
  │                               │
  ├──POST /api/auth/refresh-token→│  Read refreshToken cookie
  │                               │  Verify + rotate token
  │←─Set-Cookie: new tokens──────│  New pair issued
  │                               │
  ├──POST /api/auth/logout───────→│  Revoke refresh token
  │←─Clear-Cookie: both─────────│  Delete cookies
```

---

## 19. RBAC Permission Matrix

| Endpoint Group | Admin | HR | Manager | Employee |
|---------------|-------|-----|---------|----------|
| Auth (own profile) | ✅ | ✅ | ✅ | ✅ |
| User management | ✅ | ❌ | ❌ | ❌ |
| Employee CRUD | ✅ | ✅ | 📖 team | 📖 self |
| Department CRUD | ✅ | ✅ | 📖 | 📖 |
| Position CRUD | ✅ | ✅ | 📖 | 📖 |
| Leave (own) | ✅ | ✅ | ✅ | ✅ |
| Leave (approve) | ✅ | ✅ | ✅ team | ❌ |
| Leave admin | ✅ | ✅ | ❌ | ❌ |
| Timesheet (own) | ✅ | ✅ | ✅ | ✅ |
| Timesheet (approve) | ✅ | ✅ | ✅ team | ❌ |
| Project CRUD | ✅ | 📖 | ✅ | 📖 |
| Task CRUD | ✅ | 📖 | ✅ | limited |
| Payroll | ✅ | ✅ | ❌ | ❌ |
| Payslips (own) | ✅ | ✅ | ✅ | ✅ |
| Payslips (manage) | ✅ | ✅ | ❌ | ❌ |
| Attendance (own) | ✅ | ✅ | ✅ | ✅ |
| Attendance (manage) | ✅ | ✅ | 📖 | ❌ |
| Reviews | ✅ | ✅ | ✅ team | 📖 self |
| Holidays | ✅ | ✅ | 📖 | 📖 |
| Admin config | ✅ | ❌ | ❌ | ❌ |
| System config | ✅ | ❌ | ❌ | ❌ |
| Performance metrics | ✅ | ❌ | ❌ | ❌ |

✅ = Full access | 📖 = Read only | ❌ = No access

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
