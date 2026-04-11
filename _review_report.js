const ExcelJS = require('exceljs');
async function review() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('docs/Bug_Fix_Report_09-04-26.xlsx');
  const ws1 = wb.getWorksheet('Bug Fix Report');
  console.log('=== SHEET 1: Bug Fix Report ===');
  console.log('Total rows:', ws1.rowCount);
  ws1.eachRow((row, n) => {
    const vals = [];
    for (let c = 1; c <= 10; c++) vals.push(String(row.getCell(c).value || '').substring(0, 70));
    console.log('R' + n + ': ' + vals.join(' | '));
  });
  const ws2 = wb.getWorksheet('Files Changed');
  console.log('\n=== SHEET 2: Files Changed ===');
  ws2.eachRow((row, n) => {
    const vals = [];
    for (let c = 1; c <= 3; c++) vals.push(String(row.getCell(c).value || '').substring(0, 75));
    console.log('R' + n + ': ' + vals.join(' | '));
  });
}
review().catch(e => console.error(e));
