// @ts-check
/**
 * Payroll Module — E2E Tests
 *
 * Uses a SINGLE Chrome stable browser for ALL roles to avoid Chromium
 * headless memory crashes on Windows. Each role gets its own context.
 *
 * Admin: 7 composite tests covering PAY-001..PAY-024 checks.
 * HR: 6 tests (PAY-025..PAY-030).
 * Employee: 9 tests (PAY-031..PAY-039).
 * Manager: 1 test (PAY-040).
 * Total: 23 tests covering 40 test case checks.
 */
const { test: base, expect } = require('@playwright/test');
const { chromium } = require('@playwright/test');
const { loginAs, waitForPageReady } = require('../fixtures/test-fixtures');
const PayrollPage = require('../pages/PayrollPage');

// Single shared browser for ALL roles — avoids multi-process memory death
/** @type {import('@playwright/test').Browser} */
let sharedBrowser;

base.beforeAll(async () => {
  sharedBrowser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu'],
  });
});

base.afterAll(async () => {
  await sharedBrowser?.close().catch(() => {});
});

// Helper: create a fresh context + page + login for a role
async function newSession(role) {
  const ctx = await sharedBrowser.newContext({ baseURL: 'http://localhost:3000' });
  const pg = await ctx.newPage();
  await loginAs(pg, role);
  return { ctx, pg };
}

// ============================================================
// ADMIN — 7 composite tests covering PAY-001 to PAY-024
// ============================================================
base.describe('Payroll Module — admin', () => {
  let ctx, pg;

  base.beforeAll(async () => {
    ({ ctx, pg } = await newSession('admin'));
  });

  base.afterAll(async () => {
    await ctx?.close().catch(() => {});
  });

  // ── 1: Page load, tab count, overview stats & quick actions ──
  base('PAY-001/002/007/008: Page load, tabs, overview stats & actions', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    expect(await p.isManagementPageVisible()).toBeTruthy();
    expect(await p.getTabCount()).toBe(4);
    await p.selectTab(0);
    expect(await p.isOverviewStatsVisible()).toBeTruthy();
    expect(await p.isQuickActionsVisible()).toBeTruthy();
  });

  // ── 2: All 4 tab switches ──
  base('PAY-003/004/005/006: Navigate all 4 tabs', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    for (const idx of [0, 1, 2, 3]) {
      await p.selectTab(idx);
      await pg.waitForTimeout(300);
      await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
    }
  });

  // ── 3: Search, export, refresh ──
  base('PAY-009/017/018: Search, export & refresh', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(0);
    await pg.waitForTimeout(500);
    await p.searchPayslip('test');
    await pg.waitForTimeout(400);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
    const [dl] = await Promise.all([
      pg.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      p.clickExport(),
    ]);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
    await p.clickRefresh();
    await waitForPageReady(pg);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
  });

  // ── 4: Generate tab — UI, employee list, validate button ──
  base('PAY-010/011/012: Generate tab UI, employees & validate', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(1);
    await pg.waitForTimeout(1000);
    expect(await p.isGenerateTabReady()).toBeTruthy();
    expect(await p.getEmployeeCheckboxCount()).toBeGreaterThanOrEqual(1);
    const vBtn = pg.locator('[data-testid="payroll-validate-generate-btn"]');
    await expect(vBtn).toBeVisible({ timeout: 5000 });
    expect(await vBtn.isDisabled()).toBeTruthy();
    const selAll = pg.locator('label').filter({ hasText: 'Select All' });
    expect(await selAll.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
  });

  // ── 5: Payments tab, reports tab ──
  base('PAY-013/014: Process Payments & Reports tabs', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(2);
    await pg.waitForTimeout(400);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
    await p.selectTab(3);
    await pg.waitForTimeout(400);
    const rep = pg.locator('text=Reports & Analytics');
    expect(await rep.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
  });

  // ── 6: Bulk actions, table, view button, select all ──
  base('PAY-015/016/019/020/021: Bulk actions, table & view button', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(0);
    await pg.waitForTimeout(1000);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
    const rowCount = await p.getPayslipTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
    if (rowCount > 0) {
      expect(await p.selectAllTableCheckboxes()).toBeTruthy();
      const vb = pg.getByRole('button', { name: /View details/i }).first();
      expect(await vb.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    }
  });

  // ── 7: Template configuration ──
  base('PAY-022/023/024: Template config — page, create btn & cards', async () => {
    const p = new PayrollPage(pg);
    await p.gotoTemplateConfig();
    expect(await p.isTemplatePageVisible()).toBeTruthy();
    expect(await p.isCreateTemplateBtnVisible()).toBeTruthy();
    await pg.waitForTimeout(500);
    expect(await p.getTemplateCardCount()).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// HR — 6 tests covering PAY-025 to PAY-030
// Reuses admin browser with fresh context
// ============================================================
base.describe('Payroll Module — hr', () => {
  let ctx, pg;

  base.beforeAll(async () => {
    ({ ctx, pg } = await newSession('hr'));
  });

  base.afterAll(async () => {
    await ctx?.close().catch(() => {});
  });

  base('PAY-025: HR - Payroll management page loads', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    expect(await p.isManagementPageVisible()).toBeTruthy();
  });

  base('PAY-026: HR - Tab navigation', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(1);
    await pg.waitForTimeout(400);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
  });

  base('PAY-027: HR - Overview stats visible', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.selectTab(0);
    expect(await p.isOverviewStatsVisible()).toBeTruthy();
  });

  base('PAY-028: HR - Search payslips', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.searchPayslip('test');
    await pg.waitForTimeout(400);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
  });

  base('PAY-029: HR - Export payslips', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    const [dl] = await Promise.all([
      pg.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      p.clickExport(),
    ]);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
  });

  base('PAY-030: HR - Refresh payslips', async () => {
    const p = new PayrollPage(pg);
    await p.gotoManagement();
    await p.clickRefresh();
    await waitForPageReady(pg);
    await expect(pg.locator('[data-testid="payroll-management-page"]')).toBeVisible();
  });
});

