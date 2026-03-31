/**
 * Run all 9 new route coverage specs and report results.
 * Usage: node e2e-excel/utils/run-new-specs.js
 */
const { execSync } = require('child_process');
const path = require('path');

const specs = [
  'forgot-password',
  'performance-dashboard',
  'leave-accrual',
  'leave-types',
  'employee-records',
  'reports',
  'restore-management',
  'settings-hub',
  'my-profile',
];

const results = [];

for (const spec of specs) {
  const specFile = `e2e-excel/specs/${spec}.spec.js`;
  process.stdout.write(`Running ${spec}... `);
  try {
    const output = execSync(
      `npx playwright test --config=playwright-excel.config.js ${specFile} --reporter=list`,
      { cwd: path.join(__dirname, '..', '..'), timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const stderr = output || '';
    const passMatch = stderr.match(/(\d+) passed/);
    const failMatch = stderr.match(/(\d+) failed/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    results.push({ spec, passed, failed, status: failed === 0 ? 'PASS' : 'PARTIAL' });
    console.log(`${passed} passed, ${failed} failed`);
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    results.push({ spec, passed, failed, status: 'FAIL' });
    console.log(`${passed} passed, ${failed} failed (exit code: ${err.status})`);
  }
}

console.log('\n=== SUMMARY ===');
let totalPassed = 0, totalFailed = 0;
for (const r of results) {
  totalPassed += r.passed;
  totalFailed += r.failed;
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.spec}: ${r.passed}/${r.passed + r.failed}`);
}
console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed out of ${totalPassed + totalFailed}`);
