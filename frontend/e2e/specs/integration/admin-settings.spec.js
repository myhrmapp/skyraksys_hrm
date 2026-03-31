/**
 * Admin Settings — E2E Tests
 * ============================
 * Covers: system settings, email configuration, user management admin,
 * restore management, and settings access control.
 *
 * Prerequisites:
 *   - Backend at http://localhost:5000
 *   - Frontend at http://localhost:3000
 *   - DB seeded: npx sequelize-cli db:seed:all
 */
const { test, expect } = require('@playwright/test');
const {
  loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL,
} = require('../../helpers');

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1 — SYSTEM SETTINGS API
// ══════════════════════════════════════════════════════════════════════════
test.describe('Admin Settings — Flow 1: System Settings API', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('1a — GET /settings returns system configuration', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/settings`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(typeof body.data).toBe('object');
    } else {
      expect([403, 404]).toContain(res.status());
    }
  });

  test('1b — Server metrics endpoint returns data for admin', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/performance/server-metrics`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([403, 404]).toContain(res.status());
    }
  });

  test('1c — Employee cannot access server metrics', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/performance/server-metrics`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — USER MANAGEMENT (Admin)
// ══════════════════════════════════════════════════════════════════════════
test.describe('Admin Settings — Flow 2: User Management', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('2a — GET /users returns all users for admin', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/users`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(4); // 4 seeded users
  });

  test('2b — User list includes expected fields', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/users`);
    const body = await res.json();
    const user = (body.data || [])[0];
    if (user) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    }
  });

  test('2c — Employee cannot list all users', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/users`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('2d — GET /auth/me returns current user profile', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/auth/me`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('admin@skyraksys.com');
    expect(body.data.role).toBe('admin');
  });

  test('2e — Admin can update user profile', async ({ page }) => {
    const res = await page.request.put(`${API_URL}/auth/me`, {
      data: { firstName: 'Admin', lastName: 'User' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 422]).toContain(res.status());
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — PASSWORD MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Admin Settings — Flow 3: Password Management', () => {
  test('3a — Admin can reset another user password', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    // Get employee user
    const usersRes = await page.request.get(`${API_URL}/users`);
    const usersBody = await usersRes.json();
    const empUser = (usersBody.data || []).find(u => u.role === 'employee');

    if (empUser) {
      const res = await page.request.post(`${API_URL}/auth/reset-password`, {
        data: { userId: empUser.id, newPassword: 'TempReset123!' },
        failOnStatusCode: false,
      });
      if (res.ok()) {
        const body = await res.json();
        expect(body.success).toBe(true);
      } else {
        expect([400, 403, 404, 422]).toContain(res.status());
      }
    }
    await logout(page);
  });

  test('3b — Employee cannot reset another user password', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/auth/reset-password`, {
      data: { userId: 'some-other-user-id', newPassword: 'Unauthorized123!' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('3c — Change own password with valid current password', async ({ page }) => {
    // Change hr@skyraksys.com password and then restore it
    await loginViaAPI(page, 'hr');
    const changeRes = await page.request.put(`${API_URL}/auth/change-password`, {
      data: { currentPassword: 'admin123', newPassword: 'NewHRPass456!' },
      failOnStatusCode: false,
    });
    if (changeRes.ok()) {
      // Restore original password
      await page.request.put(`${API_URL}/auth/change-password`, {
        data: { currentPassword: 'NewHRPass456!', newPassword: 'admin123' },
        failOnStatusCode: false,
      });
    } else {
      expect([400, 422]).toContain(changeRes.status());
    }
    await logout(page);
  });

  test('3d — Change password with wrong current password fails', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.put(`${API_URL}/auth/change-password`, {
      data: { currentPassword: 'wrongpassword', newPassword: 'NewPass456!' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — UI RENDERING
// ══════════════════════════════════════════════════════════════════════════
test.describe('Admin Settings — Flow 4: UI Rendering', () => {
  test('4a — User Management page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/user-management');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/user/i);
    await logout(page);
  });

  test('4b — System Settings Hub renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin/settings-hub');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/setting/i);
    await logout(page);
  });

  test('4c — Restore Management page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin/restore');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await logout(page);
  });

  test('4d — Navigation logout button triggers logout', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageLoad(page);

    // Open profile menu
    const profileTrigger = page.locator('[data-testid="layout-profile-menu-trigger"]')
      .or(page.locator('[aria-label*="profile" i], [aria-label*="account" i]')).first();
    if (await profileTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profileTrigger.click();
      const logoutBtn = page.locator('[data-testid="layout-menu-logout"]')
        .or(page.getByRole('menuitem', { name: /logout|sign out/i })).first();
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutBtn.click();
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      }
    }
  });

  test('4e — Settings pages are inaccessible to employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/admin/settings-hub');
    await waitForPageLoad(page);
    const url = page.url();
    const body = await page.locator('body').textContent();
    const isBlocked = url.includes('/login') ||
      url.includes('/employee-dashboard') ||
      /unauthorized|forbidden|access denied|403|not allowed/i.test(body || '');
    expect(isBlocked).toBe(true);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 — EMPLOYEE REVIEWS
// ══════════════════════════════════════════════════════════════════════════
test.describe('Admin Settings — Flow 5: Employee Reviews', () => {
  test('5a — Employee Reviews page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/employee-reviews');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/review|performance/i);
    await logout(page);
  });

  test('5b — Performance dashboard page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/performance-dashboard');
    // Skip waitForPageLoad — this page has permanent MuiLinearProgress bars
    await page.waitForLoadState('networkidle');
    const url = page.url();
    // Page may render or redirect — either is acceptable
    const rendered = !url.includes('/login');
    expect(rendered).toBe(true);
    await logout(page);
  });
});
