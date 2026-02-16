# Business Rules Reference

> **Last updated:** 2026-02-14 | **Locale:** India (INR, Indian tax regime)

---

## 1. Employee Lifecycle

### 1.1 Employee ID Generation

Format: `SKYT####` (e.g., `SKYT0001`). Auto-generated: queries max existing, increments, zero-pads to 4 digits.

### 1.2 Employee Creation Flow (Transactional)

```
1. Validate input (required: firstName, lastName, email, hireDate, departmentId, positionId)
2. Hash password (bcrypt) if creating user account simultaneously
3. Create User record (role assignment)
4. Generate employee ID (SKYT####)
5. Create Employee record (linked to User)
6. Create SalaryStructure (if salary data provided)
7. Initialize LeaveBalances (all active leave types for current year)
8. Create AuditLog entry
9. Commit transaction
10. Send welcome email (if configured)
```

All steps in a single database transaction. Failure at any step rolls back all changes.

### 1.3 Employee Status Transitions

```
Active ←→ Inactive       (admin/HR can toggle)
Active ←→ On Leave        (system-managed via leave approval)
Active  → Terminated      (soft delete — sets deletedAt)
```

- **Termination** is a soft delete (`paranoid: true`). Sets `deletedAt`, preserves all historical data.
- **Restoration** available via `/api/restore/users/:id` (admin only).

---

## 2. Payroll Calculation Engine

### 2.1 Salary Components

**Earnings (from SalaryStructure):**

| Component | Key | Calculation |
|-----------|-----|-------------|
| Basic Salary | `basicSalary` | From structure |
| HRA | `hra` | Default: 50% of basic |
| Transport Allowance | `transport` | Fixed per structure |
| Medical Allowance | `medical` | Fixed per structure |
| Food Allowance | `food` | Fixed per structure |
| Communication | `communication` | Fixed per structure |
| Special Allowance | `special` | Fixed per structure |
| Overtime | `overtime` | hourlyRate × 1.5 × OT hours |
| Bonus | `bonus` | Variable |
| Arrears | `arrears` | Variable |

**Gross Salary Proration:**

$$\text{Gross} = \frac{\text{Sum of all components}}{\text{Total working days}} \times \text{Paid days}$$

Where: `Paid days = Total working days - LOP days`

### 2.2 Statutory Deductions

#### EPF (Employee Provident Fund)

$$\text{EPF} = 12\% \times \min(\text{Basic Salary}, ₹15{,}000)$$

- Employee contribution: 12%
- Employer contribution: 12% (not shown on payslip deductions)
- Cap: ₹15,000 basic salary ceiling

#### ESI (Employee State Insurance)

$$\text{ESI (employee)} = 0.75\% \times \text{Gross Salary} \quad \text{if } \text{Gross} \leq ₹21{,}000$$
$$\text{ESI (employer)} = 3.25\% \times \text{Gross Salary} \quad \text{if } \text{Gross} \leq ₹21{,}000$$

Threshold: Not applicable if gross salary exceeds ₹21,000/month.

#### Professional Tax (State-specific)

3 state slab tables are implemented:

**Maharashtra:**

| Monthly Salary | PT Amount |
|---------------|-----------|
| ≤ ₹7,500 | ₹0 |
| ≤ ₹10,000 | ₹175 |
| > ₹10,000 | ₹200 (₹300 in Feb) |

**Karnataka:**

| Monthly Salary | PT Amount |
|---------------|-----------|
| ≤ ₹15,000 | ₹0 |
| ≤ ₹25,000 | ₹200 |
| > ₹25,000 | ₹200 |

**West Bengal:**

| Monthly Salary | PT Amount |
|---------------|-----------|
| ≤ ₹10,000 | ₹0 |
| ≤ ₹15,000 | ₹110 |
| ≤ ₹25,000 | ₹130 |
| ≤ ₹40,000 | ₹150 |
| > ₹40,000 | ₹200 |

#### TDS (Tax Deducted at Source)

**Old Tax Regime:**

| Annual Income Slab | Rate |
|-------------------|------|
| Up to ₹2,50,000 | 0% |
| ₹2,50,001 – ₹5,00,000 | 5% |
| ₹5,00,001 – ₹10,00,000 | 20% |
| Above ₹10,00,000 | 30% |

Plus: 4% Health & Education Cess on total tax.

**New Tax Regime (Default from FY 2023-24):**

