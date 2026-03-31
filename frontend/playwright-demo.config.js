// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

/**
 * Playwright Demo Recording Configuration
 * ========================================
 * Records an HD video walkthrough of the entire application
 * intended for combining with a TTS voiceover.
 *
 * Usage:
 *   npx playwright test -c playwright-demo.config.js demo-walkthrough
 */
module.exports = defineConfig({
  testDir: './e2e-excel/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 1200_000,  // 20 minutes

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 },   // wider viewport for bottom visibility
    },
    actionTimeout: 15000,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      slowMo: 0,
    },
  },

  projects: [
    {
      name: 'demo-recording',
      /* NOTE: we intentionally omit devices['Desktop Chrome'] to keep
         viewport at exactly 1280×720 (the device preset overrides it). */
      use: {
        browserName: 'chromium',
        channel: undefined,
      },
      testMatch: /demo-walkthrough\.spec\.js$/,
    },
  ],
});
