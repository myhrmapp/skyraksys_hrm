/**
 * Console.log Audit Script
 * Analyzes all console.log statements and categorizes by severity
 * 
 * Usage: node scripts/audit-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Auditing console.log statements...\n');

// Find all JavaScript files in backend and frontend only
const patterns = [
  'backend/**/*.js',
  'frontend/src/**/*.js'
];

console.log('Searching for files...');
const files = [];
patterns.forEach(pattern => {
  const found = glob.sync(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.venv/**']
  });
  console.log(`  Found ${found.length} files matching ${pattern}`);
  files.push(...found);
});

console.log(`\nAnalyzing ${files.length} files...`);

const results = [];
let fileCount = 0;

files.forEach(file => {
  fileCount++;
  if (fileCount % 50 === 0) {
    console.log(`  Processed ${fileCount}/${files.length} files...`);
  }
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('console.log')) {
      results.push({
        file,
        line: index + 1,
        code: line.trim(),
        category: categorize(line, file),
        isSafe: isSafe(line)
      });
    }
  });
});

console.log(`✅ Analysis complete!\n`);

function categorize(line, file) {
  const lower = line.toLowerCase();
  
  if (lower.includes('password') || lower.includes('token') || lower.includes('secret') || lower.includes('jwt')) {
    return 'CRITICAL_SECURITY';
  }
  if (lower.includes('salary') || lower.includes('payroll') || lower.includes('bank') || lower.includes('account')) {
    return 'SENSITIVE_DATA';
  }
  if (lower.includes('error') || lower.includes('err.') || lower.includes('catch')) {
    return 'ERROR_HANDLING';
  }
  if (line.includes('migration') || line.includes('seed') || file.includes('migration') || file.includes('seed')) {
    return 'SCRIPTS';
  }
  return 'DEBUG';
}

function isSafe(line) {
  // Safe if wrapped in development check or commented
  return line.includes('NODE_ENV') || 
         line.includes('development') || 
         line.trim().startsWith('//');
}

// Generate statistics
const stats = {
  total: results.length,
  bySeverity: {
    CRITICAL_SECURITY: results.filter(r => r.category === 'CRITICAL_SECURITY').length,
    SENSITIVE_DATA: results.filter(r => r.category === 'SENSITIVE_DATA').length,
    ERROR_HANDLING: results.filter(r => r.category === 'ERROR_HANDLING').length,
    DEBUG: results.filter(r => r.category === 'DEBUG').length,
    SCRIPTS: results.filter(r => r.category === 'SCRIPTS').length
  },
  safe: results.filter(r => r.isSafe).length,
  unsafe: results.filter(r => !r.isSafe).length
};

// Display summary
console.log('📊 AUDIT SUMMARY');
console.log('═'.repeat(60));
console.log(`Total console.log statements: ${stats.total}`);
console.log(`  ✅ Safe (wrapped in dev checks): ${stats.safe}`);
console.log(`  ⚠️  Unsafe (need attention): ${stats.unsafe}\n`);

console.log('BY SEVERITY:');
console.log(`  🔴 CRITICAL_SECURITY (passwords, tokens): ${stats.bySeverity.CRITICAL_SECURITY}`);
console.log(`  🟠 SENSITIVE_DATA (salary, payroll): ${stats.bySeverity.SENSITIVE_DATA}`);
console.log(`  🟡 ERROR_HANDLING (errors, exceptions): ${stats.bySeverity.ERROR_HANDLING}`);
console.log(`  🔵 DEBUG (general debug logs): ${stats.bySeverity.DEBUG}`);
console.log(`  ⚪ SCRIPTS (migrations, seeders): ${stats.bySeverity.SCRIPTS}\n`);

// Show critical security issues
const critical = results.filter(r => r.category === 'CRITICAL_SECURITY' && !r.isSafe);
if (critical.length > 0) {
  console.log('🚨 CRITICAL SECURITY ISSUES (MUST FIX IMMEDIATELY):');
  console.log('═'.repeat(60));
  critical.forEach((item, i) => {
    console.log(`${i + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.code}\n`);
  });
}

// Show sensitive data issues
const sensitive = results.filter(r => r.category === 'SENSITIVE_DATA' && !r.isSafe);
if (sensitive.length > 0) {
  console.log('⚠️  SENSITIVE DATA ISSUES (HIGH PRIORITY):');
  console.log('═'.repeat(60));
  sensitive.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.code}\n`);
  });
  if (sensitive.length > 10) {
    console.log(`   ... and ${sensitive.length - 10} more\n`);
  }
}

// Save detailed report
const reportPath = 'console-log-audit-report.json';
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats,
  results
}, null, 2));

console.log(`\n✅ Detailed report saved to: ${reportPath}`);
console.log('\nNEXT STEPS:');
console.log('1. Review critical security issues immediately');
console.log('2. Run: node scripts/remove-console-logs.js --dry-run');
console.log('3. Manually fix critical security logs');
console.log('4. Test after each change\n');