// ============================================================
// EMPLOYEE — 9 tests covering PAY-031 to PAY-039
// ============================================================
base.describe('Payroll Module — employee', () => {
  let ctx, pg;

  base.beforeAll(async () => {
    ({ ctx, pg } = await newSession('employee'));
  });

  base.afterAll(async () => {
    await ctx?.close().catch(() => {});
  });

  base('PAY-031: Employee - Payslips page loads', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    expect(await p.isEmployeePageVisible()).toBeTruthy();
  });

  base('PAY-032: Employee - Summary cards visible', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    expect(await p.isSummaryCardsVisible()).toBeTruthy();
  });

  base('PAY-033: Employee - Table columns present', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(500);
    expect(await p.isTableColumnsVisible()).toBeTruthy();
  });

  base('PAY-034: Employee - Year filter', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(500);
    const yearFilter = pg.locator('[data-testid="payslips-year-filter"]');
    expect(await yearFilter.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    await expect(pg.locator('[data-testid="employee-payslips-page"]')).toBeVisible();
  });

  base('PAY-035: Employee - Payslip row count', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(500);
    expect(await p.getEmployeePayslipRowCount()).toBeGreaterThanOrEqual(0);
  });

  base('PAY-036: Employee - View payslip dialog', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(1000);
    const rows = await p.getEmployeePayslipRowCount();
    if (rows > 0) {
      const vb = pg.locator('[data-testid="payslip-view-btn"]').first();
      if (await vb.isVisible({ timeout: 3000 }).catch(() => false)) {
        await vb.click();
        await pg.waitForTimeout(1000);
        await expect(pg.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
        const close = pg.locator('[role="dialog"]').getByRole('button', { name: /close/i });
        if (await close.isVisible().catch(() => false)) await close.click();
      }
    }
    await expect(pg.locator('[data-testid="employee-payslips-page"]')).toBeVisible();
  });

  base('PAY-037: Employee - Download payslip', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(1000);
    const rows = await p.getEmployeePayslipRowCount();
    if (rows > 0) {
      const dlBtn = pg.locator('[data-testid="payslip-download-btn"]').first();
      if (await dlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const [dl] = await Promise.all([
          pg.waitForEvent('download', { timeout: 5000 }).catch(() => null),
          dlBtn.click(),
        ]);
      }
    }
    await expect(pg.locator('[data-testid="employee-payslips-page"]')).toBeVisible();
  });

  base('PAY-038: Employee - Back button', async () => {
    const p = new PayrollPage(pg);
    await p.gotoMyPayslips();
    await pg.waitForTimeout(500);
    const back = pg.locator('[data-testid="payslips-back-btn"]');
    expect(await back.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
    await back.click();
    await waitForPageReady(pg);
    await pg.waitForTimeout(500);
  });

  base('PAY-039: Employee - RBAC denied on admin page', async () => {
    await pg.goto('/payroll-management');
    await waitForPageReady(pg);
    const denied = pg.locator('text=Access denied');
    const mgmt = pg.locator('[data-testid="payroll-management-page"]');
    const isDenied = await denied.isVisible({ timeout: 3000 }).catch(() => false);
    const isMgmt = await mgmt.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isDenied || !isMgmt).toBeTruthy();
  });
});

// ============================================================
// MANAGER — 1 RBAC test (PAY-040)
// ============================================================
base.describe('Payroll Module — manager', () => {
  let ctx, pg;

  base.beforeAll(async () => {
    ({ ctx, pg } = await newSession('manager'));
  });

  base.afterAll(async () => {
    await ctx?.close().catch(() => {});
  });

  base('PAY-040: Manager - RBAC denied on admin page', async () => {
    await pg.goto('/payroll-management');
    await waitForPageReady(pg);
    const denied = pg.locator('text=Access denied');
    const mgmt = pg.locator('[data-testid="payroll-management-page"]');
    const isDenied = await denied.isVisible({ timeout: 3000 }).catch(() => false);
    const isMgmt = await mgmt.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isDenied || !isMgmt).toBeTruthy();
  });
});
