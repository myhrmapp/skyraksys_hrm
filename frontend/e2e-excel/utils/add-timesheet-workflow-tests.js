/**
 * Add Timesheet Workflow tests (TS-039..TS-062) to the existing Timesheet sheet.
 * Covers: multiple tasks/projects, save draft, submit, approve, reject, resubmit.
 *
 * Run: node e2e-excel/utils/add-timesheet-workflow-tests.js
 */
const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = XLSX.readFile(WORKBOOK_PATH);
const SHEET_NAME = 'Timesheet';

// Read existing rows as reference
const existingSheet = wb.Sheets[SHEET_NAME];
const existingRows = existingSheet ? XLSX.utils.sheet_to_json(existingSheet) : [];
console.log(`Existing rows in ${SHEET_NAME}: ${existingRows.length}`);

const newTests = [
  // ─── MULTIPLE TASKS / PROJECTS ──────────────────
  {
    testId: 'TS-039', description: 'Employee: Add 3 task rows and verify count', action: 'addMultipleTasks',
    enabled: 'TRUE', role: 'employee', taskCount: '3',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },
  {
    testId: 'TS-040', description: 'Employee: Select project for each task row', action: 'selectProjectsMultiRow',
    enabled: 'TRUE', role: 'employee', taskCount: '2',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },
  {
    testId: 'TS-041', description: 'Employee: Select task after project selection', action: 'selectTaskAfterProject',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },
  {
    testId: 'TS-042', description: 'Employee: Fill notes for a task row', action: 'fillTaskNotes',
    enabled: 'TRUE', role: 'employee', notes: 'Sprint 42 development work',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },
  {
    testId: 'TS-043', description: 'Employee: Fill hours across multiple task rows', action: 'fillMultiRowHours',
    enabled: 'TRUE', role: 'employee', taskCount: '2',
    mondayHours: '4', tuesdayHours: '4', wednesdayHours: '4', thursdayHours: '4', fridayHours: '4',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },
  {
    testId: 'TS-044', description: 'Manager: Add 2 tasks with different projects', action: 'addMultipleTasks',
    enabled: 'TRUE', role: 'manager', taskCount: '2',
    testType: 'Workflow', testCategory: 'Multi-Task',
  },

  // ─── SAVE DRAFT ─────────────────────────────────
  {
    testId: 'TS-045', description: 'Employee: Save Draft button enabled when form has data', action: 'saveDraftEnabled',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Save Draft',
  },
  {
    testId: 'TS-046', description: 'Employee: Click Save Draft with project+task+hours', action: 'saveDraftWorkflow',
    enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '7', fridayHours: '7',
    testType: 'Workflow', testCategory: 'Save Draft',
  },
  {
    testId: 'TS-047', description: 'Manager: Save Draft workflow', action: 'saveDraftWorkflow',
    enabled: 'TRUE', role: 'manager',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'Workflow', testCategory: 'Save Draft',
  },

  // ─── SUBMIT FOR APPROVAL ───────────────────────
  {
    testId: 'TS-048', description: 'Employee: Submit button enabled when form is valid', action: 'submitEnabled',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-049', description: 'Employee: Submit timesheet for approval', action: 'submitWorkflow',
    enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '7', fridayHours: '7',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-050', description: 'Employee: Form becomes read-only after submit', action: 'submitReadOnly',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Submit',
  },

  // ─── APPROVAL TAB — APPROVE ────────────────────
  {
    testId: 'TS-051', description: 'Manager: Approve icon visible on submitted row', action: 'approveIconVisible',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Approve',
  },
  {
    testId: 'TS-052', description: 'Manager: Click Approve opens dialog', action: 'approveDialogOpens',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Approve',
  },
  {
    testId: 'TS-053', description: 'Manager: Approve dialog has optional comments field', action: 'approveDialogComments',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Approve',
  },
  {
    testId: 'TS-054', description: 'Manager: Approve timesheet with comments', action: 'approveWithComments',
    enabled: 'TRUE', role: 'manager', approvalComments: 'Looks good, approved.',
    testType: 'Workflow', testCategory: 'Approve',
  },
  {
    testId: 'TS-055', description: 'Admin: Approve timesheet from approval tab', action: 'approveWithComments',
    enabled: 'TRUE', role: 'admin', approvalComments: 'Admin approved.',
    testType: 'Workflow', testCategory: 'Approve',
  },

  // ─── APPROVAL TAB — REJECT ─────────────────────
  {
    testId: 'TS-056', description: 'Manager: Reject icon visible on submitted row', action: 'rejectIconVisible',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-057', description: 'Manager: Click Reject opens dialog', action: 'rejectDialogOpens',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-058', description: 'Manager: Reject button disabled without comments', action: 'rejectRequiresComments',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-059', description: 'Manager: Reject timesheet with reason', action: 'rejectWithComments',
    enabled: 'TRUE', role: 'manager', rejectionReason: 'Hours on Friday seem incorrect, please review.',
    testType: 'Workflow', testCategory: 'Reject',
  },

  // ─── RESUBMIT AFTER REJECTION ──────────────────
  {
    testId: 'TS-060', description: 'Employee: Rejected timesheet is editable', action: 'rejectedIsEditable',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Resubmit',
  },
  {
    testId: 'TS-061', description: 'Employee: Resubmit rejected timesheet', action: 'resubmitWorkflow',
    enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'Workflow', testCategory: 'Resubmit',
  },

  // ─── HISTORY STATUS VERIFICATION ───────────────
  {
    testId: 'TS-062', description: 'Employee: History shows status chips (Draft/Submitted/Approved/Rejected)', action: 'historyStatusChips',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'History',
  },
];

// Merge existing + new (avoid duplicates by testId)
const existingIds = new Set(existingRows.map(r => r.testId));
const merged = [...existingRows];
for (const t of newTests) {
  if (existingIds.has(t.testId)) {
    const idx = merged.findIndex(r => r.testId === t.testId);
    merged[idx] = t; // overwrite
  } else {
    merged.push(t);
  }
}

// Replace sheet
delete wb.Sheets[SHEET_NAME];
wb.SheetNames = wb.SheetNames.filter(n => n !== SHEET_NAME);
const ws = XLSX.utils.json_to_sheet(merged);
XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

// Update TestSummary
if (wb.SheetNames.includes('TestSummary')) {
  const summarySheet = wb.Sheets['TestSummary'];
  const summaryRows = XLSX.utils.sheet_to_json(summarySheet);
  const existingIdx = summaryRows.findIndex(r => r.module === 'Timesheet');
  const summaryEntry = {
    module: 'Timesheet',
    totalTests: merged.length,
    enabledTests: merged.filter(t => t.enabled === 'TRUE').length,
    categories: [...new Set(merged.map(t => t.testCategory))].join(', '),
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
console.log(`Total Timesheet tests now: ${merged.length} (${newTests.length} workflow tests added)`);
console.log(`Test IDs: ${merged.map(t => t.testId).join(', ')}`);
