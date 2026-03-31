/**
 * Add gap coverage test rows to test-data.xlsx
 * Run: node frontend/e2e-excel/utils/addGapTests.js
 */
const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');

// Read existing workbook
const wb = XLSX.readFile(WORKBOOK_PATH);

// ═══════════════════════════════════════════════
// EMPLOYEE MODULE GAP TESTS (EMP-094 to EMP-117)
// ═══════════════════════════════════════════════
const employeeGapRows = [
  // G1: Salary tab deep-field tests
  { testId: 'EMP-094', description: 'Salary: Fill all salary fields (basic, allowances, deductions, benefits)', action: 'salaryAllFieldsEntry', enabled: 'TRUE', role: 'admin', tags: 'regression,salary', basicSalary: '50000', allowance_hra: '15000', allowance_transport: '3000', allowance_medical: '2000', allowance_food: '1500', allowance_special: '5000', deduction_pf: '6000', deduction_professionalTax: '200', deduction_incomeTax: '5000', deduction_esi: '1000', benefit_bonus: '10000' },
  { testId: 'EMP-095', description: 'Salary: Create employee with salary and verify persistence', action: 'salaryFieldsPersistAfterSave', enabled: 'TRUE', role: 'admin', tags: 'regression,salary', prerequisite: 'EMP-094', basicSalary: '75000', allowance_hra: '20000' },
  { testId: 'EMP-096', description: 'Salary: Verify currency and pay frequency selects work', action: 'salaryCurrencyPayFrequency', enabled: 'TRUE', role: 'admin', tags: 'regression,salary' },

  // G2: Form validation error message tests
  { testId: 'EMP-097', description: 'Validation: Invalid email format shows error', action: 'validateEmailFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: 'not-an-email' },
  { testId: 'EMP-098', description: 'Validation: Short phone number shows error', action: 'validatePhoneFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: '12345' },
  { testId: 'EMP-099', description: 'Validation: Invalid Aadhaar (not 12 digits) shows error', action: 'validateAadhaarFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: '12345' },
  { testId: 'EMP-100', description: 'Validation: Invalid PAN format shows error', action: 'validatePanFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: 'INVALID' },
  { testId: 'EMP-101', description: 'Validation: Invalid IFSC code shows error', action: 'validateIfscFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: 'BADCODE' },
  { testId: 'EMP-102', description: 'Validation: Invalid PIN code (not 6 digits) shows error', action: 'validatePinCodeFormat', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: '123' },
  { testId: 'EMP-103', description: 'Validation: Under-18 DOB shows age error', action: 'validateDobAge', enabled: 'TRUE', role: 'admin', tags: 'validation,negative', invalidValue: '2020-01-01' },
  { testId: 'EMP-104', description: 'Validation: Submit empty form stays on page with errors', action: 'validateRequiredFields', enabled: 'TRUE', role: 'admin', tags: 'validation,negative' },

  // G3: Export content verification
  { testId: 'EMP-105', description: 'Export: Verify download produces valid file', action: 'exportVerifyDownload', enabled: 'TRUE', role: 'admin', tags: 'regression,export' },

  // G4: Duplicate email prevention
  { testId: 'EMP-106', description: 'Create: Duplicate email is rejected', action: 'duplicateEmailRejected', enabled: 'TRUE', role: 'admin', tags: 'validation,negative' },

  // G5: Pagination interaction
  { testId: 'EMP-107', description: 'Pagination: Navigate to next page', action: 'paginationNavigate', enabled: 'TRUE', role: 'admin', tags: 'regression' },
  { testId: 'EMP-108', description: 'Pagination: Change rows per page', action: 'paginationChangePageSize', enabled: 'TRUE', role: 'admin', tags: 'regression', pageSize: '25' },

  // G7: Manager team filtering
  { testId: 'EMP-109', description: 'RBAC: Manager sees only team members (subset of admin list)', action: 'managerTeamOnly', enabled: 'TRUE', role: 'manager', tags: 'rbac,regression' },

  // G9: Cascading dept→position deep test
  { testId: 'EMP-110', description: 'Cascading: Position options filter after department selection', action: 'cascadingDeptPositionFilter', enabled: 'TRUE', role: 'admin', tags: 'regression' },

  // G10: Create user login full workflow
  { testId: 'EMP-111', description: 'User Account: Full create login workflow (fill + submit)', action: 'createUserLoginFull', enabled: 'TRUE', role: 'admin', tags: 'regression', userRole: 'employee' },

  // G12: DOB age validation (already covered by EMP-103 above)
];

// ═══════════════════════════════════════════════
// TIMESHEET MODULE GAP TESTS (TS-063 to TS-085)
// ═══════════════════════════════════════════════
const timesheetGapRows = [
  // T1: Hours validation
  { testId: 'TS-063', description: 'Validation: Hours exceed 24 shows error/clamp', action: 'hoursExceed24', enabled: 'TRUE', role: 'employee', tags: 'validation,negative' },
  { testId: 'TS-064', description: 'Validation: Negative hours rejected', action: 'hoursNegative', enabled: 'TRUE', role: 'employee', tags: 'validation,negative' },
  { testId: 'TS-065', description: 'Validation: Non-numeric hours rejected', action: 'hoursNonNumeric', enabled: 'TRUE', role: 'employee', tags: 'validation,negative' },

  // T2+T3: Calculation tests
  { testId: 'TS-066', description: 'Calculation: Daily totals update when hours change', action: 'dailyTotalsCalc', enabled: 'TRUE', role: 'employee', tags: 'regression,calculation', mondayHours: '4', tuesdayHours: '3' },
  { testId: 'TS-067', description: 'Calculation: Weekly total is sum of all daily hours', action: 'weeklyTotalCalc', enabled: 'TRUE', role: 'employee', tags: 'regression,calculation', mondayHours: '8', tuesdayHours: '7', wednesdayHours: '6' },

  // T4: Summary dashboard cards
  { testId: 'TS-068', description: 'Approval: Summary dashboard cards visible', action: 'summaryCardsVisible', enabled: 'TRUE', role: 'admin', tags: 'regression' },
  { testId: 'TS-069', description: 'Approval: Summary cards show valid counts', action: 'summaryCardsValues', enabled: 'TRUE', role: 'admin', tags: 'regression' },

  // T5: Bulk approve/reject
  { testId: 'TS-070', description: 'Bulk: Selecting checkbox shows bulk action buttons', action: 'bulkSelectCheckbox', enabled: 'TRUE', role: 'admin', tags: 'regression,bulk' },
  { testId: 'TS-071', description: 'Bulk: Select all checkboxes', action: 'bulkSelectAll', enabled: 'TRUE', role: 'admin', tags: 'regression,bulk' },
  { testId: 'TS-072', description: 'Bulk: Bulk approve action opens dialog', action: 'bulkApproveAction', enabled: 'TRUE', role: 'admin', tags: 'regression,bulk' },

  // T6: Approval search
  { testId: 'TS-073', description: 'Approval: Search by employee name filters table', action: 'approvalSearch', enabled: 'TRUE', role: 'admin', tags: 'regression', searchTerm: 'employee' },

  // T7: Approval filters
  { testId: 'TS-074', description: 'Approval: Filter by status works', action: 'approvalFilterStatus', enabled: 'TRUE', role: 'admin', tags: 'regression', filterValue: 'Approved' },

  // T8: History date range filter
  { testId: 'TS-075', description: 'History: Date range filter functional', action: 'historyFilterDateRange', enabled: 'TRUE', role: 'employee', tags: 'regression', fromDate: '2025-01-01', toDate: '2025-12-31' },

  // T9: History status filter
  { testId: 'TS-076', description: 'History: Status filter functional', action: 'historyFilterStatus', enabled: 'TRUE', role: 'employee', tags: 'regression', filterValue: 'Approved' },

  // T10: History export
  { testId: 'TS-077', description: 'History: Export downloads valid file', action: 'historyExportDownload', enabled: 'TRUE', role: 'employee', tags: 'regression,export' },

  // T12: View details dialog
  { testId: 'TS-078', description: 'Dialog: View details from Approvals tab shows timesheet info', action: 'viewDetailsDialog', enabled: 'TRUE', role: 'admin', tags: 'regression', tabName: 'approvals' },
  { testId: 'TS-079', description: 'Dialog: View details from History tab shows timesheet info', action: 'viewDetailsDialog', enabled: 'TRUE', role: 'employee', tags: 'regression', tabName: 'history' },

  // T14: Week navigation state persistence
  { testId: 'TS-080', description: 'Navigation: Saved data persists after navigating away and back', action: 'weekNavStatePersist', enabled: 'TRUE', role: 'employee', tags: 'regression' },

  // T16: Empty submission blocked
  { testId: 'TS-081', description: 'Validation: Empty timesheet submission is blocked', action: 'emptySubmitBlocked', enabled: 'TRUE', role: 'employee', tags: 'validation,negative' },

  // Additional RBAC tests for T5 — manager bulk
  { testId: 'TS-082', description: 'Bulk: Manager can select and bulk approve team timesheets', action: 'bulkSelectCheckbox', enabled: 'TRUE', role: 'manager', tags: 'rbac,bulk' },

  // T6 — HR search
  { testId: 'TS-083', description: 'Approval: HR can search timesheets', action: 'approvalSearch', enabled: 'TRUE', role: 'hr', tags: 'rbac', searchTerm: 'test' },
];

// ─── Helper: Append rows to existing sheet ───
function appendRowsToSheet(wb, sheetName, newRows) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet "${sheetName}" not found!`);
    return;
  }

  // Get existing data
  const existing = XLSX.utils.sheet_to_json(ws);
  console.log(`  ${sheetName}: ${existing.length} existing rows`);

  // Check for duplicates
  const existingIds = new Set(existing.map(r => r.testId));
  const toAdd = newRows.filter(r => !existingIds.has(r.testId));
  const skipped = newRows.length - toAdd.length;
  if (skipped > 0) {
    console.log(`  Skipping ${skipped} duplicate rows`);
  }

  if (toAdd.length === 0) {
    console.log(`  No new rows to add.`);
    return;
  }

  // Merge with existing data
  const merged = [...existing, ...toAdd];

  // Recreate worksheet from merged data
  const newWs = XLSX.utils.json_to_sheet(merged);
  wb.Sheets[sheetName] = newWs;

  console.log(`  Added ${toAdd.length} new rows (total: ${merged.length})`);
}

// ─── Main ────────────────────────────────────
console.log('Adding gap coverage test rows to test-data.xlsx...\n');

appendRowsToSheet(wb, 'Employee', employeeGapRows);
appendRowsToSheet(wb, 'Timesheet', timesheetGapRows);

// Write updated workbook
XLSX.writeFile(wb, WORKBOOK_PATH);
console.log(`\nDone! Updated ${WORKBOOK_PATH}`);
console.log(`  Employee: +${employeeGapRows.length} gap tests`);
console.log(`  Timesheet: +${timesheetGapRows.length} gap tests`);
