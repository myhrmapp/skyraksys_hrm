# SkyrakSys HRM — Database Design

> **Document Owner**: Database Administrator (DBA)  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: DBAs, backend developers, data architects

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| **RDBMS** | PostgreSQL 15+ |
| **ORM** | Sequelize 6.37 |
| **Tables** | 22 |
| **Primary Keys** | UUID v4 (all tables) |
| **Timestamps** | `createdAt`, `updatedAt` on all tables |
| **Soft Delete** | `paranoid: true` → `deletedAt` column (most tables) |
| **Schema Mgmt** | Sequelize CLI migrations |
| **Connection Pool** | min: 2, max: 10, acquire: 60s, idle: 30s |

---

## 2. Entity Relationship Diagram

```
                                    ┌──────────────┐
                                    │   Holiday    │
                                    │   (public    │
                                    │   calendars) │
                                    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  SystemConfig│    │  AuditLog    │    │PasswordReset │
│  (settings)  │    │ (all changes)│    │    Token     │
└──────────────┘    └──────┬───────┘    └──────┬───────┘
                           │                   │
                    ┌──────┴───────┐    ┌──────┴───────┐
                    │    Users     │───→│ RefreshToken │
                    │ (auth/login) │    │  (sessions)  │
                    └──────┬───────┘    └──────────────┘
                           │ 1:1
                    ┌──────┴───────────────────────────────────┐
                    │              Employees                     │
                    │  (core entity: personal, work, statutory) │
                    └──┬───┬───┬───┬───┬───┬───┬───┬───────────┘
                       │   │   │   │   │   │   │   │
         ┌─────────────┘   │   │   │   │   │   │   └─────────────┐
         ▼                 ▼   │   │   │   │   ▼                 ▼
  ┌─────────────┐  ┌──────────┐│   │   │   │ ┌─────────────┐ ┌──────────────┐
  │ Department  │  │ Position ││   │   │   │ │SalaryStruct │ │EmployeeReview│
  │ (org units) │  │(job roles)│   │   │   │ │(compensation│ │ (performance)│
  └─────────────┘  └──────────┘│   │   │   │ └─────────────┘ └──────────────┘
                               │   │   │   │
              ┌────────────────┘   │   │   └────────────────┐
              ▼                    ▼   ▼                    ▼
       ┌─────────────┐    ┌────────────────┐       ┌──────────────┐
       │ Attendance   │    │  LeaveRequest  │       │   Timesheet  │
       │(check-in/out)│    │  (approvals)   │       │  (weekly hrs)│
       └─────────────┘    └───────┬────────┘       └──────┬───────┘
                                  │                       │
                          ┌───────┴────────┐       ┌──────┴───────┐
                          │  LeaveBalance  │       │   Project    │
                          │ (per type/yr)  │       │              │
                          └───────┬────────┘       └──────┬───────┘
                                  │                       │
                          ┌───────┴────────┐       ┌──────┴───────┐
                          │   LeaveType    │       │    Task      │
                          │  (12 types)    │       │              │
                          └────────────────┘       └──────────────┘

                    ┌──────────────┐    ┌──────────────┐
                    │ PayrollData  │───→│   Payslip    │
                    │ (monthly run)│    │ (PDF-ready)  │
                    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────┴───────┐    ┌──────────────┐
                                        │PayslipAudit  │    │PayslipTemplt │
                                        │   Log        │    │  (format)    │
                                        └──────────────┘    └──────────────┘
```

---

## 3. Table Definitions

### 3.1 Users

**Table**: `users` — Authentication & login credentials

| Column | Type | Null | Default | Constraint |
|--------|------|------|---------|-----------|
| id | UUID | NO | UUIDV4 | PK |
| firstName | VARCHAR | NO | — | len: 2–50 |
| lastName | VARCHAR | NO | — | len: 2–50 |
| email | VARCHAR | NO | — | UNIQUE, email format |
| password | VARCHAR | NO | — | len: 6–255, excluded from default scope |
| role | ENUM | NO | 'employee' | `admin`, `hr`, `manager`, `employee` |
| isActive | BOOLEAN | YES | true | — |
| failedLoginAttempts | INTEGER | NO | 0 | Reset on successful login |
| lockoutUntil | TIMESTAMP | YES | NULL | Set after 5 failed attempts |
| lastLoginAt | TIMESTAMP | YES | NULL | — |
| passwordChangedAt | TIMESTAMP | YES | NULL | — |
| emailVerifiedAt | TIMESTAMP | YES | NULL | — |
| createdAt / updatedAt | TIMESTAMP | NO | NOW() | Auto |
| deletedAt | TIMESTAMP | YES | NULL | Soft delete |

