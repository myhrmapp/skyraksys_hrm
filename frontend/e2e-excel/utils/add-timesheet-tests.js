/**
 * Add Timesheet sheet to test-data.xlsx
 * Weekly UI tests covering all roles: Employee, Manager, Admin, HR
 *
 * Run: node e2e-excel/utils/add-timesheet-tests.js
 */
const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = XLSX.readFile(WORKBOOK_PATH);

const SHEET_NAME = 'Timesheet';

// Remove existing sheet if present (idempotent)
if (wb.SheetNames.includes(SHEET_NAME)) {
  delete wb.Sheets[SHEET_NAME];
  wb.SheetNames = wb.SheetNames.filter(n => n !== SHEET_NAME);
}

const tests = [
  // ─── HUB & NAVIGATION ────────────────────────────────
  {
    testId: 'TS-001', description: 'Employee: Timesheet hub page loads', action: 'hubLoad',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Navigation',
  },
  {
    testId: 'TS-002', description: 'Admin: Timesheet hub page loads', action: 'hubLoad',
    enabled: 'TRUE', role: 'admin', testType: 'UI', testCategory: 'Navigation',
  },
  {
    testId: 'TS-003', description: 'Manager: Timesheet hub page loads', action: 'hubLoad',
    enabled: 'TRUE', role: 'manager', testType: 'UI', testCategory: 'Navigation',
  },
  {
    testId: 'TS-004', description: 'HR: Timesheet hub page loads', action: 'hubLoad',
    enabled: 'TRUE', role: 'hr', testType: 'UI', testCategory: 'Navigation',
  },

  // ─── TAB VISIBILITY (RBAC) ────────────────────────────
  {
    testId: 'TS-005', description: 'Employee: My Timesheet tab visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'employee', tabName: 'My Timesheet', expectVisible: 'TRUE',
    testType: 'UI', testCategory: 'RBAC',
  },
  {
    testId: 'TS-006', description: 'Employee: Approvals tab NOT visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'employee', tabName: 'Approvals', expectVisible: 'FALSE',
    testType: 'UI', testCategory: 'RBAC',
  },
  {
    testId: 'TS-007', description: 'Employee: History tab visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'employee', tabName: 'History', expectVisible: 'TRUE',
    testType: 'UI', testCategory: 'RBAC',
  },
  {
    testId: 'TS-008', description: 'Manager: Approvals tab visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'manager', tabName: 'Approvals', expectVisible: 'TRUE',
    testType: 'UI', testCategory: 'RBAC',
  },
  {
    testId: 'TS-009', description: 'Admin: Approvals tab visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'admin', tabName: 'Approvals', expectVisible: 'TRUE',
    testType: 'UI', testCategory: 'RBAC',
  },
  {
    testId: 'TS-010', description: 'HR: Approvals tab visible', action: 'tabVisible',
    enabled: 'TRUE', role: 'hr', tabName: 'Approvals', expectVisible: 'TRUE',
    testType: 'UI', testCategory: 'RBAC',
  },

  // ─── WEEKLY ENTRY — NAVIGATION CONTROLS ───────────────
  {
    testId: 'TS-011', description: 'Employee: Week navigation controls visible', action: 'weekNavVisible',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-012', description: 'Employee: Navigate to previous week', action: 'weekNavPrev',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-013', description: 'Employee: Navigate to next week', action: 'weekNavNext',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-014', description: 'Employee: Click Today resets to current week', action: 'weekNavToday',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },

  // ─── WEEKLY ENTRY — TABLE & FORM ─────────────────────
  {
    testId: 'TS-015', description: 'Employee: Entry table is visible', action: 'entryTableVisible',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-016', description: 'Employee: Add Task button visible', action: 'addTaskVisible',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-017', description: 'Employee: Add Task creates new row', action: 'addTaskRow',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-018', description: 'Employee: Delete task row removes it', action: 'deleteTaskRow',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-019', description: 'Employee: Fill hours in weekly grid', action: 'fillWeeklyHours',
    enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '7', fridayHours: '7',
    testType: 'UI', testCategory: 'Weekly Entry',
  },

  // ─── SAVE & SUBMIT ───────────────────────────────────
  {
    testId: 'TS-020', description: 'Employee: Save Draft button visible', action: 'saveDraftVisible',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-021', description: 'Employee: Submit button visible', action: 'submitVisible',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-022', description: 'Admin: Save Draft button visible', action: 'saveDraftVisible',
    enabled: 'TRUE', role: 'admin', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-023', description: 'Admin: Submit button visible', action: 'submitVisible',
    enabled: 'TRUE', role: 'admin', testType: 'UI', testCategory: 'Weekly Entry',
  },

  // ─── APPROVAL TAB UI ─────────────────────────────────
  {
    testId: 'TS-024', description: 'Manager: Approval tab has search input', action: 'approvalUICheck',
    enabled: 'TRUE', role: 'manager', uiElement: 'search', testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-025', description: 'Manager: Approval tab has status filter', action: 'approvalUICheck',
    enabled: 'TRUE', role: 'manager', uiElement: 'statusFilter', testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-026', description: 'Admin: Approval tab has search & filters', action: 'approvalUICheck',
    enabled: 'TRUE', role: 'admin', uiElement: 'search', testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-027', description: 'Manager: Approval table loads with rows', action: 'approvalTableLoad',
    enabled: 'TRUE', role: 'manager', testType: 'UI', testCategory: 'Approval',
  },

  // ─── HISTORY TAB UI ──────────────────────────────────
  {
    testId: 'TS-028', description: 'Employee: History tab loads', action: 'historyLoad',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-029', description: 'Employee: History filter toggle visible', action: 'historyUICheck',
    enabled: 'TRUE', role: 'employee', uiElement: 'filterToggle', testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-030', description: 'Employee: History export button visible', action: 'historyUICheck',
    enabled: 'TRUE', role: 'employee', uiElement: 'export', testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-031', description: 'Employee: History filter panel expands', action: 'historyFilterExpand',
    enabled: 'TRUE', role: 'employee', testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-032', description: 'Admin: History tab loads', action: 'historyLoad',
    enabled: 'TRUE', role: 'admin', testType: 'UI', testCategory: 'History',
  },

  // ─── CROSS-ROLE ENTRY FORM ────────────────────────────
  {
    testId: 'TS-033', description: 'Manager: Weekly entry form visible', action: 'entryTableVisible',
    enabled: 'TRUE', role: 'manager', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-034', description: 'Admin: Weekly entry form visible', action: 'entryTableVisible',
    enabled: 'TRUE', role: 'admin', testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-035', description: 'Manager: Add Task and fill hours', action: 'fillWeeklyHours',
    enabled: 'TRUE', role: 'manager',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'UI', testCategory: 'Weekly Entry',
  },

  // ─── TAB SWITCHING ────────────────────────────────────
  {
    testId: 'TS-036', description: 'Manager: Switch between tabs', action: 'tabSwitch',
    enabled: 'TRUE', role: 'manager', fromTab: 'My Timesheet', toTab: 'Approvals',
    testType: 'UI', testCategory: 'Navigation',
  },
  {
    testId: 'TS-037', description: 'Admin: Switch My Timesheet to History', action: 'tabSwitch',
    enabled: 'TRUE', role: 'admin', fromTab: 'My Timesheet', toTab: 'History',
    testType: 'UI', testCategory: 'Navigation',
  },
  {
    testId: 'TS-038', description: 'Employee: Switch My Timesheet to History', action: 'tabSwitch',
    enabled: 'TRUE', role: 'employee', fromTab: 'My Timesheet', toTab: 'History',
    testType: 'UI', testCategory: 'Navigation',
  },
];

// Add to workbook
const ws = XLSX.utils.json_to_sheet(tests);
XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

// Update TestSummary if it exists
if (wb.SheetNames.includes('TestSummary')) {
  const summarySheet = wb.Sheets['TestSummary'];
  const summaryRows = XLSX.utils.sheet_to_json(summarySheet);
  const existingIdx = summaryRows.findIndex(r => r.module === 'Timesheet');
  const summaryEntry = {
    module: 'Timesheet',
    totalTests: tests.length,
    enabledTests: tests.filter(t => t.enabled === 'TRUE').length,
    categories: [...new Set(tests.map(t => t.testCategory))].join(', '),
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  if (existingIdx >= 0) {
    summaryRows[existingIdx] = summaryEntry;
  } else {
    summaryRows.push(summaryEntry);
  }
  wb.Sheets['TestSummary'] = XLSX.utils.json_to_sheet(summaryRows);
}

XLSX.writeFile(wb, WORKBOOK_PATH);
console.log(`Added ${tests.length} Timesheet tests to "${SHEET_NAME}" sheet.`);
console.log(`Total sheets: ${wb.SheetNames.join(', ')}`);
