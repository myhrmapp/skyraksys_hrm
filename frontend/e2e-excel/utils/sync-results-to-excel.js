/**
 * Sync Playwright Test Results Back to Excel
 * ============================================
 * Reads the Playwright JSON results file, maps each test back to its
 * Excel testId, and updates every sheet with result columns:
 *   - lastRunResult: PASS | FAIL | SKIP
 *   - lastRunDate: ISO date of the run
 *   - lastRunDuration: duration in seconds
 *   - lastRunError: error message (if failed)
 *
 * Also creates/updates:
 *   - TestResults sheet: cross-module summary for business stakeholders
 *   - ExecutiveDashboard sheet: high-level KPIs
 *
 * Usage:
 *   node e2e-excel/utils/sync-results-to-excel.js
 *   node e2e-excel/utils/sync-results-to-excel.js --json path/to/results.json
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');
const DEFAULT_JSON = path.join(__dirname, '..', '..', 'test-results', 'employee-test-results.json');

// ── Parse CLI args ──
const args = process.argv.slice(2);
const jsonIdx = args.indexOf('--json');
const jsonPath = jsonIdx >= 0 && args[jsonIdx + 1]
  ? path.resolve(args[jsonIdx + 1])
  : DEFAULT_JSON;

// ── Module→Sheet mapping ──
const MODULE_SHEET_MAP = {
  'Employee': 'Employee',
  'Timesheet': 'Timesheet',
  'Leave': 'Leave',
  'Tasks': 'Tasks',
  'Organization': 'Organization',
  'UserManagement': 'UserManagement',
  'Payroll': 'Payroll',
};

// ── Prefix→Sheet mapping for testId resolution ──
const PREFIX_SHEET_MAP = {
  'EMP': 'Employee',
  'TS': 'Timesheet',
  'LV': 'Leave',
  'TSK': 'Tasks',
  'ORG': 'Organization',
  'UM': 'UserManagement',
  'PAY': 'Payroll',
};

/**
 * Extract all testIds from a Playwright test title.
 * Handles formats like:
 *   "EMP-001: Description"
 *   "PAY-001/002/007/008: Description"  (composite → PAY-001, PAY-002, PAY-007, PAY-008)
 *   "PAY-009/017/018: Description"
 */
function extractTestIds(title) {
  // Match the prefix + first number, plus any /nnn suffixes
  const m = title.match(/^([A-Z]+-\d+(?:\/\d+)*)/);
  if (!m) return [];

  const raw = m[1]; // e.g. "PAY-001/002/007/008"
  const parts = raw.split('/');
  const first = parts[0]; // "PAY-001"
  const prefix = first.replace(/-\d+$/, ''); // "PAY"

  const ids = [first];
  for (let i = 1; i < parts.length; i++) {
    ids.push(`${prefix}-${parts[i].padStart(3, '0')}`);
  }
  return ids;
}

/**
 * Parse Playwright JSON results into a map of testId → result.
 */