**Indexes**: `idx_users_email` (unique), `idx_users_role`, `idx_users_active`  
**Associations**: hasOne → Employee, hasMany → RefreshToken

---

### 3.2 Employees

**Table**: `employees` — Core HR entity (personal + work + statutory + bank)

#### Core Fields
| Column | Type | Null | Default | Constraint |
|--------|------|------|---------|-----------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | VARCHAR | NO | — | UNIQUE (`SKYT` prefix + numeric) |
| firstName | VARCHAR | NO | — | len: 2–50 |
| lastName | VARCHAR | NO | — | len: 2–50 |
| email | VARCHAR | NO | — | UNIQUE, email format |
| phone | VARCHAR(15) | YES | NULL | 10–15 digits |
| hireDate | DATE | NO | — | — |
| status | ENUM | YES | 'Active' | `Active`, `Inactive`, `On Leave`, `Terminated` |

#### Personal Fields
| Column | Type | Null | Default |
|--------|------|------|---------|
| dateOfBirth | DATE | YES | NULL |
| gender | ENUM | YES | NULL | `Male`, `Female`, `Other` |
| address | TEXT | YES | NULL |
| city, state | VARCHAR | YES | NULL |
| pinCode | VARCHAR | YES | NULL | 6 digits |
| nationality | VARCHAR | YES | 'Indian' |
| country | VARCHAR | YES | 'India' |
| maritalStatus | ENUM | YES | NULL | `Single`, `Married`, `Divorced`, `Widowed` |
| photoUrl | VARCHAR | YES | NULL |

#### Employment Fields
| Column | Type | Null | Default |
|--------|------|------|---------|
| employmentType | ENUM | YES | 'Full-time' | `Full-time`, `Part-time`, `Contract`, `Intern` |
| workLocation | VARCHAR | YES | NULL |
| joiningDate | DATE | YES | NULL |
| confirmationDate | DATE | YES | NULL |
| resignationDate | DATE | YES | NULL |
| lastWorkingDate | DATE | YES | NULL |
| probationPeriod | INTEGER | YES | 6 | months |
| noticePeriod | INTEGER | YES | 30 | days |

#### Emergency Contact
| Column | Type | Null |
|--------|------|------|
| emergencyContactName | VARCHAR | YES |
| emergencyContactPhone | VARCHAR | YES |
| emergencyContactRelation | VARCHAR | YES |

#### Statutory (India)
| Column | Type | Validation |
|--------|------|-----------|
| aadhaarNumber | VARCHAR | 12 digits |
| panNumber | VARCHAR | `ABCDE1234F` format |
| uanNumber | VARCHAR | — |
| pfNumber | VARCHAR | — |
| esiNumber | VARCHAR | — |

#### Bank Details
| Column | Type |
|--------|------|
| bankName | VARCHAR |
| bankAccountNumber | VARCHAR |
| ifscCode | VARCHAR | `SBIN0001234` format |
| bankBranch | VARCHAR |
| accountHolderName | VARCHAR |

#### Foreign Keys
| Column | References | On Delete |
|--------|-----------|-----------|
| userId | users(id) | CASCADE |
| departmentId | departments(id) | CASCADE |
| positionId | positions(id) | CASCADE |
| managerId | employees(id) | CASCADE (self-ref) |

#### Virtual/Computed
| Column | Type | Source |
|--------|------|-------|
| salary | JSON | afterFind hook syncs from SalaryStructure association |

**Indexes**: `idx_employees_user`, `idx_employees_department`, `idx_employees_position`, `idx_employees_manager`, `idx_employees_status`, `idx_employees_empid` (unique)

**Hooks**: `afterFind` — auto-populates `salary` JSON from associated `SalaryStructure`

---

### 3.3 Departments

**Table**: `departments` — Organizational hierarchy

| Column | Type | Null | Default | Constraint |
|--------|------|------|---------|-----------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — | UNIQUE |
| code | VARCHAR(10) | YES | NULL | UNIQUE |
| description | TEXT | YES | NULL | — |
| parentId | UUID | YES | NULL | FK → departments(id), self-referential |
| managerId | UUID | YES | NULL | FK → employees(id) |
| isActive | BOOLEAN | YES | true | — |

