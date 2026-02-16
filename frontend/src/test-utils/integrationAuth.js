/**
 * Integration Auth Helper
 * =======================
 * Provides real authentication for integration-mode tests.
 * Logs into the backend, retrieves JWT token, and configures
 * the Axios instance (http-common) so all subsequent API calls are authenticated.
 *
 * Usage in a test file (integration mode only):
 *   import { loginAs, logoutIntegration, getIntegrationUser } from '../../test-utils/integrationAuth';
 *
 *   beforeAll(async () => { await loginAs('admin'); });
 *   afterAll(async () => { await logoutIntegration(); });
 */

import axios from 'axios';
import { INTEGRATION_CONFIG } from './testMode';

/** Cached auth state */
let authToken = null;
let currentUser = null;
let axiosCookieJar = null;

/**
 * Login as a specific role against the real backend.
 * Stores the JWT cookie so subsequent http-common requests are authenticated.
 *
 * @param {'admin'|'hr'|'manager'|'employee'} role
 * @returns {Promise<{user: object, token: string}>}
 */
export async function loginAs(role = 'admin') {
  const creds = INTEGRATION_CONFIG.users[role];
  if (!creds) {
    throw new Error(`No test credentials configured for role "${role}". Check INTEGRATION_CONFIG.`);
  }

  try {
    const response = await axios.post(
      `${INTEGRATION_CONFIG.baseURL}/auth/login`,
      { email: creds.email, password: creds.password },
      {
        withCredentials: true,
        timeout: INTEGRATION_CONFIG.apiTimeout,
      }
    );

    const data = response.data?.data || response.data;
    currentUser = data.user || null;

    // Extract JWT from response body first, then from Set-Cookie header.
    // In JSDOM/Jest, httpOnly cookies don't persist across requests,
    // so we extract the token and set it as an Authorization header instead.
    authToken = data.token || data.accessToken || null;

    if (!authToken) {
      // Parse accessToken from Set-Cookie header
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        for (const cookie of cookieArray) {
          const match = cookie.match(/accessToken=([^;]+)/);
          if (match) {
            authToken = match[1];
            break;
          }
        }
      }
    }

    // Set the token as a default Authorization header on http-common
    // so all subsequent API calls from components are authenticated.
    if (authToken) {
      const http = require('../http-common').default;
      http.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      console.warn(
        `Integration login: no token obtained for role "${role}".`,
        'API calls may fail with 401.'
      );
    }

    return { user: currentUser, token: authToken };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    throw new Error(
      `Integration login failed for role "${role}" (${creds.email}): ${msg}\n` +
      `Is the backend running at ${INTEGRATION_CONFIG.baseURL}?`
    );
  }
}

/**
 * Logout and clear auth state.
 */
export async function logoutIntegration() {
  try {
    if (authToken) {
      await axios.post(
        `${INTEGRATION_CONFIG.baseURL}/auth/logout`,
        {},
        {
          withCredentials: true,
          timeout: INTEGRATION_CONFIG.apiTimeout,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
    }
  } catch {
    // Ignore logout errors in test cleanup
  } finally {
    authToken = null;
    currentUser = null;
    axiosCookieJar = null;

    // Clear the default header on http-common
    try {
      const http = require('../http-common').default;
      delete http.defaults.headers.common['Authorization'];
    } catch {
      // http-common might be mocked in UI mode — safe to ignore
    }
  }
}

/**
 * Get the currently authenticated user from the real backend.
 * Useful for building an authValue that matches the real user object shape.
 */
export function getIntegrationUser() {
  return currentUser;
}

/**
 * Get the current auth token.
 */
export function getAuthToken() {
  return authToken;
}

/**
 * Build a real auth value from the integration user.
 * Returns the same shape as buildAuthValue() from testUtils.js,
 * but populated with the real backend user data.
 */
export function buildIntegrationAuthValue() {
  if (!currentUser) {
    throw new Error('No integration user. Call loginAs(role) first.');
  }

  const role = currentUser.role;
  return {
    user: currentUser,
    loading: false,
    isAuthenticated: true,
    isAdmin: role === 'admin',
    isHR: role === 'hr',
    isManager: role === 'manager',
    isEmployee: role === 'employee',
    canManageEmployees: ['admin', 'hr'].includes(role),
    canApproveLeaves: ['admin', 'hr', 'manager'].includes(role),
    canViewPayroll: ['admin', 'hr'].includes(role),
    canManageSettings: role === 'admin',
    login: jest.fn(),
    logout: jest.fn(),
    hasRole: jest.fn((r) => r === role),
    hasAnyRole: jest.fn((roles) => roles.includes(role)),
  };
}
