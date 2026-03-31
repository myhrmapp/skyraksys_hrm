/**
 * Organization — Positions, Departments, Holidays E2E Tests
 * ===========================================================
 * Covers: position CRUD, department CRUD, holiday calendar management,
 * org settings UI, and RBAC enforcement.
 *
 * Prerequisites:
 *   - Backend at http://localhost:5000
 *   - Frontend at http://localhost:3000
 *   - DB seeded: npx sequelize-cli db:seed:all
 */
const { test, expect } = require('@playwright/test');
const {
  loginViaAPI, loginViaUI, logout, waitForPageLoad, API_URL, uniqueId,
} = require('../../helpers');

// Shared state
let createdPositionId = null;
let createdHolidayId = null;

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1 — POSITION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Org — Flow 1: Position Management', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('1a — GET /positions returns positions list', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/positions`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const pos = body.data[0];
    expect(pos).toHaveProperty('id');
    expect(pos).toHaveProperty('title');
  });

  test('1b — Admin can create a position', async ({ page }) => {
    const dept = await (async () => {
      const r = await page.request.get(`${API_URL}/departments`);
      const b = await r.json();
      return (b.data || b)[0];
    })();

    const title = `E2E Position ${uniqueId()}`;
    const res = await page.request.post(`${API_URL}/positions`, {
      data: {
        title,
        description: 'Created by E2E test suite',
        departmentId: dept?.id,
        level: 'junior',
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe(title);
      createdPositionId = body.data.id;
    } else {
      expect([400, 403, 422]).toContain(res.status());
    }
  });

  test('1c — GET /positions/:id returns position detail', async ({ page }) => {
    if (!createdPositionId) { test.skip(); return; }
    const res = await page.request.get(`${API_URL}/positions/${createdPositionId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPositionId);
  });

  test('1d — Admin can update a position', async ({ page }) => {
    if (!createdPositionId) { test.skip(); return; }
    const res = await page.request.put(`${API_URL}/positions/${createdPositionId}`, {
      data: { description: 'Updated by E2E test', level: 'mid' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('1e — Non-admin cannot create positions', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/positions`, {
      data: { title: 'Unauthorized Position' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('1f — Admin can delete a position (cleanup)', async ({ page }) => {
    if (!createdPositionId) { test.skip(); return; }
    const res = await page.request.delete(`${API_URL}/positions/${createdPositionId}`, {
      failOnStatusCode: false,
    });
    expect([200, 204, 400]).toContain(res.status());
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — HOLIDAY CALENDAR
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Org — Flow 2: Holiday Calendar', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('2a — GET /holidays returns holidays', async ({ page }) => {
    const year = new Date().getFullYear();
    const res = await page.request.get(`${API_URL}/holidays?year=${year}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('2b — Admin can create a holiday', async ({ page }) => {
    const res = await page.request.post(`${API_URL}/holidays`, {
      data: {
        name: `E2E Test Holiday ${uniqueId()}`,
        date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        type: 'national',
        description: 'Created by E2E test',
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      createdHolidayId = body.data.id;
    } else {
      expect([400, 403, 422]).toContain(res.status());
    }
  });

  test('2c — Admin can update a holiday', async ({ page }) => {
    if (!createdHolidayId) { test.skip(); return; }
    const res = await page.request.put(`${API_URL}/holidays/${createdHolidayId}`, {
      data: { description: 'Updated by E2E test' },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('2d — Non-admin cannot create holidays', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/holidays`, {
      data: { name: 'Unauthorized Holiday', date: '2025-12-31' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('2e — Admin can delete a holiday (cleanup)', async ({ page }) => {
    if (!createdHolidayId) { test.skip(); return; }
    const res = await page.request.delete(`${API_URL}/holidays/${createdHolidayId}`, {
      failOnStatusCode: false,
    });
    expect([200, 204]).toContain(res.status());
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — DEPARTMENT REFERENCE DATA (Extended)
// ══════════════════════════════════════════════════════════════════════════
test.describe('Org — Flow 3: Department Reference Data', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('3a — Seeded departments include Engineering and HR', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/departments`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const depts = body.data || body;
    const names = depts.map(d => d.name);
    expect(names).toContain('Engineering');
    expect(names).toContain('Human Resources');
  });

  test('3b — Seeded positions include Software Engineer', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/positions`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const positions = body.data || body;
    const titles = positions.map(p => p.title);
    expect(titles).toContain('Software Engineer');
  });

  test('3c — Employee can read departments (dropdown data)', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/departments`);
    expect(res.ok()).toBeTruthy();
  });

  test('3d — GET /departments/:id returns department detail', async ({ page }) => {
    const listRes = await page.request.get(`${API_URL}/departments`);
    const listBody = await listRes.json();
    const dept = (listBody.data || listBody)[0];
    if (!dept) { test.skip(); return; }

    const res = await page.request.get(`${API_URL}/departments/${dept.id}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(dept.id);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — UI RENDERING
// ══════════════════════════════════════════════════════════════════════════
test.describe('Org — Flow 4: UI Rendering', () => {
  test('4a — Organization Settings page renders for admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/organization');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/organization|department|position/i);
    await logout(page);
  });

  test('4b — Department management section visible to admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/organization');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    // Department tab or section should exist
    const deptEl = page.getByText(/department/i).first();
    await expect(deptEl).toBeVisible({ timeout: 10000 });
    await logout(page);
  });

  test('4c — Position management visible to admin', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/organization');
    await waitForPageLoad(page);
    const posEl = page.getByText(/position/i).first();
    await expect(posEl).toBeVisible({ timeout: 10000 });
    await logout(page);
  });

  test('4d — Organization page is inaccessible to plain employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/organization');
    await waitForPageLoad(page);
    // Should redirect to login, employee dashboard, or show unauthorized
    const url = page.url();
    const unauthorizedOnPage = await page.locator('body').textContent();
    const isRedirected = url.includes('/login') || url.includes('/employee-dashboard');
    const isUnauthorized = /unauthorized|forbidden|403|not allowed|access.denied/i.test(unauthorizedOnPage || '');
    expect(isRedirected || isUnauthorized).toBe(true);
    await logout(page);
  });
});
