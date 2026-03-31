const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.join(__dirname, '..', 'fixtures', 'test-data.xlsx'));

console.log('=== Tasks Sheet Headers ===');
const taskRows = XLSX.utils.sheet_to_json(wb.Sheets['Tasks'], { defval: '' });
console.log('Headers:', Object.keys(taskRows[taskRows.length - 1]).join(', '));
console.log('TSK-013:', JSON.stringify(taskRows.find(r => r.testId === 'TSK-013')));
console.log('TSK-016:', JSON.stringify(taskRows.find(r => r.testId === 'TSK-016')));

console.log('\n=== Leave Sheet - LV-021 ===');
const leaveRows = XLSX.utils.sheet_to_json(wb.Sheets['Leave'], { defval: '' });
console.log('Headers:', Object.keys(leaveRows[leaveRows.length - 1]).join(', '));
console.log('LV-021:', JSON.stringify(leaveRows.find(r => r.testId === 'LV-021')));
