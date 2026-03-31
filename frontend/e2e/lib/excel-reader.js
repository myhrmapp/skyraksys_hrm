/**
 * Excel Test Data Reader
 * Reads test cases from .xlsx workbooks and provides them to specs.
 *
 * Workbook convention:
 *   - Each sheet = one module (Login, Employee, Leave, etc.)
 *   - Row 1 = headers
 *   - Each subsequent row = one test case
 *   - Required columns: testId, description, action, enabled
 *   - Additional columns are module-specific data fields
 */

const path = require('path');
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK = path.join(__dirname, '..', 'fixtures', 'test-data.xlsx');

/**
 * Read all rows from a named sheet. Returns array of objects keyed by header.
 */
function readSheet(sheetName, workbookPath = DEFAULT_WORKBOOK) {
  const wb = XLSX.readFile(workbookPath);
  if (!wb.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`);
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  return rows;
}

/**
 * Read only enabled test cases from a sheet.
 * A row is enabled when its "enabled" column is truthy (TRUE, yes, 1, Y).
 */
function readEnabledTests(sheetName, workbookPath = DEFAULT_WORKBOOK) {
  const rows = readSheet(sheetName, workbookPath);
  return rows.filter((r) => {
    const val = String(r.enabled || '').trim().toLowerCase();
    return ['true', 'yes', '1', 'y'].includes(val);
  });
}

/**
 * List all sheet names in the workbook.
 */
function listSheets(workbookPath = DEFAULT_WORKBOOK) {
  const wb = XLSX.readFile(workbookPath);
  return wb.SheetNames;
}

/**
 * Group test rows by a column value (e.g., group by "action").
 */
function groupBy(rows, column) {
  return rows.reduce((acc, row) => {
    const key = row[column] || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

/**
 * Resolve prerequisite chain for a set of test IDs.
 * Each test row may have a "prerequisite" column with comma-separated testIds.
 * Returns an ordered array of test rows: prerequisites first, then requested tests,
 * preserving the original sheet order and avoiding duplicates.
 *
 * @param {Array} allRows - All rows from the sheet (enabled or not)
 * @param {string[]} requestedIds - The test IDs the user wants to run
 * @returns {Array} Ordered array of test rows including prerequisites
 */
function resolvePrerequisites(allRows, requestedIds) {
  const byId = new Map();
  for (const row of allRows) {
    if (row.testId) byId.set(row.testId, row);
  }

  // Collect all needed IDs (requested + transitive prerequisites)
  const needed = new Set();
  const stack = [...requestedIds];
  while (stack.length > 0) {
    const id = stack.pop();
    if (needed.has(id)) continue;
    needed.add(id);
    const row = byId.get(id);
    if (row && row.prerequisite) {
      const prereqs = String(row.prerequisite).split(',').map(s => s.trim()).filter(Boolean);
      for (const p of prereqs) {
        if (!needed.has(p)) stack.push(p);
      }
    }
  }

  // Return rows in original sheet order, filtering to only needed IDs
  return allRows.filter(r => needed.has(r.testId));
}

/**
 * Read specific tests by IDs, automatically including prerequisite tests.
 * If no IDs provided, falls back to readEnabledTests behavior.
 *
 * @param {string} sheetName - Sheet name in workbook
 * @param {string[]} testIds - Array of test IDs to run (e.g. ['EMP-042', 'EMP-043'])
 * @param {string} workbookPath - Path to workbook
 * @returns {Array} Ordered test rows including prerequisites
 */
function readTestsByIds(sheetName, testIds, workbookPath = DEFAULT_WORKBOOK) {
  if (!testIds || testIds.length === 0) {
    return readEnabledTests(sheetName, workbookPath);
  }
  const allRows = readSheet(sheetName, workbookPath);
  return resolvePrerequisites(allRows, testIds);
}

/**
 * Get the selected test rows for a sheet, respecting TEST_IDS env var.
 * Usage: TEST_IDS=EMP-042,EMP-043 npx playwright test ...
 * When TEST_IDS is set, runs those tests + their prerequisites (ignoring enabled flag).
 * When TEST_IDS is not set, runs all enabled tests.
 */
function getSelectedTests(sheetName, workbookPath = DEFAULT_WORKBOOK) {
  const envIds = process.env.TEST_IDS;
  if (envIds) {
    const ids = envIds.split(',').map(s => s.trim()).filter(Boolean);
    return readTestsByIds(sheetName, ids, workbookPath);
  }
  return readEnabledTests(sheetName, workbookPath);
}

class ExcelReader {
  constructor(workbookPath = DEFAULT_WORKBOOK) {
    this.workbookPath = workbookPath;
  }
  readSheet(sheetName) { return readSheet(sheetName, this.workbookPath); }
  readEnabledTests(sheetName) { return readEnabledTests(sheetName, this.workbookPath); }
  readTestsByIds(sheetName, testIds) { return readTestsByIds(sheetName, testIds, this.workbookPath); }
  getSelectedTests(sheetName) { return getSelectedTests(sheetName, this.workbookPath); }
  resolvePrerequisites(allRows, testIds) { return resolvePrerequisites(allRows, testIds); }
  listSheets() { return listSheets(this.workbookPath); }
  groupBy(rows, column) { return groupBy(rows, column); }
}

module.exports = { readSheet, readEnabledTests, readTestsByIds, getSelectedTests, resolvePrerequisites, listSheets, groupBy, ExcelReader };
