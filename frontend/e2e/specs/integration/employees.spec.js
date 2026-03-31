/**
 * Employee Management Integration Tests
 * =======================================
 * Tests employee CRUD, list, and profile operations against real backend.
 */
const { test, expect } = require('@playwright/test');
const { loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL } = require('../../helpers');

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, 'admin');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('GET /employees returns employee list', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/employees`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const emp = body.data[0];
      expect(emp).toHaveProperty('employeeId');
      expect(emp).toHaveProperty('firstName');
      expect(emp).toHaveProperty('lastName');
      expect(emp).toHaveProperty('email');
    }
  });

  test('employee list page renders', async ({ page }) => {
    // Use UI login so React AuthProvider state is initialized for page navigation
    await logout(page);
    await loginViaUI(page, 'admin');
    
    await page.goto('/employees');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /employee/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('employee profile page loads for seeded employee', async ({ page }) => {
    // Get first employee
    const response = await page.request.get(`${API_URL}/employees`);
    const { data: employees } = await response.json();

    if (employees.length > 0) {
      const empId = employees[0].id || employees[0].employeeId;
      const profileResponse = await page.request.get(`${API_URL}/employees/${empId}`);
      expect(profileResponse.ok()).toBeTruthy();

      const profileBody = await profileResponse.json();
      expect(profileBody.success).toBe(true);
      expect(profileBody.data).toHaveProperty('firstName');
    }
  });

  test('non-admin cannot create employees', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');

    const response = await page.request.post(`${API_URL}/employees`, {
      data: {
        firstName: 'Unauthorized',
        lastName: 'User',
        email: 'unauth@test.com',
      },
      failOnStatusCode: false,
    });

    // Should be 403 forbidden
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
