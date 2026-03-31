// @ts-check
const { defineConfig } = require('@playwright/test');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

/**
 * Playwright HD Demo Recording Configuration — v3
 * =================================================
 * Records a full 1920×1080 HD video walkthrough of the entire application
 * intended for combining with a TTS voiceover.
 *
 * CHANGES vs hd config:
 *  - slowMo reduced to 300 (was 400)
 *  - testMatch: demo-v3.spec.js
 *  - output: demo-output-v3/
 *
 * Prerequisites:
 *   1. Start backend:  npm run start:backend  (port 5000)
 *   2. Start frontend: npm run start:frontend  (port 3000)
 *   3. Seed demo data: cd backend && node scripts/seed-demo-rich.js
 *
 * Usage:
 *   cd frontend
 *   npx playwright test -c playwright-demo-v3.config.js demo-v3 --headed
 *
 * After recording:
 *   cd backend && node scripts/seed-demo-rich.js --purge
 *
 * Output:
 *   - Video: test-results/ (Playwright default)
 *   - Narration markers: demo-output-v3/video-markers-v3.json
 */
module.exports = defineConfig({
  testDir: './e2e-excel/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 1_800_000, // 30 minutes

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 },
    },
    actionTimeout: 20_000,
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: 300, // slightly faster than v2 (was 400)
      args: [
        '--disable-blink-features=AutomationControlled',
        '--force-device-scale-factor=1',
      ],
    },
  },

  projects: [
    {
      name: 'demo-v3',
      use: {
        browserName: 'chromium',
        channel: undefined,
      },
      testMatch: /demo-v3\.spec\.js$/,
    },
  ],
});
