/**
 * Playwright Custom Progress Reporter
 * ====================================
 * Writes real-time test progress to a file that can be tailed/polled
 * during long-running test suites. Survives Playwright's test-results
 * directory cleanup because it writes to e2e-excel/.progress/ instead.
 *
 * Output files (in e2e-excel/.progress/):
 *   - progress.log   : human-readable live log (tail -f friendly)
 *   - status.json    : machine-readable current state (poll friendly)
 *
 * Usage in playwright config reporter array:
 *   ['./e2e-excel/lib/progress-reporter.js']
 *
 * Or from CLI:
 *   npx playwright test --reporter=./e2e-excel/lib/progress-reporter.js
 */
const fs = require('fs');
const path = require('path');

const PROGRESS_DIR = path.join(__dirname, '..', '.progress');
const LOG_FILE = path.join(PROGRESS_DIR, 'progress.log');
const STATUS_FILE = path.join(PROGRESS_DIR, 'status.json');

class ProgressReporter {
  constructor() {
    this.totalTests = 0;
    this.completed = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.currentSpec = '';
    this.currentTest = '';
    this.startTime = null;
    this.failures = [];
    this.specStats = {};  // { specFile: { total, passed, failed } }
  }

  _ensureDir() {
    if (!fs.existsSync(PROGRESS_DIR)) {
      fs.mkdirSync(PROGRESS_DIR, { recursive: true });
    }
  }

  _log(msg) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const line = `[${ts}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
  }

  _writeStatus() {
    const elapsed = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    const pct = this.totalTests > 0 ? Math.round((this.completed / this.totalTests) * 100) : 0;
    const status = {
      state: 'running',
      total: this.totalTests,
      completed: this.completed,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      percent: pct,
      elapsed: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      elapsedSeconds: elapsed,
      currentSpec: this.currentSpec,
      currentTest: this.currentTest,
      failures: this.failures,
      specStats: this.specStats,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  }

  onBegin(config, suite) {
    this._ensureDir();

    // Count all tests
    const countTests = (s) => {
      let n = 0;
      for (const test of s.tests || []) n++;
      for (const child of s.suites || []) n += countTests(child);
      return n;
    };
    this.totalTests = countTests(suite);
    this.startTime = Date.now();

    // Clear previous log
    fs.writeFileSync(LOG_FILE, '');
    this._log(`=== E2E Test Run Started ===`);
    this._log(`Total tests: ${this.totalTests} | Workers: ${config.workers}`);
    this._log(`---`);
    this._writeStatus();
  }

  onTestBegin(test) {
    const spec = path.basename(test.location.file);
    this.currentSpec = spec;
    this.currentTest = test.title;

    if (!this.specStats[spec]) {
      this.specStats[spec] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      this._log(`\n>> ${spec}`);
    }
    this.specStats[spec].total++;
    this._writeStatus();
  }

  onTestEnd(test, result) {
    const spec = path.basename(test.location.file);
    this.completed++;
    const dur = `${(result.duration / 1000).toFixed(1)}s`;
    const pct = Math.round((this.completed / this.totalTests) * 100);

    if (result.status === 'passed' || result.status === 'expected') {
      this.passed++;
      if (this.specStats[spec]) this.specStats[spec].passed++;
      this._log(`  PASS (${dur}) [${this.completed}/${this.totalTests} ${pct}%] ${test.title}`);
    } else if (result.status === 'skipped') {
      this.skipped++;
      if (this.specStats[spec]) this.specStats[spec].skipped++;
      this._log(`  SKIP [${this.completed}/${this.totalTests} ${pct}%] ${test.title}`);
    } else {
      this.failed++;
      if (this.specStats[spec]) this.specStats[spec].failed++;
      const errMsg = result.errors?.[0]?.message?.split('\n')[0] || 'Unknown error';
      this.failures.push({ spec, title: test.title, error: errMsg.slice(0, 300) });
      this._log(`  FAIL (${dur}) [${this.completed}/${this.totalTests} ${pct}%] ${test.title}`);
      this._log(`         ${errMsg.slice(0, 200)}`);
    }
    this._writeStatus();
  }

  onEnd(result) {
    const elapsed = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    this._log(`\n---`);
    this._log(`=== Run Complete: ${result.status.toUpperCase()} ===`);
    this._log(`Duration: ${mins}m ${secs}s`);
    this._log(`Passed: ${this.passed} | Failed: ${this.failed} | Skipped: ${this.skipped} | Total: ${this.totalTests}`);

    if (this.failures.length > 0) {
      this._log(`\nFailures:`);
      this.failures.forEach((f, i) => {
        this._log(`  ${i + 1}. [${f.spec}] ${f.title}`);
        this._log(`     ${f.error}`);
      });
    }

    // Write final status
    const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    status.state = 'finished';
    status.result = result.status;
    status.elapsed = `${mins}m ${secs}s`;
    status.elapsedSeconds = elapsed;
    status.currentSpec = '';
    status.currentTest = '';
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  }
}

module.exports = ProgressReporter;
