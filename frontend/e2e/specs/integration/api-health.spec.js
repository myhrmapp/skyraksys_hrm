/**
 * API Health & Core Endpoints Integration Tests
 * ===============================================
 * Verifies backend health, CORS, and core API infrastructure.
 */
const { test, expect } = require('@playwright/test');
const { loginViaAPI, logout, API_URL } = require('../../helpers');

test.describe('API Health & Infrastructure', () => {
  test('health endpoint returns healthy status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('CORS headers are present on API responses', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    const headers = response.headers();
    // The backend should allow credentials for cookie auth
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('protected endpoints require authentication', async ({ request }) => {
    const endpoints = [
      '/users',
      '/payslips',
      '/timesheets',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_URL}${endpoint}`, {
        failOnStatusCode: false,
      });
      expect(response.status()).toBe(401);
    }
  });

  test('admin can access all protected endpoints after login', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    const endpoints = [
      '/auth/me',
      '/users',
      '/payslips',
      '/timesheets',
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(`${API_URL}${endpoint}`);
      expect(response.ok()).toBeTruthy();
    }

    await logout(page);
  });
});
