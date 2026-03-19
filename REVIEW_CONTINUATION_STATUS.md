# Review Continuation Status

Last updated: 2026-03-19

## Completed in this continuation

- Fixed `position` update route to allow explicit field clearing and included all validated fields.
- Fixed leave balance validator field names to match model:
  - `totalDays` -> `totalAccrued`
  - `usedDays` -> `totalTaken`
  - `carriedForward` -> `carryForward`
- Improved leave cancel React Query invalidation to safely invalidate all balances when `employeeId` is absent in mutation response.
- Fixed payroll validator status enums to match `PayrollData` model:
  - Added `calculated`, `cancelled`
  - Removed mismatched `submitted`, `processed`, `rejected` in relevant schemas.
- Added missing `updateSalaryStructureSchema` and export in payroll validators.
- Added salary-structure field mapping in create/update routes:
  - `providentFund` -> `pfContribution`
  - `incomeTax` -> `tds`
  - Aggregated allowance components into `allowances` when needed.
- Added missing validation middleware in auth routes:
  - `forgot-password` now uses `forgotPasswordSchema`
  - `reset-password` now uses `resetPasswordSchema`
- Fixed weekly timesheet update re-validation trigger in `TimesheetBusinessService` to use weekly model fields (`mondayHours..sundayHours`, `weekStartDate`, `weekEndDate`) instead of obsolete daily fields (`hours`, `date`).
- LOW cleanup: unified duplicate TODO message wording in `queryClient.js`.

## Verification performed

- IDE diagnostics (`Problems`) checked for all changed files: **no errors**.
- Attempted workspace tasks:
  - `Run TimesheetHistory Tests`
  - `Run EmployeePayslips Tests`
- Both failed due to missing script:
  - `d:\skyraksys_hrm1\run-test.js` not found

## Current blocker

Task definitions reference `node d:/skyraksys_hrm1/run-test.js ...`, but that file does not exist at that path.

## Next continuation steps

1. Fix task runner path or restore `run-test.js` at workspace root.
2. Re-run all provided TimesheetHistory and EmployeePayslips test tasks.
3. Continue LOW-priority cleanup list and finalize with full regression pass.
