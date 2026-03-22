const { execSync } = require('child_process');

try {
  const result = execSync(
    'npx playwright test -c playwright-excel.config.js employee.spec.js --reporter=line -g "EMP-001"',
    { cwd: __dirname, timeout: 120000, encoding: 'utf-8', stdio: 'pipe' }
  );
  console.log('STDOUT:', result);
} catch (err) {
  console.log('STDOUT:', err.stdout || '(none)');
  console.log('STDERR:', err.stderr || '(none)');
  console.log('EXIT CODE:', err.status);
}
