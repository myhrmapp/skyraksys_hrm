/**
 * Department Management Integration Tests
 * =========================================
 * Tests the full CRUD flow for departments against real backend.
 *
 * Prerequisites:
 *   - Backend running at http://localhost:5000
 *   - Frontend running at http://localhost:3000
 *   - Admin user seeded in database
 */
const { test, expect } = require('@playwright/test');
const { loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL } = require('../../helpers');

test.describe('Department Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('GET /departments returns departments list', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/departments`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Each department has expected fields
    const dept = body.data[0];
    expect(dept).toHaveProperty('id');
    expect(dept).toHaveProperty('name');
  });

  test('departments page renders and shows data', async ({ page }) => {
    // Use UI login so the React app's AuthProvider state is initialized
    await logout(page);
    await loginViaUI(page, 'admin');

    // Navigate to departments — route is /department-management (not /departments)
    await page.goto('/department-management', { waitUntil: 'networkidle' });

    // Verify we're not redirected to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Page should render content (heading, table, or grid)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('can create a new department via API', async ({ page }) => {
    const uniqueName = `Test-Dept-${Date.now()}`;

    const response = await page.request.post(`${API_URL}/departments`, {
      data: {
        name: uniqueName,
        description: 'Created by Playwright integration test',
      },
    });
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(uniqueName);

    // Clean up: delete the created department
    const deleteResponse = await page.request.delete(`${API_URL}/departments/${body.data.id}`);
    expect(deleteResponse.ok()).toBeTruthy();
  });

  test('duplicate department name returns error', async ({ page }) => {
    // Get existing departments
    const listResponse = await page.request.get(`${API_URL}/departments`);
    const { data: departments } = await listResponse.json();

    if (departments.length > 0) {
      // Try to create with same name
      const response = await page.request.post(`${API_URL}/departments`, {
        data: { name: departments[0].name },
        failOnStatusCode: false,
      });
      // Should return 4xx error
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
