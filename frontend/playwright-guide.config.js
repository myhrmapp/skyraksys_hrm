// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

/**
 * Playwright User-Guide Video Recording Configuration
 * ====================================================
 * Records HD videos of every business-workflow test to generate
 * an in-app user guide with step-by-step video walkthroughs.
 *
 * Usage:
 *   npx playwright test -c playwright-guide.config.js business-workflows
 *   npx playwright test -c playwright-guide.config.js business-workflows --headed
 *
 * Output:
 *   public/guides/videos/<testId>.webm  — one video per workflow
 *   public/guides/guide-manifest.json   — metadata for in-app help system
 */
module.exports = defineConfig({
  testDir: './e2e-excel/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['./e2e-excel/lib/guide-reporter.js'],
  ],
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'on',
    video: {
      mode: 'on',
      size: { width: 640, height: 360 },
    },
    actionTimeout: 15000,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 0,   // no slowMo — 1.5s pauses in tests ensure success messages are captured
    },
  },

  projects: [
    {
      name: 'guide-recording',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