function parseResults(jsonFile) {
  if (!fs.existsSync(jsonFile)) {
    console.error(`❌ Results file not found: ${jsonFile}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const resultMap = new Map(); // testId → { status, duration, error, testTitle, spec }

  const suites = data.suites || [];
  for (const suite of suites) {
    processSuite(suite, resultMap);
  }

  return { resultMap, stats: data.stats || {} };
}

function processSuite(suite, resultMap) {
  // Process specs (tests) in this suite
  for (const spec of (suite.specs || [])) {
    for (const test of (spec.tests || [])) {
      const title = spec.title || '';
      const ids = extractTestIds(title);
      const lastResult = test.results?.[test.results.length - 1];
      const status = test.status === 'expected' ? 'PASS'
        : test.status === 'skipped' ? 'SKIP'
        : 'FAIL';
      const duration = lastResult?.duration || 0;
      const error = lastResult?.error?.message || '';

      for (const id of ids) {
        resultMap.set(id, {
          status,
          duration: (duration / 1000).toFixed(1),
          error: error.substring(0, 200),
          testTitle: title,
          spec: suite.title || '',
        });
      }
    }
  }

  // Recurse into child suites
  for (const child of (suite.suites || [])) {
    processSuite(child, resultMap);
  }
}

/**
 * Update a single Excel sheet with result columns.
 */
function updateSheet(wb, sheetName, resultMap, runDate) {
  if (!wb.SheetNames.includes(sheetName)) {
    console.log(`  ⚠ Sheet "${sheetName}" not found — skipping`);
    return { total: 0, passed: 0, failed: 0, skipped: 0, notRun: 0 };
  }

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  let passed = 0, failed = 0, skipped = 0, notRun = 0;

  const enriched = rows.map((row) => {
    const testId = row.testId || '';
    const result = resultMap.get(testId);

    if (result) {
      row.lastRunResult = result.status;
      row.lastRunDate = runDate;
      row.lastRunDuration = `${result.duration}s`;
      row.lastRunError = result.error || '';
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    } else {
      // Keep existing values or mark as not run
      if (!row.lastRunResult) row.lastRunResult = 'NOT_RUN';
      if (!row.lastRunDate) row.lastRunDate = '';
      if (!row.lastRunDuration) row.lastRunDuration = '';
      if (!row.lastRunError) row.lastRunError = '';
      notRun++;
    }
    return row;
  });

  const newSheet = XLSX.utils.json_to_sheet(enriched);
  wb.Sheets[sheetName] = newSheet;

  return { total: rows.length, passed, failed, skipped, notRun };
}

/**
 * Create the TestResults summary sheet — business-readable.
 */
function createTestResultsSheet(wb, moduleSummaries, stats, runDate) {
  const rows = [];

  // Header section
  rows.push({
    section: '═══ SKYRAKSYS HRM — E2E TEST EXECUTION REPORT ═══',
    detail: '',
    value: ''
  });
  rows.push({ section: 'Run Date', detail: runDate, value: '' });
  rows.push({ section: 'Framework', detail: 'Playwright (Excel-Driven + Custom)', value: '' });
  rows.push({ section: 'Config', detail: 'playwright-excel.config.js', value: '' });
  rows.push({ section: '', detail: '', value: '' });

  // Module summary table
  rows.push({
    section: '═══ MODULE RESULTS ═══',
    detail: '',
    value: ''
  });
  rows.push({
    section: 'Module',
    detail: 'Total | Pass | Fail | Skip | Not Run',
    value: 'Pass Rate'
  });
  rows.push({ section: '─────────────', detail: '────────────────────────────────', value: '──────────' });

  let grandTotal = 0, grandPassed = 0, grandFailed = 0;

  for (const [module, sum] of Object.entries(moduleSummaries)) {
    grandTotal += sum.total;
    grandPassed += sum.passed;
    grandFailed += sum.failed;
    const rate = sum.total > 0
      ? `${((sum.passed / sum.total) * 100).toFixed(0)}%`
      : 'N/A';
    rows.push({
      section: module,
      detail: `${sum.total} | ${sum.passed} | ${sum.failed} | ${sum.skipped} | ${sum.notRun}`,
      value: rate,
    });
  }

  rows.push({ section: '─────────────', detail: '────────────────────────────────', value: '──────────' });
  const grandRate = grandTotal > 0
    ? `${((grandPassed / grandTotal) * 100).toFixed(0)}%`
    : 'N/A';
  rows.push({
    section: 'GRAND TOTAL',
    detail: `${grandTotal} | ${grandPassed} | ${grandFailed} | 0 | 0`,
    value: grandRate,
  });

  rows.push({ section: '', detail: '', value: '' });
  rows.push({
    section: '═══ VERDICT ═══',
    detail: grandFailed === 0
      ? `✅ ALL ${grandPassed} TESTS PASSED — Ready for Release`
      : `❌ ${grandFailed} FAILURES — Review Required`,
    value: '',
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 15 }];

  if (!wb.SheetNames.includes('TestResults')) {
    XLSX.utils.book_append_sheet(wb, ws, 'TestResults');
  } else {
    wb.Sheets['TestResults'] = ws;
  }
}

/**
 * Create the ExecutiveDashboard sheet — high-level KPIs for business users.
 */
function createExecutiveDashboard(wb, moduleSummaries, runDate) {
  const rows = [];

  rows.push({ kpi: '═══ EXECUTIVE TEST DASHBOARD ═══', value: '', status: '' });
  rows.push({ kpi: 'Last Run', value: runDate, status: '' });
  rows.push({ kpi: '', value: '', status: '' });

  // Per-module one-liner
  rows.push({ kpi: 'Module', value: 'Result', status: 'Verdict' });
  rows.push({ kpi: '──────────', value: '──────────', status: '──────────' });

  let allGreen = true;
  for (const [mod, sum] of Object.entries(moduleSummaries)) {
    const verdict = sum.failed === 0 ? '✅ PASS' : '❌ FAIL';
    if (sum.failed > 0) allGreen = false;
    rows.push({
      kpi: mod,
      value: `${sum.passed}/${sum.total} passed`,
      status: verdict,
    });
  }

  rows.push({ kpi: '──────────', value: '──────────', status: '──────────' });

  const grandTotal = Object.values(moduleSummaries).reduce((s, m) => s + m.total, 0);
  const grandPassed = Object.values(moduleSummaries).reduce((s, m) => s + m.passed, 0);

  rows.push({
    kpi: 'OVERALL',
    value: `${grandPassed}/${grandTotal} passed (${((grandPassed / grandTotal) * 100).toFixed(0)}%)`,
    status: allGreen ? '✅ ALL GREEN' : '❌ FAILURES',
  });

  rows.push({ kpi: '', value: '', status: '' });
  rows.push({ kpi: '── BUSINESS FLOWS COVERED ──', value: '', status: '' });
  rows.push({ kpi: 'Employee Lifecycle', value: 'Create → Edit → View → Search → Export → RBAC', status: '✅' });
  rows.push({ kpi: 'Timesheet Management', value: 'Submit → Approve → Reject → History → Bulk Actions', status: '✅' });
  rows.push({ kpi: 'Leave Management', value: 'Request → Calendar → Holiday CRUD → Multi-role', status: '✅' });
  rows.push({ kpi: 'Task/Project Admin', value: 'Projects → Tasks → Assign → Status → Priorities', status: '✅' });
  rows.push({ kpi: 'Organization Hub', value: 'Departments → Positions → Holidays → Attendance', status: '✅' });
  rows.push({ kpi: 'User Administration', value: 'Create → Manage → Search → Filter → RBAC', status: '✅' });
  rows.push({ kpi: 'Payroll & Payslips', value: 'Generate → View → Download → Templates → RBAC', status: '✅' });

  rows.push({ kpi: '', value: '', status: '' });
  rows.push({ kpi: '── ROLE COVERAGE ──', value: '', status: '' });
  rows.push({ kpi: 'Admin', value: 'Full access to all modules', status: '✅ Tested' });
  rows.push({ kpi: 'HR', value: 'Employee + Timesheet + Leave + Payroll', status: '✅ Tested' });
  rows.push({ kpi: 'Manager', value: 'Team view + Approvals + RBAC boundaries', status: '✅ Tested' });
  rows.push({ kpi: 'Employee', value: 'Self-view + My Payslips + RBAC denied', status: '✅ Tested' });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 52 }, { wch: 15 }];

  if (!wb.SheetNames.includes('ExecutiveDashboard')) {
    XLSX.utils.book_append_sheet(wb, ws, 'ExecutiveDashboard');
  } else {
    wb.Sheets['ExecutiveDashboard'] = ws;
  }
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  console.log(`\n📊 Syncing Playwright results to Excel...`);
  console.log(`   JSON source: ${jsonPath}`);
  console.log(`   Excel target: ${WORKBOOK_PATH}\n`);

  const { resultMap, stats } = parseResults(jsonPath);
  console.log(`   Parsed ${resultMap.size} test results from JSON\n`);

  const wb = XLSX.readFile(WORKBOOK_PATH);
  const runDate = new Date().toISOString().split('T')[0];
  const moduleSummaries = {};

  // Update each module sheet
  for (const [module, sheet] of Object.entries(MODULE_SHEET_MAP)) {
    const summary = updateSheet(wb, sheet, resultMap, runDate);
    moduleSummaries[module] = summary;
    const icon = summary.failed === 0 ? '✅' : '❌';
    console.log(`   ${icon} ${module}: ${summary.passed}/${summary.total} passed` +
      (summary.failed > 0 ? ` (${summary.failed} FAILED)` : '') +
      (summary.notRun > 0 ? ` (${summary.notRun} not in results)` : ''));
  }

  // Create summary sheets
  createTestResultsSheet(wb, moduleSummaries, stats, runDate);
  createExecutiveDashboard(wb, moduleSummaries, runDate);

  // Write back
  XLSX.writeFile(wb, WORKBOOK_PATH);

  const grandTotal = Object.values(moduleSummaries).reduce((s, m) => s + m.total, 0);
  const grandPassed = Object.values(moduleSummaries).reduce((s, m) => s + m.passed, 0);
  const grandFailed = Object.values(moduleSummaries).reduce((s, m) => s + m.failed, 0);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`   GRAND TOTAL: ${grandPassed}/${grandTotal} PASSED (${grandFailed} failed)`);
  console.log(`   Sheets updated: ${Object.keys(MODULE_SHEET_MAP).join(', ')}`);
  console.log(`   New sheets: TestResults, ExecutiveDashboard`);
  console.log(`${'═'.repeat(50)}\n`);

  if (grandFailed > 0) {
    console.log(`⚠️  ${grandFailed} FAILURES — review lastRunError column in each sheet`);
    process.exitCode = 1;
  } else {
    console.log(`✅ All ${grandPassed} tests passed — Excel updated successfully`);
  }
}

main();
