# Database Design Guide

> **Last updated:** 2026-02-14 | **22 tables** | PostgreSQL 15 | Sequelize 6.35 ORM

---

## Entity-Relationship Diagram

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
                                     │PayslipTempl│ │PayslipAudit  │
                                     └────────────┘ └──────────────┘

 Cross-cutting: AuditLog, SystemConfig, RefreshToken, PasswordResetToken,
                Holiday, EmployeeReview
```

---

## Common Patterns

| Pattern | Details |
|---------|---------|
| **Primary Keys** | UUID v4 (all tables except legacy payroll_data which may be INTEGER) |
| **Soft Delete** | `paranoid: true` with `deletedAt` column on: users, employees, departments, positions, leave_balances, leave_requests, timesheets, payslips, employee_reviews, attendances |
| **Timestamps** | `createdAt` + `updatedAt` on all tables. Some immutable tables (audit_logs, payslip_audit_logs) only have `createdAt` |
| **Naming** | Table: snake_case plural (`salary_structures`). Model: PascalCase singular (`SalaryStructure`). Column: camelCase in model, snake_case in DB |
| **Currency** | INR (Indian Rupee). DECIMAL types for all monetary values |
| **Enum columns** | Stored as PostgreSQL ENUM types |

---

## Table Definitions

### 1. users

**Core user authentication table**

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | UUIDV4 |
| firstName | STRING | NOT NULL | |
| lastName | STRING | NOT NULL | |
| email | STRING | NOT NULL, UNIQUE | |
| password | STRING | NOT NULL | |
| role | ENUM | NOT NULL | 'employee' |
| isActive | BOOLEAN | | true |
| failedLoginAttempts | INTEGER | NOT NULL | 0 |
| lockoutUntil | DATE | nullable | |
| lastLoginAt | DATE | nullable | |
| passwordChangedAt | DATE | nullable | |
| emailVerifiedAt | DATE | nullable | |

**Roles:** `admin`, `hr`, `manager`, `employee`  
**Indexes:** `idx_users_email`, `idx_users_role`, `idx_users_active`  
**Scopes:** `defaultScope` excludes `password`; `withPassword` includes all  
**Associations:** hasOne Employee, hasMany RefreshToken  
**Soft delete:** Yes (paranoid)

---

### 2. employees

**Core employee profile — most columns of any table**

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | UUIDV4 |
| employeeId | STRING | UNIQUE, NOT NULL | HR-assigned (SKYT####) |
| firstName, lastName | STRING | NOT NULL | |
| email | STRING | UNIQUE, NOT NULL | |
| phone | STRING | nullable | |
| hireDate | DATEONLY | nullable | |
| status | ENUM | | 'Active' |
| *Identity* | | | |
| aadhaarNumber | STRING | nullable | Indian national ID |
| panNumber | STRING | nullable | Tax ID |
| uanNumber | STRING | nullable | PF universal account |
| pfNumber, esiNumber | STRING | nullable | |
| *Banking* | | | |
| bankName, bankAccountNumber | STRING | nullable | |
| ifscCode, bankBranch | STRING | nullable | |
| accountHolderName | STRING | nullable | |
| *Address* | | | |
| address | TEXT | nullable | |
| city, state, pinCode | STRING | nullable | |
| *Personal* | | | |
| dateOfBirth | DATEONLY | nullable | |
| gender | ENUM | nullable | Male/Female/Other |
| maritalStatus | ENUM | nullable | |
| nationality | STRING | nullable | |
| photoUrl | STRING | nullable | |
| *Employment* | | | |
| workLocation | STRING | nullable | |
| employmentType | ENUM | nullable | Full-time/Part-time/Contract/Intern |
| joiningDate, confirmationDate | DATEONLY | nullable | |
| resignationDate, lastWorkingDate | DATEONLY | nullable | |
| probationPeriod | INTEGER | nullable | Months |
| noticePeriod | INTEGER | nullable | Days |
| *Emergency* | | | |
| emergencyContactName/Phone/Relation | STRING | nullable | |
| *Foreign Keys* | | | |
| userId | UUID | FK → users.id | |
| departmentId | UUID | FK → departments.id | |
| positionId | UUID | FK → positions.id | |
| managerId | UUID | FK → employees.id | Self-referencing |

**Statuses:** `Active`, `Inactive`, `On Leave`, `Terminated`  
**Associations:** belongsTo User, Department, Position, Employee(manager); hasMany LeaveRequest, LeaveBalance, Timesheet, Employee(subordinates); hasOne SalaryStructure

---

### 3. departments

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | UUIDV4 |
| name | STRING | NOT NULL, UNIQUE | |
| code | STRING(10) | UNIQUE, nullable | |
| description | TEXT | nullable | |
| parentId | UUID | FK → self, nullable | Hierarchical |
| managerId | UUID | FK → employees.id, nullable | |
| isActive | BOOLEAN | | true |

**Associations:** Self-ref parent/children, belongsTo Employee(manager), hasMany Employee, Position

---

### 4. positions

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | UUIDV4 |
| title | STRING | NOT NULL | |
| code | STRING(50) | UNIQUE, nullable | |
| description | TEXT | nullable | |
| level | ENUM | nullable | Entry→Director |
| departmentId | UUID | FK → departments.id | |
| minSalary, maxSalary | DECIMAL | nullable | |
| responsibilities, requirements | TEXT | nullable | |
| isActive | BOOLEAN | | true |

**Levels:** `Entry`, `Junior`, `Mid`, `Senior`, `Lead`, `Manager`, `Director`

---

### 5. leave_types

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| name | STRING, UNIQUE, NOT NULL | |
| description | TEXT, nullable | |
| maxDaysPerYear | INTEGER | |
| carryForward | BOOLEAN | false |
| maxCarryForwardDays | INTEGER | 0 |
| isActive | BOOLEAN | true |

**Not paranoid (no soft delete)**. Default types: Sick (12), Casual (12), Annual (21, carry 5), Maternity (182), Paternity (15).

---

### 6. leave_balances

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| leaveTypeId | UUID FK, NOT NULL | |
| year | INTEGER, NOT NULL | |
| totalAccrued | DECIMAL(5,2) | 0 |
| totalTaken | DECIMAL(5,2) | 0 |
| totalPending | DECIMAL(5,2) | 0 |
| balance | DECIMAL(5,2) | 0 |
| carryForward | DECIMAL(5,2) | 0 |

**Unique Index:** `[employeeId, leaveTypeId, year]`

---

### 7. leave_requests

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| leaveTypeId | UUID FK | |
| startDate, endDate | DATEONLY, NOT NULL | |
| totalDays | DECIMAL(4,1) | Calculated |
| reason | TEXT | |
| status | ENUM | 'Pending' |
| approvedBy | UUID FK → users.id | |
| approvedAt, rejectedAt | DATE | |
| approverComments, rejectionReason | TEXT | |
| isHalfDay | BOOLEAN | false |
| halfDayType | ENUM | first_half/second_half |
| isCancellation | BOOLEAN | false |
| originalLeaveRequestId | UUID FK → self | |
| cancellationNote | TEXT | |

**Statuses:** `Pending`, `Approved`, `Rejected`, `Cancelled`, `Cancellation Requested`

---

### 8. projects

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| name | STRING, UNIQUE, NOT NULL | |
| description | TEXT | |
| startDate, endDate | DATEONLY | |
| status | ENUM | 'Planning' |
| clientName | STRING | |
| managerId | UUID FK → employees.id | |
| isActive | BOOLEAN | true |

**Statuses:** `Planning`, `Active`, `On Hold`, `Completed`, `Cancelled`. Not paranoid.

---

### 9. tasks

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| name | STRING, NOT NULL | |
| description | TEXT | |
| projectId | UUID FK → projects.id | |
| assignedTo | UUID FK → employees.id | |
| estimatedHours, actualHours | DECIMAL | |
| status | ENUM | 'Not Started' |
| priority | ENUM | 'Medium' |
| availableToAll | BOOLEAN | false |
| isActive | BOOLEAN | true |

**Statuses:** `Not Started`, `In Progress`, `Completed`, `On Hold`. **Priorities:** `Low`, `Medium`, `High`, `Critical`.

---

### 10. timesheets

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| projectId | UUID FK | |
| taskId | UUID FK | |
| weekStartDate | DATEONLY, NOT NULL | Monday |
| weekEndDate | DATEONLY | Sunday |
| weekNumber | INTEGER | ISO week |
| year | INTEGER | |
| totalHoursWorked | DECIMAL(5,2) | 0 |
| mondayHours–sundayHours | DECIMAL(4,2) | 0 each |
| description | TEXT | |
| status | ENUM | 'Draft' |
| submittedAt, approvedAt, rejectedAt | DATE | |
| approverComments | TEXT | |
| approvedBy | UUID FK | |

**Statuses:** `Draft`, `Submitted`, `Approved`, `Rejected`  
**Indexes:** `[employeeId, weekStartDate]`, `[projectId, weekStartDate]`, `[status]`, `[weekStartDate, weekEndDate]`

---

### 11. salary_structures

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, UNIQUE | One active per employee |
| basicSalary | DECIMAL, NOT NULL | |
| hra | DECIMAL | 0 |
| allowances | JSON | |
| pfContribution | DECIMAL | 0 |
| tds | DECIMAL | 0 |
| professionalTax | DECIMAL | 0 |
| otherDeductions | JSON | |
| currency | STRING | 'INR' |
| effectiveFrom | DATEONLY | |
| isActive | BOOLEAN | true |

---

### 12. payroll_data

| Column | Type | Default |
|--------|------|---------|
| id | INTEGER/UUID PK | AUTO |
| employeeId | UUID FK, NOT NULL | |
| payPeriod | STRING, NOT NULL | e.g. "2026-02" |
| payPeriodStart, payPeriodEnd | DATEONLY | |
| totalWorkingDays, presentDays, absentDays | INTEGER | |
| lopDays | INTEGER | 0 |
| paidDays | INTEGER | |
| overtimeHours | DECIMAL | 0 |
| variableEarnings, variableDeductions, leaveAdjustments | JSON | |
| grossSalary, totalDeductions, netSalary | DECIMAL | |
| paymentMode | ENUM | bank_transfer/cheque/cash |
| status | ENUM | 'draft' |
| approvedBy, createdBy, updatedBy | UUID FK → users.id | |

**Statuses:** `draft`, `calculated`, `approved`, `paid`, `cancelled`  
**Unique Index:** `[employeeId, payPeriod]`

---

### 13. payslips

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| payrollDataId | FK → payroll_data.id | |
| payPeriod | STRING | |
| month, year | INTEGER | |
| templateId | UUID FK | |
| templateVersion | INTEGER | |
| employeeInfo, companyInfo | JSON | Snapshots |
| earnings, deductions, attendance | JSON | {} |
| grossEarnings, totalDeductions, netPay | DECIMAL(12,2) | 0 |
| netPayInWords | STRING | |
| payslipNumber | STRING, UNIQUE | Auto: PS{YYYY}{MM}{empId} |
| status | ENUM | 'draft' |
| version | INTEGER | 1 |
| isLocked | BOOLEAN | false |
| manuallyEdited | BOOLEAN | false |

**Statuses:** `draft`, `finalized`, `paid`, `cancelled`  
**Hooks:** `beforeCreate` auto-generates payslipNumber. `beforeUpdate` prevents locked edits, increments version.  
**Instance methods:** `lock()`, `unlock(force)`, `markAsPaid()`  
**Unique Index:** `[employeeId, month, year]`

---

### 14. payslip_templates

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| name | STRING, UNIQUE, NOT NULL | |
| description | TEXT | |
| isDefault | BOOLEAN | false |
| isActive | BOOLEAN | true |
| headerFields, earningsFields, deductionsFields, footerFields, styling | JSON | |
| createdBy, updatedBy | UUID FK → employees.id | |

**Hook:** `beforeSave` ensures only one template is default.

---

### 15. payslip_audit_logs

Immutable audit trail for payslip operations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payslipId | UUID FK, CASCADE | |
| action | ENUM | manual_edit, status_change, finalize, mark_paid, regenerate |
| performedBy | UUID FK → users.id | |
| reason | TEXT | |
| changes | JSONB | Before/after values |
| ipAddress, userAgent | STRING | |
| createdAt | DATE | Only createdAt (no updatedAt) |

---

### 16. audit_logs

General-purpose immutable audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| action | ENUM(30+ values) | LOGIN_SUCCESS, CREATED, UPDATED, DELETED, APPROVED, etc. |
| entityType | STRING(50) | Model name |
| entityId | UUID | Target entity |
| userId | UUID FK → users.id | Actor |
| oldValues, newValues | JSONB | |
| reason | TEXT | |
| ipAddress | STRING(45) | |
| userAgent | TEXT | |
| metadata | JSONB | {} |
| duration | INTEGER | Operation ms |
| success | BOOLEAN (NOT NULL) | true |
| errorMessage | TEXT | |

**Immutability:** `beforeUpdate` throws, `beforeDestroy` throws  
**Data sanitization:** `beforeCreate` redacts password, token, apiKey, secret, ssn  
**Class methods:** `getEntityHistory()`, `getUserActivity()`, `getFailedOperations()`

**Indexes (7):** userId, [entityType, entityId], action, createdAt, success, [userId, action, createdAt], [entityType, entityId, createdAt]

---

### 17. refresh_tokens

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| token | TEXT, UNIQUE, NOT NULL | JWT refresh token value |
| userId | UUID FK, NOT NULL | |
| expiresAt | DATE, NOT NULL | |
| isRevoked | BOOLEAN | false |
| revokedAt | DATE | |
| userAgent | TEXT | |
| ipAddress | STRING | |

---

### 18. system_configs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| category | STRING(50), NOT NULL | Group (e.g. "auth", "email") |
| key | STRING(100), NOT NULL | Config key name |
| value | TEXT | JSON-encoded value |
| version | INTEGER | 1 — versioned for audit trail |
| changedBy | UUID FK → users.id | |
| description | TEXT | |

**Indexes:** `[category, key, version]`, `[category, key]`, `[changedBy]`

---

### 19. employee_reviews

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| reviewerId | UUID FK → users.id | |
| reviewPeriod | STRING | e.g. "Q1 2026" |
| reviewType | ENUM | quarterly/annual/probationary/performance_improvement |
| overallRating | DECIMAL(3,2) | 1.00–5.00 |
| technicalSkills, communication, teamwork, leadership, punctuality | DECIMAL(3,2) | |
| achievements, areasForImprovement, goals | TEXT | |
| reviewerComments, employeeSelfAssessment | TEXT | |
| status | ENUM | 'draft' |
| reviewDate, nextReviewDate | DATEONLY | |
| hrApproved | BOOLEAN | false |
| hrApprovedBy | UUID FK → users.id | |

**Statuses:** `draft`, `pending_employee_input`, `pending_approval`, `completed`, `archived`

---

### 20. holidays

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| name | STRING(100), NOT NULL | |
| date | DATEONLY, NOT NULL | |
| type | ENUM | 'public' |
| year | INTEGER | Derived from date |
| isRecurring | BOOLEAN | false |
| description | STRING(500) | |
| isActive | BOOLEAN | true |
| createdBy | UUID FK → users.id | |

**Types:** `public`, `restricted`, `company`  
**Unique Index:** `[date, name]`

---

### 21. attendances

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | UUIDV4 |
| employeeId | UUID FK, NOT NULL | |
| date | DATEONLY, NOT NULL | |
| checkIn, checkOut | DATE | Full timestamps |
| status | ENUM | 'present' |
| hoursWorked, overtimeHours | DECIMAL(5,2) | 0 |
| lateMinutes, earlyLeaveMinutes | INTEGER | 0 |
| breakDuration | DECIMAL(5,2) | 0 |
| source | ENUM | 'web' |
| notes | TEXT | |
| ipAddress | STRING | |
| approvedBy | UUID FK → users.id | |

**Statuses:** `present`, `absent`, `half-day`, `on-leave`, `holiday`, `weekend`, `late`  
**Sources:** `manual`, `biometric`, `web`, `mobile`  
**Unique Index:** `[employeeId, date]`

---

### 22. password_reset_tokens

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tokenId | STRING(64), UNIQUE, NOT NULL | Hashed token identifier |
| userId | UUID FK → users.id | |
| email | STRING, NOT NULL | |
| usedAt | DATE, nullable | When consumed |
| expiresAt | DATE, NOT NULL | |
| createdAt | DATE | No updatedAt |

---

## Migrations

| # | Migration File | Purpose |
|---|---------------|---------|
| 1 | `20260209000000-fresh-consolidated-schema.js` | Creates all 19 core tables |
| 2 | `20260209100000-gap-fixes-module-2-3-5-6.js` | UNIQUE on salary_structures.employee_id, audit_logs FK RESTRICT, UNIQUE on payslip_templates.name & projects.name |
| 3 | `20260210000000-gap-fixes-module-9-10-11.js` | Additional module fixes |
| 4 | `20260210000001-normalize-audit-log-actions.js` | Standardize action enum values |
| 5 | `20260210000002-fix-approvedby-fk-consistency.js` | Fix FK types on approvedBy columns |
| 6 | `20260210000003-create-password-reset-tokens.js` | Creates password_reset_tokens table |
| 7 | `20260210000004-create-holidays.js` | Creates holidays table |
| 8 | `20260210000005-create-attendances.js` | Creates attendances table |
| 9 | `20260210100000-fix-pk-type-mismatches.js` | payslip_audit_logs.id INTEGER→UUID |

### Running Migrations

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo

# Reset all migrations
npx sequelize-cli db:migrate:undo:all
```

---

## Key Associations Summary

```
User (1) ──── (1) Employee
User (1) ──── (N) RefreshToken
Employee (N) ──── (1) Department
Employee (N) ──── (1) Position
Employee (1) ──── (N) Employee (manager→subordinates)
Employee (1) ──── (N) LeaveRequest
Employee (1) ──── (N) LeaveBalance
Employee (1) ──── (N) Timesheet
Employee (1) ──── (1) SalaryStructure
Employee (1) ──── (N) Attendance
Employee (1) ──── (N) EmployeeReview
Department (1) ──── (N) Position
Department (1) ──── (N) Department (parent→children)
Project (1) ──── (N) Task
Project (1) ──── (N) Timesheet
PayrollData (1) ──── (1) Payslip
Payslip (N) ──── (1) PayslipTemplate
Payslip (1) ──── (N) PayslipAuditLog
LeaveBalance (N) ──── (1) LeaveType
LeaveRequest (N) ──── (1) LeaveType
```
