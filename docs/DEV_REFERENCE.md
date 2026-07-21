# SkyRakSys HRM — Developer Reference

> **Purpose:** Comprehensive developer reference for ongoing maintenance, bug fixes, and feature development.  
> **Audience:** Backend and frontend developers working on the SkyRakSys HRM system.  
> **Last Updated:** See Git history.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Models](#4-database-models)
5. [Middleware](#5-middleware)
6. [Backend Controllers & Routes](#6-backend-controllers--routes)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Authentication & Authorization Flow](#8-authentication--authorization-flow)
9. [Business Logic Workflows](#9-business-logic-workflows)
10. [API Quick Reference](#10-api-quick-reference)
11. [Design Decisions](#11-design-decisions)
12. [Error Handling](#12-error-handling)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Developer Guide: Adding Features & Fixing Bugs](#14-developer-guide)
15. [Backend Service Layer Architecture](#15-backend-service-layer-architecture)
16. [Top-Level Backend Services](#16-top-level-backend-services)
17. [Business Services — Orchestration Layer](#17-business-services--orchestration-layer)
18. [Specialized Sub-Services](#18-specialized-sub-services)
19. [Complete Routes Reference](#19-complete-routes-reference)
20. [Validation Schemas (Joi)](#20-validation-schemas-joi)
21. [Additional Middleware](#21-additional-middleware)
22. [Complete Frontend Services](#22-complete-frontend-services)
23. [Frontend Contexts](#23-frontend-contexts)
24. [Remaining Model Details](#24-remaining-model-details)

---

## 1. Architecture Overview

SkyRakSys HRM is a full-stack HR management system with:

- **Backend:** Node.js / Express REST API
- **Frontend:** React SPA (Single Page Application)
- **Database:** PostgreSQL 17 (via Sequelize ORM)
- **Auth:** JWT (httpOnly cookies, token rotation)
- **Deployment:** Docker Compose (5 containers) behind Nginx reverse proxy

### High-Level Data Flow

```
[Browser] ──HTTPS──> [Nginx :443] ──HTTP──> [Frontend :3000]
                          │
                          └──/api/*──> [Backend :5000] ──> [PostgreSQL :5432]
```

All API calls go through Nginx to the backend. The PostgreSQL port is **NOT** exposed to the host — all DB operations must happen inside Docker via `docker compose exec backend`.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js (LTS) | Backend server |
| Framework | Express.js | REST API |
| ORM | Sequelize v6 | PostgreSQL ORM, paranoid mode |
| Database | PostgreSQL 17 | UUID PKs, JSONB, soft deletes |
| Authentication | JWT (jsonwebtoken) | Access 15min, Refresh 7 days |
| Password Hashing | bcrypt | 12 salt rounds |
| Validation | Joi | Schema-based input validation |
| File Upload | Multer | Employee photos |
| Security | Helmet, HPP, sanitize-html | Security headers + sanitization |
| Rate Limiting | express-rate-limit | Per-user and per-IP limits |
| Logging | Morgan + custom LogHelper | HTTP logs + structured app logs |
| Frontend | React 18 | SPA |
| UI Library | Material-UI (MUI) | Component library |
| State | React Context API | Auth state management |
| HTTP Client | Axios | With interceptor for token refresh |
| Containerization | Docker Compose | 5 containers |
| Reverse Proxy | Nginx | SSL termination, routing |

---

## 3. Project Structure

```
skyraksys_hrm_app/
├── backend/
│   ├── config/
│   │   └── config.js          ← DB config (reads env vars, used by Sequelize CLI)
│   ├── controllers/           ← Business logic per resource
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── leaveController.js
│   │   ├── timesheetController.js
│   │   ├── payrollController.js
│   │   └── payslipController.js
│   ├── middleware/
│   │   ├── auth.js            ← JWT auth, role authorization, employee access check
│   │   ├── validate.js        ← Joi validation middleware
│   │   ├── errorLogger.js     ← Centralized error logging
│   │   ├── enhancedFieldAccessControl.js  ← Field-level RBAC
│   │   └── rateLimiter.js     ← Per-route rate limits
│   ├── models/                ← Sequelize models (19 models)
│   ├── routes/                ← Express route files (~25 files)
│   ├── scripts/
│   │   └── reset-db-admin-only.js  ← Go-live DB reset script
│   ├── services/              ← Business logic services
│   ├── uploads/               ← Employee photos (Docker volume)
│   ├── logs/                  ← App logs (Docker volume)
│   ├── .env                   ← Development environment
│   ├── .env.production        ← Production environment
│   └── server.js              ← App entry point
├── frontend/
│   ├── src/
│   │   ├── App.js             ← Root app, routing, context setup
│   │   ├── contexts/
│   │   │   └── AuthContext.js ← Global auth state
│   │   ├── services/          ← API service wrappers
│   │   │   ├── auth.service.js
│   │   │   ├── employee.service.js
│   │   │   ├── leave.service.js
│   │   │   ├── timesheet.service.js
│   │   │   ├── payroll.service.js
│   │   │   └── api.service.js ← Generic CRUD wrapper
│   │   ├── http-common.js     ← Axios instance + interceptors
│   │   ├── pages/             ← Page-level React components
│   │   └── components/        ← Reusable UI components
├── scripts/
│   └── deploy/
│       └── go-live.sh         ← One-command production deployment
├── docs/
│   └── DEV_REFERENCE.md       ← This file
├── .env.production            ← Root .env consumed by docker-compose
└── docker-compose.yml         ← Container orchestration
```

### Single Source of Truth for DB Config

`backend/config/config.js` reads from environment variables. All database credentials are set in `.env.production` (root) which Docker Compose injects into containers. Never hardcode DB credentials.

---

## 4. Database Models

### Overview

All models use:
- **UUID v4** primary keys
- **Paranoid mode** (soft deletes via `deletedAt`) unless noted
- **Timestamps** (`createdAt`, `updatedAt`) auto-managed by Sequelize

### 4.1 User Model

**File:** `backend/models/user.model.js`  
**Table:** `users`  
**Purpose:** System user accounts with authentication, roles, and account security.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, UUIDV4 | |
| firstName | String | Required, 2-50 chars | |
| lastName | String | Required, 2-50 chars | |
| email | String | Required, Unique, Valid email | Login identifier |
| password | String | Required, 6-255 chars | bcrypt-hashed; excluded from default queries |
| role | ENUM | Required, Default='employee' | `admin`, `hr`, `manager`, `employee` |
| isActive | Boolean | Default=true | Soft deactivation flag |
| failedLoginAttempts | Integer | Default=0 | Account lockout tracking |
| lockoutUntil | Date | Nullable | Lockout expiration time |
| lastLoginAt | Date | Nullable | Audit tracking |
| passwordChangedAt | Date | Nullable | Password change audit |
| emailVerifiedAt | Date | Nullable | Email verification |
| deletedAt | Timestamp | Nullable | Paranoid soft delete |

**Scopes:**
- Default scope: excludes `password` field automatically
- `withPassword` scope: includes password (used only for authentication)

**Associations:**
- `User → Employee` (1:1, `userId`, as `employee`)
- `User → RefreshToken` (1:M, `userId`, as `refreshTokens`)

**Key Rule:** Always use `scope('withPassword')` when comparing passwords. Never return password in API responses.

---

### 4.2 Employee Model

**File:** `backend/models/employee.model.js`  
**Table:** `employees`  
**Purpose:** Complete employee profile management.

**Basic Info:**

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| employeeId | String | Human-readable code (e.g., EMP001); Unique |
| firstName | String | Required |
| lastName | String | Required |
| email | String | Required, Unique |
| phone | String | 10-15 chars |
| status | ENUM | `Active`, `Inactive`, `On Leave`, `Terminated` |

**India-Specific Statutory Fields:**

| Field | Type | Validator |
|-------|------|-----------|
| aadhaarNumber | String | 12 digits regex |
| panNumber | String | Format: `ABCDE1234F` |
| uanNumber | String | Universal Account Number |
| pfNumber | String | Provident Fund number |
| esiNumber | String | Employee State Insurance number |

**Banking:**

| Field | Type | Notes |
|-------|------|-------|
| bankName | String | |
| bankAccountNumber | String | Sensitive |
| ifscCode | String | Format: `SBIN0001234` |
| bankBranch | String | |
| accountHolderName | String | |

**Work Details:**

| Field | Type | Notes |
|-------|------|-------|
| departmentId | UUID | FK → departments |
| positionId | UUID | FK → positions |
| managerId | UUID | FK → employees (self-referential) |
| userId | UUID | FK → users |
| joiningDate | Date | |
| employmentType | ENUM | `Full-time`, `Part-time`, `Contract`, `Intern` |
| workLocation | String | |
| probationPeriod | Integer | Default=6 months |
| noticePeriod | Integer | Default=30 days |
| resignationDate | Date | |
| lastWorkingDate | Date | |

**Salary Field (Deprecated):**

| Field | Type | Notes |
|-------|------|-------|
| salary | JSON | **DEPRECATED.** Auto-synced via `afterFind` hook from `SalaryStructure` association. Kept for backward compatibility. |

**Associations:**
- `Employee → User` (M:1)
- `Employee → Department` (M:1)
- `Employee → Position` (M:1)
- `Employee → Employee` (self-referential for manager/subordinates)
- `Employee → LeaveRequest` (1:M)
- `Employee → LeaveBalance` (1:M)
- `Employee → Timesheet` (1:M)
- `Employee → SalaryStructure` (1:1)

**Key Hook:**
- `afterFind`: Auto-syncs `salary` JSON from `SalaryStructure` for backward compatibility. Converts decimal values to floats.

---

### 4.3 Department Model

**File:** `backend/models/department.model.js`  
**Table:** `departments`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Required, Unique |
| code | String(10) | Optional, Unique |
| description | Text | |
| parentId | UUID | FK → departments (hierarchical) |
| managerId | UUID | FK → employees (department head) |
| isActive | Boolean | Default=true |

**Associations:**
- Self-referential: `parent` / `children`
- `manager` (Employee)
- `employees` (Members)
- `positions`

---

### 4.4 Position Model

**File:** `backend/models/position.model.js`  
**Table:** `positions`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| title | String | Required |
| code | String(50) | Optional, Unique |
| level | ENUM | `Entry`, `Junior`, `Mid`, `Senior`, `Lead`, `Manager`, `Director` |
| departmentId | UUID | FK → departments |
| minSalary | Decimal(10,2) | Custom getter → float |
| maxSalary | Decimal(10,2) | Custom getter → float |

---

### 4.5 LeaveRequest Model

**File:** `backend/models/leave-request.model.js`  
**Table:** `leave_requests`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| employeeId | UUID | FK → employees |
| leaveTypeId | UUID | FK → leave_types |
| startDate | Date | |
| endDate | Date | |
| totalDays | Decimal(4,1) | Supports 0.5 (half-days); custom getter → float |
| reason | Text | Required |
| status | ENUM | `Pending`, `Approved`, `Rejected`, `Cancelled`, `Cancellation Requested` |
| isHalfDay | Boolean | Default=false |
| halfDayType | ENUM | `First Half`, `Second Half` |
| isCancellation | Boolean | Default=false |
| originalLeaveRequestId | UUID | Self-referential (links to original leave) |
| approvedBy | UUID | FK → employees |
| approverComments | Text | |
| rejectionReason | Text | |
| cancellationNote | Text | |

**Status Flow:**
```
Pending ──> Approved ──> (auto) Taken
       └──> Rejected
Pending/Approved ──> Cancellation Requested ──> Cancelled
```

**Design Note:** Self-referential `originalLeaveRequestId` enables tracking cancellation requests as separate records linked to the original leave.

---

### 4.6 LeaveType Model

**File:** `backend/models/leave-type.model.js`  
**Table:** `leave_types`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | Required, Unique (e.g., "Sick Leave", "Casual Leave") |
| maxDaysPerYear | Integer | Default=20 |
| carryForward | Boolean | Default=false |
| maxCarryForwardDays | Integer | Default=0 |
| isActive | Boolean | Default=true |
| isPaid | Boolean | Default=true; if false → LOP (Loss of Pay) |

**Key:** `isPaid=false` triggers Loss of Pay deduction in payroll.

---

### 4.7 LeaveBalance Model

**File:** `backend/models/leave-balance.model.js`  
**Table:** `leave_balances`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| employeeId | UUID | FK → employees |
| leaveTypeId | UUID | FK → leave_types |
| year | Integer | Calendar year |
| totalAccrued | Decimal(5,2) | Total leave granted for year |
| totalTaken | Decimal(5,2) | Used (approved + taken) |
| totalPending | Decimal(5,2) | Awaiting approval |
| balance | Decimal(5,2) | Remaining (accrued - taken - pending) |
| carryForward | Decimal(5,2) | Carried from previous year |

**Unique Index:** `(employeeId, leaveTypeId, year)` — one balance per employee per leave type per year.

---

### 4.8 Attendance Model

**File:** `backend/models/attendance.model.js`  
**Table:** `attendance`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| employeeId | UUID | FK → employees |
| date | Date | |
| checkIn | Timestamp | Nullable |
| checkOut | Timestamp | Nullable |
| status | ENUM | `present`, `absent`, `half-day`, `on-leave`, `holiday`, `weekend`, `late` |
| hoursWorked | Decimal(5,2) | Auto-calculated |
| overtimeHours | Decimal(5,2) | |
| lateMinutes | Integer | |
| earlyLeaveMinutes | Integer | |
| source | ENUM | `manual`, `biometric`, `web`, `mobile` |
| ipAddress | String(45) | IPv4/IPv6 at check-in |
| approvedBy | UUID | FK → users (for manual adjustments) |

**Unique Index:** `(employeeId, date)` — one record per employee per day.

---

### 4.9 Timesheet Model

**File:** `backend/models/timesheet.model.js`  
**Table:** `timesheets`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| employeeId | UUID | FK → employees |
| projectId | UUID | FK → projects |
| taskId | UUID | FK → tasks |
| weekStartDate | Date | Monday of week |
| weekEndDate | Date | Sunday of week |
| weekNumber | Integer | ISO week number |
| year | Integer | |
| totalHoursWorked | Decimal(5,2) | Denormalized sum |
| mondayHours – sundayHours | Decimal(4,2) each | Per-day hours; custom getters → float |
| status | ENUM | `Draft`, `Submitted`, `Approved`, `Rejected` |
| approvedBy | UUID | FK → employees |
| approverComments | Text | |

**Unique Index:** `(employeeId, weekStartDate, projectId, taskId)` — one entry per employee/project/task per week.

**Status Flow:**
```
Draft ──> Submitted ──> Approved (final, used for payroll)
                  └──> Rejected ──> Draft (editable again)
```

---

### 4.10 PayrollData Model

**File:** `backend/models/payroll-data.model.js`  
**Table:** `payroll_data`

Stores payroll calculation data for a pay period.

**Key Fields:**

| Field | Type | Notes |
|-------|------|-------|
| employeeId | UUID | FK → employees |
| payPeriod | String | Format: `YYYY-MM` or `January 2024` |
| totalWorkingDays | Integer | Default=21 |
| presentDays | Integer | |
| absentDays | Integer | |
| lopDays | Integer | Loss of Pay days |
| paidDays | Integer | presentDays - lopDays |
| overtimeHours | Decimal(5,2) | |
| variableEarnings | JSON | `{performanceBonus, overtimeAllowance, arrears, incentive, specialBonus}` |
| variableDeductions | JSON | `{loanEmi, advances, canteenCharges, otherDeductions, lateFine}` |
| leaveAdjustments | JSON | `{leaveEncashment, leaveWithoutPay}` |
| grossSalary | Decimal(10,2) | Basic + allowances + variable earnings |
| totalDeductions | Decimal(10,2) | |
| netSalary | Decimal(10,2) | Gross - deductions |
| paymentMode | ENUM | `bank_transfer`, `cheque`, `cash`, `upi` |
| status | ENUM | `draft`, `calculated`, `approved`, `paid`, `cancelled` |
| approvedBy | UUID | FK → users |
| createdBy | UUID | FK → users; Required |

**Unique Index:** `(employeeId, payPeriod)` — one payroll record per employee per pay period.

---

### 4.11 Payslip Model

**File:** `backend/models/payslip.model.js`  
**Table:** `payslips`

**Purpose:** Generated payslip documents with versioning and locking.

**Key Fields:**

| Field | Type | Notes |
|-------|------|-------|
| payslipNumber | String(50) | Unique; Format: `PS{YYYY}{MM}{EMPID}` |
| payrollDataId | UUID | FK → payroll_data |
| employeeInfo | JSON | Employee snapshot at generation time |
| companyInfo | JSON | Company snapshot |
| earnings | JSON | All earnings components |
| deductions | JSON | All deduction components |
| attendance | JSON | `{totalWorkingDays, presentDays, absentDays, lopDays, paidDays, overtimeHours}` |
| grossEarnings | Decimal(12,2) | |
| totalDeductions | Decimal(12,2) | |
| netPay | Decimal(12,2) | |
| netPayInWords | Text | Amount in English words |
| status | ENUM | `draft`, `finalized`, `paid`, `cancelled` |
| version | Integer | Default=1; incremented on each update |
| isLocked | Boolean | Default=false; prevents modifications |
| manuallyEdited | Boolean | Tracks manual edits |

**Status Flow:**
```
Draft ──> Finalized (locked) ──> Paid
```

**Hooks:**
- `beforeCreate`: Auto-generates `payslipNumber`
- `beforeUpdate`: Blocks updates to locked payslips; increments `version`

**Instance Methods:**
- `lock()` — locks payslip, sets status=`finalized`
- `markAsPaid()` — marks as paid, locks, sets `payDate`

**Design Note:** JSON snapshots (employeeInfo, companyInfo) capture point-in-time data so historical payslips remain accurate even after employee data changes.

---

### 4.12 SalaryStructure Model

**File:** `backend/models/salary-structure.model.js`  
**Table:** `salary_structures`

| Field | Type | Notes |
|-------|------|-------|
| employeeId | UUID | FK → employees |
| basicSalary | Decimal(10,2) | Required |
| hra | Decimal(10,2) | House Rent Allowance |
| allowances | Decimal(10,2) | Total allowances |
| pfContribution | Decimal(10,2) | Provident Fund % |
| tds | Decimal(10,2) | Tax Deducted at Source |
| professionalTax | Decimal(10,2) | |
| esi | Decimal(10,2) | Employee State Insurance |
| otherDeductions | Decimal(10,2) | |
| currency | String | Default=`INR` |
| effectiveFrom | Date | Required |
| isActive | Boolean | Default=true |

**Unique Index:** `(employeeId, effectiveFrom)` — one structure per employee per effective date.

**Relationship:** Normalized storage; denormalized to `Employee.salary` JSON via `afterFind` hook for backward compatibility.

---

### 4.13 Project Model

**File:** `backend/models/project.model.js`  
**Table:** `projects`

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| status | ENUM | `Planning`, `Active`, `On Hold`, `Completed`, `Cancelled` |
| clientName | String | External client |
| managerId | UUID | FK → employees |
| startDate / endDate | Date | |
| isActive | Boolean | Default=true |

---

### 4.14 Task Model

**File:** `backend/models/task.model.js`  
**Table:** `tasks`

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| projectId | UUID | FK → projects |
| assignedTo | UUID | FK → employees; Nullable |
| availableToAll | Boolean | Default=false; if true, open to all employees |
| status | ENUM | `Not Started`, `In Progress`, `Completed`, `On Hold` |
| priority | ENUM | `Low`, `Medium`, `High`, `Critical` |
| estimatedHours | Decimal(5,2) | |
| actualHours | Decimal(5,2) | |

**Key:** `availableToAll=true` overrides `assignedTo` — any employee can log time against this task.

---

### 4.15 EmployeeReview Model

**File:** `backend/models/employee-review.model.js`  
**Table:** `employee_reviews`

| Field | Type | Notes |
|-------|------|-------|
| employeeId | UUID | FK → employees |
| reviewerId | UUID | FK → users |
| reviewPeriod | String | e.g., `Q1 2025`, `Annual 2025` |
| reviewType | ENUM | `quarterly`, `annual`, `probationary`, `performance_improvement` |
| overallRating | Decimal(3,2) | 1.0–5.0 |
| technicalSkills | Decimal(3,2) | 1.0–5.0 |
| communication | Decimal(3,2) | 1.0–5.0 |
| teamwork | Decimal(3,2) | 1.0–5.0 |
| leadership | Decimal(3,2) | 1.0–5.0 |
| punctuality | Decimal(3,2) | 1.0–5.0 |
| status | ENUM | `draft`, `pending_employee_input`, `pending_approval`, `completed`, `archived` |
| hrApproved | Boolean | Default=false |

**Unique Index:** `(employeeId, reviewPeriod)` — one review per employee per period.

---

### 4.16 Holiday Model

**File:** `backend/models/holiday.model.js`  
**Table:** `holidays`

| Field | Type | Notes |
|-------|------|-------|
| name | String(100) | Required |
| date | Date | Required |
| type | ENUM | `public` (all off), `restricted` (optional), `company` |
| year | Integer | For quick filtering |
| isRecurring | Boolean | Repeats yearly on same date |
| isActive | Boolean | Default=true; inactive holidays not counted |

**Unique Index:** `(date, name)`

---

### 4.17 SystemConfig Model

**File:** `backend/models/system-config.model.js`  
**Table:** `system_configs`

**Purpose:** Database-backed application configuration with versioning.

| Field | Type | Notes |
|-------|------|-------|
| category | String(50) | Config group (e.g., `email`, `app`) |
| key | String(100) | Config key within category |
| value | Text | JSON-encoded value |
| version | Integer | Default=1; enables rollback |
| changedBy | UUID | FK → users |
| description | Text | Change notes |

**Unique Index:** `(category, key, version)`  
**No Soft Deletes:** Full history kept for compliance.

---

### 4.18 AuditLog Model

**File:** `backend/models/audit-log.model.js`  
**Table:** `audit_logs`

**Purpose:** Immutable audit trail — WHO did WHAT to WHICH record, WHEN and WHERE.

| Field | Type | Notes |
|-------|------|-------|
| action | String(50) | CRUD, status changes, auth events, etc. |
| entityType | String(50) | Model name |
| entityId | UUID | Affected record (placeholder UUID for failed auth) |
| userId | UUID | Nullable (for failed logins of non-existent users) |
| ipAddress | String(45) | IPv4/IPv6 |
| userAgent | Text | Browser/client string |
| oldValues | JSONB | State before change; sensitive fields auto-redacted |
| newValues | JSONB | State after change; sensitive fields auto-redacted |
| reason | Text | Why change was made |
| metadata | JSONB | Request ID, batch ID, correlation ID |
| success | Boolean | Did operation succeed? |
| errorMessage | Text | Failure reason |

**Hooks:**
- `beforeCreate`: Sanitizes sensitive fields in `oldValues`/`newValues` — replaces `password`, `token`, `apiKey`, `secret`, `ssn` with `[REDACTED]`
- `beforeUpdate` / `beforeDestroy`: **Throws error** — records are immutable

**No Paranoid / No `updatedAt`:** Immutable by design. Cannot be soft-deleted.

**Class Methods:**
- `getEntityHistory(entityType, entityId)` — full audit trail for a record
- `getUserActivity(userId, startDate, endDate)` — user's actions in date range
- `getFailedOperations(startDate, endDate)` — failed actions for compliance review

---

### 4.19 Remaining Models

| Model | Table | Purpose |
|-------|-------|---------|
| RefreshToken | `refresh_tokens` | Stored JWT refresh tokens with family tracking for reuse detection |
| PasswordResetToken | `password_reset_tokens` | Temporary tokens for password reset flow (1-hour expiry) |
| PayslipTemplate | `payslip_templates` | Configurable payslip layouts |
| PayslipAuditLog | `payslip_audit_logs` | Immutable history of payslip changes (why, who, what changed) |

---

## 5. Middleware

### 5.1 Auth Middleware (`middleware/auth.js`)

**Functions:**

#### `generateAccessToken(user)`
- JWT with 15-minute expiry
- Payload: `{ id, email, role, employeeId, jti }`

#### `generateRefreshToken(user, req)`
- JWT with 7-day expiry
- Stored in `RefreshToken` table (with userAgent, IP, unique `jti`)

#### `authenticateToken(req, res, next)`
- **Token Sources:** Cookie (`accessToken`) → Authorization header (`Bearer`)
- **Steps:** exists → valid signature → not blacklisted → user active
- **Attaches:** `req.user`, `req.userId`, `req.userRole`, `req.employeeId`

#### `authorize(...allowedRoles)`
- Returns middleware checking `req.user.role` is in allowed list
- Returns 403 if not authorized

#### Shortcuts
- `isAdminOrHR` = `authorize('admin', 'hr')`
- `isManagerOrAbove` = `authorize('admin', 'hr', 'manager')`

#### `canAccessEmployee(req, res, next)`
| Role | Access |
|------|--------|
| admin / hr | Any employee |
| manager | Own record + subordinates (`employee.managerId === req.employeeId`) |
| employee | Own record only |

---

### 5.2 Validate Middleware (`middleware/validate.js`)

| Function | Validates | Attaches to |
|----------|-----------|-------------|
| `validate(schema)` | `req.body` | `req.validatedData` |
| `validateQuery(schema)` | `req.query` | `req.validatedQuery` |
| `validateParams(schema)` | `req.params` | `req.validatedParams` |

- Uses Joi with `abortEarly: false` (all errors returned at once)
- `stripUnknown: true` — removes unknown fields (prevents injection)
- Returns: `{ success: false, message: "Validation error", errors: [{field, message}] }`

---

### 5.3 Enhanced Field Access Control (`middleware/enhancedFieldAccessControl.js`)

**Purpose:** Field-level RBAC on employee data.

**Role Permission Matrix:**

| Capability | Admin | HR | Manager | Employee |
|------------|-------|-----|---------|----------|
| View all fields | ✓ | ✓ | Limited | Own only |
| Edit all fields | ✓ | Partial | No | Name/phone/address only |
| Access sensitive fields | ✓ | ✓ | No | Own only |

**Sensitive fields:** `aadhaarNumber`, `panNumber`, `bankAccountNumber`, `salary`, `salaryStructure`

**Functions attached to `req`:**
- `canViewField(userRole, fieldName, isOwnRecord)`
- `canEditField(userRole, fieldName, isOwnRecord)`
- `filterEmployeeData(data, userRole, userId, isOwnRecord)` — strips/redacts fields
- `validateEditPermissions(updateData, userRole, isOwnRecord)` — returns `{isValid, errors}`

---

### 5.4 Rate Limiter (`middleware/rateLimiter.js`)

| Limiter | Window | Max | Key | Used On |
|---------|--------|-----|-----|---------|
| `bulkOperationLimiter` | 15 min | 20 | Per user ID | Bulk timesheet/employee operations |
| `passwordResetLimiter` | 1 hour | 3 | Per IP | Password reset |
| `profileUpdateLimiter` | 15 min | 20 | Per user ID | Employee profile updates |
| `passwordReauthLimiter` | 15 min | 5 | Per IP | Password verification |

All rate limiters skip in test environment. Admin role skips `bulkOperationLimiter`.

---

### 5.5 Error Logger (`middleware/errorLogger.js`)

Express error-handling middleware (4 parameters). Logs full context before passing to response handler:
- Request: method, path, sanitized body, query, params
- User: userId, employeeId, role
- Client: IP, user-agent
- RequestId for tracing

---

## 6. Backend Controllers & Routes

### 6.1 Auth Controller

**File:** `backend/controllers/authController.js`

| Function | Method | Path | Auth | Description |
|----------|--------|------|------|-------------|
| `login` | POST | `/api/auth/login` | Public | Validate credentials, account lockout check, generate tokens, set httpOnly cookies |
| `logout` | POST | `/api/auth/logout` | Required | Blacklist access token, revoke all refresh tokens |
| `refreshToken` | POST | `/api/auth/refresh-token` | Public | Token rotation; detects reuse → family invalidation |
| `getProfile` | GET | `/api/auth/me` | Required | Returns current user + employee association |
| `updateProfile` | PUT | `/api/auth/me` | Required | Update safe fields only (firstName, lastName, email) |
| `changePassword` | PUT | `/api/auth/change-password` | Required | Verify current → bcrypt new → set `passwordChangedAt` |
| `forgotPassword` | POST | `/api/auth/forgot-password` | Public | Generate reset token; generic response (never reveals if email exists) |
| `resetPassword` | POST | `/api/auth/reset-password` | Public | Validate token expiry → hash new password |
| `verifyResetToken` | POST | `/api/auth/verify-reset-token` | Public | Check token validity without consuming it |
| `cleanupTokens` | POST | `/api/auth/cleanup-tokens` | Admin | Remove expired refresh tokens from DB |

**Security Features:**
- httpOnly + SameSite=Lax cookies
- Token rotation (new refresh token on each refresh)
- Token family invalidation: if a revoked refresh token is reused, ALL tokens for that user are revoked
- Account lockout: 5 failed logins → 15-minute lockout
- Rate limiting on login and password reset
- Audit log on every auth event

**User Management (Admin-only):**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create new user account |
| GET | `/api/auth/users` | List all users (Admin/HR) |
| PUT | `/api/auth/users/:userId/reset-password` | Admin password reset |

---

### 6.2 Employee Controller

**File:** `backend/controllers/employeeController.js`

| Function | Method | Path | Auth | RBAC | Description |
|----------|--------|------|------|------|-------------|
| `getAll` | GET | `/api/employees` | Required | RBAC-filtered | Employee sees self; Manager sees team; HR/Admin sees all |
| `getById` | GET | `/api/employees/:id` | Required | `canAccessEmployee` | Fetch single employee |
| `getMe` | GET | `/api/employees/me` | Required | Own | Current user's employee profile |
| `create` | POST | `/api/employees` | Admin/HR | | Creates User + Employee + SalaryStructure + LeaveBalances atomically |
| `update` | PUT | `/api/employees/:id` | RBAC | | Employee: name/email only; Admin/HR: all fields |
| `delete` | DELETE | `/api/employees/:id` | Admin/HR | | Terminates: status=`Terminated`, `User.isActive=false` |
| `uploadPhoto` | POST | `/api/employees/:id/photo` | Admin/HR | | Validates magic bytes, saves to `/uploads/`, updates `photoUrl` |
| `updateCompensation` | PUT | `/api/employees/:id/compensation` | Admin/HR | | Updates SalaryStructure |
| `getStatistics` | GET | `/api/employees/statistics` | Admin/HR | | Count active, inactive, by department |
| `search` | GET | `/api/employees/search` | Required | | Full-text search on name/email/employeeId |
| `getTeamMembers` | GET | `/api/employees/manager/:managerId/team` | Manager+ | | Manager's subordinates |

**Create Flow:** Admin submits → Controller validates → Business service: create User → create Employee → create SalaryStructure → initialize LeaveBalances for all active leave types → send welcome email → audit log.

---

### 6.3 Leave Controller

**File:** `backend/controllers/leaveController.js`

| Function | Method | Path | Auth | Description |
|----------|--------|------|------|-------------|
| `getAll` | GET | `/api/leaves` | Required | RBAC-filtered list |
| `getById` | GET | `/api/leaves/:id` | Required | Single leave request |
| `getMyLeaves` | GET | `/api/leaves/me` | Required | Current user's leaves |
| `create` | POST | `/api/leaves` | Required | Validate balance + overlaps → create Pending |
| `update` | PUT | `/api/leaves/:id` | RBAC | Employee if Pending; Admin/HR anytime |
| `approve` | PATCH | `/api/leaves/:id/approve` | Manager+ | Pending → Approved; deduct balance (transaction) |
| `reject` | PATCH | `/api/leaves/:id/reject` | Manager+ | Pending → Rejected |
| `cancel` | PATCH | `/api/leaves/:id/cancel` | RBAC | If Pending: delete; if Approved: → Cancellation Requested |
| `approveCancellation` | POST | `/api/leaves/:id/approve-cancellation` | Manager+ | Cancellation Requested → Cancelled; restore balance (transaction) |
| `getBalance` | GET | `/api/leaves/balance/:employeeId` | RBAC | Employee's leave balance |
| `getStatistics` | GET | `/api/leaves/statistics` | Admin/HR | Pending/approved/rejected counts |

**Critical:** Balance deductions/restorations are wrapped in DB transactions to prevent data corruption on failure.

---

### 6.4 Timesheet Controller

**File:** `backend/controllers/timesheetController.js`

| Function | Method | Path | Auth | Description |
|----------|--------|------|------|-------------|
| `getAll` | GET | `/api/timesheets` | Required | RBAC-filtered list |
| `getById` | GET | `/api/timesheets/:id` | Required | Single timesheet |
| `getMyTimesheets` | GET | `/api/timesheets/me` | Required | Current user's timesheets |
| `create` | POST | `/api/timesheets` | Required | Create/update weekly timesheet; validates max 24h/day |
| `update` | PUT | `/api/timesheets/:id` | RBAC | Employee if Draft; Admin anytime |
| `submit` | PATCH | `/api/timesheets/:id/submit` | Employee | Draft → Submitted (locked) |
| `approve` | PATCH | `/api/timesheets/:id/approve` | Manager+ | Submitted → Approved |
| `reject` | PATCH | `/api/timesheets/:id/reject` | Manager+ | Submitted → Rejected (back to Draft) |
| `bulkSubmit` | POST | `/api/timesheets/bulk-submit` | Employee | Submit multiple by IDs or week date |
| `bulkApprove` | POST | `/api/timesheets/bulk-approve` | Manager+ | Approve multiple (max 100) |
| `bulkReject` | POST | `/api/timesheets/bulk-reject` | Manager+ | Reject multiple (comments required) |
| `getSummary` | GET | `/api/timesheets/summary` | RBAC | Aggregated hours by category |
| `getByWeek` | GET | `/api/timesheets/week/:weekStart` | RBAC | All timesheets for ISO week |

---

### 6.5 Payroll Controller

**File:** `backend/controllers/payrollController.js`

| Function | Method | Path | Auth | Description |
|----------|--------|------|------|-------------|
| `calculatePayroll` | POST | `/api/payroll-data/calculate` | Admin/HR | Preview calculation (no save) |
| `create` | POST | `/api/payroll-data` | Admin/HR | Create payroll record (Draft) |
| `update` | PUT | `/api/payroll-data/:id` | Admin/HR | Update (draft only) |
| `submit` | POST | `/api/payroll-data/:id/submit` | Admin/HR | Draft → Processed |
| `approve` | POST | `/api/payroll-data/:id/approve` | Admin/HR | Processed → Approved |
| `process` | POST | `/api/payroll-data/:id/process` | Admin | Approved → Paid |
| `generatePayslip` | POST | `/api/payroll-data/:id/payslip` | Admin/HR | Generate PDF payslip |
| `getSummary` | GET | `/api/payroll-data/summary` | Admin/HR | Total payroll, employee count, status breakdown |
| `bulkApprove` | POST | `/api/payroll-data/bulk-approve` | Admin/HR | Approve multiple |
| `importCSV` | POST | `/api/payroll-data/import-csv` | Admin | Bulk import; validates rows, reports errors |
| `exportCSV` | GET | `/api/payroll-data/export-csv` | Admin/HR | Download CSV |

**Deduction Calculation:**
- EPF: 12% of basic salary (employee contribution)
- ESI: 0.75% of gross (if gross < ₹21,000)
- TDS: Progressive tax on annual net
- PT: Professional tax (state-based)
- Net = Gross − EPF − ESI − TDS − PT

---

### 6.6 Payslip Controller

**File:** `backend/controllers/payslipController.js`

| Function | Method | Path | Auth | Description |
|----------|--------|------|------|-------------|
| `getAll` | GET | `/api/payslips` | Admin/HR/Employee (own) | RBAC-filtered list |
| `getMyPayslips` | GET | `/api/payslips/my` | Any authenticated | Current user's payslips |
| `getById` | GET | `/api/payslips/:id` | RBAC | Single payslip |
| `calculatePreview` | POST | `/api/payslips/calculate-preview` | Admin/HR | Preview calculation (no save) |
| `generatePayslips` | POST | `/api/payslips/generate` | Admin/HR | Batch generate for selected employees |
| `generateAllPayslips` | POST | `/api/payslips/generate-all` | Admin/HR | Generate for all active employees (department filter optional) |
| `updatePayslip` | PUT | `/api/payslips/:id` | Admin/HR | Manual edit (draft only, requires `reason` for audit) |
| `finalizePayslip` | PUT | `/api/payslips/:id/finalize` | Admin/HR | Draft → Finalized (locked) |
| `markAsPaid` | PUT | `/api/payslips/:id/mark-paid` | Admin/HR | Finalized → Paid |
| `bulkFinalize` | POST | `/api/payslips/bulk-finalize` | Admin/HR | Finalize multiple |
| `bulkMarkAsPaid` | POST | `/api/payslips/bulk-paid` | Admin/HR | Mark multiple as paid |
| `downloadPDF` | GET | `/api/payslips/:id/pdf` | Admin/HR/Employee (own) | Download PDF payslip |

---

### 6.7 Other Routes

| Route Mount | File | Purpose |
|-------------|------|---------|
| `/api/departments` | `department.routes.js` | Department CRUD |
| `/api/projects` | `project.routes.js` | Project management |
| `/api/tasks` | `task.routes.js` | Task management |
| `/api/dashboard` | `dashboard.routes.js` | Role-based dashboard data |
| `/api/attendance` | `attendance.routes.js` | Check-in/check-out, manual attendance |
| `/api/admin/leave-balances` | `leaveBalance.routes.js` | Admin leave balance management |
| `/api/admin/leave-types` | `leaveType.routes.js` | Leave type configuration |
| `/api/salary-structures` | `salaryStructure.routes.js` | Salary structure management |
| `/api/employee-reviews` | `employeeReview.routes.js` | Performance reviews |
| `/api/holidays` | `holiday.routes.js` | Holiday calendar |
| `/api/system-config` | `systemConfig.routes.js` | System settings |
| `/api/admin` | `admin.routes.js` | Admin-only: email config, SMTP test |
| `/api/performance` | — | Performance metrics |
| `/api/docs` | — | Swagger API documentation |
| `/health`, `/api/health` | — | Health checks |

**Attendance Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/attendance/check-in` | Employee web check-in (source=`web`) |
| POST | `/api/attendance/check-out` | Employee web check-out |
| POST | `/api/attendance` | Admin/HR manual attendance |
| GET | `/api/attendance/today` | Today's status for employee |
| GET | `/api/attendance/my` | Employee's attendance range |

**Dashboard Endpoints:**

| Method | Path | Auth | Response |
|--------|------|------|---------|
| GET | `/api/dashboard/stats` | Required | Role-based: Admin/HR get full stats; Manager gets team stats; Employee gets personal stats |
| GET | `/api/dashboard/admin-stats` | Admin/HR | Detailed stats with chart data |

---

## 7. Frontend Architecture

### 7.1 App.js — Application Shell

```
App
├── SmartErrorBoundary (app-level crash protection)
├── ThemeProvider (MUI modernTheme)
├── LoadingProvider (global loading state)
│   └── SnackbarProvider (toast notifications — top-right, max 3)
│       └── AuthProvider (authentication context)
│           └── Routes
│               ├── /login (public)
│               ├── /forgot-password (public)
│               ├── /admin/debug (dev-only, lazy loaded)
│               └── / → Layout (protected)
│                   ├── dashboardRoutes
│                   ├── employeeRoutes
│                   ├── leaveRoutes
│                   ├── timesheetRoutes
│                   ├── attendanceRoutes
│                   ├── payrollRoutes
│                   └── adminRoutes
```

Routes are split into modular arrays (one per feature). The `Layout` component handles navigation/sidebar and protects all children.

---

### 7.2 AuthContext.js — Global Auth State

**File:** `frontend/src/contexts/AuthContext.js`

**State:**
```javascript
{
  user: { id, email, role, employeeId, employee },
  loading: boolean,
  isAuthenticated: boolean
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `login(email, password)` | POST `/auth/login` → set user state |
| `logout()` | POST `/auth/logout` → clear state |
| `updateProfile(data)` | PUT `/auth/me` → update user state |
| `changePassword(current, new)` | PUT `/auth/change-password` |
| `register(userData)` | POST `/auth/register` (admin only) |

**Role Check Helpers:**

```javascript
isAdmin              // role === 'admin'
isHR                 // role === 'hr'
isManager            // role === 'manager'
isEmployee           // role === 'employee'
canManageEmployees   // admin || hr
canApproveLeaves     // admin || hr || manager
canViewPayroll       // admin || hr
canManageSettings    // admin
hasRole(role)        // single role check
hasAnyRole(roles)    // array role check
```

**Initialization:** On app load, calls `GET /auth/me` — if httpOnly cookie is valid, sets authenticated state. No localStorage token storage.

---

### 7.3 http-common.js — Axios Instance

**File:** `frontend/src/http-common.js`

```javascript
baseURL: process.env.REACT_APP_API_URL || "/api"
withCredentials: true  // Sends httpOnly cookies automatically
```

**Response Interceptor — 401 Handling:**
1. Receive 401 on request X
2. If not already refreshing: POST `/auth/refresh-token` (cookie sent automatically)
3. On success: retry request X with new cookie
4. If already refreshing: queue request X, retry after refresh completes
5. If refresh fails: redirect to `/login`

**Never retries:** `/auth/refresh-token` and `/auth/me` (prevent infinite loop)

---

### 7.4 Service Layer

All services wrap API calls and return normalized `{ data, success, message }` responses.

**auth.service.js** — wraps all `/auth/*` endpoints. Includes legacy no-op methods (`getToken()`, `isAuthenticated()`) for backward compatibility.

**employee.service.js** — CRUD for `/employees/*`. `createWithPhoto()` converts complex objects to JSON strings for FormData upload.

**leave.service.js** — CRUD + approval workflow for `/leaves/*` and `/admin/leave-balances`.

**timesheet.service.js** — CRUD + submit/approve/reject for `/timesheets/*`.

**api.service.js** — Generic wrapper with `get()`, `post()`, `put()`, `patch()`, `delete()`, `upload()`, `download()`. Normalizes all responses. Used by services that don't have dedicated service files.

---

## 8. Authentication & Authorization Flow

### Login Flow

```
1. User submits login form
2. Frontend → POST /api/auth/login { email, password }
3. Backend:
   a. Rate limit check (5 attempts / 15 min)
   b. Find user by email (withPassword scope)
   c. Check account lockout (lockoutUntil)
   d. bcrypt.compare(password, user.password)
   e. If fail: increment failedLoginAttempts; lock if >= 5
   f. If success: reset failedLoginAttempts
   g. generateAccessToken(user) → 15-min JWT
   h. generateRefreshToken(user, req) → 7-day JWT, stored in DB
   i. Set httpOnly cookies: accessToken, refreshToken
   j. Audit log
4. Frontend AuthContext: set user state, isAuthenticated=true
5. React Router: redirect to dashboard
```

### Subsequent Requests

```
All API calls via axios (withCredentials: true)
  → Cookie sent automatically
  → Backend: authenticateToken middleware validates JWT
  → req.user, req.userId, req.userRole, req.employeeId set
```

### Token Refresh

```
1. 401 received
2. Axios interceptor: POST /auth/refresh-token (cookie sent)
3. Backend:
   a. Validate refresh token JWT
   b. Check DB: not revoked, not expired
   c. Token reuse detection: if token already used → revoke ALL user tokens (family invalidation)
   d. Generate new accessToken + refreshToken
   e. Revoke old refresh token in DB
   f. Set new httpOnly cookies
4. Retry original request
```

### RBAC Enforcement

RBAC is **backend-enforced** on every endpoint:
- `authorize('admin', 'hr')` — middleware checks role
- `canAccessEmployee` — middleware checks employee hierarchy
- Controller RBAC: queries filtered by role (employee sees own, manager sees team, admin/hr sees all)
- Field-level: `enhancedFieldAccessControl` filters sensitive fields per role

---

## 9. Business Logic Workflows

### 9.1 Employee Onboarding

1. Admin fills employee form (POST `/api/employees`)
2. Backend business service (transaction):
   - Create `User` record (auto-generated temporary password)
   - Create `Employee` record (linked to User)
   - Create `SalaryStructure` record
   - Initialize `LeaveBalance` records for all active `LeaveType` entries
3. Welcome email sent with temporary password
4. Audit log created

### 9.2 Leave Request Workflow

```
Employee creates request:
  POST /api/leaves
  → Validate date range
  → Check for overlapping leave requests
  → Check sufficient LeaveBalance
  → Create LeaveRequest (status='Pending')
  → Notify manager

Manager approves:
  PATCH /api/leaves/:id/approve
  → BEGIN TRANSACTION
  → LeaveRequest.status = 'Approved'
  → LeaveBalance.totalPending -= days
  → LeaveBalance.totalTaken += days
  → LeaveBalance.balance -= days
  → COMMIT
  → Notify employee

Employee cancels approved leave:
  PATCH /api/leaves/:id/cancel
  → LeaveRequest.status = 'Cancellation Requested'
  → Notify manager

Manager approves cancellation:
  POST /api/leaves/:id/approve-cancellation
  → BEGIN TRANSACTION
  → LeaveRequest.status = 'Cancelled'
  → LeaveBalance.totalTaken -= days
  → LeaveBalance.balance += days  (restored)
  → COMMIT
```

### 9.3 Timesheet Workflow

```
Employee enters hours:
  POST /api/timesheets (daily hours Mon-Sun)
  → Validate: max 24h/day
  → Validate: one timesheet per employee/project/task/week
  → Create Timesheet (status='Draft')

Employee submits:
  PATCH /api/timesheets/:id/submit
  → Draft → Submitted (locked for editing)

Manager approves:
  PATCH /api/timesheets/:id/approve
  → Submitted → Approved (used for payroll)

Manager rejects:
  PATCH /api/timesheets/:id/reject
  → Submitted → Rejected → back to Draft (editable)
```

### 9.4 Payroll Processing

```
1. Preview (no save):
   POST /api/payroll-data/calculate
   → Calculate: Gross, EPF (12% basic), ESI (0.75% if <21k),
                TDS (progressive), PT (state tax), Net

2. Create payroll:
   POST /api/payroll-data  → status='Draft'

3. Approval chain:
   POST /api/payroll-data/:id/submit  → Draft → Processed
   POST /api/payroll-data/:id/approve → Processed → Approved
   POST /api/payroll-data/:id/process → Approved → Paid

4. Generate payslip:
   POST /api/payroll-data/:id/payslip
   → Snapshot employee + company data
   → Generate PDF
   → Create Payslip record (status='Draft')

5. Payslip flow:
   PUT /api/payslips/:id/finalize → Draft → Finalized (locked)
   PUT /api/payslips/:id/mark-paid → Finalized → Paid
```

### 9.5 Attendance Check-In/Out

```
Employee check-in:
  POST /api/attendance/check-in
  → Create Attendance record (checkIn=now, source='web', ipAddress captured)

Employee check-out:
  POST /api/attendance/check-out
  → Update Attendance record (checkOut=now)
  → Calculate hoursWorked = checkOut - checkIn - breakDuration
  → Calculate lateMinutes, overtimeHours

Manual (Admin/HR):
  POST /api/attendance { employeeId, date, checkIn, checkOut, ... }
  → source='manual', approvedBy=req.userId
```

---

## 10. API Quick Reference

### Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Required | Logout |
| POST | `/api/auth/refresh-token` | Public | Refresh token |
| GET | `/api/auth/me` | Required | Current user |
| PUT | `/api/auth/change-password` | Required | Change password |
| POST | `/api/auth/forgot-password` | Public | Request reset |
| POST | `/api/auth/reset-password` | Public | Submit new password |

### Employees

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/employees` | Required | List (RBAC-filtered) |
| POST | `/api/employees` | Admin/HR | Create employee |
| GET | `/api/employees/me` | Required | Own profile |
| GET | `/api/employees/:id` | RBAC | Get by ID |
| PUT | `/api/employees/:id` | RBAC | Update |
| DELETE | `/api/employees/:id` | Admin/HR | Terminate |
| GET | `/api/employees/statistics` | Admin/HR | Stats |
| PUT | `/api/employees/:id/compensation` | Admin/HR | Update salary |

### Leaves

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/leaves` | Required | List (RBAC) |
| POST | `/api/leaves` | Required | Create request |
| PATCH | `/api/leaves/:id/approve` | Manager+ | Approve |
| PATCH | `/api/leaves/:id/reject` | Manager+ | Reject |
| PATCH | `/api/leaves/:id/cancel` | RBAC | Cancel |
| GET | `/api/leaves/balance/:employeeId` | RBAC | Leave balance |
| GET | `/api/leaves/meta/types` | Required | Leave types |

### Timesheets

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/timesheets` | Required | List (RBAC) |
| POST | `/api/timesheets` | Required | Create/update |
| PATCH | `/api/timesheets/:id/submit` | Employee | Submit |
| PATCH | `/api/timesheets/:id/approve` | Manager+ | Approve |
| PATCH | `/api/timesheets/:id/reject` | Manager+ | Reject |
| POST | `/api/timesheets/bulk-approve` | Manager+ | Bulk approve |

### Payroll

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/payroll-data` | Admin/HR | List payroll records |
| POST | `/api/payroll-data/calculate` | Admin/HR | Preview calculation |
| POST | `/api/payroll-data` | Admin/HR | Create payroll |
| POST | `/api/payroll-data/:id/approve` | Admin/HR | Approve |
| POST | `/api/payroll-data/:id/process` | Admin | Mark paid |
| GET | `/api/payslips/my` | Any | Own payslips |
| GET | `/api/payslips/:id/pdf` | RBAC | Download PDF |

### Attendance

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/attendance/check-in` | Required | Web check-in |
| POST | `/api/attendance/check-out` | Required | Web check-out |
| GET | `/api/attendance/today` | Required | Today's status |
| GET | `/api/attendance/my` | Required | Own history |
| POST | `/api/attendance` | Admin/HR | Manual entry |

---

## 11. Design Decisions

| Decision | Why | How |
|----------|-----|-----|
| **httpOnly Cookies** | Prevent XSS token theft — JS cannot read cookies | Backend sets httpOnly + SameSite=Lax cookies; no localStorage |
| **Token Rotation** | Prevents token reuse attacks | Old refresh token revoked on each refresh; new one issued |
| **Token Family Invalidation** | Detect stolen tokens | Reused revoked token → ALL tokens for user revoked |
| **Soft Deletes (Paranoid)** | Preserve audit trail | `deletedAt` timestamp instead of DELETE; recoverable |
| **UUID v4 PKs** | Security + distributed safety | No sequential IDs that expose record counts or enable enumeration |
| **Salary dual-storage** | Backward compatibility | SalaryStructure (normalized) + Employee.salary JSON (denormalized, auto-synced via afterFind hook) |
| **India-specific validators** | Compliance | Aadhaar (12 digits), PAN (format), IFSC, PIN code validators on Employee model |
| **Payslip JSON snapshots** | Historical accuracy | employeeInfo + companyInfo captured at generation time; payslip stays accurate after employee changes |
| **Payslip versioning + locking** | Prevent accidental modification | version counter increments on update; `isLocked=true` blocks further changes |
| **DB transactions for balances** | Data integrity | Leave deduction/restoration in transactions; no partial updates |
| **AuditLog immutability** | Compliance | beforeUpdate/beforeDestroy throw errors; no soft delete |
| **RBAC backend-enforced** | Security-first | Role checks on every API endpoint, not reliant on frontend |
| **Field-level access control** | Sensitive data protection | Salary/banking fields filtered/redacted per role |
| **Docker-only DB access** | Security | PostgreSQL port NOT exposed to host; all access via `docker compose exec` |
| **Sequelize migrations** | Schema management | `sync()` disabled in production; schema changes via migrations only |
| **Per-user rate limiting** | Fair use | Bulk operation limiter keyed per user ID, not IP |
| **Magic bytes validation** | File upload security | Photos validated by file header bytes, not just extension |
| **Consistent error format** | API contract | All errors: `{ success: false, message, errors: [{field, message}] }` |
| **Context API for auth** | Simplicity | Global auth state without Redux complexity |
| **Axios interceptors** | Transparent refresh | 401 triggers silent token refresh + request retry; components unaware |

---

## 12. Error Handling

### Backend Error Response Format

All API errors return:
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "fieldName", "message": "Specific validation message" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, business rule violations |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Valid token but insufficient role/access |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate record (Sequelize UniqueConstraintError) |
| 423 | Locked | Account lockout |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exceptions |

### Frontend Error Handling

1. Axios interceptor catches 401 → attempt token refresh
2. Services throw standardized error objects
3. Components catch with try/catch, display via Snackbar toast
4. SmartErrorBoundary at app and route level catches render errors

---

## 13. Deployment & Infrastructure

### Container Architecture

```
docker-compose.yml
├── postgres          PostgreSQL 17 (internal only, port NOT exposed to host)
├── backend           Node.js backend (:5000, internal)
├── frontend          React SPA (:3000, internal)
├── mobile            Expo mobile web (:19006, internal)
└── nginx             Reverse proxy (:80/:443, public)
```

### Network Rules

- **PostgreSQL:** Only accessible from within Docker network via hostname `postgres`
- **Backend API:** Nginx routes `/api/*` to backend
- **Frontend:** Nginx serves React SPA for all other paths
- **Never run `node` or `psql` directly on host** — DB_HOST=postgres only resolves inside Docker

### Environment Variables

| Variable | Where | Notes |
|----------|-------|-------|
| `DB_HOST` | `.env.production` | Must be `postgres` in production (Docker hostname) |
| `DB_NAME` | `.env.production` | Database name |
| `DB_USER` | `.env.production` | DB user |
| `DB_PASSWORD` | `.env.production` | DB password |
| `JWT_SECRET` | `.env.production` | Min 32 chars; rotated by go-live script |
| `JWT_REFRESH_SECRET` | `.env.production` | Min 32 chars; rotated by go-live script |
| `NODE_ENV` | `.env.production` | Must be `production` |
| `CORS_ORIGIN` | `.env.production` | Frontend URL (e.g., `https://skyait.skyraksys.com`) |
| `FRONTEND_URL` | `.env.production` | Same as CORS_ORIGIN |

### Running Commands in Production

```bash
# Run backend scripts
docker compose exec backend node scripts/your-script.js

# DB backup (port NOT exposed, must use docker exec)
docker compose exec postgres pg_dump -U hrm_admin skyraksys_hrm > backup.sql

# View backend logs
docker compose logs -f backend

# Restart all containers
docker compose down && docker compose up -d
```

### Go-Live Script

```bash
# Full go-live: rotates JWT secrets, resets DB to admin-only, restarts containers
bash scripts/deploy/go-live.sh
```

See `GO_LIVE_INSTRUCTIONS.txt` for step-by-step guide.

---

## 14. Developer Guide

### Adding a New API Endpoint

1. **Create/update controller function** in `backend/controllers/`
   - Follow existing pattern: validate RBAC, call service, return `{ success: true, data, message }`
   - Add audit log for mutating operations

2. **Add route** in `backend/routes/`
   - Apply middleware: `authenticateToken` → `authorize(roles)` → `validate(schema)` → controller
   - **IMPORTANT:** Static routes (e.g., `/me`, `/statistics`) must come BEFORE parameterized routes (e.g., `/:id`)

3. **Add Joi schema** if validating new input shape

4. **Add frontend service method** in `frontend/src/services/`
   - Use existing service files or `api.service.js` generic wrapper

5. **Add frontend UI** in `frontend/src/pages/`

### Adding a New Model

1. Create model file: `backend/models/your-model.model.js`
   - Use UUID v4 PK
   - Enable paranoid (unless immutable like AuditLog)
   - Add custom getters for Decimal → float conversion if needed

2. Register in `backend/models/index.js`

3. Add associations in the model's `associate()` method

4. Create Sequelize migration: `npx sequelize-cli migration:generate --name add-your-table`

5. Run migration: `docker compose exec backend npx sequelize-cli db:migrate`

### Fixing Permission Bugs

1. **Check backend middleware chain** in the route file — is the right `authorize()` applied?
2. **Check controller RBAC logic** — is the role filter applied to the DB query?
3. **Check `enhancedFieldAccessControl`** — is the field in the role's view/edit list?
4. **Check frontend** — does AuthContext's `canManageX` helper match backend expectations?

### Common Pitfalls

| Pitfall | Cause | Fix |
|---------|-------|-----|
| 401 on all requests after deployment | JWT_SECRET changed but tokens not refreshed | Users need to re-login; go-live script handles this |
| "DB connection refused" when running scripts | Running `node` on host, not in container | Use `docker compose exec backend node script.js` |
| Balance corruption on leave approve | Not using transaction | Wrap balance deduction in `sequelize.transaction()` |
| Payslip editable after finalize | Forgot to check `isLocked` | Check `payslip.isLocked` before any update |
| CORS error in production | `CORS_ORIGIN` env var wrong | Must match exact frontend URL (include http/https) |
| Photo upload fails | File extension ≠ content | Magic bytes validation catches this; check Multer config |
| Timesheet duplicate error | Multiple entries same week | Unique constraint on `(employeeId, weekStartDate, projectId, taskId)` |
| Route 404 for `/api/leaves/me` | Route order wrong | Static `/me` route must be BEFORE `/:id` in route file |

### Seeding / DB Reset

```bash
# Full reset + admin-only (for go-live)
docker compose exec backend node scripts/reset-db-admin-only.js

# Seed demo data (development)
docker compose exec backend npx sequelize-cli db:seed:all

# Run migrations
docker compose exec backend npx sequelize-cli db:migrate
```

### Environment-Specific Behavior

| Feature | Development | Production |
|---------|-------------|------------|
| DB logging | Enabled (verbose) | Disabled |
| Rate limiting | Active (test environment skips) | Active |
| CORS | localhost:3000/3001/5000/8080 | CORS_ORIGIN env var |
| JWT expiry | Same (15min/7day) | Same |
| Demo data seeding | `SEED_DEMO_DATA=true` | Never |
| Admin debug panel | Accessible | Not accessible |

---

---

## 15. Backend Service Layer Architecture

### Service Hierarchy

The backend uses a **three-tier service architecture**:

```
Routes (HTTP layer)
  └─ Business Services (Orchestration, transactions, RBAC, multi-step workflows)
       └─ Data Services (CRUD, queries, simple business rules)
            └─ Sequelize Models (DB access)
```

**Data Services** (e.g., `EmployeeService`, `LeaveService`): Direct DB access, pagination, simple validations.  
**Business Services** (e.g., `EmployeeBusinessService`, `LeaveBusinessService`): Orchestrate multi-step flows, wrap in transactions, enforce RBAC.  
**Specialized Sub-Services** (e.g., `EmployeeBulkService`, `LeaveApprovalService`): Domain-specific slices of complex modules.

### Architectural Patterns

| Pattern | Description |
|---------|-------------|
| **BaseService** | Abstract base with standard CRUD (`findAll`, `findById`, `create`, `update`, `delete`, `count`, `bulkCreate`) |
| **Transactions** | Complex multi-entity operations use `db.sequelize.transaction()` with UPDATE locks on critical rows |
| **Caching** | In-memory CacheService (LRU, TTL-based). Dashboard: 5min. Team IDs: 1hr. Config: 1min. |
| **Audit trail** | AuditService is fire-and-forget — never throws, never blocks business operations |
| **Email notifications** | All emails are fire-and-forget async — `.catch(() => {})` silently swallows failures |
| **N+1 prevention** | Batch-fetch related records, use `Promise.all()` for parallel independent queries |
| **Error propagation** | Sequelize errors propagated as-is; custom errors: `AppError` subclasses (ValidationError, NotFoundError, ForbiddenError, ConflictError) |

### Service File Locations

```
backend/services/
├── BaseService.js                     # Abstract base (CRUD methods)
├── AuthService.js                     # Login, lockout, rate tracking
├── EmployeeService.js                 # Employee CRUD + ID generation
├── LeaveService.js                    # Leave CRUD + basic approvals
├── TimesheetService.js                # Weekly timesheet management
├── PayrollService.js                  # Payroll calculation + workflow
├── PayslipService.js                  # Payslip generation + audit
├── DashboardService.js                # Cached role-based statistics
├── EmployeeReviewService.js           # Performance review workflow
├── attendance.service.js              # Check-in/out, monthly reports
├── email.service.js                   # SMTP, templated emails
├── audit.service.js                   # Compliance audit logging
├── CacheService.js                    # In-memory LRU+TTL cache
├── config.service.js                  # .env read/write/backup
├── holiday.service.js                 # Holiday calendar + recurring
├── payslipCalculation.service.js      # Indian payroll formulas
├── scheduler.js                       # Cron jobs (accrual, cleanup)
├── log.service.js                     # Log file tail/search/clear
├── business/
│   ├── BaseBusinessService.js         # Abstract orchestration base
│   ├── EmployeeBusinessService.js     # Full employee lifecycle
│   ├── LeaveBusinessService.js        # Leave state machine + balances
│   ├── PayrollBusinessService.js      # Payroll approval pipeline
│   └── TimesheetBusinessService.js    # Timesheet submission/approval
├── employee/
│   ├── EmployeeBulkService.js         # CSV import/export, bulk update
│   └── EmployeeSearchService.js       # Advanced search with RBAC
├── leave/
│   ├── LeaveApprovalService.js        # Approval/rejection + balance adj
│   └── LeaveService.js                # Extended leave calculations
├── timesheet/
│   ├── TimesheetApprovalService.js    # Week-level bulk approvals
│   ├── TimesheetBulkService.js        # Batch operations
│   ├── TimesheetCalculationService.js # Hour summation, project grouping
│   └── TimesheetSubmissionService.js  # Draft→Submitted workflow
├── project/
│   └── ProjectService.js              # Project CRUD + state machine
└── task/
    └── TaskService.js                 # Task management under projects
```

---

## 16. Top-Level Backend Services

### AuthService

**File:** `backend/services/AuthService.js`  
**Purpose:** Login pipeline with rate limiting and account lockout.

**Constants:** `MAX_FAILED_ATTEMPTS = 5`, `LOCKOUT_DURATION_MINUTES = 15`

| Method | Parameters | Returns | Notes |
|--------|-----------|---------|-------|
| `authenticate(email, password, clientIp, reqMeta, req)` | credentials + context | `{ rateLimitHeaders, accessToken, refreshToken, user }` | Rate check → lookup → lock check → bcrypt compare → audit |
| `_handleFailedLogin(user, email, clientIp, reqMeta)` | private | void | Increments failedLoginAttempts; triggers 15-min lockout at 5 fails; fires LOGIN_FAILED + ACCOUNT_LOCKED_TEMP audit |
| `_handleSuccessfulLogin(user, email, clientIp, reqMeta)` | private | void | Resets counter to 0; fires LOGIN_SUCCESS audit; records lastLoginAt |

**Errors:** 429 rate-limited · 423 account locked · 401 invalid credentials

---

### EmployeeService

**File:** `backend/services/EmployeeService.js`  
**Purpose:** Employee CRUD, foreign-key validation, photo handling, salary structure, leave balance init.

| Method | Key Behaviour |
|--------|--------------|
| `findAllWithDetails(options)` | Includes Department + Position + User + SalaryStructure (active) + Manager (LEFT JOIN) |
| `findByIdWithDetails(id)` | Same includes as above |
| `searchEmployees(term, options)` | iLike on firstName / lastName / email / employeeId |
| `validateUniqueFields(data, excludeId)` | Returns `{ isValid, conflictField, message }` — checks email + employeeId uniqueness |
| `generateEmployeeId(transaction)` | CAST SUBSTRING sort → increment → `SKYT####`; UPDATE lock prevents race condition; queries paranoid records |
| `validateForeignKeys(data)` | Checks departmentId, positionId, managerId exist and are active; manager cannot be Terminated |
| `createSalaryStructure(employeeId, salaryData, tx)` | Handles nested `{ allowances: {}, deductions: {} }` and legacy flat format |
| `createEmployeeWithUser(employeeData, userData, photo, salaryData)` | Full atomic tx: hash pw → create User → lock+gen ID → create Employee → create SalaryStructure → init LeaveBalances |
| `updateStatus(id, status)` | Syncs User.isActive: Active/On Leave = true, Inactive/Terminated = false |

**Key rules:**
- ID format: `SKYT####` (auto-generated, race-condition-safe)
- Photo URL: `/uploads/employee-photos/{filename}`
- Status transitions: Active ↔ Inactive ↔ On Leave ↔ Terminated

---

### LeaveService

**File:** `backend/services/LeaveService.js`  
**Purpose:** Leave request CRUD, approval, balance management.

| Method | Key Behaviour |
|--------|--------------|
| `createLeaveRequest(data)` | Days = `Math.ceil((end - start) / 86400000) + 1`; 0.5 if half-day; always creates as Pending |
| `approveLeaveRequest(id, approverId, comments)` | UPDATE lock on LeaveBalance → deduct `totalTaken += days, balance -= days` → fire-and-forget email |
| `rejectLeaveRequest(id, approverId, comments)` | Status → Rejected; fire-and-forget email |
| `validateLeaveRequest(data)` | Employee exists · LeaveType exists · start < end · start ≤ 14 days past · no overlap (Approved/Pending) |
| `checkLeaveBalance(empId, leaveTypeId, days)` | Returns `{ isValid, message }` |
| `getLeaveStats(empId, year)` | Aggregate by status; `{ total, approved, pending, rejected, days: {...} }` |

**Key rules:**
- Retroactive allowed up to **14 days past**
- Balance deducted at **request creation** (not approval)
- Half-day = 0.5 days

---

### TimesheetService

**File:** `backend/services/TimesheetService.js`  
**Purpose:** Weekly timesheet CRUD, submission, bulk approval.

| Method | Key Behaviour |
|--------|--------------|
| `getWeekStart(date)` | Normalises to Monday 00:00:00 UTC |
| `getDayColumnName(date)` | Maps day 0-6 → `sundayHours` … `saturdayHours` |
| `updateTimeEntry(id, data)` | Blocked if Approved; data edit blocked if Submitted (status changes allowed) |
| `submitTimesheet(empId, weekStart)` | Updates all Draft entries for week → Submitted |
| `approveTimesheet(ids, approverId, comments)` | Bulk UPDATE in transaction; fire-and-forget email |
| `rejectTimesheet(ids, approverId, comments)` | Same; status → Rejected |
| `getTimesheetSummary(empId, start, end)` | Returns `{ totalHours, totalDays, projects: {}, status: {} }` |

**Key rules:**
- Weekly model: 7 day-columns + totalHoursWorked; **no daily records**
- Status flow: Draft → Submitted → Approved/Rejected
- dailyRate = basicSalary / 30

---

### PayrollService

**File:** `backend/services/PayrollService.js`  
**Purpose:** Payroll calculation (Indian compliance), creation, approval, processing.

| Method | Key Behaviour |
|--------|--------------|
| `performPayrollCalculation(employee, start, end, overrides)` | Period basic = monthly ÷ days × period days · allowances (HRA + other) · deductions (PF, TDS, PT, ESI) · attendance (LOP) → gross/net |
| `calculateAttendanceAdjustment(empId, start, end, rate)` | Fetches approved leaves → marks LOP (name contains 'unpaid'/'loss of pay'/'lop') → deduction = unpaidDays × dailyRate |
| `createPayroll(empId, start, end, overrides)` | No-duplicate check → calculatePayroll → create PayrollData (status = draft) |
| `approvePayroll(id, approverId, comments)` | Status: draft → approved |
| `processPayroll(id, processedBy, paymentDetails)` | Status: approved → paid; sets paymentMode (bank_transfer if bankAccount in details); fire-and-forget payslip email |
| `generatePayslip(payrollDataId)` | Employee snapshot + earnings/deductions JSON → payslip display object |

**Indian fields handled:** PF, TDS/Income Tax, Professional Tax, ESI (auto-computed if gross < ₹21,000), Other Deductions  
**Status flow:** draft → approved → paid

---

### PayslipService

**File:** `backend/services/PayslipService.js`  
**Purpose:** Payslip generation pipeline with bulk support, manual editing, audit trail.

| Method | Key Behaviour |
|--------|--------------|
| `calculatePreview(empId, salary, attendance, options, user)` | Admin/HR only; calls `payslipCalculationService.calculatePayslip()`; no DB write |
| `validateEmployees(ids, month, year)` | Batch pre-fetch (no N+1): checks active salary structure, timesheet approval status, no duplicate payslip, employee status Active |
| `generatePayslips(ids, month, year, templateId, options, user)` | Admin/HR only; transaction per batch; row-locks to prevent duplicates; payslipNumber = `PS{YYYY}{MM}{empId}`; async bulk email |
| `updatePayslip(id, updates, reason, user, ip, ua)` | Draft only; reason ≥ 10 chars; net pay cannot be negative; audits old/new values |

**Key rules:**
- Payslip number: `PS{YYYY}{MM}{employeeId}`
- Only draft payslips can be edited
- All manual edits require reason (audit compliance)

---

### DashboardService

**File:** `backend/services/DashboardService.js`  
**Purpose:** Role-specific dashboard stats with query parallelisation and caching.

| Method | Cache TTL | Returns |
|--------|----------|---------|
| `getEmployeeStats(empId)` | 5 min | `{ leaveBalance, pendingRequests, currentMonth, recentActivity, upcomingLeaves }` |
| `getAdminStats()` | 5 min | Employee counts, leave stats, timesheet/payroll aggregates |
| `getManagerStats(managerId, userId)` | 5 min | Same as admin but filtered to team members |
| `getManagerTeamIds(managerId)` | 1 hour | Array of employee IDs |
| `getAdminStatsWithCharts()` | 1 hour | Stats + trend chart data (expensive aggregations) |

**Performance:** Queries parallelised with `Promise.all()` — reduced from 15+ sequential to 3 parallel groups.

---

### AttendanceService

**File:** `backend/services/attendance.service.js`  
**Purpose:** Daily check-in/out, monthly reports, admin corrections.

| Method | Key Behaviour |
|--------|--------------|
| `checkIn(empId, options)` | TX + UPDATE lock (prevent double check-in); config from SystemConfig (cached 1 min); late if > 15 min past workStart |
| `checkOut(empId, options)` | Calculates hoursWorked (net of break); overtimeHours; earlyLeaveMinutes; half-day if < 50% standard hours |
| `getMonthlyReport(empId, year, month)` | Excludes weekends + holidays from workingDays; marks: present/late/half-day/on-leave/absent |
| `markAttendance(data)` | Admin correction; recalculates hours if both times provided |
| `getDailyAttendance(date, options)` | Paginated all-employee view with optional department filter |

**Work schedule config (from SystemConfig):** workStart (default "09:00"), workEnd ("18:00"), standardHours (8), breakMinutes (60) — cached 1 min.

---

### EmailService

**File:** `backend/services/email.service.js`  
**Purpose:** SMTP setup, templated transactional emails.

| Method | Notes |
|--------|-------|
| `loadSmtpPassword()` | Checks `config/email.config.json` (may be encrypted) → falls back to `SMTP_PASSWORD` env |
| `initializeTransporter()` | Requires SMTP_HOST + SMTP_USER; pings SMTP to confirm connectivity |
| `sendLeaveStatusEmail(...)` | Color-coded status (green/red/gray); includes dates, days, approver |
| `sendWelcomeEmail(user, tempPassword)` | Credentials box + login link (FRONTEND_URL env) |
| `sendPasswordResetEmail(email, data)` | HTML template from disk; replaces `{{name}}`, `{{resetLink}}`, `{{expiresAt}}` |

**Error handling:** Missing config logs warning; send failure logged as warn — never blocks business flow.

---

### AuditService

**File:** `backend/services/audit.service.js`  
**Purpose:** Compliance logging — fire-and-forget, never throws.

| Method | Key Behaviour |
|--------|--------------|
| `log({action, entityType, entityId, userId, ...})` | Sanitises values → extracts IP (X-Forwarded-For → X-Real-IP → remoteAddress) → creates AuditLog. Never throws. |
| `sanitizeValues(values)` | Redacts fields containing: password, token, apikey, secret, ssn, creditcard, bankaccount, privatekey, accesstoken, refreshtoken |
| `query(filters)` | WHERE clause built dynamically; limit capped at 1000 |
| `getFailedOperations(start, end)` | Filter success=false (security monitoring) |
| `getStatistics(start, end)` | Raw SQL: group by action + entity_type → count/success/failure/avg_duration |
| `cleanup(retentionDays)` | Default 2555 days (7 years — SOX). Force-deletes bypassing paranoid. |

---

### CacheService

**File:** `backend/services/CacheService.js`  
**Purpose:** In-memory LRU + TTL cache with no external dependencies.

| Method | Notes |
|--------|-------|
| `set(key, value, ttl)` | Deep-clone via JSON; LRU eviction at maxSize (default 1000); default TTL 300s |
| `get(key)` | Returns deep clone; auto-deletes expired entries |
| `getOrSet(key, fetchFn, ttl)` | Cache-aside pattern: try cache → miss → call fetchFn() → cache + return |
| `invalidate(pattern)` | Glob pattern (`*` = any, `?` = one char) → deletes all matching keys |
| `shutdown()` | Stops cleanup timer + clears Map (for graceful shutdown) |

**Singleton:** `getCacheInstance(options)` · `resetCacheInstance()` for tests.

---

### HolidayService

**File:** `backend/services/holiday.service.js`

| Method | Key Behaviour |
|--------|--------------|
| `isHoliday(date)` | Returns Holiday or null |
| `getHolidayDateSet(start, end)` | Set of `YYYY-MM-DD` strings for O(1) lookup (used by attendance/payroll) |
| `generateRecurringHolidays(targetYear, createdBy)` | Copies all `isRecurring=true` from prev year → adjusts dates → bulk create (ignoreDuplicates) |
| `countHolidaysBetween(start, end, types)` | Used by payroll working-day calculation |

**Types:** `public` (national) · `company` (org-specific)

---

### EmployeeReviewService

**File:** `backend/services/EmployeeReviewService.js`  
**Purpose:** Performance review workflow with RBAC.

| Method | Key Behaviour |
|--------|--------------|
| `listReviews(filters, userRole, userId)` | Employee: own only · Manager: own-created reviews · Admin/HR: all |
| `getReviewById(id, userRole, userId)` | 403 if employee tries to view other's review |
| `createReview(data, reviewerId, req)` | status = draft; checks no duplicate for period+type; audit logged |
| `updateReview(id, body, userRole, userId, req)` | Employee: self-assessment only · Manager: all fields · Admin/HR: full edit; audit logged |
| `updateReviewStatus(id, data, userRole, userId, req)` | Employee: pending_approval · Manager/Admin: submitted · HR: approved/rejected |

**Status flow:** draft → pending_approval → submitted → approved / rejected  
**HR approval fields:** `hrApprovedBy`, `hrApprovedAt`

---

### ConfigService

**File:** `backend/services/config.service.js`  
**Purpose:** .env file management (read, write, backup, validate).

| Method | Notes |
|--------|-------|
| `getAllConfig()` | Returns .env parsed + current `process.env` for 20 key vars |
| `updateConfig(key, value)` | Backup first → replace/append in .env → `restartRequired: true` |
| `createBackup()` | Creates `.env.backup.{ISO-timestamp}` |
| `validateConfig(config)` | Required: DB_HOST, DB_NAME, DB_USER, JWT_SECRET. Validates PORT (1–65535), SMTP_USER if SMTP_HOST set, CORS_ORIGIN prefix |

---

### LogService

**File:** `backend/services/log.service.js`  
**Purpose:** Log file management for `error.log`, `combined.log`, `access.log`.

| Method | Notes |
|--------|-------|
| `readLog(logType, options)` | Max 100 lines (default); newest-first; case-insensitive search filter; pagination via offset |
| `getLogStats()` | Total size (formatted), total lines, per-file stats |
| `clearLog(logType)` | Writes empty string (wipes file content) |

---

## 17. Business Services — Orchestration Layer

Business services sit above data services. They own **transactions**, **RBAC enforcement**, and **multi-step atomic workflows**.

### BaseBusinessService

**File:** `backend/services/business/BaseBusinessService.js`  
Abstract base. Subclasses override `validate(data, context)`.

| Utility Method | Notes |
|---------------|-------|
| `startTransaction()` | Returns Sequelize transaction |
| `formatDate(date)` | Returns `YYYY-MM-DD` (local time, safe for DATEONLY fields) |
| `calculateAge(dob)` | Numeric age calculation |
| `isFutureDate(d)` / `isPastDate(d)` | Boolean date checks |
| `log(action, data)` | Structured log with service name |

---

### EmployeeBusinessService

**File:** `backend/services/business/EmployeeBusinessService.js`  
**Owns:** Full employee lifecycle — creation, updates, compensation, termination.

| Method | Transaction | Key Steps |
|--------|------------|-----------|
| `createEmployee({ data, photo, user })` | ✅ Full TX | Validate → prepare data/user/salary → gen ID (UPDATE lock) → create User → create Employee → create SalaryStructure → init LeaveBalances for ALL active LeaveTypes |
| `updateEmployee(id, data, currentUser)` | - | RBAC check → unique email check → update fields → sync User email → upsert SalaryStructure |
| `updateCompensation(id, salaryData, currentUser)` | - | Admin/HR only; maps nested API format → SalaryStructure; upserts |
| `terminateEmployee(id, currentUser)` | - | Admin/HR only; status=Terminated; terminationDate=now; soft-delete employee; deactivate user |
| `initializeLeaveBalances(empId, tx)` | In parent TX | Fetches all active LeaveTypes → creates LeaveBalance (balance=maxDaysPerYear) for current year |

**Validation rules:** Age ≥ 18; DOB in past; email+employeeId unique; department/position active; manager not Terminated.

---

### LeaveBusinessService

**File:** `backend/services/business/LeaveBusinessService.js`  
**Owns:** Leave state machine + balance bookkeeping.

| Method | Transaction | Key Steps |
|--------|------------|-----------|
| `createLeaveRequest(data, currentUser)` | ✅ | RBAC (employee = self only) → validateLeaveRequest → calc days → deduct balance (pending) |
| `approveLeaveRequest(id, currentUser, comments)` | ✅ | Self-approval forbidden → permission check → balance lock → pending→taken bookkeeping |
| `rejectLeaveRequest(id, currentUser, comments)` | ✅ | Permission check → restore balance (pending→available) → comments required |
| `cancelLeaveRequest(id, currentUser, reason)` | - | If Approved: status=CancellationRequested (needs approval). If Pending: cancel immediately + restore balance |

**Balance state machine:**
```
Create request:   balance.totalPending += days, balance.balance -= days
Approve request:  balance.totalPending -= days, balance.totalTaken += days
Reject request:   balance.totalPending -= days, balance.balance += days
Cancel (pending): balance.totalPending -= days, balance.balance += days
Cancel (approved):balance.totalTaken  -= days, balance.balance += days
```

---

### PayrollBusinessService

**File:** `backend/services/business/PayrollBusinessService.js`  
**Owns:** Payroll creation, calculation, approval pipeline.

| Method | RBAC | Status Flow |
|--------|------|------------|
| `calculatePayroll(empId, start, end, overrides, user)` | Admin/HR | — (preview only) |
| `createPayroll(data, user)` | Admin/HR | Creates as `draft` |
| `processPayroll(id, user)` | Admin/HR | draft → calculated |
| `approvePayroll(id, user, comments)` | Admin/HR | calculated → approved |
| `rejectPayroll(id, user, comments)` | Admin/HR | → back to draft; comments required |

---

### TimesheetBusinessService

**File:** `backend/services/business/TimesheetBusinessService.js`  
**Owns:** Timesheet submission/approval at orchestration level.  
Delegates bulk/calculation work to `TimesheetApprovalService`, `TimesheetCalculationService`, `TimesheetSubmissionService`.

---

## 18. Specialized Sub-Services

### EmployeeBulkService

**File:** `backend/services/employee/EmployeeBulkService.js`

| Method | Notes |
|--------|-------|
| `bulkUpdateEmployees(ids, updateData)` | Whitelist: status, departmentId, managerId only; validates FKs |
| `exportToCSV(filters)` | Returns CSV string; columns: ID, Name, Email, Phone, Dept, Position, Status, HireDate |
| `validateCSVImport(rows)` | Returns `{ valid, invalid }` — checks required fields, email format, DB duplicates, FK validity |
| `detectConflicts(employees)` | Checks within-input duplicates AND DB conflicts; returns `{ row, field, value, type }[]` |

---

### EmployeeSearchService

**File:** `backend/services/employee/EmployeeSearchService.js`

| Method | RBAC |
|--------|------|
| `searchEmployees(options, role, empId)` | Employee: self only · Manager: self + team · Admin/HR: all (max 1000) |
| `getManagerTeam(managerId, requesterId, role)` | Manager can only view own team unless admin/hr |
| `getManagers()` | Returns all managers with subordinate count |

---

### LeaveApprovalService

**File:** `backend/services/leave/LeaveApprovalService.js`

| Method | Notes |
|--------|-------|
| `checkApprovalPermission(leave, approverId, role)` | Admin/HR: always OK · Manager: direct reports only · Self-approval: forbidden |
| `approveLeaveRequest(id, approverId, role, comments)` | TX: handles both cancellation approval and regular approval; updates balance |
| `rejectLeaveRequest(id, approverId, role, comments)` | Comments required; restores balance from pending |
| `getPendingLeaveRequestsForManager(managerId, role)` | Team member IDs → pending leaves |

---

### TimesheetApprovalService

**File:** `backend/services/timesheet/TimesheetApprovalService.js`

| Method | Notes |
|--------|-------|
| `approveWeekTimesheets(empId, weekStartDate, approverId, comments)` | **Primary use case.** TX: all Submitted timesheets for week → bulk update → audit each |
| `rejectWeekTimesheets(empId, weekStart, approverId, reason)` | Same; reason required |
| `bulkApproveTimesheets(ids, approverId, comments)` | Cross-week/employee; per-entry permission check; returns `{ approved[], errors[] }` |

---

### ProjectService

**File:** `backend/services/project/ProjectService.js`

| Method | Notes |
|--------|-------|
| `validateStatusTransition(id, newStatus)` | State machine: Planning→Active/Cancelled · Active→OnHold/Completed/Cancelled · OnHold→Active/Cancelled |
| `createProject(data)` | Validates dates + manager + no duplicate name |
| `canDelete(id)` | Returns `{ canDelete, reason }` — checks no active tasks, no timesheet entries |
| `getProjectStatistics(filters)` | `{ total, byStatus: { planning, active, onHold, completed, cancelled } }` |

---

## 19. Complete Routes Reference

### Routes Already Documented (Sections 1–14)
`/api/auth/*` · `/api/employees/*` · `/api/leave/*` · `/api/timesheets/*` · `/api/attendance/*` · `/api/dashboard/*` · `/api/payroll/*` · `/api/admin/*`

### Additional Routes

#### `/api/positions` — position.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/positions` | All auth | List all active positions |
| GET | `/api/positions/:id` | All auth | Position detail |
| POST | `/api/positions` | Admin / HR | Create position |
| PUT | `/api/positions/:id` | Admin / HR | Update position |
| DELETE | `/api/positions/:id` | Admin | Soft-delete position |

#### `/api/departments` — department.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/departments` | All auth | List all active departments |
| GET | `/api/departments/:id` | All auth | Department detail + employee count |
| POST | `/api/departments` | Admin / HR | Create department |
| PUT | `/api/departments/:id` | Admin / HR | Update department |
| DELETE | `/api/departments/:id` | Admin | Soft-delete department |

#### `/api/projects` — project.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/projects` | All auth | List projects (RBAC-filtered) |
| GET | `/api/projects/:id` | All auth | Project + active tasks |
| POST | `/api/projects` | Admin / HR / Manager | Create project |
| PUT | `/api/projects/:id` | Admin / HR / Manager | Update project; validates status transitions |
| DELETE | `/api/projects/:id` | Admin / HR | Soft-delete (canDelete check first) |
| GET | `/api/projects/statistics` | Admin / HR / Manager | `{ total, byStatus }` |

#### `/api/tasks` — task.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/tasks` | All auth | List tasks (project-scoped) |
| GET | `/api/tasks/:id` | All auth | Task detail |
| POST | `/api/tasks` | Admin / HR / Manager | Create task under project |
| PUT | `/api/tasks/:id` | All auth | Update task (assignee can update status) |
| DELETE | `/api/tasks/:id` | Admin / HR / Manager | Soft-delete task |

#### `/api/users` — user.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/users` | Admin / HR | List all users |
| GET | `/api/users/:id` | Admin / HR | User detail |
| PUT | `/api/users/:id` | Admin | Update user (role, isActive) |
| POST | `/api/users/:id/reset-password` | Admin | Send temp password email |

#### `/api/employee-reviews` — employee-review.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/employee-reviews` | All auth | RBAC-filtered list |
| GET | `/api/employee-reviews/:id` | All auth | Review detail (own or managed) |
| POST | `/api/employee-reviews` | Manager / Admin / HR | Create review |
| PUT | `/api/employee-reviews/:id` | All auth | Update (role-restricted fields) |
| PUT | `/api/employee-reviews/:id/status` | All auth | Status transition |

#### `/api/holidays` — holiday.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/holidays` | All auth | List by year (query param) |
| GET | `/api/holidays/upcoming` | All auth | Next N holidays |
| POST | `/api/holidays` | Admin / HR | Create single holiday |
| POST | `/api/holidays/bulk` | Admin / HR | Create up to 100 holidays |
| PUT | `/api/holidays/:id` | Admin / HR | Update holiday |
| DELETE | `/api/holidays/:id` | Admin | Soft-delete |
| POST | `/api/holidays/generate-recurring` | Admin | Copy recurring holidays to next year |

#### `/api/payslips` — payslipRoutes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| POST | `/api/payslips/validate` | Admin / HR | Validate employees before generation |
| POST | `/api/payslips/generate` | Admin / HR | Bulk generate payslips |
| GET | `/api/payslips/:id` | Admin / HR / Own | View payslip |
| PUT | `/api/payslips/:id` | Admin / HR | Manual edit (draft only; reason required) |
| POST | `/api/payslips/preview` | Admin / HR | Calculate preview without persisting |

#### `/api/payslip-templates` — payslipTemplateRoutes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/payslip-templates` | Admin / HR | List all templates |
| GET | `/api/payslip-templates/:id` | Admin / HR | Template detail |
| POST | `/api/payslip-templates` | Admin / HR | Create template |
| PUT | `/api/payslip-templates/:id` | Admin / HR | Update template |
| POST | `/api/payslip-templates/:id/set-default` | Admin | Set as default (clears previous default) |
| DELETE | `/api/payslip-templates/:id` | Admin | Delete (cannot delete default) |

#### `/api/salary-structures` — salaryStructureRoutes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/salary-structures` | Admin / HR | List all structures |
| GET | `/api/salary-structures/:empId` | Admin / HR / Own | Employee's salary structure |
| POST | `/api/salary-structures` | Admin / HR | Create structure |
| PUT | `/api/salary-structures/:id` | Admin / HR | Update structure |

#### `/api/settings` — settings.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/settings` | Admin | Get all settings |
| PUT | `/api/settings` | Admin | Update settings |
| POST | `/api/settings/reset` | Admin | Reset to defaults |

#### `/api/system-config` — system-config.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/system-config` | Admin | Get system config (work schedule, etc.) |
| PUT | `/api/system-config` | Admin | Update config |
| GET | `/api/system-config/env` | Admin | Read .env config via ConfigService |
| PUT | `/api/system-config/env` | Admin | Write .env config |
| GET | `/api/system-config/env/backups` | Admin | List .env backups |
| POST | `/api/system-config/env/restore` | Admin | Restore .env from backup |

#### `/api/email` — email.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/email/config` | Admin | Get SMTP config (password masked) |
| PUT | `/api/email/config` | Admin | Update SMTP config |
| POST | `/api/email/test` | Admin | Send test email |

#### `/api/leave-accrual` — leave-accrual.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| POST | `/api/leave-accrual/run` | Admin | Manually trigger accrual for all employees |
| GET | `/api/leave-accrual/status` | Admin | Accrual scheduler status |
| PUT | `/api/leave-accrual/config` | Admin | Update accrual rules per leave type |

#### `/api/leave-balance-admin` — leave-balance-admin.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/leave-balance-admin` | Admin / HR | All employee leave balances |
| GET | `/api/leave-balance-admin/:empId` | Admin / HR | One employee's balances |
| PUT | `/api/leave-balance-admin/:empId/:leaveTypeId` | Admin / HR | Manual balance adjustment |
| POST | `/api/leave-balance-admin/carry-forward` | Admin | Year-end carry-forward for all employees |
| POST | `/api/leave-balance-admin/initialize` | Admin | Initialise balances for new leave type |

#### `/api/leave-type-admin` — leave-type-admin.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/leave-type-admin` | Admin / HR | List all leave types |
| GET | `/api/leave-type-admin/:id` | Admin / HR | Leave type detail |
| POST | `/api/leave-type-admin` | Admin | Create leave type |
| PUT | `/api/leave-type-admin/:id` | Admin | Update leave type |
| DELETE | `/api/leave-type-admin/:id` | Admin | Soft-delete (only if no active balances) |

#### `/api/performance` — performance.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/performance/server` | Admin | Server metrics (CPU, memory, uptime) |
| GET | `/api/performance/api` | Admin | API metrics from RequestTracker (p95/p99, per-endpoint) |
| GET | `/api/performance/database` | Admin | DB pool stats |

#### `/api/restore` — restore.routes.js
| Method | Path | RBAC | Notes |
|--------|------|------|-------|
| GET | `/api/restore/employees` | Admin | List soft-deleted employees |
| POST | `/api/restore/employees/:id` | Admin | Restore soft-deleted employee |
| GET | `/api/restore/reviews` | Admin | List soft-deleted reviews |
| POST | `/api/restore/reviews/:id` | Admin | Restore soft-deleted review |
| GET | `/api/restore/leave-balances` | Admin | List soft-deleted balances |
| POST | `/api/restore/leave-balances/:id` | Admin | Restore balance record |

#### `/api/debug` — debug.routes.js
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/debug/cache` | Cache stats — **admin only, dev/staging only** |
| DELETE | `/api/debug/cache` | Clear all cache — admin only |
| GET | `/api/debug/logs` | Log file listing |
| GET | `/api/debug/logs/:type` | Tail log |
| DELETE | `/api/debug/logs/:type` | Clear log file |

---

## 20. Validation Schemas (Joi)

All request bodies pass through Joi validators in `backend/validators/`. The middleware pattern is:
```js
router.post('/path', validate(schema), controller.method);
```
Validation errors returned as: `{ success: false, message: "Validation error", errors: [{field, message}] }`

### AuthValidator (`backend/validators/AuthValidator.js`)

| Schema | Key Rules |
|--------|-----------|
| `loginSchema` | email (valid format, required), password (min 6, required) |
| `registerSchema` | firstName, lastName, email, password (min 8, upper+lower+number required), role ENUM |
| `changePasswordSchema` | currentPassword, newPassword (min 8, complexity), confirmPassword (must match) |
| `forgotPasswordSchema` | email (valid format) |
| `resetPasswordSchema` | token (required), newPassword (complexity), confirmPassword |
| `updateProfileSchema` | firstName, lastName, phone (optional), optional existing password for sensitive fields |

### EmployeeValidator (`backend/validators/EmployeeValidator.js`)

`createEmployeeSchema` — comprehensive:

| Field | Rule |
|-------|------|
| `employeeId` | Optional; if provided must match `/^SKYT\d{4}$/` |
| `email` | Valid email, required |
| `firstName` / `lastName` | Required, 2–50 chars |
| `phone` | Optional, 10–15 digit number string |
| `dateOfBirth` | Past date, age ≥ 18 |
| `hireDate` | Valid date |
| `departmentId` / `positionId` | Valid UUID |
| `managerId` | Valid UUID (optional) |
| `salary.basicSalary` | Number ≥ 0 required if salary object provided |
| `salary.allowances.*` | All numeric, ≥ 0 |
| `salary.deductions.*` | All numeric, ≥ 0 |
| `bankAccount` / `ifscCode` | Optional string fields (Indian banking) |
| `panNumber` | Optional: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/` |
| `aadharNumber` | Optional: 12-digit numeric string |

### AttendanceValidator (`backend/validators/AttendanceValidator.js`)

| Schema | Rules |
|--------|-------|
| `checkInSchema` | source ENUM (web/mobile/kiosk), notes (optional, max 500 chars) |
| `checkOutSchema` | notes (optional, max 500 chars) |
| `markSchema` | employeeId (UUID), date (YYYY-MM-DD), status ENUM, optional checkIn/checkOut times |
| `querySchema` | startDate, endDate, optional employeeId, departmentId, status |

### LeaveValidator (`backend/validators/LeaveValidator.js`)

| Field | Rule |
|-------|------|
| `startDate` | Min: today − 14 days |
| `endDate` | Max: startDate + 90 days |
| `reason` | 10–500 characters |
| `isHalfDay` | Boolean |
| `halfDayType` | ENUM (first/second) — required **only if** `isHalfDay = true` |

### TimesheetValidator (`backend/validators/TimesheetValidator.js`)

| Field | Rule |
|-------|------|
| `weekStartDate` | Must be a **Monday** |
| `weekEndDate` | Must be a **Sunday** |
| `mondayHours` … `sundayHours` | 0–24 (each day) |
| `totalHoursWorked` | 0–168 (max 7×24) |
| `projectId` / `taskId` | Valid UUID |

### PayrollValidator (`backend/validators/PayrollValidator.js`)

| Field | Rule |
|-------|------|
| `month` | Integer 1–12 |
| `year` | Integer 2020–2030 |
| `employeeId` | Valid UUID |
| Overrides | Numeric amounts ≥ 0 |

### HolidayValidator (`backend/validators/HolidayValidator.js`)

| Schema | Rules |
|--------|-------|
| `createSchema` | name (required), date (YYYY-MM-DD), type ENUM (public/company), isRecurring boolean |
| `bulkCreateSchema` | Array of holidays, max **100 items** |

### Other Validators

| File | Schemas |
|------|---------|
| `DepartmentValidator.js` | name (required, unique-checked in service), description optional |
| `PositionValidator.js` | name, description, department association optional |
| `ProjectValidator.js` | name, description, startDate, endDate, status ENUM, managerId UUID |
| `TaskValidator.js` | title, description, projectId (UUID), assigneeId (UUID), priority ENUM, dueDate |
| `EmployeeReviewValidator.js` | reviewPeriod, reviewType ENUM, overallRating (1–5), per-skill ratings (1–5), comments (10–2000 chars) |
| `PayslipTemplateValidator.js` | name, headerFields JSON, earningsFields JSON, deductionsFields JSON, footerFields JSON, styling JSON |
| `SettingsValidator.js` | Key-value pairs for system settings; validates per known setting key |
| `AdminValidator.js` | `emailConfigSchema` (SMTP fields), `systemConfigSchema` (env var key-value pairs) |

---

## 21. Additional Middleware

### LoginRateLimiter (`backend/middleware/loginRateLimiter.js`)

Dual-axis rate limiting applied to `/api/auth/login` only.

| Dimension | Limit | Window | Action |
|-----------|-------|--------|--------|
| Per IP | 5 attempts | 15 min | 429 Too Many Requests |
| Per username | 10 attempts | 1 hour | 429 Too Many Requests |

**Features:**
- Exponential backoff on repeated violations
- Distributed attack detection (many usernames from same IP)
- Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Backed by in-memory store (resets on server restart)

---

### PasswordReauth (`backend/middleware/passwordReauth.js`)

Applied to sensitive admin endpoints (e.g., delete user, change roles, view payslip).

**Flow:** Expects `X-Confirm-Password` header → bcrypt.compare against current user's password hash → 401 if mismatch.

---

### RequestLogger (`backend/middleware/requestLogger.js`)

Attaches to every request.

- Sets `req.requestId` (UUID v4)
- Records `req.startTime`
- Logs on response: `method · path · status · IP · userId · responseTime`
- Flags slow requests (> 1 second) as WARN level

---

### RequestTracker (`backend/middleware/requestTracker.js`)

In-memory API performance metrics (no persistence).

- Tracks: total request count, per-endpoint counts, response-time array
- Computes: **p95** and **p99** response times on demand
- Exposed via `/api/performance/api` (admin only)
- Resets on server restart

---

### Upload (`backend/middleware/upload.js`)

Multer-based file upload middleware.

| Setting | Value |
|---------|-------|
| Max file size | 5 MB |
| Allowed types | JPEG, PNG, GIF, WEBP (magic-byte validation — not just extension) |
| Storage | Disk: `backend/uploads/employee-photos/` |
| Filename | UUID v4 + original extension (prevents collisions) |
| MIME check | Buffer read (first 4 bytes) to verify actual file type |

---

## 22. Complete Frontend Services

All services are in `frontend/src/services/`. They call the backend REST API via `http-common` (Axios instance with auth interceptors).

### ServiceHelpers (`services/serviceHelpers.js`)

Shared utilities used by all services.

| Helper | Notes |
|--------|-------|
| `normalizeResponse(response)` | Extracts `response.data` and ensures `{ success, data, message }` shape |
| `normalizeError(error)` | Converts Axios error to `{ success: false, message, errors[] }` |
| `withNormalizedResponse(fn)` | HOC: wraps any async service method to auto-normalise + auto-normalise errors |

---

### AttendanceService (`services/attendanceService.js`)

| Method | API Call |
|--------|---------|
| `checkIn(data)` | POST `/api/attendance/check-in` |
| `checkOut(data)` | POST `/api/attendance/check-out` |
| `getTodayStatus()` | GET `/api/attendance/today` |
| `getMyAttendance(startDate, endDate)` | GET `/api/attendance/me` |
| `getMonthlyReport(empId, year, month)` | GET `/api/attendance/monthly-report` |
| `getDailyAttendance(date, options)` | GET `/api/attendance/daily` |
| `markAttendance(data)` | POST `/api/attendance/mark` (admin) |
| `getAttendanceSummary(start, end)` | GET `/api/attendance/summary` |

---

### DashboardService (`services/dashboardService.js`)

| Method | API Call |
|--------|---------|
| `getStats()` | GET `/api/dashboard/stats` (role-aware) |
| `getAdminStats()` | GET `/api/dashboard/admin` |
| `getManagerStats()` | GET `/api/dashboard/manager` |
| `getChartData()` | GET `/api/dashboard/charts` |

---

### PayrollService (`services/payrollService.js`)

| Method | Notes |
|--------|-------|
| `calculatePayroll(empId, start, end, overrides)` | Preview calculation |
| `createPayroll(data)` | Create draft payroll record |
| `approvePayroll(id, comments)` | Move to approved status |
| `processPayroll(id, paymentDetails)` | Mark as paid |
| `generatePayslips(ids, month, year, templateId)` | Bulk payslip generation |
| `validateEmployees(ids, month, year)` | Pre-generation validation |
| `updatePayslip(id, updates, reason)` | Manual edit (draft only) |
| `getPayslipTemplates()` | List templates |
| `createTemplate(data)` | Create payslip template |
| `updateTemplate(id, data)` | Update template |
| `setDefaultTemplate(id)` | Set as default |
| `calculatePreview(empId, options)` | Payslip preview without saving |
| `getPayslip(id)` | Fetch single payslip |
| `getEmployeePayslips(empId)` | Employee payslip history |
| `downloadPayslipPDF(id)` | PDF download (blob response) |
| `getSalaryStructure(empId)` | Get active salary structure |
| `updateSalaryStructure(empId, data)` | Update salary |

---

### ProjectService (`services/projectService.js`)

| Method | API Call |
|--------|---------|
| `getProjects(filters)` | GET `/api/projects` |
| `getProjectById(id)` | GET `/api/projects/:id` |
| `createProject(data)` | POST `/api/projects` |
| `updateProject(id, data)` | PUT `/api/projects/:id` |
| `deleteProject(id)` | DELETE `/api/projects/:id` |
| `getProjectStats()` | GET `/api/projects/statistics` |
| `getMyProjects()` | GET `/api/projects?assignedToMe=true` |
| `getProjectTimeline(id)` | GET `/api/projects/:id/timeline` |

---

### TaskService (`services/taskService.js`)

| Method | API Call |
|--------|---------|
| `getTasks(filters)` | GET `/api/tasks` |
| `getTaskById(id)` | GET `/api/tasks/:id` |
| `createTask(data)` | POST `/api/tasks` |
| `updateTask(id, data)` | PUT `/api/tasks/:id` |
| `deleteTask(id)` | DELETE `/api/tasks/:id` |
| `getMyTasks()` | GET `/api/tasks?assignedToMe=true` |
| `updateTaskStatus(id, status)` | PUT `/api/tasks/:id` `{ status }` |
| `getTasksByProject(projectId)` | GET `/api/tasks?projectId=:id` |

---

### EmployeeReviewService (`services/employeeReviewService.js`)

| Method | API Call |
|--------|---------|
| `getReviews(filters)` | GET `/api/employee-reviews` |
| `getReviewById(id)` | GET `/api/employee-reviews/:id` |
| `createReview(data)` | POST `/api/employee-reviews` |
| `updateReview(id, data)` | PUT `/api/employee-reviews/:id` |
| `updateStatus(id, status, hrApproved)` | PUT `/api/employee-reviews/:id/status` |
| `getMyReviews()` | GET `/api/employee-reviews?self=true` |
| `submitSelfAssessment(id, data)` | PUT `/api/employee-reviews/:id` `{ selfAssessment }` |
| `approveReview(id, comments)` | PUT `/api/employee-reviews/:id/status` `{ status: 'approved' }` |

---

### LeaveBalanceAdminService (`services/leaveBalanceAdminService.js`)

| Method | Notes |
|--------|-------|
| `getAllBalances(filters)` | All employee leave balances (admin) |
| `getEmployeeBalances(empId)` | One employee's balances |
| `adjustBalance(empId, leaveTypeId, data)` | Manual adjustment |
| `carryForward(year)` | Year-end carry-forward |
| `initializeBalances(leaveTypeId)` | Init for new leave type |
| `resetBalances(year)` | Reset all to zero for year |
| `getBalanceSummary()` | Aggregated balance summary |
| `exportBalances()` | CSV export of all balances |

---

### LeaveTypeAdminService (`services/leaveTypeAdminService.js`)

| Method | Notes |
|--------|-------|
| `getLeaveTypes()` | List all (including inactive) |
| `createLeaveType(data)` | Create with accrual config |
| `updateLeaveType(id, data)` | Update rules |
| `deleteLeaveType(id)` | Soft-delete |

---

### LeaveAccrualService (`services/leaveAccrualService.js`)

| Method | Notes |
|--------|-------|
| `getAccrualStatus()` | Scheduler status + last run time |
| `runAccrual()` | Manual trigger |
| `getAccrualConfig()` | Per-leave-type accrual rules |
| `updateAccrualConfig(leaveTypeId, config)` | Update accrual settings |

---

### PerformanceService (`services/performanceService.js`)

| Method | Returns |
|--------|---------|
| `getServerMetrics()` | CPU, memory, uptime from `/api/performance/server` |
| `getApiMetrics()` | p95/p99, per-endpoint stats from `/api/performance/api` |

---

### SalaryService (`services/salaryService.js`)

| Method | Notes |
|--------|-------|
| `getSalaryStructure(empId)` | Employee's active salary structure |
| `createSalaryStructure(empId, data)` | Create new structure |
| `updateSalaryStructure(id, data)` | Update existing |
| `getSalaryHistory(empId)` | Historical salary records |

---

### SettingsService (`services/settingsService.js`)

| Method | Notes |
|--------|-------|
| `getSettings()` | All system settings |
| `updateSettings(data)` | Bulk update settings |

---

### RestoreService (`services/restoreService.js`)

| Method | Notes |
|--------|-------|
| `getDeletedEmployees()` | Soft-deleted employees list |
| `restoreEmployee(id)` | Restore employee record |
| `getDeletedReviews()` | Soft-deleted reviews |
| `restoreReview(id)` | Restore review |
| `getDeletedLeaveBalances()` | Soft-deleted balances |
| `restoreLeaveBalance(id)` | Restore balance record |

---

## 23. Frontend Contexts

### LoadingContext (`frontend/src/contexts/LoadingContext.js`)

Centralises loading state across the app. Prevents showing multiple conflicting spinners.

**Context value:**
```js
{
  isLoading(key),         // boolean: is named operation loading?
  isAnyLoading(),         // boolean: is anything loading?
  setLoading(key, bool),  // set named loading state
  updateProgress(key, %),  // update progress value (0-100)
  setGlobalLoadingState(bool) // override all loading
}
```

**Hooks:**
- `useLoading()` — access context directly
- `useComponentLoading(key)` — returns `[isLoading, setLoading]` for a named key

**Components:**
- `LoadingWrapper` — wraps content, shows spinner overlay when loading
- `LoadingButton` — button with built-in loading/disabled state
- `LoadingSkeleton` — placeholder skeleton during data fetch
- `GlobalLoadingBackdrop` — full-screen overlay for global operations
- `withLoading(Component)` — HOC: injects loading props into any component

---

### NotificationContext (`frontend/src/contexts/NotificationContext.js`)

Centralises toast/notification management.

**Context value:**
```js
{
  showSuccess(message, options),
  showError(message, options),
  showWarning(message, options),
  showInfo(message, options),
  addNotification(notification)   // raw notification object
}
```

**Hook: `useApiNotifications()`**

| Method | Usage |
|--------|-------|
| `handleApiSuccess(response, successMsg)` | Shows success toast from API response |
| `handleApiError(error, fallbackMsg)` | Shows error toast; parses API error format `{ errors[] }` |
| `showValidationErrors(errors)` | Shows one toast per validation error field |
| `showOperationSuccess(operation, entity)` | Formatted: "Employee created successfully" |

---

## 24. Remaining Model Details

### RefreshToken (`backend/models/RefreshToken.js`)

Stores valid refresh tokens for the rotating-token system.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `userId` | UUID (FK) | References User; CASCADE delete |
| `token` | TEXT UNIQUE | The actual JWT refresh token string |
| `expiresAt` | DATETIME | 7 days from issue |
| `isRevoked` | BOOLEAN | Default false; true after use (rotation) or logout |
| `revokedAt` | DATETIME | Timestamp when revoked |
| `userAgent` | STRING | Browser/client identifier for security display |
| `ipAddress` | STRING | Source IP (for security audit) |

**Lifecycle:** Issued at login → stored → used once → marked `isRevoked=true` → new token issued (rotation). Reuse of a revoked token invalidates entire token family (all user tokens revoked).

---

### PasswordResetToken (`backend/models/PasswordResetToken.js`)

Tracks password reset requests; prevents reuse and rate abuse.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | — |
| `tokenId` | STRING(64) UNIQUE | The random token sent in reset email |
| `email` | STRING | Used for rate-limiting by address |
| `usedAt` | DATETIME | Set when token consumed (single-use) |
| `expiresAt` | DATETIME | 1 hour from creation |

**Indexes:** `tokenId` (fast lookup) · `email` (rate limit query) · `expiresAt` (cleanup job)  
**Note:** `updatedAt` is disabled on this model (only `createdAt`).

---

### PayslipTemplate (`backend/models/PayslipTemplate.js`)

Configures payslip PDF/display layout.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | — |
| `name` | STRING | Template name |
| `isDefault` | BOOLEAN | Only one can be default (hook auto-resets others) |
| `headerFields` | JSON | Company name, logo, address fields shown at top |
| `earningsFields` | JSON | Which earning items to show and their labels |
| `deductionsFields` | JSON | Which deduction items to show and their labels |
| `footerFields` | JSON | Signature lines, notes, bank info |
| `styling` | JSON | Font, colours, logo URL, layout settings |

**Class methods:**
- `setAsDefault()` — instance method: sets self as default, clears all others (uses beforeUpdate hook)
- `getDefaultTemplate()` — class method: finds template where `isDefault = true`
- `createDefaultTemplate()` — class method: creates standard Indian payroll template if none exists

**Hook:** `beforeUpdate` on any template: if `isDefault` being set to true, resets all others to false (atomic).

---

### PayslipAuditLog (`backend/models/PayslipAuditLog.js`)

Immutable audit log for manual payslip edits (payroll compliance).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | — |
| `payslipId` | UUID (FK) | References Payslip; CASCADE delete |
| `action` | ENUM | `manual_edit` / `status_change` / `finalize` / `mark_paid` / `regenerate` |
| `performedBy` | UUID (FK) | References User who made the change |
| `reason` | TEXT | Mandatory justification (min 10 chars — validated in service) |
| `changes` | JSONB | `{ field: { oldValue, newValue } }` for each changed field |
| `createdAt` | DATETIME | — |

**Note:** `timestamps: false` + only `createdAt` manually defined — records are **immutable** (no `updatedAt`).

---

*This reference covers the complete SkyRakSys HRM system as implemented. For infrastructure questions, see `PROD_README.md`. For go-live procedures, see `GO_LIVE_INSTRUCTIONS.txt`.*