**Associations**: self-ref parent/children, hasMany → Employee, hasMany → Position

---

### 3.4 Positions

**Table**: `positions` — Job roles with salary bands

| Column | Type | Null | Default | Constraint |
|--------|------|------|---------|-----------|
| id | UUID | NO | UUIDV4 | PK |
| title | VARCHAR | NO | — | — |
| code | VARCHAR(50) | YES | NULL | UNIQUE |
| description | TEXT | YES | NULL | — |
| level | ENUM | YES | 'Entry' | `Entry`, `Junior`, `Mid`, `Senior`, `Lead`, `Manager`, `Director` |
| departmentId | UUID | NO | — | FK → departments(id), RESTRICT |
| minSalary | DECIMAL(10,2) | YES | NULL | — |
| maxSalary | DECIMAL(10,2) | YES | NULL | — |
| isActive | BOOLEAN | YES | true | — |

---

### 3.5 Leave Types

**Table**: `leave_types` — Leave category definitions

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — | UNIQUE |
| description | TEXT | YES | NULL |
| maxDaysPerYear | INTEGER | YES | 20 |
| carryForward | BOOLEAN | YES | false |
| maxCarryForwardDays | INTEGER | YES | 0 |
| isActive | BOOLEAN | YES | true |

**Seeded Types**: Casual Leave (12d), Sick Leave (12d), Earned/Privilege Leave (15d), Maternity Leave (182d), Paternity Leave (15d), Bereavement Leave (5d), Compensatory Off (12d), Marriage Leave (15d), Study Leave (30d), Loss of Pay (365d), Restricted Holiday (2d), Work From Home (52d)

---

### 3.6 Leave Balances

**Table**: `leave_balances` — Per-employee, per-type, per-year entitlement

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| leaveTypeId | UUID | NO | — | FK → leave_types(id) |
| year | INTEGER | NO | — | Calendar year |
| totalAccrued | DECIMAL(5,2) | YES | 0 |
| totalTaken | DECIMAL(5,2) | YES | 0 |
| totalPending | DECIMAL(5,2) | YES | 0 |
| balance | DECIMAL(5,2) | YES | 0 |
| carryForward | DECIMAL(5,2) | YES | 0 |

**UNIQUE constraint**: `(employeeId, leaveTypeId, year)`

---

### 3.7 Leave Requests

**Table**: `leave_requests` — Leave applications with approval workflow

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| leaveTypeId | UUID | NO | — | FK → leave_types(id) |
| startDate | DATE | NO | — | — |
| endDate | DATE | NO | — | ≥ startDate |
| totalDays | DECIMAL(4,1) | NO | — | Positive |
| reason | TEXT | NO | — | Required |
| status | ENUM | YES | 'Pending' | `Pending`, `Approved`, `Rejected`, `Cancelled`, `Cancellation Requested` |
| approvedBy | UUID | YES | NULL | FK → employees(id) |
| isHalfDay | BOOLEAN | YES | false | — |
| halfDayType | ENUM | YES | NULL | `First Half`, `Second Half` |
| isCancellation | BOOLEAN | YES | false | Self-referential cancel flow |
| originalLeaveRequestId | UUID | YES | NULL | FK → leave_requests(id) |

**Indexes**: employee, type, status, date range

---

### 3.8 Timesheets

**Table**: `timesheets` — Weekly time entries per project/task

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| projectId | UUID | NO | — | FK → projects(id) |
| taskId | UUID | NO | — | FK → tasks(id) |
| weekStartDate | DATE | NO | — | Monday |
| weekEndDate | DATE | NO | — | Sunday |
| weekNumber | INTEGER | NO | — | ISO week |
| year | INTEGER | NO | — | — |
| mondayHours–sundayHours | DECIMAL(4,2) | YES | 0 | Per-day hours |
| totalHoursWorked | DECIMAL(5,2) | NO | 0 | Auto-calculated sum |
| status | ENUM | YES | 'Draft' | `Draft`, `Submitted`, `Approved`, `Rejected` |
| description | TEXT | YES | NULL | — |
| approvedBy | UUID | YES | NULL | FK → employees(id) |

**UNIQUE constraint**: `(employeeId, weekStartDate, projectId, taskId)`  
**Indexes**: emp+week, project+week, status, date range

---

### 3.9 Projects

