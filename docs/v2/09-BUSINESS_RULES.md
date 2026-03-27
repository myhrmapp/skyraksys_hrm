# SkyrakSys HRM — Business Rules & Logic

> **Document Owner**: Business Analyst / Product Owner  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Developers, QA engineers, business stakeholders, product managers

---

## 1. Employee Management

### 1.1 Employee ID Generation

- Format: `SKYT` + 4-digit zero-padded number (e.g., `SKYT0001`, `SKYT0042`)
- Auto-generated on employee creation
- Uses row-level database lock to prevent duplicates in concurrent requests
- Finds highest existing numeric suffix → increments by 1
- Unique constraint enforced at database level

### 1.2 Employee Lifecycle

```
Creation → Active → On Leave → Active → Terminated
                  → Inactive → Active (reactivation)
```

| Status | Meaning | Transitions |
|--------|---------|-------------|
| Active | Currently employed | → Inactive, On Leave, Terminated |
| Inactive | Temporarily deactivated | → Active, Terminated |
| On Leave | Extended leave | → Active |
| Terminated | Employment ended | No further transitions |

### 1.3 Employee Creation Rules

1. Email must be unique across all employees
2. Department and position must exist and be active
3. If `managerId` provided, referenced employee must exist
4. User account creation is automatic (generates login credentials)
5. Leave balances initialized for all active leave types in current year
6. Salary structure created if salary data provided
7. All operations wrapped in a single database transaction

### 1.4 Employment Types

- Full-time (default)
- Part-time
- Contract
- Intern

### 1.5 Probation & Notice

- Default probation: 6 months
- Default notice period: 30 days
- Confirmation date tracked separately from hire date

---

## 2. Leave Management

### 2.1 Leave Types (12 Seeded)

| Type | Annual Days | Carry Forward | Max Carry |
|------|------------|---------------|-----------|
| Casual Leave | 12 | No | 0 |
| Sick Leave | 12 | No | 0 |
| Earned/Privilege Leave | 15 | Yes | 30 |
| Maternity Leave | 182 | No | 0 |
| Paternity Leave | 15 | No | 0 |
| Bereavement Leave | 5 | No | 0 |
| Compensatory Off | 12 | No | 0 |
| Marriage Leave | 15 | No | 0 |
| Study Leave | 30 | No | 0 |
| Loss of Pay (LOP) | 365 | No | 0 |
| Restricted Holiday | 2 | No | 0 |
| Work From Home | 52 | No | 0 |

### 2.2 Leave Request Workflow

```
Employee creates request → Pending
  │
  ├─ Manager/HR/Admin approves → Approved (balance deducted)
  │
  ├─ Manager/HR/Admin rejects → Rejected (no balance change)
  │
  ├─ Employee cancels (before approval) → Cancelled
  │
  └─ Employee requests cancellation (after approval):
       → Cancellation Requested
       → Manager approves → Cancelled (balance restored)
```

### 2.3 Leave Balance Rules

- **Accrual**: `maxDaysPerYear / 12` credited monthly (1st of each month)
- **Carry Forward**: Year-end process on January 1 — only types with `carryForward=true`
- **Maximum carry**: Capped at `maxCarryForwardDays` per type
- **Balance check**: System validates `available balance ≥ requested days` before approval
- **Half-day**: Supported — counts as 0.5 days, specify First Half or Second Half
- **Balance per year**: Tracked as `(employeeId, leaveTypeId, year)` unique combination

### 2.4 Leave Calculation

```
totalDays = endDate - startDate + 1 (excluding weekends if applicable)
Balance check:
  available = totalAccrued + carryForward - totalTaken - totalPending
  if requested > available → reject
On approval:
  totalTaken += requestedDays
  balance = totalAccrued + carryForward - totalTaken - totalPending
On cancellation (after approval):
  totalTaken -= requestedDays
  balance recalculated
```

---

## 3. Timesheet Management

### 3.1 Timesheet Model

- One timesheet entry = one employee + one project + one task + one week
- Week: Monday (weekStartDate) to Sunday (weekEndDate)
- Daily hours: `mondayHours` through `sundayHours` (each 0–24 decimal)
- `totalHoursWorked` = sum of all 7 day hours (auto-calculated)

### 3.2 Timesheet Workflow

```
Employee creates/saves → Draft
  │
  ├─ Employee submits → Submitted (locked for editing)
  │    │
  │    ├─ Manager/Admin approves → Approved
  │    │
  │    └─ Manager/Admin rejects → Rejected (reason required)
  │         │
  │         └─ Employee edits + resubmits → Submitted
  │
  └─ Employee bulk-saves multiple entries → Draft (each)
```

### 3.3 Timesheet Rules

