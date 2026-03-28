# Comprehensive Peer Review & Code Scan Report

**Date**: 2026-03-25  
**Scope**: Full-stack HRM application — Backend (models, services, routes, middleware), Frontend (services, components, hooks), DB, API  
**Method**: Static analysis, live API testing, DB verification  

---

## Executive Summary

A thorough code scan of the SkyrakSys HRM application identified **16 confirmed issues** across backend services, routes, and frontend. **8 critical/high-severity bugs were fixed** during this review. The remaining items are low/medium priority and documented for tracking.

### Fix Summary

| # | Severity | Component | Bug | Status |
|---|----------|-----------|-----|--------|
| 1 | **CRITICAL** | EmployeeService.js | `findAllWithDetails()` and `findByIdWithDetails()` never included SalaryStructure — salary always null | **FIXED** ✅ |
| 2 | **HIGH** | PayrollBusinessService.js | `calculateTotalAllowances()` returns 0 for object format `{hra: 5000}` | **FIXED** ✅ |
| 3 | **HIGH** | PayrollBusinessService.js | `calculateTotalDeductions()` returns 0 for object format | **FIXED** ✅ |
| 4 | **HIGH** | PayrollBusinessService.js | `approvePayroll()` checks non-existent `'payroll_manager'` role | **FIXED** ✅ |
| 5 | **HIGH** | PayrollBusinessService.js | `rejectPayroll()` checks non-existent `'payroll_manager'` role | **FIXED** ✅ |
| 6 | **HIGH** | LeaveBusinessService.js | Year mismatch: create uses `new Date().getFullYear()`, reject uses `startDate.getFullYear()` | **FIXED** ✅ |
| 7 | **HIGH** | LeaveBusinessService.js | `calculateLeaveDays()` with `isHalfDay` always returns 0.5 regardless of date range | **FIXED** ✅ |
| 8 | **HIGH** | attendance.routes.js | Manager filter uses `departmentId` (sees all dept) instead of `managerId` (direct reports) | **FIXED** ✅ |
| 9 | **MEDIUM** | user.routes.js | PUT /profile has no Joi validation — raw `req.body` used directly | **FIXED** ✅ |
| 10 | **MEDIUM** | EmployeeService.js | `generateEmployeeId()` race condition when `transaction` is null | Open |
| 11 | **MEDIUM** | LeaveBusinessService.js | `createLeaveRequest()` not wrapped in transaction | Open |
| 12 | **LOW** | debug.routes.js | Raw SQL execution with weak keyword filter (dev-only) | Open |
| 13 | **LOW** | Frontend | Inconsistent `normalizeResponse` implementations | Open |
| 14 | **LOW** | Frontend | Missing error UI in EmployeeDashboard (indefinite spinner on error) | Open |
| 15 | **LOW** | Frontend | React Query cache invalidation gaps | Open |
| 16 | **LOW** | Various routes | Most routes lack rate limiting | Open |

---

## Phase 1: Backend Models Scan (23 Models)

All 23 Sequelize models were inventoried with complete column definitions, types, constraints, associations, hooks, and indexes.

### Key Models & Column Counts:
- **Employee**: 44+ fields (personal, employment, salary virtual fields, country)
- **Payslip**: 37 fields (earnings, deductions, taxes, net pay)
- **PayrollData**: 32 fields (pay period, allowances, deductions, status)
- **SalaryStructure**: 20+ fields (basic, HRA, PF, tax regime, ESI, isActive)
- **LeaveRequest**: 12 fields (dates, type, status, approver)
- **Timesheet**: 15+ fields (daily hours, totalHoursWorked, status)
- **Attendance**: 8 fields (date, check-in/out, status)
- **User**: 8 fields (auth, role, refresh tokens)

### Model Integrity Findings:
- All FK columns auto-created by Sequelize associations — verified via live DB query
- ENUM values consistent across models (status fields, roles, etc.)
- `afterFind` hook in Employee model correctly maps salary fields from SalaryStructure
- Country column present with default 'India'
- ESI column present in SalaryStructure with default 0

---

## Phase 2: Controllers & Routes Scan (6 Controllers, 28 Routes)

### Routes Scanned:
`auth.routes.js`, `employee.routes.js`, `leave.routes.js`, `payroll*.routes.js`, `attendance.routes.js`, `timesheet.routes.js`, `user.routes.js`, `department.routes.js`, `position.routes.js`, `project.routes.js`, `debug.routes.js`, `system-config.routes.js`, and 16 others.

