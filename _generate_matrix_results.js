/**
 * Reads Playwright JSON results and updates the Test Matrix spreadsheet
 * with PASS/FAIL status, duration, and error details per test case.
 *
 * Also creates a dedicated "E2E Results" summary sheet.
 *
 * Usage: node _generate_matrix_results.js [json-file]
 * Default json-file: frontend/matrix-full-results.json
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const JSON_FILE = process.argv[2] || path.join(__dirname, 'frontend', 'matrix-full-results.json');
const MATRIX_FILE = path.join(__dirname, 'docs', 'SkyrakSys_HRM_Test_Matrix.xlsx');
const OUTPUT_FILE = path.join(__dirname, 'docs', 'SkyrakSys_HRM_Test_Matrix_Results.xlsx');

// mapping: spec file name → sheet name in the matrix workbook  
const SPEC_TO_SHEET = {
  'matrix-auth.spec.js':       'Auth & Session',
  'matrix-dashboard.spec.js':  'Dashboard',
  'matrix-employee.spec.js':   'Employee Management',
  'matrix-leave.spec.js':      'Leave Management',
  'matrix-timesheet.spec.js':  'Timesheet & Attendance',
  'matrix-payroll.spec.js':    'Payroll & Compensation',
  'matrix-org.spec.js':        'Org & Projects',
  'matrix-reviews.spec.js':    'Reviews & Performance',
  'matrix-system.spec.js':     'Reports & System',
  'matrix-rbac.spec.js':       'RBAC & Negative',
  'matrix-workflows.spec.js':  'Cross-Role Workflows',
};

const COLORS = {
  passBg: 'FF00B050',
  passBgLight: 'FFD4EDDA',
  failBg: 'FFFF0000',
  failBgLight: 'FFF8D7DA',
  skipBg: 'FFFFC000',
  skipBgLight: 'FFFFF3CD',
  headerBg: 'FF1A3C6E',
  headerFg: 'FFFFFFFF',
  summaryHeaderBg: 'FF2E5090',
  white: 'FFFFFFFF',
};

// ───────────────────────────────────────────────────────────────
// Parse Playwright JSON results
// ───────────────────────────────────────────────────────────────
function parseResults(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const report = JSON.parse(raw);

  // Collect all test results keyed by specFile → TC number
  //  { 'matrix-auth.spec.js': { '001': { status, duration, error }, ... } }
  const results = {};
  const stats = { total: 0, passed: 0, failed: 0, skipped: 0 };

  function walkSuite(suite) {
    const file = suite.file ? path.basename(suite.file) : null;

    if (suite.specs) {
      for (const spec of suite.specs) {
        // Extract TC number from title like "TC-001: Successful login..."
        const tcMatch = spec.title.match(/TC-(\d{3})/);
        if (!tcMatch) continue;

        const tcNum = tcMatch[1];
        const specFile = file || 'unknown';

        if (!results[specFile]) results[specFile] = {};

        // Get the first test result (we run 1 project, so there's 1 test per spec)
        const test = spec.tests && spec.tests[0];
        if (!test) {
          results[specFile][tcNum] = { status: 'SKIP', duration: 0, error: 'No test execution' };
          stats.skipped++;
          stats.total++;
          continue;
        }

        const result = test.results && test.results[test.results.length - 1]; // last retry
        const status = test.status === 'expected' ? 'PASS' :
                       test.status === 'skipped' ? 'SKIP' : 'FAIL';

        let error = '';
        if (status === 'FAIL' && result && result.error) {
          // Extract just the message, not the full stack
          const msgMatch = result.error.message ?
            result.error.message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '').substring(0, 200) :
            'Unknown error';
          error = msgMatch;
        }

        results[specFile][tcNum] = {
          status,
          duration: result ? result.duration : 0,
          error,
        };

        stats.total++;
        if (status === 'PASS') stats.passed++;
        else if (status === 'FAIL') stats.failed++;
        else stats.skipped++;
      }
    }

    if (suite.suites) {
      for (const child of suite.suites) {
        // Inherit file from parent if child doesn't have it
        if (!child.file && file) child.file = file;
        walkSuite(child);
      }
    }
  }

  // Top-level suites
  if (report.suites) {
    for (const suite of report.suites) {
      walkSuite(suite);
    }
  }

  return { results, stats, report };
}

// ───────────────────────────────────────────────────────────────
// Update the matrix workbook with results
// ───────────────────────────────────────────────────────────────
async function updateMatrix(results, stats, report) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(MATRIX_FILE);

  // For each spec file, update the corresponding sheet
  for (const [specFile, sheetName] of Object.entries(SPEC_TO_SHEET)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) {
      console.warn(`⚠ Sheet "${sheetName}" not found in workbook`);
      continue;
    }

    const tcResults = results[specFile] || {};

    // Find "TC #" column and "Status" column  
    const headerRow = ws.getRow(1);
    let tcCol = -1, statusCol = -1, notesCol = -1;
    for (let c = 1; c <= 20; c++) {
      const val = String(headerRow.getCell(c).value || '').toLowerCase().trim();
      if (val === 'tc #' || val === 'tc') tcCol = c;
      if (val === 'status') statusCol = c;
      if (val.includes('notes') || val.includes('defect')) notesCol = c;
    }

    if (tcCol === -1 || statusCol === -1) {
      console.warn(`⚠ Cannot find TC#/Status columns in "${sheetName}" (tc=${tcCol}, status=${statusCol})`);
      continue;
    }

    // Walk rows looking for TC numbers (format: "TC-001" or just "1", "2", etc.)
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const tcCellVal = String(row.getCell(tcCol).value || '').trim();

      // Match TC number — could be "TC-001", "1", "001", etc.
      let tcNum = null;
      const fullMatch = tcCellVal.match(/TC-?(\d{1,3})/i);
      if (fullMatch) {
        tcNum = fullMatch[1].padStart(3, '0');
      } else if (/^\d{1,3}$/.test(tcCellVal)) {
        tcNum = tcCellVal.padStart(3, '0');
      }

      if (!tcNum || !tcResults[tcNum]) continue;

      const res = tcResults[tcNum];

      // Update Status column
      const statusCell = row.getCell(statusCol);
      statusCell.value = res.status;
      statusCell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (res.status === 'PASS') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
      } else if (res.status === 'FAIL') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBg } };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.skipBg } };
        statusCell.font.color = { argb: 'FF000000' };
      }

      // Update Notes column with duration + error
      if (notesCol !== -1) {
        const durationStr = `${(res.duration / 1000).toFixed(1)}s`;
        const noteText = res.error ? `[${durationStr}] ${res.error}` : `[${durationStr}] ✓`;
        row.getCell(notesCol).value = noteText;
        row.getCell(notesCol).font = { size: 8, color: { argb: res.error ? 'FFCC0000' : 'FF006600' } };
      }
    }

    const matched = Object.keys(tcResults).length;
    console.log(`✅ ${sheetName}: ${matched} test results applied`);
  }

  // ─── Create E2E Results Summary Sheet ───
  createResultsSummarySheet(wb, results, stats, report);

  await wb.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\n📊 Results written to: ${OUTPUT_FILE}`);
}

function createResultsSummarySheet(wb, results, stats, report) {
  // Remove if exists
  const existing = wb.getWorksheet('E2E Automation Results');
  if (existing) wb.removeWorksheet(existing.id);

  const ws = wb.addWorksheet('E2E Automation Results', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    properties: { tabColor: { argb: 'FF00B050' } }
  });

  // Summary columns
  ws.columns = [
    { header: '#', key: 'num', width: 6 },
    { header: 'Spec File', key: 'specFile', width: 30 },
    { header: 'Sheet', key: 'sheet', width: 24 },
    { header: 'TC #', key: 'tc', width: 10 },
    { header: 'Test Title', key: 'title', width: 55 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Duration', key: 'duration', width: 12 },
    { header: 'Error', key: 'error', width: 60 },
  ];

  // Header style
  const hr = ws.getRow(1);
  hr.height = 26;
  for (let c = 1; c <= 8; c++) {
    const cell = hr.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.headerFg }, size: 10, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium' } };
  }

  // Insert summary stats row
  const summaryRow = ws.addRow({
    num: '', specFile: 'TOTALS',
    sheet: `Passed: ${stats.passed}`,
    tc: `Failed: ${stats.failed}`,
    title: `Skipped: ${stats.skipped}`,
    status: `${stats.total} total`,
    duration: report.stats ? `${(report.stats.duration / 1000).toFixed(1)}s` : '',
    error: `Pass Rate: ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%`
  });
  summaryRow.height = 22;
  for (let c = 1; c <= 8; c++) {
    const cell = summaryRow.getCell(c);
    cell.font = { bold: true, size: 10, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryHeaderBg } };
    cell.font.color = { argb: COLORS.white };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin' } };
  }

  // Enumerate all tests from JSON
  let num = 0;
  function walkForResults(suite, file) {
    file = suite.file ? path.basename(suite.file) : file;

    if (suite.specs) {
      for (const spec of suite.specs) {
        const test = spec.tests && spec.tests[0];
        const result = test && test.results && test.results[test.results.length - 1];
        const status = test ?
          (test.status === 'expected' ? 'PASS' : test.status === 'skipped' ? 'SKIP' : 'FAIL') :
          'SKIP';

        let error = '';
        if (status === 'FAIL' && result && result.error && result.error.message) {
          error = result.error.message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '').substring(0, 250);
        }

        const tcMatch = spec.title.match(/TC-(\d{3})/);
        num++;

        const row = ws.addRow({
          num,
          specFile: file || 'unknown',
          sheet: SPEC_TO_SHEET[file] || 'Unknown',
          tc: tcMatch ? `TC-${tcMatch[1]}` : '',
          title: spec.title.substring(0, 120),
          status,
          duration: result ? `${(result.duration / 1000).toFixed(1)}s` : '-',
          error: error || '',
        });

        // Color the status cell
        const statusCell = row.getCell(6);
        if (status === 'PASS') {
          statusCell.font = { bold: true, color: { argb: 'FF006600' }, size: 9 };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBgLight } };
          row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBgLight } };
        } else if (status === 'FAIL') {
          statusCell.font = { bold: true, color: { argb: 'FFCC0000' }, size: 9 };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBgLight } };
          row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBgLight } };
          row.getCell(8).font = { size: 8, color: { argb: 'FFCC0000' } };
        } else {
          statusCell.font = { bold: true, color: { argb: 'FF806600' }, size: 9 };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.skipBgLight } };
        }

        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
          row.getCell(c).alignment = { vertical: 'top', wrapText: true };
        }
      }
    }

    if (suite.suites) {
      for (const child of suite.suites) {
        walkForResults(child, file);
      }
    }
  }

  if (report.suites) {
    for (const suite of report.suites) {
      walkForResults(suite, null);
    }
  }

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: `H${ws.rowCount}` };
}

// ───────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────
(async () => {
  console.log(`📂 Reading JSON results from: ${JSON_FILE}`);

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ JSON file not found: ${JSON_FILE}`);
    process.exit(1);
  }

  if (!fs.existsSync(MATRIX_FILE)) {
    console.error(`❌ Matrix file not found: ${MATRIX_FILE}`);
    process.exit(1);
  }

  const { results, stats, report } = parseResults(JSON_FILE);
  console.log(`\n📊 Test Results Summary:`);
  console.log(`   Total:   ${stats.total}`);
  console.log(`   Passed:  ${stats.passed}`);
  console.log(`   Failed:  ${stats.failed}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Rate:    ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%\n`);

  await updateMatrix(results, stats, report);
})();
