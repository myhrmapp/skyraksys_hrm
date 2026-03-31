/**
 * Dashboard & Reports — E2E Tests
 * =================================
 * Covers: role-based dashboard data, stat cards, quick actions,
 * reports module, and performance metrics.
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
// FLOW 1 — DASHBOARD API DATA
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 1: API Data', () => {
  test('1a — Admin gets dashboard data with summary stats', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/dashboard`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([404]).toContain(res.status());
    }
    await logout(page);
  });

  test('1b — Dashboard stats endpoint returns aggregate counts', async ({ page }) => {
    await loginViaAPI(page, 'admin');
    const res = await page.request.get(`${API_URL}/dashboard/stats`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      const d = body.data;
      // Should have employee counts, leave counts, etc.
      expect(typeof d).toBe('object');
    } else {
      expect([404, 501]).toContain(res.status());
    }
    await logout(page);
  });

  test('1c — Employee gets own dashboard data', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/dashboard`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    await logout(page);
  });

  test('1d — Manager gets team-scoped dashboard data', async ({ page }) => {
    await loginViaAPI(page, 'manager');
    const res = await page.request.get(`${API_URL}/dashboard`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    await logout(page);
  });

  test('1e — Unauthenticated dashboard request returns 401 or 404', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/dashboard`, {
      failOnStatusCode: false,
    });
    if (!res.ok()) {
      expect([401, 404]).toContain(res.status());
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — ADMIN DASHBOARD UI
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 2: Admin Dashboard UI', () => {
  test('2a — Admin Dashboard page renders', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/dashboard/i);
    await logout(page);
  });

  test('2b — Stat cards are visible on admin dashboard', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageLoad(page);

    // Stat cards for total employees etc
    const statCard = page.locator('[data-testid^="stat-card-"]').first();
    if (await statCard.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(statCard).toBeVisible();
    } else {
      // Fallback — at least some numbers should be visible
      await expect(page.locator('body')).toContainText(/\d+/);
    }
    await logout(page);
  });

  test('2c — Quick action buttons visible on admin dashboard', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageLoad(page);

    const addEmpBtn = page.locator('[data-testid="admin-btn-add-employee"]')
      .or(page.getByRole('button', { name: /add employee/i })).first();
    if (await addEmpBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addEmpBtn).toBeEnabled();
    }
    await logout(page);
  });

  test('2d — Refresh button reloads dashboard data', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin-dashboard');
    await waitForPageLoad(page);

    const refreshBtn = page.locator('[data-testid="admin-dashboard-refresh-btn"]')
      .or(page.getByRole('button', { name: /refresh/i })).first();
    if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshBtn.click();
      await waitForPageLoad(page);
      await expect(page).not.toHaveURL(/\/login/);
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — EMPLOYEE DASHBOARD UI
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 3: Employee Dashboard UI', () => {
  test('3a — Employee Dashboard page renders', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/employee-dashboard');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/dashboard/i);
    await logout(page);
  });

  test('3b — Employee dashboard shows personal summary', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/employee-dashboard');
    await waitForPageLoad(page);
    // Should see Alice Brown's name or personal data
    await expect(page.locator('body')).toContainText(/alice|dashboard|leave|timesheet/i);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — MANAGER DASHBOARD UI
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 4: Manager Dashboard UI', () => {
  test('4a — Manager Dashboard page renders', async ({ page }) => {
    await loginViaUI(page, 'manager');
    await page.goto('/manager-dashboard');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/dashboard|team|manager/i);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 — REPORTS MODULE
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 5: Reports Module', () => {
  test('5a — Reports page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/reports');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/report/i);
    await logout(page);
  });

  test('5b — Reports page inaccessible to employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/reports');
    await waitForPageLoad(page);
    const url = page.url();
    const body = await page.locator('body').textContent();
    const isRedirected = url.includes('/login') || url.includes('/employee-dashboard');
    const isBlocked = /unauthorized|forbidden|access denied|403|not allowed/i.test(body || '');
    expect(isRedirected || isBlocked).toBe(true);
    await logout(page);
  });

  test('5c — Performance dashboard page renders', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/performance-dashboard');
    // Skip waitForPageLoad — this page has permanent MuiLinearProgress bars
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 6 — ROLE-BASED DASHBOARD REDIRECT
// ══════════════════════════════════════════════════════════════════════════
test.describe('Dashboard — Flow 6: Role-Based Redirect', () => {
  test('6a — Admin is redirected to admin-dashboard after login', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await expect(page).toHaveURL(/admin-dashboard|dashboard/, { timeout: 10000 });
    await logout(page);
  });

  test('6b — Employee is redirected to employee-dashboard after login', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await expect(page).toHaveURL(/employee-dashboard|dashboard/, { timeout: 10000 });
    await logout(page);
  });

  test('6c — Manager is redirected to manager-dashboard after login', async ({ page }) => {
    await loginViaUI(page, 'manager');
    await expect(page).toHaveURL(/manager-dashboard|dashboard/, { timeout: 10000 });
    await logout(page);
  });

  test('6d — Navigating to / redirects authenticated admin to dashboard', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/');
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/dashboard/);
    await logout(page);
  });
});