### Findings:

**[FIXED] Issue 8 — attendance.routes.js manager filtering**
- **Before**: Manager query used `{ departmentId: manager.departmentId }` — sees ALL department employees
- **After**: Changed to `{ managerId: manager.id }` — sees only direct reports

**[FIXED] Issue 9 — user.routes.js PUT /profile validation**
- **Before**: No validation; raw `req.body` fields used directly in `user.update()`
- **After**: Added Joi schema with `firstName` (string, 1-100), `lastName` (string, 1-100), `email` (email, max 255), requiring at least 1 field

**Issue 12 — debug.routes.js raw SQL endpoint**
- POST `/debug/sql` accepts raw SQL with only 4 keyword blocks (DROP DATABASE, TRUNCATE, DROP TABLE, ALTER TABLE)
- Environment-gated (dev/test only) — partial mitigation
- Risk: INSERT, UPDATE, DELETE not blocked
- Recommendation: Add comprehensive SQL command whitelist or remove entirely

**Other Route Observations**:
- Route ordering in payslipRoutes.js: `/:id` could potentially shadow `/reports/*` paths
- Payslip bulk operations missing array size validation
- Rate limiting only applied to auth, system-config, timesheet routes

---

## Phase 3: Services & Business Logic Scan

### PayrollBusinessService.js

**[FIXED] Issue 2 & 3 — calculateTotalAllowances/Deductions**
- **Before**: Only handled array format `[{amount: 5000}]`, returned 0 for object format `{hra: 5000}`
- **After**: Added object format handling: `Object.values(obj).reduce((sum, val) => sum + Number(val || 0), 0)`
- Impact: Payroll calculations that store allowances/deductions as key-value objects now compute correctly

**[FIXED] Issue 4 & 5 — approvePayroll/rejectPayroll role check**
- **Before**: Checked for `['admin', 'payroll_manager']` — `payroll_manager` is NOT a valid role in the system (valid: admin, hr, manager, employee)
- **After**: Changed to `['admin', 'hr']`
- Impact: HR users can now approve/reject payroll as intended

### LeaveBusinessService.js

**[FIXED] Issue 6 — Year mismatch in leave balance operations**
- **Before**: `createLeaveRequest()` used `new Date().getFullYear()` (system clock year); `rejectLeaveRequest()` used `new Date(leaveRequest.startDate).getFullYear()` (leave start year)
- **After**: Both use `new Date(data.startDate).getFullYear()` — consistent year from leave start date
- Impact: Cross-year leave requests (e.g., Dec 2025 → Jan 2026) now correctly debit/credit the right year's balance

**[FIXED] Issue 7 — calculateLeaveDays half-day logic**
- **Before**: `isHalfDay ? 0.5 : diffDays` — any half-day leave across multiple days counted as 0.5
- **After**: `isHalfDay ? diffDays - 0.5 : diffDays` — deducts 0.5 from the total inclusive days
- Impact: A 3-day half-day leave (Mon-Wed) now correctly counts as 2.5 days instead of 0.5

**Issue 11 — createLeaveRequest missing transaction**
- Leave creation and balance deduction are separate operations without transaction wrapping
- If balance update fails after leave is created, data becomes inconsistent
- Recommendation: Wrap in `db.sequelize.transaction()`

### EmployeeService.js

**[FIXED] Issue 1 — SalaryStructure not included in queries**
- **Before**: `findAllWithDetails()` and `findByIdWithDetails()` did not include SalaryStructure in their Sequelize `include` option
- **After**: Added `{ model: db.SalaryStructure, as: 'salaryStructure', where: { isActive: true }, required: false }`
- Impact: Employee API responses now return full salary data (verified via live API test)
- Verified: basicSalary, all 7 allowance fields, all 5 deduction fields, benefits, taxInformation all populated

**Issue 10 — generateEmployeeId race condition**
- When `transaction` parameter is null, concurrent employee creation could generate duplicate IDs
- The method does `findOne({order: [['employeeId', 'DESC']]})` then increments — no lock
- Recommendation: Always pass a transaction, or use a database sequence

---

## Phase 4: Frontend Scan

### Findings:

**Issue 13 — Inconsistent normalizeResponse implementations**
- Two different response normalization functions exist in the codebase
- One in API service layer, another in individual component files
- Can lead to double-normalization or missed error states

