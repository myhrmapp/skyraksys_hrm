// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const dns = require('dns');
// Force IPv4 resolution (Windows may resolve localhost to ::1 IPv6 first)
dns.setDefaultResultOrder('ipv4first');

/**
 * Playwright Excel-Driven E2E Test Configuration
 * ================================================
 * Same test suite as playwright.config.js but with Excel-specific reporters
 * (JSON + JUnit output for spreadsheet sync) and extended timeout.
 * Points to the same unified e2e/specs/ directory.
 *
 * Prefer playwright.config.js for day-to-day runs.
 * Use this config when you need Excel-formatted output.
 *
 * Prerequisites:
 *   1. Backend running:   cd backend && node server.js
 *   2. Frontend running:  cd frontend && npm start
 *   3. Test data:         node e2e/utils/generateTestData.js
 *
 * Usage:
 *   npx playwright test -c playwright-excel.config.js                  # run all
 *   npx playwright test -c playwright-excel.config.js --headed         # headed
 *   npx playwright test -c playwright-excel.config.js --ui             # Playwright UI
 *   npx playwright test -c playwright-excel.config.js login.spec.js    # single spec
 *   npm run test:e2e:excel                                             # npm shortcut
 */
module.exports = defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,          // sequential — tests may share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                    // single worker to avoid conflicts
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/employee-test-results.json' }],
    ['junit', { outputFile: 'test-results/employee-test-results.xml' }],
    ['./e2e/lib/progress-reporter.js'],
    ['list'],
  ],
  timeout: 60000,                // 60s per test

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
