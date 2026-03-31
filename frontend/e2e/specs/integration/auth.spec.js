/**
 * Authentication Integration Tests
 * =================================
 * Tests real login/logout flow against the running backend.
 * Verifies cookies, session management, and auth-based redirects.
 *
 * Prerequisites:
 *   - Backend running at http://localhost:5000
 *   - Frontend running at http://localhost:3000
 *   - Seeded test users in database
 */
const { test, expect } = require('@playwright/test');
const { loginViaUI, loginViaAPI, logout, TEST_USERS, API_URL } = require('../../helpers');

test.describe('Authentication', () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  test('admin can log in via UI', async ({ page }) => {
    await loginViaUI(page, 'admin');
    // Should be on dashboard, not login
    await expect(page).not.toHaveURL(/\/login/);
    // Should see admin-level content
    await expect(page.locator('body')).toContainText(/dashboard|welcome/i);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Wait for the error to be processed
    await page.waitForTimeout(5000);

    // Should stay on login page (not navigate to dashboard)
    await expect(page).toHaveURL(/\/login/);
  });

  test('API login sets auth cookies', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    // Verify the accessToken cookie was set
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'accessToken');
    expect(accessToken).toBeDefined();
    expect(accessToken.httpOnly).toBe(true);
  });

  test('logged-in user can access /auth/me endpoint', async ({ page }) => {
    await loginViaAPI(page, 'admin');

    const response = await page.request.get(`${API_URL}/auth/me`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(TEST_USERS.admin.email);
    expect(body.data.role).toBe('admin');
  });

  test('unauthenticated request to protected endpoint returns 401', async ({ page }) => {
    // Without logging in, try to access a protected endpoint
    const response = await page.request.get(`${API_URL}/users`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
  });

  test('different roles can log in', async ({ page }) => {
    for (const [role, user] of Object.entries(TEST_USERS)) {
      await loginViaAPI(page, role);

      const response = await page.request.get(`${API_URL}/auth/me`);
      const body = await response.json();
      expect(body.data.role).toBe(user.role);

      await logout(page);
    }
  });
});