| Annual Income Slab | Rate |
|-------------------|------|
| Up to ₹3,00,000 | 0% |
| ₹3,00,001 – ₹6,00,000 | 5% |
| ₹6,00,001 – ₹9,00,000 | 10% |
| ₹9,00,001 – ₹12,00,000 | 15% |
| ₹12,00,001 – ₹15,00,000 | 20% |
| Above ₹15,00,000 | 30% |

Plus: 4% Health & Education Cess on total tax.

Monthly TDS = Annual TDS ÷ 12.

### 2.3 Net Salary Formula

$$\text{Net Salary} = \text{Gross Salary} - \text{EPF} - \text{ESI} - \text{Professional Tax} - \text{TDS} - \text{Other Deductions}$$

### 2.4 Payslip Generation Flow

```
1. VALIDATE — Check employee has active salary structure
2. PREVIEW  — Calculate without saving (dry-run mode)
3. GENERATE — Create PayrollData + Payslip records (status: draft)
4. REVIEW   — Admin/HR reviews calculated amounts
5. FINALIZE — Lock payslip (status: finalized, isLocked: true)
6. MARK PAID — Record payment (status: paid, paymentMethod, paymentReference)
```

- Payslip number format: `PS{YYYY}{MM}{employeeId}` (auto-generated)
- Finalized payslips cannot be edited unless unlocked by admin
- Version number increments on each update
- All changes tracked in `payslip_audit_logs`

### 2.5 Working Days Calculation

```
Working Days = Calendar days in month
             - Weekend days (Saturday + Sunday)
             - Holidays (from holidays table, type: public or company)
```

---

## 3. Leave Management

### 3.1 Leave Types & Defaults

| Type | Annual Entitlement | Carry Forward | Max Carry |
|------|:------------------:|:-------------:|:---------:|
| Sick Leave | 12 days | No | 0 |
| Casual Leave | 12 days | No | 0 |
| Annual Leave | 21 days | Yes | 5 days |
| Maternity Leave | 182 days | No | 0 |
| Paternity Leave | 15 days | No | 0 |

### 3.2 Working Days Calculation for Leave

```
Leave Days = Calendar days between startDate and endDate (inclusive)
           - Weekend days (Saturday, Sunday)
           - Holidays (from holidays table)

If isHalfDay: Leave Days = 0.5
```

### 3.3 Leave Request Workflow

```
Employee creates request
        │
        ▼
    ┌─────────┐
    │ Pending  │
    └────┬────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Approved│ │ Rejected │
└────┬───┘ └──────────┘
     │
     ▼
┌─────────────────────┐
│Cancellation Requested│ ← Employee requests cancel
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────────┐ ┌──────────────┐
│Cancelled │ │Remains Active│ ← If cancellation denied
└──────────┘ └──────────────┘
```

**Approval authority:** Admin, HR, or Manager (of the requesting employee).

### 3.4 Balance Tracking

On **approval:**
- `totalTaken += totalDays`
- `totalPending -= totalDays`
- `balance = totalAccrued + carryForward - totalTaken`

On **request creation:**
- `totalPending += totalDays`
- Validate: `balance - totalPending >= 0`

On **cancellation approval:**
- `totalTaken -= totalDays`
- `balance += totalDays`

### 3.5 Leave Accrual (Automated)

**Monthly accrual cron** — Runs at `00:05` on the 1st of every month:
- For each active employee:
  - For each active leave type:
    - `monthlyAccrual = leaveType.maxDaysPerYear / 12`
    - `totalAccrued += monthlyAccrual`
    - `balance += monthlyAccrual`

**Year-end carry-forward cron** — Runs at `00:01` on January 1st:
- For each employee with Annual Leave balance:
  - `carryForwardAmount = min(balance, maxCarryForwardDays)`
  - Create new year balance record with `carryForward = carryForwardAmount`

---

## 4. Timesheet Management

### 4.1 Weekly Structure

Each timesheet entry represents one **project-task combination per week**:

| Field | Description |
|-------|-------------|
| weekStartDate | Monday of the week |
| weekEndDate | Sunday of the week |
| mondayHours–sundayHours | Hours worked each day (DECIMAL 4,2) |
| totalHoursWorked | Sum of daily hours |

**Constraints:**
- Maximum 168 hours per week (24 × 7)
- Each day column: DECIMAL(4,2), default 0
- An employee can have multiple entries per week (one per project-task combo)

