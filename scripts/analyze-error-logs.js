/**
 * Analyze ERROR_HANDLING console.log statements
 * Groups by file and shows replacement strategy
 */

const fs = require('fs');
const path = require('path');

const auditFile = path.join(__dirname, '..', 'console-log-audit-report.json');
const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));

// Filter ERROR_HANDLING entries
const errorLogs = audit.results.filter(r => r.category === 'ERROR_HANDLING');

// Group by file
const byFile = {};
errorLogs.forEach(log => {
  if (!byFile[log.file]) {
    byFile[log.file] = [];
  }
  byFile[log.file].push(log);
});

console.log('📊 ERROR_HANDLING Console.log Analysis\n');
console.log(`Total: ${errorLogs.length} instances across ${Object.keys(byFile).length} files\n`);

// Sort by count descending
const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);

console.log('Top 20 Files by Error Log Count:\n');
sorted.slice(0, 20).forEach(([file, logs], idx) => {
  console.log(`${idx + 1}. ${file.replace(/^backend\//, '')} (${logs.length} errors)`);
  logs.slice(0, 3).forEach(log => {
    console.log(`   Line ${log.line}: ${log.code.substring(0, 60)}...`);
  });
  if (logs.length > 3) {
    console.log(`   ... and ${logs.length - 3} more`);
  }
  console.log('');
});

// Generate fix script suggestions
console.log('\n💡 Recommended Fix Strategy:\n');
console.log('1. Controllers (24 files, ~80 errors):');
console.log('   Replace: console.log(error) → logger.error()');
console.log('   Replace: console.error() → logger.error()');
console.log('');
console.log('2. Routes (8 files, ~20 errors):');
console.log('   Replace: console.log(err) → logger.error()');
console.log('');
console.log('3. Models/Utils (~14 errors):');
console.log('   Add logger import, replace console.error()');

// Save detailed report
const detailedReport = {
  summary: {
    total: errorLogs.length,
    files: Object.keys(byFile).length,
    topFiles: sorted.slice(0, 10).map(([file, logs]) => ({
      file,
      count: logs.length
    }))
  },
  byFile: Object.fromEntries(
    sorted.map(([file, logs]) => [
      file,
      logs.map(l => ({ line: l.line, code: l.code }))
    ])
  )
};

fs.writeFileSync(
  path.join(__dirname, '..', 'error-logs-detailed.json'),
  JSON.stringify(detailedReport, null, 2)
);

console.log('\n✅ Detailed report saved to: error-logs-detailed.json');