**Table**: `projects`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — | — |
| description | TEXT | YES | NULL |
| startDate / endDate | DATE | YES | NULL |
| status | ENUM | YES | 'Planning' | `Planning`, `Active`, `On Hold`, `Completed`, `Cancelled` |
| clientName | VARCHAR | YES | NULL |
| managerId | UUID | YES | NULL | FK → employees(id) |
| isActive | BOOLEAN | YES | true |

---

### 3.10 Tasks

**Table**: `tasks`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — |
| description | TEXT | YES | NULL |
| estimatedHours | DECIMAL(5,2) | YES | NULL |
| actualHours | DECIMAL(5,2) | YES | 0 |
| status | ENUM | YES | 'Not Started' | `Not Started`, `In Progress`, `Completed`, `On Hold` |
| priority | ENUM | YES | 'Medium' | `Low`, `Medium`, `High`, `Critical` |
| dueDate | DATE | YES | NULL |
| projectId | UUID | NO | — | FK → projects(id) |
| assignedTo | UUID | YES | NULL | FK → employees(id) |
| availableToAll | BOOLEAN | YES | false |

---

### 3.11 Attendance

**Table**: `attendances` — Daily check-in/check-out tracking

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| date | DATEONLY | NO | — | — |
| checkInTime | DATE | YES | NULL | — |
| checkOutTime | DATE | YES | NULL | — |
| totalHours | DECIMAL(5,2) | YES | NULL | Computed = checkout - checkin |
| status | ENUM | YES | 'Present' | `Present`, `Absent`, `Half Day`, `On Leave`, `Holiday`, `Weekend`, `Late`, `Early Leave` |
| notes | TEXT | YES | NULL | — |
| markedByAdmin | BOOLEAN | YES | false | — |

**UNIQUE constraint**: `(employeeId, date)`

---

### 3.12 Salary Structures

**Table**: `salary_structures` — Employee compensation breakdown

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| basicSalary | DECIMAL(10,2) | NO | — | Required |
| hra | DECIMAL(10,2) | YES | 0 | House Rent Allowance |
| allowances | DECIMAL(10,2) | YES | 0 | Total other allowances |
| pfContribution | DECIMAL(10,2) | YES | 0 | Provident Fund |
| tds | DECIMAL(10,2) | YES | 0 | Tax Deducted at Source |
| professionalTax | DECIMAL(10,2) | YES | 0 | State professional tax |
| esi | DECIMAL(10,2) | YES | 0 | Employee State Insurance |
| otherDeductions | DECIMAL(10,2) | YES | 0 | Misc deductions |
| currency | VARCHAR | YES | 'INR' | — |
| effectiveFrom | DATE | NO | — | When this structure activates |
| isActive | BOOLEAN | YES | true | — |

**UNIQUE constraint**: `(employeeId, effectiveFrom)`

**afterFind Hook**: Employee model populates a computed `salary` JSON from this association:
```json
{
  "basicSalary": 85000,
  "allowances": { "hra": 34000, "other": 12500 },
  "deductions": { "pf": 1800, "incomeTax": 5000, "professionalTax": 200, "esi": 750 },
  "currency": "INR",
  "effectiveFrom": "2020-03-01"
}
```

---

### 3.13 Payroll Data

**Table**: `payroll_data` — Monthly payroll run records

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | INTEGER | NO | AUTO_INC | PK (non-UUID exception) |
| employeeId | UUID | NO | — | FK → employees(id) |
| payPeriod | VARCHAR | NO | — | e.g. "2026-03" |
| payPeriodStart / payPeriodEnd | DATE | NO | — |
| totalWorkingDays | INTEGER | NO | 21 |
| presentDays | INTEGER | NO | 21 |
| absentDays | INTEGER | YES | 0 |
| lopDays | INTEGER | YES | 0 | Loss of Pay |
| overtimeHours | DECIMAL(5,2) | YES | 0 |
| variableEarnings | JSON | YES | {} | bonus, arrears, incentive |
| variableDeductions | JSON | YES | {} | loanEmi, advances, late fines |
| grossSalary | DECIMAL(10,2) | NO | 0 |
| totalDeductions | DECIMAL(10,2) | NO | 0 |
| netSalary | DECIMAL(10,2) | NO | 0 |
| status | ENUM | YES | 'draft' | `draft`, `calculated`, `approved`, `paid`, `cancelled` |
| paymentMode | ENUM | YES | 'bank_transfer' | `bank_transfer`, `cheque`, `cash`, `upi` |

**UNIQUE constraint**: `(employeeId, payPeriod)`

---

### 3.14 Payslips