- **Uniqueness**: One entry per (employee, week, project, task) — enforced at DB level
- **Week alignment**: `weekStartDate` must be a Monday
- **Edit restrictions**: 
  - Draft/Rejected → editable
  - Submitted → locked (manager can approve/reject)
  - Approved → locked (no changes)
- **RBAC**: Employees can only manage own timesheets; managers can approve team; admin/HR can approve any
- **Bulk operations**: Submit, approve, reject, save support batch processing

---

## 4. Payroll Processing

### 4.1 Payroll Workflow

```
Admin/HR initiates → Draft
  │
  ├─ Calculate payroll → Calculated
  │    │
  │    ├─ Approve → Approved
  │    │    │
  │    │    └─ Process payment → Paid
  │    │
  │    └─ Edit/recalculate → Calculated
  │
  └─ Cancel → Cancelled
```

### 4.2 Salary Structure Components

**Earnings**:
| Component | Field | Calculation |
|-----------|-------|-------------|
| Basic Salary | `basicSalary` | Prorated by working days |
| HRA | `hra` | Fixed or % of basic |
| DA (Dearness Allowance) | via `allowances` | Fixed |
| Conveyance | via `allowances` | Fixed |
| Medical | via `allowances` | Fixed |
| Special Allowance | via `allowances` | Fixed |
| Overtime | payroll `variableEarnings.overtime` | Hourly rate × hours |
| Bonus | payroll `variableEarnings.bonus` | Per payroll run |
| Arrears | payroll `variableEarnings.arrears` | Per payroll run |

**Deductions**:
| Component | Field | Calculation |
|-----------|-------|-------------|
| PF (Provident Fund) | `pfContribution` | 12% of basic (capped at ₹15,000 basic) |
| ESI | `esi` | 0.75% employee + 3.25% employer (if gross ≤ ₹21,000) |
| Professional Tax | `professionalTax` | State slab-based (Karnataka default) |
| TDS (Income Tax) | `tds` | YTD projection, old/new regime |
| Loan EMI | `variableDeductions.loanEmi` | Per payroll run |
| Other | `otherDeductions` | Fixed per structure |

### 4.3 Indian Payroll Compliance (FY 2025-26)

**EPF (Employee Provident Fund)**:
- Employee: 12% of basic salary
- Employer: 12% of basic (8.33% to EPS, 3.67% to EPF)
- Cap: Applied only on basic ≤ ₹15,000/month
- UAN tracking per employee

**ESI (Employee State Insurance)**:
- Applicable if gross salary ≤ ₹21,000/month
- Employee contribution: 0.75%
- Employer contribution: 3.25%

**Professional Tax** (Karnataka slabs):
| Monthly Gross | Tax |
|--------------|-----|
| ≤ ₹15,000 | ₹0 |
| ₹15,001–₹25,000 | ₹150 |
| > ₹25,000 | ₹200 |

**TDS (Tax Deducted at Source)**:
- YTD (Year-to-Date) projection method
- Old Regime (5 slabs): ₹0–₹2.5L (0%), ₹2.5–5L (5%), ₹5–10L (20%), ₹10L+ (30%)
- New Regime (6 slabs + rebate): 0% up to ₹3L, 5% ₹3–7L, 10% ₹7–10L, 15% ₹10–12L, 20% ₹12–15L, 30% ₹15L+
- Section 87A rebate: No tax if income ≤ ₹12L (new regime)

### 4.4 Payroll Calculation Formula

```
Gross Salary = Basic + HRA + Allowances + Variable Earnings
Total Deductions = PF + ESI + PT + TDS + Loan + Other Deductions
Net Salary = Gross Salary - Total Deductions

Proration (for mid-month join/exit):
  Daily Rate = Monthly Salary / Total Working Days
  Prorated Salary = Daily Rate × Present Days
```

### 4.5 Payslip Generation

- Generated from approved payroll data
- Snapshots employee info and company info at generation time
- Includes itemized earnings, deductions, attendance breakdown
- Net pay in words (auto-generated)
- PDF generation: PDFKit (server-side) or Puppeteer (HTML→PDF)
- Status lifecycle: Generated → Finalized → Distributed → (Cancelled)

---

## 5. Attendance Management

### 5.1 Attendance Recording

- **Clock In**: `POST /api/attendance/clock-in`
  - Records current time as check-in
  - One entry per (employee, date) — duplicate blocked
  - Late detection: compared against configured work start time
  
- **Clock Out**: `POST /api/attendance/check-out`
  - Records current time as check-out
  - Calculates `totalHours = checkOut - checkIn` (with optional break deduction)

### 5.2 Attendance Status

| Status | Auto-Detection |
|--------|---------------|
| Present | Check-in recorded |
| Absent | No check-in by end of day |
| Half Day | Check-in but left early |
| On Leave | Approved leave for that date |
| Holiday | Date in holiday calendar |
| Weekend | Saturday/Sunday |
| Late | Check-in after configured start time |
| Early Leave | Check-out before configured end time |

