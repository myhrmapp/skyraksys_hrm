/**
 * Add detailed UI workflow tests (TS-097..TS-110) to the Timesheet sheet.
 * Covers: multi-row save/submit, future-date blocking, read-only view,
 *         rejected resubmit, history detail, toast message assertions,
 *         manager approval/rejection toast verifications.
 *
 * Run: node e2e-excel/utils/add-ui-workflow-tests.js
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
  // ─── MULTI-ROW SAVE / SUBMIT COMBINATIONS ───────────────────────────────
  {
    testId: 'TS-097', description: 'Employee: Fill 2 rows → Save Draft only (verify draft toast + still editable)',
    action: 'multiRowSaveDraft', enabled: 'TRUE', role: 'employee',
    taskCount: '2', mondayHours: '6', tuesdayHours: '5', wednesdayHours: '4', thursdayHours: '4', fridayHours: '3',
    testType: 'UIWorkflow', testCategory: 'MultiRow',
  },
  {
    testId: 'TS-098', description: 'Employee: Fill 2 rows → Submit directly (verify submitted toast + read-only)',
    action: 'multiRowDirectSubmit', enabled: 'TRUE', role: 'employee',
    taskCount: '2', mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '6', fridayHours: '6',
    testType: 'UIWorkflow', testCategory: 'MultiRow',
  },
  {
    testId: 'TS-099', description: 'Employee: Fill 2 rows → Save only (NOT submit) → verify draft state',
    action: 'multiRowSaveOnly', enabled: 'TRUE', role: 'employee',
    taskCount: '2', mondayHours: '4', tuesdayHours: '4',
    testType: 'UIWorkflow', testCategory: 'MultiRow',
  },

  // ─── VIEW SUBMITTED TIMESHEET IN READ-ONLY ──────────────────────────────
  {
    testId: 'TS-100', description: 'Employee: Navigate to already-submitted week → all inputs disabled, read-only alert',
    action: 'viewSubmittedMultiRowDisabled', enabled: 'TRUE', role: 'employee',
    testType: 'UIWorkflow', testCategory: 'ReadOnly',
  },

  // ─── REJECTED TIMESHEET RESUBMIT FLOW ───────────────────────────────────
  {
    testId: 'TS-101', description: 'Employee: Navigate to rejected timesheet → see reason → edit → resubmit',
    action: 'resubmitRejectedFlow', enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '8', fridayHours: '8',
    testType: 'UIWorkflow', testCategory: 'Resubmit',
  },

  // ─── HISTORY ROW CLICK DETAIL ────────────────────────────────────────────
  {
    testId: 'TS-102', description: 'Employee: Click a row in History tab → view timesheet detail',
    action: 'historyRowClickView', enabled: 'TRUE', role: 'employee',
    testType: 'UIWorkflow', testCategory: 'History',
  },

  // ─── FUTURE WEEK SUBMISSION BLOCKING ────────────────────────────────────
  {
    testId: 'TS-103', description: 'Employee: Navigate to next week → submit button disabled or blocked',
    action: 'futureWeekSubmitCheck', enabled: 'TRUE', role: 'employee',
    testType: 'UIWorkflow', testCategory: 'FutureDate',
  },
  {
    testId: 'TS-104', description: 'Employee: Navigate to next week+1 → try submit → specific future-date error',
    action: 'futureWeekPlus1Error', enabled: 'TRUE', role: 'employee',
    testType: 'UIWorkflow', testCategory: 'FutureDate',
  },

  // ─── TOAST MESSAGE ASSERTIONS ────────────────────────────────────────────
  {
    testId: 'TS-105', description: 'Employee: Save Draft → verify toast says "saved" or "draft"',
    action: 'toastSaveDraftMsg', enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '7',
    testType: 'UIWorkflow', testCategory: 'ToastMsg',
  },
  {
    testId: 'TS-106', description: 'Employee: Submit timesheet → verify toast says "submitted" or "approval"',
    action: 'toastSubmitMsg', enabled: 'TRUE', role: 'employee',
    mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '7', fridayHours: '7',
    testType: 'UIWorkflow', testCategory: 'ToastMsg',
  },
  {
    testId: 'TS-107', description: 'Manager: Approve timesheet → verify success toast',
    action: 'toastApproveMsg', enabled: 'TRUE', role: 'manager',
    approvalComments: 'All looks correct.',
    testType: 'UIWorkflow', testCategory: 'ToastMsg',
  },
  {
    testId: 'TS-108', description: 'Manager: Reject timesheet with reason → verify rejection toast',
    action: 'toastRejectMsg', enabled: 'TRUE', role: 'manager',
    rejectionReason: 'Project allocation appears incorrect. Please review.',
    testType: 'UIWorkflow', testCategory: 'ToastMsg',
  },
  {
    testId: 'TS-109', description: 'Manager: Reject dialog with no comment → Reject button is disabled',
    action: 'toastRejectNoCommentBlocked', enabled: 'TRUE', role: 'manager',
    testType: 'UIWorkflow', testCategory: 'ToastMsg',
  },

  // ─── MANAGER OWN TIMESHEET MULTI-ROW ────────────────────────────────────
  {
    testId: 'TS-110', description: 'Manager: Fill own timesheet with 2 rows → save as draft → verify toast',
    action: 'managerViewOwnMultiRow', enabled: 'TRUE', role: 'manager',
    taskCount: '2', mondayHours: '8', tuesdayHours: '8', wednesdayHours: '8', thursdayHours: '4', fridayHours: '4',
    testType: 'UIWorkflow', testCategory: 'Manager',
  },
];

// Merge (overwrite by testId to avoid duplication)
const existingIds = new Set(existingRows.map(r => r.testId));
const merged = [...existingRows];
for (const t of newTests) {
  if (existingIds.has(t.testId)) {
    const idx = merged.findIndex(r => r.testId === t.testId);
    merged[idx] = t;
  } else {
    merged.push(t);
  }
}

delete wb.Sheets[SHEET_NAME];
wb.SheetNames = wb.SheetNames.filter(n => n !== SHEET_NAME);
const ws = XLSX.utils.json_to_sheet(merged);
XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

// Update TestSummary
if (wb.SheetNames.includes('TestSummary')) {
  const summarySheet = wb.Sheets['TestSummary'];
  const summaryRows = XLSX.utils.sheet_to_json(summarySheet);
  const idx = summaryRows.findIndex(r => r.module === 'Timesheet');
  const entry = {
    module: 'Timesheet',
    totalTests: merged.length,
    enabledTests: merged.filter(t => t.enabled === 'TRUE').length,
    categories: [...new Set(merged.map(t => t.testCategory))].filter(Boolean).join(', '),
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  if (idx >= 0) summaryRows[idx] = entry; else summaryRows.push(entry);
  wb.Sheets['TestSummary'] = XLSX.utils.json_to_sheet(summaryRows);
}

XLSX.writeFile(wb, WORKBOOK_PATH);
console.log(`Total Timesheet tests now: ${merged.length} (added ${newTests.length} UI workflow tests)`);
console.log(`New IDs: ${newTests.map(t => t.testId).join(', ')}`);
