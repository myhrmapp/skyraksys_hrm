/**
 * E2E Test Runner with Real-Time Progress Monitoring
 * ===================================================
 * Runs the Playwright E2E suite and provides live feedback via:
 *   - e2e-excel/.progress/progress.log  (tail -f friendly)
 *   - e2e-excel/.progress/status.json   (machine-readable, poll-friendly)
 *   - Console summary on completion
 *
 * Usage:
 *   node run-test.js                         # run all specs
 *   node run-test.js attendance timesheet     # run specific specs
 *   node run-test.js --watch                  # run + tail progress live
 *   node run-test.js --status                 # show current status.json
 *   node run-test.js --last                   # show last run summary
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROGRESS_DIR = path.join(__dirname, 'e2e-excel', '.progress');
const LOG_FILE = path.join(PROGRESS_DIR, 'progress.log');
const STATUS_FILE = path.join(PROGRESS_DIR, 'status.json');

// -- Subcommands --
const args = process.argv.slice(2);

if (args.includes('--status')) {
  showStatus();
  process.exit(0);
}
if (args.includes('--last')) {
  showLastRun();
  process.exit(0);
}

const watchMode = args.includes('--watch');
const specArgs = args.filter(a => !a.startsWith('--'));

// Ensure progress directory exists
if (!fs.existsSync(PROGRESS_DIR)) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
}

// Pre-flight checks
console.log('Pre-flight checks...');
try {
  checkService('http://localhost:5000/api/health', 'Backend');
  checkService('http://localhost:3000', 'Frontend');
  console.log('  Backend :5000  OK');
  console.log('  Frontend :3000 OK');
} catch (e) {
  console.error(`  FAIL: ${e.message}`);
  console.error('  Start backend and frontend first, then retry.');
  process.exit(1);
}

// Build playwright args
const pwArgs = ['playwright', 'test', '--config=playwright-excel.config.js', ...specArgs];
console.log(`\nRunning: npx ${pwArgs.join(' ')}`);
console.log(`Progress: ${LOG_FILE}`);
console.log(`Status:   ${STATUS_FILE}\n`);

const child = spawn('npx', pwArgs, {
  cwd: __dirname,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

// If --watch, tail the progress log
let tail;
if (watchMode) {
  // Give Playwright a moment to create the log file
  setTimeout(() => {
    tail = spawn('powershell', [
      '-Command',
      `Get-Content '${LOG_FILE}' -Wait -Tail 50`
    ], { stdio: 'inherit', shell: false });
  }, 3000);
}

// Capture stderr for error diagnosis
let stderr = '';
child.stderr.on('data', d => { stderr += d.toString(); });

child.on('close', (code) => {
  if (tail) tail.kill();

  console.log('\n' + '='.repeat(60));

  // Read final status
  try {
    const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    console.log(`Result:   ${status.result?.toUpperCase() || (code === 0 ? 'PASSED' : 'FAILED')}`);
    console.log(`Duration: ${status.elapsed}`);
    console.log(`Tests:    ${status.passed} passed, ${status.failed} failed, ${status.skipped} skipped / ${status.total} total`);

    if (status.failures?.length > 0) {
      console.log(`\nFailures:`);
      status.failures.forEach((f, i) => {
        console.log(`  ${i + 1}. [${f.spec}] ${f.title}`);
        console.log(`     ${f.error.slice(0, 150)}`);
      });
    }
  } catch {
    console.log(`Exit code: ${code}`);
    if (stderr) console.log(`Stderr: ${stderr.slice(0, 500)}`);
  }

  console.log('='.repeat(60));
  console.log(`Full log:   ${LOG_FILE}`);
  console.log(`JSON report: test-results/employee-test-results.json`);
  console.log(`HTML report: npx playwright show-report playwright-report-excel`);
  process.exit(code || 0);
});

// -- Helpers --
function checkService(url, name) {
  try {
    execSync(`powershell -Command "(Invoke-WebRequest -Uri '${url}' -UseBasicParsing -TimeoutSec 3).StatusCode"`, {
      stdio: 'pipe',
      timeout: 10000,
    });
  } catch {
    throw new Error(`${name} is not responding at ${url}`);
  }
}

function showStatus() {
  if (!fs.existsSync(STATUS_FILE)) {
    console.log('No active or previous run found.');
    return;
  }
  const s = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  const bar = s.total > 0 ? progressBar(s.percent) : '';
  console.log(`State:    ${s.state}`);
  console.log(`Progress: ${s.completed}/${s.total} (${s.percent}%) ${bar}`);
  console.log(`Passed:   ${s.passed} | Failed: ${s.failed} | Skipped: ${s.skipped}`);
  console.log(`Elapsed:  ${s.elapsed}`);
  if (s.currentSpec) console.log(`Current:  ${s.currentSpec} > ${s.currentTest}`);
  if (s.failures?.length > 0) {
    console.log(`\nFailures so far:`);
    s.failures.forEach((f, i) => console.log(`  ${i + 1}. [${f.spec}] ${f.title}`));
  }
}

function showLastRun() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('No previous run log found.');
    return;
  }
  const log = fs.readFileSync(LOG_FILE, 'utf8');
  // Show last 30 lines
  const lines = log.split('\n');
  const tail = lines.slice(Math.max(0, lines.length - 30));
  console.log(tail.join('\n'));
}

function progressBar(pct) {
  const width = 30;
  const filled = Math.round((pct / 100) * width);
  return '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
}
