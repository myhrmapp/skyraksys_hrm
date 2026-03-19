// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Excel-Driven E2E Test Configuration
 * ================================================
 * Comprehensive UI tests driven by Excel test-data workbook.
 * Uses data-testid selectors via an object repository for stability.
 *
 * Prerequisites:
 *   1. Backend running:   cd backend && npm start
 *   2. Frontend running:  cd frontend && npm start
 *   3. Test data:         node e2e-excel/utils/generateTestData.js
 *
 * Usage:
 *   npx playwright test -c playwright-excel.config.js                  # run all
 *   npx playwright test -c playwright-excel.config.js --headed         # headed
 *   npx playwright test -c playwright-excel.config.js --ui             # Playwright UI
 *   npx playwright test -c playwright-excel.config.js login.spec.js    # single spec
 *   npm run test:e2e:excel                                             # npm shortcut
 */
module.exports = defineConfig({
  testDir: './e2e-excel/specs',
  fullyParallel: false,          // sequential — tests may share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                    // single worker to avoid conflicts
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-excel' }],
    ['list'],
  ],
  timeout: 45000,                // 45s per test (some workflows need more time)

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