**Issue 14 — Missing error UI in EmployeeDashboard**
- On API error, shows indefinite loading spinner instead of error message
- User has no way to know the request failed or retry

**Issue 15 — React Query cache invalidation gaps**
- Some mutations don't invalidate related queries (e.g., creating a leave doesn't invalidate leave balance)
- Can show stale data until manual refresh

**Other observations**:
- Employee form has data shape mismatch between nested salary object and stringified format
- Auth token refresh can fail silently in some edge cases
- PayslipViewer and ManagerDashboard have potential null/undefined rendering issues

---

## Phase 5: Live API Test Results

All 12 endpoint categories tested against running backend with seeded data:

| Endpoint | Status | Records | Key Observations |
|----------|--------|---------|------------------|
| POST /api/auth/login | 200 ✅ | - | JWT cookies set correctly |
| GET /api/employees | 200 ✅ | 8 | Country field present ('India') ✅, salary now populated ✅ |
| GET /api/employees/:id | 200 ✅ | 1 | Full salary structure with all fields ✅ |
| GET /api/leaves | 200 ✅ | - | Correct field structure |
| GET /api/timesheets | 200 ✅ | - | totalHoursWorked validation in place |
| GET /api/payroll | 200 ✅ | 0 | No data seeded |
| GET /api/payslips | 200 ✅ | 0 | No data seeded |
| GET /api/departments | 200 ✅ | 2 | Full department data |
| GET /api/positions | 200 ✅ | 11 | All positions present |
| GET /api/dashboard | 200 ✅ | - | Stats computed correctly |
| GET /api/attendance | 200 ✅ | - | Records present |
| GET /api/projects | 200 ✅ | 2 | Full project data |

### Salary Data Verification (Post-Fix):
```json
{
  "basicSalary": 60000,
  "allowances": { "hra": 24000, "transport": 0, "medical": 0, "food": 0, "communication": 0, "special": 0, "other": 12000 },
  "deductions": { "pf": 7200, "incomeTax": 8000, "professionalTax": 2400, "esi": 0, "other": 0 },
  "benefits": { "bonus": 0, "incentive": 0, "overtime": 0 },
  "taxInformation": { "taxRegime": "old", "ctc": 0, "takeHome": 0 },
  "currency": "INR",
  "effectiveFrom": "2024-03-01",
  "isActive": true
}
```

---

## Files Modified in This Review

| File | Changes |
|------|---------|
| `backend/services/EmployeeService.js` | Added SalaryStructure include to `findAllWithDetails()` and `findByIdWithDetails()` |
| `backend/services/business/PayrollBusinessService.js` | Fixed `calculateTotalAllowances()`, `calculateTotalDeductions()` object format; fixed `approvePayroll()` and `rejectPayroll()` role check |
| `backend/services/business/LeaveBusinessService.js` | Fixed `createLeaveRequest()` year to use startDate; fixed `calculateLeaveDays()` half-day logic |
| `backend/routes/attendance.routes.js` | Changed manager filter from `departmentId` to `managerId` |
| `backend/routes/user.routes.js` | Added Joi import, validate middleware, and schema for PUT /profile |

---

## Open Items (Not Fixed — Tracked for Future)

| # | Priority | Item | Risk |
|---|----------|------|------|
| 1 | MEDIUM | `generateEmployeeId()` race condition | Duplicate employee IDs under concurrent creation |
| 2 | MEDIUM | `createLeaveRequest()` missing transaction | Inconsistent balance on partial failure |
| 3 | LOW | debug.routes.js weak SQL filter | Dev-only, but INSERT/UPDATE/DELETE not blocked |
| 4 | LOW | Frontend normalizeResponse inconsistency | Double-normalization or missed errors |
| 5 | LOW | EmployeeDashboard indefinite spinner on error | Poor user experience |
| 6 | LOW | React Query cache invalidation gaps | Stale data after mutations |
| 7 | LOW | Most routes lack rate limiting | Potential abuse in production |

---

## False Positives Dismissed

1. **Model "missing FK columns"** — Sequelize auto-creates FK columns from associations. All columns verified present in actual DB via `SELECT column_name FROM information_schema.columns`.
2. **PayslipCalculationService "silent failure"** — Callers DO check the `success` flag on the returned object before using results.
3. **Timesheet status case mismatch** — Works correctly; backend normalizes status values.
