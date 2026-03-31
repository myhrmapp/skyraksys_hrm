/**
 * Add Timesheet coverage gap tests (TS-063..TS-085) to test-data.xlsx.
 *
 * Fills the following gaps identified in coverage review (2026-03-29):
 *  - HR persona: save-draft, submit, approve, reject
 *  - Manager & Admin: submit own timesheet
 *  - Admin: reject workflow
 *  - Bulk reject action (manager, admin, hr)
 *  - Weekend hours (Saturday + Sunday)
 *  - Unsaved changes blocker dialog (useBlocker)
 *  - History pagination + rows-per-page
 *  - Admin: approval search and status filter
 *  - Admin/HR: summary cards
 *  - View details from approvals (admin)
 *  - History tab for manager and HR
 *
 * Run: node e2e-excel/utils/add-timesheet-coverage-tests.js
 */
const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const wb = XLSX.readFile(WORKBOOK_PATH);
const SHEET_NAME = 'Timesheet';

const existingSheet = wb.Sheets[SHEET_NAME];
const existingRows = existingSheet ? XLSX.utils.sheet_to_json(existingSheet) : [];
console.log(`Existing rows in ${SHEET_NAME}: ${existingRows.length}`);

const newTests = [

  // ═══════════════════════════════════════════════════════
  // HR PERSONA — MISSING WORKFLOWS
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-063',
    description: 'HR: Save Draft workflow on own timesheet',
    action: 'saveDraftWorkflow',
    enabled: 'TRUE', role: 'hr',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'Workflow', testCategory: 'Save Draft',
  },
  {
    testId: 'TS-064',
    description: 'HR: Submit timesheet for approval',
    action: 'submitWorkflow',
    enabled: 'TRUE', role: 'hr',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '7', fridayHours: '7',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-065',
    description: 'HR: Form becomes read-only after submit',
    action: 'submitReadOnly',
    enabled: 'TRUE', role: 'hr',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-066',
    description: 'HR: Approve timesheet with comments',
    action: 'approveWithComments',
    enabled: 'TRUE', role: 'hr', approvalComments: 'HR approved.',
    testType: 'Workflow', testCategory: 'Approve',
  },
  {
    testId: 'TS-067',
    description: 'HR: Reject timesheet with reason',
    action: 'rejectWithComments',
    enabled: 'TRUE', role: 'hr', rejectionReason: 'Please correct the project allocation.',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-068',
    description: 'HR: History tab loads',
    action: 'historyLoad',
    enabled: 'TRUE', role: 'hr',
    testType: 'UI', testCategory: 'History',
  },

  // ═══════════════════════════════════════════════════════
  // ADMIN PERSONA — ADDITIONAL WORKFLOWS
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-069',
    description: 'Admin: Submit own timesheet for approval',
    action: 'submitWorkflow',
    enabled: 'TRUE', role: 'admin',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-070',
    description: 'Admin: Reject timesheet with reason',
    action: 'rejectWithComments',
    enabled: 'TRUE', role: 'admin', rejectionReason: 'Admin: hours exceed project cap.',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-071',
    description: 'Admin: Reject button disabled without comments',
    action: 'rejectRequiresComments',
    enabled: 'TRUE', role: 'admin',
    testType: 'Workflow', testCategory: 'Reject',
  },
  {
    testId: 'TS-072',
    description: 'Admin: History tab loads',
    action: 'historyLoad',
    enabled: 'TRUE', role: 'admin',
    testType: 'UI', testCategory: 'History',
  },

  // ═══════════════════════════════════════════════════════
  // MANAGER PERSONA — MISSING SUBMIT
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-073',
    description: 'Manager: Submit own timesheet for approval',
    action: 'submitWorkflow',
    enabled: 'TRUE', role: 'manager',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'Workflow', testCategory: 'Submit',
  },
  {
    testId: 'TS-074',
    description: 'Manager: History tab loads',
    action: 'historyLoad',
    enabled: 'TRUE', role: 'manager',
    testType: 'UI', testCategory: 'History',
  },

  // ═══════════════════════════════════════════════════════
  // BULK REJECT
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-075',
    description: 'Manager: Bulk reject action on selected rows',
    action: 'bulkRejectAction',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Bulk Operations',
  },
  {
    testId: 'TS-076',
    description: 'Admin: Bulk reject action on selected rows',
    action: 'bulkRejectAction',
    enabled: 'TRUE', role: 'admin',
    testType: 'Workflow', testCategory: 'Bulk Operations',
  },
  {
    testId: 'TS-077',
    description: 'HR: Bulk reject action on selected rows',
    action: 'bulkRejectAction',
    enabled: 'TRUE', role: 'hr',
    testType: 'Workflow', testCategory: 'Bulk Operations',
  },
  {
    testId: 'TS-078',
    description: 'Admin: Bulk approve action on selected rows',
    action: 'bulkApproveAction',
    enabled: 'TRUE', role: 'admin',
    testType: 'Workflow', testCategory: 'Bulk Operations',
  },
  {
    testId: 'TS-079',
    description: 'HR: Bulk approve action on selected rows',
    action: 'bulkApproveAction',
    enabled: 'TRUE', role: 'hr',
    testType: 'Workflow', testCategory: 'Bulk Operations',
  },

  // ═══════════════════════════════════════════════════════
  // WEEKEND HOURS
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-080',
    description: 'Employee: Fill Saturday and Sunday hours',
    action: 'weekendHoursFill',
    enabled: 'TRUE', role: 'employee',
    saturdayHours: '4', sundayHours: '2',
    testType: 'UI', testCategory: 'Weekly Entry',
  },
  {
    testId: 'TS-081',
    description: 'Manager: Fill full 7-day week including weekend',
    action: 'weekendHoursFill',
    enabled: 'TRUE', role: 'manager',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    saturdayHours: '4', sundayHours: '4',
    testType: 'UI', testCategory: 'Weekly Entry',
  },

  // ═══════════════════════════════════════════════════════
  // UNSAVED CHANGES BLOCKER
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-082',
    description: 'Employee: Unsaved changes blocker dialog appears on navigation',
    action: 'unsavedChangesBlocker',
    enabled: 'TRUE', role: 'employee',
    testType: 'Workflow', testCategory: 'Navigation Guard',
  },
  {
    testId: 'TS-083',
    description: 'Manager: Unsaved changes blocker dialog appears on navigation',
    action: 'unsavedChangesBlocker',
    enabled: 'TRUE', role: 'manager',
    testType: 'Workflow', testCategory: 'Navigation Guard',
  },

  // ═══════════════════════════════════════════════════════
  // HISTORY PAGINATION
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-084',
    description: 'Employee: History pagination controls work',
    action: 'historyPagination',
    enabled: 'TRUE', role: 'employee',
    testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-085',
    description: 'Admin: History pagination controls work',
    action: 'historyPagination',
    enabled: 'TRUE', role: 'admin',
    testType: 'UI', testCategory: 'History',
  },
  {
    testId: 'TS-086',
    description: 'Employee: History rows-per-page control works',
    action: 'historyRowsPerPage',
    enabled: 'TRUE', role: 'employee',
    testType: 'UI', testCategory: 'History',
  },

  // ═══════════════════════════════════════════════════════
  // ADMIN SEARCH/FILTER — CROSS-ROLE COVERAGE
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-087',
    description: 'Admin: Approval search input works',
    action: 'approvalSearch',
    enabled: 'TRUE', role: 'admin', searchTerm: 'employee',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-088',
    description: 'HR: Approval search input works',
    action: 'approvalSearch',
    enabled: 'TRUE', role: 'hr', searchTerm: 'test',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-089',
    description: 'Admin: Approval filter by Approved status',
    action: 'approvalFilterStatus',
    enabled: 'TRUE', role: 'admin', filterValue: 'Approved',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-090',
    description: 'HR: Approval filter by Submitted status',
    action: 'approvalFilterStatus',
    enabled: 'TRUE', role: 'hr', filterValue: 'Submitted',
    testType: 'UI', testCategory: 'Approval',
  },

  // ═══════════════════════════════════════════════════════
  // SUMMARY CARDS — ADDITIONAL ROLES
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-091',
    description: 'Admin: Summary cards visible on approval tab',
    action: 'summaryCardsVisible',
    enabled: 'TRUE', role: 'admin',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-092',
    description: 'HR: Summary cards visible on approval tab',
    action: 'summaryCardsVisible',
    enabled: 'TRUE', role: 'hr',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-093',
    description: 'HR: Summary card values are non-negative',
    action: 'summaryCardsValues',
    enabled: 'TRUE', role: 'hr',
    testType: 'UI', testCategory: 'Approval',
  },

  // ═══════════════════════════════════════════════════════
  // VIEW DETAILS DIALOG — ADDITIONAL ROLES
  // ═══════════════════════════════════════════════════════

  {
    testId: 'TS-094',
    description: 'Admin: View details dialog opens from approvals tab',
    action: 'viewDetailsDialog',
    enabled: 'TRUE', role: 'admin', tabName: 'Approvals',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-095',
    description: 'HR: View details dialog opens from approvals tab',
    action: 'viewDetailsDialog',
    enabled: 'TRUE', role: 'hr', tabName: 'Approvals',
    testType: 'UI', testCategory: 'Approval',
  },
  {
    testId: 'TS-096',
    description: 'Manager: View details dialog opens from history tab',
    action: 'viewDetailsDialog',
    enabled: 'TRUE', role: 'manager', tabName: 'History',
    testType: 'UI', testCategory: 'History',
  },
];

// Merge: skip existing IDs, add new ones
const existingIds = new Set(existingRows.map(r => r.testId));
const merged = [...existingRows];
for (const t of newTests) {
  if (existingIds.has(t.testId)) {
    const idx = merged.findIndex(r => r.testId === t.testId);
    merged[idx] = t;
    console.log(`  Updated: ${t.testId}`);
  } else {
    merged.push(t);
    console.log(`  Added: ${t.testId} — ${t.description}`);
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
  console.log('\nTestSummary updated.');
}

XLSX.writeFile(wb, WORKBOOK_PATH);
console.log(`\nTotal Timesheet tests now: ${merged.length} (${newTests.length} new coverage tests added)`);
console.log(`New IDs: ${newTests.map(t => t.testId).join(', ')}`);
