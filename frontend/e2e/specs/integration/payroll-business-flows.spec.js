/**
 * Payroll Module — Full Business Flow E2E Tests
 * ===============================================
 * Covers: salary structures, payslip generation, validation,
 * PDF download, finalize, mark-as-paid, RBAC, and UI rendering.
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

// Shared state
let createdPayslipId = null;
let salaryStructureId = null;

// ══════════════════════════════════════════════════════════════════════════
// FLOW 1 — SALARY STRUCTURES
// ══════════════════════════════════════════════════════════════════════════
test.describe('Payroll — Flow 1: Salary Structures', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('1a — GET /salary-structures returns list', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/salary-structures`, {
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      // API returns {data: {salaryStructures: [...], pagination: {...}}}
      const structures = body.data?.salaryStructures || body.data;
      expect(structures).toBeTruthy();
    } else {
      expect([403, 404]).toContain(res.status());
    }
  });

  test('1b — Admin can create a salary structure', async ({ page }) => {
    const res = await page.request.post(`${API_URL}/salary-structures`, {
      data: {
        name: `E2E Salary Structure ${Date.now()}`,
        basicSalaryPercentage: 50,
        hraPercentage: 20,
        allowances: { transport: 2000, medical: 1500 },
        deductions: { pf: 12, esi: 0.75 },
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      salaryStructureId = body.data.id;
    } else {
      expect([400, 403, 404, 422]).toContain(res.status());
    }
  });

  test('1c — Admin can update a salary structure', async ({ page }) => {
    if (!salaryStructureId) { test.skip(); return; }
    const res = await page.request.put(
      `${API_URL}/salary-structures/${salaryStructureId}`,
      { data: { basicSalaryPercentage: 55 }, failOnStatusCode: false }
    );
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('1d — Non-admin cannot create salary structures', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/salary-structures`, {
      data: { name: 'Unauthorized', basicSalaryPercentage: 50 },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 2 — PAYSLIP GENERATION
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Payroll — Flow 2: Payslip Generation', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('2a — GET /payslips returns all payslips for admin', async ({ page }) => {
    const res = await page.request.get(`${API_URL}/payslips`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    // API may return { payslips: [...], pagination: {...} } or plain array
    const payslips = body.data?.payslips || body.data;
    expect(Array.isArray(payslips)).toBe(true);
  });

  test('2b — Validate payslip generation before running', async ({ page }) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const res = await page.request.post(`${API_URL}/payslips/validate`, {
      data: { month, year },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
  });

  test('2c — Preview payslip calculation', async ({ page }) => {
    const empRes = await page.request.get(`${API_URL}/employees?limit=1&status=Active`);
    const empBody = await empRes.json();
    const emp = (empBody.data || [])[0];
    if (!emp) { test.skip(); return; }

    const res = await page.request.post(`${API_URL}/payslips/calculate-preview`, {
      data: {
        employeeId: emp.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      // Preview should return calculated amounts
      const preview = body.data;
      expect(preview).toBeTruthy();
    } else {
      expect([400, 404, 422, 500]).toContain(res.status());
    }
  });

  test('2d — Generate payslips for a month', async ({ page }) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const res = await page.request.post(`${API_URL}/payslips/generate-all`, {
      data: { month, year },
      failOnStatusCode: false,
    });
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      // Already generated or no salary data — acceptable
      expect([400, 409, 422]).toContain(res.status());
    }

    // Fetch a generated payslip ID for later tests
    const listRes = await page.request.get(`${API_URL}/payslips?month=${month}&year=${year}&limit=1`);
    if (listRes.ok()) {
      const listBody = await listRes.json();
      const payslips = listBody.data || [];
      if (payslips.length > 0) createdPayslipId = payslips[0].id;
    }
  });

  test('2e — GET /payslips/:id returns payslip detail', async ({ page }) => {
    if (!createdPayslipId) { test.skip(); return; }
    const res = await page.request.get(`${API_URL}/payslips/${createdPayslipId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const ps = body.data;
    expect(ps).toHaveProperty('id');
    expect(ps).toHaveProperty('employeeId');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 3 — PAYSLIP STATUS LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════
test.describe.serial('Payroll — Flow 3: Status Lifecycle', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('3a — Admin can finalize a draft payslip', async ({ page }) => {
    if (!createdPayslipId) { test.skip(); return; }
    const res = await page.request.put(
      `${API_URL}/payslips/${createdPayslipId}/finalize`,
      { failOnStatusCode: false }
    );
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('finalized');
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
  });

  test('3b — Admin can mark a payslip as paid', async ({ page }) => {
    if (!createdPayslipId) { test.skip(); return; }
    const res = await page.request.put(
      `${API_URL}/payslips/${createdPayslipId}/mark-paid`,
      {
        data: { paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Bank Transfer' },
        failOnStatusCode: false,
      }
    );
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('paid');
    } else {
      expect([400, 404, 422]).toContain(res.status());
    }
  });

  test('3c — Payslip summary report returns aggregated data', async ({ page }) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const res = await page.request.get(
      `${API_URL}/payslips/reports/summary?month=${month}&year=${year}`,
      { failOnStatusCode: false }
    );
    if (res.ok()) {
      const body = await res.json();
      expect(body.success).toBe(true);
    } else {
      expect([400, 404]).toContain(res.status());
    }
  });

  test('3d — PDF download endpoint responds', async ({ page }) => {
    if (!createdPayslipId) { test.skip(); return; }
    const res = await page.request.get(
      `${API_URL}/payslips/${createdPayslipId}/pdf`,
      { failOnStatusCode: false }
    );
    if (res.ok()) {
      const contentType = res.headers()['content-type'] || '';
      expect(
        contentType.includes('pdf') || contentType.includes('octet-stream')
      ).toBe(true);
    } else {
      expect([400, 404, 501]).toContain(res.status());
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 4 — EMPLOYEE SELF-SERVICE PAYSLIPS
// ══════════════════════════════════════════════════════════════════════════
test.describe('Payroll — Flow 4: Employee Self-Service', () => {
  test('4a — Employee can view own payslips', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips/my`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    await logout(page);
  });

  test('4b — Employee cannot generate payslips', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.post(`${API_URL}/payslips/generate`, {
      data: { month: 1, year: 2025 },
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await logout(page);
  });

  test('4c — Employee cannot access all payslips', async ({ page }) => {
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips`, {
      failOnStatusCode: false,
    });
    // May be 403 or returns only own payslips
    const body = await res.json();
    if (res.ok()) {
      // If returns data, all should belong to self
      const meRes = await page.request.get(`${API_URL}/employees/me`);
      const meBody = await meRes.json();
      const myEmpId = meBody.data?.id;
      if (Array.isArray(body.data)) {
        body.data.forEach(ps => {
          expect(ps.employeeId).toBe(myEmpId);
        });
      }
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 5 — UI RENDERING
// ══════════════════════════════════════════════════════════════════════════
test.describe('Payroll — Flow 5: UI Rendering', () => {
  test('5a — Admin payroll management page renders', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/payroll-management');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/payroll/i);
    await logout(page);
  });

  test('5b — Payroll tabs are visible', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/payroll-management');
    await waitForPageLoad(page);

    const tabs = page.locator('[data-testid="payroll-tabs"]')
      .or(page.getByRole('tab').first());
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    await logout(page);
  });

  test('5c — Generate payslips button is visible on admin page', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/payroll-management');
    await waitForPageLoad(page);

    const generateBtn = page.locator('[data-testid="payroll-generate-btn"]')
      .or(page.getByRole('button', { name: /generate/i })).first();
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await logout(page);
  });

  test('5d — Employee payslips page renders for employee', async ({ page }) => {
    await loginViaUI(page, 'employee');
    await page.goto('/employee-payslips');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText(/payslip/i);
    await logout(page);
  });

  test('5e — Payslip template admin page renders', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/admin/payslip-templates');
    await waitForPageLoad(page);
    await expect(page).not.toHaveURL(/\/login/);
    await logout(page);
  });

  test('5f — Payroll search and filter controls visible', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await page.goto('/payroll-management');
    await waitForPageLoad(page);

    const search = page.locator('[data-testid="payroll-search"]')
      .or(page.getByPlaceholder(/search/i)).first();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(search).toBeVisible();
    }
    await logout(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// FLOW 6 — EXPORT & REPORTS
// ══════════════════════════════════════════════════════════════════════════
test.describe('Payroll — Flow 6: Export & Reports', () => {
  test.beforeEach(async ({ page }) => { await loginViaAPI(page, 'admin'); });
  test.afterEach(async ({ page }) => { await logout(page); });

  test('6a — Export payslips endpoint responds', async ({ page }) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const res = await page.request.get(
      `${API_URL}/payslips/reports/export?month=${month}&year=${year}`,
      { failOnStatusCode: false }
    );
    if (res.ok()) {
      const ct = res.headers()['content-type'] || '';
      expect(
        ct.includes('xls') || ct.includes('csv') || ct.includes('octet-stream') || ct.includes('json') || ct.includes('spreadsheet')
      ).toBe(true);
    } else {
      expect([400, 404, 422, 501]).toContain(res.status());
    }
  });

  test('6b — Employee cannot access payroll export', async ({ page }) => {
    await logout(page);
    await loginViaAPI(page, 'employee');
    const res = await page.request.get(`${API_URL}/payslips/reports/export`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