**Table**: `payslips` — Monthly payslip documents (PDF-ready)

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | — | FK → employees(id) |
| payrollDataId | INTEGER | NO | — | FK → payroll_data(id) |
| payPeriod | VARCHAR | NO | — |
| month | INTEGER | NO | — | 1–12 |
| year | INTEGER | NO | — |
| payslipNumber | VARCHAR(50) | NO | — | UNIQUE, auto-generated |
| employeeInfo | JSON | NO | — | Snapshot at generation time |
| companyInfo | JSON | NO | — | Company details for header |
| earnings | JSON | NO | {} | Itemized earnings |
| deductions | JSON | NO | {} | Itemized deductions |
| attendance | JSON | NO | {} | Attendance breakdown |
| grossEarnings | DECIMAL(12,2) | NO | 0 |
| totalDeductions | DECIMAL(12,2) | NO | 0 |
| netPay | DECIMAL(12,2) | NO | 0 |
| netPayInWords | TEXT | YES | NULL |
| status | ENUM | YES | 'generated' | `generated`, `finalized`, `distributed`, `cancelled` |

**UNIQUE constraint**: `(employeeId, payPeriod, month, year)`

---

### 3.15 Payslip Templates

**Table**: `payslip_templates` — Payslip format definitions

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — |
| isDefault | BOOLEAN | YES | false | Only one default enforced via hook |
| headerFields | JSON | YES | [] |
| earningsFields | JSON | YES | [] |
| deductionsFields | JSON | YES | [] |
| footerFields | JSON | YES | [] |
| styling | JSON | YES | {} |

---

### 3.16 Payslip Audit Log

**Table**: `payslip_audit_logs` — Payslip change tracking

| Column | Type | Null |
|--------|------|------|
| id | UUID | NO | PK |
| payslipId | UUID | NO | FK → payslips(id) |
| action | ENUM | NO | `created`, `updated`, `finalized`, `distributed`, `cancelled`, `regenerated`, `downloaded`, `emailed` |
| performedBy | UUID | NO | FK → users(id) |
| previousData | JSON | YES | Before-state snapshot |
| newData | JSON | YES | After-state snapshot |
| reason | TEXT | YES |
| ipAddress | VARCHAR | YES |

---

### 3.17 Employee Reviews

**Table**: `employee_reviews` — Performance review records

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| employeeId | UUID | NO | FK → employees(id) |
| reviewerId | UUID | NO | FK → employees(id) |
| reviewPeriod | VARCHAR | NO | — |
| reviewType | ENUM | YES | 'Annual' | `Annual`, `Mid-Year`, `Quarterly`, `Probation` |
| rating | DECIMAL(3,2) | YES | NULL | 0.0–5.0 |
| strengths | TEXT | YES | NULL |
| areasOfImprovement | TEXT | YES | NULL |
| goals | TEXT | YES | NULL |
| feedback | TEXT | YES | NULL |
| status | ENUM | YES | 'Draft' | `Draft`, `Submitted`, `Acknowledged`, `Completed` |

---

### 3.18 Attendance

See section 3.11.

---

### 3.19 Audit Log

**Table**: `audit_logs` — System-wide change tracking

| Column | Type | Null |
|--------|------|------|
| id | UUID | NO | PK |
| userId | UUID | YES | FK → users(id) |
| entityName | VARCHAR | NO | Table/model name |
| entityId | VARCHAR | NO | Record UUID |
| action | ENUM | NO | `CREATE`, `UPDATE`, `DELETE`, `RESTORE` |
| changes | JSON | YES | `{field: {old, new}}` diff |
| ipAddress | VARCHAR | YES |
| userAgent | TEXT | YES |

---

### 3.20 Refresh Tokens

**Table**: `refresh_tokens` — JWT session management

| Column | Type | Null |
|--------|------|------|
| id | UUID | NO | PK |
| token | TEXT | NO | UNIQUE |
| userId | UUID | NO | FK → users(id) |
| expiresAt | TIMESTAMP | NO |
| isRevoked | BOOLEAN | false |
| userAgent | TEXT | YES |
| ipAddress | VARCHAR | YES |

---

### 3.21 Password Reset Tokens

**Table**: `password_reset_tokens`

| Column | Type | Null |
|--------|------|------|
| id | UUID | NO | PK |
| userId | UUID | NO | FK → users(id) |
| token | VARCHAR | NO | UNIQUE |
| expiresAt | TIMESTAMP | NO |
| used | BOOLEAN | false |

