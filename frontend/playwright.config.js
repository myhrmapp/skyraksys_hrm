// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Integration Test Configuration
 * ==========================================
 * Proper E2E integration tests that run in a real browser.
 * Unlike Jest-based tests, these handle real cookies, CORS, and full DOM.
 *
 * Prerequisites:
 *   1. Backend must be running:  cd backend && npm start
 *   2. Frontend must be running: cd frontend && npm start
 *
 * Usage:
 *   npx playwright test                    # run all integration tests
 *   npx playwright test --ui               # open Playwright UI
 *   npx playwright test --headed           # see the browser
 *   npx playwright test auth.spec.js       # run specific test file
 *   npm run test:e2e                       # npm script shortcut
 */
module.exports = defineConfig({
  testDir: './e2e-integration',
  fullyParallel: false,          // run sequentially — tests may share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                    // single worker to avoid DB conflicts
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-integration' }],
    ['list'],
  ],
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
