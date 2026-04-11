/**
 * Runner script — runs all matrix tests and captures JSON output to a file.
 * Usage: node _run_matrix_tests.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'frontend', 'matrix-rerun-final.json');

// Delete old results
try { if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT); } catch (e) { /* ignore */ }

console.log('Running all matrix tests...');
console.log('Output:', OUTPUT);

try {
  const stdout = execSync(
    'npx playwright test --grep @matrix --reporter=json --timeout=60000',
    {
      cwd: path.join(__dirname, 'frontend'),
      maxBuffer: 100 * 1024 * 1024,
      timeout: 2400000,  // 40 min
      encoding: 'utf8',
    }
  );
  fs.writeFileSync(OUTPUT, stdout);
  console.log('PASS — JSON written:', fs.statSync(OUTPUT).size, 'bytes');
} catch (e) {
  // Playwright exits with non-zero when tests fail — capture stdout anyway
  if (e.stdout) {
    fs.writeFileSync(OUTPUT, e.stdout);
    console.log('FAIL — JSON written:', fs.statSync(OUTPUT).size, 'bytes');
  } else {
    console.error('ERROR — no stdout captured');
    console.error(e.message.substring(0, 500));
  }
}
