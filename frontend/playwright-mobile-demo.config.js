// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright Mobile Demo Verification Config
 * =============================================
 * Walks through both Employee and Manager flows on the React Native Web
 * mobile app running at localhost:8081, with iPhone 14 Pro viewport.
 *
 * Prerequisites:
 *   1. Start backend:  (port 5000)
 *   2. Start mobile:   cd mobile && npx expo start --web  (port 8081)
 *
 * Usage:
 *   cd frontend
 *   npx playwright test -c playwright-mobile-demo.config.js --headed
 *
 * Output:
 *   - Video:  test-results/
 *   - Screenshots: test-results/
 */
module.exports = defineConfig({
  testDir: './mobile-demo',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000, // 2 minutes per test

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: {
      mode: 'on', // always save video for all tests
      size: { width: 1170, height: 2532 }, // iPhone 14 Pro native resolution
    },
    actionTimeout: 15_000,
    viewport: { width: 1170, height: 2532 }, // iPhone 14 Pro native viewport
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    launchOptions: {
      slowMo: 600, // 600ms for voice-over demo recording
    },
  },

  projects: [
    {
      name: 'mobile-demo',
      use: { browserName: 'chromium' },
      testMatch: /mobile-demo-flows\.spec\.js$/,
    },
  ],
});