### 4.2 Timesheet Status Flow

```
┌───────┐    submit     ┌───────────┐    approve    ┌──────────┐
│ Draft │──────────────▶│ Submitted │──────────────▶│ Approved │
└───────┘               └─────┬─────┘               └──────────┘
                              │ reject
                              ▼
                        ┌──────────┐
                        │ Rejected │──▶ (edit) ──▶ Draft
                        └──────────┘
```

- **Draft:** Employee can edit freely
- **Submitted:** Locked for employee, visible to approver
- **Approved:** Immutable (used for payroll calculations)
- **Rejected:** Returns to editable state with approver comments

### 4.3 Bulk Operations

| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Bulk Save | `POST /timesheets/bulk-save` | Save multiple draft entries (max 100) |
| Bulk Update | `PUT /timesheets/bulk-update` | Update multiple entries (max 100) |
| Bulk Submit | `POST /timesheets/bulk-submit` | Submit all week entries at once |
| Bulk Approve | `POST /timesheets/bulk-approve` | Manager approves multiple |
| Bulk Reject | `POST /timesheets/bulk-reject` | Manager rejects multiple (rate-limited) |

---

## 5. Attendance

### 5.1 Check-In / Check-Out

```
Employee check-in  →  Record checkIn timestamp + IP address
Employee check-out →  Record checkOut timestamp
                      Calculate: hoursWorked = (checkOut - checkIn - breakDuration) / 60
```

- Source tracking: `manual`, `biometric`, `web`, `mobile`
- One attendance record per employee per day (enforced by unique index)

### 5.2 Status Determination

| Status | Condition |
|--------|-----------|
| `present` | Normal check-in within grace period |
| `late` | Check-in > 15 minutes after shift start |
| `half-day` | Worked < 4 hours |
| `absent` | No check-in recorded |
| `on-leave` | Active approved leave for the day |
| `holiday` | Date is in holidays table |
| `weekend` | Saturday or Sunday |

### 5.3 Monthly Report Generation

Aggregates daily attendance into monthly summary:
- Total present days, absent days, late days
- Total hours worked, overtime hours
- Average work hours per day

---

## 6. Employee Review Process

### 6.1 Review Types

| Type | Frequency | Purpose |
|------|-----------|---------|
| Quarterly | Every 3 months | Regular performance check |
| Annual | Yearly | Comprehensive review |
| Probationary | End of probation | Confirmation decision |
| Performance Improvement | As needed | Underperformer tracking |

### 6.2 Review Workflow

```
Manager creates review (status: draft)
       │
       ▼
┌──────────────────────┐
│ pending_employee_input│ ← Employee adds self-assessment
└──────────┬───────────┘
           ▼
┌──────────────────┐
│ pending_approval  │ ← HR reviews
└────────┬─────────┘
         ▼
   ┌───────────┐
   │ completed  │ ← HR approves (hrApproved=true)
   └─────┬─────┘
         ▼
   ┌───────────┐
   │ archived   │ ← Historical record
   └───────────┘
```

### 6.3 Rating Dimensions

Each dimension rated 1.00–5.00:
- Technical Skills
- Communication
- Teamwork
- Leadership
- Punctuality
- Overall Rating (may be computed or manually assigned)

---

## 7. Holiday Management

### 7.1 Holiday Types

| Type | Description | Impact |
|------|-------------|--------|
| `public` | National/state holidays | Excluded from working days |
| `restricted` | Optional holiday (bank/regional) | May require leave |
| `company` | Company-specific (foundation day, etc.) | Excluded from working days |

### 7.2 Holiday Rules

- Holidays affect leave day calculations (excluded from working days)
- Holidays affect payroll working day counts
- Holidays affect attendance (auto-marked as `holiday`)
- Recurring holidays can be flagged (`isRecurring: true`) for yearly re-creation
- Unique constraint: `[date, name]` prevents duplicates
- Bulk creation supported for importing annual holiday calendars

---

## 8. Number Formatting

### 8.1 Currency

All monetary values displayed in Indian format:
```
₹1,23,45,678.00  (Indian notation with lakhs/crores grouping)
```

`formatCurrency(amount)` uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`

### 8.2 Number-to-Words

Payslip `netPayInWords` uses Indian numbering system:
```
₹12,34,567 → "Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven Rupees Only"
```

Implemented in `payslipCalculations.js` (client-side).