### 5.3 Admin Attendance

- Admin/HR can mark attendance manually
- `markedByAdmin: true` flag tracks manually entered records
- Monthly reports show attendance summary per employee

---

## 6. Project & Task Management

### 6.1 Project Lifecycle

```
Planning → Active → On Hold → Active → Completed
                              → Cancelled
```

### 6.2 Task Status Transitions

```
Not Started → In Progress → Completed
                          → On Hold → In Progress
```

### 6.3 Task Assignment Rules

- Tasks belong to a project (required)
- `assignedTo`: UUID of assigned employee (optional)
- `availableToAll`: Boolean — if true, any employee can log time against it
- Priority: Low, Medium (default), High, Critical
- `estimatedHours` vs `actualHours` tracking

### 6.4 Time Logging

Employees create timesheet entries linking to (project, task, week). The task must be:
- Active (not completed/deleted)
- Assigned to the employee OR `availableToAll = true`
- Project must be active

---

## 7. Performance Reviews

### 7.1 Review Types

| Type | Frequency | Purpose |
|------|-----------|---------|
| Annual | Yearly | Comprehensive performance review |
| Mid-Year | Semi-annual | Progress check |
| Quarterly | Quarterly | Short-cycle feedback |
| Probation | End of probation | Confirmation decision |

### 7.2 Review Workflow

```
Manager/HR creates → Draft
  │
  ├─ Employee adds self-assessment → Draft (updated)
  │
  ├─ Reviewer submits → Submitted
  │    │
  │    └─ HR/Admin acknowledges → Acknowledged
  │         │
  │         └─ Mark complete → Completed
  │
  └─ Admin/HR deletes → Soft deleted (restorable)
```

### 7.3 Rating Scale

- 0.0 to 5.0 (decimal, 2 places)
- Fields: `rating`, `strengths`, `areasOfImprovement`, `goals`, `feedback`

---

## 8. Holiday Management

### 8.1 Holiday Types

| Type | Applicability |
|------|--------------|
| National | All employees |
| Regional | Location-based |
| Company | Company-declared |
| Optional | Employee-chosen (limited) |

### 8.2 Rules

- Holidays affect payroll working day calculations
- Attendance auto-marked as "Holiday" on holiday dates
- `isRecurring`: If true, auto-generated for future years
- Default country: India
- Bulk creation supported for annual calendar setup

---

## 9. User & Access Management

### 9.1 User Account Creation

- Auto-created when employee is created
- Links User (auth entity) ↔ Employee (HR entity) via `userId` FK
- Can also create user account after employee creation

### 9.2 Account States

| State | Meaning | Login |
|-------|---------|-------|
| Active (`isActive=true`) | Normal account | ✅ |
| Inactive (`isActive=false`) | Deactivated by admin | ❌ |
| Locked (`lockoutUntil > now`) | Auto-locked (5 failed logins) | ❌ until lockout expires |

### 9.3 Soft Delete & Restore

- Users, employees, reviews, leave balances support soft delete (`deletedAt` column)
- Admin can restore soft-deleted records via `/api/restore/*`
- Permanent deletion not exposed in API

---

## 10. System Configuration

### 10.1 Protected Update

System configuration changes require:
1. Admin role
2. Password re-authentication (current password)
3. Rate-limited (10 requests/15min)
4. Audit trail logged

### 10.2 Config Categories

| Category | Examples |
|----------|---------|
| Company | Company name, address, logo |
| Email | SMTP host, port, credentials (encrypted) |
| Attendance | Work start/end time, break duration |
| Leave | Default accrual rules |
| Payroll | Tax regime, EPF/ESI rates |

---

## 11. Email Notifications

| Event | Recipients | Template |
|-------|-----------|----------|
| Welcome email | New employee | Account credentials |
| Password reset | Requesting user | Reset link (1hr expiry) |
| Account status change | Affected user | Activation/deactivation notice |
| Leave approved/rejected | Employee | Leave decision |

Email service uses Nodemailer with encrypted SMTP credentials. Templates are in `backend/templates/` (Handlebars).

---

## 12. Audit & Compliance

### Audited Events

| Event | Logged Data |
|-------|-------------|
| Employee create/update/delete | All field changes |
| Salary structure changes | Old → new values |
| Role changes | Old → new role |
| Login success/failure | IP, user agent |
| Password change/reset | Timestamp (no password logged) |
| Account lock/unlock | Reason, admin ID |
| System config changes | Old → new values |
| Payslip operations | Generation, finalization, download |

### Data Retention

- Audit logs: Indefinite (no auto-purge)
- Refresh tokens: Expired tokens cleaned daily at 02:00
- Token blacklist: Auto-purged every 5 minutes

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
