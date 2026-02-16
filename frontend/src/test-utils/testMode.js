/**
 * Test Mode Toggle
 * ================
 * Controls whether tests run in UI-only mode (mocked) or Integration mode (real backend).
 *
 * Usage:
 *   npm run test:ui          — UI mode (default): all services/http mocked, fast, no backend needed
 *   npm run test:integration — Integration mode:  real HTTP calls, real backend must be running
 *
 * Environment variable: REACT_APP_TEST_MODE = 'ui' | 'integration'
 */

export const TEST_MODE = process.env.REACT_APP_TEST_MODE || 'ui';
export const isUIMode = TEST_MODE === 'ui';
export const isIntegrationMode = TEST_MODE === 'integration';

/**
 * Integration mode configuration.
 * Override via environment variables or .env.test.integration file.
 */
export const INTEGRATION_CONFIG = {
  /** Backend API base URL */
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',

  /** Test user credentials for each role */
  users: {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@skyraksys.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    },
    hr: {
      email: process.env.TEST_HR_EMAIL || 'hr@skyraksys.com',
      password: process.env.TEST_HR_PASSWORD || 'admin123',
    },
    manager: {
      email: process.env.TEST_MANAGER_EMAIL || 'lead@skyraksys.com',
      password: process.env.TEST_MANAGER_PASSWORD || 'admin123',
    },
    employee: {
      email: process.env.TEST_EMPLOYEE_EMAIL || 'employee1@skyraksys.com',
      password: process.env.TEST_EMPLOYEE_PASSWORD || 'admin123',
    },
  },

  /** Timeout for integration API calls (ms) */
  apiTimeout: Number(process.env.TEST_API_TIMEOUT) || 10000,

  /** Jest test timeout for integration tests (ms) */
  testTimeout: Number(process.env.TEST_TIMEOUT) || 30000,
};

/**
 * Helper: returns the appropriate jest timeout based on mode.
 * Integration tests get longer timeouts automatically.
 */
export const getTestTimeout = (uiTimeout = 5000) =>
  isIntegrationMode ? INTEGRATION_CONFIG.testTimeout : uiTimeout;

/**
 * Console label for the current test mode — printed at startup.
 */
export const TEST_MODE_LABEL = isIntegrationMode
  ? '🔗 INTEGRATION MODE — real backend at ' + INTEGRATION_CONFIG.baseURL
  : '🧩 UI MODE — all services mocked';