---

### 3.22 Holidays

**Table**: `holidays` — Company holiday calendar

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | UUID | NO | UUIDV4 | PK |
| name | VARCHAR | NO | — |
| date | DATEONLY | NO | — |
| description | TEXT | YES | NULL |
| type | ENUM | YES | 'National' | `National`, `Regional`, `Company`, `Optional` |
| country | VARCHAR | YES | 'India' |
| isRecurring | BOOLEAN | YES | false |
| isActive | BOOLEAN | YES | true |

### 3.23 System Config

**Table**: `system_configs` — Application-level settings (key-value store)

| Column | Type | Null |
|--------|------|------|
| id | UUID | NO | PK |
| key | VARCHAR | NO | UNIQUE |
| value | TEXT | YES |
| description | TEXT | YES |
| category | VARCHAR | YES |
| updatedBy | UUID | YES | FK → users(id) |

---

## 4. Key Indexes

| Table | Index | Type | Columns |
|-------|-------|------|---------|
| users | idx_users_email | UNIQUE | email |
| users | idx_users_role | NORMAL | role |
| employees | idx_employees_empid | UNIQUE | employeeId |
| employees | idx_employees_department | NORMAL | departmentId |
| employees | idx_employees_position | NORMAL | positionId |
| employees | idx_employees_manager | NORMAL | managerId |
| employees | idx_employees_status | NORMAL | status |
| leave_balances | idx_leave_balances_unique | UNIQUE | employeeId, leaveTypeId, year |
| leave_requests | idx_leave_requests_employee | NORMAL | employeeId |
| leave_requests | idx_leave_requests_status | NORMAL | status |
| leave_requests | idx_leave_requests_dates | NORMAL | startDate, endDate |
| timesheets | uq_timesheets_employee_week_project_task | UNIQUE | employeeId, weekStartDate, projectId, taskId |
| timesheets | idx_timesheets_emp_week | NORMAL | employeeId, weekStartDate |
| timesheets | idx_timesheets_status | NORMAL | status |
| salary_structures | uq_salary_employee_effective | UNIQUE | employeeId, effectiveFrom |
| payroll_data | idx_payroll_data_unique | UNIQUE | employeeId, payPeriod |
| payslips | uq_payslips_employee_period | UNIQUE | employeeId, payPeriod, month, year |
| attendances | uq_attendances_employee_date | UNIQUE | employeeId, date |

---

## 5. Migration History

| Migration | Description |
|-----------|-------------|
| `20260209000000-fresh-consolidated-schema.js` | Base schema — all 22 tables |
| `20260209100000-gap-fixes-module-2-3-5-6.js` | Module-specific column fixes |
| `20260210*` | Audit log, password tokens, holidays, attendance normalization |
| `20260211*` | UUID standardization, 13 new indexes, constraint fixes |
| `20260216*` | Foreign key consistency fixes |
| `20260217*` | Task dueDate, country column, ESI column |

**Running Migrations**:
```bash
cd backend
npx sequelize-cli db:migrate                    # Run pending
npx sequelize-cli db:migrate:undo               # Rollback last
npx sequelize-cli db:migrate:undo:all           # Rollback all
npx sequelize-cli db:migrate:status             # Check status
```

---

## 6. Seeded Demo Data

After running `npx sequelize-cli db:seed:all`:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 5 | admin, hr, manager, employee1, employee2 |
| Departments | 3 | Engineering, Human Resources, Finance |
| Positions | 5 | Software Engineer, HR Manager, Team Lead, Accountant, Intern |
| Leave Types | 12 | Casual, Sick, Earned, Maternity, etc. |
| Projects | 2 | Sample projects with tasks |
| Holidays | ~10 | Indian national holidays |

**Default Credentials** (development only):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@skyraksys.com | Admin@123 |
| HR | hr@skyraksys.com | Admin@123 |
| Manager | manager@skyraksys.com | Admin@123 |
| Employee | employee@skyraksys.com | Admin@123 |

---

## 7. Database Connection Configuration

```env
# backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyraksys_hrm
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_LOGGING=false

# Connection pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000
```

---

## 8. Backup & Maintenance

```bash
# Full backup
pg_dump -h localhost -U postgres -d skyraksys_hrm -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h localhost -U postgres -d skyraksys_hrm -c backup_20260326.dump

# Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;

# Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'skyraksys_hrm';

# Vacuum & analyze
VACUUM ANALYZE;
```

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
