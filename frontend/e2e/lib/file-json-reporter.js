/**
 * Custom reporter that writes JSON results to a file.
 * Works around Windows stdout redirection issues.
 */
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'matrix-full-results.json');

class FileJsonReporter {
  constructor() {
    this.results = { suites: [], stats: {} };
    this.suiteStack = [];
    this.startTime = null;
  }

  onBegin(config, suite) {
    this.startTime = Date.now();
    this.results.config = { workers: config.workers, timeout: config.timeout };
    this._processSuite(suite);
  }

  _processSuite(suite) {
    // Just store the root suite — we'll extract results from onTestEnd
    this._allTests = [];
    this._testResults = new Map();
  }

  onTestEnd(test, result) {
    const specFile = path.basename(test.location.file);
    const key = `${specFile}::${test.title}`;
    this._testResults.set(key, {
      title: test.title,
      file: specFile,
      line: test.location.line,
      status: result.status,
      duration: result.duration,
      errors: result.errors.map(e => e.message || e.toString()).slice(0, 2)
    });
    
    // Print progress
    const total = this._testResults.size;
    const symbol = result.status === 'passed' ? '✓' : '✗';
    process.stderr.write(`  ${symbol} ${total} ${test.title}\n`);
  }

  onEnd(result) {
    const elapsed = Date.now() - this.startTime;
    let passed = 0, failed = 0, skipped = 0;
    const tests = [];

    for (const [key, t] of this._testResults) {
      tests.push(t);
      if (t.status === 'passed') passed++;
      else if (t.status === 'failed' || t.status === 'timedOut') failed++;
      else skipped++;
    }

    const output = {
      stats: { total: tests.length, passed, failed, skipped, duration: elapsed },
      tests,
      status: result.status
    };

    fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
    process.stderr.write(`\n=== RESULTS ===\n`);
    process.stderr.write(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}\n`);
    process.stderr.write(`Duration: ${Math.round(elapsed / 1000)}s\n`);
    process.stderr.write(`JSON saved: ${OUTPUT}\n`);
  }
}

module.exports = FileJsonReporter;
