const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.join(__dirname, '..', 'fixtures', 'test-data.xlsx'));

['Leave', 'Tasks', 'Organization'].forEach(sheet => {
  console.log(`\n=== ${sheet} Sheet ===`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });
  if (rows.length > 0) {
    console.log('Headers:', Object.keys(rows[0]).join(', '));
    rows.forEach(r => console.log(JSON.stringify(r)));
  } else {
    console.log('(empty)');
  }
});
