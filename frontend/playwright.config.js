// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const dns = require('dns');
// Force IPv4 resolution (Windows may resolve localhost to ::1 IPv6 first)
dns.setDefaultResultOrder('ipv4first');

/**
 * Playwright E2E Test Configuration — Unified
 * =============================================
 * Single config covering ALL test scenarios:
 *   e2e/specs/             — UI tests (Excel data-driven, Page Object Model)
 *   e2e/specs/integration/ — API-level + business-flow integration tests
 *
 * Prerequisites:
 *   1. Backend running:  cd backend && node server.js
 *   2. Frontend running: cd frontend && npm start
 *   3. DB seeded:        npx sequelize-cli db:seed:all  (in backend/)
 *
 * Usage:
 *   npx playwright test                                # run all tests
 *   npx playwright test --ui                           # Playwright UI mode
 *   npx playwright test --headed                       # see the browser
 *   npx playwright test login.spec.js                  # single spec
 *   npx playwright test specs/integration/             # integration tests only
 *   npx playwright test specs/ --ignore=specs/integration  # UI tests only
 *   npm run test:e2e                                   # npm script shortcut
 */
module.exports = defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,          // sequential — tests share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                    // single worker to avoid DB conflicts
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['./e2e/lib/progress-reporter.js'],
    ['list'],
  ],
  timeout: 60000,               // 60s — full-workflow tests need more time

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

  /* Optionally start frontend dev server automatically */
  // webServer: {
  //   command: 'npm start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60000,
  // },
});
