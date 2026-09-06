/**
 * Separate production vs test ERROR_HANDLING console.log
 */

const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'error-logs-detailed.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Categorize files
const production = {};
const tests = {};
const scripts = {};

Object.entries(report.byFile).forEach(([file, logs]) => {
  if (file.includes('/tests/') || file.includes('/test/')) {
    tests[file] = logs;
  } else if (file.includes('/scripts/') || file.includes('/migrations/')) {
    scripts[file] = logs;
  } else {
    production[file] = logs;
  }
});

const prodCount = Object.values(production).reduce((sum, logs) => sum + logs.length, 0);
const testCount = Object.values(tests).reduce((sum, logs) => sum + logs.length, 0);
const scriptCount = Object.values(scripts).reduce((sum, logs) => sum + logs.length, 0);

console.log('📊 ERROR_HANDLING Console.log Breakdown\n');
console.log(`Total: 114 instances`);
console.log(`  🏭 Production code:  ${prodCount} (${Math.round(prodCount/114*100)}%)`);
console.log(`  🧪 Test files:       ${testCount} (${Math.round(testCount/114*100)}%)`);
console.log(`  📜 Scripts:          ${scriptCount} (${Math.round(scriptCount/114*100)}%)`);
console.log('');

console.log('🎯 PRODUCTION CODE TO FIX:\n');
const prodSorted = Object.entries(production).sort((a, b) => b[1].length - a[1].length);

if (prodSorted.length === 0) {
  console.log('   ✅ No production error logs found! All are in tests/scripts.');
} else {
  prodSorted.forEach(([file, logs]) => {
    console.log(`📁 ${file.replace('backend/', '')} (${logs.length})`);
    logs.forEach((log, idx) => {
      const shortCode = log.code.length > 70 ? log.code.substring(0, 70) + '...' : log.code;
      console.log(`   ${idx+1}. Line ${log.line}: ${shortCode}`);
    });
    console.log('');
  });
}

console.log('\n💡 RECOMMENDATION:\n');
if (prodCount === 0) {
  console.log('✅ No production code needs fixing!');
  console.log('   Test files can keep console.log for debugging output.');
  console.log('   Scripts can keep console.log for CLI output.');
} else {
  console.log(`Fix ${prodCount} production errors in ${prodSorted.length} files.`);
  console.log('Replace console.log/console.error with logger.error()');
}

// Save production-only list
fs.writeFileSync(
  path.join(__dirname, '..', 'production-error-logs.json'),
  JSON.stringify({ production, count: prodCount, files: prodSorted.length }, null, 2)
);

console.log('\n✅ Production errors saved to: production-error-logs.json');
