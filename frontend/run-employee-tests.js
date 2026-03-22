const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const cwd = path.resolve(__dirname);
const outFile = path.join(cwd, 'employee-results-clean.txt');

try {
  const result = execSync(
    'npx playwright test -c playwright-excel.config.js employee.spec.js --reporter=line',
    { cwd, timeout: 600000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  fs.writeFileSync(outFile, result);
  console.log('Tests completed. Results written to employee-results-clean.txt');
} catch (err) {
  // Playwright exits with non-zero on failures - that's expected
  const output = (err.stdout || '') + '\n' + (err.stderr || '');
  fs.writeFileSync(outFile, output);
  console.log('Tests completed with failures. Results written to employee-results-clean.txt');
}
