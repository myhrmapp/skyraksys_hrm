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

class ExcelReader {
  constructor(workbookPath = DEFAULT_WORKBOOK) {
    this.workbookPath = workbookPath;
  }
  readSheet(sheetName) { return readSheet(sheetName, this.workbookPath); }
  readEnabledTests(sheetName) { return readEnabledTests(sheetName, this.workbookPath); }
  listSheets() { return listSheets(this.workbookPath); }
  groupBy(rows, column) { return groupBy(rows, column); }
}

module.exports = { readSheet, readEnabledTests, listSheets, groupBy, ExcelReader };
